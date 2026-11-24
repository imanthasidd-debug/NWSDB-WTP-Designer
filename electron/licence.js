// Trial period and licence keys of the trial edition (the full edition does not load this file).
//
// Trial: the first-run time and the latest run time are kept, HMAC-signed, in three places – a file in the user-data
// folder, a file in the local application-data folder and the HKCU registry (Windows).  The earliest first run wins,
// setting the clock back gains nothing (time counts from the latest run seen) and an edited record counts as ended.
//
// Licence keys: Ed25519-signed, bound to the machine ID shown in the app.  Only the holder of the private key (the
// "WTP Designer licence key generator") can issue them; the app carries the public key only.
//   full  – turns this copy into the full version on this computer
//   ext   – extends the trial on this computer until the date in the key
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const DAY = 86400000;
const PUBLIC_X = 'tl8FQXT7bDwd_N1qdi-YWXKSPkUCU5_qQjermZOkzE0';
const HMAC = 'nwsdb-wtp-designer/trial/2026/7c1f5e0b93a4';
const REG_KEY = 'HKCU\\Software\\NWSDB WTP Designer';
const isWin = process.platform === 'win32';
const useReg = () => isWin && !process.env.WTP_TRIAL_NOREG;

// ------------------------------------------------------------------ storage helpers
const mac = (a, b) => crypto.createHmac('sha256', HMAC).update(`${a}.${b}`).digest('hex').slice(0, 20);
const sign = (first, last) => `${Math.round(first)}.${Math.round(last)}.${mac(Math.round(first), Math.round(last))}`;
function parse(tok) {
  if (!tok || typeof tok !== 'string') return null;
  const m = /^(\d{10,15})\.(\d{10,15})\.([0-9a-f]{20})$/.exec(tok.trim());
  if (!m || mac(m[1], m[2]) !== m[3]) return 'bad';
  return { first: +m[1], last: +m[2] };
}
const readF = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};
const writeF = (p, s) => {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, s, 'utf8');
  } catch {
    /* read-only */
  }
};
function readReg(name) {
  if (!useReg()) return null;
  try {
    const out = execFileSync('reg', ['query', REG_KEY, '/v', name], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = new RegExp(`${name}\\s+REG_SZ\\s+(\\S+)`).exec(out);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
function writeReg(name, val) {
  if (!useReg()) return;
  try {
    execFileSync('reg', ['add', REG_KEY, '/v', name, '/t', 'REG_SZ', '/d', val, '/f'], {
      windowsHide: true,
      timeout: 5000,
      stdio: 'ignore',
    });
  } catch {
    /* not writable */
  }
}
/** default record locations: user-data folder + local app-data folder */
function locations(userData) {
  const local = isWin
    ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'NWSDB', 'wtpd', 'state.bin')
    : path.join(os.homedir(), '.cache', 'nwsdb-wtpd', 'state.bin');
  return { files: [path.join(userData, 'licence.dat'), local], keyFile: path.join(userData, 'licence.key') };
}

// ------------------------------------------------------------------ machine ID
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford
function b32(buf) {
  let bits = 0,
    val = 0,
    out = '';
  for (const b of buf) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}
function machineId() {
  let guid = '';
  if (isWin) {
    try {
      const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      guid = (/MachineGuid\s+REG_SZ\s+(\S+)/.exec(out) || [])[1] || '';
    } catch {
      /* fall back */
    }
  } else guid = (readF('/etc/machine-id') || '').trim();
  const src = `nwsdb-wtp|${guid}|${os.hostname()}|${(os.userInfo().username || '').toLowerCase()}`;
  return b32(crypto.createHash('sha256').update(src).digest().subarray(0, 10)).match(/.{4}/g).join('-');
}

// ------------------------------------------------------------------ licence keys
const pubKey = () => crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: PUBLIC_X }, format: 'jwk' });
/** → { ok, lic } | { ok:false, error } */
function verifyKey(key, mid) {
  const k = String(key || '').replace(/\s+/g, '');
  const m = /^WTP1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{80,90})$/.exec(k);
  if (!m)
    return { ok: false, error: 'This is not a WTP Designer licence key. Copy the whole key, from WTP1- to the end.' };
  let lic;
  try {
    if (!crypto.verify(null, Buffer.from(m[1]), pubKey(), Buffer.from(m[2], 'base64url')))
      return { ok: false, error: 'The licence key is not valid (signature check failed).' };
    lic = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
  } catch {
    return { ok: false, error: 'The licence key is damaged. Copy it again.' };
  }
  if (lic.m !== mid)
    return { ok: false, error: `This key was issued for another computer (${lic.m}). This computer's ID is ${mid}.` };
  if (!['full', 'ext'].includes(lic.t)) return { ok: false, error: 'Unknown licence type.' };
  if (lic.t === 'ext' && !/^\d{4}-\d\d-\d\d$/.test(lic.u || ''))
    return { ok: false, error: 'The extension date in the key is missing.' };
  return { ok: true, lic, key: k };
}

// ------------------------------------------------------------------ status
/**
 * trialStatus(userData, days, now?, opts?) – also records this run.
 * opts.files / opts.keyFile override the record locations (tests).
 */
function trialStatus(userData, days, now = Date.now(), opts = {}) {
  const loc = { ...locations(userData), ...opts };
  const mid = opts.machineId || machineId();
  const recs = [...loc.files.map((p) => parse(readF(p))), parse(readReg('Licence'))];
  const good = recs.filter((r) => r && r !== 'bad');
  const tampered = recs.includes('bad');
  const first = good.length ? Math.min(...good.map((r) => r.first)) : now;
  const last = good.length ? Math.max(...good.map((r) => r.last)) : now;
  const clock = Math.max(now, last);
  const tok = sign(first, clock);
  loc.files.forEach((p) => writeF(p, tok));
  writeReg('Licence', tok);
  // licence key (file or registry)
  let lic = null;
  for (const k of [readF(loc.keyFile), readReg('Key')]) {
    if (!k) continue;
    const v = verifyKey(k, mid);
    if (v.ok && (!lic || v.lic.t === 'full' || (lic.t === 'ext' && v.lic.u > lic.u))) lic = v.lic;
  }
  const base = { trial: true, days, machineId: mid, started: new Date(first).toISOString().slice(0, 10) };
  if (lic?.t === 'full')
    return {
      ...base,
      trial: false,
      licensed: true,
      mode: 'licensed',
      licensee: lic.n || '',
      issued: lic.i || '',
      expired: false,
      daysLeft: 0,
      ends: '',
    };
  let end = first + days * DAY;
  if (lic?.t === 'ext') end = Math.max(end, Date.parse(lic.u + 'T23:59:59Z'));
  const left = end - clock;
  const expired = left <= 0 || (tampered && !good.length);
  return {
    ...base,
    licensed: false,
    mode: expired ? 'restricted' : 'trial',
    extended: lic?.t === 'ext' ? lic.u : '',
    licensee: lic?.n || '',
    expired,
    daysLeft: expired ? 0 : Math.max(1, Math.ceil(left / DAY)),
    ends: new Date(end).toISOString().slice(0, 10),
  };
}

/** store a key after checking it; returns { ok, error?, lic? } */
function activate(userData, key, opts = {}) {
  const loc = { ...locations(userData), ...opts };
  const mid = opts.machineId || machineId();
  const v = verifyKey(key, mid);
  if (!v.ok) return v;
  writeF(loc.keyFile, v.key);
  writeReg('Key', v.key);
  return { ok: true, lic: v.lic };
}

module.exports = { trialStatus, activate, verifyKey, machineId, sign, parse, locations, DAY, PUBLIC_X };
