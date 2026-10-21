// Maps every design check to the input that controls it, with a short "how to fix" hint, so that an error shown
// anywhere (dashboard, checks register, unit page) can be located: the app opens the page, scrolls to the input,
// highlights it in red/amber and shows the failing check beside it.
import { store } from './store.js';

// [match, field, hint]; match = criteria key ('pipe.gravV'), 'key|/label regex/' or '/label regex/'
// field = input key on the module's page, or 'module.key' for an input on another page
const MAP = {
  demand: [
    ['dem.lpcd', 'lpcd', 'Use a per-capita demand within the D2 / P1 range for the community.'], ['dem.lpcdD2', 'lpcd', 'Per-capita demand should lie in the D2 §3.2.1 range for this community size.'],
    ['dem.horizon', 'designYear', 'Set the design year 20 years after the base year (urban) or 10 years (rural).'], ['dem.nrw', 'nrw', 'Use 10–15 % for new systems, 20–25 % for rehabilitated systems.'],
    ['dem.mdf', 'mdf', 'Clear the field to use the D2 value.'], ['dem.phf', 'phf', 'Clear the field to use the D2 value.'], ['dem.own', 'ownUse', 'Treatment losses are 5–10 % of maximum day.'],
    ['/Stage I/', 'stageYear', 'Stage I is normally about 10 years after the base year.'], ['/Design basis/', 'capacity', ''],
  ],
  source: [['src.abstraction', 'dwf', 'Reduce the abstraction or confirm a higher dependable flow; consider raw-water storage.'], ['src.meanAbs', 'catchment', ''], ['src.rippl', 'liveStorage', 'Increase live storage or reduce abstraction.']],
  quality: [['/SLS 722/', 'tssPerNtu', 'Raw-water quality exceeds SLS 722 – enter verified laboratory results and investigate source protection.']],
  process: [['/Independent treatment trains/', 'setup.nTrains', 'Provide at least two parallel treatment streams (D3 §4.3.8).'], ['/Table 4-5.*Turbidity|Table 4-5.*Colour/', 'route', 'Choose a treatment route / pre-sedimentation that provides the essential processes.'], ['/Table 4-5.*Coliform|Table 4-5.*Iron/', 'prechlor', 'Provide pre-chlorination / oxidation or change the route.'], ['/Table 4-5.*Algae|Table 4-5.*TOC/', 'pac', 'Provide powdered activated carbon dosing.'], ['/Table 4-5/', 'route', '']],
  intake: [
    ['int.portV', 'portV', 'Increase port area (width × height or more ports) to keep entrance velocity < 0.15 m/s.'], ['int.bellmouth', 'sill', 'Keep the intake opening ≥ 1 m above the river bed.'],
    ['int.submergence|/Intake-pipe/', 'sill', 'Increase submergence: lower the intake sill / pipe (or bed level), select a smaller conduit, or raise the low water level with a weir.'],
    ['int.submergence|/Pump-suction/', 'submergence', 'Increase the minimum pump submergence or lower the pump intake.'], ['int.wellArea', 'conduitDN', 'Enlarge the suction well or reduce the intake-pipe diameter.'],
    ['pipe.gravV', 'conduitDN', 'Choose an intake-pipe diameter giving 0.6–0.9 m/s (0 = automatic).'], ['pipe.rawV', 'dn', 'Change the rising-main diameter (or let the economic selection choose it).'],
    ['main.surge', 'surgeProtect', 'Provide surge protection or a higher pressure class.'], ['pump.npshMargin', 'npshr', 'Lower the pump centre line, increase suction pipe size, or select a pump with lower NPSHr.'],
    ['pump.suctionV', 'nDuty', 'Increase the number of duty pumps or suction size.'], ['scr.coarseOpen', 'cOpen', 'Use 50–100 mm clear openings (D3 §5.1.5.1).'], ['scr.coarseV', 'chanU', 'Adjust the screen-channel approach velocity / width so 0.4–0.9 m/s passes the bars.'],
    ['scr.fineOpen', 'fOpen', 'Use 5–20 mm clear openings.'], ['scr.fineV', 'chanU', 'Adjust the approach velocity or the bar / opening sizes.'], ['scr.headloss', 'fBar', 'Reduce bar thickness, increase openings or channel width; reduce the clogging allowance.'],
    ['well.hrt', 'wellHrt', 'Provide 3–15 min wet-well storage.'], ['/Fine-screen inclination/', 'fAngle', 'Set the fine screen 10–30° to vertical (60–80° from horizontal).'],
    ['/Stand-by pumps/', 'nStandby', 'Provide stand-by pumps (D2 §6.4.1).'], ['/Motor starts/', 'wellHrt', 'Increase the wet-well volume to limit motor starts.'], ['/constant grade/', 'conduitL', ''],
  ],
  aeration: [['aer.stepH', 'stepH', 'Use drops of 0.3–0.6 m.'], ['aer.drops|/drops/', 'nSteps', 'Use 4–6 drops.'], ['aer.drops|/trays/', 'nTrays', 'Use 3–5 trays.'], ['aer.height|/Σ drops/', 'nSteps', 'Total height 2–3 m: adjust number of drops or drop height.'], ['aer.height', 'traySpacing', ''],
    ['aer.weirLoad', 'width', 'Set the cascade width so the overflow is 0.01–0.028 m³/s per m.'], ['aer.cascadeArea', 'areaLoading', 'Use about 0.033 m² per m³/h (120 m² per m³/s).'], ['aer.trayArea', 'trayLoading', 'Use 0.014–0.044 m² per m³/h.'], ['aer.traySpacing', 'traySpacing', 'Space trays 0.3–0.75 m.'],
    ['/Fe\\/Mn oxidation/', 'nSteps', 'Add drops / trays or provide chemical oxidation.'], ['/CO₂ removal/', 'type', 'Tray aerators strip CO₂ better than cascades.']],
  coag: [['coag.pH', 'phAdjust', 'Adjust the alkali (lime / soda) or residual alkalinity target to bring the coagulation pH into range.'], ['coag.resAlk', 'resAlk', 'Raise the residual alkalinity target / alkali dose.'], ['coag.solConc', 'solConc', 'Use a 2–10 % stock solution.'],
    ['coag.storage', 'storageDays', 'Store at least one month of chemicals.'], ['coag.turndown', 'nTanks', 'Use more / smaller dosing pumps or VFD pumps.'], ['coag.dayTank', 'batchHours', 'Size day tanks for 12–24 h.'], ['coag.dose', 'doseMethod', 'Confirm the dose by jar tests.'],
    ['pac.dose', 'pacDose', 'Use 2–20 mg/L PAC.'], ['pac.contact', 'pacContact', 'Provide ≥ 15 min PAC contact before the coagulant.'], ['/Batching/', 'nTanks', 'Provide two batching tanks.'], ['/direct filtration/', 'process.route', 'High coagulant demand – use conventional treatment.'], ['/diffuser/', 'appliedConc', 'Dilute to ≤ 1 % at the diffuser.']],
  rapidmix: [['rm.G', 'G', 'Use G = 500–1,000 s⁻¹ (mechanical) – or change the jump channel / drop for hydraulic mixing.'], ['rm.t|/jump/', 'chanWidth', 'Change the channel width / supercritical depth.'], ['rm.t', 't', 'Mechanical flash mixer: 30–60 s.'], ['rm.Gt', 't', 'Gt 30,000–60,000: adjust G or detention.'],
    ['rm.Fr', 'y1', 'Reduce the supercritical depth or channel width to raise Fr₁ to 4.5–9.'], ['rm.Re', 'dRatio', 'Increase impeller size / speed.'], ['/Number of flash/', 'nBasins', 'Provide two tanks.'], ['/depth \\/ tank width/', 'hRatio', 'Use depth / width ≈ 2.'], ['/Impeller diameter/', 'dRatio', 'Impeller 50–80 % of tank width.']],
  floc: [['fl.spacing', 'targetSpacing', 'Increase the target baffle spacing (or widen the channels / lower G in stage 1).'], ['fl.v', 'width', 'Change the channel width / depth to give 0.1–0.3 m/s.'], ['fl.G', 'stages', 'Adjust the stage G values (10–75 s⁻¹, tapered).'], ['fl.t', 'stages', 'Adjust the stage times (≥ 20 min in total).'], ['fl.Gt', 'stages', ''],
    ['fl.hl', 'stages', ''], ['fl.tip', 'areaRatio', 'Increase paddle area or reduce G to bring the relative velocity ≤ 0.4 m/s.'], ['fl.paddleRatio', 'areaRatio', 'Paddle area 5–20 % of the cross-section.'], ['/tapered|Initial G/', 'stages', 'Make G decrease from inlet to outlet.'], ['/depth/', 'depth', 'Water depth ≥ 1.0 m.'], ['/paddle stages/', 'stages', '3–6 paddle stages.'], ['/Paddle-wheel/', 'depth', '']],
  sed: [['sed.sor', 'sor', 'Use a surface overflow rate ≤ 24 m³/m²·d (1.0 m/h) with coagulation (D3 Table 5-20).'], ['sed.hrt', 'depth', 'Adjust depth or overflow rate for 2–4 h detention.'], ['sed.depth', 'depth', 'Side water depth 2.5–4.0 m.'], ['sed.LW', 'LW', 'Length : width 3–6.'], ['sed.LD', 'depth', 'Adjust depth / length.'],
    ['sed.vh', 'nTanks', 'Use more / wider tanks to reduce the horizontal velocity.'], ['sed.weir', 'weirLoad', 'Provide more weir length (launders).'], ['sed.Re', 'nTanks', ''], ['sed.Fr', 'nTanks', ''], ['sed.portV', 'portV', 'Port velocity 0.2–0.3 m/s.'], ['sed.circD', 'nTanks', 'Use more tanks (D < 60 m).'],
    ['tube.loading', 'tubeLoad', 'Tube loading 2.5–7.5 m/h.'], ['tube.Re', 'tubeLoad', 'Lower the loading or tube size.'], ['/Tube inclination/', 'tubeAngle', ''], ['/Tube size/', 'tubeD', ''], ['/covered by tubes/', 'coverFrac', ''], ['/Velocity in tubes/', 'tubeLoad', ''],
    ['/Number of sedimentation/', 'nTanks', 'Provide at least two basins.'], ['/SOR vs Table 5-20/', 'sor', ''], ['/Settled water/', 'sor', 'Reduce the overflow rate or improve flocculation.'], ['/scour/', 'nTanks', '']],
  filt: [['f.rate|/rapid sand/', 'rate', 'Use 5–15 m/h (7.5 typical).'], ['f.rateDual', 'rate', ''], ['f.rateSSF|/scraped/', 'nFilters', 'Add slow sand units or lower the rate.'], ['f.rateSSF', 'rate', 'Slow sand 0.1–0.4 m/h.'], ['f.rateMax', 'nFilters', 'Add filters so the rate with one out + one washing stays ≤ 15 m/h.'],
    ['f.area', 'nFilters', 'More filters reduce the area of each.'], ['f.ES', 'sieve', 'Specify sand with ES 0.45–0.7 mm (sieve analysis).'], ['f.UC', 'sieve', 'Specify sand with UC 1.2–1.7.'], ['f.depth', 'sandDepth', 'Sand depth 0.6–1.0 m.'], ['f.water', 'waterDepth', '≥ 1.0 m water over media.'],
    ['f.expansion', 'bwFactor', 'Adjust the backwash rate factor / rate for 15–30 % expansion.'], ['f.bwPct', 'bwMinutes', 'Shorten washes or lengthen runs.'], ['f.run', 'solidsCap', 'Improve settled water or reduce the filtration rate.'], ['f.UFRV', 'rate', 'Longer runs / higher rate raise net production.'],
    ['f.troughSp', 'troughSpacing', 'Troughs ≤ 2 m apart.'], ['f.troughH', 'troughWidth', ''], ['f.orificeRatio', 'orificeRatio', ''], ['f.latOrif', 'latOrif', ''], ['f.manLat', 'manLat', ''], ['f.latLD', 'lateralSpacing', ''],
    ['f.vInf|f.vEff|f.vWash|f.vWaste', 'nFilters', 'Pipe sizes are selected automatically; change filter number / rate.'], ['f.ssfDepth', 'ssfDepth', ''], ['f.ssfES', 'ssfES', ''], ['f.ssfUC', 'ssfUC', ''], ['f.ssfSuper', 'ssfSupernatant', ''], ['f.ssfTurb', 'process.presed', 'Provide pre-treatment (plain settling / roughing) ahead of slow sand filters.'],
    ['f.bwRate', 'bwRate', 'Backwash 30–54 m/h.'], ['f.bwTime', 'bwMinutes', '≥ 5 min.'], ['f.airRate', 'airRate', ''], ['f.airTime', 'airMinutes', ''], ['f.gravel|/gravel/', 'gravel', 'Grade the support gravel per the Huisman rules.'], ['f.box', 'waterDepth', ''], ['f.turbOut', 'process.clarifier', 'Improve pre-treatment (settled water ≤ 5 NTU).'],
    ['/Number of filters/', 'nFilters', ''], ['/slow sand filter units/', 'nFilters', ''], ['/Peak turbidity applied/', 'process.presed', ''], ['/SSF box/', 'ssfSupernatant', ''], ['/1200/', 'sandDepth', ''], ['/Lateral spacing/', 'lateralSpacing', ''], ['/length \\/ breadth/', 'bedRatio', ''], ['/re-sanding/', 'ssfMinDepth', ''], ['/Wash-water head/', 'bwSupply', '']],
  dis: [['dis.residual', 'residual', 'Residual 0.5–0.8 mg/L in the contact basin (D3 §6.3.5).'], ['dis.contact', 'hrt', '≥ 20 min (WHO 30 min).'], ['dis.ctRatio', 'hrt', 'Increase contact time, baffling or residual to raise CT.'], ['dis.pH', 'stab.target', 'Lower the pH at the contact tank (post-lime after disinfection).'], ['dis.LW', 'chanWidth', 'Narrower serpentine channels raise L/W and the baffle factor.'],
    ['coag.storage', 'storageDays', '≥ 30 days of chlorine.'], ['/hypochlorination/', 'process.disinfectant', 'Use gas chlorination above ≈ 42 L/h of 1 % solution.'], ['/Bleaching-powder storage/', 'storageDays', '≤ 3 months.'], ['/WHO generic/', 'hrt', ''], ['/design dose/', 'demand', ''], ['/turnover/', 'storageDays', '']],
  stab: [['stab.pH', 'targetPH', ''], ['stab.LSI|stab.RSI|stab.CCPP', 'targetLSI', 'Raise the post-lime target LSI towards 0 (or the target pH).'], ['stab.alk|stab.ca', 'maxLime', 'Low-alkalinity water – consider CO₂ + lime re-mineralisation.'], ['/Larson/', 'target', '']],
  storage: [['cwr.hours', 'cwrHours', '≥ 2 h of plant flow (D3 §9.1).'], ['cwr.depth', 'cwrDepth', '2.5–5.5 m.'], ['main.surge', 'surgeProtect', ''], ['pipe.twV', 'dn', ''], ['pump.hours', 'pumpHours', ''], ['sr.capacity', 'srBasis', ''], ['sr.depth', 'srDepth', ''], ['struct.flotation', 'antiFlotation', 'Provide an anti-flotation toe or relief valves.'], ['/Stand-by/', 'nStandby', ''], ['/Service reservoir in two/', 'srCompartments', ''], ['/Two compartments/', 'cwrCompartments', '']],
  sludge: [['sl.thickLoad|sl.thickHLR|sl.thickDepth', 'thickLoad', 'Thickener 20–80 kg/m²·d.'], ['sl.bedLoad|sl.bedLoadYr', 'bedLoad', 'Drying beds 100–300 kg DS/m²·yr.'], ['sl.recycle', 'recoveryWashes', ''], ['/polymer/', 'coag.polymer', 'Do not recycle wash water where polymer is used.'], ['/Climate/', 'bedCover', 'Use covered (solar) beds in high rainfall.'], ['/dewatering justified|plant size/', 'process.sludge', '']],
  hyd: [['hyd.freeboard', 'freeboard', ''], ['/head at minimum flow|Notch apex|ventilated/', 'measure', ''], ['/Inlet chamber/', 'cwrAboveGL', '']],
  layout: [['/flood/', 'floodLevel', ''], ['/extensions/', 'expansion', ''], ['/Access road/', 'roadAccess', ''], ['/power/', 'powerAvailable', ''], ['/Foundation/', 'soilInvestigated', ''], ['/quarters/', 'quarters', ''], ['/minimum site area/', 'expansion', ''], ['/Chemical storage/', 'coag.storageDays', ''], ['/Redundancy/', 'setup.nTrains', '']],
  energy: [['/generator/', 'genEssentialPumps', '']],
  cost: [['/Discount/', 'interest', ''], ['/Engineering/', 'engPct', ''], ['/contingency/', 'contPct', ''], ['/Preliminaries/', 'prelimPct', '']],
  compliance: [['/SLS 614/', 'process.route', 'Review the treatment train for the failing parameters.'], ['/log removal/', 'dis.hrt', 'Increase CT (contact time / residual).'], ['/design target/', 'process.clarifier', '']],
};

