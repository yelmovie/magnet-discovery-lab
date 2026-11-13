// The playable map owns its pointers; inputs over a button remain native clicks.
export function bindMapZoom(surface,{signal,enabled,onStart,onZoom,ignore='button,a,input,select,textarea,[role="button"]'}){
 const touches=new Map();
 let pinch=null,clickUntil=0;
 const point=e=>{const r=surface.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const pair=()=>{const [a,b]=touches.values();return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,gap:Math.hypot(a.x-b.x,a.y-b.y)};};
 const options={capture:true,signal};
 surface.addEventListener('pointerdown',e=>{
  if(!touches.size&&e.isPrimary)clickUntil=0;
  if(e.pointerType!=='touch'||!enabled()||e.target.closest?.(ignore)||touches.size>=2)return;
  touches.set(e.pointerId,point(e));
  if(touches.size!==2)return;
  e.preventDefault();e.stopImmediatePropagation();
  pinch=pair();clickUntil=Infinity;onStart();
  for(const id of touches.keys())try{surface.setPointerCapture(id);}catch{}
 },options);
 surface.addEventListener('pointermove',e=>{
  if(!touches.has(e.pointerId))return;
  touches.set(e.pointerId,point(e));
  if(!pinch)return;
  e.preventDefault();e.stopImmediatePropagation();
  const next=pair();
  if(enabled()&&pinch.gap>=4&&next.gap>=4)onZoom(pinch,next,next.gap/pinch.gap);
  pinch=next;
 },options);
 function release(e){
  if(e.type==='lostpointercapture'&&e.target!==surface)return;
  if(!touches.delete(e.pointerId))return;
  if(pinch||clickUntil===Infinity){
   e.stopImmediatePropagation();
   pinch=null;
   if(!touches.size)clickUntil=performance.now()+500;
  }
 }
 for(const name of ['pointerup','pointercancel','lostpointercapture']) globalThis.addEventListener(name,release,options);
 surface.addEventListener('click',e=>{
  if(e.detail&&performance.now()<clickUntil){e.preventDefault();e.stopImmediatePropagation();}
 },options);
 surface.addEventListener('wheel',e=>{
  if(!enabled()||e.target.closest?.(ignore)||!e.deltaY)return;
  e.preventDefault();e.stopImmediatePropagation();
  const at=point(e),amount=e.deltaY*(e.deltaMode===1?14:e.deltaMode===2?surface.clientHeight:1);
  onStart();onZoom(at,at,Math.exp(-Math.max(-220,Math.min(220,amount))*.002));
 },{...options,passive:false});
}
