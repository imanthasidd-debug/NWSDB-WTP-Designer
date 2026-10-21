// Flocculation: tapered-G hydraulic baffled (around-the-end / over-and-under) or mechanical paddle flocculators
import { Calc, n } from '../core/calc.js';
import { G, MOTOR_KW, nextStd } from '../core/util.js';

export const DEFAULTS = {
  type: 'auto',
  stages: [{ G: 50, t: 10 }, { G: 35, t: 10 }, { G: 20, t: 10 }],
  depth: 0,            // water depth H (m); 0 = auto by type
  width: 0,            // basin width / pass length (m); 0 = auto (solved for target spacing)
  targetSpacing: 0.6,  // m, auto-width target for the highest-G stage
  f: 0.3,              // baffle friction coefficient (Schulz & Okun)
  baffleT: 0.075,      // baffle thickness (m)
  // paddle
  Cd: 1.8,
  kRel: 0.75,          // relative velocity factor (lecture)
  areaRatio: 15,       // target paddle area / cross-section (%)
  driveEff: 0.6,
  clearance: 0.3,
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp, stages: inp?.stages?.length ? inp.stages : DEFAULTS.stages };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const dem = ctx.res.demand;
  const { rho, mu } = ctx.water;
  const type = d.type === 'auto' ? (proc.floc && proc.floc !== 'auto' ? proc.floc : 'hbaffle') : d.type;
  const nT = dem.nTrains;
  const Q = dem.Qs / nT; // per train
  let H = d.depth > 0 ? d.depth : type === 'hbaffle' ? 1.5 : type === 'vbaffle' ? 3.0 : 3.5;
  const ttot = d.stages.reduce((a, s) => a + s.t, 0);
  const Vtot = Q * ttot * 60;
  // spacing of the highest-G stage for a trial width (baffled types)
  const minSpacing = (W) => Math.min(...d.stages.map((s) => {
    const t = s.t * 60; const L = (Q * t) / (W * H); const dim = type === 'hbaffle' ? H : W;
    const nb = Math.max(2, ((2 * mu * t) / (rho * (1.44 + d.f)) * ((dim * L * s.G) / Q) ** 2) ** (1 / 3));
    return L / nb - d.baffleT;
  }));
  // around-the-end channels for small flows: reduce depth (≥ 0.9 m) until the target spacing is achievable
  if (type === 'hbaffle' && !(d.depth > 0) && !(d.width > 0)) { while (H > 0.95 && minSpacing(1.5) < d.targetSpacing) H = +(H - 0.1).toFixed(2); }
  let W = d.width;
  if (!(W > 0)) {
    if (type === 'paddle') W = Math.max(2.5, Math.min(12, +((Q * d.stages[0].t * 60) / (H * H)).toFixed(1)));
    else {
      let lo = type === 'hbaffle' ? 1.5 : 0.6, hi = 40;
      for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (minSpacing(m) > d.targetSpacing) lo = m; else hi = m; }
      W = Math.max(0.6, Math.round(((lo + hi) / 2) * 10) / 10);
    }
  }
  calc.section('General');
  calc.step('Flow per flocculator (train)', 'Q_t = Q/N', `${n(dem.Qs, 4)}/${nT}`, Q, 'm³/s');
  calc.step('Total flocculation time', 't = \\sum t_i', d.stages.map((s) => n(s.t)).join('+'), ttot, 'min', 'LN: 20–60 min, typ. 30');
  calc.step('Total volume per train', 'V = Q_t\\,t', `${n(Q, 4)}\\times${n(ttot * 60, 0)}`, Vtot, 'm³');
  const stages = [];
  let Lsum = 0, hlTot = 0, Gt = 0, kwTot = 0;
  d.stages.forEach((s, i) => {
    const t = s.t * 60;
    const V = Q * t;
    const L = V / (W * H);
    Lsum += L;
    calc.section(`Stage ${i + 1}: target G = ${s.G} s⁻¹, t = ${s.t} min`);
    calc.step(`Stage ${i + 1} volume`, 'V_i = Q_t t_i', `${n(Q, 4)}\\times${n(t, 0)}`, V, 'm³');
    calc.step(`Stage ${i + 1} length (along basin)`, 'L_i = \\frac{V_i}{W H}', `\\frac{${n(V)}}{${n(W)}\\times${n(H)}}`, L, 'm');
    const st = { i: i + 1, Gt: s.G, t: s.t, V, L };
    if (type === 'hbaffle' || type === 'vbaffle') {
      const dim = type === 'hbaffle' ? H : W; // cross dimension perpendicular to spacing
      const nb = ((2 * mu * t) / (rho * (1.44 + d.f)) * ((dim * L * s.G) / Q) ** 2) ** (1 / 3);
      calc.step(`Number of baffles (Schulz & Okun, ${type === 'hbaffle' ? 'around-the-end' : 'over-and-under'})`, `n = \\left[\\frac{2\\mu t}{\\rho(1.44+f)}\\left(\\frac{${type === 'hbaffle' ? 'H' : 'W'} L G}{Q}\\right)^2\\right]^{1/3}`, `\\left[\\frac{2\\times${n(mu, 6)}\\times${n(t, 0)}}{${n(rho, 1)}(1.44+${n(d.f)})}\\left(\\frac{${n(dim)}\\times${n(L)}\\times${n(s.G)}}{${n(Q, 4)}}\\right)^2\\right]^{1/3}`, nb, '');
      const nInt = Math.max(2, Math.round(nb));
      const pitch = L / nInt;
      const sp = pitch - d.baffleT;
      const v = Q / (dim * sp);
      const hl = (nInt * (1.44 + d.f) * v * v) / (2 * G);
      const Ga = Math.sqrt((rho * G * hl) / (mu * t));
      calc.step('Adopted baffles / clear spacing', 's = \\frac{L}{n} - t_b', `\\frac{${n(L)}}{${nInt}} - ${n(d.baffleT)}`, sp, 'm');
      calc.step('Channel velocity', 'v = \\frac{Q}{' + (type === 'hbaffle' ? 'H' : 'W') + '\\,s}', `\\frac{${n(Q, 4)}}{${n(dim)}\\times${n(sp)}}`, v, 'm/s');
      calc.step('Head loss through stage', 'h_L = n(1.44+f)\\frac{v^2}{2g}', `${nInt}(1.44+${n(d.f)})\\frac{${n(v)}^2}{2\\times9.81}`, hl, 'm');
      calc.step('Actual velocity gradient', 'G = \\sqrt{\\frac{\\rho g h_L}{\\mu t}}', `\\sqrt{\\frac{${n(rho, 1)}\\times9.81\\times${n(hl)}}{${n(mu, 6)}\\times${n(t, 0)}}}`, Ga, 's⁻¹');
      const gap = 1.5 * sp;
      calc.step('End (turn) clearance', 'c = 1.5\\,s', `1.5\\times${n(sp)}`, gap, 'm');
      calc.check('fl.spacing', sp, `Stage ${i + 1} baffle spacing`);
      calc.check('fl.v', v, `Stage ${i + 1} channel velocity`);
      calc.check('fl.G', Ga, `Stage ${i + 1} actual G`);
      Object.assign(st, { nb, nInt, sp, v, hl, Ga, gap });
      hlTot += hl;
      Gt += Ga * t;
    } else {
      // paddle (horizontal shaft across width W)
      const P = s.G * s.G * mu * V;
      calc.step('Power input', 'P = G^2\\mu V', `${n(s.G)}^2\\times${n(mu, 6)}\\times${n(V)}`, P, 'W', 'LN');
      const R = (H - 2 * d.clearance) / 2;
      const r = 0.85 * R;
      const Across = H * L; // paddle sweeps in the plane perpendicular to the shaft? -> cross-section normal to flow is W*H
      const Ap = ((d.areaRatio / 100) * W * H);
      const vp = ((2 * P) / (d.Cd * rho * Ap)) ** (1 / 3);
      const nrps = vp / (2 * Math.PI * d.kRel * r);
      const tip = 2 * Math.PI * R * nrps;
      calc.step('Paddle area (target ratio of cross-section)', 'A_p = k_A\\,W H', `${n(d.areaRatio / 100)}\\times${n(W)}\\times${n(H)}`, Ap, 'm²');
      calc.step('Relative paddle velocity', 'v_p = \\left(\\frac{2P}{C_D \\rho A_p}\\right)^{1/3}', `\\left(\\frac{2\\times${n(P, 0)}}{${n(d.Cd)}\\times${n(rho, 0)}\\times${n(Ap)}}\\right)^{1/3}`, vp, 'm/s', 'LN: P = C_D A ρ v³/2');
      calc.step('Rotational speed', 'n = \\frac{v_p}{2\\pi k r}', `\\frac{${n(vp)}}{2\\pi\\times${n(d.kRel)}\\times${n(r)}}`, nrps * 60, 'rpm', 'LN: v_p = 2πkrn, k = 0.75');
      calc.step('Paddle tip speed', 'v_{tip} = 2\\pi R n', `2\\pi\\times${n(R)}\\times${n(nrps)}`, tip, 'm/s');
      const kw = nextStd((P / d.driveEff / 1000) * 1.2, MOTOR_KW);
      calc.check('fl.tip', tip, `Stage ${i + 1} tip speed`);
      calc.check('fl.paddleRatio', d.areaRatio);
      calc.check('fl.G', s.G, `Stage ${i + 1} G`);
      void Across;
      Object.assign(st, { P, R, r, Ap, vp, rpm: nrps * 60, tip, kw, Ga: s.G });
      kwTot += kw;
      hlTot += 0.03;
      Gt += s.G * t;
    }
    stages.push(st);
  });
  calc.section('Overall');
  calc.step('Overall Gt', 'Gt = \\sum G_i t_i', stages.map((s) => `${n(s.Ga, 0)}\\times${n(s.t * 60, 0)}`).join('+'), Gt, '', 'LN: 2×10⁴ – 10⁵');
  calc.step('Length of flocculator (per train)', 'L = \\sum L_i', '', Lsum, 'm');
  calc.step('Total head loss across flocculator', 'h_L = \\sum h_{L,i}', '', hlTot, 'm');
  calc.check('fl.t', ttot);
  calc.check('fl.Gt', Gt);
  if (type !== 'paddle') calc.check('fl.hl', hlTot);
  const tapered = stages.every((s, i) => i === 0 || s.Gt <= stages[i - 1].Gt);
  calc.flag('G tapered (decreasing) from inlet to outlet', tapered, tapered ? 'Yes' : 'No', 'Decreasing G', 'LN – tapered flocculation gives big, dense flocs');
  return {
    inputs: d, type, enabled: proc.has.floc, nT, Q, W, H, L: Lsum, stages, ttot, Vtot, Gt, headloss: hlTot,
    kw: kwTot * nT, freeboard: 0.5,
    ...calc.result(),
  };
}
