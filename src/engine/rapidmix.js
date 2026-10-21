// Rapid (flash) mixing: mechanical back-mix tank (NWSDB D3 §5.5.5, Annex C.2) or hydraulic jump (D3 §5.5.2–5.5.3)
import { Calc, n } from '../core/calc.js';
import { G, MOTOR_KW, nextStd } from '../core/util.js';
import { RAPID_MIX } from '../core/d3.js';

// power numbers – NWSDB D3 Table 5-13 (Qasim)
export const IMPELLERS = {
  rushton: { label: 'Disc turbine, 6 blades, w/d 0.25 (Rushton)', Np: 6.2 },
  flat: { label: 'Straight-blade turbine, 4 blades, w/d 0.20', Np: 3.3 },
  pbt: { label: '45° pitched-blade turbine, 4 blades, w/d 0.20', Np: 1.94 },
  prop: { label: 'Propeller, pitch 1:1', Np: 0.3 },
};

export const DEFAULTS = {
  type: 'auto',          // auto | mechanical | jump
  G: 800,
  t: 45,                 // s – D3 §5.5.5 30–60 s; Gt 30,000–60,000
  nBasins: 2,            // D3 §5.5.5 – minimum 2 tanks
  hRatio: 2.0,           // depth / side – D3: water depth / tank width = 2
  impeller: 'flat',
  dRatio: 0.5,           // impeller dia / tank side – D3: 50–80 %
  driveEff: 0.75,
  // hydraulic jump
  chanWidth: 0,          // 0 = auto
  y1: 0,                 // supercritical depth after weir/sluice (m); 0 = auto
  jumpLenFactor: 6.0,    // L = k y2
};

const n2 = (v) => (+v).toFixed(2);

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
    calc.step('Volume of each basin', 'V = Q\\,t', `${n(Qb, 4)} \\times ${n(d.t)}`, V, 'm³', 'NWSDB D3 §5.5.5 – t = 30–60 s');
    const B = Math.cbrt(V / d.hRatio);
    const H = B * d.hRatio;
    calc.step('Square basin side', 'B = \\sqrt[3]{V/(H/B)}', `\\sqrt[3]{${n(V)}/${n(d.hRatio)}}`, B, 'm');
    calc.step('Liquid depth', 'H = (H/B)\\,B', `${n(d.hRatio)}\\times${n(B)}`, H, 'm');
    const P = d.G * d.G * mu * V;
    calc.step('Power imparted to water', 'P = G^2 \\mu V', `${n(d.G)}^2 \\times ${n(mu, 6)} \\times ${n(V)}`, P, 'W', 'NWSDB D3 §5.5 – G = (P/μV)^½ (P in W)');
    const Pm = P / d.driveEff / 1000;
    const motor = nextStd(Pm * 1.15, MOTOR_KW);
    calc.step('Motor power (drive efficiency, 15 % margin)', 'P_m = \\frac{P}{\\eta}\\times1.15', `\\frac{${n(P, 0)}}{${n(d.driveEff)}}\\times1.15`, Pm * 1.15, 'kW');
    const imp = IMPELLERS[d.impeller] || IMPELLERS.rushton;
    const Di = d.dRatio * B;
    const nRps = Math.cbrt(P / (imp.Np * rho * Di ** 5));
    calc.step('Impeller diameter', 'D_i = k\\,B', `${n(d.dRatio)}\\times${n(B)}`, Di, 'm');
    calc.step('Rotational speed', 'n = \\left(\\frac{P}{N_p\\rho D_i^5}\\right)^{1/3}', `\\left(\\frac{${n(P, 0)}}{${n(imp.Np)}\\times${n(rho, 1)}\\times${n(Di)}^5}\\right)^{1/3}`, nRps * 60, 'rpm', 'NWSDB D3 §5.5.5 – P = k ρ n³ d⁵ (Table 5-13)');
    const Re = (Di * Di * nRps * rho) / mu;
    calc.step('Impeller Reynolds number', 'Re = \\frac{D_i^2 n \\rho}{\\mu}', `\\frac{${n(Di)}^2\\times${n(nRps)}\\times${n(rho, 0)}}{${n(mu, 6)}}`, Re, '');
    const tip = Math.PI * Di * nRps;
    calc.step('Impeller tip speed', 'v_t = \\pi D_i n', `\\pi\\times${n(Di)}\\times${n(nRps)}`, tip, 'm/s');
    const bw = 0.09 * B;
    calc.step('Baffle width (4 baffles, square tank)', 'w_b = 0.08\\text{–}0.10\\,B', `0.09\\times${n(B)}`, bw, 'm', 'NWSDB D3 §5.5.5');
    calc.step('Gt', 'G\\,t', `${n(d.G)}\\times${n(d.t)}`, d.G * d.t, '', 'NWSDB D3 §5.5.5 – 30,000–60,000');
    calc.check('rm.G', d.G);
    calc.check('rm.t', d.t, 'Rapid-mix detention time', { crit: { min: RAPID_MIX.t[0], max: RAPID_MIX.t[1], hardMin: 10, hardMax: 90 }, src: 'NWSDB D3 §5.5.5 – mechanical flash mixer 30–60 s' });
    calc.check('rm.Gt', d.G * d.t);
    calc.check('rm.Re', Re);
    calc.flag('Number of flash-mixing tanks', d.nBasins >= RAPID_MIX.minTanks, `${d.nBasins}`, `≥ ${RAPID_MIX.minTanks}`, '', 'warn', 'NWSDB D3 §5.5.5');
    calc.flag('Water depth / tank width', Math.abs(d.hRatio - RAPID_MIX.depthWidth) <= 0.5, n2(d.hRatio), '≈ 2', 'Square tanks; avoid round chambers or baffle them', 'info', 'NWSDB D3 §5.5.1, §5.5.5');
    calc.flag('Impeller diameter / tank width', d.dRatio >= RAPID_MIX.impeller[0] - 1e-9 && d.dRatio <= RAPID_MIX.impeller[1] + 1e-9, `${Math.round(d.dRatio * 100)} %`, '50–80 %', '', 'warn', 'NWSDB D3 §5.5.5');
    calc.text('Mixing devices shall be able to adjust the intensity – variable-speed drives (NWSDB D3 §5.5.5).');
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
    calc.check('rm.G', Gj, 'Velocity gradient G (in-line jump)', { crit: { min: 500, max: 3500, hardMin: 300, hardMax: 5000 }, range: '500 – 3500', note: 'In-line jumps run at higher G for 1–2 s (LN 3000–5000 s⁻¹)', src: 'NWSDB D3 §5.5 – 500–1,000 s⁻¹, up to 3,500 s⁻¹' });
    calc.check('rm.t', t, 'Mixing time in jump', { crit: { min: 1, max: 60, hardMax: 60 }, range: '1 – 60', src: 'NWSDB D3 §5.5 – detention in the mixer < 1 min; LN in-line 1–10 s' });
    if (Fr1 < 4.5) calc.note('warn', 'Fr₁ < 4.5 gives an oscillating/weak jump – reduce channel width or y₁.');
    calc.text('Coagulant is dosed across the full width just upstream of the jump so that it is dispersed instantly (hydrolysis 10⁻⁴–1 s, NWSDB D3 §5.4.4, §5.5.2–5.5.3). A Parshall flume (D3 Annex C.1) is an equivalent hydraulic-jump mixer that also meters the flow.');
    Object.assign(out, { b, v1, Fr1, y2, hL, Lj, v2, tAct: t, Gact: Gj, Hw, drop, headloss: hL + 0.1 + Hw, kw: 0 });
  }
  return { ...out, ...calc.result() };
}
