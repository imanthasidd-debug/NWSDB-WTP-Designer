// Old project files keep opening: test/fixtures/v<version>-<sample>.wtpd were saved by each released version's own code
// (v1.1.0 … v1.8.2, every sample of that version). Each one must
//   1. open through store.normalise() and calculate with no module error,
//   2. normalise to the same project when opened a second time (migration is stable),
//   3. give the same key results as recorded in test/fixtures/golden.json.
// When an engine change is intended to move results, review the differences printed here, then record the new values:
//   node test/fixtures.test.mjs --update
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };
const { normalise } = await import('../src/ui/store.js');
const { computeAll } = await import('../src/engine/index.js');

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const goldenFile = path.join(dir, 'golden.json');
const update = process.argv.includes('--update');
const golden = fs.existsSync(goldenFile) ? JSON.parse(fs.readFileSync(goldenFile, 'utf8')) : {};
const REL = 1e-6; // results are deterministic – any real change shows

/** the results an engineer would notice: capacity, route, unit sizes, chemicals, power, cost and checks */
function keyResults(r) {
  const v = (x, d = 4) => (typeof x === 'number' && Number.isFinite(x) ? +x.toPrecision(d + 4) : x ?? null);
  return {
    Qd: v(r.demand?.Qd),
    route: r.process?.route ?? null,
    nTrains: v(r.demand?.nTrains),
    alum: v(r.coag?.Ddes ?? null),
    sedArea: v(r.sed?.A ?? null),
    filterArea: v(r.filt?.A ?? null),
    nFilters: v(r.filt?.N ?? null),
    clDose: v(r.dis?.totDose ?? null),
    cwrVolume: v(r.storage?.V ?? null),
    totalHead: v(r.hyd?.totalHead ?? null),
    maxDemandKVA: v(r.energy?.kva ?? null),
    capex: v(r.cost?.capex ?? null),
    checks: { ok: r.summary.ok, warn: r.summary.warn, fail: r.summary.fail },
    sls: r.compliance ? `${r.compliance.passCount}/${r.compliance.total}` : null,
  };
}

const same = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= REL * Math.max(1, Math.abs(a), Math.abs(b));
  if (a && b && typeof a === 'object') return Object.keys({ ...a, ...b }).every((k) => same(a[k], b[k]));
  return a === b;
};

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.error('✗ ' + msg); } };
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.wtpd')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const next = {};
for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  let p, r;
  try { p = normalise(raw); r = computeAll(p); } catch (e) { ok(false, `${f}: does not open – ${e.message}`); continue; }
  const errs = Object.entries(r.errors || {});
  ok(!errs.length, `${f}: calculation errors in ${errs.map(([k, e]) => `${k} (${String(e).split('\n')[0]})`).join(', ')}`);
  const p2 = normalise(JSON.parse(JSON.stringify(p)));
  for (const k of ['migratedRB2025', 'migratedRB2026']) { delete p[k]; delete p2[k]; }
  ok(JSON.stringify(p2) === JSON.stringify(p), `${f}: opening it a second time changes the project (migration not stable)`);
  const k = keyResults(r);
  next[f] = k;
  if (!update) {
    if (!golden[f]) ok(false, `${f}: no recorded results – run node test/fixtures.test.mjs --update`);
    else {
      const diffs = Object.keys({ ...k, ...golden[f] }).filter((x) => !same(k[x], golden[f][x]));
      ok(!diffs.length, `${f}: results changed – ${diffs.map((x) => `${x} ${JSON.stringify(golden[f][x])} → ${JSON.stringify(k[x])}`).join('; ')}`);
    }
  }
}
if (update) {
  fs.writeFileSync(goldenFile, JSON.stringify(next, null, 1) + '\n');
  console.log(`recorded key results of ${files.length} project files in test/fixtures/golden.json`);
}
console.log(`old project files: ${files.length} (v${files[0]?.match(/v([\d.]+)-/)?.[1]} … v${files.at(-1)?.match(/v([\d.]+)-/)?.[1]}) · ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
