// Design report, criteria library, engineering toolbox, help and settings
import { CRITERIA, rangeText } from '../../core/criteria.js';
import * as D2M from '../../core/d2.js';
import * as D3M from '../../core/d3.js';
import { DN, G, fmt, fmtAuto, hwLoss, vel } from '../../core/util.js';
import { DOsat, mu, nu, pHs, rho, stability, stokes, lsiText, pVap } from '../../core/water.js';
import JSZip from 'jszip';
import { h, icon, toast } from '../dom.js';
import { canExport, edition, fmtDate, licenceDialog } from '../edition.js';
import { CREDIT, bannerImg, emblemImg } from '../brand.js';
import { REPORT_SECTIONS, buildReport } from '../report.js';
import { locate } from '../locate.js';
import { card, chartCard, checksTable, exportSheetsPDF, kpis, saveFile, statusBadge, table } from '../results.js';
import { PAGES } from './registry.js';
import { buildWorkbook } from '../xlsx.js';
import { navigate, resetCriteria, saveSettings, setCriteria, store } from '../store.js';
import { packHTML, packSheets } from '../draw/pack.js';

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
      if (!canExport()) return;
      const html = buildReport(st.opts);
      const name = (store.project.inputs.setup.code || 'WTP') + '-design-report.pdf';
      if (window.wtp?.exportPDF) { toast('Generating PDF…', 'file'); const p = await window.wtp.exportPDF(html, name, store.project.inputs.setup.name); if (p) toast('Report saved: ' + p.split(/[\\/]/).pop()); }
      else { const w = frame.contentWindow; w.focus(); w.print(); }
    };
    const exportXLSX = async () => { const data = await buildWorkbook(); saveFile((store.project.inputs.setup.code || 'WTP') + '-design.xlsx', new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); };
    const exportDrawings = async () => {
      const r = store.results;
      const zip = new JSZip();
      const sheets = packSheets(r, store.project);
      sheets.forEach((sh, i) => {
        const base = (sh.code || '00') + '-' + sh.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').slice(0, 70);
        if (sh.dxf) zip.file('dxf/' + base + '.dxf', sh.dxf);
        zip.file('svg/' + base + '.svg', sh.svg);
      });
      zip.file('drawing-register.csv', ['Sheet,Drawing number,Title,Scale (A3)', ...sheets.map((sh, i) => `${i + 1},${sh.number},"${sh.title}",${sh.scale ? '1:' + sh.scale : 'NTS'}`)].join('\n'));
      zip.file('A3-drawing-pack.html', packHTML(sheets, store.project.inputs.setup.name + ' – drawings'));
      const data = await zip.generateAsync({ type: 'uint8array' });
      saveFile((store.project.inputs.setup.code || 'WTP') + '-drawings.zip', new Blob([data], { type: 'application/zip' }), 'application/zip');
    };
    const exportPack = () => {
      const sheets = packSheets(store.results, store.project);
      exportSheetsPDF(packHTML(sheets, store.project.inputs.setup.name + ' – drawings'), (store.project.inputs.setup.code || 'WTP') + '-A3-drawings.pdf', store.project.inputs.setup.name);
    };
    setTimeout(refresh, 30);
    return [
      kpis([
        { label: 'Design report (PDF)', value: 'A4', sub: 'cover, summary, every unit, drawings, charts, calculation sheets', icon: 'file' },
        { label: 'Excel workbook', value: '10 sheets', sub: 'inputs, calculations, checks, BOQ, O&M, loads', icon: 'sheet' },
        { label: 'Drawing pack', value: 'A3 sheets', sub: 'NWSDB title block · PDF, AutoCAD DXF (layers) and SVG', icon: 'pen' },
      ]),
      card('Report contents', opts, { actions: [
        h('button', { class: 'btn primary', onclick: exportPDF }, icon('fileDown'), 'Export PDF'),
        h('button', { class: 'btn', onclick: exportXLSX }, icon('sheet'), 'Excel'),
        h('button', { class: 'btn', onclick: exportPack }, icon('fileDown'), 'Drawing pack (A3 PDF)'),
        h('button', { class: 'btn', onclick: exportDrawings }, icon('pen'), 'DXF + SVG (ZIP)'),
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
      tool('Chemical feed rate – D3 §6.1', [{ k: 'Q', l: 'Plant flow', u: 'm³/d', v: 42000 }, { k: 'D', l: 'Dose', u: 'mg/L', v: 30 }, { k: 'c', l: 'Stock solution strength', u: '% w/v', v: 10 }, { k: 'p', l: 'Product purity', u: '%', v: 100 }], (x) => { const kg = x.D * x.Q / 1000 / (x.p / 100); const qls = x.Q / 86.4; return [['Product required', kg, 'kg/d'], ['', kg / 24, 'kg/h'], ['Stock solution feed', kg / (x.c * 10) * 1000 / 24, 'L/h'], ['Carrier water to 1 % at diffuser', kg / (x.c * 10) * 1000 / 24 * (x.c - 1), 'L/h'], ['Calibration: time to draw 1 L', (x.c * 10000) / (x.D * qls), 's (D3 §6.1.5)'], ['Monthly product', kg * 30.4 / 1000, 't/month']]; }),
      tool('CT & contact tank – D3 Tables 6-2/6-4/6-5', [{ k: 'Q', l: 'Peak hourly flow', u: 'm³/h', v: 2200 }, { k: 'V', l: 'Contact volume', u: 'm³', v: 1100 }, { k: 'bf', l: 'Baffling', v: '0.7', o: D3M.BAFFLING.map(([l, b]) => [String(b), `${l} (${b})`]) }, { k: 'C', l: 'Free chlorine', u: 'mg/L', v: 0.8 }, { k: 'pH', l: 'pH', v: 7.2 }, { k: 'T', l: 'Temperature', u: '°C', v: 28 }, { k: 'g', l: 'Giardia log required', v: 0.5 }, { k: 'vl', l: 'Virus log required', v: 2 }], (x) => { const T10 = (x.V / x.Q) * 60 * +x.bf; const ct = x.C * T10; const g = D3M.ctGiardiaD3(x.g, x.T, x.pH, x.C), v = D3M.ctVirusD3(x.vl, x.T); return [['T₁₀', T10, 'min'], ['CT provided', ct, 'mg·min/L'], ['CT required – Giardia', g, 'mg·min/L'], ['CT required – virus', v, 'mg·min/L'], ['CT ratio', ct / Math.max(g, v, 1e-6), ct >= Math.max(g, v) ? 'OK (≥ 1)' : 'insufficient'], ['Nominal contact', (x.V / x.Q) * 60, 'min (≥ 20, WHO 30)']]; }),
      tool('Bleaching powder dose – D3 §6.4 / Annex G', [{ k: 'Q', l: 'Flow treated', u: 'm³/d', v: 500 }, { k: 'D', l: 'Chlorine dose', u: 'mg/L', v: 2 }, { k: 'a', l: 'Available chlorine', u: '%', v: 35 }, { k: 'c', l: 'Solution strength', u: '% av. Cl', v: 1 }], (x) => { const g = D3M.bleachingPowder(x.Q, x.D, x.a / 100); const lph = (x.Q * x.D) / (x.c * 10) / 24; return [['Bleaching powder', g / 1000, 'kg/d'], ['Per 1000 Imp gal (4.546 m³)', D3M.bleachingPowder(4.546, x.D, x.a / 100), 'g'], ['Solution feed', lph, 'L/h'], ['24 h solution tank', lph * 24 / 1000, 'm³'], ['Within hypochlorination limit', lph <= 42 ? 'yes (≤ 42 L/h)' : 'no – use gas chlorination', ''], ['Storage', '≤ 3 months; verify each batch', '']]; }),
      tool('Rapid sand filters – D3 §5.9.2', [{ k: 'Q', l: 'Filtered-water flow', u: 'm³/d', v: 16125 }, { k: 'v', l: 'Filtration rate', u: 'm/h', v: 8 }, { k: 'N', l: 'Filters (0 = D3 rule)', v: 0 }], (x) => { const Nr = D3M.nFiltersD3(x.Q); const N = x.N > 0 ? x.N : Math.max(D3M.minFilters(x.Q), Math.ceil(Nr), Math.ceil(2 / (1 - x.v / 15))); const A = x.Q / 24 / x.v / N; return [['N = 1.2√Q (mgd)', Nr, ''], ['Filters adopted', N, `(≥ ${D3M.minFilters(x.Q)})`], ['Area of each filter', A, `m² (≤ ${D3M.filterAreaMax(x.Q)})`], ['L × B at L/B 1.3', `${fmt(Math.sqrt(A * 1.3), 2)} × ${fmt(Math.sqrt(A / 1.3), 2)}`, 'm'], ['Rate, one out + one washing', x.Q / 24 / ((N - 2) * A), 'm/h (≤ 15)'], ['Sand depth ≥ 1200 d₁₀ (ES 0.55)', D3M.sandDepthMin(0.55), 'm']]; }),
      tool('Slow sand filters – D3 §5.12', [{ k: 'Q', l: 'Flow', u: 'm³/d', v: 2300 }, { k: 'v', l: 'Filtration rate', u: 'm/h', v: 0.15 }, { k: 't', l: 'Raw turbidity (max)', u: 'NTU', v: 18 }], (x) => { const su = D3M.ssfUnits(x.Q); const A = x.Q / 24 / x.v; const n2 = Math.max(2, Math.ceil(su.formula)); return [['Total bed area', A, 'm²'], ['Units n = 15√Q', su.formula, su.table ? `(Table 5-36: ${su.table})` : ''], ['Area per unit (n − 1 in service)', A / Math.max(1, n2 - 1), 'm²'], ['Rate with one unit scraped', x.Q / 24 / (A * (n2 - 1) / n2), 'm/h (≤ 0.4)'], ['Pre-treatment', x.t >= 20 ? (x.t > 50 ? 'unsuitable (> 50 NTU)' : 'necessary (≥ 20 NTU)') : x.t >= 10 ? 'consider (10–20 NTU)' : 'not required', ''], ['Box depth (min)', 2.7, 'm']]; }),
      tool('Sludge production – D3 Method 02 (Annex H)', [{ k: 'Q', l: 'Flow', u: 'm³/d', v: 16125 }, { k: 'ntu', l: 'Turbidity', u: 'NTU', v: 17 }, { k: 'b', l: 'mg TSS per NTU', v: 1.0 }, { k: 'fe', l: 'Iron', u: 'mg/L', v: 0.7 }, { k: 'mn', l: 'Manganese', u: 'mg/L', v: 0.4 }, { k: 'alum', l: 'Alum', u: 'mg/L', v: 25 }, { k: 'lime', l: 'Lime', u: 'mg/L', v: 15 }, { k: 'pac', l: 'PAC', u: 'mg/L', v: 5 }, { k: 'slr', l: 'Thickener loading', u: 'kg/m²·d', v: 80 }], (x) => { const m = D3M.sludgeMethod2({ Q: x.Q, ntu: x.ntu, tssPerNtu: x.b, fe: x.fe, mn: x.mn, alum: x.alum, lime: x.lime, pac: x.pac }); const V = m.design / (0.02 * 1012); const A = m.design / x.slr; return [['Dry solids (sum of terms)', m.total, 'kg/d'], ['Design (× 1.4 × 90 %)', m.design, 'kg/d'], ['Specific', m.design / x.Q * 1000, 'kg/1000 m³ (8–210)'], ['Wet sludge at 2 %', V, 'm³/d'], ['Thickener area / diameter', `${fmt(A, 2)} m² / ${fmt(Math.sqrt(4 * A / Math.PI), 2)} m`, ''], ['Hydraulic loading', V / A, 'm³/m²·d (4–10)']]; }),
      tool('Cascade aerator – D3 §5.3 / Annex B', [{ k: 'T', l: 'Temperature', u: '°C', v: 28 }, { k: 'h', l: 'Drop per step', u: 'm', v: 0.5 }, { k: 'n', l: 'Number of drops', v: 4 }, { k: 'C0', l: 'Initial DO', u: 'mg/L', v: 0 }, { k: 'fe', l: 'Fe²⁺', u: 'mg/L', v: 1.0 }, { k: 'mn', l: 'Mn²⁺', u: 'mg/L', v: 0.2 }], (x) => { const K = D3M.aerK(x.T, x.h); const Cs = DOsat(x.T); let C = x.C0; for (let i = 0; i < x.n; i++) C += K * (Cs - C); return [['K = 0.45(1 + 0.046T)h', K, x.h > 0.7 ? 'h > 0.7 m – past best efficiency' : ''], ['Cs', Cs, 'mg/L'], ['DO after aerator', C, 'mg/L'], ['O₂ demand (Table 7-1)', D3M.OXIDANT.O2.fe * x.fe + D3M.OXIDANT.O2.mn * x.mn, 'mg/L'], ['Tail-water depth (2/3 h)', 2 / 3 * x.h, 'm'], ['Cl₂ / KMnO₄ for Fe + Mn', `${fmt(D3M.OXIDANT.Cl2.fe * x.fe + D3M.OXIDANT.Cl2.mn * x.mn, 2)} / ${fmt(D3M.OXIDANT.KMnO4.fe * x.fe + D3M.OXIDANT.KMnO4.mn * x.mn, 2)}`, 'mg/L']]; }),
      tool('Site area & stability – D3 §9.2.1 / Ch 8', [{ k: 'Q', l: 'Ultimate capacity', u: 'm³/d', v: 60000 }, { k: 'ca', l: 'Calcium (as Ca)', u: 'mg/L', v: 20 }, { k: 'alk', l: 'Alkalinity', u: 'mg/L CaCO₃', v: 50 }, { k: 'pH', l: 'pH', v: 7.8 }], (x) => { const ps = D3M.pHsEq83(x.ca, x.alk); return [['Minimum site area (campus)', D3M.siteAreaMinHa(x.Q), 'ha'], ['', D3M.siteAreaMinHa(x.Q) * 2.471, 'acres'], ['pHs (Eq 8.3, 25 °C)', ps, ''], ['LSI', x.pH - ps, x.pH - ps < -1.5 ? 'aggressive (< −1.5)' : 'acceptable (> −1.5)'], ['RSI', 2 * ps - x.pH, 2 * ps - x.pH < 10 ? 'acceptable (< 10)' : 'corrosive (≥ 10)']]; }),
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
  id: 'd2manual', title: 'Supply-system clauses', sub: 'Reference clauses and tables for demand, source, intake, pumping, mains, storage and cost – and how this project complies', icon: 'landmark', group: 'Library', layout: 'full',
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
      body.append(card('Checks against D2 in this project', checksTable(d2.checks.map((c) => ({ ...c, moduleLabel: `${pageTitle(c.module)} · ${c.clause}` })), { locate, showModule: true, onRow: (c) => MOD_PAGE[c.module] && navigate(MOD_PAGE[c.module]) }), { flush: true, sub: 'click a row to open the design page' }));
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
        { label: 'Treatment units', value: 'see D3', sub: 'process design → Library · Treatment clauses' },
      ]),
      h('div', { style: { margin: '4px 0 12px' } }, seg),
      body,
    ];
  },
};

