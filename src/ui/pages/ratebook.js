// Library → NWSDB Rates 2026 (Rate Book 2025 Rev. 01-2026): how the estimate is built, the rate tables the app uses, and the rates applied in this project
import { BUILDINGS, CHEM, CIVIL, DIESEL, ENG_PCT, LAB_WTP, RB, RB_DATA, TARIFFS, TOU_HOURS, blendedRate, civilRate, graph, locationFactor, pipeCost, REV2026 } from '../../core/ratebook.js';
import { fmt } from '../../core/util.js';
import { h, icon } from '../dom.js';
import { card, chartCard, kpis, table } from '../results.js';
import { navigate, store } from '../store.js';

const f0 = (v) => fmt(v, 0), f2 = (v) => fmt(v, 2);
const mn = (v) => fmt(v / 1e6, 2);
const small = (t, cls = 'muted') => h('span', { class: 'small ' + cls }, t);

/** a text box that filters the rows of a table in place (no re-render, keeps focus) */
function filterBox(tbl, placeholder) {
  const inp = h('input', { type: 'search', placeholder, style: { width: '100%' } });
  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    tbl.querySelectorAll('tbody tr').forEach((tr) => { tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  });
  return h('div', { class: 'inp', style: { marginBottom: '8px' } }, icon('search'), inp);
}

const GRAPH_POINT = (id, r) => {
  const Q = r.demand?.Qd;
  if (id === 'UC/07' || id === 'UC/04' || id === 'UC/06') return Q;
  if (id === 'UC/01') return r.storage?.V;
  if (id === 'UC/05' && r.filt?.type === 'ssf') return r.filt.N * r.filt.Af;
  if (id === 'ELE/01' || id === 'ELE/02') return r.energy?.genKva;
  return null;
};

