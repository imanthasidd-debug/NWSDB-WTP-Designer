// Design report generator (HTML → PDF via Electron printToPDF, or browser print)
import { esc, fmt, fmtMoney } from '../core/util.js';
import { evaluate, rangeText } from '../core/criteria.js';
import { chartToSVG } from './charts.js';
import { drawingSVG } from './draw/render.js';
import { hydraulicProfile, layoutPlan } from './draw/units.js';
import { pfdSVG } from './draw/pfd.js';
import { chooseScale, drawingNumber } from './draw/sheet.js';
import { groupViews } from './draw/views.js';
import { drawingList } from './draw/pack.js';
import { calcSheet, checksTable } from './results.js';
import { store } from './store.js';
import { PAGES } from './pages/registry.js';
import { bannerImg } from './brand.js';

import { isTrial, trialLabel } from './edition.js';
const f0 = (v) => fmt(v, 0), f1 = (v) => fmt(v, 1), f2 = (v) => fmt(v, 2);

export const REPORT_SECTIONS = [
  ['summary', 'Executive summary'], ['basis', 'Design basis (demand & raw water)'], ['process', 'Process selection'],
  ['units', 'Treatment unit designs'], ['plant', 'Plant-wide design (storage, residuals, hydraulics, layout, power)'],
  ['cost', 'Cost estimate'], ['compliance', 'Compliance & design checks'], ['d2', 'NWSDB Design Manual D2 compliance'], ['d3', 'NWSDB Design Manual D3 compliance'], ['calc', 'Include calculation sheets'], ['refs', 'References & assumptions'],
];

