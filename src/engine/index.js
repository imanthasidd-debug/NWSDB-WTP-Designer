// Orchestrates the whole design: runs every module in dependency order on the project inputs.
import { CRITERIA } from '../core/criteria.js';
import { isD2 } from '../core/d2.js';
import { mu, nu, rho } from '../core/water.js';
import { deepClone } from '../core/util.js';
import * as demand from './demand.js';
import * as quality from './quality.js';
import * as source from './source.js';
import * as process from './process.js';
import * as coag from './coagulation.js';
import * as aeration from './aeration.js';
import * as rapidmix from './rapidmix.js';
import * as floc from './flocculation.js';
import * as sed from './sedimentation.js';
import * as filt from './filtration.js';
import * as stab from './stabilisation.js';
import * as dis from './disinfection.js';
import * as sludge from './sludge.js';
import * as hyd from './hydraulics.js';
import * as storage from './storage.js';
import * as intake from './intake.js';
import * as layout from './layout.js';
import * as energy from './energy.js';
import * as cost from './cost.js';
import * as compliance from './compliance.js';

export const SETUP_DEFAULTS = {
  name: 'Sample Water Treatment Plant – Stage I',
  code: 'WTP-2026-001',
  client: 'National Water Supply & Drainage Board',
  rsc: 'RSC – Western Central',
  district: 'Gampaha',
  town: '',
  source: 'River (wet-zone)',
  sourceType: 'river',        // river | reservoir | lake | groundwater
  siteGL: 20,                 // m MSL
  siteElevation: 20,
  landConstrained: false,
  designer: '',
  checker: '',
  approver: '',
  date: new Date().toISOString().slice(0, 10),
  revision: 'A',
  notes: '',
};

export const MODULES = [
  ['demand', demand], ['quality', quality], ['source', source], ['process', process], ['coag', coag], ['aeration', aeration],
  ['rapidmix', rapidmix], ['floc', floc], ['sed', sed], ['filt', filt], ['stab', stab], ['dis', dis],
  ['sludge', sludge], ['hyd', hyd], ['storage', storage], ['intake', intake], ['layout', layout],
  ['energy', energy], ['cost', cost], ['compliance', compliance],
];

export const DEFAULT_INPUTS = () => ({
  setup: { ...SETUP_DEFAULTS },
  ...Object.fromEntries(MODULES.filter(([, m]) => m.DEFAULTS).map(([k, m]) => [k, deepClone(m.DEFAULTS)])),
});

export function newProject() {
  return { app: 'NWSDB WTP Designer', version: 1, created: new Date().toISOString(), inputs: DEFAULT_INPUTS(), criteria: {} };
}

/** criteria with project overrides */
export function criteriaFor(project) {
  const c = {};
  for (const [k, v] of Object.entries(CRITERIA)) c[k] = { ...v, ...(project.criteria?.[k] || {}) };
  return c;
}

export function computeAll(project) {
  const inp = project.inputs;
  const crit = criteriaFor(project);
  const res = {};
  const errors = {};
  const ctx = { inp, crit, res, water: null };
  for (const [key, mod] of MODULES) {
    try {
      if (key === 'process' || key === 'coag') {
        // water properties become available once temperature is known
        const T = res.quality?.T ?? 28;
        ctx.water = { T, rho: rho(T), mu: mu(T), nu: nu(T) };
      }
      if (key === 'coag' && res.process && !res.process.has.coag) { res.coag = null; continue; }
      if (key === 'aeration' && res.process && !res.process.has.aeration) { res.aeration = mod.compute(inp[key] || {}, ctx); res.aeration.enabled = false; continue; }
      res[key] = mod.compute(inp[key] || {}, ctx);
    } catch (e) {
      errors[key] = String(e && e.stack ? e.stack : e);
      res[key] = null;
    }
  }
  // aggregate checks
  const all = [];
  for (const [key] of MODULES) {
    const r = res[key];
    if (!r || r.enabled === false) continue;
    for (const c of r.checks || []) all.push({ module: key, ...c });
  }
  const summary = {
    ok: all.filter((c) => c.status === 'ok').length,
    warn: all.filter((c) => c.status === 'warn').length,
    fail: all.filter((c) => c.status === 'fail').length,
    total: all.length,
  };
  // NWSDB Design Manual D2 compliance register (every check that cites a D2 clause)
  const d2c = all.filter((c) => isD2(c.src)).map((c) => { const m = String(c.src).match(/§\s?(\d+(?:\.\d+)*(?:[–-]\d+(?:\.\d+)+)?)|Table\s*\d+(?:\.\d+)?|Fig\s*\d+(?:\.\d+)?/); return { ...c, clause: m ? (m[1] ? '§' + m[1] : m[0]) : 'D2' }; });
  const d2 = { checks: d2c, ok: d2c.filter((c) => c.status === 'ok').length, warn: d2c.filter((c) => c.status === 'warn').length, fail: d2c.filter((c) => c.status === 'fail').length, info: d2c.filter((c) => c.status === 'info').length, total: d2c.length };
  return { ...res, checks: all, summary, d2, errors, water: ctx.water };
}
