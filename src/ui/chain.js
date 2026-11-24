// Connections between the units of the plant: connection strip on every unit page, impact-of-last-change ripple
// panel, and the "Design chain & impact" page (water path, profiles through the train, what-if explorer,
// dependency matrix).
import { computeAll } from '../engine/index.js';
import { DEPENDS, KPI_ORDER, diffSnapshots, kpiSnapshot } from '../engine/chain.js';
import { fmt, fmtAuto } from '../core/util.js';
import { clear, h, icon } from './dom.js';
import { card, chartCard, kpis, table } from './results.js';
import { getInput, navigate, setInput, store, undo } from './store.js';
import { PAGES } from './pages/registry.js';
import { streamRows } from './draw/pfd.js';

const STAGE_ICON = { raw: 'droplets', intake: 'waves', aeration: 'wind', presed: 'layers', coag: 'flask', rapidmix: 'fan', floc: 'blend', sed: 'layers', filt: 'filter', dis: 'shield', stab: 'scale', cwr: 'database' };
const pageOf = (mod) => PAGES.find((p) => p.mod === mod && p.fields) || PAGES.find((p) => p.mod === mod);
const titleOf = (mod) => pageOf(mod)?.title || mod;
const go = (mod) => { const p = pageOf(mod); if (p) navigate(p.id); };
const f = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '–' : fmt(v, d));

/** compact description of the water state leaving a stage */
function stateLine(o, { q = true } = {}) {
  return [q ? `${f(o.Q)} m³/d` : null, o.wl !== null && o.wl !== undefined ? `WL ${f(o.wl, 2)}` : null, `${f(o.turb, o.turb < 10 ? 2 : 0)} NTU`, o.pH ? `pH ${f(o.pH, 2)}` : null, o.cl ? `Cl₂ ${f(o.cl, 1)}` : null].filter(Boolean);
}
const stStatus = (mod) => {
  const c = (store.results?.checks || []).filter((x) => x.module === mod);
  return c.some((x) => x.status === 'fail') ? 'fail' : c.some((x) => x.status === 'warn') ? 'warn' : 'ok';
};

// ------------------------------------------------------------------ connection strip on a unit page
export function connectionStrip(mod) {
  const r = store.results;
  const stages = r?.chain?.stages || [];
  const i = stages.findIndex((s) => s.mod === mod && s.key !== 'raw');
  const dep = DEPENDS[mod];
  const el = h('div', { class: 'conn' });
  if (i >= 0) {
    const s = stages[i], prev = stages[i - 1], next = stages[i + 1];
    const node = (st, role) => h('button', { class: 'cn-node ' + role + (role !== 'me' ? ' st-' + stStatus(st.mod) : ''), title: role === 'me' ? '' : `Open ${titleOf(st.mod)}`, onclick: role === 'me' ? null : () => go(st.mod) },
      h('div', { class: 'cn-k' }, role === 'from' ? 'Receives from' : role === 'to' ? 'Hands over to' : 'This unit'),
      h('div', { class: 'cn-t' }, icon(STAGE_ICON[st.key] || 'workflow'), st.label),
      role === 'me' ? h('div', { class: 'cn-s' }, st.size || '') : null);
    const pipe = (o, dir) => h('div', { class: 'cn-pipe' }, h('div', { class: 'cn-line' }, h('span')), h('div', { class: 'cn-vals' }, stateLine(o).map((t) => h('span', null, t))), dir ? h('div', { class: 'cn-arrow' }, icon('arrowRight')) : null);
    el.append(h('div', { class: 'cn-row' },
      prev ? node(prev, 'from') : h('div', { class: 'cn-node from ghost' }, h('div', { class: 'cn-k' }, 'Receives from'), h('div', { class: 'cn-t' }, 'Source')),
      pipe(prev ? prev.out : s.out, true),
      node(s, 'me'),
      next ? pipe(s.out, true) : null,
      next ? node(next, 'to') : h('div', { class: 'cn-node to ghost' }, h('div', { class: 'cn-k' }, 'Hands over to'), h('div', { class: 'cn-t' }, 'Distribution'))));
    const extra = [...(s.adds || []).map((a) => h('span', { class: 'cn-tag add' }, '+ ' + a)), ...(s.removes || []).map((a) => h('span', { class: 'cn-tag rem' }, '− ' + a))];
    if (extra.length) el.append(h('div', { class: 'cn-tags' }, extra));
  }
  if (dep) {
    el.append(h('div', { class: 'cn-deps' },
      dep.uses.length ? h('div', { class: 'cn-dl' }, h('span', { class: 'cn-dh' }, icon('arrowDown'), 'Uses results of'), dep.uses.map((m) => h('button', { class: 'cn-chip st-' + stStatus(m), onclick: () => go(m) }, titleOf(m)))) : null,
      h('div', { class: 'cn-dl' }, h('span', { class: 'cn-dh' }, icon('arrowRight'), 'Passes on'), dep.gives.map((g) => h('span', { class: 'cn-give' }, g)))));
  }
  return el.childNodes.length ? el : null;
}

