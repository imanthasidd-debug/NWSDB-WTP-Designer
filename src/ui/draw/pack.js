// Drawing pack: the full set of design drawings as NWSDB A3 sheets (PDF via print), DXF with title blocks and SVG.
import * as U from './units.js';
import { pfdSVG } from './pfd.js';
import { sheetMeta, sheetSVG, sheetsHTML, sheetDXF, drawingNumber } from './sheet.js';

export function drawingList(r) {
  return [U.intakeSection(r.intake), r.process.has.aeration ? U.aeratorSection(r.aeration) : null, r.rapidmix?.enabled !== false && r.process.has.rapidmix ? U.rapidMixDrawing(r.rapidmix) : null,
    r.process.has.floc ? U.flocDrawing(r.floc) : null, r.sed?.enabled ? U.sedPlan(r.sed) : null, r.sed?.enabled ? U.sedSection(r.sed) : null, U.filterPlan(r.filt), U.filterSection(r.filt, r.hyd),
    U.contactPlan(r.dis), U.cwrPlan(r.storage), U.hydraulicProfile(r.hyd), U.layoutPlan(r.layout)].filter(Boolean);
}

/** every sheet of the pack: [{title, number, svg, dxf?}] – sheet 1 is the process flow diagram (not to scale) */
export function packSheets(r, project) {
  const list = drawingList(r);
  const N = list.length + 1;
  const pf = pfdSVG(r, { interactive: false, statik: true });
  const out = [{ title: 'Process flow diagram', number: drawingNumber(project.inputs.setup, 'Process flow diagram'), svg: sheetSVG({ title: 'Process flow diagram' }, sheetMeta(project, { sheet: 1, sheets: N }), { nts: true, inner: pf }).svg }];
  list.forEach((dw, i) => {
    const meta = sheetMeta(project, { sheet: i + 2, sheets: N });
    const s = sheetSVG(dw, meta);
    out.push({ title: dw.title, number: s.number, svg: s.svg, dxf: sheetDXF(dw, meta), scale: s.scale });
  });
  return out;
}
export const packHTML = (sheets, title) => sheetsHTML(sheets.map((s) => s.svg), title);
