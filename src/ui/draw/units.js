// Scaled engineering drawings of each unit, built from the design results (metres, y-up).
import { fmt } from '../../core/util.js';

const f2 = (v) => fmt(v, 2);
export const D = (title, items, bounds, extra = {}) => ({ title, items, bounds, ...extra });
export const bbox = (items) => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const pt = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  };
  for (const it of items) {
    if (it.t === 'rect') {
      pt(it.x, it.y);
      pt(it.x + it.w, it.y + it.h);
    } else if (it.t === 'line' || it.t === 'dim') {
      pt(it.x1, it.y1);
      pt(it.x2, it.y2);
      if (it.t === 'dim') {
        const o = it.off || 0;
        const dx = it.x2 - it.x1,
          dy = it.y2 - it.y1,
          l = Math.hypot(dx, dy) || 1;
        pt(it.x1 - (dy / l) * o * 1.3, it.y1 + (dx / l) * o * 1.3);
      }
    } else if (it.t === 'poly') it.pts.forEach(([x, y]) => pt(x, y));
    else if (it.t === 'circle') {
      pt(it.cx - it.r, it.cy - it.r);
      pt(it.cx + it.r, it.cy + it.r);
    } else if (it.t === 'text' || it.t === 'level') pt(it.x, it.y);
  }
  return { x0, y0, x1, y1 };
};
export const auto = (title, items, extra = {}) => {
  const b = bbox(items);
  const th = extra.textH || Math.max(b.x1 - b.x0, b.y1 - b.y0) / 36;
  // extend bounds by estimated text extents so labels are never clipped
  for (const it of items) {
    if (it.t !== 'text' && it.t !== 'level') continue;
    const hgt = th * (it.size || 1) * (it.t === 'level' ? 0.85 : 1);
    const w = String(it.text).length * hgt * 0.56 + (it.t === 'level' ? hgt * 1.6 : 0);
    if (it.rot) {
      if (Math.abs(Math.abs(it.rot) - 90) > 1) continue;
      // vertical text: its height runs along x, its length along y
      const xa = it.rot > 0 ? it.x - hgt : it.x,
        ya =
          it.anchor === 'middle'
            ? it.y - w / 2
            : it.anchor === 'end'
              ? it.rot > 0
                ? it.y - w
                : it.y
              : it.rot > 0
                ? it.y
                : it.y - w;
      b.x0 = Math.min(b.x0, xa);
      b.x1 = Math.max(b.x1, xa + hgt);
      b.y0 = Math.min(b.y0, ya);
      b.y1 = Math.max(b.y1, ya + w);
      continue;
    }
    const a = it.anchor || 'start';
    const xa = a === 'start' ? it.x : a === 'middle' ? it.x - w / 2 : it.x - w;
    b.x0 = Math.min(b.x0, xa);
    b.x1 = Math.max(b.x1, xa + w);
    b.y1 = Math.max(b.y1, it.y + hgt);
    b.y0 = Math.min(b.y0, it.y - hgt * 0.3);
  }
  return D(title, items, b, { textH: th, ...extra });
};
export const R = (x, y, w, h, cls, extra = {}) => ({ t: 'rect', x, y, w, h, cls, ...extra });
export const Ln = (x1, y1, x2, y2, cls = 'outline', extra = {}) => ({ t: 'line', x1, y1, x2, y2, cls, ...extra });
export const T = (x, y, text, extra = {}) => ({ t: 'text', x, y, text, ...extra });
/** dimension text: millimetres, whole numbers, no unit (NWSDB practice – "all dimensions in mm, levels in m") */
export const mm = (v) => String(Math.round((+v || 0) * 1000));
export const Dm = (x1, y1, x2, y2, off, text) => ({ t: 'dim', x1, y1, x2, y2, off, text });
export const Lv = (x, y, text) => ({ t: 'level', x, y, text });

