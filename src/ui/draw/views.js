// Multi-view drawings: for every structure a plan, longitudinal section, cross-section, general arrangement
// (views arranged in projection on one sheet) and a 3D isometric view – all generated from the design results.
import { fmt } from '../../core/util.js';
import { Scene } from './iso.js';
import * as U from './units.js';
import { chemHousePlan, chlorPlan, rebarDetail, siteLevelsPlan } from './extra.js';
import { Dm, Ln, Lv, R, T, auto } from './units.js';

const f2 = (v) => fmt(v, 2), f1 = (v) => fmt(v, 1), f0 = (v) => fmt(v, 0);
const C = (cx, cy, r, cls) => ({ t: 'circle', cx, cy, r, cls });
const Pg = (pts, cls, closed = true) => ({ t: 'poly', pts, cls, closed });

/** section cutting line with view arrows and letters (drawn on plans) */
export function cut(x1, y1, x2, y2, label, th = 0.6) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const a = th * 1.6;
  const arrow = (x, y) => [Ln(x, y, x + nx * a, y + ny * a, 'thick', { arrow: false }), Pg([[x + nx * a * 1.5, y + ny * a * 1.5], [x + nx * a + ux * a * 0.3, y + ny * a + uy * a * 0.3], [x + nx * a - ux * a * 0.3, y + ny * a - uy * a * 0.3]], 'baffle')];
  return [Ln(x1, y1, x2, y2, 'cut'), ...arrow(x1, y1), ...arrow(x2, y2),
    T(x1 - ux * th * 1.2 + nx * a * 0.6, y1 - uy * th * 1.2 + ny * a * 0.6 - th * 0.35, label, { anchor: 'middle', bold: true, size: 1.2 }),
    T(x2 + ux * th * 1.2 + nx * a * 0.6, y2 + uy * th * 1.2 + ny * a * 0.6 - th * 0.35, label, { anchor: 'middle', bold: true, size: 1.2 })];
}
const move = (it, dx, dy, k = 1) => {
  const o = { ...it };
  if (o.t === 'rect') { o.x += dx; o.y += dy; } else if (o.t === 'line' || o.t === 'dim') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; } else if (o.t === 'poly') o.pts = o.pts.map(([x, y]) => [x + dx, y + dy]);
  else if (o.t === 'circle') { o.cx += dx; o.cy += dy; } else if (o.t === 'text' || o.t === 'level') { o.x += dx; o.y += dy; }
  if (o.t === 'text') o.size = (o.size || 1) * k;
  return o;
};
/** arrange several drawings on one sheet: parts = [{dw, label, at: 'below'|'right'}] – first part is the anchor (plan) */
export function compose(title, parts, extra = {}) {
  parts = parts.filter((p) => p && p.dw);
  if (parts.length < 2) return null;
  const items = [];
  const main = parts[0].dw.bounds;
  const span = Math.max(...parts.map((p) => Math.max(p.dw.bounds.x1 - p.dw.bounds.x0, p.dw.bounds.y1 - p.dw.bounds.y0)));
  const th = span / 46, gap = span * 0.09;
  let yBelow = main.y0 - gap, xRight = main.x1 + gap;
  parts.forEach((p, i) => {
    const b = p.dw.bounds;
    let dx = 0, dy = 0;
    if (i > 0 && p.at === 'right') { dx = xRight - b.x0; dy = main.y1 - b.y1; xRight += b.x1 - b.x0 + gap; }
    else if (i > 0) { dx = main.x0 - b.x0; dy = yBelow - b.y1; yBelow -= b.y1 - b.y0 + gap + th * 3; }
    const k = Math.min(1.3, Math.max(0.55, (p.dw.textH || th) / th));
    for (const it of p.dw.items) items.push(move(it, dx, dy, k));
    items.push(T((b.x0 + b.x1) / 2 + dx, b.y0 + dy - th * 2.3, p.label.toUpperCase(), { anchor: 'middle', bold: true, size: 1.15 }));
    items.push(Ln((b.x0 + b.x1) / 2 + dx - p.label.length * th * 0.4, b.y0 + dy - th * 2.6, (b.x0 + b.x1) / 2 + dx + p.label.length * th * 0.4, b.y0 + dy - th * 2.6, 'thick'));
  });
  return auto(title, items, { textH: th, ...extra });
}

// ================================================================== INTAKE
export function intakePlan(ik) {
  if (!ik || !ik.Dw) return null;
  const d = ik.inputs, r = ik.Dw / 2, t = 0.5, it = [];
  const bankX = -(r + t);
  it.push(R(bankX - 14, -(r + 5), 14, 2 * r + 10, 'water'));
  it.push(Ln(bankX, -(r + 5), bankX, r + 5, 'ground'));
  it.push(T(bankX - 9, r + 3.2, 'RIVER', { anchor: 'middle', bold: true }), Ln(bankX - 11, r + 2, bankX - 7, r + 2, 'waterline', { arrow: true }));
  it.push(C(0, 0, r + t, 'concreteSolid'), C(0, 0, r, 'water'));
  // ports through the river-side wall, coarse screens in front, fine screens behind
  const nPt = Math.max(1, Math.min(4, Math.ceil(ik.nPorts / Math.max(1, d.portLevels))));
  for (let i = 0; i < nPt; i++) {
    const y = (i - (nPt - 1) / 2) * (d.portW + 0.8);
    const xw = -Math.sqrt(Math.max(0.01, (r + t) ** 2 - y * y));
    it.push(R(xw - 0.15, y - d.portW / 2, t + 0.5, d.portW, 'water'), Ln(xw - 0.25, y - d.portW / 2, xw - 0.25, y + d.portW / 2, 'equip'), Ln(xw + t + 0.5, y - d.portW / 2, xw + t + 0.5, y + d.portW / 2, 'equip'));
  }
  it.push(T(bankX - 0.8, -(r * 0.55) - d.portW, `${ik.nPorts} ports ${f2(d.portW)}×${f2(d.portH)} m, coarse ${d.cOpen} / fine ${d.fOpen} mm screens`, { anchor: 'end', size: 0.75 }));
  // pumps and delivery header
  const nP = d.nDuty + (ik.pumps?.nStandby ?? d.nStandby ?? 1);
  const px = r * 0.15, hx = r * 0.62;
  for (let i = 0; i < nP; i++) {
    const y = (i - (nP - 1) / 2) * Math.min(1.8, (2 * r - 2) / nP);
    it.push(C(px, y, 0.42, 'equipFill'), C(px, y, 0.12, 'equip'), Ln(px + 0.42, y, hx, y, 'pipe'));
    it.push(T(px - 0.6, y - 0.12, i < d.nDuty ? `P${i + 1}` : `P${i + 1} (standby)`, { anchor: 'end', size: 0.7 }));
  }
  const yTop = ((nP - 1) / 2) * Math.min(1.8, (2 * r - 2) / nP);
  it.push(Ln(hx, -yTop, hx, yTop, 'pipe'), Ln(hx, 0, r + t + 7, 0, 'pipe', { arrow: true }));
  it.push(T(r + t + 1.2, 1.3, `Rising main DN${ik.pumps.dn} → WTP`, { size: 0.8 }));
  it.push(R(-(r + t + 0.4), -(r + t + 0.4), 2 * (r + t + 0.4), 2 * (r + t + 0.4), 'dash'), T(0, r + t + 1.0, 'Pump house over (shown dashed)', { anchor: 'middle', size: 0.7 }));
  it.push(Ln(-(r + t + 1), 0, r + t + 1, 0, 'center'), Ln(0, -(r + t + 1), 0, r + t + 1, 'center'));
  it.push(Dm(-r, -(r + t), r, -(r + t), -1.6, `Ø ${f2(ik.Dw)} m internal`));
  it.push(...cut(bankX - 12, -0.001, r + t + 4.5, -0.001, 'A', ik.Dw / 20));
  return auto('Intake well – plan', it);
}
function intake3D(ik) {
  if (!ik || !ik.Dw) return null;
  const d = ik.inputs, r = ik.Dw / 2 + 0.5, s = new Scene();
  const gl = ik.deck - 1.5, zr = d.NWL - gl, up = ik.deck + 0.35 - gl; // ground = 0
  s.plane([[-r - 18, -r - 7, zr], [-r, -r - 7, zr], [-r, r + 7, zr], [-r - 18, r + 7, zr]], 'isoWater', 'river');
  s.plane([[-r, -r - 7, zr], [-r, r + 7, zr], [-r, r + 7, 0], [-r, -r - 7, 0]], 'isoSludge', 'bank');
  s.ground(-r, -r - 7, 2 * r + 14, 2 * r + 14);
  s.cyl(0, 0, zr - 0.2, r, up - zr + 0.2);
  s.building(-r * 0.8, -r * 0.8, up, r * 1.6, r * 1.6, 4);
  s.pipe([[r * 0.8, 0, up + 0.6], [r + 3, 0, up + 0.6], [r + 3, 0, 0.3], [r + 13, 0, 0.3]]);
  s.leader(0, 0, up + 6.2, 'Intake well & pump house', 1.5, { bold: true, size: 0.7 });
  s.label(-r - 10, 0, zr + 0.2, `River (NWL ${f2(d.NWL)})`, { size: 0.65 });
  s.label(r + 9, -2.5, 0.3, `Rising main DN${ik.pumps.dn}`, { size: 0.6 });
  s.dim([-r, -r, 0], [r, -r, 0], [0, -3, 0], `Ø ${f2(ik.Dw + 1)} m outside`);
  s.dim([r, -r, zr - 0.2], [r, -r, up], [2.5, -2.5, 0], `${f2(up - zr + 0.2)} m above river level`);
  s.dim([-r * 0.8, -r * 0.8, up], [-r * 0.8, -r * 0.8, up + 4], [-1.5, -1.5, 0]);
  return s.render('Intake well – 3D view');
}

