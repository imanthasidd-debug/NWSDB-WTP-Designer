// General numeric + formatting helpers shared by engine and UI.

export const G = 9.81;
export const PI = Math.PI;

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const num = (v, d = 0) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNum(n) ? n : d;
};
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const sum = (arr) => arr.reduce((a, b) => a + (isNum(b) ? b : 0), 0);
export const mean = (arr) => (arr.length ? sum(arr) / arr.length : 0);
export const maxOf = (arr) => Math.max(...arr.filter(isNum));
export const minOf = (arr) => Math.min(...arr.filter(isNum));
export const roundTo = (v, step) => Math.round(v / step) * step;
export const ceilTo = (v, step) => Math.ceil(v / step - 1e-9) * step;
export const floorTo = (v, step) => Math.floor(v / step + 1e-9) * step;
export const deg = (r) => (r * 180) / PI;
export const rad = (d) => (d * PI) / 180;
export const range = (a, b, step = 1) => {
  const out = [];
  for (let x = a; step > 0 ? x <= b + 1e-12 : x >= b - 1e-12; x += step) out.push(+x.toFixed(10));
  return out;
};
export const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
export const logspace = (a, b, n) => linspace(Math.log10(a), Math.log10(b), n).map((v) => 10 ** v);

/** linear interpolation in a table of [x,y] sorted by x */
export function interp(table, x) {
  if (!table.length) return NaN;
  if (x <= table[0][0]) return table[0][1];
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    const [x0, y0] = table[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return NaN;
}

/** bisection root finder for monotone f on [a,b] */
export function bisect(f, a, b, tol = 1e-9, maxIt = 200) {
  let fa = f(a);
  let fb = f(b);
  if (!isNum(fa) || !isNum(fb)) return NaN;
  if (fa * fb > 0) return Math.abs(fa) < Math.abs(fb) ? a : b;
  for (let i = 0; i < maxIt; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) return m;
    if (fa * fm < 0) {
      b = m;
      fb = fm;
    } else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

/** pick the smallest standard size >= value */
export function nextStd(value, list) {
  for (const s of list) if (s >= value - 1e-9) return s;
  return list[list.length - 1];
}

// Standard sizes ---------------------------------------------------------
export const DN = [
  50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1500, 1600,
  1800, 2000, 2200,
];
export const MOTOR_KW = [
  0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160,
  200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1250, 1500,
];
export const TRANSFORMER_KVA = [100, 160, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150];
export const GENSET_KVA = [
  20, 30, 45, 60, 80, 100, 125, 150, 200, 250, 300, 350, 400, 500, 625, 750, 800, 1000, 1250, 1500, 2000,
];

// Formatting --------------------------------------------------------------
export function fmt(v, d = 2, opts = {}) {
  if (v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))) return '–';
  if (typeof v !== 'number') return String(v);
  const a = Math.abs(v);
  if (opts.sci || (a !== 0 && (a < 1e-5 || a >= 1e10) && !opts.noSci)) {
    return v.toExponential(Math.max(1, d)).replace('e+', '×10^').replace('e-', '×10^-');
  }
  return v.toLocaleString('en-US', { minimumFractionDigits: opts.fixed ? d : 0, maximumFractionDigits: d });
}
/** smart decimals: big numbers fewer decimals */
export function fmtAuto(v, sig = 3) {
  if (!isNum(v)) return '–';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1000) return fmt(v, 0);
  if (a >= 100) return fmt(v, 1);
  if (a >= 10) return fmt(v, sig >= 4 ? 2 : 1);
  if (a >= 1) return fmt(v, 2);
  if (a >= 0.01) return fmt(v, 3);
  if (a >= 1e-4) return fmt(v, 5);
  return fmt(v, 2, { sci: true });
}
export const fmtLKR = (v) => (isNum(v) ? 'LKR ' + fmt(v, 0) : '–');
export function fmtMoney(v) {
  if (!isNum(v)) return '–';
  const a = Math.abs(v);
  if (a >= 1e9) return 'LKR ' + fmt(v / 1e9, 2) + ' bn';
  if (a >= 1e6) return 'LKR ' + fmt(v / 1e6, 1) + ' Mn';
  return 'LKR ' + fmt(v, 0);
}
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const deepClone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
export function deepMerge(base, over) {
  if (Array.isArray(base) || Array.isArray(over)) return over !== undefined ? deepClone(over) : deepClone(base);
  if (typeof base !== 'object' || base === null) return over !== undefined ? over : base;
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    out[k] =
      typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])
        ? deepMerge(base[k], over[k])
        : deepClone(over[k]);
  }
  return out;
}

/** Hazen–Williams head loss (m) for Q (m3/s), D (m), L (m), C */
export const hwLoss = (Q, D, L, C) => (Q <= 0 ? 0 : (10.67 * L * Q ** 1.852) / (C ** 1.852 * D ** 4.8704));
export const pipeArea = (D) => (PI * D * D) / 4;
export const vel = (Q, D) => Q / pipeArea(D);
/** choose DN (mm) so velocity is closest to target but <= vmax */
/** DN whose velocity lies in [vMin, vMax] and is closest to vTarget (falls back to selectDN) */
export function selectDNRange(Q, vMin, vMax, vTarget = (vMin + vMax) / 2, list = DN) {
  const c = list.filter((dn) => {
    const v = vel(Q, dn / 1000);
    return v >= vMin && v <= vMax;
  });
  if (c.length)
    return c.reduce((a, b) => (Math.abs(vel(Q, b / 1000) - vTarget) < Math.abs(vel(Q, a / 1000) - vTarget) ? b : a));
  return selectDN(Q, vTarget, vMax, list);
}
export function selectDN(Q, vTarget, vMax = 99, list = DN) {
  const need = Math.sqrt((4 * Q) / (PI * vTarget)) * 1000;
  let d = nextStd(need * 0.97, list);
  let i = list.indexOf(d);
  while (i < list.length - 1 && vel(Q, list[i] / 1000) > vMax) i++;
  return list[i];
}
