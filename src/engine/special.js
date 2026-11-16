// Special treatment: iron & manganese removal (NWSDB D3 §7.1, Tables 6-8, 7-1, 7-2) and fluoride removal (D3 §7.2,
// Tables 7-3, 7-4), triggered when the raw water exceeds SLS 614:2013 (Fe 0.3, Mn 0.1, F 1.0 mg/L).
// Where D3 gives no sizing rule the module says so and uses the stated practice value as an editable input.
import { Calc, n } from '../core/calc.js';
import { CHEM as RB } from '../core/ratebook.js';
import { ceilTo } from '../core/util.js';

// D3 Table 7-1: oxidant demand (mg per mg) and solids produced (kg per kg) for Fe²⁺ and Mn²⁺
export const OXIDANTS = {
  air: { label: 'Aeration (oxygen)', fe: 0.14, mn: 0.29, sFe: 1.9, sMn: 1.58, price: 0 },
  cl2: { label: 'Chlorine', fe: 0.64, mn: 1.29, sFe: 1.9, sMn: 1.58, price: RB.cl2.v },
  kmno4: { label: 'Potassium permanganate', fe: 0.94, mn: 1.92, sFe: 2.4, sMn: 2.64, price: RB.kmno4.v },
};
// D3 Table 7-4 (g of chemical per g of fluoride removed, or capacity of the medium in g F per m³)
export const DEFLUOR = {
  nalgonda: { label: 'Alum + lime (Nalgonda)', alum: 150, lime: 7, removal: 80, pH: '≈ 6.5', loss: 2 },
  alumina: { label: 'Activated alumina (0.3–0.5 mm)', capacity: 1200, removal: 90, pH: '5.5', loss: 2 },
  bonechar: { label: 'Bone char', capacity: 1000, removal: 85, pH: '> 7', loss: 2 },
  ro: { label: 'Reverse osmosis', removal: 90, pH: 'any', loss: 50 },
};
export const SLS = { fe: 0.3, mn: 0.1, f: 1.0 };

export const DEFAULTS = {
  feMnOxidant: 'auto',   // auto | air | cl2 | kmno4
  detention: 20,         // min after oxidation, before filtration – D3 §7.1.5.1: at least 20 min
  feTarget: 0.1, mnTarget: 0.05,
  fMethod: 'auto',       // auto | nalgonda | alumina | bonechar | ro
  fTarget: 0,            // mg/L; 0 = D3 Table 7-3 optimum for the water temperature
  aaRunDays: 7,          // days between regenerations of an activated-alumina / bone-char bed (D3 gives no value)
  aaEBCT: 10,            // min empty-bed contact time (practice value – D3 gives none)
  aaDepth: 1.5,          // m bed depth (practice value – D3 gives none)
};

