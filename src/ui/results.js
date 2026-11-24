// Result presentation components: KPI tiles, tables, checks, notes, calculation sheet, cards, exports
import katex from 'katex';
import { esc, fmtAuto, isNum } from '../core/util.js';
import { renderChart } from './charts.js';
import { mountDrawing } from './draw/render.js';
import { drawingNumber, sheetDXF, sheetMeta, sheetSVG, sheetsHTML } from './draw/sheet.js';
import { groupTitle, groupViews } from './draw/views.js';
import { mount3D } from './draw/view3d.js';
import { saveSettings, store } from './store.js';
import { h, icon, toast } from './dom.js';
import { canExport } from './edition.js';

export function kpis(list) {
  return h(
    'div',
    { class: 'kpis' },
    list
      .filter(Boolean)
      .map((k) =>
        h(
          'div',
          { class: 'kpi' + (k.accent ? ' accent' : '') },
          h('div', { class: 'kl' }, k.icon ? icon(k.icon) : null, k.label),
          h(
            'div',
            { class: 'kv' },
            typeof k.value === 'number' ? fmtAuto(k.value) : (k.value ?? '–'),
            k.unit ? h('span', { class: 'ku' }, k.unit) : null,
          ),
          k.sub ? h('div', { class: 'ks' }, k.sub) : null,
          k.status ? h('div', { class: 'kst' }, statusBadge(k.status, true)) : null,
        ),
      ),
  );
}
export function statusBadge(st, compact = false) {
  const map = {
    ok: ['ok', 'OK'],
    warn: ['warn', 'Check'],
    fail: ['fail', 'Fail'],
    na: ['info', 'n/a'],
    info: ['info', 'Info'],
  };
  const [cls, txt] = map[st] || map.na;
  return h(
    'span',
    { class: 'badge ' + cls },
    icon(cls === 'ok' ? 'ok' : cls === 'fail' ? 'fail' : cls === 'warn' ? 'warn' : 'info'),
    compact ? null : txt,
  );
}
export function card(title, body, { sub, actions, flush } = {}) {
  return h(
    'div',
    { class: 'card' },
    title
      ? h(
          'div',
          { class: 'card-h' },
          h('span', null, title),
          sub ? h('span', { class: 'ch-sub' }, sub) : null,
          actions ? h('div', { class: 'ch-act' }, actions) : null,
        )
      : null,
    h('div', { class: 'card-b' + (flush ? ' flush' : '') }, body),
  );
}
/** generic table: cols [{k,l,num,fmt}] rows [] */
export function table(cols, rows, { onRow, totals, cls } = {}) {
  return h(
    'table',
    { class: 'res ' + (cls || '') },
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        cols.map((c) => h('th', { class: c.num ? 'num' : '' }, c.l)),
      ),
    ),
    h(
      'tbody',
      null,
      rows.map((r) =>
        h(
          'tr',
          { class: (onRow ? 'click ' : '') + (r._tot ? 'tot' : ''), onclick: onRow ? () => onRow(r) : null },
          cols.map((c) => {
            const v = typeof c.v === 'function' ? c.v(r) : r[c.k];
            const content = v instanceof Node ? v : c.fmt ? c.fmt(v, r) : isNum(v) ? fmtAuto(v) : (v ?? '–');
            return h('td', { class: c.num ? 'num' : '' }, content);
          }),
        ),
      ),
      totals
        ? h(
            'tr',
            { class: 'tot' },
            cols.map((c, i) =>
              h(
                'td',
                { class: c.num ? 'num' : '' },
                i === 0
                  ? 'Total'
                  : totals[c.k] !== undefined
                    ? isNum(totals[c.k])
                      ? fmtAuto(totals[c.k])
                      : totals[c.k]
                    : '',
              ),
            ),
          )
        : null,
    ),
  );
}
/** two-column key/value table */
export function kvTable(rows) {
  return table(
    [
      { k: 'k', l: 'Item' },
      { k: 'v', l: 'Value', num: true },
      { k: 'u', l: 'Unit' },
    ],
    rows.filter(Boolean).map(([k, v, u]) => ({ k, v, u })),
  );
}
export function checksTable(checks, { showModule = false, onRow, locate: loc, module } = {}) {
  if (!checks?.length) return h('div', { class: 'empty' }, 'No design checks for this unit.');
  const cols = [
    ...(loc
      ? [
          {
            k: 'loc',
            l: '',
            v: (r) =>
              h(
                'button',
                {
                  class: 'loc-btn' + (r.status === 'fail' || r.status === 'warn' ? ' hot' : ''),
                  title: 'Locate the input that controls this check',
                  onclick: (e) => {
                    e.stopPropagation();
                    loc({ ...r, module: r.module || module });
                  },
                },
                icon('search'),
              ),
          },
        ]
      : []),
    { k: 'status', l: '', v: (r) => statusBadge(r.status) },
    ...(showModule ? [{ k: 'module', l: 'Unit', v: (r) => r.moduleLabel || r.module }] : []),
    {
      k: 'label',
      l: 'Check',
      v: (r) => (r.note && r.src ? h('span', null, r.label, h('div', { class: 'small muted' }, r.note)) : r.label),
    },
    { k: 'value', l: 'Design value', num: true, fmt: (v) => (isNum(v) ? fmtAuto(v) : v) },
    { k: 'unit', l: 'Unit' },
    { k: 'range', l: 'Criterion' },
    { k: 'src', l: 'Source', v: (r) => h('span', { class: 'small muted' }, r.src || r.note || '') },
  ];
  const t = table(cols, checks, { onRow });
  if (loc)
    [...t.querySelectorAll('tbody tr')].forEach((tr, i) => {
      tr.dataset.label = checks[i]?.label || '';
      tr.classList.add('st-' + (checks[i]?.status || 'ok'));
    });
  return t;
}
export function notes(list) {
  if (!list?.length) return null;
  return h(
    'div',
    { class: 'notes' },
    list.map((n) =>
      h(
        'div',
        { class: 'note ' + (n.level || 'info') },
        icon(n.level === 'fail' ? 'fail' : n.level === 'warn' ? 'warn' : n.level === 'ok' ? 'ok' : 'info'),
        h('div', { html: (n.title ? `<b>${esc(n.title)}.</b> ` : '') + esc(n.text) }),
      ),
    ),
  );
}
export const tex = (s, display = false) => {
  try {
    return katex.renderToString(s || '', { throwOnError: false, displayMode: display, output: 'html' });
  } catch {
    return esc(s);
  }
};
export function calcSheet(steps, { showRefs = true } = {}) {
  if (!steps?.length) return h('div', { class: 'empty' }, 'No calculations.');
  const el = h('div', { class: 'calc' });
  for (const s of steps) {
    if (s.kind === 'section') el.append(h('div', { class: 'cs-h' }, s.title));
    else if (s.kind === 'text') el.append(h('div', { class: 'cs-t' }, s.text));
    else {
      const eq = [s.eq, s.sub]
        .filter(Boolean)
        .map((x) => tex(x))
        .join(' &nbsp;=&nbsp; ');
      el.append(
        h(
          'div',
          { class: 'cs-row' },
          h('div', { class: 'cs-l' }, s.label, showRefs && s.ref ? h('span', { class: 'ref' }, s.ref) : null),
          h('div', { class: 'cs-e', html: eq || '' }),
          h(
            'div',
            { class: 'cs-v' },
            isNum(s.value) ? fmtAuto(s.value) : (s.value ?? '–'),
            h('span', { class: 'u' }, s.unit || ''),
          ),
        ),
      );
    }
  }
  return el;
}

