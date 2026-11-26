// Drawings added in v1.6: chemical house and chlorination building plans, typical wall reinforcement sections
// from the structural pre-design, and the site levels & drainage plan.
import { fmt } from '../../core/util.js';
import * as U from './units.js';
import { Dm, Ln, Lv, R, T, auto, mm } from './units.js';

const f2 = (v) => fmt(v, 2),
  f1 = (v) => fmt(v, 1),
  f0 = (v) => fmt(v, 0);
const C = (cx, cy, r, cls) => ({ t: 'circle', cx, cy, r, cls });
const Pg = (pts, cls, closed = true) => ({ t: 'poly', pts, cls, closed });

/** generic single-storey building plan from the room list of the buildings module */
function buildingPlan(b, title, furnish, extras) {
  if (!b?.rooms?.length) return null;
  const it = [],
    t = 0.23,
    L = b.L,
    W = b.W;
  it.push(
    R(-t, -t, L + 2 * t, t, 'concrete'),
    R(-t, W, L + 2 * t, t, 'concrete'),
    R(-t, 0, t, W, 'concrete'),
    R(L, 0, t, W, 'concrete'),
  );
  b.rooms.forEach((rm, i) => {
    if (i > 0) it.push(R(rm.x - 0.075, 0, 0.15, W, 'baffle'));
    const cx = rm.x + rm.w / 2;
    const th = Math.max(L, W) / 42,
      fit = (s, max) => Math.max(0.36, Math.min(max, (rm.w * 0.94) / (String(s).length * 0.56 * th)));
    it.push(
      T(cx, W - th * 1.3, rm.name, { anchor: 'middle', bold: true, size: fit(rm.name, 0.72) }),
      T(cx, W - th * 2.4, `${f1(rm.w)} × ${f1(W)} m`, { anchor: 'middle', size: fit('00.0 × 00.0 m', 0.6) }),
      T(cx, W - th * 3.4, rm.note || '', { anchor: 'middle', size: fit(rm.note || '', 0.6) }),
    );
    // door on the front (y = 0) wall, opening outwards
    const dx = rm.x + Math.min(rm.w - 1.3, 0.6);
    it.push(
      { t: 'rect', x: dx, y: -t - 0.02, w: 1.0, h: t + 0.04, cls: 'outline' },
      Ln(dx, -t, dx, -t - 1.0, 'thin'),
      Pg(
        Array.from({ length: 7 }, (_, k) => [dx + Math.sin((k * Math.PI) / 12), -t - Math.cos((k * Math.PI) / 12)]),
        'thin',
        false,
      ),
    );
    furnish(rm, it, W);
  });
  it.push(Dm(0, W + t, L, W + t, 0.9, `${mm(L)}`), Dm(L + t, 0, L + t, W, -0.9, `${mm(W)}`));
  let x = 0;
  for (const rm of b.rooms) {
    it.push(Dm(x, -t, x + rm.w, -t, -2.2, mm(rm.w)));
    x += rm.w;
  }
  if (extras) extras(it, L, W, t);
  return auto(title, it, { textH: Math.max(L, W) / 42 });
}

