// Sri Lanka context data: provinces, districts, climatic zones, typical water temperature, monsoon turbidity shapes,
// and regional water-quality alerts relevant to NWSDB scheme planning.

export const PROVINCES = {
  Western: ['Colombo', 'Gampaha', 'Kalutara'],
  Central: ['Kandy', 'Matale', 'Nuwara Eliya'],
  Southern: ['Galle', 'Matara', 'Hambantota'],
  Northern: ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
  Eastern: ['Batticaloa', 'Ampara', 'Trincomalee'],
  'North Western': ['Kurunegala', 'Puttalam'],
  'North Central': ['Anuradhapura', 'Polonnaruwa'],
  Uva: ['Badulla', 'Monaragala'],
  Sabaragamuwa: ['Ratnapura', 'Kegalle'],
};
export const DISTRICTS = Object.entries(PROVINCES).flatMap(([p, ds]) => ds.map((d) => ({ district: d, province: p })));
export const provinceOf = (d) => DISTRICTS.find((x) => x.district === d)?.province || '';

// zone: wet (SW monsoon dominant), dry (NE monsoon dominant), intermediate, hill
const ZONE = {
  Colombo: 'wet',
  Gampaha: 'wet',
  Kalutara: 'wet',
  Galle: 'wet',
  Matara: 'wet',
  Ratnapura: 'wet',
  Kegalle: 'wet',
  Kandy: 'intermediate',
  Matale: 'intermediate',
  'Nuwara Eliya': 'hill',
  Badulla: 'intermediate',
  Monaragala: 'dry',
  Kurunegala: 'intermediate',
  Puttalam: 'dry',
  Hambantota: 'dry',
  Anuradhapura: 'dry',
  Polonnaruwa: 'dry',
  Trincomalee: 'dry',
  Batticaloa: 'dry',
  Ampara: 'dry',
  Jaffna: 'dry',
  Kilinochchi: 'dry',
  Mannar: 'dry',
  Vavuniya: 'dry',
  Mullaitivu: 'dry',
};
export const zoneOf = (d) => ZONE[d] || 'wet';
export const ZONE_LABEL = {
  wet: 'Wet zone – south-west monsoon (May–Sep) & 2nd inter-monsoon (Oct–Nov)',
  dry: 'Dry zone – north-east monsoon (Dec–Feb) & 2nd inter-monsoon (Oct–Nov)',
  intermediate: 'Intermediate zone – both monsoons, peak Oct–Dec',
  hill: 'Central highlands – cool, both monsoons',
};
const TEMP = { 'Nuwara Eliya': 17, Badulla: 23, Kandy: 25, Matale: 26, Kegalle: 27, Ratnapura: 27, Monaragala: 27 };
export const waterTempOf = (d) => TEMP[d] ?? 28;
const ELEV = {
  'Nuwara Eliya': 1850,
  Badulla: 680,
  Kandy: 500,
  Matale: 360,
  Kegalle: 120,
  Ratnapura: 40,
  Monaragala: 150,
  Kurunegala: 115,
  Anuradhapura: 80,
  Polonnaruwa: 60,
  Vavuniya: 100,
};
export const elevationOf = (d) => ELEV[d] ?? 10;

// Relative monthly turbidity shape (1.0 = design peak). Jan..Dec
export const TURB_SHAPE = {
  wet: [0.12, 0.1, 0.14, 0.35, 0.95, 0.85, 0.4, 0.32, 0.42, 1.0, 0.9, 0.3],
  dry: [0.45, 0.18, 0.1, 0.16, 0.12, 0.07, 0.06, 0.07, 0.12, 0.5, 0.95, 1.0],
  intermediate: [0.3, 0.12, 0.15, 0.4, 0.45, 0.25, 0.18, 0.18, 0.25, 0.85, 1.0, 0.75],
  hill: [0.3, 0.15, 0.18, 0.4, 0.7, 0.75, 0.55, 0.45, 0.45, 0.9, 1.0, 0.6],
};
/**
 * Build a 12-month profile of MONTHLY-MEAN turbidity: the zone's monsoon shape scaled so that the annual mean
 * equals `avg`; individual months are capped at the design (storm) peak, which is used separately for sizing.
 */
export function monthlyProfile(zone, avg, peak) {
  const s = TURB_SHAPE[zone] || TURB_SHAPE.wet;
  const sm = s.reduce((a, b) => a + b, 0) / 12;
  return s.map((v) => +Math.min(peak || Infinity, (avg * v) / sm).toFixed(1));
}

