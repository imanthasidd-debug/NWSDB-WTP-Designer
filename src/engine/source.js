// Source yield & hydrology – NWSDB Design Manual D2 §4 (river-basin data, dry-weather availability, reservoir
// yield by mass diagram, sedimentation, evaporation & seepage, rational-formula flood estimate)
import { Calc, n } from '../core/calc.js';
import {
  EVAPORATION,
  SEDIMENT_YEARS,
  SEDIMENT_YIELD,
  SEEPAGE_MONTHLY_PCT,
  basinOf,
  kirpich,
  ownBasin,
  rational,
  ref,
  runoffCforCatchment,
  specificFloodEnvelope,
  tcVelocity,
} from '../core/d2.js';

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// indicative monthly distribution of runoff (fraction of annual) by climatic zone – replace with gauged data
const SHAPE = {
  wet: [0.05, 0.04, 0.05, 0.08, 0.13, 0.12, 0.08, 0.07, 0.08, 0.11, 0.11, 0.08],
  intermediate: [0.1, 0.04, 0.04, 0.07, 0.07, 0.04, 0.03, 0.03, 0.04, 0.13, 0.22, 0.19],
  dry: [0.13, 0.04, 0.03, 0.05, 0.03, 0.01, 0.01, 0.01, 0.02, 0.12, 0.29, 0.26],
};

export const DEFAULTS = {
  basin: 1, // D2 Table 4.1 code; 0 = own source (not in Table 4.1, data below)
  catchment: 0, // km² upstream of intake (0 = whole basin)
  ownName: '', // own source: name (blank = Project setup source name)
  ownArea: 0, // own source: catchment area, km²
  ownRain: 0, // own source: mean annual rainfall, mm (0 = typical of the climatic zone)
  ownRunoff: 0, // own source: mean annual runoff, mm (0 = from rainfall × Table 4.1 runoff ratio)
  dwf: 0, // dependable dry-weather flow at intake, m³/s (0 = screening estimate)
  dwfRP: 10, // return period of the design drought (years)
  releases: 0, // compensation / prior-right releases downstream, m³/s
  otherAbs: 0, // other abstractions upstream / same reach, m³/s
  // reservoir (D2 §4.9–4.11)
  droughtFactor: 0.5, // critical-drought year runoff as fraction of mean year
  inflows: [], // optional monthly inflow of the critical drought (Mm³) – overrides the estimate
  liveStorage: 0, // Mm³ available live storage (0 = not checked)
  waterArea: 0, // km² mean water-surface area (evaporation)
  evapStation: 'Colombo',
  panCoeff: 0.7,
  seepage: SEEPAGE_MONTHLY_PCT, // % of stored volume per month
  otherUse: 0, // irrigation / other demand from the reservoir, m³/d
  // flood (D2 §4.8)
  L: 8000, // m longest watercourse to intake
  H: 120, // m fall over L
  rainI: 0, // mm/h rainfall intensity for duration tc (0 = indicative IDF)
  returnPeriod: 50,
  floodC: 0, // 0 = D2 C by catchment slope
};