// ================================================================== AERATOR / RAPID MIX
export function aeratorPlan(ae) {
  if (!ae || ae.enabled === false) return null;
  const it = [];
  if (ae.type === 'cascade') {
    const n = ae.inputs.nSteps, L = ae.L, W = ae.W, tr = L / n;
    it.push(R(-1.5, 0, 1.5, W, 'water'), R(-1.8, -0.3, L + 3.7, 0.3, 'concrete'), R(-1.8, W, L + 3.7, 0.3, 'concrete'), R(-1.8, 0, 0.3, W, 'concrete'));
    for (let i = 0; i < n; i++) { it.push(R(i * tr, 0, tr, W, 'process')); if (tr > Math.max(L, W) / 30) it.push(T(i * tr + tr / 2, W / 2, `${i + 1}`, { anchor: 'middle', size: 0.8 })); }
    it.push(R(L, 0, 1.6, W, 'water'), R(L + 1.6, 0, 0.3, W, 'concrete'));
    it.push(T(-0.3, W + 0.9, 'Inlet channel', { anchor: 'end', size: 0.75 }), T(L + 0.3, W + 0.9, 'Collection channel', { size: 0.75 }));
    it.push(Ln(-1.2, W / 2, L + 1.2, W / 2, 'waterline', { arrow: true }));
    it.push(Dm(0, -0.3, L, -0.3, -1.0, `${n} steps × ${f2(tr)} = ${f2(L)} m`), Dm(L + 1.9, 0, L + 1.9, W, -1.0, `W = ${f2(W)} m`));
    it.push(...cut(-2.6, W * 0.3, L + 2.9, W * 0.3, 'A', Math.max(L, W) / 30));
    return auto('Cascade aerator – plan', it);
  }
  const W = ae.W, nU = ae.nUnits || 1;
  for (let k = 0; k < nU; k++) {
    const x0 = k * (W + 2.5);
    it.push(R(x0 - 0.4, -0.4, W + 0.8, W + 0.8, 'water'), R(x0, 0, W, W, 'gravel'), C(x0 + W / 2, W / 2, 0.25, 'pipeFill'), R(x0 - 0.7, -0.7, W + 1.4, 0.3, 'concrete'), R(x0 - 0.7, W + 0.4, W + 1.4, 0.3, 'concrete'), R(x0 - 0.7, -0.4, 0.3, W + 0.8, 'concrete'), R(x0 + W + 0.4, -0.4, 0.3, W + 0.8, 'concrete'));
    it.push(T(x0 + W / 2, W + 1.2, `Tower ${k + 1}`, { anchor: 'middle', size: 0.8, bold: true }));
  }
  it.push(Dm(0, -0.7, W, -0.7, -0.9, `${f2(W)} m square trays`));
  return auto('Multiple-tray aerator – plan', it);
}
export function rapidMixPlan(rm) {
  if (!rm || !rm.enabled) return null;
  const it = [];
  if (rm.type === 'mechanical') {
    const B = rm.B, t = 0.3, n = rm.nBasins;
    for (let k = 0; k < n; k++) {
      const x0 = k * (B + t);
      it.push(R(x0, 0, B, B, 'water'), C(x0 + B / 2, B / 2, rm.Di / 2, 'equip'), C(x0 + B / 2, B / 2, Math.max(0.05, rm.Di * 0.08), 'equipFill'));
      const bw = 0.09 * B;
      it.push(R(x0 + B / 2 - 0.04, 0, 0.08, bw, 'baffle'), R(x0 + B / 2 - 0.04, B - bw, 0.08, bw, 'baffle'), R(x0, B / 2 - 0.04, bw, 0.08, 'baffle'), R(x0 + B - bw, B / 2 - 0.04, bw, 0.08, 'baffle'));
      if (k < n - 1) it.push(R(x0 + B, 0, t, B, 'concrete'));
      it.push(T(x0 + B / 2, B + t + 0.5, `Basin ${k + 1} · ${rm.motor} kW`, { anchor: 'middle', size: 0.8, bold: true }));
    }
    const Wt = n * B + (n - 1) * t;
    it.push(R(-t, -t, Wt + 2 * t, t, 'concrete'), R(-t, B, Wt + 2 * t, t, 'concrete'), R(-t, 0, t, B, 'concrete'), R(Wt, 0, t, B, 'concrete'));
    it.push(Ln(-2, B / 2, -t - 0.1, B / 2, 'pipe', { arrow: true }), Ln(Wt + t + 0.1, B / 2, Wt + 2, B / 2, 'pipe', { arrow: true }));
    it.push(Dm(0, -t, B, -t, -0.7, `${f2(B)} m`), Dm(Wt + t, 0, Wt + t, B, -0.7, `${f2(B)} m`));
    it.push(...cut(-1.2, B * 0.5, Wt + 1.2, B * 0.5, 'A', Math.max(Wt, B) / 26));
    return auto(`Flash mixers – plan (${n} basins, impeller Ø ${f2(rm.Di)} m)`, it);
  }
  const L = rm.Lj, b = rm.b, t = 0.25;
  it.push(R(-3, 0, L + 6, b, 'water'), R(-3.25, -t, L + 6.5, t, 'concrete'), R(-3.25, b, L + 6.5, t, 'concrete'));
  it.push(R(-0.15, 0, 0.3, b, 'concrete'), Ln(-0.6, -0.5, -0.6, b + 0.5, 'equip'), T(-0.6, b + 0.8, 'Coagulant diffuser', { anchor: 'middle', size: 0.7, color: 'var(--dw-equip)' }));
  it.push(Ln(0.6, 0, 0.6, b, 'dash'), Ln(0.6 + L, 0, 0.6 + L, b, 'dash'), T(0.6 + L / 2, b / 2 - 0.08, 'Hydraulic jump', { anchor: 'middle', size: 0.8 }));
  it.push(Ln(-2.6, b / 2, -1.0, b / 2, 'waterline', { arrow: true }), Ln(L + 1.2, b / 2, L + 2.8, b / 2, 'waterline', { arrow: true }));
  it.push(T(-0.1, -t - 0.55, 'Drop weir', { anchor: 'middle', size: 0.7 }));
  it.push(Dm(0.6, -t, 0.6 + L, -t, -1.1, `Lⱼ = ${f2(L)} m`), Dm(L + 3.25, 0, L + 3.25, b, -0.8, `b = ${f2(b)} m`));
  it.push(...cut(-3.6, b * 0.5, L + 3.4, b * 0.5, 'A', (L + 6) / 34));
  return auto('Hydraulic-jump mixer – plan', it);
}

// ================================================================== FLOCCULATION
export function flocPlanV(fl) {
  if (!fl || !fl.enabled || fl.type !== 'vbaffle') return null;
  const it = [], W = fl.W, t = 0.25;
  const Lmax = Math.max(...fl.stages.map((s) => s.L));
  fl.stages.forEach((s, i) => {
    const y0 = (fl.stages.length - 1 - i) * (W + t);
    it.push(R(0, y0, s.L, W, 'water'));
    const pitch = s.L / s.nInt;
    for (let k = 1; k < s.nInt; k++) it.push(R(k * pitch - 0.04, y0, 0.08, W, 'baffle'));
    it.push(Ln(i % 2 === 0 ? 0.5 : s.L - 0.5, y0 + W / 2, i % 2 === 0 ? s.L - 0.5 : 0.5, y0 + W / 2, 'waterline', { arrow: true }));
    it.push(T(Lmax + Lmax / 12, y0 + W / 2 - 0.1, `Stage ${s.i}: ${s.nInt} baffles @ ${f2(s.sp)} m, G ${f0(s.Ga)} s⁻¹`, { size: 0.75 }));
    if (i < fl.stages.length - 1) it.push(R(0, y0 - t, Lmax, t, 'concrete'));
  });
  const Wt = fl.stages.length * W + (fl.stages.length - 1) * t;
  it.push(R(-t, -t, Lmax + 2 * t, t, 'concrete'), R(-t, Wt, Lmax + 2 * t, t, 'concrete'), R(-t, 0, t, Wt, 'concrete'), R(Lmax, 0, t, Wt, 'concrete'));
  it.push(Dm(0, -t, Lmax, -t, -0.9, `${f2(Lmax)} m`), Dm(-t, 0, -t, W, 0.8, `${f2(W)} m`));
  it.push(...cut(-1.6, Wt - W / 2, Lmax + 1.2, Wt - W / 2, 'A', Lmax / 40), ...cut(Lmax * 0.3, -1.4, Lmax * 0.3, Wt + 1.0, 'B', Lmax / 40));
  return auto(`Over-and-under baffled flocculator – plan (1 of ${fl.nT} trains, stages as parallel channels)`, it);
}
export function flocSection(fl) {
  if (!fl || !fl.enabled || fl.type === 'vbaffle') return null;
  const it = [], H = fl.H, t = 0.25, fb = fl.freeboard || 0.5;
  let x = 0;
  const Lt = fl.L + (fl.stages.length - 1) * t;
  it.push(R(-t, -t, Lt + 2 * t, t, 'concrete'), R(-t, 0, t, H + fb, 'concrete'), R(Lt, 0, t, H + fb, 'concrete'));
  it.push(R(0, 0, Lt, H, 'water'), Ln(0, H, Lt, H, 'waterline'));
  fl.stages.forEach((s, i) => {
    if (fl.type === 'hbaffle') {
      const pitch = s.L / s.nInt;
      for (let k = 1; k < s.nInt; k++) it.push(R(x + k * pitch - 0.04, 0, 0.08, H + 0.25, 'baffle'));
      it.push(T(x + s.L / 2, H + fb + 0.5 + (i % 2) * (Lt / 36) * 1.1, `Stage ${s.i}: ${s.nInt} baffles @ ${f2(s.sp)} m`, { anchor: 'middle', size: 0.75, bold: true }));
    } else {
      const nSh = s.nSh || 1, Rw = s.R || H * 0.375;
      for (let k = 0; k < nSh; k++) {
        const cx = x + (s.L * (k + 0.5)) / nSh, cy = H / 2;
        it.push(C(cx, cy, Rw, 'dash'), C(cx, cy, 0.12, 'equipFill'));
        for (const a of [0, Math.PI / 2]) { const ca = Math.cos(a + 0.5), sa = Math.sin(a + 0.5); it.push(Ln(cx - Rw * ca, cy - Rw * sa, cx + Rw * ca, cy + Rw * sa, 'equip')); for (const q of [-1, 1]) it.push(Ln(cx + q * Rw * ca - 0.15 * sa, cy + q * Rw * sa + 0.15 * ca, cx + q * Rw * ca + 0.15 * sa, cy + q * Rw * sa - 0.15 * ca, 'equip'), Ln(cx + q * Rw * 0.7 * ca - 0.15 * sa, cy + q * Rw * 0.7 * sa + 0.15 * ca, cx + q * Rw * 0.7 * ca + 0.15 * sa, cy + q * Rw * 0.7 * sa - 0.15 * ca, 'equip')); }
      }
      it.push(T(x + s.L / 2, H + fb + 0.5 + (i % 2) * (Lt / 36) * 1.1, `Stage ${s.i}: G ${f0(s.Ga)} s⁻¹ · ${f1(s.rpm)} rpm${nSh > 1 ? ` · ${nSh} shafts` : ''}`, { anchor: 'middle', size: 0.75, bold: true }));
    }
    x += s.L;
    if (i < fl.stages.length - 1) { it.push(R(x, fl.type === 'paddle' ? 0.5 : 0, t, fl.type === 'paddle' ? H - 1.0 : H + fb, 'concrete')); x += t; }
  });
  it.push(Lv(Lt * 0.04 + 0.3, H, `WL +${f2(H)}`));
  it.push(Dm(0, -t, Lt, -t, -0.9, `${f2(Lt)} m`), Dm(Lt + t, 0, Lt + t, H, -0.8, `${f2(H)} m`));
  return auto(`${fl.type === 'paddle' ? 'Paddle' : 'Horizontal baffled'} flocculator – longitudinal section A–A`, it);
}
export function flocCross(fl) {
  if (!fl || !fl.enabled) return null;
  const it = [], H = fl.H, W = fl.W, t = 0.25, fb = fl.freeboard || 0.5, n = Math.min(fl.nT, 4);
  const s1 = fl.stages[0];
  for (let k = 0; k < n; k++) {
    const x0 = k * (W + t);
    it.push(R(x0, 0, W, H, 'water'), Ln(x0, H, x0 + W, H, 'waterline'));
    if (fl.type === 'hbaffle') it.push(R(k % 2 ? x0 + s1.gap : x0, 0, W - s1.gap, H + 0.25, 'outline'), T(x0 + W / 2, H / 2, 'Baffle', { anchor: 'middle', size: 0.7 }), Dm(k % 2 ? x0 : x0 + W - s1.gap, H * 0.25, k % 2 ? x0 + s1.gap : x0 + W, H * 0.25, 0.01, f2(s1.gap)));
    else if (fl.type === 'vbaffle') it.push(R(x0, s1.gap, W, H + 0.3 - s1.gap, 'outline'), T(x0 + W / 2, H * 0.6, 'Baffle', { anchor: 'middle', size: 0.7 }), Dm(x0 + W * 0.5, 0, x0 + W * 0.5, s1.gap, 0.01, f2(s1.gap)));
    else {
      const Rw = s1.R || H * 0.375, cy = H / 2;
      it.push(Ln(x0 - 0.1, cy, x0 + W + 0.1, cy, 'equip'));
      for (const q of [-1, 1]) for (const f of [1, 0.7]) it.push(R(x0 + 0.35, cy + q * Rw * f - 0.07, W - 0.7, 0.14, 'equipFill'));
      for (const xx of [x0 + 0.5, x0 + W / 2, x0 + W - 0.5]) it.push(Ln(xx, cy - Rw, xx, cy + Rw, 'equip'));
      if (k === 0) it.push(R(x0 - t - 0.9, cy - 0.35, 0.7, 0.7, 'equipFill'), T(x0 - t - 0.55, cy + 0.6, 'Drive', { anchor: 'middle', size: 0.65 }));
    }
    it.push(T(x0 + W / 2, H + fb + 0.4, `Train ${k + 1}`, { anchor: 'middle', size: 0.8, bold: true }));
    if (k < n - 1) it.push(R(x0 + W, 0, t, H + fb, 'concrete'));
  }
  const Wt = n * W + (n - 1) * t;
  it.push(R(-t, -t, Wt + 2 * t, t, 'concrete'), R(-t, 0, t, H + fb, 'concrete'), R(Wt, 0, t, H + fb, 'concrete'));
  it.push(Dm(0, -t, W, -t, -0.7, `${f2(W)} m`), Dm(Wt + t, 0, Wt + t, H, -0.7, `${f2(H)} m`), Dm(Wt + t, H, Wt + t, H + fb, -0.7, f2(fb)));
  return auto(`Flocculator – cross-section B–B (${fl.nT} trains${fl.nT > 4 ? ', 4 shown' : ''})`, it);
}
function floc3D(fl) {
  if (!fl || !fl.enabled) return null;
  const s = new Scene(), H = fl.H, W = fl.W, t = 0.25, fb = 0.5, n = Math.min(fl.nT, 4);
  const Lt = fl.L + (fl.stages.length - 1) * t;
  const fold = fl.type === 'vbaffle';
  for (let k = 0; k < n; k++) {
    const inner = [];
    if (fold) {
      const Lmax = Math.max(...fl.stages.map((q) => q.L));
      fl.stages.forEach((q, i) => {
        const y0 = i * (W + t);
        const pitch = q.L / q.nInt;
        for (let j = 1; j < q.nInt; j++) inner.push({ x: j * pitch - 0.04, y: y0, z: j % 2 ? 0.6 : 0, w: 0.08, d: W, h: j % 2 ? H + 0.3 - 0.6 : H - 0.5 });
        if (i < fl.stages.length - 1) inner.push({ x: 0, y: y0 + W, z: 0, w: Lmax, d: t, h: H + fb });
      });
      const Wt = fl.stages.length * (W + t) - t;
      s.tank(0, k * (Wt + 2 * t), 0, Lmax + 2 * t, Wt + 2 * t, H + fb + t, { t, wl: H + t, water: 'isoWaterBrown', inner: inner.map((b) => ({ ...b, z: b.z + t })) });
      if (k === 0) s.dimsBox(0, 0, 0, Lmax + 2 * t, Wt + 2 * t, H + fb + t);
    } else {
      let x = 0;
      fl.stages.forEach((q, i) => {
        if (fl.type === 'hbaffle') { const pitch = q.L / q.nInt; for (let j = 1; j < q.nInt; j++) inner.push({ x: x + j * pitch - 0.04, y: j % 2 ? 0 : q.gap, z: t, w: 0.08, d: W - q.gap, h: H + 0.25 }); }
        else { const nSh = q.nSh || 1; for (let j = 0; j < nSh; j++) inner.push({ x: x + (q.L * (j + 0.5)) / nSh - 0.1, y: 0, z: t + H + 0.15, w: 0.2, d: W, h: 0.15, kind: 'equip' }); }
        x += q.L;
        if (i < fl.stages.length - 1) { inner.push({ x, y: 0, z: t, w: t, d: W, h: H + fb }); x += t; }
      });
      s.tank(0, k * (W + 2 * t), 0, Lt + 2 * t, W + 2 * t, H + fb + t, { t, wl: H + t, water: 'isoWaterBrown', inner });
      if (k === 0) s.dimsBox(0, 0, 0, Lt + 2 * t, W + 2 * t, H + fb + t);
    }
  }
  return s.render(`Flocculator – 3D view (${n} train${n > 1 ? 's' : ''}${fl.nT > 4 ? ' of ' + fl.nT : ''})`);
}

