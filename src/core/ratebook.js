// NWSDB Rates 2026 – Rate Book 2025 revised by circular CQS/22/2026/98 of 14.10.2026 ("RB 2025 Rev. 01-2026",
// Quantity Surveying Section, Planning & Designs Division).  The circular fully replaces the pipe-work tables
// (A-PVC/01-03, A-DI/01-03, A-PE/01-06), the chemicals (A-CH/01-02), the basic prices of materials, labour and
// equipment, the HDPE / PVC Section B tables, the TCE format (Annex 13) and the exchange rate (Annex 14); every other
// section of the 2025 book is carried forward with its adjustment factor (Table 1 of the circular):
//   1.08  – Section A unit costs (A-MIS/01, Graphs A-UC/01-07), civil Section B (WRS, BU, RD, MIS, FM, PL, COM …)
//   1.092 – supply of M&E (A-M/01-18, A-A/01, B-ELE, B-LAB, B-GI) · 1.08 their installation
//   1.144 – supply of valves and DI items (B-V&M/01-04, B-DI) · 1.08 their installation
// Lookups used by the cost estimate, pumping-main optimisation, chemical and energy costs; every value carries its
// table reference so the BOQ, report and Excel can cite it.  Data: ratebook.data.js (2025 book) + ratebook2026.data.js.
import { RB_DATA } from './ratebook.data.js';
import { RB26 } from './ratebook2026.data.js';

