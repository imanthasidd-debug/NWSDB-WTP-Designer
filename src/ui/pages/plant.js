// Plant-wide pages: storage & pumping, residuals, hydraulic profile, site layout, power, cost
import { COST, FACILITIES, PIPE_MATERIALS, PUMP_TYPES, SITE_CHECKLIST } from '../../core/d2.js';
import { MONTHS, fmt, fmtAuto, fmtMoney } from '../../core/util.js';
import { PATTERNS } from '../../engine/storage.js';
import { h, icon } from '../dom.js';
import { mountDrawing } from '../draw/render.js';
import { cwrPlan, hydraulicProfile, layoutPlan } from '../draw/units.js';
import { card, chartCard, drawingCard, kpis, kvTable, notes, statusBadge, structureCard, table } from '../results.js';
import { econChart, mainSpecCard } from './units.js';
import { DIESEL, ENG_PCT, RB, TARIFFS } from '../../core/ratebook.js';
import { setInput, store } from '../store.js';

const f0 = (v) => fmt(v, 0), f1 = (v) => fmt(v, 1), f2 = (v) => fmt(v, 2);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

function pumpChart(p, title) {
  const series = [{ key: 'sys', label: 'System curve' }];
  for (let k = 1; k <= p.nDuty; k++) series.push({ key: 'p' + k, label: `${k} pump${k > 1 ? 's' : ''} in parallel`, dash: k < p.nDuty });
  return chartCard(title, { type: 'line', data: p.curves, x: { key: 'Q', label: 'Flow (m³/h)' }, y: { label: 'Head (m)', min: 0 }, series, markers: p.ops.slice(-1).map((o) => ({ x: o.Q, y: o.H, label: `${o.k}P: ${f0(o.Q)} m³/h @ ${f1(o.H)} m`, color: 'var(--series-2)' })), unit: 'm', height: 280 });
}

