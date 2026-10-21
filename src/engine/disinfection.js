// Disinfection: chlorine dose (demand + residual, breakpoint), CT compliance (NWSDB D3 §6.2, Tables 6-2/6-4/6-5/6-7 –
// USEPA SWTR method), contact-tank sizing & baffling, chlorinators, cylinder logistics, hypochlorite alternatives (D3 §6.3–6.5).
import { Calc, n } from '../core/calc.js';
import { fracHOCl, pKaHOCl } from '../core/water.js';
import { BLEACH, CREDITS, GAS, RESIDUAL, baffleFactorFor, ctGiardiaD3, ctVirusD3 } from '../core/d3.js';
import { ceilTo, nextStd } from '../core/util.js';

export const AGENTS = {
  gas: { label: 'Chlorine gas', strength: 1.0, price: 450, unit: 'kg Cl₂' },
  naocl: { label: 'Sodium hypochlorite (10 % av. Cl)', strength: 0.10, price: 130, unit: 'kg solution', density: 1170 },
  hth: { label: 'Calcium hypochlorite – HTH (65 %)', strength: 0.65, price: 950, unit: 'kg granules' },
  bleach: { label: 'Bleaching powder (35 % av. Cl – D3 design value)', strength: 0.35, price: 330, unit: 'kg powder' },
};
export const CHLORINATORS = [0.5, 1, 2, 4, 5, 10, 20, 25, 50, 100, 200];

export const DEFAULTS = {
  agent: 'auto',
  demand: 1.2,          // mg/L post-filtration chlorine demand (from chlorine-demand test)
  residual: 0.8,        // mg/L free residual leaving the plant – D3 §6.3.5: 0.5–0.8 in the contact basin
  prechlorDose: 1.5,    // mg/L when pre-chlorination is used
  bpRatio: 8,           // Cl2 : NH3-N practical breakpoint ratio
  contactMode: 'tank',  // tank | cwr
  hrt: 30,              // min (dedicated contact tank)
  depth: 0,             // m, 0 = auto (2 m small tanks, 3 m large)
  chanWidth: 0,         // m, 0 = auto for flow-path L/W ≥ 40
  baffleFactor: 0,      // 0 = auto from L/W
  cwrMinFrac: 0.5,      // fraction of CWR volume available at low level
  giardiaReq: 3, virusReq: 4,
  cylinder: 900,        // kg
  storageDays: 30,
  price: 0,             // LKR/kg product (0 = default for agent)
  limeBeforeContact: false,
};

