// pH correction & chemical stabilisation: carbonate equilibrium through the train, Langelier/Ryznar indices,
// post-lime dose to reach a target LSI or pH (lecture: "chemical stabilisation – final step"); NWSDB D3 Ch 8 targets
// (pH 6.5–8.5, LSI > −1.5, RSI < 10, CCPP ≈ +4 (> −5), Alk & Ca ≥ 50 mg/L as CaCO₃).
import { CHEM as RBCHEM } from '../core/ratebook.js';
import { Calc, n } from '../core/calc.js';
import { CTfrom, lsiText, pHfrom, stability } from '../core/water.js';
import { bisect } from '../core/util.js';
import { CHEM, STABILITY, ccppText, pHsEq83 } from '../core/d3.js';
import { chlorineDose } from './disinfection.js';
import { qGet, qWorst } from './quality.js';

export const DEFAULTS = {
  target: 'LSI',      // LSI | pH
  targetLSI: -0.3,
  targetPH: 7.5,
  limePurity: 85,
  maxLime: 60,
  price: 0,             // LKR/kg – 0 = NWSDB Rates 2026 A-CH/01 hydrated lime
  storageDays: 30,
  bagKg: 25,
};

const kgDlime = (L, Q) => (L * Q) / 1000;

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const q = ctx.res.quality;
  const co = ctx.res.coag;
  const dem = ctx.res.demand;
  const T = q.T;
  const TDS0 = qGet(q, 'tds', 1);
  const ca0 = qGet(q, 'ca', 1) * 2.497; // mg/L as CaCO3
  // state after coagulation (or raw if no coagulation)
  let alk = co ? co.alk1 : qGet(q, 'alk', 1);
  const CT = co ? co.CT0 + (co.sodaDose ? (co.sodaDose * co.inputs.sodaPurity / 100) / 105990 : 0) : null;
  const CTuse = CT ?? CTfrom(qGet(q, 'pH', 1), alk, T);
  let caH = ca0 + (co ? co.need * (co.inputs.phAdjust === 'lime' ? 1 : 0) : 0);
  let pH = co ? co.pH1 : qGet(q, 'pH', 1);
  const alumTDS = co ? 0.485 * co.Ddes : 0;
  calc.section('Water after coagulation & filtration');
  calc.step('pH', 'pH_1', '', pH, '');
  calc.step('Alkalinity', 'Alk_1', '', alk, 'mg/L as CaCO₃');
  calc.step('Calcium hardness', 'CaH_1', '', caH, 'mg/L as CaCO₃');
  const s1 = stability({ pH, TDS: TDS0 + alumTDS, T, caH, alk });
  calc.step('Langelier index after filtration', 'LSI = pH - pH_s,\\ pH_s=(9.3+A+B)-(C+D)', `${n(pH, 2)} - ${n(s1.pHs, 2)}`, s1.LSI, '', 'Standard Methods 2330; NWSDB D3 Table 8-4 factors');
  // chlorination effect
  const cd = chlorineDose(ctx);
  const key = (ctx.inp.dis?.agent && ctx.inp.dis.agent !== 'auto') ? ctx.inp.dis.agent : proc.disinfectant;
  const dAlkCl = key === 'gas' ? -0.705 * 1.5 * cd.post : key === 'naocl' ? 0.2 * cd.post : key === 'hth' || key === 'bleach' ? 0.35 * cd.post : 0;
  calc.section('Effect of chlorination');
  calc.step('Alkalinity change by chlorine', '\\Delta Alk_{Cl}', key === 'gas' ? `-0.705\\times1.5\\times${n(cd.post)}` : `${n(dAlkCl / cd.post, 2)}\\times${n(cd.post)}`, dAlkCl, 'mg/L as CaCO₃', 'Cl₂ + H₂O → HOCl + H⁺ + Cl⁻');
  alk = alk + dAlkCl;
  const pHafterCl = pHfrom(alk, CTuse, T);
  calc.step('pH after chlorination', 'pH_2', '', pHafterCl, '');
  const TDSf = TDS0 + alumTDS + 0.5 * cd.post;
  const s2 = stability({ pH: pHafterCl, TDS: TDSf, T, caH, alk });
  // lime requirement
  const apply = proc.postLime === 'yes' || (proc.postLime === 'auto' && (s2.LSI < -0.5 || pHafterCl < 7.0));
  const evalLime = (L) => {
    const a = (L * (d.limePurity / 100) * 100) / 74.09;
    const alkF = alk + a;
    const caF = caH + a;
    const pHF = pHfrom(alkF, CTuse, T);
    const st = stability({ pH: pHF, TDS: TDSf + 0.54 * L, T, caH: caF, alk: alkF });
    return { L, alkF, caF, pHF, ...st };
  };
  let lime = 0;
  if (apply) {
    const f = d.target === 'pH' ? (L) => evalLime(L).pHF - d.targetPH : (L) => evalLime(L).LSI - d.targetLSI;
    if (f(0) >= 0) lime = 0;
    else if (f(d.maxLime) < 0) { lime = d.maxLime; calc.note('warn', `Target ${d.target} not reached with ${d.maxLime} mg/L lime – low alkalinity water; consider CO₂ + lime (re-mineralisation) or soda ash.`); }
    else lime = bisect(f, 0, d.maxLime, 1e-6);
  }
  const fin = evalLime(lime);
  calc.section('Post-lime stabilisation');
  calc.step(apply ? `Post-lime dose to reach ${d.target === 'pH' ? 'pH ' + d.targetPH : 'LSI ' + d.targetLSI}` : 'Post-lime not required', 'D_{lime}', '\\text{solved iteratively (carbonate equilibrium)}', lime, 'mg/L');
  calc.step('Final pH', 'pH_f', '', fin.pHF, '');
  calc.step('Final alkalinity', 'Alk_f = Alk_2 + \\frac{100}{74}\\,p\\,D_{lime}', `${n(alk)} + 1.35\\times${n(d.limePurity / 100, 2)}\\times${n(lime)}`, fin.alkF, 'mg/L as CaCO₃');
  calc.step('Final Langelier index', 'LSI_f', `${n(fin.pHF, 2)} - ${n(fin.pHs, 2)}`, fin.LSI, '');
  calc.step('Ryznar index', 'RSI = 2pH_s - pH', `2\\times${n(fin.pHs, 2)} - ${n(fin.pHF, 2)}`, fin.RSI, '');
  calc.check('stab.pH', fin.pHF);
  calc.check('stab.LSI', fin.LSI);
  calc.check('stab.RSI', fin.RSI);
  // D3 Eq 8.3 cross-check (25 °C, TDS < 500)
  const pHs83 = pHsEq83(fin.caF / 2.497, fin.alkF);
  calc.step('pHs by NWSDB D3 Eq 8.3 (25 °C, TDS < 500 mg/L) – cross-check', 'pH_s = 11.5 - \\log[Ca] - \\log[Alk]', `11.5 - \\log${n(fin.caF / 2.497)} - \\log${n(fin.alkF)}`, pHs83, '', 'NWSDB D3 Eq 8.3');
  // calcium carbonate precipitation potential (closed system): CaCO3 that would precipitate (+) or dissolve (−) to reach saturation
  const ccppAt = (x) => {
    const a = fin.alkF - x, c = fin.caF - x;
    if (a <= 0.5 || c <= 0.5) return -99;
    const ct = CTuse + (lime * (d.limePurity / 100)) * 0 - x / 100090;
    const p = pHfrom(a, ct, T);
    return stability({ pH: p, TDS: TDSf, T, caH: c, alk: a }).LSI;
  };
  let ccpp = 0;
  try {
    const lo = -150, hi = Math.min(fin.alkF, fin.caF) - 1;
    if (ccppAt(lo) < 0) ccpp = lo; else if (ccppAt(hi) > 0) ccpp = hi; else ccpp = bisect(ccppAt, lo, hi, 1e-4);
  } catch { ccpp = NaN; }
  calc.step('Calcium carbonate precipitation potential', 'CCPP = Ca - Ca_{sat}', '\\text{CaCO}_3\\text{ precipitated to reach LSI = 0 (iterative)}', ccpp, 'mg/L CaCO₃', `NWSDB D3 Eq 8.5–8.6, Table 8-2 – ${Number.isFinite(ccpp) ? ccppText(ccpp) : '–'}`);
  calc.check('stab.CCPP', ccpp);
  calc.check('stab.alk', fin.alkF);
  calc.check('stab.ca', fin.caF);
  const clF = qWorst(q, 'cl') + 0.5 * cd.post, so4F = qWorst(q, 'so4') + (co && co.inputs.coagulant === 'alum' ? 0.485 * co.Ddes : 0);
  const larson = (clF / 35.45 + so4F / 48.03) / Math.max(fin.alkF / 50, 1e-6);
  calc.step('Larson ratio (Cl⁻ + SO₄²⁻)/Alk (equivalents)', 'LR = \\frac{Cl/35.45 + SO_4/48.03}{Alk/50}', `\\frac{${n(clF)}/35.45 + ${n(so4F)}/48.03}{${n(fin.alkF)}/50}`, larson, '', 'NWSDB D3 §8.1 – ≤ 0.2 (or Cl⁻, SO₄²⁻ each ≤ 50 mg/L)');
  calc.flag('Corrosion protection – Larson ratio / chloride & sulphate', larson <= STABILITY.clso4Ratio + 1e-9 || (clF <= STABILITY.clso4Each && so4F <= STABILITY.clso4Each), `LR ${larson.toFixed(2)} · Cl ${clF.toFixed(0)} · SO₄ ${so4F.toFixed(0)} mg/L`, 'LR ≤ 0.2 or each ≤ 50 mg/L', 'If not met, use lined metal or plastic pipes', 'info', 'NWSDB D3 §8.1');
  if (apply && lime > 0) {
    const slurry = (kgDlime(lime, dem.Qd)) / 75; // m³/d at 75 g/L
    calc.step('Lime slurry volume (75 g/L)', 'V = \\frac{M}{75\\,kg/m^3}', `\\frac{${n(kgDlime(lime, dem.Qd))}}{75}`, slurry, 'm³/d', 'NWSDB D3 §6.1.6 – slurry 50–100 g/L (< 50 carbonates, > 100 blocks lines)');
  }
  if (fin.LSI < STABILITY.lsiMin) calc.note('warn', 'Final water is potentially aggressive (LSI < −1.5, NWSDB D3 §8.4) – increase the post-lime dose or add CO₂ + lime re-mineralisation.');
  void CHEM;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100);
  const kgD = (lime * dem.Qd) / 1000;
  const annualKg = (lime * Qop * 365) / 1000;
  const store = (kgD * d.storageDays) / 1000; // tonnes
  const curve = [];
  for (let L = 0; L <= Math.max(d.maxLime, lime * 1.5); L += Math.max(0.5, d.maxLime / 60)) {
    const e = evalLime(L);
    curve.push({ L, LSI: e.LSI, pH: e.pHF });
  }
  return {
    inputs: d, apply, lime, kgD, annualKg, store, cost: annualKg * (d.price > 0 ? d.price : RBCHEM.lime.v), pH1: pH, s1, s2, pHafterCl, alkAfterCl: alk, final: fin, pHfinal: fin.pHF,
    lsiText: lsiText(fin.LSI), curve, TDSf: TDSf + 0.54 * lime, ccpp, larson, pHs83,
    ...calc.result(),
  };
}