// ---------------------------------------------------------------- Intake
export function intakeSection(ik) {
  if (!ik || !ik.Dw) return null;
  const d = ik.inputs;
  const t = 0.5;
  const Dw = ik.Dw;
  const it = [];
  const bank = 0;
  const deck = ik.deck;
  const floor = ik.floor;
  // river
  const rx0 = -16;
  it.push({
    t: 'poly',
    pts: [
      [rx0, d.bedLevel - 1.5],
      [rx0, d.bedLevel],
      [-4, d.bedLevel],
      [bank, d.bedLevel + 0.2],
      [bank, floor - 1.2],
      [rx0, floor - 1.2],
    ],
    cls: 'soil',
  });
  it.push(R(rx0, d.bedLevel, -rx0, d.NWL - d.bedLevel, 'water'));
  it.push(Ln(rx0, d.bedLevel, -4, d.bedLevel, 'ground'), Ln(-4, d.bedLevel, bank, d.bedLevel + 0.2, 'ground'));
  for (const [lv, name] of [
    [d.HFL, 'HFL'],
    [d.NWL, 'NWL'],
    [d.LWL, 'LWL'],
  ]) {
    it.push(Ln(rx0, lv, bank, lv, name === 'NWL' ? 'waterline' : 'dash'));
    it.push(Lv(rx0 + 1 + (name === 'HFL' ? 6 : name === 'NWL' ? 3 : 0), lv, `${name} ${f2(lv)}`));
  }
  it.push({ t: 'text', x: rx0 + 1, y: d.bedLevel + 0.35, text: `River bed ${f2(d.bedLevel)}`, size: 0.8 });
  // well walls
  const xw = bank;
  const portLevels = [d.bedLevel + d.sill, Math.max(d.bedLevel + d.sill + d.portH + 0.6, d.NWL - d.portH)];
  // river-side wall with ports
  let yb = floor - 0.8;
  const segs = portLevels
    .slice(0, d.portLevels)
    .map((p) => [p, p + d.portH])
    .sort((a, b) => a[0] - b[0]);
  for (const [p0, p1] of segs) {
    it.push(R(xw, yb, t, p0 - yb, 'concrete'));
    yb = p1;
  }
  it.push(R(xw, yb, t, deck - yb, 'concrete'));
  for (const [p0, p1] of segs) {
    it.push(Ln(xw + t + 0.25, p0 - 0.2, xw + t + 0.25 + (p1 - p0 + 0.4) * 0.27, p1 + 0.2, 'equip'));
    it.push(T(xw - 0.2, (p0 + p1) / 2, `Port ${f2(d.portW)}×${f2(d.portH)}`, { anchor: 'end', size: 0.75 }));
  }
  // inner fine screen
  it.push(Ln(xw + t + 1.2, floor + 0.4, xw + t + 1.2 + (ik.wellLWL - floor) * 0.36, ik.wellLWL + 0.6, 'equip'));
  it.push(T(xw + t + 1.5, floor + 0.6, `Coarse ${d.cOpen} mm / fine ${d.fOpen} mm screens`, { size: 0.75 }));
  // land-side wall
  it.push(R(xw + t + Dw, floor - 0.8, t, deck - floor + 0.8, 'concrete'));
  it.push(R(xw, floor - 0.8, Dw + 2 * t, 0.8, 'concrete'));
  it.push(R(xw, deck, Dw + 2 * t, 0.35, 'concrete'));
  // water in well
  it.push(R(xw + t, floor, Dw, ik.wellLWL - floor, 'water'));
  it.push(Ln(xw + t, ik.wellLWL, xw + t + Dw, ik.wellLWL, 'waterline'));
  it.push(Lv(xw + t + Dw * 0.55, ik.wellLWL, `Well LWL ${f2(ik.wellLWL)}`));
  // pumps
  const nP = d.nDuty + (ik.pumps?.nStandby ?? d.nStandby ?? 1);
  for (let i = 0; i < nP; i++) {
    const px = xw + t + (Dw * (i + 0.5)) / nP;
    it.push(R(px - 0.35, floor + 0.3, 0.7, 1.1, 'equipFill'));
    it.push(Ln(px, floor + 1.4, px, deck + 0.35, 'pipe'));
  }
  it.push(Ln(xw + t + (Dw * (nP - 0.5)) / nP, deck + 1.0, xw + t + Dw + 6, deck + 1.0, 'pipe'));
  for (let i = 0; i < nP; i++) {
    const px = xw + t + (Dw * (i + 0.5)) / nP;
    it.push(Ln(px, deck + 0.35, px, deck + 1.0, 'pipe'));
  }
  it.push(
    T(xw + t + Dw + 1, deck + 1.35, `Rising main DN${ik.pumps.dn} → WTP (${fmt(d.mainLength, 0)} m)`, { size: 0.8 }),
  );
  // pump house
  it.push({
    t: 'poly',
    pts: [
      [xw - 0.3, deck + 0.35],
      [xw - 0.3, deck + 4.2],
      [xw + Dw / 2 + t, deck + 5.2],
      [xw + Dw + 2 * t + 0.3, deck + 4.2],
      [xw + Dw + 2 * t + 0.3, deck + 0.35],
    ],
    closed: false,
    cls: 'outline',
  });
  it.push(T(xw + Dw / 2 + t, deck + 2.6, 'Pump house', { anchor: 'middle', bold: true }));
  // ground land side
  it.push(Ln(xw + Dw + 2 * t, deck - 1.5, xw + Dw + 2 * t + 10, deck - 1.5, 'ground'));
  it.push({
    t: 'poly',
    pts: [
      [xw + Dw + 2 * t, deck - 1.5],
      [xw + Dw + 2 * t + 10, deck - 1.5],
      [xw + Dw + 2 * t + 10, floor - 1.2],
      [xw + Dw + 2 * t, floor - 1.2],
    ],
    cls: 'soil',
  });
  // levels & dims
  it.push(Lv(xw + Dw + 2 * t + 1, deck + 0.35, `Deck ${f2(deck + 0.35)}`));
  it.push(Lv(xw + t + 0.2, floor, `Sump floor ${f2(floor)}`));
  it.push(Dm(xw + t, floor - 0.8, xw + t + Dw, floor - 0.8, -1.2, `Ø ${mm(Dw)} (internal)`));
  it.push(Dm(xw + Dw + 2 * t + 0.3, floor, xw + Dw + 2 * t + 0.3, deck + 0.35, -1.6, `${mm(deck + 0.35 - floor)}`));
  return auto('Intake well – section', it, { scaleNote: 'levels in m MSL' });
}

// ---------------------------------------------------------------- Aerator
export function aeratorSection(ae) {
  if (!ae || ae.enabled === false) return null;
  const it = [];
  if (ae.type === 'cascade') {
    const n = ae.inputs.nSteps,
      h = ae.inputs.stepH,
      L = ae.L;
    const tread = L / n;
    let x = 0,
      y = n * h;
    it.push(R(-1.5, y - 0.2, 1.5, 0.9, 'concrete'));
    it.push(R(-1.2, y, 1.2, 0.5, 'water'));
    it.push(T(-0.75, y + 1.0, 'Inlet', { anchor: 'middle', size: 0.85 }));
    for (let i = 0; i < n; i++) {
      it.push(R(x, y - h, tread, h, 'concrete'));
      it.push({
        t: 'poly',
        pts: [
          [x, y + 0.06],
          [x + tread, y + 0.06],
          [x + tread + 0.08, y - 0.1],
          [x + tread, y - 0.06],
        ],
        cls: 'water',
      });
      it.push(Ln(x, y + 0.06, x + tread, y + 0.06, 'waterline'));
      x += tread;
      y -= h;
    }
    it.push(R(x, -0.9, 1.6, 0.9, 'concrete'));
    it.push(R(x, -0.8, 1.4, 0.6, 'water'));
    it.push(T(x + 0.8, -1.4, 'Collection channel', { anchor: 'middle', size: 0.8 }));
    it.push(Dm(0, n * h, L, n * h, 1.3, `${n} steps × ${mm(tread)} = ${mm(L)}`));
    it.push(Dm(0, 0, 0, h, -0.9, `${mm(h)}`));
    it.push(Dm(L + 1.8, 0, L + 1.8, n * h, -0.4, `Total fall ${mm(n * h)}`));
    it.push(
      T(L / 2, -2.2, `Cascade width ${f2(ae.W)} m · DO ${f2(ae.C0)} → ${f2(ae.Ce)} mg/L`, {
        anchor: 'middle',
        size: 0.9,
        bold: true,
      }),
    );
    return auto('Cascade aerator – section', it);
  }
  const n = ae.inputs.nTrays,
    s = ae.inputs.traySpacing,
    W = ae.W;
  for (let i = 0; i < n; i++) {
    const y = i * s + 0.6;
    it.push(R(0, y, W, 0.12, 'gravel'));
    for (let k = 0; k < 6; k++)
      it.push(Ln((W * (k + 0.5)) / 6, y - 0.05, (W * (k + 0.5)) / 6, y - s * 0.5, 'waterline'));
  }
  it.push(R(-0.3, 0, W + 0.6, 0.5, 'water'));
  it.push(Ln(-0.3, 0, W + 0.3, 0, 'thick'));
  it.push(Ln(W / 2, n * s + 0.6, W / 2, n * s + 1.4, 'pipe'));
  it.push(T(W / 2 + 0.2, n * s + 1.2, 'Inlet distributor', { size: 0.8 }));
  it.push(Dm(W + 0.4, 0.6, W + 0.4, 0.6 + s, -0.6, `${mm(s)}`));
  it.push(Dm(0, -0.2, W, -0.2, -0.6, `${mm(W)}`));
  return auto(`Multiple-tray aerator – ${ae.nUnits} tower(s)`, it);
}

