// Treatment-unit pages: intake, aeration, chemical dosing, rapid mix, flocculation, sedimentation, filtration,
// disinfection, stabilisation
import { MONTHS, fmt, fmtAuto } from '../../core/util.js';
import { PIPE_MATERIALS, PUMP_TYPES } from '../../core/d2.js';
import { COAGULANTS } from '../../engine/coagulation.js';
import { IMPELLERS } from '../../engine/rapidmix.js';
import { AGENTS } from '../../engine/disinfection.js';
import { synthGradation } from '../../engine/filtration.js';
import { h, icon, modal } from '../dom.js';
import { aeratorSection, contactPlan, filterPlan, filterSection, flocDrawing, intakeSection, rapidMixDrawing, sedPlan, sedSection } from '../draw/units.js';
import { card, chartCard, drawingCard, kpis, kvTable, notes, table } from '../results.js';
import { getInput, setInput, store } from '../store.js';

const f1 = (v) => fmt(v, 1), f2 = (v) => fmt(v, 2), f0 = (v) => fmt(v, 0);

function pumpChart(p, title) {
  const series = [{ key: 'sys', label: 'System curve' }];
  for (let k = 1; k <= p.nDuty; k++) series.push({ key: 'p' + k, label: `${k} pump${k > 1 ? 's' : ''} in parallel`, dash: k < p.nDuty });
  return chartCard(title, { type: 'line', data: p.curves, x: { key: 'Q', label: 'Flow (m³/h)' }, y: { label: 'Head (m)', min: 0 }, series, markers: p.ops.map((o) => ({ x: o.Q, y: o.H, label: `${o.k}P: ${f0(o.Q)} m³/h @ ${f1(o.H)} m`, color: 'var(--series-2)' })).slice(-1), unit: 'm', height: 280 }, { sub: 'pump curves approximate H = H₀ − kQ² (H₀ = 1.3 H_duty)' });
}

/** D2 §7 main specification (class, C, valves, thrust) */
export function mainSpecCard(p, title) {
  const sp = p.spec;
  const rows = [
    ['Material / class', `${sp.matLabel} – ${sp.cls.cls}`], ['Working pressure rating', `${fmt(sp.cls.wpM, 0)} m`], ['Sustained head / max. with surge', `${f1(p.H)} / ${f1(p.pMax)} m`],
    ['Surge protection', p.protect ? 'provided (air vessel / relief valve)' : 'not required'], ['Design C (Fig 7.6)', `${f0(sp.Cdes)} → ${f0(p.C)} at ${f2(p.v)} m/s`], ['Field test pressure (1.5 × H)', `${f1(sp.testHead)} m`],
    ['Air valves (≤ 500 m apart)', `${sp.nAir} × ${sp.airSize} mm`], ['Washouts', `${sp.nWash} × ${sp.washSize} mm`], ['Isolating valves (≈ 1.5 km)', `${sp.nIso}${sp.bypass ? ' with by-pass' : ''}`],
    ['Thrust on 90° bend at test pressure', `${f0(sp.Ttest)} kN`], ['Thrust-block bearing area', `${f2(sp.blockA)} m²`], ['Minimum cover', '0.8 m (1.0 m under roads)'],
  ].map(([k, v]) => ({ k, v }));
  return card(title, table([{ k: 'k', l: 'Item' }, { k: 'v', l: 'Specification' }], rows), { flush: true, sub: 'NWSDB D2 §7.1–7.4' });
}
export function econChart(p, title) {
  if (!p.econ?.rows?.length) return null;
  const data = p.econ.rows.map((x) => ({ dn: 'DN' + x.dn, pipe: x.pipeCap ? x.annual - x.energy : 0, energy: x.energy }));
  return chartCard(title, { type: 'stacked', data, x: { key: 'dn', label: 'Diameter' }, y: { label: 'LKR / year', format: (v) => fmtAuto(v) }, series: [{ key: 'pipe', label: 'Annual capital (pipe + pumps)' }, { key: 'energy', label: 'Energy' }], unit: 'LKR/yr', height: 260 }, { sub: `least annual cost DN${p.econ.best?.dn} · velocity 0.6–1.6 m/s` });
}

