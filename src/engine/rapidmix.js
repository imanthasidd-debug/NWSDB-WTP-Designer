// Rapid (flash) mixing: mechanical back-mix tank or hydraulic jump in a rectangular channel
import { Calc, n } from '../core/calc.js';
import { G, MOTOR_KW, nextStd } from '../core/util.js';

export const IMPELLERS = {
  rushton: { label: 'Disc turbine, 6 flat blades (Rushton)', Np: 5.0 },
  flat: { label: 'Flat-blade turbine, 6 blades', Np: 3.0 },
  pbt: { label: 'Pitched-blade turbine 45°, 4 blades', Np: 1.27 },
  prop: { label: 'Marine propeller (3-blade)', Np: 0.32 },
};

export const DEFAULTS = {
  type: 'auto',          // auto | mechanical | jump
  G: 800,
  t: 30,
  nBasins: 1,
  hRatio: 1.1,           // depth / side
  impeller: 'rushton',
  dRatio: 0.35,          // impeller dia / tank side
  driveEff: 0.75,
  // hydraulic jump
  chanWidth: 0,          // 0 = auto
  y1: 0,                 // supercritical depth after weir/sluice (m); 0 = auto
  jumpLenFactor: 6.0,    // L = k y2
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const proc = ctx.res.process;
  const T = ctx.res.quality.T;
  const { rho, mu, nu } = ctx.water;
  const Q = ctx.res.demand.Qs;
  const type = d.type === 'auto' ? proc.rapidMix || 'jump' : d.type;
  const out = { inputs: d, type, enabled: proc.has.rapidmix };

  if (type === 'mechanical') {
    calc.section('Mechanical flash mixer');
    const Qb = Q / d.nBasins;
    const V = Qb * d.t;
    calc.step('Volume of each basin', 'V = Q\\,t', `${n(Qb, 4)} \\times ${n(d.t)}`, V, 'm³', 'LN: t = 30–60 s');
    const B = Math.cbrt(V / d.hRatio);
    const H = B * d.hRatio;
    calc.step('Square basin side', 'B = \\sqrt[3]{V/(H/B)}', `\\sqrt[3]{${n(V)}/${n(d.hRatio)}}`, B, 'm');
    calc.step('Liquid depth', 'H = (H/B)\\,B', `${n(d.hRatio)}\\times${n(B)}`, H, 'm');
    const P = d.G * d.G * mu * V;
    calc.step('Power imparted to water', 'P = G^2 \\mu V', `${n(d.G)}^2 \\times ${n(mu, 6)} \\times ${n(V)}`, P, 'W', 'LN: G = (P/μV)^½');
    const Pm = P / d.driveEff / 1000;
    const motor = nextStd(Pm * 1.15, MOTOR_KW);
    calc.step('Motor power (drive efficiency, 15 % margin)', 'P_m = \\frac{P}{\\eta}\\times1.15', `\\frac{${n(P, 0)}}{${n(d.driveEff)}}\\times1.15`, Pm * 1.15, 'kW');
    const imp = IMPELLERS[d.impeller] || IMPELLERS.rushton;
    const Di = d.dRatio * B;
    const nRps = Math.cbrt(P / (imp.Np * rho * Di ** 5));
    calc.step('Impeller diameter', 'D_i = k\\,B', `${n(d.dRatio)}\\times${n(B)}`, Di, 'm');
    calc.step('Rotational speed', 'n = \\left(\\frac{P}{N_p\\rho D_i^5}\\right)^{1/3}', `\\left(\\frac{${n(P, 0)}}{${n(imp.Np)}\\times${n(rho, 1)}\\times${n(Di)}^5}\\right)^{1/3}`, nRps * 60, 'rpm', 'LN: P = N_p n³ D⁵ ρ');
    const Re = (Di * Di * nRps * rho) / mu;
    calc.step('Impeller Reynolds number', 'Re = \\frac{D_i^2 n \\rho}{\\mu}', `\\frac{${n(Di)}^2\\times${n(nRps)}\\times${n(rho, 0)}}{${n(mu, 6)}}`, Re, '');
    const tip = Math.PI * Di * nRps;
    calc.step('Impeller tip speed', 'v_t = \\pi D_i n', `\\pi\\times${n(Di)}\\times${n(nRps)}`, tip, 'm/s');
    calc.check('rm.G', d.G);
    calc.check('rm.t', d.t);
    calc.check('rm.Re', Re);
    Object.assign(out, { V, B, H, P, Pm, motor, Di, rpm: nRps * 60, Re, tip, Gact: d.G, tAct: d.t, imp, nBasins: d.nBasins, headloss: 0.15, kw: motor * d.nBasins, freeboard: 0.5 });
  } else {
    calc.section('Hydraulic jump mixer (rectangular channel)');
    let y1 = d.y1 > 0 ? d.y1 : 0.12;
    let b = d.chanWidth > 0 ? d.chanWidth : Math.max(0.3, Math.round((Q / (y1 * 5.5)) * 20) / 20);
    if (!(d.y1 > 0) && Q / (b * y1) / Math.sqrt(G * y1) < 5) y1 = Math.max(0.03, Math.round(((Q / (b * 6 * Math.sqrt(G))) ** (2 / 3)) * 200) / 200);
    d.y1 = y1;
    void b;
    const v1 = Q / (b * d.y1);
    calc.step('Channel width', 'b', d.chanWidth > 0 ? '\\text{given}' : '\\text{auto, }v_1\\approx5.5\\,m/s', b, 'm');
    calc.step('Supercritical velocity', 'v_1 = \\frac{Q}{b\\,y_1}', `\\frac{${n(Q, 4)}}{${n(b)}\\times${n(d.y1)}}`, v1, 'm/s');
    const Fr1 = v1 / Math.sqrt(G * d.y1);
    calc.step('Froude number before jump', 'Fr_1 = \\frac{v_1}{\\sqrt{g y_1}}', `\\frac{${n(v1)}}{\\sqrt{9.81\\times${n(d.y1)}}}`, Fr1, '');
    const y2 = (d.y1 / 2) * (Math.sqrt(1 + 8 * Fr1 * Fr1) - 1);
    calc.step('Sequent (conjugate) depth', 'y_2 = \\frac{y_1}{2}\\left(\\sqrt{1+8Fr_1^2}-1\\right)', `\\frac{${n(d.y1)}}{2}\\left(\\sqrt{1+8\\times${n(Fr1)}^2}-1\\right)`, y2, 'm');
    const hL = (y2 - d.y1) ** 3 / (4 * d.y1 * y2);
    calc.step('Head loss in jump', 'h_L = \\frac{(y_2-y_1)^3}{4y_1y_2}', `\\frac{(${n(y2)}-${n(d.y1)})^3}{4\\times${n(d.y1)}\\times${n(y2)}}`, hL, 'm');
    const Lj = d.jumpLenFactor * y2;
    const v2 = Q / (b * y2);
    const t = Lj / ((v1 + v2) / 2);
    calc.step('Length of jump', 'L_j = 6\\,y_2', `${n(d.jumpLenFactor)}\\times${n(y2)}`, Lj, 'm');
    calc.step('Mixing time in jump', 't = \\frac{L_j}{(v_1+v_2)/2}', `\\frac{${n(Lj)}}{(${n(v1)}+${n(v2)})/2}`, t, 's');
    const Gj = Math.sqrt((G * hL) / (nu * t));
    calc.step('Velocity gradient', 'G = \\sqrt{\\frac{g\\,h_L}{\\nu\\,t}}', `\\sqrt{\\frac{9.81\\times${n(hL)}}{${n(nu, 7)}\\times${n(t)}}}`, Gj, 's⁻¹');
    // weir creating the jump: head over a sharp-crested weir upstream (approx.)
    const Hw = ((Q / (1.84 * b)) ** (2 / 3));
    calc.step('Head over the drop weir forming the jump', 'H_w = \\left(\\frac{Q}{1.84\\,b}\\right)^{2/3}', `\\left(\\frac{${n(Q, 4)}}{1.84\\times${n(b)}}\\right)^{2/3}`, Hw, 'm');
    const drop = Math.max(0.3, y2 + hL - Hw + 0.15);
    calc.check('rm.Fr', Fr1);
    calc.check('rm.G', Gj, 'Velocity gradient G (in-line jump)', { crit: { min: 700, max: 5000, hardMin: 300, hardMax: 8000 }, range: '700 – 5000' , note: 'LN: back-mix 700–1000 s⁻¹; in-line 3000–5000 s⁻¹ for 1–2 s' });
    calc.check('rm.t', t, 'Mixing time in jump', { crit: { min: 1, max: 10, hardMax: 60 }, range: '1 – 10 (in-line)' });
    if (Fr1 < 4.5) calc.note('warn', 'Fr₁ < 4.5 gives an oscillating/weak jump – reduce channel width or y₁.');
    Object.assign(out, { b, v1, Fr1, y2, hL, Lj, v2, tAct: t, Gact: Gj, Hw, drop, headloss: hL + 0.1 + Hw, kw: 0 });
  }
  return { ...out, ...calc.result() };
}
