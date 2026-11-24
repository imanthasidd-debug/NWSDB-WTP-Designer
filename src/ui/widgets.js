// Shared interactive widgets: design-basis picker, capacity presets, choice cards
import { fmt } from '../core/util.js';
import { h, icon } from './dom.js';
import { setInput, store } from './store.js';

/** big two-way choice: demand forecast vs specified capacity */
export function basisCards() {
  const d = store.project.inputs.demand || {};
  const basis = d.basis || 'forecast';
  const r = store.results;
  const mk = (k, ic, title, text) =>
    h(
      'button',
      {
        class: 'choice' + (basis === k ? ' on' : ''),
        onclick: () => setInput(['demand', 'basis'], k, { immediate: true }),
      },
      h('div', { class: 'choice-ic' }, icon(ic)),
      h('div', { class: 'choice-t' }, title),
      h('div', { class: 'choice-d' }, text),
      basis === k ? h('span', { class: 'choice-tick' }, icon('ok')) : null,
    );
  return h(
    'div',
    { class: 'choice-row two' },
    mk(
      'forecast',
      'users',
      'Demand forecast',
      `Population projection, per-capita demand, NRW and D2 peaking give the capacity${basis === 'forecast' ? ` – now ${fmt(r.demand.Qd, 0)} m³/d` : ''}.`,
    ),
    mk(
      'capacity',
      'droplets',
      'Specified capacity',
      `Design for a pre-determined capacity (e.g. 25,000 m³/d)${basis === 'capacity' ? ` – now ${fmt(r.demand.Qd, 0)} m³/d` : ''}; flows for pumping & storage are back-calculated.`,
    ),
  );
}
/** quick capacity presets */
export function capacityPresets() {
  const cur = +(store.project.inputs.demand?.capacity || 0);
  return h(
    'div',
    { class: 'chips' },
    [2500, 5000, 10000, 15000, 25000, 40000, 60000, 100000].map((v) =>
      h(
        'button',
        {
          class: 'chip' + (cur === v ? ' on' : ''),
          onclick: () => {
            setInput(['demand', 'capacity'], v, { immediate: true });
          },
        },
        `${fmt(v, 0)}`,
      ),
    ),
    h('span', { class: 'small muted', style: { marginLeft: '6px' } }, 'm³/d'),
  );
}
/** generic choice cards for one option set (used by the plant configurator) */
export function choiceCards(options, current, onPick, { cols } = {}) {
  return h(
    'div',
    { class: 'choice-row', style: cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : null },
    options.map((o) =>
      h(
        'button',
        {
          class: 'choice' + (o.key === current ? ' on' : '') + (o.bad ? ' bad' : '') + (o.rec ? ' rec' : ''),
          title: o.tip || '',
          onclick: () => onPick(o.key),
        },
        o.art
          ? h('div', { class: 'choice-art', html: o.art })
          : o.icon
            ? h('div', { class: 'choice-ic' }, icon(o.icon))
            : null,
        h('div', { class: 'choice-t' }, o.label),
        o.desc ? h('div', { class: 'choice-d' }, o.desc) : null,
        o.rec ? h('span', { class: 'choice-badge rec' }, icon('sparkles'), 'Recommended') : null,
        o.bad ? h('span', { class: 'choice-badge bad' }, icon('warn'), o.bad) : null,
        o.key === current ? h('span', { class: 'choice-tick' }, icon('ok')) : null,
      ),
    ),
  );
}

/** compact design-basis switch for the dashboard: forecast | specified capacity (+ value & presets) */
export function basisSwitch() {
  const d = store.project.inputs.demand || {};
  const basis = d.basis || 'forecast';
  const seg = h(
    'div',
    { class: 'seg bs-seg' },
    h(
      'button',
      {
        class: basis === 'forecast' ? 'on' : '',
        onclick: () => setInput(['demand', 'basis'], 'forecast', { immediate: true }),
      },
      icon('users'),
      'Demand forecast',
    ),
    h(
      'button',
      {
        class: basis === 'capacity' ? 'on' : '',
        onclick: () => setInput(['demand', 'basis'], 'capacity', { immediate: true }),
      },
      icon('droplets'),
      'Specified capacity',
    ),
  );
  const box = h('div', { class: 'bs' }, seg);
  if (basis === 'capacity') {
    const inp = h('input', { type: 'number', step: 500, value: d.capacity ?? 25000 });
    inp.addEventListener('change', () => {
      const v = parseFloat(inp.value);
      if (v > 0) setInput(['demand', 'capacity'], v, { immediate: true });
    });
    box.append(
      h(
        'div',
        { class: 'bs-cap' },
        h('div', { class: 'inp' }, inp, h('span', { class: 'u' }, 'm³/d')),
        h(
          'div',
          { class: 'seg bs-type' },
          h(
            'button',
            {
              class: (d.capacityType || 'throughput') === 'throughput' ? 'on' : '',
              title: 'Plant inflow (raw water treated)',
              onclick: () => setInput(['demand', 'capacityType'], 'throughput', { immediate: true }),
            },
            'throughput',
          ),
          h(
            'button',
            {
              class: d.capacityType === 'output' ? 'on' : '',
              title: 'Treated water delivered (losses added)',
              onclick: () => setInput(['demand', 'capacityType'], 'output', { immediate: true }),
            },
            'output',
          ),
        ),
      ),
      capacityPresets(),
    );
  }
  return box;
}

/** ring gauge (pass fraction) */
export function ringGauge(label, ok, total, { status, sub, onClick } = {}) {
  const frac = total > 0 ? ok / total : 0;
  const st = status || (frac >= 0.999 ? 'ok' : frac > 0.9 ? 'warn' : 'fail');
  const R = 30,
    C = 2 * Math.PI * R;
  const svg = `<svg viewBox="0 0 80 80" width="78" height="78"><circle cx="40" cy="40" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="8"/><circle cx="40" cy="40" r="${R}" fill="none" stroke="var(--${st})" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)" class="rg-arc" style="--c:${C.toFixed(1)}"/><text x="40" y="44" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text)">${Math.round(frac * 100)}%</text></svg>`;
  return h(
    'button',
    { class: 'ring', onclick: onClick || null },
    h('div', { class: 'rg-svg', html: svg }),
    h(
      'div',
      { class: 'rg-t' },
      h('b', null, label),
      h('span', null, `${ok} / ${total}`),
      sub ? h('span', { class: 'rg-s' }, sub) : null,
    ),
  );
}