// ------------------------------------------------------------------ NWSDB Design Manual D3
const MOD_PAGE3 = { quality: 'quality', process: 'process', intake: 'intake', aeration: 'aeration', coag: 'coag', rapidmix: 'rapidmix', floc: 'floc', sed: 'sed', filt: 'filt', dis: 'dis', stab: 'stab', sludge: 'sludge', hyd: 'hyd', storage: 'storage', layout: 'layout', compliance: 'compliance', source: 'source' };
const tt = (cols, rows, sub, title) => card(title, table(cols.map((c, i) => (typeof c === 'string' ? { k: String(i), l: c } : c)), rows.map((r) => (Array.isArray(r) ? Object.fromEntries(r.map((v, i) => [String(i), v])) : r))), { flush: true, sub });
export const d3manual = {
  id: 'd3manual', title: 'Treatment clauses', sub: 'Reference clauses and tables for water quality and treatment, interpretations used, and how this project complies', icon: 'landmark', group: 'Library', layout: 'full',
  state: { tab: 'compliance' },
  renderFull(r) {
    const st = d3manual.state;
    const d3 = r.d3;
    const pageTitle = (mod) => PAGES.find((p) => p.mod === mod)?.title || mod;
    const worst = (list) => (list.some((c) => c.status === 'fail') ? 'fail' : list.some((c) => c.status === 'warn') ? 'warn' : list.length ? 'ok' : 'na');
    const body = h('div');
    const tabs = [['compliance', 'Project compliance', 'checks'], ['clauses', 'Clause index', 'book'], ['process', 'Process selection (Ch 4)', 'workflow'], ['units', 'Unit design tables (Ch 5)', 'table'], ['dis', 'Chemicals & disinfection (Ch 6)', 'flask'], ['plant', 'Stability, layout & lab (Ch 7–9)', 'factory'], ['errata', 'Errata & interpretations', 'warn']];
    const seg = h('div', { class: 'seg' }, tabs.map(([k, l, ic]) => h('button', { class: st.tab === k ? 'on' : '', onclick: () => { st.tab = k; navigate('d3manual'); } }, icon(ic), l)));
    const clauseMatch = (c, cl) => {
      if (!c) return false;
      if (/^(Table|Fig|Annex|Eq)/.test(cl) || /^(Table|Fig|Annex)/.test(c)) return c.replace(/\s+/g, ' ').startsWith(cl.replace(/\s+/g, ' '));
      const a = c.replace(/^§/, ''), b = cl.replace(/^§/, '');
      return a === b || a.startsWith(b + '.') || b.startsWith(a + '.');
    };
    if (st.tab === 'compliance') {
      body.append(card('Checks against D3 in this project', checksTable(d3.checks.map((c) => ({ ...c, moduleLabel: `${pageTitle(c.module)} · ${c.clause}` })), { locate, showModule: true, onRow: (c) => MOD_PAGE3[c.module] && navigate(MOD_PAGE3[c.module]) }), { flush: true, sub: 'click a row to open the design page' }));
    } else if (st.tab === 'clauses') {
      const rows = D3M.CLAUSES.map(([cl, title, rule, mod]) => { const key = /^\d/.test(cl) ? '§' + cl : cl; const list = d3.checks.filter((c) => clauseMatch(c.clause, key) || (key.startsWith('§') && c.src && c.src.includes(cl.startsWith('Annex') ? cl : '§' + cl))); return { cl: key, title, rule, mod, n: list.length, st: worst(list) }; });
      body.append(card('How D3 is applied in this application', table([
        { k: 'cl', l: 'Clause', v: (x) => h('b', null, x.cl) }, { k: 'title', l: 'Subject' }, { k: 'rule', l: 'Rule applied', v: (x) => h('span', { class: 'small' }, x.rule) },
        { k: 'mod', l: 'Applied in', v: (x) => h('a', { href: '#', onclick: (e) => { e.preventDefault(); navigate(MOD_PAGE3[x.mod] || x.mod); } }, pageTitle(x.mod)) },
        { k: 'n', l: 'Checks', num: true }, { k: 'st', l: 'Status', v: (x) => (x.n ? statusBadge(x.st) : h('span', { class: 'small muted' }, 'guidance')) },
      ], rows), { flush: true, sub: `${D3M.D3.title} (${D3M.D3.date}) · scope: ${D3M.D3.scope}` }));
    } else if (st.tab === 'process') {
      const p = r.process;
      body.append(h('div', { class: 'grid2' },
        card(`This project – Table 4-5 (${p.t45.rows.length} characteristics triggered)`, table([{ k: 'char', l: 'Characteristic' }, { k: 'band', l: 'Band' }, { k: 'E', l: 'Essential', v: (x) => h('span', { class: 'small' }, x.E.map((q) => D3M.PROC[q]).join(', ') || '—') }, { k: 'm', l: 'Missing', v: (x) => (x.hard.length ? h('b', null, x.hard.map((q) => D3M.PROC[q]).join(', ')) : x.soft.length ? h('span', { class: 'small muted' }, x.soft.map((q) => D3M.PROC[q]).join(', ') + ' (advisory)') : statusBadge('ok')) }], p.t45.rows), { flush: true, sub: 'E = essential, union of all triggered rows; D3 advises using the table with caution' }),
        card(`Typical train – ${p.typical.fig}: ${p.typical.cat}`, h('div', { class: 'small', html: `<ol style="line-height:1.8;margin:0;padding-left:18px">${p.typical.steps.map((x) => `<li>${x}</li>`).join('')}</ol>${p.typical.alt ? `<p><b>Alternative:</b> ${p.typical.alt.join(' → ')}</p>` : ''}<p>Treatment shall be divided into two or more independent trains (§4.3.8). Pilot-plant studies are highly recommended where a process is not proven (§4.4).</p>` })),
        tt(['Characteristic', 'Band', 'Essential', 'Optional'], D3M.TABLE_4_5.map((x) => [x.char, x.band, x.E.map((q) => D3M.PROC[q]).join(', ') || '—', x.O.map((q) => D3M.PROC[q]).join(', ') || '—']), 'NWSDB D3 Table 4-5 (as printed; app-specific thresholds noted)', 'Table 4-5 – Recommended treatment processes'),
        tt(['Determinant', 'Unit', 'Tolerance limit', 'Note'], D3M.SLS722.map((x) => [x.name, x.unit, Array.isArray(x.limit) ? x.limit.join(' – ') : String(x.limit), x.note || '']), 'inland surface water used as raw water for public supply', 'Table 2-6 – SLS 722:1985 raw-water limits'),
        tt(['Toxin', 'Desirable µg/L', 'Permissible µg/L'], D3M.CYANOTOXINS, 'SLS 614:2013 (D3 Table 2-5)', 'Table 2-5 – Cyanotoxins'),
        tt(['Target', 'NTU'], [['NWSDB design target, filtered water (§2.3.1)', D3M.TURBIDITY_TARGETS.designFiltered], ['95 % of monthly samples (§5.8.3)', '< ' + D3M.TURBIDITY_TARGETS.ninetyFive], ['Never exceed (§5.8.3, §6.2.4)', D3M.TURBIDITY_TARGETS.never], ['Full-treatment plants (§6.2.4)', '< ' + D3M.TURBIDITY_TARGETS.fullTreatment]], '', 'Turbidity targets'),
      ));
    } else if (st.tab === 'units') {
      body.append(h('div', { class: 'grid2' },
        tt(['Screen', 'Clear opening', 'Velocity', 'Head loss'], [['Coarse (§5.1.5.1)', '50–100 mm, 22–45°', '≥ 0.4 (no deposition), ≤ 0.9 m/s peak', '≤ 150 mm'], ['Fine (§5.1.5.2)', '5–20 mm, 10–30° to vertical', '0.6–1.0 m/s (≤ 1.4 peak)', '0.05–0.15 m'], ['Formula', '', 'h = 0.0729 (V² − U²)', '']], 'duplicate fine screens; band screen ≈ 15 mm/s', 'Intake screens'),
        tt(['Aerator', 'Typical criteria', 'Clause'], D3M.AERATORS.map((a) => [a.type, a.crit, '§' + a.clause]), 'K = 0.45 (1 + 0.046 T) h per drop; Cₑ = C₀ + K (Cs − C₀)', 'Aerators (§5.3)'),
        tt(['Aerator', 'CO₂ %', 'VOC %', 'H₂S %', 'O₂ %'], D3M.AER_EFF, '', 'Table 5-8 – Removal efficiency'),
        tt(['Coagulant', 'Formula', 'Strength', 'Form', 'SG'], D3M.COAGULANTS, 'dosing concentration (Table 5-11): alum 3–7 %, lime 2–10 %, PACl 2–10 %, KMnO₄ 2 %', 'Table 5-10 – Coagulants'),
        tt(['Item', 'Criterion'], [['Detention', '< 1 min (mechanical 30–60 s)'], ['G', '500–1,000 s⁻¹ (up to 3,500)'], ['Gt', '30,000–60,000'], ['Tanks', '≥ 2, square, depth/width = 2'], ['Impeller', '50–80 % of tank width; 4 baffles 8–10 % wide'], ['Static mixer', 'L = 2–4 D, head loss ≈ 0.5 m'], ['Jet mixing', 'jet flow ≈ 10 % of water flow']], 'order of preference: jet diffusion, static, in-line mechanical, hydraulic, mechanical flash', 'Rapid mixing (§5.5)'),
        tt(['Impeller', 'k'], D3M.POWER_NUMBER, 'P = k ρ n³ d⁵ (turbulent)', 'Table 5-13 – Power numbers'),
        tt(['Parameter', 'Hydraulic', 'Paddle', 'Turbine'], [['G (s⁻¹)', '10–75 (≤ 100 → ≥ 10)', '50–10', '70–10'], ['Time (min)', '≥ 20 (20–30)', '30–40', '20–40'], ['Stages', '12–20 baffles', '3–6', '2–4'], ['Velocity', '0.1–0.3 m/s', 'tip ≤ 0.4 m/s rel.', '2–3 m/s max'], ['Paddle area', '–', '5–20 %', '0.1–0.2 %'], ['D / width', '–', '0.5–0.75', '0.2–0.4'], ['Baffles', 'spacing ≥ 45 cm, end clear 1–1.5 s ≥ 60 cm, depth ≥ 1 m', '', '']], 'Tables 5-15, 5-16; Annex D.1/D.2', 'Flocculators (§5.6)'),
        tt(['Type', 'Normal', 'Easy', 'Very bad'], [['No pre-treatment', ...D3M.SOR_TABLE.none], ['With chemical coagulation', ...D3M.SOR_TABLE.coag], ['With coagulant aids', ...D3M.SOR_TABLE.aids]], 'm³/m²·h; depth 2.5–4 m, L/W 3–6, 2–4 h, v < 0.02 m/s, weir < 18 m³/m·h, ≥ 2 basins', 'Table 5-20 – Surface overflow rate'),
        tt(['Settler / clarifier', 'Criteria'], [['Tube / plate (§5.7.7)', 'settling zone 2.5–7.5 m/h; tubes 50 mm at 60°, plates ≥ 55° at 50 mm; length 1–2 m; coverage ≤ 0.75 (0.95 plates); clear depth ≥ 3 m below; launders 1.5 m c/c'], ['Sludge blanket (§5.7.4)', 'SOR 1.25–2.5 m/h, ≈ 2 h, weir < 9 m³/m·h'], ['Solids contact (§5.7.5)', 'recirculation 1–4 × (turbine 8–20 ×), 1.5–2.5 h'], ...D3M.PULSATOR.map(([a, b, c]) => [a + ' (Table 5-24)', `${b} m/h (settling) · ${c} m/h`]), ['DAF (§5.7.8)', 'floc 15–30 min, 10–20 min, rise 5–15 m/h, 450–620 kPa, recycle 5–15 %, ≤ 100 NTU']], '', 'High-rate clarification'),
        tt(['Parameter', 'Rapid gravity', 'Slow sand'], [['Rate', '5–15 m/h', '0.1–0.4 m/h'], ['Bed', '0.6–1.0 m sand, ES 0.4–1.2, UC 1.2–2.0', '1.0–1.4 m, ES 0.15–0.35, UC 1.5–3'], ['Gravel', '0.3–0.6 m, 2–50 mm', '4 layers ≈ 0.3 m'], ['Water over media', '≥ 1.0 m (1.5 modern)', '1.0–1.5 m'], ['Units', 'N = 1.2√Q (mgd), ≥ 2 (≥ 4 > 15 mgd)', 'n = 15√Q (m³/s), ≥ 2'], ['Unit area', '≈ 50 / 100 m² (≤ 140)', '—'], ['Head loss', '≤ 2.5 m (backwash at 2.4–3.0)', '0.6–1.2 m'], ['Run', '1–3 d', '1–6 months'], ['Wash water', '1–6 %', '0.2–0.6 %'], ['Backwash', '36–54 m/h, ≥ 5 min; air 54–90 m/h 2–3 min', 'scrape 1–2.5 cm']], 'Table 5-26, §5.9.1, §5.12.5', 'Filters'),
        tt(['Medium', 'Sequence', 'Air m/h', 'Water m/h'], D3M.AIR_WATER, '', 'Tables 5-27 / 5-32 – Air-scour & water backwash'),
        tt(['Medium', 'ES mm', 'SG', 'Porosity', 'Sphericity'], D3M.MEDIA, '', 'Table 5-28 – Filter media'),
        tt(['Rule (§5.9.3.5)'], D3M.GRAVEL_RULES.map((x) => [x]), '', 'Support gravel grading'),
        tt(['Parameter', 'Limit'], D3M.SSF_LIMITS.map(([, a, b]) => [a, b]), 'pre-treat when max ≥ 20 NTU; ≤ 50 NTU with pre-treatment', 'Table 5-35 – Source water for SSF'),
        tt(['RF type', '1st', '2nd', '3rd'], D3M.ROUGHING_MEDIA, 'HRF 0.3–1.5 m/h (Table 5-41), 5–7 m long, 1–1.5 m high, 2–5 m wide; VRF 0.3–1.0 m/h; effluent ≤ 10 NTU', 'Table 5-40 – Roughing-filter media (mm)'),
        tt(['Source', 'kg / kg'], [['Turbidity removed', '0.5–2 mg TSS/L per NTU'], ['Alum (14H₂O)', SLUDGE_TXT(D3M.SLUDGE_K.alum)], ['Ferric sulphate', '0.54'], ['Ferrous sulphate', '0.39'], ['Ferric chloride', '0.66'], ['PACl (product)', '≈ 0.8'], ['Polymer / PAC', '1'], ['Fe / Mn', '106.9/55.9 · 87.9/54.9'], ['Lime (20 % → CaCO₃)', '0.27']], 'Method 02 total × 1.4 × 90 % capture; thickener 20–80 kg/m²·d, 4–10 m³/m²·d, 4.5–6.5 m; beds 100–300 kg/m²·yr (< 2,200 mm rain)', 'Table 5-44 – Sludge production'),
        tt(['Parameter', 'Limit'], D3M.CEA_DISCHARGE, 'dilution ≥ 8:1 assumed', 'Table 5-42 – CEA discharge limits (selected)'),
      ));
    } else if (st.tab === 'dis') {
      const T = D3M.CT_GIARDIA_1LOG;
      body.append(h('div', { class: 'grid2' },
        tt(['pH', ...T.T.map((t) => `${t} °C (1 / 2 / 3 mg/L)`)], T.pH.map((ph) => [ph === 6 ? '≤ 6' : ph, ...T.T.map((_, i) => T.v[ph].map((row) => row[i]).join(' / '))]), 'CT for 1-log Giardia, mg·min/L – multiply by the log required; app uses 25 °C values above 25 °C', 'Table 6-4 – CT, Giardia (free chlorine)'),
        tt(['Log', ...D3M.CT_VIRUS.T.map((t) => t + ' °C')], [2, 3, 4].map((l) => [l + '-log', ...D3M.CT_VIRUS[l]]), 'pH 6–9', 'Table 6-5 – CT, viruses (free chlorine)'),
        tt(['Baffling', 't₁₀/τ', 'Description'], D3M.BAFFLING, '', 'Table 6-2 – Baffling factors'),
        tt(['Process', 'Removal G', 'Removal V', 'Disinfection G', 'Disinfection V'], [['Conventional', ...D3M.CREDITS.conventional], ['Direct filtration', ...D3M.CREDITS.direct], ['Slow sand', ...D3M.CREDITS.ssf], ['Diatomaceous earth', ...D3M.CREDITS.de], ['No filtration', ...D3M.CREDITS.none]], 'log credits (SWTR: 3-log Giardia, 4-log virus)', 'Table 6-7 – Disinfection credits'),
        tt(['Location', 'Free chlorine mg/L'], [['Clear water / contact basin', '0.5–0.8'], ['Consumer taps / stand posts', '≥ 0.2'], ['Distribution dead ends', '≥ 0.1'], ['Avoid at the WTP', '> 1.0'], ['Design dose, clear water', '2'], ['Contact time', '≥ 20 min (WHO 30 min)']], '§6.2.7, §6.3.5–6.3.6', 'Residual chlorine'),
        tt(['Cl₂ kg/d', 'm³/d', '98 kg in use', 'reserve', '900 kg in use', 'reserve'], D3M.CYL_INVENTORY, '≥ 30 days at 2 mg/L', 'Table 6-12 – Cylinder inventory'),
        tt(['Type', 'Max feed kg/d', 'Water / kg Cl₂', 'Accuracy'], D3M.CHLORINATOR_TYPES, '1 duty + 1 standby; ≤ 180 kg/d per drum (gas); > 680 kg/d evaporators; 1 air change/min; 20 % NaOH scrubber', 'Table 6-11 – Chlorinators'),
        tt(['Log', ...D3M.UV_DOSE.logs], [['Cryptosporidium', ...D3M.UV_DOSE.crypto], ['Giardia', ...D3M.UV_DOSE.giardia], ['Virus', ...D3M.UV_DOSE.virus]], 'mJ/cm²', 'Table 6-16 – UV dose'),
        tt(['Item', 'Value'], [['Alum dose', '20–100 mg/L'], ['Stock solution', '10 % (2–10 %), ≤ 1 % at diffuser'], ['Day tanks', '2 × 24 h'], ['Storage', '≥ 1 month'], ['Lime slurry', '50–100 g/L; silo ≥ 50 m³'], ['PAC', '1–20 mg/L, ≥ 15 min, slurry ≥ 1.5 m/s'], ['PACl', 'pH 5–8, residual Al 0.01–0.05, 2–3 × alum cost'], ['Bleaching powder', '35 % av. Cl (design), 1 % solution, ≤ 3 months storage, ≤ 42 L/h'], ['DBPs', 'TTHM ≤ 100, HAA5 ≤ 80 µg/L']], '§6.1, §6.4, §6.10', 'Chemical feeding'),
        tt(['Supply (Imp gal)', 'Bleaching powder g', 'Water L (1 %)'], [1000, 2000, 5000, 10000].map((g) => [g, Math.round(D3M.bleachingPowder(g * 0.004546, 2, 0.25)), +(g * 0.004546 * 2 / 10).toFixed(2)]), 'Annex G – 2 ppm on 25 % available chlorine', 'Annex G – Bleaching powder dosage'),
      ));
    } else if (st.tab === 'plant') {
      body.append(h('div', { class: 'grid2' },
        tt(['Reaction', 'mg oxidant / mg Fe', 'mg oxidant / mg Mn', 'Solids Fe / Mn'], Object.entries(D3M.OXIDANT).map(([k, v]) => [k, v.fe, v.mn, `${v.sfe} / ${v.smn}`]), 'Mn by aeration only at pH ≥ 9.5; ≥ 20 min detention before filtration', 'Table 7-1 – Fe & Mn oxidant demand'),
        tt(['Mean max air temp °C', 'Fluoride mg/L'], D3M.FLUORIDE_OPT.map(([t, f]) => ['≤ ' + t, f]), 'SLS 614: 1.0 mg/L', 'Table 7-3 – Fluoride'),
        tt(['Index', 'Acceptable', 'Formula'], [['LSI', '> −1.5', 'pH − pHs; pHs = 11.5 − log Ca − log Alk (25 °C)'], ['RSI', '< 10', '2 pHs − pH'], ['CCPP', '> −5 (target ≈ +4)', 'Ca − Ca(sat)'], ['Aggressiveness index', '> 10', 'pH + log(Alk × CaH)'], ['Alkalinity / calcium', '≥ 50 mg/L as CaCO₃', ''], ['(Cl + SO₄)/Alk', '≤ 0.2 (equivalents)', 'or each ≤ 50 mg/L']], 'Ch 8, Tables 8-2/8-3', 'Water stability'),
        tt(['Clause', 'Design-review item'], D3M.LAYOUT_CHECKLIST, `minimum site area A (acres) ≥ Q^0.7 (mgd) – this project ${fmt(r.layout?.siteMinHa ?? 0, 2)} ha`, 'Plant layout checklist (Ch 9)'),
        tt(['Unit', 'Typical criteria'], D3M.REFERENCE_PLANT, '', 'Table 9-1 – Reference 48,000 m³/d works'),
        card('Table 9-3 – Minimum laboratory equipment', h('div', { class: 'small', html: D3M.LAB_EQUIPMENT.join(' · ') })),
        card('§9.8 Instrumentation', h('div', { class: 'small', html: '<ul style="margin:0;padding-left:18px;line-height:1.7">' + D3M.INSTRUMENTS.map((x) => `<li>${x}</li>`).join('') + '</ul>' })),
        tt(['T °C', 'ρ kg/m³', 'μ mPa·s', 'ν mm²/s', 'pv kPa'], D3M.WATER_PROPS.filter((x) => x[0] <= 40).map((x) => [x[0], x[2], x[3], x[4], x[7]]), 'used for every hydraulic calculation (interpolated)', 'Annex I – Properties of water'),
      ));
    } else {
      body.append(card('Printed inconsistencies and the value used by the app', table([{ k: '0', l: 'Location' }, { k: '1', l: 'As printed' }, { k: '2', l: 'Interpretation used' }], D3M.ERRATA.map((x) => ({ 0: x[0], 1: x[1], 2: x[2] }))), { flush: true, sub: 'confirm with the NWSDB Planning & Design Manual Review Committee before relying on these items' }));
    }
    return [
      kpis([
        { label: 'D3 checks', value: d3.total, sub: `${d3.ok} pass · ${d3.warn} review · ${d3.fail} fail · ${d3.info} info`, icon: 'landmark', accent: true, status: d3.fail ? 'fail' : d3.warn ? 'warn' : 'ok' },
        { label: 'Clauses applied', value: new Set(d3.checks.map((c) => c.clause)).size, sub: `${D3M.CLAUSES.length} clause groups indexed` },
        { label: 'Pages applying D3', value: new Set(d3.checks.map((c) => c.module)).size, sub: 'quality, process, every treatment unit, residuals, layout' },
        { label: 'Errata recorded', value: D3M.ERRATA.length, sub: 'printed inconsistencies resolved' },
      ]),
      h('div', { style: { margin: '4px 0 12px' } }, seg),
      body,
    ];
  },
};
const SLUDGE_TXT = (v) => `${v} (theoretical 0.44)`;

