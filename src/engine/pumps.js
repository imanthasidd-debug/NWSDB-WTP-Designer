// Pumping-system helper used for raw-water and treated-water pumping stations and their mains.
// NWSDB Design Manual D2 §6 (pumps, NPSH, stand-by, surge) and §7 (pipe materials, classes, design C,
// velocities, economic size, valves & appurtenances).
import { n } from '../core/calc.js';
import {
  AIR_VALVE_SPACING,
  ISOLATING_VALVE_SPACING,
  MAIN_RULES,
  PIPE_MATERIALS,
  PIPE_V,
  PUMP,
  PUMP_TYPES,
  airValveSize,
  cDesign,
  cVelocity,
  eac,
  ref,
  selectClass,
  standbyFor,
  thrust,
  washoutSize,
} from '../core/d2.js';
import { pAtm, pVap, rho as rhoW } from '../core/water.js';
import { DN, G, MOTOR_KW, bisect, hwLoss, nextStd, selectDN, vel } from '../core/util.js';
import { DEFAULTS as COST_D } from './cost.js';
import { blendedRate, locationFactor, pipeCost, pumpSetCost } from '../core/ratebook.js';
import { DEFAULTS as ENERGY_D } from './energy.js';

/** D2 Table 6.2 efficiencies for a pump type (user values override when > 0) */
export function efficiencies(kind, etaP, etaM) {
  const t = PUMP_TYPES[kind] || PUMP_TYPES.horizontal;
  return { etaP: etaP > 0 ? etaP : t.etaP, etaM: etaM > 0 ? etaM : t.etaM, type: t };
}

/** annual-cost comparison of candidate diameters for a pumping main (D2 §7.3.2, Annex L) */
export function economicDN(o, ctx) {
  const ci = { ...COST_D, ...(ctx?.inp?.cost || {}) };
  const ei = { ...ENERGY_D, ...(ctx?.inp?.energy || {}) };
  const r = (ci.interest ?? 6) / 100;
  const nYr = ci.life ?? 30;
  const rows = [];
  for (const dn of DN) {
    const D = dn / 1000;
    const v = vel(o.Q, D);
    if (v > 3 || v < 0.3) continue;
    const C0 = o.C > 0 ? o.C : cVelocity(cDesign(o.material, dn), v);
    const hf = hwLoss(o.Q, D, o.L, C0) + (o.K * v * v) / (2 * G);
    const H = o.Hs + hf;
    const kW = (rhoW(o.T ?? 28) * G * o.Q * H) / (o.etaP * o.etaM) / 1000;
    // NWSDB Rates 2026: pipe supply & laying (Section A tables), pump sets (Graphs A-M/05–M/08), CEB tariff (Annex 8)
    const pipeCap =
      pipeCost(o.material, dn, {
        origin: ci.origin,
        pn: 16,
        factor: locationFactor(ctx?.inp?.setup?.district),
        markup: ci.markup ?? 27,
        ewsPct: ci.ewsPct ?? 25,
        dewPct: ci.dewPct ?? 25,
      }).total *
      (ci.rPipeFactor || 1) *
      o.L;
    const pumpCap =
      pumpSetCost((kW / o.nDuty) * 1.1, o.pumpKind === 'submersible' ? 'submersible' : 'horizontal', 0).value *
      (o.nDuty + o.nStandby);
    const eRate = ei.energyRate > 0 ? ei.energyRate : blendedRate(ei.tariff || 'I-3').rate;
    const energy = kW * (o.hours ?? 24) * 365 * eRate * (o.loadFactor ?? 0.85);
    const annual = eac(pipeCap, r, nYr) + eac(pumpCap, r, Math.min(nYr, 10) || 10) + energy;
    rows.push({ dn, v, hf, H, kW, pipeCap, pumpCap, energy, annual, okV: v >= PIPE_V.min && v <= PIPE_V.max });
  }
  const feasible = rows.filter((x) => x.okV);
  const best = (feasible.length ? feasible : rows).reduce(
    (a, b) => (b.annual < a.annual ? b : a),
    (feasible.length ? feasible : rows)[0],
  );
  return { rows, best };
}

/**
 * opts: { Q (m3/s total), nDuty, nStandby (0 = D2 auto), Hs (static, m), L (m), C (0 = D2 design C), K (minor-loss sum),
 *         dn (mm, 0 = auto), dnMode ('econ'|'velocity'), material, vTarget, vMax, etaP, etaM, pumpKind, hours, wave (m/s),
 *         T, elev, suctionHead (m, + flooded), suctionLoss, soilBearing (kPa) }
 */
