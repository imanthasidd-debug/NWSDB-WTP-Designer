// pH correction & chemical stabilisation: carbonate equilibrium through the train, Langelier/Ryznar indices,
// post-lime dose to reach a target LSI or pH (lecture: "chemical stabilisation – final step").
import { Calc, n } from '../core/calc.js';
import { CTfrom, lsiText, pHfrom, stability } from '../core/water.js';
import { bisect } from '../core/util.js';
import { chlorineDose } from './disinfection.js';

export const DEFAULTS = {
  target: 'LSI',      // LSI | pH
  targetLSI: -0.3,
  targetPH: 7.5,
  limePurity: 85,
  maxLime: 60,
  price: 70,
  storageDays: 30,
  bagKg: 25,
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const q = ctx.res.quality;
  const co = ctx.res.coag;
  const dem = ctx.res.demand;
  const T = q.T;
  const TDS0 = q.get('tds', 1);
  const ca0 = q.get('ca', 1) * 2.497; // mg/L as CaCO3
  // state after coagulation (or raw if no coagulation)
  let alk = co ? co.alk1 : q.get('alk', 1);
  const CT = co ? co.CT0 + (co.sodaDose ? (co.sodaDose * co.inputs.sodaPurity / 100) / 105990 : 0) : null;
  const CTuse = CT ?? CTfrom(q.get('pH', 1), alk, T);
  let caH = ca0 + (co ? co.need * (co.inputs.phAdjust === 'lime' ? 1 : 0) : 0);
  let pH = co ? co.pH1 : q.get('pH', 1);
  const alumTDS = co ? 0.485 * co.Ddes : 0;
  calc.section('Water after coagulation & filtration');
  calc.step('pH', 'pH_1', '', pH, '');
  calc.step('Alkalinity', 'Alk_1', '', alk, 'mg/L as CaCO₃');
  calc.step('Calcium hardness', 'CaH_1', '', caH, 'mg/L as CaCO₃');
  const s1 = stability({ pH, TDS: TDS0 + alumTDS, T, caH, alk });
  calc.step('Langelier index after filtration', 'LSI = pH - pH_s,\\ pH_s=(9.3+A+B)-(C+D)', `${n(pH, 2)} - ${n(s1.pHs, 2)}`, s1.LSI, '', 'Standard Methods 2330');
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
    inputs: d, apply, lime, kgD, annualKg, store, cost: annualKg * d.price, pH1: pH, s1, s2, pHafterCl, alkAfterCl: alk, final: fin, pHfinal: fin.pHF,
    lsiText: lsiText(fin.LSI), curve, TDSf: TDSf + 0.54 * lime,
    ...calc.result(),
  };
}
