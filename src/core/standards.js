// SLS 614:2013 (Sri Lanka Standard for Potable Water, 1st revision) – as tabulated in the lecture notes,
// plus WHO GDWQ (4th ed.) values and the proposed SLSI/CEA ambient guideline for raw water used for drinking
// (conventional treatment). Raw-water defaults are typical of a wet-zone Sri Lankan river intake.

// type: 'max' | 'range' | 'nd' (not detected) | 'info'
// group: phys | chem | tox | bact | info
// raw: [average, design/worst]
export const PARAMS = [
  // Physical / organoleptic
  { key: 'turb', name: 'Turbidity', unit: 'NTU', group: 'phys', sls: 2, type: 'max', who: null, raw: [25, 150], dec: 1 },
  { key: 'colour', name: 'Colour', unit: 'Hazen', group: 'phys', sls: 15, type: 'max', rawGl: 100, raw: [25, 60], dec: 0 },
  { key: 'pH', name: 'pH', unit: '–', group: 'phys', sls: [6.5, 8.5], type: 'range', rawGl: [6, 9], raw: [6.9, 6.6], dec: 2 },
  { key: 'temp', name: 'Temperature', unit: '°C', group: 'info', type: 'info', raw: [28, 28], dec: 1 },
  { key: 'tds', name: 'Total dissolved solids', unit: 'mg/L', group: 'chem', sls: 500, type: 'max', raw: [70, 90], dec: 0 },
  { key: 'ec', name: 'Electrical conductivity', unit: 'µS/cm', group: 'info', type: 'info', raw: [110, 140], dec: 0 },
  { key: 'alk', name: 'Total alkalinity', unit: 'mg/L CaCO₃', group: 'chem', sls: 200, type: 'max', raw: [35, 25], dec: 0, worstLow: true },
  { key: 'hard', name: 'Total hardness', unit: 'mg/L CaCO₃', group: 'chem', sls: 250, type: 'max', raw: [35, 40], dec: 0 },
  { key: 'ca', name: 'Calcium (as Ca)', unit: 'mg/L', group: 'chem', sls: 100, type: 'max', raw: [9, 8], dec: 1, worstLow: true },
  { key: 'mg', name: 'Magnesium (as Mg)', unit: 'mg/L', group: 'chem', sls: 30, type: 'max', raw: [3, 4], dec: 1 },
  { key: 'na', name: 'Sodium (as Na)', unit: 'mg/L', group: 'chem', sls: 200, type: 'max', who: null, raw: [8, 12], dec: 1 },
  { key: 'cl', name: 'Chloride (as Cl⁻)', unit: 'mg/L', group: 'chem', sls: 250, type: 'max', raw: [12, 30], dec: 1 },
  { key: 'so4', name: 'Sulphate (as SO₄²⁻)', unit: 'mg/L', group: 'chem', sls: 250, type: 'max', raw: [6, 10], dec: 1 },
  { key: 'fe', name: 'Iron (as Fe)', unit: 'mg/L', group: 'chem', sls: 0.3, type: 'max', raw: [0.5, 1.2], dec: 2 },
  { key: 'mn', name: 'Manganese (as Mn)', unit: 'mg/L', group: 'chem', sls: 0.1, type: 'max', raw: [0.04, 0.12], dec: 3 },
  { key: 'nh3', name: 'Free ammonia (as NH₃)', unit: 'mg/L', group: 'chem', sls: 0.06, type: 'max', raw: [0.05, 0.15], dec: 3 },
  { key: 'no3', name: 'Nitrate (as NO₃⁻)', unit: 'mg/L', group: 'chem', sls: 50, type: 'max', who: 50, rawGl: 5, raw: [1.5, 3], dec: 1 },
  { key: 'no2', name: 'Nitrite (as NO₂⁻)', unit: 'mg/L', group: 'chem', sls: 3, type: 'max', who: 3, raw: [0.02, 0.05], dec: 3 },
  { key: 'f', name: 'Fluoride (as F⁻)', unit: 'mg/L', group: 'chem', sls: 1.0, type: 'max', who: 1.5, raw: [0.15, 0.25], dec: 2 },
  { key: 'po4', name: 'Total phosphates (as PO₄³⁻)', unit: 'mg/L', group: 'chem', sls: 2.0, type: 'max', rawGl: 0.7, raw: [0.15, 0.3], dec: 2 },
  { key: 'cod', name: 'Chemical oxygen demand', unit: 'mg/L', group: 'chem', sls: 10, type: 'max', raw: [12, 25], dec: 0 },
  { key: 'al', name: 'Aluminium (as Al)', unit: 'mg/L', group: 'chem', sls: 0.2, type: 'max', rawGl: 0.2, raw: [0.05, 0.1], dec: 3 },
  { key: 'cu', name: 'Copper (as Cu)', unit: 'mg/L', group: 'chem', sls: 1.0, type: 'max', who: 2, raw: [0.005, 0.01], dec: 3 },
  { key: 'zn', name: 'Zinc (as Zn)', unit: 'mg/L', group: 'chem', sls: 3.0, type: 'max', raw: [0.01, 0.03], dec: 3 },
  { key: 'ni', name: 'Nickel (as Ni)', unit: 'mg/L', group: 'tox', sls: 0.02, type: 'max', who: 0.07, raw: [0.002, 0.005], dec: 4 },
  { key: 'as', name: 'Arsenic (as As)', unit: 'mg/L', group: 'tox', sls: 0.01, type: 'max', who: 0.01, raw: [0.001, 0.002], dec: 4 },
  { key: 'cd', name: 'Cadmium (as Cd)', unit: 'mg/L', group: 'tox', sls: 0.003, type: 'max', who: 0.003, raw: [0.0003, 0.0005], dec: 4 },
  { key: 'cr', name: 'Chromium (as Cr)', unit: 'mg/L', group: 'tox', sls: 0.05, type: 'max', who: 0.05, raw: [0.002, 0.005], dec: 4 },
  { key: 'pb', name: 'Lead (as Pb)', unit: 'mg/L', group: 'tox', sls: 0.01, type: 'max', who: 0.01, raw: [0.002, 0.004], dec: 4 },
  { key: 'hg', name: 'Mercury (as Hg)', unit: 'mg/L', group: 'tox', sls: 0.001, type: 'max', who: 0.006, raw: [0.0001, 0.0002], dec: 5 },
  { key: 'se', name: 'Selenium (as Se)', unit: 'mg/L', group: 'tox', sls: 0.01, type: 'max', who: 0.04, raw: [0.001, 0.001], dec: 4 },
  { key: 'cn', name: 'Cyanide (as CN⁻)', unit: 'mg/L', group: 'tox', sls: 0.05, type: 'max', raw: [0.001, 0.002], dec: 4 },
  // Bacteriological
  { key: 'tc', name: 'Total coliforms', unit: 'MPN/100 mL', group: 'bact', sls: 3, type: 'max', rawGl: 5000, raw: [2400, 16000], dec: 0, note: 'Treatment works: ≤ 3 in any sample, ND in consecutive samples' },
  { key: 'ec_', name: 'E. coli (thermotolerant coliforms)', unit: 'MPN/100 mL', group: 'bact', sls: 0, type: 'nd', raw: [240, 1600], dec: 0 },
  // Information / process parameters (no SLS limit)
  { key: 'toc', name: 'Total organic carbon', unit: 'mg/L', group: 'info', type: 'info', raw: [3, 6], dec: 1 },
  { key: 'do', name: 'Dissolved oxygen', unit: 'mg/L', group: 'info', type: 'info', raw: [6.5, 5], dec: 1, worstLow: true },
  { key: 'co2', name: 'Free carbon dioxide', unit: 'mg/L', group: 'info', type: 'info', raw: [5, 10], dec: 1 },
  { key: 'h2s', name: 'Hydrogen sulphide', unit: 'mg/L', group: 'info', type: 'info', raw: [0, 0], dec: 2 },
  { key: 'algae', name: 'Algae count', unit: 'cells/mL', group: 'info', type: 'info', raw: [300, 1500], dec: 0 },
  { key: 'tss', name: 'Suspended solids', unit: 'mg/L', group: 'info', type: 'info', raw: [35, 220], dec: 0 },
];
export const PARAM = Object.fromEntries(PARAMS.map((p) => [p.key, p]));

export function exceeds(p, v) {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  if (p.type === 'max') return v > p.sls + 1e-12;
  if (p.type === 'range') return v < p.sls[0] || v > p.sls[1];
  if (p.type === 'nd') return v > 0;
  return null;
}
export function limitText(p) {
  if (p.type === 'max') return `≤ ${p.sls}`;
  if (p.type === 'range') return `${p.sls[0]} – ${p.sls[1]}`;
  if (p.type === 'nd') return 'Not detected';
  return '—';
}
export function rawGlText(p) {
  if (p.rawGl === undefined) return '—';
  return Array.isArray(p.rawGl) ? `${p.rawGl[0]} – ${p.rawGl[1]}` : `≤ ${p.rawGl}`;
}
export function rawGlExceeds(p, v) {
  if (p.rawGl === undefined || v === undefined) return null;
  return Array.isArray(p.rawGl) ? v < p.rawGl[0] || v > p.rawGl[1] : v > p.rawGl;
}
