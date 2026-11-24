// NWSDB drawing sheets: A3 landscape frame with zone marks, title block (NWSDB logo, project, drawing title,
// drawing number, scale, sheet, revision, designed / drawn / checked / approved), notes, legend, graphic scale bar,
// north arrow for plans and a D3-style figure caption.  The drawing is placed at a true standard scale so the
// printed A3 sheet can be measured.  Also produces the same sheet in DXF (model space, scaled frame).
import { APP } from '../version.js';
import { fmt } from '../../core/util.js';
import { LOGO_BANNER, LOGO_BANNER_RATIO } from '../logo.js';
import { drawingDXF, drawingSVG } from './render.js';

import { isTrial, trialLabel } from '../edition.js';
export const A3 = { w: 420, h: 297 };
const FR = { x0: 20, y0: 10, x1: 410, y1: 287 };             // frame (20 mm binding margin)
const DA = { x0: 24, y0: 14, x1: 406, y1: 214 };             // drawing area (above the title strip)
const TB = { x0: 230, y0: 218, x1: 406, y1: 283 };           // title block
const NB = { x0: 24, y0: 218, x1: 226, y1: 283 };            // notes + legend
export const SCALES = [5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000];

const CODES = [[/^Intake/i, '01'], [/aerator/i, '02'], [/mixer/i, '03'], [/flocculator/i, '04'], [/Sedimentation tanks – plan|Circular clarifier/i, '05'], [/Sedimentation tank – longitudinal/i, '06'], [/Slow sand filters – plan|filter – plan/i, '07'], [/filter – cross-section/i, '08'], [/Chlorine contact/i, '09'], [/Clear water/i, '10'], [/Hydraulic profile/i, '11'], [/Site layout/i, '12'], [/Process flow/i, '00']];
/** drawing code: the code assigned by the drawing register (dw.code = structure–view), else by title */
export const drawingCode = (t) => (t && typeof t === 'object' ? t.code || drawingCode(t.title) : CODES.find(([re]) => re.test(t || ''))?.[1] || '99');
export const drawingNumber = (setup, t) => `NWSDB/${(setup?.code || 'WTP').replace(/\s+/g, '')}/D-${drawingCode(t)}`;

