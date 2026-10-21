// Launches the real Electron app (Linux build) and exercises the main-process bridge + PDF export.
const { _electron: electron } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const out = process.argv[2];
(async () => {
  const app = await electron.launch({ executablePath: '/home/claude/vendor/electron-linux/electron', args: ['--no-sandbox', path.resolve(__dirname, '..')], env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '0' } });
  const win = await app.firstWindow();
  const logs = [];
  win.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
  win.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await win.waitForTimeout(2500);
  console.log('title:', await win.title());
  console.log('bridge:', await win.evaluate(() => Object.keys(window.wtp || {}).join(',')));
  console.log('platform:', await win.evaluate(() => window.wtp.platform));
  await win.setViewportSize({ width: 1500, height: 940 }).catch(() => {});
  await win.screenshot({ path: path.join(out, 'electron_dashboard.png') });
  // build report html in renderer, then print to PDF in main process
  await win.evaluate(() => { document.querySelectorAll('.nav').forEach((n) => { if (n.textContent.includes('Design report')) n.click(); }); });
  await win.waitForTimeout(1500);
  await win.screenshot({ path: path.join(out, 'electron_report.png') });
  const html = await win.evaluate(() => document.querySelector('iframe.report-frame').srcdoc);
  fs.writeFileSync(path.join(out, 'report.html'), html);
  const pdfPath = path.join(out, 'report.pdf');
  const bytes = await app.evaluate(async ({ BrowserWindow }, { html, pdfPath }) => {
    const fs = process.getBuiltinModule('fs'); const os = process.getBuiltinModule('os'); const path = process.getBuiltinModule('path');
    const tmp = path.join(os.tmpdir(), 'wtp-test-report.html');
    fs.writeFileSync(tmp, html);
    const pw = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
    await pw.loadFile(tmp);
    await new Promise((r) => setTimeout(r, 800));
    const pdf = await pw.webContents.printToPDF({ pageSize: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div style="font-size:7px;width:100%;text-align:center">NWSDB WTP Design Report</div>', footerTemplate: '<div style="font-size:7px;width:100%;text-align:right;padding-right:14mm">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>', margins: { top: 0.6, bottom: 0.6, left: 0.5, right: 0.5 } });
    fs.writeFileSync(pdfPath, pdf); pw.destroy();
    return pdf.length;
  }, { html, pdfPath });
  console.log('pdf bytes:', bytes);
  // real export handlers (save dialog stubbed): A4 report + A3 drawing pack
  await app.evaluate(({ dialog, shell }, outDir) => {
    const path = process.getBuiltinModule('path');
    dialog.showSaveDialog = async (_w, o) => ({ canceled: false, filePath: path.join(outDir, String(o.defaultPath).split(/[\\/]/).pop()) });
    shell.openPath = async () => '';
  }, out);
  await win.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Drawing pack (A3 PDF)')).click());
  for (let i = 0; i < 40 && !fs.readdirSync(out).some((f) => f.endsWith('-A3-drawings.pdf')); i++) await win.waitForTimeout(500);
  const a3 = fs.readdirSync(out).find((f) => f.endsWith('-A3-drawings.pdf'));
  console.log('A3 drawing pack:', a3, a3 ? fs.statSync(path.join(out, a3)).size : 0);
  await win.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Export PDF')).click());
  for (let i = 0; i < 40 && !fs.readdirSync(out).some((f) => f.endsWith('-design-report.pdf')); i++) await win.waitForTimeout(500);
  const rp = fs.readdirSync(out).find((f) => f.endsWith('-design-report.pdf'));
  console.log('A4 report via handler:', rp, rp ? fs.statSync(path.join(out, rp)).size : 0);
  console.log('LOGS:', JSON.stringify(logs, null, 1).slice(0, 3000));
  // close handling: app should ask renderer (not dirty) -> closes
  await app.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