// ---------------------------------------------------------------- Rapid mix
export function rapidMixDrawing(rm) {
  if (!rm || !rm.enabled) return null;
  const it = [];
  if (rm.type === 'mechanical') {
    const B = rm.B,
      H = rm.H,
      t = 0.3;
    it.push(
      R(-t, -t, t, H + 0.5 + t, 'concrete'),
      R(B, -t, t, H + 0.5 + t, 'concrete'),
      R(-t, -t, B + 2 * t, t, 'concrete'),
    );
    it.push(R(0, 0, B, H, 'water'), Ln(0, H, B, H, 'waterline'));
    it.push(Ln(B / 2, H * 0.3, B / 2, H + 1.0, 'thick'));
    it.push(R(B / 2 - rm.Di / 2, H * 0.3 - 0.06, rm.Di, 0.12, 'equipFill'));
    it.push(R(B / 2 - 0.35, H + 1.0, 0.7, 0.6, 'equipFill'));
    it.push(T(B / 2 + 0.5, H + 1.3, `Motor ${rm.motor} kW · ${fmt(rm.rpm, 0)} rpm`, { size: 0.8 }));
    it.push(Dm(0, -t, B, -t, -0.5, `${mm(B)}`), Dm(B + t, 0, B + t, H, -0.5, `H ${mm(H)}`));
    it.push(Dm(B / 2 - rm.Di / 2, H * 0.3 - 0.06, B / 2 + rm.Di / 2, H * 0.3 - 0.06, -0.35, `Dᵢ ${mm(rm.Di)}`));
    it.push(T(B / 2, -1.2, `${rm.imp.label}`, { anchor: 'middle', size: 0.8 }));
    return auto(`Flash mixer – section (${rm.nBasins} basin)`, it);
  }
  const L = rm.Lj,
    y1 = rm.inputs.y1,
    y2 = rm.y2,
    drop = rm.drop;
  it.push(R(-3, -0.3, L + 6, 0.3, 'concrete'));
  it.push(R(-3, 0, 0.3, drop + y2 + rm.Hw + 0.4, 'concrete'));
  it.push(R(-2.7, drop, 2.7, 0.2, 'concrete'));
  it.push(R(-2.7, drop + 0.2, 2.4, rm.Hw + 0.4, 'water'));
  it.push({
    t: 'poly',
    pts: [
      [-0.3, drop + 0.2 + rm.Hw * 0.7],
      [0, drop * 0.5],
      [0.4, y1],
      [0.6, y1],
      [0.6 + L * 0.15, y1 + (y2 - y1) * 0.35],
      [0.6 + L * 0.5, y2 * 0.98],
      [0.6 + L, y2],
      [L + 3, y2],
      [L + 3, 0],
      [0, 0],
      [-0.3, drop],
    ],
    cls: 'water',
  });
  it.push({
    t: 'poly',
    pts: [
      [0.4, y1],
      [0.6, y1],
      [0.6 + L * 0.15, y1 + (y2 - y1) * 0.35],
      [0.6 + L * 0.5, y2 * 0.98],
      [0.6 + L, y2],
      [L + 3, y2],
    ],
    closed: false,
    cls: 'waterline',
  });
  it.push(T(-1.5, drop + rm.Hw + 1.0, 'Drop weir', { anchor: 'middle', size: 0.85 }));
  it.push(T(1.2, y1 + 0.1, `y₁ = ${f2(y1)} m`, { size: 0.75 }));
  it.push(Dm(0.6, -0.3, 0.6 + L, -0.3, -0.5, `Lⱼ = ${mm(L)}`));
  it.push(Dm(L + 3.3, 0, L + 3.3, y2, -0.5, `y₂ ${mm(y2)}`));
  it.push(
    T(
      L / 2,
      Math.max(drop + rm.Hw + 1.8, y2 + 0.9),
      `Fr₁ = ${f2(rm.Fr1)} · G = ${fmt(rm.Gact, 0)} s⁻¹ · t = ${f2(rm.tAct)} s · hL = ${f2(rm.hL)} m`,
      { anchor: 'middle', size: 0.85, bold: true },
    ),
  );
  it.push(T(-2.6, drop + rm.Hw + 0.45, 'Coagulant', { size: 0.75, color: 'var(--dw-equip)' }));
  it.push(Ln(-2.0, drop + rm.Hw + 0.35, -0.2, drop + 0.2 + rm.Hw * 0.75, 'equip', { arrow: true }));
  return auto(`Hydraulic-jump mixer – profile (channel width ${f2(rm.b)} m)`, it);
}

