import { LOGO_BANNER, LOGO_EMBLEM } from './logo.js';

export const DEVELOPER = 'Eng. Imantha Dilshan';
export const CREDIT = 'Developed by Eng. Imantha Dilshan';
export { LOGO_BANNER, LOGO_EMBLEM };
/** official NWSDB emblem (circular) as an <img> */
export const emblemImg = (size = 24, cls = 'logo') =>
  `<img class="${cls}" src="${LOGO_EMBLEM}" width="${size}" height="${size}" alt="NWSDB" style="width:${size}px;height:${size}px;object-fit:contain">`;
/** official NWSDB banner (emblem + trilingual name) */
export const bannerImg = (height = 48, cls = 'nwsdb-banner') =>
  `<img class="${cls}" src="${LOGO_BANNER}" alt="National Water Supply & Drainage Board" style="height:${height}px;width:auto">`;

// Legacy vector emblem (fallback)
export function emblemSVG(size = 24, { mono = false } = {}) {
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="WTP Designer">
  <defs><linearGradient id="emb-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mono ? '#fff' : '#36b4f0'}"/><stop offset="1" stop-color="${mono ? '#dfe9f7' : '#0b63b6'}"/></linearGradient></defs>
  <circle cx="32" cy="32" r="30" fill="${mono ? 'rgba(255,255,255,.12)' : '#0a3d7a'}" stroke="${mono ? 'rgba(255,255,255,.55)' : '#36b4f0'}" stroke-width="2"/>
  <path d="M32 9 C32 9 15 29 15 39.5 C15 49 22.6 56 32 56 C41.4 56 49 49 49 39.5 C49 29 32 9 32 9 Z" fill="url(#emb-g)"/>
  <path d="M19 41 q4.3-4 8.6 0 t8.6 0 t8.6 0" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M21 47.5 q3.7-3.4 7.4 0 t7.4 0 t7.4 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
  <path d="M27 24 q-4 6 -4 10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
</svg>`;
}
