// 3D views (v1.8.5) of the units that had plan / section drawings only: aerator, rapid mixer, sludge thickener,
// sludge drying beds, treated-water pump house, chemical house and chlorination building. Same Scene model as the
// other 3D views (views.js): static isometric for A3 / PDF / DXF / SVG and a mesh for the interactive viewer.
// Buildings are shown cut away – front and west walls cut at 1.0 m, back walls full height, the full envelope
// as faint lines – so the equipment inside can be seen.
import { fmt } from '../../core/util.js';
import { Scene } from './iso.js';
import { mm } from './units.js';

const f2 = (v) => fmt(v, 2),
  f1 = (v) => fmt(v, 1),
  f0 = (v) => fmt(v, 0);
const CUT = 1.0; // height of cut-away walls (m)

// ---------------------------------------------------------------- Aerator
export function aerator3D(ae) {
  if (!ae || ae.enabled === false || !(ae.W > 0)) return null;
  const s = new Scene();
  if (ae.type === 'cascade') {
    const n = Math.max(1, ae.inputs.nSteps),
      h = ae.inputs.stepH,
      L = ae.L,
      W = ae.W,
      tr = L / n,
      t = 0.25,
      base = 0.6,
      fall = n * h;
    s.ground(-5, -4, L + 11, W + 8);
    // collection channel at the foot (front, west), steps rising eastwards, inlet chamber at the top (back, east):
    // the risers face the viewer
    s.tank(-1.9, -t, 0, 1.9, W + 2 * t, base, { t, wl: base - 0.25 });
    for (let i = 0; i < n; i++) {
      const x = i * tr,
        top = base + (i + 1) * h;
      s.box(x, 0, 0, tr, W, top);
      s.box(x, 0, top, tr, W, 0.05, 'water'); // water film on the tread
      s.box(x, -t, 0, tr, t, top + 0.3); // side walls stepping with the treads
      s.box(x, W, 0, tr, t, top + 0.3);
    }
    s.tank(L, -t, 0, 1.9, W + 2 * t, base + fall + 0.5, { t, wl: base + fall + 0.3 });
    s.dim([0, -t, 0], [L, -t, 0], [0, -1.4, 0], `${n} steps × ${mm(tr)} = ${mm(L)}`);
    s.dim([-1.9, 0, 0], [-1.9, W, 0], [-1.2, 0, 0], `W ${mm(W)}`);
    s.dim([L + 1.9, -t, base], [L + 1.9, -t, base + fall], [1, -1, 0], `fall ${mm(fall)}`);
    s.leader(L + 0.95, W / 2, base + fall + 0.5, 'Inlet chamber', 2.5, { size: 0.6 });
    s.leader(-0.95, W * 0.15, base, 'Collection channel', 1.0, { size: 0.6 });
    return s.render(
      `Cascade aerator – 3D view (${n} steps × ${f2(h)} m, ${f2(W)} m wide, DO ${f1(ae.C0)} → ${f1(ae.Ce)} mg/L)`,
    );
  }
  // multiple-tray towers standing in a collecting basin
  const n = Math.max(1, ae.inputs.nTrays),
    sp = ae.inputs.traySpacing,
    W = ae.W,
    nU = Math.min(ae.nUnits || 1, 4),
    z0 = 0.9,
    zTop = z0 + (n - 1) * sp;
  s.ground(-3, -3, nU * (W + 3) + 3, W + 6);
  for (let k = 0; k < nU; k++) {
    const x0 = k * (W + 3);
    s.tank(x0 - 0.7, -0.7, 0, W + 1.4, W + 1.4, 0.6, { t: 0.3, wl: 0.45 });
    for (const [px, py] of [
      [x0 - 0.15, -0.15],
      [x0 + W, -0.15],
      [x0 - 0.15, W],
      [x0 + W, W],
    ])
      s.box(px, py, 0.6, 0.15, 0.15, zTop + 0.3 - 0.6);
    for (let i = 0; i < n; i++) s.box(x0, 0, z0 + i * sp, W, W, 0.12, 'sand'); // trays with coke / gravel media
    s.box(x0 + W * 0.15, W * 0.45, zTop + 0.12, W * 0.7, 0.12, 0.12, 'equip'); // perforated distributor
    s.box(x0 + W / 2 - 0.08, W * 0.45, zTop + 0.24, 0.16, 0.12, 0.9, 'equip'); // inlet riser
  }
  s.dim([0, 0, z0], [W, 0, z0], [0, -1.2, 0], `${mm(W)} square trays`);
  s.dim([W, 0, z0], [W, 0, zTop], [0.9, -0.9, 0], `${n} trays at ${mm(sp)}`);
  s.leader(W / 2, W / 2, zTop + 1.14, `Inlet distributor`, 1.5, { size: 0.6 });
  return s.render(
    `Multiple-tray aerator – 3D view (${ae.nUnits} tower${ae.nUnits > 1 ? 's' : ''}${ae.nUnits > nU ? ', ' + nU + ' shown' : ''}, DO ${f1(ae.C0)} → ${f1(ae.Ce)} mg/L)`,
  );
}

