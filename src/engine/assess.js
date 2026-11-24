// Existing-plant assessment: the engineer enters the dimensions of an existing plant and the flows it handles; every
// unit is rated against the NWSDB D3 loading criteria, giving the capacity of each unit, the bottleneck, the head-room
// at today's peak flow and what must be upgraded to reach a target flow.  Limits come from the project's criteria
// library, so edited criteria apply here as well.
import { Calc, n } from '../core/calc.js';
import { RESIDUAL } from '../core/d3.js';

export const DEFAULTS = {
  enabled: false,
  qNow: 0, // m³/d present average production (0 = 80 % of the target)
  qPeak: 0, // m³/d present peak-day throughput (0 = 1.15 × average)
  qTarget: 0, // m³/d flow the plant should handle (0 = design capacity of this project)
  // flocculation
  flN: 2,
  flL: 20,
  flW: 6,
  flH: 3,
  // sedimentation
  sdType: 'rect', // rect | circ
  sdN: 2,
  sdL: 40,
  sdW: 10,
  sdD: 20,
  sdH: 3.5,
  sdWeir: 0,
  sdTubes: false,
  sdTubeCover: 75,
  // filters
  ftType: 'rsf', // rsf | dual | ssf
  ftN: 4,
  ftL: 8,
  ftW: 5,
  // disinfection contact and storage
  ctV: 0,
  ctBF: 0.5,
  cwrV: 0,
  // chemical feed
  coagPumps: 0,
  coagLh: 0,
  coagPct: 10,
  coagDose: 0, // duty pumps, L/h each, solution %, mg/L (0 = dose of this project)
  clKgH: 0,
  clDose: 0, // duty chlorinator kg/h, mg/L (0 = dose of this project)
  // pumping
  rawPumps: 0,
  rawQ: 0,
  twPumps: 0,
  twQ: 0, // duty pumps and m³/h each
};

