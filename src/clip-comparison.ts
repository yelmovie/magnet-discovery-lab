import type { Trial } from './trial-records';

// Compare recorded travel along the same line, enlarged by the same factor in both pictures.
export function clipStops(trials: Trial[] = []): [number, number] | null {
  const travel = (key: string) => {
    const t = trials.find(t => t.key === key && t.outcome === 'success');
    const start = t?.initialObjects.find(o => o.id === 'clip');
    const magnet = t?.initialObjects.find(o => o.id === 'magnet');
    const end = t?.objects.find(o => o.id === 'clip');
    return start && end && magnet ? { start, magnet, length: Math.hypot(start.x-end.x, start.y-end.y) } : null;
  };
  const a = travel('near'), b = travel('paper');
  if (!a || !b || !Number.isFinite(a.length+b.length) || a.length<=0 || b.length<=0 || b.length>=a.length ||
      Math.hypot(a.start.x-b.start.x,a.start.y-b.start.y)>.1 || Math.hypot(a.magnet.x-b.magnet.x,a.magnet.y-b.magnet.y)>.1) return null;
  return [132, 132*b.length/a.length];
}
const clip = '<svg x="-26" y="-26" width="52" height="52" viewBox="0 0 512 512" overflow="hidden"><image href="/assets/quest/material-kit.webp" width="1536" height="1024"/></svg>';
export function clipCompareView(stops: [number,number]) {
  const card = (d:number,i:number) => {
    const start=252, end=start-d, y=57;
    return `<figure class="pull-card"><figcaption>${i?'종이 한 장':'종이 없이'}</figcaption><svg aria-hidden="true" viewBox="0 0 300 106"><path d="M18 77H280" stroke="#dbccb0" stroke-width="2"/>
      <g opacity=".27" transform="translate(${start} ${y})">${clip}</g>
      <path d="M${start} 88H${end}" fill="none" stroke="#338078" stroke-width="2.5" stroke-dasharray="4 4"/><path d="M${end+7} 83l-7 5 7 5" fill="none" stroke="#338078" stroke-width="2.5"/>
      <svg x="17" y="42" width="88" height="32" viewBox="60 370 1420 285" preserveAspectRatio="none" overflow="hidden"><image href="/assets/quest/magnet-bar.webp" width="1536" height="1024"/></svg>
      <g fill="white" font-size="14" font-weight="bold" text-anchor="middle"><text x="40" y="63">N</text><text x="83" y="63">S</text></g>
      ${i?`<image x="${end-39}" y="11" width="24" height="66" preserveAspectRatio="none" href="/assets/quest/prop-paper-sheet.webp"/>`:''}
      <g data-travel="${d}" transform="translate(${end} ${y})">${clip}</g></svg><p>${i?'종이 앞에서 멈췄어':'자석에 닿았어'}</p></figure>`;
  };
  return `<section class="clip-comparison" aria-label="같은 자리에서 놓은 철 클립의 움직임"><strong>같은 자리에서 놓은 철 클립</strong><div>${stops.map(card).join('')}</div></section>`;
}
export const pullEase=(t:number)=>Math.min(1,Math.max(0,(t-.14)/.70))**2;

