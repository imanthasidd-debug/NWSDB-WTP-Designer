// NWSDB Design Manual D3 – "Water Quality & Treatment Manual" (National Water Supply & Drainage Board,
// Revision 01, November 2020). Tables, rules and formulae transcribed from the manual and used throughout the
// application for treatment-process design. Every value carries its clause / table so that checks, calculation
// sheets and the report can cite it. Where the printed manual is internally inconsistent the app's choice is
// recorded in ERRATA (shown in the Library) – the value used is never silently changed.

export const D3 = {
  code: 'D3',
  title: 'NWSDB Design Manual D3 – Water Quality & Treatment Manual',
  date: 'Revision 01, November 2020',
  short: 'NWSDB D3 (2020)',
  scope: 'Water-quality standards, process selection, intakes & screens, aeration, coagulation, mixing, flocculation, clarification (incl. tube/plate settlers & DAF), rapid / slow sand / roughing filtration, residuals, chemical feeding, disinfection, specialised treatment, stability & corrosion, plant layout and O&M documentation.',
};
export const ref = (clause) => `NWSDB D3 §${clause}`;
export const isD3 = (src) => typeof src === 'string' && /\bD3\b/.test(src);

/** clause cited after a manual tag ('D2' / 'D3') in a source string – e.g. "§5.9.1", "Table 5-20", "Annex F.1" */
export function clauseOf(src, tag = 'D3') {
  const s = String(src || '');
  const i = s.search(new RegExp(`\\b${tag}\\b`));
  if (i < 0) return null;
  const rest = s.slice(i + tag.length);
  const m = rest.match(/^[^;]*?(§\s?(\d+(?:\.\d+)*(?:[–-]\d+(?:\.\d+)+)?)|Table\s*\d+(?:[.-]\d+)?|Fig(?:ure)?\s*\d+(?:[.-]\d+)?|Annex\s*[A-J](?:\.\d)?)/);
  if (!m) return tag;
  return m[2] ? '§' + m[2] : m[1].replace(/\s+/g, ' ');
}