// ---------------------------------------------------------------- Rapid mixer
export function rapidMix3D(rm) {
  if (!rm || !rm.enabled) return null;
  const s = new Scene();
  if (rm.type === 'mechanical') {
    const B = rm.B,
      H = rm.H,
      t = 0.3,
      Ht = H + 0.5,
      n = Math.min(rm.nBasins || 1, 4),
      Bo = B + 2 * t;
    s.ground(-3, -3, n * (Bo + 0.6) + 5, Bo + 6);
    for (let k = 0; k < n; k++) {
      const x0 = k * (Bo + 0.6);
      s.tank(x0, 0, 0, Bo, Bo, Ht, { t, wl: H, water: 'isoWaterBrown' });
      s.box(x0, Bo / 2 - 0.3, Ht, Bo, 0.6, 0.25); // drive bridge
      s.box(x0 + Bo / 2 - 0.4, Bo / 2 - 0.4, Ht + 0.25, 0.8, 0.8, 0.6, 'equip'); // gearbox
      s.cyl(x0 + Bo / 2, Bo / 2, Ht + 0.85, 0.28, 0.6, { kind: 'equip' }); // motor
    }
    s.dimsBox(0, 0, 0, Bo, Bo, Ht, { labels: { L: `${mm(B)} inside`, W: `${mm(B)}`, H: `${mm(Ht)}` } });
    s.leader(Bo / 2, Bo / 2, Ht + 1.45, `${rm.motor} kW · ${f0(rm.rpm)} rpm · impeller Ø ${f2(rm.Di)} m`, 2, {
      size: 0.6,
    });
    return s.render(`Flash mixers – 3D view (${rm.nBasins} basin${rm.nBasins > 1 ? 's' : ''}, G ${f0(rm.Gact)} s⁻¹)`);
  }
  // hydraulic jump: raised approach channel, drop weir, jump in the downstream channel
  const L = rm.Lj,
    b = rm.b,
    t = 0.25,
    drop = rm.drop,
    y2 = rm.y2,
    Hw = rm.Hw,
    top = drop + Hw + 0.6,
    Wo = b + 2 * t;
  s.ground(-6, -3, L + 13, Wo + 6);
  s.box(-3.2, 0, 0, 3.2, Wo, drop); // substructure under the approach channel
  s.tank(-3.2, 0, drop, 3.2, Wo, Hw + 0.6, { t, wl: Hw + 0.2, water: 'isoWaterBrown' });
  s.tank(0, 0, 0, L + 3.5, Wo, Math.min(top, y2 + 0.5), { t, wl: y2, water: 'isoWaterBrown' });
  s.box(-0.75, -0.4, top, 0.12, Wo + 0.8, 0.12, 'equip'); // coagulant diffuser across the weir
  s.dim([0.6, 0, 0], [0.6 + L, 0, 0], [0, -1.4, 0], `Lⱼ = ${mm(L)}`);
  s.dim([-3.2, 0, 0], [-3.2, Wo, 0], [-1.1, 0, 0], `b = ${mm(b)}`);
  s.dim([L + 3.5, 0, 0], [L + 3.5, 0, drop], [1, -1, 0], `drop ${mm(drop)}`);
  s.leader(-0.7, Wo / 2, top + 0.12, 'Drop weir · coagulant diffuser', 2.2, { size: 0.6 });
  s.leader(0.6 + L / 2, Wo / 2, y2, 'Hydraulic jump', top - y2 + 1.0, { size: 0.6 });
  return s.render(
    `Hydraulic-jump mixer – 3D view (Fr₁ ${f2(rm.Fr1)}, G ${f0(rm.Gact)} s⁻¹, t ${f2(rm.tAct)} s, hL ${f2(rm.hL)} m)`,
  );
}