// ---------------------------------------------------------------- Flocculation
export function flocDrawing(fl) {
  if (!fl || !fl.enabled) return null;
  const it = [];
  const t = 0.25;
  if (fl.type === 'hbaffle') {
    const W = fl.W;
    let x = 0;
    it.push(
      R(-t, -t, fl.L + (fl.stages.length - 1) * t + 2 * t, t, 'concrete'),
      R(-t, W, fl.L + (fl.stages.length - 1) * t + 2 * t, t, 'concrete'),
      R(-t, 0, t, W, 'concrete'),
    );
    fl.stages.forEach((s, i) => {
      it.push(R(x, 0, s.L, W, 'water'));
      const pitch = s.L / s.nInt;
      for (let k = 1; k < s.nInt; k++) {
        const bx = x + k * pitch;
        const fromTop = k % 2 === 0;
        it.push(fromTop ? R(bx - 0.04, s.gap, 0.08, W - s.gap, 'baffle') : R(bx - 0.04, 0, 0.08, W - s.gap, 'baffle'));
      }
      it.push(
        T(
          x + s.L / 2,
          W + 0.9 + (i % 2) * (fl.L / 36) * 1.1,
          `Stage ${s.i}: G ${fmt(s.Ga, 0)} s⁻¹ · ${s.nInt} baffles @ ${f2(s.sp)} m`,
          { anchor: 'middle', size: 0.8, bold: true },
        ),
      );
      x += s.L;
      if (i < fl.stages.length - 1) {
        it.push(R(x, 0, t, W - 0.6, 'concrete'));
        x += t;
      }
    });
    it.push(R(x, 0, t, W, 'concrete'));
    it.push(Dm(0, -t, x, -t, -0.9, `${mm(x)}`), Dm(x + t, 0, x + t, W, -0.8, `${mm(W)}`));
    it.push(
      Ln(-2.5, W / 2, -0.3, W / 2, 'pipe', { arrow: true }),
      Ln(x + 0.3, 0.5, x + 2.5, 0.5, 'pipe', { arrow: true }),
    );
    return auto(`Horizontal baffled flocculator – plan (1 of ${fl.nT} trains, depth ${f2(fl.H)} m)`, it);
  }
  if (fl.type === 'vbaffle') {
    // longitudinal sections of each stage channel stacked vertically
    let y = 0;
    const H = fl.H;
    fl.stages.forEach((s) => {
      it.push(
        R(-t, y - t, s.L + 2 * t, t, 'concrete'),
        R(-t, y, t, H + 0.5, 'concrete'),
        R(s.L, y, t, H + 0.5, 'concrete'),
      );
      it.push(R(0, y, s.L, H, 'water'), Ln(0, y + H, s.L, y + H, 'waterline'));
      const pitch = s.L / s.nInt;
      for (let k = 1; k < s.nInt; k++) {
        const bx = k * pitch;
        const under = k % 2 === 1;
        it.push(
          under ? R(bx - 0.04, y + s.gap, 0.08, H + 0.4 - s.gap, 'baffle') : R(bx - 0.04, y, 0.08, H - s.gap, 'baffle'),
        );
      }
      it.push(
        T(
          s.L / 2,
          y + H + 0.8,
          `Stage ${s.i}: ${s.nInt} baffles @ ${f2(s.sp)} m · v ${f2(s.v)} m/s · G ${fmt(s.Ga, 0)} s⁻¹ · hL ${fmt(s.hl * 1000, 0)} mm`,
          { anchor: 'middle', size: 0.8, bold: true },
        ),
      );
      it.push(Dm(s.L + t, y, s.L + t, y + H, -0.7, `${mm(H)}`));
      y -= H + 2.6;
    });
    const Lmax = Math.max(...fl.stages.map((s) => s.L));
    it.push(Dm(0, y + H + 2.6 - t, Lmax, y + H + 2.6 - t, -0.8, `Channel length ${mm(Lmax)} · width ${mm(fl.W)}`));
    return auto(`Over-and-under baffled flocculator – channel sections (1 of ${fl.nT} trains)`, it);
  }
  // paddle: plan of compartments
  const W = fl.W;
  let x = 0;
  it.push(
    R(-t, -t, fl.L + fl.stages.length * t + t, t, 'concrete'),
    R(-t, W, fl.L + fl.stages.length * t + t, t, 'concrete'),
    R(-t, 0, t, W, 'concrete'),
  );
  fl.stages.forEach((s, i) => {
    it.push(R(x, 0, s.L, W, 'water'));
    it.push(Ln(x + s.L / 2, -0.6, x + s.L / 2, W + 0.6, 'center'));
    const pw = Math.min(s.L * 0.8, 2 * s.R);
    for (let k = 0; k < 3; k++)
      it.push(R(x + s.L / 2 - pw / 2, 0.4 + (k * (W - 0.8)) / 3, pw, (W - 0.8) / 3 - 0.3, 'equipFill'));
    it.push(R(x + s.L / 2 - 0.4, W + 0.6, 0.8, 0.8, 'equipFill'));
    it.push(
      T(
        x + s.L / 2,
        W + 1.9 + (i % 2) * (Math.max(fl.L, W) / 36) * 1.1,
        `G ${fmt(s.Ga, 0)} · ${fmt(s.rpm, 1)} rpm · ${s.kw} kW`,
        { anchor: 'middle', size: 0.7, bold: true },
      ),
    );
    x += s.L;
    it.push(R(x, 0.6, t, W - 1.2, 'concrete'));
    x += t;
  });
  it.push(Dm(0, -t, x - t, -t, -0.9, `${mm(x - t)}`), Dm(x, 0, x, W, -0.8, `${mm(W)}`));
  return auto(`Paddle flocculator – plan (1 of ${fl.nT} trains, depth ${f2(fl.H)} m)`, it);
}