const lerp = (x, x0, x1, y0, y1) => (x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
/** piece-wise linear interpolation in a sorted [[x, y], …] list, clamped at the ends */
export function interp(tbl, x) {
  if (x <= tbl[0][0]) return tbl[0][1];
  for (let i = 1; i < tbl.length; i++) if (x <= tbl[i][0]) return lerp(x, tbl[i - 1][0], tbl[i][0], tbl[i - 1][1], tbl[i][1]);
  return tbl[tbl.length - 1][1];
}

// ------------------------------------------------------------------ Ch 2 Water-quality standards
// Table 2-6 – SLS 722:1985 tolerance limits for inland surface water used as raw water for public supply
export const SLS722 = [
  { key: 'tc', name: 'Coliform organisms (monthly average)', unit: 'MPN/100 mL', limit: 5000, note: '< 5 % of samples above 20,000 and < 20 % above 5,000' },
  { key: 'pH', name: 'pH', unit: '–', limit: [6.0, 9.0] },
  { key: 'cl', name: 'Chloride', unit: 'mg/L', limit: 1200 },
  { key: 'no3', name: 'Nitrate (as N)', unit: 'mg/L', limit: 10, note: '= 44.3 mg/L as NO₃⁻' },
  { key: 'f', name: 'Fluoride', unit: 'mg/L', limit: 1.5 },
  { key: 'phenol', name: 'Phenolic compounds (as phenolic OH)', unit: 'mg/L', limit: 0.005 },
  { key: 'oil', name: 'Oil & grease', unit: 'mg/L', limit: 0.1 },
  { key: 'pest', name: 'Pesticide residue', unit: 'mg/L', limit: 'WHO requirement' },
  { key: 'as', name: 'Arsenic', unit: 'mg/L', limit: 0.05 },
  { key: 'cn', name: 'Cyanide', unit: 'mg/L', limit: 0.05 },
  { key: 'pb', name: 'Lead', unit: 'mg/L', limit: 0.1 },
  { key: 'hg', name: 'Mercury', unit: 'mg/L', limit: 0.001 },
  { key: 'se', name: 'Selenium', unit: 'mg/L', limit: 0.05 },
  { key: 'cr', name: 'Chromium', unit: 'mg/L', limit: 0.05 },
  { key: 'do', name: 'Dissolved oxygen', unit: 'mg/L', limit: '≥ 4 (minimum)' },
  { key: 'bod', name: 'BOD (5 d, 20 °C)', unit: 'mg/L', limit: 5 },
  { key: 'alpha', name: 'Alpha emitters', unit: 'µc/mL', limit: 1e-9 },
  { key: 'beta', name: 'Beta emitters', unit: 'µc/mL', limit: 1e-8 },
];
// Table 2-5 – cyanotoxins (desirable / permissible, µg/L)
export const CYANOTOXINS = [['Microcystin-LR', 1, 3], ['Cylindrospermopsin', 2, 5]];
export const TURBIDITY_TARGETS = {
  designFiltered: 0.2,   // §2.3.1 – NWSDB design target for filtered water
  ninetyFive: 0.3,       // §5.8.3 – < 0.3 NTU in 95 % of monthly measurements
  never: 1.0,            // §5.8.3 – never > 1 NTU; §6.2.4 ≤ 1.0 NTU "must be strived for"
  fullTreatment: 0.1,    // §6.2.4 – NWSDB target < 0.1 NTU for full-treatment plants
};

// ------------------------------------------------------------------ Ch 4 Process selection
// Table 4-5 – recommended processes (E = essential, O = optional). Process codes:
export const PROC = {
  scr: 'Screening', rawStor: 'Raw-water storage / desilting', micro: 'Microstrainer', aer: 'Aeration', preCl: 'Pre-chlorination / oxidation',
  preSet: 'Preliminary settling / roughing', coag: 'Coagulation + flocculation', settle: 'Settling', daf: 'Dissolved-air flotation', rapidF: 'Rapid filtration',
  ssf: 'Slow sand filtration', green: 'Greensand / catalytic filtration', postCl: 'Post-chlorination', superCl: 'Super-chlorination + dechlorination',
  lime: 'Lime softening', ac: 'Activated carbon (PAC / GAC)', ix: 'Ion exchange', mem: 'MF / UF / NF', ro: 'Reverse osmosis',
};
// soft: E items the app reports as advisory because Table 4-5 conflicts with the source-specific trains of Fig 4-3/4-4
export const TABLE_4_5 = [
  { id: 'debris', char: 'Floating debris', band: 'surface source', when: (q) => q.surface, E: ['scr'], O: ['micro'] },
  { id: 'algae', char: 'Algae', band: '> 2,000 cells/mL', when: (q) => q.algae > 2000, E: ['rapidF', 'ac'], O: ['scr', 'micro', 'preCl', 'coag', 'daf'] },
  { id: 't0', char: 'Turbidity', band: '0 – 2 NTU', when: (q) => q.turb <= 2, E: ['settle', 'postCl'], O: ['scr', 'rapidF', 'ssf'], soft: ['settle'] },
  { id: 't2', char: 'Turbidity', band: '2 – 30 NTU', when: (q) => q.turb > 2 && q.turb <= 30, E: ['settle', 'rapidF', 'postCl'], O: ['scr', 'coag', 'ssf'], soft: ['settle', 'rapidF'] },
  { id: 't30', char: 'Turbidity', band: '30 – 100 NTU', when: (q) => q.turb > 30 && q.turb <= 100, E: ['coag', 'settle', 'rapidF', 'postCl'], O: ['scr', 'preSet', 'ssf'] },
  { id: 't100', char: 'Turbidity', band: '100 – 750 NTU', when: (q) => q.turb > 100 && q.turb <= 750, E: ['scr', 'preSet', 'coag', 'settle', 'rapidF', 'postCl'], O: [], soft: ['preSet'] },
  { id: 't750', char: 'Turbidity', band: '> 750 NTU (coagulant aid optional)', when: (q) => q.turb > 750, E: ['scr', 'preSet', 'coag', 'settle', 'rapidF', 'postCl'], O: ['rawStor'] },
  { id: 'c0', char: 'Colour', band: '< 30 Hazen', when: (q) => q.colour < 30, E: ['postCl'], O: ['coag', 'settle', 'rapidF', 'ssf'] },
  { id: 'c30', char: 'Colour', band: '> 30 Hazen', when: (q) => q.colour >= 30, E: ['coag', 'settle', 'rapidF', 'postCl'], O: ['rawStor'] },
  { id: 'to', char: 'Taste & odour', band: 'present', when: (q) => q.taste, E: [], O: ['aer', 'preCl', 'ssf', 'superCl', 'ac'] },
  { id: 'hard', char: 'Hardness', band: '> 200 mg/L CaCO₃', when: (q) => q.hard > 200, E: ['lime'], O: ['mem', 'ro'] },
  { id: 'fe0', char: 'Iron', band: '< 0.30 mg/L', when: (q) => q.fe > 0.05 && q.fe < 0.3 && q.gw, E: ['aer', 'rapidF', 'postCl'], O: ['preCl', 'preSet', 'green'], soft: ['aer'] },
  { id: 'fe03', char: 'Iron', band: '0.30 – 1.0 mg/L', when: (q) => q.fe >= 0.3 && q.fe <= 1.0, E: ['aer', 'coag', 'settle', 'postCl'], O: ['preCl', 'rapidF', 'ssf', 'green', 'ix', 'mem'], soft: ['aer'] },
  { id: 'fe1', char: 'Iron', band: '> 1.0 mg/L', when: (q) => q.fe > 1.0, E: ['preCl', 'coag', 'settle', 'green', 'postCl'], O: ['aer', 'ssf', 'ix', 'mem'] },
  { id: 'cl', char: 'Chloride', band: '> 250 mg/L', when: (q) => q.cl > 250, E: ['ro'], O: [] },
  { id: 'tc0', char: 'Coliforms', band: '0 – 20 MPN/100 mL', when: (q) => q.tc <= 20, E: ['postCl'], O: ['rapidF', 'ssf'] },
  { id: 'tc20', char: 'Coliforms', band: '20 – 100 MPN/100 mL', when: (q) => q.tc > 20 && q.tc <= 100, E: ['coag', 'rapidF', 'postCl'], O: ['settle', 'daf', 'ssf'] },
  { id: 'tc100', char: 'Coliforms', band: '100 – 5,000 MPN/100 mL', when: (q) => q.tc > 100 && q.tc <= 5000, E: ['coag', 'rapidF', 'postCl'], O: ['preCl', 'settle', 'daf', 'ssf'] },
  { id: 'tc5000', char: 'Coliforms', band: '> 5,000 MPN/100 mL', when: (q) => q.tc > 5000, E: ['preCl', 'coag', 'rapidF', 'postCl'], O: ['preSet', 'settle', 'daf'] },
  { id: 'tox', char: 'Toxic chemicals', band: 'above SLS 614', when: (q) => q.toxic, E: ['postCl', 'ac', 'ro'], O: ['ssf'] },
  { id: 'toc', char: 'TOC / UV₂₅₄', band: 'TOC > 4 mg/L (app trigger)', when: (q) => q.toc > 4, E: ['coag', 'ac'], O: ['settle', 'daf', 'rapidF', 'ssf', 'postCl'], soft: ['ac'] },
];
/**
 * Evaluate Table 4-5 for a raw-water profile and a selected train.
 * q: {surface, gw, turb, colour, algae, hard, fe, cl, tc, toc, taste, toxic}
 * has: {scr, rawStor, micro, aer, preCl, preSet, coag, settle, daf, rapidF, ssf, green, postCl, superCl, lime, ac, ix, mem, ro}
 */
export function table45(q, has) {
  // slow sand filtration (Fig 4-4 train, no coagulation – Table 5-26) is accepted in lieu of coagulation + rapid filtration
  const alt = (p) => has.ssf && (p === 'rapidF' || p === 'coag');
  const rows = TABLE_4_5.filter((r) => r.when(q)).map((r) => {
    const missing = r.E.filter((p) => !has[p]);
    const isSoft = (p) => (r.soft || []).includes(p) || alt(p);
    const { when, ...row } = r; // the test function stays here – results must be plain data (cloned, saved, sent to the worker)
    return { ...row, missing, hard: missing.filter((p) => !isSoft(p)), soft: missing.filter(isSoft) };
  });
  const E = [...new Set(rows.flatMap((r) => r.E))];
  const O = [...new Set(rows.flatMap((r) => r.O))].filter((p) => !E.includes(p));
  return { rows, E, O };
}
// Fig 4-3 (groundwater) and Fig 4-4 (surface water) – typical treatment trains
export function typicalTrain(srcType, q) {
  if (srcType === 'groundwater') {
    const anaerobic = q.do < 2 || q.h2s > 0.05 || q.fe > 0.3 || q.mn > 0.1;
    const corrosive = q.co2 > 10 || q.lsi < -1.5;
    if (!anaerobic) return { fig: 'Fig 4-3', cat: corrosive ? 'Aerobic, corrosive groundwater' : 'Aerobic, non-corrosive groundwater', steps: corrosive ? ['Aeration (remove CO₂ / NH₃)', 'Post-chlorination'] : ['Post-chlorination'] };
    if (q.fe > 0.3 && q.mn > 0.1) return { fig: 'Fig 4-3', cat: 'Anaerobic groundwater with Fe & Mn', steps: ['Aeration', 'Pre-oxidation (Cl₂ / KMnO₄)', 'Coagulation / flocculation', 'Sedimentation', 'Rapid filtration', 'Post-chlorination'], alt: ['Aeration', 'Preliminary settlement', 'Slow sand filtration', 'Post-chlorination'] };
    if (q.fe > 0.3) return { fig: 'Fig 4-3', cat: 'Anaerobic groundwater with Fe', steps: ['Aeration', 'Preliminary settlement', 'Slow sand filtration', 'Post-chlorination'] };
    return { fig: 'Fig 4-3', cat: 'Anaerobic groundwater, no Fe/Mn', steps: ['Aeration (increase O₂, remove NH₃ & H₂S)', 'Post-chlorination'] };
  }
  if (q.turb < 2 && q.tc < 20) return { fig: 'Fig 4-4', cat: 'Protected hill stream (turbidity < 2 NTU)', steps: ['Post-chlorination'] };
  if (srcType !== 'river' && q.algae > 2000) return { fig: 'Fig 4-4', cat: 'Tank / lake / canal with algae', steps: ['Microstrainer', 'Oxidation', 'Coagulation / flocculation', 'Dissolved-air flotation', 'Rapid filtration', 'Post-chlorination'], alt: ['Preliminary settlement', 'Slow sand filtration', 'Post-chlorination'] };
  if (q.turb <= 20 && q.colour <= 30) return { fig: 'Fig 4-4', cat: 'Stream slightly turbid, occasionally > 2 NTU', steps: ['Roughing filter (when > 10 NTU)', 'Slow sand filtration', 'Post-chlorination'] };
  if (q.algae > 2000 || q.taste || q.turb > 100) return { fig: 'Fig 4-4', cat: 'Low-land river / tank – polluted, high turbidity, algae, T&O', steps: ['Aeration (bypassable)', 'Pre-chlorination (bypassable)', 'Coagulation / flocculation', 'Sedimentation', 'Rapid filtration', 'Post-chlorination'] };
  return { fig: 'Fig 4-4', cat: 'Stream slightly polluted, frequent high turbidity & colour', steps: ['Coagulation / flocculation (bypassable)', 'Sedimentation', 'Rapid filtration', 'Post-chlorination'] };
}
export const TRAINS_MIN = 2; // §4.3.8 – treatment "shall be divided into two or more independent trains"

// ------------------------------------------------------------------ Ch 5.1 Intake screens
export const SCREENS = {
  coarse: { open: [50, 100], angle: [22, 45], vMin: 0.4, vMax: 0.9, hl: 0.15, clause: '5.1.5.1' },
  fine: { open: [5, 20], angle: [10, 30], vAvg: [0.6, 1.0], vPeak: [1.2, 1.4], vMin: 0.4, vOpt: 0.6, hl: [0.05, 0.15], clause: '5.1.5.2' },
  blockFactor: 0.56, effOpening: 0.6, // Annex A example values
};
export const screenLoss = (V, U) => 0.0729 * Math.max(0, V * V - U * U); // §5.1.5.2 – h = (V² − U²)/(2g·0.7)
// Table 5-2 microstrainer drums (D × L mm, bed m², Q m³/d at 1.0 m/min)
export const MICROSTRAINERS = [[350, 300, 0.21, 300], [500, 700, 0.70, 1000], [700, 900, 1.98, 1750], [900, 1200, 3.39, 2290], [1200, 1500, 5.65, 4880], [1500, 2000, 9.42, 8130], [2000, 2400, 15.1, 13040], [2000, 3000, 18.8, 16240], [2800, 3600, 31.7, 27380], [2800, 4000, 35.2, 30410]];
// §5.2 pre-treatment
export const PAC = { dose: [2, 20], doseSevere: 100, contactMin: 15, slurryVmin: 1.5, iodine: [550, 1200], density: [0.36, 0.74], moistureMax: 8, clause: '5.2.3' };
export const COAG_PH = { alum: [5.5, 7.5], alumTyp: 7.0, ferric: [5.0, 8.5], ferricTyp: 7.5, enhancedAlum: [6.0, 6.5], enhancedFerric: [5.5, 6.0], alumOpt: [6.0, 7.0], minAl: [6.0, 6.5], clause: '5.2.4 / 5.4.4.1' };

// ------------------------------------------------------------------ Ch 5.3 Aeration
export const AERATORS = [
  { type: 'Cascade (weir / step)', crit: 'Drops 4–6; drop 0.30–0.60 m; overflow 0.01 m³/s per m; height 2–3 m; area 120 m² per m³/s; weir 0.2 m; inlet/outlet 0.6–1.0 m/s; freeboard 100 mm', clause: '5.3.3.2' },
  { type: 'Multiple-platform cascade', crit: 'Drops 4–6; 0.3–0.8 m; 0.01 m³/s per m; height 2–3 m; area 85–105 m² per m³/s; wind effect shall be considered', clause: '5.3.3.2' },
  { type: 'Multiple-tray (slat & coke)', crit: 'Trays 3–5; perforations 10 mm @ 50 mm; spacing 300–750 mm; height 2–3 m; media 40–70 mm × 100–250 mm deep; 0.01–0.02 m³/s per m²; area 50–160 m² per m³/s', clause: '5.3.3.3' },
  { type: 'Packed tower', crit: '40–100 m³/m²·h; packing 25–50 mm; dia 3–6 m; packing 3–5 m; air : water 30–100 : 1', clause: '5.3.3.5' },
  { type: 'Spray', crit: 'Jet 5–7 m/s; nozzle 25–40 mm @ 0.6–1.0 m; 5–10 L/s each; head 2–9 m; 10–50 Wh/m³; area 105–320 m² per m³/s', clause: '5.3.3.7' },
  { type: 'Plate (Inka)', crit: '30–40 m³/m²·h; holes 1.0–1.5 mm; open area 1.5–3 %; 30–40 Wh/m³', clause: '5.3.4.1' },
  { type: 'Diffused air', crit: 'Depth 3–4.5 m; width 3–9 m; HRT 10–30 min; W/D < 2; air 0.7–1.1 m³/m³; blower 11–45 kW per m³/s', clause: '5.3.4.2' },
];
// Table 5-8 removal efficiencies (%), CO2 / VOC / H2S / O2
export const AER_EFF = [['Cascade', '20–45', '–', '–', '–'], ['Tower (co-current, no vent)', '> 90', '> 95', '–', '85'], ['Multiple tray', '> 90', '–', '–', '–'], ['Mechanical / plate (Inka)', '75', '95', '–', '90'], ['Pressure / venturi', '–', '–', '–', '85'], ['Spray', '70–90', '78', '25–40', '78'], ['Diffused air', '80', '–', '–', '–'], ['Membrane', '90', '–', '–', '–']];
// Table 5-5 – vapour pressure (kPa) and O2 saturation (mg/L)
export const O2SAT = [[0, 0.611, 14.6], [5, 0.872, 12.75], [10, 1.23, 11.27], [15, 1.71, 10.07], [20, 2.33, 9.07], [25, 3.17, 8.24], [30, 4.24, 7.54]];
export const aerK = (T, h, coef = 0.45) => coef * (1 + 0.046 * T) * h; // §5.3.5.1 / Annex B.1 (printed p 5-31 form is an erratum)
export const AER = { drops: [4, 6], stepH: [0.3, 0.6], platformH: [0.3, 0.8], hBest: 0.7, height: [2, 3], weirLoad: 0.01, weirLoadRange: [0.010, 0.028], cascadeArea: 120, platformArea: [85, 105], trayArea: [50, 160], trays: [3, 5], traySpacing: [0.3, 0.75], trayLoad: [0.01, 0.02], tailWater: 2 / 3 };
// Table 7-1 oxidant demand (mg oxidant per mg metal) and solids produced (kg per kg)
export const OXIDANT = {
  O2: { fe: 0.14, mn: 0.29, sfe: 1.9, smn: 1.58 }, Cl2: { fe: 0.64, mn: 1.29, sfe: 1.9, smn: 1.58 }, ClO2: { fe: 0.24, mn: 2.46, sfe: 1.9, smn: 1.58 },
  KMnO4: { fe: 0.94, mn: 1.92, sfe: 2.4, smn: 2.64 }, O3: { fe: 0.43, mn: 0.87, sfe: 1.9, smn: 1.58 },
};

// ------------------------------------------------------------------ Ch 5.4 – 5.6 Coagulation, mixing, flocculation
export const COAGULANTS = [
  ['Aluminium sulphate (alum)', 'Al₂(SO₄)₃·14–18H₂O', '16 % Al₂O₃ (Sri Lanka 15–22 %)', 'lump / granular / powder', 1.3],
  ['Aluminium chloride', 'AlCl₃·6H₂O', '35 % AlCl₃', 'liquid', 1.3],
  ['Polyaluminium chloride (PACl)', 'Alₓ(OH)ᵧClᵤ', '10 % Al₂O₃', 'liquid', 1.2],
  ['Ferric sulphate', 'Fe₂(SO₄)₃·9H₂O', '68 % Fe₂(SO₄)₃', 'granular', 1.5],
  ['Ferric chloride', 'FeCl₃', '35–45 % (solution); 60 % crystal', 'solution / crystal', 1.5],
  ['Sodium aluminate', 'Na₂Al₂O₄', '38–46 %', 'liquid', 1.3],
];
export const DOSING_CONC = { alum: [3, 7], lime: [2, 10], pacl: [2, 10], kmno4: [2, 2] }; // Table 5-11 (%)
export const CHEM = { alumDose: [20, 100], stock: 10, applied: 1, appliedMin: 0.5, dayTankH: [12, 24], storageDays: 30, bulkAlum: 980, bulkLime: 670, limeSlurry: [50, 100], limeSilo: 50, paclPH: [5.0, 8.0], paclCost: [2, 3] };
/** §6.1.5 dose check by calibration cylinder: C (%) stock, t (s) to pump 1 L, Q (L/s) raw flow → mg/L */
export const doseCheck = (Cpct, tSec, QLs) => (Cpct * 10000) / (tSec * QLs);
export const RAPID_MIX = { t: [30, 60], tMax: 60, G: [500, 1000], Gmax: 3500, Gt: [30000, 60000], minTanks: 2, depthWidth: 2, impeller: [0.5, 0.8], baffle: [0.08, 0.10], nBaffles: { square: 4, circular: 6 }, staticL: [2, 4], staticHL: 0.5, jetFlow: 0.10, ReMin: 10000 };
// Table 5-13 power number k (Qasim)
export const POWER_NUMBER = [['Straight-blade turbine, 4 blade, w/d 0.15', 2.6], ['Straight-blade turbine, 4 blade, w/d 0.20', 3.3], ['Disc turbine, 4 blade, w/d 0.25', 5.1], ['Disc turbine, 6 blade, w/d 0.25', 6.2], ['Propeller, pitch 1:1', 0.3], ['Propeller, pitch 1.5:1', 0.7], ['45° pitched blade, 4 blade, w/d 0.15', 1.36], ['45° pitched blade, 4 blade, w/d 0.20', 1.94]];
// Parshall flume submergence limits (Annex C.1 Table A4): throat width W (m) → Hb/Ha
export const parshallSubmergence = (W) => (W < 0.3 ? 0.6 : W <= 2.5 ? 0.7 : 0.8);
export const FLOC = {
  hydraulic: { G: [10, 75], Ginit: 100, Gfinal: 10, taper: [75, 15], t: [20, 30], tMin: 20, v: [0.1, 0.3], hl: 0.5, baffles: [12, 20], spacingMin: 0.45, endClear: [1, 1.5], endClearMin: 0.6, depthMin: 1.0, overUnderDepth: [2, 3] },
  paddle: { G: [10, 50], t: [30, 40], stages: [3, 6], vMax: 1.0, area: [5, 20], DL: [0.5, 0.75], rpm: [1, 5] },
  turbine: { G: [10, 70], t: [20, 40], stages: [2, 4], vMax: [2, 3], area: [0.1, 0.2], DL: [0.2, 0.4], rpm: [8, 25] },
  tipMax: 0.4, tipLime: 0.5, vsd: 4, wheel: { dia: [3, 4], board: [0.10, 0.15], boardL: [2, 3.5], wall: 0.7, stageGap: 1.0, wheelGap: 1.0 },
  Gt: [1e4, 1e5],
};

// ------------------------------------------------------------------ Ch 5.7 Clarification
// Table 5-20 – recommended surface overflow rate, m³/m²·h [normal, easy, very bad]
export const SOR_TABLE = { none: [0.50, 1.00, 0.10], coag: [0.75, 1.00, 0.40], aids: [1.13, 1.50, 0.75] };
export const SED_RECT = { depth: [2.5, 4.0], LW: [3, 6], hrtCoag: [2, 4], hrtPre: [4, 6], LD: 20, weirMax: 18 /* m³/m·h */, sludgeDepth: [0.15, 0.3], freeboard: 0.3, circDmax: 60, vMax: 0.02, sludgeDrainV: 1.4, inletV: [0.15, 0.4], slopeMin: 5, slopeMech: 2, minBasins: 2, manualExtra: [1.2, 1.5], scraperArea: [30, 40], portV: [0.2, 0.3], flocVs: 1.0 };
export const SETTLERS = { rate: [2.5, 7.5], projected: [1, 2], projectedTyp: 1.2, plate: [0.7, 1.7], angleTube: 60, anglePlate: 55, spacing: [0.04, 0.05], height: [0.5, 2], velocity: [0.0025, 0.0033], Re: 50, ReAnnex: 800, Fr: 1e-5, coverTube: 0.75, coverPlate: 0.95, clearBelow: 3, launderSp: 1.5, launderLoad: 12.5, packageRate: 6 };
export const PYRAMID = { sor: [1.25, 2.5], hrt: 2, weir: 9 /* m³/m·h */, hopper: 60 };
export const PULSATOR = [['Pulsator', '2–3', '3–4.5'], ['Pulsator T (Pulsatube)', '4–6', '6–9'], ['Pulsator U (Ultra)', '9', '–']];
export const DAF = { flocT: [15, 30], hrt: [10, 20], rise: [5, 15], riseNominal: 9, riseMax: 12, pressure: [450, 620], recycle: [5, 15], contactT: [60, 240], contactLoad: [35, 100], LW: [1, 1.25], Lmax: 11, depth: [2.5, 3], crossV: [18, 100], turbMax: 100, minUnits: 2 };
// Table 5-44 sludge production constants (kg dry solids per kg) and §5.14.3.6 Method 02
export const SLUDGE_K = { turb: 1.0, turbRange: [0.5, 2], alum: 0.26, alumTheory: 0.44, ferricSulphate: 0.54, ferrousSulphate: 0.39, fecl3: 0.66, pacl: 0.8, polymer: 1, pac: 1, ca: 2.5, mg: 2.4, fe: 106.9 / 55.9, mn: 87.9 / 54.9, kmno4: 87.9 / 158, lime: 0.2 * 100 / 74, safety: [1.2, 1.6], safetyTyp: 1.4, capture: 0.9, underflow: 2, sgSolids: 2.4 };
/** Method 02 mass balance (§5.14.3.6 / Annex H). Doses mg/L, Q m³/d → kg/d dry solids reaching the sludge line */
export function sludgeMethod2({ Q, ntu = 0, tssPerNtu = 1, fe = 0, mn = 0, alum = 0, pacl = 0, fecl3 = 0, polymer = 0, lime = 0, kmno4 = 0, pac = 0, safety = 1.4, capture = 0.9 }) {
  const k = Q / 1000;
  const t = {
    raw: ntu * tssPerNtu * k, fe: SLUDGE_K.fe * fe * k, mn: SLUDGE_K.mn * mn * k, alum: SLUDGE_K.alum * alum * k, pacl: SLUDGE_K.pacl * pacl * k,
    fecl3: SLUDGE_K.fecl3 * fecl3 * k, polymer: polymer * k, lime: SLUDGE_K.lime * lime * k, kmno4: SLUDGE_K.kmno4 * kmno4 * k, pac: pac * k,
  };
  const total = Object.values(t).reduce((a, b) => a + b, 0);
  return { terms: t, total, design: total * safety * capture };
}
/** Method 01 (Davis & Cornwell): Ms (kg/d) = 86.4 Q (0.44 A + SS + M), Q in m³/s */
export const sludgeMethod1 = (Qm3s, alum, ss, misc = 0) => 86.4 * Qm3s * (0.44 * alum + ss + misc);
export const THICKENER = { slr: [20, 80], hlr: [4, 10], depth: [4.5, 6.5], hrtH: [8, 24], swd: [1.0, 1.5, 3.0], freeboard: 0.6, floorSlope: 0.2, capture: 0.95, achieve: [3, 6] };
export const DRYING_BED = { rainMax: 2200, slr: [100, 300] /* kg DS/m²·yr */, depth: [0.3, 1.0], dryDays: [5, 7], cake: [15, 30], sand: [0.3, 0.46], gravel: [0.3, 0.46], cell: [[4, 20], [15, 60]], wall: [1, 1.5], polymer: [1, 10] };
export const LAGOON = { fill: 1.2, fillMax: 1.8, load: [40, 80], landFactor: 1.5, n: 4, months: [3, 3], gwt: 2.5, perc: [25, 150], rainMax: 3000, berm: [3.0, 3.5], bermH: [1, 1.5], solids: [7, 10] };
export const MECH_DEWATER = { rainTrigger: 3000, centrifugeMinQ: 25920, bfpLoad: 150, cake: [15, 20] };
export const RECYCLE = { minPlant: 4500, recover: [2, 5], maxOfRaw: 10, noPolymer: true };
// Table 5-42 – CEA tolerance limits for discharge to inland surface waters (selected, relevant to WTP residuals)
export const CEA_DISCHARGE = [['Total suspended solids', '50 mg/L'], ['pH', '6.0 – 8.5'], ['BOD₅ (20 °C)', '30 mg/L'], ['COD', '250 mg/L'], ['Total residual chlorine', '1.0 mg/L'], ['Iron (Fe)', '3.0 mg/L'], ['Oil & grease', '10 mg/L'], ['Faecal coliform', '40 MPN/100 mL'], ['Particle size of TSS', '< 850 µm'], ['Temperature', '≤ 40 °C within 15 m downstream']];

// ------------------------------------------------------------------ Ch 5.8 – 5.13 Filtration
export const RSF = {
  rate: [5, 15], minBeds: 2, inTurb: 5, inTurbPref: 1, areaMax: 140, areaPractical: [50, 100], hl: 2.5, hlTrigger: [2.4, 3.0], run: [1, 3], runH: [12, 96],
  bwPct: [1, 6], gravel: [0.3, 0.6], sand: [0.6, 1.0], sandUsual: [0.6, 0.75], ES: [0.4, 1.2], UC: [1.2, 2.0], waterMin: 1.0, waterModern: 1.5, inletVmin: 0.6,
  underdrainRatio: 0.003, bwV: [10, 15] /* mm/s */, bwTimeMin: 5, bwTank: { washes: 2, min: 10, refill: 60 }, air: [54, 90], airP: [20, 35], airT: [2, 3],
  surfWash: [1, 20], bwHead: [8, 15], troughSpMax: 2.0, troughFB: 0.05, troughH: [0.75, 0.9], troughHAnth: [1.1, 1.2], washOutV: [2.4, 3.6], LB: [1.25, 1.33], boxMin: 2.5,
  perfDia: [6, 12], perfSp: { 6: 0.075, 12: 0.20 }, perfLat: { 6: 0.25, 12: 0.5 }, latLD: 60, latSp: 0.30, manifold: [1.5, 2.0], nozzles: 55, nozzleRange: [50, 90], effV: [1.0, 1.8],
  bwTotalPct: [1.5, 2.5], bwPower: 1.5, expansion: [15, 20], expansionFluid: [15, 30], effBW: [30, 36], rinseMin: 18, UFRVnet: [306, 509], UFRVpoor: 204, recycleMax: 10,
};
/** §5.9.2.2 – number of filters N = 1.2 √Q (Q in mgd, Kawamura) */
export const nFiltersD3 = (Qm3d) => 1.2 * Math.sqrt(Qm3d / 3785.4);
/** §5.9.2 minimum number of filters by plant size */
export const minFilters = (Qm3d) => (Qm3d > 15 * 3785.4 ? 4 : 2);
/** §5.9.2.3 practical maximum area of one gravity filter */
export const filterAreaMax = (Qm3d) => (Qm3d > 10 * 3785.4 ? 100 : 50);
// Table 5-27 / 5-32 air-scour & water backwash rates (m/h)
export const AIR_WATER = [
  ['Fine sand, ES 0.5 mm', 'Air first, then water', '37–55', '37'],
  ['Fine dual / triple media (anthracite ES 1.0 mm)', 'Air first, then water', '55–73', '37–49'],
  ['Coarse dual media (anthracite ES 1.5 mm)', 'Air; air + water on rising level; water', '73–91', '24 / 61'],
  ['Coarse sand, ES 1.0 mm', 'Air + water together; then water', '55–73', '15–17 (same or double)'],
  ['Coarse sand, ES 2.0 mm', 'Air + water together; then water', '110–146', '24–29 (same or double)'],
  ['Coarse anthracite, ES 1.5 mm', 'Air + water together; then water', '55–91', '20–24 (same or double)'],
];
// Table 5-28 media properties
export const MEDIA = [['Anthracite', '0.7–1.7', '1.45–1.73', '0.56–0.60', '0.46–0.60'], ['Silica sand', '0.3–0.7', '2.65', '0.42–0.47', '0.70–0.80'], ['Garnet', '0.4–0.6', '3.6–4.2', '0.45–0.55', '0.60'], ['GAC', '0.38–0.76', '1.30–1.50', '0.50', '0.75']];
// Table 5-34 pressure-filter water-only backwash rate (m/h) by sand ES (mm)
export const PRESSURE_BW = [[0.35, '25–35'], [0.55, '40–50'], [0.75, '55–70'], [0.95, '70–90']];
// Gravel grading rules (Huisman, §5.9.3.5)
export const GRAVEL_RULES = ['Each layer as uniform as possible: d₉₀/d₁₀ ≤ 1.41', 'Bottom layer lower size ≥ 2–3 × underdrain orifice diameter', 'Top layer lower size ≥ 4–4.5 × effective size of the media retained', 'Upper size of a coarser layer ≤ 4 × lower size of the finer layer above', 'Each layer ≥ 70 mm thick or 3 × its upper size, whichever is greater'];
/** Annex F.1 minimum sand depth: L ≥ 1200 × d10 */
export const sandDepthMin = (ESmm) => (1200 * ESmm) / 1000;
// §5.12 slow sand filtration
export const SSF = { rate: [0.1, 0.4], rateTyp: 0.1, super: [1.0, 1.5], bed: [1.0, 1.4], bedMin: [0.5, 0.8], ES: [0.15, 0.35], UC: [1.5, 3], UCpref: 2, turbBest: 10, turbPretreat: 20, turbConsider: [10, 20], turbMaxPretreated: 50, turbPreAvg: 5, box: [0.2, 1.0, 1.0, 0.3, 0.2], boxTotal: 2.7, inletV: 0.1, inletPipeV: [0.3, 0.5], hl: [0.6, 1.2], weirAboveSand: 0.2, minUnits: 2, scrape: [0.01, 0.025], ripenDays: 21, contactMin: 30 };
// Table 5-35 recommended source-water limits for conventional SSF
export const SSF_LIMITS = [['turb', 'Turbidity', '5–10 NTU', 10], ['algae', 'Algae', '200,000 /L (200 /mL)', 200], ['colour', 'True colour', '15–25 Pt-Co', 25], ['toc', 'DOC', '2.5–3.0 mg/L', 3.0], ['uv', 'UV₂₅₄', '0.080 /cm', null], ['do', 'Dissolved oxygen', '6 mg/L', null], ['po4', 'Phosphorus (PO₄)', '30 µg/L', 0.03], ['nh3', 'Ammonia (NH₃)', '3 mg/L', 3], ['fe', 'Iron', '< 1 mg/L', 1], ['mn', 'Manganese', '< 1 mg/L', 1]];
/** §5.12.5 first estimate n = 15 √Q (Q m³/s) and Table 5-36 (WHO) */
export const ssfUnits = (Qm3d) => ({ formula: 15 * Math.sqrt(Qm3d / 86400), table: Qm3d < 3000 ? 2 : Qm3d < 6000 ? 3 : Qm3d < 9000 ? 4 : Qm3d < 13500 ? 5 : null });
// §5.13 roughing filters
export const ROUGHING = { inTurb: [10, 150], vrfTurb: [50, 150], hrfPeak: [500, 1000], outTurb: 10, outSS: [2, 5], rateH: [0.3, 1.5], rateV: [0.3, 1.0], length: [5, 7], box: [9, 12], height: [1, 1.5], width: [2, 5], openings: [10, 20], drainV: [60, 90], weirDrop: [0.3, 0.4], minUnits: 2 };
// Annex C.1 Table A 3 – Parshall flume: throat W, dimensions A…G (mm) and capacity range (m³/d)
export const PARSHALL = [
  { W: 150, A: 620, B: 600, C: 390, D: 400, E: 600, F: 300, G: 600, Qmin: 122, Qmax: 9550 },
  { W: 300, A: 1370, B: 1340, C: 600, D: 850, E: 900, F: 600, G: 900, Qmin: 274, Qmax: 39500 },
  { W: 460, A: 1450, B: 1420, C: 750, D: 1030, E: 900, F: 600, G: 900, Qmin: 367, Qmax: 60200 },
  { W: 610, A: 1530, B: 1500, C: 900, D: 1210, E: 900, F: 600, G: 900, Qmin: 1030, Qmax: 81100 },
  { W: 910, A: 1680, B: 1650, C: 1200, D: 1570, E: 900, F: 600, G: 900, Qmin: 1500, Qmax: 123000 },
  { W: 1220, A: 1830, B: 1790, C: 1520, D: 1940, E: 900, F: 600, G: 910, Qmin: 3190, Qmax: 166000 },
  { W: 1520, A: 1860, B: 1940, C: 1830, D: 2150, E: 900, F: 600, G: 910, Qmin: 3920, Qmax: 210000 },
];
/** Annex C.1 free-flow equation Q = 2.273 W Ha^(1.4757 W^0.026) (Q m³/s, W and Ha in m) → Ha */
export const parshallHa = (Q, Wm) => (Q / (2.273 * Wm)) ** (1 / (1.4757 * Wm ** 0.026));
export const ROUGHING_MEDIA = [['Coarse', '24–16', '18–12', '12–8'], ['Normal', '18–12', '12–8', '8–4'], ['Fine', '12–8', '8–4', '4–2']];
// Table 5-41 tentative HRF guidelines by max SS of pre-settled water
export const hrfRate = (ssMax) => (ssMax > 300 ? [0.5, 0.5] : ssMax >= 100 ? [0.75, 1.0] : [1.0, 1.5]);
// Direct filtration screen (§5.9.11)
export const DIRECT = { turbMax: 20, colourMax: 30, ideal: { colour: 40, turb: 5, algae: 2000, fe: 0.3, mn: 0.05 }, coagMax: [10, 12] };

// ------------------------------------------------------------------ Ch 6 Chemical feeding & disinfection
// Table 6-2 baffling factors t10/τ
export const BAFFLING = [['Unbaffled', 0.1, 'none; agitated basin, very low L/W, high inlet/outlet velocities'], ['Poor', 0.3, 'single/multiple unbaffled inlets & outlets, no intra-basin baffles'], ['Average', 0.5, 'baffled inlet or outlet with some intra-basin baffles'], ['Superior', 0.7, 'perforated inlet baffle, serpentine or perforated intra-basin baffles, outlet weir or perforated launders'], ['Perfect', 1.0, 'very high L/W (pipeline flow)']];
export const baffleFactorFor = (LW) => (LW >= 40 ? 0.7 : LW >= 10 ? 0.5 : LW >= 3 ? 0.3 : 0.1);
// Table 6-4 CT (mg·min/L) for 1-log Giardia inactivation by free chlorine: [pH][T °C 5,10,20,25] at C = 1, 2, 3 mg/L
// (1-log column; the tabulated 0.5- and 2-log columns are proportional – the 2-log entry 27 at pH 7 / 20 °C / 1 mg/L is a misprint of 37)
export const CT_GIARDIA_1LOG = {
  T: [5, 10, 20, 25], C: [1, 2, 3], pH: [6, 7, 8, 9],
  v: {
    6: [[35, 26, 13, 9], [39, 29, 15, 10], [42, 32, 16, 11]],
    7: [[50, 37, 19, 12], [55, 41, 21, 14], [61, 46, 23, 15]],
    8: [[72, 54, 27, 18], [81, 61, 30, 20], [89, 67, 34, 22]],
    9: [[104, 78, 39, 26], [118, 88, 44, 29], [130, 97, 49, 32]],
  },
};
/** CT required for I-log Giardia (D3 Table 6-4). T clamped to 5–25 °C (25 °C value used above 25 °C – conservative), C to 1–3 mg/L, pH to 6–9. */
export function ctGiardiaD3(I, T, pH, C) {
  const t = Math.min(25, Math.max(5, T)), c = Math.min(3, Math.max(1, C)), p = Math.min(9, Math.max(6, pH));
  const atPH = (ph) => {
    const rows = CT_GIARDIA_1LOG.v[ph];
    const byC = rows.map((r) => interp(CT_GIARDIA_1LOG.T.map((x, i) => [x, r[i]]), t));
    return interp(CT_GIARDIA_1LOG.C.map((x, i) => [x, byC[i]]), c);
  };
  const p0 = Math.min(8, Math.floor(p)), p1 = Math.min(9, p0 + 1);
  return I * lerp(p, p0, p1, atPH(p0), atPH(p1));
}
// Table 6-5 CT for virus inactivation by free chlorine, pH 6–9 (2-, 3-, 4-log) at 5, 10, 20, 25 °C (printed headers "2, 4, 4-log" – read as 2/3/4)
export const CT_VIRUS = { T: [5, 10, 20, 25], 2: [6, 4, 3, 1], 3: [9, 6, 4, 1], 4: [12, 8, 6, 2] };
export function ctVirusD3(logs, T) {
  const L = Math.min(4, Math.max(2, Math.ceil(logs - 1e-9)));
  if (logs <= 0) return 0;
  return interp(CT_VIRUS.T.map((x, i) => [x, CT_VIRUS[L][i]]), Math.min(25, Math.max(5, T)));
}
// Table 6-7 SWTR credits [physical removal Giardia, virus; required by disinfection Giardia, virus]
export const CREDITS = { conventional: [2.5, 2, 0.5, 2], direct: [2, 1, 1, 3], ssf: [2, 2, 1, 2], de: [2, 1, 1, 3], none: [0, 0, 3, 4] };
export const RESIDUAL = { contact: [0.5, 0.8], tap: 0.2, deadEnd: 0.1, consumer: [0.2, 0.5], avoidAbove: 1.0, designDose: 2.0, contactMin: 20, whoC: 0.5, whoT: 30, whoPH: 8, whoTurb: 1, preDose: [2, 5], breakpoint: 7.6 };
export const GAS = { cylinder: 68, drum: 900, storageDays: 30, turnoverMonths: 3, drumGasMax: 180 /* kg/d */, manifold: [180, 680], evaporator: 680, ach: 60 /* per hour = 1 per minute */, naohPerCl2: 1.13, naohPct: 20, solMax: 3500, standby: 1, mixG: 400, supplyP: [2, 2.75] };
export const BLEACH = { avCl: [35, 60], design: 35, annexG: 25, solution: 1, solutionMax: 5, tankH: 24, storeMonths: 3, hypoLimitLh: 42 /* L/h of 1 % solution ≈ 0.42 kg/h av. Cl */ };
// Table 6-11 chlorinator types
export const CHLORINATOR_TYPES = [['Pressure – dry feed', 230, 'nil', 'Low'], ['Pressure – gravity feed', 230, '1500 L', 'Low'], ['Pressure – injector solution', 230, '300–1500 L', 'Low'], ['Vacuum – differential regulator', 4800, '300 L', 'High'], ['Vacuum – sonic flow', 240, '300 L', 'High']];
// Table 6-12 cylinder inventory (≥ 30 days at 2 mg/L): [kg/d, m³/d, 98 kg in use, reserve, 900 kg in use, reserve]
export const CYL_INVENTORY = [[0.5, 250, 1, 1, 1, 1], [1, 500, 1, 1, 1, 1], [2, 1000, 1, 1, 1, 1], [4, 2000, 1, 3, 1, 1], [6, 3000, 1, 5, 1, 2], [8, 4000, 1, 7, 1, 3], [10, 5000, 1, 9, 1, 4]];
export const DBP = { tthm: 100, haa5: 80, tthmStore: 80, haaStore: 60, thmRange: [0.025, 0.25] };
export const suva = (uv254, doc) => (uv254 * 100) / doc;
// Table 6-16 UV dose (mJ/cm²) for 0.5 … 4-log
export const UV_DOSE = { logs: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], crypto: [1.6, 2.5, 3.9, 5.8, 8.5, 12, 15, 22], giardia: [1.5, 2.1, 3.0, 5.2, 7.7, 11, 15, 22], virus: [39, 58, 79, 100, 121, 143, 163, 186] };
/** Annex G – bleaching powder (g) for a volume (m³) at dose (mg/L) with available chlorine (fraction) */
export const bleachingPowder = (m3, dose = 2, avCl = 0.25) => (m3 * dose) / avCl;

