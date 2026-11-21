import './apparatus-figures.css';
import {
  P, avg, board, boardTop, box, byDepth, castShadow, cross, dot, fill, hullInk,
  norm, pd, rod, setFigureView, shape, sub, toneI, vis,
  type Material, type Part, type Point3,
} from './vendor/colorfigures-geometry.mjs';

const wood = { l:'#dcb68d', m:'#b88664', d:'#82573e' };
const darkWood = { l:'#b48662', m:'#96684b', d:'#6c4937' };
const trim = { l:'#76aaa4', m:'#4d827c', d:'#2c5c59' };
const brass = { l:'#f0cf8c', m:'#b79354', d:'#816039' };
const iron = { l:'#e4edf0', m:'#a8b8c0', d:'#627883' };
const red = { l:'#df7668', m:'#bc4d47', d:'#863636' };
const paper = { l:'#f5edda', m:'#ddd3ba', d:'#af9f84' };
type LatchCue = 'near' | 'latched';
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
function mailbox(angle: number, inside: boolean, cue?:LatchCue, hasMagnet=true, shellOpacity=.35) {
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
  if(!hasMagnet)magnet.svg='';
  const strike=block([23,-10,45],[32.15,10,46],iron);
  strike.svg+=shape(profile(32.2,[[-10,41],[10,41],[10,46],[-10,46]]),'#b8c7ce',.65)
    +[-7,7].map(y=>shape(oval(32.3,y,43.2,.9,.9),'#596f75',0)).join('');
  const under=vis([s,0,-c]);
  const handleArt=byDepth([handle1,handle2,handle]);
  const lidArt=under?handleArt+lid.svg:lid.svg+handleArt;
  const shell=[...walls,letters,hinge,at([[31,-21,25],[31.6,21,40]],plaque),
    at([[-24,-43,26],[31.3,47.3,37]],timber)];
  const model=inside
    ? `<g opacity="${shellOpacity}">${byDepth([...shell,{...lid,svg:lidArt}])}</g>${byDepth([magnet,strike])}`
    : byDepth([...shell,{...lid,svg:under?lidArt+magnet.svg:magnet.svg+lidArt},strike]);
  const labels=inside
    ? (hasMagnet?badge(turn([55,0,-3]),1,-26,-18):'')+badge([32.2,0,43],2,29,6)
    : angle>46?badge(turn([55,0,-3]),1,-28,-9)+badge([32.2,0,43],2,26,4):'';
  const strikePoint:Point3=[26,0,46];
  const [lx,ly]=P(...strikePoint);
  const cueArt=cue==='near'&&inside
    ? `<g data-latch-cue="near">${fill(pd([turn([55,0,-3]),strikePoint],false),'none','stroke="#a16b2b" stroke-width="1.65" stroke-linecap="round" stroke-dasharray="1.5 2.2"')}</g>`
    :cue==='latched'? `<g data-latch-cue="latched"><circle cx="${lx}" cy="${ly}" r="7" fill="#ffd789" fill-opacity=".35" stroke="#ad7637" stroke-width="1.4"/><circle cx="${lx}" cy="${ly}" r="2" fill="#fff6cb" stroke="#ad7637" stroke-width=".65"/></g>`:'';
  return plinth(47,63,[[-31,-48,7],[32,-48,7],[32,48,7],[-31,48,7],turn([60,40,5])]) + model + cueArt + labels;
}

/** Reuse the complete, hinged apparatus in the student's recorded explanation. */
export function mailboxReplayArt(angle:number, hasMagnet=true) {
  setFigureView(41,26);
  return `<svg x="0" y="0" width="360" height="220" viewBox="-113 ${-85-angle} 226 ${158+angle*.5}">${mailbox(angle,true,angle===0&&hasMagnet?'latched':undefined,hasMagnet,.75)}</svg>`;
}
