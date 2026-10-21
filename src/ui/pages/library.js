// Design report, criteria library, engineering toolbox, help and settings
import { CRITERIA, rangeText } from '../../core/criteria.js';
import * as D2M from '../../core/d2.js';
import { DN, G, fmt, fmtAuto, hwLoss, vel } from '../../core/util.js';
import { DOsat, mu, nu, pHs, rho, stability, stokes, lsiText, pVap } from '../../core/water.js';
import JSZip from 'jszip';
import { h, icon, toast } from '../dom.js';
import { emblemSVG } from '../brand.js';
import { REPORT_SECTIONS, buildReport } from '../report.js';
import { card, chartCard, checksTable, kpis, saveFile, statusBadge, table } from '../results.js';
import { PAGES } from './registry.js';
import { buildWorkbook } from '../xlsx.js';
import { navigate, resetCriteria, saveSettings, setCriteria, store } from '../store.js';
import { drawingDXF, drawingSVG } from '../draw/render.js';
import * as U from '../draw/units.js';

const f2 = (v) => fmt(v, 2);

// ------------------------------------------------------------------ Report
export const report = {
  id: 'report', title: 'Design report & exports', sub: 'PDF design report, Excel workbook, drawing pack (DXF/SVG)', icon: 'file', group: 'Outputs', layout: 'full',
  state: { opts: Object.fromEntries(REPORT_SECTIONS.map(([k]) => [k, true])) },
  renderFull() {
    const st = report.state;
    const frame = h('iframe', { class: 'report-frame', title: 'Report preview' });
    const refresh = () => { frame.srcdoc = buildReport(st.opts); };
    const opts = h('div', { class: 'pill-row' }, REPORT_SECTIONS.map(([k, l]) => {
      const sw = h('div', { class: 'switch' + (st.opts[k] ? ' on' : '') });
      return h('div', { class: 'chk', style: { marginRight: '14px' }, onclick: () => { st.opts[k] = !st.opts[k]; sw.classList.toggle('on', st.opts[k]); refresh(); } }, sw, l);
    }));
    const exportPDF = async () => {
      const html = buildReport(st.opts);
      const name = (store.project.inputs.setup.code || 'WTP') + '-design-report.pdf';
      if (window.wtp?.exportPDF) { toast('Generating PDF…', 'file'); const p = await window.wtp.exportPDF(html, name, store.project.inputs.setup.name); if (p) toast('Report saved: ' + p.split(/[\\/]/).pop()); }
      else { const w = frame.contentWindow; w.focus(); w.print(); }
    };
    const exportXLSX = async () => { const data = await buildWorkbook(); saveFile((store.project.inputs.setup.code || 'WTP') + '-design.xlsx', new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); };
    const exportDrawings = async () => {
      const r = store.results;
      const zip = new JSZip();
      const list = [U.intakeSection(r.intake), r.process.has.aeration ? U.aeratorSection(r.aeration) : null, U.rapidMixDrawing(r.rapidmix), U.flocDrawing(r.floc), U.sedPlan(r.sed), U.sedSection(r.sed), U.filterPlan(r.filt), U.filterSection(r.filt, r.hyd), U.contactPlan(r.dis), U.cwrPlan(r.storage), U.hydraulicProfile(r.hyd), U.layoutPlan(r.layout)].filter(Boolean);
      list.forEach((dw, i) => {
        const base = String(i + 1).padStart(2, '0') + '-' + dw.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
        zip.file(base + '.dxf', drawingDXF(dw));
        zip.file(base + '.svg', drawingSVG(dw, { statik: true }).svg);
      });
      const data = await zip.generateAsync({ type: 'uint8array' });
      saveFile((store.project.inputs.setup.code || 'WTP') + '-drawings.zip', new Blob([data], { type: 'application/zip' }), 'application/zip');
    };
    setTimeout(refresh, 30);
    return [
      kpis([
        { label: 'Design report (PDF)', value: 'A4', sub: 'cover, summary, every unit, drawings, charts, calculation sheets', icon: 'file' },
        { label: 'Excel workbook', value: '10 sheets', sub: 'inputs, calculations, checks, BOQ, O&M, loads', icon: 'sheet' },
        { label: 'Drawing pack', value: 'DXF + SVG', sub: 'AutoCAD R12 DXF, layers per element', icon: 'pen' },
      ]),
      card('Report contents', opts, { actions: [
        h('button', { class: 'btn primary', onclick: exportPDF }, icon('fileDown'), 'Export PDF'),
        h('button', { class: 'btn', onclick: exportXLSX }, icon('sheet'), 'Excel'),
        h('button', { class: 'btn', onclick: exportDrawings }, icon('pen'), 'Drawings (ZIP)'),
        h('button', { class: 'btn ghost', onclick: refresh }, icon('reset'), 'Refresh'),
      ] }),
      frame,
    ];
  },
};