// ---------------- file export helpers
export async function saveFile(name, content, mime = 'text/plain', { project = false } = {}) {
  if (!project && !canExport()) return null;
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
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Downloaded ' + name);
  return name;
}
const slug = (s) =>
  String(s || 'drawing')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** export an HTML document of A3 sheets to PDF (Electron) or open the print dialog (browser) */
export async function exportSheetsPDF(html, name, title) {
  if (!canExport()) return null;
  if (window.wtp?.exportPDF) {
    toast('Generating A3 PDF…', 'file');
    const p = await window.wtp.exportPDF(html, name, title, {
      pageSize: 'A3',
      landscape: true,
      header: false,
      cssPage: true,
      title: 'Export drawings (A3 PDF)',
    });
    if (p) toast('Saved ' + p.split(/[\\/]/).pop());
    return p;
  }
  const w = window.open('', '_blank');
  if (!w) {
    saveFile(name.replace(/\.pdf$/, '.html'), html, 'text/html');
    return null;
  }
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 500);
  return null;
}

const VIEW_STATE = new Map(); // remembers the selected view of each structure between re-renders
/**
 * card containing the drawings of one structure: a view switcher (plan, sections, general arrangement, 3D …),
 * interactive model view or NWSDB A3 sheet, and DXF / SVG / PNG / PDF export of the view shown or of all views.
 * views = a single drawing or [{id, label, dw}]
 */
