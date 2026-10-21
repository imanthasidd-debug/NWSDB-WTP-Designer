// Clear-water reservoir, treated-water pumping & transmission main, service-reservoir balancing (mass curve)
// NWSDB Design Manual D2 §6 (pumping), §7 (mains), §9 (service reservoirs), §6.3 (flotation)
import { Calc, n } from '../core/calc.js';
import { DIURNAL_D2, LARGE_STORAGE_MIN_H, STRUCT, ref, smallStoragePct } from '../core/d2.js';
import { DIURNAL } from '../core/srilanka.js';
import { ceilTo } from '../core/util.js';
import { mainChecks, pumpSystem } from './pumps.js';

export const PATTERNS = { d2: DIURNAL_D2, urban24: DIURNAL };

export const DEFAULTS = {
  cwrHours: 4,
  cwrDepth: 4.5,
  cwrCompartments: 2,
  cwrFreeboard: 0.5,
  gwlDepth: 3.0,          // highest groundwater level below ground (m) – flotation check
  antiFlotation: 'toe',   // toe (base projection with soil ballast) | relief (under-drain / relief valves) | none
  // treated water pumping (D2 §6.2.6 – design on 24-h pumping)
  pumpHours: 24,
  nDuty: 2,
  nStandby: 0,            // 0 = D2 §6.4.1
  srTWL: 95,              // service reservoir top water level (m MSL)
  mainLength: 4500,
  hwC: 0,                 // 0 = D2 Fig 7.6 design value
  minorK: 15,
  etaP: 0,
  etaM: 0,
  pumpKind: 'horizontal',
  material: 'di',
  dnMode: 'econ',
  surgeProtect: 'auto',
  soilBearing: 100,
  dn: 0,
  wave: 1000,
  // service reservoir balancing (D2 §9.2)
  patternMode: 'd2',      // d2 | urban24 | custom
  pattern: DIURNAL_D2,
  pumpStart: 0,
  emergencyPct: 20,
  srBasis: 'max',         // max | mass | d2
  srDepth: 4,
  srCompartments: 2,
  srShape: 'ground',      // ground | elevated
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const pattern = d.patternMode === 'custom' && inp?.pattern?.length === 24 ? inp.pattern : PATTERNS[d.patternMode] || DIURNAL_D2;
  const calc = new Calc(ctx.crit);
  const dem = ctx.res.demand;
  const T = ctx.res.quality.T;
  const Qh = dem.Qh;
  calc.section('Clear-water reservoir');
  const V = d.cwrHours * Qh;
  calc.step('Clear-water storage', 'V = t_s\\,Q', `${n(d.cwrHours)}\\times${n(Qh, 0)}`, V, 'm³');
  const Vc = V / d.cwrCompartments;
  const side = Math.sqrt(Vc / d.cwrDepth);
  const W = Math.round(side * 10) / 10;
  const L = ceilTo(Vc / (d.cwrDepth * W), 0.1);
  calc.step('Compartment plan (each)', 'L \\times W', `${n(L)}\\times${n(W)}`, L * W, 'm²');
  calc.check('cwr.hours', d.cwrHours);
  calc.check('cwr.depth', d.cwrDepth);
  calc.flag('Two compartments, each with separate inlet & outlet, plus by-pass', d.cwrCompartments >= 2, `${d.cwrCompartments}`, '≥ 2', '', 'warn', ref('9.4'));
  // flotation (D2 §6.3) – empty tank, groundwater at gwlDepth below ground
  const GL = ctx.res.hyd?.GL ?? 20;
  const floor = (ctx.res.hyd?.cwrLWL ?? GL - d.cwrDepth) - 0.3;
  const gwl = GL - d.gwlDepth;
  const tW = 0.35, tB = 0.4, tR = 0.25, Hwall = d.cwrDepth + d.cwrFreeboard + 0.3;
  const Lo = L + 2 * tW, Wo = d.cwrCompartments * (W + tW) + tW;
  const conc = 2 * (Lo + Wo) * Hwall * tW + (d.cwrCompartments - 1) * L * Hwall * tW + Lo * Wo * (tB + tR);
  const weight = conc * 24; // kN
  const hU = Math.max(0, gwl - (floor - tB));
  const uplift0 = hU * Lo * Wo * 9.81;
  const fos0 = uplift0 > 0 ? weight / uplift0 : 99;
  // anti-flotation toe: base projection e carrying soil ballast (submerged 8 kN/m³ below GWL, 18 above)
  const soilP = Math.max(0, Math.min(gwl, GL) - floor) * 8 + Math.max(0, GL - Math.max(gwl, floor)) * 18;
  const fosAt = (e) => { const At = (Lo + 2 * e) * (Wo + 2 * e) - Lo * Wo; const U = hU * (Lo + 2 * e) * (Wo + 2 * e) * 9.81; return U > 0 ? (weight + At * (soilP + tB * 24)) / U : 99; };
  let toe = 0;
  if (d.antiFlotation === 'toe' && fos0 < STRUCT.flotationFoS) { for (let e = 0.1; e <= 3.001; e += 0.1) { toe = +e.toFixed(1); if (fosAt(toe) >= STRUCT.flotationFoS) break; } }
  const fos = d.antiFlotation === 'toe' ? fosAt(toe) : fos0;
  const toeConc = toe > 0 ? ((Lo + 2 * toe) * (Wo + 2 * toe) - Lo * Wo) * tB : 0;
  calc.section('Flotation check – empty reservoir (D2 §6.3)');
  calc.step('Highest groundwater level', 'GWL = GL - d_{gw}', `${n(GL)} - ${n(d.gwlDepth)}`, gwl, 'm MSL');
  calc.step('Uplift on empty reservoir', 'U = \\gamma_w A (GWL - z_{base})', `9.81\\times${n(Lo * Wo, 0)}\\times${n(hU)}`, uplift0, 'kN');
  calc.step('Self-weight of structure (RC 24 kN/m³)', 'W = 24 V_c', `24\\times${n(conc, 0)}`, weight, 'kN');
  calc.step('Factor of safety – structure alone', 'F = W/U', uplift0 > 0 ? `${n(weight, 0)}/${n(uplift0, 0)}` : '\\text{no uplift}', Math.min(fos0, 99), '–', ref('6.3') + ' – FoS 1.5');
  if (toe > 0) {
    calc.step('Anti-flotation toe projection (soil ballast)', 'e', `\\text{soil } ${n(soilP, 1)}\\,kN/m^2`, toe, 'm');
    calc.step('Factor of safety with toe', 'F = \\frac{W + A_t(w_s + 24t_b)}{\\gamma_w A\\,h_U}', '', Math.min(fos, 99), '–', ref('6.3'));
  }
  if (d.antiFlotation === 'relief') {
    calc.check('struct.flotation', 99, 'Flotation – under-drain / pressure-relief valves', { status: 'ok', range: 'uplift relieved', src: ref('6.3') });
    calc.note('info', 'Uplift is neutralised by an under-drain system with interior pressure-relief valves (D2 §6.3) – check that groundwater entering the empty tank can be pumped out and cannot contaminate stored water.');
  } else calc.check('struct.flotation', Math.min(fos, 99));
  if (fos < STRUCT.flotationFoS && d.antiFlotation !== 'relief') calc.note('warn', `Flotation FoS ${fos.toFixed(2)} < 1.5 – raise the reservoir, enlarge the base toe, anchor it, or provide under-drains with relief valves (D2 §6.3).`);
  calc.text(`Water-retaining concrete grade C${STRUCT.fcuWR} (fcu 25 MPa), other structural concrete C${STRUCT.fcuStruct}; reinforcement fy ${STRUCT.fyMild}/${STRUCT.fyHigh} MPa (D2 §6.3).`);

  // treated water pumping
  calc.section('Treated-water pumping & transmission main (D2 §6, §7)');
  const mdd = dem.design.mdd;
  const Qp = mdd / d.pumpHours / 3600; // m3/s
  calc.step('Pumping rate (max-day over pumping hours)', 'Q_p = \\frac{Q_{md}}{h_p}', `\\frac{${n(mdd, 0)}}{${n(d.pumpHours)}}`, Qp * 3600, 'm³/h', ref('7.3.2') + ' – max day, constant flow over 24 h');
  const cwrLWL = ctx.res.hyd?.cwrLWL ?? 0;
  const Hs = d.srTWL - cwrLWL;
  calc.step('Static lift (SR TWL − CWR LWL)', 'H_s', `${n(d.srTWL)} - ${n(cwrLWL)}`, Hs, 'm');
  const site = ctx.inp.setup || {};
  const pumps = pumpSystem({ Q: Qp, nDuty: d.nDuty, nStandby: d.nStandby, Hs, L: d.mainLength, C: d.hwC, K: d.minorK, dn: d.dn, dnMode: d.dnMode, material: d.material, surgeProtect: d.surgeProtect, soilBearing: d.soilBearing, vTarget: 1.2, vMax: 1.6, etaP: d.etaP, etaM: d.etaM, pumpKind: d.pumpKind, hours: d.pumpHours, wave: d.wave, T, elev: num(site.siteElevation, 10), suctionHead: 1.0, suctionLoss: 0.5 }, calc, 'TW: ', ctx);
  mainChecks(calc, pumps, 'pipe.twV', 'Velocity in treated-water main', { hours: d.pumpHours });
  if (d.pumpHours < 24) calc.note('warn', `D2 §6.2.6 / §9.2: pumping plant should be designed on 24-hour pumping at the design year; ${d.pumpHours} h/d increases main, pump and storage sizes – justify on cost or source grounds.`);

  // service reservoir mass curve (D2 §9.2)
  calc.section('Service reservoir (D2 §9.2 – mass diagram)');
  calc.text(d.patternMode === 'd2' ? 'Consumption pattern: D2 §9.2 default (% of daily demand per hour, zero demand 22:00–05:00).' : d.patternMode === 'urban24' ? 'Consumption pattern: continuous 24-hour urban supply.' : 'Consumption pattern: user defined.');
  const pat = pattern.map(Number);
  const pm = pat.reduce((a, b) => a + b, 0) / 24;
  const dmd = pat.map((x) => (x / pm) * (mdd / 24));
  const sup = Array.from({ length: 24 }, (_, h) => {
    const k = (h - d.pumpStart + 24) % 24;
    return k < d.pumpHours ? mdd / d.pumpHours : 0;
  });
  let cumD = 0, cumS = 0, maxSur = -Infinity, minSur = Infinity;
  const mass = [{ h: 0, D: 0, S: 0 }];
  for (let h = 0; h < 24; h++) {
    cumD += dmd[h]; cumS += sup[h];
    mass.push({ h: h + 1, D: cumD, S: cumS });
    const s = cumS - cumD;
    maxSur = Math.max(maxSur, s); minSur = Math.min(minSur, s);
  }
  maxSur = Math.max(maxSur, 0); minSur = Math.min(minSur, 0);
  const balancing = maxSur - minSur;
  const massV = balancing * (1 + d.emergencyPct / 100);
  calc.step('Equalising storage (max surplus + max deficit)', 'V_b = \\max(S-D) - \\min(S-D)', `${n(maxSur, 0)} + ${n(-minSur, 0)}`, balancing, 'm³', ref('9.2'));
  calc.step('Mass-curve capacity (+ emergency reserve)', 'V = V_b(1+e)', `${n(balancing, 0)}(1+${n(d.emergencyPct / 100)})`, massV, 'm³');
  const small = dem.d2?.Pdesign < 20000;
  const d2Pct = small ? smallStoragePct(d.pumpHours) : (LARGE_STORAGE_MIN_H / 24) * 100;
  const d2V = (d2Pct / 100) * mdd;
  calc.step(small ? `D2 rule – small scheme, ${d.pumpHours} h supply` : 'D2 rule – larger system, ≥ 8 h of max day', 'V_{D2} = k\\,Q_{md}', `${n(d2Pct, 0)}\\%\\times${n(mdd, 0)}`, d2V, 'm³', ref('9.2'));
  const srV = d.srBasis === 'mass' ? massV : d.srBasis === 'd2' ? d2V : Math.max(massV, d2V);
  calc.step('Adopted service-reservoir capacity', 'V_{SR}', d.srBasis === 'max' ? '\\max(V, V_{D2})' : d.srBasis === 'mass' ? '\\text{mass curve}' : '\\text{D2 rule}', srV, 'm³');
  calc.step('As fraction of max-day demand', 'V_{SR}/Q_{md}', '', (srV / mdd) * 100, '%');
  calc.check('sr.capacity', (srV / mdd) * 100, undefined, { crit: { min: d2Pct } });
  calc.check('sr.depth', d.srDepth);
  calc.flag('Service reservoir in two compartments', d.srCompartments >= 2, `${d.srCompartments}`, '≥ 2', 'separate inlet & outlet, common scour & overflow', 'warn', ref('9.4'));
  const srA = srV / d.srDepth;
  return {
    inputs: d, pattern: pat, V, Vc, L, W, depth: d.cwrDepth, Qp, Hs, pumps, mass, dmd, sup, balancing, massV, d2V, d2Pct, srV, srA, fos, fos0, toe, toeConc, gwl,
    footprint: { L: L + 0.6, W: (W + 0.3) * d.cwrCompartments + 0.3 },
    kw: pumps.motor * d.nDuty, kWhD: pumps.kWhD,
    ...calc.result(),
  };
}
function num(v, d) { const x = parseFloat(v); return Number.isFinite(x) ? x : d; }
