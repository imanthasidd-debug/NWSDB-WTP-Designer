// Draft operation & maintenance manual of the designed plant, in the structure of NWSDB D3 Chapter 10 (§10.3 headings:
// introduction & process overview, water-quality criteria & monitoring, operation of each process (design intent, SOPs,
// start-up / shut-down, troubleshooting), maintenance, staff & training, laboratory, safety, emergency response,
// records & reports), filled with the design values of this project, the jar-test dosing table and the backwash and
// chemical-stock plans.  Output: HTML → PDF (Electron printToPDF) or Word (.doc, HTML) for editing.
import { APP } from './version.js';
import { esc, fmt, fmtMoney } from '../core/util.js';
import { LAB_EQUIPMENT } from '../core/d3.js';
import { PARAMS } from '../core/standards.js';
import { bannerImg } from './brand.js';
import { REPORT_CSS } from './report.js';
import { store } from './store.js';
import { isTrial, trialLabel } from './edition.js';

export const MANUAL_SECTIONS = [
  ['intro', 'Introduction & process overview'],
  ['quality', 'Water-quality criteria & monitoring'],
  ['ops', 'Operation of each process'],
  ['startup', 'Plant start-up & shut-down'],
  ['maint', 'Maintenance'],
  ['staff', 'Staff & training'],
  ['lab', 'Laboratory'],
  ['safety', 'Safety'],
  ['erp', 'Emergency response'],
  ['chem', 'Chemical stock management'],
  ['records', 'Records, log sheets & reports'],
];

const f0 = (v) => fmt(v, 0),
  f1 = (v) => fmt(v, 1),
  f2 = (v) => fmt(v, 2);
