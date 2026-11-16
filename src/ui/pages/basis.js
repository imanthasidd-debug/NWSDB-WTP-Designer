// Project setup, demand forecast, raw-water quality and process selection pages
import { BASINS, COMMUNITY, DESIGN_PERIODS, EVAPORATION, NON_DOMESTIC, lpcdRange } from '../../core/d2.js';
import { PARAMS, limitText, rawGlText } from '../../core/standards.js';
import { PROC as D3PROC } from '../../core/d3.js';
import { AREA_PRESETS, DISTRICTS, ZONE_LABEL, elevationOf, provinceOf, waterTempOf } from '../../core/srilanka.js';
import { MONTHS, esc, fmt, fmtAuto } from '../../core/util.js';
import { LABELS } from '../../engine/process.js';
import { h, icon } from '../dom.js';
import { card, chartCard, kpis, notes, statusBadge, table } from '../results.js';
import { navigate, setInput, store } from '../store.js';
import { basisCards, capacityPresets } from '../widgets.js';

const opt = (o) => Object.entries(o);

// ------------------------------------------------------------------ Setup
export const setup = {
  id: 'setup', title: 'Project setup', sub: 'Project identity, location, water source and design team', icon: 'settings', group: 'Project', mod: 'setup',
  fields: [
    { sec: 'Project' },
    { k: 'name', l: 'Project / scheme name', t: 'text', wide: true },
    { k: 'code', l: 'Project code', t: 'text' },
    { k: 'client', l: 'Client', t: 'text' },
    { k: 'rsc', l: 'Regional Support Centre / Division', t: 'text', ph: 'e.g. RSC Western-Central' },
    { sec: 'Location & source' },
    { k: 'district', l: 'District', t: 'sel', o: DISTRICTS.map((d) => [d.district, `${d.district} (${d.province})`]), onChange: (v) => { setInput(['setup', 'siteElevation'], elevationOf(v), { immediate: true }); } },
    { k: 'town', l: 'Town / GN division', t: 'text' },
    { k: 'source', l: 'Source name', t: 'text', ph: 'e.g. Kelani Ganga' },
    { k: 'sourceType', l: 'Source type', t: 'sel', o: [['river', 'River / stream'], ['reservoir', 'Reservoir / irrigation tank'], ['lake', 'Lake'], ['groundwater', 'Groundwater (tube wells)']] },
    { k: 'siteGL', l: 'Treatment-site ground level', u: 'm MSL', step: 0.1 },
    { k: 'siteElevation', l: 'Site elevation (for DO & NPSH)', u: 'm', step: 1 },
    { k: 'landConstrained', l: 'Land is constrained (favour compact units)', t: 'bool' },
    { sec: 'Design basis – how is the plant capacity fixed?' },
    { k: '_basis', t: 'custom', render: () => basisCards() },
    { k: 'capacity', path: ['demand', 'capacity'], l: 'Specified plant capacity', u: 'm³/d', step: 500, show: (i) => i.demand?.basis === 'capacity' },
    { k: '_presets', t: 'custom', render: () => capacityPresets(), show: (i) => i.demand?.basis === 'capacity' },
    { k: 'capacityType', path: ['demand', 'capacityType'], l: 'Capacity refers to', t: 'sel', o: [['throughput', 'Plant design throughput (inflow)'], ['output', 'Treated-water output (losses added)']], show: (i) => i.demand?.basis === 'capacity' },
    { k: 'nTrains', path: ['demand', 'nTrains'], l: 'Parallel treatment streams', step: 1, auto: true, autoVal: (r) => r.demand?.nTrains, note: 'D3 §4.3.8: ≥ 2 independent trains; auto adds a pair per 50,000 m³/d' },
    { sec: 'Design team' },
    { k: 'designer', l: 'Designed by', t: 'text' },
    { k: 'checker', l: 'Checked by', t: 'text' },
    { k: 'approver', l: 'Approved by', t: 'text' },
    { k: 'date', l: 'Date', t: 'date' },
    { sec: 'Drawing title block' },
    { k: 'drawnBy', l: 'Drawn by', t: 'text', ph: 'WTP Designer' },
    { k: 'drawingStatus', l: 'Drawing status', t: 'sel', o: [['Preliminary design', 'Preliminary design'], ['For review', 'For review'], ['For approval', 'For approval'], ['Tender', 'Tender'], ['For construction', 'For construction'], ['As built', 'As built']] },
    { k: 'revision', l: 'Current revision', t: 'text' },
    { k: 'revDesc', l: 'Description of this revision', t: 'text' },
    { k: 'revisions', t: 'table', l: 'Earlier revisions', cols: [{ k: 'rev', l: 'Rev', text: true, w: '14%' }, { k: 'date', l: 'Date', text: true, w: '28%' }, { k: 'desc', l: 'Description', text: true }], add: { rev: '', date: '', desc: '' }, minRows: 0 },
    { k: 'notes', l: 'Project notes', t: 'area', ph: 'Scope, assumptions, data sources…' },
  ],
  render(r) {
    const s = store.project.inputs.setup;
    const q = r.quality;
    return {
      overview: [
        kpis([
          { label: 'Province', value: provinceOf(s.district), icon: 'pin', sub: s.district + ' district' },
          { label: 'Climatic zone', value: q.zone[0].toUpperCase() + q.zone.slice(1), icon: 'rain', sub: ZONE_LABEL[q.zone].split('–')[1]?.trim() },
          { label: 'Design water temperature', value: q.T, unit: '°C', icon: 'thermo', sub: q.inputs.useDistrictTemp ? 'District typical' : 'User value' },
          { label: 'Plant capacity', value: fmt(r.demand.Qd, 0), unit: 'm³/d', icon: 'droplets', sub: `${fmt(r.demand.Qd / 1000, 1)} MLD · design year ${r.demand.inputs.designYear}`, accent: true },
        ]),
        h('div', { class: 'fsec-h', style: { margin: '6px 0 10px' } }, 'Regional considerations (screening level)'),
        notes(q.alerts),
        card('How to use this application', h('div', { html: `<ol style="margin:0;padding-left:18px;line-height:1.7">
          <li>Complete <b>Project setup</b> and <b>Demand forecast</b> – the adopted capacity drives every unit.</li>
          <li>Enter laboratory results in <b>Raw water quality</b>; the monsoon profile follows the district automatically.</li>
          <li>Review the recommended train in <b>Process selection</b> – override any unit if required.</li>
          <li>Work through each treatment unit. Inputs on the left recalculate instantly; checks against the design criteria appear in colour.</li>
          <li>Finish with the <b>Hydraulic profile</b>, <b>Site layout</b>, <b>Cost estimate</b> and <b>Compliance</b>, then export the <b>Design report</b> (PDF), Excel workbook or DXF drawings.</li></ol>` })),
      ],
    };
  },
};