// Regional alerts (screening-level; verify with NWSDB water-quality laboratory data)
const FLUORIDE = [
  'Anuradhapura',
  'Polonnaruwa',
  'Vavuniya',
  'Kurunegala',
  'Puttalam',
  'Monaragala',
  'Badulla',
  'Ampara',
  'Trincomalee',
  'Hambantota',
  'Matale',
  'Mullaitivu',
  'Kilinochchi',
];
const CKDU = [
  'Anuradhapura',
  'Polonnaruwa',
  'Kurunegala',
  'Badulla',
  'Monaragala',
  'Ampara',
  'Trincomalee',
  'Vavuniya',
  'Mullaitivu',
  'Matale',
  'Hambantota',
  'Puttalam',
];
const SALINE_RIVER = ['Colombo', 'Gampaha', 'Kalutara', 'Galle', 'Matara', 'Batticaloa', 'Hambantota', 'Puttalam'];
const IRON_GW = ['Gampaha', 'Colombo', 'Kalutara', 'Galle', 'Matara', 'Ratnapura', 'Kegalle'];
const JAFFNA = ['Jaffna', 'Kilinochchi', 'Mannar'];

export function regionalAlerts(district, source) {
  const out = [];
  const gw = source === 'groundwater';
  if (FLUORIDE.includes(district))
    out.push({
      level: gw ? 'fail' : 'warn',
      title: 'Fluoride',
      text: `${district} lies in the dry-zone fluoride belt. Groundwater frequently exceeds SLS 614 (1.0 mg/L F⁻); surface tanks can also be elevated in the dry season. Conventional treatment does not remove fluoride — confirm with laboratory data and consider source selection/blending.`,
    });
  if (CKDU.includes(district))
    out.push({
      level: 'warn',
      title: 'CKDu-affected area',
      text: 'Chronic kidney disease of unknown aetiology is prevalent in parts of this district. Prioritise a safe surface source, monitor hardness, fluoride and heavy metals, and plan residual-chlorine coverage to the far end of the network.',
    });
  if (SALINE_RIVER.includes(district) && !gw)
    out.push({
      level: 'warn',
      title: 'Salinity intrusion',
      text: 'Coastal river intakes in this district can experience saline intrusion during dry spells (e.g. Kelani at Ambatale, Kalu at Kalutara). Check chloride/conductivity at the intake during low flows; consider an upstream intake, salinity barrier or raw-water storage.',
    });
  if (IRON_GW.includes(district))
    out.push({
      level: gw ? 'warn' : 'info',
      title: 'Iron / colour',
      text: 'Wet-zone lateritic catchments give acidic, low-alkalinity water with iron and humic colour. Expect low natural alkalinity (lime for coagulation) and post-lime for stabilisation.',
    });
  if (JAFFNA.includes(district))
    out.push({
      level: 'warn',
      title: 'Karstic aquifer',
      text: 'Limestone aquifer: hardness, nitrate and salinity are typical constraints for groundwater sources.',
    });
  const z = zoneOf(district);
  if (z === 'hill')
    out.push({
      level: 'info',
      title: 'Cold water',
      text: 'Low water temperature slows flocculation and settling and raises CT requirements — the design uses the district temperature automatically.',
    });
  out.push({
    level: 'info',
    title: 'Monsoon pattern',
    text:
      ZONE_LABEL[z] + '. The monthly turbidity profile, chemical consumption and sludge estimates follow this pattern.',
  });
  return out;
}

// Area-type presets for per-capita demand (NWSDB Design Guide 1989: 140 L/c/d for house connections)
export const AREA_PRESETS = {
  mc: { label: 'Municipal Council (urban)', lpcd: 140, nonDom: 25 },
  uc: { label: 'Urban Council', lpcd: 130, nonDom: 20 },
  ps: { label: 'Pradeshiya Sabha (semi-urban)', lpcd: 110, nonDom: 15 },
  rural: { label: 'Rural (house connections)', lpcd: 90, nonDom: 10 },
};

// Typical urban diurnal demand pattern (fraction of average hourly flow), hours 0..23
export const DIURNAL = [
  0.45, 0.4, 0.38, 0.4, 0.6, 1.2, 1.75, 1.8, 1.5, 1.2, 1.05, 1.0, 1.05, 1.0, 0.9, 0.9, 1.1, 1.45, 1.65, 1.5, 1.2, 0.9,
  0.65, 0.5,
];

export const PERCH_M2 = 25.2929;
export const ACRE_M2 = 4046.856;
