# NWSDB WTP Designer – guide for Claude Code

Windows 10/11 desktop application (Electron 44.7, fully offline) that designs a conventional water treatment plant
for the National Water Supply & Drainage Board (NWSDB), Sri Lanka: demand → source → intake → coagulation → rapid mix
→ flocculation → sedimentation / DAF → filtration → disinfection → stabilisation → storage & pumping → residuals →
hydraulic profile → structures → site layout → power → cost estimate → water-quality compliance → report, Excel,
A3 drawings (PDF / DXF / SVG) and operation & maintenance tools. See `README.md` for the user-facing feature list and
version history.

## Owner's standing rules (do not break)
- **Developer credit** "Developed by Eng. Imantha Dilshan" (`src/ui/brand.js` `CREDIT`) appears **only** in
  Library → Help & methods (About card) and Settings → About. Nowhere else (no splash, dashboard, outputs, dialogs).
- **No document names as branding.** Do not show the names of the NWSDB design manuals or the rate book prominently
  (splash, dashboard, page header subtitles, sidebar titles). Clause citations belong in calculation sheets, the
  "Source" column of checks, BOQ references, card captions, the report reference list and Help & methods.
- **The organisation logo is fixed.** The built-in NWSDB logo (`src/ui/logo.js`, `assets/`) cannot be replaced by
  users; there is no logo setting. Do not add one.
- **Engineering content follows NWSDB Design Manuals D2 (1989) and D3 (2020), SLS 614:2013 and the current NWSDB
  rates.** Every rule cites its clause; where the manual is silent, say so and use stated good practice.
- **Never commit licence secrets.** The Ed25519 private signing key and the "Licence Key Generator" HTML are kept by
  the owner outside the repo (`.gitignore` blocks them). Keep this repository **private**: `electron/licence.js`
  contains the HMAC secret of the trial records.
- Plain, short English in the UI (users are NWSDB engineers and operators).

## Commands
```
npm install                      # devDependencies: d3, jszip, katex, esbuild, electron, electron-builder
npm run build                    # node build/build.mjs → dist/ (renderer bundle, CSS, KaTeX fonts, icons)
npm start                        # build + run in Electron
npm test                         # node test/engine.test.mjs – 311 engine checks (hand calculations, D2/D3, rates)
```
Optional checks (need Playwright + Chromium, run `npm run build` first):
```
# optional: WTP_TEST_OUT=<dir> (output folder), CHROMIUM_PATH=/opt/pw-browsers/chromium (when the Python Playwright
# version does not match the installed browser)
python3 test/functional.py       # drives the UI: samples, forms, navigation
python3 test/exports.py          # report PDF, Excel, drawings ZIP, project save/reopen
node test/dxf-export.mjs <dir> && python3 test/validate_dxf.py <dir>   # all drawings as DXF + SVG (needs ezdxf)
PLAYWRIGHT_PATH=… ELECTRON_PATH=… node test/electron.test.cjs <dir>      # real Electron: bridge, PDF export (Linux: Xvfb)
WTP_LICENCE_PRIVATE_KEY=<path> npm test                                 # also runs the licence-key tests
```
Packaging (Windows ZIP with installer scripts, built on Linux without wine):
```
ELECTRON_ZIP=<electron-v44.7.0-win32-x64.zip> bash scripts/package-win.sh                 # full edition
ELECTRON_ZIP=… TRIAL_DAYS=30 bash scripts/package-win.sh                                  # trial edition
```
Each edition takes ~2 min; run them as separate commands. Release ZIPs (~160 MB) belong in GitHub Releases, not git.

## Architecture
- `src/core/` – pure data & maths: `water.js` (properties, carbonate chemistry), `criteria.js` (criteria library,
  ranges, `evaluate`), `calc.js` (`Calc` logger: `section/step/check/flag/text/note`), `d2.js`, `d3.js` (manual tables,
  errata), `standards.js` (SLS 614 parameters), `srilanka.js` (districts, climate), `ratebook.js` (+ `ratebook.data.js`
  2025 book, `ratebook2026.data.js` 2026 circular).
