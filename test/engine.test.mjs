// Engine verification: independent hand calculations and invariants (run: node test/engine.test.mjs)
import { computeAll, newProject } from '../src/engine/index.js';
import { CTfrom, DOsat, ctGiardia, mu, pHfrom, rho, stability } from '../src/core/water.js';
import { gradation } from '../src/engine/filtration.js';
import { SAMPLES } from '../src/ui/samples.js';
import * as D2 from '../src/core/d2.js';
import * as D3 from '../src/core/d3.js';
import { gravelRuleCheck } from '../src/engine/filtration.js';
import { diffSnapshots, kpiSnapshot } from '../src/engine/chain.js';

let pass = 0,
  fail = 0;
const near = (a, b, tol, msg) => {
  const ok = Math.abs(a - b) <= Math.abs(tol);
  if (ok) pass++;
  else {
    fail++;
    console.error(`✗ ${msg}: got ${a}, expected ${b} ± ${tol}`);
  }
};
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.error('✗ ' + msg);
  }
};

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
const g = gradation([
  { size: 0.3, pass: 0 },
  { size: 0.425, pass: 3 },
  { size: 0.5, pass: 11 },
  { size: 0.6, pass: 38 },
  { size: 0.71, pass: 62 },
  { size: 0.85, pass: 84 },
  { size: 1.0, pass: 96 },
  { size: 1.18, pass: 100 },
]);
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
near(
  r.floc.Gt,
  r.floc.stages.reduce((a, s) => a + s.Ga * s.t * 60, 0),
  1e-6,
  'Gt sum',
);
// sedimentation: SOR × A = Q
near(r.sed.sorAct * r.sed.A, r.sed.Qd, 1e-6, 'SOR definition');
near(r.sed.hrt, (r.sed.L * r.sed.W * r.sed.H) / (r.sed.Qd / 24), 1e-9, 'detention time');
// filtration continuity
near(r.filt.rate * r.filt.N * r.filt.Af, r.demand.Qh, 1e-6, 'filtration continuity');
ok(r.filt.expPct > 5 && r.filt.expPct < 60, 'bed expansion plausible');
// disinfection: CT = C × T10
near(r.dis.CTp, r.dis.C * r.dis.T10, 1e-9, 'CT provided');
// stabilisation reached target LSI when lime is applied
if (r.stab.apply && r.stab.lime > 0 && r.stab.lime < r.stab.inputs.maxLime)
  near(r.stab.final.LSI, r.stab.inputs.targetLSI, 0.01, 'LSI target reached');
// hydraulics monotonic: water level decreases downstream
const wl = r.hyd.units.map((u) => u.wl);
ok(
  wl.every((v, i) => i === 0 || v <= wl[i - 1] + 1e-9),
  'hydraulic profile decreases downstream',
);
// cost & energy positive
ok(r.cost.capex > 0 && r.cost.omPerM3 > 0, 'costs positive');
ok(r.energy.kva > 0 && r.energy.tx >= r.energy.kva, 'transformer ≥ max demand');