// ---------------------------------------------------------------- Sludge thickener
export function thickener3D(sl) {
  const th = sl?.thick;
  if (!th || !(th.D > 0)) return null;
  const s = new Scene(),
    r = th.D / 2,
    t = 0.35,
    fb = th.freeboard || 0.6,
    H = th.swd + fb,
    n = Math.min(th.n || 1, 4),
    gap = 5,
    R = r + t;
  s.ground(-R - 4, -R - 4, n * (2 * R + gap) + 4, 2 * R + 8);
  for (let k = 0; k < n; k++) {
    const cx = k * (2 * R + gap);
    s.cyl(cx, 0, 0, R, H, { wl: th.swd, water: 'isoWaterBrown', t });
    s.box(cx - R, -0.4, H, 2 * R, 0.8, 0.25); // access bridge
    s.box(cx - 0.55, -0.55, H + 0.25, 1.1, 1.1, 0.7, 'equip'); // scraper drive
    s.pipe([
      [cx - R, 0, 0.3],
      [cx - R - 3, 0, 0.3],
    ]); // underflow to the dewatering units
  }
  const cxL = (n - 1) * (2 * R + gap);
  s.dim([-R, -R, 0], [R, -R, 0], [0, -1.5, 0], `Ø ${mm(th.D)}`);
  s.dim([cxL + R, 0, 0], [cxL + R, 0, H], [1.2, 0, 0], `SWD ${mm(th.swd)} + ${mm(fb)}`);
  s.leader(0, 0, H + 0.95, 'Scraper drive', 2, { size: 0.6 });
  s.leader(-R - 3, 0, 0.3, `Thickened sludge ≈ ${f0(th.underflow)} m³/d`, 1.6, { size: 0.6 });
  return s.render(
    `Gravity sludge thickeners – 3D view (${th.n} × Ø ${f2(th.D)} m${th.n > n ? ', ' + n + ' shown' : ''}, hopper below ground)`,
  );
}

// ---------------------------------------------------------------- Sludge drying beds
export function beds3D(sl) {
  if (!sl || !(sl.bedArea > 0) || !(sl.nBeds > 0)) return null;
  const s = new Scene(),
    n = Math.min(sl.nBeds, 8),
    a = sl.bedArea / sl.nBeds,
    w = Math.max(3, Math.round(Math.sqrt(a / 3) * 10) / 10),
    L = Math.round((a / w) * 10) / 10,
    t = 0.25,
    Hw = 1.2,
    pitch = w + 2 * t + 0.4,
    Wt = n * pitch - 0.4;
  s.ground(-4, -4, Wt + 8, L + 2 * t + 8);
  for (let k = 0; k < n; k++) {
    const drying = k % 3 !== 0; // most beds drying, every third one cleaned and ready
    s.tank(k * pitch, 0, 0, w + 2 * t, L + 2 * t, Hw, {
      t,
      wl: drying ? 0.85 : 0.55,
      water: drying ? 'isoSludge' : 'isoSand',
    });
  }
  s.pipe([
    [-2, L + 2 * t + 0.7, 1.5],
    [Wt + 1, L + 2 * t + 0.7, 1.5],
  ]); // sludge feed main with splash pads
  s.pipe([
    [-2, -0.9, 0.05],
    [Wt + 1, -0.9, 0.05],
  ]); // filtrate collector
  s.dim([0, 0, 0], [w + 2 * t, 0, 0], [0, -1.6, 0], `${mm(w)}`);
  s.dim([0, 0, 0], [0, L + 2 * t, 0], [-1.2, 0, 0], `${mm(L)}`);
  s.dim([Wt, 0, 0], [Wt, 0, Hw], [1, -1, 0], `${mm(Hw)}`);
  if (n > 1) s.leader(pitch + (w + 2 * t) / 2, (L + 2 * t) * 0.8, 0.85, 'Drying – sludge 0.30 m', 2.2, { size: 0.6 });
  s.leader((w + 2 * t) / 2, (L + 2 * t) * 0.2, 0.55, 'Cleaned – sand 0.25 m on gravel', 2.2, { size: 0.6 });
  return s.render(
    `Sludge drying beds – 3D view (${sl.nBeds} beds${sl.nBeds > n ? ', ' + n + ' shown' : ''}, ${f0(a)} m² each)`,
  );
}

