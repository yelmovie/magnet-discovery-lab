import { autoplaySpeed, autoplaySpeedMarkup, bindAutoplaySpeed } from './autoplay-controls';
import { emptyActivity, type Activity, type Point, type Save } from './domain';
import { inquiryPhase } from './inquiry-model';
import { mailbox } from './mailbox';
import { mailboxParts, partKey, partInstalled } from './mailbox-assembly';
import { glassStains } from './aquarium-glass';
import { deliveryCourse, deliveryRoute, missionReady, paperGapMiddle } from './mission-model';
import { materialBins, sortingSpecimens } from './material-sorting';
import { promptPending } from './inquiry-prompts';
import './experiment-autoplay.css';

export const canDemonstrate = (stage: number, a: Activity) =>
  stage >= 1 && stage <= 10 && a.values.inquiryVersion === 2 && inquiryPhase(a) === 'experiment';

type Step =
  | { kind: 'move'; id: string; target: Point; label: string }
  | { kind: 'press'; selector: string; label: string }
  | { kind: 'drive'; label: string }
  | { kind: 'wipe'; stain: number; label: string };
const move = (id: string, x: number, y: number, label: string): Step => ({kind:'move',id,target:{x,y},label});
const press = (id: string, label: string): Step => ({kind:'press',selector:`[data-mission="${id}"]`,label});

