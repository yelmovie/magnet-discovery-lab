import { mountMapVillains } from './map-villains.js';
import { playEffect } from './game-audio';
import { icon, walkingMascot } from './art';
import { questRewards } from './mission-content';
import { stageNames, type Point, type Save } from './domain';
import { districtRestored, townLights } from './town-lights';
import { aquariumOnMap, courierOnMap } from './town-restoration';
import './town-recovery.css';

// World percentages. Doors end at the sill; the intermediate points follow steps and bends.
export const roads: Point[] = [
  {x:50,y:90},{x:50,y:76},{x:50,y:62},{x:41,y:59.5},{x:34.8,y:52},{x:33.7,y:40.3},
  {x:40.8,y:30.2},{x:50.2,y:27.5},{x:60.3,y:31.3},{x:65.4,y:39.7},{x:66,y:49.3},{x:59.8,y:59.5},
  {x:18.2,y:32.6},{x:50.2,y:22.8},{x:80.3,y:34.2},{x:70.4,y:68.8},{x:22.2,y:69.1},{x:50,y:50.6},
  {x:36.3,y:66.4},{x:50,y:55.6},{x:29.8,y:36.2},{x:21.4,y:35.6},
  {x:73.3,y:41.5},{x:77,y:39.6},{x:62,y:66.1},{x:66.4,y:70.1},{x:29.3,y:71}
];
export const roadEdges: [number,number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,2],
  [5,20],[20,21],[21,12],[7,13],[9,22],[22,23],[23,14],
  [11,24],[24,25],[25,15],[3,18],[18,26],[26,16],[2,19],[19,17],
];
export const doors=[12,13,14,15,16,17];
// Feet stand on the side terraces of the illustrated map, clear of doors and walking routes.
export const residents = [
  { name: '우체부', feet: { x: 11.6, y: 37.4 }, speech: '착, 닫혔지? 덮개 안쪽 자석이 몸체의 철판을 끌어당겨 붙잡아 줘. 덕분에 배달길에서도 편지를 지킬 수 있어!' },
  { name: '재료 연구원', feet: { x: 43.7, y: 24.9 }, speech: '같은 자석을 가까이 대고 반응을 비교했어! 철 클립은 붙고, 알루미늄과 나무는 붙지 않았지. 겉모습만 보고 골랐다면 어땠을까?' },
  { name: '시계탑 지기', feet: { x: 84.8, y: 43.2 }, speech: '기둥에 끼운 두 고리의 마주 보는 면을 보렴. 같은 극이면 밀어내 위 고리가 떠 있고, 다른 극이면 서로 붙는단다.' },
  { name: '수조 관리인', feet: { x: 76, y: 74.9 }, speech: '여기, 유리 양쪽에 자석이 하나씩 있지? 서로 끌어당겨서 바깥 손잡이를 옮기면 물속 패드도 따라와. 그 패드가 안쪽 얼룩을 닦아 주는 거야.' },
  { name: '발명가', feet: { x: 16.7, y: 77.2 }, speech: '좋아, 움직일 부품과 자석이 가까이 마주 보게 달아 봐! 철판은 자석에 끌려와. 자석끼리는 마주 보는 극에 따라 당기거나 밀지. 달았으면 꼭 움직여 시험해 보자!' },
] as const;

