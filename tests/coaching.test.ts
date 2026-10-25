import { describe, expect, it } from 'vitest';
import { emptyActivity, freshSave } from '../src/domain';
import { coaching } from '../src/coach';
import { addTrial } from '../src/trial-records';

describe('실험 상태에 따른 보조 캐릭터 안내',()=>{
  it('탐구 실험 완료 뒤에도 실제 청소 발견 수를 유지한다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,mechanicsVersion:1,inquiryVersion:1,inquiryPhase:'experiment',clean0:true,clean1:true,clean2:true};
    addTrial(a,{key:'clean',activity:7,conditions:{},initialObjects:[],objects:[],input:[],outcome:'success'});
    expect(coaching(7,a,s)).toMatchObject({done:3,total:3});
    expect(coaching(7,a,s).action).toContain('실험 완료');
  });
  it('조립 뒤에는 시제품 시험을 안내하고 설계 변경 뒤 다시 시험하게 한다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,mechanicsVersion:1,inquiryVersion:1,inquiryPhase:'experiment',chosen:true,base:true,magnet:true,target:true};
    expect(coaching(9,a,s)).toMatchObject({done:3,total:4});expect(coaching(9,a,s).action).toContain('시제품 반응 시험');
    addTrial(a,{key:'prototype',activity:9,conditions:{},initialObjects:[],objects:[],input:[],outcome:'failure',designRevision:s.design.revision,template:s.design.template});
    expect(coaching(9,a,s)).toMatchObject({done:4,total:4});
    s.design.revision++;expect(coaching(9,a,s).action).toContain('시제품 반응 시험');
  });
  it('덮개를 연 뒤에는 열기를 반복시키지 않고 관찰할 물체를 안내한다',()=>{
    const a=emptyActivity(),s=freshSave();a.values.playVersion=4;
    expect(coaching(1,a,s).focus).toBe('lid');a.values.open0=true;
    expect(coaching(1,a,s).focus).toBe('hidden-magnet');
    a.values.found0=true;expect(coaching(1,a,s).action).toContain('다음 의뢰 버튼');
  });
  it('같은 장치의 두 조건을 모두 비교하면 다음 장치로 안내한다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,without0:true};
    expect(coaching(2,a,s).action).toContain('자석 넣고');a.values.with0=true;
    expect(coaching(2,a,s).action).toContain('다음 의뢰 버튼');expect(coaching(2,a,s).done).toBe(2);
  });
  it('종이 비교에서는 자석 위치 유지와 종이 조작을 안내한다',()=>{
    const a=emptyActivity();a.values={playVersion:4,round:2};const hint=coaching(4,a,freshSave());
    expect(hint.focus).toBe('paper');expect(hint.action).toContain('자석은 그대로');
    expect(hint.clues.join()).toContain('종이의 영향만');
  });
  it('극 추론에 필요한 두 반응을 보기 전에는 스티커 붙이기를 지시하지 않는다',()=>{
    const a=emptyActivity();a.values={playVersion:4,test0N:true};
    expect(coaching(5,a,freshSave()).action).toContain('번갈아');a.values.test0S=true;
    expect(coaching(5,a,freshSave()).action).toContain('두 반응을 근거');
  });
  it('가상 성공 플래그만 채운 상태를 완료 안내로 바꾸지 않는다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,use0:true,use1:true,'force-arrow':true};
    expect(coaching(10,a,s).action).not.toContain('발견 완료');
    for(const key of ['use0','use1'])addTrial(a,{key,activity:10,conditions:{},initialObjects:[],objects:[],input:[],outcome:'success',designRevision:s.design.revision,template:s.design.template});
    expect(coaching(10,a,s).action).toContain('발견 완료');s.design.revision++;
    expect(coaching(10,a,s).action).not.toContain('발견 완료');
  });
  it('각 단계의 힌트 계산은 학생의 실험 기록과 설계를 바꾸지 않는다',()=>{
    const a=emptyActivity(),s=freshSave(),before=JSON.stringify({a,s});
    for(let n=1;n<=10;n++){const hint=coaching(n,a,s);expect(hint.action.length).toBeGreaterThan(0);expect(hint.total).toBeGreaterThan(0);}
    expect(JSON.stringify({a,s})).toBe(before);
  });
});
