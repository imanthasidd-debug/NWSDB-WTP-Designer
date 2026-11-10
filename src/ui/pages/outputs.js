// Dashboard, compliance, design-checks summary
import { fmt, fmtMoney } from '../../core/util.js';
import { worstStatus } from '../../core/calc.js';
import { h, icon } from '../dom.js';
import { pfdBlock } from '../draw/pfd.js';
import { locate } from '../locate.js';
import { bannerImg } from '../brand.js';
import { impactSummary, waterPath } from '../chain.js';
import { basisSwitch, ringGauge } from '../widgets.js';
import { card, chartCard, checksTable, kpis, notes, statusBadge, table } from '../results.js';
import { navigate, store } from '../store.js';
import { PAGES } from './registry.js';

const f0 = (v) => fmt(v, 0), f1 = (v) => fmt(v, 1), f2 = (v) => fmt(v, 2);

export function turbidityTrainChart(r) {
  const data = r.compliance.train.map((t) => ({ stage: t.stage, avg: t.avg, peak: t.peak }));
  return { type: 'bar', data, x: { key: 'stage', label: 'Stage' }, y: { label: 'Turbidity (NTU, log)', type: 'log', min: 0.05 }, series: [{ key: 'avg', label: 'Average season' }, { key: 'peak', label: 'Monsoon peak' }], refs: [{ value: 2, label: 'SLS 614 ≤ 2 NTU' }], unit: 'NTU', height: 260 };
}
export function logCreditChart(r) {
  const data = r.compliance.logs.map((l) => ({ org: l.org, physical: l.physical, disinf: l.disinf, req: l.req }));
  return { type: 'stacked', data, x: { key: 'org', label: 'Pathogen' }, y: { label: 'Log₁₀ reduction', min: 0 }, series: [{ key: 'physical', label: 'Removal by coagulation + filtration' }, { key: 'disinf', label: 'Inactivation by chlorine (CT)' }], refs: [{ value: 3, label: 'Giardia req. 3 log', kind: 'target' }, { value: 4, label: 'Virus req. 4 log', kind: 'target' }], unit: 'log', height: 260 };
}

// ------------------------------------------------------------------ Dashboard
const STEPS = [
  { n: 1, t: 'Project', pages: ['setup'], sub: () => store.project.inputs.setup.district + ' · ' + (store.project.inputs.setup.source || store.project.inputs.setup.sourceType) },
  { n: 2, t: 'Design basis', pages: ['demand'], sub: (r) => (r.demand.basis === 'capacity' ? 'Specified ' : 'Forecast ') + f0(r.demand.Qd) + ' m³/d' },
  { n: 3, t: 'Raw water & source', pages: ['quality', 'source'], sub: (r) => `${r.quality.turbMax} NTU peak · ${r.quality.T} °C` },
  { n: 4, t: 'Configure plant', pages: ['process'], sub: (r) => ({ conventional: 'Conventional', direct: 'Direct filtration', ssf: 'Slow sand' }[r.process.route]) + ` · ${r.process.train.length} units` },
  { n: 5, t: 'Treatment units', pages: ['intake', 'aeration', 'coag', 'rapidmix', 'floc', 'sed', 'filt', 'dis', 'stab'], sub: null },
  { n: 6, t: 'Plant-wide', pages: ['storage', 'sludge', 'hyd', 'layout', 'energy', 'cost'], sub: null },
  { n: 7, t: 'Outputs', pages: ['compliance', 'checks', 'report'], sub: () => 'report · Excel · DXF' },
];
function pageStatus(p, r) {
  if (!p) return 'na';
  if (p.id === 'setup') { const su = store.project.inputs.setup; return su.name && su.district ? 'ok' : 'warn'; }
  if (p.enabled && !p.enabled(r)) return 'na';
  if (p.id === 'checks') return r.summary.fail ? 'fail' : r.summary.warn ? 'warn' : 'ok';
  if (p.id === 'compliance') return r.compliance?.fails.length ? 'fail' : 'ok';
  const res = p.mod ? r[p.mod] : null;
  if (r.errors?.[p.mod]) return 'fail';
  return res?.checks?.length ? worstStatus(res.checks) : res ? 'ok' : 'na';
}
const worstOf = (list) => (list.includes('fail') ? 'fail' : list.includes('warn') ? 'warn' : list.every((x) => x === 'na') ? 'na' : 'ok');
function workflow(r) {
  const byId = (id) => PAGES.find((p) => p.id === id);
  return h('div', { class: 'wf' }, STEPS.map((s) => {
    const pages = s.pages.map(byId).filter(Boolean).filter((p) => !p.enabled || p.enabled(r));
    const st = worstOf(pages.map((p) => pageStatus(p, r)));
    const cur = s.pages.includes(store.page);
    return h('div', { class: 'wf-step st-' + st + (cur ? ' cur' : '') },
      h('button', { class: 'wf-head', onclick: () => navigate(pages[0]?.id || s.pages[0]) },
        h('span', { class: 'wf-n' }, st === 'ok' ? icon('ok') : s.n), h('span', { class: 'wf-t' }, s.t), h('span', { class: 'dot ' + st })),
      s.sub ? h('div', { class: 'wf-sub' }, s.sub(r)) : null,
      pages.length > 1 ? h('div', { class: 'wf-pages' }, pages.map((p) => h('button', { class: 'wf-pg st-' + pageStatus(p, r), title: p.title, onclick: () => navigate(p.id) }, icon(p.icon), h('span', null, p.title.replace(/ \(.*\)| & .*$/g, '').replace('Chemical dosing', 'Dosing').replace('Intake', 'Intake')), h('i', { class: 'dot ' + pageStatus(p, r) })))) : null);
  }));
}
const act = (a) => window.dispatchEvent(new CustomEvent('wtp-action', { detail: a }));

