// Animated process-flow diagram of the selected treatment train
import { ICON_PATHS } from '../icons.gen.js';
import { fmt } from '../../core/util.js';

const PAGE_OF = { intake: 'intake', rwp: 'intake', aeration: 'aeration', presed: 'sed', coag: 'coag', rapidmix: 'rapidmix', floc: 'floc', sed: 'sed', filt: 'filt', dis: 'dis', stab: 'stab', cwr: 'storage', twp: 'storage', sludge: 'sludge' };
const ICON_OF = { intake: 'waves', rwp: 'gauge', aeration: 'wind', presed: 'layers', coag: 'beaker', rapidmix: 'blend', floc: 'fan', sed: 'layers', filt: 'filter', dis: 'shield', stab: 'scale', cwr: 'database', twp: 'gauge', sludge: 'recycle' };

function subText(key, r) {
  try {
    switch (key) {
      case 'intake': return r.intake?.cs ? `Screens ${r.intake.inputs.cOpen}/${r.intake.inputs.fOpen} mm` : '';
      case 'rwp': return r.intake?.pumps ? `${r.intake.pumps.nDuty}+${r.intake.pumps.nStandby} × ${r.intake.pumps.motor} kW` : '';
      case 'aeration': return r.aeration ? `DO → ${fmt(r.aeration.Ce, 1)} mg/L` : '';
      case 'coag': return r.coag ? `${fmt(r.coag.Ddes, 0)} mg/L alum (max)` : '';
      case 'rapidmix': return r.rapidmix ? `G ${fmt(r.rapidmix.Gact, 0)} s⁻¹` : '';
      case 'floc': return r.floc ? `${r.floc.ttot} min · Gt ${fmt(r.floc.Gt / 1000, 0)}k` : '';
      case 'sed': return r.sed?.sorAct ? `${r.sed.N} × SOR ${fmt(r.sed.sorAct, 0)} m/d` : '';
      case 'presed': return r.sed?.presed ? `${fmt(r.sed.presed.hrt, 1)} h` : '';
      case 'filt': return r.filt ? `${r.filt.N} × ${fmt(r.filt.Af, 0)} m² @ ${fmt(r.filt.rate, 1)} m/h` : '';
      case 'dis': return r.dis ? `${fmt(r.dis.totDose, 1)} mg/L · CT×${fmt(r.dis.ratio, 1)}` : '';
      case 'stab': return r.stab ? `pH ${fmt(r.stab.pHfinal, 1)} · lime ${fmt(r.stab.lime, 0)}` : '';
      case 'cwr': return r.storage ? `${fmt(r.storage.V, 0)} m³` : '';
      case 'twp': return r.storage ? `${r.storage.pumps.nDuty}+${r.storage.pumps.nStandby} × ${r.storage.pumps.motor} kW` : '';
      case 'sludge': return r.sludge ? `${fmt(r.sludge.annualT, 0)} t DS/yr` : '';
      default: return '';
    }
  } catch { return ''; }
}

