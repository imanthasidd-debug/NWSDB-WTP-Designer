// Electrical loads, maximum demand, transformer & standby generator sizing, energy use and CEB bill estimate
import { Calc, n } from '../core/calc.js';
import { DIESEL_KG_PER_KWH, ref } from '../core/d2.js';
import { GENSET_KVA, TRANSFORMER_KVA, nextStd } from '../core/util.js';
import { DIESEL, RB, TARIFFS, TOU_HOURS, blendedRate, rbRef } from '../core/ratebook.js';

export const DEFAULTS = {
  pf: 0.85,
  diversity: 0.9,
  tariff: 'auto',        // CEB tariff category (NWSDB RB 2025 Annex 8, June 2025): auto | I-2 | I-3 | GP-2 | GP-3 | GV-2 | GV-3
  energyRate: 0,         // LKR/kWh – 0 = time-of-use blend of the selected tariff (+ 2.5 % SSCL)
  demandRate: 0,         // LKR/kVA/month – 0 = tariff
  fixedCharge: 0,        // LKR/month – 0 = tariff
  genEssentialPumps: 1,  // duty pumps per station on generator
  outageHours: 120,      // h/yr of standby generation (CEB outages, maintenance)
  dieselPrice: DIESEL.v, // LKR/L (RB 2025 Annex 1, July 2025)
  extraLoads: [],        // [{name, kw, hours}]
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const dem = r.demand;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100);
  const L = [];
  const add = (group, name, kwEach, nRun, hours, nInst = nRun, essential = true) => { if (kwEach > 0 && nRun > 0) L.push({ group, name, kwEach, nRun, nInst, kw: kwEach * nRun, hours, kwh: kwEach * nRun * hours, essential }); };
  const ip = r.intake?.pumps;
  if (ip) add('Pumping', 'Raw-water pumps', ip.motor, ip.nDuty, dem.inputs.opHours, ip.nDuty + ip.nStandby);
  const tp = r.storage?.pumps;
  if (tp) add('Pumping', 'Treated-water pumps', tp.motor, tp.nDuty, r.storage.inputs.pumpHours, tp.nDuty + tp.nStandby);
  const fi = r.filt;
  if (fi && fi.type !== 'ssf') {
    const washesD = fi.N * fi.washesPerDay;
    add('Filtration', 'Backwash pumps', fi.bwPumpKw, 1, (washesD * fi.inputs.bwMinutes) / 60, 2);
    if (fi.blowerKw) add('Filtration', 'Air-scour blowers', fi.blowerKw, 1, (washesD * fi.inputs.airMinutes) / 60, 2);
  }
  const rm = r.rapidmix;
  if (rm?.enabled && rm.type === 'mechanical') add('Process', 'Flash mixers', rm.motor, rm.nBasins, 24, rm.nBasins);
  const fl = r.floc;
  if (fl?.enabled && fl.type === 'paddle') add('Process', 'Paddle flocculator drives', fl.kw / Math.max(1, fl.stages.length * fl.nT), fl.stages.length * fl.nT, 24);
  const sed = r.sed;
  if (sed?.enabled) add('Process', sed.type === 'circ' ? 'Clarifier scraper drives' : 'Chain-and-flight sludge scrapers', sed.type === 'circ' ? 1.5 : 0.75, sed.N, 24);
  const co = r.coag;
  if (co) {
    add('Chemicals', 'Coagulant dosing pumps', 0.37, co.nDosingPumps - 1, 24, co.nDosingPumps);
    add('Chemicals', 'Solution-tank agitators', co.agitatorKw, 1, 8, co.inputs.nTanks);
    if (co.limeDose > 0 || r.stab?.lime > 0) add('Chemicals', 'Lime slurry mixers & pumps', 1.1, 2, 24, 4);
  }
  const dis = r.dis;
  if (dis) add('Chemicals', dis.key === 'gas' ? 'Chlorinator booster pumps' : 'Hypochlorite dosing pumps', dis.key === 'gas' ? 5.5 : 0.55, 1, 24, 2);
  const sl = r.sludge;
  if (sl) {
    add('Residuals', 'Sludge transfer pumps', 7.5, 1, 6, 2, false);
    if (sl.recTank > 0) add('Residuals', 'Wash-water recovery pumps', 5.5, 1, 10, 2, false);
    if (sl.thick) add('Residuals', 'Thickener drive', 0.75, sl.thick.n, 24, sl.thick.n, false);
    if (sl.mech) add('Residuals', 'Dewatering units', 15, sl.mech.units, sl.inputs.dewaterHours, sl.mech.units + 1, false);
  }
  add('Buildings', 'Administration & laboratory', 25, 1, 10);
  add('Buildings', 'Site & building lighting', 15, 1, 12);
  add('Buildings', 'Workshop', 10, 1, 4, 1, false);
  add('Buildings', 'Instrumentation, SCADA & telemetry', 5, 1, 24);
  for (const e of d.extraLoads || []) add('Other', e.name || 'Other load', +e.kw || 0, 1, +e.hours || 0);
  const kwConnected = L.reduce((a, x) => a + x.kwEach * x.nInst, 0);
  const kwRunning = L.reduce((a, x) => a + x.kw, 0);
  const kwhD = L.reduce((a, x) => a + x.kwh, 0);
  calc.section('Maximum demand');
  calc.step('Connected load', '\\sum P_{inst}', '', kwConnected, 'kW');
  calc.step('Running load (duty units)', '\\sum P_{run}', '', kwRunning, 'kW');
  const md = kwRunning * d.diversity;
  const kva = md / d.pf;
  calc.step('Maximum demand', 'S = \\frac{k_d\\,P_{run}}{\\cos\\varphi}', `\\frac{${n(d.diversity)}\\times${n(kwRunning)}}{${n(d.pf)}}`, kva, 'kVA');
  const tx = nextStd(kva * 1.25, TRANSFORMER_KVA);
  calc.step('Transformer (25 % spare capacity)', 'S_T \\geq 1.25 S', `1.25\\times${n(kva)}`, tx, 'kVA');
  const largest = Math.max(...L.map((x) => x.kwEach));
  const ess = L.filter((x) => x.essential).reduce((a, x) => a + (x.group === 'Pumping' ? x.kwEach * Math.min(x.nRun, d.genEssentialPumps) : x.kw), 0);
  const genKva = nextStd((ess + largest * 1.5) / 0.8, GENSET_KVA);
  calc.step('Standby generator (essential loads + largest motor start)', 'S_G = \\frac{P_{ess} + 1.5P_{max}}{0.8}', `\\frac{${n(ess)} + 1.5\\times${n(largest)}}{0.8}`, genKva, 'kVA');
  // D2 §6.4.1: all essential pumping systems need an alternative source of power (engine-driven generator)
  const genLoad = Math.min(genKva * 0.8, ess + largest) * 0.75;
  const fuelKg = genLoad * d.outageHours * DIESEL_KG_PER_KWH[1];
  const fuelL = fuelKg / 0.84;
  const fuelCost = fuelL * d.dieselPrice * 1.05; // + 5 % lubricating oil (D2 Table 6.2)
  calc.step('Standby generation – diesel use', 'm_f = P_{gen}\\,t_{out}\\,s_f', `${n(genLoad, 0)}\\times${n(d.outageHours, 0)}\\times${DIESEL_KG_PER_KWH[1]}`, fuelL, 'L/yr', ref('Table 6.2') + ' – 0.21 (good) to 0.28 kg/kWh, lube oil + 5 %');
  calc.flag('Engine-driven standby generator for essential pumping', genKva > 0, `${genKva} kVA`, 'provided', '', 'warn', ref('6.4.1'));
  calc.section('Energy');
  calc.step('Daily energy (design flow)', 'E = \\sum P\\,h', '', kwhD, 'kWh/d');
  const scale = Qop / dem.Qd;
  const kwhOp = kwhD * (0.25 + 0.75 * scale);
  const spec = kwhOp / Qop;
  calc.step('Specific energy at operating flow', 'e = E/Q', `${n(kwhOp, 0)}/${n(Qop, 0)}`, spec, 'kWh/m³');
  calc.section('Electricity tariff (CEB, NWSDB RB 2025 Annex 8 – effective 12.06.2025)');
  const tcode = d.tariff && d.tariff !== 'auto' ? d.tariff : kva >= 100 ? 'I-3' : 'I-2';
  const bl = blendedRate(tcode);
  const eRate = d.energyRate > 0 ? d.energyRate : bl.rate;
  const dRate = d.demandRate > 0 ? d.demandRate : bl.t.demand;
  const fCharge = d.fixedCharge > 0 ? d.fixedCharge : bl.t.fixed;
  calc.text(`Tariff category ${tcode} – ${TARIFFS[tcode].label}${d.tariff === 'auto' ? ' (auto: 11 kV bulk supply above 100 kVA, else 400 V; the Rate Book does not state the category for NWSDB plants – confirm with CEB)' : ''}.`);
  calc.step('Time-of-use blended energy charge (24 h operation, incl. SSCL)', 'c_e = \frac{13c_{day}+4c_{peak}+7c_{off}}{24}(1+SSCL)', `\frac{13\times${bl.t.day}+4\times${bl.t.peak}+7\times${bl.t.off}}{24}\times${n(1 + RB.sscl / 100, 3)}`, eRate, 'LKR/kWh', bl.ref);
  calc.step('Demand charge', 'c_d', '', dRate, 'LKR/kVA/month', rbRef('Annex 8'));
  calc.step('Fixed charge', 'F', '', fCharge, 'LKR/month', rbRef('Annex 8'));
  void TOU_HOURS;
  const monthlyBill = kwhOp * 30.4 * eRate + kva * dRate + fCharge;
  calc.step('Monthly electricity bill (CEB)', 'B = 30.4E\\,c_e + S\\,c_d + F', `30.4\\times${n(kwhOp, 0)}\\times${n(eRate)} + ${n(kva, 0)}\\times${n(dRate)} + ${n(fCharge)}`, monthlyBill, 'LKR');
  const groups = {};
  for (const x of L) groups[x.group] = (groups[x.group] || 0) + x.kwh;
  return { inputs: d, tariff: tcode, energyRate: eRate, demandRate: dRate, fixedCharge: fCharge, loads: L, kwConnected, kwRunning, md, kva, tx, genKva, kwhD, kwhOp, spec, monthlyBill, annualBill: monthlyBill * 12, fuelL, fuelCost, groups, ...calc.result() };
}