export function demonstrationSteps(stage: number, save: Save): Step[] {
  const a=save.activities[stage], steps=experimentSteps(stage,save);
  // A puzzle course opens with its emergency card; the demonstration acknowledges it first.
  return steps.length&&a?.values.puzzleVersion===1&&a.values.crisisSeen!==true&&stage>=2&&stage<=8?[press('crisis-go','긴급 의뢰 확인하기'),...steps]:steps;
}
function experimentSteps(stage: number, save: Save): Step[] {
  const a=save.activities[stage]||emptyActivity(), f=(key:string)=>a.values[key]===true;
  const round=Number(a.values.round||0);
  if(missionReady(stage,a,save))return [];
  const lid = (open: boolean) => {
    const p = open ? mailbox.handleOpen : mailbox.handleClosed;
    return move('lid',p.x,p.y,open?'손잡이를 올려 안쪽 보기':'손잡이를 내려 덮개 닫기');
  };
  switch (stage) {
    case 1: return f('latch0')?[]:[...mailboxParts.filter(part=>!partInstalled(a,part)).map(part=>move(partKey(part),part.target.x,part.target.y,part.action)),lid(false)];
    case 2: return [
      ...(!f('without0')?[lid(true),move('repair-magnet',mailbox.looseMagnet.x,mailbox.looseMagnet.y,'자석만 빼고 비교하기'),lid(false),press('shake','자석 없이 흔들면 덮개가 열릴까?')]:[]),
      ...(!f('with0')?[lid(true),move('repair-magnet',mailbox.socket.x,mailbox.socket.y,'덮개의 홈에 자석 끼우기'),...(a.values.puzzleVersion===1&&Math.hypot((a.points['repair-plate']?.x??75)-mailbox.plate.x,(a.points['repair-plate']?.y??47)-mailbox.plate.y)>=4?[move('repair-plate',mailbox.plate.x,mailbox.plate.y,'어긋난 철판을 자석 맞은편에 맞추기')]:[]),lid(false),press('shake','자석을 넣고 똑같이 흔들면 덮개가 열릴까?')]:[])];
    case 3: {
      const steps:Step[]=[];
      const order=[...sortingSpecimens.filter(m=>m.magnetic),...sortingSpecimens.filter(m=>!m.magnetic)];
      for(const m of order){
        if(f(`sorted-${m.id}`))continue;
        const id=`material-${m.index}`,p=a.points[id]||m,bin=materialBins[m.magnetic?0:1];
        steps.push(move('sweep-magnet',p.x,p.y,`${m.name}: 같은 자석을 가까이 대고 반응 보기`));
        steps.push(m.magnetic?move('sweep-magnet',bin.x,bin.y-6,`${m.name}: 자석으로 수리함에 옮기기`):move(id,bin.x,bin.y,`${m.name}: 손으로 아래 분류함에 옮기기`));
      }
      return steps;
    }
    case 4: {
      const steps:Step[]=[];
      for(let r=round;r<=2;r++){
        if(!f(`done${r}`)){
          if(r<2)steps.push(move('distance-magnet',r===0?25:49,55,r===0?'자석 끝을 눈금 5에 놓기':'자석 끝을 눈금 1에 놓기'));
          else{
            const previous=a.trials?.find(t=>t.key==='near'&&t.outcome==='success')?.initialObjects.find(o=>o.id==='magnet')||{x:49,y:55};
            const slot=paperGapMiddle(previous,{x:61,y:55});
            steps.push(move('paper',slot.x,slot.y,'같은 거리를 유지하고 종이 한 장만 넣기'));
          }
          steps.push(press('release',r===2?'종이 너머 클립이 끌려오는 모습 보기':'손을 떼고 클립 관찰하기'));
        }
        if(r<2)steps.push(press('next',r===0?'가까운 거리와 비교하기':'같은 거리에 종이만 넣기'));
      }
      return steps;
    }
    case 5: {
      const steps:Step[]=[];let facing=a.values.probePole==='S'?'N':'S';
      for(const pole of ['S','N']){
        if(f(`test${round}${pole}`))continue;
        if(facing!==pole){steps.push(press('flip','기준 자석을 뒤집고 처음 자리에서 다시 비교하기'));facing=pole;}
        steps.push(move('probe',48,53,`${pole}극을 가까이 대고 움직임 보기`));
      }
      // With labels restored, the two doors require repulsion and attraction respectively.
      if(!steps.length&&a.values.puzzleVersion===1&&round===0&&f('solved0')&&f('doorReady')&&!(a.values.doorIndex===1?f('doorPullOpen'):f('doorOpen'))){
        const needed=a.values.doorIndex===1?'N':'S';
        if(facing!==needed||a.values.reaction)steps.push(press('flip','기준 자석을 뒤집고 처음 자리에서 다시 시작하기'));
        if(facing===needed&&a.values.reaction)steps.push(press('flip',`${needed}극이 빗장을 향하도록 뒤집기`));
        steps.push(move('probe',48,53,a.values.doorIndex===1?'빗장과 다른 N극을 대서 당기기':'빗장과 같은 S극을 대서 밀어내기'));
      }
      if(a.values.puzzleRevision===2&&f('doorOpen')&&!a.values.doorIndex)return [press('door-next','다른 극으로 당겨 여는 문으로 이동')];
      return steps;
    }
    case 6: {
      const steps:Step[]=[];let different=(a.values.ringPole0||'N')!==(a.values.ringPole1||'N');
      const flip:Step={kind:'press',selector:'[aria-label="2번 고리 뒤집기"]',label:'위 고리를 뒤집어 마주 보는 극 바꾸기'};
      for(const r of round<2?[0,2]:[2]){
        if(!f(`done${r}`)){
          steps.push(move('ring0',68,71,'아래 고리를 기둥에 끼우기'),move('ring1',68,56,'위 고리를 기둥에 끼우기'));
          if(different!==(r===0)){steps.push(flip);different=!different;}
          steps.push(press('check',r===0?'같은 극끼리 밀어내어 뜨는 모습 보기':'다른 극끼리 착 붙는 모습 보기'));
        }
        if(r===0)steps.push(press('next','이번에는 두 고리를 붙여 보기'));
      }
      return steps;
    }
    case 7: {
      const steps:Step[]=[];
      if(f('padDetached')){const pad=a.points['inner-pad']||{x:29,y:48};steps.push(move('cleaner',pad.x,pad.y,'물속 패드 앞으로 손잡이를 가져가 다시 붙이기'));}
      glassStains.forEach((_,stain)=>{if(!f(`clean${stain}`))steps.push({kind:'wipe',stain,label:`${stain+1}번째 얼룩을 안쪽 패드로 닦기`});});
      return steps;
    }
    case 8: {
      if(a.values.puzzleRevision===2&&f(`segment${round}`)&&round<2)return [press('delivery-next','다음 택배 구간으로 이동')];
      if(a.values.puzzleVersion!==1)return [{kind:'drive',label:'자석으로 카트를 배달하고 목적지에서 멈추기'}];
      const drive:Step={kind:'drive',label:'유리벽 앞까지 당기고, 뒤집어 뒤에서 밀어 깃발에 세우기'};
      return [drive];
    }
    case 9: {
      if(!a.values.chosen)return [];
      const steps:Step[]=[];
      if(!f('base'))steps.push(move('base',50,61,'내가 고른 장치의 몸체 놓기'));
      if(!f('magnet'))steps.push(move('design-magnet',43,55,'몸체에 조작 자석 달기'));
      if(!f('target'))steps.push(move('design-target',57,55,'맞은편에 선택한 부품 달기'));
      steps.push(press('prototype','내가 배치한 시제품의 반응 시험하기'));
      return steps;
    }
    case 10: {
      const remote=save.design.template==='remote';
      return [...(a.values.adjusting?[press('adjust','내 장치의 조작 손잡이 보기')]:[]),
        move('use-handle',remote?(a.points['design-magnet']?.x??save.activities[9]?.points['design-magnet']?.x??43):mailbox.handleClosed.x,remote?(a.values.round===1?66:42):mailbox.handleClosed.y,remote?'유리 밖 손잡이를 움직여 패드 관찰하기':'내 설계의 덮개 손잡이를 내려 닫기'),
        press('test','내가 설계한 배치의 작동 결과 관찰하기')];
    }
    default: return [];
  }
}

