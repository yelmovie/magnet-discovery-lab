import { describe, expect, it } from 'vitest';
import { completeActivity, emptyActivity, freshSave, migrateSave, ready } from '../src/domain';
import { addTrial } from '../src/trial-records';
import { courierPosition, doors, nearestRoad, roadRoute, roads } from '../src/expedition';
import { assemblyAligned, magneticReach, ringFloating } from '../src/mission-model';
import { initializeFinal } from '../src/final-mission';
import { restorationView } from '../src/restoration';

const proof=(a:ReturnType<typeof emptyActivity>,key:string,revision=0)=>addTrial(a,{key,activity:10,conditions:{label:key},initialObjects:[{id:'magnet',x:30,y:50}],objects:[{id:'magnet',x:50,y:50}],input:[{x:30,y:50},{x:50,y:50}],outcome:'success',designRevision:revision,template:'box'});
describe('실험 증거와 기존 기록 호환',()=>{
  it('완료 버튼은 관찰 플래그만으로 발명 사용을 통과시키지 않는다',()=>{const s=freshSave(),a=emptyActivity();a.values={playVersion:4,use0:true,use1:true,'force-arrow':true};expect(ready(10,a,s)).toBe(false);proof(a,'use0');proof(a,'use1');expect(ready(10,a,s)).toBe(true);s.design.revision++;expect(ready(10,a,s)).toBe(false);});
  it('종이 비교는 같은 초기 배치에서 종이만 달라야 한다',()=>{const s=freshSave(),a=emptyActivity();a.values={playVersion:4};for(const key of ['far','near','paper','rescue']){proof(a,key);a.trials!.at(-1)!.conditions={gap:key==='far'?35:12,paper:key==='paper'};}expect(ready(4,a,s)).toBe(true);a.trials!.find(t=>t.key==='paper')!.initialObjects[0].x++;expect(ready(4,a,s)).toBe(false);});
  it('철이 아닌 재료는 운반 성공을 요구하지 않는다',()=>{const s=freshSave(),a=emptyActivity();a.values.playVersion=4;for(const id of ['clip','nail','aluminum','wood','plastic','rubber'])a.values[`tested-${id}`]=true;expect(ready(3,a,s)).toBe(false);a.values['delivered-clip']=a.values['delivered-nail']=true;expect(ready(3,a,s)).toBe(true);});
  it('이전 완료 기록의 사본과 증거는 다시 탐구해도 바뀌지 않는다',()=>{const s=freshSave();for(let n=1;n<=2;n++){const a=s.activities[n]=emptyActivity();a.values={playVersion:3,open0:true,open1:true,found0:true,found1:true,with0:true,with1:true,without0:true,without1:true};expect(completeActivity(s,n)).toBe(true);}const original=JSON.stringify(s.evidence);const migrated=migrateSave(s)!;migrated.activities[1]=emptyActivity();expect(JSON.stringify(migrated.evidence)).toBe(original);expect(migrated.completed).toEqual([1,2]);});
  it('이미 고친 뒤 설계가 바뀌면 예전 성공으로 종료하지 않고 다시 장착할 수 있다',()=>{const s=freshSave(),r=initializeFinal(s);r.installed=r.operated=true;s.design.revision++;const view=restorationView(s);expect(r.operated).toBe(false);expect(r.installed).toBe(false);expect(view.html).toContain('data-drag="blueprint"');});
  it('새 음원을 한 번 활성화하고 전체 음소거와 이후 배경음 선택은 보존한다',()=>{
    const old=freshSave();delete old.settings.musicVersion;old.settings.music=false;
    expect(migrateSave(old)!.settings.music).toBe(true);expect(old.settings.music).toBe(false);
    old.settings.sound=false;expect(migrateSave(old)!.settings.music).toBe(false);
    const current=freshSave();current.settings.music=false;expect(migrateSave(current)!.settings.music).toBe(false);
    delete current.settings.music;delete current.settings.effects;
    expect(migrateSave(current)!.settings).toMatchObject({music:true,effects:true,musicVersion:1});
  });
});
describe('자석 모형과 실제 지도 길',()=>{
  it('접근은 철에만 적용되며 멀리 떨어진 철은 붙지 않는다',()=>{expect(magneticReach({x:40,y:50},{x:50,y:50})).toBe(true);expect(magneticReach({x:40,y:50},{x:70,y:50})).toBe(false);expect(magneticReach({x:40,y:50},{x:50,y:50},false)).toBe(false);});
  it('고리의 윗면이 다르면 실제로 마주 보는 두 면은 같은 극이다',()=>{expect(ringFloating('N','S')).toBe(true);expect(ringFloating('N','N')).toBe(false);});
  it('원격 장치 부품은 유리의 양쪽에 마주 놓아야 한다',()=>{expect(assemblyAligned({x:44,y:53},{x:57,y:53},true)).toBe(true);expect(assemblyAligned({x:20,y:53},{x:30,y:53},true)).toBe(false);expect(assemblyAligned({x:44,y:40},{x:57,y:65},true)).toBe(false);});
  it('시작점부터 여섯 시설의 출입문까지 연결되어 있다',()=>{for(const door of doors){const route=roadRoute(roads[0],door);expect(route[0]).toEqual(roads[0]);expect(route.at(-1)).toEqual(roads[door]);expect(route.length).toBeGreaterThan(1);}});
  it('첫 RAF 시간이 이르거나 경로가 한 바퀴 돌아도 택배가 유효한 길 위에 있다',()=>{for(const phase of [-.001,0,.1,9.99,10,20.5,NaN]){const p=courierPosition(phase);expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);expect(nearestRoad(p).x).toBeCloseTo(p.x,5);}expect(courierPosition(10)).toEqual(courierPosition(0));});
  it('걷는 좌표는 길에 투영되며 물이나 건물로 빠지지 않는다',()=>{expect(nearestRoad({x:50,y:83})).toEqual({x:50,y:83});const p=nearestRoad({x:5,y:10});expect(p.x).toBeGreaterThan(5);expect(Number.isFinite(p.y)).toBe(true);});
});
