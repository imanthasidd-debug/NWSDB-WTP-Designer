// Result presentation components: KPI tiles, tables, checks, notes, calculation sheet, cards, exports
import katex from 'katex';
import { esc, fmtAuto, isNum } from '../core/util.js';
import { renderChart } from './charts.js';
import { drawingDXF, drawingSVG, mountDrawing } from './draw/render.js';
import { h, icon, toast } from './dom.js';

export function kpis(list) {
  return h('div', { class: 'kpis' }, list.filter(Boolean).map((k) => h('div', { class: 'kpi' + (k.accent ? ' accent' : '') },
    h('div', { class: 'kl' }, k.icon ? icon(k.icon) : null, k.label),
    h('div', { class: 'kv' }, typeof k.value === 'number' ? fmtAuto(k.value) : k.value ?? '–', k.unit ? h('span', { class: 'ku' }, k.unit) : null),
    k.sub ? h('div', { class: 'ks' }, k.sub) : null,
    k.status ? h('div', { class: 'kst' }, statusBadge(k.status, true)) : null)));
}
export function statusBadge(st, compact = false) {
  const map = { ok: ['ok', 'OK'], warn: ['warn', 'Check'], fail: ['fail', 'Fail'], na: ['info', 'n/a'], info: ['info', 'Info'] };
  const [cls, txt] = map[st] || map.na;
  return h('span', { class: 'badge ' + cls }, icon(cls === 'ok' ? 'ok' : cls === 'fail' ? 'fail' : cls === 'warn' ? 'warn' : 'info'), compact ? null : txt);
}
export function card(title, body, { sub, actions, flush } = {}) {
  return h('div', { class: 'card' },
    title ? h('div', { class: 'card-h' }, h('span', null, title), sub ? h('span', { class: 'ch-sub' }, sub) : null, actions ? h('div', { class: 'ch-act' }, actions) : null) : null,
    h('div', { class: 'card-b' + (flush ? ' flush' : '') }, body));
}
/** generic table: cols [{k,l,num,fmt}] rows [] */
export function table(cols, rows, { onRow, totals, cls } = {}) {
  return h('table', { class: 'res ' + (cls || '') },
    h('thead', null, h('tr', null, cols.map((c) => h('th', { class: c.num ? 'num' : '' }, c.l)))),
    h('tbody', null, rows.map((r) => h('tr', { class: (onRow ? 'click ' : '') + (r._tot ? 'tot' : ''), onclick: onRow ? () => onRow(r) : null }, cols.map((c) => {
      const v = typeof c.v === 'function' ? c.v(r) : r[c.k];
      const content = v instanceof Node ? v : c.fmt ? c.fmt(v, r) : isNum(v) ? fmtAuto(v) : v ?? '–';
      return h('td', { class: c.num ? 'num' : '' }, content);
    }))), totals ? h('tr', { class: 'tot' }, cols.map((c, i) => h('td', { class: c.num ? 'num' : '' }, i === 0 ? 'Total' : totals[c.k] !== undefined ? (isNum(totals[c.k]) ? fmtAuto(totals[c.k]) : totals[c.k]) : ''))) : null));
}
/** two-column key/value table */
export function kvTable(rows) {
  return table([{ k: 'k', l: 'Item' }, { k: 'v', l: 'Value', num: true }, { k: 'u', l: 'Unit' }], rows.filter(Boolean).map(([k, v, u]) => ({ k, v, u })));
}
export function checksTable(checks, { showModule = false, onRow } = {}) {
  if (!checks?.length) return h('div', { class: 'empty' }, 'No design checks for this unit.');
  const cols = [
    { k: 'status', l: '', v: (r) => statusBadge(r.status) },
    ...(showModule ? [{ k: 'module', l: 'Unit', v: (r) => r.moduleLabel || r.module }] : []),
    { k: 'label', l: 'Check' },
    { k: 'value', l: 'Design value', num: true, fmt: (v) => (isNum(v) ? fmtAuto(v) : v) },
    { k: 'unit', l: 'Unit' },
    { k: 'range', l: 'Criterion' },
    { k: 'src', l: 'Source', v: (r) => h('span', { class: 'small muted' }, r.src || r.note || '') },
  ];
  return table(cols, checks, { onRow });
}
export function notes(list) {
  if (!list?.length) return null;
  return h('div', { class: 'notes' }, list.map((n) => h('div', { class: 'note ' + (n.level || 'info') }, icon(n.level === 'fail' ? 'fail' : n.level === 'warn' ? 'warn' : n.level === 'ok' ? 'ok' : 'info'), h('div', { html: (n.title ? `<b>${esc(n.title)}.</b> ` : '') + esc(n.text) }))));
}
export const tex = (s, display = false) => { try { return katex.renderToString(s || '', { throwOnError: false, displayMode: display, output: 'html' }); } catch { return esc(s); } };
export function calcSheet(steps, { showRefs = true } = {}) {
  if (!steps?.length) return h('div', { class: 'empty' }, 'No calculations.');
  const el = h('div', { class: 'calc' });
  for (const s of steps) {
    if (s.kind === 'section') el.append(h('div', { class: 'cs-h' }, s.title));
    else if (s.kind === 'text') el.append(h('div', { class: 'cs-t' }, s.text));
    else {
      const eq = [s.eq, s.sub].filter(Boolean).map((x) => tex(x)).join(' &nbsp;=&nbsp; ');
      el.append(h('div', { class: 'cs-row' },
        h('div', { class: 'cs-l' }, s.label, showRefs && s.ref ? h('span', { class: 'ref' }, s.ref) : null),
        h('div', { class: 'cs-e', html: eq || '' }),
        h('div', { class: 'cs-v' }, isNum(s.value) ? fmtAuto(s.value) : s.value ?? '–', h('span', { class: 'u' }, s.unit || ''))));
    }
  }
  return el;
}

