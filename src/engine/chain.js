// Design chain: follows the water through the treatment train and records what every unit receives from the
// unit upstream and hands on to the next one (flow, water level, turbidity, pH, alkalinity, chlorine, solids).
// Also defines the key results of each unit used for the "impact of the last change" ripple and what-if analysis.

const num = (x) => (Number.isFinite(+x) ? +x : null);

/** static dependency map: which upstream results each unit uses, and what it produces for downstream units */
export const DEPENDS = {
  demand: { uses: [], gives: ['Plant capacity Q', 'Number of trains', 'Peak flows for pumping & storage'] },
  quality: { uses: [], gives: ['Raw turbidity (design / average)', 'pH, alkalinity, hardness', 'Fe, Mn, colour, algae → process selection', 'Temperature → viscosity'] },
  source: { uses: ['demand'], gives: ['Dependable yield vs abstraction', 'Low / flood water levels → intake'] },
  process: { uses: ['quality', 'demand'], gives: ['Treatment route & unit types', 'Which units exist in the train'] },
  intake: { uses: ['demand', 'source', 'hyd'], gives: ['Raw water Q at inlet-chamber level', 'Raw-water pump duty & power'] },
  aeration: { uses: ['demand', 'quality', 'process'], gives: ['DO, CO₂ removed → coagulation pH', 'Head loss → hydraulic profile'] },
  coag: { uses: ['demand', 'quality', 'process'], gives: ['Coagulant dose → floc, sludge, cost', 'pH / alkalinity after coagulation → disinfection, stabilisation'] },
  rapidmix: { uses: ['demand', 'quality', 'coag'], gives: ['Mixed water to flocculators', 'Head loss → hydraulic profile'] },
  floc: { uses: ['demand', 'quality', 'rapidmix'], gives: ['Flocculated water to clarifiers', 'Head loss → hydraulic profile'] },
  sed: { uses: ['demand', 'quality', 'coag', 'floc'], gives: ['Settled turbidity → filter run length', 'Sludge → residuals', 'Footprint → layout, cost'] },
  filt: { uses: ['demand', 'quality', 'sed'], gives: ['Filtered turbidity → disinfection credit', 'Backwash water → residuals, recovery', 'Head loss → hydraulic profile'] },
  dis: { uses: ['demand', 'quality', 'coag', 'filt'], gives: ['Free chlorine residual & CT', 'pH after chlorination → stabilisation'] },
  stab: { uses: ['quality', 'coag', 'dis'], gives: ['Final pH, LSI / CCPP of treated water', 'Lime demand → cost'] },
  storage: { uses: ['demand', 'dis'], gives: ['Clear-water & service reservoir volumes', 'Treated-water pumping'] },
  sludge: { uses: ['quality', 'coag', 'sed', 'filt'], gives: ['Dry solids → thickener, beds / dewatering', 'Recovered wash water'] },
  hyd: { uses: ['rapidmix', 'floc', 'sed', 'filt', 'dis', 'storage'], gives: ['Water levels of every unit', 'Inlet level → raw-water pump head'] },
  layout: { uses: ['intake', 'sed', 'filt', 'dis', 'storage', 'sludge'], gives: ['Site area & arrangement'] },
  energy: { uses: ['intake', 'rapidmix', 'filt', 'storage', 'sludge'], gives: ['Connected load, transformer, generator', 'Energy cost → O&M'] },
  cost: { uses: ['intake', 'coag', 'sed', 'filt', 'dis', 'storage', 'sludge', 'energy'], gives: ['Capital cost', 'O&M cost', 'Cost per m³'] },
  compliance: { uses: ['quality', 'process', 'sed', 'filt', 'dis', 'stab'], gives: ['Predicted treated-water quality vs SLS 614'] },
};

