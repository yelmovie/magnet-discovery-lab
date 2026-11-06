import fs from 'node:fs/promises';
import sharp from 'sharp';

// Normalize generated sprite cells without repainting their artwork. Keep the PNG masters.
const source = 'assets/source/characters-pixel-20261101';
const output = 'public/assets/adventure';
const cuts = { mili: [0, 587, 1111, 1617, 2172], dangi: [0, 520, 1092, 1612, 2172] };
const cells = { poses: [], walk: [] };
for (const type of ['mili', 'dangi']) {
  for (const kind of ['poses', 'walk']) {
    const path = `${source}/${type}-${kind}.png`;
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rows = kind === 'walk' ? 4 : 1;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < 4; column++) {
        const left = kind === 'poses' ? cuts[type][column] : Math.round(column * info.width / 4);
        const right = kind === 'poses' ? cuts[type][column + 1] : Math.round((column + 1) * info.width / 4);
        const top = Math.round(row * info.height / rows), bottom = Math.round((row + 1) * info.height / rows);
        let x0 = right, x1 = left, y0 = bottom, y1 = top;
        for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
          if (data[(y * info.width + x) * 4 + 3] < 32) continue;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        if (x1 < x0) throw new Error(`Empty ${type} ${kind} ${row},${column}`);
        // Preserve edge alpha, including the thin outer pixel contours.
        x0 = Math.max(left, x0 - 2); y0 = Math.max(top, y0 - 2);
        x1 = Math.min(right - 1, x1 + 2); y1 = Math.min(bottom - 1, y1 + 2);
        cells[kind].push({ type, row, column, path, left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
      }
    }
  }
}
for (const kind of ['poses', 'walk']) {
  const width = kind === 'poses' ? 192 : 128, height = kind === 'poses' ? 256 : 128;
  const rows = kind === 'poses' ? 1 : 4, bottom = height - (kind === 'poses' ? 8 : 4);
  // Both characters share one scale, so gestures and walking frames do not resize the body.
  const scale = Math.min((width - 16) / Math.max(...cells[kind].map(c => c.width)), (height - 16) / Math.max(...cells[kind].map(c => c.height)));
  for (const type of ['mili', 'dangi']) {
    const sprites = [];
    for (const cell of cells[kind].filter(c => c.type === type)) {
      const { left, top, width: w, height: h } = cell;
      const sw = Math.round(w * scale), sh = Math.round(h * scale);
      const input = await sharp(cell.path).extract({ left, top, width: w, height: h }).resize(sw, sh, { kernel: 'nearest' }).png().toBuffer();
      sprites.push({ input, left: cell.column * width + Math.round((width - sw) / 2), top: cell.row * height + bottom - sh });
    }
    const path = `${output}/${type}-${kind}-pixel.webp`;
    await sharp({ create: { width: width * 4, height: height * rows, channels: 4, background: '#00000000' } }).composite(sprites).webp({ lossless: true }).toFile(path);
    console.log(`${path}: ${width * 4}x${height * rows}, ${(await fs.stat(path)).size} bytes`);
  }
}
