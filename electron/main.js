// NWSDB WTP Designer – Electron main process
'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const APP_ID = 'lk.gov.nwsdb.wtpdesigner';
const TRIAL_DAYS = 0; // 0 = full edition; scripts/package-win.sh sets the number of days for the trial edition
let trial = null; // licence / trial status of this run (trial edition only)
const lic = () => require('./licence.js');
const trialNow = () => {
  if (!TRIAL_DAYS) return null;
  try {
    trial = lic().trialStatus(app.getPath('userData'), TRIAL_DAYS);
  } catch {
    trial = {
      trial: true,
      days: TRIAL_DAYS,
      expired: true,
      mode: 'restricted',
      daysLeft: 0,
      ends: '',
      started: '',
      machineId: '',
    };
  }
  return trial;
};
/** restricted mode after the trial: no exports (checked again at every export – the app may stay open for days) */
const trialBlocked = () => {
  if (!TRIAL_DAYS) return false;
  const t = trialNow();
  if (!t.expired) return false;
  if (win) {
    win.webContents.send('trial-expired', t);
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Restricted mode',
      message: 'The trial period of NWSDB WTP Designer has ended.',
      detail:
        'Exports are switched off. Enter a licence key (Help → Licence) to continue. Your project files (.wtpd) can still be saved and open in the full version.',
    });
  }
  return true;
};
const DIST = path.join(__dirname, '..', 'dist');
let win = null;
let forceClose = false;
let pendingFile = null;

// ------------------------------------------------------------------ app-data folders: Recovery, Backups, Logs
const dataDir = (sub) => {
  const d = path.join(app.getPath('userData'), sub);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const writeAtomic = (file, content) => {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, file);
};
const LOG_MAX = 1024 * 1024; // 1 MB, then wtp.log → wtp.1.log
/** append one entry to <app data>/Logs/wtp.log – never throws */
function logLine(level, where, msg) {
  try {
    const f = path.join(dataDir('Logs'), 'wtp.log');
    if (fs.existsSync(f) && fs.statSync(f).size > LOG_MAX) fs.renameSync(f, path.join(path.dirname(f), 'wtp.1.log'));
    const text = msg instanceof Error ? msg.stack || msg.message : String(msg);
    fs.appendFileSync(
      f,
      `${new Date().toISOString()} [${level}] ${where}: ${text.replace(/\r?\n/g, '\n    ')}\n`,
      'utf8',
    );
  } catch {
    /* logging must never break the program */
  }
}
// record main-process failures without changing Electron's own handling of them
process.on('uncaughtExceptionMonitor', (err) => logLine('error', 'main', err));
process.on('unhandledRejection', (err) => logLine('error', 'main (promise)', err));

const isProjectFile = (p) => typeof p === 'string' && /\.(wtpd|json)$/i.test(p) && fs.existsSync(p);
const fileFromArgv = (argv) => argv.slice(1).find((a) => !a.startsWith('-') && isProjectFile(a)) || null;
const readProject = (p) => ({ path: p, content: fs.readFileSync(p, 'utf8') });

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    const f = fileFromArgv(argv);
    if (f) win.webContents.send('open-file', readProject(f));
  });
}

function createWindow() {
  pendingFile = fileFromArgv(process.argv);
  win = new BrowserWindow({
    width: 1520,
    height: 960,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    title: TRIAL_DAYS && trial?.trial !== false ? 'NWSDB WTP Designer – Trial' : 'NWSDB WTP Designer',
    backgroundColor: '#0a3d7a',
    icon: path.join(DIST, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0a3d7a', symbolColor: '#ffffff', height: 40 },
    autoHideMenuBar: true,
    webPreferences: {
      devTools: !TRIAL_DAYS,
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.loadFile(path.join(DIST, 'index.html'));
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
  win.on('close', (e) => {
    if (forceClose) return;
    e.preventDefault();
    win.webContents.send('close-request');
  });
  win.on('closed', () => {
    win = null;
  });
  // never trap the user if the renderer stops responding
  win.on('unresponsive', () => {
    forceClose = true;
    logLine('warn', 'window', 'renderer not responding');
  });
  win.webContents.on('render-process-gone', (_e, d) => {
    forceClose = true;
    logLine('error', 'renderer', `process gone: ${d?.reason} (exit ${d?.exitCode})`);
  });
}

// Minimal application menu (hidden title bar) – keeps zoom / full-screen / dev-tools accelerators
Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+=', visible: false },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
        { role: 'reload', accelerator: 'CmdOrCtrl+Shift+R' },
      ],
    },
  ]),
);

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
  trialNow();
  logLine(
    'info',
    'start',
    `${app.getName()} ${app.getVersion()} · Electron ${process.versions.electron} · ${os.type()} ${os.release()} ${os.arch()}`,
  );
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ------------------------------------------------------------------ IPC
const FILTERS = {
  wtpd: [{ name: 'WTP Designer project', extensions: ['wtpd'] }],
  pdf: [{ name: 'PDF document', extensions: ['pdf'] }],
  xlsx: [{ name: 'Excel workbook', extensions: ['xlsx'] }],
  dxf: [{ name: 'AutoCAD DXF', extensions: ['dxf'] }],
  svg: [{ name: 'SVG image', extensions: ['svg'] }],
  png: [{ name: 'PNG image', extensions: ['png'] }],
  csv: [{ name: 'CSV', extensions: ['csv'] }],
  zip: [{ name: 'ZIP archive', extensions: ['zip'] }],
  json: [{ name: 'JSON', extensions: ['json'] }],
};
const docsDir = () => {
  try {
    return app.getPath('documents');
  } catch {
    return os.homedir();
  }
};
const toBuffer = (data) =>
  typeof data === 'string'
    ? Buffer.from(data, 'utf8')
    : Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data);