// ------------------------------------------------------------------ impact of the last change
function fieldLabel(path) {
  const key = path.join('.');
  for (const p of PAGES) {
    for (const fd of p.fields || []) {
      if (!fd.k && !fd.path) continue;
      const fp = (fd.path || [p.mod, fd.k]).join('.');
      if (fp === key || (path.length > 2 && fp === path.slice(0, 2).join('.'))) return { label: fd.l || fd.title || fd.k, unit: fd.u || '', page: p };
    }
  }
  const p = pageOf(path[0]);
  return { label: path.slice(1).join(' › '), unit: '', page: p };
}
/** one-line description of a change: the caller's own wording, else "label: from → to unit" */
const changeText = (im) => { if (im.what) return im.what; const fl = fieldLabel(im.path); return `${fl.label}: ${valText(im.from)} → ${valText(im.to)}${fl.unit ? ' ' + fl.unit : ''}`; };
const valText = (v) => (v === null || v === undefined || v === '' ? 'auto' : typeof v === 'number' ? (v === 0 ? '0 (auto)' : fmtAuto(v)) : typeof v === 'boolean' ? (v ? 'yes' : 'no') : Array.isArray(v) || typeof v === 'object' ? 'table edited' : String(v));

/** ripple chain of affected stages, in train order */
function ripple(diff, srcMod) {
  const mods = [];
  for (const it of diff.items) if (!mods.includes(it.stage)) mods.push(it.stage);
  for (const s of diff.status) if (!mods.includes(s.stage)) mods.push(s.stage);
  const ord = (m) => { const i = KPI_ORDER.indexOf(m); return i < 0 ? 99 : i; };
  mods.sort((a, b) => ord(a) - ord(b));
  if (srcMod && !mods.includes(srcMod)) mods.unshift(srcMod);
  return h('div', { class: 'rip' }, mods.map((m, i) => [
    i ? h('span', { class: 'rip-ar' }, icon('arrowRight')) : null,
    h('button', { class: 'rip-n' + (m === srcMod ? ' src' : '') + ' st-' + stStatus(m), style: { animationDelay: `${i * 90}ms` }, onclick: () => go(m) }, titleOf(m), h('span', { class: 'rip-c' }, diff.items.filter((x) => x.stage === m).length || '')),
  ]).flat().filter(Boolean));
}
function diffList(diff, { max = 60 } = {}) {
  const rows = [];
  let last = null;
  for (const it of diff.items.slice(0, max)) {
    if (it.stage !== last) { rows.push(h('div', { class: 'df-h' }, titleOf(it.stage))); last = it.stage; }
    const up = it.to !== null && it.from !== null && it.to > it.from;
    rows.push(h('div', { class: 'df-r' }, h('span', { class: 'df-l' }, it.label),
      h('span', { class: 'df-v' }, `${it.from === null ? '–' : fmt(it.from, it.dp)} → `, h('b', null, it.to === null ? '–' : fmt(it.to, it.dp)), it.unit ? ` ${it.unit}` : ''),
      h('span', { class: 'df-p ' + (up ? 'up' : 'dn') }, it.pct === null ? '' : [icon(up ? 'arrowUp' : 'arrowDown'), `${fmt(Math.abs(it.pct), Math.abs(it.pct) < 10 ? 1 : 0)} %`])));
  }
  for (const s of diff.status) {
    const df = s.fail[1] - s.fail[0], dw = s.warn[1] - s.warn[0];
    const txt = [df ? `${df > 0 ? '+' : ''}${df} failing` : null, dw ? `${dw > 0 ? '+' : ''}${dw} to review` : null].filter(Boolean).join(', ');
    if (txt) rows.push(h('div', { class: 'df-r st ' + (df > 0 ? 'fail' : dw > 0 ? 'warn' : 'ok') }, h('span', { class: 'df-l' }, icon(df > 0 ? 'fail' : dw > 0 ? 'warn' : 'ok'), `${titleOf(s.stage)} checks`), h('span', { class: 'df-v' }, txt), h('span')));
  }
  return h('div', { class: 'df' }, rows);
}

