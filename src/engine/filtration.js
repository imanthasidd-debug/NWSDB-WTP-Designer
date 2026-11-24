// Filtration: rapid gravity (single/dual media) or slow sand filters.
// Media gradation, Carman–Kozeny clean-bed head loss, run length, backwash (Wen–Yu fluidisation,
// Richardson–Zaki expansion), air scour, wash troughs, manifold–lateral underdrain, gallery pipework.
import { Calc, n } from '../core/calc.js';
import { DN, G, MOTOR_KW, ceilTo, clamp, nextStd, selectDNRange, vel } from '../core/util.js';
import { GRAVEL_RULES, RSF, SSF, SSF_LIMITS, filterAreaMax, minFilters, sandDepthMin, ssfUnits } from '../core/d3.js';
import { qWorst } from './quality.js';

export const DEFAULTS = {
  type: 'auto',            // auto | rsf | dual | ssf
  rate: 0,                 // m/h, 0 = type default
  nFilters: 0,             // 0 = auto
  layout: 'twin',          // twin (two beds + central gullet) | single
  bedRatio: 2.0,           // bed length / bed width
  gulletW: 0.9,
  sandDepth: 0.7,
  sandSG: 2.65,
  sandPorosity: 0.42,
  sandPsi: 0.8,
  sieve: [                 // sieve opening (mm) vs % passing
    { size: 1.18, pass: 100 }, { size: 1.0, pass: 96 }, { size: 0.85, pass: 84 }, { size: 0.71, pass: 62 },
    { size: 0.6, pass: 38 }, { size: 0.5, pass: 11 }, { size: 0.425, pass: 3 }, { size: 0.3, pass: 0 },
  ],
  // anthracite (dual)
  anthDepth: 0.45, anthES: 1.0, anthUC: 1.4, anthSG: 1.6, anthPorosity: 0.5, anthPsi: 0.65,
  gravel: [                // graded per NWSDB D3 §5.9.3.5 (Huisman rules)
    { from: 2.5, to: 5, depth: 0.075 }, { from: 5, to: 10, depth: 0.075 }, { from: 10, to: 20, depth: 0.075 },
    { from: 20, to: 40, depth: 0.12 }, { from: 40, to: 65, depth: 0.2 },
  ],
  waterDepth: 1.5,
  underdrainDepth: 0.45,
  freeboard: 0.5,
  termHead: 2.0,           // available terminal head loss (m)
  solidsCap: 1.0,          // kg/m2 per run before terminal head loss
  // backwash
  bwMethod: 'airwater',    // airwater | water
  bwFactor: 1.4,           // × Vmf(d90)  (NWSDB D3 §5.9.12.11: > Vmf of d90, suggested 1.3 Vmf90; AWWA)
  bwRate: 0,               // m/h, 0 = auto
  bwMinutes: 8,
  ftwMinutes: 5,           // filter-to-waste
  airRate: 55,             // m/h (m3/m2.h)
  airMinutes: 3,
  bwSupply: 'pump',        // pump | tank
  // underdrain & troughs
  orificeDia: 12,          // mm
  orificeRatio: 0.3,       // % of bed area
  lateralSpacing: 0.25,    // m
  latOrif: 3,
  manLat: 2,
  orificeCd: 0.62,
  troughSpacing: 1.8,
  troughWidth: 0.45,
  // slow sand
  ssfMaxBed: 250,          // m2
  ssfDepth: 1.0, ssfMinDepth: 0.6, ssfScrape: 0.025, ssfCleanWeeks: 6, ssfSupernatant: 1.2, ssfES: 0.25, ssfUC: 2.0,
};

/** gradation statistics from sieve table */
export function gradation(sieve) {
  const s = [...sieve].filter((r) => r.size > 0).sort((a, b) => a.size - b.size);
  const at = (p) => {
    for (let i = 1; i < s.length; i++) {
      if (s[i].pass >= p && s[i - 1].pass <= p) {
        if (s[i].pass === s[i - 1].pass) return s[i].size;
        const f = (p - s[i - 1].pass) / (s[i].pass - s[i - 1].pass);
        return Math.exp(Math.log(s[i - 1].size) + f * (Math.log(s[i].size) - Math.log(s[i - 1].size)));
      }
    }
    return p <= (s[0]?.pass ?? 0) ? s[0]?.size : s[s.length - 1]?.size;
  };
  const fractions = [];
  for (let i = 1; i < s.length; i++) {
    const x = (s[i].pass - s[i - 1].pass) / 100;
    if (x > 0) fractions.push({ d: Math.sqrt(s[i].size * s[i - 1].size) / 1000, x });
  }
  const d10 = at(10), d60 = at(60), d90 = at(90);
  return { d10, d60, d90, UC: d60 / d10, fractions, sorted: s };
}
/** synthesise a log-normal gradation for given ES & UC */
export function synthGradation(ES, UC, nPts = 7) {
  // ln d ~ N(mu, s): d10 = ES, d60 = UC*ES  => z10=-1.2816, z60=0.2533
  const s = Math.log(UC) / (0.2533 + 1.2816);
  const mu = Math.log(ES) + 1.2816 * s;
  const sizes = [];
  for (let i = 0; i < nPts; i++) sizes.push(Math.exp(mu + (-2.2 + (4.4 * i) / (nPts - 1)) * s));
  const phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  return sizes.map((d) => ({ size: +d.toFixed(3), pass: +(phi((Math.log(d) - mu) / s) * 100).toFixed(1) }));
}
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }

/** Carman–Kozeny stratified head loss (m) */
function ckLoss(L, fr, eps, psi, v, rho, mu) {
  let s = 0;
  for (const { d, x } of fr) {
    const Re = (psi * rho * d * v) / mu;
    const f = (150 * (1 - eps)) / Re + 1.75;
    s += (f * x) / d;
  }
  return (L * (1 - eps) * v * v * s) / (psi * eps ** 3 * G);
}
/** Wen & Yu minimum fluidisation velocity (m/s) */
function vmf(d, rhoP, rho, mu) {
  const Ga = (d ** 3 * rho * (rhoP - rho) * G) / (mu * mu);
  const Re = Math.sqrt(33.7 ** 2 + 0.0408 * Ga) - 33.7;
  return (Re * mu) / (rho * d);
}
/** Ferguson & Church (2004) terminal velocity of natural (non-spherical) grains, m/s */
export function vtGrain(d, rhoP, nu, C2 = 1.0) {
  const R = rhoP / 1000 - 1;
  return (R * G * d * d) / (18 * nu + Math.sqrt(0.75 * C2 * R * G * d ** 3));
}
/** Richardson–Zaki expanded depth (m) for backwash velocity vb (m/s) */
function expanded(L, fr, eps0, rhoP, T, vb, nu) {
  let sum = 0;
  for (const { d, x } of fr) {
    const vt = vtGrain(d, rhoP, nu, rhoP < 2000 ? 1.2 : 1.0);
    const Ret = (vt * d) / nu;
    const nRZ = Ret < 0.2 ? 4.65 : Ret < 1 ? 4.35 * Ret ** -0.03 : Ret < 500 ? 4.45 * Ret ** -0.1 : 2.39;
    let ee = (vb / vt) ** (1 / nRZ);
    if (ee < eps0) ee = eps0;
    ee = Math.min(ee, 0.95);
    sum += x / (1 - ee);
  }
  return L * (1 - eps0) * sum;
}