export function pfdSVG(r, { width = 1100, interactive = true, statik = false } = {}) {
  const train = r.process.train.filter((u) => u.key !== 'sludge');
  const sludge = r.process.train.find((u) => u.key === 'sludge');
  const perRow = Math.ceil(train.length / 2);
  const bw = 132, bh = 66, gapX = Math.max(34, (width - 40 - perRow * bw) / Math.max(1, perRow - 1));
  const rowY = [46, 46 + bh + 92];
  const pos = train.map((u, i) => {
    const row = i < perRow ? 0 : 1;
    const col = row === 0 ? i : perRow - 1 - (i - perRow);
    return { ...u, x: 20 + col * (bw + gapX), y: rowY[row], row };
  });
  const laneY = rowY[1] + bh + 46;
  const H = rowY[1] + bh + (sludge ? 102 : 40);
  const W = 90 + perRow * bw + (perRow - 1) * gapX;
  const c = statik ? { prim: '#0b63b6', surf: '#ffffff', border: '#c3cedb', text: '#0f1d33', muted: '#7a889c', chem: '#eb6834', sludge: '#8a6d3b' } : null;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" font-family="Segoe UI, Arial, sans-serif">`);
  out.push(`<defs><marker id="pfd-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${c ? c.prim : 'var(--primary)'}"/></marker></defs>`);
  const flowCls = (k) => (statik ? `fill="none" stroke="${k === 'sludge' ? c.sludge : k === 'chem' ? c.chem : c.prim}" stroke-width="${k === 'main' ? 3 : 1.6}" stroke-dasharray="${k === 'main' ? '8 6' : '4 4'}"` : `class="flow ${k === 'main' ? '' : k}"`);
  // connections
  for (let i = 0; i < pos.length - 1; i++) {
    const a = pos[i], b = pos[i + 1];
    let d;
    if (a.row === b.row) {
      const y = a.y + bh / 2;
      d = a.row === 0 ? `M${a.x + bw},${y} L${b.x - 4},${y}` : `M${a.x},${y} L${b.x + bw + 4},${y}`;
    } else {
      const x = a.x + bw;
      d = `M${x},${a.y + bh / 2} C${x + 40},${a.y + bh / 2} ${x + 40},${b.y + bh / 2} ${b.x + bw + 4},${b.y + bh / 2}`;
    }
    out.push(`<path d="${d}" ${flowCls('main')} marker-end="url(#pfd-arr)"/>`);
  }
  // chemical dosing points
  const chem = [];
  const idx = (k) => pos.findIndex((p) => p.key === k);
  if (idx('rapidmix') >= 0) chem.push([idx('rapidmix'), r.coag?.inputs?.coagulant === 'pacl' ? 'PACl' : r.coag?.inputs?.coagulant === 'fecl3' ? 'FeCl₃' : 'Alum' + (r.coag?.limeDose > 0 ? ' + lime' : '')]);
  if (r.process.prechlor === 'yes' && idx('rapidmix') >= 0) chem.push([Math.max(0, idx('rapidmix') - 1), 'Pre-Cl₂']);
  if (idx('dis') >= 0) chem.push([idx('dis'), r.dis?.key === 'gas' ? 'Cl₂ gas' : 'Hypochlorite']);
  if (idx('stab') >= 0 && r.stab?.lime > 0) chem.push([idx('stab'), 'Lime']);
  for (const [i, label] of chem) {
    const p = pos[i];
    const x = p.x + bw / 2;
    const y0 = p.y - 30;
    const y1 = p.y - 2;
    out.push(`<path d="M${x},${y0} L${x},${y1}" ${flowCls('chem')}/>`);
    out.push(`<text x="${x}" y="${y0 - 5}" text-anchor="middle" ${statik ? `fill="${c.chem}" font-size="10" font-weight="600"` : 'class="chemlbl"'}>${label}</text>`);
  }
  // units
  for (const p of pos) {
    const page = PAGE_OF[p.key] || '';
    out.push(`<g class="unit on" ${interactive ? `data-page="${page}"` : ''} transform="translate(${p.x},${p.y})">`);
    out.push(`<rect width="${bw}" height="${bh}" rx="10" ${statik ? `fill="${c.surf}" stroke="${c.prim}" stroke-width="1.2"` : ''}/>`);
    out.push(`<g transform="translate(10,10)" ${statik ? `stroke="${c.prim}"` : 'class="ui" stroke="currentColor"'} fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><svg width="18" height="18" viewBox="0 0 24 24">${ICON_PATHS[ICON_OF[p.key]] || ''}</svg></g>`);
    const words = p.label.length > 14 ? p.label.replace(/^(.{0,14})\s(.*)$/, '$1\n$2').split('\n') : [p.label];
    words.forEach((w, k) => out.push(`<text x="34" y="${23 + k * 13}" ${statik ? `fill="${c.text}" font-size="11" font-weight="600"` : 'class="ut"'}>${w}</text>`));
    out.push(`<text x="10" y="${bh - 10}" ${statik ? `fill="${c.muted}" font-size="9.5"` : 'class="us"'}>${subText(p.key, r)}</text>`);
    out.push('</g>');
  }
  // sludge
  if (sludge) {
    const sx = 20, sy = laneY - bh / 2;
    const laneLeft = sx + bw;
    for (const k of ['sed', 'filt', 'presed']) {
      const i = idx(k);
      if (i < 0) continue;
      const p = pos[i];
      let d;
      if (p.row === 0) {
        // leave from the right edge, run down the right margin, then along the sludge lane
        const xr = W - 18 - (k === 'presed' ? 10 : 0);
        d = `M${p.x + bw},${p.y + bh - 12} L${xr},${p.y + bh - 12} L${xr},${laneY} L${laneLeft + 4},${laneY}`;
      } else {
        const x = p.x + bw / 2 + 14;
        d = `M${x},${p.y + bh} L${x},${laneY} L${laneLeft + 4},${laneY}`;
      }
      out.push(`<path d="${d}" ${flowCls('sludge')}/>`);
    }
    out.push(`<text x="${laneLeft + 14}" y="${laneY - 6}" ${statik ? `fill="${c.sludge}" font-size="10" font-weight="600"` : 'class="chemlbl" style="fill:var(--dw-ground)"'}>Sludge &amp; wash water</text>`);
    out.push(`<g class="unit on" ${interactive ? 'data-page="sludge"' : ''} transform="translate(${sx},${sy})"><rect width="${bw}" height="${bh}" rx="10" ${statik ? `fill="${c.surf}" stroke="${c.sludge}" stroke-width="1.2"` : ''}/>`);
    out.push(`<g transform="translate(10,10)" ${statik ? `stroke="${c.sludge}"` : 'class="ui" stroke="currentColor"'} fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><svg width="18" height="18" viewBox="0 0 24 24">${ICON_PATHS.recycle}</svg></g>`);
    out.push(`<text x="34" y="23" ${statik ? `fill="${c.text}" font-size="11" font-weight="600"` : 'class="ut"'}>Residuals</text><text x="34" y="36" ${statik ? `fill="${c.text}" font-size="11" font-weight="600"` : 'class="ut"'}>handling</text>`);
    out.push(`<text x="10" y="${bh - 10}" ${statik ? `fill="${c.muted}" font-size="9.5"` : 'class="us"'}>${subText('sludge', r)}</text></g>`);
  }
  out.push('</svg>');
  return out.join('');
}
