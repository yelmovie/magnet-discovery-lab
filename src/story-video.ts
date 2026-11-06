import { icon } from './art';
import { questRewards } from './mission-content';
import './story-video.css';

// Full-screen story films. The rendered mp4s carry effects and short sound effects only (scripts/render-story-videos.mjs);
// captions, place tags, district stamps and the closing card stay in the DOM so they stay sharp and editable.
// The game's BGM keeps playing underneath: main theme for the intro, finale theme for the ending page.
// side 'left' keeps the caption off a clue the shot is pointing at (bottom centre-right).
type Cue = [start: number, end: number, who: '밀이' | '당이', text: string, side?: 'left'];
type Film = {
  seconds: number; cardAt: number; label: string;
  places: [start: number, kicker: string, name: string][];
  cues: Cue[]; stamps?: number[]; glowAt?: number;
  card: (replay: boolean) => string;
};

const districts = ['생활', '재료', '극', '원격', '발명'];
const films = {
  intro: {
    seconds: 17.5, cardAt: 16.2,
    label: '고장 난 자석 도시를 지나 연구소와 발명 공방으로 들어가는 인트로 영상',
    places: [[0, '긴급 수리 의뢰', '우편국 골목'], [5.2, '단서를 찾아라', '힘 실험 연구소'], [11.7, '나만의 발명', '시민 발명 공방']],
    cues: [
      [0.6, 4.9, '밀이', '큰일이야! 우편함은 안 잠기고\n택배 수레도 멈춰 버렸어.'],
      [5.4, 8.3, '당이', '돋보기로 봐! 철 클립만\n자석에 착 붙어 있어.', 'left'],
      [8.2, 12.4, '밀이', '무엇이 붙고 무엇이 안 붙는지\n직접 실험하면 고칠 방법이 보여.', 'left'],
      [12.5, 16.1, '당이', '다섯 구역을 고치고 나면\n여기서 네 발명품을 만들 차례야!'],
    ],
    card: replay => `<span class="story-card-kicker">오늘의 수리 의뢰</span><h2 class="story-card-title">수리 대장은 바로 너!</h2><p class="story-card-line">자석을 직접 움직여 다섯 구역을 고쳐 줘.</p><ul class="story-card-rewards" aria-label="받을 수 있는 보상"><li>${icon('flask', 22)}구역마다 새 도구</li><li>${icon('spark', 22)}도시 축제</li><li>${icon('check', 22)}연구원 인증서</li></ul><button type="button" class="story-finish" data-story="finish">${replay ? '돌아가기' : `밀이·당이와 출발! ${icon('arrow', 24)}`}</button>`,
  },
  final: {
    seconds: 17.4, cardAt: 16,
    label: '학생의 발명품이 성공하고 다시 움직이는 도시와 축제 광장의 메달을 보여 주는 엔딩 영상',
    places: [[0, '발명품 시험 운행', '시민 발명 공방'], [5.3, '다시 움직이는 도시', '원격 제어 구역'], [10.73, '도시 축제', '중앙 광장']],
    cues: [
      [0.3, 3.5, '밀이', '네가 설계한 발명품이야.\n자석으로 당겨 볼게!'],
      [3.6, 6.5, '당이', '택배가 안전하게 도착했어!\n완벽한 성공이야.'],
      [6.6, 9.7, '밀이', '봐! 수조도 맑아지고\n택배 수레도 다시 달려.'],
      [9.8, 12.7, '당이', '닫힌 우편함까지…\n네 실험이 도시를 바꿨어.'],
      [12.9, 15.9, '밀이', '다섯 구역 복구 완료!\n오늘의 주인공은 바로 너야.'],
    ],
    // One district lights up per beat of the recap; all five glow with the fanfare.
    stamps: [5.6, 6.6, 7.6, 8.6, 9.6], glowAt: 11,
    card: () => `<span class="story-card-badge">도시 복구 100%</span><h2 class="story-card-title">자석 도시 복구 연구원 탄생!</h2><p class="story-card-line">네 발견 다섯 개가 멈춘 도시를 다시 움직였어.<br>인증서에 네 이름을 새겨 볼까?</p><button type="button" class="story-finish" data-story="finish">인증서 받으러 가기 ${icon('arrow', 24)}</button>`,
  },
} satisfies Record<string, Film>;
export type FilmId = keyof typeof films;