// ---- NWSDB Design Manual D2 (1989) rules
near(D2.peaking(15000).mdf, 1.1, 0, 'D2 §3.2.5 max-day < 20,000');
near(D2.peaking(15000).phf, 2.5, 0, 'D2 §3.2.5 peak-hour < 20,000');
near(D2.peaking(50000).mdf, 1.25, 0, 'D2 §3.2.5 max-day > 20,000');
near(D2.peaking(50000).phf, 2.0, 0, 'D2 §3.2.5 peak-hour > 20,000');
ok([1, 2, 3, 4, 5].map(D2.standbyFor).join() === '1,1,1,2,2', 'D2 §6.4.1 stand-by table 1/1/1/2/2');
near(
  D2.DIURNAL_PCT.reduce((a, b) => a + b, 0),
  100,
  1e-9,
  'D2 §9.2 consumption pattern sums to 100 %',
);
ok(
  D2.smallStoragePct(24) === 50 && D2.smallStoragePct(15) === 33 && D2.smallStoragePct(10) === 25,
  'D2 §9.2 small-scheme storage table',
);
near(
  D2.WEIRS.rectFull.Q(0.25, 1, 0.6),
  (2 / 3) * Math.sqrt(2 * 9.78) * (0.602 + (0.083 * 0.25) / 0.6) * 0.2512 ** 1.5,
  1e-9,
  'D2 §4.6.4 rectangular weir (BS 3680, g = 9.78)',
);
near(D2.WEIRS.vnotch90.Q(0.2) / 0.2 ** 2.5, 1.4, 0.03, 'D2 §4.6.4 90° V-notch ≈ 1.4 h^2.5');
near(D2.weirHead('rectFull', D2.WEIRS.rectFull.Q(0.3, 1.2, 0.6), 1.2, 0.6), 0.3, 1e-4, 'weir head inversion');
near(D2.thrust(100, 1, 180), 1168, 1168 * 0.02, 'D2 Table 7.3 DN100 blank end (N/bar)');
near(D2.thrust(100, 1, 90), 1652, 1652 * 0.02, 'D2 Table 7.3 DN100 90° bend');
near(D2.thrust(300, 1, 180), 9374, 9374 * 0.02, 'D2 Table 7.3 DN300 blank end');
near(D2.thrust(200, 1, 45), 3239, 3239 * 0.02, 'D2 Table 7.3 DN200 45° bend');
near(D2.screenLoss(1.0, 0.5), 0.0729 * 0.75, 1e-12, 'D2 §5.4 screen head loss');
ok(
  D2.cDesign('di', 300) === 130 &&
    D2.cDesign('di', 700) === 140 &&
    D2.cDesign('ci', 250) === 100 &&
    D2.cDesign('ci', 400) === 110 &&
    D2.cDesign('ci', 600) === 120,
  'D2 Fig 7.6 design C values',
);
near(D2.cVelocity(120, 2), 120 * 0.97, 1e-9, 'D2 Fig 7.6 note 3 – C at 2 m/s');
ok(
  D2.selectClass('di', 400, 60, 100).cls === 'K9' && D2.selectClass('di', 400, 60, 100).ok,
  'D2 Table 7.2 DI class with surge ≤ 1.1 × rating',
);
ok(!D2.selectClass('upvc147', 200, 50, 120).ok, 'uPVC: surge must stay within the rating');
near(D2.eac(1000, 0.1, 20), 117.46, 0.01, 'D2 §10.3.2 equivalent annual cost');
near(D2.presentValue(990, 0.1, 1), 900, 1e-9, 'D2 §10.3.1 present value example (Rs 990 → Rs 900)');
near(D2.kirpich(3000, 60), 41.8, 0.2, 'D2 §4.8.2 Kirpich tc');
near(D2.rational(0.4, 90, 500), 50, 1e-9, 'D2 §4.8.4 rational formula');
ok(
  D2.BASINS.length === 103 && D2.basinOf(60).name === 'Mahaweli Ganga' && D2.basinOf(60).area === 10327,
  'D2 Table 4.1 river basins',
);
near(D2.basinOf(1).unit, (2445 * 1000) / 365, 1e-9, 'unit runoff from basin runoff');
// own water source (not in D2 Table 4.1)
{
  const k = D2.runoffRatioFor(3800);
  ok(k > 0.4 && k < 0.8, `runoff ratio of wet-zone basins from Table 4.1 (${k.toFixed(2)})`);
  ok(D2.runoffRatioFor(1400) < D2.runoffRatioFor(3000), 'runoff ratio falls with rainfall (Table 4.1 trend)');
  const pO = newProject();
  pO.inputs.setup.sourceType = 'river';
  Object.assign(pO.inputs.source, { basin: 0, ownName: 'Test Oya', ownArea: 120, ownRain: 2400, ownRunoff: 900 });
  const sO = computeAll(pO).source;
  ok(sO.own && sO.basin.name === 'Test Oya' && sO.A === 120, 'own source: name and catchment area used');
  near(sO.Qmean, ((900 * 1000) / 365) * 120, 1e-6, 'own source: mean flow = unit runoff × area');
  ok(
    sO.steps.some((st) => st.kind === 'section' && /^Own source – Test Oya/.test(st.title)) &&
      !sO.notes.some((x) => /runoff is estimated|enter the catchment area/.test(x.text)),
    'own source: own section in the calculation sheet, no estimate warnings when data is entered',
  );
  const pE = newProject();
  Object.assign(pE.inputs.source, { basin: 0, ownArea: 50, ownRain: 2000 });
  const sE = computeAll(pE).source;
  near(
    sE.basin.runoff,
    Math.round(2000 * D2.runoffRatioFor(2000)),
    1e-9,
    'own source: runoff estimated from rainfall × Table 4.1 ratio',
  );
  ok(
    sE.notes.some((x) => x.level === 'warn' && /runoff is estimated/.test(x.text)),
    'own source: estimate flagged for replacement with gauged data',
  );
  ok(
    sE.basin.name === (pE.inputs.setup.source || 'Own source'),
    'own source: name falls back to the Project setup source name',
  );
}
const pd = newProject();
const rd = computeAll(pd);
ok(
  rd.d2.total >= 40 && rd.d2.fail === 0,
  `D2 register for default project (${rd.d2.total} checks, ${rd.d2.fail} fail)`,
);
{
  const pD2 = newProject();
  pD2.inputs.cost = { ...(pD2.inputs.cost || {}), format: 'd2' };
  const rD2 = computeAll(pD2);
  near(rD2.cost.om2, 2 * rD2.cost.omTot, 1e-6, 'D2 §10.2: two years O&M in capital');
  near(
    rD2.cost.capex,
    rD2.cost.sub3 * (1 + (rD2.cost.inputs.d2EngPct + rD2.cost.contPct + rD2.cost.inputs.vatPct) / 100),
    1e-3,
    'D2 §10.2 estimate format',
  );
}
// ---- v1.5: automatic sizing gives a design without failing checks at any capacity; every structure is drawn in several views
{
  const { drawingGroups } = await import('../src/ui/draw/views.js');
  for (const cap of [1000, 2500, 5000, 10000, 20000, 30000, 50000, 75000, 100000, 150000, 200000]) {
    const p = newProject();
    Object.assign(p.inputs.demand, { basis: 'capacity', capacity: cap });
    const r = computeAll(p);
    const fails = r.checks.filter((c) => c.status === 'fail');
    ok(
      Object.keys(r.errors).length === 0 && fails.length === 0,
      `auto design at ${cap} m³/d: no errors, no failing checks (${fails.map((c) => c.label).join('; ')})`,
    );
    if (cap >= 7500)
      ok(
        r.summary.warn === 0,
        `auto design at ${cap} m³/d: no review items (${r.checks
          .filter((c) => c.status === 'warn')
          .map((c) => c.label)
          .join('; ')})`,
      );
    const g = drawingGroups(r);
    const all = g.flatMap((x) => x.views);
    const bad = all.filter(
      (v) =>
        ![v.dw.bounds.x0, v.dw.bounds.x1, v.dw.bounds.y0, v.dw.bounds.y1].every(Number.isFinite) ||
        v.dw.items.some(
          (it) =>
            Object.values(it).some((x) => typeof x === 'number' && !Number.isFinite(x)) ||
            (it.pts && it.pts.flat().some((x) => !Number.isFinite(x))),
        ),
    );
    ok(
      all.length >= 25 && bad.length === 0,
      `drawings at ${cap} m³/d: ${all.length} views in ${g.length} structures, all finite (${bad.map((v) => v.dw.title).join('; ')})`,
    );
  }
  ok(
    computeAll(newProject()).demand.nTrains === 2 &&
      (() => {
        const p = newProject();
        Object.assign(p.inputs.demand, { basis: 'capacity', capacity: 150000 });
        return computeAll(p).demand.nTrains;
      })() === 6,
    'automatic number of treatment streams (2 up to 50,000 m³/d, then a pair per 50,000)',
  );
  {
    const p = newProject();
    Object.assign(p.inputs.demand, { basis: 'capacity', capacity: 150000 });
    const r = computeAll(p);
    ok(r.intake.nConduits >= 2, `parallel intake pipes chosen automatically for submergence (${r.intake.nConduits})`);
  }
  for (const proc of [
    { clarifier: 'circ' },
    { clarifier: 'tube' },
    { floc: 'hbaffle' },
    { floc: 'paddle' },
    { route: 'ssf' },
    { rapidMix: 'mechanical', aeration: 'cascade' },
    { aeration: 'tray', route: 'direct' },
  ]) {
    const p = newProject();
    Object.assign(p.inputs.process, proc);
    const g = drawingGroups(computeAll(p));
    ok(
      g.every((x) => x.views.every((v) => Number.isFinite(v.dw.bounds.x0) && v.dw.code)),
      `drawings for ${JSON.stringify(proc)}: ${g.flatMap((x) => x.views).length} views`,
    );
  }
}
// ---- v1.9: NWSDB CAD practice – DXF (AutoCAD 2007, mm, layers with line weights), mm dimensions, title strip
{
  const { drawingDXF } = await import('../src/ui/draw/dxf.js');
  const { mm } = await import('../src/ui/draw/units.js');
  const { sheetDXF, sheetMeta, provinceCode } = await import('../src/ui/draw/sheet.js');
  const { drawingGroups } = await import('../src/ui/draw/views.js');
  ok(mm(12.5) === '12500' && mm(0.105) === '105', 'dimension text in whole millimetres');
  const pX = newProject();
  const g = drawingGroups(computeAll(pX));
  const dw = g.find((x) => x.key === 'sed').views[0].dw;
  const dxf = drawingDXF(dw);
  const val = (name, code) => {
    const i = dxf.indexOf(`\n${name}\n`);
    return i < 0 ? null : dxf.slice(i).split('\n')[3];
  };
  ok(dxf.includes('AC1021') && val('$INSUNITS') === '4', 'DXF: AutoCAD 2007 format, model space in millimetres');
  ok(/\nCENTER2\n/.test(dxf) && /\nHIDDEN2\n/.test(dxf), 'DXF: CENTER2 and HIDDEN2 linetypes');
  const layer = (n) => {
    const i = dxf.indexOf(`AcDbLayerTableRecord\n2\n${n}\n`);
    return i < 0 ? null : dxf.slice(i, i + 400);
  };
  ok(
    /\n370\n25\n/.test(layer('wall') || '') && /\n370\n50\n/.test(layer('pipe') || ''),
    'DXF: layer line weights (wall 0.25, pipe 0.50)',
  );
  ok(/\n290\n0\b/.test(layer('NPRINT') || ''), 'DXF: NPRINT layer does not plot');
  ok(!/\n1\n[^\n]*\d+\.\d\d m\n/.test(dxf.split('ENTITIES')[1] || ''), 'DXF: no dimension written in metres');
  const sh = sheetDXF(dw, sheetMeta(pX));
  ok(
    sh.includes('DRG NO.') && sh.includes('REV.') && sh.includes('NATIONAL WATER SUPPLY') && sh.includes('ජාතික ජල'),
    'DXF sheet: NWSDB title strip with the trilingual name',
  );
  ok(provinceCode('Polonnaruwa') === 'NC' && provinceCode('Gampaha') === 'W', 'province code for the post titles');
  const pp = newProject();
  pp.inputs.setup.district = 'Anuradhapura';
  pp.inputs.setup.designer = 'A. Designer';
  const m = sheetMeta(pp);
  ok(
    m.posts.length === 7 && m.posts[5].title === 'A.G.M. (NC)' && m.posts[3].name === 'A. Designer',
    'signature posts: {R} and name fall-backs',
  );
}
// ---- v1.8.5: every structure and building has a 3D view (static isometric + mesh for the interactive viewer)
{
  const { drawingGroups } = await import('../src/ui/draw/views.js');
  const units = ['intake', 'aer', 'rm', 'floc', 'sed', 'filt', 'ct', 'cwr', 'twp', 'thick', 'beds', 'chem', 'chlor'];
  const seen = new Set();
  for (const proc of [{}, { rapidMix: 'mechanical', aeration: 'cascade' }, { aeration: 'tray' }, { route: 'ssf' }]) {
    const p = newProject();
    Object.assign(p.inputs.process, proc);
    for (const g of drawingGroups(computeAll(p))) {
      if (!units.includes(g.key)) continue;
      const iso = g.views.find((v) => v.id === 'iso');
      const fine =
        iso && iso.dw.scene3d?.faces.length > 0 && Number.isFinite(iso.dw.bounds.x0) && iso === g.views.at(-1);
      ok(fine, `3D view of ${g.title} ${JSON.stringify(proc)} (last view, so earlier drawing numbers are unchanged)`);
      if (fine) seen.add(g.key);
    }
  }
  ok(
    units.every((k) => seen.has(k)),
    `3D views for every structure: ${units.filter((k) => !seen.has(k)).join(', ') || 'all present'}`,
  );
}
// ---- v1.6: new units, buildings, structures, hydraulics and drawings
{
  const { drawingGroups } = await import('../src/ui/draw/views.js');
  const run = (cap, proc = {}, extra = () => {}) => {
    const p = newProject();
    if (cap) Object.assign(p.inputs.demand, { basis: 'capacity', capacity: cap });
    Object.assign(p.inputs.process, proc);
    extra(p);
    return computeAll(p);
  };
  const fin = (g) =>
    g
      .flatMap((x) => x.views)
      .every((v) => [v.dw.bounds.x0, v.dw.bounds.x1, v.dw.bounds.y0, v.dw.bounds.y1].every(Number.isFinite));
  // DAF
  {
    const r = run(20000, { clarifier: 'daf' }, (p) => {
      p.inputs.setup.sourceType = 'reservoir';
      p.inputs.quality.values.turb = [8, 40];
    });
    ok(
      !Object.keys(r.errors).length && r.sed.type === 'daf' && r.sed.riseAct <= 9.01 && r.sed.N >= 2,
      `DAF: ${r.sed.N} units at ${r.sed.riseAct?.toFixed(1)} m/h (D3 §5.7.8 nominal ≤ 9)`,
    );
    ok(
      r.sed.checks.every((c) => c.status !== 'fail') && fin(drawingGroups(r)),
      'DAF: no failing checks, drawings finite',
    );
  }
  // roughing filters ahead of slow sand filters
  {
    const r = run(2500, { route: 'ssf', presed: 'yes', presedType: 'roughing' });
    ok(
      !Object.keys(r.errors).length && r.sed.type === 'hrf' && r.sed.rate >= 0.3 && r.sed.rate <= 1.5 && r.sed.N >= 2,
      `roughing filters: ${r.sed.N} units at ${r.sed.rate?.toFixed(2)} m/h (D3 §5.13: 0.3–1.5)`,
    );
    ok(fin(drawingGroups(r)), 'roughing filters: drawings finite');
  }
  // Parshall flume and flow split
  {
    const r = run(42000, {}, (p) => {
      p.inputs.hyd.measure = 'parshall';
    });
    ok(
      r.hyd.meas.type === 'parshall' && r.hyd.meas.pf.Qmax >= 42000 && r.hyd.meas.hMax > 0.2 && r.hyd.meas.hMax < 1.2,
      `Parshall flume W ${r.hyd.meas.pf.W} mm, Ha ${r.hyd.meas.hMax.toFixed(2)} m (D3 Annex C.1)`,
    );
    ok(
      r.hyd.split && r.hyd.split.n === 2 && r.hyd.split.err <= 6,
      `flow split weirs: ${r.hyd.split.err.toFixed(1)} % error for 5 mm (D3 §9.5)`,
    );
  }
  // buildings
  {
    const b = rd.buildings;
    ok(
      b.chem && b.chem.rooms.length >= 4 && b.chem.bundV >= 1.1 * b.chem.tankV - 1e-9,
      'chemical house: rooms and 110 % bund (D3 §6.1.4)',
    );
    ok(
      b.chlor &&
        b.chlorGas &&
        b.chlorGas.onLine >= Math.ceil(rd.dis.kgD / 180) &&
        Math.abs(b.chlorGas.naoh - 1.13 * 900 * 1.1) < 1e-6,
      'chlorination building: ≤ 180 kg/d per drum, 1.13 kg NaOH per kg Cl₂ (D3 §6.5)',
    );
  }
  // special treatment
  {
    const r = run(0, {}, (p) => {
      p.inputs.quality.values.fe = [0.1, 0.2];
      p.inputs.quality.values.mn = [0.01, 0.02];
    });
    ok(
      r.special.enabled === false && r.special.annualCost === 0,
      'special treatment not triggered when Fe / Mn / F are within SLS 614',
    );
    const r2 = run(0, {}, (p) => {
      p.inputs.quality.values.f = [1.8, 2.4];
      p.inputs.quality.values.mn = [0.2, 0.5];
    });
    ok(
      r2.special.fluoride &&
        r2.special.fluoride.x > 0 &&
        r2.special.fluoride.x <= 1 &&
        r2.special.feMn &&
        ['cl2', 'kmno4'].includes(r2.special.feMn.ox),
      `fluoride ${r2.special.fluoride.method} on ${(r2.special.fluoride.x * 100).toFixed(0)} % of the flow; Mn by ${r2.special.feMn.ox} (D3 §7.1–7.2)`,
    );
  }
  // structure
  {
    const s = rd.structure;
    ok(
      s.list.length >= 5 && s.list.every((x) => x.wall.t >= 0.25 && x.wall.bars && x.wall.bars.a >= x.wall.As - 1e-6),
      'structural pre-design: every wall has bars ≥ required steel',
    );
    ok(
      s.kgM3 > 60 && s.kgM3 < 220 && rd.cost.inputs.steelPerM3 === Math.round(s.kgM3),
      `average steel ${s.kgM3.toFixed(0)} kg/m³ feeds the BOQ`,
    );
    const tall = s.list.find((x) => x.key === 'sed'),
      low = s.list.find((x) => x.key === 'floc');
    ok(tall.wall.t >= low.wall.t, 'taller wall is not thinner');
  }
  // staging and new drawings
  ok(
    rd.layout.phasing.length >= 5 && rd.layout.phasing.every((x) => x.s1 >= 1 && x.s1 <= x.ult),
    'staged construction table (D3 §9.1)',
  );
  {
    const g = drawingGroups(rd);
    const keys = g.map((x) => x.key);
    ok(
      ['chem', 'chlor', 'rebar'].every((k) => keys.includes(k)) && g.find((x) => x.key === 'site').views.length === 3,
      'drawings: chemical house, chlorination building, reinforcement, site levels',
    );
    const iso = g.flatMap((x) => x.views).filter((v) => v.dw.scene3d);
    ok(
      iso.length >= 6 && iso.every((v) => v.dw.scene3d.faces.length > 4 && v.dw.scene3d.dims.length >= 2),
      `3D scenes carry meshes and dimensions (${iso.length} scenes)`,
    );
  }
  for (const cap of [1000, 5000, 20000, 60000, 150000])
    for (const proc of [{}, { clarifier: 'daf' }, { clarifier: 'circ' }]) {
      const r = run(cap, proc);
      ok(
        !Object.keys(r.errors).length && fin(drawingGroups(r)),
        `v1.6 modules at ${cap} m³/d ${JSON.stringify(proc)}: no errors`,
      );
    }
}
// ---- NWSDB Rate Book 2025 (default estimate)
{
  const c = rd.cost,
    e = c.est;
  ok(e.format === 'rb2025' && c.method === 'composite', 'default estimate = RB 2025 TCE with composite rates');
  near(e.sscl, (c.sub3 / 97.5) * 2.5, 1e-6, 'Rates 2026 TCE (Annex 13): SSCL = Sub Total 3 / 97.5 × 2.5');
  near(c.capex, e.st2 + c.cont + e.sscl + c.vat, 1e-6, 'Rates 2026 TCE: total = ST2 + contingency + SSCL + VAT');
  near(c.vat, 0.18 * e.sub4, 1e-6, 'Rates 2026 TCE: VAT 18 % of Sub Total 4');
  ok(c.contPct <= 10, 'RB TCE: physical contingency ≤ 10 %');
  ok(c.prelimPct === (e.st1 > 500e6 ? 4 : 5), 'RB TCE: preliminaries 4 % above LKR 500 M');
  ok(e.engPct === 18, 'RB Table 4: GOSL ≥ LKR 100 M → 18 %');
  near(e.rwss, 0.05 * e.st1, 1e-6, 'RB item 11: 5 % of ST1 for RWS&S');
  const uc = c.comp.find((x) => /Treatment plant – base cost/.test(x.item));
  ok(
    uc && Math.abs(uc.rate - 131700) / 131700 < 0.15,
    `UC/07 unit cost at ${rd.demand.Qd} m³/d ≈ 125–135 k LKR per m³/d (${uc && Math.round(uc.rate)})`,
  );
  ok(c.boqWorks > 0 && c.compTot > c.boqWorks * 0.8, 'composite works and BOQ both priced');
  ok(
    [...c.civil, ...c.me].every((x) => x.ref),
    'every BOQ item carries a Rate Book reference',
  );
  ok(c.cross.length >= 2, 'cross-check against RB unit-cost graphs');
}
{
  const RBm = await import('../src/core/ratebook.js');
  const p7 = RBm.pipeCost('di', 700, { factor: 1, markup: 27, ewsPct: 0, dewPct: 0 });
  near(p7.supply, 132537, 1e-9, 'Rates 2026 A-DI/1 (Annex 02): DN700 supply (transmission) 132,537 LKR/m');
  ok(p7.laying > 0 && p7.ref.includes('A-DI/1'), 'RB A-DI/3 laying with reference');
  ok(RBm.locationFactor('Jaffna') === 0.67 && RBm.locationFactor('Colombo') === 1, 'RB B-COM/02 location factors');
  near(RBm.blendedRate('I-3').raw, (14 * 13 + 27 * 4 + 11 * 7) / 24, 1e-9, 'CEB I-3 TOU blend (Annex 8)');
  near(RBm.CHEM.alum.v, 134.86, 1e-9, 'Rates 2026 A-CH/01 alum 134.86 LKR/kg');
  near(RBm.CHEM.cl2.v, 204900 / 900, 1e-9, 'Rates 2026 A-CH/02 chlorine 900 kg cylinder 204,900 LKR');
  near(RBm.graph('UC/07', 30000).value, 131700 * 1.08, 1e-6, 'Rates 2026 Graph A-UC/07 at 30,000 m³/d = 2025 × 1.08');
  near(RBm.DIESEL.v, 392, 1e-9, 'Rates 2026 Annex 08 auto diesel 392 LKR/L');
  near(
    RBm.pipeCost('hdpe', 315, { pn: 10 }).supply,
    10690,
    1e-9,
    'Rates 2026 A-PE/01 HDPE 315 PN10 transmission 10,690 LKR/m',
  );
  near(RBm.BUILDINGS.chemical.v, Math.round(274432 * 1.08), 1e-9, 'Rates 2026 A-MIS/01 chemical house = 2025 × 1.08');
  ok(RBm.valveCost('isolating', 400).ref.includes('1.144'), 'Rates 2026 valves: 2025 × 1.144');
  near(RBm.RB.usd, 332.49, 1e-9, 'Rates 2026 Annex 14: 1 USD = 332.49 LKR');
  ok(
    rd.coag.inputs.priceCoag === RBm.CHEM[rd.coag.inputs.coagulant === 'pacl' ? 'pacl' : 'alum'].v,
    'coagulant price defaults to the Rate Book',
  );
  ok(
    Math.abs(rd.energy.energyRate - RBm.blendedRate(rd.energy.tariff).rate) < 1e-9,
    'energy rate defaults to the CEB tariff',
  );
  const pB = newProject();
  pB.inputs.cost = { ...(pB.inputs.cost || {}), method: 'boq' };
  const rB = computeAll(pB);
  near(rB.cost.works, rB.cost.boqWorks, 1e-9, 'BOQ method prices works from the quantity BOQ');
}
ok(rd.storage.srV >= rd.storage.d2V - 1e-6, 'service reservoir ≥ D2 rule');
ok(rd.intake.pumps.v >= 0.6 && rd.intake.pumps.v <= 1.6, 'raw-water main velocity within D2 0.6–1.6 m/s');
ok(rd.intake.cv >= 0.6 && rd.intake.cv <= 0.9, 'intake pipe velocity within D2 0.6–0.9 m/s');
// small community → D2 peaking and house-connection demand
const ps = newProject();
Object.assign(ps.inputs.demand, { method: 'rate', basePop: 7000, growthRate: 1, demandBasis: 'd2', roundStep: 100 });
const rs0 = computeAll(ps);
ok(
  rs0.demand.d2.cls.id === 'smallUrban' && rs0.demand.mdf === 1.1 && rs0.demand.phf === 2.5,
  'D2 small-urban class & peaking',
);
near(rs0.demand.lpcd, 0.4 * 185 + 0.6 * 45, 1e-9, 'D2 blended per-capita (40 % HC @185, 60 % SP @45)');
// reservoir sequent peak: inflow equal to demand → no storage
const pr = newProject();
pr.inputs.setup.sourceType = 'reservoir';
const qd = computeAll(pr).demand.Qd;
pr.inputs.source.inflows = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((dd) => (qd * dd) / 1e6);
near(computeAll(pr).source.Kreq, 0, 1e-9, 'Rippl: inflow = demand needs no storage');