export function drawingCard(views, { height = 380, title, key } = {}) {
  if (!views) return null;
  const list = (Array.isArray(views) ? views : [{ id: 'v', label: 'Drawing', dw: views }]).filter((v) => v && v.dw);
  if (!list.length) return null;
  const sk = key || title || list[0].dw.title;
  const box = h('div');
  const meta = () => sheetMeta(store.project);
  let cur = list.find((v) => v.id === VIEW_STATE.get(sk)) || list[0];
  const num = (dw) => drawingNumber(store.project?.inputs?.setup, dw).replace(/\//g, '-');
  const base = (dw) => num(dw) + '-' + slug(dw.title);
  const exportSVG = () => saveFile(base(cur.dw) + '.svg', sheetSVG(cur.dw, meta()).svg, 'image/svg+xml');
  const exportDXF = () => saveFile(base(cur.dw) + '.dxf', sheetDXF(cur.dw, meta()), 'application/dxf');
  const exportPNG = async () => {
    const W = 4961,
      H = 3508; // A3 at 300 dpi
    const svg = sheetSVG(cur.dw, meta()).svg.replace('width="420mm" height="297mm"', `width="${W}" height="${H}"`);
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    g.drawImage(img, 0, 0, W, H);
    c.toBlob((b) => saveFile(base(cur.dw) + '.png', b, 'image/png'));
  };
  const exportPDF = () =>
    exportSheetsPDF(sheetsHTML([sheetSVG(cur.dw, meta()).svg], cur.dw.title), base(cur.dw) + '.pdf', cur.dw.title);
  const exportAll = () =>
    exportSheetsPDF(
      sheetsHTML(
        list.map((v, i) => sheetSVG(v.dw, sheetMeta(store.project, { sheet: i + 1, sheets: list.length })).svg),
        title || cur.dw.title,
      ),
      num(list[0].dw).replace(/-\d+$/, '') + '-' + slug(title || 'drawings') + '-all-views.pdf',
      title || cur.dw.title,
    );
  const seg = h('div', { class: 'seg dw-seg' });
  const tabs = h('div', { class: 'view-tabs' });
  const ttl = h('span', { class: 'view-title' });
  const draw = () => {
    const mode = store.settings.sheetView ? 'sheet' : 'model';
    seg.innerHTML = '';
    for (const [k, l] of [
      ['model', 'Model'],
      ['sheet', 'A3 sheet'],
    ])
      seg.append(
        h(
          'button',
          {
            class: mode === k ? 'on' : '',
            onclick: () => {
              store.settings.sheetView = k === 'sheet';
              saveSettings();
              draw();
            },
          },
          l,
        ),
      );
    tabs.innerHTML = '';
    if (list.length > 1)
      for (const v of list)
        tabs.append(
          h(
            'button',
            {
              class: 'vt' + (v === cur ? ' on' : ''),
              title: v.dw.title,
              onclick: () => {
                cur = v;
                VIEW_STATE.set(sk, v.id);
                draw();
              },
            },
            icon(
              /3D/i.test(v.label)
                ? 'shapes'
                : /arrangement/i.test(v.label)
                  ? 'grid'
                  : /section|profile/i.test(v.label)
                    ? 'layers'
                    : 'map',
            ),
            v.label,
          ),
        );
    ttl.textContent = `${cur.dw.title} · ${drawingNumber(store.project?.inputs?.setup, cur.dw)}`;
    box.innerHTML = '';
    box.className = '';
    if (mode === 'sheet') {
      const sh = sheetSVG(cur.dw, meta());
      box.className = 'sheet-view';
      box.innerHTML = sh.svg;
    } else if (cur.dw.scene3d) mount3D(box, cur.dw.scene3d, { height: Math.max(height, 500), title: cur.dw.title });
    else mountDrawing(box, cur.dw, { height: /arrangement/i.test(cur.label) ? Math.max(height, 460) : height });
  };
  const body = h('div', null, list.length > 1 ? h('div', { class: 'view-bar' }, tabs, ttl) : null, box);
  const el = card(title || list[0].dw.title, body, {
    flush: true,
    sub:
      list.length > 1
        ? `${list.length} views${list.some((v) => v.dw.scene3d) ? ' – plan, sections, general arrangement, 3D (rotate, dimensions)' : ''}`
        : drawingNumber(store.project?.inputs?.setup, list[0].dw),
    actions: [
      seg,
      h(
        'button',
        {
          class: 'btn sm ghost',
          title: 'Export this view to AutoCAD DXF (with NWSDB title block)',
          onclick: exportDXF,
        },
        icon('pen'),
        'DXF',
      ),
      h(
        'button',
        { class: 'btn sm ghost', title: 'Export this view as an A3 PDF sheet', onclick: exportPDF },
        icon('fileDown'),
        'PDF',
      ),
      h(
        'button',
        { class: 'btn sm ghost', title: 'Export this view as SVG', onclick: exportSVG },
        icon('image'),
        'SVG',
      ),
      h(
        'button',
        { class: 'btn sm ghost', title: 'Export this view as PNG (300 dpi)', onclick: exportPNG },
        icon('download'),
        'PNG',
      ),
      list.length > 1
        ? h(
            'button',
            { class: 'btn sm ghost', title: 'Export all views of this structure as one A3 PDF', onclick: exportAll },
            icon('copy'),
            'All views',
          )
        : null,
    ].filter(Boolean),
  });
  requestAnimationFrame(draw);
  el._dw = list[0].dw;
  el._dws = list;
  return el;
}
/** the drawings of one structure (all views) as a card; key = structure key of the drawing register */
export function structureCard(r, key, opts = {}) {
  const views = groupViews(r, key);
  if (!views.length) return null;
  return drawingCard(views, { key, ...opts, title: opts.title || `${groupTitle(r, key)} – drawings` });
}
/** card containing a chart */
export function chartCard(title, spec, { sub, tableData } = {}) {
  if (!spec) return null;
  const box = h('div');
  let tableMode = false;
  const toggle = h(
    'button',
    {
      class: 'btn sm ghost',
      title: 'Show data table',
      onclick: () => {
        tableMode = !tableMode;
        draw();
      },
    },
    icon('table'),
  );
  const csv = h(
    'button',
    {
      class: 'btn sm ghost',
      title: 'Export CSV',
      onclick: () => {
        const keys = [spec.x.key, ...spec.series.map((s) => s.key)];
        const lines = [
          [spec.x.label || spec.x.key, ...spec.series.map((s) => s.label)].join(','),
          ...spec.data.map((d) => keys.map((k) => d[k]).join(',')),
        ];
        saveFile(slug(title) + '.csv', lines.join('\n'), 'text/csv');
      },
    },
    icon('sheet'),
  );
  const draw = () => {
    box.innerHTML = '';
    if (tableMode) {
      box.append(
        table(
          [
            { k: spec.x.key, l: spec.x.label || spec.x.key },
            ...spec.series.map((s) => ({ k: s.key, l: s.label, num: true })),
          ],
          spec.data,
        ),
      );
    } else renderChart(box, spec);
  };
  const el = card(title, box, { sub, actions: [toggle, csv] });
  el._spec = spec;
  el._title = title;
  requestAnimationFrame(draw);
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    if (!box.isConnected) {
      ro.disconnect();
      return;
    }
    const w = box.clientWidth;
    if (Math.abs(w - lastW) > 20 && !tableMode) {
      lastW = w;
      draw();
    }
  });
  ro.observe(box);
  void tableData;
  return el;
}
