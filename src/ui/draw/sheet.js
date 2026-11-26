// NWSDB drawing sheets: A3 landscape frame with zone marks, the drawing at a true standard scale, notes and legend,
// graphic scale bar, north arrow for plans and a D3-style caption, and the NWSDB title strip along the bottom as in
// NWSDB drawings (RSC sample "Intake", 2016): logo and the Board's name in English, Sinhala and Tamil | project,
// drawing title and scale | revision table (REV. DESCRIPTION DATE SIGN.) | 3 × 3 signature grid with the drawing
// number and date. The strip keeps the sample's proportions, scaled to A3. One layout description (paper mm, y
// down) draws both the SVG / PDF sheet and the DXF sheet.
import { APP } from '../version.js';
import { fmt } from '../../core/util.js';
import { provinceOf } from '../../core/srilanka.js';
import { SETUP_DEFAULTS } from '../../engine/index.js';
import { LOGO_BANNER, LOGO_BANNER_RATIO } from '../logo.js';
import { drawingSVG } from './render.js';
import { drawingDXF } from './dxf.js';

import { isTrial, trialLabel } from '../edition.js';
export const A3 = { w: 420, h: 297 };
const FR = { x0: 20, y0: 10, x1: 410, y1: 287 }; // frame (20 mm binding margin)
const DA = { x0: 24, y0: 14, x1: 406, y1: 215 }; // drawing area
const NB = { x0: 24, y0: 219, x1: 406, y1: 254 }; // notes + legend band
const TS = { x0: 20, y0: 257, x1: 410, y1: 287 }; // title strip (bottom of the frame, full width)
// title-strip columns (sample proportions 51 : 124 : 225 : 182 : 3 × 70 of 792 mm, scaled to 390 mm)
const CX = { logo: 20, title: 106, rev: 216, sig: 306, end: 410 };
const REVC = [216, 225, 282, 296, 306]; // REV. | DESCRIPTION | DATE | SIGN.
const SIGW = (CX.end - CX.sig) / 3;
export const SCALES = [
  5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000,
];

const CODES = [
  [/^Intake/i, '01'],
  [/aerator/i, '02'],
  [/mixer/i, '03'],
  [/flocculator/i, '04'],
  [/Sedimentation tanks – plan|Circular clarifier/i, '05'],
  [/Sedimentation tank – longitudinal/i, '06'],
  [/Slow sand filters – plan|filter – plan/i, '07'],
  [/filter – cross-section/i, '08'],
  [/Chlorine contact/i, '09'],
  [/Clear water/i, '10'],
  [/Hydraulic profile/i, '11'],
  [/Site layout/i, '12'],
  [/Process flow/i, '00'],
];
/** drawing code: the code assigned by the drawing register (dw.code = structure–view), else by title */
export const drawingCode = (t) =>
  t && typeof t === 'object' ? t.code || drawingCode(t.title) : CODES.find(([re]) => re.test(t || ''))?.[1] || '99';
export const drawingNumber = (setup, t) => `NWSDB/${(setup?.code || 'WTP').replace(/\s+/g, '')}/D-${drawingCode(t)}`;

/** smallest standard scale at which the drawing fits the drawing area */
export function chooseScale(dw) {
  const b = dw.bounds;
  const pad = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.04;
  const Wm = b.x1 - b.x0 + 2 * pad,
    Hm = b.y1 - b.y0 + 2 * pad;
  const need = Math.max((Wm * 1000) / (DA.x1 - DA.x0 - 8), (Hm * 1000) / (DA.y1 - DA.y0 - 24));
  return SCALES.find((s) => s >= need) || Math.ceil(need / 1000) * 1000;
}
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// ------------------------------------------------------------------ signature posts
/** province code used in post titles ({R}), e.g. North Central → NC */
const PROV = {
  Western: 'W',
  Central: 'C',
  Southern: 'S',
  Northern: 'N',
  Eastern: 'E',
  'North Western': 'NW',
  'North Central': 'NC',
  Uva: 'U',
  Sabaragamuwa: 'SAB',
};
export const provinceCode = (district) => PROV[provinceOf(district)] || '';
/** default signature boxes – the posts of the NWSDB sample drawing; {R} = province code */
export const DEFAULT_POSTS = SETUP_DEFAULTS.tbPosts;
// names used when a box has no name of its own: Drawn ← drawn by, Engineer ← designed by, C.E. ← checked by,
// D.G.M. ← approved by (Project setup → Design team)
const POST_FALLBACK = ['drawn', null, null, 'designer', 'checker', null, 'approver'];

