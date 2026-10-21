// Engineering drawing primitives (metres, y-up) → interactive SVG, static SVG string, and AutoCAD DXF (R12).
import { fmt } from '../../core/util.js';

const S = 100; // svg units per metre

export const STYLE = {
  concrete: { fill: 'url(#p-hatch)', stroke: 'var(--dw-line)', sw: 1.1 },
  concreteSolid: { fill: 'var(--dw-concrete)', stroke: 'var(--dw-line)', sw: 1.1 },
  water: { fill: 'var(--dw-water)', stroke: 'none' },
  waterline: { fill: 'none', stroke: 'var(--dw-water-line)', sw: 1.6 },
  sand: { fill: 'url(#p-sand)', stroke: 'var(--dw-line)', sw: 0.6 },
  gravel: { fill: 'url(#p-gravel)', stroke: 'var(--dw-line)', sw: 0.6 },
  anth: { fill: 'url(#p-anth)', stroke: 'var(--dw-line)', sw: 0.6 },
  soil: { fill: 'url(#p-soil)', stroke: 'none' },
  sludge: { fill: 'rgba(138,109,59,.35)', stroke: 'none' },
  outline: { fill: 'none', stroke: 'var(--dw-line)', sw: 1.2 },
  thick: { fill: 'none', stroke: 'var(--dw-line)', sw: 2.2 },
  thin: { fill: 'none', stroke: 'var(--dw-line)', sw: 0.7 },
  dash: { fill: 'none', stroke: 'var(--dw-dim)', sw: 0.8, dash: '6 4' },
  center: { fill: 'none', stroke: 'var(--dw-dim)', sw: 0.6, dash: '12 3 2 3' },
  equip: { fill: 'none', stroke: 'var(--dw-equip)', sw: 1.6 },
  equipFill: { fill: 'color-mix(in srgb, var(--dw-equip) 22%, transparent)', stroke: 'var(--dw-equip)', sw: 1.2 },
  pipe: { fill: 'none', stroke: 'var(--dw-water-line)', sw: 3 },
  pipeFill: { fill: 'var(--dw-water-line)', stroke: 'var(--dw-line)', sw: 0.6 },
  baffle: { fill: 'var(--dw-line)', stroke: 'none' },
  ground: { fill: 'none', stroke: 'var(--dw-ground)', sw: 1.6 },
  building: { fill: 'color-mix(in srgb, var(--primary) 10%, var(--dw-bg))', stroke: 'var(--primary)', sw: 1.2 },
  process: { fill: 'color-mix(in srgb, var(--dw-water-line) 14%, var(--dw-bg))', stroke: 'var(--dw-water-line)', sw: 1.4 },
  residual: { fill: 'color-mix(in srgb, var(--dw-ground) 16%, var(--dw-bg))', stroke: 'var(--dw-ground)', sw: 1.2 },
  site: { fill: 'none', stroke: 'var(--teal)', sw: 2, dash: '14 6' },
  road: { fill: 'color-mix(in srgb, var(--dw-dim) 12%, var(--dw-bg))', stroke: 'none' },
  hgl: { fill: 'none', stroke: 'var(--fail)', sw: 1.8, dash: '8 4' },
  grid: { fill: 'none', stroke: 'color-mix(in srgb, var(--dw-dim) 18%, transparent)', sw: 0.5 },
};
const STATIC_VARS = {
  '--dw-bg': '#ffffff', '--dw-line': '#22324a', '--dw-concrete': '#c9d2de', '--dw-water': 'rgba(42,120,214,.18)', '--dw-water-line': '#2a78d6',
  '--dw-sand': '#e8d29b', '--dw-gravel': '#b9a88a', '--dw-anth': '#4b4b52', '--dw-dim': '#5b6b80', '--dw-equip': '#eb6834', '--dw-ground': '#8a6d3b', '--dw-text': '#1d2b40',
  '--primary': '#0b63b6', '--teal': '#10a59a', '--fail': '#c53030',
};
function resolveVars(str) {
  return str.replace(/color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, (?:var\((--[\w-]+)\)|transparent)\)/g, (_, a, p, b) => {
    const ca = STATIC_VARS[a] || '#888';
    const op = (+p / 100).toFixed(2);
    return b ? mixHex(ca, STATIC_VARS[b] || '#fff', +p / 100) : hexA(ca, op);
  }).replace(/var\((--[\w-]+)\)/g, (_, v) => STATIC_VARS[v] || '#888');
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mixHex(a, b, p) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const m = (s) => Math.round(((A >> s) & 255) * p + ((B >> s) & 255) * (1 - p)); return `rgb(${m(16)},${m(8)},${m(0)})`; }