// ---------------------------------------------------------------- Sedimentation
export function sedPlan(sd) {
  if (!sd || !sd.enabled) return null;
  const it = [];
  const t = 0.3;
  if (sd.type === 'circ') {
    const r = sd.D / 2;
    it.push(
      { t: 'circle', cx: 0, cy: 0, r: r + t, cls: 'concreteSolid' },
      { t: 'circle', cx: 0, cy: 0, r, cls: 'water' },
      { t: 'circle', cx: 0, cy: 0, r: r - 0.5, cls: 'waterline' },
      { t: 'circle', cx: 0, cy: 0, r: r - 0.9, cls: 'dash' },
    );
    it.push({ t: 'circle', cx: 0, cy: 0, r: sd.centerWell / 2, cls: 'outline' });
    it.push(Ln(-r, 0, r, 0, 'center'), Ln(0, -r, 0, r, 'center'));
    it.push(Ln(0, 0, r * 0.95, r * 0.15, 'equip'), Ln(0, 0, -r * 0.95, -r * 0.15, 'equip'));
    it.push(Dm(-r, -r - t, r, -r - t, -1.2, `Ø ${mm(sd.D)}`));
    it.push(
      T(0, r + 1.4, `${sd.N} clarifiers · SOR ${f2(sd.sorAct)} m/d · weir ${fmt(sd.weirLoadAct, 0)} m³/m·d`, {
        anchor: 'middle',
        size: 0.9,
        bold: true,
      }),
    );
    return auto('Circular clarifier – plan', it);
  }
  const L = sd.L,
    W = sd.W,
    N = Math.min(sd.N, 4);
  for (let k = 0; k < N; k++) {
    const y0 = k * (W + t);
    it.push(R(0, y0, L, W, 'water'));
    it.push(R(-1.5, y0, 1.5, W, 'concreteSolid', { op: 0.6 }));
    it.push(Ln(1.5, y0 + 0.2, 1.5, y0 + W - 0.2, 'dash'));
    // launders
    for (let j = 0; j < sd.nL; j++) {
      const ly = y0 + (W * (j + 1)) / (sd.nL + 1);
      it.push(R(L - sd.Llaund, ly - sd.inputs.launderWidth / 2, sd.Llaund, sd.inputs.launderWidth, 'equipFill'));
    }
    it.push(R(L - 0.4, y0 + 0.2, 0.4, W - 0.4, 'equipFill'));
    it.push(R(0.2, y0 + W * 0.15, 3, W * 0.7, 'sludge'));
    if (k < N - 1) it.push(R(-1.5, y0 + W, L + 1.5, t, 'concrete'));
  }
  const Wt = N * W + (N - 1) * t;
  it.push(R(-1.5, -t, L + 1.5 + t, t, 'concrete'), R(-1.5, Wt, L + 1.5 + t, t, 'concrete'), R(L, 0, t, Wt, 'concrete'));
  it.push(T(-0.75, Wt + 1.0, 'Inlet channel', { anchor: 'middle', size: 0.8 }));
  it.push(
    T(1.7, -1.1, 'Diffuser wall', { size: 0.75 }),
    T(L - sd.Llaund, -1.1, `${sd.nL} finger launders × ${f2(sd.Llaund)} m (V-notch)`, { size: 0.75 }),
  );
  it.push(T(1.0, W * 0.5, 'Hopper', { size: 0.7 }));
  it.push(Dm(0, Wt + t, L, Wt + t, 1.2, `L = ${mm(L)}`), Dm(L + t, 0, L + t, W, -1.2, `W = ${mm(W)}`));
  {
    const th = (L + 3) / 36;
    const a = th * 1.6;
    const mk = (x1, y1, x2, y2, lab, nx, ny) => {
      it.push(Ln(x1, y1, x2, y2, 'cut'));
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ]) {
        it.push(Ln(x, y, x + nx * a, y + ny * a, 'thick'), {
          t: 'poly',
          pts: [
            [x + nx * a * 1.5, y + ny * a * 1.5],
            [x + nx * a + ny * a * 0.3, y + ny * a + nx * a * 0.3],
            [x + nx * a - ny * a * 0.3, y + ny * a - nx * a * 0.3],
          ],
          cls: 'baffle',
        });
      }
      it.push(
        T(x1 - (x2 - x1 ? th : 0) + nx * a * 0.6, y1 - (y2 - y1 ? th * 1.3 : th * 0.35) + ny * a * 0.6, lab, {
          anchor: 'middle',
          bold: true,
          size: 1.2,
        }),
        T(x2 + (x2 - x1 ? th : 0) + nx * a * 0.6, y2 + (y2 - y1 ? th * 0.6 : -th * 0.35) + ny * a * 0.6, lab, {
          anchor: 'middle',
          bold: true,
          size: 1.2,
        }),
      );
    };
    mk(-3.5, N > 1 ? W + t + W * 0.42 : W * 0.88, L + t + 1.5, N > 1 ? W + t + W * 0.42 : W * 0.88, 'A', 0, 1);
    mk(L * 0.8, -t - 2.2, L * 0.8, Wt + t + 0.8, 'B', -1, 0);
  }
  return auto(`Sedimentation tanks – plan (${sd.N} tanks${sd.N > 4 ? ', 4 shown' : ''})`, it);
}
export function sedSection(sd) {
  if (!sd || !sd.enabled || sd.type === 'circ') return null;
  const it = [];
  const L = sd.L,
    H = sd.H,
    sl = sd.inputs.sludgeDepth,
    t = 0.35;
  const fb = 0.5;
  it.push(R(-t, -sl - t - 1.0, t, H + sl + fb + t + 1.0, 'concrete'), R(L, -sl - t, t, H + sl + fb + t, 'concrete'));
  it.push({
    t: 'poly',
    pts: [
      [-t, -sl - t - 1.0],
      [3, -sl - t - 1.0],
      [3.6, -sl - t],
      [L + t, -sl - t],
      [L + t, -sl],
      [3.6, -sl],
      [3, -sl - 1.0],
      [0, -sl - 1.0],
      [0, -sl - t - 1.0],
    ],
    cls: 'concrete',
  });
  it.push({
    t: 'poly',
    pts: [
      [0, H],
      [L, H],
      [L, -sl],
      [3.6, -sl],
      [3, -sl - 1.0],
      [0, -sl - 1.0],
    ],
    cls: 'water',
  });
  it.push({
    t: 'poly',
    pts: [
      [0, -sl - 1.0],
      [3, -sl - 1.0],
      [3.6, -sl],
      [L, -sl],
      [L, -sl + 0.15],
      [3.6, -sl + 0.35],
      [0, -sl - 0.4],
    ],
    cls: 'sludge',
  });
  it.push(Ln(0, H, L, H, 'waterline'));
  it.push(Ln(1.5, -sl, 1.5, H + fb, 'dash'));
  for (let i = 0; i < 6; i++) {
    const yy = -sl * 0.5 + (H * (i + 0.5)) / 6;
    it.push(Ln(1.0, yy, 2.0, yy, 'waterline', { arrow: true }));
  }
  it.push(R(L - sd.Llaund, H - sd.launderDepth + 0.08, sd.Llaund, sd.launderDepth, 'equipFill'));
  it.push(Ln(1.5, H * 0.7, L - sd.Llaund, 0, 'dash'));
  if (sd.type === 'tube') {
    const x0t = L * (1 - (sd.inputs.coverFrac || 0.75)),
      zt = H - 0.7,
      zb = H - 0.7 - (sd.inputs.tubeL || 1) * Math.sin(((sd.inputs.tubeAngle || 60) * Math.PI) / 180);
    it.push(R(x0t, zb, L - x0t - 0.3, zt - zb, 'outline'));
    for (let x = x0t; x < L - 0.3 - 0.5; x += 0.45)
      it.push(Ln(x, zb, x + (zt - zb) / Math.tan(((sd.inputs.tubeAngle || 60) * Math.PI) / 180), zt, 'thin'));
    it.push(
      T((x0t + L) / 2, zb - 0.45, `Tube-settler modules (${sd.inputs.tubeAngle || 60}°)`, {
        anchor: 'middle',
        size: 0.75,
      }),
    );
  }
  it.push(T(L * 0.45, H * 0.45, 'Settling zone', { anchor: 'middle', size: 0.9 }));
  const ths = L / 55;
  it.push(
    T(
      L * 0.5,
      -sl - t - 1.0 - 0.9 - ths * 2.4,
      'Sludge zone on the floor – chain-and-flight scraper to the inlet-end hopper',
      { anchor: 'middle', size: 0.8 },
    ),
  );
  it.push(Lv(L * 0.3, H, `WL ${f2(H)} (rel.)`));
  it.push(Dm(L + t, -sl, L + t, H, -1.0, `${mm(H + sl)}`), Dm(0, -sl - t - 1.0, L, -sl - t - 1.0, -0.9, `${mm(L)}`));
  it.push(
    T(
      L / 2,
      H + fb + ths * 2.2,
      `SOR ${f2(sd.sorAct)} m³/m²·d · θ ${f2(sd.hrt)} h · u ${f2(sd.vh * 60)} m/min · Re ${fmt(sd.Re, 0)}`,
      { anchor: 'middle', size: 0.85, bold: true },
    ),
  );
  return auto('Sedimentation tank – longitudinal section A–A', it, { textH: ths });
}

