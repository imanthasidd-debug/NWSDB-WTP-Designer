// Jar-test dose calculator (operation): the operator enters the jar results (dose → settled turbidity, pH); the module
// fits the dose curve, finds the optimum and the economic dose, checks pH and alkalinity, converts the dose into the
// dosing-pump stroke setting for today's flow and builds a dosing table.  A record of past jar tests (raw turbidity →
// best dose) recalibrates the D = a·Tuᵇ correlation used on the Chemical dosing page.
// NWSDB D3 §4.4.3.2 (jar-test procedure), §5.4.3.1 (jar test is the essential tool), §6.1.2–6.1.5 (solution strength,
// dosing, calibration Dose = C×10⁴/(T×Q)), §5.9.13.6 (settled water ≤ ≈ 4 NTU, < 2 NTU preferred).
import { Calc, n } from '../core/calc.js';
import { fmt } from '../core/util.js';
const tx = (v, d = 2) => fmt(v, d).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
import { clamp, num } from '../core/util.js';

export const PUMP_SIZES = [1, 2.5, 4, 6, 10, 16, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000];

export const DEFAULTS = {
  date: '',              // date of the test (text)
  rawTurb: 0,            // NTU raw water on the day of the test (0 = design turbidity of the jar series on Chemical dosing)
  rawPH: 0,              // 0 = raw-water pH of the project
  rawAlk: 0,             // mg/L as CaCO₃ (0 = raw-water alkalinity of the project)
  jarVol: 1,             // L per jar
  stockPct: 1,           // % strength of the jar stock solution (1 % = 10 mg/mL)
  jars: [
    { dose: 10, turb: 18, pH: 6.8 }, { dose: 20, turb: 7.5, pH: 6.6 }, { dose: 30, turb: 3.2, pH: 6.45 },
    { dose: 40, turb: 2.1, pH: 6.3 }, { dose: 50, turb: 2.4, pH: 6.15 }, { dose: 60, turb: 3.0, pH: 6.0 },
  ],
  flocObs: 'fast',       // fast (< 5 min) | slow (5–30 min) | float (> 30 min) | pin (pin floc)
  target: 4,             // NTU settled-water target (D3 §5.9.13.6: ≤ ≈ 4, < 2 preferred)
  margin: 10,            // % added to the economic dose
  plantFactor: 1,        // plant dose ÷ jar dose (scale-up; 1.0 unless plant records show otherwise)
  // dosing pump setting
  flow: 0,               // m³/h plant inflow now (0 = design flow)
  solPct: 0,             // % solution in the day tank (0 = Chemical dosing page)
  pumpCap: 0,            // L/h maximum capacity of each dosing pump at 100 % stroke (0 = next standard size)
  speed: 100,            // % pump speed / frequency setting
  // past jar tests – recalibration of D = a·Tuᵇ
  history: [
    { date: 'Jan', turb: 9, dose: 15 }, { date: 'Feb', turb: 14, dose: 17 }, { date: 'Apr', turb: 32, dose: 24 },
    { date: 'May', turb: 70, dose: 31 }, { date: 'Jun', turb: 140, dose: 39 }, { date: 'Oct', turb: 260, dose: 47 },
  ],
};

