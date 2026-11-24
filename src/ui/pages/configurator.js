// Plant configurator (Process selection page): build the treatment train by clicking illustrated cards, one row per
// decision, with the NWSDB D3 recommendation and suitability shown on every option. The live process flow diagram
// at the top updates immediately; every downstream unit page follows the choices.
import { PROC as D3PROC, BLEACH, DIRECT, SSF } from '../../core/d3.js';
import { esc, fmt } from '../../core/util.js';
import { computeAll } from '../../engine/index.js';
import { DEFAULTS as PROC_DEFAULTS, LABELS } from '../../engine/process.js';
import { h, icon } from '../dom.js';
import { ART } from '../draw/art.js';
import { pfdBlock } from '../draw/pfd.js';
import { locate } from '../locate.js';
import { card, checksTable, kpis, notes, statusBadge, table } from '../results.js';
import { navigate, setInput, store } from '../store.js';
import { choiceCards } from '../widgets.js';
import { qWorst } from '../../engine/quality.js';

/** what the expert system would choose with every decision on Auto */
let recCache = { key: null, val: null };
function recommendation() {
  const p = store.project;
  const key = JSON.stringify({ ...p.inputs, process: null });
  if (recCache.key === key) return recCache.val;
  const clone = JSON.parse(JSON.stringify(p));
  clone.inputs.process = { ...PROC_DEFAULTS, recovery: p.inputs.process?.recovery ?? 'yes' };
  let val = null;
  try { const r = computeAll(clone); val = { ...r.process, postLimeApplied: !!r.stab?.apply }; } catch { val = null; }
  recCache = { key, val };
  return val;
}

const SHORT = {
  route: { conventional: 'Conventional', direct: 'Direct filtration', ssf: 'Slow sand filtration' },
  aeration: { none: 'No aeration', cascade: 'Cascade', tray: 'Multiple-tray' },
  rapidMix: { jump: 'Hydraulic jump', mechanical: 'Mechanical flash mixer' },
  floc: { hbaffle: 'Around-the-end baffles', vbaffle: 'Over-and-under baffles', paddle: 'Mechanical paddles' },
  clarifier: { rect: 'Rectangular', circ: 'Circular', tube: 'Tube settlers', daf: 'Flotation (DAF)' },
  filter: { rsf: 'Rapid sand', dual: 'Dual media' },
  disinfectant: { gas: 'Chlorine gas', naocl: 'Sodium hypochlorite', hth: 'HTH (Ca hypochlorite)', bleach: 'Bleaching powder' },
  sludge: { beds: 'Drying beds', thickener: 'Thickener + beds', mechanical: 'Thickener + mechanical dewatering' },
};
const yn = (v) => (v === 'yes' ? 'Yes' : 'No');

