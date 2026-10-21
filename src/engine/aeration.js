// Aeration: cascade (NWSDB D3 §5.3.5.1 / Annex B gravity-aerator efficiency model) or multiple-tray aerator (D3 §5.3.3.3)
import { Calc, n } from '../core/calc.js';
import { DOsat } from '../core/water.js';
import { clamp } from '../core/util.js';
import { AER, AER_EFF, FE_MN, OXIDANT } from '../core/d3.js';

export const DEFAULTS = {
  type: 'auto',           // auto (from process) | cascade | tray
  waterClass: 'unpolluted', // unpolluted | polluted
  nSteps: 5,              // D3 §5.3.3.2: 4–6 drops
  stepH: 0.4,             // D3: 0.30–0.60 m
  areaLoading: 0.0333,    // m2 per m3/h (cascade) – D3: 120 m² per m³/s
  weirLoad: 0.02,         // m3/s per m width (auto width) – D3 0.01 (Annex B.2: 0.010–0.028)
  width: 0,               // 0 = auto (from weir loading)
  nTrays: 4,              // D3 §5.3.3.3: 3–5 trays
  traySpacing: 0.5,
  trayLoading: 0.025,     // m2 per m3/h – D3: 50–160 m² per m³/s
  co2Sat: 0.5,            // mg/L equilibrium CO2 with air
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const q = ctx.res.quality;
  const dem = ctx.res.demand;
  const type = d.type === 'auto' ? (proc.aeration === 'none' ? 'cascade' : proc.aeration) : d.type;
  const enabled = proc.aeration !== 'none' || d.type !== 'auto';
  const T = q.T;
  const z = num(ctx.inp.setup?.siteElevation, 10);
  const Cs = DOsat(T, z);
  const C0 = q.get('do', 1);
  const Qh = dem.Qh;
  const coef = d.waterClass === 'polluted' ? 0.36 : 0.45;

  calc.section('Oxygen transfer');
  calc.step('DO saturation at design temperature & elevation', 'C_s', `T=${n(T)}\\,^\\circ C,\\ z=${n(z, 0)}\\,m`, Cs, 'mg/L');
  let steps = [];
  let Ce, K, area, L = 0, W = 0, totalH, nUnits;
  if (type === 'cascade') {
    totalH = d.nSteps * d.stepH;
    K = clamp(coef * (1 + 0.046 * T) * totalH, 0, 0.99 * d.nSteps);
    const kStep = clamp(K / d.nSteps, 0, 0.99);
    calc.step('Efficiency coefficient for total fall', 'K = 0.45(1+0.046T)\\,h', `${coef}(1+0.046\\times${n(T)})\\times${n(totalH)}`, K, '', 'NWSDB D3 §5.3.5.1, Annex B.1; LN');
    calc.step('Efficiency per step (K for one drop h)', 'K_n = K/n', `${n(K)}/${n(d.nSteps)}`, kStep, '', 'NWSDB D3 Annex B.1 – applied step by step');
    Ce = Cs - (Cs - C0) * (1 - kStep) ** d.nSteps;
    calc.step('DO after cascade', 'C_n = C_s - (C_s-C_0)(1-K_n)^n', `${n(Cs)} - (${n(Cs)}-${n(C0)})(1-${n(kStep)})^{${d.nSteps}}`, Ce, 'mg/L', 'NWSDB D3 §5.3.5.1 – C_e = C_0 + K(C_s − C_0) per step');
    for (let i = 0; i <= d.nSteps; i++) steps.push({ i, C: Cs - (Cs - C0) * (1 - kStep) ** i });
    area = d.areaLoading * Qh;
    calc.step('Cascade plan area', 'A = a\\,Q', `${n(d.areaLoading)} \\times ${n(Qh, 0)}`, area, 'm²', 'NWSDB D3 §5.3.3.2 – 120 m² per m³/s');
    const Qs = Qh / 3600;
    W = d.width > 0 ? d.width : Math.ceil((Qs / d.weirLoad) * 2) / 2;
    calc.step('Cascade width (overflow length)', 'W = Q/q', d.width > 0 ? '\\text{user}' : `${n(Qs, 3)}/${n(d.weirLoad, 3)}`, W, 'm', 'NWSDB D3 §5.3.3.2 – q = 0.01 m³/s per m (Annex B.2: 0.010–0.028)');
    L = area / W;
    calc.step('Cascade length (along flow)', 'L = A/W', `${n(area)}/${n(W)}`, L, 'm');
    const H0 = (Qs / (1.833 * W)) ** (2 / 3);
    calc.step('Head over each step', 'H_0 = \\left(\\frac{Q}{1.833\\,W}\\right)^{2/3}', `\\left(\\frac{${n(Qs, 3)}}{1.833\\times${n(W)}}\\right)^{2/3}`, H0, 'm', 'NWSDB D3 §5.3.5.1, Annex B.2');
    const tail = AER.tailWater * d.stepH;
    calc.step('Tail-water depth at foot of each drop', 'd = \\tfrac{2}{3}h', `\\tfrac{2}{3}\\times${n(d.stepH)}`, tail, 'm', 'NWSDB D3 §5.3.5.1');
    const tFall = Math.sqrt((2 * d.stepH) / 9.81);
    const vH = Qs / (W * H0);
    calc.step('Minimum horizontal run of each step (nappe throw)', 'B = 2\\,v\\,\\sqrt{2h/g}', `2\\times${n(vH)}\\times${n(tFall, 3)}`, 2 * vH * tFall, 'm', 'NWSDB D3 Annex B.2');
    calc.check('aer.stepH', d.stepH);
    calc.check('aer.drops', d.nSteps, 'Number of drops');
    calc.check('aer.height', totalH, 'Total aerator height (Σ drops)');
    calc.check('aer.weirLoad', Qs / W, 'Overflow rate per m width');
    calc.check('aer.cascadeArea', d.areaLoading);
    if (d.stepH > AER.hBest) calc.note('info', `Drop of ${d.stepH} m exceeds the best-efficiency height of about 0.7 m (K·Cs ≈ 7h, NWSDB D3 Fig 5-27).`);
  } else {
    totalH = d.nTrays * d.traySpacing;
    const kTray = clamp(coef * (1 + 0.046 * T) * d.traySpacing * 1.3, 0, 0.95); // media/droplet enhancement ≈1.3
    K = kTray * d.nTrays;
    calc.step('Efficiency per tray (fall height = spacing, droplet factor 1.3)', 'K_t = 1.3\\times0.45(1+0.046T)s', `1.3\\times${coef}(1+0.046\\times${n(T)})\\times${n(d.traySpacing)}`, kTray, '');
    Ce = Cs - (Cs - C0) * (1 - kTray) ** d.nTrays;
    calc.step('DO after tray aerator', 'C_n = C_s-(C_s-C_0)(1-K_t)^n', `${n(Cs)}-(${n(Cs)}-${n(C0)})(1-${n(kTray)})^{${d.nTrays}}`, Ce, 'mg/L');
    for (let i = 0; i <= d.nTrays; i++) steps.push({ i, C: Cs - (Cs - C0) * (1 - kTray) ** i });
    area = d.trayLoading * Qh;
    calc.step('Tray area (each tray)', 'A = a\\,Q', `${n(d.trayLoading)}\\times${n(Qh, 0)}`, area, 'm²', 'IRC: 0.05–0.15 m² per m³/h');
    nUnits = Math.max(1, Math.ceil(area / 16));
    W = Math.sqrt(area / nUnits);
    L = W;
    calc.step('Number of tray towers (≤ 4 m × 4 m)', 'N', `\\lceil ${n(area)}/16 \\rceil`, nUnits, '');
    calc.check('aer.traySpacing', d.traySpacing);
    calc.check('aer.drops', d.nTrays, 'Number of trays');
    calc.check('aer.height', totalH, 'Total aerator height (trays × spacing)');
    calc.check('aer.trayArea', d.trayLoading);
    calc.step('Hydraulic loading on trays', 'q = Q/A', `${n(Qh / 3600, 3)}/${n(area)}`, Qh / 3600 / area, 'm³/s per m²', 'NWSDB D3 §5.3.3.3 – 0.01–0.02 m³/s per m²');
  }
  // iron & manganese oxidation demand
  const fe = q.worst('fe');
  const mn = q.worst('mn');
  const o2need = OXIDANT.O2.fe * fe + OXIDANT.O2.mn * mn;
  calc.section('Iron & manganese oxidation');
  calc.step('Stoichiometric O₂ demand', 'O_2 = 0.14\\,Fe^{2+} + 0.29\\,Mn^{2+}', `0.14\\times${n(fe)} + 0.29\\times${n(mn)}`, o2need, 'mg/L', 'NWSDB D3 Table 7-1');
  calc.flag('DO after aeration covers Fe/Mn oxidation demand', Ce - o2need >= 2, `${(Ce - o2need).toFixed(2)} mg/L spare`, '≥ 2 mg/L spare');
  // CO2 stripping (same K, negative driving force)
  const co20 = q.worst('co2');
  const kS = type === 'cascade' ? clamp(K / d.nSteps, 0, 0.99) * 0.7 : clamp(coef * (1 + 0.046 * T) * d.traySpacing * 1.3, 0, 0.95);
  const nS = type === 'cascade' ? d.nSteps : d.nTrays;
  const co2e = d.co2Sat + (co20 - d.co2Sat) * (1 - kS) ** nS;
  calc.step('Free CO₂ after aeration (stripping, 70 % of O₂ efficiency on cascades)', 'C = C_s + (C_0 - C_s)(1-K_n)^n', `${n(d.co2Sat)} + (${n(co20)}-${n(d.co2Sat)})(1-${n(kS)})^{${nS}}`, co2e, 'mg/L', 'LN – cascades are less efficient for CO₂');
  const co2Rem = co20 > 0 ? (1 - co2e / co20) * 100 : 0;
  const eff = type === 'cascade' ? [20, 45] : [90, 100];
  calc.flag(`CO₂ removal vs ${type === 'cascade' ? 'cascade' : 'multiple-tray'} efficiency (Table 5-8)`, co2Rem >= eff[0] - 1e-9, `${co2Rem.toFixed(0)} %`, type === 'cascade' ? '20–45 %' : '> 90 %', 'Indicative – confirm by pilot test', 'info', 'NWSDB D3 Table 5-8');
  if (mn > FE_MN.mnStd) calc.note('info', `Mn ${mn} mg/L: aeration alone oxidises Mn only at pH ≥ 9.5 – provide a strong oxidant (Cl₂ 1.29 or KMnO₄ 1.92 mg/mg Mn) and ≥ 20 min detention ahead of filtration (NWSDB D3 §7.1.5, Table 7-1).`);
  calc.text('Aerators should be operated only when needed (decide on raw-water DO); all aerated water must be disinfected before distribution (NWSDB D3 §5.3, §5.3.5.1).');

  return {
    inputs: d, enabled, type, Cs, C0, Ce, K, steps, area, L, W, totalH, nUnits: nUnits || 1, o2need, co20, co2e,
    headloss: totalH + 0.15, co2Rem, eff: AER_EFF,
    ...calc.result(),
  };
}
function num(v, d) { const x = parseFloat(v); return Number.isFinite(x) ? x : d; }
