import { icon, mascot } from './art';
import { questRewards } from './mission-content';
import { stageNames, type Point, type Save } from './domain';

// Hand surveyed against city-expedition.webp. Every edge follows a visible stone path.
export const roads: Point[] = [
  {x:50,y:88},{x:50,y:76},{x:50,y:66},{x:42,y:60},{x:35,y:52},{x:33,y:40},
  {x:43,y:32},{x:51,y:30},{x:62,y:34},{x:68,y:43},{x:67,y:53},{x:60,y:61},
  {x:18,y:34},{x:50,y:25},{x:80,y:40},{x:69,y:67},{x:23,y:66},{x:50,y:51},
  {x:29,y:61},{x:50,y:59}
];
export const roadEdges: [number,number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,2],[5,12],[7,13],[9,14],[11,15],[3,18],[18,16],[2,19],[19,17]];
export const doors=[12,13,14,15,16,17];
const courierNodes=[15,11,2,3,18,16,18,3,2,11,15];
export function courierPosition(phase:number):Point {
  const safe=Number.isFinite(phase)?Math.max(0,phase):0,segment=Math.floor(safe)%(courierNodes.length-1),fraction=safe%1;
  const from=roads[courierNodes[segment]],to=roads[courierNodes[segment+1]];
  return {x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction};
}
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,(a.y-b.y)*.5625);
export function nearestRoad(p:Point):Point{
  let best={...roads[0]},d=Infinity;
  for(const [a,b] of roadEdges){const u=roads[a],v=roads[b],dx=v.x-u.x,dy=(v.y-u.y)*.5625,t=Math.max(0,Math.min(1,((p.x-u.x)*dx+(p.y-u.y)*.5625*dy)/(dx*dx+dy*dy))),q={x:u.x+(v.x-u.x)*t,y:u.y+(v.y-u.y)*t};if(dist(p,q)<d){d=dist(p,q);best=q;}}
  return best;
}
// 당이 walks the same stones a fixed distance behind 밀이, never beside the road.
export function trailPoint(trail:Point[],gap:number):Point{
  let left=gap;
  for(let i=trail.length-1;i>0;i--){const a=trail[i],b=trail[i-1],d=dist(a,b);if(d>=left){const t=d?left/d:0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}left-=d;}
  return {...trail[0]};
}
export function roadRoute(start:Point,target:number):Point[]{
  let first=0;roads.forEach((p,i)=>{if(dist(start,p)<dist(start,roads[first]))first=i;});
  const ds=roads.map(()=>Infinity),prev=roads.map(()=>-1),queue=new Set(roads.map((_,i)=>i));ds[first]=0;
  while(queue.size){let u=-1;for(const i of queue)if(u<0||ds[i]<ds[u])u=i;if(u===target)break;queue.delete(u);for(const edge of roadEdges){const v=edge[0]===u?edge[1]:edge[1]===u?edge[0]:-1;if(v<0||!queue.has(v))continue;const nd=ds[u]+dist(roads[u],roads[v]);if(nd<ds[v]){ds[v]=nd;prev[v]=u;}}}
  const path=[target];while(path[0]!==first&&prev[path[0]]>=0)path.unshift(prev[path[0]]);return path.map(i=>({...roads[i]}));
}
export function expeditionMarkup(s:Save,admin=false){
  const next=Math.min(5,s.evidence.length);
  return `<section class="quest-city"><div class="expedition-viewport" aria-label="길을 따라 걷는 자석 도시"><div class="expedition-world"><img class="expedition-map" src="/assets/quest/city-expedition.webp" alt="넓은 돌길로 이어진 우편국, 재료 연구소, 극의 탑, 수조, 공방, 중앙 광장" draggable="false">${doors.map((node,i)=>{const p=roads[node],open=admin||i<=next,done=i<s.evidence.length;return `<button class="expedition-building ${done?'restored':open?'available':'locked'} ${i===next?'current':''}" data-place="${i}" style="left:${p.x}%;top:${p.y-11}%" aria-label="${i===5?'중앙 광장':stageNames[i]}${i===next?' 현재 목적지':''}${done?' 복구 완료':open?' 입구로 걷기':' 잠김'}">${icon(done?'check':open?'map':'lock',20)}<span>${i===5?'중앙 광장':stageNames[i]}</span>${done?'<small>복구 완료</small>':i===next?'<small>현재 목적지</small>':''}</button>`;}).join('')}${s.evidence.length>=4?'<img class="expedition-courier" src="/assets/quest/prop-cart.webp" alt="다시 움직이기 시작한 도시 택배">':''}<div class="expedition-player" aria-label="탐험가 밀이">${mascot('mili',70,0)}</div><div class="expedition-npc">${mascot('dangi',60,0)}</div>${s.evidence.length===5?'<div class="expedition-festival" aria-hidden="true">✦　✧　✦</div>':''}</div></div><div class="expedition-map-tools"><button type="button" class="quest-icon" data-map-pan aria-pressed="false" aria-label="손으로 지도를 밀어 둘러봐요" title="손으로 지도 밀기">${icon('hand',27)}</button><button type="button" class="quest-icon" data-map-overview aria-pressed="false" aria-label="지도 전체 보기" title="지도 전체 보기">${icon('expand',27)}</button></div><div class="expedition-dpad" aria-label="도시에서 걷기">${[['0,-1','↑','위'],['-1,0','←','왼쪽'],['0,1','↓','아래'],['1,0','→','오른쪽']].map(([d,arrow,label])=>`<button data-dir="${d}" aria-label="${label}${label.endsWith('쪽')?'으':''}로 걷기">${arrow}</button>`).join('')}</div><button class="expedition-next quest-cta" data-action="walk-next">${next===5?'중앙 광장으로':`${stageNames[next]} 입구로`}${icon('arrow',24)}</button><div class="expedition-tool-display" aria-label="찾은 탐구 도구">${questRewards.slice(0,s.evidence.length).map(r=>`<span role="img" aria-label="${r.name}" title="${r.use}">${icon(r.icon,24)}<small>${r.name}</small></span>`).join('')}</div></section>`;
}
export interface ExpeditionHandle {goTo(i:number):void;direction(x:number,y:number):void;pause(p:boolean):void;motion(p:boolean):void;destroy():void}
export function mountExpedition(root:HTMLElement, options:{save:Save;admin:boolean;onPosition:(p:Point)=>void;onArrive:(i:number)=>void}):ExpeditionHandle{
  const viewport=root.querySelector<HTMLElement>('.expedition-viewport')!,world=root.querySelector<HTMLElement>('.expedition-world')!,player=root.querySelector<HTMLElement>('.expedition-player')!,npc=root.querySelector<HTMLElement>('.expedition-npc')!;
  const courier=root.querySelector<HTMLElement>('.expedition-courier');let courierPhase=0;
  let p=options.save.city.x<=100&&options.save.city.y<=100?nearestRoad(options.save.city):{...roads[0]},route:Point[]=[],dir={x:0,y:0},paused=false,raf=0,last=performance.now(),saveAt=0,doorLatch=-1,goal=-1,frame=0;
  // Restoring at a doorway must never reopen it until the player leaves and crosses again.
  doors.forEach((node,i)=>{if(dist(p,roads[node])<4)doorLatch=i;});
  const npcGap=3.6;let trail:Point[]=[];
  {let k=0;roads.forEach((q,i)=>{if(dist(p,q)<dist(p,roads[k]))k=i;});const edge=roadEdges.find(e=>e.includes(k))!,j=edge[0]===k?edge[1]:edge[0];trail=roadRoute(roads[j],k).concat([{...p}]);trail.push({x:p.x-3.6,y:p.y},{...p});}
  const abort=new AbortController(),signal=abort.signal;let overview=false;
  // Dragging the map frees the camera; walking again hands it back to the explorer.
  const panButton=root.querySelector<HTMLButtonElement>('[data-map-pan]');let free=false,cam={x:0,y:0},drag:{id:number;x:number;y:number;camX:number;camY:number;moved:boolean}|null=null,swallowClick=false;
  const setFree=(value:boolean)=>{free=value;panButton?.setAttribute('aria-pressed',String(value));root.classList.toggle('map-free',value);};
  panButton?.addEventListener('click',()=>{if(free){setFree(false);return;}if(overview)root.querySelector<HTMLButtonElement>('[data-map-overview]')?.click();const m=new DOMMatrix(getComputedStyle(world).transform);cam={x:m.e,y:m.f};setFree(true);},{signal});
  root.querySelector('[data-map-overview]')?.addEventListener('click',e=>{overview=!overview;const button=e.currentTarget as HTMLButtonElement,label=overview?'탐험가 따라 보기':'지도 전체 보기';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(overview));setFree(false);root.classList.toggle('map-overview',overview);},{signal});
  const draw=()=>{const rect=viewport.getBoundingClientRect(),scale=overview?Math.min(rect.width/1600,(rect.height-210)/900):Math.max(rect.width/1600,rect.height/900)*1.45,ww=1600*scale,hh=900*scale,tx=overview?(rect.width-ww)/2:Math.max(rect.width-ww,Math.min(0,free?cam.x:rect.width/2-p.x/100*ww)),ty=overview?100+(rect.height-210-hh)/2:Math.max(rect.height-hh,Math.min(0,free?cam.y:rect.height/2-p.y/100*hh));if(free)cam={x:tx,y:ty};world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;world.style.setProperty('--map-scale',String(scale));player.style.left=`${p.x}%`;player.style.top=`${p.y}%`;const follower=trailPoint(trail,npcGap);npc.style.left=`${follower.x}%`;npc.style.top=`${follower.y}%`;const sprite=player.querySelector<HTMLElement>('.mascot');if(sprite)sprite.style.setProperty('--pose',String(frame));};
  const goTo=(i:number)=>{if(i<0||i>5)return;setFree(false);goal=i;dir={x:0,y:0};route=roadRoute(p,doors[i]);doorLatch=-1;};
  root.querySelectorAll<HTMLElement>('[data-place]').forEach(b=>b.addEventListener('click',()=>goTo(Number(b.dataset.place)),{signal}));
  root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(b=>{const[x,y]=b.dataset.dir!.split(',').map(Number);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);setFree(false);route=[];dir={x,y};},{signal});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{dir={x:0,y:0};},{signal});});
  const keyDirs:Record<string,Point>={ArrowUp:{x:0,y:-1},KeyW:{x:0,y:-1},ArrowDown:{x:0,y:1},KeyS:{x:0,y:1},ArrowLeft:{x:-1,y:0},KeyA:{x:-1,y:0},ArrowRight:{x:1,y:0},KeyD:{x:1,y:0}};
  window.addEventListener('keydown',e=>{if(paused||!keyDirs[e.code]||(e.target instanceof HTMLElement&&e.target.closest('dialog,input,textarea,button')))return;e.preventDefault();setFree(false);route=[];dir=keyDirs[e.code];},{signal});
  window.addEventListener('keyup',e=>{if(keyDirs[e.code])dir={x:0,y:0};},{signal});window.addEventListener('blur',()=>{dir={x:0,y:0};},{signal});
  viewport.addEventListener('pointerdown',e=>{if(overview||e.button!==0)return;const m=new DOMMatrix(getComputedStyle(world).transform);drag={id:e.pointerId,x:e.clientX,y:e.clientY,camX:m.e,camY:m.f,moved:false};},{signal});
  viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<8)return;if(!drag.moved){drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');setFree(true);}cam={x:drag.camX+dx,y:drag.camY+dy};},{signal});
  for(const event of ['pointerup','pointercancel'])viewport.addEventListener(event,e=>{if(!drag||drag.id!==(e as PointerEvent).pointerId)return;swallowClick=drag.moved;drag=null;viewport.classList.remove('is-dragging');},{signal});
  // A drag that ends over a building must not also walk there.
  viewport.addEventListener('click',e=>{if(swallowClick){swallowClick=false;e.stopPropagation();e.preventDefault();}},{signal,capture:true});
  viewport.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button'))return;setFree(false);const r=world.getBoundingClientRect(),q={x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};let closest=0;roads.forEach((p,i)=>{if(dist(q,p)<dist(q,roads[closest]))closest=i;});goal=-1;route=roadRoute(p,closest);},{signal});
  const tick=(now:number)=>{const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(!paused&&!document.hidden){let moving=false;
    if(route.length){const q=route[0],d=dist(q,p),step=dt*12;if(d<step){p=q;route.shift();}else{p={x:p.x+(q.x-p.x)*step/d,y:p.y+(q.y-p.y)*step/d};}moving=true;}
    else if(dir.x||dir.y){const candidate={x:p.x+dir.x*dt*12,y:p.y+dir.y*dt*20},q=nearestRoad(candidate);if(dist(candidate,q)<2.8){p=q;moving=true;}}
    if(courier&&options.save.settings.motion){courierPhase+=dt*.28;const position=courierPosition(courierPhase);courier.style.left=`${position.x}%`;courier.style.top=`${position.y}%`;}
    frame=moving&&options.save.settings.motion?Math.floor(now/180)%2:0;
    if(moving){const last=trail[trail.length-1];if(dist(last,p)>.3){trail.push({...p});if(trail.length>80)trail.splice(0,trail.length-80);}}
    if(moving&&now-saveAt>700){options.onPosition(p);saveAt=now;}
    if(doorLatch>=0&&dist(p,roads[doors[doorLatch]])>5)doorLatch=-1;
    for(let i=0;i<doors.length;i++)if(dist(p,roads[doors[i]])<1.6&&doorLatch!==i&&(!route.length||goal===i)){doorLatch=i;route=[];options.onPosition(p);options.onArrive(i);break;}
  }draw();raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
  return{goTo,direction(x,y){route=[];dir={x,y};},pause(value){paused=value;dir={x:0,y:0};},motion(){},destroy(){cancelAnimationFrame(raf);abort.abort();options.onPosition(p);}};
}