// ------------------------------------------------------------------ Criteria library
export const criteria = {
  id: 'criteria', title: 'Design criteria library', sub: 'Acceptable ranges used by every design check – edit to match current NWSDB design criteria', icon: 'book', group: 'Library', layout: 'full',
  renderFull() {
    const over = store.project.criteria || {};
    const groups = [...new Set(Object.values(CRITERIA).map((c) => c.group))];
    const out = [h('div', { class: 'notes' }, h('div', { class: 'note info' }, icon('info'), h('div', { html: 'Values marked <b>LN</b> follow the lecture notes supplied with this project. Edited values are saved with the project file and highlighted. Hard limits (where given) turn a check red; the min–max range turns it amber.' })))];
    out.push(h('div', { style: { marginBottom: '12px' } }, h('button', { class: 'btn', onclick: () => { resetCriteria(); navigate('criteria'); toast('Criteria reset to defaults'); } }, icon('reset'), 'Reset all to defaults')));
    for (const g of groups) {
      const rows = Object.entries(CRITERIA).filter(([, c]) => c.group === g);
      const tbl = h('table', { class: 'res' }, h('thead', null, h('tr', null, ['Criterion', 'Min', 'Max', 'Unit', 'Range used', 'Source', ''].map((t) => h('th', null, t)))));
      const tb = h('tbody');
      for (const [k, c0] of rows) {
        const c = { ...c0, ...(over[k] || {}) };
        const edited = !!over[k];
        const inp = (field) => { const i = h('input', { type: 'number', step: 'any', value: Number.isFinite(c[field]) && Math.abs(c[field]) < 1e8 ? c[field] : '', style: { width: '90px', height: '26px', border: '1px solid var(--border)', borderRadius: '5px', textAlign: 'right', background: edited ? 'var(--warn-bg)' : 'var(--surface)' } }); i.addEventListener('change', () => { const v = parseFloat(i.value); if (Number.isFinite(v)) setCriteria(k, field, v); }); return i; };
        tb.append(h('tr', null, h('td', null, c.label, h('div', { class: 'small muted mono' }, k)), h('td', null, inp('min')), h('td', null, inp('max')), h('td', null, c.unit), h('td', null, rangeText(c)), h('td', { class: 'small muted' }, c.src), h('td', null, edited ? h('button', { class: 'btn sm ghost', title: 'Reset', onclick: () => { resetCriteria(k); navigate('criteria'); } }, icon('reset')) : null)));
      }
      tbl.append(tb);
      out.push(card(g, tbl, { flush: true }));
    }
    return out;
  },
};