export const ratebook = {
  id: 'ratebook', title: 'NWSDB Rates 2026', sub: 'Rate Book 2025 revised by circular CQS/22/2026/98 – total cost estimate format, Section A/B rates, M&E graphs, chemicals, CEB tariff and location factors used for pricing', icon: 'banknote', group: 'Library', layout: 'full',
  state: { tab: 'project', pipe: 'di', graph: 'UC/07' },
  renderFull(r) {
    const st = ratebook.state;
    const c = r.cost;
    const district = store.project?.inputs?.setup?.district;
    const factor = locationFactor(district);
    const tabs = [['project', 'Rates in this project', 'checks'], ['estimate', 'Estimate format', 'clipboard'], ['pipes', 'Pipes (Section A)', 'route'], ['valves', 'Valves & chambers', 'gauge'], ['graphs', 'M&E & unit-cost graphs', 'chartLine'], ['civil', 'Civil, buildings & lab', 'factory'], ['chem', 'Chemicals, power & labour', 'flask'], ['location', 'Location factors', 'map']];
    const seg = h('div', { class: 'seg' }, tabs.map(([k, l, ic]) => h('button', { class: st.tab === k ? 'on' : '', onclick: () => { st.tab = k; navigate('ratebook'); } }, icon(ic), l)));
    const body = h('div');
    const tce = c.est.format !== 'd2';

    if (st.tab === 'project') {
      const rr = c.rates;
      const rateRows = [
        ['Reinforced concrete grade 30 (supply & place)', rr.conc, 'm³', 'concrete', 'rConcrete'], ['Blinding concrete grade 15', rr.blind, 'm³', 'blinding', 'rBlinding'], ['Formwork', rr.form, 'm²', 'formwork', 'rFormwork'], ['Reinforcement', rr.steel, 'kg', 'steel', 'rSteel'],
        ['Excavation for structures', rr.exc, 'm³', 'excavation', 'rExcavation'], ['Earthwork support', rr.ews, 'm²', 'ews', 'rEWS'], ['PVC water bar', rr.wb, 'm', 'waterbar', 'rWaterbar'],
        ['Filter sand', rr.sand, 'm³', 'sand', 'rSand'], ['Filter gravel', rr.gravel, 'm³', 'gravel', 'rGravel'], ['Anthracite', rr.anth, 'm³', 'anthracite', 'rAnthracite'], ['Internal roads', rr.road, 'm²', 'road', 'rRoad'], ['Boundary fence', rr.fence, 'm', 'fence', 'rFence'],
      ].map(([item, v, u, key, ovr]) => ({ item, v, u, src: c.inputs[ovr] > 0 ? 'user rate (override)' : `${RB.short} ${CIVIL[key].ref}${CIVIL[key].mk ? ` + ${c.inputs.markup} % markup` : /markup/.test(CIVIL[key].ref) ? '' : ' (markup incl.)'}`, user: c.inputs[ovr] > 0 }));
      const co = r.coag, dis = r.dis;
      const chemRows = [
        co ? { item: `Coagulant – ${co.coag.label.split(' (')[0]}`, v: co.inputs.priceCoag, u: 'kg', src: co.coag.priceRef || '' } : null,
        co ? { item: 'Hydrated lime', v: co.inputs.priceLime, u: 'kg', src: CHEM.lime.ref } : null,
        co ? { item: 'Polyelectrolyte', v: co.inputs.pricePoly, u: 'kg', src: CHEM.polymer.ref } : null,
        dis ? { item: `Disinfectant – ${dis.agent.label}`, v: dis.price, u: 'kg', src: dis.inputs.price > 0 ? 'user price' : dis.key === 'gas' ? (dis.price === CHEM.cl2.v ? CHEM.cl2.ref : CHEM.cl2small.ref) : dis.key === 'bleach' ? CHEM.bleach.ref : 'not in RB 2025 – indicative' } : null,
        r.energy ? { item: `Electricity – CEB ${r.energy.tariff} (TOU blend incl. SSCL)`, v: r.energy.energyRate, u: 'kWh', src: blendedRate(r.energy.tariff).ref } : null,
        r.energy ? { item: 'Diesel (standby generation)', v: r.energy.inputs?.dieselPrice ?? DIESEL.v, u: 'L', src: DIESEL.ref } : null,
      ].filter(Boolean).map((x) => ({ ...x, src: x.src.startsWith('NWSDB') || x.src.startsWith('user') || x.src.startsWith('not') ? x.src : `${RB.short} ${x.src}` }));
      const indic = [...c.civil, ...c.me].filter((x) => /indicative/i.test(x.ref || ''));
      body.append(
        h('div', { class: 'grid2' },
          card('Civil unit rates applied (incl. contractor\'s markup)', table([{ k: 'item', l: 'Item' }, { k: 'v', l: 'Rate (LKR)', num: true, fmt: f0 }, { k: 'u', l: 'per' }, { k: 'src', l: 'Source', v: (x) => small(x.src, x.user ? 'warn-txt' : 'muted') }], rateRows), { flush: true, sub: 'change on Cost estimate → Unit rates (0 = Rate Book)' }),
          card('Chemical & energy prices applied (VAT excl.)', table([{ k: 'item', l: 'Item' }, { k: 'v', l: 'LKR', num: true, fmt: f2 }, { k: 'u', l: 'per' }, { k: 'src', l: 'Source', v: (x) => small(x.src, /indicative|user/.test(x.src) ? 'warn-txt' : 'muted') }], chemRows), { flush: true, sub: 'Tables A-CH/01–02 · Annex 8 · Annex 1' })),
        card('Items not priced in the Rate Book (indicative allowances)', indic.length ? table([{ k: 'item', l: 'Item' }, { k: 'group', l: 'Group' }, { k: 'qty', l: 'Qty', num: true, fmt: (v) => fmt(v, v < 10 ? 2 : 0) }, { k: 'unit', l: 'Unit' }, { k: 'amount', l: 'LKR Mn', num: true, fmt: mn }], indic, { totals: { amount: indic.reduce((a, x) => a + x.amount, 0) } }) : h('div', { class: 'empty' }, 'Every BOQ item is priced from the Rate Book.'), { flush: true, sub: 'replace with supplier quotations before issue – values on Cost estimate → M&E' }),
      );
    } else if (st.tab === 'estimate') {
      const E = RB_DATA.estimate;
      body.append(card(`What changed for 2026 – circular ${RB.circular}`, table([{ k: 0, l: 'Tables' }, { k: 1, l: 'Revision' }], REV2026.map((x) => ({ 0: x[0], 1: x[1] }))), { flush: true, sub: 'Table 1 of the circular · rates not listed are the 2025 rates × the factor shown' }));
      const t2 = Object.entries(E.table2_LC_FC_factors || {}).filter(([k]) => k !== 'columns').map(([k, v]) => ({ k, a: v[0], b: v[1], c: v[2], d: v[3] }));
      const t4 = Object.values(ENG_PCT).map((v) => ({ k: v.label, lt: v.lt100, ge: v.ge100 }));
      body.append(
        h('div', { class: 'grid2' },
          card('How to prepare a total cost estimate ("How to use", with Annex 13 of the 2026 circular)', h('ol', { class: 'small', style: { lineHeight: 1.7, margin: 0, paddingLeft: '18px' } }, E.steps.map((s) => h('li', null, s)), h('li', null, E.preliminaries))),
          card(tce ? 'This project – Table 1 total cost estimate' : 'This project uses the D2 §10.2 format', table([{ k: 'k', l: 'Item' }, { k: 'v', l: 'LKR Mn', num: true, fmt: mn }], c.est.rows.filter(([k, v]) => v || /TOTAL/i.test(k)).map(([k, v]) => ({ k, v, _tot: /SUB TOTAL|TOTAL IMPLEMENTING|Total capital/i.test(k) }))), { flush: true, sub: tce ? `${(c.inputs.procurement || 'ncb').toUpperCase()} · ${ENG_PCT[c.inputs.fundSource]?.label || ''}` : 'switch on Cost estimate → Estimate format' })),
        h('div', { class: 'grid2' },
          card('Table 2 – local / foreign currency factors', table([{ k: 'k', l: 'Item' }, { k: 'a', l: 'NCB LC', num: true }, { k: 'b', l: 'NCB FC', num: true }, { k: 'c', l: 'ICB LC', num: true }, { k: 'd', l: 'ICB FC', num: true }], t2), { flush: true, sub: `escalation beyond 31.12.${RB.baseYear}: LC ${RB.escLC} % p.a., FC ${RB.escFC} % p.a.` }),
          card('Table 4 – investigation, design, procurement & supervision (% of Sub Total 1)', table([{ k: 'k', l: 'Source of funds' }, { k: 'lt', l: '< LKR 100 M', num: true, fmt: (v) => v + ' %' }, { k: 'ge', l: '≥ LKR 100 M', num: true, fmt: (v) => v + ' %' }], t4), { flush: true, sub: `contingency ≤ ${RB.contingencyMax} % of (ST1 + duties) · VAT ${RB.vat} % of ST3 · RWS&S ${RB.rwss} % of ST1` })),
      );
    } else if (st.tab === 'pipes') {
      const kinds = [['di', 'Ductile iron (A-DI/1 + 3)'], ['dina', 'DI non-Asian (A-DI/2 + 3)'], ['pe10', 'HDPE SDR17 PN10 (A-PE/1 + 5)'], ['pe16', 'HDPE SDR11 PN16 (A-PE/3 + 6)'], ['pvc7', 'PVC type 600 / 7 bar (A-PVC/1 + 3)'], ['pvc11', 'PVC type 1000 / 11 bar (A-PVC/2 + 3)']];
      const sel = h('div', { class: 'seg' }, kinds.map(([k, l]) => h('button', { class: st.pipe === k ? 'on' : '', onclick: () => { st.pipe = k; navigate('ratebook'); } }, l)));
      const spec = { di: ['di', 'asian', 10, RB_DATA.di.supplyAsian], dina: ['di', 'nonasian', 10, RB_DATA.di.supplyNonAsian], pe10: ['hdpe', 'asian', 10, RB_DATA.hdpe.pn10.supplyAsian], pe16: ['hdpe', 'asian', 16, RB_DATA.hdpe.pn16.supplyAsian], pvc7: ['upvc147', 'asian', 7, RB_DATA.pvc.pnt7], pvc11: ['upvc147', 'asian', 11, RB_DATA.pvc.pnt11] }[st.pipe];
      const [mat, origin, pn, rows] = spec;
      const opt = { origin, pn, factor, markup: c.inputs.markup, ewsPct: c.inputs.ewsPct, dewPct: c.inputs.dewPct };
      const data = rows.map(([dn]) => { const t = pipeCost(mat, dn, { ...opt, main: 'transmission' }); const d = pipeCost(mat, dn, { ...opt, main: 'distribution' }); return { dn, sup: t.supply, lay: t.laying, tot: t.total, dtot: d.total, cls: mat === 'di' ? RB_DATA.di.cls[String(dn)] || '' : '' }; });
      body.append(h('div', { style: { marginBottom: '10px' } }, sel),
        card('Supply & laying per metre (LKR, VAT excl.)', table([{ k: 'dn', l: 'DN (mm)' }, ...(mat === 'di' ? [{ k: 'cls', l: 'Class' }] : []), { k: 'sup', l: 'Supply – transmission', num: true, fmt: f0 }, { k: 'lay', l: 'Laying incl. excavation, EWS & dewatering allowances', num: true, fmt: f0 }, { k: 'tot', l: 'Total – transmission main', num: true, fmt: f0 }, { k: 'dtot', l: 'Total – distribution main', num: true, fmt: f0 }], data), { flush: true, sub: `laying × location factor ${f2(factor)} (${district || 'district not set'}) × (1 + ${c.inputs.markup} % markup) · earthwork support ${c.inputs.ewsPct} %, dewatering ${c.inputs.dewPct} % of the book values · supply rates include the supplier's markup` }));
    } else if (st.tab === 'valves') {
      const vt = table([{ k: 'table', l: 'Table' }, { k: 'item', l: 'Item' }, { k: 'group', l: 'Valve / meter' }, { k: 'desc', l: 'Size / description' }, { k: 'rate', l: 'Rate (LKR/nr)', num: true, fmt: f0 }], RB_DATA.valves.filter((v) => v.rate > 0));
      const ch = RB_DATA.chambers.flatMap((t) => t.rows.map((row) => ({ table: t.table, title: t.title.replace(/^RATES FOR /i, ''), desc: row.desc, ...Object.fromEntries(Object.values(row.rates_by_depth).map((v, i) => ['d' + i, v])) })));
      const depthCols = Object.keys(RB_DATA.chambers[0].rows[0].rates_by_depth).map((k, i) => ({ k: 'd' + i, l: k.replace('Depth ', ''), num: true, fmt: (v) => (v ? f0(v) : '–') }));
      body.append(card(`Valves (B-V&M/01–02, ${RB_DATA.valves.length} items)`, h('div', null, filterBox(vt, 'Filter – e.g. "butterfly", "PN 25", "300"'), vt), { flush: true, sub: 'supply only, VAT excl.; isolating valves in the BOQ use sluice valves ≤ DN300 and butterfly valves with gear box above' }),
        card('Valve & meter chambers (B-COM/08–14)', table([{ k: 'table', l: 'Table' }, { k: 'title', l: 'Chamber', v: (x) => small(x.title, '') }, { k: 'desc', l: 'Type' }, ...depthCols], ch), { flush: true, sub: "contractor's markup not included – the BOQ adds it" }));
    } else if (st.tab === 'graphs') {
      const ids = Object.keys(RB_DATA.graphs);
      const pick = h('select', { style: { width: '100%' }, onchange: (e) => { st.graph = e.target.value; navigate('ratebook'); } }, ids.map((id) => h('option', { value: id, selected: id === st.graph }, `${id} – ${RB_DATA.graphs[id].title}`)));
      const g = RB_DATA.graphs[st.graph] || RB_DATA.graphs['UC/07'];
      const xu = g.x.unit, yu = g.y.unit;
      const xp = GRAPH_POINT(st.graph, r);
      const sameAxis = !/^UC\/0[46]$/.test(st.graph);
      const groups = sameAxis ? [g.series] : g.series.map((s) => [s]);
      const charts = groups.map((ss) => {
        const xs = [...new Set(ss.flatMap((s) => s.pts.map((p) => p[0])))].sort((a, b) => a - b);
        const data = xs.map((x) => Object.fromEntries([['x', x], ...ss.map((s, i) => [`s${i}`, s.pts.find((p) => p[0] === x)?.[1]])]));
        const unitY = ss[0].name === 'Cost per bed area' ? 'LKR/m² of bed' : yu;
        const mk = xp > 0 ? (() => { const v = graph(st.graph, xp, g.series.indexOf(ss[0])); return Number.isFinite(v.value) ? [{ x: xp, y: v.value, label: `This project: ${f0(xp)} ${xu} → ${f0(v.value)}${v.extrap ? ' (extrapolated)' : ''}`, color: 'var(--series-2)', anchor: xp > xs[xs.length - 1] * 0.6 ? 'end' : 'start', dx: xp > xs[xs.length - 1] * 0.6 ? -8 : 8 }] : []; })() : [];
        return chartCard(`${st.graph} – ${ss.length === 1 && g.series.length > 1 ? ss[0].name : g.title}`, { type: 'line', data, x: { key: 'x', label: `${g.x.label} (${xu})` }, y: { label: unitY, min: 0 }, series: ss.map((s, i) => ({ key: `s${i}`, label: s.name, marker: true })), markers: mk, unit: unitY, height: 300 }, { sub: `digitised from ${RB.short} (${g.file === 'part1' ? 'Vol I' : 'Vol II'} p ${g.page})`, tableData: data });
      });
      body.append(h('div', { class: 'card', style: { padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center' } }, h('b', null, 'Graph'), h('div', { class: 'inp', style: { flex: 1 } }, pick)), ...charts,
        card('Notes printed on the graph', h('ul', { class: 'small', style: { lineHeight: 1.7, margin: 0, paddingLeft: '18px' } }, (g.notes || []).map((t) => h('li', null, t)))));
    } else if (st.tab === 'civil') {
      const civ = Object.entries(CIVIL).map(([k, v]) => ({ k: v.ref, u: v.unit, v: v.v, mk: v.mk ? `+${c.inputs.markup} %` : 'incl.', with: civilRate(k, c.inputs.markup) }));
      const bld = Object.values(BUILDINGS).map((v) => ({ k: v.ref, v: v.v }));
      const misA = (RB_DATA.misA.items || []).map((x) => ({ k: `${x.item} ${x.desc}`, ctx: x.context, u: x.unit, v: x.rates?.rate }));
      const fm = (RB_DATA.filterMedia.items || []).map((x) => ({ k: `${x.context} – ${x.desc}`, u: x.unit, v: x.rates?.rate }));
      const lab = (RB_DATA.lab.wtp_core_items || []).map((x) => ({ k: x.desc, v: x.rate }));
      const mt = table([{ k: 'ctx', l: 'Section' }, { k: 'k', l: 'Item' }, { k: 'u', l: 'Unit' }, { k: 'v', l: 'Rate (LKR)', num: true, fmt: f0 }], misA);
      body.append(
        h('div', { class: 'grid2' },
          card('Civil works for water-retaining structures (Section B)', table([{ k: 'k', l: 'Item', v: (x) => small(x.k, '') }, { k: 'u', l: 'Unit' }, { k: 'v', l: 'Book rate', num: true, fmt: f0 }, { k: 'mk', l: 'Markup' }, { k: 'with', l: 'Rate used', num: true, fmt: f0 }], civ), { flush: true }),
          card('Buildings – Table A-MIS/01 (per m² floor area, markup incl.)', table([{ k: 'k', l: 'Building' }, { k: 'v', l: 'LKR/m²', num: true, fmt: f0 }], bld), { flush: true })),
        h('div', { class: 'grid2' },
          card('Filter media – Table B-FM/01 (supply to site, markup incl.)', table([{ k: 'k', l: 'Item' }, { k: 'u', l: 'Unit' }, { k: 'v', l: 'LKR', num: true, fmt: f0 }], fm), { flush: true, sub: 'handling, placing & wastage not included' }),
          card(`Laboratory – B-LAB/01 core WTP set (${mn(LAB_WTP.v)} Mn)`, table([{ k: 'k', l: 'Instrument' }, { k: 'v', l: 'LKR', num: true, fmt: f0 }], lab, { totals: { v: LAB_WTP.v } }), { flush: true })),
        card('Table A-MIS/01 – miscellaneous works for total cost estimates', h('div', null, filterBox(mt, 'Filter – e.g. "fence", "road", "quarters"'), mt), { flush: true, sub: "contractor's markup included, VAT excluded" }));
    } else if (st.tab === 'chem') {
      const ch = RB_DATA.chemicals.map((x) => ({ t: x.table, k: x.name, u: x.unit, v: x.rate, kg: x.derived_rate_LKR_per_kg }));
      const tar = Object.entries(TARIFFS).map(([k, t]) => ({ k, l: t.label, day: t.day, peak: t.peak, off: t.off, dem: t.demand, fix: t.fixed, bl: blendedRate(k).rate }));
      const lab = RB_DATA.labour.map((x) => ({ k: x.trade, u: x.unit, v: x.rate }));
      const lt = table([{ k: 'k', l: 'Trade' }, { k: 'u', l: 'Unit' }, { k: 'v', l: 'LKR', num: true, fmt: f0 }], lab);
      body.append(
        h('div', { class: 'grid2' },
          card('Chemicals – Tables A-CH/01 & A-CH/02 (supply, VAT excl.)', h('div', null, table([{ k: 't', l: 'Table', v: (x) => h('span', { style: { whiteSpace: 'nowrap' } }, x.t) }, { k: 'k', l: 'Chemical' }, { k: 'u', l: 'Unit' }, { k: 'v', l: 'Rate', num: true, fmt: f0 }, { k: 'kg', l: 'LKR/kg', num: true, fmt: f2 }], ch), h('div', { class: 'small muted', style: { padding: '8px 12px' } }, 'Not in the Rate Book (the app uses indicative prices): ', RB_DATA.chemNotIn.join('; '), '.')), { flush: true }),
          card('Annex 2 – labour rates', h('div', null, filterBox(lt, 'Filter trades'), lt), { flush: true })),
        card('Annex 8 – CEB electricity tariff (effective 12.06.2025; not revised by the 2026 circular)', table([{ k: 'k', l: 'Code' }, { k: 'l', l: 'Category' }, { k: 'day', l: 'Day', num: true }, { k: 'peak', l: 'Peak', num: true }, { k: 'off', l: 'Off-peak', num: true }, { k: 'dem', l: 'Demand LKR/kVA', num: true, fmt: f0 }, { k: 'fix', l: 'Fixed LKR/month', num: true, fmt: f0 }, { k: 'bl', l: '24 h blend incl. SSCL', num: true, fmt: f2 }], tar), { flush: true, sub: `TOU: day ${TOU_HOURS.day} h (05:30–18:30), peak ${TOU_HOURS.peak} h (18:30–22:30), off-peak ${TOU_HOURS.off} h · SSCL ${RB.sscl} % · the Rate Book does not state the NWSDB category – confirm with CEB` }));
    } else if (st.tab === 'location') {
      const rows = RB_DATA.location.map(([d, f]) => ({ d, f, on: String(d).toLowerCase().replace(/[^a-z]/g, '') === String(district || '').toLowerCase().replace(/[^a-z]/g, '') }));
      body.append(h('div', { class: 'grid2' },
        card('Table B-COM/02 – location factors for pipe laying & civil works', table([{ k: 'd', l: 'District', v: (x) => (x.on ? h('b', null, x.d, ' ← this project') : x.d) }, { k: 'f', l: 'Factor', num: true, fmt: f2 }], rows), { flush: true }),
        card('Special locations', table([{ k: 'location', l: 'Location' }, { k: 'factor', l: 'Additional factor', num: true, fmt: f2 }, { k: 'note', l: 'Note', v: (x) => small(x.note) }], RB_DATA.locationExtra), { flush: true })));
    }
    return [
      kpis([
        { label: tce ? 'Total implementing cost' : 'Total capital cost', value: fmt(c.capex / 1e6, 0), unit: 'LKR Mn', sub: c.method === 'composite' ? 'composite rates (Section A) first' : 'quantity BOQ (Section B)', icon: 'wallet', accent: true },
        { label: 'Location factor', value: f2(factor), sub: `${district || 'district not set'} · Table B-COM/02` },
        { label: "Contractor's markup", value: c.inputs.markup, unit: '%', sub: 'added where the rate excludes it' },
        { label: 'Electricity', value: f2(r.energy?.energyRate), unit: 'LKR/kWh', sub: `CEB ${r.energy?.tariff || ''} · Annex 8` },
        { label: 'Indicative items', value: fmt(c.indicativePct, 0), unit: '% of BOQ', sub: 'not priced in the Rate Book', status: c.indicativePct > 20 ? 'warn' : 'ok' },
      ]),
      h('div', { class: 'small muted', style: { margin: '-4px 0 10px' } }, RB.title, ' – replaced tables at 2026 prices, other sections = 2025 rates × the circular\'s adjustment factors; VAT excluded unless stated; Section A composite rates and graphs, Section B unit rates.'),
      h('div', { style: { margin: '4px 0 12px' } }, seg),
      body,
    ];
  },
};
