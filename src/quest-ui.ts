import { icon, mascot } from './art';

const escapeText = (value: unknown): string => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

export interface QuestHudOptions {
  home?: boolean;
  back?: boolean;
  sound?: boolean;
  canBack?: boolean;
  first?: boolean;
}

/** The four shared controls float over the world; they never create a header bar. */
export function questHud({ home = true, back = true, sound = true, canBack = true, first = false }: QuestHudOptions = {}): string {
  const control = (action: string, label: string, graphic: string, extra = '') => `<button type="button" class="quest-icon" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(graphic, 27)}</button>`;
  return `<nav class="quest-hud" aria-label="화면과 소리 설정"><div class="quest-hud-left">${!first && home ? control('home', '시작 화면으로 가요', 'home') : ''}${!first && back ? control('back', '이전 화면으로 가요', 'back', canBack ? '' : 'disabled') : ''}</div><div class="quest-hud-right">${control('sound', sound ? '소리를 꺼요' : '소리를 켜요', sound ? 'sound' : 'mute', `aria-pressed="${sound}"`)}${control('settings', '설정을 열어요', 'gear')}</div></nav>`;
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

/** Only a title, one subtitle and the primary action belong on the first screen. */
export function questTitle(save: { started: boolean }): string {
  return `<section class="quest-title" aria-label="밀고 당기는 도시"><div class="quest-title-glow" aria-hidden="true"></div><div class="quest-title-brand"><img class="quest-title-logo" src="/assets/quest/logo.webp" alt="밀고 당기는 도시" width="1774" height="887" fetchpriority="high"><p class="quest-title-subtitle">밀이·당이와 함께, 자석으로 도시를 고쳐요</p></div><div class="quest-title-friend quest-title-friend-left">${questCompanion({ type: 'mili', message: '장치가 멈췄어요! 자석을 움직여 도시의 수리 대장이 되어 주세요.' })}</div><div class="quest-title-friend quest-title-friend-right">${questCompanion({ type: 'dangi', message: '발견한 도구를 다음 의뢰에 써요. 마지막에는 우리만의 발명품을 만들어요.' })}</div><div class="quest-title-actions"><button type="button" class="quest-cta quest-start" data-action="start">${save.started ? '이어서 탐험' : '탐험 시작'}${icon('arrow', 27)}</button>${save.started ? '<button type="button" class="quest-text-button" data-action="new">새로 시작</button>' : ''}</div></section>`;
}
