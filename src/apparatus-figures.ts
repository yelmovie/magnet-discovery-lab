import type { Save } from './domain';
import { autoplaySpeed, autoplaySpeedMarkup, bindAutoplaySpeed } from './autoplay-controls';
import './apparatus-figures.css';
import {
  P, avg, board, boardTop, box, byDepth, castShadow, cross, cylX, dot, fill, hullInk,
  norm, pd, rod, setFigureView, shape, sub, toneI, vis,
  type Material, type Part, type Point3,
} from './vendor/colorfigures-geometry.mjs';

export type ApparatusFigure = 'mailbox' | 'aquarium';
export const apparatusFigure = (screen: number): ApparatusFigure | undefined =>
  screen === 1 || screen === 2 ? 'mailbox' : screen === 7 ? 'aquarium' : undefined;

const wood = { l:'#dcb68d', m:'#b88664', d:'#82573e' };
const darkWood = { l:'#b48662', m:'#96684b', d:'#6c4937' };
const trim = { l:'#76aaa4', m:'#4d827c', d:'#2c5c59' };
const brass = { l:'#f0cf8c', m:'#b79354', d:'#816039' };
const iron = { l:'#e4edf0', m:'#a8b8c0', d:'#627883' };
const red = { l:'#df7668', m:'#bc4d47', d:'#863636' };
const blue = { l:'#88bfd5', m:'#4989ae', d:'#345a7b' };
const paper = { l:'#f5edda', m:'#ddd3ba', d:'#af9f84' };
const felt = { l:'#dce9a4', m:'#b2c872', d:'#778c4e' };
const tankTravel = 42, padHalfWidth = 8, stainHalfWidth = 7.5;
const stainCenters = [32,0,-32];
type Sweep = { low: number; high: number };
type LatchCue = 'near' | 'latched';
const stainCleared = (y:number, sweep?:Sweep) =>
  !!sweep && sweep.low <= y-stainHalfWidth && sweep.high >= y+stainHalfWidth;
const at = (bounds: [Point3, Point3], svg: string): Part => ({ box:bounds, svg });
const block = (a: Point3, b: Point3, mat: Material, stroke = .9) => at([a,b],box(...a,...b,mat,toneI,stroke));
const bounds = (pts: Point3[]): [Point3, Point3] => [
  [Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.min(...pts.map(p=>p[2]))],
  [Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[2]))],
];
const trace = (pts: Point3[], color: string, w: number, opacity = 1) =>
  `<path d="${pd(pts,false)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="${opacity}"/>`;
const profile = (x: number, points: [number,number][]): Point3[] => points.map(([y,z])=>[x,y,z]);
const oval = (x:number,y:number,z:number,ry:number,rz:number) =>
  profile(x,Array.from({length:16},(_,i)=>[y+ry*Math.cos(i*Math.PI/8),z+rz*Math.sin(i*Math.PI/8)]));
const plinth = (depth: number, width: number, shadow: Point3[]) =>
  board(-depth,-width,depth,width,5,8,paper) +
  `<g opacity=".18">${castShadow(shadow,5,boardTop(-depth,-width,depth,width,5,8))}</g>`;
function badge(point: Point3, n: number, dx: number, dy: number) {
  const [x,y] = P(...point);
  return `<g class="apparatus-pin"><path d="M${x} ${y}l${dx} ${dy}" /><circle cx="${x}" cy="${y}" r="1.8"/><circle cx="${x+dx}" cy="${y+dy}" r="6.6"/><text x="${x+dx}" y="${y+dy}">${n}</text></g>`;
}

/* The lid pivots about the rear hinge. A magnet in its front underside meets a
   stationary iron strike on the front rim; the decorative handle is not the magnet.
   Parts: wood walls/base, rear hinge, hinged lid, handle and mounts, magnet, iron strike. */
