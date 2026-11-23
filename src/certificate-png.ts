import {finishCertificateWax} from './certificate-wax.js';
// Draw the same page geometry on a 2400px canvas without adding a dependency.
const LONG_SIDE = 2400;
async function loadImage(src: string) { const image = new Image(); image.src = src; await image.decode(); return image; }
export async function saveCertificatePng(paper: HTMLElement, filename: string) {
  finishCertificateWax(paper);
  await document.fonts.ready;
  for (const animation of paper.getAnimations({ subtree: true })) if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish();
  const box = paper.getBoundingClientRect(), scale = LONG_SIDE / box.width;
  const canvas = document.createElement('canvas'); canvas.width = LONG_SIDE; canvas.height = Math.round(box.height * scale);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff9e9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const x = (value: number) => (value - box.left) * scale, y = (value: number) => (value - box.top) * scale;
  const frame = paper.querySelector<HTMLImageElement>('.cert-frame');
  if (frame) ctx.drawImage(await loadImage(frame.src), 0, 0, canvas.width, canvas.height);
  for (const el of paper.querySelectorAll<HTMLElement>('.cert-content *')) {
    if (el.closest('[data-cert-export-ignore]')) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!r.width || !r.height || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const radius = parseFloat(cs.borderTopLeftRadius) * scale || 0;
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
      ctx.fillStyle = cs.backgroundColor; ctx.beginPath(); ctx.roundRect(x(r.left), y(r.top), r.width * scale, r.height * scale, radius); ctx.fill();
    }
    const bw = parseFloat(cs.borderBottomWidth);
    if (bw && cs.borderBottomStyle !== 'none') { ctx.fillStyle = cs.borderBottomColor; ctx.fillRect(x(r.left), y(r.bottom) - bw * scale, r.width * scale, bw * scale); }
    if (el.classList.contains('sprite-mascot')) {
      const src = cs.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
      if (src) { const image = await loadImage(src), pose = Number(el.style.getPropertyValue('--pose')) || 0; ctx.imageSmoothingEnabled = false; ctx.drawImage(image, image.width / 4 * pose, 0, image.width / 4, image.height, x(r.left), y(r.top), r.width * scale, r.height * scale); ctx.imageSmoothingEnabled = true; }
    } else if (el instanceof HTMLImageElement) ctx.drawImage(await loadImage(el.src), x(r.left), y(r.top), r.width * scale, r.height * scale);
  }
  for (const svg of paper.querySelectorAll<SVGSVGElement>('.cert-content svg')) {
    const r = svg.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const clone = svg.cloneNode(true) as SVGSVGElement; clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.style.color = getComputedStyle(svg).color;
    ctx.drawImage(await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))), x(r.left), y(r.top), r.width * scale, r.height * scale);
  }
  const walker = document.createTreeWalker(paper.querySelector('.cert-content')!, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    if (node.parentElement!.closest('[data-cert-export-ignore]')) continue;
    const cs = getComputedStyle(node.parentElement!); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * scale}px ${cs.fontFamily}`; ctx.fillStyle = cs.color; ctx.textBaseline = 'middle';
    const range = document.createRange();
    for (let i = 0; i < node.textContent.length; i++) {
      const ch = node.textContent[i]; if (/\s/.test(ch)) continue;
      range.setStart(node, i); range.setEnd(node, i + 1); const r = range.getBoundingClientRect();
      if (r.width && r.height) ctx.fillText(ch, x(r.left), y(r.top + r.height / 2));
    }
  }
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('png');
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
