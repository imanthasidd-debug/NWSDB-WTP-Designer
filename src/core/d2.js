// NWSDB Design Manual D2 – "Urban Water Supply and Distribution" (Ministry of Local Government, Housing and
// Construction / National Water Supply & Drainage Board, March 1989).
// Tables, rules and formulae transcribed from the manual and used throughout the application. Every value carries
// its clause so that checks, calculation sheets and the report can cite it. (Treatment-process design is the
// subject of companion manual D3; D2 governs demand, hydrology, intakes, pumping, mains, storage and costing.)

export const D2 = {
  code: 'D2',
  title: 'NWSDB Design Manual D2 – Urban Water Supply and Distribution',
  date: 'March 1989',
  short: 'NWSDB D2 (1989)',
  companions: [['D1', 'Rural Water Supply'], ['D3', 'Water Quality and Treatment'], ['D4', 'Ground Water'], ['D5', 'Mechanical, Electrical & Instrumentation Aspects of Water Supply Design'], ['P1', 'Project Planning & Feasibility']],
};
export const ref = (clause) => `NWSDB D2 §${clause}`;
export const isD2 = (src) => typeof src === 'string' && /\bD2\b/.test(src);

// ------------------------------------------------------------------ §2.4 Design period
export const DESIGN_PERIODS = [
  { item: 'Major dams for impounding reservoirs', years: 50, remark: 'Height of dam may be considered in two stages' },
  { item: 'Minor dams, weirs', years: 20, remark: 'Not suited to staging' },
  { item: 'Raw-water intakes, infiltration galleries', years: 20, remark: 'If practicable may be considered in 2 stages' },
  { item: 'Pumpsets, water-treatment plant (M&E)', years: 10, remark: 'Replacement period' },
  { item: 'Pumphouses', years: 20, remark: 'Not suited to staging' },
  { item: 'Water-treatment structures', years: 20, remark: 'If economical may be considered in two stages' },
  { item: 'Transmission mains', years: 20, remark: 'If economical may be considered in two stages' },
  { item: 'Ground service reservoirs', years: 20, remark: 'If economical may be considered in two stages' },
  { item: 'Water towers', years: 20, remark: 'Not suited to staging' },
  { item: 'Distribution systems', years: 20, remark: 'Should be staged' },
  { item: 'Feeder mains to unserved areas', years: 20, remark: 'Should be staged' },
];
/** recommended planning horizon (§2.4): urban 20 yr in two 10-yr stages; minor urban & rural 10 yr */
export const horizonFor = (pop) => (pop < 5000 ? { years: 10, stage: null, text: 'minor urban / rural – 10-year horizon, not staged' } : { years: 20, stage: 10, text: 'urban – 20-year horizon in two 10-year stages' });

// ------------------------------------------------------------------ §3.2.1 Domestic demand
export const COMMUNITY = [
  { id: 'smallRural', label: 'Small rural (< 1,000) – see Manual D1', pMin: 0, pMax: 1000, hc: null, hcLpcd: null, sp: null, spLpcd: 45 },
  { id: 'medRural', label: 'Medium rural (1,000–1,500)', pMin: 1000, pMax: 1500, hc: [10, 20], hcLpcd: null, sp: [80, 90], spLpcd: 45 },
  { id: 'largeRural', label: 'Large rural (1,500–5,000)', pMin: 1500, pMax: 5000, hc: [20, 40], hcLpcd: 140, sp: [60, 80], spLpcd: 45 },
  { id: 'smallUrban', label: 'Small urban (5,000–10,000)', pMin: 5000, pMax: 10000, hc: [30, 50], hcLpcd: 185, sp: [50, 70], spLpcd: 45 },
  { id: 'medUrban', label: 'Medium urban (10,000–20,000)', pMin: 10000, pMax: 20000, hc: [30, 60], hcLpcd: 185, sp: [40, 70], spLpcd: 45 },
  { id: 'largeUrban', label: 'Large urban (> 20,000) – assess individually', pMin: 20000, pMax: Infinity, hc: null, hcLpcd: null, sp: null, spLpcd: 45 },
];
export const communityOf = (pop) => COMMUNITY.find((c) => pop >= c.pMin && pop < c.pMax) || COMMUNITY[COMMUNITY.length - 1];
/** blended per-capita range implied by the §3.2.1 table (null when D2 says "assess individually") */
export function lpcdRange(c) {
  if (!c.hc || !c.hcLpcd) return null;
  const lo = (c.hc[0] / 100) * c.hcLpcd + (1 - c.hc[0] / 100) * c.spLpcd;
  const hi = (c.hc[1] / 100) * c.hcLpcd + (1 - c.hc[1] / 100) * c.spLpcd;
  return [lo, hi];
}
export const AFFORDABILITY_PCT = 5; // §3.2.2 – water charges ≤ about 5 % of household income

