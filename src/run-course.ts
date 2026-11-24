// The 3D course's screen layer: buttons, prompts and progress in HTML, plus loading and the way back to the bench.
import type { Activity } from './domain';
import type { Surface } from './mission-surface';
import { delivery, type DeliveryRun, type DeliveryState } from './missions-remote';
import { bindRunInput } from './run-input';
import { arrivalHint, practiceEnd, setRunBlocked, shouldAutoLower } from './run-stage-rules';
import type { RunStage } from './run-stage';
import './run-course.css';

const arrow = (direction: string, label: string, glyph: string) => `<button type="button" data-run-dir="${direction}" aria-label="${label}"><span aria-hidden="true">${glyph}</span></button>`;
export function runCourseMarkup(): string {
  return `<div class="run-stage" data-run-stage><p class="run-loading" role="status">3D 길을 준비하고 있어…</p></div>
<ol class="run-progress" aria-label="달리기 진행"><li data-run-step="0">연습 길</li><li data-run-step="1">1구간 · 중간역</li><li data-run-step="2">2구간 · 유리 보관실</li></ol>
<p class="run-tip" role="status" aria-live="polite" hidden></p>
<div class="run-magnet" role="img" aria-label="내 자석"><span>내 자석</span><i data-run-pole="rear"></i><i data-run-pole="front"></i><b></b></div>
<div class="run-pad" role="group" aria-label="이동 방향판">${arrow('up', '앞으로', '▲')}${arrow('left', '왼쪽으로', '◀')}${arrow('right', '오른쪽으로', '▶')}${arrow('down', '뒤로', '▼')}</div>
<div class="run-controls"><button type="button" class="run-jump" data-run="jump" aria-label="점프">점프</button></div>
<details class="run-model-note"><summary>게임과 실제 과학</summary><p>설명 모형이야. 실제 자석의 힘은 자석과 거리에 따라 달라져.</p></details>`;
}

// The scene outlives the re-render that follows each stop, so the runner stays where she was.
let live: { a: Activity; stage: RunStage; timer: number } | undefined;
let pending: { a: Activity; stage: Promise<RunStage> } | undefined;
export const captureRunFrame = (a: Activity) => live?.a === a ? live.stage.capture() : undefined;
function canDraw() {
  try { const canvas = document.createElement('canvas'); return !!(canvas.getContext('webgl2') || canvas.getContext('webgl')); } catch { return false; }
}
function acquire(a: Activity, onLost: () => void): Promise<RunStage> {
  if (live?.a === a) { window.clearTimeout(live.timer); return Promise.resolve(live.stage); }
  if (pending?.a === a) return pending.stage;
  if (live) { window.clearTimeout(live.timer); live.stage.dispose(); live = undefined; }
  if (!canDraw()) return Promise.reject(new Error('WebGL is not available'));
  const stage = import('./run-stage').then(module => module.createRunStage(a, onLost)).then(created => {
    if (pending?.stage === stage) pending = undefined;
    live = { a, stage: created, timer: 0 }; return created;
  }, error => { if (pending?.stage === stage) pending = undefined; throw error; });
  pending = { a, stage };
  return stage;
}
function release() {
  if (!live) return;
  const kept = live; window.clearTimeout(kept.timer);
  kept.timer = window.setTimeout(() => { if (live === kept) { kept.stage.dispose(); live = undefined; } }, 250);
}

