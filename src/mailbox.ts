import type { Activity, Point } from './domain';

// Model coordinates in the 1280 × 720 bench. Both hardware and pointer targets
// use this projection. Only the hinged panel rotates; the chassis is stationary.
const hinge = { x: 434, y: 358 };
const span = { x: 440, y: 18 };
const closedDepth = 84, lift = 95, reach = 61;
const centre = .5;
const phase = Math.atan2(lift,closedDepth);
const radius = Math.hypot(closedDepth,lift);
function depthAt(y:number) {
  const front = closedDepth - (60-y)*7.2;
  const angle = Math.acos(front/radius) - phase;
  return {x:-reach*Math.cos(angle), y:front, angle};
}
export function lidPoint(y:number, across:number, forward:number, down=0):Point {
  const d=depthAt(y);
  return {x:hinge.x + span.x*across + d.x*forward, y:hinge.y + span.y*across + d.y*forward + down};
}
function percent(p:Point):Point { return {x:p.x/12.8,y:p.y/7.2}; }
export function lidPosition(p:Point):Point {
  const y=Math.max(38,Math.min(60,p.y));
  return {x:lidPoint(y,centre,1).x/12.8,y};
}
export function mountedMagnet(handle:Point):Point {
  // The pocket and the bent strike meet along the front rim when the lid closes.
  // The recessed seat is below the handle on the inner face. Its lip is seen in
  // profile when open and edge-on at the point where the magnet meets the strike.
  const innerFace=14*Math.sin(depthAt(handle.y).angle);
  return percent(lidPoint(handle.y,centre,.96,1+innerFace));
}
const open=lidPosition({x:0,y:38}),closed=lidPosition({x:0,y:60});
const latch=mountedMagnet(closed);
export const mailbox = {
  handleOpen:open,handleClosed:closed,socket:mountedMagnet(open),
  plate:{x:latch.x,y:latch.y+.8},looseMagnet:{x:20,y:62},
};
export function inSocket(p:Point):boolean {
  return Math.abs(p.x-mailbox.socket.x)<5 && Math.abs(p.y-mailbox.socket.y)<4.5;
}
export function magnetInstalled(p:Point):boolean {
  return p.x===mailbox.socket.x && p.y===mailbox.socket.y;
}

export function updateMailboxLayout(a:Activity) {
  if(a.values.mailboxLayout===4)return;
  const layouts:Record<number,[number,number]>={2:[centre,.73],3:[centre,.96]};
  const [previousAcross,previousForward]=layouts[Number(a.values.mailboxLayout)]??[.684,.91];
  const previousSocket=percent(lidPoint(open.y,previousAcross,previousForward,1));
  const previousLatch=percent(lidPoint(closed.y,previousAcross,previousForward,1));
  const near=(p:Point,target:Point)=>Math.hypot(p.x-target.x,p.y-target.y);
  for(const prefix of ['','initial:']){
    const magnet=a.points[prefix+'repair-magnet'];
    if(magnet){
      const mounted=Math.abs(magnet.x-previousSocket.x)<5 && Math.abs(magnet.y-previousSocket.y)<4.5
        || !a.values.mailboxLayout && near(magnet,{x:43,y:59})<9;
      a.points[prefix+'repair-magnet']={...(mounted?mailbox.socket:mailbox.looseMagnet)};
    }
    const strike=a.points[prefix+'repair-plate'];
    if(strike && near(strike,{x:previousLatch.x,y:previousLatch.y+.8})<7)a.points[prefix+'repair-plate']={...mailbox.plate};
    if(a.points[prefix+'fixed-plate'])a.points[prefix+'fixed-plate']={...mailbox.plate};
    if(a.points[prefix+'fixed-magnet']){
      const shut=!prefix && a.values[`latch${Number(a.values.round||0)}`]===true;
      a.points[prefix+'fixed-magnet']={...(shut?latch:mailbox.socket)};
    }
  }
  if(a.points.lid)a.points.lid=lidPosition(a.points.lid);
  a.values.mailboxLayout=4;
}