// ------------------------------------------------------------------ Storage
export const storage = {
  id: 'storage', title: 'Storage & treated-water pumping', sub: 'Clear-water reservoir, transmission pumps & main, service-reservoir balancing', icon: 'database', group: 'Plant-wide', mod: 'storage',
  fields: [
    { sec: 'Clear-water reservoir' },
    { k: 'cwrHours', l: 'Storage', u: 'h of design flow', crit: 'cwr.hours', step: 0.5 },
    { k: 'cwrDepth', l: 'Water depth', u: 'm', crit: 'cwr.depth', step: 0.1 },
    { k: 'cwrCompartments', l: 'Compartments', step: 1, note: 'D2 §9.4: two' },
    { k: 'gwlDepth', l: 'Highest groundwater below ground', u: 'm', step: 0.1, note: 'flotation – D2 §6.3' },
    { k: 'antiFlotation', l: 'Uplift resistance', t: 'sel', o: [['toe', 'Dead weight + base toe (auto)'], ['relief', 'Under-drain & relief valves'], ['none', 'Structure weight only']] },
    { sec: 'Treated-water pumping (D2 §6)' },
    { k: 'pumpHours', l: 'Pumping hours', u: 'h/d', step: 1, crit: 'pump.hours' },
    { k: 'pumpKind', l: 'Pump type', t: 'sel', o: Object.entries(PUMP_TYPES).map(([k, v]) => [k, v.label]) },
    { k: 'nDuty', l: 'Duty pumps', step: 1 },
    { k: 'nStandby', l: 'Stand-by pumps', step: 1, auto: true, autoVal: (r) => r.storage.pumps.nStandbyD2, note: 'D2 §6.4.1' },
    { k: 'etaP', l: 'Pump efficiency', step: 0.01, auto: true, autoVal: (r) => r.storage.pumps.etaP, note: 'D2 Table 6.2' },
    { k: 'etaM', l: 'Motor efficiency', step: 0.01, auto: true, autoVal: (r) => r.storage.pumps.etaM },
    { k: 'srTWL', l: 'Service reservoir top water level', u: 'm MSL', step: 0.5 },
    { sec: 'Transmission main (D2 §7)' },
    { k: 'mainLength', l: 'Transmission-main length', u: 'm' },
    { k: 'material', l: 'Pipe material', t: 'sel', o: Object.entries(PIPE_MATERIALS).map(([k, v]) => [k, v.label]) },
    { k: 'dnMode', l: 'Diameter selection', t: 'sel', o: [['econ', 'Least annual cost (D2 §7.3.2)'], ['velocity', 'Velocity ≈ 1.2 m/s']] },
    { k: 'dn', l: 'Main diameter', u: 'mm', auto: true, autoVal: (r) => r.storage.pumps.dn },
    { k: 'hwC', l: 'Hazen–Williams C', auto: true, autoVal: (r) => +r.storage.pumps.C.toFixed(0), note: 'D2 Fig 7.6' },
    { k: 'minorK', l: 'Sum of minor-loss coefficients' },
    { k: 'surgeProtect', l: 'Surge protection', t: 'sel', o: [['auto', 'Auto – provide if the pipe class needs it'], ['yes', 'Provided (limit ±30 % H)'], ['no', 'None']] },
    { k: 'wave', l: 'Pressure-wave speed', u: 'm/s' },
    { k: 'soilBearing', l: 'Soil bearing for thrust blocks', u: 'kPa' },
    { sec: 'Service reservoir (D2 §9)' },
    { k: 'patternMode', l: 'Consumption pattern', t: 'sel', o: [['d2', 'D2 §9.2 default pattern'], ['urban24', 'Continuous 24-h urban'], ['custom', 'Custom (edit below)']], onChange: (v) => { if (v === 'custom') setInput(['storage', 'pattern'], [...(PATTERNS.d2)], { immediate: true }); } },
    { k: 'pumpStart', l: 'Pumping starts at hour', step: 1 },
    { k: 'emergencyPct', l: 'Emergency / fire reserve', u: '%' },
    { k: 'srBasis', l: 'Capacity basis', t: 'sel', o: [['max', 'Greater of mass curve and D2 rule'], ['mass', 'Mass curve + reserve'], ['d2', 'D2 rule (§9.2)']] },
    { k: 'srDepth', l: 'Service-reservoir water depth', u: 'm', crit: 'sr.depth', step: 0.1 },
    { k: 'srCompartments', l: 'Service-reservoir compartments', step: 1 },
    { k: 'pattern', t: 'array', l: 'Custom diurnal pattern (× average)', labels: HOURS, cols: 6, show: (i) => i.storage.patternMode === 'custom' },
  ],
  render(r) {
    const s = r.storage;
    const p = s.pumps;
    const mass = s.mass.map((m) => ({ h: m.h, D: m.D, S: m.S }));
    const hourly = s.dmd.map((d, i) => ({ hr: HOURS[i], d, s: s.sup[i] }));
    return {
      overview: [
        kpis([
          { label: 'Clear-water reservoir', value: f0(s.V), unit: 'm³', sub: `${s.inputs.cwrCompartments} × ${f1(s.L)} × ${f1(s.W)} × ${f1(s.depth)} m`, accent: true, icon: 'database' },
          { label: 'Treated-water pumps', value: `${p.nDuty} + ${p.nStandby}`, sub: `${f0(p.Qp * 3600)} m³/h @ ${f1(p.H)} m · ${p.motor} kW` },
          { label: 'Transmission main', value: 'DN' + p.dn, sub: `${p.spec.matLabel.split(' (')[0]} ${p.spec.cls.cls} · v ${f2(p.v)} m/s · hf ${f1(p.hf)} m` },
          { label: 'Static lift', value: f1(s.Hs), unit: 'm', sub: `CWR LWL → SR TWL ${s.inputs.srTWL}` },
          { label: 'Service reservoir', value: f0(s.srV), unit: 'm³', sub: `${f0(s.srV / r.demand.design.mdd * 100)} % of max day · D2 ≥ ${f0(s.d2Pct)} %` },
          { label: 'Surge', value: f0(p.dH), unit: 'm', sub: p.protect ? `protected → max ${f0(p.pMax)} m` : 'unprotected (Joukowsky)' },
          { label: 'Flotation FoS', value: s.fos > 50 ? 'no uplift' : f2(s.fos), sub: s.toe > 0 ? `base toe ${f1(s.toe)} m (D2 §6.3)` : 'D2 §6.3 ≥ 1.5' },
        ]),
        notes(s.notes),
        structureCard(r, 'cwr', { height: 380 }),
        structureCard(r, 'twp', { height: 320 }),
        h('div', { class: 'grid2' },
          mainSpecCard(p, 'Transmission main – D2 §7 specification'),
          card('Service reservoir – D2 §9.2', kvTable([
            ['Equalising storage (mass curve)', f0(s.balancing), 'm³'], [`Mass curve + ${s.inputs.emergencyPct} % reserve`, f0(s.massV), 'm³'], [`D2 rule (${f0(s.d2Pct)} % of max day)`, f0(s.d2V), 'm³'],
            ['Adopted capacity', f0(s.srV), 'm³'], ['Water depth / plan area', `${f1(s.inputs.srDepth)} m / ${f0(s.srA)}`, 'm²'], ['Compartments', s.inputs.srCompartments, 'nr'],
          ]), { flush: true, sub: s.inputs.patternMode === 'd2' ? 'D2 default consumption pattern' : '' })),
      ],
      visuals: [
        pumpChart(p, 'Treated-water pump & system curves'),
        econChart(p, 'Economic diameter of the transmission main (D2 §7.3.2)'),
        chartCard('Mass curve – cumulative supply vs demand (max day)', { type: 'line', data: mass, x: { key: 'h', label: 'Hour of day' }, y: { label: 'Cumulative volume (m³)', min: 0 }, series: [{ key: 'S', label: 'Cumulative supply' }, { key: 'D', label: 'Cumulative demand' }], unit: 'm³', height: 270 }, { sub: `balancing storage ${f0(s.balancing)} m³` }),
        chartCard('Hourly demand vs pumping', { type: 'bar', data: hourly, x: { key: 'hr', label: 'Hour' }, y: { label: 'm³/h' }, series: [{ key: 'd', label: 'Demand' }, { key: 's', label: 'Pumping' }], unit: 'm³/h', height: 250 }),
      ],
    };
  },
};

