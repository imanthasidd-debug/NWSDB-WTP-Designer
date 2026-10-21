// Renders the emblem to PNG (multiple sizes) and packs a Windows .ico (PNG-compressed entries).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharp = (await import(process.env.SHARP_PATH || 'sharp')).default;
const { emblemSVG } = await import(path.join(root, 'src/ui/brand.js'));
const svg = Buffer.from(emblemSVG(512).replace('class="logo" ', ''));
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile(path.join(root, 'assets/icon.png'));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = [];
for (const s of sizes) pngs.push(await sharp(svg, { density: 300 }).resize(s, s).png().toBuffer());
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
const dir = Buffer.alloc(16 * sizes.length);
let offset = 6 + 16 * sizes.length;
sizes.forEach((s, i) => {
  const b = pngs[i]; const o = i * 16;
  dir.writeUInt8(s >= 256 ? 0 : s, o); dir.writeUInt8(s >= 256 ? 0 : s, o + 1); dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
  dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6); dir.writeUInt32LE(b.length, o + 8); dir.writeUInt32LE(offset, o + 12);
  offset += b.length;
});
fs.writeFileSync(path.join(root, 'assets/icon.ico'), Buffer.concat([header, dir, ...pngs]));
console.log('icons written');
