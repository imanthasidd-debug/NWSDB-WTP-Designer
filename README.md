# NWSDB WTP Designer

Desktop design suite for **conventional water treatment plants** of the National Water Supply & Drainage Board (Sri Lanka).
It takes a scheme from population forecast to a costed, drawn and checked plant: source & hydrology → intake →
aeration → chemical dosing → rapid mixing → flocculation → sedimentation → filtration → disinfection → stabilisation →
storage & pumping → residuals → hydraulic profile → site layout → power → cost → SLS 614 compliance → design report.

*For the National Water Supply & Drainage Board, Sri Lanka.*

**Version 1.4 – priced from the NWSDB Rate Book 2025**
* **Total cost estimate in the Rate Book format** (How to use; Table 1): contractual items → price escalation beyond
  31.12.2025 (LC 5 %, FC 3 % p.a. with the Table 2 NCB/ICB factors) → preliminaries (4 % above LKR 500 M, else 5 %) →
  Sub Total 1 → (i) investigation, design & supervision by Table 4 and source of funds → (ii) road reinstatement and CEB
  bulk-supply cost → (iii) land → (iv) 5 % RWS&S → vehicles / training → (v) duties → Sub Total 2 → physical contingency
  (≤ 10 %) → Sub Total 3 → VAT 18 %. The D2 §10.2 (1989) format remains selectable.
* **Section A composite rates first** (How to use, item 1): the treatment plant is priced from Graph A-UC/07 (slow-sand
  schemes from A-UC/05, A-UC/03, A-UC/01); intake, raw- and treated-water mains, buildings and the laboratory are
  priced item by item. The quantity BOQ priced with Section B unit rates is kept as the **Engineer's estimate**, with a
  cross-check against the unit-cost graphs.
* **Every BOQ line cites its Rate Book table or graph**: DI / HDPE / PVC pipe supply and laying (A-DI, A-PE, A-PVC) ×
  the B-COM/02 district location factor, valves (B-V&M/02) and chambers (B-COM/08–14), pump sets, starters, panels,
  generators, flow meters, blowers, surge vessels, chlorinators and MOVs from the M&E graphs, water-retaining-structure
  rates (B-WRS), filter media (B-FM/01), buildings (A-MIS/01), fence, gate and roads, laboratory (B-LAB/01). The 27 %
  contractor's markup is added only where the book excludes it. Items the book does not cover are flagged *indicative*.
* **Chemicals and energy**: coagulants, lime, polymer, PAC, chlorine (900 kg and 68 kg cylinders) and bleaching powder at
  the Table A-CH/01–02 prices; electricity at the Annex 8 CEB tariff (12.06.2025) with time-of-use blend, demand and
  fixed charges and the 2.5 % SSCL; diesel at the Annex 1 price. The pumping-main economic diameter uses the same rates.
