// Operation & maintenance pages (v1.8): jar-test dose calculator, backwash & chemical-stock planner, O&M manual.
import { fmt } from '../../core/util.js';
import { h, icon, toast } from '../dom.js';
import { card, chartCard, kpis, kvTable, notes, statusBadge, table } from '../results.js';
import { setInput, store } from '../store.js';
import { MANUAL_SECTIONS, buildManual } from '../ommanual.js';
import { canExport } from '../edition.js';

const f0 = (v) => fmt(v, 0), f1 = (v) => fmt(v, 1), f2 = (v) => fmt(v, 2);
const dt = (iso) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ''); return m ? `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]} ${m[1]}` : '–'; };
const hasCoag = (i, r) => !!r?.coag;

// ------------------------------------------------------------------ Jar test
function applyCal() {
  const c = store.results?.jartest?.cal;
  if (!c) return;
  const cur = store.project.inputs.coag || {};
  setInput(['coag'], { ...cur, doseMethod: 'empirical', empA: +c.a.toFixed(2), empB: +c.b.toFixed(3) }, { immediate: true });
  toast(`Chemical dosing now uses D = ${c.a.toFixed(2)} · Tu^${c.b.toFixed(3)}`, 'ok');
}
export const jartest = {
  id: 'jartest', title: 'Jar-test dose calculator', sub: 'Jar results → dose curve, optimum and economic dose, dosing-pump stroke setting and dosing table (NWSDB D3 §4.4.3.2, §6.1)', icon: 'flask', group: 'Operation & maintenance', mod: 'jartest',
  enabled: (r) => !!r.coag,
  fields: [
    { t: 'help', html: 'Run the jar test on today\'s raw water with the coagulant in use (D3 §4.4.3.2: rapid mix 0.5–1 min at full speed, flocculate 5–20 min reducing from about 80 to 20 rpm, settle 30–60 min). Enter the dose and the settled turbidity of each jar; pH is optional.', show: hasCoag },
    { sec: 'Test', show: hasCoag },
    { k: 'date', l: 'Date of test', t: 'date' },
    { k: 'rawTurb', l: 'Raw-water turbidity', u: 'NTU', auto: true, autoVal: (r) => r.jartest?.rawTurb },
    { k: 'rawPH', l: 'Raw-water pH', step: 0.1, auto: true, autoVal: (r) => r.jartest?.rawPH },
    { k: 'rawAlk', l: 'Raw-water alkalinity', u: 'mg/L CaCO₃', auto: true, autoVal: (r) => r.jartest?.rawAlk },
    { k: 'jarVol', l: 'Volume of each jar', u: 'L', step: 0.5 },
    { k: 'stockPct', l: 'Strength of jar stock solution', u: '%', step: 0.1, note: '1 % = 10 mg/mL' },
    { k: 'jars', t: 'table', l: 'Jar results', cols: [{ k: 'dose', l: 'Dose (mg/L)' }, { k: 'turb', l: 'Settled turbidity (NTU)' }, { k: 'pH', l: 'pH' }], add: { dose: 0, turb: 0, pH: 0 }, minRows: 1 },
    { k: 'flocObs', l: 'Floc settling observed', t: 'sel', o: [['fast', 'Settles in < 5 min'], ['slow', 'Settles in 5–30 min'], ['float', 'Suspended > 30 min'], ['pin', 'Pin floc only']] },
    { sec: 'Dose selection', show: hasCoag },
    { k: 'target', l: 'Settled-water target', u: 'NTU', step: 0.5, note: 'D3 §5.9.13.6: ≤ ≈ 4 NTU, < 2 preferred' },
    { k: 'margin', l: 'Margin on the economic dose', u: '%' },
    { k: 'plantFactor', l: 'Plant / jar dose factor', step: 0.05, note: '1.0 unless plant records show otherwise' },
    { sec: 'Dosing pump', show: hasCoag },
    { k: 'flow', l: 'Plant inflow now', u: 'm³/h', auto: true, autoVal: (r) => r.jartest?.Qh },
    { k: 'solPct', l: 'Solution strength in the day tank', u: '%', auto: true, autoVal: (r) => r.jartest?.sol },
    { k: 'pumpCap', l: 'Pump capacity at 100 % stroke', u: 'L/h', auto: true, autoVal: (r) => r.jartest?.cap },
    { k: 'speed', l: 'Pump speed setting', u: '%' },
    { sec: 'Record of past jar tests', show: hasCoag },
    { k: 'history', t: 'table', l: 'Best dose at each raw turbidity', cols: [{ k: 'date', l: 'Date / month', text: true }, { k: 'turb', l: 'Raw turbidity (NTU)' }, { k: 'dose', l: 'Best dose (mg/L)' }], add: { date: '', turb: 0, dose: 0 }, minRows: 0 },
    { t: 'custom', show: hasCoag, render: () => h('button', { class: 'btn', onclick: applyCal, title: 'Use the fitted a and b on the Chemical dosing page' }, icon('sparkles'), 'Use the fitted D = a·Tuᵇ for design') },
  ],
  render(r) {
    const j = r.jartest;
    if (!j?.enabled) return { overview: [notes(j?.notes?.length ? j.notes.map((x) => ({ level: x.level, text: x.text })) : [{ level: 'info', text: 'No coagulation step in this plant.' }])] };
    const st = j.sNow > 100 ? 'fail' : j.sNow < 10 || j.sNow > 90 ? 'warn' : 'ok';
    const data = j.curve.map((c) => ({ dose: c.dose, fit: c.fit }));
    j.jars.forEach((x) => data.push({ dose: x.dose, meas: x.turb }));
    data.sort((a, b) => a.dose - b.dose);
    const markers = [];
    if (j.opt) markers.push({ x: j.opt.dose, y: j.opt.turb, label: `Optimum ${f1(j.opt.dose)} mg/L`, color: 'var(--series-2)' });
    if (j.econ) markers.push({ x: j.econ.dose, y: j.econ.turb, label: `Economic ${f1(j.econ.dose)} mg/L`, color: 'var(--ok)', dy: 16 });
    const visuals = [chartCard('Dose curve – settled turbidity vs dose', { type: 'line', data, x: { key: 'dose', label: `${j.name} dose (mg/L)` }, y: { label: 'Settled turbidity (NTU)', min: 0 }, series: [{ key: 'fit', label: 'Fitted curve' }, { key: 'meas', label: 'Jar results', marker: true, width: 0.01 }], refs: [{ value: j.inputs.target, label: `Target ${j.inputs.target} NTU`, kind: 'target' }], markers, unit: 'NTU', height: 280 }, { sub: `raw water ${f0(j.rawTurb)} NTU · selected plant dose ${f1(j.dose)} mg/L` })];
    if (j.cal) visuals.push(chartCard('Best dose vs raw turbidity (past jar tests)', { type: 'line', data: [...j.cal.curve.map((c) => ({ turb: c.turb, fit: c.fit, now: c.now })), ...j.hist.map((x) => ({ turb: x.turb, meas: x.dose }))].sort((a, b) => a.turb - b.turb), x: { key: 'turb', label: 'Raw turbidity (NTU)' }, y: { label: 'Dose (mg/L)', min: 0 }, series: [{ key: 'fit', label: `Fitted D = ${f2(j.cal.a)}·Tu^${j.cal.b.toFixed(3)}` }, { key: 'now', label: 'Correlation now used for design', dash: true }, { key: 'meas', label: 'Jar tests', marker: true, width: 0.01 }], unit: 'mg/L', height: 260 }, { sub: `R² = ${j.cal.r2.toFixed(2)} from ${j.cal.n} tests` }));
    const cols = [{ k: 'pct', l: 'Flow', v: (row) => h('span', null, `${row.pct} % · ${f0(row.Q)} m³/h`) }, ...j.doses.map((D, i) => ({ k: 'c' + i, l: `${D} mg/L`, num: true, v: (row) => { const s = row.cells[i]; return h('span', { class: s > 100 ? 'bad' : s < 10 || s > 90 ? 'warnc' : '' }, s > 100 ? '> 100' : f0(s)); } }))];
    return {
      overview: [
        kpis([
          { label: 'Selected plant dose', value: f1(j.dose), unit: 'mg/L', sub: j.econ ? `economic ${f1(j.econ.dose)} + ${j.inputs.margin} % · optimum ${f1(j.opt.dose)}` : j.opt ? `optimum dose (target ${j.inputs.target} NTU not reached)` : 'no jar results', accent: true, icon: 'flask' },
          { label: 'Expected settled turbidity', value: Number.isFinite(j.turbSel) ? f1(j.turbSel) : '–', unit: 'NTU', sub: Number.isFinite(j.pHsel) ? `coagulation pH ≈ ${f2(j.pHsel)}` : 'enter pH to check the coagulation pH' },
          { label: 'Pump stroke setting', value: f0(j.sNow), unit: '%', sub: `${f1(j.qNow)} L/h per pump of ${f0(j.cap)} L/h · ${j.nS} stream(s)`, status: st },
          { label: 'Coagulant today', value: f0(j.kgD), unit: 'kg/d', sub: `${f1(j.bagsD)} bags/d at ${f0(j.Qh)} m³/h` },
        ]),
        notes(j.notes),
        card('Jars', table([{ k: 'dose', l: 'Dose (mg/L)', num: true, fmt: f1 }, { k: 'ml', l: 'Stock per jar (mL)', num: true, fmt: f1 }, { k: 'turb', l: 'Settled turbidity (NTU)', num: true, fmt: f1 }, { k: 'pH', l: 'pH', num: true, fmt: (v) => (Number.isFinite(v) ? f2(v) : '–') }], j.jars), { flush: true, sub: `${j.inputs.stockPct} % stock in ${j.inputs.jarVol} L jars · floc: ${j.floc[0] ? j.floc[0].toLowerCase() + ' – ' + j.floc[1] : '–'}` }),
        card('Alkalinity and pH', kvTable([
          ['Alkalinity consumed', `${f1(j.used)} mg/L as CaCO₃`], ['Residual alkalinity without lime', `${f1(j.resid)} mg/L`],
          ['Pre-lime needed', j.limeNeed > 0 ? `${f1(j.limeDose)} mg/L hydrated lime (to keep ${j.resAlkReq} mg/L)` : 'none'],
        ])),
        card('Dosing table – stroke % of each dosing pump', table(cols, j.table), { flush: true, sub: `${j.sol} % solution · pump ${f0(j.cap)} L/h at ${j.inputs.speed} % speed · one pump per stream · amber = outside 10–90 % · red = beyond the pump` }),
        card('Calibration', kvTable([
          ['Feed per pump now', `${f1(j.qNow)} L/h = ${f0(j.mlMin)} mL/min`],
          ['Calibration-column check', `1,000 mL should be drawn in ${f0(60000 / Math.max(j.mlMin, 1e-9))} s`],
          ['Day-tank use', `${f1((j.qNow * j.nS * 24) / 1000)} m³ of ${j.sol} % solution per day`],
        ])),
      ],
      visuals,
    };
  },
};

