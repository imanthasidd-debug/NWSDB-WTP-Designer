// Extracts a curated set of Lucide icons (ISC licence) from react-icons into a plain SVG-string module.
// Usage: node scripts/extract-icons.mjs <path-to-react-icons/lu/index.mjs>
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2] || '/opt/npm-tools/node_modules/react-icons/lu/index.mjs';
const text = fs.readFileSync(src, 'utf8');
const want = {
  dashboard: 'LayoutDashboard', users: 'Users', flask: 'FlaskConical', workflow: 'Workflow', waves: 'Waves',
  wind: 'Wind', beaker: 'Beaker', blend: 'Blend', fan: 'Fan', layers: 'Layers', filter: 'Filter',
  shield: 'ShieldCheck', scale: 'Scale', database: 'Database', recycle: 'Recycle', activity: 'Activity',
  map: 'Map', zap: 'Zap', wallet: 'Wallet', badge: 'BadgeCheck', checks: 'ListChecks', file: 'FileText',
  book: 'BookOpen', wrench: 'Wrench', help: 'CircleHelp', settings: 'Settings', save: 'Save',
  open: 'FolderOpen', newfile: 'FilePlus', download: 'Download', printer: 'Printer', undo: 'Undo2',
  redo: 'Redo2', moon: 'Moon', sun: 'Sun', chevronRight: 'ChevronRight', chevronDown: 'ChevronDown',
  warn: 'TriangleAlert', ok: 'CircleCheck', fail: 'CircleX', info: 'Info', droplets: 'Droplets',
  droplet: 'Droplet', pin: 'MapPin', calendar: 'Calendar', building: 'Building2', plus: 'Plus',
  minus: 'Minus', trash: 'Trash2', copy: 'Copy', sparkles: 'Sparkles', bulb: 'Lightbulb', reset: 'RotateCcw',
  maximize: 'Maximize2', ruler: 'Ruler', sheet: 'FileSpreadsheet', fileDown: 'FileDown', pen: 'PenTool',
  gauge: 'Gauge', thermo: 'Thermometer', rain: 'CloudRain', search: 'Search', x: 'X', menu: 'Menu',
  move: 'Move', factory: 'Factory', pipette: 'Pipette', cylinder: 'Cylinder', timer: 'Timer',
  sliders: 'SlidersHorizontal', chartLine: 'ChartLine', chartBar: 'ChartColumn', grid: 'Grid3X3',
  table: 'Table', calculator: 'Calculator', arrowRight: 'ArrowRight', mountain: 'Mountain',
  trending: 'TrendingUp', leaf: 'Leaf', landmark: 'Landmark', hammer: 'Hammer', plug: 'PlugZap',
  banknote: 'Banknote', clipboard: 'ClipboardCheck', home: 'House', image: 'Image', upload: 'Upload',
  microscope: 'Microscope', container: 'Container', shapes: 'Shapes', more: 'Ellipsis',
};
const out = {};
const toKebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
function render(node) {
  const attrs = Object.entries(node.attr || {})
    .filter(([k]) => !['viewBox', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin'].includes(k) || node.tag !== 'svg')
    .map(([k, v]) => `${toKebab(k)}="${v}"`).join(' ');
  if (node.tag === 'svg') return (node.child || []).map(render).join('');
  return `<${node.tag} ${attrs}/>`;
}
for (const [key, name] of Object.entries(want)) {
  const re = new RegExp(`export function Lu${name} \\(props\\) \\{\\s*return GenIcon\\((\\{.*?\\})\\)\\(props\\);`, 's');
  const m = text.match(re);
  if (!m) { console.error('missing icon', name); continue; }
  const tree = JSON.parse(m[1]);
  out[key] = render(tree);
}
const body = `// AUTO-GENERATED from Lucide icons (ISC License, https://lucide.dev) via scripts/extract-icons.mjs\n` +
  `export const ICON_PATHS = ${JSON.stringify(out, null, 0)};\n`;
const dest = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/ui/icons.gen.js');
fs.writeFileSync(dest, body);
console.log('wrote', Object.keys(out).length, 'icons to', dest);
