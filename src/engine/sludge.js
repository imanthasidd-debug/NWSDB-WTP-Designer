// Residuals: sludge production (AWWA mass balance), wash-water recovery, thickening, drying beds, disposal
import { Calc, n } from '../core/calc.js';
import { MONTHS, ceilTo, maxOf } from '../core/util.js';

export const DEFAULTS = {
  sedCapture: 85,       // % of solids removed in clarifiers (rest to filters)
  sedSolids: 1.0,       // % solids in clarifier sludge
  thickSolids: 3.0,     // % after thickening
  thickLoad: 15,        // kg/m2.d
  bedLoad: 12,          // kg DS/m2 per application
  bedCycleDry: 21,      // days (dry season)
  bedCycleWet: 35,      // days (monsoon)
  cakeSolids: 22,       // % solids of dried cake
  cakeDensity: 1100,
  recoveryWashes: 2,    // wash-water recovery tank holds n washes
  disposalCost: 2500,   // LKR per tonne of cake (transport + landfill)
  truck: 8,             // m3 per truckload
  dewaterRate: 200,     // kg DS/h per belt press / centrifuge
  dewaterHours: 16,     // operating hours per day
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const dem = ctx.res.demand;
  const q = ctx.res.quality;
  const co = ctx.res.coag;
  const fi = ctx.res.filt;
  const proc = ctx.res.process;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100);
  const b = q.inputs.tssPerNtu || 1.4;
  const kc = co ? co.sludgeFactor : 0;
  const poly = co ? co.inputs.polymer : 0;
  const limeIns = co ? co.limeDose * 0.1 : 0; // insoluble fraction of pre-lime
  calc.section('Dry-solids production (AWWA mass balance)');
  const dsAt = (turb, dose, Q) => (Q * (b * turb + kc * dose + poly + limeIns)) / 1000;
  const dsDes = dsAt(q.turbMax, co ? co.Ddes : 0, dem.Qd);
  calc.step('Peak dry solids (design flow, monsoon turbidity)', 'S = \\frac{Q\\,(b\\,T_u + k_c D + P + L_i)}{1000}', `\\frac{${n(dem.Qd, 0)}(${n(b)}\\times${n(q.turbMax)} + ${n(kc)}\\times${n(co ? co.Ddes : 0)} + ${n(poly)} + ${n(limeIns)})}{1000}`, dsDes, 'kg/d', 'AWWA: S = Q(0.44 Al + SS + A)');
  const monthly = q.monthly.map((t, i) => dsAt(t, co ? co.monthlyDose[i] : 0, Qop));
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const annualT = monthly.reduce((a, x, i) => a + x * days[i], 0) / 1000;
  calc.step('Annual dry solids (operating flow, monthly profile)', '\\sum S_i\\,d_i', '', annualT, 't/yr');
  const sedDS = dsDes * (proc.conv ? d.sedCapture / 100 : 0);
  const filtDS = dsDes - sedDS;
  const sedVol = sedDS / (d.sedSolids * 10);
  calc.step('Clarifier sludge volume (peak)', 'V_s = \\frac{S_{sed}}{10\\,c_s}', `\\frac{${n(sedDS, 0)}}{10\\times${n(d.sedSolids)}}`, sedVol, 'm³/d');
  // wash water recovery
  calc.section('Wash-water recovery');
  const washVol = fi?.washVol || 0;
  const recTank = d.recoveryWashes * washVol;
  const recRate = fi ? (fi.bwDailyM3 / 24) / dem.Qh * 100 : 0;
  calc.step('Recovery tank volume', 'V = n\\,V_w', `${n(d.recoveryWashes)}\\times${n(washVol)}`, recTank, 'm³');
  calc.step('Recycle rate if returned uniformly', 'r = \\frac{V_d/24}{Q}', '', recRate, '% of Q');
  calc.check('sl.recycle', recRate);
  // thickener
  let thick = null;
  if (proc.sludge === 'thickener' || proc.sludge === 'mechanical') {
    calc.section('Gravity thickener');
    const A = dsDes / d.thickLoad;
    const nTh = A > 300 ? 2 : 1;
    const D = ceilTo(Math.sqrt((4 * A / nTh) / Math.PI), 0.5);
    calc.step('Thickener area', 'A = S/SLR', `${n(dsDes, 0)}/${n(d.thickLoad)}`, A, 'm²');
    calc.step(`Diameter (${nTh} unit${nTh > 1 ? 's' : ''})`, 'D = \\sqrt{4A/(n\\pi)}', '', D, 'm');
    calc.check('sl.thickLoad', d.thickLoad);
    thick = { A, n: nTh, D, underflow: dsDes / (d.thickSolids * 10) };
    calc.step('Thickened sludge volume', 'V = S/(10 c_t)', `${n(dsDes, 0)}/(10\\times${n(d.thickSolids)})`, thick.underflow, 'm³/d');
  }
  // dewatering
  const days365 = days.reduce((a, b) => a + b, 0);
  const dsAvg = (annualT * 1000) / days365;
  let bedArea = 0, nBeds = 0, mech = null;
  if (proc.sludge === 'mechanical') {
    calc.section('Mechanical dewatering');
    const units = Math.ceil(dsDes / (d.dewaterRate * d.dewaterHours));
    calc.step('Dewatering units (peak solids)', 'n = \\frac{S}{r\\,h}', `\\frac{${n(dsDes, 0)}}{${n(d.dewaterRate)}\\times${n(d.dewaterHours)}}`, units, 'duty');
    mech = { units, standby: 1, rate: d.dewaterRate };
    bedArea = (dsAvg * 0.15 * d.bedCycleDry) / d.bedLoad; // emergency beds ~15 %
    nBeds = Math.max(2, Math.ceil(bedArea / 300));
    calc.step('Emergency drying beds (15 % of average solids)', 'A', '', bedArea, 'm²');
  } else {
    calc.section('Sludge drying beds');
    const cycle = (8 * d.bedCycleDry + 4 * d.bedCycleWet) / 12;
    bedArea = (dsAvg * cycle) / d.bedLoad;
    nBeds = Math.max(4, Math.ceil(bedArea / 300));
    calc.step('Average drying cycle (8 dry + 4 monsoon months)', '\\bar t_c', `(8\\times${n(d.bedCycleDry)} + 4\\times${n(d.bedCycleWet)})/12`, cycle, 'days');
    calc.step('Bed area (average solids; peak months buffered in thickener/lagoon)', 'A = \\frac{\\bar S\\,\\bar t_c}{L_b}', `\\frac{${n(dsAvg, 0)}\\times${n(cycle)}}{${n(d.bedLoad)}}`, bedArea, 'm²');
    calc.step('Number of beds (≤ 300 m² each)', 'n', '', nBeds, '');
    calc.check('sl.bedLoad', d.bedLoad);
  }
  const cakeT = annualT / (d.cakeSolids / 100);
  const cakeM3 = (cakeT * 1000) / d.cakeDensity;
  calc.step('Dewatered cake for disposal', 'M_c = \\frac{S_{yr}}{c_c}', `\\frac{${n(annualT)}}{${n(d.cakeSolids / 100)}}`, cakeT, 't/yr');
  calc.step('Truckloads per year', 'n = V_c / V_t', `${n(cakeM3, 0)}/${n(d.truck)}`, Math.ceil(cakeM3 / d.truck), '');
  calc.note('info', 'Supernatant and filtrate from residuals should return to the plant inlet (≤ 10 % of flow) or be discharged to CEA standards for inland surface water.');
  return {
    inputs: d, dsDes, dsAvg, mech, monthly, months: MONTHS, annualT, sedDS, filtDS, sedVol, recTank, recRate, thick, bedArea, nBeds, cakeT, cakeM3,
    trucks: Math.ceil(cakeM3 / d.truck), cost: cakeT * d.disposalCost,
    footprint: { L: Math.sqrt(bedArea * 1.3) * 1.2, W: Math.sqrt(bedArea * 1.3) / 1.2 },
    ...calc.result(),
  };
}