function mailbox(angle: number, inside: boolean, cue?:LatchCue) {
  const a = angle*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
  const turn = ([u,y,z]: Point3): Point3 => [-29+u*c-z*s,y,49+u*s+z*c];
  const panel = (u0:number,y0:number,z0:number,u1:number,y1:number,z1:number,mat:Material) => {
    const v: Point3[] = [[u0,y0,z0],[u1,y0,z0],[u1,y1,z0],[u0,y1,z0],[u0,y0,z1],[u1,y0,z1],[u1,y1,z1],[u0,y1,z1]];
    const points = v.map(turn), center=avg(points);
    const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
    const svg=faces.map(ids=>{
      const pts=ids.map(i=>points[i]), n=norm(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])));
      const out:Point3=dot(n,sub(avg(pts),center))<0?[-n[0],-n[1],-n[2]]:n;
      return vis(out)?shape(pts,toneI(out,mat),.7):'';
    }).join('')+hullInk(points,1.5);
    return at(bounds(points),svg);
  };
  const walls: Part[] = [
    block([-31,-49,5],[33,49,10],trim),
    block([-30,-46,10],[30,46,15],darkWood),
    block([-31,-47,15],[-26,47,48],wood),
    block([-26,-47,15],[26,-43,48],wood),
    block([-26,43,15],[26,47,48],wood),
    block([26,-47,15],[31,47,45],wood),
    block([27,-49,16],[33,49,22],trim),
    block([-32,-49,44],[-25,49,48],trim),
    block([-26,-49,44],[26,-43,48],trim),
    block([-26,43,44],[26,49,48],trim),
    block([26,-49,44],[32,49,48],trim),
  ];
  const plaque = shape(profile(31.2,[[-21,25],[21,25],[21,40],[-21,40]]),'#ecc28d',.8)
    + shape(profile(31.4,[[-12,28],[12,28],[12,37],[-12,37]]),'#fff1d2',.65)
    + trace(profile(31.5,[[-12,37],[0,32],[12,37]]),'#725036',.8)
    + [-17,17].map(y=>shape(oval(31.4,y,32.5,1.05,1.05),'#805e3b',0)).join('');
  const timber = [26,30,36].map((z,i)=>trace([[31.1,-43,z],[31.1,-35,z+.5],[31.1,-25,z-.2]],'#8c5b45',.55,.65)
    +trace([[31.1,25,z],[31.1,32,z-.4],[31.1,43,z+.6]],'#8c5b45',.55,.65)
    +trace([[-24,47.15,z],[0,47.15,z+.45],[24,47.15,z-.5]],i===1?'#d0a884':'#925e46',.55,.6)).join('');
  const letter:Point3[]=[[-17,-25,15.2],[13,-20,15.2],[9,0,15.2],[-21,-5,15.2]];
  const letters=at(bounds(letter),shape(letter,'#fcf0d7',.65)
    +trace([letter[0],[-3,-11,15.25],letter[1]],'#ad7755',.72)
    +shape([[-10,-18,15.3],[-4,-17,15.3],[-5,-13,15.3],[-11,-14,15.3]],'#b35a49',.4));
  const hinge = at([[-33,-35,47],[-26,35,52]],rod([-30,-35,49],[-30,35,49],2.7,brass));
  const grain = [-36,-22,22,36].map((y,i)=>trace([
    turn([6,y,5.05]),turn([15,y-1,5.05]),turn([35,y+1,5.05]),turn([54,y-.5,5.05]),
  ],i%2?'#754f3c':'#f6d8aa',.55,.52)).join('');
  const lid = panel(0,-49,0,61,49,5,wood);
  lid.svg+=vis([-s,0,c])?grain:'';
  const handle1=panel(46,-15,5,53,-10,11,brass),handle2=panel(46,10,5,53,15,11,brass);
  const handle=panel(45,-15,10,54,15,14,darkWood);
  const magnet=panel(52,-10,-3,58,10,0,red);
  if(vis([s,0,-c]))magnet.svg+=trace([turn([53.3,-8,-3.05]),turn([53.3,8,-3.05])],'#f6a58f',.65);
  const strike=block([23,-10,45],[32.15,10,46],iron);
  strike.svg+=shape(profile(32.2,[[-10,41],[10,41],[10,46],[-10,46]]),'#b8c7ce',.65)
    +[-7,7].map(y=>shape(oval(32.3,y,43.2,.9,.9),'#596f75',0)).join('');
  const under=vis([s,0,-c]);
  const handleArt=byDepth([handle1,handle2,handle]);
  const lidArt=under?handleArt+lid.svg:lid.svg+handleArt;
  const shell=[...walls,letters,hinge,at([[31,-21,25],[31.6,21,40]],plaque),
    at([[-24,-43,26],[31.3,47.3,37]],timber)];
  const model=inside
    ? `<g opacity=".35">${byDepth([...shell,{...lid,svg:lidArt}])}</g>${byDepth([magnet,strike])}`
    : byDepth([...shell,{...lid,svg:under?lidArt+magnet.svg:magnet.svg+lidArt},strike]);
  const labels=inside
    ? badge(turn([55,0,-3]),1,-26,-18)+badge([32.2,0,43],2,29,6)
    : angle>46?badge(turn([55,0,-3]),1,-28,-9)+badge([32.2,0,43],2,26,4):'';
  const strikePoint:Point3=[26,0,46];
  const [lx,ly]=P(...strikePoint);
  const cueArt=cue==='near'&&inside
    ? `<g data-latch-cue="near">${fill(pd([turn([55,0,-3]),strikePoint],false),'none','stroke="#a16b2b" stroke-width="1.65" stroke-linecap="round" stroke-dasharray="1.5 2.2"')}</g>`
    :cue==='latched'? `<g data-latch-cue="latched"><circle cx="${lx}" cy="${ly}" r="7" fill="#ffd789" fill-opacity=".35" stroke="#ad7637" stroke-width="1.4"/><circle cx="${lx}" cy="${ly}" r="2" fill="#fff6cb" stroke="#ad7637" stroke-width=".65"/></g>`:'';
  return plinth(47,63,[[-31,-48,7],[32,-48,7],[32,48,7],[-31,48,7],turn([60,40,5])]) + model + cueArt + labels;
}

