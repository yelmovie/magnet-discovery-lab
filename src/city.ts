import Phaser from 'phaser';
import type { Point } from './domain';
export const places = [
 {x:94,y:146,entry:{x:96,y:161},label:'생활 자석 조사국'},
 {x:173,y:66,entry:{x:174,y:82},label:'힘 실험 연구소'},
 {x:334,y:67,entry:{x:333,y:84},label:'극성 복원 센터'},
 {x:383,y:151,entry:{x:382,y:169},label:'원격 제어 구역'},
 {x:321,y:219,entry:{x:320,y:236},label:'시민 발명 공방'},
 {x:240,y:154,entry:{x:239,y:176},label:'자기 코어 관제소'},
];
interface CityOptions { progress:number; completed:number; start:Point; motion:boolean; onArrive:(i:number)=>void; onPosition:(p:Point)=>void; onRecord:()=>void; onLoadError?:(file:string)=>void }
export interface CityHandle { goTo:(i:number)=>void; direction:(x:number,y:number)=>void; pause:(paused:boolean)=>void; motion:(enabled:boolean)=>void; destroy:()=>void }
// Hand-surveyed waypoints follow the paved paths in city-map-v2.
const nodes:Point[] = [
 {x:239,y:288},{x:200,y:267},{x:203,y:232},{x:219,y:201},{x:239,y:185},
 {x:180,y:174},{x:143,y:167},{x:97,y:161},{x:172,y:145},{x:173,y:115},
 {x:171,y:94},{x:174,y:82},{x:218,y:76},{x:249,y:74},{x:292,y:91},
 {x:333,y:84},{x:314,y:119},{x:319,y:153},{x:342,y:174},{x:382,y:169},
 {x:290,y:194},{x:289,y:229},{x:320,y:236},{x:278,y:269},{x:239,y:176},
];
const edges:[number,number][] = [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7],[5,8],[8,9],[9,10],[10,11],[10,12],[12,13],[13,14],[14,15],[14,16],[16,17],[17,18],[18,19],[18,20],[20,4],[20,21],[21,22],[21,23],[23,0],[4,24]];
const entries=[7,11,15,19,22,24];
const nearest=(p:Point)=>nodes.reduce((best,n,i)=>Math.hypot(n.x-p.x,n.y-p.y)<Math.hypot(nodes[best].x-p.x,nodes[best].y-p.y)?i:best,0);
class CityScene extends Phaser.Scene {
 private opts:CityOptions; private actor!:Phaser.GameObjects.Container; private route:Point[]=[]; private destination:number|null=null;
 private path!:Phaser.GameObjects.Graphics; private paused=false; private keys!:Record<string,Phaser.Input.Keyboard.Key>; private held={x:0,y:0}; private moving=false;
 private pendingTo:number|null=null;
 constructor(opts:CityOptions){super('city');this.opts=opts;}
 preload(){this.load.on('loaderror',(file:Phaser.Loader.File)=>{if(file.key==='city-map-v2')this.opts.onLoadError?.('/assets/adventure/city-map-v2.webp');});this.load.image('city-map-v2','/assets/adventure/city-map-v2.webp');this.load.spritesheet('mili-v2','/assets/adventure/mili-poses-tablet.webp',{frameWidth:304,frameHeight:405});this.load.spritesheet('dangi-v2','/assets/adventure/dangi-poses-tablet.webp',{frameWidth:304,frameHeight:405});}
 create(){
  this.cameras.main.setZoom(2).centerOn(240,160);
  this.add.image(0,0,'city-map-v2').setOrigin(0).setDisplaySize(480,320);this.path=this.add.graphics().setDepth(2);
  const start=nodes[nearest(this.opts.start)],shadow=this.add.ellipse(0,0,17,5,0x173e4b,.25),sprite=this.add.sprite(0,-1,'mili-v2',0).setDisplaySize(20,27).setOrigin(.5,1);
  this.actor=this.add.container(start.x,start.y,[shadow,sprite]).setDepth(10);
  const dangi=this.add.sprite(258,183,'dangi-v2',0).setDisplaySize(19,26).setOrigin(.5,1).setDepth(10).setInteractive({useHandCursor:true});
  dangi.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(!this.paused)this.opts.onRecord();});
  places.forEach((p,i)=>{const restored=i<5?i<this.opts.completed:this.opts.progress===100;if(restored){const light=this.add.circle(p.x,p.y-7,5,0xffdd75,.8).setDepth(3);if(this.opts.motion)this.tweens.add({targets:light,alpha:.35,scale:1.5,duration:1800,yoyo:true,repeat:-1});this.add.text(p.x+13,p.y-3,'✓',{fontSize:'10px',color:'#efffda',backgroundColor:'#286c53',padding:{x:2,y:1}}).setDepth(4);}});
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string,Phaser.Input.Keyboard.Key>;
  this.input.keyboard!.on('keydown-ENTER',()=>{if(this.paused)return;const i=places.findIndex(p=>Math.hypot(p.entry.x-this.actor.x,p.entry.y-this.actor.y)<15);if(i>=0)this.opts.onArrive(i);});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(this.paused)return;const point={x:p.worldX,y:p.worldY};const i=places.findIndex(b=>Math.abs(point.x-b.x)<27&&point.y>b.y-45&&point.y<b.y+12);if(i>=0)this.goTo(i);else{this.destination=null;this.moveTo(nearest(point));}});
  this.game.events.on('blur',this.stop,this);this.events.on('shutdown',()=>this.game.events.off('blur',this.stop,this));
  if(this.pendingTo!==null){const i=this.pendingTo;this.pendingTo=null;this.goTo(i);}
 }
 private moveTo(goal:number){
  const start=nearest(this.actor),queue=[start],parent=new Map<number,number>(),seen=new Set([start]);
  while(queue.length){const n=queue.shift()!;if(n===goal)break;for(const[a,b]of edges){const other=a===n?b:b===n?a:-1;if(other>=0&&!seen.has(other)){seen.add(other);parent.set(other,n);queue.push(other);}}}
  if(!seen.has(goal))return;const route=[goal];while(route[0]!==start){const p=parent.get(route[0]);if(p===undefined)break;route.unshift(p);}
  this.route=route.map(i=>nodes[i]);this.path.clear().lineStyle(1.7,0xffe187,.9).beginPath().moveTo(this.actor.x,this.actor.y);for(const p of this.route)this.path.lineTo(p.x,p.y);this.path.strokePath();this.path.fillStyle(0xffdc6b,.7).fillEllipse(nodes[goal].x,nodes[goal].y,14,6);
 }
 goTo(i:number){if(!places[i])return;if(!this.actor){this.pendingTo=i;return;}if(this.paused)return;this.destination=i;this.moveTo(entries[i]);}
 direction(x:number,y:number){this.held={x,y};}
 setPaused(p:boolean){this.paused=p;if(p)this.stop();}
 setMotion(v:boolean){this.opts.motion=v;if(v)this.tweens.resumeAll();else this.tweens.pauseAll();}
 private stop(){this.route=[];this.destination=null;this.held={x:0,y:0};if(this.keys)Object.values(this.keys).forEach(k=>k.reset());this.path?.clear();}
 update(time:number,delta:number){
  if(!this.actor||this.paused)return;
  const dx=this.held.x+Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),dy=this.held.y+Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown);
  if((dx||dy)&&!this.route.length){const n=nearest(this.actor);const options=edges.flatMap(([a,b])=>a===n?[b]:b===n?[a]:[]).filter(i=>(nodes[i].x-nodes[n].x)*dx+(nodes[i].y-nodes[n].y)*dy>0).sort((a,b)=>{const score=(i:number)=>((nodes[i].x-nodes[n].x)*dx+(nodes[i].y-nodes[n].y)*dy)/Math.hypot(nodes[i].x-nodes[n].x,nodes[i].y-nodes[n].y);return score(b)-score(a);});if(options.length){this.destination=null;this.moveTo(options[0]);}}
  const sprite=this.actor.list[1] as Phaser.GameObjects.Sprite;
  if(this.route.length){const p=this.route[0],d=Math.hypot(p.x-this.actor.x,p.y-this.actor.y),step=Math.min(delta,40)*.085;if(d<=step){this.actor.setPosition(p.x,p.y);this.route.shift();}else{const x=p.x-this.actor.x;this.actor.x+=x/d*step;this.actor.y+=(p.y-this.actor.y)/d*step;sprite.setFlipX(x<0);}this.moving=true;sprite.y=this.opts.motion?Math.sin(time/80)*1.2-1:-1;}
  else if(this.moving){this.moving=false;sprite.y=-1;this.path.clear();this.opts.onPosition({x:this.actor.x,y:this.actor.y});if(this.destination!==null){const i=this.destination;this.destination=null;this.opts.onArrive(i);}}
 }
}
export function mountCity(host:HTMLElement,opts:CityOptions):CityHandle{
 const scene=new CityScene(opts),game=new Phaser.Game({type:Phaser.AUTO,parent:host,width:960,height:640,backgroundColor:'#a7c5b5',pixelArt:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene,audio:{noAudio:true},banner:false});
 return {goTo:i=>scene.goTo(i),direction:(x,y)=>scene.direction(x,y),pause:p=>scene.setPaused(p),motion:v=>scene.setMotion(v),destroy:()=>game.destroy(true)};
}