// ------------------------------------------------------------------ Engineering toolbox
function tool(title, fields, compute) {
  const vals = Object.fromEntries(fields.map((f) => [f.k, f.v]));
  const outBox = h('div', { class: 'tool-out kv-list' });
  const upd = () => {
    outBox.innerHTML = '';
    try { for (const [k, v, u] of compute(vals)) outBox.append(h('span', { class: 'k' }, k), h('span', { class: 'v' }, typeof v === 'number' ? fmtAuto(v) : v, ' ', h('span', { class: 'muted', style: { fontWeight: 400 } }, u || ''))); } catch (e) { outBox.append(h('span', { class: 'k' }, 'Error'), h('span', null, e.message)); }
  };
  const body = h('div', null, fields.map((f) => {
    let ctl;
    if (f.o) { ctl = h('select', null, f.o.map(([v, l]) => h('option', { value: v }, l))); ctl.value = f.v; ctl.addEventListener('change', () => { vals[f.k] = ctl.value; upd(); }); }
    else { ctl = h('input', { type: 'number', step: 'any', value: f.v }); ctl.addEventListener('input', () => { const v = parseFloat(ctl.value); if (Number.isFinite(v)) { vals[f.k] = v; upd(); } }); }
    return h('div', { class: 'field' }, h('label', null, f.l), h('div', { class: 'inp' }, ctl, f.u ? h('span', { class: 'u' }, f.u) : null));
  }), outBox);
  upd();
  return h('div', { class: 'card tool-card' }, h('div', { class: 'card-h' }, title), h('div', { class: 'card-b' }, body));
}
export const toolbox = {
  id: 'toolbox', title: 'Engineering toolbox', sub: 'Quick calculators for day-to-day NWSDB design and operations work', icon: 'calculator', group: 'Library', layout: 'full',
  renderFull() {
    return [h('div', { class: 'grid3' },
      tool('Pipe flow – Hazen–Williams', [{ k: 'Q', l: 'Flow', u: 'm³/h', v: 500 }, { k: 'D', l: 'Internal diameter', u: 'mm', v: 300 }, { k: 'L', l: 'Length', u: 'm', v: 1000 }, { k: 'C', l: 'C value', v: 130 }], (x) => { const Q = x.Q / 3600, D = x.D / 1000; const hf = hwLoss(Q, D, x.L, x.C); return [['Velocity', vel(Q, D), 'm/s'], ['Head loss', hf, 'm'], ['Hydraulic gradient', hf / x.L * 1000, 'm/km'], ['Suggested DN (1.2 m/s)', DN.find((d) => vel(Q, d / 1000) <= 1.2) || '>2200', 'mm']]; }),
      tool('Flow-unit converter', [{ k: 'v', l: 'Value', v: 42000 }, { k: 'u', l: 'From', v: 'm3d', o: [['m3d', 'm³/d'], ['m3h', 'm³/h'], ['lps', 'L/s'], ['mld', 'MLD'], ['mgd', 'Imp. MGD'], ['usmgd', 'US MGD']] }], (x) => { const toM3d = { m3d: 1, m3h: 24, lps: 86.4, mld: 1000, mgd: 4546.09, usmgd: 3785.41 }[x.u]; const q = x.v * toM3d; return [['m³/d', q], ['m³/h', q / 24], ['L/s', q / 86.4], ['MLD', q / 1000], ['Imperial MGD', q / 4546.09], ['US MGD', q / 3785.41]]; }),
      tool('Water properties', [{ k: 'T', l: 'Temperature', u: '°C', v: 28 }, { k: 'z', l: 'Elevation', u: 'm', v: 20 }], (x) => [['Density', rho(x.T), 'kg/m³'], ['Dynamic viscosity', mu(x.T) * 1000, 'mPa·s'], ['Kinematic viscosity', nu(x.T) * 1e6, 'mm²/s'], ['Vapour pressure', pVap(x.T), 'kPa'], ['DO saturation', DOsat(x.T, x.z), 'mg/L']]),
      tool('Stokes settling velocity', [{ k: 'd', l: 'Particle diameter', u: 'µm', v: 20 }, { k: 'rp', l: 'Particle density', u: 'kg/m³', v: 2650 }, { k: 'T', l: 'Temperature', u: '°C', v: 28 }, { k: 'H', l: 'Tank depth', u: 'm', v: 3.5 }], (x) => { const v = stokes(x.d * 1e-6, x.rp, x.T); const Re = v * x.d * 1e-6 / nu(x.T); return [['Settling velocity', v * 3600, 'm/h'], ['', v * 1000, 'mm/s'], ['Reynolds number', Re, Re < 1 ? '(Stokes valid)' : '(Stokes not valid)'], ['Time to settle depth', x.H / v / 3600, 'h'], ['Equivalent SOR', v * 86400, 'm³/m²·d']]; }),
      tool('Chemical feed rate', [{ k: 'Q', l: 'Plant flow', u: 'm³/d', v: 42000 }, { k: 'D', l: 'Dose', u: 'mg/L', v: 30 }, { k: 'c', l: 'Solution strength', u: '% w/v', v: 8 }, { k: 'p', l: 'Product purity', u: '%', v: 100 }], (x) => { const kg = x.D * x.Q / 1000 / (x.p / 100); return [['Product required', kg, 'kg/d'], ['', kg / 24, 'kg/h'], ['Solution feed', kg / (x.c * 10) * 1000 / 24, 'L/h'], ['Monthly product', kg * 30.4 / 1000, 't/month']]; }),
      tool('Langelier & Ryznar indices', [{ k: 'pH', l: 'pH', v: 7.5 }, { k: 'T', l: 'Temperature', u: '°C', v: 28 }, { k: 'tds', l: 'TDS', u: 'mg/L', v: 120 }, { k: 'ca', l: 'Calcium hardness', u: 'mg/L CaCO₃', v: 40 }, { k: 'alk', l: 'Alkalinity', u: 'mg/L CaCO₃', v: 40 }], (x) => { const s = stability({ pH: x.pH, TDS: x.tds, T: x.T, caH: x.ca, alk: x.alk }); return [['pHs', s.pHs], ['LSI', s.LSI, lsiText(s.LSI)], ['Ryznar (RSI)', s.RSI], ['Aggressive index', s.AI, s.AI < 10 ? 'very aggressive' : s.AI < 12 ? 'moderately aggressive' : 'non-aggressive']]; }),
      tool('Weir & flume discharge – D2 §4.6', [{ k: 't', l: 'Structure', v: 'rectFull', o: Object.entries(D2M.WEIRS).map(([k, w]) => [k, w.label]) }, { k: 'h', l: 'Head (h or H)', u: 'mm', v: 250 }, { k: 'b', l: 'Crest / throat width', u: 'm', v: 1.0 }, { k: 'P', l: 'Crest height above floor', u: 'm', v: 0.6 }], (x) => { const q = D2M.WEIRS[x.t].Q(x.h / 1000, x.b, x.P); return [['Discharge', q * 1000, 'L/s'], ['', q * 86400, 'm³/d'], ['Head gauge upstream', `${fmt(4 * x.h / 1000, 2)}–${fmt(5 * x.h / 1000, 2)}`, 'm'], ['g (Sri Lanka)', D2M.G_SL, 'm/s²']]; }),
      tool('Rational flood & time of concentration – D2 §4.8', [{ k: 'A', l: 'Catchment area', u: 'ha', v: 500 }, { k: 'L', l: 'Longest watercourse', u: 'm', v: 3000 }, { k: 'H', l: 'Fall over length', u: 'm', v: 60 }, { k: 'C', l: 'Runoff coefficient (0 = by slope)', v: 0 }, { k: 'I', l: 'Rainfall intensity for tc', u: 'mm/h', v: 90 }], (x) => { const sl = (x.H / x.L) * 100; const C = x.C > 0 ? x.C : D2M.runoffCforCatchment(sl); return [['Average slope', sl, '%'], ['tc (Kirpich)', D2M.kirpich(x.L, x.H), 'min'], ['tc (stream velocity)', D2M.tcVelocity(x.L, sl, 10), 'min'], ['Runoff coefficient', C, ''], ['Peak flow Q = CIA/360', D2M.rational(C, x.I, x.A), 'm³/s'], ['Valid (≤ 50 km²)', x.A <= 5000 ? 'yes' : 'no – over-estimates', '']]; }),
      tool('Pipe class, surge & thrust – D2 §7', [{ k: 'm', l: 'Material', v: 'di', o: Object.entries(D2M.PIPE_MATERIALS).map(([k, m]) => [k, m.label]) }, { k: 'dn', l: 'Nominal diameter', u: 'mm', v: 400 }, { k: 'H', l: 'Sustained head', u: 'm', v: 60 }, { k: 'v', l: 'Velocity', u: 'm/s', v: 1.2 }, { k: 'a', l: 'Wave speed', u: 'm/s', v: 1000 }, { k: 'T', l: 'Water temperature', u: '°C', v: 28 }], (x) => { const dH = D2M.joukowsky(x.a, x.v); const c = D2M.selectClass(x.m, x.dn, x.H, dH, x.T); return [['Surge head (Joukowsky)', dH, 'm'], ['Class selected', c.cls, ''], ['Working pressure', c.wpM, 'm'], ['Sustained + surge / rating', (x.H + dH) / c.wpM, c.ok ? 'OK' : 'needs surge protection'], ['Design C (Fig 7.6, at v)', D2M.cVelocity(D2M.cDesign(x.m, x.dn), x.v), ''], ['Thrust, 90° bend at 1.5 H', D2M.thrust(x.dn, (1.5 * x.H) / 10.197, 90) / 1000, 'kN'], ['Air valve / washout', `${D2M.airValveSize(x.dn)} / ${D2M.washoutSize(x.dn)}`, 'mm']]; }),
      tool('Value of pump efficiency – D2 §6.2.5', [{ k: 'kw', l: 'Water power', u: 'kW', v: 110 }, { k: 'eta', l: 'Datum efficiency', u: '%', v: 85 }, { k: 'h', l: 'Running hours', u: 'h/yr', v: 8760 }, { k: 'c', l: 'Energy cost', u: 'LKR/kWh', v: 26 }, { k: 'r', l: 'Discount rate', u: '%', v: 10 }, { k: 'n', l: 'Period', u: 'years', v: 10 }], (x) => { const e0 = x.kw / (x.eta / 100), e1 = x.kw / ((x.eta + 1) / 100); const save = (e0 - e1) * x.h * x.c; const pv = save * (1 - (1 + x.r / 100) ** -x.n) / (x.r / 100); return [['Input power at datum', e0, 'kW'], ['Annual saving per +1 % efficiency', save, 'LKR/yr'], ['Capital value of 1 % efficiency', pv, 'LKR'], ['Use to rank tenders', 'bonus / penalty per point', '']]; }),
      tool('Present value & equivalent annual cost – D2 §10.3', [{ k: 'C', l: 'Capital cost', u: 'LKR Mn', v: 1000 }, { k: 'om', l: 'Annual O&M', u: 'LKR Mn', v: 60 }, { k: 'r', l: 'Discount rate', u: '%', v: 10 }, { k: 'n', l: 'Life', u: 'years', v: 20 }, { k: 'Q', l: 'Water produced', u: 'm³/d', v: 40000 }], (x) => { const r = x.r / 100; const E = D2M.eac(x.C, r, x.n); let pv = x.C; for (let t = 1; t <= x.n; t++) pv += D2M.presentValue(x.om, r, t); return [['Equivalent annual cost of capital', E, 'LKR Mn/yr'], ['Total annual cost', E + x.om, 'LKR Mn/yr'], ['Unit cost of water', ((E + x.om) * 1e6) / (x.Q * 365), 'LKR/m³'], ['Present value (capital + O&M)', pv, 'LKR Mn']]; }),
      tool('Velocity gradient G', [{ k: 'P', l: 'Power to water', u: 'W', v: 2000 }, { k: 'V', l: 'Volume', u: 'm³', v: 100 }, { k: 'T', l: 'Temperature', u: '°C', v: 28 }, { k: 't', l: 'Detention', u: 'min', v: 20 }], (x) => { const Gv = Math.sqrt(x.P / (mu(x.T) * x.V)); return [['G', Gv, 's⁻¹'], ['Gt', Gv * x.t * 60, ''], ['Head-loss equivalent', x.P / (rho(x.T) * G * (x.V / (x.t * 60))), 'm']]; }),
      tool('Open channel – Manning', [{ k: 'b', l: 'Channel width', u: 'm', v: 1.2 }, { k: 'y', l: 'Water depth', u: 'm', v: 0.8 }, { k: 's', l: 'Slope', u: 'm/m', v: 0.0005 }, { k: 'n', l: 'Manning n', v: 0.013 }], (x) => { const A = x.b * x.y, P = x.b + 2 * x.y, R = A / P; const V = (1 / x.n) * R ** (2 / 3) * Math.sqrt(x.s); return [['Velocity', V, 'm/s'], ['Discharge', V * A * 3600, 'm³/h'], ['', V * A * 86400, 'm³/d'], ['Froude number', V / Math.sqrt(G * x.y), '']]; }),
    )];
  },
};
void pHs;