// ---- NWSDB Design Manual D3 (2020) – tables, formulae and annex design examples
near(D3.screenLoss(0.477, 0.4), 0.00492, 0.0001, 'D3 Annex A coarse screen head loss 4.92 mm');
near(D3.screenLoss(0.667, 0.4), 0.02077, 0.0002, 'D3 Annex A fine screen head loss 20.77 mm');
near(0.187 / (0.467 - 16 * 0.01 * 0.47), 0.477, 0.002, 'D3 Annex A coarse screen velocity 0.477 m/s');
near(D3.aerK(28, 0.75), 0.77, 0.005, 'D3 Annex B.1 aeration coefficient K = 0.77');
{
  let C = 0;
  const out = [];
  for (let i = 0; i < 3; i++) {
    C = C + +D3.aerK(28, 0.75).toFixed(2) * (7.81 - C);
    out.push(C);
  }
  near(out[0], 6.01, 0.02, 'D3 Annex B.1 DO after step 1');
  near(out[1], 7.4, 0.02, 'D3 Annex B.1 DO after step 2');
  near(out[2], 7.72, 0.02, 'D3 Annex B.1 DO after step 3');
}
near((0.187 / (1.833 * 9)) ** (2 / 3), 0.0505, 0.0005, 'D3 Annex B.2 head over step H0 = 0.05 m');
near(D3.OXIDANT.O2.fe * 0.13 + 0.27 * 0.05, 0.0317, 0.0005, 'D3 Annex B.1 O2 demand (Table 7-1)');
{
  const V = (0.187 * 40) / 2;
  const B = Math.cbrt(V / 2);
  near(B, 1.23, 0.01, 'D3 Annex C.2 flash-mixer side 1.23 m');
  near(950 ** 2 * 0.001 * 4.394, 3966, 10, 'D3 Annex C.2 power P = G²μV');
}
near(D3.parshallSubmergence(0.61), 0.7, 0, 'D3 Annex C.1 Table A4 submergence');
near((0.187 / (2.273 * 0.61)) ** (1 / (1.4757 * 0.61 ** 0.026)), 0.252, 0.002, 'D3 Annex C.1 Parshall Ha = 252 mm');
near(0.75 * Math.PI * 0.0767 * 2.2, 0.398, 0.002, 'D3 Annex D.2 paddle relative velocity 0.398 m/s');
near(60 ** 2 * 56.8 * 0.001, 204.5, 0.2, 'D3 Annex D.2 stage-1 power 204.5 W');
near(D3.nFiltersD3(16125), 2.48, 0.01, 'D3 §5.9.2.2 / Annex F.1 N = 1.2√Q = 2.48');
near(D3.sandDepthMin(0.55), 0.66, 1e-9, 'D3 Annex F.1 sand depth = 1200 d10');
near(D3.filterAreaMax(16125), 50, 0, 'D3 §5.9.2.3 practical maximum filter area (< 10 mgd)');
ok(D3.minFilters(16125) === 2 && D3.minFilters(70000) === 4, 'D3 §5.9.2 minimum number of filters');
ok(
  gravelRuleCheck(
    [
      { from: 2.5, to: 5, depth: 0.075 },
      { from: 5, to: 10, depth: 0.075 },
      { from: 10, to: 20, depth: 0.075 },
      { from: 20, to: 40, depth: 0.12 },
      { from: 40, to: 65, depth: 0.2 },
    ],
    0.55,
    12,
  ).length === 0,
  'D3 §5.9.3.5 default gravel satisfies Huisman rules',
);
ok(
  gravelRuleCheck(
    [
      { from: 2, to: 5, depth: 0.075 },
      { from: 40, to: 65, depth: 0.1 },
    ],
    0.55,
    12,
  ).length >= 2,
  'D3 §5.9.3.5 gravel rule violations detected',
);
{
  const ss = D3.ssfUnits(2300);
  ok(ss.table === 2, 'D3 Table 5-36 SSF units < 3,000 m³/d');
  near(D3.ssfUnits(86400).formula, 15, 1e-9, 'D3 §5.12.5 n = 15√Q');
}
{
  const m = D3.sludgeMethod2({
    Q: 16125,
    ntu: 17,
    tssPerNtu: 1.0,
    fe: 0.7,
    mn: 0.4,
    alum: 25,
    polymer: 0.05,
    lime: 15,
    kmno4: 0.4,
    pac: 5,
  });
  near(m.total, 561.23, 0.6, 'D3 Annex H sludge Method 02 total 561.23 kg/d');
  near(m.design, 707.4, 0.8, 'D3 Annex H design solids 707.4 kg/d');
  near(m.design / (0.02 * 1012), 34.95, 0.05, 'D3 Annex H wet sludge 34.95 m³/d');
  near(Math.sqrt((4 * (m.design / 80)) / Math.PI), 3.35, 0.01, 'D3 Annex H thickener diameter 3.35 m');
}
near(D3.sludgeMethod1(5000 / 86400, 25, 17), 86.4 * (5000 / 86400) * (0.44 * 25 + 17), 1e-9, 'D3 §5.14.3.5 Method 01');
near(D3.ctGiardiaD3(1, 20, 7, 1), 19, 1e-9, 'D3 Table 6-4 CT 1-log Giardia pH 7 20 °C 1 mg/L');
near(D3.ctGiardiaD3(2, 25, 8, 2), 40, 1e-9, 'D3 Table 6-4 CT 2-log Giardia pH 8 25 °C 2 mg/L');
near(D3.ctGiardiaD3(0.5, 30, 7, 0.8), 6, 1e-9, 'D3 Table 6-4 – 25 °C / 1 mg/L used above the table (conservative)');
near(
  D3.ctGiardiaD3(1, 15, 7.5, 1.5),
  (((37 + 19) / 2 + (41 + 21) / 2) / 2 + ((54 + 27) / 2 + (61 + 30) / 2) / 2) / 2,
  1e-9,
  'D3 Table 6-4 trilinear interpolation',
);
near(D3.ctVirusD3(2, 10), 4, 1e-9, 'D3 Table 6-5 virus 2-log 10 °C');
near(D3.ctVirusD3(4, 25), 2, 1e-9, 'D3 Table 6-5 virus 4-log 25 °C');
near(D3.baffleFactorFor(45), 0.7, 0, 'D3 Table 6-2 superior baffling');
near(D3.baffleFactorFor(15), 0.5, 0, 'D3 Table 6-2 average baffling');
near(D3.bleachingPowder(4.546, 2, 0.25), 36.4, 0.1, 'D3 Annex G – 36–40 g BP per 1000 Imp gal at 2 ppm');
near(D3.doseCheck(10, 10, 100), 100, 1e-9, 'D3 §6.1.5 dose check formula');
near(D3.pHsEq83(7.9, 15) - 0, 9.43, 0.01, 'D3 Eq 8.3 Rochester example pHs 9.43');
near(7.6 - D3.pHsEq83(7.9, 15), -1.83, 0.01, 'D3 §8.4 example LSI −1.83');
near(2 * D3.pHsEq83(7.9, 15) - 7.6, 11.25, 0.02, 'D3 §8.4 example RSI 11.25');
near(D3.siteAreaMinHa(3785.4), 0.404686, 1e-6, 'D3 §9.2.1 1 mgd → 1 acre');
near(D3.waterProp(25, 3), 0.89, 1e-9, 'D3 Annex I viscosity 25 °C');
near(D3.waterProp(27.5, 2), (997 + 995.7) / 2, 1e-9, 'D3 Annex I density interpolation');
near(rho(28), D3.waterProp(28, 2), 1e-9, 'water.js density uses D3 Annex I');
near(D3.fluorideOptimum(28), 0.7, 0, 'D3 Table 7-3 fluoride optimum (hot climate)');
ok(D3.hardnessClass(150) === 'Hard', 'D3 Table 7-5 hardness classes');
ok(
  D3.clauseOf('NWSDB D3 §5.9.1 – x; NWSDB D2 §5.4', 'D2') === '§5.4' &&
    D3.clauseOf('NWSDB D3 Table 5-20 – y', 'D3') === 'Table 5-20' &&
    D3.clauseOf('NWSDB D3 Annex F.1', 'D3') === 'Annex F.1',
  'clause extraction per manual tag',
);
ok(
  !D2.isD2('NWSDB D3 §5.9') && D2.isD2('NWSDB D2 §5.4') && D3.isD3('NWSDB D3 §5.9') && !D3.isD3('NWSDB D2 §3.2.1'),
  'D2/D3 source discrimination',
);
{
  const t = D3.table45(
    {
      surface: true,
      gw: false,
      turb: 150,
      colour: 20,
      algae: 0,
      hard: 50,
      fe: 0.1,
      cl: 10,
      tc: 10000,
      toc: 2,
      taste: false,
      toxic: false,
    },
    { scr: true, coag: true, settle: true, rapidF: true, postCl: true, preCl: true },
  );
  ok(
    t.E.includes('preSet') &&
      t.rows.find((r) => r.id === 't100').soft.includes('preSet') &&
      !t.rows.some((r) => r.hard.length),
    'D3 Table 4-5 essential/soft evaluation',
  );
}
ok(
  D3.typicalTrain('river', { turb: 1, tc: 5, algae: 0, colour: 5 }).steps.length === 1,
  'D3 Fig 4-4 protected hill stream → post-chlorination only',
);
{
  const p = newProject();
  const r = computeAll(p);
  ok(r.d3.total > 80 && r.d3.fail === 0, `D3 register populated without failures (${r.d3.total})`);
  ok(
    r.d3.checks.every((c) => c.clause && c.clause !== 'D3'),
    'every D3 check carries a clause',
  );
  ok(
    r.process.t45.rows.length > 0 && r.process.typical.steps.length > 0,
    'process selection reports D3 Table 4-5 and Fig 4-4',
  );
  ok(r.filt.rateTwo <= 15 + 1e-9, 'filtration rate with one out + one washing ≤ 15 m/h (D3 §5.9.2.2)');
  ok(r.dis.inputs.residual === 0.8 && r.dis.BF === 0.7, 'D3 residual 0.8 mg/L and superior baffling');
  ok(r.sludge.terms && r.sludge.dsDes > 0, 'sludge by D3 Method 02');
  const pr = newProject();
  pr.inputs.setup.sourceType = 'groundwater';
  pr.inputs.intake.type = 'wells';
  Object.assign(pr.inputs.quality.values, { fe: [1.5, 2.5], mn: [0.2, 0.3], turb: [2, 5], do: [1, 0.5] });
  const rg = computeAll(pr);
  ok(
    rg.process.aeration !== 'none' && rg.process.prechlor === 'yes' && rg.aeration.checks.some((c) => /D3/.test(c.src)),
    'groundwater Fe > 1 → aeration + pre-oxidation (D3 Table 4-5)',
  );
  const ps = newProject();
  ps.inputs.demand.nTrains = 1;
  ok(
    computeAll(ps).checks.some((c) => /D3 §4.3.8/.test(c.src) && c.status === 'fail'),
    'single train fails D3 §4.3.8',
  );
}

