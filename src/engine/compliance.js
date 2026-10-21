// Predicted treated-water quality vs SLS 614:2013, turbidity through the train, multi-barrier log credits
import { Calc } from '../core/calc.js';
import { PARAMS, exceeds } from '../core/standards.js';
import { TURBIDITY_TARGETS } from '../core/d3.js';

const REMOVAL = { as: 0.5, pb: 0.7, cd: 0.3, cr: 0.3, hg: 0.3, cu: 0.5, zn: 0.3, ni: 0.2, cod: 0.6, po4: 0.8, toc: 0.4, cn: 0.2, se: 0.1, albnh3: 0.5, mbas: 0.3, oil: 0.7, phenol: 0.3, mclr: 0.6 };

export function compute(inp, ctx) {
  const calc = new Calc(ctx.crit);
  const r = ctx.res;
  const q = r.quality;
  const proc = r.process;
  const co = r.coag, fi = r.filt, st = r.stab, dis = r.dis, sed = r.sed, ae = r.aeration;
  const pred = {};
  const coagOn = !!co && proc.has.coag;
  for (const p of PARAMS) {
    const raw = q.worst(p.key);
    let v = raw;
    let how = 'Not removed by conventional treatment';
    switch (p.key) {
      case 'turb': v = fi.filteredPeak; how = 'Coagulation → sedimentation → filtration'; break;
      case 'colour': v = Math.max(2, raw * (proc.conv ? 0.1 : proc.direct ? 0.2 : 0.35)); how = 'Coagulation removes colour (NOM)'; break;
      case 'pH': v = st.pHfinal; how = 'Post-lime stabilisation'; break;
      case 'tds': v = st.TDSf; how = 'Increases with alum, lime and chlorine'; break;
      case 'alk': v = st.final.alkF; how = 'Consumed by coagulant, restored by lime'; break;
      case 'hard': v = raw + (co?.need && co.inputs.phAdjust === 'lime' ? co.need : 0) + (st.lime * 1.35 * st.inputs.limePurity / 100); how = 'Lime adds calcium hardness'; break;
      case 'ca': v = st.final.caF / 2.497; how = 'Lime adds calcium'; break;
      case 'fe': v = Math.max(0.02, raw * (coagOn || (ae && proc.has.aeration) ? 0.08 : 0.5)); how = proc.has.aeration ? 'Aeration + filtration' : 'Coagulation + filtration'; break;
      case 'mn': v = Math.max(0.005, raw * (proc.prechlor === 'yes' ? 0.2 : proc.has.aeration ? 0.5 : 0.6)); how = proc.prechlor === 'yes' ? 'Pre-oxidation + filtration' : 'Limited removal without pre-oxidation'; break;
      case 'nh3': v = dis?.cd.bp > 0 ? 0.01 : raw * 0.8; how = dis?.cd.bp > 0 ? 'Breakpoint chlorination' : 'Not removed (chloramines form)'; break;
      case 'al': v = coagOn && co.coag.metal === 'Al' ? co.al + 0.03 : raw * 0.3; how = coagOn && co.coag.metal === 'Al' ? 'Residual Al at coagulation pH + carry-over' : 'Coagulation'; break;
      case 'so4': v = raw + (coagOn && co.inputs.coagulant === 'alum' ? 0.485 * co.Ddes : 0); how = 'Alum adds sulphate'; break;
      case 'cl': v = raw + (dis ? 0.5 * dis.totDose : 0) + (coagOn && co.inputs.coagulant === 'fecl3' ? 0.66 * co.Ddes : 0); how = 'Chlorine adds chloride'; break;
      case 'na': v = raw + (co?.sodaDose ? 0.43 * co.sodaDose : 0); how = 'Soda ash adds sodium'; break;
      case 'tc': v = dis && dis.ratio >= 1 ? 0 : raw * 1e-4; how = 'Filtration + CT disinfection'; break;
      case 'ec_': v = dis && dis.ratio >= 1 ? 0 : raw * 1e-4; how = 'Filtration + CT disinfection'; break;
      case 'do': v = Math.max(raw, ae && proc.has.aeration ? ae.Ce : raw); how = 'Aeration'; break;
      case 'co2': v = ae && proc.has.aeration ? ae.co2e : raw; how = 'Aeration / lime'; break;
      case 'tss': v = fi.filteredPeak * 1.2; how = 'Filtration'; break;
      default:
        if (REMOVAL[p.key] !== undefined && coagOn) { v = raw * (1 - REMOVAL[p.key]); how = 'Partial removal by coagulation/filtration'; }
        else if (proc.ssf && ['cod', 'toc', 'po4'].includes(p.key)) { v = raw * 0.6; how = 'Biological removal in the schmutzdecke'; }
    }
    pred[p.key] = { v, how, raw, exc: exceeds(p, v) };
  }
  const rows = PARAMS.filter((p) => p.type !== 'info').map((p) => ({ ...p, ...pred[p.key] }));
  // free residual chlorine (SLS 614: 1 mg/L)
  rows.push({ key: 'frc', name: 'Free residual chlorine', unit: 'mg/L', sls: 1, type: 'max', v: dis.C, raw: 0, how: 'Post-chlorination', exc: dis.C > 1 + 1e-9, group: 'chem', dec: 2 });
  const feMn = pred.fe.v + pred.mn.v;
  rows.push({ key: 'femn', name: 'Iron + manganese (combined)', unit: 'mg/L', sls: 0.3, type: 'max', v: feMn, raw: pred.fe.raw + pred.mn.raw, how: 'SLS 614 footnote', exc: feMn > 0.3, group: 'chem', dec: 3 });
  const fails = rows.filter((x) => x.exc);
  for (const f of fails) calc.note('fail', `Predicted ${f.name} ${f.v.toFixed(f.dec ?? 2)} ${f.unit} does not meet SLS 614 (${f.type === 'range' ? f.sls.join('–') : '≤ ' + f.sls}).`);
  calc.flag('Predicted treated water meets SLS 614:2013', !fails.length, `${rows.length - fails.length}/${rows.length} parameters`, 'all parameters (D3 Table 2-4)', fails.map((f) => f.name).join(', '), 'fail', 'NWSDB D3 §2.3.1 Table 2-4');
  const tAvg = r.filt?.filteredAvg ?? NaN;
  calc.flag('Filtered water vs NWSDB design target', tAvg <= TURBIDITY_TARGETS.designFiltered + 1e-9, `${Number.isFinite(tAvg) ? tAvg.toFixed(2) : '–'} NTU (average)`, '≤ 0.2 NTU (full treatment target < 0.1 NTU)', '', 'info', 'NWSDB D3 §2.3.1, §6.2.4');
  // turbidity through train
  const train = [{ stage: 'Raw water', avg: q.turbAvg, peak: q.turbMax }];
  if (sed?.enabled) train.push({ stage: 'Settled', avg: sed.settledAvg, peak: sed.settledPeak });
  train.push({ stage: 'Filtered', avg: fi.filteredAvg, peak: fi.filteredPeak });
  // log credits
  const credit = dis.credit;
  const crypto = proc.conv ? 3.0 : proc.direct ? 2.5 : 2.0;
  const logs = [
    { org: 'Giardia', physical: credit.g, disinf: Math.min(dis.logG, 6), req: dis.inputs.giardiaReq },
    { org: 'Viruses', physical: credit.v, disinf: Math.min(dis.logV, 6), req: dis.inputs.virusReq },
    { org: 'Cryptosporidium', physical: crypto, disinf: 0, req: 2 },
  ];
  for (const l of logs) { l.total = l.physical + l.disinf; l.ok = l.total >= l.req; }
  const lg = logs.filter((l) => l.org !== 'Cryptosporidium');
  calc.flag('Multi-barrier log removal (Giardia 3-log, virus 4-log)', lg.every((l) => l.ok), lg.map((l) => `${l.org} ${l.total.toFixed(1)}`).join(' · '), '≥ 3 / ≥ 4 log', 'Physical removal credits + CT inactivation', 'fail', 'NWSDB D3 §6.2.4, Table 6-7');
  const passCount = rows.filter((x) => x.exc === false).length;
  return { rows, pred, fails, passCount, total: rows.length, train, logs, ...calc.result() };
}
