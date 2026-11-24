// Pages added in v1.6: special treatment (iron / manganese, fluoride), chemical & chlorination buildings,
// structural pre-design
import { fmt } from '../../core/util.js';
import { DEFLUOR, OXIDANTS, SLS } from '../../engine/special.js';
import { fromDesign } from '../../engine/assess.js';
import { h, icon, toast } from '../dom.js';
import { card, chartCard, kpis, kvTable, notes, statusBadge, structureCard, table } from '../results.js';
import { setInput, store } from '../store.js';

const f0 = (v) => fmt(v, 0),
  f1 = (v) => fmt(v, 1),
  f2 = (v) => fmt(v, 2);

// ------------------------------------------------------------------ Special treatment
export const special = {
  id: 'special',
  title: 'Iron, manganese & fluoride',
  sub: 'Special treatment when the raw water exceeds SLS 614 for iron, manganese or fluoride',
  icon: 'pipette',
  group: 'Treatment units',
  mod: 'special',
  enabled: (r) => !!r.special?.enabled,
  fields: [
    { sec: 'Iron & manganese (D3 §7.1)' },
    {
      k: 'feMnOxidant',
      l: 'Oxidant',
      t: 'sel',
      o: (r) => [
        ['auto', `Auto (${r.special?.feMn?.label || 'not required'})`],
        ...Object.entries(OXIDANTS).map(([k, v]) => [k, v.label]),
      ],
      note: 'D3: aeration oxidises Fe at pH 7–8, Mn only above pH 9.5',
    },
    { k: 'detention', l: 'Detention before filtration', u: 'min', note: 'D3 §7.1.5.1: ≥ 20 min' },
    { k: 'feTarget', l: 'Target iron', u: 'mg/L', step: 0.05, note: `SLS 614: ${SLS.fe} mg/L` },
    { k: 'mnTarget', l: 'Target manganese', u: 'mg/L', step: 0.01, note: `SLS 614: ${SLS.mn} mg/L` },
    { sec: 'Fluoride (D3 §7.2)' },
    {
      k: 'fMethod',
      l: 'Removal method',
      t: 'sel',
      o: (r) => [
        ['auto', `Auto (${r.special?.fluoride?.label || 'not required'})`],
        ...Object.entries(DEFLUOR).map(([k, v]) => [k, v.label]),
      ],
      note: 'D3 Table 7-4',
    },
    {
      k: 'fTarget',
      l: 'Target fluoride',
      u: 'mg/L',
      step: 0.1,
      auto: true,
      autoVal: (r) => r.special?.fluoride?.target,
      note: 'D3 Table 7-3 by temperature; SLS 614: 1.0',
    },
    {
      k: 'aaRunDays',
      l: 'Days between regenerations',
      u: 'd',
      note: 'Practice value – D3 gives none',
      show: (i, r) => ['alumina', 'bonechar'].includes(r.special?.fluoride?.method),
    },
    {
      k: 'aaEBCT',
      l: 'Empty-bed contact time',
      u: 'min',
      note: 'Practice value – D3 gives none',
      show: (i, r) => ['alumina', 'bonechar'].includes(r.special?.fluoride?.method),
    },
    {
      k: 'aaDepth',
      l: 'Bed depth',
      u: 'm',
      step: 0.1,
      show: (i, r) => ['alumina', 'bonechar'].includes(r.special?.fluoride?.method),
    },
  ],
  render(r) {
    const s = r.special,
      fm = s.feMn,
      fl = s.fluoride;
    const st = (v, lim) => (v > lim ? 'warn' : 'ok');
    return {
      overview: [
        kpis(
          [
            {
              label: 'Raw iron',
              value: f2(s.fe),
              unit: 'mg/L',
              sub: `SLS 614: ${SLS.fe}`,
              status: st(s.fe, SLS.fe),
              accent: true,
              icon: 'pipette',
            },
            {
              label: 'Raw manganese',
              value: f2(s.mn),
              unit: 'mg/L',
              sub: `SLS 614: ${SLS.mn}`,
              status: st(s.mn, SLS.mn),
            },
            { label: 'Raw fluoride', value: f2(s.f), unit: 'mg/L', sub: `SLS 614: ${SLS.f}`, status: st(s.f, SLS.f) },
            fm
              ? {
                  label: 'Oxidant',
                  value: fm.label,
                  sub: fm.kgD > 0 ? `${f1(fm.dose)} mg/L · ${f0(fm.kgD)} kg/d` : 'by the aerator',
                }
              : null,
            fl
              ? {
                  label: 'Fluoride removal',
                  value: fl.label.split(' (')[0],
                  sub: `${f0(fl.x * 100)} % of the flow treated → ${f1(fl.target)} mg/L`,
                }
              : null,
            s.annualCost > 0
              ? { label: 'Chemical cost', value: `LKR ${fmt(s.annualCost / 1e6, 1)} Mn`, sub: 'per year' }
              : null,
          ].filter(Boolean),
        ),
        notes(
          s.enabled
            ? s.notes
            : [
                {
                  level: 'ok',
                  title: 'Not required',
                  text: `Iron ${s.fe}, manganese ${s.mn} and fluoride ${s.f} mg/L are within SLS 614:2013 – no special treatment stage is needed. Enter the raw-water values on the Raw water quality page.`,
                },
                ...(s.notes || []),
              ],
        ),
        fm
          ? card(
              'Iron & manganese removal',
              kvTable([
                ['Iron to remove', f2(fm.dFe), 'mg/L'],
                ['Manganese to remove', f2(fm.dMn), 'mg/L'],
                ['Oxidant', fm.label, ''],
                ['Dose', f2(fm.dose), 'mg/L'],
                ['Oxidant feed', f0(fm.kgD), 'kg/d'],
                ['Detention volume before filtration', f0(fm.V), 'm³'],
                ['Solids produced', f0(fm.solids), 'kg/d'],
                fm.alkUsed ? ['Alkalinity consumed', f1(fm.alkUsed), 'mg/L CaCO₃'] : null,
              ]),
              { flush: true, sub: 'NWSDB D3 §7.1, Tables 6-8 and 7-1' },
            )
          : null,
        fl
          ? card(
              'Fluoride removal',
              kvTable([
                ['Method', fl.label, ''],
                ['Target after blending', f1(fl.target), 'mg/L'],
                ['Share of the flow treated', f0(fl.x * 100), '%'],
                ['Flow through the stage', f0(fl.Qt), 'm³/d'],
                fl.alum ? ['Alum dose', f0(fl.alum), 'mg/L'] : null,
                fl.lime ? ['Lime dose', f0(fl.lime), 'mg/L'] : null,
                fl.Vbed ? ['Bed volume', f1(fl.Vbed), 'm³'] : null,
                fl.nB ? ['Contactors', `${fl.nB - 1} duty + 1 regenerating, Ø ${f1(fl.D1)} m`, ''] : null,
                ['Water lost', fl.loss, '%'],
              ]),
              { flush: true, sub: 'NWSDB D3 §7.2, Tables 7-3 and 7-4' },
            )
          : null,
      ],
    };
  },
};

