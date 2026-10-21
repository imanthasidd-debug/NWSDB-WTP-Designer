// Plant-wide pages: storage & pumping, residuals, hydraulic profile, site layout, power, cost
import { COST, FACILITIES, PIPE_MATERIALS, PUMP_TYPES, SITE_CHECKLIST } from '../../core/d2.js';
import { MONTHS, fmt, fmtAuto, fmtMoney } from '../../core/util.js';
import { PATTERNS } from '../../engine/storage.js';
import { h, icon } from '../dom.js';
import { mountDrawing } from '../draw/render.js';
import { cwrPlan, hydraulicProfile, layoutPlan } from '../draw/units.js';
import { card, chartCard, drawingCard, kpis, kvTable, notes, statusBadge, table } from '../results.js';
import { econChart, mainSpecCard } from './units.js';
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
        drawingCard(cwrPlan(s), { height: 320 }),
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
    { k: 'sedCapture', l: 'Solids captured in clarifiers', u: '%' },
    { k: 'sedSolids', l: 'Clarifier sludge solids', u: '%', step: 0.1 },
    { k: 'recoveryWashes', l: 'Recovery tank capacity', u: 'washes', step: 0.5 },
    { sec: 'Thickening & dewatering' },
    { k: 'thickLoad', l: 'Thickener solids loading', u: 'kg/m²·d', crit: 'sl.thickLoad' },
    { k: 'thickSolids', l: 'Thickened solids', u: '%', step: 0.5 },
    { k: 'dewaterRate', l: 'Dewatering unit capacity', u: 'kg DS/h' },
    { k: 'dewaterHours', l: 'Dewatering hours', u: 'h/d' },
    { k: 'bedLoad', l: 'Drying-bed loading', u: 'kg DS/m²', crit: 'sl.bedLoad' },
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
    { k: 'measure', l: 'Measuring structure', t: 'sel', o: [['auto', 'Auto (V-notch / weir / flume by flow)'], ['rectFull', 'Rectangular weir, full width'], ['rectContracted', 'Rectangular weir, end contractions'], ['vnotch90', '90° V-notch weir'], ['vnotch60', '60° V-notch weir'], ['broad', 'Broad-crested weir'], ['flume', 'Critical-depth flume'], ['none', 'None (meter elsewhere)']] },
    { k: 'weirB', l: 'Crest / throat width', u: 'm', step: 0.05, auto: true, autoVal: (r) => r.hyd.meas?.b },
    { k: 'weirP', l: 'Crest height above channel floor (P)', u: 'm', step: 0.05 },
    { k: 'minFlowPct', l: 'Minimum flow to measure', u: '% of design' },
    { k: 'freeFall', l: 'Free fall below crest', u: 'm', step: 0.05 },
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
    { k: 'dieselPrice', l: 'Diesel price', u: 'LKR/L' },
    { sec: 'CEB tariff (update to current PUCSL tariff)' },
    { k: 'energyRate', l: 'Energy charge (blended)', u: 'LKR/kWh' },
    { k: 'demandRate', l: 'Demand charge', u: 'LKR/kVA·month' },
    { k: 'fixedCharge', l: 'Fixed charge', u: 'LKR/month' },
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
          { label: 'Electricity bill', value: fmtMoney(e.monthlyBill), sub: 'per month (estimate)' },
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
  id: 'cost', title: 'Cost estimate', sub: 'Quantity-based capital cost, annual O&M and unit production cost (LKR)', icon: 'wallet', group: 'Plant-wide', mod: 'cost',
  fields: [
    { sec: 'Civil rates (indicative – update to NWSDB schedule of rates)' },
    { k: 'rConcrete', l: 'Reinforced concrete (incl. formwork)', u: 'LKR/m³' },
    { k: 'rSteel', l: 'Reinforcement', u: 'LKR/kg' },
    { k: 'steelPerM3', l: 'Reinforcement intensity', u: 'kg/m³' },
    { k: 'rExcavation', l: 'Excavation', u: 'LKR/m³' },
    { k: 'rBuilding', l: 'Buildings', u: 'LKR/m²' },
    { k: 'rSand', l: 'Filter sand', u: 'LKR/m³' },
    { k: 'rGravel', l: 'Filter gravel', u: 'LKR/m³' },
    { k: 'rPipePerMmM', l: 'DI main (per mm dia. per m)', u: 'LKR' },
    { k: 'rSiteWorks', l: 'Site works', u: 'LKR/m² site' },
    { k: 'landPerPerch', l: 'Land acquisition', u: 'LKR/perch' },
    { sec: 'M&E' },
    { k: 'pumpPerKw', l: 'Pump sets', u: 'LKR/kW' },
    { k: 'filterEquip', l: 'Filter equipment per filter', u: 'LKR' },
    { k: 'elecPct', l: 'LV electrical', u: '% of M&E' },
    { k: 'icaPct', l: 'Instrumentation & SCADA', u: '% of M&E' },
    { k: 'rAirValve', l: 'Air valve incl. chamber', u: 'LKR/nr' },
    { k: 'rWashout', l: 'Washout incl. chamber', u: 'LKR/nr' },
    { k: 'facilities', l: 'Include D2 §10.2 facilities checklist items', t: 'bool' },
    { sec: 'Estimate format (D2 §10.2)' },
    { k: 'stage', l: 'Estimate stage', t: 'sel', o: [['prefeasibility', 'Pre-feasibility (contingency 20 %)'], ['feasibility', 'Feasibility (10–15 %)'], ['detailed', 'Detailed design (10 %)']] },
    { k: 'prelimPct', l: 'Preliminaries', u: '% of ECC', auto: true, autoVal: (r) => r.cost.prelimPct, note: 'D2: ½–1 %' },
    { k: 'contPct', l: 'Physical contingencies', u: '%', auto: true, autoVal: (r) => r.cost.contPct },
    { k: 'engPct', l: 'Engineering design & supervision', u: '%', note: 'D2: 6 % + 2 %' },
    { k: 'include2yrOM', l: 'Include 2 years O&M in capital', t: 'bool' },
    { k: 'vatPct', l: 'Taxes (VAT)', u: '%', note: 'D2 (1989): BTT 3 %' },
    { k: 'escalationPct', l: 'Price escalation for funding', u: '% p.a.', note: 'D2: 10–15 % (0 = base year)' },
    { k: 'escalationYears', l: 'Years to mid-construction', step: 1, show: (i) => i.cost.escalationPct > 0 },
    { k: 'usd', l: 'Exchange rate', u: 'LKR/USD' },
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
    const grp = Object.entries(c.groupTotals).map(([g, v]) => ({ g, v: v / 1e6 })).sort((a, b) => b.v - a.v);
    const om = Object.entries(c.om).map(([g, v]) => ({ g, v: v / 1e6 })).sort((a, b) => b.v - a.v);
    const boq = [...c.civil.map((x) => ({ ...x, cat: 'Civil' })), ...c.me.map((x) => ({ ...x, cat: 'M&E' }))];
    return {
      overview: [
        kpis([
          { label: 'Total capital cost', value: fmtMoney(c.capex), sub: `≈ USD ${fmt(c.usd / 1e6, 1)} Mn incl. VAT`, accent: true, icon: 'wallet' },
          { label: 'Per m³/d capacity', value: f0(c.perCap), unit: 'LKR', sub: `≈ USD ${f0(c.perCap / c.inputs.usd)}` },
          { label: 'Annual O&M', value: fmtMoney(c.omTot), sub: 'chemicals, power, staff, maintenance' },
          { label: 'O&M cost', value: f2(c.omPerM3), unit: 'LKR/m³', sub: 'per m³ produced' },
          { label: 'Unit cost of water (EAC)', value: f2(c.fullPerM3), unit: 'LKR/m³', sub: `D2 §10.3 · discount ${c.inputs.interest} %` },
          { label: 'Present value (20 yr)', value: fmtMoney(c.pvTotal), sub: 'capital + discounted O&M' },
        ]),
        notes(c.notes),
        h('div', { class: 'grid2' },
          card('Capital cost – NWSDB D2 §10.2 format', kvTable([['1. Civil & building works', fmtMoney(c.civilTot), ''], ['1. Mechanical, electrical & facilities', fmtMoney(c.meTot), ''], [`   Preliminaries (${c.prelimPct} % of ECC)`, fmtMoney(c.prelim), ''], c.land ? ['   Land acquisition', fmtMoney(c.land), ''] : null, ['2. O&M for 2 years', fmtMoney(c.om2), ''], ['3. Subtotal', fmtMoney(c.sub3), ''], [`4. Engineering & supervision (${c.inputs.engPct} %)`, fmtMoney(c.eng), ''], [`5. Physical contingencies (${c.contPct} %)`, fmtMoney(c.cont), ''], [`6. Taxes (${c.inputs.vatPct} %)`, fmtMoney(c.vat), ''], ['7. Total capital cost', fmtMoney(c.capex), ''], c.escal ? ['8. Price escalation for funding', fmtMoney(c.escal), ''] : null]), { flush: true }),
          card('Staffing (indicative NWSDB cadre)', kvTable(Object.entries(c.staff).map(([k, v]) => [({ engineer: 'Engineer / OIC', chemist: 'Chemist', labAsst: 'Laboratory assistants', operator: 'Plant operators (3 shifts)', fitter: 'Fitters / electricians', labourer: 'Labourers', security: 'Security' })[k], v, 'nos.'])), { flush: true })),
        card('Bill of quantities (summary)', table([{ k: 'cat', l: '' }, { k: 'item', l: 'Item' }, { k: 'qty', l: 'Qty', num: true, fmt: (v) => fmt(v, v < 10 ? 2 : 0) }, { k: 'unit', l: 'Unit' }, { k: 'rate', l: 'Rate (LKR)', num: true, fmt: f0 }, { k: 'amount', l: 'Amount (LKR Mn)', num: true, fmt: (v) => fmt(v / 1e6, 2) }], boq, { totals: { amount: c.works } }), { flush: true }),
      ],
      visuals: [
        chartCard('Unit cost of water vs discount rate (D2 §10.3)', { type: 'stacked', data: c.sens.map((x) => ({ r: x.r + ' %', cap: x.cap, om: x.om })), x: { key: 'r', label: 'Discount rate' }, y: { label: 'LKR / m³' }, series: [{ key: 'cap', label: 'Capital (EAC)' }, { key: 'om', label: 'O&M' }], unit: 'LKR/m³', height: 260 }, { sub: 'D2: test several rates in the 8–15 % range' }),
        chartCard('Capital cost by component (LKR Mn)', { type: 'hbar', data: grp, x: { key: 'g' }, y: { label: 'LKR Mn' }, series: [{ key: 'v', label: 'Cost' }], valueFormat: (v) => f1(v), unit: 'LKR Mn', height: 40 + grp.length * 30, marginLeft: 210 }),
        chartCard('Annual O&M cost (LKR Mn)', { type: 'hbar', data: om, x: { key: 'g' }, y: { label: 'LKR Mn/yr' }, series: [{ key: 'v', label: 'Cost', color: 'var(--series-3)' }], valueFormat: (v) => f1(v), unit: 'LKR Mn', height: 40 + om.length * 36 }),
      ],
    };
  },
};