function stageRows(r, rec) {
  const q = r.quality;
  const Q = r.demand.Qd;
  const pr = r.process;
  const inp = store.project.inputs;
  const tmax = q.turbMax, colour = qWorst(q, 'colour'), algae = qWorst(q, 'algae'), fe = qWorst(q, 'fe'), mn = qWorst(q, 'mn'), tc = qWorst(q, 'tc'), mclr = qWorst(q, 'mclr') || 0;
  const gw = inp.setup?.sourceType === 'groundwater';
  const dis = inp.dis || {};
  const estKgD = ((+dis.demand || 1.2) + (+dis.residual || 0.8)) * Q / 1000;
  const hypoLimit = (BLEACH.hypoLimitLh * 0.01 * 24) / 1.25;
  const qTrain = Q / 86400 / Math.max(1, r.demand.nTrains);
  const lsiNoLime = r.stab?.s2?.LSI;
  const polymer = +(inp.coag?.polymer || 0) > 0;
  const autoCard = (k, resolved, labelMap) => ({ key: 'auto', label: `Auto → ${labelMap ? labelMap[resolved] || resolved : resolved}`, art: ART.auto, desc: 'Expert system + NWSDB D3 rules decide from raw-water quality and capacity', tip: 'Recommended – follows changes in raw water quality and capacity automatically' });
  const ynCards = (k, artYes, rv, badNo, badYes, descYes, descNo) => [
    autoCard(k, yn(rv)),
    { key: 'yes', label: 'Yes', art: artYes, desc: descYes, rec: rv === 'yes', bad: badYes || null },
    { key: 'no', label: 'No', art: ART.noBox, desc: descNo, rec: rv === 'no', bad: badNo || null },
  ];
  const rows = [
    { sec: 'Route', n: 1, sub: 'the backbone of the plant – decides which units exist' },
    { k: 'route', l: 'Treatment route', d: 'Conventional, direct filtration or slow sand filtration (D3 Fig 4-3/4-4, §4.3)', opts: [
      autoCard('route', rec?.route, SHORT.route),
      { key: 'conventional', label: 'Conventional', art: ART.conventional, desc: 'Coagulation → flocculation → sedimentation → rapid filtration', rec: rec?.route === 'conventional' },
      { key: 'direct', label: 'Direct filtration', art: ART.direct, desc: `No settling; raw ≤ ${DIRECT.turbMax} NTU and colour ≤ ${DIRECT.colourMax}`, rec: rec?.route === 'direct', bad: tmax > DIRECT.turbMax || colour > DIRECT.colourMax ? `Raw ${tmax} NTU / ${colour} Hazen exceeds D3 §5.9.11` : null },
      { key: 'ssf', label: 'Slow sand filtration', art: ART.ssf, desc: `No chemicals; small schemes, ≤ ${SSF.turbPretreat} NTU, colour ≤ 25, algae ≤ 200/mL`, rec: rec?.route === 'ssf', bad: tmax > 50 ? `Raw ${tmax} NTU > 50 NTU (D3 §5.12)` : colour > 25 || algae > 200 ? 'Colour / algae above D3 Table 5-35' : Q > 20000 ? 'Large area for this capacity' : null },
    ] },
    { sec: 'Pre-treatment', n: 2, sub: 'conditioning the raw water before coagulation' },
    { k: 'presed', l: pr.ssf ? 'Plain sedimentation / roughing' : 'Pre-sedimentation', d: 'Removes silt & sand during monsoon peaks (> 750 NTU, D3 Table 4-5)', opts: ynCards('presed', ART.presedYes, rec?.presed, tmax > 750 ? `Peaks ${tmax} NTU > 750 – essential` : pr.ssf && tmax > 10 ? 'SSF influent must be < 10 NTU' : null, null, 'Plain settling basin ahead of the plant', 'Raw water goes straight to treatment') },
    ...(pr.ssf && pr.presed === 'yes' ? [{ k: 'presedType', l: 'Pre-treatment type', d: 'Slow sand filter influent should be < 10 NTU (D3 §5.12.3, §5.13)', opts: [
      autoCard('presedType', rec?.presedKind || pr.presedKind, { plain: 'Plain sedimentation', roughing: 'Roughing filters' }),
      { key: 'roughing', label: 'Roughing filters', art: ART.roughing, desc: 'Horizontal-flow gravel filters, 0.3–1.5 m/h, raw water 10–150 NTU (D3 §5.13)', rec: (rec?.presedKind || pr.presedKind) === 'roughing', bad: tmax > 150 ? `Peaks ${tmax} NTU > 150 NTU` : null },
      { key: 'plain', label: 'Plain sedimentation', art: ART.presedYes, desc: 'Settling basin, 4–6 h detention (D3 Table 5-20)', rec: (rec?.presedKind || pr.presedKind) === 'plain' },
    ] }] : []),
    { k: 'aeration', l: 'Aeration', d: 'Fe / Mn oxidation, CO₂ & H₂S stripping, DO (D3 §5.3)', opts: [
      autoCard('aeration', rec?.aeration, SHORT.aeration),
      { key: 'none', label: 'None', art: ART.none, desc: 'Surface water with adequate DO', rec: rec?.aeration === 'none', bad: gw && (fe > 0.3 || mn > 0.1) ? `Groundwater with Fe ${fe} / Mn ${mn} mg/L` : null },
      { key: 'cascade', label: 'Cascade aerator', art: ART.cascade, desc: '4–6 drops of 0.3–0.6 m; robust, larger plants', rec: rec?.aeration === 'cascade' },
      { key: 'tray', label: 'Multiple-tray aerator', art: ART.tray, desc: '3–5 trays with coke / gravel; compact', rec: rec?.aeration === 'tray' },
    ] },
    { k: 'prechlor', l: 'Pre-chlorination', d: 'Coliforms > 5,000, Fe > 1 mg/L, algae, Mn (D3 Table 4-5); THM risk with TOC', opts: ynCards('prechlor', ART.prechlorYes, rec?.prechlor, tc > 5000 || fe > 1.0 ? 'Essential for this raw water (D3 Table 4-5)' : null, qWorst(q, 'toc') > 4 ? `TOC ${qWorst(q, 'toc')} mg/L – THM risk (D3 §6.10)` : null, 'Oxidant dosed at the inlet', 'Chlorine only after filtration') },
    { k: 'pac', l: 'Powdered activated carbon', d: 'Algae, taste & odour, microcystin (D3 §5.2.3): 2–20 mg/L, ≥ 15 min contact', opts: ynCards('pac', ART.pacYes, rec?.pac, algae > 2000 || mclr > 1 ? 'Essential for algae / toxins (D3 Table 4-5)' : null, null, 'Slurry dosed at the plant head', 'No adsorption step') },
  ];
  if (!pr.ssf) {
    rows.push({ sec: 'Coagulation & flocculation', n: 3, sub: 'destabilise the particles and grow settleable flocs' },
      { k: 'rapidMix', l: 'Rapid mixing', d: 'G 500–1,000 s⁻¹ (≤ 3,500), t < 60 s (D3 §5.5, Table 5-13)', opts: [
        autoCard('rapidMix', rec?.rapidMix, SHORT.rapidMix),
        { key: 'jump', label: 'Hydraulic jump / Parshall', art: ART.jump, desc: 'No moving parts; uses available head (Annex C.1)', rec: rec?.rapidMix === 'jump' },
        { key: 'mechanical', label: 'Mechanical flash mixer', art: ART.mechanical, desc: 'Adjustable G; ≥ 2 tanks, 30–60 s (Annex C.2)', rec: rec?.rapidMix === 'mechanical' },
      ] },
      { k: 'floc', l: 'Flocculator', d: 'G 10–75 s⁻¹ tapered, t ≥ 20 min, 3–6 stages (D3 §5.6)', opts: [
        autoCard('floc', rec?.floc, SHORT.floc),
        { key: 'hbaffle', label: 'Around-the-end baffles', art: ART.hbaffle, desc: 'Horizontal flow; simple, long shallow channels', rec: rec?.floc === 'hbaffle', bad: qTrain < 0.068 ? `${fmt(qTrain * 1000, 0)} L/s per train – spacing < 0.45 m (D3 Table 5-15)` : null },
        { key: 'vbaffle', label: 'Over-and-under baffles', art: ART.vbaffle, desc: 'Vertical flow; compact, deeper channels', rec: rec?.floc === 'vbaffle', bad: qTrain < 0.068 ? `${fmt(qTrain * 1000, 0)} L/s per train – spacing < 0.45 m (D3 Table 5-15)` : null },
        { key: 'paddle', label: 'Mechanical paddles', art: ART.paddle, desc: 'Adjustable G over the flow range; small and large plants', rec: rec?.floc === 'paddle' },
      ] });
  }
  rows.push({ sec: 'Clarification & filtration', n: pr.ssf ? 3 : 4, sub: 'remove the flocs and polish the water' });
  if (pr.conv) {
    rows.push({ k: 'clarifier', l: 'Clarifier', d: 'SOR ≤ 1.0 m/h, 2–4 h, ≥ 2 basins (D3 §5.7, Table 5-20)', opts: [
      autoCard('clarifier', rec?.clarifier || pr.clarifier, SHORT.clarifier),
      { key: 'rect', label: 'Rectangular horizontal-flow', art: ART.rect, desc: 'Robust to monsoon shocks; common walls with flocculator', rec: (rec?.clarifier || 'rect') === 'rect' },
      { key: 'circ', label: 'Circular radial-flow', art: ART.circ, desc: 'Rotating scraper; good sludge removal', rec: rec?.clarifier === 'circ' },
      { key: 'tube', label: 'Tube settlers', art: ART.tube, desc: '2.5–7.5 m/h – for constrained sites (D3 §5.7.6)', rec: rec?.clarifier === 'tube' },
      { key: 'daf', label: 'Dissolved air flotation', art: ART.daf, desc: 'Algae-laden reservoir water ≤ 100 NTU; 5–15 m/h (D3 §5.7.8)', rec: rec?.clarifier === 'daf', bad: tmax > 100 ? `Peaks ${tmax} NTU > 100 NTU (D3 §5.7.8)` : null },
    ] });
  }
  if (!pr.ssf) {
    rows.push({ k: 'filter', l: 'Rapid gravity filter', d: '5–15 m/h, air-scour + water backwash (D3 §5.8–5.9)', opts: [
      autoCard('filter', rec?.filter, SHORT.filter),
      { key: 'rsf', label: 'Rapid sand (single medium)', art: ART.rsf, desc: 'ES 0.45–0.55 mm, 0.6–1.0 m – standard NWSDB practice', rec: rec?.filter === 'rsf' },
      { key: 'dual', label: 'Dual media', art: ART.dual, desc: 'Anthracite over sand – longer runs, higher rates', rec: rec?.filter === 'dual' },
    ] });
  } else rows.push({ k: '_ssf', l: 'Slow sand filters', d: '0.1–0.4 m/h, ≥ 2 units, n = 15√Q (D3 §5.12)', fixed: h('div', { class: 'cfg-fixed' }, h('div', { class: 'choice-art', html: ART.ssf }), h('div', null, h('b', null, 'Slow sand filters'), h('div', { class: 'small muted' }, 'Fixed by the slow-sand route – size them on the Filtration page.'))) });
  rows.push({ sec: 'Disinfection & stabilisation', n: pr.ssf ? 4 : 5, sub: 'make the water safe and non-corrosive' },
    { k: 'disinfectant', l: 'Disinfectant', d: `CT, residual 0.5–0.8 mg/L, ≥ 20 min (D3 §6.2–6.5) – demand ≈ ${fmt(estKgD, 0)} kg/d`, opts: [
      autoCard('disinfectant', rec?.disinfectant, SHORT.disinfectant),
      { key: 'gas', label: 'Chlorine gas', art: ART.gas, desc: 'Vacuum chlorinators, 1 duty + 1 standby, ≥ 30 days cylinders', rec: rec?.disinfectant === 'gas' },
      { key: 'bleach', label: 'Bleaching powder', art: ART.bleach, desc: '1 % solution, small schemes (≤ 42 L/h)', rec: rec?.disinfectant === 'bleach', bad: estKgD > hypoLimit ? `≈ ${fmt(estKgD, 0)} kg/d > hypochlorination limit (D3 §6.4.3)` : null },
      { key: 'naocl', label: 'Sodium hypochlorite', art: ART.naocl, desc: 'Liquid; simple handling, decays in storage', rec: rec?.disinfectant === 'naocl', bad: estKgD > hypoLimit * 3 ? 'Large liquid volumes at this capacity' : null },
      { key: 'hth', label: 'Calcium hypochlorite (HTH)', art: ART.hth, desc: '65–70 % granules / tablets', rec: rec?.disinfectant === 'hth', bad: 'Not readily available in Sri Lanka (D3)' },
    ] },
    { k: 'postLime', l: 'Post-lime stabilisation', d: 'pH 6.5–8.5, LSI > −1.5, CCPP > −5 (D3 Ch 8)', opts: [
      autoCard('postLime', rec?.postLimeApplied ? 'Yes' : 'No'),
      { key: 'yes', label: 'Yes – lime after disinfection', art: ART.limeYes, desc: 'Raises pH / alkalinity, protects mains', rec: !!rec?.postLimeApplied },
      { key: 'no', label: 'No', art: ART.noBox, desc: 'Water already balanced', rec: rec && !rec.postLimeApplied, bad: Number.isFinite(lsiNoLime) && lsiNoLime < -1.5 ? `LSI ${fmt(lsiNoLime, 1)} without lime – corrosive` : null },
    ] },
    { sec: 'Residuals', n: pr.ssf ? 5 : 6, sub: 'sludge and wash water (D3 §5.14)' },
    { k: 'sludge', l: 'Sludge treatment', d: `${fmt(r.sludge?.dsDes || 0, 0)} kg DS/d design (Method 02)`, opts: [
      autoCard('sludge', rec?.sludge, SHORT.sludge),
      { key: 'beds', label: 'Drying beds', art: ART.beds, desc: '100–300 kg DS/m²·yr; open only < 2,200 mm rain', rec: rec?.sludge === 'beds', bad: (r.sludge?.rain || 0) > 2200 ? `Rainfall ${fmt(r.sludge.rain, 0)} mm – covered beds needed` : Q > 20000 ? 'Very large bed area at this capacity' : null },
      { key: 'thickener', label: 'Thickener + beds', art: ART.thickener, desc: 'Gravity thickening, 20–80 kg/m²·d', rec: rec?.sludge === 'thickener' },
      { key: 'mechanical', label: 'Thickener + mechanical dewatering', art: ART.mechanical_dw, desc: 'Belt press / centrifuge – large plants, wet zone', rec: rec?.sludge === 'mechanical' },
    ] });
  if (!pr.ssf) {
    rows.push({ k: 'recovery', l: 'Wash-water recovery', d: 'Recycle settled wash water ≤ 10 % of inflow (D3 §5.14)', opts: [
      { key: 'yes', label: 'Recover & recycle', art: ART.recoveryYes, desc: 'Saves 2–5 % of the raw water', rec: Q > 4500 && !polymer, bad: polymer ? 'Not with polymer (D3 §5.14)' : Q <= 4500 ? 'Only justified > 4,500 m³/d (D3)' : null },
      { key: 'no', label: 'Discharge', art: ART.noBox, desc: 'Wash water to drain / lagoon (CEA limits)', rec: Q <= 4500 || polymer },
    ] });
  }
  return rows;
}

