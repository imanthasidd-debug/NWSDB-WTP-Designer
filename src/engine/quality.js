// Raw-water quality: SLS 614 screening, seasonal (monsoon) profile, design temperature
import { Calc } from '../core/calc.js';
import { PARAMS, exceeds, rawGlExceeds } from '../core/standards.js';
import { monthlyProfile, regionalAlerts, waterTempOf, zoneOf } from '../core/srilanka.js';
import { maxOf, mean, num } from '../core/util.js';

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
  if (rawGlFails.length) calc.note('warn', `Raw water exceeds the proposed SLSI/CEA guideline for drinking-water sources (conventional treatment) for: ${rawGlFails.map((r) => r.name).join(', ')}. Investigate catchment pollution sources.`);
  let turbClass = 'Low (< 10 NTU)';
  if (turbMax > 1000) turbClass = 'Extreme (> 1000 NTU)';
  else if (turbMax > 100) turbClass = 'High (100–1000 NTU)';
  else if (turbMax > 10) turbClass = 'Moderate (10–100 NTU)';
  const alerts = regionalAlerts(district, setup.sourceType);
  calc.section('Design water temperature');
  calc.step(d.useDistrictTemp ? `Typical water temperature – ${district}` : 'User-specified water temperature', 'T', 'T', T, '°C');
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
