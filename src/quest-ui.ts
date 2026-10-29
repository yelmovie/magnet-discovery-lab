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

/** A real mission and the saved journey give the illustrated city a purpose. */
export function questTitle(save: { started: boolean; evidence?: { stage: number }[]; completed?: number[]; final?: { complete: boolean } }): string {
  const districts = [
    ['생활 속 자석', '숨어 있는 힘 찾기', 'eye'],
    ['힘 실험 연구소', '재료와 거리 비교', 'flask'],
    ['극성 복원 센터', '밀고 당기는 규칙', 'spark'],
    ['원격 제어 구역', '손대지 않는 작전', 'map'],
    ['시민 발명 공방', '나만의 해결 도구', 'light'],
  ];
  const restored = new Set((save.evidence || []).map(item => item.stage));
  const count = restored.size;
  const current = districts.findIndex((_, index) => !restored.has(index));
  const finished = save.final?.complete === true;
  return `<section class="quest-title" aria-label="밀고 당기는 도시">
    <div class="quest-title-glow" aria-hidden="true"></div>
    <div class="quest-title-content">
      <div class="quest-title-brand"><p class="quest-title-kicker">초등 과학 · 자석 탐험</p><img class="quest-title-logo" src="/assets/quest/logo.webp" alt="밀고 당기는 도시" width="1774" height="887" fetchpriority="high"></div>
      <h1 class="quest-title-subtitle">멈춘 도시를<br>다시 움직여 줘!</h1>
      <p class="quest-title-intro">우편함부터 멈춘 택배까지.<br>자석의 비밀을 알아내고, 시민들의 불편을 해결하자.</p>
      <p class="quest-title-method"><span>직접 조작</span><i aria-hidden="true">→</i><span>규칙 발견</span><i aria-hidden="true">→</i><span>발명하기</span></p>
      <div class="quest-title-actions"><button type="button" class="quest-cta quest-start" data-action="start">${save.started ? '이어서 탐험하기' : '도시 탐험 시작'}${icon('arrow', 27)}</button>${save.started ? '<button type="button" class="quest-text-button" data-action="new">새로 시작</button>' : ''}</div>
      <p class="quest-title-save">${icon(finished ? 'check' : 'book', 18)}${finished ? '도시 복구 완료 · 나의 발견을 다시 만나 봐' : save.started ? `${count}개 구역 복구 · 내 탐험 기록이 기다리고 있어` : '열 번의 탐구와 나만의 발명 · 이 기기에 자동 저장'}</p>
    </div>
    <div class="quest-title-world-label"><span>밀이·당이와 함께하는</span><strong>자석 도시 복구 작전</strong></div>
    <div class="quest-title-friend quest-title-friend-left">${questCompanion({ type: 'mili', message: '어떤 물건이 자석에 붙을까? 먼저 예상하고 직접 움직여 보자. 예상과 달라도 새로운 발견이야!' })}</div>
    <div class="quest-title-friend quest-title-friend-right">${questCompanion({ type: 'dangi', message: '다섯 구역에서 찾은 단서를 모아 우리만의 발명품을 만들자. 내 생각을 실험으로 확인하는 거야!' })}</div>
    <aside class="quest-title-journey" aria-label="다섯 구역 탐험 여정"><div class="quest-journey-heading"><span>우리의 탐험 여정</span><strong>${count}<small> / 5 구역 복구</small></strong></div><ol>${districts.map(([name, purpose, graphic], index) => `<li class="${restored.has(index) ? 'is-complete' : index === current ? 'is-current' : ''}" ${index === current ? 'aria-current="step"' : ''}><span class="quest-journey-marker" aria-hidden="true">${restored.has(index) ? icon('check', 22) : icon(graphic, 22)}</span><div><strong>${name}</strong><span>${restored.has(index) ? '복구 완료' : purpose}</span></div></li>`).join('')}</ol></aside>
  </section>`;
}