// ------------------------------------------------------------------ Chemical & chlorination buildings
export const buildings = {
  id: 'buildings',
  title: 'Chemical & chlorine buildings',
  sub: 'Chemical house (storage, solution tanks, dosing, bund, lime) and chlorination building (containers, chlorinators, ventilation, neutralisation)',
  icon: 'building',
  group: 'Plant-wide',
  mod: 'buildings',
  fields: [
    { sec: 'Chemical house (D3 §6.1)' },
    { k: 'stockPct', l: 'Stock solution strength', u: '%', note: 'D3 §6.1.2: 10 % (2–10 %)' },
    { k: 'applyPct', l: 'Strength at the dosing point', u: '%', step: 0.1, note: 'D3 §6.1.3: about 1 % (≥ 0.5 %)' },
    { k: 'bundPct', l: 'Bund capacity', u: '% of largest tank', note: '≥ 110 %' },
    {
      k: 'limeFeed',
      l: 'Post-lime feeding',
      t: 'sel',
      o: (r) => [
        ['auto', `Auto (${r.buildings?.chem?.lime?.feed || '–'})`],
        ['slurry', 'Lime slurry (50–100 g/L)'],
        ['saturator', 'Lime water from static saturators'],
      ],
    },
    { k: 'limeSlurry', l: 'Lime slurry strength', u: 'g/L', note: 'D3 §6.1.6: 50–100 g/L' },
    { k: 'satRate', l: 'Saturator loading', u: 'kg/h·m²', step: 0.05, note: 'D3 §6.1.6: 1.3–1.6' },
    { k: 'limeStack', l: 'Bag stacking height', u: 'm', step: 0.1 },
    { k: 'storeyH', l: 'Clear height', u: 'm', step: 0.5, note: 'D3 Table 6-1: 4–8 m' },
    { k: 'officeArea', l: "Operator's room", u: 'm²' },
    { sec: 'Chlorination building (D3 §6.4–6.5)' },
    { k: 'aisle', l: 'Storage factor for aisles & handling', step: 0.1 },
    { k: 'naohPct', l: 'Caustic strength for neutralisation', u: '%', note: 'D3 §6.5.3: 20 %' },
    { k: 'chlorH', l: 'Clear height of chlorine rooms', u: 'm', step: 0.5 },
  ],
  render(r) {
    const b = r.buildings,
      c = b.chem,
      cl = b.chlor,
      g = b.chlorGas;
    const rooms = (x) =>
      table(
        [
          { k: 'name', l: 'Room' },
          { k: 'area', l: 'Area needed (m²)', num: true, fmt: f1 },
          { k: 'w', l: 'Width (m)', num: true, fmt: f1 },
          { k: 'note', l: 'Contents' },
        ],
        x.rooms,
        { totals: { area: x.rooms.reduce((a, q) => a + q.area, 0) } },
      );
    return {
      overview: [
        kpis(
          [
            c
              ? {
                  label: 'Chemical house',
                  value: `${f1(c.L)} × ${f1(c.W)}`,
                  unit: 'm',
                  sub: `${f0(c.area)} m² · ${f1(c.H)} m clear height`,
                  accent: true,
                  icon: 'building',
                }
              : null,
            c?.nTanks
              ? {
                  label: 'Solution tanks',
                  value: `${c.nTanks} × ${f1(c.tankV)}`,
                  unit: 'm³',
                  sub: `bund ${f1(c.bundV)} m³ · ${f2(c.bundH)} m wall`,
                }
              : null,
            c?.nPumps
              ? {
                  label: 'Dosing pumps',
                  value: c.nPumps,
                  sub: `${f0(c.pumpLh)} L/h each · carrier water ${f0(c.dilLh)} L/h per stream`,
                }
              : null,
            c?.lime
              ? {
                  label: 'Lime',
                  value: f0(c.lime.kgD),
                  unit: 'kg/d',
                  sub:
                    c.lime.feed === 'saturator'
                      ? `2 saturators Ø ${f1(c.lime.satD)} m`
                      : `slurry ${f1(c.lime.slurryM3)} m³/d`,
                }
              : null,
            cl
              ? {
                  label: 'Chlorination building',
                  value: `${f1(cl.L)} × ${f1(cl.W)}`,
                  unit: 'm',
                  sub: `${f0(cl.area)} m²`,
                }
              : null,
            g
              ? {
                  label: g.drum ? 'Chlorine drums' : 'Chlorine cylinders',
                  value: `${g.onLine} + ${g.onLine}`,
                  sub: `duty + standby connected · ${g.nStore} in store`,
                }
              : null,
            g
              ? { label: 'Ventilation', value: f0(g.fan), unit: 'm³/h', sub: `neutralisation ${f0(g.naoh)} kg NaOH` }
              : null,
          ].filter(Boolean),
        ),
        notes(b.notes),
        structureCard(r, 'chem', { height: 440 }),
        structureCard(r, 'chlor', { height: 400 }),
        c ? card('Chemical house – rooms', rooms(c), { flush: true, sub: c.lime ? c.lime.handling : '' }) : null,
        cl ? card('Chlorination building – rooms', rooms(cl), { flush: true }) : null,
      ],
    };
  },
};

