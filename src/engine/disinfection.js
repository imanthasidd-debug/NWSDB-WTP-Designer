// Disinfection: chlorine dose (demand + residual, breakpoint), CT compliance (USEPA SWTR),
// contact-tank sizing & baffling, chlorinators, cylinder logistics, hypochlorite alternatives.
import { Calc, n } from '../core/calc.js';
import { ctGiardia, ctVirus, fracHOCl, pKaHOCl } from '../core/water.js';
import { ceilTo, nextStd } from '../core/util.js';

export const AGENTS = {
  gas: { label: 'Chlorine gas', strength: 1.0, price: 450, unit: 'kg Cl₂' },
  naocl: { label: 'Sodium hypochlorite (10 % av. Cl)', strength: 0.10, price: 130, unit: 'kg solution', density: 1170 },
  hth: { label: 'Calcium hypochlorite – HTH (65 %)', strength: 0.65, price: 950, unit: 'kg granules' },
  bleach: { label: 'Bleaching powder (30 %)', strength: 0.30, price: 330, unit: 'kg powder' },
};
export const CHLORINATORS = [0.5, 1, 2, 4, 5, 10, 20, 25, 50, 100, 200];

export const DEFAULTS = {
  agent: 'auto',
  demand: 1.2,          // mg/L post-filtration chlorine demand (from chlorine-demand test)
  residual: 1.0,        // mg/L free residual leaving the plant
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
  calc.step('Post-chlorination dose', 'D = demand + residual (+ D_{bp})', `${n(d.demand)} + ${n(d.residual)}${cd.bp ? ' + ' + n(cd.bp) : ''}`, cd.post, 'mg/L', 'LN: chlorine demand must be satisfied before disinfection');
  if (cd.pre) calc.step('Pre-chlorination dose', 'D_{pre}', '', cd.pre, 'mg/L');
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
    calc.step('Cylinders in store (storage period + 2 on line)', 'n_s', `${n(d.storageDays)}\\,d`, storeUnits, '');
    const withdrawal = d.cylinder >= 900 ? 7 : 0.75; // kg/h continuous withdrawal per cylinder at ~25 °C (gas)
    const onLine = Math.ceil(kgH / withdrawal);
    calc.step('Cylinders on line (gas withdrawal limit)', 'n = w / w_{max}', `${n(kgH)}/${n(withdrawal)}`, onLine, '');
    if (d.cylinder < 900 && kgD > 70) calc.note('info', 'Daily use exceeds one 70 kg cylinder per day – 900 kg tonners with a manifold are recommended.');
  } else if (key === 'naocl') {
    naoclTank = (productKgD * d.storageDays) / (A.density || 1170);
    calc.step('Hypochlorite bulk tank volume', 'V = \\frac{W_p\\,t_s}{\\rho}', `\\frac{${n(productKgD)}\\times${n(d.storageDays)}}{1170}`, naoclTank, 'm³');
    calc.note('info', 'Sodium hypochlorite degrades with heat and light (≈ 1–2 % strength per week at 30 °C) – limit storage to ≤ 30 days in shaded tanks.');
  } else {
    storeUnits = Math.ceil((productKgD * d.storageDays) / 45);
    calc.step('Drums (45 kg) in store', 'n = W_p t_s / 45', '', storeUnits, '');
  }

  // ---- CT
  calc.section('Contact time & CT (USEPA SWTR method)');
  const credit = proc.conv ? { g: 2.5, v: 2.0 } : proc.direct ? { g: 2.0, v: 1.0 } : { g: 2.0, v: 2.0 };
  const needG = Math.max(0.5, d.giardiaReq - credit.g);
  const needV = Math.max(0, d.virusReq - credit.v);
  calc.step('Giardia inactivation required by disinfection', 'L_G = L_{tot} - credit', `${n(d.giardiaReq)} - ${n(credit.g)}`, needG, 'log');
  calc.step('Virus inactivation required by disinfection', 'L_V = L_{tot} - credit', `${n(d.virusReq)} - ${n(credit.v)}`, needV, 'log');
  const pHc = d.limeBeforeContact && stab ? stab.pHfinal : stab ? stab.pHafterCl : 7.2;
  let V, T10, BF, chanLen = 0, nPasses = 0, LW = 0, L = 0, W = 0;
  if (d.contactMode === 'tank') {
    V = (Qh / 60) * d.hrt;
    if (!(d.depth > 0)) d.depth = V < 300 ? 2.0 : 3.0;
    if (!(d.chanWidth > 0)) d.chanWidth = Math.min(3, Math.max(0.6, Math.round(Math.sqrt(V / (d.depth * 45)) * 10) / 10));
    chanLen = V / (d.depth * d.chanWidth);
    LW = chanLen / d.chanWidth;
    BF = d.baffleFactor > 0 ? d.baffleFactor : LW >= 40 ? 0.7 : LW >= 20 ? 0.6 : LW >= 10 ? 0.5 : 0.3;
    const side = Math.sqrt(V / d.depth);
    nPasses = Math.max(2, Math.round(side / d.chanWidth));
    L = chanLen / nPasses;
    W = nPasses * d.chanWidth + (nPasses - 1) * 0.2;
    calc.step('Contact tank volume', 'V = Q\\,\\theta', `${n(Qh / 60, 2)}\\times${n(d.hrt)}`, V, 'm³');
    calc.step('Serpentine channel length', 'L_p = \\frac{V}{h\\,w}', `\\frac{${n(V)}}{${n(d.depth)}\\times${n(d.chanWidth)}}`, chanLen, 'm');
    calc.step('Flow-path length : width', 'L_p/w', `${n(chanLen)}/${n(d.chanWidth)}`, LW, '');
    calc.step('Baffle factor (T₁₀/T)', 'BF', d.baffleFactor > 0 ? '\\text{user}' : '\\text{from }L/W', BF, '');
    calc.check('dis.LW', LW);
  } else {
    const cwrH = num(ctx.inp.storage?.cwrHours, 4);
    V = cwrH * Qh * d.cwrMinFrac;
    BF = d.baffleFactor > 0 ? d.baffleFactor : 0.5;
    calc.step('Effective CWR contact volume at low level', 'V = f\\,t_s Q', `${n(d.cwrMinFrac)}\\times${n(cwrH)}\\times${n(Qh, 0)}`, V, 'm³');
    calc.step('Baffle factor (baffled reservoir)', 'BF', '', BF, '');
  }
  T10 = (V / (Qh / 60)) * BF;
  calc.step('Effective contact time', 'T_{10} = BF\\,\\frac{V}{Q}', `${n(BF)}\\times\\frac{${n(V)}}{${n(Qh / 60, 2)}}`, T10, 'min');
  const C = d.residual;
  const CTp = C * T10;
  const CTg = ctGiardia(needG, T, pHc, C);
  const CTv = ctVirus(needV, T);
  calc.step('CT provided', 'CT = C\\,T_{10}', `${n(C)}\\times${n(T10)}`, CTp, 'mg·min/L');
  calc.step(`CT required, ${n(needG)}-log Giardia (T = ${T} °C, pH ${pHc.toFixed(2)})`, T < 12.5 ? 'CT = 0.353I\\,(12.006+e^{2.46-0.073T+0.125C+0.389pH})' : 'CT = 0.361I\\,(-2.261+e^{2.69-0.065T+0.111C+0.361pH})', `I=${n(needG)},\\ T=${n(T)},\\ C=${n(C)},\\ pH=${n(pHc, 2)}`, CTg, 'mg·min/L', 'USEPA (Smith et al. 1995)');
  calc.step(`CT required, ${needV}-log virus`, 'CT_V', 'USEPA\\ table', CTv, 'mg·min/L');
  const ratio = CTp / Math.max(CTg, CTv, 1e-6);
  const logG = (CTp / ctGiardia(1, T, pHc, C));
  const logV = CTp / (ctVirus(2, T) / 2);
  calc.step('CT ratio (governing)', 'CT_{prov}/CT_{req}', `${n(CTp)}/${n(Math.max(CTg, CTv))}`, ratio, '');
  calc.check('dis.ctRatio', ratio);
  const hrtNom = V / (Qh / 60);
  calc.check('dis.contact', hrtNom, 'Nominal contact time V/Q');
  calc.check('dis.residual', C);
  calc.check('dis.pH', pHc);
  const hocl = fracHOCl(pHc, T);
  calc.step('Fraction of free chlorine as HOCl', '\\frac{1}{1+10^{pH-pK_a}}', `pK_a=${n(pKaHOCl(T), 2)}`, hocl * 100, '%', 'LN: HOCl is the stronger disinfectant – keep pH ≤ 7–7.5');
  if (q.worst('toc') > 4) calc.note('warn', 'TOC > 4 mg/L – monitor trihalomethanes (WHO: chloroform 0.3 mg/L).');

  // curves
  const killCurve = [];
  const k1 = 1 / ctGiardia(1, T, pHc, C);
  const tEnd = Math.max(T10 * 1.5, 30);
  for (let i = 0; i <= 30; i++) { const t = (tEnd * i) / 30; killCurve.push({ t, logG: C * t * k1, logV: (C * t) / (ctVirus(2, T) / 2) }); }
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
    kw: key === 'gas' ? 5.5 : 1.5,
    ...calc.result(),
  };
}
function num(v, d) { const x = parseFloat(v); return Number.isFinite(x) ? x : d; }