// ------------------------------------------------------------------ Help
export const help = {
  id: 'help', title: 'Help & methods', sub: 'Workflow, methods, keyboard shortcuts and references', icon: 'help', group: 'Library', layout: 'full',
  renderFull() {
    return [h('div', { class: 'grid2' },
      card('Operation & maintenance tools', h('div', { class: 'small', html: `<ul style="margin:0;padding-left:18px;line-height:1.7"><li><b>Jar-test dose calculator</b> – enter the dose and settled turbidity of each jar (D3 §4.4.3.2). The curve fit gives the optimum dose (lowest turbidity) and the economic dose (lowest dose meeting the settled-water target, ≤ 4 NTU by default), checks coagulation pH and alkalinity, and converts the dose into the stroke % of the dosing pumps for today's flow, with a dosing table for 50–120 % of the design flow. A record of past jar tests recalibrates D = a·Tuᵇ; one click applies it to the Chemical dosing page.</li><li><b>Backwash & chemical-stock planner</b> – wash interval from the filter run (limited to the longest run allowed), a 7-day staggered wash timetable on the day shift or round the clock, the wash procedure with this plant's rates and times, wash water as % of production (D3: 1–5 %). Slow sand plants get a scraping and re-sanding timetable. For each chemical: use at today's flow and the month's dose, days of stock, reorder level (delivery time + safety stock), order date and quantity in whole packs, a 90-day stock projection and the monthly consumption and cost.</li><li><b>O&M manual (draft)</b> – a draft manual in the NWSDB D3 Chapter 10 structure, filled with the design values, SOPs, the dosing table, the wash procedure and timetable, maintenance schedule, safety, emergency response, chemical stock plan and log sheets. Export as PDF, or as Word (.doc) to complete it with the contractor's data.</li></ul>` })),
      card('Existing plant assessment', h('div', { class: 'small', html: `<p style="margin-top:0">For a plant that is already built, open <b>Outputs → Existing plant assessment</b> and switch it on. Enter the sizes of the units as built and the present average, peak and target flows (set the raw-water quality, doses and criteria on the other pages first).</p><ul style="margin:0;padding-left:18px;line-height:1.7"><li>Each unit is rated against the NWSDB D3 / D2 limits of the project: flocculation time, surface overflow rate, detention, weir and tube-settler loading, filter rate with filters out of service, contact time T₁₀, chemical feeders and duty pumps.</li><li><b>Plant capacity</b> is the smallest unit capacity; that unit is the <b>bottleneck</b>.</li><li>Red = overloaded at the present peak flow; amber = adequate now but not for the target.</li><li>The <b>upgrade path</b> lists the extensions in the order they become limiting, with the size of each.</li><li>The rating uses loading and hydraulic criteria only. Confirm it with plant records (settled and filtered turbidity, filter runs, doses) and the condition of the works.</li></ul>` })),
      card('Workflow (follow the steps on the Dashboard)', h('div', { html: `<ol style="line-height:1.8;margin:0;padding-left:18px">
        <li><b>Project setup</b> – name, district (sets water temperature, monsoon pattern and regional alerts), source type and site level.</li>
        <li><b>Design basis</b> – either a <b>demand forecast</b> (census projection, D2 per-capita, NRW, peaking) or a <b>specified capacity</b> such as “design a 25,000 m³/d plant” (switch on the Dashboard or the Demand page; throughput or treated-water output).</li>
        <li><b>Raw water quality & source</b> – laboratory results vs SLS 614:2013 / SLS 722 (D3 Ch 2), dry-weather availability, reservoir yield.</li>
        <li><b>Plant configurator</b> – click one illustrated card per decision (route, pre-treatment, mixer, flocculator, clarifier, filter, disinfectant, stabilisation, residuals). Green badge = NWSDB D3 / expert recommendation, amber = outside D3 guidance; the live PFD updates immediately.</li>
        <li><b>Treatment units</b> – each page shows what it <b>receives from</b> the unit upstream and <b>hands over</b> to the next (flow, water level, turbidity, pH, chemicals). Red / amber inputs show the failing check right under the field; <b>Locate</b> buttons jump to the input that controls any check.</li>
        <li><b>Impact of a change</b> – after every edit the Impact panel lists the knock-on effects on every downstream unit (sizes, levels, turbidity, energy, cost, checks); <b>Design chain & impact</b> shows the water path, profiles, dependency matrix and a what-if explorer.</li>
        <li><b>Plant-wide</b> – storage & pumping, residuals, hydraulic profile, site layout, power & cost.</li>
        <li><b>Outputs</b> – compliance, design-check register, PDF report, Excel, and the NWSDB <b>A3 drawing pack</b> (title block, D3 concrete hatching, true scale) as PDF / DXF / SVG.</li>
        <li><b>Drawings in any view</b> – the drawing card on each unit page has a view switcher: Plan, Section A–A, Section B–B, General arrangement (views in projection on one sheet) and 3D view; the Site layout page shows the whole plant in 3D. Scroll to zoom, drag to pan, switch to <i>A3 sheet</i> for the titled sheet, and export the view or <i>All views</i>. In a <b>3D view</b> drag to rotate, scroll to zoom, shift-drag to pan; the buttons give top / front / side views and switch dimensions and labels on or off.</li>
        <li><b>Buildings, structures and staging</b> – <i>Chemical &amp; chlorine buildings</i> sizes the stores, tanks, bund, lime plant and chlorine rooms (D3 §6); <i>Structures (pre-design)</i> gives wall thickness, reinforcement and quantities (preliminary, BS 8007 practice); the Site layout page lists what is built in Stage I. <i>Iron, manganese &amp; fluoride</i> becomes active when the raw water exceeds SLS 614.</li></ol>` })),
      card('Keyboard shortcuts', table([{ k: 'k', l: 'Keys' }, { k: 'a', l: 'Action' }], [
        { k: 'Ctrl + N', a: 'New project' }, { k: 'Ctrl + O', a: 'Open project (.wtpd)' }, { k: 'Ctrl + S', a: 'Save' }, { k: 'Ctrl + Shift + S', a: 'Save as' },
        { k: 'Ctrl + Z / Ctrl + Y', a: 'Undo / redo' }, { k: 'Ctrl + P', a: 'Design report' }, { k: 'Ctrl + E', a: 'Export Excel workbook' }, { k: 'Ctrl + 1…9', a: 'Jump to pages' }, { k: 'F11', a: 'Full screen' }, { k: 'Ctrl + / −', a: 'Zoom' },
      ]), { flush: true }),
      card('Methods implemented', h('div', { class: 'small', html: `<ul style="line-height:1.7;margin:0;padding-left:18px">
        <li><b>NWSDB Design Manual D3 (2020)</b>: SLS 614 / SLS 722 screening, Table 4-5 process selection and Fig 4-3/4-4 trains, screens (Annex A), aeration K-chain (Annex B), coagulant feeding & PAC (§5.2, §6.1), mixing & flocculation (Tables 5-13, 5-15, 5-16), SOR Table 5-20 & settlers, filters (N = 1.2√Q, N−2 rate, gravel rules, backwash, troughs, UFRV), slow sand & roughing filters, Method 02 sludge balance and thickeners, CT Tables 6-2/6-4/6-5/6-7, residuals, bleaching powder & gas chlorination, stability (LSI, RSI, CCPP), plant layout, laboratory and Annex I water properties – see Library → NWSDB Design Manual D3.</li>
        <li><b>NWSDB Design Manual D2 (1989)</b>: design periods, community demand table, non-domestic unit demands, UFW, peaking, river-basin data, BS 3680 weirs & flumes, rational formula, Rippl yield, intake & screen rules, NPSH (storm), stand-by pumps, pump efficiencies, pipe classes & design C, economic main size, valves & thrust, service-reservoir rules, cost-estimate format, PV & EAC – see Library → NWSDB Design Manual D2.</li>
        <li><b>NWSDB Rates 2026</b> (Rate Book 2025, Vols I & II, revised by circular CQS/22/2026/98 of 14.10.2026 – replaced pipe, chemical and basic-price tables; other sections × 1.08 / 1.092 / 1.144): total cost estimate in the Table 1 format of Annex 13 (preliminaries, Table 4 engineering, Table 2 LC/FC escalation, contingency 10 %, SSCL on Sub Total 3, VAT 18 %), Section A composite rates and unit-cost graphs (A-UC/01–07) first, Section B unit rates for the Engineer's BOQ, pipe tables × B-COM/02 location factors, valves & chambers, M&E graphs, chemical prices (A-CH/01–02), CEB tariff (Annex 8) – see Library → NWSDB Rates 2026.</li>
        <li>Population: arithmetic, geometric and incremental-increase projections from census data.</li>
        <li>Screens: D2 head loss h = 0.0729(V² − v²) with clogging allowance; Joukowsky surge, NPSH, Hazen–Williams, pump/system curves.</li>
        <li>Aeration: gravity-aerator efficiency K = 0.45(1+0.046T)h per drop (D3 Annex B.1), Cₙ = Cs − (Cs − C₀)(1 − K)ⁿ.</li>
        <li>Coagulation: closed-system carbonate equilibrium for coagulation pH, alkalinity consumption, Al(OH)₃ solubility.</li>
        <li>Mixing: G = √(P/μV), P = Nₚn³D⁵ρ, hydraulic-jump sequent depth & head loss.</li>
        <li>Flocculation: Schulz & Okun baffle equations, paddle power P = C<sub>D</sub>Aρv³/2, v = 2πkrn (k = 0.75).</li>
        <li>Sedimentation: ideal basin (lecture), log-normal floc distribution, Camp scour velocity, Re & Fr stability, Yao tube settlers.</li>
        <li>Filtration: Carman–Kozeny stratified head loss, Wen–Yu fluidisation, Richardson–Zaki expansion, manifold–lateral underdrain, trough equation Q = 1.376bh^1.5.</li>
        <li>Disinfection: D3 Table 6-4/6-5 CT values (USEPA SWTR), Table 6-2 baffle factors, Table 6-7 credits, breakpoint chlorination, HOCl speciation.</li>
        <li>Stabilisation: Langelier & Ryznar indices with iterative post-lime solution.</li>
        <li>Residuals: D3 Method 02 mass balance (Table 5-44) with Method 01 cross-check; mass-curve service-reservoir sizing; quantity-based BOQ.</li></ul>` })),
      card('About', h('div', { class: 'flex', style: { gap: '14px', alignItems: 'center' } }, h('div', { html: bannerImg(44), style: { background: '#fff', borderRadius: '8px', padding: '6px 8px', border: '1px solid var(--border)' } }), h('div', null, h('b', null, 'NWSDB WTP Designer v1.8'), h('div', { class: 'small' }, CREDIT), h('div', { class: 'small muted' }, 'Conventional water treatment plant design to NWSDB Design Manuals D2 (1989) & D3 (2020) and SLS 614:2013.')))),
      card('Important', h('div', { class: 'small', html: `This application supports – it does not replace – professional engineering judgement. Demand, source, intake, pumping, mains, storage and costing follow NWSDB Design Manual D2 (1989); water quality, process selection and treatment-unit design follow NWSDB Design Manual D3 (2020), supplemented by the lecture notes and AWWA/Kawamura where D3 is silent. Printed D3 inconsistencies and the interpretation adopted are listed under Library → D3 → Errata. Costs, chemical prices and the CEB tariff follow NWSDB Rates 2026 (circular CQS/22/2026/98; VAT excluded); items not in the Rate Book are indicative and the CEB tariff category must be confirmed. Confirm all criteria, rates and tariffs against the current NWSDB documents before issue. Predicted water quality is a screening estimate; verify with jar tests and pilot data.` })),
    )];
  },
};

