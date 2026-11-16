#!/usr/bin/env bash
# Assembles the Windows x64 distribution from the official Electron runtime (no wine/NSIS needed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_ZIP="${ELECTRON_ZIP:-/home/claude/vendor/electron-v44.7.0-win32-x64.zip}"
VERSION="$(node -p "require('$ROOT/package.json').version")"
APP="NWSDB WTP Designer"
OUT="$ROOT/release"
# TRIAL_DAYS=30 bash scripts/package-win.sh  → time-limited trial edition (separate ZIP); unset / 0 → full edition
TRIAL_DAYS="${TRIAL_DAYS:-0}"
if [ "$TRIAL_DAYS" -gt 0 ]; then TAG="NWSDB-WTP-Designer-$VERSION-Trial-${TRIAL_DAYS}days-win-x64"; else TAG="NWSDB-WTP-Designer-$VERSION-win-x64"; fi
STAGE="$OUT/$TAG"
rm -rf "$STAGE" && mkdir -p "$STAGE/$APP"
export NODE_PATH="/opt/npm-tools/node_modules${NODE_PATH:+:$NODE_PATH}"
node "$ROOT/build/build.mjs"
unzip -q "$ELECTRON_ZIP" -d "$STAGE/$APP"
mv "$STAGE/$APP/electron.exe" "$STAGE/$APP/$APP.exe"
# embed the NWSDB icon and version information in the executable
python3 "$ROOT/scripts/brand_exe.py" "$STAGE/$APP/$APP.exe" "$ROOT/assets/icon.ico" "$VERSION"
rm -f "$STAGE/$APP/resources/default_app.asar"
mkdir -p "$STAGE/$APP/resources/app"
node -e "const p=require('$ROOT/package.json'); const o={name:p.name,productName:p.productName,version:p.version,description:p.description,main:p.main,author:p.author,license:p.license}; require('fs').writeFileSync('$STAGE/$APP/resources/app/package.json', JSON.stringify(o,null,2));"
cp -r "$ROOT/electron" "$ROOT/dist" "$STAGE/$APP/resources/app/"
rm -f "$STAGE/$APP/resources/app/dist/"*.map
if [ "$TRIAL_DAYS" -gt 0 ]; then
  sed -i "s/^const TRIAL_DAYS = 0;/const TRIAL_DAYS = $TRIAL_DAYS;/" "$STAGE/$APP/resources/app/electron/main.js"
  grep -q "^const TRIAL_DAYS = $TRIAL_DAYS;" "$STAGE/$APP/resources/app/electron/main.js"
  # no developer tools in the trial edition
  sed -i "s/{ role: 'toggleDevTools'[^}]*}/{ type: 'separator' }/" "$STAGE/$APP/resources/app/electron/main.js"
else
  rm -f "$STAGE/$APP/resources/app/electron/trial.js"
fi
cp "$ROOT/installer/install.ps1" "$ROOT/installer/uninstall.ps1" "$ROOT/installer/Install.cmd" "$STAGE/"
mkdir -p "$STAGE/Samples"
node --input-type=module -e "
import fs from 'node:fs';
import { SAMPLES } from '$ROOT/src/ui/samples.js';
const names = { wet: 'Gampaha 42 MLD river plant', dry: 'Anuradhapura 12.5 MLD reservoir plant', rural: 'Badulla 2.3 MLD slow sand scheme', cap25: 'Kurunegala 25,000 m3-d specified capacity plant' };
for (const s of SAMPLES) { const p = s.build(); fs.writeFileSync('$STAGE/Samples/' + (names[s.id] || p.inputs.setup.code) + '.wtpd', JSON.stringify(p, null, 1)); }
"
sed 's/$/\r/' "$ROOT/README.md" > "$STAGE/README.md"
if [ "$TRIAL_DAYS" -gt 0 ]; then
  sed -i "s/^\$Version  = '\(.*\)'/\$Version  = '\1 (trial, $TRIAL_DAYS days)'/" "$STAGE/install.ps1"
  printf 'NWSDB WTP Designer %s - TRIAL VERSION\r\n\r\nThis copy works with every feature for %s days from the first start on each computer.\r\nReports and drawings are marked "Trial version - not for issue".\r\nAfter the trial period design work and exports are switched off; project files (.wtpd)\r\ncan still be saved and open in the full version.\r\n\r\nTo install: extract the whole ZIP, then double-click Install.cmd (no administrator rights needed).\r\n' "$VERSION" "$TRIAL_DAYS" > "$STAGE/TRIAL - read me first.txt"
fi
(cd "$OUT" && rm -f "$TAG.zip" && zip -qr -9 "$TAG.zip" "$TAG")
ls -la "$OUT"