// ---------------- file export helpers
export async function saveFile(name, content, mime = 'text/plain') {
  if (window.wtp?.saveFile) {
    const payload = content instanceof Blob ? new Uint8Array(await content.arrayBuffer()) : content;
    const ok = await window.wtp.saveFile(name, payload, mime);
    if (ok) toast('Saved ' + ok.split(/[\\/]/).pop());
    return ok;
  }
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Downloaded ' + name);
  return name;
}
const slug = (s) => String(s || 'drawing').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** card containing an interactive drawing with SVG/DXF/PNG export */
export function drawingCard(dw, { height = 380 } = {}) {
  if (!dw) return null;
  const box = h('div');
  const exportSVG = () => saveFile(slug(dw.title) + '.svg', drawingSVG(dw, { statik: true }).svg, 'image/svg+xml');
  const exportDXF = () => saveFile(slug(dw.title) + '.dxf', drawingDXF(dw), 'application/dxf');
  const exportPNG = async () => {
    const { svg, vw, vh } = drawingSVG(dw, { statik: true, width: 2400 });
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 2400; c.height = Math.round(2400 * vh / vw);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => saveFile(slug(dw.title) + '.png', b, 'image/png'));
  };
  const el = card(dw.title, box, { flush: true, actions: [
    h('button', { class: 'btn sm ghost', title: 'Export to AutoCAD DXF', onclick: exportDXF }, icon('pen'), 'DXF'),
    h('button', { class: 'btn sm ghost', title: 'Export SVG', onclick: exportSVG }, icon('image'), 'SVG'),
    h('button', { class: 'btn sm ghost', title: 'Export PNG', onclick: exportPNG }, icon('download'), 'PNG'),
  ] });
  requestAnimationFrame(() => mountDrawing(box, dw, { height }));
  el._dw = dw;
  return el;
}
/** card containing a chart */
export function chartCard(title, spec, { sub, tableData } = {}) {
  if (!spec) return null;
  const box = h('div');
  let tableMode = false;
  const toggle = h('button', { class: 'btn sm ghost', title: 'Show data table', onclick: () => { tableMode = !tableMode; draw(); } }, icon('table'));
  const csv = h('button', { class: 'btn sm ghost', title: 'Export CSV', onclick: () => {
    const keys = [spec.x.key, ...spec.series.map((s) => s.key)];
    const lines = [[spec.x.label || spec.x.key, ...spec.series.map((s) => s.label)].join(','), ...spec.data.map((d) => keys.map((k) => d[k]).join(','))];
    saveFile(slug(title) + '.csv', lines.join('\n'), 'text/csv');
  } }, icon('sheet'));
  const draw = () => {
    box.innerHTML = '';
    if (tableMode) {
      box.append(table([{ k: spec.x.key, l: spec.x.label || spec.x.key }, ...spec.series.map((s) => ({ k: s.key, l: s.label, num: true }))], spec.data));
    } else renderChart(box, spec);
  };
  const el = card(title, box, { sub, actions: [toggle, csv] });
  el._spec = spec;
  el._title = title;
  requestAnimationFrame(draw);
  let lastW = 0;
  const ro = new ResizeObserver(() => { if (!box.isConnected) { ro.disconnect(); return; } const w = box.clientWidth; if (Math.abs(w - lastW) > 20 && !tableMode) { lastW = w; draw(); } });
  ro.observe(box);
  void tableData;
  return el;
}