// ------------------------------------------------------------------ Ch 7 Specialised treatment
export const FLUORIDE_OPT = [[12.1, 1.2], [14.6, 1.1], [17.7, 1.0], [21.4, 0.9], [26.2, 0.8], [32.5, 0.7]]; // Table 7-3 (mean max air temp → mg/L)
export const fluorideOptimum = (Tair) => (FLUORIDE_OPT.find(([t]) => Tair <= t) || FLUORIDE_OPT[FLUORIDE_OPT.length - 1])[1];
export const FE_MN = { feStd: 0.3, mnStd: 0.05, aerPH: [7.0, 8.0], mnAerPH: 9.5, detention: 20, bioFe: { DO: [0.2, 0.5], pH: 6, eh: [0, 200] }, bioMn: { DO: 5, pH: 7, eh: [400, 600] }, greensand: { anth: [0.15, 0.225], sand: [0.30, 0.45], kmno4: [1, 4] } };
export const HARDNESS_CLASS = [[40, 'Soft'], [100, 'Moderately hard'], [300, 'Hard'], [500, 'Very hard'], [Infinity, 'Extremely hard']]; // Table 7-5
export const hardnessClass = (h) => HARDNESS_CLASS.find(([lim]) => h <= lim)[1];

// ------------------------------------------------------------------ Ch 8 Stability & corrosion
export const STABILITY = { pH: [6.5, 8.5], alkMin: 50, caMin: 50, ccppTarget: 4, ccppMin: -5, clso4Ratio: 0.2, clso4Each: 50, so4Max: 350, doMin: 4, lsiMin: -1.5, rsiMax: 10, aiMin: 10 };
/** Eq 8.3: pHs = 11.5 − log[Ca] − log[ALK] (Ca mg/L as Ca, ALK mg/L as CaCO₃, 25 °C, TDS < 500) */
export const pHsEq83 = (caMg, alk) => 11.5 - Math.log10(Math.max(caMg, 0.01)) - Math.log10(Math.max(alk, 0.01));
export const CCPP_BANDS = [[0, 'Scaling (protective)'], [-5, 'Passive'], [-10, 'Mildly corrosive'], [-Infinity, 'Corrosive (aggressive)']];
export const ccppText = (v) => CCPP_BANDS.find(([lim]) => v > lim || lim === -Infinity)[1];