// ------------------------------------------------------------------ Structural pre-design
export const structure = {
  id: 'structure',
  title: 'Structures (pre-design)',
  sub: 'Wall and base thickness, reinforcement, concrete and steel quantities, flotation of empty tanks – preliminary, for quantities and drawings',
  icon: 'hammer',
  group: 'Plant-wide',
  mod: 'structure',
  fields: [
    { sec: 'Materials' },
    { k: 'fcu', l: 'Concrete grade (fcu)', u: 'N/mm²', note: 'Water-retaining grade 35A; D2 (1989) minimum 25' },
    { k: 'fy', l: 'Reinforcement yield strength', u: 'N/mm²', note: 'High-yield deformed bars' },
    { k: 'cover', l: 'Cover', u: 'mm' },
    { sec: 'Design rules' },
    {
      k: 'fsAllow',
      l: 'Service steel stress (0.2 mm cracks)',
      u: 'N/mm²',
      note: 'BS 8007 practice: 130 for deformed bars',
    },
    {
      k: 'minSteelPct',
      l: 'Minimum steel, each face',
      u: '%',
      step: 0.05,
      note: 'BS 8007: 0.35 % of the surface zone',
    },
    { k: 'gammaF', l: 'Load factor on water pressure', step: 0.1 },
    { k: 'minWall', l: 'Minimum wall thickness', u: 'm', step: 0.05 },
    { k: 'lapPct', l: 'Allowance for laps & starters', u: '%' },
    {
      t: 'help',
      html: 'The NWSDB manuals give only general structural rules (D2 §6.3 flotation, D3 §9.2.9), so this page follows usual water-retaining concrete practice (BS 8110 / BS 8007). It is a preliminary estimate – the final design is by a structural engineer.',
    },
  ],
  render(r) {
    const s = r.structure;
    const rows = s.list.map((x) => ({
      name: x.name,
      n: x.n,
      h: x.h,
      t: x.wall.t * 1000,
      bars: x.wall.bars ? `T${x.wall.bars.dia} @ ${x.wall.bars.s}` : '–',
      min: `T${x.wall.minBars.dia} @ ${x.wall.minBars.s}`,
      tb: x.tb * 1000,
      vol: x.vol,
      kg: x.kg / 1000,
      fos: x.fos === null ? '–' : x.fos >= 99 ? 'no uplift' : f2(x.fos),
    }));
    return {
      overview: [
        kpis([
          {
            label: 'Structural concrete',
            value: f0(s.conc),
            unit: 'm³',
            sub: 'process structures',
            accent: true,
            icon: 'hammer',
          },
          { label: 'Reinforcement', value: f0(s.steel / 1000), unit: 't', sub: `${f0(s.kgM3)} kg/m³ average` },
          { label: 'Thickest wall', value: f0(Math.max(0, ...s.list.map((x) => x.wall.t * 1000))), unit: 'mm' },
          { label: 'Groundwater level', value: f2(s.gwl), unit: 'm MSL', sub: `ground ${f2(s.GL)} m MSL` },
        ]),
        notes(s.notes),
        card(
          'Walls, bases and quantities',
          table(
            [
              { k: 'name', l: 'Structure' },
              { k: 'n', l: 'Units', num: true },
              { k: 'h', l: 'Wall height (m)', num: true, fmt: f2 },
              { k: 't', l: 'Wall (mm)', num: true, fmt: f0 },
              { k: 'bars', l: 'Vertical bars, water face' },
              { k: 'min', l: 'Other bars' },
              { k: 'tb', l: 'Base (mm)', num: true, fmt: f0 },
              { k: 'vol', l: 'Concrete (m³)', num: true, fmt: f0 },
              { k: 'kg', l: 'Steel (t)', num: true, fmt: f1 },
              { k: 'fos', l: 'Flotation FoS (empty)', num: true },
            ],
            rows,
            { totals: { vol: s.conc, kg: s.steel / 1000 } },
          ),
          {
            flush: true,
            sub: 'The bill of quantities uses this average steel content unless a value is entered on the Cost estimate page',
          },
        ),
        structureCard(r, 'rebar', { height: 460, title: 'Typical wall and base reinforcement (preliminary)' }),
      ],
    };
  },
};