/* Glass tank: the outer hand grip houses a magnet, and the inner scrubbing pad
   houses its mate. Both slide along opposite faces of the same pane; pulling the
   grip away leaves the inner pad in place. Parts: glass panes, rim, water, grip,
   pad, felt, and stationary aquarium furnishings. */
function aquarium(outside: number, inner: number, away: number, side: boolean, sweep?:Sweep) {
  const tankY=55, glassX=36, z=46;
  const glassFront = profile(glassX,[[-tankY,14],[tankY,14],[tankY,79],[-tankY,79]]);
  const base=plinth(48,69,[[-38,-55,7],[38,-55,7],[38,55,7],[-38,55,7]]);
  const water = shape(profile(-34,[[-54,15],[54,15],[54,70],[-54,70]]),'#88b9b7',.55)
    + shape([[-34,54,15],[glassX,54,15],[glassX,54,70],[-34,54,70]],'#a0cdbe',.6)
    + shape([[-34,-54,15],[glassX,-54,15],[glassX,54,15],[-34,54,15]],'#d2c4a3',.6);
  const fish = (x:number,y:number,h:number,k:number,color:string) => {
    const points = (ps:[number,number][])=>profile(x,ps.map(([dy,dz])=>[y+dy*k,h+dz*k]));
    return shape(points([[-6,0],[-14,6],[-14,-6]]),color,.65)
      +shape(points([[-8,0],[-3,5],[4,6],[10,2],[11,0],[8,-4],[2,-6],[-5,-4]]),color,.65)
      +shape(oval(x+.1,y+6*k,h+1.4*k,.8*k,.8*k),'#233d40',0);
  };
  // Keep the pointed green leaves rooted in gravel at the back. The floating
  // brown spots are painted on the front pane, in the path of the cleaning pad.
  const foliage = [[-24,34,1],[-22,10,.72]].map(([x,y,k])=>{
    const project=(dy:number,z:number)=>P(x,y+dy*k,15+z*k).join(' ');
    const gravel=[[-5,-1,2.8],[2,3,3.2],[4,-4,2.3],[-2,5,1.75]].map(([dx,dy,r],i)=>
      shape(Array.from({length:12},(_,j):Point3=>[x+dx+r*Math.cos(j*Math.PI/6),y+dy+r*Math.sin(j*Math.PI/6),15.15]),i%2?'#b9a47b':'#dbc9a3',.36)).join('');
    const leaves=[[-14,19,'#3b8067'],[10,22,'#528e6f'],[-6,29,'#479473'],[4,27,'#69a576'],[15,14,'#5f9d7b']]
      .map(([dy,h,color])=>{
        const d=Number(dy), t=Number(h), start=project(0,1), tip=project(d,t);
        return `<path d="M${start} Q${project(d*.86+4,t*.45)} ${tip} Q${project(d*.36-4,t*.43)} ${start}Z" fill="${color}" stroke="#3b6957" stroke-width=".65"/>
          <path d="M${start} Q${project(d*.56,t*.47)} ${tip}" fill="none" stroke="#b4d4a1" stroke-width=".48" opacity=".85"/>`;
      }).join('');
    return `<g data-aquarium-plant>${gravel}${leaves}</g>`;
  }).join('');
  const fishAndPlants=foliage+fish(1,21,56,1.05,'#ed9e73')+fish(11,-34,57,.82,'#e5c586')+fish(12,-14,28,.72,'#d8917c');
  const waterTop = shape([[-34,-54,70],[glassX,-54,70],[glassX,54,70],[-34,54,70]],'#d0eee4',0)
    + trace([[-27,42,70],[-11,31,70],[8,39,70],[25,26,70]],'#f4fff8',1);
  const frame = [
    block([-40,-58,5],[40,58,13],trim),
    block([-39,-58,13],[-34,-53,80],brass),
    block([-39,53,13],[-34,58,80],brass),
    block([35,-58,13],[40,-53,80],brass),
    block([35,53,13],[40,58,80],brass),
    block([-39,-58,78],[-34,58,82],trim),
    block([-34,-58,78],[35,-53,82],trim),
    block([-34,53,78],[35,58,82],trim),
    block([35,-58,78],[40,58,82],trim),
  ];
  const panel = shape(glassFront,'#a0dce6',1);
  const shine = trace(profile(glassX+.2,[[36,74],[48,54]]),'#f1fbfb',2,.72)
    + trace(profile(glassX+.2,[[28,74],[40,54]]),'#f1fbfb',.8,.62);
  const sidePane = shape([[-34,-54,14],[glassX,-54,14],[glassX,-54,79],[-34,-54,79]],'#add9df',.6);
  const spots=stainCenters.map((y,i)=>{
    if(stainCleared(y,sweep))return '';
    const x=35.8, low=y-stainHalfWidth, high=y+stainHalfWidth;
    const parts=sweep
      ? [[low,Math.min(high,sweep.low)],[Math.max(low,sweep.high),high]].filter(([a,b])=>a<b)
      : [[low,high]];
    const path=parts.map(([a,b])=>pd(profile(x,[[a,z-7],[b,z-7],[b,z+7],[a,z+7]]))).join('');
    const id=`figure-stain-${i}`;
    const blot=profile(x,[[y-6.5,z-1],[y-6.9,z+2],[y-4.8,z+4.6],[y-1.6,z+5.7],[y+2.6,z+4.7],[y+5.5,z+5.4],[y+7,z+2.6],[y+6.2,z-.6],[y+3.4,z-4.3],[y-.2,z-5.5],[y-3.6,z-4.8]]);
    const speckles=[[-3,1.1,1.1],[.2,-2.3,.85],[3.2,2.7,1.3],[2,-.6,.65],[-2.6,-2,.64]].map(([dy,dz,r])=>
      shape(oval(x,y+dy,z+dz,r,r*.8),'#efc38b',0)).join('');
    return `<g data-aquarium-stain="${i}"><clipPath id="${id}"><path d="${path}"/></clipPath>
      <g clip-path="url(#${id})">${fill(pd(blot),'#a95c40','stroke="#fbdfb8" stroke-width="1.2" stroke-linejoin="round"')}${speckles}</g></g>`;
  }).join('');
  const pad = byDepth([
    block([27,inner-padHalfWidth,z-8],[33,inner+padHalfWidth,z+8],blue),
    block([33,inner-padHalfWidth,z-8],[36,inner+padHalfWidth,z+8],felt),
  ]);
  const dx=away*22, handleX=47+dx;
  const grip = box(36+dx,outside-8,z-8,41+dx,outside+8,z+8,red)
    + cylX(41+dx,handleX,outside,z,6,brass)
    + cylX(handleX,handleX+2,outside,z,4.4,trim);
  const [hx,hy]=P(handleX,outside,z);
  const handle=`<g data-figure-grab><circle cx="${hx}" cy="${hy}" r="15" fill="transparent"/>${grip}</g>`;
  const model=frame.slice(0,3).map(p=>p.svg).join('')+water+fishAndPlants
    + `<g opacity=".27">${waterTop}</g>`+pad
    + `<g opacity="${side?.15:.29}">${sidePane+panel}</g>`+shine+spots+byDepth(frame.slice(3))+handle;
  const labels=side
    ? badge([handleX,outside,z],1,19,11)+badge([glassX,-48,64],2,20,-7)+badge([30,inner,z],3,-19,-12)
    : '';
  return base+model+labels;
}