// ------------------------------------------------------------------ Backwash & chemical stock
const isRSF = (i, r) => r?.filt?.type !== 'ssf';
export const omplan = {
  id: 'omplan', title: 'Backwash & chemical-stock planner', sub: 'Filter wash timetable, wash-water use, chemical days of stock, reorder dates and monthly consumption (NWSDB D3 §5.9.12–5.9.14, §9.1)', icon: 'calendar', group: 'Operation & maintenance', mod: 'omplan',
  fields: [
    { sec: 'Plan' },
    { k: 'asOf', l: 'Plan / stock-count date', t: 'date', note: 'blank = today' },
    { k: 'qDay', l: 'Plant inflow', u: 'm³/d', auto: true, autoVal: (r) => r.omplan?.qDay, note: '0 = average operating flow' },
    { sec: 'Filter washing', show: isRSF },
    { k: 'season', l: 'Filter run basis', t: 'sel', o: [['avg', 'Average settled turbidity'], ['peak', 'Peak-season turbidity']] },
    { k: 'runHours', l: 'Hours between washes', u: 'h', auto: true, autoVal: (r) => r.omplan?.bw?.run, note: '0 = design run, up to the maximum' },
    { k: 'maxRun', l: 'Longest run allowed', u: 'h' },
    { k: 'window', l: 'Wash on', t: 'sel', o: [['day', 'Day shift only'], ['any', 'Round the clock']] },
    { k: 'dayStart', l: 'Window starts', u: 'h', step: 0.5 }, { k: 'dayEnd', l: 'Window ends', u: 'h', step: 0.5 },
    { k: 'drainMin', l: 'Drain-down time', u: 'min' }, { k: 'refillMin', l: 'Refill time', u: 'min' },
    { sec: 'Chemical stock' },
    { k: 'doseBasis', l: 'Dose basis', t: 'sel', o: [['month', 'Dose of the plan month'], ['avg', 'Average dose'], ['design', 'Design (maximum) dose']] },
    { k: 'lead', l: 'Delivery time after ordering', u: 'days' }, { k: 'leadCl', l: 'Delivery time – chlorine', u: 'days' }, { k: 'safety', l: 'Safety stock', u: 'days' },
    { t: 'help', html: 'Stock on hand from the store count, in kg. 0 = store assumed full.' },
    { k: 'stockCoag', l: 'Coagulant', u: 'kg', show: (i, r) => !!r?.coag }, { k: 'stockLime', l: 'Hydrated lime', u: 'kg', show: (i, r) => r?.omplan?.chems?.some((c) => c.key === 'lime') },
    { k: 'stockCl', l: 'Chlorine product', u: 'kg' }, { k: 'stockPoly', l: 'Polymer', u: 'kg', show: (i, r) => r?.omplan?.chems?.some((c) => c.key === 'poly') },
    { k: 'stockPac', l: 'Powdered activated carbon', u: 'kg', show: (i, r) => r?.omplan?.chems?.some((c) => c.key === 'pac') },
    { k: 'stockSoda', l: 'Soda ash', u: 'kg', show: (i, r) => r?.omplan?.chems?.some((c) => c.key === 'soda') },
    { k: 'stockOx', l: 'Oxidant (Fe/Mn)', u: 'kg', show: (i, r) => r?.omplan?.chems?.some((c) => c.key === 'ox') },
  ],
  render(r) {
    const o = r.omplan;
    const out = [], visuals = [];
    const next = o.chems.filter((c) => c.reorderDate).sort((a, b) => a.reorderIn - b.reorderIn)[0];
    const bw = o.bw, ss = o.ssf;
    out.push(kpis([
      bw ? { label: 'Filter washes per day', value: f2(bw.wpd), sub: `each filter every ${f0(bw.I)} h · ${f0(bw.dur)} min out of service`, accent: true, icon: 'calendar' }
        : ss ? { label: 'Slow sand cleaning', value: `every ${f1(ss.gap)}`, unit: 'days', sub: `each filter every ${ss.weeks} weeks · re-sand every ${f1(ss.years)} years`, accent: true, icon: 'calendar' } : { label: 'Filters', value: '–' },
      bw ? { label: 'Wash water', value: f0(bw.daily), unit: 'm³/d', sub: `${f1(bw.pct)} % of production`, status: bw.pct <= 5 ? 'ok' : 'warn' } : { label: 'Plant inflow', value: f0(o.qDay), unit: 'm³/d' },
      next ? { label: 'Next chemical order', value: next.reorderIn <= 0 ? 'now' : dt(next.reorderDate), sub: `${next.name}: ${next.orderPacks} × ${next.packName}`, status: next.status } : { label: 'Next chemical order', value: '–' },
      { label: 'Chemical cost this year', value: fmt(o.annualCost / 1e6, 1), unit: 'LKR M', sub: `at ${f0(o.qDay)} m³/d` },
    ]));
    out.push(notes(o.notes));
    if (bw) {
      out.push(card('Wash timetable – first 7 days', table([{ k: 'day', l: 'Day' }, { k: 'date', l: 'Date', fmt: dt }, { k: 'time', l: 'Start' }, { k: 'filter', l: 'Filter', v: (e) => 'Filter ' + e.filter }, { k: 'since', l: 'Hours since last wash', num: true, fmt: f0 }], bw.events), { flush: true, sub: bw.dayMode ? `day shift ${o.inputs.dayStart}:00–${o.inputs.dayEnd}:00 · one filter at a time` : 'round the clock, equally spaced · one filter at a time' }));
      out.push(card('Wash procedure', table([{ k: 0, l: 'Step', v: (s) => h('b', null, s[0]) }, { k: 1, l: 'What to do', v: (s) => h('span', { class: 'small' }, s[1]) }], bw.steps), { flush: true, sub: 'NWSDB D3 §5.9.12' }));
      out.push(card('Wash water and energy', kvTable([['Per wash (incl. filter-to-waste)', `${f0(bw.vol)} m³`], ['Per day', `${f0(bw.daily)} m³ (${f1(bw.pct)} % of production; D3: 1–5 %)`], ['Recovered water returned over 24 h', `${f1(bw.ret)} % of inflow (D3 ≤ 10 %)`], ['Wash energy', `${f0(bw.kwh)} kWh/d`], ['Production carried by the other filters during washes', `${f0(bw.lost)} m³/d`]])));
    }
    if (ss) out.push(card('Slow sand filter cleaning timetable', table([{ k: 'date', l: 'Date', fmt: dt }, { k: 'filter', l: 'Filter', v: (e) => 'Filter ' + e.filter }, { k: 'task', l: 'Task', v: (e) => h('span', { class: 'small' }, e.task) }], ss.rows), { flush: true, sub: `scrape ${f0(ss.scr * 1000)} mm each time · bed ${f2(ss.bed)} m → re-sand at ${f2(ss.minBed)} m after ${ss.scrapes} scrapings (≈ ${f1(ss.years)} years) · NWSDB D3 §5.12.8, Table 5-38` }));
    out.push(card('Chemical stock and orders', table([
      { k: 'status', l: '', v: (c) => statusBadge(c.status, true) }, { k: 'name', l: 'Chemical', v: (c) => h('span', null, c.name, c.note ? h('div', { class: 'small muted' }, c.note) : null) },
      { k: 'dose', l: 'Dose (mg/L)', num: true, fmt: f2 }, { k: 'kgD', l: 'Use (kg/d)', num: true, fmt: f1 },
      { k: 'onHandUsed', l: 'On hand (kg)', num: true, v: (c) => h('span', null, f0(c.onHandUsed), c.assumedFull ? h('span', { class: 'small muted' }, ' (full)') : null) },
      { k: 'days', l: 'Days of stock', num: true, fmt: f0 }, { k: 'reorderLevel', l: 'Reorder level (kg)', num: true, fmt: f0 },
      { k: 'reorderDate', l: 'Order on', v: (c) => (c.reorderIn <= 0 ? h('b', null, 'now') : dt(c.reorderDate)) },
      { k: 'orderPacks', l: 'Order', v: (c) => `${c.orderPacks} × ${c.packName}` }, { k: 'runOut', l: 'Runs out (no order)', fmt: dt },
    ], o.chems), { flush: true, sub: `plan date ${dt(o.asOf)} · lead ${o.inputs.lead} d (chlorine ${o.inputs.leadCl} d) + ${o.inputs.safety} d safety stock · order fills the store` }));
    const keys = o.chems.map((c) => c.key);
    out.push(card('Monthly consumption (kg) and cost', table([{ k: 'month', l: 'Month' }, ...o.chems.map((c) => ({ k: c.key, l: c.name.split(' (')[0], num: true, v: (row) => f0(row.kg[c.key]) })), { k: 'cost', l: 'Cost (LKR)', num: true, fmt: f0 }], o.year, { totals: { month: 'Year', cost: o.annualCost, ...Object.fromEntries(keys.map((k) => [k, o.year.reduce((a, b) => a + b.kg[k], 0)])) } }), { flush: true, sub: 'coagulant follows the monthly dose from the raw-water turbidity record; other chemicals at today\'s dose · NWSDB Rate Book 2025 prices' }));
    const pdata = o.proj[0]?.pts.map((p, i) => Object.fromEntries([['day', p.day], ...o.proj.map((s) => [s.key, s.pts[i].pct])])) || [];
    if (pdata.length) visuals.push(chartCard('Stock projection – next 90 days (% of store)', { type: 'line', data: pdata, x: { key: 'day', label: `Days after ${dt(o.asOf)}` }, y: { label: '% of store', min: 0, max: 110 }, series: o.proj.map((s) => ({ key: s.key, label: s.name.split(' (')[0] })), unit: '%', height: 280 }, { sub: 'orders placed at the reorder level arrive after the delivery time' }));
    visuals.push(chartCard('Days of stock on hand', { type: 'hbar', data: o.chems.map((c) => ({ g: c.name.split(' (')[0], v: Math.min(c.days, 365) })), x: { key: 'g' }, y: { label: 'days' }, series: [{ key: 'v', label: 'Days of stock' }], valueFormat: f0, unit: 'days', height: 40 + o.chems.length * 34, marginLeft: 190 }, { sub: 'reorder at delivery time + safety stock' }));
    return { overview: out, visuals };
  },
};

