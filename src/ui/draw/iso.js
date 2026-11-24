// 3D scenes built from simple solids: boxes, open tanks with internals, cylinders and gabled buildings.
// World axes: x east, y north, z up (metres).  Every scene yields
//   (a) a static isometric drawing (viewer in the south-west) in the same item model as the 2D drawings – used for
//       A3 sheets, PDF / DXF / SVG export and the report, and
//   (b) a 3D mesh (faces, lines, labels, dimensions) for the interactive orbit viewer (view3d.js).
import { auto } from './units.js';
import { fmt } from '../../core/util.js';

const C = Math.cos(Math.PI / 6),
  S = 0.5;
export const P = (x, y, z = 0) => [(x - y) * C, (x + y) * S + z];
const poly = (pts, cls) => ({ t: 'poly', pts, cls });

/** Sutherland–Hodgman clip of a polygon by a convex polygon (screen coordinates) */
function clip(subject, clipper) {
  let out = subject;
  const area = clipper.reduce((a, p, i) => {
    const q = clipper[(i + 1) % clipper.length];
    return a + p[0] * q[1] - q[0] * p[1];
  }, 0);
  const sgn = area >= 0 ? 1 : -1;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const a = clipper[i],
      b = clipper[(i + 1) % clipper.length];
    const inside = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= -1e-9;
    const inter = (p, q) => {
      const d1 = [q[0] - p[0], q[1] - p[1]],
        d2 = [b[0] - a[0], b[1] - a[1]];
      const den = d1[0] * d2[1] - d1[1] * d2[0];
      const t = den ? ((a[0] - p[0]) * d2[1] - (a[1] - p[1]) * d2[0]) / den : 0;
      return [p[0] + t * d1[0], p[1] + t * d1[1]];
    };
    const inp = out;
    out = [];
    for (let k = 0; k < inp.length; k++) {
      const p = inp[k],
        q = inp[(k + 1) % inp.length];
      if (inside(p)) {
        out.push(p);
        if (!inside(q)) out.push(inter(p, q));
      } else if (inside(q)) out.push(inter(p, q));
    }
  }
  return out;
}

/** the three visible faces of a box as polygons (static isometric) */
function boxFaces(x, y, z, w, d, h, st = {}) {
  const top = st.top || 'isoTop',
    l = st.l || 'isoL',
    r = st.r || 'isoR';
  return [
    poly([P(x, y, z), P(x, y + d, z), P(x, y + d, z + h), P(x, y, z + h)], l),
    poly([P(x, y, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h)], r),
    poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top),
  ];
}
const STY = {
  building: { top: 'isoBTop', l: 'isoBL', r: 'isoBR' },
  equip: { top: 'isoEq', l: 'isoEq', r: 'isoEqD' },
  sand: { top: 'isoSand', l: 'isoSand', r: 'isoSand' },
  inner: { top: 'isoTop', l: 'isoIn', r: 'isoIn2' },
  ground: { top: 'isoGround', l: 'isoGround', r: 'isoGround' },
  sludge: { top: 'isoSludge', l: 'isoSludge', r: 'isoSludge' },
};
/** base colours of the mesh materials (interactive viewer shades them by face orientation) */
export const MAT = {
  concrete: '#dfe4ea',
  inner: '#cfd6df',
  water: '#8dbcf0',
  waterBrown: '#c9b48c',
  waterMid: '#a9c4d8',
  sand: '#e8d29b',
  sludge: '#a58a5c',
  wall: '#f1ece2',
  roof: '#c96f5a',
  equip: '#f0a07c',
  ground: '#e7efe0',
  road: '#d9dce1',
  glass: '#8dbcf0',
  river: '#8dbcf0',
  bank: '#a58a5c',
};
const WATER_MAT = {
  isoWater: 'water',
  isoWaterBrown: 'waterBrown',
  isoWaterMid: 'waterMid',
  isoSludge: 'sludge',
  isoSand: 'sand',
};
const KIND_MAT = {
  concrete: 'concrete',
  building: 'wall',
  equip: 'equip',
  sand: 'sand',
  sludge: 'sludge',
  inner: 'inner',
  ground: 'ground',
};