// ------------------------------------------------------------------ Demand
export const demand = {
  id: 'demand', title: 'Demand forecast', sub: 'Population projection, per-capita demand, NRW and peaking → plant capacity', icon: 'users', group: 'Design basis', mod: 'demand',
  fields: [
    { sec: 'Design basis' },
    { k: '_basis', t: 'custom', render: () => basisCards() },
    { k: 'capacity', l: 'Specified plant capacity', u: 'm³/d', step: 500, show: (i) => i.demand.basis === 'capacity' },
    { k: '_presets', t: 'custom', render: () => capacityPresets(), show: (i) => i.demand.basis === 'capacity' },
    { k: 'capacityType', l: 'Capacity refers to', t: 'sel', o: [['throughput', 'Plant design throughput (inflow)'], ['output', 'Treated-water output (losses added)']], show: (i) => i.demand.basis === 'capacity' },
    { sec: 'Planning horizon (D2 §2.4)' },
    { k: 'baseYear', l: 'Base year', step: 1, show: (i) => i.demand.basis !== 'capacity' },
    { k: 'stageYear', l: 'Stage I year', step: 1, note: 'D2: two 10-year stages', show: (i) => i.demand.basis !== 'capacity' },
    { k: 'designYear', l: 'Design (ultimate) year', step: 1, note: (r) => `D2: ${r.demand.d2.horizon.text}` },
    { k: 'nTrains', l: 'Parallel treatment streams', step: 1, auto: true, autoVal: (r) => r.demand?.nTrains, note: 'Auto: 2 up to 50,000 m³/d, then a pair per further 50,000 m³/d' },
    { sec: 'Population (D2 §3.1)', show: (i) => i.demand.basis !== 'capacity' },
    { k: 'method', l: 'Projection method', t: 'sel', o: [['geom', 'Geometric / exponential (census)'], ['arith', 'Arithmetic / linear (census)'], ['incr', 'Incremental increase (census)'], ['rate', 'Given growth rate (district rate)']] },
    { k: 'basePop', l: 'Base-year population', step: 100, show: (i) => i.demand.method === 'rate' },
    { k: 'growthRate', l: 'Growth rate', u: '%/yr', step: 0.05, show: (i) => i.demand.method === 'rate', note: 'D2: district average where history is unknown' },
    { k: 'census', t: 'table', l: 'Census data (Dept. of Census & Statistics)', cols: [{ k: 'year', l: 'Year' }, { k: 'pop', l: 'Population' }], add: { year: 2024, pop: 0 }, minRows: 2, show: (i) => i.demand.method !== 'rate' },
    { k: 'coverageNow', l: 'Service coverage – base year', u: '%' },
    { k: 'coverageDesign', l: 'Service coverage – design year', u: '%' },
    { sec: 'Domestic demand (D2 §3.2.1)' },
    { k: 'demandBasis', l: 'Per-capita basis', t: 'sel', o: [['lpcd', 'Per-capita rate (assessed / P1 density norms)'], ['d2', 'D2 – house connections + standposts']] },
    { k: 'areaType', l: 'Area type (preset)', t: 'sel', show: (i) => i.demand.demandBasis !== 'd2', o: opt(AREA_PRESETS).map(([k, v]) => [k, `${v.label} – ${v.lpcd} L/c/d`]), onChange: (v) => { setInput(['demand', 'lpcd'], AREA_PRESETS[v].lpcd, { immediate: true }); setInput(['demand', 'nonDomPct'], AREA_PRESETS[v].nonDom, { immediate: true }); } },
    { k: 'lpcd', l: 'Domestic per-capita demand', u: 'L/c/d', crit: 'dem.lpcd', show: (i) => i.demand.demandBasis !== 'd2', note: (r) => (r.demand.d2.range ? `D2 ${Math.round(r.demand.d2.range[0])}–${Math.round(r.demand.d2.range[1])} for this size` : 'D2: large urban – assess individually') },
    { k: 'hcPct', l: 'Population on house connections', u: '%', auto: true, autoVal: (r) => r.demand.d2.hcPct, show: (i) => i.demand.demandBasis === 'd2', note: (r) => (r.demand.d2.cls.hc ? `D2 ${r.demand.d2.cls.hc[0]}–${r.demand.d2.cls.hc[1]} %` : '') },
    { k: 'hcLpcd', l: 'House-connection consumption', u: 'L/c/d', auto: true, autoVal: (r) => r.demand.d2.hcLpcd, show: (i) => i.demand.demandBasis === 'd2', note: 'D2: 140 large rural, 185 urban' },
    { k: 'spLpcd', l: 'Standpost consumption', u: 'L/c/d', show: (i) => i.demand.demandBasis === 'd2', note: 'D2: 45 L/c/d' },
    { sec: 'Non-domestic demand (D2 §3.2.3)' },
    { k: 'nonDomPct', l: 'Non-domestic demand', u: '% of dom.', note: 'D2: ≈ 10 % small urban & rural' },
    { sec: 'Other consumers', show: (i) => i.demand.basis !== 'capacity' },
    { k: 'nonDomItems', t: 'table', l: 'Institutions & commercial (D2 unit demands)', minRows: 0, cols: [{ k: 'type', l: 'Category', o: NON_DOMESTIC.map((x) => [x.id, `${x.label} (${x.min}–${x.max} L/${x.per}·d)`]), w: '58%' }, { k: 'qty', l: 'Number' }, { k: 'rate', l: 'L/unit·d (0 = mid)' }], add: { type: 'hospital', qty: 100, rate: 0 } },
    { k: 'floatPop', l: 'Floating / tourist population', step: 100 },
    { k: 'floatLpcd', l: 'Floating population demand', u: 'L/c/d' },
    { k: 'bulk', l: 'Bulk / special consumers', u: 'm³/d', note: 'Industry, BOI zones, bowsers' },
    { sec: 'Unaccounted-for water & peaking (D2 §3.2.4–3.2.5)' },
    { k: 'systemState', l: 'Distribution system', t: 'sel', o: [['rehab', 'Existing / rehabilitated (UFW 20–25 %)'], ['new', 'New, tight system (UFW 10–15 %)']] },
    { k: 'nrw', l: 'Unaccounted-for water (NRW)', u: '%', crit: 'dem.nrw' },
    { k: 'mdf', l: 'Maximum-day factor', crit: 'dem.mdf', step: 0.05, auto: true, autoVal: (r) => r.demand.mdf },
    { k: 'phf', l: 'Peak-hour factor', crit: 'dem.phf', step: 0.1, auto: true, autoVal: (r) => r.demand.phf },
    { k: 'ownUse', l: 'Raw-water & treatment losses', u: '% of max day', crit: 'dem.own', step: 0.5 },
    { k: 'opHours', l: 'Plant operating hours', u: 'h/d', step: 1, note: 'D2 §9.2: 24 h for treatment plants' },
    { sec: 'Capacity', show: (i) => i.demand.basis !== 'capacity' },
    { k: 'roundStep', l: 'Round capacity up to', u: 'm³/d', step: 500 },
    { k: 'overrideCap', l: 'Override adopted capacity', u: 'm³/d', auto: true, autoVal: (r) => r.demand.adopted },
  ],
  render(r) {
    const d = r.demand;
    const D = d.design;
    if (d.basis === 'capacity') {
      const flows = [{ k: 'Average day', v: D.gross }, { k: 'Maximum day', v: D.mdd }, { k: 'Plant throughput', v: d.Qd }, { k: 'Peak hour (as day rate)', v: D.phd }];
      return {
        overview: [
          kpis([
            { label: 'Specified plant capacity', value: fmt(d.Qd, 0), unit: 'm³/d', sub: `${fmt(d.Qd / 1000, 1)} MLD · ${fmt(d.Qd / 24, 0)} m³/h · ${fmt(d.Qd / 86.4, 0)} L/s`, accent: true, icon: 'droplets' },
            { label: 'Average-day production', value: fmt(D.gross, 0), unit: 'm³/d', sub: `max-day factor ${d.mdf} (D2 §3.2.5)` },
            { label: 'Maximum-day demand', value: fmt(D.mdd, 0), unit: 'm³/d', sub: `treatment losses ${d.inputs.ownUse} %` },
            { label: 'Peak-hour (distribution)', value: fmt(D.phd / 24, 0), unit: 'm³/h', sub: `× ${d.phf} of average` },
            { label: 'Population equivalent', value: fmt(D.served, 0), sub: `${fmt(d.lpcd, 0)} L/c/d, NRW ${d.inputs.nrw} %`, icon: 'users' },
            { label: 'D2 community class', value: d.d2.cls.label.split(' (')[0], sub: 'from the population equivalent', icon: 'book' },
          ]),
          notes([{ level: 'info', text: 'Design basis: specified (pre-determined) capacity. Every unit is sized for this flow; the demand forecast is not used. Switch the basis above to return to the D2 population method.' }, ...(d.notes || [])]),
          chartCard('Design flows', { type: 'bar', data: flows, x: { key: 'k', label: '' }, y: { label: 'm³/d', format: (v) => fmtAuto(v) }, series: [{ key: 'v', label: 'm³/d' }], unit: 'm³/d', height: 240 }),
        ],
      };
    }
    const every = d.table.filter((x) => (x.year - d.inputs.baseYear) % 5 === 0 || x.year === d.inputs.designYear);
    const popData = d.years.map((y, i) => ({ year: y, sel: d.table[i].P, arith: d.methods?.arith[i], geom: d.methods?.geom[i], incr: d.methods?.incr[i] }));
    for (const c of d.census || []) if (c.year < d.inputs.baseYear) popData.unshift({ year: c.year, census: c.pop });
    popData.sort((a, b) => a.year - b.year);
    const series = d.methods ? [{ key: 'arith', label: 'Arithmetic', dash: true }, { key: 'geom', label: 'Geometric' }, { key: 'incr', label: 'Incremental', dash: true }] : [{ key: 'sel', label: 'Projection' }];
    if (d.census?.length) series.push({ key: 'census', label: 'Census', marker: true, width: 0.01, color: 'var(--series-8)' });
    const stackData = d.table.filter((x) => (x.year - d.inputs.baseYear) % 2 === 0).map((x) => ({ year: String(x.year), dom: x.dom, nonDom: x.nonDom, other: x.flt + x.bulk, nrw: x.nrwQ }));
    return {
      overview: [
        kpis([
          { label: 'Adopted plant capacity', value: fmt(d.adopted, 0), unit: 'm³/d', sub: `${fmt(d.adopted / 1000, 1)} MLD · ${fmt(d.adopted / 24, 0)} m³/h · ${fmt(d.adopted / 86.4, 0)} L/s`, accent: true, icon: 'droplets' },
          { label: `Population ${d.inputs.designYear}`, value: fmt(D.P, 0), sub: `served ${fmt(D.served, 0)} (${fmt(D.cov, 0)} %)`, icon: 'users' },
          { label: 'Average-day production', value: fmt(D.gross, 0), unit: 'm³/d', sub: `net ${fmt(D.net, 0)} + NRW ${fmt(D.nrwQ, 0)}` },
          { label: 'Maximum-day demand', value: fmt(D.mdd, 0), unit: 'm³/d', sub: `× ${d.mdf}${d.inputs.mdf > 0 ? ' (user)' : ' (D2 §3.2.5)'}` },
          { label: 'Peak-hour (distribution)', value: fmt(D.phd / 24, 0), unit: 'm³/h', sub: `× ${d.phf} of average${d.inputs.phf > 0 ? '' : ' (D2)'}` },
          { label: `Stage I capacity (${d.inputs.stageYear})`, value: fmt(d.stageCap, 0), unit: 'm³/d', sub: 'modular construction option' },
          { label: 'D2 community class', value: d.d2.cls.label.split(' (')[0], sub: `${fmt(d.d2.Pdesign, 0)} persons · ${fmt(d.lpcd, 0)} L/c/d`, icon: 'book' },
        ]),
        notes(d.notes),
        h('div', { class: 'grid2' },
          chartCard('Population projection', { type: 'line', data: popData, x: { key: 'year', label: 'Year', format: (v) => String(v) }, y: { label: 'Population', format: (v) => fmtAuto(v) }, series, refs: [{ axis: 'x', value: d.inputs.designYear, label: 'Design year', kind: 'info' }], height: 280 }),
          chartCard('Demand build-up', { type: 'stacked', data: stackData, x: { key: 'year', label: 'Year' }, y: { label: 'm³/d', format: (v) => fmtAuto(v) }, series: [{ key: 'dom', label: 'Domestic' }, { key: 'nonDom', label: 'Non-domestic' }, { key: 'other', label: 'Floating & bulk' }, { key: 'nrw', label: 'NRW' }], refs: [{ value: D.mdd, label: `Max-day demand ${d.inputs.designYear}`, kind: 'target' }], unit: 'm³/d', height: 280 })),
        card('Demand projection (5-year steps)', table([
          { k: 'year', l: 'Year', fmt: (v) => String(v) }, { k: 'P', l: 'Population', num: true, fmt: (v) => fmt(v, 0) }, { k: 'cov', l: 'Coverage %', num: true, fmt: (v) => fmt(v, 0) },
          { k: 'dom', l: 'Domestic', num: true, fmt: (v) => fmt(v, 0) }, { k: 'nonDom', l: 'Non-dom.', num: true, fmt: (v) => fmt(v, 0) }, { k: 'net', l: 'Net demand', num: true, fmt: (v) => fmt(v, 0) },
          { k: 'gross', l: 'Avg production', num: true, fmt: (v) => fmt(v, 0) }, { k: 'mdd', l: 'Max day', num: true, fmt: (v) => fmt(v, 0) }, { k: 'plant', l: 'Plant req.', num: true, fmt: (v) => fmt(v, 0) },
        ], every), { sub: 'all flows m³/d', flush: true }),
        h('div', { class: 'grid2' },
          card('D2 §3.2.1 – domestic demand by community size', table([
            { k: 'label', l: 'Community', v: (c) => (c.id === d.d2.cls.id ? h('b', null, '▶ ' + c.label) : c.label) },
            { k: 'hc', l: 'House conn. %', v: (c) => (c.hc ? `${c.hc[0]}–${c.hc[1]}` : '–') }, { k: 'hcLpcd', l: 'L/c/d', num: true, v: (c) => c.hcLpcd ?? '–' },
            { k: 'sp', l: 'Standpost %', v: (c) => (c.sp ? `${c.sp[0]}–${c.sp[1]}` : '–') }, { k: 'spLpcd', l: 'L/c/d', num: true },
            { k: 'rng', l: 'Blended', v: (c) => { const rg = lpcdRange(c); return rg ? `${Math.round(rg[0])}–${Math.round(rg[1])}` : 'assess'; } },
          ], COMMUNITY.slice(1)), { flush: true, sub: 'NWSDB Design Manual D2 (1989)' }),
          card('D2 §2.4 – design periods of components', table([{ k: 'item', l: 'Component' }, { k: 'years', l: 'Years', num: true }, { k: 'remark', l: 'Staging' }], DESIGN_PERIODS), { flush: true, sub: 'urban: 20-yr horizon, two 10-yr stages' })),
        d.d2.items.length ? card('Institutional & commercial demand (D2 §3.2.3)', table([{ k: 'label', l: 'Category' }, { k: 'qty', l: 'Number', num: true }, { k: 'per', l: 'Unit' }, { k: 'rate', l: 'L/unit·d', num: true }, { k: 'q', l: 'm³/d', num: true, fmt: (v) => fmt(v, 1) }], d.d2.items), { flush: true }) : null,
      ],
    };
  },
};