/** indicative IDF (mm/h) for duration t (min) – Sri Lanka hydrological zones, 50-yr (replace with Annex F curves) */
const idf = (tMin, zone) => {
  const a = zone === 'wet' ? 2400 : zone === 'intermediate' ? 2000 : 1800;
  return a / (tMin + 15) ** 0.75;
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const setup = ctx.inp.setup || {};
  const dem = ctx.res.demand;
  const zone = ctx.res.quality?.zone || 'wet';
  const isRes = ['reservoir', 'lake'].includes(setup.sourceType);
  const isGW = setup.sourceType === 'groundwater';
  const own = +d.basin === 0;
  const b = own ? ownBasin({ ...d, ownName: d.ownName || setup.source }, zone) : basinOf(d.basin) || basinOf(1);
  const A = own ? b.area : d.catchment > 0 ? d.catchment : b.area;
  const Qabs = dem.Qd; // raw-water abstraction (m³/d) at plant capacity
  const out = { inputs: d, basin: b, own, A, Qabs, isRes, isGW, zone };
  if (isGW) {
    calc.note(
      'info',
      'Groundwater source – assess yield by pumping tests in accordance with NWSDB Manual D4 (Ground Water); D2 §6.2.6: pump capacity must not exceed the yield of a groundwater source.',
    );
    return { ...out, ...calc.result() };
  }
  if (own) {
    calc.section(`Own source – ${b.name} (not in D2 Table 4.1)`);
    calc.step(
      'Catchment mean annual rainfall',
      'R',
      b.rainEst ? `\\text{typical, ${zone} zone}` : '\\text{user value}',
      b.rain,
      'mm',
      b.rainEst ? 'Indicative – enter the catchment rainfall (Dept. of Meteorology records; D2 §4.4)' : 'User data',
    );
    calc.step(
      'Catchment mean annual runoff',
      'Y = k_r R',
      b.runoffEst ? `${n(b.ratio, 2)}\\times${n(b.rain, 0)}` : '\\text{user value}',
      b.runoff,
      'mm',
      b.runoffEst
        ? 'Runoff ratio k_r = area-weighted ratio of the 15 Table 4.1 basins with the nearest rainfall (D2 is silent on ungauged catchments)'
        : 'User data',
    );
    if (!(d.ownArea > 0))
      calc.note(
        'warn',
        `Own source "${b.name}": enter the catchment area at the intake – ${Math.round(b.area)} km² is used until then.`,
      );
    if (b.rainEst || b.runoffEst)
      calc.note(
        'warn',
        `Own source "${b.name}": ${b.rainEst ? 'rainfall is the typical value for the ' + zone + ' zone' : ''}${b.rainEst && b.runoffEst ? ' and ' : ''}${b.runoffEst ? `runoff is estimated as ${Math.round(b.ratio * 100)} % of rainfall (area-weighted ratio of D2 Table 4.1 basins with similar rainfall)` : ''}. Enter gauged or published values for the catchment (D2 §4.4, §4.7).`,
      );
  } else {
    calc.section(`River basin – ${b.name} (D2 Table 4.1, code ${b.code})`);
    calc.step('Basin mean annual rainfall', 'R', '', b.rain, 'mm', ref('4.4, Table 4.1'));
    calc.step('Basin mean annual runoff', 'Y', '', b.runoff, 'mm', ref('Table 4.1'));
  }
  calc.step('Unit runoff', 'q_u = Y/365 \\times 1000', `${n(b.runoff, 0)}/365\\times1000`, b.unit, 'm³/d/km²');
  calc.step(
    'Catchment area upstream of intake',
    'A',
    d.catchment > 0 ? '\\text{user value}' : own ? '\\text{own source}' : '\\text{whole basin}',
    A,
    'km²',
  );
  const Qmean = b.unit * A; // m³/d
  calc.step('Mean annual flow at intake', 'Q_{mean} = q_u A', `${n(b.unit, 0)}\\times${n(A, 1)}`, Qmean, 'm³/d');
  calc.step('Raw-water abstraction (plant capacity)', 'Q_{abs}', '', Qabs, 'm³/d');
  const meanPct = (Qabs / Qmean) * 100;
  calc.step('Abstraction as % of mean flow', 'Q_{abs}/Q_{mean}', '', meanPct, '%');
  calc.check('src.meanAbs', meanPct);
  Object.assign(out, { Qmean, meanPct });

  // ---- dry-weather availability (run-of-river)
  calc.section('Dry-weather availability (run-of-river)');
  const k = zone === 'wet' ? 0.12 : zone === 'intermediate' ? 0.05 : 0.02;
  const dwf = d.dwf > 0 ? d.dwf * 86400 : Qmean * k;
  calc.step(
    `Dependable dry-weather flow (1 in ${d.dwfRP} yr drought)`,
    'Q_{dw}',
    d.dwf > 0 ? `${n(d.dwf, 3)}\\,m^3/s\\ (gauged)` : `${n(k, 2)}\\,Q_{mean}\\ \\text{(screening, ${zone} zone)}`,
    dwf,
    'm³/d',
    ref('4.7') + ' – frequency analysis of gauged flows',
  );
  const rel = (d.releases + d.otherAbs) * 86400;
  calc.step(
    'Downstream releases & other abstractions',
    'Q_r',
    `(${n(d.releases, 3)} + ${n(d.otherAbs, 3)})\\times86400`,
    rel,
    'm³/d',
    ref('4.12') + ' – prior rights',
  );
  const avail = Math.max(0, dwf - rel);
  calc.step('Flow available for abstraction', 'Q_{av} = Q_{dw} - Q_r', `${n(dwf, 0)} - ${n(rel, 0)}`, avail, 'm³/d');
  const dwPct = avail > 0 ? (Qabs / avail) * 100 : 999;
  calc.step('Abstraction / available dry-weather flow', '', '', dwPct, '%');
  if (!isRes) calc.check('src.abstraction', dwPct);
  if (d.dwf <= 0 && !isRes)
    calc.note(
      'warn',
      `Dry-weather flow is a screening estimate (${Math.round(k * 100)} % of mean flow, ${zone} zone). Replace it with a frequency analysis of gauged low flows (Irrigation Dept. Hydrology Division records; D2 §4.4, §4.7).`,
    );
  if (!isRes && dwPct > 100)
    calc.note(
      'fail',
      'The river cannot supply the design abstraction in the design drought – consider a weir with storage, a reservoir, conjunctive groundwater or a staged scheme sized to the source yield (D2 §2.4, §4.11).',
    );
  Object.assign(out, { dwf, rel, avail, dwPct, k });

  // ---- reservoir yield (Rippl / sequent peak) D2 §4.9–4.11
  const meanMonth = SHAPE[zone].map((f, i) => (f * b.runoff * A * 1e3) / 1e6); // Mm³ per month
  const inflow =
    d.inflows?.length === 12 && d.inflows.every((x) => Number.isFinite(+x))
      ? d.inflows.map(Number)
      : meanMonth.map((x) => x * d.droughtFactor);
  const evap = EVAPORATION[d.evapStation] || EVAPORATION.Colombo;
  const months = inflow.map((I, i) => {
    const dem_ = ((Qabs + d.otherUse) * DAYS[i]) / 1e6;
    const evapL = (evap[i] / 1000) * d.panCoeff * d.waterArea; // Mm³ (mm × km² = 1e3 m³)
    const seep = (d.seepage / 100) * (d.liveStorage || 0);
    const relM = (rel * DAYS[i]) / 1e6;
    return { m: i, I, D: dem_ + evapL + seep + relM, dem: dem_, evapL, seep, rel: relM };
  });
  // sequent-peak over two cycles
  let K = 0,
    Kmax = 0;
  for (let c = 0; c < 2; c++)
    for (const mo of months) {
      K = Math.max(0, K + mo.D - mo.I);
      Kmax = Math.max(Kmax, K);
    }
  const sedVol = (SEDIMENT_YIELD * A * SEDIMENT_YEARS) / 1e6;
  let cumI = 0,
    cumD = 0;
  const mass = [{ m: 0, I: 0, D: 0 }].concat(
    months.map((mo) => {
      cumI += mo.I;
      cumD += mo.D;
      return { m: mo.m + 1, I: cumI, D: cumD };
    }),
  );
  Object.assign(out, {
    months,
    inflow,
    Kreq: Kmax,
    sedVol,
    mass,
    grossYield: months.reduce((a, x) => a + x.D, 0),
    annualInflow: cumI,
  });
  if (isRes) {
    calc.section('Reservoir yield – mass diagram (Rippl / sequent peak)');
    calc.step(
      'Critical-drought annual inflow',
      '\\sum I_m',
      d.inflows?.length === 12 ? '\\text{user series}' : `${n(d.droughtFactor, 2)}\\times\\text{mean year}`,
      cumI,
      'Mm³',
      ref('4.11'),
    );
    calc.step(
      'Gross yield required (demand + releases + losses)',
      '\\sum (D + R + E + S)',
      '',
      out.grossYield,
      'Mm³/yr',
      ref('4.11') + ' – gross yield = net + releases + overflows + losses',
    );
    calc.step(
      'Evaporation loss',
      'E = e_{pan} k_p A_w',
      `k_p=${n(d.panCoeff)},\\ A_w=${n(d.waterArea)}\\,km^2`,
      months.reduce((a, x) => a + x.evapL, 0),
      'Mm³/yr',
      ref('4.10') + ` (${d.evapStation})`,
    );
    calc.step(
      'Seepage loss (untested reservoir)',
      `S = ${d.seepage}\\%\\ \\text{of storage per month}`,
      '',
      months.reduce((a, x) => a + x.seep, 0),
      'Mm³/yr',
      ref('5.5.1'),
    );
    calc.step(
      'Live storage required (sequent peak)',
      'K_t = \\max(0, K_{t-1} + D_t - I_t)',
      '',
      Kmax,
      'Mm³',
      ref('4.11'),
    );
    calc.step(
      `Dead storage for ${SEDIMENT_YEARS} years' sediment`,
      'V_s = y_s A\\,t',
      `${SEDIMENT_YIELD}\\times${n(A, 1)}\\times${SEDIMENT_YEARS}`,
      sedVol,
      'Mm³',
      ref('4.9') + ' – upper Mahaweli ≈ 300 m³/km²/yr',
    );
    if (d.liveStorage > 0)
      calc.check('src.rippl', Kmax > 0 ? d.liveStorage / Kmax : 99, 'Live storage available / required');
    else
      calc.note(
        'info',
        'Enter the available live storage of the reservoir / tank to check the yield against the mass-diagram requirement (D2 §4.11).',
      );
    if (cumI < out.grossYield)
      calc.note(
        'fail',
        'Annual inflow in the critical drought is less than the gross yield required – the source cannot sustain the abstraction without carry-over storage from wetter years; extend the Rippl analysis over a multi-year drought (D2 §4.11).',
      );
    calc.note(
      'info',
      'Reservoir / irrigation-tank abstraction requires agreement with the Irrigation Department / Mahaweli Authority on prior rights and downstream releases (D2 §4.12).',
    );
  }

  // ---- flood estimate (D2 §4.8)
  calc.section('Flood estimate at intake (D2 §4.8)');
  const slope = (d.H / Math.max(d.L, 1)) * 100;
  const tcK = kirpich(d.L, d.H);
  const tcV = tcVelocity(d.L, slope, 10);
  const tc = Math.max(tcK, 5);
  calc.step(
    'Time of concentration (Kirpich)',
    't_c = 0.0195\\,k^{0.77},\\ k=\\sqrt{L^3/H}',
    `L=${n(d.L, 0)},\\ H=${n(d.H, 0)}`,
    tcK,
    'min',
    ref('4.8.2'),
  );
  calc.step(
    'Time of concentration (stream velocity)',
    't_c = \\frac{L}{60V} + T',
    `V(${n(slope, 2)}\\%)`,
    tcV,
    'min',
    ref('4.8.2'),
  );
  const C = d.floodC > 0 ? d.floodC : runoffCforCatchment(slope);
  const I = d.rainI > 0 ? d.rainI : idf(tc, zone);
  calc.step(
    'Runoff coefficient',
    'C',
    d.floodC > 0 ? '\\text{user value}' : `\\text{slope } ${n(slope, 1)}\\%`,
    C,
    '–',
    ref('4.8.4'),
  );
  calc.step(
    `Rainfall intensity for t_c (${d.returnPeriod}-yr)`,
    'I',
    d.rainI > 0 ? '\\text{IDF (Annex F)}' : '\\text{indicative IDF}',
    I,
    'mm/h',
  );
  const Qr = rational(C, I, A * 100);
  calc.step(
    'Peak flood – rational formula',
    'Q = \\frac{C I A}{360}',
    `\\frac{${n(C)}\\times${n(I, 1)}\\times${n(A * 100, 0)}}{360}`,
    Qr,
    'm³/s',
    ref('4.8.4') + (A > 50 ? ' – over-estimates above 50 km²' : ''),
  );
  const env = specificFloodEnvelope(A) * A;
  calc.step(
    '1-in-10,000-yr specific-flood envelope',
    'Q_{env} = q_s A',
    `q_s \\approx ${n(specificFloodEnvelope(A), 1)}`,
    env,
    'm³/s',
    ref('4.8.5'),
  );
  if (A > 50)
    calc.note(
      'info',
      'Catchment exceeds 50 km² – the rational formula over-estimates; use unit-hydrograph or recorded flood-frequency analysis (D2 §4.8.3) for the intake design flood and high flood level.',
    );
  if (d.rainI <= 0)
    calc.note(
      'info',
      'Rainfall intensity is an indicative value – read it from the intensity–duration–frequency curves for the hydrological zone (D2 Annex F).',
    );
  Object.assign(out, { slope, tcK, tcV, C, I, Qr, env });
  return { ...out, ...calc.result() };
}