// ------------------------------------------------------------------ §3.2.3 Non-domestic demand
export const NON_DOMESTIC = [
  { id: 'hospital', label: 'Hospitals', per: 'bed', min: 220, max: 300 },
  { id: 'hotel', label: 'Hotels', per: 'bed', min: 180, max: 700 },
  { id: 'boarding', label: 'Boarding schools', per: 'resident', min: 90, max: 140 },
  { id: 'restaurant', label: 'Restaurants', per: 'seat', min: 60, max: 90 },
  { id: 'station', label: 'Bus / railway stations', per: 'user', min: 15, max: 20 },
  { id: 'dayschool', label: 'Day schools', per: 'pupil', min: 15, max: 30 },
  { id: 'office', label: 'Offices', per: 'person', min: 25, max: 40 },
  { id: 'factory', label: 'Factories', per: 'person', min: 20, max: 30 },
  { id: 'cinema', label: 'Cinemas', per: 'seat', min: 10, max: 15 },
];
export const NON_DOM_SMALL_PCT = 10; // small urban & rural ≈ 10 % of domestic
export const TARIFF_CATEGORIES = [[60, 'Government (offices, institutions, hospitals)'], [70, 'Commercial (private offices, shops, small industries)'], [71, 'Tourist hotels'], [72, 'Shipping (major ports)'], [73, 'Industries (factories)'], [80, 'Schools'], [81, 'Religious institutions & approved charities']];

// ------------------------------------------------------------------ §3.2.4 UFW, §3.2.5 peaking
export const UFW = { newSystem: [10, 15], rehab: [20, 25] };
export const peaking = (pop) => (pop < 20000 ? { mdf: 1.1, phf: 2.5, cls: 'smaller urban (< 20,000)' } : { mdf: 1.25, phf: 2.0, cls: 'larger urban (> 20,000)' });
export const TREATMENT_LOSS = [5, 10]; // raw-water facilities & treatment plants: 1.05–1.10 × max day

