// Backwash and chemical-stock planner (operation).
//  • Rapid filters: wash interval from the design filter run (or the operator's value), a staggered wash timetable
//    (round the clock or day shift only), out-of-service time, wash-water use, energy and the share of production.
//  • Slow sand filters: scraping timetable, ripening and re-sanding interval.
//  • Chemicals: daily use at today's flow and dose, days of stock, reorder level and date, order quantity in whole
//    packs, run-out date, a 90-day stock projection and the monthly consumption and cost for the year.
// NWSDB D3 §5.9.12–5.9.14 (wash procedure, run length, wash water 1–5 % of production, return ≤ 10 % of inflow),
// §5.12.8 & Table 5-38 (slow sand O&M), §9.1 (chemical storage ≥ 1 month), §6.5.1 (cylinder turnover ≤ 3 months).
import { Calc, n } from '../core/calc.js';
import { fmt } from '../core/util.js';
const tx = (v, d = 2) =>
  fmt(v, d)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
import { MONTHS, num } from '../core/util.js';

export const DEFAULTS = {
  asOf: '', // date of the stock count / plan start (YYYY-MM-DD; blank = today)
  qDay: 0, // m³/d plant inflow now (0 = average operating flow of the design year)
  // backwash
  season: 'avg', // avg | peak – filter run at average or peak-season settled turbidity
  runHours: 0, // h between washes of one filter (0 = design run, limited to maxRun)
  maxRun: 72, // h longest run allowed (D3: wash at head-loss limit, breakthrough or set hours; > 1 week not recommended)
  window: 'day', // day | any – wash on the day shift only or round the clock
  dayStart: 7, // h start of the washing window
  dayEnd: 17, // h end of the washing window
  drainMin: 10, // min lowering the water to 150 mm above the media (D3 §5.9.12)
  refillMin: 10, // min refilling to the operating level
  // chemicals
  doseBasis: 'month', // month (dose of the month of the plan date) | avg | design
  lead: 21, // days from order to delivery
  leadCl: 14, // days for chlorine
  safety: 7, // days of safety stock
  stockCoag: 0,
  stockLime: 0,
  stockCl: 0,
  stockPoly: 0,
  stockPac: 0,
  stockSoda: 0,
  stockOx: 0, // kg on hand (0 = store full)
};

