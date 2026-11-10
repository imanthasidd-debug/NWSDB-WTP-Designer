import fs from 'node:fs';
import { computeAll } from '../src/engine/index.js';
import { SAMPLES } from '../src/ui/samples.js';
import { drawingGroups } from '../src/ui/draw/views.js';
import { drawingDXF, drawingSVG } from '../src/ui/draw/render.js';
const out = process.argv[2];
for (const s of SAMPLES) {
  const r = computeAll(s.build());
  const list = drawingGroups(r).flatMap((g) => g.views.map((v) => v.dw));
  list.forEach((dw, i) => {
    fs.writeFileSync(`${out}/${s.id}-${i}.dxf`, drawingDXF(dw));
    fs.writeFileSync(`${out}/${s.id}-${i}.svg`, drawingSVG(dw, { statik: true }).svg);
  });
  console.log(s.id, list.length, 'drawings');
}
