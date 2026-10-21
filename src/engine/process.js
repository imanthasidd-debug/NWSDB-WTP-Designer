// Expert-system process selection: recommends the treatment train from source, raw quality & capacity.
import { Calc } from '../core/calc.js';

export const DEFAULTS = {
  route: 'auto',        // auto | conventional | direct | ssf
  presed: 'auto',       // auto | yes | no
  aeration: 'auto',     // auto | none | cascade | tray
  prechlor: 'auto',     // auto | yes | no
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
  const reasons = [];
  const why = (unit, txt) => reasons.push({ unit, txt });

  // ---- Route
  let route = d.route;
  if (route === 'auto') {
    if (Q <= 3000 && tmax <= 20 && colour <= 30 && !gw) { route = 'ssf'; why('Route', `Small scheme (${Q} m³/d) with low turbidity (≤ 20 NTU) and colour – slow sand filtration needs no chemicals and minimal power (suits CBO/rural operation).`); }
    else if (tmax <= 15 && colour <= 40 && algae < 2000) { route = 'direct'; why('Route', `Raw turbidity peaks at only ${tmax} NTU – direct filtration (coagulation + flocculation + filtration) is economical.`); }
    else { route = 'conventional'; why('Route', `Peak turbidity ${tmax} NTU / colour ${colour} Hazen requires full conventional treatment (lecture: coagulation → flocculation → sedimentation → filtration → disinfection).`); }
  }
  const conv = route === 'conventional';
  const ssf = route === 'ssf';

  // ---- Pre-sedimentation
  let presed = d.presed === 'auto' ? (tmax > 1000 || (ssf && tmax > 10) ? 'yes' : 'no') : d.presed;
  if (d.presed === 'auto' && presed === 'yes') why('Pre-sedimentation', ssf ? 'Plain sedimentation / roughing ahead of slow sand filters to keep filter influent < 10 NTU.' : 'Monsoon peaks above 1000 NTU – plain pre-sedimentation protects the coagulation stage (lecture: "plain sedimentation where water contains much heavy suspended particles").');

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
    const need = algae > 2000 || mn > 0.2 || tc > 50000;
    prechlor = need ? 'yes' : 'no';
    if (need) why('Pre-chlorination', `Algae ${algae} cells/mL / Mn ${mn} mg/L / coliforms ${tc} – pre-chlorination for algae control and Mn oxidation.`);
  }
  if (prechlor === 'yes' && toc > 4) calc.note('warn', `Pre-chlorination with TOC ${toc} mg/L raises trihalomethane (THM) risk – move the dose point after sedimentation or use enhanced coagulation.`);

  // ---- Rapid mix
  let rapidMix = d.rapidMix;
  if (rapidMix === 'auto' && !ssf) { rapidMix = Q > 50000 ? 'mechanical' : 'jump'; why('Rapid mixing', rapidMix === 'jump' ? 'Hydraulic jump uses the available head – no moving parts, robust during power interruptions (common NWSDB choice).' : 'Large plant – mechanical flash mixers give G independent of flow.'); }

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
    disinfectant = Q >= 5000 ? 'gas' : 'hth';
    why('Disinfection', disinfectant === 'gas' ? 'Gas chlorination (vacuum chlorinators, 900 kg / 70 kg cylinders) is the most economical for medium–large plants.' : 'Small plant – HTH (calcium hypochlorite) dosing is safer to handle than gas cylinders.');
  }
  if (nh3 > 0.3) calc.note('warn', `Raw ammonia ${nh3} mg/L: breakpoint chlorination (≈ 7.6 mg Cl₂ per mg NH₃-N) is required to obtain a free residual.`);
  // ---- Post lime / sludge
  const postLime = d.postLime; // resolved in stabilisation
  let sludge = d.sludge;
  if (sludge === 'auto') sludge = Q > 20000 ? 'mechanical' : Q > 5000 ? 'thickener' : 'beds';

  // ---- Warnings that conventional treatment cannot solve
  const f = q.worst('f');
  if (f > 1.0) calc.note('fail', `Fluoride ${f} mg/L exceeds SLS 614 (1.0 mg/L). Conventional treatment does not remove fluoride – select another source, blend, or add defluoridation (activated alumina / bone char / RO).`);
  const hard = q.worst('hard');
  if (hard > 250) calc.note('warn', `Total hardness ${hard} mg/L exceeds SLS 614 (250) – conventional treatment does not soften; consider lime softening or RO.`);
  const cl = q.worst('cl');
  if (cl > 250) calc.note('fail', `Chloride ${cl} mg/L (salinity intrusion?) exceeds SLS 614 – relocate intake upstream or provide raw-water storage for dry-weather periods.`);
  const no3 = q.worst('no3');
  if (no3 > 50) calc.note('fail', `Nitrate ${no3} mg/L exceeds SLS 614 – not removed by conventional treatment.`);
  for (const k of ['as', 'pb', 'cd', 'cr', 'hg', 'se', 'ni', 'cn']) {
    const r = q.rows.find((x) => x.key === k);
    if (r && r.exc) calc.note('fail', `${r.name} ${r.worst} mg/L exceeds SLS 614 (${r.sls}) – conventional treatment gives limited removal; investigate the source.`);
  }
  if (ssf && tmax > 20 && presed !== 'yes') calc.note('warn', 'Slow sand filters need influent turbidity below ~10–20 NTU – provide plain sedimentation or roughing filters.');
  if (route === 'direct' && tmax > 25) calc.note('warn', 'Direct filtration is not suited to raw turbidity above ~15–25 NTU.');

  const train = [];
  const add = (key, label, detail) => train.push({ key, label, detail });
  add('intake', src === 'groundwater' ? 'Tube wells / collector' : 'Intake & screens', src === 'groundwater' ? 'Production wells' : 'Coarse + fine screens');
  add('rwp', 'Raw water pumping', '');
  if (aeration !== 'none') add('aeration', LABELS.aeration[aeration], '');
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
    inputs: d, route, presed, aeration, prechlor, rapidMix, floc, clarifier, filter, disinfectant, postLime, sludge,
    recovery: d.recovery, conv, ssf, direct: route === 'direct', train, reasons,
    has: { aeration: aeration !== 'none', coag: !ssf, rapidmix: !ssf, floc: !ssf, sed: conv || presed === 'yes', filt: true, dis: true },
    ...calc.result(),
  };
}
