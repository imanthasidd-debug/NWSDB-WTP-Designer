// Hydraulic profile: water levels through the plant, computed upstream from the clear-water reservoir.
// Inlet flow measurement by weir / flume to BS 3680 as recommended by NWSDB Design Manual D2 §4.6.
import { Calc, n } from '../core/calc.js';
import { WEIRS, ref, weirHead } from '../core/d2.js';
import { ceilTo } from '../core/util.js';
import { PARSHALL, parshallHa, parshallSubmergence } from '../core/d3.js';

export const DEFAULTS = {
  cwrAboveGL: 0.5,        // CWR top water level above ground
  dropToCWR: 0.3,         // free fall into CWR
  filterInletLoss: 0.15,  // inlet weir + free fall into filter
  filterOutletFall: 0.15, // effluent weir free fall
  weirAboveSand: 0.15,    // effluent control weir crest above sand surface
  settledChannelLoss: 0.1,
  flocToSedLoss: 0.05,
  rmToFlocLoss: 0.05,
  inletChamberLoss: 0.1,  // inlet stilling chamber loss (excl. measuring structure)
  measure: 'auto',        // auto | rectFull | rectContracted | vnotch90 | vnotch60 | broad | flume | parshall | none
  splitWeirs: true,       // equal distribution weirs to the parallel trains (D3 §9.5.1–9.5.2)
  splitWeirB: 0,          // m crest length per train (0 = auto, head ≈ 0.15 m)
  weirB: 0,               // m crest / throat width (0 = auto)
  weirP: 0.6,             // m crest height above approach-channel floor
  minFlowPct: 30,         // % of design flow for the lower measurement limit
  freeFall: 0.15,         // m free fall below crest (ventilated nappe)
  freeboard: 0.5,
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const proc = r.process;
  const GL = num(ctx.inp.setup?.siteGL, 20);
  const st = { ...(ctx.inp.storage || {}) };
  const cwrDepth = num(st.cwrDepth, 4.5);
  const units = [];
  calc.section('Water levels (computed upstream from the clear-water reservoir)');
  const cwrTWL = GL + d.cwrAboveGL;
  const cwrLWL = cwrTWL - cwrDepth;
  calc.step('CWR top water level', 'TWL_{CWR} = GL + h', `${n(GL)} + ${n(d.cwrAboveGL)}`, cwrTWL, 'm');
  units.unshift({ key: 'cwr', name: 'Clear water reservoir', wl: cwrTWL, bottom: cwrLWL - 0.3, top: cwrTWL + 0.5, len: 18, hl: 0 });
  let wl = cwrTWL + d.dropToCWR;
  const dis = r.dis;
  if (dis && dis.inputs.contactMode === 'tank') {
    calc.step('Contact tank water level', 'WL_{ct} = TWL_{CWR} + h_{fall}', `${n(cwrTWL)} + ${n(d.dropToCWR)}`, wl, 'm');
    units.unshift({ key: 'ct', name: 'Chlorine contact tank', wl, bottom: wl - dis.inputs.depth, top: wl + d.freeboard, len: 12, hl: dis.headloss });
    wl += dis.headloss;
  }
  const fi = r.filt;
  const ssf = fi?.type === 'ssf';
  let filterMax, sandTop, crest;
  if (ssf) {
    crest = wl + d.filterOutletFall;
    sandTop = crest - d.weirAboveSand;
    filterMax = sandTop + fi.inputs.ssfSupernatant;
    calc.step('Slow sand filter supernatant level', 'WL_f', `${n(sandTop)} + ${n(fi.inputs.ssfSupernatant)}`, filterMax, 'm');
    units.unshift({ key: 'filt', name: 'Slow sand filters', wl: filterMax, bottom: sandTop - fi.inputs.ssfDepth - 0.6, top: filterMax + 0.3, len: 20, hl: filterMax - wl, sandTop });
  } else {
    crest = wl + d.filterOutletFall + 0.1;
    sandTop = crest - d.weirAboveSand;
    filterMax = crest + fi.inputs.termHead;
    calc.step('Filter effluent weir crest', 'z_w = WL_{down} + h_{fall} + 0.1', `${n(wl)} + ${n(d.filterOutletFall)} + 0.1`, crest, 'm');
    calc.step('Top of filter media (crest − 0.15, prevents negative head)', 'z_{sand}', `${n(crest)} - ${n(d.weirAboveSand)}`, sandTop, 'm');
    calc.step('Maximum water level in filter (terminal head loss)', 'WL_{f,max} = z_w + H_t', `${n(crest)} + ${n(fi.inputs.termHead)}`, filterMax, 'm');
    const floor = sandTop - fi.Ltot - fi.gravelD - fi.inputs.underdrainDepth;
    units.unshift({ key: 'filt', name: 'Rapid gravity filters', wl: filterMax, bottom: floor, top: filterMax + fi.inputs.freeboard, len: 14, hl: filterMax - wl, sandTop, crest });
  }
  wl = filterMax + d.filterInletLoss + d.settledChannelLoss;
  calc.step('Settled-water channel level', 'WL_{sc} = WL_{f,max} + h_{in} + h_{ch}', `${n(filterMax)} + ${n(d.filterInletLoss)} + ${n(d.settledChannelLoss)}`, wl, 'm');
  const sed = r.sed;
  if (sed && sed.enabled) {
    const sedWL = wl + (sed.hNotch || 0.05) + (sed.h0 || 0.15) + 0.1;
    calc.step('Clarifier water level', 'WL_{sed} = WL_{sc} + h_{notch} + h_{launder} + 0.1', `${n(wl)} + ${n(sed.hNotch || 0.05, 3)} + ${n(sed.h0 || 0.15)} + 0.1`, sedWL, 'm');
    units.unshift({ key: 'sed', name: sed.type === 'circ' ? 'Circular clarifiers' : sed.type === 'daf' ? 'DAF units' : sed.type === 'hrf' ? 'Roughing filters' : 'Sedimentation tanks', wl: sedWL, bottom: sedWL - sed.H - sed.inputs.sludgeDepth, top: sedWL + d.freeboard, len: 30, hl: sedWL - wl });
    wl = sedWL + (sed.portHl || 0.02) + d.flocToSedLoss;
  }
  const fl = r.floc;
  if (fl && fl.enabled) {
    const flOut = wl;
    const flIn = flOut + fl.headloss;
    calc.step('Flocculator inlet level', 'WL_{fl,in} = WL_{fl,out} + h_{L,floc}', `${n(flOut)} + ${n(fl.headloss)}`, flIn, 'm');
    units.unshift({ key: 'floc', name: 'Flocculators', wl: flIn, wlOut: flOut, bottom: flOut - fl.H, top: flIn + d.freeboard, len: 18, hl: fl.headloss });
    wl = flIn + d.rmToFlocLoss;
  }
  const rm = r.rapidmix;
  if (rm && rm.enabled) {
    const rmIn = wl + rm.headloss;
    calc.step('Rapid-mix inlet level', 'WL_{rm} = WL + h_{L,rm}', `${n(wl)} + ${n(rm.headloss)}`, rmIn, 'm');
    units.unshift({ key: 'rm', name: rm.type === 'jump' ? 'Hydraulic-jump mixer' : 'Flash mixer', wl: rmIn, wlOut: wl, bottom: wl - (rm.H || rm.y2 + 0.5), top: rmIn + 0.4, len: 6, hl: rm.headloss });
    wl = rmIn;
  }
  const ae = r.aeration;
  if (proc.has.aeration && ae) {
    const top = wl + ae.totalH + 0.15;
    calc.step('Aerator top (inlet) level', 'WL_{aer} = WL + H_{aer} + 0.15', `${n(wl)} + ${n(ae.totalH)} + 0.15`, top, 'm');
    units.unshift({ key: 'aer', name: 'Aerator', wl: top, wlOut: wl, bottom: wl - 0.8, top: top + 0.3, len: 8, hl: top - wl });
    wl = top;
  }
  // ---- inlet flow measurement (D2 §4.6, BS 3680; g = 9.78 m/s²)
  const Qm = r.demand.Qs;
  let mtype = d.measure;
  if (mtype === 'auto') mtype = Qm < 0.05 ? 'vnotch90' : Qm > 2 ? 'flume' : 'rectFull';
  let meas = null, measLoss = 0;
  if (mtype === 'parshall') {
    calc.section('Inlet flow measurement – Parshall flume (NWSDB D3 Annex C.1)');
    const QmD = Qm * 86400, QminD = (QmD * d.minFlowPct) / 100;
    const pf = PARSHALL.find((p) => p.Qmax >= QmD && (d.weirB > 0 ? p.W >= d.weirB * 1000 - 1 : true)) || PARSHALL[PARSHALL.length - 1];
    const Wm = pf.W / 1000;
    const Ha = parshallHa(Qm, Wm), HaMin = parshallHa((Qm * d.minFlowPct) / 100, Wm);
    const sub = parshallSubmergence(Wm), Hb = sub * Ha;
    calc.step('Throat width selected from the capacity table', 'W', `Q = ${n(QmD, 0)}\,m^3/d`, pf.W, 'mm', `NWSDB D3 Annex C.1 Table A 3 – ${pf.Qmin.toLocaleString('en-US')}–${pf.Qmax.toLocaleString('en-US')} m³/d`);
    calc.step('Upstream head at design flow', 'H_a = \\left(\\frac{Q}{2.273\\,W}\\right)^{1/(1.4757\\,W^{0.026})}', `Q=${n(Qm, 3)},\\ W=${n(Wm)}`, Ha, 'm', 'NWSDB D3 Annex C.1 – free flow');
    calc.step(`Head at ${d.minFlowPct} % of design flow`, 'H_{a,min}', '', HaMin, 'm');
    calc.step('Maximum downstream head for free flow', 'H_b = s\\,H_a', `${n(sub)}\\times${n(Ha)}`, Hb, 'm', 'NWSDB D3 Annex C.1 Table A 4 – submergence limit');
    measLoss = Math.max(0.14, Ha - Hb + 0.05);
    calc.step('Head allowed across the flume', '\\max(0.14,\\ H_a - H_b + 0.05)', '', measLoss, 'm', 'NWSDB D3 Annex C.1 – minimum 140 mm at maximum flow');
    calc.flag('Flow within the flume range', QmD <= pf.Qmax && QminD >= pf.Qmin, `${QminD.toFixed(0)}–${QmD.toFixed(0)} m³/d`, `${pf.Qmin}–${pf.Qmax} m³/d`, 'Choose another throat width or a V-notch for very low flows', 'warn', 'NWSDB D3 Annex C.1 Table A 3');
    calc.text(`Flume dimensions (mm): A ${pf.A}, B ${pf.B}, C ${pf.C}, D ${pf.D}, E ${pf.E}, F ${pf.F}, G ${pf.G}. Gauge well at ⅔ A = ${Math.round((pf.A * 2) / 3)} mm upstream of the throat; the hydraulic jump below the throat is used for coagulant mixing (NWSDB D3 §5.5.3).`);
    meas = { type: 'parshall', label: 'Parshall flume', b: Wm, P: 0, hMax: Ha, hMin: HaMin, loss: measLoss, pf, Hb };
  } else if (mtype !== 'none' && WEIRS[mtype]) {
    calc.section(`Inlet flow measurement – ${WEIRS[mtype].label} (D2 §4.6)`);
    const vn = mtype.startsWith('vnotch');
    const b = vn ? 0 : d.weirB > 0 ? d.weirB : Math.max(0.3, ceilTo(Qm / (1.8 * 0.45 ** 1.5), 0.1));
    const hMax = weirHead(mtype, Qm, b, d.weirP);
    const hMin = weirHead(mtype, (Qm * d.minFlowPct) / 100, b, d.weirP);
    if (!vn) calc.step('Crest / throat width', 'b', d.weirB > 0 ? '\\text{user value}' : '\\text{auto, } h \\approx 0.45\\,m', b, 'm');
    const eqs = { rectFull: 'Q = \\tfrac{2}{3}\\sqrt{2g}\\,C_d\\,b\\,h_e^{3/2},\\ C_d = 0.602 + 0.083h/P', rectContracted: 'Q = \\tfrac{2}{3}\\sqrt{2g}\\,C_d\\,b\\,h^{3/2},\\ C_d = 0.616(1-0.1h/P)', vnotch90: 'Q = \\tfrac{8}{15}\\sqrt{2g}\\,C_d\\,h^{5/2}', vnotch60: 'Q \\approx 0.84\\,h^{5/2}', broad: 'Q = 1.705\\,b\\,H^{3/2}', flume: 'Q = 1.705\\,b\\,H^{3/2}' };
    calc.step('Head at design flow', eqs[mtype], `Q = ${n(Qm, 3)}\\,m^3/s`, hMax, 'm', ref('4.6.4–4.6.6') + ' (g = 9.78)');
    calc.step(`Head at ${d.minFlowPct} % of design flow`, 'h_{min}', '', hMin, 'm');
    const fall = mtype === 'flume' || mtype === 'broad' ? 0.25 * hMax : d.freeFall;
    measLoss = hMax + fall;
    calc.step('Head consumed by the measuring structure', mtype === 'flume' || mtype === 'broad' ? '\\Delta h \\approx 1.25H' : 'h + h_{fall}', `${n(hMax)} + ${n(fall)}`, measLoss, 'm');
    calc.flag('Free (ventilated) discharge – downstream level below crest', true, 'by level design', `fall ≥ ${fall.toFixed(2)} m`, '', 'info', ref('4.6.4'));
    calc.flag('Measurable head at minimum flow (≥ 0.05 m)', hMin >= 0.05, `${hMin.toFixed(3)} m`, '≥ 0.05 m', 'BS 3680 – use a V-notch or narrower crest for low flows');
    if (vn) {
      calc.flag('Notch apex ≥ 2.5 h above channel floor', d.weirP >= 2.5 * hMax, `P = ${d.weirP} m`, `≥ ${(2.5 * hMax).toFixed(2)} m`, '', 'warn', ref('4.6.4'));
      calc.text(`Approach channel width ≥ 5h = ${(5 * hMax).toFixed(2)} m; head measured in a stilling well 4–5 h (${(4 * hMax).toFixed(2)}–${(5 * hMax).toFixed(2)} m) upstream (D2 §4.6.4).`);
    } else calc.text(`Head measured in a gauge well 4–5 × h_max = ${(4 * hMax).toFixed(2)}–${(5 * hMax).toFixed(2)} m upstream of the crest; approach flow uniform for ≥ 10 b = ${(10 * b).toFixed(1)} m (D2 §4.6.4).`);
    calc.note('info', 'D2 §4.6.7: venturi and Dall-tube meters in existing plants are frequently out of service – weirs or flumes are recommended unless efficient O&M can be guaranteed.');
    meas = { type: mtype, label: WEIRS[mtype].label, b, P: d.weirP, hMax, hMin, loss: measLoss };
  }
  // ---- flow division between the parallel trains (D3 §9.5.1–9.5.2): identical free-falling weirs from a common channel
  let split = null, splitLoss = 0;
  const nTr = r.demand.nTrains;
  if (d.splitWeirs && nTr > 1) {
    calc.section('Flow division between the treatment trains (NWSDB D3 §9.5)');
    const qT = Qm / nTr;
    const B = d.splitWeirB > 0 ? d.splitWeirB : Math.max(0.1, ceilTo(qT / (1.84 * 0.15 ** 1.5), 0.05));
    const hW = (qT / (1.84 * B)) ** (2 / 3);
    calc.step('Flow per train', 'q = Q/N', `${n(Qm, 4)}/${nTr}`, qT, 'm³/s');
    calc.step('Distribution weir – crest length per train', 'B', d.splitWeirB > 0 ? '\\text{given}' : '\\text{auto, } h \\approx 0.15\\,m', B, 'm');
    calc.step('Head over each distribution weir', 'h = \\left(\\frac{q}{1.84\\,B}\\right)^{2/3}', `\\left(\\frac{${n(qT, 4)}}{1.84\\times${n(B)}}\\right)^{2/3}`, hW, 'm', 'NWSDB D3 Annex E – Q = 1.84 B h^{3/2}');
    splitLoss = hW + 0.1;
    // a 5 mm level error on one crest changes its share by 1.5 × 5 / h per cent
    const err = (1.5 * 0.005) / hW * 100;
    calc.step('Flow error for a 5 mm difference in crest level', '\\frac{\\Delta q}{q} = 1.5\\frac{\\Delta h}{h}', `1.5\\times\\frac{0.005}{${n(hW, 3)}}`, err, '%');
    calc.flag('Equal split – flow error for 5 mm crest tolerance', err <= 6, `${err.toFixed(1)} %`, '≤ 6 %', 'Shorten the crests to raise the head, and set them level to ± 2 mm', 'warn', 'NWSDB D3 §9.5.1–9.5.2 – over 70 % of plants have unequal flow split; balance hydraulically, not with throttled valves');
    calc.text('Identical weirs with free fall from a common, low-velocity distribution channel; provide stop-log grooves to isolate each train and an overflow between adjacent units (NWSDB D3 §9.5.1–9.5.2). Chemicals are applied at one point upstream where the whole flow passes (§9.5.3).');
    split = { n: nTr, B, h: hW, loss: splitLoss, err };
  }
  const inletLoss = d.inletChamberLoss + measLoss + splitLoss;
  const inletWL = wl + inletLoss;
  calc.step('Inlet chamber water level (incl. flow measurement)', 'WL_{in}', `${n(wl)} + ${n(d.inletChamberLoss)} + ${n(measLoss)}${splitLoss ? ` + ${n(splitLoss)}` : ''}`, inletWL, 'm');
  units.unshift({ key: 'inlet', name: 'Inlet chamber', wl: inletWL, wlOut: wl, bottom: inletWL - 2.5, top: inletWL + 0.5, len: 5, hl: inletLoss });
  const totalHead = inletWL - cwrTWL;
  calc.step('Total head consumed through the plant', '\\Delta H = WL_{in} - TWL_{CWR}', `${n(inletWL)} - ${n(cwrTWL)}`, totalHead, 'm');
  calc.flag('Inlet chamber within 10 m of ground level', inletWL - GL <= 10, `${(inletWL - GL).toFixed(2)} m above GL`, '≤ 10 m', 'High inlet levels need tall structures – consider stepping the site or lowering the CWR');
  // x stations for drawing
  let x = 0;
  for (const u of units) { u.x0 = x; u.x1 = x + u.len; x += u.len + 6; }
  return { inputs: d, GL, units, inletWL, cwrTWL, cwrLWL, totalHead, sandTop, crest, filterMax, meas, split, ...calc.result() };
}
function num(v, d) { const x = parseFloat(v); return Number.isFinite(x) ? x : d; }
