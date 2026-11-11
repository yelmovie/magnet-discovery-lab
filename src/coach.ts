import { ready, type Activity, type Save } from './domain';
import { materialClassified, sortingSpecimens } from './material-sorting';
import { keyRescueText, shakePrompt } from './mission-content';
import { inquiryPhase } from './inquiry-model';
import { deliveryRoute, distance, cellLabel, clearanceCells, nearRulerMark, missionReady, paperGapMiddle, ringFloating } from './mission-model';
import { magnetInstalled, mailbox } from './mailbox';
import { nextMailboxPart, mailboxParts, partKey, partInstalled } from './mailbox-assembly';
import { currentPrompt } from './inquiry-prompts';

/** The generated repair companion uses the same existing hint control. */
export function coachArt() {
  return '<img class="coach-robot coach-body" src="/assets/quest/coach-companion.webp" alt="" width="112" height="108" draggable="false">';
}

export type Coaching = { action: string; clues: string[]; focus: string; done: number; total: number };
export function coaching(n: number, a: Activity, s: Save): Coaching {
  const paced = a.values.paceVersion === 1;
  if(a.values.inquiryVersion===2 && inquiryPhase(a)!=='experiment'){
    const complete=inquiryPhase(a)==='complete';
    return {action:complete?'발견 정리 완료! 아래 버튼으로 구역을 고치자':'직접 본 움직임과 맞는 답 하나를 골라 줘',clues:['문제 옆 개념 다시보기를 누르면 실험 원리를 볼 수 있어.'],focus:complete?'complete':'',done:complete?2:1,total:2};
  }
  if(a.values.inquiryVersion===1){
    const phase=inquiryPhase(a), index={predict:0,experiment:1,explain:2,apply:3,complete:n%2?3:4}[phase];
    if(phase!=='experiment')return {action:{predict:'고치기 전에 결과를 예상해 보자',explain:'내가 발견한 규칙과 실제 실험 근거를 연결해 줘',apply:'배운 규칙으로 새로운 현장 의뢰 두 가지를 해결해 줘',complete:'탐구 기록 완성! 아래 버튼으로 이어가자',experiment:''}[phase],clues:[],focus:'',done:index,total:n%2?3:4};
  }
  const prompt=a.values.inquiryVersion===2?currentPrompt(n,a,s):null;
  if(prompt?.pending)return {action:prompt.action,clues:['정답을 맞히는 칸이 아니야. 네 생각이나 네가 본 장면을 골라 줘.'],focus:'',done:0,total:1};
  const f = (key: string) => a.values[key] === true, r = Number(a.values.round || 0);
  if(n===1&&a.values.assemblyVersion===1){
    const next=nextMailboxPart(a);
    if(next)return {action:next.action,focus:partKey(next),done:mailboxParts.filter(part=>partInstalled(a,part)).length,total:7,clues:['지금 반짝이는 부품을 초록 점선으로 끌어 줘. 아래 끼우기 버튼으로도 조립할 수 있어.','자석은 뚜껑 안쪽에, 철판은 몸체 안쪽에 달아. 덮개를 닫으면 두 부품이 만나.']};
  }
  let action = '', focus = '', clues: string[] = [], done = 0, total = 1;
  switch (n) {
    case 1:
      total = a.values.mechanicsVersion===1?4:2; done = [0, 1].filter(i => f(`found${i}`)).length+(a.values.mechanicsVersion===1?[0,1].filter(i=>f(`latch${i}`)).length:0);
      action = f(`found${r}`) ? '손잡이를 내려 덮개의 자석과 몸체의 철판을 만나게 해 봐' : '나무 손잡이를 위로 올려 덮개 안쪽을 살펴봐';
      focus = 'lid';
      if(paced){total=2;done=Number(f('found0'))+Number(f('latch0'));}
      if(a.values.assemblyVersion===1){total=7;done=6+Number(f('latch0'));action='손잡이를 내려 덮개를 닫아 봐';}
      clues = ['직접 조립한 우편함을 닫아 봐. 다음 탐구에서는 자석을 넣고 뺐을 때를 비교할 거야.', '자석은 덮개와 함께 움직여. 몸체 안쪽의 은색 철판은 그 자리에 있어.']; break;
    case 2:
      total = 5; done = [0, 1].reduce((v, i) => v + Number(f(`with${i}`)) + Number(f(`without${i}`)), 0) + Number(f('with2'));
      action = r === 2 ? a.values.mechanicsVersion===1&&!f('faultObserved2') ? '자석을 넣고 닫아도 덮개가 열리는지 흔들어 보자' : a.values.mechanicsVersion===1&&!f('diagnosis2') ? '실험 결과를 보고 어디를 고칠지 골라 봐' : '철판 자리를 맞추고 덮개를 닫아 시험해 봐' : `자석 ${f(`without${r}`) ? '넣고' : '없이'} 덮개를 닫고, 흔들면 열리는지 살펴보자`;
      focus = r === 2 && (a.values.mechanicsVersion!==1||f('diagnosis2')) ? 'repair-plate' : 'repair-magnet';
      if(paced){
        total=2;done=Number(f('with0'))+Number(f('without0'));
        const installed=magnetInstalled(a.points['repair-magnet']||mailbox.looseMagnet);
        const closed=typeof a.values.repairClosed==='boolean'?f('repairClosed'):(a.points.lid?.y||38)>55;
        if(f('without0')&&!installed){action='이번엔 자석을 덮개 안쪽 홈에 끼워 봐';focus='repair-magnet';}
        else if(a.values.puzzleVersion===1&&f('faultObserved0')&&!f('with0')&&distance(a.points['repair-plate']||{x:75,y:47},mailbox.plate)>=7){action='어긋난 철판을 자석 맞은편 점선 자리로 옮겨 봐';focus='repair-plate';}
        else if(f('with0')&&installed){action=closed?'덮개 손잡이를 위로 열고 안쪽 자석을 꺼내 보자':'이번엔 자석을 바깥으로 빼고 같은 물건을 비교해 봐';focus=closed?'lid':'repair-magnet';}
        else if(!closed){action='덮개 손잡이를 아래로 내려 닫아 봐';focus='lid';}
        else{action=shakePrompt(f(installed?'without0':'with0'));focus='shake';}
      }
      clues = [a.values.puzzleVersion===1?'자석을 넣어도 열리면 철판 자리를 살펴봐. 자석은 그대로 두고 철판을 가까이 옮겨 봐.':'자석이 덮개를 붙잡는지 보려면 자석만 넣거나 빼고, 상자는 같은 세기로 흔들어 봐.', '자석과 철판이 가까이 마주 보는지 살펴봐.']; break;
    case 3:
      total=sortingSpecimens.length;done=sortingSpecimens.filter(m=>materialClassified(a,m.id)).length;
      action='자석을 물건에 가까이 대고, 반응에 따라 여섯 물건을 나눠 담아 줘';focus='sweep-magnet';
      {
        const pending=sortingSpecimens.filter(m=>f(`tested-${m.id}`)&&!f(`sorted-${m.id}`));
        const awaiting=pending.find(m=>!m.magnetic)||pending[0];
        if(awaiting){
          action=awaiting.magnetic?`${awaiting.name}: 붙었어! 오른쪽 위 수리함에 담아 줘`:`${awaiting.name}: 붙지 않았어. 물건을 손으로 오른쪽 아래 분류함에 넣어 줘`;
          focus=awaiting.magnetic?'sweep-magnet':`material-${awaiting.index}`;
        }else{
          const next=sortingSpecimens.find(m=>!f(`tested-${m.id}`));
          if(next)action=`자석을 가까이 대고 ${next.name}의 반응을 살펴봐`;
        }
      }
      clues = ['붙지 않는 재료도 가까이 대서 검사해야 해.', '겉모습이 반짝인다고 모두 자석에 붙을까? 직접 비교해 봐.']; break;
    case 4:
      total = 4; done = [0, 1, 2, 3].filter(i => f(`done${i}`)).length;
      if(paced){total=3;done=[0,1,2].filter(i=>f(`done${i}`)).length;}
      action = ['먼저 5칸에서 손을 놓고 관찰해 봐', '붙을 것 같은 자리를 골라 자석을 놓아 봐', '자석은 그대로! 종이만 두 물체 사이에 넣어 봐', '자석을 가까이 옮겨 철 열쇠를 구조해'][r];
      focus = r === 2 ? 'paper' : 'distance-magnet';
      if(paced){
        const q=a.points['distance-magnet']||{x:25,y:55},target={x:61,y:55};
        if(r===0&&nearRulerMark(q,target,5)||r===1&&clearanceCells(q,target)<4.9){action=`${cellLabel(clearanceCells(q,target))}을 골랐어. 손을 놓고 관찰해 봐`;focus='release';}
        if(r===1&&f('distanceObserved')){action='움직이지 않았어. 더 가까운 곳 중 붙을 것 같은 자리를 골라 봐';focus='distance-magnet';}
        if(r===2){
          const previous=a.trials?.find(t=>t.key==='near'&&t.outcome==='success')?.initialObjects.find(o=>o.id==='magnet')||{x:49,y:55};
          const slot=paperGapMiddle(previous,target);
          if(distance(q,previous)>2){action='자석을 앞 실험과 같은 점선 자리로 돌려놓아 줘';focus='distance-magnet';}
          else if(a.points.paper && distance(a.points.paper,slot)<5){action='종이만 넣었어! 손을 떼고 관찰 버튼을 눌러 비교해';focus='release';}
        }
      }
      clues = ['한 번에 한 가지 조건만 바꾸면 원인을 찾을 수 있어.', r === 2 ? '앞 실험의 자석 위치를 유지해야 종이의 영향만 알 수 있어.' : '닿기 전에도 물체가 움직이는지 눈여겨봐.']; break;
    case 5: {
      total = 6; done = [0, 1].reduce((v, i) => v + Number(f(`test${i}N`)) + Number(f(`test${i}S`)) + Number(f(`solved${i}`)), 0);
      if(paced){total=3;done=Number(f('test0N'))+Number(f('test0S'))+Number(f('solved0'));}
      const facing=a.values.probePole==='S'?'N':'S';
      const both=f(`test${r}N`)&&f(`test${r}S`),labelled=f(`label${r}N`)&&f(`label${r}S`);
      const door=a.values.puzzleVersion===1&&r===0&&both&&f('solved0');
      if(door&&paced){total=a.values.puzzleRevision===2?5:4;done+=Number(f('doorOpen'))+Number(f('doorPullOpen'));}
      if(f('poleReturning')){action='다시 비교하려고 두 자석을 처음 자리에 놓을게.';focus='';}
      else if(door&&!(a.values.doorIndex===1?f('doorPullOpen'):f('doorOpen'))){
        const tried=typeof a.values.reaction==='string'&&a.values.reaction!=='';
        action=a.values.doorIndex===1?'이번 문은 당겨야 열려. 빗장과 다른 극을 마주 보게 해 줘':tried?'빗장이 당겨졌어. 기준 자석 뒤집기를 눌러 같은 극을 대 봐':'빗장을 밀어낼 극이 빗장을 향하게 해서 점선 자리에 대 봐';focus=tried?'flip':'probe';
      }
      else if((f(`test${r}N`)||f(`test${r}S`))&&!labelled){action=both?'두 반응을 근거로 종이 양끝의 물음표에 극 스티커를 붙여 봐':'지금 본 움직임으로 양끝에 극 스티커를 붙여 봐';focus=f(`label${r}N`)?'stickerS':'stickerN';}
      else if(f(`test${r}${facing}`)){action='기준 자석 뒤집기를 눌러 반대 극도 시험해 봐';focus='flip';}
      else{action=`기준 자석의 ${facing}극을 오른쪽 점선에 대 봐`;focus='probe';}
      clues = ['한 번 관찰한 뒤부터 스티커를 붙이거나 바꿀 수 있어. 붙였으면 반대 극으로도 확인해.', '같은 극끼리는 밀어내고, 다른 극끼리는 끌어당겨.']; break;
    }
    case 6:
      total = 3; done = [0, 1, 2].filter(i => f(`done${i}`)).length;
      if(paced){total=2;done=[0,2].filter(i=>f(`done${i}`)).length;}
      action = r < 2 ? '고리를 뒤집어 기둥에 놓고, 손을 떼어 띄워 봐' : paced?'이번에는 위 고리를 뒤집어 두 고리를 붙여 봐':'이번에는 세 고리가 서로 붙도록 배치해'; focus = paced&&r===2?'ring1':'ring0';
      if(paced){
        const unplaced=[0,1].find(i=>{const p=a.points[`ring${i}`]||{x:23+i*16,y:73};return Math.abs(p.x-68)>=7||Math.abs(p.y-(71-i*15))>=7;});
        if(!f('ringReleased')&&unplaced!==undefined){action=`${unplaced+1}번 고리를 기둥의 ${unplaced===0?'아래':'위'} 점선에 놓아 줘`;focus=`ring${unplaced}`;}
        else if(f('ringReleased')){action='2번 뒤집기로 마주 보는 극을 바꾸고 다시 관찰해 봐';focus='2번 고리 뒤집기';}
        else if(r===2&&ringFloating(a.values.ringPole0==='S'?'S':'N',a.values.ringPole1==='S'?'S':'N')){action='이번엔 붙여 보자. 2번 뒤집기로 마주 보는 극을 바꿔 줘';focus='2번 고리 뒤집기';}
        else{action='고리를 놓았어! 손을 떼고 고리 관찰 버튼을 눌러 봐';focus='check';}
      }
      clues = ['아래 고리의 윗면과 위 고리의 아랫면이 마주 봐.', '두 면의 글자가 같으면 밀어내고, 다르면 끌어당겨 붙어.']; break;
    case 7:
      total = 3; done = [0, 1, 2].filter(i => f(`clean${i}`)).length;
      action = paced?'빨간 손잡이로 얼룩을 쓸어 봐. 물속 패드가 따라와!':'빨간 손잡이를 얼룩 위에서 천천히 좌우로 움직여 봐'; focus = 'cleaner';
      if(f('padDetached')||distance(a.points.cleaner||{x:27,y:47},a.points['inner-pad']||{x:29,y:48})>=18)action='빨간 손잡이를 물속 패드 가까이 가져가 다시 붙여 줘';
      clues = ['두 자석은 유리벽 양쪽에서 서로 당겨. 손으로 잡는 것은 밖의 빨간 손잡이야.', '물속 패드가 유리 안쪽을 문지르면 초록 이끼와 뿌연 물때가 지워져.']; break;
    case 8:
      total = 1; done = Number(missionReady(n,a,s));
      {const {wall:course,goal,start}=deliveryRoute(a),atGoal=Math.abs(Number(a.values.car??start)-goal)<3;action=atGoal?'목적지야! 자석을 떼어 카트가 멈추는지 봐':course?'손은 유리벽을 못 넘어. 자석의 힘으로 카트를 깃발까지 보내 줘':'밀어도 당겨도 좋아. 카트를 깃발까지 배달해 줘';focus=atGoal?'detach':'controller';}
      clues = [
        '서로 다른 극은 당기고, 같은 극은 밀어내. 자석을 놓는 쪽과 극을 바꿔 원하는 방향으로 보내 봐.',
        '깃발 아래에서 자석을 멀리해 봐. 움직이던 카트는 조금 더 구르다가 이 레일의 마찰 때문에 멈춰.',
      ]; break;
    case 9:
      total = 3; done = ['base', 'magnet', 'target'].filter(f).length;
      action = !f('chosen') ? '고치고 싶은 시민의 물건을 골라 줘' : !f('base') ? '장치 몸체를 큰 점선에 끌어 놓아 줘' : '자석과 마주 볼 부품을 점선에 배치해';
      focus = !f('base') ? 'base' : 'design-magnet'; clues = ['몸체·자석·마주 볼 부품, 세 가지가 필요해.', '철판을 쓸지 자석을 쓸지 선택해. 다음 활동에서 직접 시험하고 고칠 수 있어.'];
      if(a.values.mechanicsVersion===1){total=4;if(done===3){done+=Number(missionReady(n,a,s));action='부품을 모두 놓았어! 시제품 반응 시험을 눌러 줘';focus='';}}
      if(paced)focus=!f('chosen')?'':!f('base')?'base':!f('magnet')?'design-magnet':!f('target')?'design-target':'prototype';
      break;
    case 10:
      total = 3; done = ['use0', 'use1', 'force-arrow'].filter(f).length;
      action = f('use1') ? '화살표를 힘이 작용한 두 부품 사이에 놓아 줘' : s.design.template==='box'?'나무 손잡이를 아래로 끝까지 내려 덮개를 닫아 줘':`빨간 손잡이를 움직여 물속 패드를 ${r===0?'위':'아래'}층 점선 칸에 맞춰 줘`;
      focus = f('use1') ? 'force-arrow' : 'use-handle'; clues = ['작동하지 않으면 거리·높이·마주 보는 극을 하나씩 바꿔 봐.', '배치를 고쳤다면 두 사용 상황을 모두 다시 시험해야 해.'];
      if(paced){
        total=1;done=Number(missionReady(n,a,s));focus='use-handle';
        const operated=s.design.template==='box'?(a.points['use-handle']?.y||37)>=60:!!a.points['operating-magnet']&&!!a.points['operating-target']&&Math.abs(a.points['operating-target'].y-42)<4;
        if(operated){action='장치를 움직였어! 사용 시험을 눌러 결과를 확인해';focus='test';}
        clues=['작동하지 않으면 거리·높이·마주 보는 극을 하나씩 바꿔 봐.','배치를 고쳤다면 지금 설계로 다시 사용해 봐.'];
      } break;
  }
  if(n===10&&a.values.adjusting===true){action='두 부품의 거리와 높이를 맞추고, 조작 손잡이로 돌아가자';focus='design-magnet';}
  if (a.values.inquiryVersion===2 && missionReady(n,a,s)) { action=n%2?'발견 완료! 아래 버튼으로 다음 탐구를 시작하자':'실험 완료! 아래 버튼으로 오늘의 발견을 골라 보자';clues=['직접 움직인 결과가 내 실험 다시 보기에 남아 있어.'];focus='';done=total; }
  else if (a.values.inquiryVersion===1 && missionReady(n,a,s)) { action='실험 완료! 아래에서 내 실험 증거로 설명해 보자'; clues=['실험 결과가 처음 예상과 같았는지 떠올려 봐.']; focus=''; done=total; }
  else if (ready(n, a, s)) { action = n % 2 ? '발견 완료! 오른쪽 아래에서 다음 의뢰로 가자' : '발견 완료! 내 실험을 이야기하고 개념 영상을 보자'; focus = ''; done = total; }
  else if (a.values[`done${r}`] || a.values[`solved${r}`] && (n!==5||f(`test${r}N`)&&f(`test${r}S`)) || a.values[`segment${r}`] || n === 1 && f(`found${r}`) && (a.values.mechanicsVersion!==1||f(`latch${r}`)) || n === 2 && f(`with${r}`) && f(`without${r}`) || n === 10 && !paced && r === 0 && f('use0')) { action = '관찰했어! 실험대 아래의 다음 의뢰 버튼을 눌러 줘'; focus = ''; }
  if(a.values.puzzleRevision===2){
    if(n===4){
      action=keyRescueText(action);
      if(focus==='release')action='열쇠 움직임 관찰 버튼을 눌러 결과를 살펴봐';
    }
    if(n===5&&f('doorOpen')&&!a.values.doorIndex&&!f('doorPullOpen')){action='첫 문이 열렸어! 당겨 여는 다음 문으로 가자';focus='door-next';}
    else if(n===5&&a.values.doorIndex===1&&!f('doorPullOpen')){action='이번 문은 빗장을 당겨야 열려. 다른 극을 마주 보게 해 줘';focus='probe';}
    if(n===8){total=3;done=[0,1,2].filter(i=>f(`segment${i}`)).length;if(f(`segment${r}`)&&r<2){action='정차 완료! 다음 택배 구간으로 가자';focus='delivery-next';}}
  }
  if(!focus&&done===total)focus='complete';
  else if(!focus&&action.includes('다음 의뢰 버튼'))focus='next';
  return { action, clues, focus, done, total };
}

