// NWSDB Rates 2025 ("Rate Book 2025", Quantity Surveying Section, Planning & Designs Division, Vols I & II).
// Lookups used by the cost estimate, pumping-main optimisation, chemical and energy costs; every value carries its
// table reference so the BOQ, report and Excel can cite it.  Data in ratebook.data.js (generated from the book).
import { RB_DATA } from './ratebook.data.js';

export { RB_DATA };
export const RB = {
  title: 'NWSDB Rates 2025 – Quantity Surveying Section, Planning & Designs Division (Vols I & II)',
  short: 'NWSDB RB 2025',
  markup: 27,               // How to use, item 2: add 27 % where the contractor's markup is not included
  vat: 18,                  // How to use, item 19 (VAT 18 % of Sub Total 3; Annex 14)
  escLC: 5, escFC: 3,       // item 7: escalation beyond 31.12.2025 – LC 5 % p.a., FC 3 % p.a.
  baseYear: 2025,
  prelimLarge: 4, prelimSmall: 5, prelimThreshold: 500e6, // preliminaries ≈ 4 % (> LKR 500 M) / 5 % of Sub Total 1
  contingencyMax: 10,       // item 17: max 10 % of (Sub Total 1 + duties)
  rwss: 5,                  // item 11: 5 % of Sub Total 1 for RWS&S and water-resource improvement
  sscl: 2.5,                // Annex 8: Social Security Contribution Levy on electricity bills
};
export const rbRef = (s) => `${RB.short} ${s}`;

/** piecewise-linear interpolation on [[x, y], …] (sorted), linear extrapolation from the end segments */
export function lerp(pts, x) {
  if (!pts?.length) return { y: NaN, extrap: true };
  if (pts.length === 1) return { y: pts[0][1], extrap: x !== pts[0][0] };
  let i = pts.findIndex((p) => p[0] >= x);
  const extrap = x < pts[0][0] || x > pts[pts.length - 1][0];
  if (i <= 0) i = 1;
  if (i === -1 || x > pts[pts.length - 1][0]) i = pts.length - 1;
  const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
  const y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  return { y: Math.max(0, y), extrap };
}
/** value of a digitised RB graph (series index or name) */
export function graph(id, x, series = 0) {
  const g = RB_DATA.graphs[id];
  if (!g) return { value: NaN, ref: id, extrap: true };
  const s = typeof series === 'number' ? g.series[series] : g.series.find((q) => q.name === series) || g.series[0];
  const { y, extrap } = lerp(s.pts, x);
  const range = [s.pts[0][0], s.pts[s.pts.length - 1][0]];
  return { value: y, extrap, ref: `Graph ${id}`, title: g.title, range };
}
const nearestRow = (rows, dn) => rows.find((r) => r[0] >= dn) || rows[rows.length - 1];

// ------------------------------------------------------------------ location factors (Table B-COM/02)
export function locationFactor(district) {
  const row = RB_DATA.location.find(([d]) => String(d).toLowerCase().replace(/[^a-z]/g, '') === String(district || '').toLowerCase().replace(/[^a-z]/g, ''));
  return row ? row[1] : 1.0;
}

// ------------------------------------------------------------------ pipes (Section A tables, per metre)
/**
 * Supply + laying cost of a pipe per metre (LKR, VAT excluded).
 * material: di | hdpe | upvc147 | upvc3505 | steel | ac | ci; dn mm; opts: main 'transmission'|'distribution',
 * origin 'asian'|'nonasian'|'local', pn (bar), district factor, markup % on laying (contractor's markup not included
 * in the laying tables), ews / dewatering allowance % of their basic costs (notes 4).
 */