const copy = {
  mailbox: {
    title:'우편함 속 자석',
    guide:'덮개를 열고 자석과 철 걸쇠를 찾아봐.',
    model:'나무 우편함과 덮개 안쪽 자석, 철 걸쇠',
    labels:['덮개 안쪽 자석','몸체의 철 걸쇠'],
    controls:`<button type="button" class="btn primary" data-figure-action="lid">덮개 열기</button>
      <div class="apparatus-extra">
      <button type="button" class="btn apparatus-auto" data-figure-action="autoplay">자동재생</button>
      <button type="button" class="btn" data-figure-action="inside" aria-pressed="false">안쪽 보기</button></div>`,
  },
  aquarium: {
    title:'유리 너머 청소 장치',
    guide:'손잡이를 움직여 앞유리의 얼룩을 닦아 봐.',
    model:'유리를 사이에 두고 마주 보는 바깥 자석 손잡이와 안쪽 청소 패드',
    labels:['바깥 자석 손잡이','수조 유리','안쪽 청소 패드'],
    controls:`<div class="apparatus-arrows" role="group" aria-label="손잡이 움직이기">
      <button type="button" class="btn primary" data-figure-action="left">← 왼쪽</button>
      <button type="button" class="btn primary" data-figure-action="right">오른쪽 →</button>
      </div><div class="apparatus-extra">
      <button type="button" class="btn apparatus-auto" data-figure-action="autoplay">자동재생</button>
      <button type="button" class="btn" data-figure-action="detach" aria-pressed="false">자석 떼기</button>
      <button type="button" class="btn" data-figure-action="inside" aria-pressed="false">옆에서 보기</button></div>`,
  },
};

