import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const filename = 'public/assets/catalog.json';
const catalog = JSON.parse(await readFile(filename, 'utf8'));
const imageFiles = Object.keys(catalog.images).filter(file=>file.endsWith('.png'));
let originalSize = 0, optimizedSize = 0;
for (let i = 0; i < imageFiles.length; i += 4) {
  await Promise.all(imageFiles.slice(i, i + 4).map(async file => {
    const source = 'public/assets/images/' + file;
    const output = source.replace(/\.png$/, '.webp');
    if (!existsSync(output)) await sharp(source).webp({ lossless: true, effort: 4 }).toFile(output);
    originalSize += (await readFile(source)).length;
    optimizedSize += (await readFile(output)).length;
  }));
}
console.log(`Lossless images: ${(originalSize / 1e6).toFixed(1)} MB → ${(optimizedSize / 1e6).toFixed(1)} MB. Pixels preserved.`);
for (const [name, file] of Object.entries(catalog.sounds)) {
  if (!file.endsWith('.ogg')) continue;
  const converted = `sounds/${name}.m4a`;
  if (!existsSync('public/assets/' + converted)) await promisify(execFile)('ffmpeg', ['-v', 'error', '-y', '-i', 'public/assets/' + file, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', 'public/assets/' + converted]);
  catalog.sounds[name] = converted;
}
await writeFile(filename, JSON.stringify(catalog));
await import('./build-icons.mjs');
console.log('Modern iPad icons and Safari-compatible AAC sounds prepared.');
