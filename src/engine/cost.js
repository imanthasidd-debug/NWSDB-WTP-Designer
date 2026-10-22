// Capital cost (quantity-based BOQ priced from the NWSDB Rate Book 2025) and annual O&M cost → unit cost of water.
// Default estimate format: NWSDB RB 2025 "Total Cost Estimate" (How to use, Table 1, Tables 2 & 4); the NWSDB Design
// Manual D2 §10.2 format remains available.  O&M allowances and comparative analysis follow D2 §10.1–10.3.
import { Calc, n } from '../core/calc.js';
import { fmt } from '../core/util.js';
import { COST, FACILITIES, eac, presentValue, ref } from '../core/d2.js';
import {
  BUILDINGS, CIVIL, ENG_PCT, LAB_WTP, LCFC, RB, blowerCost, cebBulkSupply, chamberCost, chlorinatorCost, civilRate, flowMeterCost, generatorCost,
  graph, locationFactor, panelCost, pipeCost, pumpSetCost, rbRef, starterCost, surgeVesselCost, valveCost,
} from '../core/ratebook.js';

export const DEFAULTS = {
  format: 'rb2025',       // rb2025 (NWSDB Rate Book 2025 TCE) | d2 (Design Manual D2 §10.2, 1989)
  method: 'composite',    // composite = RB Section A composite rates & unit-cost graphs (TCE, How to use item 1) | boq = quantity-based BOQ with Section B unit rates (Engineer's estimate)
  markup: RB.markup,      // contractor's markup added to RB rates that exclude it (How to use, item 2)
  // rate overrides – 0 = NWSDB RB 2025 rate
  rExcavation: 0, rEWS: 0, rConcrete: 0, rBlinding: 0, rFormwork: 0, rSteel: 0, rWaterbar: 0, rSand: 0, rGravel: 0, rAnthracite: 0,
  rFence: 0, rRoad: 0, rPipeFactor: 1.0,
  steelPerM3: 110, wallT: 0.35, slabT: 0.4, roofT: 0.25, blindingT: 0.075, roadPct: 12,
  // pipes & M&E (RB 2025 Section A tables / graphs)
  origin: 'asian',        // DI / HDPE pipes: asian | nonasian | local (HDPE)
  ewsPct: 25, dewPct: 25, // allowance of the earthwork-support and dewatering basic costs (pipe tables, note 4)
  sparesPct: 10,          // spare parts on pumps & generators (RB: up to 20–25 % for TCE)
  starter: 'soft',        // soft | stardelta | vsd
  // not in the Rate Book – indicative lump sums (update from recent NWSDB tenders)
  scraperRect: 12e6, scraperCirc: 18e6, filterEquip: 8e6, chemSystem: 15e6, chlorAccessories: 6e6, hypoSystem: 6e6, screens: 3.5e6,
  driveBase: 2.5e6, drivePerKw: 300000, thickMech: 9e6, dewaterUnit: 28e6, tubePerM2: 85000, launderPerM: 60000, rBeds: 18000,
  icaPct: 6, cablePct: 15, yardPipingPct: 12,
  // RB 2025 total cost estimate (How to use)
  procurement: 'ncb',     // ncb | icb (Table 2 LC / FC factors)
  fundSource: 'gosl',     // Table 4 row
  prelimPct: 0,           // 0 = RB: 4 % (> LKR 500 M) / 5 %
  engPct: 0,              // 0 = Table 4
  rwss: true,             // item (iv): 5 % of Sub Total 1 for RWS&S / water-resource improvement
  powerSupply: true, supplyKv: 11, roadReinst: 0, eia: 0, vehicles: 14e6, training: 0, duties: 0,
  contPct: 0,             // 0 = RB maximum 10 % of Sub Total 1 (+ duties)
  vatPct: RB.vat,
  escalate: true, implStart: 2027, implYears: 2, // escalation beyond 31.12.2025: LC 5 % p.a., FC 3 % p.a.
  landPerPerch: 0, usd: 300,
  // D2 §10.2 format (when format = d2)
  stage: 'feasibility', include2yrOM: true, escalationPct: 0, escalationYears: 2, d2EngPct: 8, d2PrelimPct: 0, d2ContPct: 0,
  facilities: true,
  // O&M (D2 §10.1.2)
  maintMEPct: 1.0, maintCivilPct: 0.5, labMisc: 1.5e6, chemTransportPct: 5, omOverheadPct: 35, omContPct: 10,
  salaries: { engineer: 250000, chemist: 180000, labAsst: 90000, operator: 85000, fitter: 85000, labourer: 65000, security: 60000 },
  interest: 10, life: 20, lifeME: 10,
};