export function chemHousePlan(bl) {
  const b = bl?.chem;
  if (!b) return null;
  return buildingPlan(
    b,
    `Chemical house – plan (${f0(b.area)} m², clear height ${f1(b.H)} m)`,
    (rm, it, W) => {
      const x0 = rm.x + 0.5,
        w = rm.w - 1.0;
      if (rm.key === 'store' || rm.key === 'pac') {
        // pallets of bags
        for (let y = 0.6; y + 1.0 < W - 2.4; y += 1.5)
          for (let x = x0; x + 1.1 <= x0 + w + 0.01; x += 1.5) it.push(R(x, y, 1.1, 1.0, 'residual'));
      } else if (rm.key === 'prep') {
        const s = b.tankSide || 1.5,
          n = b.nTanks || 2;
        it.push(
          R(rm.x + 0.3, 0.4, rm.w - 0.6, Math.min(W - 2.8, s + 1.6), 'dash'),
          T(rm.x + rm.w / 2, Math.min(W - 2.8, s + 1.6) + 0.55, `Bund ${f2(b.bundH)} m`, {
            anchor: 'middle',
            size: 0.5,
          }),
        );
        for (let k = 0; k < n; k++) {
          const tx = rm.x + (rm.w * (k + 0.5)) / n - s / 2;
          it.push(
            R(tx, 0.8, s, s, 'process'),
            C(tx + s / 2, 0.8 + s / 2, s * 0.22, 'equip'),
            T(tx + s / 2, 0.8 + s / 2 - 0.1, `T${k + 1}`, { anchor: 'middle', size: 0.6, bold: true }),
          );
        }
      } else if (rm.key === 'dose') {
        const n = b.nPumps || 3;
        for (let k = 0; k < n; k++) {
          const px = rm.x + (rm.w * (k + 0.5)) / n;
          it.push(R(px - 0.25, 1.0, 0.5, 0.8, 'equipFill'), Ln(px, 1.8, px, 2.6, 'pipe'));
        }
        it.push(Ln(rm.x + 0.4, 2.6, rm.x + rm.w - 0.4, 2.6, 'pipe'));
      } else if (rm.key === 'lime') {
        const lm = b.lime || {};
        for (let y = 0.6; y + 1.0 < W * 0.45; y += 1.5)
          for (let x = x0; x + 1.1 <= x0 + w * 0.5; x += 1.5) it.push(R(x, y, 1.1, 1.0, 'residual'));
        const rr = Math.min(
          W * 0.13,
          lm.feed === 'saturator'
            ? (lm.satD || 1.5) / 2
            : Math.max(0.6, Math.sqrt((lm.slurryTank || 2) / 2.5 / Math.PI)),
        );
        for (let k = 0; k < 2; k++)
          it.push(
            C(rm.x + rm.w * 0.78, W * (0.2 + 0.32 * k), Math.min(rr, rm.w * 0.2), 'process'),
            C(rm.x + rm.w * 0.78, W * (0.2 + 0.32 * k), 0.12, 'equipFill'),
          );
        it.push(
          T(
            rm.x + rm.w * 0.78,
            W * 0.2 + Math.min(rr, rm.w * 0.2) + 0.25,
            lm.feed === 'saturator' ? 'Lime saturators' : 'Slurry tanks',
            { anchor: 'middle', size: 0.58 },
          ),
        );
      } else if (rm.key === 'office')
        it.push(
          R(rm.x + 0.5, 0.8, Math.min(1.6, rm.w - 1), 0.8, 'outline'),
          T(rm.x + rm.w / 2, 2.1, 'Desk', { anchor: 'middle', size: 0.5 }),
        );
    },
    (it, L, W, t) => {
      it.push(
        R(0, -t - 5.6, L, 1.8, 'outline'),
        T(
          L / 2,
          -t - 4.9,
          'Raised loading platform along the front, hoist / monorail into the stores · dosing header from the pump room to the rapid mixer',
          { anchor: 'middle', size: 0.62 },
        ),
      );
      it.push(
        T(
          L / 2,
          W + t + 2.6,
          'Floors laid to falls to the bund sump · safety shower and eye-wash at the preparation area · dust extraction over batching hoppers (NWSDB D3 §6.1, §9.5.8)',
          { anchor: 'middle', size: 0.62 },
        ),
      );
    },
  );
}