// ------------------------------------------------------------------ Intake
export const intake = {
  id: 'intake', title: 'Intake & raw-water pumping', sub: 'Intake ports, coarse & fine screens, jack well, raw-water pumps and rising main', icon: 'waves', group: 'Treatment units', mod: 'intake',
  fields: [
    { sec: 'Intake type & river levels (D2 §5.2–5.3)' },
    { k: 'type', l: 'Intake type', t: 'sel', o: [['riverWell', 'River-bank intake well (jack well, direct intake)'], ['weir', 'Weir (ponding) with side / submerged intake'], ['tower', 'Reservoir / tank tower intake (multi-level)'], ['submerged', 'Submerged intake + conduit'], ['floating', 'Floating pontoon'], ['canal', 'Side-weir intake on irrigation canal'], ['wells', 'Tube wells (groundwater)']] },
    { k: 'bedLevel', l: 'River / reservoir bed level', u: 'm MSL', step: 0.1, show: (i) => i.intake.type !== 'wells' },
    { k: 'LWL', l: 'Lowest water level (LWL)', u: 'm MSL', step: 0.1, show: (i) => i.intake.type !== 'wells' },
    { k: 'NWL', l: 'Normal water level', u: 'm MSL', step: 0.1, show: (i) => i.intake.type !== 'wells' },
    { k: 'HFL', l: 'Highest flood level (HFL)', u: 'm MSL', step: 0.1, show: (i) => i.intake.type !== 'wells', note: 'D2 §5.3.1: check historic floods' },
    { k: 'deckFreeboard', l: 'Deck above HFL', u: 'm', step: 0.1, show: (i) => i.intake.type !== 'wells' },
    { k: 'wellYield', l: 'Yield per well', u: 'm³/h', show: (i) => i.intake.type === 'wells' },
    { k: 'wellHours', l: 'Pumping hours', u: 'h/d', show: (i) => i.intake.type === 'wells' },
    { sec: 'Ports & screens (D2 §5.4; NWSDB D3 §5.1.5)', show: (i) => i.intake.type !== 'wells' },
    { k: 'portV', l: 'Entrance velocity through ports', u: 'm/s', crit: 'int.portV', step: 0.01 },
    { k: 'portW', l: 'Port width', u: 'm', step: 0.1 },
    { k: 'portH', l: 'Port height', u: 'm', step: 0.1 },
    { k: 'sill', l: 'Port / bell-mouth sill above bed', u: 'm', step: 0.1, crit: 'int.bellmouth' },
    { k: 'chanU', l: 'Approach velocity in screen channel', u: 'm/s', step: 0.05, note: 'D3 Annex A: 0.4 m/s (no deposition)' },
    { k: 'chanW', l: 'Screen channel width', u: 'm', step: 0.1, auto: true, autoVal: (r) => r.intake.screenW, note: 'Auto ≥ 0.6 m (raking)' },
    { k: 'cOpen', l: 'Coarse screen clear opening', u: 'mm', crit: 'scr.coarseOpen' },
    { k: 'cBar', l: 'Coarse bar size', u: 'mm', note: 'D2: ≈ 25 mm bars; D3 Annex A 10 mm' },
    { k: 'fOpen', l: 'Fine screen clear opening', u: 'mm', crit: 'scr.fineOpen' },
    { k: 'fBar', l: 'Fine screen bar / wire size', u: 'mm' },
    { k: 'fAngle', l: 'Fine screen angle from horizontal', u: '°', note: 'D3: 10–30° to vertical' },
    { k: 'cClog', l: 'Clogging allowance', u: '%' },
    { sec: 'Intake pipe & jack well (D2 §5.3.1)', show: (i) => i.intake.type !== 'wells' },
    { k: 'conduitL', l: 'Intake pipe / conduit length', u: 'm' },
    { k: 'conduitDN', l: 'Intake pipe / conduit diameter', u: 'mm', auto: true, autoVal: (r) => r.intake.cdn, note: 'D2 §5.3.1: 0.6–0.9 m/s; 0 = automatic' },
    { k: 'wellHrt', l: 'Wet-well effective storage', u: 'min', crit: 'well.hrt' },
    { k: 'wellEffDepth', l: 'Effective depth (start–stop)', u: 'm', step: 0.1 },
    { k: 'submergence', l: 'Minimum pump submergence', u: 'm', step: 0.1, note: 'D2: ≥ 1½–2 × suction D' },
    { sec: 'Raw-water pumps (D2 §6)', show: (i) => i.intake.type !== 'wells' },
    { k: 'pumpKind', l: 'Pump type', t: 'sel', o: Object.entries(PUMP_TYPES).map(([k, v]) => [k, v.label]) },
    { k: 'nDuty', l: 'Duty pumps', step: 1 },
    { k: 'nStandby', l: 'Stand-by pumps', step: 1, auto: true, autoVal: (r) => r.intake.pumps?.nStandbyD2, note: 'D2 §6.4.1: reserve ≥ 30 %' },
    { k: 'etaP', l: 'Pump efficiency', step: 0.01, auto: true, autoVal: (r) => r.intake.pumps?.etaP, note: 'D2 Table 6.2' },
    { k: 'etaM', l: 'Motor efficiency', step: 0.01, auto: true, autoVal: (r) => r.intake.pumps?.etaM },
    { k: 'npshr', l: 'NPSH required (manufacturer)', u: 'm', step: 0.1, auto: true, autoVal: (r) => +r.intake.npshr?.toFixed(2) },
    { sec: 'Raw-water rising main (D2 §7)', show: (i) => i.intake.type !== 'wells' },
    { k: 'mainLength', l: 'Rising-main length', u: 'm' },
    { k: 'material', l: 'Pipe material', t: 'sel', o: Object.entries(PIPE_MATERIALS).map(([k, v]) => [k, v.label]) },
    { k: 'dnMode', l: 'Diameter selection', t: 'sel', o: [['econ', 'Least annual cost (D2 §7.3.2)'], ['velocity', 'Velocity ≈ 1.2 m/s']] },
    { k: 'dn', l: 'Rising-main diameter', u: 'mm', auto: true, autoVal: (r) => r.intake.pumps?.dn },
    { k: 'hwC', l: 'Hazen–Williams C', auto: true, autoVal: (r) => +r.intake.pumps?.C.toFixed(0), note: 'D2 Fig 7.6 design value' },
    { k: 'minorK', l: 'Sum of minor-loss coefficients' },
    { k: 'surgeProtect', l: 'Surge protection', t: 'sel', o: [['auto', 'Auto – provide if the pipe class needs it'], ['yes', 'Provided (limit ±30 % H)'], ['no', 'None']] },
    { k: 'wave', l: 'Pressure-wave speed', u: 'm/s', note: 'DI ≈ 1000, uPVC ≈ 350' },
    { k: 'soilBearing', l: 'Soil bearing for thrust blocks', u: 'kPa' },
  ],
  render(r) {
    const ik = r.intake;
    if (ik.type === 'wells') return { overview: [kpis([{ label: 'Production wells', value: ik.nWells, sub: 'incl. one standby', accent: true }]), notes(ik.notes)] };
    const p = ik.pumps;
    return {
      overview: [
        kpis([
          { label: 'Raw-water pumps', value: `${p.nDuty} + ${p.nStandby}`, sub: `${f0(p.Qp * 3600)} m³/h @ ${f1(p.H)} m each`, accent: true, icon: 'gauge' },
          { label: 'Motor rating', value: p.motor, unit: 'kW', sub: `${f1(p.Pshaft / 1000)} kW shaft · η ${f2(p.etaP)} × ${f2(p.etaM)}` },
          { label: 'Rising main', value: 'DN' + p.dn, sub: `${p.spec.matLabel.split(' (')[0]} ${p.spec.cls.cls} · v ${f2(p.v)} m/s · C ${f0(p.C)}` },
          { label: 'Jack well', value: f1(ik.Dw), unit: 'm Ø', sub: `floor ${f2(ik.floor)} m MSL` },
          { label: 'Coarse screen', value: f2(ik.cs.W), unit: 'm wide', sub: `${ik.inputs.cOpen} mm · ${f2(ik.cs.vClear)} m/s` },
          { label: 'NPSH available', value: f1(p.npsha), unit: 'm', sub: `indicative NPSHr ${f1(ik.npshr)} m` },
        ]),
        notes(ik.notes),
        drawingCard(intakeSection(ik), { height: 420 }),
        h('div', { class: 'grid2' },
          card('Screens', kvTable([
            ['Submerged depth at LWL', f2(ik.subDepth), 'm'], ['Coarse screen width', f2(ik.cs.W), 'm'], ['Coarse – bars', ik.cs.nBars, 'nr'], ['Coarse – velocity (clean)', f2(ik.cs.vClear), 'm/s'], ['Coarse – head loss 50 % clogged', fmt(ik.cs.hClog * 1000, 0), 'mm'],
            ['Fine screen width', f2(ik.fs.W), 'm'], ['Fine – velocity (clean)', f2(ik.fs.vClear), 'm/s'], ['Fine – head loss 50 % clogged', fmt(ik.fs.hClog * 1000, 0), 'mm'], ['Ports per level', ik.nPorts, 'nr'],
          ]), { flush: true }),
          card('Pumping system', kvTable([
            ['Design flow', f0(ik.Q * 3600), 'm³/h'], ['Static head', f2(ik.Hs), 'm'], ['Friction loss', f2(p.hf), 'm'], ['Minor losses', f2(p.hm), 'm'], ['Total dynamic head', f2(p.H), 'm'],
            ['Economic diameter (Bresse)', f0(p.Bresse * 1000), 'mm'], ['Surge (instant stop)', f1(p.dH), 'm'], [p.protect ? 'Max. pressure (with surge protection)' : 'Max. pressure (unprotected)', f1(p.pMax), 'm'], ['Energy (design flow)', f0(p.kWhD), 'kWh/d'], ['Specific energy', f2(p.kWperM3 * 1000) + ' ', 'Wh/m³'],
          ]), { flush: true })),
        mainSpecCard(p, 'Raw-water rising main – D2 §7 specification'),
      ],
      visuals: [pumpChart(p, 'Raw-water pump & system curves'), econChart(p, 'Economic diameter – annual cost (D2 §7.3.2)')],
    };
  },
};

// ------------------------------------------------------------------ Aeration
export const aeration = {
  id: 'aeration', title: 'Aeration', sub: 'Cascade or multiple-tray aerator – O₂ transfer, Fe/Mn oxidation, CO₂ stripping', icon: 'wind', group: 'Treatment units', mod: 'aeration',
  enabled: (r) => r.process.has.aeration,
  fields: [
    { sec: 'Aerator' },
    { k: 'type', l: 'Aerator type', t: 'sel', o: [['auto', 'From process selection'], ['cascade', 'Cascade'], ['tray', 'Multiple-tray']] },
    { k: 'waterClass', l: 'Water class (efficiency constant)', t: 'sel', o: [['unpolluted', 'Unpolluted (0.45)'], ['polluted', 'Polluted (0.36)']] },
    { sec: 'Cascade', show: (i, r) => r.aeration?.type === 'cascade' },
    { k: 'nSteps', l: 'Number of steps', step: 1, show: (i, r) => r.aeration?.type === 'cascade' },
    { k: 'stepH', l: 'Step height', u: 'm', crit: 'aer.stepH', step: 0.05, show: (i, r) => r.aeration?.type === 'cascade' },
    { k: 'areaLoading', l: 'Area loading', u: 'm² per m³/h', crit: 'aer.cascadeArea', step: 0.005, show: (i, r) => r.aeration?.type === 'cascade' },
    { k: 'width', l: 'Cascade width', u: 'm', auto: true, autoVal: (r) => r.aeration?.W, show: (i, r) => r.aeration?.type === 'cascade' },
    { k: 'weirLoad', l: 'Overflow rate for auto width', u: 'm³/s per m', step: 0.002, crit: 'aer.weirLoad', show: (i, r) => r.aeration?.type === 'cascade' },
    { sec: 'Tray aerator', show: (i, r) => r.aeration?.type === 'tray' },
    { k: 'nTrays', l: 'Number of trays', step: 1, show: (i, r) => r.aeration?.type === 'tray' },
    { k: 'traySpacing', l: 'Tray spacing', u: 'm', crit: 'aer.traySpacing', step: 0.05, show: (i, r) => r.aeration?.type === 'tray' },
    { k: 'trayLoading', l: 'Tray area loading', u: 'm² per m³/h', crit: 'aer.trayArea', step: 0.01, show: (i, r) => r.aeration?.type === 'tray' },
    { k: 'co2Sat', l: 'Equilibrium CO₂ with air', u: 'mg/L', step: 0.1 },
  ],
  render(r) {
    const ae = r.aeration;
    return {
      overview: [
        kpis([
          { label: 'Aerator', value: ae.type === 'cascade' ? 'Cascade' : 'Multiple tray', sub: `${ae.type === 'cascade' ? ae.inputs.nSteps + ' steps × ' + ae.inputs.stepH + ' m' : ae.inputs.nTrays + ' trays @ ' + ae.inputs.traySpacing + ' m'}`, accent: true, icon: 'wind' },
          { label: 'DO in → out', value: `${f1(ae.C0)} → ${f1(ae.Ce)}`, unit: 'mg/L', sub: `saturation ${f1(ae.Cs)} mg/L` },
          { label: 'Plan area', value: f1(ae.area), unit: 'm²', sub: `${f1(ae.L)} × ${f1(ae.W)} m` },
          { label: 'Fe/Mn O₂ demand', value: f2(ae.o2need), unit: 'mg/L' },
          { label: 'CO₂ in → out', value: `${f1(ae.co20)} → ${f1(ae.co2e)}`, unit: 'mg/L' },
          { label: 'Head required', value: f2(ae.headloss), unit: 'm' },
        ]),
        notes(ae.notes),
        drawingCard(aeratorSection(ae), { height: 340 }),
      ],
      visuals: [chartCard('Dissolved oxygen through the aerator', { type: 'line', data: ae.steps.map((s) => ({ i: s.i, C: s.C })), x: { key: 'i', label: ae.type === 'cascade' ? 'Step number' : 'Tray number' }, y: { label: 'DO (mg/L)', min: 0 }, series: [{ key: 'C', label: 'Dissolved oxygen', marker: true }], refs: [{ value: ae.Cs, label: `Saturation Cs = ${f1(ae.Cs)} mg/L`, kind: 'target' }], unit: 'mg/L', height: 260 }, { sub: 'Cn = Cs − (Cs − C0)(1 − K/n)ⁿ' })],
    };
  },
};

