import './styles.css';
import './ending.css';
import './adventure.css';
import './tablet.css';
import './quest.css';
import { questHud, questCompanion, questTitle } from './quest-ui';
import { missionView } from './mission-play';
import { missionQuestions, missionGuides, questRewards } from './mission-content';
import { expeditionMarkup, mountExpedition, type ExpeditionHandle } from './expedition';
import { openGameSettings } from './game-settings';
import { ensureAudio, syncAudioSettings, playEffect, setAudioPaused, normalizedAudioSettings } from './game-audio';
import { restorationView } from './restoration';
import { bindPlacement } from './manipulation';
import { trialPicture } from './trial-records';
import { rewardBelt } from './adventure';
import { accessible, completeActivity, coreReady, emptyActivity, evidenceNames, freshSave, missionNames, opposite, progress, ready, stageNames, titles, designResult, type Evidence, type Save } from './domain';
import { clearSave, load, persist, persistenceError, migrationNotice } from './storage';
import { icon, magnet, mascot, objectArt } from './art';
import type { View } from './activity-types';

const app = document.querySelector<HTMLDivElement>('#app')!;
type Page = 'title' | 'city' | 'activity' | 'report' | 'core' | 'ending' | 'certificate';
let s: Save = freshSave(), page: Page = 'title';
let screen = 1, city: ExpeditionHandle | undefined, selected = -1, cleanup: (() => void) | undefined;
let saveTimer = 0, saving = false, saveMessage = '', modalCleanup: (() => void) | undefined, endingTimer = 0;
let practiceBackup: { activities: Save['activities']; design: Save['design']; designs: Save['designs'] } | null = null;
let adminBackup: Save | null = null;
type Route = { page: Page; screen: number };
let currentRoute: Route = { page: 'title', screen: 1 };
const backStack: Route[] = [];
const adminOn = () => adminBackup !== null;
const audioEnabled = () => { const settings=normalizedAudioSettings(s.settings); return settings.music || settings.effects; };
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
function render() {
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
  app.innerHTML = `${questHud({ first: page === 'title', sound: audioEnabled(), canBack: backStack.length > 0 })}<main id="main-content" class="page page-${page}">${html}</main>${page === 'city' ? questCompanion({message: '길이나 건물을 누르면 밀이와 함께 걸어가요. 직접 방향키나 화살표로 걸어도 좋아요. 고친 시설에서 받은 도구가 다음 탐구에 쓰여요.'}) : ''}`;
  bindCommon();
  if (page === 'city') void bindCity();
  if (page === 'activity') bindActivity();
  if (page === 'core') bindCore();
  if (page === 'ending') bindEnding();
  if (page === 'certificate') { const input = document.querySelector<HTMLInputElement>('#nickname')!; input.addEventListener('input', () => { s.settings.nickname = input.value.slice(0, 20); document.querySelector('#certificate-name')!.textContent = s.settings.nickname || '우리 도시의 과학 탐험가'; touch(); }); }
  saveView();
}
function titlePage() { return questTitle(s); }
function cityPage() { return expeditionMarkup(s, adminOn()); }
let pendingPlace: number | null = null;
function bindCity() {
  city = mountExpedition(document.querySelector('.quest-city')!, {save:s,admin:adminOn(),onPosition:p=>{s.city=p;touch();},onArrive:showPlace});
  if(pendingPlace!==null){city.goTo(pendingPlace);pendingPlace=null;}
}
function showPlace(index:number) {
  selected=index;
  const open=adminOn() || index<=s.evidence.length, done=index<s.evidence.length;
  showModal(`<div class="entrance-portrait">${mascot('mili',130,done?3:0)}</div><h2>${index===5?'중앙 광장':stageNames[index]}</h2><p>${open ? index===5?'다섯 발견과 내 설계도로 마지막 복구를 해 보자.':missionNames[index] : '앞 구역의 탐구를 마치면 새 도구와 함께 이곳이 열려.'}</p>${open&&index<5?`<p class="entrance-reward-preview">고치면 <strong>${questRewards[index].name}</strong>를 받아 다음 의뢰에 쓸 수 있어.</p>`:''}${open?button('enter',done?'다른 방법으로 다시 탐구':'안으로 들어가기 →','primary'):button('modal-close','길로 돌아가기','primary')}${done?'<p>처음 발견과 복구 기록은 그대로 보관돼.</p>':''}`, '시설 입구');
  document.querySelector('[data-action="enter"]')?.addEventListener('click',()=>{modalCleanup?.();if(index===5){go(s.final.complete?'certificate':'report');}else {let n=index*2+1;if(!done&&s.completed.includes(n))n++;startActivity(n,done);}});
}
let currentView: View;
function activityPage() {
  const a=s.activities[screen] ||= emptyActivity();
  currentView=missionView(screen,a,s);
  return `<section class="quest-activity"><h1 class="mission-question">${missionQuestions[screen-1]}</h1><div id="experiment-root" class="screen-${screen}">${currentView.html}</div>${questCompanion({message:missionGuides[screen-1],type:'dangi'})}<button class="quest-cta mission-cta" data-action="complete" ${ready(screen,a,s)?'':'disabled'}>${screen%2?'다음 의뢰로':'내 발견 이야기하기'} ${icon('arrow',24)}</button></section>`;
}
function openRecords() {
  const a = s.activities[screen];
  showModal(`<div class="record-drawer-content"><h2>내 실험 기록</h2><p>네가 움직여 본 모습이야. 흐린 그림은 시작 위치야.</p><div class="trial-grid">${(a.trials || []).map(trialPicture).join('')}</div>${a.records.length ? `<details ${a.trials?.length ? '' : 'open'}><summary>${a.trials?.length ? '자세한 관찰' : '이전 활동 기록'}</summary><ul class="observation-list">${a.records.map(r => `<li><strong>${esc(r.label)}</strong><span>${esc(r.result)}</span></li>`).join('')}</ul></details>` : '<p>물체를 움직여 첫 발견을 남겨 봐.</p>'}</div>`, '내 실험 기록');
}
function meta() {
  const a = s.activities[screen]; if (page !== 'activity' || !a) return;
  const done = ready(screen, a, s); const button = document.querySelector<HTMLButtonElement>('[data-action="complete"]'); if (button) button.disabled = !done;
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
  if (screen === 9) { s.activities[9].records = [{ key: 'design', label: '최초 설계 초안', result: `${s.design.template === 'box' ? '보관함' : '원격 운반 도구'} · ${s.design.pair === 'iron' ? '철 부품' : '자석 쌍'} · 거리 ${s.design.gap <= 36 ? '가까움' : '멀어짐'} · ${s.design.aligned ? '마주 보게 배치' : '배치 조정 전'}` }]; }
  if (!completeActivity(s, screen)) return;
  await flush();
  if (screen % 2) return startActivity(screen + 1);
  go('city');
  showModal(`<div class="reward-celebration">${mascot('mili', 150, 3)}<div class="award-icon">${icon(questRewards[stage].icon, 38)}</div>${mascot('dangi', 150, 3)}</div><span class="eyebrow">DISCOVERY ${String(stage + 1).padStart(2, '0')}</span><h2>${questRewards[stage].name} 획득!</h2><p>${questRewards[stage].change}<br><strong>${questRewards[stage].use}</strong></p><p class="reward-evidence">${evidenceNames[stage]}도 연구 가방에 보관했어.</p><div class="award-progress">도시 복구 <strong>${progress(s)}%</strong></div><div class="modal-actions">${button('modal-close', '복구된 도시 보기 →', 'primary')}</div>`, '연구 기록 완성');
}
function evidenceCard(e: Evidence) { return `<article class="evidence-card"><span class="evidence-number">0${e.stage + 1}</span><div><span class="eyebrow">${stageNames[e.stage]}</span><h3>${evidenceNames[e.stage]}</h3>${e.activities.flatMap(a => a.trials || []).slice(-1).map(trialPicture).join('')}<ul>${e.summary.slice(0, 1).map(t => `<li>${esc(t)}</li>`).join('')}</ul><details><summary>전체 실험 기록 ${e.summary.length}개</summary><ul>${e.summary.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details></div><span class="evidence-stamp">확인<br>완료</span></article>`; }
function notebook() {
  const content = s.evidence.length ? s.evidence.map(evidenceCard).join('') : `<div class="empty-notebook">${mascot('dangi', 110)}<h3>아직 연구 기록이 없어.</h3><p>한 구역의 두 활동을 마치면<br>네 발견이 여기에 차곡차곡 모여.</p></div>`;
  showModal(`<span class="eyebrow">MY RESEARCH KIT</span><h2>우리 도시의 연구 기록</h2><p>${s.evidence.length} / 5개의 발견을 모았어.</p>${rewardBelt(s)}<div class="notebook-list">${content}</div>`, '연구 가방');
}
function reportPage() { return `<div class="report-heading"><span class="eyebrow">FINAL REPORT</span><h1>다섯 번의 발견,<br>하나의 커다란 변화.</h1><p>우리가 알아낸 자석의 성질로 도시의 마지막 장치를 복구하자.</p></div><div class="report-list">${s.evidence.map(evidenceCard).join('')}</div><div class="report-actions">${button('city', '도시로 돌아가기')}${button('reviewed', `마지막 복구 시작 ${icon('arrow')}`, 'primary', !adminOn() && s.evidence.length !== 5)}</div>`; }
let finalScene: View;
function corePage() {
  finalScene = restorationView(s);
  return '<div id="final-root" class="quest-core">' + finalScene.html + '</div>';
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
function endingVignette(index:number):string {
  const rooms=['life','material','poles','remote','workshop'],props=['postal-box','parcel','book','cart',s.design.template==='box'?'postal-box':'cart'];
  return `<div class="ending-vignette ending-painted" style="background-image:url('/assets/quest/stage-${rooms[index]}.webp')"><span class="tag">${stageNames[index]}</span><img src="/assets/quest/prop-${props[index]}.webp" alt="${questRewards[index].change}"><div class="restored-ribbon">${icon('check',22)} ${questRewards[index].name}으로 이어진 발견</div></div>`;
}
function bindEnding() {
  let lastTick = performance.now(), elapsed = 0; const messages = ['잠금장치가 다시 작동해!', '재료 분류가 다시 시작됐어!', '고리 장치가 제자리를 찾았어!', '수조도, 카트도 다시 움직여!', '네 발명이 시민의 일상을 바꾸었어!'];
  let lastPart = -1;
  endingTimer = window.setInterval(() => { const now=performance.now(),delta=Math.max(0,now-lastTick);lastTick=now;if(document.hidden||document.querySelector('dialog[open],.modal-backdrop'))return;elapsed+=delta;const part = Math.min(4, Math.max(0, Math.floor((elapsed - 3000) / 3400))); const bar = document.querySelector<HTMLElement>('#ending-progress'); if (bar) bar.style.width = `${Math.min(100, elapsed / 240)}%`; const text = document.querySelector('#ending-text'); if (text && elapsed > 3000) text.textContent = messages[part]; if (elapsed > 3000 && part !== lastPart) { const art = document.querySelector('.ending-art'); if (art) art.innerHTML = endingVignette(part); lastPart = part; } if (elapsed >= (s.settings.motion ? 24000 : 6000)) go('certificate'); }, 200);
}
function certificatePage() { return `<div class="certificate-tools"><div><span class="eyebrow">MISSION COMPLETE</span><h1>우리 도시의 과학 탐험가</h1></div><div>${button('city', `${icon('map', 18)} 도시 둘러보기`)}${button('print', `${icon('print', 18)} 인증서 인쇄`, 'primary')}</div></div><div class="certificate"><div class="certificate-border">${adminOn() ? '<p class="certificate-preview">관리자 미리보기 · 실제 수료 기록이 아니야</p>' : ''}<span class="certificate-overline">SCIENCE WORLD · MAGNET CITY</span><div class="certificate-medal">${icon('spark', 38)}</div><h2>자기 도시 복구 연구원 인증서</h2><p class="certificate-name" id="certificate-name">${esc(s.settings.nickname || '우리 도시의 과학 탐험가')}</p><p>자석의 성질을 직접 관찰하고 실험하여<br><strong>밀고 당기는 도시를 다시 움직이게 했습니다.</strong></p><div class="certificate-achievements">${evidenceNames.map((n, i) => `<span>${icon('check', 17)} ${n.replace(' 기록', '').replace(' 검증서', '')}</span>`).join('')}</div><div class="certificate-bottom">${mascot('mili', 78)}<div><strong>도시 복구 100% · 5개의 연구 기록</strong><span>${s.final.date ? new Date(s.final.date).toLocaleDateString('ko-KR') : ''}</span></div>${mascot('dangi', 78)}</div></div></div><div class="certificate-name-input"><label for="nickname">인증서에 넣을 이름 <small>(선택)</small></label><input id="nickname" maxlength="20" placeholder="우리 도시의 과학 탐험가" value="${esc(s.settings.nickname)}"/>${button('replay-ending', '엔딩 다시 보기', 'text-button')}</div>`; }
function showModal(content: string, label: string) {
  modalCleanup?.(); document.querySelector('.modal-backdrop')?.remove(); city?.pause(true);
  const previous = document.activeElement as HTMLElement | null, backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${label}" tabindex="-1"><button class="modal-close icon-button" aria-label="닫기">${icon('close')}</button>${content}</section>`;
  document.body.append(backdrop); const dialog = backdrop.querySelector<HTMLElement>('.modal')!;
  app.inert = true; window.dispatchEvent(new CustomEvent('experiment-pause', { detail: true }));
  const close = () => { setAudioPaused(false); backdrop.remove(); app.inert = false; city?.pause(false); window.dispatchEvent(new CustomEvent('experiment-pause', { detail: false })); document.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus(); modalCleanup = undefined; if (page === 'activity') meta(); };
  const trap = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const nodes = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, summary, [tabindex="0"]')]; const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } };
  document.addEventListener('keydown', trap); backdrop.querySelectorAll('.modal-close, [data-action="modal-close"]').forEach(b => b.addEventListener('click', close));
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); }); dialog.focus(); modalCleanup = close;
}
function openSettings() {
  modalCleanup?.();
  modalCleanup=openGameSettings({save:s,admin:adminOn(),onChange:()=>{touch();syncAudioSettings(s.settings);const b=document.querySelector<HTMLButtonElement>('[data-action="sound"]');if(b){const on=audioEnabled();b.innerHTML=icon(on?'sound':'mute');b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'소리 끄기':'소리 켜기');}},
    onPause:paused=>{city?.pause(paused);document.querySelector<HTMLElement>('#experiment-root')?.toggleAttribute('inert',paused);window.dispatchEvent(new CustomEvent('experiment-pause',{detail:paused}));},
    onAdminToggle:enabled=>{void (async()=>{await flush();cleanPage();restorePractice();if(enabled){adminBackup=structuredClone(s);s=structuredClone(s);}else{const settings={...s.settings};s=adminBackup!;adminBackup=null;s.settings=settings;touch();}backStack.length=0;go(page==='title'?'title':'city',false);})();},
    onStory:openStory,onEnding:()=>{if(s.final.complete||adminOn())go('ending');},onCertificate:()=>{if(s.final.complete||adminOn())go('certificate');},onRecords:notebook,
    onReset:()=>{void(async()=>{try{const settings={...s.settings};clearTimeout(saveTimer);restorePractice();await clearSave();s=freshSave();s.settings={...settings,nickname:''};s.started=true;go('city');touch();}catch{notify('기록 초기화에 실패했어. 다시 시도해 줘.');}})();}
  });
}
function openStory() {
  setAudioPaused(true);
  showModal(`<div class="story-panorama"><img src="/assets/quest/city-expedition.webp" alt="고쳐야 할 시설들이 기다리는 자석 도시"></div><h2>오늘의 수리 대장, 너!</h2><p>밀이의 우편함은 열리고, 당이의 택배는 멈췄어.<br>자석을 직접 움직여 고치고, 얻은 도구로 다음 의뢰를 해결해 줘.</p><p>다섯 구역을 고치고 내 발명품까지 사용하면<br>도시 축제와 연구원 인증서가 기다려!</p><div class="reward-celebration">${mascot('mili',120)}${mascot('dangi',120)}</div>${button('modal-close','밀이·당이와 출발! →','primary')}`, '도시의 수리 의뢰');
}
function bindCommon() {
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => b.addEventListener('click', () => { const action = b.dataset.action; sound();
    switch (action) {
      case 'home': void flush(); go('title'); break;
      case 'back': void flush(); goBack(); break;
      case 'start': if (!s.started) { s.started = true; touch(); go('city'); openStory(); } else if (s.resume && accessible(s, s.resume)) startActivity(s.resume); else go('city'); break;
      case 'new': if (adminOn()) { notify('전체 해금을 끈 뒤 새 탐험을 시작해줘.'); break; } showModal(`<h2>새로운 탐험을 시작할까?</h2><p>이 기기에 저장된 실험 기록과 도시 복구 진행이 초기화돼.</p><div class="modal-actions">${button('modal-close', '돌아가기')}<button class="btn danger" id="confirm-new">기록 지우고 새로 시작</button></div>`, '새로 시작 확인'); document.querySelector('#confirm-new')?.addEventListener('click', async () => { try { clearTimeout(saveTimer); await clearSave(); const settings={...s.settings}; restorePractice(); s = freshSave(); s.settings={...settings,nickname:''}; s.started = true; go('city'); touch(); } catch { notify('저장소를 초기화하지 못했어. 다른 탭을 닫고 다시 시도해줘.'); } }); break;
      case 'city': void flush(); go('city'); break;
      case 'sound': s.settings.sound = !audioEnabled(); s.settings.effects=s.settings.sound; s.settings.music=s.settings.sound; syncAudioSettings(s.settings); touch(); b.innerHTML = icon(s.settings.sound ? 'sound' : 'mute'); b.setAttribute('aria-label', s.settings.sound ? '소리 끄기' : '소리 켜기'); b.setAttribute('aria-pressed',String(s.settings.sound)); break;
      case 'settings': openSettings(); break;
      case 'companion': {const parent=b.closest('.quest-companion')!,speech=parent.querySelector<HTMLElement>('.quest-speech')!,open=speech.hidden;speech.hidden=!open;b.setAttribute('aria-expanded',String(open));parent.classList.toggle('is-speaking',open);break;}
      case 'notebook': if (page === 'activity') openRecords(); else notebook(); break;
      case 'retry-save': void flush(); break;
      case 'walk-next': if (city) city.goTo(s.evidence.length === 5 ? 5 : s.evidence.length); else pendingPlace = s.evidence.length === 5 ? 5 : s.evidence.length; break;
      case 'complete': b.disabled = true; void finishActivity(); break;
      case 'hint': notify(screen === 10 ? designResult(s.design).reason : missionGuides[screen-1]); break;
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
async function boot() { app.innerHTML = '<div class="loading-screen"><span class="loading-magnet">∪</span><p>도시로 가는 길을 준비하고 있어…</p></div>'; s = await load(); saveMessage = persistenceError; if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) s.settings.motion = false; render(); syncAudioSettings(s.settings); if (migrationNotice) notify(migrationNotice); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { void flush(); city?.pause(true); } else city?.pause(Boolean(document.querySelector('.modal-backdrop'))); });
window.addEventListener('pagehide', () => { void flush(); });
void boot();
