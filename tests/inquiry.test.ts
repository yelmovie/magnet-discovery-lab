import { describe, expect, it } from 'vitest';
import { emptyActivity, freshSave, ready } from '../src/domain';
import { discoveries, inquiries } from '../src/inquiry-content';
import { defaultFieldSetup, explanationCorrect, fieldResult, inquiryPhase, inquiryReady, routeDirection } from '../src/inquiry-model';
import { missionReady } from '../src/mission-model';
import { advanceInquiry, inquiryNext, inquiryView } from '../src/inquiry';
import { addTrial } from '../src/trial-records';

describe('조작 중심 탐구 흐름',()=>{
  it('새 활동 10개는 예상을 맞히거나 시작 버튼을 누르지 않고 실험대로 열린다',()=>{
    for(let n=1;n<=10;n++){
      const a=emptyActivity(),s=freshSave();a.values.paceVersion=1;
      const view=inquiryView(n,a,s);
      expect(a.values.inquiryVersion).toBe(2);expect(inquiryPhase(a)).toBe('experiment');
      expect(view.html).toContain('inquiry-workbench');expect(view.html).not.toContain('data-inquiry="begin"');
      expect(inquiryNext(n,a,s).enabled).toBe(false);
    }
  });
  it('첫 활동은 실험 증거가 있으면 별도 퀴즈 없이 다음 활동으로 이어진다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,mechanicsVersion:1,paceVersion:1,inquiryVersion:2,inquiryActivity:9,inquiryPhase:'experiment',base:true,magnet:true,target:true};
    expect(ready(9,a,s)).toBe(false);
    addTrial(a,{key:'prototype',activity:9,conditions:{label:'내 배치 첫 시험'},objects:[],initialObjects:[],input:[],outcome:'none',designRevision:s.design.revision,template:s.design.template});
    expect(ready(9,a,s)).toBe(true);expect(inquiryNext(9,a,s)).toEqual({label:'다음 탐구로',enabled:true});
    expect(advanceInquiry(a)).toBe(false);expect(inquiryPhase(a)).toBe('experiment');
  });
  it('각 구역의 두 번째 활동에서만 발견 하나를 정리하고, 예전 중복 의뢰는 요구하지 않는다',()=>{
    discoveries.forEach((d,i)=>{
      const n=(i+1)*2,a=emptyActivity();a.values={inquiryVersion:2,inquiryActivity:n,inquiryPhase:'experiment'};
      expect(inquiryReady(n,a)).toBe(false);expect(advanceInquiry(a)).toBe(true);expect(inquiryPhase(a)).toBe('explain');
      a.values.inquiryPhase='complete';a.values.reflected=true;a.values.reflection=(d.answer+1)%3;
      expect(inquiryReady(n,a)).toBe(false);a.values.reflection=d.answer;expect(inquiryReady(n,a)).toBe(true);
      expect(ready(n,a,freshSave())).toBe(false);
    });
  });
  it('설계를 바꾸면 예전 발견 카드 대신 현재 배치 실험으로 돌아간다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,mechanicsVersion:1,paceVersion:1,inquiryVersion:2,inquiryActivity:10,inquiryPhase:'complete',reflected:true,reflection:discoveries[4].answer};
    inquiryView(10,a,s);
    expect(inquiryPhase(a)).toBe('experiment');expect(a.values.reflected).toBe(false);expect(inquiryNext(10,a,s).enabled).toBe(false);
  });
  it('실험대를 다시 보고 오면 이전 선택과 피드백을 지우고 새 관찰로 정리한다',()=>{
    const a=emptyActivity();a.values={inquiryVersion:2,inquiryActivity:2,inquiryPhase:'experiment',reflection:1,reflected:false,reflectionFeedback:'이전 오답 힌트'};
    expect(advanceInquiry(a)).toBe(true);expect(a.values.reflection).toBeUndefined();expect(a.values.reflectionFeedback).toBeUndefined();expect(a.values.reflected).toBe(false);
    expect(inquiryReady(2,a)).toBe(false);
    a.values.reflection=discoveries[0].answer;a.values.reflected=true;a.values.inquiryPhase='complete';
    expect(inquiryReady(2,a)).toBe(true);
  });
});

