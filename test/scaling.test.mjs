// Scaling checks: every sample is designed at 500 … 200,000 m³/d (the range the program sizes automatically).
//   1. no design step may throw a calculation error at any capacity;
//   2. while the treatment route and filter type stay the same, more flow must never give smaller total tanks,
//      filters, clear-water storage, coagulant use, power demand or capital cost;
//   3. capital cost per m³/d must not rise with size (economy of scale, 2 % tolerance);
//   4. results are plain data (no functions) – they are cloned to and from the calculation worker.
// Failing design checks at extreme capacities are expected (e.g. a small source cannot supply 200,000 m³/d) – they are
// listed for information only.
import { computeAll } from '../src/engine/index.js';
import { SAMPLES } from '../src/ui/samples.js';

const CAPS = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 150000, 200000];
const METRICS = {
  'total settling / clarifier area': (r) => (r.sed?.A ? r.sed.A * (r.sed.N || 1) : null),
  'total filter area': (r) => r.filt?.A ?? null,
  'clear-water reservoir volume': (r) => r.storage?.V ?? null,
  'coagulant use (design day)': (r) => r.coag?.kgDes ?? null,
  'maximum demand (kVA)': (r) => r.energy?.kva ?? null,
  'capital cost': (r) => r.cost?.capex ?? null,
};
const TOL = 1e-6;
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.error('✗ ' + msg); } };
const info = [];

for (const s of SAMPLES) {
  let prev = null;
  for (const q of CAPS) {
    const p = s.build();
    Object.assign(p.inputs.demand, { basis: 'capacity', capacity: q });
    let r;
    try { r = computeAll(p); } catch (e) { ok(false, `${s.id} @ ${q} m³/d: computeAll threw ${e.message}`); prev = null; continue; }
    const errs = Object.entries(r.errors || {});
    ok(!errs.length, `${s.id} @ ${q} m³/d: calculation error in ${errs.map(([k, e]) => `${k} (${String(e).split('\n')[0]})`).join(', ')}`);
    // results must be plain data: they are saved, exported and sent from the calculation worker (no functions)
    let cloneErr = null;
    try { structuredClone(r); } catch (e) { cloneErr = e.message.split('\n')[0]; }
    ok(!cloneErr, `${s.id} @ ${q} m³/d: results are not plain data – ${cloneErr}`);
    ok(Math.abs(r.demand.Qd - q) < 1e-6, `${s.id} @ ${q} m³/d: specified capacity not used (${r.demand.Qd})`);
    const cur = { q, route: `${r.process?.route}/${r.filt?.type ?? r.filt?.inputs?.type ?? ''}`, m: Object.fromEntries(Object.entries(METRICS).map(([k, f]) => [k, f(r)])), unit: r.cost?.capex / q };
    if (r.summary.fail) info.push(`${s.id} @ ${q}: ${r.checks.filter((c) => c.status === 'fail').map((c) => `${c.module} – ${c.label}`).join('; ')}`);
    if (prev && prev.route === cur.route) {
      for (const k of Object.keys(METRICS)) {
        const a = prev.m[k], b = cur.m[k];
        if (typeof a !== 'number' || typeof b !== 'number') continue;
        ok(b >= a * (1 - TOL), `${s.id}: ${k} falls from ${a.toFixed(1)} at ${prev.q} to ${b.toFixed(1)} at ${q} m³/d (${cur.route})`);
      }
      ok(cur.unit <= prev.unit * 1.02, `${s.id}: cost per m³/d rises from ${prev.unit.toFixed(0)} at ${prev.q} to ${cur.unit.toFixed(0)} LKR at ${q} m³/d`);
    }
    prev = cur;
  }
}
if (process.argv.includes('--verbose')) console.log('Failing design checks (information):\n  ' + info.join('\n  '));
console.log(`scaling: ${SAMPLES.length} samples × ${CAPS.length} capacities (${CAPS[0]}–${CAPS.at(-1).toLocaleString('en-US')} m³/d) · ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