export function residentMarkers(s: Save): string {
  return residents.map(({name, feet}, stage) => {
    if (!districtRestored(s,stage)) return '';
    const greeted=s.greetedResidents?.includes(stage),label=`${name}${greeted?' 다시 대화하기':'에게 인사하기'}`;
    return `<button type="button" class="expedition-resident" data-resident="${stage}" data-greeted="${!!greeted}" style="left:${feet.x}%;top:${feet.y}%" aria-label="${label}" aria-haspopup="dialog" title="${label}"><img src="/assets/quest/resident-${stage + 1}.webp" alt="" draggable="false"><span class="resident-bubble" aria-hidden="true">${greeted?'···':'!'}</span></button>`;
  }).join('');
}
// Deliveries follow the lower stone road and turn around before either doorstep.
const courierNodes=[25,24,11,2,3,18,26,18,3,2,11,24,25];
export function courierPosition(phase:number):Point {
  const safe=Number.isFinite(phase)?Math.max(0,phase):0;
  const lengths=courierNodes.slice(1).map((node,i)=>Math.hypot(roads[node].x-roads[courierNodes[i]].x,(roads[node].y-roads[courierNodes[i]].y)*.5625));
  let remaining=(safe%10)/10*lengths.reduce((sum,length)=>sum+length,0);
  for(let i=0;i<lengths.length;i++){
    if(remaining>lengths[i]){remaining-=lengths[i];continue;}
    const from=roads[courierNodes[i]],to=roads[courierNodes[i+1]],fraction=remaining/lengths[i];
    return {x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction};
  }
  return {...roads[courierNodes[0]]};
}
const aspect=900/1600;
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,(a.y-b.y)*aspect);
export type WalkFacing = 'down' | 'left' | 'right' | 'up';
const facingRows: Record<WalkFacing, number> = { down: 0, left: 1, right: 2, up: 3 };
// Compare screen distances in the map's 16:9 coordinates, not raw percentages.
export function travelFacing(from:Point,to:Point,previous:WalkFacing='down'):WalkFacing {
  const dx=to.x-from.x,dy=(to.y-from.y)*.5625;
  if(Math.hypot(dx,dy)<.0001)return previous;
  return Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
}
function projectRoad(p:Point){
  let point=roads[0],edge=roadEdges[0],distance=Infinity;
  for(const pair of roadEdges){
    const a=roads[pair[0]],b=roads[pair[1]],dx=b.x-a.x,dy=(b.y-a.y)*aspect;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*aspect*dy)/(dx*dx+dy*dy)));
    const projected=t===1?b:{x:a.x+dx*t,y:a.y+(b.y-a.y)*t},gap=dist(p,projected);
    if(gap<distance){distance=gap;point=projected;edge=pair;}
  }
  return {point,edge,distance};
}
export function nearestRoad(p:Point):Point{return projectRoad(p).point;}
// The stones have room to step sideways. At an edge, slide along the paving.
function onPavement(p:Point):Point{
  const {point,distance}=projectRoad(p),halfWidth=1.8;
  if(distance<=halfWidth)return p;
  return {x:point.x+(p.x-point.x)*halfWidth/distance,y:point.y+(p.y-point.y)*halfWidth/distance};
}
export function walkRoad(start:Point,dir:Point,step:number):Point{
  const length=Math.hypot(dir.x,dir.y);
  if(!length)return start;
  return onPavement({x:start.x+step*dir.x/length,y:start.y+step*dir.y/(length*aspect)});
}
// 당이 walks the same stones a fixed distance behind 밀이, never beside the road.
export function trailPoint(trail:Point[],gap:number):Point{
  let left=gap;
  for(let i=trail.length-1;i>0;i--){const a=trail[i],b=trail[i-1],d=dist(a,b);if(d>=left){const t=d?left/d:0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}left-=d;}
  return {...trail[0]};
}
export function roadRoute(start:Point,target:number|Point):Point[]{
  const destination=typeof target==='number'?roads[target]:onPavement(target);
  const from=projectRoad(start),to=projectRoad(destination);
  if(from.edge===to.edge)return [start,destination];
  const nodes=[...roads,from.point,to.point],first=roads.length,last=first+1;
  const edges=[...roadEdges,[first,from.edge[0]],[first,from.edge[1]],[last,to.edge[0]],[last,to.edge[1]]];
  const ds=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),queue=new Set(nodes.keys());ds[first]=0;
  while(queue.size){
    let u=-1;for(const i of queue)if(u<0||ds[i]<ds[u])u=i;
    if(u===last)break;
    queue.delete(u);
    for(const [a,b] of edges){
      const v=a===u?b:b===u?a:-1;
      if(!queue.has(v))continue;
      const d=ds[u]+dist(nodes[u],nodes[v]);
      if(d<ds[v]){ds[v]=d;prev[v]=u;}
    }
  }
  const path:Point[]=[destination];
  for(let i=last;i!==-1;i=prev[i])path.unshift(nodes[i]);
  return path.filter((p,i)=>i===0||dist(p,path[i-1])>.0001);
}
export function expeditionMarkup(s:Save,admin=false){
  const next=Math.min(5,s.evidence.length);
  return `<section class="quest-city"><div class="expedition-viewport" aria-label="길을 따라 걷는 자석 도시"><div class="expedition-world"><img class="expedition-map" src="/assets/quest/city-expedition.webp" alt="넓은 돌길로 이어진 우편국, 재료 연구소, 극의 탑, 수조, 공방, 중앙 광장" draggable="false">${aquariumOnMap(s)}${townLights(s)}${doors.map((node,i)=>{const p=roads[node],open=admin||i<=next,done=i<5&&districtRestored(s,i);return `<button class="expedition-building ${done?'restored':open?'available':'locked'} ${!admin&&i===next?'current':''}" data-place="${i}" style="left:${p.x}%;top:${p.y-11}%" aria-label="${i===5?'중앙 광장':stageNames[i]}${!admin&&i===next?' 현재 목적지':''}${done?' 복구 완료':open?' 입구로 걷기':' 잠김'}">${icon(done?'check':open?'map':'lock',20)}<span>${i===5?'중앙 광장':stageNames[i]}</span>${done?'<small>복구 완료</small>':admin?'<small>열림</small>':i===next?'<small>현재 목적지</small>':''}</button>`;}).join('')}${residentMarkers(s)}${courierOnMap(s)}<div class="expedition-player" aria-label="탐험가 밀이">${walkingMascot('mili',104)}</div><div class="expedition-npc" role="img" aria-label="길을 따라오는 당이">${walkingMascot('dangi',96)}</div></div></div><div class="expedition-map-tools"><button type="button" class="quest-icon" data-map-pan aria-pressed="false" aria-label="손으로 지도를 밀어 둘러봐요" title="손으로 지도 밀기">${icon('hand',27)}</button><button type="button" class="quest-icon" data-map-overview aria-pressed="false" aria-label="지도 전체 보기" title="지도 전체 보기">${icon('expand',27)}</button></div><div class="expedition-dpad" aria-label="도시에서 걷기">${[['0,-1','↑','위'],['-1,0','←','왼쪽'],['0,1','↓','아래'],['1,0','→','오른쪽']].map(([d,arrow,label])=>`<button data-dir="${d}" aria-label="${label}${label.endsWith('쪽')?'으':''}로 걷기">${arrow}</button>`).join('')}</div>${admin?'<div class="expedition-next quest-cta" role="status">모든 스테이지 열림 · 건물로 가 봐</div>':`<button class="expedition-next quest-cta" data-action="walk-next">${next===5?'중앙 광장으로':`${stageNames[next]} 입구로`}${icon('arrow',24)}</button>`}<div class="expedition-tool-display" aria-label="찾은 탐구 도구">${questRewards.slice(0,s.evidence.length).map(r=>`<span role="img" aria-label="${r.name}" title="${r.use}">${icon(r.icon,24)}<small>${r.name}</small></span>`).join('')}</div></section>`;
}
export interface ExpeditionHandle {goTo(i:number):void;welcomeResident(i:number):void;direction(x:number,y:number):void;pause(p:boolean):void;motion(p:boolean):void;destroy():void}
export function mountExpedition(root:HTMLElement, options:{save:Save;admin:boolean;onPosition:(p:Point)=>void;onArrive:(i:number)=>void;onResident:(i:number)=>void}):ExpeditionHandle{
  const viewport=root.querySelector<HTMLElement>('.expedition-viewport')!,world=root.querySelector<HTMLElement>('.expedition-world')!,player=root.querySelector<HTMLElement>('.expedition-player')!,npc=root.querySelector<HTMLElement>('.expedition-npc')!;
  const removeVillains=mountMapVillains(world,{key:'magnet-city:map-villains:v1',power:'자석 파동',reduced:!options.save.settings.motion,preview:options.admin,stages:residents.map((r,i)=>({name:stageNames[i],x:i===1?62:r.feet.x+6,y:i===1?24:r.feet.y+6,ready:districtRestored(options.save,i),token:options.save.evidence.find(e=>e.stage===i)?.date||'pending'})),sound:()=>playEffect('bump',options.save.settings)});
  const courier=root.querySelector<HTMLElement>('.expedition-courier');let courierPhase=0;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const drawCourier=(position:Point)=>{
    if(!courier)return;
    const ahead=courierPosition(courierPhase+.002);
    courier.style.left=`${position.x}%`;courier.style.top=`${position.y}%`;
    courier.style.setProperty('--cart-facing',ahead.x>=position.x?'-1':'1');
  };
  if(courier)drawCourier(courierPosition(0));
  let p=options.save.city.x<=100&&options.save.city.y<=100?onPavement(options.save.city):{...roads[0]},route:Point[]=[],dir={x:0,y:0},paused=false,raf=0,last=performance.now(),saveAt=0,doorLatch=-1;
  // Restoring at a doorway must never reopen it until the player leaves and crosses again.
  doors.forEach((node,i)=>{if(dist(p,roads[node])<4)doorLatch=i;});
  const npcGap=4.8,spawn=projectRoad(p),[a,b]=spawn.edge;
  const behind=dist(roads[a],p)>dist(roads[b],p)?roads[a]:roads[b];
  const trail:Point[]=[behind,spawn.point,{...p}];
  const walkers=[
    {element:player,sprite:player.querySelector<HTMLElement>('.map-mascot')!,position:{...p},facing:'down' as WalkFacing,distance:0},
    {element:npc,sprite:npc.querySelector<HTMLElement>('.map-mascot')!,position:trailPoint(trail,npcGap),facing:'down' as WalkFacing,distance:0},
  ];
  const drawWalker=(walker:typeof walkers[number],position:Point)=>{
    const distance=dist(walker.position,position),walking=!paused&&!document.hidden&&distance>.0001;
    if(distance<=.0001&&walker.element.dataset.walking==='false')return;
    if(walking){walker.facing=travelFacing(walker.position,position,walker.facing);walker.distance+=distance;}
    else walker.distance=0;
    // Travel drives the gait: stopping, a blocked path, or a modal cannot walk in place.
    const step=walking&&options.save.settings.motion?Math.floor(walker.distance/1.2)%4:1;
    walker.element.style.left=`${position.x}%`;walker.element.style.top=`${position.y}%`;
    walker.element.dataset.walking=String(walking);
    walker.sprite.style.setProperty('--facing',String(facingRows[walker.facing]));
    walker.sprite.style.setProperty('--step',String(step));
    walker.sprite.dataset.facing=walker.facing;walker.sprite.dataset.step=String(step);
    walker.position={...position};
  };
  const abort=new AbortController(),signal=abort.signal;let overview=false;
  let viewWidth=viewport.clientWidth,viewHeight=viewport.clientHeight,lastTransform='',lastScale=0;
  const viewportSize=new ResizeObserver(([entry])=>{viewWidth=entry.contentRect.width;viewHeight=entry.contentRect.height;draw();});
  // Dragging the map frees the camera; walking again hands it back to the explorer.
  const panButton=root.querySelector<HTMLButtonElement>('[data-map-pan]');let free=false,cam={x:0,y:0},drag:{id:number;x:number;y:number;camX:number;camY:number;moved:boolean}|null=null,swallowClick=false;
  const setFree=(value:boolean)=>{free=value;panButton?.setAttribute('aria-pressed',String(value));root.classList.toggle('map-free',value);};
  let returnView={free:false,cam:{x:0,y:0}};
  const setOverview=(value:boolean)=>{
    if(value===overview)return;
    if(value){returnView={free,cam:{...cam}};route=[];releaseDirections();}
    overview=value;
    const button=root.querySelector<HTMLButtonElement>('[data-map-overview]')!;
    const label=value?'이전 지도 보기':'지도 전체 보기';
    button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(value));
    if(!value)cam={...returnView.cam};
    setFree(!value&&returnView.free);root.classList.toggle('map-overview',value);
    draw();
  };
  panButton?.addEventListener('click',()=>{
    if(paused)return;
    if(overview)setOverview(false);
    else if(free){setFree(false);draw();return;}
    draw();const m=new DOMMatrix(getComputedStyle(world).transform);cam={x:m.e,y:m.f};
    route=[];releaseDirections();setFree(true);draw();
  },{signal});
  root.querySelector('[data-map-overview]')?.addEventListener('click',()=>{if(!paused)setOverview(!overview);},{signal});
  const draw=()=>{
    if(!viewWidth||!viewHeight)return;
    const shortLandscape=viewWidth>viewHeight&&viewHeight<=559;
    const top=shortLandscape?62:100,bottom=shortLandscape?72:110,available=Math.max(1,viewHeight-top-bottom);
    const scale=overview?Math.min(viewWidth/1600,available/900):Math.max(viewWidth/1600,viewHeight/900)*1.45;
    const ww=1600*scale,hh=900*scale;
    const tx=overview?(viewWidth-ww)/2:Math.max(viewWidth-ww,Math.min(0,free?cam.x:viewWidth/2-p.x/100*ww));
    const ty=overview?top+(available-hh)/2:Math.max(viewHeight-hh,Math.min(0,free?cam.y:viewHeight/2-p.y/100*hh));
    if(free)cam={x:tx,y:ty};
    const transform=`translate(${tx}px,${ty}px) scale(${scale})`;
    if(transform!==lastTransform){world.style.transform=transform;lastTransform=transform;}
    if(scale!==lastScale){world.style.setProperty('--map-scale',String(scale));lastScale=scale;}
    const follower=trailPoint(trail,npcGap);drawWalker(walkers[0],p);drawWalker(walkers[1],follower);
    player.style.zIndex=p.y>=follower.y?'7':'6';npc.style.zIndex=p.y>=follower.y?'6':'7';
  };
  viewportSize.observe(viewport);
  const held=new Map<string,Point>();
  function readDirection(){
    let x=0,y=0;for(const q of held.values()){x+=q.x;y+=q.y;}
    dir={x:Math.sign(x),y:Math.sign(y)};
  }
  function releaseDirections(){held.clear();readDirection();}
  function pressDirection(key:string,d:Point){
    if(paused||held.has(key))return;
    setFree(false);route=[];held.set(key,d);readDirection();
    // A quick tap can start and end between frames. Give it one visible step.
    p=walkRoad(p,dir,.55);
  }
  const goTo=(i:number)=>{if(i<0||i>5)return;setFree(false);releaseDirections();route=roadRoute(p,doors[i]);doorLatch=-1;};
  function frameResident(stage:number) {
    if(overview)return;
    draw();
    const frame=viewport.getBoundingClientRect(),map=world.getBoundingClientRect(),{feet}=residents[stage];
    const door=roads[doors[stage]];
    cam={x:frame.width/2-map.width*(feet.x+door.x)/200,y:frame.height*.44-map.height*feet.y/100};
    setFree(true);
    draw();
  }
  function welcomeResident(stage:number) {
    const button=root.querySelector<HTMLButtonElement>(`[data-resident="${stage}"]`);
    if(!button)return;
    button.classList.add('just-returned');
    root.querySelector(`[data-district-light="${stage}"]`)?.classList.add('newly-lit');
    button.querySelector('.resident-bubble')!.textContent='!';
    frameResident(stage);
    button.focus({preventScroll:true});
  }
  root.querySelectorAll<HTMLButtonElement>('[data-resident]').forEach(button=>{
    const stage=Number(button.dataset.resident);
    button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))frameResident(stage);},{signal});
    button.addEventListener('click',()=>{
      if(paused)return;
      route=[];releaseDirections();
      button.classList.remove('just-returned');
      button.focus({preventScroll:true});
      options.onResident(stage);
    },{signal});
  });
  root.querySelectorAll<HTMLElement>('[data-place]').forEach(b=>b.addEventListener('click',()=>goTo(Number(b.dataset.place)),{signal}));
  root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(b=>{
    const [x,y]=b.dataset.dir!.split(',').map(Number);
    b.addEventListener('pointerdown',e=>{if(e.button!==0)return;b.setPointerCapture(e.pointerId);pressDirection(String(e.pointerId),{x,y});},{signal});
    const release=(e:PointerEvent)=>{held.delete(String(e.pointerId));readDirection();};
    b.addEventListener('pointerup',release,{signal});b.addEventListener('pointercancel',release,{signal});b.addEventListener('lostpointercapture',release,{signal});
    b.addEventListener('click',e=>{if(e.detail===0&&!paused){setFree(false);route=[];p=walkRoad(p,{x,y},1.2);}},{signal});
  });
  const keyDirs:Record<string,Point>={ArrowUp:{x:0,y:-1},KeyW:{x:0,y:-1},ArrowDown:{x:0,y:1},KeyS:{x:0,y:1},ArrowLeft:{x:-1,y:0},KeyA:{x:-1,y:0},ArrowRight:{x:1,y:0},KeyD:{x:1,y:0}};
  window.addEventListener('keydown',e=>{if(paused||!keyDirs[e.code]||e.ctrlKey||e.metaKey||e.altKey||(e.target instanceof HTMLElement&&(e.target.isContentEditable||e.target.closest('dialog,[role="dialog"],input,textarea,select'))))return;e.preventDefault();if(!e.repeat)pressDirection(e.code,keyDirs[e.code]);},{signal});
  window.addEventListener('keyup',e=>{if(held.delete(e.code))readDirection();},{signal});window.addEventListener('blur',releaseDirections,{signal});
  viewport.addEventListener('pointerdown',e=>{if(paused||drag||!e.isPrimary||e.button!==0)return;swallowClick=false;if(overview)return;const m=new DOMMatrix(getComputedStyle(world).transform);drag={id:e.pointerId,x:e.clientX,y:e.clientY,camX:m.e,camY:m.f,moved:false};},{signal});
  viewport.addEventListener('pointermove',e=>{if(paused||!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<8)return;if(!drag.moved){drag.moved=true;route=[];releaseDirections();viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');setFree(true);}cam={x:drag.camX+dx,y:drag.camY+dy};},{signal});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>{if(!drag||drag.id!==(e as PointerEvent).pointerId)return;swallowClick=event==='pointerup'&&drag.moved;drag=null;viewport.classList.remove('is-dragging');},{signal});
  // A drag that ends over a building must not also walk there.
  viewport.addEventListener('click',e=>{if(swallowClick){swallowClick=false;e.stopPropagation();e.preventDefault();}},{signal,capture:true});
  viewport.addEventListener('click',e=>{if(paused||free||(e.target as HTMLElement).closest('button'))return;setFree(false);releaseDirections();const r=world.getBoundingClientRect(),q={x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};route=roadRoute(p,q);},{signal});
  const tick=(now:number)=>{const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(!paused&&!document.hidden){
    if(route.length){const q=route[0],d=dist(q,p),step=dt*12;if(d<=step){p=q;route.shift();}else{p={x:p.x+(q.x-p.x)*step/d,y:p.y+(q.y-p.y)*step/d};}}
    else if(dir.x||dir.y)p=walkRoad(p,dir,dt*12);
    const moving=dist(walkers[0].position,p)>.0001;
    if(courier&&options.save.settings.motion&&!reducedMotion.matches){courierPhase+=dt*.20;drawCourier(courierPosition(courierPhase));}
    if(moving){const last=trail[trail.length-1];if(dist(last,p)>.3){trail.push({...p});if(trail.length>80)trail.splice(0,trail.length-80);}}
    if(moving&&now-saveAt>700){options.onPosition(p);saveAt=now;}
    if(doorLatch>=0&&dist(p,roads[doors[doorLatch]])>5)doorLatch=-1;
    if(!route.length)for(let i=0;i<doors.length;i++)if(dist(p,roads[doors[i]])<1.5&&doorLatch!==i){doorLatch=i;options.onPosition(p);options.onArrive(i);break;}
  }draw();raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
  return{goTo,welcomeResident,direction(x,y){setFree(false);route=[];releaseDirections();dir={x,y};},pause(value){paused=value;releaseDirections();if(value){drag=null;swallowClick=false;viewport.classList.remove('is-dragging');}},motion(){},destroy(){removeVillains();cancelAnimationFrame(raf);viewportSize.disconnect();abort.abort();options.onPosition(p);}};
}