// ------------------------------------------------------------------ Sludge
export const sludge = {
  id: 'sludge', title: 'Residuals management', sub: 'Sludge production, wash-water recovery, thickening, dewatering & disposal', icon: 'recycle', group: 'Plant-wide', mod: 'sludge',
  fields: [
    { sec: 'Solids balance' },
    { k: 'sedCapture', l: 'Solids captured in clarifiers', u: '%', note: 'D3 §5.14.3.6: 90 %' },
    { k: 'safety', l: 'Allowance on computed solids', u: '×', step: 0.05, note: 'D3: × 1.2–1.6 (1.4)' },
    { k: 'sedSolids', l: 'Clarifier sludge solids', u: '%', step: 0.1 },
    { k: 'recoveryWashes', l: 'Recovery tank capacity', u: 'washes', step: 0.5 },
    { sec: 'Thickening & dewatering' },
    { k: 'thickLoad', l: 'Thickener solids loading', u: 'kg/m²·d', crit: 'sl.thickLoad' },
    { k: 'thickSolids', l: 'Thickened solids', u: '%', step: 0.5 },
    { k: 'dewaterRate', l: 'Dewatering unit capacity', u: 'kg DS/h' },
    { k: 'dewaterHours', l: 'Dewatering hours', u: 'h/d' },
    { k: 'bedLoad', l: 'Drying-bed loading', u: 'kg DS/m²', crit: 'sl.bedLoad' },
    { k: 'annualRain', l: 'Annual rainfall at site', u: 'mm', auto: true, autoVal: (r) => r.sludge.rain, note: 'D3 §5.14.8: open beds < 2,200 mm' },
    { k: 'bedCover', l: 'Drying beds', t: 'sel', o: [['auto', 'Auto (covered if rainfall ≥ 2,200 mm)'], ['open', 'Open sand beds'], ['covered', 'Covered (solar) drying beds']] },
    { k: 'bedCycleDry', l: 'Drying cycle – dry months', u: 'days' },
    { k: 'bedCycleWet', l: 'Drying cycle – monsoon', u: 'days' },
    { k: 'cakeSolids', l: 'Cake solids', u: '%' },
    { sec: 'Disposal' },
    { k: 'truck', l: 'Truck capacity', u: 'm³' },
    { k: 'disposalCost', l: 'Transport & disposal', u: 'LKR/t' },
  ],
  render(r) {
    const s = r.sludge;
    return {
      overview: [
        kpis([
          { label: 'Dry solids (peak day)', value: f0(s.dsDes), unit: 'kg/d', sub: `average ${f0(s.dsAvg)} kg/d`, accent: true, icon: 'recycle' },
          { label: 'Annual dry solids', value: f0(s.annualT), unit: 't/yr' },
          { label: 'Clarifier sludge', value: f0(s.sedVol), unit: 'm³/d', sub: `at ${s.inputs.sedSolids} % solids` },
          { label: 'Wash-water recovery tank', value: f0(s.recTank), unit: 'm³', sub: `recycle ${f1(s.recRate)} % of Q` },
          s.thick ? { label: 'Thickener', value: `${s.thick.n} × Ø${f1(s.thick.D)}`, unit: 'm' } : null,
          s.mech ? { label: 'Dewatering units', value: `${s.mech.units} + ${s.mech.standby}`, sub: `${s.mech.rate} kg DS/h each` } : { label: 'Drying beds', value: f0(s.bedArea), unit: 'm²', sub: `${s.nBeds} beds` },
          { label: 'Cake to dispose', value: f0(s.cakeT), unit: 't/yr', sub: `${s.trucks} truckloads · LKR ${fmt(s.cost / 1e6, 1)} Mn` },
        ]),
        notes(s.notes),
        structureCard(r, 'thick', { height: 380 }),
        structureCard(r, 'beds', { height: 340 }),
      ],
      visuals: [chartCard('Monthly dry-solids production', { type: 'bar', data: s.monthly.map((v, i) => ({ m: MONTHS[i], ds: v / 1000 })), x: { key: 'm', label: 'Month' }, y: { label: 't DS per day' }, series: [{ key: 'ds', label: 'Dry solids', color: 'var(--series-4)' }], unit: 't/d', height: 260 }, { sub: 'turbidity solids + coagulant hydroxide + polymer' })],
    };
  },
};

// ------------------------------------------------------------------ Hydraulic profile
export const hyd = {
  id: 'hyd', title: 'Hydraulic profile', sub: 'Water levels through the plant from inlet chamber to clear-water reservoir', icon: 'activity', group: 'Plant-wide', mod: 'hyd',
  fields: [
    { sec: 'Reference levels' },
    { t: 'help', html: (r) => `Site ground level <b>${r.hyd.GL} m MSL</b> (set in Project setup). CWR depth comes from the Storage page.` },
    { k: 'cwrAboveGL', l: 'CWR top water level above GL', u: 'm', step: 0.1 },
    { sec: 'Losses between units' },
    { k: 'dropToCWR', l: 'Free fall into CWR', u: 'm', step: 0.05 },
    { k: 'filterOutletFall', l: 'Filter effluent weir free fall', u: 'm', step: 0.05 },
    { k: 'weirAboveSand', l: 'Effluent weir crest above sand', u: 'm', step: 0.05 },
    { k: 'filterInletLoss', l: 'Filter inlet weir + fall', u: 'm', step: 0.05 },
    { k: 'settledChannelLoss', l: 'Settled-water channel loss', u: 'm', step: 0.05 },
    { k: 'flocToSedLoss', l: 'Flocculator → clarifier loss', u: 'm', step: 0.01 },
    { k: 'rmToFlocLoss', l: 'Mixer → flocculator loss', u: 'm', step: 0.01 },
    { k: 'inletChamberLoss', l: 'Inlet stilling-chamber loss', u: 'm', step: 0.05 },
    { k: 'freeboard', l: 'Freeboard', u: 'm', crit: 'hyd.freeboard', step: 0.05 },
    { sec: 'Inlet flow measurement (D2 §4.6, BS 3680)' },
    { k: 'measure', l: 'Measuring structure', t: 'sel', o: [['auto', 'Auto (V-notch / weir / flume by flow)'], ['parshall', 'Parshall flume (D3 Annex C.1 – also mixes the coagulant)'], ['rectFull', 'Rectangular weir, full width'], ['rectContracted', 'Rectangular weir, end contractions'], ['vnotch90', '90° V-notch weir'], ['vnotch60', '60° V-notch weir'], ['broad', 'Broad-crested weir'], ['flume', 'Critical-depth flume'], ['none', 'None (meter elsewhere)']] },
    { k: 'weirB', l: 'Crest / throat width', u: 'm', step: 0.05, auto: true, autoVal: (r) => r.hyd.meas?.b },
    { k: 'weirP', l: 'Crest height above channel floor (P)', u: 'm', step: 0.05 },
    { k: 'minFlowPct', l: 'Minimum flow to measure', u: '% of design' },
    { k: 'freeFall', l: 'Free fall below crest', u: 'm', step: 0.05 },
    { sec: 'Flow division between streams (D3 §9.5)' },
    { k: 'splitWeirs', l: 'Equal-split distribution weirs to each stream', t: 'bool' },
    { k: 'splitWeirB', l: 'Weir crest length per stream', u: 'm', step: 0.05, auto: true, autoVal: (r) => r.hyd.split?.B, show: (i) => i.hyd.splitWeirs },
  ],
  render(r) {
    const y = r.hyd;
    return {
      overview: [
        kpis([
          { label: 'Inlet chamber WL', value: f2(y.inletWL), unit: 'm MSL', sub: `${f2(y.inletWL - y.GL)} m above GL`, accent: true, icon: 'activity' },
          { label: 'CWR TWL / LWL', value: `${f2(y.cwrTWL)} / ${f2(y.cwrLWL)}`, unit: 'm MSL' },
          { label: 'Head through plant', value: f2(y.totalHead), unit: 'm' },
          { label: 'Filter max WL', value: f2(y.filterMax), unit: 'm MSL', sub: `weir crest ${f2(y.crest)}` },
        ]),
        notes(y.notes),
        drawingCard(hydraulicProfile(y), { height: 460 }),
        y.meas ? card(`Inlet flow measurement – ${y.meas.label}`, kvTable([
          ['Crest / throat width', y.meas.b ? f2(y.meas.b) : 'V-notch', 'm'], ['Head at design flow', fmt(y.meas.hMax, 3), 'm'], [`Head at ${y.inputs.minFlowPct} % flow`, fmt(y.meas.hMin, 3), 'm'],
          ['Head consumed', fmt(y.meas.loss, 3), 'm'], ['Gauge well upstream', `${f2(4 * y.meas.hMax)}–${f2(5 * y.meas.hMax)}`, 'm'],
        ]), { flush: true, sub: 'NWSDB D2 §4.6 – g = 9.78 m/s²' }) : null,
        y.split ? card('Flow division between the treatment streams', kvTable([['Streams', y.split.n, 'nos.'], ['Weir crest per stream', f2(y.split.B), 'm'], ['Head over each weir', fmt(y.split.h, 3), 'm'], ['Head consumed', fmt(y.split.loss, 3), 'm'], ['Flow error for 5 mm crest tolerance', f1(y.split.err), '%']]), { flush: true, sub: 'NWSDB D3 §9.5.1–9.5.2 – identical free-falling weirs, no throttled valves' }) : null,
        card('Water levels', table([{ k: 'name', l: 'Unit' }, { k: 'wl', l: 'Water level (m MSL)', num: true, fmt: f2 }, { k: 'hl', l: 'Head loss (m)', num: true, fmt: f2 }, { k: 'top', l: 'Top of wall', num: true, fmt: f2 }, { k: 'bottom', l: 'Floor', num: true, fmt: f2 }], y.units), { flush: true }),
      ],
    };
  },
};

