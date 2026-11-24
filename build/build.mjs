// Bundles the renderer (src/) into dist/ with esbuild and copies static assets.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodePaths = [
  path.join(root, 'node_modules'),
  ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
];
const req = createRequire(path.join(root, 'package.json'));
const resolveFrom = (name) => {
  for (const p of nodePaths) {
    const f = path.join(p, name);
    if (fs.existsSync(f)) return f;
  }
  return req.resolve(name);
};
const esbuild = await import(resolveFrom('esbuild/lib/main.js'));
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const t0 = Date.now();
await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome120'],
  outfile: path.join(dist, 'app.js'),
  minify: process.argv.includes('--dev') ? false : true,
  sourcemap: process.argv.includes('--dev'),
  nodePaths,
  legalComments: 'eof',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  logLevel: 'warning',
});
// calculation worker (src/engine/worker.js) – same engine code, run off the screen thread
await esbuild.build({
  entryPoints: [path.join(root, 'src/engine/worker.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome120'],
  outfile: path.join(dist, 'engine.worker.js'),
  minify: !process.argv.includes('--dev'),
  sourcemap: process.argv.includes('--dev'),
  nodePaths,
  legalComments: 'eof',
  logLevel: 'warning',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
fs.copyFileSync(path.join(root, 'src/index.html'), path.join(dist, 'index.html'));
fs.copyFileSync(path.join(root, 'src/ui/app.css'), path.join(dist, 'app.css'));
// KaTeX stylesheet + fonts
const katexDir = path.dirname(resolveFrom('katex/package.json'));
fs.mkdirSync(path.join(dist, 'katex/fonts'), { recursive: true });
fs.copyFileSync(path.join(katexDir, 'dist/katex.min.css'), path.join(dist, 'katex/katex.min.css'));
for (const f of fs.readdirSync(path.join(katexDir, 'dist/fonts')))
  if (f.endsWith('.woff2')) fs.copyFileSync(path.join(katexDir, 'dist/fonts', f), path.join(dist, 'katex/fonts', f));
for (const f of ['icon.png', 'icon.ico'])
  if (fs.existsSync(path.join(root, 'assets', f))) fs.copyFileSync(path.join(root, 'assets', f), path.join(dist, f));
const kb = (fs.statSync(path.join(dist, 'app.js')).size / 1024).toFixed(0);
console.log(`built dist/app.js (${kb} kB) in ${Date.now() - t0} ms`);
