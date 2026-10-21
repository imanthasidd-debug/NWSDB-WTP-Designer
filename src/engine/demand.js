// Population projection & water-demand forecast → plant design capacity (NWSDB Design Manual D2 §2.4, §3)
import { Calc, n } from '../core/calc.js';
import { NON_DOMESTIC, UFW, communityOf, horizonFor, lpcdRange, peaking, ref } from '../core/d2.js';
import { ceilTo, num } from '../core/util.js';

export const DEFAULTS = {
  areaType: 'mc',
  baseYear: 2026,
  designYear: 2046,
  stageYear: 2036,
  method: 'geom',            // rate | arith | geom | incr
  basePop: 110700,
  growthRate: 1.2,           // %/yr for 'rate'
  census: [
    { year: 2001, pop: 85000 },
    { year: 2012, pop: 95500 },
    { year: 2024, pop: 108400 },
  ],
  coverageNow: 70,
  coverageDesign: 95,
  demandBasis: 'lpcd',       // lpcd | d2  (D2 §3.2.1 house-connection / standpost split)
  lpcd: 140,
  hcPct: 0,                  // % of served population on house connections (0 = D2 table mid-value)
  hcLpcd: 0,                 // 0 = D2 (140 large rural, 185 urban)
  spLpcd: 45,                // standpost consumption (D2 §3.2.1)
  nonDomPct: 25,
  nonDomItems: [],           // D2 §3.2.3 unit demands [{type, qty, rate}]
  floatPop: 6000,
  floatLpcd: 60,
  bulk: 800,                 // m3/d special/bulk consumers (industry, BOI zones…)
  systemState: 'rehab',      // new | rehab  (D2 §3.2.4 UFW guidance)
  nrw: 25,
  mdf: 0,                    // 0 = D2 §3.2.5 (1.1 < 20,000 pop; 1.25 > 20,000)
  phf: 0,                    // 0 = D2 §3.2.5 (2.5 smaller urban; 2.0 > 20,000)
  ownUse: 5,                 // D2 §3.2.5 note – treatment losses 5–10 % of max day
  opHours: 24,
  roundStep: 1000,
  overrideCap: 0,            // >0 to force adopted capacity (m3/d)
  nTrains: 2,
};