// ------------------------------------------------------------------ Site layout
export const layout = {
  id: 'layout', title: 'Site layout', sub: 'Footprints of all structures, drag to arrange, land requirement in m² / ha / acres / perches', icon: 'map', group: 'Plant-wide', mod: 'layout',
  fields: [
    { k: 'road', l: 'Road / spacing between structures', u: 'm' },
    { k: 'setback', l: 'Boundary setback', u: 'm' },
    { k: 'expansion', l: 'Land reserve for next stage', u: '%', note: 'D2 §2.3: area for future extensions' },
    { k: 'showGrid', l: 'Show 10 m grid', t: 'bool' },
    { sec: 'Site planning (D2 §2.3)' },
    { k: 'quarters', l: 'Staff quarters', u: 'units', step: 1 },
    { k: 'floodLevel', l: 'Historic flood level at site', u: 'm MSL', step: 0.1, auto: true, autoVal: (r) => r.intake?.inputs?.HFL },
    { k: 'rainI', l: 'Storm intensity for site drains', u: 'mm/h' },
    { k: 'drainSlope', l: 'Drain longitudinal slope', u: '%', step: 0.1 },
    { k: 'roadAccess', l: 'All-weather access to plant & intake', t: 'bool' },
    { k: 'powerAvailable', l: 'Grid power available at site', t: 'bool' },
    { k: 'soilInvestigated', l: 'Trial pits / boreholes completed', t: 'bool' },
    { t: 'help', html: 'Drag any structure on the plan to re-arrange the site. The land requirement updates with the new envelope. Use “Reset arrangement” to return to the automatic flow-line layout.' },
    { t: 'custom', render: () => h('button', { class: 'btn', onclick: () => setInput(['layout', 'pos'], {}, { immediate: true }) }, icon('reset'), 'Reset arrangement') },
  ],
  render(r) {
    const L = r.layout;
    const box = h('div');
    const dw = layoutPlan(L, { draggable: true });
    requestAnimationFrame(() => {
      const svg = mountDrawing(box, dw, { height: 560, idPrefix: 'lay' });
      // dragging of structures
      const S = 100;
      let drag = null;
      svg.addEventListener('pointerdown', (e) => {
        const g = e.target.closest('g.drag');
        if (!g) return;
        e.stopPropagation();
        const key = g.dataset.key;
        const it = L.items.find((i) => i.key === key);
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p0 = pt.matrixTransform(svg.getScreenCTM().inverse());
        drag = { key, g, p0, x: it.x, y: it.y };
        svg.setPointerCapture(e.pointerId);
      }, true);
      svg.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        drag.dx = (p.x - drag.p0.x) / S; drag.dy = (p.y - drag.p0.y) / S;
        drag.g.setAttribute('transform', `translate(${(p.x - drag.p0.x).toFixed(1)},${(p.y - drag.p0.y).toFixed(1)})`);
      }, true);
      svg.addEventListener('pointerup', () => {
        if (!drag) return;
        if (drag.dx !== undefined) {
          const pos = { ...(store.project.inputs.layout.pos || {}) };
          pos[drag.key] = { x: Math.max(0, Math.round((drag.x + drag.dx) * 2) / 2), y: Math.max(0, Math.round((drag.y + drag.dy) * 2) / 2) };
          setInput(['layout', 'pos'], pos, { immediate: true });
        }
        drag = null;
      }, true);
    });
    return {
      overview: [
        kpis([
          { label: 'Land requirement', value: f2(L.ha), unit: 'ha', sub: `${f2(L.acres)} acres · ${f0(L.perches)} perches`, accent: true, icon: 'map' },
          { label: 'Site envelope', value: `${f0(L.siteW)} × ${f0(L.siteH)}`, unit: 'm', sub: `${f0(L.siteArea)} m²` },
          { label: 'Built-up footprint', value: f0(L.builtArea), unit: 'm²', sub: `${f0(L.builtArea / L.siteArea * 100)} % of envelope` },
          { label: 'Structures', value: L.items.length },
        ]),
        card('Site plan (drag structures to arrange)', box, { flush: true, actions: [] }),
        structureCard(r, 'site', { height: 520, title: 'Site – plan sheet, levels & drainage, and 3D view of the plant' }),
        L.phasing?.length ? card(`Staged construction – Stage I builds ${f0(L.stageRatio * 100)} % of the ultimate capacity`, table([{ k: 'unit', l: 'Units' }, { k: 'ult', l: 'Ultimate', num: true }, { k: 's1', l: 'Stage I', num: true }, { k: 'later', l: 'Added later', num: true }, { k: 'note', l: 'Note' }], L.phasing), { flush: true, sub: 'NWSDB D3 §9.1, §9.6 – intake, inlet works, pump house, chemical house, galleries and channels are built for the ultimate flow' }) : null,
        h('div', { class: 'grid2' },
          card('Site planning checklist – NWSDB D2 §2.3', table([{ k: 'status', l: '', v: (c) => statusBadge(c.status, true) }, { k: 'label', l: 'Item' }, { k: 'value', l: 'Status / value' }, { k: 'range', l: 'Requirement' }], L.checks.filter((c) => !c.key)), { flush: true }),
          card('Site drainage (D2 §4.8.4 rational formula)', kvTable([['Weighted runoff coefficient', f2(L.Cw), ''], ['Storm intensity', L.inputs.rainI, 'mm/h'], ['Peak run-off from site', fmt(L.Qdr, 3), 'm³/s'], ['Perimeter drains (2 outlets)', `${f2(L.drainB)} × ${f2(L.drainB)}`, 'm'], ['Drain slope', L.inputs.drainSlope, '%']]), { flush: true })),
        card('Structures', table([{ k: 'label', l: 'Structure' }, { k: 'kind', l: 'Type' }, { k: 'w', l: 'Length (m)', num: true }, { k: 'h', l: 'Width (m)', num: true }, { k: 'a', l: 'Area (m²)', num: true, v: (i) => i.w * i.h, fmt: f0 }], L.items), { flush: true }),
      ],
    };
  },
};