// ------------------------------------------------------------------ §4 Hydrology
export const CLIMATIC_ZONES = { wet: [2000, 5000], intermediate: [1300, 3500], dry: [1000, 2000] };
// Table 4.1 – River basin characteristics: [code, name, area km², annual rainfall mm, annual runoff mm, runoff factor %]
export const BASINS = [
  [1, 'Kelani Ganga', 2278, 3800, 2445, 64], [2, 'Bolgoda Ganga', 374, 2668, 1069, 40], [3, 'Kalu Ganga', 2688, 4416, 2827, 64],
  [4, 'Bentara Ganga', 622, 4505, 1607, 36], [5, 'Madu Ganga', 59, 3915, 474, 12], [6, 'Madampe Lake', 90, 2955, 477, 16],
  [7, 'Telwatte Ganga', 51, 3588, 490, 14], [8, 'Ratgama Lake', 10, 4800, 500, 10], [9, 'Gin Ganga', 922, 3683, 2136, 58],
  [10, 'Koggala Lake', 64, 2546, 437, 17], [11, 'Polwatta Ganga', 233, 3150, 626, 20], [12, 'Nilwala Ganga', 960, 3207, 1468, 46],
  [13, 'Seenimodera Oya', 38, 2605, 131, 5], [14, 'Kirama Oya', 223, 2116, 192, 9], [15, 'Rekawa Oya', 76, 2013, 144, 7],
  [16, 'Urubokka Oya', 348, 1629, 241, 15], [17, 'Kachchigala Oya', 220, 1481, 190, 13], [18, 'Walawe Ganga', 2442, 1973, 687, 35],
  [19, 'Karangan Oya', 58, 1206, 155, 13], [20, 'Malala Oya', 399, 1305, 230, 18], [21, 'Embilikala Oya', 59, 1254, 152, 12],
  [22, 'Kirindi Oya', 1165, 1606, 261, 16], [23, 'Bambawe Ara', 79, 1278, 139, 11], [24, 'Mahasilawa Oya', 13, 1692, 76, 4],
  [25, 'Butawa Oya', 38, 3289, 105, 3], [26, 'Menik Ganga', 1272, 1669, 172, 10], [27, 'Katupila Aru', 86, 1418, 116, 8],
  [28, 'Kuranda Ara', 131, 1488, 122, 8], [29, 'Namadagas Ara', 108, 1222, 111, 9], [30, 'Karambe Ara', 46, 1130, 108, 10],
  [31, 'Kumbukkan Oya', 1218, 1736, 205, 12], [32, 'Bagura Oya', 92, 2347, 130, 6], [33, 'Girikula Oya', 15, 2533, 66, 3],
  [34, 'Helawa Ara', 51, 1431, 117, 8], [35, 'Wila Oya', 484, 1530, 221, 14], [36, 'Heda Oya', 604, 1885, 496, 26],
  [37, 'Karanda Oya', 422, 1729, 386, 22], [38, 'Simena Ara', 51, 1490, 235, 16], [39, 'Tandiadi Aru', 22, 1818, 363, 20],
  [40, 'Kangikadichi Ara', 56, 1714, 339, 20], [41, 'Rufus Kulam', 35, 1942, 200, 10], [42, 'Pannela Oya', 184, 1440, 288, 20],
  [43, 'Ambalan Oya', 115, 1391, 286, 21], [44, 'Gal Oya', 1792, 1768, 82, 5], [45, 'Andella Oya', 522, 1839, 408, 22],
  [46, 'Thumpankeni', 9, 1555, 111, 7], [47, 'Namakada Aru', 12, 2916, 83, 3], [48, 'Mandipattu Aru', 100, 1410, 300, 21],
  [49, 'Panthanthe Aru', 100, 1920, 300, 16], [50, 'Vett Aru', 26, 2000, 192, 10], [51, 'Unnichchai', 346, 2303, 248, 11],
  [52, 'Mundeni Aru', 1280, 2271, 284, 13], [53, 'Miyagolla Ela', 225, 1622, 262, 16], [54, 'Maduru Oya', 1541, 1985, 519, 26],
  [55, 'Pulliyanpota Aru', 52, 1403, 192, 14], [56, 'Kirimechchi Odai', 77, 1532, 207, 14], [57, 'Bodigoda Aru', 164, 1524, 231, 15],
  [58, 'Mandan Aru', 13, 3384, 76, 2], [59, 'Makarachchi Aru', 37, 2000, 162, 8], [60, 'Mahaweli Ganga', 10327, 2157, 861, 40],
  [61, 'Kantalai', 445, 2049, 49, 2], [62, 'Palampottu Aru', 69, 1637, 159, 10], [63, 'Panna Oya', 143, 1601, 188, 12],
  [64, 'Pankulam Aru', 382, 1780, 230, 13], [65, 'Kunchikomban Aru', 205, 1751, 195, 11], [66, 'Palakutti Aru', 20, 1950, 99, 5],
  [67, 'Yan Oya', 1520, 1559, 271, 17], [68, 'Mee Oya', 90, 2700, 155, 6], [69, 'Ma Oya', 1024, 1558, 36, 2],
  [70, 'Churian Aru', 74, 2067, 121, 6], [71, 'Chayar Aru', 31, 2225, 64, 3], [72, 'Palladi Aru', 61, 2098, 114, 5],
  [73, 'Munidel Aru', 187, 1470, 149, 10], [74, 'Kodalikallu Aru', 74, 1918, 135, 7], [75, 'Per Aru', 374, 1909, 181, 9],
  [76, 'Pali Aru', 84, 1523, 142, 9], [77, 'Maruthapilly Aru', 41, 2658, 146, 5], [78, 'Thoravil Aru', 90, 1777, 166, 9],
  [79, 'Piramenthal Aru', 82, 1597, 170, 11], [80, 'Nethali Aru', 120, 1091, 183, 17], [81, 'Kanagarayan Aru', 896, 1493, 63, 4],
  [82, 'Kalawalappu Aru', 56, 2285, 160, 7], [83, 'Akkarayan Aru', 192, 1963, 192, 10], [84, 'Mandekal Aru', 297, 1346, 191, 14],
  [85, 'Pallavarayan Kadu', 159, 1817, 169, 9], [86, 'Pali Aru (north)', 451, 1789, 184, 10], [87, 'Chappi Aru', 66, 1984, 136, 7],
  [88, 'Parangi Aru', 832, 1705, 168, 10], [89, 'Nay Aru', 560, 1503, 150, 10], [90, 'Aruvi Aru', 3246, 1515, 157, 10],
  [91, 'Kal Aru', 210, 1390, 109, 8], [92, 'Moderagama Aru', 932, 1304, 218, 17], [93, 'Kala Oya', 2772, 1461, 241, 16],
  [94, 'Moongil Aru', 44, 1090, 90, 8], [95, 'Mi Oya', 1516, 1522, 110, 7], [96, 'Madurankuli Aru', 62, 1564, 145, 9],
  [97, 'Kalagamu Oya', 151, 1668, 165, 10], [98, 'Rathambala Oya', 215, 1627, 218, 13], [99, 'Deduru Oya', 2616, 1648, 451, 27],
  [100, 'Karambala Oya', 589, 1651, 555, 34], [101, 'Ratmal Oya', 215, 1697, 265, 16], [102, 'Maha Oya', 1510, 2413, 834, 35],
  [103, 'Attanagalu Oya', 727, 2544, 1017, 40],
].map(([code, name, area, rain, runoff, factor]) => ({ code, name, area, rain, runoff, factor, unit: (runoff * 1000) / 365 }));
export const basinOf = (code) => BASINS.find((b) => b.code === +code) || null;

