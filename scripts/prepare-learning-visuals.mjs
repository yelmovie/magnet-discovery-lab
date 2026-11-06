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
  const fromBench = id === 'rings';
  const original = fromBench ? 'assets/source/learning-reference/rings.png' : `${source}/${file}`;
  await sharp(original).resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);
  const { width, height } = await sharp(output).metadata();
  manifest.push({ id, src: `/assets/learning/${id}.webp`, source: original, generator: fromBench ? '활동 6 실험대 캔버스' : 'Higgsfield gpt_image_2_5', date: fromBench ? '2026-11-02' : '2026-10-29', width, height, bytes: (await stat(output)).size });
}
await writeFile(`${target}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${manifest.length} images, ${Math.round(manifest.reduce((sum, item) => sum + item.bytes, 0) / 1024)} KiB total`);