// ================================================================== SEDIMENTATION
export function sedCross(sd) {
  if (!sd || !sd.enabled || sd.type === 'circ') return null;
  const it = [], W = sd.W, H = sd.H, sl = sd.inputs.sludgeDepth, t = 0.35, fb = 0.5, N = Math.min(sd.N, 4);
  for (let k = 0; k < N; k++) {
    const x0 = k * (W + t);
    it.push(R(x0, -sl, W, H + sl, 'water'), R(x0, -sl, W, Math.min(0.25, sl), 'sludge'), Ln(x0, H, x0 + W, H, 'waterline'));
    for (let j = 0; j < sd.nL; j++) {
      const lx = x0 + (W * (j + 1)) / (sd.nL + 1), lw = sd.inputs.launderWidth, ld = sd.launderDepth;
      it.push(R(lx - lw / 2, H - ld + 0.08, lw, ld, 'equipFill'));
    }
    if (sd.type === 'tube') { const zt = H - 0.7, zb = zt - 0.87; it.push(R(x0 + 0.1, zb, W - 0.2, zt - zb, 'outline')); for (let xx = x0 + 0.3; xx < x0 + W - 0.2; xx += 0.35) it.push(Ln(xx, zb, xx, zt, 'thin')); }
    it.push(Ln(x0 + 0.2, -sl + 0.3, x0 + W - 0.2, -sl + 0.3, 'equip'), Ln(x0 + W * 0.25, -sl + 0.3, x0 + W * 0.25, -sl + 0.05, 'equip'), Ln(x0 + W * 0.75, -sl + 0.3, x0 + W * 0.75, -sl + 0.05, 'equip'));
    it.push(T(x0 + W / 2, H * (sd.type === 'tube' ? 0.3 : 0.5), `Tank ${k + 1}`, { anchor: 'middle', size: 0.9, bold: true }));
    if (k < N - 1) it.push(R(x0 + W, -sl - t, t, H + sl + fb + t, 'concrete'));
  }
  const Wt = N * W + (N - 1) * t;
  it.push(R(-t, -sl - t, Wt + 2 * t, t, 'concrete'), R(-t, -sl, t, H + sl + fb, 'concrete'), R(Wt, -sl, t, H + sl + fb, 'concrete'));
  it.push(R(-t - 1.0, H + fb - 0.15, Wt + 2 * t + 2.0, 0.15, 'outline'));
  it.push(T(W / 2, H + fb + 1.3, `${sd.nL} V-notch launders per tank`, { anchor: 'middle', size: 0.75 }), T(W / 2, -sl + 0.55, 'Scraper flights', { anchor: 'middle', size: 0.7 }));
  it.push(Lv(W * 0.3, H, `WL +${f2(H)}`));
  it.push(Dm(0, -sl - t, W, -sl - t, -0.9, `W = ${f2(W)} m`), Dm(Wt + t, -sl, Wt + t, H, -0.9, `${f2(H + sl)} m`), Dm(Wt + t, H, Wt + t, H + fb, -0.9, f2(fb)));
  return auto(`Sedimentation tanks – cross-section B–B (${sd.N} tanks${sd.N > 4 ? ', 4 shown' : ''})`, it);
}
export function clarifierSection(sd) {
  if (!sd || !sd.enabled || sd.type !== 'circ') return null;
  const it = [], r = sd.D / 2, H = sd.H, t = 0.35, fb = 0.5, slope = r / 12, cw = sd.centerWell / 2;
  it.push(Pg([[-r, H], [-r, 0], [-1, -slope], [-1, -slope - 1], [1, -slope - 1], [1, -slope], [r, 0], [r, H]], 'water'));
  it.push(Pg([[-r - t, H + fb], [-r - t, -t], [-1 - t, -slope - t], [-1 - t, -slope - 1 - t], [1 + t, -slope - 1 - t], [1 + t, -slope - t], [r + t, -t], [r + t, H + fb], [r, H + fb], [r, 0], [1, -slope], [1, -slope - 1], [-1, -slope - 1], [-1, -slope], [-r, 0], [-r, H + fb]], 'concrete'));
  it.push(Ln(-r, H, r, H, 'waterline'));
  it.push(R(-cw, H * 0.45, 0.08, H * 0.55 + 0.2, 'baffle'), R(cw - 0.08, H * 0.45, 0.08, H * 0.55 + 0.2, 'baffle'), T(0, H * 0.7, 'Feed well', { anchor: 'middle', size: 0.7 }));
  it.push(Ln(0, -slope - 1, 0, H * 0.75, 'pipe'), Ln(-r - 3, -slope - 1.6, 0, -slope - 1.6, 'pipe'), Ln(0, -slope - 1.6, 0, -slope - 1, 'pipe'), T(-r - 3, -slope - 1.2, 'Inlet', { size: 0.75 }));
  for (const q of [-1, 1]) it.push(R(q > 0 ? r - 0.6 : -r + 0.1, H - 0.45, 0.5, 0.5, 'equipFill'));
  it.push(R(-r - t, H + fb + 0.25, 2 * (r + t), 0.25, 'outline'), R(-0.4, H + fb + 0.5, 0.8, 0.7, 'equipFill'), T(0, H + fb + 1.6, 'Bridge & scraper drive', { anchor: 'middle', size: 0.75 }));
  it.push(Ln(-r + 0.3, 0.12, -1.2, -slope + 0.12, 'equip'), Ln(r - 0.3, 0.12, 1.2, -slope + 0.12, 'equip'));
  it.push(Ln(1, -slope - 0.8, r + 3, -slope - 0.8, 'equip', { arrow: true }), T(r + 0.6, -slope - 0.45, 'Sludge draw-off', { size: 0.7 }));
  it.push(Lv(-r * 0.6, H, `WL +${f2(H)}`));
  it.push(Dm(-r, -slope - 1 - t, r, -slope - 1 - t, -1.2, `Ø ${f2(sd.D)} m`), Dm(r + t, 0, r + t, H, -0.9, `SWD ${f2(H)} m`));
  return auto('Circular clarifier – section A–A', it);
}
function sed3D(sd) {
  if (!sd || !sd.enabled) return null;
  const s = new Scene(), t = 0.35, fb = 0.5;
  if (sd.type === 'circ') {
    const n = Math.min(sd.N, 4), r = sd.D / 2 + t;
    for (let k = 0; k < n; k++) { s.cyl(k * (sd.D + 3), 0, 0, r, sd.H + fb, { wl: sd.H, t, water: 'isoWaterMid' }); s.box(k * (sd.D + 3) - r, -0.4, sd.H + fb, 2 * r, 0.8, 0.25, 'equip'); }
    s.dim([-r, -r, 0], [r, -r, 0], [0, -2, 0], `Ø ${f2(sd.D)} m`); s.dim([r, -r, 0], [r, -r, sd.H + fb], [1.5, -1.5, 0]);
    return s.render(`Circular clarifiers – 3D view (${n}${sd.N > n ? ' of ' + sd.N : ''})`);
  }
  const n = Math.min(sd.N, 4), H = sd.H + sd.inputs.sludgeDepth;
  for (let k = 0; k < n; k++) {
    const inner = [{ x: 1.5, y: 0, z: 0.5, w: 0.15, d: sd.W, h: H + 0.2 }];
    for (let j = 0; j < sd.nL; j++) inner.push({ x: sd.L - sd.Llaund, y: (sd.W * (j + 1)) / (sd.nL + 1) - sd.inputs.launderWidth / 2, z: H - sd.launderDepth + 0.3, w: sd.Llaund, d: sd.inputs.launderWidth, h: sd.launderDepth + 0.1, kind: 'equip' });
    s.tank(0, k * (sd.W + 2 * t), 0, sd.L + 2 * t, sd.W + 2 * t, H + fb + t, { t, wl: H + t, water: 'isoWaterMid', inner: inner.map((b) => ({ ...b, z: b.z + t })) });
  }
  s.tank(-2.1, 0, H * 0.4, 2.1, n * (sd.W + 2 * t), H * 0.6 + fb + t, { t: 0.3, wl: H * 0.6 + t, water: 'isoWaterBrown' });
  s.dim([0, 0, 0], [sd.L + 2 * t, 0, 0], [0, -3, 0], `L ${f2(sd.L)} m (internal)`); s.dim([-2.1, 0, 0], [-2.1, sd.W + 2 * t, 0], [-3, 0, 0], `W ${f2(sd.W)} m per tank`); s.dim([sd.L + 2 * t, 0, 0], [sd.L + 2 * t, 0, H + fb + t], [2, -2, 0]);
  if (n > 1) s.dim([sd.L + 2 * t, 0, 0], [sd.L + 2 * t, n * (sd.W + 2 * t), 0], [3.5, 0, 0], `${n} tanks – ${f2(n * (sd.W + 2 * t))} m`);
  return s.render(`Sedimentation tanks – 3D view (${n}${sd.N > n ? ' of ' + sd.N : ''} tanks)`);
}

