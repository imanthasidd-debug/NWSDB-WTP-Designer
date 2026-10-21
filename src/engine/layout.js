// Site layout: footprints of every unit and building, automatic flow-line arrangement, land requirement
import { Calc, n } from '../core/calc.js';
import { SITE_CHECKLIST, rational, ref } from '../core/d2.js';
import { ACRE_M2, PERCH_M2 } from '../core/srilanka.js';
import { ceilTo } from '../core/util.js';
import { LAB_EQUIPMENT, LAYOUT, LAYOUT_CHECKLIST, siteAreaMinHa } from '../core/d3.js';

export const DEFAULTS = {
  road: 6,            // internal road / spacing between structures (m)
  setback: 10,        // boundary setback (m)
  expansion: 30,      // % land reserve for future stage
  pos: {},            // user-dragged positions {key: {x, y}}
  showGrid: true,
  quarters: 2,        // staff quarters units (D2 §2.3)
  floodLevel: 0,      // m MSL historic flood level at the site (0 = intake HFL)
  rainI: 100,         // mm/h design storm intensity for site drainage (10-yr, short duration)
  drainSlope: 0.5,    // % longitudinal slope of site drains
  roadAccess: true, powerAvailable: true, soilInvestigated: false,
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp, pos: { ...(inp?.pos || {}) } };
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const proc = r.process;
  const nT = r.demand.nTrains;
  const items = [];
  const add = (key, label, w, h, kind, extra = {}) => { if (w > 0 && h > 0) items.push({ key, label, w: +w.toFixed(1), h: +h.toFixed(1), kind, ...extra }); };
  // ---- process units (w = along flow X, h = across Y)
  add('inlet', proc.has.aeration ? 'Inlet & aerator' : 'Inlet chamber', Math.max(6, (r.aeration?.L || 0) + 4), Math.max(6, r.aeration && proc.has.aeration ? r.aeration.W : 6), 'process');
  const fl = r.floc;
  if (fl?.enabled) {
    let wTrain, lTrain;
    if (fl.type === 'vbaffle') { lTrain = Math.max(...fl.stages.map((s) => s.L)); wTrain = fl.stages.length * (fl.W + 0.25); }
    else { lTrain = fl.L + 0.25 * fl.stages.length; wTrain = fl.W; }
    const rmLen = r.rapidmix?.type === 'mechanical' ? (r.rapidmix.B || 3) + 1 : (r.rapidmix?.Lj || 5) + 2;
    add('floc', 'Rapid mix & flocculators', lTrain + rmLen, nT * (wTrain + 0.3) + 0.3, 'process', { trains: nT });
  }
  const sed = r.sed;
  if (sed?.enabled) {
    if (sed.type === 'circ') add('sed', 'Circular clarifiers', sed.D + 2, sed.N * (sed.D + 3), 'process', { circ: true, n: sed.N, D: sed.D });
    else add('sed', sed.type === 'tube' ? 'Tube-settler clarifiers' : 'Sedimentation tanks', sed.L + 3, sed.N * (sed.W + 0.3) + 0.3, 'process', { n: sed.N });
  }
  const fi = r.filt;
  if (fi?.type === 'ssf') add('filt', 'Slow sand filters', fi.Lb + 2, fi.N * (fi.B + 0.4) + 1, 'process', { n: fi.N });
  else if (fi) {
    const perRow = Math.ceil(fi.N / 2);
    add('filt', 'Rapid gravity filters + gallery', perRow * (fi.footprint.boxW + 0.3) + 6, 2 * (fi.Lb + 0.6) + 4, 'process', { n: fi.N });
  }
  const dis = r.dis;
  if (dis?.footprint) add('ct', 'Chlorine contact tank', dis.footprint.L, dis.footprint.W, 'process');
  const st = r.storage;
  if (st) add('cwr', 'Clear water reservoir', st.footprint.L, st.footprint.W, 'process');
  add('twp', 'Treated water pump house', Math.max(10, 4 + 3 * ((st?.pumps.nDuty + st?.pumps.nStandby) || 3)), 9, 'building');
  // ---- buildings
  const co = r.coag;
  const chemArea = co ? Math.max(120, co.storeAreaTotal + co.inputs.nTanks * co.tankSide * co.tankSide * 2 + 60) : 60;
  add('chem', 'Chemical house (store, dosing, lime)', Math.sqrt(chemArea * 1.6), Math.sqrt(chemArea / 1.6), 'building');
  add('chlor', 'Chlorination building', Math.sqrt(dis?.buildingArea || 60) * 1.3, Math.sqrt(dis?.buildingArea || 60) / 1.3, 'building');
  add('admin', 'Administration & laboratory', 20, 14, 'building');
  add('sub', 'Substation & standby generator', 14, 9, 'building');
  add('work', 'Workshop & stores', 15, 10, 'building');
  add('guard', 'Guard house', 4, 4, 'building');
  if (d.quarters > 0) add('quarters', `Staff quarters (${d.quarters} units)`, 10 * Math.min(d.quarters, 4), 9 * Math.ceil(d.quarters / 4), 'building');
  // ---- residuals
  const sl = r.sludge;
  if (sl) {
    if (sl.recTank > 0) add('rec', 'Wash-water recovery tank', Math.sqrt(sl.recTank / 3) * 1.5, Math.sqrt(sl.recTank / 3) / 1.5, 'sludge');
    if (sl.thick) add('thick', 'Sludge thickener', sl.thick.D * sl.thick.n + 2, sl.thick.D + 2, 'sludge', { circ: true, n: sl.thick.n, D: sl.thick.D });
    const bw = Math.sqrt(sl.bedArea * 1.25);
    add('beds', `Sludge drying beds (${sl.nBeds})`, bw * 1.4, bw / 1.4, 'sludge', { n: sl.nBeds });
  }
  // ---- automatic arrangement: process line along X (row 1), support buildings row 2, residuals row 3
  const R = d.road;
  let x = d.setback;
  const row1 = items.filter((i) => i.kind === 'process' || i.key === 'twp');
  const row1H = Math.max(...row1.map((i) => i.h));
  for (const it of row1) { it.ax = x; it.ay = d.setback + (row1H - it.h) / 2; x += it.w + R; }
  const row1W = x - R;
  let x2 = d.setback;
  const y2 = d.setback + row1H + R * 1.5;
  const row2 = items.filter((i) => i.kind === 'building' && i.key !== 'twp');
  const row2H = Math.max(...row2.map((i) => i.h));
  for (const it of row2) { it.ax = x2; it.ay = y2; x2 += it.w + R; }
  let x3 = d.setback;
  const y3 = y2 + row2H + R * 1.5;
  const row3 = items.filter((i) => i.kind === 'sludge');
  const row3H = row3.length ? Math.max(...row3.map((i) => i.h)) : 0;
  for (const it of row3) { it.ax = x3; it.ay = y3; x3 += it.w + R; }
  for (const it of items) {
    const p = d.pos[it.key];
    it.x = p ? p.x : it.ax;
    it.y = p ? p.y : it.ay;
  }
  const maxX = Math.max(...items.map((i) => i.x + i.w)) + d.setback;
  const maxY = Math.max(...items.map((i) => i.y + i.h)) + d.setback;
  const siteW = Math.max(maxX, row1W + d.setback, x2, x3);
  const siteH = Math.max(maxY, y3 + row3H + d.setback);
  const builtArea = items.reduce((a, i) => a + i.w * i.h, 0);
  const siteArea = siteW * siteH;
  const landArea = siteArea * (1 + d.expansion / 100);
  calc.section('Land requirement');
  calc.step('Footprint of structures', '\\sum A_i', '', builtArea, 'm²');
  calc.step('Site envelope (incl. roads & setbacks)', 'A_s = W \\times L', `${n(siteW)}\\times${n(siteH)}`, siteArea, 'm²');
  calc.step('Land to acquire (+ reserve for next stage)', 'A = A_s(1+r)', `${n(siteArea, 0)}(1+${n(d.expansion / 100)})`, landArea, 'm²');
  calc.step('In hectares', 'A/10^4', '', landArea / 1e4, 'ha');
  calc.step('In acres', 'A/4046.86', '', landArea / ACRE_M2, 'acres');
  calc.step('In perches', 'A/25.29', '', landArea / PERCH_M2, 'perches');
  // ---- D2 §2.3 site planning
  calc.section('Site planning (D2 §2.3)');
  const GLs = parseFloat(ctx.inp.setup?.siteGL) || 0;
  const hfl = d.floodLevel > 0 ? d.floodLevel : r.intake?.inputs?.HFL ?? 0;
  const roofA = items.reduce((a, i) => a + i.w * i.h, 0);
  const Cw = (roofA * 0.9 + Math.max(0, siteArea - roofA) * 0.3) / siteArea;
  const Qdr = rational(Cw, d.rainI, siteArea / 1e4);
  const nM = 0.015, S = d.drainSlope / 100;
  let bd = 0.3; for (; bd < 3; bd += 0.05) { const A = bd * bd, R = A / (3 * bd); if ((1 / nM) * A * R ** (2 / 3) * Math.sqrt(S) >= Qdr / 2) break; }
  calc.step('Weighted runoff coefficient of the site', 'C_w', `\\text{roofs/paving 0.9, grass 0.3}`, Cw, '–', ref('Table 4.3'));
  calc.step('Peak site run-off (rational formula)', 'Q = \\frac{C I A}{360}', `\\frac{${n(Cw)}\\times${n(d.rainI)}\\times${n(siteArea / 1e4, 2)}}{360}`, Qdr, 'm³/s', ref('4.8.4'));
  calc.step('Perimeter drain (2 outlets, square section, n = 0.015)', 'b = h', `S = ${n(d.drainSlope)}\\%`, ceilTo(bd, 0.05), 'm', 'Manning – D2 Table 4.2');
  calc.flag('Site above historic flood level', !hfl || GLs >= hfl + 0.3, `GL ${GLs} m vs flood ${hfl ? hfl.toFixed(2) : '–'} m`, 'GL ≥ flood level + 0.3 m', 'raise formation or provide bund / flood wall', 'warn', ref('2.3'));
  calc.flag('Land reserved for future extensions', d.expansion >= 20, `${d.expansion} %`, '≥ 20 %', '', 'warn', ref('2.3'));
  calc.flag('Staff quarters and stores provided', d.quarters > 0, `${d.quarters} units + workshop & stores`, 'provided', '', 'info', ref('2.3'));
  calc.flag('Security – fencing, guard house, lighting', true, 'included', 'provided', '', 'info', ref('2.3'));
  calc.flag('Access road to plant and intake', !!d.roadAccess, d.roadAccess ? 'yes' : 'no', 'all-weather access', '', 'warn', ref('2.3'));
  calc.flag('Electric power available (else generator cost compared)', !!d.powerAvailable, d.powerAvailable ? 'yes' : 'no', 'grid supply', '', 'warn', ref('2.3'));
  calc.flag('Foundation investigation (trial pits / boreholes)', !!d.soilInvestigated, d.soilInvestigated ? 'done' : 'pending', 'before final design', '', 'info', ref('2.3'));
  // ---- NWSDB D3 Chapter 9 – plant design & layout
  calc.section('Plant design & layout (NWSDB D3 Ch 9)');
  const Qult = r.demand.Qd * (1 + d.expansion / 100);
  const aMin = siteAreaMinHa(Qult);
  calc.step('Minimum site area for a conventional campus-layout plant (ultimate capacity)', 'A_{acre} \\ge Q_{mgd}^{0.7}', `(${n(Qult / 3785.4, 2)})^{0.7}\\ \\text{acres}`, aMin, 'ha', 'NWSDB D3 §9.2.1 (Kawamura) – excludes source / clear-water storage, pipelines and lagoons');
  calc.flag('Land provided vs D3 minimum site area', landArea / 1e4 >= aMin - 1e-9, `${(landArea / 1e4).toFixed(2)} ha`, `≥ ${aMin.toFixed(2)} ha (campus layout)`, 'Compact layouts with common walls need less land (D3 Table 9-2)', 'info', 'NWSDB D3 §9.2.1');
  const units = [['flocculators', r.floc?.enabled !== false && r.floc ? nT : null], ['clarifiers', r.sed?.enabled ? r.sed.N : null], ['filters', r.filt ? r.filt.N : null], ['clear-water compartments', r.storage?.inputs?.cwrCompartments ?? null]].filter(([, v]) => v !== null && v !== undefined);
  const single = units.filter(([, v]) => v < 2);
  calc.flag('Redundancy – remaining units carry the flow with one out of service', !single.length, units.map(([k, v]) => `${v} ${k}`).join(', '), '≥ 2 of each unit; standby pumps & chlorinators', single.map(([k]) => k).join(', '), 'warn', 'NWSDB D3 §9.4.1, §4.3.8');
  const chemDays = [r.coag?.inputs?.storageDays, r.dis?.inputs?.storageDays, r.stab?.inputs?.storageDays].filter((x) => x !== undefined);
  const minDays = chemDays.length ? Math.min(...chemDays) : 30;
  calc.flag('Chemical storage at the plant', minDays >= LAYOUT.chemStorageDays, `${minDays} days (minimum of all chemicals)`, '≥ 1 month', '', 'warn', 'NWSDB D3 §9.1');
  calc.flag('Laboratory facilities', true, `${LAB_EQUIPMENT.length} equipment items (Table 9-3)`, 'central, vibration-free, separate HVAC', 'Process laboratory plus full laboratory for large plants', 'info', 'NWSDB D3 §9.7.2');
  const checklist = SITE_CHECKLIST;
  const d3checklist = LAYOUT_CHECKLIST;
  return {
    inputs: d, items, checklist, d3checklist, siteMinHa: aMin, lab: LAB_EQUIPMENT, Cw, Qdr, drainB: ceilTo(bd, 0.05), siteW: ceilTo(siteW, 1), siteH: ceilTo(siteH, 1), builtArea, siteArea, landArea,
    ha: landArea / 1e4, acres: landArea / ACRE_M2, perches: landArea / PERCH_M2,
    ...calc.result(),
  };
}
