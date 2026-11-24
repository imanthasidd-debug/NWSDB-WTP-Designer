// Minimal asar writer (Electron archive format): node scripts/asar-pack.mjs <srcDir> <out.asar>
// header = Pickle(UInt32 headerSize) + Pickle(String JSON) ; then the file contents in header order.
import fs from 'node:fs';
import path from 'node:path';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: asar-pack <srcDir> <out.asar>');
  process.exit(2);
}
const files = [];
let offset = 0;
function walk(dir) {
  const node = { files: {} };
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) node.files[name] = walk(p);
    else {
      node.files[name] = { size: st.size, offset: String(offset) };
      if (st.mode & 0o111 && process.platform !== 'win32') node.files[name].executable = true;
      files.push(p);
      offset += st.size;
    }
  }
  return node;
}
const header = walk(src);
const json = Buffer.from(JSON.stringify(header), 'utf8');
const pad = (4 - (json.length % 4)) % 4;
const headerPickle = Buffer.alloc(8 + json.length + pad);
headerPickle.writeUInt32LE(4 + json.length + pad, 0);
headerPickle.writeInt32LE(json.length, 4);
json.copy(headerPickle, 8);
const sizePickle = Buffer.alloc(8);
sizePickle.writeUInt32LE(4, 0);
sizePickle.writeUInt32LE(headerPickle.length, 4);
const fd = fs.openSync(out, 'w');
fs.writeSync(fd, sizePickle);
fs.writeSync(fd, headerPickle);
for (const f of files) fs.writeSync(fd, fs.readFileSync(f));
fs.closeSync(fd);
console.log(`asar: ${files.length} files, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB → ${out}`);
