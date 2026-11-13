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
  const goals=['철 부품에 자석을 가까이 댄 뒤, 왼쪽 연결 홈으로 옮겨 줘.','틈 입구에서 철 열쇠를 끌어당긴 뒤 왼쪽으로 꺼내 줘.','같은 극을 마주 보게 해서 빗장을 오른쪽 끝까지 밀어 줘.','유리 밖 자석으로 안쪽 패드를 위쪽 홈까지 옮겨 줘.'];
  const firstMissing=keys.findIndex(key=>!a.trials?.some(t=>t.key===key&&t.outcome==='success'));
  const round=Math.max(0,Math.min(3,Number(a.values.round||0),firstMissing<0?3:firstMissing));
  const done=!!a.trials?.some(t=>t.key===keys[round]&&t.outcome==='success');
  const art=['iron','distance','poles','glass'][round];
  const successes=['철 부품이 홈에 끼워졌어!','틈에 빠진 철 열쇠를 꺼냈어!','같은 극이 빗장을 밀어 길이 열렸어!','유리 너머 패드가 연결 홈에 도착했어!'];
  return {
    html:`<section class="plaza-puzzle" data-plaza-step="${art}"><header><small>중앙 광장 · 중심 장치</small><h1>도시 중심 장치의 잠금을 풀어 줘!</h1><p>${goals[round]}</p><ol aria-label="연결 퍼즐 진행">${labels.map((label,i)=>`<li ${i===round?'aria-current="step"':''}> <b>${a.trials?.some(t=>t.key===keys[i]&&t.outcome==='success')?'✓':i+1}</b> ${label}</li>`).join('')}</ol></header><div id="plaza-experiment" class="experiment-root"><div class="mission-world"><div class="mission-board play-board" aria-label="${goals[round]}"><canvas width="1280" height="720" aria-hidden="true"></canvas><button class="canvas-hit canvas-magnet-hit" data-drag="plaza-magnet" style="left:25%;top:55%;width:15%;height:12%" aria-label="연결 장치 조종 자석. 방향키로 이동 후 Enter로 놓기"></button><p class="mission-feedback" role="status" aria-live="polite"></p></div></div></div><footer class="plaza-actions"><p>${done?successes[round]:'막대자석을 끌어 장치를 움직여 봐.'}</p>${round===2&&!done?'<button class="mission-action" data-mission="plaza-flip">조종 자석 뒤집기</button>':''}${done?`<button class="mission-action" data-mission="plaza-next">${round===3?'탐험 수첩으로 →':'다음 장치 연결 →'}</button>`:''}</footer></section>`,
    bind(c){
      const root=c.root.querySelector<HTMLElement>('.plaza-puzzle')!;
      const v=new Surface({...c,a,root,screen:8},8);
      const origin=round===3?pt(58,55):pt(66,55),socket=round===3?pt(58,40):round===1?pt(40,55):pt(42,55);
      v.p('plaza-object',origin);v.p('initial:plaza-object',origin);v.p('plaza-magnet',pt(25,55));
      let solved=done,held=a.values.held===true;
      const pole=()=>a.values.pole==='S'?'S':'N';
      const magnet=()=>v.p('plaza-magnet',pt(25,55));
      const object=()=>v.p('plaza-object',origin);
      const complete=()=>{
        solved=true;
        v.proof(keys[round],labels[round],'success',{course:'plaza-link',pole:pole(),paper:false,glass:round===3});
        playEffect('reward',s.settings);v.refresh();
        c.root.querySelector<HTMLButtonElement>('[data-mission="plaza-next"]')?.focus({preventScroll:true});
      };
      const follow=(p:{x:number;y:number})=>{
        if(solved||v.animating)return;
        if(round===0||round===1){
          if(round===0&&p.x<object().x&&magneticReach(p,object()))held=true;
          if(held)v.set('plaza-object',pt(p.x+8,round===1?55:p.y));
          a.values.held=held;
        }
        if(round===3&&magneticReach(p,object()))v.set('plaza-object',pt(58,p.y));
      };
      const drop=(p:{x:number;y:number})=>{
        if(solved||v.animating)return;
        follow(p);
        if(round===0||round===3||round===1&&held){
          if(distance(object(),socket)<4){v.set('plaza-object',socket);complete();return;}
          if(held||round===3&&magneticReach(p,object())){v.tell(goals[round]);v.draw();return;}
          v.miss(round===0?'자석에 따라오는 철 부품을 연결 홈까지 옮겨 줘.':'패드를 위쪽 홈까지 움직여 줘. 자석은 유리 왼쪽에 있어야 해.',[goals[round],round===0?'먼저 철 부품에 가까이 대고, 붙으면 왼쪽 홈까지 옮겨 봐.':'패드 가까이에서 위쪽으로 천천히 움직여 봐.']);
        }else if(!magneticReach(p,object())||p.x>object().x-8){
          v.miss('너무 멀면 움직이지 않아. 자석을 왼쪽에서 더 가까이 대 봐.',[goals[round],'물체 왼쪽의 가까운 자리에서 자석을 놓아 봐.']);
        }else{
          const repel=round===2&&opposite(pole())==='N';
          const end=pt(round===1?p.x+8:repel?80:Math.max(63,p.x+9),55);
          v.settle({'plaza-object':end},()=>{
            if(round===1){held=true;a.values.held=true;c.touch();v.tell('열쇠가 끌려왔어! 자석을 왼쪽으로 옮겨 틈에서 꺼내 줘.');v.draw();}
            else if(repel)complete();
            else{v.miss('빗장이 당겨져서 잠금은 그대로야. 밀어낼 방법을 찾아봐.',[goals[round],'빗장 왼쪽 N극과 같은 N극이 마주 보도록 뒤집어 봐.']);v.draw();}
          });
        }
        v.draw();
      };
      v.draw=()=>{
        const g=v.ctx,p=magnet(),q=object();g.clearRect(0,0,W,H);
        const image=v.asset('plaza-device-'+art,`/assets/quest/plaza-device-${art}.webp`);
        const paint=(x:number,y:number,w:number,h:number)=>{if(image.complete&&image.naturalWidth)g.drawImage(image,x,y,w,h);};
        const line=(from:number,to:number,y:number)=>{g.save();g.strokeStyle='#f2cd75';g.lineWidth=5;g.setLineDash([12,9]);g.beginPath();g.moveTo(from*W/100,y*H/100);g.lineTo(to*W/100,y*H/100);g.stroke();g.restore();};
        if(round===0){
          paint(266,288,840,226);
          if(!solved)v.target(socket,'',150,86);
          v.label('연결 홈',pt(42,35));
          v.iron(q,'',102);
          if(!solved)v.label('철 부품',pt(q.x,q.y+13),true);
        }
        if(round===1){
          paint(410,234,690,236);
          if(!solved)v.target(socket,'',114,85);
          v.equipment('key',q,142,105);
          v.label('깊은 틈',pt(69,34));
          v.label('꺼내는 곳',pt(40,69),true);
          if(held&&!solved)v.arrow(pt(55,72),pt(44,72),'#188275');
        }
        if(round===2){
          paint(364,297,780,186);
          if(!solved)line(69,81,55);
          v.magnet(q,'N',1.03);
          v.label('빗장',pt(q.x,39));
          if(!solved){v.arrow(pt(70,29),pt(81,29),'#a15e24');v.label('빗장이 움직이는 쪽',pt(74,22),true);}
          if(!solved&&p.x<q.x&&magneticReach(p,q))v.label(pole()==='S'?'N극 ↔ N극 · 밀어내':'S극 ↔ N극 · 당겨',pt((p.x+q.x)/2,72));
        }
        if(round===3){
          g.save();g.fillStyle='#a4ddea75';g.fillRect(639,170,269,379);g.restore();
          paint(615,146,318,422);
          g.save();g.strokeStyle='#378ca6';g.lineWidth=5;g.beginPath();g.moveTo(53*W/100,175);g.lineTo(53*W/100,540);g.stroke();g.restore();
          if(!solved)v.target(socket,'',110,72);
          v.equipment('pad',q,108,80);
          if(!solved&&magneticReach(p,q)&&Math.abs(p.y-q.y)<4)line(p.x+6,q.x-4,q.y);
          if(!solved)v.arrow(pt(66,54),pt(66,42),'#188275');
          v.label('유리 밖',pt(34,27));
          v.label('유리 안쪽',pt(61,15));
          v.label('청소 패드',pt(59,83),true);
        }
        v.magnet(p,pole(),1.05);
        if(!solved&&p.x<39&&round!==1)v.label('조종 자석',pt(p.x,p.y+10),true);
        root.querySelector<HTMLButtonElement>('[data-drag="plaza-magnet"]')!.disabled=solved;
      };
      v.drag('plaza-magnet',pt(25,55),drop,follow,p=>pt(clamp(p.x,12,round===3?47:round===1?54:58),clamp(p.y,38,74)));
      v.button('plaza-flip',()=>{
        if(solved||v.animating)return;
        a.values.pole=opposite(pole());
        const p=magnet(),q=object();
        if(magneticReach(p,q)&&p.x<=q.x-8)drop(p);
        else v.draw();
        c.touch();
      });
      v.button('plaza-next',()=>{
        if(!solved)return;
        if(round===3){if(plazaPuzzlePassed(a))a.values.notebook=true;}
        else{a.values.round=round+1;a.points={};delete a.values.held;delete a.values.pole;}
        v.refresh();
        c.root.querySelector<HTMLButtonElement>('[data-drag="plaza-magnet"], [data-review-answer]')?.focus({preventScroll:true});
      });
      v.cleanups.push(bindPlacement(root));
      v.draw();
      return ()=>v.cleanup();
    },
  };
}
