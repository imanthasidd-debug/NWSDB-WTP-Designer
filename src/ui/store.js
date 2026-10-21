// Application state: project, computed results, undo/redo history, persistence
import { computeAll, newProject } from '../engine/index.js';
import { deepClone, deepMerge } from '../core/util.js';
import { DEFAULT_INPUTS } from '../engine/index.js';

const listeners = new Set();
export const store = {
  project: null,
  results: null,
  filePath: null,
  dirty: false,
  page: 'dashboard',
  history: [],
  future: [],
  calcMs: 0,
  settings: loadSettings(),
};
export const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (what) => listeners.forEach((fn) => fn(what));

function loadSettings() {
  try { return { theme: 'light', designer: '', showRefs: true, ...(JSON.parse(localStorage.getItem('wtp.settings') || '{}')) }; } catch { return { theme: 'light', designer: '', showRefs: true }; }
}
export function saveSettings() { try { localStorage.setItem('wtp.settings', JSON.stringify(store.settings)); } catch { /* storage unavailable */ } }

/** normalise a loaded project so every module has complete inputs */
export function normalise(p) {
  const base = newProject();
  const out = { ...base, ...p, inputs: deepMerge(DEFAULT_INPUTS(), p.inputs || {}), criteria: p.criteria || {} };
  // projects saved before the NWSDB D2 update (v1.0): keep their diurnal pattern and pump choices
  const st = p.inputs?.storage;
  if (st && st.pattern && !st.patternMode) out.inputs.storage.patternMode = 'custom';
  if (p.inputs?.intake?.pumpKind === 'dryWell') out.inputs.intake.pumpKind = 'horizontal';
  if (p.version === 1 && !p.d2) {
    for (const k of ['intake', 'storage']) if (typeof p.inputs?.[k]?.surgeProtect === 'boolean') out.inputs[k].surgeProtect = p.inputs[k].surgeProtect ? 'yes' : 'auto';
  }
  out.d2 = true;
  return out;
}

export function recompute() {
  const t0 = performance.now();
  store.results = computeAll(store.project);
  store.calcMs = performance.now() - t0;
}

export function setProject(p, filePath = null) {
  store.project = normalise(p);
  store.filePath = filePath;
  store.dirty = false;
  store.history = [];
  store.future = [];
  recompute();
  emit('project');
}

let pending = null;
let snapshotTimer = null;
let lastSnapshot = null;
function snapshot() {
  const s = JSON.stringify(store.project);
  if (s !== lastSnapshot) {
    if (lastSnapshot) { store.history.push(lastSnapshot); if (store.history.length > 100) store.history.shift(); store.future = []; }
    lastSnapshot = s;
  }
}
/** set value at path like ['sed','sor'] */
export function setInput(path, value, { immediate = false } = {}) {
  if (!lastSnapshot) lastSnapshot = JSON.stringify(store.project);
  let o = store.project.inputs;
  for (let i = 0; i < path.length - 1; i++) { if (o[path[i]] === undefined || o[path[i]] === null) o[path[i]] = {}; o = o[path[i]]; }
  o[path[path.length - 1]] = value;
  store.dirty = true;
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(snapshot, 600);
  clearTimeout(pending);
  const run = () => { recompute(); emit('results'); autosave(); };
  if (immediate) run(); else pending = setTimeout(run, 140);
}
export function getInput(path) {
  let o = store.project.inputs;
  for (const k of path) { if (o === undefined || o === null) return undefined; o = o[k]; }
  return o;
}
export function setCriteria(key, field, value) {
  snapshot();
  store.project.criteria[key] = { ...(store.project.criteria[key] || {}), [field]: value };
  store.dirty = true;
  recompute();
  emit('results');
}
export function resetCriteria(key) {
  if (key) delete store.project.criteria[key]; else store.project.criteria = {};
  store.dirty = true; recompute(); emit('results');
}
export function resetModule(mod) {
  snapshot();
  const def = DEFAULT_INPUTS();
  store.project.inputs[mod] = deepClone(def[mod]);
  store.dirty = true;
  recompute();
  emit('project');
}
export function undo() {
  clearTimeout(snapshotTimer); snapshot();
  if (!store.history.length) return;
  store.future.push(JSON.stringify(store.project));
  const prev = store.history.pop();
  store.project = JSON.parse(prev);
  lastSnapshot = prev;
  store.dirty = true; recompute(); emit('project');
}
export function redo() {
  if (!store.future.length) return;
  store.history.push(JSON.stringify(store.project));
  const nxt = store.future.pop();
  store.project = JSON.parse(nxt);
  lastSnapshot = nxt;
  store.dirty = true; recompute(); emit('project');
}
export function navigate(page) {
  store.page = page;
  emit('page');
}
export function markSaved(path) {
  store.filePath = path || store.filePath;
  store.dirty = false;
  emit('saved');
}
let autosaveTimer;
function autosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { try { localStorage.setItem('wtp.autosave', JSON.stringify({ when: Date.now(), path: store.filePath, project: store.project })); } catch { /* ignore */ } }, 1500);
}
export function loadAutosave() {
  try { const a = JSON.parse(localStorage.getItem('wtp.autosave') || 'null'); return a && a.project ? a : null; } catch { return null; }
}
export const emitAll = () => emit('project');
