// Interactive 3D viewer (canvas, orthographic): drag to rotate, wheel to zoom, right-drag / shift-drag to pan.
// Renders the mesh of a Scene (iso.js): shaded faces sorted back-to-front, pipes, labels and dimensions.
import { MAT } from './iso.js';

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const PRESETS = { iso: [225, 32], top: [270, 89.9], front: [270, 0.01], side: [180, 0.01], back: [90, 0.01], ne: [45, 32] };

export function mount3D(container, scene, { height = 460, title = '' } = {}) {
  container.innerHTML = '';
  container.classList.add('drawing', 'view3d');
  const cv = document.createElement('canvas');
  container.append(cv);
  const ctx = cv.getContext('2d');
  // bounds
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const f of scene.faces) for (const p of f.pts) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
  if (!Number.isFinite(mn[0])) { mn = [0, 0, 0]; mx = [1, 1, 1]; }
  const ctr = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
  const st = { az: PRESETS.iso[0], el: PRESETS.iso[1], zoom: 1, px: 0, py: 0, dims: true, labels: true };
  let W = 0, H = 0, dpr = 1;
  const dark = () => document.documentElement.dataset.theme === 'dark' || document.body.classList.contains('dark');
  const size = () => {
    dpr = window.devicePixelRatio || 1; W = container.clientWidth || 800; H = height;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  };
  // camera basis: az = direction the camera sits (degrees from +x, anticlockwise), el = elevation above horizon
  const basis = () => {
    const a = (st.az * Math.PI) / 180, e = (st.el * Math.PI) / 180;
    const dir = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)]; // from centre towards the camera
    const right = [-Math.sin(a), Math.cos(a), 0];
    const up = [-Math.cos(a) * Math.sin(e), -Math.sin(a) * Math.sin(e), Math.cos(e)];
    return { dir, right, up };
  };
  let B = basis(), scale = 1, base = 1;
  /** scale that fits the model (faces + dimensions) into the canvas for the current orientation */
  const fit = () => {
    B = basis(); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const acc = (p) => { const v = [p[0] - ctr[0], p[1] - ctr[1], p[2] - ctr[2]]; const x = v[0] * B.right[0] + v[1] * B.right[1], y = v[0] * B.up[0] + v[1] * B.up[1] + v[2] * B.up[2]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    for (const f of scene.faces) f.pts.forEach(acc);
    for (const d of scene.dims || []) { acc(d.a2); acc(d.b2); }
    for (const l of scene.labels || []) acc(l.p);
    base = Math.min((W - 90) / Math.max(1e-6, x1 - x0), (H - 110) / Math.max(1e-6, y1 - y0));
    st.px = -((x0 + x1) / 2) * base; st.py = ((y0 + y1) / 2) * base + 12; st.zoom = 1;
  };
  const proj = (p) => {
    const v = [p[0] - ctr[0], p[1] - ctr[1], p[2] - ctr[2]];
    const x = v[0] * B.right[0] + v[1] * B.right[1];
    const y = v[0] * B.up[0] + v[1] * B.up[1] + v[2] * B.up[2];
    const d = v[0] * B.dir[0] + v[1] * B.dir[1] + v[2] * B.dir[2];
    return [W / 2 + st.px + x * scale, H / 2 + st.py - y * scale, d];
  };
  const LIGHT = (() => { const l = [-0.45, -0.6, 0.66]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
  const shade = (f) => {
    const [r, g, b] = hex(MAT[f.mat] || '#cccccc');
    if (f.flat) return `rgb(${r},${g},${b})`;
    const p = f.pts, u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n) || 1; n = n.map((q) => q / l);
    if (n[0] * B.dir[0] + n[1] * B.dir[1] + n[2] * B.dir[2] < 0) n = n.map((q) => -q); // face the camera
    const k = 0.62 + 0.38 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) + (n[2] > 0.9 ? 0.06 : 0);
    return `rgb(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g * k))},${Math.min(255, Math.round(b * k))})`;
  };
  const text = (s, x, y, { bold = false, color, sizePx = 11, bg = true, ang = 0 } = {}) => {
    ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang);
    ctx.font = `${bold ? '600 ' : ''}${sizePx}px "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (bg) { const w = ctx.measureText(s).width + 8; ctx.fillStyle = dark() ? 'rgba(18,26,38,.82)' : 'rgba(255,255,255,.86)'; ctx.fillRect(-w / 2, -sizePx * 0.75, w, sizePx * 1.5); }
    ctx.fillStyle = color || (dark() ? '#e8eef6' : '#1d2b40'); ctx.fillText(s, 0, 0); ctx.restore();
  };
  const draw = () => {
    B = basis();
    scale = base * st.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = dark() ? '#121a26' : '#ffffff'; ctx.fillRect(0, 0, W, H);
    const fs = scene.faces.map((f) => { const pp = f.pts.map(proj); return { f, pp, d: f.flat && !f.ground ? Math.min(...pp.map((p) => p[2])) : pp.reduce((a, p) => a + p[2], 0) / pp.length }; });
    const below = st.el < 0;
    // ground planes first (unless looking from below), then the rest far → near
    fs.sort((a, b) => ((a.f.ground || 0) && !(b.f.ground || 0) ? (below ? 1 : -1) : !(a.f.ground || 0) && (b.f.ground || 0) ? (below ? -1 : 1) : (a.f.ground || 0) !== (b.f.ground || 0) ? (a.f.ground || 0) - (b.f.ground || 0) : a.d - b.d));
    ctx.lineJoin = 'round';
    for (const { f, pp } of fs) {
      ctx.beginPath(); pp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.fillStyle = shade(f); ctx.fill();
      if (!f.ground) { ctx.strokeStyle = dark() ? 'rgba(10,16,26,.55)' : 'rgba(60,75,95,.45)'; ctx.lineWidth = 0.6; ctx.stroke(); }
    }
    for (const l of scene.lines || []) { const a = proj(l.a), b = proj(l.b); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = l.color; ctx.lineWidth = l.w; ctx.stroke(); }
    if (st.dims) {
      const col = dark() ? '#e8eef6' : '#111';
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 0.9;
      for (const d of scene.dims || []) {
        const a = proj(d.a), b = proj(d.b), a2 = proj(d.a2), b2 = proj(d.b2);
        const len = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
        if (len < 28) continue; // dimension seen end-on
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a2[0], a2[1]); ctx.moveTo(b[0], b[1]); ctx.lineTo(b2[0], b2[1]); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
        const ux = (b2[0] - a2[0]) / len, uy = (b2[1] - a2[1]) / len;
        for (const [p, s] of [[a2, 1], [b2, -1]]) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + s * ux * 8 - uy * 3, p[1] + s * uy * 8 + ux * 3); ctx.lineTo(p[0] + s * ux * 8 + uy * 3, p[1] + s * uy * 8 - ux * 3); ctx.closePath(); ctx.fill(); }
        let ang = Math.atan2(uy, ux); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
        text(d.text, (a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2, { ang, sizePx: 11, bold: true });
      }
    }
    const used = [];
    const lab = [...(scene.labels || [])].map((l) => ({ l, p: proj(l.p) })).sort((a, b) => b.p[2] - a.p[2]); // nearest first
    if (st.labels) for (const { l, p } of lab) {
      ctx.font = `${l.bold ? '600 ' : ''}11px "Segoe UI", Arial, sans-serif`;
      const tw = ctx.measureText(l.text).width + 10, bx = [p[0] - tw / 2, p[1] - 17, p[0] + tw / 2, p[1] + 3];
      if (used.some((u) => bx[0] < u[2] && bx[2] > u[0] && bx[1] < u[3] && bx[3] > u[1])) continue; // declutter – zoom in to see more
      used.push(bx);
      if (l.from) { const q = proj(l.from); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.strokeStyle = dark() ? '#9fb0c6' : '#5b6b80'; ctx.lineWidth = 0.8; ctx.stroke(); }
      text(l.text, p[0], p[1] - (l.from ? 8 : 0), { bold: l.bold, sizePx: l.bold ? 11.5 : 10.5 });
    }
    // orientation triad
    const o = [56, H - 46], ax = [[1, 0, 0, 'E', '#c53030'], [0, 1, 0, 'N', '#2f855a'], [0, 0, 1, 'Up', '#2a78d6']];
    for (const [x, y, z, name, c] of ax) {
      const dx = x * B.right[0] + y * B.right[1], dy = x * B.up[0] + y * B.up[1] + z * B.up[2];
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0] + dx * 30, o[1] - dy * 30); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
      text(name, o[0] + dx * 40, o[1] - dy * 40, { color: c, bold: true, bg: false, sizePx: 10.5 });
    }
  };
  // ---- interaction
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: st.az, el: st.el, px: st.px, py: st.py, pan: e.button === 2 || e.button === 1 || e.shiftKey }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.pan) { st.px = drag.px + dx; st.py = drag.py + dy; } else { st.az = drag.az - dx * 0.4; st.el = Math.max(-15, Math.min(89.9, drag.el + dy * 0.3)); }
    draw();
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const k = e.deltaY > 0 ? 1 / 1.15 : 1.15, r = cv.getBoundingClientRect();
    const mxp = e.clientX - r.left - W / 2, myp = e.clientY - r.top - H / 2;
    const nz = Math.max(0.3, Math.min(60, st.zoom * k)), f = nz / st.zoom;
    st.px = mxp - (mxp - st.px) * f; st.py = myp - (myp - st.py) * f; st.zoom = nz;
    draw();
  }, { passive: false });
  // ---- toolbar
  const bar = document.createElement('div');
  bar.className = 'v3-bar';
  const btn = (label, tip, fn, cls = '') => { const b = document.createElement('button'); b.textContent = label; b.title = tip; b.className = cls; b.onclick = () => { fn(b); draw(); }; bar.append(b); return b; };
  const view = (k) => () => { [st.az, st.el] = PRESETS[k]; fit(); };
  btn('3D', 'Isometric view from the south-west', view('iso'));
  btn('Top', 'Plan view (from above)', view('top'));
  btn('Front', 'Elevation from the south', view('front'));
  btn('Side', 'Elevation from the west', view('side'));
  btn('Back', 'Elevation from the north', view('back'));
  btn('NE', 'Isometric view from the north-east', view('ne'));
  const sep = document.createElement('span'); sep.className = 'v3-sep'; bar.append(sep);
  btn('Dimensions', 'Show / hide dimensions', (b) => { st.dims = !st.dims; b.classList.toggle('on', st.dims); }, 'on');
  btn('Labels', 'Show / hide labels', (b) => { st.labels = !st.labels; b.classList.toggle('on', st.labels); }, 'on');
  btn('PNG', 'Save this view as an image', () => { draw(); cv.toBlob((blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (title || '3d-view').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }); });
  container.append(bar);
  const hint = document.createElement('div');
  hint.className = 'dw-scale';
  hint.textContent = `${title ? title + ' · ' : ''}drag to rotate · scroll to zoom · shift-drag to pan · Top / Front / Side give plan and elevations`;
  container.append(hint);
  size(); fit(); draw();
  const ro = new ResizeObserver(() => { if (!cv.isConnected) { ro.disconnect(); return; } if (Math.abs((container.clientWidth || 0) - W) > 4) { size(); fit(); draw(); } });
  ro.observe(container);
  return { redraw: draw, state: st };
}
