// Calculation-sheet logger: every module records equations, substituted values and results so the
// engineer can audit the design (rendered with KaTeX in the app and in the PDF report).
import { evaluate, rangeText } from './criteria.js';
import { fmtAuto, isNum } from './util.js';

export class Calc {
  constructor(criteria) {
    this.criteria = criteria;
    this.steps = [];
    this.checks = [];
    this.notes = [];
  }
  section(title) {
    this.steps.push({ kind: 'section', title });
  }
  /**
   * step(label, latexEquation, latexSubstitution, value, unit, ref)
   */
  step(label, eq, sub, value, unit = '', ref = '') {
    this.steps.push({ kind: 'step', label, eq, sub, value, unit, ref });
    return value;
  }
  text(t) {
    this.steps.push({ kind: 'text', text: t });
  }
  /** design check against the criteria library */
  check(key, value, label, extra = {}) {
    const c = { ...(this.criteria[key] || {}), ...(extra.crit || {}) };
    const status = extra.status || evaluate(c, value);
    const rec = { key, label: label || c.label, value, unit: extra.unit ?? c.unit, range: extra.range ?? rangeText(c), status, src: extra.src || c.src, note: extra.note || '' };
    this.checks.push(rec);
    return rec;
  }
  /** a custom boolean check */
  flag(label, ok, valueText, rangeTxt, note = '', severity = 'warn', src = '') {
    const rec = { key: '', label, value: valueText, unit: '', range: rangeTxt, status: ok ? 'ok' : severity, note, src };
    this.checks.push(rec);
    return rec;
  }
  note(level, text) {
    this.notes.push({ level, text });
  }
  result() {
    return { steps: this.steps, checks: this.checks, notes: this.notes };
  }
}

/** LaTeX-safe number */
export const n = (v, d) => {
  if (!isNum(v)) return '\\text{–}';
  const s = d === undefined ? fmtAuto(v) : v.toLocaleString('en-US', { maximumFractionDigits: d });
  return s.replace(/,/g, '{,}').replace('×10^', '\\times10^{') + (s.includes('×10^') ? '}' : '');
};

export function worstStatus(list) {
  if (list.some((c) => c.status === 'fail')) return 'fail';
  if (list.some((c) => c.status === 'warn')) return 'warn';
  return 'ok';
}
