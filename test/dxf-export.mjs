import fs from 'node:fs';
import { computeAll } from '../src/engine/index.js';
import { SAMPLES } from '../src/ui/samples.js';
import * as U from '../src/ui/draw/units.js';
import { drawingDXF, drawingSVG } from '../src/ui/draw/render.js';
const out = process.argv[2];
for (const s of SAMPLES) {
  const r = computeAll(s.build());
  const list = [U.intakeSection(r.intake), U.aeratorSection(r.aeration), U.rapidMixDrawing(r.rapidmix), U.flocDrawing(r.floc), U.sedPlan(r.sed), U.sedSection(r.sed), U.filterPlan(r.filt), U.filterSection(r.filt, r.hyd), U.contactPlan(r.dis), U.cwrPlan(r.storage), U.hydraulicProfile(r.hyd), U.layoutPlan(r.layout)].filter(Boolean);
  list.forEach((dw, i) => {
    fs.writeFileSync(`${out}/${s.id}-${i}.dxf`, drawingDXF(dw));
    fs.writeFileSync(`${out}/${s.id}-${i}.svg`, drawingSVG(dw, { statik: true }).svg);
  });
  console.log(s.id, list.length, 'drawings');
}
