import {mountMapEncounters,normalizeMapHits} from './map-encounters.js';

// This copy ships with its own map so offline play needs no cross-project request.
const STAGES = [
  ["clip", "cap", "철 클립만 붙는 걸 봤어? 내 자석 뿔을 비밀로 할걸!", "다음 장난은 쇠 클립으로 만든 뿔 모자다!", "앗, 철 클립이 떨려!", "내 뿔에서 클립이 와르르!", "쳇, 클립은 돌려줄게. 뿔은 내 거야!"],
  ["parts", "plate", "철하고 다른 재료를 구별해? 내 주머니를 뒤집을 셈이야?", "내 쇳조각 수집품엔 손대지 마!", "앗, 철못이 주머니 밖으로!", "섞어 둔 부품이 또 나뉘잖아!", "흥, 철 부품과 다른 부품을 나눠 둘게!"],
  ["pole", "flip", "같은 극이 밀어내는 걸 알아냈어? 내 뿔 바꿔치기 실패야!", "한쪽 뿔을 몰래 돌리면 또 속겠지?", "앗, 자석 뿔이 돌아갔어!", "밀다가 붙어 버렸잖아!", "쳇, 자석 극 표지는 원래대로 할게!"],
  ["latch", "plug", "장벽 너머 빗장도 움직였어? 손 안 대는 건 내 특기였는데!", "다음 빗장은 꼭 내 주머니 뒤에 숨길 거야!", "앗, 빗장이 달칵!", "가려 놓은 빗장이 풀려!", "흥, 그 문은 열어 둘게!"],
  ["workshop", "gear", "자석 장치를 고쳤어? 내 부품 빼돌리기까지 들켰군!", "다음엔 내 뿔로 공구함째 들고 가야지!", "앗, 공방 부품이 떨어져!", "다시 맞춘 장치가 움직이잖아!", "쳇, 공방에 부품을 두고 갈게!"],
  ["plaza", "flag", "네 장치로 광장 문까지 열었다고? 거긴 내 비밀 본부였는데!", "간판은 이미 ‘자석 뿔 본부’로 주문했단 말이야!", "앗, 광장 셔터가 들렸어!", "마지막 빗장까지 움직였잖아!", "흥, 광장은 돌려줄게. 간판 주문이나 취소해야지!"],
];
const palette = '#67b4f8';
const art = {
  left: '/assets/adventure/map-villain-left-v2.webp',
  right: '/assets/adventure/map-villain-right-v2.webp',
  frames: 6,
};
const reactions = [
  '/assets/adventure/map-hero-reaction-v2.webp',
  '/assets/adventure/map-ally-reaction-v2.webp',
];
const sizes = [103, 90];

export function normalizeVillageEncounters(value,legacy) {
  // Old releases stored numeric slots; retain valid previous strikes/defeats.
  const previous=Object.fromEntries(STAGES.map(([id],i)=>[id,
    Number.isInteger(legacy?.[i])&&legacy[i]>=1&&legacy[i]<=3?legacy[i]:0]));
  return {...normalizeMapHits(previous,STAGES.map(([id])=>id)),...normalizeMapHits(value,STAGES.map(([id])=>id))};
}

export function mountVillageEncounters({host,stages,progress,onSave,blocked,reduced,tone,actors,clearIndex}) {
  const points=stages.flatMap((stage,i)=>{
    if(!stage||!STAGES[i])return [];
    const [id,prop,first,again,hitOne,hitTwo,finish]=STAGES[i];
    return [{id,prop,lines:[first,again],hit:[hitOne,hitTwo],finish,speaker:"자석 뿔 악당",...stage}];
  });
  if(!points.some(({id})=>(progress?.[id]||0)<3))return null;
  const runtime=mountMapEncounters({requiredFoes:6,host,stages:points,progress,onSave,blocked,reduced,tone,art,palette,clearStage:()=>STAGES[clearIndex]?.[0],
    reach:92,contact:23});
  const layer=host.querySelector('.map-encounter-layer');
  const poses=reactions.map((src,i)=>{
    const el=document.createElement('span');
    el.className='map-encounter-reaction';el.hidden=true;el.setAttribute('aria-hidden','true');
    el.dataset.actor=i?'ally':'hero';
    const sheet=new Image();sheet.src=src;
    Object.assign(el.style,{position:'absolute',left:'0',top:'0',pointerEvents:'none',backgroundImage:`url("${src}")`,
      backgroundRepeat:'no-repeat',backgroundSize:`${i?400:800}% 100%`,
      filter:'drop-shadow(0 1px 1px #15232870)',zIndex:'1'});
    layer.append(el);return {el,sheet};
  });
  const setOriginal=actors.map(actor=>{
    let previous=true;
    return visible=>{
      if(!actor||visible===previous)return;previous=visible;
      if(typeof actor==='function')actor(visible);else actor.style.opacity=visible?'':'0';
    };
  });
  return {
    update(input){
      const events=runtime.update(input);
      for(const [i,key] of ['hero','ally'].entries()){
        const {el,sheet}=poses[i],state=events[key],point=state&&input[key]&&input.project(input[key]);
        const visible=Boolean(point&&state&&sheet.naturalWidth&&!blocked?.());
        setOriginal[i]?.(!visible);el.hidden=!visible;
        if(!visible){delete el.dataset.pose;continue;}
        el.dataset.pose=state.kind;
        const scale=input.scale??1,size=Math.max(29,Math.min(140,sizes[i]*scale));
        const frame=state.frame+(i===0&&state.kind==='hurt'?4:0);
        Object.assign(el.style,{width:`${size}px`,height:`${size}px`,backgroundPosition:`${frame/(i?3:7)*100}% 50%`,
          transform:`translate(${point.x+state.dx*scale-size/2}px,${point.y-size}px) scaleX(${state.direction===1?-1:1})`});
      }
    },
    destroy(){setOriginal.forEach(show=>show(true));runtime.destroy();},
  };
}