// Table 4.3 – typical runoff coefficients [type, ≤2 %, 2–10 %, >10 %]
export const RUNOFF_AREAS = [
  ['Roofs and pavements', 0.9, 0.9, 0.9], ['City business areas', 0.8, 0.85, 0.85], ['Suburban residential', 0.45, 0.5, 0.55],
  ['Hi-density residential', 0.6, 0.65, 0.7], ['Grassland and meadows', 0.25, 0.3, 0.3], ['Bare earth', 0.6, 0.65, 0.7],
  ['Cultivated land – clay loam', 0.5, 0.55, 0.6], ['Cultivated land – sandy', 0.25, 0.3, 0.35], ['Forests and woods', 0.1, 0.15, 0.2],
];
export const runoffCforCatchment = (slopePct) => (slopePct < 2 ? 0.3 : slopePct <= 4 ? 0.4 : 0.5); // §4.8.4 jungle/partly developed
/** §4.8.4 rational formula, Q (m³/s) = C I A / 360, I mm/h, A ha (valid ≤ ~50 km²) */
export const rational = (C, I, Aha) => (C * I * Aha) / 360;
/** §4.8.2 time of concentration (min): tc = 0.0195 k^0.77, k = √(L³/H) */
export const kirpich = (Lm, Hm) => 0.0195 * Math.sqrt(Lm ** 3 / Math.max(Hm, 0.01)) ** 0.77;
export const streamVelocity = (slopePct) => (slopePct < 1 ? 0.5 : slopePct < 2 ? 0.6 : slopePct < 4 ? 0.9 : slopePct <= 6 ? 1.2 : 1.5);
export const tcVelocity = (Lm, slopePct, inletMin = 10) => Lm / (60 * streamVelocity(slopePct)) + inletMin;
/** §4.8.5 1-in-10,000-yr specific flood envelope (m³/s/km²): ≈ 10 for small catchments, ≈ 4 at 4000 km² */
export const specificFloodEnvelope = (Akm2) => Math.max(4, Math.min(10, 10 - 6 * Math.log10(Math.max(1, Akm2)) / Math.log10(4000)));
export const SEDIMENT_YIELD = 300; // m³/km²/yr (upper Mahaweli) – allow 50 years' accumulation (§4.9)
export const SEDIMENT_YEARS = 50;
export const SEEPAGE_MONTHLY_PCT = 0.5; // §5.5.1 untested reservoirs
// §4.10 monthly evaporation (mm)
export const EVAPORATION = {
  Colombo: [165.5, 156.6, 152.7, 178.9, 187.7, 220.3, 176.1, 150.2, 169.8, 168.2, 180.8, 183.4],
  Peradeniya: [99.0, 91.5, 107.2, 127.7, 150.0, 159.8, 123.0, 130.9, 107.8, 99.0, 108.9, 104.1],
};
/** §4.7 drought / rainfall frequency – plotting position P = m/(N+1) */
export const plottingPosition = (m, N) => m / (N + 1);