// ------------------------------------------------------------------ Settings
export const settings = {
  id: 'settings', title: 'Settings', sub: 'Appearance, defaults and about this program', icon: 'settings', group: 'Library', layout: 'full',
  renderFull() {
    const s = store.settings;
    const theme = h('div', { class: 'seg' }, [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'settings']].map(([k, l, ic]) => h('button', { class: s.theme === k ? 'on' : '', onclick: () => { s.theme = k; saveSettings(); window.dispatchEvent(new Event('wtp-theme')); navigate('settings'); } }, icon(ic), l)));
    const designer = h('input', { type: 'text', value: s.designer || '', placeholder: 'Name used for new projects' });
    designer.addEventListener('input', () => { s.designer = designer.value; saveSettings(); });
    return [
      card('Appearance', h('div', { class: 'field' }, h('label', null, 'Theme'), theme)),
      card('Defaults', h('div', { class: 'field' }, h('label', null, 'Designer name for new projects'), h('div', { class: 'inp' }, designer))),
      card('About', h('div', null, h('div', { class: 'small', html: `<div style="margin-bottom:10px">${bannerImg(56)}</div><b>NWSDB WTP Designer</b> v1.8 – conventional water treatment plant design suite for the National Water Supply &amp; Drainage Board, Sri Lanka.<br><b>${CREDIT}</b><br>The design references and rates used are listed under Help &amp; methods.<br>Built with Electron, d3 (ISC), KaTeX (MIT), JSZip (MIT) and Lucide icons (ISC).<br>Calculation engine: ${f2(store.calcMs)} ms per full plant recalculation.${edition.licensed ? `<br><b>Licensed</b>${edition.licensee ? ' to ' + edition.licensee : ''} (machine ${edition.machineId}).` : ''}${edition.trial ? `<br><b>Trial version</b> – ${edition.expired ? 'ended (restricted mode)' : `${edition.daysLeft} day(s) left`}${edition.ends ? `, ends ${fmtDate(edition.ends)}` : ''}. Reports and drawings are marked “Trial version – not for issue”.` : ''}` }), edition.trial || edition.licensed ? h('button', { class: 'btn sm', style: { marginTop: '8px' }, onclick: () => licenceDialog() }, icon('badge'), 'Licence…') : null)),
    ];
  },
};