const fmt0 = (v) => Math.round(v).toLocaleString('en-US');

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const r = ctx.res,
    C = ctx.crit,
    dem = r.demand;
  if (!d.enabled) return { inputs: d, enabled: false, units: [], path: [], ...calc.result() };
  const qTarget = d.qTarget > 0 ? d.qTarget : dem.Qd;
  const qNow = d.qNow > 0 ? d.qNow : 0.8 * qTarget;
  const qPeak = d.qPeak > 0 ? d.qPeak : 1.15 * qNow;
  const lim = (key, fallback, prop = 'max') => (Number.isFinite(C[key]?.[prop]) ? C[key][prop] : fallback);
  const units = [];
  /** rate one unit: cap = capacity in m³/d; metric(Q) = loading at flow Q (for the table) */
  const add = (key, name, o) => units.push({ key, name, hard: true, ...o });

  calc.section('Flows');
  calc.step('Present average production', 'Q_{avg}', d.qNow > 0 ? '\\text{entered}' : '0.8\\,Q_{target}', qNow, 'm³/d');
  calc.step(
    'Present peak-day throughput',
    'Q_{peak}',
    d.qPeak > 0 ? '\\text{entered}' : '1.15\\,Q_{avg}',
    qPeak,
    'm³/d',
  );
  calc.step(
    'Target flow',
    'Q_{target}',
    d.qTarget > 0 ? '\\text{entered}' : '\\text{design capacity of this project}',
    qTarget,
    'm³/d',
  );

  // ---- flocculation: detention ≥ 20 min (D3 §5.6.1)
  if (d.flN > 0 && d.flL > 0 && d.flW > 0 && d.flH > 0) {
    const V = d.flN * d.flL * d.flW * d.flH,
      tMin = lim('fl.t', 20, 'min');
    const cap = (V / tMin) * 1440;
    calc.section('Flocculators');
    calc.step('Volume', 'V = N L W H', `${d.flN}\\times${n(d.flL)}\\times${n(d.flW)}\\times${n(d.flH)}`, V, 'm³');
    calc.step(
      `Capacity at ${tMin} min detention`,
      'Q = V/t',
      `${n(V)}/${n(tMin)}\\,min`,
      cap,
      'm³/d',
      'NWSDB D3 §5.6.1 – flocculation time ≥ 20 min',
    );
    add('floc', 'Flocculators', {
      param: 'Detention time',
      unit: 'min',
      limit: `≥ ${tMin}`,
      metric: (Q) => (V / Q) * 1440,
      cap,
      src: 'NWSDB D3 §5.6.1',
      fix: (Qt) =>
        `add ${fmt0((Qt / 1440) * tMin - V)} m³ of flocculation volume (${Math.ceil(((Qt / 1440) * tMin) / (V / d.flN)) - d.flN} more basin(s) of the same size)`,
    });
  }
  // ---- sedimentation
  {
    const circ = d.sdType === 'circ';
    const A1 = circ ? (Math.PI * d.sdD * d.sdD) / 4 : d.sdL * d.sdW;
    const A = d.sdN * A1;
    if (A > 0 && d.sdH > 0) {
      calc.section('Sedimentation tanks');
      const sorMax = lim('sed.sor', 24),
        hrtMin = lim('sed.hrt', 2, 'min'),
        weirMax = lim('sed.weir', 432),
        tubeMax = lim('tube.loading', 7.5);
      const weir = d.sdWeir > 0 ? d.sdWeir : circ ? d.sdN * Math.PI * (d.sdD - 1) : 0;
      const caps = [];
      if (d.sdTubes && !circ)
        caps.push([
          'Tube-settler loading',
          A * (d.sdTubeCover / 100) * tubeMax * 24,
          `≤ ${tubeMax} m/h on the covered area`,
          'NWSDB D3 §5.7.7',
          (Q) => Q / 24 / ((A * d.sdTubeCover) / 100),
          'm/h',
        ]);
      else {
        caps.push([
          'Surface overflow rate',
          A * sorMax,
          `≤ ${sorMax} m³/m²·d`,
          'NWSDB D3 Table 5-20',
          (Q) => Q / A,
          'm³/m²·d',
        ]);
        caps.push([
          'Detention time',
          ((A * d.sdH) / hrtMin) * 24,
          `≥ ${hrtMin} h`,
          'NWSDB D3 §5.7.1',
          (Q) => ((A * d.sdH) / Q) * 24,
          'h',
        ]);
      }
      if (weir > 0)
        caps.push([
          'Weir loading',
          weir * weirMax,
          `≤ ${weirMax} m³/m·d`,
          'NWSDB D3 §5.7.1',
          (Q) => Q / weir,
          'm³/m·d',
        ]);
      calc.step(
        'Surface area',
        circ ? 'A = N\\pi D^2/4' : 'A = N L W',
        circ ? `${d.sdN}\\pi\\times${n(d.sdD)}^2/4` : `${d.sdN}\\times${n(d.sdL)}\\times${n(d.sdW)}`,
        A,
        'm²',
      );
      for (const [nm, cp, lm, src] of caps)
        calc.step(`Capacity by ${nm.toLowerCase()} (${lm})`, 'Q', '', cp, 'm³/d', src);
      caps.sort((a, b) => a[1] - b[1]);
      const g = caps[0];
      const tubeCap = !circ && !d.sdTubes ? A * 0.75 * Math.min(tubeMax, 5) * 24 : 0;
      add('sed', circ ? 'Clarifiers' : d.sdTubes ? 'Tube-settler tanks' : 'Sedimentation tanks', {
        param: g[0],
        unit: g[5],
        limit: g[2],
        metric: g[4],
        cap: g[1],
        src: g[3],
        fix: (Qt) =>
          tubeCap >= Qt
            ? `fit tube settlers over 75 % of the tanks (≈ 5 m/h on the covered area gives ${fmt0(tubeCap)} m³/d)`
            : `add ${Math.max(1, Math.ceil(Qt / (g[1] / d.sdN)) - d.sdN)} tank(s) of the same size${tubeCap > g[1] ? `, or fit tube settlers (${fmt0(tubeCap)} m³/d) and add the rest` : ''}`,
      });
    }
  }
  // ---- filters
  if (d.ftN > 0 && d.ftL > 0 && d.ftW > 0) {
    const A1 = d.ftL * d.ftW,
      N = d.ftN,
      ssf = d.ftType === 'ssf';
    calc.section(ssf ? 'Slow sand filters' : 'Rapid gravity filters');
    calc.step('Filter area', 'A = N L W', `${N}\\times${n(d.ftL)}\\times${n(d.ftW)}`, N * A1, 'm²');
    if (ssf) {
      const vMax = lim('f.rateSSF', 0.4);
      const cap = Math.max(1, N - 1) * A1 * vMax * 24;
      calc.step(
        `Capacity with one bed being scraped (${vMax} m/h)`,
        'Q = (N-1) A v',
        '',
        cap,
        'm³/d',
        'NWSDB D3 §5.12.5',
      );
      add('filt', 'Slow sand filters', {
        param: 'Rate, one bed out',
        unit: 'm/h',
        limit: `≤ ${vMax}`,
        metric: (Q) => Q / 24 / (Math.max(1, N - 1) * A1),
        cap,
        src: 'NWSDB D3 §5.12.5',
        fix: (Qt) => `add ${Math.max(1, Math.ceil(Qt / (vMax * 24 * A1)) + 1 - N)} bed(s) of the same size`,
      });
    } else {
      const vMax = lim(d.ftType === 'dual' ? 'f.rateDual' : 'f.rate', 12),
        v2 = lim('f.rateMax', 15);
      const capAll = N * A1 * vMax * 24,
        capTwo = Math.max(1, N - 2) * A1 * v2 * 24;
      calc.step(
        `Capacity with all filters in service (${vMax} m/h)`,
        'Q = N A v',
        '',
        capAll,
        'm³/d',
        'NWSDB D3 Table 5-26',
      );
      calc.step(
        `Capacity with one filter out and one backwashing (${v2} m/h)`,
        'Q = (N-2) A v',
        '',
        capTwo,
        'm³/d',
        'NWSDB D3 §5.9.2.2, Annex F.1',
      );
      const two = capTwo < capAll;
      add('filt', 'Rapid gravity filters', {
        param: two ? 'Rate, one out + one washing' : 'Filtration rate',
        unit: 'm/h',
        limit: `≤ ${two ? v2 : vMax}`,
        metric: (Q) => Q / 24 / ((two ? Math.max(1, N - 2) : N) * A1),
        cap: Math.min(capAll, capTwo),
        src: two ? 'NWSDB D3 §5.9.2.2' : 'NWSDB D3 Table 5-26',
        fix: (Qt) =>
          `add ${Math.max(1, Math.max(Math.ceil(Qt / (vMax * 24 * A1)), Math.ceil(Qt / (v2 * 24 * A1)) + 2) - N)} filter(s) of the same size`,
      });
    }
  }
  // ---- chlorine contact
  if (d.ctV > 0) {
    const tMin = RESIDUAL.contactMin;
    const cap = ((d.ctV * d.ctBF) / tMin) * 1440;
    calc.section('Chlorine contact');
    calc.step(
      `Capacity for an effective contact time T₁₀ of ${tMin} min`,
      'Q = \\frac{V\\,BF}{t}',
      `\\frac{${n(d.ctV)}\\times${n(d.ctBF)}}{${tMin}\\,min}`,
      cap,
      'm³/d',
      'NWSDB D3 §6.3 – contact ≥ 20 min; baffle factor Table 6-2',
    );
    add('ct', 'Chlorine contact tank', {
      param: 'Effective contact T₁₀',
      unit: 'min',
      limit: `≥ ${tMin}`,
      metric: (Q) => ((d.ctV * d.ctBF) / Q) * 1440,
      cap,
      src: 'NWSDB D3 §6.3, Table 6-2',
      fix: (Qt) =>
        d.ctBF < 0.7 && ((d.ctV * 0.7) / tMin) * 1440 >= Qt
          ? 'add baffle walls to raise the baffle factor to 0.7 (serpentine flow, L:W ≥ 40)'
          : `add ${fmt0(((Qt / 1440) * tMin) / Math.max(d.ctBF, 0.7) - d.ctV)} m³ of baffled contact volume`,
    });
  }
  // ---- clear-water storage (advisory)
  if (d.cwrV > 0) {
    const cap = (d.cwrV / 2) * 24;
    calc.section('Clear-water reservoir');
    calc.step(
      'Flow for which the reservoir gives 2 hours of storage',
      'Q = V/2\\,h',
      `${n(d.cwrV)}/2`,
      cap,
      'm³/d',
      'NWSDB D3 §9.1 – advisory; balancing storage depends on the pumping regime',
    );
    add('cwr', 'Clear-water reservoir', {
      hard: false,
      param: 'Storage',
      unit: 'h',
      limit: '≥ 2',
      metric: (Q) => (d.cwrV / Q) * 24,
      cap,
      src: 'NWSDB D3 §9.1',
      fix: (Qt) => `add ${fmt0((Qt / 24) * 2 - d.cwrV)} m³ of storage`,
    });
  }
  // ---- chemical feed
  if (d.coagPumps > 0 && d.coagLh > 0) {
    const dose = d.coagDose > 0 ? d.coagDose : r.coag?.Ddes || 40;
    const kgH = (d.coagPumps * d.coagLh * d.coagPct * 10) / 1000;
    const cap = ((kgH * 1000) / dose) * 24;
    calc.section('Coagulant feed');
    calc.step(
      'Feed capacity of the duty pumps',
      'w = n\\,q\\,C',
      `${d.coagPumps}\\times${n(d.coagLh)}\\,L/h\\times${n(d.coagPct)}\\%`,
      kgH,
      'kg/h',
    );
    calc.step(
      `Flow that can be dosed at the design dose (${n(dose)} mg/L)`,
      'Q = w/D',
      '',
      cap,
      'm³/d',
      'NWSDB D3 §5.4.8, §6.1.9 – standby feeder excluded',
    );
    add('coag', 'Coagulant dosing', {
      param: 'Maximum dose',
      unit: 'mg/L',
      limit: `≥ ${n(dose, 0)}`,
      metric: (Q) => (kgH * 1000) / (Q / 24),
      cap,
      src: 'NWSDB D3 §5.4.8',
      fix: (Qt) =>
        `raise the duty feed capacity to ${n(((Qt / 24) * dose) / 1000, 1)} kg/h (${fmt0(((Qt / 24) * dose) / (d.coagPct * 10))} L/h at ${d.coagPct} %)`,
    });
  }
  if (d.clKgH > 0) {
    const dose = d.clDose > 0 ? d.clDose : r.dis?.totDose || 3;
    const cap = ((d.clKgH * 1000) / (dose * 1.25)) * 24;
    calc.section('Chlorine feed');
    calc.step(
      `Flow that can be dosed at ${n(dose)} mg/L with 25 % margin`,
      'Q = \\frac{w}{1.25\\,D}',
      `\\frac{${n(d.clKgH)}\\,kg/h}{1.25\\times${n(dose)}}`,
      cap,
      'm³/d',
      'NWSDB D3 §6.5.8 – duty chlorinator; standby excluded',
    );
    add('cl', 'Chlorinator', {
      param: 'Maximum dose',
      unit: 'mg/L',
      limit: `≥ ${n(dose * 1.25, 1)}`,
      metric: (Q) => (d.clKgH * 1000) / (Q / 24),
      cap,
      src: 'NWSDB D3 §6.5',
      fix: (Qt) => `provide a duty chlorinator of ${n(((Qt / 24) * dose * 1.25) / 1000, 1)} kg/h`,
    });
  }
  // ---- pumping
  const ratio = dem.Qd / (dem.design?.mdd || NaN);
  const own = ratio >= 1 && ratio <= 1.3 ? ratio - 1 : Math.max(0, Number(dem.inputs?.ownUse ?? 5)) / 100;
  const pump = (key, name, np, q, treated) => {
    if (!(np > 0 && q > 0)) return;
    const f = treated ? 1 + own : 1;
    const cap = np * q * 24 * f;
    calc.section(name);
    calc.step(
      'Capacity of the duty pumps running 24 h',
      'Q = n\\,q',
      `${np}\\times${n(q)}\\,m^3/h`,
      np * q * 24,
      'm³/d',
      'NWSDB D2 §6.2 – stand-by pump excluded',
    );
    if (treated)
      calc.step(
        'Equivalent plant throughput (treatment losses added)',
        'Q = n\\,q\\,(1+w)',
        `${n(np * q * 24, 0)}(1+${n(own, 3)})`,
        cap,
        'm³/d',
        'NWSDB D2 §3.2.5 – the pumps deliver the plant output, which is the throughput less treatment losses',
      );
    add(key, name, {
      param: treated ? 'Duty pumping capacity (output)' : 'Duty pumping capacity',
      unit: 'm³/h',
      limit: 'duty pumps only',
      metric: () => np * q,
      cap,
      src: 'NWSDB D2 §6.2',
      fix: (Qt) => `raise the duty capacity to ${fmt0(Qt / 24 / f)} m³/h (add a pump or fit larger impellers / pumps)`,
    });
  };
  pump('rwp', 'Raw-water pumps', d.rawPumps, d.rawQ, false);
  pump('twp', 'Treated-water pumps', d.twPumps, d.twQ, true);

  // ---- rating
  for (const u of units) {
    u.atPeak = u.metric(qPeak);
    u.atTarget = u.metric(qTarget);
    u.util = (qPeak / u.cap) * 100;
    u.status = u.cap >= qTarget * 0.995 ? 'ok' : u.cap >= qPeak * 0.995 ? 'warn' : 'fail';
    u.action = u.cap >= qTarget * 0.995 ? 'adequate for the target flow' : u.fix(qTarget);
    if (!u.hard && u.status === 'fail') u.status = 'warn';
    calc.flag(
      `${u.name}: capacity for the target flow`,
      u.status === 'ok',
      `${fmt0(u.cap)} m³/d (${u.param.toLowerCase()})`,
      `≥ ${fmt0(qTarget)} m³/d`,
      u.status === 'ok'
        ? ''
        : `To reach the target: ${u.action}. ${u.status === 'fail' ? 'Already overloaded at the present peak flow.' : 'Adequate at the present peak flow.'}`,
      u.status === 'fail' ? 'fail' : 'warn',
      u.src,
    );
  }
  const hard = units.filter((u) => u.hard).sort((a, b) => a.cap - b.cap);
  const plantCap = hard.length ? hard[0].cap : 0;
  const bottleneck = hard[0] || null;
  // upgrade path: relieve the limiting unit, then the next one, until the target is met
  const path = [];
  for (let i = 0; i < hard.length && hard[i].cap < qTarget * 0.995; i++)
    path.push({
      step: i + 1,
      unit: hard[i].name,
      capNow: hard[i].cap,
      action: hard[i].fix(qTarget),
      after: Math.min(qTarget, hard[i + 1] ? Math.max(hard[i + 1].cap, hard[i].cap) : qTarget),
    });
  if (hard.length) {
    calc.section('Plant rating');
    calc.step(
      'Present plant capacity (smallest unit capacity)',
      'Q_{plant} = \\min Q_i',
      hard.map((u) => n(u.cap, 0)).join(',\\ '),
      plantCap,
      'm³/d',
      `limited by ${bottleneck.name.toLowerCase()}`,
    );
    calc.step(
      'Head-room at the present peak flow',
      'Q_{plant} - Q_{peak}',
      `${n(plantCap, 0)} - ${n(qPeak, 0)}`,
      plantCap - qPeak,
      'm³/d',
    );
    calc.step(
      'Shortfall against the target flow',
      'Q_{target} - Q_{plant}',
      `${n(qTarget, 0)} - ${n(plantCap, 0)}`,
      Math.max(0, qTarget - plantCap),
      'm³/d',
    );
    if (plantCap < qPeak * 0.995)
      calc.note(
        'fail',
        `The plant is overloaded at the present peak flow: ${bottleneck.name.toLowerCase()} can carry ${fmt0(plantCap)} m³/d against ${fmt0(qPeak)} m³/d.`,
      );
    else if (plantCap < qTarget * 0.995)
      calc.note(
        'warn',
        `The plant can carry ${fmt0(plantCap)} m³/d (limited by ${bottleneck.name.toLowerCase()}); ${path.length} upgrade step(s) are needed to reach ${fmt0(qTarget)} m³/d.`,
      );
    else
      calc.note(
        'ok',
        `Every rated unit can carry the target flow of ${fmt0(qTarget)} m³/d; spare capacity ${fmt0(plantCap - qTarget)} m³/d.`,
      );
    calc.note(
      'info',
      'The rating uses hydraulic and loading criteria only. Confirm with plant records: settled and filtered turbidity, filter run lengths, chemical doses, the condition of media, underdrains, scrapers and valves, and the hydraulic profile at the higher flow.',
    );
  }
  return {
    inputs: d,
    enabled: true,
    qNow,
    qPeak,
    qTarget,
    units,
    plantCap,
    bottleneck: bottleneck?.name || '',
    headroom: plantCap - qPeak,
    shortfall: plantCap >= qTarget * 0.995 ? 0 : qTarget - plantCap,
    path,
    ...calc.result(),
  };
}

