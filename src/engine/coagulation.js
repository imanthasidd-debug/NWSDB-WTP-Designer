// Coagulant & alkalinity-adjustment dosing: doses, carbonate chemistry, Al solubility, consumption, storage, dosing plant
import { Calc, n } from '../core/calc.js';
import { CTfrom, alSpecies, pHfrom } from '../core/water.js';
import { MONTHS, ceilTo, clamp, maxOf, mean, minOf, num } from '../core/util.js';

export const COAGULANTS = {
  alum: { label: 'Aluminium sulphate (alum, Al₂(SO₄)₃·14H₂O)', alkPer: 0.505, sludgePer: 0.44, metal: 'Al', alPer: 0.0909, price: 180, bulkDensity: 1000, liquid: { strength: 0.48, density: 1330 } },
  pacl: { label: 'Poly-aluminium chloride (PACl, 10 % Al₂O₃, 70 % basicity)', alkPer: 0.088, sludgePer: 0.26, metal: 'Al', alPer: 0.0529, price: 420, bulkDensity: 1200, liquid: { strength: 1, density: 1200 } },
  fecl3: { label: 'Ferric chloride (FeCl₃, as 100 %)', alkPer: 0.925, sludgePer: 0.66, metal: 'Fe', alPer: 0, price: 260, bulkDensity: 1420, liquid: { strength: 0.4, density: 1420 } },
};