// ================================================================== DAF / ROUGHING FILTERS
export function dafPlan(sd) {
  if (!sd || sd.type !== 'daf') return null;
  const it = [], t = 0.3, N = Math.min(sd.N, 6), W = sd.W, L = sd.L, Lc = sd.Lc;
  for (let k = 0; k < N; k++) {
    const y0 = k * (W + t);
    it.push(R(0, y0, Lc, W, 'process'), R(Lc + 0.2, y0, L - Lc - 0.2, W, 'water'), R(Lc, y0, 0.2, W, 'baffle'));
    it.push(R(L - 0.5, y0 + 0.2, 0.5, W - 0.4, 'equipFill'), R(Lc + 0.6, y0 + 0.15, 0.25, W - 0.3, 'equip'));
    it.push(Ln(-2.2, y0 + W / 2, -t, y0 + W / 2, 'pipe', { arrow: true }), Ln(Lc + 1.2, y0 + W / 2, L - 1, y0 + W / 2, 'waterline', { arrow: true }));
    it.push(T(Lc + (L - Lc) / 2, y0 + W * 0.72, `DAF ${k + 1}`, { anchor: 'middle', bold: true, size: 0.9 }));
    if (k < N - 1) it.push(R(-t, y0 + W, L + 2 * t, t, 'concrete'));
  }
  const Wt = N * W + (N - 1) * t;
  it.push(R(-t, -t, L + 2 * t, t, 'concrete'), R(-t, Wt, L + 2 * t, t, 'concrete'), R(-t, 0, t, Wt, 'concrete'), R(L, 0, t, Wt, 'concrete'));
  it.push(R(L + t, 0, 1.2, Wt, 'outline'), T(L + t + 0.6, Wt + 0.6, 'Float (sludge) channel', { anchor: 'middle', size: 0.7 }));
  it.push(T(Lc / 2, Wt + 0.6, 'Contact zone', { anchor: 'middle', size: 0.7 }), T(Lc + 0.7, -t - 0.7, 'Travelling float skimmer', { size: 0.7 }));
  it.push(Ln(-2.2, -t - 1.6, Lc / 2, -t - 1.6, 'equip'), Ln(Lc / 2, -t - 1.6, Lc / 2, 0.3, 'equip', { arrow: true }), T(-2.2, -t - 1.3, `Saturated recycle ${f0(sd.Qr)} m³/h at ${sd.inputs.dafPressure} kPa`, { size: 0.7, color: 'var(--dw-equip)' }));
  it.push(Dm(0, Wt + t, L, Wt + t, 1.6, `${f2(L)} m (contact ${f2(Lc)} + separation ${f2(sd.Ls)})`), Dm(L + t + 1.2, 0, L + t + 1.2, W, -1.0, `W = ${f2(W)} m`));
  it.push(...cut(-3, W * 0.3, L + t + 2.4, W * 0.3, 'A', L / 30));
  return auto(`Dissolved air flotation – plan (${sd.N} units${sd.N > N ? ', ' + N + ' shown' : ''})`, it);
}
export function dafSection(sd) {
  if (!sd || sd.type !== 'daf') return null;
  const it = [], t = 0.3, L = sd.L, Lc = sd.Lc, H = sd.H, fb = 0.5;
  it.push(R(-t, -t, L + 2 * t + 1.2, t, 'concrete'), R(-t, 0, t, H + fb, 'concrete'), R(L, 0, t, H - 0.05, 'concrete'), R(L + t + 1.2, -t, t, H + fb + t, 'concrete'));
  it.push(R(0, 0, L, H, 'water'), R(0, H - 0.06, L, 0.06, 'sludge'), Ln(0, H, L, H, 'waterline'));
  it.push(Pg([[Lc, 0], [Lc + 0.2, 0], [Lc + 0.2 + H * 0.25, H * 0.72], [Lc + H * 0.25, H * 0.72]], 'baffle'));
  it.push(R(L - 0.7, 0.5, 0.15, H - 0.5 + 0.2, 'baffle'), Ln(L - 0.45, 0.25, L - 0.45, H - 0.25, 'waterline', { arrow: true }), R(L - 0.55, H - 0.3, 0.55, 0.05, 'outline'));
  for (let i = 0; i < 14; i++) it.push(C(Lc * 0.5 + (i % 3) * 0.12 - 0.1 + (i > 6 ? Lc * 0.6 + i * 0.25 : 0), 0.25 + (i * H * 0.62) / 14, 0.035, 'thin'));
  it.push(Ln(-2.4, 0.35, Lc * 0.5, 0.35, 'equip', { arrow: true }), T(-2.4, 0.6, 'Saturated recycle (nozzles)', { size: 0.7, color: 'var(--dw-equip)' }));
  it.push(Ln(-2.4, H * 0.6, -t, H * 0.6, 'pipe', { arrow: true }), T(-2.4, H * 0.6 + 0.25, 'Flocculated water', { size: 0.7 }));
  it.push(R(Lc + 0.8, H + 0.12, 1.4, 0.25, 'equipFill'), Ln(Lc + 1.0, H + 0.12, Lc + 1.0, H - 0.05, 'equip'), Ln(Lc + 2.0, H + 0.12, Lc + 2.0, H - 0.05, 'equip'), T(Lc + 1.5, H + 0.6, 'Skimmer →', { anchor: 'middle', size: 0.7 }));
  it.push(T(L + t + 0.6, H * 0.5, 'Float', { anchor: 'middle', size: 0.65, rot: 90 }), T(Lc / 2, H + fb + 0.25, 'Contact zone', { anchor: 'middle', size: 0.7 }), T(Lc + (L - Lc) / 2, H * 0.45, 'Separation zone – clarified water drawn from the bottom', { anchor: 'middle', size: 0.7 }));
  it.push(Lv(L * 0.55, H, `WL +${f2(H)}`));
  it.push(Dm(0, -t, Lc, -t, -0.6, f2(Lc)), Dm(Lc, -t, L, -t, -0.6, `${f2(L - Lc)} m`), Dm(-t, 0, -t, H, 0.8, `${f2(H)} m`));
  return auto('Dissolved air flotation – longitudinal section A–A', it);
}
function daf3D(sd) {
  if (!sd || sd.type !== 'daf') return null;
  const s = new Scene(), t = 0.3, n = Math.min(sd.N, 6), H = sd.H + 0.5 + t;
  for (let k = 0; k < n; k++) s.tank(0, k * (sd.W + 2 * t), 0, sd.L + 2 * t, sd.W + 2 * t, H, { t, wl: sd.H + t, water: 'isoSludge', inner: [{ x: sd.Lc, y: 0, z: t, w: 0.2, d: sd.W, h: sd.H + 0.3 }, { x: sd.Lc + 0.8, y: 0, z: sd.H + t + 0.1, w: 1.4, d: sd.W, h: 0.3, kind: 'equip' }] });
  s.dimsBox(0, 0, 0, sd.L + 2 * t, sd.W + 2 * t, H);
  if (n > 1) s.dim([sd.L + 2 * t, 0, 0], [sd.L + 2 * t, n * (sd.W + 2 * t), 0], [2.5, 0, 0], `${n} units – ${f2(n * (sd.W + 2 * t))} m`);
  return s.render(`Dissolved air flotation – 3D view (${n}${sd.N > n ? ' of ' + sd.N : ''} units, float layer on the surface)`);
}
export function hrfPlan(sd) {
  if (!sd || sd.type !== 'hrf') return null;
  const it = [], t = 0.25, N = Math.min(sd.N, 6), W = sd.W, L = sd.L, cls = ['gravel', 'sand', 'soil'];
  for (let k = 0; k < N; k++) {
    const y0 = k * (W + t);
    let x = 0.8;
    it.push(R(0, y0, 0.8, W, 'water'), R(L - 0.8, y0, 0.8, W, 'water'));
    sd.comps.forEach((c, i) => { it.push(R(x, y0, c, W, 'gravel')); x += c; if (i < sd.comps.length - 1) { it.push(R(x, y0, 0.2, W, 'baffle')); x += 0.2; } });
    it.push(Ln(-1.8, y0 + W / 2, -t, y0 + W / 2, 'pipe', { arrow: true }), Ln(L + t, y0 + W / 2, L + 1.8, y0 + W / 2, 'pipe', { arrow: true }));
    if (k < N - 1) it.push(R(-t, y0 + W, L + 2 * t, t, 'concrete'));
  }
  void cls;
  const Wt = N * W + (N - 1) * t;
  it.push(R(-t, -t, L + 2 * t, t, 'concrete'), R(-t, Wt, L + 2 * t, t, 'concrete'), R(-t, 0, t, Wt, 'concrete'), R(L, 0, t, Wt, 'concrete'));
  it.push(T(0.4, Wt + 0.6, 'Inlet', { anchor: 'middle', size: 0.7 }), T(L - 0.4, Wt + 0.6, 'Outlet weir', { anchor: 'middle', size: 0.7 }));
  it.push(Dm(0, -t, L, -t, -0.9, `${f2(L)} m (filter ${f2(sd.Lf)} m)`), Dm(L + t, 0, L + t, W, -2.4, `W = ${f2(W)} m`));
  it.push(...cut(-2.6, W * 0.25, L + 2.4, W * 0.25, 'A', L / 30));
  return auto(`Horizontal-flow roughing filters – plan (${sd.N} units${sd.N > N ? ', ' + N + ' shown' : ''})`, it);
}
export function hrfSection(sd) {
  if (!sd || sd.type !== 'hrf') return null;
  const it = [], t = 0.25, L = sd.L, H = sd.H, wl = H - 0.1;
  it.push(R(-t, -t, L + 2 * t, t, 'concrete'), R(-t, 0, t, H + 0.4, 'concrete'), R(L, 0, t, H + 0.4, 'concrete'));
  it.push(R(0, 0, 0.8, wl, 'water'), R(L - 0.8, 0, 0.8, H - 0.35, 'water'));
  let x = 0.8;
  sd.comps.forEach((c, i) => {
    it.push(R(x, 0, c, H, 'gravel'), R(x, 0, c, wl, 'water'), C(x + 0.3, 0.12, 0.08, 'pipeFill'));
    it.push(T(x + c / 2, H + 0.25, `${sd.media[i]} mm · ${f1(c)} m`, { anchor: 'middle', size: 0.7, bold: true }));
    x += c;
    if (i < sd.comps.length - 1) { it.push(R(x, 0, 0.2, H + 0.2, 'outline')); for (let z = 0.15; z < H; z += 0.25) it.push(Ln(x, z, x + 0.2, z, 'thin')); x += 0.2; }
  });
  it.push(Ln(0, wl, L - 0.8, wl - 0.2, 'waterline'), R(L - 0.8, 0, 0.08, H - 0.35, 'baffle'));
  it.push(Ln(-1.8, wl - 0.2, 0.2, wl - 0.2, 'pipe', { arrow: true }), Ln(L - 0.3, H - 0.6, L + 1.8, H - 0.6, 'pipe', { arrow: true }));
  it.push(T(L / 2, -t - 0.45, 'Perforated drain at the inlet of each compartment (60–90 m/h)', { anchor: 'middle', size: 0.65 }), T(L, H + 0.7, 'Outlet weir 0.3–0.4 m below the media top', { anchor: 'end', size: 0.65 }));
  it.push(T(L / 2, -t - 0.9, 'Water level is kept below the media surface', { anchor: 'middle', size: 0.65 }));
  it.push(Dm(0, -t, L, -t, -1.6, `${f2(L)} m`), Dm(L + t, 0, L + t, H, -2.2, `${f2(H)} m`));
  return auto('Horizontal-flow roughing filter – longitudinal section A–A', it);
}
function hrf3D(sd) {
  if (!sd || sd.type !== 'hrf') return null;
  const s = new Scene(), t = 0.25, n = Math.min(sd.N, 6), H = sd.H + 0.4 + t;
  for (let k = 0; k < n; k++) {
    const inner = []; let x = 0.8;
    sd.comps.forEach((c, i) => { inner.push({ x, y: 0, z: t, w: c, d: sd.W, h: sd.H, kind: i === 0 ? 'sludge' : 'sand' }); x += c; if (i < sd.comps.length - 1) { inner.push({ x, y: 0, z: t, w: 0.2, d: sd.W, h: sd.H + 0.2 }); x += 0.2; } });
    s.tank(0, k * (sd.W + 2 * t), 0, sd.L + 2 * t, sd.W + 2 * t, H, { t, wl: sd.H * 0.6 + t, inner });
  }
  s.dimsBox(0, 0, 0, sd.L + 2 * t, sd.W + 2 * t, H);
  if (n > 1) s.dim([sd.L + 2 * t, 0, 0], [sd.L + 2 * t, n * (sd.W + 2 * t), 0], [2.5, 0, 0], `${n} units – ${f2(n * (sd.W + 2 * t))} m`);
  return s.render(`Roughing filters – 3D view (${n}${sd.N > n ? ' of ' + sd.N : ''} units, three gravel compartments)`);
}

