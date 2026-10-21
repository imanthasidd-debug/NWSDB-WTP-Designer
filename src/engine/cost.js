// Capital cost (quantity-based BOQ estimate) and annual O&M cost → unit production cost (LKR/m³)
// Estimate format, O&M allowances and comparative cost analysis per NWSDB Design Manual D2 §10.
import { Calc, n } from '../core/calc.js';
import { COST, FACILITIES, eac, presentValue, ref } from '../core/d2.js';

export const DEFAULTS = {
  // civil rates (LKR) – indicative 2026; update with current NWSDB schedule of rates
  rExcavation: 1800, rConcrete: 62000, rSteel: 420, steelPerM3: 120, wallT: 0.35, slabT: 0.4, roofT: 0.25,
  rBuilding: 185000, rBeds: 18000, rBaffle: 22000, rSiteWorks: 6500, rSand: 45000, rGravel: 26000, rAnthracite: 260000,
  rPipePerMmM: 180,      // LKR per mm of diameter per metre of laid DI main
  // M&E
  pumpBase: 1.2e6, pumpPerKw: 140000, drivePerKw: 300000, driveBase: 2.5e6, scraperRect: 12e6, scraperCirc: 18e6,
  filterEquip: 8e6, chemSystem: 15e6, chlorGas: 18e6, chlorHypo: 6e6, txPerKva: 15000, genPerKva: 45000,
  elecPct: 18, icaPct: 8, yardPipingPct: 12, screens: 3.5e6,
  rAirValve: 450000, rWashout: 350000, rIsoValvePerMm: 9000, surgeBase: 3e6, surgePerKw: 20000,
  // D2 §10.2 estimate format
  stage: 'feasibility',   // prefeasibility | feasibility | detailed
  prelimPct: 0,           // 0 = D2 ½–1 % of ECC (larger % for smaller schemes)
  contPct: 0,             // 0 = D2 (10–15 % feasibility, 20 % pre-feasibility, 10 % detailed)
  engPct: 8,              // D2: investigations & design 6 % + supervision 2 %
  include2yrOM: true,     // D2 §10.1.1: maintenance of scheme for 2 years
  vatPct: 18,             // taxes (D2 1989 format: BTT 3 % of subtotal)
  escalationPct: 0, escalationYears: 2, // D2: 10–15 % p.a. for funding (0 = base-year estimate)
  facilities: true,       // D2 §10.2 checklist items
  landPerPerch: 0, usd: 300,
  // O&M (D2 §10.1.2)
  maintMEPct: 1.0, maintCivilPct: 0.5, labMisc: 1.5e6, chemTransportPct: 5, omOverheadPct: 35, omContPct: 10,
  salaries: { engineer: 250000, chemist: 180000, labAsst: 90000, operator: 85000, fitter: 85000, labourer: 65000, security: 60000 },
  interest: 10, life: 20, lifeME: 10, // discount rate (D2: 8–15 %), structures 20 yr, M&E 10 yr (D2 §2.4)
};

