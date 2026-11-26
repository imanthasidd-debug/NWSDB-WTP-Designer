// DXF export (AutoCAD 2007 DXF, AC1021) following NWSDB CAD practice as seen in NWSDB drawings (RSC sample
// "Intake", AutoCAD 2016, plotted with monochrome.ctb): model space in millimetres, levels in metres; line weights
// set by layer (monochrome plotting prints every colour black, so pen weight comes from the layer); centre lines
// CENTER2, hidden lines HIDDEN2; a Sans Serif text style; dimensions exploded on layer DIM with filled arrowheads,
// and an ST<scale> dimension style set current for further work. Solid fills are only used where they print
// correctly in monochrome (concrete in plan, arrowheads).
import {
  DxfWriter,
  HatchBoundaryPaths,
  HatchPolylineBoundary,
  HatchPredefinedPatterns,
  LWPolylineFlags,
  TextHorizontalAlignment,
  TextVerticalAlignment,
  Units,
  pattern,
  point3d,
  vertex,
} from '@tarikjabiri/dxf';

/**
 * Layer table: [name, colour (ACI), linetype, line weight (1/100 mm), plot]. Names, colours and weights are those of
 * the NWSDB sample where it has an equivalent layer; the rest follow the same pattern.
 */
export const DXF_LAYERS = [
  ['wall', 2, 'CONTINUOUS', 25, true], // concrete / masonry outlines (sample "wall")
  ['OL', 2, 'CONTINUOUS', 18, true], // general outlines (sample "OL")
  ['LINES', 201, 'CONTINUOUS', 15, true], // thin lines (sample "LINES")
  ['HID', 2, 'HIDDEN2', 25, true], // hidden / dashed (sample "HID")
  ['CL', 1, 'CENTER2', 15, true], // centre and section-cut lines (sample "CL")
  ['DIM', 1, 'CONTINUOUS', 15, true], // dimensions and level marks (sample "DIM")
  ['TEXT', 2, 'CONTINUOUS', 25, true], // text (sample "TEXT")
  ['TEXT TITLE', 120, 'CONTINUOUS', 30, true], // titles (sample "TEXT TITLE")
  ['HATCH', 252, 'CONTINUOUS', 9, true], // concrete hatching (sample "HATCH")
  ['HATCH2', 9, 'CONTINUOUS', 9, true], // media, soil hatching (sample "HATCH2")
  ['pipe', 4, 'CONTINUOUS', 50, true], // pipes (sample "pipe")
  ['EQUIP', 30, 'CONTINUOUS', 25, true], // pumps, mixers, scrapers, chemical plant
  ['WATER', 5, 'CONTINUOUS', 13, true], // water surfaces
  ['GL', 3, 'CONTINUOUS', 35, true], // ground line (sample "GL")
  ['road', 2, 'CONTINUOUS', 25, true], // roads (sample "road")
  ['PLANNING', 1, 'CENTER', 18, true], // site boundary (sample "PLANNING")
  ['HGL', 1, 'DASHED2', 18, true], // hydraulic grade line
  ['ISO', 8, 'CONTINUOUS', 13, true], // 3D isometric views (not to scale)
  ['0.00', 5, 'CONTINUOUS', 0, true], // finest lines: grids, zone marks (sample "0.00")
  ['0.25', 5, 'CONTINUOUS', 25, true], // title-block grid (sample "0.25")
  ['0.50', 3, 'CONTINUOUS', 50, true], // sheet frame (sample "0.50")
  ['LOGO', 7, 'CONTINUOUS', 20, true], // NWSDB emblem (sample "LOGO")
  ['NPRINT', 71, 'CONTINUOUS', 0, false], // sheet edge – does not plot (sample "NPRINT")
];
/** linetypes in millimetres (acadiso.lin) */
const LTYPES = [
  ['CENTER', 'Center ____ _ ____ _ ____ _ ____', [31.75, -6.35, 6.35, -6.35]],
  ['CENTER2', 'Center (.5x) ___ _ ___ _ ___ _ ___', [19.05, -3.175, 3.175, -3.175]],
  ['HIDDEN2', 'Hidden (.5x) _ _ _ _ _ _ _ _ _ _ _', [3.175, -1.5875]],
  ['DASHED2', 'Dashed (.5x) _ _ _ _ _ _ _ _ _ _ _', [6.35, -3.175]],
];
/** item class (drawing model) → layer */
const LAYER_OF = {
  concrete: 'wall',
  concreteSolid: 'wall',
  baffle: 'wall',
  building: 'wall',
  water: 'WATER',
  waterline: 'WATER',
  sand: 'OL',
  gravel: 'OL',
  anth: 'OL',
  soil: 'GL',
  ground: 'GL',
  outline: 'OL',
  thick: 'OL',
  thin: 'LINES',
  dash: 'HID',
  center: 'CL',
  cut: 'CL',
  equip: 'EQUIP',
  equipFill: 'EQUIP',
  pipe: 'pipe',
  pipeFill: 'pipe',
  process: 'OL',
  residual: 'OL',
  sludge: 'OL',
  site: 'PLANNING',
  road: 'road',
  hgl: 'HGL',
  grid: '0.00',
  dimline: 'DIM',
  isoPipe: 'pipe',
  isoGhost: 'HID',
};
const layerOf = (cls) => LAYER_OF[cls] || (String(cls || '').startsWith('iso') ? 'ISO' : 'OL');
/**
 * fill of a shape: list of [kind, spacing × text height, angle°, layer]; shapes not listed are not filled.
 * 'solid' is a real HATCH; the material patterns are drawn as line work clipped to the shape ("exploded" hatching,
 * as most of the hatching in NWSDB drawings is) – the writer's built-in patterns are simplified and change shared
 * data when rotated, so they are not used.
 *   lines: parallel lines · dash: dashed parallel lines (sand, sludge) · stones: small circles (gravel)
 */