/** compact impact summary of the last change (dashboard) */
export function impactSummary() {
  const im = store.impact;
  if (!im?.diff) return null;
  return h('div', null, h('div', { class: 'small', style: { marginBottom: '6px' } }, changeText(im)),
    ripple(im.diff, im.path[0] === 'setup' ? 'demand' : im.path[0]), diffList({ items: im.diff.items.slice(0, 10), status: im.diff.status }));
}

let dock = null;
let dockOpen = true;
let lastIm = null;
let lastPage = null;
export function mountImpactDock() {
  dock = h('div', { class: 'impact-dock' });
  document.body.append(dock);
  updateImpactDock();
}
export function updateImpactDock() {
  if (!dock) return;
  const im = store.impact;
  if (im && im !== lastIm) { dockOpen = true; lastIm = im; lastPage = store.page; }
  else if (store.page !== lastPage) { dockOpen = false; lastPage = store.page; }
  clear(dock);
  const items = im?.diff ? im.diff.items.length + im.diff.status.length : 0;
  if (!im || !im.diff || im.closed || store.page === 'chain' || JSON.stringify(im.from) === JSON.stringify(im.to)) { dock.style.display = 'none'; return; }
  dock.style.display = '';
  const src = im.path[0] === 'setup' ? 'demand' : im.path[0];
  const head = h('div', { class: 'id-h', onclick: () => { dockOpen = !dockOpen; updateImpactDock(); } },
    h('span', { class: 'id-ic' }, icon('activity')),
    h('div', { class: 'id-t' }, h('b', null, 'Impact of your last change'), h('span', null, changeText(im))),
    h('span', { class: 'id-n' }, items ? `${items} result${items > 1 ? 's' : ''} changed` : 'no knock-on effect'),
    h('button', { class: 'id-x', title: dockOpen ? 'Collapse' : 'Expand', onclick: (e) => { e.stopPropagation(); dockOpen = !dockOpen; updateImpactDock(); } }, icon(dockOpen ? 'chevronDown' : 'chevronRight')),
    h('button', { class: 'id-x', title: 'Close', onclick: (e) => { e.stopPropagation(); im.closed = true; updateImpactDock(); } }, icon('x')));
  dock.append(head);
  dock.classList.toggle('open', dockOpen);
  if (!dockOpen) return;
  dock.append(h('div', { class: 'id-b' },
    items ? ripple(im.diff, src) : h('div', { class: 'muted small', style: { padding: '6px 2px' } }, 'None of the key downstream results changed by more than rounding.'),
    items ? diffList(im.diff, { max: 24 }) : null,
    h('div', { class: 'id-f' },
      h('button', { class: 'btn sm ghost', onclick: () => undo() }, icon('undo'), 'Undo change'),
      h('button', { class: 'btn sm', onclick: () => navigate('chain') }, icon('workflow'), 'Open design chain'))));
}