const REPORT_CSS = `
.trialmark { position: fixed; top: 38%; left: -10%; right: -10%; text-align: center; transform: rotate(-32deg); font-size: 62pt; font-weight: 800; letter-spacing: 4px; color: rgba(179, 0, 27, .09); z-index: 9999; pointer-events: none; line-height: 1; }
.trialmark small { display: block; font-size: 24pt; letter-spacing: 6px; text-transform: uppercase; margin-top: 8px; }
.trialtag { position: fixed; top: 0; right: 0; font-size: 7.5pt; font-weight: 700; color: #b3001b; z-index: 9999; }
@page { size: A4; margin: 16mm 14mm 18mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5pt; color: #0f1d33; margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
:root { --primary:#0b63b6; --navy:#0a3d7a; --text:#0f1d33; --text-2:#44546b; --muted:#7a889c; --border:#dbe2eb; --surface:#fff; --surface-2:#f6f8fb; --surface-3:#edf1f6;
  --ok:#138a4b; --ok-bg:#e5f5ec; --warn:#b7791f; --warn-bg:#fdf4e3; --fail:#c53030; --fail-bg:#fdecec; --info:#2a6fb5; --info-bg:#e8f1fb; --teal:#10a59a; --primary-soft:#e3effb;
  --series-1:#2a78d6; --series-2:#eb6834; --series-3:#1baf7a; --series-4:#eda100; --chart-grid:#e1e0d9; --chart-axis:#c3c2b7; --chart-ink:#52514e; --chart-muted:#898781; --chart-surface:#fff;
  --dw-bg:#fff; --dw-line:#22324a; --dw-concrete:#c9d2de; --dw-water:rgba(42,120,214,.18); --dw-water-line:#2a78d6; --dw-sand:#e8d29b; --dw-gravel:#b9a88a; --dw-anth:#4b4b52; --dw-dim:#5b6b80; --dw-equip:#eb6834; --dw-ground:#8a6d3b; --dw-text:#1d2b40; }
.page { page-break-after: always; }
.cover { height: 257mm; display: flex; flex-direction: column; }
.cover .band { background: linear-gradient(120deg, #0a3d7a, #0b63b6); color: #fff; padding: 22px 26px; border-radius: 10px; display: flex; gap: 18px; align-items: center; }
.cover .band img, .cover .band svg { width: 64px; height: 64px; }
.cover .band.banner { background: #fff; border: 1.5px solid #0b63b6; border-bottom: 5px solid #0b63b6; padding: 14px 18px; justify-content: center; }
.cover .band.banner img.cover-banner { width: auto; height: 70px; }
.cover .credit { margin-top: auto; padding-top: 14px; border-top: 1px solid #dbe2eb; color: #0b63b6; font-weight: 600; font-size: 9.5pt; }
.cover .org { font-size: 15pt; font-weight: 600; }
.cover .org-l { font-family: "Nirmala UI", "Iskoola Pota", Latha, sans-serif; font-size: 9.5pt; opacity: .9; line-height: 1.5; }
.cover h1 { font-size: 26pt; margin: 60px 0 6px; color: #0a3d7a; font-weight: 600; }
.cover h2 { font-size: 14pt; margin: 0 0 30px; color: #44546b; font-weight: 400; }
.cover .cap { display: inline-block; font-size: 30pt; font-weight: 600; color: #0b63b6; }
.cover .meta { margin-top: 24px; border-collapse: collapse; width: 100%; }
.cover .meta td { padding: 6px 10px; border-bottom: 1px solid #dbe2eb; }
.cover .meta td:first-child { color: #44546b; width: 32%; }
.sig { margin-top: auto; width: 100%; border-collapse: collapse; }
.sig th, .sig td { border: 1px solid #c3cedb; padding: 8px; text-align: left; font-size: 9.5pt; }
.sig td { height: 46px; vertical-align: bottom; }
h1.sec { font-size: 16pt; color: #0a3d7a; border-bottom: 2px solid #0b63b6; padding-bottom: 4px; margin: 0 0 12px; page-break-after: avoid; }
h2.sub { font-size: 12.5pt; color: #0b63b6; margin: 18px 0 8px; page-break-after: avoid; }
h3 { font-size: 10.5pt; margin: 12px 0 6px; color: #0f1d33; page-break-after: avoid; }
p { line-height: 1.5; margin: 4px 0 8px; }
.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 6px 0 10px; }
.kpi { border: 1px solid #dbe2eb; border-radius: 6px; padding: 6px 8px; page-break-inside: avoid; position: relative; }
.kpi .kl { font-size: 8pt; color: #44546b; display: flex; gap: 4px; align-items: center; }
.kpi .kv { font-size: 12.5pt; font-weight: 600; } .kpi .kv .ku { font-size: 8pt; color: #7a889c; margin-left: 3px; font-weight: 400; }
.kpi .ks { font-size: 7.5pt; color: #7a889c; } .kpi .kst { position: absolute; top: 5px; right: 5px; }
.kpi.accent { background: #e3effb; border-color: #b7d3f6; }
svg.icon { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
table.res { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 4px 0 10px; }
table.res th { text-align: left; background: #f0f4f9; border-bottom: 1px solid #c3cedb; padding: 4px 6px; font-weight: 600; color: #44546b; }
table.res td { padding: 3px 6px; border-bottom: 1px solid #e3e8ef; vertical-align: top; }
table.res tr { page-break-inside: avoid; }
table.res td.num, table.res th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
table.res tr.tot td { font-weight: 700; background: #f6f8fb; }
.badge { display: inline-flex; align-items: center; gap: 3px; font-size: 7.5pt; font-weight: 600; border-radius: 8px; padding: 0 6px; white-space: nowrap; }
.badge.ok { color: #138a4b; background: #e5f5ec; } .badge.warn { color: #b7791f; background: #fdf4e3; } .badge.fail { color: #c53030; background: #fdecec; } .badge.info, .badge.na { color: #2a6fb5; background: #e8f1fb; }
.notes { display: flex; flex-direction: column; gap: 4px; margin: 6px 0 10px; }
.note { display: flex; gap: 6px; padding: 5px 8px; border-radius: 5px; border: 1px solid #dbe2eb; font-size: 8.5pt; page-break-inside: avoid; }
.note.warn { background: #fdf4e3; } .note.fail { background: #fdecec; } .note.info { background: #e8f1fb; } .note.ok { background: #e5f5ec; }
.card { border: 1px solid #dbe2eb; border-radius: 6px; margin: 6px 0 10px; page-break-inside: avoid; }
.card-h { padding: 5px 8px; font-weight: 600; border-bottom: 1px solid #dbe2eb; background: #f6f8fb; font-size: 9.5pt; display: flex; gap: 6px; }
.card-h .ch-sub { color: #7a889c; font-weight: 400; } .card-h .ch-act { display: none; }
.card-b { padding: 6px 8px; } .card-b.flush { padding: 0; }
.fig { page-break-inside: avoid; margin: 8px 0 12px; text-align: center; }
.fig svg { max-width: 100%; height: auto; }
.fig .cap { font-size: 9.5pt; color: #000; margin-top: 4px; font-family: 'Times New Roman', Times, serif; font-weight: 700; text-align: center; }
.fig .cap .dn { display: block; font-family: Arial, sans-serif; font-weight: 400; font-size: 7.5pt; color: #44546b; }
.grid2 { display: block; }
.calc { font-size: 8.5pt; }
.calc .cs-h { font-weight: 700; color: #0b63b6; margin: 8px 0 3px; border-bottom: 1px solid #dbe2eb; page-break-after: avoid; }
.calc .cs-row { display: grid; grid-template-columns: 34% 46% 20%; gap: 6px; padding: 3px 0; border-bottom: 1px dashed #e3e8ef; page-break-inside: avoid; align-items: center; }
.calc .cs-l .ref { display: block; font-size: 7pt; color: #7a889c; }
.calc .cs-e { overflow: hidden; color: #44546b; } .calc .cs-e .katex { font-size: 0.95em; }
.calc .cs-v { text-align: right; font-weight: 600; } .calc .cs-v .u { font-weight: 400; color: #7a889c; margin-left: 3px; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 3px 12px; font-size: 8pt; justify-content: center; }
.chart-legend .sw { display: inline-block; width: 12px; height: 3px; margin-right: 4px; vertical-align: middle; } .chart-legend .sw.box { height: 8px; width: 8px; border-radius: 2px; }
.toc { columns: 1; } .toc li { margin: 3px 0; }
.pfd svg { max-width: 100%; height: auto; }
.small { font-size: 8pt; } .muted { color: #7a889c; }
.helptext { display: none; }
@media screen { body { background: #e6ebf2; padding: 14px 0; } .page { background: #fff; width: 210mm; min-height: 297mm; margin: 0 auto 14px; padding: 16mm 14mm; box-shadow: 0 2px 10px rgba(15,29,51,.18); } .cover { height: auto; min-height: 297mm; } }
`;

