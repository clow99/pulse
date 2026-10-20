import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const logo = await readFile(resolve(root, 'public/logo.svg'));
const mark = await readFile(resolve(root, 'public/brand/pulse-mark.svg'));
const icon = await readFile(resolve(root, 'public/favicon.svg'));
const png = (source, size) => sharp(source, { density: 288 }).resize(size).png({ compressionLevel: 9 }).toBuffer();

await writeFile(resolve(root, 'public/logo.png'), await png(logo, 928));
await writeFile(resolve(root, 'public/brand/pulse-mark.png'), await png(mark, 512));
for (const [file, size] of [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512],
]) await writeFile(resolve(root, 'public', file), await png(icon, size));

const frames = await Promise.all([16, 32, 48].map(async (size) => ({ size, bytes: await png(icon, size) })));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach(({ size, bytes }, index) => {
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(bytes.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += bytes.length;
});
await writeFile(resolve(root, 'public/favicon.ico'), Buffer.concat([header, ...frames.map(({ bytes }) => bytes)]));
console.log('Generated the Pulse Orbit wordmark, mark, and browser/app icon exports.');
