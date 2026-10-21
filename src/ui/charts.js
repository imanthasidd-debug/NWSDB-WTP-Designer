// SVG chart engine on d3 (line / column / stacked / horizontal bar) following the data-viz rules:
// one y-axis, thin marks (2 px lines, ≤24 px bars, 4 px rounded data-ends), recessive hairline grid,
// legend for ≥2 series, hover crosshair/tooltips, dark-mode via CSS tokens.
import * as d3 from 'd3';
import { fmtAuto } from '../core/util.js';

export const PALETTE_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const STATIC = { grid: '#e1e0d9', axis: '#c3c2b7', ink: '#52514e', muted: '#898781', surface: '#ffffff', ok: '#138a4b', fail: '#c53030', warn: '#b7791f' };
const sc = (i) => `var(--series-${(i % 8) + 1})`;

function colorOf(s, i, statik) {
  if (s.color && !s.color.startsWith('var(')) return s.color;
  const idx = s.color ? parseInt(s.color.replace(/\D/g, ''), 10) - 1 : i;
  return statik ? PALETTE_LIGHT[idx % 8] : sc(idx);
}
const refColor = (r, statik) => {
  const k = r.kind || 'limit';
  if (statik) return k === 'target' ? STATIC.ok : k === 'info' ? STATIC.ink : STATIC.fail;
  return k === 'target' ? 'var(--ok)' : k === 'info' ? 'var(--chart-ink)' : 'var(--fail)';
};

/** rounded-top column path (square at baseline) */
function colPath(x, y, w, h, r, up = true) {
  r = Math.max(0, Math.min(r, w / 2, Math.abs(h)));
  if (h <= 0) return '';
  if (up) return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  return '';
}
function barPathRight(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, h / 2, w));
  if (w <= 0) return '';
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