/** metadata for the title block from the project */
export function sheetMeta(project, extra = {}) {
  const s = project?.inputs?.setup || {};
  const prov = provinceCode(s.district);
  const meta = {
    project: s.name || 'Water Treatment Plant',
    code: s.code || 'WTP',
    client: s.client || 'National Water Supply & Drainage Board',
    rsc: s.rsc || '',
    location: [s.town, s.district ? s.district + ' District' : ''].filter(Boolean).join(', '),
    designer: s.designer || '',
    checker: s.checker || '',
    approver: s.approver || '',
    date: s.date || new Date().toISOString().slice(0, 10),
    rev: s.revision || 'A',
    drawn: s.drawnBy || '',
    status: s.drawingStatus || 'Preliminary design',
    revDesc: s.revDesc || 'Issued for design review',
    revisions: (s.revisions || []).filter((x) => x && (x.rev || x.desc)),
    sheet: 1,
    sheets: 1,
    ...extra,
  };
  const posts = Array.isArray(s.tbPosts) && s.tbPosts.length ? s.tbPosts : DEFAULT_POSTS;
  meta.posts = DEFAULT_POSTS.map((d, i) => {
    const p = posts[i] || {};
    const title = String(p.title || d.title)
      .replace(/\s*\(\{R\}\)/, prov ? ` (${prov})` : '')
      .replace('{R}', prov);
    return { title, name: p.name || (POST_FALLBACK[i] ? meta[POST_FALLBACK[i]] : '') || '' };
  });
  return meta;
}
const dmy = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(iso || '');
};