export interface StoryOptions {
  /** Effects setting: the film's own sound effects play only when it is on. */
  effects: boolean;
  /** Motion setting off → wait for an explicit play instead of autoplaying. */
  motion: boolean;
  /** Replays from settings close straight away instead of jumping to the closing card. */
  replay?: boolean;
  onDone: () => void;
}

/** Index of the last start time already passed, or -1. */
const reached = (starts: number[], t: number) => starts.reduce((last, start, i) => (t >= start ? i : last), -1);
const pauseIcon ='<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';

/** Opens the film over the whole screen. Returns an idempotent cleanup. */
export function playStory(id: FilmId, options: StoryOptions): () => void {
  const film: Film = films[id], base = `/video/story/${id}`, replay = Boolean(options.replay);
  const app = document.querySelector<HTMLElement>('#app'), appWasInert = app?.inert ?? false;
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const layer = document.createElement('section');
  layer.className = `story-layer story-${id}`;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', film.label);
  layer.innerHTML = `<video class="story-video" playsinline preload="auto" poster="${base}-poster.webp" aria-label="${film.label}"></video>
    <img class="story-end" src="${base}-end.webp" alt="" hidden>
    <div class="story-shade" aria-hidden="true"></div>
    <p class="story-place" aria-hidden="true"><span class="story-place-kicker"></span><span class="story-place-name"></span></p>
    <div class="story-controls"><button type="button" class="story-icon-button" data-story="pause" aria-label="일시 정지">${pauseIcon}</button><button type="button" class="story-skip" data-story="skip">${replay ? '닫기' : '건너뛰기'} ${icon(replay ? 'close' : 'arrow', 22)}</button></div>
    <button type="button" class="story-play" data-story="play" hidden>${icon('play', 34)} 영상 보기</button>
    <div class="story-bottom">
      ${film.stamps ? `<ol class="story-stamps" aria-label="복구한 구역">${districts.map((name, i) => `<li data-stamp="${i}"><span class="story-stamp-seal" aria-hidden="true">${icon(questRewards[i].icon, 26)}</span><span>${name}</span></li>`).join('')}</ol>` : ''}
      <p class="story-caption" role="status" aria-live="polite"><span class="story-speaker"></span><span class="story-line"></span></p>
      <div class="story-card" hidden>${film.card(replay)}</div>
    </div>
    <div class="story-progress" aria-hidden="true"><span></span></div>`;
  document.body.append(layer);
  if (app) app.inert = true;

  const $ = <T extends HTMLElement>(selector: string) => layer.querySelector<T>(selector)!;
  const video = $<HTMLVideoElement>('video'), endFrame = $<HTMLImageElement>('.story-end'), caption = $('.story-caption');
  const skip = $<HTMLButtonElement>('[data-story="skip"]'), pause = $<HTMLButtonElement>('[data-story="pause"]'), play = $<HTMLButtonElement>('[data-story="play"]');
  const controller = new AbortController(), on = { signal: controller.signal };
  let closed = false, failed = false, cardShown = false, timeout = 0, lastCue = -2, lastPlace = -1;
  // Cue voices live here, not in playNarration: the film owns the audio while it is open.
  const voices = film.cues.map((_, i) => { const voice = new Audio(`/audio/voices/story-${id}-${i + 1}.mp3`); voice.preload = 'auto'; voice.volume = .95; return voice; });
  const hushVoices = () => { for (const voice of voices) voice.pause(); video.volume = .55; };
  const speakCue = (cue: number) => {
    hushVoices();
    const voice = voices[cue];
    if (!voice || video.muted || video.paused) return;
    video.volume = .25; voice.onended = () => { video.volume = .55; };
    voice.currentTime = 0; void voice.play().catch(() => { video.volume = .55; });
  };

  const showCard = () => {
    if (cardShown) return; cardShown = true;
    layer.classList.add('is-card'); caption.hidden = true; $('.story-card').hidden = false; pause.hidden = true;
    if (!replay) skip.hidden = true;
    $<HTMLButtonElement>('[data-story="finish"]').focus({ preventScroll: true });
  };
  const tick = () => {
    const t = video.currentTime || 0;
    $('.story-progress span').style.transform = `scaleX(${Math.min(1, t / film.seconds)})`;
    const cue = film.cues.findIndex(([start, end]) => t >= start && t < end);
    if (cue !== lastCue) {
      lastCue = cue; caption.classList.remove('is-on');
      if (cue >= 0) { const [, , who, text, side] = film.cues[cue]; $('.story-speaker').textContent = who; caption.dataset.who = who; caption.dataset.side = side ?? ''; $('.story-line').textContent = text; void caption.offsetWidth; caption.classList.add('is-on'); speakCue(cue); }
    }
    const place = reached(film.places.map(([start]) => start), t);
    if (place !== lastPlace && place >= 0) {
      lastPlace = place; const tag = $('.story-place'); tag.classList.remove('is-on');
      $('.story-place-kicker').textContent = film.places[place][1]; $('.story-place-name').textContent = film.places[place][2];
      void tag.offsetWidth; tag.classList.add('is-on');
    }
    if (film.stamps) {
      const lit = reached(film.stamps, t);
      layer.querySelectorAll('[data-stamp]').forEach((stamp, n) => { stamp.classList.toggle('is-lit', n <= lit || cardShown); stamp.classList.toggle('is-current', n === lit); });
      layer.classList.toggle('is-glow', t >= (film.glowAt ?? Infinity) || cardShown);
    }
    if (t >= film.cardAt) showCard();
  };
  const cleanup = () => {
    if (closed) return; closed = true;
    clearTimeout(timeout); controller.abort(); hushVoices();
    video.pause(); video.removeAttribute('src'); video.load();
    layer.remove();
    if (app) app.inert = appWasInert;
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  };
  const finish = () => { if (closed) return; cleanup(); options.onDone(); };
  // Missing or stalled video: show the last scene with the closing card so the story still lands.
  const fallback = () => { if (closed || failed) return; failed = true; clearTimeout(timeout); video.pause(); video.hidden = true; endFrame.hidden = false; play.hidden = true; showCard(); tick(); };
  const watchdog = () => { clearTimeout(timeout); timeout = window.setTimeout(fallback, 8000); };
  const start = () => {
    if (closed || failed) return; play.hidden = true; watchdog();
    // Unmuted autoplay can be refused when the click is too far back; the film still plays silently.
    video.play().catch(() => { if (closed || video.muted) throw new Error('blocked'); video.muted = true; return video.play(); })
      .catch(() => { if (closed || failed) return; clearTimeout(timeout); play.hidden = false; play.focus(); });
  };
  const skipAhead = () => {
    if (replay || cardShown) return finish();
    hushVoices();
    if (video.readyState >= 1) video.currentTime = film.cardAt;
    tick(); showCard();
  };

  video.addEventListener('playing', () => { clearTimeout(timeout); pause.setAttribute('aria-label', '일시 정지'); pause.innerHTML = pauseIcon; const voice = voices[lastCue]; if (voice && voice.currentTime > 0 && !voice.ended && !video.muted) void voice.play().catch(() => {}); }, on);
  video.addEventListener('pause', () => { for (const voice of voices) voice.pause(); if (!video.ended) { pause.setAttribute('aria-label', '계속 보기'); pause.innerHTML = icon('play', 26); } }, on);
  video.addEventListener('waiting', watchdog, on);
  video.addEventListener('timeupdate', tick, on);
  video.addEventListener('ended', () => { video.hidden = true; endFrame.hidden = false; tick(); showCard(); }, on);
  video.addEventListener('error', fallback, on);
  play.addEventListener('click', start, on);
  pause.addEventListener('click', () => { if (video.paused) start(); else video.pause(); }, on);
  skip.addEventListener('click', skipAhead, on);
  layer.addEventListener('click', event => { if ((event.target as HTMLElement).closest('[data-story="finish"]')) finish(); }, on);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); skipAhead(); return; }
    if (event.key !== 'Tab') return;
    const nodes = [...layer.querySelectorAll<HTMLElement>('button')].filter(node => node.getClientRects().length > 0);
    const first = nodes[0], last = nodes.at(-1), inside = layer.contains(document.activeElement);
    if (event.shiftKey && (!inside || document.activeElement === first)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (!inside || document.activeElement === last)) { event.preventDefault(); first?.focus(); }
  }, { ...on, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else if (!cardShown && options.motion && video.paused && video.currentTime > 0) start(); }, on);

  video.muted = !options.effects; video.volume = .55;
  video.src = `${base}.mp4`;
  skip.focus({ preventScroll: true });
  if (options.motion) start(); else play.hidden = false;
  tick();
  return cleanup;
}
