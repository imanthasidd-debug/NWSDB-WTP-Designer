// Validation against built plants: test/plants/*.json (see test/plants/README.md). For each plant the program's design
// is compared with the as-built sizes; a difference beyond the tolerance fails. Files starting with "_" are examples:
// only their structure is checked (every result path must give a number).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepMerge } from '../src/core/util.js';
import { computeAll, newProject } from '../src/engine/index.js';
import { SAMPLES } from '../src/ui/samples.js';

globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };
const { normalise } = await import('../src/ui/store.js');
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'plants');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const get = (r, expr) => expr.split('*').map((p) => p.trim().split('.').reduce((o, k) => (o == null ? undefined : o[k]), r)).reduce((a, b) => (typeof a === 'number' && typeof b === 'number' ? a * b : undefined));
let pass = 0, fail = 0, plants = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.error('✗ ' + msg); } };

for (const f of files) {
  const example = f.startsWith('_');
  const spec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  let project;
  if (spec.project) project = JSON.parse(fs.readFileSync(path.join(dir, spec.project), 'utf8'));
  else if (String(spec.basedOn || '').startsWith('sample:')) {
    const s = SAMPLES.find((x) => x.id === spec.basedOn.slice(7));
    if (!s) { ok(false, `${f}: unknown sample ${spec.basedOn}`); continue; }
    project = s.build();
  } else project = newProject();
  project = normalise(project);
  project.inputs = deepMerge(project.inputs, spec.inputs || {});
  const r = computeAll(project);
  const errs = Object.keys(r.errors || {});
  ok(!errs.length, `${f}: calculation errors in ${errs.join(', ')}`);
  if (!example) { plants++; console.log(`\n${spec.name}${spec.reference ? ` (${spec.reference})` : ''}`); }
  for (const a of spec.asBuilt || []) {
    const v = get(r, a.result);
    ok(typeof v === 'number' && Number.isFinite(v), `${f}: result "${a.result}" (${a.label}) is not a number`);
    if (example || typeof v !== 'number') continue;
    const tol = a.tolerance ?? spec.tolerance ?? 0.15;
    const diff = a.value ? (v - a.value) / a.value : v;
    const good = Math.abs(diff) <= tol + 1e-9;
    console.log(`  ${good ? '✓' : '✗'} ${a.label.padEnd(36)} as built ${String(a.value).padStart(10)} · design ${String(+v.toPrecision(5)).padStart(10)} ${a.unit || ''} · ${(diff * 100).toFixed(1)} % (±${(tol * 100).toFixed(0)} %)`);
    ok(good, `${spec.name}: ${a.label} differs by ${(diff * 100).toFixed(1)} % (allowed ±${(tol * 100).toFixed(0)} %)`);
  }
}
console.log(`\nbuilt-plant validation: ${plants ? `${plants} plant(s)` : 'no plant files yet (add them to test/plants/)'} · ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