// ---------------------------------------------------------------- Filtration
export function filterPlan(fi) {
  if (!fi) return null;
  const it = [];
  const t = 0.3;
  if (fi.type === 'ssf') {
    const n = Math.min(fi.N, 6);
    for (let k = 0; k < n; k++) {
      const x0 = k * (fi.B + t);
      it.push(R(x0, 0, fi.B, fi.Lb, 'sand'));
      it.push(
        T(x0 + fi.B / 2, fi.Lb / 2, k === n - 1 ? 'Standby' : `Bed ${k + 1}`, {
          anchor: 'middle',
          size: 0.9,
          bold: true,
        }),
      );
      if (k < n - 1) it.push(R(x0 + fi.B, 0, t, fi.Lb, 'concrete'));
    }
    it.push(Dm(0, -0.2, fi.B, -0.2, -0.8, `${mm(fi.B)}`), Dm(-0.2, 0, -0.2, fi.Lb, 0.8, `${mm(fi.Lb)}`));
    return auto(`Slow sand filters – plan (${fi.N} beds)`, it);
  }
  const B = fi.B,
    Lb = fi.Lb,
    gw = fi.inputs.layout === 'twin' ? fi.inputs.gulletW : 0;
  const beds = fi.beds;
  const xs = beds === 2 ? [0, B + gw] : [0];
  for (const x0 of xs) {
    it.push(R(x0, 0, B, Lb, 'sand'));
    const sp = Lb / fi.nTr;
    for (let k = 0; k < fi.nTr; k++)
      it.push(R(x0 + 0.15, sp * (k + 0.5) - fi.inputs.troughWidth / 2, B - 0.3, fi.inputs.troughWidth, 'equipFill'));
    const ls = fi.inputs.lateralSpacing;
    for (let y = ls / 2; y < Lb; y += ls * 4) it.push(Ln(x0 + 0.15, y, x0 + B - 0.15, y, 'dash'));
    it.push(Ln(x0 + B / 2, 0.1, x0 + B / 2, Lb - 0.1, 'center'));
  }
  if (beds === 2) {
    it.push(R(B, 0, gw, Lb, 'water'));
    it.push(T(B + gw / 2, Lb / 2, 'Gullet', { anchor: 'middle', rot: 90, size: 0.8 }));
  }
  const Wt = beds * B + gw;
  it.push(
    R(-t, -t, Wt + 2 * t, t, 'concrete'),
    R(-t, Lb, Wt + 2 * t, t, 'concrete'),
    R(-t, 0, t, Lb, 'concrete'),
    R(Wt, 0, t, Lb, 'concrete'),
  );
  it.push(
    Dm(0, Lb + t, B, Lb + t, 0.9, `B = ${mm(B)}`),
    Dm(-t, 0, -t, Lb, 0.9, `${mm(Lb)}`),
    Dm(-t, -t, Wt + t, -t, -1.0, `${mm(Wt + 2 * t)} overall`),
  );
  it.push(
    T(
      Wt / 2,
      -2.4,
      `${fi.nTr} wash troughs per bed · laterals Ø${fi.latDia} mm @ ${fi.inputs.lateralSpacing} m · ${fi.nO} orifices Ø${fi.inputs.orificeDia} mm per bed`,
      { anchor: 'middle', size: 0.75 },
    ),
  );
  return auto(`Rapid gravity filter – plan (1 of ${fi.N}, ${beds === 2 ? 'twin beds' : 'single bed'})`, it);
}
export function filterSection(fi, hyd) {
  if (!fi || fi.type === 'ssf') return null;
  const it = [];
  const B = fi.B,
    t = 0.3;
  const ud = fi.inputs.underdrainDepth,
    gr = fi.gravelD,
    md = fi.Ltot,
    wd = fi.inputs.waterDepth,
    fb = fi.inputs.freeboard;
  const zSand = hyd?.sandTop ?? ud + gr + md;
  const base = zSand - md - gr - ud;
  const W = B;
  it.push(
    R(-t, base - t, t, ud + gr + md + wd + fb + t + 0.2, 'concrete'),
    R(W, base - t, t, ud + gr + md + wd + fb + t + 0.2, 'concrete'),
    R(-t, base - t, W + 2 * t, t, 'concrete'),
  );
  it.push(R(0, base, W, ud, 'water'));
  for (let x = 0.3; x < W; x += 0.6)
    it.push({ t: 'circle', cx: x, cy: base + ud * 0.4, r: fi.latDia / 2000, cls: 'pipeFill' });
  it.push(R(0, base + ud, W, gr, 'gravel'));
  let y = base + ud + gr;
  if (fi.type === 'dual') {
    const sl = fi.sandL;
    it.push(R(0, y, W, sl, 'sand'));
    y += sl;
    it.push(R(0, y, W, fi.inputs.anthDepth, 'anth'));
    y += fi.inputs.anthDepth;
  } else {
    it.push(R(0, y, W, md, 'sand'));
    y += md;
  }
  const wtop = hyd?.filterMax ?? y + wd;
  it.push(R(0, y, W, wtop - y, 'water'));
  it.push(Ln(0, wtop, W, wtop, 'waterline'));
  const lip = y + fi.lipAbove;
  it.push(R(W * 0.35, lip - fi.trDepth, W * 0.3, fi.trDepth, 'equipFill'));
  it.push(Ln(0, y + (fi.Le - fi.Ltot), W, y + (fi.Le - fi.Ltot), 'dash'));
  it.push(T(W + 0.5, y + (fi.Le - fi.Ltot), `Expanded bed (+${fmt(fi.expPct, 0)} %)`, { size: 0.7 }));
  it.push(Lv(W * 0.1, wtop, `Max WL ${f2(wtop)}`));
  if (hyd?.crest) it.push(Lv(W * 0.1, hyd.crest, `Outlet weir ${f2(hyd.crest)}`));
  it.push(T(W + 0.5, base + ud / 2, `Underdrain ${fmt(ud * 1000, 0)} mm`, { size: 0.75 }));
  it.push(T(W + 0.5, base + ud + gr / 2, `Graded gravel ${fmt(gr * 1000, 0)} mm`, { size: 0.75 }));
  it.push(
    T(
      W + 0.5,
      base + ud + gr + md / 2,
      `${fi.type === 'dual' ? 'Anthracite + sand' : 'Sand'} ${fmt(md * 1000, 0)} mm (ES ${f2(fi.g.d10)} mm, UC ${f2(fi.g.UC)})`,
      { size: 0.75 },
    ),
  );
  it.push(T(W * 0.5, lip + 0.25, 'Wash trough', { anchor: 'middle', size: 0.7 }));
  it.push(Dm(-t, base, -t, wtop + fb, 1.1, `${mm(wtop + fb - base)}`));
  it.push(Dm(0, base - t, W, base - t, -0.7, `${mm(W)}`));
  return auto('Rapid gravity filter – cross-section (one bed)', it, { scaleNote: 'levels in m MSL' });
}