const FILL = {
  concrete: [['lines', 0.33, 45, 'HATCH']],
  baffle: [['lines', 0.33, 45, 'HATCH']],
  concreteSolid: [['solid', 0, 0, 'HATCH']],
  sand: [['dash', 0.22, 0, 'HATCH2']],
  gravel: [['stones', 0.45, 0, 'HATCH2']],
  anth: [
    ['lines', 0.22, 45, 'HATCH2'],
    ['lines', 0.22, 135, 'HATCH2'],
  ],
  soil: [['lines', 0.9, 135, 'HATCH2']],
  sludge: [['dash', 0.35, 30, 'HATCH2']],
};

/** segments of parallel lines (angle°, spacing) inside a polygon – even-odd rule, so concave shapes work */
function clipLines(pts, angle, spacing) {
  const a = (angle * Math.PI) / 180,
    ux = Math.cos(a),
    uy = Math.sin(a),
    nx = -uy,
    ny = ux;
  const ns = pts.map(([x, y]) => x * nx + y * ny);
  const lo = Math.min(...ns),
    hi = Math.max(...ns);
  const segs = [];
  if (!(spacing > 0) || (hi - lo) / spacing > 4000) return segs;
  for (let c = Math.ceil(lo / spacing) * spacing; c <= hi; c += spacing) {
    const ts = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i],
        [x2, y2] = pts[(i + 1) % pts.length];
      const d1 = x1 * nx + y1 * ny - c,
        d2 = x2 * nx + y2 * ny - c;
      if (d1 < 0 !== d2 < 0) {
        const k = d1 / (d1 - d2);
        const px = x1 + (x2 - x1) * k,
          py = y1 + (y2 - y1) * k;
        ts.push(px * ux + py * uy);
      }
    }
    ts.sort((p, q) => p - q);
    for (let i = 0; i + 1 < ts.length; i += 2)
      segs.push([nx * c + ux * ts[i], ny * c + uy * ts[i], nx * c + ux * ts[i + 1], ny * c + uy * ts[i + 1]]);
  }
  return segs;
}
const inside = (pts, x, y) => {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i],
      [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
};

// text: UTF-8 (DXF 2007); characters that the Sans Serif TrueType font lacks are written in plain form
const TEXT_MAP = {
  '≥': '>=',
  '≤': '<=',
  '▽': 'v',
  μ: 'µ',
  ⱼ: 'j',
  ᵢ: 'i',
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '⁻': '-',
  '→': '->',
  '←': '<-',
};
const dxfText = (s) => String(s ?? '').replace(/[≥≤▽μⱼᵢ₀₁₂₃₄⁻→←]/g, (c) => TEXT_MAP[c]);
const isIndic = (s) => /[஀-௿඀-෿]/.test(s); // Tamil, Sinhala