// ------------------------------------------------------------------ NWSDB Design Manual D2
const MOD_PAGE = { demand: 'demand', source: 'source', intake: 'intake', storage: 'storage', hyd: 'hyd', layout: 'layout', energy: 'energy', cost: 'cost' };
export const d2manual = {
  id: 'd2manual', title: 'NWSDB Design Manual D2', sub: 'Urban Water Supply and Distribution (March 1989) – clauses, tables and project compliance', icon: 'landmark', group: 'Library', layout: 'full',
  state: { tab: 'compliance', q: '' },
  renderFull(r) {
    const st = d2manual.state;
    const d2 = r.d2;
    const pageTitle = (mod) => PAGES.find((p) => p.mod === mod)?.title || mod;
    const worst = (list) => (list.some((c) => c.status === 'fail') ? 'fail' : list.some((c) => c.status === 'warn') ? 'warn' : list.length ? 'ok' : 'na');
    const body = h('div');
    const tabs = [['compliance', 'Project compliance', 'checks'], ['clauses', 'Clause index', 'book'], ['tables', 'Design tables', 'table'], ['basins', 'River basins (Table 4.1)', 'rain']];
    const seg = h('div', { class: 'seg' }, tabs.map(([k, l, ic]) => h('button', { class: st.tab === k ? 'on' : '', onclick: () => { st.tab = k; navigate('d2manual'); } }, icon(ic), l)));
    if (st.tab === 'compliance') {
      body.append(card('Checks against D2 in this project', checksTable(d2.checks.map((c) => ({ ...c, moduleLabel: `${pageTitle(c.module)} · ${c.clause}` })), { showModule: true, onRow: (c) => MOD_PAGE[c.module] && navigate(MOD_PAGE[c.module]) }), { flush: true, sub: 'click a row to open the design page' }));
    } else if (st.tab === 'clauses') {
      const parts = (x) => String(x).split('.').map(Number);
      const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d; } return 0; };
      const pre = (a, b) => b.every((v, i) => a[i] === v);
      const rng = (txt) => { const m = String(txt).replace(/^§/, '').split(/[–-]/).map((t) => t.trim()); return [parts(m[0]), parts(m[m.length - 1])]; };
      const overlap = (c, cl) => {
        if (/^(Table|Fig)/.test(cl) || /^(Table|Fig)/.test(c)) return c.replace(/\s+/g, ' ') === cl.replace(/\s+/g, ' ');
        const [a, b] = rng(c), [lo, hi] = rng(cl);
        return (cmp(b, lo) >= 0 || pre(b, lo)) && (cmp(a, hi) <= 0 || pre(a, hi));
      };
      const rows = D2M.CLAUSES.map(([cl, title, rule, mod]) => { const list = d2.checks.filter((c) => c.clause && overlap(c.clause, cl)); return { cl, title, rule, mod, n: list.length, st: worst(list) }; });
      body.append(card('How D2 is applied in this application', table([
        { k: 'cl', l: 'Clause', v: (x) => h('b', null, x.cl.startsWith('Table') ? x.cl : '§' + x.cl) }, { k: 'title', l: 'Subject' }, { k: 'rule', l: 'Rule applied', v: (x) => h('span', { class: 'small' }, x.rule) },
        { k: 'mod', l: 'Applied in', v: (x) => h('a', { href: '#', onclick: (e) => { e.preventDefault(); navigate(MOD_PAGE[x.mod] || x.mod); } }, pageTitle(x.mod)) },
        { k: 'n', l: 'Checks', num: true }, { k: 'st', l: 'Status', v: (x) => (x.n ? statusBadge(x.st) : h('span', { class: 'small muted' }, 'guidance')) },
      ], rows), { flush: true, sub: `${D2M.D2.title} · companions: ${D2M.D2.companions.map(([c, t]) => c + ' ' + t).join(', ')}` }));
    } else if (st.tab === 'tables') {
      const sizes = [100, 200, 300, 450, 600, 800, 900, 1000, 1200];
      body.append(h('div', { class: 'grid2' },
        card('§2.4 Design periods', table([{ k: 'item', l: 'Component' }, { k: 'years', l: 'Years', num: true }, { k: 'remark', l: 'Remark' }], D2M.DESIGN_PERIODS), { flush: true }),
        card('§3.2.1 Domestic demand', table([{ k: 'label', l: 'Community' }, { k: 'hc', l: 'HC %', v: (c) => (c.hc ? c.hc.join('–') : '–') }, { k: 'hcLpcd', l: 'HC L/c/d', v: (c) => c.hcLpcd ?? '–' }, { k: 'sp', l: 'SP %', v: (c) => (c.sp ? c.sp.join('–') : '–') }, { k: 'spLpcd', l: 'SP L/c/d' }], D2M.COMMUNITY.slice(1)), { flush: true, sub: 'charges ≤ about 5 % of income (§3.2.2)' }),
        card('§3.2.3 Non-domestic unit demands', table([{ k: 'label', l: 'Use' }, { k: 'per', l: 'Per' }, { k: 'r', l: 'L/d', v: (x) => `${x.min}–${x.max}` }], D2M.NON_DOMESTIC), { flush: true, sub: 'small urban & rural ≈ 10 % of domestic' }),
        card('§3.2.4–3.2.5 UFW & peaking', table([{ k: 'a', l: 'Item' }, { k: 'b', l: 'Value' }], [{ a: 'UFW – new, tight system', b: '10–15 %' }, { a: 'UFW – rehabilitated system', b: '20–25 % or more' }, { a: 'Maximum day < 20,000 pop.', b: '1.10 × mean' }, { a: 'Maximum day > 20,000 pop.', b: '1.25 × mean' }, { a: 'Peak hour, smaller urban', b: '2.5 × mean' }, { a: 'Peak hour > 20,000 pop.', b: '2.0 × mean' }, { a: 'Raw-water works & treatment plant', b: '1.05–1.10 × max day' }]), { flush: true }),
        card('Table 6.2 Pump & motor efficiencies', table([{ k: 'label', l: 'Type' }, { k: 'p', l: 'Pump', v: (x) => x.pump.map((v) => v * 100).join('–') + ' %' }, { k: 'm', l: 'Motor', v: (x) => x.motor.map((v) => v * 100).join('–') + ' %' }], Object.values(D2M.PUMP_TYPES)), { flush: true, sub: 'stand-by: 1/1/1/2/2 for 1–5 duty (§6.4.1)' }),
        card('Tables 7.1–7.2 Pipe working pressures', table([{ k: 'label', l: 'Material' }, { k: 'c', l: 'Classes (bar)', v: (x) => x.list }], Object.entries(D2M.PIPE_MATERIALS).map(([k, m]) => ({ label: m.label, list: k === 'di' ? 'K9: 80–300 → 40, 350–600 → 25, 700–1200 → 16' : m.classes(300).map((c) => `${c.cls} ${c.bar}`).join(', ') }))), { flush: true, sub: 'sustained + surge ≤ 1.1 × rating (DI, steel); uPVC surge within rating' }),
        card('Fig 7.6 Design Hazen–Williams C & §7.4 valve sizes', table([{ k: 'dn', l: 'DN', num: true }, { k: 'lined', l: 'Lined / AC', num: true }, { k: 'ci', l: 'Coated spun iron', num: true }, { k: 'av', l: 'Air valve (mm)' }, { k: 'wo', l: 'Washout (mm)', num: true }], sizes.map((dn) => ({ dn, lined: D2M.cDesign('di', dn), ci: D2M.cDesign('ci', dn), av: D2M.airValveSize(dn), wo: D2M.washoutSize(dn) }))), { flush: true, sub: 'velocity 0.6 – 1.6 (2.5) m/s; air valves ≤ 500 m apart' }),
        chartCard('§9.2 Default consumption pattern', { type: 'bar', data: D2M.DIURNAL_PCT.map((v, i) => ({ h: String(i).padStart(2, '0'), v })), x: { key: 'h', label: 'Hour' }, y: { label: '% of daily demand' }, series: [{ key: 'v', label: '% of daily demand' }], unit: '%', height: 230 }, { sub: 'storage: small schemes 50/33/25 % for 18–24/12–18/9–12 h supply; larger ≥ 8 h of max day' }),
        card('Table 4.3 Runoff coefficients', table([{ k: '0', l: 'Type of area' }, { k: '1', l: '≤ 2 %', num: true }, { k: '2', l: '2–10 %', num: true }, { k: '3', l: '> 10 %', num: true }], D2M.RUNOFF_AREAS.map((a) => ({ 0: a[0], 1: a[1], 2: a[2], 3: a[3] }))), { flush: true, sub: 'catchments: 0.3 / 0.4 / 0.5 for slopes < 2 / 2–4 / > 4 %' }),
        card('§10.2 Cost-estimate format', table([{ k: 'a', l: 'Item' }, { k: 'b', l: 'Allowance' }], [{ a: 'Line items incl. contractor OH&P', b: '35 %' }, { a: 'Preliminaries', b: '½–1 % of ECC' }, { a: 'O&M for 2 years', b: 'included' }, { a: 'Engineering design & supervision', b: '8 % (6 + 2)' }, { a: 'Physical contingencies', b: '10–15 % feasibility · 20 % pre-feasibility' }, { a: 'BTT (1989)', b: '3 %' }, { a: 'Price escalation for funding', b: '10–15 % p.a.' }, { a: 'O&M line items – NWSDB/LA overhead', b: '35 %' }, { a: 'O&M repairs (M&E) · contingency', b: '1 % · 10 %' }, { a: 'Discount rate (PV / EAC)', b: '8–15 %' }]), { flush: true }),
        card('§10.2 Facilities & §2.3 site checklist', h('div', { class: 'small', html: '<b>Facilities:</b> ' + D2M.FACILITIES.join(' · ') + '<br><br><b>Site planning:</b> ' + D2M.SITE_CHECKLIST.join(' · ') })),
      ));
    } else {
      const q = h('input', { type: 'text', placeholder: 'Search basin name or code…', value: st.q, style: { width: '260px' } });
      const tb = h('div');
      const fill = () => { const t = st.q.toLowerCase(); tb.replaceChildren(table([{ k: 'code', l: 'Code', num: true }, { k: 'name', l: 'River basin' }, { k: 'area', l: 'Area (km²)', num: true, fmt: (v) => fmt(v, 0) }, { k: 'rain', l: 'Rainfall (mm)', num: true, fmt: (v) => fmt(v, 0) }, { k: 'runoff', l: 'Runoff (mm)', num: true, fmt: (v) => fmt(v, 0) }, { k: 'factor', l: 'Runoff factor %', num: true }, { k: 'unit', l: 'Unit runoff (m³/d/km²)', num: true, fmt: (v) => fmt(v, 0) }], D2M.BASINS.filter((b) => !t || b.name.toLowerCase().includes(t) || String(b.code) === t))); };
      q.addEventListener('input', () => { st.q = q.value; fill(); });
      fill();
      body.append(card('Table 4.1 – River basin characteristics (103 basins)', h('div', null, h('div', { class: 'inp', style: { margin: '10px 14px' } }, q), tb), { flush: true, sub: 'source: CEB Water Resources Data Base (D2 Ref. 4)' }));
    }
    return [
      kpis([
        { label: 'D2 checks', value: d2.total, sub: `${d2.ok} pass · ${d2.warn} review · ${d2.fail} fail · ${d2.info} info`, icon: 'landmark', accent: true, status: d2.fail ? 'fail' : d2.warn ? 'warn' : 'ok' },
        { label: 'Clauses applied', value: new Set(d2.checks.map((c) => c.clause)).size, sub: `${D2M.CLAUSES.length} clause groups indexed` },
        { label: 'Pages applying D2', value: new Set(d2.checks.map((c) => c.module)).size, sub: 'demand, source, intake, pumping, mains, storage, site, cost' },
        { label: 'Treatment units', value: 'D3 scope', sub: 'process design: lecture notes, AWWA, Kawamura' },
      ]),
      h('div', { style: { margin: '4px 0 12px' } }, seg),
      body,
    ];
  },
};