// ---------------------------------------------------------------- Buildings (cut away)
/** shell of a single-storey building cut away to show the inside; furnish(s) adds the equipment */
function cutaway(s, L, W, H, { t = 0.23, partitions = [] } = {}) {
  s.ground(-t, -t, L + 2 * t, W + 2 * t, 'isoRoad'); // floor slab
  s.ghostBox(-t, -t, 0, L + 2 * t, W + 2 * t, H);
  s.box(-t, W, 0, L + 2 * t, t, H, 'building'); // back (north) wall, full height
  s.box(L, -t, 0, t, W + t, H, 'building'); // east wall, full height
  s.box(-t, -t, 0, L + t, t, CUT, 'building'); // front (south) wall, cut
  s.box(-t, 0, 0, t, W, CUT, 'building'); // west wall, cut
  for (const x of partitions) s.box(x - 0.075, 0, 0, 0.15, W, CUT, 'building');
}
/** room names above the back wall, on three staggered levels so neighbouring names do not overlap */
function roomLabels(s, rooms, W, H) {
  rooms.forEach((rm, i) =>
    s.leader(rm.x + rm.w / 2, W - 0.6, CUT, rm.name, H - CUT + 0.8 + (i % 3) * 1.1, { size: 0.55 }),
  );
}
/** pallets of bags on a grid inside a room */
function pallets(s, x0, x1, y0, y1, hgt = 1.2) {
  for (let y = y0; y + 1.0 <= y1 + 1e-6; y += 1.5)
    for (let x = x0; x + 1.1 <= x1 + 1e-6; x += 1.5) s.box(x, y, 0, 1.1, 1.0, hgt, 'stock');
}

export function pumpHouse3D(st) {
  if (!st?.pumps) return null;
  const s = new Scene(),
    nD = st.inputs.nDuty || 2,
    nP = nD + (st.pumps.nStandby ?? st.inputs.nStandby ?? 1),
    Lh = Math.max(10, 4 + 3 * nP),
    Wh = 9,
    H = 6;
  s.ground(-5, -4, Lh + 11, Wh + 8);
  cutaway(s, Lh, Wh, H, { t: 0.25 });
  s.pipe([
    [-3, 1.4, 0.5],
    [Lh - 1, 1.4, 0.5],
  ]); // suction header from the clear water reservoir
  s.pipe([
    [1, Wh - 1.4, 1.6],
    [Lh + 4, Wh - 1.4, 1.6],
  ]); // delivery header
  for (let i = 0; i < nP; i++) {
    const x = 2.5 + i * ((Lh - 5) / Math.max(1, nP - 1));
    s.pipe([
      [x, 1.4, 0.5],
      [x, 3.2, 0.6],
    ]);
    s.pipe([
      [x + 0.9, 3.75, 1.1],
      [x + 0.9, 3.75, 1.6],
      [x + 0.9, Wh - 1.4, 1.6],
    ]);
    s.box(x - 0.6, 3.0, 0, 1.2, 3.0, 0.25); // plinth
    s.box(x - 0.45, 3.2, 0.25, 0.9, 1.1, 0.85, 'equip'); // pump
    s.cyl(x, 5.05, 0.25, 0.4, 1.3, { kind: 'equip' }); // motor (vertical view of the frame)
  }
  s.box(Lh - 2.6, 0.3, 0, 2.3, 0.8, 2.1, 'inner'); // MCC / panels
  s.box(Lh * 0.45, 0, H - 1.2, 0.4, Wh, 0.45, 'equip'); // overhead travelling crane girder
  s.dim([0, -0.25, 0], [Lh, -0.25, 0], [0, -1.6, 0], `${mm(Lh)}`);
  s.dim([-0.25, 0, 0], [-0.25, Wh, 0], [-1.3, 0, 0], `${mm(Wh)}`);
  s.leader(Lh * 0.45 + 0.2, Wh / 2, H - 0.75, 'Overhead travelling crane', 1.6, { size: 0.6 });
  s.leader(Lh - 1.45, 0.7, 2.1, 'MCC / panels', 1.6, { size: 0.6 });
  s.leader(Lh + 3, Wh - 1.4, 1.6, `Delivery DN${st.pumps.dn} → service reservoir`, 2.2, { size: 0.6 });
  s.leader(-2.5, 1.4, 0.5, 'Suction header from the CWR', 2.6, { size: 0.6 });
  return s.render(
    `Treated-water pump house – 3D view (${nD} duty + ${nP - nD} standby, ${st.pumps.motor} kW each; front walls cut away)`,
  );
}

