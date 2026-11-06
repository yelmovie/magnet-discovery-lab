import './styles.css';
import './ending.css';
import './adventure.css';
import './tablet.css';
import './quest.css';
import './learning-ux.css';
import './production.css';
import './inquiry.css';
import './polish.css';
import './fit-screen.css';
import './fit-activity.css';
import './fit-report.css';
import { visualPreview, visualGuideMarkup, bindVisualGuide } from './learning-visuals';
import { apparatusFigure, apparatusFigureMarkup, apparatusFigureTitle, bindApparatusFigure } from './apparatus-figures';
import { coachMarkup, bindCoach } from './coach';
import { concepts, conceptMarkup, bindConcept } from './concept-video';
import { bindTrialReplay, trialReplayMarkup } from './trial-replay';
import { questHud, questTitle } from './quest-ui';
import { inquiryView, inquiryNext, advanceInquiry, inquirySteps } from './inquiry';
import { inquiryPhase } from './inquiry-model';
import { missionReady } from './mission-model';
import { canDemonstrate, ExperimentAutoplay } from './experiment-autoplay';
import { rememberExperiment } from './experiment-scenes';
import { missionQuestions, missionGuides, questRewards, abilityStatements } from './mission-content';
import { expeditionMarkup, mountExpedition, residents, type ExpeditionHandle } from './expedition';
import { bindResidentChat, chatMarkup, reunionTitle } from './resident-chat';
import { restoredTownMessage } from './town-lights';
import { openGameSettings } from './game-settings';
import { playStory, type FilmId } from './story-video';
import { ensureAudio, syncAudioSettings, playEffect, playNarration, setAudioPaused, setMusicTheme, normalizedAudioSettings } from './game-audio';
import { restorationView } from './restoration';
import { bindPlacement } from './manipulation';
import { trialPicture, readableRecord } from './trial-records';
import { rewardBelt } from './rewards';
import { accessible, completeActivity, coreReady, designResult, emptyActivity, evidenceNames, freshSave, missionNames, progress, ready, record, stageNames, type Activity, type Evidence, type Save } from './domain';
import { resetSave, load, persist, persistenceError, migrationNotice } from './storage';
import { ideaView } from './idea-lab';
import { usesIdeaLab } from './idea-model';
import { icon, mascot } from './art';
import type { View } from './activity-types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const autoplay = new ExperimentAutoplay();
type Page = 'title' | 'city' | 'activity' | 'report' | 'core' | 'ending' | 'certificate';
let s: Save = freshSave(), page: Page = 'title';
let screen = 1, city: ExpeditionHandle | undefined, cleanup: (() => void) | undefined;
let saveTimer = 0, saving = false, saveMessage = '', modalCleanup: (() => void) | undefined;
let resetting = false;
const resetChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('push-pull-city:reset') : null;
resetChannel?.addEventListener('message', event => {
  if (event.data !== 'reset' || resetting) return;
  resetting = true;
  clearTimeout(saveTimer);
  saveTimer = 0;
  window.location.reload();
});
type PracticeBackup = Pick<Save,'activities'|'design'|'designs'|'idea'>;
let practiceBackup: PracticeBackup | null = null;
type Route = { page: Page; screen: number };
let adminBackup: { save: Save; route: Route; history: Route[]; practice: PracticeBackup | null } | null = null;
let currentRoute: Route = { page: 'title', screen: 1 };
const backStack: Route[] = [];
let stopCompanionVoice = () => {};
const adminOn = () => adminBackup !== null;
const audioEnabled = () => { const settings=normalizedAudioSettings(s.settings); return settings.effects || settings.music; };
const canEnter = (n: number) => accessible(s, n, adminOn());
const canActivate = () => coreReady(s, adminOn());
const esc = (x: unknown) => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function sound(success = false) { ensureAudio(s.settings); playEffect(success ? 'success' : 'click', s.settings); }
function notify(text: string) { document.querySelector('.toast')?.remove(); const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.textContent = text; document.body.append(toast); window.setTimeout(() => toast.remove(), 4200); }
function saveView() {
  const el=document.querySelector('#save-status');if(el){el.textContent=adminOn()?'미리보기 · 원래 기록은 보존돼':saving?'기록 중…':saveMessage||'이 기기에 자동 저장';el.classList.toggle('save-error',Boolean(saveMessage));}
  let warning=document.querySelector<HTMLButtonElement>('.quest-save-warning');
  if(saveMessage&&!adminOn()){if(!warning){warning=document.createElement('button');warning.className='quest-save-warning';warning.setAttribute('role','alert');warning.addEventListener('click',()=>void flush());document.body.append(warning);}warning.textContent='기록을 저장하지 못했어 · 눌러서 다시 저장';warning.title=saveMessage;}else warning?.remove();
}
function saveSnapshot(): Save {
  if (!practiceBackup) return s;
  return { ...s, activities: practiceBackup.activities, design: practiceBackup.design, designs: practiceBackup.designs, idea: practiceBackup.idea, resume: 0 };
}
async function flush() { if (adminOn() || resetting) return; clearTimeout(saveTimer); saveTimer=0; saving = true; saveView(); try { const owner=s, snap = saveSnapshot(); await persist(snap); owner.revision = snap.revision; saveMessage = ''; } catch (e) { saveMessage = e instanceof Error ? e.message : '저장 실패 · 다시 시도'; } finally { saving = false; saveView(); } }
function touch() { if (adminOn() || resetting) return; s.updated = new Date().toISOString(); clearTimeout(saveTimer); saveTimer = window.setTimeout(() => void flush(), 500); }
function cleanPage() { stopCompanionVoice(); autoplay.reset(); cleanup?.(); cleanup = undefined; city?.destroy(); city = undefined; modalCleanup?.(); modalCleanup = undefined; document.querySelector('.modal-backdrop')?.remove(); }
function restorePractice() { if (!practiceBackup) return; s.activities = practiceBackup.activities; s.design = practiceBackup.design; s.designs = practiceBackup.designs; s.idea = practiceBackup.idea; practiceBackup = null; }
function go(next: typeof page, remember = true) {
  if (remember && (next !== currentRoute.page || (next === 'activity' && screen !== currentRoute.screen))) { backStack.push({ ...currentRoute }); history.pushState({ depth: (history.state?.depth ?? 0) + 1 }, ''); }
  cleanPage(); document.querySelector('.toast')?.remove(); if (next !== 'activity') restorePractice(); page = next;
  if (next === 'ending') setMusicTheme('final', true);
  currentRoute = { page, screen }; render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function goBack() {
  const previous = backStack.pop(); if (!previous) return;
  if (previous.page === 'activity' && canEnter(previous.screen)) startActivity(previous.screen, s.evidence.length > Math.floor((previous.screen - 1) / 2), false);
  else go(previous.page === 'activity' ? 'city' : previous.page, false);
}
function startActivity(n: number, practice = false, remember = true) {
  if (!canEnter(n)) return notify('앞의 탐구를 마치면 이 활동이 열려.');
  if ((practice || adminOn()) && !practiceBackup) { practiceBackup = { activities: structuredClone(s.activities), design: structuredClone(s.design), designs: structuredClone(s.designs), idea: structuredClone(s.idea) }; const first = Math.floor((n - 1) / 2) * 2 + 1; s.activities[first] = emptyActivity(); s.activities[first + 1] = emptyActivity(); if (first === 9) s.idea = undefined; }
  screen = n; s.activities[n] ||= emptyActivity(); s.resume = practiceBackup ? 0 : n; go('activity', remember); touch();
}
function button(action: string, label: string, style = 'soft', disabled = false) { return `<button class="btn ${style}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function render() {
  setMusicTheme(page === 'ending' || page === 'certificate' ? 'final' : 'main');
  document.body.classList.add('quest-mode');
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
  app.innerHTML = `${questHud({ first: page === 'title', homeLabel: page === 'city' ? '시작 화면으로 가요' : '지도로 가요', sound: audioEnabled(), canBack: backStack.length > 0, teacher:adminOn() })}<main id="main-content" class="page page-${page}">${html}</main>`;
  bindCommon();
  if (page === 'city') void bindCity();
  if (page === 'activity') bindActivity();
  if (page === 'core') bindCore();
  if (page === 'report') { bindConceptLinks(app); bindEvidenceTabs(app); }
  if (page === 'ending') bindEnding();
  if (page === 'certificate') { const input = document.querySelector<HTMLInputElement>('#nickname')!; input.addEventListener('input', () => { s.settings.nickname = input.value.slice(0, 20); document.querySelector('#certificate-name')!.textContent = s.settings.nickname || '우리 도시의 과학 탐험가'; touch(); });
    document.querySelectorAll<HTMLButtonElement>('[data-ability]').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.ability), out = document.querySelector<HTMLElement>('#certificate-ability')!; s.settings.ability = i; document.querySelectorAll('[data-ability]').forEach(o => o.setAttribute('aria-pressed', String(o === b))); out.querySelector('strong')!.textContent = abilityStatements[i]; out.hidden = false; playEffect('success', s.settings); touch(); })); }
  saveView();
}
function titlePage() { return questTitle(s,adminOn()); }
function cityPage() { return expeditionMarkup(s, adminOn()); }
let pendingPlace: number | null = null;
function bindCity() {
  city = mountExpedition(document.querySelector('.quest-city')!, {save:s,admin:adminOn(),onPosition:p=>{if(s.city.x!==p.x||s.city.y!==p.y){s.city=p;touch();}},onArrive:showPlace,onResident:showResident});
  if(pendingPlace!==null){city.goTo(pendingPlace);pendingPlace=null;}
}
function showResident(stage:number) {
  const {name}=residents[stage];
  let dispose=()=>{};
  const modal=showModal(chatMarkup(s,stage)+button('modal-close','지도로 돌아가기','primary'),`${name} 이야기`,()=>dispose());
  modal.dialog.classList.add('resident-dialog');
  dispose=bindResidentChat(modal.dialog,s,stage,()=>{
    const marker=app.querySelector<HTMLButtonElement>(`[data-resident="${stage}"]`);
    if(marker){
      marker.dataset.greeted='true';
      marker.setAttribute('aria-label',marker.title=`${name} 다시 대화하기`);
      marker.querySelector('.resident-bubble')!.textContent='···';
    }
    playEffect('success',s.settings);touch();
  });
}
function showPlace(index:number) {
  const open=adminOn() || index<=s.evidence.length, done=index<s.evidence.length;
  if(adminOn()){
    if(index===5){s.final.report=true;go(s.final.complete?'certificate':'core');}
    else startActivity(index*2+1);
    return;
  }
  showModal(`<div class="entrance-portrait">${mascot('mili',130,done?3:0)}</div><h2>${index===5?'중앙 광장':stageNames[index]}</h2><p>${open ? index===5?'실험 사진을 보며 다섯 가지 발견을 수첩에 정리해 보자.':missionNames[index] : '앞 구역의 탐구를 마치면 새 도구와 함께 이곳이 열려.'}</p>${open&&index<5?`<p class="entrance-reward-preview">고치면 <strong>${questRewards[index].name}</strong>를 받아 다음 의뢰에 쓸 수 있어.</p>`:''}${open?button('enter',index===5?s.final.complete?'내 수료증 보기':'발견 정리 시작':done?'다른 방법으로 다시 탐구':'안으로 들어가기 →','primary'):button('modal-close','길로 돌아가기','primary')}${done?'<p>처음 발견과 복구 기록은 그대로 보관돼.</p>':''}`, '시설 입구');
  document.querySelector('[data-action="enter"]')?.addEventListener('click',()=>{modalCleanup?.();if(index===5){s.final.report=true;touch();go(s.final.complete?'certificate':'core');}else {let n=index*2+1;if(!done&&s.completed.includes(n))n++;startActivity(n,done);}});
}
let currentView: View;
// Teacher unlock opens every step, so "next" always moves on without writing completion records.
function nextStep(a: Activity) {
  const next = inquiryNext(screen, a, s);
  if (!adminOn()) return next;
  if (inquiryPhase(a) === 'experiment' && !(a.values.inquiryVersion === 2 && screen % 2)) return { label: next.label, enabled: true };
  return { label: screen % 2 ? '다음 탐구로' : screen < 10 ? '다음 구역으로' : '도시로 돌아가기', enabled: true };
}
function activityPage() {
  const model=s;
  const a=model.activities[screen] ||= emptyActivity();
  if(usesIdeaLab(model,screen)){a.values.ideaVersion=1;currentView=ideaView(screen,a,model,adminOn());return currentView.html;}
  currentView=inquiryView(screen,a,model,adminOn());
  const next=nextStep(a);
  return `<section class="quest-activity${adminOn() ? ' is-preview' : ''}"><header class="mission-head">${visualPreview(screen,s.design.template)}<span class="stage-label">구역 ${Math.ceil(screen/2)} · ${stageNames[Math.floor((screen-1)/2)]} · 탐구 ${screen%2?1:2}/2</span><h1 class="mission-question">${missionQuestions[screen-1]}</h1><div class="mission-head-row">${inquirySteps(screen,a)}</div><p class="mission-next-action" aria-live="polite" aria-atomic="true"></p></header><div id="experiment-root" class="screen-${screen}">${currentView.html}</div>${coachMarkup(screen)}<div class="mission-study-tools"><button class="quest-text-button" data-action="observations">내 실험 다시 보기 <span class="discovery-count"></span></button></div><button class="quest-cta mission-cta" data-action="complete" ${next.enabled?'':'disabled'}>${next.label} ${icon('arrow',24)}</button>${adminOn()||inquiryPhase(a)!=='experiment'?'':`<button ${next.enabled?'hidden':''} class="quest-cta mission-cta missing-step" data-action="missing-step" aria-controls="coach-bubble" type="button">자꾸 · 남은 단계 보기</button>`}</section>`;
}
function openRecords() {
  const a = s.activities[screen];
  const trials = a.trials || [];
  const replay = trials.length || !a.records.length ? trialReplayMarkup(trials) : '<p class="replay-empty">이 탐구에는 글로 남긴 관찰이 있어.</p>';
  const notes = a.records.length ? `<details class="replay-notes" ${trials.length?'':'open'}><summary>관찰 메모 ${a.records.length}개</summary><ul class="observation-list">${a.records.map(r=>`<li><strong>${esc(r.label)}</strong><span>${esc(readableRecord(r.result))}</span></li>`).join('')}</ul></details>` : '';
  let dispose = () => {};
  const modal = showModal(`<div class="record-drawer-content"><h2>내 실험 다시 보기</h2>${replay}${notes}</div>`, '내 실험 다시 보기',()=>dispose());
  dispose = bindTrialReplay(modal.dialog, trials, s.settings.motion);
}
function meta() {
  const a = s.activities[screen]; if (page !== 'activity' || !a || a.values.ideaVersion === 1) return;
  const done = ready(screen, a, s); const next=nextStep(a); const button = document.querySelector<HTMLButtonElement>('[data-action="complete"]'); if (button) { button.disabled = !next.enabled; button.innerHTML=`${next.label} ${icon('arrow',24)}`; }
  const blocked=document.querySelector<HTMLButtonElement>('[data-action="missing-step"]');if(blocked)blocked.hidden=next.enabled;
  const hint = document.querySelector('#completion-hint'); if (hint) hint.textContent = done ? '탐구를 마쳤어! 다음으로 가볼까?' : '직접 실험하고 발견을 기록해보자.';
  const count = document.querySelector('#record-count'); if (count) count.textContent = `${a.records.length}개의 관찰`;
  document.querySelector('.quest-activity')?.dispatchEvent(new Event('coach-update'));
}
function bindActivity() {
  const root = document.querySelector<HTMLElement>('#experiment-root')!;
  if (s.activities[screen].values.ideaVersion === 1) {
    const dispose = currentView.bind({ screen, a: s.activities[screen], s, root, refresh: () => { cleanup?.(); cleanup = undefined; render(); }, touch, meta, notify });
    cleanup = () => dispose?.();
    return;
  }
  bindConceptLinks(document.querySelector('.quest-activity')!);
  const refresh = () => {
    const active = document.activeElement as HTMLElement | null, scroll = window.scrollY;
    const card = root.querySelector<HTMLElement>('.field-content') || root.querySelector<HTMLElement>('.inquiry-card'), cardTop = card?.scrollTop;
    const phase = root.querySelector<HTMLElement>('[data-phase]')?.dataset.phase;
    const focus = active?.dataset.drag ? `[data-drag="${active.dataset.drag}"]` : active?.dataset.field ? `[data-field="${active.dataset.field}"]` : active?.dataset.inquiryGroup ? `[data-inquiry-group="${active.dataset.inquiryGroup}"][data-value="${active.dataset.value}"]` : active?.dataset.inquiry ? `[data-inquiry="${active.dataset.inquiry}"]` : '';
    cleanup?.(); cleanup = undefined; render();
    const nextRoot = document.querySelector<HTMLElement>('#experiment-root')!;
    if (phase === nextRoot.querySelector<HTMLElement>('[data-phase]')?.dataset.phase) {
      if (focus) (nextRoot.querySelector<HTMLElement>(focus) || (active?.dataset.inquiry==='field-test' ? nextRoot.querySelector<HTMLElement>('[data-inquiry="field-next"]') : null))?.focus({ preventScroll: true });
      const nextCard = nextRoot.querySelector<HTMLElement>('.field-content') || nextRoot.querySelector<HTMLElement>('.inquiry-card');
      if (nextCard && cardTop !== undefined) nextCard.scrollTop = cardTop;
    }
    if (phase === 'explain' && nextRoot.querySelector('[data-phase="complete"]')) {
      document.querySelector<HTMLButtonElement>('[data-action="complete"]')?.focus({ preventScroll:true });
    }
    window.scrollTo({ top: scroll, behavior: 'instant' });
  };
  const model=s, a=model.activities[screen];
  const viewCleanup = currentView.bind({ screen, a, s:model, root, refresh, touch, meta, notify });
  const placementCleanup = bindPlacement(root);
  const coachCleanup = bindCoach(document.querySelector('.quest-activity')!, screen, a, model);
  // Cards and feedback start below the mission head, whatever its wrapped height.
  const shell = document.querySelector<HTMLElement>('.quest-activity')!, head = shell.querySelector<HTMLElement>('.mission-head')!;
  if(canDemonstrate(screen,a))root.insertAdjacentHTML('beforebegin',autoplay.markup());
  const autoplayCleanup=autoplay.bind(shell,root,screen,s,notify);
  // Keep optional help useful without stacking several panels over the experiment.
  const helpEvents=new AbortController();
  const closeOtherHelp=(keep:HTMLElement)=>{
    shell.querySelectorAll<HTMLDetailsElement>('.mission-access[open], .play-question[open]').forEach(panel=>{if(panel!==keep)panel.open=false;});
    const coach=shell.querySelector<HTMLButtonElement>('.coach-toggle');
    if(keep!==coach&&coach?.getAttribute('aria-expanded')==='true')coach.click();
  };
  shell.addEventListener('toggle',event=>{const panel=event.target;if(panel instanceof HTMLDetailsElement&&panel.open&&panel.matches('.mission-access, .play-question'))closeOtherHelp(panel);},{capture:true,signal:helpEvents.signal});
  shell.addEventListener('click',event=>{const coach=(event.target as HTMLElement).closest<HTMLElement>('.coach-toggle');if(coach?.getAttribute('aria-expanded')==='true')closeOtherHelp(coach);},{signal:helpEvents.signal});
  const placeHead = () => shell.style.setProperty('--head-bottom', `${Math.ceil(head.getBoundingClientRect().bottom - shell.getBoundingClientRect().top)}px`);
  const headObserver = new ResizeObserver(placeHead); headObserver.observe(head); placeHead();
  cleanup = () => { autoplayCleanup(); viewCleanup?.(); placementCleanup(); coachCleanup(); headObserver.disconnect(); helpEvents.abort(); };
  root.addEventListener('revise', () => startActivity(9));
  root.addEventListener('open-3d', event => open3d((event as CustomEvent<Open3d>).detail));
}
let finishingActivity = false;
async function finishActivity() {
  if (finishingActivity) return;
  autoplay.reset();
  finishingActivity = true;
  try { await finishActivityOnce(); } finally { finishingActivity = false; }
}
async function finishActivityOnce() {
  const activity=s.activities[screen], idea=activity.values.ideaVersion===1;
  if(!idea&&inquiryPhase(activity)==='experiment'&&(adminOn()||missionReady(screen,activity,s)))rememberExperiment(activity,document.querySelector('#experiment-root canvas'));
  if(adminOn()){if(!idea&&advanceInquiry(activity)){cleanup?.();cleanup=undefined;render();return;}sound(true);if(screen<10)return startActivity(screen+1);restorePractice();go('city');return;}
  if(!idea&&inquiryPhase(activity)==='experiment'&&missionReady(screen,activity,s)&&advanceInquiry(activity)){touch();cleanup?.();cleanup=undefined;render();return;}
  if (!ready(screen, s.activities[screen], s)) return;
  sound(true);
  if (practiceBackup) { if (screen % 2) return startActivity(screen + 1); restorePractice(); s.resume = 0; await flush(); go('city'); notify('다시 탐구했어! 처음 발견과 복구 기록은 그대로 보관돼.'); return; }
  const stage = Math.floor((screen - 1) / 2);
  const newResident = screen % 2 === 0 && !s.evidence.some(e => e.stage === stage);
  if (screen === 9 && !idea) { record(s.activities[9],{ key: 'design', label: '최초 설계 초안', result: `${s.design.template === 'box' ? '보관함' : '원격 운반 도구'} · ${s.design.pair === 'iron' ? '철 부품' : '자석 쌍'} · 거리 ${s.design.gap <= 36 ? '가까움' : '멀어짐'} · ${s.design.aligned ? '마주 보게 배치' : '배치 조정 전'}` }); }
  if (!completeActivity(s, screen)) return;
  await flush();
  if (screen % 2) {
    startActivity(screen+1);if(!idea)notify(`첫 탐구 완료! ${stageNames[stage]} 입구등이 켜졌어.`);return;
  }
  go('city');
  if(newResident)city?.welcomeResident(stage);
  showReward(stage,newResident);
}
function showReward(stage: number,newResident: boolean) {
  playEffect('reward',s.settings);
  const kit = questRewards[stage];
  const classic=`<div class="reward-celebration">${mascot('mili', 150, 3)}<div class="award-icon">${icon(questRewards[stage].icon, 38)}</div>${mascot('dangi', 150, 3)}</div><span class="eyebrow">DISCOVERY ${String(stage + 1).padStart(2, '0')}</span><h2>${questRewards[stage].name} 획득!</h2><p>${questRewards[stage].change}<br><strong>${questRewards[stage].use}</strong></p><p class="reward-evidence">${evidenceNames[stage]}도 연구 가방에 보관했어.</p><div class="award-progress">도시 복구 <strong>${progress(s)}%</strong></div><div class="modal-actions">${button('next-zone', stage < 4 ? '다음 구역으로 →' : '광장에서 발견 정리 →', 'primary')}${newResident ? button('meet-resident', `${residents[stage].name} 만나기`) : button('modal-close', '도시 둘러보기')}<button class="quest-text-button" data-concept="${stage}">개념 영상 보기 · 선택</button></div>`;
  const reunion = `<div class="town-news"><img src="/assets/quest/resident-${stage+1}.webp" alt=""><div><small>마을 소식 · ${stage + 1} / 5 구역 복구</small><h2>${reunionTitle(stage)}</h2><p>${restoredTownMessage(stage)}</p></div></div>
    <div class="town-news-earned"><span>${icon(kit.icon,24)}<b>${kit.name}</b><small>연구 가방에 저장</small></span><div><strong>도시 복구 ${progress(s)}%</strong><progress aria-label="도시 복구율" max="100" value="${progress(s)}"></progress></div></div>
    <div class="town-news-actions">${button('next-zone',stage<4?'다음 구역으로 →':'광장에서 발견 정리 →','primary')}${button('meet-resident',`${residents[stage].name} 만나기`)}<button class="quest-text-button" data-concept="${stage}">개념 영상</button></div>`;
  const modal=showModal(newResident?reunion:classic,newResident?reunionTitle(stage):'연구 기록 완성');
  if(newResident){modal.dialog.classList.add('town-reunion');modal.dialog.parentElement!.classList.add('town-reunion-backdrop');}
  modal.dialog.querySelector('[data-action="meet-resident"]')?.addEventListener('click', () => {
    modal.close();
    app.querySelector<HTMLButtonElement>(`[data-resident="${stage}"]`)?.click();
  });
  modal.dialog.querySelector('[data-action="next-zone"]')?.addEventListener('click', () => {
    modal.close();
    if (stage < 4) startActivity(stage * 2 + 3);
    else { s.final.report = true; touch(); go('core'); }
  });
  bindConceptLinks(modal.dialog);
}
function evidenceCard(e: Evidence) { return `<article class="evidence-card"><span class="evidence-number">0${e.stage + 1}</span><div><span class="eyebrow">${stageNames[e.stage]}</span><h3>${evidenceNames[e.stage]}</h3>${e.activities.flatMap(a => a.trials || []).slice(-1).map(trialPicture).join('')}<button type="button" class="btn concept-link" data-concept="${e.stage}">12초 개념 영상 다시 보기</button><details><summary>전체 실험 기록 ${e.summary.length}개</summary><ul>${e.summary.map(t => `<li>${esc(readableRecord(t))}</li>`).join('')}</ul></details></div><span class="evidence-stamp">발견</span></article>`; }
function evidenceCollection(items: Evidence[], prefix: string) {
  const names=['생활','재료','극','원격','발명'];
  return `<div class="evidence-browser"><div class="evidence-tabs" role="tablist" aria-label="구역별 내 발견">${items.map((e,i)=>`<button type="button" role="tab" id="${prefix}-tab-${i}" aria-controls="${prefix}-panel-${i}" aria-selected="${i===items.length-1}" tabindex="${i===items.length-1?0:-1}" data-evidence="${i}">${e.stage+1} · ${names[e.stage]}</button>`).join('')}</div>${items.map((e,i)=>`<div class="evidence-panel" role="tabpanel" id="${prefix}-panel-${i}" aria-labelledby="${prefix}-tab-${i}" ${i===items.length-1?'':'hidden'}>${evidenceCard(e)}</div>`).join('')}</div>`;
}
function bindEvidenceTabs(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.evidence-browser').forEach(browser=>{
    const tabs=[...browser.querySelectorAll<HTMLButtonElement>('[data-evidence]')],panels=[...browser.querySelectorAll<HTMLElement>('.evidence-panel')];
    const select=(index:number,focus=false)=>{tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});if(focus)tabs[index].focus();};
    tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',event=>{let next=i;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();select(next,true);});});
  });
}
function notebook() {
  const content = s.evidence.length ? evidenceCollection(s.evidence,'bag') : `<div class="empty-notebook">${mascot('dangi', 110)}<h3>아직 연구 기록이 없어.</h3><p>한 구역의 두 활동을 마치면 네 발견이 여기에 차곡차곡 모여.</p></div>`;
  showModal(`<span class="eyebrow">MY RESEARCH KIT</span><h2>우리 도시의 연구 기록</h2><p>${s.evidence.length} / 5개의 발견을 모았어.</p>${rewardBelt(s)}<div class="notebook-list">${content}</div>`, '연구 가방');
  bindConceptLinks(document.querySelector('.modal')!);
  bindEvidenceTabs(document.querySelector('.modal')!);
}
function reportPage() { return `<div class="report-heading"><span class="eyebrow">나의 탐험 기록</span><h1>다섯 건물에서 찾은 <br>자석의 비밀.</h1><p>실험 장면을 살펴보고, 다섯 문제로 발견을 정리하자.</p></div><div class="report-list">${s.evidence.length?evidenceCollection(s.evidence,'report'):'<p class="report-empty">미리보기라 아직 모인 발견이 없어. 다섯 구역을 마치면 여기에 내 실험 기록이 모여.</p>'}</div><div class="report-actions">${button('city', '도시로 돌아가기')}${button('reviewed', `발견 정리 시작 ${icon('arrow')}`, 'primary', !adminOn() && s.evidence.length !== 5)}</div>`; }
let finalScene: View;
function corePage() {
  finalScene = restorationView(s,adminOn());
  return '<div id="final-root" class="quest-core">' + finalScene.html + '</div>';
}
function bindCore() {
  const root = document.querySelector<HTMLElement>('#final-root')!;
  const dispose = finalScene.bind({ screen: 10, a: emptyActivity(), s, root, touch, meta: () => {}, notify, refresh: () => { cleanup?.(); cleanup = undefined; render(); } });
  root.addEventListener('activate-final', () => { void activate(); });
  cleanup = () => { dispose?.(); };
}
async function activate() { if (!canActivate() || s.final.complete) return; s.final.complete = true; s.final.date ||= new Date().toISOString(); await flush(); sound(true); go('ending'); }
// The ending page is the finale film; its closing card leads to the certificate.
function endingPage() { return '<section class="ending-film" aria-label="도시 축제 영상"></section>'; }
function bindEnding() { cleanup = playStory('final', { effects: normalizedAudioSettings(s.settings).effects, motion: s.settings.motion, onDone: () => go('certificate') }); }
/** Story film over the current page (intro, or replays from settings). The page pauses underneath. */
function openFilm(id: FilmId, onDone: () => void, replay = false) {
  modalCleanup?.(); document.querySelector('.modal-backdrop')?.remove();
  city?.pause(true); window.dispatchEvent(new CustomEvent('experiment-pause', { detail: true }));
  const release = () => { close(); if (modalCleanup === release) modalCleanup = undefined; city?.pause(false); window.dispatchEvent(new CustomEvent('experiment-pause', { detail: false })); };
  const close = playStory(id, { effects: normalizedAudioSettings(s.settings).effects, motion: s.settings.motion, replay, onDone: () => { release(); onDone(); } });
  modalCleanup = release;
}
function certificatePage() {
  const ability = abilityStatements[s.settings.ability ?? -1];
  const sheet = `<div class="certificate"><div class="certificate-border">${adminOn() ? '<p class="certificate-preview">관리자 미리보기 · 실제 수료 기록이 아니야</p>' : ''}<span class="certificate-overline">밀고 당기는 도시 · 자석 탐험대</span><div class="certificate-medal">${icon('spark', 38)}</div><h2>자석 도시 복구 연구원 인증서</h2><p class="certificate-name" id="certificate-name">${esc(s.settings.nickname || '우리 도시의 과학 탐험가')}</p><p>자석의 성질을 직접 관찰하고 실험하여<br><strong>밀고 당기는 도시를 다시 움직이게 했습니다.</strong></p><p class="certificate-ability" id="certificate-ability" ${ability ? '' : 'hidden'}>나는 이제 <strong>${esc(ability || '')}</strong></p><div class="certificate-achievements">${evidenceNames.map(n => `<span>${icon('check', 17)} ${n.replace(' 기록', '').replace(' 검증서', '')}</span>`).join('')}</div><div class="certificate-bottom">${mascot('mili', 78)}<div><strong>도시 복구 100% · 5개의 연구 기록</strong><span>${s.final.date ? new Date(s.final.date).toLocaleDateString('ko-KR') : ''}</span></div>${mascot('dangi', 78)}</div></div></div>`;
  const panel = `<aside class="certificate-panel"><span class="eyebrow">미션 완료</span><h1>우리 도시의 과학 탐험가</h1><div class="certificate-name-input"><label for="nickname">인증서에 넣을 별명 <small>(선택)</small></label><input id="nickname" maxlength="20" placeholder="우리 도시의 과학 탐험가" value="${esc(s.settings.nickname)}"/></div><fieldset class="ability-picker"><legend>나는 이제 무엇을 할 수 있게 됐을까?</legend><p>가장 자신 있는 한 가지를 골라 인증서에 새겨 봐.</p>${abilityStatements.map((t, i) => `<button type="button" class="ability-option" data-ability="${i}" aria-pressed="${s.settings.ability === i}">${esc(t)}</button>`).join('')}</fieldset><div class="certificate-actions">${button('print', `${icon('print', 18)} 인증서 인쇄`, 'primary')}${button('city', `${icon('map', 18)} 도시 둘러보기`)}${button('replay-ending', '엔딩 다시 보기', 'text-button')}</div></aside>`;
  return `<div class="certificate-stage">${sheet}${panel}</div>`;
}
function showModal(content: string, label: string, onClose?: () => void) {
  modalCleanup?.(); document.querySelector('.modal-backdrop')?.remove(); city?.pause(true);
  const previous = document.activeElement as HTMLElement | null, backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${label}" tabindex="-1"><button class="modal-close icon-button" aria-label="닫기">${icon('close')}</button>${content}</section>`;
  document.body.append(backdrop); const dialog = backdrop.querySelector<HTMLElement>('.modal')!;
  app.inert = true; window.dispatchEvent(new CustomEvent('experiment-pause', { detail: true }));
  let closed = false;
  const close = () => { if(closed)return;closed=true;onClose?.();setAudioPaused(false); backdrop.remove(); app.inert = false; city?.pause(false); window.dispatchEvent(new CustomEvent('experiment-pause', { detail: false })); document.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus(); modalCleanup = undefined; if (page === 'activity') meta(); };
  const trap = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const nodes = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, summary, video[controls], [tabindex="0"]')].filter(el=>el.getClientRects().length>0); const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { e.preventDefault(); first?.focus(); } } };
  document.addEventListener('keydown', trap); backdrop.querySelectorAll('.modal-close, [data-action="modal-close"]').forEach(b => b.addEventListener('click', close));
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); }); dialog.focus(); modalCleanup = close;
  return { dialog, close };
}
function openConcept(stage: number, replay = true, onContinue?: () => void) {
  if(!concepts[stage])return;
  let dispose = () => {};
  const modal = showModal(conceptMarkup(stage,replay),concepts[stage].title,()=>dispose());
  modal.dialog.classList.add('concept-dialog');
  setAudioPaused(true);
  dispose = bindConcept(modal.dialog,normalizedAudioSettings(s.settings).effects,s.settings.motion,()=>{modal.close();onContinue?.();});
}
type Open3d = { kind: 'rings'; released: boolean; rings: { top: 'N' | 'S'; onPole: boolean }[] };
function open3d(detail: Open3d) {
  const title = '고리자석을 3D로 돌려 보기';
  let dispose = () => {};
  const modal = showModal(`<div class="view3d"><h2>${title}</h2><p class="view3d-guide">끌어서 돌려 봐. 아래에서 올려다보면 마주 보는 면의 극이 보여.</p><div class="view3d-stage" role="img" aria-label="기둥에 끼운 고리자석과 각 면의 극 표시"><p class="view3d-loading">3D 장면을 불러오는 중…</p></div><p class="view3d-note" role="status" aria-live="polite">${detail.released ? '실험대에서 손을 뗀 뒤의 모습이야.' : '아직 손을 떼기 전이야. 실험대에서 손을 떼면 높이가 바뀌어.'}</p></div>`, title, () => dispose());
  modal.dialog.classList.add('view3d-dialog');
  const stage = modal.dialog.querySelector<HTMLElement>('.view3d-stage')!;
  void import('./three-view').then(async m => {
    const lifts = m.ringLifts(detail.rings.filter(r => r.onPole).map(r => r.top), detail.released); let k = 0;
    const release = await m.mountRingView(stage, detail.rings.map(r => ({ ...r, lift: r.onPole ? lifts[k++] : 0 })), s.settings.motion);
    // Closed while loading: free the renderer at once instead of leaving it running detached.
    if (!stage.isConnected) return release();
    dispose = release; stage.querySelector('.view3d-loading')?.remove();
  }).catch(() => { stage.innerHTML = '<p class="view3d-loading">3D 장면을 불러오지 못했어. 실험대에서 그대로 계속할 수 있어.</p>'; });
}
function bindConceptLinks(root: HTMLElement) { root.querySelectorAll<HTMLButtonElement>('[data-concept]').forEach(button=>button.addEventListener('click',()=>openConcept(Number(button.dataset.concept)))); }
function setTeacherPreview(enabled:boolean) {
  if(enabled===adminOn())return;
  cleanPage();
  if(enabled){
    if(saveTimer)void flush();
    const preview=structuredClone(s);
    adminBackup={save:s,route:{...currentRoute},history:backStack.splice(0),practice:practiceBackup};
    s=preview;practiceBackup=null;
    go('city',false);
    document.querySelector<HTMLButtonElement>('[data-map-overview]')?.click();
    notify('탐구 10개와 마지막 복구가 모두 열렸어. 원하는 건물로 가 봐.');
  }else if(adminBackup){
    const student=adminBackup;
    adminBackup=null;s=student.save;practiceBackup=student.practice;
    screen=student.route.screen;backStack.splice(0,backStack.length,...student.history);
    go(student.route.page,false);
    notify('학생용으로 돌아왔어. 원래 진행 기록이 그대로 남아 있어.');
  }
  syncAudioSettings(s.settings);
}
async function restartExploration(startNow: boolean) {
  if (resetting) return;
  resetting = true;
  app.inert = true;
  const preview = adminOn();
  const hadPendingSave = Boolean(saveTimer);
  clearTimeout(saveTimer);
  saveTimer = 0;
  const next = freshSave();
  next.settings = { ...s.settings, nickname: '', ability: undefined };
  next.started = startNow;
  try {
    if (!preview) await resetSave(next);
  } catch {
    resetting = false;
    app.inert = Boolean(document.querySelector('.modal-backdrop'));
    if (hadPendingSave) touch();
    notify('탐험 기록을 초기화하지 못했어. 설정에서 다시 시도해 줘.');
    return;
  }
  cleanPage();
  practiceBackup = null;
  pendingPlace = null;
  screen = 1;
  backStack.length = 0;
  s = next;
  if (!preview) {
    saveMessage = '';
    resetChannel?.postMessage('reset');
  }
  go('title', false);
  resetting = false;
  app.inert = false;
  if (startNow) openFilm('intro', () => go('city'));
  else notify(preview ? '교사용 진행 기록을 지웠어. 학생 기록은 그대로 남아 있어.' : '탐험 기록을 초기화했어. 새로 시작할 수 있어.');
}
function openSettings() {
  modalCleanup?.();
  modalCleanup=openGameSettings({save:s,admin:adminOn(),onChange:()=>{touch();syncAudioSettings(s.settings);const b=document.querySelector<HTMLButtonElement>('[data-action="sound"]');if(b){const on=audioEnabled();b.innerHTML=icon(on?'sound':'mute');b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'소리 끄기':'소리 켜기');}},
    onPause:paused=>{city?.pause(paused);document.querySelector<HTMLElement>('#experiment-root')?.toggleAttribute('inert',paused);window.dispatchEvent(new CustomEvent('experiment-pause',{detail:paused}));},
    onAdminToggle:setTeacherPreview,
    onStory:()=>openFilm('intro',()=>{},true),onEnding:()=>{if(s.final.complete||adminOn())go('ending');},onCertificate:()=>{if(s.final.complete||adminOn())go('certificate');},onRecords:notebook,
    onReset:()=>void restartExploration(false)
  });
}
function bindCommon() {
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => b.addEventListener('click', () => { const action = b.dataset.action; sound();
    switch (action) {
      case 'home': void flush(); go(page === 'city' ? 'title' : 'city'); break;
      case 'back': void flush(); if (history.state?.depth) history.back(); else goBack(); break;
      case 'start': if (!s.started) { s.started = true; touch(); openFilm('intro', () => go('city')); } else if (s.resume && accessible(s, s.resume)) startActivity(s.resume); else if (s.final.report && !s.final.complete && s.evidence.length === 5) go('core'); else go('city'); break;
      case 'new': if (adminOn()) { notify('전체 해금을 끈 뒤 새 탐험을 시작해줘.'); break; } showModal(`<h2>새로운 탐험을 시작할까?</h2><p>이 기기에 저장된 실험 기록과 도시 복구 진행이 초기화돼.</p><div class="modal-actions">${button('modal-close', '돌아가기')}<button class="btn danger" id="confirm-new">기록 지우고 새로 시작</button></div>`, '새로 시작 확인'); document.querySelector('#confirm-new')?.addEventListener('click', () => void restartExploration(true)); break;
      case 'city': void flush(); go('city'); break;
      case 'sound': s.settings.sound = !audioEnabled(); s.settings.effects=s.settings.sound; s.settings.music=s.settings.sound; syncAudioSettings(s.settings); touch(); b.innerHTML = icon(s.settings.sound ? 'sound' : 'mute'); b.setAttribute('aria-label', s.settings.sound ? '소리 끄기' : '소리 켜기'); b.setAttribute('aria-pressed',String(s.settings.sound)); break;
      case 'settings': openSettings(); break;
      case 'companion': {const parent=b.closest('.quest-companion')!,speech=parent.querySelector<HTMLElement>('.quest-speech')!,open=speech.hidden;speech.hidden=!open;b.setAttribute('aria-expanded',String(open));parent.classList.toggle('is-speaking',open);stopCompanionVoice();if(open)stopCompanionVoice=playNarration(`/audio/voices/mascot-${b.dataset.companionType}-title.mp3`,s.settings);break;}
      case 'notebook': if (page === 'activity') openRecords(); else notebook(); break;
      case 'retry-save': void flush(); break;
      case 'walk-next': if (city) city.goTo(s.evidence.length === 5 ? 5 : s.evidence.length); else pendingPlace = s.evidence.length === 5 ? 5 : s.evidence.length; break;
      case 'complete': b.disabled = true; void finishActivity(); break;
      case 'hint': notify(screen === 10 ? designResult(s.design).reason : missionGuides[screen-1]); break;
      case 'observations': openRecords(); break;
      case 'visual-guide': {
        const kind=apparatusFigure(screen);
        if(kind){
          let dispose=()=>{};
          const guide=showModal(apparatusFigureMarkup(kind),apparatusFigureTitle(kind),()=>dispose());
          guide.dialog.classList.add('apparatus-figure-dialog');
          dispose=bindApparatusFigure(guide.dialog.querySelector<HTMLElement>('.apparatus-figure')!,s.settings.motion);
          break;
        }
        const guide=showModal(visualGuideMarkup(screen,s.design.template),'장치 그림 살펴보기');
        guide.dialog.classList.add('learning-visual-dialog');
        bindVisualGuide(guide.dialog);
        break;
      }
      case 'reset-activity': { const a = s.activities[screen]; a.points = {}; a.values.round = 0; a.values.car = 24; a.values.cargo = 25; a.values.distanceStep = 'free'; a.values['paper-in'] = false; delete a.values.say; cleanPage(); render(); touch(); break; }
      case 'reviewed': if (!adminOn() && s.evidence.length !== 5) break; s.final.report = true; touch(); go('core'); break;
      case 'activate': b.disabled = true; void activate(); break;
      case 'certificate': if (adminOn() || s.final.complete) go('certificate'); break;
      case 'replay-ending': if (adminOn() || s.final.complete) go('ending'); break;
      case 'print': window.print(); break;
    }
  }));
}
window.addEventListener('popstate', () => { void flush(); goBack(); });
async function boot() { app.innerHTML = '<div class="loading-screen"><span class="loading-magnet">∪</span><p>도시로 가는 길을 준비하고 있어…</p></div>'; s = await load(); saveMessage = persistenceError; if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) s.settings.motion = false; render(); syncAudioSettings(s.settings); if (migrationNotice) notify(migrationNotice); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { if(saveTimer)void flush(); city?.pause(true); } else city?.pause(Boolean(document.querySelector('.modal-backdrop'))); });
window.addEventListener('pagehide', () => { if(saveTimer)void flush(); });
void boot();