export function pipeCost(material, dn, { main = 'transmission', origin = 'asian', pn = 10, factor = 1, markup = RB.markup, ewsPct = 25, dewPct = 25 } = {}) {
  const tm = main !== 'distribution';
  let fam = material, note = '';
  if (['steel', 'ac', 'ci'].includes(material)) { fam = 'di'; note = 'not in RB 2025 – DI rate used'; }
  if ((material === 'upvc147' || material === 'upvc3505') && dn > 225) { fam = 'hdpe'; note = 'PVC > 225 mm not in RB 2025 – HDPE rate used'; }
  let supply, lay, exc, ews, dew, ref, dnUsed;
  if (fam === 'di' || !['hdpe', 'upvc147', 'upvc3505'].includes(fam)) {
    const tab = origin === 'nonasian' ? RB_DATA.di.supplyNonAsian : RB_DATA.di.supplyAsian;
    const s = nearestRow(tab, dn), l = nearestRow(RB_DATA.di.laying, dn);
    dnUsed = s[0]; supply = tm ? s[1] : s[2]; lay = tm ? l[1] : l[2]; exc = l[3]; ews = l[4]; dew = l[5];
    ref = `A-DI/${origin === 'nonasian' ? 2 : 1} + A-DI/3 (DN${dnUsed} ${RB_DATA.di.cls[String(dnUsed)] || ''})`;
  } else if (fam === 'hdpe') {
    const P = pn > 10 ? RB_DATA.hdpe.pn16 : RB_DATA.hdpe.pn10;
    const tab = origin === 'nonasian' ? P.supplyNonAsian : origin === 'local' && dn <= P.local[P.local.length - 1][0] ? null : P.supplyAsian;
    if (tab) { const s = nearestRow(tab, dn); dnUsed = s[0]; supply = tm ? s[1] : s[2]; } else { const s = nearestRow(P.local, dn); dnUsed = s[0]; supply = s[1] * (tm ? 1.3 : 1.4); }
    const l = nearestRow(P.laying, Math.min(dn, P.laying[P.laying.length - 1][0]));
    lay = tm ? l[1] : l[2]; exc = l[3]; ews = l[4]; dew = l[5];
    ref = `A-PE/${pn > 10 ? (origin === 'nonasian' ? 4 : 3) : (origin === 'nonasian' ? 2 : 1)} + A-PE/${pn > 10 ? 6 : 5} (DN${dnUsed}, ${pn > 10 ? 'SDR11 PN16' : 'SDR17 PN10'})`;
  } else {
    const T = pn > 7 ? RB_DATA.pvc.pnt11 : RB_DATA.pvc.pnt7;
    const s = nearestRow(T, dn), l = nearestRow(RB_DATA.pvc.laying, dn);
    dnUsed = s[0]; supply = tm ? s[1] * 1.25 : s[2]; lay = tm ? l[1] * 1.3 : l[2]; exc = l[3]; ews = l[4]; dew = l[5];
    ref = `A-PVC/0${pn > 7 ? 2 : 1} + A-PVC/03 (DN${dnUsed})`;
  }
  const layTot = (lay + exc + (ews * ewsPct) / 100 + (dew * dewPct) / 100) * factor * (1 + markup / 100);
  return { supply, laying: layTot, total: supply + layTot, ref: rbRef(ref) + (note ? ` – ${note}` : ''), dnUsed, parts: { supply, lay, exc, ews, dew, factor } };
}

