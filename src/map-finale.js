// The map award plays once on the last hit. It never changes learning or certificate progress.
export function openMapFinale(host, source) {
 const doc=host.ownerDocument;
 if(!host.isConnected||doc.querySelector('.map-finale-dialog'))return;
 const dialog=doc.createElement('dialog');dialog.className='map-finale-dialog';
 dialog.setAttribute('aria-label','지도 모험 피날레');
 // Full screen, whole 16:9 frame (contain): the captions are burned into the film, so it reads with the sound off.
 // Nothing sits over the film's bottom third; the title and the close button stay at the top.
 Object.assign(dialog.style,{position:'fixed',inset:'0',width:'100vw',height:'100dvh',maxWidth:'none',maxHeight:'none',margin:'0',padding:'0',border:'0',background:'#000',color:'#fff',textAlign:'center',zIndex:'999',overflow:'hidden'});
 const title=doc.createElement('h2');title.textContent='모든 악당을 물리쳤어!';
 Object.assign(title.style,{position:'absolute',top:'12px',left:'12px',margin:'0',padding:'8px 16px',borderRadius:'8px',background:'#0b2328b8',fontSize:'clamp(18px,2.2vw,28px)',zIndex:'1'});
 const video=doc.createElement('video');video.src=source;video.playsInline=true;video.muted=true;video.autoplay=true;video.preload='metadata';video.setAttribute('aria-label','지도 탐험 피날레 영상');
 Object.assign(video.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',background:'#000',cursor:'pointer'});
 const status=doc.createElement('p');status.hidden=true;status.role='status';
 Object.assign(status.style,{position:'absolute',left:'50%',top:'45%',translate:'-50% -50%',margin:'0',padding:'12px 20px',borderRadius:'8px',background:'#0b2328e6',zIndex:'1'});
 const close=doc.createElement('button');close.type='button';close.textContent='지도로 돌아가기';
 Object.assign(close.style,{position:'absolute',top:'12px',right:'12px',minHeight:'56px',padding:'6px 20px',border:'2px solid #fff8e780',borderRadius:'8px',background:'#0b2328b8',color:'#fff',fontSize:'20px',cursor:'pointer',zIndex:'1'});
 dialog.append(video,title,status,close);doc.body.append(dialog);dialog.showModal();close.focus();
 // game-audio.ts plays the final theme while this dialog is open (the film itself stays muted) and the main theme after it closes.
 const announce=open=>doc.dispatchEvent(new CustomEvent('map-finale',{detail:{open}}));announce(true);
 close.addEventListener('click',()=>dialog.close());
 // No native control bar (it would sit on the captions): a tap pauses, resumes or replays.
 video.addEventListener('click',()=>{if(video.paused)video.play().catch(()=>{});else video.pause();});
 video.addEventListener('error',()=>{status.hidden=false;status.textContent='지금은 영상을 열 수 없어. 지도 퇴치 기록은 저장됐어.';});
 dialog.addEventListener('close',()=>{video.pause();dialog.remove();announce(false);},{once:true});
 video.play().catch(()=>{});
}