/** the units of the current (new) design expressed as existing-plant inputs – used by "Copy the current design" */
export function fromDesign(r) {
  const o = {
    flN: 0,
    sdN: 0,
    ftN: 0,
    ctV: 0,
    cwrV: 0,
    coagPumps: 0,
    coagLh: 0,
    clKgH: 0,
    rawPumps: 0,
    rawQ: 0,
    twPumps: 0,
    twQ: 0,
    sdTubes: false,
    sdWeir: 0,
  };
  const fl = r.floc,
    sd = r.sed,
    fi = r.filt,
    dis = r.dis,
    st = r.storage,
    co = r.coag,
    ik = r.intake;
  if (fl?.enabled) Object.assign(o, { flN: fl.nT, flL: +fl.L.toFixed(1), flW: fl.W, flH: fl.H });
  if (sd?.enabled && (sd.type === 'rect' || sd.type === 'tube' || sd.type === 'circ'))
    Object.assign(
      o,
      sd.type === 'circ'
        ? { sdType: 'circ', sdN: sd.N, sdD: sd.D, sdH: sd.H }
        : {
            sdType: 'rect',
            sdN: sd.N,
            sdL: sd.L,
            sdW: sd.W,
            sdH: sd.H,
            sdWeir: +(sd.weirAct * sd.N).toFixed(1),
            sdTubes: sd.type === 'tube',
          },
    );
  if (fi)
    Object.assign(o, {
      ftType: fi.type === 'ssf' ? 'ssf' : fi.type === 'dual' ? 'dual' : 'rsf',
      ftN: fi.N,
      ftL: fi.Lb,
      ftW: fi.type === 'ssf' ? fi.B : +(fi.Af / fi.Lb).toFixed(2),
    });
  if (dis?.V) Object.assign(o, { ctV: Math.round(dis.V), ctBF: dis.BF });
  if (st)
    Object.assign(o, { cwrV: Math.round(st.V), twPumps: st.pumps.nDuty, twQ: Math.ceil(st.pumps.Qp * 3600 - 1e-6) });
  if (co)
    Object.assign(o, {
      coagPumps: Math.max(1, r.demand.nTrains),
      coagLh: Math.ceil(co.pumpMax - 1e-6),
      coagPct: r.buildings?.inputs?.stockPct ?? 10,
    });
  if (dis?.chlorinator) o.clKgH = dis.chlorinator;
  if (ik?.pumps) Object.assign(o, { rawPumps: ik.pumps.nDuty, rawQ: Math.ceil(ik.pumps.Qp * 3600 - 1e-6) });
  return o;
}