// ------------------------------------------------------------------ valves & chambers (Vol II B-V&M/02, B-COM/08-14)
const VALVE_GROUP = {
  sluice16: 'Sluice Valve suitable for spindel (PN 16)', sluice25: 'Sluice Valve suitable for spindel (PN 25)',
  butterfly16: 'Butterfly Valve with Gear box (PN 16)', butterfly25: 'Butterfly Valve with Gear box (PN 25)',
  nrv16: 'Non return Valve (PN 16)', air16: 'Air Valves(PN16)', air25: 'Air Valves (PN 25)',
};
/** supply cost of a valve (LKR/nr) – isolating valves: sluice ≤ 300 mm, butterfly with gear box above */
export function valveCost(kind, dn, pn = 16) {
  const hi = pn > 16;
  let key = kind;
  if (kind === 'isolating') key = dn <= 300 ? 'sluice' : 'butterfly';
  const grp = VALVE_GROUP[key + (hi ? '25' : '16')] || VALVE_GROUP[key + '16'];
  let rows = RB_DATA.valves.filter((v) => v.group === grp && v.rate > 0);
  if (key === 'air') {
    rows = rows.filter((v) => /double orifice/i.test(v.desc));
    const pick = rows.find((v) => parseInt(v.desc, 10) >= dn) || rows[rows.length - 1];
    return { value: pick.rate, ref: rbRef(`B-V&M/02 item ${pick.item} (${pick.desc.slice(0, 48)})`) };
  }
  rows = rows.map((v) => ({ ...v, d: parseInt(v.dn, 10) })).filter((v) => v.d > 0).sort((a, b) => a.d - b.d);
  if (!rows.length) return { value: NaN, ref: '' };
  // the book's PN16 butterfly 300/350 mm prices exceed 400–600 mm: use a monotone envelope
  const pick = rows.find((v) => v.d >= dn) || rows[rows.length - 1];
  const over = dn > rows[rows.length - 1].d ? dn / rows[rows.length - 1].d : 1;
  return { value: pick.rate * over * over, ref: rbRef(`B-V&M/02 item ${pick.item} (${grp}, DN${pick.d}${over > 1 ? ', scaled' : ''})`) };
}
/** chamber cost by title regex and depth (LKR/nr, contractor's markup not included in COM tables) */
export function chamberCost(titleRe, depth = 1.8, sizeIdx = 1) {
  const t = RB_DATA.chambers.find((c) => titleRe.test(c.title));
  if (!t) return { value: NaN, ref: '' };
  const row = t.rows[Math.min(sizeIdx, t.rows.length - 1)];
  const keys = Object.keys(row.rates_by_depth);
  const k = depth <= 1.5 ? keys[0] : depth <= 2.0 ? keys[1] : depth <= 2.5 ? keys[2] : keys[keys.length - 1];
  return { value: row.rates_by_depth[k], ref: rbRef(`${t.table} ${row.desc} (${k})`) };
}