/** set the line weight (and plot flag) of a layer record – the library writes 0 for every layer */
function weighted(layer, lw, plot) {
  const write = layer.dxfy.bind(layer);
  layer.dxfy = (dx) => {
    const n0 = dx.lines.length;
    write(dx);
    for (let i = n0; i < dx.lines.length; i += 2) if (dx.lines[i] === 370) dx.lines[i + 1] = lw;
    if (!plot) dx.push(290, 0);
  };
  return layer;
}

/**
 * New NWSDB-style DXF document. scale = drawing scale (1:scale); thMM = base text height in model millimetres.
 * Returns drawing helpers in model millimetres and finish() → DXF string.
 */
export function dxfDocument({ scale = 50, thMM = 125 } = {}) {
  const d = new DxfWriter();
  d.setUnits(Units.Millimeters);
  d.setVariable('$MEASUREMENT', { 70: 1 });
  d.setVariable('$LUNITS', { 70: 2 });
  d.setVariable('$LUPREC', { 70: 0 });
  d.setVariable('$LTSCALE', { 40: Math.max(1, scale * 0.5) });
  d.setVariable('$PSLTSCALE', { 70: 1 });
  d.setVariable('$DIMSCALE', { 40: scale });
  for (const [name, desc, el] of LTYPES) d.addLType(name, desc, el);
  for (const [name, col, lt, lw, plot] of DXF_LAYERS) weighted(d.addLayer(name, col, lt), lw, plot);
  const styles = [
    ['SANS', 'sanss___.ttf'],
    ['SANS BOLD', 'sanssb__.ttf'],
    ['NIRMALA', 'Nirmala.ttf'], // Sinhala and Tamil (Windows 8 and later)
  ];
  for (const [name, font] of styles) d.tables.addStyle(name).fontFileName = font;
  d.setVariable('$TEXTSTYLE', { 7: 'SANS' });
  const st = `ST${Math.round(scale)}`;
  Object.assign(d.addDimStyle(st), {
    DIMSCALE: scale,
    DIMTXT: 2.5,
    DIMASZ: 2,
    DIMEXE: 1.5,
    DIMEXO: 1.5,
    DIMGAP: 1,
    DIMDLI: 3.75,
    DIMTAD: 1,
    DIMTIH: 0,
    DIMTOH: 0,
    DIMDEC: 0,
    DIMZIN: 8,
    DIMLUNIT: 2,
    DIMTXSTY: 'SANS',
    DIMCLRD: 1,
    DIMCLRE: 1,
    DIMCLRT: 2,
  });
  d.setVariable('$DIMSTYLE', { 2: st });
  d.setCurrentLayerName('0');
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const ext = (x, y) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  const api = {
    scale,
    thMM,
    line(ax, ay, bx, by, layer) {
      if (![ax, ay, bx, by].every(Number.isFinite)) return;
      ext(ax, ay);
      ext(bx, by);
      d.addLine(point3d(ax, ay), point3d(bx, by), { layerName: layer });
    },
    poly(pts, closed, layer) {
      const p = pts.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      if (p.length < 2) return;
      p.forEach(([x, y]) => ext(x, y));
      d.addLWPolyline(
        p.map(([x, y]) => ({ point: { x, y } })),
        { flags: closed ? LWPolylineFlags.Closed : LWPolylineFlags.None, layerName: layer },
      );
    },
    circle(cx, cy, r, layer) {
      if (![cx, cy, r].every(Number.isFinite) || r <= 0) return;
      ext(cx - r, cy - r);
      ext(cx + r, cy + r);
      d.addCircle(point3d(cx, cy), r, { layerName: layer });
    },
    /** solid HATCH (prints black in monochrome – arrowheads, walls in plan) */
    solid(pts, layer) {
      const p = pts.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      if (p.length < 3) return;
      const pb = new HatchPolylineBoundary();
      p.forEach(([x, y]) => pb.add(vertex(x, y)));
      const bp = new HatchBoundaryPaths();
      bp.addPolylineBoundary(pb);
      d.addHatch(bp, pattern({ name: HatchPredefinedPatterns.SOLID }), { layerName: layer });
    },
    /** material fill of a closed shape: kind 'solid' | 'lines' | 'dash' | 'stones' */
    fill(pts, kind, spacing, angle, layer) {
      const p = pts.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      if (p.length < 3) return;
      if (kind === 'solid') return api.solid(p, layer);
      if (kind === 'stones') {
        const xs = p.map((q) => q[0]),
          ys = p.map((q) => q[1]);
        const [xa, xb, ya, yb] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        if ((xb - xa) * (yb - ya) > spacing * spacing * 6000) return;
        let row = 0;
        for (let y = ya + spacing / 2; y < yb; y += spacing * 0.87, row++)
          for (let x = xa + (row % 2 ? spacing : spacing / 2); x < xb; x += spacing)
            if (inside(p, x, y)) d.addCircle(point3d(x, y), spacing * 0.28, { layerName: layer });
        return;
      }
      // large areas (beds in plan): widen the spacing so one fill stays below ~600 lines / ~1,500 dashes
      let segs = clipLines(p, angle, spacing);
      const cap = kind === 'dash' ? 1500 : 600;
      const count = () =>
        kind === 'dash'
          ? segs.reduce((n, [ax, ay, bx, by]) => n + Math.hypot(bx - ax, by - ay), 0) / (spacing * 0.77)
          : segs.length;
      for (let k = 0; k < 4 && count() > cap; k++) {
        spacing *= Math.sqrt(count() / cap);
        segs = clipLines(p, angle, spacing);
      }
      for (const [ax, ay, bx, by] of segs) {
        if (kind === 'dash') {
          const len = Math.hypot(bx - ax, by - ay),
            ux = (bx - ax) / len,
            uy = (by - ay) / len,
            dl = spacing * 0.35;
          for (let t = 0; t < len; t += dl * 2.2) {
            const t2 = Math.min(len, t + dl);
            d.addLine(point3d(ax + ux * t, ay + uy * t), point3d(ax + ux * t2, ay + uy * t2), { layerName: layer });
          }
        } else d.addLine(point3d(ax, ay), point3d(bx, by), { layerName: layer });
      }
    },
    /** text; align 0 left · 1 centre · 2 right (baseline); rot in degrees */
    text(x, y, h, s, layer = 'TEXT', { align = 0, rot = 0, style } = {}) {
      const str = dxfText(s);
      if (!str.trim() || ![x, y, h].every(Number.isFinite) || h <= 0) return;
      ext(x, y);
      const opt = { layerName: layer, rotation: rot || undefined };
      if (align) {
        opt.horizontalAlignment = align === 1 ? TextHorizontalAlignment.Center : TextHorizontalAlignment.Right;
        opt.verticalAlignment = TextVerticalAlignment.BaseLine;
        opt.secondAlignmentPoint = point3d(x, y);
      }
      const t = d.addText(point3d(x, y), h, str, opt);
      t.textStyle = style || (isIndic(str) ? 'NIRMALA' : 'SANS');
    },
    /** filled arrowhead with its tip at (x, y) pointing along (ux, uy) */
    arrow(x, y, ux, uy, len, layer = 'DIM') {
      const w = len * 0.18;
      const bx = x - ux * len,
        by = y - uy * len;
      api.solid(
        [
          [x, y],
          [bx - uy * w, by + ux * w],
          [bx + uy * w, by - ux * w],
        ],
        layer,
      );
    },
    /**
     * exploded linear dimension (as in NWSDB drawings): extension lines, dimension line, filled arrowheads and the
     * text centred above the line. off = offset of the dimension line from the measured points (model mm).
     */
    dim(ax, ay, bx, by, off, txt, th) {
      const dx = bx - ax,
        dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (!(len > 0)) return;
      const ux = dx / len,
        uy = dy / len,
        nx = -uy,
        ny = ux;
      const s = Math.sign(off || 1),
        gap = th * 0.3,
        over = th * 0.4;
      const pa = [ax + nx * off, ay + ny * off],
        pb = [bx + nx * off, by + ny * off];
      api.line(ax + nx * gap * s, ay + ny * gap * s, pa[0] + nx * over * s, pa[1] + ny * over * s, 'DIM');
      api.line(bx + nx * gap * s, by + ny * gap * s, pb[0] + nx * over * s, pb[1] + ny * over * s, 'DIM');
      api.line(pa[0], pa[1], pb[0], pb[1], 'DIM');
      const al = Math.min(th * 0.7, len / 3);
      api.arrow(pa[0], pa[1], -ux, -uy, al);
      api.arrow(pb[0], pb[1], ux, uy, al);
      let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      let tn = [nx, ny];
      if (ang > 90 || ang <= -90) {
        ang += ang > 0 ? -180 : 180;
        tn = [-nx, -ny];
      }
      // text on the side of the dimension line away from the object
      const side = tn[0] * nx * s + tn[1] * ny * s >= 0 ? 1 : -1;
      const tk = side > 0 ? th * 0.25 : -th * 0.95;
      api.text((pa[0] + pb[0]) / 2 + tn[0] * tk, (pa[1] + pb[1]) / 2 + tn[1] * tk, th * 0.7, txt, 'DIM', {
        align: 1,
        rot: ang,
      });
    },
    /** level mark: open triangle on the level with the value beside it (levels in metres) */
    level(x, y, txt, th) {
      const s = th * 0.55;
      api.poly(
        [
          [x - s, y + s * 1.2],
          [x + s, y + s * 1.2],
          [x, y],
        ],
        true,
        'DIM',
      );
      api.line(x - s * 0.6, y - s * 0.35, x + s * 0.6, y - s * 0.35, 'DIM');
      api.text(x + s * 1.6, y + s * 0.4, th * 0.75, txt, 'TEXT');
    },
    finish() {
      if (Number.isFinite(x0)) {
        d.setVariable('$EXTMIN', { 10: x0, 20: y0, 30: 0 });
        d.setVariable('$EXTMAX', { 10: x1, 20: y1, 30: 0 });
      }
      return d.stringify();
    },
  };
  return api;
}

