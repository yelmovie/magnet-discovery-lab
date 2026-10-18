import './styles.css';
import './ending.css';
import './adventure.css';
import './tablet.css';
import { finalView } from './final-mission';
import { bindPlacement } from './manipulation';
import { trialPicture } from './trial-records';
import { adventureView, rewards, rewardBelt } from './adventure';
import { accessible, completeActivity, coreReady, descriptions, emptyActivity, evidenceNames, flag, freshSave, missionNames, opposite, progress, ready, stageNames, titles, unlockedStage, designResult, type Evidence, type Save } from './domain';
import { clearSave, load, persist, persistenceError, migrationNotice } from './storage';
import { icon, magnet, mascot, objectArt } from './art';
import { workshopView } from './workshops';
import type { CityHandle } from './city';
import type { View } from './activity-types';

const app = document.querySelector<HTMLDivElement>('#app')!;
type Page = 'title' | 'city' | 'activity' | 'report' | 'core' | 'ending' | 'certificate';
let s: Save = freshSave(), page: Page = 'title';
let screen = 1, city: CityHandle | undefined, selected = -1, cleanup: (() => void) | undefined;
let saveTimer = 0, saving = false, saveMessage = '', modalCleanup: (() => void) | undefined, endingTimer = 0;
let practiceBackup: { activities: Save['activities']; design: Save['design']; designs: Save['designs'] } | null = null;
let audio: AudioContext | undefined;
let adminBackup: Save | null = null;
type Route = { page: Page; screen: number };
let currentRoute: Route = { page: 'title', screen: 1 };
const backStack: Route[] = [];
const adminOn = () => adminBackup !== null;
const canEnter = (n: number) => accessible(s, n, adminOn());
const canActivate = () => coreReady(s, adminOn());
const esc = (x: unknown) => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function sound(success = false) {
  if (!s.settings.sound) return;
  try { audio ||= new AudioContext(); if (audio.state === 'suspended') void audio.resume(); const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(success ? 660 : 440, audio.currentTime); oscillator.frequency.exponentialRampToValueAtTime(success ? 880 : 500, audio.currentTime + .12); gain.gain.setValueAtTime(.045, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .19); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .2); } catch { /* Sound is optional. */ }
}
function notify(text: string) { document.querySelector('.toast')?.remove(); const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.textContent = text; document.body.append(toast); window.setTimeout(() => toast.remove(), 4200); }
function saveView() { const el = document.querySelector('#save-status'); if (el) { el.textContent = adminOn() ? '관리자 미리보기 · 학습 기록은 보존돼' : saving ? '기록 중…' : saveMessage || '이 기기에 자동 저장'; el.classList.toggle('save-error', Boolean(saveMessage)); } }
function saveSnapshot(): Save {
  if (!practiceBackup) return s;
  return { ...s, activities: practiceBackup.activities, design: practiceBackup.design, designs: practiceBackup.designs, resume: 0 };
}
async function flush() { if (adminOn()) return; clearTimeout(saveTimer); saving = true; saveView(); try { const snap = saveSnapshot(); await persist(snap); s.revision = snap.revision; saveMessage = ''; } catch (e) { saveMessage = e instanceof Error ? e.message : '저장 실패 · 다시 시도'; } finally { saving = false; saveView(); } }
function touch() { if (adminOn()) return; s.updated = new Date().toISOString(); clearTimeout(saveTimer); saveTimer = window.setTimeout(() => void flush(), 500); }
function cleanPage() { cleanup?.(); cleanup = undefined; city?.destroy(); city = undefined; clearInterval(endingTimer); modalCleanup?.(); modalCleanup = undefined; document.querySelector('.modal-backdrop')?.remove(); }
function restorePractice() { if (!practiceBackup) return; s.activities = practiceBackup.activities; s.design = practiceBackup.design; s.designs = practiceBackup.designs; practiceBackup = null; }
function go(next: typeof page, remember = true) {
  if (remember && (next !== currentRoute.page || (next === 'activity' && screen !== currentRoute.screen))) backStack.push({ ...currentRoute });
  cleanPage(); if (next !== 'activity') restorePractice(); page = next;
  currentRoute = { page, screen }; render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function goBack() {
  const previous = backStack.pop(); if (!previous) return;
  if (previous.page === 'activity' && canEnter(previous.screen)) startActivity(previous.screen, s.evidence.length > Math.floor((previous.screen - 1) / 2), false);
  else go(previous.page === 'activity' ? 'city' : previous.page, false);
}
function startActivity(n: number, practice = false, remember = true) {
  if (!canEnter(n)) return notify('앞의 탐구를 마치면 이 활동이 열려.');
  if ((practice || adminOn()) && !practiceBackup) { practiceBackup = { activities: structuredClone(s.activities), design: structuredClone(s.design), designs: structuredClone(s.designs) }; const first = Math.floor((n - 1) / 2) * 2 + 1; s.activities[first] = emptyActivity(); s.activities[first + 1] = emptyActivity(); }
  screen = n; s.activities[n] ||= emptyActivity(); s.resume = practiceBackup ? 0 : n; go('activity', remember); touch();
}
function button(action: string, label: string, style = 'soft', disabled = false) { return `<button class="btn ${style}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function header() { return `<header class="site-header"><div class="header-left"><nav class="navigation-controls" aria-label="화면 이동"><button class="icon-button" data-action="home" aria-label="홈으로 가기" title="홈으로 가기">${icon('home')}</button><button class="icon-button" data-action="back" aria-label="이전 페이지로 가기" title="이전 페이지로 가기" ${backStack.length ? '' : 'disabled'}>${icon('back')}</button></nav><button class="brand" data-action="home" aria-label="메인 화면"><span class="brand-icon">∪</span><span>밀고 <b>당기는</b> 도시<small>SCIENCE WORLD</small></span></button></div><div class="header-center">${adminOn() ? '<span class="admin-badge">관리자 전체 해금 · 미리보기</span>' : '<span class="subject-dot"></span>4학년 과학 <span class="divider">/</span> 자석의 이용'}</div><nav class="header-tools" aria-label="게임 도구"><button class="icon-button" data-action="notebook" aria-label="연구 기록 열기" title="연구 기록">${icon('book')}</button><button class="icon-button" data-action="sound" aria-label="${s.settings.sound ? '소리 끄기' : '소리 켜기'}" title="소리 켜기 / 끄기">${icon(s.settings.sound ? 'sound' : 'mute')}</button><button class="icon-button settings-button" data-action="settings" aria-label="설정" title="설정">${icon('gear')}</button></nav></header>`; }
function footer() { return `<footer class="site-footer"><span>작은 힘으로 만드는 커다란 변화</span><button id="save-status" data-action="retry-save">${saveMessage ? esc(saveMessage) : '이 기기에 자동 저장'}</button><span>밀이 & 당이의 과학 탐험</span></footer>`; }
function progressDots() { return `<div class="progress-dots">${stageNames.map((_, i) => `<i class="${s.evidence.length > i ? 'filled' : ''}"></i>`).join('')}</div>`; }
function render() {
  document.body.classList.toggle('reduce-motion', !s.settings.motion);
  document.body.classList.toggle('activity-mode', page === 'activity');
  let html = '';
  switch (page) {
    case 'title': html = titlePage(); break;
    case 'city': html = cityPage(); break;
    case 'activity': html = activityPage(); break;
    case 'report': html = reportPage(); break;
    case 'core': html = corePage(); break;
    case 'ending': html = endingPage(); break;
    case 'certificate': html = certificatePage(); break;
  }
  app.innerHTML = `${header()}<main id="main-content" class="page page-${page}">${html}</main>${footer()}`;
  bindCommon();
  if (page === 'city') void bindCity();
  if (page === 'activity') bindActivity();
  if (page === 'core') bindCore();
  if (page === 'ending') bindEnding();
  if (page === 'certificate') { const input = document.querySelector<HTMLInputElement>('#nickname')!; input.addEventListener('input', () => { s.settings.nickname = input.value.slice(0, 20); document.querySelector('#certificate-name')!.textContent = s.settings.nickname || '우리 도시의 과학 탐험가'; touch(); }); }
  saveView();
}
function titlePage() {
  return `<section class="adventure-hero"><img class="hero-city-image" src="/assets/adventure/city-map-v2.webp" alt="길을 따라 다섯 탐험 구역이 연결된 밀고 당기는 도시"/><div class="hero-story"><span class="eyebrow">밀이 · 당이와 함께하는 자석 탐험</span><h1>이 도시의 다음<br>수리 대장은 <em>너!</em></h1><p>덮개는 자꾸 열리고, 배송은 멈췄어.<br>자석을 직접 움직여 다섯 구역을 고쳐 줘.</p><div class="hero-actions">${button('start', `${s.started ? '이어서 하기' : '탐험 시작'} ${icon('arrow')}`, 'primary large')}${s.started ? button('new', '새로 시작', 'text-button') : ''}</div><div class="hero-buddies">${mascot('mili', 152)}${mascot('dangi', 140)}</div><span class="hero-promise">직접 발견하고 · 고치고 · 나만의 발명까지</span></div><div class="hero-map-note"><span class="live-dot"></span>길을 따라 열리는 5개의 수리 의뢰</div></section><div class="journey-rewards"><div><span class="eyebrow">나의 수리 가방</span><h2>발견할수록, 할 수 있는 일이 늘어나.</h2><p>구역을 고치면 다음 실험에 쓸 도구와 새 길이 열려.</p></div>${rewardBelt(s)}</div>`;
}
function cityPage() {
  const next = Math.min(s.evidence.length, 4);
  return `<div class="page-heading"><div><span class="eyebrow">EXPLORE THE CITY</span><h1>오늘은 어디를 탐험할까?</h1></div><div class="restoration"><span>도시 복구</span><strong>${progress(s)}%</strong>${progressDots()}</div></div><div class="city-layout"><section class="city-card"><div class="city-card-header"><span><i class="live-dot"></i> 밀고 당기는 도시</span><span class="city-time">맑음 · 탐험하기 좋은 날</span></div><div class="city-world"><div id="city-canvas"></div><div class="city-labels">${stageNames.map((name, i) => { const positions = [[93, 166], [169, 86], [333, 87], [386, 174], [322, 240]][i]; return `<button data-place="${i}" class="city-label ${s.evidence.length > i ? 'restored' : unlockedStage(s, i, adminOn()) ? 'current' : 'locked'}" style="left:${positions[0] / 480 * 100}%;top:${positions[1] / 320 * 100}%" aria-label="${name} 입구로 걸어가기"><b>${s.evidence.length > i ? '✓' : `0${i + 1}`}</b>${name}</button>`; }).join('')}<button data-place="5" class="core-label" style="left:50%;top:55%" aria-label="자기 코어 관제소로 걸어가기">${icon(adminOn() || s.evidence.length === 5 ? 'spark' : 'lock', 12)} 자기 코어</button></div></div><div class="city-instructions"><span>${icon('map', 17)} 길이나 건물을 누르면 밀이가 걸어가.</span><span class="key-hint">방향키 <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> 로도 이동</span><div class="city-dpad"><button data-dir="-1,0" aria-label="도시 왼쪽 이동">←</button><button data-dir="0,-1" aria-label="도시 위로 이동">↑</button><button data-dir="0,1" aria-label="도시 아래로 이동">↓</button><button data-dir="1,0" aria-label="도시 오른쪽 이동">→</button></div></div></section><aside class="city-sidebar" id="place-panel"><div class="mission-card"><span class="eyebrow">${s.final.complete ? 'MISSION COMPLETE' : s.evidence.length === 5 ? 'FINAL MISSION' : 'NEXT MISSION'}</span><span class="chapter-number">${s.final.complete ? '✓' : s.evidence.length === 5 ? '★' : `0${next + 1}`}</span><h2>${s.final.complete ? '도시가 다시 움직여!' : s.evidence.length === 5 ? '자기 코어를 깨워라' : missionNames[next]}</h2><p>${s.final.complete ? '완료한 구역에서 다시 실험해봐. 연구 기록과 인증서도 볼 수 있어.' : s.evidence.length === 5 ? '다섯 연구 기록이 모였어. 당이와 함께 마지막 복구를 준비하자.' : ['생활 장치가 자꾸 열리고 있어. 자석이 어떤 일을 하는지 조사해줘.', '분류 장치가 멈췄어. 물체와 자석의 반응을 비교해보자.', '극 표시가 사라졌어. 서로 당기고 미는 반응에서 답을 찾아보자.', '수조와 운반 장치를 자석으로 다시 움직여보자.', '배운 자석의 성질로 시민에게 필요한 장치를 만들어보자.'][next]}</p>${button(s.final.complete ? 'certificate' : 'walk-next', `${s.final.complete ? '인증서 보기' : '입구까지 걸어가기'} ${icon('arrow', 18)}`, 'primary')}</div><div class="companion-card">${mascot('dangi', 86)}<div><strong>기록은 내가 맡을게!</strong><p>네가 발견한 것들을<br>연구 가방에 모아두었어.</p><button data-action="notebook">연구 가방 열기 →</button></div></div></aside></div>`;
}
let pendingPlace: number | null = null;
function cityLoadError(file: string) {
  const host = document.querySelector('#city-canvas'); if (!host || page !== 'city') return;
  host.innerHTML = `<div class="asset-error" role="alert"><p>도시 파일을 불러오지 못했어.</p><small>${esc(file)}</small><button class="btn primary" id="retry-city">다시 불러오기</button></div>`;
  host.querySelector('#retry-city')?.addEventListener('click', () => { city?.destroy(); city = undefined; render(); });
}
async function bindCity() {
  document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(b => b.addEventListener('click', () => {
    const destination = Number(b.dataset.place); if (city) city.goTo(destination); else pendingPlace = destination;
  }));
  let mountCity: typeof import('./city')['mountCity'];
  try { ({ mountCity } = await import('./city')); } catch { cityLoadError('도시 프로그램'); return; }
  if (page !== 'city' || !document.querySelector('#city-canvas')) return;
  city = mountCity(document.querySelector('#city-canvas')!, { completed: s.evidence.length, progress: progress(s), start: s.city, motion: s.settings.motion, onPosition: p => { s.city = p; touch(); }, onArrive: showPlace, onRecord: notebook, onLoadError: cityLoadError });
  city.pause(Boolean(document.querySelector('.modal-backdrop')));
  if (pendingPlace !== null) { city.goTo(pendingPlace); pendingPlace = null; }
  document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(b => { const [x, y] = b.dataset.dir!.split(',').map(Number); b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); city?.direction(x, y); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(e => b.addEventListener(e, () => city?.direction(0, 0))); });
}
function showPlace(index: number) {
  selected = index; const open = index === 5 ? adminOn() || s.evidence.length === 5 : unlockedStage(s, index, adminOn()), done = index < 5 && index < s.evidence.length;
  const panel = document.querySelector('#place-panel'); if (!panel) return;
  panel.innerHTML = `<div class="mission-card entrance-card"><span class="eyebrow">${done ? 'RESTORED' : open ? 'WELCOME, EXPLORER' : 'COMING NEXT'}</span><span class="chapter-number">${index === 5 ? '★' : `0${index + 1}`}</span><h2>${index === 5 ? '자기 코어 관제소' : stageNames[index]}</h2><p>${!open ? `${index === 5 ? '다섯 구역의 연구 기록을 모으면' : `${stageNames[index - 1]} 탐구를 마치면`} 이곳에서 탐험할 수 있어.` : index === 5 ? '다섯 발견을 하나로 모아 도시의 마지막 장치를 복구하자.' : missionNames[index]}</p>${index < 5 && open ? `<div class="entrance-activities"><span>${icon(s.completed.includes(index * 2 + 1) ? 'check' : 'flask', 16)} ${titles[index * 2]}</span><span>${icon(s.completed.includes(index * 2 + 2) ? 'check' : 'flask', 16)} ${titles[index * 2 + 1]}</span></div>` : ''}${button('enter', `${done ? '다시 탐구하기' : index === 5 ? '최종 보고하기' : '탐구 시작하기'} ${icon('arrow', 18)}`, 'primary', !open)}${done ? '<p class="small-note">다시 해도 처음 기록과 복구 상태는 유지돼.</p>' : ''}</div><div class="companion-card">${mascot('mili', 90)}<div><strong>${open ? '도착했어!' : '먼저 단서를 모으자.'}</strong><p>${open ? '준비되면 안으로 들어가자.' : '앞의 실험이 여기서 도움이 될 거야.'}</p></div></div>`;
  panel.querySelector('[data-action="enter"]')?.addEventListener('click', () => { if (!open) return; sound(); if (index === 5) { if (s.final.complete) go('certificate'); else go('report'); } else { let n = index * 2 + 1; if (!done && s.completed.includes(n)) n++; startActivity(n, done); } });
}
let currentView: View;
function activityPage() {
  const stage = Math.floor((screen - 1) / 2), a = s.activities[screen] ||= emptyActivity();
  currentView = screen === 7 ? workshopView(screen, a, s) : adventureView(screen, a, s);
  const question = screen === 7 ? '수조 안을 손대지 않고 닦아 볼까?' : String(a.values.question || titles[screen - 1]);
  return `<div class="tablet-context"><button class="back-link" data-action="city">${icon('back', 20)} 도시</button><span>${stageNames[stage]} · ${String(screen).padStart(2, '0')} / 10</span><button class="btn soft" data-action="observations">${icon('book', 20)} 내 실험 기록</button></div><h1 class="tablet-question">${esc(question)}</h1><section class="experiment-panel stage-${stage + 1}"><div id="experiment-root" class="experiment-root screen-${screen}">${currentView.html}</div></section><div class="tablet-bottom"><button class="btn soft" data-action="reset-activity">처음 위치로</button><button class="btn soft" data-action="hint">도움</button><button id="save-status" data-action="retry-save">자동 저장</button>${button('complete', `${screen === 9 ? '시험해 보기' : screen % 2 ? '다음 활동' : '내 발견 이야기하기'} ${icon('arrow', 20)}`, 'primary', !ready(screen, a, s))}</div>`;
}
function openRecords() {
  const a = s.activities[screen];
  showModal(`<div class="record-drawer-content"><h2>내 실험 기록</h2><p>네가 움직여 본 모습이야. 흐린 그림은 시작 위치야.</p><div class="trial-grid">${(a.trials || []).map(trialPicture).join('')}</div>${a.records.length ? `<details ${a.trials?.length ? '' : 'open'}><summary>${a.trials?.length ? '자세한 관찰' : '이전 활동 기록'}</summary><ul class="observation-list">${a.records.map(r => `<li><strong>${esc(r.label)}</strong><span>${esc(r.result)}</span></li>`).join('')}</ul></details>` : '<p>물체를 움직여 첫 발견을 남겨 봐.</p>'}</div>`, '내 실험 기록');
}
function guideText() { return ['손잡이를 위로 끌어 올리고, 안쪽 자석을 관찰 매트로 꺼내 봐.', '자석 없이 닫은 뒤, 자석을 넣고 같은 덮개를 다시 닫아 비교해.', '먼저 예상 바구니에 놓아. 자석으로 검사한 뒤 분류를 고쳐도 좋아.', '같은 자석과 클립으로, 거리나 종이 중 한 가지만 바꿔 봐.', '같은 극은 밀어내고, 다른 극은 당겨. 두 반응을 기록하고 표시를 붙여.', '고리 윗면과 그 위 고리의 아랫면이 마주 보고 있어.', '안쪽 패드가 따라올 수 있도록 바깥 자석을 천천히 움직여.', '카트 가까이에서 자석을 옮겨. 정차할 때는 자석을 위로 멀리 떼어.', '부품을 직접 놓고 시험해. 한 가지씩 바꾸며 고칠 수 있어.', '다른 사용 상황에서도 확인하고 힘이 작용한 곳에 스티커를 붙여.'][screen - 1]; }
function tasks(): [string, boolean][] {
  const a = s.activities[screen]; const f = (key: string) => flag(a, key);
  switch (screen) {
    case 1: return [['보관함 덮개 열고 자석 꺼내기', f('found0')], ['책갈피에서도 자석 찾기', f('found1')]];
    case 2: return [['자석 없이 닫고 비교', f('without0') && f('without1')], ['자석을 넣고 두 물건 수리', f('with0') && f('with1')], ['고정하는 역할 확인', f('role0') && f('role1')]];
    case 3: return [['여섯 재료를 자석으로 검사', ['clip', 'nail', 'aluminum', 'wood', 'plastic', 'rubber'].every(f)], ['관찰 결과로 분류 수정', f('compare')]];
    case 4: return [['가까운 거리와 먼 거리 비교', f('near-clear') && f('far-clear')], ['같은 거리에서 종이판 비교', f('near-clear') && f('near-paper')], ['발견한 점 정리', f('compare')]];
    case 5: return [['네 자석에 기준 N·S극 대보기', [0, 1, 2, 3].every(i => f(`test${i}N`) && f(`test${i}S`))], ['네 자석의 극 표시 복원', [0, 1, 2, 3].every(i => f(`solved${i}`))]];
    case 6: return [['두 간격 모두 띄우기', f('order0')], ['위쪽만 붙이기', f('order1')], ['아래쪽만 붙이기', f('order2')]];
    case 7: return [['외부 자석으로 패드 움직이기', a.mask.length > 0], ['오염 구역 85% 청소', ready(7, a, s)]];
    case 8: return [['앞에서 끌기', f('segment0')], ['뒤에서 밀기', f('segment1')], ['내 방법으로 반대 방향 배송', f('segment2')]];
    case 9: return [['몸체 놓기', f('base')], ['자석과 대상 부품 놓기', f('magnet') && f('target')]];
    default: return [['첫 번째 사용 시험', f('trial0')], ['다른 상황에서도 작동 확인', f('trial1')], ['힘이 작용한 곳 표시', ready(10, a, s)]];
  }
}
function taskList() { return tasks().map(([text, done], i) => `<li class="${done ? 'done' : ''}"><span>${done ? icon('check', 15) : i + 1}</span>${text}</li>`).join(''); }
function meta() {
  const a = s.activities[screen]; if (page !== 'activity' || !a) return;
  const done = ready(screen, a, s); const button = document.querySelector<HTMLButtonElement>('[data-action="complete"]'); if (button) button.disabled = !done;
  const list = document.querySelector('#task-list'); if (list) list.innerHTML = taskList();
  const hint = document.querySelector('#completion-hint'); if (hint) hint.textContent = done ? '탐구를 마쳤어! 다음으로 가볼까?' : '직접 실험하고 발견을 기록해보자.';
  const count = document.querySelector('#record-count'); if (count) count.textContent = `${a.records.length}개의 관찰`;
}
function bindActivity() {
  const root = document.querySelector<HTMLElement>('#experiment-root')!;
  const refresh = () => { const drag = (document.activeElement as HTMLElement | null)?.dataset.drag; const scroll = window.scrollY; cleanup?.(); cleanup = undefined; render(); if (drag) document.querySelector<HTMLElement>(`[data-drag="${drag}"]`)?.focus({ preventScroll: true }); window.scrollTo({ top: scroll, behavior: 'instant' }); };
  const viewCleanup = currentView.bind({ screen, a: s.activities[screen], s, root, refresh, touch, meta, notify });
  const placementCleanup = bindPlacement(root);
  cleanup = () => { viewCleanup?.(); placementCleanup(); };
  root.addEventListener('revise', () => startActivity(9));
}
async function finishActivity(explained = false) {
  if (!ready(screen, s.activities[screen], s)) return;
  if (screen % 2 === 0 && !explained) {
    const a = s.activities[screen], stage = screen / 2 - 1;
    const questions = ['무엇이 덮개를 붙잡았을까?', '자석이 닿기 전에도 움직였니?', '어떤 극끼리 마주 보니 밀렸니?', '손대지 않고 어떻게 움직였니?', '누구의 어떤 불편을 해결했니?'];
    showModal(`<h2>${questions[stage]}</h2><div class="trial-grid">${(a.trials || []).slice(-2).map(trialPicture).join('')}</div><p>내 그림에서 힘이 작용한 곳을 짚고, 짝이나 선생님에게 이야기해 봐.</p><button class="btn primary" id="explained">내 발견을 이야기했어</button><p class="small-note">이 버튼은 설명했다는 기록이야. 이해도를 자동으로 채점하지 않아.</p>`, '내 발견 이야기');
    document.querySelector('#explained')!.addEventListener('click', () => { a.values.discussed = true; a.records.push({ key: 'explanation', label: questions[stage], result: '자신의 실험 그림을 보며 설명했다고 확인했어. 교사 관찰과 함께 확인해 줘.' }); modalCleanup?.(); void finishActivity(true); });
    return;
  }
  sound(true);
  if (practiceBackup) { if (screen % 2) return startActivity(screen + 1); restorePractice(); s.resume = 0; await flush(); go('city'); notify('다시 탐구했어! 처음 연구 기록은 그대로 보관했어.'); return; }
  const stage = Math.floor((screen - 1) / 2);
  if (screen === 9) { s.activities[9].records = [{ key: 'design', label: '발명 설계', result: `${s.design.template === 'box' ? '보관함' : '원격 운반 도구'} · ${s.design.pair === 'iron' ? '철 부품' : '자석 쌍'} · 거리 ${s.design.gap <= 36 ? '가까움' : '멀어짐'} · ${s.design.aligned ? '마주 보게 배치' : '배치 조정 전'}` }]; }
  if (!completeActivity(s, screen)) return;
  await flush();
  if (screen % 2) return startActivity(screen + 1);
  go('city');
  showModal(`<div class="reward-celebration">${mascot('mili', 150, 3)}<div class="award-icon">${icon(rewards[stage].icon, 38)}</div>${mascot('dangi', 150, 3)}</div><span class="eyebrow">DISCOVERY ${String(stage + 1).padStart(2, '0')}</span><h2>${rewards[stage].name} 획득!</h2><p>${rewards[stage].change}<br><strong>${rewards[stage].use}</strong></p><p class="reward-evidence">${evidenceNames[stage]}도 연구 가방에 보관했어.</p><div class="award-progress">도시 복구 <strong>${progress(s)}%</strong></div><div class="modal-actions">${button('modal-close', '복구된 도시 보기 →', 'primary')}</div>`, '연구 기록 완성');
}
function evidenceCard(e: Evidence) { return `<article class="evidence-card"><span class="evidence-number">0${e.stage + 1}</span><div><span class="eyebrow">${stageNames[e.stage]}</span><h3>${evidenceNames[e.stage]}</h3>${e.activities.flatMap(a => a.trials || []).slice(-1).map(trialPicture).join('')}<ul>${e.summary.slice(0, 1).map(t => `<li>${esc(t)}</li>`).join('')}</ul><details><summary>전체 실험 기록 ${e.summary.length}개</summary><ul>${e.summary.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details></div><span class="evidence-stamp">확인<br>완료</span></article>`; }
function notebook() {
  const content = s.evidence.length ? s.evidence.map(evidenceCard).join('') : `<div class="empty-notebook">${mascot('dangi', 110)}<h3>아직 연구 기록이 없어.</h3><p>한 구역의 두 활동을 마치면<br>네 발견이 여기에 차곡차곡 모여.</p></div>`;
  showModal(`<span class="eyebrow">MY RESEARCH KIT</span><h2>우리 도시의 연구 기록</h2><p>${s.evidence.length} / 5개의 발견을 모았어.</p>${rewardBelt(s)}<div class="notebook-list">${content}</div>`, '연구 가방');
}
function reportPage() { return `<div class="report-heading"><span class="eyebrow">FINAL REPORT</span><h1>다섯 번의 발견,<br>하나의 커다란 변화.</h1><p>우리가 알아낸 자석의 성질로 도시의 마지막 장치를 복구하자.</p></div><div class="report-list">${s.evidence.map(evidenceCard).join('')}</div><div class="report-actions">${button('city', '도시로 돌아가기')}${button('reviewed', `마지막 복구 시작 ${icon('arrow')}`, 'primary', !adminOn() && s.evidence.length !== 5)}</div>`; }
let finalScene: View;
function corePage() {
  finalScene = finalView(s);
  return '<button class="back-link" data-action="city">← 도시</button><div id="final-root">' + finalScene.html + '</div>';
}
function bindCore() {
  const root = document.querySelector<HTMLElement>('#final-root')!;
  const dispose = finalScene.bind({ screen: 10, a: s.final.route!.attempt!, s, root, touch, meta: () => {}, notify, refresh: () => { cleanup?.(); cleanup = undefined; render(); } });
  const placement = bindPlacement(root);
  root.addEventListener('activate-final', () => { void activate(); });
  cleanup = () => { dispose?.(); placement(); };
}
async function activate() { if (!canActivate()) return; s.final.complete = true; s.final.date ||= new Date().toISOString(); await flush(); sound(true); go('ending'); }
function endingPage() { return `<section class="ending"><span class="eyebrow">THE CITY IS ALIVE AGAIN</span><div class="ending-art"><img src="/assets/logo.png" alt="다시 살아난 밀고 당기는 도시"/><div class="celebration-sparks">✦ <span>✧</span> ✦</div></div><h1 id="ending-title">네 발견이 도시를 깨웠어!</h1><p id="ending-text">작은 자석의 힘이 커다란 변화를 만들었어.</p><div class="ending-progress"><i id="ending-progress"></i></div><div class="ending-mascots">${mascot('mili', 100)}${mascot('dangi', 100)}</div>${button('certificate', '인증서로 건너뛰기 →', 'text-button')}</section>`; }
function endingVignette(index: number): string {
  const illustrations = [
    '<div class="repaired-box"><div class="repaired-lid">잠금 장치 복구</div><div class="repaired-body"><i>N</i><span>철판</span></div></div>',
    `<div class="ending-sorter">${magnet()}<div class="ending-belt">${objectArt('clip')}${objectArt('nail')}${objectArt('aluminum')}</div><span>철 물체를 찾아 분리해!</span></div>`,
    '<div class="ending-rings"><i></i><span>N</span><span>S</span><span>N</span></div>',
    `<div class="ending-aqua"><span class="water-bubble">○</span><span class="water-bubble second">○</span><div class="ending-pad">청소 완료</div><div class="ending-cart">${magnet('S')}<i></i><i></i></div></div>`,
    `<div class="ending-invention"><span>나의 발명 전시</span>${s.design.template === 'box' ? '<div class="repaired-box"><div class="repaired-lid">내가 만든 보관함</div><div class="repaired-body"><i>N</i><span>철판</span></div></div>' : `<div class="ending-picker">${magnet()}${objectArt('clip')}</div>`}<strong>${s.design.template === 'box' ? '덮개가 잘 닫히는 보관함' : '손대지 않는 부품 운반 도구'}</strong></div>`
  ];
  return `<div class="ending-vignette"><span class="tag">${String(index + 1).padStart(2, '0')} · ${stageNames[index]}</span>${illustrations[index]}<div class="restored-ribbon">${icon('check', 18)} 복구 완료</div></div>`;
}
function bindEnding() {
  const started = performance.now(); const messages = ['잠금장치가 다시 작동해!', '재료 분류가 다시 시작됐어!', '고리 장치가 제자리를 찾았어!', '수조도, 카트도 다시 움직여!', '네 발명이 시민의 일상을 바꾸었어!'];
  let lastPart = -1;
  endingTimer = window.setInterval(() => { const elapsed = performance.now() - started, part = Math.min(4, Math.max(0, Math.floor((elapsed - 3000) / 3400))); const bar = document.querySelector<HTMLElement>('#ending-progress'); if (bar) bar.style.width = `${Math.min(100, elapsed / 240)}%`; const text = document.querySelector('#ending-text'); if (text && elapsed > 3000) text.textContent = messages[part]; if (elapsed > 3000 && part !== lastPart) { const art = document.querySelector('.ending-art'); if (art) art.innerHTML = endingVignette(part); lastPart = part; } if (elapsed >= (s.settings.motion ? 24000 : 6000)) go('certificate'); }, 200);
}
function certificatePage() { return `<div class="certificate-tools"><div><span class="eyebrow">MISSION COMPLETE</span><h1>우리 도시의 과학 탐험가</h1></div><div>${button('city', `${icon('map', 18)} 도시 둘러보기`)}${button('print', `${icon('print', 18)} 인증서 인쇄`, 'primary')}</div></div><div class="certificate"><div class="certificate-border">${adminOn() ? '<p class="certificate-preview">관리자 미리보기 · 실제 수료 기록이 아니야</p>' : ''}<span class="certificate-overline">SCIENCE WORLD · MAGNET CITY</span><div class="certificate-medal">${icon('spark', 38)}</div><h2>자기 도시 복구 연구원 인증서</h2><p class="certificate-name" id="certificate-name">${esc(s.settings.nickname || '우리 도시의 과학 탐험가')}</p><p>자석의 성질을 직접 관찰하고 실험하여<br><strong>밀고 당기는 도시를 다시 움직이게 했습니다.</strong></p><div class="certificate-achievements">${evidenceNames.map((n, i) => `<span>${icon('check', 17)} ${n.replace(' 기록', '').replace(' 검증서', '')}</span>`).join('')}</div><div class="certificate-bottom">${mascot('mili', 78)}<div><strong>도시 복구 100% · 5개의 연구 기록</strong><span>${s.final.date ? new Date(s.final.date).toLocaleDateString('ko-KR') : ''}</span></div>${mascot('dangi', 78)}</div></div></div><div class="certificate-name-input"><label for="nickname">인증서에 넣을 이름 <small>(선택)</small></label><input id="nickname" maxlength="20" placeholder="우리 도시의 과학 탐험가" value="${esc(s.settings.nickname)}"/>${button('replay-ending', '엔딩 다시 보기', 'text-button')}</div>`; }
function showModal(content: string, label: string) {
  modalCleanup?.(); document.querySelector('.modal-backdrop')?.remove(); city?.pause(true);
  const previous = document.activeElement as HTMLElement | null, backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${label}" tabindex="-1"><button class="modal-close icon-button" aria-label="닫기">${icon('close')}</button>${content}</section>`;
  document.body.append(backdrop); const dialog = backdrop.querySelector<HTMLElement>('.modal')!;
  app.inert = true; window.dispatchEvent(new CustomEvent('experiment-pause', { detail: true }));
  const close = () => { backdrop.remove(); app.inert = false; city?.pause(false); window.dispatchEvent(new CustomEvent('experiment-pause', { detail: false })); document.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus(); modalCleanup = undefined; if (page === 'activity') meta(); };
  const trap = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const nodes = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, summary, [tabindex="0"]')]; const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } };
  document.addEventListener('keydown', trap); backdrop.querySelectorAll('.modal-close, [data-action="modal-close"]').forEach(b => b.addEventListener('click', close));
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); }); dialog.focus(); modalCleanup = close;
}
function openSettings() {
  showModal(`<h2>탐험 설정</h2><p>화면 설정을 바꾸고, 모든 장면을 둘러볼 수 있어.</p>
    <label class="setting-row"><span>움직임 줄이기</span><input type="checkbox" id="reduced-motion" ${s.settings.motion ? '' : 'checked'}/></label>
    <label class="setting-row"><span>관리자 전체 해금</span><input type="checkbox" id="admin-unlock" ${adminOn() ? 'checked' : ''}/></label>
    <p class="small-note">한 번 켜면 모든 활동과 마지막 장면까지 열려. 미리보기에서 한 실험은 학습 기록에 저장되지 않아. 끄거나 새로고침하면 원래 탐험으로 돌아가.</p>
    ${adminOn() ? `<div class="admin-pages" aria-label="전체 화면 바로가기">${button('admin-title', '메인') + button('admin-city', '도시 탐험') + titles.map((title, i) => button(`admin-activity-${i + 1}`, `${String(i + 1).padStart(2, '0')} · ${title}`)).join('') + button('admin-report', '최종 보고서') + button('admin-core', '자기 코어') + button('admin-ending', '엔딩') + button('admin-certificate', '인증서')}</div>` : ''}`, '설정');
  document.querySelector('#reduced-motion')?.addEventListener('change', e => { s.settings.motion = !(e.target as HTMLInputElement).checked; document.body.classList.toggle('reduce-motion', !s.settings.motion); city?.motion(s.settings.motion); touch(); });
  document.querySelector<HTMLInputElement>('#admin-unlock')?.addEventListener('change', async e => {
    const toggle = e.target as HTMLInputElement; toggle.disabled = true;
    if (toggle.checked) {
      await flush(); cleanPage(); restorePractice(); adminBackup = structuredClone(s); s = structuredClone(s);
    } else {
      cleanPage(); restorePractice(); const settings = { ...s.settings }; s = adminBackup!; adminBackup = null; s.settings = settings; touch();
    }
    backStack.length = 0;
    if (page === 'activity' && canEnter(screen)) startActivity(screen, false, false);
    else go(page === 'title' ? 'title' : 'city', false);
    openSettings();
  });
  document.querySelectorAll<HTMLButtonElement>('.admin-pages [data-action]').forEach(b => b.addEventListener('click', () => {
    const target = b.dataset.action!.slice(6);
    if (target.startsWith('activity-')) startActivity(Number(target.slice(9)));
    else go(target as typeof page);
  }));
}
function bindCommon() {
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => b.addEventListener('click', () => { const action = b.dataset.action; sound();
    switch (action) {
      case 'home': void flush(); go('title'); break;
      case 'back': void flush(); goBack(); break;
      case 'start': if (!s.started) { s.started = true; touch(); go('city'); } else if (s.resume && accessible(s, s.resume)) startActivity(s.resume); else go('city'); break;
      case 'new': if (adminOn()) { notify('전체 해금을 끈 뒤 새 탐험을 시작해줘.'); break; } showModal(`<h2>새로운 탐험을 시작할까?</h2><p>이 기기에 저장된 실험 기록과 도시 복구 진행이 초기화돼.</p><div class="modal-actions">${button('modal-close', '돌아가기')}<button class="btn danger" id="confirm-new">기록 지우고 새로 시작</button></div>`, '새로 시작 확인'); document.querySelector('#confirm-new')?.addEventListener('click', async () => { try { clearTimeout(saveTimer); await clearSave(); s = freshSave(); s.started = true; restorePractice(); go('city'); touch(); } catch { notify('저장소를 초기화하지 못했어. 다른 탭을 닫고 다시 시도해줘.'); } }); break;
      case 'city': void flush(); go('city'); break;
      case 'sound': s.settings.sound = !s.settings.sound; touch(); b.innerHTML = icon(s.settings.sound ? 'sound' : 'mute'); b.setAttribute('aria-label', s.settings.sound ? '소리 끄기' : '소리 켜기'); break;
      case 'settings': openSettings(); break;
      case 'notebook': if (page === 'activity') openRecords(); else notebook(); break;
      case 'retry-save': void flush(); break;
      case 'walk-next': if (city) city.goTo(s.evidence.length === 5 ? 5 : s.evidence.length); else pendingPlace = s.evidence.length === 5 ? 5 : s.evidence.length; break;
      case 'complete': b.disabled = true; void finishActivity(); break;
      case 'hint': notify(screen === 10 ? designResult(s.design).reason : guideText()); break;
      case 'observations': openRecords(); break;
      case 'reset-activity': { const a = s.activities[screen]; a.points = {}; a.values.round = 0; a.values.car = 24; a.values.cargo = 25; a.values.distanceStep = 'free'; a.values['paper-in'] = false; delete a.values.say; cleanPage(); render(); touch(); break; }
      case 'reviewed': if (!adminOn() && s.evidence.length !== 5) break; s.final.report = true; touch(); go('core'); break;
      case 'apply-blueprint': {
        if (!adminOn() && !s.evidence[4]) break;
        if (!designResult(s.design).ready) { notify('공방에서 성공한 설계의 배치를 다시 확인해 줘.'); break; }
        if (s.design.template === 'box') s.final.latch = 'S'; else s.final.plate = Math.max(20, Math.min(36, s.design.gap));
        touch(); render(); notify(s.design.template === 'box' ? '내 우편함의 당기는 힘을 잠금 장치에 적용했어!' : '내 원격 도구의 가까운 배치를 고정판에 적용했어!'); break;
      }
      case 'core-latch': s.final.latch = opposite(s.final.latch); touch(); render(); break;
      case 'core-ring': s.final.ring = opposite(s.final.ring); touch(); render(); break;
      case 'activate': b.disabled = true; void activate(); break;
      case 'certificate': if (adminOn() || s.final.complete) go('certificate'); break;
      case 'replay-ending': if (adminOn() || s.final.complete) go('ending'); break;
      case 'print': window.print(); break;
    }
  }));
}
async function boot() { app.innerHTML = '<div class="loading-screen"><span class="loading-magnet">∪</span><p>도시로 가는 길을 준비하고 있어…</p></div>'; s = await load(); saveMessage = persistenceError; if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) s.settings.motion = false; render(); if (migrationNotice) notify(migrationNotice); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { void flush(); void audio?.suspend(); city?.pause(true); } else city?.pause(Boolean(document.querySelector('.modal-backdrop'))); });
window.addEventListener('pagehide', () => { void flush(); });
void boot();
