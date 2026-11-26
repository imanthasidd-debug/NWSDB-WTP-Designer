import fs from 'node:fs';
import { computeAll } from '../src/engine/index.js';
import { SAMPLES } from '../src/ui/samples.js';
import { drawingGroups } from '../src/ui/draw/views.js';
import { drawingDXF, drawingSVG } from '../src/ui/draw/render.js';
import { sheetDXF, sheetMeta } from '../src/ui/draw/sheet.js';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
for (const s of SAMPLES) {
  const p = s.build();
  const r = computeAll(p);
  const list = drawingGroups(r).flatMap((g) => g.views.map((v) => v.dw));
  list.forEach((dw, i) => {
    fs.writeFileSync(`${out}/${s.id}-${i}.dxf`, drawingDXF(dw));
    fs.writeFileSync(`${out}/${s.id}-${i}.svg`, drawingSVG(dw, { statik: true }).svg);
    // the A3 sheet (frame, notes, NWSDB title strip) of every third drawing
    if (i % 3 === 0) fs.writeFileSync(`${out}/${s.id}-${i}-sheet.dxf`, sheetDXF(dw, sheetMeta(p)));
  });
  console.log(s.id, list.length, 'drawings');
}
