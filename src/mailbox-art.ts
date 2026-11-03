import type { Point } from './domain';
import { lidPoint } from './mailbox';

/** Parallel projection keeps every face a parallelogram, including the opening lid. */
export function drawMailbox(g:CanvasRenderingContext2D, wood:HTMLImageElement, handle:Point, contents?:HTMLImageElement, drawStrike?:()=>void, layer:'all'|'body'|'lid'='all') {
  const at=(u:number,v:number,z=0)=>lidPoint(60,u,v,z);
  const cover=(u:number,v:number,z=0)=>lidPoint(handle.y,u,v,z);
  function path(points:Point[]) {
    g.beginPath();g.moveTo(points[0].x,points[0].y);
    for(const p of points.slice(1))g.lineTo(p.x,p.y);
    g.closePath();
  }
  function panel(a:Point,b:Point,d:Point,tint:string,fallback='#b5753e'){
    const c={x:b.x+d.x-a.x,y:b.y+d.y-a.y};
    g.save();path([a,b,c,d]);g.fillStyle=fallback;g.fill();
    if(wood.complete&&wood.naturalWidth){
      g.save();g.transform(b.x-a.x,b.y-a.y,d.x-a.x,d.y-a.y,a.x,a.y);
      g.drawImage(wood,0,0,1,1);g.restore();
    }
    path([a,b,c,d]);g.fillStyle=tint;g.fill();
    g.strokeStyle='#502e1e';g.lineWidth=2;g.lineJoin='round';g.stroke();g.restore();
  }
  function brass(a:Point,b:Point,d:Point){
    const grad=g.createLinearGradient(a.x,a.y,b.x+3,b.y+16);
    grad.addColorStop(0,'#724320');grad.addColorStop(.28,'#eac176');
    grad.addColorStop(.49,'#fff0b4');grad.addColorStop(.7,'#bb893d');grad.addColorStop(1,'#7c501e');
    path([a,b,{x:b.x+d.x-a.x,y:b.y+d.y-a.y},d]);g.fillStyle=grad;g.fill();
    g.strokeStyle='#62401d';g.lineWidth=1.7;g.stroke();
  }
  function screw(p:Point){
    g.fillStyle='#795523';g.beginPath();g.arc(p.x,p.y,2.6,0,Math.PI*2);g.fill();
    g.beginPath();g.moveTo(p.x-1,p.y+1);g.lineTo(p.x+1.3,p.y-1.2);g.strokeStyle='#f5d696';g.lineWidth=1;g.stroke();
  }
  g.save();
  if(layer!=='lid'){
  // Contact shadow and feet always stay on the tabletop.
  g.save();g.shadowColor='#40230f70';g.shadowBlur=17;g.fillStyle='#7e583c35';
  path([at(0,0,101),at(1,0,101),at(1,1,101),at(0,1,101)]);g.fill();g.restore();
  for(const u of [.035,.88])panel(at(u,1,80),at(u+.085,1,80),at(u,1,96),'#28150aad');
  panel(at(1,1,9),at(1,0,9),at(1,1,88),'#3e210f82');
  panel(at(0,1,9),at(1,1,9),at(0,1,88),'#55290638');
  // Recess, lining and bottom of the box. Clip the contents below the fixed rim.
  path([at(0,0,9),at(1,0,9),at(1,1,9),at(0,1,9)]);g.fillStyle='#613c26';g.fill();
  g.save();g.clip();
  const floor=26;
  panel(at(.025,.04,11),at(.975,.04,11),at(.025,.04,floor+4),'#341b0a88');
  panel(at(.97,.03,11),at(.97,.96,11),at(.97,.03,floor+4),'#372012a3');
  panel(at(.03,.06,floor),at(.97,.06,floor),at(.03,.96,floor),'#3e211b48');
  if(contents?.complete && contents.naturalWidth){
    // Lay the original artwork flat on the floor, using its aspect ratio in box space.
    const width=.36, left=.075, depth=Math.min(.45,width*440/220*contents.naturalHeight/contents.naturalWidth);
    const origin=at(left,.045,floor-1), right=at(left+width,.045,floor-1), front=at(left,.045+depth,floor-1);
    g.save();g.shadowColor='#39201180';g.shadowBlur=2;g.shadowOffsetY=1.5;
    g.transform(right.x-origin.x,right.y-origin.y,front.x-origin.x,front.y-origin.y,origin.x,origin.y);
    g.drawImage(contents,0,0,1,1);g.restore();
  }
  g.restore();
  for(const [u,v,w,h] of [[0,0,1,.055],[0,.83,1,.17],[0,.055,.024,.775],[.976,.055,.024,.775]]){
    panel(at(u,v,9),at(u+w,v,9),at(u,v+h,9),'#ffe2a433');
  }
  // The keeper sits inside the rim, with no metal extending onto the outer front wall.
  g.save();
  path([at(0,0,9),at(1,0,9),at(1,1,9),at(0,1,9)]);
  g.clip();drawStrike?.();g.restore();
  // Furniture corners belong to the body and stay visible beneath the closed lid.
  for(const u of [0,.937]){
    brass(at(u,1,14),at(u+.063,1,14),at(u,1,46));
    screw(at(u+.032,1,29));
    brass(at(u,1,66),at(u+.063,1,66),at(u,1,82));
    screw(at(u+.032,1,74));
  }
  }
  if(layer!=='body'){
  // Lid has its own material thickness even as the broad face turns edge-on.
  const inside=cover(0,1).y<cover(0,0).y;
  panel(cover(1,1),cover(1,0),cover(1,1,10),'#3e200d94');
  panel(cover(0,1),cover(1,1),cover(0,1,10),'#40220b6e');
  panel(cover(0,0),cover(1,0),cover(0,1),inside?'#69412548':'#ffe1a134');
  // Routed inset on the wood and gold corner protectors.
  path([cover(.055,.09),cover(.945,.09),cover(.945,.91),cover(.055,.91)]);
  g.strokeStyle=inside?'#734828':'#93602f';g.lineWidth=2.4;g.stroke();
  for(const u of [0,.933])for(const v of [0,.85]){
    brass(cover(u,v,-.8),cover(u+.067,v,-.8),cover(u,v+.15,-.8));
    screw(cover(u+.034,v+.074,-.8));
  }
  for(const u of [.15,.79]){
    const pivot=cover(u,0);
    g.save();g.translate(pivot.x,pivot.y);g.rotate(.04);
    const grad=g.createLinearGradient(0,-4,0,5);
    grad.addColorStop(0,'#775226');grad.addColorStop(.36,'#ffe5a4');grad.addColorStop(1,'#926329');
    g.fillStyle=grad;g.strokeStyle='#674420';g.lineWidth=1.3;g.beginPath();g.roundRect(-15,-4,30,9,3);g.fill();g.stroke();g.restore();
  }
  }
  g.restore();
}

