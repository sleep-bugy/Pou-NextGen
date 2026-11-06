import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else result.push('/' + path.relative('dist', file).split(path.sep).join('/'));
  }
  return result;
}

const before = await files('dist');
// Ship the lossless WebP copies; keep operator-supplied originals in public/ for reference.
await Promise.all(before.filter(file => file.startsWith('/assets/images/') && file.endsWith('.png') || file.startsWith('/assets/sounds/') && file.endsWith('.ogg')).map(file => unlink('dist' + file)));
const all = (await files('dist')).filter(file => !file.endsWith('.map') && file !== '/sw.js');
const coreImages = ['icons/modern/', 'pou/', 'status/', 'icons/prev', 'icons/next', 'icons/pause', 'icons/settings', 'shop/', 'star/', 'coin/coin_sm', 'dialog/', 'fridges/', 'closets/', 'shelves/', 'phones/100/black', 'room/', 'food/apple.', 'food/burger.', 'food/water.', 'potions/', 'lamps/100/', 'pillows/100/', 'balls/300/l1', 'soaps/', 'showers/100/white', 'flowers/1.'];
const coreSounds = ['hu2.mp3', 'miei.m4a', 'a7777.m4a', 'eat_1.m4a', 'eat_2.m4a', 'eat_3.m4a', 'potion.m4a', 'click.m4a'];
const core = all.filter(file => !file.startsWith('/assets/images/') && !file.startsWith('/assets/sounds/') || coreImages.some(prefix => file.startsWith('/assets/images/' + prefix)) || coreSounds.some(sound => file === '/assets/sounds/' + sound));
const hash = createHash('sha256').update((await Promise.all(core.map(file => readFile('dist' + file)))).map(buffer => createHash('sha256').update(buffer).digest('hex')).join('')).digest('hex').slice(0, 12);
await writeFile('dist/offline-assets.json', JSON.stringify(all));
const source = await readFile('public/sw.js', 'utf8');
await writeFile('dist/sw.js', source.replace('__VERSION__', hash).replace('/*__CORE__*/ []', JSON.stringify(core)));
console.log(`Offline shell: ${core.length} files. Optional complete download: ${all.length} files.`);
