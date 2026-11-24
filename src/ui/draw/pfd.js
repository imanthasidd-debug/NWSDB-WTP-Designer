// Animated process flow diagram (PFD) of the selected treatment train.
// Pictorial sections of every unit (concrete walls, water coloured by its turbidity, sand / gravel, sludge),
// moving internals (impellers, paddles, scrapers, settling particles, filtration flow, bubbles, rising/falling
// reservoir level), chemical dosing stations dripping into their dosing points, numbered process streams with a
// stream table, sludge / wash-water lines to the residuals plant and recovered water returned to the head of works.
// statik = true gives a print version (literal colours, no animation) for the report.
import { fmt } from '../../core/util.js';
import { h, icon } from '../dom.js';
import { navigate } from '../store.js';

const PAGE_OF = { intake: 'intake', rwp: 'intake', aeration: 'aeration', presed: 'sed', rapidmix: 'rapidmix', floc: 'floc', sed: 'sed', filt: 'filt', dis: 'dis', cwr: 'storage', twp: 'storage', supply: 'storage', sludge: 'sludge', recov: 'sludge', thick: 'sludge', dewater: 'sludge', cake: 'sludge', coag: 'coag', stab: 'stab', pac: 'coag', prechlor: 'dis', limecoag: 'coag', poly: 'coag', cl2: 'dis' };
const MOD_OF = { intake: 'intake', rwp: 'intake', aeration: 'aeration', presed: 'sed', rapidmix: 'rapidmix', floc: 'floc', sed: 'sed', filt: 'filt', dis: 'dis', cwr: 'storage', twp: 'storage', supply: 'storage', recov: 'sludge', thick: 'sludge', dewater: 'sludge', cake: 'sludge' };

const LIGHT = { concrete: '#cfd6e0', line: '#22324a', sand: '#e8d29b', gravel: '#b9a88a', anth: '#4b4b52', equip: '#eb6834', ground: '#8a6d3b', text: '#0f1d33', muted: '#6b7a8f', surface: '#ffffff', prim: '#0b63b6', chem: '#d9622b', cl: '#d79a00', lime: '#9a948a', ok: '#138a4b', warn: '#b7791f', fail: '#c53030', earth: '#a58a5c', grass: '#6b9b3a', steel: '#8796a8', wash: '#7aa7c7' };
const VARS = { concrete: 'var(--dw-concrete)', line: 'var(--dw-line)', sand: 'var(--dw-sand)', gravel: 'var(--dw-gravel)', anth: 'var(--dw-anth)', equip: 'var(--dw-equip)', ground: 'var(--dw-ground)', text: 'var(--text)', muted: 'var(--muted)', surface: 'var(--surface)', prim: 'var(--primary)', chem: 'var(--series-2)', cl: 'var(--series-4)', lime: '#9a948a', ok: 'var(--ok)', warn: 'var(--warn)', fail: 'var(--fail)', earth: 'var(--dw-ground)', grass: '#6b9b3a', steel: 'var(--muted)', wash: '#7aa7c7' };

/** water colour from turbidity: brown (muddy) → blue (clear) on a log scale */
export function waterColor(ntu, alpha = 0.78) {
  const stops = [[0.1, [64, 150, 230]], [1, [72, 160, 210]], [5, [110, 165, 170]], [20, [150, 150, 110]], [100, [170, 132, 82]], [1000, [150, 105, 60]]];
  const t = Math.max(0.1, Math.min(1000, Number.isFinite(ntu) ? ntu : 1));
  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
  const [a, ca] = stops[i], [b, cb] = stops[i + 1];
  const f = Math.max(0, Math.min(1, (Math.log10(t) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))));
  const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * f));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

const CW = 118, CH = 92, G = 50;