// ------------------------------------------------------------------ Energy
export const energy = {
  id: 'energy', title: 'Power & energy', sub: 'Electrical loads, maximum demand, transformer, standby generator, CEB energy bill', icon: 'zap', group: 'Plant-wide', mod: 'energy',
  fields: [
    { sec: 'Electrical' },
    { k: 'pf', l: 'Power factor', step: 0.01 },
    { k: 'diversity', l: 'Diversity factor', step: 0.05 },
    { k: 'genEssentialPumps', l: 'Duty pumps per station on generator', step: 1, note: 'D2 §6.4.1: all essential pumping' },
    { k: 'outageHours', l: 'Standby generation per year', u: 'h' },
    { k: 'dieselPrice', l: 'Diesel price', u: 'LKR/L', note: `Rates 2026 Annex 08: ${DIESEL.v}` },
    { sec: 'CEB tariff – Rate Book Annex 8 (effective 12.06.2025)' },
    { k: 'tariff', l: 'Tariff category', t: 'sel', o: (r) => [['auto', `Auto (${r.energy.tariff})`], ...Object.entries(TARIFFS).map(([k, t]) => [k, t.label])], note: 'The Rate Book does not state the NWSDB category – confirm with CEB' },
    { k: 'energyRate', l: 'Energy charge (TOU blend)', u: 'LKR/kWh', auto: true, autoVal: (r) => r.energy.energyRate, note: '13 h day / 4 h peak / 7 h off-peak + 2.5 % SSCL' },
    { k: 'demandRate', l: 'Demand charge', u: 'LKR/kVA·month', auto: true, autoVal: (r) => r.energy.demandRate },
    { k: 'fixedCharge', l: 'Fixed charge', u: 'LKR/month', auto: true, autoVal: (r) => r.energy.fixedCharge },
    { k: 'extraLoads', t: 'table', l: 'Additional loads', cols: [{ k: 'name', l: 'Load', text: true, w: '50%' }, { k: 'kw', l: 'kW' }, { k: 'hours', l: 'h/d' }], add: { name: 'New load', kw: 1, hours: 8 }, minRows: 0 },
  ],
  render(r) {
    const e = r.energy;
    const groups = Object.entries(e.groups).map(([g, v]) => ({ g, v })).sort((a, b) => b.v - a.v);
    return {
      overview: [
        kpis([
          { label: 'Maximum demand', value: f0(e.kva), unit: 'kVA', sub: `running ${f0(e.kwRunning)} kW · connected ${f0(e.kwConnected)} kW`, accent: true, icon: 'zap' },
          { label: 'Transformer', value: e.tx, unit: 'kVA' },
          { label: 'Standby generator', value: e.genKva, unit: 'kVA', sub: `essential loads · ${f0(e.fuelL)} L diesel/yr` },
          { label: 'Energy use', value: f0(e.kwhOp), unit: 'kWh/d', sub: `${f2(e.spec)} kWh/m³ at operating flow` },
          { label: 'Electricity bill', value: fmtMoney(e.monthlyBill), sub: `per month · CEB ${e.tariff} @ ${f2(e.energyRate)} LKR/kWh` },
        ]),
        notes(e.notes),
        card('Load schedule', table([{ k: 'group', l: 'Group' }, { k: 'name', l: 'Load' }, { k: 'kwEach', l: 'kW each', num: true }, { k: 'nInst', l: 'Installed', num: true }, { k: 'nRun', l: 'Running', num: true }, { k: 'hours', l: 'h/d', num: true, fmt: f1 }, { k: 'kwh', l: 'kWh/d', num: true, fmt: f0 }], e.loads, { totals: { kwh: e.kwhD } }), { flush: true }),
      ],
      visuals: [chartCard('Daily energy by load group', { type: 'hbar', data: groups, x: { key: 'g' }, y: { label: 'kWh/d' }, series: [{ key: 'v', label: 'Energy' }], valueFormat: (v) => f0(v) + ' kWh', unit: 'kWh/d', height: 40 + groups.length * 38 })],
    };
  },
};

