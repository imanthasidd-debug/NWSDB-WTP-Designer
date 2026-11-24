// Intake structure, coarse & fine screens, intake conduit, wet well and raw-water pumping
// NWSDB Design Manual D2 §5 (intakes & screens), §6 (pumping stations), §7 (rising main)
import { Calc, n } from '../core/calc.js';
import { INTAKE, ref, screenLoss } from '../core/d2.js';
import { SCREENS } from '../core/d3.js';
import { G, ceilTo, hwLoss, rad, selectDN, selectDNRange, vel } from '../core/util.js';
import { mainChecks, pumpSystem } from './pumps.js';

export const DEFAULTS = {
  type: 'riverWell', // riverWell | weir | tower | submerged | floating | canal | wells
  bedLevel: -1.5,
  LWL: 2.6,
  NWL: 3.6,
  HFL: 7.8,
  deckFreeboard: 1.0,
  portV: 0.15,
  portW: 1.2,
  portH: 1.0,
  portLevels: 2,
  // coarse screen (bar rack) – D2 §5.4: 75–100 mm openings, bars ≈ 25 mm
  cOpen: 75,
  cBar: 25,
  cAngle: 75,
  cVmax: 0.5,
  cClog: 50,
  // fine screen – D2 §5.4: about 6 mm (D3 §5.1.5.2: 5–20 mm), wedge-wire bars, two sets (one in service while the other is cleaned)
  fOpen: 6,
  fBar: 3,
  fAngle: 70,
  fVmax: 0.7,
  fClog: 50,
  sill: 1.0, // screen sill / bell-mouth above bed – D2 §5.3.1 ≥ 1 m
  // screen channel – NWSDB D3 Annex A: approach velocity 0.4 m/s, flow depth D = Q/(V·B)
  chanU: 0.4,
  chanW: 0, // m/s, m (0 = auto, ≥ 0.6 m for raking)
  // intake conduit (river intake → jack well) – D2 §5.3.1 velocity 0.6–0.9 m/s
  conduitL: 30,
  conduitC: 120,
  conduitDN: 0, // 0 = automatic (D2 §5.3.1 0.6–0.9 m/s)
  nConduits: 0, // number of parallel intake pipes; 0 = automatic (as many as needed for 1.5 D submergence at LWL)
  // wet well
  wellHrt: 5,
  wellEffDepth: 1.5,
  submergence: 1.2,
  // pumps (D2 §6) – 0 = automatic (D2 Table 6.2 efficiencies, §6.4.1 stand-by)
  nDuty: 2,
  nStandby: 0,
  mainLength: 850,
  hwC: 0,
  minorK: 12,
  etaP: 0,
  etaM: 0,
  dn: 0,
  wave: 1000,
  material: 'di',
  dnMode: 'econ',
  surgeProtect: 'auto',
  soilBearing: 100,
  pumpKind: 'submersible', // submersible (flooded) | vertical | horizontal (dry well)
  pumpCL: 0, // pump centre-line level (m MSL); 0 = auto
  npshr: 0, // m, manufacturer's NPSH required at duty (0 = indicative)
  // wells
  wellYield: 35,
  wellHours: 20,
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  if (d.pumpKind === 'dryWell') d.pumpKind = 'horizontal';
  const calc = new Calc(ctx.crit);
  const dem = ctx.res.demand;
  const q = ctx.res.quality;
  const site = ctx.inp.setup || {};
  const Qd = dem.Qd;
  const Q = dem.Qs; // m3/s
  const T = q.T;
  const out = { inputs: d, type: d.type, Q };
  const deck = d.HFL + d.deckFreeboard;

  if (d.type === 'wells') {
    calc.section('Production wells');
    const nW = Math.ceil(Qd / (d.wellYield * d.wellHours));
    calc.step(
      'Number of duty wells',
      'n = \\frac{Q}{q_w h}',
      `\\frac{${n(Qd, 0)}}{${n(d.wellYield)}\\times${n(d.wellHours)}}`,
      nW,
      '',
    );
    calc.note(
      'info',
      'D2 §6.2.6: pump capacity must not exceed the yield of a groundwater source – confirm well yields by pumping tests (Manual D4).',
    );
    Object.assign(out, { nWells: nW + 1, kw: 0 });
  } else {
    // ---- intake type (D2 §5.2, §5.3)
    const range = d.HFL - d.LWL;
    calc.section('Intake type and location (D2 §5.2–5.3)');
    calc.step(
      'River / reservoir level range',
      '\\Delta h = HFL - LWL',
      `${n(d.HFL)} - ${n(d.LWL)}`,
      range,
      'm',
      ref('5.3.1'),
    );
    if (range < INTAKE.suctionPumpMaxVariation)
      calc.note(
        'info',
        `Level range ${range.toFixed(1)} m is below 3.5–4.0 m – a suction pump on the bank is feasible (D2 §5.3.1); keep suction lift within NPSH limits.`,
      );
    else
      calc.note(
        'info',
        `Level range ${range.toFixed(1)} m exceeds 3.5–4.0 m – use a jack well with submersible / vertical-turbine pumps, a multi-level tower or a floating pontoon intake (D2 §5.2–5.3).`,
      );
    if (d.type === 'weir')
      calc.note(
        'info',
        'Weir intake (D2 §5.3.2): provide a flow-measuring device on the weir, scour pipes for upstream silt, scour-proof foundations and cut-off, fish pass and downstream-release sluice where required.',
      );
    if (d.type === 'canal')
      calc.note(
        'warn',
        'Side-weir intake on an irrigation canal is not usually recommended – supply depends on irrigation releases (D2 §5.2).',
      );
    if (d.type === 'tower')
      calc.note(
        'info',
        'Reservoir / tank intake (D2 §5.3.3): draw from the deepest point, avoid stagnant or debris-collecting areas, and provide multi-level draw-off to follow the best water quality (algae).',
      );
    if (d.type === 'floating')
      calc.note(
        'info',
        'Floating pontoon intake suits large level variations (D2 §5.2) – provide flexible pipework, anchorage and access for maintenance.',
      );

    // ---- intake ports
    calc.section('Intake ports');
    const portA = Q / d.portV;
    const nPorts = Math.ceil(portA / (d.portW * d.portH));
    calc.step(
      'Required port area',
      'A_p = Q/v_p',
      `${n(Q, 4)}/${n(d.portV)}`,
      portA,
      'm²',
      ref('5.3.1') + ' – entrance velocity < 0.15 m/s',
    );
    calc.step('Ports per level', 'n = A_p / (w h)', `${n(portA)}/(${n(d.portW)}\\times${n(d.portH)})`, nPorts, '');
    calc.check('int.portV', d.portV);
    calc.check('int.bellmouth', d.sill, 'Intake opening (sill / bell-mouth) above bed');
    // ---- screens (D2 §5.4)
    const subDepth = d.LWL - (d.bedLevel + d.sill);
    calc.section('Coarse bar screen (D2 §5.4)');
    calc.step(
      'Submerged depth at LWL',
      'h = LWL - (z_{bed}+s)',
      `${n(d.LWL)} - (${n(d.bedLevel)}+${n(d.sill)})`,
      subDepth,
      'm',
    );
    if (subDepth < 0.5)
      calc.note(
        'fail',
        'Screen sill is too close to low water level – lower the sill or provide a weir to pond the river (D2 §5.2).',
      );
    // screen channel (NWSDB D3 Annex A): approach velocity U, width B, flow depth D = Q/(U·B) ≤ submerged depth
    calc.section('Screen channel (NWSDB D3 §5.1.5, Annex A)');
    const Ach = Q / d.chanU;
    let chW = d.chanW > 0 ? d.chanW : Math.max(0.6, ceilTo(Math.sqrt(Ach), 0.1));
    if (!(d.chanW > 0) && Ach / chW > Math.max(subDepth, 0.3)) chW = ceilTo(Ach / Math.max(subDepth, 0.3), 0.1);
    const chD = Ach / chW;
    calc.step(
      'Channel area at design approach velocity',
      'A = Q/U',
      `${n(Q, 4)}/${n(d.chanU)}`,
      Ach,
      'm²',
      'NWSDB D3 Annex A – U = 0.4 m/s',
    );
    calc.step('Screen channel width', 'B', d.chanW > 0 ? '\\text{user}' : '\\max(0.6,\\ \\sqrt{A})', chW, 'm');
    calc.step(
      'Flow depth in screen channel',
      'D = \\frac{Q}{U\\,B}',
      `\\frac{${n(Q, 4)}}{${n(d.chanU)}\\times${n(chW)}}`,
      chD,
      'm',
      'NWSDB D3 Annex A',
    );
    if (chD > subDepth + 1e-6 && subDepth >= 0.3)
      calc.note(
        'warn',
        'Screen channel flow depth exceeds the submerged depth at LWL – widen the channel or lower the channel invert.',
      );
    const screen = (open, bar, ang, vmax, clog, label) => {
      const b = open / 1000,
        t = bar / 1000;
      const h = chD;
      const W = chW;
      const vertH = Math.max(subDepth, h) / Math.sin(rad(ang));
      const vClear = Q / (h * W * (b / (b + t)));
      const vApp = Q / (h * W);
      const hClean = screenLoss(vClear, vApp);
      const vClog = vClear / (1 - clog / 100);
      const hClog = screenLoss(vClog, vApp);
      const nBars = Math.max(0, Math.ceil(W / (b + t)) - 1);
      const netA = h * W * (b / (b + t));
      calc.step(
        label + ' – net clear area',
        'A_n = D\\,B\\,\\frac{b}{b+t}',
        `${n(h)}\\times${n(W)}\\times\\frac{${n(b, 3)}}{${n(b + t, 3)}}`,
        netA,
        'm²',
        'NWSDB D3 Annex A',
      );
      calc.step(
        label + ' – velocity through openings',
        'V = Q/A_n',
        `${n(Q, 4)}/${n(netA)}`,
        vClear,
        'm/s',
        'NWSDB D3 §5.1.5; ' + ref('5.4') + ' – ≤ about 1 m/s',
      );
      calc.step(
        label + ' – head loss, clean',
        'h = 0.0729\\,(V^2 - U^2)',
        `0.0729\\,(${n(vClear)}^2-${n(vApp)}^2)`,
        hClean,
        'm',
        'NWSDB D3 §5.1.5.2; ' + ref('5.4'),
      );
      calc.step(
        label + ` – head loss, ${clog} % clogged`,
        "h' = 0.0729\\,(V'^2 - U^2)",
        `V' = ${n(vClog)}`,
        hClog,
        'm',
        'NWSDB D3 §5.1.5.1 – ≤ 150 mm; ' + ref('5.4'),
      );
      calc.step(label + ' – number of bars', 'n = B/(b+t) - 1', '', nBars, '');
      return { W, vClear, vApp, hClean, hClog, nBars, inclinedLen: vertH, netA, depth: h };
    };
    calc.section('Coarse bar screen (NWSDB D3 §5.1.5.1; D2 §5.4)');
    const cs = screen(d.cOpen, d.cBar, d.cAngle, d.cVmax, d.cClog, 'Coarse screen');
    calc.check('scr.coarseOpen', d.cOpen);
    calc.check('scr.coarseV', cs.vClear);
    calc.check('scr.headloss', cs.hClog, `Coarse screen head loss (${d.cClog} % clogged)`);
    calc.section('Fine screen (NWSDB D3 §5.1.5.2; D2 §5.4)');
    const fs = screen(d.fOpen, d.fBar, d.fAngle, d.fVmax, d.fClog, 'Fine screen');
    calc.check('scr.fineOpen', d.fOpen);
    calc.check('scr.fineV', fs.vClear);
    calc.check('scr.headloss', fs.hClog, `Fine screen head loss (${d.fClog} % clogged)`);
    const fAng = 90 - d.fAngle;
    calc.flag(
      'Fine-screen inclination to vertical',
      fAng >= SCREENS.fine.angle[0] - 1e-9 && fAng <= SCREENS.fine.angle[1] + 1e-9,
      `${fAng.toFixed(0)}°`,
      `${SCREENS.fine.angle[0]}–${SCREENS.fine.angle[1]}°`,
      '',
      'warn',
      'NWSDB D3 §5.1.5.2',
    );
    calc.text(
      'Two sets of removable fine screens are provided so that one can be cleaned while the other is in place (D2 §5.4; duplicate screens, D3 §5.1.5.2).',
    );
    // ---- conduit (D2 §5.3.1)
    calc.section('Intake pipe / conduit to jack well');
    // parallel pipes: automatic count = fewest pipes whose crown is submerged ≥ 1.5 D at LWL (D2 §5.3.1)
    const dnFor = (k) => (d.conduitDN > 0 ? d.conduitDN : selectDNRange(Q / k, INTAKE.pipeV[0], INTAKE.pipeV[1], 0.75));
    let nC = d.nConduits > 0 ? Math.round(d.nConduits) : 1;
    if (!(d.nConduits > 0)) {
      const avail = d.LWL - d.bedLevel - d.sill;
      while (nC < 6 && avail / (dnFor(nC) / 1000) - 1 < 1.5) nC++;
      if (avail / (dnFor(nC) / 1000) - 1 < 1.5) nC = 1;
    }
    const Qc = Q / nC;
    const cdn = dnFor(nC);
    const cv = vel(Qc, cdn / 1000);
    const chl = hwLoss(Qc, cdn / 1000, d.conduitL, d.conduitC) + (1.5 * cv * cv) / (2 * G);
    if (nC > 1)
      calc.step(
        'Parallel intake pipes',
        'n_c',
        d.nConduits > 0 ? '\\text{given}' : '\\text{auto: submergence} \\ge 1.5D',
        nC,
        'nos.',
        ref('5.3.1'),
      );
    calc.step(
      'Intake pipe diameter',
      'DN',
      `v=${n(cv)}\\,m/s`,
      cdn,
      'mm',
      ref('5.3.1') + ' – pipe velocity 0.6–0.9 m/s',
    );
    calc.step('Conduit head loss (friction + entry/exit)', 'h = h_f + 1.5\\frac{v^2}{2g}', '', chl, 'm');
    calc.check('pipe.gravV', cv, 'Velocity in intake pipe / conduit');
    const pipeTop = d.bedLevel + d.sill + cdn / 1000;
    const subPipe = d.LWL - pipeTop;
    calc.step(
      'Submergence of intake pipe at LWL',
      's = LWL - z_{crown}',
      `${n(d.LWL)} - ${n(pipeTop)}`,
      subPipe,
      'm',
      ref('5.3.1'),
    );
    calc.check('int.submergence', subPipe / (cdn / 1000), 'Intake-pipe submergence / diameter');
    calc.flag(
      'Intake pipe laid to a constant grade (no air pockets)',
      true,
      'by design',
      'constant rising / falling grade',
      '',
      'info',
      ref('5.3.1'),
    );
    // ---- wet well
    calc.section('Jack well / wet well');
    const Vw = Q * 60 * d.wellHrt;
    const Aw = Vw / d.wellEffDepth;
    const nP = d.nDuty + (d.nStandby > 0 ? d.nStandby : 1);
    const Apipe = (nC * Math.PI * (cdn / 1000) ** 2) / 4;
    const Dw = Math.max(
      ceilTo(Math.sqrt((4 * Aw) / Math.PI), 0.5),
      nP * 1.6 + 1.0,
      ceilTo(Math.sqrt((4 * 3 * Apipe) / Math.PI), 0.5),
    );
    const wellLWL = d.LWL - Math.max(cs.hClog, 0) - Math.max(fs.hClog, 0) - chl;
    // pump-suction submergence: at least 1.5 × bell-mouth / suction diameter (D2 §5.3.1); the default 1.2 m is raised automatically
    const sdn0 = selectDN(Q / d.nDuty, 1.2, 1.5);
    d.submergence = Math.max(d.submergence, Math.ceil((1.5 * sdn0) / 100) / 10);
    const floor = wellLWL - d.wellEffDepth - d.submergence;
    calc.step('Effective storage', 'V = Q\\,t', `${n(Q, 4)}\\times${n(d.wellHrt * 60, 0)}`, Vw, 'm³');
    calc.step(
      'Well diameter (≥ pump spacing, ≥ 3 × intake-pipe area)',
      'D = \\sqrt{4V/(\\pi h_e)}',
      `\\sqrt{4\\times${n(Vw)}/(\\pi\\times${n(d.wellEffDepth)})}`,
      Dw,
      'm',
    );
    const wellRatio = (Math.PI * Dw * Dw) / 4 / Apipe;
    calc.step(
      'Suction-well plan area / intake-pipe area',
      'A_w / A_p',
      '',
      wellRatio,
      '×',
      ref('5.3.1') + ' – 3 to 5 ×',
    );
    calc.check('int.wellArea', wellRatio);
    calc.step(
      'Lowest water level in well (river LWL − losses)',
      'LWL_w',
      `${n(d.LWL)} - ${n(cs.hClog + fs.hClog + chl)}`,
      wellLWL,
      'm MSL',
    );
    calc.step(
      'Sump floor level',
      'z_f = LWL_w - h_e - s',
      `${n(wellLWL)} - ${n(d.wellEffDepth)} - ${n(d.submergence)}`,
      floor,
      'm MSL',
    );
    calc.check('well.hrt', d.wellHrt);
    const cycle = (4 * Vw) / (Q / d.nDuty) / 60;
    calc.step(
      'Minimum pump cycle time (fixed-speed pump)',
      't_c = 4V/q_p',
      `4\\times${n(Vw)}/${n(Q / d.nDuty, 4)}`,
      cycle,
      'min',
      ref('6.2.6') + ' – ≤ 6 starts per hour',
    );
    calc.flag(
      'Motor starts ≤ 6 per hour (cycle ≥ 10 min)',
      cycle >= 10,
      `${(60 / cycle).toFixed(1)} starts/h`,
      '≤ 6 /h',
      'increase wet-well volume or use variable-speed drives',
      'warn',
      ref('6.2.6'),
    );
    // ---- pumps
    calc.section('Raw-water pumps & rising main (D2 §6, §7)');
    const inletWL = ctx.res.hyd?.inletWL ?? num(site.siteGL, 20) + 5;
    const deliver = inletWL + 0.3;
    const Hs = deliver - (wellLWL - d.wellEffDepth);
    calc.step(
      'Static head (inlet chamber − lowest pumping level)',
      'H_s',
      `${n(deliver)} - ${n(wellLWL - d.wellEffDepth)}`,
      Hs,
      'm',
    );
    const pumpCL = d.pumpCL || (d.pumpKind === 'horizontal' ? deck : floor + 0.5);
    const suctionHead = wellLWL - d.wellEffDepth - pumpCL;
    // suction / bell-mouth (D2 §6.2.2)
    const Qp1 = Q / d.nDuty;
    const sdn = selectDN(Qp1, 1.2, 1.5);
    const sv = vel(Qp1, sdn / 1000);
    const suctionLoss =
      d.pumpKind === 'horizontal'
        ? (0.1 * sv * sv) / (2 * G) +
          hwLoss(Qp1, sdn / 1000, Math.max(3, deck - floor + 2), 120) +
          (0.5 * sv * sv) / (2 * G)
        : (0.1 * sv * sv) / (2 * G) + 0.1;
    calc.step(
      'Pump suction / bell-mouth diameter',
      'DN_s',
      `v_s = ${n(sv)}\\,m/s`,
      sdn,
      'mm',
      ref('6.2.2') + ' – suction velocity ≤ 1.5 m/s',
    );
    calc.check('pump.suctionV', sv);
    calc.check('int.submergence', d.submergence / (sdn / 1000), 'Pump-suction submergence / bell-mouth diameter');
    const site_ = { elev: num(site.siteElevation, 10) };
    const pumps = pumpSystem(
      {
        Q,
        nDuty: d.nDuty,
        nStandby: d.nStandby,
        Hs,
        L: d.mainLength,
        C: d.hwC,
        K: d.minorK,
        dn: d.dn,
        dnMode: d.dnMode,
        material: d.material,
        surgeProtect: d.surgeProtect,
        soilBearing: d.soilBearing,
        vTarget: 1.2,
        vMax: 1.6,
        etaP: d.etaP,
        etaM: d.etaM,
        pumpKind: d.pumpKind,
        hours: dem.inputs.opHours,
        wave: d.wave,
        T,
        elev: site_.elev,
        suctionHead,
        suctionLoss,
      },
      calc,
      'RW: ',
      ctx,
    );
    mainChecks(calc, pumps, 'pipe.rawV', 'Velocity in raw-water rising main');
    const npshr = d.npshr > 0 ? d.npshr : 3 + 0.0006 * pumps.Qp * 3600; // indicative NPSHr at duty
    calc.step(
      'NPSH required at duty',
      'NPSH_r',
      d.npshr > 0 ? '\\text{manufacturer}' : '\\text{indicative}',
      npshr,
      'm',
    );
    calc.check('pump.npshMargin', pumps.npsha - npshr, 'NPSH margin under storm conditions (NPSHa − NPSHr)');
    calc.text(
      'Provide a low-level cut-out on the pump side of the screens, valves on suction and delivery, lifting gear for items > 45 kg and an engine-driven generator for essential pumping (D2 §6.2.2, §6.4).',
    );
    Object.assign(out, {
      deck,
      range,
      portA,
      nPorts,
      subDepth,
      cs,
      fs,
      screenW: chW,
      screenD: chD,
      cdn,
      nConduits: nC,
      cv,
      chl,
      subPipe,
      Vw,
      Dw,
      wellRatio,
      wellLWL,
      floor,
      inletWL,
      deliver,
      Hs,
      pumps,
      pumpCL,
      npshr,
      sdn,
      sv,
      kw: pumps.motor * d.nDuty,
      kWhD: pumps.kWhD,
      footprint: { L: Dw + 6, W: Dw + 4 },
    });
  }
  return { ...out, ...calc.result() };
}
function num(v, d) {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : d;
}
