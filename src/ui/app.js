// Application shell: title bar, navigation, page rendering, file operations, shortcuts
import { worstStatus } from '../core/calc.js';
import { fmt } from '../core/util.js';
import { newProject } from '../engine/index.js';
import { bannerImg, emblemImg } from './brand.js';
import { clear, h, icon, modal, popupMenu, toast } from './dom.js';
import { renderForm } from './form.js';
import { GROUPS, PAGES } from './pages/registry.js';
import { calcSheet, checksTable, notes, saveFile } from './results.js';
import { SAMPLES } from './samples.js';
import { loadAutosave, markSaved, navigate, normalise, on, redo, resetModule, saveSettings, setProject, store, undo } from './store.js';
import { buildWorkbook } from './xlsx.js';
import { defaultHint, fieldFor, locate } from './locate.js';
import { connectionStrip, mountImpactDock, updateImpactDock } from './chain.js';

const isElectron = !!window.wtp;
let els = {};
const ui = { tab: {}, scroll: {}, collapsed: false };

// ------------------------------------------------------------------ theme
function applyTheme() {
  const t = store.settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : store.settings.theme;
  document.documentElement.dataset.theme = t;
  window.wtp?.setTheme?.(t);
  if (els.logo) els.logo.innerHTML = store.settings.logo ? `<img src="${store.settings.logo}" style="width:28px;height:28px;object-fit:contain">` : emblemImg(28);
}
window.addEventListener('wtp-theme', applyTheme);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// ------------------------------------------------------------------ file operations
async function confirmDiscard() {
  if (!store.dirty) return true;
  const a = await modal('Unsaved changes', 'The current project has unsaved changes. Save before continuing?', [{ label: 'Cancel', value: 'cancel' }, { label: "Don't save", value: 'discard' }, { label: 'Save', primary: true, value: 'save' }]);
  if (a === 'save') return !!(await saveProject());
  return a === 'discard';
}
export async function newProj(sample) {
  if (!(await confirmDiscard())) return;
  const p = sample ? sample.build() : newProject();
  if (store.settings.designer && !p.inputs.setup.designer) p.inputs.setup.designer = store.settings.designer;
  setProject(p, null);
  navigate(sample ? 'dashboard' : 'setup');
  toast(sample ? `Loaded sample: ${sample.title}` : 'New project created');
}
export async function openProj() {
  if (!(await confirmDiscard())) return;
  if (isElectron) {
    const res = await window.wtp.openProject();
    if (res) loadText(res.content, res.path);
    return;
  }
  const inp = h('input', { type: 'file', accept: '.wtpd,.json' });
  inp.addEventListener('change', async () => { const f = inp.files[0]; if (f) loadText(await f.text(), f.name); });
  inp.click();
}
function loadText(text, path) {
  try {
    const p = JSON.parse(text);
    if (!p.inputs) throw new Error('Not a WTP Designer project file');
    setProject(normalise(p), path);
    if (store.project.migratedRB2025) { delete store.project.migratedRB2025; setTimeout(() => toast('Unit rates, chemical prices and the CEB tariff were updated to the NWSDB Rate Book 2025', 'info'), 600); }
    navigate('dashboard');
    toast('Opened ' + String(path).split(/[\\/]/).pop());
  } catch (e) { modal('Could not open file', String(e.message)); }
}
export async function saveProject(saveAs = false) {
  const content = JSON.stringify({ ...store.project, saved: new Date().toISOString() }, null, 1);
  const name = (store.project.inputs.setup.code || 'project') + '.wtpd';
  if (isElectron) {
    const p = await window.wtp.saveProject(content, saveAs ? null : store.filePath, name);
    if (p) { markSaved(p); toast('Saved ' + p.split(/[\\/]/).pop(), 'save'); }
    return p;
  }
  await saveFile(name, content, 'application/json');
  markSaved(name);
  return name;
}
async function exportExcel() {
  const data = await buildWorkbook();
  await saveFile((store.project.inputs.setup.code || 'WTP') + '-design.xlsx', new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function fileMenu(anchor) {
  popupMenu(anchor, [
    { label: 'New project', icon: 'newfile', kbd: 'Ctrl+N', action: () => newProj() },
    { label: 'Open…', icon: 'open', kbd: 'Ctrl+O', action: openProj },
    { label: 'Save', icon: 'save', kbd: 'Ctrl+S', action: () => saveProject() },
    { label: 'Save as…', icon: 'save', kbd: 'Ctrl+Shift+S', action: () => saveProject(true) },
    '-', { header: 'Sample projects' },
    ...SAMPLES.map((s) => ({ label: s.title, icon: 'sparkles', action: () => newProj(s) })),
    '-',
    { label: 'Design report (PDF)…', icon: 'fileDown', kbd: 'Ctrl+P', action: () => navigate('report') },
    { label: 'Export Excel workbook', icon: 'sheet', kbd: 'Ctrl+E', action: exportExcel },
    '-',
    { label: 'Settings', icon: 'settings', action: () => navigate('settings') },
    ...(isElectron ? [{ label: 'Exit', icon: 'x', action: () => window.wtp.quit() }] : []),
  ]);
}

// ------------------------------------------------------------------ shell
function buildShell(root) {
  els.logo = h('span', { class: 'logo-slot' });
  els.undo = h('button', { class: 'tb-btn', title: 'Undo (Ctrl+Z)', onclick: undo }, icon('undo'));
  els.redo = h('button', { class: 'tb-btn', title: 'Redo (Ctrl+Y)', onclick: redo }, icon('redo'));
  els.pname = h('span', { class: 'pname' });
  els.dirty = h('span', { class: 'dirty' }, 'unsaved');
  const fileBtn = h('button', { class: 'tb-btn', onclick: (e) => fileMenu(e.currentTarget) }, icon('menu'), 'File');
  const themeBtn = h('button', { class: 'tb-btn', title: 'Toggle light / dark', onclick: () => { store.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applyTheme(); renderMain(); } }, icon('moon'));
  const titlebar = h('div', { class: 'titlebar' },
    h('div', { class: 'brand' }, els.logo, h('span', null, 'NWSDB'), h('small', null, 'WTP Designer')),
    h('span', { class: 'sep' }), fileBtn,
    h('button', { class: 'tb-btn', title: 'Save (Ctrl+S)', onclick: () => saveProject() }, icon('save')),
    els.undo, els.redo, h('span', { class: 'sep' }),
    h('div', { class: 'proj' }, icon('droplets'), els.pname, els.dirty),
    h('div', { class: 'spacer' }),
    h('button', { class: 'tb-btn', title: 'Design report', onclick: () => navigate('report') }, icon('file'), 'Report'),
    themeBtn);
  els.sidebar = h('nav', { class: 'sidebar' });
  els.main = h('main', { class: 'main' });
  els.body = h('div', { class: 'body' }, els.sidebar, els.main);
  els.status = h('div', { class: 'statusbar' });
  root.append(titlebar, els.body, els.status);
}

function renderSidebar() {
  const r = store.results;
  clear(els.sidebar);
  for (const g of GROUPS) {
    els.sidebar.append(h('div', { class: 'grp-h' }, g));
    for (const p of PAGES.filter((x) => x.group === g)) {
      const enabled = p.enabled ? p.enabled(r) : true;
      const res = p.mod ? r[p.mod] : null;
      let st = 'na';
      if (p.id === 'checks') st = r.summary.fail ? 'fail' : r.summary.warn ? 'warn' : 'ok';
      else if (p.id === 'compliance') st = r.compliance?.fails.length ? 'fail' : 'ok';
      else if (res && enabled && res.checks) st = res.checks.length ? worstStatus(res.checks) : 'ok';
      if (r.errors?.[p.mod]) st = 'fail';
      els.sidebar.append(h('div', { class: 'nav' + (store.page === p.id ? ' active' : '') + (enabled ? '' : ' disabled'), title: p.title, onclick: () => navigate(p.id) }, icon(p.icon), h('span', { class: 'lbl' }, p.title), p.mod || p.id === 'checks' || p.id === 'compliance' ? h('span', { class: 'dot ' + (enabled ? st : 'na') }) : null));
    }
  }
  els.sidebar.append(h('div', { class: 'nav', style: { marginTop: '14px' }, onclick: () => { ui.collapsed = !ui.collapsed; els.body.classList.toggle('collapsed', ui.collapsed); } }, icon(ui.collapsed ? 'chevronRight' : 'menu'), h('span', { class: 'lbl' }, 'Collapse sidebar')));
}

function renderStatus() {
  const r = store.results;
  clear(els.status).append(...[
    h('span', { class: 'sb' }, icon('droplets'), `${fmt(r.demand.Qd, 0)} m³/d (${fmt(r.demand.Qd / 1000, 1)} MLD)`),
    h('span', { class: 'sb' }, icon('thermo'), `${r.quality.T} °C`),
    h('span', { class: 'sb' }, icon('pin'), store.project.inputs.setup.district),
    h('span', { class: 'sb' }, h('span', { class: 'dot ok' }), `${r.summary.ok} pass`), h('span', { class: 'sb' }, h('span', { class: 'dot warn' }), `${r.summary.warn} review`), h('span', { class: 'sb' }, h('span', { class: 'dot fail' }), `${r.summary.fail} fail`),
    h('span', { class: 'grow' }),
    Object.keys(r.errors || {}).length ? h('span', { class: 'sb', style: { color: 'var(--fail)' } }, icon('warn'), 'Calculation error in: ' + Object.keys(r.errors).join(', ')) : null,
    h('span', { class: 'sb' }, `recalc ${fmt(store.calcMs, 0)} ms`),
    h('span', { class: 'sb' }, 'SI units · SLS 614:2013'),
    h('span', { class: 'sb' }, store.filePath ? String(store.filePath).split(/[\\/]/).pop() : 'not saved')].filter(Boolean));
  els.pname.textContent = store.project.inputs.setup.name || 'Untitled project';
  els.dirty.style.display = store.dirty ? '' : 'none';
  els.undo.disabled = !store.history.length && !store.dirty;
  els.redo.disabled = !store.future.length;
  const title = `${store.dirty ? '• ' : ''}${store.project.inputs.setup.name} – NWSDB WTP Designer`;
  document.title = title;
  window.wtp?.setTitle?.(title, store.dirty);
}

let current = null; // { page, form, out, tabsEl }
function renderMain() {
  const page = PAGES.find((p) => p.id === store.page) || PAGES[0];
  const r = store.results;
  const keepScroll = current?.page?.id === page.id && current.body ? current.body.scrollTop : 0;
  clear(els.main);
  const idx = PAGES.indexOf(page);
  const prev = PAGES[idx - 1], next = PAGES[idx + 1];
  const actions = h('div', { class: 'actions' },
    page.mod && page.fields ? h('button', { class: 'btn ghost sm', title: 'Reset this page to default inputs', onclick: async () => { const a = await modal('Reset inputs', `Reset all inputs of “${page.title}” to defaults?`, [{ label: 'Cancel', value: false }, { label: 'Reset', primary: true, value: true }]); if (a) resetModule(page.mod); } }, icon('reset'), 'Defaults') : null,
    prev ? h('button', { class: 'btn ghost sm', title: prev.title, onclick: () => navigate(prev.id) }, icon('chevronRight', 'flip'), 'Back') : null,
    next ? h('button', { class: 'btn sm', title: next.title, onclick: () => navigate(next.id) }, 'Next: ' + next.title, icon('arrowRight')) : null);
  const back = actions.querySelector('.flip'); if (back) back.style.transform = 'rotate(180deg)';
  els.main.append(h('div', { class: 'page-h' }, h('div', { class: 'pi' }, icon(page.icon)), h('div', null, h('h1', null, page.title), h('div', { class: 'sub' }, page.sub || '')), actions));
  const body = h('div', { class: 'page-b' });
  els.main.append(body);
  current = { page, body };
  if (page.renderFull) {
    const full = h('div', { class: 'full' });
    body.append(full);
    try { full.append(...page.renderFull(r).filter(Boolean)); } catch (e) { full.append(errorBox(e)); console.error(e); }
    current.full = full;
    if (keepScroll) body.scrollTop = keepScroll;
    return;
  }
  const split = h('div', { class: 'split' + (page.wideLeft ? ' wide-left' : '') });
  body.style.overflow = 'hidden';
  body.append(split);
  const form = renderForm(page.mod, page.fields || []);
  const inPane = h('div', { class: 'pane-in' }, form.el);
  const outPane = h('div', { class: 'pane-out' });
  split.append(inPane, outPane);
  current.form = form;
  current.out = outPane;
  renderResults();
}
function errorBox(e) { return notes([{ level: 'fail', text: 'This page could not be rendered: ' + (e?.message || e) }]); }

function renderResults() {
  if (!current?.out) return;
  const { page, out } = current;
  const r = store.results;
  const scroll = out.scrollTop;
  clear(out);
  if (r.errors?.[page.mod]) out.append(notes([{ level: 'fail', text: `Calculation error: ${r.errors[page.mod].split('\n')[0]}` }]));
  if (page.enabled && !page.enabled(r)) {
    out.append(h('div', { class: 'empty' }, h('div', { style: { fontSize: '15px', marginBottom: '10px' } }, `${page.title} is not part of the selected treatment train.`), h('button', { class: 'btn primary', onclick: () => navigate('process') }, icon('workflow'), 'Open process selection')));
    return;
  }
  let o;
  try { o = page.render(r) || {}; } catch (e) { out.append(errorBox(e)); console.error(e); return; }
  const res = page.mod ? r[page.mod] : null;
  const tabs = [['overview', 'Results', o.overview]];
  if (o.visuals?.filter(Boolean).length) tabs.push(['visuals', 'Charts', o.visuals]);
  if (res?.checks) tabs.push(['checks', 'Checks', null, res.checks.length]);
  if (res?.steps?.length) tabs.push(['calc', 'Calculation sheet', null]);
  let tab = ui.tab[page.id] || 'overview';
  if (!tabs.find((t) => t[0] === tab)) tab = 'overview';
  const tabBar = h('div', { class: 'tabs' }, tabs.map(([k, l, , cnt]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { ui.tab[page.id] = k; renderResults(); } }, l, cnt !== undefined ? h('span', { class: 'cnt' }, cnt) : null,
    k === 'checks' && res.checks.some((c) => c.status !== 'ok') ? h('span', { class: 'dot ' + worstStatus(res.checks) }) : null)));
  const strip = page.mod ? connectionStrip(page.mod) : null;
  if (strip) out.append(strip);
  out.append(tabBar);
  const bad = (res?.checks || []).filter((c) => c.status === 'fail' || c.status === 'warn').sort((a, b) => (a.status === 'fail' ? 0 : 1) - (b.status === 'fail' ? 0 : 1));
  if (bad.length && tab !== 'checks') {
    out.append(h('div', { class: 'issue-bar ' + (bad.some((c) => c.status === 'fail') ? 'fail' : 'warn') },
      h('div', { class: 'ib-h' }, icon(bad.some((c) => c.status === 'fail') ? 'fail' : 'warn'), `${bad.length} check${bad.length > 1 ? 's' : ''} need${bad.length > 1 ? '' : 's'} attention on this page`),
      h('div', { class: 'ib-list' }, bad.slice(0, 5).map((c) => h('button', { class: 'ib-item ' + c.status, title: (fieldFor({ ...c, module: page.mod }).hint || defaultHint(c)), onclick: () => locate({ ...c, module: page.mod }) },
        h('span', { class: 'dot ' + c.status }), h('span', { class: 'ib-l' }, c.label), h('span', { class: 'ib-v' }, `${typeof c.value === 'number' ? fmt(c.value, 3) : c.value} ${c.unit && c.unit !== '–' ? c.unit : ''}`), h('span', { class: 'ib-go' }, icon('search'), 'Locate'))),
      bad.length > 5 ? h('button', { class: 'ib-item more', onclick: () => { ui.tab[page.id] = 'checks'; renderResults(); } }, `+ ${bad.length - 5} more – open the Checks tab`) : null)));
  }
  if (tab === 'overview') out.append(...(o.overview || []).filter(Boolean));
  else if (tab === 'visuals') out.append(h('div', { class: 'grid2' }, ...o.visuals.filter(Boolean)));
  else if (tab === 'checks') { out.append(notes(res.notes) || h('span')); out.append(h('div', { class: 'card' }, checksTable(res.checks, { locate, module: page.mod }))); }
  else if (tab === 'calc') out.append(h('div', { class: 'card' }, h('div', { class: 'card-b' }, calcSheet(res.steps, { showRefs: store.settings.showRefs }))));
  out.scrollTop = scroll;
}

// ------------------------------------------------------------------ locate an input from any check
function doLocate(c) {
  const page = PAGES.find((p) => p.mod === c.module && !p.renderFull && p.fields) || PAGES.find((p) => p.mod === c.module);
  if (!page) return;
  if (store.page !== page.id) navigate(page.id);
  setTimeout(() => {
    const el = c.field ? els.main.querySelector(`[data-k="${c.field}"]`) : null;
    const hint = c.hint || defaultHint(c);
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
      setTimeout(() => el.querySelector('input,select,button')?.focus({ preventScroll: true }), 350);
      toast(`${c.label}: ${hint || 'adjust this input'}`, c.status === 'fail' ? 'fail' : 'warn');
    } else {
      ui.tab[page.id] = 'checks';
      renderResults();
      const row = [...(els.main.querySelectorAll('tr[data-label]'))].find((tr) => tr.dataset.label === c.label);
      if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
      toast(`${c.label} is a computed result${hint ? ' – ' + hint : ''}`, 'info');
    }
  }, 80);
}
window.addEventListener('wtp-locate', (e) => doLocate(e.detail));
window.addEventListener('wtp-action', (e) => { if (e.detail === 'excel') exportExcel(); else if (e.detail === 'save') saveProject(); else if (e.detail === 'open') openProj(); });

