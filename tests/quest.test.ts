import { finalQuestions } from '../src/final-review';
import { describe, expect, it } from 'vitest';
import { completeActivity, coreReady, emptyActivity, freshSave, migrateSave, ready } from '../src/domain';
import { addTrial } from '../src/trial-records';
import { courierPosition, doors, expeditionMarkup, nearestRoad, residentMarkers, residents, roadRoute, roads, trailPoint, travelFacing, walkRoad } from '../src/expedition';
import { assemblyAligned, magneticReach, ringFloating } from '../src/mission-model';
import { initializeFinal } from '../src/final-mission';

it('migrates demonstration preferences while preserving teacher choices', () => {
  const old = freshSave();
  delete old.settings.autoplay; delete old.settings.autoplaySpeed;
  expect(migrateSave(old)?.settings).toMatchObject({ autoplay: true, autoplaySpeed: 1 });
  old.settings.autoplay = false; old.settings.autoplaySpeed = 2;
  expect(migrateSave(old)?.settings).toMatchObject({ autoplay: false, autoplaySpeed: 2 });
});
import { installRestoration, restorationView } from '../src/restoration';

const proof=(a:ReturnType<typeof emptyActivity>,key:string,revision=0)=>addTrial(a,{key,activity:10,conditions:{label:key},initialObjects:[{id:'magnet',x:30,y:50}],objects:[{id:'magnet',x:50,y:50}],input:[{x:30,y:50},{x:50,y:50}],outcome:'success',designRevision:revision,template:'box'});
describe('실험 증거와 기존 기록 호환',()=>{
  it.each(['box','remote'] as const)('검증한 %s 설계는 설치 뒤 같은 사용 시험을 다시 요구하지 않는다',template=>{
    const s=freshSave(),a=s.activities[10]=emptyActivity();s.completed.push(10);a.values.paceVersion=1;
    Object.assign(s.design,{template,aligned:true,gap:22});
    addTrial(a,{key:'use',activity:10,conditions:{aligned:true,gap:22},initialObjects:[],objects:[],input:[{x:50,y:37},{x:50,y:65}],outcome:'success',template,designRevision:s.design.revision});
    installRestoration(s);const r=initializeFinal(s);
    expect(r.operated).toBe(true);expect(coreReady(s,true)).toBe(true);
    expect(r.attempt?.trials).toEqual(a.trials);expect(r.attempt).not.toBe(a);
    s.design.revision++;expect(coreReady(s,true)).toBe(false);
    installRestoration(s);expect(r.operated).toBe(false);expect(r.attempt?.trials?.length||0).toBe(0);
  });
  it('설치만 하거나 실패·예전 설계·미완료·선택 도전이면 성공 기록을 대신 만들지 않는다',()=>{
    for(const kind of ['missing','failed','stale','incomplete','legacy','challenge']){
      const s=freshSave(),a=s.activities[10]=emptyActivity();s.completed.push(10);a.values.paceVersion=1;
      Object.assign(s.design,{aligned:true,gap:22});
      if(kind!=='missing')addTrial(a,{key:'use',activity:10,conditions:{aligned:true,gap:22},initialObjects:[],objects:[],input:[],outcome:kind==='failed'?'failure':'success',template:'box',designRevision:kind==='stale'?-1:0});
      if(kind==='incomplete')s.completed=[];if(kind==='legacy')delete a.values.paceVersion;if(kind==='challenge')initializeFinal(s).mode='challenge';
      installRestoration(s);expect(initializeFinal(s).operated,kind).toBe(false);expect(coreReady(s,true),kind).toBe(false);
    }
  });
  it('완료 버튼은 관찰 플래그만으로 발명 사용을 통과시키지 않는다',()=>{const s=freshSave(),a=emptyActivity();a.values={playVersion:4,use0:true,use1:true,'force-arrow':true};expect(ready(10,a,s)).toBe(false);proof(a,'use0');proof(a,'use1');expect(ready(10,a,s)).toBe(true);s.design.revision++;expect(ready(10,a,s)).toBe(false);});
  it('종이 비교는 같은 초기 배치에서 종이만 달라야 한다',()=>{const s=freshSave(),a=emptyActivity();a.values={playVersion:4};for(const key of ['far','near','paper','rescue']){proof(a,key);a.trials!.at(-1)!.conditions={gap:key==='far'?35:12,paper:key==='paper'};}expect(ready(4,a,s)).toBe(true);a.trials!.find(t=>t.key==='paper')!.initialObjects[0].x++;expect(ready(4,a,s)).toBe(false);});
  it('철이 아닌 재료는 운반 성공을 요구하지 않는다',()=>{const s=freshSave(),a=emptyActivity();a.values.playVersion=4;for(const id of ['clip','nail','aluminum','wood','plastic','rubber'])a.values[`tested-${id}`]=true;expect(ready(3,a,s)).toBe(false);a.values['delivered-clip']=a.values['delivered-nail']=true;expect(ready(3,a,s)).toBe(true);});
  it('이전 완료 기록의 사본과 증거는 다시 탐구해도 바뀌지 않는다',()=>{const s=freshSave();for(let n=1;n<=2;n++){const a=s.activities[n]=emptyActivity();a.values={playVersion:3,open0:true,open1:true,found0:true,found1:true,with0:true,with1:true,without0:true,without1:true};expect(completeActivity(s,n)).toBe(true);}const original=JSON.stringify(s.evidence);const migrated=migrateSave(s)!;migrated.activities[1]=emptyActivity();expect(JSON.stringify(migrated.evidence)).toBe(original);expect(migrated.completed).toEqual([1,2]);});
  it('광장의 이전 조작 기록을 보존하면서 새 정리 문제의 답은 학생에게 맡긴다',()=>{const s=freshSave(),r=initializeFinal(s);r.installed=r.operated=true;s.design.revision++;const before=structuredClone(r),view=restorationView(s);expect(r).toEqual(before);expect(s.final.review?.answers).toEqual([-1,-1,-1,-1,-1]);expect(view.html).toContain('data-review-answer="0"');expect(view.html).not.toContain('data-drag="blueprint"');});
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
  it('교사용 전체 열기는 중앙 광장까지 한 번에 열고 따로 해금할 목록을 만들지 않는다',()=>{
    const s=freshSave(),before=structuredClone(s),map=expeditionMarkup(s,true);
    expect(map.match(/expedition-building available/g)).toHaveLength(6);
    expect(map).not.toContain('expedition-building locked');
    expect(map).not.toContain('teacher-picker');
    expect(map).not.toContain('모든 스테이지 열림');
    expect(s).toEqual(before);
    const student=expeditionMarkup(s,false);
    expect(student.match(/expedition-building locked/g)).toHaveLength(5);
    expect(student).toContain('data-action="walk-next"');
  });
  it('두 탐구의 복구 기록이 생겨야 주민이 돌아오고, 교사 해금만으로는 돌아오지 않는다',()=>{
    const s=freshSave();
    expect(expeditionMarkup(s,true)).not.toContain('data-resident');
    for(let n=1;n<=2;n++){
      const a=s.activities[n]=emptyActivity();
      a.values={playVersion:3,open0:true,open1:true,found0:true,found1:true,with0:true,with1:true,without0:true,without1:true};
      expect(completeActivity(s,n)).toBe(true);
      expect(residentMarkers(s).includes('data-resident="0"')).toBe(n===2);
      expect(expeditionMarkup(s)).toContain(`data-district-light="0" class="${n===1?'porch-lit':'town-lit'}"`);
    }
    expect(expeditionMarkup(migrateSave(s)!,true).match(/data-resident="/g)).toHaveLength(1);
    expect(residentMarkers({...s,completed:[1]})).toBe('');
    expect(residentMarkers({...s,evidence:[]})).toBe('');
    expect(residentMarkers(freshSave())).toBe('');
  });
  it('다섯 주민은 자기 구역의 길 가장자리 밖에 서고 구역마다 한 명씩만 나타난다',()=>{
    const s=freshSave();
    residents.forEach(({feet,name},stage)=>{
      const road=nearestRoad(feet),door=roads[doors[stage]];
      expect(Math.hypot(feet.x-road.x,(feet.y-road.y)*.5625),name).toBeGreaterThan(1.8);
      expect(Math.hypot(feet.x-door.x,(feet.y-door.y)*.5625),name).toBeLessThan(11);
      s.completed.push(stage*2+1,stage*2+2);
      s.evidence.push({stage,date:s.updated,activities:[],summary:[]});
      const markers=residentMarkers(s);
      expect(markers.match(/data-resident="/g)).toHaveLength(stage+1);
      expect(markers).toContain(`src="/assets/quest/resident-${stage+1}.webp"`);
      expect(markers).toContain(`aria-label="${name}에게 인사하기"`);
    });
    s.greetedResidents=[0,0,2,7];
    const loaded=migrateSave(s)!;
    expect(loaded.greetedResidents).toEqual([0,2]);
    expect(residentMarkers(loaded).match(/data-greeted="true"/g)).toHaveLength(2);
  });
  it('지도 비율을 반영한 실제 이동 방향으로 옆모습과 뒷모습을 선택한다',()=>{
    const p={x:50,y:50};
    expect(travelFacing(p,{x:50,y:49})).toBe('up');
    expect(travelFacing(p,{x:50,y:51})).toBe('down');
    expect(travelFacing(p,{x:49,y:50})).toBe('left');
    expect(travelFacing(p,{x:51,y:50})).toBe('right');
    expect(travelFacing(p,{x:51,y:48.5})).toBe('right');
    expect(travelFacing(p,{x:51,y:47})).toBe('up');
    expect(travelFacing(p,p,'left')).toBe('left');
    expect(travelFacing(p,{x:50.000001,y:50},'up')).toBe('up');
  });
  it('접근은 철에만 적용되며 멀리 떨어진 철은 붙지 않는다',()=>{expect(magneticReach({x:40,y:50},{x:50,y:50})).toBe(true);expect(magneticReach({x:40,y:50},{x:70,y:50})).toBe(false);expect(magneticReach({x:40,y:50},{x:50,y:50},false)).toBe(false);});
  it('고리의 윗면이 다르면 실제로 마주 보는 두 면은 같은 극이다',()=>{expect(ringFloating('N','S')).toBe(true);expect(ringFloating('N','N')).toBe(false);});
  it('원격 장치 부품은 유리의 양쪽에 마주 놓아야 한다',()=>{expect(assemblyAligned({x:44,y:53},{x:57,y:53},true)).toBe(true);expect(assemblyAligned({x:20,y:53},{x:30,y:53},true)).toBe(false);expect(assemblyAligned({x:44,y:40},{x:57,y:65},true)).toBe(false);});
  it('시작점부터 여섯 시설의 출입문까지 연결되어 있다',()=>{for(const door of doors){const route=roadRoute(roads[0],door);expect(route[0]).toEqual(roads[0]);expect(route.at(-1)).toEqual(roads[door]);expect(route.length).toBeGreaterThan(1);}});
  it('방향 버튼 네 개로 돌길을 걸어 모든 시설의 문턱에 닿는다',()=>{
    for(const door of doors){
      let p={...roads[0]};
      for(const point of roadRoute(p,door)){
        for(let step=0;step<150;step++){
          const dx=point.x-p.x,dy=(point.y-p.y)*.5625;
          if(Math.hypot(dx,dy)<.38)break;
          const direction=Math.abs(dx)>Math.abs(dy)?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)};
          p=walkRoad(p,direction,.35);
        }
        expect(Math.hypot(point.x-p.x,(point.y-p.y)*.5625)).toBeLessThan(.38);
      }
    }
    const crossing=walkRoad({x:50,y:83},{x:1,y:0},.75);
    expect(crossing).toEqual({x:50.75,y:83});
  });
  it('같은 길 중간을 누르면 꼭짓점으로 돌아가지 않고 누른 곳까지 걷는다',()=>{
    const start={x:50.5,y:85},target={x:49.5,y:81};
    expect(roadRoute(start,target)).toEqual([start,target]);
  });
  it('첫 RAF 시간이 이르거나 경로가 한 바퀴 돌아도 택배가 유효한 길 위에 있다',()=>{for(const phase of [-.001,0,.1,9.99,10,20.5,NaN]){const p=courierPosition(phase);expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);expect(nearestRoad(p).x).toBeCloseTo(p.x,5);}expect(courierPosition(10)).toEqual(courierPosition(0));});
  it('당이는 밀이가 지나온 길 위에서 일정한 거리만큼 뒤따른다',()=>{const trail=roadRoute(roads[0],12);const p=trailPoint(trail,3.6);expect(nearestRoad(p).x).toBeCloseTo(p.x,5);expect(nearestRoad(p).y).toBeCloseTo(p.y,5);expect(trailPoint([{x:50,y:88}],3.6)).toEqual({x:50,y:88});});
  it('걷는 좌표는 길에 투영되며 물이나 건물로 빠지지 않는다',()=>{expect(nearestRoad({x:50,y:83})).toEqual({x:50,y:83});const p=nearestRoad({x:5,y:10});expect(p.x).toBeGreaterThan(5);expect(Number.isFinite(p.y)).toBe(true);});
});

describe('리뉴얼 광장 연결 퍼즐의 저장 경계',()=>{
  it('새 리뉴얼 경로만 연결 퍼즐을 거쳐 수첩으로 간다',()=>{
    const s=freshSave();s.activities[8]=emptyActivity();s.activities[8].values.puzzleRevision=2;
    const view=restorationView(s);
    expect(view.html).toContain('plaza-magnet');expect(s.final.review).toBeUndefined();
  });
  it('이미 시작한 수첩과 수료 기록에는 연결 퍼즐을 추가하지 않는다',()=>{
    const s=freshSave();s.activities[8]=emptyActivity();s.activities[8].values.puzzleRevision=2;
    s.final.review={version:1,page:0,answers:[-1,-1,-1,-1,-1]};
    expect(restorationView(s).html).toContain('data-review-answer');
    expect(restorationView(s).html).not.toContain('plaza-magnet');
  });
});

describe('광장 연결 완료 판정',()=>{
  it('수첩 답이 모두 있어도 네 연결 증거가 없으면 수료를 막는다',()=>{
    const s=freshSave();s.final.report=true;
    for(let stage=0;stage<5;stage++){s.completed.push(stage*2+1,stage*2+2);s.evidence.push({stage,date:s.updated,activities:[emptyActivity(),emptyActivity()],summary:[]});}
    restorationView(s);
    s.final.review!.answers=finalQuestions.map(q=>q.answer);
    const a=s.final.puzzle=emptyActivity();
    expect(coreReady(s)).toBe(false);
    for(const key of ['plaza-iron','plaza-distance','plaza-poles'])proof(a,key);
    expect(coreReady(s)).toBe(false);
    proof(a,'plaza-glass');expect(coreReady(s)).toBe(true);
    // Reuse the actual question keys rather than weakening the review gate.
    const notebook=restorationView(s);expect(notebook.html).toContain('plaza-next');
    a.values.notebook=true;
    expect(restorationView(s).html).toContain('final-review');
    const restored=migrateSave(s)!;expect(restored.final.puzzle!.trials).toHaveLength(4);
  });
});
