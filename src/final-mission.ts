import { autoplaySpeedMarkup, bindAutoplaySpeed } from './autoplay-controls';
import { emptyActivity, finalRepairPassed, plazaPuzzlePassed, opposite, flag, type Save, type Activity } from './domain';
import { inventionTestView, ringsView } from './tablet-activities';
import { deliveryView } from './delivery';
import { btn, on, update, type View, type Context } from './activity-types';
import { trialPicture } from './trial-records';
import { draggable, bindDrag, bindPlacement, placementControls } from './manipulation';
import { objectArt } from './art';
import { Surface, W, H, pt, clamp } from './mission-surface';
import { distance, magneticReach } from './mission-model';
import { playEffect } from './game-audio';

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

/** Four short mechanisms share the normal placement controls and retain their physical trial evidence. */
export function plazaPuzzleView(s:Save):View|undefined {
  const a=s.final.puzzle||=emptyActivity();
  if(a.values.notebook===true&&plazaPuzzlePassed(a))return;
  const keys=['plaza-iron','plaza-distance','plaza-poles','plaza-glass'];
  const labels=['철 부품 연결','틈 너머 열쇠','같은 극으로 밀기','유리 너머 조종'];
  const goals=['자석으로 철 부품을 왼쪽 연결 홈에 가져와 줘.','철 열쇠에 닿기 전에 자석의 힘으로 끌어와 줘.','같은 극을 마주 보게 해서 빗장을 오른쪽으로 밀어 줘.','유리 밖 자석으로 안쪽 패드를 위쪽 홈까지 옮겨 줘.'];
  const firstMissing=keys.findIndex(key=>!a.trials?.some(t=>t.key===key&&t.outcome==='success'));
  const round=Math.max(0,Math.min(3,Number(a.values.round||0),firstMissing<0?3:firstMissing));
  const done=!!a.trials?.some(t=>t.key===keys[round]&&t.outcome==='success');
  return {
    html:`<section class="plaza-puzzle"><header><small>중앙 광장 · 도깨비 대장의 잠금</small><h1>도시 중심 장치의 잠금을 풀어 줘!</h1><p>${goals[round]}</p><ol aria-label="연결 퍼즐 진행">${labels.map((label,i)=>`<li ${i===round?'aria-current="step"':''}>${a.trials?.some(t=>t.key===keys[i]&&t.outcome==='success')?'✓':i+1} ${label}</li>`).join('')}</ol></header><div id="plaza-experiment" class="experiment-root screen-8"><div class="mission-world stage-4 bench-wide"><div class="mission-board play-board" aria-label="${goals[round]}"><canvas width="1280" height="720" aria-hidden="true"></canvas><div class="plaza-guardian${done&&round===3?' is-restored':''}" aria-hidden="true"><img src="/assets/quest/villain-scrap-goblin.png" alt=""></div><button class="canvas-hit canvas-magnet-hit" data-drag="plaza-magnet" style="left:25%;top:55%;width:12%;height:10%" aria-label="연결 장치 조종 자석. 방향키로 이동 후 Enter로 놓기"></button><div class="mission-actions">${round===2&&!done?'<button class="mission-action" data-mission="plaza-flip">조종 자석 뒤집기</button>':''}${done?`<button class="mission-action" data-mission="plaza-next">${round===3?'잠금 해제! 탐험 수첩으로 →':'다음 장치 연결 →'}</button>`:s.settings.autoplay!==false?`<button class="mission-action" data-mission="plaza-demo">자동재생으로 살펴보기</button>${autoplaySpeedMarkup(s.settings)}`:''}</div><p class="mission-feedback" role="status" aria-live="polite"></p></div><details class="mission-access"><summary>눌러서 이동</summary>${placementControls}</details></div></div></section>`,
    bind(c){
      const root=c.root.querySelector<HTMLElement>('#plaza-experiment')!;
      const v=new Surface({...c,a,root,screen:8},8);
      const origin=round===3?pt(58,55):pt(66,55),socket=round===3?pt(58,40):pt(42,55);
      v.p('plaza-object',origin);v.p('plaza-magnet',pt(25,55));
      let solved=done,held=a.values.held===true;
      const pole=()=>a.values.pole==='S'?'S':'N';
      const magnet=()=>v.p('plaza-magnet',pt(25,55));
      const object=()=>v.p('plaza-object',origin);
      const complete=()=>{
        solved=true;
        v.proof(keys[round],labels[round],'success',{course:'plaza-link',pole:pole(),paper:false,glass:round===3});
        playEffect('reward',s.settings);delete root.dataset.demoRun;v.refresh();
      };
      const follow=(p:{x:number;y:number})=>{
        if(solved||v.animating)return;
        if(round===0){
          if(magneticReach(p,object()))held=true;
          if(held)v.set('plaza-object',pt(p.x+8,p.y));
          a.values.held=held;
        }
        if(round===3&&magneticReach(p,object()))v.set('plaza-object',pt(58,p.y));
      };
      const drop=(p:{x:number;y:number})=>{
        if(solved||v.animating)return;
        follow(p);
        if(round===0||round===3){
          if(distance(object(),socket)<4){complete();return;}
          if(round===0&&held||round===3&&magneticReach(p,object())){v.tell(goals[round]);v.draw();return;}
          v.miss(round===0?'자석에 따라오는 철 부품을 연결 홈까지 옮겨 줘.':'패드를 위쪽 홈까지 움직여 줘. 자석은 유리 왼쪽에 있어야 해.',[goals[round],round===0?'먼저 철 부품에 가까이 대고, 붙으면 왼쪽 홈까지 옮겨 봐.':'패드 가까이에서 위쪽으로 천천히 움직여 봐.']);
        }else if(!magneticReach(p,origin)||p.x>=origin.x-5){
          v.miss('너무 멀면 움직이지 않아. 자석을 왼쪽에서 더 가까이 대 봐.',[goals[round],'물체 왼쪽의 가까운 자리에서 자석을 놓아 봐.']);
        }else{
          const repel=round===2&&opposite(pole())==='N';
          const end=round===1?pt(p.x+6,55):pt(repel?78:p.x+6,55);
          v.settle({'plaza-object':end},()=>{
            if(round===1||repel)complete();
            else{v.miss('빗장이 당겨져서 잠금은 그대로야. 밀어낼 방법을 찾아봐.',[goals[round],'빗장 왼쪽 N극과 같은 N극이 마주 보도록 뒤집어 봐.']);delete root.dataset.demoRun;v.draw();}
          });
        }
        v.draw();
      };
      v.draw=()=>{
        v.base();const g=v.ctx,p=magnet(),q=object();
        g.save();g.fillStyle=solved?'#4a9f83':'#cba574';g.strokeStyle='#6a5333';g.lineWidth=4;
        g.beginPath();g.roundRect(74*W/100,33*H/100,17*W/100,31*H/100,16);g.fill();g.stroke();
        g.strokeStyle='#ead6a5';g.lineWidth=2;g.strokeRect(76*W/100,36*H/100,13*W/100,25*H/100);
        for(let i=0;i<4;i++){
          const linked=!!a.trials?.some(t=>t.key===keys[i]&&t.outcome==='success');
          g.fillStyle=linked?'#fff0a3':'#725f45';g.beginPath();g.arc(79*W/100,(40+i*5)*H/100,10,0,Math.PI*2);g.fill();
          g.strokeStyle=linked?'#fff0a3':'#725f45';g.beginPath();g.moveTo(81*W/100,(40+i*5)*H/100);g.lineTo(86*W/100,(40+i*5)*H/100);g.stroke();
        }
        g.restore();
        v.label(solved?'연결 완료':'중심 장치',pt(82,29),true);
        if(round===0){v.target(socket,'철 부품 연결 홈',115,80);v.iron(q,'철 부품',68);v.material(3,pt(66,74),62);}
        if(round===1){v.equipment('key',q,80,80);v.label('손이 닿지 않는 틈',pt(65,38),true);}
        if(round===2){v.magnet(q,'N',.8);v.arrow(pt(67,40),pt(78,40));v.label('빗장을 오른쪽으로',pt(62,32),true);}
        if(round===3){
          g.save();g.fillStyle='#a9dcea70';g.fillRect(52*W/100,31*H/100,19*W/100,44*H/100);g.strokeStyle='#5f9fb2';g.lineWidth=5;g.beginPath();g.moveTo(52*W/100,31*H/100);g.lineTo(52*W/100,75*H/100);g.stroke();g.restore();
          v.target(socket,'패드 연결 홈',110,70);v.equipment('pad',q,90,70);v.label('유리',pt(49,28),true);
        }
        v.magnet(p,pole(),.85);
        root.querySelector<HTMLButtonElement>('[data-drag="plaza-magnet"]')!.disabled=solved;
      };
      v.drag('plaza-magnet',pt(25,55),drop,follow,p=>pt(clamp(p.x,12,round===3?47:58),clamp(p.y,38,74)));
      v.button('plaza-flip',()=>{a.values.pole=opposite(pole());v.set('plaza-object',origin);v.draw();c.touch();});
      v.button('plaza-next',()=>{
        if(!solved)return;
        if(round===3){if(plazaPuzzlePassed(a))a.values.notebook=true;}
        else{a.values.round=round+1;a.points={};delete a.values.held;delete a.values.pole;}
        v.refresh();
      });
      v.button('plaza-demo',()=>{
        if(v.animating||solved||s.settings.autoplay===false)return;
        root.dataset.demoRun='true';
        if(round===2)a.values.pole='S';
        const targets=round===0?[pt(54,55),pt(34,55)]:round===3?[pt(46,55),pt(46,40)]:[pt(54,55)];
        const move=(i:number)=>{
          const positions:Record<string,{x:number;y:number}>={'plaza-magnet':targets[i]};
          if(i>0&&(round===0||round===3))positions['plaza-object']=round===0?pt(targets[i].x+8,targets[i].y):pt(58,targets[i].y);
          v.settle(positions,()=>{
            follow(targets[i]);
            if(i+1<targets.length)move(i+1);else drop(targets[i]);
          });
        };
        move(0);
      });
      v.cleanups.push(bindPlacement(root),bindAutoplaySpeed(root,s.settings,c.touch));
      v.draw();v.tell(solved?(round===3?'네 장치가 연결됐어! 탐험 수첩으로 가자.':'연결됐어! 다음 장치로 가자.'):goals[round]);
      return ()=>v.cleanup();
    },
  };
}