// ------------------------------------------------------------------ keyboard
function onKey(e) {
  const k = e.key.toLowerCase();
  if (!(e.ctrlKey || e.metaKey)) return;
  const inField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (k === 's') { e.preventDefault(); saveProject(e.shiftKey); }
  else if (k === 'o') { e.preventDefault(); openProj(); }
  else if (k === 'n') { e.preventDefault(); newProj(); }
  else if (k === 'p') { e.preventDefault(); navigate('report'); }
  else if (k === 'e') { e.preventDefault(); exportExcel(); }
  else if (k === 'z' && !inField) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (k === 'y' && !inField) { e.preventDefault(); redo(); }
  else if (/^[1-9]$/.test(k)) { e.preventDefault(); const p = PAGES[parseInt(k, 10) - 1]; if (p) navigate(p.id); }
}

// ------------------------------------------------------------------ boot
export async function boot(root) {
  buildShell(root);
  applyTheme();
  const splash = h('div', { class: 'splash' }, h('div', { class: 'si', html: `<div class="si-logo">${bannerImg(86)}</div><h2>WTP Designer</h2><p>Conventional Water Treatment Plant Design Suite · NWSDB Design Manuals D2 &amp; D3</p><div class="si-bar"><span></span></div>` }));
  document.body.append(splash);
  // initial project: file passed by OS > autosave > sample
  let started = false;
  if (isElectron) {
    const initial = await window.wtp.initialFile?.();
    if (initial) { try { setProject(normalise(JSON.parse(initial.content)), initial.path); started = true; } catch { /* ignore */ } }
  }
  if (!started) {
    const a = loadAutosave();
    if (a) { setProject(normalise(a.project), a.path); store.dirty = true; } else setProject(newProject(), null);
  }
  on((what) => {
    if (what === 'results') { renderSidebar(); renderStatus(); current?.form?.update(); renderResults(); if (current?.full && (['dashboard', 'checks', 'compliance', 'chain'].includes(store.page) || current.page.live)) renderMain(); updateImpactDock(); }
    else if (what === 'saved') renderStatus();
    else { renderSidebar(); renderStatus(); renderMain(); updateImpactDock(); }
  });
  mountImpactDock();
  renderSidebar(); renderStatus(); renderMain();
  document.addEventListener('keydown', onKey);
  window.wtp?.onOpenFile?.((f) => loadText(f.content, f.path));
  window.wtp?.onCloseRequest?.(async () => { const ok = await confirmDiscard(); window.wtp.closeResponse(ok); });
  setTimeout(() => { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 450); }, 900);
}