type Mode = 'playing' | 'paused' | 'finished';
interface Run { save: Save; steps: Step[]; index: number; mode: Mode; elapsed: number; acted: boolean; released?: boolean; wipeLeg?: number; label: string }
export function autoplayResult(stage:number,save:Save) {
  const a=save.activities[stage];
  if(a&&promptPending(stage,a,save))return '관찰 완료! 방금 본 결과를 골라 줘.';
  if(a&&missionReady(stage,a,save))return '관찰 완료! 아래 다음 버튼으로 이어가 봐.';
  if(stage===5)return '두 반응을 봤어! 이제 N극·S극 스티커를 직접 골라 붙여 봐.';
  return '관찰한 내용은 기록했어. 남은 안내를 보고 이어가 봐.';
}
export class ExperimentAutoplay {
  private run?: Run;
  private timer = 0;
  private tickTime = 0;
  private attachment?: {root:HTMLElement; panel:HTMLElement; stage:number};
  get save() { return this.run?.save; }
  reset() { window.clearTimeout(this.timer); this.run=undefined; this.update(); }
  markup(settings: Save['settings']) {
    return `<div class="experiment-autoplay" role="group" aria-label="실험 자동재생"><div class="demo-controls"><button type="button" data-demo="toggle"></button>${autoplaySpeedMarkup(settings)}</div><button type="button" data-demo="stop" hidden>■ 중지</button><span class="demo-caption" role="status" aria-live="polite" hidden></span></div>`;
  }
  bind(shell: HTMLElement, root: HTMLElement, stage: number, save: Save, notify:(text:string)=>void, changed:()=>void=()=>{}) {
    const panel=shell.querySelector<HTMLElement>('.experiment-autoplay');
    if(!panel)return ()=>{};
    const speedCleanup=bindAutoplaySpeed(panel,save.settings,changed);
    const attachment={root,panel,stage}; this.attachment=attachment;
    const events=new AbortController(), signal=events.signal;
    const toggle=panel.querySelector<HTMLButtonElement>('[data-demo="toggle"]')!;
    const stop=()=>{
      this.reset();
      document.querySelector<HTMLButtonElement>('[data-demo="toggle"]')?.focus({preventScroll:true});
      notify('자동재생을 멈췄어. 지금까지 한 활동은 그대로 남아 있어.');
    };
    toggle.addEventListener('click',()=>{
      if(save.settings.autoplay===false){this.reset();return;}
      if(this.run?.mode==='playing'){ this.pause(); return; }
      if(stage===9&&!save.activities[9]?.values.chosen){ notify('먼저 고칠 장치를 직접 골라 줘. 그다음 몸체 놓기와 시제품 시험을 관찰할 수 있어.'); return; }
      if(!this.run||this.run.mode==='finished'){
        this.reset();
        const steps=demonstrationSteps(stage,save);
        if(!steps.length){notify(autoplayResult(stage,save));return;}
        // These are the current activity's real handlers and saved observations.
        // Teacher mode already supplies its own isolated Save at the application boundary.
        this.run={save,steps,index:0,mode:'playing',elapsed:0,acted:false,label:steps[0].label};
        this.update();
      } else {
        this.run.mode='playing';this.tickTime=performance.now();this.update();
      }
      this.schedule();
    },{signal});
    panel.querySelector('[data-demo="stop"]')!.addEventListener('click',stop,{signal});
    // Clicking or starting a keyboard action on the demo bench returns ownership to the learner.
    const takeOver=(event:Event)=>{
      if(!this.run || !event.isTrusted || (event.target as Element).closest?.('.inquiry-prompt-host'))return;
      if(event instanceof KeyboardEvent && !['Enter',' ','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
      // Keep the very first real touch/key: it continues from the current position.
      this.reset();
    };
    root.addEventListener('pointerdown',takeOver,{capture:true,signal});
    root.addEventListener('click',takeOver,{capture:true,signal});
    root.addEventListener('keydown',takeOver,{capture:true,signal});
    window.addEventListener('experiment-pause',event=>{if((event as CustomEvent).detail)this.pause();},{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();},{signal});
    this.update();
    return ()=>{speedCleanup();events.abort();if(this.attachment===attachment)this.attachment=undefined;};
  }
  private update() {
    const a=this.attachment;if(!a)return;
    const run=this.run,playing=run?.mode==='playing';
    const toggle=a.panel.querySelector<HTMLButtonElement>('[data-demo="toggle"]')!, stop=a.panel.querySelector<HTMLButtonElement>('[data-demo="stop"]')!, caption=a.panel.querySelector<HTMLElement>('.demo-caption')!;
    toggle.textContent=!run?'▶ 자동재생':playing?'일시정지':run.mode==='finished'?'✓ 관찰 완료':'▶ 이어보기';
    toggle.setAttribute('aria-label',!run?'실험 자동재생':playing?'일시정지':run.mode==='finished'?'관찰 완료':'이어보기');
    stop.hidden=!run||run.mode==='finished';stop.setAttribute('aria-label','자동재생 중지 · 지금까지 한 활동은 유지');
    caption.hidden=!run;
    if(run){const text=run.mode==='finished'?autoplayResult(a.stage,run.save):`${playing?'자동재생':'멈춤'} · ${run.label}`;if(caption.textContent!==text)caption.textContent=text;}
    if(run?.mode==='paused')a.root.dataset.demoPaused='true';else delete a.root.dataset.demoPaused;
    if(run&&run.mode!=='finished')a.root.dataset.demoRun='true';else delete a.root.dataset.demoRun;
    a.root.classList.toggle('demo-bench',!!run&&run.mode!=='finished');
  }
  private pause() {
    if(this.run?.mode!=='playing')return;
    window.clearTimeout(this.timer);this.run.mode='paused';this.update();
  }
  private schedule() {
    window.clearTimeout(this.timer);
    if(this.run?.mode!=='playing')return;
    this.tickTime=performance.now();
    this.timer=window.setTimeout(()=>this.tick(),65/autoplaySpeed(this.run.save.settings));
  }
  private tick() {
    const a=this.attachment,run=this.run;
    if(!a||!run||run.mode!=='playing')return;
    if(run.save.settings.autoplay===false){this.reset();return;}
    if(document.hidden||a.root.parentElement?.closest('[inert]')||document.querySelector('dialog[open],.modal-backdrop')){this.pause();return;}
    // Physical releases have their own animation; wait for their real completion.
    if(a.root.inert){this.schedule();return;}
    const step=run.steps[run.index],dt=Math.min(performance.now()-this.tickTime,120);
    run.elapsed+=dt*autoplaySpeed(run.save.settings);
    if(run.acted && run.elapsed >= 700){
      run.index++;run.elapsed=0;run.acted=false;run.released=false;run.wipeLeg=undefined;
      if(run.index>=run.steps.length){
        const current=run.save.activities[a.stage];
        const remaining=current?.values.puzzleRevision===2&&[5,8].includes(a.stage)?demonstrationSteps(a.stage,run.save):[];
        if(!remaining.length){run.mode='finished';this.update();return;}
        run.steps=remaining;run.index=0;
      }
      run.label=run.steps[run.index].label;this.update();
    }else if(!run.acted && run.elapsed>=450){
      // The demonstration never answers for the learner: it holds here until they choose.
      const waiting=!!a.root.querySelector('[data-awaits-learner]'),label=waiting?'내 예상을 먼저 골라 줘':step.label;
      if(run.label!==label){run.label=label;this.update();}
      if(waiting){this.schedule();return;}
      const el=a.root.querySelector<HTMLButtonElement>(step.kind==='press'?step.selector:`[data-drag="${step.kind==='drive'?'controller':step.kind==='wipe'?'cleaner':step.id}"]`);
      if(!el || el.disabled){run.mode='paused';run.label='이 동작을 잠시 멈췄어. 남은 안내를 확인해 줘.';this.update();return;}
      let finished=false;
      if(step.kind==='press'){el.click();finished=true;}
      else if(step.kind==='wipe'){
        const activity=run.save.activities[a.stage],center=glassStains[step.stain];
        finished=activity.values[`clean${step.stain}`]===true;
        if(!finished){
          const leg=run.wipeLeg??0;
          const detached=activity.values.padDetached===true;
          const target=detached?(activity.points['inner-pad']||center):leg===0?center:{x:center.x+(leg%2?4.5:-4.5),y:center.y};
          if(this.move(el,target,false)){
            const pad=activity.points['inner-pad']||target;
            if(!detached&&Math.hypot(pad.x-target.x,pad.y-target.y)<1.3)run.wipeLeg=leg+1;
          }
          if(run.elapsed>45000){run.mode='paused';run.label='잠시 멈췄어. 손잡이를 패드 가까이 가져가 줘.';this.update();return;}
        }
      }
      else if(step.kind==='drive'){
        const activity=run.save.activities[a.stage],round=Number(activity.values.round||0),{wall:course,goal,start}=deliveryRoute(activity);
        const car=Number(activity.values.car??start),pull=activity.values.controllerPole!=='S';
        if(!run.released && Math.abs(car-goal)<=1.5){
          run.released=true;run.label='자석을 떼고 카트가 조금 더 굴러 멈추는 모습 보기';this.update();
          a.root.querySelector<HTMLButtonElement>('[data-mission="detach"]')?.click();
        }else if(!run.released&&course){
          // The hand cannot follow past the glass: pull up to it, lift away, then flip and push from behind.
          const y=Number.parseFloat(el.style.top),lifted=y<46,atWall=car>=deliveryCourse.reach-7;
          if(!pull||!atWall)this.move(el,{x:Math.min(deliveryCourse.reach,car+(pull?10:-10)),y:59},false);
          else if(!lifted)a.root.querySelector<HTMLButtonElement>('[data-mission="detach"]')?.click();
          else if(this.move(el,{x:car-10,y},false))a.root.querySelector<HTMLButtonElement>('[data-mission="flip"]')?.click();
        }else if(!run.released)this.move(el,{x:car+Math.sign(goal-car)*(pull?10:-10),y:59},false);
        finished=activity.values[`segment${round}`]===true;
        if(!finished && run.elapsed>30000){run.mode='paused';run.label='잠시 멈췄어. 중지를 눌러 직접 움직여 봐.';this.update();return;}
      }else if(!run.save.settings.motion || run.elapsed>9000){
        el.dispatchEvent(new CustomEvent('piece-place',{detail:step.target}));
        finished=true;
      }else finished=this.move(el,step.target,true);
      if(finished){run.acted=true;run.elapsed=0;}
    }
    this.schedule();
  }
  private move(el: HTMLButtonElement,target: Point,drop: boolean) {
    const x=Number.parseFloat(el.style.left),y=Number.parseFloat(el.style.top);
    const travel=Math.max(Math.abs(x-target.x),Math.abs(y-target.y));
    if(travel<=1.05){
      if(drop)el.dispatchEvent(new CustomEvent('piece-place',{detail:target}));
      return true;
    }
    // One normal arrow move per axis keeps canvas art, accessible hit targets and physics together.
    for(const [d,positive,negative] of [[target.x-x,'ArrowRight','ArrowLeft'],[target.y-y,'ArrowDown','ArrowUp']] as const){
      if(Math.abs(d)>1.05)el.dispatchEvent(new KeyboardEvent('keydown',{key:d>0?positive:negative,shiftKey:true,bubbles:true,cancelable:true}));
    }
    return false;
  }
}
