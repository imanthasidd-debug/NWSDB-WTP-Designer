// Isometric (3D) views built from simple solids: boxes, open tanks with internals and cylinders.
// World axes: x east, y north, z up (metres).  Viewer looks from the south-west, so the faces at x = x0 and y = y0
// and the top are visible.  Output is the same drawing-item model as the 2D drawings (polygons, lines, text).
import { auto } from './units.js';

const C = Math.cos(Math.PI / 6), S = 0.5;
export const P = (x, y, z = 0) => [(x - y) * C, (x + y) * S + z];
const poly = (pts, cls) => ({ t: 'poly', pts, cls });

/** Sutherland–Hodgman clip of a polygon by a convex polygon (screen coordinates) */
function clip(subject, clipper) {
  let out = subject;
  const area = clipper.reduce((a, p, i) => { const q = clipper[(i + 1) % clipper.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
  const sgn = area >= 0 ? 1 : -1;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const a = clipper[i], b = clipper[(i + 1) % clipper.length];
    const inside = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= -1e-9;
    const inter = (p, q) => { const d1 = [q[0] - p[0], q[1] - p[1]], d2 = [b[0] - a[0], b[1] - a[1]]; const den = d1[0] * d2[1] - d1[1] * d2[0]; const t = den ? ((a[0] - p[0]) * d2[1] - (a[1] - p[1]) * d2[0]) / den : 0; return [p[0] + t * d1[0], p[1] + t * d1[1]]; };
    const inp = out; out = [];
    for (let k = 0; k < inp.length; k++) {
      const p = inp[k], q = inp[(k + 1) % inp.length];
      if (inside(p)) { out.push(p); if (!inside(q)) out.push(inter(p, q)); } else if (inside(q)) out.push(inter(p, q));
    }
  }
  return out;
}

/** the three visible faces of a box as polygons */
function boxFaces(x, y, z, w, d, h, st = {}) {
  const top = st.top || 'isoTop', l = st.l || 'isoL', r = st.r || 'isoR';
  return [
    poly([P(x, y, z), P(x, y + d, z), P(x, y + d, z + h), P(x, y, z + h)], l),
    poly([P(x, y, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h)], r),
    poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top),
  ];
}
const STY = {
  building: { top: 'isoBTop', l: 'isoBL', r: 'isoBR' }, equip: { top: 'isoEq', l: 'isoEq', r: 'isoEqD' }, sand: { top: 'isoSand', l: 'isoSand', r: 'isoSand' },
  inner: { top: 'isoTop', l: 'isoIn', r: 'isoIn2' }, ground: { top: 'isoGround', l: 'isoGround', r: 'isoGround' }, sludge: { top: 'isoSludge', l: 'isoSludge', r: 'isoSludge' },
};

/** Scene collects solids and renders them back-to-front */
export class Scene {
  constructor() { this.solids = []; this.under = []; this.over = []; }
  /** solid box; kind: concrete | building | equip | sand | sludge */
  box(x, y, z, w, d, h, kind = 'concrete') { this.solids.push({ x, y, z, w, d, h, items: boxFaces(x, y, z, w, d, h, STY[kind] || {}) }); return this; }
  /** building with a pitched (gable) roof along its longer side */
  building(x, y, z, w, d, h) {
    const items = boxFaces(x, y, z, w, d, h, { top: 'isoBL', l: 'isoBL', r: 'isoBR' });
    const rh = Math.min(2.2, Math.min(w, d) * 0.28), o = 0.4;
    if (w >= d) { // ridge along x
      const yc = y + d / 2;
      items.push(poly([P(x - o, y - o, z + h), P(x + w + o, y - o, z + h), P(x + w + o, yc, z + h + rh), P(x - o, yc, z + h + rh)], 'isoBTop'));
      items.push(poly([P(x - o, y - o, z + h), P(x - o, yc, z + h + rh), P(x - o, y + d + o, z + h)], 'isoBL'));
    } else {
      const xc = x + w / 2;
      items.push(poly([P(x - o, y - o, z + h), P(x + w + o, y - o, z + h), P(xc, y - o, z + h + rh)], 'isoBR'));
      items.push(poly([P(x - o, y - o, z + h), P(xc, y - o, z + h + rh), P(xc, y + d + o, z + h + rh), P(x - o, y + d + o, z + h)], 'isoBTop'));
    }
    // door / windows on the front (y = y0) face
    const nwin = Math.max(1, Math.floor(w / 4));
    for (let i = 0; i < nwin; i++) { const wx = x + (w * (i + 0.5)) / nwin - 0.6; items.push(poly([P(wx, y, z + h * 0.45), P(wx + 1.2, y, z + h * 0.45), P(wx + 1.2, y, z + h * 0.8), P(wx, y, z + h * 0.8)], 'isoWater')); }
    this.solids.push({ x, y, z, w, d, h: h + rh, items });
    return this;
  }
  /**
   * open-topped tank: outer walls, rim, visible inner faces and water surface; inner = [{x,y,z,w,d,h,kind}] thin walls,
   * launders, media … in tank-local coordinates (origin at the inner bottom corner), drawn clipped to the opening.
   */
  tank(x, y, z, w, d, h, { t = 0.3, wl = h - 0.5, water = 'isoWater', inner = [], roof = false } = {}) {
    const items = boxFaces(x, y, z, w, d, h);
    if (roof) { this.solids.push({ x, y, z, w, d, h, items }); return this; }
    const x0 = x + t, y0 = y + t, x1 = x + w - t, y1 = y + d - t, zt = z + h;
    const open = [P(x0, y0, zt), P(x1, y0, zt), P(x1, y1, zt), P(x0, y1, zt)];
    const add = (pts, cls) => { const c = clip(pts, open); if (c.length >= 3) items.push(poly(c, cls)); };
    const zw = z + Math.min(h, Math.max(0.1, wl));
    add([P(x0, y1, zw), P(x1, y1, zw), P(x1, y1, zt), P(x0, y1, zt)], 'isoIn');   // far wall (faces south)
    add([P(x1, y0, zw), P(x1, y1, zw), P(x1, y1, zt), P(x1, y0, zt)], 'isoIn2');  // far wall (faces west)
    add([P(x0, y0, zw), P(x1, y0, zw), P(x1, y1, zw), P(x0, y1, zw)], water);
    const ins = [...inner].sort((a, b) => (b.x + b.w / 2 + b.y + b.d / 2) - (a.x + a.w / 2 + a.y + a.d / 2));
    for (const b of ins) {
      const top = Math.min(b.z + b.h, h + 0.4);
      if (top <= wl - z + 1e-6 && b.kind !== 'sand') continue; // fully submerged
      const zb = Math.max(b.z, b.kind === 'sand' ? b.z : wl);
      for (const f of boxFaces(x0 + b.x, y0 + b.y, z + zb, b.w, b.d, top - zb, STY[b.kind] || STY.inner)) add(f.pts, f.cls);
    }
    this.solids.push({ x, y, z, w, d, h, items });
    return this;
  }
  /** vertical cylinder (open tank when wl is given) */
  cyl(cx, cy, z, r, h, { wl = null, water = 'isoWater', t = 0.3, kind = 'concrete', cone = 0 } = {}) {
    const n = 36, items = [];
    const ring = (rad, zz) => Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return P(cx + rad * Math.cos(a), cy + rad * Math.sin(a), zz); });
    // visible half of the side: silhouette between the leftmost and rightmost screen points (angles 135° … 315°)
    const side = [];
    for (let i = 0; i <= n / 2; i++) { const a = (3 * Math.PI) / 4 + (Math.PI * i) / (n / 2); side.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); }
    for (let i = n / 2; i >= 0; i--) { const a = (3 * Math.PI) / 4 + (Math.PI * i) / (n / 2); side.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z + h)); }
    const st = STY[kind] || {};
    items.push(poly(side, st.r || 'isoL'));
    const top = ring(r, z + h);
    if (cone > 0) { items.push(poly(top, st.top || 'isoTop')); const apex = P(cx, cy, z + h + cone); for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; if (Math.cos(a - (5 * Math.PI) / 4) > -0.3) items.push(poly([top[i], top[(i + 1) % n], apex], i % 2 ? 'isoTop' : 'isoL')); } }
    else {
      items.push(poly(top, st.top || 'isoTop'));
      if (wl !== null) {
        const open = ring(r - t, z + h);
        items.push(poly(open, 'isoIn'));
        const w = clip(ring(r - t, z + Math.min(h, wl)), open);
        if (w.length >= 3) items.push(poly(w, water));
      }
    }
    this.solids.push({ x: cx - r, y: cy - r, z, w: 2 * r, d: 2 * r, h, items });
    return this;
  }
  ground(x, y, w, d, cls = 'isoGround') { this.under.push(poly([P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)], cls)); return this; }
  pipe(pts, cls = 'isoPipe') { for (let i = 0; i < pts.length - 1; i++) this.under.push({ t: 'line', x1: P(...pts[i])[0], y1: P(...pts[i])[1], x2: P(...pts[i + 1])[0], y2: P(...pts[i + 1])[1], cls }); return this; }
  label(x, y, z, text, extra = {}) { const [px, py] = P(x, y, z); this.over.push({ t: 'text', x: px, y: py, text, anchor: 'middle', ...extra }); return this; }
  leader(x, y, z, text, dz = 4, extra = {}) { const a = P(x, y, z), b = P(x, y, z + dz); this.over.push({ t: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], cls: 'thin' }, { t: 'text', x: b[0], y: b[1] + 0.3, text, anchor: 'middle', ...extra }); return this; }
  /** back-to-front painter's order: a solid is behind another when it lies further north or east */
  render(title, extra = {}) {
    const s = [...this.solids];
    const behind = (a, b) => a.x >= b.x + b.w - 1e-6 || a.y >= b.y + b.d - 1e-6 || (a.z + a.h <= b.z + 1e-6 && !(b.x >= a.x + a.w - 1e-6 || b.y >= a.y + a.d - 1e-6));
    const done = [], left = new Set(s);
    while (left.size) {
      let pick = null;
      for (const a of [...left].sort((p, q) => (q.x + q.w / 2 + q.y + q.d / 2) - (p.x + p.w / 2 + p.y + p.d / 2))) { let ok = true; for (const b of left) if (a !== b && behind(b, a) && !behind(a, b)) { ok = false; break; } if (ok) { pick = a; break; } }
      if (!pick) pick = [...left].sort((a, b) => (b.x + b.y) - (a.x + a.y))[0];
      left.delete(pick); done.push(pick);
    }
    const items = [...this.under, ...done.flatMap((o) => o.items), ...this.over];
    return auto(title, items, { nts: true, iso: true, ...extra });
  }
}
