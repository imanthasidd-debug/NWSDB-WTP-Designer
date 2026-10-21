// Sedimentation: rectangular horizontal-flow, circular radial-flow, or tube-settler clarifiers
import { Calc, n } from '../core/calc.js';
import { G, ceilTo, rad } from '../core/util.js';

export const DEFAULTS = {
  type: 'auto',
  nTanks: 0,            // 0 = one per train
  sor: 30,              // m3/m2/d
  depth: 3.5,           // side water depth (settling zone)
  LW: 5,
  sludgeDepth: 0.5,
  weirLoad: 200,        // m3/m/d (design)
  launderLenFrac: 0.33, // finger launder length as fraction of tank length
  launderWidth: 0.4,
  notchSpacing: 0.2,
  portV: 0.2,
  portDia: 0.1,
  // settling model
  v50: 3.5,             // median floc settling velocity, m/h (LN table: medium alum floc 3–5 m/h)
  sigmaG: 1.8,          // geometric std dev of settling velocity distribution
  perfFactor: 1.4,      // non-ideal (short-circuiting/turbulence) multiplier on overflow rate
  // scour (Camp)
  campK: 0.05, campF: 0.025, sp: 1.05, dp: 0.0008,
  // tube settlers
  tubeLoad: 4.0,        // m/h on covered area
  tubeD: 0.05, tubeL: 1.0, tubeAngle: 60, tubeS: 1.375, coverFrac: 0.75,
  // plain pre-sedimentation
  presedSor: 20, presedDepth: 3.0,
  plainV50: 1.0, plainSigma: 3.0, // un-coagulated silt/clay population for plain sedimentation
};

const phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
/** Ideal-basin removal of a log-normal settling-velocity population (lecture: η = v/vc for v < vc) */
export function removal(vc, v50, sg) {
  const s = Math.log(sg);
  const F = phi(Math.log(vc / v50) / s);
  const partial = (v50 * Math.exp((s * s) / 2) * phi((Math.log(vc / v50) - s * s) / s)) / vc;
  return { R: (1 - F) + partial, F, partial };
}

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const dem = ctx.res.demand;
  const q = ctx.res.quality;
  const { nu } = ctx.water;
  const plain = !proc.conv && proc.presed === 'yes';
  if (plain) { d.sor = d.presedSor; d.depth = d.presedDepth; d.v50 = d.plainV50; d.sigmaG = d.plainSigma; }
  const type = plain ? 'rect' : d.type === 'auto' ? (proc.clarifier && proc.clarifier !== 'auto' ? proc.clarifier : 'rect') : d.type;
  const N = d.nTanks > 0 ? d.nTanks : Math.max(2, dem.nTrains);
  const Qd = dem.Qd / N;
  const Qs = Qd / 86400;
  const Qh = Qd / 24;
  const out = { inputs: d, type, plain, N, Qd, Qs, enabled: (proc.has.sed && proc.conv) || plain };
  if (plain) calc.note('info', 'Plain (un-coagulated) sedimentation ahead of slow sand filters – sized at the pre-sedimentation overflow rate.');
  calc.section('Flow per tank');
  calc.step('Design flow per tank', 'Q_t = Q/N', `${n(dem.Qd, 0)}/${N}`, Qd, 'm³/d');

  if (type === 'rect' || type === 'tube') {
    let A, W, L;
    const H = d.depth;
    if (type === 'rect') {
      A = Qd / d.sor;
      calc.step('Required surface area', 'A = \\frac{Q_t}{SOR}', `\\frac{${n(Qd, 0)}}{${n(d.sor)}}`, A, 'm²', 'LN: V_o = Q/A');
      W = Math.max(2, Math.round(Math.sqrt(A / d.LW) * 10) / 10);
      L = ceilTo(A / W, 0.5);
    } else {
      const Ac = Qh / d.tubeLoad;
      calc.step('Area covered by tube modules', 'A_c = \\frac{Q_t}{q_{tube}}', `\\frac{${n(Qh, 1)}}{${n(d.tubeLoad)}}`, Ac, 'm²');
      A = Ac / d.coverFrac;
      calc.step('Tank plan area (front ¼ free of modules)', 'A = A_c / f_c', `${n(Ac)}/${n(d.coverFrac)}`, A, 'm²', 'LN – front one-quarter free for inlet');
      W = Math.max(2, Math.round(Math.sqrt(A / 3) * 10) / 10);
      L = ceilTo(A / W, 0.5);
    }
    calc.step('Tank width', 'W = \\sqrt{A/(L{:}W)}', `\\sqrt{${n(A)}/${type === 'rect' ? n(d.LW) : 3}}`, W, 'm');
    calc.step('Tank length (rounded up)', 'L = A/W', `${n(A)}/${n(W)}`, L, 'm');
    const Aact = L * W;
    const sorAct = Qd / Aact;
    const V = Aact * H;
    const hrt = V / Qh;
    calc.step('Actual surface overflow rate', 'SOR = \\frac{Q_t}{L W}', `\\frac{${n(Qd, 0)}}{${n(L)}\\times${n(W)}}`, sorAct, 'm³/m²·d');
    calc.step('Detention time', '\\theta = \\frac{L W H}{Q_t}', `\\frac{${n(L)}\\times${n(W)}\\times${n(H)}}{${n(Qh, 1)}}`, hrt, 'h', 'LN: θ = V/Q, 2–5 h');
    const vh = Qs / (W * H);
    calc.step('Mean horizontal velocity', 'u = \\frac{Q_t}{W H}', `\\frac{${n(Qs, 4)}}{${n(W)}\\times${n(H)}}`, vh * 60, 'm/min', 'LN: u = Q/HW');
    const R = (W * H) / (W + 2 * H);
    const Re = (vh * R) / nu;
    const Fr = (vh * vh) / (G * R);
    calc.step('Hydraulic radius', 'R = \\frac{WH}{W+2H}', `\\frac{${n(W)}\\times${n(H)}}{${n(W)}+2\\times${n(H)}}`, R, 'm');
    calc.step('Reynolds number', 'Re = \\frac{u R}{\\nu}', `\\frac{${n(vh, 5)}\\times${n(R)}}{${n(nu, 7)}}`, Re, '');
    calc.step('Froude number', 'Fr = \\frac{u^2}{g R}', `\\frac{${n(vh, 5)}^2}{9.81\\times${n(R)}}`, Fr, '');
    const vsc = Math.sqrt((8 * d.campK * (d.sp - 1) * G * d.dp) / d.campF);
    calc.step('Scour velocity (Camp)', 'v_s = \\sqrt{\\frac{8k(s-1)g d}{f}}', `\\sqrt{\\frac{8\\times${n(d.campK)}(${n(d.sp)}-1)9.81\\times${n(d.dp)}}{${n(d.campF)}}}`, vsc * 60, 'm/min');
    calc.flag('Horizontal velocity below scour velocity', vh < vsc, `${(vh * 60).toFixed(2)} < ${(vsc * 60).toFixed(2)} m/min`, 'u < v_s');
    // outlet weirs & launders
    calc.section('Outlet weirs and launders');
    const weirReq = Qd / d.weirLoad;
    calc.step('Weir length required', 'L_w = \\frac{Q_t}{q_w}', `\\frac{${n(Qd, 0)}}{${n(d.weirLoad)}}`, weirReq, 'm');
    const Llaund = Math.max(2, Math.round(L * d.launderLenFrac * 2) / 2);
    let nL = Math.max(1, Math.ceil(weirReq / (2 * Llaund)));
    const maxL = Math.floor(W / 1.2);
    if (nL > maxL) nL = Math.max(1, maxL);
    const weirAct = nL * 2 * Llaund + W; // + end weir across width
    const weirLoadAct = Qd / weirAct;
    calc.step('Finger launders (double-sided) + end weir', 'L_w = 2 n_l L_l + W', `2\\times${nL}\\times${n(Llaund)} + ${n(W)}`, weirAct, 'm');
    calc.step('Actual weir loading', 'q_w = Q_t/L_w', `${n(Qd, 0)}/${n(weirAct)}`, weirLoadAct, 'm³/m·d');
    const nNotch = Math.floor(weirAct / d.notchSpacing);
    const qNotch = Qs / nNotch;
    const hNotch = (qNotch / 1.38) ** 0.4;
    calc.step('Head over 90° V-notches', 'h = \\left(\\frac{q}{1.38}\\right)^{0.4}', `\\left(\\frac{${n(qNotch, 6)}}{1.38}\\right)^{0.4}`, hNotch * 1000, 'mm');
    const qL = Qs / (nL + 0.5);
    const hc = Math.cbrt((qL * qL) / (G * d.launderWidth ** 2));
    const h0 = 1.73 * hc;
    calc.step('Launder upstream depth (free fall)', 'h_0 = \\sqrt{3}\\,\\left(\\frac{q^2}{g b^2}\\right)^{1/3}', `1.73\\left(\\frac{${n(qL, 4)}^2}{9.81\\times${n(d.launderWidth)}^2}\\right)^{1/3}`, h0, 'm');
    const launderDepth = h0 + 0.1 + 0.08;
    // inlet diffuser wall
    calc.section('Inlet diffuser wall');
    const portA = Qs / d.portV;
    const nPorts = Math.ceil(portA / (Math.PI * d.portDia * d.portDia / 4));
    const portHl = (d.portV / 0.65) ** 2 / (2 * G);
    calc.step('Number of ports', 'n_p = \\frac{Q_t}{v_p\\,a_p}', `\\frac{${n(Qs, 4)}}{${n(d.portV)}\\times${n(Math.PI * d.portDia * d.portDia / 4, 5)}}`, nPorts, '');
    calc.step('Head loss through ports', 'h = \\frac{1}{2g}\\left(\\frac{v_p}{C_d}\\right)^2', `\\frac{1}{19.62}\\left(\\frac{${n(d.portV)}}{0.65}\\right)^2`, portHl, 'm');
    calc.check('sed.portV', d.portV);
    // tube settler hydraulics
    if (type === 'tube') {
      calc.section('Tube settlers (Yao)');
      const th = rad(d.tubeAngle);
      const Ac = A * d.coverFrac;
      const v0 = Qs / (Ac * Math.sin(th));
      const ReT = (v0 * d.tubeD) / nu;
      const Lr = d.tubeL / d.tubeD - 0.058 * ReT;
      const vscT = (d.tubeS * v0) / (Math.sin(th) + Math.max(Lr, 1) * Math.cos(th));
      calc.step('Velocity in tubes', 'v_0 = \\frac{Q}{A_c \\sin\\theta}', `\\frac{${n(Qs, 4)}}{${n(Ac)}\\sin${d.tubeAngle}^\\circ}`, v0 * 3600, 'm/h');
      calc.step('Reynolds number in tubes', 'Re = \\frac{v_0 d}{\\nu}', `\\frac{${n(v0, 5)}\\times${n(d.tubeD)}}{${n(nu, 7)}}`, ReT, '');
      calc.step('Effective relative length', "L' = \\frac{l}{d} - 0.058 Re", `${n(d.tubeL / d.tubeD)} - 0.058\\times${n(ReT)}`, Lr, '');
      calc.step('Critical settling velocity (Yao)', 'v_{sc} = \\frac{S v_0}{\\sin\\theta + L\'\\cos\\theta}', `\\frac{${n(d.tubeS)}\\times${n(v0 * 3600)}}{\\sin${d.tubeAngle}^\\circ + ${n(Lr)}\\cos${d.tubeAngle}^\\circ}`, vscT * 3600, 'm/h');
      calc.check('tube.loading', d.tubeLoad);
      calc.check('tube.Re', ReT);
      Object.assign(out, { v0, ReT, vscT: vscT * 3600, Ac });
    }
    // checks
    if (type === 'rect' && !plain) calc.check('sed.sor', sorAct);
    calc.check('sed.hrt', hrt, null, type === 'tube' ? { crit: { min: 0.75, max: 2.5, hardMin: 0.5, hardMax: 4 }, range: '0.75 – 2.5' } : {});
    calc.check('sed.depth', H);
    if (type === 'rect') { calc.check('sed.LW', L / W); if (!plain) calc.check('sed.LD', L / H); }
    calc.check('sed.vh', vh * 60);
    calc.check('sed.weir', weirLoadAct);
    calc.check('sed.Re', Re);
    calc.check('sed.Fr', Fr);
    const totalDepth = H + d.sludgeDepth + 0.5;
    Object.assign(out, { A: Aact, W, L, H, sorAct, V, hrt, vh, R, Re, Fr, vsc, weirReq, Llaund, nL, weirAct, weirLoadAct, nNotch, hNotch, h0, launderDepth, nPorts, portHl, totalDepth,
      footprint: { L: L + 1.5, W: W }, headloss: portHl + hNotch + 0.1 });
  } else {
    // circular
    const A = Qd / d.sor;
    calc.step('Required surface area', 'A = Q_t/SOR', `${n(Qd, 0)}/${n(d.sor)}`, A, 'm²');
    const D = ceilTo(Math.sqrt((4 * A) / Math.PI), 0.5);
    calc.step('Diameter (rounded up to 0.5 m)', 'D = \\sqrt{4A/\\pi}', `\\sqrt{4\\times${n(A)}/\\pi}`, D, 'm');
    const H = d.depth;
    const Aact = (Math.PI * D * D) / 4;
    const sorAct = Qd / Aact;
    const V = Aact * H + (Aact * (D / 2) / 12) / 3; // + cone (1:12 floor)
    const hrt = V / Qh;
    calc.step('Volume (incl. 1:12 floor cone)', 'V = \\tfrac{\\pi D^2}{4}H + \\tfrac{1}{3}A\\tfrac{D}{24}', '', V, 'm³');
    calc.step('Detention time', '\\theta = V/Q_t', `${n(V, 0)}/${n(Qh, 1)}`, hrt, 'h');
    const weirAct = Math.PI * (D - 1.0);
    const weirLoadAct = Qd / weirAct;
    calc.step('Peripheral weir (inboard launder 0.5 m from wall)', 'L_w = \\pi(D-1)', `\\pi(${n(D)}-1)`, weirAct, 'm');
    calc.step('Weir loading', 'q_w = Q_t/L_w', `${n(Qd, 0)}/${n(weirAct)}`, weirLoadAct, 'm³/m·d');
    const centerWell = 0.18 * D;
    calc.step('Centre feed-well diameter (≈ 18 % D)', 'd_{cw} = 0.18D', `0.18\\times${n(D)}`, centerWell, 'm');
    const nNotch = Math.floor(weirAct / d.notchSpacing);
    const hNotch = ((Qs / nNotch) / 1.38) ** 0.4;
    calc.check('sed.sor', sorAct);
    calc.check('sed.hrt', hrt);
    calc.check('sed.depth', H);
    calc.check('sed.circD', D);
    calc.check('sed.weir', weirLoadAct);
    Object.assign(out, { A: Aact, D, H, sorAct, V, hrt, weirAct, weirLoadAct, centerWell, nNotch, hNotch, totalDepth: H + D / 24 + 0.5, footprint: { L: D + 1, W: D + 1 }, headloss: hNotch + 0.25, scraperKw: 1.5 });
  }

  // ---- removal efficiency & predicted settled turbidity
  calc.section('Settling performance (ideal basin, log-normal floc population)');
  const ovf = type === 'tube' ? out.vscT : (out.sorAct / 24);
  const vcEff = ovf * d.perfFactor;
  const rem = removal(vcEff, d.v50, d.sigmaG);
  calc.step('Effective critical velocity (non-ideal factor)', 'v_c = k_p\\,\\frac{Q}{A}', `${n(d.perfFactor)}\\times${n(ovf)}`, vcEff, 'm/h', 'LN: particles with v ≥ v_c fully removed');
  calc.step('Overall removal of floc', 'R = (1-F_c) + \\frac{1}{v_c}\\int_0^{F_c} v\\,dF', `(1-${n(rem.F, 3)}) + ${n(rem.partial, 3)}`, rem.R * 100, '%', 'LN: η = v/v_c for v < v_c');
  const settledPeak = Math.max(1.0, q.turbMax * (1 - rem.R));
  const settledAvg = Math.max(0.8, q.turbAvg * (1 - rem.R));
  calc.step('Predicted settled-water turbidity at design peak', 'T_s = T_0(1-R)', `${n(q.turbMax)}(1-${n(rem.R, 3)})`, settledPeak, 'NTU');
  if (settledPeak > 10) calc.note('warn', `Settled turbidity at the monsoon peak (${settledPeak.toFixed(1)} NTU) exceeds ~10 NTU – filter runs will be short; reduce SOR or improve flocculation.`);
  // curve for chart
  const curve = [];
  for (let i = 0; i <= 60; i++) {
    const v = 0.05 * 10 ** (i / 20); // 0.05 .. 50 m/h
    const F = phi(Math.log(v / d.v50) / Math.log(d.sigmaG));
    curve.push({ v, F, eta: Math.min(1, v / vcEff) });
  }
  // plain pre-sedimentation ahead of a conventional train (if any)
  if (proc.presed === 'yes' && !plain) {
    const Ap = dem.Qd / d.presedSor;
    const Wp = Math.round(Math.sqrt(Ap / 4) * 10) / 10;
    const Lp = ceilTo(Ap / Wp, 0.5);
    out.presed = { A: Ap, W: Wp, L: Lp, H: d.presedDepth, hrt: (Lp * Wp * d.presedDepth) / dem.Qh };
    calc.section('Plain pre-sedimentation');
    calc.step('Pre-sedimentation area', 'A = Q/SOR', `${n(dem.Qd, 0)}/${n(d.presedSor)}`, Ap, 'm²');
    calc.step('Detention', '\\theta = V/Q', '', out.presed.hrt, 'h');
  }
  return { ...out, rem, settledPeak, settledAvg, vcEff, curve, ...calc.result() };
}
