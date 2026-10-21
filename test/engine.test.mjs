// Engine verification: independent hand calculations and invariants (run: node test/engine.test.mjs)
import assert from 'node:assert/strict';
import { computeAll, newProject } from '../src/engine/index.js';
import { CTfrom, DOsat, ctGiardia, mu, pHfrom, rho, stability } from '../src/core/water.js';
import { gradation } from '../src/engine/filtration.js';
import { SAMPLES } from '../src/ui/samples.js';
import * as D2 from '../src/core/d2.js';

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
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