export function apparatusFigureTitle(kind: ApparatusFigure) { return copy[kind].title; }

export function apparatusFigureMarkup(kind: ApparatusFigure) {
  const text=copy[kind];
  return `<div class="apparatus-figure" data-apparatus-figure="${kind}">
    <header class="apparatus-heading"><small>장치 살펴보기</small><h2>${text.title}</h2></header>
    <div class="apparatus-layout">
      <div class="apparatus-stage"><svg class="apparatus-drawing" viewBox="-113 -140 226 194" role="img" aria-label="${text.model}"></svg></div>
      <div class="apparatus-panel">
        <p class="apparatus-prompt">${text.guide}</p>
        ${kind==='aquarium'?'<div class="apparatus-glass-key"><span><i class="glass-key-stain" aria-hidden="true"></i>유리의 얼룩</span><span><i class="glass-key-leaf" aria-hidden="true"></i>물속 수초</span></div>':''}
        <div class="apparatus-actions">${text.controls}</div>
        <p class="apparatus-note" role="status" aria-live="polite"></p>
      </div>
    </div>
    <footer class="apparatus-footer">
      <ul class="apparatus-key" aria-label="그림의 부품 번호" hidden>${text.labels.map((label,i)=>`<li><b>${i+1}</b>${label}</li>`).join('')}</ul>
      <button class="btn" type="button" data-action="modal-close">실험대로 돌아가기</button>
    </footer>
  </div>`;
}