export const dashboard = {
  id: 'dashboard', title: 'Dashboard', sub: 'Plant at a glance – design basis, plant, compliance and what needs attention', icon: 'dashboard', group: 'Project', layout: 'full',
  renderFull(r) {
    const s = store.project.inputs.setup;
    const d = r.demand;
    const sum = r.summary;
    const hero = h('div', { class: 'dash-hero' },
      h('div', { class: 'dh-brand' }, h('div', { class: 'dh-logo', html: bannerImg(46) }), h('div', { class: 'dh-credit' }, 'WTP Designer v1.5 · ', h('b', null, 'NWSDB Design Manuals D2 & D3 · Rate Book 2025'))),
      h('div', { class: 'dh-main' },
        h('div', { class: 'dh-name' }, s.name || 'Untitled project'),
        h('div', { class: 'dh-meta' }, [s.code, s.district ? s.district + ' District' : '', s.source || s.sourceType, s.client].filter(Boolean).join(' · ')),
        h('div', { class: 'dh-cap' },
          h('div', { class: 'dh-q' }, h('span', { class: 'dh-v' }, f1(d.Qd / 1000)), h('span', { class: 'dh-u' }, 'MLD'), h('span', { class: 'dh-s' }, `${f0(d.Qd)} m³/d throughput · ${f0(d.Qh)} m³/h · ${d.nTrains} streams${d.basis === 'capacity' && d.inputs.capacityType === 'output' ? ` · = ${f0(d.inputs.capacity)} m³/d treated-water output + ${d.inputs.ownUse} % losses` : ''}`)),
          h('div', { class: 'dh-basis' }, h('div', { class: 'dh-bl' }, 'How is the capacity fixed?'), basisSwitch())),
        h('div', { class: 'dh-act' },
          h('button', { class: 'btn primary', onclick: () => navigate('process') }, icon('workflow'), 'Plant configurator'),
          h('button', { class: 'btn', onclick: () => navigate('chain') }, icon('route'), 'Design chain & impact'),
          h('button', { class: 'btn', onclick: () => navigate('report') }, icon('file'), 'Design report'),
          h('button', { class: 'btn', onclick: () => act('excel') }, icon('sheet'), 'Excel'),
          h('button', { class: 'btn ghost', onclick: () => act('save') }, icon('save'), 'Save'))),
      h('div', { class: 'dh-rings' },
        ringGauge('Design checks', sum.ok, sum.ok + sum.warn + sum.fail, { status: sum.fail ? 'fail' : sum.warn ? 'warn' : 'ok', sub: `${sum.warn} review · ${sum.fail} fail`, onClick: () => navigate('checks') }),
        ringGauge('SLS 614:2013', r.compliance.total - r.compliance.fails.length, r.compliance.total, { status: r.compliance.fails.length ? 'fail' : 'ok', sub: 'treated water', onClick: () => navigate('compliance') }),
        ringGauge('NWSDB D2', r.d2.ok, r.d2.total - r.d2.info, { status: r.d2.fail ? 'fail' : r.d2.warn ? 'warn' : 'ok', sub: `${r.d2.warn} review`, onClick: () => navigate('d2manual') }),
        ringGauge('NWSDB D3', r.d3.ok, r.d3.total - r.d3.info, { status: r.d3.fail ? 'fail' : r.d3.warn ? 'warn' : 'ok', sub: `${r.d3.info} advisory`, onClick: () => navigate('d3manual') })));
    const bad = [...r.checks.filter((c) => c.status === 'fail'), ...r.checks.filter((c) => c.status === 'warn')];
    const fatal = [];
    for (const k of ['process', 'compliance']) for (const n of r[k]?.notes || []) if (n.level === 'fail') fatal.push(n);
    const attention = h('div', { class: 'att' },
      fatal.length ? notes(fatal) : null,
      bad.length ? h('div', { class: 'att-list' }, bad.slice(0, 8).map((c) => {
        const pt = PAGES.find((p) => p.mod === c.module)?.title || c.module;
        return h('div', { class: 'att-row ' + c.status, onclick: () => locate(c) }, h('span', { class: 'dot ' + c.status }),
          h('div', { class: 'att-t' }, h('b', null, c.label), h('span', null, `${pt} · ${typeof c.value === 'number' ? fmt(c.value, 2) : c.value ?? ''} ${c.unit && c.unit !== '–' ? c.unit : ''} · criterion ${c.range || ''}`)),
          h('button', { class: 'ib-go' }, icon('crosshair'), 'Locate'));
      }), bad.length > 8 ? h('button', { class: 'btn sm ghost', onclick: () => navigate('checks') }, `+ ${bad.length - 8} more in Design checks`) : null)
        : h('div', { class: 'att-ok' }, icon('ok'), h('div', null, h('b', null, 'All design checks pass'), h('div', { class: 'small muted' }, `${sum.ok} checks against SLS 614, NWSDB D2 / D3 and the criteria library`))));
    const im = store.impact?.diff && (store.impact.diff.items.length || store.impact.diff.status.length);
    const tiles = kpis([
      { label: d.basis === 'capacity' ? 'Population equivalent' : 'Population served', value: f0(d.design.served), sub: d.basis === 'capacity' ? `at ${f0(d.lpcd)} L/c/d` : `${d.inputs.designYear} · ${f0(d.design.cov)} % coverage`, icon: 'users' },
      { label: 'Land requirement', value: f2(r.layout.ha), unit: 'ha', sub: `${f0(r.layout.perches)} perches`, icon: 'map' },
      { label: 'Capital cost', value: fmtMoney(r.cost.capex), sub: `${f0(r.cost.perCap)} LKR per m³/d`, icon: 'wallet' },
      { label: 'Production cost', value: f1(r.cost.fullPerM3), unit: 'LKR/m³', sub: `O&M ${f1(r.cost.omPerM3)} LKR/m³`, icon: 'banknote' },
      { label: 'Energy', value: f2(r.energy.spec), unit: 'kWh/m³', sub: `${r.energy.tx} kVA transformer`, icon: 'zap' },
      { label: 'Chemicals', value: f0(((r.coag?.annualKg || 0) + (r.stab?.annualKg || 0) + (r.coag?.limeAnnual || 0)) / 1000), unit: 't/yr', sub: `coagulant ${f0((r.coag?.annualKg || 0) / 1000)} t · lime ${f0(((r.stab?.annualKg || 0) + (r.coag?.limeAnnual || 0)) / 1000)} t`, icon: 'flask' },
      { label: 'Sludge', value: f0(r.sludge?.annualT), unit: 't DS/yr', sub: `${f0(r.sludge?.cakeT)} t cake/yr`, icon: 'recycle' },
    ]);
    const modRows = PAGES.filter((p) => p.mod && !['setup'].includes(p.mod) && p.group !== 'Library' && p.group !== 'Project').map((p) => {
      const res = r[p.mod];
      const enabled = p.enabled ? p.enabled(r) : true;
      const st = enabled && res ? worstStatus(res.checks || []) : 'na';
      return h('div', { class: 'mrow', onclick: () => navigate(p.id) }, h('span', { class: 'dot ' + st }), icon(p.icon), h('span', null, p.title), h('span', { class: 'mk' }, enabled ? keyResult(p.id, r) : 'not in train'));
    });
    return [
      hero,
      card('Design workflow', workflow(r), { sub: 'follow the steps left → right · every step feeds the next', flush: true }),
      card('Your plant – live process flow', pfdBlock(r), { sub: 'water coloured by turbidity · click any unit, chemical or stream to open its design' }),
      h('div', { class: 'grid2' },
        card(bad.length ? `Items requiring attention (${bad.length})` : 'Items requiring attention', attention, { sub: bad.length ? 'click to locate the input that controls it' : '' }),
        im ? card(`Impact of your last change`, h('div', null, h('div', { class: 'small muted', style: { marginBottom: '6px' } }, 'Results that changed, in train order – open the design chain for the full list.'), impactSummary()), { actions: [h('button', { class: 'btn sm', onclick: () => navigate('chain') }, icon('route'), 'Design chain')] })
          : card('How the units connect', waterPath(r, { compact: true }), { sub: 'water leaving each unit – click to open', flush: true, actions: [h('button', { class: 'btn sm', onclick: () => navigate('chain') }, icon('route'), 'Design chain')] })),
      tiles,
      h('div', { class: 'grid2' },
        card('Design status by unit', h('div', { class: 'modlist' }, modRows), { flush: true }),
        h('div', null,
          chartCard('Turbidity through the treatment train', turbidityTrainChart(r)),
          chartCard('Multi-barrier pathogen protection', logCreditChart(r), { sub: 'log credits vs USEPA requirement' }))),
      h('div', { class: 'dash-foot' }, h('div', { html: bannerImg(26) }), h('span', null, 'NWSDB WTP Designer v1.5'), h('span', { class: 'muted' }, 'NWSDB Design Manuals D2 (1989) & D3 (2020) · SLS 614:2013')),
    ];
  },
};
function keyResult(id, r) {
  try {
    switch (id) {
      case 'demand': return `${f0(r.demand.Qd)} m³/d`;
      case 'quality': return `${r.quality.turbMax} NTU peak`;
      case 'source': return r.source.isGW ? 'groundwater' : r.source.isRes ? `${f1(r.source.Kreq)} Mm³ live storage` : `${f0(r.source.dwPct)} % of dry-weather flow`;
      case 'process': return r.process.route;
      case 'intake': return r.intake.pumps ? `${r.intake.pumps.nDuty}+${r.intake.pumps.nStandby} × ${r.intake.pumps.motor} kW` : '';
      case 'aeration': return `DO ${f1(r.aeration.Ce)} mg/L`;
      case 'coag': return `${f1(r.coag.Ddes)} mg/L · pH ${f2(r.coag.pH1)}`;
      case 'rapidmix': return `G ${f0(r.rapidmix.Gact)} s⁻¹`;
      case 'floc': return `Gt ${f0(r.floc.Gt)}`;
      case 'sed': return r.sed.sorAct ? `${r.sed.N} × ${f1(r.sed.L || r.sed.D)} m · ${f1(r.sed.sorAct)} m/d` : '';
      case 'filt': return `${r.filt.N} × ${f1(r.filt.Af)} m² @ ${f1(r.filt.rate)} m/h`;
      case 'dis': return `CT × ${f2(r.dis.ratio)}`;
      case 'stab': return `pH ${f2(r.stab.pHfinal)} · LSI ${f2(r.stab.final.LSI)}`;
      case 'storage': return `${f0(r.storage.V)} m³ CWR`;
      case 'sludge': return `${f0(r.sludge.annualT)} t DS/yr`;
      case 'hyd': return `${f2(r.hyd.totalHead)} m head`;
      case 'layout': return `${f2(r.layout.ha)} ha`;
      case 'energy': return `${f0(r.energy.kva)} kVA`;
      case 'cost': return fmtMoney(r.cost.capex);
      case 'compliance': return `${r.compliance.total - r.compliance.fails.length}/${r.compliance.total} pass`;
      default: return '';
    }
  } catch { return ''; }
}