// ------------------------------------------------------------------ primitives
const tank = (P, x, y, w, h, t = 5) => `<path d="M${x},${y}V${y + h}H${x + w}V${y}H${x + w - t}V${y + h - t}H${x + t}V${y}Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/>`;
const water = (x, y, w, h, col, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" ${extra}/><path d="M${x},${y}h${w}" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>`;
const tri = (x, y) => `<path d="M${x - 4},${y - 6}h8l-4,6z" fill="none" stroke="currentColor" stroke-width=".8"/>`;
const particles = (x0, y0, w, n, col, cls = 'pf-fall', r = 1.5, h = 20) => Array.from({ length: n }, (_, i) => {
  const x = x0 + ((i * 37) % 100) / 100 * w, y = y0 + ((i * 53) % 100) / 100 * h;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${col}" class="${cls}" style="animation-delay:${((i * 0.43) % 3).toFixed(2)}s"/>`;
}).join('');
const bubbles = (x0, y0, w, n, cls = 'pf-rise') => Array.from({ length: n }, (_, i) => `<circle cx="${(x0 + ((i * 41) % 100) / 100 * w).toFixed(1)}" cy="${y0}" r="${1.2 + (i % 3) * 0.5}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width=".8" class="${cls}" style="animation-delay:${((i * 0.37) % 2.2).toFixed(2)}s"/>`).join('');
function impeller(P, cx, cy, r, cls = 'pf-spin') {
  return `<g class="${cls}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="none"/>${[0, 60, 120].map((a) => `<path d="M${cx},${cy}L${cx + r * Math.cos((a * Math.PI) / 180)},${cy + r * Math.sin((a * Math.PI) / 180)}M${cx},${cy}L${cx - r * Math.cos((a * Math.PI) / 180)},${cy - r * Math.sin((a * Math.PI) / 180)}" stroke="${P.equip}" stroke-width="2.2" stroke-linecap="round"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="2.4" fill="${P.line}"/></g>`;
}
function pumpSym(P, cx, cy, r = 13) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.surface}" stroke="${P.line}" stroke-width="1.6"/><path d="M${cx},${cy - r}H${cx + r + 8}V${cy - r + 7}H${cx + r - 2}" fill="${P.surface}" stroke="${P.line}" stroke-width="1.4"/>${impeller(P, cx, cy, r - 4)}`;
}

// ------------------------------------------------------------------ unit drawings (local 0..CW × 0..CH; inlet left, outlet right)
const UNITS = {
  intake(P, s) {
    const col = s.cIn;
    return `<path d="M0,40 Q8,36 16,40 T32,40 T48,40 V${CH} H0Z" fill="${col}"/><path class="pf-wave" d="M-16,40 q8,-4 16,0 t16,0 t16,0 t16,0 t16,0" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.2"/>
      <path d="M0,${CH}L40,${CH - 6}L46,30H0" fill="none"/><path d="M0,${CH} L34,${CH} L52,24 L54,24" fill="none" stroke="${P.earth}" stroke-width="2"/>
      ${tank(P, 54, 10, 60, CH - 10, 6)}${water(60, 40, 48, CH - 46, col)}
      ${[0, 1, 2, 3, 4].map((k) => `<path d="M${57 + 0},${46 + k * 7}h3" stroke="${P.line}" stroke-width="1"/>`).join('')}<path d="M54,44V74" stroke="${P.steel}" stroke-width="3" stroke-dasharray="2 2"/>
      <rect x="50" y="4" width="68" height="7" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/>${particles(62, 44, 40, 5, P.ground, 'pf-drift', 1.2, 30)}`;
  },
  rwp(P, s) {
    return `${tank(P, 4, 18, 62, CH - 18, 5)}${water(9, 46, 52, CH - 51, s.cIn)}<rect x="28" y="22" width="14" height="12" fill="${P.equip}" stroke="${P.line}" stroke-width="1"/><path d="M35,34V70" stroke="${P.line}" stroke-width="2"/>
      ${pumpSym(P, 35, 76, 10)}<path d="M66,30H92V50H${CW}" fill="none" stroke="${P.line}" stroke-width="3"/><circle cx="80" cy="30" r="5" fill="${P.surface}" stroke="${P.line}" stroke-width="1.2"/><path d="M76,30h8" stroke="${P.line}" stroke-width="1"/>
      <path d="M2,14L35,2L68,14" fill="none" stroke="${P.line}" stroke-width="1.4"/>`;
  },
  aeration(P, s) {
    const steps = 5;
    let d = 'M6,16', w = 'M6,14';
    for (let i = 0; i < steps; i++) { const x = 6 + i * 21, y = 16 + i * 13; d += `H${x + 21}V${y + 13}`; w += `H${x + 19}Q${x + 23},${y - 2} ${x + 23},${y + 4}V${y + 11}`; }
    return `<path d="${d}H${CW - 4}V${CH}H6Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/><path d="${w}H${CW - 4}" fill="none" stroke="${s.cIn}" stroke-width="3.2" class="pf-flow2"/>${bubbles(30, 50, 70, 7)}${water(80, 82, 34, 8, s.cOut)}`;
  },
  presed(P, s) {
    return `<path d="M2,16H${CW - 2}V70L${CW - 26},${CH}H26L2,70Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/><path d="M7,26H${CW - 7}V68L${CW - 28},${CH - 5}H28L7,68Z" fill="url(#pfg-${s.id})"/>${particles(12, 30, CW - 26, 10, P.ground, 'pf-fall', 1.6, 26)}<path d="M28,${CH - 5}H${CW - 28}" stroke="${P.ground}" stroke-width="4"/>`;
  },
  rapidmix(P, s) {
    if (s.type === 'mechanical') {
      return `${tank(P, 20, 18, 78, CH - 18, 6)}${water(26, 32, 66, CH - 38, s.cIn)}<rect x="50" y="4" width="18" height="12" fill="${P.equip}" stroke="${P.line}" stroke-width="1"/><path d="M59,16V70" stroke="${P.line}" stroke-width="2"/>
        <g class="pf-flip"><rect x="43" y="66" width="32" height="6" rx="2" fill="${P.equip}"/></g><path d="M28,40v26M90,40v26" stroke="${P.line}" stroke-width="2"/>${bubbles(34, 62, 50, 5, 'pf-swirl')}`;
    }
    return `<path d="M0,26H44Q54,26 58,58H${CW}V${CH}H0Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/>
      <path d="M0,30H42Q50,30 55,56 Q62,57 68,48 Q74,40 82,42 H${CW}V58H0Z" fill="${s.cIn}" opacity=".92"/>
      <path d="M0,30H42Q50,30 55,56" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.2" class="pf-flow2"/>
      <g class="pf-churn"><path d="M60,52 q5,-12 12,-6 q-5,5 0,10" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.4"/></g><g class="pf-churn d2"><path d="M70,48 q6,-9 11,-3" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.2"/></g>
      <path d="M0,58H${CW}" stroke="${P.line}" stroke-width="1"/>${bubbles(58, 54, 30, 6)}`;
  },
  floc(P, s) {
    if (s.type === 'paddle') {
      return `${tank(P, 2, 14, CW - 4, CH - 14, 5)}${water(7, 26, CW - 14, CH - 31, s.cIn)}${[30, 59, 88].map((x) => `<g class="pf-spin slow"><rect x="${x - 1.5}" y="38" width="3" height="40" fill="${P.equip}"/><rect x="${x - 20}" y="56.5" width="40" height="3" fill="${P.equip}"/><circle cx="${x}" cy="58" r="20" fill="none" stroke="none"/></g>`).join('')}<path d="M7,58H${CW - 7}" stroke="${P.line}" stroke-width="1.6"/>${particles(10, 30, CW - 20, 8, 'rgba(120,90,50,.85)', 'pf-drift', 1.8, 50)}`;
    }
    if (s.type === 'hbaffle') {
      return `<rect x="2" y="10" width="${CW - 4}" height="${CH - 10}" rx="2" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/><rect x="7" y="15" width="${CW - 14}" height="${CH - 20}" fill="${s.cIn}"/>
        ${[24, 42, 60, 78, 96].map((x, i) => `<path d="M${x},${i % 2 ? CH - 5 : 15}V${i % 2 ? 34 : CH - 24}" stroke="${P.line}" stroke-width="3"/>`).join('')}
        <path d="M15,22V${CH - 14}H33V24H51V${CH - 14}H69V24H87V${CH - 14}H105V22" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" class="pf-flow3"/>${particles(10, 20, CW - 20, 8, 'rgba(120,90,50,.85)', 'pf-drift', 1.8, 60)}`;
    }
    return `${tank(P, 2, 10, CW - 4, CH - 10, 5)}${water(7, 20, CW - 14, CH - 25, s.cIn)}
      ${[24, 42, 60, 78, 96].map((x, i) => `<path d="M${x},${i % 2 ? CH - 5 : 14}V${i % 2 ? 38 : CH - 22}" stroke="${P.line}" stroke-width="3"/>`).join('')}
      <path d="M15,24V${CH - 12}H33V28H51V${CH - 12}H69V28H87V${CH - 12}H105V24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" class="pf-flow3"/>${particles(10, 26, CW - 20, 8, 'rgba(120,90,50,.85)', 'pf-drift', 2, 56)}`;
  },
  sed(P, s) {
    if (s.type === 'circ') {
      return `<path d="M2,14H${CW - 2}V58L66,${CH}H52L2,58Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/><path d="M7,24H${CW - 7}V56L64,${CH - 6}H54L7,56Z" fill="url(#pfg-${s.id})"/>
        <rect x="50" y="20" width="18" height="26" fill="none" stroke="${P.line}" stroke-width="1.4"/><path d="M59,4V70" stroke="${P.line}" stroke-width="2"/><rect x="52" y="0" width="14" height="8" fill="${P.equip}"/>
        <g class="pf-rake"><path d="M59,66L14,52M59,66L104,52" stroke="${P.equip}" stroke-width="2"/></g>${particles(12, 28, CW - 26, 10, P.ground, 'pf-fall', 1.5, 22)}<path d="M54,${CH - 7}H64" stroke="${P.ground}" stroke-width="5"/>
        <path d="M8,22h8M${CW - 16},22h8" stroke="${P.line}" stroke-width="2"/>`;
    }
    const tubes = s.type === 'tube' ? [40, 50, 60, 70, 80, 90].map((x) => `<path d="M${x},50L${x + 12},32" stroke="${P.line}" stroke-width="1.6"/>`).join('') + `<path d="M38,50H94M50,32H104" stroke="${P.line}" stroke-width=".8"/>` : '';
    return `<path d="M2,14H${CW - 2}V66L28,${CH - 4}H20L12,${CH}H6L2,${CH - 8}Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/>
      <path d="M7,24H${CW - 7}V63L28,${CH - 10}H20L13,${CH - 6}H9L7,${CH - 12}Z" fill="url(#pfg-${s.id})"/>
      <path d="M18,24V48" stroke="${P.line}" stroke-width="2"/>${tubes}
      ${particles(22, 28, CW - 34, 12, P.ground, 'pf-fall', 1.5, 24)}<path d="M10,${CH - 8}L28,${CH - 12}L${CW - 7},63" fill="none" stroke="${P.ground}" stroke-width="3" opacity=".9"/>
      <g class="pf-scrape"><rect x="34" y="${CH - 20}" width="10" height="4" fill="${P.equip}"/></g>
      <path d="M${CW - 22},24v6h15" fill="none" stroke="${P.line}" stroke-width="1.6"/>${[0, 1, 2].map((k) => `<circle cx="${CW - 18 + k * 5}" cy="30" r="1.2" fill="rgba(255,255,255,.95)" class="pf-drip" style="animation-delay:${k * 0.4}s"/>`).join('')}`;
  },
  filt(P, s) {
    if (s.type === 'ssf') {
      return `${tank(P, 2, 8, CW - 4, CH - 8, 5)}${water(7, 22, CW - 14, 24, s.cIn)}<rect x="7" y="46" width="${CW - 14}" height="26" fill="${P.sand}"/><path d="M7,46.5H${CW - 7}" stroke="#6b8e23" stroke-width="2.2"/><rect x="7" y="72" width="${CW - 14}" height="10" fill="${P.gravel}"/>
        ${[24, 44, 64, 84, 104].map((x, i) => `<path d="M${x},28V${CH - 12}" stroke="rgba(255,255,255,.8)" stroke-width="1.2" class="pf-down" style="animation-delay:${i * 0.3}s"/>`).join('')}<path d="M7,${CH - 9}H${CW - 7}" stroke="${P.line}" stroke-width="2" stroke-dasharray="3 3"/>`;
    }
    const dual = s.type === 'dual';
    return `${tank(P, 2, 6, CW - 4, CH - 6, 5)}${water(7, 16, CW - 14, 26, s.cIn)}
      <path d="M20,30h14v6h-14zM62,30h14v6h-14z" fill="${P.surface}" stroke="${P.line}" stroke-width="1"/>
      ${dual ? `<rect x="7" y="42" width="${CW - 14}" height="12" fill="${P.anth}"/><rect x="7" y="54" width="${CW - 14}" height="14" fill="${P.sand}"/>` : `<rect x="7" y="42" width="${CW - 14}" height="26" fill="${P.sand}"/>`}
      ${particles(9, 43, CW - 18, 14, 'rgba(0,0,0,.18)', '', 0.9, 24)}
      <rect x="7" y="68" width="${CW - 14}" height="9" fill="${P.gravel}"/><rect x="7" y="77" width="${CW - 14}" height="9" fill="${s.cOut}"/><path d="M7,77H${CW - 7}" stroke="${P.line}" stroke-width="1.2" stroke-dasharray="2 3"/>
      ${[20, 38, 56, 74, 92].map((x, i) => `<path d="M${x},20V${CH - 10}" stroke="rgba(255,255,255,.85)" stroke-width="1.3" class="pf-down" style="animation-delay:${i * 0.25}s"/>`).join('')}
      ${bubbles(14, 66, CW - 30, 8, 'pf-bw')}`;
  },
  dis(P, s) {
    return `<rect x="2" y="10" width="${CW - 4}" height="${CH - 10}" rx="2" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/><rect x="7" y="15" width="${CW - 14}" height="${CH - 20}" fill="${s.cIn}"/>
      ${[0, 1, 2, 3].map((k) => `<path d="M7,${30 + k * 15}H${k % 2 ? 22 : CW - 22}" stroke="${P.line}" stroke-width="2.6" transform="translate(${k % 2 ? CW - 29 : 0},0)"/>`).join('')}
      <path d="M12,22H${CW - 14}V37H14V52H${CW - 14}V67H14V${CH - 10}H${CW - 12}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" class="pf-flow3"/>`;
  },
  cwr(P, s) {
    return `<path d="M2,16H${CW - 2}V${CH}H2Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/><rect x="2" y="10" width="${CW - 4}" height="7" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/>
      <g class="pf-level"><rect x="8" y="30" width="${CW - 16}" height="${CH - 36}" fill="${s.cIn}"/><path d="M8,30H${CW - 8}" stroke="rgba(255,255,255,.75)" stroke-width="1.2"/></g>
      <path d="M30,10V2h8v8M80,10V2h8v8" fill="none" stroke="${P.line}" stroke-width="1.4"/><path d="M${CW / 2},${CH - 6}v-14" stroke="${P.line}" stroke-width="1" stroke-dasharray="2 2"/>${tri(CW / 2 + 0, 30)}`;
  },
  twp(P, s) {
    return `<rect x="4" y="20" width="${CW - 8}" height="${CH - 20}" fill="${P.surface}" stroke="${P.line}" stroke-width="1.2"/><path d="M0,22L${CW / 2},6L${CW},22" fill="none" stroke="${P.line}" stroke-width="1.4"/>
      ${pumpSym(P, 34, 66, 11)}${pumpSym(P, 76, 66, 11)}<path d="M0,66H23M45,66H65M14,66V50H96V40H${CW}" fill="none" stroke="${P.line}" stroke-width="2.2"/><path d="M87,66V50" stroke="${P.line}" stroke-width="2.2"/>
      <rect x="44" y="26" width="30" height="12" rx="2" fill="${P.surface}" stroke="${P.line}" stroke-width="1"/><path d="M48,32h22" stroke="${P.ok}" stroke-width="2"/>`;
  },
  supply(P, s) {
    return `<path d="M30,${CH}L44,40H74L88,${CH}" fill="none" stroke="${P.line}" stroke-width="1.6"/><path d="M38,${CH - 20}H80M41,${CH - 38}H77" stroke="${P.line}" stroke-width="1"/>
      <path d="M34,40V12Q59,0 84,12V40Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1.2"/><g class="pf-level"><rect x="38" y="20" width="42" height="18" fill="${s.cIn}"/></g>
      <path d="M59,40V${CH}" stroke="${P.line}" stroke-width="2"/><path d="M59,${CH - 4}H${CW - 4}" stroke="${s.cIn}" stroke-width="3" class="pf-flow2"/>${[0, 1, 2].map((k) => `<path d="M${96 + k * 6},${CH - 14}l3,4-3,4" fill="none" stroke="${P.prim}" stroke-width="1.4" class="pf-blink" style="animation-delay:${k * 0.3}s"/>`).join('')}`;
  },
  // residuals (smaller, row 3)
  recov(P, s) { return `${tank(P, 4, 14, CW - 8, 52, 5)}${water(9, 22, CW - 18, 39, s.cIn)}${particles(12, 30, CW - 40, 7, P.ground, 'pf-fall', 1.4, 20)}<path d="M9,58H${CW - 9}" stroke="${P.ground}" stroke-width="4"/>${pumpSym(P, CW - 22, 40, 7)}<path d="M${CW - 22},33V8H${CW - 78}V22" fill="none" stroke="${P.line}" stroke-width="1.6"/>`; },
  thick(P, s) { return `<path d="M4,14H${CW - 4}V44L66,66H52L4,44Z" fill="${P.concrete}" stroke="${P.line}" stroke-width="1"/><path d="M9,22H${CW - 9}V42L64,60H54L9,42Z" fill="${s.cIn}"/><path d="M59,4V58" stroke="${P.line}" stroke-width="2"/><g class="pf-rake"><path d="M59,54L16,40M59,54L102,40" stroke="${P.equip}" stroke-width="2"/></g>${particles(14, 26, CW - 30, 8, P.ground, 'pf-fall', 1.6, 16)}<path d="M54,61H64" stroke="${P.ground}" stroke-width="5"/>`; },
  dewater(P, s) {
    if (s.type === 'beds') return [6, 42, 78].map((x) => `${tank(P, x, 26, 34, 28, 4)}<rect x="${x + 4}" y="34" width="26" height="8" fill="${P.ground}"/><rect x="${x + 4}" y="42" width="26" height="8" fill="${P.sand}"/><path d="M${x + 6},38l4,-3 4,3 4,-3 4,3 4,-3" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>`).join('');
    return `<rect x="6" y="22" width="${CW - 12}" height="30" rx="15" fill="none" stroke="${P.line}" stroke-width="1.5"/>${[22, 46, 72, 96].map((x) => `<g class="pf-spin"><circle cx="${x}" cy="37" r="10" fill="${P.concrete}" stroke="${P.line}" stroke-width="1.2"/><path d="M${x - 10},37H${x + 10}M${x},27V47" stroke="${P.line}" stroke-width=".8"/></g>`).join('')}<path d="M6,22H${CW - 6}" stroke="${P.ground}" stroke-width="3.5" class="pf-belt"/><rect x="${CW - 34}" y="58" width="28" height="9" fill="${P.ground}"/>`;
  },
  cake(P, s) { return `<path d="M20,58L32,30H86L98,58Z" fill="${P.surface}" stroke="${P.line}" stroke-width="1.4"/><circle cx="38" cy="62" r="6" fill="${P.line}"/><circle cx="82" cy="62" r="6" fill="${P.line}"/><path d="M36,30q10,-10 20,-2q10,-10 22,0z" fill="${P.ground}"/><rect x="86" y="38" width="22" height="20" fill="${P.surface}" stroke="${P.line}" stroke-width="1.4"/>`; },
};

/** chemical dosing station symbol (bottom-centre at x, y) */
function station(P, x, y, kind, color) {
  if (kind === 'cyl') return `<g transform="translate(${x - 18},${y - 38})">${[0, 16].map((dx) => `<rect x="${dx + 2}" y="6" width="12" height="32" rx="5" fill="${P.cl}" stroke="${P.line}" stroke-width="1"/><rect x="${dx + 5}" y="1" width="6" height="6" fill="${P.line}"/>`).join('')}</g>`;
  if (kind === 'silo') return `<g transform="translate(${x - 12},${y - 40})"><path d="M0,0H24V26L12,36L0,26Z" fill="${P.surface}" stroke="${P.line}" stroke-width="1.2"/><path d="M12,36V40" stroke="${P.line}" stroke-width="2"/><rect x="4" y="8" width="16" height="14" fill="${color}" opacity=".45"/></g>`;
  return `<g transform="translate(${x - 14},${y - 40})"><rect x="0" y="8" width="28" height="30" rx="2" fill="${P.surface}" stroke="${P.line}" stroke-width="1.2"/><rect x="2" y="18" width="24" height="18" fill="${color}" opacity=".5"/><rect x="10" y="0" width="8" height="8" fill="${P.equip}"/><path d="M14,8V30" stroke="${P.line}" stroke-width="1.2"/><g class="pf-flip"><rect x="7" y="28" width="14" height="3" fill="${P.equip}"/></g></g>`;
}

function subText(key, r) {
  try {
    switch (key) {
      case 'intake': return r.intake ? `Screens ${r.intake.inputs.cOpen}/${r.intake.inputs.fOpen} mm · DN${r.intake.cdn}` : '';
      case 'rwp': return r.intake?.pumps ? `${r.intake.pumps.nDuty ?? ''}${r.intake.pumps.nStandby !== undefined ? '+' + r.intake.pumps.nStandby : ''} pumps · ${fmt(r.intake.kw, 0)} kW` : '';
      case 'aeration': return r.aeration ? `${fmt(r.aeration.area, 0)} m² · DO ${fmt(r.aeration.Ce, 1)}` : '';
      case 'presed': return r.sed ? `${r.sed.N} × ${fmt(r.sed.L, 0)} × ${fmt(r.sed.W, 0)} m` : '';
      case 'rapidmix': return r.rapidmix ? `G ${fmt(r.rapidmix.Gact ?? r.rapidmix.G, 0)} s⁻¹ · ${fmt(r.rapidmix.tAct ?? r.rapidmix.t, 1)} s` : '';
      case 'floc': return r.floc ? `${fmt(r.floc.ttot, 0)} min · Gt ${fmt(r.floc.Gt / 1000, 0)}k` : '';
      case 'sed': return r.sed?.sorAct ? `${r.sed.N} × ${fmt(r.sed.L, 0)} × ${fmt(r.sed.W, 0)} m` : '';
      case 'filt': return r.filt ? `${r.filt.N} × ${fmt(r.filt.Af, 0)} m² @ ${fmt(r.filt.rate, 1)} m/h` : '';
      case 'dis': return r.dis ? `${fmt(r.dis.V, 0)} m³ · CT ×${fmt(r.dis.ratio, 1)}` : '';
      case 'cwr': return r.storage ? `${fmt(r.storage.V, 0)} m³` : '';
      case 'twp': return r.storage?.pumps ? `${fmt(r.storage.kw, 0)} kW · ${fmt(r.storage.pumps.H, 0)} m head` : '';
      case 'supply': return r.storage ? `SR ${fmt(r.storage.srV, 0)} m³` : '';
      case 'recov': return r.sludge ? `${fmt(r.sludge.recTank, 0)} m³ tank` : '';
      case 'thick': return r.sludge?.thick ? `Ø ${fmt(r.sludge.thick.D, 1)} m × ${r.sludge.thick.n}` : '';
      case 'dewater': return r.sludge ? (r.process.sludge !== 'mechanical' ? `${r.sludge.nBeds} beds · ${fmt(r.sludge.bedArea, 0)} m²` : `${fmt(r.sludge.dsDes, 0)} kg DS/d`) : '';
      case 'cake': return r.sludge ? `${fmt(r.sludge.cakeT, 0)} t/yr` : '';
      default: return '';
    }
  } catch { return ''; }
}
const NAME = { intake: 'Intake & screens', rwp: 'Raw-water pumps', aeration: 'Aerator', presed: 'Pre-sedimentation', rapidmix: 'Rapid mixing', floc: 'Flocculation', sed: 'Sedimentation', filt: 'Filtration', dis: 'Chlorine contact', cwr: 'Clear water reservoir', twp: 'Treated-water pumps', supply: 'To supply', recov: 'Wash-water recovery', thick: 'Sludge thickener', dewater: 'Dewatering', cake: 'Cake disposal' };

/** water state leaving each PFD unit, from the design chain */
function streamState(r) {
  const st = Object.fromEntries((r.chain?.stages || []).map((s) => [s.key, s.out]));
  const pick = (...keys) => { for (const k of keys) if (st[k]) return st[k]; return st.raw || {}; };
  return {
    raw: st.raw || {}, intake: pick('intake'), rwp: pick('intake'), aeration: pick('aeration', 'intake'), presed: pick('presed', 'aeration', 'intake'),
    rapidmix: pick('rapidmix', 'coag', 'presed', 'aeration', 'intake'), floc: pick('floc', 'rapidmix', 'coag'), sed: pick('sed', 'floc'), filt: pick('filt'),
    dis: pick('dis', 'filt'), cwr: pick('cwr', 'stab', 'dis'), twp: pick('cwr', 'stab', 'dis'), supply: pick('cwr', 'stab', 'dis'),
  };
}

export function pfdSVG(r, { width = 1100, interactive = true, statik = false } = {}) {
  void width;
  const P = statik ? LIGHT : VARS;
  const pr = r.process;
  const keys = pr.train.map((t) => t.key);
  const has = (k) => keys.includes(k);
  const ss = streamState(r);
  const status = (mod) => { const c = (r.checks || []).filter((x) => x.module === mod); return c.some((x) => x.status === 'fail') ? 'fail' : c.some((x) => x.status === 'warn') ? 'warn' : 'ok'; };
  // ---- main line units
  const row1 = ['intake', 'rwp', 'aeration', 'presed', 'rapidmix', 'floc', 'sed', 'filt'].filter((k) => has(k) || (k === 'rapidmix' && has('coag') && !pr.ssf && has('rapidmix')));
  const row2 = ['dis', 'cwr', 'twp', 'supply'];
  const n1 = row1.length, ncols = Math.max(n1, 4);
  const M = 40, X = (col) => M + col * (CW + G);
  const Y1 = 116, Y2 = Y1 + CH + 132, laneA = Y1 + CH + 46, laneB = Y2 + CH + 46, Y3 = laneB + 26;
  const sludgeOn = has('sludge');
  const H = sludgeOn ? Y3 + 70 + 52 : Y2 + CH + 52;
  const W = X(ncols - 1) + CW + 74;
  const units = [];
  row1.forEach((k, i) => units.push({ key: k, row: 1, x: X(i), y: Y1, flip: false }));
  row2.forEach((k, i) => units.push({ key: k, row: 2, x: X(ncols - 1 - i), y: Y2, flip: true }));
  const prevOf = { intake: 'raw' };
  const seq = [...row1, ...row2];
  seq.forEach((k, i) => { if (i) prevOf[k] = seq[i - 1]; });
  const inState = (k) => (k === 'intake' ? ss.raw : ss[prevOf[k]] || ss.raw);
  const outState = (k) => ss[k] || {};
  const typeOf = { rapidmix: pr.rapidMix, floc: pr.floc, sed: pr.clarifier, filt: pr.filter, dewater: pr.sludge === 'mechanical' ? 'mech' : 'beds' };
  const out = [];
  const css = statik ? '' : `<style>
    .pf-flow{stroke-dasharray:9 11;animation:pfFlow 1.1s linear infinite}.pf-flow2{stroke-dasharray:6 6;animation:pfFlow2 .9s linear infinite}.pf-flow3{stroke-dasharray:5 7;animation:pfFlow3 1.6s linear infinite}
    @keyframes pfFlow{to{stroke-dashoffset:-20}}@keyframes pfFlow2{to{stroke-dashoffset:-12}}@keyframes pfFlow3{to{stroke-dashoffset:-24}}
    .pf-spin{transform-box:fill-box;transform-origin:center;animation:pfSpin 1.6s linear infinite}.pf-spin.slow{animation-duration:5s}@keyframes pfSpin{to{transform:rotate(360deg)}}
    .pf-flip{transform-box:fill-box;transform-origin:center;animation:pfFlip .8s linear infinite}@keyframes pfFlip{0%,100%{transform:scaleX(1)}50%{transform:scaleX(-1)}}
    .pf-fall{animation:pfFall 3.2s linear infinite}@keyframes pfFall{0%{transform:translateY(-5px);opacity:0}15%,80%{opacity:1}100%{transform:translateY(20px);opacity:0}}
    .pf-drift{animation:pfDrift 4s ease-in-out infinite}@keyframes pfDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(6px,3px)}}
    .pf-rise{animation:pfRise 2.2s linear infinite}@keyframes pfRise{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-18px);opacity:0}}
    .pf-swirl{animation:pfSwirl 1.4s linear infinite}@keyframes pfSwirl{0%{transform:translate(0,0);opacity:0}30%{opacity:1}100%{transform:translate(8px,-20px);opacity:0}}
    .pf-bw{opacity:0;animation:pfBw 12s linear infinite}@keyframes pfBw{0%,78%{opacity:0;transform:translateY(0)}82%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
    .pf-drip{animation:pfDrip 1.2s linear infinite}@keyframes pfDrip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(14px);opacity:0}}
    .pf-down{stroke-dasharray:4 8;animation:pfDown 1.4s linear infinite}@keyframes pfDown{to{stroke-dashoffset:-24}}
    .pf-wave{animation:pfWave 2.4s linear infinite}@keyframes pfWave{to{transform:translateX(16px)}}
    .pf-scrape{animation:pfScrape 9s ease-in-out infinite alternate}@keyframes pfScrape{to{transform:translateX(56px)}}
    .pf-rake{transform-box:view-box;animation:pfRake 4s ease-in-out infinite alternate}@keyframes pfRake{to{transform:skewY(-4deg)}}
    .pf-level{transform-box:fill-box;transform-origin:bottom;animation:pfLevel 7s ease-in-out infinite alternate}@keyframes pfLevel{to{transform:scaleY(.82)}}
    .pf-churn{transform-box:fill-box;transform-origin:center;animation:pfSpin 1s linear infinite}.pf-churn.d2{animation-duration:1.4s;animation-direction:reverse}
    .pf-belt{stroke-dasharray:6 4;animation:pfFlow2 1s linear infinite}.pf-blink{animation:pfBlink 1.2s linear infinite}@keyframes pfBlink{50%{opacity:.2}}
    .pf-pulse{transform-box:fill-box;transform-origin:center;animation:pfPulse 1.4s ease-out infinite}@keyframes pfPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}
    .pf-u{cursor:pointer}.pf-u:hover .pf-hl{opacity:1}.pf-hl{opacity:0;transition:opacity .15s}
    .pf-paused *{animation-play-state:paused!important}
    @media (prefers-reduced-motion:reduce){.pf-root *{animation:none!important}}
  </style>`;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" class="pf-root" font-family="Segoe UI, Arial, sans-serif" style="max-width:${W * 1.25}px">${css}`);
  // gradients for settling tanks (top = settled colour, bottom = inflow colour)
  const defs = ['<defs>', `<marker id="pf-arr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="${P.line}"/></marker>`];
  for (const k of ['presed', 'sed']) if (row1.includes(k)) defs.push(`<linearGradient id="pfg-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${waterColor(outState(k).turb)}"/><stop offset="1" stop-color="${waterColor(inState(k).turb)}"/></linearGradient>`);
  defs.push('</defs>');
  out.push(defs.join(''));
  // background bands
  out.push(`<rect x="10" y="${Y1 - 22}" width="${W - 20}" height="${CH + 64}" rx="12" fill="${statik ? '#f4f7fb' : 'color-mix(in srgb, var(--primary) 4%, transparent)'}"/>`);
  out.push(`<text x="20" y="${Y1 - 28}" font-size="10" font-weight="700" letter-spacing=".8" fill="${P.muted}">RAW WATER → TREATMENT</text>`);
  out.push(`<rect x="10" y="${Y2 - 22}" width="${W - 20}" height="${CH + 64}" rx="12" fill="${statik ? '#f3f8f5' : 'color-mix(in srgb, var(--ok) 4%, transparent)'}"/>`);
  out.push(`<text x="20" y="${Y2 - 28}" font-size="10" font-weight="700" letter-spacing=".8" fill="${P.muted}">SUPPLY ← TREATED WATER</text>`);
  if (sludgeOn) {
    out.push(`<rect x="10" y="${Y3 - 14}" width="${W - 20}" height="${70 + 46}" rx="12" fill="${statik ? '#f8f5f0' : 'color-mix(in srgb, var(--dw-ground) 6%, transparent)'}"/>`);
    out.push(`<text x="20" y="${Y3 - 20}" font-size="10" font-weight="700" letter-spacing=".8" fill="${P.muted}">RESIDUALS – SLUDGE &amp; WASH WATER</text>`);
  }
  const pipeY = (u) => u.y + 50;
  // ---- main pipes with stream numbers
  const streams = [];
  const allMain = units;
  for (let i = 0; i < allMain.length - 1; i++) {
    const a = allMain[i], b = allMain[i + 1];
    const col = waterColor(outState(a.key).turb, 0.95);
    let d;
    if (a.row === b.row) {
      d = a.row === 1 ? `M${a.x + CW},${pipeY(a)}H${b.x}` : `M${a.x},${pipeY(a)}H${b.x + CW}`;
    } else {
      const xr = Math.max(a.x, b.x) + CW + 30;
      d = `M${a.x + CW},${pipeY(a)}H${xr}V${pipeY(b)}H${b.x + CW}`;
    }
    out.push(`<path d="${d}" fill="none" stroke="${P.line}" stroke-width="8" stroke-linejoin="round" opacity=".85"/><path d="${d}" fill="none" stroke="${col}" stroke-width="5.2" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" class="pf-flow"/>`);
    // stream diamond
    const n = streams.length + 1;
    let sx, sy;
    if (a.row === b.row) { sx = a.row === 1 ? a.x + CW + G / 2 : b.x + CW + G / 2; sy = pipeY(a) - 15; } else { sx = Math.max(a.x, b.x) + CW + 30; sy = (pipeY(a) + pipeY(b)) / 2; }
    out.push(`<g><path d="M${sx},${sy - 9}L${sx + 9},${sy}L${sx},${sy + 9}L${sx - 9},${sy}Z" fill="${P.surface}" stroke="${P.prim}" stroke-width="1.3"/><text x="${sx}" y="${sy + 3.5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${P.prim}">${n}</text></g>`);
    streams.push({ n, from: a.key, to: b.key, state: outState(a.key) });
  }
  // raw water arrow into intake & supply arrow
  const first = units[0];
  out.push(`<text x="${first.x + 2}" y="${first.y + CH + 2}" font-size="0"> </text>`);
  // ---- chemical dosing stations
  const st = [];
  const firstProc = row1.find((k) => !['intake', 'rwp'].includes(k)) || row1[0];
  const uOf = (k) => units.find((u) => u.key === k);
  const coagName = r.coag?.coag?.label ? r.coag.coag.label.split(' (')[0].replace('Aluminium sulphate', 'Alum').replace('Polyaluminium chloride', 'PACl').replace('Ferric chloride', 'FeCl₃') : 'Coagulant';
  if (pr.pac === 'yes' && r.coag?.pac) st.push({ k: 'pac', at: firstProc, label: `PAC ${fmt(r.coag.pac.dose ?? r.coag.pac.Ddes ?? 0, 0)} mg/L`, kind: 'tank', color: P.anth });
  if (pr.prechlor === 'yes') st.push({ k: 'prechlor', at: firstProc, label: 'Pre-Cl₂', kind: 'cyl', color: P.cl });
  if (r.coag && has('coag')) {
    const at = row1.includes('rapidmix') ? 'rapidmix' : row1.includes('floc') ? 'floc' : 'filt';
    st.push({ k: 'coag', at, label: `${coagName} ${fmt(r.coag.Ddes, 0)} mg/L`, kind: 'tank', color: P.chem });
    if (r.coag.limeDose > 0) st.push({ k: 'limecoag', at, label: `Lime ${fmt(r.coag.limeDose, 0)} mg/L`, kind: 'silo', color: P.lime });
    if ((r.coag.inputs?.polymer || 0) > 0) st.push({ k: 'poly', at: row1.includes('floc') ? 'floc' : at, label: `Polymer ${fmt(r.coag.inputs.polymer, 2)} mg/L`, kind: 'tank', color: '#6250d6' });
  }
  if (r.dis) st.push({ k: 'cl2', at: 'dis', label: `${r.dis.key === 'gas' ? 'Cl₂' : r.dis.key === 'naocl' ? 'NaOCl' : 'Bleach'} ${fmt(r.dis.totDose, 1)} mg/L`, kind: r.dis.key === 'gas' ? 'cyl' : 'tank', color: P.cl });
  if (r.stab?.apply && r.stab.lime > 0) st.push({ k: 'stab', at: 'cwr', label: `Lime ${fmt(r.stab.lime, 0)} mg/L`, kind: 'silo', color: P.lime });
  const byAt = {};
  for (const s of st) (byAt[s.at] ||= []).push(s);
  for (const [at, list] of Object.entries(byAt)) {
    const u = uOf(at);
    if (!u) continue;
    list.forEach((s, j) => {
      const nn = list.length;
      const cx = u.x + CW / 2 + (j - (nn - 1) / 2) * 58;
      const by = u.y - 30;
      const ly = by - 44 - (nn > 1 && j % 2 ? 11 : 0);
      const tx = u.row === 1 ? u.x + 12 : u.x + CW - 12; // dosing point at the unit inlet
      out.push(`<g class="pf-u" ${interactive ? `data-page="${PAGE_OF[s.k] || ''}"` : ''}><title>${s.label}</title>${station(P, cx, by, s.kind, s.color)}
        <path d="M${cx},${by}V${by + 8}H${tx}V${u.y + 8}" fill="none" stroke="${s.color}" stroke-width="1.6" stroke-dasharray="3 3" class="pf-flow2"/>
        ${[0, 1].map((q) => `<circle cx="${tx}" cy="${u.y + 4}" r="1.8" fill="${s.color}" class="pf-drip" style="animation-delay:${q * 0.6}s"/>`).join('')}
        <text x="${cx}" y="${ly}" text-anchor="middle" font-size="9.5" font-weight="600" fill="${s.color === P.lime ? P.text : s.color}">${s.label}</text></g>`);
    });
  }
  // ---- units
  for (const u of units) {
    const sIn = inState(u.key), sOut = outState(u.key);
    const spec = { id: u.key, type: typeOf[u.key], cIn: waterColor(sIn.turb), cOut: waterColor(sOut.turb) };
    const draw = UNITS[u.key] ? UNITS[u.key](P, spec) : '';
    const mod = MOD_OF[u.key];
    const stt = mod ? status(mod) : 'ok';
    const tip = `${NAME[u.key]} – ${subText(u.key, r)}${sOut.Q ? ` | out: ${fmt(sOut.Q, 0)} m³/d, ${fmt(sOut.turb, sOut.turb < 10 ? 2 : 0)} NTU${sOut.pH ? `, pH ${fmt(sOut.pH, 1)}` : ''}` : ''}`;
    out.push(`<g class="pf-u" ${interactive ? `data-page="${PAGE_OF[u.key] || ''}"` : ''} transform="translate(${u.x},${u.y})"><title>${tip}</title>`);
    out.push(`<rect class="pf-hl" x="-6" y="-6" width="${CW + 12}" height="${CH + 40}" rx="9" fill="none" stroke="${P.prim}" stroke-width="1.5"/>`);
    out.push(u.flip ? `<g transform="translate(${CW},0) scale(-1,1)">${draw}</g>` : draw);
    out.push(`<text x="${CW / 2}" y="${CH + 15}" text-anchor="middle" font-size="11" font-weight="700" fill="${P.text}">${u.key === 'presed' && pr.ssf ? (r.sed?.type === 'hrf' ? 'Roughing filters' : 'Plain sedimentation') : u.key === 'sed' && r.sed?.type === 'daf' ? 'Flotation (DAF)' : u.key === 'filt' && pr.ssf ? 'Slow sand filters' : NAME[u.key]}</text>`);
    out.push(`<text x="${CW / 2}" y="${CH + 27}" text-anchor="middle" font-size="9.2" fill="${P.muted}">${subText(u.key, r)}</text>`);
    if (mod && u.key !== 'supply') {
      const c = stt === 'fail' ? P.fail : stt === 'warn' ? P.warn : P.ok;
      out.push(`<g transform="translate(${CW - 2},2)">${stt !== 'ok' && !statik ? `<circle r="6" fill="${c}" class="pf-pulse"/>` : ''}<circle r="6" fill="${c}" stroke="${P.surface}" stroke-width="1.6"/><path d="${stt === 'ok' ? 'M-2.6,0l1.8,1.8 3.4-3.6' : stt === 'warn' ? 'M0,-3V1M0,2.6v.4' : 'M-2.2,-2.2l4.4,4.4M2.2,-2.2l-4.4,4.4'}" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`);
    }
    out.push('</g>');
  }
  // inlet arrow (river) and supply arrow
  out.push(`<text x="${first.x + 3}" y="${first.y + CH - 16}" font-size="8.5" font-weight="700" fill="#fff">Raw</text><text x="${first.x + 3}" y="${first.y + CH - 6}" font-size="8" fill="#fff">${fmt(r.chain?.stages?.[0]?.out?.turb ?? r.quality.turbMax, 0)} NTU</text>`);
  // ---- residuals
  if (sludgeOn) {
    const recOn = pr.recovery === 'yes' && !pr.ssf && row1.includes('filt');
    const sl = [recOn ? 'recov' : null, pr.sludge !== 'beds' ? 'thick' : null, 'dewater', 'cake'].filter(Boolean);
    const su = sl.map((k, i) => ({ key: k, x: X(ncols - 1 - i), y: Y3 }));
    const rx = W - 26;
    const sedU = uOf('sed') || uOf('presed'), filtU = pr.ssf ? null : uOf('filt');
    const sludgeC = statik ? '#8a6d3b' : 'var(--dw-ground)';
    const washC = P.wash;
    // collection lines from the top row along lane A, down the right margin and into the residuals row
    if (sedU) out.push(`<path d="M${sedU.x + 9},${sedU.y + CH}V${laneA}H${rx}V${laneB}H${(su.find((x) => x.key === 'thick') || su.find((x) => x.key === 'dewater')).x + CW - 30}V${Y3 + 10}" fill="none" stroke="${sludgeC}" stroke-width="2.4" stroke-dasharray="6 4" class="pf-flow2"/>`);
    if (filtU) {
      const tgt = su.find((x) => x.key === (recOn ? 'recov' : 'thick')) || su.find((x) => x.key === 'dewater');
      out.push(`<path d="M${filtU.x + CW - 3},${filtU.y + CH}V${laneA + 6}H${rx - 6}V${laneB - 6}H${tgt.x + CW - 14}V${Y3 + 10}" fill="none" stroke="${washC}" stroke-width="2.4" stroke-dasharray="6 4" class="pf-flow2"/>`);
    }
    out.push(`<text x="${(sedU || filtU || first).x + 16}" y="${laneA - 5}" font-size="9.5" font-weight="600" fill="${sludgeC}">Sludge${filtU ? ' &amp; filter wash water' : ''} → residuals</text>`);
    // between residual units (right → left)
    for (let i = 0; i < su.length - 1; i++) {
      const a = su[i], b = su[i + 1];
      out.push(`<path d="M${a.x},${a.y + 40}H${b.x + CW}" fill="none" stroke="${sludgeC}" stroke-width="3" stroke-dasharray="6 4" class="pf-flow2" marker-end="url(#pf-arr)"/>`);
    }
    // recovered water back to the head of works
    if (recOn) {
      const rec = su[0];
      const head = uOf('rapidmix') || uOf(firstProc);
      out.push(`<path d="M${rec.x + CW - 40},${rec.y + 8}V${Y3 - 6}H18V${Y1 - 12}H${head.x - 12}V${pipeY(head) - 6}" fill="none" stroke="${washC}" stroke-width="2" stroke-dasharray="7 5" class="pf-flow2" marker-end="url(#pf-arr)"/>`);
      out.push(`<text x="30" y="${Y3 + 8}" font-size="9.5" font-weight="600" fill="${washC}">↑ Recovered wash water → head of works (${fmt(r.sludge?.recRate ?? 0, 1)} % of inflow)</text>`);
    }
    for (const u of su) {
      const spec = { id: u.key, type: typeOf[u.key], cIn: waterColor(u.key === 'recov' ? 60 : 400) };
      const draw = UNITS[u.key](P, spec);
      out.push(`<g class="pf-u" ${interactive ? `data-page="sludge"` : ''} transform="translate(${u.x},${u.y})"><title>${NAME[u.key]} – ${subText(u.key, r)}</title><rect class="pf-hl" x="-6" y="-6" width="${CW + 12}" height="${70 + 38}" rx="9" fill="none" stroke="${P.prim}" stroke-width="1.5"/><g transform="translate(${CW},0) scale(-1,1)">${draw}</g>
        <text x="${CW / 2}" y="${84}" text-anchor="middle" font-size="11" font-weight="700" fill="${P.text}">${u.key === 'dewater' && typeOf.dewater === 'beds' ? 'Drying beds' : NAME[u.key]}</text><text x="${CW / 2}" y="${96}" text-anchor="middle" font-size="9.2" fill="${P.muted}">${subText(u.key, r)}</text></g>`);
    }
  }
  out.push('</svg>');
  return { svg: out.join(''), streams, W, H };
}

/** stream table rows for the PFD */
export function streamRows(r) {
  const { streams } = pfdSVG(r, { interactive: false, statik: true });
  return streams.map((s) => ({ n: s.n, from: NAME[s.from], to: NAME[s.to], Q: s.state.Q, wl: s.state.wl, turb: s.state.turb, pH: s.state.pH, cl: s.state.cl }));
}

/** interactive PFD block: diagram + legend + stream table toggle + pause */
export function pfdBlock(r, { streamsOpen = false } = {}) {
  const { svg, streams } = pfdSVG(r, { interactive: true });
  const box = h('div', { class: 'pfd2' });
  const fig = h('div', { class: 'pfd2-fig', html: svg });
  fig.addEventListener('click', (e) => { const g = e.target.closest('[data-page]'); if (g && g.dataset.page) navigate(g.dataset.page); });
  const tbl = h('table', { class: 'res pfd2-streams' }, h('thead', null, h('tr', null, ['Stream', 'From → to', 'Flow (m³/d)', 'WL (m MSL)', 'Turbidity (NTU)', 'pH', 'Cl₂ (mg/L)'].map((x, i) => h('th', { class: i > 1 ? 'num' : '' }, x)))),
    h('tbody', null, streams.map((s) => h('tr', null, h('td', null, h('span', { class: 'pfd2-dia' }, s.n)), h('td', null, `${NAME[s.from]} → ${NAME[s.to]}`),
      h('td', { class: 'num' }, fmt(s.state.Q, 0)), h('td', { class: 'num' }, s.state.wl !== null && s.state.wl !== undefined ? fmt(s.state.wl, 2) : '–'), h('td', { class: 'num' }, fmt(s.state.turb, s.state.turb < 10 ? 2 : 0)), h('td', { class: 'num' }, s.state.pH ? fmt(s.state.pH, 2) : '–'), h('td', { class: 'num' }, s.state.cl ? fmt(s.state.cl, 1) : '–')))));
  const tWrap = h('div', { class: 'pfd2-tbl', style: { display: streamsOpen ? '' : 'none' } }, tbl);
  let paused = false;
  const pauseBtn = h('button', { class: 'btn sm ghost', onclick: () => { paused = !paused; fig.querySelector('svg')?.classList.toggle('pf-paused', paused); pauseBtn.lastChild.textContent = paused ? 'Animate' : 'Pause'; pauseBtn.firstChild.replaceWith(icon(paused ? 'play' : 'pause')); } }, icon('pause'), 'Pause');
  const legend = h('div', { class: 'pfd2-leg' },
    h('span', { class: 'lg' }, h('span', { class: 'lg-grad' }), 'Water colour = turbidity (muddy → clear)'),
    h('span', { class: 'lg' }, h('span', { class: 'lg-line chem' }), 'Chemical dosing'),
    h('span', { class: 'lg' }, h('span', { class: 'lg-line sludge' }), 'Sludge'),
    h('span', { class: 'lg' }, h('span', { class: 'lg-line wash' }), 'Wash water'),
    h('span', { class: 'lg' }, h('span', { class: 'lg-dia' }, '1'), 'Stream number'),
    h('span', { class: 'lg' }, h('span', { class: 'dot ok' }), h('span', { class: 'dot warn' }), h('span', { class: 'dot fail' }), 'Design status'),
    h('span', { style: { marginLeft: 'auto', display: 'flex', gap: '4px' } },
      h('button', { class: 'btn sm ghost', onclick: () => { tWrap.style.display = tWrap.style.display === 'none' ? '' : 'none'; } }, icon('table'), 'Stream table'), pauseBtn));
  box.append(fig, legend, tWrap);
  return box;
}