/** Scene collects solids and renders them back-to-front (static) and as a mesh (interactive) */
export class Scene {
  constructor() {
    this.solids = [];
    this.under = [];
    this.over = [];
    this.faces = [];
    this.lines = [];
    this.labels = [];
    this.dims = [];
  }
  // ---- mesh helpers
  quad(pts, mat, flat = false) {
    this.faces.push({ pts, mat, flat });
  }
  mbox(x, y, z, w, d, h, mat) {
    const x1 = x + w,
      y1 = y + d,
      z1 = z + h;
    this.quad(
      [
        [x, y, z],
        [x1, y, z],
        [x1, y, z1],
        [x, y, z1],
      ],
      mat,
    );
    this.quad(
      [
        [x, y1, z],
        [x1, y1, z],
        [x1, y1, z1],
        [x, y1, z1],
      ],
      mat,
    );
    this.quad(
      [
        [x, y, z],
        [x, y1, z],
        [x, y1, z1],
        [x, y, z1],
      ],
      mat,
    );
    this.quad(
      [
        [x1, y, z],
        [x1, y1, z],
        [x1, y1, z1],
        [x1, y, z1],
      ],
      mat,
    );
    this.quad(
      [
        [x, y, z1],
        [x1, y, z1],
        [x1, y1, z1],
        [x, y1, z1],
      ],
      mat,
    );
  }
  /** solid box; kind: concrete | building | equip | sand | sludge */
  box(x, y, z, w, d, h, kind = 'concrete') {
    this.solids.push({ x, y, z, w, d, h, items: boxFaces(x, y, z, w, d, h, STY[kind] || {}) });
    this.mbox(x, y, z, w, d, h, KIND_MAT[kind] || 'concrete');
    return this;
  }
  /** building with a pitched (gable) roof along its longer side */
  building(x, y, z, w, d, h) {
    const items = boxFaces(x, y, z, w, d, h, { top: 'isoBL', l: 'isoBL', r: 'isoBR' });
    const rh = Math.min(2.2, Math.min(w, d) * 0.28),
      o = 0.4;
    this.mbox(x, y, z, w, d, h, 'wall');
    if (w >= d) {
      // ridge along x
      const yc = y + d / 2;
      items.push(
        poly(
          [P(x - o, y - o, z + h), P(x + w + o, y - o, z + h), P(x + w + o, yc, z + h + rh), P(x - o, yc, z + h + rh)],
          'isoBTop',
        ),
      );
      items.push(poly([P(x - o, y - o, z + h), P(x - o, yc, z + h + rh), P(x - o, y + d + o, z + h)], 'isoBL'));
      this.quad(
        [
          [x - o, y - o, z + h],
          [x + w + o, y - o, z + h],
          [x + w + o, yc, z + h + rh],
          [x - o, yc, z + h + rh],
        ],
        'roof',
      );
      this.quad(
        [
          [x - o, y + d + o, z + h],
          [x + w + o, y + d + o, z + h],
          [x + w + o, yc, z + h + rh],
          [x - o, yc, z + h + rh],
        ],
        'roof',
      );
      this.quad(
        [
          [x, y, z + h],
          [x, yc, z + h + rh],
          [x, y + d, z + h],
        ],
        'wall',
      );
      this.quad(
        [
          [x + w, y, z + h],
          [x + w, yc, z + h + rh],
          [x + w, y + d, z + h],
        ],
        'wall',
      );
    } else {
      const xc = x + w / 2;
      items.push(poly([P(x - o, y - o, z + h), P(x + w + o, y - o, z + h), P(xc, y - o, z + h + rh)], 'isoBR'));
      items.push(
        poly(
          [P(x - o, y - o, z + h), P(xc, y - o, z + h + rh), P(xc, y + d + o, z + h + rh), P(x - o, y + d + o, z + h)],
          'isoBTop',
        ),
      );
      this.quad(
        [
          [x - o, y - o, z + h],
          [x - o, y + d + o, z + h],
          [xc, y + d + o, z + h + rh],
          [xc, y - o, z + h + rh],
        ],
        'roof',
      );
      this.quad(
        [
          [x + w + o, y - o, z + h],
          [x + w + o, y + d + o, z + h],
          [xc, y + d + o, z + h + rh],
          [xc, y - o, z + h + rh],
        ],
        'roof',
      );
      this.quad(
        [
          [x, y, z + h],
          [xc, y, z + h + rh],
          [x + w, y, z + h],
        ],
        'wall',
      );
      this.quad(
        [
          [x, y + d, z + h],
          [xc, y + d, z + h + rh],
          [x + w, y + d, z + h],
        ],
        'wall',
      );
    }
    // windows on the front (y = y0) face
    const nwin = Math.max(1, Math.floor(w / 4));
    for (let i = 0; i < nwin; i++) {
      const wx = x + (w * (i + 0.5)) / nwin - 0.6;
      items.push(
        poly(
          [P(wx, y, z + h * 0.45), P(wx + 1.2, y, z + h * 0.45), P(wx + 1.2, y, z + h * 0.8), P(wx, y, z + h * 0.8)],
          'isoWater',
        ),
      );
      this.quad(
        [
          [wx, y - 0.03, z + h * 0.45],
          [wx + 1.2, y - 0.03, z + h * 0.45],
          [wx + 1.2, y - 0.03, z + h * 0.8],
          [wx, y - 0.03, z + h * 0.8],
        ],
        'glass',
        true,
      );
    }
    this.solids.push({ x, y, z, w, d, h: h + rh, items });
    return this;
  }
  /**
   * open-topped tank: outer walls, rim, visible inner faces and water surface; inner = [{x,y,z,w,d,h,kind}] thin walls,
   * launders, media … in tank-local coordinates (origin at the inner bottom corner), drawn clipped to the opening.
   */
  tank(x, y, z, w, d, h, { t = 0.3, wl = h - 0.5, water = 'isoWater', inner = [], roof = false } = {}) {
    const items = boxFaces(x, y, z, w, d, h);
    if (roof) {
      this.solids.push({ x, y, z, w, d, h, items });
      this.mbox(x, y, z, w, d, h, 'concrete');
      return this;
    }
    const x0 = x + t,
      y0 = y + t,
      x1 = x + w - t,
      y1 = y + d - t,
      zt = z + h;
    const open = [P(x0, y0, zt), P(x1, y0, zt), P(x1, y1, zt), P(x0, y1, zt)];
    const add = (pts, cls) => {
      const c = clip(pts, open);
      if (c.length >= 3) items.push(poly(c, cls));
    };
    const zw = z + Math.min(h, Math.max(0.1, wl));
    add([P(x0, y1, zw), P(x1, y1, zw), P(x1, y1, zt), P(x0, y1, zt)], 'isoIn'); // far wall (faces south)
    add([P(x1, y0, zw), P(x1, y1, zw), P(x1, y1, zt), P(x1, y0, zt)], 'isoIn2'); // far wall (faces west)
    add([P(x0, y0, zw), P(x1, y0, zw), P(x1, y1, zw), P(x0, y1, zw)], water);
    const ins = [...inner].sort((a, b) => b.x + b.w / 2 + b.y + b.d / 2 - (a.x + a.w / 2 + a.y + a.d / 2));
    for (const b of ins) {
      const top = Math.min(b.z + b.h, h + 0.4);
      if (top <= wl - z + 1e-6 && b.kind !== 'sand') continue; // fully submerged
      const zb = Math.max(b.z, b.kind === 'sand' ? b.z : wl);
      for (const f of boxFaces(x0 + b.x, y0 + b.y, z + zb, b.w, b.d, top - zb, STY[b.kind] || STY.inner))
        add(f.pts, f.cls);
    }
    this.solids.push({ x, y, z, w, d, h, items });
    // mesh: four walls (outer + inner faces + rim), floor, water surface, internals above water
    this.mbox(x, y, z, w, t, h, 'concrete');
    this.mbox(x, y + d - t, z, w, t, h, 'concrete');
    this.mbox(x, y + t, z, t, d - 2 * t, h, 'concrete');
    this.mbox(x + w - t, y + t, z, t, d - 2 * t, h, 'concrete');
    this.quad(
      [
        [x0, y0, zw],
        [x1, y0, zw],
        [x1, y1, zw],
        [x0, y1, zw],
      ],
      WATER_MAT[water] || 'water',
      true,
    );
    for (const b of inner) {
      const top = Math.min(b.z + b.h, h + 0.4);
      const zb = Math.max(b.z, b.kind === 'sand' ? b.z : wl - 0.02);
      if (top > zb + 0.01) this.mbox(x0 + b.x, y0 + b.y, z + zb, b.w, b.d, top - zb, KIND_MAT[b.kind] || 'inner');
    }
    return this;
  }
  /** vertical cylinder (open tank when wl is given) */
  cyl(cx, cy, z, r, h, { wl = null, water = 'isoWater', t = 0.3, kind = 'concrete', cone = 0 } = {}) {
    const n = 36,
      items = [];
    const ring = (rad, zz) =>
      Array.from({ length: n }, (_, i) => {
        const a = (2 * Math.PI * i) / n;
        return P(cx + rad * Math.cos(a), cy + rad * Math.sin(a), zz);
      });
    const side = [];
    for (let i = 0; i <= n / 2; i++) {
      const a = (3 * Math.PI) / 4 + (Math.PI * i) / (n / 2);
      side.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z));
    }
    for (let i = n / 2; i >= 0; i--) {
      const a = (3 * Math.PI) / 4 + (Math.PI * i) / (n / 2);
      side.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z + h));
    }
    const st = STY[kind] || {};
    items.push(poly(side, st.r || 'isoL'));
    const top = ring(r, z + h);
    const mat = KIND_MAT[kind] || 'concrete';
    const pt = (rad, i, zz) => {
      const a = (2 * Math.PI * i) / n;
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a), zz];
    };
    for (let i = 0; i < n; i++) this.quad([pt(r, i, z), pt(r, i + 1, z), pt(r, i + 1, z + h), pt(r, i, z + h)], mat);
    if (cone > 0) {
      items.push(poly(top, st.top || 'isoTop'));
      const apex = P(cx, cy, z + h + cone);
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        if (Math.cos(a - (5 * Math.PI) / 4) > -0.3)
          items.push(poly([top[i], top[(i + 1) % n], apex], i % 2 ? 'isoTop' : 'isoL'));
        this.quad([pt(r, i, z + h), pt(r, i + 1, z + h), [cx, cy, z + h + cone]], mat);
      }
    } else {
      items.push(poly(top, st.top || 'isoTop'));
      if (wl !== null) {
        const open = ring(r - t, z + h);
        items.push(poly(open, 'isoIn'));
        const w = clip(ring(r - t, z + Math.min(h, wl)), open);
        if (w.length >= 3) items.push(poly(w, water));
        const zw = z + Math.min(h, wl);
        for (let i = 0; i < n; i++) {
          this.quad([pt(r, i, z + h), pt(r, i + 1, z + h), pt(r - t, i + 1, z + h), pt(r - t, i, z + h)], mat);
          this.quad([pt(r - t, i, zw), pt(r - t, i + 1, zw), pt(r - t, i + 1, z + h), pt(r - t, i, z + h)], 'inner');
        }
        this.quad(
          Array.from({ length: n }, (_, i) => pt(r - t, i, zw)),
          WATER_MAT[water] || 'water',
          true,
        );
      } else
        this.quad(
          Array.from({ length: n }, (_, i) => pt(r, i, z + h)),
          mat,
        );
    }
    this.solids.push({ x: cx - r, y: cy - r, z, w: 2 * r, d: 2 * r, h, items });
    return this;
  }
  ground(x, y, w, d, cls = 'isoGround', z = 0) {
    this.under.push(poly([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], cls));
    this.faces.push({
      pts: [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + d, z],
        [x, y + d, z],
      ],
      mat: cls === 'isoRoad' ? 'road' : cls === 'isoWater' ? 'river' : cls === 'isoSludge' ? 'bank' : 'ground',
      flat: true,
      ground: cls === 'isoRoad' ? 2 : 1,
    });
    return this;
  }
  /** free quad on the ground layer (river banks etc.) */
  plane(pts, cls, mat) {
    this.under.push(
      poly(
        pts.map((p) => P(...p)),
        cls,
      ),
    );
    this.faces.push({ pts, mat, flat: true, ground: 1 });
    return this;
  }
  pipe(pts, cls = 'isoPipe') {
    for (let i = 0; i < pts.length - 1; i++) {
      this.under.push({
        t: 'line',
        x1: P(...pts[i])[0],
        y1: P(...pts[i])[1],
        x2: P(...pts[i + 1])[0],
        y2: P(...pts[i + 1])[1],
        cls,
      });
      this.lines.push({
        a: pts[i],
        b: pts[i + 1],
        color: cls === 'isoPipe' ? '#2a78d6' : '#22324a',
        w: cls === 'isoPipe' ? 2.4 : 1.6,
      });
    }
    return this;
  }
  label(x, y, z, text, extra = {}) {
    const [px, py] = P(x, y, z);
    this.over.push({ t: 'text', x: px, y: py, text, anchor: 'middle', ...extra });
    this.labels.push({ p: [x, y, z], text, bold: !!extra.bold });
    return this;
  }
  leader(x, y, z, text, dz = 4, extra = {}) {
    const a = P(x, y, z),
      b = P(x, y, z + dz);
    this.over.push(
      { t: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], cls: 'thin' },
      { t: 'text', x: b[0], y: b[1] + 0.3, text, anchor: 'middle', ...extra },
    );
    this.labels.push({ p: [x, y, z + dz], from: [x, y, z], text, bold: !!extra.bold });
    return this;
  }
  /**
   * dimension between two points; off = [dx, dy, dz] offsets the dimension line from the object (extension lines are
   * drawn from the points).  Shown in the static isometric drawing and in the interactive viewer.
   */
  dim(a, b, off = [0, 0, 0], text = null) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const txt = text || `${fmt(len, len < 10 ? 2 : 1)} m`;
    const a2 = [a[0] + off[0], a[1] + off[1], a[2] + off[2]],
      b2 = [b[0] + off[0], b[1] + off[1], b[2] + off[2]];
    this.dims.push({ a, b, a2, b2, text: txt });
    const L = (p, q, cls = 'dimline') => ({
      t: 'line',
      x1: P(...p)[0],
      y1: P(...p)[1],
      x2: P(...q)[0],
      y2: P(...q)[1],
      cls,
    });
    const m = P((a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2, (a2[2] + b2[2]) / 2);
    const pa = P(...a2),
      pb = P(...b2);
    let ang = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI;
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    this.over.push(
      L(a, a2),
      L(b, b2),
      { ...L(a2, b2, 'dimline'), arrow: true },
      { ...L(b2, a2, 'dimline'), arrow: true },
      {
        t: 'text',
        x: m[0],
        y: m[1],
        text: txt,
        anchor: 'middle',
        rot: ang,
        size: 0.8,
        color: 'var(--dw-dimc)',
        dimText: true,
      },
    );
    return this;
  }
  /** overall length / width / height dimensions of a box-shaped structure */
  dimsBox(x, y, z, w, d, h, { gap = null, labels = {} } = {}) {
    const g = gap ?? Math.max(1, Math.max(w, d) * 0.05);
    this.dim([x, y, z], [x + w, y, z], [0, -g, 0], labels.L);
    this.dim([x, y, z], [x, y + d, z], [-g, 0, 0], labels.W);
    this.dim([x + w, y, z], [x + w, y, z + h], [g * 0.7, -g * 0.7, 0], labels.H);
    return this;
  }
  /** back-to-front painter's order: a solid is behind another when it lies further north or east */
  render(title, extra = {}) {
    const s = [...this.solids];
    const behind = (a, b) =>
      a.x >= b.x + b.w - 1e-6 ||
      a.y >= b.y + b.d - 1e-6 ||
      (a.z + a.h <= b.z + 1e-6 && !(b.x >= a.x + a.w - 1e-6 || b.y >= a.y + a.d - 1e-6));
    const done = [],
      left = new Set(s);
    while (left.size) {
      let pick = null;
      for (const a of [...left].sort((p, q) => q.x + q.w / 2 + q.y + q.d / 2 - (p.x + p.w / 2 + p.y + p.d / 2))) {
        let ok = true;
        for (const b of left)
          if (a !== b && behind(b, a) && !behind(a, b)) {
            ok = false;
            break;
          }
        if (ok) {
          pick = a;
          break;
        }
      }
      if (!pick) pick = [...left].sort((a, b) => b.x + b.y - (a.x + a.y))[0];
      left.delete(pick);
      done.push(pick);
    }
    const items = [...this.under, ...done.flatMap((o) => o.items), ...this.over];
    const dw = auto(title, items, { nts: true, iso: true, ...extra });
    dw.scene3d = { faces: this.faces, lines: this.lines, labels: this.labels, dims: this.dims };
    return dw;
  }
}