/** train step → module that designs it */
export const STEP_MOD = { intake: 'intake', rwp: 'intake', aeration: 'aeration', presed: 'sed', coag: 'coag', pac: 'coag', rapidmix: 'rapidmix', floc: 'floc', sed: 'sed', filt: 'filt', dis: 'dis', stab: 'stab', cwr: 'storage', twp: 'storage', sludge: 'sludge', prechlor: 'dis' };

/**
 * Follow the water through the train.  Returns {stages[], profile[]}: each stage has the state of the water leaving
 * it (Q m³/d, WL m MSL, turbidity design/average NTU, pH, alkalinity, free chlorine) plus its main size and the
 * items it adds / removes.
 */
export function designChain(r) {
  if (!r?.demand || !r.process) return { stages: [], profile: [] };
  const P = r.process, q = r.quality || {}, D = r.demand;
  const qv = (k, i = 1) => num(q.rows?.find((x) => x.key === k)?.[i === 1 ? 'des' : 'avg']);
  const Qd = D.Qd;
  const own = num(D.inputs?.ownUse) ?? 5;
  const lvl = Object.fromEntries((r.hyd?.units || []).map((u) => [u.key, u]));
  let st = { Q: Qd, wl: null, turb: q.turbMax ?? qv('turb'), turbAvg: q.turbAvg ?? qv('turb', 0), pH: qv('pH'), alk: qv('alk'), cl: 0, do: null };
  const stages = [];
  const push = (key, mod, label, change, extra = {}) => {
    st = { ...st, ...change };
    stages.push({ key, mod, label, out: { ...st }, ...extra });
  };
  const fx = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
  push('raw', 'quality', 'Raw water source', {}, { size: `${fx(q.turbMax)} NTU peak · pH ${fx(st.pH, 1)} · alk ${fx(st.alk)} mg/L`, adds: [], removes: [] });
  // intake + raw-water pumping
  if (r.intake) {
    push('intake', 'intake', 'Intake & raw-water pumping', { Q: (r.intake.Q || 0) * 86400 || Qd, wl: num(r.intake.inletWL) ?? lvl.inlet?.wl ?? null },
      { size: `${r.intake.pumps?.dn ? 'DN' + r.intake.pumps.dn + ' rising main' : ''}${r.intake.kw ? ` · ${fx(r.intake.kw)} kW pumps` : ''}`, adds: [], removes: ['Floating debris (screens)'] });
  }
  if (r.aeration && r.aeration.enabled !== false && P.has?.aeration) {
    push('aeration', 'aeration', 'Aeration', { do: num(r.aeration.Ce) }, { size: `${fx(r.aeration.area)} m² · ${fx(r.aeration.totalH, 1)} m fall`, adds: ['Oxygen'], removes: ['CO₂, H₂S', 'Fe²⁺/Mn²⁺ oxidised'] });
  }
  const conv = P.conv, ssf = P.ssf;
  if (r.sed && r.sed.enabled && r.sed.plain) {
    push('presed', 'sed', 'Plain sedimentation', { turb: num(r.sed.settledPeak) ?? st.turb, turbAvg: num(r.sed.settledAvg) ?? st.turbAvg, wl: lvl.sed?.wl ?? st.wl },
      { size: `${r.sed.N} × ${fx(r.sed.L, 1)} × ${fx(r.sed.W, 1)} m`, adds: [], removes: ['Silt / sand'] });
  }
  if (r.coag && P.has?.coag) {
    const c = r.coag;
    push('coag', 'coag', 'Chemical dosing', { pH: num(c.pH1) ?? st.pH, alk: num(c.alk1) ?? st.alk },
      { size: `${fx(c.Ddes)} mg/L ${c.coag?.label || 'coagulant'} · ${fx(c.kgDes)} kg/d`, adds: [`${c.coag?.label || 'Coagulant'} ${fx(c.Ddes)} mg/L`, ...(c.limeDose > 0 ? [`Lime ${fx(c.limeDose, 1)} mg/L`] : []), ...(c.pac ? [`PAC ${fx(c.pac.dose)} mg/L`] : [])], removes: [] });
  }
  if (r.rapidmix && r.rapidmix.enabled !== false && P.has?.rapidmix) {
    const m = r.rapidmix;
    push('rapidmix', 'rapidmix', 'Rapid mixing', { wl: lvl.rm?.wlOut ?? st.wl }, { size: `G ${fx(m.Gact ?? m.G)} s⁻¹ · ${fx(m.tAct ?? m.t, 1)} s`, adds: [], removes: [] });
  }
  if (r.floc && r.floc.enabled !== false && P.has?.floc) {
    const f = r.floc;
    push('floc', 'floc', 'Flocculation', { wl: lvl.floc?.wlOut ?? st.wl }, { size: `${fx(f.ttot)} min · Gt ${fx(f.Gt)}`, adds: [], removes: [] });
  }
  if (r.sed && r.sed.enabled && !r.sed.plain && conv) {
    const s = r.sed;
    push('sed', 'sed', 'Sedimentation', { turb: num(s.settledPeak) ?? st.turb, turbAvg: num(s.settledAvg) ?? st.turbAvg, wl: lvl.sed?.wl ?? st.wl, Q: st.Q - (num(r.sludge?.sedVol) || 0) },
      { size: `${s.N} × ${fx(s.L, 1)} × ${fx(s.W, 1)} m · SOR ${fx(s.sorAct, 1)} m³/m²·d`, adds: [], removes: [`Sludge ${fx(r.sludge?.sedDS)} kg DS/d`] });
  }
  if (r.filt && r.filt.enabled !== false) {
    const f = r.filt;
    const wash = num(f.bwDailyM3) || 0;
    const recovered = P.recovery === 'yes' || P.recovery === true;
    push('filt', 'filt', ssf ? 'Slow sand filtration' : 'Rapid gravity filtration', { turb: num(f.filteredPeak) ?? st.turb, turbAvg: num(f.filteredAvg) ?? st.turbAvg, wl: lvl.filt?.wl ?? st.wl, Q: st.Q - (recovered ? 0 : wash) },
      { size: `${f.N} × ${fx(f.Af, 1)} m² · ${fx(f.rate, 2)} m/h`, adds: [], removes: [ssf ? 'Schmutzdecke (scraped)' : `Wash water ${fx(wash)} m³/d${recovered ? ' (recovered)' : ''}`] });
  }
  if (r.dis) {
    const d = r.dis;
    push('dis', 'dis', 'Disinfection', { cl: num(d.C) ?? 0, pH: num(r.stab?.pHafterCl) ?? st.pH, alk: num(r.stab?.alkAfterCl) ?? st.alk, wl: lvl.ct?.wl ?? st.wl },
      { size: `${fx(d.totDose, 1)} mg/L Cl₂ · ${fx(d.V)} m³ · CT ×${fx(d.ratio, 1)}`, adds: [`Chlorine ${fx(d.totDose, 1)} mg/L`], removes: ['Pathogens (CT)'] });
  }
  if (r.stab && r.stab.apply !== false && P.postLime !== 'no') {
    const s = r.stab;
    push('stab', 'stab', 'pH correction', { pH: num(s.pHfinal) ?? st.pH, alk: num(s.final?.alkF) ?? st.alk }, { size: `Lime ${fx(s.lime, 1)} mg/L · LSI ${fx(s.final?.LSI, 2)}`, adds: [`Lime ${fx(s.lime, 1)} mg/L`], removes: [] });
  }
  if (r.storage) {
    push('cwr', 'storage', 'Clear water reservoir', { wl: lvl.cwr?.wl ?? st.wl, Q: Qd / (1 + own / 100) }, { size: `${fx(r.storage.V)} m³ (${fx(r.storage.inputs?.cwrHours, 1)} h)`, adds: [], removes: [] });
  }
  const SHORT = { raw: 'Raw water', intake: 'Intake', aeration: 'Aerator', presed: 'Plain sed.', coag: 'Dosing', rapidmix: 'Rapid mix', floc: 'Floc.', sed: 'Sedim.', filt: 'Filters', dis: 'Disinf.', stab: 'pH corr.', cwr: 'CWR' };
  const profile = stages.map((s) => ({ key: s.key, label: SHORT[s.key] || s.label, name: s.label, ...s.out }));
  return { stages, profile, product: Qd / (1 + own / 100) };
}

