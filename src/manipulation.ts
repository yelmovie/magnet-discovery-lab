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
export function bindDrag(c: Context, id: string, start: Point, end: (p: Point) => void, move?: (p: Point) => void, constrain: (p: Point) => Point = p => p): () => void {
  const el = c.root.querySelector<HTMLElement>(`[data-drag="${id}"]`);
  if (!el) return () => {};
  const board = el.closest<HTMLElement>('.play-board')!;
  c.a.points[`initial:${id}`] ||= { ...start };
  let p = constrain({ ...start }), active = false, travelled = false, pointer = -1, anchor = { x: 0, y: 0 }, offset = { x: 0, y: 0 };
  const draw = () => { el.style.left = `${p.x}%`; el.style.top = `${p.y}%`; };
  // A science model may snap, return, or animate a piece after a drop. Read its
  // visible position before the next input, including uncommitted arrow moves.
  const syncPosition = () => { const x=Number.parseFloat(el.style.left),y=Number.parseFloat(el.style.top);if(Number.isFinite(x)&&Number.isFinite(y)&&el.style.left.endsWith('%')&&el.style.top.endsWith('%'))p={x,y}; };
  const releasePointer = () => { const captured=pointer;pointer=-1;if(captured>=0&&el.hasPointerCapture(captured))el.releasePointerCapture(captured); };
  const unavailable = () => (el as HTMLButtonElement).disabled || c.root.inert;
  const location = (e: PointerEvent) => { const r = board.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }; };
  el.addEventListener('pointerdown', e => {
    if (!(e instanceof PointerEvent) || e.button !== 0 || !e.isPrimary || active || unavailable() || document.querySelector('.modal-backdrop')) return;
    syncPosition();
    e.preventDefault(); active = true; travelled = false; pointer = e.pointerId; anchor = { ...p }; const q = location(e); offset = { x: p.x - q.x, y: p.y - q.y };
    el.setPointerCapture(pointer); el.classList.add('dragging'); el.focus({ preventScroll: true });
  });
  el.addEventListener('pointermove', e => {
    if (!active || !(e instanceof PointerEvent) || e.pointerId !== pointer) return;
    const q = location(e); p = constrain({ x: clamp(q.x + offset.x), y: clamp(q.y + offset.y, 12, 89) }); travelled ||= Math.hypot(p.x - anchor.x, p.y - anchor.y) > .5; draw(); move?.(p);
  });
  el.addEventListener('pointerup', e => {
    if (!active || !(e instanceof PointerEvent) || e.pointerId !== pointer) return;
    active = false; el.classList.remove('dragging'); releasePointer();
    syncPosition();
    if (travelled) { c.a.points[id] = { ...p }; end({ ...p }); }
    else el.dispatchEvent(new CustomEvent('piece-select', {bubbles:true}));
  });
  const cancel = () => { if (!active) { releasePointer(); return; } active = false; el.classList.remove('dragging'); syncPosition();c.a.points[id] = { ...p }; c.touch();releasePointer(); };
  el.addEventListener('pointercancel', cancel); el.addEventListener('lostpointercapture', cancel);
  el.addEventListener('keydown', e => {
    if (unavailable() || document.querySelector('.modal-backdrop')) return;
    syncPosition();
    const step = e.shiftKey ? 1 : 4;
    const dir: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    if (dir[e.key]) { e.preventDefault(); p = constrain({ x: clamp(p.x + dir[e.key].x), y: clamp(p.y + dir[e.key].y, 12, 89) }); draw(); move?.(p); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.a.points[id] = { ...p }; end({ ...p }); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); c.refresh(); }
  });
  el.addEventListener('piece-place', e => {
    if (unavailable() || document.querySelector('.modal-backdrop')) return;
    p = constrain((e as CustomEvent<Point>).detail); draw(); move?.(p); c.a.points[id] = { ...p }; end({ ...p });
  });
  window.addEventListener('blur', cancel); window.addEventListener('resize', cancel); document.addEventListener('visibilitychange', cancel);
  return () => { cancel(); window.removeEventListener('blur', cancel); window.removeEventListener('resize', cancel); document.removeEventListener('visibilitychange', cancel); };
}
export const placementControls = `<div class="placement-controls" aria-label="선택한 물체 이동"><span data-selected-label>물체를 눌러 골라 줘</span><button data-drag-dir="ArrowUp" aria-label="선택 물체 위로">↑</button><button data-drag-dir="ArrowLeft" aria-label="선택 물체 왼쪽으로">←</button><button data-drag-dir="ArrowDown" aria-label="선택 물체 아래로">↓</button><button data-drag-dir="ArrowRight" aria-label="선택 물체 오른쪽으로">→</button><button data-drag-drop>놓기</button></div>`;
export function bindPlacement(root: HTMLElement): () => void {
  let selected: HTMLElement | null = null;
  const controller = new AbortController();
  const select = (piece:HTMLElement) => {
    selected?.classList.remove('piece-selected');selected?.setAttribute('aria-pressed','false');selected=piece;piece.classList.add('piece-selected');piece.setAttribute('aria-pressed','true');
    const label=root.querySelector('[data-selected-label]');if(label)label.textContent=piece.getAttribute('aria-label')!.split('.')[0];
  };
  const place = (event:MouseEvent) => {
    const board=(event.target as HTMLElement).closest('.play-board');if(!selected||!board)return;
    const rect=board.getBoundingClientRect();selected.dispatchEvent(new CustomEvent('piece-place',{detail:{x:clamp((event.clientX-rect.left)/rect.width*100),y:clamp((event.clientY-rect.top)/rect.height*100,12,89)}}));
  };
  let press: {id:number;x:number;y:number}|null=null;
  const cancelPress=()=>{press=null;};
  root.addEventListener('piece-select',event=>{const piece=(event.target as HTMLElement).closest<HTMLElement>('[data-drag]');if(piece)select(piece);},{signal:controller.signal});
  root.addEventListener('pointerdown',event=>{if(!event.isPrimary)return;const target=event.target as HTMLElement;press=selected&&event.button===0&&target.closest('.play-board')&&!target.closest('button')?{id:event.pointerId,x:event.clientX,y:event.clientY}:null;},{signal:controller.signal});
  root.addEventListener('pointerup',event=>{const start=press;press=null;if(start&&start.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<10)place(event);},{signal:controller.signal});
  root.addEventListener('pointercancel',cancelPress,{signal:controller.signal});
  root.addEventListener('lostpointercapture',cancelPress,{signal:controller.signal});
  window.addEventListener('resize',cancelPress,{signal:controller.signal});
  window.addEventListener('blur',cancelPress,{signal:controller.signal});
  document.addEventListener('visibilitychange',cancelPress,{signal:controller.signal});
  root.addEventListener('click', e => {
    const target = e.target as HTMLElement, piece = target.closest<HTMLElement>('[data-drag]');
    if (piece) {
      select(piece);
    } else if (selected && target.closest('.play-board') && !target.closest('button')) {
      // Physical taps/clicks already committed on pointerup. Keep programmatic
      // click activation available without running a physical placement twice.
      if(e.detail===0)place(e);
    } else if (selected && target.closest('[data-drag-dir], [data-drag-drop]')) {
      const b = target.closest<HTMLElement>('[data-drag-dir], [data-drag-drop]')!;
      selected.dispatchEvent(new KeyboardEvent('keydown', { key: b.dataset.dragDir || 'Enter', bubbles: true }));
    }
  }, { signal: controller.signal });
  return () => controller.abort();
}