* **Library → NWSDB Rate Book 2025**: rates applied in the project, the estimate format and Tables 2 & 4, pipe tables,
  valves & chambers, the digitised M&E and unit-cost graphs (with the project's operating point), civil, buildings,
  laboratory, chemicals, CEB tariff, labour and location factors. Excel adds *Cost estimate* and *Composite items*
  sheets and a Rate Book reference column in the BOQ.
* Projects saved with v1.3 or earlier open with their old indicative prices replaced by the Rate Book values.

**Version 1.3 – a connected, easier plant designer**
* **Dashboard** rebuilt around the NWSDB logo: design capacity and design-basis switch, compliance rings (design checks,
  SLS 614, NWSDB D2, NWSDB D3), a 7-step design workflow with live status, the animated plant, items needing attention
  (each with *Locate*), the impact of the last change, key figures and unit status.
* **Specified capacity** – design for a pre-determined capacity (e.g. a 25,000 m³/d plant) instead of a demand forecast:
  throughput or treated-water output; peak flows for pumping and storage are back-calculated with the D2 factors.
* **Plant configurator** (replaces the process-selection drop-downs) – one row of illustrated, animated cards per
  decision (route, pre-sedimentation, aeration, pre-chlorination, PAC, rapid mixer, flocculator, clarifier, filter,
  disinfectant, post-lime, sludge, wash-water recovery). The NWSDB D3 / expert recommendation is badged green, options
  outside D3 guidance for the raw water are badged amber with the reason, and the live process flow diagram updates instantly.
* **Advanced animated process flow diagram** – pictorial sections of every unit with moving impellers, paddles,
  scrapers, settling particles, filtration and backwash, reservoir levels; water coloured by its turbidity; chemical
  dosing stations; numbered process streams with a stream table; sludge, wash-water and recovered-water lines; status badges.
* **Connected design** – every unit page shows what it *receives from* the unit upstream and *hands over* to the next
  (flow, water level, turbidity, pH, chemicals added, solids removed) and which units it uses / feeds.
* **Impact of every change** – after an edit, a panel lists the knock-on effects on every downstream unit (sizes,
  levels, turbidity, run lengths, energy, cost, failing / review checks) with *Undo*. The **Design chain & impact**
  page shows the water path, turbidity / level / pH / alkalinity profiles through the train, a flow & quality balance,
  a dependency matrix and a **what-if explorer** (try a value, see the ripple, then apply it).
* **Locate any error** – failing / review inputs are outlined in red / amber with the check, criterion and a fix hint
  right under the field; *Locate* buttons on every check (page banner, Checks tab, Design checks, D2/D3 registers,
  Dashboard) open the page, scroll to the controlling input and flash it.
* **NWSDB-style drawings** – concrete drawn in the D3 annex convention (red outline, cross-hatched), D3-style captions,
  black dimensions and level symbols; every drawing can be shown and exported as an **A3 landscape sheet** at a true
  standard scale with the NWSDB title block (logo, project, drawing title, drawing number NWSDB/<code>/D-nn, scale,
  sheet, revision, designed / drawn / checked / approved), notes, legend, graphic scale and north arrow. Exports: PDF,
  DXF (same title block, layers per element), SVG and 300-dpi PNG; **Drawing pack (A3 PDF)** and a DXF + SVG ZIP with a
  drawing register. The design report numbers its figures and lists the drawing register.

**Version 1.2 incorporates NWSDB Design Manual D3 – Water Quality & Treatment Manual (Revision 01, November 2020)**
for all treatment-process design: SLS 614 (Table 2-4) and SLS 722 raw-water limits (Table 2-6), process selection by
Table 4-5 and the Fig 4-3/4-4 treatment trains (with at least two independent trains), screen channels (Annex A),
cascade/tray aerators (Annex B), coagulant & PAC feeding (§5.2, §6.1), rapid mixing and flocculators (Tables 5-13,
5-15, 5-16), surface-overflow rates (Table 5-20) and tube settlers, rapid sand filters (N = 1.2√Q, rate with one filter
out and one washing, gravel grading rules, backwash, troughs, net production), slow sand filters (Tables 5-35, 5-36),
Method 02 sludge balance and thickeners (Table 5-44, Annex H), CT Tables 6-2/6-4/6-5/6-7, residual-chlorine rules,
bleaching-powder and gas chlorination, stability indices (LSI, RSI, CCPP), plant layout & laboratory (Ch 9) and the
Annex I water properties. Every D3-based check cites its clause in **Library → NWSDB Design Manual D3** (with project
compliance, clause index, design tables and an errata list of printed inconsistencies), a report chapter and an Excel
sheet; eight D3 calculators were added to the toolbox. Projects saved with earlier versions open and are re-checked.

**Version 1.1 incorporated NWSDB Design Manual D2 – Urban Water Supply and Distribution (March 1989)** clause by
clause: design periods, community demand table, non-domestic unit demands, unaccounted-for water, peaking factors,
river-basin data (Table 4.1), BS 3680 weirs & flumes, rational formula and Rippl reservoir yield, intake and screen
rules, NPSH under storm conditions, stand-by pumps, pump efficiencies, pipe classes and design C values, least-cost
pumping-main diameter, air valves / washouts / thrust blocks, service-reservoir sizing, flotation, site planning and
the D2 cost-estimate format with present value and equivalent annual cost. Every D2-based check cites its clause and
is listed in **Library → NWSDB Design Manual D2** and in a dedicated report chapter and Excel sheet.

## Install on Windows 10 / 11

1. Extract `NWSDB-WTP-Designer-1.4.0-win-x64.zip` (right-click → *Extract all*).
2. Double-click **Install.cmd**. The app is installed for the current user (no administrator rights), with Start-menu and
   desktop shortcuts and the `.wtpd` project-file association. Uninstall from *Settings → Apps*.
3. Or run it without installing: open the `NWSDB WTP Designer` folder and double-click `NWSDB WTP Designer.exe`.

The executable is not code-signed, so Windows SmartScreen may show *“Windows protected your PC”* the first time —
choose **More info → Run anyway**, or ask ICT to sign/whitelist it (see *Building a signed installer* below).

## Using the application

| Area | What you do |
|---|---|
| Project setup | Name, district (sets water temperature, monsoon pattern and regional alerts), source type, site level, design team |
| Dashboard | Design basis switch (forecast / specified capacity), compliance rings, 7-step workflow, animated plant, items to fix (Locate), impact of the last change |
| Design chain & impact | Water path through the plant, profiles, flow & quality balance, dependency matrix, what-if explorer |
| Demand forecast | Census-based projection; D2 §3 per-capita (house connections / standposts), non-domestic unit demands, UFW, peaking → adopted capacity — or a specified capacity (e.g. 25,000 m³/d) |
| Raw water quality | Laboratory results vs SLS 614:2013 and the SLS 722:1985 raw-water limits (D3 Tables 2-4, 2-6); monthly (monsoon) turbidity profile |
| Source & hydrology | D2 §4: river-basin data (103 basins), dry-weather availability, reservoir mass diagram (Rippl), sediment, evaporation, flood estimate |
| Plant configurator | Click one illustrated card per decision; D3 / expert recommendation and suitability on every option; live animated PFD; decision log, D3 Table 4-5 |
| Treatment units | Each page: inputs on the left (live criteria hints, failing checks under the field), connection strip (receives / hands over), results / charts / checks / calculation sheet / drawings (model or A3 sheet) on the right |
| Plant-wide | Storage & pumping (mass curve, pump curves, surge), residuals, hydraulic profile, draggable site layout, power (CEB Annex 8 tariff), NWSDB Rate Book 2025 total cost estimate & BOQ |
| Outputs | SLS 614 compliance & log credits, design-check register (Locate), PDF report, Excel workbook, NWSDB A3 drawing pack (PDF / DXF / SVG) |
| Library | NWSDB Design Manuals D2 and D3 (clause index, project compliance, design tables, errata), NWSDB Rate Book 2025 (rates, graphs, estimate format), editable design-criteria library, engineering toolbox, help, settings |

Shortcuts: `Ctrl+N` new · `Ctrl+O` open · `Ctrl+S` save · `Ctrl+Z/Y` undo/redo · `Ctrl+P` report · `Ctrl+E` Excel · `Ctrl+1…9` pages.

Three sample projects are available from **File → Sample projects** (and as `.wtpd` files in the `Samples` folder):
a 42 MLD wet-zone river plant (Gampaha), a 12.5 MLD dry-zone reservoir plant (Anuradhapura) and a 2.3 MLD
slow-sand rural scheme (Badulla). Projects saved with versions 1.0/1.1 open unchanged and are re-checked against D2 and D3.

## Engineering basis

Demand, source, intake, pumping, mains, service reservoirs, site planning and cost estimating follow **NWSDB Design
Manual D2 (1989)**. Water quality, process selection and treatment-unit design follow **NWSDB Design Manual D3 (2020)**,
supplemented where D3 is silent by the lecture notes (Dr B. Gunawardana, 2020), AWWA/ASCE *Water Treatment Plant
Design*, Kawamura, MWH, USEPA SWTR, Ten States Standards and IRC/WHO. Where D3 is internally inconsistent the
interpretation used is listed under Library → D3 → Errata. Every check cites its source in the **Design criteria** page, where all ranges can be edited
and are saved with the project. Capital costs, chemical prices and the CEB tariff are taken from the **NWSDB Rate Book 2025**
(Quantity Surveying Section, Planning & Designs Division; rates at 31.12.2025, VAT excluded); items the book does not
cover are indicative allowances to be replaced by quotations, and the CEB tariff category of the plant (the book does
not state it) should be confirmed with CEB. Predicted water quality is a screening estimate; confirm
with jar tests and pilot data. The tool supports, and does not replace, the judgement of a qualified engineer.

## Developer notes

```
src/core      water chemistry & properties, criteria library, SLS 614, Sri Lanka data, NWSDB D2 (d2.js) and D3 (d3.js) tables, calc logger
src/engine    one pure module per design step + index.js (dependency-ordered computeAll)
src/ui        shell, schema-driven forms, d3 charts, drawing engine (SVG + DXF), report & Excel writers, pages
electron      main process (file dialogs, PDF export, single instance, file association) and secure preload bridge
test          engine.test.mjs (hand-calculation checks), functional and screenshot tests
```

* Run from source: `npm install` then `npm start` (Node 20+).
* Engine tests: `npm test` (170 checks incl. specified capacity, design chain and impact ripple, D2 tables & formulae, D3 tables and annex design examples, CT tables, carbonate chemistry, continuity, every unit combination).
* **Building a signed installer:** `npm run dist` produces an NSIS installer and a portable EXE in `release/` with the
  application icon and `.wtpd` association embedded. Sign them with the NWSDB code-signing certificate if available.