export function coachMarkup(n=1) {
  return `<aside class="lab-coach" aria-label="보조 캐릭터 자꾸의 도움"><button class="coach-toggle" type="button" aria-expanded="false" aria-controls="coach-bubble">${coachArt()}<span>자꾸 · 힌트</span></button><div class="coach-bubble" id="coach-bubble" hidden><div class="coach-heading"><strong>수리 도우미 자꾸</strong><button type="button" class="coach-close" aria-label="힌트 닫기">×</button></div><p class="coach-clue" aria-live="polite"></p><button class="coach-more" type="button">다른 단서 보기</button><button class="coach-more" type="button" data-concept="${Math.floor((n-1)/2)}">▶ 개념 다시보기</button><button class="coach-more coach-visual-guide" type="button" data-action="science-guide">장치·핵심 개념 보기</button></div></aside>`;
}

export function bindCoach(root: HTMLElement, n: number, a: Activity, s: Save) {
  const signal = new AbortController(), helper = root.querySelector<HTMLElement>('.lab-coach')!;
  const toggle = helper.querySelector<HTMLButtonElement>('.coach-toggle')!, bubble = helper.querySelector<HTMLElement>('.coach-bubble')!;
  const action=root.querySelector<HTMLElement>('.mission-next-action');
  const feedback=root.querySelector<HTMLElement>('.mission-feedback');
  let level=0,stateKey='',lastResult='',showResult=false,resultTimer=0;
  const nextTarget=(id:string)=>id?root.querySelector<HTMLElement>(`[data-drag="${id}"], [data-mission="${id}"], [data-action="${id}"], [aria-label="${id}"]`):null;
  const update = () => {
    const state = coaching(n, a, s), key = `${a.values.round}:${state.action}`;
    if (key !== stateKey) { level = 0; stateKey = key; }
    const shared=!!feedback&&n!==8&&!root.querySelector('.bench-wide')&&!!root.querySelector('[data-phase="experiment"]');
    root.toggleAttribute('data-shared-notice',shared);
    const result=feedback?.textContent?.trim()||'';
    if(result!==lastResult){
      lastResult=result;showResult=!!result;clearTimeout(resultTimer);
      if(result)resultTimer=window.setTimeout(()=>{showResult=false;update();},4300);
    }
    if(action){
      const message=shared&&showResult?result:state.action;
      if(action.textContent!==message)action.textContent=message;
      action.toggleAttribute('data-result',shared&&showResult);
    }
    const progress=root.querySelector<HTMLElement>('.discovery-count');
    if(progress)progress.textContent=`${a.trials?.length||0}개`;
    helper.querySelector('.coach-clue')!.textContent = level === 0 || !state.clues.length ? state.action : state.clues[(level-1)%state.clues.length];
    const cause=helper.querySelector<HTMLElement>('.coach-heading strong');
    if(cause)cause.textContent=helper.dataset.reason==='true'?'아직 남은 실험이 있어':'수리 도우미 자꾸';
    root.querySelectorAll('.coach-focus').forEach(el => el.classList.remove('coach-focus'));
    if(!bubble.hidden)nextTarget(state.focus)?.classList.add('coach-focus');
    root.querySelectorAll('.next-action-target').forEach(el => el.classList.remove('next-action-target'));
    const target = nextTarget(state.focus);
    if (target && !target.matches(':disabled, [hidden]') && !target.closest('[inert], [hidden]')) {
      target.classList.add('next-action-target');
    }
  };
  const setOpen = (open: boolean) => { bubble.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); update(); };
  root.querySelector('[data-action="missing-step"]')?.addEventListener('click',()=>{helper.dataset.reason='true';level=0;setOpen(true);helper.querySelector<HTMLButtonElement>('.coach-close')?.focus({preventScroll:true});},{signal:signal.signal});
  toggle.addEventListener('click', () => {delete helper.dataset.reason;setOpen(bubble.hidden);} , { signal: signal.signal });
  helper.querySelector('.coach-close')!.addEventListener('click', () => { setOpen(false); toggle.focus(); }, { signal: signal.signal });
  helper.querySelector('.coach-more')!.addEventListener('click', () => { level=(level+1)%(coaching(n,a,s).clues.length+1);update(); }, { signal: signal.signal });
  helper.addEventListener('keydown', e => { if (e.key === 'Escape') { setOpen(false); toggle.focus(); } }, { signal: signal.signal });
  root.addEventListener('coach-update', update, { signal: signal.signal }); update();
  root.addEventListener('click', update, { signal: signal.signal });
  const blocked=root.querySelector<HTMLButtonElement>('[data-action="missing-step"]');
  let timer=0;
  const remind=()=>{
    clearTimeout(timer);
    if(!blocked)return;
    root.querySelector('.hint-next-target')?.classList.remove('hint-next-target');
    timer=window.setTimeout(()=>{
      if(blocked.hidden||!bubble.hidden||document.hidden||root.closest('[inert]')||root.querySelector('#experiment-root[inert], details[open]')||document.querySelector('dialog[open],.modal-backdrop'))return;
      nextTarget(coaching(n,a,s).focus)?.classList.add('hint-next-target');
    },11000);
  };
  if(blocked){
    remind();for(const event of ['pointerdown','pointerup','keydown','coach-update'])root.addEventListener(event,remind,{signal:signal.signal});
  }
  return () => {clearTimeout(timer);clearTimeout(resultTimer);signal.abort();};
}