ipcMain.on('trial-status', (e) => {
  e.returnValue = TRIAL_DAYS ? trial || trialNow() : null;
});
ipcMain.handle('licence-activate', (_e, key) => {
  if (!TRIAL_DAYS) return { ok: false, error: 'This copy is already the full version.' };
  let res;
  try {
    res = lic().activate(app.getPath('userData'), key);
  } catch (err) {
    res = { ok: false, error: String(err.message || err) };
  }
  if (res.ok) {
    trialNow();
    setTimeout(() => {
      if (win) win.reload();
    }, 1200);
  }
  return { ...res, status: trial };
});
// re-check every hour: a trial that ends while the program is open switches to restricted mode
if (TRIAL_DAYS)
  setInterval(() => {
    const was = trial?.expired;
    const t = trialNow();
    if (t.expired && !was && win) win.webContents.send('trial-expired', t);
  }, 3600 * 1000).unref?.();
ipcMain.handle('initial-file', () => (pendingFile ? readProject(pendingFile) : null));
ipcMain.handle('open-project', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Open project',
    defaultPath: docsDir(),
    properties: ['openFile'],
    filters: [...FILTERS.wtpd, ...FILTERS.json],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  app.addRecentDocument(r.filePaths[0]);
  return readProject(r.filePaths[0]);
});
ipcMain.handle('save-project', async (_e, content, filePath, defaultName) => {
  let p = filePath && path.isAbsolute(filePath) ? filePath : null;
  if (!p) {
    const r = await dialog.showSaveDialog(win, {
      title: 'Save project',
      defaultPath: path.join(docsDir(), defaultName || 'project.wtpd'),
      filters: FILTERS.wtpd,
    });
    if (r.canceled || !r.filePath) return null;
    p = r.filePath;
  }
  fs.writeFileSync(p, content, 'utf8');
  app.addRecentDocument(p);
  return p;
});
ipcMain.handle('save-file', async (_e, defaultName, data) => {
  if (trialBlocked()) return null;
  const ext = path.extname(defaultName).slice(1).toLowerCase();
  const r = await dialog.showSaveDialog(win, {
    title: 'Export',
    defaultPath: path.join(docsDir(), defaultName),
    filters: FILTERS[ext] || [],
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, toBuffer(data));
  return r.filePath;
});
ipcMain.handle('export-pdf', async (_e, html, defaultName, headerText, opts = {}) => {
  if (trialBlocked()) return null;
  const r = await dialog.showSaveDialog(win, {
    title: opts.title || 'Export design report',
    defaultPath: path.join(docsDir(), defaultName || 'design-report.pdf'),
    filters: FILTERS.pdf,
  });
  if (r.canceled || !r.filePath) return null;
  const tmp = path.join(os.tmpdir(), `wtp-report-${Date.now()}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const pw = new BrowserWindow({
    show: false,
    width: opts.pageSize === 'A3' ? 1600 : 1000,
    height: 1400,
    webPreferences: { sandbox: true, contextIsolation: true, javascript: false },
  });
  try {
    await pw.loadFile(tmp);
    await new Promise((res) => setTimeout(res, 600));
    const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    const sheet = opts.pageSize === 'A3';
    const pdf = await pw.webContents.printToPDF(
      sheet
        ? {
            pageSize: 'A3',
            landscape: true,
            printBackground: true,
            displayHeaderFooter: false,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            preferCSSPageSize: true,
          }
        : {
            pageSize: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `<div style="font-size:7px;font-family:Segoe UI,Arial;color:#7a889c;width:100%;padding:0 14mm;display:flex;justify-content:space-between"><span>National Water Supply &amp; Drainage Board – ${esc(opts.docName || 'WTP Design Report')}</span><span>${esc(headerText)}</span></div>`,
            footerTemplate:
              '<div style="font-size:7px;font-family:Segoe UI,Arial;color:#7a889c;width:100%;padding:0 14mm;display:flex;justify-content:space-between"><span>NWSDB WTP Designer</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
            margins: { top: 0.6, bottom: 0.6, left: 0.5, right: 0.5 },
            preferCSSPageSize: false,
          },
    );
    fs.writeFileSync(r.filePath, pdf);
    shell.openPath(r.filePath);
    return r.filePath;
  } finally {
    pw.destroy();
    fs.rm(tmp, () => {});
  }
});
ipcMain.on('set-title', (_e, title) => {
  if (win) win.setTitle(title);
});
ipcMain.on('set-theme', (_e, theme) => {
  if (!win) return;
  nativeTheme.themeSource = theme === 'dark' ? 'dark' : 'light';
  try {
    win.setTitleBarOverlay({ color: theme === 'dark' ? '#0b2547' : '#0a3d7a', symbolColor: '#ffffff', height: 40 });
  } catch {
    /* not supported on this platform */
  }
});
ipcMain.on('close-response', (_e, ok) => {
  if (ok && win) {
    forceClose = true;
    win.close();
  }
});
ipcMain.on('quit', () => {
  if (win) win.close();
});

// ------------------------------------------------------------------ autosave (crash recovery) and backups
ipcMain.on('autosave-write', (_e, content) => {
  try {
    writeAtomic(path.join(dataDir('Recovery'), 'autosave.json'), String(content));
  } catch (err) {
    logLine('error', 'autosave', err);
  }
});
ipcMain.handle('autosave-read', () => {
  try {
    const f = path.join(dataDir('Recovery'), 'autosave.json');
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  } catch (err) {
    logLine('error', 'autosave', err);
    return null;
  }
});
const BACKUPS_KEEP = 20; // per project
const safeName = (s) =>
  String(s || 'project')
    // eslint-disable-next-line no-control-regex -- control characters are not allowed in Windows file names
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 60) || 'project';
const pad = (n) => String(n).padStart(2, '0');
const stamp = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
ipcMain.handle('backup-write', (_e, content, name) => {
  try {
    const dir = path.join(dataDir('Backups'), safeName(name));
    fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `${stamp()}.wtpd`);
    writeAtomic(f, String(content));
    const all = fs
      .readdirSync(dir)
      .filter((x) => x.endsWith('.wtpd'))
      .sort();
    for (const old of all.slice(0, Math.max(0, all.length - BACKUPS_KEEP)))
      fs.rmSync(path.join(dir, old), { force: true });
    return f;
  } catch (err) {
    logLine('error', 'backup', err);
    return null;
  }
});
ipcMain.handle('backups-list', () => {
  const out = [];
  try {
    const root = dataDir('Backups');
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      for (const f of fs.readdirSync(path.join(root, d.name))) {
        if (!f.endsWith('.wtpd')) continue;
        const p = path.join(root, d.name, f);
        const st = fs.statSync(p);
        out.push({ project: d.name, file: f, path: p, when: st.mtimeMs, size: st.size });
      }
    }
  } catch (err) {
    logLine('error', 'backup', err);
  }
  return out.sort((a, b) => b.when - a.when).slice(0, 80);
});
ipcMain.handle('backup-read', (_e, p) => {
  const root = dataDir('Backups');
  const full = path.resolve(String(p || ''));
  if (!full.startsWith(root + path.sep) || !full.endsWith('.wtpd') || !fs.existsSync(full)) return null; // only files in the Backups folder
  return readProject(full);
});
ipcMain.handle('open-data-folder', (_e, sub) =>
  shell.openPath(dataDir(['Backups', 'Logs', 'Recovery'].includes(sub) ? sub : 'Backups')),
);

// ------------------------------------------------------------------ error log and diagnostics
ipcMain.on('log', (_e, level, where, msg) =>
  logLine(
    ['error', 'warn', 'info'].includes(level) ? level : 'info',
    String(where).slice(0, 80),
    String(msg).slice(0, 8000),
  ),
);
ipcMain.handle('log-read', (_e, n = 120) => {
  try {
    const dir = dataDir('Logs');
    const text = ['wtp.1.log', 'wtp.log']
      .map((f) => path.join(dir, f))
      .filter((f) => fs.existsSync(f))
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('');
    return text
      .split('\n')
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(1000, +n || 120)))
      .join('\n');
  } catch {
    return '';
  }
});
ipcMain.handle('diagnostics', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  os: `${os.type()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model || '',
  cores: os.cpus().length,
  memGB: +(os.totalmem() / 2 ** 30).toFixed(1),
  locale: app.getLocale(),
  edition: TRIAL_DAYS ? `trial (${TRIAL_DAYS} days)` : 'full',
  dataFolder: app.getPath('userData'),
}));