// ------------------------------------------------------------------ Compliance
export const compliance = {
  id: 'compliance', title: 'Water quality compliance', sub: 'Predicted treated-water quality vs SLS 614:2013 and multi-barrier log credits', icon: 'badge', group: 'Outputs', mod: 'compliance', layout: 'full',
  renderFull(r) {
    const c = r.compliance;
    return [
      kpis([
        { label: 'Parameters meeting SLS 614', value: `${c.total - c.fails.length} / ${c.total}`, accent: true, icon: 'badge', sub: 'predicted, design (worst) conditions' },
        { label: 'Filtered turbidity', value: `${f2(r.filt.filteredAvg)} / ${f2(r.filt.filteredPeak)}`, unit: 'NTU', sub: 'average / monsoon peak' },
        { label: 'Final pH', value: f2(r.stab.pHfinal), sub: 'SLS 614 6.5–8.5' },
        { label: 'Free chlorine', value: f2(r.dis.C), unit: 'mg/L', sub: 'SLS 614 ≤ 1' },
        { label: 'Residual Al', value: fmt(c.pred.al.v, 3), unit: 'mg/L', sub: 'SLS 614 ≤ 0.2' },
      ]),
      notes(c.notes),
      h('div', { class: 'grid2' }, chartCard('Turbidity through the treatment train', turbidityTrainChart(r)), chartCard('Multi-barrier pathogen protection', logCreditChart(r))),
      card('Predicted treated water vs SLS 614:2013', table([
        { k: 'st', l: '', v: (x) => statusBadge(x.exc ? 'fail' : 'ok') },
        { k: 'name', l: 'Parameter' }, { k: 'unit', l: 'Unit' },
        { k: 'raw', l: 'Raw (design)', num: true, fmt: (v, x) => fmt(v, x.dec ?? 2) },
        { k: 'v', l: 'Treated (predicted)', num: true, fmt: (v, x) => fmt(v, x.dec ?? 2) },
        { k: 'lim', l: 'SLS 614', v: (x) => (x.type === 'range' ? `${x.sls[0]} – ${x.sls[1]}` : x.type === 'nd' ? 'Not detected' : `≤ ${x.sls}`) },
        { k: 'how', l: 'Controlled by', v: (x) => h('span', { class: 'small muted' }, x.how) },
      ], c.rows), { flush: true }),
    ];
  },
};