// ------------------------------------------------------------------ M&E graphs
/** pump set supply + installation (LKR/nr) from Graphs A-M/05–M/10 by motor kW */
export function pumpSetCost(kW, kind = 'horizontal', spares = 0) {
  let sup, ins, ref;
  if (kind === 'submersible') { sup = graph('M/09', kW, 0); ins = graph('M/10', kW); ref = 'Graphs A-M/09 + M/10 (submersible, 1500 rpm)'; }
  else if (kW >= 20) { sup = graph('M/07', kW, 0); ins = graph('M/08', kW); ref = 'Graphs A-M/07 + M/08 (split-casing, 1500 rpm)'; }
  else { sup = graph('M/05', kW, 0); ins = graph('M/06', kW); ref = 'Graphs A-M/05 + M/06 (end-suction, 1500 rpm)'; }
  // installation graphs M/06 & M/08 include the contractor's markup; M/10 does not
  const insV = ins.value * (kind === 'submersible' ? 1 + RB.markup / 100 : 1);
  const v = sup.value * (1 + spares / 100) + insV;
  return { value: v, supply: sup.value, install: insV, extrap: sup.extrap, ref: rbRef(ref) + (sup.extrap ? ' – extrapolated' : '') + (spares ? `, spares ${spares} %` : '') };
}
export function starterCost(kW, type = 'soft') {
  if (type === 'vsd') { const s = graph('ELE/15', kW), i = graph('ELE/16', kW); return { value: s.value + i.value * (1 + RB.markup / 100), ref: rbRef('Graphs B-ELE/15 + 16 (VSD)') + (s.extrap ? ' – extrapolated' : '') }; }
  if (type === 'stardelta') { const s = graph('ELE/13', kW); return { value: s.value * 1.05, ref: rbRef('Graph B-ELE/13 (+5 % installation)') }; }
  const s = graph('ELE/12', kW);
  return { value: s.value * 1.05, ref: rbRef('Graph B-ELE/12 soft starter (+5 % installation, note 1)') + (s.extrap ? ' – extrapolated' : '') };
}
export function generatorCost(kva) {
  const s = graph('ELE/01', kva), i = graph('ELE/02', kva);
  return { value: s.value + i.value * (1 + RB.markup / 100), ref: rbRef('Graphs B-ELE/01 + ELE/02 (water-cooled generator)') + (s.extrap ? ' – extrapolated' : '') };
}
export function panelCost(kW, kind = 'main') {
  const big = kW > 90;
  const [s, i] = kind === 'main' ? (big ? ['ELE/05', 'ELE/06'] : ['ELE/03', 'ELE/04']) : (big ? ['ELE/09', 'ELE/10'] : ['ELE/07', 'ELE/08']);
  const n = Math.max(1, Math.ceil(kW / 1100));
  const per = kW / n;
  const a = graph(s, per), b = graph(i, per);
  const insMk = RB_DATA.graphs[i]?.notes?.some((t) => /markup not included/i.test(t)) ? 1 + RB.markup / 100 : 1;
  return { value: n * (a.value + b.value * insMk), n, ref: rbRef(`Graphs B-${s} + ${i} (${kind === 'main' ? 'main incoming panel incl. ATS & capacitor bank' : 'distribution panel'}${n > 1 ? `, ${n} panels` : ''})`) + (a.extrap ? ' – extrapolated' : '') };
}
export function flowMeterCost(dn) {
  const s = graph('A/01', dn);
  return { value: s.value * 1.15, ref: rbRef(`Graph A-A/01 EM flow meter DN${dn} (+5 % installation, +10 % spares)`) + (s.extrap ? ' – extrapolated' : '') };
}
export function blowerCost(kW) {
  const s = graph('M/14', kW), i = graph('M/15', kW);
  return { value: s.value + i.value * (1 + RB.markup / 100), ref: rbRef('Graphs A-M/14 + M/15 (air blower)') + (s.extrap ? ' – extrapolated' : '') };
}
export function surgeVesselCost(m3) {
  const v = Math.min(20, Math.max(1, m3));
  const s = graph('M/16', v), i = graph('M/17', v);
  return { value: s.value + i.value * (1 + RB.markup / 100), ref: rbRef(`Graphs A-M/16 + M/17 (bladder surge vessel ${v.toFixed(1)} m³)`) };
}
export function chlorinatorCost(kgPerH) {
  const s = graph('M/18', kgPerH);
  return { value: s.value, ref: rbRef('Graph A-M/18 (gas chlorinator; regulators, injectors & leak detection excluded)') + (s.extrap ? ' – extrapolated' : '') };
}
export function movCost(dn) {
  const s = graph('M/11', dn), i = graph('M/13', dn);
  return { value: s.value + i.value * (1 + RB.markup / 100), ref: rbRef('Graphs A-M/11 + M/13 (motor-operated valve)') + (s.extrap ? ' – extrapolated' : '') };
}