// ------------------------------------------------------------------ Coagulant dosing
export const coag = {
  id: 'coag', title: 'Chemical dosing (coagulation)', sub: 'Coagulant dose, alkalinity & pH, Al solubility, consumption, storage and dosing plant', icon: 'beaker', group: 'Treatment units', mod: 'coag',
  enabled: (r) => r.process.has.coag,
  fields: [
    { sec: 'Coagulant' },
    { k: 'coagulant', l: 'Coagulant', t: 'sel', o: Object.entries(COAGULANTS).map(([k, v]) => [k, v.label]), onChange: () => setInput(['coag', 'priceCoag'], 0, { immediate: true }) },
    { k: 'form', l: 'Supply form', t: 'sel', o: [['solid', 'Solid (bags)'], ['liquid', 'Liquid (bulk tank)']] },
    { k: 'doseMethod', l: 'Dose determination', t: 'sel', o: [['empirical', 'Empirical D = a·Tuᵇ'], ['jar', 'Jar test (scaled by turbidity)'], ['fixed', 'Fixed design dose']] },
    { k: 'empA', l: 'Coefficient a', step: 0.1, show: (i) => i.coag.doseMethod === 'empirical' },
    { k: 'empB', l: 'Exponent b', step: 0.01, show: (i) => i.coag.doseMethod !== 'fixed' },
    { k: 'fixedDose', l: 'Design dose', u: 'mg/L', show: (i) => i.coag.doseMethod === 'fixed' },
    { k: 'jarTurb', l: 'Raw turbidity of jar-test sample', u: 'NTU', show: (i) => i.coag.doseMethod === 'jar' },
    { k: 'jar', t: 'table', l: 'Jar-test results', cols: [{ k: 'dose', l: 'Dose mg/L' }, { k: 'turb', l: 'Residual NTU' }, { k: 'pH', l: 'pH' }], add: { dose: 0, turb: 0, pH: 7 }, show: (i) => i.coag.doseMethod === 'jar' },
    { k: 'minDose', l: 'Minimum dose', u: 'mg/L' },
    { k: 'maxDose', l: 'Maximum dose', u: 'mg/L' },
    { k: 'polymer', l: 'Polyelectrolyte (coagulant aid)', u: 'mg/L', step: 0.05 },
    { sec: 'Alkalinity adjustment' },
    { k: 'phAdjust', l: 'Alkali for coagulation', t: 'sel', o: [['lime', 'Hydrated lime Ca(OH)₂'], ['soda', 'Soda ash Na₂CO₃'], ['none', 'None']] },
    { k: 'resAlk', l: 'Residual alkalinity to maintain', u: 'mg/L CaCO₃', crit: 'coag.resAlk' },
    { k: 'limePurity', l: 'Lime purity', u: '%', show: (i) => i.coag.phAdjust === 'lime' },
    { sec: 'Solution & storage' },
    { k: 'solConc', l: 'Stock solution strength', u: '% w/v', crit: 'coag.solConc', step: 0.5 },
    { k: 'appliedConc', l: 'Strength at the diffuser', u: '%', step: 0.1, note: 'D3 §6.1.3: ≤ 1 % (≥ 0.5 %)' },
    { k: 'batchHours', l: 'Batch period per tank', u: 'h', crit: 'coag.dayTank' },
    { k: 'nTanks', l: 'Number of solution tanks', step: 1 },
    { k: 'tankDepth', l: 'Solution tank depth', u: 'm', step: 0.1 },
    { k: 'storageDays', l: 'Storage period', u: 'days', crit: 'coag.storage' },
    { k: 'bagKg', l: 'Bag size', u: 'kg', show: (i) => i.coag.form === 'solid' },
    { k: 'stackH', l: 'Stacking height', u: 'm', step: 0.1, show: (i) => i.coag.form === 'solid' },
    { sec: 'Powdered activated carbon (D3 §5.2.3)', show: (i, r) => r.process?.pac === 'yes' },
    { k: 'pacDose', l: 'PAC dose', u: 'mg/L', crit: 'pac.dose' },
    { k: 'pacContact', l: 'Contact time before coagulant', u: 'min', crit: 'pac.contact' },
    { k: 'pacSlurry', l: 'Slurry strength', u: '%', step: 0.5 },
    { k: 'pricePac', l: 'PAC price', u: 'LKR/kg', auto: true, autoVal: (r) => r.coag?.inputs.pricePac, note: 'RB 2025 A-CH/02' },
    { sec: 'Unit prices (0 = NWSDB Rate Book 2025, supplier markup incl., VAT excl.)' },
    { k: 'priceCoag', l: 'Coagulant', u: 'LKR/kg', auto: true, autoVal: (r) => r.coag?.inputs.priceCoag, note: (r) => r?.coag?.coag?.priceRef || 'RB 2025 A-CH/01' },
    { k: 'priceLime', l: 'Hydrated lime', u: 'LKR/kg', auto: true, autoVal: (r) => r.coag?.inputs.priceLime, note: 'RB 2025 A-CH/01' },
    { k: 'priceSoda', l: 'Soda ash', u: 'LKR/kg', note: 'Not in the Rate Book – indicative' },
    { k: 'pricePoly', l: 'Polyelectrolyte', u: 'LKR/kg', auto: true, autoVal: (r) => r.coag?.inputs.pricePoly, note: 'RB 2025 A-CH/02 cationic polymer' },
  ],
  render(r) {
    const c = r.coag;
    const monthly = c.monthlyDose.map((D, i) => ({ m: MONTHS[i], D, kg: c.monthlyKg[i] / 1000 }));
    const visuals = [
      chartCard('Monthly coagulant dose', { type: 'bar', data: monthly, x: { key: 'm', label: 'Month' }, y: { label: 'Dose (mg/L)' }, series: [{ key: 'D', label: 'Dose' }], refs: [{ value: c.Davg, label: `Average ${f1(c.Davg)} mg/L`, kind: 'info' }], unit: 'mg/L', height: 240 }, { sub: 'follows the monsoon turbidity profile' }),
      chartCard('Monthly coagulant consumption', { type: 'bar', data: monthly, x: { key: 'm', label: 'Month' }, y: { label: 'Tonnes per month' }, series: [{ key: 'kg', label: 'Consumption', color: 'var(--series-3)' }], unit: 't', height: 240 }, { sub: `annual ${f0(c.annualKg / 1000)} t at operating flow` }),
      chartCard('Aluminium solubility vs pH (amorphous Al(OH)₃)', { type: 'line', data: c.alCurve, x: { key: 'pH', label: 'pH' }, y: { label: 'Dissolved Al (mg/L)', type: 'log', min: 0.005, max: 20 }, series: [{ key: 'al', label: 'Dissolved Al' }], bands: [{ axis: 'x', from: 5.34, to: 6.96, label: 'Lecture optimum 5.34–6.96' }], refs: [{ value: 0.2, label: 'SLS 614 Al 0.2 mg/L' }, { axis: 'x', value: c.pH1, label: `Coagulation pH ${f2(c.pH1)}`, kind: 'info' }], unit: 'mg/L', height: 280 }),
    ];
    if (c.inputs.doseMethod === 'jar' && c.jarRows.length) visuals.unshift(chartCard('Jar test – residual turbidity vs dose', { type: 'line', data: [...c.jarRows].sort((a, b) => a.dose - b.dose), x: { key: 'dose', label: 'Coagulant dose (mg/L)' }, y: { label: 'Residual turbidity (NTU)', min: 0 }, series: [{ key: 'turb', label: 'Residual turbidity', marker: true, smooth: true }], markers: c.jarOpt ? [{ x: c.jarOpt.dose, y: c.jarOpt.turb, label: `Optimum ${c.jarOpt.dose} mg/L` }] : [], unit: 'NTU', height: 260 }));
    return {
      overview: [
        kpis([
          { label: 'Design dose', value: f1(c.Ddes), unit: 'mg/L', sub: `average ${f1(c.Davg)} · min ${f1(c.Dmin)} mg/L`, accent: true, icon: 'beaker' },
          { label: 'Coagulation pH', value: f2(c.pH1), sub: `raw ${f2(c.pH0)} · alk ${f0(c.alk0)} → ${f0(c.alk1)} mg/L`, status: ctxStatus(r, 'coag', 'coag.pH') },
          { label: 'Pre-lime / soda', value: f1(c.limeDose || c.sodaDose), unit: 'mg/L', sub: c.need > 0 ? `${f1(c.need)} mg/L alkalinity added` : 'Natural alkalinity sufficient' },
          { label: 'Max. daily coagulant', value: f0(c.kgDes), unit: 'kg/d', sub: `average ${f0(c.kgAvg)} kg/d` },
          { label: 'Annual coagulant', value: f0(c.annualKg / 1000), unit: 't/yr', sub: `LKR ${fmt(c.costs.coag / 1e6, 1)} Mn/yr` },
          { label: 'Dissolved Al at coag. pH', value: fmt(c.al, 3), unit: 'mg/L', sub: 'SLS 614 ≤ 0.2 mg/L' },
        ]),
        notes(c.notes),
        h('div', { class: 'grid2' },
          card('Dosing plant', kvTable([
            ['Solution strength', c.inputs.solConc, '% w/v'], ['Daily solution volume (max)', f2(c.solDaily), 'm³/d'], ['Solution tanks', `${c.inputs.nTanks} × ${f1(c.tankV)}`, 'm³'], ['Tank plan (square)', `${f2(c.tankSide)} × ${f2(c.tankSide)}`, 'm'],
            ['Dosing pumps', `${c.nDosingPumps - 1} duty + 1 standby`, ''], ['Pump capacity (each)', f0(c.pumpMax), 'L/h'], ['Turndown required', f1(c.turndown), ': 1'], ['Agitator (each)', f2(c.agitatorKw), 'kW'],
          ]), { flush: true }),
          card('Storage & consumption', kvTable([
            ['Storage (peak month)', f0(c.storeKg / 1000), 't'], c.inputs.form === 'solid' ? ['Bags in store', f0(c.bags), `× ${c.inputs.bagKg} kg`] : ['Bulk tank', f1(c.liquidTank), 'm³'],
            ['Store floor area', f0(c.storeArea), 'm²'], ['Lime (pre)', f0(c.limeAnnual / 1000), 't/yr'], ['Polyelectrolyte', f0(c.polyAnnual), 'kg/yr'],
            ['Coagulant cost', fmt(c.costs.coag / 1e6, 2), 'LKR Mn/yr'], ['Lime + soda cost', fmt((c.costs.lime + c.costs.soda) / 1e6, 2), 'LKR Mn/yr'], ['Polymer cost', fmt(c.costs.poly / 1e6, 2), 'LKR Mn/yr'], ...(c.pac ? [['PAC dose / contact', `${c.pac.dose} mg/L · ${f0(c.pac.V)} m³`, ''], ['PAC cost (≈ 50 % of year)', fmt(c.pac.cost / 1e6, 2), 'LKR Mn/yr']] : []),
          ]), { flush: true })),
      ],
      visuals,
    };
  },
};
function ctxStatus(r, mod, key) { return r[mod]?.checks?.find((c) => c.key === key)?.status; }