export function bindApparatusFigure(root: HTMLElement, motion: boolean, settings: Save['settings']={sound:true,motion,nickname:''}, changed:()=>void=()=>{}) {
  const tank=root.dataset.apparatusFigure==='aquarium';
  const svg=root.querySelector<SVGSVGElement>('.apparatus-drawing')!;
  const note=root.querySelector<HTMLElement>('.apparatus-note')!;
  const legend=root.querySelector<HTMLElement>('.apparatus-key')!;
  const auto=root.querySelector<HTMLButtonElement>('[data-figure-action=autoplay]');
  if(auto){auto.hidden=settings.autoplay===false;if(settings.autoplay!==false)auto.insertAdjacentHTML('afterend',autoplaySpeedMarkup(settings));}
  const speedCleanup=bindAutoplaySpeed(root,settings,changed);
  const detach=root.querySelector<HTMLButtonElement>('[data-figure-action=detach]');
  const lidButton=root.querySelector<HTMLButtonElement>('[data-figure-action=lid]');
  const insideButton=root.querySelector<HTMLButtonElement>('[data-figure-action=inside]');
  const controls=new AbortController(), {signal}=controls;
  const reduce=()=>!motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initialYaw=tank?38:41;
  const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
  const mix=(from:number,to:number,t:number)=>from+(to-from)*t;
  let yaw=initialYaw, side=false, opened=false, angle=0;
  let latchCue:LatchCue|undefined;
  let hand=40, pad=40, separation=0, detached=false, raf=0;
  let sweep:Sweep|undefined, playing=false, autoTimer=0, replayReady=false;
  let drag: {id:number; x:number; initial:number; grip:boolean; scale:number} | undefined;

  function say(message: string) { if(note.textContent!==message) note.textContent=message; }
  const cleanCount=()=>stainCenters.filter(y=>stainCleared(y,sweep)).length;
  function updateAuto() {
    if(!auto)return;
    const label=playing?'멈추기':replayReady?'다시 보기':'자동재생';
    if(auto.textContent!==label)auto.textContent=label;
    auto.dataset.playing=String(playing);
  }
  function render() {
    setFigureView(side&&tank?62:yaw,tank?27:26);
    const top=tank?-138:-123-25*angle/65;
    svg.setAttribute('viewBox',`-113 ${top} 226 194`);
    svg.innerHTML=tank?aquarium(hand,pad,separation,side,sweep):mailbox(angle,side,latchCue);
    const showLegend=side||(!tank&&angle>46);
    legend.hidden=!showLegend;
  }
  function animate(step:(p:number)=>void, duration:number, end?:()=>void) {
    cancelAnimationFrame(raf);
    if(reduce()){ step(1); render(); end?.(); return; }
    let previous=performance.now(),elapsed=0;
    const tick=(now:number)=>{
      elapsed+=(now-previous)*(playing?autoplaySpeed(settings):1);previous=now;
      const p=clamp(elapsed/duration,0,1);
      step(p*p*(3-2*p));render();
      if(p<1)raf=requestAnimationFrame(tick);
      else{raf=0;end?.();}
    };
    raf=requestAnimationFrame(tick);
  }
  function updateHand(value:number) {
    hand=clamp(value,-tankTravel,tankTravel);
    if(!detached) {
      const from=pad; pad=hand;
      if(Math.abs(from-pad)>1e-6) {
        const low=Math.min(from,pad)-padHalfWidth, high=Math.max(from,pad)+padHalfWidth;
        sweep={low:Math.min(low,sweep?.low??low),high:Math.max(high,sweep?.high??high)};
      }
    }
  }
  function describeTank() {
    const count=cleanCount();
    replayReady=count===stainCenters.length;
    updateAuto();
    say(detached?'손잡이만 움직여. 안쪽 패드는 멈춰 있어.'
      :replayReady?'얼룩 3곳을 모두 닦았어!'
      :`얼룩 ${count} / 3 · 패드가 지나간 곳이 깨끗해져.`);
  }
  function stopAuto() {
    if(!playing)return;
    playing=false;
    clearTimeout(autoTimer);
    cancelAnimationFrame(raf);raf=0;
    updateAuto();
  }
  function attachForMove() {
    if(raf){cancelAnimationFrame(raf);raf=0;}
    separation=detached?1:0;
    if(!detached)hand=pad;
  }
  function setDetached(value:boolean) {
    detached=value;
    detach?.setAttribute('aria-pressed',String(value));
    if(detach)detach.textContent=value?'다시 붙이기':'자석 떼기';
    detach?.setAttribute('aria-label',value?'자석 다시 붙이기':'자석 떼기');
  }
  function setLid(value:boolean) {
    opened=value;
    if(lidButton)lidButton.textContent=value?'덮개 닫기':'덮개 열기';
  }
  function setInside(value:boolean) {
    side=value;
    if(insideButton){
      insideButton.setAttribute('aria-pressed',String(value));
      insideButton.textContent=value?'겉모습 보기':tank?'옆에서 보기':'안쪽 보기';
    }
  }
  function startMailboxAuto() {
    playing=true;replayReady=false;latchCue=undefined;
    setInside(false);setLid(true);updateAuto();
    say('1 / 3 · 덮개를 열고 빨간 자석을 찾아봐.');
    const from=angle;
    animate(p=>{angle=mix(from,65,p);},600,()=>{
      autoTimer=window.setTimeout(()=>{
        setInside(true);
        say('2 / 3 · 덮개를 내리면 자석이 철 걸쇠에 가까워져.');
        animate(p=>{angle=mix(65,9,p);latchCue=angle<=18?'near':undefined;},780,()=>{
          autoTimer=window.setTimeout(()=>{
            setLid(false);
            animate(p=>{angle=mix(9,0,p);},220,()=>{
              latchCue='latched';
              playing=false;replayReady=true;updateAuto();render();
              say('3 / 3 · 착! 자석이 철 걸쇠를 붙잡았어.');
            });
          },650/autoplaySpeed(settings));
        });
      },1050/autoplaySpeed(settings));
    });
  }
  function startTankAuto() {
    if(drag)return;
    attachForMove();
    if(replayReady){
      hand=pad=tankTravel;sweep=undefined;
      replayReady=false;
    }
    playing=true;updateAuto();
    const visitLeft=!sweep || sweep.high < stainCenters[0]+stainHalfWidth;
    const waypoints = [
      ...(visitLeft ? [tankTravel] : []),
      ...[20,-12,-tankTravel].filter(y=>y<(visitLeft?tankTravel:pad)),
    ];
    const next=()=>{
      if(!playing)return;
      const to=waypoints.shift();
      if(to===undefined){playing=false;describeTank();return;}
      const from=pad;
      animate(p=>updateHand(mix(from,to,p)),Math.max(160,Math.abs(to-from)*31),()=>{
        if(cleanCount()===stainCenters.length)playing=false;
        describeTank();
        if(playing)autoTimer=window.setTimeout(next,(reduce()?380:140)/autoplaySpeed(settings));
      });
    };
    const begin=()=>{render();say('자동재생 중 · 안쪽 패드를 살펴봐.');autoTimer=window.setTimeout(next,320/autoplaySpeed(settings));};
    if(detached){
      say('먼저 손잡이를 패드 가까이 붙여.');
      const start=hand;
      animate(p=>{
        hand=mix(start,pad,clamp(p/.6,0,1));
        separation=1-clamp((p-.4)/.6,0,1);
      },470,()=>{setDetached(false);begin();});
    }else begin();
  }
  root.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('[data-figure-action]');
    if(!button)return;
    switch(button.dataset.figureAction){
      case 'lid': {
        if(playing){stopAuto();setLid(angle>1);}
        setLid(!opened);
        replayReady=false;latchCue=undefined;updateAuto();
        const from=angle;
        const open=opened;
        say(open?'덮개 안쪽에 자석이 있고 몸체에는 철 걸쇠가 있어.':'자석과 철 걸쇠가 가까워지고 있어.');
        animate(p=>{angle=mix(from,open?65:0,p);},440,()=>{
          if(!open){latchCue='latched';render();say('착! 자석이 철 걸쇠를 붙잡았어.');}
        });
        break;
      }
      case 'inside': {
        if(!tank&&playing){stopAuto();setLid(angle>1);}
        setInside(!side);
        if(tank){if(!playing)say(side?'유리를 사이에 두고 두 부품이 마주 보고 있어.':'손잡이를 움직여 안쪽 패드도 따라오는지 봐.');}
        else say(side?'① 덮개의 자석과 ② 몸체의 철 걸쇠를 찾아봐.':'덮개를 열고 두 부품을 찾아봐.');
        render();
        break;
      }
      case 'autoplay': {
        if(settings.autoplay===false)return;
        if(playing){
          stopAuto();
          if(tank){attachForMove();say(`자동재생을 멈췄어. 얼룩 ${cleanCount()} / 3`);}
          else {setLid(angle>1);say('자동재생을 멈췄어. 덮개를 직접 움직여 봐.');}
          render();
        }else if(tank)startTankAuto();
        else startMailboxAuto();
        break;
      }
      case 'detach': {
        if(playing){stopAuto();attachForMove();}
        setDetached(!detached);
        const startGap=separation, startHand=hand;
        animate(p=>{
          separation=mix(startGap,detached?1:0,detached?p:clamp((p-.4)/.6,0,1));
          if(!detached)hand=mix(startHand,pad,clamp(p/.6,0,1));
        },330);
        if(detached) describeTank();
        else say('손잡이를 패드 가까이 붙였어. 다시 함께 움직여.');
        break;
      }
      case 'left': case 'right': {
        stopAuto();attachForMove();
        const from=hand, to=clamp(hand+(button.dataset.figureAction==='left'?23:-23),-tankTravel,tankTravel);
        animate(p=>updateHand(mix(from,to,p)),230,describeTank);
        break;
      }
    }
  },{signal});

  svg.addEventListener('pointerdown',event=>{
    if(event.button!==0||drag)return;
    const grip=tank&&!!(event.target as Element).closest('[data-figure-grab]');
    if(!grip&&side)return;
    if(grip){stopAuto();attachForMove();}
    const frame=svg.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,initial:grip?hand:yaw,grip,scale:Math.min(frame.width/226,frame.height/194)};
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-dragging');
  },{signal});
  svg.addEventListener('pointermove',event=>{
    if(drag?.id!==event.pointerId)return;
    const delta=event.clientX-drag.x;
    if(drag.grip) {
      // The hand and pad move along the width axis of the pane (screen-right is -y).
      const widthProjection=Math.cos((side?62:yaw)*Math.PI/180)*Math.sqrt(1.5);
      updateHand(drag.initial-delta/(drag.scale*widthProjection));
      describeTank();
    } else yaw=clamp(drag.initial+delta*.33,24,66);
    render();
  },{signal});
  function release(event:PointerEvent) {
    if(drag?.id!==event.pointerId)return;
    drag=undefined;svg.classList.remove('is-dragging');
  }
  svg.addEventListener('pointerup',release,{signal});
  svg.addEventListener('pointercancel',release,{signal});
  svg.addEventListener('lostpointercapture',release,{signal});
  say(tank?'손잡이를 오른쪽으로 밀어 봐.':'덮개를 열면 안쪽을 볼 수 있어.');
  updateAuto();
  render();
  return ()=>{speedCleanup();controls.abort();cancelAnimationFrame(raf);clearTimeout(autoTimer);};
}