// ------------------------------------------------------------------ Help
export const help = {
  id: 'help', title: 'Help & methods', sub: 'Workflow, methods, keyboard shortcuts and references', icon: 'help', group: 'Library', layout: 'full',
  renderFull() {
    return [h('div', { class: 'grid2' },
      card('Workflow', h('div', { html: `<ol style="line-height:1.8;margin:0;padding-left:18px">
        <li><b>Project setup</b> – name, district (sets water temperature, monsoon pattern and regional alerts), source type and site level.</li>
        <li><b>Demand forecast</b> – census-based projection, NWSDB Design Manual D2 per-capita, UFW and peaking rules → adopted capacity.</li>
        <li><b>Raw water quality</b> – laboratory results compared with SLS 614:2013.</li>
        <li><b>Source & hydrology</b> – D2 river-basin data, dry-weather availability, reservoir mass diagram and flood estimate.</li>
        <li><b>Process selection</b> – the expert system recommends the train; override any unit.</li>
        <li><b>Treatment units</b> – intake → aeration → chemical dosing → rapid mix → flocculation → sedimentation → filtration → disinfection → stabilisation.</li>
        <li><b>Plant-wide</b> – storage & pumping, residuals, hydraulic profile, site layout, power & cost.</li>
        <li><b>Outputs</b> – compliance, design-check register and the PDF/Excel/DXF exports.</li></ol>` })),
      card('Keyboard shortcuts', table([{ k: 'k', l: 'Keys' }, { k: 'a', l: 'Action' }], [
        { k: 'Ctrl + N', a: 'New project' }, { k: 'Ctrl + O', a: 'Open project (.wtpd)' }, { k: 'Ctrl + S', a: 'Save' }, { k: 'Ctrl + Shift + S', a: 'Save as' },
        { k: 'Ctrl + Z / Ctrl + Y', a: 'Undo / redo' }, { k: 'Ctrl + P', a: 'Design report' }, { k: 'Ctrl + E', a: 'Export Excel workbook' }, { k: 'Ctrl + 1…9', a: 'Jump to pages' }, { k: 'F11', a: 'Full screen' }, { k: 'Ctrl + / −', a: 'Zoom' },
      ]), { flush: true }),
      card('Methods implemented', h('div', { class: 'small', html: `<ul style="line-height:1.7;margin:0;padding-left:18px">
        <li><b>NWSDB Design Manual D2 (1989)</b>: design periods, community demand table, non-domestic unit demands, UFW, peaking, river-basin data, BS 3680 weirs & flumes, rational formula, Rippl yield, intake & screen rules, NPSH (storm), stand-by pumps, pump efficiencies, pipe classes & design C, economic main size, valves & thrust, service-reservoir rules, cost-estimate format, PV & EAC – see Library → NWSDB Design Manual D2.</li>
        <li>Population: arithmetic, geometric and incremental-increase projections from census data.</li>
        <li>Screens: D2 head loss h = 0.0729(V² − v²) with clogging allowance; Joukowsky surge, NPSH, Hazen–Williams, pump/system curves.</li>
        <li>Aeration: lecture gravity-aerator efficiency K = 0.45(1+0.046T)h, Cₙ = Cs − (Cs − C₀)(1 − K/n)ⁿ.</li>
        <li>Coagulation: closed-system carbonate equilibrium for coagulation pH, alkalinity consumption, Al(OH)₃ solubility.</li>
        <li>Mixing: G = √(P/μV), P = Nₚn³D⁵ρ, hydraulic-jump sequent depth & head loss.</li>
        <li>Flocculation: Schulz & Okun baffle equations, paddle power P = C<sub>D</sub>Aρv³/2, v = 2πkrn (k = 0.75).</li>
        <li>Sedimentation: ideal basin (lecture), log-normal floc distribution, Camp scour velocity, Re & Fr stability, Yao tube settlers.</li>
        <li>Filtration: Carman–Kozeny stratified head loss, Wen–Yu fluidisation, Richardson–Zaki expansion, manifold–lateral underdrain, trough equation Q = 1.376bh^1.5.</li>
        <li>Disinfection: USEPA SWTR CT (Smith et al.), baffle factors, breakpoint chlorination, HOCl speciation.</li>
        <li>Stabilisation: Langelier & Ryznar indices with iterative post-lime solution.</li>
        <li>Residuals: AWWA mass balance; mass-curve service-reservoir sizing; quantity-based BOQ.</li></ul>` })),
      card('Important', h('div', { class: 'small', html: `This application supports – it does not replace – professional engineering judgement. Demand, source, intake, pumping, mains, storage and costing follow NWSDB Design Manual D2 (1989); treatment-unit criteria follow the supplied lecture notes and AWWA/Kawamura (the D3 scope). Confirm all criteria, unit rates and tariffs against the current NWSDB Design Manual, specifications and schedules of rates before issue. Predicted water quality is a screening estimate; verify with jar tests and pilot data.` })),
    )];
  },
};

