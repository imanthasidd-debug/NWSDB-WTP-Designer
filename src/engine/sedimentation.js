// Sedimentation: rectangular horizontal-flow, circular radial-flow, or tube-settler clarifiers (NWSDB D3 §5.7)
import { Calc, n } from '../core/calc.js';
import { DAF, ROUGHING, SED_RECT, SETTLERS, SOR_TABLE, hrfRate } from '../core/d3.js';
import { G, ceilTo, rad } from '../core/util.js';

export const DEFAULTS = {
  type: 'auto',
  nTanks: 0,            // 0 = one per train
  sor: 24,              // m3/m2/d – D3 Table 5-20: 1.0 m/h (alum floc design 1.0 m/h, p 5-63)
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
  presedSor: 12, presedDepth: 2.8,  // D3 Table 5-20 no pre-treatment 0.5 m/h; detention 4–6 h
  plainV50: 1.0, plainSigma: 3.0, // un-coagulated silt/clay population for plain sedimentation
  // dissolved air flotation (NWSDB D3 §5.7.8)
  dafRise: 8.8,         // m/h hydraulic loading on the separation zone incl. recycle (D3: 5–15, nominal ≤ 9)
  dafRecycle: 10,       // % recycle (D3: 5–15)
  dafPressure: 500,     // kPa saturator pressure (D3: 450–620)
  dafContactT: 90,      // s contact-zone detention (D3: 60–240)
  dafDepth: 2.5,        // m (D3: 2.5–3)
  dafFloat: 3,          // % float solids, mechanical skimming (D3: 3–6)
  // horizontal-flow roughing filters ahead of slow sand filters (NWSDB D3 §5.13)
  hrfRate: 0,           // m/h on the vertical cross-section; 0 = D3 Table 5-41 by suspended solids
  hrfHeight: 1.2,       // m media height (D3: 1–1.5)
  hrfMedia: 'normal',   // coarse | normal | fine (D3 Table 5-40)
  hrfRemoval: 90,       // % turbidity removal (D3 §5.13: ≥ 90 %)
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
  const type = plain ? (proc.presedKind === 'roughing' ? 'hrf' : 'rect') : d.type === 'auto' ? (proc.clarifier && proc.clarifier !== 'auto' ? proc.clarifier : 'rect') : d.type;
  const N = d.nTanks > 0 ? d.nTanks : Math.max(2, dem.nTrains);
  const Qd = dem.Qd / N;
  const Qs = Qd / 86400;
  const Qh = Qd / 24;
  const out = { inputs: d, type, plain, N, Qd, Qs, enabled: (proc.has.sed && proc.conv) || plain };
  if (plain && type !== 'hrf') calc.note('info', 'Plain (un-coagulated) sedimentation ahead of slow sand filters – sized at the pre-sedimentation overflow rate.');
  calc.section('Flow per tank');
  calc.step('Design flow per tank', 'Q_t = Q/N', `${n(dem.Qd, 0)}/${N}`, Qd, 'm³/d');

  // ---------------- horizontal-flow roughing filters (D3 §5.13) ----------------
  if (type === 'hrf') {
    calc.section('Horizontal-flow roughing filters (NWSDB D3 §5.13)');
    const ss = q.turbMax; // suspended solids ≈ turbidity (TSS/NTU ≈ 1, D3 §5.14)
    const band = hrfRate(ss);
    const rate = d.hrfRate > 0 ? d.hrfRate : (band[0] + band[1]) / 2;
    calc.step('Filtration rate on the vertical cross-section', 'v_f', d.hrfRate > 0 ? '\\text{user value}' : `SS_{max}\\approx${n(ss, 0)}\\,mg/L`, rate, 'm/h', 'NWSDB D3 Table 5-41 – 0.5 (> 300 mg/L), 0.75–1.0 (100–300), 1.0–1.5 (< 100)');
    const Ax = dem.Qh / rate;
    calc.step('Total vertical cross-section', 'A_x = Q/v_f', `${n(dem.Qh, 1)}/${n(rate)}`, Ax, 'm²');
    const Hm = d.hrfHeight;
    const Nh = d.nTanks > 0 ? d.nTanks : Math.max(ROUGHING.minUnits, Math.ceil(Ax / (Hm * ROUGHING.width[1])));
    const W = Math.max(1, Math.ceil((Ax / (Nh * Hm)) * 10) / 10);
    calc.step('Number of units (width ≤ 5 m each, minimum 2)', 'N = \\lceil A_x/(5H) \\rceil', `\\lceil ${n(Ax)}/(5\\times${n(Hm)}) \\rceil`, Nh, '', 'NWSDB D3 §5.13.3, §5.13.6');
    calc.step('Width of each unit', 'W = A_x/(N H)', `${n(Ax)}/(${Nh}\\times${n(Hm)})`, W, 'm');
    const comps = ss > 300 ? [4, 3, 2] : ss >= 100 ? [3, 2.5, 1.5] : [3, 2, 1];
    const MEDIA_MM = { coarse: ['24–16', '18–12', '12–8'], normal: ['18–12', '12–8', '8–4'], fine: ['12–8', '8–4', '4–2'] }[d.hrfMedia] || ['18–12', '12–8', '8–4'];
    const Lf = comps.reduce((a, b) => a + b, 0);
    const L = Lf + 2 * 0.8 + 2 * 0.2; // inlet & outlet chambers + two separation walls
    calc.step('Filter length (three compartments, coarse → fine)', 'L_f = \\sum l_i', comps.map((c) => n(c)).join('+'), Lf, 'm', `NWSDB D3 Table 5-41; media ${MEDIA_MM.join(' / ')} mm (Table 5-40)`);
    calc.step('Box length incl. inlet / outlet chambers', 'L = L_f + 2\\times0.8 + 0.4', '', L, 'm', 'NWSDB D3 §5.13.6 – box 9–12 m (filter length 5–7 m, §5.13.5)');
    const Vg = Nh * W * Hm * Lf;
    const hrt = (Vg * 0.35) / dem.Qh;
    calc.step('Gravel volume', 'V_g = N W H L_f', '', Vg, 'm³');
    calc.step('Detention in the voids (porosity 0.35)', 't = 0.35V_g/Q', '', hrt * 60, 'min');
    const vAct = dem.Qh / (Nh * W * Hm);
    const vOne = dem.Qh / (Math.max(1, Nh - 1) * W * Hm);
    calc.step('Rate with one unit out for cleaning', "v_f' = Q/((N-1) W H)", '', vOne, 'm/h');
    const qDrain = (ROUGHING.drainV[0] + ROUGHING.drainV[1]) / 2 * W * comps[0];
    calc.step('Drainage flow of one compartment (60–90 m/h for 1–2 min)', 'Q_d = v_d\\,W\\,l_1', `75\\times${n(W)}\\times${n(comps[0])}`, qDrain, 'm³/h', 'NWSDB D3 §5.13.5 – perforated drains at the inlet of each compartment');
    const settledPeak = Math.max(2, q.turbMax * (1 - d.hrfRemoval / 100));
    const settledAvg = Math.max(1, q.turbAvg * (1 - d.hrfRemoval / 100));
    calc.step('Roughing-filter effluent turbidity (design peak)', 'T_e = T_0(1-R)', `${n(q.turbMax)}(1-${n(d.hrfRemoval / 100)})`, settledPeak, 'NTU', 'NWSDB D3 §5.13 – removal ≥ 90 %');
    calc.check('rf.rate', vAct, 'Roughing-filter rate', { crit: { min: ROUGHING.rateH[0], max: ROUGHING.rateH[1], hardMax: 2 }, src: 'NWSDB D3 §5.13.5 – 0.3–1.5 m/h' });
    calc.check('rf.rate1', vOne, 'Rate with one unit out', { crit: { min: 0, max: ROUGHING.rateH[1], hardMax: 2.5 }, src: 'NWSDB D3 §5.13.3 – minimum two units' });
    calc.check('rf.height', Hm, 'Media height', { crit: { min: ROUGHING.height[0], max: ROUGHING.height[1], hardMax: 2 }, src: 'NWSDB D3 §5.13.6 – 1–1.5 m' });
    calc.check('rf.width', W, 'Unit width', { crit: { min: 1, max: ROUGHING.width[1], hardMax: 6 }, src: 'NWSDB D3 §5.13.6 – 2–5 m per unit' });
    calc.check('rf.length', Lf, 'Filter length', { crit: { min: ROUGHING.length[0], max: ROUGHING.box[1], hardMax: 14 }, src: 'NWSDB D3 §5.13.5–5.13.6 – 5–7 m (box 9–12 m)' });
    calc.flag('Raw turbidity within the range of roughing filters (10–150 NTU, short peaks to 500–1,000)', q.turbMax <= ROUGHING.hrfPeak[1], `${q.turbMax} NTU peak`, '≤ 150 NTU (peaks ≤ 1,000)', 'Add plain sedimentation ahead for higher turbidity', q.turbMax <= ROUGHING.inTurb[1] ? 'info' : 'warn', 'NWSDB D3 §5.13');
    calc.flag('Effluent suitable for slow sand filters', settledPeak <= ROUGHING.outTurb + 1e-9, `${settledPeak.toFixed(1)} NTU`, '≤ 10 NTU', 'Slow sand filter influent should preferably be < 10 NTU', 'warn', 'NWSDB D3 §5.13, §5.12.3');
    calc.flag('Number of roughing-filter units', Nh >= ROUGHING.minUnits, `${Nh}`, '≥ 2', '', 'fail', 'NWSDB D3 §5.13.3');
    calc.text('Water level is kept below the media surface; separation walls have 10–20 % evenly distributed openings; outlet weir 30–40 cm below the top of the media; head loss ≤ 20 cm; provide a gravel-washing area (NWSDB D3 §5.13.5–5.13.6).');
    const rem = { R: d.hrfRemoval / 100, F: 0, partial: 0 };
    Object.assign(out, { N: Nh, Qd: dem.Qd / Nh, Qs: dem.Qs / Nh, A: Nh * L * W, W, L, H: Hm, Lf, comps, media: MEDIA_MM, rate: vAct, rateOne: vOne, Vg, hrt, sorAct: dem.Qd / (Nh * L * W), qDrain,
      hNotch: 0.03, h0: 0.1, portHl: 0.02, nL: 0, Llaund: 0, launderDepth: 0.2, totalDepth: Hm + 0.4, footprint: { L: L + 1.5, W }, headloss: 0.2 });
    d.sludgeDepth = 0.1;
    return { ...out, rem, settledPeak, settledAvg, vcEff: 0, curve: [], ...calc.result() };
  }
  // ---------------- dissolved air flotation (D3 §5.7.8) ----------------
  if (type === 'daf') {
    calc.section('Dissolved air flotation (NWSDB D3 §5.7.8, Annex E.4)');
    const Rr = d.dafRecycle / 100;
    let Nd = d.nTanks > 0 ? d.nTanks : Math.max(DAF.minUnits, dem.nTrains);
    let Asep, Wd, Ls, Qt;
    const sizeIt = () => { Qt = dem.Qh / Nd; Asep = (Qt * (1 + Rr)) / d.dafRise; Wd = Math.round(Math.sqrt(Asep / 1.2) * 10) / 10; Ls = Math.ceil((Asep / Wd) * 10) / 10; };
    sizeIt();
    if (!(d.nTanks > 0)) while (Ls > DAF.Lmax && Nd < 40) { Nd += 1; sizeIt(); }
    calc.step('Flow per flotation unit', 'Q_t = Q/N', `${n(dem.Qh, 1)}/${Nd}`, Qt, 'm³/h');
    calc.step('Separation-zone area (incl. recycle)', 'A = \\frac{Q_t(1+R)}{v}', `\\frac{${n(Qt, 1)}(1+${n(Rr)})}{${n(d.dafRise)}}`, Asep, 'm²', 'NWSDB D3 §5.7.8 – 5–15 m³/m²·h (nominal ≤ 9, maximum 12)');
    calc.step('Unit width × separation length (L:W ≈ 1.2, L < 11 m)', 'W \\times L_s', `${n(Wd)}\\times${n(Ls)}`, Wd * Ls, 'm²');
    const Hd = d.dafDepth;
    const Vc = (Qt * (1 + Rr) * d.dafContactT) / 3600;
    const Lc = Math.max(0.6, Math.ceil((Vc / (Wd * Hd)) * 10) / 10);
    const cLoad = (Qt * (1 + Rr)) / (Wd * Lc);
    calc.step('Contact-zone length', 'L_c = \\frac{Q_t(1+R)\\,t_c}{W H}', `\\frac{${n(Qt, 1)}(1+${n(Rr)})${n(d.dafContactT)}/3600}{${n(Wd)}\\times${n(Hd)}}`, Lc, 'm', 'NWSDB D3 – contact time 60–240 s');
    calc.step('Contact-zone hydraulic loading', 'v_c = Q_t(1+R)/(W L_c)', '', cLoad, 'm/h', 'NWSDB D3 – 35–100 m/h');
    const L = Ls + Lc + 0.2;
    const hrtMin = ((Wd * (Ls + Lc) * Hd) / Qt) * 60;
    calc.step('Flotation tank detention', 't = W(L_s+L_c)H/Q_t', '', hrtMin, 'min', 'NWSDB D3 – 10–20 min');
    const riseAct = (Qt * (1 + Rr)) / (Wd * Ls);
    const Qr = Rr * dem.Qh;
    // air: Henry solubility of air ≈ 18.7 mg/L per atm at 28 °C (D3 Annex E.4 method), saturator efficiency 0.85
    const air = 18.7 * (d.dafPressure / 101.3) * 0.85 * Rr;
    calc.step('Recycle flow', 'Q_r = R\\,Q', `${n(Rr)}\\times${n(dem.Qh, 1)}`, Qr, 'm³/h');
    calc.step('Air released per m³ of water treated', 'a = s_a\\,\\frac{P}{101.3}\\,f\\,R', `18.7\\times\\frac{${n(d.dafPressure)}}{101.3}\\times0.85\\times${n(Rr)}`, air, 'g/m³', 'typically 6–10 g/m³; eductor saturator efficiency 80–85 % (D3 §5.7.8)');
    const pumpKw = ((d.dafPressure + 50) * (Qr / 3600)) / 0.7;
    calc.step('Recycle pump power', 'P = \\frac{\\Delta p\\,Q_r}{\\eta}', `\\frac{${n(d.dafPressure + 50)}\\times${n(Qr / 3600, 4)}}{0.7}`, pumpKw, 'kW');
    const satV = (Qr / 60) * 1.5; // 90 s retention
    calc.step('Saturator volume (≈ 90 s retention, 2 vessels)', 'V_s = 1.5\\,Q_r/60', '', satV, 'm³');
    calc.check('daf.rise', riseAct, 'Flotation hydraulic loading (incl. recycle)', { crit: { min: DAF.rise[0], max: DAF.riseNominal, hardMax: DAF.rise[1] }, src: 'NWSDB D3 §5.7.8 – 5–15 m/h, nominal ≤ 9 m/h' });
    calc.check('daf.hrt', hrtMin, 'Flotation detention time', { crit: { min: DAF.hrt[0], max: DAF.hrt[1], hardMin: 5, hardMax: 40 }, src: 'NWSDB D3 §5.7.8 – 10–20 min' });
    calc.check('daf.recycle', d.dafRecycle, 'Recycle rate', { crit: { min: DAF.recycle[0], max: DAF.recycle[1], hardMax: 25 }, src: 'NWSDB D3 §5.7.8 – 5–15 %' });
    calc.check('daf.pressure', d.dafPressure, 'Saturator pressure', { crit: { min: DAF.pressure[0], max: DAF.pressure[1], hardMin: 350, hardMax: 700 }, src: 'NWSDB D3 §5.7.8 – 450–620 kPa' });
    calc.check('daf.contact', d.dafContactT, 'Contact-zone time', { crit: { min: DAF.contactT[0], max: DAF.contactT[1] }, src: 'NWSDB D3 §5.7.8 – 60–240 s' });
    calc.check('daf.depth', Hd, 'Tank depth', { crit: { min: DAF.depth[0], max: DAF.depth[1], hardMin: 2, hardMax: 3.5 }, src: 'NWSDB D3 §5.7.8 – 2.5–3 m' });
    calc.flag('Separation length', Ls <= DAF.Lmax + 1e-9, `${Ls.toFixed(1)} m`, '< 11 m', 'Add units', 'warn', 'NWSDB D3 §5.7.8');
    calc.flag('Number of flotation units', Nd >= DAF.minUnits, `${Nd}`, '≥ 2', '', 'fail', 'NWSDB D3 §5.7.8');
    calc.flag('Raw-water turbidity suitable for flotation', q.turbMax <= DAF.turbMax, `${q.turbMax} NTU peak`, '≤ 100 NTU', 'DAF is not suited to turbidity > 100 NTU or dense solids – use sedimentation, or DAF for the algae season only', 'warn', 'NWSDB D3 §5.7.8 (p 5-84)');
    calc.text('DAF followed by separate granular filtration is preferred in Sri Lanka for algae-laden reservoirs; flocculation ahead of DAF 15–30 min; float removed by mechanical skimmers at 3–6 % solids (NWSDB D3 §5.7.8).');
    const rem = { R: 0.97, F: 0, partial: 0 };
    const settledPeak = Math.max(1.0, q.turbMax * 0.03), settledAvg = Math.max(0.5, q.turbAvg * 0.03);
    calc.step('Predicted floated-water turbidity (design peak)', 'T_s \\approx 0.03\\,T_0', '', settledPeak, 'NTU', 'D3 §5.7.8 – effluent typically < 0.5–1 NTU');
    Object.assign(out, { N: Nd, Qd: dem.Qd / Nd, Qs: dem.Qs / Nd, A: Wd * Ls, W: Wd, L, Ls, Lc, H: Hd, sorAct: riseAct * 24, riseAct, hrt: hrtMin / 60, hrtMin, cLoad, Qr, air, pumpKw, satV,
      hNotch: 0.03, h0: 0.15, portHl: 0.02, nL: 0, Llaund: 0, launderDepth: 0.3, totalDepth: Hd + 0.5, footprint: { L: L + 2, W: Wd }, headloss: 0.25, kw: 2 * Math.ceil(pumpKw) });
    d.sludgeDepth = 0;
    return { ...out, rem, settledPeak, settledAvg, vcEff: 0, curve: [], ...calc.result() };
  }
  if (type === 'rect' || type === 'tube') {
    let A, W, L;
    let H = d.depth;
    if (type === 'rect') {
      A = Qd / d.sor;
      calc.step('Required surface area', 'A = \\frac{Q_t}{SOR}', `\\frac{${n(Qd, 0)}}{${n(d.sor)}}`, A, 'm²', 'NWSDB D3 §5.7.1, Table 5-20; LN: V_o = Q/A');
      let LWr = d.LW;
      const dims = () => { W = Math.max(1.5, Math.round(Math.sqrt(A / LWr) * 10) / 10); L = ceilTo(A / W, 0.5); };
      dims();
      // short tanks of small plants: when the user has not changed depth / L:W, use a narrower (L:W ≤ 6) and shallower
      // (≥ 2.5 m, detention ≥ 2 h) tank so that L/D approaches the D3 range (10–25)
      if (d.depth === DEFAULTS.depth && d.LW === DEFAULTS.LW && !plain) {
        if (L / H < 10) { LWr = 5.6; dims(); }
        while (L / H < 10 && H > 2.5 + 1e-9 && ((H - 0.1) * 24) / d.sor >= 2) H = +(H - 0.1).toFixed(2);
        if (LWr !== d.LW || H !== d.depth) calc.text(`Small tank: L:W ${LWr} and side water depth ${H.toFixed(2)} m adopted automatically to bring length : depth towards the NWSDB D3 range (change the depth or L:W input to override).`);
      }
    } else {
      const Ac = Qh / d.tubeLoad;
      calc.step('Area covered by tube modules', 'A_c = \\frac{Q_t}{q_{tube}}', `\\frac{${n(Qh, 1)}}{${n(d.tubeLoad)}}`, Ac, 'm²');
      A = Ac / d.coverFrac;
      calc.step('Tank plan area (front ¼ free of modules)', 'A = A_c / f_c', `${n(Ac)}/${n(d.coverFrac)}`, A, 'm²', 'NWSDB D3 §5.7.7 – coverage < 0.75, stilling zone 25 %; LN');
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
      calc.flag('Tube inclination', d.tubeAngle >= SETTLERS.angleTube - 1e-9, `${d.tubeAngle}°`, '≥ 60° (tubes), ≥ 55° (plates)', 'Self-cleaning at 50–60°', 'warn', 'NWSDB D3 §5.7.7');
      calc.flag('Tube size / plate spacing', d.tubeD >= SETTLERS.spacing[0] - 1e-9, `${(d.tubeD * 1000).toFixed(0)} mm`, '≥ 40 mm (50 mm typical)', '', 'warn', 'NWSDB D3 §5.7.7');
      calc.flag('Fraction of basin covered by tubes', d.coverFrac <= SETTLERS.coverTube + 1e-9, `${(d.coverFrac * 100).toFixed(0)} %`, '≤ 75 % (plates ≤ 95 %)', '', 'warn', 'NWSDB D3 §5.7.7');
      calc.flag('Velocity in tubes vs D3 criteria list', v0 >= SETTLERS.velocity[0] - 1e-9 && v0 <= SETTLERS.velocity[1] + 1e-9, `${(v0 * 1000).toFixed(2)} mm/s`, '2.5–3.3 mm/s', 'Advisory – the D3 list is inconsistent with Re < 50', 'info', 'NWSDB D3 §5.7.7');
      Object.assign(out, { v0, ReT, vscT: vscT * 3600, Ac });
    }
    // checks
    if (type === 'rect' && !plain) {
      calc.check('sed.sor', sorAct);
      const tbl = SOR_TABLE.coag, mh = sorAct / 24;
      calc.flag('SOR vs Table 5-20 (with chemical coagulation)', mh <= tbl[0] + 1e-9, `${mh.toFixed(2)} m/h`, `normal ${tbl[0]} · easy ${tbl[1]} · very bad ${tbl[2]} m/h`, mh <= tbl[1] + 1e-9 ? 'Within the "easy" value – confirm floc settles well (jar / column test)' : 'Above the "easy" value – use coagulant aids (≤ 1.5 m/h) or tube settlers', mh <= tbl[1] + 1e-9 ? 'info' : 'warn', 'NWSDB D3 Table 5-20');
    }
    if (plain) {
      calc.check('sed.sor', sorAct, 'Surface overflow rate (plain sedimentation)', { crit: { min: 2.4, max: 12, hardMax: 24 }, src: 'NWSDB D3 Table 5-20 – no pre-treatment 0.5 m/h normal, 1.0 easy' });
      calc.check('sed.hrt', hrt, 'Detention time (pre-settling)', { crit: { min: SED_RECT.hrtPre[0], max: SED_RECT.hrtPre[1], hardMin: 2, hardMax: 8 }, src: 'NWSDB D3 §5.7.1 – 4–6 h pre-settling' });
    } else calc.check('sed.hrt', hrt, null, type === 'tube' ? { crit: { min: 0.75, max: 2.5, hardMin: 0.5, hardMax: 4 }, range: '0.75 – 2.5', src: 'NWSDB D3 §5.7.7 – tube settling ≈ 45 min (Annex E.2: > 45 min)' } : {});
    calc.check('sed.depth', H);
    if (type === 'rect') { calc.check('sed.LW', L / W); if (!plain) calc.check('sed.LD', L / H); }
    calc.check('sed.vh', vh * 60);
    calc.check('sed.weir', weirLoadAct);
    calc.check('sed.Re', Re);
    calc.check('sed.Fr', Fr);
    calc.flag('Number of sedimentation basins', N >= SED_RECT.minBasins, `${N}`, '≥ 2', '', 'fail', 'NWSDB D3 §5.7.1');
    if (!plain) calc.flag('Sludge removal', true, Aact > SED_RECT.scraperArea[1] ? 'mechanical scrapers' : 'manual / hopper', Aact > SED_RECT.scraperArea[1] ? 'scrapers when > 30–40 m²' : '≤ 30–40 m² manual', `Floor ≥ 5 % (≥ 2 % with scrapers); de-sludging pipes ≥ 200–300 mm, sludge-drain velocity > 1.4 m/s${Aact > SED_RECT.scraperArea[1] ? '; flight-and-chain ≤ 1 cm/s (≤ 6 m wide) or travelling bridge 3–4.5 cm/s' : '; manual cleaning needs 1.2–1.5 m extra depth'}`, 'info', 'NWSDB D3 §5.7.1');
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
  if (!plain) calc.flag('Settled water (filter influent) turbidity – average', settledAvg <= 5 + 1e-9, `${settledAvg.toFixed(1)} NTU`, '≤ 5 NTU (< 2 preferred)', 'RSF must have efficient pre-treatment; pretreated water ≤ about 4–5 NTU', 'warn', 'NWSDB D3 §5.9.1, §5.9.13.6');
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
