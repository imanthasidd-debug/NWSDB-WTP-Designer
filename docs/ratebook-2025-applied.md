# NWSDB Rate Book 2025 – how WTP Designer v1.4 uses it

Source: *NWSDB Rates 2025*, Quantity Surveying Section, Planning & Designs Division, Vols I & II. Rates are at 31.12.2025 and exclude VAT unless stated.

## Estimate format (How to use, Table 1) – default
| Step | Rule applied |
|---|---|
| Contractual items | Section A composite rates and graphs first; Section B unit rates where no composite rate exists (item 1) |
| Contractor's markup | 27 % added only where the book excludes it (item 2) |
| Price escalation | Beyond 31.12.2025: LC 5 % p.a., FC 3 % p.a., using the Table 2 NCB/ICB LC–FC factors, to mid-implementation (item 7) |
| Preliminaries | 4 % of Sub Total 1 above LKR 500 M, otherwise 5 % |
| (i) Investigation, design & supervision | Table 4, by source of funds (GOSL ≥ LKR 100 M: 18 %; < 100 M: 20 %; BOI 7 %; Gov. concession 5 %; Gov. 11/12 %) |
| (ii) Road reinstatement & power supply | Provisional sum + CEB bulk supply (11 kV: 8,590 LKR/kVA + 2,000,510 per MVA; 33 kV: 8,800 + 2,322,480) |
| (iii) Land | Perches from the site layout × LKR/perch |
| (iv) RWS&S / water resources | 5 % of Sub Total 1 (item 11) |
| Provisional sums, (v) duties | Vehicles, training; duties and fiscal levies if not in the rates |
| Physical contingency | ≤ 10 % of (Sub Total 1 + duties) |
| VAT | 18 % of Sub Total 3 (Annex 14) |

The D2 §10.2 (1989) format can still be selected on the Cost estimate page.

## Composite estimate (default) vs Engineer's BOQ
* **Treatment plant**: Graph A-UC/07 (LKR per m³/d; covers process units, the pump house and reservoir within the site, sludge treatment, site works, automation and M&E; markup and duties included, VAT excluded). Slow sand schemes use A-UC/05 + A-UC/03 + A-UC/01 plus the BOQ for the rest.
* **Priced item by item outside UC/07**: intake, raw- and treated-water mains, raw-water flow meter, administration, workshop, guard house, quarters, and laboratory.
* **Engineer's estimate**: a full quantity BOQ priced with Section B rates, where every line cites its table or graph. The page also shows a cross-check against Graphs A-UC/01, 03, 04 and 07.
* Sample 42 MLD plant: UC/07 gives 121,040 LKR per m³/d. The total implementing cost is LKR 10.84 bn including VAT. The quantity BOQ of the main structures is about 29 % of the UC/07 value, because the graphs reflect full NWSDB tender prices.

## Rates used
| Item | Rate Book source |
|---|---|
| DI / HDPE / PVC pipe supply | A-DI/1–2, A-PE/1–4 (local B-PE/1B, 3B), A-PVC/1–2. Steel/AC/CI use DI rates; PVC > 225 mm uses HDPE |
| Pipe laying | A-DI/3, A-PE/5–6, A-PVC/3 (+ earthwork support and dewatering allowances) × B-COM/02 location factor × 1.27 |
| Valves, chambers | B-V&M/02 (sluice ≤ DN300, butterfly with gear box above, NRV, double-orifice air valves), B-COM/08–14 |
| Pumps, starters, panels, generator | Graphs A-M/05–M/10, B-ELE/01–16 (spares % on supply) |
| Flow meters, blowers, surge vessels, chlorinators, MOVs | Graphs A-A/01, A-M/14–M/18, A-M/11–M/13 |
| Concrete, formwork, steel, excavation, earthwork support, water bar | B-WRS/01–04 (+27 %) |
| Filter sand / gravel / anthracite | B-FM/01: 24,000 / 30,000 LKR/m³ and 475 LKR/kg |
| Buildings | A-MIS/01 per m² (pump house, chemical house, chlorinator house, office, quarters) |
| Fence, gate, roads | B-MIS/02, B-RD/01 |
| Laboratory | B-LAB/01 core WTP set (LKR 23.9 M) |
| Chemicals | A-CH/01–02: alum 93.08, PACl 122.75, hydrated lime 72, bleaching powder 153.3, Cl₂ 225 (900 kg) / 544 (68 kg), PAC 980, cationic polymer 2,000 LKR/kg |
| Electricity | Annex 8 CEB tariff 12.06.2025, TOU 13/4/7 h, demand and fixed charges, plus 2.5 % SSCL. Default category is I-3 (11 kV) or I-2 |
| Diesel | Annex 1: 289 LKR/L |

## Not in the Rate Book (flagged "indicative")
Scrapers, filter valve and control sets, chemical dosing skids, screens, flocculator drives, thickener and dewatering mechanisms, tube settlers, ferric chloride, soda ash, NaOCl and HTH. In the sample these are about 15 % of the BOQ. Replace them with quotations.

## Points to confirm
* **CEB category.** The Rate Book does not state which CEB category NWSDB plants fall into. Industrial I-2/I-3, General Purpose and Government (GV = GP) can all be selected on Power & energy.
* **Older projects.** Projects from v1.3 or earlier have their old indicative prices replaced with Rate Book values when opened. User overrides entered afterwards are kept.
