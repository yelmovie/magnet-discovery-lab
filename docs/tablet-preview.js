(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const scene = $('scene'), dialog = $('recordDialog');
let view = 'distance', activePointer = null, dragCancel = null, timer = null, pendingTest = null;
const records = [];
const fresh = {
  distance: () => ({x:20,phase:'distance',near:false,paper:false,explained:false}),
  invention: () => ({x:24,tested:false,success:false,busy:false,explained:false}),
  delivery: () => ({x:61,cart:33,flipped:true,arrived:false,explained:false}),
  compass: () => ({x:76,y:53,flipped:false,moved:false})
};
let states = Object.fromEntries(Object.entries(fresh).map(([key,fn])=>[key,fn()]));
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function magnet(id,x,y,flipped=false,fixed=false) {
 return '<'+(fixed?'div':'button')+' '+(id?'id="'+id+'" ':'')+'class="magnet '+(flipped?'flipped ':'')+(fixed?'fixed':'drag')+'" style="left:'+x+'%;top:'+y+'%" '+(fixed?'aria-label="자석"':'aria-label="자석 움직이기. 방향키로도 움직일 수 있어요."')+'><span>'+(flipped?'S':'N')+'</span><span>'+(flipped?'N':'S')+'</span></'+(fixed?'div':'button')+'>';
}
function guide(text,success=false) {
 $('guide').textContent=text; $('guideIcon').textContent=success?'✓':'☝';
 $('guideIcon').classList.toggle('success',success);
}
function actions(items) {
 $('actions').replaceChildren(...items.map(([label,fn,type='secondary'])=>{
  const b=document.createElement('button'); b.textContent=label;b.className=type;b.onclick=fn;return b;
 }));
}
function heading(place,step,question) {$('place').textContent=place;$('step').textContent=step;$('question').textContent=question;}
function record(kind,data) {
 records.push({kind,...data}); $('recordCount').textContent=records.length;
}
function stopInput() {if(dragCancel) dragCancel();activePointer=null;dragCancel=null;}
function drag(el,get,move,end=()=>{},range={x:[10,90],y:[20,80]},parent=scene) {
 let start=null,origin=null;
 const cancel=()=>{if(start&&el.hasPointerCapture(activePointer))el.releasePointerCapture(activePointer);start=null;origin=null;activePointer=null;};
 el.addEventListener('pointerdown',e=>{
  if(activePointer!==null||dialog.open||e.button!==0)return;
  activePointer=e.pointerId;start={x:e.clientX,y:e.clientY};origin=get();
  el.setPointerCapture(e.pointerId);dragCancel=cancel;
 });
 el.addEventListener('pointermove',e=>{
  if(!start||activePointer!==e.pointerId)return;
  const r=parent.getBoundingClientRect();
  move({x:clamp(origin.x+(e.clientX-start.x)/r.width*100,...range.x),y:clamp(origin.y+(e.clientY-start.y)/r.height*100,...range.y)});
 });
 el.addEventListener('pointerup',e=>{if(e.pointerId===activePointer&&start){cancel();end();}});
 el.addEventListener('pointercancel',cancel);
 el.addEventListener('lostpointercapture',()=>{start=null;origin=null;activePointer=null;});
 el.addEventListener('keydown',e=>{
  const dx={ArrowLeft:-4,ArrowRight:4}[e.key]||0,dy={ArrowUp:-6,ArrowDown:6}[e.key]||0;
  if(!dx&&!dy)return;e.preventDefault();const p=get();
  move({x:clamp(p.x+dx,...range.x),y:clamp(p.y+dy,...range.y)});end();
 });
}
function show() {
 stopInput();if(timer)clearTimeout(timer);timer=null;pendingTest=null;states.invention.busy=false;scene.classList.remove('shake');
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 ({distance:distance,invention:invention,delivery:delivery,compass:compass})[view]();
}
function distance() {
 const s=states.distance;
 heading('자석 실험실',s.phase==='distance'?'01 · 거리 알아보기':'02 · 종이 넣어 보기',s.phase==='distance'?'얼마나 가까이 가야 붙을까?':'종이가 사이에 있어도 붙을까?');
 scene.innerHTML='<div class="track"></div><div class="badge" style="left:5%;top:6%">철 클립</div><div class="distance-mark"><span>멀리</span><span>가까이</span></div>'+
 magnet('distanceMagnet',s.x,53,false,s.phase!=='distance')+
 '<div id="clip" class="clip object" style="left:72%;top:53%" aria-label="철 클립"></div>'+
 (s.phase==='distance'?'<span id="gesture" class="gesture" aria-hidden="true">손으로 밀기 →</span>':
 '<span class="badge" style="left:5%;top:19%">자석은 여기 그대로</span><div class="paper-slot" style="left:57%;top:53%"></div><button id="paper" class="paper drag '+(s.paper?'placed':'')+'" style="left:'+(s.paper?57:26)+'%;top:'+(s.paper?53:78)+'%" aria-label="종이 움직이기">'+(s.paper?'':'종이')+'</button>');
 if(s.phase==='distance'){
  updateDistance(false);
  drag($('distanceMagnet'),()=>({x:s.x,y:53}),p=>{s.x=p.x;updateDistance(true);},()=>saveDistance(),{x:[14,48],y:[53,53]});
  distanceActions();
 } else {
  if(s.paper){paperResult();}else{
   $('clip').style.left='72%';guide('종이를 점선 안에 넣어 보세요.');
   let p={x:26,y:78};
   drag($('paper'),()=>({...p}),q=>{p=q;$('paper').style.left=q.x+'%';$('paper').style.top=q.y+'%';},()=>{
    if(Math.abs(p.x-57)<14&&Math.abs(p.y-53)<23)placePaper();
    else{p={x:26,y:78};$('paper').style.left='26%';$('paper').style.top='78%';guide('종이를 가운데 점선에 놓아 보세요.');}
   });
   actions([['종이 넣기',placePaper,'primary']]);
  }
 }
}
function updateDistance(interacted) {
 const s=states.distance,near=s.x>=43;
 $('distanceMagnet').style.left=s.x+'%';
 const offset=(($('distanceMagnet').getBoundingClientRect().width+$('clip').getBoundingClientRect().width)/2-3)/scene.clientWidth*100;
 $('clip').style.left=(near?s.x+offset:72)+'%';
 if(interacted){if(!records.some(r=>r.kind==='distance'))record('distance',{condition:'far',x:20,outcome:'클립이 움직이지 않았어요.'});$('gesture')?.remove();guide(near?'가까이 가니 클립이 붙었어요.':'클립이 아직 움직이지 않아요.',near);}
 else guide(s.near?'거리를 다시 바꾸어 보세요.':'자석을 클립 쪽으로 밀어 보세요.');
 if(near&&!s.near){s.near=true;distanceActions();}
}
function saveDistance(){
 const s=states.distance,near=s.x>=43,kind=near?'near':'far';
 if(!records.some(r=>r.kind==='distance'&&r.condition===kind))record('distance',{condition:kind,x:s.x,outcome:near?'클립이 붙었어요.':'클립이 움직이지 않았어요.'});
}
function distanceActions(){
 const s=states.distance;
 actions(s.near?[['다시 멀리',()=>{s.x=20;updateDistance(true);saveDistance();}],['종이도 넣기',startPaper,'primary']]:
 [['조금 더 가까이',()=>{saveDistance();s.x=clamp(s.x+8,14,48);updateDistance(true);saveDistance();},'primary']]);
}
function startPaper(){
 const s=states.distance;s.phase='paper';s.x=records.findLast(r=>r.kind==='distance'&&r.condition==='near')?.x||48;s.paper=false;
 record('paper',{paper:false,x:s.x,outcome:'종이 없이 붙었어요.'});
 distance();
}
function placePaper(){
 const s=states.distance;if(s.paper)return;s.paper=true;
 record('paper',{paper:true,x:s.x,outcome:'종이가 있어도 붙었어요.'});
 distance();
}
function paperResult(){
 const clip=$('clip'),paper=$('paper');paper.disabled=true;paper.tabIndex=-1;
 clip.style.left=(57+(clip.getBoundingClientRect().width/2+9)/scene.clientWidth*100)+'%';
 guide('종이가 있어도 클립이 다가왔어요.',true);
 actions([['나란히 보기',()=>openRecords('paper')],['발견 말하기',()=>explainDistance(),'primary']]);
}
function explainDistance(){
 heading('자석 실험실','발견 말하기','무엇을 발견했나요?');
 guide('방금 본 모습과 같은 말을 골라 보세요.');
 actions([['종이를 사이에 두어도 당겨요',()=>{
  states.distance.explained=true;record('explanation',{title:'거리·종이',outcome:'종이를 사이에 두어도 자석이 철 클립을 당겨요.'});
  guide('관찰한 모습을 잘 설명했어요.',true);actions([['내 발명으로',()=>switchView('invention'),'primary']]);
 },'choice'],['종이가 자석을 꺼요',()=>{guide('종이를 넣었을 때 클립이 움직였는지 다시 보세요.');actions([['다시 관찰하기',distance,'primary']]);},'choice']]);
}
function invention() {
 const s=states.invention;
 heading('발명 작업실','내 발명 · 자석 우편함','흔들려도 뚜껑이 닫혀 있을까?');
 scene.innerHTML='<div id="mailbox" class="mailbox"><div class="mail-slot"></div><span class="mail-icon" aria-hidden="true">✉</span></div><span class="caption" style="left:50%;top:22%">뚜껑</span><div id="lid" class="lid">'+magnet('lidMagnet',s.x,75)+'</div><div class="ironplate" aria-label="몸통에 고정된 철판"></div><span class="caption ironlabel">← 철판</span>';
 drag($('lidMagnet'),()=>({x:s.x,y:100}),p=>{
  if(s.busy)return;
  s.x=p.x;s.tested=false;s.success=false;$('lidMagnet').style.left=s.x+'%';$('lid').classList.remove('failed');
  guide('이 위치에서 뚜껑을 닫아 볼까요?');inventionActions();
 },()=>{},{x:[12,88],y:[100,100]},$('lid'));
 guide(s.tested?(s.success?'흔들어도 뚜껑이 닫혀 있어요.':'흔드니 뚜껑이 열렸어요. 자석을 옮겨 보세요.'):'뚜껑의 자석을 움직여 보세요.',s.success);
 if(s.tested&&!s.success)$('lid').classList.add('failed');
 inventionActions();
}
function inventionActions(){
 const s=states.invention;if(s.busy)return;
 const trials=records.filter(r=>r.kind==='invention');
 if(s.success)actions([...(trials.length>=2?[['비교 보기',()=>openRecords('invention')]]:[]),['발견 말하기',explainInvention,'primary']]);
 else actions([['철판 쪽으로',()=>{s.x=82;s.tested=false;$('lidMagnet').style.left='82%';$('lid').classList.remove('failed');guide('이 위치에서 뚜껑을 닫아 볼까요?');}],['닫아 보기',testInvention,'primary']]);
}
function testInvention(){
 const s=states.invention;if(s.busy)return;s.busy=true;
 $('lid').classList.remove('failed');scene.classList.add('shake');
 guide('똑같은 세기로 흔들어 보고 있어요.');
 actions([]);$('lidMagnet').disabled=true;
 const testedX=s.x;
 pendingTest=()=>{
  timer=null;pendingTest=null;scene.classList.remove('shake');s.busy=false;s.tested=true;s.success=Math.abs(testedX-82)<11;
  record('invention',{x:testedX,success:s.success,outcome:s.success?'흔들어도 닫혀 있어요.':'흔드니 뚜껑이 열렸어요.'});
  invention();
 };
 timer=setTimeout(pendingTest,800);
}
function explainInvention(){
 $('lidMagnet').disabled=true;
 heading('발명 작업실','발견 말하기','왜 뚜껑이 잘 닫혀 있을까요?');
 guide('내 발명에서 일어난 일을 골라 보세요.');
 actions([['자석이 철판을 당겨요',()=>{
  states.invention.explained=true;record('explanation',{title:'내 발명',outcome:'자석이 철판을 당겨 뚜껑이 닫혀 있어요.'});
  guide('내 발명을 완성했어요!',true);actions([['한 번 더 바꾸기 · 선택',()=>{states.invention.tested=false;states.invention.success=false;invention();}],['마지막 복구로',()=>switchView('delivery'),'primary']]);
 },'choice'],['자석이 철판을 밀어요',()=>{guide('자석과 철판이 붙는 모습을 다시 보세요.');actions([['다시 관찰하기',invention,'primary']]);},'choice']]);
}
function delivery() {
 const s=states.delivery;
 if(s.explained){finishRoute();return;}
 heading('도시의 마지막 장치','한 곳만 고치면 돼요','수레를 초록 도착 칸으로 보내려면?');
 scene.innerHTML='<div class="route" aria-label="전체 연결: 나머지 세 구간은 이전 기록 재생 예시"><span>① 철 찾기 <b>· 재생 예시</b></span><span class="'+(s.arrived?'done':'active')+'">② 수레 보내기</span><span>③ 고리 <b>· 재생 예시</b></span><span>④ 내 발명 <b>· 재생 예시</b></span></div><div class="road"></div><div class="garage">도착</div><div class="facing"><span class="pole s">S</span><span>↔</span><span id="controlPole" class="pole '+(s.flipped?'s':'')+'">'+(s.flipped?'S':'N')+'</span><span>마주 보는 극</span></div><div id="cart" class="cart" style="left:'+s.cart+'%"><span class="cargo-label">철 화물</span><span class="cargo">철</span>'+magnet('',50,15,false,true)+'</div>'+magnet('controlMagnet',s.x,54,s.flipped);
 drag($('controlMagnet'),()=>({x:s.x,y:54}),p=>{s.x=p.x;updateDelivery();},saveDelivery,{x:[26,94],y:[54,54]});
 if(s.arrived){deliveryArrived();return;}
 guide('손에 든 자석을 수레 가까이 옮겨 보세요.');
 actions([['자석 뒤집기',flipDelivery],['자석을 오른쪽으로 →',()=>{s.x=clamp(s.x+6,26,94);updateDelivery();saveDelivery();},'primary']]);
 // Touch-friendly alternate position control, only needed when starting outside attraction range.
 const approach=document.createElement('button');approach.className='quiet approach';approach.textContent='← 가까이';approach.style.cssText='position:absolute;left:5%;bottom:5%';
 approach.onclick=()=>{s.x=clamp(s.cart+16,26,94);updateDelivery();saveDelivery();};scene.append(approach);
}
function flipDelivery(){
 const s=states.delivery;s.flipped=!s.flipped;
 const m=$('controlMagnet');m.classList.toggle('flipped',s.flipped);m.children[0].textContent=s.flipped?'S':'N';m.children[1].textContent=s.flipped?'N':'S';
 $('controlPole').textContent=s.flipped?'S':'N';$('controlPole').classList.toggle('s',s.flipped);
 updateDelivery();saveDelivery();
}
function updateDelivery(){
 const s=states.delivery;if(s.arrived)return;
 $('controlMagnet').style.left=s.x+'%';
 const gap=s.x-s.cart;
 if(gap>0&&gap<34){
  if(s.flipped){s.cart=clamp(Math.min(s.cart,s.x-27),14,82);guide('같은 극끼리 마주 보니 수레가 밀려나요.');}
  else{s.cart=clamp(s.x-12,14,82);guide('다른 극끼리 당겨요. 자석을 오른쪽으로 옮겨 보세요.',true);}
 }else guide('자석을 수레 가까이 옮겨 보세요.');
 $('cart').style.left=s.cart+'%';
 if(s.cart>=78){s.arrived=true;record('delivery',{success:true,outcome:'다른 극끼리 당기는 힘으로 수레를 보냈어요.'});deliveryArrived();}
}
function saveDelivery(){
 const s=states.delivery;if(s.arrived)return;
 if(s.x-s.cart<35&&!records.some(r=>r.kind==='delivery'&&r.flipped===s.flipped))record('delivery',{flipped:s.flipped,outcome:s.flipped?'같은 극끼리 밀어냈어요.':'다른 극끼리 당겼어요.'});
}
function deliveryArrived(){
 $('controlMagnet').disabled=true;scene.querySelector('.approach')?.remove();scene.querySelector('.route span:nth-child(2)').className='done';
 guide('도착했어요! 수레의 자석과 어떤 극이 마주 봤나요?',true);
 actions([['서로 다른 극',()=>{
  states.delivery.explained=true;record('explanation',{title:'수레 보내기',outcome:'서로 다른 극끼리 당겨요.'});
  guide('고장 난 곳을 고쳤어요.',true);actions([['전체 연결 보기',finishRoute,'primary']]);
 },'choice'],['서로 같은 극',()=>{guide('수레의 S극과 손에 든 자석의 N극을 살펴보세요.');},'choice']]);
}
function finishRoute(){
 scene.innerHTML='<div class="done-banner"><div class="big-check" aria-hidden="true">✓</div><strong>도시가 다시 움직여요!</strong><span>철 찾기 → 수레 보내기 → 고리 → 내 발명</span><span class="pill">수레는 내가 복구했어요</span><span class="eyebrow">다른 세 구간은 이전 기록을 이어 보는 예시예요.</span></div>';
 heading('도시의 마지막 장치','기본 미션 완료','내 발견이 도시를 움직였어요');
 guide('한 곳을 해결해도 기본 미션은 완료돼요.',true);
 actions([['내 실험 기록',()=>openRecords()],['나침반도 해 보기 · 선택',()=>switchView('compass'),'primary']]);
}
function compass(){
 const s=states.compass;
 heading('더 해 보기 · 선택','나침반 관찰','자석을 옮기면 바늘은 어디로 돌까?');
 scene.innerHTML='<div class="needle-wrap"><span class="north">북</span><div id="needle" class="needle"></div><div class="needle-center"></div></div><span class="compass-legend"><span style="color:#b42f45">빨간 쪽</span>이 바늘의 N극이에요</span>'+magnet('compassMagnet',s.x,s.y,s.flipped);
 drag($('compassMagnet'),()=>({x:s.x,y:s.y}),p=>{
  // Keep the hand and magnet outside the dial.
  const w=scene.clientWidth,h=scene.clientHeight,dx=(p.x-45)*w/100,dy=(p.y-53)*h/100;
  if(Math.hypot(dx,dy)<150)return;s.x=p.x;s.y=p.y;s.moved=true;updateCompass();
 },()=>{
  if(s.moved&&!records.some(r=>r.kind==='compass'))record('compass',{outcome:'자석을 옮기니 나침반 바늘이 돌아갔어요.'});
 },{x:[12,88],y:[12,76]});
 updateCompass();guide('자석을 나침반 둘레로 움직여 보세요.');
 actions([['자석 뒤집기',()=>{s.flipped=!s.flipped;compass();}],['위쪽에 놓기',()=>{s.x=45;s.y=12;s.moved=true;updateCompass();record('compass',{outcome:'자석을 위쪽에 놓고 바늘을 관찰했어요.'});},'primary']]);
}
function updateCompass(){
 const s=states.compass,m=$('compassMagnet');m.style.left=s.x+'%';m.style.top=s.y+'%';
 const dx=(45-s.x)*scene.clientWidth/100,dy=(53-s.y)*scene.clientHeight/100,r=Math.max(80,Math.hypot(dx,dy));
 const ux=dx/r,uy=dy/r,sign=s.flipped?1:-1,strength=Math.pow(180/r,3)*5;
 // Dipole direction plus a weak northward background; no field visualization is shown.
 const bx=strength*sign*(3*ux*ux-1),by=strength*sign*3*ux*uy-1;
 $('needle').style.transform='rotate('+((Math.atan2(by,bx)*180/Math.PI)+90)+'deg)';
 if(s.moved)guide('자석을 옮기니 바늘의 방향이 달라졌어요.',true);
}
function miniTrial(r){
 if(r.kind==='invention')return '<div class="mini"><div class="mailbox"></div><div class="lid '+(!r.success?'failed':'')+'">'+magnet('',r.x,100,false,true)+'</div><div class="ironplate"></div></div>';
 if(r.kind==='paper'||r.kind==='distance'){const x=r.kind==='paper'?35:r.x;return '<div class="mini">'+magnet('',x,53,false,true)+'<div class="clip object" style="left:'+(r.condition==='far'?'76%':'calc('+x+'% + '+(r.paper?59:49)+'px)')+';top:53%"></div>'+(r.paper?'<div class="paper placed" style="left:calc(35% + 37px);top:53%"></div>':'')+'</div>';}
 return '<div class="mini" style="display:grid;place-items:center;font-size:48px" aria-hidden="true">'+(r.kind==='compass'?'🧭':r.kind==='explanation'?'💬':'↔')+'</div>';
}
function openRecords(filter){
 stopInput();if(timer){clearTimeout(timer);timer=null;scene.style.animationPlayState='paused';}
 let list=records.filter(r=>!filter||r.kind===filter);
 if(filter==='paper')list=list.slice(-2);
 if(filter==='invention'&&list.length>1){const last=list.at(-1),previous=list.slice(0,-1).findLast(r=>Math.abs(r.x-last.x)>5);list=previous?[previous,last]:[last];}
 $('recordTitle').textContent=filter==='paper'?'종이만 바꾸어 봤어요':filter==='invention'?'내 발명을 나란히 봐요':'내 실험 기록';
 const title=r=>r.title||(r.kind==='paper'?(r.paper?'종이 있음':'종이 없음'):r.kind==='distance'?(r.condition==='far'?'멀리 있을 때':'가까이 있을 때'):r.kind==='invention'?'자석 위치 '+(r.x<60?'왼쪽':'오른쪽'):r.kind==='compass'?'나침반':'수레 보내기');
 $('recordBody').innerHTML=list.length?(filter==='paper'?'<p class="record-note">자석과 클립은 같은 거리에서 시작했어요.</p>':filter==='invention'?'<p class="record-note">철판은 그대로 두고, 똑같이 흔들었어요.</p>':'')+'<div class="record-grid">'+list.map(r=>'<article class="record-card"><strong>'+title(r)+'</strong>'+miniTrial(r)+'<p>'+r.outcome+'</p></article>').join('')+'</div>':'<div class="empty">아직 기록이 없어요.<br>실험하면 여기에 그림으로 남아요.</div>';
 dialog.showModal();
}
function switchView(next){view=next;show();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$('records').onclick=()=>openRecords();
$('closeRecords').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{scene.style.animationPlayState='';if(pendingTest)timer=setTimeout(pendingTest,800);});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('reset').onclick=()=>{
 states[view]=fresh[view]();
 show();
};
window.addEventListener('blur',stopInput);
window.addEventListener('resize',()=>{stopInput();if(view==='distance'&&states.distance.phase==='distance')updateDistance(false);if(view==='compass')updateCompass();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
show();
})();