function configurator(r) {
  const rec = recommendation();
  const inp = store.project.inputs.process || {};
  const wrap = h('div', { class: 'cfg' });
  for (const row of stageRows(r, rec)) {
    if (row.sec) { wrap.append(h('div', { class: 'cfg-sec' }, h('span', { class: 'cfg-n' }, row.n), h('b', null, row.sec), h('span', { class: 'muted' }, ' – ' + row.sub))); continue; }
    const cur = row.k === 'recovery' ? (inp.recovery ?? 'yes') : (inp[row.k] ?? 'auto');
    const resolved = row.k === 'postLime' ? (r.stab?.apply ? 'yes' : 'no') : row.k === 'recovery' ? cur : r.process[row.k];
    const chosen = row.opts?.find((o) => o.key === (cur === 'auto' ? resolved : cur));
    const warn = chosen?.bad;
    wrap.append(h('div', { class: 'cfg-row' + (warn ? ' has-warn' : ''), 'data-k': row.k },
      h('div', { class: 'cfg-l' }, h('div', { class: 'cfg-t' }, row.l), h('div', { class: 'cfg-d' }, row.d),
        row.opts ? h('div', { class: 'cfg-now' }, icon(warn ? 'warn' : 'ok'), h('span', null, cur === 'auto' ? 'Auto: ' : 'Selected: ', h('b', null, chosen?.label?.replace(/^Auto → /, '') || resolved || '–'))) : null,
        warn ? h('div', { class: 'cfg-warn' }, warn) : null),
      row.fixed || choiceCards(row.opts, cur, (v) => setInput(['process', row.k], v, { immediate: true }))));
  }
  return wrap;
}

