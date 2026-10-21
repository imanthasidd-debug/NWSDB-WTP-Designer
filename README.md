# NWSDB WTP Designer

Desktop design suite for **conventional water treatment plants** of the National Water Supply & Drainage Board (Sri Lanka).
It takes a scheme from population forecast to a costed, drawn and checked plant: source & hydrology → intake →
aeration → chemical dosing → rapid mixing → flocculation → sedimentation → filtration → disinfection → stabilisation →
storage & pumping → residuals → hydraulic profile → site layout → power → cost → SLS 614 compliance → design report.

**Version 1.1 incorporates NWSDB Design Manual D2 – Urban Water Supply and Distribution (March 1989)** clause by
clause: design periods, community demand table, non-domestic unit demands, unaccounted-for water, peaking factors,
river-basin data (Table 4.1), BS 3680 weirs & flumes, rational formula and Rippl reservoir yield, intake and screen
rules, NPSH under storm conditions, stand-by pumps, pump efficiencies, pipe classes and design C values, least-cost
pumping-main diameter, air valves / washouts / thrust blocks, service-reservoir sizing, flotation, site planning and
the D2 cost-estimate format with present value and equivalent annual cost. Every D2-based check cites its clause and
is listed in **Library → NWSDB Design Manual D2** and in a dedicated report chapter and Excel sheet.

## Install on Windows 10 / 11

1. Extract `NWSDB-WTP-Designer-1.1.0-win-x64.zip` (right-click → *Extract all*).
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
| Raw water quality | Laboratory results vs SLS 614:2013 and the proposed raw-water source guideline; monthly (monsoon) turbidity profile |
| Source & hydrology | D2 §4: river-basin data (103 basins), dry-weather availability, reservoir mass diagram (Rippl), sediment, evaporation, flood estimate |
| Process selection | Expert-system recommendation of the train with a decision log; override any unit |
| Treatment units | Each page: inputs on the left (live criteria hints), results / charts / checks / calculation sheet on the right |
| Plant-wide | Storage & pumping (mass curve, pump curves, surge), residuals, hydraulic profile, draggable site layout, power, cost |
| Outputs | SLS 614 compliance & log credits, design-check register, PDF report, Excel workbook, DXF/SVG drawing pack |
| Library | NWSDB Design Manual D2 (clause index, project compliance, design tables, river basins), editable design-criteria library, engineering toolbox, help, settings |

Shortcuts: `Ctrl+N` new · `Ctrl+O` open · `Ctrl+S` save · `Ctrl+Z/Y` undo/redo · `Ctrl+P` report · `Ctrl+E` Excel · `Ctrl+1…9` pages.

Three sample projects are available from **File → Sample projects** (and as `.wtpd` files in the `Samples` folder):
a 42 MLD wet-zone river plant (Gampaha), a 12.5 MLD dry-zone reservoir plant (Anuradhapura) and a 2.3 MLD
slow-sand rural scheme (Badulla). Projects saved with version 1.0 open unchanged and are re-checked against D2.

## Engineering basis

Demand, source, intake, pumping, mains, service reservoirs, site planning and cost estimating follow **NWSDB Design
Manual D2 (1989)**. Treatment-unit process design (the scope of companion manual D3) follows the supplied lecture notes
(Dr B. Gunawardana, 2020), supplemented by AWWA/ASCE *Water Treatment Plant Design*, Kawamura, MWH, USEPA SWTR CT
tables, Ten States Standards and IRC/WHO. Every check cites its source in the **Design criteria** page, where all ranges can be edited
and are saved with the project. Unit rates, chemical prices and the CEB tariff are indicative 2026 values — update them to
the current NWSDB schedule of rates before issuing estimates. Predicted water quality is a screening estimate; confirm
with jar tests and pilot data. The tool supports, and does not replace, the judgement of a qualified engineer.

## Developer notes

```
src/core      water chemistry & properties, criteria library, SLS 614, Sri Lanka data, NWSDB D2 tables (d2.js), calc logger
src/engine    one pure module per design step + index.js (dependency-ordered computeAll)
src/ui        shell, schema-driven forms, d3 charts, drawing engine (SVG + DXF), report & Excel writers, pages
electron      main process (file dialogs, PDF export, single instance, file association) and secure preload bridge
test          engine.test.mjs (hand-calculation checks), functional and screenshot tests
```

* Run from source: `npm install` then `npm start` (Node 20+).
* Engine tests: `npm test` (96 checks incl. D2 tables & formulae, CT tables, carbonate chemistry, continuity, every unit combination).
* **Building a signed installer:** `npm run dist` produces an NSIS installer and a portable EXE in `release/` with the
  application icon and `.wtpd` association embedded. Sign them with the NWSDB code-signing certificate if available.
