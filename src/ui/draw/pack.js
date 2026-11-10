// Drawing pack: the full set of design drawings as NWSDB A3 sheets (PDF via print), DXF with title blocks and SVG.
import { pfdSVG } from './pfd.js';
import { sheetMeta, sheetSVG, sheetsHTML, sheetDXF, drawingNumber } from './sheet.js';
import { groupsOf } from './views.js';

/** flat list of every drawing (all structures, all views) in register order */
export function drawingList(r) {
  return groupsOf(r).flatMap((g) => g.views.map((v) => v.dw));
}

/** every sheet of the pack: [{title, number, svg, dxf?}] – sheet 1 is the process flow diagram (not to scale) */
export function packSheets(r, project, { filter } = {}) {
  const list = drawingList(r).filter((dw) => !filter || filter(dw));
  const N = list.length + 1;
  const pf = pfdSVG(r, { interactive: false, statik: true });
  const out = [{ title: 'Process flow diagram', number: drawingNumber(project.inputs.setup, 'Process flow diagram'), svg: sheetSVG({ title: 'Process flow diagram' }, sheetMeta(project, { sheet: 1, sheets: N }), { nts: true, inner: pf }).svg }];
  list.forEach((dw, i) => {
    const meta = sheetMeta(project, { sheet: i + 2, sheets: N });
    const s = sheetSVG(dw, meta);
    out.push({ title: dw.title, number: s.number, svg: s.svg, dxf: sheetDXF(dw, meta), scale: s.scale, code: dw.code, group: dw.group, view: dw.view });
  });
  return out;
}
export const packHTML = (sheets, title) => sheetsHTML(sheets.map((s) => s.svg), title);
