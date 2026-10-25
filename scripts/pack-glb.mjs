// Packs the Meshy originals for the web without tearing their textures.
// Never weld: Meshy meshes split vertices on UV seams, and merging them smears the paint.
// Textures run in their own process because sharp fails after a gltf-transform transform on Windows.
//   node scripts/pack-glb.mjs            → every model in MODELS
//   node scripts/pack-glb.mjs ring-magnet
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, simplify, reorder, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE = 'assets/source/3d-base-20261025/meshy';
const OUT = process.env.GLB_OUT || 'public/assets/3d';
const TMP = process.env.GLB_TMP || 'D:/DevTemp/5magnet-glb';
// ratio < 1 simplifies with seam-locked borders; keep error ≤ 0.01 (higher collapses silhouettes).
// Only box-body passed the side-by-side check (2026-10-25): at 0.25 the lid's hinge shading
// shifted and the frame's glass showed crack-like facets, so those keep every triangle.
export const MODELS = {
  'ring-magnet': { ratio: 1 },
  'ring-stand': { ratio: 1 },
  'box-body': { ratio: 0.25 },
  'box-lid': { ratio: 1 },
  'remote-frame': { ratio: 1 },
  'remote-handle': { ratio: 1 },
  'remote-tray': { ratio: 1 },
};
const ratioOverride = process.env.GLB_RATIO ? Number(process.env.GLB_RATIO) : null;
const io = () => new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const stats = doc => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((s, p) => ({ tris: s.tris + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, verts: s.verts + p.getAttribute('POSITION').getCount() }), { tris: 0, verts: 0 });

async function textures(src, out) {
  const doc = await io().read(src);
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [2048, 2048], slots: /^baseColorTexture$/ }),
    // Normal and metal/roughness maps are data, not color: lossy WebP's chroma subsampling mixes
    // their channels into crack lines on brass and dark spots on wood, so encode them near-lossless.
    textureCompress({ encoder: sharp, targetFormat: 'webp', nearLossless: true, resize: [1024, 1024], slots: /^normalTexture$/ }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', nearLossless: true, resize: [1024, 1024], slots: /^metallicRoughnessTexture$/ }),
  );
  await io().write(out, doc);
}

async function geometry(src, out, ratio) {
  const doc = await io().read(src);
  const before = stats(doc);
  await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
  const steps = [dedup(), prune()];
  if (ratio < 1) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.004, lockBorder: true }));
  // 16-bit UVs keep every seam on the same texel; positions at 16 bits are sub-micron at this size.
  steps.push(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 16, quantizeTexcoord: 16, quantizeNormal: 10 }));
  await doc.transform(...steps);
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io().write(out, doc);
  const after = stats(doc);
  console.log(JSON.stringify({ out, before, after }));
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'check') {
  // node scripts/pack-glb.mjs check → every model the 3D cards load exists, is meshopt-packed, and fits the budget.
  let total = 0;
  for (const slug of Object.keys(MODELS)) {
    const file = `${OUT}/${slug}.glb`, bytes = readFileSync(file);
    if (bytes.toString('ascii', 0, 4) !== 'glTF' || !bytes.toString('utf8', 20, 4000).includes('EXT_meshopt_compression')) throw new Error(`${file} is not a meshopt-packed GLB`);
    total += bytes.length;
  }
  if (total > 26 * 2 ** 20) throw new Error(`3D models total ${(total / 2 ** 20).toFixed(1)}MB, over the 26MB budget`);
  console.log(`3D models OK: ${Object.keys(MODELS).length} files, ${(total / 2 ** 20).toFixed(1)}MB`);
}
else if (mode === 'tex') await textures(args[0], args[1]);
else if (mode === 'geo') await geometry(args[0], args[1], Number(args[2]));
else {
  const originals = JSON.parse(readFileSync(`${SOURCE}/originals.json`, 'utf8'));
  mkdirSync(TMP, { recursive: true }); mkdirSync(OUT, { recursive: true });
  const self = fileURLToPath(import.meta.url);
  for (const slug of mode ? [mode] : Object.keys(MODELS)) {
    const src = `${SOURCE}/${originals[slug].original}`, tex = `${TMP}/${slug}.tex.glb`, out = `${OUT}/${slug}.glb`;
    execFileSync(process.execPath, [self, 'tex', src, tex], { stdio: 'inherit' });
    execFileSync(process.execPath, [self, 'geo', tex, out, String(ratioOverride ?? MODELS[slug].ratio)], { stdio: 'inherit' });
    console.log(`${slug}: ${(statSync(src).size / 2 ** 20).toFixed(1)}MB → ${(statSync(out).size / 2 ** 20).toFixed(2)}MB`);
  }
}