// ------------------------------------------------------------------ Settings
export const settings = {
  id: 'settings', title: 'Settings', sub: 'Appearance, organisation logo and defaults', icon: 'settings', group: 'Library', layout: 'full',
  renderFull() {
    const s = store.settings;
    const theme = h('div', { class: 'seg' }, [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'settings']].map(([k, l, ic]) => h('button', { class: s.theme === k ? 'on' : '', onclick: () => { s.theme = k; saveSettings(); window.dispatchEvent(new Event('wtp-theme')); navigate('settings'); } }, icon(ic), l)));
    const logoPrev = h('div', { style: { width: '72px', height: '72px', display: 'grid', placeItems: 'center', border: '1px dashed var(--border-strong)', borderRadius: '10px', background: 'var(--surface-2)' }, html: s.logo ? `<img src="${s.logo}" style="max-width:64px;max-height:64px">` : emblemSVG(56) });
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/svg+xml', style: { display: 'none' } });
    file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { s.logo = rd.result; saveSettings(); window.dispatchEvent(new Event('wtp-theme')); navigate('settings'); toast('Logo updated'); }; rd.readAsDataURL(f); });
    const designer = h('input', { type: 'text', value: s.designer || '', placeholder: 'Name used for new projects' });
    designer.addEventListener('input', () => { s.designer = designer.value; saveSettings(); });
    return [
      card('Appearance', h('div', { class: 'field' }, h('label', null, 'Theme'), theme)),
      card('Organisation logo', h('div', { class: 'flex', style: { gap: '16px' } }, logoPrev, h('div', null,
        h('p', { class: 'small muted', style: { margin: '0 0 8px' } }, 'Load the official NWSDB logo (PNG/SVG) to show it in the title bar and on the report cover. The built-in emblem is used otherwise.'),
        h('div', { class: 'flex' }, h('button', { class: 'btn', onclick: () => file.click() }, icon('upload'), 'Choose logo…'), s.logo ? h('button', { class: 'btn ghost', onclick: () => { delete s.logo; saveSettings(); window.dispatchEvent(new Event('wtp-theme')); navigate('settings'); } }, 'Use built-in emblem') : null), file))),
      card('Defaults', h('div', { class: 'field' }, h('label', null, 'Designer name for new projects'), h('div', { class: 'inp' }, designer))),
      card('About', h('div', { class: 'small', html: `<b>NWSDB WTP Designer</b> v1.1 – conventional water treatment plant design suite, incorporating NWSDB Design Manual D2 (1989).<br>Built with Electron, d3 (ISC), KaTeX (MIT), JSZip (MIT) and Lucide icons (ISC).<br>Calculation engine: ${f2(store.calcMs)} ms per full plant recalculation.` })),
    ];
  },
};
