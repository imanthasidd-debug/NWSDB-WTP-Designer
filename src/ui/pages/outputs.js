// Dashboard, compliance, design-checks summary
import { fmt, fmtMoney } from '../../core/util.js';
import { worstStatus } from '../../core/calc.js';
import { h, icon } from '../dom.js';
import { pfdSVG } from '../draw/pfd.js';
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
export const dashboard = {
  id: 'dashboard', title: 'Dashboard', sub: 'Plant at a glance', icon: 'dashboard', group: 'Project', layout: 'full',
  renderFull(r) {
    const s = store.project.inputs.setup;
    const d = r.demand;
    const sum = r.summary;
    const hero = h('div', { class: 'hero-card' },
      h('div', { class: 'hl' }, 'Plant design capacity'),
      h('div', { class: 'hv' }, f1(d.Qd / 1000), h('small', null, 'MLD')),
      h('div', { class: 'hs' }, `${f0(d.Qd)} m³/d · ${f0(d.Qh)} m³/h · ${f0(d.Qd / 86.4)} L/s`),
      h('div', { class: 'chips' }, [s.district + ' district', s.source || s.sourceType, `Design year ${d.inputs.designYear}`, `${d.nTrains} streams`, r.process.route === 'conventional' ? 'Conventional treatment' : r.process.route === 'direct' ? 'Direct filtration' : 'Slow sand filtration'].map((c) => h('span', { class: 'chip' }, c))),
      h('div', { class: 'wave', html: '<svg width="260" height="120" viewBox="0 0 260 120"><path d="M0 60 Q32 30 65 60 T130 60 T195 60 T260 60 V120 H0Z" fill="#fff"/><path d="M0 85 Q32 60 65 85 T130 85 T195 85 T260 85 V120 H0Z" fill="#fff" opacity=".6"/></svg>' }));
    const tiles = kpis([
      { label: 'Population served', value: f0(d.design.served), sub: `${d.inputs.designYear} · ${f0(d.design.cov)} % coverage`, icon: 'users' },
      { label: 'Land requirement', value: f2(r.layout.ha), unit: 'ha', sub: `${f0(r.layout.perches)} perches`, icon: 'map' },
      { label: 'Capital cost', value: fmtMoney(r.cost.capex), sub: `${f0(r.cost.perCap)} LKR per m³/d`, icon: 'wallet' },
      { label: 'Production cost', value: f1(r.cost.fullPerM3), unit: 'LKR/m³', sub: `O&M ${f1(r.cost.omPerM3)} LKR/m³`, icon: 'banknote' },
      { label: 'Energy', value: f2(r.energy.spec), unit: 'kWh/m³', sub: `${r.energy.tx} kVA · alum ${f0((r.coag?.annualKg || 0) / 1000)} t/yr`, icon: 'zap' },
      { label: 'SLS 614 compliance', value: `${r.compliance.total - r.compliance.fails.length}/${r.compliance.total}`, sub: 'predicted treated water', icon: 'badge', status: r.compliance.fails.length ? 'fail' : 'ok' },
      { label: 'Design checks', value: `${sum.ok}/${sum.total}`, sub: `${sum.warn} to review · ${sum.fail} failing`, icon: 'checks', status: sum.fail ? 'fail' : sum.warn ? 'warn' : 'ok' },
      { label: 'NWSDB D2 checks', value: `${r.d2.ok}/${r.d2.total - r.d2.info}`, sub: `clause checks · ${r.d2.warn} review · ${r.d2.fail} fail`, icon: 'landmark', status: r.d2.fail ? 'fail' : r.d2.warn ? 'warn' : 'ok' },
    ]);
    const pfd = h('div', { class: 'pfd', html: pfdSVG(r, { width: 1100 }) });
    pfd.addEventListener('click', (e) => { const g = e.target.closest('[data-page]'); if (g) navigate(g.dataset.page); });
    const modRows = PAGES.filter((p) => p.mod && !['setup'].includes(p.mod) && p.group !== 'Library').map((p) => {
      const res = r[p.mod];
      const enabled = p.enabled ? p.enabled(r) : true;
      const st = enabled && res ? worstStatus(res.checks || []) : 'na';
      return h('div', { class: 'mrow', onclick: () => navigate(p.id) }, h('span', { class: 'dot ' + st }), icon(p.icon), h('span', null, p.title), h('span', { class: 'mk' }, enabled ? keyResult(p.id, r) : 'not in train'));
    });
    const issues = [...r.checks.filter((c) => c.status === 'fail'), ...r.checks.filter((c) => c.status === 'warn')].slice(0, 6).map((c) => ({ level: c.status, text: `${PAGES.find((p) => p.mod === c.module)?.title || c.module}: ${c.label} = ${typeof c.value === 'number' ? fmt(c.value, 3) : c.value} ${c.unit || ''} (criterion ${c.range})` }));
    const allNotes = [];
    for (const k of ['process', 'compliance']) for (const n of r[k]?.notes || []) if (n.level === 'fail') allNotes.push(n);
    return [
      h('div', { class: 'hero' }, hero, tiles),
      card('Treatment train', pfd, { sub: 'animated process flow – click a unit to open its design' }),
      h('div', { class: 'grid2' },
        card('Design status by unit', h('div', { class: 'modlist' }, modRows), { flush: true }),
        h('div', null,
          chartCard('Turbidity through the treatment train', turbidityTrainChart(r)),
          chartCard('Multi-barrier pathogen protection', logCreditChart(r), { sub: 'log credits vs USEPA requirement' }))),
      allNotes.length || issues.length ? card('Items requiring attention', notes([...allNotes, ...issues])) : card('Items requiring attention', notes([{ level: 'ok', text: 'All design checks pass.' }])),
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
    const isD2 = (c) => String(c.src || '').includes('D2');
    const list = st.filter === 'all' ? all : st.filter === 'issues' ? all.filter((c) => c.status !== 'ok' && c.status !== 'info') : st.filter === 'd2' ? all.filter(isD2) : all.filter((c) => c.status === st.filter);
    const box = h('div');
    const seg = h('div', { class: 'seg' }, [['issues', 'Issues'], ['fail', 'Failing'], ['warn', 'To review'], ['ok', 'Passing'], ['d2', 'NWSDB D2'], ['all', 'All']].map(([k, l]) => h('button', { class: st.filter === k ? 'on' : '', onclick: () => { st.filter = k; navigate('checks'); } }, l)));
    box.append(checksTable(list, { showModule: true, onRow: (c) => navigate(PAGES.find((p) => p.mod === c.module)?.id || 'dashboard') }));
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