// ------------------------------------------------------------------ Rapid mix
export const rapidmix = {
  id: 'rapidmix', title: 'Rapid mixing', sub: 'Flash mixing of coagulant – mechanical back-mix or hydraulic jump', icon: 'blend', group: 'Treatment units', mod: 'rapidmix',
  enabled: (r) => r.process.has.rapidmix,
  fields: [
    { k: 'type', l: 'Mixer type', t: 'sel', o: (r) => [['auto', `From process selection (${r.process.rapidMix === 'jump' ? 'hydraulic jump' : 'mechanical'})`], ['mechanical', 'Mechanical flash mixer'], ['jump', 'Hydraulic jump']] },
    { sec: 'Mechanical mixer', show: (i, r) => r.rapidmix.type === 'mechanical' },
    { k: 'G', l: 'Velocity gradient G', u: 's⁻¹', crit: 'rm.G', show: (i, r) => r.rapidmix.type === 'mechanical' },
    { k: 't', l: 'Detention time', u: 's', crit: 'rm.t', show: (i, r) => r.rapidmix.type === 'mechanical' },
    { k: 'nBasins', l: 'Number of basins', step: 1, show: (i, r) => r.rapidmix.type === 'mechanical' },
    { k: 'hRatio', l: 'Depth / side ratio', step: 0.05, show: (i, r) => r.rapidmix.type === 'mechanical' },
    { k: 'impeller', l: 'Impeller', t: 'sel', o: Object.entries(IMPELLERS).map(([k, v]) => [k, `${v.label} (Np ${v.Np})`]), show: (i, r) => r.rapidmix.type === 'mechanical' },
    { k: 'dRatio', l: 'Impeller dia. / tank side', step: 0.05, show: (i, r) => r.rapidmix.type === 'mechanical' },
    { k: 'driveEff', l: 'Drive efficiency', step: 0.05, show: (i, r) => r.rapidmix.type === 'mechanical' },
    { sec: 'Hydraulic jump', show: (i, r) => r.rapidmix.type === 'jump' },
    { k: 'chanWidth', l: 'Channel width', u: 'm', auto: true, autoVal: (r) => r.rapidmix.b, show: (i, r) => r.rapidmix.type === 'jump' },
    { k: 'y1', l: 'Supercritical depth y₁', u: 'm', step: 0.01, auto: true, autoVal: (r) => r.rapidmix.inputs.y1, show: (i, r) => r.rapidmix.type === 'jump' },
    { k: 'jumpLenFactor', l: 'Jump length factor (L = k·y₂)', step: 0.1, show: (i, r) => r.rapidmix.type === 'jump' },
  ],
  render(r) {
    const m = r.rapidmix;
    const k = m.type === 'mechanical'
      ? [{ label: 'Mixer', value: 'Mechanical', sub: `${m.nBasins} × ${f1(m.V)} m³`, accent: true, icon: 'blend' }, { label: 'G × t', value: `${f0(m.Gact)} × ${f0(m.tAct)}`, unit: 's⁻¹·s', sub: `Gt = ${f0(m.Gact * m.tAct)}` }, { label: 'Basin', value: `${f2(m.B)} × ${f2(m.B)} × ${f2(m.H)}`, unit: 'm' }, { label: 'Power to water', value: f2(m.P / 1000), unit: 'kW', sub: `motor ${m.motor} kW` }, { label: 'Impeller', value: f2(m.Di), unit: 'm Ø', sub: `${f0(m.rpm)} rpm · tip ${f2(m.tip)} m/s` }, { label: 'Reynolds number', value: fmtAuto(m.Re), sub: 'turbulent > 10⁴' }]
      : [{ label: 'Mixer', value: 'Hydraulic jump', sub: `channel ${f2(m.b)} m wide`, accent: true, icon: 'blend' }, { label: 'Froude number', value: f2(m.Fr1), sub: 'steady jump 4.5–9', status: ctxStatus(r, 'rapidmix', 'rm.Fr') }, { label: 'Velocity gradient', value: f0(m.Gact), unit: 's⁻¹', sub: `t = ${f2(m.tAct)} s` }, { label: 'Head loss in jump', value: f2(m.hL), unit: 'm', sub: `total incl. weir ${f2(m.headloss)} m` }, { label: 'Depths y₁ → y₂', value: `${f2(m.inputs.y1)} → ${f2(m.y2)}`, unit: 'm' }, { label: 'Jump length', value: f2(m.Lj), unit: 'm' }];
    return { overview: [kpis(k), notes(m.notes), drawingCard(rapidMixDrawing(m), { height: 320 })] };
  },
};

