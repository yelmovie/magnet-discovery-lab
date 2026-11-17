// Turns the generated originals of the 3D course into the WebP files the game loads.
//   node scripts/prepare-run-stage-art.mjs
// Originals: assets/source/run-stage-20261117/*.png  →  public/assets/run-stage/*.webp
import { existsSync, mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const from = 'assets/source/run-stage-20261117', to = 'public/assets/run-stage';
const jobs = [
  { name: 'street-tile', width: 512, height: 512, quality: 84 },
  { name: 'shop-row', width: 1536, height: 768, quality: 84 },
  { name: 'props-sheet', width: 1536, height: 1024, quality: 88, alpha: true },
  { name: 'city-skyline', width: 1536, height: 512, quality: 82 },
];
mkdirSync(to, { recursive: true });
for (const job of jobs) {
  const source = `${from}/${job.name}.png`, target = `${to}/${job.name}.webp`;
  if (!existsSync(source)) { console.log(`${job.name}: no original yet`); continue; }
  const image = sharp(source), meta = await image.metadata();
  if (job.alpha) {
    // The props must have a real transparent background, not a painted one.
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let clear = 0; for (let i = 3; i < data.length; i += 4) if (data[i] < 8) clear++;
    const share = clear / (info.width * info.height);
    if (!meta.hasAlpha || share < .3) { console.log(`${job.name}: NOT transparent (clear pixels ${(share * 100).toFixed(1)}%) — not written`); process.exitCode = 1; continue; }
    console.log(`${job.name}: ${(share * 100).toFixed(1)}% of pixels are fully transparent`);
  }
  await image.resize(job.width, job.height, { fit: 'fill' }).webp({ quality: job.quality, alphaQuality: 92, effort: 6 }).toFile(target);
  console.log(`${job.name}: ${meta.width}×${meta.height} → ${job.width}×${job.height}, ${(statSync(target).size / 1024).toFixed(0)} KB`);
}
