import type { Activity, Point, Pole, Save } from './domain';
import { validTrial } from './trial-records';
import { mailboxAssembled } from './mailbox-assembly';
import { materialCatalog, materialClassified, sortingSpecimens } from './material-sorting';

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) * .5625);
// The facing edges touch at six world units; one division on this experiment's ruler is six units wide.
export const distanceRuler = { contact:6, cell:6, magnetTip:4, clipTip:2 };
export function clearanceCells(magnet:Point,object:Point):number {
  return Math.max(0,(distance(magnet,object)-distanceRuler.contact)/distanceRuler.cell);
}
export const cellLabel=(cells:number)=>`${Number(cells.toFixed(1))}칸`;
export function nearRulerMark(magnet:Point,object:Point,mark:number):boolean {
  return Math.abs(clearanceCells(magnet,object)-mark)<=.5;
}
export function paperGapMiddle(magnet:Point,clip:Point):Point {
  return {x:(magnet.x+distanceRuler.magnetTip+clip.x-distanceRuler.clipTip)/2,y:(magnet.y+clip.y)/2};
}
export function magneticReach(a: Point, b: Point, magnetic = true): boolean { return magnetic && distance(a, b) <= 15; }
export function facingForce(leftRightPole: Pole, rightLeftPole: Pole): -1 | 1 { return leftRightPole === rightLeftPole ? 1 : -1; }
export function ringFloating(bottomTop: Pole, upperTop: Pole): boolean { return bottomTop !== upperTop; }
export function assemblyAligned(magnet:Point,target:Point,remote:boolean):boolean {
  return target.x-magnet.x>=11 && Math.abs(magnet.y-target.y)<9 && magnet.x>=32 && magnet.x<=49 && target.x>=51 && target.x<=70 &&
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
/** Activity 8 puzzle course: the hand-held magnet stops at the glass partition, the cart rolls through its door. */
export const deliveryCourse = { start:27, wall:52, reach:47.5, goal:60, tolerance:3 } as const;
/** Extended attempts add a stop before the glass room. */
export function deliveryRoute(a:Activity) {
  const round=Number(a.values.round||0),extended=a.values.puzzleRevision===2;
  const wall=a.values.puzzleVersion===1&&(extended?round>=1:round===0);
  return {wall,start:extended?(round===0?27:44):round===2?74:27,goal:wall?deliveryCourse.goal:extended?44:round===2?30:73};
}
/** Help follows how often the learner was stopped, never the clock. 0 none · 1 where to look · 2 what to compare · 3 offer autoplay. */
export const puzzleHint = (misses:number) => Math.max(0,Math.min(3,misses-1));
/** The stored proof that ends each puzzle course, by activity. */
const puzzleProof:Record<number,RegExp>={2:/^repair0$/,3:/^materials$/,4:/^paper$/,5:/^door0$/,6:/^join2$/,7:/^clean$/,8:/^delivery\d$/};
const extendedPuzzleProof:Record<number,RegExp>={...puzzleProof,4:/^(paper|key-pull)$/,5:/^door1$/,8:/^delivery1$/};
function solvingTrials(a:Activity){
  if(a.values.puzzleVersion!==1)return [];
  const proofs=a.values.puzzleRevision===2?extendedPuzzleProof:puzzleProof;
  return (a.trials||[]).filter(t=>proofs[t.activity]?.test(t.key)&&validTrial(t)&&t.outcome==='success');
}
export const puzzleSolved=(a:Activity)=>solvingTrials(a).length>0;
export function missionReady(screen: number, a: Activity, s: Save): boolean {
  if(screen===1&&a.values.assemblyVersion===1&&(!mailboxAssembled(a)||a.values.latch0!==true))return false;
  const f = (k: string) => a.values[k] === true;
  const proof = (key: string) => !!a.trials?.some(t => t.key === key && validTrial(t) && t.outcome === 'success');
  if(screen===2&&f('mailboxQuickRepair'))return f('with0')&&proof('repair0');
  const compact=a.values.paceVersion===1;
  if(a.values.mechanicsVersion===1){
    if(screen===1&&!(compact?[0]:[0,1]).every(i=>f(`latch${i}`)))return false;
    if(screen===2&&!compact&&!f('diagnosis2'))return false;
    if(screen===9&&!a.trials?.some(t=>t.key==='prototype'&&validTrial(t)&&t.designRevision===s.design.revision&&t.template===s.design.template))return false;
  }
  switch (screen) {
    case 1: return (compact?[0]:[0,1]).every(i => f(`found${i}`) && proof(`inspect${i}`));
    case 2: return (compact?[0]:[0,1]).every(i => f(`with${i}`) && f(`without${i}`) && proof(`repair${i}`)) && (compact || f('with2') && proof('repair2'));
    case 3: {
      const legacy = compact ? ['clip','aluminum','wood'] : materialCatalog.slice(0,6).map(m=>m.id);
      if(sortingSpecimens.every(m=>materialClassified(a,m.id)))return true;
      if(a.values.mechanicsVersion===1){
        return s.completed.includes(3) && legacy.every(id=>materialClassified(a,id));
      }
      return legacy.every(id=>f(`tested-${id}`)) &&
        (compact?['clip']:['clip','nail']).every(id=>f(`sorted-${id}`)||f(`delivered-${id}`));
    }
    case 4: {
      if(f('liveKeyRescue'))return f('keyRescued')&&proof('key-pull');
      const trial=(key:string)=>a.trials?.find(t=>t.key===key&&validTrial(t)&&t.outcome==='success');
      const far=trial('far'),near=trial('near'),paper=trial('paper'),rescue=trial('rescue');
      return !!far && !!near && !!paper && (compact || !!rescue) && Number(far.conditions.gap)>=27 &&
        Number(near.conditions.gap)<=15 && Number(paper.conditions.gap)<=15 && (compact || !!rescue && Number(rescue.conditions.gap)<=15) &&
        near.conditions.paper===false && paper.conditions.paper===true &&
        JSON.stringify(near.initialObjects)===JSON.stringify(paper.initialObjects);
    }
    case 5: return (compact?[0]:[0,1]).every(i => f(`test${i}N`) && f(`test${i}S`) && f(`solved${i}`)) && (a.values.puzzleVersion!==1 || proof('door0')) && (a.values.puzzleRevision!==2 || proof('door1'));
    case 6: return (compact?['float2','join2']:['float2','float3','join3']).every(proof);
    case 7: return [0, 1, 2].every(i => f(`clean${i}`)) && proof('clean');
    case 8: return a.values.puzzleRevision===2?[0,1].every(i=>f(`segment${i}`)&&proof(`delivery${i}`)):[0,1,2].some(i => f(`segment${i}`) && proof(`delivery${i}`));
    case 9: return f('base') && f('magnet') && f('target');
    case 10: return (compact?[0]:[0,1]).every(i => !!a.trials?.some(t => t.key === `use${i}` && validTrial(t) && t.outcome === 'success' && t.designRevision === s.design.revision && t.template === s.design.template)) && (compact || f('force-arrow'));
    default: return false;
  }
}
