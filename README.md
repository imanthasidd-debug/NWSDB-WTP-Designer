# NWSDB WTP Designer

Desktop design suite for **conventional water treatment plants** of the National Water Supply & Drainage Board (Sri Lanka).
It takes a scheme from population forecast to a costed, drawn and checked plant: source & hydrology → intake →
aeration → chemical dosing → rapid mixing → flocculation → sedimentation → filtration → disinfection → stabilisation →
storage & pumping → residuals → hydraulic profile → site layout → power → cost → SLS 614 compliance → design report.

*For the National Water Supply & Drainage Board, Sri Lanka.*

**Version 1.9 – NWSDB CAD practice for drawings and DXF**
Set up from an NWSDB working drawing (RSC sample "Intake", AutoCAD 2016, plotted with monochrome.ctb):
* **Dimensions in millimetres, levels in metres** on every drawing – on screen, in PDF, DXF and SVG (e.g. 66500,
  Ø 11500; WL 23.3). The sheet note says so.
* **NWSDB title strip** along the bottom of every A3 sheet, with the sample's layout and proportions: logo and the
  Board's name in English, Sinhala and Tamil | project, drawing title and scale | revision table (REV. DESCRIPTION
  DATE SIGN.) | 3 × 3 signature grid with the drawing number and date (dd-mm-yyyy). Notes and legend sit in a band
  above it.
* **Signature boxes** editable in *Project setup → Drawing title block*: by default the sample's posts – DRAWN,
  D.O.A., Q.S / E.A, ENGINEER (D), C.E. (P&D), A.G.M. ({R}), D.G.M. ({R}) – where {R} becomes the province code
  (e.g. NC). A box without a name uses Drawn by / Designed by / Checked by / Approved by.
* **DXF in AutoCAD 2007 format** (was R12), drawn in millimetres:
  * layers with line weights, so monochrome plotting gives the right pens – names, colours and weights as in the
    sample where it has the layer: wall 0.25, OL 0.18, LINES 0.15, HID (HIDDEN2), CL (CENTER2), DIM 0.15, TEXT,
    TEXT TITLE, HATCH, HATCH2, pipe 0.50, GL 0.35, road, PLANNING, title block 0.50 / 0.25 / 0.00, LOGO, NPRINT
    (sheet edge, not plotted), plus EQUIP, WATER, HGL and ISO;
  * text style SANS (Sans Serif), SANS BOLD for titles and NIRMALA (Nirmala UI) for the Sinhala and Tamil names;
  * dimensions exploded on DIM with filled arrowheads, as in the sample, and an ST<scale> dimension style set
    current for further dimensioning; concrete, media and soil hatched; no solid fills that would print black;
  * the A3 sheet DXF has the same frame, notes, legend, scale bar and title strip as the PDF.

**Version 1.8.5 – 3D views of every structure and building**
* New 3D views (static isometric for A3 sheets, PDF, DXF and SVG, and the interactive viewer – rotate, zoom, top /
  front / side views, dimensions and labels) for the units that had plans and sections only:
  * **Aerator** – cascade (steps with the water film, inlet chamber, collection channel, total fall) or multiple-tray
    towers (trays, posts, distributor, collecting basin);
  * **Rapid mixer** – hydraulic-jump channel (raised approach channel, drop weir with coagulant diffuser, jump length)
    or mechanical flash mixers (basins, drive bridges, gearbox and motor);
  * **Sludge thickeners** (scraper bridge and drive, underflow pipe) and **sludge drying beds** (beds drying and
    cleaned, feed main, filtrate collector);
  * **Treated-water pump house**, **chemical house** and **chlorination building**, shown with the front walls cut
    away: pumps on plinths, suction and delivery headers, crane and MCC; bag stores, bunded solution tanks with
    agitators, dosing pumps, lime slurry tanks or saturators; chlorine containers on cradles and weigh scales,
    monorail hoist, chlorinators and the scrubber.
* The 3D view is added as the last view of each drawing set, so the drawing numbers of existing views do not change.

**Version 1.8.4 – crash recovery, backups, error log, background calculation, automatic checks**
* **Crash recovery**: the open project is written to the program's data folder 1.5 s after every change and comes
  back, marked unsaved, after a crash or power cut. A project you saved opens as saved.
* **Backups**: a timestamped copy is kept every time you save and every 10 minutes while you work (last 20 per
  project). *File → Restore a backup…* lists them; a backup opens as an unsaved copy and never overwrites the original.
* **Error log and diagnostics**: program, page and calculation errors are written to a log file. *Settings → About →
  Copy diagnostics* copies the program version, computer details, project summary and recent log for a problem report;
  buttons open the log and backups folders.