// ---- samples
for (const s of SAMPLES) {
  const rs = computeAll(s.build());
  ok(Object.keys(rs.errors).length === 0, `sample ${s.id} computes: ${JSON.stringify(rs.errors)}`);
  console.log(
    `  sample ${s.id}: ${rs.demand.Qd} m³/d, route ${rs.process.route}, filter ${rs.filt.type}, checks ${rs.summary.ok}/${rs.summary.warn}/${rs.summary.fail}, SLS ${rs.compliance.total - rs.compliance.fails.length}/${rs.compliance.total}, capex LKR ${(rs.cost.capex / 1e9).toFixed(2)} bn`,
  );
}

// ---- robustness: extreme inputs must not throw
const stress = newProject();
Object.assign(stress.inputs.demand, { basePop: 2000, method: 'rate', nTrains: 1 });
Object.assign(stress.inputs.quality.values, { turb: [800, 3000], alk: [5, 3], pH: [5.8, 5.5] });
const rx = computeAll(stress);
ok(Object.keys(rx.errors).length === 0, 'stress case computes: ' + JSON.stringify(rx.errors));
for (const route of ['conventional', 'direct', 'ssf'])
  for (const floc of ['hbaffle', 'vbaffle', 'paddle'])
    for (const clar of ['rect', 'circ', 'tube']) {
      const q = newProject();
      Object.assign(q.inputs.process, {
        route,
        floc,
        clarifier: clar,
        rapidMix: floc === 'paddle' ? 'mechanical' : 'jump',
        aeration: 'cascade',
        disinfectant: 'naocl',
        sludge: 'beds',
      });
      const rr = computeAll(q);
      ok(
        Object.keys(rr.errors).length === 0,
        `combination ${route}/${floc}/${clar}: ${JSON.stringify(rr.errors).slice(0, 300)}`,
      );
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
  ok(
    by('Basin area (each)') && by('Basin area (each)').to < by('Basin area (each)').from,
    'impact: SOR ↑ → basin area ↓',
  );
  ok(
    by('Settled turbidity (peak)') && by('Settled turbidity (peak)').to > by('Settled turbidity (peak)').from,
    'impact: SOR ↑ → settled turbidity ↑',
  );
  ok(
    by('Filter run (peak)') && by('Filter run (peak)').to < by('Filter run (peak)').from,
    'impact ripples to filtration: shorter filter runs',
  );
  ok(
    d.items.some((x) => x.stage === 'cost'),
    'impact ripples to the cost estimate',
  );
}
// ---- v1.7: existing plant assessment + trial bookkeeping
{
  const { fromDesign } = await import('../src/engine/assess.js');
  const p = newProject();
  let r = computeAll(p);
  ok(
    r.assess && r.assess.enabled === false && r.assess.checks.length === 0,
    'assessment is off by default and adds no checks',
  );
  p.inputs.assess = { enabled: true, ...fromDesign(r) };
  r = computeAll(p);
  const a = r.assess;
  ok(!r.errors.assess && a.units.length >= 8, 'assessment rates every unit of the copied design');
  ok(
    a.units.every((u) => u.status === 'ok') && a.path.length === 0 && a.shortfall === 0,
    'a design copied as "existing" carries its own design flow',
  );
  const sed = a.units.find((u) => u.key === 'sed');
  near(
    sed.cap,
    p.inputs.assess.sdN * p.inputs.assess.sdL * p.inputs.assess.sdW * 24,
    1,
    'sedimentation capacity = area × 24 m³/m²·d (D3)',
  );
  const fl = a.units.find((u) => u.key === 'floc');
  near(
    fl.cap,
    ((p.inputs.assess.flN * p.inputs.assess.flL * p.inputs.assess.flW * p.inputs.assess.flH) / 20) * 1440,
    1,
    'flocculator capacity = volume / 20 min',
  );
  near(
    a.plantCap,
    Math.min(...a.units.filter((u) => u.hard).map((u) => u.cap)),
    1e-6,
    'plant capacity = smallest unit capacity',
  );
  p.inputs.assess.qTarget = a.qTarget * 1.4;
  const b = computeAll(p).assess;
  ok(
    b.path.length >= 4 && b.shortfall > 0 && b.bottleneck,
    'raising the target 40 % gives a bottleneck and an upgrade path',
  );
  ok(
    b.path.every((x, i) => i === 0 || x.capNow >= b.path[i - 1].capNow),
    'upgrade path is ordered from the tightest unit',
  );
  ok(
    b.checks.some((c) => c.status !== 'ok'),
    'units short of the target are flagged',
  );
  p.inputs.assess.qNow = a.qTarget * 1.3;
  p.inputs.assess.qPeak = 0;
  ok(
    computeAll(p).assess.units.some((u) => u.status === 'fail'),
    'units overloaded at the present peak are marked red',
  );
  p.inputs.assess = { enabled: true, flN: 0, sdN: 0, ftN: 0 };
  const e = computeAll(p);
  ok(
    !e.errors.assess && e.assess.units.length === 0 && e.assess.plantCap === 0,
    'assessment with nothing entered does not fail',
  );

  const { createRequire } = await import('node:module');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const crypto = await import('node:crypto');
  process.env.WTP_TRIAL_NOREG = '1';
  const T = createRequire(import.meta.url)('../electron/licence.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wtp-trial-'));
  const o = {
    files: [path.join(dir, 'a.dat'), path.join(dir, 'b', 'c.bin')],
    keyFile: path.join(dir, 'licence.key'),
    machineId: 'ABCD-EFGH-JKMN-PQRS',
  };
  const now = Date.UTC(2026, 10, 16),
    D = T.DAY;
  let s = T.trialStatus(dir, 30, now, o);
  ok(
    s.trial && !s.expired && s.daysLeft === 30 && s.ends === '2026-12-16' && s.mode === 'trial',
    'trial: first run starts 30 days',
  );
  ok(T.trialStatus(dir, 30, now + 10 * D, o).daysLeft === 20, 'trial: 20 days left after 10 days');
  ok(T.trialStatus(dir, 30, now - 100 * D, o).daysLeft === 20, 'trial: setting the clock back gains nothing');
  ok(T.trialStatus(dir, 30, now + 29.5 * D, o).daysLeft === 1, 'trial: last day');
  s = T.trialStatus(dir, 30, now + 30 * D, o);
  ok(s.expired && s.mode === 'restricted', 'trial: ends after 30 days → restricted mode');
  ok(T.trialStatus(dir, 30, now + 5 * D, o).expired, 'trial: stays ended when the clock is set back');
  fs.rmSync(o.files[0]);
  ok(T.trialStatus(dir, 30, now + 31 * D, o).expired, 'trial: deleting one record does not restart the trial');
  fs.writeFileSync(o.files[0], `${now + 300 * D}.${now + 300 * D}.00000000000000000000`);
  fs.writeFileSync(o.files[1], 'x');
  ok(T.trialStatus(dir, 30, now, o).expired, 'trial: edited records are rejected');
  ok(T.machineId().match(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/), 'machine ID has the form XXXX-XXXX-XXXX-XXXX');
  // licence keys (signing key kept outside the project)
  const kp = process.env.WTP_LICENCE_PRIVATE_KEY || ''; // path to the signing key (kept outside the repo); key tests are skipped without it
  if (kp && fs.existsSync(kp)) {
    const k = JSON.parse(fs.readFileSync(kp, 'utf8'));
    ok(k.x === T.PUBLIC_X, 'licence: app public key matches the signing key');
    const priv = crypto.createPrivateKey({ key: { kty: 'OKP', crv: 'Ed25519', x: k.x, d: k.d }, format: 'jwk' });
    const mk = (lic) => {
      const p = Buffer.from(JSON.stringify(lic)).toString('base64url');
      return `WTP1-${p}.${crypto.sign(null, Buffer.from(p), priv).toString('base64url')}`;
    };
    const ext = mk({ m: o.machineId, t: 'ext', u: '2027-03-31', n: 'Test RSC', i: '2026-11-17' });
    ok(
      !T.activate(dir, mk({ m: 'ZZZZ-ZZZZ-ZZZZ-ZZZZ', t: 'full' }), o).ok,
      'licence: a key for another computer is refused',
    );
    ok(!T.activate(dir, ext.slice(0, -3) + 'AAA', o).ok, 'licence: a tampered key is refused');
    ok(T.activate(dir, ext, o).ok, 'licence: extension key accepted');
    s = T.trialStatus(dir, 30, Date.UTC(2027, 0, 10), o);
    ok(
      !s.expired && s.ends === '2027-03-31' && s.extended === '2027-03-31',
      'licence: extension key reopens the trial until its date',
    );
    ok(T.trialStatus(dir, 30, Date.UTC(2027, 3, 2), o).expired, 'licence: restricted again after the extension date');
    ok(
      T.activate(
        dir,
        '  ' +
          mk({ m: o.machineId, t: 'full', n: 'NWSDB RSC Western', i: '2026-11-17' }).replace(/(.{60})/g, '$1\n') +
          '  ',
        o,
      ).ok,
      'licence: full key accepted (line breaks and spaces ignored)',
    );
    s = T.trialStatus(dir, 30, Date.UTC(2028, 0, 1), o);
    ok(
      s.licensed && !s.trial && s.mode === 'licensed' && s.licensee === 'NWSDB RSC Western',
      'licence: full key turns the copy into the full version',
    );
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
// ---- v1.8: jar test and O&M planner
{
  const p = newProject();
  p.inputs.omplan = { asOf: '2026-11-17' };
  let r = computeAll(p);
  const j = r.jartest,
    o = r.omplan;
  ok(!r.errors.jartest && !r.errors.omplan, 'jar test and O&M planner compute');
  ok(j.enabled && j.opt.dose > 40 && j.opt.dose < 50, 'jar: optimum of the default series lies between 40 and 50 mg/L');
  ok(
    j.econ && j.econ.turb <= 4 + 1e-9 && j.econ.dose < j.opt.dose,
    'jar: economic dose meets the 4 NTU target below the optimum',
  );
  near(j.jarDose, Math.min(j.econ.dose * 1.1, j.opt.dose), 1e-9, 'jar: selected dose = economic + 10 % (≤ optimum)');
  near(j.qNow, (j.dose * (j.Qh / j.nS)) / (j.sol * 10), 1e-9, 'jar: pump feed q = D·Q/(10·C)');
  near(j.sNow, (j.qNow / j.cap) * 100, 1e-9, 'jar: stroke = q / q_max');
  ok(j.cal && Math.abs(j.cal.b - 0.35) < 0.05 && j.cal.r2 > 0.95, 'jar: history recalibrates D = a·Tuᵇ (b ≈ 0.35)');
  near(j.mlPer10, 1, 1e-9, 'jar: 1 % stock → 1 mL per 10 mg/L in a 1 L jar');
  ok(
    o.bw && o.bw.events.length > 5 && o.bw.events.every((e) => e.since <= o.bw.run + 1e-6),
    'backwash: 7-day timetable, no filter beyond its interval',
  );
  ok(
    o.bw.dayMode && o.bw.events.every((e) => e.t % 24 >= 7 && e.t % 24 < 17),
    'backwash: day-shift washes start inside 07:00–17:00',
  );
  near(o.bw.daily, o.bw.vol * o.bw.wpd, 1e-6, 'backwash: daily wash water = volume × washes');
  const c = o.chems.find((x) => x.key === 'coag');
  near(c.kgD, (r.coag.monthlyDose[10] * o.qDay) / 1000, 1e-6, 'stock: coagulant use at the November dose');
  ok(c.assumedFull && Math.abs(c.days - c.cap / c.kgD) < 1e-6, 'stock: 0 on hand = store full');
  p.inputs.omplan.stockCoag = c.kgD * 10;
  const c2 = computeAll(p).omplan.chems.find((x) => x.key === 'coag');
  ok(c2.status === 'fail' && c2.reorderIn === 0, 'stock: 10 days of coagulant with 21 days delivery → order now');
  const ss = SAMPLES.find((x) => x.id === 'rural').build();
  const rr = computeAll(ss);
  ok(
    !rr.jartest.enabled && rr.omplan.ssf && rr.omplan.ssf.years > 1,
    'slow sand plant: no jar test; scraping and re-sanding plan',
  );
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
