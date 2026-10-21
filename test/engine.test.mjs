// Engine verification: independent hand calculations and invariants (run: node test/engine.test.mjs)
import assert from 'node:assert/strict';
import { computeAll, newProject } from '../src/engine/index.js';
import { CTfrom, DOsat, ctGiardia, mu, pHfrom, rho, stability } from '../src/core/water.js';
import { gradation } from '../src/engine/filtration.js';
import { SAMPLES } from '../src/ui/samples.js';
import * as D2 from '../src/core/d2.js';
import * as D3 from '../src/core/d3.js';
import { gravelRuleCheck } from '../src/engine/filtration.js';
import { diffSnapshots, kpiSnapshot } from '../src/engine/chain.js';

let pass = 0, fail = 0;
const near = (a, b, tol, msg) => {
  const ok = Math.abs(a - b) <= Math.abs(tol);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}: got ${a}, expected ${b} ± ${tol}`); }
};
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error('✗ ' + msg); } };

// ---- water properties (CRC handbook values)
near(rho(20), 998.21, 0.05, 'density 20 °C');
near(mu(20) * 1000, 1.002, 0.01, 'viscosity 20 °C');
near(mu(28) * 1000, 0.834, 0.01, 'viscosity 28 °C');
near(DOsat(20), 9.09, 0.05, 'DO saturation 20 °C');
near(DOsat(28), 7.83, 0.06, 'DO saturation 28 °C');

// ---- carbonate system round trip
const CT = CTfrom(7.0, 100, 25);
near(pHfrom(100, CT, 25), 7.0, 1e-6, 'pH ↔ alkalinity round trip');
// adding strong acid equivalent to 20 mg/L CaCO3 lowers pH
ok(pHfrom(80, CT, 25) < 7.0, 'alkalinity loss lowers pH');

// ---- LSI (worked example: pH 7.5, 25 °C, TDS 320, CaH 150, Alk 120 → LSI ≈ +0.0 .. +0.1)
const st = stability({ pH: 7.5, TDS: 320, T: 25, caH: 150, alk: 120 });
near(st.pHs, 7.684, 0.01, 'pHs (Carrier formula, hand-calculated)');

// ---- CT tables (USEPA, 3-log Giardia, free chlorine) – regression within 15 % of tabulated values
near(ctGiardia(3, 25, 7.0, 1.0), 37, 37 * 0.15, 'CT 25 °C pH 7 C 1.0');
near(ctGiardia(3, 20, 7.5, 1.0), 67, 67 * 0.15, 'CT 20 °C pH 7.5 C 1.0');
near(ctGiardia(3, 5, 7.0, 1.0), 149, 149 * 0.15, 'CT 5 °C pH 7 C 1.0');

// ---- sieve analysis
const g = gradation([{ size: 0.3, pass: 0 }, { size: 0.425, pass: 3 }, { size: 0.5, pass: 11 }, { size: 0.6, pass: 38 }, { size: 0.71, pass: 62 }, { size: 0.85, pass: 84 }, { size: 1.0, pass: 96 }, { size: 1.18, pass: 100 }]);
near(g.d10, 0.49, 0.01, 'ES from sieve analysis');
near(g.UC, 1.43, 0.03, 'UC from sieve analysis');

// ---- full default project
const p = newProject();
const r = computeAll(p);
ok(Object.keys(r.errors).length === 0, 'default project computes without errors: ' + JSON.stringify(r.errors));
near(r.demand.adopted, 42000, 0, 'adopted capacity');
// hand check of demand chain
const D = r.demand.design;
near(D.gross, D.net / 0.75, 1e-6, 'NRW gross-up');
near(D.mdd, D.gross * 1.25, 1e-6, 'max-day factor');
// rapid mix: sequent depth identity y2/y1 = (√(1+8Fr²) − 1)/2
const rm = r.rapidmix;
near(rm.y2 / rm.inputs.y1, (Math.sqrt(1 + 8 * rm.Fr1 ** 2) - 1) / 2, 1e-9, 'hydraulic-jump sequent depth');
// flocculation: actual G within 20 % of target in every stage (integer baffles)
for (const s of r.floc.stages) near(s.Ga, s.Gt, s.Gt * 0.2, `floc stage ${s.i} G`);
near(r.floc.Gt, r.floc.stages.reduce((a, s) => a + s.Ga * s.t * 60, 0), 1e-6, 'Gt sum');
// sedimentation: SOR × A = Q
near(r.sed.sorAct * r.sed.A, r.sed.Qd, 1e-6, 'SOR definition');
near(r.sed.hrt, (r.sed.L * r.sed.W * r.sed.H) / (r.sed.Qd / 24), 1e-9, 'detention time');
// filtration continuity
near(r.filt.rate * r.filt.N * r.filt.Af, r.demand.Qh, 1e-6, 'filtration continuity');
ok(r.filt.expPct > 5 && r.filt.expPct < 60, 'bed expansion plausible');
// disinfection: CT = C × T10
near(r.dis.CTp, r.dis.C * r.dis.T10, 1e-9, 'CT provided');
// stabilisation reached target LSI when lime is applied
if (r.stab.apply && r.stab.lime > 0 && r.stab.lime < r.stab.inputs.maxLime) near(r.stab.final.LSI, r.stab.inputs.targetLSI, 0.01, 'LSI target reached');
// hydraulics monotonic: water level decreases downstream
const wl = r.hyd.units.map((u) => u.wl);
ok(wl.every((v, i) => i === 0 || v <= wl[i - 1] + 1e-9), 'hydraulic profile decreases downstream');
// cost & energy positive
ok(r.cost.capex > 0 && r.cost.omPerM3 > 0, 'costs positive');
ok(r.energy.kva > 0 && r.energy.tx >= r.energy.kva, 'transformer ≥ max demand');

// ---- NWSDB Design Manual D2 (1989) rules
near(D2.peaking(15000).mdf, 1.1, 0, 'D2 §3.2.5 max-day < 20,000');
near(D2.peaking(15000).phf, 2.5, 0, 'D2 §3.2.5 peak-hour < 20,000');
near(D2.peaking(50000).mdf, 1.25, 0, 'D2 §3.2.5 max-day > 20,000');
near(D2.peaking(50000).phf, 2.0, 0, 'D2 §3.2.5 peak-hour > 20,000');
ok([1, 2, 3, 4, 5].map(D2.standbyFor).join() === '1,1,1,2,2', 'D2 §6.4.1 stand-by table 1/1/1/2/2');
near(D2.DIURNAL_PCT.reduce((a, b) => a + b, 0), 100, 1e-9, 'D2 §9.2 consumption pattern sums to 100 %');
ok(D2.smallStoragePct(24) === 50 && D2.smallStoragePct(15) === 33 && D2.smallStoragePct(10) === 25, 'D2 §9.2 small-scheme storage table');
near(D2.WEIRS.rectFull.Q(0.25, 1, 0.6), (2 / 3) * Math.sqrt(2 * 9.78) * (0.602 + 0.083 * 0.25 / 0.6) * 0.2512 ** 1.5, 1e-9, 'D2 §4.6.4 rectangular weir (BS 3680, g = 9.78)');
near(D2.WEIRS.vnotch90.Q(0.2) / 0.2 ** 2.5, 1.4, 0.03, 'D2 §4.6.4 90° V-notch ≈ 1.4 h^2.5');
near(D2.weirHead('rectFull', D2.WEIRS.rectFull.Q(0.3, 1.2, 0.6), 1.2, 0.6), 0.3, 1e-4, 'weir head inversion');
near(D2.thrust(100, 1, 180), 1168, 1168 * 0.02, 'D2 Table 7.3 DN100 blank end (N/bar)');
near(D2.thrust(100, 1, 90), 1652, 1652 * 0.02, 'D2 Table 7.3 DN100 90° bend');
near(D2.thrust(300, 1, 180), 9374, 9374 * 0.02, 'D2 Table 7.3 DN300 blank end');
near(D2.thrust(200, 1, 45), 3239, 3239 * 0.02, 'D2 Table 7.3 DN200 45° bend');
near(D2.screenLoss(1.0, 0.5), 0.0729 * 0.75, 1e-12, 'D2 §5.4 screen head loss');
ok(D2.cDesign('di', 300) === 130 && D2.cDesign('di', 700) === 140 && D2.cDesign('ci', 250) === 100 && D2.cDesign('ci', 400) === 110 && D2.cDesign('ci', 600) === 120, 'D2 Fig 7.6 design C values');
near(D2.cVelocity(120, 2), 120 * 0.97, 1e-9, 'D2 Fig 7.6 note 3 – C at 2 m/s');
ok(D2.selectClass('di', 400, 60, 100).cls === 'K9' && D2.selectClass('di', 400, 60, 100).ok, 'D2 Table 7.2 DI class with surge ≤ 1.1 × rating');
ok(!D2.selectClass('upvc147', 200, 50, 120).ok, 'uPVC: surge must stay within the rating');
near(D2.eac(1000, 0.1, 20), 117.46, 0.01, 'D2 §10.3.2 equivalent annual cost');
near(D2.presentValue(990, 0.1, 1), 900, 1e-9, 'D2 §10.3.1 present value example (Rs 990 → Rs 900)');
near(D2.kirpich(3000, 60), 41.8, 0.2, 'D2 §4.8.2 Kirpich tc');
near(D2.rational(0.4, 90, 500), 50, 1e-9, 'D2 §4.8.4 rational formula');
ok(D2.BASINS.length === 103 && D2.basinOf(60).name === 'Mahaweli Ganga' && D2.basinOf(60).area === 10327, 'D2 Table 4.1 river basins');
near(D2.basinOf(1).unit, 2445 * 1000 / 365, 1e-9, 'unit runoff from basin runoff');
const pd = newProject();
const rd = computeAll(pd);
ok(rd.d2.total >= 40 && rd.d2.fail === 0, `D2 register for default project (${rd.d2.total} checks, ${rd.d2.fail} fail)`);
near(rd.cost.om2, 2 * rd.cost.omTot, 1e-6, 'D2 §10.2: two years O&M in capital');
near(rd.cost.capex, rd.cost.sub3 * (1 + (rd.cost.inputs.engPct + rd.cost.contPct + rd.cost.inputs.vatPct) / 100), 1e-3, 'D2 §10.2 estimate format');
ok(rd.storage.srV >= rd.storage.d2V - 1e-6, 'service reservoir ≥ D2 rule');
ok(rd.intake.pumps.v >= 0.6 && rd.intake.pumps.v <= 1.6, 'raw-water main velocity within D2 0.6–1.6 m/s');
ok(rd.intake.cv >= 0.6 && rd.intake.cv <= 0.9, 'intake pipe velocity within D2 0.6–0.9 m/s');
// small community → D2 peaking and house-connection demand
const ps = newProject();
Object.assign(ps.inputs.demand, { method: 'rate', basePop: 7000, growthRate: 1, demandBasis: 'd2', roundStep: 100 });
const rs0 = computeAll(ps);
ok(rs0.demand.d2.cls.id === 'smallUrban' && rs0.demand.mdf === 1.1 && rs0.demand.phf === 2.5, 'D2 small-urban class & peaking');
near(rs0.demand.lpcd, 0.4 * 185 + 0.6 * 45, 1e-9, 'D2 blended per-capita (40 % HC @185, 60 % SP @45)');
// reservoir sequent peak: inflow equal to demand → no storage
const pr = newProject();
pr.inputs.setup.sourceType = 'reservoir';
const qd = computeAll(pr).demand.Qd;
pr.inputs.source.inflows = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((dd) => (qd * dd) / 1e6);
near(computeAll(pr).source.Kreq, 0, 1e-9, 'Rippl: inflow = demand needs no storage');

// ---- NWSDB Design Manual D3 (2020) – tables, formulae and annex design examples
near(D3.screenLoss(0.477, 0.40), 0.00492, 0.0001, 'D3 Annex A coarse screen head loss 4.92 mm');
near(D3.screenLoss(0.667, 0.40), 0.02077, 0.0002, 'D3 Annex A fine screen head loss 20.77 mm');
near(0.187 / (0.467 - 16 * 0.010 * 0.47), 0.477, 0.002, 'D3 Annex A coarse screen velocity 0.477 m/s');
near(D3.aerK(28, 0.75), 0.77, 0.005, 'D3 Annex B.1 aeration coefficient K = 0.77');
{ let C = 0; const out = []; for (let i = 0; i < 3; i++) { C = C + +D3.aerK(28, 0.75).toFixed(2) * (7.81 - C); out.push(C); } near(out[0], 6.01, 0.02, 'D3 Annex B.1 DO after step 1'); near(out[1], 7.40, 0.02, 'D3 Annex B.1 DO after step 2'); near(out[2], 7.72, 0.02, 'D3 Annex B.1 DO after step 3'); }
near((0.187 / (1.833 * 9)) ** (2 / 3), 0.0505, 0.0005, 'D3 Annex B.2 head over step H0 = 0.05 m');
near(D3.OXIDANT.O2.fe * 0.13 + 0.27 * 0.05, 0.0317, 0.0005, 'D3 Annex B.1 O2 demand (Table 7-1)');
{ const V = 0.187 * 40 / 2; const B = Math.cbrt(V / 2); near(B, 1.23, 0.01, 'D3 Annex C.2 flash-mixer side 1.23 m'); near(950 ** 2 * 0.001 * 4.394, 3966, 10, 'D3 Annex C.2 power P = G²μV'); }
near(D3.parshallSubmergence(0.61), 0.7, 0, 'D3 Annex C.1 Table A4 submergence');
near((0.187 / (2.273 * 0.61)) ** (1 / (1.4757 * 0.61 ** 0.026)), 0.252, 0.002, 'D3 Annex C.1 Parshall Ha = 252 mm');
near(0.75 * Math.PI * 0.0767 * 2.2, 0.398, 0.002, 'D3 Annex D.2 paddle relative velocity 0.398 m/s');
near(60 ** 2 * 56.8 * 0.001, 204.5, 0.2, 'D3 Annex D.2 stage-1 power 204.5 W');
near(D3.nFiltersD3(16125), 2.48, 0.01, 'D3 §5.9.2.2 / Annex F.1 N = 1.2√Q = 2.48');
near(D3.sandDepthMin(0.55), 0.66, 1e-9, 'D3 Annex F.1 sand depth = 1200 d10');
near(D3.filterAreaMax(16125), 50, 0, 'D3 §5.9.2.3 practical maximum filter area (< 10 mgd)');
ok(D3.minFilters(16125) === 2 && D3.minFilters(70000) === 4, 'D3 §5.9.2 minimum number of filters');
ok(gravelRuleCheck([{ from: 2.5, to: 5, depth: 0.075 }, { from: 5, to: 10, depth: 0.075 }, { from: 10, to: 20, depth: 0.075 }, { from: 20, to: 40, depth: 0.12 }, { from: 40, to: 65, depth: 0.2 }], 0.55, 12).length === 0, 'D3 §5.9.3.5 default gravel satisfies Huisman rules');
ok(gravelRuleCheck([{ from: 2, to: 5, depth: 0.075 }, { from: 40, to: 65, depth: 0.1 }], 0.55, 12).length >= 2, 'D3 §5.9.3.5 gravel rule violations detected');
{ const ss = D3.ssfUnits(2300); ok(ss.table === 2, 'D3 Table 5-36 SSF units < 3,000 m³/d'); near(D3.ssfUnits(86400).formula, 15, 1e-9, 'D3 §5.12.5 n = 15√Q'); }
{ const m = D3.sludgeMethod2({ Q: 16125, ntu: 17, tssPerNtu: 1.0, fe: 0.7, mn: 0.4, alum: 25, polymer: 0.05, lime: 15, kmno4: 0.4, pac: 5 }); near(m.total, 561.23, 0.6, 'D3 Annex H sludge Method 02 total 561.23 kg/d'); near(m.design, 707.4, 0.8, 'D3 Annex H design solids 707.4 kg/d'); near(m.design / (0.02 * 1012), 34.95, 0.05, 'D3 Annex H wet sludge 34.95 m³/d'); near(Math.sqrt(4 * (m.design / 80) / Math.PI), 3.35, 0.01, 'D3 Annex H thickener diameter 3.35 m'); }
near(D3.sludgeMethod1(5000 / 86400, 25, 17), 86.4 * (5000 / 86400) * (0.44 * 25 + 17), 1e-9, 'D3 §5.14.3.5 Method 01');
near(D3.ctGiardiaD3(1, 20, 7, 1), 19, 1e-9, 'D3 Table 6-4 CT 1-log Giardia pH 7 20 °C 1 mg/L');
near(D3.ctGiardiaD3(2, 25, 8, 2), 40, 1e-9, 'D3 Table 6-4 CT 2-log Giardia pH 8 25 °C 2 mg/L');
near(D3.ctGiardiaD3(0.5, 30, 7, 0.8), 6, 1e-9, 'D3 Table 6-4 – 25 °C / 1 mg/L used above the table (conservative)');
near(D3.ctGiardiaD3(1, 15, 7.5, 1.5), ((((37 + 19) / 2 + (41 + 21) / 2) / 2) + (((54 + 27) / 2 + (61 + 30) / 2) / 2)) / 2, 1e-9, 'D3 Table 6-4 trilinear interpolation');
near(D3.ctVirusD3(2, 10), 4, 1e-9, 'D3 Table 6-5 virus 2-log 10 °C');
near(D3.ctVirusD3(4, 25), 2, 1e-9, 'D3 Table 6-5 virus 4-log 25 °C');
near(D3.baffleFactorFor(45), 0.7, 0, 'D3 Table 6-2 superior baffling'); near(D3.baffleFactorFor(15), 0.5, 0, 'D3 Table 6-2 average baffling');
near(D3.bleachingPowder(4.546, 2, 0.25), 36.4, 0.1, 'D3 Annex G – 36–40 g BP per 1000 Imp gal at 2 ppm');
near(D3.doseCheck(10, 10, 100), 100, 1e-9, 'D3 §6.1.5 dose check formula');
near(D3.pHsEq83(7.9, 15) - 0, 9.43, 0.01, 'D3 Eq 8.3 Rochester example pHs 9.43');
near(7.6 - D3.pHsEq83(7.9, 15), -1.83, 0.01, 'D3 §8.4 example LSI −1.83');
near(2 * D3.pHsEq83(7.9, 15) - 7.6, 11.25, 0.02, 'D3 §8.4 example RSI 11.25');
near(D3.siteAreaMinHa(3785.4), 0.404686, 1e-6, 'D3 §9.2.1 1 mgd → 1 acre');
near(D3.waterProp(25, 3), 0.89, 1e-9, 'D3 Annex I viscosity 25 °C'); near(D3.waterProp(27.5, 2), (997 + 995.7) / 2, 1e-9, 'D3 Annex I density interpolation');
near(rho(28), D3.waterProp(28, 2), 1e-9, 'water.js density uses D3 Annex I');
near(D3.fluorideOptimum(28), 0.7, 0, 'D3 Table 7-3 fluoride optimum (hot climate)');
ok(D3.hardnessClass(150) === 'Hard', 'D3 Table 7-5 hardness classes');
ok(D3.clauseOf('NWSDB D3 §5.9.1 – x; NWSDB D2 §5.4', 'D2') === '§5.4' && D3.clauseOf('NWSDB D3 Table 5-20 – y', 'D3') === 'Table 5-20' && D3.clauseOf('NWSDB D3 Annex F.1', 'D3') === 'Annex F.1', 'clause extraction per manual tag');
ok(!D2.isD2('NWSDB D3 §5.9') && D2.isD2('NWSDB D2 §5.4') && D3.isD3('NWSDB D3 §5.9') && !D3.isD3('NWSDB D2 §3.2.1'), 'D2/D3 source discrimination');
{ const t = D3.table45({ surface: true, gw: false, turb: 150, colour: 20, algae: 0, hard: 50, fe: 0.1, cl: 10, tc: 10000, toc: 2, taste: false, toxic: false }, { scr: true, coag: true, settle: true, rapidF: true, postCl: true, preCl: true });
  ok(t.E.includes('preSet') && t.rows.find((r) => r.id === 't100').soft.includes('preSet') && !t.rows.some((r) => r.hard.length), 'D3 Table 4-5 essential/soft evaluation'); }
ok(D3.typicalTrain('river', { turb: 1, tc: 5, algae: 0, colour: 5 }).steps.length === 1, 'D3 Fig 4-4 protected hill stream → post-chlorination only');
{ const p = newProject(); const r = computeAll(p);
  ok(r.d3.total > 80 && r.d3.fail === 0, `D3 register populated without failures (${r.d3.total})`);
  ok(r.d3.checks.every((c) => c.clause && c.clause !== 'D3'), 'every D3 check carries a clause');
  ok(r.process.t45.rows.length > 0 && r.process.typical.steps.length > 0, 'process selection reports D3 Table 4-5 and Fig 4-4');
  ok(r.filt.rateTwo <= 15 + 1e-9, 'filtration rate with one out + one washing ≤ 15 m/h (D3 §5.9.2.2)');
  ok(r.dis.inputs.residual === 0.8 && r.dis.BF === 0.7, 'D3 residual 0.8 mg/L and superior baffling');
  ok(r.sludge.terms && r.sludge.dsDes > 0, 'sludge by D3 Method 02');
  const pr = newProject(); pr.inputs.setup.sourceType = 'groundwater'; pr.inputs.intake.type = 'wells'; Object.assign(pr.inputs.quality.values, { fe: [1.5, 2.5], mn: [0.2, 0.3], turb: [2, 5], do: [1, 0.5] });
  const rg = computeAll(pr); ok(rg.process.aeration !== 'none' && rg.process.prechlor === 'yes' && rg.aeration.checks.some((c) => /D3/.test(c.src)), 'groundwater Fe > 1 → aeration + pre-oxidation (D3 Table 4-5)');
  const ps = newProject(); ps.inputs.demand.nTrains = 1; ok(computeAll(ps).checks.some((c) => /D3 §4.3.8/.test(c.src) && c.status === 'fail'), 'single train fails D3 §4.3.8'); }

// ---- samples
for (const s of SAMPLES) {
  const rs = computeAll(s.build());
  ok(Object.keys(rs.errors).length === 0, `sample ${s.id} computes: ${JSON.stringify(rs.errors)}`);
  console.log(`  sample ${s.id}: ${rs.demand.Qd} m³/d, route ${rs.process.route}, filter ${rs.filt.type}, checks ${rs.summary.ok}/${rs.summary.warn}/${rs.summary.fail}, SLS ${rs.compliance.total - rs.compliance.fails.length}/${rs.compliance.total}, capex LKR ${(rs.cost.capex / 1e9).toFixed(2)} bn`);
}

// ---- robustness: extreme inputs must not throw
const stress = newProject();
Object.assign(stress.inputs.demand, { basePop: 2000, method: 'rate', nTrains: 1 });
Object.assign(stress.inputs.quality.values, { turb: [800, 3000], alk: [5, 3], pH: [5.8, 5.5] });
const rx = computeAll(stress);
ok(Object.keys(rx.errors).length === 0, 'stress case computes: ' + JSON.stringify(rx.errors));
for (const route of ['conventional', 'direct', 'ssf']) for (const floc of ['hbaffle', 'vbaffle', 'paddle']) for (const clar of ['rect', 'circ', 'tube']) {
  const q = newProject();
  Object.assign(q.inputs.process, { route, floc, clarifier: clar, rapidMix: floc === 'paddle' ? 'mechanical' : 'jump', aeration: 'cascade', disinfectant: 'naocl', sludge: 'beds' });
  const rr = computeAll(q);
  ok(Object.keys(rr.errors).length === 0, `combination ${route}/${floc}/${clar}: ${JSON.stringify(rr.errors).slice(0, 300)}`);
}
// ---- v1.3: specified capacity, design chain, impact ripple
{
  const pc = newProject();
  Object.assign(pc.inputs.demand, { basis: 'capacity', capacity: 25000, capacityType: 'throughput' });
  const rc = computeAll(pc);
  ok(Object.keys(rc.errors).length === 0, 'capacity mode computes: ' + JSON.stringify(rc.errors));
  near(rc.demand.Qd, 25000, 1e-6, 'specified capacity 25,000 m³/d drives the plant');
  near(rc.intake.Q * 86400, 25000, 1, 'intake sized for the specified capacity');
  near(rc.sed.Qd * rc.sed.N, 25000, 1, 'sedimentation trains carry the specified capacity');
  const po = newProject();
  Object.assign(po.inputs.demand, { basis: 'capacity', capacity: 25000, capacityType: 'output' });
  near(computeAll(po).demand.Qd, 25000 * 1.05, 1, 'output basis adds 5 % treatment losses');
  // design chain: water state passes from unit to unit
  const ch = rc.chain;
  ok(ch.stages.length >= 9, 'design chain has every unit of the train');
  const st = Object.fromEntries(ch.stages.map((x) => [x.key, x.out]));
  near(st.sed.turb, rc.sed.settledPeak, 1e-9, 'chain: sedimentation hands settled turbidity to filters');
  near(rc.filt.infPeak, rc.sed.settledPeak, 1e-9, 'filters are designed with the settled turbidity they receive');
  ok(st.filt.turb < st.sed.turb && st.sed.turb < st.floc.turb, 'turbidity falls through the train');
  near(st.dis.cl, rc.dis.C, 1e-9, 'chain: chlorine residual leaves the contact tank');
  near(ch.product, 25000 / 1.05, 1, 'net treated water = capacity / (1 + losses)');
  // impact ripple: raising the overflow rate shrinks the basins and shortens filter runs downstream
  const a = kpiSnapshot(rc);
  pc.inputs.sed.sor = 30;
  const d = diffSnapshots(a, kpiSnapshot(computeAll(pc)));
  const by = (lab) => d.items.find((x) => x.label === lab);
  ok(by('Basin area (each)') && by('Basin area (each)').to < by('Basin area (each)').from, 'impact: SOR ↑ → basin area ↓');
  ok(by('Settled turbidity (peak)') && by('Settled turbidity (peak)').to > by('Settled turbidity (peak)').from, 'impact: SOR ↑ → settled turbidity ↑');
  ok(by('Filter run (peak)') && by('Filter run (peak)').to < by('Filter run (peak)').from, 'impact ripples to filtration: shorter filter runs');
  ok(d.items.some((x) => x.stage === 'cost'), 'impact ripples to the cost estimate');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