// §4.6 flow measurement – BS 3680, g = 9.78 m/s² (Sri Lanka)
export const G_SL = 9.78;
export const WEIRS = {
  rectFull: { label: 'Rectangular thin-plate weir, full width', Q: (h, b, P) => (2 / 3) * Math.sqrt(2 * G_SL) * (0.602 + (0.083 * h) / P) * b * (h + 0.0012) ** 1.5 },
  rectContracted: { label: 'Rectangular weir with end contractions', Q: (h, b, P) => (2 / 3) * Math.sqrt(2 * G_SL) * 0.616 * (1 - (0.1 * h) / P) * b * h ** 1.5 },
  vnotch90: { label: '90° V-notch weir', Q: (h) => (8 / 15) * Math.sqrt(2 * G_SL) * 0.585 * h ** 2.5 },
  vnotch60: { label: '60° V-notch weir', Q: (h) => 0.84 * h ** 2.5 },
  broad: { label: 'Broad-crested weir', Q: (h, b) => 1.705 * b * h ** 1.5 },
  flume: { label: 'Critical-depth flume (BS 3680 Pt 4C)', Q: (h, b) => 1.705 * b * h ** 1.5 },
};
/** head over a measuring structure for flow Q (bisection) */
export function weirHead(type, Q, b = 1, P = 0.5) {
  const f = WEIRS[type]?.Q;
  if (!f || !(Q > 0)) return 0;
  let lo = 1e-4, hi = 5;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m, b, P) > Q) hi = m; else lo = m; }
  return (lo + hi) / 2;
}

// ------------------------------------------------------------------ §5 Intakes
export const INTAKE = {
  suctionPumpMaxVariation: 3.5,     // m – river-level variation below 3.5–4.0 m allows a suction pump on the bank
  submergenceD: [1.5, 2.0],         // submergence of intake pipe / pump suction, × diameter
  wellAreaRatio: [3, 5],            // suction-well plan area / intake-pipe x-section
  bellmouthAboveBed: 1.0,           // m
  entranceV: 0.15,                  // m/s maximum
  pipeV: [0.6, 0.9],                // m/s
  coarseOpen: [75, 100], coarseBar: 25, fineOpen: 6, screenV: 1.0, clogLoss: 0.15,
};
/** §5.4 screen head loss h = 0.0729 (V² − v²) */
export const screenLoss = (V, v) => 0.0729 * Math.max(0, V * V - v * v);

// ------------------------------------------------------------------ §6 Pumping stations
export const PUMP = { npshMargin: [0.7, 1.0], stormFactor: 0.85, bellLossK: 0.1, suctionVmax: 1.5, strainerRatio: 3, maxStartsPerHour: 6, speeds: [1450, 2900], kWper1000m3dPer8_81m: 1 };
/** §6.4.1 stand-by units: reserve ≥ 30 % (1→1, 2→1, 3→1, 4→2, 5→2) */
export const standbyFor = (nDuty) => Math.max(1, Math.ceil(0.3 * Math.max(1, nDuty) - 1e-9));
// Table 6.2 typical efficiencies
export const PUMP_TYPES = {
  horizontal: { label: 'Horizontal centrifugal (dry well)', pump: [0.80, 0.82], motor: [0.93, 0.95], etaP: 0.81, etaM: 0.94 },
  vertical: { label: 'Vertical spindle / turbine', pump: [0.77, 0.79], motor: [0.90, 0.94], etaP: 0.78, etaM: 0.92 },
  submersible: { label: 'Submersible', pump: [0.73, 0.81], motor: [0.85, 0.89], etaP: 0.77, etaM: 0.87 },
};
export const DIESEL_KG_PER_KWH = [0.21, 0.28];