// ------------------------------------------------------------------ what-if explorer
const WHATIF = [
  { path: ['demand', 'capacity'], l: 'Plant capacity (specified)', u: 'm³/d', show: (i) => i.demand?.basis === 'capacity', base: (r) => r.demand.Qd, step: 500, min: 500 },
  { path: ['demand', 'lpcd'], l: 'Per-capita demand', u: 'L/c/d', show: (i) => i.demand?.basis !== 'capacity', base: (r) => r.demand.lpcd, step: 5, min: 40 },
  { path: ['demand', 'nTrains'], l: 'Number of treatment trains', u: '', base: (r) => r.demand.nTrains, step: 1, min: 1, max: 6 },
  { path: ['quality', 'values', 'turb', 1], l: 'Design (peak) raw turbidity', u: 'NTU', base: (r) => r.quality.turbMax, step: 10, min: 1 },
  { path: ['sed', 'sor'], l: 'Sedimentation overflow rate', u: 'm³/m²·d', base: (r) => r.sed?.sorAct, step: 1, min: 5, show: (i, r) => r.sed?.enabled && !r.sed.plain },
  { path: ['sed', 'depth'], l: 'Sedimentation depth', u: 'm', base: (r) => r.sed?.H, step: 0.1, min: 2, show: (i, r) => r.sed?.enabled },
  { path: ['filt', 'rate'], l: 'Filtration rate', u: 'm/h', base: (r) => r.filt?.rate, step: 0.25, min: 0.1 },
  { path: ['dis', 'residual'], l: 'Free chlorine residual', u: 'mg/L', base: (r) => r.dis?.C, step: 0.05, min: 0.2, max: 2 },
  { path: ['dis', 'hrt'], l: 'Chlorine contact time', u: 'min', base: (r) => r.dis?.hrtNom, step: 1, min: 10 },
  { path: ['storage', 'cwrHours'], l: 'Clear-water storage', u: 'h', base: (r) => r.storage?.inputs?.cwrHours, step: 0.5, min: 1 },
];
function whatIfCard() {
  const r = store.results;
  const inp = store.project.inputs;
  const opts = WHATIF.filter((w) => (w.show ? w.show(inp, r) : true) && Number.isFinite(+w.base(r)));
  let sel = opts[0];
  const out = h('div');
  const selEl = h('select', { class: 'wi-sel' }, opts.map((w, i) => h('option', { value: i }, w.l)));
  const slider = h('input', { type: 'range', class: 'wi-range' });
  const numEl = h('input', { type: 'number', class: 'wi-num', step: 'any' });
  const unitEl = h('span', { class: 'muted small' });
  const baseEl = h('span', { class: 'small muted' });
  let val = null, timer = null;
  const setup = () => {
    const b = +sel.base(r);
    const lo = Math.max(sel.min ?? 0, b * 0.4), hi = sel.max ?? Math.max(b * 1.8, lo + sel.step * 4);
    slider.min = lo; slider.max = hi; slider.step = sel.step; slider.value = b;
    numEl.value = +b.toFixed(3); unitEl.textContent = sel.u; baseEl.textContent = `current design: ${fmtAuto(b)} ${sel.u}`;
    val = b; run();
  };
  const run = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const b = +sel.base(r);
      clear(out);
      if (Math.abs(val - b) < 1e-9) { out.append(h('div', { class: 'muted small', style: { padding: '10px 2px' } }, 'Move the slider (or type a value) to see how the change ripples through every downstream unit – nothing is changed in your design until you press Apply.')); return; }
      const p = JSON.parse(JSON.stringify(store.project));
      let o = p.inputs;
      for (let k = 0; k < sel.path.length - 1; k++) { if (o[sel.path[k]] === undefined || o[sel.path[k]] === null) o[sel.path[k]] = {}; o = o[sel.path[k]]; }
      o[sel.path[sel.path.length - 1]] = val;
      const r2 = computeAll(p);
      const diff = diffSnapshots(kpiSnapshot(r), kpiSnapshot(r2));
      out.append(ripple(diff, sel.path[0] === 'demand' || sel.path[0] === 'quality' ? sel.path[0] : sel.path[0]), diffList(diff),
        h('div', { class: 'flex', style: { marginTop: '10px' } },
          h('button', { class: 'btn primary sm', onclick: () => { setInput(sel.path, val, { immediate: true }); } }, icon('ok'), `Apply ${fmtAuto(val)} ${sel.u} to the design`),
          h('span', { class: 'small muted' }, `Summary after change: ${r2.summary.ok} pass · ${r2.summary.warn} review · ${r2.summary.fail} fail`)));
    }, 60);
  };
  selEl.addEventListener('change', () => { sel = opts[+selEl.value]; setup(); });
  slider.addEventListener('input', () => { val = +slider.value; numEl.value = +val.toFixed(3); run(); });
  numEl.addEventListener('input', () => { const v = parseFloat(numEl.value); if (Number.isFinite(v)) { val = v; slider.value = v; run(); } });
  setup();
  return card('What-if: change an upstream decision and see the knock-on effects', h('div', null,
    h('div', { class: 'wi-ctl' }, selEl, slider, h('div', { class: 'inp', style: { width: '150px' } }, numEl, h('span', { class: 'u' }, unitEl)), baseEl), out), { sub: 'live re-calculation of the whole plant' });
}

