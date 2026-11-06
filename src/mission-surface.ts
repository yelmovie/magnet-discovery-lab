import { opposite, record, type Point, type Pole } from './domain';
import { ironNutArt, materialCatalog, sortingSpecimens } from './material-sorting';
import type { Context } from './activity-types';
import { bindDrag } from './manipulation';
import { addTrial, trialOutcome } from './trial-records';
import { distance } from './mission-model';
import { playEffect, type EffectKind } from './game-audio';
import { mailbox, lidPosition, mountedMagnet } from './mailbox';
import { drawMailbox } from './mailbox-art';
import { handPose } from './experiment-hand';

export const W = 1280, H = 720;
export const pt = (x: number, y: number): Point => ({ x, y });
export const paperStart=pt(20,58);
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const themes = ['life', 'material', 'poles', 'remote', 'workshop'];
export const sprites = new Map<string, HTMLImageElement>();
export const equipmentFrames = {
  ringN: [32,87,453,324], ringS: [545,86,452,325], plate: [1064,83,439,328],
  pad: [33,561,466,366], key: [544,512,465,430], stand: [1146,467,300,505],
} as const;
export const e = (x: unknown) => String(x).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
export type Hit = { id: string; p: Point; label: string; kind?: string };


/** One shared physical surface: canvas supplies the science model, DOM supplies focus and touch targets. */
export class Surface {
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
    const watched=this.c.root.dataset.demoRun!==undefined;if(watched)this.a.values.autoObserved=true;
    const trial=addTrial(this.a, { key, activity: this.n, conditions: { label, ...extra, ...(watched?{autoplay:true}:{manual:true}) }, initialObjects: Object.entries(this.a.points).filter(([id]) => id.startsWith('initial:')&&!id.startsWith('initial:assembly-')).map(([id, p]) => ({ id: id.slice(8), ...p })), objects, input: this.path, outcome, designRevision: this.s.design.revision, template: this.s.design.template, pinned: true });
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
    const specimen=materialCatalog[index],nut=specimen.id==='nut',drawn=nut?size/2:size; // The nut art fills its frame; the others have margins.
    const img=nut?this.asset('iron-nut',ironNutArt):this.asset('material-kit','/assets/quest/material-kit.webp');
    if(img.complete&&img.naturalWidth){
      const cw=img.naturalWidth/(nut?1:3),ch=img.naturalHeight/(nut?1:2);
      this.ctx.drawImage(img,nut?0:(index%3)*cw,nut?0:Math.floor(index/3)*ch,cw,ch,p.x*W/100-drawn/2,p.y*H/100-drawn/2,drawn,drawn);
    }else this.iron(p,'',drawn*.65);
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
