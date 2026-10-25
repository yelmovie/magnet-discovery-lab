import { describe, expect, it } from 'vitest';
import { trialPicture, trialSummary, validTrial, type Trial } from '../src/trial-records';
import { trialReplayMarkup } from '../src/trial-replay';
import { assemblyIssue } from '../src/mission-model';

const trial=():Trial=>({id:'5:pole0S',key:'pole0S',activity:5,modelVersion:1,conditions:{label:'S극을 가까이 댄 반응',facing:'S',hidden:'S'},initialObjects:[{id:'probe',x:48,y:53,pole:'N'},{id:'unknown-magnet',x:64,y:53,pole:'S'}],objects:[{id:'probe',x:48,y:53,pole:'N'},{id:'unknown-magnet',x:72,y:53,pole:'S'}],input:[],outcome:'repel'});
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
  it.each([
    [{x:43,y:40},{x:57,y:55},'높이'],
    [{x:49,y:55},{x:51,y:55},'겹치'],
    [{x:32,y:55},{x:70,y:55},'간격'],
    [{x:20,y:55},{x:57,y:55},'점선'],
  ])('광장 시험에서 실제 배치에 맞는 실패 이유를 구분한다', (m,t,reason)=>expect(assemblyIssue(m,t,false)).toContain(reason));
});