let FIG = 0;
const figCap = (t, extra = '') => `<div class="cap">Figure ${++FIG}: ${esc(t)}${extra}</div>`;
function staticize(nodes) {
  // convert page render output (DOM nodes) into report HTML: charts & drawings rendered statically
  const out = [];
  for (const n of nodes.flat(Infinity)) {
    if (!n) continue;
    if (n._spec) { out.push(`<div class="fig">${chartToSVG(n._spec, 660)}${figCap(n._title || '')}</div>`); continue; }
    if (n._dws) { for (const v of n._dws.filter((x) => x.id !== 'ga' || n._dws.length === 1)) out.push(`<div class="fig">${drawingSVG(v.dw, { statik: true, idPrefix: 'r' + Math.random().toString(36).slice(2, 7) }).svg.replace('<svg ', '<svg width="660" ')}${figCap(v.dw.title, `<span class="dn">Drawing ${drawingNumber(store.project.inputs.setup, v.dw)} · full A3 sheet in the drawing pack</span>`)}</div>`); continue; }
    if (n.classList?.contains('grid2')) { out.push(staticize([...n.children])); continue; }
    if (n.classList?.contains('pfd') || n.classList?.contains('pfd2') || n.querySelector?.('.pfd, .pfd2')) { out.push(`<div class="fig pfd">${pfdSVG(store.results, { width: 1000, interactive: false, statik: true }).svg}${figCap('Process flow diagram – selected treatment train')}</div>`); continue; }
    if (n.outerHTML) out.push(n.outerHTML);
  }
  return out.join('\n');
}