const escx = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Build SVG markup for a drawing */
export function drawingSVG(dw, { statik = false, width = null, idPrefix = 'd' } = {}) {
  const b = dw.bounds;
  const pad = dw.pad ?? Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.04;
  const x0 = b.x0 - pad, y1 = b.y1 + pad;
  const Wm = b.x1 - b.x0 + 2 * pad, Hm = b.y1 - b.y0 + 2 * pad;
  const X = (x) => ((x - x0) * S).toFixed(1);
  const Y = (y) => ((y1 - y) * S).toFixed(1);
  const L = (v) => (v * S).toFixed(1);
  const th = (dw.textH || Math.max(Wm, Hm) / 36) * S;
  const ps = Math.max(Wm, Hm) * S / 90; // pattern size
  const id = (n) => `${idPrefix}-${n}`;
  const style = (cls) => {
    const st = STYLE[cls] || STYLE.outline;
    let fill = st.fill || 'none';
    if (fill.startsWith('url(#')) fill = `url(#${id(fill.slice(5, -1))})`;
    return `fill="${fill}" stroke="${st.stroke || 'none'}" stroke-width="${st.sw || 1}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''} vector-effect="non-scaling-stroke"`;
  };
  const out = [];
  out.push(`<defs>
<pattern id="${id('p-hatch')}" patternUnits="userSpaceOnUse" width="${ps}" height="${ps}" patternTransform="rotate(45)"><rect width="${ps}" height="${ps}" fill="var(--dw-concrete)"/><line x1="0" y1="0" x2="0" y2="${ps}" stroke="var(--dw-line)" stroke-width="${ps * 0.06}" opacity=".45"/></pattern>
<pattern id="${id('p-sand')}" patternUnits="userSpaceOnUse" width="${ps}" height="${ps}"><rect width="${ps}" height="${ps}" fill="var(--dw-sand)"/><circle cx="${ps * .25}" cy="${ps * .3}" r="${ps * .07}" fill="var(--dw-line)" opacity=".5"/><circle cx="${ps * .7}" cy="${ps * .75}" r="${ps * .06}" fill="var(--dw-line)" opacity=".5"/></pattern>
<pattern id="${id('p-gravel')}" patternUnits="userSpaceOnUse" width="${ps * 1.6}" height="${ps * 1.6}"><rect width="${ps * 1.6}" height="${ps * 1.6}" fill="var(--dw-gravel)"/><circle cx="${ps * .5}" cy="${ps * .5}" r="${ps * .32}" fill="none" stroke="var(--dw-line)" stroke-width="${ps * .05}" opacity=".6"/><circle cx="${ps * 1.2}" cy="${ps * 1.15}" r="${ps * .25}" fill="none" stroke="var(--dw-line)" stroke-width="${ps * .05}" opacity=".6"/></pattern>
<pattern id="${id('p-anth')}" patternUnits="userSpaceOnUse" width="${ps}" height="${ps}"><rect width="${ps}" height="${ps}" fill="var(--dw-anth)"/><circle cx="${ps * .3}" cy="${ps * .4}" r="${ps * .08}" fill="#999"/></pattern>
<pattern id="${id('p-soil')}" patternUnits="userSpaceOnUse" width="${ps * 2}" height="${ps * 2}" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="${ps * 2}" stroke="var(--dw-ground)" stroke-width="${ps * .08}" opacity=".5"/></pattern>
<marker id="${id('arr')}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--dw-water-line)"/></marker>
<marker id="${id('arrd')}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="var(--dw-dim)"/></marker>
</defs>`);
  let curGroup = null;
  for (const it of dw.items) {
    if (it.group !== curGroup) {
      if (curGroup) out.push('</g>');
      if (it.group) out.push(`<g class="${it.drag ? 'drag' : ''}" data-key="${it.group}">`);
      curGroup = it.group || null;
    }
    const ts = th * (it.size || 1);
    switch (it.t) {
      case 'rect': out.push(`<rect x="${X(it.x)}" y="${Y(it.y + it.h)}" width="${L(it.w)}" height="${L(it.h)}" ${it.rx ? `rx="${L(it.rx)}"` : ''} ${style(it.cls)}${it.op ? ` opacity="${it.op}"` : ''}/>`); break;
      case 'poly': out.push(`<${it.closed === false ? 'polyline' : 'polygon'} points="${it.pts.map(([px, py]) => `${X(px)},${Y(py)}`).join(' ')}" ${style(it.cls)}/>`); break;
      case 'line': out.push(`<line x1="${X(it.x1)}" y1="${Y(it.y1)}" x2="${X(it.x2)}" y2="${Y(it.y2)}" ${style(it.cls)}${it.arrow ? ` marker-end="url(#${id(it.cls === 'dash' ? 'arrd' : 'arr')})"` : ''}/>`); break;
      case 'circle': out.push(`<circle cx="${X(it.cx)}" cy="${Y(it.cy)}" r="${L(it.r)}" ${style(it.cls)}/>`); break;
      case 'text': {
        const rot = it.rot ? ` transform="rotate(${-it.rot} ${X(it.x)} ${Y(it.y)})"` : '';
        out.push(`<text x="${X(it.x)}" y="${Y(it.y)}" font-size="${ts.toFixed(1)}" text-anchor="${it.anchor || 'start'}" fill="${it.color || 'var(--dw-text)'}" font-weight="${it.bold ? 600 : 400}" font-family="Segoe UI, Arial, sans-serif"${rot}${it.italic ? ' font-style="italic"' : ''}>${escx(it.text)}</text>`);
        break;
      }
      case 'level': {
        const s = th * 0.55;
        const xx = +X(it.x), yy = +Y(it.y);
        out.push(`<path d="M${xx - s},${yy - s * 1.2} L${xx + s},${yy - s * 1.2} L${xx},${yy} Z" fill="none" stroke="var(--dw-water-line)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`);
        out.push(`<text x="${xx + s * 1.6}" y="${yy - s * 0.4}" font-size="${(th * 0.85).toFixed(1)}" fill="var(--dw-water-line)" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${escx(it.text)}</text>`);
        break;
      }
      case 'dim': {
        const dx = it.x2 - it.x1, dy = it.y2 - it.y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const o = it.off ?? 0.5;
        const ax = it.x1 + nx * o, ay = it.y1 + ny * o, bx = it.x2 + nx * o, by = it.y2 + ny * o;
        const ext = Math.sign(o || 1) * Math.max(Wm, Hm) * 0.006;
        out.push(`<line x1="${X(it.x1)}" y1="${Y(it.y1)}" x2="${X(ax + nx * ext)}" y2="${Y(ay + ny * ext)}" fill="none" stroke="var(--dw-dim)" stroke-width="0.7" vector-effect="non-scaling-stroke"/>`);
        out.push(`<line x1="${X(it.x2)}" y1="${Y(it.y2)}" x2="${X(bx + nx * ext)}" y2="${Y(by + ny * ext)}" fill="none" stroke="var(--dw-dim)" stroke-width="0.7" vector-effect="non-scaling-stroke"/>`);
        out.push(`<line x1="${X(ax)}" y1="${Y(ay)}" x2="${X(bx)}" y2="${Y(by)}" fill="none" stroke="var(--dw-dim)" stroke-width="0.8" vector-effect="non-scaling-stroke" marker-start="url(#${id('arrd')})" marker-end="url(#${id('arrd')})"/>`);
        let ang = Math.atan2(dy, dx) * 180 / Math.PI;
        if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        const mx = (ax + bx) / 2 + nx * th / S * 0.35 * Math.sign(o || 1), my = (ay + by) / 2 + ny * th / S * 0.35 * Math.sign(o || 1);
        const txt = it.text ?? fmt(len, 2);
        out.push(`<text x="${X(mx)}" y="${Y(my)}" font-size="${(th * 0.8).toFixed(1)}" text-anchor="middle" fill="var(--dw-dim)" font-family="Segoe UI, Arial, sans-serif" transform="rotate(${-ang} ${X(mx)} ${Y(my)})" dy="${o >= 0 ? -th * 0.15 : th * 0.75}">${escx(txt)}</text>`);
        break;
      }
      default: break;
    }
  }
  if (curGroup) out.push('</g>');
  const vw = Wm * S, vh = Hm * S;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw.toFixed(0)} ${vh.toFixed(0)}" ${width ? `width="${width}" height="${(width * vh / vw).toFixed(0)}"` : ''} preserveAspectRatio="xMidYMid meet" style="background:var(--dw-bg)">${out.join('')}</svg>`;
  if (statik) svg = resolveVars(svg);
  return { svg, vw, vh, Wm, Hm, x0, y1 };
}