// ---------------------------------------------------------------- Contact tank / CWR
export function contactPlan(dis) {
  if (!dis || !dis.footprint) return null;
  const it = [];
  const n = dis.nPasses,
    w = dis.inputs.chanWidth,
    L = dis.L,
    t = 0.2;
  for (let k = 0; k < n; k++) {
    const y0 = k * (w + t);
    it.push(R(0, y0, L, w, 'water'));
    if (k < n - 1) it.push(R(k % 2 === 0 ? 0 : 1.2, y0 + w, L - 1.2, t, 'concrete'));
    it.push(
      Ln(k % 2 === 0 ? 0.6 : L - 0.6, y0 + w / 2, k % 2 === 0 ? L - 0.6 : 0.6, y0 + w / 2, 'waterline', {
        arrow: true,
      }),
    );
  }
  const Wt = n * w + (n - 1) * t;
  it.push(
    R(-0.3, -0.3, L + 0.6, 0.3, 'concrete'),
    R(-0.3, Wt, L + 0.6, 0.3, 'concrete'),
    R(-0.3, 0, 0.3, Wt, 'concrete'),
    R(L, 0, 0.3, Wt, 'concrete'),
  );
  it.push(Dm(0, Wt + 0.3, L, Wt + 0.3, 0.9, `${mm(L)}`), Dm(L + 0.3, 0, L + 0.3, Wt, -0.9, `${mm(Wt)}`));
  it.push(
    T(
      L / 2,
      -1.6,
      `${n} passes · flow path ${fmt(dis.chanLen, 1)} m · L/W ${fmt(dis.LW, 0)} · BF ${dis.BF} · T₁₀ ${fmt(dis.T10, 1)} min`,
      { anchor: 'middle', size: 0.85, bold: true },
    ),
  );
  return auto('Chlorine contact tank – plan', it);
}
export function cwrPlan(st) {
  if (!st) return null;
  const it = [];
  const n = st.inputs.cwrCompartments,
    L = st.L,
    W = st.W,
    t = 0.3;
  for (let k = 0; k < n; k++) {
    const x0 = k * (L + t);
    it.push(R(x0, 0, L, W, 'water'));
    for (let j = 1; j < 4; j++) it.push(R(x0 + (L * j) / 4 - 0.1, j % 2 ? 0 : 1.5, 0.2, W - 1.5, 'concrete'));
    it.push(
      T(x0 + L / 2, W + 1.2, `Compartment ${k + 1}: ${fmt(st.Vc, 0)} m³`, { anchor: 'middle', size: 0.9, bold: true }),
    );
    if (k < n - 1) it.push(R(x0 + L, 0, t, W, 'concrete'));
  }
  const Lt = n * L + (n - 1) * t;
  it.push(
    R(-t, -t, Lt + 2 * t, t, 'concrete'),
    R(-t, W, Lt + 2 * t, t, 'concrete'),
    R(-t, 0, t, W, 'concrete'),
    R(Lt, 0, t, W, 'concrete'),
  );
  it.push(Ln(-4, W * 0.15, -0.4, W * 0.15, 'pipe', { arrow: true }), T(-4, W * 0.15 + 0.8, 'Inlet', { size: 0.75 }));
  it.push(
    Ln(Lt + 0.4, W * 0.85, Lt + 4, W * 0.85, 'pipe', { arrow: true }),
    T(Lt + 0.6, W * 0.85 + 0.8, 'To pumps', { size: 0.75 }),
  );
  it.push(Dm(0, -t, L, -t, -1.4, `${mm(L)}`), Dm(Lt + t, 0, Lt + t, W, -1.6, `${mm(W)}`));
  it.push(
    T(
      Lt / 2,
      -t - 1.4 - (Lt / 36) * 2.6,
      `Clear water reservoir ${fmt(st.V, 0)} m³ · depth ${f2(st.depth)} m · flow-guiding walls`,
      { anchor: 'middle', size: 0.9, bold: true },
    ),
  );
  return auto('Clear water reservoir – plan', it);
}

