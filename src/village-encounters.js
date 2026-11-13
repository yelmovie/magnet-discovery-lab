import {mountMapEncounters,normalizeMapHits} from './map-encounters.js';

// This copy ships with its own map so offline play needs no cross-project request.
const STAGES = [
  [
    "clip",
    "cap",
    "클립은 내 뿔에 있지!",
    "철 클립은 여기 붙어 있어!"
  ],
  [
    "parts",
    "plate",
    "이 쇳조각은 내가 챙길래!",
    "철못도 하나 붙여 볼까?"
  ],
  [
    "pole",
    "flip",
    "어느 쪽 뿔부터 볼래?",
    "이번에는 파란 뿔이지!"
  ],
  [
    "latch",
    "plug",
    "손 안 대고도 걸어 잠갔지!",
    "철판 뒤 빗장을 당겨야지!"
  ],
  [
    "workshop",
    "gear",
    "그 부품은 내가 챙길래!",
    "철 부품은 내 주머니에!"
  ],
  [
    "plaza",
    "flag",
    "광장 문은 내가 잠근다!",
    "셔터 빗장을 더 세게 걸 거야!"
  ]
];
const hit = ["앗, 자석 뿔이 돌아갔어!", "고철이 떨어지잖아!"], finish = "빗장을 풀고 갈게!";
const palette = '#67b4f8';
const art = {
  left: '/assets/adventure/map-villain-left.webp',
  right: '/assets/adventure/map-villain-right.webp',
  frames: 6,
};
const reactions = [
  '/assets/adventure/map-hero-reaction.webp',
  '/assets/adventure/map-ally-reaction.webp',
];
const sizes = [103, 90];

export function normalizeVillageEncounters(value,legacy) {
  // Old releases stored numeric slots; retain valid previous strikes/defeats.
  const previous=Object.fromEntries(STAGES.map(([id],i)=>[id,
    Number.isInteger(legacy?.[i])&&legacy[i]>=1&&legacy[i]<=3?legacy[i]:0]));
  return {...normalizeMapHits(previous,STAGES.map(([id])=>id)),...normalizeMapHits(value,STAGES.map(([id])=>id))};
}

export function mountVillageEncounters({host,stages,progress,onSave,blocked,reduced,tone,actors}) {
  const points=stages.flatMap((stage,i)=>{
    if(!stage||!STAGES[i])return [];
    const [id,prop,first,again]=STAGES[i];
    return [{id,prop,lines:[first,again],hit,finish,...stage}];
  });
  if(!points.some(({id})=>(progress?.[id]||0)<3))return null;
  const runtime=mountMapEncounters({host,stages:points,progress,onSave,blocked,reduced,tone,art,palette,
    reach:92,contact:23});
  const layer=host.querySelector('.map-encounter-layer');
  const poses=reactions.map((src,i)=>{
    const el=document.createElement('span');
    el.className='map-encounter-reaction';el.hidden=true;el.setAttribute('aria-hidden','true');
    Object.assign(el.style,{position:'absolute',left:'0',top:'0',pointerEvents:'none',backgroundImage:`url("${src}")`,
      backgroundRepeat:'no-repeat',backgroundSize:`${i?400:800}% 100%`,
      filter:'drop-shadow(0 1px 1px #15232870)',zIndex:'1'});
    layer.append(el);return el;
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
        const el=poses[i],state=events[key],point=state&&input[key]&&input.project(input[key]);
        const visible=Boolean(point&&state&&!blocked?.());
        setOriginal[i]?.(!visible);el.hidden=!visible;
        if(!visible)continue;
        const scale=input.scale??1,size=Math.max(29,Math.min(140,sizes[i]*scale));
        const frame=state.frame+(i===0&&state.kind==='hurt'?4:0);
        Object.assign(el.style,{width:`${size}px`,height:`${size}px`,backgroundPosition:`${frame/(i?3:7)*100}% 50%`,
          transform:`translate(${point.x+state.dx*scale-size/2}px,${point.y-size}px) scaleX(${state.direction===1?-1:1})`});
      }
    },
    destroy(){setOriginal.forEach(show=>show(true));runtime.destroy();},
  };
}