/** Mount an interactive (pan / zoom) drawing */
export function mountDrawing(container, dw, { height = 380, idPrefix } = {}) {
  container.innerHTML = '';
  container.classList.add('drawing');
  const pid = idPrefix || 'dw' + Math.random().toString(36).slice(2, 8);
  const { svg, vw, vh, Wm } = drawingSVG(dw, { idPrefix: pid });
  container.insertAdjacentHTML('beforeend', svg);
  const el = container.querySelector('svg');
  const maxH = Math.min(height, (container.clientWidth || 800) * vh / vw);
  el.style.height = Math.max(200, maxH) + 'px';
  let vb = { x: 0, y: 0, w: vw, h: vh };
  const apply = () => el.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const sx = Math.min(vb.w / r.width, vb.h / r.height);
    const offX = (r.width - vb.w / sx) / 2, offY = (r.height - vb.h / sx) / 2;
    const px = vb.x + (e.clientX - r.left - offX) * sx;
    const py = vb.y + (e.clientY - r.top - offY) * sx;
    const nw = Math.min(vw * 1.5, Math.max(vw / 40, vb.w * k));
    const f = nw / vb.w;
    vb = { x: px - (px - vb.x) * f, y: py - (py - vb.y) * f, w: nw, h: vb.h * f };
    apply();
  }, { passive: false });
  let drag = null;
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('g.drag')) return; drag = { x: e.clientX, y: e.clientY, vb: { ...vb } }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = el.getBoundingClientRect();
    const sx = Math.max(vb.w / r.width, vb.h / r.height);
    vb = { ...drag.vb, x: drag.vb.x - (e.clientX - drag.x) * sx, y: drag.vb.y - (e.clientY - drag.y) * sx };
    apply();
  });
  el.addEventListener('pointerup', () => { drag = null; });
  const tools = document.createElement('div');
  tools.className = 'dw-tools';
  const mk = (title, svgPath, fn) => { const b = document.createElement('button'); b.title = title; b.innerHTML = `<svg class="icon" viewBox="0 0 24 24">${svgPath}</svg>`; b.onclick = fn; tools.append(b); };
  mk('Zoom in', '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>', () => { const c = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }; vb = { x: c.x - vb.w / 2.6, y: c.y - vb.h / 2.6, w: vb.w / 1.3, h: vb.h / 1.3 }; apply(); });
  mk('Zoom out', '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>', () => { const c = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }; vb = { x: c.x - vb.w * 0.65, y: c.y - vb.h * 0.65, w: vb.w * 1.3, h: vb.h * 1.3 }; apply(); });
  mk('Fit', '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>', () => { vb = { x: 0, y: 0, w: vw, h: vh }; apply(); });
  container.append(tools);
  const sc = document.createElement('div');
  sc.className = 'dw-scale';
  sc.textContent = `${dw.title || ''}${dw.scaleNote ? ' · ' + dw.scaleNote : ''} · width ≈ ${fmt(Wm, 1)} m · scroll to zoom, drag to pan`;
  container.append(sc);
  return el;
}