/** adjustment factors of circular CQS/22/2026/98 (Table 1) */
export const ADJ = { general: 1.08, meSupply: 1.092, install: 1.08, valveSupply: 1.144, labSupply: 1.092 };
const scaleNums = (o, f, skip = /^(kW|HP|dn|item|page|book_page|pdf_page|volume|markup|derived)$/) => {
  if (Array.isArray(o)) return o.map((x) => scaleNums(x, f, skip));
  if (o && typeof o === 'object') { for (const k of Object.keys(o)) { if (skip.test(k)) continue; if (typeof o[k] === 'number') o[k] = Math.round(o[k] * f * 100) / 100; else if (o[k] && typeof o[k] === 'object') scaleNums(o[k], f, skip); } }
  return o;
};
/** factor applied to a 2025 graph: A-UC ×1.08; M&E graphs ×1.092 supply / ×1.08 installation */
export const graphFactor = (id) => (/^UC\//.test(id) ? ADJ.general : /^Installation/i.test(RB_DATA.graphs[id]?.title || '') ? ADJ.install : ADJ.meSupply);
// ---- bring the 2025 data to 2026 (once, at load)
if (!RB_DATA.rev2026) {
  RB_DATA.rev2026 = true;
  // replaced tables (Annexes 01–03, 06, 09, 12)
  Object.assign(RB_DATA.di, { supplyAsian: RB26.di.supplyAsian, supplyNonAsian: RB26.di.supplyNonAsian, laying: RB26.di.laying, ref: { supplyAsian: 'A-DI/1 col 7 / col 11 (Rates 2026, Annex 02)', supplyNonAsian: 'A-DI/2 (Rates 2026)', laying: 'A-DI/3 (Rates 2026)', page: 'circular CQS/22/2026/98 Annex 02' } });
  for (const pn of ['pn10', 'pn16']) Object.assign(RB_DATA.hdpe[pn], RB26.hdpe[pn]);
  RB_DATA.hdpe.ref = 'A-PE/01-06 (Rates 2026, Annex 03), B-PE/01B, 03B local (Annex 12)';
  Object.assign(RB_DATA.pvc, RB26.pvc, { ref: 'A-PVC/01-03 (Rates 2026, Annex 01)' });
  RB_DATA.chemicals = RB26.chemicals.map((c) => ({ ...c, role: c.name, page: 'Annex 06' }));
  RB_DATA.labour = RB26.labour.map((x) => ({ table: 'Annex 02: Basic Rates – Labour (Rates 2026, Annex 09)', ...x }));
  for (const m of RB_DATA.materials || []) { const v = RB26.fuel[m.description]; if (v) { m.rate = v; m.table = 'Annex 01: Basic Prices – Material (Rates 2026, Annex 08)'; } }
  // carried-forward sections × adjustment factor
  for (const [id, g] of Object.entries(RB_DATA.graphs)) { const f = graphFactor(id); for (const s of g.series) s.pts = s.pts.map(([x, y]) => [x, Math.round(y * f * 10) / 10]); g.factor = f; }
  for (const v of RB_DATA.valves) if (v.rate > 0) v.rate = Math.round(v.rate * ADJ.valveSupply);
  scaleNums(RB_DATA.chambers, ADJ.general);
  scaleNums(RB_DATA.meters, ADJ.general);
  const lab = RB_DATA.civil.lab_equipment_lump_sum;
  delete RB_DATA.civil.lab_equipment_lump_sum;
  scaleNums(RB_DATA.civil, ADJ.general);
  RB_DATA.civil.lab_equipment_lump_sum = scaleNums(lab, ADJ.labSupply);
  scaleNums(RB_DATA.misA.items, ADJ.general);
  scaleNums(RB_DATA.filterMedia, ADJ.general);
  scaleNums(RB_DATA.lab, ADJ.labSupply);
  scaleNums(RB_DATA.motors, ADJ.meSupply);
  // How to use: the 2026 circular keeps the steps; Annex 13 (new Table 1) adds SSCL before VAT and year-wise columns
  const E = RB_DATA.estimate;
  E.steps = E.steps.map((t) => t.replace('beyond 31.12.2025', 'beyond 31.12.2026 (base year of NWSDB Rates 2026)').replace('VAT = 18% of Sub Total 3.', 'Allow for SSCL = Sub Total 3 / 97.5 × 2.5 → Sub Total 4; VAT = 18% of Sub Total 4 (Annex 13).'));
  E.steps.push('Annex 13: show the implementing cost year by year (FC and LC components); the TCE is valid for one year; state the FC conversion rate (Annex 14: 1 USD = ' + RB26.fx.usd + ' LKR, 1 EUR = ' + RB26.fx.eur + ' LKR, CBSL 31.08.2026).');
  E.steps.push('Sections not replaced by the 2026 circular use the 2025 rates × the circular\'s adjustment factor (1.08 general / civil and installation, 1.092 M&E, laboratory and electrical supply, 1.144 valves and DI items supply).');
}
/** Table 1 of circular CQS/22/2026/98 – what changed for 2026 */
export const REV2026 = [
  ['Pipe work A-PVC/01-03, A-DI/01-03, A-PE/01-06', 'replaced (Annexes 01–03)'], ['Chemicals A-CH/01-02', 'replaced (Annex 06)'],
  ['Basic prices – materials, labour, equipment', 'replaced (Annexes 08–10)'], ['B-PVC/01, 02, 07; B-PE/01A–06', 'replaced (Annexes 11–12)'],
  ['Table 1 – format of TCE', 'replaced (Annex 13: SSCL line, year-wise implementing cost)'], ['Exchange rate', `Annex 14: 1 USD = ${RB26.fx.usd} LKR`],
  ['A-MIS/01, Graphs A-UC/01-07', '× 1.08'], ['A-A/01, A-M/01-18, A-ELEV, A-SOL, B-ELE/01-15', '× 1.092 supply, × 1.08 installation'],
  ['B-V&M/01-04, B-C&A/01, B-DI/01-12', '× 1.144 supply, × 1.08 installation'], ['B-LAB/01', '× 1.092 supply'], ['B-GI/01-03', '× 1.092 supply, × 1.08 installation'],
  ['B-BU, B-WRS, B-RD, B-MIS, B-FM, B-PL, B-SS, B-FER, B-GB, B-AC, B-FPD, B-HP, B-COM/03-19, B-PE/07-13, B-PVC/03-06, A-SUR, A-GWSI/02-03', '× 1.08'],
];

export { RB_DATA };
export const RB = {
  title: 'NWSDB Rates 2026 – Rate Book 2025 Rev. 01-2026 (circular CQS/22/2026/98, 14.10.2026), Quantity Surveying Section, P&D Division',
  short: 'NWSDB Rates 2026',
  circular: 'CQS/22/2026/98 of 14.10.2026',
  markup: 27,               // How to use, item 2: add 27 % where the contractor's markup is not included
  vat: 18,                  // VAT 18 % of Sub Total 4 (Annex 13 TCE format)
  sscl: 2.5,                // SSCL: Annex 13 TCE "Allow for SSCL (Sub Total 3 / 97.5 × 2.5)"; also on CEB bills (Annex 8)
  escLC: 5, escFC: 3,       // How to use, item 7: LC 5 % p.a., FC 3 % p.a. beyond the base year
  baseYear: 2026,
  prelimLarge: 4, prelimSmall: 5, prelimThreshold: 500e6, // preliminaries ≈ 4 % (> LKR 500 M) / 5 % of Sub Total 1
  contingencyMax: 10,       // Annex 13: physical contingencies 10 % of Sub Total 1
  rwss: 5,                  // Annex 13 (iv): 5 % for RWS&S and water-resource development
  usd: RB26.fx.usd, eur: RB26.fx.eur, fxRef: RB26.fx.ref,
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
  return { value: y, extrap, ref: `Graph ${id}${g.factor ? ` (2025 × ${g.factor})` : ''}`, title: g.title, range };
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
  if (['steel', 'ac', 'ci'].includes(material)) { fam = 'di'; note = 'not in the Rate Book – DI rate used'; }
  if ((material === 'upvc147' || material === 'upvc3505') && dn > 225) { fam = 'hdpe'; note = 'PVC > 225 mm not in the Rate Book – HDPE rate used'; }
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
    return { value: pick.rate, ref: rbRef(`B-V&M/02 item ${pick.item} (${pick.desc.slice(0, 48)}; 2025 × ${ADJ.valveSupply})`) };
  }
  rows = rows.map((v) => ({ ...v, d: parseInt(v.dn, 10) })).filter((v) => v.d > 0).sort((a, b) => a.d - b.d);
  if (!rows.length) return { value: NaN, ref: '' };
  // the book's PN16 butterfly 300/350 mm prices exceed 400–600 mm: use a monotone envelope
  const pick = rows.find((v) => v.d >= dn) || rows[rows.length - 1];
  const over = dn > rows[rows.length - 1].d ? dn / rows[rows.length - 1].d : 1;
  return { value: pick.rate * over * over, ref: rbRef(`B-V&M/02 item ${pick.item} (${grp}, DN${pick.d}${over > 1 ? ', scaled' : ''}; 2025 × ${ADJ.valveSupply})`) };
}
/** chamber cost by title regex and depth (LKR/nr, contractor's markup not included in COM tables) */
export function chamberCost(titleRe, depth = 1.8, sizeIdx = 1) {
  const t = RB_DATA.chambers.find((c) => titleRe.test(c.title));
  if (!t) return { value: NaN, ref: '' };
  const row = t.rows[Math.min(sizeIdx, t.rows.length - 1)];
  const keys = Object.keys(row.rates_by_depth);
  const k = depth <= 1.5 ? keys[0] : depth <= 2.0 ? keys[1] : depth <= 2.5 ? keys[2] : keys[keys.length - 1];
  return { value: row.rates_by_depth[k], ref: rbRef(`${t.table} ${row.desc} (${k}; 2025 × ${ADJ.general})`) };
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
// values already × 1.08 (circular CQS/22/2026/98); the refs say so
const K = RB_DATA.civil;
export const CIVIL = {
  excavation: { v: K.excavation_per_m3.WRS02_soft_sandy_2_5m, mk: true, unit: 'm³', ref: 'B-WRS/02 excavation for structures, soft/sandy soil 2–5 m' },
  ews: { v: K.earthwork_support_per_m2.moderately_firm_2_5m, mk: true, unit: 'm²', ref: 'B-WRS/04 earthwork support, moderately firm, 2–5 m' },
  concrete: { v: K.concrete_WRS_supply_readymix_per_m3.G30 + K.concrete_WRS_placing_other_structures_per_m3.RC_straight_wall_300_500, mk: true, unit: 'm³', ref: 'B-WRS/01 A grade 30 ready-mix + B-WRS/01 B placing walls 300–500 mm' },
  blinding: { v: K.concrete_WRS_supply_readymix_per_m3.G15 + K.concrete_WRS_placing_other_structures_per_m3.mass_screed_lt150, mk: true, unit: 'm³', ref: 'B-WRS/01 A grade 15 + B-WRS/01 B mass screed < 150 mm' },
  formwork: { v: K.formwork_WRS_other_structures_per_m2['plain_vertical_gt1.22m'], mk: true, unit: 'm²', ref: 'B-WRS/01 D plain vertical formwork > 1.22 m' },
  steel: { v: K.reinforcement_WRS_other_structures.per_kg, mk: true, unit: 'kg', ref: 'B-WRS/01 C reinforcement, all diameters' },
  waterbar: { v: K.water_bar_per_m.PVC_dumbbell_200, mk: true, unit: 'm', ref: 'B-WRS PVC dumbbell water bar 200 mm' },
  sand: { v: K.filter_media.filter_sand_per_m3, mk: false, unit: 'm³', ref: 'B-FM/01 filter sand (supply to site, markup included)' },
  gravel: { v: (K.filter_media.graded_gravel_per_m3_range[0] + K.filter_media.graded_gravel_per_m3_range[1]) / 2, mk: false, unit: 'm³', ref: 'B-FM/01 graded gravel (mean of the range)' },
  anthracite: { v: K.filter_media.anthracite_per_kg * 750, mk: false, unit: 'm³', ref: `B-FM/01 anthracite ${Math.round(K.filter_media.anthracite_per_kg)} LKR/kg × 750 kg/m³ bulk density (assumed)` },
  fence: { v: K.fencing_gates.chain_link_PVC_2m_with_rubble_fdn_per_m, mk: true, unit: 'm', ref: 'B-MIS/02 PVC chain-link fence 2 m on rubble foundation' },
  gate: { v: K.fencing_gates['sliding_gate_6.3x2.4'], mk: true, unit: 'nr', ref: 'B-MIS/02 sliding gate 6.3 × 2.4 m' },
  road: { v: K.roads.asphalt_concrete_50mm_per_m2 + K.roads.ABC_base_per_m3 * 0.15 + K.roads.subbase_prep_per_m2 + K.roads.prime_coat_per_m2, mk: true, unit: 'm²', ref: 'B-RD/01 asphalt 50 mm + ABC base 150 mm + sub-base preparation + prime coat' },
};
/** building rates per m² (Table A-MIS/01, contractor's markup included; 2025 rates × 1.08 per the 2026 circular) */
export const BUILDINGS = {
  pumpIsolated: { v: Math.round(293632 * ADJ.general), ref: 'A-MIS/01 4.1 isolated pump house (2025 × 1.08)' },
  pumpAttached: { v: Math.round(267940 * ADJ.general), ref: 'A-MIS/01 4.2 pump house attached to reservoir (2025 × 1.08)' },
  chemical: { v: Math.round(274432 * ADJ.general), ref: 'A-MIS/01 5.0 chemical house (2025 × 1.08)' },
  chlorinator: { v: Math.round(96640 * ADJ.general), ref: 'A-MIS/01 6.0 chlorinator house (2025 × 1.08)' },
  office: { v: Math.round(131180 * ADJ.general), ref: 'A-MIS/01 3.6 office building, single storey (2025 × 1.08)' },
  caretaker: { v: Math.round(113199 * ADJ.general), ref: 'A-MIS/01 3.1 caretaker quarters (2025 × 1.08)' },
  quarters: { v: Math.round(162048 * ADJ.general), ref: 'A-MIS/01 3.4 type quarters, single storey (2025 × 1.08)' },
};
for (const c of Object.values(CIVIL)) c.ref += ' (2025 × 1.08)';
export const civilRate = (key, markup = RB.markup) => { const c = CIVIL[key]; return c.v * (c.mk ? 1 + markup / 100 : 1); };
export const LAB_WTP = { v: RB_DATA.lab.wtp_core_total, ref: 'B-LAB/01 – WTP laboratory instruments & glassware (one of each core item; 2025 × 1.092)' };

// ------------------------------------------------------------------ chemicals (Tables A-CH/01, A-CH/02 – Rates 2026 Annex 06; supply, VAT excl.)
const chem = (re) => RB_DATA.chemicals.find((c) => re.test(c.name));
const ch = (re, label) => { const c = chem(re); return { v: c?.derived_rate_LKR_per_kg, ref: `${c?.table || 'A-CH'} ${c?.item || ''} ${label} (Rates 2026)` }; };
const cyl = (kg) => RB_DATA.chemicals.find((c) => /Chlorine Gas/i.test(c.name) && String(c.unit).startsWith(String(kg)));
export const CHEM = {
  alum: ch(/Aluminium Sulphate/i, 'aluminium sulphate'),
  pacl: ch(/Poly Aluminium/i, 'poly-aluminium chloride'),
  lime: ch(/Hydrated lime/i, 'hydrated lime'),
  kmno4: ch(/KMnO4/i, 'KMnO₄'),
  bleach: ch(/Bleaching/i, 'bleaching powder'),
  cl2: { v: cyl(900).rate / 900, ref: `A-CH/02 ${cyl(900).item} chlorine gas, 900 kg cylinder (Rates 2026)` },
  cl2small: { v: cyl(68).rate / 68, ref: `A-CH/02 ${cyl(68).item} chlorine gas, 68 kg cylinder (Rates 2026)` },
  pac: ch(/Powder Activated/i, 'powdered activated carbon'),
  polymer: ch(/Cationic Polymer/i, 'cationic polymer'),
  gac: ch(/Granular Activated/i, 'granular activated carbon'),
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
export const DIESEL = { v: RB26.fuel['Auto Diesel'], ref: 'Rates 2026 Annex 08 (basic prices – materials) – auto diesel' };

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