// ------------------------------------------------------------------ Existing-plant assessment
const on = (i) => !!i.assess?.enabled;
const copyDesign = () => {
  const cur = store.project.inputs.assess || {};
  setInput(['assess'], { ...cur, enabled: true, ...fromDesign(store.results) }, { immediate: true });
  toast('Existing-plant data filled from the current design – now edit it to the real plant');
};
export const assess = {
  id: 'assess',
  title: 'Existing plant assessment',
  sub: 'Enter the sizes of an existing plant and its flows: capacity of every unit against the design criteria, the bottleneck, and what to upgrade for a target flow',
  icon: 'target',
  group: 'Operation & maintenance',
  mod: 'assess',
  fields: [
    { k: 'enabled', l: 'Assess an existing plant', t: 'bool' },
    {
      t: 'help',
      html: 'Enter what is built, not what this project designs. Raw-water quality, doses and criteria are taken from the other pages. Leave a size at 0 to leave that unit out of the rating.',
    },
    {
      t: 'custom',
      render: () => h('button', { class: 'btn', onclick: copyDesign }, icon('copy'), 'Fill from the current design'),
    },
    { sec: 'Flows', show: on },
    {
      k: 'qNow',
      l: 'Present average production',
      u: 'm³/d',
      auto: true,
      autoVal: (r) => r.assess?.qNow,
      note: '0 = 80 % of the target',
    },
    {
      k: 'qPeak',
      l: 'Present peak-day throughput',
      u: 'm³/d',
      auto: true,
      autoVal: (r) => r.assess?.qPeak,
      note: '0 = 1.15 × average',
    },
    {
      k: 'qTarget',
      l: 'Target flow',
      u: 'm³/d',
      auto: true,
      autoVal: (r) => r.assess?.qTarget,
      note: '0 = design capacity from the Demand page',
    },
    { sec: 'Flocculators', show: on },
    { k: 'flN', l: 'Number of basins', step: 1 },
    { k: 'flL', l: 'Length', u: 'm' },
    { k: 'flW', l: 'Width', u: 'm' },
    { k: 'flH', l: 'Water depth', u: 'm', step: 0.1 },
    { sec: 'Sedimentation', show: on },
    {
      k: 'sdType',
      l: 'Type',
      t: 'sel',
      o: [
        ['rect', 'Rectangular'],
        ['circ', 'Circular'],
      ],
    },
    { k: 'sdN', l: 'Number of tanks', step: 1 },
    { k: 'sdL', l: 'Length', u: 'm', show: (i) => i.assess.sdType !== 'circ' },
    { k: 'sdW', l: 'Width', u: 'm', show: (i) => i.assess.sdType !== 'circ' },
    { k: 'sdD', l: 'Diameter', u: 'm', show: (i) => i.assess.sdType === 'circ' },
    { k: 'sdH', l: 'Side water depth', u: 'm', step: 0.1 },
    { k: 'sdWeir', l: 'Total outlet weir length', u: 'm', note: '0 = not rated (circular: periphery)' },
    { k: 'sdTubes', l: 'Tube settlers fitted', t: 'bool', show: (i) => i.assess.sdType !== 'circ' },
    {
      k: 'sdTubeCover',
      l: 'Area covered by tubes',
      u: '%',
      show: (i) => i.assess.sdType !== 'circ' && i.assess.sdTubes,
    },
    { sec: 'Filters', show: on },
    {
      k: 'ftType',
      l: 'Type',
      t: 'sel',
      o: [
        ['rsf', 'Rapid gravity – sand'],
        ['dual', 'Rapid gravity – dual media'],
        ['ssf', 'Slow sand'],
      ],
    },
    { k: 'ftN', l: 'Number of filters', step: 1 },
    { k: 'ftL', l: 'Bed length', u: 'm' },
    { k: 'ftW', l: 'Bed width (total per filter)', u: 'm' },
    { sec: 'Disinfection and storage', show: on },
    { k: 'ctV', l: 'Contact tank volume', u: 'm³' },
    { k: 'ctBF', l: 'Baffle factor T₁₀/T', step: 0.1, note: 'D3 Table 6-2: 0.1 unbaffled … 0.7 serpentine' },
    { k: 'cwrV', l: 'Clear-water reservoir volume', u: 'm³' },
    { sec: 'Chemical feed', show: on },
    { k: 'coagPumps', l: 'Coagulant dosing pumps on duty', step: 1 },
    { k: 'coagLh', l: 'Capacity of each pump', u: 'L/h' },
    { k: 'coagPct', l: 'Solution strength', u: '%' },
    {
      k: 'coagDose',
      l: 'Peak coagulant dose',
      u: 'mg/L',
      auto: true,
      autoVal: (r) => r.coag?.Ddes,
      note: '0 = design dose of this project',
    },
    { k: 'clKgH', l: 'Duty chlorinator capacity', u: 'kg/h' },
    {
      k: 'clDose',
      l: 'Chlorine dose',
      u: 'mg/L',
      auto: true,
      autoVal: (r) => r.dis?.totDose,
      note: '0 = dose of this project',
    },
    { sec: 'Pumping (duty pumps only)', show: on },
    { k: 'rawPumps', l: 'Raw-water duty pumps', step: 1 },
    { k: 'rawQ', l: 'Flow of each', u: 'm³/h' },
    { k: 'twPumps', l: 'Treated-water duty pumps', step: 1 },
    { k: 'twQ', l: 'Flow of each', u: 'm³/h' },
  ],
  render(r) {
    const a = r.assess;
    if (!a?.enabled)
      return {
        overview: [
          notes([
            {
              level: 'info',
              title: 'Existing plant assessment is off',
              text: 'Switch on "Assess an existing plant" and enter the sizes of the units that are built. "Fill from the current design" copies this project\'s design as a starting point, which you then change to the real plant. The page then shows the capacity of every unit against the NWSDB D3 criteria, the bottleneck and the upgrades needed for a target flow.',
            },
          ]),
        ],
      };
    const data = [...a.units].sort((x, y) => x.cap - y.cap).map((u) => ({ g: u.name, v: u.cap / 1000 }));
    const st = a.plantCap < a.qPeak ? 'fail' : a.plantCap < a.qTarget ? 'warn' : 'ok';
    return {
      overview: [
        kpis([
          {
            label: 'Present plant capacity',
            value: f0(a.plantCap),
            unit: 'm³/d',
            sub: `limited by ${a.bottleneck.toLowerCase()}`,
            accent: true,
            icon: 'target',
            status: st,
          },
          {
            label: 'Present peak flow',
            value: f0(a.qPeak),
            unit: 'm³/d',
            sub: a.headroom >= 0 ? `head-room ${f0(a.headroom)} m³/d` : `overloaded by ${f0(-a.headroom)} m³/d`,
            status: a.headroom >= 0 ? 'ok' : 'fail',
          },
          {
            label: 'Target flow',
            value: f0(a.qTarget),
            unit: 'm³/d',
            sub: a.shortfall > 0 ? `shortfall ${f0(a.shortfall)} m³/d` : 'can be met now',
            status: a.shortfall > 0 ? 'warn' : 'ok',
          },
          { label: 'Units to upgrade', value: a.path.length, sub: `of ${a.units.filter((u) => u.hard).length} rated` },
        ]),
        notes(a.notes),
        card(
          'Capacity of each unit',
          table(
            [
              { k: 'status', l: '', v: (u) => statusBadge(u.status, true) },
              { k: 'name', l: 'Unit' },
              { k: 'param', l: 'Governing criterion' },
              { k: 'atPeak', l: 'At present peak', num: true, fmt: (v, u) => `${f2(v)} ${u.unit}` },
              { k: 'atTarget', l: 'At target', num: true, fmt: (v, u) => `${f2(v)} ${u.unit}` },
              { k: 'limit', l: 'D3 limit' },
              { k: 'cap', l: 'Capacity (m³/d)', num: true, fmt: f0 },
              { k: 'util', l: 'Used at peak', num: true, fmt: (v) => f0(v) + ' %' },
              { k: 'action', l: 'To reach the target', v: (u) => h('span', { class: 'small' }, u.action) },
            ],
            a.units,
          ),
          {
            flush: true,
            sub: 'red = overloaded at the present peak · amber = adequate now but not for the target · the clear-water reservoir is advisory',
          },
        ),
        a.path.length
          ? card(
              'Upgrade path to the target flow',
              table(
                [
                  { k: 'step', l: 'Step' },
                  { k: 'unit', l: 'Unit limiting the plant' },
                  { k: 'capNow', l: 'Its capacity (m³/d)', num: true, fmt: f0 },
                  { k: 'action', l: 'Upgrade' },
                  { k: 'after', l: 'Plant capacity after this step (m³/d)', num: true, fmt: f0 },
                ],
                a.path,
              ),
              { flush: true, sub: 'units are relieved in the order in which they limit the plant' },
            )
          : null,
      ],
      visuals: [
        chartCard(
          'Unit capacities (thousand m³/d)',
          {
            type: 'hbar',
            data,
            x: { key: 'g' },
            y: { label: '1,000 m³/d' },
            series: [{ key: 'v', label: 'Capacity' }],
            valueFormat: (v) => f1(v),
            unit: '× 1,000 m³/d',
            height: 40 + data.length * 34,
            marginLeft: 190,
          },
          { sub: `present peak ${f1(a.qPeak / 1000)} · target ${f1(a.qTarget / 1000)} thousand m³/d` },
        ),
      ],
    };
  },
};
