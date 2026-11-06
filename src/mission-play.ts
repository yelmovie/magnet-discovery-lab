import { emptyActivity, opposite, record, type Activity, type Point, type Pole, type Save } from './domain';
import { ironNutArt, materialBins, materialCatalog, materialClassified, sortedMaterialPosition, sortingSpecimens } from './material-sorting';
import type { Context, View } from './activity-types';
import { bindDrag, placementControls } from './manipulation';
import { addTrial, trialOutcome, type TrialObject } from './trial-records';
import { assemblyAligned, assemblyIssue, distance, cellLabel, clearanceCells, nearRulerMark, distanceRuler, magneticReach, paperGapMiddle, ringFloating } from './mission-model';
import { shakePrompt, missionGuides, missionQuestions, questRewards } from './mission-content';
import { playEffect, type EffectKind } from './game-audio';
import { mailbox, lidPosition, inSocket, magnetInstalled, mountedMagnet, updateMailboxLayout } from './mailbox';
import { drawMailbox, drawAssemblyCase, drawMagnetTray } from './mailbox-art';
import { clipCompareView, clipStops, pullEase } from './clip-comparison';
import { handImages, handPose, handRelease, afterHandRelease } from './experiment-hand';
import { clearedGlass, drawGlassStain, glassStains, wipeGlass } from './aquarium-glass';
import { mailboxParts, partKey, partInstalled, nextMailboxPart, mailboxAssembled, prepareMailboxAssembly, assemblyNear, type MailboxPart } from './mailbox-assembly';