export function pumpSystem(o, calc, prefix = '', ctx = null) {
  const T = o.T ?? 28;
  const rho = rhoW(T);
  const material = PIPE_MATERIALS[o.material] ? o.material : 'di';
  const eff = efficiencies(o.pumpKind, o.etaP, o.etaM);
  const etaP = eff.etaP,
    etaM = eff.etaM;
  const nStandbyD2 = standbyFor(o.nDuty);
  const nStandby = o.nStandby > 0 ? o.nStandby : nStandbyD2;
  const econ = economicDN({ ...o, material, etaP, etaM, nStandby }, ctx);
  const dnVel = selectDN(o.Q, o.vTarget ?? 1.2, o.vMax ?? PIPE_V.max, DN);
  const dn = o.dn > 0 ? o.dn : o.dnMode === 'velocity' || !econ.best ? dnVel : econ.best.dn;
  const D = dn / 1000;
  const v = vel(o.Q, D);
  const Cdes = cDesign(material, dn);
  const C = o.C > 0 ? o.C : cVelocity(Cdes, v);
  const hf = hwLoss(o.Q, D, o.L, C);
  const hm = (o.K * v * v) / (2 * G);
  const H = o.Hs + hf + hm;
  const Bresse = 1.2 * Math.sqrt(o.Q);
  const Qp = o.Q / o.nDuty;
  const Pw = rho * G * Qp * H; // W per pump hydraulic
  const Pshaft = Pw / etaP;
  const Pin = Pshaft / etaM;
  const motor = nextStd((Pshaft / 1000) * 1.1, MOTOR_KW);
  const kWhD = (Pin / 1000) * o.nDuty * (o.hours ?? 24);
  if (calc) {
    calc.step(
      prefix + 'Economic diameter (Bresse, first estimate)',
      'D = 1.2\\sqrt{Q}',
      `1.2\\sqrt{${n(o.Q, 4)}}`,
      Bresse * 1000,
      'mm',
    );
    if (econ.best && !(o.dn > 0) && o.dnMode !== 'velocity')
      calc.step(
        prefix + 'Least annual cost diameter (pipe + pumps + energy)',
        '\\min_D\\,[EAC(C_{pipe}) + EAC(C_{pump}) + C_{energy}]',
        `${econ.rows.length}\\ \\text{sizes evaluated}`,
        econ.best.dn,
        'mm',
        ref('7.3.2') + ' – pumping mains sized for the most economical combined cost',
      );
    calc.step(prefix + 'Selected main', 'DN', `v = ${n(v)}\\,m/s,\\ ${PIPE_MATERIALS[material].label}`, dn, 'mm');
    calc.step(
      prefix + 'Design Hazen–Williams C (D2 Fig 7.6, corrected for velocity)',
      'C',
      o.C > 0 ? '\\text{user value}' : `C_{1m/s}=${n(Cdes, 0)}`,
      C,
      '–',
      ref('7.3.1, Fig 7.6'),
    );
    calc.step(
      prefix + 'Friction loss (Hazen–Williams)',
      'h_f = \\frac{10.67 L Q^{1.852}}{C^{1.852}D^{4.87}}',
      `\\frac{10.67\\times${n(o.L, 0)}\\times${n(o.Q, 4)}^{1.852}}{${n(C)}^{1.852}\\times${n(D)}^{4.87}}`,
      hf,
      'm',
    );
    calc.step(
      prefix + 'Minor losses',
      'h_m = \\sum K\\frac{v^2}{2g}',
      `${n(o.K)}\\times\\frac{${n(v)}^2}{19.62}`,
      hm,
      'm',
    );
    calc.step(prefix + 'Total dynamic head', 'H = H_s + h_f + h_m', `${n(o.Hs)} + ${n(hf)} + ${n(hm)}`, H, 'm');
    calc.step(prefix + 'Duty per pump', 'Q_p = Q/n', `${n(o.Q * 3600, 1)}/${o.nDuty}`, Qp * 3600, 'm³/h');
    calc.step(
      prefix + `Pump / motor efficiency (${eff.type.label})`,
      '\\eta_p,\\ \\eta_m',
      `${n(etaP)},\\ ${n(etaM)}`,
      etaP * etaM,
      'overall',
      ref('Table 6.2'),
    );
    calc.step(
      prefix + 'Shaft power per pump',
      'P = \\frac{\\rho g Q_p H}{\\eta_p}',
      `\\frac{${n(rho, 0)}\\times9.81\\times${n(Qp, 4)}\\times${n(H)}}{${n(etaP)}}`,
      Pshaft / 1000,
      'kW',
    );
    calc.step(prefix + 'Motor rating (+10 %)', 'P_m', '', motor, 'kW');
    calc.step(
      prefix + 'Stand-by pumps (reserve ≥ 30 %)',
      'n_{sb}',
      o.nStandby > 0 ? '\\text{user value}' : `\\text{D2 for } ${o.nDuty}\\text{ duty}`,
      nStandby,
      'nr',
      ref('6.4.1'),
    );
  }
  // surge (Joukowsky, instantaneous stop)
  const a = o.wave ?? 1000;
  const dH = (a * v) / G;
  const unprot = selectClass(material, dn, H, dH, T);
  const sp = o.surgeProtect;
  const protect = sp === true || sp === 'yes' || ((sp === 'auto' || sp === undefined) && !unprot.ok);
  o = { ...o, surgeProtect: protect };
  const dHd = protect ? 0.3 * H : dH; // with surge protection designed to limit transients to ±30 % of H
  const pMax = H + dHd;
  const PN = pMax <= 100 ? 10 : pMax <= 160 ? 16 : pMax <= 250 ? 25 : 40;
  const cls = selectClass(material, dn, H, dHd, T);
  if (calc && protect && (sp === 'auto' || sp === undefined))
    calc.note(
      'info',
      `${prefix}Unprotected surge (${dH.toFixed(0)} m) would exceed the ${unprot.label} rating – surge protection (air vessel / surge-relief valve) is included in the design and estimate; size it by transient analysis (D2 §6.5, Annex J).`,
    );
  if (calc) {
    calc.step(
      prefix + 'Surge head on sudden pump stop (Joukowsky)',
      '\\Delta H = \\frac{a\\,v}{g}',
      `\\frac{${n(a, 0)}\\times${n(v)}}{9.81}`,
      dH,
      'm',
      ref('6.5, Annex J'),
    );
    if (o.surgeProtect)
      calc.step(
        prefix + 'Design surge with protection (surge vessel / relief valve)',
        '\\Delta H_d = 0.3H',
        `0.3\\times${n(H)}`,
        dHd,
        'm',
        'confirm by transient analysis',
      );
    calc.step(
      prefix + (o.surgeProtect ? 'Maximum pressure (protected)' : 'Maximum pressure (unprotected)'),
      'H + \\Delta H',
      `${n(H)}+${n(dHd)}`,
      pMax,
      'm',
    );
    calc.step(
      prefix + `Pipe class – ${cls.label}`,
      'p_w \\geq H,\\ H+\\Delta H \\leq ' + cls.rule + 'p_w',
      `${cls.cls}`,
      cls.wpM,
      'm working',
      ref('7.1, Tables 7.1–7.2'),
    );
    calc.step(
      prefix + 'Field test pressure',
      'p_t = 1.5\\,H',
      `1.5\\times${n(H)}`,
      MAIN_RULES.testFactor * H,
      'm',
      ref('7.2.3'),
    );
    if (!cls.ok)
      calc.note(
        'warn',
        `${prefix}Surge (${dHd.toFixed(0)} m) on ${cls.label} exceeds ${cls.rule} × the highest class rating – provide surge protection (surge vessel, surge-relief / control valve, flywheel or slow-closing NRV, D2 §6.5) or change pipe material.`,
      );
    else if (dH > 0.3 * H && !o.surgeProtect)
      calc.note(
        'info',
        `${prefix}Unprotected surge of ${dH.toFixed(0)} m is accommodated by ${cls.label} ${cls.cls}; D2 §6.4.1 still requires a surge investigation for every pumping system.`,
      );
    if (!cls.dnOk) calc.note('warn', `${prefix}DN${dn} is outside the size range of ${cls.label} (D2 Table 7.2).`);
  }
  // NPSH (D2 §6.2.2 – storm conditions lower atmospheric pressure up to 15 %)
  let npsha = null,
    npshaNormal = null;
  if (o.elev !== undefined) {
    const Habs = (pAtm(o.elev) * 1000) / (rho * G);
    const Hv = (pVap(T) * 1000) / (rho * G);
    npshaNormal = Habs - Hv + (o.suctionHead ?? 0) - (o.suctionLoss ?? 0.5);
    npsha = Habs * PUMP.stormFactor - Hv + (o.suctionHead ?? 0) - (o.suctionLoss ?? 0.5);
    if (calc)
      calc.step(
        prefix + 'NPSH available (storm: 0.85 × atmospheric)',
        'NPSH_a = 0.85H_{abs} - H_{vap} \\pm H_s - H_f',
        `0.85\\times${n(Habs)} - ${n(Hv)} + ${n(o.suctionHead ?? 0)} - ${n(o.suctionLoss ?? 0.5)}`,
        npsha,
        'm',
        ref('6.2.2'),
      );
  }
  // appurtenances (D2 §7.4, §8.1.4)
  const nAir = Math.max(1, Math.ceil(o.L / AIR_VALVE_SPACING));
  const nWash = Math.max(1, Math.round(o.L / 1000));
  const nIso = Math.max(2, Math.floor(o.L / ISOLATING_VALVE_SPACING) + 2);
  const Ttest = thrust(dn, (MAIN_RULES.testFactor * H) / 10.197, 90) / 1000; // kN at a 90° bend
  const bearing = o.soilBearing ?? 100;
  const blockA = Ttest / bearing; // m²
  const spec = {
    material,
    matLabel: PIPE_MATERIALS[material].label,
    cls,
    C,
    Cdes,
    nAir,
    airSize: airValveSize(dn),
    nWash,
    washSize: washoutSize(dn),
    nIso,
    bypass: dn >= MAIN_RULES.bypassDN,
    Ttest,
    blockA,
    cover: MAIN_RULES.cover,
    testHead: MAIN_RULES.testFactor * H,
  };
  if (calc) {
    calc.step(
      prefix + 'Air valves (double orifice at peaks, ≤ 500 m apart)',
      'n_{av} \\approx L/500',
      `${n(o.L, 0)}/500`,
      nAir,
      `× ${spec.airSize} mm`,
      ref('7.4.5'),
    );
    calc.step(
      prefix + 'Washouts (low points, estimate 1 per km)',
      'n_{wo}',
      '',
      nWash,
      `× ${spec.washSize} mm`,
      ref('7.4.6'),
    );
    calc.step(
      prefix + 'Isolating valves (≈ 1.5 km on transmission mains)',
      'n_{iv}',
      '',
      nIso,
      spec.bypass ? 'with by-pass' : '',
      ref('8.1.4, 7.4.2'),
    );
    calc.step(
      prefix + 'Thrust on a 90° bend at test pressure',
      'T = 2pA\\sin(\\theta/2)',
      `p=${n(spec.testHead)}\\,m`,
      Ttest,
      'kN',
      ref('7.4.8, Table 7.3'),
    );
    calc.step(
      prefix + `Thrust-block bearing area (soil ${bearing} kPa)`,
      'A = T/\\sigma',
      `${n(Ttest)}/${bearing}`,
      blockA,
      'm²',
    );
  }
  // curves: pump H = H0 - k q^2 ; system H = Hs + losses
  const H0 = 1.3 * H;
  const kp = (H0 - H) / (Qp * Qp);
  const sys = (Q) => o.Hs + hwLoss(Q, D, o.L, C) + (o.K * vel(Q, D) ** 2) / (2 * G);
  const pumpH = (Q, k) => H0 - kp * (Q / k) ** 2;
  const curves = [];
  const Qmax = Math.sqrt(H0 / kp) * o.nDuty * 1.05;
  for (let i = 0; i <= 40; i++) {
    const Q = (Qmax * i) / 40;
    const row = { Q: Q * 3600, sys: sys(Q) };
    for (let k = 1; k <= o.nDuty; k++) row['p' + k] = Math.max(0, pumpH(Q, k));
    curves.push(row);
  }
  const ops = [];
  for (let k = 1; k <= o.nDuty; k++) {
    const Qo = bisect((Q) => pumpH(Q, k) - sys(Q), 1e-6, Math.sqrt(H0 / kp) * k, 1e-8);
    ops.push({ k, Q: Qo * 3600, H: sys(Qo) });
  }
  return {
    dn,
    D,
    v,
    hf,
    hm,
    H,
    Bresse,
    Qp,
    Pw,
    Pshaft,
    Pin,
    motor,
    kWhD,
    dH,
    dHd,
    pMax,
    protect,
    PN,
    npsha,
    npshaNormal,
    curves,
    ops,
    H0,
    nDuty: o.nDuty,
    nStandby,
    nStandbyD2,
    etaP,
    etaM,
    C,
    Cdes,
    econ,
    spec,
    material,
    kWperM3: Pin / 1000 / (Qp * 3600),
  };
}

/** D2 checks common to every pumping main */
export function mainChecks(calc, p, critKey, label, d) {
  calc.check(critKey, p.v, label);
  const rule = p.spec.cls.rule;
  calc.check(
    'main.surge',
    p.pMax / Math.max(p.spec.cls.wpM, 1e-6),
    `${label.replace('Velocity in ', 'Pressure class – ')} (${p.spec.cls.cls})`,
    {
      crit: { max: rule, hardMax: rule * 1.25 },
      range: `≤ ${rule} × rating`,
      note: p.spec.cls.ok ? '' : 'provide surge protection (D2 §6.5)',
    },
  );
  calc.flag(
    'Stand-by pumps provide ≥ 30 % reserve',
    p.nStandby >= p.nStandbyD2,
    `${p.nDuty} duty + ${p.nStandby} stand-by`,
    `≥ ${p.nStandbyD2} stand-by`,
    '',
    'warn',
    ref('6.4.1'),
  );
  if (d?.hours !== undefined)
    calc.check('pump.hours', d.hours, `${label.includes('raw') ? 'Raw-water' : 'Transmission'} pumping hours`);
}