/** least-squares polynomial fit (normal equations, small order) */
function polyfit(xs, ys, order) {
  const m = order + 1;
  const A = Array.from({ length: m }, () => new Array(m + 1).fill(0));
  xs.forEach((x, k) => {
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) A[i][j] += x ** (i + j);
      A[i][m] += ys[k] * x ** i;
    }
  });
  for (let i = 0; i < m; i++) {
    let p = i;
    for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    if (Math.abs(A[i][i]) < 1e-12) return null;
    for (let r = 0; r < m; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= m; c++) A[r][c] -= f * A[i][c]; }
  }
  return A.map((row, i) => row[m] / A[i][i]);
}
const lin = (pts, x, key) => {
  const p = pts.filter((r) => Number.isFinite(r[key]));
  if (!p.length) return NaN;
  if (x <= p[0].dose) return p[0][key];
  for (let i = 1; i < p.length; i++) if (x <= p[i].dose) return p[i - 1][key] + ((p[i][key] - p[i - 1][key]) * (x - p[i - 1].dose)) / (p[i].dose - p[i - 1].dose);
  return p[p.length - 1][key];
};
export const nextPump = (q) => PUMP_SIZES.find((s) => s >= q * 1.15) || Math.ceil((q * 1.15) / 100) * 100;

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const r = ctx.res, co = r.coag, q = r.quality, dem = r.demand;
  if (!co) {
    calc.note('info', 'This plant has no coagulation step (slow sand filtration), so there is no coagulant dose to set. Use jar tests only if a coagulant is added later.');
    return { inputs: d, enabled: false, jars: [], table: [], doses: [], ...calc.result() };
  }
  const ci = co.inputs || {};
  const C = co?.coag || { alkPer: 0.505, label: 'coagulant' };
  const name = (C.label || 'coagulant').split(' (')[0];
  const rawTurb = d.rawTurb > 0 ? d.rawTurb : num(ci.jarTurb, 50);
  const rawPH = d.rawPH > 0 ? d.rawPH : q.get('pH', 1);
  const rawAlk = d.rawAlk > 0 ? d.rawAlk : q.get('alk', 1);
  const jars = (d.jars || []).map((j) => ({ dose: num(j.dose), turb: num(j.turb), pH: Number.isFinite(+j.pH) && +j.pH > 0 ? +j.pH : NaN })).filter((j) => j.dose > 0 && j.turb > 0).sort((a, b) => a.dose - b.dose);

  // ---- jar procedure
  calc.section('Jar-test procedure (NWSDB D3 §4.4.3.2)');
  calc.text(`Rapid mix 0.5–1 min at full speed; flocculate 5–20 min while reducing the paddle speed from about 80 to 20 rpm; settle 30–60 min, then draw the settled sample from below the surface. Raw water on the day of the test: ${rawTurb} NTU, pH ${tx(rawPH, 2)}, alkalinity ${tx(rawAlk, 0)} mg/L as CaCO₃.`);
  const mlPer = (D) => (D * d.jarVol) / (d.stockPct * 10);
  calc.step('Stock solution added to each jar', 'v = \\frac{D\\,V_{jar}}{10\\,C_{stock}}', `\\frac{D\\times${n(d.jarVol)}}{10\\times${n(d.stockPct)}}`, mlPer(10), 'mL per 10 mg/L', `${d.stockPct} % stock = ${d.stockPct * 10} mg/mL`);
  const floc = {
    fast: ['Floc settles in under 5 min', 'conventional flocculation and sedimentation suits this water'],
    slow: ['Floc settles in 5–30 min', 'conventional settling, but consider tube settlers or a coagulant aid'],
    float: ['Floc stays suspended for more than 30 min', 'flotation (DAF) suits this water better than settling'],
    pin: ['Pin floc', 'direct filtration may suit this water; check with filter-paper / full-length filter-run tests (D3 Annex F.3)'],
  }[d.flocObs] || ['', ''];
  jars.forEach((j) => { j.ml = mlPer(j.dose); });
  if (floc[0]) calc.text(`Floc observation: ${floc[0]} – ${floc[1]} (NWSDB D3 §4.4.3.2).`);

  // ---- dose curve
  calc.section('Dose curve and optimum dose');
  let fit = null, curve = [], opt = null, econ = null, best = null;
  const fitT = (x) => (fit ? 10 ** (fit[0] + fit[1] * x + fit[2] * x * x) : lin(jars, x, 'turb'));
  if (jars.length) {
    best = jars.reduce((a, b) => (b.turb < a.turb ? b : a));
    const x0 = jars[0].dose, x1 = jars[jars.length - 1].dose;
    if (jars.length >= 3) {
      fit = polyfit(jars.map((j) => j.dose), jars.map((j) => Math.log10(j.turb)), 2);
      if (fit && !(fit[2] > 0)) fit = null; // no minimum – fall back to the measured points
    }
    let xo = best.dose;
    if (fit) xo = clamp(-fit[1] / (2 * fit[2]), x0, x1);
    opt = { dose: Math.round(xo * 2) / 2, turb: fitT(xo) };
    for (let i = 0; i <= 80; i++) { const x = x0 + ((x1 - x0) * i) / 80; curve.push({ dose: x, fit: fitT(x) }); }
    if (fit) calc.step('Fitted dose curve (least squares)', '\\log_{10} T_s = c_0 + c_1 D + c_2 D^2', `c_0=${n(fit[0], 4)},\\ c_1=${n(fit[1], 5)},\\ c_2=${n(fit[2], 7)}`, jars.length, 'jars');
    calc.step('Optimum dose (lowest settled turbidity)', fit ? 'D_{opt} = -\\frac{c_1}{2c_2}' : 'D_{opt} = D(\\min T_s)', fit ? `-\\frac{${n(fit[1], 5)}}{2\\times${n(fit[2], 7)}}` : `\\text{jar with } ${n(best.turb)}\\,NTU`, opt.dose, 'mg/L');
    calc.step('Settled turbidity at the optimum dose', 'T_s(D_{opt})', '', opt.turb, 'NTU');
    // economic dose: lowest dose meeting the target
    if (opt.turb <= d.target) {
      for (let x = x0; x <= opt.dose + 1e-9; x += 0.1) if (fitT(x) <= d.target) { econ = { dose: Math.round(x * 2) / 2, turb: fitT(x) }; break; }
      if (econ) calc.step(`Economic dose (lowest dose giving ≤ ${d.target} NTU)`, 'T_s(D_{ec}) = T_{target}', '', econ.dose, 'mg/L');
    }
    calc.flag('Optimum lies inside the tested dose range', opt.dose > x0 + 1e-9 && opt.dose < x1 - 1e-9, `${n(opt.dose)} mg/L`, `${x0}–${x1} mg/L`, 'The best result is at the end of the series – repeat the test with a wider dose range.', 'warn', 'NWSDB D3 §5.4.3.1');
    calc.flag('Settled turbidity achievable', opt.turb <= 4, `${opt.turb.toFixed(1)} NTU`, '≤ ≈ 4 NTU (< 2 preferred)', 'Even the best jar is above 4 NTU: try another coagulant, a coagulant aid, pH adjustment or pre-settling.', 'warn', 'NWSDB D3 §5.9.13.6');
  } else calc.note('warn', 'Enter at least one jar (dose and settled turbidity).');

  const jarDose = econ ? Math.min(econ.dose * (1 + d.margin / 100), opt.dose) : opt ? opt.dose : num(co?.Ddes, 30);
  const dose = jarDose * d.plantFactor;
  if (opt) {
    calc.step('Selected jar dose', econ ? 'D_{jar} = \\min(D_{ec}(1+m),\\ D_{opt})' : 'D_{jar} = D_{opt}', econ ? `\\min(${n(econ.dose)}\\times${n(1 + d.margin / 100, 2)},\\ ${n(opt.dose)})` : '', jarDose, 'mg/L', econ ? `economic dose + ${d.margin} % margin` : 'target not reached – optimum dose used');
    calc.step('Plant dose', 'D = k_s\\,D_{jar}', `${n(d.plantFactor, 2)}\\times${n(jarDose)}`, dose, 'mg/L', 'scale-up factor from plant records');
  }
  const pHsel = lin(jars, jarDose, 'pH');
  const turbSel = jars.length ? fitT(jarDose) : NaN;
  if (Number.isFinite(pHsel)) calc.check('coag.pH', pHsel, 'Coagulation pH at the selected dose (jar)');

  // ---- alkalinity
  calc.section('Alkalinity');
  const resAlkReq = num(ci.resAlk, 25);
  const used = C.alkPer * dose;
  const resid = rawAlk - used;
  calc.step('Alkalinity consumed', '\\Delta Alk = k\\,D', `${n(C.alkPer, 3)}\\times${n(dose)}`, used, 'mg/L as CaCO₃');
  calc.step('Residual alkalinity without lime', 'Alk_r = Alk_0 - \\Delta Alk', `${n(rawAlk, 0)} - ${n(used)}`, resid, 'mg/L as CaCO₃');
  const limeNeed = Math.max(0, resAlkReq - resid);
  const limeDose = (limeNeed * 0.741) / (num(ci.limePurity, 85) / 100);
  if (limeNeed > 0) calc.step(`Pre-lime to keep ${resAlkReq} mg/L residual alkalinity`, 'D_{lime} = \\frac{0.741\\,(Alk_{res} - Alk_r)}{purity}', `\\frac{0.741(${n(resAlkReq)} - ${n(resid)})}{${n(num(ci.limePurity, 85) / 100, 2)}}`, limeDose, 'mg/L');
  calc.check('coag.resAlk', Math.max(resid, resAlkReq), 'Residual alkalinity after coagulation (with lime as needed)');

  // ---- dosing pump setting
  calc.section('Dosing-pump setting (NWSDB D3 §6.1)');
  const nS = Math.max(1, num(dem.nTrains, 1));
  const Qh = d.flow > 0 ? d.flow : dem.Qd / 24;
  const sol = d.solPct > 0 ? d.solPct : num(ci.solConc, 10);
  const cap = d.pumpCap > 0 ? d.pumpCap : nextPump(num(co?.pumpMax, 50));
  const qPump = (D, Q) => (D * (Q / nS)) / (sol * 10); // L/h per stream pump
  const stroke = (D, Q) => (qPump(D, Q) / (cap * (d.speed / 100))) * 100;
  const qNow = qPump(dose, Qh), sNow = stroke(dose, Qh);
  calc.step('Flow per stream', 'Q_s = Q/N_s', `${n(Qh, 0)}/${nS}`, Qh / nS, 'm³/h');
  calc.step('Solution feed per pump', 'q = \\frac{D\\,Q_s}{10\\,C}', `\\frac{${n(dose)}\\times${n(Qh / nS, 0)}}{10\\times${n(sol)}}`, qNow, 'L/h');
  calc.step('Stroke setting', 's = \\frac{q}{q_{max}\\,f}\\times100', `\\frac{${n(qNow)}}{${n(cap)}\\times${n(d.speed / 100, 2)}}\\times100`, sNow, '%', d.pumpCap > 0 ? '' : `pump of ${cap} L/h assumed (next standard size above the design feed ${n(num(co?.pumpMax, 0), 0)} L/h)`);
  const mlMin = (qNow * 1000) / 60;
  calc.step('Calibration-column draw-down', 'v = 1000\\,q/60', `1000\\times${n(qNow)}/60`, mlMin, 'mL/min', `time for 1,000 mL: ${(60000 / Math.max(mlMin, 1e-9)).toFixed(0)} s (D3 §6.1.5)`);
  calc.flag('Stroke within the accurate range of the pump', sNow >= 10 && sNow <= 90, `${sNow.toFixed(0)} %`, '10–90 %', sNow > 100 ? 'The pump cannot deliver this dose – run the standby pump as well, raise the solution strength or fit a larger pump.' : sNow > 90 ? 'Little reserve – raise the solution strength or speed setting.' : 'Below 10 % stroke the feed is inaccurate – lower the solution strength or the pump speed.', sNow > 100 ? 'fail' : 'warn', 'metering-pump practice');
  const kgD = (dose * Qh * 24) / 1000;
  calc.step('Coagulant use at this dose and flow', 'M = D\\,Q\\,24/1000', `${n(dose)}\\times${n(Qh, 0)}\\times24/1000`, kgD, 'kg/d');
  const bagsD = kgD / num(ci.bagKg, 50);

  // dosing table: stroke % for flows × doses
  const dMin = Math.max(5, Math.floor(Math.min(num(co?.Dmin, 10), dose) / 5) * 5);
  const dMax = Math.ceil(Math.max(num(co?.Ddes, 40), dose) / 5) * 5 + 10;
  const step = dMax - dMin > 60 ? 10 : 5;
  const doses = [];
  for (let D = dMin; D <= dMax + 1e-9 && doses.length < 12; D += step) doses.push(D);
  const flows = [50, 60, 70, 80, 90, 100, 110, 120].map((p) => ({ pct: p, Q: (dem.Qd / 24) * (p / 100) }));
  const table = flows.map((f) => ({ pct: f.pct, Q: f.Q, cells: doses.map((D) => stroke(D, f.Q)) }));

  // ---- history recalibration
  calc.section('Recalibration of D = a·Tuᵇ from past jar tests');
  const hist = (d.history || []).map((h) => ({ date: h.date || '', turb: num(h.turb), dose: num(h.dose) })).filter((h) => h.turb > 0 && h.dose > 0);
  let cal = null;
  if (hist.length >= 3 && new Set(hist.map((h) => h.turb)).size >= 2) {
    const X = hist.map((h) => Math.log(h.turb)), Y = hist.map((h) => Math.log(h.dose));
    const mx = X.reduce((a, b) => a + b, 0) / X.length, my = Y.reduce((a, b) => a + b, 0) / Y.length;
    const sxx = X.reduce((a, x) => a + (x - mx) ** 2, 0), sxy = X.reduce((a, x, i) => a + (x - mx) * (Y[i] - my), 0), syy = Y.reduce((a, y) => a + (y - my) ** 2, 0);
    const b = sxy / sxx, a = Math.exp(my - b * mx), r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 1;
    cal = { a, b, r2, n: hist.length, curve: [] };
    const tMin = Math.min(...hist.map((h) => h.turb)), tMax = Math.max(...hist.map((h) => h.turb));
    for (let i = 0; i <= 40; i++) { const t = tMin * (tMax / tMin) ** (i / 40); cal.curve.push({ turb: t, fit: a * t ** b, now: num(ci.empA, 7) * t ** num(ci.empB, 0.35) }); }
    calc.step('Log–log regression of best dose on raw turbidity', '\\ln D = \\ln a + b\\ln T_u', `n = ${hist.length}`, a, 'a', `b = ${b.toFixed(3)}, R² = ${r2.toFixed(3)}; Chemical dosing page now uses a = ${num(ci.empA, 7)}, b = ${num(ci.empB, 0.35)}`);
    calc.flag('Correlation of the jar-test record', r2 >= 0.8, `R² = ${r2.toFixed(2)}`, '≥ 0.80', 'Scatter is large – check the test records or collect more tests over the seasons before using the new a, b.', 'warn', 'good practice');
  } else calc.text('Enter at least three past jar tests at different raw turbidities to recalibrate the dose correlation.');

  return {
    inputs: d, enabled: true, name, rawTurb, rawPH, rawAlk, jars, fit, curve, best, opt, econ, jarDose, dose, pHsel, turbSel, used, resid, resAlkReq, limeNeed, limeDose,
    Qh, nS, sol, cap, qNow, sNow, mlMin, kgD, bagsD, doses, table, flows, cal, hist, floc, mlPer10: mlPer(10),
    ...calc.result(),
  };
}