// ------------------------------------------------------------------ Flocculation
export const floc = {
  id: 'floc', title: 'Flocculation', sub: 'Tapered-G hydraulic baffled or mechanical paddle flocculators', icon: 'fan', group: 'Treatment units', mod: 'floc',
  enabled: (r) => r.process.has.floc,
  fields: [
    { k: 'type', l: 'Flocculator type', t: 'sel', o: (r) => [['auto', `From process selection (${r.floc.type})`], ['hbaffle', 'Horizontal baffled (around-the-end)'], ['vbaffle', 'Vertical baffled (over-and-under)'], ['paddle', 'Mechanical paddle (horizontal shaft)']] },
    { sec: 'Stages (tapered flocculation)' },
    { k: 'stages', t: 'table', l: 'Stages', cols: [{ k: 'G', l: 'G (s⁻¹)' }, { k: 't', l: 't (min)' }, { k: 'Gt', l: 'G·t', ro: (row) => fmt(row.G * row.t * 60, 0) }], add: { G: 20, t: 10 }, minRows: 1 },
    { t: 'help', html: 'Lecture notes: G = 20–80 s⁻¹, t = 20–60 min, Gt = 2×10⁴–10⁵; taper G from inlet to outlet (e.g. 50 → 35 → 20 s⁻¹).' },
    { sec: 'Geometry' },
    { k: 'depth', l: 'Water depth', u: 'm', auto: true, autoVal: (r) => r.floc.H, step: 0.1 },
    { k: 'width', l: 'Basin width / channel width', u: 'm', auto: true, autoVal: (r) => r.floc.W, step: 0.1 },
    { k: 'targetSpacing', l: 'Target clear spacing (auto width)', u: 'm', step: 0.05, show: (i, r) => r.floc.type !== 'paddle' },
    { k: 'f', l: 'Baffle friction coefficient f', step: 0.05, show: (i, r) => r.floc.type !== 'paddle' },
    { k: 'baffleT', l: 'Baffle thickness', u: 'm', step: 0.005, show: (i, r) => r.floc.type !== 'paddle' },
    { sec: 'Paddles', show: (i, r) => r.floc.type === 'paddle' },
    { k: 'Cd', l: 'Drag coefficient C_D', step: 0.1, show: (i, r) => r.floc.type === 'paddle' },
    { k: 'kRel', l: 'Relative velocity factor k', step: 0.05, show: (i, r) => r.floc.type === 'paddle' },
    { k: 'areaRatio', l: 'Paddle area / cross-section', u: '%', crit: 'fl.paddleRatio', show: (i, r) => r.floc.type === 'paddle' },
    { k: 'driveEff', l: 'Drive efficiency', step: 0.05, show: (i, r) => r.floc.type === 'paddle' },
  ],
  render(r) {
    const fl = r.floc;
    const stRows = fl.stages.map((s) => ({ ...s }));
    const cols = fl.type === 'paddle'
      ? [{ k: 'i', l: 'Stage' }, { k: 'Gt', l: 'G target', num: true }, { k: 't', l: 't (min)', num: true }, { k: 'V', l: 'Volume m³', num: true }, { k: 'L', l: 'Length m', num: true }, { k: 'P', l: 'Power W', num: true, fmt: f0 }, { k: 'Ap', l: 'Paddle area m²', num: true }, { k: 'rpm', l: 'rpm', num: true }, { k: 'tip', l: 'Tip m/s', num: true }, { k: 'kw', l: 'Motor kW', num: true }]
      : [{ k: 'i', l: 'Stage' }, { k: 'Gt', l: 'G target', num: true }, { k: 'Ga', l: 'G actual', num: true, fmt: f0 }, { k: 't', l: 't (min)', num: true }, { k: 'L', l: 'Length m', num: true }, { k: 'nInt', l: 'Baffles', num: true }, { k: 'sp', l: 'Spacing m', num: true }, { k: 'v', l: 'Velocity m/s', num: true }, { k: 'hl', l: 'hL m', num: true }, { k: 'gap', l: 'Turn gap m', num: true }];
    return {
      overview: [
        kpis([
          { label: 'Flocculator', value: fl.type === 'hbaffle' ? 'Around-the-end' : fl.type === 'vbaffle' ? 'Over-and-under' : 'Paddle', sub: `${fl.nT} trains × ${fl.stages.length} stages`, accent: true, icon: 'fan' },
          { label: 'Detention time', value: fl.ttot, unit: 'min', sub: `${f0(fl.Vtot)} m³ per train` },
          { label: 'Gt', value: fmt(fl.Gt, 0), sub: '2×10⁴ – 10⁵', status: ctxStatus(r, 'floc', 'fl.Gt') },
          fl.type === 'vbaffle' ? { label: 'Channels (per train)', value: `${fl.stages.length} × ${f1(Math.max(...fl.stages.map((s) => s.L)))}`, unit: 'm', sub: `width ${f1(fl.W)} m · depth ${f1(fl.H)} m` } : { label: 'Geometry (per train)', value: `${f1(fl.L)} × ${f1(fl.W)} × ${f1(fl.H)}`, unit: 'm', sub: 'length × width × depth' },
          { label: fl.type === 'paddle' ? 'Drive power (all)' : 'Total head loss', value: fl.type === 'paddle' ? fl.kw : f2(fl.headloss), unit: fl.type === 'paddle' ? 'kW' : 'm' },
        ]),
        notes(fl.notes),
        card('Stage design', table(cols, stRows), { flush: true }),
        drawingCard(flocDrawing(fl), { height: 420 }),
      ],
      visuals: [chartCard('Velocity gradient by stage', { type: 'bar', data: fl.stages.map((s) => ({ s: 'Stage ' + s.i, Gt: s.Gt, Ga: s.Ga })), x: { key: 's', label: 'Stage' }, y: { label: 'G (s⁻¹)', min: 0, max: 90 }, series: [{ key: 'Gt', label: 'Target G' }, { key: 'Ga', label: 'Actual G' }], bands: [{ from: 20, to: 80, label: 'Lecture range 20–80 s⁻¹' }], unit: 's⁻¹', height: 260 })],
    };
  },
};