function rcTank(L, W, H, o, extraWalls = 0, covered = false) {
  const t = o.wallT, s = o.slabT;
  const walls = 2 * (L + W) * H * t + extraWalls * H * t;
  const base = (L + 2 * t) * (W + 2 * t) * s;
  const roof = covered ? (L + 2 * t) * (W + 2 * t) * o.roofT : 0;
  const conc = walls + base + roof;
  const exc = (L + 2) * (W + 2) * Math.max(1.2, H * 0.5 + s);
  return { conc, exc };
}

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp, salaries: { ...DEFAULTS.salaries, ...(inp?.salaries || {}) } };
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const dem = r.demand;
  const Q = dem.Qd;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100);
  const civil = [];
  const me = [];
  const addCivil = (item, qty, unit, rate, group) => civil.push({ item, qty, unit, rate, amount: qty * rate, group });
  const addME = (item, qty, unit, rate, group) => me.push({ item, qty, unit, rate, amount: qty * rate, group });
  const mainAppurtenances = (name, p) => {
    addME(`${name} – air valves ${p.spec.airSize} mm (double orifice) incl. chambers`, p.spec.nAir, 'nr', d.rAirValve, 'Mains');
    addME(`${name} – washouts ${p.spec.washSize} mm incl. chambers`, p.spec.nWash, 'nr', d.rWashout, 'Mains');
    addME(`${name} – isolating valves DN${p.dn}${p.spec.bypass ? ' with by-pass' : ''}`, p.spec.nIso, 'nr', d.rIsoValvePerMm * p.dn * (p.spec.bypass ? 1.15 : 1), 'Mains');
    if (p.protect) addME(`${name} – surge protection (air vessel / surge-relief valve)`, 1, 'lot', d.surgeBase + d.surgePerKw * p.motor * p.nDuty, 'Mains');
  };
  const struct = (name, geo) => {
    addCivil(`${name} – excavation`, geo.exc, 'm³', d.rExcavation, name);
    addCivil(`${name} – reinforced concrete`, geo.conc, 'm³', d.rConcrete, name);
    addCivil(`${name} – reinforcement`, geo.conc * d.steelPerM3, 'kg', d.rSteel, name);
  };
  // intake
  const ik = r.intake;
  if (ik && ik.Dw) {
    const h = ik.deck - ik.floor;
    const conc = Math.PI * ik.Dw * h * 0.5 + Math.PI * (ik.Dw / 2 + 0.5) ** 2 * 0.8;
    struct('Intake well', { conc, exc: Math.PI * (ik.Dw / 2 + 1.5) ** 2 * Math.max(2, h * 0.6) });
    addCivil('Intake pump house superstructure', 80, 'm²', d.rBuilding, 'Intake well');
    addME('Coarse & fine screens (incl. lifting gear)', 2, 'set', d.screens, 'Intake');
    addME('Raw-water pump sets (incl. valves, starters)', ik.pumps.nDuty + ik.pumps.nStandby, 'nr', d.pumpBase + d.pumpPerKw * ik.pumps.motor, 'Intake');
    addCivil(`Raw-water rising main DN${ik.pumps.dn} (${ik.pumps.spec.matLabel}, ${ik.pumps.spec.cls.cls})`, ik.inputs.mainLength, 'm', d.rPipePerMmM * ik.pumps.dn, 'Mains');
    mainAppurtenances('Raw-water main', ik.pumps);
  }
  const ae = r.aeration;
  if (r.process.has.aeration && ae) struct('Aerator', rcTank(ae.L + 2, ae.W, 1.5, d, ae.type === 'cascade' ? ae.inputs.nSteps * 0.6 : 0));
  struct('Inlet chamber', rcTank(5, 4, 3, d));
  const rm = r.rapidmix;
  if (rm?.enabled) {
    if (rm.type === 'mechanical') { struct('Flash mixers', rcTank(rm.B * rm.nBasins + 0.3, rm.B, rm.H + 0.5, d)); addME('Flash mixer drives', rm.nBasins, 'nr', d.driveBase + d.drivePerKw * rm.motor, 'Process'); }
    else struct('Hydraulic-jump channel', rcTank(rm.Lj + 3, rm.b, rm.y2 + 1.2, d));
  }
  const fl = r.floc;
  if (fl?.enabled) {
    const nT = fl.nT;
    const Lf = fl.type === 'vbaffle' ? Math.max(...fl.stages.map((s) => s.L)) : fl.L;
    const Wf = fl.type === 'vbaffle' ? fl.stages.length * fl.W : fl.W;
    struct('Flocculators', rcTank(Lf, nT * Wf, fl.H + 0.5, d, nT * Lf));
    if (fl.type !== 'paddle') {
      const area = fl.stages.reduce((a, s) => a + s.nInt * (fl.type === 'hbaffle' ? (fl.W - s.gap) * fl.H : fl.W * (fl.H - s.gap)), 0) * nT;
      addCivil('Flocculator baffle walls / boards', area, 'm²', d.rBaffle, 'Flocculators');
    } else addME('Paddle flocculator drives', fl.stages.length * nT, 'nr', d.driveBase + d.drivePerKw * (fl.kw / Math.max(1, fl.stages.length * nT)), 'Process');
  }
  const sed = r.sed;
  if (sed?.enabled) {
    if (sed.type === 'circ') {
      const conc = sed.N * (Math.PI * sed.D * (sed.totalDepth) * d.wallT + Math.PI * (sed.D / 2) ** 2 * d.slabT);
      struct('Circular clarifiers', { conc, exc: sed.N * Math.PI * (sed.D / 2 + 1) ** 2 * 2 });
      addME('Clarifier scraper bridges', sed.N, 'nr', d.scraperCirc, 'Process');
    } else {
      struct('Sedimentation tanks', rcTank(sed.L, sed.N * sed.W, sed.totalDepth, d, (sed.N - 1) * sed.L));
      addME('Sludge scrapers (chain & flight)', sed.N, 'nr', d.scraperRect, 'Process');
      addCivil('Launders & V-notch weir plates', sed.N * sed.nL * sed.Llaund, 'm', 60000, 'Sedimentation tanks');
      if (sed.type === 'tube') addME('Tube-settler modules', sed.N * sed.Ac, 'm²', 85000, 'Process');
    }
  }
  const fi = r.filt;
  if (fi) {
    if (fi.type === 'ssf') {
      struct('Slow sand filters', rcTank(fi.Lb, fi.N * fi.B, fi.boxDepth, d, (fi.N - 1) * fi.Lb));
      addCivil('Filter sand', fi.N * fi.Af * fi.inputs.ssfDepth, 'm³', d.rSand, 'Filter media');
      addCivil('Gravel & underdrain', fi.N * fi.Af * 0.3, 'm³', d.rGravel, 'Filter media');
    } else {
      struct('Filter boxes', rcTank(fi.Lb, fi.N * fi.footprint.boxW, fi.boxDepth, d, (fi.N - 1) * fi.Lb));
      addCivil('Filter gallery & operating floor building', (Math.ceil(fi.N / 2) * (fi.footprint.boxW + 0.3)) * 6, 'm²', d.rBuilding, 'Filter boxes');
      addCivil('Filter sand', fi.N * fi.Af * fi.sandL, 'm³', d.rSand, 'Filter media');
      if (fi.type === 'dual') addCivil('Anthracite', fi.N * fi.Af * fi.inputs.anthDepth, 'm³', d.rAnthracite, 'Filter media');
      addCivil('Graded gravel', fi.N * fi.Af * fi.gravelD, 'm³', d.rGravel, 'Filter media');
      addME('Filter valves, actuators, rate controllers, underdrains', fi.N, 'nr', d.filterEquip, 'Filtration');
      addME('Backwash pump sets', 2, 'nr', d.pumpBase + d.pumpPerKw * fi.bwPumpKw, 'Filtration');
      if (fi.blowerKw) addME('Air-scour blowers', 2, 'nr', 1.5e6 + d.pumpPerKw * fi.blowerKw, 'Filtration');
    }
  }
  const dis = r.dis;
  if (dis?.footprint) struct('Chlorine contact tank', rcTank(dis.L, dis.W, dis.depthTot, d, (dis.nPasses - 1) * dis.L));
  const st = r.storage;
  if (st) {
    struct('Clear water reservoir', rcTank(st.L, st.W * st.inputs.cwrCompartments, st.depth + 0.5, d, (st.inputs.cwrCompartments - 1) * st.L, true));
    addME('Treated-water pump sets', st.pumps.nDuty + st.pumps.nStandby, 'nr', d.pumpBase + d.pumpPerKw * st.pumps.motor, 'Pumping');
    if (st.toeConc > 0) addCivil('Clear water reservoir – anti-flotation base toe (RC)', st.toeConc, 'm³', d.rConcrete + d.steelPerM3 * d.rSteel, 'Clear water reservoir');
    addCivil(`Treated-water main DN${st.pumps.dn} (${st.pumps.spec.matLabel}, ${st.pumps.spec.cls.cls})`, st.inputs.mainLength, 'm', d.rPipePerMmM * st.pumps.dn, 'Mains');
    mainAppurtenances('Treated-water main', st.pumps);
  }
  const co = r.coag;
  if (co) addME('Chemical dosing systems (coagulant, lime, polymer)', 1, 'lot', d.chemSystem + co.nDosingPumps * 2e6, 'Chemicals');
  if (dis) addME(dis.key === 'gas' ? 'Gas chlorination system (chlorinators, leak detection, scrubber)' : 'Hypochlorite dosing system', 1, 'lot', dis.key === 'gas' ? d.chlorGas + dis.chlorinator * 0.15e6 : d.chlorHypo, 'Chemicals');
  const sl = r.sludge;
  if (sl) {
    if (sl.recTank > 0) struct('Wash-water recovery tank', rcTank(Math.sqrt(sl.recTank / 3) * 1.5, Math.sqrt(sl.recTank / 3) / 1.5, 3.5, d));
    if (sl.thick) { struct('Sludge thickener', { conc: sl.thick.n * (Math.PI * sl.thick.D * 4 * d.wallT + Math.PI * (sl.thick.D / 2) ** 2 * d.slabT), exc: sl.thick.n * Math.PI * (sl.thick.D / 2 + 1) ** 2 * 2.5 }); addME('Thickener mechanisms', sl.thick.n, 'nr', 9e6, 'Residuals'); }
    if (sl.mech) addME('Sludge dewatering units (belt press / centrifuge) incl. polymer system', sl.mech.units + sl.mech.standby, 'nr', 28e6, 'Residuals');
    addCivil('Sludge drying beds (complete)', sl.bedArea, 'm²', d.rBeds, 'Residuals');
  }
  // buildings
  const lay = r.layout;
  const bldg = lay ? lay.items.filter((i) => i.kind === 'building') : [];
  for (const b of bldg) addCivil(b.label, b.w * b.h, 'm²', d.rBuilding, 'Buildings');
  if (lay) addCivil('Site works (roads, drainage, fencing, landscaping)', lay.siteArea, 'm²', d.rSiteWorks, 'Site works');
  const civilSub = civil.reduce((a, x) => a + x.amount, 0);
  addCivil('Yard piping, channels & valves', 1, 'lot', (d.yardPipingPct / 100) * civilSub, 'Site works');
  const en = r.energy;
  if (en) {
    addME(`Transformer ${en.tx} kVA & HV switchgear`, en.tx, 'kVA', d.txPerKva, 'Electrical');
    addME(`Standby generator ${en.genKva} kVA`, en.genKva, 'kVA', d.genPerKva, 'Electrical');
  }
  const meSub0 = me.reduce((a, x) => a + x.amount, 0);
  addME('LV panels, MCCs, cabling & earthing', 1, 'lot', (d.elecPct / 100) * meSub0, 'Electrical');
  addME('Instrumentation, SCADA & telemetry', 1, 'lot', (d.icaPct / 100) * meSub0, 'Electrical');
  // ---- D2 §10.2 facilities checklist (lump sums scaled to capacity)
  if (d.facilities) {
    const kQ = Math.max(0.4, Math.sqrt(Q / 20000));
    addME('Laboratory services & equipment', 1, 'lot', 12e6 * kQ, 'Facilities');
    addME('Communication facilities (telephone, radio, telemetry link)', 1, 'lot', 2.5e6 * kQ, 'Facilities');
    addME('Transport – operations vehicle', 1, 'nr', 14e6, 'Facilities');
    addME('Access & safety facilities, PPE, first-aid & fire fighting', 1, 'lot', 3e6 * kQ, 'Facilities');
    addME('Office furniture, stationery & stores equipment', 1, 'lot', 2e6 * kQ, 'Facilities');
  }
  const civilTot = civil.reduce((a, x) => a + x.amount, 0);
  const meTot = me.reduce((a, x) => a + x.amount, 0);
  const works = civilTot + meTot;
  // ---- O&M (D2 §10.1.2) – needed first because D2 includes 2 years' O&M in the capital estimate
  const staff = {
    engineer: 1, chemist: Q >= 5000 ? 1 : 0, labAsst: Q > 20000 ? 3 : 2, operator: 3 * (Q > 30000 ? 3 : 2),
    fitter: Q > 30000 ? 3 : 2, labourer: 4 + Math.round(Q / 10000) + (r.filt?.type === 'ssf' ? 2 : 0), security: 3,
  };
  const staffCost = Object.entries(staff).reduce((a, [k, nn]) => a + nn * d.salaries[k] * 13, 0);
  const chemBase = (co ? co.costs.coag + co.costs.lime + co.costs.soda + co.costs.poly : 0) + (r.stab?.cost || 0) + (dis?.annualCost || 0);
  const chem = chemBase * (1 + d.chemTransportPct / 100);
  const power = en ? en.annualBill + (en.fuelCost || 0) : 0;
  const maint = (meTot * d.maintMEPct) / 100 + (civilTot * d.maintCivilPct) / 100;
  const sludgeC = sl ? sl.cost : 0;
  const misc = d.labMisc + (Qop * 365 / 1000) * 50;
  const omDirect = { Chemicals: chem, Electricity: power, Staff: staffCost, 'Repairs & maintenance': maint, 'Sludge disposal': sludgeC, 'Laboratory & misc.': misc };
  const direct = Object.values(omDirect).reduce((a, b) => a + b, 0);
  const omOver = (direct * d.omOverheadPct) / 100;
  const omCont = ((direct + omOver) * d.omContPct) / 100;
  const om = { ...omDirect, 'NWSDB / LA overhead': omOver, Contingency: omCont };
  const omTot = direct + omOver + omCont;
  const prod = Qop * 365;
  const omPerM3 = omTot / prod;
  // ---- capital estimate in D2 §10.2 format
  const prelimPct = d.prelimPct > 0 ? d.prelimPct : Q < 10000 ? 1.0 : Q < 25000 ? 0.75 : 0.5;
  const contPct = d.contPct > 0 ? d.contPct : d.stage === 'prefeasibility' ? COST.contPreFeasibility : d.stage === 'detailed' ? 10 : 12.5;
  const prelim = (works * prelimPct) / 100;
  const om2 = d.include2yrOM ? 2 * omTot : 0;
  const land = lay ? lay.perches * d.landPerPerch : 0;
  const sub3 = works + prelim + om2 + land;
  const eng = (sub3 * d.engPct) / 100;
  const cont = (sub3 * contPct) / 100;
  const vat = (sub3 * d.vatPct) / 100;
  const capex = sub3 + eng + cont + vat;
  const escal = d.escalationPct > 0 ? capex * ((1 + d.escalationPct / 100) ** d.escalationYears - 1) : 0;
  calc.section('Capital cost – NWSDB D2 §10.2 format (base year)');
  calc.text(`Line-item rates include the contractor's overhead and profit (D2: 35 %). ${FACILITIES.length} facility items of the D2 §10.2 checklist are ${d.facilities ? 'included' : 'excluded'}.`);
  calc.step('1. Civil & building works', 'C_{civ}', '', civilTot, 'LKR');
  calc.step('1. Mechanical, electrical & facilities', 'C_{M\\&E}', '', meTot, 'LKR');
  calc.step(`Preliminaries (${prelimPct} % of ECC)`, 'C_{pre}', '', prelim, 'LKR', ref('10.1.1') + ' – ½ to 1 %');
  if (land > 0) calc.step('Land acquisition', 'C_{land}', '', land, 'LKR', ref('10.1.1'));
  calc.step('2. Operation & maintenance for 2 years', '2\\,C_{O\\&M}', `2\\times${n(omTot / 1e6, 1)}\\,M`, om2, 'LKR', ref('10.1.1, 10.2'));
  calc.step('3. Subtotal of line items', 'C_3', '', sub3, 'LKR');
  calc.step(`4. Engineering design & supervision (${d.engPct} % of 3)`, 'C_{eng}', '', eng, 'LKR', ref('10.2') + ' – 6 % design + 2 % supervision');
  calc.step(`5. Physical contingencies (${contPct} % of 3, ${d.stage})`, 'C_{cont}', '', cont, 'LKR', ref('10.2') + ' – 10–15 % feasibility, 20 % pre-feasibility');
  calc.step(`6. Taxes (${d.vatPct} % of 3)`, 'C_{tax}', '', vat, 'LKR', ref('10.2') + ' – BTT 3 % (1989); VAT now');
  calc.step('7. Total capital cost (base year)', 'C', '', capex, 'LKR');
  if (escal > 0) calc.step(`8. Price escalation for funding (${d.escalationPct} % p.a., ${d.escalationYears} yr)`, 'C[(1+e)^t - 1]', '', escal, 'LKR', ref('10.2') + ' – 10–15 % p.a.');
  calc.step('Capital cost per m³/d of capacity', 'C/Q', `${n(capex / 1e6, 0)}\\,M/${n(Q, 0)}`, capex / Q, 'LKR per m³/d');
  calc.flag('Preliminaries within D2 range (½–1 % of ECC)', prelimPct >= 0.5 && prelimPct <= 1, `${prelimPct} %`, '0.5 – 1 %', '', 'info', ref('10.1.1'));
  calc.flag('Engineering & supervision allowance', Math.abs(d.engPct - COST.engineering) < 0.01, `${d.engPct} %`, '8 %', '', 'info', ref('10.2'));
  calc.flag('Physical contingency for the estimate stage', d.stage === 'prefeasibility' ? contPct >= 20 : d.stage === 'feasibility' ? contPct >= 10 && contPct <= 15 : contPct >= 5, `${contPct} %`, d.stage === 'prefeasibility' ? '20 %' : d.stage === 'feasibility' ? '10 – 15 %' : '≥ 5 %', '', 'warn', ref('10.2'));
  // ---- O&M sheet
  calc.section('Annual operation & maintenance (D2 §10.1.2)');
  for (const [k, v] of Object.entries(omDirect)) calc.step(k, '', '', v, 'LKR/yr', k === 'Chemicals' ? `incl. ${d.chemTransportPct} % transport & handling` : k === 'Repairs & maintenance' ? ref('10.1.2') + ` – ${d.maintMEPct} % of M&E + ${d.maintCivilPct} % of civil` : k === 'Electricity' ? 'CEB tariff incl. demand charge (p.f. 0.85) + standby diesel' : '');
  calc.step(`NWSDB / LA overhead (${d.omOverheadPct} %)`, '', '', omOver, 'LKR/yr', ref('10.2'));
  calc.step(`Contingency (${d.omContPct} %)`, '', '', omCont, 'LKR/yr', ref('10.1.2'));
  calc.step('O&M cost per m³ produced', 'c_{O\\&M} = \\frac{C_{O\\&M}}{365\\,\\bar Q}', `\\frac{${n(omTot / 1e6, 1)}\\,M}{365\\times${n(Qop, 0)}}`, omPerM3, 'LKR/m³');
  // ---- comparative cost analysis (D2 §10.3)
  calc.section('Comparative cost analysis – equivalent annual cost (D2 §10.3)');
  const i = d.interest / 100;
  const meShare = meTot / Math.max(works, 1);
  const capCivil = capex * (1 - meShare), capME = capex * meShare;
  const crf = eac(1, i, d.life);
  const capAnnual = eac(capCivil, i, d.life) + eac(capME, i, d.lifeME);
  calc.step('Equivalent annual cost of structures', 'EAC = C\\frac{r(1+r)^n}{(1+r)^n-1}', `r=${n(d.interest)}\\%,\\ n=${d.life}`, eac(capCivil, i, d.life), 'LKR/yr', ref('10.3.2'));
  calc.step('Equivalent annual cost of M&E (replacement period)', 'EAC_{M\\&E}', `n=${d.lifeME}`, eac(capME, i, d.lifeME), 'LKR/yr', ref('2.4, 10.3.2'));
  const fullPerM3 = (omTot + capAnnual) / prod;
  calc.step('Unit cost of water produced (EAC + O&M)', 'c = \\frac{EAC + C_{O\\&M}}{365\\,\\bar Q}', '', fullPerM3, 'LKR/m³', ref('10.3.2'));
  let pvOM = 0;
  for (let t = 1; t <= COST.projectionYears; t++) pvOM += presentValue(omTot, i, t);
  const pvTotal = capex + pvOM;
  calc.step(`Present value of ${COST.projectionYears}-year O&M`, 'PV = \\sum \\frac{C_{O\\&M}}{(1+r)^t}', '', pvOM, 'LKR', ref('10.3.1'));
  calc.step('Present value of capital + O&M', 'PV_{tot}', '', pvTotal, 'LKR', ref('10.3.1'));
  const sens = [8, 10, 12, 15].map((rp) => { const rr = rp / 100; const ca = eac(capCivil, rr, d.life) + eac(capME, rr, d.lifeME); return { r: rp, cap: ca / prod, om: omPerM3, total: (ca + omTot) / prod }; });
  calc.flag('Discount rate within World-Bank range (8–15 %)', d.interest >= 8 && d.interest <= 15, `${d.interest} %`, '8 – 15 %', 'run several rates (sensitivity chart)', 'info', ref('10.3.2'));
  const groupTotals = {};
  for (const x of [...civil, ...me]) groupTotals[x.group] = (groupTotals[x.group] || 0) + x.amount;
  return {
    inputs: d, civil, me, civilTot, meTot, works, prelim, prelimPct, contPct, om2, sub3, cont, eng, vat, escal, land, capex, perCap: capex / Q, usd: capex / d.usd,
    staff, om, omDirect, omTot, omPerM3, crf, capAnnual, fullPerM3, groupTotals, prod, pvOM, pvTotal, sens,
    ...calc.result(),
  };
}