// ================================================================== FILTERS
export function filterLong(fi, hyd) {
  if (!fi || fi.type === 'ssf') return null;
  const it = [], Lb = fi.Lb, t = 0.3;
  const ud = fi.inputs.underdrainDepth, gr = fi.gravelD, md = fi.Ltot, wd = fi.inputs.waterDepth, fb = fi.inputs.freeboard;
  const zSand = hyd?.sandTop ?? (ud + gr + md), base = zSand - md - gr - ud;
  const wtop = hyd?.filterMax ?? (zSand + wd), top = wtop + fb;
  it.push(R(-t, base - t, t, top - base + t, 'concrete'), R(Lb, base - t, t, top - base + t, 'concrete'), R(-t, base - t, Lb + 2 * t + 4.5, t, 'concrete'));
  it.push(R(0, base, Lb, ud, 'water'), R(0.1, base + ud * 0.2, Lb - 0.2, Math.min(ud * 0.6, fi.manDia / 1000), 'pipeFill'));
  it.push(R(0, base + ud, Lb, gr, 'gravel'));
  let y = base + ud + gr;
  if (fi.type === 'dual') { it.push(R(0, y, Lb, fi.sandL, 'sand')); y += fi.sandL; it.push(R(0, y, Lb, fi.inputs.anthDepth, 'anth')); y += fi.inputs.anthDepth; } else { it.push(R(0, y, Lb, md, 'sand')); y += md; }
  it.push(R(0, y, Lb, wtop - y, 'water'), Ln(0, wtop, Lb, wtop, 'waterline'));
  const lip = y + fi.lipAbove, tw = fi.inputs.troughWidth, sp = Lb / fi.nTr;
  for (let k = 0; k < fi.nTr; k++) { const cx = sp * (k + 0.5); it.push(Pg([[cx - tw / 2, lip], [cx - tw / 2, lip - fi.trDepth], [cx + tw / 2, lip - fi.trDepth], [cx + tw / 2, lip]], 'equip', false)); }
  it.push(Dm(sp * 0.5, lip, sp * 1.5, lip, 0.35, `${f2(sp)} c/c`));
  it.push(T(Lb / 2, top + 0.45, `${fi.nTr} wash troughs · lip ${f2(fi.lipAbove)} m above media`, { anchor: 'middle', size: 0.72 }));
  // pipe gallery
  const gx = Lb + t, gw = 4.2;
  it.push(R(gx + gw, base - t, t, top - base + t + 0.3, 'concrete'), R(gx - t, top, gw + 2 * t, 0.25, 'concrete'));
  const pp = fi.pipes || [];
  const slots = [[gx + 1.0, base + 0.6], [gx + 2.7, base + 0.75], [gx + 1.1, base + 1.9], [gx + 2.9, wtop - 0.5]];
  const order = [1, 3, 2, 0]; // filtered, waste, wash, influent
  order.forEach((pi, k) => { const p = pp[pi]; if (!p) return; const [cx, cy] = slots[k]; const rr = p.dn / 2000; it.push(C(cx, cy, rr, 'pipeFill'), T(cx, cy - 0.07, `${k + 1}`, { anchor: 'middle', size: 0.6, bold: true, color: '#fff' }), T(gx + gw + t + 0.3, top - 0.5 - k * 0.5, `${k + 1}  ${p.label.split(' (')[0]} DN${p.dn}`, { size: 0.7 })); });
  it.push(T(gx + gw / 2, top + 0.75, 'Pipe gallery / operating floor', { anchor: 'middle', size: 0.75, bold: true }));
  it.push(Lv(Lb * 0.06, wtop, `Max WL ${f2(wtop)}`), Lv(Lb * 0.55, zSand, `Media ${f2(zSand)}`));
  it.push(T(-t - 0.25, base + ud / 2, 'Underdrain', { anchor: 'end', size: 0.7 }), T(-t - 0.25, base + ud + gr / 2, 'Gravel', { anchor: 'end', size: 0.7 }), T(-t - 0.25, base + ud + gr + md / 2, 'Media', { anchor: 'end', size: 0.7 }));
  it.push(Dm(0, base - t, Lb, base - t, -0.8, `${f2(Lb)} m`), Dm(gx, base - t, gx + gw, base - t, -0.8, `${f2(gw)} m`), Dm(-t, base, -t, top, 1.9, `${f2(top - base)} m`));
  return auto('Rapid gravity filter – longitudinal section B–B (bed and pipe gallery)', it, { scaleNote: 'levels in m MSL' });
}
export function filterBatteryPlan(fi) {
  if (!fi || fi.type === 'ssf') return null;
  const it = [], t = 0.3, rows = fi.footprint?.rows || 1, perRow = Math.ceil(fi.N / rows), bw = fi.footprint?.boxW || fi.B, Lb = fi.Lb, gal = 4.2;
  const gw = fi.beds === 2 ? fi.inputs.gulletW : 0;
  let nF = 0;
  for (let rI = 0; rI < rows; rI++) {
    const y0 = rI === 0 ? 0 : Lb + 2 * t + gal;
    for (let k = 0; k < perRow && nF < fi.N; k++) {
      const x0 = k * (bw + t);
      for (let b = 0; b < fi.beds; b++) { const bx = x0 + b * (fi.B + gw); it.push(R(bx, y0, fi.B, Lb, 'sand')); const sp = Lb / fi.nTr; for (let q = 0; q < fi.nTr; q++) it.push(R(bx + 0.15, y0 + sp * (q + 0.5) - fi.inputs.troughWidth / 2, fi.B - 0.3, fi.inputs.troughWidth, 'equipFill')); }
      if (fi.beds === 2) it.push(R(x0 + fi.B, y0, gw, Lb, 'water'));
      it.push(T(x0 + bw / 2, y0 + Lb / 2, `F${++nF}`, { anchor: 'middle', bold: true, size: 1.2 }));
      if (k < perRow - 1) it.push(R(x0 + bw, y0, t, Lb, 'concrete'));
    }
    const Wr = perRow * bw + (perRow - 1) * t;
    it.push(R(-t, y0 - t, Wr + 2 * t, t, 'concrete'), R(-t, y0 + Lb, Wr + 2 * t, t, 'concrete'), R(-t, y0, t, Lb, 'concrete'), R(Wr, y0, t, Lb, 'concrete'));
  }
  const Wr = perRow * bw + (perRow - 1) * t;
  const gy = Lb + t, pp = fi.pipes || [];
  it.push(R(-t, gy, Wr + 2 * t, gal, 'outline'));
  const lines = [[0, 0.82, 'pipe'], [1, 0.6, 'pipe'], [2, 0.38, 'equip'], [3, 0.16, 'dash']];
  for (const [pi, f, cls] of lines) { const p = pp[pi]; if (!p) continue; const yy = gy + gal * f; it.push(Ln(-t - 2.5, yy, Wr + t, yy, cls), T(-t - 2.7, yy - 0.1, `${p.label.split(' (')[0]} DN${p.dn}`, { anchor: 'end', size: 0.65 })); }
  it.push(T(Wr / 2, gy + gal + (rows > 1 ? Lb + 2 * t : 0) + 1.0, `Pipe gallery ${f1(gal)} m wide between the filter rows · operating floor over`, { anchor: 'middle', size: 0.8 }));
  it.push(Dm(0, -t, bw, -t, -0.9, `${f2(bw)} m`), Dm(-t, -t, Wr + t, -t, -2.0, `${f2(Wr + 2 * t)} m overall`), Dm(Wr + t, 0, Wr + t, Lb, -0.9, `${f2(Lb)} m`));
  it.push(...cut(bw * 0.25, -1.4 - t, bw * 0.25, Lb + gal * 0.9, 'B', Wr / 36), ...cut(-t - 1.2, Lb * 0.3, bw + t + 0.6, Lb * 0.3, 'A', Wr / 36));
  return auto(`Rapid gravity filters – general plan (${fi.N} filters, ${rows} row${rows > 1 ? 's' : ''})`, it);
}
export function ssfSection(fi, hyd) {
  if (!fi || fi.type !== 'ssf') return null;
  const it = [], B = fi.B, t = 0.3, d = fi.inputs;
  const zS = hyd?.sandTop ?? 1.6, sand = d.ssfDepth, grv = 0.3, ud = 0.3, base = zS - sand - grv - ud, wl = hyd?.filterMax ?? zS + d.ssfSupernatant, top = wl + 0.3;
  it.push(R(-t, base - t, B + 2 * t, t, 'concrete'), R(-t, base, t, top - base, 'concrete'), R(B, base, t, top - base, 'concrete'));
  it.push(R(0, base, B, ud, 'water'), R(0, base + ud, B, grv, 'gravel'), R(0, base + ud + grv, B, sand, 'sand'), R(0, zS, B, wl - zS, 'water'), Ln(0, wl, B, wl, 'waterline'));
  for (let x = 0.5; x < B; x += 1.0) it.push(C(x, base + ud * 0.5, 0.06, 'pipeFill'));
  it.push(Ln(0, zS - (d.ssfDepth - d.ssfMinDepth), B, zS - (d.ssfDepth - d.ssfMinDepth), 'dash'), T(-t - 0.2, zS - (d.ssfDepth - d.ssfMinDepth) - 0.05, `Minimum bed ${f2(d.ssfMinDepth)} m (re-sand)`, { size: 0.7, anchor: 'end' }));
  it.push(T(B + t + 0.2, zS + (wl - zS) / 2, `Supernatant ${f2(d.ssfSupernatant)} m`, { size: 0.75 }), T(B + t + 0.2, base + ud + grv + sand * 0.7, `Sand ${f2(sand)} m (ES ${f2(d.ssfES)} mm, UC ${f1(d.ssfUC)})`, { size: 0.75 }), T(B + t + 0.2, base + ud + grv / 2, 'Graded gravel 0.30 m', { size: 0.75 }), T(B + t + 0.2, base + ud / 2 - 0.05, 'Underdrains', { size: 0.75 }));
  it.push(Lv(B * 0.1, wl, `WL ${f2(wl)}`), Lv(B * 0.55, zS, `Sand ${f2(zS)}`));
  it.push(Dm(0, base - t, B, base - t, -0.8, `${f2(B)} m`), Dm(-t, base, -t, top, 0.9, `${f2(top - base)} m`));
  return auto('Slow sand filter – cross-section A–A (one bed)', it, { scaleNote: 'levels in m MSL' });
}
function filter3D(fi) {
  if (!fi) return null;
  const s = new Scene(), t = 0.3;
  if (fi.type === 'ssf') {
    const n = Math.min(fi.N, 6), H = 2.6;
    for (let k = 0; k < n; k++) s.tank(k * (fi.B + 2 * t), 0, 0, fi.B + 2 * t, fi.Lb + 2 * t, H, { t, wl: H - 0.4, water: 'isoWater' });
    s.dimsBox(0, 0, 0, fi.B + 2 * t, fi.Lb + 2 * t, H); s.dim([0, 0, 0], [n * (fi.B + 2 * t), 0, 0], [0, -4, 0], `${n} beds – ${f2(n * (fi.B + 2 * t))} m`);
    return s.render(`Slow sand filters – 3D view (${n}${fi.N > n ? ' of ' + fi.N : ''} beds)`);
  }
  const rows = fi.footprint?.rows || 1, perRow = Math.ceil(fi.N / rows), bw = fi.footprint?.boxW || fi.B, Lb = fi.Lb, gal = 4.2, H = fi.boxDepth || 3.7, gw = fi.beds === 2 ? fi.inputs.gulletW : 0;
  let nF = 0;
  const Wr = perRow * (bw + 2 * t);
  for (let rI = rows - 1; rI >= 0; rI--) {
    const y0 = rI === 0 ? 0 : Lb + 2 * t + gal;
    for (let k = 0; k < perRow && nF < fi.N; k++, nF++) {
      const inner = [];
      const sp = Lb / fi.nTr;
      for (let b = 0; b < fi.beds; b++) for (let q = 0; q < fi.nTr; q++) inner.push({ x: b * (fi.B + gw) + 0.15, y: sp * (q + 0.5) - fi.inputs.troughWidth / 2, z: H - 1.3, w: fi.B - 0.3, d: fi.inputs.troughWidth, h: 0.5, kind: 'equip' });
      if (fi.beds === 2) inner.push({ x: fi.B, y: 0, z: 0, w: 0.12, d: Lb, h: H - 0.6 }, { x: fi.B + gw - 0.12, y: 0, z: 0, w: 0.12, d: Lb, h: H - 0.6 });
      s.tank(k * (bw + 2 * t), y0, 0, bw + 2 * t, Lb + 2 * t, H, { t, wl: H - 1.0, inner });
    }
  }
  if (rows > 1) s.box(0, Lb + 2 * t, 0, Wr, gal, H + 0.2, 'concrete');
  else s.box(0, Lb + 2 * t, 0, Wr, gal, H + 0.2, 'concrete');
  s.building(Wr * 0.3, Lb + 2 * t + 0.3, H + 0.2, Wr * 0.4, gal - 0.6, 3);
  s.dim([0, 0, 0], [bw + 2 * t, 0, 0], [0, -1.5, 0], `Filter ${f2(bw)} m`); s.dim([0, 0, 0], [Wr, 0, 0], [0, -3.5, 0], `${perRow} filters – ${f2(Wr)} m`); s.dim([0, 0, 0], [0, Lb + 2 * t, 0], [-2, 0, 0], `Bed ${f2(Lb)} m`); s.dim([0, Lb + 2 * t, 0], [0, Lb + 2 * t + gal, 0], [-2, 0, 0], `Gallery ${f1(gal)} m`); s.dim([Wr, 0, 0], [Wr, 0, H], [1.5, -1.5, 0], `Box ${f2(H)} m`);
  return s.render(`Rapid gravity filters – 3D view (${fi.N} filters with pipe gallery and control room)`);
}