/** The top keeper bends down the outer front wall; its screws visibly anchor it to the wood. */
export function drawStrikeBracket(g:CanvasRenderingContext2D,p:Point) {
  g.save();g.translate(p.x*12.8,p.y*7.2);g.rotate(Math.atan2(18,440));
  const face=g.createLinearGradient(0,5,0,24);
  face.addColorStop(0,'#757b7a');face.addColorStop(.22,'#c1c7c3');face.addColorStop(1,'#727772');
  g.fillStyle=face;g.strokeStyle='#414844';g.lineWidth=1.7;
  g.beginPath();g.roundRect(-42,4,85,21,[0,0,4,4]);g.fill();g.stroke();
  for(const x of [-33,33]){
    g.fillStyle='#c9cdbe';g.beginPath();g.arc(x,16,3.1,0,Math.PI*2);g.fill();g.stroke();
    g.beginPath();g.moveTo(x-1.4,17.3);g.lineTo(x+1.4,14.7);g.stroke();
  }
  g.beginPath();g.moveTo(-42,6);g.lineTo(-35,-9);g.lineTo(50,-9);g.lineTo(43,6);g.closePath();
  g.fillStyle='#a5aba4';g.fill();g.stroke();
  g.restore();
}

/** A removable part rests in a felt-lined socket on the worktable beside the box. */
export function drawMagnetTray(g:CanvasRenderingContext2D,p:Point) {
  g.save();g.translate(p.x*12.8,p.y*7.2);
  g.shadowColor='#49351f6b';g.shadowBlur=7;g.shadowOffsetY=5;
  g.fillStyle='#845732';g.strokeStyle='#604128';g.lineWidth=2;
  g.beginPath();g.roundRect(-77,-29,154,66,12);g.fill();g.shadowColor='transparent';g.stroke();
  const rim=g.createLinearGradient(0,-30,0,26);rim.addColorStop(0,'#e7c693');rim.addColorStop(1,'#c59863');
  g.fillStyle=rim;g.beginPath();g.roundRect(-77,-33,154,62,12);g.fill();g.stroke();
  g.fillStyle='#58766b';g.strokeStyle='#435b50';g.beginPath();g.roundRect(-66,-24,132,43,9);g.fill();g.stroke();
  g.fillStyle='#40594f';g.beginPath();g.roundRect(-46,-12,92,24,7);g.fill();
  g.restore();
}

/** Assembly drawing viewed from above, rotated so the hinge runs down the middle. */
export function drawAssemblyCase(g:CanvasRenderingContext2D,wood:HTMLImageElement) {
  g.save();
  for(const [x,width,depth] of [[443,186,8],[646,186,22]]){
    const top=327,h=133;
    g.fillStyle='#55361f';g.strokeStyle='#55361f';g.lineWidth=2;
    g.beginPath();g.roundRect(x,top+depth,width,h,8);g.fill();g.stroke();
    g.save();g.beginPath();g.roundRect(x,top,width,h,7);g.clip();
    g.fillStyle='#ad7745';g.fillRect(x,top,width,h);
    if(wood.complete&&wood.naturalWidth)g.drawImage(wood,x,top,width,h);
    g.fillStyle=depth>10?'#3d200c65':'#ffdead15';g.fillRect(x+9,top+10,width-18,h-20);
    g.strokeStyle='#714621';g.strokeRect(x+9,top+10,width-18,h-20);g.restore();
  }
  for(const y of [348,431]){
    const metal=g.createLinearGradient(0,y,0,y+13);metal.addColorStop(0,'#976626');metal.addColorStop(.4,'#ffe1a4');metal.addColorStop(1,'#92602d');
    g.fillStyle=metal;g.strokeStyle='#6b451e';g.beginPath();g.roundRect(622,y,31,13,3);g.fill();g.stroke();
  }
  g.restore();
}