export function chlorPlan(bl) {
  const b = bl?.chlor;
  if (!b) return null;
  const g = bl.chlorGas;
  return buildingPlan(
    b,
    `Chlorination building – plan (${b.gas ? 'gas chlorination' : 'hypochlorite'}, ${f0(b.area)} m²)`,
    (rm, it, W) => {
      const drum = g?.drum;
      if (rm.key === 'store' && b.gas) {
        const dw = drum ? 2.1 : 0.4,
          dh = drum ? 0.8 : 0.4,
          n = g.nStore;
        let k = 0;
        for (let y = 0.6; y + dh < W - 2.4 && k < n; y += dh + 0.5)
          for (let x = rm.x + 0.5; x + dw <= rm.x + rm.w - 0.4 && k < n; x += dw + 0.5, k++)
            it.push(drum ? R(x, y, dw, dh, 'equipFill') : C(x + 0.2, y + 0.2, 0.2, 'equipFill'));
        it.push(
          Ln(rm.x + 0.3, W - 2.3, rm.x + rm.w - 0.3, W - 2.3, 'center'),
          T(rm.x + rm.w / 2, W - 2.75, drum ? '2 t monorail hoist' : 'Cylinders chained upright', {
            anchor: 'middle',
            size: 0.55,
          }),
        );
      } else if (rm.key === 'feed' && b.gas) {
        const n = Math.min(4, 2 * (g.onLine || 1));
        for (let k = 0; k < n; k++) {
          const y = 0.7 + k * ((W - 3.2) / Math.max(1, n));
          it.push(
            drum
              ? R(rm.x + 0.6, y, Math.min(2.1, rm.w - 1.2), 0.8, 'equipFill')
              : C(rm.x + rm.w / 2, y + 0.3, 0.25, 'equipFill'),
          );
        }
        it.push(T(rm.x + rm.w / 2, 0.25, 'weigh scales', { anchor: 'middle', size: 0.45 }));
      } else if (rm.key === 'chlor') {
        for (let k = 0; k < 2; k++) it.push(R(rm.x + 0.6 + k * 1.2, W * 0.25, 0.7, 0.35, 'equipFill'));
        it.push(
          Ln(rm.x + 0.4, W * 0.25 - 0.4, rm.x + rm.w, W * 0.25 - 0.4, 'equip', { arrow: true }),
          T(rm.x + rm.w / 2, W * 0.25 - 0.9, 'to dosing', { anchor: 'middle', size: 0.45 }),
        );
      } else if (rm.key === 'scrub') {
        it.push(
          C(rm.x + rm.w / 2, W * 0.3, Math.min(0.9, rm.w * 0.3), 'process'),
          T(rm.x + rm.w / 2, W * 0.3 + 1.2, 'NaOH', { anchor: 'middle', size: 0.45 }),
        );
      } else if (rm.key === 'store') {
        for (let y = 0.6; y + 1.0 < W - 2.4; y += 1.5)
          for (let x = rm.x + 0.5; x + 1.1 <= rm.x + rm.w - 0.4; x += 1.5) it.push(R(x, y, 1.1, 1.0, 'residual'));
      } else if (rm.key === 'feed') {
        for (let k = 0; k < 2; k++)
          it.push(
            R(
              rm.x + 0.6 + (k * (rm.w - 1.2)) / 2,
              0.8,
              Math.max(0.8, (rm.w - 1.6) / 2),
              Math.max(0.8, (rm.w - 1.6) / 2),
              'process',
            ),
          );
      }
      if (b.gas && rm.key !== 'chlor')
        it.push(R(rm.x + rm.w - 0.9, W - 0.02, 0.6, 0.27, 'equip'), R(rm.x + 0.3, -0.25, 0.6, 0.27, 'equip'));
    },
    (it, L, W, t) => {
      if (b.gas)
        it.push(
          T(
            L / 2,
            W + t + 2.6,
            `Exhaust fans at floor level, fresh-air inlets at high level – ${f0(g.fan)} m³/h (1 air change/min) · leak detectors with siren · doors open outwards · SCBA, shower and eye-wash outside (NWSDB D3 §6.5.3, §6.5.8)`,
            { anchor: 'middle', size: 0.6 },
          ),
        );
      else
        it.push(
          T(
            L / 2,
            W + t + 2.6,
            'Cool, dry, ventilated store kept apart from the coagulant store · two solution tanks and duty / standby dosers (NWSDB D3 §6.4)',
            { anchor: 'middle', size: 0.6 },
          ),
        );
    },
  );
}