export function renderChart(container, spec, opts = {}) {
  const statik = !!opts.static;
  container.innerHTML = '';
  container.classList.add('chart');
  const series = spec.series || [];
  const showLegend = spec.legend ?? series.length >= 2;
  if (showLegend) {
    const lg = document.createElement('div');
    lg.className = 'chart-legend';
    series.forEach((s, i) => {
      const li = document.createElement('span');
      li.className = 'li';
      const sw = document.createElement('span');
      sw.className = 'sw' + (spec.type === 'line' && !s.bar ? (s.dash ? ' dash' : '') : ' box');
      sw.style.background = colorOf(s, i, statik);
      sw.style.color = colorOf(s, i, statik);
      li.append(sw, document.createTextNode(s.label));
      lg.append(li);
    });
    for (const r of spec.refs || []) {
      if (!r.legend) continue;
      const li = document.createElement('span'); li.className = 'li';
      const sw = document.createElement('span'); sw.className = 'sw dash'; sw.style.color = refColor(r, statik);
      li.append(sw, document.createTextNode(r.label)); lg.append(li);
    }
    if (statik) lg.style.cssText = `display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:${STATIC.ink};margin:0 0 6px 4px;`;
    container.append(lg);
  }
  const W = opts.width || Math.max(260, container.clientWidth || 600);
  const H = spec.height || 260;
  const hb = spec.type === 'hbar';
  const m = { t: 12, r: spec.marginRight ?? (hb ? 64 : 22), b: spec.x?.label ? 42 : 28, l: spec.marginLeft ?? (hb ? 170 : 56) };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const svg = d3.select(container).append('svg').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
    .attr('font-family', 'Segoe UI, system-ui, sans-serif');
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  const data = spec.data || [];
  const xk = spec.x?.key;
  const yfmt = spec.y?.format || ((v) => fmtAuto(v));
  const xfmt = spec.x?.format || ((v) => (typeof v === 'number' ? fmtAuto(v) : v));
  const tipFmt = spec.tipFormat || yfmt;
  // ---- scales
  let x, y;
  const stacked = spec.type === 'stacked';
  const isBand = spec.type === 'bar' || stacked || spec.x?.type === 'band';
  const allY = [];
  if (stacked) data.forEach((d) => allY.push(series.reduce((a, s) => a + (+d[s.key] || 0), 0)));
  else data.forEach((d) => series.forEach((s) => { const v = +d[s.key]; if (Number.isFinite(v)) allY.push(v); }));
  (spec.refs || []).filter((r) => r.axis !== 'x').forEach((r) => allY.push(r.value));
  (spec.bands || []).filter((b) => b.axis !== 'x').forEach((b) => { allY.push(b.from); allY.push(b.to); });
  if (hb) {
    y = d3.scaleBand().domain(data.map((d) => d[xk])).range([0, ih]).padding(0.28);
    const mx = d3.max(allY) || 1;
    x = d3.scaleLinear().domain([0, spec.y?.max ?? mx * 1.05]).range([0, iw]).nice();
  } else {
    if (isBand) x = d3.scaleBand().domain(data.map((d) => d[xk])).range([0, iw]).padding(0.3);
    else {
      const xs = data.map((d) => +d[xk]);
      const xr = spec.x?.domain || [d3.min(xs), d3.max(xs)];
      x = (spec.x?.type === 'log' ? d3.scaleLog() : d3.scaleLinear()).domain(xr).range([0, iw]);
      if (spec.x?.nice !== false && spec.x?.type !== 'log') x.nice();
    }
    const ylog = spec.y?.type === 'log';
    let ymin = spec.y?.min ?? (ylog ? Math.max(1e-3, d3.min(allY.filter((v) => v > 0)) * 0.7) : Math.min(0, d3.min(allY) ?? 0));
    let ymax = spec.y?.max ?? (ylog ? d3.max(allY) * 1.6 : (d3.max(allY) ?? 1) * 1.08);
    if (spec.y?.zero === false && !ylog && spec.y?.min === undefined) { const lo = d3.min(allY); const hi = d3.max(allY); const pad = (hi - lo) * 0.1 || 1; ymin = lo - pad; ymax = hi + pad; }
    if (ymax === ymin) ymax = ymin + 1;
    y = (ylog ? d3.scaleLog() : d3.scaleLinear()).domain([ymin, ymax]).range([ih, 0]);
    if (!ylog && spec.y?.nice !== false) y.nice();
  }
  const gridC = statik ? STATIC.grid : 'var(--chart-grid)';
  const axisC = statik ? STATIC.axis : 'var(--chart-axis)';
  const mutedC = statik ? STATIC.muted : 'var(--chart-muted)';
  const inkC = statik ? STATIC.ink : 'var(--chart-ink)';
  const surfC = statik ? STATIC.surface : 'var(--chart-surface)';
  // ---- grid & axes
  const yTicks = spec.y?.ticks || 5;
  if (hb) {
    g.append('g').attr('class', 'grid').call(d3.axisBottom(x).ticks(5).tickSize(ih).tickFormat('')).selectAll('line').attr('stroke', gridC);
    g.append('g').attr('class', 'ax').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickFormat(yfmt).tickSizeOuter(0));
    g.append('g').attr('class', 'ax').call(d3.axisLeft(y).tickSize(0).tickPadding(8));
  } else {
    const ya = d3.axisLeft(y).ticks(yTicks, spec.y?.type === 'log' ? '~g' : undefined).tickSize(-iw).tickFormat(spec.y?.type === 'log' ? (v) => { const l = Math.log10(v); return Math.abs(l - Math.round(l)) < 1e-9 ? yfmt(v) : ''; } : yfmt);
    const gy = g.append('g').attr('class', 'grid ax').call(ya);
    gy.selectAll('line').attr('stroke', gridC);
    gy.select('.domain').remove();
    const xa = (isBand ? d3.axisBottom(x) : d3.axisBottom(x).ticks(spec.x?.ticks || 8, spec.x?.type === 'log' ? '~g' : undefined).tickFormat(xfmt)).tickSizeOuter(0);
    const gx = g.append('g').attr('class', 'ax').attr('transform', `translate(0,${ih})`).call(xa);
    if (spec.x?.rotate) gx.selectAll('text').attr('transform', 'rotate(-35)').style('text-anchor', 'end');
  }
  g.selectAll('.ax text').attr('fill', mutedC).attr('font-size', 11);
  g.selectAll('.ax path, .ax line').attr('stroke', axisC);
  g.selectAll('.grid line').attr('stroke', gridC);
  if (spec.y?.label && !hb) svg.append('text').attr('class', 'axlbl').attr('transform', `translate(13,${m.t + ih / 2}) rotate(-90)`).attr('text-anchor', 'middle').attr('fill', inkC).attr('font-size', 11.5).text(spec.y.label);
  if (spec.x?.label) svg.append('text').attr('class', 'axlbl').attr('x', m.l + iw / 2).attr('y', H - 6).attr('text-anchor', 'middle').attr('fill', inkC).attr('font-size', 11.5).text(spec.x.label);

  // ---- bands
  for (const b of spec.bands || []) {
    const okFill = statik ? 'rgba(19,138,75,0.08)' : 'color-mix(in srgb, var(--ok) 9%, transparent)';
    if (b.axis === 'x' && !isBand) {
      const x0 = x(b.from), x1 = x(b.to);
      g.append('rect').attr('x', Math.min(x0, x1)).attr('y', 0).attr('width', Math.abs(x1 - x0)).attr('height', ih).attr('fill', okFill);
      if (b.label) g.append('text').attr('x', (x0 + x1) / 2).attr('y', 12).attr('text-anchor', 'middle').attr('class', 'reflbl').attr('fill', inkC).attr('font-size', 10.5).text(b.label);
    } else if (!hb) {
      const y0 = y(b.from), y1 = y(b.to);
      g.append('rect').attr('x', 0).attr('y', Math.min(y0, y1)).attr('width', iw).attr('height', Math.abs(y1 - y0)).attr('fill', okFill);
      if (b.label) g.append('text').attr('x', 6).attr('y', Math.min(y0, y1) + 12).attr('class', 'reflbl').attr('fill', inkC).attr('font-size', 10.5).text(b.label);
    }
  }
  const tip = statik ? null : d3.select(container).append('div').attr('class', 'chart-tip');
  const showTip = (html, px, py) => {
    if (!tip) return;
    tip.html(html).style('opacity', 1);
    const tw = tip.node().offsetWidth;
    const left = px + m.l + 14 + tw > W ? px + m.l - tw - 14 : px + m.l + 14;
    tip.style('left', left + 'px').style('top', Math.max(0, py + m.t - 10 + (showLegend ? 24 : 0)) + 'px');
  };
  const hideTip = () => tip && tip.style('opacity', 0);
  const unit = spec.unit ? ' ' + spec.unit : '';

  // ---- marks
  if (spec.type === 'line') {
    series.forEach((s, i) => {
      const c = colorOf(s, i, statik);
      const pts = data.filter((d) => Number.isFinite(+d[s.key]) && (spec.y?.type !== 'log' || +d[s.key] > 0));
      if (s.area) {
        const area = d3.area().x((d) => x(+d[xk])).y0(y(Math.max(y.domain()[0], 0))).y1((d) => y(+d[s.key])).curve(s.step ? d3.curveStepAfter : d3.curveLinear);
        g.append('path').datum(pts).attr('d', area).attr('fill', c).attr('fill-opacity', 0.1);
      }
      const line = d3.line().x((d) => x(+d[xk])).y((d) => y(+d[s.key])).curve(s.step ? d3.curveStepAfter : s.smooth ? d3.curveMonotoneX : d3.curveLinear);
      g.append('path').datum(pts).attr('d', line).attr('fill', 'none').attr('stroke', c).attr('stroke-width', s.width || 2)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('stroke-dasharray', s.dash ? '6 4' : null);
      if (s.marker) g.selectAll(null).data(pts).enter().append('circle').attr('cx', (d) => x(+d[xk])).attr('cy', (d) => y(+d[s.key])).attr('r', 4).attr('fill', c).attr('stroke', surfC).attr('stroke-width', 2);
      if (s.endLabel && pts.length) {
        const last = pts[pts.length - 1];
        g.append('text').attr('x', x(+last[xk]) + 6).attr('y', y(+last[s.key]) + 4).attr('font-size', 11).attr('fill', inkC).text(s.endLabel === true ? s.label : s.endLabel);
      }
    });
  } else if (spec.type === 'bar') {
    const inner = d3.scaleBand().domain(series.map((s) => s.key)).range([0, x.bandwidth()]).padding(0.12);
    const bw = Math.min(24, inner.bandwidth());
    series.forEach((s, i) => {
      const c = colorOf(s, i, statik);
      g.selectAll(null).data(data).enter().append('path')
        .attr('d', (d) => { const v = +d[s.key] || 0; const x0 = x(d[xk]) + inner(s.key) + (inner.bandwidth() - bw) / 2; const y0 = y(Math.max(v, 0)); return colPath(x0, y0, bw, y(Math.max(y.domain()[0], 0)) - y0, 4); })
        .attr('fill', c)
        .on('mousemove', function (ev, d) { const [px, py] = d3.pointer(ev, g.node()); showTip(`<div class="th">${d[xk]}</div><div class="tr"><span class="sw" style="background:${c}"></span>${s.label}<span class="tv">${tipFmt(+d[s.key])}${unit}</span></div>`, px, py); })
        .on('mouseleave', hideTip);
      if (s.labels) g.selectAll(null).data(data).enter().append('text').attr('x', (d) => x(d[xk]) + inner(s.key) + inner.bandwidth() / 2).attr('y', (d) => y(+d[s.key]) - 5).attr('text-anchor', 'middle').attr('font-size', 10.5).attr('fill', inkC).text((d) => yfmt(+d[s.key]));
    });
  } else if (stacked) {
    const bw = Math.min(30, x.bandwidth());
    const stack = d3.stack().keys(series.map((s) => s.key))(data.map((d) => Object.fromEntries([[xk, d[xk]], ...series.map((s) => [s.key, +d[s.key] || 0])])));
    stack.forEach((layer, i) => {
      const s = series[i];
      const c = colorOf(s, i, statik);
      const top = i === stack.length - 1;
      g.selectAll(null).data(layer).enter().append('path')
        .attr('d', (d) => { const x0 = x(d.data[xk]) + (x.bandwidth() - bw) / 2; const y1 = y(d[1]); const y0 = y(d[0]); const hh = Math.max(0, y0 - y1 - (i > 0 ? 2 : 0)); return top ? colPath(x0, y1, bw, hh, 4) : `M${x0},${y1}h${bw}v${hh}h${-bw}Z`; })
        .attr('fill', c)
        .on('mousemove', function (ev, d) { const [px, py] = d3.pointer(ev, g.node()); const rows = series.map((ss, j) => `<div class="tr"><span class="sw" style="background:${colorOf(ss, j, statik)}"></span>${ss.label}<span class="tv">${tipFmt(+d.data[ss.key])}${unit}</span></div>`).join(''); showTip(`<div class="th">${d.data[xk]}</div>${rows}`, px, py); })
        .on('mouseleave', hideTip);
    });
  } else if (hb) {
    const s = series[0];
    const bh = Math.min(22, y.bandwidth());
    g.selectAll(null).data(data).enter().append('path')
      .attr('d', (d) => barPathRight(0, y(d[xk]) + (y.bandwidth() - bh) / 2, x(+d[s.key]), bh, 4))
      .attr('fill', (d, i) => (s.colorBy ? colorOf({ color: d.color }, i, statik) : colorOf(s, 0, statik)))
      .on('mousemove', function (ev, d) { const [px, py] = d3.pointer(ev, g.node()); showTip(`<div class="th">${d[xk]}</div><div class="tr">${s.label}<span class="tv">${tipFmt(+d[s.key])}${unit}</span></div>`, px, py); })
      .on('mouseleave', hideTip);
    g.selectAll(null).data(data).enter().append('text').attr('x', (d) => x(+d[s.key]) + 6).attr('y', (d) => y(d[xk]) + y.bandwidth() / 2 + 4).attr('font-size', 11).attr('fill', inkC).text((d) => (spec.valueFormat || yfmt)(+d[s.key]));
  }
  // ---- reference lines
  for (const r of spec.refs || []) {
    const c = refColor(r, statik);
    if (r.axis === 'x' && !isBand) {
      const xv = x(r.value);
      g.append('line').attr('x1', xv).attr('x2', xv).attr('y1', 0).attr('y2', ih).attr('stroke', c).attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4');
      if (r.label) g.append('text').attr('x', xv + 4).attr('y', 11).attr('class', 'reflbl').attr('fill', inkC).attr('font-size', 10.5).text(r.label);
    } else if (!hb) {
      const yv = y(r.value);
      if (yv < -1 || yv > ih + 1) continue;
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yv).attr('y2', yv).attr('stroke', c).attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4');
      if (r.label) g.append('text').attr('x', iw - 4).attr('y', yv - 5).attr('text-anchor', 'end').attr('class', 'reflbl').attr('fill', inkC).attr('font-size', 10.5).text(r.label);
    }
  }
  // ---- highlighted markers
  for (const mk of spec.markers || []) {
    const mx = isBand ? x(mk.x) + x.bandwidth() / 2 : x(mk.x);
    const my = y(mk.y);
    g.append('circle').attr('cx', mx).attr('cy', my).attr('r', 5).attr('fill', mk.color || (statik ? STATIC.fail : 'var(--fail)')).attr('stroke', surfC).attr('stroke-width', 2);
    if (mk.label) g.append('text').attr('x', mx + (mk.dx ?? 8)).attr('y', my + (mk.dy ?? -8)).attr('font-size', 11).attr('font-weight', 600).attr('fill', inkC).attr('text-anchor', mk.anchor || 'start').text(mk.label);
  }
  // ---- crosshair tooltip for line charts
  if (spec.type === 'line' && !statik && data.length) {
    const xs = data.map((d) => +d[xk]);
    const cross = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', axisC).attr('stroke-width', 1).style('opacity', 0);
    const dots = series.map((s, i) => g.append('circle').attr('r', 4.5).attr('fill', colorOf(s, i, statik)).attr('stroke', surfC).attr('stroke-width', 2).style('opacity', 0));
    g.append('rect').attr('width', iw).attr('height', ih).attr('fill', 'transparent')
      .on('mousemove', (ev) => {
        const [px] = d3.pointer(ev);
        const xv = x.invert(px);
        let idx = d3.bisectCenter(xs, xv);
        idx = Math.max(0, Math.min(data.length - 1, idx));
        const d = data[idx];
        const cx = x(+d[xk]);
        cross.attr('x1', cx).attr('x2', cx).style('opacity', 1);
        let rows = '';
        series.forEach((s, i) => {
          const v = +d[s.key];
          if (Number.isFinite(v) && (spec.y?.type !== 'log' || v > 0)) { dots[i].attr('cx', cx).attr('cy', y(v)).style('opacity', 1); rows += `<div class="tr"><span class="sw" style="background:${colorOf(s, i, statik)}"></span>${s.label}<span class="tv">${tipFmt(v)}${unit}</span></div>`; }
          else dots[i].style('opacity', 0);
        });
        showTip(`<div class="th">${spec.x?.label ? spec.x.label.replace(/\s*\(.*\)/, '') + ': ' : ''}${xfmt(+d[xk])}${spec.x?.unit ? ' ' + spec.x.unit : ''}</div>${rows}`, cx, d3.pointer(ev)[1]);
      })
      .on('mouseleave', () => { cross.style('opacity', 0); dots.forEach((dd) => dd.style('opacity', 0)); hideTip(); });
  }
  return svg.node();
}

/** Render a chart to a standalone SVG string (for reports) */
export function chartToSVG(spec, width = 680) {
  const div = document.createElement('div');
  div.style.cssText = 'position:absolute;left:-10000px;top:0;width:' + width + 'px';
  document.body.append(div);
  renderChart(div, spec, { static: true, width });
  const out = div.innerHTML;
  div.remove();
  return out;
}
