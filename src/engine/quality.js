// Raw-water quality: SLS 614 screening, seasonal (monsoon) profile, design temperature
import { Calc } from '../core/calc.js';
import { PARAMS, exceeds, rawGlExceeds } from '../core/standards.js';
import { monthlyProfile, regionalAlerts, waterTempOf, zoneOf } from '../core/srilanka.js';
import { maxOf, mean, num } from '../core/util.js';
import { nu } from '../core/water.js';

const ctxNu = (ctx, T) => nu(T) * 1e6;

export const DEFAULTS = {
  values: Object.fromEntries(PARAMS.map((p) => [p.key, [...p.raw]])),
  profileMode: 'auto',     // auto | manual
  monthlyTurb: [12, 10, 14, 40, 140, 120, 55, 45, 60, 150, 130, 40],
  useDistrictTemp: true,
  tssPerNtu: 1.4,          // mg/L TSS per NTU (site-specific ratio)
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp, values: { ...DEFAULTS.values, ...(inp?.values || {}) } };
  const setup = ctx.inp.setup || {};
  const calc = new Calc(ctx.crit);
  const district = setup.district || 'Colombo';
  const zone = zoneOf(district);
  const v = (k, i = 1) => num(d.values[k]?.[i], NaN);
  const T = d.useDistrictTemp ? waterTempOf(district) : v('temp', 1);
  const turbAvg = v('turb', 0);
  const turbMax = v('turb', 1);
  const monthly = d.profileMode === 'auto' ? monthlyProfile(zone, turbAvg, turbMax) : d.monthlyTurb.map((x) => num(x));
  const rows = PARAMS.map((p) => {
    const avg = v(p.key, 0);
    const des = v(p.key, 1);
    const worst = p.type === 'range' ? (Math.abs(des - 7.5) > Math.abs(avg - 7.5) ? des : avg) : p.worstLow ? Math.min(avg, des) : Math.max(avg, des);
    return { ...p, avg, des, worst, exc: exceeds(p, worst), rawGlExc: rawGlExceeds(p, worst) };
  });
  const exceed = rows.filter((r) => r.exc);
  const feMn = Math.max(v('fe', 0), v('fe', 1)) + Math.max(v('mn', 0), v('mn', 1));
  if (feMn > 0.3) calc.note('warn', `Fe + Mn = ${feMn.toFixed(2)} mg/L in raw water; SLS 614 footnote limits combined Fe + Mn to 0.3 mg/L in treated water.`);
  const rawGlFails = rows.filter((r) => r.rawGlExc);
  if (rawGlFails.length) calc.note('warn', `Raw water exceeds the SLS 722:1985 tolerance limits for inland surface water used for public supply (NWSDB D3 Table 2-6) for: ${rawGlFails.map((r) => r.name).join(', ')}. Investigate catchment pollution sources / source protection (D3 §4.5).`);
  if (setup.sourceType !== 'groundwater') {
    const gl = rows.filter((r) => r.rawGl !== undefined);
    calc.flag('Raw water within SLS 722:1985 tolerance limits', !rawGlFails.length, rawGlFails.length ? `${rawGlFails.length} exceeded` : `${gl.length} parameters within`, 'SLS 722 / D3 Table 2-6', rawGlFails.map((r) => r.name).join(', '), 'info', 'NWSDB D3 §2.3.2 Table 2-6');
  }
  const mclr = Math.max(v('mclr', 0), v('mclr', 1));
  if (mclr > 1) calc.note(mclr > 3 ? 'fail' : 'warn', `Microcystin-LR ${mclr} µg/L in raw water – NWSDB D3 Table 2-5 limits 1 µg/L (desirable) / 3 µg/L (permissible); remove intact algal cells before filtration and provide PAC/GAC (D3 §7.5).`);
  // turbidity class – NWSDB D3 Table 4-5 bands
  let turbClass = '0 – 2 NTU (D3 Table 4-5)';
  if (turbMax > 1000) turbClass = '> 1000 NTU – extreme (D3 Table 4-5)';
  else if (turbMax > 750) turbClass = '750 – 1000 NTU (D3 Table 4-5)';
  else if (turbMax > 100) turbClass = '100 – 750 NTU – high (D3 Table 4-5)';
  else if (turbMax > 30) turbClass = '30 – 100 NTU – moderate (D3 Table 4-5)';
  else if (turbMax > 2) turbClass = '2 – 30 NTU – low (D3 Table 4-5)';
  const alerts = regionalAlerts(district, setup.sourceType);
  calc.section('Design water temperature');
  calc.step(d.useDistrictTemp ? `Typical water temperature – ${district}` : 'User-specified water temperature', 'T', 'T', T, '°C');
  calc.step('Kinematic viscosity at design temperature', '\\nu(T)', `T=${T}\\,^\\circ C`, ctxNu(ctx, T), '×10⁻⁶ m²/s', 'NWSDB D3 Annex I');
  calc.section('Seasonal turbidity');
  calc.step('Annual mean of monthly turbidity', '\\bar{T_u}', '\\frac{1}{12}\\sum T_{u,i}', mean(monthly), 'NTU');
  calc.step('Peak monthly turbidity', 'T_{u,max}', '\\max(T_{u,i})', maxOf(monthly), 'NTU');
  return {
    inputs: d, T, zone, district, rows, exceed, monthly, turbAvg, turbMax, turbClass, alerts,
    get: (k, i = 1) => v(k, i),
    worst: (k) => rows.find((r) => r.key === k)?.worst,
    ...calc.result(),
  };
}
