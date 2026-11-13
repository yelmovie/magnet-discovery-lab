import { paperGapMiddle } from './mission-model';
import { materialCatalog } from './material-sorting';
import type { Trial, TrialObject } from './trial-records';

/** Recover only apparatus that the recorded conditions placed at a known point. */
function pictureObjects(t:Trial,source:TrialObject[]):TrialObject[] {
  let objects=source.filter(o=>!o.id.startsWith('initial:')&&o.id!=='moving-clip'&&o.id!=='nearStart');
  if(t.activity===4&&t.key==='rescue')objects=objects.map(o=>o.id==='clip'?{...o,id:'key'}:o);
  if(t.activity===10&&t.template==='remote'&&t.objects.some(o=>o.id==='operating-target')){
    const handle=objects.some(o=>o.id==='use-handle');
    objects=objects.filter(o=>o.id!=='design-magnet'&&o.id!=='design-target'&&!(handle&&o.id==='operating-magnet'));
  }
  if(t.activity!==4||t.conditions.paper!==true||objects.some(o=>o.id==='paper'))return objects;
  const recorded=t.objects.find(o=>o.id==='paper');
  if(recorded)return [recorded,...objects];
  const magnet=t.initialObjects.find(o=>o.id==='magnet'||o.id==='distance-magnet');
  const clip=t.initialObjects.find(o=>o.id==='clip');
  if(!magnet||!clip)return objects;
  // Older benches centred the sheet between the objects. The ruler bench uses their facing edges.
  const position=typeof t.conditions.clearanceCells==='number'?paperGapMiddle(magnet,clip):{x:(magnet.x+clip.x)/2,y:(magnet.y+clip.y)/2};
  return [{id:'paper',...position},...objects];
}
export const replayObjects=(t:Trial):TrialObject[]=>pictureObjects(t,t.objects);
export const replayInitialObjects=(t:Trial):TrialObject[]=>pictureObjects(t,t.initialObjects);


function clipResult(t:Trial):string {
  const ironKey=t.key==='rescue'||t.objects.some(o=>o.id==='key'),name=ironKey?'철 열쇠':'철 클립';
  const clip=t.objects.find(o=>o.id==='clip'||o.id==='key'),start=t.initialObjects.find(o=>o.id===clip?.id);
  const magnet=t.initialObjects.find(o=>o.id==='magnet'||o.id==='distance-magnet');
  const stationary=clip&&start&&Math.hypot(clip.x-start.x,clip.y-start.y)<.1;
  const nearer=clip&&start&&magnet&&Math.hypot(clip.x-magnet.x,clip.y-magnet.y)<Math.hypot(start.x-magnet.x,start.y-magnet.y)-.1;
  const gap=t.conditions.clearanceCells;
  const prefix=typeof gap==='number'?`처음 간격이 ${gap}칸일 때 `:'';
  if(t.outcome==='none'||stationary)return `${prefix}${name}${ironKey?'는':'은'} 처음 자리에 그대로 있었어.`;
  if(t.outcome==='attract'||nearer)return t.conditions.paper===true?'종이 한 장을 사이에 두었는데도 철 클립이 자석 쪽으로 움직였어.':`${prefix}${name}${ironKey?'가':'이'} 자석 쪽으로 움직였어.`;
  return '';
}