// ------------------------------------------------------------------ DXF (AutoCAD R12 ASCII)
const LAYER_OF = { concrete: 'CONCRETE', concreteSolid: 'CONCRETE', water: 'WATER', waterline: 'WATER', sand: 'MEDIA', gravel: 'MEDIA', anth: 'MEDIA', soil: 'GROUND', ground: 'GROUND', outline: 'OUTLINE', thick: 'OUTLINE', thin: 'OUTLINE', dash: 'HIDDEN', center: 'CENTER', equip: 'EQUIPMENT', equipFill: 'EQUIPMENT', pipe: 'PIPES', pipeFill: 'PIPES', baffle: 'CONCRETE', building: 'BUILDINGS', process: 'PROCESS', residual: 'RESIDUALS', site: 'BOUNDARY', road: 'ROADS', hgl: 'HGL', sludge: 'RESIDUALS', grid: 'GRID' };
const LAYER_COLOR = { CONCRETE: 8, WATER: 5, MEDIA: 42, GROUND: 32, OUTLINE: 7, HIDDEN: 9, CENTER: 1, EQUIPMENT: 30, PIPES: 4, BUILDINGS: 150, PROCESS: 140, RESIDUALS: 34, BOUNDARY: 3, ROADS: 252, HGL: 1, DIMENSIONS: 2, TEXT: 7, LEVELS: 5, GRID: 253 };
export function drawingDXF(dw) {
  const o = [];
  const p = (code, val) => o.push(String(code), String(val));
  const th = dw.textH || Math.max(dw.bounds.x1 - dw.bounds.x0, dw.bounds.y1 - dw.bounds.y0) / 36;
  p(0, 'SECTION'); p(2, 'HEADER'); p(9, '$ACADVER'); p(1, 'AC1009'); p(9, '$EXTMIN'); p(10, dw.bounds.x0.toFixed(3)); p(20, dw.bounds.y0.toFixed(3)); p(30, 0); p(9, '$EXTMAX'); p(10, dw.bounds.x1.toFixed(3)); p(20, dw.bounds.y1.toFixed(3)); p(30, 0); p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'TABLES');
  p(0, 'TABLE'); p(2, 'LTYPE'); p(70, 1); p(0, 'LTYPE'); p(2, 'CONTINUOUS'); p(70, 0); p(3, 'Solid line'); p(72, 65); p(73, 0); p(40, '0.0'); p(0, 'ENDTAB');
  p(0, 'TABLE'); p(2, 'LAYER'); p(70, Object.keys(LAYER_COLOR).length);
  for (const [name, col] of Object.entries(LAYER_COLOR)) { p(0, 'LAYER'); p(2, name); p(70, 0); p(62, col); p(6, 'CONTINUOUS'); }
  p(0, 'ENDTAB'); p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'ENTITIES');
  const line = (x1, y1, x2, y2, layer) => { p(0, 'LINE'); p(8, layer); p(10, x1.toFixed(4)); p(20, y1.toFixed(4)); p(30, 0); p(11, x2.toFixed(4)); p(21, y2.toFixed(4)); p(31, 0); };
  const pline = (pts, closed, layer) => { p(0, 'POLYLINE'); p(8, layer); p(66, 1); p(70, closed ? 1 : 0); for (const [x, y] of pts) { p(0, 'VERTEX'); p(8, layer); p(10, x.toFixed(4)); p(20, y.toFixed(4)); p(30, 0); } p(0, 'SEQEND'); p(8, layer); };
  const text = (x, y, h, s, layer, rot = 0, align = 0) => { p(0, 'TEXT'); p(8, layer); p(10, x.toFixed(4)); p(20, y.toFixed(4)); p(30, 0); p(40, h.toFixed(4)); p(1, String(s).replace(/[°±Ø×–≥≤μ·▽]/g, (c) => ({ '°': '%%d', '±': '%%p', 'Ø': '%%c', '×': 'x', '–': '-', '≥': '>=', '≤': '<=', 'μ': 'u', '·': '.', '▽': 'v' }[c])).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?')); if (rot) p(50, rot.toFixed(2)); if (align) { p(72, align); p(11, x.toFixed(4)); p(21, y.toFixed(4)); p(31, 0); } };
  for (const it of dw.items) {
    const layer = LAYER_OF[it.cls] || 'OUTLINE';
    const ts = th * (it.size || 1);
    switch (it.t) {
      case 'rect': if (it.cls === 'water' || it.cls === 'road') break; pline([[it.x, it.y], [it.x + it.w, it.y], [it.x + it.w, it.y + it.h], [it.x, it.y + it.h]], true, layer); break;
      case 'poly': pline(it.pts, it.closed !== false, layer); break;
      case 'line': line(it.x1, it.y1, it.x2, it.y2, layer); break;
      case 'circle': p(0, 'CIRCLE'); p(8, layer); p(10, it.cx.toFixed(4)); p(20, it.cy.toFixed(4)); p(30, 0); p(40, it.r.toFixed(4)); break;
      case 'text': text(it.x, it.y, ts * 0.8, it.text, 'TEXT', it.rot || 0, it.anchor === 'middle' ? 1 : it.anchor === 'end' ? 2 : 0); break;
      case 'level': pline([[it.x - th * 0.5, it.y + th * 0.6], [it.x + th * 0.5, it.y + th * 0.6], [it.x, it.y]], true, 'LEVELS'); text(it.x + th * 0.8, it.y + th * 0.2, th * 0.7, it.text, 'LEVELS'); break;
      case 'dim': {
        const dx = it.x2 - it.x1, dy = it.y2 - it.y1; const len = Math.hypot(dx, dy) || 1; const nx = -dy / len, ny = dx / len; const off = it.off ?? 0.5;
        const ax = it.x1 + nx * off, ay = it.y1 + ny * off, bx = it.x2 + nx * off, by = it.y2 + ny * off;
        line(it.x1, it.y1, ax, ay, 'DIMENSIONS'); line(it.x2, it.y2, bx, by, 'DIMENSIONS'); line(ax, ay, bx, by, 'DIMENSIONS');
        const tk = th * 0.3; line(ax - tk, ay - tk, ax + tk, ay + tk, 'DIMENSIONS'); line(bx - tk, by - tk, bx + tk, by + tk, 'DIMENSIONS');
        let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        text((ax + bx) / 2 + nx * th * 0.3, (ay + by) / 2 + ny * th * 0.3, th * 0.65, it.text ?? len.toFixed(2), 'DIMENSIONS', ang, 1);
        break;
      }
      default: break;
    }
  }
  p(0, 'ENDSEC'); p(0, 'EOF');
  return o.join('\r\n');
}