// ------------------------------------------------------------------ Sedimentation
export const sed = {
  id: 'sed', title: 'Sedimentation', sub: 'Clarifier sizing, hydraulic stability, weirs & launders, settling performance', icon: 'layers', group: 'Treatment units', mod: 'sed',
  enabled: (r) => r.process.has.sed,
  fields: [
    { k: 'type', l: 'Clarifier type', t: 'sel', o: (r) => [['auto', `From process selection (${r.sed.type})`], ['rect', 'Rectangular horizontal-flow'], ['circ', 'Circular radial-flow'], ['tube', 'Rectangular with tube settlers']] },
    { k: 'nTanks', l: 'Number of tanks', step: 1, auto: true, autoVal: (r) => r.sed.N },
    { sec: 'Loading & geometry' },
    { k: 'sor', l: 'Surface overflow rate', u: 'm³/m²·d', crit: 'sed.sor', show: (i, r) => r.sed.type !== 'tube' },
    { k: 'tubeLoad', l: 'Loading on tube area', u: 'm/h', crit: 'tube.loading', step: 0.25, show: (i, r) => r.sed.type === 'tube' },
    { k: 'depth', l: 'Side water depth', u: 'm', crit: 'sed.depth', step: 0.1 },
    { k: 'LW', l: 'Length : width', crit: 'sed.LW', step: 0.5, show: (i, r) => r.sed.type === 'rect' },
    { k: 'sludgeDepth', l: 'Sludge zone depth', u: 'm', step: 0.1 },
    { sec: 'Tube settlers', show: (i, r) => r.sed.type === 'tube' },
    { k: 'tubeD', l: 'Tube size', u: 'm', step: 0.005, show: (i, r) => r.sed.type === 'tube' },
    { k: 'tubeL', l: 'Tube length', u: 'm', step: 0.1, show: (i, r) => r.sed.type === 'tube' },
    { k: 'tubeAngle', l: 'Inclination', u: '°', show: (i, r) => r.sed.type === 'tube' },
    { k: 'coverFrac', l: 'Fraction of area covered', step: 0.05, show: (i, r) => r.sed.type === 'tube' },
    { sec: 'Inlet & outlet' },
    { k: 'portV', l: 'Diffuser-wall port velocity', u: 'm/s', crit: 'sed.portV', step: 0.01 },
    { k: 'portDia', l: 'Port diameter', u: 'm', step: 0.01 },
    { k: 'weirLoad', l: 'Design weir loading', u: 'm³/m·d', crit: 'sed.weir' },
    { k: 'launderLenFrac', l: 'Launder length / tank length', step: 0.05, show: (i, r) => r.sed.type !== 'circ' },
    { k: 'launderWidth', l: 'Launder width', u: 'm', step: 0.05 },
    { sec: 'Settling model' },
    { k: 'v50', l: 'Median floc settling velocity', u: 'm/h', step: 0.1, note: 'LN: medium alum floc 3–5 m/h' },
    { k: 'sigmaG', l: 'Geometric std. deviation', step: 0.1 },
    { k: 'perfFactor', l: 'Non-ideal flow factor', step: 0.05, note: 'short-circuiting & turbulence' },
    { k: 'sp', l: 'Settled-floc specific gravity (scour)', step: 0.01 },
    { k: 'dp', l: 'Settled-floc particle size (scour)', u: 'm', step: 0.0001 },
  ],
  render(r) {
    const s = r.sed;
    const k = s.type === 'circ'
      ? [{ label: 'Clarifiers', value: `${s.N} × Ø${f1(s.D)}`, unit: 'm', accent: true, icon: 'layers' }, { label: 'SOR', value: f1(s.sorAct), unit: 'm³/m²·d' }, { label: 'Detention', value: f2(s.hrt), unit: 'h' }, { label: 'Weir loading', value: f0(s.weirLoadAct), unit: 'm³/m·d' }]
      : [
        { label: 'Tanks', value: `${s.N} × ${f1(s.L)} × ${f1(s.W)}`, unit: 'm', sub: `SWD ${f2(s.H)} m · total depth ${f2(s.totalDepth)} m`, accent: true, icon: 'layers' },
        { label: s.type === 'tube' ? 'SOR (gross area)' : 'Surface overflow rate', value: f1(s.sorAct), unit: 'm³/m²·d', sub: `${f2(s.sorAct / 24)} m/h`, status: ctxStatus(r, 'sed', 'sed.sor') },
        { label: 'Detention time', value: f2(s.hrt), unit: 'h', status: ctxStatus(r, 'sed', 'sed.hrt') },
        { label: 'Horizontal velocity', value: f2(s.vh * 60), unit: 'm/min', sub: `scour ${f2(s.vsc * 60)} m/min` },
        { label: 'Weir loading', value: f0(s.weirLoadAct), unit: 'm³/m·d', sub: `${s.nL} launders × ${f1(s.Llaund)} m` },
        { label: 'Settled turbidity', value: `${f1(s.settledAvg)} / ${f1(s.settledPeak)}`, unit: 'NTU', sub: `avg / monsoon peak · removal ${f1(s.rem.R * 100)} %` },
      ];
    return {
      overview: [kpis(k), notes(s.notes), drawingCard(sedPlan(s), { height: 360 }), drawingCard(sedSection(s), { height: 300 })],
      visuals: [chartCard('Ideal-basin removal & floc settling-velocity distribution', { type: 'line', data: s.curve.map((c) => ({ v: c.v, F: c.F * 100, eta: c.eta * 100 })), x: { key: 'v', label: 'Settling velocity (m/h)', type: 'log', domain: [0.05, 50] }, y: { label: '%', min: 0, max: 100 }, series: [{ key: 'F', label: 'Cumulative fraction with velocity ≤ v' }, { key: 'eta', label: 'Removal η = v / vc', dash: true }], refs: [{ axis: 'x', value: s.vcEff, label: `vc = ${f2(s.vcEff)} m/h`, kind: 'info' }], unit: '%', height: 280 }, { sub: 'lecture: particles with v ≥ vc fully removed; others in ratio v/vc' })],
    };
  },
};

