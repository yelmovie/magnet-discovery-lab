import { describe, expect, it } from 'vitest';
import { emptyActivity, freshSave } from '../src/domain';
import { addTrial } from '../src/trial-records';
import { aquariumOnMap, courierOnMap, townRestoration } from '../src/town-restoration';
import { courierPosition, expeditionMarkup, nearestRoad, pendingVillageEncounter } from '../src/expedition';

describe('지도에서 보이는 수조와 배달 복구', () => {
  it('새 탐험과 교사용 전체 열기에는 더러운 유리만 있고 배송 수레는 없다', () => {
    const save = freshSave();
    expect(townRestoration(save)).toEqual({ aquariumClean:false, deliveriesRunning:false });
    expect(expeditionMarkup(save, true)).toContain('data-aquarium-state="dirty"');
    expect(expeditionMarkup(save, true)).not.toContain('class="expedition-courier"');
  });
  it('청소 완료와 배달 완료를 각각 지도에 반영한다', () => {
    const save = freshSave();
    save.completed.push(7);
    expect(aquariumOnMap(save)).toContain('data-aquarium-state="clean"');
    expect(aquariumOnMap(save)).not.toContain('aquarium-cleaner-parts.webp');
    expect(courierOnMap(save)).toBe('');
    save.completed.push(8);
    expect(courierOnMap(save)).toContain('prop-cart.webp');
    expect(courierOnMap(save)).toContain('prop-parcel.webp');
  });
  it('교사 미리보기나 임의의 플래그가 아닌 유효한 청소·배달 기록으로도 복구된다', () => {
    const save = freshSave(), clean = save.activities[7] = emptyActivity(), delivery = save.activities[8] = emptyActivity();
    clean.values = { clean0:true, clean1:true, clean2:true };
    delivery.values = { paceVersion:1, segment0:true, segment1:true };
    expect(townRestoration(save)).toEqual({ aquariumClean:false, deliveriesRunning:false });
    const proof = (activity:7|8, key:string) => addTrial(save.activities[activity], {
      activity, key, conditions:{}, initialObjects:[], objects:[], input:[], outcome:'success',
    });
    proof(7, 'clean');
    expect(townRestoration(save)).toEqual({ aquariumClean:true, deliveriesRunning:false });
    proof(8, 'delivery0');
    expect(townRestoration(save)).toEqual({ aquariumClean:true, deliveriesRunning:true });
    expect(townRestoration(freshSave())).toEqual({ aquariumClean:false, deliveriesRunning:false });
  });
  it('다른 구역의 증거가 많아도 배달을 완료하지 않으면 수레를 만들지 않는다', () => {
    const save = freshSave();
    save.evidence = [0,1,2,4].map(stage => ({stage,date:save.updated,activities:[],summary:[]}));
    expect(courierOnMap(save)).toBe('');
  });
  it('왕복 수레는 일정한 속도로 돌길을 따라가며 출입문 안으로 들어가지 않는다', () => {
    for (let i=0;i<=200;i++) {
      const p=courierPosition(i/20), road=nearestRoad(p);
      expect(road.x).toBeCloseTo(p.x,5);
      expect(road.y).toBeCloseTo(p.y,5);
      expect(p.x).toBeGreaterThanOrEqual(29.3);
      expect(p.x).toBeLessThanOrEqual(66.4);
    }
    expect(courierPosition(0)).toEqual(courierPosition(10));
    expect(courierPosition(5).x).toBeCloseTo(29.3);
  });
});

describe('다음 구역으로 가기 전 지도 악당', () => {
  it('복구한 구역만 열고, 저장된 세 번째 명중 뒤에만 다음 악당을 고른다', () => {
    const save = freshSave();
    expect(pendingVillageEncounter(save)).toBe(-1);
    save.completed = [1,2,3,4];
    save.evidence = [0,1].map(stage => ({stage,date:save.updated,activities:[],summary:[]}));
    save.mapEncounters = {clip:2,parts:1};
    expect(pendingVillageEncounter(save)).toBe(0);
    expect(expeditionMarkup(save)).toContain('악당에게 가기');
    expect(expeditionMarkup(save,true)).not.toContain('data-action="walk-next"');
    save.mapEncounters.clip = 3;
    expect(pendingVillageEncounter(save)).toBe(1);
    save.mapEncounters.parts = 3;
    expect(pendingVillageEncounter(save)).toBe(-1);
    expect(expeditionMarkup(save)).toContain('자동으로 들어가기');
  });
});
