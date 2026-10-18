import { emptyActivity, finalRepairPassed, flag, type Save, type Activity } from './domain';
import { inventionTestView, ringsView } from './tablet-activities';
import { deliveryView } from './delivery';
import { btn, on, update, type View, type Context } from './activity-types';
import { addTrial, trialPicture } from './trial-records';
import { draggable, bindDrag, placementControls } from './manipulation';
import { objectArt } from './art';

export function initializeFinal(s: Save) {
  s.final.route ||= { mode: 'basic', repair: 'invention', installed: false, operated: false, segments: [], revision: s.design.revision, template: s.design.template, replayEvidenceIds: s.evidence.map(e => e.stage), attempt: emptyActivity() };
  return s.final.route;
}
function sortView(a: Activity): View {
  return { html: `<div class="play-board"><div class="drop-spot" style="left:75%;top:50%">철 부품 배송함</div>${draggable('iron', '철 클립', { x: 25, y: 50 }, objectArt('clip'))}${draggable('aluminum', '알루미늄', { x: 45, y: 50 }, objectArt('aluminum'))}</div><div class="buddy-dialogue"><p>자석에 붙었던 철 부품을 배송함에 놓아 줘.</p></div>${placementControls}`, bind(c) {
    const all = ['iron', 'aluminum'].map(id => bindDrag(c, id, { x: id === 'iron' ? 25 : 45, y: 50 }, p => {
      if (id === 'iron' && p.x > 62 && p.y > 30 && p.y < 70) { a.values.sorted = true; update(c); }
      else c.notify('앞서 검사한 재료 기록을 떠올려 봐.');
    })); return () => all.forEach(fn => fn());
  } };
}
export function finalView(s: Save): View {
  const route = initializeFinal(s), a = route.attempt ||= emptyActivity();
  const next = route.mode === 'challenge' ? ['sort', 'delivery', 'rings', 'invention'].find(k => !route.segments.includes(k)) : route.repair;
  if (next && next !== 'sort' && route.repair !== next) { route.repair = next as typeof route.repair; route.installed = false; route.operated = false; route.attempt = emptyActivity(); return finalView(s); }
  a.values.activityNumber = next === 'delivery' ? 8 : next === 'rings' ? 6 : 10;
  const current = next || 'done', names: Record<string, string> = { sort: '철 부품 찾기', delivery: '자석 배송', rings: '고리 받침', invention: '내 장치', done: '복구 완료' };
  const needInstall = current === 'invention' && !route.installed;
  if (current === 'rings' && !a.values.round) { a.values.round = 1; a.values.placed1 = true; a.values.placed2 = true; }
  let view: View | undefined;
  if (!needInstall && current !== 'done' && !route.operated) view = current === 'sort' ? sortView(a) : current === 'delivery' ? deliveryView(a) : current === 'rings' ? ringsView(a) : inventionTestView(a, s);
  const replays = s.evidence.flatMap(e => e.activities.flatMap(activity => activity.trials?.slice(0, 1) || [])).slice(0, 3);
  return { html: `<div class="final-route">${['sort', 'delivery', 'rings', 'invention'].map(k => `<span class="${k === current ? 'active' : ''}">${names[k]} ${route.segments.includes(k) ? '✓' : route.mode === 'basic' && k !== current ? '· 이전 기록' : ''}</span>`).join('')}</div><h1>${names[current]}${needInstall ? '를 장착해 볼까?' : route.operated || current === 'done' ? ' · 고쳤어!' : '를 움직여 볼까?'}</h1>${route.mode === 'basic' ? `<p class="final-note">이번에 고장 난 한 구간을 고쳐 줘. 나머지 구간은 전에 남긴 실험 기록이야.</p><details><summary>이전 실험 다시 보기</summary><div class="trial-grid trial-replay">${replays.map(trialPicture).join('') || '<p>이전 활동 기록이 보관돼 있어.</p>'}</div></details>` : '<p class="final-note">선택 도전 · 네 구간을 직접 연결해 봐. 기본 학습은 이미 마쳤어.</p>'}${needInstall ? `<p>${s.design.template === 'box' ? '내 우편함 잠금 장치를 연결해 보자.' : '내 원격 운반 장치를 연결해 보자.'}</p>${btn('install', '내 설계 쓰기', 'primary')}` : view ? `<div id="final-experiment" class="experiment-root final-lab">${view.html}</div>` : ''}<div class="final-actions">${route.mode === 'challenge' ? btn('back-basic', '기본 복구로 돌아가기') : ''}${route.operated || current === 'done' ? `${btn('activate-final', '도시 복구 마무리', 'primary')}${route.mode === 'basic' ? btn('challenge', '더 해 보기 · 전부 고치기') : ''}` : ''}${route.mode === 'basic' && !route.operated ? `<label>이번 고장 <select id="final-repair"><option value="invention" ${route.repair === 'invention' ? 'selected' : ''}>내 장치</option><option value="delivery" ${route.repair === 'delivery' ? 'selected' : ''}>배송</option><option value="rings" ${route.repair === 'rings' ? 'selected' : ''}>고리</option></select></label>` : ''}</div>`, bind(c) {
    const check = () => {
      if (current === 'sort' ? flag(a, 'sorted') : finalRepairPassed(s)) {
        route.operated = true; if (!route.segments.includes(current)) route.segments.push(current);
        if (route.mode === 'challenge' && route.segments.length < 4) { route.operated = false; route.attempt = emptyActivity(); }
      }
      c.touch(); c.refresh();
    };
    const inner: Context = { ...c, screen: current === 'delivery' ? 8 : current === 'rings' ? 6 : 10, a, root: c.root.querySelector<HTMLElement>('#final-experiment') || c.root, refresh: check };
    const dispose = view?.bind(inner);
    on(c, 'install', () => { route.installed = true; route.revision = s.design.revision; route.template = s.design.template; route.attempt = emptyActivity(); update(c); });
    on(c, 'activate-final', () => c.root.dispatchEvent(new CustomEvent('activate-final', { bubbles: true })));
    on(c, 'back-basic', () => { if (route.optionalBackup) { s.final.route = JSON.parse(route.optionalBackup); update(c); } });
    on(c, 'challenge', () => { route.optionalBackup = JSON.stringify(route); route.mode = 'challenge'; route.segments = []; route.operated = false; route.installed = false; route.attempt = emptyActivity(); update(c); });
    c.root.querySelector('#final-repair')?.addEventListener('change', e => { route.repair = (e.target as HTMLSelectElement).value as typeof route.repair; route.operated = false; route.installed = false; route.attempt = emptyActivity(); update(c); });
    return () => { dispose?.(); };
  } };
}
