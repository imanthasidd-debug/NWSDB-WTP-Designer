// Trial-period bookkeeping for the trial edition (full edition: TRIAL_DAYS = 0 in main.js, this file is not used).
// The first-run time is kept in two places (a file in the user-data folder and the HKCU registry on Windows);
// each record is signed so that an edited date is rejected, and the last-run time guards against setting the clock back.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const DAY = 86400000;
const KEY = 'nwsdb-wtp-designer/trial/2026/7c1f5e0b93a4';
const REG_KEY = 'HKCU\\Software\\NWSDB WTP Designer';
const REG_VAL = 'Licence';
const mac = (a, b) => crypto.createHmac('sha256', KEY).update(`${a}.${b}`).digest('hex').slice(0, 20);
const sign = (first, last) => `${Math.round(first)}.${Math.round(last)}.${mac(Math.round(first), Math.round(last))}`;
/** → {first,last} | 'bad' | null */
function parse(tok) {
  if (!tok || typeof tok !== 'string') return null;
  const m = /^(\d{10,15})\.(\d{10,15})\.([0-9a-f]{20})$/.exec(tok.trim());
  if (!m || mac(m[1], m[2]) !== m[3]) return 'bad';
  return { first: +m[1], last: +m[2] };
}
const fileOf = (dir) => path.join(dir, 'licence.dat');
const readFile = (dir) => { try { return fs.readFileSync(fileOf(dir), 'utf8'); } catch { return null; } };
const writeFile = (dir, tok) => { try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(fileOf(dir), tok, 'utf8'); } catch { /* read-only profile */ } };
const useReg = () => process.platform === 'win32' && !process.env.WTP_TRIAL_NOREG;
function readReg() {
  if (!useReg()) return null;
  try {
    const out = execFileSync('reg', ['query', REG_KEY, '/v', REG_VAL], { encoding: 'utf8', windowsHide: true, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] });
    const m = /REG_SZ\s+(\S+)/.exec(out);
    return m ? m[1] : null;
  } catch { return null; }
}
function writeReg(tok) {
  if (!useReg()) return;
  try { execFileSync('reg', ['add', REG_KEY, '/v', REG_VAL, '/t', 'REG_SZ', '/d', tok, '/f'], { windowsHide: true, timeout: 5000, stdio: 'ignore' }); } catch { /* registry not writable */ }
}

/** trial status; also records this run. dir = user-data folder, days = trial length */
function trialStatus(dir, days, now = Date.now()) {
  const recs = [parse(readFile(dir)), parse(readReg())];
  const good = recs.filter((r) => r && r !== 'bad');
  const tampered = recs.includes('bad');
  let first = good.length ? Math.min(...good.map((r) => r.first)) : now;
  let last = good.length ? Math.max(...good.map((r) => r.last)) : now;
  const clock = Math.max(now, last);                  // the clock was set back: keep counting from the last run
  const tok = sign(first, clock);
  writeFile(dir, tok); writeReg(tok);
  const left = days * DAY - (clock - first);
  const expired = left <= 0 || (tampered && !good.length);
  return { trial: true, days, expired, daysLeft: expired ? 0 : Math.max(1, Math.ceil(left / DAY)), ends: new Date(first + days * DAY).toISOString().slice(0, 10), started: new Date(first).toISOString().slice(0, 10) };
}

module.exports = { trialStatus, sign, parse, fileOf, DAY };
