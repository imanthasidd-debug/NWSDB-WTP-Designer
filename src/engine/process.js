// Expert-system process selection: recommends the treatment train from source, raw quality & capacity.
import { Calc } from '../core/calc.js';
import { BLEACH, DIRECT, PROC, SSF, table45, TRAINS_MIN, typicalTrain } from '../core/d3.js';

export const DEFAULTS = {
  route: 'auto',        // auto | conventional | direct | ssf
  presed: 'auto',       // auto | yes | no
  aeration: 'auto',     // auto | none | cascade | tray
  prechlor: 'auto',     // auto | yes | no
  pac: 'auto',          // auto | yes | no  (powdered activated carbon, NWSDB D3 §5.2.3)
  rapidMix: 'auto',     // auto | mechanical | jump
  floc: 'auto',         // auto | hbaffle | vbaffle | paddle
  clarifier: 'auto',    // auto | rect | circ | tube
  filter: 'auto',       // auto | rsf | dual
  disinfectant: 'auto', // auto | gas | naocl | hth | bleach
  postLime: 'auto',     // auto | yes | no
  sludge: 'auto',       // auto | beds | thickener | mechanical
  recovery: 'yes',      // backwash water recovery
};

export const LABELS = {
  route: { conventional: 'Conventional (coagulation–flocculation–sedimentation–rapid filtration)', direct: 'Direct filtration (no sedimentation)', ssf: 'Slow sand filtration (with plain sedimentation / roughing)' },
  aeration: { none: 'None', cascade: 'Cascade aerator', tray: 'Multiple-tray aerator' },
  rapidMix: { mechanical: 'Mechanical flash mixer', jump: 'Hydraulic jump (weir / flume)' },
  floc: { hbaffle: 'Horizontal baffled (around-the-end)', vbaffle: 'Vertical baffled (over-and-under)', paddle: 'Mechanical paddle (horizontal shaft)' },
  clarifier: { rect: 'Rectangular horizontal-flow', circ: 'Circular radial-flow', tube: 'Rectangular with tube settlers' },
  filter: { rsf: 'Rapid gravity sand filter', dual: 'Rapid gravity dual-media (anthracite–sand)' },
  disinfectant: { gas: 'Chlorine gas (vacuum chlorinators)', naocl: 'Sodium hypochlorite (liquid)', hth: 'Calcium hypochlorite (HTH, 65–70 %)', bleach: 'Bleaching powder (30–35 %)' },
  sludge: { beds: 'Sludge drying beds', thickener: 'Gravity thickener + drying beds', mechanical: 'Thickener + mechanical dewatering (belt press / centrifuge)' },
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const q = ctx.res.quality;
  const Q = ctx.res.demand.Qd;
  const setup = ctx.inp.setup || {};
  const src = setup.sourceType || 'river';
  const gw = src === 'groundwater';
  const tmax = q.turbMax;
  const colour = q.worst('colour');
  const fe = q.worst('fe');
  const mn = q.worst('mn');
  const algae = q.worst('algae');
  const nh3 = q.worst('nh3');
  const toc = q.worst('toc');
  const DO = q.get('do', 1);
  const co2 = q.worst('co2');
  const h2s = q.worst('h2s');
  const tc = q.worst('tc');
  const mclr = q.worst('mclr') || 0;
  const reasons = [];
  const why = (unit, txt) => reasons.push({ unit, txt });

  // ---- Route
  let route = d.route;
  if (route === 'auto') {
    if (Q <= 3000 && tmax <= SSF.turbPretreat && colour <= 25 && algae <= 200 && !gw) { route = 'ssf'; why('Route', `Small scheme (${Q} m³/d) with low turbidity (≤ 20 NTU), colour ≤ 25 and few algae – slow sand filtration needs no chemicals and minimal power (NWSDB D3 Fig 4-4, Table 5-35; suits CBO/rural operation).`); }
    else if (tmax <= DIRECT.turbMax && colour <= DIRECT.colourMax && algae < 2000) { route = 'direct'; why('Route', `Raw turbidity peaks at only ${tmax} NTU and colour ${colour} – direct filtration (coagulation + flocculation + filtration) is economical (NWSDB D3 §5.9.11: up to 20 NTU and 30 colour units).`); }
    else { route = 'conventional'; why('Route', `Peak turbidity ${tmax} NTU / colour ${colour} Hazen requires full conventional treatment – coagulation → flocculation → sedimentation → rapid filtration → disinfection (NWSDB D3 Fig 4-4, Table 4-5).`); }
  }
  const conv = route === 'conventional';
  const ssf = route === 'ssf';

  // ---- Pre-sedimentation
  let presed = d.presed === 'auto' ? (tmax > 750 || (ssf && tmax > 10) ? 'yes' : 'no') : d.presed;
  if (d.presed === 'auto' && presed === 'yes') why('Pre-sedimentation', ssf ? 'Plain sedimentation / roughing ahead of slow sand filters to keep filter influent < 10 NTU (NWSDB D3 §5.12.3, §5.13; Fig 4-4 roughing filter when > 10 NTU).' : `Peaks of ${tmax} NTU (> 750 NTU) – preliminary settling is essential ahead of coagulation (NWSDB D3 Table 4-5).`);

  // ---- Aeration
  let aeration = d.aeration;
  if (aeration === 'auto') {
    const needs = gw ? (fe > 0.3 || mn > 0.1 || co2 > 10 || h2s > 0.05 || DO < 4) : (DO < 3 || h2s > 0.05 || (src === 'reservoir' && (fe > 1 || mn > 0.2)));
    aeration = needs ? (Q > 20000 ? 'cascade' : 'tray') : 'none';
    if (needs) why('Aeration', `${gw ? 'Groundwater' : 'Low-oxygen source'}: Fe ${fe} mg/L, Mn ${mn} mg/L, CO₂ ${co2} mg/L, DO ${DO} mg/L – aeration oxidises Fe²⁺/Mn²⁺ and strips CO₂/H₂S (lecture: aeration & air stripping).`);
  }

  // ---- Pre-chlorination
  let prechlor = d.prechlor;
  if (prechlor === 'auto') {
    const need = algae > 2000 || mn > 0.2 || tc > 5000 || fe > 1.0;
    prechlor = need ? 'yes' : 'no';
    if (need) why('Pre-chlorination', `Algae ${algae} cells/mL / Mn ${mn} mg/L / Fe ${fe} mg/L / coliforms ${tc} MPN/100 mL – pre-chlorination / oxidation is essential for coliforms > 5,000 and Fe > 1.0 mg/L (NWSDB D3 Table 4-5) and controls algae and Mn.`);
  }
  // ---- Powdered activated carbon (D3 §5.2.3, Table 4-5: essential for algae / toxic chemicals)
  let pac = d.pac;
  if (pac === 'auto') {
    const need = algae > 2000 || mclr > 1 || h2s > 0.05;
    pac = need ? 'yes' : 'no';
    if (need) why('PAC dosing', `Algae ${algae} cells/mL${mclr ? `, microcystin ${mclr} µg/L` : ''} – activated carbon is essential for algae / taste & odour (NWSDB D3 Table 4-5, §5.2.3: 2–20 mg/L, ≥ 15 min contact at the plant head).`);
  }
  if (prechlor === 'yes' && toc > 4) calc.note('warn', `Pre-chlorination with TOC ${toc} mg/L raises trihalomethane (THM) risk – NWSDB D3 §6.10 advises avoiding pre-chlorination (TTHM ≤ 100 µg/L): use a limited dose, move the dose point after sedimentation, or use enhanced coagulation (alum pH 6.0–6.5).`);

  // ---- Rapid mix
  let rapidMix = d.rapidMix;
  if (rapidMix === 'auto' && !ssf) { rapidMix = Q > 50000 ? 'mechanical' : 'jump'; why('Rapid mixing', rapidMix === 'jump' ? 'Hydraulic jump (weir / Parshall flume, NWSDB D3 §5.5.3, Annex C.1) uses the available head – no moving parts, robust during power interruptions.' : 'Large plant – mechanical flash mixers give G independent of flow (NWSDB D3 §5.5.5: ≥ 2 tanks, variable speed).'); }

  // ---- Flocculator
  let floc = d.floc;
  if (floc === 'auto' && !ssf) {
    floc = Q <= 20000 ? 'hbaffle' : Q <= 60000 ? 'vbaffle' : 'paddle';
    why('Flocculation', floc === 'paddle' ? 'Large capacity – mechanical paddles allow G adjustment over the flow range.' : `Hydraulic baffled flocculator (${floc === 'hbaffle' ? 'around-the-end' : 'over-and-under, compact for mid-size plants'}) – no power, simple O&M; tapered G by varying baffle spacing.`);
  }
  // ---- Clarifier
  let clarifier = d.clarifier;
  if (clarifier === 'auto' && conv) {
    clarifier = setup.landConstrained ? 'tube' : 'rect';
    why('Sedimentation', clarifier === 'tube' ? 'Land is constrained – tube settlers raise the allowable surface loading 3–4 times.' : 'Rectangular horizontal-flow tanks: robust to monsoon turbidity shocks, easy common-wall construction with the flocculators.');
  }
  // ---- Filter
  let filter = d.filter;
  if (filter === 'auto' && !ssf) { filter = 'rsf'; why('Filtration', 'Rapid gravity sand filters (single medium, ES 0.45–0.55 mm) – standard NWSDB practice; air-scour + water backwash.'); }
  if (ssf) filter = 'ssf';
  // ---- Disinfectant
  let disinfectant = d.disinfectant;
  if (disinfectant === 'auto') {
    const dis = ctx.inp.dis || {};
    const estKgD = ((+dis.demand || 1.2) + (+dis.residual || 0.8)) * Q / 1000;
    const hypoLimit = BLEACH.hypoLimitLh * 0.01 * 24; // ≈ 10 kg/d available chlorine (42 L/h of 1 % solution)
    disinfectant = estKgD > hypoLimit ? 'gas' : 'bleach';
    why('Disinfection', disinfectant === 'gas' ? `Chlorine demand ≈ ${estKgD.toFixed(0)} kg/d exceeds the practical limit of hypochlorination (≈ 42 L/h of 1 % solution, NWSDB D3 §6.4.3) – gas chlorination with vacuum chlorinators, 1 duty + 1 standby (D3 §6.5).` : `Chlorine demand ≈ ${estKgD.toFixed(1)} kg/d is within the practical limit of hypochlorination (≈ 10 kg/d) – bleaching powder solution (designed on 35 % available chlorine, 1 % solution) is safest for a small plant (NWSDB D3 §6.4; HTH is not available in Sri Lanka).`);
  }
  if (nh3 > 0.3) calc.note('warn', `Raw ammonia ${nh3} mg/L: breakpoint chlorination (≈ 7.6 mg Cl₂ per mg NH₃-N) is required to obtain a free residual.`);
  // ---- Post lime / sludge
  const postLime = d.postLime; // resolved in stabilisation
  let sludge = d.sludge;
  if (sludge === 'auto') sludge = Q > 20000 ? 'mechanical' : Q > 5000 ? 'thickener' : 'beds';

  // ---- Warnings that conventional treatment cannot solve
  const f = q.worst('f');
  if (f > 1.0) calc.note('fail', `Fluoride ${f} mg/L exceeds SLS 614 (1.0 mg/L). Conventional treatment does not remove fluoride – select another source, blend, or add defluoridation (NWSDB D3 §7.2 Table 7-4: activated alumina 85–95 %, bone char, Nalgonda alum + lime, RO).`);
  const hard = q.worst('hard');
  if (hard > 200) calc.note(hard > 250 ? 'warn' : 'info', `Total hardness ${hard} mg/L > 200 mg/L – NWSDB D3 Table 4-5 lists softening as essential; ion-exchange softening of a portion and blending to 20–50 mg/L is preferred (D3 §7.4). Conventional treatment does not soften.`);
  const cl = q.worst('cl');
  if (cl > 250) calc.note('fail', `Chloride ${cl} mg/L (salinity intrusion?) exceeds SLS 614 – reverse osmosis is essential (NWSDB D3 Table 4-5); otherwise relocate the intake upstream / provide a salinity barrier (D3 §5.1.2) or raw-water storage for dry-weather periods.`);
  const no3 = q.worst('no3');
  if (no3 > 50) calc.note('fail', `Nitrate ${no3} mg/L exceeds SLS 614 – not removed by conventional treatment.`);
  for (const k of ['as', 'pb', 'cd', 'cr', 'hg', 'se', 'ni', 'cn']) {
    const r = q.rows.find((x) => x.key === k);
    if (r && r.exc) calc.note('fail', `${r.name} ${r.worst} mg/L exceeds SLS 614 (${r.sls}) – conventional treatment gives limited removal; investigate the source.`);
  }
  if (ssf && tmax >= SSF.turbPretreat && presed !== 'yes') calc.note('warn', 'Slow sand filters: pre-treatment is necessary when the maximum raw turbidity is ≥ 20 NTU (NWSDB D3 §5.12.1) – provide plain sedimentation or roughing filters.');
  if (ssf && tmax > SSF.turbMaxPretreated) calc.note('fail', `Raw turbidity ${tmax} NTU exceeds the 50 NTU limit for slow sand filtration even with pre-treatment (NWSDB D3 §5.12.3).`);
  if (route === 'direct' && (tmax > DIRECT.turbMax || colour > DIRECT.colourMax)) calc.note('warn', `Direct filtration is recommended only up to ${DIRECT.turbMax} NTU and colour ${DIRECT.colourMax} (NWSDB D3 §5.9.11).`);

  // ---- NWSDB D3 cross-checks: Table 4-5 essential processes, Fig 4-3/4-4 typical train, §4.3.8 trains
  const surface = !gw;
  const has = {
    scr: surface, rawStor: src === 'reservoir' || src === 'lake', micro: false, aer: aeration !== 'none', preCl: prechlor === 'yes', preSet: presed === 'yes',
    coag: !ssf, settle: conv || presed === 'yes', daf: false, rapidF: !ssf, ssf, green: (prechlor === 'yes' || aeration !== 'none') && !ssf, postCl: true,
    superCl: false, lime: false, ac: pac === 'yes', ix: false, mem: false, ro: false,
  };
  const toxic = q.rows.some((r) => r.group === 'tox' && r.exc);
  const qp = { surface, gw, turb: tmax, colour, algae, hard, fe, mn, cl, tc, toc, taste: h2s > 0.05, toxic, do: DO, co2, h2s, lsi: 0 };
  const t45 = table45(qp, has);
  for (const r of t45.rows) {
    const status = r.hard.length ? 'warn' : r.soft.length ? 'info' : 'ok';
    const miss = [...r.hard, ...r.soft].map((p) => PROC[p]).join(', ');
    calc.flag(`Table 4-5 – ${r.char} ${r.band}: essential processes provided`, status === 'ok', status === 'ok' ? 'all provided' : `missing: ${miss}`, `${r.E.length} essential`,
      `Essential: ${r.E.map((p) => PROC[p]).join(', ') || '—'}${r.soft.length && !r.hard.length ? '. Advisory – Table 4-5 conflicts with the source-specific train of D3 Fig 4-3/4-4, which the app follows' : ''}`, status === 'ok' ? 'warn' : status, 'NWSDB D3 §4.3.6 Table 4-5');
  }
  const typical = typicalTrain(src, qp);
  const nTrains = ctx.res.demand.nTrains;
  calc.flag('Independent treatment trains', nTrains >= TRAINS_MIN, `${nTrains}`, `≥ ${TRAINS_MIN}`, 'Treatment shall be divided into two or more independent trains (low initial demand, day/night, cleaning & repair)', 'fail', 'NWSDB D3 §4.3.8');

  const train = [];
  const add = (key, label, detail) => train.push({ key, label, detail });
  add('intake', src === 'groundwater' ? 'Tube wells / collector' : 'Intake & screens', src === 'groundwater' ? 'Production wells' : 'Coarse + fine screens');
  add('rwp', 'Raw water pumping', '');
  if (aeration !== 'none') add('aeration', LABELS.aeration[aeration], '');
  if (pac === 'yes') add('pac', 'PAC dosing', 'Powdered activated carbon, ≥ 15 min before coagulant');
  if (presed === 'yes') add('presed', ssf ? 'Plain sedimentation' : 'Pre-sedimentation', '');
  if (!ssf) {
    add('coag', 'Coagulant dosing', 'Alum / PACl');
    add('rapidmix', 'Rapid mixing', LABELS.rapidMix[rapidMix]);
    add('floc', 'Flocculation', LABELS.floc[floc]);
  }
  if (conv) add('sed', 'Sedimentation', LABELS.clarifier[clarifier]);
  add('filt', ssf ? 'Slow sand filtration' : 'Rapid gravity filtration', ssf ? '' : LABELS.filter[filter]);
  add('dis', 'Disinfection', LABELS.disinfectant[disinfectant]);
  add('stab', 'pH correction', 'Lime');
  add('cwr', 'Clear water reservoir', '');
  add('twp', 'Treated water pumping', '');
  add('sludge', 'Residuals handling', LABELS.sludge[sludge]);

  return {
    inputs: d, route, presed, aeration, prechlor, pac, t45, typical, d3has: has, rapidMix, floc, clarifier, filter, disinfectant, postLime, sludge,
    recovery: d.recovery, conv, ssf, direct: route === 'direct', train, reasons,
    has: { aeration: aeration !== 'none', coag: !ssf, rapidmix: !ssf, floc: !ssf, sed: conv || presed === 'yes', filt: true, dis: true },
    ...calc.result(),
  };
}
