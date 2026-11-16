// Structural pre-design of the water-retaining structures: wall and base thickness, main reinforcement, concrete and
// steel quantities, and flotation of the empty tanks.  The NWSDB manuals give only general rules (D2 §6.3 flotation
// FoS 1.5 and material grades; D3 §9.2.9 flotation of empty basins, §5.12.7 covered tanks), so the sizing follows the
// usual limit-state practice for water-retaining concrete (BS 8110 / BS 8007: 0.2 mm crack width, limiting steel
// stress, minimum steel).  It is a preliminary estimate for quantities and drawings – not a structural design.
import { Calc, n } from '../core/calc.js';
import { STRUCT } from '../core/d2.js';
import { ceilTo } from '../core/util.js';

export const DEFAULTS = {
  fcu: 35,             // N/mm² characteristic cube strength (grade 35A water-retaining concrete; D2 1989 minimum 25)
  fy: 460,             // N/mm² high-yield deformed bars (D2 1989: 410)
  cover: 40,           // mm
  fsAllow: 130,        // N/mm² service steel stress for 0.2 mm crack width, deformed bars (BS 8007 deemed-to-satisfy)
  minSteelPct: 0.35,   // % of the surface zone, each face, each direction (BS 8007 cl. 2.6.2.3, grade 460)
  gammaF: 1.4,         // load factor on water pressure (BS 8110)
  minWall: 0.25,       // m
  lapPct: 15,          // % allowance for laps, starters and chairs
  gammaConc: 24,       // kN/m³
};
const BARS = [10, 12, 16, 20, 25, 32];
const SPACING = [250, 200, 175, 150, 125, 100];
/** lightest bar arrangement giving at least As (mm²/m) */
export function pickBars(As) {
  let best = null;
  for (const dia of BARS) for (const s of SPACING) { const a = (Math.PI * dia * dia / 4) * (1000 / s); if (a >= As && (!best || a < best.a)) best = { dia, s, a }; }
  return best;
}