// ================================================================== CONTACT TANK / CWR
export function contactSection(dis) {
  if (!dis || !dis.footprint) return null;
  const it = [], n = dis.nPasses, w = dis.inputs.chanWidth, dep = dis.inputs.depth, t = 0.2, fb = (dis.depthTot || dep + 0.5) - dep;
  for (let k = 0; k < n; k++) {
    const x0 = k * (w + t);
    it.push(R(x0, 0, w, dep, 'water'), Ln(x0, dep, x0 + w, dep, 'waterline'));
    it.push(T(x0 + w / 2, dep / 2, k % 2 ? '⊗' : '⊙', { anchor: 'middle', size: 1.1 }));
    if (k < n - 1) it.push(R(x0 + w, 0, t, dep + fb * 0.6, 'concrete'));
  }
  const Wt = n * w + (n - 1) * t;
  it.push(R(-0.3, -0.3, Wt + 0.6, 0.3, 'concrete'), R(-0.3, 0, 0.3, dep + fb, 'concrete'), R(Wt, 0, 0.3, dep + fb, 'concrete'));
  it.push(Lv(w * 0.1, dep, `WL +${f2(dep)}`));
  it.push(T(Wt / 2, dep + fb + 0.5, '⊙ flow towards viewer · ⊗ flow away (serpentine passes)', { anchor: 'middle', size: 0.72 }));
  it.push(Dm(0, -0.3, w, -0.3, -0.7, `${f2(w)} m`), Dm(Wt + 0.3, 0, Wt + 0.3, dep, -0.8, `${f2(dep)} m`), Dm(0, -0.3, Wt, -0.3, -1.7, `${f2(Wt)} m`));
  return auto(`Chlorine contact tank – cross-section B–B (${n} passes)`, it);
}
export function contactLong(dis) {
  if (!dis || !dis.footprint) return null;
  const it = [], L = dis.L, dep = dis.inputs.depth, fb = (dis.depthTot || dep + 0.5) - dep;
  it.push(R(-0.3, -0.3, L + 0.6, 0.3, 'concrete'), R(-0.3, 0, 0.3, dep + fb, 'concrete'), R(L, 0, 0.3, dep + fb, 'concrete'));
  it.push(R(0, 0, L, dep, 'water'), Ln(0, dep, L, dep, 'waterline'));
  it.push(Ln(-2.5, dep + 0.25, 0.5, dep + 0.25, 'pipe', { arrow: true }), T(-2.5, dep + 0.6, 'From filters', { size: 0.75 }));
  it.push(Ln(0.9, dep + fb + 0.9, 0.9, dep - 0.3, 'equip', { arrow: true }), T(1.2, dep + fb + 0.7, 'Chlorine solution (diffuser at inlet)', { size: 0.72, color: 'var(--dw-equip)' }));
  it.push(R(L - 0.9, 0, 0.15, dep - 0.12, 'concrete'), T(L - 0.9, dep + fb + 0.4, 'Outlet weir → CWR', { anchor: 'end', size: 0.72 }));
  it.push(Ln(1.5, dep / 2, L - 2, dep / 2, 'waterline', { arrow: true }));
  it.push(Lv(L * 0.3, dep, `WL +${f2(dep)}`));
  it.push(Dm(0, -0.3, L, -0.3, -0.8, `${f2(L)} m`), Dm(L + 0.3, 0, L + 0.3, dep, -0.8, `${f2(dep)} m`));
  return auto('Chlorine contact tank – longitudinal section A–A (one pass)', it);
}
function contact3D(dis) {
  if (!dis || !dis.footprint) return null;
  const s = new Scene(), n = dis.nPasses, w = dis.inputs.chanWidth, L = dis.L, t = 0.2, dep = dis.inputs.depth, H = dep + 0.5 + 0.3;
  const inner = [];
  for (let k = 0; k < n - 1; k++) inner.push({ x: k % 2 === 0 ? 0 : 1.2, y: (k + 1) * w + k * t, z: 0.3, w: L - 1.2, d: t, h: dep + 0.3 });
  s.tank(0, 0, 0, L + 0.6, n * w + (n - 1) * t + 0.6, H, { t: 0.3, wl: dep + 0.3, inner });
  s.dimsBox(0, 0, 0, L + 0.6, n * w + (n - 1) * t + 0.6, H); s.dim([L + 0.6, 0.3, H], [L + 0.6, 0.3 + w, H], [1.2, 0, 0], `Pass ${f2(w)} m`);
  return s.render(`Chlorine contact tank – 3D view (${n} serpentine passes)`);
}
export function cwrSection(st, hyd) {
  if (!st) return null;
  const it = [], n = st.inputs.cwrCompartments, L = st.L, dep = st.depth, t = 0.3, fb = st.inputs.cwrFreeboard ?? 0.5;
  const twl = hyd?.cwrTWL ?? dep, floor = twl - dep, lwl = floor + 0.3, GL = hyd?.GL ?? twl - 0.5, roof = twl + fb;
  const Lt = n * L + (n - 1) * t;
  it.push(R(-t - 4, floor - t - 1.2, 4 - 0.01, GL - floor + t + 1.2, 'soil'), R(Lt + t, floor - t - 1.2, 4, GL - floor + t + 1.2, 'soil'), R(-t, floor - t - 1.2, Lt + t, 1.2 - 0.01, 'soil'), Ln(-t - 6, GL, -t, GL, 'ground'), Ln(Lt + t, GL, Lt + t + 6, GL, 'ground'));
  it.push(R(-t - 0.6, floor - t, Lt + 2 * t + 1.2, t, 'concrete'), R(-t, floor, t, roof - floor, 'concrete'), R(Lt, floor, t, roof - floor, 'concrete'), R(-t - 0.3, roof, Lt + 2 * t + 0.6, 0.25, 'concrete'));
  for (let k = 0; k < n; k++) {
    const x0 = k * (L + t);
    it.push(R(x0, floor, L, dep, 'water'), Ln(x0, twl, x0 + L, twl, 'waterline'), Ln(x0, lwl, x0 + L, lwl, 'dash'));
    const nc = Math.max(1, Math.round(L / 5) - 1);
    for (let j = 1; j <= nc; j++) it.push(R(x0 + (L * j) / (nc + 1) - 0.15, floor, 0.3, roof - floor, 'concreteSolid'));
    it.push(R(x0 + L * 0.5 - 0.4, roof + 0.25, 0.8, 0.25, 'outline'), Ln(x0 + L * 0.2, roof + 0.25, x0 + L * 0.2, roof + 1.1, 'thick'), Pg([[x0 + L * 0.2 - 0.3, roof + 1.1], [x0 + L * 0.2, roof + 1.35], [x0 + L * 0.2 + 0.3, roof + 1.1]], 'thick', false));
    if (k < n - 1) it.push(R(x0 + L, floor, t, roof - floor, 'concrete'));
  }
  const th = (Lt + 14) / 80;
  it.push(T(L * 0.5, roof + 0.5 + th * 0.8, 'Access', { anchor: 'middle', size: 0.8 }), T(L * 0.2, roof + 1.35 + th * 0.6, 'Vent (screened)', { anchor: 'middle', size: 0.8 }));
  it.push(Ln(-t - 6, twl + 0.25, 0.4, twl + 0.25, 'pipe', { arrow: true }), T(-t - 6, roof + 0.5 + th * 0.8, 'Inlet', { size: 0.9 }));
  it.push(R(Lt - 1.6, floor - t - 0.6, 1.6, 0.6, 'concrete'), Ln(Lt - 0.8, floor - 0.3, Lt + t + 6, floor - 0.3, 'pipe', { arrow: true }), T(Lt + t + 0.6, floor - 0.3 - th * 1.5, 'Suction to treated-water pumps', { size: 0.9 }));
  it.push(Ln(Lt + t, twl + 0.12, Lt + t + 3, twl + 0.12, 'equip', { arrow: true }), T(Lt + t + 0.6, roof + 0.5 + th * 0.8, 'Overflow', { size: 0.9 }));
  it.push(Lv(L * 0.7, twl, `TWL ${f2(twl)}`), Lv(L * 0.35, lwl, `LWL ${f2(lwl)}`), Lv(-t - 5.5, GL, `GL ${f2(GL)}`), Lv(n > 1 ? L + t + L * 0.35 : L * 0.75, floor, `Floor ${f2(floor)}`));
  it.push(Dm(0, floor - t - 1.2, L, floor - t - 1.2, -th * 1.2, `${f2(L)} m`), Dm(n > 1 ? L + t + L * 0.75 : L * 0.9, floor, n > 1 ? L + t + L * 0.75 : L * 0.9, twl, 0.01, `${f2(dep)} m`));
  return auto(`Clear water reservoir – longitudinal section A–A (${n} compartments, ${f0(st.V)} m³)`, it, { scaleNote: 'levels in m MSL', textH: th });
}
export function cwrCross(st, hyd) {
  if (!st) return null;
  const it = [], W = st.W, dep = st.depth, t = 0.3, fb = st.inputs.cwrFreeboard ?? 0.5;
  const twl = hyd?.cwrTWL ?? dep, floor = twl - dep, GL = hyd?.GL ?? twl - 0.5, roof = twl + fb;
  it.push(R(-t - 4, floor - t - 1.2, 4 - 0.01, GL - floor + t + 1.2, 'soil'), R(W + t, floor - t - 1.2, 4, GL - floor + t + 1.2, 'soil'), R(-t, floor - t - 1.2, W + t, 1.2 - 0.01, 'soil'), Ln(-t - 5, GL, -t, GL, 'ground'), Ln(W + t, GL, W + t + 5, GL, 'ground'));
  it.push(R(-t - 0.6, floor - t, W + 2 * t + 1.2, t, 'concrete'), R(-t, floor, t, roof - floor, 'concrete'), R(W, floor, t, roof - floor, 'concrete'), R(-t - 0.3, roof, W + 2 * t + 0.6, 0.25, 'concrete'));
  it.push(R(0, floor, W, dep, 'water'), Ln(0, twl, W, twl, 'waterline'));
  it.push(R(0, floor, W - 1.5, dep + fb * 0.4, 'outline'), T((W - 1.5) / 2, floor + dep * 0.5, 'Flow-guiding wall (opening at alternate ends)', { anchor: 'middle', size: 0.72 }));
  const nc = Math.max(1, Math.round(W / 5) - 1);
  for (let j = 1; j <= nc; j++) it.push(Ln((W * j) / (nc + 1), floor, (W * j) / (nc + 1), roof, 'center'));
  it.push(Lv(W * 0.75, twl, `TWL ${f2(twl)}`), Lv(-t - 4.5, GL, `GL ${f2(GL)}`));
  it.push(Dm(0, floor - t, W, floor - t, -1.2, `${f2(W)} m`), Dm(W + t, floor, W + t, roof, -5.5, `${f2(roof - floor)} m`));
  return auto('Clear water reservoir – cross-section B–B', it, { scaleNote: 'levels in m MSL' });
}
function cwr3D(st, hyd) {
  if (!st) return null;
  const s = new Scene(), n = st.inputs.cwrCompartments, t = 0.3;
  const above = Math.max(0.8, (hyd?.cwrTWL ?? 1) + 0.75 - (hyd?.GL ?? 0));
  const Lt = n * st.L + (n - 1) * t + 2 * t, W = st.W + 2 * t;
  s.ground(-4, -4, Lt + 8, W + 8);
  s.box(0, 0, 0, Lt, W, above);
  s.dimsBox(0, 0, 0, Lt, W, above, { labels: { H: `${f2(above)} m above GL` } });
  for (let k = 0; k < n; k++) { const x0 = t + k * (st.L + t); s.box(x0 + st.L * 0.5 - 0.5, W * 0.15, above, 1, 1, 0.3, 'equip'); for (const f of [0.25, 0.75]) s.cyl(x0 + st.L * f, W * 0.6, above, 0.25, 1.0, { kind: 'equip' }); }
  s.leader(Lt / 2, W / 2, above + 1.2, `Covered reservoir ${f0(st.V)} m³ – ${f1(above)} m above ground, ${f1(st.depth + 0.5 - above > 0 ? st.depth + 0.75 - above : 0)} m below`, 6, { size: 0.6 });
  return s.render('Clear water reservoir – 3D view (roof slab with access covers and vents)');
}
export function pumpHousePlan(st) {
  if (!st?.pumps) return null;
  const it = [], nP = (st.inputs.nDuty || 2) + (st.pumps.nStandby ?? st.inputs.nStandby ?? 1);
  const Lh = Math.max(10, 4 + 3 * nP), Wh = 9, t = 0.25, dn = st.pumps.dn / 1000;
  it.push(R(-t, -t, Lh + 2 * t, t, 'concrete'), R(-t, Wh, Lh + 2 * t, t, 'concrete'), R(-t, 0, t, Wh, 'concrete'), R(Lh, 0, t, Wh, 'concrete'));
  it.push(Ln(-3, 1.4, Lh - 1, 1.4, 'pipe'), T(-3, 1.9, 'Suction header from CWR', { size: 0.72 }));
  it.push(Ln(1, Wh - 1.4, Lh + 4, Wh - 1.4, 'pipe', { arrow: true }), T(Lh + 0.6, Wh - 0.9, `Delivery DN${st.pumps.dn} → service reservoir`, { size: 0.72 }));
  for (let i = 0; i < nP; i++) {
    const x = 2.5 + i * ((Lh - 5) / Math.max(1, nP - 1 || 1));
    it.push(Ln(x, 1.4, x, 3.2, 'pipe'), R(x - 0.45, 3.2, 0.9, 1.1, 'equipFill'), R(x - 0.35, 4.3, 0.7, 1.5, 'equip'), Ln(x, 4.0, x + 0.9, 4.0, 'pipe'), Ln(x + 0.9, 4.0, x + 0.9, Wh - 1.4, 'pipe'));
    it.push(Pg([[x + 0.72, 6.3], [x + 1.08, 6.7], [x + 1.08, 6.3], [x + 0.72, 6.7]], 'thick'), T(x - 0.6, 5.0, i < (st.inputs.nDuty || 2) ? `P${i + 1}` : `P${i + 1} (S)`, { anchor: 'end', size: 0.7, bold: true }));
  }
  it.push(R(Lh - 2.6, 0.3, 2.3, 0.8, 'outline'), T(Lh - 1.45, 0.55, 'MCC / panels', { anchor: 'middle', size: 0.62 }));
  it.push(Ln(0.5, Wh / 2 + 2.4, Lh - 0.5, Wh / 2 + 2.4, 'center'), T(Lh / 2, Wh / 2 + 2.6, 'Overhead travelling crane', { anchor: 'middle', size: 0.65 }));
  it.push(R(Lh / 2 - 1, -t, 2, t, 'outline'), T(Lh / 2, -t - 0.6, 'Door', { anchor: 'middle', size: 0.65 }));
  it.push(Dm(0, -t, Lh, -t, -1.5, `${f2(Lh)} m`), Dm(Lh + t, 0, Lh + t, Wh, -5.5, `${f2(Wh)} m`));
  void dn;
  return auto(`Treated-water pump house – plan (${st.inputs.nDuty || 2} duty + ${nP - (st.inputs.nDuty || 2)} standby, ${st.pumps.motor} kW each)`, it);
}