// ------------------------------------------------------------------ Ch 9 Plant design & layout
/** §9.2.1 (Kawamura): minimum site area A (acres) ≥ Q^0.7 (Q ultimate capacity, mgd) → hectares */
export const siteAreaMinHa = (Qm3d) => 0.404686 * (Qm3d / 3785.4) ** 0.7;
export const LAYOUT = { stageYears: [5, 10], designLife: 50, rawPumpMargin: [5, 10], chemStorageDays: 30, cwrHours: 2, cwrPct: [5, 10], slope: [2, 8], slopeMax: 10, transferV: [0.15, 0.9] };
export const LAB_EQUIPMENT = ['UV/VIS spectrophotometer', 'pH meter', 'Conductivity meter', 'Analytical balance (4 decimals)', 'Culture incubators (2)', 'UV lamp', 'Refrigerators with deep freezer (2)', 'Autoclave', 'Drying oven', 'Steam bath (4-hole)', 'Jar tester', 'Residual-chlorine test kits (2)', 'Digital titrator', 'Reference weight set', 'BOD incubator', 'COD apparatus', 'Portable digital residual-chlorine meter', 'Trinocular microscope with image analyser', 'Turbidity meter', 'Centrifuge', 'Distillation plant', 'Depth sampler', 'Sedgewick-Rafter cell', 'LDO meter', 'Secchi disc', 'Microplate reader', 'Plankton net', 'Laminar-flow fume hood', 'Chlorophyll meter', 'Filtration unit', 'Hot plate / stirrer', 'Desiccator', 'UPS (2), computer, printer, A/C', 'Glassware & consumables; Standard Methods'];
export const INSTRUMENTS = ['Flow rate and totalised flow (raw, treated, backwash, recycle)', 'Filter head loss (each filter)', 'Chemical and chlorine dose rates', 'Levels – towers, sumps, tanks, chemical tanks', 'Pressures – pump suction / delivery, air scour, DAF saturator', 'Electrical parameters of drives', 'Water quality – raw, each unit and treated (turbidity, pH, residual chlorine)', 'Chlorine-leak detectors in chlorine room & store (shall)'];
// Table 9-1 – typical design criteria of a 48,000 m³/d works (reference plant)
export const REFERENCE_PLANT = [['Design flow', '555 L/s raw (48,000 m³/d); 530 L/s treated (4.7 % losses)'], ['Travelling screens', '2 × 2.0 m; 0.45 m/s'], ['Raw-water pumps', '3 (incl. standby), 278 L/s @ 20 m, 93 kW'], ['Rapid mix', '1 × 11.2 m³; 20 s; G = 1000 s⁻¹; 15 kW'], ['Flocculation', '2 × 333.6 m³; 23 min'], ['Settling basins', '2 × 13.9 × 45.0 m × 2.44 m SWD; 1.6 m/h; 1.5 h; weir 2.89 L/s·m'], ['Filters', '8 × 34.4 m² (4.3 × 8.0 m); 7.3 m/h; HL 1.8–2.5 m; backwash 35–50 m/h; surface wash 5–10 m/h'], ['Treated-water reservoir', '4,600 m³; 2.41 h'], ['Chlorine', '900 kg cylinders; pre 1–5, post 1–2 mg/L; 1 duty + 1 standby chlorinators; 90 d storage'], ['Alum', '10–60 mg/L; 2 day tanks × 12.96 m³'], ['Lime', 'PD pumps 1 duty + 1 standby (pre and post); 5 % solution; 90 d storage']];
export const LAYOUT_CHECKLIST = [
  ['9.2.8', 'Site slope ideally 2–8 % (> 10 % needs extensive cut & fill)'], ['9.2.10', 'Site above the 100-year flood; intake pumps & motors above HFL'], ['9.2.9', 'Soil investigation before detailed design'],
  ['9.2.12', 'Permits: IEE/EIA (CEA), water rights, EPL for discharges, COC'], ['9.2.6', 'All-weather access suitable for chemical trucks'], ['9.2.7', 'Three-phase power + standby generator'],
  ['9.4.1', 'Redundancy – remaining units carry the full flow with one out of service; standby pumps & chlorinators'], ['9.4.2', 'Cross-connections between trains and bypass of a failed unit'],
  ['9.5.1', 'Flat hydraulic profile; inter-unit and emergency overflows'], ['9.5.2', 'Flocculated-water conveyance 0.15–0.9 m/s; equal flow split'], ['9.5.3', 'Single chemical application points (whole flow)'],
  ['9.5.4', 'No single common wall between filtered and unfiltered water'], ['9.5.5', 'Finished-water storage ≥ 2 h (5–10 % of capacity)'], ['9.5.8', 'Hazardous chemicals near feeders, away from admin; spill containment; segregation'],
  ['9.6', 'Expansion provisions – blind flanges, knock-out walls, stop-plank grooves, utility corridors'], ['9.7.2', 'Central laboratory, vibration-free, independent HVAC (Table 9-3 equipment)'], ['9.8', 'P&ID with legend; instrument list; Auto / Manual / Stop for every automatic control'],
  ['9.2.13', 'Security fencing, guard room, CCTV (shall); elephant fences / bird nets where needed'],
];