// ------------------------------------------------------------------ dependency matrix
function depMatrix() {
  const mods = KPI_ORDER.filter((m) => DEPENDS[m] && pageOf(m) && (m !== 'aeration' || store.results.process?.has?.aeration));
  const t = h('table', { class: 'dep' });
  t.append(h('tr', null, h('th', { class: 'dep-c' }, h('span', null, 'uses →')), mods.map((m) => h('th', { class: 'dep-v', title: titleOf(m) }, h('span', null, titleOf(m))))));
  for (const row of mods) {
    t.append(h('tr', null, h('th', { class: 'dep-r', onclick: () => go(row) }, titleOf(row)), mods.map((col) => {
      const uses = DEPENDS[row].uses.includes(col);
      return h('td', { class: uses ? 'on' : row === col ? 'self' : '', title: uses ? `${titleOf(row)} uses results of ${titleOf(col)}` : '' }, uses ? h('span', { class: 'dep-dot' }) : '');
    })));
  }
  return t;
}

// ------------------------------------------------------------------ water path (stage cards)
export function waterPath(r, { compact = false } = {}) {
  const stages = r.chain?.stages || [];
  const el = h('div', { class: 'wpath' + (compact ? ' compact' : '') });
  stages.forEach((s, i) => {
    if (i) el.append(h('div', { class: 'wp-link' }, h('div', { class: 'wp-flow' }, h('span')), compact ? null : h('div', { class: 'wp-lv' }, stateLine(stages[i - 1].out, { q: false }).slice(0, 2).map((t) => h('span', null, t)))));
    el.append(h('button', { class: 'wp-card st-' + stStatus(s.mod), onclick: () => go(s.mod), title: `Open ${titleOf(s.mod)}` },
      h('div', { class: 'wp-ic' }, icon(STAGE_ICON[s.key] || 'workflow')),
      h('div', { class: 'wp-t' }, s.label),
      compact ? null : h('div', { class: 'wp-s' }, s.size || ''),
      h('div', { class: 'wp-q' }, `${f(s.out.Q)} m³/d`),
      h('div', { class: 'wp-m' }, h('span', null, `${f(s.out.turb, s.out.turb < 10 ? 2 : 0)} NTU`), s.out.pH ? h('span', null, `pH ${f(s.out.pH, 1)}`) : null),
      compact ? null : h('div', { class: 'wp-tags' }, (s.adds || []).slice(0, 2).map((a) => h('span', { class: 'cn-tag add' }, '+ ' + a.split(' (')[0])), (s.removes || []).slice(0, 1).map((a) => h('span', { class: 'cn-tag rem' }, '− ' + a))),
      h('span', { class: 'dot ' + stStatus(s.mod) })));
  });
  return el;
}