* **Smoother typing**: calculations while you type run in the background, so the form stays responsive on slower PCs
  (the status bar's *recalc* tooltip shows where the last one ran). Lists, buttons, undo and opening a project are
  still calculated at once.
* Fix: the Parshall-flume throat-width step of the calculation sheet showed a stray comma before "m³/d".
* Quality checks for every change (GitHub *Checks* workflow): ESLint, type checking of the calculation code,
  Prettier formatting, the engine tests, **38 project files saved by versions 1.1–1.8.2** that must open and give the
  recorded results, **every sample at 500–200,000 m³/d** (no calculation errors; tanks, filters, storage, power and
  cost never shrink as flow rises; cost per m³/d does not rise), every drawing as DXF/SVG, the browser UI and export
  tests and the real desktop program. A harness for comparing designs with built NWSDB plants is ready in
  `test/plants/` (add the as-built figures of 2–3 plants).

**Version 1.8.3 – own water source, dark-mode fixes, clearer drawings**
* **Own water source**: the river-basin list on *Source & hydrology* now starts with *★ Own source*. Enter the source
  name, catchment area at the intake, mean annual rainfall and runoff for a stream that is not in D2 Table 4.1; the 103
  Table 4.1 basins are still there. Left blank, rainfall is the typical value for the climatic zone and runoff is
  rainfall × the area-weighted runoff ratio of the 15 Table 4.1 basins with the nearest rainfall (D2 is silent on
  ungauged catchments) – both are flagged for replacement with gauged data. The calculation sheet, KPIs and the source
  table show the own data.
* **My sources**: *Save to My sources* keeps an own source on this computer; one click on its chip fills it into any
  project. The source data is always saved in the project file, so the project opens the same on another PC.
* **Dark mode**: drop-down lists are readable (the open list used to show light text on white); the capacity box on
  the dashboard, date pickers, placeholders and the restricted-mode bar follow the theme.
* **Hydraulic profile drawing**: unit names no longer overlap each other, the water-level tags or the axis title –
  each label takes the lowest free row above its tank, with a leader when it has to move up; the elevation title runs
  up the scale.
* **About**: the developer credit is smaller and not bold; the Help & methods About card no longer squeezes its text
  into a narrow strip, and the logo sits on white in dark mode. The program version shown in About, the dashboard,
  reports, the O&M manual and drawing title blocks is read from the build (was fixed at "v1.8").
* The impact panel describes a source chosen from *My sources* in words; run-of-river sources show the runoff ratio
  instead of the reservoir sediment allowance.
* Test scripts no longer write to a fixed folder: `WTP_TEST_OUT` sets the output folder and `CHROMIUM_PATH` an
  existing Chromium.

**Version 1.8.2 – neutral presentation, fixed logo**
* The splash screen, dashboard and page headers no longer display the names of the design manuals and rate book;
  library pages are renamed *Supply-system clauses*, *Treatment clauses* and *Cost rates*. Clause citations stay in
  the calculation sheets, design checks, BOQ references and report reference list, where engineers need them, and
  the full list of references is under Help & methods.
* The organisation logo is built in and cannot be replaced (the logo option was removed from Settings; any logo saved
  by an earlier version is ignored).
* Developer credit is shown in Help & methods and in Settings → About.

**Version 1.8.1 – NWSDB Rates 2026**
* Pricing follows **NWSDB Rates 2026** – the Rate Book 2025 revised by circular **CQS/22/2026/98 of 14.10.2026**
  (RB 2025 Rev. 01-2026):
  * replaced tables read from the circular's annexes: pipe work A-PVC/01-03, A-DI/01-03, A-PE/01-06 (Annexes 01–03),
    local HDPE B-PE/01B, 03B (Annex 12), chemicals A-CH/01-02 (Annex 06), basic prices – auto diesel 392 LKR/L
    (Annex 08), labour (Annex 09), exchange rate 1 USD = 332.49 LKR (Annex 14);
  * other sections = 2025 rates × the circular's adjustment factors: 1.08 for A-MIS/01, Graphs A-UC/01-07 and civil
    Section B (WRS, BU, RD, MIS, FM, COM …) and for installation; 1.092 for M&E, electrical and laboratory supply;
    1.144 for valves and DI items supply. Every reference in the BOQ says "2025 × factor";
  * total cost estimate in the new Table 1 format (Annex 13): Sub Total 3 → **SSCL = Sub Total 3 / 97.5 × 2.5** →
    Sub Total 4 → VAT 18 % of Sub Total 4; base year 2026 (escalation beyond 31.12.2026);
  * projects saved with the 2025 diesel price or exchange rate are updated when opened;
  * the CEB tariff (Annex 8, 12.06.2025) and the CEB bulk-supply construction cost are not revised by the circular
    and are unchanged. `scripts/ratebook/rb2026.py` regenerates `src/core/ratebook2026.data.js` from the PDF text.

**Version 1.8 – operation & maintenance tools, and a stronger trial edition**
* New sidebar group **Operation & maintenance**: Existing plant assessment, Jar-test dose calculator, Backwash &
  chemical-stock planner and O&M manual (draft).
* **Jar-test dose calculator** (NWSDB D3 §4.4.3.2, §6.1): fits the dose curve to the jar results, gives the optimum
  and the economic dose, coagulation pH and alkalinity (pre-lime if needed), the **stroke setting** of the dosing pumps
  for today's flow, a calibration-column check and a **dosing table** (stroke % for 50–120 % flow × doses). Past jar
  tests recalibrate D = a·Tuᵇ and can be applied to the Chemical dosing page.
* **Backwash & chemical-stock planner** (D3 §5.9.12–5.9.14, §5.12.8, §9.1): wash interval, staggered 7-day wash
  timetable (day shift or round the clock), procedure with this plant's rates, wash water and energy; slow sand
  scraping / re-sanding plan; for every chemical the days of stock, reorder level and date, order quantity in whole
  packs, run-out date, 90-day projection and monthly consumption and cost.
* **O&M manual (draft)** in the D3 Chapter 10 structure, filled from the design: plant data, SLS 614 targets and
  monitoring schedule, SOPs for every process (jar test, solution preparation, dosing table, desludging, backwash,
  chlorine container change, lime), start-up / shut-down, maintenance schedule, staff, laboratory, safety,
  emergency response, chemical stock plan and log sheets. PDF or editable Word (.doc).
* **Trial edition** (`TRIAL_DAYS=30 bash scripts/package-win.sh`):
  * full features for 30 days per computer; outputs marked "Trial version – not for issue";
  * after the trial: **restricted mode** – projects and samples open and every result can be viewed, but inputs
    cannot be changed and nothing can be exported; the project file can still be saved;
  * **licence keys**: the Licence dialog shows the computer's machine ID; a key made with the separate *Licence Key
    Generator* (Ed25519-signed, bound to that machine ID) either unlocks the full version or extends the trial to a
    date. The program holds only the public key, so keys cannot be forged from it;
  * trial records in three places (two files and the registry) with clock roll-back protection; re-checked hourly;
  * the program is bundled, minified and packed into `app.asar`; Electron fuses switch off run-as-Node, NODE_OPTIONS
    and the inspector and load the app only from the archive; developer tools are disabled.

**Version 1.7 – existing plant assessment, and a trial edition for sharing**
* **Existing plant assessment** (Outputs → *Existing plant assessment*): enter the sizes of a plant that is already
  built (flocculators, sedimentation tanks, filters, contact tank, clear-water reservoir, chemical feeders, raw- and
  treated-water pumps) and its present average, peak and target flows. Each unit is rated against the NWSDB D3 / D2
  criteria of the project (flocculation ≥ 20 min, surface overflow rate ≤ 24 m³/m²·d, detention ≥ 2 h, weir loading,
  tube-settler loading, filter rate with units out of service, contact time T₁₀, feeder and duty-pump capacity).
  The page gives the capacity of every unit, the **bottleneck**, the head-room at the present peak, the shortfall
  against the target, and an ordered **upgrade path** with the size of each extension. *Fill from the current design*
  copies the design of the project as a starting point. The assessment is added to the design report when switched on.
  It uses loading and hydraulic criteria only – confirm with plant records and the condition of the works.
* **Trial edition**: `TRIAL_DAYS=30 bash scripts/package-win.sh` builds a separate ZIP for sharing. It has every feature
  for 30 days from the first start on each computer, shows the days left in the title bar, and marks reports and
  drawings "Trial version – not for issue". After the period design work and exports are switched off; the project can
  still be saved and opens in the full edition. The full edition has no time limit.

**Version 1.6 – more of the plant designed, and drawings you can turn around**
* **Interactive 3D**: the 3D view of every structure and of the whole plant can be rotated (drag), zoomed (scroll)
  and panned (shift-drag), with preset Top / Front / Side / Back views, and shows **dimensions** and labels that can be
  switched on and off. The fixed isometric view is still used for A3 sheets, PDF and DXF.
* **New treatment units from NWSDB D3**: dissolved air flotation for algae-laden reservoir water (§5.7.8),
  horizontal-flow roughing filters ahead of slow sand filters (§5.13, Tables 5-40 / 5-41), iron and manganese removal
  (§7.1, Tables 6-8, 7-1) and fluoride removal (§7.2, Tables 7-3, 7-4) – triggered when the raw water exceeds
  SLS 614:2013 (Fe 0.3, Mn 0.1, F 1.0 mg/L).
* **Chemical house and chlorination building** (D3 §6.1, §6.4–6.5, §9): stores, solution tanks, dosing pumps, carrier
  water, 110 % bund, lime slurry or saturators, chlorine drum store, connected containers, chlorinators, ventilation at
  one air change per minute, caustic neutralisation – with room schedules and plans.
* **Hydraulics**: Parshall flume from the D3 Annex C.1 table, equal-split distribution weirs between treatment streams
  (D3 §9.5) with the flow error for a 5 mm crest tolerance, and the filter control mode recommended by D3 §5.9.9.1.
* **Structural pre-design** (new page): wall and base thickness, bars for strength and 0.2 mm crack width, concrete
  and steel quantities, flotation of empty tanks, and a typical reinforcement section for each structure. The NWSDB
  manuals give only general structural rules, so this follows usual water-retaining practice (BS 8110 / BS 8007) and
  is preliminary. The bill of quantities now takes its steel content from it.
* **Staged construction** (D3 §9.1, §9.6): which units are built in Stage I and which are added later.
* **Drawings**: chemical house plan, chlorination building plan, DAF and roughing-filter plan / section / 3D, typical
  reinforcement sections, site levels and drainage plan; the title block now has editable *drawn by*, drawing status
  (preliminary … as built) and revision description / history.

**Version 1.5 – every structure in every view, and designs that size themselves**
* **Multi-view drawings**: each structure now has a view switcher – **Plan**, **Section A–A** (longitudinal),
  **Section B–B** (cross), a **General arrangement** sheet with the views laid out in projection, and a **3D isometric
  view**. Section cutting lines (A–A, B–B) are marked on the plans. New drawings: intake well plan, aerator and
  rapid-mixer plans, flocculator plan / longitudinal / cross-sections, sedimentation cross-section, circular-clarifier
  section, general plan of the filter battery with pipe gallery, filter longitudinal section through the gallery,
  slow-sand-filter section, contact-tank sections, clear-water-reservoir sections (levels in m MSL), treated-water pump
  house plan, sludge thickener plan and section, drying-bed plan and section, and a **3D view of the whole plant**
  on the Site layout page. Every view exports as an A3 sheet (PDF, DXF, SVG, PNG) and *All views* exports the set of
  a structure; the drawing pack and register number them `D-<structure>-<view>`.
* **Automatic sizing that passes at any capacity** (500 – 200,000 m³/d): number of treatment streams (2 up to
  50,000 m³/d, then a pair per further 50,000), flocculator type by flow per stream (baffled channels are not offered
  where D3 Table 5-15 spacing ≥ 0.45 m cannot be met), paddle shafts per stage, narrower hydraulic-jump channels for
  small flows, sedimentation depth and L:W for short tanks, filter count limited by the D3 maximum bed area, parallel
  intake pipes for 1.5 D submergence, pump-suction submergence, and the hypochlorination limit. A new plant at any
  capacity now starts with no failing checks.
* Fixes: stale values in automatic fields of disabled units, flocculator drive count in the cost estimate, label
  overlaps on long sections, drawing numbers shared by different drawings.

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

1. Extract `NWSDB-WTP-Designer-1.8.2-win-x64.zip` (right-click → *Extract all*).
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
| Drawings | On every unit page: Plan · Section A–A · Section B–B · General arrangement · 3D view; Model or A3 sheet; DXF / PDF / SVG / PNG of the view or all views |
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
electron      main process (file dialogs, PDF export, single instance, file association), secure preload bridge, licence.js (trial edition only: trial records, machine ID, licence keys)
test          engine.test.mjs (hand-calculation checks), functional and screenshot tests
```

* Run from source: `npm install` then `npm start` (Node 20+). Guidance for AI-assisted development: `CLAUDE.md`.
* Engine tests: `npm test` (311 checks incl. specified capacity, design chain and impact ripple, D2 tables & formulae, D3 tables and annex design examples, CT tables, carbonate chemistry, continuity, every unit combination).
* **Building a signed installer:** `npm run dist` produces an NSIS installer and a portable EXE in `release/` with the
  application icon and `.wtpd` association embedded. Sign them with the NWSDB code-signing certificate if available.
