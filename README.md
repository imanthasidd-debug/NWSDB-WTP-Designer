# NWSDB WTP Designer

Desktop design suite for **conventional water treatment plants** of the National Water Supply & Drainage Board (Sri Lanka).
It takes a scheme from population forecast to a costed, drawn and checked plant: source & hydrology → intake →
aeration → chemical dosing → rapid mixing → flocculation → sedimentation → filtration → disinfection → stabilisation →
storage & pumping → residuals → hydraulic profile → site layout → power → cost → SLS 614 compliance → design report.

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

1. Extract `NWSDB-WTP-Designer-1.2.0-win-x64.zip` (right-click → *Extract all*).
2. Double-click **Install.cmd**. The app is installed for the current user (no administrator rights), with Start-menu and
   desktop shortcuts and the `.wtpd` project-file association. Uninstall from *Settings → Apps*.
3. Or run it without installing: open the `NWSDB WTP Designer` folder and double-click `NWSDB WTP Designer.exe`.

The executable is not code-signed, so Windows SmartScreen may show *“Windows protected your PC”* the first time —
choose **More info → Run anyway**, or ask ICT to sign/whitelist it (see *Building a signed installer* below).

## Using the application

| Area | What you do |
|---|---|
| Project setup | Name, district (sets water temperature, monsoon pattern and regional alerts), source type, site level, design team |
| Demand forecast | Census-based projection; D2 §3 per-capita (house connections / standposts), non-domestic unit demands, UFW, peaking → adopted capacity |
| Raw water quality | Laboratory results vs SLS 614:2013 and the SLS 722:1985 raw-water limits (D3 Tables 2-4, 2-6); monthly (monsoon) turbidity profile |
| Source & hydrology | D2 §4: river-basin data (103 basins), dry-weather availability, reservoir mass diagram (Rippl), sediment, evaporation, flood estimate |
| Process selection | Expert-system recommendation of the train (D3 Table 4-5, Fig 4-3/4-4) with a decision log; override any unit |
| Treatment units | Each page: inputs on the left (live criteria hints), results / charts / checks / calculation sheet on the right |
| Plant-wide | Storage & pumping (mass curve, pump curves, surge), residuals, hydraulic profile, draggable site layout, power, cost |
| Outputs | SLS 614 compliance & log credits, design-check register, PDF report, Excel workbook, DXF/SVG drawing pack |
| Library | NWSDB Design Manuals D2 and D3 (clause index, project compliance, design tables, errata), editable design-criteria library, engineering toolbox, help, settings |

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
and are saved with the project. Unit rates, chemical prices and the CEB tariff are indicative 2026 values — update them to
the current NWSDB schedule of rates before issuing estimates. Predicted water quality is a screening estimate; confirm
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
* Engine tests: `npm test` (155 checks incl. D2 tables & formulae, D3 tables and annex design examples, CT tables, carbonate chemistry, continuity, every unit combination).
* **Building a signed installer:** `npm run dist` produces an NSIS installer and a portable EXE in `release/` with the
  application icon and `.wtpd` association embedded. Sign them with the NWSDB code-signing certificate if available.