/** one wall: h = retained height (m); propped = true when a roof slab props the top */
export function wallDesign(h, d, propped = false) {
  const g = 9.81;
  const Ms = propped ? (g * h ** 3) / 15 : (g * h ** 3) / 6; // kNm/m at the base (triangular water load)
  const Mu = d.gammaF * Ms;
  const AsFor = (t) => {
    const de = t * 1000 - d.cover - 10; // effective depth, mm
    const K = (Mu * 1e6) / (1000 * de * de * d.fcu);
    if (K > 0.156) return null;
    const z = Math.min(0.95, 0.5 + Math.sqrt(0.25 - K / 0.9)) * de;
    const AsU = (Mu * 1e6) / (0.87 * d.fy * z);
    const AsS = (Ms * 1e6) / (d.fsAllow * 0.87 * de);
    const zone = Math.min(250, (t * 1000) / 2);
    const AsMin = (d.minSteelPct / 100) * zone * 1000;
    return { de, K, AsU, AsS, AsMin, As: Math.max(AsU, AsS, AsMin) };
  };
  let t = Math.max(d.minWall, ceilTo(h / (propped ? 14 : 12), 0.05));
  let a = AsFor(t), bars = a && pickBars(a.As);
  while ((!a || !bars) && t < 1.2) { t = +(t + 0.05).toFixed(2); a = AsFor(t); bars = a && pickBars(a.As); }
  if (!a) a = { de: t * 1000 - 50, K: 0, AsU: 0, AsS: 0, AsMin: 0, As: 0 };
  const minBars = pickBars(a.AsMin) || { dia: 12, s: 200, a: 565 };
  // steel per m² of wall: vertical water face + vertical outer face (minimum) + horizontal both faces (minimum)
  const mm2 = (bars?.a || a.As) + minBars.a + 2 * minBars.a;
  const kgM2 = mm2 * 7850e-6 * (1 + d.lapPct / 100);
  return { h, propped, Ms, Mu, t, ...a, bars, minBars, kgM2, kgM3: kgM2 / t };
}

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const hyd = r.hyd, GL = hyd?.GL ?? 20;
  const gwl = GL - (ctx.inp.storage?.gwlDepth ?? 3);
  const U = (key) => hyd?.units.find((u) => u.key === key);
  const list = [];
  const add = (key, name, hydKey, o) => { if (o && o.h > 0) list.push({ key, name, hydKey, n: 1, roof: false, circ: false, ...o }); };
  const fl = r.floc, sd = r.sed, fi = r.filt, dis = r.dis, st = r.storage, th = r.sludge?.thick;
  if (fl?.enabled) add('floc', 'Flocculators', 'floc', { h: fl.H + 0.5, L: fl.L, W: fl.W, n: fl.nT });
  if (sd?.enabled) {
    if (sd.type === 'circ') add('sed', 'Circular clarifiers', 'sed', { h: sd.H + 0.5, D: sd.D, circ: true, n: sd.N });
    else add('sed', sd.type === 'daf' ? 'Flotation (DAF) tanks' : sd.type === 'hrf' ? 'Roughing filters' : 'Sedimentation tanks', 'sed', { h: (sd.H || 3) + (sd.inputs?.sludgeDepth && sd.type !== 'daf' && sd.type !== 'hrf' ? sd.inputs.sludgeDepth : 0) + 0.5, L: sd.L, W: sd.W, n: sd.N });
  }
  if (fi) add('filt', fi.type === 'ssf' ? 'Slow sand filters' : 'Rapid gravity filters', 'filt', { h: fi.boxDepth || 3, L: fi.Lb, W: fi.type === 'ssf' ? fi.B : fi.footprint?.boxW || fi.B, n: fi.N });
  if (dis?.footprint) add('ct', 'Chlorine contact tank', 'ct', { h: dis.depthTot || dis.inputs.depth + 0.5, L: dis.L, W: dis.W || dis.footprint.W });
  if (st) add('cwr', 'Clear water reservoir', 'cwr', { h: st.depth + (st.inputs.cwrFreeboard ?? 0.5), L: st.L, W: st.W, n: st.inputs.cwrCompartments, roof: true });
  if (th) add('thick', 'Sludge thickeners', null, { h: th.swd + (th.freeboard || 0.6), D: th.D, circ: true, n: th.n });

  calc.section('Basis of the structural pre-design');
  calc.text(`Reinforced concrete grade ${d.fcu} (fcu = ${d.fcu} N/mm²), high-yield deformed bars fy = ${d.fy} N/mm², cover ${d.cover} mm, design crack width 0.2 mm (service steel stress ≤ ${d.fsAllow} N/mm²), minimum steel ${d.minSteelPct} % of the surface zone in each face and direction, load factor ${d.gammaF} on water pressure. The NWSDB design manuals do not give structural design rules (D2 §6 lists material grades of 1989: concrete ${STRUCT.fcuWR} N/mm² for water-retaining work, steel ${STRUCT.fyHigh} N/mm²; D3 §9.2.9 requires provisions against flotation of empty basins) – the values here follow BS 8110 / BS 8007 practice and are for preliminary quantities only.`);
  let conc = 0, steel = 0;
  for (const s of list) {
    const w = wallDesign(s.h, d, s.roof);
    calc.section(`${s.name} – wall ${s.h.toFixed(2)} m high (${s.circ ? 'circular' : s.roof ? 'propped by the roof slab' : 'cantilever'})`);
    calc.step('Service moment at the base of the wall', s.roof ? 'M = \\frac{\\gamma_w H^3}{15}' : 'M = \\frac{\\gamma_w H^3}{6}', `\\frac{9.81\\times${n(s.h)}^3}{${s.roof ? 15 : 6}}`, w.Ms, 'kNm/m');
    calc.step('Wall thickness adopted', 't', `\\ge H/${s.roof ? 14 : 12},\\ K \\le 0.156`, w.t * 1000, 'mm', `K = M_u/(b d² f_cu) = ${w.K.toFixed(3)}`);
    calc.step('Steel for strength (ULS)', 'A_s = \\frac{M_u}{0.87 f_y z}', `M_u = ${n(w.Mu, 1)}`, w.AsU, 'mm²/m');
    calc.step('Steel for 0.2 mm crack width (limiting stress)', 'A_s = \\frac{M}{f_s\\,0.87d}', `\\frac{${n(w.Ms, 1)}\\times10^6}{${n(d.fsAllow)}\\times0.87\\times${n(w.de, 0)}}`, w.AsS, 'mm²/m', 'BS 8007 practice');
    calc.step('Minimum steel each face', 'A_{s,min}', `${n(d.minSteelPct)}\\%`, w.AsMin, 'mm²/m');
    if (w.bars) calc.step(`Vertical bars, water face: T${w.bars.dia} @ ${w.bars.s} mm`, 'A_{s,prov}', '', w.bars.a, 'mm²/m', `other faces / directions T${w.minBars.dia} @ ${w.minBars.s}`);
    let hoop = null;
    if (s.circ) { const T = 9.81 * s.h * (s.D / 2); const As = (T * 1000) / d.fsAllow; hoop = { T, As, bars: pickBars(As / 2) }; calc.step('Hoop tension at the base of the circular wall', 'T = \\gamma_w H r', `9.81\\times${n(s.h)}\\times${n(s.D / 2)}`, T, 'kN/m', `hoop steel ${As.toFixed(0)} mm²/m in two faces`); }
    const tb = Math.max(0.3, w.t);
    // quantities
    let wallLen, area;
    if (s.circ) { wallLen = Math.PI * (s.D + w.t) * s.n; area = (Math.PI * (s.D + 2 * w.t) ** 2 / 4) * s.n; }
    else { wallLen = (s.n + 1) * s.L + 2 * s.n * s.W; area = (s.L + 2 * w.t) * (s.n * s.W + (s.n + 1) * w.t); }
    const tr = s.roof ? 0.25 : 0;
    const vol = wallLen * s.h * w.t + area * tb + area * tr;
    const kg = wallLen * s.h * (w.kgM2 + (hoop ? hoop.As * 7850e-6 : 0)) + area * (tb + tr) * 95;
    conc += vol; steel += kg;
    // flotation of the empty structure
    const hu = s.hydKey ? U(s.hydKey) : null;
    let fos = null, uplift = 0;
    if (hu) {
      const under = hu.bottom - tb;
      const hw = Math.max(0, gwl - under);
      uplift = 9.81 * hw * area;
      fos = uplift > 0 ? (vol * d.gammaConc) / uplift : 99;
      calc.step('Flotation of the empty structure', 'FoS = \\frac{W_{conc}}{\\gamma_w h_w A}', `\\frac{${n(vol * d.gammaConc, 0)}}{9.81\\times${n(hw)}\\times${n(area, 0)}}`, Math.min(fos, 99), '', `groundwater ${gwl.toFixed(2)} m MSL, underside ${under.toFixed(2)} m MSL`);
      if (s.key !== 'cwr') calc.flag(`${s.name}: flotation when empty`, fos >= STRUCT.flotationFoS, fos >= 99 ? 'no uplift' : fos.toFixed(2), `≥ ${STRUCT.flotationFoS}`, 'Extend the base as a toe to mobilise soil weight, thicken the base, or fit pressure-relief valves in the floor', fos >= 1.1 ? 'warn' : 'fail', 'NWSDB D2 §6.3; D3 §9.2.9');
    }
    calc.flag(`${s.name}: wall thickness practical (≤ 600 mm)`, w.t <= 0.6 + 1e-9, `${(w.t * 1000).toFixed(0)} mm`, '≤ 600 mm', 'Add counterforts or tie the walls with a roof / walkway slab', 'warn', 'BS 8007 practice');
    Object.assign(s, { wall: w, tb, hoop, vol, kg, fos, uplift, area, wallLen });
  }
  calc.section('Quantities');
  calc.step('Structural concrete in the process structures', 'V_c', '', conc, 'm³');
  calc.step('Reinforcement', 'W_s', '', steel / 1000, 't');
  const kgM3 = conc > 0 ? steel / conc : 0;
  calc.step('Average reinforcement content', 'W_s/V_c', `${n(steel, 0)}/${n(conc, 0)}`, kgM3, 'kg/m³', `the cost estimate uses ${ctx.inp.cost?.steelPerM3 ?? 110} kg/m³`);
  calc.note('info', 'Preliminary sizing for quantities and general-arrangement drawings only. Foundations, joints, thermal and shrinkage cracking, seismic and construction-stage checks, and the final reinforcement are to be designed by a structural engineer to the NWSDB structural standards in force.');
  return { inputs: d, list, conc, steel, kgM3, gwl, GL, ...calc.result() };
}
