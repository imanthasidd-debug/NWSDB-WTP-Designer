// Tiny DOM helpers
import { ICON_PATHS } from './icons.gen.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const icon = (name, cls = '') => {
  const s = `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.info}</svg>`;
  const t = document.createElement('template');
  t.innerHTML = s;
  return t.content.firstChild;
};
export const iconSvg = (name, size = 16) => `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
export const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
export const frag = (...kids) => { const f = document.createDocumentFragment(); f.append(...kids.flat().filter(Boolean)); return f; };
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

let toastTimer;
export function toast(msg, ic = 'ok') {
  let t = document.querySelector('.toast');
  if (!t) { t = h('div', { class: 'toast' }); document.body.append(t); }
  clear(t).append(icon(ic), h('span', null, msg));
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
export function modal(title, body, buttons = [{ label: 'OK', primary: true }]) {
  return new Promise((resolve) => {
    const bg = h('div', { class: 'modal-bg' });
    const close = (v) => { bg.remove(); resolve(v); };
    const m = h('div', { class: 'modal' },
      h('div', { class: 'mh2' }, title),
      h('div', { class: 'mb' }, typeof body === 'string' ? h('div', { html: body }) : body),
      h('div', { class: 'mf' }, buttons.map((b) => h('button', { class: 'btn' + (b.primary ? ' primary' : ''), onclick: () => close(b.value ?? b.label) }, b.label))));
    bg.append(m);
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(null); });
    document.body.append(bg);
  });
}
export function popupMenu(anchor, items) {
  document.querySelectorAll('.menu').forEach((m) => m.remove());
  const r = anchor.getBoundingClientRect();
  const m = h('div', { class: 'menu', style: { left: r.left + 'px', top: r.bottom + 4 + 'px' } });
  for (const it of items) {
    if (it === '-') { m.append(h('div', { class: 'msep' })); continue; }
    if (it.header) { m.append(h('div', { class: 'mh' }, it.header)); continue; }
    m.append(h('div', { class: 'mi', onclick: () => { m.remove(); it.action(); } }, it.icon ? icon(it.icon) : h('span', { style: { width: '16px' } }), h('span', null, it.label), it.kbd ? h('span', { class: 'kbd' }, it.kbd) : null));
  }
  document.body.append(m);
  const off = (e) => { if (!m.contains(e.target) && e.target !== anchor) { m.remove(); document.removeEventListener('mousedown', off); } };
  setTimeout(() => document.addEventListener('mousedown', off), 0);
  return m;
}