// ------------------------------------------------------------------ Source & hydrology (D2 §4)
const MONTHS3 = MONTHS;
export const source = {
  id: 'source', title: 'Source & hydrology', sub: 'River-basin data, dry-weather availability, reservoir yield (Rippl) and flood estimate – NWSDB D2 §4', icon: 'rain', group: 'Design basis', mod: 'source',
  fields: [
    { sec: 'River basin (D2 Table 4.1)' },
    { k: 'basin', l: 'River basin', t: 'sel', numeric: true, o: BASINS.map((b) => [b.code, `${b.code} – ${b.name} (${b.area.toLocaleString('en-US')} km²)`]) },
    { k: 'catchment', l: 'Catchment area at intake', u: 'km²', auto: true, autoVal: (r) => r.source.basin?.area },
    { sec: 'Dry-weather availability (D2 §4.7, §4.12)', show: (i) => !['reservoir', 'lake', 'groundwater'].includes(i.setup.sourceType) },
    { k: 'dwf', l: 'Dependable dry-weather flow', u: 'm³/s', step: 0.01, auto: true, autoVal: (r) => +(r.source.dwf / 86400).toFixed(3), note: 'gauged low-flow frequency analysis' },
    { k: 'dwfRP', l: 'Drought return period', u: 'years', step: 1 },
    { k: 'releases', l: 'Downstream releases / prior rights', u: 'm³/s', step: 0.01 },
    { k: 'otherAbs', l: 'Other abstractions', u: 'm³/s', step: 0.01 },
    { sec: 'Reservoir yield (D2 §4.9–4.11)', show: (i) => ['reservoir', 'lake'].includes(i.setup.sourceType) },
    { k: 'liveStorage', l: 'Available live storage', u: 'Mm³', step: 0.5 },
    { k: 'waterArea', l: 'Mean water-surface area', u: 'km²', step: 0.1 },
    { k: 'droughtFactor', l: 'Critical-drought runoff / mean year', step: 0.05 },
    { k: 'otherUse', l: 'Irrigation & other demand on reservoir', u: 'm³/d', step: 500 },
    { k: 'releases', l: 'Downstream releases', u: 'm³/s', step: 0.01 },
    { k: 'evapStation', l: 'Evaporation data (D2 §4.10)', t: 'sel', o: Object.keys(EVAPORATION).map((k) => [k, `${k} – ${Math.round(EVAPORATION[k].reduce((a, b) => a + b, 0))} mm/yr`]) },
    { k: 'panCoeff', l: 'Lake / pan coefficient', step: 0.05 },
    { k: 'seepage', l: 'Seepage', u: '% storage/month', step: 0.1, note: 'D2 §5.5.1: 0.5 % if untested' },
    { k: 'inflows', t: 'array', l: 'Critical-drought monthly inflow (Mm³) – leave blank to estimate', labels: MONTHS3, cols: 6, show: (i) => (i.source.inflows || []).length === 12 },
    { t: 'custom', show: (i) => ['reservoir', 'lake'].includes(i.setup.sourceType), render: (r, i) => h('div', { class: 'flex' }, (i.source.inflows || []).length === 12 ? h('button', { class: 'btn sm ghost', onclick: () => setInput(['source', 'inflows'], [], { immediate: true }) }, icon('reset'), 'Use estimated inflows') : h('button', { class: 'btn sm ghost', onclick: () => setInput(['source', 'inflows'], r.source.inflow.map((x) => +x.toFixed(3)), { immediate: true }) }, icon('pen'), 'Enter gauged monthly inflows')) },
    { sec: 'Flood estimate (D2 §4.8)' },
    { k: 'L', l: 'Longest watercourse to intake', u: 'm', step: 100 },
    { k: 'H', l: 'Fall over that length', u: 'm', step: 1 },
    { k: 'rainI', l: 'Rainfall intensity for tc', u: 'mm/h', auto: true, autoVal: (r) => +r.source.I?.toFixed(1), note: 'IDF curves, D2 Annex F' },
    { k: 'returnPeriod', l: 'Return period', u: 'years', step: 5 },
    { k: 'floodC', l: 'Runoff coefficient C', step: 0.05, auto: true, autoVal: (r) => r.source.C, note: 'D2: 0.3 / 0.4 / 0.5 by slope' },
  ],
  render(r) {
    const s = r.source;
    if (s.isGW) return { overview: [notes(s.notes)] };
    const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const monthly = s.months.map((m, i) => ({ m: MONTHS[i], I: m.I, D: m.D }));
    return {
      overview: [
        kpis([
          { label: 'River basin', value: s.basin.name, sub: `D2 code ${s.basin.code} · ${fmt(s.basin.area, 0)} km² · ${fmt(s.basin.rain, 0)} mm rain`, icon: 'rain', accent: true },
          { label: 'Mean flow at intake', value: fmt(s.Qmean / 86400, 2), unit: 'm³/s', sub: `${fmt(s.Qmean, 0)} m³/d · runoff ${s.basin.runoff} mm` },
          { label: 'Abstraction / mean flow', value: fmt(s.meanPct, 1), unit: '%', sub: `${fmt(s.Qabs, 0)} m³/d abstraction` },
          s.isRes ? { label: 'Live storage required', value: fmt(s.Kreq, 2), unit: 'Mm³', sub: s.inputs.liveStorage > 0 ? `available ${s.inputs.liveStorage} Mm³` : 'Rippl / sequent peak' } : { label: 'Dry-weather availability', value: fmt(s.avail / 86400, 3), unit: 'm³/s', sub: `abstraction ${fmt(s.dwPct, 0)} % of available` },
          { label: 'Sediment allowance (50 yr)', value: fmt(s.sedVol, 2), unit: 'Mm³', sub: 'dead storage, D2 §4.9' },
          s.A <= 50 ? { label: `Flood peak (${s.inputs.returnPeriod}-yr, rational)`, value: fmt(s.Qr, 0), unit: 'm³/s', sub: `C ${s.C} · I ${fmt(s.I, 0)} mm/h · tc ${fmt(s.tcK, 0)} min` } : { label: 'Flood envelope (1:10,000 yr)', value: fmt(s.env, 0), unit: 'm³/s', sub: 'D2 §4.8.5 · rational not valid > 50 km²' },
        ]),
        notes(s.notes),
        h('div', { class: 'grid2' },
          chartCard(s.isRes ? 'Critical-drought inflow vs gross demand' : 'Indicative monthly flow (critical-drought year)', { type: 'bar', data: monthly, x: { key: 'm', label: 'Month' }, y: { label: 'Mm³ per month' }, series: [{ key: 'I', label: 'Inflow' }, { key: 'D', label: 'Gross demand (incl. losses & releases)' }], unit: 'Mm³', height: 260 }),
          s.isRes ? chartCard('Mass diagram (Rippl)', { type: 'line', data: s.mass.map((m) => ({ m: m.m, I: m.I, D: m.D })), x: { key: 'm', label: 'Month' }, y: { label: 'Cumulative Mm³', min: 0 }, series: [{ key: 'I', label: 'Cumulative inflow' }, { key: 'D', label: 'Cumulative gross demand' }], unit: 'Mm³', height: 260 }, { sub: `live storage required ${fmt(s.Kreq, 2)} Mm³` })
          : chartCard('Abstraction vs flow', { type: 'hbar', data: [{ g: 'Mean annual flow', v: s.Qmean / 86400 }, { g: `Dry-weather flow (1 in ${s.inputs.dwfRP} yr)`, v: s.dwf / 86400 }, { g: 'Releases & other uses', v: s.rel / 86400 }, { g: 'Plant abstraction', v: s.Qabs / 86400 }], x: { key: 'g' }, y: { label: 'm³/s' }, series: [{ key: 'v', label: 'Flow' }], valueFormat: (v) => fmt(v, v < 1 ? 3 : 1) + ' m³/s', unit: 'm³/s', height: 200, marginLeft: 190 }, { sub: `abstraction ${fmt(s.dwPct, 0)} % of available dry-weather flow` })),
        card('River basin characteristics (D2 Table 4.1)', table([
          { k: 'code', l: 'Code', num: true }, { k: 'name', l: 'River basin', v: (b) => (b.code === s.basin.code ? h('b', null, '▶ ' + b.name) : b.name) }, { k: 'area', l: 'Area km²', num: true, fmt: (v) => fmt(v, 0) },
          { k: 'rain', l: 'Rainfall mm', num: true, fmt: (v) => fmt(v, 0) }, { k: 'runoff', l: 'Runoff mm', num: true, fmt: (v) => fmt(v, 0) }, { k: 'factor', l: 'Runoff %', num: true }, { k: 'unit', l: 'm³/d/km²', num: true, fmt: (v) => fmt(v, 0) },
        ], BASINS.filter((b) => Math.abs(b.code - s.basin.code) <= 3)), { flush: true, sub: 'selected basin and neighbours · full table in Library → NWSDB D2' }),
      ],
    };
  },
};