// ------------------------------------------------------------------ Filtration
export const filt = {
  id: 'filt', title: 'Filtration', sub: 'Rapid gravity / slow sand filters – media, head loss, backwash, underdrain, troughs, pipework', icon: 'filter', group: 'Treatment units', mod: 'filt',
  fields: [
    { k: 'type', l: 'Filter type', t: 'sel', o: (r) => [['auto', `From process selection (${r.filt.type})`], ['rsf', 'Rapid gravity sand'], ['dual', 'Dual media (anthracite–sand)'], ['ssf', 'Slow sand']] },
    { k: 'rate', l: 'Filtration rate', u: 'm/h', auto: true, autoVal: (r) => r.filt.rate, step: 0.25 },
    { k: 'nFilters', l: 'Number of filters', step: 1, auto: true, autoVal: (r) => r.filt.N },
    { sec: 'Filter box', show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'layout', l: 'Arrangement', t: 'sel', o: [['twin', 'Twin beds + central gullet'], ['single', 'Single bed + side gullet']], show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'bedRatio', l: 'Bed length / width', step: 0.1, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'waterDepth', l: 'Water depth over media', u: 'm', crit: 'f.water', step: 0.1, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'termHead', l: 'Available terminal head loss', u: 'm', step: 0.1, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'solidsCap', l: 'Solids-holding capacity', u: 'kg/m² per run', step: 0.1, show: (i, r) => r.filt.type !== 'ssf' },
    { sec: 'Sand', show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'sandDepth', l: 'Sand depth', u: 'm', crit: 'f.depth', step: 0.05, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'sandPorosity', l: 'Porosity', step: 0.01, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'sandPsi', l: 'Sphericity', step: 0.05, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'sieve', t: 'table', l: 'Sieve analysis', cols: [{ k: 'size', l: 'Sieve (mm)' }, { k: 'pass', l: '% passing' }], add: { size: 0, pass: 0 }, minRows: 3, show: (i, r) => r.filt.type !== 'ssf',
      extraButtons: (rebuild) => [h('button', { class: 'btn sm ghost', onclick: async () => {
        const es = h('input', { type: 'number', step: '0.01', value: '0.5', class: 'mono', style: { width: '90px' } });
        const uc = h('input', { type: 'number', step: '0.05', value: '1.45', class: 'mono', style: { width: '90px' } });
        const body = h('div', null, h('p', null, 'Synthesise a log-normal gradation for a specified effective size and uniformity coefficient (replaces the sieve table).'), h('div', { class: 'flex' }, 'ES (mm)', es, 'UC', uc));
        const ok = await modal('Generate gradation', body, [{ label: 'Cancel', value: false }, { label: 'Generate', primary: true, value: true }]);
        const e = parseFloat(es.value), u = parseFloat(uc.value);
        if (ok && e > 0 && u > 1) { setInput(['filt', 'sieve'], synthGradation(e, u).reverse(), { immediate: true }); rebuild(); }
      } }, icon('sparkles'), 'Generate from ES/UC')] },
    { k: 'gravel', t: 'table', l: 'Support gravel layers (D3 §5.9.3.5)', cols: [{ k: 'from', l: 'From (mm)' }, { k: 'to', l: 'To (mm)' }, { k: 'depth', l: 'Depth (m)' }], add: { from: 5, to: 10, depth: 0.075 }, minRows: 1, show: (i, r) => r.filt.type !== 'ssf' },
    { sec: 'Anthracite (dual media)', show: (i, r) => r.filt.type === 'dual' },
    { k: 'anthDepth', l: 'Anthracite depth', u: 'm', step: 0.05, show: (i, r) => r.filt.type === 'dual' },
    { k: 'anthES', l: 'Anthracite ES', u: 'mm', step: 0.05, show: (i, r) => r.filt.type === 'dual' },
    { k: 'anthUC', l: 'Anthracite UC', step: 0.05, show: (i, r) => r.filt.type === 'dual' },
    { sec: 'Backwash', show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'bwMethod', l: 'Backwash method', t: 'sel', o: [['airwater', 'Air scour + water wash'], ['water', 'Water only (fluidised)']], show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'bwFactor', l: 'Wash rate factor × Vmf(d₉₀)', step: 0.05, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'bwRate', l: 'Backwash rate', u: 'm/h', auto: true, autoVal: (r) => r.filt.vb * 3600, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'bwMinutes', l: 'Water-wash duration', u: 'min', show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'ftwMinutes', l: 'Filter-to-waste duration', u: 'min', show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'airRate', l: 'Air-scour rate', u: 'm³/m²·h', show: (i) => i.filt.bwMethod === 'airwater' },
    { k: 'airMinutes', l: 'Air-scour duration', u: 'min', show: (i) => i.filt.bwMethod === 'airwater' },
    { k: 'bwSupply', l: 'Wash-water supply', t: 'sel', o: [['pump', 'Backwash pumps from CWR'], ['tank', 'Elevated wash-water tank']], show: (i, r) => r.filt.type !== 'ssf' },
    { sec: 'Underdrain & troughs', show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'orificeDia', l: 'Orifice diameter', u: 'mm', show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'orificeRatio', l: 'Orifice area / bed area', u: '%', crit: 'f.orificeRatio', step: 0.05, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'lateralSpacing', l: 'Lateral spacing', u: 'm', step: 0.05, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'latOrif', l: 'Lateral area / orifice area', crit: 'f.latOrif', step: 0.25, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'manLat', l: 'Manifold area / lateral area', crit: 'f.manLat', step: 0.25, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'troughSpacing', l: 'Trough spacing', u: 'm', crit: 'f.troughSp', step: 0.1, show: (i, r) => r.filt.type !== 'ssf' },
    { k: 'troughWidth', l: 'Trough width', u: 'm', step: 0.05, show: (i, r) => r.filt.type !== 'ssf' },
    { sec: 'Slow sand filter', show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfDepth', l: 'Initial sand depth', u: 'm', crit: 'f.ssfDepth', step: 0.05, show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfMinDepth', l: 'Minimum depth before re-sanding', u: 'm', step: 0.05, show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfES', l: 'Sand ES', u: 'mm', crit: 'f.ssfES', step: 0.01, show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfUC', l: 'Sand UC', step: 0.1, show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfScrape', l: 'Depth scraped per cleaning', u: 'm', step: 0.005, show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfCleanWeeks', l: 'Cleaning interval', u: 'weeks', show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfSupernatant', l: 'Supernatant depth', u: 'm', step: 0.1, show: (i, r) => r.filt.type === 'ssf' },
    { k: 'ssfMaxBed', l: 'Maximum bed area', u: 'm²', show: (i, r) => r.filt.type === 'ssf' },
  ],
  render(r) {
    const f = r.filt;
    if (f.type === 'ssf') {
      return { overview: [kpis([
        { label: 'Slow sand beds', value: `${f.N} × ${f1(f.Af)}`, unit: 'm²', sub: `${f.N - 1} duty + 1 cleaning`, accent: true, icon: 'filter' },
        { label: 'Filtration rate', value: f2(f.rate), unit: 'm/h' }, { label: 'Bed size', value: `${f1(f.Lb)} × ${f1(f.B)}`, unit: 'm' },
        { label: 'Re-sanding interval', value: f1(f.resandYrs), unit: 'years' }, { label: 'Filtered turbidity', value: f2(f.filteredAvg), unit: 'NTU' },
      ]), notes(f.notes), drawingCard(filterPlan(f), { height: 340 })] };
    }
    const g = f.g;
    const sieveRows = [...g.sorted].map((s) => ({ size: s.size, pass: s.pass }));
    return {
      overview: [
        kpis([
          { label: 'Filters', value: `${f.N} × ${f1(f.Af)}`, unit: 'm²', sub: `${f.beds === 2 ? 'twin beds ' : ''}${f1(f.B)} × ${f1(f.Lb)} m · total ${f0(f.N * f.Af)} m²`, accent: true, icon: 'filter' },
          { label: 'Filtration rate', value: f2(f.rate), unit: 'm/h', sub: `one off-line ${f2(f.rateOne)} m/h`, status: ctxStatus(r, 'filt', f.type === 'dual' ? 'f.rateDual' : 'f.rate') },
          { label: 'Sand ES / UC', value: `${f2(g.d10)} / ${f2(g.UC)}`, sub: 'LN: 0.45–0.55 / 1.2–1.7', status: ctxStatus(r, 'filt', 'f.ES') },
          { label: 'Clean-bed head loss', value: fmt(f.h0 * 1000, 0), unit: 'mm', sub: `terminal ${f.inputs.termHead} m` },
          { label: 'Filter run', value: `${f0(Math.min(f.runAvg, 999))} / ${f0(f.runPeak)}`, unit: 'h', sub: `avg / monsoon · UFRV ${f0(f.UFRV)} m³/m²` },
          { label: 'Backwash', value: f1(f.vb * 3600), unit: 'm/h', sub: `expansion ${f0(f.expPct)} % · ${f1(f.bwPct)} % of output` },
          { label: 'Wash pump / blower', value: `${f.bwPumpKw} / ${f.blowerKw || '–'}`, unit: 'kW', sub: `${f0(f.Qbw * 3600)} m³/h @ ${f1(f.tdhBw)} m` },
          { label: 'Filtered turbidity', value: `${f2(f.filteredAvg)} / ${f2(f.filteredPeak)}`, unit: 'NTU', sub: 'avg / peak · SLS 614 ≤ 2' },
        ]),
        notes(f.notes),
        drawingCard(filterPlan(f), { height: 460 }), drawingCard(filterSection(f, r.hyd), { height: 460 }),
        h('div', { class: 'grid2' },
          card('Underdrain & troughs (per bed)', kvTable([
            ['Orifices', `${f.nO} × Ø${f.inputs.orificeDia} mm`, ''], ['Laterals', `${f.nLat} × Ø${f.latDia} mm`, ''], ['Lateral length', f2(f.latLen), 'm'], ['Orifices per lateral', f.oPerLat, ''],
            ['Manifold / channel equiv. dia.', f.manDia, 'mm'], ['Orifice head loss (backwash)', f2(f.hUnderBw), 'm'], ['Wash troughs', `${f.nTr} @ ${f2(f.Lb / f.nTr)} m`, ''], ['Water depth in trough', fmt(f.hTr * 1000, 0), 'mm'], ['Trough lip above media', f2(f.lipAbove), 'm'],
          ]), { flush: true }),
          card('Gallery pipework (per filter)', table([{ k: 'label', l: 'Pipe' }, { k: 'Q', l: 'Flow m³/h', num: true, fmt: (v) => f0(v * 3600) }, { k: 'dn', l: 'DN', num: true }, { k: 'v', l: 'Velocity m/s', num: true }], f.pipes), { flush: true })),
      ],
      visuals: [
        chartCard('Sand gradation curve', { type: 'line', data: sieveRows, x: { key: 'size', label: 'Sieve opening (mm)', type: 'log', domain: [Math.min(...sieveRows.map((s) => s.size)) * 0.9, Math.max(...sieveRows.map((s) => s.size)) * 1.1] }, y: { label: '% passing', min: 0, max: 100 }, series: [{ key: 'pass', label: '% passing', marker: true, smooth: true }], refs: [{ axis: 'x', value: g.d10, label: `d₁₀ = ${f2(g.d10)}`, kind: 'info' }, { axis: 'x', value: g.d60, label: `d₆₀ = ${f2(g.d60)}`, kind: 'info' }], unit: '%', height: 270 }),
        chartCard('Head-loss development over a filter run', { type: 'line', data: f.hlCurve, x: { key: 't', label: 'Time (h)' }, y: { label: 'Head loss (m)', min: 0 }, series: [{ key: 'h', label: 'Head loss' }], refs: [{ value: f.inputs.termHead, label: `Terminal ${f.inputs.termHead} m` }], unit: 'm', height: 260 }),
        chartCard('Bed expansion vs backwash rate', { type: 'line', data: f.expCurve, x: { key: 'vb', label: 'Backwash rate (m/h)' }, y: { label: 'Expansion (%)', min: 0 }, series: [{ key: 'exp', label: 'Expansion' }], bands: [{ from: 20, to: 50, label: 'Target 20–50 %' }], refs: [{ axis: 'x', value: f.vb * 3600, label: `Design ${f1(f.vb * 3600)} m/h`, kind: 'info' }], unit: '%', height: 260 }),
      ],
    };
  },
};

// ------------------------------------------------------------------ Disinfection
export const dis = {
  id: 'dis', title: 'Disinfection', sub: 'Chlorine dose, breakpoint, CT compliance, contact tank, chlorinators and cylinders', icon: 'shield', group: 'Treatment units', mod: 'dis',
  fields: [
    { k: 'agent', l: 'Disinfectant', t: 'sel', o: (r) => [['auto', `From process selection (${AGENTS[r.process.disinfectant]?.label})`], ...Object.entries(AGENTS).map(([k, v]) => [k, v.label])] },
    { sec: 'Dose' },
    { k: 'demand', l: 'Chlorine demand (filtered water)', u: 'mg/L', step: 0.1, note: 'From chlorine-demand test' },
    { k: 'residual', l: 'Free residual leaving plant', u: 'mg/L', crit: 'dis.residual', step: 0.1 },
    { k: 'prechlorDose', l: 'Pre-chlorination dose', u: 'mg/L', step: 0.1, show: (i, r) => r.process.prechlor === 'yes' },
    { k: 'bpRatio', l: 'Breakpoint ratio Cl₂ : NH₃-N', step: 0.5 },
    { sec: 'Contact & CT' },
    { k: 'contactMode', l: 'Contact provided in', t: 'sel', o: [['tank', 'Dedicated serpentine contact tank'], ['cwr', 'Baffled clear-water reservoir']] },
    { k: 'hrt', l: 'Contact tank detention', u: 'min', show: (i) => i.dis.contactMode === 'tank' },
    { k: 'depth', l: 'Contact tank depth', u: 'm', step: 0.1, auto: true, autoVal: (r) => r.dis.inputs.depth, show: (i) => i.dis.contactMode === 'tank' },
    { k: 'chanWidth', l: 'Channel width', u: 'm', step: 0.1, auto: true, autoVal: (r) => r.dis.inputs.chanWidth, show: (i) => i.dis.contactMode === 'tank' },
    { k: 'cwrMinFrac', l: 'CWR volume available at low level', step: 0.05, show: (i) => i.dis.contactMode === 'cwr' },
    { k: 'baffleFactor', l: 'Baffle factor T₁₀/T', auto: true, autoVal: (r) => r.dis.BF, step: 0.05 },
    { k: 'giardiaReq', l: 'Total Giardia removal/inactivation', u: 'log', step: 0.5 },
    { k: 'virusReq', l: 'Total virus removal/inactivation', u: 'log', step: 0.5 },
    { k: 'limeBeforeContact', l: 'Post-lime added before contact tank', t: 'bool', note: 'Higher pH reduces HOCl and raises CT' },
    { sec: 'Supply & storage' },
    { k: 'cylinder', l: 'Cylinder size (gas)', u: 'kg', t: 'sel', numeric: true, o: [[900, '900 kg tonner'], [70, '70 kg cylinder']] },
    { k: 'storageDays', l: 'Storage period', u: 'days' },
    { k: 'price', l: 'Unit price', u: 'LKR/kg', auto: true, autoVal: (r) => r.dis?.price, note: 'RB 2025 A-CH/01: Cl₂ 900 kg 225, 68 kg 544, bleaching powder 153.3 LKR/kg; NaOCl & HTH not in RB (indicative)' },
  ],
  render(r) {
    const d = r.dis;
    return {
      overview: [
        kpis([
          { label: 'Disinfectant', value: d.agent.label.split(' (')[0], sub: `${f2(d.totDose)} mg/L total dose`, accent: true, icon: 'shield' },
          { label: 'Chlorinator', value: d.key === 'gas' ? d.chlorinator : f1(d.kgH), unit: 'kg/h', sub: `${f0(d.kgD)} kg/d max` },
          { label: 'CT provided / required', value: `${f1(d.CTp)} / ${f1(Math.max(d.CTg, d.CTv))}`, unit: 'mg·min/L', sub: `ratio ${f2(d.ratio)}`, status: ctxStatus(r, 'dis', 'dis.ctRatio') },
          { label: 'Contact', value: f0(d.V), unit: 'm³', sub: `T₁₀ ${f1(d.T10)} min (BF ${d.BF})` },
          { label: 'pH at contact · HOCl', value: f2(d.pHc), sub: `${f0(d.hocl * 100)} % as HOCl` },
          d.key === 'gas' ? { label: 'Cylinders / month', value: f1(d.cylPerMonth), sub: `${d.inputs.cylinder} kg · ${d.storeUnits} in store` } : { label: 'Product use', value: f0(d.productKgD), unit: 'kg/d' },
        ]),
        notes(d.notes),
        d.footprint ? drawingCard(contactPlan(d), { height: 440 }) : null,
      ],
      visuals: [
        chartCard('Log inactivation vs contact time', { type: 'line', data: d.killCurve.map((k) => ({ t: k.t, g: k.logG, v: Math.min(k.logV, 6) })), x: { key: 't', label: 'Effective contact time (min)' }, y: { label: 'Log inactivation', min: 0 }, series: [{ key: 'g', label: 'Giardia' }, { key: 'v', label: 'Viruses (capped at 6)' }], refs: [{ value: d.needG, label: `Giardia required ${d.needG} log`, kind: 'target' }, { axis: 'x', value: d.T10, label: `T₁₀ = ${f1(d.T10)} min`, kind: 'info' }], unit: 'log', height: 260 }, { sub: 'linear CT model (Chick–Watson, n = 1)' }),
        chartCard('Free chlorine speciation vs pH', { type: 'line', data: d.phCurve, x: { key: 'pH', label: 'pH' }, y: { label: '% as HOCl', min: 0, max: 100 }, series: [{ key: 'f', label: 'HOCl fraction' }], refs: [{ axis: 'x', value: d.pHc, label: `Contact pH ${f2(d.pHc)}`, kind: 'info' }], unit: '%', height: 250 }, { sub: 'lecture: HOCl is the stronger disinfectant – keep pH ≤ 7' }),
        d.bpCurve.length ? chartCard('Breakpoint chlorination curve (schematic)', { type: 'line', data: d.bpCurve, x: { key: 'x', label: 'Applied chlorine (mg/L)' }, y: { label: 'Residual (mg/L)', min: 0 }, series: [{ key: 'r', label: 'Measured residual' }], refs: [{ axis: 'x', value: 0.3 + 7.6 * d.cd.nh3n, label: 'Breakpoint', kind: 'info' }], unit: 'mg/L', height: 250 }) : null,
      ],
    };
  },
};

// ------------------------------------------------------------------ Stabilisation
export const stab = {
  id: 'stab', title: 'pH correction & stabilisation', sub: 'Carbonate equilibrium, Langelier & Ryznar indices, post-lime dose', icon: 'scale', group: 'Treatment units', mod: 'stab',
  fields: [
    { k: 'target', l: 'Stabilisation target', t: 'sel', o: [['LSI', 'Langelier index'], ['pH', 'Final pH']] },
    { k: 'targetLSI', l: 'Target LSI', step: 0.1, show: (i) => i.stab.target === 'LSI', crit: 'stab.LSI' },
    { k: 'targetPH', l: 'Target pH', step: 0.1, show: (i) => i.stab.target === 'pH', crit: 'stab.pH' },
    { k: 'limePurity', l: 'Lime purity', u: '%' },
    { k: 'maxLime', l: 'Maximum lime dose', u: 'mg/L' },
    { k: 'price', l: 'Lime price', u: 'LKR/kg', auto: true, autoVal: (r) => (r.stab?.annualKg ? r.stab.cost / r.stab.annualKg : 72), note: 'RB 2025 A-CH/01: 72 LKR/kg' },
    { k: 'storageDays', l: 'Storage period', u: 'days' },
  ],
  render(r) {
    const s = r.stab;
    return {
      overview: [
        kpis([
          { label: 'Post-lime dose', value: f1(s.lime), unit: 'mg/L', sub: s.apply ? `${f0(s.kgD)} kg/d max` : 'Not required', accent: true, icon: 'scale' },
          { label: 'pH', value: `${f2(s.pH1)} → ${f2(s.pHafterCl)} → ${f2(s.pHfinal)}`, sub: 'after coag. → after Cl₂ → final' },
          { label: 'Langelier index (final)', value: f2(s.final.LSI), sub: s.lsiText, status: ctxStatus(r, 'stab', 'stab.LSI') },
          { label: 'Ryznar index', value: f2(s.final.RSI), sub: '6.5–7 ≈ balanced' },
          { label: 'Final alkalinity', value: f0(s.final.alkF), unit: 'mg/L CaCO₃' },
          { label: 'Annual lime', value: f0(s.annualKg / 1000), unit: 't/yr', sub: `LKR ${fmt(s.cost / 1e6, 1)} Mn/yr` },
        ]),
        notes(s.notes),
      ],
      visuals: [
        chartCard('Langelier index vs post-lime dose', { type: 'line', data: s.curve, x: { key: 'L', label: 'Lime dose (mg/L)' }, y: { label: 'LSI', zero: false }, series: [{ key: 'LSI', label: 'LSI' }], bands: [{ from: -0.5, to: 0.5, label: 'Balanced ±0.5' }], refs: [{ axis: 'x', value: s.lime, label: `Design ${f1(s.lime)} mg/L`, kind: 'info' }], height: 260 }),
        chartCard('pH vs post-lime dose', { type: 'line', data: s.curve, x: { key: 'L', label: 'Lime dose (mg/L)' }, y: { label: 'pH', zero: false }, series: [{ key: 'pH', label: 'pH', color: 'var(--series-3)' }], refs: [{ value: 8.5, label: 'SLS 614 max 8.5' }, { value: 6.5, label: 'SLS 614 min 6.5' }], height: 260 }),
      ],
    };
  },
};
export { getInput, store };