// ------------------------------------------------------------------ the page
export const chainPage = {
  report(r) {
    const ch = r.chain || { stages: [], profile: [] };
    const prof = ch.profile;
    const stream = streamRows(r);
    return [
      h('p', null, 'The units of the plant are designed as one connected system: every unit is sized from the flow, water level and water quality it receives from the unit upstream, and its own results are passed on to the units downstream. The tables below follow the water through the train (values are for the water leaving each unit) and list which units use the results of which.'),
      card('Process streams', table([{ k: 'n', l: 'Stream' }, { k: 'from', l: 'From → to', v: (x) => `${x.from} → ${x.to}` }, { k: 'Q', l: 'Flow (m³/d)', num: true, v: (x) => f(x.Q) }, { k: 'wl', l: 'WL (m MSL)', num: true, v: (x) => f(x.wl, 2) }, { k: 'turb', l: 'Turbidity (NTU)', num: true, v: (x) => f(x.turb, x.turb < 10 ? 2 : 0) }, { k: 'pH', l: 'pH', num: true, v: (x) => f(x.pH, 2) }, { k: 'cl', l: 'Cl₂ (mg/L)', num: true, v: (x) => f(x.cl, 1) }], stream), { flush: true }),
      card('Flow & quality balance', table([
        { k: 'label', l: 'Leaving unit' }, { k: 'Q', l: 'Flow (m³/d)', num: true, v: (s) => f(s.out.Q) }, { k: 'turb', l: 'Turbidity peak / avg (NTU)', num: true, v: (s) => `${f(s.out.turb, s.out.turb < 10 ? 2 : 0)} / ${f(s.out.turbAvg, s.out.turbAvg < 10 ? 2 : 0)}` },
        { k: 'pH', l: 'pH', num: true, v: (s) => f(s.out.pH, 2) }, { k: 'alk', l: 'Alk. (mg/L)', num: true, v: (s) => f(s.out.alk, 1) }, { k: 'size', l: 'Main size', v: (s) => h('span', { class: 'small' }, s.size || '') },
        { k: 'adds', l: 'Adds / removes', v: (s) => h('span', { class: 'small' }, [...(s.adds || []).map((a) => '+ ' + a.replace(/ \(.*?\)/, '')), ...(s.removes || []).map((a) => '− ' + a)].join('; ')) },
      ], ch.stages), { flush: true }),
      h('div', { class: 'grid2' },
        chartCard('Turbidity through the train', { type: 'line', data: prof, x: { key: 'label', type: 'band' }, y: { label: 'Turbidity (NTU, log scale)', type: 'log' }, series: [{ key: 'turb', label: 'Design (peak)' }, { key: 'turbAvg', label: 'Average' }], refs: [{ value: 2, label: 'SLS 614: 2 NTU', kind: 'limit', legend: true }], unit: 'NTU', height: 260 }),
        chartCard('Water level through the train', { type: 'line', data: prof.filter((p) => p.wl !== null && p.wl !== undefined), x: { key: 'label', type: 'band' }, y: { label: 'Water level (m MSL)', zero: false }, series: [{ key: 'wl', label: 'Water level' }], unit: 'm', height: 260 })),
      card('Dependencies between units', table([{ k: 'u', l: 'Unit' }, { k: 'uses', l: 'Designed with the results of' }, { k: 'gives', l: 'Passes on' }], KPI_ORDER.filter((m) => DEPENDS[m] && pageOf(m)).map((m) => ({ u: titleOf(m), uses: DEPENDS[m].uses.map(titleOf).join(', ') || '— (design input)', gives: DEPENDS[m].gives.join('; ') }))), { flush: true }),
    ];
  },
  id: 'chain', title: 'Design chain & impact', sub: 'How each unit feeds the next – water path, levels, quality through the train, knock-on effects of every decision', icon: 'workflow', group: 'Project', layout: 'full',
  renderFull(r) {
    const ch = r.chain || { stages: [], profile: [] };
    const prof = ch.profile.filter((p) => p.key !== 'raw' || true);
    const lastImpact = store.impact?.diff && (store.impact.diff.items.length || store.impact.diff.status.length);
    const loss = ch.stages.length ? ch.stages[1]?.out.Q - ch.product : 0;
    return [
      kpis([
        { label: 'Raw water abstracted', value: f(ch.stages[1]?.out.Q ?? r.demand.Qd), unit: 'm³/d', accent: true, icon: 'waves' },
        { label: 'Net treated water to supply', value: f(ch.product), unit: 'm³/d', sub: `losses ${f(loss)} m³/d (${f((loss / (ch.stages[1]?.out.Q || 1)) * 100, 1)} %)`, icon: 'droplets' },
        { label: 'Units in the water path', value: ch.stages.length - 1, unit: '', sub: r.process.route, icon: 'workflow' },
        { label: 'Head through the plant', value: f(r.hyd?.totalHead, 2), unit: 'm', sub: `inlet ${f(r.hyd?.inletWL, 2)} → CWR ${f(r.hyd?.cwrTWL, 2)} m MSL`, icon: 'activity' },
        { label: 'Turbidity removal', value: f((1 - (ch.stages.at(-1)?.out.turb || 0) / (ch.stages[0]?.out.turb || 1)) * 100, 2), unit: '%', sub: `${f(ch.stages[0]?.out.turb)} → ${f(ch.stages.at(-1)?.out.turb, 2)} NTU (peak)`, icon: 'filter' },
      ]),
      card('Water path through the plant', waterPath(r), { sub: 'click a unit to open it · values are the water leaving each unit', flush: true }),
      lastImpact ? card(`Impact of your last change – ${changeText(store.impact)}`, h('div', null, ripple(store.impact.diff, store.impact.path[0]), diffList(store.impact.diff)), { sub: 'compared with the design before the change' }) : null,
      whatIfCard(),
      h('div', { class: 'grid2' },
        chartCard('Turbidity through the train', { type: 'line', data: prof, x: { key: 'label', type: 'band' }, y: { label: 'Turbidity (NTU, log scale)', type: 'log' }, series: [{ key: 'turb', label: 'Design (peak)' }, { key: 'turbAvg', label: 'Average' }], refs: [{ value: 2, label: 'SLS 614: 2 NTU', kind: 'limit', legend: true }, { value: 0.3, label: 'D3 filtered < 0.3 NTU', kind: 'target', legend: true }], unit: 'NTU', height: 300 }),
        chartCard('Water level through the train (hydraulic grade)', { type: 'line', data: prof.filter((p) => p.wl !== null && p.wl !== undefined), x: { key: 'label', type: 'band' }, y: { label: 'Water level (m MSL)', zero: false }, series: [{ key: 'wl', label: 'Water level' }], unit: 'm', height: 300 }),
        chartCard('pH through the train', { type: 'line', data: prof.filter((p) => p.pH), x: { key: 'label', type: 'band' }, y: { label: 'pH', zero: false }, series: [{ key: 'pH', label: 'pH' }], bands: [{ from: 6.5, to: 8.5, label: 'SLS 614 6.5–8.5' }], unit: '', height: 290 }),
        chartCard('Alkalinity through the train', { type: 'line', data: prof.filter((p) => p.alk), x: { key: 'label', type: 'band' }, y: { label: 'Alkalinity (mg/L CaCO₃)', min: 0 }, series: [{ key: 'alk', label: 'Alkalinity' }], refs: [{ value: 50, label: 'D3 stability ≥ 50', kind: 'target' }], unit: 'mg/L', height: 290 })),
      card('Flow & quality balance', table([
        { k: 'label', l: 'Leaving unit', v: (s) => h('a', { href: '#', onclick: (e) => { e.preventDefault(); go(s.mod); } }, s.label) },
        { k: 'Q', l: 'Flow (m³/d)', num: true, v: (s) => f(s.out.Q) },
        { k: 'wl', l: 'WL (m MSL)', num: true, v: (s) => f(s.out.wl, 2) },
        { k: 'turb', l: 'Turbidity peak / avg (NTU)', num: true, v: (s) => `${f(s.out.turb, s.out.turb < 10 ? 2 : 0)} / ${f(s.out.turbAvg, s.out.turbAvg < 10 ? 2 : 0)}` },
        { k: 'pH', l: 'pH', num: true, v: (s) => f(s.out.pH, 2) },
        { k: 'alk', l: 'Alk. (mg/L)', num: true, v: (s) => f(s.out.alk, 1) },
        { k: 'cl', l: 'Cl₂ (mg/L)', num: true, v: (s) => f(s.out.cl, 1) },
        { k: 'adds', l: 'Adds', v: (s) => h('span', { class: 'small' }, (s.adds || []).map((a) => a.replace(/ \(.*?\)/, '')).join(', ')) },
        { k: 'rem', l: 'Removes', v: (s) => h('span', { class: 'small' }, (s.removes || []).join(', ')) },
      ], ch.stages), { flush: true }),
      card('Dependency matrix – which unit uses the results of which', h('div', { class: 'dep-wrap' }, depMatrix(), h('p', { class: 'small muted', style: { margin: '8px 2px 0' } }, 'Read across a row: the unit on the left is designed with the results of every unit marked in its row. A change in a column therefore ripples to every marked row – the What-if explorer and the Impact panel show the actual numbers.')), { sub: 'click a unit name to open it' }),
    ];
  },
};