// ------------------------------------------------------------------ Quality
function qualityTableField() {
  return {
    t: 'custom',
    render: () => {
      const vals = store.project.inputs.quality.values;
      const tbl = h('table', { class: 'ftable' }, h('tr', null, h('th', null, 'Parameter'), h('th', { style: { width: '74px' } }, 'Average'), h('th', { style: { width: '74px' } }, 'Design'), h('th', { style: { width: '62px' } }, 'SLS 614')));
      let grp = '';
      const GN = { phys: 'Physical', chem: 'Chemical', tox: 'Toxic substances', bact: 'Bacteriological', info: 'Process parameters (no SLS limit)' };
      const ORDER = ['phys', 'bact', 'chem', 'tox', 'info'];
      for (const p of [...PARAMS].sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group))) {
        if (p.group !== grp) { grp = p.group; tbl.append(h('tr', null, h('td', { colspan: 4, style: { fontWeight: 700, color: 'var(--primary)', paddingTop: '8px' } }, GN[grp]))); }
        const mk = (i) => {
          const inp = h('input', { type: 'number', step: 'any', value: vals[p.key]?.[i] ?? '' });
          inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (Number.isFinite(v)) { const arr = [...(store.project.inputs.quality.values[p.key] || [0, 0])]; arr[i] = v; setInput(['quality', 'values', p.key], arr); } });
          return h('td', null, inp);
        };
        tbl.append(h('tr', null, h('td', { title: p.note || '' }, p.name, h('div', { class: 'small muted' }, p.unit)), mk(0), mk(1), h('td', { class: 'small muted', style: { textAlign: 'right' } }, p.type === 'info' ? '—' : limitText(p))));
      }
      return tbl;
    },
  };
}
export const quality = {
  id: 'quality', title: 'Raw water quality', sub: 'Laboratory data vs SLS 614:2013, monsoon turbidity profile and regional alerts', icon: 'flask', group: 'Design basis', mod: 'quality',
  wideLeft: true,
  fields: [
    { sec: 'Seasonal profile' },
    { k: 'profileMode', l: 'Monthly turbidity profile', t: 'sel', o: [['auto', 'Auto – district monsoon pattern'], ['manual', 'Manual – enter monthly values']] },
    { k: 'monthlyTurb', t: 'array', l: 'Monthly mean turbidity (NTU)', labels: MONTHS, cols: 6, show: (i) => i.quality.profileMode === 'manual' },
    { k: 'useDistrictTemp', l: 'Use typical district water temperature', t: 'bool', note: (r) => `${r.quality.T} °C used for design` },
    { k: 'tssPerNtu', l: 'TSS / turbidity ratio', u: 'mg/L per NTU', step: 0.1, note: 'Site-specific; 1.0–2.0 typical' },
    { sec: 'Laboratory results (average & design / worst case)' },
    { t: 'help', html: 'Design values are the worst credible conditions (e.g. 95-percentile monsoon turbidity, lowest alkalinity). Temperature is used only when the district option above is off.' },
    qualityTableField(),
  ],
  render(r) {
    const q = r.quality;
    const rows = q.rows.filter((x) => x.type !== 'info');
    const monthData = q.monthly.map((v, i) => ({ m: MONTHS[i], turb: v }));
    return {
      overview: [
        kpis([
          { label: 'Design turbidity', value: q.turbMax, unit: 'NTU', sub: `average ${q.turbAvg} NTU · ${q.turbClass}`, icon: 'droplet' },
          { label: 'Colour (design)', value: q.worst('colour'), unit: 'Hazen', sub: 'SLS 614 ≤ 15' },
          { label: 'Alkalinity (lowest)', value: q.worst('alk'), unit: 'mg/L CaCO₃', sub: q.worst('alk') < 40 ? 'Low – lime needed with alum' : 'Adequate for alum' },
          { label: 'pH (design)', value: q.get('pH', 1), sub: 'SLS 614 6.5–8.5' },
          { label: 'E. coli (design)', value: fmt(q.worst('ec_'), 0), unit: 'MPN/100 mL', sub: 'Disinfection mandatory' },
          { label: 'Parameters exceeding SLS', value: q.exceed.length, sub: q.exceed.slice(0, 4).map((x) => x.name.split(' (')[0]).join(', '), status: q.exceed.length ? 'warn' : 'ok' },
        ]),
        notes([...q.alerts, ...q.notes]),
        chartCard('Monthly mean raw-water turbidity', { type: 'bar', data: monthData, x: { key: 'm', label: 'Month' }, y: { label: 'Turbidity (NTU)' }, series: [{ key: 'turb', label: 'Monthly mean turbidity' }], refs: [{ value: q.turbAvg, label: `Annual mean ${q.turbAvg} NTU`, kind: 'info' }, { value: q.turbMax, label: `Design (storm) peak ${q.turbMax} NTU` }], unit: 'NTU', height: 250 }, { sub: q.inputs.profileMode === 'auto' ? 'district monsoon pattern – drives chemical use & sludge' : 'user data' }),
        card('Raw water vs SLS 614:2013 and SLS 722:1985 raw-water limits (NWSDB D3 Tables 2-4, 2-6)', table([
          { k: 'name', l: 'Parameter' }, { k: 'unit', l: 'Unit' },
          { k: 'avg', l: 'Average', num: true, fmt: (v, rr) => fmt(v, rr.dec) }, { k: 'des', l: 'Design', num: true, fmt: (v, rr) => fmt(v, rr.dec) },
          { k: 'lim', l: 'SLS 614 (treated)', v: (rr) => limitText(rr) },
          { k: 'st', l: 'Raw vs SLS', v: (rr) => rr.exc ? h('span', { class: 'badge warn' }, 'Treatment needed') : h('span', { class: 'badge ok' }, 'Within') },
          { k: 'gl', l: 'SLS 722 raw limit', v: (rr) => rawGlText(rr) },
          { k: 'gls', l: '', v: (rr) => rr.rawGlExc === null ? '' : rr.rawGlExc ? statusBadge('warn') : statusBadge('ok') },
        ], rows), { flush: true, sub: 'SLS 614 values as tabulated in the lecture notes' }),
      ],
    };
  },
};

export { waterTempOf };