/** typical wall / base reinforcement section of one structure from the structural pre-design */
export function rebarDetail(s, inputs) {
  if (!s?.wall) return null;
  const it = [],
    w = s.wall,
    t = w.t,
    h = s.h,
    tb = s.tb,
    c = (inputs?.cover ?? 40) / 1000,
    toe = Math.max(0.3, t);
  const bar = (x1, y1, x2, y2) => Ln(x1, y1, x2, y2, 'equip');
  // concrete outline: wall on a base slab with an outer toe; water on the right (x > t)
  it.push(
    Pg(
      [
        [0, 0],
        [t, 0],
        [t, h],
        [0, h],
      ],
      'concrete',
    ),
    Pg(
      [
        [-toe, -tb],
        [t + 2.2, -tb],
        [t + 2.2, 0],
        [-toe, 0],
      ],
      'concrete',
    ),
  );
  it.push(R(t, 0, 2.2, h - 0.5, 'water'), Ln(t, h - 0.5, t + 2.2, h - 0.5, 'waterline'));
  it.push(
    Pg(
      [
        [-toe - 1.2, -tb - 0.4],
        [-toe, -tb - 0.4],
        [-toe, -tb],
        [t + 2.2, -tb],
        [t + 2.2, -tb - 0.4],
      ],
      'soil',
      false,
    ),
  );
  if (s.roof) it.push(R(-0.2, h, t + 2.4, 0.25, 'concrete'));
  // bars: vertical water face (main) with L-starter into the base, outer face, horizontal distribution bars
  const xi = t - c,
    xo = c;
  it.push(
    bar(xi, -tb + c, xi, h - c),
    bar(xi, -tb + c, xi + 1.0, -tb + c),
    bar(xo, -tb + c, xo, h - c),
    bar(xo, -tb + c, xo - Math.min(toe - c, 0.6), -tb + c),
  );
  for (let y = 0.15; y < h - 0.05; y += Math.max(0.15, (w.minBars?.s || 200) / 1000))
    it.push(C(xi - 0.02, y, 0.012, 'equipFill'), C(xo + 0.02, y, 0.012, 'equipFill'));
  it.push(bar(-toe + c, -c, t + 2.15, -c), bar(-toe + c, -tb + c + 0.03, t + 2.15, -tb + c + 0.03));
  for (let x = -toe + 0.1; x < t + 2.1; x += 0.2)
    it.push(C(x, -c - 0.02, 0.012, 'equipFill'), C(x, -tb + c + 0.05, 0.012, 'equipFill'));
  // construction joint with water bar (kicker 150 mm above the base)
  it.push(Ln(-0.05, 0.15, t + 0.05, 0.15, 'dash'), R(t / 2 - 0.1, 0.13, 0.2, 0.04, 'baffle'));
  const lx = t + 2.6;
  const lab = (y, txt, x0, y0) => {
    it.push(Ln(x0, y0, lx - 0.1, y, 'thin'), T(lx, y - 0.05, txt, { size: 0.8 }));
  };
  lab(
    h * 0.8,
    `Vertical, water face: T${w.bars?.dia ?? '–'} @ ${w.bars?.s ?? '–'} (${f0(w.bars?.a || 0)} mm²/m ≥ ${f0(w.As)} required)`,
    xi,
    h * 0.72,
  );
  lab(h * 0.62, `Vertical, outer face: T${w.minBars.dia} @ ${w.minBars.s}`, xo, h * 0.55);
  lab(
    h * 0.44,
    `Horizontal, both faces: T${w.minBars.dia} @ ${w.minBars.s}${s.hoop?.bars ? ` (hoop T${s.hoop.bars.dia} @ ${s.hoop.bars.s} at the base)` : ''}`,
    xi - 0.02,
    h * 0.36,
  );
  lab(0.32, 'Construction joint with PVC water bar, 150 mm kicker', t / 2, 0.15);
  lab(-tb * 0.5, `Base ${f0(tb * 1000)} mm: T${w.minBars.dia} @ ${w.minBars.s} top & bottom, both ways`, t + 1.2, -c);
  it.push(T(-toe - 1.15, -tb - 0.3, '75 mm blinding on compacted formation', { size: 0.7 }));
  it.push(
    Dm(0, h, t, h, s.roof ? 0.8 : 0.5, `${f0(t * 1000)}`),
    Dm(0, 0, 0, h, toe + 0.5, `${mm(h)}`),
    Dm(-toe, -tb, -toe, 0, 0.5, `${f0(tb * 1000)}`),
  );
  it.push(T(t + 1.2, h * 0.9 - 0.5, 'Water face', { anchor: 'middle', size: 0.75 }));
  it.push(
    T(
      (lx + 4) / 2,
      -tb - 1.1,
      `Concrete grade ${inputs?.fcu ?? 35}, cover ${f0(c * 1000)} mm, fy ${inputs?.fy ?? 460} N/mm² · service moment ${f1(w.Ms)} kNm/m · preliminary – final reinforcement by the structural engineer`,
      { anchor: 'middle', size: 0.72 },
    ),
  );
  return auto(`${s.name} – typical wall and base reinforcement (preliminary)`, it, { textH: Math.max(h + tb, 4) / 30 });
}

