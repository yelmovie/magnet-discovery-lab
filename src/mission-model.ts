import type { Activity, Point, Pole, Save } from './domain';
import { validTrial } from './trial-records';

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) * .5625);
export function magneticReach(a: Point, b: Point, magnetic = true): boolean { return magnetic && distance(a, b) <= 15; }
export function facingForce(leftRightPole: Pole, rightLeftPole: Pole): -1 | 1 { return leftRightPole === rightLeftPole ? 1 : -1; }
export function ringFloating(bottomTop: Pole, upperTop: Pole): boolean { return bottomTop !== upperTop; }
export function assemblyAligned(magnet:Point,target:Point,remote:boolean):boolean {
  return Math.abs(magnet.y-target.y)<9 && magnet.x>=32 && magnet.x<=49 && target.x>=51 && target.x<=70 &&
    magnet.y>=38 && magnet.y<=72 && target.y>=38 && target.y<=72 && (!remote || magnet.x<50 && target.x>50);
}
/** Explain the first physical obstruction using the same placement rules as the test. */
export function assemblyIssue(magnet:Point,target:Point,remote:boolean):string {
  if(Math.abs(magnet.y-target.y)>=9)return '두 부품의 높이가 달라. 서로 마주 보게 높이를 맞춰 봐.';
  if(target.x-magnet.x<11)return '두 부품이 겹치거나 순서가 바뀌었어. 자석은 왼쪽, 대상은 오른쪽에 간격을 두고 놓아 줘.';
  if(!assemblyAligned(magnet,target,remote))return remote?'유리판을 사이에 두고 왼쪽에 자석, 오른쪽에 대상 부품을 놓아 줘.':'장치의 점선 자리 안으로 두 부품을 옮겨 줘.';
  if(distance(magnet,target)*2>36)return '두 부품의 간격이 너무 멀어. 가까이 옮겨서 다시 시험해 봐.';
  return '';
}
export function missionReady(screen: number, a: Activity, s: Save): boolean {
  const f = (k: string) => a.values[k] === true;
  const proof = (key: string) => !!a.trials?.some(t => t.key === key && validTrial(t) && t.outcome === 'success');
  if(a.values.mechanicsVersion===1){
    if(screen===1&&![0,1].every(i=>f(`latch${i}`)))return false;
    if(screen===2&&!f('diagnosis2'))return false;
    if(screen===3&&!['clip','nail','aluminum','wood','plastic','rubber'].every(id=>f(`sorted-${id}`)))return false;
    if(screen===8&&![0,1,2].every(i=>f(`checkpoint${i}`)))return false;
    if(screen===9&&!a.trials?.some(t=>t.key==='prototype'&&validTrial(t)&&t.designRevision===s.design.revision&&t.template===s.design.template))return false;
  }
  switch (screen) {
    case 1: return [0, 1].every(i => f(`found${i}`) && proof(`inspect${i}`));
    case 2: return [0, 1].every(i => f(`with${i}`) && f(`without${i}`) && proof(`repair${i}`)) && f('with2') && proof('repair2');
    case 3: return ['clip','nail','aluminum','wood','plastic','rubber'].every(id => f(`tested-${id}`)) && ['clip','nail'].every(id => f(`delivered-${id}`));
    case 4: {
      const trial=(key:string)=>a.trials?.find(t=>t.key===key&&validTrial(t)&&t.outcome==='success');
      const far=trial('far'),near=trial('near'),paper=trial('paper'),rescue=trial('rescue');
      return !!far && !!near && !!paper && !!rescue && Number(far.conditions.gap)>=27 &&
        Number(near.conditions.gap)<=15 && Number(paper.conditions.gap)<=15 && Number(rescue.conditions.gap)<=15 &&
        near.conditions.paper===false && paper.conditions.paper===true &&
        JSON.stringify(near.initialObjects)===JSON.stringify(paper.initialObjects);
    }
    case 5: return [0, 1].every(i => f(`test${i}N`) && f(`test${i}S`) && f(`solved${i}`));
    case 6: return ['float2', 'float3', 'join3'].every(proof);
    case 7: return [0, 1, 2].every(i => f(`clean${i}`)) && proof('clean');
    case 8: return [0, 1, 2].every(i => f(`segment${i}`) && proof(`delivery${i}`));
    case 9: return f('base') && f('magnet') && f('target');
    case 10: return [0, 1].every(i => !!a.trials?.some(t => t.key === `use${i}` && validTrial(t) && t.outcome === 'success' && t.designRevision === s.design.revision && t.template === s.design.template)) && f('force-arrow');
    default: return false;
  }
}