const W = 1280, H = 720;
const pt = (x: number, y: number): Point => ({ x, y });
const paperStart=pt(20,58);
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
    const controller=new AbortController();
    c.root.addEventListener('pointerdown',event=>{
      const piece=(event.target as HTMLElement).closest<HTMLElement>('[data-drag]');
      if(piece)playEffect(piece.dataset.drag==='lid'||piece.dataset.drag==='use-handle'?'lid':'pick',c.s.settings);
    },{signal:controller.signal});
    this.cleanups.push(()=>controller.abort());
  }
  get a() { return this.c.a; }
  get s() { return this.c.s; }
  get compact() { return this.a.values.paceVersion === 1; }
  p(id: string, fallback: Point) { return this.a.points[id] ||= { ...fallback }; }
  set(id: string, p: Point) { this.a.points[id] = { ...p }; const el = this.c.root.querySelector<HTMLElement>(`[data-drag="${id}"], [data-object="${id}"]`); if (el) { el.style.left = `${p.x}%`; el.style.top = `${p.y}%`; } }
  has(key: string) { return this.a.values[key] === true; }
  mark(key: string, label: string, result: string) { this.a.values[key] = true; record(this.a, { key, label, result }); this.c.touch(); this.c.meta(); }
  tell(text: string, success = false, effect: EffectKind = 'success') {
    if(this.feedback===text&&!success)return;
    this.feedback = text;
    const out = this.c.root.querySelector<HTMLElement>('.mission-feedback'); if (out) { out.textContent = text; out.classList.toggle('success', success); }
    this.c.root.closest('.quest-activity')?.dispatchEvent(new Event('coach-update'));
    if(success)playEffect(effect,this.s.settings);
  }
  proof(key: string, label: string, outcome = 'success', extra: Record<string, string | number | boolean> = {}) {
    const objects = Object.entries(this.a.points).filter(([id]) => !id.startsWith('initial:')&&!id.startsWith('assembly-')).map(([id, p]) => ({ id, ...p }));
    const trial=addTrial(this.a, { key, activity: this.n, conditions: { label, ...extra }, initialObjects: Object.entries(this.a.points).filter(([id]) => id.startsWith('initial:')&&!id.startsWith('initial:assembly-')).map(([id, p]) => ({ id: id.slice(8), ...p })), objects, input: this.path, outcome, designRevision: this.s.design.revision, template: this.s.design.template, pinned: true });
    record(this.a, { key, label, result: trialOutcome(outcome) }); this.c.touch(); this.c.meta(); this.path = [];return trial;
  }
  button(id: string, fn: () => void) { this.c.root.querySelector(`[data-mission="${id}"]`)?.addEventListener('click', fn); }
  drag(id: string, fallback: Point, end: (p: Point) => void, move?: (p: Point) => void, constrain?: (p: Point) => Point) {
    const start = constrain ? constrain(this.p(id, fallback)) : this.p(id, fallback); this.set(id,start); this.cleanups.push(bindDrag(this.c, id, start, p => { this.set(id, p); playEffect('drop',this.s.settings); end(p); this.c.touch(); this.c.meta(); }, p => {
      this.set(id, p); if (this.path.length < 240 && (!this.path.length || distance(p, this.path[this.path.length - 1]) > 1)) this.path.push({ ...p }); move?.(p); this.draw();
    }, constrain));
  }
  refresh() { this.c.touch(); this.c.refresh(); }
  settle(targets: Record<string,Point>, finish: () => void, ease=(t:number)=>1-Math.pow(1-t,3),duration=650) {
    if(this.animating)return;
    if(!this.s.settings.motion){Object.entries(targets).forEach(([id,p])=>this.set(id,p));this.draw();finish();return;}
    this.animating=true;
    const starts=Object.fromEntries(Object.keys(targets).map(id=>[id,{...this.a.points[id]}]));
    let raf=0,elapsed=0,previous=performance.now();this.c.root.inert=true;
    const frame=(now:number)=>{
      if(this.stopped)return;
      const dt=Math.min(50,now-previous);previous=now;
      if(this.c.root.dataset.demoPaused===undefined&&!document.hidden&&!document.querySelector('dialog[open],.modal-backdrop'))elapsed+=dt;
      const t=Math.min(1,elapsed/duration),k=ease(t);
      Object.entries(targets).forEach(([id,p])=>this.set(id,pt(starts[id].x+(p.x-starts[id].x)*k,starts[id].y+(p.y-starts[id].y)*k)));this.draw();
      if(t<1)raf=requestAnimationFrame(frame);else{this.c.root.inert=false;this.animating=false;finish();}
    };
    raf=requestAnimationFrame(frame);this.cleanups.push(()=>{cancelAnimationFrame(raf);this.c.root.inert=false;this.animating=false;});
  }
  draw = () => {};
  hand(contact: Point, release: number, object: string) {
    const pose = handPose(contact, release);
    const img = this.asset(pose.image, pose.image);
    if (img.complete && img.naturalWidth) {
      this.ctx.save(); this.ctx.globalAlpha = pose.alpha;
      this.ctx.drawImage(img, pose.x, pose.y, pose.size, pose.size); this.ctx.restore();
    }
    this.c.root.dataset.handState = release > 0 ? 'released' : 'held';
    this.label(release > 0 ? '손을 뗐어' : `${object}${object==='클립'?'을':'를'} 잡고 있어`, pt(contact.x + 15, contact.y + 6), true);
  }
  base() {
    this.ctx.clearRect(0, 0, W, H);
    // Quiet the detailed room behind the actual draggable apparatus.
    const mat=this.ctx;mat.save();mat.shadowColor='#193f3a28';mat.shadowBlur=18;mat.shadowOffsetY=7;
    mat.fillStyle='#fff9ebdf';mat.strokeStyle='#c5ac76';mat.lineWidth=2;
    const wide=(this.n===8||this.n===9||this.n===10)&&this.c.root.querySelector('.bench-wide');
    mat.beginPath();if(wide)mat.roundRect(30,108,1220,480,26);else mat.roundRect(128,226,1080,384,26);
    mat.fill();mat.shadowBlur=0;mat.shadowOffsetY=0;mat.stroke();mat.restore();
    // Movement stays in the experiment record; the live bench shows only objects and targets.
    const sensor=this.c.root.querySelector<HTMLElement>('.force-sensor');
    if(sensor&&this.n!==4){
      let d=100;
      if(this.n===3){const m=this.a.points['sweep-magnet']||pt(20,39);d=Math.min(...sortingSpecimens.map(item=>this.has(`sorted-${item.id}`)?100:distance(m,this.a.points[`material-${item.index}`]||item)));}
      if(this.n===7)d=distance(this.a.points.cleaner||pt(27,47),this.a.points['inner-pad']||pt(29,48));
      const level=Math.max(0,Math.min(100,(22-d)/22*100));
      sensor.style.setProperty('--sensor-level',`${level}%`);const text=sensor.querySelector('span');if(text)text.textContent=d<15?'가까운 배치':d<23?'조금 더 가까이':'멀리 떨어진 배치';
    }
  }
  asset(name:string,src:string):HTMLImageElement {
    let img=sprites.get(name);
    if(!img){img=new Image();sprites.set(name,img);img.src=src;}
    if((!img.complete||!img.naturalWidth)&&!this.watchedImages.has(img)){
      this.watchedImages.add(img);
      const canvas=this.c.root.querySelector<HTMLCanvasElement>('canvas')!;
      canvas.dataset.pendingArt='true';
      const redraw=()=>{
        if(this.stopped)return;
        this.watchedImages.delete(img);
        this.draw();
        if(!this.watchedImages.size)delete canvas.dataset.pendingArt;
      };
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
  material(index:number,p:Point,size=92,showName=true) {
    const specimen=materialCatalog[index],nut=specimen.id==='nut';
    const img=nut?this.asset('iron-nut',ironNutArt):this.asset('material-kit','/assets/quest/material-kit.webp');
    if(img.complete&&img.naturalWidth){
      const cw=img.naturalWidth/(nut?1:3),ch=img.naturalHeight/(nut?1:2);
      this.ctx.drawImage(img,nut?0:(index%3)*cw,nut?0:Math.floor(index/3)*ch,cw,ch,p.x*W/100-size/2,p.y*H/100-size/2,size,size);
    }else this.iron(p,'',size*.65);
    if(showName)this.label(specimen.name,pt(p.x,p.y+8),true);
  }
  label(text: string, p: Point, small = false, color = '#203e40') {
    // The inquiry header already gives this instruction and progress count.
    if(this.a.values.inquiryVersion&&p.x===50&&(p.y===26||p.y===29))return;
    const g = this.ctx,scale=this.c.root.querySelector('canvas')!.getBoundingClientRect().width/W,font=Math.max(small?20:26,(small?16:20)/Math.max(.5,scale));g.save(); g.font = `${small?'600':'700'} ${font}px "Magnet Quest Sans", Pretendard, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 7; g.strokeStyle = '#fff8e4ed'; g.strokeText(text, p.x / 100 * W, p.y / 100 * H); g.fillStyle = color; g.fillText(text, p.x / 100 * W, p.y / 100 * H); g.restore();
  }
  target(p: Point, name: string, w = 130, h = 90) {
    const g = this.ctx, x = p.x / 100 * W, y = p.y / 100 * H; g.save(); g.setLineDash([9, 8]); g.strokeStyle = '#2d7f71'; g.lineWidth = 3;
    g.fillStyle = '#fff9e77a'; g.beginPath(); g.roundRect(x-w/2, y-h/2, w, h, 18); g.fill();
    const picture=name==='관찰 돋보기'?'lens':name.includes('재료')?'tray':null;
    if(picture){const img=this.asset(`learning-${picture}`,picture==='tray'?'/assets/quest/material-tray.webp':`/assets/learning/${picture}.webp`);if(img.complete&&img.naturalWidth){g.save();g.clip();const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);g.drawImage(img,x-img.naturalWidth*scale/2,y-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);g.restore();}}
    g.stroke(); g.restore(); if (name) this.label(name, pt(p.x, p.y + h / H * 50 + 3), true);
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
  hardware(part:'handle'|'plate'|'socket'|'magnet',p:Point){
    if(part==='handle'){
      const pull=this.asset('mailbox-pull-handle','/assets/quest/mailbox-pull-handle.webp');
      if(pull.complete && pull.naturalWidth){
        const width=115, height=width*pull.naturalHeight/pull.naturalWidth;
        this.ctx.drawImage(pull,p.x*W/100-width/2,p.y*H/100-height/2,width,height);
        return;
      }
    }
    const frames={handle:[2,2,316,106,115,48],plate:[25,112,294,88,80,18],socket:[0,225,319,109,112,31],magnet:[24,337,294,110,80,20]};
    const [sx,sy,sw,sh,w,h]=frames[part],x=p.x*W/100,y=p.y*H/100;
    const img=this.asset('mailbox-hardware','/assets/quest/mailbox-hardware.webp');
    if(img.complete&&img.naturalWidth)this.ctx.drawImage(img,sx,sy,sw,sh,x-w/2,y-h/2,w,h);
    else if(part==='magnet')this.magnet(p,'N',.54);
    else {const g=this.ctx;g.save();g.fillStyle={handle:'#ab703a',plate:'#9aa7ac',socket:'#69462c'}[part];g.beginPath();g.roundRect(x-w/2,y-h/2,w,h,6);g.fill();g.restore();}
  }
  fixedPlate(p:Point){
    this.hardware('plate',p);
  }
  mailboxBody(index:number,handle:Point,showPlate=true,caption=index?'당이의 책 보관함':'밀이의 우편함',repaired=false,showContents=true){
    const open=(mailbox.handleClosed.y-handle.y)/(mailbox.handleClosed.y-mailbox.handleOpen.y);
    const item=index?'book':'letter';
    drawMailbox(this.ctx,this.asset('mailbox-wood','/assets/quest/mailbox-wood.webp'),handle,
      showContents?this.asset(item,`/assets/quest/prop-${item}.webp`):undefined,showPlate&&open>.23?()=>this.fixedPlate(mailbox.plate):undefined);
    if(open>.58)this.hardware('socket',mountedMagnet(handle));
    this.hardware('handle',lidPosition(handle));
    const g=this.ctx;
    g.save();g.translate(596,503);g.rotate(.041);
    g.fillStyle=repaired?'#265345':'#49311e';g.strokeStyle='#dfba71';g.lineWidth=2;
    g.beginPath();g.roundRect(-89,-17,178,34,5);g.fill();g.stroke();
    g.textAlign='center';g.textBaseline='middle';g.font='bold 20px sans-serif';g.fillStyle='#fff1cb';
    g.fillText(repaired?'✓ 수리 완료':caption,0,1,166);g.restore();
  }
  cleanup() { this.stopped=true;this.cleanups.forEach(fn=>fn()); }
}

function hit(h: Hit) {
  // Match the whole pictured object, including its ends, rather than only its centre.
  const handle=h.id==='lid'||h.kind==='lid-handle';
  const sticker=/^sticker[NS]$/.test(h.id);
  const magnet=/magnet|probe|controller|cleaner/.test(h.id)||h.kind==='remote-handle';
  const magnetWidth:Record<string,number>={'hidden-magnet':116,'repair-magnet':116,'sweep-magnet':144,'distance-magnet':130,probe:192,cleaner:102,controller:116,'design-magnet':124,'use-handle':124};
  const assemblyPart=mailboxParts.find(part=>partKey(part)===h.id);
  const size=assemblyPart?assemblyPart.size:handle?[130,66]:/^ring/.test(h.id)?[166,75]:/^material/.test(h.id)?[102,102]:h.id==='paper'?[102,146]:h.id==='base'?[204,148]:magnet?[magnetWidth[h.id]||156,68]:h.id==='design-target'?[128,76]:[72,72];
  const grip=sticker?`<span class="canvas-pole-sticker pole-${h.id.slice(-1)}" aria-hidden="true">${h.id.slice(-1)}</span>`:'';
  return `<button class="canvas-hit ${h.kind ? `canvas-${h.kind}` : ''} ${handle?'canvas-handle':''} ${magnet?'canvas-magnet-hit':''}" data-drag="${h.id}" style="left:${h.p.x}%;top:${h.p.y}%;width:${size[0]/W*100}%;height:${size[1]/H*100}%" aria-label="${e(h.label)}. 끌어서 이동, 방향키로 이동 후 Enter로 놓기.">${grip}<span class="sr-only">${e(h.label)}</span></button>`;
}
function action(id: string, text: string, disabled = false) { return `<button class="mission-action" data-mission="${id}" ${disabled?'disabled':''}>${text}</button>`; }
function inspectionNote(a:Activity) {
  if(a.values.assemblyVersion===1){
    const count=mailboxParts.filter(part=>partInstalled(a,part)).length, done=a.values.latch0===true;
    return `<div class="inspection-note" data-inspection-step="${done?2:count===6?1:0}" role="status" aria-live="polite"><span class="inspection-symbol" aria-hidden="true">${done?'✓':count}</span><strong>${done?'조립·확인 완료':count===6?'이제 닫아 보자':'내 손으로 조립'} <small>${done?7:count}/7</small></strong><p>${done?'자석이 철판을 붙잡았어':nextMailboxPart(a)?.name||'손잡이를 아래로 내려 봐'}</p></div>`;
  }
  const round=Number(a.values.round||0);
  const found=a.values[`found${round}`]===true, done=a.values[`latch${round}`]===true;
  const step=done?2:found?1:0;
  return `<div class="inspection-note" data-inspection-step="${step}" role="status" aria-live="polite">
    <span class="inspection-symbol" aria-hidden="true">${done?'✓':found?'1':'?'}</span>
    <strong>${done?'조사 완료':found?'부품 발견':'조사 전'} <small>${step}/2</small></strong>
    <ol><li data-done="${found}"><span aria-hidden="true">${found?'✓':'1'}</span>열어 부품 찾기</li><li data-done="${done}"><span aria-hidden="true">${done?'✓':'2'}</span>닫아 붙는지 확인</li></ol>
  </div>`;
}
function initialize(a: Activity) {
  if(a.values.playVersion===4)return;
  // Completed historical evidence is immutable. New attempts start a coherent new experiment.
  const fresh=emptyActivity();a.points=fresh.points;a.values={playVersion:4,mechanicsVersion:1,paceVersion:1};a.records=fresh.records;a.trials=[];a.mask=[];
  a.values.round=0;
}
export function missionView(n: number, a: Activity, s: Save): View {
  initialize(a);
  const round=Number(a.values.round||0), compact=a.values.paceVersion===1, hits:Hit[]=[];let actions='', comparison='';
  if(n<=2)updateMailboxLayout(a);
  const p=(id:string, fallback:Point)=>a.points[id]||fallback;
  if(n===1){
    prepareMailboxAssembly(a);
    if(!mailboxAssembled(a)){
      const next=nextMailboxPart(a)!;
      for(const part of mailboxParts)hits.push({id:partKey(part),p:p(partKey(part),part.start),label:part.name});
      actions=action('fit-part',`${mailboxParts.indexOf(next)+1}. ${next.button}`);
    }else{
    comparison=`<aside class="mailbox-inspection" aria-label="우편함 조사 진행">${inspectionNote(a)}</aside>`;
    if(a.values.fixedMailbox!==true){
      delete a.points['hidden-magnet'];
      delete a.points['initial:hidden-magnet'];
      a.points.lid=a.values[`latch${round}`]?mailbox.handleClosed:a.values[`found${round}`]?mailbox.handleOpen:mailbox.handleClosed;
      a.values.fixedMailbox=true;
    }
    hits.push({id:'lid',p:p('lid',mailbox.handleClosed),label:'나무 손잡이. 위로 열고 아래로 닫기'});
    const inspected=a.values[`latch${round}`]===true;
    if(!compact&&inspected&&round===0)actions+=action('next','책 보관함도 살펴보기 →');
    }
  }
  if(n===2){hits.push({id:'repair-magnet',p:p('repair-magnet',mailbox.looseMagnet),label:'넣고 뺄 수 있는 자석'},{id:'lid',p:p('lid',mailbox.handleOpen),label:'덮개 손잡이'});if(round===2)hits.push({id:'repair-plate',p:p('repair-plate',pt(75,47)),label:'자리가 어긋난 철판'});actions=action('shake','흔들어 열리는지 보기');if(!compact&&a.values.with0&&a.values.without0&&round===0)actions=action('next','책 보관함도 고쳐 주기 →');if(a.values.with1&&a.values.without1&&round===1)actions=action('next','새 우편함의 철판도 맞춰 줘 →');}
  if(n===2&&round===2&&!a.values.diagnosis2)actions+=`<div class="mission-diagnosis">${action('fault-distance','철판 위치를 고칠래')}${action('fault-color','자석 색을 바꿀래')}</div>`;
  if(n===3){hits.push({id:'sweep-magnet',p:p('sweep-magnet',pt(20,39)),label:'수리 키트의 자석'});sortingSpecimens.forEach(m=>{if(!a.values[`sorted-${m.id}`])hits.push({id:`material-${m.index}`,p:p(`material-${m.index}`,m),label:`${m.name}. 자석 반응을 확인한 뒤 알맞은 분류함으로 옮기기`});});}
  if(n===4){
    hits.push({id:'distance-magnet',p:p('distance-magnet',pt(25,55)),label:'눈금 위에서 좌우로 움직이는 조사 자석'});
    if(round===2){
      if(a.points.paper?.x===23&&a.points.paper.y===76)a.points.paper={...paperStart};
      hits.push({id:'paper',p:p('paper',paperStart),label:'얇은 종이 한 장'});
    }
    actions=action('release',`<img class="release-hand-icon" src="${handImages.released}" alt="">손 놓고 관찰`,a.values[`done${round}`]===true);
    if(round===1&&!a.values.done1)comparison=`<div class="distance-choices" role="group" aria-label="붙을 것 같은 자리 고르기"><span>붙을 것 같은 곳은?</span>${[4,3,2,1].map(mark=>action(`gap-${mark}`,`${mark}칸`)).join('')}</div>`;
    if(a.values[`done${round}`]&&round<(compact?2:3))actions=action('next',round===0?'붙을 것 같은 자리 고르기 →':round===1?'같은 배치에 종이만 넣어 보기 →':'이번엔 철 열쇠를 구하자 →');
  }
  if(n===4&&round===2&&a.values.done2){
    const stops=clipStops(a.trials);
    if(stops){comparison=clipCompareView(stops);actions=action('replay-pull','▶ 두 실험 다시 보기')+(compact?'':actions);}
  }
  if(n===5){hits.push({id:'probe',p:p('probe',pt(29,54)),label:'기준 자석'},{id:'stickerN',p:p('stickerN',pt(33,78)),label:'N극 스티커'},{id:'stickerS',p:p('stickerS',pt(47,78)),label:'S극 스티커'});actions=action('flip','기준 자석 뒤집기');if(!compact&&a.values.solved0&&a.values.test0N&&a.values.test0S&&round===0)actions=action('next','두 번째 문 자석 조사 →');}
  if(n===6){for(let i=0;i<(compact||round===0?2:3);i++)hits.push({id:`ring${i}`,p:p(`ring${i}`,pt(23+i*16,73)),label:`${i+1}번 고리자석`});actions=action('check',`<img class="release-hand-icon" src="${handImages.released}" alt="">손 놓고 고리 관찰`);if(a.values[`done${round}`]&&round<2)actions=action('next',compact?'이번엔 두 고리를 붙여 줘! →':round===0?'세 개도 띄워 볼까? →':'이번엔 모두 붙여 줘! →');}
  if(n===7)hits.push({id:'cleaner',p:p('cleaner',pt(27,47)),label:'유리 밖 청소 자석 손잡이'});
  if(n===8){hits.push({id:'controller',p:p('controller',pt(20,40)),label:'택배 조종 자석'});actions=action('flip','조종 자석 뒤집기')+action('detach','자석 떼기');}
  if(n===9){
    if(!a.values.chosen)actions=`<div class="mission-requests workshop-requests">${action('box','<img src="/assets/learning/mailbox.webp" alt="">우편함이 자꾸 열려요')}${action('remote','<img src="/assets/learning/aquarium.webp" alt="">유리 너머 패드를 옮겨 주세요')}</div>`;
    else {hits.push({id:'base',p:p('base',pt(18,65)),label:'장치 몸체'},{id:'design-magnet',p:p('design-magnet',pt(22,44)),label:'설계 자석'},{id:'design-target',p:p('design-target',pt(77,45)),label:'마주 볼 철판 또는 자석'});actions=action('pair',s.design.pair==='iron'?'자석으로 바꾸기':'철판으로 바꾸기')+action('flip','자석 뒤집기')+action('prototype','시제품 반응 시험');}
  }
  if(n===10){
    const remote=s.design.template==='remote',magnet=s.activities[9]?.points['design-magnet']||pt(43,55),target=s.activities[9]?.points['design-target']||pt(57,55);
    if(a.values.adjusting){
      hits.push({id:'design-magnet',p:p('design-magnet',magnet),label:'내 설계 자석'},{id:'design-target',p:p('design-target',target),label:'내 설계 대상 부품'});
      actions=action('flip','자석 뒤집기')+action('adjust','조작 손잡이로');
    }else{
      hits.push({id:'use-handle',kind:remote?'remote-handle':'lid-handle',p:p('use-handle',remote?magnet:mailbox.handleOpen),label:remote?'유리 밖 빨간 조작 손잡이':'우편함 덮개의 나무 손잡이'});
      actions=(!compact&&a.values.use0&&round===0?action('next','다른 사용 상황으로 시험 →'):action('test','사용 시험'))+action('adjust','배치 고치기');
      if(!compact&&a.values.use1)hits.push({id:'force-arrow',p:p('force-arrow',pt(16,78)),label:'힘이 작용한 곳을 나타낼 화살표'});
    }
  }
  const stage=Math.floor((n-1)/2), tool=stage&&n!==8?questRewards[stage-1]:null;
  const canExpand=n===8||n===9||n===10;
  const wide=canExpand&&(a.values.benchWide===true||(a.values.benchWide===undefined&&n===8));
  const viewToggle=canExpand?`<button type="button" class="quest-text-button bench-view-toggle" data-mission="bench-view" aria-pressed="${wide}" aria-label="조작 화면 전체보기">${wide?'기본 보기':'조작 화면 전체보기'}</button>`:'';
  return {html:`<div class="mission-world stage-${stage+1}${wide?' bench-wide':''}" style="--mission-background:url('/assets/quest/stage-${themes[stage]}.webp')"><div class="mission-board play-board" aria-label="${e(missionQuestions[n-1])}"><canvas width="1280" height="720" aria-hidden="true"></canvas>${hits.map(hit).join('')}${comparison}<div class="mission-actions">${actions}</div><p class="mission-feedback" role="status" aria-live="polite"></p>${n===4?'<div class="force-sensor" role="status"><span>출발 간격</span></div>':[3,7].includes(n)?'<div class="force-sensor" aria-label="물체 사이 거리"><span>거리를 바꿔 봐</span><i aria-hidden="true"></i></div>':''}${tool?`<button class="mission-pocket" data-mission="tool" aria-label="${tool.name} 사용 도움">${e(tool.name)}</button>`:''}${n===6?'<button class="mission-action mission-3d" data-mission="view3d">3D로 돌려 보기</button>':''}</div>${viewToggle}<details class="mission-access"><summary>눌러서 이동</summary>${placementControls}</details></div>`,bind(c){
    const surface=new Surface(c,n);surface.button('tool',()=>{if(n===5){surface.a.values.lens=!surface.a.values.lens;surface.tell('관찰 렌즈로 처음 위치와 움직인 방향을 함께 볼 수 있어.');surface.draw();}else c.notify(tool?tool.use:missionGuides[n-1]);});
    surface.button('bench-view',()=>{
      const world=c.root.querySelector<HTMLElement>('.mission-world')!,button=c.root.querySelector<HTMLButtonElement>('[data-mission="bench-view"]')!;
      const expanded=world.classList.toggle('bench-wide');
      button.setAttribute('aria-pressed',String(expanded));button.textContent=expanded?'기본 보기':'조작 화면 전체보기';
      a.values.benchWide=expanded;c.touch();surface.draw();
    });
    const binders=[inspect,repair,salvage,distanceLab,poles,rings,aquarium,delivery,design,useDesign];binders[n-1](surface);surface.draw();return()=>surface.cleanup();
  }};
}

function inspect(v: Surface){
  if(!mailboxAssembled(v.a)){assembleMailbox(v);return;}
  const round=Number(v.a.values.round||0);
  const found=()=>v.has(`found${round}`);
  const latched=()=>v.has(`latch${round}`);
  const lid=v.c.root.querySelector<HTMLButtonElement>('[data-drag="lid"]')!;
  const {handleOpen,handleClosed,plate}=mailbox;
  // The magnet belongs to the lid. Only the handle is an input.
  const opening=(handle:Point)=>(handleClosed.y-handle.y)/(handleClosed.y-handleOpen.y);
  const mount=(fraction:number)=>mountedMagnet(lidPosition(pt(0,handleClosed.y-(handleClosed.y-handleOpen.y)*fraction)));

  function showCutaway(fraction:number){
    const g=v.ctx, centre=pt(80,55),cx=centre.x*W/100,cy=centre.y*H/100;
    g.save();g.fillStyle='#fffaf0';g.strokeStyle='#91754d';g.lineWidth=3;
    g.beginPath();g.roundRect(cx-102,cy-74,204,148,18);g.fill();g.stroke();g.restore();
    v.label('닫힐 때 안쪽',pt(centre.x,centre.y-7.1),true);
    const bar=pt(centre.x,centre.y+4), top=pt(bar.x,bar.y-19/(H/100)-4.1*fraction);
    v.hardware('plate',bar);
    v.hardware('magnet',top);
    v.label(latched()?'두 부품이 붙었어':'닫으면 두 부품이 만나',pt(centre.x,centre.y+14),true);
  }
  v.draw=()=>{
    const handle=v.p('lid',handleClosed), fraction=opening(handle);
    lid.disabled=v.animating||latched();
    const note=v.c.root.querySelector<HTMLElement>('.mailbox-inspection');
    const step=latched()?2:found()?1:0;
    if(note&&note.dataset.step!==String(step)){
      note.innerHTML=inspectionNote(v.a);note.dataset.step=String(step);
    }
    const item=round?'책 보관함':'우편함';
    const assembled=v.a.values.assemblyVersion===1;
    v.base();v.mailboxBody(round,handle,true,assembled?'내가 조립한 우편함':latched()?'✓ 조사 완료':found()?'안쪽 부품 발견':`조사할 ${item}`,assembled&&latched(),!assembled);
    if(fraction>.58)v.hardware('magnet',mount(fraction));
    if(fraction>.65){const spot=mount(fraction);v.label('덮개에 고정된 자석',pt(spot.x,spot.y+4.3),true);}
    if(found()||fraction>.65){
      if(fraction>.65)v.label('몸체 안쪽 철판',pt(plate.x,plate.y-4.5),true);
      showCutaway(fraction);
    }
    if(!latched()){
      const x=handle.x-8,delta=found()?8:-8;
      v.arrow(pt(x,handle.y),pt(x,handle.y+delta));
    }
  };
  function observe(){
    if(found())return;
    v.set('fixed-magnet',mount(1));v.set('fixed-plate',plate);
    v.mark(`open${round}`,'덮개 열기','손잡이를 올려 덮개 안쪽을 열었어.');
    v.mark(`found${round}`,'고정된 부품 관찰','자석은 덮개에, 철판은 몸체에 붙어 있었어.');
    v.proof(`inspect${round}`,'열린 덮개의 자석과 몸체의 철판 관찰');
    v.tell('덮개에는 자석, 몸체에는 철판이 있어. 이제 손잡이를 내려 봐.');
  }
  function closeLatch(){
    v.set('initial:fixed-magnet',mount(1));v.set('initial:fixed-plate',plate);
    v.settle({lid:handleClosed},()=>{
      v.set('fixed-magnet',mount(0));
      v.mark(`latch${round}`,'덮개가 붙잡힌 까닭','덮개를 내리니 자석이 몸체의 철판에 붙었어.');
      v.proof(`latch${round}`,'덮개를 닫아 자석과 철판이 붙는 모습 관찰');
      v.tell('착! 덮개의 자석과 몸체의 철판이 붙어서 닫혔어.',true,'snap');
      v.draw();if(!v.compact&&round===0)v.refresh();
    });
  }
  function dropHandle(p:Point){
    if(latched())return;
    if(opening(p)>.8){v.set('lid',handleOpen);observe();}
    else if(found()&&p.y>=handleClosed.y-4){closeLatch();}
    else v.tell(found()?'손잡이를 아래로 더 내려 철판 가까이 가져가 봐.':'나무 손잡이를 위로 끝까지 올려 봐.');
    if(!v.stopped)v.draw();
  }
  v.drag('lid',handleClosed,dropHandle,undefined,lidPosition);

  v.button('next',()=>{v.a.values.round=1;v.a.points={};v.refresh();});
}
function assembleMailbox(v:Surface){
  const narrowTray=typeof matchMedia==='function'?matchMedia('(max-width: 520px) and (orientation: portrait)'):undefined;
  const wood=v.asset('mailbox-wood','/assets/quest/mailbox-wood.webp');
  const anchor={body:pt(49,63),cover:pt(50.5,46)};
  function drawPart(part:MailboxPart){
    const id=partKey(part),seated=partInstalled(v.a,part),p=v.p(id,part.start),g=v.ctx;
    if(part.id==='body'||part.id==='cover'){
      const origin=anchor[part.id];
      g.save();g.translate((p.x-origin.x)*W/100,(p.y-origin.y)*H/100);
      drawMailbox(g,wood,mailbox.handleOpen,undefined,undefined,part.id==='body'?'body':'lid');g.restore();
    }else v.hardware(part.id==='grip'?'handle':part.id,p);
    if(!seated)v.label(part.name,pt(p.x,p.y+(part.id==='body'?15:part.id==='cover'?9:5.3)),true);
  }
  v.draw=()=>{
    v.base();
    const next=nextMailboxPart(v.a),g=v.ctx;
    // One work area and a tidy parts tray. Nothing is pre-attached to the box.
    g.save();g.fillStyle='#f0e3c9';g.strokeStyle='#cbb990';g.lineWidth=1.5;
    g.beginPath();g.roundRect(937,249,200,342,20);g.fill();g.stroke();g.restore();
    for(const part of mailboxParts){
      const el=v.c.root.querySelector<HTMLButtonElement>(`[data-drag="${partKey(part)}"]`)!;
      el.disabled=v.animating||partInstalled(v.a,part)||(narrowTray?.matches===true&&part!==next);
    }
    for(const part of mailboxParts.filter(part=>partInstalled(v.a,part)))drawPart(part);
    if(next){
      const wide=next.id==='body'?420:next.id==='cover'?340:120;
      v.target(next.target,'',wide,next.id==='body'?130:next.id==='cover'?70:45);
      const label=next.id==='body'?'몸체 놓는 자리':next.id==='cover'?'뚜껑 연결 자리':next.id==='plate'?'몸체 안쪽':'뚜껑 가운데';
      // A short callout lives beside the box, away from small hardware.
      v.label(next.id==='body'?'몸체 자리':`${mailboxParts.indexOf(next)+1}/6 · ${label}`,next.id==='body'?pt(64,62):pt(49,80),true);
    }
    for(const part of mailboxParts.filter(part=>!partInstalled(v.a,part)))drawPart(part);
  };
  function fit(part:MailboxPart,p:Point){
    const next=nextMailboxPart(v.a),id=partKey(part);
    if(v.animating||partInstalled(v.a,part))return;
    if(part!==next||!assemblyNear(p,part)){
      v.set(id,part.start);v.tell(part!==next?`먼저 ${next?.name}부터 놓아 줘.`:'초록 점선 가까이에 놓으면 딱 맞게 끼워져.');v.draw();return;
    }
    v.settle({[id]:part.target},()=>{
      v.a.values[id]=true;v.c.touch();v.c.meta();
      playEffect('snap',v.s.settings);
      if(mailboxAssembled(v.a)){
        v.set('lid',mailbox.handleOpen);v.a.values.fixedMailbox=true;
        v.set('fixed-magnet',mailbox.socket);v.set('fixed-plate',mailbox.plate);
        v.set('initial:fixed-magnet',mailbox.socket);v.set('initial:fixed-plate',mailbox.plate);
        v.mark('found0','우편함 부품 조립','뚜껑에 자석을, 몸체 안쪽에 철판을 직접 끼웠어.');
        v.proof('inspect0','분리된 부품으로 우편함을 조립하고 자석과 철판의 자리 확인','success',{assembled:true});
      }
      v.refresh();
    },undefined,350);
  }
  for(const part of mailboxParts)v.drag(partKey(part),partInstalled(v.a,part)?part.target:part.start,p=>fit(part,p));
  v.button('fit-part',()=>{const next=nextMailboxPart(v.a);if(next)fit(next,next.target);});
}
function repair(v: Surface){
  const i=Number(v.a.values.round||0);let closed=typeof v.a.values.repairClosed==='boolean'?v.has('repairClosed'):(v.a.points.lid?.y||38)>55;
  const setClosed=(value:boolean)=>{closed=value;v.a.values.repairClosed=value;v.set('lid',value?mailbox.handleClosed:mailbox.handleOpen);};
  setClosed(closed);
  let rattle=0;
  const installed=()=>magnetInstalled(v.p('repair-magnet',mailbox.looseMagnet));
  const plateAligned=()=>i<2||distance(v.p('repair-plate',pt(75,47)),mailbox.plate)<7;
  v.draw=()=>{
    const handle=v.p('lid',mailbox.handleOpen),magnet=v.c.root.querySelector<HTMLButtonElement>('[data-drag="repair-magnet"]')!;
    const mounted=installed(),insideVisible=(mailbox.handleClosed.y-handle.y)/(mailbox.handleClosed.y-mailbox.handleOpen.y)>.58;
    magnet.dataset.seated=String(mounted);
    // Keep the lid grip above and the seated magnet below their adjacent visual centres.
    magnet.style.transform=mounted?'translate(-50%, -8%)':'';
    if(mounted){const spot=mountedMagnet(handle);magnet.style.left=spot.x+'%';magnet.style.top=spot.y+'%';}
    magnet.disabled=closed&&mounted;
    v.base();drawMagnetTray(v.ctx,mailbox.looseMagnet);
    v.label('부품 받침',pt(mailbox.looseMagnet.x,mailbox.looseMagnet.y+8.4),true);
    v.ctx.save();v.ctx.translate(rattle,Math.abs(rattle)*-.22);
    v.mailboxBody(i===1?1:0,handle,plateAligned(),i===1?'수리할 책 보관함':'수리할 우편함',mounted&&closed&&plateAligned()&&v.has(`with${i}`)&&(i===2||v.has(`without${i}`)));
    if(mounted&&insideVisible)v.hardware('magnet',mountedMagnet(handle));
    if(insideVisible&&!mounted){const spot=mountedMagnet(handle);v.label('자석 끼우는 홈',pt(spot.x,spot.y+4.3),true);}
    if(i===2){
      if(!plateAligned())v.target(mailbox.plate,'철판 자리',94,45);
      if(!plateAligned())v.hardware('plate',v.p('repair-plate',pt(75,47)));
    }
    v.ctx.restore();
    if(!mounted){
      const loose=v.a.points['repair-magnet'];
      if(insideVisible && !v.animating && v.has(`without${i}`) && distance(loose,mailbox.looseMagnet)<1){
        v.arrow(pt(mailbox.looseMagnet.x+6.7,mailbox.looseMagnet.y-3),pt(mailbox.socket.x-6,mailbox.socket.y+.6),'#30766c');
      }
      v.ctx.save();v.ctx.shadowColor='#3b2b2370';v.ctx.shadowBlur=3;v.ctx.shadowOffsetY=2;
      v.hardware('magnet',loose);v.ctx.restore();
    }
    v.label(i===2?'새 우편함 · 철판 자리도 맞춰 줘!':`${v.has(`without${i}`)?'✓':'○'} 자석 없이   ${v.has(`with${i}`)?'✓':'○'} 자석 넣고`,pt(50,29),true);
  };
  v.drag('repair-magnet',mailbox.looseMagnet,p=>{
    if(closed&&inSocket(p)){v.set('repair-magnet',mailbox.looseMagnet);v.tell('먼저 손잡이를 올려야 안쪽 홈에 끼울 수 있어.');v.draw();return;}
    if(inSocket(p)){v.set('repair-magnet',mailbox.socket);playEffect('snap',v.s.settings);v.tell('홈에 자석을 끼웠어. 손잡이를 내려 덮어 봐.');}
    else v.set('repair-magnet',mailbox.looseMagnet);
    v.draw();
  });
  v.drag('lid',mailbox.handleOpen,p=>{setClosed(p.y>50);v.tell(closed?shakePrompt(v.has(`${installed()?'without':'with'}${i}`)):'손잡이를 아래로 내려 닫아 봐.');v.draw();},undefined,lidPosition);
  if(i===2)v.drag('repair-plate',pt(75,47),()=>{setClosed(false);if(!v.has('diagnosis2')){v.set('repair-plate',pt(75,47));v.tell('먼저 자석을 넣고 덮개가 열리는지 확인해 보자.');}else if(plateAligned())v.set('repair-plate',mailbox.plate);v.draw();});
  v.button('fault-distance',()=>{if(!v.has('faultObserved2'))return v.tell('자석을 넣고 덮개를 닫아 봐. 상자를 살짝 흔들면 덮개가 열릴까?');v.mark('diagnosis2','고장 원인 진단','자석이 있어도 철판이 멀면 붙잡지 못한다는 증거로 위치를 고치기로 했어.');v.tell('맞아. 자석과 철판이 너무 멀리 있어. 철판을 점선에 옮겨 고쳐 줘.',true);v.refresh();});
  v.button('fault-color',()=>v.tell('색을 바꾸어도 철판과의 거리는 같아. 자석과 철판이 놓인 곳을 살펴봐.'));
  v.button('shake',()=>{
    if(v.animating)return;
    if(!closed)return v.tell('먼저 덮개 손잡이를 아래로 내려 닫아 줘.');
    const locked=installed()&&plateAligned();
    playEffect('lid',v.s.settings);
    v.settle({lid:locked?mailbox.handleClosed:mailbox.handleOpen},()=>{
      rattle=0;setClosed(locked);
      if(locked){
        v.mark(`with${i}`,'자석을 넣고 같은 흔들림','자석이 철판을 당겨 덮개가 닫혀 있었어.');
        v.tell('흔들어도 닫혀 있어! 네가 끼운 자석이 철판을 붙잡았어.',true,'snap');
      }else{
        v.mark(`without${i}`,i===2?'새 우편함의 배치 검사':'자석 없이 같은 흔들림','덮개가 다시 열렸어.');
        if(i===2&&installed())v.mark('faultObserved2','고장 증거','자석을 넣어도 멀리 있는 철판을 붙잡지 못했어.');
        v.tell(i===2&&installed()?'자석은 있는데 덮개가 열렸어. 아래에서 고칠 곳을 골라 봐.':'덮개가 열렸어. 이번엔 홈에 자석을 끼워 봐.');
      }
      if(i===2?v.has('with2'):v.has(`with${i}`)&&v.has(`without${i}`)){
        v.proof(`repair${i}`,i===2?'새 장치의 철판 자리까지 고치기':'같은 장치의 자석 유무 비교');v.refresh();
      }else v.draw();
    },t=>{
      rattle=8*Math.sin(8*Math.PI*t)*Math.sin(Math.PI*t);
      const rise=clamp((t-.28)/.72,0,1);
      return rise*rise*(3-2*rise);
    });
  });
  v.button('next',()=>{v.a.values.round=i+1;v.a.values.repairClosed=false;v.a.points={};v.refresh();});
}
function salvage(v: Surface){
  let held=-1, heldSide=1;
  const magnet=v.p('sweep-magnet',pt(20,39)),bins=materialBins;
  const atPole=(p:Point)=>pt(p.x+heldSide*5,p.y+3.3);
  const sorted=()=>sortingSpecimens.filter(m=>materialClassified(v.a,m.id)).length;
  for(const m of sortingSpecimens)if(v.has(`sorted-${m.id}`))v.set(`material-${m.index}`,sortedMaterialPosition(m));
  const sort=(m:typeof sortingSpecimens[number],p:Point,byMagnet=false)=>{
    const i=m.index,bin=bins.findIndex(q=>distance(p,q)<10);
    if(bin<0)return false;
    if(!v.has(`tested-${m.id}`)){v.set(`material-${i}`,pt(m.x,m.y));v.tell(`${m.name}: 먼저 자석을 가까이 대고 반응을 확인해 줘.`);return false;}
    if((bin===0)!==m.magnetic){v.set(`material-${i}`,pt(m.x,m.y));held=-1;v.tell(m.id==='aluminum'?'알루미늄도 금속이지만 이번 자석에는 붙지 않았어. 관찰한 반응에 맞게 옮겨 줘.':'자석을 따라왔는지 떠올리고 알맞은 분류함에 옮겨 줘.');playEffect('bump',v.s.settings);return false;}
    v.mark(`sorted-${m.id}`,`${m.name} 분류`,bin===0?'붙는 재료로 분류했어.':'붙지 않는 재료로 분류했어.');
    if(m.magnetic&&byMagnet)v.mark(`delivered-${m.id}`,`${m.name} 운반`,'자석에 붙은 철 부품을 수리함으로 옮겼어.');
    v.set(`material-${i}`,sortedMaterialPosition(m));held=-1;
    const el=v.c.root.querySelector<HTMLButtonElement>(`[data-drag="material-${i}"]`);if(el){el.disabled=true;el.style.pointerEvents='none';}
    v.proof(`sort-${m.id}`,`${m.name} 관찰 후 분류`,'success',{material:m.id,magnetic:m.magnetic,byMagnet});
    const done=sorted(),total=sortingSpecimens.length;
    v.tell(done===total?'여섯 물건을 모두 분류했어! 금속이라고 모두 자석에 붙지는 않아.':`${m.name} 분류 완료! ${done}/${total}개를 분류했어.`,true);
    if(done===total)v.proof('materials','자석에 붙는 재료와 붙지 않는 재료를 관찰하고 분류');
    return true;
  };
  const scan=(p:Point)=>{
    if(held>=0){
      const m=sortingSpecimens.find(item=>item.index===held)!;
      const end=atPole(p);v.set(`material-${held}`,end);sort(m,end,true);return;
    }
    let nearest:typeof sortingSpecimens[number]|undefined,range=10;
    for(const m of sortingSpecimens){
      if(v.has(`sorted-${m.id}`))continue;
      const gap=distance(p,v.p(`material-${m.index}`,pt(m.x,m.y)));
      if(gap<range){nearest=m;range=gap;}
    }
    if(!nearest)return;
    const m=nearest,i=m.index,q=v.p(`material-${i}`,pt(m.x,m.y));
    if(!v.has(`tested-${m.id}`)){
      v.mark(`tested-${m.id}`,m.name,m.magnetic?'자석 가까이에서 붙었어.':'가까이 대도 따라오지 않았어.');
      v.tell(m.magnetic?'자석에 붙었어! 자석으로 오른쪽 위 수리함까지 옮겨 줘.':`${m.name}: 자석을 따라오지 않았어. 물건을 손으로 잡아 오른쪽 아래 분류함에 넣어 줘.`);
    }
    if(m.magnetic){held=i;heldSide=q.x>=p.x?1:-1;v.set(`material-${i}`,atPole(p));}
  };
  v.draw=()=>{
    v.base();v.target(bins[0],'붙는 재료 · 수리함',190,125);v.target(bins[1],'붙지 않는 재료 · 손으로',190,120);
    sortingSpecimens.forEach(m=>{
      const p=v.p(`material-${m.index}`,pt(m.x,m.y));
      if(v.has(`sorted-${m.id}`)){v.material(m.index,p,54,false);return;}
      v.material(m.index,p);
      if(v.has(`tested-${m.id}`))v.label(m.magnetic?'자석에 착!':'손으로 옮기기',pt(p.x,p.y-9),true);
    });
    v.magnet(v.p('sweep-magnet',magnet),'N',.9);
    v.label(`자석으로 조사하고 분류하기  ${sorted()}/${sortingSpecimens.length}`,pt(50,29),true);
  };
  v.drag('sweep-magnet',magnet,p=>{
    scan(p);
    if(held<0){
      const beside=sortingSpecimens.filter(m=>!m.magnetic&&!v.has(`sorted-${m.id}`)&&v.has(`tested-${m.id}`))
        .map(m=>v.p(`material-${m.index}`,pt(m.x,m.y))).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      if(beside&&distance(p,beside)<10)v.set('sweep-magnet',pt(beside.x-12,beside.y));
    }
    v.draw();
  },scan);
  sortingSpecimens.forEach(m=>{
    const i=m.index;if(v.has(`sorted-${m.id}`))return;
    v.drag(`material-${i}`,pt(m.x,m.y),p=>{if(held===i)held=-1;sort(m,p);v.draw();});
  });
}
function distanceLab(v: Surface){
  const r=Number(v.a.values.round||0),target=r===3?pt(69,42):pt(61,55);
  const key=['far','near','paper','rescue'][r];
  const nearTrial=v.a.trials?.find(t=>t.key==='near'&&t.outcome==='success');
  const previous=nearTrial?.initialObjects.find(o=>o.id==='magnet');
  const comparisonPoint=previous?pt(previous.x,previous.y):pt(49,55);
  const {cell,contact,clipTip}=distanceRuler;
  const paperSlot=paperGapMiddle(comparisonPoint,target);
  const paperIn=()=>distance(v.p('paper',paperStart),paperSlot)<5;
  const rail=(p:Point)=>r===2?{...comparisonPoint}:pt(clamp(p.x,target.x-contact-6*cell,target.x-contact-cell/2),target.y);
  const magnet=v.c.root.querySelector<HTMLButtonElement>('[data-drag="distance-magnet"]')!;
  const paper=v.c.root.querySelector<HTMLButtonElement>('[data-drag="paper"]');
  const sensor=v.c.root.querySelector<HTMLElement>('.force-sensor span');
  let result=v.has(`done${r}`), released=result?1:0;
  let observed=v.a.values.distanceObserved===true&&r===1&&!result;
  if(observed)released=1;
  const q=()=>v.a.points['distance-magnet'];
  const start=v.p('distance-magnet',pt(25,target.y));
  // Completed historical trials retain their original coordinates, including off-axis placements.
  const heldAgain=()=>{observed=false;released=0;delete v.a.values.distanceObserved;};
  v.drag('distance-magnet',start,()=>{if(!result)heldAgain();v.draw();},()=>{if(!result)heldAgain();},result?p=>p:rail);
  for(const mark of [4,3,2,1])v.button(`gap-${mark}`,()=>{
    if(v.animating||result)return;
    heldAgain();v.set('distance-magnet',pt(target.x-contact-mark*cell,target.y));
    v.tell(`${mark}칸을 골랐어. 손을 놓으면 클립이 움직일까?`);v.draw();v.c.touch();v.c.meta();
  });
  if(paper)v.drag('paper',paperStart,p=>{
    if(distance(p,paperSlot)<5)v.set('paper',paperSlot);
    v.draw();
  });
  function drawSheet(){
    const p=v.p('paper',paperStart),g=v.ctx;
    const gapWidth=clearanceCells(comparisonPoint,target)*cell*W/100;
    const seatedWidth=clamp(gapWidth*.78,32,66);
    const turn=1-clamp((distance(p,paperSlot)-5)/12,0,1);
    const width=88+(seatedWidth-88)*turn,height=132;
    if(paper)paper.style.width=`${(width+12)/W*100}%`;
    if(!paperIn())v.target(paperSlot,'',seatedWidth+8,height);
    g.save();g.translate(p.x*W/100,p.y*H/100);
    // The sheet turns into the gap; its long edge stays upright and its face remains visible.
    g.transform(1,-.07-.16*turn,-.055*(1-turn),1,0,0);
    g.shadowColor='#4b382d50';g.shadowBlur=3;g.shadowOffsetX=1.2;g.shadowOffsetY=2;
    if(!v.sprite('paper-sheet',-width/2,-height/2,width,height)){
      g.fillStyle='#fffdf5';g.beginPath();g.moveTo(-width/2,-height/2);
      g.lineTo(width/2-10,-height/2);g.lineTo(width/2,-height/2+12);
      g.lineTo(width/2,height/2);g.lineTo(-width/2,height/2);g.closePath();g.fill();
    }
    g.restore();
    if(!result)v.label('종이 한 장',pt(p.x,p.y-12),true);
  }
  function drawRuler(startGap:number){
    const g=v.ctx,zero=(target.x-clipTip)*W/100,unit=cell*W/100,y=(target.y+17)*H/100;
    const mark=zero-Math.min(6,startGap)*unit;
    g.save();g.fillStyle='#fff4cc';g.strokeStyle='#896d38';g.lineWidth=2;
    g.beginPath();g.roundRect(zero-6*unit-14,y-4,6*unit+28,42,7);g.fill();g.stroke();
    g.fillStyle='#afd7cc';g.fillRect(mark,y,zero-mark,8);
    for(let tick=0;tick<=12;tick++){
      const x=zero-tick/2*unit;
      g.beginPath();g.moveTo(x,y);g.lineTo(x,y+(tick%2?7:14));g.stroke();
      if(tick%2===0)v.label(String(tick/2),pt(x/W*100,(y+26)/H*100),true);
    }
    if(r!==1){
      const goal=r===0?5:r===2?clearanceCells(comparisonPoint,target):1;
      const goalX=zero-unit*goal;
      g.fillStyle='#926128';g.fillRect(goalX-3,y+36,6,7);
      v.label(r===2?'같은 자리':'처음 자리',pt(goalX/W*100,(y+56)/H*100),true,'#755023');
    }
    g.setLineDash([4,5]);g.strokeStyle='#386961';
    for(const x of [zero,mark]){g.beginPath();g.moveTo(x,(target.y+4)*H/100);g.lineTo(x,y);g.stroke();}
    g.setLineDash([]);g.fillStyle='#2c726b';g.beginPath();g.moveTo(mark,y);g.lineTo(mark-7,y-9);g.lineTo(mark+7,y-9);g.fill();g.restore();
  }
  function landingPoint(m:Point){
    const d=distance(m,target);
    // Paper can transmit the attraction but is a physical barrier to the clip.
    const travel=r===2?Math.max(0,(d-contact)/2-.3):Math.max(0,d-contact);
    const t=d?travel/d:0;
    return pt(target.x+(m.x-target.x)*t,target.y+(m.y-target.y)*t);
  }
  v.draw=()=>{
    v.base();
    const m=q(),gap=clearanceCells(m,target),object=result&&r>0?(v.animating?v.a.points['moving-clip']:landingPoint(m)):target;
    magnet.disabled=result||r===2;if(paper)paper.disabled=result;
    drawRuler(gap);
    if(r===2)drawSheet();
    if(result&&(r===1||r===2)){
      v.ctx.save();v.ctx.globalAlpha=.26;v.material(0,target,74,false);v.ctx.restore();
      if(target.x-object.x>.6)v.arrow(pt(target.x,target.y+3),pt(object.x,target.y+3));
      v.label('클립 출발',pt(target.x+3,target.y-10),true);
    }
    if(r===3){
      if(v.equipment('key',object,74,74))v.label('철 열쇠',pt(object.x,object.y+8),true);
      else v.iron(object,'철 열쇠',50);
    }else v.material(0,object,74);
    v.magnet(m,'N',.7);
    v.hand(pt(target.x+2,target.y-3),released,r===3?'열쇠':'클립');
    for(const mark of [4,3,2,1])v.c.root.querySelector(`[data-mission="gap-${mark}"]`)?.setAttribute('aria-pressed',String(Math.abs(gap-mark)<.1));
    if(sensor){
      const text=`${result||observed?'놓기 전':'현재'} 간격 ${cellLabel(gap)} · ${result?(r===0?'움직이지 않았어':v.animating?(r===3?'철 열쇠가 움직이는 중':'클립이 움직이는 중'):r===2?'종이 너머로 끌려옴':'끌려옴'):observed?'움직이지 않았어 · 다른 자리도 골라 봐':r===2?'종이만 넣기':r===0?'5칸에서 관찰':'붙을 것 같은 곳을 골라 봐'}`;
      if(sensor.textContent!==text)sensor.textContent=text;
    }
  };
  v.button('release',()=>{
    if(result||v.animating)return;
    const m=q(),d=distance(m,target),gap=clearanceCells(m,target),measure=cellLabel(gap);
    if(r===0&&!nearRulerMark(m,target,5))return v.tell('자석 끝을 왼쪽 눈금 5까지 옮겨서 다시 관찰해 봐.');
    if(r===1&&gap>1.05){
      observed=true;v.a.values.distanceObserved=true;
      const trial=v.proof(`distance-choice-${Number(gap.toFixed(1))}`,`${measure}에서 관찰`,'none',{paper:false,clearanceCells:Number(gap.toFixed(1)),material:'iron'});
      trial.initialObjects=[{id:'magnet',...m},{id:'clip',...target}];trial.objects=structuredClone(trial.initialObjects);
      v.settle({},()=>{released=1;v.tell(`${measure}에서는 클립이 움직이지 않았어. 더 가까운 곳 중 붙을 것 같은 자리를 골라 봐.`);v.draw();v.c.touch();},t=>{released=handRelease(t);return t;},700);
      return;
    }
    if(r>1&&!magneticReach(m,target))return v.tell(`자석을 조금 더 가까이 옮기고 ${r===3?'열쇠':'클립'}를 살펴봐.`);
    if(r===2&&!paperIn())return v.tell('앞 실험의 간격은 그대로야. 얇은 종이만 점선 안에 넣어 봐.');
    if(r===2)v.set('paper',paperSlot);
    const end=r===0?target:landingPoint(m);
    const outcome=r===0?'움직이지 않았어.':r===2?'자석에 끌려와 종이 앞에서 멈췄어.':'자석에 끌려왔어.';
    v.mark(`done${r}`,'한 가지 조건 비교',`출발 간격 ${measure}${r===2?'에 종이 한 장을 넣으니':'에서'} ${r===3?'열쇠가':'클립이'} ${outcome}`);
    const trial=v.proof(key,`${measure} · ${r===2?'종이 한 장':'종이 없음'}`,'success',{paper:r===2,gap:d,clearanceCells:Number(gap.toFixed(1)),material:'iron'});
    const id=r===3?'key':'clip';
    trial.initialObjects=r===2&&nearTrial?structuredClone(nearTrial.initialObjects):[{id:'magnet',...m},{id,...target}];
    trial.objects=[{id:'magnet',...m},{id,...end}];
    result=true;
    v.set('moving-clip',target);
    v.settle({'moving-clip':end},()=>{released=1;delete v.a.points['moving-clip'];if(r>0)playEffect(r===2?'drop':'snap',v.s.settings);v.refresh();},t=>{released=handRelease(t);return pullEase(afterHandRelease(t));},r===0?700:1080);
  });
  const replay=v.c.root.querySelector<HTMLButtonElement>('[data-mission="replay-pull"]');
  if(replay){
    const clips=[...v.c.root.querySelectorAll<SVGGElement>('.clip-comparison [data-travel]')];
    let raf=0;
    v.cleanups.push(()=>cancelAnimationFrame(raf));
    v.button('replay-pull',()=>{
      cancelAnimationFrame(raf);
      const reduced=!v.s.settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
      const draw=(f:number)=>clips.forEach(el=>el.setAttribute('transform',`translate(${252-Math.min(Number(el.dataset.travel),132*f)} 57)`));
      if(reduced){draw(1);v.tell('두 클립 모두 자석 쪽으로 움직였어. 종이를 넣은 클립은 종이 앞에서 멈췄어.');return;}
      let elapsed=0,prev=performance.now();draw(0);
      const step=(now:number)=>{
        if(!document.hidden&&v.c.root.dataset.demoPaused===undefined&&!document.querySelector('dialog[open],.modal-backdrop'))elapsed+=Math.min(60,now-prev);
        prev=now;const f=Math.min(1,elapsed/1600);draw(pullEase(f));
        if(f<1)raf=requestAnimationFrame(step);
      };raf=requestAnimationFrame(step);
    });
  }
  v.button('next',()=>{
    v.a.values.round=r+1;v.a.points={};delete v.a.values.distanceObserved;
    if(r===1)v.a.points['distance-magnet']={...comparisonPoint};
    v.refresh();
  });
}
// Source rectangles exclude transparent margins so the visible faces share the drop coordinates.
const polarityParts = {
  covered:[2,2,316,108],
  north:[2,114,316,108],
  south:[2,226,316,108],
  stand:[2,338,316,108],
} as const;
function polarityPart(v:Surface,part:keyof typeof polarityParts,center:Point,width:number,height:number){
  const img=v.asset('polarity-parts','/assets/quest/polarity-parts.webp');
  if(!img.complete||!img.naturalWidth)return false;
  const [sx,sy,sw,sh]=polarityParts[part];
  v.ctx.drawImage(img,sx,sy,sw,sh,center.x*W/100-width/2,center.y*H/100-height/2,width,height);
  return true;
}

function poles(v: Surface){
  const r=Number(v.a.values.round||0),hidden:Pole=r===0?'S':'N';
  const dock=pt(48,53),rest=pt(68,53),probeHome=pt(29,54);
  const probeWidth=192,coveredWidth=211;
  // On attraction the right pole of the reference touches the left end of the covered bar.
  const contact=pt(dock.x+100*(probeWidth+coveredWidth-2)/(2*W),dock.y);
  const repelled=pt(77,dock.y);
  if(v.a.values.poleLayout!==1){
    const saved=v.a.points['unknown-magnet'];
    if(saved?.y===53){
      if(saved.x===59)v.set('unknown-magnet',contact);
      else if(saved.x===72)v.set('unknown-magnet',repelled);
      else if(saved.x===64)v.set('unknown-magnet',rest);
    }
    v.a.values.poleLayout=1;
  }
  const stickerHome=(side:Pole)=>pt(side==='N'?33:47,78);
  let probe=(v.a.values.probePole||'N') as Pole,probeStart={...v.p('probe',probeHome)};
  let reaction=String(v.a.values.reaction||'');
  const covered=()=>v.p('unknown-magnet',rest);
  const tested=(face:Pole)=>v.has(`test${r}${face}`);
  const resetTrial=()=>{
    reaction='';delete v.a.values.reaction;delete v.a.points['initial:unknown-magnet'];
    probeStart={...probeHome};v.path=[];
  };
  // Finish an interrupted return, including old saves made after flipping only the reference bar.
  if(v.has('poleReturning')||(reaction&&!tested(opposite(probe))&&tested(probe))){
    resetTrial();v.set('probe',probeHome);v.set('unknown-magnet',rest);delete v.a.values.poleReturning;v.c.touch();
  }
  const end=(left:boolean)=>pt(covered().x+(left?-1:1)*5.5,covered().y);
  const atDock=(p:Point)=>Math.abs(p.x-dock.x)<=5&&Math.abs(p.y-dock.y)<=6;
  const stickerButtons=(['N','S'] as Pole[]).map(pole=>({pole,button:v.c.root.querySelector<HTMLButtonElement>(`[data-drag="sticker${pole}"]`)!}));
  const test=(p:Point)=>{
    if(v.animating||!atDock(p))return;
    const facing=opposite(probe),repel=facing===hidden;
    if(reaction&&tested(facing)){v.set('probe',dock);v.draw();return;}
    const initial={...covered()},result=repel?repelled:contact;
    v.a.points['initial:unknown-magnet']={...initial};
    v.set('probe',dock);
    reaction='';v.tell(`기준 자석의 ${facing}극을 가까이 댔어. 가려진 자석을 봐.`);
    v.settle({'unknown-magnet':result},()=>{
      reaction=repel?'밀려났어':'당겨졌어';v.a.values.reaction=reaction;
      v.mark(`test${r}${facing}`,`기준 ${facing}극 접근`,`표시 없는 자석이 ${reaction}.`);
      const trial=v.proof(`pole${r}${facing}`,`${facing}극을 가까이 댄 반응`,repel?'repel':'attract',{facing,hidden});
      trial.initialObjects=[{id:'probe',...probeStart,pole:probe},{id:'unknown-magnet',...initial,pole:hidden}];
      trial.objects=[{id:'probe',...dock,pole:probe},{id:'unknown-magnet',...result,pole:hidden}];
      probeStart={...dock};
      playEffect(repel?'compare':'snap',v.s.settings);
      const labelled=v.has(`label${r}N`)&&v.has(`label${r}S`);
      v.tell(`${facing}극을 가까이 대니 ${reaction}. ${labelled?'붙인 스티커와 움직임이 맞는지 확인해 봐.':v.has(`test${r}N`)&&v.has(`test${r}S`)?'두 반응을 비교했어! 이제 종이 위 양끝에 스티커를 붙여 줘.':'지금 본 반응으로 스티커를 붙여 봐. 반대 극으로도 확인할 거야.'}`);v.draw();
    });
  };
  v.draw=()=>{
    v.base();
    const g=v.ctx,q=covered(),ref=v.p('probe',probeHome);
    const showEnds=v.has(`test${r}N`)||v.has(`test${r}S`);
    const facing=opposite(probe);
    if(!atDock(ref)&&!v.has('poleReturning')){
      v.target(dock,`${facing}극 대는 자리`,probeWidth+8,68);
      if(!reaction&&ref.x<=probeHome.x+1)v.arrow(pt(38,53),pt(46,53));
    }
    if(!reaction&&tested(probe)){
      const last=v.a.trials?.find(t=>t.key===`pole${r}${probe}`);
      if(last)v.label(`앞 실험 · ${probe}극을 대니 ${last.outcome==='repel'?'밀려났어':'당겨졌어'}`,pt(36,38),true,'#47665d');
    }
    if(!polarityPart(v,'covered',q,coveredWidth,48)){
      g.fillStyle='#cda873';g.strokeStyle='#85663d';g.lineWidth=3;g.beginPath();g.roundRect(q.x*W/100-coveredWidth/2,q.y*H/100-25,coveredWidth,50,6);g.fill();g.stroke();
    }
    v.label('종이로 가린 자석',pt(q.x,q.y-10),true);
    v.magnet(ref,probe,probeWidth/150);
    v.label('기준 자석',pt(ref.x,ref.y+10),true);
    for(const {pole,button} of stickerButtons){
      const placed=v.has(`label${r}${pole}`),spot=end(pole===hidden);
      button.disabled=v.animating;
      if(placed){v.set(`sticker${pole}`,spot);continue;}
      g.save();g.beginPath();g.arc(spot.x*W/100,spot.y*H/100,22,0,2*Math.PI);
      g.fillStyle='#fff8e7';g.fill();
      if(showEnds){g.strokeStyle='#377669';g.lineWidth=3;g.setLineDash([5,4]);g.stroke();}
      g.restore();v.label('?',spot,true);
    }
    if(reaction){
      const before=v.a.points['initial:unknown-magnet']||rest;
      if(Math.abs(before.x-q.x)>1)v.arrow(pt(before.x,66),pt(q.x,66));
      if(v.has('lens'))v.target(pt(before.x,39),'처음 위치',60,23);
      v.label(reaction,pt(q.x,73),true);
    }
  };
  v.drag('probe',probeHome,test);
  for(const {pole} of stickerButtons)v.drag(`sticker${pole}`,stickerHome(pole),p=>{
    const left=Math.abs(p.x-end(true).x)<=4.8,right=Math.abs(p.x-end(false).x)<=4.8;
    const attached=(left||right)&&Math.abs(p.y-covered().y)<=6;
    const observed=v.has(`test${r}N`)||v.has(`test${r}S`);
    if(!observed||!attached||pole!==(left?hidden:opposite(hidden))){
      delete v.a.values[`label${r}${pole}`];delete v.a.values[`solved${r}`];
      v.set(`sticker${pole}`,stickerHome(pole));
      const trial=v.a.trials?.filter(t=>t.key===`pole${r}N`||t.key===`pole${r}S`).at(-1);
      const clue=trial?`${trial.conditions.facing}극을 대니 ${trial.outcome==='repel'?'밀려났어. 같은 극끼리 밀어내':'당겨졌어. 다른 극끼리 당겨'}. `:'';
      v.tell(!observed?'기준 자석을 한 번 가까이 대고 움직임을 먼저 봐.':!attached?'종이로 가린 자석의 물음표 위에 놓아 봐.':`${clue}어느 끝인지 살펴보고 다시 붙여 봐.`);
      v.draw();return;
    }
    v.set(`sticker${pole}`,end(left));v.mark(`label${r}${pole}`,'자석 끝의 극 복원',`${left?'왼쪽':'오른쪽'} 끝을 ${pole}극으로 표시했어.`);
    if(v.has(`label${r}N`)&&v.has(`label${r}S`)){v.mark(`solved${r}`,'양쪽 극 표시 복원',`왼쪽은 ${hidden}극, 오른쪽은 ${opposite(hidden)}극으로 복원했어.`);v.proof(`gate${r}`,'관찰한 반응으로 양쪽 극 표시 복원');v.tell(v.has(`test${r}N`)&&v.has(`test${r}S`)?'두 반응과 스티커가 맞아! 양쪽 극을 찾았어.':'스티커를 잘 붙였어! 이제 기준 자석을 뒤집어 반대 극으로도 확인해 봐.',true);v.refresh();}
    else{v.tell('한쪽 극을 찾았어! 다른 쪽에도 표시를 붙여 줘.',true);v.draw();}
  },()=>{delete v.a.values[`label${r}${pole}`];delete v.a.values[`solved${r}`];v.c.meta();});
  v.button('flip',()=>{
    if(v.animating)return;
    probe=opposite(probe);v.a.values.probePole=probe;resetTrial();v.a.values.poleReturning=true;
    v.tell('다시 비교하려고 두 자석을 처음 자리에 놓을게.');v.draw();v.c.touch();v.c.meta();
    v.settle({probe:probeHome,'unknown-magnet':rest},()=>{
      delete v.a.values.poleReturning;
      v.tell(`처음 자리야. 기준 자석의 ${opposite(probe)}극을 오른쪽 점선에 대 봐.`);
      v.draw();v.c.touch();v.c.meta();
    },undefined,520);
  });
  v.button('next',()=>{v.a.values.round=1;delete v.a.values.reaction;v.a.points={};v.refresh();});
}
function rings(v: Surface){
  const r=Number(v.a.values.round||0),count=v.compact||r===0?2:3;
  let release=v.has('ringReleased')?1:0;
  const pole=(i:number)=>(v.a.values[`ringPole${i}`]||'N') as Pole;
  const slot=(i:number)=>pt(68,71-i*15),tray=(i:number)=>pt(23+i*16,73);
  const ringWidth=166,ringHeight=75;
  // Stacked rings share the same projected top ellipse. Only the side wall separates their centres.
  const wall=17,contactSpacing=wall/H*100,floatSpacing=18;
  const standHeight=count===2?330:398;
  const stand=pt(68,slot(0).y-(standHeight*.27-wall/2)/H*100);
  const drawStand=()=>{
    if(polarityPart(v,'stand',stand,standHeight*.67,standHeight))return;
    const g=v.ctx,x=stand.x*W/100,y=stand.y*H/100;
    g.fillStyle='#92693f';g.beginPath();g.ellipse(x,y+standHeight*.27,82,19,0,0,Math.PI*2);g.fill();
    g.fillStyle='#b99b50';g.fillRect(x-5,y-standHeight/2,10,standHeight*.77);
  };
  const positions=()=>{
    let y=slot(0).y;
    return Object.fromEntries(Array.from({length:count},(_,i)=>{
      if(i)y-=ringFloating(pole(i-1),pole(i))?floatSpacing:contactSpacing;
      return [`ring${i}`,pt(68,y)];
    }));
  };
  const snapshot=():TrialObject[]=>Array.from({length:count},(_,i)=>({id:`ring${i}`,...v.p(`ring${i}`,tray(i)),topPole:pole(i),bottomPole:opposite(pole(i))}));
  const flipRing=(i:number)=>{
    if(v.animating)return;
    v.a.values[`ringPole${i}`]=opposite(pole(i));
    release=0;
    if(v.has('ringReleased')){
      for(let j=0;j<count;j++)v.set(`ring${j}`,slot(j));
      v.a.values.ringReleased=false;
      v.tell('고리를 뒤집었어. 손을 떼고 마주 보는 두 면을 관찰해 봐.');
    }
    playEffect('compare',v.s.settings);v.draw();v.c.touch();
  };
  const drawRing=(i:number)=>{
    const q=v.p(`ring${i}`,tray(i)),top=pole(i),bottom=opposite(top);
    const g=v.ctx,x=q.x*W/100,y=q.y*H/100;
    if(!polarityPart(v,top==='N'?'north':'south',q,ringWidth,ringHeight)){
      const topColor=top==='N'?'#c7483b':'#316e9c',bottomColor=top==='N'?'#316e9c':'#c7483b';
      const radius=(ringHeight-wall)/2;
      g.fillStyle=bottomColor;g.beginPath();g.ellipse(x,y+wall/2,ringWidth/2,radius,0,0,Math.PI*2);g.fill();g.fillRect(x-ringWidth/2,y-wall/2,ringWidth,wall);
      g.fillStyle=topColor;g.beginPath();g.ellipse(x,y-wall/2,ringWidth/2,radius,0,0,Math.PI*2);g.fill();
      g.fillStyle='#544634';g.beginPath();g.ellipse(x,y-wall/2,19,7,0,0,Math.PI*2);g.fill();
    }
    // The peg crosses in front of the back rim and disappears behind the front of the hole.
    if(Math.abs(q.x-stand.x)<1){
      g.save();g.beginPath();g.rect(x-12,y-ringHeight/2,24,ringHeight*.44);g.clip();drawStand();g.restore();
    }
    g.save();g.font='bold 21px "Magnet Quest Sans",sans-serif';g.textBaseline='middle';g.textAlign='center';g.fillStyle='#fff';g.strokeStyle='#233b46';g.lineWidth=3;
    for(const [label,dx,dy] of [[top,-49,-16],[bottom,21,28]] as const){g.strokeText(label,x+dx,y+dy);g.fillText(label,x+dx,y+dy);}
    g.restore();
    if(Math.abs(q.x-68)>6)v.label(`${i+1}번 고리`,pt(q.x,q.y-9),true);
  };
  // Recalculate released geometry for activities saved with the previous artwork.
  if(v.has('ringReleased'))for(const [id,p] of Object.entries(positions()))v.set(id,p);
  v.draw=()=>{
    v.base();
    drawStand();
    if(!v.has('ringReleased')&&!v.animating){
      for(let i=0;i<count;i++)if(distance(v.p(`ring${i}`,tray(i)),slot(i))>2)v.target(slot(i),'',ringWidth+8,62);
    }
    for(let i=0;i<count;i++)drawRing(i);
    const upper=v.p(`ring${count-1}`,tray(count-1));
    if(Math.abs(upper.x-68)<7||v.animating||v.has('ringReleased'))v.hand(pt(slot(count-1).x+6,slot(count-1).y-1),release,'고리');
    if(v.has('ringReleased')){
      const floating=Array.from({length:count-1},(_,i)=>ringFloating(pole(i),pole(i+1)));
      const message=floating.every(Boolean)?'같은 극끼리 밀어내서 떠 있어':floating.some(Boolean)?'마주 보는 극에 따라 간격이 달라':'다른 극끼리 끌어당겨 붙었어';
      v.label(message,pt(36,52),true);
    }
    v.label(r<2?`${count}개 고리를 서로 떨어져 있게!`:`${count}개 고리를 서로 붙게!`,pt(50,29),true);
  };
  for(let i=0;i<count;i++){
    v.drag(`ring${i}`,tray(i),p=>{v.a.values.ringReleased=false;release=0;if(distance(p,slot(i))<11)v.set(`ring${i}`,slot(i));v.draw();},()=>{v.a.values.ringReleased=false;release=0;});
    const b=v.c.root.querySelector<HTMLElement>(`[data-drag="ring${i}"]`);b?.addEventListener('dblclick',()=>flipRing(i));
    const flip=document.createElement('button');flip.className='ring-flip';flip.textContent=`${i+1}번 뒤집기`;flip.setAttribute('aria-label',`${i+1}번 고리 뒤집기`);flip.style.left=`${tray(i).x}%`;flip.style.top='84%';flip.addEventListener('click',()=>flipRing(i));v.c.root.querySelector('.mission-board')!.append(flip);
  }
  v.button('check',()=>{
    if(v.animating)return;
    if(v.has('ringReleased'))return v.tell('고리를 뒤집어 마주 보는 극을 바꿔 봐.');
    if(!Array.from({length:count},(_,i)=>{const q=v.p(`ring${i}`,tray(i));return Math.abs(q.x-68)<7&&Math.abs(q.y-slot(i).y)<7;}).every(Boolean))return v.tell(`고리를 아래부터 ${count===2?'1, 2':'1, 2, 3'}번 순서로 점선에 놓아 줘.`);
    const initial=snapshot(),targets=positions();
    const pairs=Array.from({length:count-1},(_,i)=>ringFloating(pole(i),pole(i+1)));
    const correct=pairs.every(floats=>floats===(r<2)),allFloat=pairs.every(Boolean);
    v.settle(targets,()=>{
      v.a.values.ringReleased=true;release=1;
      const trial=v.proof(correct?(v.compact&&r===2?'join2':['float2','float3','join3'][r]):`rings-failed${r}`,r<2?`${count}개 고리 띄우기`:`${count}개 고리 붙이기`,correct?'success':'failure');
      trial.initialObjects=initial;trial.objects=snapshot();
      playEffect(allFloat?'compare':'snap',v.s.settings);
      if(!correct){
        v.tell(r<2?'다른 극이 마주 본 곳은 붙었어. 고리를 뒤집어 봐.':'같은 극이 마주 본 곳은 떠 있어. 고리를 뒤집어 봐.');v.draw();return;
      }
      v.mark(`done${r}`,'고리 배치 문제 해결',r<2?'같은 극이 마주 보자 고리가 밀려 떠올랐어.':'다른 극이 마주 보자 두 면이 맞닿았어.');v.refresh();
    },t=>{release=handRelease(t);const motion=afterHandRelease(t);return allFloat?1-Math.exp(-5*motion)*Math.cos(6*motion)*(1-motion):Math.min(1,(motion/.78)**2);},900);
  });
  v.button('next',()=>{v.a.values.round=v.compact?2:r+1;v.a.values.ringReleased=false;if(v.compact){for(let i=0;i<count;i++)v.set(`ring${i}`,slot(i));}else v.a.points={};v.refresh();});
  v.button('view3d',()=>v.c.root.dispatchEvent(new CustomEvent('open-3d',{bubbles:true,detail:{kind:'rings',released:v.has('ringReleased'),rings:Array.from({length:count},(_,i)=>{const q=v.p(`ring${i}`,tray(i));return {top:pole(i),onPole:v.has('ringReleased')||Math.abs(q.x-68)<7&&Math.abs(q.y-slot(i).y)<7};})}})));
}

function aquarium(v: Surface){
  let previous=performance.now(), raf=0, lastSave=0;
  let pad=v.p('inner-pad',pt(29,48));
  const handleStart=pt(27,47), mask=new Set(v.a.mask);
  let connected=!v.has('padDetached')&&distance(v.p('cleaner',handleStart),pad)<18;
  const counts=glassStains.map((_,i)=>Number(v.a.values[`scrubDistance${i}`]||0));
  const turns=glassStains.map((_,i)=>Number(v.a.values[`scrubTurns${i}`]||0));
  const directions=[0,0,0],legs=[0,0,0];
  const section=v.c.root.querySelector<HTMLElement>('.force-sensor');
  if(section){
    section.className='aquarium-section';section.setAttribute('aria-label','유리벽을 옆에서 본 모습');
    section.innerHTML='<strong>유리벽 옆모습</strong><div class="aquarium-slice"><div><span>유리 밖</span><i class="aqua-grip"></i><b>손잡이</b></div><i class="aqua-glass" aria-hidden="true"></i><div><span>물속</span><i class="aqua-pad"></i><b>청소 패드</b></div></div><span class="aqua-coupling" data-coupling></span><span class="aqua-count" data-stain-count></span>';
  }
  const coupling=section?.querySelector<HTMLElement>('[data-coupling]'), count=section?.querySelector<HTMLElement>('[data-stain-count]');
  function updateSection(){
    if(section)section.dataset.attached=String(connected);
    if(coupling)coupling.textContent=connected?'자석이 붙었어':'자석이 떨어졌어';
    if(count)count.textContent=`깨끗한 곳 ${glassStains.filter((_,i)=>v.has(`clean${i}`)).length} / 3`;
  }
  updateSection();
  const padInfo=document.createElement('span');padInfo.className='sr-only';padInfo.dataset.object='inner-pad';padInfo.style.left=`${pad.x}%`;padInfo.style.top=`${pad.y}%`;padInfo.textContent='유리 안쪽에서 바깥 손잡이를 따라 움직이는 청소 패드';v.c.root.querySelector('.mission-board')!.append(padInfo);
  const tank=v.asset('aquarium-window','/assets/quest/aquarium-window.webp');
  const parts=v.asset('aquarium-cleaner-parts','/assets/quest/aquarium-cleaner-parts.webp');
  v.draw=()=>{
    const g=v.ctx,handle=v.p('cleaner',handleStart);
    const shownPad=v.animating?v.p('inner-pad',pad):pad;
    v.base();
    if(tank.complete&&tank.naturalWidth)g.drawImage(tank,280,207,850,371);
    else v.sprite('aquarium',246,169,880,454);
    glassStains.forEach((_,i)=>{if(!v.has(`clean${i}`))drawGlassStain(g,parts,mask,i);});
    if(parts.complete&&parts.naturalWidth){
      const h=parts.naturalHeight/4;
      // The wider pad is visible through the front pane, behind the smaller hand grip.
      g.drawImage(parts,0,h,parts.naturalWidth,h,shownPad.x*12.8-39,shownPad.y*7.2-43,78,86);
      g.drawImage(parts,0,0,parts.naturalWidth,h,handle.x*12.8-35,handle.y*7.2-30,70,60);
    }else{
      if(!v.equipment('pad',shownPad,110,62))v.iron(shownPad,'',56);
      v.magnet(handle,'N',.55);
    }
  };
  function wipe(before:Point){
    const travel=distance(before,pad),dx=pad.x-before.x;
    if(travel<=.015)return;
    glassStains.forEach((p,i)=>{
      if(v.has(`clean${i}`)||distance(p,pad)>=7)return;
      const size=mask.size;
      wipeGlass(mask,i,before,pad);
      if(mask.size!==size)v.a.mask=Array.from(mask);
      counts[i]+=distance(p,before)>=7?Math.min(travel,7-distance(p,pad)):travel;
      if(Math.abs(dx)>.012){
        const dir=Math.sign(dx);
        if(directions[i]&&dir!==directions[i]&&legs[i]>=2.5)turns[i]++;
        if(dir!==directions[i])legs[i]=0;
        directions[i]=dir;legs[i]+=Math.abs(dx);
      }
      v.a.values[`scrubDistance${i}`]=counts[i];v.a.values[`scrubTurns${i}`]=turns[i];
      if((v.compact?counts[i]>=8:counts[i]>=18&&turns[i]>=2)&&clearedGlass(mask,i)>=.7){
        v.mark(`clean${i}`,'유리 너머 청소',`${i+1}번째 얼룩 위로 안쪽 패드를 움직여 닦았어.`);
        v.tell('얼룩을 닦으니 물고기가 잘 보여!',true,'pad');updateSection();
      }
    });
    if(!v.has('clean-proof')&&glassStains.every((_,i)=>v.has(`clean${i}`))){
      v.proof('clean','유리 밖 자석으로 세 구역 청소','success',{scrubDistance:Math.round(counts.reduce((sum,x)=>sum+x,0)),reversals:turns.reduce((sum,x)=>sum+x,0)});
      v.a.values['clean-proof']=true;v.tell('세 곳 모두 깨끗해! 손잡이를 옆으로 두고 물고기를 살펴보자.',true);
      // Park the connected pair by the plants so the last revealed fish stays visible.
      const parked=pt(28,39);
      v.settle({cleaner:parked,'inner-pad':parked},()=>{
        pad={...parked};connected=true;v.a.values.padDetached=false;
        updateSection();v.draw();v.c.touch();
      },undefined,800);
    }
  }
  function follow(now:number){
    raf=0;
    const dt=Math.max(0,Math.min((now-previous)/1000,.045));previous=now;
    if(v.c.root.dataset.demoPaused===undefined&&!document.hidden&&!v.c.root.inert&&!document.querySelector('dialog[open],.modal-backdrop')){
      const handle=v.p('cleaner',handleStart),gap=distance(handle,pad);
      const next=gap<(connected?18:8);
      if(connected!==next){
        connected=next;v.a.values.padDetached=!connected;
        v.tell(connected?'안쪽 패드와 다시 연결됐어. 얼룩 위를 쓸어 봐.':'손잡이가 너무 멀어졌어. 물속 패드 앞으로 돌아와 붙여 줘.');
        updateSection();v.c.touch();v.c.meta();
      }
      if(!connected)return;
      const k=gap<.04?1:1-Math.exp(-dt*4), before=pad;
      pad=pt(before.x+(handle.x-before.x)*k,before.y+(handle.y-before.y)*k);
      v.set('inner-pad',pad);wipe(before);v.draw();
      if(k===1){v.c.touch();return;}
      if(now-lastSave>1000){v.c.touch();lastSave=now;}
    }
    raf=requestAnimationFrame(follow);
  }
  const moveHandle=()=>{if(!raf){previous=performance.now();raf=requestAnimationFrame(follow);}};
  v.drag('cleaner',handleStart,moveHandle,moveHandle,p=>pt(clamp(p.x,26,77),clamp(p.y,35,74)));
  v.cleanups.push(()=>cancelAnimationFrame(raf));
}
function delivery(v: Surface){
  const r=Number(v.a.values.round||0),start=r===2?74:27,goal=r===2?30:73;let car=Number(v.a.values.car??start),pole=(v.a.values.controllerPole||'N') as Pole,raf=0,prev=performance.now(),moved=false,lastSave=0,controlled=Number(v.a.values[`controlled${r}`]||0);
  const carPoint=()=>pt(car,59);
  const forceOn=()=>{const q=v.p('controller',pt(20,40));return distance(q,carPoint())<18&&Math.abs(q.y-59)<12;};
  let speed=Number(v.a.values.cartSpeed||0);
  moved=speed!==0;
  const setSpeed=(value:number)=>{speed=value;v.a.values.cartSpeed=value;};
  let driveMethod=String(v.a.values[`cartMethod${r}`]||'');
  const stopProof=(key:string,label:string)=>{
    const trial=v.proof(key,label,'success',{car,goal,pole,method:driveMethod,controllerY:v.p('controller',pt(20,40)).y,controlledDistance:Math.round(controlled)});
    const startPole=v.a.values.startControllerPole;
    trial.initialObjects.forEach(o=>{if(o.id==='cart-magnet')o.pole='N';if(o.id==='controller'&&(startPole==='N'||startPole==='S'))o.pole=startPole;});
    trial.objects.forEach(o=>{if(o.id==='cart-magnet')o.pole='N';if(o.id==='controller')o.pole=pole;});
    const {releaseCar,releaseX,releaseY,releasePole}=v.a.values;
    if(typeof releaseCar==='number'&&typeof releaseX==='number'&&typeof releaseY==='number'&&(releasePole==='N'||releasePole==='S')){
      trial.conditions.rollingDistance=Math.abs(car-releaseCar);
      if(key.startsWith('stop'))trial.initialObjects=[{id:'cart-magnet',x:releaseCar,y:59,pole:'N'},{id:'controller',x:releaseX,y:releaseY,pole:releasePole}];
    }
    if(v.a.values.driveFacing==='N'||v.a.values.driveFacing==='S'){
      trial.conditions.facing=v.a.values.driveFacing;
      trial.conditions.cartFacing=v.a.values.driveCartFacing;
    }
  };
  const finishStopped=()=>{
    if(v.has(`segment${r}`)||Math.abs(car-goal)>=3||forceOn()||speed!==0||controlled<=.01)return false;
    v.mark(`segment${r}`,'택배 배달',driveMethod==='pull'?'자석으로 당겨 목적지에 멈췄어.':driveMethod==='push'?'자석으로 밀어 목적지에 멈췄어.':'자석으로 밀고 당겨 목적지에 멈췄어.');
    const path=v.path;
    stopProof(`stop${r}`,'배달 장소에서 카트가 멈춘 뒤 확인');v.path=path;
    stopProof(`delivery${r}`,'극의 힘으로 운반하고 정차');
    v.tell('배달 완료! 카트가 배달 장소에 멈췄어.',true,'crate');v.refresh();return true;
  };
  const state=document.createElement('p');state.className='delivery-state';state.setAttribute('role','status');v.c.root.querySelector('.mission-board')!.append(state);
  const safePosition=(p:Point):Point=>{
    const bounds=board.getBoundingClientRect(),piece=controller.getBoundingClientRect();
    let top=bounds.height*.28,bottom=bounds.height*.79;
    for(const el of [state,v.c.root.querySelector<HTMLElement>('.mission-actions')]){
      if(!el)continue;
      const rect=el.getBoundingClientRect();if(!rect.height)continue;
      if(el===state)top=Math.max(top,Math.min(bounds.height*.36,rect.top+rect.height-bounds.top));
      else bottom=Math.min(bottom,rect.top-bounds.top);
    }
    const halfX=Math.max(piece.width/2,54*bounds.width/W)+6,halfY=Math.max(piece.height/2,42*bounds.height/H)+5;
    return pt(clamp(p.x,halfX/bounds.width*100,100-halfX/bounds.width*100),clamp(p.y,(top+halfY)/bounds.height*100,(bottom-halfY)/bounds.height*100));
  };
  const board=v.c.root.querySelector<HTMLElement>('.mission-board')!;
  const controller=v.c.root.querySelector<HTMLElement>('[data-drag="controller"]')!;
  const carInfo=document.createElement('span');carInfo.className='sr-only';carInfo.dataset.object='cart-magnet';
  carInfo.textContent='왼쪽 N극, 오른쪽 S극을 가진 택배 카트';board.append(carInfo);
  if(!v.a.points['initial:controller']&&!v.a.points.controller){
    v.a.points['initial:controller']=pt(20,40);v.a.values.startControllerPole=pole;
  }
  v.a.points['initial:cart-magnet']||=pt(start,59);v.set('cart-magnet',carPoint());
  const facing=(q:Point)=>{
    const side=q.x>=car?1:-1;
    const cartPole=side===1?'S':'N',controlPole=side===1?pole:opposite(pole);
    return {side,attract:cartPole!==controlPole,cartPole,controlPole};
  };
  let shownFeedback='',feedbackUntil=0,cartMoving=false;
  v.draw=()=>{
    v.base();
    const g=v.ctx,q=v.p('controller',pt(20,40)),{side,attract}=facing(q);
    const connected=forceOn(),done=v.has(`segment${r}`),atGoal=Math.abs(car-goal)<3;
    const direction=side*(attract?1:-1);
    if(v.feedback!==shownFeedback){shownFeedback=v.feedback;feedbackUntil=performance.now()+2200;}
    let status='밀어도 당겨도 좋아. 자석으로 카트를 깃발까지 보내 줘.';
    if(moved&&!connected)status='카트가 멈췄어. 자석을 가까이 대서 다시 움직여 봐.';
    if(connected&&moved)status=cartMoving
      ? `${attract?'다른 극이 당겨':'같은 극이 밀어'} 카트가 ${direction>0?'오른쪽':'왼쪽'}으로 움직여.`
      : '카트가 멈췄어. 조종 자석을 조금씩 움직여 봐.';
    if(shownFeedback&&performance.now()<feedbackUntil)status=shownFeedback;
    if(moved&&!connected&&speed!==0)status='조금 더 굴러가네. 마찰 때문에 점점 느려져.';
    if(atGoal&&connected&&!done)status='배달 장소야. 자석을 떼고 카트가 멈추는지 봐.';
    if(done)status='배달 완료 · 카트가 목적지에 멈췄어.';
    if(state.textContent!==status)state.textContent=status;

    // Wheels sit on the rails. The dashed bay marks the same three-unit stopping tolerance as the model.
    if(!v.sprite('rail',140,462,1000,82)){
      g.fillStyle='#84725d';g.fillRect(140,478,1000,8);g.fillRect(140,516,1000,8);
    }
    const gx=goal*W/100,cx=car*W/100,cy=59*H/100;
    g.save();g.fillStyle=(atGoal||done)?'#89bd8480':'#ffe19788';g.strokeStyle=done?'#20765e':'#956515';
    g.lineWidth=4;g.setLineDash([9,7]);g.beginPath();g.roundRect(gx-3*W/100,416,6*W/100,102,10);g.fill();g.stroke();
    g.setLineDash([]);g.fillStyle='#86552d';g.fillRect(gx-3,285,6,122);
    g.fillStyle=done?'#25795f':'#c46e22';g.beginPath();g.moveTo(gx,279);g.lineTo(gx+57,279);g.lineTo(gx+46,296);g.lineTo(gx+57,313);g.lineTo(gx,313);g.fill();g.restore();
    v.label('배달 장소',pt(goal,35),true);
    if(!v.sprite('cart',cx-139,cy-113,278,216)){g.fillStyle='#b78240';g.fillRect(cx-81,cy-37,162,66);}
    // The parcel rests inside the bed; after stopping it is unloaded beside the station flag.
    if(done)v.sprite('parcel',gx+26,cy-65,102,89);
    else v.sprite('parcel',cx-53,cy-92,102,89);
    v.magnet(carPoint(),'N',.51);
    if(!done){
      const guide=pt(car+Math.sign(goal-car)*(pole==='N'?12:-12),59);
      if(!connected||!moved)v.target(guide,'',128,64);
      if(connected&&cartMoving)v.arrow(pt(car-direction*3,42),pt(car+direction*5,42),attract?'#167d76':'#ac642c');
    }
    // A handle above the bar keeps the movable magnet distinguishable from the cart-mounted one.
    const x=q.x*W/100,y=q.y*H/100;
    g.save();g.fillStyle='#e5bb73';g.strokeStyle='#614725';g.lineWidth=4;g.beginPath();g.roundRect(x-23,y-42,46,36,9);g.fill();g.stroke();g.restore();
    v.magnet(q,pole,.72);
  };
  v.drag('controller',pt(20,40),()=>{finishStopped();},()=>{moved=true;},safePosition);v.button('flip',()=>{pole=opposite(pole);v.a.values.controllerPole=pole;v.c.touch();v.draw();});
  v.button('detach',()=>{const q=v.p('controller',pt(20,40));v.set('controller',safePosition(pt(q.x,38)));v.c.touch();if(finishStopped())return;v.tell(speed!==0?'자석을 멀리했어. 카트가 조금 더 굴러 멈추는지 봐.':'조종 자석을 멀리했어.');v.draw();});
  const frame=(now:number)=>{if(v.stopped)return;const dt=Math.max(0,Math.min(.045,(now-prev)/1000));prev=now;
    if(document.hidden||v.c.root.inert||v.c.root.dataset.demoPaused!==undefined||document.querySelector('dialog[open],.modal-backdrop')){raf=requestAnimationFrame(frame);return;}
    cartMoving=false;
    if(moved&&!v.has(`segment${r}`)){
      const q=v.p('controller',pt(20,40)),d=distance(q,carPoint());if(forceOn()){
        const {side,attract,cartPole,controlPole}=facing(q);
        const dir=side*(attract?1:-1),before=car;
        let next=car+dir*(18-d)/18*dt*12;
        // An attracted cart meets the controller instead of passing through it and reversing.
        if(attract)next=side>0?Math.max(car,Math.min(next,q.x-6)):Math.min(car,Math.max(next,q.x+6));
        car=clamp(next,24,79);cartMoving=Math.abs(car-before)>.0001;v.a.values.car=car;v.set('cart-magnet',carPoint());
        if(dt>0)setSpeed((car-before)/dt);
        Object.assign(v.a.values,{releaseCar:car,releaseX:q.x,releaseY:q.y,releasePole:pole});
        if(Math.sign(car-before)===Math.sign(goal-start)){
          controlled+=Math.abs(car-before);v.a.values[`controlled${r}`]=controlled;v.a.values.driveFacing=controlPole;v.a.values.driveCartFacing=cartPole;
          const method=attract?'pull':'push';driveMethod=!driveMethod||driveMethod===method?method:'mixed';v.a.values[`cartMethod${r}`]=driveMethod;
        }
        if(Math.abs(car-goal)<3)v.tell('목적지야! 자석을 떼고 카트가 멈추는지 봐.');
      }else if(speed!==0){
        // Rolling friction on this track slows a released cart over a short, visible distance.
        const deceleration=18,rollTime=Math.min(dt,Math.abs(speed)/deceleration);
        const nextSpeed=rollTime>=Math.abs(speed)/deceleration?0:speed-Math.sign(speed)*deceleration*rollTime;
        const next=car+(speed+nextSpeed)*rollTime/2;
        car=clamp(next,24,79);setSpeed(car===next?nextSpeed:0);
        v.a.values.car=car;v.set('cart-magnet',carPoint());
      }if(now-lastSave>1000){v.c.touch();lastSave=now;}
    }if(finishStopped())return;v.draw();raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);v.cleanups.push(()=>cancelAnimationFrame(raf));
  const fitController=()=>v.set('controller',safePosition(v.p('controller',pt(20,40))));
  window.addEventListener('resize',fitController);v.cleanups.push(()=>window.removeEventListener('resize',fitController));
  v.button('bench-view',fitController);
}
function workshopTank(v:Surface,x:number,y:number,width:number,height:number){
  const tank=v.asset('aquarium-window','/assets/quest/aquarium-window.webp');
  if(tank.complete&&tank.naturalWidth)v.ctx.drawImage(tank,x,y,width,height);
  else if(!v.sprite('aquarium',x,y,width,height)){
    const g=v.ctx;g.save();g.fillStyle='#bee4e6';g.strokeStyle='#40858a';g.lineWidth=4;
    g.fillRect(x,y,width,height);g.strokeRect(x,y,width,height);g.restore();
  }
}
function workshopGrip(v:Surface,p:Point,outside:boolean){
  const atlas=v.asset('aquarium-cleaner-parts','/assets/quest/aquarium-cleaner-parts.webp');
  const w=outside?100:76,h=outside?86:84;
  if(atlas.complete&&atlas.naturalWidth){
    const rowHeight=atlas.naturalHeight/4;
    v.ctx.drawImage(atlas,0,outside?0:rowHeight,atlas.naturalWidth,rowHeight,p.x*12.8-w/2,p.y*7.2-h/2,w,h);
  }else if(outside)v.magnet(p,'N',.65);
  else if(!v.equipment('pad',p,w,h))v.iron(p,'',68);
}
function workshopParts(v:Surface,m:Point,t:Point,remote:boolean){
  const left=remote?'손잡이 속 자석':'덮개에 넣을 자석',right=v.s.design.pair==='iron'?'철판':'두 번째 자석';
  if(!remote)drawAssemblyCase(v.ctx,v.asset('mailbox-wood','/assets/quest/mailbox-wood.webp'));
  v.target(pt(43,55),'',142,72);v.target(pt(57,55),'',142,72);
  v.label(left,pt(41,46),true);v.label(remote?'패드 속 '+right:'몸체에 붙일 '+right,pt(60,46),true);
  if(remote){
    const g=v.ctx;g.save();g.strokeStyle='#459da5';g.lineWidth=7;g.beginPath();g.moveTo(640,345);g.lineTo(640,457);g.stroke();g.restore();
    v.label('유리',pt(50,65),true);
  }
  v.magnet(m,opposite(v.s.design.pole),.76);
  if(v.s.design.pair==='iron')v.hardware('plate',t);else v.magnet(t,'N',.76);
}
function design(v: Surface){
  const chosen=v.has('chosen'),remote=v.s.design.template==='remote';
  const changed=()=>{v.s.design.revision++;v.c.touch();v.c.meta();};
  v.draw=()=>{v.base();if(!chosen)return;
    const body=v.p('base',pt(18,65)),fixed=v.has('base');
    if(!fixed)v.target(pt(50,61),'몸체 놓는 곳',405,160);
    const w=fixed?415:200,h=remote?w/2.4:w*.56;
    if(remote)workshopTank(v,body.x*12.8-w/2,body.y*7.2-h/2,w,h);
    else if(!fixed){
      const g=v.ctx;g.save();g.translate(body.x*12.8,body.y*7.2);g.scale(.42,.42);g.translate(-620,-435);
      drawMailbox(g,v.asset('mailbox-wood','/assets/quest/mailbox-wood.webp'),mailbox.handleClosed);g.restore();
    }
    if(!fixed)v.label(remote?'유리 수조':'우편함 몸체',pt(body.x,body.y+12),true);
    const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));
    if(fixed)workshopParts(v,m,t,remote);
    else{
      v.magnet(m,opposite(v.s.design.pole),.76);v.label('조작 자석',pt(m.x,m.y+6),true);
      if(v.s.design.pair==='iron')v.hardware('plate',t);else v.magnet(t,'N',.76);
      v.label(v.s.design.pair==='iron'?'철판':'짝 자석',pt(t.x,t.y+6),true);
    }
    const tested=v.a.trials?.some(t=>t.key==='prototype'&&t.designRevision===v.s.design.revision);
    if(tested){const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));if(!assemblyIssue(m,t,remote))v.arrow(t,pt(t.x+(v.s.design.pair==='magnet'&&v.s.design.pole==='N'?7:-7),t.y));}
  };
  for(const template of ['box','remote'] as const)v.button(template,()=>{v.s.design={template,pair:'iron',pole:'N',gap:65,aligned:false,revision:v.s.design.revision+1};v.a.values.chosen=true;v.a.points={};v.refresh();});
  if(!chosen)return;
  const base=v.c.root.querySelector<HTMLButtonElement>('[data-drag="base"]')!;
  base.disabled=v.has('base');
  v.drag('base',pt(18,65),p=>{if(distance(p,pt(50,61))<13){v.set('base',pt(50,61));base.disabled=true;v.mark('base','장치 몸체','시민의 요청에 맞는 몸체를 놓았어.');}v.draw();});
  const align=()=>{const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));v.s.design.gap=distance(m,t)*2;v.s.design.aligned=assemblyAligned(m,t,remote);changed();v.draw();};
  const seat=(id:string,p:Point,center:Point)=>{
    if(v.has('base')&&distance(p,center)<2.5){v.set(id,center);playEffect('snap',v.s.settings);}
    align();
  };
  v.drag('design-magnet',pt(22,44),p=>{seat('design-magnet',p,pt(43,55));v.mark('magnet','자석 배치','자석의 위치를 직접 정했어.');});
  v.drag('design-target',pt(77,45),p=>{seat('design-target',p,pt(57,55));v.mark('target','대상 부품 배치','자석과 마주 볼 부품의 위치를 정했어.');});
  v.button('flip',()=>{v.s.design.pole=opposite(v.s.design.pole);changed();v.draw();});
  v.button('pair',()=>{v.s.design.pair=v.s.design.pair==='iron'?'magnet':'iron';changed();v.refresh();});
  v.button('prototype',()=>{
    if(!v.has('base')||!v.has('magnet')||!v.has('target'))return v.tell('몸체와 두 부품을 모두 배치한 뒤 시험해 줘.');
    const magnet=v.p('design-magnet',pt(22,44)),target=v.p('design-target',pt(77,45)),d=v.s.design;
    d.gap=distance(magnet,target)*2;
    d.aligned=assemblyAligned(magnet,target,remote);
    const issue=assemblyIssue(magnet,target,remote);
    const attracts=d.pair==='iron'||d.pole==='S',good=!issue&&attracts;
    v.proof('prototype','내 설계 시제품의 반응 시험',good?'success':'failure',{gap:d.gap,aligned:d.aligned,pair:d.pair,pole:d.pole});
    v.tell(issue||(attracts?'서로 당겨지는 배치야! 이제 실제 장치에서 사용해 보자.':'마주 보는 극이 같아 서로 밀어내. 붙잡으려면 한쪽 자석을 뒤집어 봐.'),good);
    v.draw();
  });
}
function useDesign(v: Surface){
  const r=Number(v.a.values.round||0),remote=v.s.design.template==='remote',adjusting=v.has('adjusting');
  const m=v.p('design-magnet',v.s.activities[9]?.points['design-magnet']||pt(43,55)),t=v.p('design-target',v.s.activities[9]?.points['design-target']||pt(57,55));
  const sync=()=>{const a=v.p('design-magnet',m),b=v.p('design-target',t);v.s.design.gap=distance(a,b)*2;v.s.design.aligned=assemblyAligned(a,b,remote);};
  const resetHandle=()=>{delete v.a.points['operating-magnet'];delete v.a.points['operating-target'];v.set('use-handle',remote?v.p('design-magnet',m):mailbox.handleOpen);};
  const change=()=>{sync();resetHandle();v.s.design.revision++;delete v.a.values.use0;delete v.a.values.use1;delete v.a.values['force-arrow'];v.a.values.round=0;v.tell('배치를 고쳤어. 조작 손잡이로 돌아가 다시 시험해 봐.');v.refresh();};
  sync();
  const destination=pt(t.x,r===0?42:66);
  const forceSpot=remote?pt((m.x+t.x)/2,v.p('operating-target',t).y):pt(mailbox.plate.x,62);
  const atGoal=()=>remote?!!v.a.points['operating-magnet']&&!!v.a.points['operating-target']&&Math.abs(v.a.points['operating-target'].y-destination.y)<4:v.p('use-handle',mailbox.handleOpen).y>=mailbox.handleClosed.y;
  v.draw=()=>{
    v.base();
    const handle=v.p('use-handle',remote?m:mailbox.handleOpen),g=v.ctx;
    if(adjusting){
      workshopParts(v,v.p('design-magnet',m),v.p('design-target',t),remote);
    }else if(remote){
      const pad=v.p('operating-target',t);
      workshopTank(v,637,244,425,300);
      g.save();g.lineWidth=9;g.strokeStyle='#2396a2';g.beginPath();g.moveTo(640,249);g.lineTo(640,538);g.stroke();g.restore();
      v.label('유리 밖',pt(41,35),true);v.label('물속',pt(68,35),true);
      v.target(destination,'',109,83);
      const goalLabel=r===0?'위층 도착 칸':'아래층 도착 칸';
      v.label(goalLabel,pt(Math.min(75,destination.x+13),destination.y),true);
      workshopGrip(v,pad,false);workshopGrip(v,handle,true);
      v.label('빨간 손잡이',pt(Math.max(14,handle.x-12),handle.y),true);v.label('유리벽',pt(50,78),true);
    }else{
      const lid=lidPosition(handle),open=(mailbox.handleClosed.y-lid.y)/(mailbox.handleClosed.y-mailbox.handleOpen.y);
      v.mailboxBody(r,lid,false,r===0?'편지가 든 우편함':'책이 든 보관함');
      const aligned=!assemblyIssue(m,t,false);
      const shift=((m.x-43)+(t.x-57))/2;
      const strike=pt(mailbox.plate.x+(aligned?shift:t.x-57),mailbox.plate.y);
      if(open>.23){
      if(v.s.design.pair==='iron')v.fixedPlate(strike);else v.magnet(strike,'N',.55);
      }
      const mounted=mountedMagnet(lid);
      if(open>.58)v.magnet(pt(mounted.x+(aligned?shift:m.x-43),mounted.y),opposite(v.s.design.pole),.58);
      if(open>.18){v.arrow(pt(36,43),pt(36,59));v.label('내려 닫기',pt(31,62),true);}
    }
    if(v.has('use1')&&!v.compact&&!adjusting){const arrow=v.p('force-arrow',pt(16,78));v.arrow(arrow,pt(arrow.x+9,arrow.y));v.target(forceSpot,'힘이 작용한 곳',120,70);}
  };
  if(adjusting){v.drag('design-magnet',m,change);v.drag('design-target',t,change);}
  else{
    const constrain=(p:Point)=>remote?pt(m.x,clamp(p.y,35,72)):lidPosition(p);
    const move=(handle:Point)=>{
      if(!remote)return;
      v.set('operating-magnet',handle);
      if(!assemblyIssue(m,t,true)&&(v.s.design.pair==='iron'||v.s.design.pole==='S'))v.set('operating-target',pt(t.x,handle.y));
    };
    v.drag('use-handle',remote?m:mailbox.handleOpen,p=>{
      move(p);
      v.tell(atGoal()?(remote?'패드가 도착했어! 사용 시험으로 확인해 봐.':'덮개를 닫았어! 사용 시험을 눌러 잘 붙잡는지 확인해 봐.'):remote?'빨간 손잡이를 위아래로 움직여 물속 패드를 점선 칸에 맞춰 봐.':'나무 손잡이를 잡고 아래로 끝까지 내려 줘.');
      v.draw();
    },move,constrain);
  }
  v.button('test',()=>{sync();const issue=assemblyIssue(v.p('design-magnet',m),v.p('design-target',t),remote);if(issue){v.proof(`failed${r}`,'내 발명품 사용 시험','failure',{gap:v.s.design.gap,aligned:v.s.design.aligned,reason:issue});return v.tell(issue);}
    if(v.s.design.pair==='magnet'&&v.s.design.pole==='N')return v.tell('같은 극끼리 밀어내고 있어. 배치 고치기를 열고 자석을 뒤집어 봐.');
    if(!atGoal())return v.tell(remote?`빨간 손잡이를 움직여 물속 패드를 ${r===0?'위':'아래'}층의 점선 칸에 맞춰 줘.`:'나무 손잡이를 잡고 아래로 끝까지 내려 덮개를 닫아 줘.');
    // Canonical design convention uses pole S for a successful box magnet pair.
    v.mark(`use${r}`,'다른 조건에서 사용',remote?'유리 밖 손잡이로 물속 패드를 옮겼어.':r===0?'편지를 넣고도 덮개가 고정됐어.':'책을 넣고도 덮개가 고정됐어.');v.proof(`use${r}`,v.compact?'내 설계의 실제 사용 시험':'내 설계로 두 조건 사용 시험','success',{gap:v.s.design.gap,aligned:true,load:remote?(r===0?'upper-pad':'lower-pad'):(r===0?'letter':'book')});
    // This interoperable proof lets the final restoration use the student's actual design.
    v.a.values.adjusting=false;v.proof('use','현재 발명 설계 작동','success',{gap:v.s.design.gap,aligned:true});v.refresh();
  });
  v.button('next',()=>{v.a.values.round=1;if(!remote)v.set('use-handle',mailbox.handleOpen);v.refresh();});
  v.button('adjust',()=>{v.a.values.adjusting=!adjusting;v.refresh();});
  v.button('flip',()=>{v.s.design.pole=opposite(v.s.design.pole);change();});
  if(v.has('use1')&&!v.compact&&!adjusting){
    const zone=document.createElement('div');zone.className='force-drop-zone';zone.style.left=`${forceSpot.x}%`;zone.style.top=`${forceSpot.y}%`;zone.setAttribute('aria-hidden','true');v.c.root.querySelector('.mission-board')!.append(zone);
    v.drag('force-arrow',pt(16,78),p=>{if(distance(p,forceSpot)<11){v.mark('force-arrow','힘이 작용한 곳 표현','내 발명품의 자석과 대상 사이에 힘 화살표를 놓았어.');v.tell('그 자리에서 어떤 물체가 어떤 물체를 당겼는지 이야기해 줘.',true);}else v.tell('선택한 화살표를 ‘힘이 작용한 곳’ 점선 안에 놓아 줘.');v.draw();});
  }
}