/** site plan with water / platform levels, roads and perimeter drainage */
export function siteLevelsPlan(r) {
  const lay = r.layout;
  const base = U.layoutPlan(lay);
  if (!base) return null;
  const H = lay.siteH,
    W = lay.siteW,
    GL = r.hyd?.GL ?? 0;
  const it = [];
  const road = lay.inputs.road || 6;
  it.push(
    R(W * 0.02, H * 0.445, W * 0.96, road, 'road'),
    T(W * 0.5, H * 0.445 + road / 2 - 1, `Internal road ${f0(road)} m`, { anchor: 'middle', size: 0.55 }),
  );
  it.push(...base.items.filter((x) => !(x.t === 'text' && / m$/.test(x.text) && /×/.test(x.text))));
  const KEY = { inlet: 'inlet', floc: 'floc', sed: 'sed', filt: 'filt', ct: 'ct', cwr: 'cwr' };
  const th = Math.max(W, H) / 70;
  for (const b of lay.items) {
    const hu = r.hyd?.units.find((u) => u.key === KEY[b.key]);
    const y = H - b.y - b.h;
    if (hu)
      it.push(
        T(b.x + b.w / 2, y + b.h / 2 - th * 1.0, `TWL ${f2(hu.wl)} · floor ${f2(hu.bottom)}`, {
          anchor: 'middle',
          size: 0.5,
          color: 'var(--dw-water-line)',
        }),
      );
    else if (b.kind === 'building')
      it.push(T(b.x + b.w / 2, y + b.h / 2 - th * 1.0, `FFL ${f2(GL + 0.3)}`, { anchor: 'middle', size: 0.5 }));
  }
  // perimeter drains falling to the outfall at the south-east corner
  const o = 3;
  it.push(
    Ln(o, H - o, W - o, H - o, 'waterline', { arrow: true }),
    Ln(W - o, H - o, W - o, o, 'waterline', { arrow: true }),
    Ln(o, H - o, o, o, 'waterline', { arrow: true }),
    Ln(o, o, W - o, o, 'waterline', { arrow: true }),
  );
  it.push(
    T(
      W - o - 1,
      o + 1.5,
      `Outfall – ${fmt(lay.Qdr, 2)} m³/s, drains ${f2(lay.drainB)} × ${f2(lay.drainB)} m at ${lay.inputs.drainSlope} %`,
      { anchor: 'end', size: 0.6, color: 'var(--dw-water-line)' },
    ),
  );
  it.push(Lv(W * 0.03 + 4, H - o - th * 2.2, `Finished ground ${f2(GL)}`));
  if (lay.inputs.floodLevel) it.push(Lv(W * 0.03 + 4, H - o - th * 4.4, `Flood level ${f2(lay.inputs.floodLevel)}`));
  return auto('Site levels and drainage – plan', it, { textH: th });
}