/** smallest standard scale at which the drawing fits the drawing area */
export function chooseScale(dw) {
  const b = dw.bounds;
  const pad = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.04;
  const Wm = b.x1 - b.x0 + 2 * pad, Hm = b.y1 - b.y0 + 2 * pad;
  const need = Math.max((Wm * 1000) / (DA.x1 - DA.x0 - 8), (Hm * 1000) / (DA.y1 - DA.y0 - 24));
  return SCALES.find((s) => s >= need) || Math.ceil(need / 1000) * 1000;
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** metadata for the title block from the project */
export function sheetMeta(project, extra = {}) {
  const s = project?.inputs?.setup || {};
  return {
    project: s.name || 'Water Treatment Plant', code: s.code || 'WTP', client: s.client || 'National Water Supply & Drainage Board', rsc: s.rsc || '',
    location: [s.town, s.district ? s.district + ' District' : ''].filter(Boolean).join(', '), designer: s.designer || '', checker: s.checker || '', approver: s.approver || '',
    date: s.date || new Date().toISOString().slice(0, 10), rev: s.revision || 'A', drawn: s.drawnBy || '', status: s.drawingStatus || 'Preliminary design', revDesc: s.revDesc || 'Issued for design review',
    revisions: (s.revisions || []).filter((x) => x && (x.rev || x.desc)).slice(-1), sheet: 1, sheets: 1, ...extra,
  };
}

const NOTES = [
  'All dimensions are in metres and all levels in metres above MSL unless otherwise stated.',
  'Hydraulic / process sizing to NWSDB Design Manuals D2 (1989) and D3 (2020); structural design, reinforcement and joint details by others.',
  'Water-retaining reinforced concrete (C25/30 min., BS EN 1992-3 / BS 8007), cover 40 mm, with water-bars at all construction joints.',
  'Indicative design drawing generated from the design calculations – verify on site before construction.',
];

/** A3 landscape NWSDB sheet as an SVG string (always print colours) */
export function sheetSVG(dw, meta, { scale: forceScale, nts = false, inner } = {}) {
  const scale = nts ? null : forceScale || chooseScale(dw);
  const isoNts = !!dw.nts; // isometric views are placed to fit but are not measurable
  const title = dw.title || 'Drawing';
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${A3.w} ${A3.h}" width="${A3.w}mm" height="${A3.h}mm" font-family="Arial, Helvetica, sans-serif" style="background:#fff">`);
  out.push(`<rect width="${A3.w}" height="${A3.h}" fill="#fff"/>`);
  // frame + zone marks
  out.push(`<rect x="${FR.x0}" y="${FR.y0}" width="${FR.x1 - FR.x0}" height="${FR.y1 - FR.y0}" fill="none" stroke="#000" stroke-width="0.7"/>`);
  out.push(`<rect x="${FR.x0 - 4}" y="${FR.y0 - 4}" width="${FR.x1 - FR.x0 + 8}" height="${FR.y1 - FR.y0 + 8}" fill="none" stroke="#000" stroke-width="0.25"/>`);
  const nx = 8, ny = 6;
  for (let i = 0; i <= nx; i++) { const x = FR.x0 + ((FR.x1 - FR.x0) * i) / nx; out.push(`<path d="M${x},${FR.y0 - 4}V${FR.y0}M${x},${FR.y1}V${FR.y1 + 4}" stroke="#000" stroke-width="0.25"/>`); if (i < nx) { const cx = x + (FR.x1 - FR.x0) / nx / 2; out.push(`<text x="${cx}" y="${FR.y0 - 1}" font-size="2.6" text-anchor="middle">${i + 1}</text><text x="${cx}" y="${FR.y1 + 3.2}" font-size="2.6" text-anchor="middle">${i + 1}</text>`); } }
  for (let j = 0; j <= ny; j++) { const y = FR.y0 + ((FR.y1 - FR.y0) * j) / ny; out.push(`<path d="M${FR.x0 - 4},${y}H${FR.x0}M${FR.x1},${y}H${FR.x1 + 4}" stroke="#000" stroke-width="0.25"/>`); if (j < ny) { const cy = y + (FR.y1 - FR.y0) / ny / 2 + 1; out.push(`<text x="${FR.x0 - 2}" y="${cy}" font-size="2.6" text-anchor="middle">${'ABCDEF'[j]}</text><text x="${FR.x1 + 2}" y="${cy}" font-size="2.6" text-anchor="middle">${'ABCDEF'[j]}</text>`); } }
  out.push(`<path d="M${FR.x0},${TB.y0 - 4}H${FR.x1}" stroke="#000" stroke-width="0.5"/>`);
  // ---- drawing at true scale
  let wmm = 0, hmm = 0;
  if (inner) {
    // pre-rendered (not to scale) content, e.g. the process flow diagram
    const availW = DA.x1 - DA.x0 - 6, availH = DA.y1 - DA.y0 - 22;
    const k = Math.min(availW / inner.W, availH / inner.H);
    wmm = inner.W * k; hmm = inner.H * k;
    const x = DA.x0 + (DA.x1 - DA.x0 - wmm) / 2, y = DA.y0 + 4;
    out.push(inner.svg.replace(/^<svg /, `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${wmm.toFixed(2)}" height="${hmm.toFixed(2)}" `).replace(/width="100%"/, '').replace(/style="max-width:[^"]*"/, ''));
  } else {
    const th = (3.0 * scale) / 1000; // 3 mm text on paper
    const d2 = { ...dw, textH: th };
    const { svg, Wm, Hm } = drawingSVG(d2, { statik: true, idPrefix: 's' + drawingCode(dw).replace(/\W/g, '') + Math.random().toString(36).slice(2, 6) });
    wmm = (Wm * 1000) / scale; hmm = (Hm * 1000) / scale;
    const x = DA.x0 + (DA.x1 - DA.x0 - wmm) / 2, y = DA.y0 + Math.max(2, (DA.y1 - DA.y0 - 22 - hmm) / 2);
    out.push(svg.replace(/^<svg /, `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${wmm.toFixed(2)}" height="${hmm.toFixed(2)}" `).replace(/style="background:[^"]*"/, ''));
    // north arrow for plans
    if (/plan/i.test(title) && !/arrangement/i.test(title) && !dw.items.some((it) => it.t === 'text' && it.text === 'N')) out.push(`<g transform="translate(${DA.x1 - 14},${DA.y0 + 14})"><circle r="7" fill="none" stroke="#000" stroke-width="0.35"/><path d="M0,-9L3,4L0,2L-3,4Z" fill="#000"/><text y="-10.5" font-size="3.4" font-weight="700" text-anchor="middle">N</text></g>`);
  }
  // caption + scale bar (D3 annex style: bold, centred)
  const capY = DA.y1 - 9;
  out.push(`<text x="${(DA.x0 + DA.x1) / 2}" y="${capY}" font-family="Times New Roman, Times, serif" font-size="4.4" font-weight="700" text-anchor="middle">${esc(`Drawing ${drawingCode(dw)}: ${title}`.slice(0, 120))}</text>`);
  out.push(`<text x="${(DA.x0 + DA.x1) / 2}" y="${capY + 5}" font-size="3" text-anchor="middle">${scale && !isoNts ? `SCALE 1:${scale} (A3)` : isoNts ? 'ISOMETRIC VIEW – NOT TO SCALE' : 'NOT TO SCALE'}</text>`);
  if (scale && !isoNts) {
    // graphic scale bar: about 60 mm long, in round metres
    const target = (60 * scale) / 1000; // metres
    const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100].find((v) => v * 5 >= target) || 100;
    const segMm = (step * 1000) / scale;
    const bx = DA.x0 + 6, by = DA.y1 - 7;
    for (let i = 0; i < 5; i++) out.push(`<rect x="${(bx + i * segMm).toFixed(2)}" y="${by}" width="${segMm.toFixed(2)}" height="1.6" fill="${i % 2 ? '#fff' : '#000'}" stroke="#000" stroke-width="0.25"/>`);
    for (let i = 0; i <= 5; i++) out.push(`<text x="${(bx + i * segMm).toFixed(2)}" y="${by - 1.2}" font-size="2.4" text-anchor="middle">${fmt(step * i, Number.isInteger(step) ? 0 : step < 1 && (step * 10) % 1 ? 2 : 1)}</text>`);
    out.push(`<text x="${(bx + 5 * segMm + 2).toFixed(2)}" y="${by + 1.5}" font-size="2.4">m</text>`);
  }
  // ---- notes + legend
  out.push(`<rect x="${NB.x0}" y="${NB.y0}" width="${NB.x1 - NB.x0}" height="${NB.y1 - NB.y0}" fill="none" stroke="#000" stroke-width="0.35"/>`);
  out.push(`<path d="M${NB.x0 + 132},${NB.y0}V${NB.y1}" stroke="#000" stroke-width="0.35"/>`);
  out.push(`<text x="${NB.x0 + 3}" y="${NB.y0 + 5}" font-size="3" font-weight="700">NOTES</text>`);
  let ny0 = NB.y0 + 10;
  NOTES.forEach((n, i) => {
    const words = n.split(' '); const lines = []; let cur = '';
    for (const w of words) { if ((cur + ' ' + w).length > 70) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) lines.push(cur);
    lines.forEach((ln, k) => { out.push(`<text x="${NB.x0 + 3 + (k ? 4 : 0)}" y="${ny0}" font-size="2.35">${k ? '' : `${i + 1}. `}${esc(ln)}</text>`); ny0 += 3.4; });
    ny0 += 1;
  });
  const LX = NB.x0 + 135;
  out.push(`<text x="${LX}" y="${NB.y0 + 5}" font-size="3" font-weight="700">LEGEND</text>`);
  const xh = (x, y, w, hh) => { let d = ''; for (let k = -hh; k <= w; k += 1.6) d += `M${x + k},${y}L${x + k + hh},${y + hh}M${x + k},${y + hh}L${x + k + hh},${y}`; return `<clipPath id="lgc${Math.round(x * 10)}${Math.round(y * 10)}"><rect x="${x}" y="${y}" width="${w}" height="${hh}"/></clipPath><path d="${d}" clip-path="url(#lgc${Math.round(x * 10)}${Math.round(y * 10)})" stroke="#d0313f" stroke-width=".2" fill="none"/>`; };
  const lg = [
    [`${xh(LX, NB.y0 + 9, 9, 5)}<rect x="${LX}" y="${NB.y0 + 9}" width="9" height="5" fill="none" stroke="#b3001b" stroke-width=".4"/>`, 'Reinforced concrete'],
    [`<rect x="${LX}" y="${NB.y0 + 18}" width="9" height="5" fill="rgba(42,120,214,.18)"/><path d="M${LX},${NB.y0 + 18}h9" stroke="#2a78d6" stroke-width=".5"/>`, 'Water / water surface'],
    [`<path d="M${LX + 2},${NB.y0 + 27}h5l-2.5,3z" fill="#fff" stroke="#000" stroke-width=".3"/>`, 'Water / structure level (m MSL)'],
    [`<path d="M${LX},${NB.y0 + 38.5}h9" stroke="#000" stroke-width=".3" marker-end="url(#lg-a)"/><defs><marker id="lg-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,1L10,5L0,9z"/></marker></defs>`, 'Dimension (m)'],
    [`<rect x="${LX}" y="${NB.y0 + 45}" width="9" height="5" fill="#e8d29b" stroke="#22324a" stroke-width=".2"/>`, 'Filter sand / media'],
    [`<path d="M${LX},${NB.y0 + 56}h9" stroke="#eb6834" stroke-width=".7"/>`, 'Mechanical equipment'],
  ];
  lg.forEach(([sym, txt], i) => { out.push(sym); out.push(`<text x="${LX + 12}" y="${NB.y0 + 13 + i * 9.2}" font-size="2.5">${txt}</text>`); });
  // ---- title block
  const L = TB.x0, R = TB.x1, W = R - L;
  const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="0.35"/>`;
  const lab = (x, y, t) => `<text x="${x}" y="${y}" font-size="1.9" fill="#555">${esc(t)}</text>`;
  const val = (x, y, t, size = 2.8, bold = false, anchor = 'start') => `<text x="${x}" y="${y}" font-size="${size}" ${bold ? 'font-weight="700"' : ''} text-anchor="${anchor}">${esc(t)}</text>`;
  out.push(`<rect x="${L}" y="${TB.y0}" width="${W}" height="${TB.y1 - TB.y0}" fill="#fff" stroke="#000" stroke-width="0.6"/>`);
  // logo row
  const logoH = 10.5, logoW = logoH * LOGO_BANNER_RATIO;
  out.push(`<image x="${L + 2}" y="${TB.y0 + 1.5}" width="${logoW.toFixed(2)}" height="${logoH}" href="${LOGO_BANNER}" xlink:href="${LOGO_BANNER}" preserveAspectRatio="xMinYMid meet"/>`);
  out.push(val(R - 2, TB.y0 + 5.5, (meta.rsc || 'NWSDB').toUpperCase(), 2.4, true, 'end'));
  out.push(val(R - 2, TB.y0 + 9.5, 'WATER TREATMENT PLANT – DESIGN', 2.2, false, 'end'));
  out.push(`<path d="M${L},${TB.y0 + 13.5}H${R}" stroke="#000" stroke-width="0.35"/>`);
  // project
  out.push(lab(L + 2, TB.y0 + 16.3, 'PROJECT'));
  out.push(val(L + 2, TB.y0 + 20.5, meta.project.length > 62 ? meta.project.slice(0, 60) + '…' : meta.project, 3, true));
  out.push(val(L + 2, TB.y0 + 24.2, [meta.location, meta.client].filter(Boolean).join(' · ').slice(0, 92), 2.1));
  out.push(`<path d="M${L},${TB.y0 + 26}H${R}" stroke="#000" stroke-width="0.35"/>`);
  // drawing title
  out.push(lab(L + 2, TB.y0 + 28.8, 'DRAWING TITLE'));
  const t1 = title.toUpperCase();
  out.push(val(L + 2, TB.y0 + 33.4, t1.length > 58 ? t1.slice(0, 57) + '…' : t1, 3.3, true));
  out.push(`<path d="M${L},${TB.y0 + 36}H${R}" stroke="#000" stroke-width="0.35"/>`);
  // people
  const pw = W / 4;
  [['DESIGNED', meta.designer], ['DRAWN', meta.drawn || 'WTP Designer'], ['CHECKED', meta.checker], ['APPROVED', meta.approver]].forEach(([k, v], i) => {
    out.push(box(L + i * pw, TB.y0 + 36, pw, 9.5)); out.push(lab(L + i * pw + 1.5, TB.y0 + 38.6, k)); out.push(val(L + i * pw + 1.5, TB.y0 + 43, (v || '').slice(0, 22), 2.4));
  });
  // number row
  const cols = [['DRAWING No.', drawingNumber({ code: meta.code }, dw), 64], ['REV', meta.rev, 12], ['SCALE (A3)', scale && !isoNts ? `1:${scale}` : 'NTS', 24], ['SHEET', `${meta.sheet} of ${meta.sheets}`, 22], ['DATE', meta.date, W - 122]];
  let cx = L;
  for (const [k, v, w] of cols) { out.push(box(cx, TB.y0 + 45.5, w, 11)); out.push(lab(cx + 1.5, TB.y0 + 48.2, k)); out.push(val(cx + 1.5, TB.y0 + 53.6, v, k === 'DRAWING No.' ? 2.9 : 2.7, true)); cx += w; }
  // revision + credit
  out.push(lab(L + 2, TB.y0 + 59.3, 'REVISION'));
  out.push(val(L + 17, TB.y0 + 59.6, `${meta.rev} – ${meta.date} – ${meta.revDesc || ''}`.slice(0, 70), 2.1));
  (meta.revisions || []).forEach((rv, i) => out.push(val(L + 17, TB.y0 + 62.4 + i * 2.5, `${rv.rev || ''} – ${rv.date || ''} – ${rv.desc || ''}`.slice(0, 70), 1.8)));
  out.push(`<rect x="${R - 52}" y="${TB.y0 + 57.3}" width="50" height="4.6" fill="none" stroke="#b3001b" stroke-width="0.4"/><text x="${R - 27}" y="${TB.y0 + 60.6}" font-size="2.6" font-weight="700" text-anchor="middle" fill="#b3001b">${esc(String(meta.status || '').toUpperCase())}</text>`);
  out.push(`<text x="${R - 2}" y="${TB.y1 - 1.6}" font-size="2" text-anchor="end" fill="#0b4a92" font-weight="700">${APP}</text>`);
  if (isTrial()) out.push(`<text x="${(DA.x0 + DA.x1) / 2}" y="${(DA.y0 + DA.y1) / 2}" transform="rotate(-24 ${(DA.x0 + DA.x1) / 2} ${(DA.y0 + DA.y1) / 2})" font-size="19" font-weight="800" text-anchor="middle" fill="#b3001b" fill-opacity="0.13" font-family="Arial, sans-serif">${esc(trialLabel())}</text><text x="${FR.x0 + 3}" y="${FR.y0 + 4.2}" font-size="2.6" font-weight="700" fill="#b3001b">${esc(trialLabel())}</text>`);
  out.push('</svg>');
  return { svg: out.join(''), scale: isoNts ? null : scale, code: drawingCode(dw), number: drawingNumber({ code: meta.code }, dw) };
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

// ------------------------------------------------------------------ DXF sheet (frame + title block in model space)
export function sheetDXFItems(dw, meta) {
  const scale = chooseScale(dw);
  const k = scale / 1000; // metres per paper-mm
  const b = dw.bounds;
  const cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2;
  const daCx = (DA.x0 + DA.x1) / 2, daCy = (DA.y0 + (DA.y1 - 22)) / 2;
  const X = (xmm) => cxm + (xmm - daCx) * k;
  const Y = (ymm) => cym - (ymm - daCy) * k; // paper y down → model y up
  const lines = [], texts = [];
  const rect = (x0, y0, x1, y1, layer = 'FRAME') => { lines.push([X(x0), Y(y0), X(x1), Y(y0), layer], [X(x1), Y(y0), X(x1), Y(y1), layer], [X(x1), Y(y1), X(x0), Y(y1), layer], [X(x0), Y(y1), X(x0), Y(y0), layer]); };
  const hl = (x0, x1, y, layer = 'TITLEBLOCK') => lines.push([X(x0), Y(y), X(x1), Y(y), layer]);
  const vl = (x, y0, y1, layer = 'TITLEBLOCK') => lines.push([X(x), Y(y0), X(x), Y(y1), layer]);
  const tx = (xmm, ymm, hmm, s, align = 0) => texts.push([X(xmm), Y(ymm), hmm * k, s, align]);
  rect(0, 0, A3.w, A3.h, 'SHEET'); rect(FR.x0, FR.y0, FR.x1, FR.y1); hl(FR.x0, FR.x1, TB.y0 - 4, 'FRAME');
  rect(TB.x0, TB.y0, TB.x1, TB.y1, 'TITLEBLOCK'); rect(NB.x0, NB.y0, NB.x1, NB.y1, 'TITLEBLOCK'); vl(NB.x0 + 132, NB.y0, NB.y1);
  const L = TB.x0, W = TB.x1 - TB.x0;
  hl(L, TB.x1, TB.y0 + 13.5); hl(L, TB.x1, TB.y0 + 26); hl(L, TB.x1, TB.y0 + 36); hl(L, TB.x1, TB.y0 + 45.5); hl(L, TB.x1, TB.y0 + 56.5);
  for (let i = 1; i < 4; i++) vl(L + (i * W) / 4, TB.y0 + 36, TB.y0 + 45.5);
  let cx = L; for (const w of [64, 12, 24, 22]) { cx += w; vl(cx, TB.y0 + 45.5, TB.y0 + 56.5); }
  tx(L + 2, TB.y0 + 6, 3.2, 'NATIONAL WATER SUPPLY & DRAINAGE BOARD'); tx(L + 2, TB.y0 + 11, 2.2, (meta.rsc || '').toUpperCase() + ' - WATER TREATMENT PLANT DESIGN');
  tx(L + 2, TB.y0 + 16.3, 1.9, 'PROJECT'); tx(L + 2, TB.y0 + 20.5, 3, meta.project.slice(0, 62)); tx(L + 2, TB.y0 + 24.2, 2.1, [meta.location, meta.client].filter(Boolean).join(' - ').slice(0, 92));
  tx(L + 2, TB.y0 + 28.8, 1.9, 'DRAWING TITLE'); tx(L + 2, TB.y0 + 33.4, 3.3, (dw.title || '').toUpperCase().slice(0, 58));
  [['DESIGNED', meta.designer], ['DRAWN', meta.drawn || 'WTP Designer'], ['CHECKED', meta.checker], ['APPROVED', meta.approver]].forEach(([kk, v], i) => { tx(L + (i * W) / 4 + 1.5, TB.y0 + 38.6, 1.9, kk); tx(L + (i * W) / 4 + 1.5, TB.y0 + 43, 2.4, (v || '').slice(0, 22)); });
  cx = L;
  for (const [kk, v, w] of [['DRAWING No.', drawingNumber({ code: meta.code }, dw), 64], ['REV', meta.rev, 12], ['SCALE (A3)', dw.nts ? 'NTS' : `1:${scale}`, 24], ['SHEET', `${meta.sheet} of ${meta.sheets}`, 22], ['DATE', meta.date, W - 122]]) { tx(cx + 1.5, TB.y0 + 48.2, 1.9, kk); tx(cx + 1.5, TB.y0 + 53.6, 2.7, v); cx += w; }
  tx(L + 2, TB.y0 + 59.6, 2.1, `REVISION ${meta.rev} - ${meta.date} - ${meta.revDesc || ''}`.slice(0, 80));
  tx(TB.x1 - 27, TB.y0 + 60.6, 2.6, String(meta.status || '').toUpperCase(), 1);
  tx(TB.x1 - 2, TB.y1 - 1.6, 2, APP, 2);
  if (isTrial()) { tx(FR.x0 + 3, FR.y0 + 4.2, 2.6, trialLabel()); tx((DA.x0 + DA.x1) / 2, (DA.y0 + DA.y1) / 2, 12, trialLabel(), 1); }
  tx(NB.x0 + 3, NB.y0 + 5, 3, 'NOTES');
  NOTES.forEach((n, i) => tx(NB.x0 + 3, NB.y0 + 10 + i * 7.5, 2.2, `${i + 1}. ${n.slice(0, 95)}`));
  tx((DA.x0 + DA.x1) / 2, DA.y1 - 9, 4.4, `DRAWING ${drawingCode(dw)}: ${(dw.title || '').toUpperCase()}`, 1);
  tx((DA.x0 + DA.x1) / 2, DA.y1 - 4, 3, `SCALE 1:${scale} (A3)`, 1);
  return { lines, texts, scale };
}

/** DXF of the drawing with the A3 sheet frame and title block around it (model space, metres) */
export function sheetDXF(dw, meta) {
  return drawingDXF(dw, { extra: sheetDXFItems(dw, meta) });
}