// ================================================================== RESIDUALS
export function thickenerSection(sl) {
  const th = sl?.thick;
  if (!th) return null;
  const it = [], r = th.D / 2, H = th.swd, t = 0.35, fb = th.freeboard || 0.6, hop = th.hop || 1.5;
  it.push(Pg([[-r, H], [-r, 0], [-1, -hop], [1, -hop], [r, 0], [r, H]], 'water'), Pg([[-r, 0.8], [-r, 0], [-1, -hop], [1, -hop], [r, 0], [r, 0.8], [0, 1.6]], 'sludge'));
  it.push(Pg([[-r - t, H + fb], [-r - t, -t], [-1 - t, -hop - t], [1 + t, -hop - t], [r + t, -t], [r + t, H + fb], [r, H + fb], [r, 0], [1, -hop], [-1, -hop], [-r, 0], [-r, H + fb]], 'concrete'));
  it.push(Ln(-r, H, r, H, 'waterline'), R(-1.2, H * 0.5, 0.08, H * 0.5 + 0.2, 'baffle'), R(1.12, H * 0.5, 0.08, H * 0.5 + 0.2, 'baffle'));
  it.push(R(-r - t, H + fb + 0.2, 2 * (r + t), 0.25, 'outline'), R(-0.4, H + fb + 0.45, 0.8, 0.7, 'equipFill'), Ln(0, H + fb + 0.45, 0, -hop + 0.3, 'equip'));
  it.push(Ln(-r + 0.3, 0.15, -1.1, -hop + 0.25, 'equip'), Ln(r - 0.3, 0.15, 1.1, -hop + 0.25, 'equip'));
  for (let x = -r + 1.5; x < -1.5; x += 1.5) it.push(Ln(x, 0.15 - ((x + r) / (r - 1)) * hop * 0.9, x, 2.2, 'equip'));
  for (let x = r - 1.5; x > 1.5; x -= 1.5) it.push(Ln(x, 0.15 - ((r - x) / (r - 1)) * hop * 0.9, x, 2.2, 'equip'));
  it.push(Ln(-r - 4, H + 0.3, -0.6, H + 0.3, 'pipe', { arrow: true }), T(-r - 4, H + 0.65, 'Sludge feed', { size: 0.75 }));
  it.push(Ln(0, -hop - t, 0, -hop - t - 0.8, 'equip'), Ln(0, -hop - t - 0.8, r + 4, -hop - t - 0.8, 'equip', { arrow: true }), T(r + 0.5, -hop - t - 0.45, `Thickened sludge ≈ ${f0(th.underflow)} m³/d`, { size: 0.72 }));
  it.push(Ln(r + t, H - 0.2, r + 4, H - 0.2, 'pipe', { arrow: true }), T(r + t + 0.5, H + 0.15, 'Supernatant → recovery', { size: 0.72 }));
  it.push(T(-r * 0.5, 2.6, 'Picket-fence scraper', { anchor: 'middle', size: 0.72 }));
  it.push(Lv(-r * 0.6, H, `WL +${f2(H)}`));
  it.push(Dm(-r, -hop - t, r, -hop - t, -1.8, `Ø ${f2(th.D)} m`), Dm(-r - t, 0, -r - t, H, 0.9, `SWD ${f2(H)} m`));
  return auto(`Gravity sludge thickener – section A–A (${th.n} unit${th.n > 1 ? 's' : ''})`, it);
}
export function thickenerPlan(sl) {
  const th = sl?.thick;
  if (!th) return null;
  const it = [], r = th.D / 2, t = 0.35, n = Math.min(th.n, 4);
  for (let k = 0; k < n; k++) {
    const cx = k * (th.D + 5);
    it.push(C(cx, 0, r + t, 'concreteSolid'), C(cx, 0, r, 'water'), C(cx, 0, r - 0.6, 'waterline'), C(cx, 0, 1.2, 'outline'), R(cx - r - t, -0.4, 2 * (r + t), 0.8, 'outline'), C(cx, 0, 0.4, 'equipFill'));
    it.push(Ln(cx - r - t - 0.6, 0, cx + r + t + 0.6, 0, 'center'), Ln(cx, -r - t - 0.6, cx, r + t + 0.6, 'center'));
    it.push(T(cx, r + t + 1.0, `Thickener ${k + 1}`, { anchor: 'middle', size: 0.85, bold: true }));
  }
  it.push(Dm(-r, -r - t, r, -r - t, -1.4, `Ø ${f2(th.D)} m`));
  it.push(...cut(-r - t - 2.2, -0.001, r + t + 1.6, -0.001, 'A', th.D / 24));
  return auto('Gravity sludge thickeners – plan', it);
}
export function bedsPlan(sl) {
  if (!sl || !(sl.bedArea > 0) || !(sl.nBeds > 0)) return null;
  const it = [], n = Math.min(sl.nBeds, 8), a = sl.bedArea / sl.nBeds, w = Math.max(3, Math.round(Math.sqrt(a / 3) * 10) / 10), L = Math.round((a / w) * 10) / 10, t = 0.25;
  for (let k = 0; k < n; k++) {
    const x0 = k * (w + t);
    it.push(R(x0, 0, w, L, 'sand'), Ln(x0 + w / 2, 0.3, x0 + w / 2, L - 0.3, 'dash'), R(x0 + w / 2 - 0.5, L - 1.0, 1.0, 0.8, 'outline'));
    it.push(T(x0 + w / 2, L / 2, `Bed ${k + 1}`, { anchor: 'middle', size: 0.85, bold: true, rot: w < 4 ? 90 : 0 }));
    if (k < n - 1) it.push(R(x0 + w, 0, t, L, 'concrete'));
  }
  const Wt = n * w + (n - 1) * t;
  it.push(R(-t, -t, Wt + 2 * t, t, 'concrete'), R(-t, L, Wt + 2 * t, t, 'concrete'), R(-t, 0, t, L, 'concrete'), R(Wt, 0, t, L, 'concrete'));
  it.push(Ln(-t - 2, L + t + 0.8, Wt + t, L + t + 0.8, 'equip'), T(-t - 2, L + t + 1.2, 'Sludge feed main with splash pads', { size: 0.72 }));
  it.push(Ln(-t - 2, -t - 0.8, Wt + t, -t - 0.8, 'pipe'), T(-t - 2, -t - 1.5, 'Filtrate collector → recovery / drain', { size: 0.72 }));
  it.push(Dm(0, -t, w, -t, -2.2, `${f2(w)} m`), Dm(Wt + t, 0, Wt + t, L, -1.0, `${f2(L)} m`));
  it.push(...cut(-t - 1.2, L * 0.35, Math.min(Wt, 2 * w + t) + 0.8, L * 0.35, 'A', Math.max(Wt, L) / 34));
  return auto(`Sludge drying beds – plan (${sl.nBeds} beds${sl.nBeds > n ? ', ' + n + ' shown' : ''}, ${f0(a)} m² each)`, it);
}
export function bedsSection(sl) {
  if (!sl || !(sl.bedArea > 0) || !(sl.nBeds > 0)) return null;
  const it = [], a = sl.bedArea / sl.nBeds, w = Math.max(3, Math.round(Math.sqrt(a / 3) * 10) / 10), t = 0.25;
  for (let k = 0; k < 2; k++) {
    const x0 = k * (w + t);
    it.push(Pg([[x0, 0], [x0 + w / 2, -0.15], [x0 + w, 0], [x0 + w, 0.3], [x0, 0.3]], 'gravel'), R(x0, 0.3, w, 0.25, 'sand'), R(x0, 0.55, w, 0.3, 'sludge'), C(x0 + w / 2, 0.02, 0.08, 'pipeFill'));
    if (k === 0) it.push(R(x0 + w, -0.4, t, 1.6, 'concrete'));
  }
  const Wt = 2 * w + t;
  it.push(Pg([[-t, -0.4], [w / 2, -0.55], [w + t / 2, -0.4], [w + t + w / 2, -0.55], [Wt + t, -0.4], [Wt + t, -0.15], [w + t + w / 2, -0.3], [w + t, -0.15], [w, -0.15], [w / 2, -0.3], [-t, -0.15]], 'concrete'), R(-t, -0.15, t, 1.35, 'concrete'), R(Wt, -0.15, t, 1.35, 'concrete'));
  const tb = Wt / 70;
  [['Sludge 0.30 m', 0.7], ['Sand 0.25 m', 0.42], ['Graded gravel 0.30 m, perforated drain', 0.15]].forEach(([txt, yy], i) => { const ty = 1.6 - i * tb * 1.6; it.push(Ln(Wt - 0.4, yy, Wt + t + 0.8, ty + tb * 0.3, 'thin'), T(Wt + t + 1.0, ty, txt, { size: 0.9 })); });
  it.push(Dm(0, -0.55, w, -0.55, -0.5, `${f2(w)} m`), Dm(-t, 0, -t, 1.2, 0.5, '1.20 m'));
  return auto('Sludge drying beds – section A–A (two beds)', it, { textH: Wt / 70 });
}