// ------------------------------------------------------------------ Annex I – water properties
// [T °C, γ kN/m³, ρ kg/m³, μ ×10⁻³ Pa·s, ν ×10⁻⁶ m²/s, σ N/m, E ×10⁹ N/m², pv kPa]
export const WATER_PROPS = [
  [0, 9.805, 999.8, 1.781, 1.785, 0.0765, 1.98, 0.61], [5, 9.807, 1000, 1.518, 1.519, 0.0749, 2.05, 0.87], [10, 9.804, 999.7, 1.307, 1.306, 0.0742, 2.1, 1.23],
  [15, 9.798, 999.1, 1.139, 1.139, 0.0735, 2.15, 1.7], [20, 9.789, 998.2, 1.002, 1.003, 0.0728, 2.17, 2.34], [25, 9.777, 997, 0.89, 0.893, 0.072, 2.22, 3.17],
  [30, 9.764, 995.7, 0.798, 0.8, 0.0712, 2.25, 4.24], [40, 9.73, 992.2, 0.653, 0.658, 0.0696, 2.28, 7.38], [50, 9.689, 988, 0.547, 0.553, 0.0679, 2.29, 12.33],
  [60, 9.642, 983.2, 0.466, 0.474, 0.0662, 2.28, 19.92], [70, 9.589, 977.8, 0.404, 0.413, 0.0644, 2.25, 31.16], [80, 9.53, 971.8, 0.354, 0.364, 0.0626, 2.2, 47.34],
  [90, 9.466, 965.3, 0.315, 0.326, 0.0608, 2.14, 70.1], [100, 9.399, 958.4, 0.282, 0.294, 0.0589, 2.07, 101.33],
];
export const waterProp = (T, col) => interp(WATER_PROPS.map((r) => [r[0], r[col]]), T);