/** quantities of a rectangular RC tank: concrete, formwork, excavation, blinding, water bar */
function rcTank(L, W, H, o, extraWalls = 0, covered = false) {
  const t = o.wallT, s = o.slabT;
  const per = 2 * (L + W);
  const walls = per * H * t + extraWalls * H * t;
  const base = (L + 2 * t) * (W + 2 * t) * s;
  const roof = covered ? (L + 2 * t) * (W + 2 * t) * o.roofT : 0;
  const conc = walls + base + roof;
  const form = 2 * per * H + 2 * extraWalls * H + per * s + (covered ? L * W + per * o.roofT : 0);
  const exc = (L + 2) * (W + 2) * Math.max(1.2, H * 0.5 + s);
  const blind = (L + 2 * t + 0.3) * (W + 2 * t + 0.3) * o.blindingT;
  const wb = per + extraWalls;
  return { conc, form, exc, blind, wb };
}

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp, salaries: { ...DEFAULTS.salaries, ...(inp?.salaries || {}) } };
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const setup = ctx.inp.setup || {};
  const dem = r.demand;
  const Q = dem.Qd;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100);
  const mk = 1 + d.markup / 100;
  const rate = (key, ovr) => (ovr > 0 ? ovr : civilRate(key, d.markup));
  const R = {
    exc: rate('excavation', d.rExcavation), ews: rate('ews', d.rEWS), conc: rate('concrete', d.rConcrete), blind: rate('blinding', d.rBlinding),
    form: rate('formwork', d.rFormwork), steel: rate('steel', d.rSteel), wb: rate('waterbar', d.rWaterbar), sand: rate('sand', d.rSand),
    gravel: rate('gravel', d.rGravel), anth: rate('anthracite', d.rAnthracite), fence: rate('fence', d.rFence), road: rate('road', d.rRoad),
  };
  const rref = (key, ovr) => (ovr > 0 ? 'user rate' : rbRef(CIVIL[key].ref) + (CIVIL[key].mk ? ` + ${d.markup} % markup` : ''));
  const factor = locationFactor(setup.district);
  const civil = [];
  const me = [];
  // cat = RB Table 2 category (local / foreign currency split for escalation)
  const addCivil = (item, qty, unit, rt, group, refTxt = '', cat = 'Treatment plant') => civil.push({ item, qty, unit, rate: rt, amount: qty * rt, group, ref: refTxt, cat });
  const addME = (item, qty, unit, rt, group, refTxt = '', cat = 'M&E equipment') => me.push({ item, qty, unit, rate: rt, amount: qty * rt, group, ref: refTxt, cat });
  const struct = (name, g, cat = 'Treatment plant') => {
    addCivil(`${name} – excavation`, g.exc, 'm³', R.exc, name, rref('excavation', d.rExcavation), cat);
    if (g.blind) addCivil(`${name} – blinding concrete grade 15`, g.blind, 'm³', R.blind, name, rref('blinding', d.rBlinding), cat);
    addCivil(`${name} – reinforced concrete grade 30`, g.conc, 'm³', R.conc, name, rref('concrete', d.rConcrete), cat);
    if (g.form) addCivil(`${name} – formwork`, g.form, 'm²', R.form, name, rref('formwork', d.rFormwork), cat);
    addCivil(`${name} – reinforcement (${d.steelPerM3} kg/m³)`, g.conc * d.steelPerM3, 'kg', R.steel, name, rref('steel', d.rSteel), cat);
    if (g.wb) addCivil(`${name} – PVC water bar at construction joints`, g.wb * 2, 'm', R.wb, name, rref('waterbar', d.rWaterbar), cat);
  };
  const bldg = (label, area, key, group = 'Buildings', cat = 'Buildings') => addCivil(label, area, 'm²', BUILDINGS[key].v, group, rbRef(BUILDINGS[key].ref), cat);
  const pumpSets = (name, p, kind, group) => {
    const c = pumpSetCost(p.motor, kind === 'submersible' ? 'submersible' : 'horizontal', d.sparesPct);
    addME(`${name} – pump sets ${p.motor} kW (${p.nDuty}+${p.nStandby}), supply & installation`, p.nDuty + p.nStandby, 'nr', c.value, group, c.ref);
    const s = starterCost(p.motor, d.starter);
    addME(`${name} – motor starters (${d.starter === 'vsd' ? 'VSD' : d.starter === 'stardelta' ? 'star-delta' : 'soft starter'})`, p.nDuty + p.nStandby, 'nr', s.value, group, s.ref, 'M&E equipment');
    const pan = panelCost(p.motor * (p.nDuty + p.nStandby), 'dist');
    addME(`${name} – power distribution panel`, 1, 'nr', pan.value, group, pan.ref, 'M&E equipment');
  };
  const mainCost = (name, p, L, group) => {
    const pc = pipeCost(p.spec?.material || 'di', p.dn, { main: 'transmission', origin: d.origin, pn: p.PN || 16, factor, markup: d.markup, ewsPct: d.ewsPct, dewPct: d.dewPct });
    addCivil(`${name} DN${p.dn} (${p.spec.matLabel}, ${p.spec.cls.cls}) – supply & laying incl. specials`, L, 'm', pc.total * d.rPipeFactor, 'Mains', `${pc.ref} · laying × location factor ${factor} (B-COM/02) + ${d.markup} %`, 'Pipe laying');
    const av = valveCost('air', p.spec.airSize, p.PN), avc = chamberCost(/AIR VALVE CHAMBERS \(TYPE - A\)/, 1.8, 1);
    addME(`${name} – double-orifice air valves ${p.spec.airSize} mm incl. chambers`, p.spec.nAir, 'nr', av.value + avc.value * mk, 'Mains', `${av.ref}; ${avc.ref} + ${d.markup} %`, 'Pipe laying');
    const wv = valveCost('sluice', p.spec.washSize, p.PN), wc = chamberCost(/WASHOUT VALVE CHAMBERS \( TYPE-A\)/, 1.8, 1);
    addME(`${name} – washouts ${p.spec.washSize} mm incl. chambers`, p.spec.nWash, 'nr', wv.value + wc.value * mk, 'Mains', `${wv.ref}; ${wc.ref} + ${d.markup} %`, 'Pipe laying');
    const iv = valveCost('isolating', p.dn, p.PN);
    const sizeIdx = p.dn <= 300 ? 1 : p.dn <= 400 ? 3 : p.dn <= 500 ? 4 : p.dn <= 600 ? 5 : p.dn <= 700 ? 6 : p.dn <= 800 ? 8 : p.dn <= 1000 ? 9 : 11;
    const ic = chamberCost(/INLINE VALVE CHAMBERS/, 1.8, sizeIdx);
    addME(`${name} – isolating valves DN${p.dn}${p.spec.bypass ? ' with by-pass' : ''} incl. chambers`, p.spec.nIso, 'nr', iv.value * (p.spec.bypass ? 1.15 : 1) + ic.value * mk, 'Mains', `${iv.ref}; ${ic.ref} + ${d.markup} %`, 'Pipe laying');
    if (p.protect) {
      const a = 1000, Qs = p.Qp || 0.1;
      const vol = Math.min(20, Math.max(1, (3 * Qs * 2 * L) / a));
      const sv = surgeVesselCost(vol);
      addME(`${name} – surge protection (bladder surge vessel ≈ ${vol.toFixed(1)} m³, preliminary)`, 1, 'nr', sv.value, 'Mains', sv.ref + ' – volume to be confirmed by transient analysis');
    }
  };
  // ---------------- intake & raw-water pumping
  const ik = r.intake;
  if (ik && ik.Dw) {
    const h = ik.deck - ik.floor;
    const conc = Math.PI * ik.Dw * h * 0.5 + Math.PI * (ik.Dw / 2 + 0.5) ** 2 * 0.8;
    const form = 2 * Math.PI * ik.Dw * h + Math.PI * ik.Dw * 0.8;
    struct('Intake well', { conc, form, exc: Math.PI * (ik.Dw / 2 + 1.5) ** 2 * Math.max(2, h * 0.6), blind: Math.PI * (ik.Dw / 2 + 0.6) ** 2 * d.blindingT }, 'Intake');
    const ewsA = Math.PI * (ik.Dw + 3) * Math.max(2, h * 0.6);
    addCivil('Intake well – earthwork support', ewsA, 'm²', R.ews, 'Intake well', rref('ews', d.rEWS), 'Intake');
    bldg('Intake pump house superstructure', 80, 'pumpIsolated', 'Intake well', 'Intake');
    addME('Coarse & fine screens (incl. lifting gear) – not in RB 2025, indicative', 2, 'set', d.screens, 'Intake', 'indicative', 'Intake');
    pumpSets('Raw-water pumping', ik.pumps, ik.inputs.pumpKind, 'Intake');
    mainCost('Raw-water rising main', { ...ik.pumps, Qp: ik.Q }, ik.inputs.mainLength, 'Mains');
    const fm = flowMeterCost(Math.min(ik.pumps.dn, 1200));
    addME(`Raw-water EM flow meter DN${ik.pumps.dn}`, 1, 'nr', fm.value, 'Instrumentation', fm.ref, 'Bulk meters');
  }
  const ae = r.aeration;
  if (r.process.has.aeration && ae) struct('Aerator', rcTank(ae.L + 2, ae.W, 1.5, d, ae.type === 'cascade' ? ae.inputs.nSteps * 0.6 : 0));
  struct('Inlet chamber', rcTank(5, 4, 3, d));
  const rm = r.rapidmix;
  if (rm?.enabled) {
    if (rm.type === 'mechanical') { struct('Flash mixers', rcTank(rm.B * rm.nBasins + 0.3, rm.B, rm.H + 0.5, d)); addME('Flash mixer drives – not in RB 2025, indicative', rm.nBasins, 'nr', d.driveBase + d.drivePerKw * rm.motor, 'Process', 'indicative'); }
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
      // 150 mm RC baffle walls built up from the WRS rates (concrete + 2 faces of formwork + steel)
      const baffle = 0.15 * R.conc + 2 * R.form + 0.15 * d.steelPerM3 * R.steel;
      addCivil('Flocculator baffle walls (150 mm RC)', area, 'm²', baffle, 'Flocculators', rbRef('B-WRS/01 A–D (built-up: 0.15 m³ concrete + 2 m² formwork + steel per m²)'));
    } else addME('Paddle flocculator drives – not in RB 2025, indicative', fl.stages.length * nT, 'nr', d.driveBase + d.drivePerKw * (fl.kw / Math.max(1, fl.stages.length * nT)), 'Process', 'indicative');
  }
  const sed = r.sed;
  if (sed?.enabled) {
    if (sed.type === 'circ') {
      const conc = sed.N * (Math.PI * sed.D * sed.totalDepth * d.wallT + Math.PI * (sed.D / 2) ** 2 * d.slabT);
      struct('Circular clarifiers', { conc, form: sed.N * 2 * Math.PI * sed.D * sed.totalDepth, exc: sed.N * Math.PI * (sed.D / 2 + 1) ** 2 * 2, blind: sed.N * Math.PI * (sed.D / 2 + 0.5) ** 2 * d.blindingT, wb: sed.N * Math.PI * sed.D });
      addME('Clarifier scraper bridges – not in RB 2025, indicative', sed.N, 'nr', d.scraperCirc, 'Process', 'indicative');
    } else {
      struct('Sedimentation tanks', rcTank(sed.L, sed.N * sed.W, sed.totalDepth, d, (sed.N - 1) * sed.L));
      addME('Sludge scrapers (chain & flight) – not in RB 2025, indicative', sed.N, 'nr', d.scraperRect, 'Process', 'indicative');
      addCivil('Launders & V-notch weir plates – indicative', sed.N * sed.nL * sed.Llaund, 'm', d.launderPerM, 'Sedimentation tanks', 'indicative');
      if (sed.type === 'tube') addME('Tube-settler modules – not in RB 2025, indicative', sed.N * sed.Ac, 'm²', d.tubePerM2, 'Process', 'indicative');
    }
  }
  const fi = r.filt;
  if (fi) {
    if (fi.type === 'ssf') {
      struct('Slow sand filters', rcTank(fi.Lb, fi.N * fi.B, fi.boxDepth, d, (fi.N - 1) * fi.Lb));
      addCivil('Filter sand', fi.N * fi.Af * fi.inputs.ssfDepth, 'm³', R.sand, 'Filter media', rref('sand', d.rSand));
      addCivil('Gravel & underdrain', fi.N * fi.Af * 0.3, 'm³', R.gravel, 'Filter media', rref('gravel', d.rGravel));
    } else {
      struct('Filter boxes', rcTank(fi.Lb, fi.N * fi.footprint.boxW, fi.boxDepth, d, (fi.N - 1) * fi.Lb));
      bldg('Filter gallery & operating floor building', (Math.ceil(fi.N / 2) * (fi.footprint.boxW + 0.3)) * 6, 'pumpAttached', 'Filter boxes', 'Treatment plant');
      addCivil('Filter sand', fi.N * fi.Af * fi.sandL, 'm³', R.sand, 'Filter media', rref('sand', d.rSand));
      if (fi.type === 'dual') addCivil('Anthracite', fi.N * fi.Af * fi.inputs.anthDepth, 'm³', R.anth, 'Filter media', rref('anthracite', d.rAnthracite));
      addCivil('Graded gravel', fi.N * fi.Af * fi.gravelD, 'm³', R.gravel, 'Filter media', rref('gravel', d.rGravel));
      addME('Filter valves, actuators, rate controllers, underdrains – not in RB 2025, indicative', fi.N, 'nr', d.filterEquip, 'Filtration', 'indicative', 'Treatment plant');
      const bw = pumpSetCost(fi.bwPumpKw, 'horizontal', d.sparesPct);
      addME(`Backwash pump sets ${fi.bwPumpKw} kW (1+1)`, 2, 'nr', bw.value, 'Filtration', bw.ref, 'Treatment plant');
      if (fi.blowerKw) { const bl = blowerCost(fi.blowerKw); addME(`Air-scour blowers ${fi.blowerKw} kW (1+1)`, 2, 'nr', bl.value * (1 + d.sparesPct / 100), 'Filtration', bl.ref, 'Treatment plant'); }
      const bwPipe = (fi.pipes || []).find((x) => /wash/i.test(x.name || x.label || x.k || ''));
      const fm = flowMeterCost(Math.min(300, bwPipe?.dn || 300));
      addME('Backwash EM flow meter', 1, 'nr', fm.value, 'Instrumentation', fm.ref, 'Bulk meters');
    }
  }
  const dis = r.dis;
  if (dis?.footprint) struct('Chlorine contact tank', rcTank(dis.L, dis.W, dis.depthTot, d, (dis.nPasses - 1) * dis.L));
  const st = r.storage;
  if (st) {
    struct('Clear water reservoir', rcTank(st.L, st.W * st.inputs.cwrCompartments, st.depth + 0.5, d, (st.inputs.cwrCompartments - 1) * st.L, true), 'Ground reservoirs');
    pumpSets('Treated-water pumping', st.pumps, 'horizontal', 'Pumping');
    if (st.toeConc > 0) addCivil('Clear water reservoir – anti-flotation base toe (RC)', st.toeConc, 'm³', R.conc + d.steelPerM3 * R.steel, 'Clear water reservoir', rref('concrete', d.rConcrete) + ' + steel', 'Ground reservoirs');
    mainCost('Treated-water main', { ...st.pumps, Qp: st.Qp }, st.inputs.mainLength, 'Mains');
    const fm = flowMeterCost(Math.min(st.pumps.dn, 1200));
    addME(`Treated-water EM flow meter DN${st.pumps.dn}`, 1, 'nr', fm.value, 'Instrumentation', fm.ref, 'Bulk meters');
  }
  const co = r.coag;
  if (co) addME('Chemical dosing systems (coagulant, lime, polymer) – not in RB 2025, indicative', 1, 'lot', d.chemSystem + co.nDosingPumps * 2e6, 'Chemicals', 'indicative', 'Treatment plant');
  if (co?.pac) addME('Powdered activated carbon dosing (slurry tank, mixer, feeders) – indicative', 1, 'lot', 6e6 + co.pac.kgD * 2000, 'Chemicals', 'indicative', 'Treatment plant');
  if (dis) {
    if (dis.key === 'gas') {
      const unitKgH = Math.max(0.5, dis.chlorinator || dis.kgH || 1);
      const ch = chlorinatorCost(unitKgH);
      addME(`Gas chlorinators ${unitKgH.toFixed(1)} kg/h (1 duty + 1 standby)`, 2, 'nr', ch.value, 'Chemicals', ch.ref, 'Treatment plant');
      addME('Vacuum regulators, injectors, leak detection, scrubber & drum handling – not in RB 2025, indicative', 1, 'lot', d.chlorAccessories + unitKgH * 0.15e6, 'Chemicals', 'indicative (excluded from Graph A-M/18)', 'Treatment plant');
    } else addME('Hypochlorite / bleaching-powder dosing system – indicative', 1, 'lot', d.hypoSystem, 'Chemicals', 'indicative', 'Treatment plant');
  }
  const sl = r.sludge;
  if (sl) {
    if (sl.recTank > 0) struct('Wash-water recovery tank', rcTank(Math.sqrt(sl.recTank / 3) * 1.5, Math.sqrt(sl.recTank / 3) / 1.5, 3.5, d), 'Sludge treatment');
    if (sl.thick) {
      struct('Sludge thickener', { conc: sl.thick.n * (Math.PI * sl.thick.D * 4 * d.wallT + Math.PI * (sl.thick.D / 2) ** 2 * d.slabT), form: sl.thick.n * 2 * Math.PI * sl.thick.D * 4, exc: sl.thick.n * Math.PI * (sl.thick.D / 2 + 1) ** 2 * 2.5, blind: sl.thick.n * Math.PI * (sl.thick.D / 2 + 0.5) ** 2 * d.blindingT }, 'Sludge treatment');
      addME('Thickener mechanisms – not in RB 2025, indicative', sl.thick.n, 'nr', d.thickMech, 'Residuals', 'indicative', 'Sludge treatment');
    }
    if (sl.mech) addME('Sludge dewatering units (belt press / centrifuge) incl. polymer system – indicative', sl.mech.units + sl.mech.standby, 'nr', d.dewaterUnit, 'Residuals', 'indicative', 'Sludge treatment');
    addCivil('Sludge drying beds (complete) – indicative', sl.bedArea, 'm²', d.rBeds, 'Residuals', 'indicative', 'Sludge treatment');
  }
  // ---------------- buildings (RB Table A-MIS/01, markup included)
  const lay = r.layout;
  const BKEY = { twp: 'pumpAttached', chem: 'chemical', chlor: 'chlorinator', admin: 'office', sub: 'office', work: 'office', guard: 'caretaker', quarters: 'quarters' };
  for (const b of lay ? lay.items.filter((i) => i.kind === 'building') : []) bldg(b.label, b.w * b.h, BKEY[b.key] || 'office');
  // ---------------- site works
  if (lay) {
    addCivil('Internal roads (asphalt on ABC base)', (lay.siteArea * d.roadPct) / 100, 'm²', R.road, 'Site works', rref('road', d.rRoad), 'Treatment plant');
    addCivil('Boundary fence (PVC chain-link 2 m)', 2 * (lay.siteW + lay.siteH), 'm', R.fence, 'Site works', rref('fence', d.rFence), 'Treatment plant');
    addCivil('Main sliding gate 6.3 × 2.4 m', 1, 'nr', civilRate('gate', d.markup), 'Site works', rbRef(CIVIL.gate.ref) + ` + ${d.markup} %`, 'Treatment plant');
    addCivil('Site drainage & landscaping – indicative', lay.siteArea, 'm²', 1500, 'Site works', 'indicative', 'Treatment plant');
  }
  const civilSub = civil.reduce((a, x) => a + x.amount, 0);
  addCivil('Yard piping, channels & valves (allowance)', 1, 'lot', (d.yardPipingPct / 100) * civilSub, 'Site works', `${d.yardPipingPct} % of civil works`, 'Treatment plant');
  // ---------------- electrical (RB graphs) – transformer & HV supplied by CEB (item ii)
  const en = r.energy;
  if (en) {
    const g = generatorCost(en.genKva);
    addME(`Standby generator ${en.genKva} kVA (water-cooled)`, 1, 'nr', g.value * (1 + d.sparesPct / 100), 'Electrical', g.ref);
    const mp = panelCost(en.kwConnected, 'main');
    addME(`Main incoming panel incl. ATS & capacitor banks (${Math.round(en.kwConnected)} kW)`, 1, 'nr', mp.value, 'Electrical', mp.ref);
  }
  const elecSub = me.filter((x) => x.group === 'Electrical' || /starters|distribution panel/.test(x.item)).reduce((a, x) => a + x.amount, 0);
  addME('LV cabling, cable management, earthing & lightning protection (allowance)', 1, 'lot', (d.cablePct / 100) * elecSub, 'Electrical', `${d.cablePct} % of switchgear (cable lengths not designed; RB B-ELE/04–05, ELE/11, ELE/15)`);
  const meSub0 = me.reduce((a, x) => a + x.amount, 0);
  addME('Instrumentation (turbidity, pH, chlorine, level), PLC/SCADA & telemetry', 1, 'lot', (d.icaPct / 100) * meSub0, 'Instrumentation', `${d.icaPct} % of M&E (RB A-A/01 process automation by item at detailed design)`, 'SCADA');
  // ---------------- facilities
  if (d.facilities) {
    const kQ = Math.max(0.4, Math.sqrt(Q / 20000));
    addME('Laboratory instruments & glassware (WTP set)', 1, 'lot', LAB_WTP.v, 'Facilities', rbRef(LAB_WTP.ref), 'Treatment plant');
    addME('Communication facilities (telephone, radio, telemetry link) – indicative', 1, 'lot', 2.5e6 * kQ, 'Facilities', 'indicative', 'SCADA');
    addME('Access & safety facilities, PPE, first-aid & fire fighting – indicative', 1, 'lot', 3e6 * kQ, 'Facilities', 'indicative', 'Treatment plant');
    addME('Office furniture & stores equipment – indicative', 1, 'lot', 2e6 * kQ, 'Facilities', 'indicative', 'Buildings');
    if (d.format === 'd2') addME('Transport – operations vehicle', 1, 'nr', d.vehicles, 'Facilities', 'provisional sum', 'Vehicles');
  }
  const civilTot = civil.reduce((a, x) => a + x.amount, 0);
  const meTot = me.reduce((a, x) => a + x.amount, 0);
  const boqWorks = civilTot + meTot;
  // ---------------- composite (Section A) estimate – How to use, item 1: rates from Section A tables & graphs first
  const comp = [];
  const addComp = (item, qty, unit, rt, group, refTxt, cat) => comp.push({ item, qty, unit, rate: rt, amount: qty * rt, group, ref: refTxt, cat });
  const proc = r.process;
  const outsideUC = (x) => ['Mains', 'Intake', 'Intake well'].includes(x.group) || /Raw-water EM flow meter/.test(x.item) || (x.group === 'Buildings' && /Administration|Guard|quarters|Workshop/i.test(x.item)) || /Laboratory instruments/.test(x.item);
  let ucNote = '';
  if (!proc.ssf) {
    const uc7 = graph('UC/07', Q);
    addComp(`Treatment plant – base cost ${fmt(Q, 0)} m³/d (process units, pump house & reservoir within the site, sludge treatment, site works, automation, M&E)`, Q, 'm³/d', uc7.value, 'Treatment plant', rbRef('Graph A-UC/07 (markup & duties incl., VAT excl.)') + (uc7.extrap ? ' – extrapolated' : ''), 'Treatment plant');
    ucNote = 'UC/07';
  } else {
    if (fi) { const A = fi.N * fi.Af; const g = graph('UC/05', A); addComp(`Slow sand filters ${fmt(A, 0)} m² (excl. M&E)`, A, 'm²', g.value, 'Slow sand filters', rbRef('Graph A-UC/05'), 'Treatment plant'); }
    if (sed?.enabled) { const V = sed.N * sed.L * sed.W * sed.totalDepth; const g = graph('UC/03', V); addComp(`Plain sedimentation tanks ${fmt(V, 0)} m³ (excl. M&E)`, V, 'm³', g.value, 'Sedimentation tanks', rbRef('Graph A-UC/03'), 'Treatment plant'); }
    if (st) { const g = graph('UC/01', st.V); addComp(`Clear water reservoir ${fmt(st.V, 0)} m³ (excl. M&E)`, st.V, 'm³', g.value, 'Clear water reservoir', rbRef('Graph A-UC/01'), 'Ground reservoirs'); }
    for (const x of [...civil, ...me]) if (!outsideUC(x) && !['Slow sand filters', 'Filter media', 'Sedimentation tanks', 'Clear water reservoir'].includes(x.group)) comp.push({ ...x, ref: x.ref || 'BOQ (Section B)' });
    ucNote = 'UC/05, UC/03, UC/01 + BOQ';
  }
  for (const x of [...civil, ...me]) if (outsideUC(x)) comp.push(x);
  const compTot = comp.reduce((a, x) => a + x.amount, 0);
  const useComp = d.method !== 'boq';
  const works = useComp ? compTot : boqWorks;
  const worksItems = useComp ? comp : [...civil, ...me];
  // ---------------- O&M (D2 §10.1.2)
  const staff = {
    engineer: 1, chemist: Q >= 5000 ? 1 : 0, labAsst: Q > 20000 ? 3 : 2, operator: 3 * (Q > 30000 ? 3 : 2),
    fitter: Q > 30000 ? 3 : 2, labourer: 4 + Math.round(Q / 10000) + (r.filt?.type === 'ssf' ? 2 : 0), security: 3,
  };
  const staffCost = Object.entries(staff).reduce((a, [k, nn]) => a + nn * d.salaries[k] * 13, 0);
  const chemBase = (co ? co.costs.coag + co.costs.lime + co.costs.soda + co.costs.poly + (co.costs.pac || 0) : 0) + (r.stab?.cost || 0) + (dis?.annualCost || 0);
  const chem = chemBase * (1 + d.chemTransportPct / 100);
  const power = en ? en.annualBill + (en.fuelCost || 0) : 0;
  const maint = ((meTot * d.maintMEPct) / 100 + (civilTot * d.maintCivilPct) / 100) * (works / Math.max(boqWorks, 1));
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
  const land = lay ? lay.perches * d.landPerPerch : 0;
  // ---------------- capital estimate
  const est = {};
  let capex, prelim, prelimPct, contPct, cont, eng, vat, om2 = 0, sub3, escal = 0;
  if (d.format === 'd2') {
    prelimPct = d.d2PrelimPct > 0 ? d.d2PrelimPct : Q < 10000 ? 1.0 : Q < 25000 ? 0.75 : 0.5;
    contPct = d.d2ContPct > 0 ? d.d2ContPct : d.stage === 'prefeasibility' ? COST.contPreFeasibility : d.stage === 'detailed' ? 10 : 12.5;
    prelim = (works * prelimPct) / 100;
    om2 = d.include2yrOM ? 2 * omTot : 0;
    sub3 = works + prelim + om2 + land;
    eng = (sub3 * d.d2EngPct) / 100;
    cont = (sub3 * contPct) / 100;
    vat = (sub3 * d.vatPct) / 100;
    capex = sub3 + eng + cont + vat;
    escal = d.escalationPct > 0 ? capex * ((1 + d.escalationPct / 100) ** d.escalationYears - 1) : 0;
    calc.section('Capital cost – NWSDB D2 §10.2 format (base year)');
    calc.text(`Line-item rates are NWSDB Rate Book 2025 rates incl. the contractor's markup. ${FACILITIES.length} facility items of the D2 §10.2 checklist are ${d.facilities ? 'included' : 'excluded'}.`);
    calc.step('1. Civil & building works', 'C_{civ}', '', civilTot, 'LKR');
    calc.step('1. Mechanical, electrical & facilities', 'C_{M\\&E}', '', meTot, 'LKR');
    calc.step(`Preliminaries (${prelimPct} % of ECC)`, 'C_{pre}', '', prelim, 'LKR', ref('10.1.1') + ' – ½ to 1 %');
    if (land > 0) calc.step('Land acquisition', 'C_{land}', '', land, 'LKR', ref('10.1.1'));
    calc.step('2. Operation & maintenance for 2 years', '2\\,C_{O\\&M}', `2\\times${n(omTot / 1e6, 1)}\\,M`, om2, 'LKR', ref('10.1.1, 10.2'));
    calc.step('3. Subtotal of line items', 'C_3', '', sub3, 'LKR');
    calc.step(`4. Engineering design & supervision (${d.d2EngPct} % of 3)`, 'C_{eng}', '', eng, 'LKR', ref('10.2') + ' – 6 % design + 2 % supervision');
    calc.step(`5. Physical contingencies (${contPct} % of 3, ${d.stage})`, 'C_{cont}', '', cont, 'LKR', ref('10.2'));
    calc.step(`6. Taxes (${d.vatPct} % of 3)`, 'C_{tax}', '', vat, 'LKR', ref('10.2') + ' – BTT 3 % (1989); VAT now');
    calc.step('7. Total capital cost (base year)', 'C', '', capex, 'LKR');
    if (escal > 0) calc.step(`8. Price escalation for funding (${d.escalationPct} % p.a., ${d.escalationYears} yr)`, 'C[(1+e)^t - 1]', '', escal, 'LKR', ref('10.2'));
    calc.flag('Preliminaries within D2 range (½–1 % of ECC)', prelimPct >= 0.5 && prelimPct <= 1, `${prelimPct} %`, '0.5 – 1 %', '', 'info', ref('10.1.1'));
    calc.flag('Engineering & supervision allowance', Math.abs(d.d2EngPct - COST.engineering) < 0.01, `${d.d2EngPct} %`, '8 %', '', 'info', ref('10.2'));
    Object.assign(est, { format: 'd2', rows: [['Civil & building works', civilTot], ['M&E & facilities', meTot], [`Preliminaries (${prelimPct} %)`, prelim], ['O&M for 2 years', om2], ['Land', land], ['Sub total (3)', sub3], [`Engineering (${d.d2EngPct} %)`, eng], [`Contingencies (${contPct} %)`, cont], [`Taxes (${d.vatPct} %)`, vat], ['Total capital cost', capex]] });
  } else {
    // RB 2025 total cost estimate (How to use, items 1–21; Table 1)
    const ici = d.procurement === 'icb' ? 1 : 0;
    const lcOf = (cat) => (LCFC[cat] || LCFC['Treatment plant'])[ici];
    const t = d.escalate ? Math.max(0, d.implStart - (RB.baseYear + 1) + d.implYears / 2) : 0;
    const escOf = (amt, cat) => { const lc = lcOf(cat); return amt * (lc * ((1 + RB.escLC / 100) ** t - 1) + (1 - lc) * ((1 + RB.escFC / 100) ** t - 1)); };
    const items = worksItems;
    escal = items.reduce((a, x) => a + escOf(x.amount, x.cat), 0);
    const lcWorks = items.reduce((a, x) => a + x.amount * lcOf(x.cat), 0);
    const worksEsc = works + escal;
    prelimPct = d.prelimPct > 0 ? d.prelimPct : worksEsc * 1.04 > RB.prelimThreshold ? RB.prelimLarge : RB.prelimSmall;
    prelim = (worksEsc * prelimPct) / 100;
    const eiaA = d.eia;
    const st1 = worksEsc + prelim + eiaA;
    const row = ENG_PCT[d.fundSource] || ENG_PCT.gosl;
    const engPct = d.engPct > 0 ? d.engPct : st1 >= 100e6 ? row.ge100 : row.lt100;
    eng = (st1 * engPct) / 100;
    const ps = d.powerSupply && en ? cebBulkSupply(Math.max(100, en.kva), d.supplyKv) : { value: 0, ref: '' };
    const roadPower = d.roadReinst + ps.value;
    const rwss = d.rwss ? (st1 * RB.rwss) / 100 : 0;
    const prov = d.vehicles + d.training;
    const st2 = st1 + eng + roadPower + land + rwss + prov + d.duties;
    contPct = d.contPct > 0 ? Math.min(d.contPct, RB.contingencyMax) : RB.contingencyMax;
    cont = ((st1 + d.duties) * contPct) / 100;
    sub3 = st2 + cont;
    vat = (sub3 * d.vatPct) / 100;
    capex = sub3 + vat;
    calc.section('Total cost estimate – NWSDB Rate Book 2025 format (Table 1)');
    calc.text(`Composite rates from the NWSDB Rate Book 2025 (Section A tables & graphs; Section B unit rates where no composite rate exists) with ${d.markup} % contractor's markup added where the book excludes it (How to use, item 2). Pipe laying adjusted by the B-COM/02 location factor for ${setup.district || '—'} (${factor}). Items marked "indicative" are not priced in the Rate Book.`);
    if (useComp) {
      calc.step(`Contractual composite items – RB Section A (${ucNote}; intake, mains, administration & laboratory from Section A/B rates)`, 'C_{works}', '', compTot, 'LKR', rbRef('How to use, item 1'));
      calc.step('For reference: quantity-based BOQ with Section B unit rates (Engineer\'s estimate)', 'C_{BOQ}', '', boqWorks, 'LKR');
    } else {
      calc.step('Civil & building works (base 2025, Section B unit rates)', 'C_{civ}', '', civilTot, 'LKR');
      calc.step('Mechanical, electrical & facilities (base 2025)', 'C_{M\\&E}', '', meTot, 'LKR');
    }
    if (t > 0) calc.step(`Price escalation to mid-implementation (${t.toFixed(1)} yr beyond 31.12.2025; LC ${RB.escLC} %, FC ${RB.escFC} % p.a.; Table 2 ${d.procurement.toUpperCase()} factors)`, 'E = \\sum C_i[f_{LC}((1.05)^t-1)+f_{FC}((1.03)^t-1)]', `t=${n(t, 1)}`, escal, 'LKR', rbRef('How to use, item 7; Table 2'));
    calc.step(`Preliminaries (${prelimPct} % – ${prelimPct === RB.prelimLarge ? 'project > LKR 500 M' : 'project ≤ LKR 500 M'})`, 'C_{pre}', '', prelim, 'LKR', rbRef('Items to be included, 1'));
    if (eiaA) calc.step('EIA / IEE (provisional sum)', '', '', eiaA, 'LKR', rbRef('Items to be included, 3'));
    calc.step('SUB TOTAL 1', 'ST_1', '', st1, 'LKR', rbRef('How to use, item 8'));
    calc.step(`(i) Investigation, feasibility, design, tender & supervision (${engPct} % of ST1 – ${row.label})`, '', '', eng, 'LKR', rbRef('Table 4'));
    calc.step('(ii) Road reinstatement & power supply', '', ps.value ? `CEB\\ bulk\\ supply\\ ${n(en.kva, 0)}\\,kVA` : '', roadPower, 'LKR', ps.ref || rbRef('item 10'));
    if (land) calc.step('(iii) Land acquisition', '', '', land, 'LKR', rbRef('item 10'));
    if (rwss) calc.step(`(iv) Improvement of rural water supply, sanitation & water-resource development (${RB.rwss} % of ST1)`, '', '', rwss, 'LKR', rbRef('How to use, item 11'));
    if (prov) calc.step('Provisional sums – vehicles, training', '', '', prov, 'LKR', rbRef('items 12–14'));
    if (d.duties) calc.step('(v) Duties & fiscal levies', '', '', d.duties, 'LKR', rbRef('item 15'));
    calc.step('SUB TOTAL 2', 'ST_2', '', st2, 'LKR', rbRef('item 16'));
    calc.step(`Physical contingencies (${contPct} % of ST1 + duties)`, '', '', cont, 'LKR', rbRef('item 17 – maximum 10 %'));
    calc.step('SUB TOTAL 3', 'ST_3', '', sub3, 'LKR', rbRef('item 18'));
    calc.step(`VAT (${d.vatPct} % of ST3)`, '', '', vat, 'LKR', rbRef('item 19; Annex 14'));
    calc.step('TOTAL IMPLEMENTING COST', 'C', '', capex, 'LKR');
    calc.step('Local / foreign currency share of the works', 'f_{LC}', '', (lcWorks / Math.max(works, 1)) * 100, '% LC', rbRef(`Table 2 (${d.procurement.toUpperCase()})`));
    calc.flag('Physical contingency within RB limit (≤ 10 % of Sub Total 1)', contPct <= RB.contingencyMax, `${contPct} %`, '≤ 10 %', '', 'info', rbRef('How to use, item 17'));
    calc.flag('VAT rate per Annex 14 gazette (18 %)', d.vatPct === RB.vat, `${d.vatPct} %`, '18 %', '', 'info', rbRef('Annex 14'));
    Object.assign(est, {
      format: 'rb2025', t, lcPct: (lcWorks / Math.max(works, 1)) * 100, engPct, st1, st2, rwss, roadPower, ps, prov,
      rows: [...(useComp ? [[`Contractual composite items (RB Section A – ${ucNote})`, compTot]] : [['Civil & building works (2025 prices)', civilTot], ['M&E & facilities (2025 prices)', meTot]]), [`Price escalation (${n(t, 1)} yr)`, escal], [`Preliminaries (${prelimPct} %)`, prelim], ...(eiaA ? [['EIA / IEE', eiaA]] : []), ['SUB TOTAL 1', st1],
        [`(i) Investigation, design & supervision (${engPct} %)`, eng], ['(ii) Road reinstatement & power supply (CEB)', roadPower], ...(land ? [['(iii) Land acquisition', land]] : []), ...(rwss ? [['(iv) RWS&S / water-resource improvement (5 %)', rwss]] : []), ...(prov ? [['Vehicles & training (p.sum)', prov]] : []), ...(d.duties ? [['(v) Duties & fiscal levies', d.duties]] : []),
        ['SUB TOTAL 2', st2], [`Physical contingencies (${contPct} %)`, cont], ['SUB TOTAL 3', sub3], [`VAT (${d.vatPct} %)`, vat], ['TOTAL IMPLEMENTING COST', capex]],
    });
  }
  calc.step('Capital cost per m³/d of capacity', 'C/Q', `${n(capex / 1e6, 0)}\\,M/${n(Q, 0)}`, capex / Q, 'LKR per m³/d');
  // parametric cross-check: RB Graph A-UC/07 (treatment plant base cost, incl. markup & duties, excl. VAT)
  const uc7 = graph('UC/07', Q);
  const ucBase = uc7.value * Q;
  const boqBase = works;
  calc.section('Cross-check with RB 2025 unit-cost graphs');
  calc.step('RB Graph A-UC/07 unit cost of a treatment plant', 'c_{UC07}(Q)', `Q=${n(Q, 0)}`, uc7.value, 'LKR per m³/d', rbRef('Graph A-UC/07') + (uc7.extrap ? ' – extrapolated' : ''));
  calc.step('Parametric base cost (excl. intake, mains, administration buildings, VAT)', 'C_{UC07} = c\\,Q', '', ucBase, 'LKR');
  const plantOnly = [...civil, ...me].filter((x) => !['Mains', 'Intake', 'Intake well'].includes(x.group) && !/Administration|quarters|Guard/i.test(x.item)).reduce((a, x) => a + x.amount, 0);
  calc.step('Quantity-based BOQ for the same scope', 'C_{BOQ}', '', plantOnly, 'LKR');
  calc.flag('BOQ within ±35 % of the RB Graph A-UC/07 parametric cost', Math.abs(plantOnly / ucBase - 1) <= 0.35, `${n((plantOnly / ucBase) * 100, 0)} %`, '65–135 %', 'review the indicative (non-RB) items if outside', 'info', rbRef('Graph A-UC/07'));
  const cross = [{ item: 'Treatment plant (UC/07)', rb: ucBase, boq: plantOnly }];
  if (st) { const g = graph('UC/01', st.V); cross.push({ item: `Clear water reservoir ${fmt(st.V, 0)} m³ (UC/01, excl. M&E)`, rb: g.value * st.V, boq: civil.filter((x) => x.group === 'Clear water reservoir').reduce((a, x) => a + x.amount, 0) }); }
  if (sed?.enabled) { const V = sed.N * sed.L * (sed.W || 0) * sed.totalDepth; if (V > 0) { const g = graph('UC/03', V); cross.push({ item: `Sedimentation tanks ${fmt(V, 0)} m³ (UC/03, excl. M&E)`, rb: g.value * V, boq: civil.filter((x) => x.group === 'Sedimentation tanks').reduce((a, x) => a + x.amount, 0) }); } }
  if (fi && fi.type !== 'ssf') { const g = graph('UC/04', Q, 0); cross.push({ item: 'Rapid sand filters (UC/04, excl. M&E/MOV/SCADA)', rb: g.value, boq: civil.filter((x) => ['Filter boxes', 'Filter media'].includes(x.group)).reduce((a, x) => a + x.amount, 0) }); }
  // ---- O&M sheet
  calc.section('Annual operation & maintenance (D2 §10.1.2; prices NWSDB RB 2025)');
  for (const [k, v] of Object.entries(omDirect)) calc.step(k, '', '', v, 'LKR/yr', k === 'Chemicals' ? `RB 2025 Tables A-CH/01–02 + ${d.chemTransportPct} % transport & handling` : k === 'Electricity' ? `CEB tariff (RB 2025 Annex 8)` : k === 'Repairs & maintenance' ? ref('10.1.2') + ` – ${d.maintMEPct} % of M&E + ${d.maintCivilPct} % of civil` : '');
  calc.step(`NWSDB / LA overhead (${d.omOverheadPct} %)`, '', '', omOver, 'LKR/yr', ref('10.2'));
  calc.step(`Contingency (${d.omContPct} %)`, '', '', omCont, 'LKR/yr', ref('10.1.2'));
  calc.step('O&M cost per m³ produced', 'c_{O\\&M} = \\frac{C_{O\\&M}}{365\\,\\bar Q}', `\\frac{${n(omTot / 1e6, 1)}\\,M}{365\\times${n(Qop, 0)}}`, omPerM3, 'LKR/m³');
  // ---- comparative cost analysis (D2 §10.3)
  calc.section('Comparative cost analysis – equivalent annual cost (D2 §10.3)');
  const i = d.interest / 100;
  const meShare = meTot / Math.max(boqWorks, 1);
  const capCivil = capex * (1 - meShare), capME = capex * meShare;
  const crf = eac(1, i, d.life);
  const capAnnual = eac(capCivil, i, d.life) + eac(capME, i, d.lifeME);
  calc.step('Equivalent annual cost of structures', 'EAC = C\\frac{r(1+r)^n}{(1+r)^n-1}', `r=${n(d.interest)}\\%,\\ n=${d.life}`, eac(capCivil, i, d.life), 'LKR/yr', ref('10.3.2'));
  calc.step('Equivalent annual cost of M&E (replacement period)', 'EAC_{M\\&E}', `n=${d.lifeME}`, eac(capME, i, d.lifeME), 'LKR/yr', ref('2.4, 10.3.2'));
  const fullPerM3 = (omTot + capAnnual) / prod;
  calc.step('Unit cost of water produced (EAC + O&M)', 'c = \\frac{EAC + C_{O\\&M}}{365\\,\\bar Q}', '', fullPerM3, 'LKR/m³', ref('10.3.2'));
  let pvOM = 0;
  for (let tt = 1; tt <= COST.projectionYears; tt++) pvOM += presentValue(omTot, i, tt);
  const pvTotal = capex + pvOM;
  calc.step(`Present value of ${COST.projectionYears}-year O&M`, 'PV = \\sum \\frac{C_{O\\&M}}{(1+r)^t}', '', pvOM, 'LKR', ref('10.3.1'));
  calc.step('Present value of capital + O&M', 'PV_{tot}', '', pvTotal, 'LKR', ref('10.3.1'));
  const sens = [8, 10, 12, 15].map((rp) => { const rr = rp / 100; const ca = eac(capCivil, rr, d.life) + eac(capME, rr, d.lifeME); return { r: rp, cap: ca / prod, om: omPerM3, total: (ca + omTot) / prod }; });
  calc.flag('Discount rate within World-Bank range (8–15 %)', d.interest >= 8 && d.interest <= 15, `${d.interest} %`, '8 – 15 %', 'run several rates (sensitivity chart)', 'info', ref('10.3.2'));
  const groupTotals = {};
  for (const x of [...civil, ...me]) groupTotals[x.group] = (groupTotals[x.group] || 0) + x.amount;
  const worksGroups = {};
  for (const x of worksItems) worksGroups[x.group] = (worksGroups[x.group] || 0) + x.amount;
  const indicative = [...civil, ...me].filter((x) => /indicative/i.test(x.ref || '')).reduce((a, x) => a + x.amount, 0);
  return {
    inputs: d, civil, me, civilTot, meTot, works, boqWorks, comp, compTot, method: useComp ? 'composite' : 'boq', prelim, prelimPct, contPct, om2, sub3, cont, eng, vat, escal, land, capex, perCap: capex / Q, usd: capex / d.usd,
    staff, om, omDirect, omTot, omPerM3, crf, capAnnual, fullPerM3, groupTotals, worksGroups, prod, pvOM, pvTotal, sens, est, cross, district: setup.district, factor, rates: R, indicativePct: (indicative / Math.max(boqWorks, 1)) * 100, indicative,
    ...calc.result(),
  };
}