describe('예측-실험-근거-전이 완료 경계',()=>{
  it('예상과 버튼 클릭만으로 실험이나 구역 완료를 대신할 수 없다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,inquiryVersion:1,prediction:0,claim:0,proof:1,reasoned:true,inquiryPhase:'complete','field-0':true,'field-1':true};
    expect(inquiryReady(2,a)).toBe(true);expect(ready(2,a,s)).toBe(false);
  });
  it('10개 탐구 모두 올바른 규칙과 해당 근거가 함께 필요하다',()=>{
    inquiries.forEach((q,i)=>{
      expect(explanationCorrect(i+1,q.claim,q.proof)).toBe(true);
      expect(explanationCorrect(i+1,(q.claim+1)%3,q.proof)).toBe(false);
      expect(explanationCorrect(i+1,q.claim,(q.proof+1)%3)).toBe(false);
      const a=emptyActivity();a.values={inquiryVersion:1,prediction:0,claim:q.claim,proof:q.proof,reasoned:true,inquiryPhase:'complete'};
      expect(inquiryReady(i+1,a)).toBe(i%2===0);
      a.values['field-0']=true;a.values['field-1']=true;expect(inquiryReady(i+1,a)).toBe(true);
      a.values.inquiryPhase='explain';expect(inquiryReady(i+1,a)).toBe(false);
    });
  });
  it('과거 완료 데이터에는 새로운 탐구 플래그를 소급 요구하지 않는다',()=>expect(inquiryReady(2,emptyActivity())).toBe(true));
  it('설계 수정 후 과거 완료 카드에 갇히지 않고 시제품 시험으로 돌아간다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,mechanicsVersion:1,inquiryVersion:1,inquiryPhase:'complete',prediction:0,reasoned:true,claim:2,proof:0,base:true,magnet:true,target:true};
    addTrial(a,{key:'prototype',activity:9,conditions:{label:'첫 설계'},objects:[],initialObjects:[],input:[],outcome:'success',designRevision:0,template:'box'});
    expect(inquiryNext(9,a,s).enabled).toBe(true);s.design.revision=1;
    expect(inquiryNext(9,a,s).enabled).toBe(false);inquiryView(9,a,s);
    expect(a.values.inquiryPhase).toBe('experiment');expect(a.values.reasoned).toBe(false);
  });
  it('새 재료 검사에서는 여섯 재료 직접 분류까지 해야 한다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,mechanicsVersion:1,'delivered-clip':true,'delivered-nail':true};
    const ids=['clip','nail','aluminum','wood','plastic','rubber'];ids.forEach(id=>a.values[`tested-${id}`]=true);
    expect(missionReady(3,a,s)).toBe(false);ids.forEach(id=>a.values[`sorted-${id}`]=true);expect(missionReady(3,a,s)).toBe(true);
  });
  it('첫 설계의 실패도 기록되지만 수정한 설계는 다시 시험한다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,mechanicsVersion:1,base:true,magnet:true,target:true};
    expect(missionReady(9,a,s)).toBe(false);
    addTrial(a,{key:'prototype',activity:9,conditions:{label:'첫 설계'},objects:[{id:'magnet',x:20,y:30}],initialObjects:[],input:[],outcome:'none',designRevision:0,template:'box'});
    expect(missionReady(9,a,s)).toBe(true);s.design.revision++;expect(missionReady(9,a,s)).toBe(false);
  });
});
describe('새 상황에 적용하는 과학 모형',()=>{
  it('금속인 알루미늄은 가까이 마주 놓아도 잠금장치 역할을 못 한다',()=>{
    const p={...defaultFieldSetup(),gap:12,aligned:true};expect(fieldResult(0,0,p).pass).toBe(false);
    p.material='iron';expect(fieldResult(0,0,p).pass).toBe(true);expect(fieldResult(0,1,p).pass).toBe(true);
    p.gap=34;expect(fieldResult(0,0,p).pass).toBe(false);
  });
  it('거리와 종이를 동시에 바꾸면 공정한 비교가 아니다',()=>{
    const p=defaultFieldSetup();expect(fieldResult(1,0,p).pass).toBe(false);expect(fieldResult(1,1,p).pass).toBe(false);
    p.paperB=false;expect(fieldResult(1,0,p).pass).toBe(true);expect(fieldResult(1,1,p).pass).toBe(false);
    p.gapA=12;p.paperB=true;expect(fieldResult(1,1,p).pass).toBe(true);expect(fieldResult(1,0,p).pass).toBe(false);
  });
  it('기준 극이 바뀌면 열림과 안전문 배치도 뒤집어야 한다',()=>{
    const p={...defaultFieldSetup(),gateA:'S',gateB:'N'};expect(fieldResult(2,0,p).pass).toBe(true);expect(fieldResult(2,1,p).pass).toBe(false);
    p.gateA='N';p.gateB='S';expect(fieldResult(2,1,p).pass).toBe(true);
  });
  it('카트의 좌우 위치와 마주 보는 극이 함께 방향을 결정한다',()=>{
    expect(routeDirection('left','N')).toBe(1);expect(routeDirection('right','N')).toBe(1);
    expect(routeDirection('left','S')).toBe(-1);expect(routeDirection('right','S')).toBe(-1);
  });
  it('철판은 잠금장치로 쓸 수 있지만 밀어내는 완충 장치로는 못 쓴다',()=>{
    const p={...defaultFieldSetup(),material:'iron',gap:12,aligned:true};expect(fieldResult(4,0,p).pass).toBe(true);expect(fieldResult(4,1,p).pass).toBe(false);
    p.material='magnet';p.pole='N';expect(fieldResult(4,1,p).pass).toBe(true);expect(fieldResult(4,0,p).pass).toBe(false);
    p.pole='S';expect(fieldResult(4,0,p).pass).toBe(true);
  });
});
