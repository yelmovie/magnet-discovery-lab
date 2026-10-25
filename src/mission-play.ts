import { emptyActivity, materials, opposite, record, type Activity, type Point, type Pole, type Save } from './domain';
import type { Context, View } from './activity-types';
import { bindDrag, placementControls } from './manipulation';
import { addTrial, trialOutcome, type TrialObject } from './trial-records';
import { assemblyAligned, assemblyIssue, distance, magneticReach, ringFloating } from './mission-model';
import { missionGuides, missionQuestions, questRewards } from './mission-content';
import { ensureAudio, playEffect } from './game-audio';

const W = 1280, H = 720;
const pt = (x: number, y: number): Point => ({ x, y });
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const themes = ['life', 'material', 'poles', 'remote', 'workshop'];
const sprites = new Map<string, HTMLImageElement>();
const equipmentFrames = {
  ringN: [32,87,453,324], ringS: [545,86,452,325], plate: [1064,83,439,328],
  pad: [33,561,466,366], key: [544,512,465,430], stand: [1146,467,300,505],
} as const;
const e = (x: unknown) => String(x).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
type Hit = { id: string; p: Point; label: string; kind?: string };

/** One shared physical surface: canvas supplies the science model, DOM supplies focus and touch targets. */
class Surface {
  ctx: CanvasRenderingContext2D;
  cleanups: (() => void)[] = [];
  stopped = false;
  path: Point[] = [];
  feedback = '';
  animating = false;
  watchedImages = new Set<HTMLImageElement>();
  constructor(public c: Context, public n: number) {
    const canvas=c.root.querySelector('canvas')!,ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=W*ratio;canvas.height=H*ratio;this.ctx=canvas.getContext('2d')!;this.ctx.scale(ratio,ratio);
    const resize=()=>this.draw();window.addEventListener('resize',resize);this.cleanups.push(()=>window.removeEventListener('resize',resize));void document.fonts.ready.then(()=>{if(!this.stopped)this.draw();});
    const controller=new AbortController();c.root.addEventListener('pointerdown',event=>{if((event.target as HTMLElement).closest('button')){ensureAudio(c.s.settings);playEffect('pick',c.s.settings);}},{signal:controller.signal});c.root.addEventListener('click',event=>{if((event.target as HTMLElement).closest('[data-mission]'))playEffect('click',c.s.settings);},{signal:controller.signal});this.cleanups.push(()=>controller.abort());
  }
  get a() { return this.c.a; }
  get s() { return this.c.s; }
  p(id: string, fallback: Point) { return this.a.points[id] ||= { ...fallback }; }
  set(id: string, p: Point) { this.a.points[id] = { ...p }; const el = this.c.root.querySelector<HTMLElement>(`[data-drag="${id}"], [data-object="${id}"]`); if (el) { el.style.left = `${p.x}%`; el.style.top = `${p.y}%`; } }
  has(key: string) { return this.a.values[key] === true; }
  mark(key: string, label: string, result: string) { this.a.values[key] = true; record(this.a, { key, label, result }); this.c.touch(); this.c.meta(); }
  tell(text: string, success = false) {
    if(this.feedback===text&&!success)return;
    this.feedback = text;
    const out = this.c.root.querySelector<HTMLElement>('.mission-feedback'); if (out) { out.textContent = text; out.classList.toggle('success', success); }
    this.c.root.closest('.quest-activity')?.dispatchEvent(new Event('coach-update'));
    if(success)playEffect('success',this.s.settings);
  }
  proof(key: string, label: string, outcome = 'success', extra: Record<string, string | number | boolean> = {}) {
    const objects = Object.entries(this.a.points).filter(([id]) => !id.startsWith('initial:')).map(([id, p]) => ({ id, ...p }));
    const trial=addTrial(this.a, { key, activity: this.n, conditions: { label, ...extra }, initialObjects: Object.entries(this.a.points).filter(([id]) => id.startsWith('initial:')).map(([id, p]) => ({ id: id.slice(8), ...p })), objects, input: this.path, outcome, designRevision: this.s.design.revision, template: this.s.design.template, pinned: true });
    record(this.a, { key, label, result: trialOutcome(outcome) }); this.c.touch(); this.c.meta(); this.path = [];return trial;
  }
  button(id: string, fn: () => void) { this.c.root.querySelector(`[data-mission="${id}"]`)?.addEventListener('click', fn); }
  drag(id: string, fallback: Point, end: (p: Point) => void, move?: (p: Point) => void, constrain?: (p: Point) => Point) {
    const start = constrain ? constrain(this.p(id, fallback)) : this.p(id, fallback); this.set(id,start); this.cleanups.push(bindDrag(this.c, id, start, p => { this.set(id, p); playEffect('drop',this.s.settings); end(p); this.c.touch(); this.c.meta(); }, p => {
      this.set(id, p); if (this.path.length < 240 && (!this.path.length || distance(p, this.path[this.path.length - 1]) > 1)) this.path.push({ ...p }); move?.(p); this.draw();
    }, constrain));
  }
  refresh() { this.c.touch(); this.c.refresh(); }
  settle(targets: Record<string,Point>, finish: () => void) {
    if(this.animating)return;
    if(!this.s.settings.motion){Object.entries(targets).forEach(([id,p])=>this.set(id,p));this.draw();finish();return;}
    this.animating=true;
    const starts=Object.fromEntries(Object.keys(targets).map(id=>[id,{...this.a.points[id]}]));
    let raf=0,elapsed=0,previous=performance.now();this.c.root.inert=true;
    const frame=(now:number)=>{
      if(this.stopped)return;
      const dt=Math.min(50,now-previous);previous=now;
      if(!document.hidden&&!document.querySelector('dialog[open],.modal-backdrop'))elapsed+=dt;
      const t=Math.min(1,elapsed/650),k=1-Math.pow(1-t,3);
      Object.entries(targets).forEach(([id,p])=>this.set(id,pt(starts[id].x+(p.x-starts[id].x)*k,starts[id].y+(p.y-starts[id].y)*k)));this.draw();
      if(t<1)raf=requestAnimationFrame(frame);else{this.c.root.inert=false;this.animating=false;finish();}
    };
    raf=requestAnimationFrame(frame);this.cleanups.push(()=>{cancelAnimationFrame(raf);this.c.root.inert=false;this.animating=false;});
  }
  draw = () => {};
  base() {
    this.ctx.clearRect(0, 0, W, H);
    // A visible manipulation trail makes the student's route observable, including remote control.
    if([3,7,8].includes(this.n)&&this.path.length>1){const g=this.ctx;g.save();g.strokeStyle='#397f7b80';g.lineWidth=5;g.setLineDash([6,10]);g.beginPath();this.path.forEach((p,i)=>i?g.lineTo(p.x*W/100,p.y*H/100):g.moveTo(p.x*W/100,p.y*H/100));g.stroke();g.restore();}
    const sensor=this.c.root.querySelector<HTMLElement>('.force-sensor');
    if(sensor){
      let d=100;
      if(this.n===3){const m=this.a.points['sweep-magnet']||pt(20,39);d=Math.min(...materialPositions.map((p,i)=>this.has(`delivered-${materials[i].id}`)?100:distance(m,this.a.points[`material-${i}`]||p)));}
      if(this.n===4)d=distance(this.a.points['distance-magnet']||pt(25,55),Number(this.a.values.round)===3?pt(69,42):pt(61,55));
      if(this.n===7)d=distance(this.a.points.cleaner||pt(27,47),this.a.points['inner-pad']||pt(29,48));
      if(this.n===8)d=distance(this.a.points.controller||pt(20,40),pt(Number(this.a.values.car??27),59));
      const level=Math.max(0,Math.min(100,(22-d)/22*100));
      sensor.style.setProperty('--sensor-level',`${level}%`);const text=sensor.querySelector('span');if(text)text.textContent=d<15?'가까운 배치':d<23?'조금 더 가까이':'멀리 떨어진 배치';
    }
  }
  asset(name:string,src:string):HTMLImageElement {
    let img=sprites.get(name);
    if(!img){img=new Image();sprites.set(name,img);img.src=src;}
    if(!img.complete&&!this.watchedImages.has(img)){
      this.watchedImages.add(img);
      const redraw=()=>{if(!this.stopped)this.draw();};
      img.addEventListener('load',redraw,{once:true});
      this.cleanups.push(()=>img!.removeEventListener('load',redraw));
    }
    return img;
  }
  sprite(name:string,x:number,y:number,w:number,h:number):boolean {
    const img=this.asset(name,`/assets/quest/prop-${name}.webp`);
    if(!img.complete||!img.naturalWidth)return false;this.ctx.drawImage(img,x,y,w,h);return true;
  }
  equipment(name:keyof typeof equipmentFrames,p:Point,width:number,height:number):boolean {
    const img=this.asset('science-equipment','/assets/quest/science-equipment.webp');
    if(!img.complete||!img.naturalWidth)return false;
    const [sx,sy,sw,sh]=equipmentFrames[name],scale=Math.min(width/sw,height/sh),w=sw*scale,h=sh*scale;
    this.ctx.drawImage(img,sx,sy,sw,sh,p.x*W/100-w/2,p.y*H/100-h/2,w,h);
    return true;
  }
  material(index:number,p:Point,size=92) {
    const img=this.asset('material-kit','/assets/quest/material-kit.webp');
    if(img.complete&&img.naturalWidth){const cw=img.naturalWidth/3,ch=img.naturalHeight/2;this.ctx.drawImage(img,(index%3)*cw,Math.floor(index/3)*ch,cw,ch,p.x*W/100-size/2,p.y*H/100-size/2,size,size);}
    else this.iron(p,'',size*.65);
    this.label(materials[index].name,pt(p.x,p.y+8),true);
  }
  label(text: string, p: Point, small = false, color = '#203e40') {
    // The inquiry header already gives this instruction and progress count.
    if(this.a.values.inquiryVersion===1&&p.x===50&&(p.y===26||p.y===29))return;
    const g = this.ctx,scale=this.c.root.querySelector('canvas')!.getBoundingClientRect().width/W,font=Math.max(small?20:26,(small?16:20)/Math.max(.5,scale));g.save(); g.font = `${small?'600':'700'} ${font}px "Magnet Quest Sans", Pretendard, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 7; g.strokeStyle = '#fff8e4ed'; g.strokeText(text, p.x / 100 * W, p.y / 100 * H); g.fillStyle = color; g.fillText(text, p.x / 100 * W, p.y / 100 * H); g.restore();
  }
  target(p: Point, name: string, w = 130, h = 90) {
    const g = this.ctx, x = p.x / 100 * W, y = p.y / 100 * H; g.save(); g.setLineDash([9, 8]); g.strokeStyle = '#2d7f71'; g.lineWidth = 3;
    g.fillStyle = '#fff9e77a'; g.beginPath(); g.roundRect(x-w/2, y-h/2, w, h, 18); g.fill(); g.stroke(); g.restore(); if (name) this.label(name, pt(p.x, p.y + h / H * 50 + 3), true);
  }
  arrow(from: Point, to: Point, color = '#2c8b7a') {
    const g = this.ctx, x = from.x * W / 100, y = from.y * H / 100, tx = to.x * W / 100, ty = to.y * H / 100, a = Math.atan2(ty-y, tx-x);
    g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 5; g.beginPath(); g.moveTo(x,y); g.lineTo(tx,ty); g.stroke(); g.beginPath(); g.moveTo(tx,ty); g.lineTo(tx-17*Math.cos(a-.5),ty-17*Math.sin(a-.5)); g.lineTo(tx-17*Math.cos(a+.5),ty-17*Math.sin(a+.5)); g.closePath(); g.fill(); g.restore();
  }
  magnet(p: Point, left: Pole = 'N', scale = 1) {
    const g = this.ctx; g.save(); g.translate(p.x*W/100,p.y*H/100); g.scale(scale,scale); g.shadowColor='#233b3644';g.shadowBlur=8;g.shadowOffsetY=5;
    const img=this.asset('magnet-bar','/assets/quest/magnet-bar.webp');
    if(img.complete&&img.naturalWidth){g.save();if(left==='S')g.scale(-1,1);g.drawImage(img,60,370,1420,285,-75,-28,150,56);g.restore();}
    else {g.fillStyle = left === 'N' ? '#d94c42' : '#3d83b4';g.beginPath();g.roundRect(-70,-27,140,54,10);g.fill();g.fillStyle=left==='N'?'#3d83b4':'#d94c42';g.fillRect(0,-27,64,54);g.strokeStyle='#243b46';g.lineWidth=3;g.beginPath();g.roundRect(-70,-27,140,54,10);g.stroke();}g.shadowBlur=0;g.shadowOffsetY=0;
    g.fillStyle='#fff6df';g.font='bold 25px "Magnet Quest Sans",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(left,-35,1);g.fillText(opposite(left),35,1);g.fillStyle='#ffffff3a';g.fillRect(-60,-21,120,5);g.restore();
  }
  iron(p: Point, name = '철', size = 55) {
    if(!this.equipment('plate',p,size*1.4,size)){
      const g=this.ctx,x=p.x*W/100,y=p.y*H/100;g.save();g.shadowColor='#263e3d40';g.shadowBlur=5;g.shadowOffsetY=4;
      const grad=g.createLinearGradient(x-size,y-size,x+size,y+size);grad.addColorStop(0,'#e1e9e7');grad.addColorStop(.5,'#92a9ac');grad.addColorStop(1,'#526c73');g.fillStyle=grad;g.strokeStyle='#4c6970';g.lineWidth=3;g.beginPath();g.roundRect(x-size/2,y-size/2,size,size*.8,8);g.fill();g.stroke();g.restore();
    }
    if(name)this.label(name,pt(p.x,p.y+size/H*50+3),true);
  }
  fixture(index: number, closed: boolean, installed: boolean, showIron = true) {
    const g=this.ctx,cx=640,cy=430;g.save();g.lineWidth=5;g.strokeStyle='#644c30';
    const illustrated=sprites.get('postal-box')?.complete && sprites.get('postal-box')?.naturalWidth;
    if(!illustrated){
    const grad=g.createLinearGradient(0,330,0,550);grad.addColorStop(0,index?'#5b8e7c':'#c4774c');grad.addColorStop(1,index?'#315d56':'#8c422e');g.fillStyle=grad;
    g.beginPath();g.roundRect(cx-215,cy-35,430,150,16);g.fill();g.stroke();g.fillStyle='#3d3f36';g.fillRect(cx-190,cy-10,380,80);
    g.save();g.translate(cx,closed?cy-14:cy-115);g.fillStyle=index?'#76aa8c':'#e3a868';g.beginPath();g.roundRect(-215,-30,430,closed?135:55,12);g.fill();g.stroke();g.fillStyle='#e6c78d';g.beginPath();g.roundRect(-36,closed?34:-12,72,18,7);g.fill();g.restore();
    }
    // Generated illustrated body and hinged lid are actual moving parts of this fixture.
    this.sprite('postal-box',cx-265,cy-170,530,300);
    if(index)this.sprite('book',cx-165,cy-10,170,120);
    this.sprite('postal-lid',cx-270,closed?cy-100:cy-240,540,closed?220:160);
    if (!closed) { if(showIron)this.iron(pt(59,59),'철판',52); if(installed)this.magnet(pt(43,59),'N',.7); }
    g.restore();this.label(index?'당이의 책 보관함':'밀이의 우편함',pt(50,78));
  }
  cleanup() { this.stopped=true;this.cleanups.forEach(fn=>fn()); }
}

function hit(h: Hit) { return `<button class="canvas-hit ${h.kind || ''}" data-drag="${h.id}" style="left:${h.p.x}%;top:${h.p.y}%" aria-label="${e(h.label)}. 끌어서 이동, 방향키로 이동 후 Enter로 놓기."><span class="sr-only">${e(h.label)}</span></button>`; }
function action(id: string, text: string, disabled = false) { return `<button class="mission-action" data-mission="${id}" ${disabled?'disabled':''}>${text}</button>`; }
function initialize(n: number, a: Activity) {
  if(a.values.playVersion===4)return;
  // Completed historical evidence is immutable. New attempts start a coherent new experiment.
  const fresh=emptyActivity();a.points=fresh.points;a.values={playVersion:4,mechanicsVersion:1};a.records=fresh.records;a.trials=[];a.mask=[];
  a.values.round=0;
}
export function missionView(n: number, a: Activity, s: Save): View {
  initialize(n,a);
  const round=Number(a.values.round||0), hits:Hit[]=[];let actions='';
  const p=(id:string, fallback:Point)=>a.points[id]||fallback;
  if(n===1){hits.push({id:'lid',p:p('lid',pt(50,63)),label:'덮개 손잡이'},{id:'hidden-magnet',p:p('hidden-magnet',pt(43,59)),label:'장치 안의 자석'});if(a.values[`found${round}`]&&a.values[`latch${round}`]&&round===0)actions=action('next','책 보관함도 살펴보기 →');}
  if(n===2){hits.push({id:'repair-magnet',p:p('repair-magnet',pt(24,61)),label:'넣고 뺄 수 있는 자석'},{id:'lid',p:p('lid',pt(50,38)),label:'덮개 손잡이'});if(round===2)hits.push({id:'repair-plate',p:p('repair-plate',pt(75,47)),label:'자리가 어긋난 철판'});actions=action('shake','같은 힘으로 흔들어 보기');if(a.values.with0&&a.values.without0&&round===0)actions=action('next','책 보관함도 고쳐 주기 →');if(a.values.with1&&a.values.without1&&round===1)actions=action('next','새 우편함의 철판도 맞춰 줘 →');}
  if(n===2&&round===2&&!a.values.diagnosis2)actions+=`<div class="mission-diagnosis">${action('fault-distance','철판 위치를 고칠래')}${action('fault-color','자석 색을 바꿀래')}</div>`;
  if(n===3){hits.push({id:'sweep-magnet',p:p('sweep-magnet',pt(20,39)),label:'수리 키트의 자석'});materials.forEach((m,i)=>{if(!a.values[`sorted-${m.id}`])hits.push({id:`material-${i}`,p:p(`material-${i}`,materialPositions[i]),label:`${m.name}. 자석 반응을 확인한 뒤 알맞은 분류함으로 옮기기`});});}
  if(n===4){hits.push({id:'distance-magnet',p:p('distance-magnet',pt(25,55)),label:'조사 자석'});if(round===2)hits.push({id:'paper',p:p('paper',pt(23,76)),label:'얇은 종이판'});actions=action('release','손을 떼고 관찰');if(a.values[`done${round}`]&&round<3)actions=action('next',round===0?'가까이에서는 어떨까? →':round===1?'같은 배치에 종이만 넣어 보기 →':'이번엔 철 열쇠를 구하자 →');}
  if(n===5){hits.push({id:'probe',p:p('probe',pt(29,54)),label:'기준 자석'},{id:'stickerN',p:p('stickerN',pt(33,77)),label:'N극 스티커'},{id:'stickerS',p:p('stickerS',pt(47,77)),label:'S극 스티커'});actions=action('flip','기준 자석 뒤집기');if(a.values.solved0&&round===0)actions=action('next','두 번째 문 자석 조사 →');}
  if(n===6){for(let i=0;i<(round===0?2:3);i++)hits.push({id:`ring${i}`,p:p(`ring${i}`,pt(23+i*16,73)),label:`${i+1}번 고리자석`});actions=action('check','손을 떼고 고리 관찰');if(a.values[`done${round}`]&&round<2)actions=action('next',round===0?'세 개도 띄워 볼까? →':'이번엔 모두 붙여 줘! →');}
  if(n===7)hits.push({id:'cleaner',p:p('cleaner',pt(27,47)),label:'유리 밖 청소 자석 손잡이'});
  if(n===8){hits.push({id:'controller',p:p('controller',pt(20,40)),label:'택배 조종 자석'});actions=action('flip','조종 자석 뒤집기')+action('checkpoint','점검소에서 멈추고 확인');if(a.values[`segment${round}`]&&round<2)actions=action('next',round===0?'뒤에서 밀어 배달하기 →':'반대 방향으로도 배달하기 →');actions+=action('detach','자석 떼기')+action('safe','안전 위치로');}
  if(n===9){
    if(!a.values.chosen)actions=`<div class="mission-requests">${action('box','우편함이 자꾸 열려요')}${action('remote','유리 너머 물건을 옮겨 주세요')}</div>`;
    else {hits.push({id:'base',p:p('base',pt(18,69)),label:'장치 몸체'},{id:'design-magnet',p:p('design-magnet',pt(22,44)),label:'설계 자석'},{id:'design-target',p:p('design-target',pt(77,45)),label:'마주 볼 철판 또는 자석'});actions=action('pair',s.design.pair==='iron'?'자석으로 바꾸기':'철판으로 바꾸기')+action('flip','자석 뒤집기')+action('prototype','시제품 반응 시험');}
  }
  if(n===10){hits.push({id:'use-handle',p:p('use-handle',s.design.template==='remote'?(s.activities[9]?.points['design-magnet']||pt(43,55)):pt(50,37)),label:s.design.template==='box'?'덮개 손잡이':'원격 조작 손잡이'},{id:'design-magnet',p:p('design-magnet',s.activities[9]?.points['design-magnet']||pt(43,55)),label:'내 설계 자석'},{id:'design-target',p:p('design-target',s.activities[9]?.points['design-target']||pt(57,55)),label:'내 설계 대상 부품'});actions=action('test','사용 시험')+action('flip','자석 뒤집기');if(a.values.use0&&round===0)actions=action('next','다른 사용 상황으로 시험 →');if(a.values.use1)hits.push({id:'force-arrow',p:p('force-arrow',pt(16,78)),label:'힘이 작용한 곳을 나타낼 화살표'});}
  if(n===10&&s.design.template==='remote'){
    for(let i=hits.length-1;i>=0;i--)if((!a.values.adjusting&&(hits[i].id==='design-magnet'||hits[i].id==='design-target'))||(a.values.adjusting&&hits[i].id==='use-handle'))hits.splice(i,1);
    actions+=action('adjust',a.values.adjusting?'조작 손잡이로':'배치 고치기');
  }
  const stage=Math.floor((n-1)/2), tool=stage?questRewards[stage-1]:null;
  return {html:`<div class="mission-world stage-${stage+1}" style="--mission-background:url('/assets/quest/stage-${themes[stage]}.webp')"><div class="mission-board play-board" aria-label="${e(missionQuestions[n-1])}"><canvas width="1280" height="720" aria-hidden="true"></canvas>${hits.map(hit).join('')}<div class="mission-actions">${actions}</div><p class="mission-feedback" role="status" aria-live="polite"></p>${[3,4,7,8].includes(n)?'<div class="force-sensor" aria-label="물체 사이 거리"><span>거리를 바꿔 봐</span><i aria-hidden="true"></i></div>':''}${tool?`<button class="mission-pocket" data-mission="tool" aria-label="${tool.name} 사용 도움">${e(tool.name)}</button>`:''}</div><details class="mission-access"><summary>눌러서 이동</summary>${placementControls}</details></div>`,bind(c){
    const surface=new Surface(c,n);surface.button('tool',()=>{if(n===5){surface.a.values.lens=!surface.a.values.lens;surface.tell('관찰 렌즈로 처음 위치와 움직인 방향을 함께 볼 수 있어.');surface.draw();}else c.notify(tool?tool.use:missionGuides[n-1]);});
    const binders=[inspect,repair,salvage,distanceLab,poles,rings,aquarium,delivery,design,useDesign];binders[n-1](surface);surface.draw();return()=>surface.cleanup();
  }};
}

function inspect(v: Surface){
  const i=Number(v.a.values.round||0);let opened=v.has(`open${i}`);
  v.draw=()=>{v.base();v.fixture(i,!opened,!v.has(`found${i}`),!v.has(`latch${i}`));v.target(pt(78,52),'관찰 돋보기',145,130);if(opened||v.has(`found${i}`))v.magnet(v.p('hidden-magnet',pt(43,59)),'N',.75);v.label(!opened?'손잡이를 위로 올려 내부 조사':!v.has(`found${i}`)?'자석을 돋보기로 꺼내 조사':!v.has(`latch${i}`)?'꺼낸 자석을 철판 가까이 대 봐':'자석과 철판 사이에 당기는 힘 발견!',pt(50,29),true);if(v.has(`latch${i}`)){const q=v.p('hidden-magnet',pt(68,59));v.iron(pt(q.x-7,q.y),'철판',52);v.arrow(pt(59,59),pt(q.x-7,q.y));}else if(v.has(`found${i}`))v.target(pt(68,59),'철판 가까이',105,70);};
  v.drag('lid',pt(50,63),p=>{if(p.y<47){opened=true;v.mark(`open${i}`,'덮개 열기','장치 안쪽을 열어 관찰했어.');v.tell('안쪽의 자석을 돋보기로 꺼내 봐.');v.draw();}},p=>{if(p.y<47)opened=true;});
  v.drag('hidden-magnet',pt(43,59),p=>{if(!v.has(`open${i}`)){v.set('hidden-magnet',pt(43,59));v.tell('먼저 손잡이를 위로 올려 안쪽을 열어 봐.');}
    else if(v.has(`found${i}`)&&distance(p,pt(59,59))<13){v.mark(`latch${i}`,'고정 장치의 힘 조사','꺼낸 자석을 가까이 대니 철판이 자석 쪽으로 움직였어.');v.proof(`latch${i}`,'자석과 철판 사이 힘 관찰');v.tell('철판이 자석 쪽으로 움직였어. 이 힘이 덮개를 붙잡았구나!',true);v.refresh();}
    else if(distance(p,pt(78,52))<12&&!v.has(`found${i}`)){v.mark(`found${i}`,'장치 속 자석 발견',`${i?'책 보관함':'우편함'} 안쪽 자석과 철판을 관찰했어.`);v.proof(`inspect${i}`,'장치 안의 자석을 꺼내 관찰');v.refresh();}else v.tell(v.has(`found${i}`)?'이번엔 꺼낸 자석을 장치 안의 철판 가까이 대 봐.':'오른쪽 돋보기까지 옮겨서 살펴봐.');v.draw();});
  v.button('next',()=>{v.a.values.round=1;v.a.points={};v.refresh();});
}
function repair(v: Surface){
  const i=Number(v.a.values.round||0);let closed=typeof v.a.values.repairClosed==='boolean'?v.has('repairClosed'):(v.a.points.lid?.y||38)>55;
  const setClosed=(value:boolean)=>{closed=value;v.a.values.repairClosed=value;v.set('lid',pt(50,value?65:38));};
  setClosed(closed);
  const installed=()=>distance(v.p('repair-magnet',pt(24,61)),pt(43,59))<9;
  const plateAligned=()=>i<2||distance(v.p('repair-plate',pt(75,47)),pt(59,59))<7;
  v.draw=()=>{v.base();v.fixture(i===1?1:0,closed,installed(),i<2);if(!closed){v.target(pt(43,59),'자석 자리',120,66);v.magnet(v.p('repair-magnet',pt(24,61)),'N',.72);}if(i===2){v.target(pt(59,59),plateAligned()?'':'철판 자리',90,70);v.iron(v.p('repair-plate',pt(75,47)),'철판',65);}v.label(i===2?'새 우편함: 철판 자리도 맞춰 줘!':`${v.has(`without${i}`)?'✓':'○'} 자석 없이   ${v.has(`with${i}`)?'✓':'○'} 자석 넣고`,pt(50,29),true);};
  v.drag('repair-magnet',pt(24,61),()=>{setClosed(false);v.draw();});
  v.drag('lid',pt(50,38),p=>{setClosed(p.y>55);v.tell(closed?'이제 같은 힘으로 흔들어 보자.':'손잡이를 아래로 내려 닫아 봐.');v.draw();});
  if(i===2)v.drag('repair-plate',pt(75,47),()=>{setClosed(false);if(!v.has('diagnosis2')){v.set('repair-plate',pt(75,47));v.tell('먼저 자석을 넣고 흔들어 본 뒤, 고칠 곳을 찾아 줘.');}v.draw();});
  v.button('fault-distance',()=>{if(!v.has('faultObserved2'))return v.tell('자석을 자리에 넣고 덮개를 닫아 흔들어 봐. 무엇이 문제인지 증거부터 찾자.');v.mark('diagnosis2','고장 원인 진단','자석이 있어도 철판이 멀면 붙잡지 못한다는 증거로 위치를 고치기로 했어.');v.tell('맞아. 자석과 철판이 너무 멀리 있어. 철판을 점선에 옮겨 고쳐 줘.',true);v.refresh();});
  v.button('fault-color',()=>v.tell('색을 바꾸어도 철판과의 거리는 같아. 자석과 철판이 놓인 곳을 살펴봐.'));
  v.button('shake',()=>{if(!closed)return v.tell('먼저 덮개 손잡이를 아래로 내려 닫아 줘.');
    if(installed()&&plateAligned()){v.mark(`with${i}`,'자석을 넣고 같은 흔들림','자석이 철판을 당겨 덮개가 닫혀 있었어.');v.tell('덮개가 붙잡혔어! 자석이 철판을 당기고 있어.',true);}
    else{v.mark(`without${i}`,i===2?'새 우편함의 배치 검사':'자석 없이 같은 흔들림','덮개가 다시 열렸어.');if(i===2&&installed())v.mark('faultObserved2','고장 증거','자석을 넣어도 멀리 있는 철판을 붙잡지 못했어.');setClosed(false);v.tell(i===2&&installed()?'자석은 있는데 덮개가 열렸어. 아래에서 고칠 곳을 골라 봐.':'덮개가 열렸어. 자석을 넣으면 달라질까?');}
    if(i===2?v.has('with2'):v.has(`with${i}`)&&v.has(`without${i}`)){v.proof(`repair${i}`,i===2?'새 장치의 철판 자리까지 고치기':'같은 장치의 자석 유무 비교');v.refresh();}else v.draw();
  });
  v.button('next',()=>{v.a.values.round=i+1;v.a.values.repairClosed=false;v.a.points={};v.refresh();});
}
const materialPositions=[pt(36,42),pt(52,42),pt(66,43),pt(36,65),pt(52,65),pt(66,65)];
function salvage(v: Surface){
  let held=-1;const magnet=v.p('sweep-magnet',pt(20,39)),bins=[pt(86,44),pt(86,70)];
  const sorted=()=>materials.filter(m=>v.has(`sorted-${m.id}`)).length;
  const sort=(i:number,p:Point,byMagnet=false)=>{
    const m=materials[i],bin=bins.findIndex(q=>distance(p,q)<10);
    if(bin<0)return false;
    if(!v.has(`tested-${m.id}`)){v.set(`material-${i}`,materialPositions[i]);v.tell(`${m.name}의 반응을 먼저 자석으로 확인해 줘. 겉모습만으로는 알 수 없어.`);return false;}
    if((bin===0)!==m.magnetic){v.set(`material-${i}`,materialPositions[i]);held=-1;v.tell(m.id==='aluminum'?'알루미늄도 금속이지만 이번 자석에는 붙지 않았어. 관찰한 반응에 맞게 옮겨 줘.':`${m.name}이 자석을 따라왔는지 떠올려 봐. 관찰한 반응과 분류가 달라.`);playEffect('bump',v.s.settings);return false;}
    if(m.magnetic&&!byMagnet&&!v.has(`delivered-${m.id}`)){v.set(`material-${i}`,materialPositions[i]);v.tell('철 부품은 손 대신 자석으로 들어 수리함까지 운반해 줘.');return false;}
    v.mark(`sorted-${m.id}`,`${m.name} 분류`,bin===0?'붙는 재료로 분류했어.':'붙지 않는 재료로 분류했어.');
    if(m.magnetic)v.mark(`delivered-${m.id}`,`${m.name} 운반`,'자석에 붙은 철 부품을 수리함으로 옮겼어.');
    v.set(`material-${i}`,pt(82+(i%3)*4,bin===0?43:69));held=-1;
    const el=v.c.root.querySelector<HTMLButtonElement>(`[data-drag="material-${i}"]`);if(el)el.disabled=true;
    v.proof(`sort-${m.id}`,`${m.name} 관찰 후 분류`,'success',{material:m.id,magnetic:m.magnetic,byMagnet});
    v.tell(sorted()===6?'여섯 재료를 증거로 분류했어! 금속이라고 모두 자석에 붙지는 않아.':`${m.name} 분류 완료! ${sorted()}/6개를 제자리에 보냈어.`,true);
    if(sorted()===6)v.proof('materials','여섯 재료의 반응을 비교하여 분류하고 철 부품 운반');
    return true;
  };
  const scan=(p:Point)=>{
    if(held>=0){v.set(`material-${held}`,pt(p.x,p.y+6));sort(held,pt(p.x,p.y+6),true);return;}
    materials.forEach((m,i)=>{if(v.has(`sorted-${m.id}`)||held>=0)return;const q=v.p(`material-${i}`,materialPositions[i]);if(magneticReach(p,q,true)&&distance(p,q)<10){
      if(!v.has(`tested-${m.id}`)){v.mark(`tested-${m.id}`,m.name,m.magnetic?'자석 가까이에서 붙었어.':'가까이 대도 따라오지 않았어.');v.tell(m.magnetic?`${m.name}이 붙었어! 오른쪽 바구니까지 옮겨 줘.`:`${m.name}은 가까이 대도 따라오지 않아.`);}
      if(m.magnetic&&held<0)held=i;
    }});
  };
  v.draw=()=>{v.base();v.target(bins[0],'붙는 재료 · 수리함',190,125);v.target(bins[1],'붙지 않는 재료',190,120);materials.forEach((m,i)=>{const p=v.p(`material-${i}`,materialPositions[i]);
    if(v.has(`sorted-${m.id}`)){v.label('✓',p,true);return;}v.material(i,p);if(v.has(`tested-${m.id}`))v.label(m.magnetic?'따라왔어':'그대로야',pt(p.x,p.y-9),true);});v.magnet(v.p('sweep-magnet',magnet),'N',.9);v.label(`반응 조사 → 증거로 분류 → 철 부품 운반  ${sorted()}/6`,pt(50,29),true);};
  v.drag('sweep-magnet',magnet,p=>{scan(p);v.draw();},scan);
  materials.forEach((m,i)=>{if(v.has(`sorted-${m.id}`))return;v.drag(`material-${i}`,materialPositions[i],p=>{if(held===i)held=-1;sort(i,p);v.draw();});});
}
function distanceLab(v: Surface){
  const r=Number(v.a.values.round||0), target=r===3?pt(69,42):pt(61,55);let result=v.has(`done${r}`);
  const nearTrial=v.a.trials?.find(t=>t.key==='near'&&t.outcome==='success');
  const nearMagnet=nearTrial?.initialObjects.find(o=>o.id==='magnet');
  const comparisonPoint=nearMagnet?pt(nearMagnet.x,nearMagnet.y):pt(49,55);
  const paperSlot=pt((comparisonPoint.x+target.x)/2,(comparisonPoint.y+target.y)/2);
  const m=v.p('distance-magnet',pt(25,55));const paperIn=()=>distance(v.p('paper',pt(23,76)),paperSlot)<8;
  v.draw=()=>{v.base();const objectPoint=result&&r>0?pt(v.p('distance-magnet',m).x+8,v.p('distance-magnet',m).y):target;
    if(r===3){if(v.equipment('key',objectPoint,88,88))v.label('철 열쇠',pt(objectPoint.x,objectPoint.y+9),true);else v.iron(objectPoint,'철 열쇠',60);}else v.material(0,objectPoint,88);
    v.target(r===0?pt(25,55):r===3?pt(57,42):r===2?comparisonPoint:pt(49,55),r===0?'먼 자리':r===2?'같은 자리':'가까운 자리',110,70);
    if(r===2){const p=v.p('paper',pt(23,76));v.target(paperSlot,paperIn()?'':'종이 자리',45,130);if(!v.sprite('paper',p.x*W/100-21,p.y*H/100-85,42,170)){v.ctx.fillStyle='#fff9dc';v.ctx.strokeStyle='#b49b60';v.ctx.lineWidth=3;v.ctx.fillRect(p.x*W/100-12,p.y*H/100-65,24,130);v.ctx.strokeRect(p.x*W/100-12,p.y*H/100-65,24,130);}v.label('얇은 종이',pt(p.x,p.y+12),true);}
    v.magnet(v.p('distance-magnet',m),'N',.8);v.label(['먼 곳에 두고 관찰','가까이 옮겨 관찰','처음 배치는 그대로, 종이만 추가','다른 위치의 열쇠 구조'][r],pt(50,29),true);if(result)v.arrow(target,pt(v.p('distance-magnet',m).x+7,v.p('distance-magnet',m).y));};
  v.drag('distance-magnet',m,()=>v.draw());if(r===2)v.drag('paper',pt(23,76),()=>v.draw());
  v.button('release',()=>{let q=v.p('distance-magnet',m),d=distance(q,target);if(r===0&&d<27)return v.tell('먼 자리에서 먼저 관찰해 봐. 다음에 거리를 바꿀 거야.');
    if(r>0&&!magneticReach(q,target))return v.tell('아직 움직이지 않아. 자석을 더 가까이 옮겨 봐.');
    if(r===2){if(distance(q,comparisonPoint)>2||!paperIn())return v.tell('앞 실험에서 네가 고른 자석 자리는 그대로 두고, 종이만 점선에 넣어 봐.');q={...comparisonPoint};v.set('distance-magnet',q);v.set('paper',paperSlot);d=distance(q,target);}
    if(r===3&&distance(q,pt(57,42))>5)return v.tell('열쇠에 겹치지 않게, 왼쪽 점선 자리에 자석을 놓아 봐.');
    result=true;v.mark(`done${r}`,'한 가지 조건 비교',['먼 곳에서는 움직이지 않았어.','가까이 오니 닿기 전에 철 클립이 움직였어.','같은 배치에 얇은 종이를 넣어도 철 클립이 움직였어.','다른 위치의 철 열쇠도 닿지 않고 구했어.'][r]);
    const trial=v.proof(['far','near','paper','rescue'][r],['먼 거리','가까운 거리','같은 거리에서 얇은 종이 추가','새 위치 철 열쇠 구조'][r],'success',{paper:r===2,gap:d,material:'iron'});
    trial.initialObjects=r===2&&nearTrial?structuredClone(nearTrial.initialObjects):[{id:'magnet',...q},{id:'clip',...target}];trial.objects=[{id:'magnet',...q},{id:'clip',...(r===0?target:pt(q.x+8,q.y))}];v.refresh();
  });
  v.button('next',()=>{v.a.values.round=r+1;v.a.points={};if(r===1){const actual=v.a.trials?.find(t=>t.key==='near'&&t.outcome==='success')?.initialObjects.find(o=>o.id==='magnet');v.a.points['distance-magnet']=actual?pt(actual.x,actual.y):pt(49,55);}v.refresh();});
}
function poles(v: Surface){
  const r=Number(v.a.values.round||0), hidden:Pole=r===0?'S':'N';let probe=(v.a.values.probePole||'N') as Pole;
  const target=pt(64,53);let reaction=String(v.a.values.reaction||''),probeStart={...v.p('probe',pt(29,54))};
  const test=(p:Point)=>{if(distance(p,pt(48,53))>5)return;const facing=opposite(probe),repel=facing===hidden;
    const targetStart={...(v.a.points['unknown-magnet']||target)};v.a.points['initial:unknown-magnet']=targetStart;
    reaction=repel?'밀려났어':'당겨졌어';v.a.values.reaction=reaction;
    v.set('unknown-magnet',repel?pt(72,53):pt(59,53));
    v.mark(`test${r}${facing}`,`기준 ${facing}극 접근`,repel?'표시 없는 자석이 밀려났어.':'표시 없는 자석이 당겨졌어.');
    const trial=v.proof(`pole${r}${facing}`,`${facing}극을 가까이 댄 반응`,repel?'repel':'attract',{facing,hidden});
    trial.initialObjects=[{id:'probe',...probeStart,pole:probe},{id:'unknown-magnet',...targetStart,pole:hidden}];probeStart={...p};
    trial.objects=[{id:'probe',...p,pole:probe},{id:'unknown-magnet',...v.a.points['unknown-magnet'],pole:hidden}];
    v.tell(`${facing}극을 가까이 대니 ${reaction}. 다른 쪽 극도 대 보자.`);v.draw();};
  v.draw=()=>{v.base();v.target(pt(48,53),'기준 자석 대는 자리',145,76);const q=v.a.points['unknown-magnet']||(reaction==='밀려났어'?pt(72,53):reaction==='당겨졌어'?pt(59,53):target);
    v.magnet(q,hidden,.85);if(!v.has(`solved${r}`)){const g=v.ctx,x=q.x*W/100-59,y=q.y*H/100-25,paper=v.asset('notebook','/assets/quest/notebook-page.webp');g.save();g.beginPath();g.roundRect(x,y,118,50,8);g.clip();if(paper.complete&&paper.naturalWidth)g.drawImage(paper,240,220,472,200,x,y,118,50);else{g.fillStyle='#eadca4';g.fillRect(x,y,118,50);}g.restore();g.strokeStyle='#b49b60';g.lineWidth=2;g.beginPath();g.roundRect(x,y,118,50,8);g.stroke();v.label('?',q);}
    v.target(pt(59,40),'왼쪽 극',78,62);v.target(pt(70,40),'오른쪽 극',78,62);v.magnet(v.p('probe',pt(29,54)),probe,.9);v.label('N',v.p('stickerN',pt(33,77)));v.label('S',v.p('stickerS',pt(47,77)));v.label(`${v.has(`test${r}N`)?'✓':'○'} N극 반응    ${v.has(`test${r}S`)?'✓':'○'} S극 반응 → 양쪽 표시 복원`,pt(50,29),true);
    if(reaction){const before=v.a.points['initial:unknown-magnet']||target;v.label(reaction,pt(76,65),true);v.arrow(pt(before.x,70),pt(q.x,70));if(v.has('lens')){v.target(before,'처음 위치',145,74);v.arrow(pt(before.x,before.y-9),pt(q.x,q.y-9),'#e0a337');}}
  };
  v.drag('probe',pt(29,54),test);
  for(const pole of ['N','S'] as Pole[])v.drag(`sticker${pole}`,pole==='N'?pt(33,77):pt(47,77),p=>{
    const side=Math.abs(p.x-59)<5&&Math.abs(p.y-40)<8?'left':Math.abs(p.x-70)<5&&Math.abs(p.y-40)<8?'right':null;
    if(!side)return;
    if(!v.has(`test${r}N`)||!v.has(`test${r}S`))return v.tell('두 극을 각각 가까이 대고 움직임을 비교해 보자.');
    if(pole!==(side==='left'?hidden:opposite(hidden))){v.tell(side==='left'?`${pole}극끼리라면 밀어내야 해. 관찰한 반응과 다시 맞춰 봐.`:'한 자석의 양쪽 끝은 서로 다른 극이야. 왼쪽에 붙인 표시와 비교해 봐.');v.set(`sticker${pole}`,pole==='N'?pt(33,77):pt(47,77));v.draw();return;}
    v.set(`sticker${pole}`,pt(side==='left'?59:70,40));v.mark(`label${r}${pole}`,'자석 끝의 극 복원',`${side==='left'?'왼쪽':'오른쪽'} 끝을 ${pole}극으로 표시했어.`);
    if(v.has(`label${r}N`)&&v.has(`label${r}S`)){v.mark(`solved${r}`,'양쪽 극 표시 복원',`왼쪽은 ${hidden}극, 오른쪽은 ${opposite(hidden)}극으로 관찰에 맞게 복원했어.`);v.proof(`gate${r}`,'양쪽 극 표시를 복원해 문 수리');v.refresh();}else {v.tell('한쪽 극을 찾았어! 다른 끝에는 어떤 표시가 필요할까?',true);v.draw();}
  });
  v.button('flip',()=>{probe=opposite(probe);v.a.values.probePole=probe;probeStart=pt(29,54);v.set('probe',probeStart);v.tell('이제 반대쪽 극을 대고 움직임을 비교해 봐.');v.refresh();});
  v.button('next',()=>{v.a.values.round=1;delete v.a.values.reaction;v.a.points={};v.refresh();});
}
function rings(v: Surface){
  const r=Number(v.a.values.round||0),count=r===0?2:3;
  const pole=(i:number)=>(v.a.values[`ringPole${i}`]||'N') as Pole;
  const slot=(i:number)=>pt(68,71-i*15);
  const snapshot=():TrialObject[]=>Array.from({length:count},(_,i)=>({id:`ring${i}`,...v.p(`ring${i}`,pt(23+i*16,73)),topPole:pole(i),bottomPole:opposite(pole(i))}));
  const flipRing=(i:number)=>{v.a.values[`ringPole${i}`]=opposite(pole(i));if(v.has('ringReleased')){for(let j=0;j<count;j++)v.set(`ring${j}`,slot(j));v.a.values.ringReleased=false;v.tell('고리를 뒤집고 점선 시험 자리로 되돌렸어. 다시 손을 떼고 관찰해 봐.');}v.draw();v.c.touch();};
  v.draw=()=>{v.base();const g=v.ctx;
    if(!v.equipment('stand',pt(68,57),220,300)){g.fillStyle='#968e73';g.fillRect(68*W/100-8,260,16,298);g.fillStyle='#695f46';g.beginPath();g.ellipse(68*W/100,555,100,22,0,0,Math.PI*2);g.fill();}
    for(let i=0;i<count;i++){v.target(slot(i),i===0?'아래': '',145,65);const q=v.p(`ring${i}`,pt(23+i*16,73));
      if(!v.equipment(pole(i)==='N'?'ringN':'ringS',q,134,96)){const x=q.x*W/100,y=q.y*H/100;g.fillStyle=pole(i)==='N'?'#db584a':'#4386b1';g.strokeStyle='#2b5360';g.lineWidth=3;g.beginPath();g.ellipse(x,y,64,24,0,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#d7c397';g.beginPath();g.ellipse(x,y,15,7,0,0,Math.PI*2);g.fill();}}
    for(let i=0;i<count;i++){const q=v.p(`ring${i}`,pt(23+i*16,73));v.label(`${i+1} 위 ${pole(i)} / 아래 ${opposite(pole(i))}`,q.x>60?pt(q.x-18,q.y):pt(q.x,q.y-8),true);}
    v.label(r<2?`${count}개 고리를 서로 떨어져 있게!`:'세 고리를 서로 붙게!',pt(50,29),true);
  };
  for(let i=0;i<count;i++){
    v.drag(`ring${i}`,pt(23+i*16,73),p=>{if(distance(p,slot(i))<11)v.set(`ring${i}`,slot(i));v.draw();});
    const b=v.c.root.querySelector<HTMLElement>(`[data-drag="ring${i}"]`);b?.addEventListener('dblclick',()=>flipRing(i));
    // A single accessible flip button belongs to each physical ring, rather than a quiz tab.
    const flip=document.createElement('button');flip.className='ring-flip';flip.textContent=`${i+1}번 뒤집기`;flip.setAttribute('aria-label',`${i+1}번 고리 뒤집기`);flip.style.left=`${22+i*16}%`;flip.style.top='84%';flip.addEventListener('click',()=>flipRing(i));v.c.root.querySelector('.mission-board')!.append(flip);
  }
  v.button('check',()=>{if(!Array.from({length:count},(_,i)=>{const q=v.p(`ring${i}`,pt(23+i*16,73));return Math.abs(q.x-68)<7&&Math.abs(q.y-slot(i).y)<7;}).every(Boolean))return v.tell(`고리를 아래부터 ${count===2?'1, 2':'1, 2, 3'}번 순서로 각각의 점선 자리에 놓아 줘.`);
    // Released rings settle according to the two faces that actually meet.
    if(v.animating)return;
    const initial=snapshot();let y=71;const targets:Record<string,Point>={ring0:pt(68,y)};for(let i=1;i<count;i++){y-=ringFloating(pole(i-1),pole(i))?15:6;targets[`ring${i}`]=pt(68,y);}
    const correct=Array.from({length:count-1},(_,i)=>ringFloating(pole(i),pole(i+1))===(r<2)).every(Boolean);
    v.settle(targets,()=>{
      v.a.values.ringReleased=true;
      const trial=v.proof(correct?['float2','float3','join3'][r]:`rings-failed${r}`,r<2?`${count}개 고리 띄우기`:'3개 고리 붙이기',correct?'success':'failure');trial.initialObjects=initial;trial.objects=snapshot();
      if(!correct){v.tell(r<2?'마주 보는 면이 다른 극이라 붙었어. 한 고리를 뒤집어 봐.':'마주 보는 면이 같은 극이라 떨어져 있어. 윗면만 보지 말고 아랫면도 생각해 봐.');playEffect('bump',v.s.settings);v.c.touch();return;}
      v.mark(`done${r}`,'고리 배치 문제 해결',r<2?'같은 극을 마주 보게 하여 고리를 떨어뜨렸어.':'다른 극을 마주 보게 하여 고리를 붙였어.');playEffect('success',v.s.settings);v.refresh();
    });
  });
  v.button('next',()=>{v.a.values.round=r+1;v.a.values.ringReleased=false;v.a.points={};v.refresh();});
}

function aquarium(v: Surface){
  let previous=performance.now(), raf=0, moved=false, lastSave=0;
  let pad=v.p('inner-pad',pt(29,48));const dirt=[pt(40,44),pt(66,44),pt(59,65)], counts=[0,1,2].map(i=>Number(v.a.values[`scrubDistance${i}`]||0)),turns=[0,1,2].map(i=>Number(v.a.values[`scrubTurns${i}`]||0)),directions=[0,0,0],legs=[0,0,0];
  const progress=(i:number)=>Math.min(100,Math.round(Math.min(counts[i]/18,turns[i]/2)*100));
  const padInfo=document.createElement('span');padInfo.className='sr-only';padInfo.dataset.object='inner-pad';padInfo.style.left=`${pad.x}%`;padInfo.style.top=`${pad.y}%`;padInfo.textContent='유리 안쪽에서 바깥 손잡이를 따라 움직이는 청소 패드';v.c.root.querySelector('.mission-board')!.append(padInfo);
  v.draw=()=>{v.base();const g=v.ctx;g.fillStyle='#79c3cb55';g.beginPath();g.roundRect(290,235,730,325,24);g.fill();
    v.sprite('aquarium',250,170,800,440);
    dirt.forEach((p,i)=>{if(v.has(`clean${i}`)){v.label('✓',p);return;}g.fillStyle=`rgba(116,137,72,${.85-progress(i)/160})`;for(let j=0;j<7;j++){g.beginPath();g.ellipse(p.x*W/100+Math.sin(j*2.3)*45,p.y*H/100+Math.cos(j)*25,25,18,0,0,Math.PI*2);g.fill();}v.label(`${progress(i)}% · 왕복 ${Math.min(2,turns[i])}/2`,pt(p.x,p.y-8),true);});
    if(!v.equipment('pad',pad,115,88))v.iron(pad,'',95);v.label('안쪽 패드',pt(pad.x,pad.y+9),true);const handle=v.p('cleaner',pt(27,47));v.magnet(handle,'N',.6);v.label('유리 밖 손잡이',pt(handle.x,handle.y-8),true);v.label('유리 안',pt(74,32),true);
    v.label(`손잡이를 천천히 이끌고 얼룩 위에서 좌우로 왕복  ${[0,1,2].filter(i=>v.has(`clean${i}`)).length}/3`,pt(50,26),true);
    if(distance(handle,pad)<18)v.arrow(pad,handle,'#d99c3d');
  };
  const moveHandle=(p:Point)=>{moved=true;v.set('cleaner',pt(clamp(p.x,26,77),clamp(p.y,35,74)));};
  v.drag('cleaner',pt(27,47),moveHandle,moveHandle);
  const frame=(now:number)=>{if(v.stopped)return;const dt=Math.max(0,Math.min((now-previous)/1000,.045));previous=now;
    if(!document.hidden&&!document.querySelector('dialog[open],.modal-backdrop')&&moved){const handle=v.p('cleaner',pt(27,47)),d=distance(handle,pad);if(d<18){if(v.feedback==='손잡이가 너무 멀어졌어. 안쪽 패드 가까이 돌아와 줘.')v.tell('안쪽 패드와 다시 연결됐어. 얼룩 위에서 천천히 좌우로 왕복해 줘.');const k=1-Math.exp(-dt*4),before={...pad};pad=pt(pad.x+(handle.x-pad.x)*k,pad.y+(handle.y-pad.y)*k);v.set('inner-pad',pad);const travel=distance(before,pad),dx=pad.x-before.x;
      dirt.forEach((p,i)=>{if(!v.has(`clean${i}`)&&distance(p,pad)<7&&travel>.015){counts[i]+=travel;
        if(Math.abs(dx)>.012){const direction=Math.sign(dx);if(directions[i]&&direction!==directions[i]&&legs[i]>=2.5){turns[i]++;legs[i]=0;}else if(direction!==directions[i])legs[i]=0;directions[i]=direction;legs[i]+=Math.abs(dx);}
        v.a.values[`scrubDistance${i}`]=counts[i];v.a.values[`scrubTurns${i}`]=turns[i];
        if(counts[i]>=18&&turns[i]>=2){v.mark(`clean${i}`,'왕복 조작으로 청소',`${i+1}번째 얼룩을 유리 밖 자석으로 좌우 왕복하여 닦았어.`);v.tell('왕복해서 닦으니 깨끗해졌어! 다음 얼룩까지 천천히 이어 가자.',true);}}});}
      else v.tell('손잡이가 너무 멀어졌어. 안쪽 패드 가까이 돌아와 줘.');
      if([0,1,2].every(i=>v.has(`clean${i}`))&&!v.has('clean-proof')){v.proof('clean','유리 밖 자석으로 세 구역을 왕복 청소','success',{scrubDistance:Math.round(counts.reduce((sum,x)=>sum+x,0)),reversals:turns.reduce((sum,x)=>sum+x,0)});v.a.values['clean-proof']=true;v.tell('세 곳 모두 깨끗해! 유리에 막혀도 자석의 힘으로 안쪽을 움직였어.',true);}
      if(now-lastSave>1000){v.c.touch();lastSave=now;}
    }v.draw();raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);v.cleanups.push(()=>cancelAnimationFrame(raf));
}
function delivery(v: Surface){
  const r=Number(v.a.values.round||0),start=r===2?74:27,goal=r===2?30:73;let car=Number(v.a.values.car??start),pole=(v.a.values.controllerPole||'N') as Pole,raf=0,prev=performance.now(),moved=false,lastSave=0,controlled=Number(v.a.values[`controlled${r}`]||0);
  const carPoint=()=>pt(car,59);const permitted=(q:Point)=>r===0?q.x>car:r===1?q.x<car:true;
  const forceOn=()=>{const q=v.p('controller',pt(20,40));return distance(q,carPoint())<18&&Math.abs(q.y-59)<12;};
  const state=document.createElement('p');state.className='delivery-state';state.setAttribute('role','status');v.c.root.querySelector('.mission-board')!.append(state);
  const safePosition=(p:Point):Point=>{
    const board=v.c.root.querySelector<HTMLElement>('.mission-board')!.getBoundingClientRect();
    const piece=v.c.root.querySelector<HTMLElement>('[data-drag="controller"]')!.getBoundingClientRect();
    let top=board.height*.36,bottom=board.height*.77;
    const shell=v.c.root.closest('.quest-activity');
    shell?.querySelectorAll<HTMLElement>('.inquiry-steps,.mission-feedback,.mission-next-action').forEach(el=>{const r=el.getBoundingClientRect();if(r.height&&r.top<board.top+board.height*.5)top=Math.max(top,r.bottom-board.top);});
    v.c.root.querySelectorAll<HTMLElement>('.mission-actions').forEach(el=>{const r=el.getBoundingClientRect();if(r.height)bottom=Math.min(bottom,r.top-board.top);});
    const halfX=Math.max(piece.width/2,52.5*board.width/W)+8,halfY=Math.max(piece.height/2,20*board.height/H)+8;
    return pt(clamp(p.x,halfX/board.width*100,100-halfX/board.width*100),clamp(p.y,(top+halfY)/board.height*100,(bottom-halfY)/board.height*100));
  };
  const carInfo=document.createElement('span');carInfo.className='sr-only';carInfo.dataset.object='cart-magnet';carInfo.style.left=`${car}%`;carInfo.style.top='59%';carInfo.textContent='왼쪽 N극, 오른쪽 S극을 가진 택배 카트';v.c.root.querySelector('.mission-board')!.append(carInfo);
  v.draw=()=>{v.base();const status=`${v.has(`checkpoint${r}`)?'정차 점검 완료 · 다음은 배달 장소':'정차 목표 · 가운데 점검소'} / ${forceOn()?'연결됨 · 힘이 닿아':'연결 끊김 · 카트 멈춤'}`;if(state.textContent!==status)state.textContent=status;const g=v.ctx;if(!v.sprite('rail',272,392,766,62)){g.strokeStyle='#8b7653';g.lineWidth=9;g.beginPath();g.moveTo(280,445);g.lineTo(1030,445);g.stroke();g.strokeStyle='#eadba7';g.lineWidth=3;g.beginPath();g.moveTo(280,432);g.lineTo(1030,432);g.stroke();}v.target(pt(goal,59),'배달 장소',125,105);v.target(pt(50,59),v.has(`checkpoint${r}`)?'점검 완료 ✓':'점검소 · 잠깐 정차',125,110);
    if(!v.sprite('cart',car*W/100-115,300,230,170)){g.fillStyle='#d79d53';g.fillRect(car*W/100-60,375,120,60);}v.sprite('parcel',car*W/100-45,327,90,80);v.magnet(carPoint(),'N',.48);v.magnet(v.p('controller',pt(20,40)),pole,.7);v.arrow(pt(start,74),pt(goal,74));v.label(`${['앞에서 당기기','뒤에서 밀기','반대 방향 배달'][r]} → ${v.has(`checkpoint${r}`)?'받는 곳까지 운반':'가운데 정차 후 자석 떼기'}`,pt(50,29),true);
  };
  v.drag('controller',pt(20,40),()=>{},()=>{moved=true;},safePosition);v.button('flip',()=>{pole=opposite(pole);v.a.values.controllerPole=pole;v.c.touch();v.draw();});
  const detach=(safe=false)=>{const q=v.p('controller',pt(20,40));v.set('controller',safePosition(pt(safe?20:q.x,38)));v.c.touch();v.tell('자석을 떼어 연결을 끊었어. 카트 위치와 지금까지의 실험 증거는 그대로야.');v.draw();};
  v.button('detach',()=>detach());v.button('safe',()=>detach(true));
  v.button('checkpoint',()=>{if(Math.abs(car-50)>4)return v.tell('먼저 가운데 점검소의 점선 안으로 카트를 보내 줘.');if(forceOn())return v.tell('카트가 움직이는 중이야. 조종 자석을 위로 떼어 카트를 멈춰 줘.');if(!v.has(`checkpoint${r}`)){v.mark(`checkpoint${r}`,'운반 중 정차','힘이 닿지 않도록 조종 자석을 멀리 하여 점검소에서 정차했어.');v.proof(`stop${r}`,'자석 거리로 정차 제어','success',{car,controllerY:v.p('controller',pt(20,40)).y});}v.tell('짐 점검 완료! 다시 자석을 가까이 대고 배달 장소로 출발하자.',true);v.draw();});
  const frame=(now:number)=>{if(v.stopped)return;const dt=Math.max(0,Math.min(.045,(now-prev)/1000));prev=now;
    if(!document.hidden&&!document.querySelector('dialog[open],.modal-backdrop')&&moved&&!v.has(`segment${r}`)){
      const q=v.p('controller',pt(20,40)),d=distance(q,carPoint());if(d<18&&Math.abs(q.y-59)<12){const side=q.x>car?1:-1;
        // Cart's physical left face is N, right face S. Controller's corresponding facing face is used.
        const cartFacing=side>0?'S':'N',controlFacing=side>0?pole:opposite(pole),attract=cartFacing!==controlFacing;
        const dir=side*(attract?1:-1),before=car;car=clamp(car+dir*(18-d)/18*dt*17,24,79);v.a.values.car=car;v.set('cart-magnet',carPoint());
        const correctMethod=permitted(q)&&((r===0&&attract)||(r===1&&!attract)||r===2);
        if(correctMethod&&Math.sign(car-before)===Math.sign(goal-start)){controlled+=Math.abs(car-before);v.a.values[`controlled${r}`]=controlled;}
        if(!permitted(q))v.tell(r===0?'이번 의뢰는 앞에서 당기기야. 카트 앞으로 가 봐.':r===1?'이번 의뢰는 뒤에서 밀기야. 카트 뒤로 가 봐.':'극과 위치를 바꿔 원하는 방향으로 움직여.');
        if(Math.abs(car-goal)<3&&!v.has(`checkpoint${r}`))v.tell('중간 점검이 남았어. 극을 바꾸어 점검소로 돌아가 멈춰 줘.');
        if(Math.abs(car-goal)<3&&v.has(`checkpoint${r}`)&&correctMethod&&controlled<20)v.tell('이번 의뢰의 방법으로 충분히 운반하지 못했어. 중간으로 돌아가 요청한 밀기·당기기로 다시 보내 줘.');
        if(Math.abs(car-goal)<3&&v.has(`checkpoint${r}`)&&correctMethod&&controlled>=20){
          v.mark(`segment${r}`,'택배 배달',['카트 앞에서 다른 극으로 당겨 배달했어.','카트 뒤에서 같은 극으로 밀어 배달했어.','극과 위치를 조절해 반대 방향으로 배달했어.'][r]);v.proof(`delivery${r}`,'극의 힘으로 경로 운반','success',{method:r===0?'pull':r===1?'push':'reverse',pole,goal,controlledDistance:Math.round(controlled)});v.tell('도착했어! 시민이 택배를 받았어.',true);v.refresh();return;
        }
      }if(now-lastSave>1000){v.c.touch();lastSave=now;}
    }v.set('controller',safePosition(v.p('controller',pt(20,40))));v.draw();raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);v.cleanups.push(()=>cancelAnimationFrame(raf));
  v.button('next',()=>{v.a.values.round=r+1;v.a.values.car=r+1===2?74:27;v.a.points={};v.refresh();});
}
function design(v: Surface){
  const chosen=v.has('chosen'),remote=v.s.design.template==='remote';
  const changed=()=>{v.s.design.revision++;v.c.touch();v.c.meta();};
  v.draw=()=>{v.base();if(!chosen){v.sprite('postal-box',245,290,365,255);v.sprite('postal-lid',245,190,365,175);v.sprite('cart',760,305,300,235);v.label('밀이의 우편함',pt(33,77));v.label('당이의 원격 운반 도구',pt(72,77));return;}
    v.target(pt(50,61),remote?'운반 장치 몸체':'우편함 몸체',400,150);if(v.has('base'))v.sprite(remote?'cart':'postal-box',400,285,480,270);
    v.target(pt(44,53),'자석 자리',135,75);v.target(pt(57,53),'마주 보는 부품',135,75);if(remote){if(!v.sprite('glass',630,288,24,224)){v.ctx.fillStyle='#8dc9cf99';v.ctx.fillRect(636,305,12,190);}v.label('유리판',pt(50,40),true);}
    if(!v.has('base')){const body=v.p('base',pt(18,69));if(v.sprite(remote?'cart':'postal-box',body.x*W/100-98,body.y*H/100-70,196,140))v.label('몸체',pt(body.x,body.y+12),true);else v.iron(body,'몸체',100);}v.magnet(v.p('design-magnet',pt(22,44)),opposite(v.s.design.pole),.75);
    if(v.s.design.pair==='iron')v.iron(v.p('design-target',pt(77,45)),'철판',65);else v.magnet(v.p('design-target',pt(77,45)),'N',.75);const tested=v.a.trials?.some(t=>t.key==='prototype'&&t.designRevision===v.s.design.revision);v.label(tested?'시험 결과를 확인했어 · 다음 사용 시험에서 개선하기':'몸체 → 두 부품 배치 → 시제품 반응 시험',pt(50,29),true);
    if(tested){const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));if(v.s.design.aligned&&v.s.design.gap<=36)v.arrow(t,pt(t.x+(v.s.design.pair==='magnet'&&v.s.design.pole==='N'?7:-7),t.y));}
  };
  for(const template of ['box','remote'] as const)v.button(template,()=>{v.s.design={template,pair:'iron',pole:'N',gap:65,aligned:false,revision:v.s.design.revision+1};v.a.values.chosen=true;v.a.points={};v.refresh();});
  if(!chosen)return;
  v.drag('base',pt(18,69),p=>{if(distance(p,pt(50,61))<13){v.set('base',pt(50,61));v.mark('base','장치 몸체','시민의 요청에 맞는 몸체를 놓았어.');}v.draw();});
  const align=()=>{const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));v.s.design.gap=distance(m,t)*2;v.s.design.aligned=assemblyAligned(m,t,remote);changed();v.draw();};
  v.drag('design-magnet',pt(22,44),()=>{align();v.mark('magnet','자석 배치','자석의 위치를 직접 정했어.');});
  v.drag('design-target',pt(77,45),()=>{align();v.mark('target','대상 부품 배치','자석과 마주 볼 부품의 위치를 정했어.');});
  v.button('flip',()=>{v.s.design.pole=opposite(v.s.design.pole);changed();v.draw();});
  v.button('pair',()=>{v.s.design.pair=v.s.design.pair==='iron'?'magnet':'iron';changed();v.refresh();});
  v.button('prototype',()=>{if(!v.has('base')||!v.has('magnet')||!v.has('target'))return v.tell('몸체와 두 부품을 모두 직접 배치한 뒤 시험해 줘.');const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));v.s.design.gap=distance(m,t)*2;v.s.design.aligned=assemblyAligned(m,t,remote);const good=v.s.design.aligned&&v.s.design.gap<=36&&(v.s.design.pair==='iron'||v.s.design.pole==='S');v.proof('prototype','내 설계 시제품의 반응 시험',good?'success':'failure',{gap:v.s.design.gap,aligned:v.s.design.aligned,pair:v.s.design.pair,pole:v.s.design.pole});v.tell(good?'부품이 서로 당겨졌어! 다음 단계에서 실제 쓰임을 시험하자.':!v.s.design.aligned?'두 부품이 마주 보고 있는지 살펴봐. 여기서 고치거나 사용 시험에서 개선해도 좋아.':v.s.design.gap>36?'너무 멀어서 움직이지 않았어. 거리를 줄이는 개선이 필요해.':'같은 극끼리 밀어냈어. 붙잡는 장치를 만들려면 극을 바꿔야 해.',good);v.draw();});
}
function useDesign(v: Surface){
  const r=Number(v.a.values.round||0),remote=v.s.design.template==='remote';let operated=v.has(`use${r}`);
  const m=v.p('design-magnet',v.s.activities[9]?.points['design-magnet']||pt(43,55)),t=v.p('design-target',v.s.activities[9]?.points['design-target']||pt(57,55));
  const sync=()=>{v.s.design.gap=distance(v.p('design-magnet',m),v.p('design-target',t))*2;v.s.design.aligned=assemblyAligned(v.p('design-magnet',m),v.p('design-target',t),remote);};
  const change=()=>{sync();delete v.a.points['operating-magnet'];delete v.a.points['operating-target'];v.set('use-handle',remote?v.p('design-magnet',m):pt(50,37));v.s.design.revision++;delete v.a.values.use0;delete v.a.values.use1;delete v.a.values['force-arrow'];v.a.values.round=0;v.tell('배치를 고쳤어. 바뀐 설계로 두 상황을 다시 확인하자.');v.refresh();};
  sync();
  const destination=pt(t.x,r===0?42:66),forceSpot=remote?pt((m.x+t.x)/2,v.p('operating-target',t).y):pt(50,54);
  if(!operated)operated=remote?!!v.a.points['use-handle']&&distance(v.a.points['use-handle'],m)>.5&&distance(v.p('operating-target',t),destination)<6:(v.a.points['use-handle']?.y||37)>59;
  v.draw=()=>{v.base();if(!remote){v.fixture(0,operated,false,false);if(!operated){if(r===1)v.sprite('book',510,370,200,160);else if(!v.sprite('letter',530,392,170,121)){v.ctx.fillStyle='#fff3ce';v.ctx.strokeStyle='#98784e';v.ctx.lineWidth=3;v.ctx.fillRect(540,420,150,60);v.ctx.strokeRect(540,420,150,60);v.ctx.beginPath();v.ctx.moveTo(540,420);v.ctx.lineTo(615,458);v.ctx.lineTo(690,420);v.ctx.stroke();}}}else{if(!v.sprite('glass',625,232,30,346)){v.ctx.fillStyle='#83c7cf77';v.ctx.fillRect(630,240,20,330);}v.label('유리판',pt(50,32),true);}
    const actualM=remote?v.p('operating-magnet',m):v.p('design-magnet',m),actualT=remote?v.p('operating-target',t):v.p('design-target',t);
    v.magnet(actualM,opposite(v.s.design.pole),.75);if(v.s.design.pair==='iron')v.iron(actualT,'철판',65);else v.magnet(actualT,'N',.75);
    v.label(remote?(r===0?'손잡이를 움직여 위 선반까지':'이번엔 아래 선반으로 옮겨 줘'):(r===0?'편지 한 장을 넣고 닫기':'책 한 권을 넣고 닫기'),pt(50,29),true);
    v.target(remote?destination:pt(50,65),remote?'철 부품 목적지':'덮개 내려 닫기',125,75);if(v.has('use1')){v.arrow(v.p('force-arrow',pt(16,78)),pt(v.p('force-arrow',pt(16,78)).x+9,v.p('force-arrow',pt(16,78)).y));v.target(forceSpot,'힘이 작용한 곳',120,70);}
  };
  v.drag('design-magnet',m,change);v.drag('design-target',t,change);
  v.drag('use-handle',remote?m:pt(50,37),p=>{if(remote)v.set('use-handle',pt(m.x,clamp(p.y,35,72)));operated=remote?distance(v.p('operating-target',t),destination)<6:p.y>59;v.tell(operated?'이제 실제 사용 시험으로 결과를 확인해 봐.':'손잡이를 움직여 물체를 점선 목적지까지 보내 봐.');v.draw();},p=>{if(remote){const handle=pt(m.x,clamp(p.y,35,72));v.set('use-handle',handle);v.set('operating-magnet',handle);const current=v.p('operating-target',t);if(v.s.design.aligned&&distance(handle,current)<18&&(v.s.design.pair==='iron'||v.s.design.pole==='S'))v.set('operating-target',pt(t.x,handle.y));}});
  v.button('test',()=>{sync();const issue=assemblyIssue(v.p('design-magnet',m),v.p('design-target',t),remote);if(issue){v.proof(`failed${r}`,'내 발명품 사용 시험','failure',{gap:v.s.design.gap,aligned:v.s.design.aligned,reason:issue});return v.tell(issue);}
    if(v.s.design.pair==='magnet'&&v.s.design.pole==='N')return v.tell('같은 극이 마주 봐 밀어내고 있어. 자석을 뒤집어 봐.');
    operated=operated&&(remote?distance(v.p('operating-target',t),destination)<6:v.p('use-handle',pt(50,37)).y>59);if(!operated)return v.tell(remote?`먼저 손잡이를 ${r===0?'위':'아래'} 선반의 점선 목적지까지 옮겨 줘.`:'먼저 덮개 손잡이를 아래로 내려 닫아 줘.');
    // Canonical design convention uses pole S for a successful box magnet pair.
    v.mark(`use${r}`,'다른 조건에서 사용',remote?'유리 너머 부품을 자석으로 옮겼어.':r===0?'편지를 넣고도 덮개가 고정됐어.':'책을 넣고도 덮개가 고정됐어.');v.proof(`use${r}`,'내 설계로 두 조건 사용 시험','success',{gap:v.s.design.gap,aligned:true,load:r===0?'letter':'book'});
    // This interoperable proof lets the final restoration use the student's actual design.
    v.a.values.adjusting=false;v.proof('use','현재 발명 설계 작동','success',{gap:v.s.design.gap,aligned:true});v.refresh();
  });
  v.button('next',()=>{v.a.values.round=1;v.a.points['use-handle']=remote?v.p('operating-magnet',m):pt(50,37);v.refresh();});
  v.button('adjust',()=>{v.a.values.adjusting=!v.a.values.adjusting;delete v.a.points['operating-magnet'];delete v.a.points['operating-target'];v.a.points['use-handle']={...v.p('design-magnet',m)};v.refresh();});
  v.button('flip',()=>{v.s.design.pole=opposite(v.s.design.pole);change();});
  if(v.has('use1')){
    const zone=document.createElement('div');zone.className='force-drop-zone';zone.style.left=`${forceSpot.x}%`;zone.style.top=`${forceSpot.y}%`;zone.setAttribute('aria-hidden','true');v.c.root.querySelector('.mission-board')!.append(zone);
    v.drag('force-arrow',pt(16,78),p=>{if(distance(p,forceSpot)<11){v.mark('force-arrow','힘이 작용한 곳 표현','내 발명품의 자석과 대상 사이에 힘 화살표를 놓았어.');v.tell('그 자리에서 어떤 물체가 어떤 물체를 당겼는지 이야기해 줘.',true);}else v.tell('선택한 화살표를 ‘힘이 작용한 곳’ 점선 안에 놓아 줘.');v.draw();});
  }
}