// ------------------------------------------------------------------ Cost
export const cost = {
  id: 'cost', title: 'Cost estimate', sub: 'Total cost estimate, bill of quantities, annual O&M and unit cost of water (LKR)', icon: 'wallet', group: 'Plant-wide', mod: 'cost',
  fields: [
    { sec: 'Estimate – NWSDB Rates 2026' },
    { k: 'method', l: 'Pricing method', t: 'sel', o: [['composite', 'Total cost estimate – Section A composite rates & unit-cost graphs (RB "How to use")'], ['boq', 'Engineer\'s estimate – quantity BOQ with Section B unit rates']] },
    { k: 'format', l: 'Estimate format', t: 'sel', o: [['rb2025', 'NWSDB Rates 2026 – Table 1 total cost estimate (Annex 13)'], ['d2', 'NWSDB Design Manual D2 §10.2 (1989)']] },
    { k: 'markup', l: 'Contractor\'s markup on RB rates that exclude it', u: '%', note: 'Rate Book: 27 %' },
    { k: 'procurement', l: 'Procurement (Table 2 LC/FC factors)', t: 'sel', o: [['ncb', 'NCB – national competitive bidding'], ['icb', 'ICB – international competitive bidding']], show: (i) => i.cost.format !== 'd2' },
    { k: 'fundSource', l: 'Source of funds (Table 4)', t: 'sel', o: Object.entries(ENG_PCT).map(([k, v]) => [k, `${v.label} – ${v.ge100} % (≥ LKR 100 M)`]), show: (i) => i.cost.format !== 'd2' },
    { k: 'engPct', l: 'Investigation, design & supervision', u: '% of ST1', auto: true, autoVal: (r) => r.cost.est?.engPct, show: (i) => i.cost.format !== 'd2' },
    { k: 'prelimPct', l: 'Preliminaries', u: '% of ST1', auto: true, autoVal: (r) => r.cost.prelimPct, note: 'RB: 4 % (> LKR 500 M) / 5 %', show: (i) => i.cost.format !== 'd2' },
    { k: 'contPct', l: 'Physical contingencies', u: '% of ST1', auto: true, autoVal: (r) => r.cost.contPct, note: 'RB: maximum 10 %', show: (i) => i.cost.format !== 'd2' },
    { k: 'rwss', l: '(iv) 5 % for RWS&S / water-resource improvement', t: 'bool', show: (i) => i.cost.format !== 'd2' },
    { k: 'powerSupply', l: '(ii) CEB bulk supply cost (CEB standard construction cost in the Rate Book)', t: 'bool', show: (i) => i.cost.format !== 'd2' },
    { k: 'supplyKv', l: 'CEB supply voltage', u: 'kV', show: (i) => i.cost.format !== 'd2' && i.cost.powerSupply },
    { k: 'roadReinst', l: '(ii) Road reinstatement (p.sum)', u: 'LKR', show: (i) => i.cost.format !== 'd2' },
    { k: 'eia', l: 'EIA / IEE (p.sum)', u: 'LKR', show: (i) => i.cost.format !== 'd2' },
    { k: 'vehicles', l: 'Vehicles (p.sum)', u: 'LKR' },
    { k: 'training', l: 'Training (p.sum)', u: 'LKR', show: (i) => i.cost.format !== 'd2' },
    { k: 'duties', l: '(v) Duties & fiscal levies (if not in the rates)', u: 'LKR', show: (i) => i.cost.format !== 'd2' },
    { k: 'vatPct', l: 'VAT', u: '%', note: 'Annex 13: 18 % of Sub Total 4' },
    { k: 'sscl', l: 'Allow for SSCL (Sub Total 3 / 97.5 × 2.5)', t: 'bool', show: (i) => i.cost.format !== 'd2', note: 'Annex 13 (Rates 2026)' },
    { k: 'escalate', l: 'Price escalation beyond 31.12.2026 (LC 5 %, FC 3 % p.a.)', t: 'bool', show: (i) => i.cost.format !== 'd2' },
    { k: 'implStart', l: 'Implementation starts', u: 'year', step: 1, show: (i) => i.cost.format !== 'd2' && i.cost.escalate },
    { k: 'implYears', l: 'Implementation period', u: 'years', step: 0.5, show: (i) => i.cost.format !== 'd2' && i.cost.escalate },
    { k: 'landPerPerch', l: '(iii) Land acquisition', u: 'LKR/perch' },
    { k: 'usd', l: 'Exchange rate', u: 'LKR/USD' },
    { sec: 'D2 §10.2 format', show: (i) => i.cost.format === 'd2' },
    { k: 'stage', l: 'Estimate stage', t: 'sel', o: [['prefeasibility', 'Pre-feasibility (contingency 20 %)'], ['feasibility', 'Feasibility (10–15 %)'], ['detailed', 'Detailed design (10 %)']], show: (i) => i.cost.format === 'd2' },
    { k: 'd2EngPct', l: 'Engineering design & supervision', u: '%', note: 'D2: 6 % + 2 %', show: (i) => i.cost.format === 'd2' },
    { k: 'include2yrOM', l: 'Include 2 years O&M in capital', t: 'bool', show: (i) => i.cost.format === 'd2' },
    { k: 'escalationPct', l: 'Price escalation for funding', u: '% p.a.', show: (i) => i.cost.format === 'd2' },
    { sec: 'Unit rates (0 = NWSDB Rates 2026)' },
    { k: 'rConcrete', l: 'RC grade 30 – supply & place', u: 'LKR/m³', auto: true, autoVal: (r) => r.cost.rates.conc, note: 'B-WRS/01 A + B + markup' },
    { k: 'rFormwork', l: 'Formwork', u: 'LKR/m²', auto: true, autoVal: (r) => r.cost.rates.form, note: 'B-WRS/01 D' },
    { k: 'rSteel', l: 'Reinforcement', u: 'LKR/kg', auto: true, autoVal: (r) => r.cost.rates.steel, note: 'B-WRS/01 C' },
    { k: 'steelPerM3', l: 'Reinforcement intensity', u: 'kg/m³', auto: true, autoVal: (r) => r.cost.inputs.steelPerM3, note: '0 = average from the structural pre-design' },
    { k: 'rExcavation', l: 'Excavation for structures', u: 'LKR/m³', auto: true, autoVal: (r) => r.cost.rates.exc, note: 'B-WRS/02' },
    { k: 'rSand', l: 'Filter sand', u: 'LKR/m³', auto: true, autoVal: (r) => r.cost.rates.sand, note: 'B-FM/01' },
    { k: 'rGravel', l: 'Filter gravel', u: 'LKR/m³', auto: true, autoVal: (r) => r.cost.rates.gravel, note: 'B-FM/01' },
    { k: 'rAnthracite', l: 'Anthracite', u: 'LKR/m³', auto: true, autoVal: (r) => r.cost.rates.anth, note: 'B-FM/01 (475 LKR/kg)' },
    { k: 'rRoad', l: 'Internal roads', u: 'LKR/m²', auto: true, autoVal: (r) => r.cost.rates.road, note: 'B-RD/01' },
    { k: 'rFence', l: 'Boundary fence', u: 'LKR/m', auto: true, autoVal: (r) => r.cost.rates.fence, note: 'B-MIS/02' },
    { k: 'rPipeFactor', l: 'Pipe supply & laying factor', step: 0.05, note: 'A-DI/PE/PVC tables × B-COM/02 location factor' },
    { k: 'origin', l: 'Pipe origin', t: 'sel', o: [['asian', 'Asian (A-DI/1, A-PE/1, 3)'], ['nonasian', 'Japanese & non-Asian (A-DI/2, A-PE/2, 4)'], ['local', 'Local HDPE (B-PE/1B, 3B)']] },
    { k: 'ewsPct', l: 'Earthwork support allowance (pipe trenches)', u: '% of basic' },
    { k: 'dewPct', l: 'Dewatering allowance (pipe trenches)', u: '% of basic' },
    { sec: 'M&E' },
    { k: 'starter', l: 'Pump motor starters', t: 'sel', o: [['soft', 'Soft starter (B-ELE/12)'], ['stardelta', 'Star-delta (B-ELE/13)'], ['vsd', 'Variable speed drive (B-ELE/15–16)']] },
    { k: 'sparesPct', l: 'Spare parts on pumps & generators', u: '% of supply', note: 'RB: up to 20–25 % for TCE' },
    { k: 'cablePct', l: 'Cabling, earthing & lightning', u: '% of switchgear' },
    { k: 'icaPct', l: 'Instrumentation, PLC/SCADA', u: '% of M&E' },
    { k: 'filterEquip', l: 'Filter valves & controls per filter (not in RB)', u: 'LKR' },
    { k: 'scraperRect', l: 'Chain-and-flight scraper (not in RB)', u: 'LKR/nr' },
    { k: 'chemSystem', l: 'Chemical dosing system (not in RB)', u: 'LKR' },
    { k: 'facilities', l: 'Include laboratory equipment & D2 §10.2 facilities', t: 'bool' },
    { sec: 'O&M (D2 §10.1.2)' },
    { k: 'maintMEPct', l: 'Repairs – M&E', u: '%/yr', note: 'D2: about 1 %' },
    { k: 'maintCivilPct', l: 'Repairs – piping, valves & structures', u: '%/yr' },
    { k: 'chemTransportPct', l: 'Chemical transport & handling', u: '%' },
    { k: 'omOverheadPct', l: 'NWSDB / LA overhead', u: '%', note: 'D2: 35 %' },
    { k: 'omContPct', l: 'O&M contingency', u: '%', note: 'D2: 10 %' },
    { sec: 'Comparative cost analysis (D2 §10.3)' },
    { k: 'interest', l: 'Discount rate', u: '%', note: 'D2: 8–15 % (World Bank)' },
    { k: 'life', l: 'Life of structures', u: 'years', note: 'D2 §2.4: 20' },
    { k: 'lifeME', l: 'Life of M&E (replacement)', u: 'years', note: 'D2 §2.4: 10' },
  ],
  render(r) {
    const c = r.cost;
    const rb = c.est.format !== 'd2';
    const mn = (v) => fmt(v / 1e6, 2);
    const grp = Object.entries(c.worksGroups || c.groupTotals).map(([g, v]) => ({ g, v: v / 1e6 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    const om = Object.entries(c.om).map(([g, v]) => ({ g, v: v / 1e6 })).sort((a, b) => b.v - a.v);
    const boq = [...c.civil.map((x) => ({ ...x, cat: 'Civil' })), ...c.me.map((x) => ({ ...x, cat: 'M&E' }))];
    const refCell = (v) => h('span', { class: 'small ' + (/indicative|provisional/i.test(v || '') ? 'warn-txt' : 'muted') }, v || '');
    const itemCols = [{ k: 'item', l: 'Item' }, { k: 'qty', l: 'Qty', num: true, fmt: (v) => fmt(v, v < 10 ? 2 : 0) }, { k: 'unit', l: 'Unit' }, { k: 'rate', l: 'Rate (LKR)', num: true, fmt: f0 }, { k: 'amount', l: 'Amount (LKR Mn)', num: true, fmt: mn }, { k: 'ref', l: 'Rate Book reference', v: (x) => refCell(x.ref) }];
    const estRows = c.est.rows.filter(([k, v]) => v || /TOTAL/i.test(k)).map(([k, v]) => ({ k, v, _tot: /SUB TOTAL|TOTAL IMPLEMENTING|Total capital/i.test(k) }));
    const tceTitle = rb ? 'Total cost estimate – NWSDB Rates 2026 (Table 1 format, Annex 13)' : 'Capital cost – NWSDB Design Manual D2 §10.2 format';
    const cross = c.cross.map((x) => ({ ...x, ratio: (x.boq / Math.max(x.rb, 1)) * 100 }));
    return {
      overview: [
        kpis([
          { label: rb ? 'Total implementing cost' : 'Total capital cost', value: fmtMoney(c.capex), sub: `≈ USD ${fmt(c.usd / 1e6, 1)} Mn incl. VAT ${c.inputs.vatPct} %`, accent: true, icon: 'wallet' },
          { label: 'Per m³/d capacity', value: f0(c.perCap), unit: 'LKR', sub: `≈ USD ${f0(c.perCap / c.inputs.usd)}` },
          { label: c.method === 'composite' ? 'Works – composite (RB Sec. A)' : 'Works – BOQ (RB Sec. B)', value: fmtMoney(c.works), sub: c.method === 'composite' ? `Engineer's BOQ ${fmtMoney(c.boqWorks)}` : `Composite (Sec. A) ${fmtMoney(c.compTot)}` },
          { label: 'Annual O&M', value: fmtMoney(c.omTot), sub: `${f2(c.omPerM3)} LKR/m³ · chemicals, power, staff` },
          { label: 'Unit cost of water (EAC)', value: f2(c.fullPerM3), unit: 'LKR/m³', sub: `D2 §10.3 · discount ${c.inputs.interest} %` },
          { label: 'Present value (20 yr)', value: fmtMoney(c.pvTotal), sub: 'capital + discounted O&M' },
        ]),
        notes([
          { level: 'info', title: 'Pricing basis', text: `${RB.title}${rb ? ` – ${c.method === 'composite' ? 'Section A composite rates & unit-cost graphs first, Section B unit rates where none exist' : 'quantity BOQ priced with Section B unit rates'} (How to use, item 1)` : ''}. Contractor's markup ${c.inputs.markup} % added where the book excludes it; pipe laying × B-COM/02 location factor ${fmt(c.factor, 2)} (${c.district || 'district not set'}). Full rate tables: Library → Cost rates.` },
          c.indicativePct > 0.5 ? { level: 'warn', title: 'Items not in the Rate Book', text: `${fmt(c.indicativePct, 0)} % of the BOQ (${fmtMoney(c.indicative)}) is priced with indicative allowances for items the Rate Book does not cover (scrapers, filter valve sets, dosing skids, …) – shown in amber in the BOQ; replace with quotations when available.` } : null,
          ...(c.notes || []),
        ].filter(Boolean)),
        h('div', { class: 'grid2' },
          card(tceTitle, table([{ k: 'k', l: 'Item' }, { k: 'v', l: 'LKR Mn', num: true, fmt: mn }], estRows), { flush: true, sub: rb ? `${(c.inputs.procurement || 'ncb').toUpperCase()} · LC share ${fmt(c.est.lcPct, 0)} % · ${c.est.t > 0 ? `escalated ${fmt(c.est.t, 1)} yr beyond 31.12.${RB.baseYear}` : `base prices 31.12.${RB.baseYear}`}` : `${c.inputs.stage} stage` }),
          card('Staffing (indicative NWSDB cadre)', kvTable(Object.entries(c.staff).map(([k, v]) => [({ engineer: 'Engineer / OIC', chemist: 'Chemist', labAsst: 'Laboratory assistants', operator: 'Plant operators (3 shifts)', fitter: 'Fitters / electricians', labourer: 'Labourers', security: 'Security' })[k], v, 'nos.'])), { flush: true })),
        card('Cross-check – quantity BOQ vs RB unit-cost graphs', table([{ k: 'item', l: 'Scope' }, { k: 'rb', l: 'RB graph (LKR Mn)', num: true, fmt: mn }, { k: 'boq', l: 'BOQ (LKR Mn)', num: true, fmt: mn }, { k: 'ratio', l: 'BOQ / graph', num: true, fmt: (v) => fmt(v, 0) + ' %' }], cross), { flush: true, sub: 'Graphs A-UC/01–07 include markup & duties, exclude VAT. The graphs reflect full NWSDB tender prices; a quantity BOQ of the main structures alone is normally well below them.' }),
        rb && c.method === 'composite' ? card('Contractual composite items (works)', table(itemCols, c.comp, { totals: { amount: c.compTot } }), { flush: true, sub: 'Rates per NWSDB Rates 2026 – Section A tables & graphs; Section B where no composite rate exists' }) : null,
        card(c.method === 'composite' && rb ? "Engineer's estimate – bill of quantities (RB Section B unit rates)" : 'Bill of quantities', table([{ k: 'cat', l: '' }, ...itemCols], boq, { totals: { amount: c.boqWorks } }), { flush: true, sub: 'Amber references are indicative allowances (not in the Rate Book)' }),
      ],
      visuals: [
        chartCard('Works cost by component (LKR Mn)', { type: 'hbar', data: grp, x: { key: 'g' }, y: { label: 'LKR Mn' }, series: [{ key: 'v', label: 'Cost' }], valueFormat: (v) => f1(v), unit: 'LKR Mn', height: 40 + grp.length * 30, marginLeft: 210 }, { sub: c.method === 'composite' ? 'Composite estimate (RB Section A)' : 'Quantity BOQ (RB Section B)' }),
        chartCard('Unit cost of water vs discount rate (D2 §10.3)', { type: 'stacked', data: c.sens.map((x) => ({ r: x.r + ' %', cap: x.cap, om: x.om })), x: { key: 'r', label: 'Discount rate' }, y: { label: 'LKR / m³' }, series: [{ key: 'cap', label: 'Capital (EAC)' }, { key: 'om', label: 'O&M' }], unit: 'LKR/m³', height: 260 }, { sub: 'D2: test several rates in the 8–15 % range' }),
        chartCard('Annual O&M cost (LKR Mn)', { type: 'hbar', data: om, x: { key: 'g' }, y: { label: 'LKR Mn/yr' }, series: [{ key: 'v', label: 'Cost', color: 'var(--series-3)' }], valueFormat: (v) => f1(v), unit: 'LKR Mn', height: 40 + om.length * 36 }),
      ],
    };
  },
};