export function bindRunCourse(v: Surface) {
  const root = v.c.root, board = root.querySelector<HTMLElement>('.mission-board')!, host = root.querySelector<HTMLElement>('[data-run-stage]')!;
  const tip = root.querySelector<HTMLElement>('.run-tip')!, chip = root.querySelector<HTMLElement>('.run-magnet')!, hold = root.querySelector<HTMLButtonElement>('[data-mission="detach"]');
  let stage: RunStage | undefined, stopped = false, shownTip = '', shownChip = '', lastCar = NaN, stillFrames = 0, loweredAt = -1e9;
  const blocked = () => !stage || document.hidden || root.inert || !!root.querySelector('.puzzle-crisis') || !!document.querySelector('dialog[open],.modal-backdrop');
  const input = bindRunInput(root, blocked, { flip: () => root.querySelector<HTMLButtonElement>('[data-mission="flip"]')?.click(), hold: () => hold?.click() });
  const toBench = (text: string) => { setRunBlocked(true); v.c.notify(text); v.c.refresh(); };
  function paint(state: DeliveryState) {
    // Bringing the cart into the flag bay is the task; the runner then lowers the magnet herself.
    if (stage && shouldAutoLower(state, stage.held)) { stage.held = false; loweredAt = performance.now(); }
    const held = stage?.held ?? true, s = stage?.s ?? -99;
    // The bench's own status line is hidden on the 3D course, so the arrival hints come through the tip.
    stillFrames = Math.abs(state.car - lastCar) < 1e-4 ? stillFrames + 1 : 0; lastCar = state.car;
    const arrival = !stage?.message && s >= practiceEnd ? arrivalHint(state, held, stillFrames > 15, performance.now() - loweredAt < 3000) : '';
    const text = stage?.message || arrival;
    // While the tip explains the arrival, the bench status line would repeat it.
    if (board.hasAttribute('data-run-arrival') !== !!arrival) board.toggleAttribute('data-run-arrival', !!arrival);
    board.dataset.runZone = s < practiceEnd ? 'practice' : 'delivery'; board.dataset.runAt = s.toFixed(1);
    if (text !== shownTip) { shownTip = text; tip.textContent = text; tip.hidden = !text; }
    const front = state.pole === 'N' ? 'S' : 'N', key = `${state.pole}${held}`;
    if (key !== shownChip) {
      shownChip = key;
      chip.setAttribute('aria-label', `내 자석. 뒤쪽 ${state.pole}극, 앞쪽 ${front}극. ${held ? '들고 있어' : '내렸어'}.`);
      const [rear, ahead] = chip.querySelectorAll<HTMLElement>('[data-run-pole]');
      rear.textContent = state.pole; rear.dataset.pole = state.pole; ahead.textContent = front; ahead.dataset.pole = front;
      chip.querySelector('b')!.textContent = held ? '들고 있어' : '내렸어'; chip.dataset.held = String(held);
      if (hold) { hold.textContent = held ? '자석 내리기' : '자석 들기'; hold.setAttribute('aria-pressed', String(!held)); }
    }
    const step = s < practiceEnd && state.round === 0 && !state.done ? 0 : state.round + 1;
    root.querySelectorAll<HTMLElement>('[data-run-step]').forEach(item => {
      const index = Number(item.dataset.runStep), done = index < step || index === step && state.done;
      item.dataset.state = done ? 'done' : index === step ? 'now' : 'next';
      if (index === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
  }
  // The helper robot keeps its corner: when it stands beside the pad's rows, the pad starts to its right.
  const clearHelper = () => {
    const helper = document.querySelector('.coach-toggle')?.getBoundingClientRect(), pad = root.querySelector('.run-pad')?.getBoundingClientRect(), bench = board.getBoundingClientRect();
    const beside = !!helper && !!pad && helper.width > 0 && helper.bottom > pad.top && helper.top < pad.bottom && helper.right > bench.left;
    board.style.setProperty('--run-pad-left', beside ? `${Math.ceil(helper!.right - bench.left + 14)}px` : '0px');
  };
  const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(clearHelper) : undefined;
  watcher?.observe(board); window.addEventListener('resize', clearHelper);
  v.cleanups.push(() => { watcher?.disconnect(); window.removeEventListener('resize', clearHelper); });
  const run: DeliveryRun = {
    walk: dt => stage ? stage.step(blocked() ? 0 : dt, input.read()) : null,
    show: state => { stage?.show(state); paint(state); },
  };
  v.button('detach', () => {
    if (!stage || blocked()) return;
    stage.held = !stage.held;
    v.tell(stage.held ? '자석을 들었어. 수레 가까이 가져가 봐.' : '자석을 내렸어. 수레가 조금 더 굴러 멈추는지 봐.');
    v.draw();
  });
  delivery(v, run);
  acquire(v.a, () => toBench('3D 그림이 끊겨서 2D 화면으로 바꿨어. 하던 배달은 그대로 이어져.')).then(created => {
    if (stopped) { release(); return; }
    stage = created; created.attach(host); host.querySelector('.run-loading')?.remove(); board.dataset.runReady = 'true'; clearHelper(); v.draw();
  }, () => { if (!stopped) toBench('이 기기에서는 3D 길을 열 수 없어서 2D 화면으로 바꿨어.'); });
  v.cleanups.push(() => { stopped = true; input.destroy(); if (stage) release(); });
}
