import { describe, expect, it } from 'vitest';
import { trialPicture, trialSummary, validTrial, type Trial } from '../src/trial-records';
import { bindTrialReplay, trialReplayMarkup } from '../src/trial-replay';
import { assemblyIssue } from '../src/mission-model';

const trial=():Trial=>({id:'5:pole0S',key:'pole0S',activity:5,modelVersion:1,conditions:{label:'S극을 가까이 댄 반응',facing:'S',hidden:'S'},initialObjects:[{id:'probe',x:48,y:53,pole:'N'},{id:'unknown-magnet',x:64,y:53,pole:'S'}],objects:[{id:'probe',x:48,y:53,pole:'N'},{id:'unknown-magnet',x:72,y:53,pole:'S'}],input:[],outcome:'repel'});
// This suite runs in Node. Drive the same button, range and animation-frame events used by the modal.
function replayHarness(trials:Trial[],motion=true,reduced=false){
  class Node extends EventTarget{
    value='';innerHTML='';textContent='';hidden=false;dataset:Record<string,string>={};attrs:Record<string,string>={};
    setAttribute(name:string,value:string){this.attrs[name]=value;}
    querySelector(){return null;}
    querySelectorAll(){return Array.from(this.innerHTML.matchAll(/data-replay-part="/g),()=>new Node());}
    focus(){}
  }
  const buttons=trials.map((_,i)=>{const b=new Node();b.dataset.trialChoice=String(i);return b;}).reverse();
  const nodes=new Map<string,Node>();
  function el(key:string){if(!nodes.has(key))nodes.set(key,new Node());return nodes.get(key)!;}
  const frames=new Map<number,FrameRequestCallback>();let now=0,id=0;
  const view={performance:{now:()=>now},matchMedia:()=>Object.assign(new EventTarget(),{matches:reduced}),
    requestAnimationFrame:(fn:FrameRequestCallback)=>{frames.set(++id,fn);return id;},cancelAnimationFrame:(key:number)=>frames.delete(key)};
  const root={querySelector:el,querySelectorAll:()=>buttons,ownerDocument:Object.assign(new EventTarget(),{defaultView:view})};
  const close=bindTrialReplay(root as unknown as HTMLElement,trials,motion);
  const tick=(ms:number)=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
  return {el,buttons,close,tick,frames};
}
describe('실험 다시보기의 과학 근거',()=>{
  it('마주 본 극과 대상의 처음·결과 위치, 밀림을 한국어로 표시한다',()=>{
    const t=trial(),summary=trialSummary(t);expect(validTrial(t)).toBe(true);
    expect(summary).toContain('기준 S극 · 대상 S극');expect(summary).toContain('처음 자리에서 오른쪽으로 이동했어');expect(summary).toContain('밀려났어');
    expect(trialPicture(t)).not.toContain('repel');expect(trialReplayMarkup([t])).not.toContain('pole0S');
  });
  it('극·대상 위치를 저장하지 않은 구기록에 추측한 정보를 채우지 않는다',()=>{
    const t=trial();t.conditions={};t.objects=[{id:'probe',x:48,y:53}];t.initialObjects=[];
    const before=JSON.stringify(t);expect(trialSummary(t)).toContain('당시 극 정보 없음');expect(trialSummary(t)).toContain('대상 자석의 위치 기록 없음');expect(JSON.stringify(t)).toBe(before);
    expect(trialPicture(t)).not.toContain('pole0S');
  });
  it('원격 장치에 기록한 위아래 극을 그림과 슬라이더에서도 세로로 보여 준다',()=>{
    const t=trial();t.activity=10;t.template='remote';t.objects=[{id:'target-magnet',x:54,y:47,topPole:'S',bottomPole:'N'}];
    expect(trialSummary(t)).toContain('위쪽 S극 · 아래쪽 N극');expect(trialPicture(t)).toContain('위 S극, 아래 N극');
    const h=replayHarness([t]);
    expect(h.el('.trial-compare').innerHTML).toContain('위 S극, 아래 N극');
    expect(h.el('.replay-controls').hidden).toBe(true);h.close();
  });
  it('선택한 기록만 재생하며 일시정지, 슬라이더, 키보드 선택, 닫기를 지원한다',()=>{
    const first=trial(),last={...trial(),id:'last',conditions:{label:'마지막 관찰'}};
    const h=replayHarness([first,last]),play=h.el('[data-replay-play]'),slider=h.el('#trial-position');
    expect(h.buttons[0].attrs['aria-pressed']).toBe('true');
    play.dispatchEvent(new Event('click'));h.tick(900);expect(slider.value).toBe('50');
    play.dispatchEvent(new Event('click'));h.tick(300);expect(slider.value).toBe('50');
    slider.value='25';slider.dispatchEvent(new Event('input'));expect(slider.attrs['aria-valuetext']).toContain('25%');
    play.dispatchEvent(new Event('click'));h.tick(450);expect(slider.value).toBe('50');
    h.buttons[0].dispatchEvent(Object.assign(new Event('keydown'),{key:'ArrowRight'}));
    expect(h.buttons[1].attrs['aria-pressed']).toBe('true');expect(slider.value).toBe('100');expect(h.frames.size).toBe(0);
    play.dispatchEvent(new Event('click'));h.close();expect(h.frames.size).toBe(0);
  });
  it.each([[false,false],[true,true]])('움직임을 줄이면 시간 재생 없이 처음과 결과를 전환한다', (motion,reduced)=>{
    const h=replayHarness([trial()],motion,reduced),play=h.el('[data-replay-play]');
    expect(play.textContent).toBe('처음 보기');play.dispatchEvent(new Event('click'));
    expect(h.el('#trial-position').value).toBe('0');expect(h.frames.size).toBe(0);
    play.dispatchEvent(new Event('click'));expect(h.el('#trial-position').value).toBe('100');h.close();
  });
  it('장면을 남기기 전에는 비어 있는 실험대 대신 첫 관찰 방법을 알려 준다',()=>{
    expect(trialReplayMarkup([])).toContain('실험대');expect(trialReplayMarkup([])).not.toContain('type="range"');
  });
  it.each([
    [{x:43,y:40},{x:57,y:55},'높이'],
    [{x:49,y:55},{x:51,y:55},'겹치'],
    [{x:32,y:55},{x:70,y:55},'간격'],
    [{x:20,y:55},{x:57,y:55},'점선'],
  ])('광장 시험에서 실제 배치에 맞는 실패 이유를 구분한다', (m,t,reason)=>expect(assemblyIssue(m,t,false)).toContain(reason));
});
