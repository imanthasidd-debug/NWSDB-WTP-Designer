// Aeration: cascade (lecture gravity-aerator efficiency model) or multiple-tray aerator
import { Calc, n } from '../core/calc.js';
import { DOsat } from '../core/water.js';
import { clamp } from '../core/util.js';

export const DEFAULTS = {
  type: 'auto',           // auto (from process) | cascade | tray
  waterClass: 'unpolluted', // unpolluted | polluted
  nSteps: 5,
  stepH: 0.3,
  areaLoading: 0.03,      // m2 per m3/h (cascade)
  width: 0,               // 0 = auto (square-ish)
  nTrays: 4,
  traySpacing: 0.5,
  trayLoading: 0.08,      // m2 per m3/h
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
    calc.step('Efficiency coefficient for total fall', 'K = 0.45(1+0.046T)\\,h', `${coef}(1+0.046\\times${n(T)})\\times${n(totalH)}`, K, '', 'LN – gravity aerators');
    calc.step('Efficiency per step', 'K_n = K/n', `${n(K)}/${n(d.nSteps)}`, kStep, '');
    Ce = Cs - (Cs - C0) * (1 - kStep) ** d.nSteps;
    calc.step('DO after cascade', 'C_n = C_s - (C_s-C_0)(1-K/n)^n', `${n(Cs)} - (${n(Cs)}-${n(C0)})(1-${n(kStep)})^{${d.nSteps}}`, Ce, 'mg/L', 'LN – cascade aerators');
    for (let i = 0; i <= d.nSteps; i++) steps.push({ i, C: Cs - (Cs - C0) * (1 - kStep) ** i });
    area = d.areaLoading * Qh;
    calc.step('Cascade plan area', 'A = a\\,Q', `${n(d.areaLoading)} \\times ${n(Qh, 0)}`, area, 'm²', 'IRC: 0.015–0.045 m² per m³/h');
    W = d.width > 0 ? d.width : Math.sqrt(area * 2);
    L = area / W;
    calc.step('Cascade width / length (along flow)', 'L = A/W', `${n(area)}/${n(W)}`, L, 'm');
    calc.check('aer.stepH', d.stepH);
    calc.check('aer.cascadeArea', d.areaLoading);
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
    calc.check('aer.trayArea', d.trayLoading);
  }
  // iron & manganese oxidation demand
  const fe = q.worst('fe');
  const mn = q.worst('mn');
  const o2need = 0.143 * fe + 0.29 * mn;
  calc.section('Iron & manganese oxidation');
  calc.step('Stoichiometric O₂ demand', 'O_2 = 0.143\\,Fe^{2+} + 0.29\\,Mn^{2+}', `0.143\\times${n(fe)} + 0.29\\times${n(mn)}`, o2need, 'mg/L', 'LN: 4Fe(HCO₃)₂ + O₂ + 2H₂O → 4Fe(OH)₃ + 8CO₂');
  calc.flag('DO after aeration covers Fe/Mn oxidation demand', Ce - o2need >= 2, `${(Ce - o2need).toFixed(2)} mg/L spare`, '≥ 2 mg/L spare');
  // CO2 stripping (same K, negative driving force)
  const co20 = q.worst('co2');
  const kS = type === 'cascade' ? clamp(K / d.nSteps, 0, 0.99) * 0.7 : clamp(coef * (1 + 0.046 * T) * d.traySpacing * 1.3, 0, 0.95);
  const nS = type === 'cascade' ? d.nSteps : d.nTrays;
  const co2e = d.co2Sat + (co20 - d.co2Sat) * (1 - kS) ** nS;
  calc.step('Free CO₂ after aeration (stripping, 70 % of O₂ efficiency on cascades)', 'C = C_s + (C_0 - C_s)(1-K_n)^n', `${n(d.co2Sat)} + (${n(co20)}-${n(d.co2Sat)})(1-${n(kS)})^{${nS}}`, co2e, 'mg/L', 'LN – cascades are less efficient for CO₂');
  if (type === 'cascade' && d.stepH > 0.6) calc.note('info', 'Step height > 0.6 m reduces O₂ transfer but improves CO₂ removal (lecture notes).');

  return {
    inputs: d, enabled, type, Cs, C0, Ce, K, steps, area, L, W, totalH, nUnits: nUnits || 1, o2need, co20, co2e,
    headloss: totalH + 0.15,
    ...calc.result(),
  };
}
function num(v, d) { const x = parseFloat(v); return Number.isFinite(x) ? x : d; }
