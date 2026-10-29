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


describe('짧은 탐구 흐름의 안내',()=>{
  const paced=()=>{const a=emptyActivity();a.values={playVersion:4,mechanicsVersion:1,paceVersion:1,inquiryVersion:2,inquiryPhase:'experiment'};return a;};
  it('구역 정리에서는 관찰한 발견만 고르게 안내한다',()=>{
    const a=paced();a.values.inquiryPhase='explain';const hint=coaching(2,a,freshSave());
    expect(hint.action).toContain('직접 본 움직임');expect(hint.action).not.toContain('근거를 연결');
    a.values.inquiryPhase='complete';expect(coaching(2,a,freshSave()).action).toContain('구역을 고치자');
  });
  it('새 배송은 목적지 정차를 안내하고 기존 배송의 중간 점검은 보존한다',()=>{
    const a=paced();a.values.car=73;const hint=coaching(8,a,freshSave());
    expect(hint.action).toContain('자석을 떼어');expect(hint.action).not.toContain('점검소');expect(hint.total).toBe(2);
    delete a.values.paceVersion;expect(coaching(8,a,freshSave()).action).toContain('점검소');
  });
  it('새 재료 활동은 핵심 세 재료만 세고 기존 여섯 재료 목표는 유지한다',()=>{
    const a=paced();a.values['sorted-clip']=true;a.values['sorted-nail']=true;
    expect(coaching(3,a,freshSave())).toMatchObject({done:1,total:3});
    delete a.values.paceVersion;expect(coaching(3,a,freshSave())).toMatchObject({done:2,total:6});
  });
  it('새 발명은 현재 설계의 한 번 성공을 안내하고 낡은 성공은 인정하지 않는다',()=>{
    const a=paced(),s=freshSave();a.values.use0=true;
    expect(coaching(10,a,s).action).not.toContain('실험 완료');
    addTrial(a,{key:'use0',activity:10,conditions:{},initialObjects:[],objects:[],input:[],outcome:'success',designRevision:s.design.revision,template:s.design.template});
    expect(coaching(10,a,s)).toMatchObject({done:1,total:1});expect(coaching(10,a,s).action).toContain('실험 완료');
    s.design.revision++;expect(coaching(10,a,s).action).not.toContain('실험 완료');
    expect(coaching(10,a,s).clues.join(' ')).not.toContain('두 사용 상황');
  });
  it('같은 물건 비교는 덮개 닫기와 흔들기 뒤에 자석 넣기를 안내한다',()=>{
    const a=paced(),s=freshSave();
    expect(coaching(2,a,s).focus).toBe('lid');
    a.values.repairClosed=true;expect(coaching(2,a,s).focus).toBe('shake');
    a.values.without0=true;a.values.repairClosed=false;expect(coaching(2,a,s).focus).toBe('repair-magnet');
    a.points['repair-magnet']={x:43,y:59};expect(coaching(2,a,s).focus).toBe('lid');
    a.values.repairClosed=true;expect(coaching(2,a,s).focus).toBe('shake');
    delete a.values.without0;a.values.with0=true;
    expect(coaching(2,a,s).action).toContain('위로 열고');expect(coaching(2,a,s).focus).toBe('lid');
    a.values.repairClosed=false;
    expect(coaching(2,a,s).action).toContain('바깥으로 빼고');expect(coaching(2,a,s).focus).toBe('repair-magnet');
  });
  it('붙지 않는 재료를 검사했으면 자석 대신 그 재료를 직접 집도록 안내한다',()=>{
    const a=paced(),s=freshSave();a.values['sorted-clip']=true;a.values['tested-clip']=true;a.values['tested-aluminum']=true;
    expect(coaching(3,a,s)).toMatchObject({focus:'material-2'});expect(coaching(3,a,s).action).toContain('손으로 오른쪽 아래');
    a.values['sorted-aluminum']=true;expect(coaching(3,a,s).focus).toBe('sweep-magnet');expect(coaching(3,a,s).action).toContain('나무');
    a.values['tested-wood']=true;expect(coaching(3,a,s).focus).toBe('material-3');
  });
  it('거리나 종이 배치가 준비되면 옮기기를 반복하지 않고 관찰 버튼을 안내한다',()=>{
    const a=paced(),s=freshSave();expect(coaching(4,a,s).focus).toBe('release');
    a.values.round=1;expect(coaching(4,a,s).focus).toBe('distance-magnet');
    a.points['distance-magnet']={x:49,y:55};expect(coaching(4,a,s).focus).toBe('release');
    a.values.round=2;expect(coaching(4,a,s).focus).toBe('paper');
    a.points.paper={x:55,y:55};expect(coaching(4,a,s).focus).toBe('release');
    a.points['distance-magnet']={x:30,y:55};expect(coaching(4,a,s).focus).toBe('distance-magnet');
  });
  it('한 극 관찰 뒤에는 뒤집기, 두 극 관찰 뒤에는 남은 스티커를 가리킨다',()=>{
    const a=paced(),s=freshSave();a.values.test0S=true;
    expect(coaching(5,a,s).focus).toBe('flip');
    a.values.test0N=true;expect(coaching(5,a,s).focus).toBe('stickerN');
    a.values.label0N=true;expect(coaching(5,a,s).focus).toBe('stickerS');
  });
  it('고리는 아래부터 놓고 관찰하며 결과를 본 뒤 뒤집게 안내한다',()=>{
    const a=paced(),s=freshSave();expect(coaching(6,a,s).focus).toBe('ring0');
    a.points.ring0={x:68,y:71};expect(coaching(6,a,s).focus).toBe('ring1');
    a.points.ring1={x:68,y:56};expect(coaching(6,a,s).focus).toBe('check');
    a.values.ringReleased=true;a.points.ring1={x:68,y:65};expect(coaching(6,a,s).focus).toBe('2번 고리 뒤집기');
  });
  it('청소 연결이 끊기면 같은 청소 지시 대신 패드와 다시 연결하도록 안내한다',()=>{
    const a=paced();a.points.cleaner={x:77,y:47};a.points['inner-pad']={x:29,y:48};
    expect(coaching(7,a,freshSave()).action).toContain('패드 가까이');
  });
  it('배치와 작동이 끝나면 이미 사용한 부품 대신 다음 부품이나 시험을 가리킨다',()=>{
    const a=paced(),s=freshSave();expect(coaching(9,a,s).focus).toBe('');
    a.values.chosen=true;a.values.base=true;expect(coaching(9,a,s).focus).toBe('design-magnet');
    a.values.magnet=true;expect(coaching(9,a,s).focus).toBe('design-target');
    a.values.target=true;expect(coaching(9,a,s).focus).toBe('prototype');
    a.points['use-handle']={x:50,y:65};expect(coaching(10,a,s).focus).toBe('test');
  });
});