// ------------------------------------------------------------------ civil (Section B, contractor's markup NOT included unless stated)
const K = RB_DATA.civil;
export const CIVIL = {
  excavation: { v: K.excavation_per_m3.WRS02_soft_sandy_2_5m, mk: true, unit: 'm³', ref: 'B-WRS/02 excavation for structures, soft/sandy soil 2–5 m' },
  ews: { v: K.earthwork_support_per_m2.moderately_firm_2_5m, mk: true, unit: 'm²', ref: 'B-WRS/04 earthwork support, moderately firm, 2–5 m' },
  concrete: { v: K.concrete_WRS_supply_readymix_per_m3.G30 + K.concrete_WRS_placing_other_structures_per_m3.RC_straight_wall_300_500, mk: true, unit: 'm³', ref: 'B-WRS/01 A grade 30 ready-mix (23,400) + B-WRS/01 B placing walls 300–500 mm (4,950)' },
  blinding: { v: K.concrete_WRS_supply_readymix_per_m3.G15 + K.concrete_WRS_placing_other_structures_per_m3.mass_screed_lt150, mk: true, unit: 'm³', ref: 'B-WRS/01 A grade 15 + B-WRS/01 B mass screed < 150 mm' },
  formwork: { v: K.formwork_WRS_other_structures_per_m2['plain_vertical_gt1.22m'], mk: true, unit: 'm²', ref: 'B-WRS/01 D plain vertical formwork > 1.22 m' },
  steel: { v: K.reinforcement_WRS_other_structures.per_kg, mk: true, unit: 'kg', ref: 'B-WRS/01 C reinforcement, all diameters' },
  waterbar: { v: K.water_bar_per_m.PVC_dumbbell_200, mk: true, unit: 'm', ref: 'B-WRS PVC dumbbell water bar 200 mm' },
  sand: { v: K.filter_media.filter_sand_per_m3, mk: false, unit: 'm³', ref: 'B-FM/01 filter sand (supply to site, markup included)' },
  gravel: { v: (K.filter_media.graded_gravel_per_m3_range[0] + K.filter_media.graded_gravel_per_m3_range[1]) / 2, mk: false, unit: 'm³', ref: 'B-FM/01 graded gravel (mean of 29,000–31,000)' },
  anthracite: { v: K.filter_media.anthracite_per_kg * 750, mk: false, unit: 'm³', ref: 'B-FM/01 anthracite 475 LKR/kg × 750 kg/m³ bulk density (assumed)' },
  fence: { v: K.fencing_gates.chain_link_PVC_2m_with_rubble_fdn_per_m, mk: true, unit: 'm', ref: 'B-MIS/02 PVC chain-link fence 2 m on rubble foundation' },
  gate: { v: K.fencing_gates['sliding_gate_6.3x2.4'], mk: true, unit: 'nr', ref: 'B-MIS/02 sliding gate 6.3 × 2.4 m' },
  road: { v: K.roads.asphalt_concrete_50mm_per_m2 + K.roads.ABC_base_per_m3 * 0.15 + K.roads.subbase_prep_per_m2 + K.roads.prime_coat_per_m2, mk: true, unit: 'm²', ref: 'B-RD/01 asphalt 50 mm + ABC base 150 mm + sub-base preparation + prime coat' },
};
/** building rates per m² (Table A-MIS/01, contractor's markup included) */
export const BUILDINGS = {
  pumpIsolated: { v: 293632, ref: 'A-MIS/01 4.1 isolated pump house' },
  pumpAttached: { v: 267940, ref: 'A-MIS/01 4.2 pump house attached to reservoir' },
  chemical: { v: 274432, ref: 'A-MIS/01 5.0 chemical house' },
  chlorinator: { v: 96640, ref: 'A-MIS/01 6.0 chlorinator house' },
  office: { v: 131180, ref: 'A-MIS/01 3.6 office building, single storey' },
  caretaker: { v: 113199, ref: 'A-MIS/01 3.1 caretaker quarters' },
  quarters: { v: 162048, ref: 'A-MIS/01 3.4 type quarters, single storey' },
};
export const civilRate = (key, markup = RB.markup) => { const c = CIVIL[key]; return c.v * (c.mk ? 1 + markup / 100 : 1); };
export const LAB_WTP = { v: RB_DATA.lab.wtp_core_total, ref: 'B-LAB/01 – WTP laboratory instruments & glassware (one of each core item)' };

