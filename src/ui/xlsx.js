// Minimal Office Open XML (.xlsx) writer using JSZip – multiple sheets, bold header row, numbers & text.
import JSZip from 'jszip';
import { PAGES } from './pages/registry.js';
import { store } from './store.js';

const xmlEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const colName = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

function sheetXML(rows, widths) {
  const out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'];
  if (widths) out.push('<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>');
  out.push('<sheetData>');
  rows.forEach((r, ri) => {
    out.push(`<row r="${ri + 1}">`);
    r.forEach((v, ci) => {
      const ref = colName(ci) + (ri + 1);
      const st = ri === 0 ? ' s="1"' : '';
      if (typeof v === 'number' && Number.isFinite(v)) out.push(`<c r="${ref}"${st}><v>${v}</v></c>`);
      else if (v !== null && v !== undefined && v !== '') out.push(`<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`);
    });
    out.push('</row>');
  });
  out.push('</sheetData></worksheet>');
  return out.join('');
}

export async function buildWorkbook() {
  const r = store.results;
  const inp = store.project.inputs;
  const sheets = [];
  const s = inp.setup;
  sheets.push(['Summary', [['Item', 'Value', 'Unit'],
    ['Project', s.name, ''], ['Code', s.code, ''], ['District', s.district, ''], ['Source', `${s.source} (${s.sourceType})`, ''],
    ['Design capacity', r.demand.Qd, 'm3/d'], ['Design year', r.demand.inputs.designYear, ''], ['Population served', Math.round(r.demand.design.served), 'persons'],
    ['Treatment route', r.process.route, ''], ['Train', r.process.train.map((t) => t.label).join(' > '), ''],
    ['Capital cost', Math.round(r.cost.capex), 'LKR'], ['O&M cost', +r.cost.omPerM3.toFixed(2), 'LKR/m3'], ['Full production cost', +r.cost.fullPerM3.toFixed(2), 'LKR/m3'],
    ['Land', +r.layout.ha.toFixed(3), 'ha'], ['Max demand', Math.round(r.energy.kva), 'kVA'], ['Checks pass/review/fail', `${r.summary.ok}/${r.summary.warn}/${r.summary.fail}`, ''],
    ['NWSDB D2 checks pass/review/fail', `${r.d2.ok}/${r.d2.warn}/${r.d2.fail}`, ''], ['NWSDB D3 checks pass/review/fail/info', `${r.d3.ok}/${r.d3.warn}/${r.d3.fail}/${r.d3.info}`, ''], ['Present value (20 yr)', Math.round(r.cost.pvTotal), 'LKR'],
  ], [34, 60, 12]]);
  // inputs
  const inRows = [['Module', 'Parameter', 'Value', 'Unit']];
  for (const p of PAGES) {
    if (!p.mod || !p.fields) continue;
    for (const f of p.fields) {
      if (!f.k || f.sec !== undefined || ['custom', 'help'].includes(f.t)) continue;
      let v = inp[p.mod]?.[f.k];
      if (Array.isArray(v)) v = JSON.stringify(v);
      inRows.push([p.title, f.l || f.k, typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v, f.u || '']);
    }
  }
  sheets.push(['Inputs', inRows, [26, 46, 30, 16]]);
  // calculations
  const cRows = [['Module', 'Section', 'Step', 'Equation (LaTeX)', 'Substitution', 'Value', 'Unit', 'Reference']];
  for (const p of PAGES) {
    const res = p.mod ? r[p.mod] : null;
    if (!res?.steps) continue;
    let secT = '';
    for (const st of res.steps) {
      if (st.kind === 'section') { secT = st.title; continue; }
      if (st.kind !== 'step') continue;
      cRows.push([p.title, secT, st.label, st.eq, st.sub, typeof st.value === 'number' ? +st.value.toPrecision(6) : st.value, st.unit, st.ref]);
    }
  }
  sheets.push(['Calculations', cRows, [22, 30, 46, 40, 40, 14, 14, 30]]);
  sheets.push(['NWSDB D2 compliance', [['Clause', 'Module', 'Check', 'Value', 'Unit', 'Criterion', 'Status', 'Source'], ...r.d2.checks.map((c) => [c.clause, PAGES.find((p) => p.mod === c.module)?.title || c.module, c.label, typeof c.value === 'number' ? +c.value.toPrecision(6) : c.value, c.unit, c.range, c.status.toUpperCase(), c.src || ''])], [12, 24, 46, 14, 12, 22, 10, 50]]);
  sheets.push(['NWSDB D3 compliance', [['Clause', 'Module', 'Check', 'Value', 'Unit', 'Criterion', 'Status', 'Source'], ...r.d3.checks.map((c) => [c.clause, PAGES.find((p) => p.mod === c.module)?.title || c.module, c.label, typeof c.value === 'number' ? +c.value.toPrecision(6) : c.value, c.unit, c.range, c.status.toUpperCase(), c.src || ''])], [12, 24, 46, 14, 12, 22, 10, 50]]);
  sheets.push(['Design checks', [['Module', 'Check', 'Value', 'Unit', 'Criterion', 'Status', 'Source'], ...r.checks.map((c) => [PAGES.find((p) => p.mod === c.module)?.title || c.module, c.label, typeof c.value === 'number' ? +c.value.toPrecision(6) : c.value, c.unit, c.range, c.status.toUpperCase(), c.src || ''])], [24, 44, 14, 14, 18, 10, 40]]);
  sheets.push(['Demand', [['Year', 'Population', 'Coverage %', 'Domestic', 'Non-domestic', 'Floating+bulk', 'Net', 'NRW', 'Avg production', 'Max day', 'Plant required'], ...r.demand.table.map((t) => [t.year, Math.round(t.P), +t.cov.toFixed(1), Math.round(t.dom), Math.round(t.nonDom), Math.round(t.flt + t.bulk), Math.round(t.net), Math.round(t.nrwQ), Math.round(t.gross), Math.round(t.mdd), Math.round(t.plant)])], [8, 12, 11, 11, 12, 13, 10, 10, 14, 10, 14]]);
  sheets.push(['Water quality', [['Parameter', 'Unit', 'Raw average', 'Raw design', 'Treated (predicted)', 'SLS 614', 'Meets SLS'], ...r.compliance.rows.map((x) => [x.name, x.unit, x.raw ?? '', '', +(+x.v).toPrecision(4), x.type === 'range' ? x.sls.join('-') : x.type === 'nd' ? 'ND' : x.sls, x.exc ? 'NO' : 'YES'])], [34, 14, 12, 12, 16, 10, 10]]);
  sheets.push(['BOQ', [['Category', 'Item', 'Qty', 'Unit', 'Rate (LKR)', 'Amount (LKR)'], ...r.cost.civil.map((x) => ['Civil', x.item, +x.qty.toFixed(2), x.unit, Math.round(x.rate), Math.round(x.amount)]), ...r.cost.me.map((x) => ['M&E', x.item, +x.qty.toFixed(2), x.unit, Math.round(x.rate), Math.round(x.amount)]),
    ['', 'Preliminaries', '', '', '', Math.round(r.cost.prelim)], ['', 'Contingencies', '', '', '', Math.round(r.cost.cont)], ['', 'Engineering', '', '', '', Math.round(r.cost.eng)], ['', 'VAT', '', '', '', Math.round(r.cost.vat)], ['', 'TOTAL', '', '', '', Math.round(r.cost.capex)]], [10, 60, 12, 8, 14, 16]]);
  sheets.push(['O&M', [['Item', 'LKR per year'], ...Object.entries(r.cost.om).map(([k, v]) => [k, Math.round(v)]), ['Total', Math.round(r.cost.omTot)], ['Per m3 produced', +r.cost.omPerM3.toFixed(2)]], [30, 18]]);
  sheets.push(['Electrical loads', [['Group', 'Load', 'kW each', 'Installed', 'Running', 'h/d', 'kWh/d'], ...r.energy.loads.map((l) => [l.group, l.name, l.kwEach, l.nInst, l.nRun, +l.hours.toFixed(2), Math.round(l.kwh)])], [14, 40, 10, 10, 10, 8, 10]]);

  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([n], i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B63B6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  sheets.forEach(([, rows, w], i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXML(rows, w)));
  return zip.generateAsync({ type: 'uint8array' });
}