export function chemHouse3D(bl) {
  const b = bl?.chem;
  if (!b?.rooms?.length) return null;
  const s = new Scene(),
    L = b.L,
    W = b.W,
    H = b.H || 5;
  s.ground(-4, -5, L + 8, W + 9);
  cutaway(s, L, W, H, { partitions: b.rooms.slice(1).map((rm) => rm.x) });
  for (const rm of b.rooms) {
    const x0 = rm.x + 0.5,
      x1 = rm.x + rm.w - 0.4;
    if (rm.key === 'store' || rm.key === 'pac') pallets(s, x0, x1, 0.6, W - 1.0);
    else if (rm.key === 'prep') {
      const sd = b.tankSide || 1.5,
        n = b.nTanks || 2,
        dep = b.tankDepth || 1.5,
        bh = b.bundH || 0.6,
        bx = rm.x + 0.3,
        bw = rm.w - 0.6,
        bd = Math.min(W - 1.2, sd + 1.6);
      // bund walls
      s.box(bx, 0.4, 0, bw, 0.15, bh);
      s.box(bx, 0.4 + bd - 0.15, 0, bw, 0.15, bh);
      s.box(bx, 0.55, 0, 0.15, bd - 0.3, bh);
      s.box(bx + bw - 0.15, 0.55, 0, 0.15, bd - 0.3, bh);
      for (let k = 0; k < n; k++) {
        const tx = rm.x + (rm.w * (k + 0.5)) / n - sd / 2;
        s.tank(tx, 0.8, 0, sd, sd, dep + 0.3, { t: 0.1, wl: dep * 0.8, water: 'isoWaterMid' });
        s.box(tx, 0.8 + sd / 2 - 0.1, dep + 0.3, sd, 0.2, 0.12); // agitator beam
        s.box(tx + sd / 2 - 0.2, 0.8 + sd / 2 - 0.2, dep + 0.42, 0.4, 0.4, 0.45, 'equip'); // agitator
      }
    } else if (rm.key === 'dose') {
      const n = b.nPumps || 3;
      for (let k = 0; k < n; k++) {
        const px = rm.x + (rm.w * (k + 0.5)) / n;
        s.box(px - 0.25, 1.0, 0, 0.5, 0.8, 0.6, 'equip');
        s.pipe([
          [px, 1.8, 0.5],
          [px, 2.6, 0.8],
        ]);
      }
      s.pipe([
        [rm.x + 0.4, 2.6, 0.8],
        [rm.x + rm.w - 0.4, 2.6, 0.8],
      ]);
    } else if (rm.key === 'lime') {
      const lm = b.lime || {},
        sat = lm.feed === 'saturator';
      pallets(s, x0, rm.x + rm.w * 0.5, 0.6, W * 0.45);
      const rr = Math.min(
        W * 0.13,
        rm.w * 0.2,
        sat ? (lm.satD || 1.5) / 2 : Math.max(0.6, Math.sqrt((lm.slurryTank || 2) / 2.5 / Math.PI)),
      );
      const ht = Math.min(H - 1.0, sat ? 3.2 : Math.max(1.5, (lm.slurryTank || 2) / (Math.PI * rr * rr)));
      for (let k = 0; k < 2; k++) {
        const cx = rm.x + rm.w * 0.78,
          cy = W * (0.2 + 0.32 * k);
        s.cyl(cx, cy, 0, rr, ht, { wl: ht - 0.35, water: 'isoWaterMid', t: 0.08, kind: 'inner' });
        s.box(cx - 0.2, cy - 0.2, ht, 0.4, 0.4, 0.45, 'equip');
      }
    } else if (rm.key === 'office') {
      s.box(rm.x + 0.5, 0.8, 0, Math.min(1.6, rm.w - 1), 0.8, 0.75, 'inner'); // desk
      s.box(rm.x + rm.w - 1.0, W - 1.0, 0, 0.6, 0.5, 1.8, 'inner'); // cabinet
    }
  }
  s.box(0, -2.2, 0, L, 1.8, CUT); // raised loading platform along the front
  s.dim([0, -2.2, 0], [L, -2.2, 0], [0, -1.4, 0], `${mm(L)}`);
  s.dim([-0.23, 0, 0], [-0.23, W, 0], [-1.3, 0, 0], `${mm(W)}`);
  s.dim([-0.23, -0.23, 0], [-0.23, -0.23, H], [-1, -1, 0], `${mm(H)} clear`);
  roomLabels(s, b.rooms, W, H);
  s.leader(L * 0.5, -1.3, CUT, 'Raised loading platform', 1.2, { size: 0.55 });
  return s.render(`Chemical house – 3D view (${f0(b.area)} m², clear height ${f1(H)} m; front walls cut away)`);
}