/**
 * DXF of a drawing (items in metres, y up) → model space in millimetres. scale = intended plot scale 1:scale (sets
 * text height 3 mm on paper, linetype and dimension scale); extra(api) may add a sheet frame / title block.
 */
export function drawingDXF(dw, { extra, scale = null } = {}) {
  const M = 1000;
  const b = dw.bounds;
  const thM = dw.textH || Math.max(b.x1 - b.x0, b.y1 - b.y0) / 36; // metres, as in the screen drawing
  const sc = scale || Math.max(1, Math.round((thM * M) / 3)); // text ≈ 3 mm on paper
  const th = scale ? 3 * scale : thM * M; // base text height, model mm
  const x = api0(dw, sc, th);
  const P = (v) => v * M;
  for (const it of dw.items) {
    const layer = layerOf(it.cls);
    const fill = FILL[it.cls];
    switch (it.t) {
      case 'rect': {
        if (it.cls === 'water' || it.cls === 'road') break; // water and roads print as their edges only
        const pts = [
          [P(it.x), P(it.y)],
          [P(it.x + it.w), P(it.y)],
          [P(it.x + it.w), P(it.y + it.h)],
          [P(it.x), P(it.y + it.h)],
        ];
        for (const [kind, k, ang, lay] of fill || []) x.fill(pts, kind, k * th, ang, lay);
        x.poly(pts, true, layer);
        break;
      }
      case 'poly': {
        const pts = it.pts.map(([px, py]) => [P(px), P(py)]);
        const closed = it.closed !== false;
        if (closed && !String(it.cls).startsWith('iso'))
          for (const [kind, k, ang, lay] of fill || []) x.fill(pts, kind, k * th, ang, lay);
        if (it.cls === 'water' || it.cls === 'soil') break; // filled areas without an outline
        x.poly(pts, closed, layer);
        break;
      }
      case 'line':
        x.line(P(it.x1), P(it.y1), P(it.x2), P(it.y2), layer);
        break;
      case 'circle':
        // circles are not filled: plans draw a wall as a filled circle with the water circle on top
        x.circle(P(it.cx), P(it.cy), P(it.r), layer);
        break;
      case 'text':
        x.text(
          P(it.x),
          P(it.y),
          th * (it.size || 1) * 0.8,
          it.text,
          it.bold && (it.size || 1) >= 1 ? 'TEXT TITLE' : 'TEXT',
          {
            align: it.anchor === 'middle' ? 1 : it.anchor === 'end' ? 2 : 0,
            rot: it.rot || 0,
          },
        );
        break;
      case 'level':
        x.level(P(it.x), P(it.y), it.text, th);
        break;
      case 'dim':
        x.dim(
          P(it.x1),
          P(it.y1),
          P(it.x2),
          P(it.y2),
          P(it.off ?? 0.5),
          it.text ?? String(Math.round(Math.hypot(it.x2 - it.x1, it.y2 - it.y1) * M)),
          th,
        );
        break;
      default:
        break;
    }
  }
  if (extra) extra(x);
  return x.finish();
}
const api0 = (dw, scale, th) => dxfDocument({ scale, thMM: th });