const dt = (iso) => {
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || '');
  return m
    ? `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]} ${m[1]}`
    : '';
};
const tbl = (head, rows, cls = '') =>
  `<table class="res ${cls}"><thead><tr>${head.map((x) => `<th${/^#/.test(x) ? ' class="num"' : ''}>${esc(x.replace(/^#/, ''))}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${/^#/.test(head[i] || '') ? ' class="num"' : ''}>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const ol = (items) =>
  `<ol class="steps">${items
    .filter(Boolean)
    .map((x) => `<li>${x}</li>`)
    .join('')}</ol>`;
const ul = (items) =>
  `<ul>${items
    .filter(Boolean)
    .map((x) => `<li>${x}</li>`)
    .join('')}</ul>`;
const box = (level, t) => `<div class="note ${level}"><div>${t}</div></div>`;

const MANUAL_CSS = `
ol.steps { margin: 4px 0 10px 18px; padding: 0; } ol.steps li, ul li { margin: 2px 0; line-height: 1.45; }
ul { margin: 4px 0 10px 18px; padding: 0; }
table.log td { height: 18px; } table.log th { font-size: 7.5pt; padding: 3px; } table.log { font-size: 7.5pt; }
.draft { color: #b3001b; font-weight: 700; letter-spacing: .5px; }
.cover .doc-type { font-size: 12pt; color: #b3001b; font-weight: 700; margin: 6px 0 0; letter-spacing: 1px; }
.trialmark { position: fixed; top: 38%; left: -10%; right: -10%; text-align: center; transform: rotate(-32deg); font-size: 62pt; font-weight: 800; letter-spacing: 4px; color: rgba(179, 0, 27, .09); z-index: 9999; pointer-events: none; line-height: 1; }
.trialtag { position: fixed; top: 0; right: 0; font-size: 7.5pt; font-weight: 700; color: #b3001b; z-index: 9999; }
`;

export function buildManual(opts = {}) {
  const o = Object.fromEntries(MANUAL_SECTIONS.map(([k]) => [k, opts[k] !== false]));
  const r = store.results,
    s = store.project.inputs.setup;
  const d = r.demand,
    co = r.coag,
    fl = r.floc,
    sd = r.sed,
    fi = r.filt,
    ds = r.dis,
    st = r.stab,
    jt = r.jartest,
    om = r.omplan,
    ik = r.intake,
    cw = r.storage,
    sl = r.sludge,
    sp = r.special;
  const word = !!opts.word;
  const base = word ? '' : location.href.replace(/[^/]*$/, '');
  const logo = bannerImg(70, 'cover-banner'); // fixed organisation logo
  const train = r.process.train.map((t) => t.label).join(' → ');
  const ssf = fi.type === 'ssf';
  const coagName = co ? co.coag.label.split(' (')[0] : '';
  const clName = ds.agent.label.split(' (')[0];
  const gas = ds.key === 'gas';
  const resid = ds.inputs.residual;
  const toc = [];
  let N = 1;
  const sec = (t) => {
    toc.push(`${N}. ${t}`);
    return N++;
  };
  const body = [];

  // ------------------------------------------------------------ cover
  const cover = `<section class="page cover">
    <div class="band banner">${logo}</div>
    <h1>Operation &amp; Maintenance Manual</h1>
    <div class="doc-type">DRAFT – FOR COMPLETION BY THE CONTRACTOR AND O&amp;M STAFF</div>
    <h2>${esc(s.name)}</h2>
    <div><span class="cap">${f1(d.Qd / 1000)} MLD</span> <span class="muted">(${f0(d.Qd)} m³/d)</span></div>
    <table class="meta">
      <tr><td>Project code</td><td>${esc(s.code)}</td></tr><tr><td>Owner / operator</td><td>${esc(s.client)}</td></tr><tr><td>Region</td><td>${esc(s.rsc)}</td></tr>
      <tr><td>Location</td><td>${esc([s.town, s.district + ' District'].filter(Boolean).join(', '))}</td></tr><tr><td>Water source</td><td>${esc(s.source)}</td></tr>
      <tr><td>Treatment</td><td>${esc(train)}</td></tr><tr><td>Revision / date</td><td>${esc(s.revision)} / ${esc(s.date)}</td></tr>
    </table>
    <table class="sig"><tr><th>Prepared by</th><th>Reviewed by (O&amp;M)</th><th>Approved by</th></tr><tr><td>${esc(s.designer)}</td><td></td><td>${esc(s.approver)}</td></tr></table>
    <p class="small muted" style="margin-top:8px">Generated by ${APP} on ${new Date().toLocaleString('en-GB')} from the design of this project. Structure: NWSDB Design Manual D3 (2020) Chapter 10. NWSDB D3 §10.2: prepared jointly by the design team, O&amp;M staff and the contractor; the draft follows detailed design, the final version follows commissioning, and it must reach the plant staff 1–2 months before start-up. Add the manufacturers' O&amp;M manuals, as-built drawings, P&amp;ID, control philosophy and commissioning results before issue.</p>
  </section>`;

  // ------------------------------------------------------------ 1 introduction
  if (o.intro) {
    const k = sec('Introduction and process overview');
    const units = [
      [
        'Intake & raw-water pumps',
        ik
          ? `${ik.pumps.nDuty} duty + ${ik.pumps.nStandby} standby pumps, ${f0(ik.pumps.Qp * 3600)} m³/h each at ${f1(ik.pumps.H)} m`
          : '—',
      ],
      co && [
        'Coagulant dosing',
        `${esc(coagName)}, design ${f1(co.Ddes)} mg/L (average ${f1(co.Davg)}); ${co.inputs.nTanks} solution tanks × ${f1(co.tankV)} m³ at ${co.inputs.solConc} %; ${co.nDosingPumps} dosing pumps`,
      ],
      r.rapidmix?.enabled !== false &&
        r.rapidmix && ['Rapid mixing', `G ≈ ${f0(r.rapidmix.Gact)} s⁻¹, ${f1(r.rapidmix.tAct)} s`],
      fl?.enabled !== false &&
        fl && [
          'Flocculation',
          `${fl.nT} basin(s), ${f0(fl.ttot)} min, G ${fl.stages.map((x) => f0(x.Gt)).join(' / ')} s⁻¹`,
        ],
      sd?.enabled && [
        'Sedimentation',
        `${sd.N} × ${sd.type === 'circ' ? 'Ø' + f1(sd.D) : f1(sd.L) + ' × ' + f1(sd.W)} m, ${f1(sd.H)} m deep; SOR ${f1(sd.sorAct)} m³/m²·d; ${f2(sd.hrt)} h`,
      ],
      [
        'Filtration',
        ssf
          ? `${fi.N} slow sand filters, ${f0(fi.A)} m² each`
          : `${fi.N} rapid gravity filters × ${f1(fi.Af)} m² at ${f2(fi.rate)} m/h; ${fi.inputs.bwMethod === 'airwater' ? 'air scour + water' : 'water'} backwash`,
      ],
      [
        'Disinfection',
        `${esc(clName)}, ${f2(ds.totDose)} mg/L; contact ${f0(ds.V)} m³ (T₁₀ ${f0(ds.T10)} min); residual ${resid} mg/L`,
      ],
      st?.apply && [
        'pH correction',
        `Hydrated lime ${f1((st.kgD * 1000) / d.Qd)} mg/L to pH ≈ ${f2(st.pHfinal)} (${esc(st.lsiText || '')})`,
      ],
      sp?.enabled && [
        'Iron / manganese',
        `${esc(sp.feMn?.label || '')} ${f2(sp.feMn?.dose)} mg/L, ${f0(sp.feMn?.V)} m³ detention`,
      ],
      cw && [
        'Clear-water reservoir & treated-water pumps',
        `${f0(cw.V)} m³; ${cw.pumps.nDuty} duty + ${cw.pumps.nStandby} standby pumps, ${f0(cw.Qp * 3600)} m³/h`,
      ],
      sl && [
        'Residuals',
        `${f0(sl.dsDes)} kg DS/d; ${sl.nBeds ? sl.nBeds + ' drying beds' : 'mechanical dewatering'}${sl.recTank ? `; wash-water recovery tank ${f0(sl.recTank)} m³` : ''}`,
      ],
    ].filter(Boolean);
    body.push(`<section class="page"><h1 class="sec">${k}. Introduction and process overview</h1>
      <p>This manual describes how to operate and maintain the ${esc(s.name)}. It gives the design intent of each process, standard operating procedures (SOPs), start-up and shut-down, monitoring, maintenance, safety and emergency procedures. Values are those of the design; replace them with commissioning values when known.</p>
      <h2 class="sub">${k}.1 Plant data</h2>
      ${tbl(
        ['Item', 'Value'],
        [
          ['Design capacity', `${f0(d.Qd)} m³/d (${f1(d.Qd / 24)} m³/h) in ${d.nTrains} stream(s)`],
          ['Source', esc(s.source)],
          [
            'Raw-water turbidity',
            `${r.quality.turbMax} NTU peak (monthly ${r.quality.monthly.map((x) => f0(x)).join(', ')})`,
          ],
          ['Process train', esc(train)],
          ['Treated-water standard', 'SLS 614:2013 (Sri Lanka Standard for potable water)'],
        ],
      )}
      <h2 class="sub">${k}.2 Treatment units</h2>
      ${tbl(['Unit', 'Main design data'], units)}
      <h2 class="sub">${k}.3 How to use this manual</h2>
      <p>Section 3 has one part per process. Each part gives the purpose, what to check, normal operation, start-up / shut-down and troubleshooting. Section 11 contains log sheets to copy. NWSDB D3 §10.4: SOPs are prepared by the design / process engineer and reviewed with the operators; the emergency response plan is updated at least once a year.</p>
    </section>`);
  }

  // ------------------------------------------------------------ 2 quality
  if (o.quality) {
    const k = sec('Water-quality criteria and monitoring');
    const key = ['turb', 'colour', 'pH', 'al', 'fe', 'mn', 'nh3', 'no3', 'f', 'tc', 'ec_']
      .map((x) => PARAMS.find((p) => p.key === x))
      .filter(Boolean);
    const lim = (p) =>
      p.type === 'range' ? `${p.sls[0]}–${p.sls[1]}` : p.type === 'nd' ? 'not detected' : `≤ ${p.sls}`;
    const targets = [
      [
        'Raw water',
        'Turbidity, pH, colour, alkalinity, temperature',
        'every 2 h; algae / Fe / Mn weekly',
        'record changes; adjust doses (jar test) when turbidity changes by > 25 %',
      ],
      co && [
        'Coagulated / settled water',
        'Turbidity, pH',
        'every 2 h',
        `settled ≤ 4 NTU (< 2 NTU preferred), coagulation pH ${co.inputs.coagulant === 'pacl' ? '5.0–8.0' : '6.0–7.0'} (D3 §5.9.13.6, §5.4.9)`,
      ],
      [
        'Filtered water (each filter)',
        'Turbidity, head loss',
        'every 2 h',
        '≤ 0.5 NTU for effective disinfection (D3 Ch 3); wash at the head-loss limit',
      ],
      [
        'Treated water (plant outlet)',
        'Turbidity, pH, free chlorine, colour',
        'every hour',
        `turbidity ≤ 2 NTU (aim ≤ 1), pH 6.5–8.5, free chlorine ≈ ${resid} mg/L`,
      ],
      [
        'Treated water',
        'Residual Al (or Fe), coliforms, E. coli',
        'daily',
        'Al ≤ 0.2 mg/L; total coliforms ≤ 3 MPN/100 mL (0 in 95 % of samples); E. coli not detected',
      ],
      [
        'Distribution (end points)',
        'Free chlorine, turbidity, coliforms',
        'daily / weekly per sampling plan',
        'free chlorine ≥ 0.2 mg/L at the far ends',
      ],
      [
        'Treated water',
        'Full SLS 614 analysis',
        'monthly (raw water: monthly for the first year, D3 §3.1)',
        'report to the regional laboratory',
      ],
    ].filter(Boolean);
    body.push(`<section class="page"><h1 class="sec">${k}. Water-quality criteria and monitoring</h1>
      <h2 class="sub">${k}.1 Treated-water standard (SLS 614:2013) – key parameters</h2>
      ${tbl(
        ['Parameter', 'Unit', 'Limit'],
        key.map((p) => [esc(p.name), esc(p.unit), lim(p)]),
      )}
      <h2 class="sub">${k}.2 Process targets and monitoring schedule</h2>
      ${tbl(['Sampling point', 'Parameters', 'Frequency', 'Target / action'], targets)}
      ${box('info', 'Suggested frequencies – confirm them with the NWSDB Water Quality section and the Water Safety Plan of the scheme. Sample holding times follow NWSDB D3 Table 3-2 (residual chlorine within 5 min, pH and temperature immediately, coliforms within 6–24 h at 4 °C with thiosulphate, turbidity and alkalinity within 24 h).')}
      <h2 class="sub">${k}.3 Water Safety Plan</h2>
      <p>Operate the plant under the scheme's Water Safety Plan (D3 §10.4): the critical control points are coagulation (dose and pH), filtration (filtered turbidity of each filter) and disinfection (free chlorine and contact time). Record every excursion and the corrective action in the log.</p>
    </section>`);
  }

  // ------------------------------------------------------------ 3 operations
  if (o.ops) {
    const k = sec('Operation of each process');
    const parts = [];
    let j = 1;
    const part = (title, html) => parts.push(`<h2 class="sub">${k}.${j++} ${title}</h2>${html}`);
    if (ik)
      part(
        'Intake and raw-water pumping',
        `<p><b>Purpose.</b> Draw raw water through the screens and pump ${f0(ik.pumps.Qp * 3600 * ik.pumps.nDuty)} m³/h to the inlet works.</p>
      ${ul([`Run ${ik.pumps.nDuty} duty pump(s); keep ${ik.pumps.nStandby} on standby. Rotate duty and standby weekly so that running hours stay similar.`, 'Clean the screens daily and whenever the head loss across them exceeds about 150 mm; remove debris to the skip.', 'Check suction level, delivery pressure, motor current, vibration, gland leakage and bearing temperature every shift.', 'Start a pump against a closed (or partly open) delivery valve, then open the valve slowly; stop it in the reverse order to avoid surge.', 'Record running hours and flow-meter readings every shift.'])}`,
      );
    if (co) {
      const bags =
        co.inputs.form !== 'liquid' ? Math.round((co.tankV * co.inputs.solConc * 10) / num(co.inputs.bagKg)) : 0;
      const jtab = jt?.enabled
        ? `<h3>Dosing table – stroke % of each dosing pump (${jt.sol} % solution, pump ${f0(jt.cap)} L/h at ${jt.inputs.speed} % speed, one pump per stream)</h3>
        ${tbl(
          ['Flow', ...jt.doses.map((D) => `#${D} mg/L`)],
          jt.table.map((row) => [
            `${row.pct} % · ${f0(row.Q)} m³/h`,
            ...row.cells.map((c) => (c > 100 ? '> 100' : f0(c))),
          ]),
        )}
        <p class="small muted">Values outside 10–90 % stroke are inaccurate: change the solution strength or pump speed instead. Latest jar test${jt.inputs.date ? ' (' + esc(dt(jt.inputs.date)) + ')' : ''}: raw ${f0(jt.rawTurb)} NTU → selected dose ${f1(jt.dose)} mg/L, stroke ${f0(jt.sNow)} %.</p>`
        : '';
      part(
        'Coagulant preparation and dosing',
        `<p><b>Purpose.</b> Destabilise particles and colour with ${esc(coagName)}. Design dose ${f1(co.Ddes)} mg/L at ${r.quality.turbMax} NTU; average ${f1(co.Davg)} mg/L. The dose follows the raw-water turbidity: D ≈ ${co.inputs.empA}·Tu^${co.inputs.empB} mg/L until jar tests give better values.</p>
        <h3>Jar test (NWSDB D3 §4.4.3.2) – daily, and whenever raw turbidity changes by more than about 25 %</h3>
        ${ol(['Fill six jars with the same volume of raw water (1 L or 2 L).', `Prepare a ${jt?.inputs?.stockPct ?? 1} % stock solution of the coagulant (1 % = 10 mg/mL; 1 mL in a 1 L jar = 10 mg/L).`, 'Add a range of doses around the present dose (for example 10, 20, 30, 40, 50, 60 mg/L), all at the same moment.', 'Rapid mix 0.5–1 min at full speed; flocculate 5–20 min, reducing the paddle speed from about 80 to 20 rpm; note the floc size and time to appear.', 'Settle 30–60 min. Draw samples from below the surface; measure turbidity and pH.', 'Enter the results in the Jar-test dose calculator. Use the lowest dose that gives the settled-water target, plus a small margin. Floc that settles in < 5 min suits sedimentation; floc still suspended after 30 min suits flotation; pin floc points to direct filtration.'])}
        <h3>Solution preparation (NWSDB D3 §6.1)</h3>
        ${ul([`Two solution tanks of ${f1(co.tankV)} m³ – one in use, one being prepared; each lasts about ${co.inputs.batchHours} h at the design dose.`, bags ? `For a ${co.inputs.solConc} % solution dissolve about <b>${bags} bags of ${co.inputs.bagKg} kg</b> in a full tank; run the agitator until all is dissolved.` : `Dilute the bulk liquid to ${co.inputs.solConc} %.`, `Carrier water dilutes the solution to about ${co.inputs.appliedConc} % at the dosing point (D3 §6.1.3).`, 'Wear gloves, goggles and a dust mask when handling dry coagulant; wash spills with plenty of water.'])}
        <h3>Setting the dose</h3>
        ${ul(['Feed per pump (L/h) = dose (mg/L) × flow per stream (m³/h) ÷ (10 × solution %).', `Check the pump with the calibration column once a shift: the time to draw 1,000 mL at the design dose is shown in the Jar-test calculator (D3 §6.1.5: dose = C × 10⁴ / (T × Q)).`, 'Change the dose in small steps and watch the settled turbidity 1–2 h later (the time water takes to pass the settling tanks).'])}
        ${jtab}
        <h3>Troubleshooting</h3>
        ${tbl(
          ['Problem', 'Likely cause', 'Action'],
          [
            [
              'Small or no floc',
              'dose too low; pH outside the optimum range; low alkalinity',
              'jar test; check pH and alkalinity; add pre-lime',
            ],
            [
              'Floc carries over the weirs',
              'overdose or high flow; sludge build-up',
              'reduce dose per jar test; desludge; check flow split',
            ],
            [
              'Dose drops unexpectedly',
              'empty tank; blocked suction or injector; air lock',
              'change tank; clean strainer and injector; prime the pump',
            ],
            [
              'High residual Al',
              'pH too high or low; overdose; poor filtration',
              'keep coagulation pH 6.0–6.5 (alum); reduce dose; check filters',
            ],
          ],
        )}`,
      );
    }
    if (fl && fl.enabled !== false)
      part(
        'Rapid mixing and flocculation',
        `<p><b>Purpose.</b> Disperse the coagulant within seconds, then grow settleable floc by gentle mixing over ${f0(fl.ttot)} min (velocity gradient tapering ${fl.stages.map((x) => f0(x.Gt)).join(' → ')} s⁻¹).</p>
      ${ul(['Check every shift that the coagulant is entering at the point of most intense mixing (hydraulic jump / mixer).', 'Watch floc size along the basin: small pin floc at the inlet, growing to 1–3 mm at the outlet.', 'Do not let floc break up between the flocculator and the settling tanks (keep transfer velocities 0.15–0.9 m/s, D3 §9.5.2).', 'Drain and clean each basin every 6–12 months; remove sludge and algae from baffles.'])}`,
      );
    if (sd?.enabled) {
      const sludgeV = sl?.sedDS ? sl.sedDS / (num(sl.inputs?.sedSolids, 1) * 10) : 0;
      const zone = sd.N * sd.A * num(sd.inputs?.sludgeDepth, 0.5);
      const dPeak = sludgeV > 0 ? zone / sludgeV : 0;
      const dAvg = sludgeV > 0 && sl.dsDes > 0 ? dPeak * (sl.dsDes / Math.max(sl.dsAvg, 1e-9)) : 0;
      const dd = (x) => (x < 2 ? f1(x) : f0(x));
      part(
        'Sedimentation',
        `<p><b>Purpose.</b> Settle the floc. ${sd.N} tank(s), surface loading ${f1(sd.sorAct)} m³/m²·d, detention ${f2(sd.hrt)} h. Settled-water target ≤ 4 NTU (< 2 preferred).</p>
        ${ul([`Desludge regularly. With sludge drawn at ${num(sl?.inputs?.sedSolids, 1)} % solids the sludge zone (${f0(zone)} m³ in all tanks) fills in about <b>${dd(dPeak)} days at peak-season load</b> (${f0(sl?.sedDS)} kg DS/d) and <b>${dd(dAvg)} days at average load</b>. Desludge each tank at least ${dPeak < 1.5 ? 'twice a day' : 'once a day'} in the wet season and adjust the interval by measuring the sludge depth.`, 'Keep the outlet weirs and launders level and clean; uneven weirs cause short-circuiting.', 'Check scraper or sludge valves daily; open sludge valves fully and briefly so that the sludge does not compact.', 'Measure settled turbidity of each tank every 2 h; a rising value means overload, too little coagulant or sludge carry-over.', 'Drain, inspect and clean each tank at least once a year (one tank at a time, at low demand).'])}`,
      );
    }
    if (ssf)
      part(
        'Slow sand filtration',
        `<p><b>Purpose.</b> Biological and physical treatment in ${fi.N} filters of ${f0(fi.A)} m². Run 24 h a day at a steady rate (intermittent operation is not recommended, D3 §5.12).</p>
      ${ol(['Fill new or cleaned filters from below through the underdrains.', 'Run a new filter to waste at about 25 % of the normal rate for 1–2 weeks until the schmutzdecke forms; after cleaning, run to waste for 1–2 days (no ammonia in the filtrate shows ripening is complete).', 'When the head loss reaches the limit, drain to about 20 cm below the sand and scrape 1.0–2.5 cm of the surface; finish the cleaning in 1–2 days.', 'Re-sand when the bed is down to 0.5–0.8 m.'])}
      ${
        om?.ssf
          ? `<h3>Cleaning timetable</h3>${tbl(
              ['Date', 'Filter', 'Task'],
              om.ssf.rows.slice(0, 8).map((x) => [dt(x.date), 'Filter ' + x.filter, esc(x.task)]),
            )}<p class="small muted">Re-sanding of each filter about every ${f1(om.ssf.years)} years.</p>`
          : ''
      }`,
      );
    else if (om?.bw)
      part(
        'Rapid gravity filtration and backwashing',
        `<p><b>Purpose.</b> Remove the remaining floc. ${fi.N} filters × ${f1(fi.Af)} m² at ${f2(fi.rate)} m/h. ${esc(fi.control || '')}.</p>
      <h3>When to wash (NWSDB D3 §5.9.12)</h3>
      ${ul([`When the head loss reaches ${f1(fi.inputs.termHead)} m, or the filtrate turbidity starts to rise, or the filter has run ${f0(om.bw.run)} h – whichever comes first.`, 'Always wash a filter that has been out of service. Runs longer than one week are not recommended.', 'Wash one filter at a time; the others carry the flow.'])}
      <h3>Backwash procedure</h3>
      ${ol(om.bw.steps.map(([a, b]) => `<b>${esc(a)}.</b> ${esc(b)}`))}
      <h3>Wash timetable – first 7 days</h3>
      ${tbl(
        ['Day', 'Start', 'Filter', '#Hours since last wash'],
        om.bw.events.map((e) => [`${e.day} (${dt(e.date)})`, e.time, 'Filter ' + e.filter, f0(e.since)]),
      )}
      <p class="small muted">Wash water ${f0(om.bw.daily)} m³/d (${f1(om.bw.pct)} % of production; D3: 1–5 %). Return recovered water evenly over 24 h at ≤ 10 % of the raw inflow (D3 §5.9.14).</p>
      <h3>Troubleshooting</h3>
      ${tbl(
        ['Problem', 'Likely cause', 'Action'],
        [
          [
            'Short filter runs',
            'high settled turbidity; mud balls; air binding',
            'improve coagulation and settling; longer or more vigorous washes; keep ≥ 1 m water over the media',
          ],
          ['Turbidity spike after a wash', 'ripening', 'filter to waste; open the outlet slowly'],
          [
            'Media in the wash-water channel',
            'wash rate too high; air and water together too long',
            'reduce the rate; check the timing',
          ],
          ['Uneven wash (boiling spots)', 'damaged underdrain or displaced gravel', 'drain and inspect; repair'],
          [
            'Media depth falling',
            'loss with washing (5–7 %/yr for dual media)',
            'measure twice a year; top up and run two full washes',
          ],
        ],
      )}`,
      );
    part(
      'Disinfection',
      `<p><b>Purpose.</b> Kill pathogens and keep a residual in the network. ${esc(clName)} dose ${f2(ds.totDose)} mg/L; contact tank ${f0(ds.V)} m³ (T₁₀ ${f0(ds.T10)} min); free residual at the outlet ${resid} mg/L (≥ 0.2 mg/L at the far ends of the network).</p>
      ${ul([`Set the chlorinator (${f1(ds.kgH)} kg/h at design flow; feed per hour = dose (mg/L) × flow (m³/h) ÷ 1000). Adjust to keep the outlet residual at ${resid} mg/L.`, 'Measure free chlorine at the outlet every hour and in the network daily.', gas ? `Chlorine containers of ${ds.inputs.cylinder} kg: weigh the container in use every shift; change over before it is empty; keep stock turnover under 3 months (D3 §6.5.1). Only connected containers in the chlorinator room; full and empty containers in the store.` : `Prepare the ${esc(clName)} solution in the day tank; store the product dry, cool and dark – it loses strength with time.`, 'Never stop disinfection. If chlorination fails, stop supply from the plant or switch to the standby chlorinator immediately and inform the OIC.'])}
      ${gas ? `<h3>Container change</h3>${ol(['Wear the gas mask (canister) and gloves; have a second person present.', 'Close the container valve; let the chlorinator draw the line empty (vacuum gauge to zero).', 'Disconnect the yoke; fit the valve cap and hood on the empty container.', 'Connect the new container with a new lead gasket; open the valve ¼ turn.', 'Test for leaks with ammonia vapour (white smoke shows a leak); then open the valve fully (no more than one turn).', 'Record the container number, weight and time.'])}` : ''}`,
    );
    if (st?.apply)
      part(
        'pH correction (stabilisation)',
        `<p><b>Purpose.</b> Raise the pH after filtration so that the water is not corrosive: hydrated lime ${f1((st.kgD * 1000) / d.Qd)} mg/L (${f0(st.kgD)} kg/d at design flow) to pH ≈ ${f2(st.pHfinal)}.</p>
      ${ul(['Check the treated-water pH every hour; keep 6.5–8.5 (SLS 614) and the Langelier index near zero.', 'Keep lime slurry agitated; flush slurry lines after use (they block easily).', 'Wear goggles and gloves – lime burns eyes and skin. Have eye-wash water at hand.'])}`,
      );
    if (sp?.enabled && sp.feMn)
      part(
        'Iron and manganese removal',
        `<p>${esc(sp.feMn.label)} ${f2(sp.feMn.dose)} mg/L ahead of a detention tank of ${f0(sp.feMn.V)} m³ (≥ 20 min, D3 §7.1.5.1). Check Fe and Mn in the filtered water daily (SLS 614: Fe ≤ 0.3, Mn ≤ 0.1 mg/L); black or brown water in the network shows manganese or iron breakthrough.</p>`,
      );
    if (cw)
      part(
        'Clear-water reservoir and treated-water pumping',
        `${ul([`Keep the reservoir (${f0(cw.V)} m³) between its operating levels; never pump it dry.`, `Run ${cw.pumps.nDuty} duty pump(s), ${cw.pumps.nStandby} standby; rotate weekly.`, 'Check that vents and access covers are closed and screened; inspect and clean the reservoir every year (D3 Table 5-38).'])}`,
      );
    if (sl)
      part(
        'Residuals (sludge and wash water)',
        `${ul([`Sludge produced at design load: about ${f0(sl.dsDes)} kg dry solids per day.`, sl.recTank ? `Wash water goes to the recovery tank (${f0(sl.recTank)} m³); return the clear water evenly at ≤ 10 % of the inflow. Do not recycle wash water during algal blooms with toxins or taste and odour (D3 §5.9.12).` : '', sl.nBeds ? `Load the ${sl.nBeds} drying beds in turn; remove cake when it cracks and lifts (about ${sl.inputs.bedCycleDry} days in dry weather, ${sl.inputs.bedCycleWet} in wet weather).` : "Operate the dewatering unit as the manufacturer's manual.", 'Dispose of the cake at the approved site; record loads.'])}`,
      );
    body.push(
      `<section class="page"><h1 class="sec">${k}. Operation of each process</h1>${parts.join('\n')}</section>`,
    );
  }

  // ------------------------------------------------------------ 4 start-up / shut-down
  if (o.startup) {
    const k = sec('Plant start-up and shut-down');
    body.push(`<section class="page"><h1 class="sec">${k}. Plant start-up and shut-down</h1>
      <h2 class="sub">${k}.1 First start-up (commissioning)</h2>
      ${ol(['Check that all units are clean, all valves are in their start position, instruments are calibrated and chemicals, safety equipment and the laboratory are ready.', 'Disinfect tanks, filters and the clear-water reservoir with 50 mg/L chlorine for 24 h (or 10 mg/L for 24 h after cleaning), drain and refill.', ssf ? 'Fill the slow sand filters from below; run to waste at about 25 % of the normal rate for 1–2 weeks until ripened.' : 'Fill the filters slowly from below (≤ 12.2 m/h, D3 §5.9.13); wash each new filter at least twice before use and run to waste until the filtrate is below 0.5 NTU.', 'Start chemical dosing before raw water reaches the dosing point; start raw-water pumps at reduced flow.', 'Increase the flow in steps over several days while checking each unit; record all settings in the commissioning report.', 'Do not supply water until the treated water meets SLS 614 (turbidity, pH, free chlorine, coliforms).'])}
      <h2 class="sub">${k}.2 Daily start-up after a stop</h2>
      ${ol(['Check chemical tanks and the chlorinator; start the carrier water and dosing pumps.', 'Start the raw-water pumps (delivery valve partly open, then open slowly).', 'Check flocculators and settling tanks are flowing evenly; start filters that were washed before the stop.', 'Run filters to waste until the filtrate turbidity is below target; then put them into service.', 'Confirm the outlet chlorine residual before starting the treated-water pumps.'])}
      <h2 class="sub">${k}.3 Planned shut-down</h2>
      ${ol(['Inform the distribution section and consumers in advance.', 'Reduce the flow; stop raw-water pumps; stop chemical dosing when raw water stops reaching the dosing point.', 'Wash filters that are due; isolate the units to be worked on; lock out and tag electrical supplies.', 'Keep chlorination of the reservoir outlet running while supply continues from storage.'])}
      <h2 class="sub">${k}.4 Emergency shut-down</h2>
      <p>Stop the raw-water pumps first, then chemical feeds; never leave dosing running without flow. Close the outlet if the treated water is unsafe. Follow Section 9 for chlorine leaks, power failure and pollution events.</p>
    </section>`);
  }

  // ------------------------------------------------------------ 5 maintenance
  if (o.maint) {
    const k = sec('Maintenance');
    const rows = [
      [
        'Daily',
        'Screens, pumps, dosing pumps, chlorinators, blowers',
        'clean screens; check noise, vibration, temperature, leaks, gland drip; check oil levels; calibrate dosing pumps; check chlorine leak detector indication',
      ],
      [
        'Weekly',
        'Pumps and motors; standby equipment',
        'rotate duty/standby; run the generator on load for 30 min; grease bearings as OEM; test alarms; clean chemical tanks and strainers',
      ],
      [
        'Monthly',
        'Valves, instruments, electrical panels',
        'exercise all valves; calibrate turbidity meters, pH meters and chlorine analysers; tighten terminals; check earthing; clean flow-meter sensors',
      ],
      [
        'Quarterly',
        'Filters, flocculator drives, scrapers',
        'check media depth and mud balls; inspect wash troughs; gearbox oil; check scraper chains / wheels',
      ],
      [
        'Six-monthly',
        'Filter media; flocculation basins',
        'take filter cores (D3 §3.1.7: twice a year); drain and clean flocculators; check the underdrain distribution during a wash',
      ],
      [
        'Yearly',
        'Tanks, reservoir, pressure vessels, electrical',
        'drain, inspect and clean settling tanks and the clear-water reservoir; pressure-test chlorine containers / vessels (D3 §6.5.3); insulation tests; check lightning protection; review spares',
      ],
      [
        'Every 2–3 years',
        'Filter media',
        ssf
          ? 're-sand slow sand filters (D3 Table 5-38)'
          : 'top up or replace lost media; overhaul blowers and backwash pumps',
      ],
    ];
    body.push(`<section class="page"><h1 class="sec">${k}. Maintenance</h1>
      <p>NWSDB D3 §10.4 requires a maintenance management plan (MMP) of preventive and corrective maintenance, supported by an asset register and, where available, a computerised maintenance management system. Replace the general tasks below with the manufacturers' recommendations once the equipment is known.</p>
      <h2 class="sub">${k}.1 Preventive maintenance schedule</h2>
      ${tbl(['Frequency', 'Equipment', 'Tasks'], rows)}
      <h2 class="sub">${k}.2 Equipment data form (D3 Table 10-1)</h2>
      ${tbl(
        ['Item', 'Entry'],
        [
          ['Equipment / tag No.', ''],
          ['Location', ''],
          ['Manufacturer, model, serial No.', ''],
          ['Rating (flow, head, kW, rpm, voltage)', ''],
          ['Supplier and contact', ''],
          ['Date installed / warranty to', ''],
          ['Lubricants and quantities', ''],
          ['Spare parts held', ''],
          ['Maintenance tasks and frequency', ''],
        ],
        'log',
      )}
      <h2 class="sub">${k}.3 Spares to hold</h2>
      ${ul(['Dosing pump diaphragms, valves and seals; chlorinator rotameters, springs and gaskets; lead gaskets for containers.', 'Pump mechanical seals / gland packing, bearings, couplings; motor starters, contactors, fuses.', 'Turbidity, pH and chlorine sensor parts and reagents; filter nozzles and a few metres of each lateral size.'])}
    </section>`);
  }

  // ------------------------------------------------------------ 6 staff
  if (o.staff) {
    const k = sec('Staff and training');
    const sf = r.cost?.staff || {};
    const label = {
      engineer: 'Engineer / OIC',
      chemist: 'Chemist',
      labAsst: 'Laboratory assistants',
      operator: 'Plant operators (3 shifts)',
      fitter: 'Fitters / electricians',
      labourer: 'Labourers',
      security: 'Security',
    };
    body.push(`<section class="page"><h1 class="sec">${k}. Staff and training</h1>
      ${tbl(
        ['Post', '#Number'],
        Object.entries(sf).map(([key, v]) => [label[key] || key, v]),
      )}
      <p class="small muted">Staffing as in the O&amp;M cost estimate of this project – adjust to the NWSDB cadre for the plant.</p>
      ${ul(['Train operators on every SOP in Section 3 before start-up, with the contractor present during commissioning.', 'Chlorine safety, breathing apparatus and first aid: all operators, refreshed yearly with a drill (D3 §6.5.3).', 'Jar testing and the use of the dosing tables: operators and laboratory staff.', 'Keep a training record for each staff member.'])}
    </section>`);
  }

  // ------------------------------------------------------------ 7 laboratory
  if (o.lab) {
    const k = sec('Laboratory');
    body.push(`<section class="page"><h1 class="sec">${k}. Laboratory</h1>
      <p>The laboratory carries out the routine tests of Section 2 and the jar tests. Minimum equipment (NWSDB D3 Table 9-3):</p>
      <p class="small">${LAB_EQUIPMENT.map(esc).join(' · ')}</p>
      ${ul(['Calibrate meters daily (pH buffers 4/7/10; turbidity standards weekly).', 'Keep QA/QC records, chain-of-custody forms for samples sent out, MSDS for every reagent and an inventory of reagents with expiry dates (D3 §10.3).', 'Check analyses with the ion balance and TDS/EC ratios (D3 Ch 3).'])}
    </section>`);
  }

  // ------------------------------------------------------------ 8 safety
  if (o.safety) {
    const k = sec('Safety');
    const chemRows = [
      co && [
        esc(coagName),
        'irritant dust / acidic solution',
        'gloves, goggles, dust mask; wash skin and eyes with water',
      ],
      (st?.apply || co?.limeDose > 0) && [
        'Hydrated lime',
        'caustic – burns eyes and skin',
        'goggles, gloves, dust mask; eye-wash at the lime store',
      ],
      [
        esc(clName),
        gas ? 'toxic gas, heavier than air' : 'corrosive, releases chlorine with acids',
        gas
          ? 'gas mask at the door, breathing apparatus, leak detector, neutralisation'
          : 'gloves, goggles, apron; store away from acids',
      ],
      co?.pac && [
        'Powdered activated carbon',
        'combustible dust; slippery',
        'store separately, dust control (D3 §7.3.2)',
      ],
      co?.polyKgD > 0 && ['Polymer', 'very slippery when wet', 'clean spills with absorbent, not water'],
    ].filter(Boolean);
    body.push(`<section class="page"><h1 class="sec">${k}. Safety</h1>
      <h2 class="sub">${k}.1 General</h2>
      ${ul(['Personal protective equipment as required for each task: helmet, safety shoes, gloves, goggles, ear defenders near blowers and pumps, life jacket near open water.', 'Confined spaces (tanks, chambers, wet wells): permit, gas test, ventilation, harness and a standby person outside.', 'Electrical work: isolate, lock out and tag; test for dead before work.', 'Keep guard rails, covers and handrails in place; keep floors free of chemical spills.', 'Fire extinguishers checked monthly; first-aid boxes stocked; emergency numbers posted in Sinhala, Tamil and English.'])}
      <h2 class="sub">${k}.2 Chemicals</h2>
      ${tbl(['Chemical', 'Hazard', 'Precautions'], chemRows)}
      ${
        gas
          ? `<h2 class="sub">${k}.3 Chlorine (NWSDB D3 §6.5.3)</h2>
      ${ul(['Breathing apparatus (SCBA) and canister gas masks kept <b>outside</b> the chlorine rooms; emergency (repair) kit for the containers in use.', 'Continuous leak detectors with siren; neutralisation (scrubber with 20 % NaOH: 1 kg Cl₂ needs 1.13 kg NaOH) or a leaking-container pit.', 'Ventilation of about one air change per minute with outlets near the floor; switches outside; doors opening outwards; two exits.', 'Only connected containers in the chlorinator room; restrain all containers; keep them out of the sun.', 'Safety shower and eye fountain; wind sock visible from the building; local-language warning boards.', 'Annual pressure-vessel testing and a yearly leak drill.'])}`
          : ''
      }
    </section>`);
  }

  // ------------------------------------------------------------ 9 ERP
  if (o.erp) {
    const k = sec('Emergency response');
    const rows = [
      gas && [
        'Chlorine leak',
        'Sound the alarm; evacuate up-wind; only staff with breathing apparatus enter. Close the container valve; if it leaks at the container, turn the container so that gas (not liquid) leaks and apply the emergency kit; start the scrubber. Call the fire service if not controlled. Account for all staff.',
      ],
      [
        'Power failure',
        'Start the standby generator; restore chlorination first, then raw-water pumping at reduced flow. Stop chemical dosing while there is no flow. Record the times.',
      ],
      [
        'Sudden rise in raw turbidity (flood)',
        'Jar test at once; raise the coagulant dose; reduce the flow if settled water exceeds 4 NTU; wash filters earlier; desludge more often. Stop intake if turbidity exceeds what the plant can treat.',
      ],
      [
        'Pollution of the source (oil, chemicals, algal bloom)',
        'Close the intake if possible; inform the OIC and the regional laboratory; take samples; use PAC for taste, odour or toxins where available; do not recycle wash water.',
      ],
      [
        'Loss of disinfection or low residual',
        'Switch to the standby chlorinator; if not restored, stop supply or issue a boil-water notice with the OIC; flush and re-chlorinate.',
      ],
      [
        'Chemical spill',
        'Contain with the bund or sand; neutralise or dilute as the MSDS; prevent entry to drains; report.',
      ],
      [
        'Failure of filters (turbidity > 1 NTU at the outlet)',
        'Find the filter; take it out of service and wash; improve coagulation; increase chlorine residual and contact time until normal.',
      ],
    ].filter(Boolean);
    body.push(`<section class="page"><h1 class="sec">${k}. Emergency response</h1>
      <p>NWSDB D3 §10.4.5: keep an emergency response plan (ERP) at the plant and update it at least once a year. Post the contact list next to the telephone.</p>
      ${tbl(
        ['Event', 'Actions'],
        rows.map(([a, b]) => [`<b>${a}</b>`, b]),
      )}
      <h2 class="sub">${k}.1 Contacts</h2>
      ${tbl(
        ['Contact', 'Telephone'],
        [
          ['Officer-in-charge (OIC)', ''],
          ['Regional Support Centre', ''],
          ['Regional laboratory', ''],
          ['Ceylon Electricity Board', ''],
          ['Fire service / police / ambulance', '110 / 119 / 1990'],
          ['Hospital', ''],
          ['Chemical suppliers', ''],
        ],
        'log',
      )}
    </section>`);
  }

  // ------------------------------------------------------------ 10 chemicals
  if (o.chem && om) {
    const k = sec('Chemical stock management');
    body.push(`<section class="page"><h1 class="sec">${k}. Chemical stock management</h1>
      <p>Keep at least one month of every chemical (NWSDB D3 §9.1). Order when the stock falls to the reorder level (delivery time + safety stock). Use the oldest stock first.</p>
      ${tbl(
        ['Chemical', '#Dose (mg/L)', '#Use (kg/d)', '#Store (kg)', '#Reorder level (kg)', 'Order quantity'],
        om.chems.map((c) => [
          esc(c.name),
          f2(c.dose),
          f1(c.kgD),
          f0(c.cap),
          f0(c.reorderLevel),
          `${c.orderPacks} × ${esc(c.packName)}`,
        ]),
      )}
      <p class="small muted">At ${f0(om.qDay)} m³/d; delivery time ${om.inputs.lead} days (chlorine ${om.inputs.leadCl}), safety stock ${om.inputs.safety} days. Chemical cost about ${fmtMoney(om.annualCost)} per year at NWSDB Rate Book 2025 prices.</p>
      <h2 class="sub">${k}.1 Monthly consumption (kg)</h2>
      ${tbl(
        ['Month', ...om.chems.map((c) => '#' + c.name.split(' (')[0])],
        om.year.map((row) => [row.month, ...om.chems.map((c) => f0(row.kg[c.key]))]),
      )}
    </section>`);
  }

  // ------------------------------------------------------------ 11 records
  if (o.records) {
    const k = sec('Records, log sheets and reports');
    const hours = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];
    const params = [
      'Raw flow (m³/h)',
      'Raw turbidity (NTU)',
      'Raw pH',
      co && 'Coagulant dose (mg/L) / stroke %',
      co && 'Settled turbidity (NTU)',
      'Filtered turbidity (NTU)',
      'Treated turbidity (NTU)',
      'Treated pH',
      'Free chlorine (mg/L)',
      'Reservoir level (m)',
      'Treated flow (m³/h)',
    ].filter(Boolean);
    body.push(`<section class="page"><h1 class="sec">${k}. Records, log sheets and reports</h1>
      ${ul(['Daily operation log (below) – every 2 h, signed by the shift operator.', 'Filter log – each wash: filter, time, head loss and turbidity before the wash, duration.', 'Chemical stock card – receipts, issues and balance of each chemical, checked weekly against a physical count.', 'Maintenance record – work done, parts used, running hours.', 'Monthly report to the RSC: production, chemicals used and cost, energy, water quality summary against SLS 614, incidents, maintenance.'])}
      <h2 class="sub">${k}.1 Daily operation log</h2>
      <p class="small">Plant: ${esc(s.name)} · Date: ____________ · Shift operators: ______________________</p>
      ${tbl(
        ['Parameter', ...hours],
        params.map((p) => [p, ...hours.map(() => '')]),
        'log',
      )}
      <h2 class="sub">${k}.2 Daily operations checklist (D3 Table 10-2)</h2>
      ${tbl(
        ['Check', 'Shift 1', 'Shift 2', 'Shift 3'],
        [
          'Screens cleaned',
          'Pumps – noise, vibration, leaks',
          'Dosing pumps calibrated',
          'Solution tanks – level, next tank ready',
          'Chlorine – container weight, leak detector',
          'Floc and settled water appearance',
          'Filters washed as timetable',
          'Sludge valves operated',
          'Laboratory tests done',
          'Generator / power checked',
        ].map((c) => [c, '', '', '']),
        'log',
      )}
      <h2 class="sub">${k}.3 Chemical stock card</h2>
      ${tbl(
        ['Date', 'Received (kg)', 'Issued (kg)', 'Balance (kg)', 'Signature'],
        Array.from({ length: 8 }, () => ['', '', '', '', '']),
        'log',
      )}
    </section>`);
  }

  const tocHTML = `<section class="page"><h1 class="sec">Contents</h1><ol class="toc">${toc.map((t) => `<li>${esc(t.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>
    ${box('warn', "<b>Draft.</b> Generated from the design. Complete and confirm with the contractor's equipment data, commissioning results and NWSDB O&amp;M practice before issue.")}</section>`;
  const trial = isTrial()
    ? `<div class="trialmark">TRIAL VERSION<small>not for issue</small></div><div class="trialtag">${trialLabel()}</div>`
    : '';
  const head = word
    ? `<meta charset="utf-8"><title>${esc(s.name)} – O&amp;M manual</title><style>${REPORT_CSS}${MANUAL_CSS}.page{page-break-after:always}.cover{height:auto}</style>`
    : `<meta charset="utf-8"><base href="${base}"><title>${esc(s.name)} – O&amp;M manual</title><style>${REPORT_CSS}${MANUAL_CSS}</style>`;
  return `<!doctype html><html><head>${head}</head><body>${trial}${cover}${tocHTML}${body.join('\n')}</body></html>`;
}
function num(v, dflt = 0) {
  const x = +v;
  return Number.isFinite(x) ? x : dflt;
}