// ------------------------------------------------------------------ Manual errata (value used by the app)
export const ERRATA = [
  ['Table 2-4', 'Cadmium printed 0.03 mg/L; Table 2-13 gives SLS 3 µg/L', 'App uses 0.003 mg/L (SLS 614:2013 / WHO)'],
  ['Table 2-4', 'Residual free chlorine printed 0.5 mg/L; Table 2-13 gives SLS 1,000 µg/L', 'App screens treated water at 1.0 mg/L and designs the plant residual at 0.5–0.8 mg/L (§6.3.5)'],
  ['§5.3.5.1', 'Aeration coefficient printed K = 0.452(1 + 0.46T)h (gives K > 1)', 'App uses the Annex B.1 form K = 0.45(1 + 0.046T)h'],
  ['§5.3.5.2', 'Spray flight time printed without the square root', 'App uses t = 2·Cv·sin α·√(2h/g)'],
  ['§5.5', 'G formula states P in kW', 'App uses P in W (SI)'],
  ['p 5-57', 'Paddle tip speed printed 4 m/s (strong floc) and 2 m/s (weak floc)', 'App limits tip speed to 0.4 m/s (§5.6, Annex D.2)'],
  ['§5.7.5', 'Solids-contact loading printed "24–36 m³/m²/hr", weir "8–15 m³/m²/hr"', 'Read as m³/m²·d and m³/m·h; not used for rectangular basins'],
  ['§5.7.7 / Annex E.2', 'Settler Reynolds number < 50 (criteria list) vs < 800 (Annex E.2); the listed tube velocity 2.5–3.3 mm/s itself gives Re ≈ 150–200', 'App warns above 200 (laminar, Yao) and fails above 800'],
  ['§5.9.1', 'Filtration rate printed "40–60 m³/m²/hr" in the criteria list', 'App uses 5–15 m/h (Table 5-26, §5.9)'],
  ['Table 6-4', '2-log Giardia CT at pH 7, 20 °C, 1 mg/L printed 27 (USEPA 37)', 'App interpolates the 1-log column × required log'],
  ['Table 6-5 / 6-6', 'Virus column headers printed "2, 4, 4-log" / "0.5, 1, 2-log"', 'Read as 2-, 3-, 4-log (matching USEPA values)'],
  ['Table 8-4', 'pHs = (9.0 + A + B) − (C + D)', 'App uses 9.3 (consistent with Eq 8.3 and the Larson–Buswell source)'],
  ['Annex H / §5.14', 'KMnO₄ term computed with 0.4 mg/L although the stated dose is 4 mg/L; thickener diameter printed 1.1 m (√(4A/π) = 1.95 m)', 'App uses the stated dose and the correct formula'],
  ['§6.5', 'Cylinder sizes 68, 98 and 67 kg; ton-container withdrawal 10 kg/h vs 180 kg/d', 'App uses 68 kg cylinders / 900 kg drums and 180 kg/d (7.5 kg/h) per drum'],
];