// ------------------------------------------------------------------ §7 Pipelines & valves
export const PIPE_V = { min: 0.6, max: 1.6, absMax: 2.5 };
export const PIPE_MATERIALS = {
  di: { label: 'Ductile iron K9 (BS 4772 / ISO 2531)', lined: true, rule: 1.1, dnMax: 1200,
    classes: (dn) => [{ cls: 'K9', bar: dn <= 300 ? 40 : dn <= 600 ? 25 : 16 }] },
  upvc147: { label: 'uPVC (SLS 147)', lined: true, rule: 1.0, dnMax: 500, derate: false,
    classes: () => [{ cls: 'Type 250', bar: 2.5 }, { cls: 'Type 400', bar: 4 }, { cls: 'Type 600', bar: 6 }, { cls: 'Type 1000', bar: 10 }] },
  upvc3505: { label: 'uPVC (BS 3505)', lined: true, rule: 1.0, dnMax: 600, derate: true,
    classes: () => [{ cls: 'Class C', bar: 9 }, { cls: 'Class D', bar: 12 }, { cls: 'Class E', bar: 15 }] },
  ac: { label: 'Asbestos cement (BS 486)', lined: true, rule: 1.0, dnMax: 900,
    classes: () => [{ cls: 'Class 15', bar: 7.5 }, { cls: 'Class 20', bar: 10 }, { cls: 'Class 25', bar: 12.5 }] },
  steel: { label: 'Steel, welded, lined (BS 534 / CP 2010)', lined: true, rule: 1.1, dnMax: 1800, designed: true,
    classes: () => [{ cls: 'Designed (CP 2010 Pt 2)', bar: 25 }] },
  hdpe: { label: 'HDPE PE100 (SDR17 PN10 / SDR11 PN16)', lined: true, rule: 1.0, dnMax: 1200, derate: true,
    classes: () => [{ cls: 'SDR17 PN10', bar: 10 }, { cls: 'SDR11 PN16', bar: 16 }] },
  ci: { label: 'Coated spun iron, unlined', lined: false, rule: 1.1, dnMax: 1200,
    classes: () => [{ cls: 'Class B', bar: 6 }, { cls: 'Class C', bar: 12 }, { cls: 'Class D', bar: 16 }] },
};
/** Fig 7.6 suggested design Hazen–Williams C */
export function cDesign(material, dn) {
  const m = PIPE_MATERIALS[material];
  if (!m) return 130;
  if (material === 'upvc147' || material === 'upvc3505' || material === 'hdpe') return 140;
  if (!m.lined) return dn < 300 ? 100 : dn < 450 ? 110 : 120;
  return dn < 600 ? 130 : 140;
}
/** Fig 7.6 note 3: C at 1 m/s; at 2 m/s reduce by 5 % (C < 100), 3 % (< 130), 1 % (< 140); increase at 0.5 m/s */
export function cVelocity(C, v) {
  const p = C < 100 ? 0.05 : C < 130 ? 0.03 : C < 140 ? 0.01 : 0;
  if (!p) return C;
  const f = v >= 1 ? -p * Math.min(1, (v - 1) / 1) : p * Math.min(1, (1 - v) / 0.5);
  return C * (1 + f);
}
/** select the lowest class whose working pressure ≥ sustained, and sustained + surge ≤ rule × rating */
export function selectClass(material, dn, sustainedM, surgeM, T = 28) {
  const m = PIPE_MATERIALS[material] || PIPE_MATERIALS.di;
  const derate = m.derate ? Math.max(0, (T - 20) * 0.02) : 0;
  const list = m.classes(dn).map((c) => ({ ...c, wpM: c.bar * 10.197 * (1 - derate) }));
  const okC = list.find((c) => c.wpM >= sustainedM && sustainedM + surgeM <= m.rule * c.wpM);
  const pick = okC || list[list.length - 1];
  return { ...pick, ok: !!okC, rule: m.rule, derate, sustainedM, surgeM, maxM: sustainedM + surgeM, material, label: m.label, dnOk: dn <= m.dnMax };
}
/** §7.4.5 air-valve size (mm) for a main of diameter dn */
export const airValveSize = (dn) => (dn <= 450 ? '75' : dn <= 600 ? '100' : dn <= 800 ? '150' : dn <= 900 ? '2 × 100' : '2 × 150');
/** §7.4.6 washout size (mm) */
export const washoutSize = (dn) => (dn <= 500 ? 75 : dn <= 800 ? 100 : dn <= 900 ? 150 : 200);
export const AIR_VALVE_SPACING = 500;     // m on long grades (750 towards the end); double orifice at ≥ every 1 km
export const ISOLATING_VALVE_SPACING = 1500; // m on transmission mains (§8.1.4)
export const MAIN_RULES = { minGrade: 1 / 500, cover: 0.8, coverRoad: 1.0, minHeadGravity: 4, testFactor: 1.5, disinfection: '≥ 20 mg/L chlorine for 24 h', fillV: 0.3, fillVmax: 0.6, bypassDN: 400 };
/** Table 7.3 – thrust (N) per bar on blank ends / bends; effective diameter reproduces the table (≈ 1.109 DN + 11 mm, within 1.5 %) */
export function thrust(dn, pBar, angleDeg = 90) {
  const d = (1.109 * dn + 11.1) / 1000;
  const A = (Math.PI * d * d) / 4;
  const T1 = pBar * 1e5 * A;
  return angleDeg >= 180 || angleDeg === 0 ? T1 : 2 * T1 * Math.sin((angleDeg * Math.PI) / 360);
}
/** §6.5 / Annex J – unprotected surge head */
export const joukowsky = (a, v, g = 9.81) => (a * v) / g;