export const DEFAULTS = {
  coagulant: 'alum',
  form: 'solid',              // solid (bags) | liquid (bulk tank)
  doseMethod: 'empirical',    // empirical | jar | fixed
  empA: 7.0,
  empB: 0.35,
  minDose: 10,
  maxDose: 120,
  fixedDose: 35,
  jarTurb: 85,
  jar: [
    { dose: 10, turb: 18, pH: 6.8 }, { dose: 20, turb: 7.5, pH: 6.6 }, { dose: 30, turb: 3.2, pH: 6.45 },
    { dose: 40, turb: 2.1, pH: 6.3 }, { dose: 50, turb: 2.4, pH: 6.15 }, { dose: 60, turb: 3.0, pH: 6.0 },
  ],
  polymer: 0.1,
  phAdjust: 'lime',           // lime | soda | none
  resAlk: 25,
  limePurity: 85,
  sodaPurity: 98,
  solConc: 8,
  batchHours: 12,
  nTanks: 2,
  tankDepth: 1.8,
  storageDays: 30,
  bagKg: 50,
  stackH: 1.8,
  priceCoag: 180,
  priceLime: 70,
  priceSoda: 210,
  pricePoly: 1500,
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const q = ctx.res.quality;
  const dem = ctx.res.demand;
  const C = COAGULANTS[d.coagulant] || COAGULANTS.alum;
  const T = q.T;
  const Qd = dem.Qd;
  const Qop = dem.design.gross * (1 + dem.inputs.ownUse / 100); // average operating production (design year)
  const nStreams = dem.nTrains;

  // --- dose model
  const jarRows = (d.jar || []).filter((r) => num(r.dose) > 0 && num(r.turb) > 0);
  const jarOpt = jarRows.length ? jarRows.reduce((a, b) => (b.turb < a.turb ? b : a)) : null;
  const doseAt = (turb) => {
    let D;
    if (d.doseMethod === 'fixed') D = d.fixedDose;
    else if (d.doseMethod === 'jar' && jarOpt) D = jarOpt.dose * (Math.max(turb, 1) / Math.max(d.jarTurb, 1)) ** d.empB;
    else D = d.empA * Math.max(turb, 1) ** d.empB;
    return clamp(D, d.minDose, d.maxDose);
  };
  const monthlyDose = q.monthly.map(doseAt);
  const Ddes = doseAt(q.turbMax);
  const Davg = mean(monthlyDose);
  const Dmin = minOf(monthlyDose);

  calc.section('Coagulant dose');
  if (d.doseMethod === 'empirical') calc.step('Design dose (empirical turbidity correlation)', 'D = a\\,T_u^{\\,b}', `${n(d.empA)} \\times ${n(q.turbMax)}^{${n(d.empB)}}`, Ddes, 'mg/L', 'Calibrate a, b with plant jar-test records');
  else if (d.doseMethod === 'jar') {
    calc.step('Optimum jar-test dose', 'D_{opt}', `\\text{min. residual turbidity } ${n(jarOpt?.turb)}\\,\\text{NTU}`, jarOpt?.dose, 'mg/L', 'LN – Jar test (Test 1)');
    calc.step('Design dose scaled to design turbidity', 'D = D_{opt}\\left(\\frac{T_u}{T_{u,jar}}\\right)^{b}', `${n(jarOpt?.dose)}\\left(\\frac{${n(q.turbMax)}}{${n(d.jarTurb)}}\\right)^{${n(d.empB)}}`, Ddes, 'mg/L');
  } else calc.step('Design dose (fixed)', 'D', 'D', Ddes, 'mg/L');
  calc.step('Average annual dose (from monthly turbidity)', '\\bar D = \\tfrac{1}{12}\\sum D_i', '', Davg, 'mg/L');

  // --- alkalinity & pH (closed carbonate system)
  calc.section('Alkalinity and coagulation pH');
  const alk0 = q.get('alk', 1);
  const pH0 = q.get('pH', 1);
  const CT0 = CTfrom(pH0, alk0, T);
  const alkUsed = C.alkPer * Ddes;
  calc.step('Alkalinity consumed by coagulant', '\\Delta Alk = k\\,D', `${n(C.alkPer, 3)} \\times ${n(Ddes)}`, alkUsed, 'mg/L as CaCO₃', d.coagulant === 'alum' ? 'Al₂(SO₄)₃·14H₂O + 3Ca(HCO₃)₂ → 2Al(OH)₃ + 3CaSO₄ + 6CO₂ (1 mg/L alum ≡ 0.5 mg/L alk.)' : '');
  const need = Math.max(0, d.resAlk + alkUsed - alk0);
  calc.step('Alkalinity to be added', 'A_{add} = Alk_{res} + \\Delta Alk - Alk_0', `${n(d.resAlk)} + ${n(alkUsed)} - ${n(alk0)}`, need, 'mg/L as CaCO₃');
  let limeDose = 0, sodaDose = 0, dCT = 0;
  if (d.phAdjust === 'lime' && need > 0) {
    limeDose = (need * 74.09) / 100 / (d.limePurity / 100);
    calc.step('Pre-lime dose (hydrated lime)', 'D_{lime} = \\frac{A_{add}\\times 74/100}{purity}', `\\frac{${n(need)}\\times0.741}{${n(d.limePurity / 100, 2)}}`, limeDose, 'mg/L');
  } else if (d.phAdjust === 'soda' && need > 0) {
    sodaDose = (need * 105.99) / 100 / (d.sodaPurity / 100);
    dCT = (sodaDose * (d.sodaPurity / 100)) / 105990;
    calc.step('Soda-ash dose', 'D_{soda} = \\frac{A_{add}\\times 106/100}{purity}', `\\frac{${n(need)}\\times1.06}{${n(d.sodaPurity / 100, 2)}}`, sodaDose, 'mg/L');
  }
  const added = d.phAdjust === 'none' ? 0 : need;
  const alk1 = alk0 - alkUsed + added;
  const pH1 = alk1 > 0 ? pHfrom(alk1, CT0 + dCT, T) : 4.5;
  calc.step('Coagulation pH (carbonate equilibrium, closed system)', '\\text{solve } Alk = C_T(\\alpha_1+2\\alpha_2)+\\tfrac{K_w}{[H^+]}-[H^+]', `Alk=${n(alk1)}\\ \\text{mg/L},\\ C_T=${n((CT0 + dCT) * 1000, 3)}\\ \\text{mmol/L}`, pH1, '');
  const al = alSpecies(pH1);
  if (C.metal === 'Al') {
    calc.step('Dissolved Al in equilibrium with Al(OH)₃(am)', '[Al]_T = \\sum [Al(OH)_n^{3-n}]', `pH = ${n(pH1, 2)}`, al.totalMgL, 'mg/L Al', 'LN – Al solubility minimum 5.34 – 6.96');
    calc.check('coag.pH', pH1);
  }
  calc.check('coag.resAlk', alk1);
  if (d.phAdjust === 'none' && alk1 < 10) calc.note('fail', 'Natural alkalinity is insufficient for the coagulant dose – enable lime or soda-ash addition.');

  // --- consumption & storage
  calc.section('Chemical consumption');
  const kgDes = (Ddes * Qd) / 1000;
  const kgAvg = (Davg * Qop) / 1000;
  calc.step('Maximum daily coagulant demand (design flow, design dose)', 'M_{max} = D\\,Q/1000', `${n(Ddes)} \\times ${n(Qd, 0)}/1000`, kgDes, 'kg/d');
  calc.step('Average daily coagulant use (operating flow)', '\\bar M = \\bar D\\,\\bar Q/1000', `${n(Davg)} \\times ${n(Qop, 0)}/1000`, kgAvg, 'kg/d');
  const monthlyKg = monthlyDose.map((D, i) => (D * Qop * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i]) / 1000);
  const annualKg = monthlyKg.reduce((a, b) => a + b, 0);
  const peakMonthKgD = maxOf(monthlyDose) * Qop / 1000;
  const storeKg = d.storageDays * peakMonthKgD;
  calc.step('Storage requirement (peak-month rate)', 'M_s = t_s\\,M_{pm}', `${n(d.storageDays)} \\times ${n(peakMonthKgD, 0)}`, storeKg, 'kg');
  let storeArea = 0, bags = 0, liquidTank = 0;
  if (d.form === 'solid') {
    bags = Math.ceil(storeKg / d.bagKg);
    storeArea = (storeKg / C.bulkDensity / d.stackH) * 1.6;
    calc.step('Number of bags in store', 'N = M_s/m_{bag}', `${n(storeKg, 0)}/${n(d.bagKg)}`, bags, 'bags');
    calc.step('Store floor area (stack height, +60 % aisles)', 'A = 1.6\\,\\frac{M_s}{\\rho_b\\,h_s}', `1.6\\times\\frac{${n(storeKg, 0)}}{${n(C.bulkDensity)}\\times${n(d.stackH)}}`, storeArea, 'm²');
  } else {
    liquidTank = storeKg / C.liquid.strength / C.liquid.density;
    calc.step('Bulk liquid storage volume', 'V = \\frac{M_s}{s\\,\\rho}', `\\frac{${n(storeKg, 0)}}{${n(C.liquid.strength, 2)}\\times${n(C.liquid.density)}}`, liquidTank, 'm³');
  }
  calc.check('coag.storage', d.storageDays);

  calc.section('Solution preparation and dosing');
  const solDaily = kgDes / (d.solConc * 10); // m3/d of solution at C % w/v (C*10 kg/m3)
  calc.step('Daily solution volume at max. demand', 'V_d = \\frac{M_{max}}{10\\,C}', `\\frac{${n(kgDes, 0)}}{10\\times${n(d.solConc)}}`, solDaily, 'm³/d');
  const tankV = (solDaily * d.batchHours) / 24;
  const tankSide = Math.sqrt(tankV / d.tankDepth);
  calc.step('Volume of each solution tank', 'V_t = V_d\\,\\frac{t_b}{24}', `${n(solDaily)} \\times \\frac{${n(d.batchHours)}}{24}`, tankV, 'm³');
  calc.step('Plan side of square tank', 'B = \\sqrt{V_t/h}', `\\sqrt{${n(tankV)}/${n(d.tankDepth)}}`, tankSide, 'm');
  const pumpMax = (solDaily * 1000) / 24 / nStreams; // L/h per stream
  const pumpMin = ((Dmin * Qd) / 1000 / (d.solConc * 10) * 1000) / 24 / nStreams * 0.5; // half flow at min dose
  const turndown = pumpMax / Math.max(pumpMin, 1e-6);
  calc.step('Dosing pump capacity per stream', 'q_p = \\frac{1000\\,V_d}{24\\,N_s}', `\\frac{1000\\times${n(solDaily)}}{24\\times${n(nStreams)}}`, pumpMax, 'L/h');
  calc.step('Required turndown (min dose at 50 % flow)', 'q_{max}/q_{min}', `${n(pumpMax)}/${n(pumpMin)}`, turndown, ':1');
  calc.check('coag.turndown', turndown);
  calc.check('coag.solConc', d.solConc);
  const agitatorKw = Math.max(0.37, tankV * 0.25);

  // --- lime / soda consumption
  const limeKgD = (limeDose * Qd) / 1000;
  const sodaKgD = (sodaDose * Qd) / 1000;
  const monthlyNeed = monthlyDose.map((D) => Math.max(0, d.resAlk + C.alkPer * D - alk0));
  const limeAnnual = d.phAdjust === 'lime' ? monthlyNeed.reduce((a, x, i) => a + (x * 0.741 / (d.limePurity / 100)) * Qop / 1000 * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i], 0) : 0;
  const sodaAnnual = d.phAdjust === 'soda' ? monthlyNeed.reduce((a, x, i) => a + (x * 1.06 / (d.sodaPurity / 100)) * Qop / 1000 * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i], 0) : 0;
  const polyKgD = (d.polymer * Qd) / 1000;
  const polyAnnual = (d.polymer * Qop * 365) / 1000;

  const costs = {
    coag: annualKg * d.priceCoag,
    lime: limeAnnual * d.priceLime,
    soda: sodaAnnual * d.priceSoda,
    poly: polyAnnual * d.pricePoly,
  };
  // Al-solubility curve for chart
  const alCurve = [];
  for (let p = 5.0; p <= 8.51; p += 0.05) alCurve.push({ pH: +p.toFixed(2), al: alSpecies(p).totalMgL });

  return {
    inputs: d, coag: C, Ddes, Davg, Dmin, monthlyDose, months: MONTHS, alk0, pH0, CT0, alkUsed, need, limeDose, sodaDose, alk1, pH1, al: al.totalMgL, alCurve,
    kgDes, kgAvg, monthlyKg, annualKg, storeKg, bags, storeArea, liquidTank, solDaily, tankV, tankSide, pumpMax, pumpMin, turndown, agitatorKw,
    limeKgD, sodaKgD, limeAnnual, sodaAnnual, polyKgD, polyAnnual, costs, jarOpt, jarRows, Qop,
    sludgeFactor: C.sludgePer,
    nDosingPumps: nStreams + 1,
    storeAreaTotal: ceilTo(storeArea + (d.phAdjust !== 'none' ? storeArea * 0.4 : 0), 1),
    ...calc.result(),
  };
}
