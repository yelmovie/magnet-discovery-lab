// Cloud-generated PNG originals stay on the external SSD, outside Git.
// Run from the project root: node scripts/prepare-learning-visuals.mjs
import sharp from 'sharp';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';

const source = 'assets/source/learning-20261029';
const target = 'public/assets/learning';
await mkdir(target, { recursive: true });
const files = (await readdir(source)).filter(name => name.endsWith('.png') && !name.startsWith('.')).sort();
const manifest = [];
for (const file of files) {
  const id = file.replace('.png', '');
  const output = `${target}/${id}.webp`;
  await sharp(`${source}/${file}`).resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);
  const { width, height } = await sharp(output).metadata();
  manifest.push({ id, src: `/assets/learning/${id}.webp`, source: `${source}/${file}`, generator: 'Higgsfield gpt_image_2_5', date: '2026-10-29', width, height, bytes: (await stat(output)).size });
}
await writeFile(`${target}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${manifest.length} images, ${Math.round(manifest.reduce((sum, item) => sum + item.bytes, 0) / 1024)} KiB total`);