// ------------------------------------------------------------------ Design checks
export const checks = {
  id: 'checks', title: 'Design checks', sub: 'Every design check across the plant against the criteria library', icon: 'checks', group: 'Outputs', layout: 'full',
  state: { filter: 'issues' },
  renderFull(r) {
    const st = checks.state;
    const all = r.checks.map((c) => ({ ...c, moduleLabel: PAGES.find((p) => p.mod === c.module)?.title || c.module }));
    const isD2 = (c) => /\bD2\b/.test(String(c.src || ''));
    const isD3 = (src) => /\bD3\b/.test(String(src || ''));
    const list = st.filter === 'all' ? all : st.filter === 'issues' ? all.filter((c) => c.status !== 'ok' && c.status !== 'info') : st.filter === 'd2' ? all.filter(isD2) : st.filter === 'd3' ? all.filter((c) => isD3(c.src)) : all.filter((c) => c.status === st.filter);
    const box = h('div');
    const seg = h('div', { class: 'seg' }, [['issues', 'Issues'], ['fail', 'Failing'], ['warn', 'To review'], ['ok', 'Passing'], ['d2', 'NWSDB D2'], ['d3', 'NWSDB D3'], ['all', 'All']].map(([k, l]) => h('button', { class: st.filter === k ? 'on' : '', onclick: () => { st.filter = k; navigate('checks'); } }, l)));
    box.append(checksTable(list, { showModule: true, locate, onRow: (c) => locate(c) }));
    return [
      kpis([
        { label: 'Checks passing', value: r.summary.ok, sub: `of ${r.summary.total}`, status: 'ok', icon: 'ok' },
        { label: 'To review', value: r.summary.warn, sub: 'outside typical range', status: r.summary.warn ? 'warn' : 'ok', icon: 'warn' },
        { label: 'Failing', value: r.summary.fail, sub: 'outside hard limits', status: r.summary.fail ? 'fail' : 'ok', icon: 'fail' },
      ]),
      h('div', { style: { marginBottom: '12px' } }, seg),
      card(null, list.length ? box : h('div', { class: 'empty' }, 'Nothing to show for this filter.'), { flush: true }),
    ];
  },
};
