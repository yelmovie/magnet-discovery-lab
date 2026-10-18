import type { Point } from './domain';
import type { Context } from './activity-types';

export const clamp = (n: number, lo = 6, hi = 94) => Math.max(lo, Math.min(hi, n));
export const near = (a: Point, b: Point, radius = 13) => Math.hypot(a.x - b.x, a.y - b.y) <= radius;
export function draggable(id: string, label: string, p: Point, art: string, cls = ''): string {
  return `<button type="button" class="drag-piece ${cls}" data-drag="${id}" style="left:${p.x}%;top:${p.y}%" aria-label="${label}. 끌어서 이동. 키보드는 방향키로 이동하고 Enter로 놓기.">${art}</button>`;
}
export function spot(p: Point, label: string, cls = ''): string {
  return `<div class="drop-spot ${cls}" style="left:${p.x}%;top:${p.y}%">${label}</div>`;
}
export function bindDrag(c: Context, id: string, start: Point, end: (p: Point) => void, move?: (p: Point) => void): () => void {
  const el = c.root.querySelector<HTMLElement>(`[data-drag="${id}"]`);
  if (!el) return () => {};
  const board = el.closest<HTMLElement>('.play-board')!;
  c.a.points[`initial:${id}`] ||= { ...start };
  let p = { ...start }, active = false, travelled = false, pointer = -1, anchor = { x: 0, y: 0 }, offset = { x: 0, y: 0 };
  const draw = () => { el.style.left = `${p.x}%`; el.style.top = `${p.y}%`; };
  const location = (e: PointerEvent) => { const r = board.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }; };
  el.addEventListener('pointerdown', e => {
    if (!(e instanceof PointerEvent) || e.button !== 0 || !e.isPrimary || active || document.querySelector('.modal-backdrop')) return;
    e.preventDefault(); active = true; travelled = false; pointer = e.pointerId; anchor = { ...p }; const q = location(e); offset = { x: p.x - q.x, y: p.y - q.y };
    el.setPointerCapture(pointer); el.classList.add('dragging'); el.focus({ preventScroll: true });
  });
  el.addEventListener('pointermove', e => {
    if (!active || !(e instanceof PointerEvent) || e.pointerId !== pointer) return;
    const q = location(e); p = { x: clamp(q.x + offset.x), y: clamp(q.y + offset.y, 12, 89) }; travelled ||= Math.hypot(p.x - anchor.x, p.y - anchor.y) > .5; draw(); move?.(p);
  });
  el.addEventListener('pointerup', e => {
    if (!active || !(e instanceof PointerEvent) || e.pointerId !== pointer) return;
    active = false; el.classList.remove('dragging'); if (el.hasPointerCapture(pointer)) el.releasePointerCapture(pointer);
    if (travelled) { c.a.points[id] = { ...p }; end({ ...p }); }
  });
  const cancel = () => { if (!active) return; active = false; el.classList.remove('dragging'); c.a.points[id] = { ...p }; c.touch(); };
  el.addEventListener('pointercancel', cancel); el.addEventListener('lostpointercapture', cancel);
  el.addEventListener('keydown', e => {
    if (document.querySelector('.modal-backdrop')) return;
    const step = e.shiftKey ? 1 : 4;
    const dir: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    if (dir[e.key]) { e.preventDefault(); p = { x: clamp(p.x + dir[e.key].x), y: clamp(p.y + dir[e.key].y, 12, 89) }; draw(); move?.(p); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.a.points[id] = { ...p }; end({ ...p }); }
    if (e.key === 'Escape') { e.preventDefault(); active = false; c.touch(); c.refresh(); }
  });
  el.addEventListener('piece-place', e => {
    if (document.querySelector('.modal-backdrop')) return;
    p = (e as CustomEvent<Point>).detail; draw(); move?.(p); c.a.points[id] = { ...p }; end({ ...p });
  });
  window.addEventListener('blur', cancel); window.addEventListener('resize', cancel); document.addEventListener('visibilitychange', cancel);
  return () => { cancel(); window.removeEventListener('blur', cancel); window.removeEventListener('resize', cancel); document.removeEventListener('visibilitychange', cancel); };
}
export const placementControls = `<div class="placement-controls" aria-label="선택한 물체 이동"><span data-selected-label>물체를 눌러 골라 줘</span><button data-drag-dir="ArrowUp" aria-label="선택 물체 위로">↑</button><button data-drag-dir="ArrowLeft" aria-label="선택 물체 왼쪽으로">←</button><button data-drag-dir="ArrowDown" aria-label="선택 물체 아래로">↓</button><button data-drag-dir="ArrowRight" aria-label="선택 물체 오른쪽으로">→</button><button data-drag-drop>놓기</button></div>`;
export function bindPlacement(root: HTMLElement): () => void {
  let selected: HTMLElement | null = null;
  const controller = new AbortController();
  root.addEventListener('click', e => {
    const target = e.target as HTMLElement, piece = target.closest<HTMLElement>('[data-drag]');
    if (piece) {
      selected?.classList.remove('piece-selected'); selected = piece; piece.classList.add('piece-selected');
      const label = root.querySelector('[data-selected-label]'); if (label) label.textContent = piece.getAttribute('aria-label')!.split('.')[0];
    } else if (selected && target.closest('.play-board') && !target.closest('button')) {
      const rect = target.closest('.play-board')!.getBoundingClientRect(), pointer = e as MouseEvent;
      selected.dispatchEvent(new CustomEvent('piece-place', { detail: { x: clamp((pointer.clientX - rect.left) / rect.width * 100), y: clamp((pointer.clientY - rect.top) / rect.height * 100, 12, 89) } }));
    } else if (selected && target.closest('[data-drag-dir], [data-drag-drop]')) {
      const b = target.closest<HTMLElement>('[data-drag-dir], [data-drag-drop]')!;
      selected.dispatchEvent(new KeyboardEvent('keydown', { key: b.dataset.dragDir || 'Enter', bubbles: true }));
    }
  }, { signal: controller.signal });
  return () => controller.abort();
}
