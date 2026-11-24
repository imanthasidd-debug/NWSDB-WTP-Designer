// Orchestrates the whole design: runs every module in dependency order on the project inputs.
import { CRITERIA } from '../core/criteria.js';
import { isD2 } from '../core/d2.js';
import { clauseOf, isD3 } from '../core/d3.js';
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
import * as buildings from './buildings.js';
import * as special from './special.js';
import * as structure from './structure.js';
import * as assess from './assess.js';
import * as jartest from './jartest.js';
import * as omplan from './omplan.js';
import { designChain } from './chain.js';

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
  drawnBy: '',
  drawingStatus: 'Preliminary design',   // shown in the drawing title block
  revDesc: 'Issued for design review',
  revisions: [],                             // earlier revisions [{rev, date, desc}] listed in the title block
  notes: '',
};

/** @typedef {{ DEFAULTS?: Record<string, any>, compute: (inp: any, ctx: any) => any }} EngineModule */
/** design steps in calculation order – a step may only read the results of the steps before it */
/** @type {Array<[string, EngineModule]>} */
export const MODULES = [
  ['demand', demand], ['quality', quality], ['source', source], ['process', process], ['coag', coag], ['aeration', aeration],
  ['rapidmix', rapidmix], ['floc', floc], ['sed', sed], ['filt', filt], ['stab', stab], ['dis', dis],
  ['special', special], ['buildings', buildings], ['sludge', sludge], ['hyd', hyd], ['storage', storage], ['intake', intake], ['layout', layout], ['structure', structure],
  ['energy', energy], ['cost', cost], ['assess', assess], ['jartest', jartest], ['omplan', omplan], ['compliance', compliance],
];

export const DEFAULT_INPUTS = () => ({
  setup: { ...SETUP_DEFAULTS },
  ...Object.fromEntries(MODULES.filter(([, m]) => m.DEFAULTS).map(([k, m]) => [k, deepClone(m.DEFAULTS)])),
});

export function newProject() {
  return { app: 'NWSDB WTP Designer', version: 1, rb2025: true, rb2026: true, created: new Date().toISOString(), inputs: DEFAULT_INPUTS(), criteria: {} };
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
  // NWSDB Design Manual D2 / D3 compliance registers (every check that cites a clause of the manual)
  const register = (test, tag) => {
    const list = all.filter((c) => test(c.src)).map((c) => ({ ...c, clause: clauseOf(c.src, tag) || tag }));
    return { checks: list, ok: list.filter((c) => c.status === 'ok').length, warn: list.filter((c) => c.status === 'warn').length, fail: list.filter((c) => c.status === 'fail').length, info: list.filter((c) => c.status === 'info').length, total: list.length };
  };
  const d2 = register(isD2, 'D2');
  const d3 = register(isD3, 'D3');
  let chain = { stages: [], profile: [] };
  try { chain = designChain({ ...res, checks: all }); } catch (e) { errors.chain = String(e && e.stack ? e.stack : e); }
  return { ...res, checks: all, summary, d2, d3, errors, water: ctx.water, chain };
}
