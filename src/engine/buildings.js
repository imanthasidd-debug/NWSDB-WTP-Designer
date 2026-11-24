// Chemical house and chlorination building: storage, solution preparation, dosing, bunding, lime feeding, chlorine
// container storage, chlorinator room, ventilation and leak neutralisation.
// NWSDB D3 §5.4.8, §6.1 (chemical feeding), §6.4–6.5 (hypochlorite / gas chlorination), §9 (plant layout & safety).
import { Calc, n } from '../core/calc.js';
import { BLEACH, CHEM, GAS } from '../core/d3.js';
import { ceilTo } from '../core/util.js';

export const DEFAULTS = {
  // chemical house
  stockPct: 10, // % stock (day-tank) solution strength – D3 §6.1.2: 10 % (2–10 %)
  applyPct: 1, // % strength at the point of application – D3 §6.1.3: ≈ 1 % (≥ 0.5 %)
  bundPct: 110, // % of the largest tank held by the bund
  limeFeed: 'auto', // auto | slurry | saturator
  limeSlurry: 50, // g/L slurry strength – D3 §6.1.6: 50–100 g/L
  satRate: 1.45, // kg Ca(OH)2 per h per m² of static saturator – D3 §6.1.6: 1.3–1.6
  limeStack: 1.5, // m stacking height of 25 kg bags
  storeyH: 5, // m clear height (D3 Table 6-1: 4–8 m manual batching, 6–8 m jumbo-bag unloader)
  officeArea: 12, // m² operator's room / dosing control
  // chlorination building
  aisle: 1.5, // storage area multiplier for aisles & handling
  naohPct: 20, // % caustic solution in the neutralisation tank / scrubber – D3 §6.5.3
  chlorH: 4, // m clear height of chlorine rooms
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const co = r.coag,
    stab = r.stab,
    dis = r.dis,
    dem = r.demand;
  const out = { inputs: d };

  // ================================================================ chemical house
  const limeKgD = (co?.limeKgD || 0) + (stab?.kgD || 0);
  if (co || limeKgD > 0) {
    calc.section('Chemical house – coagulant storage and solution preparation (NWSDB D3 §6.1)');
    const rooms = [];
    let tankV = 0,
      nTanks = 0,
      tankSide = 0,
      tankDepth = 0,
      pumpLh = 0,
      nPumps = 0,
      dilLh = 0,
      bundV = 0,
      bundH = 0,
      prepArea = 0,
      storeArea = 0;
    if (co) {
      const days = co.inputs.storageDays;
      storeArea = co.storeArea || 0;
      if (storeArea > 0)
        calc.step(
          `Coagulant store (${days} days, ${co.bags} bags)`,
          'A_s',
          '\\text{from the dosing design}',
          storeArea,
          'm²',
          'NWSDB D3 §5.4.8, §6.1.9, §9.1 – at least one month',
        );
      else
        calc.step('Bulk liquid coagulant storage', 'V', '', co.liquidTank, 'm³', 'NWSDB D3 §9.1 – at least one month');
      tankV = co.tankV;
      nTanks = co.inputs.nTanks;
      tankSide = co.tankSide;
      tankDepth = co.inputs.tankDepth;
      calc.step(
        `Solution (day) tanks – ${nTanks} nos.`,
        'V_t',
        `${n(tankSide)}\\times${n(tankSide)}\\times${n(tankDepth)}`,
        tankV,
        'm³ each',
        'NWSDB D3 §6.1.2, §6.1.4 – each tank supplies 24 h; two batching tanks',
      );
      const nStreams = Math.max(1, dem.nTrains);
      pumpLh = co.pumpMax;
      nPumps = nStreams + 1;
      calc.step(
        'Dosing pumps (one per stream + one standby)',
        'q_p',
        `${nStreams}+1`,
        pumpLh,
        'L/h each',
        'NWSDB D3 §5.4.8 – duplicate feeders; §6.1.9 standby feed capacity must be provided',
      );
      dilLh = pumpLh * (d.stockPct / d.applyPct - 1);
      calc.step(
        'Carrier (dilution) water to reach the application strength',
        'q_d = q_p\\left(\\frac{C_s}{C_a}-1\\right)',
        `${n(pumpLh)}\\left(\\frac{${n(d.stockPct)}}{${n(d.applyPct)}}-1\\right)`,
        dilLh,
        'L/h per stream',
        'NWSDB D3 §6.1.3 – ≈ 1 % at the diffuser; take from filtered water before lime',
      );
      prepArea = nTanks * (tankSide + 1.0) * (tankSide + 1.2) + 6;
      bundV = (tankV * d.bundPct) / 100;
      bundH = Math.max(0.3, ceilTo(bundV / Math.max(prepArea - nTanks * tankSide * tankSide, 1), 0.05));
      calc.step(
        'Bund volume (largest tank)',
        'V_b = 1.1\\,V_t',
        `${n(d.bundPct / 100)}\\times${n(tankV)}`,
        bundV,
        'm³',
        'NWSDB D3 §6.1.4 – overflow to bund sump; §9.5.8 spill containment',
      );
      calc.step('Bund wall height around the preparation area', 'h_b = V_b/A_{net}', '', bundH, 'm');
      calc.flag(
        'Coagulant storage period',
        days >= CHEM.storageDays,
        `${days} d`,
        '≥ 30 d',
        '',
        'warn',
        'NWSDB D3 §5.4.8, §6.1.9, §9.1',
      );
      calc.flag(
        'Stock solution strength',
        d.stockPct >= 2 && d.stockPct <= 10,
        `${d.stockPct} %`,
        '2–10 %',
        '',
        'warn',
        'NWSDB D3 §6.1.2–6.1.3',
      );
      calc.flag(
        'Strength at the point of application',
        d.applyPct <= 1 + 1e-9 && d.applyPct >= 0.5 - 1e-9,
        `${d.applyPct} %`,
        '0.5–1 %',
        '',
        'warn',
        'NWSDB D3 §6.1.3',
      );
      calc.flag(
        'Bund capacity',
        d.bundPct >= 110,
        `${d.bundPct} %`,
        '≥ 110 % of the largest tank',
        '',
        'warn',
        'NWSDB D3 §6.1.4, §9.5.8',
      );
      if (storeArea > 0)
        rooms.push({
          key: 'store',
          name: `${co.coag.label.split(' (')[0]} store`,
          area: storeArea + 8,
          note: `${co.bags} bags · ${days} d`,
        });
      rooms.push({
        key: 'prep',
        name: 'Solution preparation (bunded)',
        area: prepArea,
        note: `${nTanks} × ${tankV.toFixed(1)} m³ tanks`,
      });
      rooms.push({
        key: 'dose',
        name: 'Dosing pump room',
        area: Math.max(10, nPumps * 2.5 + 4),
        note: `${nPumps} pumps × ${pumpLh.toFixed(0)} L/h`,
      });
    }
    // ---- lime
    let lime = null;
    if (limeKgD > 0) {
      calc.section('Chemical house – lime (NWSDB D3 §6.1.6)');
      const postKgD = stab?.kgD || 0;
      const feed = d.limeFeed === 'auto' ? (postKgD > 0 && postKgD <= 400 ? 'saturator' : 'slurry') : d.limeFeed;
      const days = stab?.inputs?.storageDays || co?.inputs?.storageDays || 30;
      const storeKg = limeKgD * days;
      const limeStore = (storeKg / CHEM.bulkLime / d.limeStack) * 1.6;
      calc.step('Hydrated lime used (pre- and post-lime, design)', 'W_L', '', limeKgD, 'kg/d');
      calc.step(
        `Lime store (${days} days, 25 kg bags, +60 % aisles)`,
        'A = 1.6\\,\\frac{W_L t}{\\rho_b h}',
        `1.6\\times\\frac{${n(storeKg, 0)}}{${n(CHEM.bulkLime)}\\times${n(d.limeStack)}}`,
        limeStore,
        'm²',
        'NWSDB D3 §6.1.2 – bulk density 670 kg/m³',
      );
      const slurryM3 = limeKgD / d.limeSlurry;
      const slurryTank = slurryM3; // each of two tanks holds one day
      calc.step(
        'Lime slurry volume per day',
        'V = W_L/C',
        `${n(limeKgD)}/${n(d.limeSlurry)}`,
        slurryM3,
        'm³/d',
        'NWSDB D3 §6.1.6 – slurry 50–100 g/L (> 100 blocks, < 50 carbonates)',
      );
      let satA = 0,
        satD = 0,
        limeWater = 0;
      if (feed === 'saturator') {
        satA = postKgD / 24 / d.satRate;
        satD = ceilTo(Math.sqrt((4 * satA) / Math.PI), 0.1);
        limeWater = postKgD / 1.6; // m³/d of saturated lime water at ≈ 1.6 g/L
        calc.step(
          'Static lime saturator area (post-lime as lime water)',
          'A = \\frac{W_L/24}{q_s}',
          `\\frac{${n(postKgD)}/24}{${n(d.satRate)}}`,
          satA,
          'm²',
          'NWSDB D3 §6.1.6 – 1.3–1.6 kg Ca(OH)₂/h·m²',
        );
        calc.step('Saturator diameter (2 units, duty / standby)', 'D = \\sqrt{4A/\\pi}', '', satD, 'm');
        calc.step(
          'Saturated lime-water flow (≈ 1.6 g/L)',
          'Q_{lw} = W_L/1.6',
          `${n(postKgD)}/1.6`,
          limeWater,
          'm³/d',
          'NWSDB D3 §6.1.6 – lime water ≈ 1.6 g/L Ca(OH)₂ at 20 °C',
        );
        calc.check('lime.sat', d.satRate, 'Saturator loading', {
          crit: { min: 1.3, max: 1.6, hardMax: 4 },
          src: 'NWSDB D3 §6.1.6 – static 1.3–1.6 kg/h·m² (turbine 3.2–4)',
        });
      }
      const handling =
        limeKgD > 1300
          ? 'silo (≥ 50 m³) with screw feeder'
          : limeKgD >= 650
            ? 'jumbo bags (≈ 650 kg) with unloader and screw feeder'
            : 'manual batching from 25 kg bags';
      calc.text(
        `Lime handling: ${handling} (NWSDB D3 Table 6-1: jumbo-bag feeding suits 650–1,300 kg/d; larger plants use a silo; the smallest plants batch manually into two tanks). Covered mixing tanks with agitators, dust extraction and a grit trap ahead of the pumps; ejector feeding at < 2.5 %.`,
      );
      calc.check('lime.slurry', d.limeSlurry, 'Lime slurry strength', {
        crit: { min: 50, max: 100, hardMin: 20, hardMax: 200 },
        src: 'NWSDB D3 §6.1.6 – 50–100 g/L',
      });
      calc.flag('Lime storage period', days >= 30, `${days} d`, '≥ 30 d', '', 'warn', 'NWSDB D3 §9.1');
      lime = {
        kgD: limeKgD,
        postKgD,
        feed,
        storeKg,
        storeArea: limeStore,
        slurryM3,
        slurryTank,
        satA,
        satD,
        limeWater,
        handling,
        days,
      };
      rooms.push({
        key: 'lime',
        name: 'Lime store & slurry tanks',
        area: limeStore + 2 * Math.max(4, slurryTank / 1.5 + 3) + (satA > 0 ? 2 * (satD + 0.8) ** 2 : 0),
        note:
          feed === 'saturator' ? `2 saturators Ø${satD.toFixed(1)} m` : `2 × ${slurryTank.toFixed(1)} m³ slurry tanks`,
      });
    }
    // ---- PAC / polymer
    let pacArea = 0;
    if (co?.pac) {
      pacArea = (co.pac.storeKg / 500 / 1.5) * 1.6 + 10;
      calc.step(
        'Powdered activated carbon store and slurry room (separate, fire-rated)',
        'A',
        '',
        pacArea,
        'm²',
        'NWSDB D3 §6.1.10, §7.3.2 – separate storage; bags 20–25 kg',
      );
      rooms.push({
        key: 'pac',
        name: 'PAC store & slurry',
        area: pacArea,
        note: `${(co.pac.storeKg / 1000).toFixed(1)} t`,
      });
    }
    rooms.push({ key: 'office', name: "Operator's room", area: d.officeArea, note: 'dosing control, jar test' });
    // ---- building envelope: rooms in a row along the length, common depth
    const total = rooms.reduce((a, x) => a + x.area, 0);
    const W = Math.max(6, ceilTo(Math.sqrt(total / 2.2), 0.5));
    let x = 0;
    for (const rm of rooms) {
      rm.w = Math.max(3, ceilTo(rm.area / W, 0.5));
      rm.x = x;
      x += rm.w;
    }
    const L = x;
    calc.section('Chemical house – building');
    calc.step('Floor area required', 'A = \\sum A_i', rooms.map((q) => n(q.area, 0)).join('+'), total, 'm²');
    calc.step(
      'Building (rooms in line, loading platform along the store side)',
      'L \\times W',
      `${n(L)}\\times${n(W)}`,
      L * W,
      'm²',
    );
    calc.flag(
      'Clear height',
      d.storeyH >= 4 && d.storeyH <= 8,
      `${d.storeyH} m`,
      '4–8 m',
      'Jumbo-bag unloaders need 6–8 m',
      'info',
      'NWSDB D3 Table 6-1',
    );
    calc.text(
      'Provide: raised loading platform and hoist / monorail for bags; non-slip acid-resistant floor laid to falls to the bund sump; safety shower and eye-wash; dust extraction over batching hoppers; level sensors on batch tanks (high stops dilution water, low alarms, low-low inhibits the dosing pump); calibration cylinders on each pump (NWSDB D3 §6.1.4–6.1.5, §9.5.8). Solution preparation, dosing and flocculation as close together as possible (D3 §6.1).',
    );
    out.chem = {
      rooms,
      L,
      W,
      H: d.storeyH,
      area: L * W,
      total,
      tankV,
      nTanks,
      tankSide,
      tankDepth,
      pumpLh,
      nPumps,
      dilLh,
      bundV,
      bundH,
      storeArea,
      lime,
      pacArea,
    };
  }

  // ================================================================ chlorination building
  if (dis) {
    calc.section(`Chlorination building – ${dis.agent.label} (NWSDB D3 §6.4–6.5)`);
    const rooms = [];
    if (dis.key === 'gas') {
      const drum = dis.inputs.cylinder >= 900;
      const withdrawal = drum ? GAS.drumGasMax : 20;
      const onLine = Math.max(1, Math.ceil(dis.kgD / withdrawal));
      const nStore = dis.storeUnits;
      const fp = drum ? 2.4 * 1.1 : 0.45 * 0.45;
      const storeA = Math.max(drum ? 16 : 6, nStore * fp * d.aisle + (drum ? 8 : 2));
      calc.step(
        `${drum ? '900 kg drums' : dis.inputs.cylinder + ' kg cylinders'} in store`,
        'n_s',
        '',
        nStore,
        'nos.',
        'NWSDB D3 Table 6-12 – minimum 30 days supply; turnover ≤ 3 months',
      );
      calc.step(
        'Containers connected (duty) + equal standby bank with automatic change-over',
        'n = W/w_{max}',
        `${n(dis.kgD)}/${n(withdrawal)}`,
        onLine,
        'duty',
        'NWSDB D3 §6.5.5 – ≤ 180 kg/d gas per ton container; automatic switch-over should be included',
      );
      calc.step(
        'Container store area',
        'A = n_s a\\,k',
        `${nStore}\\times${n(fp)}\\times${n(d.aisle)}`,
        storeA,
        'm²',
        'NWSDB D3 §6.5.8 – separate store, protected from sun and rain, containers restrained',
      );
      const drumRoom = Math.max(drum ? 14 : 6, 2 * onLine * fp * 1.6 + (drum ? 8 : 3));
      const clRoom = 12;
      calc.step(
        'Connected-container (drum) room',
        'A',
        '',
        drumRoom,
        'm²',
        'NWSDB D3 §6.5.8 – only connected containers in the feed room',
      );
      calc.step(
        'Chlorinator room – 2 vacuum chlorinators (duty + standby)',
        'A',
        '',
        clRoom,
        'm²',
        'NWSDB D3 §6.5.8 – wall-mounted chlorinators, two units',
      );
      const vol = (drumRoom + clRoom) * d.chlorH;
      const fan = vol * GAS.ach;
      calc.step(
        'Forced ventilation – one air change per minute',
        'Q_v = 60\\,V',
        `60\\times${n(vol, 0)}`,
        fan,
        'm³/h',
        'NWSDB D3 §6.5.8 – outlets near the floor, inlets near the ceiling, switches outside',
      );
      const contKg = dis.inputs.cylinder;
      const naoh = 1.13 * contKg * 1.1;
      const naohVol = naoh / (d.naohPct / 100) / 1220;
      calc.step(
        'Caustic soda to neutralise one container (+10 %)',
        'M = 1.13\\,m_c\\times1.1',
        `1.13\\times${n(contKg)}\\times1.1`,
        naoh,
        'kg NaOH',
        'NWSDB D3 §6.5.3 – 1 kg Cl₂ + 1.13 kg NaOH; Table 6-13',
      );
      calc.step(
        `Neutralisation tank / scrubber liquor at ${d.naohPct} %`,
        'V = \\frac{M}{c\\,\\rho}',
        `\\frac{${n(naoh, 0)}}{${n(d.naohPct / 100)}\\times1220}`,
        naohVol,
        'm³',
        'NWSDB D3 §6.5.3 – 20 % NaOH; scrubber essential near residential areas',
      );
      const injector = (dis.kgH * 1e6) / 3500 / 1000;
      calc.step(
        'Injector (motive) water – solution ≤ 3,500 mg/L',
        'q = \\frac{w}{3500\\,mg/L}',
        `\\frac{${n(dis.kgH)}\\,kg/h}{3.5\\,g/L}`,
        injector,
        'm³/h',
        'NWSDB D3 §6.5.5',
      );
      const evap = dis.kgD > GAS.evaporator;
      calc.flag('Standby chlorinator', true, '1 duty + 1 standby', '2 units', '', 'info', 'NWSDB D3 §6.5.8');
      calc.flag(
        'Ventilation rate',
        true,
        `${fan.toFixed(0)} m³/h`,
        '1 air change / min',
        '',
        'info',
        'NWSDB D3 §6.5.8',
      );
      calc.flag(
        'Gas withdrawal per container',
        dis.kgD / onLine <= withdrawal + 1e-6,
        `${(dis.kgD / onLine).toFixed(0)} kg/d`,
        `≤ ${withdrawal} kg/d`,
        evap ? 'Liquid withdrawal with evaporators required above 680 kg/d' : '',
        'warn',
        'NWSDB D3 §6.5.5.1',
      );
      calc.text(
        `Safety (NWSDB D3 §6.5.3, §6.5.8, §9.8.2 – "shall"): two outward-opening doors, no door into other rooms; chlorine leak detectors with siren in the store and feed rooms; self-contained breathing apparatus and emergency kit outside the door; safety shower and eye fountain; wind sock; neutralisation basin / ${evap ? 'automatic scrubber' : 'scrubber where the site is near housing'}; ${drum ? '2 t monorail hoist and lifting beam, drum cradles with rollers, platform weighing scale' : 'cylinder trolley, chains and a weighing scale'}; plastic (uPVC) solution pipework; floor at or below the level of adjoining floors.`,
      );
      rooms.push(
        { key: 'store', name: 'Container store', area: storeA, note: `${nStore} ${drum ? 'drums' : 'cylinders'}` },
        { key: 'feed', name: 'Connected containers', area: drumRoom, note: `${onLine} duty + ${onLine} standby` },
        { key: 'chlor', name: 'Chlorinator room', area: clRoom, note: `2 × ${dis.chlorinator} kg/h` },
        {
          key: 'scrub',
          name: 'Neutralisation / scrubber',
          area: Math.max(6, naohVol * 1.2 + 5),
          note: `${naohVol.toFixed(1)} m³ of ${d.naohPct} % NaOH`,
        },
      );
      Object.assign(out, {
        chlorGas: { drum, onLine, nStore, storeA, drumRoom, clRoom, fan, naoh, naohVol, injector, evap, withdrawal },
      });
    } else {
      const solM3 = dis.key === 'naocl' ? dis.naoclTank : dis.kgD / (BLEACH.solution * 10);
      const days = dis.inputs.storageDays;
      const storeA =
        dis.key === 'naocl'
          ? Math.max(8, dis.naoclTank * 0.8 + 6)
          : Math.max(8, ((dis.productKgD * days) / 900 / 1.2) * 1.6 + 4);
      if (dis.key !== 'naocl')
        calc.step(
          'Solution tanks at 1 % available chlorine – 2 nos., 24 h each',
          'V = W/10',
          `${n(dis.kgD)}/10`,
          solM3,
          'm³ each',
          'NWSDB D3 §6.4.1 – basins sized for 24 h; settle and use the supernatant',
        );
      else calc.step('Bulk hypochlorite storage', 'V', '', solM3, 'm³');
      calc.step(
        `Dry, ventilated store for ${days} days`,
        'A',
        '',
        storeA,
        'm²',
        'NWSDB D3 §6.4 – cool, dry, dark store; stock ≤ 3 months (strength decays)',
      );
      calc.text(
        'Two solution tanks with mixers and a sludge drain, two dosing pumps or constant-head drip feeders (duty + standby), eye-wash and PPE; keep the store separate from the coagulant store (NWSDB D3 §6.4, §9.5.8).',
      );
      rooms.push(
        { key: 'store', name: 'Hypochlorite store', area: storeA, note: `${days} d stock` },
        {
          key: 'feed',
          name: 'Solution tanks & dosing',
          area: Math.max(10, 2 * (solM3 / 1.2 + 2) + 4),
          note: `2 × ${solM3.toFixed(1)} m³`,
        },
      );
      Object.assign(out, { hypo: { solM3, storeA, days } });
    }
    const total = rooms.reduce((a, x) => a + x.area, 0);
    const W = Math.max(4, ceilTo(Math.sqrt(total / 2), 0.5));
    let x = 0;
    for (const rm of rooms) {
      rm.w = Math.max(2.5, ceilTo(rm.area / W, 0.5));
      rm.x = x;
      x += rm.w;
    }
    calc.step('Chlorination building', 'L \\times W', `${n(x)}\\times${n(W)}`, x * W, 'm²');
    out.chlor = { rooms, L: x, W, H: d.chlorH, area: x * W, gas: dis.key === 'gas' };
  }
  return { ...out, ...calc.result() };
}