const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const hhmm = (h) => {
  const m = Math.round(h * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const r = ctx.res,
    f = r.filt,
    co = r.coag,
    dis = r.dis,
    dem = r.demand;
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(d.asOf || '').trim());
  const t0 = m
    ? Date.UTC(+m[1], +m[2] - 1, +m[3])
    : Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const month = new Date(t0).getUTCMonth();
  const Qop = num(co?.Qop, 0) || dem.Qd / (1 + num(dem.inputs?.ownUse, 5) / 100);
  const qDay = d.qDay > 0 ? d.qDay : Qop;
  const scale = qDay / dem.Qd;

  // ================================================================ backwash
  let bw = null,
    ssf = null;
  if (f?.type === 'ssf') {
    calc.section('Slow sand filters – scraping timetable (NWSDB D3 §5.12.8, Table 5-38)');
    const fi = f.inputs,
      N = f.N;
    const weeks = num(fi.ssfCleanWeeks, 6),
      scr = num(fi.ssfScrape, 0.025),
      bed = num(fi.ssfDepth, 1),
      minBed = num(fi.ssfMinDepth, 0.6);
    const gap = (weeks * 7) / N;
    calc.step(
      'Interval between cleanings of one filter',
      't_c',
      '',
      weeks,
      'weeks',
      'from the Filtration page; pre-treat so that cleaning is needed no more often than every 2–3 months where possible',
    );
    calc.step(
      'Interval between successive cleanings (filters in rotation)',
      '\\Delta t = 7\\,t_c/N',
      `7\\times${weeks}/${N}`,
      gap,
      'days',
    );
    const scrapes = Math.floor((bed - minBed) / scr + 1e-9);
    const years = (scrapes * weeks) / 52;
    calc.step(
      'Scrapings before re-sanding',
      'n = \\frac{h_0 - h_{min}}{\\Delta h}',
      `\\frac{${n(bed)} - ${n(minBed)}}{${n(scr, 3)}}`,
      scrapes,
      '',
      'D3: re-sand when the bed is down to 0.5–0.8 m',
    );
    calc.step(
      'Re-sanding interval of each filter',
      't_r = n\\,t_c/52',
      `${scrapes}\\times${weeks}/52`,
      years,
      'years',
      'D3: typically every 2–3 years',
    );
    const rows = [];
    for (let k = 0; rows.length < Math.max(8, N * 3); k++) {
      const t = t0 + Math.round(k * gap) * DAY;
      rows.push({
        date: iso(t),
        filter: (k % N) + 1,
        task: 'Drain to 20 cm below the sand; scrape 1.0–2.5 cm; refill from below; run to waste 1–2 days until ripened',
      });
    }
    calc.flag(
      'Filters left in service while one is cleaned',
      N >= 2,
      `${N - 1} of ${N}`,
      '≥ 1 (N − 1 carry the flow)',
      'Provide at least two filters.',
      'fail',
      'NWSDB D3 §5.12',
    );
    ssf = { N, weeks, gap, scrapes, years, rows, scr, bed, minBed };
  } else if (f?.enabled !== false && f?.washVol > 0) {
    calc.section('Backwash timetable (NWSDB D3 §5.9.12–5.9.14)');
    const fi = f.inputs,
      N = f.N;
    const runDes = d.season === 'peak' ? f.runPeak : f.runAvg;
    const run = d.runHours > 0 ? d.runHours : Math.min(runDes, d.maxRun);
    calc.step(
      `Filter run at ${d.season === 'peak' ? 'peak-season' : 'average'} settled turbidity (design)`,
      't_{run}',
      '',
      runDes,
      'h',
      'Filtration page – head-loss / solids-capacity limit',
    );
    calc.step(
      'Wash interval adopted for each filter',
      't_w = \\min(t_{run},\\ t_{max})',
      d.runHours > 0 ? '\\text{entered}' : `\\min(${n(runDes, 0)},\\ ${n(d.maxRun)})`,
      run,
      'h',
      'wash earlier if head loss reaches the limit or filtrate turbidity rises (D3 §5.9.12)',
    );
    const air = fi.bwMethod === 'airwater' ? num(fi.airMinutes, 3) : 0;
    const dur = d.drainMin + air + num(fi.bwMinutes, 8) + d.refillMin + num(fi.ftwMinutes, 5);
    calc.step(
      'Time out of service for one wash',
      't_{out} = t_{drain}+t_{air}+t_{water}+t_{refill}+t_{ftw}',
      `${d.drainMin}+${air}+${n(fi.bwMinutes)}+${d.refillMin}+${n(fi.ftwMinutes)}`,
      dur,
      'min',
    );
    // interval actually used: whole days when washing on the day shift only
    const dayMode = d.window === 'day' && run >= 24;
    if (d.window === 'day' && run < 24)
      calc.note(
        'warn',
        `The filter run (${run.toFixed(0)} h) is shorter than a day, so filters must also be washed at night – the timetable is round the clock.`,
      );
    const I = dayMode ? 24 * Math.floor(run / 24) : Math.floor(run * 2) / 2;
    const wpd = (N * 24) / I;
    const events = [];
    const horizon = 7;
    if (dayMode) {
      const kDays = I / 24,
        win = d.dayEnd - d.dayStart;
      for (let day = 0; day < horizon; day++) {
        const due = [];
        for (let i = 0; i < N; i++)
          if ((((day - Math.floor((i * kDays) / N)) % kDays) + kDays) % kDays === 0) due.push(i);
        const gapH = due.length > 1 ? Math.max(dur / 60, Math.min(win - dur / 60, win) / due.length) : 0;
        due.forEach((i, j) =>
          events.push({
            day: day + 1,
            date: iso(t0 + day * DAY),
            t: day * 24 + d.dayStart + j * gapH,
            time: hhmm(d.dayStart + j * gapH),
            filter: i + 1,
          }),
        );
      }
      const most = Math.max(...Array.from({ length: horizon }, (_, k) => events.filter((e) => e.day === k + 1).length));
      calc.flag(
        'Washes fit in the day-shift window',
        (most * dur) / 60 <= win,
        `${most} × ${dur} min`,
        `≤ ${win} h (${hhmm(d.dayStart)}–${hhmm(d.dayEnd)})`,
        'Widen the window or wash round the clock.',
        'warn',
        'operation',
      );
    } else {
      const off = I / N;
      for (let k = 0; ; k++) {
        const t = d.dayStart + k * off;
        if (t >= horizon * 24) break;
        events.push({
          day: Math.floor(t / 24) + 1,
          date: iso(t0 + Math.floor(t / 24) * DAY),
          t,
          time: hhmm(t % 24),
          filter: (k % N) + 1,
        });
      }
      calc.flag(
        'Successive washes do not overlap',
        off * 60 >= dur,
        `${(off * 60).toFixed(0)} min between washes`,
        `≥ ${dur} min`,
        'Washes overlap – only one filter should be out at a time; lengthen runs or add filters.',
        'warn',
        'NWSDB D3 §9.4.1 (N − 1)',
      );
    }
    // run length actually achieved per filter
    events.forEach((e) => {
      const prev = events.filter((x) => x.filter === e.filter && x.t < e.t).pop();
      e.since = prev ? e.t - prev.t : I;
    });
    const maxSince = Math.max(...events.map((e) => e.since));
    calc.flag(
      'Longest time between washes of a filter',
      maxSince <= run + 1e-6,
      `${maxSince.toFixed(0)} h`,
      `≤ ${run.toFixed(0)} h`,
      'Some filters would run longer than the adopted interval.',
      'warn',
      'NWSDB D3 §5.9.12',
    );
    calc.step('Washes per day (all filters)', 'n = 24N/t_w', `24\\times${N}/${n(I)}`, wpd, '/d');
    // water and energy
    const vol = f.washVol; // m³ per wash incl. filter-to-waste
    const daily = vol * wpd;
    const pct = (daily / qDay) * 100;
    calc.step('Wash water per wash (incl. filter-to-waste)', 'V_w', '', vol, 'm³', 'Filtration page');
    calc.step('Wash water per day', 'V_d = n\\,V_w', `${n(wpd, 2)}\\times${n(vol, 0)}`, daily, 'm³/d');
    calc.step('Share of production', 'p = V_d/Q', `${n(daily, 0)}/${n(qDay, 0)}`, pct, '%');
    calc.flag(
      'Wash water within the usual range',
      pct <= 5,
      `${pct.toFixed(1)} %`,
      '1–5 % of production',
      'High wash-water use – check run lengths, wash duration and rates.',
      'warn',
      'NWSDB D3 §5.9.14',
    );
    const ret = (daily / 24 / (qDay / 24)) * 100;
    calc.step(
      'Recovered wash water returned over 24 h',
      'q_r = V_d/(24\\,Q_h)',
      '',
      ret,
      '% of inflow',
      'D3 §5.9.14: return ≤ 10 % of the raw inflow, equalised over 24 h',
    );
    const kwh = wpd * ((num(f.bwPumpKw, 0) * num(fi.bwMinutes, 8)) / 60 + (num(f.blowerKw, 0) * air) / 60);
    calc.step('Wash energy (pumps and blowers)', 'E = n\\,(P_p t_w + P_b t_a)', '', kwh, 'kWh/d');
    const lost = ((f.rate * f.Af * (dur - num(fi.ftwMinutes, 5))) / 60) * wpd;
    calc.step(
      'Production lost while filters are out of service',
      'V_l = n\\,v\\,A\\,t_{out}',
      '',
      lost,
      'm³/d',
      'carried by the other filters at a higher rate',
    );
    const steps = [
      [
        'Check',
        `Record head loss, filtrate turbidity and run hours. Wash when the head loss reaches ${tx(fi.termHead)} m, the filtrate turbidity rises, or ${run.toFixed(0)} h has passed – whichever comes first. Always wash a filter that has been out of service.`,
      ],
      [
        'Close inlet, drain down',
        `Close the inlet valve and let the filter drain to about 150 mm above the media (≈ ${d.drainMin} min), then close the filtrate valve.`,
      ],
      ...(air
        ? [
            [
              'Air scour',
              `Open the wash-water drain and start the blower: air at ${tx(fi.airRate)} m/h for ${air} min (D3 §5.9.12: air first, then water).`,
            ],
          ]
        : []),
      [
        'Water wash',
        `Stop the air. Open the wash-water valve slowly – reach full flow over not less than 30 s – then wash at ${tx((f.Qbw * 3600) / f.Af, 0)} m/h (${tx(f.Qbw * 3600, 0)} m³/h) for ${tx(fi.bwMinutes)} min, aiming at 20–30 % bed expansion. Stop when the waste wash water is about 10 NTU.`,
      ],
      [
        'Refill',
        `Close the wash-water valve and drain; open the inlet and refill to the operating level (≈ ${d.refillMin} min).`,
      ],
      [
        'Filter to waste',
        `Run to waste for ${tx(fi.ftwMinutes)} min (ripening 5–30 min) until the filtrate turbidity is below the target, then open the filtrate valve and log the wash.`,
      ],
    ];
    bw = { N, run, runDes, I, dur, wpd, events, vol, daily, pct, ret, kwh, lost, steps, dayMode, air, maxSince };
  }

  // ================================================================ chemicals
  calc.section('Chemical stock and reorder plan (NWSDB D3 §9.1)');
  calc.step(
    'Plant inflow for the plan',
    'Q',
    d.qDay > 0 ? '\\text{entered}' : '\\text{average operating flow}',
    qDay,
    'm³/d',
  );
  const chems = [];
  const add = (o) => chems.push(o);
  const dCoag = co ? (d.doseBasis === 'design' ? co.Ddes : d.doseBasis === 'avg' ? co.Davg : co.monthlyDose[month]) : 0;
  if (co) {
    const solid = co.inputs.form !== 'liquid';
    add({
      key: 'coag',
      name: co.coag.label.split(' (')[0],
      dose: dCoag,
      kgD: (dCoag * qDay) / 1000,
      cap: co.storeKg,
      onHand: d.stockCoag,
      pack: solid ? num(co.inputs.bagKg, 50) : 1000,
      packName: solid ? `${num(co.inputs.bagKg, 50)} kg bag` : 'tonne (bulk)',
      price: co.inputs.priceCoag,
      lead: d.lead,
      monthly: (i) => co.monthlyDose[i],
    });
    if (co.polyKgD > 0)
      add({
        key: 'poly',
        name: 'Polymer (coagulant aid)',
        dose: co.inputs.polymer,
        kgD: (co.inputs.polymer * qDay) / 1000,
        cap: co.polyKgD * co.inputs.storageDays,
        onHand: d.stockPoly,
        pack: 25,
        packName: '25 kg bag',
        price: co.inputs.pricePoly,
        lead: d.lead,
      });
    if (co.pac)
      add({
        key: 'pac',
        name: 'Powdered activated carbon',
        dose: co.pac.dose,
        kgD: (co.pac.dose * qDay) / 1000,
        cap: co.pac.storeKg,
        onHand: d.stockPac,
        pack: 25,
        packName: '25 kg bag',
        price: co.inputs.pricePac,
        lead: d.lead,
        note: 'used in taste & odour / algae seasons only',
      });
    if (co.sodaKgD > 0)
      add({
        key: 'soda',
        name: 'Soda ash',
        dose: co.sodaDose,
        kgD: co.sodaKgD * scale,
        cap: co.sodaKgD * co.inputs.storageDays,
        onHand: d.stockSoda,
        pack: 50,
        packName: '50 kg bag',
        price: co.inputs.priceSoda,
        lead: d.lead,
      });
  }
  const lime = r.buildings?.chem?.lime;
  if (lime?.kgD > 0)
    add({
      key: 'lime',
      name: 'Hydrated lime (pre- and post-lime)',
      dose: (lime.kgD * 1000) / dem.Qd,
      kgD: lime.kgD * scale,
      cap: lime.storeKg,
      onHand: d.stockLime,
      pack: num(r.stab?.inputs?.bagKg, 25),
      packName: `${num(r.stab?.inputs?.bagKg, 25)} kg bag`,
      price: num(r.stab?.inputs?.price, 0) > 0 ? r.stab.inputs.price : num(co?.inputs?.priceLime, 72),
      lead: d.lead,
    });
  if (dis?.agent) {
    const A = dis.agent,
      s = A.strength || 1;
    const sp = r.special?.feMn?.ox === 'cl2' ? r.special.feMn.dose : 0;
    const clDose = dis.totDose + sp;
    const kgD = (clDose * qDay) / 1000 / s;
    const gas = dis.key === 'gas';
    const cap = gas
      ? dis.storeUnits * dis.inputs.cylinder
      : dis.key === 'naocl' && dis.naoclTank > 0
        ? dis.naoclTank * (A.density || 1170)
        : (dis.kgD / s) * num(dis.inputs.storageDays, 30);
    add({
      key: 'cl',
      name: A.label.split(' (')[0],
      dose: clDose,
      kgD,
      cap,
      onHand: d.stockCl,
      pack: gas ? dis.inputs.cylinder : dis.key === 'naocl' ? 1000 : 50,
      packName: gas
        ? `${dis.inputs.cylinder} kg ${dis.inputs.cylinder >= 900 ? 'drum' : 'cylinder'}`
        : dis.key === 'naocl'
          ? 'tonne (bulk)'
          : '50 kg drum',
      price: dis.price,
      lead: d.leadCl,
      unit: A.unit,
      note: sp > 0 ? `includes ${tx(sp, 2)} mg/L for iron / manganese oxidation` : '',
    });
  }
  const fm = r.special?.feMn;
  if (fm && fm.ox && fm.ox !== 'cl2' && fm.kgD > 0)
    add({
      key: 'ox',
      name: fm.label,
      dose: fm.dose,
      kgD: fm.kgD * scale,
      cap: fm.kgD * 30,
      onHand: d.stockOx,
      pack: 50,
      packName: '50 kg drum',
      price: 0,
      lead: d.lead,
    });

  const proj = [];
  for (const c of chems) {
    c.onHandUsed = c.onHand > 0 ? c.onHand : c.cap;
    c.assumedFull = !(c.onHand > 0);
    c.days = c.kgD > 0 ? c.onHandUsed / c.kgD : Infinity;
    c.capDays = c.kgD > 0 ? c.cap / c.kgD : Infinity;
    c.reorderLevel = c.kgD * (c.lead + d.safety);
    const toReorder = c.kgD > 0 ? (c.onHandUsed - c.reorderLevel) / c.kgD : Infinity;
    c.reorderIn = Math.max(0, Math.floor(toReorder));
    c.reorderDate = Number.isFinite(toReorder) ? iso(t0 + c.reorderIn * DAY) : '';
    c.runOut = Number.isFinite(c.days) ? iso(t0 + Math.floor(c.days) * DAY) : '';
    const atDelivery = Math.max(0, c.onHandUsed - c.kgD * (c.reorderIn + c.lead));
    c.orderPacks = Math.max(0, Math.floor((c.cap - atDelivery) / c.pack));
    c.orderKg = c.orderPacks * c.pack;
    c.monthKg = c.kgD * 30.4;
    c.monthCost = c.monthKg * (c.price || 0);
    c.status = c.days < c.lead ? 'fail' : c.days < c.lead + d.safety ? 'warn' : 'ok';
    c.action =
      c.days < c.lead
        ? 'order now – stock runs out before a delivery can arrive'
        : toReorder <= 0
          ? 'order now – the safety stock will be used'
          : `order on ${c.reorderDate}`;
    calc.step(
      `${c.name}: days of stock`,
      'd = S/M',
      `${n(c.onHandUsed, 0)}/${n(c.kgD, 1)}`,
      c.days,
      'days',
      `${c.assumedFull ? 'store assumed full · ' : ''}reorder level ${Math.round(c.reorderLevel).toLocaleString('en-US')} kg (${c.lead} d lead + ${d.safety} d safety) · ${c.action}`,
    );
    calc.flag(
      `${c.name}: stock covers lead time and safety stock`,
      c.status === 'ok',
      `${Number.isFinite(c.days) ? c.days.toFixed(0) : '∞'} days`,
      `≥ ${c.lead + d.safety} days (lead + safety)`,
      c.action,
      c.status === 'fail' ? 'fail' : 'warn',
      'NWSDB D3 §9.1',
    );
    // 90-day projection with deliveries
    const pts = [];
    let s = c.onHandUsed,
      pending = null;
    for (let day = 0; day <= 90; day++) {
      if (pending !== null && day >= pending.at) {
        s += pending.kg;
        pending = null;
      }
      pts.push({ day, pct: c.cap > 0 ? (s / c.cap) * 100 : 0 });
      if (pending === null && s <= c.reorderLevel + 1e-9 && c.kgD > 0)
        pending = {
          at: day + c.lead,
          kg: Math.max(0, Math.floor((c.cap - Math.max(0, s - c.kgD * c.lead)) / c.pack) * c.pack),
        };
      s = Math.max(0, s - c.kgD);
    }
    proj.push({ key: c.key, name: c.name, pts });
  }
  const gasCl = chems.find((c) => c.key === 'cl' && dis?.key === 'gas');
  if (gasCl) {
    const turn = gasCl.cap / gasCl.kgD / 30.4;
    calc.flag(
      'Chlorine container turnover',
      turn <= 3,
      `${turn.toFixed(1)} months for a full store`,
      '≤ 3 months',
      'Containers stay too long in store – order fewer at a time.',
      'warn',
      'NWSDB D3 §6.5.1',
    );
  }
  // monthly consumption and cost over the year
  const year = MONTHS.map((mo, i) => {
    const row = { month: mo, kg: {}, cost: 0 };
    for (const c of chems) {
      const kg = (c.monthly ? (c.monthly(i) * qDay) / 1000 : c.kgD) * MD[i];
      row.kg[c.key] = kg;
      row.cost += kg * (c.price || 0);
    }
    return row;
  });
  const annualCost = year.reduce((a, b) => a + b.cost, 0);
  calc.step(
    'Chemical cost for the year at this flow',
    'C = \\sum M_i\\,p_i',
    '',
    annualCost,
    'LKR',
    'NWSDB Rates 2026 prices (A-CH/01–02, Annex 06) or entered prices',
  );
  chems.forEach((c) => {
    delete c.monthly;
  });

  return { inputs: d, asOf: iso(t0), month, qDay, bw, ssf, chems, proj, year, annualCost, ...calc.result() };
}