/** key result of each unit, in train order, for the impact ripple and what-if */
const K = (stage, label, get, unit, dp = 1) => ({ stage, label, get, unit, dp });
export const KPI_DEFS = [
  K('demand', 'Plant capacity', (r) => r.demand?.Qd, 'm³/d', 0),
  K('demand', 'Peak-hour flow', (r) => r.demand?.Qh, 'm³/h', 0),
  K('quality', 'Design raw turbidity', (r) => r.quality?.turbMax, 'NTU', 0),
  K('quality', 'Water temperature', (r) => r.quality?.T, '°C', 1),
  K('intake', 'Raw-water pump power', (r) => r.intake?.kw, 'kW', 0),
  K('intake', 'Rising main', (r) => r.intake?.pumps?.dn, 'DN', 0),
  K('intake', 'Intake conduit', (r) => r.intake?.cdn, 'DN', 0),
  K('intake', 'Pump head', (r) => r.intake?.pumps?.H, 'm', 1),
  K('aeration', 'Aerator area', (r) => (r.aeration?.enabled === false ? null : r.aeration?.area), 'm²', 1),
  K('coag', 'Design coagulant dose', (r) => r.coag?.Ddes, 'mg/L', 1),
  K('coag', 'Coagulant use', (r) => r.coag?.kgDes, 'kg/d', 0),
  K('coag', 'Lime for coagulation', (r) => r.coag?.limeDose, 'mg/L', 1),
  K('coag', 'Coagulation pH', (r) => r.coag?.pH1, '', 2),
  K('rapidmix', 'Velocity gradient G', (r) => r.rapidmix?.Gact ?? r.rapidmix?.G, 's⁻¹', 0),
  K('rapidmix', 'Mixer head loss', (r) => r.rapidmix?.headloss, 'm', 2),
  K('floc', 'Flocculation time', (r) => r.floc?.ttot, 'min', 1),
  K('floc', 'Gt', (r) => r.floc?.Gt, '', 0),
  K('floc', 'Flocculator length', (r) => r.floc?.L, 'm', 1),
  K('sed', 'Basin area (each)', (r) => (r.sed?.enabled ? r.sed?.A : null), 'm²', 0),
  K('sed', 'Detention time', (r) => (r.sed?.enabled ? r.sed?.hrt : null), 'h', 2),
  K('sed', 'Settled turbidity (peak)', (r) => (r.sed?.enabled ? r.sed?.settledPeak : null), 'NTU', 2),
  K('filt', 'Number of filters', (r) => r.filt?.N, '', 0),
  K('filt', 'Filter bed area', (r) => r.filt?.Af, 'm²', 1),
  K('filt', 'Filtration rate', (r) => r.filt?.rate, 'm/h', 2),
  K('filt', 'Filter run (peak)', (r) => r.filt?.runPeak, 'h', 1),
  K('filt', 'Wash water', (r) => r.filt?.bwPct, '%', 2),
  K('filt', 'Filtered turbidity (peak)', (r) => r.filt?.filteredPeak, 'NTU', 2),
  K('dis', 'Chlorine dose', (r) => r.dis?.totDose, 'mg/L', 2),
  K('dis', 'Contact tank volume', (r) => r.dis?.V, 'm³', 0),
  K('dis', 'CT ratio (provided / required)', (r) => r.dis?.ratio, '', 2),
  K('stab', 'Lime for stabilisation', (r) => r.stab?.lime, 'mg/L', 1),
  K('stab', 'Final pH', (r) => r.stab?.pHfinal, '', 2),
  K('stab', 'Final LSI', (r) => r.stab?.final?.LSI, '', 2),
  K('storage', 'Clear water reservoir', (r) => r.storage?.V, 'm³', 0),
  K('storage', 'Treated-water pump power', (r) => r.storage?.kw, 'kW', 0),
  K('sludge', 'Dry solids (design)', (r) => r.sludge?.dsDes, 'kg/d', 0),
  K('sludge', 'Thickener diameter', (r) => r.sludge?.thick?.D, 'm', 1),
  K('hyd', 'Inlet chamber level', (r) => r.hyd?.inletWL, 'm MSL', 2),
  K('hyd', 'Total head through plant', (r) => r.hyd?.totalHead, 'm', 2),
  K('layout', 'Site area', (r) => r.layout?.ha, 'ha', 2),
  K('energy', 'Maximum demand', (r) => r.energy?.md, 'kW', 0),
  K('energy', 'Specific energy', (r) => r.energy?.spec, 'kWh/m³', 3),
  K('cost', 'Capital cost', (r) => (r.cost?.capex ? r.cost.capex / 1e6 : null), 'LKR M', 1),
  K('cost', 'O&M cost', (r) => (r.cost?.omTot ? r.cost.omTot / 1e6 : null), 'LKR M/yr', 1),
  K('cost', 'Full cost of water', (r) => r.cost?.fullPerM3, 'LKR/m³', 1),
];
export const KPI_ORDER = ['demand', 'quality', 'source', 'process', 'intake', 'aeration', 'coag', 'rapidmix', 'floc', 'sed', 'filt', 'dis', 'stab', 'storage', 'sludge', 'hyd', 'layout', 'energy', 'cost', 'compliance'];