export function trialResultSentence(t:Trial):string {
  const c=t.conditions,good=t.outcome==='success';
  if(t.activity===4){const result=clipResult(t);if(result)return result;}
  if(t.activity===5&&(t.outcome==='attract'||t.outcome==='repel')){
    const known=(c.facing==='N'||c.facing==='S')&&(c.hidden==='N'||c.hidden==='S');
    const reaction=t.outcome==='repel'?'대상 자석이 밀려났어.':'대상 자석이 끌려왔어.';
    return known?`기준 자석의 ${c.facing}극과 대상 자석의 ${c.hidden}극이 마주 보자 ${reaction}`:reaction;
  }
  if(good){
    switch(t.activity){
      case 1:
        if(/^inspect\d+$/.test(t.key))return t.conditions.assembled===true?'부품을 하나씩 조립했어. 뚜껑 안쪽에는 자석, 몸체 안쪽에는 철판을 달았어.':'덮개를 여니 덮개에 붙은 자석은 올라가고, 몸체의 철판은 그대로 있었어.';
        if(/^latch\d+$/.test(t.key))return '덮개를 닫으니 자석이 몸체의 철판에 붙어 덮개를 잡아 줬어.';
        break;
      case 2:
        if(/^repair\d+$/.test(t.key)&&(c.quick===true||c.label==='흔들어도 열리지 않는 우편함'))return '덮개 안쪽의 자석이 몸체의 철판을 붙잡아서, 흔들어도 덮개가 닫혀 있었어.';
        if(c.course==='loose-plate')return '철판을 자석 가까이 옮기니 자석이 철판을 붙잡아 덮개가 닫혀 있었어.';
        if(/^repair\d+$/.test(t.key))return t.key==='repair2'?'철판의 자리를 고치니 자석이 덮개를 붙잡았어.':'똑같이 흔들었을 때 자석이 있는 덮개는 닫혀 있고, 자석을 뺀 덮개는 열렸어.';
        break;
      case 3:{
        const name=materialCatalog.find(m=>m.id===c.material)?.name;
        if(name&&typeof c.magnetic==='boolean')return c.magnetic?`자석을 가까이 대니 ${name}에 자석이 붙었어.`:`자석을 가까이 대도 ${name}의 위치는 그대로였어.`;
        if(t.key==='materials')return '물체를 자석에 가까이 대 보고, 붙는 것과 붙지 않는 것으로 나누었어.';
        break;
      }
      case 5:if(/^gate\d+$/.test(t.key))return '두 극을 가까이 댄 결과로 가려진 자석의 양쪽 극을 찾아냈어.';if(t.key==='door0')return '빗장과 같은 극을 마주 대니 빗장이 밀려나서 문이 열렸어.';break;
      case 6:
        if(/^float[23]$/.test(t.key))return '같은 극이 마주 보자 윗고리가 밀려 올라가 고리 사이에 틈이 생겼어.';
        if(/^join[23]$/.test(t.key))return '다른 극이 마주 보자 윗고리가 끌려 내려와 아랫고리에 붙었어.';
        break;
      case 7:if(t.key==='clean')return '유리 밖 손잡이를 움직이니 물속 패드가 따라와 얼룩을 닦았어.';break;
      case 8:
        if(/^stop\d+$/.test(t.key))return '조종 자석을 멀리 옮기니 목적지에서 수레가 멈췄어.';
        if(/^delivery\d+$/.test(t.key)&&c.method==='pull')return '앞에서 다른 극을 마주 대니 수레가 조종 자석 쪽으로 끌려갔어.';
        if(/^delivery\d+$/.test(t.key)&&c.method==='push')return '뒤에서 같은 극을 마주 대니 수레가 조종 자석에서 밀려났어.';
        break;
      case 9:if(t.key==='prototype')return '내가 놓은 두 부품이 서로 당기는 배치를 찾았어.';break;
      case 10:
        if(/^use\d*$/.test(t.key)&&t.template==='box')return '내가 만든 우편함의 덮개가 자석의 힘으로 닫힌 채로 있었어.';
        if(/^use\d*$/.test(t.key)&&t.template==='remote')return '판 밖 자석을 움직여서 안쪽 부품을 목표까지 옮겼어.';
        break;
    }
  }
  if(t.outcome==='failure'&&typeof c.reason==='string'&&/[가-힣]/.test(c.reason))return c.reason.split(/(?<=[.!?])\s/)[0];
  if(t.outcome==='failure')return '이 배치로는 목표를 이루지 못했어. 처음과 결과를 비교해 봐.';
  if(t.outcome==='attract')return '마주 놓은 물체가 자석 쪽으로 끌려왔어.';
  if(t.outcome==='repel')return '마주 놓은 자석이 서로 밀어냈어.';
  if(t.outcome==='none')return '관찰한 물체가 처음 자리에 그대로 있었어.';
  return /[가-힣]/.test(t.outcome)?t.outcome:'처음 자리와 결과 자리를 비교해 봐.';
}