export function chlor3D(bl) {
  const b = bl?.chlor;
  if (!b?.rooms?.length) return null;
  const s = new Scene(),
    g = bl.chlorGas,
    L = b.L,
    W = b.W,
    H = b.H || 4,
    drum = !!g?.drum;
  s.ground(-4, -4, L + 8, W + 8);
  cutaway(s, L, W, H, { partitions: b.rooms.slice(1).map((rm) => rm.x) });
  for (const rm of b.rooms) {
    if (rm.key === 'store' && b.gas) {
      const dw = drum ? 2.1 : 0.4,
        dd = drum ? 0.8 : 0.4;
      let k = 0;
      for (let y = 0.6; y + dd < W - 1.2 && k < g.nStore; y += dd + 0.5)
        for (let x = rm.x + 0.5; x + dw <= rm.x + rm.w - 0.4 && k < g.nStore; x += dw + 0.5, k++) {
          if (drum) {
            s.box(x + 0.2, y, 0, 0.15, dd, 0.25); // cradles
            s.box(x + dw - 0.35, y, 0, 0.15, dd, 0.25);
            s.box(x, y, 0.25, dw, dd, dd, 'equip'); // 1-tonne container lying on its side
          } else s.cyl(x + 0.2, y + 0.2, 0, 0.2, 1.5, { kind: 'equip' }); // cylinder chained upright
        }
      s.box(rm.x + 0.3, W - 1.4, H - 0.7, rm.w - 0.6, 0.2, 0.25, 'equip'); // monorail hoist beam
    } else if (rm.key === 'feed' && b.gas) {
      const n = Math.min(4, 2 * (g.onLine || 1));
      for (let k = 0; k < n; k++) {
        const y = 0.7 + k * ((W - 1.6) / Math.max(1, n));
        s.box(rm.x + 0.5, y - 0.05, 0, Math.min(2.3, rm.w - 0.8), 1.0, 0.1, 'inner'); // weigh scale
        if (drum) s.box(rm.x + 0.6, y, 0.1, Math.min(2.1, rm.w - 1.2), 0.8, 0.8, 'equip');
        else s.cyl(rm.x + rm.w / 2, y + 0.3, 0.1, 0.25, 1.5, { kind: 'equip' });
      }
    } else if (rm.key === 'chlor') {
      for (let k = 0; k < 2; k++) s.box(rm.x + 0.5 + k * 1.0, W - 0.7, 0.8, 0.7, 0.35, 0.9, 'inner'); // chlorinators
    } else if (rm.key === 'scrub') {
      const rr = Math.min(0.9, rm.w * 0.3);
      s.cyl(rm.x + rm.w / 2, W * 0.35, 0, rr, Math.min(H - 1, 2.4), { kind: 'inner' }); // NaOH scrubber tank
      s.box(rm.x + rm.w / 2 - 0.35, W * 0.7, 0, 0.7, 0.7, 1.4, 'equip'); // scrubber fan
    } else if (rm.key === 'store') pallets(s, rm.x + 0.5, rm.x + rm.w - 0.4, 0.6, W - 1.0, 1.0);
    else if (rm.key === 'feed') {
      const sd = Math.max(0.8, (rm.w - 1.6) / 2);
      for (let k = 0; k < 2; k++)
        s.tank(rm.x + 0.6 + (k * (rm.w - 1.2)) / 2, 0.8, 0, sd, sd, 1.3, {
          t: 0.06,
          wl: 1.0,
          water: 'isoWaterMid',
        });
      s.box(rm.x + 0.5, W - 0.9, 0, 0.5, 0.5, 0.6, 'equip'); // dosing pumps
      s.box(rm.x + 1.2, W - 0.9, 0, 0.5, 0.5, 0.6, 'equip');
    }
  }
  s.dim([-0.23, -0.23, 0], [L + 0.23, -0.23, 0], [0, -1.4, 0], `${mm(L)}`);
  s.dim([-0.23, 0, 0], [-0.23, W, 0], [-1.3, 0, 0], `${mm(W)}`);
  roomLabels(s, b.rooms, W, H);
  return s.render(
    `Chlorination building – 3D view (${b.gas ? 'gas chlorination' : 'hypochlorite'}, ${f0(b.area)} m²; front walls cut away)`,
  );
}