export function compute(inp, ctx) {
  const d = { ...DEFAULTS, ...inp };
  const calc = new Calc(ctx.crit);
  const q = ctx.res.quality, dem = ctx.res.demand, proc = ctx.res.process;
  const Qd = dem.Qd, Qavg = dem.design.gross * (1 + dem.inputs.ownUse / 100);
  const fe = q.worst('fe') || 0, mn = q.worst('mn') || 0, f = q.worst('f') || 0;
  const pH = q.get ? q.get('pH', 0) : 7;
  const out = { inputs: d, fe, mn, f, annualCost: 0, solidsKgD: 0 };

  // ------------------------------------------------------------ iron & manganese
  const needFe = fe > SLS.fe, needMn = mn > SLS.mn;
  if (needFe || needMn) {
    calc.section('Iron and manganese removal (NWSDB D3 §7.1)');
    const dFe = Math.max(0, fe - d.feTarget), dMn = Math.max(0, mn - d.mnTarget);
    // choice: aeration oxidises Fe at pH 7–8 but Mn only above pH 9.5 (D3 §7.1.5.1) – Mn needs chlorine or permanganate
    let ox = d.feMnOxidant;
    if (ox === 'auto') ox = needMn ? (mn > 1 ? 'kmno4' : 'cl2') : proc.has.aeration ? 'air' : 'cl2';
    const O = OXIDANTS[ox];
    calc.text(`Raw water: Fe ${fe} mg/L (SLS 614: ${SLS.fe}), Mn ${mn} mg/L (SLS 614: ${SLS.mn}). Oxidant: ${O.label}${d.feMnOxidant === 'auto' ? ' (automatic choice)' : ''}. Aeration oxidises uncomplexed iron at pH 7.0–8.0 but manganese only above pH 9.5; chlorine or permanganate is used for manganese (NWSDB D3 §7.1.5.1–7.1.5.2).`);
    const dose = O.fe * dFe + O.mn * dMn;
    calc.step('Stoichiometric oxidant demand', 'D = a_{Fe}\\,\\Delta Fe + a_{Mn}\\,\\Delta Mn', `${n(O.fe)}\\times${n(dFe)} + ${n(O.mn)}\\times${n(dMn)}`, dose, 'mg/L', 'NWSDB D3 Table 7-1');
    let doseAdopt = dose;
    if (ox === 'cl2' && dMn > 0) { doseAdopt = Math.max(dose, O.fe * dFe + 1.3 * mn); calc.step('Chlorine dose for manganese (1.3 × Mn)', 'D_{Cl}', `${n(O.fe * dFe)} + 1.3\\times${n(mn)}`, doseAdopt, 'mg/L', 'NWSDB D3 Table 6-8 – free residual 0.5 mg/L, pH 7–10, contact up to 3 h'); }
    const kgD = (doseAdopt * Qd) / 1000;
    if (ox !== 'air') calc.step('Oxidant feed at design flow', 'W = D\\,Q', `${n(doseAdopt)}\\times${n(Qd, 0)}/1000`, kgD, 'kg/d');
    const V = (Qd / 1440) * d.detention;
    calc.step('Detention after oxidation, before filtration', 'V = Q\\,t', `${n(Qd / 1440)}\\,m^3/min\\times${n(d.detention)}`, V, 'm³', 'NWSDB D3 §7.1.5.1 – at least 20 min (may be provided as depth above the filters)');
    const solids = ((O.sFe * dFe + O.sMn * dMn) * Qd) / 1000;
    calc.step('Solids produced', 'S = (s_{Fe}\\,\\Delta Fe + s_{Mn}\\,\\Delta Mn)\\,Q', `(${n(O.sFe)}\\times${n(dFe)} + ${n(O.sMn)}\\times${n(dMn)})${n(Qd, 0)}/1000`, solids, 'kg/d', 'NWSDB D3 Table 7-1');
    const alkUsed = ox === 'cl2' ? 3.4 * dMn : 0;
    if (alkUsed > 0) calc.step('Alkalinity consumed by manganese oxidation with chlorine', '3.4\\,\\Delta Mn', `3.4\\times${n(dMn)}`, alkUsed, 'mg/L CaCO₃', 'NWSDB D3 Table 6-8');
    calc.flag('Detention time before filtration', d.detention >= 20, `${d.detention} min`, '≥ 20 min', '', 'warn', 'NWSDB D3 §7.1.5.1');
    if (ox === 'air') {
      calc.flag('pH for iron oxidation by aeration', pH >= 7 && pH <= 8.5, `pH ${pH}`, '7.0–8.0', 'Raise the pH with lime ahead of the aerator or use chlorine', 'warn', 'NWSDB D3 §7.1.5.1');
      calc.flag('Manganese not oxidised by aeration alone', !needMn, needMn ? `Mn ${mn} mg/L` : 'Mn within limit', 'needs pH ≥ 9.5', 'Use chlorine or permanganate for manganese', 'fail', 'NWSDB D3 §7.1.5.1');
      calc.flag('Aeration provided in the treatment train', proc.has.aeration, proc.has.aeration ? 'Yes' : 'No', 'required', 'Select a cascade or tray aerator on the Plant configurator', 'fail', 'NWSDB D3 §5.3, §7.1.5.1');
    }
    if (ox === 'kmno4') calc.text('Permanganate is fed as a 1–4 % solution (2 % typical) ahead of the filters; a demand test is required and overdosing gives pink water. A continuous-regeneration manganese greensand filter (anthracite 150–225 mm over greensand 300–450 mm) is recommended where manganese predominates (NWSDB D3 §7.1.5.2, §7.1.5.4, Table 5-11).');
    calc.text('Filter backwash water for iron / manganese removal filters must be chlorine-free where biological removal is relied on; D3 gives no filtration rate for oxidation–filtration plants, so the rapid-filter criteria of §5.9 apply.');
    const cost = ox === 'air' ? 0 : ((doseAdopt * Qavg) / 1000) * 365 * O.price;
    out.annualCost += cost; out.solidsKgD += solids;
    out.feMn = { ox, label: O.label, dFe, dMn, dose: doseAdopt, kgD: ox === 'air' ? 0 : kgD, V, solids, alkUsed, cost };
  }

  // ------------------------------------------------------------ fluoride
  if (f > SLS.f) {
    calc.section('Fluoride removal (NWSDB D3 §7.2)');
    const T = q.T || 28;
    const target = d.fTarget > 0 ? d.fTarget : T >= 26.3 ? 0.7 : 0.8;
    calc.step('Target fluoride for the mean maximum temperature', 'F_t', `T = ${n(T)}^{\\circ}C`, target, 'mg/L', 'NWSDB D3 Table 7-3 – 0.8 mg/L (21.5–26.2 °C), 0.7 mg/L (26.3–32.5 °C); SLS 614: 1.0 mg/L');
    let m = d.fMethod;
    if (m === 'auto') m = Qd > 2000 ? 'alumina' : 'nalgonda';
    const M = DEFLUOR[m];
    const eta = M.removal / 100;
    // only part of the flow need be treated and blended back: x = (F0 − Ft) / (η F0)
    const x = Math.min(1, (f - target) / (eta * f));
    const Qt = x * Qd;
    const dF = eta * f; // removed in the treated stream
    calc.text(`Method: ${M.label}${d.fMethod === 'auto' ? ' (automatic choice)' : ''} – removal about ${M.removal} %, working pH ${M.pH}, water loss about ${M.loss} % (NWSDB D3 Table 7-4). Conventional coagulation–filtration does not remove fluoride; where another source or blending is possible it is normally preferred.`);
    calc.step('Fraction of the flow to treat and blend', 'x = \\frac{F_0 - F_t}{\\eta F_0}', `\\frac{${n(f)} - ${n(target)}}{${n(eta)}\\times${n(f)}}`, x * 100, '%');
    calc.step('Flow through the fluoride-removal stage', 'Q_t = x\\,Q', `${n(x)}\\times${n(Qd, 0)}`, Qt, 'm³/d');
    const res = { method: m, label: M.label, target, x, Qt, dF, loss: M.loss };
    if (m === 'nalgonda') {
      const alum = M.alum * dF, lime = M.lime * dF;
      calc.step('Alum dose', '150\\,\\Delta F', `150\\times${n(dF)}`, alum, 'mg/L', 'NWSDB D3 Table 7-4 – 150 mg alum per mg F');
      calc.step('Lime dose', '7\\,\\Delta F', `7\\times${n(dF)}`, lime, 'mg/L', 'NWSDB D3 Table 7-4 – 7 mg lime per mg F');
      const alumKgD = (alum * Qt) / 1000, limeKgD = (lime * Qt) / 1000;
      calc.step('Alum / lime used', 'W', '', alumKgD, 'kg/d alum', `lime ${limeKgD.toFixed(0)} kg/d`);
      calc.flag('Alum dose practical for a continuous plant', alum <= 300, `${alum.toFixed(0)} mg/L`, '≤ 300 mg/L', 'Very high doses give large sludge volumes and residual aluminium – prefer activated alumina', 'warn', 'NWSDB D3 §7.2');
      const cost = ((alum * RB.alum.v + lime * RB.lime.v) * x * Qavg * 365) / 1000;
      out.solidsKgD += alumKgD * 0.44 + limeKgD;
      Object.assign(res, { alum, lime, alumKgD, limeKgD, cost });
      out.annualCost += cost;
    } else if (m === 'alumina' || m === 'bonechar') {
      const load = dF * Qt; // g F per day
      const Vcap = (load * d.aaRunDays) / M.capacity;
      const Vebct = (Qt / 1440) * d.aaEBCT;
      const Vbed = Math.max(Vcap, Vebct);
      calc.step('Fluoride removed per day', 'M_F = \\Delta F\\,Q_t', `${n(dF)}\\times${n(Qt, 0)}`, load / 1000, 'kg F/d');
      calc.step(`Bed volume for ${d.aaRunDays} days between regenerations`, 'V = \\frac{M_F\\,t}{C}', `\\frac{${n(load, 0)}\\times${n(d.aaRunDays)}}{${n(M.capacity, 0)}}`, Vcap, 'm³', `NWSDB D3 Table 7-4 – capacity ${M.capacity} g F/m³`);
      calc.step(`Bed volume for ${d.aaEBCT} min empty-bed contact`, 'V = Q_t\\,t_c', `${n(Qt / 1440)}\\times${n(d.aaEBCT)}`, Vebct, 'm³', 'practice value – D3 gives no contact time');
      const nB = Math.max(2, Math.ceil(Vbed / (d.aaDepth * 12))) + 1; // duty beds ≤ 12 m² each + one regenerating
      const A1 = Vbed / d.aaDepth / (nB - 1);
      const D1 = ceilTo(Math.sqrt((4 * A1) / Math.PI), 0.1);
      calc.step(`Contactors – ${nB - 1} duty + 1 regenerating`, 'A_1 = \\frac{V}{h\\,(n-1)}', `\\frac{${n(Vbed)}}{${n(d.aaDepth)}\\times${nB - 1}}`, A1, 'm² each', `diameter ${D1} m, bed depth ${d.aaDepth} m`);
      if (m === 'alumina') calc.text('Activated alumina is regenerated with weak caustic soda and neutralised with acid before return to service; alkalinity interferes and the optimum pH is about 5.5 (NWSDB D3 §7.2, Table 7-4). D3 gives no bed-loading or regenerant quantities – confirm with the media supplier and a pilot column.');
      else calc.text('Bone char works above pH 7 and also takes up arsenic (NWSDB D3 Table 7-4); acceptance by consumers should be checked.');
      Object.assign(res, { load, Vbed, nB, A1, D1, depth: d.aaDepth, runDays: d.aaRunDays, cost: 0 });
    } else calc.text('Reverse osmosis removes 85–95 % of fluoride but rejects 40–60 % of the feed as brine (NWSDB D3 Table 7-4); treat the smallest possible side stream and blend.');
    calc.flag('Blended fluoride meets SLS 614', true, `${target} mg/L`, `≤ ${SLS.f} mg/L`, '', 'info', 'SLS 614:2013; NWSDB D3 §7.2');
    out.fluoride = res;
  }
  out.enabled = !!(out.feMn || out.fluoride);
  if (!out.enabled) calc.text(`Iron ${fe} mg/L, manganese ${mn} mg/L and fluoride ${f} mg/L are within SLS 614:2013 (${SLS.fe} / ${SLS.mn} / ${SLS.f} mg/L) – no special treatment stage is required.`);
  return { ...out, ...calc.result() };
}