const NOTES = [
  'All dimensions are in millimetres and levels are in metres above MSL unless otherwise stated.',
  'Hydraulic / process sizing to NWSDB Design Manuals D2 (1989) and D3 (2020); structural design, reinforcement and joint details by others.',
  'Water-retaining reinforced concrete (C25/30 min., BS EN 1992-3 / BS 8007), cover 40 mm, with water-bars at all construction joints.',
  'Indicative design drawing generated from the design calculations – verify on site before construction.',
];
const wrap = (s, n) => {
  const out = [];
  let cur = '';
  for (const w of String(s).split(' ')) {
    if ((cur + ' ' + w).length > n && cur) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
};
/** font size that fits text into a width (Arial ≈ 0.55 em per character) */
const fit = (s, w, max) => Math.max(1.3, Math.min(max, w / (Math.max(1, String(s).length) * 0.62)));

/**
 * Sheet layout in paper millimetres (y down): lines [x1, y1, x2, y2, weight mm, layer],
 * texts [x, y, size, text, { anchor, bold, underline, color, layer }].
 */
function sheetLayout(dw, meta, scale, isoNts) {
  const L = [],
    T = [];
  const line = (x1, y1, x2, y2, w = 0.25, layer = '0.25') => L.push([x1, y1, x2, y2, w, layer]);
  const rect = (x0, y0, x1, y1, w, layer) => {
    line(x0, y0, x1, y0, w, layer);
    line(x1, y0, x1, y1, w, layer);
    line(x1, y1, x0, y1, w, layer);
    line(x0, y1, x0, y0, w, layer);
  };
  const text = (x, y, size, s, o = {}) => T.push([x, y, size, String(s ?? ''), o]);
  // frame, outer border, zone marks
  rect(FR.x0, FR.y0, FR.x1, FR.y1, 0.7, '0.50');
  rect(FR.x0 - 4, FR.y0 - 4, FR.x1 + 4, FR.y1 + 4, 0.25, '0.00');
  const nx = 8,
    ny = 6;
  for (let i = 0; i <= nx; i++) {
    const x = FR.x0 + ((FR.x1 - FR.x0) * i) / nx;
    line(x, FR.y0 - 4, x, FR.y0, 0.25, '0.00');
    line(x, FR.y1, x, FR.y1 + 4, 0.25, '0.00');
    if (i < nx) {
      const cx = x + (FR.x1 - FR.x0) / nx / 2;
      text(cx, FR.y0 - 1, 2.6, i + 1, { anchor: 'middle' });
      text(cx, FR.y1 + 3.2, 2.6, i + 1, { anchor: 'middle' });
    }
  }
  for (let j = 0; j <= ny; j++) {
    const y = FR.y0 + ((FR.y1 - FR.y0) * j) / ny;
    line(FR.x0 - 4, y, FR.x0, y, 0.25, '0.00');
    line(FR.x1, y, FR.x1 + 4, y, 0.25, '0.00');
    if (j < ny) {
      const cy = y + (FR.y1 - FR.y0) / ny / 2 + 1;
      text(FR.x0 - 2, cy, 2.6, 'ABCDEF'[j], { anchor: 'middle' });
      text(FR.x1 + 2, cy, 2.6, 'ABCDEF'[j], { anchor: 'middle' });
    }
  }
  // caption and scale under the drawing
  const title = dw.title || 'Drawing';
  text((DA.x0 + DA.x1) / 2, DA.y1 - 9, 4.4, `Drawing ${drawingCode(dw)}: ${title}`.slice(0, 120), {
    anchor: 'middle',
    bold: true,
    serif: true,
    layer: 'TEXT TITLE',
  });
  text(
    (DA.x0 + DA.x1) / 2,
    DA.y1 - 4,
    3,
    scale && !isoNts ? `SCALE 1:${scale} (A3)` : isoNts ? 'ISOMETRIC VIEW – NOT TO SCALE' : 'NOT TO SCALE',
    { anchor: 'middle' },
  );
  // ---- notes and legend band
  line(FR.x0, NB.y0 - 2, FR.x1, NB.y0 - 2, 0.5, '0.50');
  line(296, NB.y0, 296, NB.y1, 0.25, '0.00');
  text(NB.x0 + 1, NB.y0 + 3.6, 2.8, 'NOTES', { bold: true, underline: true });
  let ny0 = NB.y0 + 8;
  NOTES.forEach((n, i) => {
    wrap(n, 175).forEach((ln, k) => {
      text(NB.x0 + 1 + (k ? 4 : 0), ny0, 2.2, `${k ? '' : `${i + 1}. `}${ln}`);
      ny0 += 3.1;
    });
    ny0 += 0.6;
  });
  text(300, NB.y0 + 3.6, 2.8, 'LEGEND', { bold: true, underline: true });
  // ---- title strip
  const S = TS;
  line(S.x0, S.y0, S.x1, S.y0, 0.5, '0.50');
  for (const x of [CX.title, CX.rev, CX.sig]) line(x, S.y0, x, S.y1, 0.5, '0.50');
  // revision table
  for (const x of REVC.slice(1, -1)) line(x, S.y0, x, S.y1, 0.25, '0.25');
  for (let k = 1; k < 6; k++) line(CX.rev, S.y0 + k * 5, CX.sig, S.y0 + k * 5, k === 1 ? 0.35 : 0.18, '0.25');
  [
    ['REV.', 0],
    ['DESCRIPTION', 1],
    ['DATE', 2],
    ['SIGN.', 3],
  ].forEach(([t, i]) => text((REVC[i] + REVC[i + 1]) / 2, S.y0 + 3.6, 1.9, t, { anchor: 'middle', bold: true }));
  const revs = [
    ...(meta.revisions || []).map((r) => [r.rev, r.desc, r.date, '']),
    [meta.rev, meta.revDesc, meta.date, ''],
  ].slice(-5);
  revs.forEach(([rv, desc, dt], k) => {
    const y = S.y0 + 5 + k * 5 + 3.6;
    text((REVC[0] + REVC[1]) / 2, y, 2, rv || '', { anchor: 'middle' });
    text(REVC[1] + 1, y, fit(desc || '', REVC[2] - REVC[1] - 2, 2), desc || '');
    text((REVC[2] + REVC[3]) / 2, y, fit(dmy(dt), REVC[3] - REVC[2] - 1, 1.8), dmy(dt), { anchor: 'middle' });
  });
  // signature grid: posts 1–7, drawing number, date
  for (let k = 1; k < 3; k++) line(CX.sig, S.y0 + k * 10, CX.end, S.y0 + k * 10, 0.25, '0.25');
  for (let k = 1; k < 3; k++) line(CX.sig + k * SIGW, S.y0, CX.sig + k * SIGW, S.y1, 0.25, '0.25');
  const p = meta.posts || [];
  const number = drawingNumber({ code: meta.code }, dw);
  const cells = [
    [p[0], p[1], p[2]],
    [p[3], p[4], { title: `DRG NO. · REV. ${meta.rev}`, name: number, strong: true }],
    [p[5], p[6], { title: 'DATE', name: dmy(meta.date), strong: true }],
  ];
  cells.forEach((row, r) =>
    row.forEach((c, k) => {
      if (!c) return;
      const cx = CX.sig + k * SIGW + SIGW / 2,
        y0 = S.y0 + r * 10;
      if (c.name)
        text(cx, y0 + 4.6, fit(c.name, SIGW - 2, c.strong ? 2.3 : 2.2), c.name, {
          anchor: 'middle',
          bold: !!c.strong,
        });
      text(cx, y0 + 8.6, fit(c.title, SIGW - 2, 1.8), c.title, { anchor: 'middle', color: '#444' });
    }),
  );
  // project, drawing title and scale
  const tc = (CX.title + CX.rev) / 2,
    tw = CX.rev - CX.title - 4;
  const proj = meta.project.toUpperCase();
  text(tc, S.y0 + 5, fit(proj, tw, 3.2), proj, { anchor: 'middle', bold: true, underline: true, layer: 'TEXT TITLE' });
  const sub = [meta.location, meta.rsc].filter(Boolean).join(' · ');
  if (sub) text(tc, S.y0 + 9, fit(sub, tw, 2), sub, { anchor: 'middle' });
  const [grp, view] = String(dw.group ? `${dw.group} – ${dw.view || ''}` : title)
    .split(' – ')
    .map((x) => (x || '').trim().toUpperCase());
  text(tc, S.y0 + 14.4, fit(grp, tw, 2.9), grp, { anchor: 'middle', bold: true });
  if (view) text(tc, S.y0 + 18.6, fit(view, tw, 2.5), view, { anchor: 'middle' });
  const sc = scale && !isoNts ? `SCALE:- 1:${scale} (A3)` : 'SCALE:- NOT TO SCALE';
  text(tc, S.y0 + 23, 2.3, sc, { anchor: 'middle', underline: true });
  text(CX.title + 2, S.y1 - 1.6, 1.8, String(meta.status || '').toUpperCase(), { bold: true, color: '#b3001b' });
  text(CX.rev - 2, S.y1 - 1.6, 1.6, APP, { anchor: 'end', color: '#0b4a92' });
  // logo + name: text for the DXF (the SVG shows the banner image)
  T.push([CX.logo, S.y0, 0, '', { logo: true }]);
  if (isTrial()) {
    text((DA.x0 + DA.x1) / 2, (DA.y0 + DA.y1) / 2, 12, trialLabel(), { anchor: 'middle', color: '#b3001b' });
    text(FR.x0 + 3, FR.y0 + 4.2, 2.6, trialLabel(), { bold: true, color: '#b3001b' });
  }
  return { lines: L, texts: T };
}

// ------------------------------------------------------------------ SVG (screen, PDF)
/** A3 landscape NWSDB sheet as an SVG string (always print colours) */
export function sheetSVG(dw, meta, { scale: forceScale, nts = false, inner } = {}) {
  const scale = nts ? null : forceScale || chooseScale(dw);
  const isoNts = !!dw.nts; // isometric views are placed to fit but are not measurable
  const title = dw.title || 'Drawing';
  const out = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${A3.w} ${A3.h}" width="${A3.w}mm" height="${A3.h}mm" font-family="Arial, Helvetica, sans-serif" style="background:#fff">`,
  );
  out.push(`<rect width="${A3.w}" height="${A3.h}" fill="#fff"/>`);
  // ---- drawing at true scale
  if (inner) {
    // pre-rendered (not to scale) content, e.g. the process flow diagram
    const availW = DA.x1 - DA.x0 - 6,
      availH = DA.y1 - DA.y0 - 22;
    const k = Math.min(availW / inner.W, availH / inner.H);
    const wmm = inner.W * k,
      hmm = inner.H * k;
    const x = DA.x0 + (DA.x1 - DA.x0 - wmm) / 2,
      y = DA.y0 + 4;
    out.push(
      inner.svg
        .replace(
          /^<svg /,
          `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${wmm.toFixed(2)}" height="${hmm.toFixed(2)}" `,
        )
        .replace(/width="100%"/, '')
        .replace(/style="max-width:[^"]*"/, ''),
    );
  } else {
    const th = (3.0 * scale) / 1000; // 3 mm text on paper
    const d2 = { ...dw, textH: th };
    const { svg, Wm, Hm } = drawingSVG(d2, {
      statik: true,
      idPrefix: 's' + drawingCode(dw).replace(/\W/g, '') + Math.random().toString(36).slice(2, 6),
    });
    const wmm = (Wm * 1000) / scale,
      hmm = (Hm * 1000) / scale;
    const x = DA.x0 + (DA.x1 - DA.x0 - wmm) / 2,
      y = DA.y0 + Math.max(2, (DA.y1 - DA.y0 - 22 - hmm) / 2);
    out.push(
      svg
        .replace(
          /^<svg /,
          `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${wmm.toFixed(2)}" height="${hmm.toFixed(2)}" `,
        )
        .replace(/style="background:[^"]*"/, ''),
    );
    // north arrow for plans
    if (
      /plan/i.test(title) &&
      !/arrangement/i.test(title) &&
      !dw.items.some((it) => it.t === 'text' && it.text === 'N')
    )
      out.push(
        `<g transform="translate(${DA.x1 - 14},${DA.y0 + 14})"><circle r="7" fill="none" stroke="#000" stroke-width="0.35"/><path d="M0,-9L3,4L0,2L-3,4Z" fill="#000"/><text y="-10.5" font-size="3.4" font-weight="700" text-anchor="middle">N</text></g>`,
      );
  }
  if (scale && !isoNts) {
    // graphic scale bar: about 60 mm long, in round metres
    const target = (60 * scale) / 1000;
    const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100].find((v) => v * 5 >= target) || 100;
    const segMm = (step * 1000) / scale;
    const bx = DA.x0 + 6,
      by = DA.y1 - 7;
    for (let i = 0; i < 5; i++)
      out.push(
        `<rect x="${(bx + i * segMm).toFixed(2)}" y="${by}" width="${segMm.toFixed(2)}" height="1.6" fill="${i % 2 ? '#fff' : '#000'}" stroke="#000" stroke-width="0.25"/>`,
      );
    for (let i = 0; i <= 5; i++)
      out.push(
        `<text x="${(bx + i * segMm).toFixed(2)}" y="${by - 1.2}" font-size="2.4" text-anchor="middle">${fmt(step * i, Number.isInteger(step) ? 0 : step < 1 && (step * 10) % 1 ? 2 : 1)}</text>`,
      );
    out.push(`<text x="${(bx + 5 * segMm + 2).toFixed(2)}" y="${by + 1.5}" font-size="2.4">m</text>`);
  }
  const { lines, texts } = sheetLayout(dw, meta, scale, isoNts);
  // white under the title strip and notes band (a drawing never runs under them)
  out.push(`<rect x="${FR.x0}" y="${NB.y0 - 2}" width="${FR.x1 - FR.x0}" height="${FR.y1 - NB.y0 + 2}" fill="#fff"/>`);
  for (const [x1, y1, x2, y2, w] of lines)
    out.push(
      `<path d="M${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}" stroke="#000" stroke-width="${w}"/>`,
    );
  for (const [x, y, size, s, o] of texts) {
    if (o.logo) {
      // banner: emblem + the Board's name in Sinhala, Tamil and English
      const w = CX.title - CX.logo - 4,
        h = Math.min(TS.y1 - TS.y0 - 4, w / LOGO_BANNER_RATIO);
      out.push(
        `<image x="${CX.logo + 2}" y="${(TS.y0 + (TS.y1 - TS.y0 - h) / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" href="${LOGO_BANNER}" xlink:href="${LOGO_BANNER}" preserveAspectRatio="xMidYMid meet"/>`,
      );
      continue;
    }
    if (!s) continue;
    const trial = o.color === '#b3001b' && size >= 12;
    out.push(
      `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${size.toFixed(2)}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.bold ? ' font-weight="700"' : ''}${o.underline ? ' text-decoration="underline"' : ''}${o.color ? ` fill="${o.color}"` : ''}${o.serif ? ' font-family="Times New Roman, Times, serif"' : ''}${trial ? ` fill-opacity="0.13" transform="rotate(-24 ${x} ${y})"` : ''}>${esc(s)}</text>`,
    );
  }
  // legend symbols (two columns)
  const LX = 300,
    LY = NB.y0 + 7;
  const xh = (x, y, w, hh) => {
    let d = '';
    for (let k = -hh; k <= w; k += 1.6) d += `M${x + k},${y + hh}L${x + k + hh},${y}`;
    return `<clipPath id="lgc${Math.round(x * 10)}${Math.round(y * 10)}"><rect x="${x}" y="${y}" width="${w}" height="${hh}"/></clipPath><path d="${d}" clip-path="url(#lgc${Math.round(x * 10)}${Math.round(y * 10)})" stroke="#000" stroke-width=".2" fill="none"/>`;
  };
  const lg = [
    [
      (x, y) =>
        `${xh(x, y, 9, 4)}<rect x="${x}" y="${y}" width="9" height="4" fill="none" stroke="#000" stroke-width=".4"/>`,
      'Reinforced concrete',
    ],
    [(x, y) => `<path d="M${x},${y + 2}h9" stroke="#2a78d6" stroke-width=".5"/>`, 'Water surface'],
    [(x, y) => `<path d="M${x + 2},${y}h5l-2.5,3z" fill="#fff" stroke="#000" stroke-width=".3"/>`, 'Level (m MSL)'],
    [
      (x, y) =>
        `<path d="M${x},${y + 2}h9" stroke="#000" stroke-width=".3"/><path d="M${x},${y + 2}l2,-.6v1.2zM${x + 9},${y + 2}l-2,-.6v1.2z"/>`,
      'Dimension (mm)',
    ],
    [
      (x, y) => `<rect x="${x}" y="${y}" width="9" height="4" fill="#e8d29b" stroke="#22324a" stroke-width=".2"/>`,
      'Filter sand / media',
    ],
    [
      (x, y) => `<path d="M${x},${y + 2}h9" stroke="#000" stroke-width=".3" stroke-dasharray="4 1 1 1"/>`,
      'Centre / section line',
    ],
  ];
  lg.forEach(([sym, txt], i) => {
    const x = LX + (i % 2) * 53,
      y = LY + Math.floor(i / 2) * 8.5;
    out.push(sym(x, y));
    out.push(`<text x="${x + 11}" y="${y + 3.2}" font-size="2.3">${txt}</text>`);
  });
  out.push('</svg>');
  return {
    svg: out.join(''),
    scale: isoNts ? null : scale,
    code: drawingCode(dw),
    number: drawingNumber({ code: meta.code }, dw),
  };
}