/** snapshot of all key results + check status per module */
export function kpiSnapshot(r) {
  const vals = KPI_DEFS.map((k, i) => { let v = null; try { v = num(k.get(r)); } catch { v = null; } return { i, v }; });
  const status = {};
  for (const c of r?.checks || []) {
    const s = (status[c.module] ||= { fail: 0, warn: 0 });
    if (c.status === 'fail') s.fail++; else if (c.status === 'warn') s.warn++;
  }
  return { vals, status };
}

/** differences between two snapshots, in train order */
export function diffSnapshots(a, b, { rel = 0.002 } = {}) {
  if (!a || !b) return { items: [], status: [] };
  const out = [];
  KPI_DEFS.forEach((k, i) => {
    const x = a.vals[i]?.v, y = b.vals[i]?.v;
    if (x === y) return;
    if (x === null || y === null) { out.push({ ...k, from: x, to: y, pct: null }); return; }
    const d = y - x;
    const scale = Math.max(Math.abs(x), Math.abs(y), 1e-9);
    if (Math.abs(d) / scale < rel && Math.abs(d) < 10 ** -k.dp / 2) return;
    if (Math.abs(d) < 10 ** -k.dp / 2) return;
    if (Math.abs(x) > 1e-9 && Math.abs(d / x) < 0.001) return;
    out.push({ ...k, from: x, to: y, pct: Math.abs(x) > 1e-9 ? (d / Math.abs(x)) * 100 : null });
  });
  const mods = new Set([...Object.keys(a.status), ...Object.keys(b.status)]);
  const st = [];
  for (const m of mods) {
    const p = a.status[m] || { fail: 0, warn: 0 }, n = b.status[m] || { fail: 0, warn: 0 };
    if (p.fail !== n.fail || p.warn !== n.warn) st.push({ stage: m, fail: [p.fail, n.fail], warn: [p.warn, n.warn] });
  }
  const ord = (m) => { const i = KPI_ORDER.indexOf(m); return i < 0 ? 99 : i; };
  out.sort((u, v) => ord(u.stage) - ord(v.stage));
  st.sort((u, v) => ord(u.stage) - ord(v.stage));
  return { items: out, status: st };
}