function inputsTable(page) {
  if (!page.fields || !page.mod) return '';
  const inp = store.project.inputs;
  const vals = inp[page.mod] || {};
  const rows = [];
  let secShow = null;
  for (const f of page.fields) {
    if (f.sec !== undefined) { secShow = f.show || null; continue; }
    if (!f.k || ['custom', 'help'].includes(f.t)) continue;
    if (secShow && !secShow(inp, store.results)) continue;
    if (f.show && !f.show(inp, store.results)) continue;
    if (rows.some((r) => r.startsWith(`<tr><td>${esc(f.l || f.k)}</td>`))) continue;
    let v = vals[f.k];
    if (f.t === 'table') { v = (v || []).map((row) => f.cols.filter((c) => !c.ro).map((c) => row[c.k]).join(' / ')).join('; '); }
    else if (f.t === 'array') v = (v || []).map((x) => fmt(x, 2)).join(', ');
    else if (f.t === 'sel') { const o = typeof f.o === 'function' ? f.o(store.results, inp) : f.o; v = (o.find((x) => String(x[0]) === String(v)) || [v, v])[1]; }
    else if (f.t === 'bool') v = v ? 'Yes' : 'No';
    else if (f.auto && (!v || v === 0)) v = 'auto' + (f.autoVal ? ` (${fmt(f.autoVal(store.results), 2)})` : '');
    else if (typeof v === 'number') v = fmt(v, 4);
    if (v === undefined || v === '') continue;
    rows.push(`<tr><td>${esc(f.l || f.k)}</td><td class="num">${esc(v)}</td><td>${esc(f.u || '')}</td></tr>`);
  }
  if (!rows.length) return '';
  return `<h3>Design inputs</h3><table class="res"><thead><tr><th>Parameter</th><th class="num">Value</th><th>Unit</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function pageSection(page, r, opts, num) {
  const res = r[page.mod];
  if (page.enabled && !page.enabled(r)) return '';
  let body = '';
  try {
    if (page.report) body = staticize(page.report(r));
    else if (page.renderFull) body = staticize(page.renderFull(r));
    else {
      const o = page.render(r);
      body = inputsTable(page) + '<h3>Results</h3>' + staticize([...(o.overview || []), ...(o.visuals || [])]);
    }
  } catch (e) { body = `<p class="muted">Section could not be generated: ${esc(e.message)}</p>`; }
  if (res?.checks?.length && !page.renderFull) body += '<h3>Design checks</h3>' + checksTable(res.checks).outerHTML;
  if (opts.calc && res?.steps?.length) body += '<h3>Calculation sheet</h3>' + calcSheet(res.steps).outerHTML;
  return `<section class="page"><h1 class="sec">${num}. ${esc(page.title)}</h1><p class="muted">${esc(page.sub || '')}</p>${body}</section>`;
}

export function buildReport(opts = {}) {
  FIG = 0;
  const o = { summary: true, basis: true, process: true, units: true, plant: true, cost: true, compliance: true, d2: true, d3: true, calc: true, refs: true, ...opts };
  const r = store.results;
  const s = store.project.inputs.setup;
  const d = r.demand;
  const base = location.href.replace(/[^/]*$/, '');
  const logo = store.settings.logo ? `<img src="${store.settings.logo}" alt="logo">` : bannerImg(70, 'cover-banner');
  const parts = [];
  parts.push(`<section class="page cover">
    <div class="band banner">${logo}</div>
    <h1>Water Treatment Plant – Design Report</h1>
    <h2>${esc(s.name)}</h2>
    <div><span class="cap">${f1(d.Qd / 1000)} MLD</span> <span class="muted">(${f0(d.Qd)} m³/d, design year ${d.inputs.designYear})</span></div>
    <table class="meta">
      <tr><td>Project code</td><td>${esc(s.code)}</td></tr><tr><td>Client</td><td>${esc(s.client)}</td></tr><tr><td>Region</td><td>${esc(s.rsc)}</td></tr>
      <tr><td>Location</td><td>${esc([s.town, s.district + ' District'].filter(Boolean).join(', '))}</td></tr><tr><td>Water source</td><td>${esc(s.source)} (${esc(s.sourceType)})</td></tr>
      <tr><td>Treatment</td><td>${esc(r.process.train.map((t) => t.label).join(' → '))}</td></tr>
      <tr><td>Revision / date</td><td>${esc(s.revision)} / ${esc(s.date)}</td></tr>
    </table>
    <table class="sig"><tr><th>Designed by</th><th>Checked by</th><th>Approved by</th></tr><tr><td>${esc(s.designer)}</td><td>${esc(s.checker)}</td><td>${esc(s.approver)}</td></tr></table>
    <p class="small muted" style="margin-top:8px">Generated by NWSDB WTP Designer v1.7 on ${new Date().toLocaleString('en-GB')}. Indicative design – to be verified by a qualified engineer against current NWSDB design criteria.</p>
  </section>`);
  const toc = [];
  let n = 1;
  const sec = (title) => { toc.push(`${n}. ${title}`); return n++; };
  const body = [];
  if (o.summary) {
    const k = sec('Executive summary');
    body.push(`<section class="page"><h1 class="sec">${k}. Executive summary</h1>
      <p>The ${esc(s.name)} is designed to treat <b>${f0(d.Qd)} m³/d</b> (${f1(d.Qd / 1000)} MLD) of ${esc(s.sourceType)} water from ${esc(s.source || 'the source')} in ${esc(s.district)} District, serving an estimated <b>${f0(d.design.served)}</b> people in ${d.inputs.designYear}. Raw-water turbidity peaks at ${r.quality.turbMax} NTU during the monsoon; the selected ${esc(r.process.route)} train delivers a predicted filtered turbidity of ${f2(r.filt.filteredAvg)}–${f2(r.filt.filteredPeak)} NTU and meets ${r.compliance.total - r.compliance.fails.length} of ${r.compliance.total} SLS 614:2013 parameters.</p>
      <div class="fig pfd">${pfdSVG(r, { width: 1000, interactive: false, statik: true }).svg}${figCap('Process flow diagram')}</div>
      <table class="res"><thead><tr><th>Item</th><th class="num">Value</th></tr></thead><tbody>
      ${[
        ['Design capacity', `${f0(d.Qd)} m³/d (${d.nTrains} streams)`], ['Population served (design year)', f0(d.design.served)], ['Average / maximum-day demand', `${f0(d.design.gross)} / ${f0(d.design.mdd)} m³/d`],
        ['Coagulant dose (design / average)', r.coag ? `${f1(r.coag.Ddes)} / ${f1(r.coag.Davg)} mg/L` : '—'], ['Flocculation', `${r.floc?.ttot ?? '—'} min, Gt ${f0(r.floc?.Gt)}`],
        ['Sedimentation', r.sed?.enabled ? `${r.sed.N} tanks, SOR ${f1(r.sed.sorAct)} m³/m²·d, θ ${f2(r.sed.hrt)} h` : '—'], ['Filtration', `${r.filt.N} × ${f1(r.filt.Af)} m² at ${f2(r.filt.rate)} m/h`],
        ['Disinfection', `${f2(r.dis.totDose)} mg/L ${esc(r.dis.agent.label)}, CT ratio ${f2(r.dis.ratio)}`], ['Clear-water reservoir', `${f0(r.storage.V)} m³`], ['Land requirement', `${f2(r.layout.ha)} ha (${f0(r.layout.perches)} perches)`],
        ['Maximum demand / transformer', `${f0(r.energy.kva)} kVA / ${r.energy.tx} kVA`], [r.cost.est.format === 'd2' ? 'Capital cost (incl. VAT)' : 'Total implementing cost – NWSDB RB 2025 (incl. VAT)', fmtMoney(r.cost.capex)], ['Production cost', `${f2(r.cost.fullPerM3)} LKR/m³ (O&M ${f2(r.cost.omPerM3)})`],
        ['Design checks', `${r.summary.ok} pass, ${r.summary.warn} to review, ${r.summary.fail} fail`],
        ['NWSDB Design Manual D2 (1989) clause checks', `${r.d2.ok} pass, ${r.d2.warn} to review, ${r.d2.fail} fail`],
        ['NWSDB Design Manual D3 (2020) clause checks', `${r.d3.ok} pass, ${r.d3.warn} to review, ${r.d3.fail} fail, ${r.d3.info} advisory`],
      ].map(([a, b]) => `<tr><td>${a}</td><td class="num">${b}</td></tr>`).join('')}</tbody></table></section>`);
  }
  const byId = (id) => PAGES.find((p) => p.id === id);
  const group = (ids) => ids.map(byId).filter(Boolean);
  if (o.basis) for (const p of group(['setup', 'demand', 'quality', 'source'])) body.push(pageSection(p, r, o, sec(p.title)));
  if (o.process) { const p = byId('process'); body.push(pageSection(p, r, o, sec('Process selection (plant configuration)'))); const c = byId('chain'); if (c) body.push(pageSection(c, r, o, sec(c.title))); }
  if (o.units) for (const p of group(['intake', 'aeration', 'coag', 'rapidmix', 'floc', 'sed', 'filt', 'special', 'dis', 'stab'])) { if (p.enabled && !p.enabled(r)) continue; body.push(pageSection(p, r, o, sec(p.title))); }
  if (o.plant) {
    for (const p of group(['storage', 'buildings', 'sludge', 'structure'])) body.push(pageSection(p, r, o, sec(p.title)));
    body.push(pageSection(byId('hyd'), r, o, sec('Hydraulic profile')));
    const kl = sec('Site layout');
    body.push(`<section class="page"><h1 class="sec">${kl}. Site layout</h1>${groupViews(r, 'site').map((v, i) => `<div class="fig">${drawingSVG(v.dw, { statik: true, idPrefix: 'lp' + i }).svg.replace('<svg ', '<svg width="660" ')}${figCap(v.dw.title, `<span class="dn">Drawing ${drawingNumber(store.project.inputs.setup, v.dw)}</span>`)}</div>`).join('')}<p>Land requirement ${f2(r.layout.ha)} ha = ${f2(r.layout.acres)} acres = ${f0(r.layout.perches)} perches (including ${r.layout.inputs.expansion} % reserve).</p></section>`);
    const pe = byId('energy'); body.push(pageSection(pe, r, o, sec(pe.title)));
    const kd = sec('Drawing register');
    const dl = drawingList(r);
    body.push(`<section class="page"><h1 class="sec">${kd}. Drawing register</h1><p>Every structure is drawn in plan, longitudinal section (A–A), cross-section (B–B), a general-arrangement sheet (views in projection) and, where useful, a 3D isometric view. The drawings below are issued as NWSDB A3 landscape sheets (title block, notes, legend, graphic scale) in the drawing pack (PDF) and as AutoCAD DXF files with the same title block (layers per element). Concrete is shown in the NWSDB Design Manual D3 annex convention (red outline, cross-hatched).</p>
      <table class="res"><thead><tr><th>Sheet</th><th>Drawing number</th><th>Title</th><th class="num">Scale (A3)</th></tr></thead><tbody>
      <tr><td>1</td><td>${esc(drawingNumber(store.project.inputs.setup, 'Process flow diagram'))}</td><td>Process flow diagram</td><td class="num">NTS</td></tr>
      ${dl.map((dw, i) => `<tr><td>${i + 2}</td><td>${esc(drawingNumber(store.project.inputs.setup, dw))}</td><td>${esc(dw.title)}</td><td class="num">${dw.nts ? 'NTS' : '1:' + chooseScale(dw)}</td></tr>`).join('')}</tbody></table></section>`);
  }
  if (o.cost) { const p = byId('cost'); body.push(pageSection(p, r, o, sec(p.title))); }
  if (r.assess?.enabled) { const p = byId('assess'); if (p) body.push(pageSection(p, r, o, sec(p.title))); }
  if (o.compliance) for (const p of group(['compliance', 'checks'])) {
    if (p.id === 'checks') { const k = sec('Design checks summary'); body.push(`<section class="page"><h1 class="sec">${k}. Design checks summary</h1>${checksTable(r.checks.map((c) => ({ ...c, moduleLabel: PAGES.find((pp) => pp.mod === c.module)?.title })), { showModule: true }).outerHTML}</section>`); }
    else body.push(pageSection(p, r, o, sec(p.title)));
  }
  if (o.d2) {
    const k = sec('Compliance with NWSDB Design Manual D2');
    const rows = r.d2.checks.map((c) => ({ ...c, moduleLabel: `${PAGES.find((pp) => pp.mod === c.module)?.title || c.module} · ${c.clause}` }));
    body.push(`<section class="page"><h1 class="sec">${k}. Compliance with NWSDB Design Manual D2</h1>
      <p>The demand forecast, source assessment, intake, pumping stations, transmission mains, service reservoirs, site planning and cost estimate have been checked against <b>NWSDB Design Manual D2 – Urban Water Supply and Distribution (March 1989)</b>. Treatment-process design is checked against companion manual D3 (next section). Result: <b>${r.d2.ok}</b> clause checks pass, <b>${r.d2.warn}</b> require review and <b>${r.d2.fail}</b> fail.</p>
      ${checksTable(rows, { showModule: true }).outerHTML}</section>`);
  }
  if (o.d3) {
    const k = sec('Compliance with NWSDB Design Manual D3');
    const rows = r.d3.checks.map((c) => ({ ...c, moduleLabel: `${PAGES.find((pp) => pp.mod === c.module)?.title || c.module} · ${c.clause}` }));
    const p = r.process;
    body.push(`<section class="page"><h1 class="sec">${k}. Compliance with NWSDB Design Manual D3</h1>
      <p>Raw- and treated-water quality, process selection, screens, aeration, coagulation and chemical feeding, rapid mixing, flocculation, clarification, filtration, disinfection, stabilisation, residuals and plant layout have been checked against <b>NWSDB Design Manual D3 – Water Quality &amp; Treatment Manual (Revision 01, November 2020)</b>. Result: <b>${r.d3.ok}</b> clause checks pass, <b>${r.d3.warn}</b> require review, <b>${r.d3.fail}</b> fail and <b>${r.d3.info}</b> are advisory.</p>
      <p><b>Process selection (D3 Table 4-5, ${esc(p.typical.fig)}):</b> source category “${esc(p.typical.cat)}” – typical train ${esc(p.typical.steps.join(' → '))}. Essential processes for the raw-water characteristics: ${esc(p.t45.rows.map((x) => `${x.char} ${x.band}`).join('; '))}.</p>
      ${checksTable(rows, { showModule: true }).outerHTML}
      <p class="small">Printed inconsistencies in D3 and the interpretation adopted are listed in the application (Library → NWSDB Design Manual D3 → Errata); they should be confirmed with the NWSDB Planning &amp; Design Manual Review Committee.</p></section>`);
  }
  if (o.refs) {
    const k = sec('References, assumptions & criteria');
    const crit = Object.entries(r.checks.reduce((a, c) => { if (c.key && !a[c.key]) a[c.key] = c; return a; }, {}));
    body.push(`<section class="page"><h1 class="sec">${k}. References, assumptions &amp; criteria</h1>
      <h3>References</h3><ol class="small">
      <li>Gunawardana, B. (2020). Lecture notes: Water quality standards & overview of treatment; Intake structures & screening; Aeration & air stripping; Coagulation & flocculation; Sedimentation; Filtration; Disinfection.</li>
      <li>Sri Lanka Standards Institution. SLS 614:2013 – Specification for potable water (1st revision).</li>
      <li>World Health Organization (2017). Guidelines for drinking-water quality, 4th ed. incorporating the 1st addendum.</li>
      <li>AWWA / ASCE (2012). Water Treatment Plant Design, 5th ed. McGraw-Hill.</li>
      <li>Kawamura, S. (2000). Integrated Design and Operation of Water Treatment Facilities, 2nd ed. Wiley.</li>
      <li>Crittenden, J. C. et al. (2012). MWH's Water Treatment: Principles and Design, 3rd ed. Wiley.</li>
      <li>USEPA (1991/2003). Guidance Manual for Compliance with the Surface Water Treatment Rule – CT values; Disinfection Profiling & Benchmarking.</li>
      <li>Great Lakes–Upper Mississippi River Board (2018). Recommended Standards for Water Works (Ten States Standards).</li>
      <li>Smet, J. & van Wijk, C. (2002). Small Community Water Supplies. IRC Technical Paper 40.</li>
      <li>National Water Supply &amp; Drainage Board (2020). Design Manual D3 – Water Quality &amp; Treatment Manual, Revision 01 (November 2020). Ratmalana, Sri Lanka.</li>
      <li>Sri Lanka Standards Institution. SLS 722:1985 – Tolerance limits for inland surface waters used as raw water for public water supply.</li>
      <li>National Water Supply & Drainage Board (1989). Design Manual D2 – Urban Water Supply and Distribution. Ministry of Local Government, Housing and Construction, Sri Lanka (with companion manuals D1, D3, D4, D5 and P1).</li>
      <li>National Water Supply & Drainage Board (2025). NWSDB Rates 2025 (Rate Book), Vols I & II – Quantity Surveying Section, Planning & Designs Division: total cost estimate format, Section A composite rates & unit-cost graphs, Section B unit rates, Annex 1 basic prices, Annex 2 labour, Annex 8 CEB tariff (12.06.2025), Annex 14 VAT.</li>
      <li>British Standards Institution. BS 3680 Part 4 – Measurement of liquid flow in open channels: weirs and flumes; CP 2010 – Pipelines.</li></ol>
      <h3>Key assumptions</h3><ul class="small">
      <li>Water properties are evaluated at the design water temperature of ${r.quality.T} °C; carbonate chemistry assumes a closed system with activity coefficients of unity.</li>
      <li>Coagulant demand follows D = a·Tuᵇ calibrated to jar tests; sludge production follows the NWSDB D3 Method 02 mass balance (Table 5-44, ×1.4 allowance, 90 % capture).</li>
      <li>Treatment-unit criteria, CT tables (Table 6-4/6-5, 25 °C values used above 25 °C), baffling factors, filter, clarifier, residuals and layout rules follow NWSDB Design Manual D3 (2020) as cited clause by clause; water properties follow D3 Annex I.</li>
      <li>Treated-water quality predictions are screening estimates for design and must be confirmed by pilot/jar testing and commissioning data.</li>
      <li>Demand, peaking, unaccounted-for water, intake, pumping, pipeline, service-reservoir and cost-estimate rules follow NWSDB Design Manual D2 (1989) as cited clause by clause; river-basin runoff is from D2 Table 4.1 and dry-weather flow / flood estimates are screening values unless gauged data are entered.</li>
      <li>Capital costs, chemical prices and electricity tariffs are taken from the NWSDB Rate Book 2025 (rates at 31.12.2025, VAT excluded unless stated): the total cost estimate follows the Rate Book Table 1 format (preliminaries, Table 4 engineering, contingencies ≤ 10 %, VAT 18 %), with the contractor's markup of ${r.cost.inputs.markup} % added where the book excludes it and pipe laying adjusted by the B-COM/02 location factor (${fmt(r.cost.factor, 2)}). Items the Rate Book does not cover are indicative allowances (${fmt(r.cost.indicativePct, 0)} % of the BOQ) and should be replaced with quotations. The CEB tariff category of the plant must be confirmed with CEB.</li></ul>
      <h3>Design criteria used</h3><table class="res"><thead><tr><th>Criterion</th><th>Range</th><th>Unit</th><th>Source</th></tr></thead><tbody>${crit.map(([key, c]) => `<tr><td>${esc(c.label)}</td><td>${esc(c.range)}</td><td>${esc(c.unit || '')}</td><td class="small">${esc(c.src || '')}</td></tr>`).join('')}</tbody></table></section>`);
  }
  const tocHTML = `<section class="page"><h1 class="sec">Contents</h1><ol class="toc">${toc.map((t) => `<li>${esc(t.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>
    <h3>Abbreviations</h3><p class="small">ADD – average-day demand; D2 – NWSDB Design Manual D2 (1989); D3 – NWSDB Design Manual D3 (2020); EAC – equivalent annual cost; UFW – unaccounted-for water; BF – baffle factor; CT – concentration × time; CWR – clear-water reservoir; DS – dry solids; ES – effective size; HFL/LWL – highest flood / lowest water level; HRT – hydraulic retention time; LSI – Langelier saturation index; MDD – maximum-day demand; MLD – million litres per day; NRW – non-revenue water; SOR – surface overflow rate; TDH – total dynamic head; UC – uniformity coefficient; UFRV – unit filter run volume; WL – water level.</p></section>`;
  void evaluate; void rangeText;
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><title>${esc(s.name)} – Design Report</title><link rel="stylesheet" href="katex/katex.min.css"><style>${REPORT_CSS}</style></head><body>${isTrial() ? `<div class="trialmark">TRIAL VERSION<small>not for issue</small></div><div class="trialtag">${trialLabel()}</div>` : ''}${parts.join('')}${tocHTML}${body.join('\n')}</body></html>`;
}