// ------------------------------------------------------------------ chemicals (Tables A-CH/01, A-CH/02 – supply, VAT excl.)
const chem = (re) => RB_DATA.chemicals.find((c) => re.test(c.name));
export const CHEM = {
  alum: { v: chem(/Aluminium Sulphate/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/01 1.02 aluminium sulphate' },
  pacl: { v: chem(/Poly Aluminium/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/01 1.04 poly-aluminium chloride' },
  lime: { v: chem(/Hydrated lime/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/01 1.03 hydrated lime' },
  kmno4: { v: chem(/KMnO4/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/01 1.05 KMnO₄' },
  bleach: { v: chem(/Bleaching/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/01 1.01 bleaching powder' },
  cl2: { v: 202500 / 900, ref: 'A-CH/02 2.01 chlorine gas, 900 kg cylinder' },
  cl2small: { v: 37000 / 68, ref: 'A-CH/02 2.02 chlorine gas, 68 kg cylinder' },
  pac: { v: chem(/Powder Activated/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/02 2.03 powdered activated carbon' },
  polymer: { v: chem(/Cationic Polymer/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/02 2.06 cationic polymer' },
  gac: { v: chem(/Granular Activated/i)?.derived_rate_LKR_per_kg, ref: 'A-CH/02 2.08 granular activated carbon' },
};

// ------------------------------------------------------------------ CEB tariff (Annex 8, June 2025) & connection cost
export const TARIFFS = {
  'I-2': { label: 'Industrial I-2 (400/230 V, > 42 kVA)', day: 15, peak: 28, off: 12, fixed: 5000, demand: 1400 },
  'I-3': { label: 'Industrial I-3 (11 kV & above)', day: 14, peak: 27, off: 11, fixed: 5000, demand: 1350 },
  'GP-2': { label: 'General purpose GP-2 (400/230 V, > 42 kVA)', day: 41, peak: 47, off: 31, fixed: 5000, demand: 1500 },
  'GP-3': { label: 'General purpose GP-3 (11 kV & above)', day: 39.5, peak: 46, off: 30, fixed: 5000, demand: 1450 },
  'GV-2': { label: 'Government GV-2 (400/230 V, > 42 kVA; = GP-2)', day: 41, peak: 47, off: 31, fixed: 5000, demand: 1500 },
  'GV-3': { label: 'Government GV-3 (11 kV & above; = GP-3)', day: 39.5, peak: 46, off: 30, fixed: 5000, demand: 1450 },
};
export const TOU_HOURS = { day: 13, peak: 4, off: 7 }; // 05:30–18:30, 18:30–22:30, 22:30–05:30
/** blended energy rate for continuous (24 h) operation, incl. 2.5 % SSCL */
export function blendedRate(code) {
  const t = TARIFFS[code] || TARIFFS['I-3'];
  const r = (t.day * TOU_HOURS.day + t.peak * TOU_HOURS.peak + t.off * TOU_HOURS.off) / 24;
  return { rate: r * (1 + RB.sscl / 100), raw: r, t, ref: rbRef(`Annex 8 CEB tariff (12.06.2025) ${code}: ${t.day}/${t.peak}/${t.off} LKR/kWh day/peak/off-peak, ${t.demand} LKR/kVA, ${t.fixed} LKR/month + ${RB.sscl} % SSCL`) };
}
/** CEB bulk supply 100 kVA – 1 MVA (CEB Standard Construction Cost 2025, RB Vol I pp 144–149) */
export function cebBulkSupply(kva, kv = 11) {
  const nB = Math.max(1, Math.ceil(kva / 1000)); // one bulk supply per 1 MVA
  const v = kv >= 33 ? 8800 * kva + 2322480 * nB : 8590 * kva + 2000510 * nB;
  return { value: v, ref: rbRef(`CEB standard construction cost – bulk supply ${kv} kV (${kv >= 33 ? '8,800' : '8,590'} LKR/kVA + fixed)`) };
}
export const DIESEL = { v: 289, ref: 'Annex 1 basic prices (July 2025) – auto diesel' };

// ------------------------------------------------------------------ estimate format (How to use; Tables 2 & 4)
/** Table 4: investigation, design, procurement & supervision % of Sub Total 1 */
export const ENG_PCT = {
  gosl: { label: 'Capital (GOSL) / GOSL + foreign', lt100: 20, ge100: 18 },
  nhda: { label: 'NHDA', lt100: 20, ge100: 18 },
  rechargeable: { label: 'Rechargeable', lt100: 20, ge100: 18 },
  boi: { label: 'BOI (concession)', lt100: 7, ge100: 7 },
  govconc: { label: 'Government organisation (concession)', lt100: 5, ge100: 5 },
  gov: { label: 'Government (client supervises)', lt100: 12, ge100: 11 },
};
/** Table 2 local / foreign currency factors (NCB, ICB) by works category */
export const LCFC = {
  Intake: [0.8, 0.6], 'Treatment plant': [0.7, 0.6], 'Ground reservoirs': [0.8, 0.8], 'DI pipe supply': [0.05, 0.05], 'Pipe laying': [0.95, 0.95],
  'M&E equipment': [0.1, 0.1], Buildings: [1.0, 0.95], 'Sludge treatment': [0.8, 0.2], SCADA: [0.1, 0.1], Preliminaries: [1.0, 0.8], 'Power supply': [1.0, 1.0],
};
