// Error log and diagnostics. Renderer errors, page render errors and engine module errors are written to the log
// file (Electron: <app data>/Logs/wtp.log through the main process) – once per session for each distinct error – and
// the last entries are kept in memory for "Copy diagnostics" (Settings → About).
import { APP } from './version.js';

const recent = [];
const seen = new Set();

/** record an error (or warning) – never throws */
export function logError(where, err, level = 'error') {
  try {
    const msg = err && err.stack ? String(err.stack) : String(err?.message ?? err);
    const key = `${where}|${msg.split('\n')[0]}`;
    if (seen.has(key)) return;
    seen.add(key);
    recent.push({ t: new Date().toISOString(), level, where, msg });
    if (recent.length > 100) recent.shift();
    if (typeof window !== 'undefined') window.wtp?.log?.(level, where, msg);
  } catch {
    /* logging must never break the program */
  }
}

/** engine module errors from computeAll() (key → stack) */
export function logEngineErrors(errors) {
  for (const [k, v] of Object.entries(errors || {})) logError(`engine: ${k}`, v);
}

/** catch errors nobody handled */
export function installErrorLog() {
  window.addEventListener('error', (e) => logError('renderer', e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => logError('renderer (promise)', e.reason));
}

/** plain-text report for a bug report: program, computer, project summary, calculation errors, recent log */
export async function diagnosticsText(store, edition) {
  let d = {};
  let log = '';
  try {
    d = (await window.wtp?.diagnostics?.()) || {};
  } catch {
    /* browser version */
  }
  try {
    log = (await window.wtp?.readLog?.(80)) || '';
  } catch {
    /* browser version */
  }
  if (!log) log = recent.map((x) => `${x.t} [${x.level}] ${x.where}: ${x.msg.replace(/\n/g, '\n    ')}`).join('\n');
  const r = store.results || {};
  const s = store.project?.inputs?.setup || {};
  const errs = Object.entries(r.errors || {});
  return [
    `${APP} – diagnostics ${new Date().toISOString()}`,
    `Edition: ${d.edition || (edition?.trial ? 'trial' : 'full')}${edition?.licensed ? ' (licensed)' : ''}${edition?.expired ? ' – restricted mode' : ''}`,
    d.electron ? `Electron ${d.electron} · Chrome ${d.chrome} · Node ${d.node}` : `Browser: ${navigator.userAgent}`,
    d.os ? `Computer: ${d.os} · ${d.cpu} (${d.cores} cores) · ${d.memGB} GB RAM · locale ${d.locale}` : null,
    d.dataFolder ? `Data folder: ${d.dataFolder}` : null,
    `Screen: ${window.screen?.width}×${window.screen?.height} · zoom ${Math.round((window.devicePixelRatio || 1) * 100)} %`,
    '',
    `Project: ${s.code || '–'} · ${s.district || '–'} · ${s.sourceType || '–'} · ${Math.round(r.demand?.Qd || 0).toLocaleString('en-US')} m³/d · route ${r.process?.route || '–'}`,
    `Checks: ${r.summary?.ok ?? '–'} pass · ${r.summary?.warn ?? '–'} review · ${r.summary?.fail ?? '–'} fail · calculation ${(store.calcMs || 0).toFixed(0)} ms (${store.calcThread === 'worker' ? 'background worker' : 'screen thread'})`,
    errs.length
      ? `Calculation errors:\n${errs.map(([k, v]) => `  ${k}: ${String(v).split('\n').slice(0, 4).join('\n    ')}`).join('\n')}`
      : 'Calculation errors: none',
    '',
    'Recent log:',
    log || '(empty)',
  ]
    .filter((x) => x !== null)
    .join('\n');
}