// ------------------------------------------------------------------ §9 Service reservoirs
// default consumption pattern (% of daily demand per hour, hour 0 = 00:00–01:00)
export const DIURNAL_PCT = [0, 0, 0, 0, 0, 5, 12, 10, 8, 4, 4, 4.5, 8, 7, 3, 4, 8, 8.5, 8, 3, 2, 1, 0, 0];
export const DIURNAL_D2 = DIURNAL_PCT.map((p) => +(p * 0.24).toFixed(3)); // × average hourly demand
/** small urban & rural storage (% of max day) for a daily supply-inflow period (h) */
export const smallStoragePct = (hours) => (hours >= 18 ? 50 : hours >= 12 ? 33 : 25);
export const LARGE_STORAGE_MIN_H = 8;  // ≥ 8 h of max-day demand (33 %) up to 24 h
export const SR_DEPTH = [2.5, 5.5];

// ------------------------------------------------------------------ §6.3 Structural
export const STRUCT = { fcuStruct: 20, fcuWR: 25, fyMild: 250, fyHigh: 410, flotationFoS: 1.5, clearance: 0.6 };

// ------------------------------------------------------------------ §10 Costs
export const COST = {
  prelim: [0.5, 1.0],          // % of ECC (larger % for smaller schemes)
  contractorOHP: 35,           // % included in line-item rates
  omYearsInCapital: 2,
  engineering: 8, design: 6, supervision: 2,
  contFeasibility: [10, 15], contPreFeasibility: 20,
  btt: 3,
  escalation: [10, 15],        // % p.a. for funding
  omOverhead: 35,              // NWSDB / LA overhead on O&M line items
  minorRepairsME: 1,           // % of installed M&E cost per year
  omContingency: 10,
  indirect: 5,                 // % of direct operational expenses
  chlorineDose: 2,             // mg/L if unknown
  pf: 0.85,
  discount: [8, 15],           // World Bank range
  projectionYears: 20,
};
/** §10.3 */
export const presentValue = (C, r, n) => C / (1 + r) ** n;
export const eac = (C, r, n) => (r === 0 ? C / n : (C * r * (1 + r) ** n) / ((1 + r) ** n - 1));
export const FACILITIES = ['Landscaping', 'Security and fencing', 'Laboratory services and equipment', 'Communication facilities (telephone, radio)', 'Domestic water supply, electricity, site access roads', 'Quarters', 'Transport (remote sites)', 'Chemicals for start-up', 'Access / safety facilities (ladders, hand rails)', 'Protective equipment & clothing, first-aid kits', 'Spare parts', 'Office furniture & stationery', 'Storeroom'];

// ------------------------------------------------------------------ §2.3 Site planning checklist
export const SITE_CHECKLIST = ['Location and elevation relative to source, treatment and demand area', 'Flood levels (site above historic floods)', 'Area required for future extensions', 'Cost of clearing, earthworks and embankments', 'Site drainage and wastewater disposal', 'Foundation conditions (trial pits, boreholes)', 'Security of site (fencing, guard house, lighting)', 'Access roads – including to the intake', 'Cost of utilities; availability of electric power (vs generator)', 'O&M facilities, staff quarters and stores', 'Availability of site (land acquisition)'];