// ------------------------------------------------------------------ O&M manual
export const ommanual = {
  id: 'ommanual', title: 'O&M manual (draft)', sub: 'Draft operation & maintenance manual of the designed plant, in the NWSDB D3 Chapter 10 structure', icon: 'book', group: 'Operation & maintenance', layout: 'full',
  state: { opts: Object.fromEntries(MANUAL_SECTIONS.map(([k]) => [k, true])) },
  renderFull() {
    const st = ommanual.state;
    const frame = h('iframe', { class: 'report-frame', title: 'O&M manual preview' });
    const refresh = () => { frame.srcdoc = buildManual(st.opts); };
    const opts = h('div', { class: 'pill-row' }, MANUAL_SECTIONS.map(([k, l]) => {
      const sw = h('div', { class: 'switch' + (st.opts[k] ? ' on' : '') });
      return h('div', { class: 'chk', style: { marginRight: '14px' }, onclick: () => { st.opts[k] = !st.opts[k]; sw.classList.toggle('on', st.opts[k]); refresh(); } }, sw, l);
    }));
    const base = (store.project.inputs.setup.code || 'WTP') + '-OM-manual';
    const exportPDF = async () => {
      if (!canExport()) return;
      const html = buildManual(st.opts);
      if (window.wtp?.exportPDF) { toast('Generating PDF…', 'file'); const p = await window.wtp.exportPDF(html, base + '.pdf', store.project.inputs.setup.name + ' – O&M manual', { title: 'Export O&M manual', docName: 'Operation & Maintenance Manual (draft)' }); if (p) toast('Manual saved: ' + p.split(/[\\/]/).pop()); }
      else { const w = frame.contentWindow; w.focus(); w.print(); }
    };
    const exportWord = async () => {
      if (!canExport()) return;
      const html = buildManual({ ...st.opts, word: true });
      const { saveFile } = await import('../results.js');
      saveFile(base + '.doc', new Blob(['﻿', html], { type: 'application/msword' }), 'application/msword');
    };
    setTimeout(refresh, 30);
    return [
      notes([{ level: 'info', title: 'Draft for completion', text: 'NWSDB D3 §10.2: the O&M manual is prepared jointly by the design team, the O&M staff and the contractor; the draft follows detailed design and the final version follows commissioning, and it must reach plant staff 1–2 months before start-up. Complete it with the manufacturers\' manuals, as-built drawings, P&ID and the commissioning data. The Word version can be edited.' }]),
      card('Manual contents', opts, { actions: [
        h('button', { class: 'btn primary', onclick: exportPDF }, icon('fileDown'), 'Export PDF'),
        h('button', { class: 'btn', onclick: exportWord }, icon('file'), 'Word (.doc)'),
        h('button', { class: 'btn ghost', onclick: refresh }, icon('reset'), 'Refresh'),
      ] }),
      frame,
    ];
  },
};
