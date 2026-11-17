// Input for the 3D course: the on-screen pad, the action buttons and the keyboard become one state.
import { bindDirectionPad, mapKeyDirection, MAP_VECTORS, type MapPadDirection } from './map-controls.js';

/** x: right is positive. y: forward (up on the pad, away from the camera) is positive. */
export interface RunSteer { x: number; y: number; jump: boolean }
const typing = (target: EventTarget | null) => !!(target as Element | null)?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])');

export function bindRunInput(root: HTMLElement, blocked: () => boolean, actions: { flip(): void; hold(): void }) {
  const events = new AbortController(), signal = events.signal;
  const keys = new Map<string, MapPadDirection>();
  let touch: MapPadDirection | null = null, jump = false;
  const pad = bindDirectionPad(root, '[data-run-dir]', button => button.dataset.runDir as MapPadDirection, {
    press: direction => { touch = direction; }, release: () => { touch = null; }, cancel: () => { touch = null; }, blocked, signal,
  });
  const clear = () => { keys.clear(); touch = null; jump = false; };
  document.addEventListener('keydown', event => {
    if (blocked() || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || typing(event.target)) return;
    const direction = mapKeyDirection(event);
    if (direction) { keys.set(event.code || event.key, direction); event.preventDefault(); return; }
    // A focused button keeps Space and Enter for itself, so keyboard users can still press it.
    if ((event.target as Element | null)?.closest?.('button,a,summary')) return;
    if (event.code === 'Space') { if (!event.repeat) jump = true; event.preventDefault(); }
    else if (event.code === 'KeyF' && !event.repeat) actions.flip();
    else if (event.code === 'KeyE' && !event.repeat) actions.hold();
  }, { signal });
  document.addEventListener('keyup', event => { keys.delete(event.code || event.key); }, { signal });
  window.addEventListener('blur', clear, { signal });
  document.addEventListener('visibilitychange', clear, { signal });
  const jumpButton = root.querySelector<HTMLButtonElement>('[data-run="jump"]');
  jumpButton?.addEventListener('pointerdown', event => { if (!blocked() && event.button <= 0) { jump = true; event.preventDefault(); } }, { signal });
  jumpButton?.addEventListener('click', event => { if (!blocked() && event.detail === 0) jump = true; }, { signal });
  // After a tap the button gives focus back, so Space jumps again instead of pressing it twice.
  root.addEventListener('click', event => { const button = (event.target as Element).closest<HTMLElement>('.run-controls button, .run-pad button, .mission-actions button'); if (button && event.detail > 0) button.blur(); }, { signal });
  return {
    read(): RunSteer {
      const steer = { x: 0, y: 0, jump };
      jump = false;
      if (blocked()) return { x: 0, y: 0, jump: false };
      for (const direction of new Set([...keys.values(), ...(touch ? [touch] : [])])) { steer.x += MAP_VECTORS[direction].x; steer.y -= MAP_VECTORS[direction].y; }
      return steer;
    },
    destroy() { clear(); pad.destroy(); events.abort(); },
  };
}