- `src/engine/` – one pure module per design step: `export const DEFAULTS`, `export function compute(inp, ctx)` using
  `ctx.res` (earlier results) and `ctx.crit`; returns values plus `...calc.result()` (steps, checks, notes).
  Order is `MODULES` in `src/engine/index.js` (`computeAll(project)`); a module may only read modules before it.
- `src/ui/` – vanilla JS DOM (`dom.js` `h()`), schema-driven forms (`form.js`), d3 charts (`charts.js`), pages in
  `src/ui/pages/*.js` registered in `pages/registry.js` (`{id, title, sub, icon, group, mod, fields, render(r)}` or
  `layout: 'full'` + `renderFull()`), store/undo/autosave (`store.js`), report (`report.js`), Excel (`xlsx.js`),
  O&M manual (`ommanual.js`), drawings in `src/ui/draw/` (`units.js` primitives, `views.js` `drawingGroups(r)`,
  `iso.js`/`view3d.js` 3D, `sheet.js` A3 title block, `render.js` SVG + DXF).
- `electron/` – `main.js` (window, file dialogs, PDF via `printToPDF`, IPC), `preload.js` (`window.wtp` bridge),
  `licence.js` (trial edition only: trial records, machine ID, Ed25519 licence keys).
- `src/ui/edition.js` – full / trial / restricted / licensed behaviour in the renderer (`canEdit`, `canExport`,
  licence dialog). Browser test of trial states: `dist/index.html?trial=N` (N = 0 → restricted mode).

## Conventions and pitfalls
- Form fields: `{ k, l, u, t: 'sel'|'bool'|'text'|'date'|'table'|'custom'|'help', auto, autoVal(r), show(i, r), note, sec }`.
  A field placed after a `{ sec, show }` header is hidden together with that section.
- Inputs are merged with `DEFAULTS`; test "is default" by comparing with `DEFAULTS`, not with `undefined`.
- `0` in a numeric input usually means "auto" (value computed by the engine and shown as `auto = …`).
- Never put functions in engine results (they are cloned / serialised).
- Use `n()` from `calc.js` only inside LaTeX; plain text uses `fmt()`.
- Rate Book: replaced tables come from `scripts/ratebook/rb2026.py`; all other sections are the 2025 data × the
  circular's factors (`ADJ` in `ratebook.js`); every reference string says "(2025 × f)". Cost estimate follows the
  Table 1 format of Annex 13 (SSCL = Sub Total 3 / 97.5 × 2.5, VAT 18 % of Sub Total 4).
- Projects (`.wtpd` JSON) are migrated in `store.js` `normalise()`; keep old files opening.
- After changing engine behaviour, add checks to `test/engine.test.mjs` and keep all sample projects at 0 failing checks.
- Bump `package.json` and `installer/install.ps1` versions together; add a README "Version x.y" section. The UI reads
  the version from `src/ui/version.js` (`VERSION`, `APP`), injected from `package.json` by `build/build.mjs` – never
  hard-code "v1.x" in the UI, reports or drawings.

## Reference notes
`docs/` holds the extraction notes made from the NWSDB manuals and rate book (D2 rules, D3 rules, D3 extraction notes,
Rate Book 2025 summary). Use them to cite clauses; confirm against the printed manuals when in doubt.

## Open items (owner's backlog)
Test on real Windows PCs; validate against 2–3 built NWSDB plants; code signing; user guide; rate-update import
without rebuilding; Excel sheets for the O&M tools; pipe & valve schedules and filter pipe gallery; DXF dimensions
and NWSDB layer names (needs NWSDB CAD standard); in-plant booster pumps (D3 p 6-43); surge analysis; licence
register / expiring keys; Sinhala / Tamil UI. To confirm: Annex 13 "Sub Total 2" wording, escalation base 2026,
CEB tariff (June 2025 still used).