// ------------------------------------------------------------------ Clause index (Library page)
export const CLAUSES = [
  ['2.3', 'Site planning', 'Checklist: elevation, flood levels, expansion area, drainage, foundations, security, access, power, quarters & stores.', 'layout'],
  ['2.4', 'Design period', 'Urban: 20-yr horizon in two 10-yr stages; minor urban & rural: 10 yr. Component periods per table (pumpsets 10, structures 20, dams 50).', 'demand'],
  ['3.1', 'Population forecasting', 'Graphical linear / exponential extrapolation, Pn = P(1+r)^n; district growth rate when history unknown.', 'demand'],
  ['3.2.1', 'Domestic demand', 'House connections 140 (large rural) / 185 L/c/d (urban); standposts 45 L/c/d; proportions by community size; > 20,000 assess individually.', 'demand'],
  ['3.2.2', 'House connections vs standposts', 'Proportion by study; charges ≤ about 5 % of income.', 'demand'],
  ['3.2.3', 'Non-domestic demand', 'Small urban & rural ≈ 10 % of domestic; unit demands for hospitals, hotels, schools, offices, factories…', 'demand'],
  ['3.2.4', 'Unaccounted-for water', 'New tight system 10–15 %; rehabilitated 20–25 % or more; not included in per-capita rates.', 'demand'],
  ['3.2.5', 'Peaking factors', 'Max day 1.1 (< 20,000) – 1.25 (> 20,000); peak hour 2.5 – 2.0; raw-water works & treatment plant 1.05–1.10 × max day.', 'demand'],
  ['4.6', 'Flow measurement', 'BS 3680 weirs & flumes (g = 9.78 m/s²); prefer weirs/flumes to venturi/Dall meters.', 'hyd'],
  ['4.7–4.8', 'Droughts & floods', 'Frequency analysis P = m/(N+1); rational formula Q = CIA/360 (≤ 50 km²); tc by Kirpich or stream velocity.', 'source'],
  ['4.9–4.11', 'Reservoir yield', 'Gross yield = demand + releases + overflows + losses; Rippl mass diagram; 50-yr sediment; evaporation & seepage.', 'source'],
  ['4.12', 'Water resources management', 'Prior rights of downstream users; compensation releases.', 'source'],
  ['5.3', 'Intake location & design', 'Bell-mouth ≥ 1 m above bed, entrance < 0.15 m/s, pipe 0.6–0.9 m/s; submergence 1½–2 D; suction well 3–5 × pipe area; level range < 3.5–4 m for bank suction pumps.', 'intake'],
  ['5.4', 'Intake screens', 'Coarse 75–100 mm, fine ≈ 6 mm (two sets); velocity ≤ 1 m/s; clogged loss ≤ 150 mm; h = 0.0729(V² − v²).', 'intake'],
  ['6.2.2', 'Suction conditions / NPSH', 'NPSHa − NPSHr ≥ 0.7–1.0 m; storm −15 % atmospheric; suction velocity ≤ 1.5 m/s.', 'intake'],
  ['6.2.6', 'Operating conditions', 'Design on 24-h pumping at the design / stage year; ≤ 6 starts per hour.', 'storage'],
  ['6.4.1', 'Stand-by pumps & power', 'Reserve ≥ 30 % (1/1/1/2/2 for 1–5 duty); engine generator for all essential pumping; surge investigation.', 'intake'],
  ['Table 6.2', 'Pump & motor efficiencies', 'Horizontal 80–82 %, vertical ≈ 3 % less, submersible 73–81 %; motors 93–95 / 90–94 / 85–89 %.', 'energy'],
  ['6.3', 'Structural design', 'Concrete 20 MPa (structural), 25 MPa (water-retaining); flotation FoS 1.5.', 'storage'],
  ['7.1', 'Pipe materials & pressure ratings', 'Tables 7.1, 7.2: DI, uPVC, AC, steel classes; sustained + surge ≤ 1.1 × rating.', 'storage'],
  ['7.3', 'Pipeline design', 'Hazen–Williams; design C (Fig 7.6); velocity 0.6 – 1.6/2.5 m/s; mains on max day over 24 h; economic pumping-main size; cover 0.8/1.0 m; grade ≥ 1:500.', 'storage'],
  ['7.4', 'Valves & appurtenances', 'Air valves at peaks & ≤ 500 m; sizes & washouts per tables; by-pass valves ≥ 400 mm; thrust blocks (Table 7.3).', 'storage'],
  ['9.2', 'Service reservoir capacity', 'Mass diagram with D2 consumption pattern; small schemes 25–50 % by supply hours; larger systems ≥ 8 h of max day.', 'storage'],
  ['9.4', 'Service reservoir design', 'Depth 2.5–5.5 m; two compartments; by-pass; ventilation; level gauges & meters.', 'storage'],
  ['10.1–10.2', 'Cost estimates', 'Preliminaries ½–1 %; engineering 8 %; contingencies 10–15 / 20 %; 2 years O&M; O&M overhead 35 %; repairs 1 % M&E; contingency 10 %.', 'cost'],
  ['10.3', 'Comparative cost analysis', 'Present value and equivalent annual cost (recommended); discount 8–15 %.', 'cost'],
];
