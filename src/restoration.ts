import { emptyActivity, type Save } from './domain';
import { initializeFinal, finalView as legacyFinalView } from './final-mission';
import { missionView } from './mission-play';
import { currentInventionTrial } from './trial-records';
import { bindDrag, draggable, placementControls } from './manipulation';
import { icon, mascot, sceneArt } from './art';
import { questCompanion } from './quest-ui';
import type { View } from './activity-types';

/** The final reward is the learner's working design, installed and operated in a new place. */
export function restorationView(s:Save):View {
  const r=initializeFinal(s);
  if(r.operated&&(r.revision!==s.design.revision||r.template!==s.design.template)){r.operated=false;r.installed=false;r.attempt=emptyActivity();}
  if(r.mode==='challenge'||r.repair!=='invention'){
    const legacy=legacyFinalView(s);return {html:`<div class="restoration-optional-lab">${legacy.html}</div>`,bind:legacy.bind};
  }
  if(!r.installed)return{
    html:`<div class="restoration-plaza"><h1 class="mission-question">내 설계도로 광장의 장치를 고쳐 볼까?</h1><div class="restoration-install play-board"><div class="restoration-mount"><img src="/assets/quest/prop-postal-box.webp" alt="내 설계를 기다리는 광장 장치"><span>여기에 내 설계 장착</span></div>${draggable('blueprint','내 발명 설계도',{x:25,y:56},'<img src="/assets/quest/prop-book.webp" alt=""><strong>내 발명 설계도</strong>')}</div>${questCompanion({message:'내가 직접 시험한 설계도야. 책을 광장 장치 쪽으로 옮겨 장착하고, 정말 작동하는지도 확인해 줘.'})}<details class="restoration-access"><summary>눌러서 이동</summary>${placementControls}</details></div>`,
    bind(c){return bindDrag(c,'blueprint',{x:25,y:56},p=>{if(Math.hypot(p.x-53,(p.y-56)*.56)<17){r.installed=true;r.revision=s.design.revision;r.template=s.design.template;r.attempt=emptyActivity();c.touch();c.refresh();}else c.notify('설계도를 가운데 광장 장치까지 옮겨 줘.');});}
  };
  if(r.operated)return{
    html:`<div class="restoration-plaza restoration-success"><h1 class="mission-question">네 설계로 광장의 장치를 고쳤어!</h1><div class="restoration-team">${mascot('mili',190,3)}${sceneArt(5,'restoration-scene')}${mascot('dangi',180,3)}</div><p class="restoration-ability">자석의 위치와 거리를 조절해서<br>생활에 필요한 장치를 만들 수 있어!</p><button class="btn restoration-3d" data-restoration="view3d">내 발명품 3D로 작동해 보기</button>${questCompanion({message:'네가 확인한 다섯 발견이 모두 쓰였어. 다른 장치로도 도전하고 싶으면 축제 뒤에 다시 찾아와 줘.'})}<button class="quest-cta restoration-finish" data-restoration="finish">도시 축제 열기 ${icon('spark',26)}</button><details class="restoration-access"><summary>다른 복구도 해 보기</summary><button class="btn" data-restoration="challenge">배송·고리·발명 이어 고치기</button></details></div>`,
    bind(c){c.root.querySelector('[data-restoration="finish"]')?.addEventListener('click',()=>c.root.dispatchEvent(new CustomEvent('activate-final',{bubbles:true})));c.root.querySelector('[data-restoration="view3d"]')?.addEventListener('click',()=>c.root.dispatchEvent(new CustomEvent('open-3d',{bubbles:true,detail:{kind:s.design.template==='box'?'box':'remote'}})));c.root.querySelector('[data-restoration="challenge"]')?.addEventListener('click',()=>{r.optionalBackup=JSON.stringify(r);r.mode='challenge';r.segments=[];r.operated=false;r.installed=false;r.attempt=emptyActivity();c.touch();c.refresh();});}
  };
  let a=r.attempt ||= emptyActivity();
  if(a.values.playVersion!==4){a=r.attempt=emptyActivity();a.values.playVersion=4;for(const id of ['design-magnet','design-target']){const p=s.activities[10]?.points[id]||s.activities[9]?.points[id];if(p)a.points[id]={...p};}}
  const view=missionView(10,a,s);
  return{html:`<div class="restoration-operation"><h1 class="mission-question">내 장치를 광장에서도 작동시켜 줘!</h1><div class="restoration-lab">${view.html}</div>${questCompanion({message:s.design.template==='box'?'내가 고친 위치 그대로 장착했어. 덮개를 내려 닫은 뒤 사용 시험을 해 보자.':'내가 만든 원격 손잡이야. 유리 밖에서 안쪽 철 부품을 위 선반까지 움직이고 사용 시험을 해 줘.'})}</div>`,bind(c){
    return view.bind({...c,screen:10,a,refresh:()=>{if(currentInventionTrial(a,s.design.template,s.design.revision)){r.revision=s.design.revision;r.template=s.design.template;r.operated=true;if(!r.segments.includes('invention'))r.segments.push('invention');}c.touch();c.refresh();}});
  }};
}