// ---------------------------------------------------------------- Hydraulic profile
export function hydraulicProfile(hyd) {
  if (!hyd) return null;
  const it = [];
  const us = hyd.units;
  const zmin = Math.min(...us.map((u) => u.bottom), hyd.GL) - 1;
  const zmax = Math.max(...us.map((u) => u.top), hyd.GL) + 1;
  const xspan = us[us.length - 1].x1;
  const VE = Math.max(1, Math.min(8, xspan / 2.8 / (zmax - zmin)));
  const Y = (z) => (z - zmin) * VE;
  // elevation scale
  for (let z = Math.ceil(zmin); z <= zmax; z += 1) {
    it.push(Ln(-3, Y(z), -2.2, Y(z), 'thin'));
    if (z % 2 === 0) it.push(T(-3.4, Y(z) - (0.25 * VE) / 2, `${z}`, { anchor: 'end', size: 0.75 }));
  }
  it.push(Ln(-2.6, Y(Math.ceil(zmin)), -2.6, Y(Math.floor(zmax)), 'thin'));
  // axis title runs up the elevation scale so it never meets the unit labels
  const thEst = (xspan + 8) / 36;
  it.push(
    T(-3.4 - 1.5 * thEst, Y((zmin + zmax) / 2), 'Elevation (m MSL)', {
      anchor: 'middle',
      size: 0.75,
      bold: true,
      rot: 90,
    }),
  );
  // ground
  it.push(Ln(-2, Y(hyd.GL), xspan + 2, Y(hyd.GL), 'ground'));
  it.push(T(xspan + 2.3, Y(hyd.GL), `GL ${f2(hyd.GL)}`, { size: 0.75, color: 'var(--dw-ground)' }));
  const hgl = [];
  // label placement: tanks and water-level tags are obstacles; each unit name takes the lowest free row above its tank
  const obst = [];
  const lvW = (txt) => thEst * (0.9 + String(txt).length * 0.8 * 0.56);
  us.forEach((u) => {
    obst.push({ x0: u.x0 - 0.3, x1: u.x1 + 0.3, y0: Y(u.bottom), y1: Y(u.top) });
    obst.push({
      x0: u.x0 + 0.6 - 0.6 * thEst,
      x1: u.x0 + 0.6 + lvW(f2(u.wl)),
      y0: Y(u.wl) - 0.45 * thEst,
      y1: Y(u.wl) + 0.95 * thEst,
    });
  });
  const free = (a) => !obst.some((o) => a.x0 < o.x1 && a.x1 > o.x0 && a.y0 < o.y1 && a.y1 > o.y0);
  const lh = 0.7 * thEst;
  const labels = us.map((u) => {
    const cx = (u.x0 + u.x1) / 2;
    const w = String(u.name).length * lh * 0.56;
    const base = Y(u.top) + 0.45 * thEst;
    let y = base;
    for (let k = 0; k < 12; k++) {
      y = base + k * 1.2 * lh;
      if (free({ x0: cx - w / 2 - 0.25 * thEst, x1: cx + w / 2 + 0.25 * thEst, y0: y - 0.3 * lh, y1: y + lh })) break;
    }
    obst.push({ x0: cx - w / 2 - 0.25 * thEst, x1: cx + w / 2 + 0.25 * thEst, y0: y - 0.3 * lh, y1: y + lh });
    return { cx, y };
  });
  us.forEach((u, ui) => {
    const t = 0.3;
    it.push(R(u.x0, Y(u.bottom), u.x1 - u.x0, Y(u.wl) - Y(u.bottom), 'water'));
    it.push({
      t: 'poly',
      pts: [
        [u.x0, Y(u.top)],
        [u.x0, Y(u.bottom)],
        [u.x1, Y(u.bottom)],
        [u.x1, Y(u.top)],
      ],
      closed: false,
      cls: 'thick',
    });
    it.push(Ln(u.x0 - t, Y(u.top), u.x0 + t, Y(u.top), 'thick'), Ln(u.x1 - t, Y(u.top), u.x1 + t, Y(u.top), 'thick'));
    if (u.sandTop !== undefined)
      it.push(R(u.x0, Y(u.sandTop - 0.7), u.x1 - u.x0, Y(u.sandTop) - Y(u.sandTop - 0.7), 'sand'));
    const wlOut = u.wlOut ?? u.wl;
    it.push(Ln(u.x0, Y(u.wl), u.x1, Y(wlOut), 'waterline'));
    hgl.push([u.x0, Y(u.wl)], [u.x1, Y(wlOut)]);
    const lb = labels[ui];
    // leader from the tank top (or above its own level tag) to the label, only when the label had to move up
    const tagTop = Y(u.wl) + 0.95 * thEst;
    const lx = lb.cx;
    const fromY =
      lx > u.x0 + 0.6 - 0.6 * thEst && lx < u.x0 + 0.6 + lvW(f2(u.wl)) ? Math.max(Y(u.top), tagTop) : Y(u.top);
    if (lb.y - 0.3 * lh - fromY > 0.35 * thEst) it.push(Ln(lx, fromY, lx, lb.y - 0.3 * lh, 'thin'));
    it.push(T(lx, lb.y, u.name, { anchor: 'middle', size: 0.7, bold: true }));
    it.push(Lv(u.x0 + 0.6, Y(u.wl), f2(u.wl)));
  });
  it.push({ t: 'poly', pts: hgl, closed: false, cls: 'hgl' });
  it.push(
    T(
      xspan / 2,
      Y(zmin) - 1.6,
      `Hydraulic grade line (red dashed) · total head through plant ${f2(hyd.totalHead)} m · vertical exaggeration ×${fmt(VE, 1)}`,
      { anchor: 'middle', size: 0.8 },
    ),
  );
  return auto('Hydraulic profile', it, { scaleNote: `V.E. ×${fmt(VE, 1)}` });
}

// ---------------------------------------------------------------- Site layout
export function layoutPlan(lay, opts = {}) {
  if (!lay) return null;
  const it = [];
  const H = lay.siteH;
  const Yf = (y, h) => H - y - h; // convert top-left screen coords to y-up
  it.push(R(0, 0, lay.siteW, H, 'site'));
  if (lay.inputs.showGrid) {
    for (let x = 10; x < lay.siteW; x += 10) it.push(Ln(x, 0, x, H, 'grid'));
    for (let y = 10; y < H; y += 10) it.push(Ln(0, y, lay.siteW, y, 'grid'));
  }
  for (const b of lay.items) {
    const y = Yf(b.y, b.h);
    const cls = b.kind === 'building' ? 'building' : b.kind === 'sludge' ? 'residual' : 'process';
    const g = { group: b.key, drag: !!opts.draggable };
    if (b.circ) {
      it.push(R(b.x, y, b.w, b.h, cls, { ...g, op: 0.35 }));
      for (let k = 0; k < (b.n || 1); k++) {
        const r = b.D / 2;
        const cx = b.w > b.h ? b.x + 1 + r + k * (b.D + 1) : b.x + b.w / 2;
        const cy = b.w > b.h ? y + b.h / 2 : y + b.h - 1.5 - r - k * (b.D + 3);
        it.push({ t: 'circle', cx, cy, r, cls, ...g });
      }
    } else it.push(R(b.x, y, b.w, b.h, cls, g));
    const thL = Math.max(lay.siteW, H) / 70;
    const fit = Math.min(1, (b.w * 0.92) / (b.label.length * 0.56 * thL));
    const big = fit >= 0.45;
    it.push(
      T(b.x + b.w / 2, y + b.h / 2 + (big ? thL * 0.15 : 0), big ? b.label : b.label.split(/[ (&]/)[0], {
        anchor: 'middle',
        size: Math.max(0.45, fit),
        bold: true,
        ...g,
      }),
    );
    if (b.h > thL * 2.2)
      it.push(
        T(b.x + b.w / 2, y + b.h / 2 - thL * 0.95, `${fmt(b.w, 1)} × ${fmt(b.h, 1)} m`, {
          anchor: 'middle',
          size: Math.max(0.42, Math.min(0.6, fit * 0.8)),
          ...g,
        }),
      );
  }
  // north arrow & scale bar
  const nx = lay.siteW + 6,
    ny = H - 8;
  it.push({
    t: 'poly',
    pts: [
      [nx, ny + 6],
      [nx - 2, ny],
      [nx, ny + 1.5],
      [nx + 2, ny],
    ],
    cls: 'baffle',
  });
  it.push(T(nx, ny + 7.5, 'N', { anchor: 'middle', bold: true }));
  it.push(R(0, -6, 50, 1, 'baffle'), R(10, -6, 10, 1, 'outline'), R(30, -6, 10, 1, 'outline'));
  it.push(T(0, -8.5, '0', { size: 0.7 }), T(50, -8.5, '50 m', { size: 0.7, anchor: 'middle' }));
  it.push(Dm(0, H, lay.siteW, H, 4, `${mm(lay.siteW)}`), Dm(0, 0, 0, H, 4, `${mm(H)}`));
  it.push(
    T(
      lay.siteW / 2,
      -12,
      `Site ${fmt(lay.siteArea, 0)} m² · land incl. ${lay.inputs.expansion} % reserve ${fmt(lay.ha, 2)} ha = ${fmt(lay.acres, 2)} acres = ${fmt(lay.perches, 0)} perches`,
      { anchor: 'middle', size: 0.9, bold: true },
    ),
  );
  return auto('Site layout – plan', it, { textH: Math.max(lay.siteW, H) / 70 });
}
