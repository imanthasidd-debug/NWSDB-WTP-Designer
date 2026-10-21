// Residuals: sludge production (NWSDB D3 §5.14.3.6 Method 02 mass balance, Table 5-44), wash-water recovery,
// thickening (D3 §5.14.5), drying beds (§5.14.8), mechanical dewatering (§5.14.9–5.14.11), disposal
import { Calc, n } from '../core/calc.js';
import { MONTHS, ceilTo, maxOf } from '../core/util.js';
import { zoneOf } from '../core/srilanka.js';
import { DRYING_BED, MECH_DEWATER, RECYCLE, SLUDGE_K, THICKENER, sludgeMethod1 } from '../core/d3.js';

export const DEFAULTS = {
  sedCapture: 90,       // % of solids removed in clarifiers (rest to filters) – D3 §5.14.3.6: 90 %
  safety: 1.4,          // uncertainty allowance on computed solids – D3: ×1.2–1.6 (use 1.4)
  sedSolids: 1.0,       // % solids in clarifier sludge (D3: 0.5–2 %)
  thickSolids: 3.0,     // % after thickening (D3: alum/iron 3–6 %)
  thickLoad: 40,        // kg/m2.d – D3 §5.14.5.2: 20–80
  annualRain: 0,        // mm/yr; 0 = typical for the climatic zone
  bedCover: 'auto',     // auto | open | covered (solar drying beds, UV-protected roof)
  bedLoad: 12,          // kg DS/m2 per application
  bedCycleDry: 21,      // days (dry season)
  bedCycleWet: 35,      // days (monsoon)
  cakeSolids: 22,       // % solids of dried cake
  cakeDensity: 1100,
  recoveryWashes: 2,    // wash-water recovery tank holds n washes
  disposalCost: 2500,   // LKR per tonne of cake (transport + landfill)
  truck: 8,             // m3 per truckload
  dewaterRate: 200,     // kg DS/h per belt press / centrifuge
  dewaterHours: 16,     // operating hours per day
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const dem = ctx.res.demand;
  const q = ctx.res.quality;
  const co = ctx.res.coag;
  const fi = ctx.res.filt;
  const proc = ctx.res.process;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100);
  const b = q.inputs.tssPerNtu || 1.4;
  const kc = co ? co.sludgeFactor : 0;
  const poly = co ? co.inputs.polymer : 0;
  const limeIns = co ? co.limeDose * 0.1 : 0; // insoluble fraction of pre-lime
  calc.section('Dry-solids production (NWSDB D3 §5.14.3.6 – Method 02, Table 5-44)');
  const fe = q.worst('fe'), mn = q.worst('mn');
  const coagKey = co ? co.inputs.coagulant : null;
  const kCo = coagKey === 'pacl' ? SLUDGE_K.pacl : coagKey === 'fecl3' ? SLUDGE_K.fecl3 : SLUDGE_K.alum;
  const pacD = co?.pac ? co.pac.dose : 0;
  const preLime = co ? co.limeDose : 0;
  const terms = (turb, dose, pacF = 1) => ({ raw: b * turb, fe: SLUDGE_K.fe * fe, mn: SLUDGE_K.mn * mn, coag: kCo * dose, poly, lime: SLUDGE_K.lime * preLime, pac: pacD * pacF });
  const sum = (t) => Object.values(t).reduce((a, x) => a + x, 0);
  const dsAt = (turb, dose, Q, pacF = 1) => (Q * sum(terms(turb, dose, pacF)) * d.safety) / 1000;
  const tDes = terms(q.turbMax, co ? co.Ddes : 0);
  calc.step('Raw-water suspended solids', 'S_{SS} = b\\,T_u', `${n(b)}\\times${n(q.turbMax)}`, tDes.raw, 'mg/L', 'D3 Table 5-44: 0.5–2 mg TSS/L per NTU (site ratio)');
  calc.step('Iron and manganese precipitates', 'S_{Fe,Mn} = \\tfrac{106.9}{55.9}Fe + \\tfrac{87.9}{54.9}Mn', `1.912\\times${n(fe)} + 1.601\\times${n(mn)}`, tDes.fe + tDes.mn, 'mg/L', 'NWSDB D3 §5.14.3.6');
  if (co) calc.step(`Coagulant solids (${coagKey === 'pacl' ? 'PACl 0.8' : coagKey === 'fecl3' ? 'FeCl₃ 0.66' : 'alum 0.26'} kg/kg)`, 'S_c = k_c\\,D', `${n(kCo)}\\times${n(co.Ddes)}`, tDes.coag, 'mg/L', 'NWSDB D3 Table 5-44');
  if (preLime > 0) calc.step('Pre-lime (20 % precipitates as CaCO₃)', 'S_L = 0.2\\times\\tfrac{100}{74}D_L', `0.27\\times${n(preLime)}`, tDes.lime, 'mg/L', 'NWSDB D3 §5.14.3.6');
  if (pacD > 0) calc.step('Powdered activated carbon', 'S_{PAC} = 1\\times D_{PAC}', `${n(pacD)}`, tDes.pac, 'mg/L', 'NWSDB D3 Table 5-44');
  const dsDes = dsAt(q.turbMax, co ? co.Ddes : 0, dem.Qd);
  calc.step('Peak dry solids (design flow, monsoon turbidity, × safety)', 'S = \\frac{Q\\sum S_i}{1000}\\times k_s', `\\frac{${n(dem.Qd, 0)}\\times${n(sum(tDes))}}{1000}\\times${n(d.safety)}`, dsDes, 'kg/d', 'NWSDB D3 §5.14.3.6 – allowance ×1.2–1.6 (1.4)');
  if (co && coagKey === 'alum') {
    const m1 = sludgeMethod1(dem.Qd / 86400, co.Ddes, b * q.turbMax, poly + pacD);
    calc.step('Cross-check – Method 01 (Davis & Cornwell)', 'M_s = 86.4\\,Q(0.44A + SS + M)', `86.4\\times${n(dem.Qd / 86400, 3)}(0.44\\times${n(co.Ddes)} + ${n(b * q.turbMax)} + ${n(poly + pacD)})`, m1, 'kg/d', 'NWSDB D3 §5.14.3.5');
  }
  const monthly = q.monthly.map((t, i) => dsAt(t, co ? co.monthlyDose[i] : 0, Qop, 0.5));
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const annualT = monthly.reduce((a, x, i) => a + x * days[i], 0) / 1000;
  calc.step('Annual dry solids (operating flow, monthly profile)', '\\sum S_i\\,d_i', '', annualT, 't/yr');
  calc.step('Specific sludge production', 's = S/Q', `${n(dsDes, 0)}/${n(dem.Qd / 1000, 1)}`, dsDes / (dem.Qd / 1000), 'kg/1000 m³', 'NWSDB D3 Table 5-45 – alum sludge 8–210 (typ 48) kg/1000 m³');
  const sedDS = dsDes * (proc.conv ? d.sedCapture / 100 : 0);
  const filtDS = dsDes - sedDS;
  const sedVol = sedDS / (d.sedSolids * 10);
  calc.step('Clarifier sludge volume (peak)', 'V_s = \\frac{S_{sed}}{10\\,c_s}', `\\frac{${n(sedDS, 0)}}{10\\times${n(d.sedSolids)}}`, sedVol, 'm³/d');
  // wash water recovery
  calc.section('Wash-water recovery');
  const washVol = fi?.washVol || 0;
  const recTank = d.recoveryWashes * washVol;
  const recRate = fi ? (fi.bwDailyM3 / 24) / dem.Qh * 100 : 0;
  calc.step('Recovery tank volume', 'V = n\\,V_w', `${n(d.recoveryWashes)}\\times${n(washVol)}`, recTank, 'm³');
  calc.step('Recycle rate if returned uniformly', 'r = \\frac{V_d/24}{Q}', '', recRate, '% of Q', 'NWSDB D3 §5.9.14 – return ≤ 10 % of raw inflow, equalised over 24 h');
  calc.check('sl.recycle', recRate);
  if (proc.recovery === 'yes' && fi && fi.type !== 'ssf') {
    calc.flag('Backwash recycling – plant size', dem.Qd > RECYCLE.minPlant, `${dem.Qd.toFixed(0)} m³/d`, '> 4,500 m³/d', 'Recycling is advantageous above 4,500 m³/d (or where the source is scarce / pumping energy high)', 'info', 'NWSDB D3 §5.14.3.8');
    calc.flag('Backwash recycling – no polymer in use', !(poly > 0), poly > 0 ? `polymer ${poly} mg/L` : 'no polymer', 'not allowed where polymer is used', 'Also not where raw water has blue-green algae, Cryptosporidium or Giardia', 'warn', 'NWSDB D3 §5.14.3.8, §5.14.12');
    if (q.worst('algae') > 2000) calc.note('warn', 'Raw water carries algae – do not recycle spent wash water unless toxin / T&O destruction follows (NWSDB D3 §5.9.12, §5.14.12).');
    calc.text('Recovery: two compartments each holding at least one (preferably two) filter washes, settled 1–2 h and decanted by floating arm; pumps 1 duty + 1 standby; thickener supernatant and dewatering filtrate are not recycled to the plant (NWSDB D3 §5.14.3.8, §5.14.12).');
  }
  // thickener
  let thick = null;
  if (proc.sludge === 'thickener' || proc.sludge === 'mechanical') {
    calc.section('Gravity thickener');
    const A = dsDes / d.thickLoad;
    const nTh = A > 300 ? 2 : 1;
    const D = ceilTo(Math.sqrt((4 * A / nTh) / Math.PI), 0.5);
    calc.step('Thickener area', 'A = S/SLR', `${n(dsDes, 0)}/${n(d.thickLoad)}`, A, 'm²', 'NWSDB D3 §5.14.5.2 – 20–80 kg/m²·d');
    calc.step(`Diameter (${nTh} unit${nTh > 1 ? 's' : ''})`, 'D = \\sqrt{4A/(n\\pi)}', '', D, 'm');
    calc.check('sl.thickLoad', d.thickLoad);
    const feedV = (dsDes * (proc.conv ? d.sedCapture / 100 : 1)) / (d.sedSolids * 10) + (fi?.bwDailyM3 && proc.recovery !== 'yes' ? 0 : 0);
    const Aact = nTh * Math.PI * D * D / 4;
    const hlr = feedV / Aact;
    calc.step('Hydraulic loading (clarifier sludge feed)', 'HLR = V_f/A', `${n(feedV)}/${n(Aact)}`, hlr, 'm³/m²·d', 'NWSDB D3 §5.14.5.2 – 4–10 m³/m²·d');
    calc.check('sl.thickHLR', hlr);
    const swd = THICKENER.swd.reduce((a, x) => a + x, 0);
    const hop = THICKENER.floorSlope * D / 2;
    calc.step('Side water depth (clear 1.0 + settling 1.5 + thickening 3.0)', 'SWD', '1.0+1.5+3.0', swd, 'm', 'NWSDB D3 §5.14.5 / Annex H');
    calc.step('Floor cone depth (slope 20 cm/m)', 'h = 0.2\\,D/2', `0.2\\times${n(D)}/2`, hop, 'm');
    calc.check('sl.thickDepth', swd);
    const Vt = nTh * (Math.PI / 4 * D * D * swd + Math.PI / 12 * D * D * hop);
    thick = { A, n: nTh, D, underflow: dsDes / (d.thickSolids * 10), hlr, swd, hop, V: Vt, freeboard: THICKENER.freeboard };
    calc.step('Thickened sludge volume', 'V = S/(10 c_t)', `${n(dsDes, 0)}/(10\\times${n(d.thickSolids)})`, thick.underflow, 'm³/d', 'NWSDB D3 – alum/iron sludge thickens to 3–6 %');
    calc.step('Thickening period', 't = V_t/V_f', `${n(Vt)}/${n(feedV)}`, (Vt / Math.max(feedV, 1e-6)) * 24, 'h', 'NWSDB D3 §5.14.5 – 8–24 h typical');
    calc.text('Central inlet well, peripheral 90° V-notch weirs, 0.6 m freeboard; supernatant discharged only if it meets CEA limits (TSS ≤ 50 mg/L, total residual Cl₂ ≤ 1.0 mg/L, pH 6.0–8.5), otherwise returned to the sludge regulation tank (NWSDB D3 §5.14.5, Table 5-42).');
  }
  // dewatering
  const days365 = days.reduce((a, b) => a + b, 0);
  const dsAvg = (annualT * 1000) / days365;
  let bedArea = 0, nBeds = 0, mech = null;
  const zone = zoneOf(ctx.inp.setup?.district || 'Colombo');
  const rain = d.annualRain > 0 ? d.annualRain : zone === 'dry' ? 1400 : zone === 'intermediate' ? 1800 : 2500;
  if (proc.sludge === 'mechanical') {
    calc.section('Mechanical dewatering (NWSDB D3 §5.14.9–5.14.11)');
    calc.flag('Mechanical dewatering justified', dem.Qd >= 20000 || rain > MECH_DEWATER.rainTrigger || ctx.inp.setup?.landConstrained, `${dem.Qd.toFixed(0)} m³/d · ${rain} mm/yr`, 'major WTP, no land, or rainfall > 3,000 mm', 'Belt press 150 kg/m·h (cake 15–20 %), plate press up to 40 %, centrifuge only for > 0.3 m³/s', 'info', 'NWSDB D3 §5.14.11');
    const units = Math.ceil(dsDes / (d.dewaterRate * d.dewaterHours));
    calc.step('Dewatering units (peak solids)', 'n = \\frac{S}{r\\,h}', `\\frac{${n(dsDes, 0)}}{${n(d.dewaterRate)}\\times${n(d.dewaterHours)}}`, units, 'duty');
    mech = { units, standby: 1, rate: d.dewaterRate };
    bedArea = (dsAvg * 0.15 * d.bedCycleDry) / d.bedLoad; // emergency beds ~15 %
    nBeds = Math.max(2, Math.ceil(bedArea / 300));
    calc.step('Emergency drying beds (15 % of average solids)', 'A', '', bedArea, 'm²');
  } else {
    calc.section('Sludge drying beds');
    const cycle = (8 * d.bedCycleDry + 4 * d.bedCycleWet) / 12;
    bedArea = (dsAvg * cycle) / d.bedLoad;
    nBeds = Math.max(4, Math.ceil(bedArea / 300));
    calc.step('Average drying cycle (8 dry + 4 monsoon months)', '\\bar t_c', `(8\\times${n(d.bedCycleDry)} + 4\\times${n(d.bedCycleWet)})/12`, cycle, 'days');
    calc.step('Bed area (average solids; peak months buffered in thickener/lagoon)', 'A = \\frac{\\bar S\\,\\bar t_c}{L_b}', `\\frac{${n(dsAvg, 0)}\\times${n(cycle)}}{${n(d.bedLoad)}}`, bedArea, 'm²');
    calc.step('Number of beds (≤ 300 m² each)', 'n', '', nBeds, '', 'NWSDB D3 §5.14.8 – multiple beds must be provided; cells 4–20 × 15–60 m');
    calc.check('sl.bedLoad', d.bedLoad);
    calc.check('sl.bedLoadYr', (dsAvg * 365) / Math.max(bedArea, 1e-6), 'Drying-bed annual solids loading');
    const covered = d.bedCover === 'covered' || (d.bedCover === 'auto' && rain >= DRYING_BED.rainMax);
    calc.flag('Climate suits sludge drying beds', rain < DRYING_BED.rainMax || covered, `${rain} mm/yr${covered ? ' – covered (solar) beds' : ''}`, '< 2,200 mm/yr (open beds)', covered ? 'Solar drying beds with UV-protected polythene roof reach 80–85 % DS' : '', 'warn', 'NWSDB D3 §5.14.8, Table 5-49');
    calc.text(`Beds: sand 0.3–0.46 m over gravel 0.3–0.46 m (3–25 mm), walls 1–1.5 m above sand, sludge applied 0.3–1.0 m deep, drying 5–7 days to 15–30 % cake; filtrate returned by gravity to the sludge regulation tank (NWSDB D3 §5.14.8).`);
  }
  const cakeT = annualT / (d.cakeSolids / 100);
  const cakeM3 = (cakeT * 1000) / d.cakeDensity;
  calc.step('Dewatered cake for disposal', 'M_c = \\frac{S_{yr}}{c_c}', `\\frac{${n(annualT)}}{${n(d.cakeSolids / 100)}}`, cakeT, 't/yr');
  calc.step('Truckloads per year', 'n = V_c / V_t', `${n(cakeM3, 0)}/${n(d.truck)}`, Math.ceil(cakeM3 / d.truck), '');
  calc.note('info', 'Residual liquors: thickener supernatant / filtrate are returned to the sludge regulation tank or discharged only to CEA standards for inland surface water (NWSDB D3 Table 5-42; EPL required). Disposal: landfill/monofill or reuse (bricks, topsoil) – NWSDB sludge management policy (2012).');
  return {
    inputs: d, dsDes, dsAvg, mech, rain, terms: tDes, monthly, months: MONTHS, annualT, sedDS, filtDS, sedVol, recTank, recRate, thick, bedArea, nBeds, cakeT, cakeM3,
    trucks: Math.ceil(cakeM3 / d.truck), cost: cakeT * d.disposalCost,
    footprint: { L: Math.sqrt(bedArea * 1.3) * 1.2, W: Math.sqrt(bedArea * 1.3) / 1.2 },
    ...calc.result(),
  };
}
