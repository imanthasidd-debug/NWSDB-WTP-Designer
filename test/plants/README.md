# Validation against built NWSDB plants

Each `*.json` file here describes one plant that has been built. `node test/plants.test.mjs` designs it with the
program and compares the results with the as-built sizes. Files starting with `_` are examples and are only checked
for structure.

| Field | Meaning |
|---|---|
| `name`, `reference` | Plant name and where the as-built figures come from (drawing numbers, report, year). |
| `project` | Path (relative to this folder) of a `.wtpd` project file with the plant's design inputs, **or** `null`. |
| `basedOn` | When `project` is `null`: `sample:<id>` (wet, dry, rural, cap25) or `new` – the starting inputs. |
| `inputs` | Inputs that override the starting point, in the same structure as a project file (`setup`, `demand`, `quality` …). |
| `tolerance` | Default allowed difference, as a fraction (0.15 = ±15 %). |
| `asBuilt` | List of `{ label, result, value, unit, tolerance? }`. `result` is a path into the design results (`sed.N`, `filt.A`, `storage.V`); a product of paths is allowed (`sed.A*sed.N`). |

Best practice: save the plant's own project from the program (File → Save) with the raw-water data, capacity and the
units as built, put it next to the JSON file and name it in `project`. Record the design flow the plant was built
for, not today's production.