/** HTML document with one A3 landscape sheet per page (for PDF printing) */
export function sheetsHTML(sheets, title = 'Drawings') {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page { size: 420mm 297mm; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.sheet { width: 420mm; height: 297mm; page-break-after: always; break-after: page; overflow: hidden; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.sheet > svg { width: 420mm; height: 297mm; display: block; }
@media screen { body { background: #8a96a6; } .sheet { margin: 10mm auto; box-shadow: 0 4px 18px rgba(0,0,0,.35); background: #fff; } }
</style></head><body>${sheets.map((s) => `<div class="sheet">${s}</div>`).join('')}</body></html>`;
}

// ------------------------------------------------------------------ DXF sheet (model space, millimetres)
const NAME_SI = 'ජාතික ජල සම්පාදන හා ජලාපවහන මණ්ඩලය';
const NAME_TA = 'தேசிய நீர் வழங்கல் வடிகாலமைப்புச் சபை';
/**
 * DXF of the drawing with the A3 sheet around it, drawn in model space at the drawing scale (paper mm × scale =
 * model mm): sheet edge on NPRINT (does not plot), frame on 0.50, title-block grid on 0.25, text on TEXT.
 */
export function sheetDXF(dw, meta) {
  const scale = chooseScale(dw);
  const isoNts = !!dw.nts;
  const b = dw.bounds;
  const cxm = ((b.x0 + b.x1) / 2) * 1000,
    cym = ((b.y0 + b.y1) / 2) * 1000;
  const daCx = (DA.x0 + DA.x1) / 2,
    daCy = (DA.y0 + (DA.y1 - 22)) / 2;
  const X = (xp) => cxm + (xp - daCx) * scale;
  const Y = (yp) => cym - (yp - daCy) * scale; // paper y down → model y up
  return drawingDXF(dw, {
    scale,
    extra: (x) => {
      const { lines, texts } = sheetLayout(dw, meta, scale, isoNts);
      // sheet edge (not plotted)
      x.poly(
        [
          [X(0), Y(0)],
          [X(A3.w), Y(0)],
          [X(A3.w), Y(A3.h)],
          [X(0), Y(A3.h)],
        ],
        true,
        'NPRINT',
      );
      for (const [x1, y1, x2, y2, , layer] of lines) x.line(X(x1), Y(y1), X(x2), Y(y2), layer);
      for (const [tx, ty, size, s, o] of texts) {
        if (o.logo) {
          // vector emblem and the Board's name in three languages (Sinhala / Tamil in the Nirmala UI font)
          const ex = CX.logo + 12,
            ey = TS.y0 + 15,
            r = 10;
          x.circle(X(ex), Y(ey), r * scale, 'LOGO');
          x.circle(X(ex), Y(ey), (r - 1.2) * scale, 'LOGO');
          const drop = Array.from({ length: 25 }, (_, i) => {
            const t = (i / 24) * 2 * Math.PI;
            const px = Math.sin(t) * (1 - Math.cos(t)) * 0.5 * 5.2,
              py = -Math.cos(t) * 6.5 + 1.5;
            return [X(ex + px), Y(ey - py)];
          });
          x.poly(drop, true, 'LOGO');
          for (const k of [0, 1]) {
            const wy = ey + 3.2 + k * 1.8;
            x.poly(
              Array.from({ length: 13 }, (_, i) => [
                X(ex - 5 + (i * 10) / 12),
                Y(wy + Math.sin((i / 12) * 4 * Math.PI) * 0.45),
              ]),
              false,
              'LOGO',
            );
          }
          const nx = CX.logo + 24,
            nw = CX.title - nx - 2;
          x.text(
            X(nx),
            Y(TS.y0 + 6.5),
            fit('NATIONAL WATER SUPPLY', nw, 3) * scale,
            'NATIONAL WATER SUPPLY',
            'TEXT TITLE',
            { style: 'SANS BOLD' },
          );
          x.text(X(nx), Y(TS.y0 + 11), fit('AND DRAINAGE BOARD', nw, 3) * scale, 'AND DRAINAGE BOARD', 'TEXT TITLE', {
            style: 'SANS BOLD',
          });
          x.text(X(nx), Y(TS.y0 + 17.5), Math.min(2.4, nw / (NAME_SI.length * 0.5)) * scale, NAME_SI, 'TEXT');
          x.text(X(nx), Y(TS.y0 + 23.5), Math.min(2.2, nw / (NAME_TA.length * 0.5)) * scale, NAME_TA, 'TEXT');
          continue;
        }
        if (!s) continue;
        const str = o.underline ? `%%U${s}` : s;
        x.text(X(tx), Y(ty), size * scale, str, o.layer || 'TEXT', {
          align: o.anchor === 'middle' ? 1 : o.anchor === 'end' ? 2 : 0,
          style: o.bold ? 'SANS BOLD' : undefined,
        });
      }
      // scale bar (5 segments) under the drawing
      if (scale && !isoNts) {
        const target = (60 * scale) / 1000;
        const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100].find((v) => v * 5 >= target) || 100;
        const seg = (step * 1000) / scale,
          bx = DA.x0 + 6,
          by = DA.y1 - 7;
        for (let i = 0; i < 5; i++) {
          const pts = [
            [X(bx + i * seg), Y(by)],
            [X(bx + (i + 1) * seg), Y(by)],
            [X(bx + (i + 1) * seg), Y(by + 1.6)],
            [X(bx + i * seg), Y(by + 1.6)],
          ];
          if (i % 2 === 0) x.solid(pts, 'DIM');
          x.poly(pts, true, 'DIM');
        }
        for (let i = 0; i <= 5; i++)
          x.text(X(bx + i * seg), Y(by - 1.2), 2.4 * scale, fmt(step * i, Number.isInteger(step) ? 0 : 2), 'TEXT', {
            align: 1,
          });
        x.text(X(bx + 5 * seg + 2), Y(by + 1.5), 2.4 * scale, 'm', 'TEXT');
      }
      // legend (text and simple symbols)
      const LX = 300,
        LY = NB.y0 + 7;
      [
        'Reinforced concrete',
        'Water surface',
        'Level (m MSL)',
        'Dimension (mm)',
        'Filter sand / media',
        'Centre / section line',
      ].forEach((t, i) => {
        const lx = LX + (i % 2) * 53,
          ly = LY + Math.floor(i / 2) * 8.5;
        const layer = ['wall', 'WATER', 'DIM', 'DIM', 'OL', 'CL'][i];
        if (i === 0 || i === 4)
          x.poly(
            [
              [X(lx), Y(ly)],
              [X(lx + 9), Y(ly)],
              [X(lx + 9), Y(ly + 4)],
              [X(lx), Y(ly + 4)],
            ],
            true,
            layer,
          );
        else x.line(X(lx), Y(ly + 2), X(lx + 9), Y(ly + 2), layer);
        x.text(X(lx + 11), Y(ly + 3.2), 2.3 * scale, t, 'TEXT');
      });
    },
  });
}