/** NWSDB D3 §5.9.3.5 gravel grading rules → list of violations */
export function gravelRuleCheck(gravel, ES, orificeMm) {
  const L = [...gravel].sort((a, b) => a.from - b.from);
  const v = [];
  if (L.length && L[0].from < 4 * ES - 1e-9) v.push(`top layer lower size ${L[0].from} mm < 4 × ES (${(4 * ES).toFixed(1)} mm)`);
  if (L.length && orificeMm && L[L.length - 1].from < 2 * orificeMm - 1e-9) v.push(`bottom layer lower size ${L[L.length - 1].from} mm < 2 × orifice (${2 * orificeMm} mm)`);
  for (let i = 1; i < L.length; i++) if (L[i].to > 4 * L[i - 1].from + 1e-9) v.push(`${L[i].from}–${L[i].to} mm: upper size > 4 × ${L[i - 1].from} mm`);
  for (const g of L) if (g.depth * 1000 < Math.max(70, 3 * g.to) - 1e-6) v.push(`${g.from}–${g.to} mm layer ${Math.round(g.depth * 1000)} mm < max(70, 3 × ${g.to}) mm`);
  return v;
}

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const dem = ctx.res.demand;
  const q = ctx.res.quality;
  const sed = ctx.res.sed;
  const T = q.T;
  const { rho, mu, nu } = ctx.water;
  let type = d.type === 'auto' ? (proc.filter && proc.filter !== 'auto' ? proc.filter : 'rsf') : d.type;
  if (proc.ssf && d.type === 'auto') type = 'ssf';
  const Qh = dem.Qh;
  const out = { inputs: d, type, enabled: true };
  const rate = d.rate > 0 ? d.rate : type === 'dual' ? 10 : type === 'ssf' ? 0.15 : 7.5; // D3 Annex F.1 avg 5.7–8.1 m/h

  // influent turbidity to filters
  let infAvg, infPeak;
  if (sed && sed.enabled) { infAvg = sed.settledAvg; infPeak = sed.settledPeak; }
  else { infAvg = q.turbAvg; infPeak = q.turbMax; }

  if (type === 'ssf') {
    calc.section('Slow sand filters');
    const A = Qh / rate;
    calc.step('Total filter area', 'A = Q/v_f', `${n(Qh, 1)}/${n(rate)}`, A, 'm²', 'NWSDB D3 §5.12.5 – 0.1 (traditional) to 0.4 m/h');
    const su = ssfUnits(dem.Qd);
    calc.step('First estimate of number of units', 'n = 15\\sqrt{Q}', `15\\sqrt{${n(dem.Qd / 86400, 4)}}`, su.formula, '', `NWSDB D3 §5.12.5${su.table ? ` – Table 5-36: ${su.table} units` : ''}`);
    const nDuty = Math.max(2, Math.ceil(A / d.ssfMaxBed));
    const N = d.nFilters > 0 ? d.nFilters : nDuty + 1;
    const Af = A / Math.max(1, N - 1);
    const B = Math.round(Math.sqrt(Af / 1.5) * 10) / 10;
    const Lb = ceilTo(Af / B, 0.1);
    calc.step('Number of beds (incl. one standby for scraping)', 'N = \\lceil A/A_{max} \\rceil + 1', `\\lceil ${n(A)}/${n(d.ssfMaxBed)} \\rceil + 1`, N, '');
    calc.step('Bed area (N−1 in service)', 'A_f = A/(N-1)', `${n(A)}/${N - 1}`, Af, 'm²');
    const scrapesPerYr = 52 / d.ssfCleanWeeks;
    const resandYrs = (d.ssfDepth - d.ssfMinDepth) / (d.ssfScrape * scrapesPerYr);
    calc.step('Re-sanding interval', 't_r = \\frac{L_0-L_{min}}{\\Delta L\\,n_s}', `\\frac{${n(d.ssfDepth)}-${n(d.ssfMinDepth)}}{${n(d.ssfScrape)}\\times${n(scrapesPerYr)}}`, resandYrs, 'years', 'LN: scrape top layer every 4–6 weeks');
    const fr = gradation(synthGradation(d.ssfES, d.ssfUC)).fractions;
    const h0 = ckLoss(d.ssfDepth, fr, 0.38, 0.8, rate / 3600, rho, mu);
    calc.step('Clean-bed head loss (Carman–Kozeny)', 'h_0', '', h0, 'm');
    const rateOut = Qh / ((N - 1) * Af) * (N - 1) / Math.max(1, N - 2 + (N > 2 ? 0 : 1)) ;
    calc.check('f.rateSSF', rate);
    calc.check('f.rateSSF', Qh / ((N - 1) * Af), 'SSF rate with one bed being scraped', { crit: { min: 0, max: SSF.rate[1], hardMax: 0.5 }, src: 'NWSDB D3 §5.12.5 – use the higher rate (≤ 0.4 m/h) while units are cleaned' });
    void rateOut;
    calc.flag('Number of slow sand filter units', N >= SSF.minUnits, `${N}`, '≥ 2', 'Always at least two units', 'fail', 'NWSDB D3 §5.12.5');
    calc.check('f.ssfDepth', d.ssfDepth);
    calc.flag('Minimum sand depth before re-sanding', d.ssfMinDepth >= SSF.bedMin[0] - 1e-9, `${d.ssfMinDepth} m`, '≥ 0.5–0.8 m', '', 'warn', 'NWSDB D3 §5.12.5');
    calc.check('f.ssfES', d.ssfES);
    calc.check('f.ssfUC', d.ssfUC);
    calc.check('f.ssfSuper', d.ssfSupernatant);
    calc.check('f.ssfTurb', infAvg, 'Average turbidity applied to SSF');
    calc.flag('Peak turbidity applied to SSF', infPeak < SSF.turbPretreat, `${infPeak.toFixed(1)} NTU`, '< 20 NTU (pre-treat to average ≤ 5)', infPeak >= SSF.turbPretreat ? 'Pre-treatment necessary when the maximum is ≥ 20 NTU' : '', infPeak > SSF.turbMaxPretreated ? 'fail' : 'warn', 'NWSDB D3 §5.12.1, §5.12.6');
    const lim = SSF_LIMITS.filter(([k, , , mx]) => mx !== null && k !== 'turb').map(([k, name, txt, mx]) => ({ name, txt, v: k === 'po4' ? null : qWorst(q, k), mx })).filter((x) => x.v !== null && x.v !== undefined && !Number.isNaN(x.v));
    const over = lim.filter((x) => x.v > x.mx);
    calc.flag('Source water within SSF limits (Table 5-35)', !over.length, over.length ? over.map((x) => `${x.name} ${x.v}`).join(', ') : `${lim.length} parameters within`, 'algae ≤ 200/mL, colour ≤ 25, DOC ≤ 3, NH₃ ≤ 3, Fe & Mn < 1 mg/L', '', 'warn', 'NWSDB D3 Table 5-35');
    const boxDepth = 0.3 + 0.3 + d.ssfDepth + d.ssfSupernatant + 0.3;
    calc.step('Filter box depth (underdrain + gravel + sand + supernatant + freeboard)', 'D', `0.3+0.3+${n(d.ssfDepth)}+${n(d.ssfSupernatant)}+0.3`, boxDepth, 'm', 'NWSDB D3 §5.12.5 – minimum 2.70 m (3–4 m general practice)');
    calc.flag('SSF box depth', boxDepth >= SSF.boxTotal - 1e-9, `${boxDepth.toFixed(2)} m`, '≥ 2.70 m', '', 'warn', 'NWSDB D3 §5.12.5');
    calc.text('Inlet entrance velocity ≈ 0.1 m/s (inlet pipe 0.3–0.5 m/s); outlet weir crest ≥ 0.2 m above the sand; constant-rate control; clean → clogged head loss 0.6–1.2 m; new filters run to waste at ≈ 25 % rate for 1–2 weeks to form the schmutzdecke (NWSDB D3 §5.12.5, §5.12.8).');
    Object.assign(out, { rate, A, N, Af, B, Lb, h0, resandYrs, boxDepth, infAvg, infPeak,
      filteredAvg: Math.max(0.3, infAvg * 0.1), filteredPeak: Math.max(0.5, infPeak * 0.12),
      bwPct: 0, bwDailyM3: 0, footprint: { L: Lb + 0.6, W: (B + 0.3) * N }, headloss: d.ssfSupernatant + 0.3, kw: 0 });
    return { ...out, ...calc.result() };
  }

  // ---------------- Rapid gravity filters ----------------
  calc.section('Filter area and number');
  const A = Qh / rate;
  calc.step('Total filtration area', 'A = \\frac{Q}{v_f}', `\\frac{${n(Qh, 1)}}{${n(rate)}}`, A, 'm²', 'NWSDB D3 Table 5-26 – rapid gravity 5–15 m/h');
  const Nrule = 0.0195 * Math.sqrt(dem.Qd);
  const NtwoOut = rate < RSF.rate[1] ? Math.ceil(2 / (1 - rate / RSF.rate[1]) - 1e-9) : 4; // (N−2) filters at ≤ 15 m/h (D3 §5.9.2.2)
  let N = d.nFilters > 0 ? d.nFilters : Math.max(4, Math.ceil(Nrule), NtwoOut, Math.ceil(A / (filterAreaMax(dem.Qd) * 0.98)));
  if (d.nFilters <= 0 && N % 2 === 1) N += 1;
  calc.step('Number of filters (N = 1.2√Q, Q in mgd ≡ 0.0195√Q m³/d; min 4, even)', 'N = 1.2\\sqrt{Q_{mgd}}', `1.2\\sqrt{${n(dem.Qd / 3785.4, 2)}}`, d.nFilters > 0 ? N : Nrule, '', 'NWSDB D3 §5.9.2.2 (Kawamura)');
  const Af = A / N;
  calc.step('Area of each filter', 'A_f = A/N', `${n(A)}/${N}`, Af, 'm²');
  const beds = d.layout === 'twin' ? 2 : 1;
  const Abed = Af / beds;
  const B = Math.max(1.5, Math.round(Math.sqrt(Abed / d.bedRatio) * 10) / 10);
  const Lb = ceilTo(Abed / B, 0.1);
  const AfAct = beds * B * Lb;
  const rateAct = Qh / (N * AfAct);
  const rateOne = Qh / ((N - 1) * AfAct);
  calc.step(`Bed dimensions (${beds} bed${beds > 1 ? 's' : ''} per filter)`, 'B \\times L_b', `${n(B)} \\times ${n(Lb)}`, B * Lb, 'm² per bed');
  calc.step('Actual filtration rate', 'v_f = \\frac{Q}{N A_f}', `\\frac{${n(Qh, 1)}}{${N}\\times${n(AfAct)}}`, rateAct, 'm/h');
  calc.step('Rate with one filter backwashing', "v_f' = \\frac{Q}{(N-1) A_f}", `\\frac{${n(Qh, 1)}}{${N - 1}\\times${n(AfAct)}}`, rateOne, 'm/h');
  const rateTwo = Qh / (Math.max(1, N - 2) * AfAct);
  calc.step('Rate with one filter out for maintenance and one backwashing', "v_f'' = \\frac{Q}{(N-2) A_f}", `\\frac{${n(Qh, 1)}}{${N - 2}\\times${n(AfAct)}}`, rateTwo, 'm/h', 'NWSDB D3 §5.9.2.2, Annex F.1');
  calc.check(type === 'dual' ? 'f.rateDual' : 'f.rate', rateAct);
  calc.check('f.rateMax', rateTwo);
  calc.check('f.area', AfAct, null, { crit: { min: dem.Qd < 5000 ? 1.5 : 5, max: filterAreaMax(dem.Qd) }, src: `NWSDB D3 §5.9.2.3 – practical maximum ≈ ${filterAreaMax(dem.Qd)} m² (${dem.Qd > 37854 ? '> 10 mgd' : '< 10 mgd'}); §5.9.1 up to 140 m²` });
  // control mode recommended by D3 §5.9.9.1
  const ctrl = N <= 4 ? 'Variable-level influent flow splitting (inlet weir box on each filter, effluent weir above the media) – no rate controllers' : 'Variable-level declining rate (common inlet header below low water level, fixed orifice on each outlet)';
  calc.text(`Filter control (NWSDB D3 §5.9.9.1): ${N <= 4 ? 'four or fewer filters operated manually' : 'larger plant without full automation'} → ${ctrl}. With full automation use proportional-level control. Butterfly valves with electric actuators, opened in not less than one minute; provide filter-to-waste for the 5–30 min ripening period (D3 §5.9.9, §5.9.13).`);
  calc.flag('Number of filters', N >= minFilters(dem.Qd), `${N}`, `≥ ${minFilters(dem.Qd)}`, 'Design for maximum flow with one filter out for maintenance and another backwashing', 'fail', 'NWSDB D3 §5.9.2');
  const LBo = Math.max(Lb, beds * B + (d.layout === 'twin' ? d.gulletW : 0)) / Math.min(Lb, beds * B + (d.layout === 'twin' ? d.gulletW : 0));
  calc.flag('Filter length / breadth', LBo >= 1.0 && LBo <= 2.0, LBo.toFixed(2), '1.25–1.33 (D3 list)', 'Advisory – governs the economy of common walls', LBo >= RSF.LB[0] - 0.05 && LBo <= RSF.LB[1] + 0.05 ? 'warn' : 'info', 'NWSDB D3 §5.9.1');

  // ---- media
  calc.section('Filter media');
  const g = gradation(d.sieve);
  calc.step('Effective size of sand', 'ES = d_{10}', '\\text{from sieve analysis}', g.d10, 'mm', 'LN: ES = sieve size passing 10 %');
  calc.step('Uniformity coefficient', 'UC = d_{60}/d_{10}', `${n(g.d60)}/${n(g.d10)}`, g.UC, '', 'LN: UC = 60 % size / 10 % size');
  calc.check('f.ES', g.d10);
  calc.check('f.UC', g.UC);
  const sandL = type === 'dual' ? Math.min(d.sandDepth, 0.3) : d.sandDepth;
  if (type !== 'dual') {
    calc.check('f.depth', sandL);
    calc.flag('Sand depth ≥ 1200 × d₁₀', sandL >= sandDepthMin(g.d10) - 1e-9, `${(sandL * 1000).toFixed(0)} mm`, `≥ ${(sandDepthMin(g.d10) * 1000).toFixed(0)} mm`, '', 'warn', 'NWSDB D3 Annex F.1');
  }
  const gravelTot = d.gravel.reduce((a, x) => a + x.depth, 0);
  calc.check('f.gravel', gravelTot);
  const gv = gravelRuleCheck(d.gravel, g.d10, d.orificeDia);
  calc.flag('Support-gravel grading (Huisman rules)', !gv.length, gv.length ? `${gv.length} rule(s) not met` : 'all rules met', GRAVEL_RULES.length + ' rules', gv.join('; '), 'warn', 'NWSDB D3 §5.9.3.5');
  const v = rateAct / 3600;
  const h0sand = ckLoss(sandL, g.fractions, d.sandPorosity, d.sandPsi, v, rho, mu);
  calc.step('Clean-bed head loss – sand (Carman–Kozeny, stratified)', 'h_0 = \\frac{L(1-\\varepsilon)v^2}{\\psi\\varepsilon^3 g}\\sum\\frac{f_i x_i}{d_i},\\ f_i=\\frac{150(1-\\varepsilon)}{Re_i}+1.75', `L=${n(sandL)},\\ \\varepsilon=${n(d.sandPorosity)},\\ v=${n(v, 5)}`, h0sand, 'm');
  let anth = null, h0anth = 0;
  if (type === 'dual') {
    anth = gradation(synthGradation(d.anthES, d.anthUC));
    h0anth = ckLoss(d.anthDepth, anth.fractions, d.anthPorosity, d.anthPsi, v, rho, mu);
    calc.step('Clean-bed head loss – anthracite', 'h_{0,a}', `L=${n(d.anthDepth)},\\ ES=${n(d.anthES)}`, h0anth, 'm');
  }
  let h0gravel = 0;
  for (const lay of d.gravel) h0gravel += ckLoss(lay.depth, [{ d: Math.sqrt(lay.from * lay.to) / 1000, x: 1 }], 0.4, 0.9, v, rho, mu);
  calc.step('Head loss – gravel support layers', 'h_{0,g}', '', h0gravel, 'm');
  // underdrain
  calc.section('Underdrain (manifold & laterals, per bed)');
  const aO = (Math.PI * (d.orificeDia / 1000) ** 2) / 4;
  const AoTot = (d.orificeRatio / 100) * B * Lb;
  const nO = Math.ceil(AoTot / aO);
  calc.step('Total orifice area', 'A_o = r_o A_{bed}', `${n(d.orificeRatio / 100, 4)}\\times${n(B * Lb)}`, AoTot, 'm²');
  calc.step('Number of orifices', 'n_o = A_o/a_o', `${n(AoTot, 4)}/${n(aO, 6)}`, nO, '');
  const nLat = 2 * Math.floor(Lb / d.lateralSpacing);
  const latLen = (B - 0.3) / 2;
  const oPerLat = Math.ceil(nO / nLat);
  const latArea = d.latOrif * oPerLat * aO;
  const latDia = nextStd(Math.sqrt((4 * latArea) / Math.PI) * 1000, [40, 50, 65, 75, 80, 90, 100, 110, 125, 150]);
  const manArea = d.manLat * nLat * Math.PI * (latDia / 1000) ** 2 / 4;
  const manDia = nextStd(Math.sqrt((4 * manArea) / Math.PI) * 1000, DN);
  calc.step('Laterals per bed (both sides of manifold)', 'n_l = 2 L_b / s_l', `2\\times${n(Lb)}/${n(d.lateralSpacing)}`, nLat, '');
  calc.step('Orifices per lateral', 'n_o/n_l', `${nO}/${nLat}`, oPerLat, '');
  calc.step('Lateral diameter (area = k × orifice area served)', 'd_l', `A_l=${n(d.latOrif)}\\times${oPerLat}\\times a_o`, latDia, 'mm');
  calc.step('Manifold diameter', 'd_m', `A_m=${n(d.manLat)}\\times\\sum A_l`, manDia, 'mm');
  calc.check('f.orificeRatio', d.orificeRatio);
  calc.check('f.latOrif', d.latOrif);
  calc.check('f.manLat', d.manLat);
  calc.check('f.latLD', latLen / (latDia / 1000));
  calc.flag('Lateral spacing', d.lateralSpacing <= RSF.latSp + 1e-9, `${d.lateralSpacing} m`, '≤ 0.30 m', '', 'warn', 'NWSDB D3 §5.9.1');
  calc.flag('Underdrain type', dem.Qd <= 5000, 'pipe manifold & laterals', 'false floor with nozzles (55/m²) except very small schemes', 'D3 §5.9.1 recommends a nozzle false bottom (50–90 nozzles/m², slots 0.5–1.0 mm, spacing 125–150 mm) for all but very small plants; the lateral design here gives the hydraulic basis', 'info', 'NWSDB D3 §5.9.1, §5.9.3.3');
  const vOrifFilt = (Qh / 3600 / N / beds) / AoTot;
  const hUnderFilt = (vOrifFilt / d.orificeCd) ** 2 / (2 * G);
  const h0 = h0sand + h0anth + h0gravel + hUnderFilt;
  calc.step('Total clean filter head loss', 'h_{0,tot}', `${n(h0sand)}+${n(h0anth)}+${n(h0gravel)}+${n(hUnderFilt, 4)}`, h0, 'm');

  // ---- run length
  calc.section('Filter run');
  const tssPerNtu = q.inputs.tssPerNtu || 1.4;
  const tssAvg = infAvg * tssPerNtu;
  const tssPeak = infPeak * tssPerNtu;
  const runAvg = (d.solidsCap * 1000) / (rateAct * tssAvg);
  const runPeak = (d.solidsCap * 1000) / (rateAct * tssPeak);
  calc.step('Applied solids (settled water, average)', 'C = k\\,T_s', `${n(tssPerNtu)}\\times${n(infAvg)}`, tssAvg, 'mg/L');
  calc.step('Run length (average)', 't_r = \\frac{\\sigma}{v_f\\,C}', `\\frac{${n(d.solidsCap)}\\times1000}{${n(rateAct)}\\times${n(tssAvg)}}`, runAvg, 'h');
  calc.step('Run length at monsoon peak', "t_r' = \\frac{\\sigma}{v_f\\,C_{peak}}", `\\frac{${n(d.solidsCap)}\\times1000}{${n(rateAct)}\\times${n(tssPeak)}}`, runPeak, 'h');
  const runUsed = Math.min(runAvg, 96);
  const UFRV = rateAct * runUsed;
  calc.step('Unit filter run volume', 'UFRV = v_f\\,t_r', `${n(rateAct)}\\times${n(runUsed)}`, UFRV, 'm³/m²');
  calc.check('f.run', runPeak, 'Filter run at monsoon peak', { crit: { min: 24, max: 1e9, hardMin: 12 }, range: '≥ 24', src: 'NWSDB D3 §5.9 – runs 1–3 d typical (12–96 h)' });
  if (runAvg > 72) calc.note('info', `Average-season run length is ${runAvg.toFixed(0)} h – in practice filters are washed at least every 72 h (biological growth), so the 72 h cycle is used for wash-water estimates.`);
  if (runPeak < 12) calc.note('warn', `At the monsoon peak the filter run drops to ${runPeak.toFixed(1)} h – check settled-water quality, consider polymer as filter aid or more filters.`);

  // ---- backwash
  calc.section('Backwash');
  const d90 = g.d90 / 1000;
  const rhoP = d.sandSG * 1000;
  const Vmf = vmf(d90, rhoP, rho, mu);
  calc.step('Minimum fluidisation velocity of d₉₀ (Wen & Yu)', 'V_{mf} = \\frac{\\mu}{\\rho d}\\left[\\sqrt{33.7^2+0.0408\\,Ga}-33.7\\right],\\ Ga=\\frac{d^3\\rho(\\rho_p-\\rho)g}{\\mu^2}', `d_{90}=${n(g.d90)}\\,mm`, Vmf * 3600, 'm/h');
  let VmfA = 0;
  if (type === 'dual') { VmfA = vmf((anth.d90 / 1000), d.anthSG * 1000, rho, mu); }
  const vbAuto = d.bwFactor * Math.max(Vmf, VmfA);
  const vb = d.bwRate > 0 ? d.bwRate / 3600 : vbAuto;
  calc.step('Backwash rate', 'V_b = k\\,V_{mf}(d_{90})', `${n(d.bwFactor)}\\times${n(Math.max(Vmf, VmfA) * 3600)}`, vb * 3600, 'm/h', d.bwRate > 0 ? 'User value' : 'NWSDB D3 §5.9.12.11 – > Vmf(d₉₀), suggested 1.3 Vmf₉₀');
  calc.check('f.bwRate', vb * 3600);
  calc.check('f.bwTime', d.bwMinutes);
  const Le = expanded(sandL, g.fractions, d.sandPorosity, rhoP, T, vb, nu);
  let LeA = 0;
  if (type === 'dual') LeA = expanded(d.anthDepth, anth.fractions, d.anthPorosity, d.anthSG * 1000, T, vb, nu);
  const Ltot = sandL + (type === 'dual' ? d.anthDepth : 0);
  const LeTot = Le + LeA;
  const expPct = (LeTot / Ltot - 1) * 100;
  calc.step('Expanded bed depth (Richardson–Zaki per fraction)', 'L_e = L(1-\\varepsilon_0)\\sum\\frac{x_i}{1-\\varepsilon_{e,i}},\\ \\varepsilon_{e,i}=\\left(\\frac{V_b}{v_{t,i}}\\right)^{1/n_i}', '', LeTot, 'm');
  calc.step('Bed expansion', 'E = \\frac{L_e}{L}-1', `\\frac{${n(LeTot)}}{${n(Ltot)}}-1`, expPct, '%');
  calc.check('f.expansion', expPct, d.bwMethod === 'airwater' ? 'Bed expansion (air scour + water wash)' : 'Bed expansion (water-only wash)', d.bwMethod === 'water' ? { crit: { min: 15, max: 50, hardMin: 10, hardMax: 60 }, range: '15 – 50', src: 'NWSDB D3 §5.9.12.5 – water-only wash normally 20–50 % (fluidised 15–30 %)' } : {});
  const hFluid = sandL * (1 - d.sandPorosity) * (d.sandSG - 1) + (type === 'dual' ? d.anthDepth * (1 - d.anthPorosity) * (d.anthSG - 1) : 0);
  calc.step('Head loss through fluidised bed', 'h_f = L(1-\\varepsilon)(S_s-1)', `${n(sandL)}(1-${n(d.sandPorosity)})(${n(d.sandSG)}-1)`, hFluid, 'm');
  const Qbw = vb * AfAct; // m3/s per filter
  const vOrifBw = Qbw / beds / AoTot;
  const hUnderBw = (vOrifBw / d.orificeCd) ** 2 / (2 * G);
  calc.step('Orifice head loss at backwash flow', 'h_o = \\frac{1}{2g}\\left(\\frac{v_o}{C_d}\\right)^2', `\\frac{1}{19.62}\\left(\\frac{${n(vOrifBw)}}{${n(d.orificeCd)}}\\right)^2`, hUnderBw, 'm');
  const washVol = vb * 60 * d.bwMinutes * AfAct + (rateAct / 60) * d.ftwMinutes * AfAct;
  calc.step('Water per wash (backwash + filter-to-waste)', 'V_w = A_f(V_b t_b + v_f t_{ftw})', `${n(AfAct)}(${n(vb * 60)}\\times${n(d.bwMinutes)} + ${n(rateAct / 60, 3)}\\times${n(d.ftwMinutes)})`, washVol, 'm³');
  const washesPerDay = Math.max(24 / Math.min(runAvg, 72), 1 / 3);
  const bwDailyM3 = N * washesPerDay * washVol;
  const bwPct = (bwDailyM3 / dem.Qd) * 100;
  calc.step('Washes per filter per day', 'n_w = 24/t_r', `24/${n(Math.min(runAvg, 72))}`, washesPerDay, '');
  calc.step('Daily wash-water use', 'V_d = N\\,n_w V_w', `${N}\\times${n(washesPerDay)}\\times${n(washVol)}`, bwDailyM3, 'm³/d');
  calc.step('Wash water as % of plant output', '\\%BW = V_d/Q', `${n(bwDailyM3)}/${n(dem.Qd, 0)}`, bwPct, '%');
  calc.check('f.bwPct', bwPct);
  const UBWV = washVol / AfAct;
  const net = UFRV - UBWV;
  calc.step('Unit backwash volume', 'UBWV = V_w/A_f', `${n(washVol)}/${n(AfAct)}`, UBWV, 'm³/m²', 'NWSDB D3 §5.9.12 – typically 4–8 m³/m² per wash');
  calc.step('Net filter production per run', 'UFRV - UBWV', `${n(UFRV)} - ${n(UBWV)}`, net, 'm³/m²', 'NWSDB D3 §5.9.13.4');
  calc.step('Filter efficiency', 'E = \\frac{UFRV-UBWV}{UFRV}', `\\frac{${n(net)}}{${n(UFRV)}}`, (net / UFRV) * 100, '%', 'NWSDB D3 §5.9.13.4');
  calc.check('f.UFRV', net);
  // wash supply
  const staticBw = d.underdrainDepth + d.gravel.reduce((a, x) => a + x.depth, 0) + Ltot + 0.6 + 3.0; // CWR low level ~3 m below filter floor
  const tdhBw = staticBw + hFluid + hUnderBw + 0.3 + 2.0;
  const bwPumpKw = nextStd(((rho * G * Qbw * tdhBw) / 0.75 / 0.92 / 1000) * 1.1, MOTOR_KW);
  calc.step('Wash-water pump head', 'H = H_s + h_f + h_o + h_g + h_p', `${n(staticBw)}+${n(hFluid)}+${n(hUnderBw)}+0.3+2.0`, tdhBw, 'm');
  calc.step('Wash pump duty', 'Q_b = V_b A_f', `${n(vb * 3600)}\\times${n(AfAct)}`, Qbw * 3600, 'm³/h');
  calc.step('Wash pump motor (η = 0.75 × 0.92, +10 %)', 'P = \\frac{\\rho g Q H}{\\eta}', `\\frac{${n(rho, 0)}\\times9.81\\times${n(Qbw, 3)}\\times${n(tdhBw)}}{0.69}`, bwPumpKw, 'kW');
  calc.flag('Wash-water head', tdhBw >= RSF.bwHead[0] - 1e-9 && tdhBw <= RSF.bwHead[1] + 1e-9, `${tdhBw.toFixed(1)} m`, '8–15 m', '', 'info', 'NWSDB D3 §5.9.1');
  const tankVol = d.bwSupply === 'tank' ? RSF.bwTank.washes * vb * 60 * Math.max(d.bwMinutes, RSF.bwTank.min) * AfAct * 1.1 : 0;
  if (d.bwSupply === 'tank') {
    calc.step('Elevated wash-water tank (2 washes of ≥ 10 min + 10 %)', 'V_t = 1.1\\times2\\,V_b t_b A_f', '', tankVol, 'm³', 'NWSDB D3 §5.9.1, Annex F.1 – refill in 60–120 min');
    calc.step('Tank refill pump (60 min)', 'Q_r = V_t/60', `${n(tankVol)}/60`, tankVol / 60, 'm³/min');
  }
  // air scour
  let airQ = 0, blowerKw = 0, airP = 0;
  if (d.bwMethod === 'airwater') {
    airQ = d.airRate * AfAct;
    const depthAir = d.waterDepth + Ltot + d.gravel.reduce((a, x) => a + x.depth, 0) + 0.3;
    airP = depthAir * 9.81 + 15;
    const p1 = 101.3, p2 = p1 + airP;
    const w = (airQ / 3600) * 1.2;
    blowerKw = nextStd(((w * 8.314 * 303) / (29.7 * 0.283 * 0.7)) * ((p2 / p1) ** 0.283 - 1) * 1.15, MOTOR_KW);
    calc.step('Air-scour flow', 'Q_a = q_a A_f', `${n(d.airRate)}\\times${n(AfAct)}`, airQ, 'm³/h', 'NWSDB D3 §5.9.1 – 54–90 m³/m²·h for 2–3 min at 20–35 kPa');
    calc.check('f.airRate', d.airRate);
    calc.check('f.airTime', d.airMinutes);
    calc.step('Blower discharge pressure', 'p = \\gamma h + \\Delta p', `9.81\\times${n(depthAir)} + 15`, airP, 'kPa');
    calc.step('Blower power (adiabatic, e = 0.7)', 'P = \\frac{w R T_1}{29.7\\,n\\,e}\\left[\\left(\\frac{p_2}{p_1}\\right)^{0.283}-1\\right]', `w=${n(w, 3)}\\,kg/s`, blowerKw, 'kW');
  }
  // troughs
  calc.section('Wash-water troughs');
  const nTr = Math.max(1, Math.ceil(Lb / d.troughSpacing));
  const qTr = Qbw / beds / nTr;
  const hTr = (qTr / (1.376 * d.troughWidth)) ** (2 / 3);
  const trDepth = hTr + 0.1;
  const lipAbove = Math.max(RSF.troughH[0], (LeTot - Ltot) + 0.15 + trDepth);
  calc.step('Troughs per bed', 'n_t = \\lceil L_b/s_t \\rceil', `\\lceil ${n(Lb)}/${n(d.troughSpacing)} \\rceil`, nTr, '');
  calc.step('Water depth in trough', 'h = \\left(\\frac{Q_t}{1.38\\,b}\\right)^{2/3}', `\\left(\\frac{${n(qTr, 4)}}{1.38\\times${n(d.troughWidth)}}\\right)^{2/3}`, hTr, 'm', 'NWSDB D3 Annex F.1 – Q = 1.38 b h^1.5; free fall 5–10 cm, freeboard 50 mm');
  calc.step('Trough lip above unexpanded media', 'h_{lip} = \\max(0.75,\\ (L_e-L) + 0.15 + d_t)', `${n(LeTot - Ltot)}+0.15+${n(trDepth)}`, lipAbove, 'm', 'NWSDB D3 §5.9.4 – 0.75–0.9 m; expanded media below trough bottoms');
  calc.check('f.troughSp', Lb / nTr);
  calc.check('f.troughH', lipAbove);
  // gallery pipework
  calc.section('Filter gallery pipework (per filter)');
  const Qf = Qh / 3600 / N;
  const pipes = /** @type {Array<[string, number, number, string]>} */ ([
    ['Influent (settled water)', Qf, 0.6, 'f.vInf'],
    ['Filtered water', Qf, 1.5, 'f.vEff'],
    ['Wash water', Qbw, 2.4, 'f.vWash'],
    ['Wash waste', Qbw, 1.5, 'f.vWaste'],
  ]).map(([label, Qp, vt, key]) => {
    const dn = selectDNRange(Qp, ctx.crit[key].min, ctx.crit[key].max, Math.max(vt, ctx.crit[key].min));
    const vv = vel(Qp, dn / 1000);
    calc.step(label + ' pipe', 'DN', `Q=${n(Qp, 3)}\\,m^3/s`, dn, 'mm');
    calc.check(key, vv, label + ' velocity');
    return { label, Q: Qp, dn, v: vv };
  });
  // box depth
  const gravelD = d.gravel.reduce((a, x) => a + x.depth, 0);
  const boxDepth = d.underdrainDepth + gravelD + Ltot + d.waterDepth + d.freeboard;
  calc.step('Filter box depth', 'D = h_u + h_g + L + h_w + f_b', `${n(d.underdrainDepth)}+${n(gravelD)}+${n(Ltot)}+${n(d.waterDepth)}+${n(d.freeboard)}`, boxDepth, 'm');
  calc.check('f.water', d.waterDepth);
  calc.check('f.box', boxDepth);
  const kwm2 = ((bwPumpKw + blowerKw) / AfAct);
  calc.step('Backwash power per m² of filter (pump + blower)', 'P/A_f', `${n(bwPumpKw + blowerKw)}/${n(AfAct)}`, kwm2, 'kW/m²', 'NWSDB D3 §5.9.1 – about 1.5 kW/m²');
  // filtered water quality
  const fAvg = Math.max(0.1, infAvg * 0.08), fPeak = Math.max(0.2, infPeak * 0.1);
  calc.check('f.turbOut', fAvg, 'Filtered-water turbidity (average, ≈ 95 % of samples)');
  calc.check('f.turbOut', fPeak, 'Filtered-water turbidity (monsoon peak)', { crit: { min: 0, max: 1.0, hardMax: 1.0 }, range: '≤ 1.0', src: 'NWSDB D3 §5.8.3 – never > 1 NTU; §6.2.4 ≤ 1.0 NTU must be strived for' });
  calc.text('Controls: sampling taps, loss-of-head gauge, rate-of-flow control, wash-line rate indicator, sand-expansion gauge, backwash flow meter; filter-to-waste for ripening (5–30 min); no common wall between filtered and unfiltered water (NWSDB D3 §5.9.1, §5.9.13, §9.5.4).');
  // head loss development
  const hlCurve = [];
  const tMax = Math.min(runAvg, 120);
  for (let i = 0; i <= 24; i++) {
    const t = (tMax * i) / 24;
    hlCurve.push({ t, h: h0 + ((d.termHead - h0) * t) / Math.max(tMax, 1e-6) });
  }
  // expansion vs rate curve
  const expCurve = [];
  for (let vbx = 10; vbx <= 90; vbx += 2.5) {
    const L1 = expanded(sandL, g.fractions, d.sandPorosity, rhoP, T, vbx / 3600, nu);
    const L2 = type === 'dual' ? expanded(d.anthDepth, anth.fractions, d.anthPorosity, d.anthSG * 1000, T, vbx / 3600, nu) : 0;
    expCurve.push({ vb: vbx, exp: ((L1 + L2) / Ltot - 1) * 100 });
  }
  const gw = d.layout === 'twin' ? d.gulletW : 0;
  const boxW = beds * B + gw + (beds === 1 ? 0.9 : 0);
  Object.assign(out, {
    control: ctrl, rate: rateAct, rateOne, A, N, Nrule, Af: AfAct, beds, B, Lb, g, anth, sandL, Ltot, h0, h0sand, h0anth, h0gravel, hUnderFilt,
    infAvg, infPeak, runAvg, runPeak, UFRV, Vmf, vb, Le: LeTot, expPct, hFluid, Qbw, hUnderBw, washVol, washesPerDay, bwDailyM3, bwPct,
    tdhBw, bwPumpKw, tankVol, airQ, airP, blowerKw, nTr, hTr, trDepth, lipAbove, pipes, boxDepth, gravelD, hlCurve, expCurve,
    nO, nLat, latLen, oPerLat, latDia, manDia,
    filteredAvg: fAvg, filteredPeak: fPeak, UBWV, net, rateTwo, kwm2,
    footprint: { L: Lb + 0.6, W: (boxW + 0.3) * N / 2 + 4, boxW, rows: 2 },
    headloss: d.termHead + 0.3 + 0.15, // terminal loss + inlet/outlet weirs & control
    kw: blowerKw > 0 ? bwPumpKw + blowerKw : bwPumpKw,
    kwh: (bwPumpKw * d.bwMinutes / 60 + blowerKw * d.airMinutes / 60) * N * washesPerDay,
  });
  void clamp;
  return { ...out, ...calc.result() };
}