// ================================================================== WHOLE PLANT
const KEY2HYD = { inlet: 'inlet', floc: 'floc', sed: 'sed', filt: 'filt', ct: 'ct', cwr: 'cwr' };
const WATER = { inlet: 'isoWaterBrown', floc: 'isoWaterBrown', sed: 'isoWaterMid', filt: 'isoWater', ct: 'isoWater', rec: 'isoWaterBrown' };
export function plant3D(r) {
  const lay = r.layout;
  if (!lay) return null;
  const s = new Scene(), H = lay.siteH, GL = r.hyd?.GL ?? 0;
  s.ground(0, 0, lay.siteW, H);
  const road = lay.inputs.road || 6;
  s.ground(lay.siteW * 0.02, H * 0.445, lay.siteW * 0.96, road, 'isoRoad');
  for (const b of lay.items) {
    const y = H - b.y - b.h, hu = r.hyd?.units.find((u) => u.key === KEY2HYD[b.key]);
    const top = hu ? Math.max(0.6, hu.top - GL) : 0, wl = hu ? hu.wl - GL : 0;
    if (b.kind === 'building') { s.building(b.x, y, 0, b.w, b.h, b.key === 'guard' ? 2.8 : b.key === 'twp' || b.key === 'chem' ? 5 : 3.6); }
    else if (b.circ) { for (let k = 0; k < (b.n || 1); k++) { const rr = b.D / 2; const cx = b.w > b.h ? b.x + 1 + rr + k * (b.D + 1) : b.x + b.w / 2; const cy = b.w > b.h ? y + b.h / 2 : y + b.h - 1.5 - rr - k * (b.D + 3); s.cyl(cx, cy, 0, rr, b.key === 'thick' ? 2.2 : Math.max(1, top), { wl: (b.key === 'thick' ? 2.2 : Math.max(1, top)) - 0.5, water: b.key === 'thick' ? 'isoWaterBrown' : 'isoWaterMid' }); } }
    else if (b.key === 'cwr') s.box(b.x, y, 0, b.w, b.h, Math.max(0.8, top + 0.25));
    else if (b.key === 'beds') { const n = b.n || 2; for (let k = 0; k < n; k++) s.tank(b.x + (k * b.w) / n, y, 0, b.w / n - 0.3, b.h, 1.0, { t: 0.25, wl: 0.7, water: 'isoSludge' }); }
    else if (b.key === 'sed' && (b.n || 1) > 1) { const n = b.n; for (let k = 0; k < n; k++) s.tank(b.x, y + (k * b.h) / n, 0, b.w, b.h / n, top, { t: 0.35, wl: Math.min(top - 0.3, wl), water: WATER.sed }); }
    else if (b.key === 'filt' && r.filt && r.filt.type !== 'ssf') {
      const rows = r.filt.footprint?.rows || 1, perRow = Math.ceil(r.filt.N / rows), gal = 4.2, fw = b.w / perRow, fl = rows > 1 ? (b.h - gal) / 2 : b.h - gal;
      for (let rI = rows - 1; rI >= 0; rI--) for (let k = 0; k < perRow; k++) s.tank(b.x + k * fw, y + (rI === 0 ? 0 : fl + gal), 0, fw, fl, top, { t: 0.3, wl: Math.min(top - 0.4, wl) });
      s.building(b.x, y + (rows > 1 ? fl : b.h - gal), 0, b.w, gal, top + 2.8);
    } else if (b.key === 'filt') { const n = b.n || 2; for (let k = 0; k < n; k++) s.tank(b.x, y + (k * b.h) / n, 0, b.w, b.h / n, Math.max(1.2, top), { t: 0.3, wl: Math.max(0.8, Math.min(top - 0.3, wl)) }); }
    else if (b.key === 'floc' && (b.trains || 1) > 1) { const n = b.trains; for (let k = 0; k < n; k++) s.tank(b.x, y + (k * b.h) / n, 0, b.w, b.h / n, top, { t: 0.25, wl: Math.min(top - 0.3, wl), water: WATER.floc }); }
    else s.tank(b.x, y, 0, b.w, b.h, Math.max(1, top || 1.5), { t: 0.3, wl: Math.max(0.5, Math.min((top || 1.5) - 0.3, wl || 1.2)), water: WATER[b.key] || 'isoWater' });
  }
  const thL = Math.max(lay.siteW, H) / 80;
  for (const b of lay.items) {
    const y = H - b.y - b.h, hu = r.hyd?.units.find((u) => u.key === KEY2HYD[b.key]);
    const top = b.kind === 'building' ? 6.5 : hu ? Math.max(1, hu.top - GL) + (b.key === 'filt' ? 5 : 0) : 2.5;
    const hgt = b.kind === 'building' ? null : hu ? Math.max(0.6, hu.top - GL) : null;
    s.leader(b.x + b.w / 2, y + b.h / 2, top, `${b.label.split(' (')[0].replace(' + gallery', '')} · ${f1(b.w)} × ${f1(b.h)}${hgt ? ' × ' + f1(hgt) + ' m high' : ' m'}`, 3 + (b.w < 16 ? 2.5 : 0), { size: 0.7, bold: true });
  }
  s.dim([0, 0, 0], [lay.siteW, 0, 0], [0, -8, 0], `Site ${f0(lay.siteW)} m`); s.dim([0, 0, 0], [0, H, 0], [-8, 0, 0], `${f0(H)} m`);
  // north arrow on the ground plane
  s.pipe([[lay.siteW + 8, 6, 0], [lay.siteW + 8, 18, 0]], 'thick');
  s.label(lay.siteW + 8, 21, 0, 'N', { bold: true });
  return s.render('Treatment plant – 3D isometric view from the south-west', { textH: thL });
}

// ================================================================== REGISTRY
const V = (id, label, dw) => (dw ? { id, label, dw } : null);
/**
 * All drawings of the design, grouped by structure.  Each group: { key, no, title, page, views: [{id, label, dw}] }.
 * Every drawing gets a code "NN-k" (structure number – view number) used in the NWSDB drawing number.
 */
export function drawingGroups(r) {
  const g = [];
  const add = (key, title, page, views) => { const vs = views.filter(Boolean); if (vs.length) g.push({ key, title, page, views: vs }); };
  const ga = (title, parts) => compose(title, parts);
  { const p = intakePlan(r.intake), s = U.intakeSection(r.intake);
    add('intake', 'Intake well', 'intake', [V('plan', 'Plan', p), V('secA', 'Section A–A', s), V('ga', 'General arrangement', ga('Intake well – general arrangement', [{ dw: p, label: 'Plan' }, { dw: s, label: 'Section A–A', at: 'right' }])), V('iso', '3D view', intake3D(r.intake))]); }
  if (r.process.has.aeration && r.aeration) { const p = aeratorPlan(r.aeration), s = U.aeratorSection(r.aeration); add('aer', 'Aerator', 'aeration', [V('plan', 'Plan', p), V('secA', 'Section A–A', s), V('ga', 'General arrangement', ga('Aerator – general arrangement', [{ dw: p, label: 'Plan' }, { dw: s, label: 'Section A–A' }]))]); }
  if (r.process.has.rapidmix && r.rapidmix?.enabled !== false) { const p = rapidMixPlan(r.rapidmix), s = U.rapidMixDrawing(r.rapidmix); add('rm', 'Rapid mixer', 'rapidmix', [V('plan', 'Plan', p), V('secA', 'Section A–A', s), V('ga', 'General arrangement', ga('Rapid mixer – general arrangement', [{ dw: p, label: 'Plan' }, { dw: s, label: 'Section A–A' }]))]); }
  if (r.process.has.floc && r.floc) {
    const fl = r.floc, vb = fl.type === 'vbaffle';
    const p = vb ? flocPlanV(fl) : U.flocDrawing(fl), s = vb ? U.flocDrawing(fl) : flocSection(fl), c = flocCross(fl);
    add('floc', 'Flocculator', 'floc', [V('plan', 'Plan', p), V('secA', 'Section A–A', s), V('secB', 'Section B–B', c), V('ga', 'General arrangement', ga('Flocculator – general arrangement', [{ dw: p, label: 'Plan' }, { dw: s, label: 'Section A–A' }, { dw: c, label: 'Section B–B', at: 'right' }])), V('iso', '3D view', floc3D(fl))]);
  }
  if (r.sed?.enabled && r.sed.type === 'daf') { const sd = r.sed, p = dafPlan(sd), a = dafSection(sd); add('sed', 'Dissolved air flotation', 'sed', [V('plan', 'Plan', p), V('secA', 'Section A–A', a), V('ga', 'General arrangement', ga('Dissolved air flotation – general arrangement', [{ dw: p, label: 'Plan' }, { dw: a, label: 'Section A–A' }])), V('iso', '3D view', daf3D(sd))]); }
  else if (r.sed?.enabled && r.sed.type === 'hrf') { const sd = r.sed, p = hrfPlan(sd), a = hrfSection(sd); add('sed', 'Roughing filters', 'sed', [V('plan', 'Plan', p), V('secA', 'Section A–A', a), V('ga', 'General arrangement', ga('Roughing filters – general arrangement', [{ dw: p, label: 'Plan' }, { dw: a, label: 'Section A–A' }])), V('iso', '3D view', hrf3D(sd))]); }
  else if (r.sed?.enabled) {
    const sd = r.sed, p = U.sedPlan(sd), s = sd.type === 'circ' ? clarifierSection(sd) : U.sedSection(sd), c = sedCross(sd);
    add('sed', sd.type === 'circ' ? 'Circular clarifiers' : 'Sedimentation tanks', 'sed', [V('plan', 'Plan', p), V('secA', 'Section A–A', s), V('secB', 'Section B–B', c), V('ga', 'General arrangement', ga('Sedimentation tanks – general arrangement', [{ dw: p, label: 'Plan' }, { dw: s, label: 'Section A–A' }, { dw: c, label: 'Section B–B', at: 'below' }])), V('iso', '3D view', sed3D(sd))]);
  }
  if (r.filt) {
    const fi = r.filt, ssf = fi.type === 'ssf';
    const p = U.filterPlan(fi), bp = filterBatteryPlan(fi), a = ssf ? ssfSection(fi, r.hyd) : U.filterSection(fi, r.hyd), b = filterLong(fi, r.hyd);
    add('filt', ssf ? 'Slow sand filters' : 'Rapid gravity filters', 'filt', [V('gplan', 'General plan', bp), V('plan', ssf ? 'Plan' : 'Plan – one filter', p), V('secA', 'Section A–A', a), V('secB', 'Section B–B', b),
      V('ga', 'General arrangement', ga(`${ssf ? 'Slow sand filter' : 'Rapid gravity filter'} – general arrangement`, [{ dw: p, label: 'Plan' }, { dw: a, label: 'Section A–A', at: 'right' }, { dw: b, label: 'Section B–B' }])), V('iso', '3D view', filter3D(fi))]);
  }
  if (r.dis?.footprint) { const p = U.contactPlan(r.dis), a = contactLong(r.dis), b = contactSection(r.dis); add('ct', 'Chlorine contact tank', 'dis', [V('plan', 'Plan', p), V('secA', 'Section A–A', a), V('secB', 'Section B–B', b), V('ga', 'General arrangement', ga('Chlorine contact tank – general arrangement', [{ dw: p, label: 'Plan' }, { dw: a, label: 'Section A–A' }, { dw: b, label: 'Section B–B', at: 'right' }])), V('iso', '3D view', contact3D(r.dis))]); }
  if (r.storage) { const st = r.storage, p = U.cwrPlan(st), a = cwrSection(st, r.hyd), b = cwrCross(st, r.hyd);
    add('cwr', 'Clear water reservoir', 'storage', [V('plan', 'Plan', p), V('secA', 'Section A–A', a), V('secB', 'Section B–B', b), V('ga', 'General arrangement', ga('Clear water reservoir – general arrangement', [{ dw: p, label: 'Plan' }, { dw: a, label: 'Section A–A' }, { dw: b, label: 'Section B–B' }])), V('iso', '3D view', cwr3D(st, r.hyd))]);
    add('twp', 'Treated-water pump house', 'storage', [V('plan', 'Plan', pumpHousePlan(st))]); }
  if (r.sludge) { const sl = r.sludge, tp = thickenerPlan(sl), ts = thickenerSection(sl);
    add('thick', 'Sludge thickener', 'sludge', [V('plan', 'Plan', tp), V('secA', 'Section A–A', ts), V('ga', 'General arrangement', ga('Sludge thickener – general arrangement', [{ dw: tp, label: 'Plan' }, { dw: ts, label: 'Section A–A' }]))]);
    add('beds', 'Sludge drying beds', 'sludge', [V('plan', 'Plan', bedsPlan(sl)), V('secA', 'Section A–A', bedsSection(sl))]); }
  if (r.buildings) { add('chem', 'Chemical house', 'buildings', [V('plan', 'Plan', chemHousePlan(r.buildings))]); add('chlor', 'Chlorination building', 'buildings', [V('plan', 'Plan', chlorPlan(r.buildings))]); }
  if (r.structure?.list?.length) add('rebar', 'Typical reinforcement', 'structure', r.structure.list.map((s) => V('rb-' + s.key, s.name, rebarDetail(s, r.structure.inputs))));
  add('hyd', 'Hydraulic profile', 'hyd', [V('profile', 'Profile', U.hydraulicProfile(r.hyd))]);
  add('site', 'Site', 'layout', [V('plan', 'Site layout plan', U.layoutPlan(r.layout)), V('levels', 'Levels & drainage', siteLevelsPlan(r)), V('iso', '3D view of the plant', plant3D(r))]);
  g.forEach((grp, i) => { grp.no = String(i + 1).padStart(2, '0'); grp.views.forEach((v, k) => { v.dw.code = `${grp.no}-${k + 1}`; v.dw.group = grp.title; v.dw.view = v.label; }); });
  return g;
}
const CACHE = new WeakMap();
const safe = (fn) => { try { return fn(); } catch (e) { console.error('drawing failed', e); return null; } };
/** cached groups for a results object */
export function groupsOf(r) { if (!CACHE.has(r)) CACHE.set(r, safe(() => drawingGroups(r)) || []); return CACHE.get(r); }
export const groupViews = (r, key) => groupsOf(r).find((g) => g.key === key)?.views || [];
export const groupTitle = (r, key) => groupsOf(r).find((g) => g.key === key)?.title || '';