/** report version: decisions table instead of the interactive cards */
function decisionsTable(r) {
  const rec = recommendation();
  const inp = store.project.inputs.process || {};
  const rows = stageRows(r, rec).filter((x) => x.k && x.opts).map((row) => {
    const cur = row.k === 'recovery' ? (inp.recovery ?? 'yes') : (inp[row.k] ?? 'auto');
    const resolved = row.k === 'postLime' ? (r.stab?.apply ? 'yes' : 'no') : row.k === 'recovery' ? cur : r.process[row.k];
    const chosen = row.opts.find((o) => o.key === (cur === 'auto' ? resolved : cur));
    const recO = row.opts.find((o) => o.rec && o.key !== 'auto');
    return { d: row.l, sel: chosen?.label?.replace(/^Auto → /, '') || resolved, how: cur === 'auto' ? 'Auto (expert system)' : 'Designer override', rec: recO?.label || '–', note: chosen?.bad || row.d };
  });
  return table([{ k: 'd', l: 'Decision' }, { k: 'sel', l: 'Selected' }, { k: 'how', l: 'Basis' }, { k: 'rec', l: 'D3 / expert recommendation' }, { k: 'note', l: 'Criteria / remark', v: (x) => h('span', { class: 'small' }, x.note) }], rows);
}