function fitMethods(census) {
  const c = [...census].filter((r) => num(r.year) > 0 && num(r.pop) > 0).sort((a, b) => a.year - b.year);
  if (c.length < 2) return null;
  const first = c[0];
  const last = c[c.length - 1];
  const span = last.year - first.year;
  const ka = (last.pop - first.pop) / span;
  const r = (last.pop / first.pop) ** (1 / span) - 1;
  // incremental increase using decadal-equivalent increases
  const inc = [];
  for (let i = 1; i < c.length; i++) inc.push(((c[i].pop - c[i - 1].pop) * 10) / (c[i].year - c[i - 1].year));
  const xbar = inc.reduce((a, b) => a + b, 0) / inc.length;
  const dif = [];
  for (let i = 1; i < inc.length; i++) dif.push(inc[i] - inc[i - 1]);
  const ybar = dif.length ? dif.reduce((a, b) => a + b, 0) / dif.length : 0;
  return {
    last, ka, r, xbar, ybar,
    arith: (y) => last.pop + ka * (y - last.year),
    geom: (y) => last.pop * (1 + r) ** (y - last.year),
    incr: (y) => { const nn = (y - last.year) / 10; return last.pop + nn * xbar + (nn * (nn + 1) * ybar) / 2; },
  };
}

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const fit = fitMethods(d.census || []);
  const method = d.method === 'rate' || !fit ? 'rate' : d.method;
  const popAt = (y) => {
    if (method === 'rate') return d.basePop * (1 + d.growthRate / 100) ** (y - d.baseYear);
    return fit[method](y);
  };
  const years = [];
  for (let y = d.baseYear; y <= d.designYear + 5; y++) years.push(y);
  // ---- D2 community class, peaking and per-capita basis (evaluated on the design-year population)
  const Pdesign = popAt(d.designYear);
  const cls = communityOf(Pdesign);
  const pk = peaking(Pdesign);
  const mdf = d.mdf > 0 ? d.mdf : pk.mdf;
  const phf = d.phf > 0 ? d.phf : pk.phf;
  const hcPct = d.hcPct > 0 ? d.hcPct : cls.hc ? (cls.hc[0] + cls.hc[1]) / 2 : 70;
  const hcLpcd = d.hcLpcd > 0 ? d.hcLpcd : cls.hcLpcd || (cls.id === 'medRural' || cls.id === 'smallRural' ? 140 : 185);
  const lpcd = d.demandBasis === 'd2' ? (hcPct / 100) * hcLpcd + (1 - hcPct / 100) * d.spLpcd : d.lpcd;
  const items = (d.nonDomItems || []).map((it) => {
    const t = NON_DOMESTIC.find((x) => x.id === it.type) || NON_DOMESTIC[0];
    const rate = num(it.rate) > 0 ? num(it.rate) : (t.min + t.max) / 2;
    return { ...t, qty: num(it.qty), rate, q: (num(it.qty) * rate) / 1000 };
  });
  const instQ = items.reduce((a, x) => a + x.q, 0);
  const covAt = (y) => {
    if (y >= d.designYear) return d.coverageDesign;
    return d.coverageNow + ((d.coverageDesign - d.coverageNow) * (y - d.baseYear)) / Math.max(1, d.designYear - d.baseYear);
  };
  const row = (y) => {
    const P = popAt(y);
    const cov = covAt(y);
    const served = (P * cov) / 100;
    const dom = (served * lpcd) / 1000;
    const nonDom = (dom * d.nonDomPct) / 100 + instQ;
    const flt = (d.floatPop * d.floatLpcd) / 1000;
    const net = dom + nonDom + flt + num(d.bulk);
    const gross = net / (1 - d.nrw / 100);
    const nrwQ = gross - net;
    const mdd = gross * mdf;
    const plant = (mdd * (1 + d.ownUse / 100) * 24) / d.opHours;
    return { year: y, P, cov, served, dom, nonDom, flt, bulk: num(d.bulk), net, nrwQ, gross, mdd, phd: gross * phf, plant };
  };
  const table = years.map(row);
  const D = row(d.designYear);
  const S = row(d.stageYear);

  calc.section('Population projection');
  if (method === 'rate') {
    calc.step('Design-year population (geometric, given rate)', 'P_n = P_0\\,(1+r)^n', `P_{${d.designYear}} = ${n(d.basePop, 0)}\\,(1+${n(d.growthRate / 100, 4)})^{${d.designYear - d.baseYear}}`, D.P, 'persons');
  } else {
    if (method === 'arith') calc.step('Arithmetic increase rate from census', 'K_a = \\frac{P_2-P_1}{t_2-t_1}', `K_a = ${n(fit.ka, 1)}`, fit.ka, 'persons/yr', 'Census data');
    if (method === 'geom') calc.step('Geometric growth rate from census', 'r = (P_2/P_1)^{1/(t_2-t_1)}-1', `r = ${n(fit.r * 100, 3)}\\,\\%`, fit.r * 100, '%/yr', 'Census data');
    if (method === 'incr') calc.step('Incremental increase (per decade)', 'P_n = P + n\\bar{x} + \\tfrac{n(n+1)}{2}\\bar{y}', `\\bar{x}=${n(fit.xbar, 0)},\\ \\bar{y}=${n(fit.ybar, 0)}`, D.P, 'persons');
    calc.step(`Design-year population (${method === 'arith' ? 'arithmetic' : method === 'geom' ? 'geometric' : 'incremental'})`, 'P_{design}', `P_{${d.designYear}}`, D.P, 'persons');
  }
  calc.section('NWSDB D2 design basis');
  calc.text(`Design-year population ${Math.round(D.P).toLocaleString('en-US')} → D2 §3.2.1 community class: ${cls.label}; D2 §3.2.5 peaking for ${pk.cls}.`);
  calc.step('Maximum-day factor', 'k_{md}', d.mdf > 0 ? '\\text{user value}' : `\\text{D2: } ${pk.mdf}`, mdf, '–', ref('3.2.5'));
  calc.step('Peak-hour factor', 'k_{ph}', d.phf > 0 ? '\\text{user value}' : `\\text{D2: } ${pk.phf}`, phf, '–', ref('3.2.5'));
  if (d.demandBasis === 'd2') {
    calc.step('House-connection share of served population', 'f_{hc}', d.hcPct > 0 ? '\\text{user value}' : `\\text{D2 table mid-value}`, hcPct, '%', ref('3.2.1'));
    calc.step('Blended domestic per-capita demand', 'q = f_{hc}q_{hc} + (1-f_{hc})q_{sp}', `${n(hcPct / 100, 2)}\\times${n(hcLpcd, 0)} + ${n(1 - hcPct / 100, 2)}\\times${n(d.spLpcd, 0)}`, lpcd, 'L/c/d', ref('3.2.1'));
  }
  calc.section('Demand in design year ' + d.designYear);
  calc.step('Population served', 'P_s = P \\times C', `${n(D.P, 0)} \\times ${n(D.cov, 1)}\\%`, D.served, 'persons');
  calc.step('Domestic demand', 'Q_{dom} = P_s \\, q / 1000', `${n(D.served, 0)} \\times ${n(lpcd, 0)} / 1000`, D.dom, 'm³/d');
  if (instQ > 0) calc.step('Institutional & commercial demand (D2 unit demands)', 'Q_{inst} = \\sum N_i q_i / 1000', items.map((x) => `${n(x.qty, 0)}\\times${n(x.rate, 0)}`).join(' + ') + ' /1000', instQ, 'm³/d', ref('3.2.3'));
  calc.step('Non-domestic demand', 'Q_{nd} = k_{nd} Q_{dom} + Q_{inst}', `${n(d.nonDomPct, 1)}\\% \\times ${n(D.dom, 0)} + ${n(instQ, 0)}`, D.nonDom, 'm³/d');
  calc.step('Floating population & bulk users', 'Q_{f} + Q_{b}', `${n(D.flt, 0)} + ${n(D.bulk, 0)}`, D.flt + D.bulk, 'm³/d');
  calc.step('Net (consumer) demand', 'Q_{net}', `${n(D.dom, 0)}+${n(D.nonDom, 0)}+${n(D.flt + D.bulk, 0)}`, D.net, 'm³/d');
  calc.step('Average-day production (incl. NRW)', 'Q_{avg} = \\frac{Q_{net}}{1-NRW}', `\\frac{${n(D.net, 0)}}{1-${n(d.nrw / 100, 2)}}`, D.gross, 'm³/d');
  calc.step('Maximum-day demand', 'Q_{md} = k_{md}\\,Q_{avg}', `${n(mdf, 2)} \\times ${n(D.gross, 0)}`, D.mdd, 'm³/d', ref('3.2.5'));
  calc.step('Peak-hour demand (distribution)', 'Q_{ph} = k_{ph}\\,Q_{avg}', `${n(phf, 2)} \\times ${n(D.gross, 0)}`, D.phd, 'm³/d', ref('3.2.5'));
  calc.step('Required plant throughput (incl. treatment losses)', 'Q_{p} = Q_{md}(1+w)\\frac{24}{h_{op}}', `${n(D.mdd, 0)}(1+${n(d.ownUse / 100, 3)})\\frac{24}{${n(d.opHours, 1)}}`, D.plant, 'm³/d', ref('3.2.5') + ' – 1.05–1.10 × max day');
  const adopted = d.overrideCap > 0 ? d.overrideCap : ceilTo(D.plant, d.roundStep || 1);
  calc.step('Adopted plant design capacity', 'Q_{design}', d.overrideCap > 0 ? '\\text{user override}' : `\\lceil ${n(D.plant, 0)} \\rceil_{${n(d.roundStep, 0)}}`, adopted, 'm³/d');
  const stageCap = ceilTo(S.plant, d.roundStep || 1);

  calc.check('dem.lpcd', lpcd);
  const rng = lpcdRange(cls);
  if (rng) calc.check('dem.lpcdD2', lpcd, `Per-capita within D2 range for ${cls.label.split(' (')[0].toLowerCase()}`, { crit: { min: rng[0] * 0.95, max: rng[1] * 1.05 }, range: `${Math.round(rng[0])} – ${Math.round(rng[1])}`, src: ref('3.2.1') + ` – ${cls.hc[0]}–${cls.hc[1]} % HC @ ${cls.hcLpcd}, standposts @ 45` });
  else calc.check('dem.lpcdD2', lpcd, 'Per-capita demand – D2 table', { status: 'info', range: cls.id === 'largeUrban' ? 'assess individually' : 'see Manual D1', src: ref('3.2.1') });
  const hz = horizonFor(Pdesign);
  calc.check('dem.horizon', d.designYear - d.baseYear, `Planning horizon (${hz.text})`, { crit: { min: hz.years, hardMin: Math.min(hz.years, 10) } });
  if (hz.stage) calc.flag('Stage I at about 10 years (two 10-year stages)', Math.abs(d.stageYear - d.baseYear - hz.stage) <= 2, `${d.stageYear - d.baseYear} yr`, '≈ 10 yr', 'Stage pump sets, tanks & reservoirs; build intakes, mains & dams for the full 20 years', 'info', ref('2.4'));
  const ufw = d.systemState === 'new' ? UFW.newSystem : UFW.rehab;
  calc.check('dem.nrw', d.nrw, undefined, { crit: { min: ufw[0], max: ufw[1] }, range: `${ufw[0]} – ${ufw[1]} (${d.systemState === 'new' ? 'new, tight system' : 'rehabilitated system'})` });
  calc.check('dem.mdf', mdf, undefined, { note: d.mdf > 0 && Math.abs(d.mdf - pk.mdf) > 1e-9 ? `D2 value for ${pk.cls}: ${pk.mdf}` : '' });
  calc.check('dem.phf', phf, undefined, { note: d.phf > 0 && Math.abs(d.phf - pk.phf) > 1e-9 ? `D2 value for ${pk.cls}: ${pk.phf}` : '' });
  calc.check('dem.own', d.ownUse);
  if (Pdesign < 10000 && Math.abs(d.nonDomPct - 10) > 5 && !items.length) calc.note('info', `D2 §3.2.3: for small urban and rural schemes non-domestic demand is usually about 10 % of domestic unless large consumers are identified (now ${d.nonDomPct} %).`);
  if (d.mdf > 0 && Math.abs(d.mdf - pk.mdf) > 0.01) calc.note('info', `Maximum-day factor ${d.mdf} is a user value; D2 §3.2.5 gives ${pk.mdf} for ${pk.cls}. Clear the field to use the D2 value.`);
  if (d.opHours < 24) calc.note('warn', 'D2 §9.2: schemes involving treatment normally require continuous 24-hour operation to optimise the process; slow sand filters must not be operated intermittently.');
  if (adopted < D.plant * 0.98) calc.note('fail', 'Adopted capacity is lower than the computed requirement for the design year.');
  if (d.nTrains < 2) calc.note('warn', 'A single treatment stream gives no redundancy during maintenance – at least two parallel streams are recommended.');

  const methods = fit ? {
    arith: years.map((y) => fit.arith(y)),
    geom: years.map((y) => fit.geom(y)),
    incr: years.map((y) => fit.incr(y)),
  } : null;

  return {
    inputs: d, method, table, years, design: D, stage: S, adopted, stageCap, methods,
    d2: { cls, pk, mdf, phf, lpcd, hcPct, hcLpcd, items, instQ, horizon: hz, range: rng, Pdesign },
    mdf, phf, lpcd,
    census: d.census,
    Qd: adopted, Qh: adopted / 24, Qs: adopted / 86400, nTrains: Math.max(1, Math.round(d.nTrains)),
    ...calc.result(),
  };
}
