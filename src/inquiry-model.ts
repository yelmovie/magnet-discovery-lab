import type { Activity } from './domain';
import { inquiries } from './inquiry-content';
export type InquiryPhase = 'predict' | 'experiment' | 'explain' | 'apply' | 'complete';
export function inquiryPhase(a: Activity): InquiryPhase {
  const p = a.values.inquiryPhase;
  return ['predict','experiment','explain','apply','complete'].includes(String(p)) ? p as InquiryPhase : 'predict';
}
export function explanationCorrect(n: number, claim: number, proof: number): boolean {
  const q=inquiries[n-1]; return !!q && claim===q.claim && proof===q.proof;
}
export function inquiryReady(n: number, a: Activity): boolean {
  if(a.values.inquiryVersion !== 1) return true; // Historical records retain their original completion rules.
  const q=inquiries[n-1];
  return !!q && Number.isInteger(a.values.prediction) && Number(a.values.prediction)>=0 && Number(a.values.prediction)<q.guesses.length &&
    a.values.reasoned===true && explanationCorrect(n,Number(a.values.claim),Number(a.values.proof)) &&
    (n%2===1 || [0,1].every(i=>a.values[`field-${i}`]===true)) && inquiryPhase(a)==='complete';
}
export interface FieldSetup { material:string; gap:number; aligned:boolean; pole:string; gateA:string; gateB:string; gapA:number; gapB:number; paperA:boolean; paperB:boolean }
export const defaultFieldSetup = ():FieldSetup => ({material:'aluminum',gap:34,aligned:false,pole:'N',gateA:'N',gateB:'N',gapA:34,gapB:12,paperA:false,paperB:true});
export function fieldResult(stage:number,round:number,p:FieldSetup):{pass:boolean;message:string} {
  if(stage===1){
    const fair=round===0 ? p.gapA!==p.gapB && p.paperA===p.paperB : p.gapA===p.gapB && p.gapA<=15 && p.paperA!==p.paperB;
    return {pass:fair,message:fair ? (round===0?'종이 조건은 같고 거리만 달라. 가까운 실험에서는 철 클립이 움직였어.':'거리와 물체는 같고 종이만 달라. 두 실험 모두 철 클립이 움직였어.') : (round===0?'거리만 비교해야 해. 종이 조건을 같게 하고 거리는 다르게 해 봐.':'가까운 거리를 같게 두고 종이만 넣고 빼 봐. 너무 멀면 두 실험 모두 움직이지 않아 비교하기 어려워.')};
  }
  if(stage===2){const reference=round===0?'N':'S';const pass=p.gateA!==reference&&p.gateB===reference;return {pass,message:pass?'열림 문은 다른 극끼리 당겨지고, 안전문은 같은 극끼리 밀려났어.':`${reference}극과 마주 보고 있어. 왼쪽 문은 당겨 열고, 오른쪽 문은 밀어 막아야 해.`};}
  if(p.gap>15)return {pass:false,message:'물체가 움직이지 않았어. 부품을 더 가까이 놓고 같은 조건에서 다시 시험해 봐.'};
  if(!p.aligned)return {pass:false,message:'힘이 필요한 곳과 부품 위치가 어긋났어. 두 부품이 마주 보도록 맞춰 봐.'};
  const repel=stage===4&&round===1;
  const pass=repel?p.material==='magnet'&&p.pole==='N':p.material==='iron'||p.material==='magnet'&&p.pole==='S';
  return {pass,message:pass?(repel?'N극과 N극이 밀어내서 두 부품이 닿지 않게 됐어!':'가까이 마주 놓은 부품이 끌어당겨져 덮개가 고정됐어!'):(repel?'철판은 자석에 끌려와. 서로 밀어내려면 두 자석의 마주 보는 극을 살펴봐.':p.material==='magnet'?'마주 보는 N극과 N극이 밀어내고 있어. 닫히게 하려면 어떤 극이어야 할까?':'이 재료는 자석에 붙지 않았어. 앞서 검사한 철 부품과 비교해 봐.')};
}
export function routeDirection(side:'left'|'right',facing:'N'|'S'):number {
  const cartFace=side==='left'?'N':'S';const toward=facing!==cartFace;
  return (side==='left'?-1:1)*(toward?1:-1);
}