// ------------------------------------------------------------------ Clause index (clause, title, rule applied, app module)
export const CLAUSES = [
  ['2.3.1', 'SLS 614:2013 drinking-water standard (Table 2-4)', 'Predicted treated water screened against SLS 614; filtered-water design target 0.2 NTU', 'compliance'],
  ['2.3.2', 'SLS 722:1985 raw-water tolerance limits (Table 2-6)', 'Raw-water quality screened against SLS 722 (coliform 5,000, pH 6–9, DO ≥ 4, BOD 5 …)', 'quality'],
  ['4.3.6', 'Selection of unit processes (Table 4-5)', 'Essential / optional processes for each raw-water characteristic compared with the selected train', 'process'],
  ['4.3.8', 'Arrangement of treatment process', 'Two or more independent trains (shall); inter-unit levels from head-loss calculations', 'process'],
  ['4.5', 'Water Safety Plan / source protection', 'Backside raw-water storage 1–2 d for direct river intakes (advisory)', 'source'],
  ['5.1.5', 'Rakes and screens', 'Coarse 50–100 mm, 0.4–0.9 m/s; fine 5–20 mm, 0.6–1.0 m/s (≤ 1.4); h = 0.0729(V² − U²) ≤ 0.15 m', 'intake'],
  ['5.2.3', 'PAC dosing', 'PAC 2–20 mg/L, contact ≥ 15 min, before coagulant and away from chlorine', 'coag'],
  ['5.2.4', 'Control of pH', 'Alum 5.5–7.5 (typ 7.0); ferric 5.0–8.5; pH correction before coagulant', 'coag'],
  ['5.3', 'Aeration and gas stripping', 'Cascade 4–6 drops of 0.3–0.6 m, 0.01–0.028 m³/s per m, 120 m² per m³/s; trays 3–5 at 0.3–0.75 m, 50–160 m² per m³/s; K = 0.45(1 + 0.046T)h', 'aeration'],
  ['5.4', 'Chemical coagulation', 'Alum optimum pH 6.0–7.0; dosing strength (Table 5-11); duplicate feeders; ≥ 1 month storage', 'coag'],
  ['5.5', 'Rapid / flash mix', 'G 500–1,000 s⁻¹ (≤ 3,500), t < 60 s (mechanical 30–60 s), Gt 30,000–60,000, ≥ 2 tanks', 'rapidmix'],
  ['5.6', 'Flocculators', 'G 10–75 s⁻¹ tapered, t ≥ 20 min, channel 0.1–0.3 m/s, baffle spacing ≥ 0.45 m, tip speed ≤ 0.4 m/s, paddle area 5–20 %', 'floc'],
  ['5.7.1', 'Horizontal-flow sedimentation', 'SOR Table 5-20, depth 2.5–4 m, L/W 3–6, t 2–4 h, v < 0.02 m/s, weir < 18 m³/m·h, ≥ 2 basins, floor ≥ 5 %', 'sed'],
  ['5.7.7', 'Tube / plate settlers', 'Settling-zone 2.5–7.5 m/h; tubes 60°, 50 mm; Re < 50; coverage ≤ 0.75', 'sed'],
  ['5.7.8', 'Dissolved-air flotation', 'Rise 5–15 m/h, HRT 10–20 min, recycle 5–15 %, saturator 450–620 kPa (reference)', 'sed'],
  ['5.8.3', 'Microorganism removal by filtration', 'Filtered turbidity < 0.3 NTU (95 %), never > 1 NTU', 'filt'],
  ['5.9', 'Rapid sand filters', 'Rate 5–15 m/h; N = 1.2√Q; ≥ 2 beds; area ≤ 50/100 (140) m²; ES 0.4–1.2 mm, UC 1.2–2.0; depth 0.6–1.0 m; water ≥ 1 m; backwash 36–54 m/h; air 54–90 m/h; troughs ≤ 2 m apart, 0.75–0.9 m above media', 'filt'],
  ['5.9.13', 'Filter operation & efficiency', 'Net production UFRV − UBWV 306–509 m³/m² (≤ 204 poor); influent ≤ 4–5 NTU', 'filt'],
  ['5.9.14', 'Backwash water recovery', 'Waste wash water 1–5 %; recycle ≤ 10 % of raw inflow over 24 h', 'sludge'],
  ['5.12', 'Slow sand filtration', 'Rate 0.1–0.4 m/h; supernatant 1.0–1.5 m; sand 1.0–1.4 m, ES 0.15–0.35, UC 1.5–3; ≥ 2 units; pre-treatment ≥ 20 NTU', 'filt'],
  ['5.13', 'Roughing filtration', 'HRF 0.3–1.5 m/h (Table 5-41), length 5–7 m; VRF 0.3–1.0 m/h; effluent ≤ 10 NTU', 'filt'],
  ['5.14', 'Sludge treatment', 'Method 02 mass balance (Table 5-44, ×1.4, 90 % capture); thickener 20–80 kg/m²·d, 4–10 m³/m²·d, 4.5–6.5 m; drying beds 100–300 kg/m²·yr (rain < 2,200 mm)', 'sludge'],
  ['6.1', 'Chemical feeding', 'Stock 10 % (2–10 %), ≤ 1 % at diffuser; day tanks 24 h; ≥ 1 month storage; standby feeders', 'coag'],
  ['6.2.5', 'Disinfection requirement – CT', 'Σ CT/CTtab ≥ 1 at peak hour with T₁₀ (Tables 6-2, 6-4, 6-5, 6-7)', 'dis'],
  ['6.3.5', 'Recommended residual chlorine', 'Contact basin 0.5–0.8 mg/L; taps 0.2; dead ends 0.1; avoid > 1.0 mg/L at the plant', 'dis'],
  ['6.3.6', 'Chlorine dosage & contact time', 'Design dose 2 mg/L; contact ≥ 20 min (WHO 30 min)', 'dis'],
  ['6.4', 'Bleaching powder', 'Design on 35 % available Cl; 1 % solution; 24 h tanks; ≤ 3 months storage; hypochlorination limit ≈ 42 L/h of 1 % solution', 'dis'],
  ['6.5', 'Gas chlorination', '1 duty + 1 standby chlorinator; ≥ 30 days cylinders; ≤ 180 kg/d per drum (gas); 1 air change/min; 20 % NaOH scrubber', 'dis'],
  ['6.10', 'Disinfection by-products', 'TTHM ≤ 100 µg/L, HAA5 ≤ 80 µg/L; avoid pre-chlorination with high TOC', 'dis'],
  ['7.1', 'Iron & manganese removal', 'Oxidant demand Table 7-1; Mn needs pH ≥ 9.5 by aeration or a strong oxidant; ≥ 20 min detention', 'aeration'],
  ['7.2', 'Fluoride', 'SLS 614 1.0 mg/L; removal methods Table 7-4', 'process'],
  ['8', 'Water stability & corrosion control', 'pH 6.5–8.5; LSI > −1.5; RSI < 10; CCPP > −5 (target ≈ +4); Alk & Ca ≥ 50 mg/L', 'stab'],
  ['9.1', 'Plant design principles', 'Raw pumps 5–10 % above output; ≥ 1 month chemicals; ≥ 2 h clear-water storage', 'layout'],
  ['9.2.1', 'Minimum site area', 'A (acres) ≥ Q^0.7 (mgd), Kawamura', 'layout'],
  ['9.4', 'Factors affecting plant layout', 'Redundancy (N − 1), flexibility, access, roads, chemical delivery, security', 'layout'],
  ['9.5.2', 'Conveyance between process units', 'Flocculated water 0.15–0.9 m/s', 'hyd'],
  ['9.7.2', 'Laboratory facilities', 'Minimum laboratory equipment (Table 9-3)', 'layout'],
  ['Annex I', 'Properties of water', 'ρ, μ, ν vs temperature used in all hydraulic calculations', 'quality'],
];