export function chlorineDose(ctx) {
  const d = { ...DEFAULTS, ...(ctx.inp.dis || {}) };
  const q = ctx.res.quality;
  const nh3 = q.worst('nh3');
  const nh3n = nh3 * 14 / 17;
  const bp = nh3n > 0.05 ? d.bpRatio * nh3n : 0;
  return { post: d.demand + d.residual + bp, pre: ctx.res.process.prechlor === 'yes' ? d.prechlorDose : 0, bp, nh3n, d };
}

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const dem = ctx.res.demand;
  const q = ctx.res.quality;
  const stab = ctx.res.stab;
  const T = q.T;
  const key = d.agent === 'auto' ? proc.disinfectant : d.agent;
  const A = AGENTS[key] || AGENTS.gas;
  const price = d.price > 0 ? d.price : A.price;
  const cd = chlorineDose(ctx);
  const Qd = dem.Qd, Qh = dem.Qh;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100);

  calc.section('Chlorine dose');
  if (cd.bp > 0) calc.step('Breakpoint requirement for ammonia', 'D_{bp} = r\\,NH_3\\text{-}N', `${n(d.bpRatio)}\\times${n(cd.nh3n, 3)}`, cd.bp, 'mg/L', 'LN: breakpoint curve – chloramines oxidised to N₂');
  calc.step('Post-chlorination dose', 'D = demand + residual (+ D_{bp})', `${n(d.demand)} + ${n(d.residual)}${cd.bp ? ' + ' + n(cd.bp) : ''}`, cd.post, 'mg/L', 'NWSDB D3 §6.3.6 – design dose 2 mg/L for clear water; confirm by chlorine-demand test');
  if (cd.pre) calc.step('Pre-chlorination dose', 'D_{pre}', '', cd.pre, 'mg/L', 'NWSDB D3 §6.4.5 – total 2–5 mg/L to leave 0.2–0.5 mg/L free');
  calc.flag('Post-chlorination dose vs D3 design dose', Math.abs(cd.post - RESIDUAL.designDose) <= 1.0 + 1e-9 || cd.bp > 0, `${cd.post.toFixed(2)} mg/L`, '≈ 2 mg/L (clear water)', 'Turbidity < 2 NTU, little organics, Fe & Mn < 0.3 mg/L', 'info', 'NWSDB D3 §6.3.6');
  const totDose = cd.post + cd.pre;
  const kgD = (totDose * Qd) / 1000;
  const kgH = kgD / 24 * 1.25; // 25 % margin for peak dosing
  calc.step('Maximum chlorine feed', 'W = \\frac{D\\,Q}{1000}', `${n(totDose)}\\times${n(Qd, 0)}/1000`, kgD, 'kg/d');
  const chlorinator = nextStd(kgH / Math.max(1, dem.nTrains > 1 ? 1 : 1), CHLORINATORS);
  calc.step('Chlorinator capacity (duty, +25 %)', 'w = 1.25\\,W/24', `1.25\\times${n(kgD)}/24`, kgH, 'kg/h');
  const kgAvg = (totDose * Qop) / 1000;
  const productKgD = kgAvg / A.strength;
  calc.step(`Average ${A.label} use (operating flow)`, 'W_p = \\frac{\\bar D\\,\\bar Q}{1000\\,s}', `\\frac{${n(totDose)}\\times${n(Qop, 0)}}{1000\\times${n(A.strength, 2)}}`, productKgD, `${A.unit}/d`);
  let cylPerMonth = 0, storeUnits = 0, naoclTank = 0;
  if (key === 'gas') {
    cylPerMonth = (kgAvg * 30.4) / d.cylinder;
    storeUnits = Math.ceil((kgD * d.storageDays) / d.cylinder) + 2;
    calc.step(`${d.cylinder} kg cylinders used per month`, 'n = \\frac{30.4\\,\\bar W}{m_c}', `\\frac{30.4\\times${n(kgAvg)}}{${n(d.cylinder)}}`, cylPerMonth, '');
    calc.step('Cylinders in store (storage period + 2 on line)', 'n_s', `${n(d.storageDays)}\\,d`, storeUnits, '', 'NWSDB D3 Table 6-12 – ≥ 30 days supply at 2 mg/L');
    const withdrawal = d.cylinder >= 900 ? GAS.drumGasMax / 24 : 0.75; // kg/h continuous gas withdrawal per container (D3 §6.5.5.1: 180 kg/d per ton container)
    const onLine = Math.ceil(kgH / withdrawal);
    calc.step('Containers on line (gas withdrawal limit)', 'n = w / w_{max}', `${n(kgH)}/${n(withdrawal)}`, onLine, '', 'NWSDB D3 §6.5.5.1 – ≤ 180 kg/d per ton container (gas)');
    if (d.cylinder < 900 && kgD > 70) calc.note('info', 'Daily use exceeds one 68 kg cylinder per day – 900 kg drums ("tonners") with a manifold are recommended (NWSDB D3 §6.5.1).');
    if (kgD > GAS.evaporator) calc.note('warn', `Chlorine feed ${kgD.toFixed(0)} kg/d > 680 kg/d – liquid withdrawal with evaporators is required (NWSDB D3 §6.5.5.1).`);
    else if (kgD > GAS.drumGasMax) calc.note('info', `Chlorine feed ${kgD.toFixed(0)} kg/d (180–680 kg/d) – manifold several containers and keep the room above 18 °C (NWSDB D3 §6.5.5.1).`);
    calc.check('coag.storage', d.storageDays, 'Chlorine storage period', { crit: { min: GAS.storageDays, max: 90, hardMin: 15 }, src: 'NWSDB D3 Table 6-12 – minimum 30 days at 2 mg/L' });
    const months = storeUnits / Math.max(cylPerMonth, 1e-6);
    calc.flag('Container turnover', months <= GAS.turnoverMonths + 1e-9, `${months.toFixed(1)} months of stock`, '≤ 3 months', '', 'info', 'NWSDB D3 §6.5.1');
    calc.flag('Chlorinators – duty + standby', true, `${chlorinator} kg/h × (1 duty + 1 standby)`, '2 units', 'Wall-mounted vacuum chlorinators with automatic switch-over', 'warn', 'NWSDB D3 §6.5.8');
    const naoh = GAS.naohPerCl2 * d.cylinder;
    calc.step('Scrubber caustic for one full container (20 % NaOH)', 'M = 1.13\\,m_c', `1.13\\times${n(d.cylinder)}`, naoh, 'kg NaOH', 'NWSDB D3 §6.5.4 – 1 kg Cl₂ + 1.13 kg NaOH → 1.05 kg NaOCl');
    calc.step('Scrubber solution volume (20 %, ρ ≈ 1.22)', 'V = \\frac{M}{0.20\\times1220}', `\\frac{${n(naoh, 0)}}{244}`, naoh / 244, 'm³');
  } else if (key === 'naocl') {
    naoclTank = (productKgD * d.storageDays) / (A.density || 1170);
    calc.step('Hypochlorite bulk tank volume', 'V = \\frac{W_p\\,t_s}{\\rho}', `\\frac{${n(productKgD)}\\times${n(d.storageDays)}}{1170}`, naoclTank, 'm³');
    calc.note('info', 'Sodium hypochlorite degrades with heat and light (≈ 1–2 % strength per week at 30 °C) – limit storage to ≤ 30 days in shaded tanks.');
  } else {
    storeUnits = Math.ceil((productKgD * d.storageDays) / 45);
    calc.step('Drums (45 kg) in store', 'n = W_p t_s / 45', '', storeUnits, '');
    if (key === 'bleach' || key === 'hth') {
      if (key === 'hth') calc.note('warn', 'HTH (high-test hypochlorite) is not available in Sri Lanka (NWSDB D3 §6.4) – bleaching powder or gas is normally used.');
      const solLh = (kgH * 1000) / (BLEACH.solution * 10); // L/h of 1 % available-chlorine solution
      const tank = (kgD * 1000) / (BLEACH.solution * 10) / 1000; // m³ per 24 h
      calc.step('Hypochlorite solution feed at 1 % available chlorine', 'q = \\frac{w}{10\\,g/L}', `\\frac{${n(kgH * 1000, 0)}\\,g/h}{10}`, solLh, 'L/h', 'NWSDB D3 §6.4.1 – up to 5 %, 1 % recommended');
      calc.step('Solution tank volume (24 h, two tanks)', 'V = \\frac{W}{10\\,kg/m^3}', `\\frac{${n(kgD)}}{10}`, tank, 'm³ each', 'NWSDB D3 §6.4.1 – basins sized for 24 h; use the supernatant');
      calc.flag('Within the practical limit of hypochlorination', solLh <= BLEACH.hypoLimitLh + 1e-9, `${solLh.toFixed(0)} L/h`, '≤ 42 L/h of 1 % solution', 'Above this use gas chlorination', 'warn', 'NWSDB D3 §6.4.3');
      if (key === 'bleach') calc.flag('Bleaching-powder storage period', d.storageDays <= BLEACH.storeMonths * 30 + 1e-9, `${d.storageDays} d`, '≤ 3 months (hygroscopic)', 'Verify available chlorine of each batch (35–60 %; design on 35 %)', 'warn', 'NWSDB D3 §6.4');
    }
  }

  // ---- CT
  calc.section('Contact time & CT (NWSDB D3 §6.2.5 – USEPA SWTR method)');
  const cr = proc.conv ? CREDITS.conventional : proc.direct ? CREDITS.direct : CREDITS.ssf;
  const credit = { g: cr[0], v: cr[1] };
  const needG = Math.max(0.5, d.giardiaReq - credit.g);
  const needV = Math.max(0, d.virusReq - credit.v);
  calc.step('Giardia inactivation required by disinfection', 'L_G = L_{tot} - credit', `${n(d.giardiaReq)} - ${n(credit.g)}`, needG, 'log', 'NWSDB D3 Table 6-7 – removal credits');
  calc.step('Virus inactivation required by disinfection', 'L_V = L_{tot} - credit', `${n(d.virusReq)} - ${n(credit.v)}`, needV, 'log');
  const pHc = d.limeBeforeContact && stab ? stab.pHfinal : stab ? stab.pHafterCl : 7.2;
  let V, T10, BF, chanLen = 0, nPasses = 0, LW = 0, L = 0, W = 0;
  if (d.contactMode === 'tank') {
    V = (Qh / 60) * d.hrt;
    if (!(d.depth > 0)) d.depth = V < 300 ? 2.0 : 3.0;
    if (!(d.chanWidth > 0)) d.chanWidth = Math.min(3, Math.max(0.6, Math.round(Math.sqrt(V / (d.depth * 45)) * 10) / 10));
    chanLen = V / (d.depth * d.chanWidth);
    LW = chanLen / d.chanWidth;
    BF = d.baffleFactor > 0 ? d.baffleFactor : baffleFactorFor(LW);
    const side = Math.sqrt(V / d.depth);
    nPasses = Math.max(2, Math.round(side / d.chanWidth));
    L = chanLen / nPasses;
    W = nPasses * d.chanWidth + (nPasses - 1) * 0.2;
    calc.step('Contact tank volume', 'V = Q\\,\\theta', `${n(Qh / 60, 2)}\\times${n(d.hrt)}`, V, 'm³');
    calc.step('Serpentine channel length', 'L_p = \\frac{V}{h\\,w}', `\\frac{${n(V)}}{${n(d.depth)}\\times${n(d.chanWidth)}}`, chanLen, 'm');
    calc.step('Flow-path length : width', 'L_p/w', `${n(chanLen)}/${n(d.chanWidth)}`, LW, '');
    calc.step('Baffle factor (T₁₀/T)', 'BF', d.baffleFactor > 0 ? '\\text{user}' : '\\text{from }L/W', BF, '', 'NWSDB D3 Table 6-2 – superior 0.7 (serpentine), average 0.5, poor 0.3');
    calc.check('dis.LW', LW);
  } else {
    const cwrH = num(ctx.inp.storage?.cwrHours, 4);
    V = cwrH * Qh * d.cwrMinFrac;
    BF = d.baffleFactor > 0 ? d.baffleFactor : 0.5;
    calc.step('Effective CWR contact volume at low level', 'V = f\\,t_s Q', `${n(d.cwrMinFrac)}\\times${n(cwrH)}\\times${n(Qh, 0)}`, V, 'm³');
    calc.step('Baffle factor (baffled reservoir)', 'BF', '', BF, '', 'NWSDB D3 Table 6-2 – average baffling 0.5');
  }
  T10 = (V / (Qh / 60)) * BF;
  calc.step('Effective contact time', 'T_{10} = BF\\,\\frac{V}{Q}', `${n(BF)}\\times\\frac{${n(V)}}{${n(Qh / 60, 2)}}`, T10, 'min');
  const C = d.residual;
  const CTp = C * T10;
  const CTg = ctGiardiaD3(needG, T, pHc, C);
  const CTv = ctVirusD3(needV, T);
  calc.step('CT provided', 'CT = C\\,T_{10}', `${n(C)}\\times${n(T10)}`, CTp, 'mg·min/L', 'NWSDB D3 §6.2.5 – T₁₀ at peak hourly flow');
  calc.step(`CT required, ${n(needG)}-log Giardia (T = ${T} °C → table ≤ 25 °C, pH ${pHc.toFixed(2)}, C ≥ 1 mg/L)`, 'CT = I \\times CT_{1\\text{-}log}(T, pH, C)', `I=${n(needG)},\\ T=${n(Math.min(25, T))},\\ C=${n(Math.max(1, C))},\\ pH=${n(pHc, 2)}`, CTg, 'mg·min/L', 'NWSDB D3 Table 6-4 (interpolated; conservative above 25 °C)');
  calc.step(`CT required, ${needV}-log virus`, 'CT_V', 'D3\\ Table\\ 6\\text{-}5', CTv, 'mg·min/L', 'NWSDB D3 Table 6-5 (pH 6–9)');
  const ratio = CTp / Math.max(CTg, CTv, 1e-6);
  const logG = (CTp / ctGiardiaD3(1, T, pHc, C));
  const logV = CTp / Math.max(ctVirusD3(2, T) / 2, 1e-6);
  calc.step('CT ratio (governing)', 'CT_{prov}/CT_{req}', `${n(CTp)}/${n(Math.max(CTg, CTv))}`, ratio, '');
  calc.check('dis.ctRatio', ratio);
  const hrtNom = V / (Qh / 60);
  calc.check('dis.contact', hrtNom, 'Nominal contact time V/Q');
  calc.check('dis.residual', C);
  calc.check('dis.pH', pHc);
  const turbF = ctx.res.filt?.filteredPeak ?? 1;
  const who = C >= RESIDUAL.whoC - 1e-9 && hrtNom >= RESIDUAL.whoT - 1e-9 && pHc < RESIDUAL.whoPH && turbF < RESIDUAL.whoTurb;
  calc.flag('WHO generic criterion (free Cl₂ ≥ 0.5 mg/L after 30 min, pH < 8, turbidity < 1 NTU)', who, `${C} mg/L · ${hrtNom.toFixed(0)} min · pH ${pHc.toFixed(1)} · ${turbF.toFixed(2)} NTU`, 'CT ≈ 15 mg·min/L', '', 'warn', 'NWSDB D3 §6.2.6');
  calc.text('Residuals: 0.5–0.8 mg/L in the contact basin; ≥ 0.2 mg/L at consumer taps / stand posts; ≥ 0.1 mg/L at dead ends (boost in the network rather than over-dose > 1.0 mg/L at the plant). Monitor primary disinfection with continuous analysers + alarms (±0.05 mg/L). Dose through a diffuser at the basin inlet; mixing G ≈ 400 s⁻¹, not upstream of a weir (NWSDB D3 §6.2.7–6.3.5, §6.5.6).');
  const hocl = fracHOCl(pHc, T);
  calc.step('Fraction of free chlorine as HOCl', '\\frac{1}{1+10^{pH-pK_a}}', `pK_a=${n(pKaHOCl(T), 2)}`, hocl * 100, '%', 'LN: HOCl is the stronger disinfectant – keep pH ≤ 7–7.5');
  if (q.worst('toc') > 4) calc.note('warn', 'TOC > 4 mg/L – monitor disinfection by-products: TTHM ≤ 100 µg/L and HAA5 ≤ 80 µg/L in distribution (< 80 / < 60 µg/L after storage); avoid pre-chlorination; SUVA = UV₂₅₄ × 100/DOC > 4 indicates high THM potential (NWSDB D3 §6.10).');
  if (key === 'gas') calc.text('Chlorine room: separate building with no interconnecting doors, two outward-opening exits, low-level exhaust (1 air change per minute), chlorine-leak detectors + siren (shall), 20 % NaOH scrubber / neutralisation, SCBA and safety shower outside, cylinders restrained and shaded (NWSDB D3 §6.5.3, §6.5.8, §9.8.2).');

  // curves
  const killCurve = [];
  const k1 = 1 / ctGiardiaD3(1, T, pHc, C);
  const tEnd = Math.max(T10 * 1.5, 30);
  const cv2 = Math.max(ctVirusD3(2, T) / 2, 1e-6);
  for (let i = 0; i <= 30; i++) { const t = (tEnd * i) / 30; killCurve.push({ t, logG: C * t * k1, logV: (C * t) / cv2 }); }
  const phCurve = [];
  for (let p = 5; p <= 10.01; p += 0.1) phCurve.push({ pH: +p.toFixed(1), f: fracHOCl(p, T) * 100 });
  const bpCurve = [];
  if (cd.nh3n > 0.02) {
    const N = cd.nh3n;
    for (let x = 0; x <= Math.max(12 * N, 3) + 2; x += Math.max(N / 10, 0.05)) {
      const dem0 = 0.3;
      let r;
      if (x <= dem0) r = 0;
      else if (x <= dem0 + 5 * N) r = x - dem0;
      else if (x <= dem0 + 7.6 * N) r = 5 * N - ((x - dem0 - 5 * N) / (2.6 * N)) * 4.5 * N;
      else r = 0.5 * N + (x - dem0 - 7.6 * N);
      bpCurve.push({ x, r: Math.max(0, r) });
    }
  }
  const annualCost = productKgD * 365 * price;
  return {
    inputs: d, key, agent: A, price, cd, totDose, kgD, kgH, chlorinator, kgAvg, productKgD, cylPerMonth, storeUnits, naoclTank,
    credit, needG, needV, pHc, V, hrtNom, T10, BF, chanLen, LW, nPasses, L, W, C, CTp, CTg, CTv, ratio, logG, logV, hocl, killCurve, phCurve, bpCurve,
    annualCost, footprint: d.contactMode === 'tank' ? { L: L + 0.6, W: W + 0.6 } : null,
    depthTot: d.depth + 0.5,
    headloss: d.contactMode === 'tank' ? 0.25 : 0.1,
    buildingArea: key === 'gas' ? ceilTo(60 + storeUnits * (d.cylinder >= 900 ? 2.2 : 0.4), 5) : ceilTo(30 + storeUnits * 0.4, 5),
    ventilation: key === 'gas' ? ceilTo(60 + storeUnits * (d.cylinder >= 900 ? 2.2 : 0.4), 5) * 4 * GAS.ach : 0,
    kw: key === 'gas' ? 5.5 : 1.5,
    ...calc.result(),
  };
}
function num(v, d) { const x = parseFloat(v); return Number.isFinite(x) ? x : d; }
