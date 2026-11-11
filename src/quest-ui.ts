import { icon, mascot } from './art';

const escapeText = (value: unknown): string => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

export interface QuestHudOptions {
  home?: boolean;
  homeLabel?: string;
  back?: boolean;
  canBack?: boolean;
  first?: boolean;
  teacher?: boolean;
}

/** Shared navigation and settings float over the world. */
export function questHud({ home = true, homeLabel = '지도로 가요', back = true, canBack = true, first = false, teacher = false }: QuestHudOptions = {}): string {
  const control = (action: string, label: string, graphic: string, extra = '', caption = '') => `<button type="button" class="quest-icon" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(graphic, 27)}${caption}</button>`;
  const settings=control('settings',teacher?'교사용 해금 중 · 설정을 열어요':'설정을 열어요','gear','',teacher?'<span class="teacher-hud-label">교사</span>':'');
  return `<nav class="quest-hud" aria-label="화면 이동과 설정"><div class="quest-hud-left">${!first && home ? control('home', homeLabel, 'home') : ''}${!first && back ? control('back', '이전 화면으로 가요', 'back', canBack ? '' : 'disabled') : ''}</div><div class="quest-hud-right">${settings}</div></nav>`;
}

export interface QuestCompanionOptions {
  message: string;
  mood?: number | string;
  type?: 'mili' | 'dangi';
  open?: boolean;
  pending?: boolean;
}

/** Root binds the button to toggle its own speech bubble; feedback never opens it. */
export function questCompanion({ message, mood = 0, type = 'dangi', open = false, pending = false }: QuestCompanionOptions): string {
  const pose = typeof mood === 'number' ? Math.min(3, Math.max(0, mood)) : ({ calm: 0, curious: 1, thinking: 2, happy: 3, success: 3 }[mood] ?? 0);
  const name = type === 'mili' ? '밀이' : '당이';
  return `<div class="quest-companion quest-companion-${type}${pending ? ' has-news' : ''}${open ? ' is-speaking' : ''}"><button type="button" class="quest-character" data-action="companion" data-companion-type="${type}" aria-label="${name}의 도움말을 ${open ? '닫아요' : '들어요'}" aria-expanded="${open}" aria-controls="quest-speech-${type}"><span class="quest-talk-mark" aria-hidden="true">${pending ? '!' : '…'}</span>${mascot(type, 116, pose)}</button><p id="quest-speech-${type}" class="quest-speech" role="status" ${open ? '' : 'hidden'}><strong>${name}</strong><span>${escapeText(message)}</span></p></div>`;
}

/** The opening keeps only the invitation, the two ways in and the city's helpers. */
export function questTitle(save: { started: boolean }, teacher=false): string {
  const arrow = icon('arrow', 27);
  const startButton = save.started
    ? '<button type="button" class="quest-cta quest-cta-secondary" data-action="new">시작하기</button>'
    : `<button type="button" class="quest-cta quest-start" data-action="start">시작하기${arrow}</button>`;
  const continueButton = save.started
    ? `<button type="button" class="quest-cta quest-start" data-action="start">이어하기${arrow}</button>`
    : '<button type="button" class="quest-cta quest-cta-secondary" disabled>이어하기</button>';
  return `<section class="quest-title" aria-label="밀고 당기는 도시">
    <div class="quest-title-glow" aria-hidden="true"></div>
    <div class="quest-title-content">
      <div class="quest-title-brand"><img class="quest-title-logo" src="/assets/quest/logo.webp" alt="밀고 당기는 도시" width="1774" height="887" fetchpriority="high"></div>
      <h1 class="quest-title-subtitle">멈춘 도시를 <br>다시 움직여 줘!</h1>
      <div class="quest-title-stage">
        <div class="quest-title-friend quest-title-friend-left">${questCompanion({ type: 'mili', message: '자석에 붙는 물건, 직접 찾아보자!' })}</div>
        <div class="quest-title-actions">${teacher?`<button type="button" class="quest-cta quest-start" data-action="city">교사용 지도 열기${arrow}</button>`:startButton+continueButton}</div>
        <div class="quest-title-friend quest-title-friend-right">${questCompanion({ type: 'dangi', message: '단서를 모아 우리만의 발명품을 만들자!' })}</div>
      </div>
    </div>
  </section>`;
}
