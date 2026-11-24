// Real Electron app: calculation worker, crash-recovery autosave, timestamped backups, error log and diagnostics.
// Needs Playwright and a Linux Electron binary (Linux: run under Xvfb):
//   PLAYWRIGHT_PATH=… ELECTRON_PATH=…/electron xvfb-run -a node test/electron-desktop.test.cjs <scratch dir>
// The app runs with HOME / XDG_CONFIG_HOME in <scratch dir>, so the user's own settings are never touched.
const { _electron: electron } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path');
const fs = require('fs');

const scratch = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'wtp-rec-')));
const home = path.join(scratch, 'home');
fs.rmSync(home, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });
let pass = 0,
  fail = 0;
const ok = (c, msg) => {
  if (c) {
    pass++;
    console.log('✓ ' + msg);
  } else {
    fail++;
    console.log('✗ ' + msg);
  }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const app = await electron.launch({
    executablePath: process.env.ELECTRON_PATH || require('electron'),
    args: ['--no-sandbox', path.resolve(__dirname, '..')],
    env: {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      APPDATA: path.join(home, 'AppData'),
    },
  });
  const win = await app.firstWindow();
  await win.waitForTimeout(2500);
  return { app, win };
}
const nav = (win, t) =>
  win.evaluate(
    (t) => [...document.querySelectorAll('.nav')].find((n) => n.textContent.trim().startsWith(t)).click(),
    t,
  );

(async () => {
  // ---- first run: edit, autosave, save (backup), renderer error → log
  let { app, win } = await launch();
  const userData = await app.evaluate(({ app }) => app.getPath('userData'));
  console.log('userData:', userData);
  await nav(win, 'Project setup');
  await win.waitForTimeout(500);
  await win.fill('.field[data-k=name] input', 'Recovery test plant');
  await win.waitForTimeout(2600);
  const autoFile = path.join(userData, 'Recovery', 'autosave.json');
  const rec1 = fs.existsSync(autoFile) ? JSON.parse(fs.readFileSync(autoFile, 'utf8')) : null;
  ok(
    rec1 && rec1.project.inputs.setup.name === 'Recovery test plant' && rec1.dirty === true,
    'autosave file written after an edit (unsaved)',
  );
  const thread = await win.evaluate(() => document.querySelector('[data-thread]')?.dataset.thread);
  ok(thread === 'worker', `typing is calculated in the background worker (${thread})`);

  const savePath = path.join(scratch, 'saved-project.wtpd');
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, savePath);
  await win.keyboard.press('Control+s');
  await win.waitForTimeout(1500);
  ok(fs.existsSync(savePath), 'project saved');
  const bdir = path.join(userData, 'Backups');
  const backups = fs.existsSync(bdir)
    ? fs.readdirSync(bdir).flatMap((d) => fs.readdirSync(path.join(bdir, d)).map((f) => path.join(d, f)))
    : [];
  ok(backups.length === 1 && /\.wtpd$/.test(backups[0]), `backup made at save (${backups[0]})`);
  const rec2 = JSON.parse(fs.readFileSync(autoFile, 'utf8'));
  ok(rec2.dirty === false && rec2.path === savePath, 'autosave marked as saved, with the file path');

  await win.evaluate(() =>
    setTimeout(() => {
      throw new Error('recovery-test boom');
    }, 0),
  );
  await win.waitForTimeout(800);
  const logFile = path.join(userData, 'Logs', 'wtp.log');
  const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
  ok(/\[info\] start: .*Electron 44/.test(log), 'log: start line with versions');
  ok(/\[error\] renderer: .*recovery-test boom/.test(log), 'log: uncaught renderer error recorded');

  // diagnostics
  await nav(win, 'Settings');
  await win.waitForTimeout(500);
  await win.click('button:has-text("Copy diagnostics")');
  await win.waitForTimeout(1200);
  const diag = await win.evaluate(() => document.querySelector('.modal textarea')?.value || '');
  ok(
    /Electron 44\.7\.0/.test(diag) && /recovery-test boom/.test(diag) && /Data folder:/.test(diag),
    'Copy diagnostics: versions, data folder and recent log',
  );
  await win.click('.modal button:has-text("Close")');

  // unsaved edit, then a hard crash (process killed – no close dialog, no flush)
  await nav(win, 'Project setup');
  await win.waitForTimeout(400);
  await win.fill('.field[data-k=name] input', 'After save – unsaved edit');
  await win.waitForTimeout(2600);
  app.process().kill('SIGKILL');
  await wait(800);

  // ---- second run: the unsaved edit comes back, marked unsaved
  ({ app, win } = await launch());
  const st = await win.evaluate(() => ({
    name: document.querySelector('.titlebar .pname')?.textContent || '',
    dirty: getComputedStyle(document.querySelector('.titlebar .dirty')).display !== 'none',
  }));
  ok(
    /After save – unsaved edit/.test(st.name) && st.dirty,
    `restored after crash: "${st.name}", unsaved badge ${st.dirty}`,
  );

  // restore a backup through the File menu
  await win.click('.titlebar button:has-text("File")');
  await win.waitForTimeout(200);
  await win.click('.menu .mi:has-text("Restore a backup")');
  await win.waitForTimeout(600);
  const rows = await win.locator('.modal table.res tbody tr').count();
  // the saved version, and the recovered unsaved work (backed up when it was restored)
  ok(rows === 2, `backup list shows ${rows} backups (saved version + recovered work)`);
  await win
    .locator('.modal table.res tbody tr', { hasText: 'Recovery test plant' })
    .locator('button:has-text("Open")')
    .click();
  await win.waitForTimeout(500);
  if (await win.locator('.modal button:has-text("Don\'t save")').count())
    await win.click('.modal button:has-text("Don\'t save")');
  await win.waitForTimeout(1200);
  const name2 = await win.evaluate(() => document.querySelector('.titlebar .pname')?.textContent || '');
  ok(/Recovery test plant/.test(name2), `backup opened: "${name2}"`);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((w) => w.destroy()));
  await app.close().catch(() => {});
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