export const process = {
  id: 'process', title: 'Plant configurator', sub: 'Choose the components of the treatment plant – one click per decision; the recommended option is marked on every row', icon: 'workflow', group: 'Design basis', mod: 'process', layout: 'full', live: true,
  fields: [['route', 'Treatment route'], ['presed', 'Pre-sedimentation'], ['aeration', 'Aeration'], ['prechlor', 'Pre-chlorination'], ['pac', 'Powdered activated carbon'], ['rapidMix', 'Rapid mixing'], ['floc', 'Flocculator'], ['clarifier', 'Clarifier'], ['filter', 'Filter'], ['disinfectant', 'Disinfectant'], ['postLime', 'Post-lime stabilisation'], ['sludge', 'Sludge treatment'], ['recovery', 'Wash-water recovery']].map(([k, l]) => ({ k, l, t: 'sel' })),
  report(r) {
    const pr = r.process;
    return [
      card('Process flow diagram', pfdBlock(r)),
      card('Selected treatment train', decisionsTable(r), { flush: true }),
      notes(pr.notes),
      card('Why this train? (decision log)', h('div', { class: 'notes', style: { margin: 0 } }, pr.reasons.map((x) => h('div', { class: 'note info' }, icon('bulb'), h('div', { html: `<b>${esc(x.unit)}.</b> ${esc(x.txt)}` }))))),
      card(`NWSDB D3 ${pr.typical.fig} – ${pr.typical.cat}`, h('div', { class: 'small', html: `<ol style="line-height:1.8;margin:0;padding-left:18px">${pr.typical.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` })),
      card('NWSDB D3 Table 4-5 – essential processes', table([{ k: 'char', l: 'Characteristic', v: (x) => `${x.char} ${x.band}` }, { k: 'E', l: 'Essential', v: (x) => h('span', { class: 'small' }, x.E.map((q) => D3PROC[q]).join(', ') || '—') }], pr.t45.rows), { flush: true }),
    ];
  },
  renderFull(r) {
    const pr = r.process;
    const anyManual = Object.entries(store.project.inputs.process || {}).some(([k, v]) => k !== 'recovery' && v !== 'auto');
    const bad = (pr.checks || []).filter((c) => c.status === 'fail' || c.status === 'warn');
    return [
      kpis([
        { label: 'Treatment route', value: SHORT.route[pr.route], icon: 'workflow', accent: true, sub: LABELS.route[pr.route] },
        { label: 'Units in the train', value: pr.train.length, sub: pr.train.map((t) => t.label).slice(0, 4).join(' · ') + (pr.train.length > 4 ? ' …' : '') },
        { label: 'Design raw turbidity', value: r.quality.turbMax, unit: 'NTU', sub: r.quality.turbClass },
        { label: 'Plant capacity', value: fmt(r.demand.Qd, 0), unit: 'm³/d', sub: r.demand.basis === 'capacity' ? 'specified capacity' : 'from demand forecast' },
      ]),
      card('Your plant – live process flow diagram', pfdBlock(r), { sub: 'updates as you choose · click a unit to design it', actions: anyManual ? [h('button', { class: 'btn sm', onclick: () => { for (const k of Object.keys(PROC_DEFAULTS)) if (k !== 'recovery') setInput(['process', k], 'auto', { immediate: false }); setInput(['process', 'route'], 'auto', { immediate: true }); } }, icon('reset'), 'All decisions to Auto')] : null }),
      bad.length ? card('Process checks needing attention', checksTable(bad, { locate, module: 'process' }), { flush: true }) : null,
      notes(pr.notes),
      card('Build your treatment train', configurator(r), { sub: 'green badge = NWSDB D3 / expert-system recommendation · amber = outside D3 guidance for this raw water' }),
      card('Why this train? (decision log)', h('div', { class: 'notes', style: { margin: 0 } }, pr.reasons.map((x) => h('div', { class: 'note info' }, icon('bulb'), h('div', { html: `<b>${esc(x.unit)}.</b> ${esc(x.txt)}` }))))),
      h('div', { class: 'grid2' },
        card(`NWSDB D3 ${pr.typical.fig} – ${pr.typical.cat}`, h('div', { class: 'small', html: `<ol style="line-height:1.8;margin:0;padding-left:18px">${pr.typical.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${pr.typical.alt ? `<p style="margin:8px 0 0"><b>Alternative:</b> ${esc(pr.typical.alt.join(' → '))}</p>` : ''}` })),
        card('NWSDB D3 Table 4-5 – essential processes', table([{ k: 'char', l: 'Characteristic', v: (x) => `${x.char} ${x.band}` }, { k: 'E', l: 'Essential', v: (x) => h('span', { class: 'small' }, x.E.map((q) => D3PROC[q]).join(', ') || '—') }, { k: 's', l: '', v: (x) => (x.hard.length ? statusBadge('warn') : x.soft.length ? statusBadge('info') : statusBadge('ok')) }], pr.t45.rows), { flush: true })),
      h('div', { class: 'flex', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn primary', onclick: () => navigate('intake') }, 'Continue: design the intake', icon('arrowRight'))),
    ];
  },
};