/** resolve {module, field, hint} for a check */
export function fieldFor(c, mod = c.module) {
  const list = MAP[mod] || [];
  for (const [m, field, hint] of list) {
    const keys = m.split('|').filter((p) => !p.startsWith('/'));
    const res = m.split('|').filter((p) => p.startsWith('/'));
    const keyOk = !keys.length || keys.includes(c.key);
    const reOk = res.every((r) => new RegExp(r.slice(1, -1), 'i').test(c.label || ''));
    if (keyOk && reOk) {
      if (field.includes('.')) { const [pm, pk] = field.split('.'); return { module: pm, field: pk, hint }; }
      return { module: mod, field, hint };
    }
  }
  return { module: mod, field: null, hint: '' };
}

/** checks of a module mapped to fields: Map(field → checks[]) (non-ok only) */
export function issuesByField(mod) {
  const out = new Map();
  const all = store.results?.checks || [];
  for (const c of all) {
    if (c.status === 'ok' || c.status === 'info') continue;
    const f = fieldFor(c);
    if (f.module !== mod || !f.field) continue;
    if (!out.has(f.field)) out.set(f.field, []);
    out.get(f.field).push({ ...c, hint: f.hint });
  }
  return out;
}

/** ask the shell to locate a check: navigate, scroll to the input, highlight */
export function locate(c) {
  window.dispatchEvent(new CustomEvent('wtp-locate', { detail: { ...c, ...fieldFor(c) } }));
}
export const defaultHint = (c) => (c.range ? `Bring the value within ${c.range}${c.unit && c.unit !== '–' ? ' ' + c.unit : ''}.` : '');
