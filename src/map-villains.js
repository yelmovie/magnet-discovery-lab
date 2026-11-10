/** Map-only reward. Never writes learning progress or unlocks a lesson. */
export function mountMapVillains(world, options) {
 const abort=new AbortController(), timers=new Set(), nodes=[];
 // Reuse the shipped, normalized eight-frame sheet. Keep the CSS creature if loading fails.
 const sprite=new Image();let disposed=false;
 sprite.onload=()=>{if(!disposed)nodes.forEach(node=>node.classList.add('mv-sprite'));};
 sprite.src='/assets/quest/scrap-goblin-sheet.webp';
 const style=document.createElement('style');style.textContent=STYLES;world.append(style);
 const status=document.createElement('span');status.className='mv-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');world.append(status);
 let stored={};try{const raw=JSON.parse(localStorage.getItem(options.key)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))stored=raw;}catch{}
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);};
 options.stages.forEach((stage,index)=>{
  const token=stage.token||'pending';const cleared=stage.ready&&stored[index]===token;
  const b=document.createElement('button');b.type='button';b.className='mv-target';b.style.left=stage.x+'%';b.style.top=stage.y+'%';b.dataset.stage=String(index);b.dataset.state=cleared?'cleared':stage.ready?'ready':'locked';
  b.innerHTML='<span class="mv-wave" aria-hidden="true"></span><span class="mv-creature" aria-hidden="true"><i></i><i></i><em></em></span><span class="mv-label"></span><span class="mv-meter" aria-hidden="true">● ● ●</span>';
  const label=b.querySelector('.mv-label'),meter=b.querySelector('.mv-meter');let hits=0,busy=false;
  const describe=()=>{label.textContent=cleared?'퇴치 완료':stage.ready?options.power+' 톡!':'탐구 후 힘 충전';b.setAttribute('aria-label',stage.name+' 고철 도깨비 · '+(cleared?'퇴치 완료':stage.ready?'과학 파동으로 세 번 타격':'탐구를 완료하면 타격할 수 있어요'));};describe();
  if(cleared){b.disabled=true;meter.textContent='✓';}
  b.addEventListener('pointerdown',e=>e.stopPropagation(),{signal:abort.signal});
  b.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();},{signal:abort.signal});
  b.addEventListener('click',e=>{
   e.stopPropagation();if(busy||b.dataset.state==='cleared')return;
   if(!stage.ready){status.textContent=stage.name+' 탐구를 먼저 마치고 과학의 힘을 모아 주세요.';return;}
   busy=true;hits++;options.sound?.(hits===3);const reduced=options.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
   b.classList.toggle('mv-reduced',reduced);b.classList.remove('mv-hit');void b.offsetWidth;b.classList.add('mv-hit');
   meter.textContent='● '.repeat(3-hits)+'○ '.repeat(hits);status.textContent=stage.name+' 고철 도깨비에게 '+hits+'번째 파동!';
   if(hits===3){b.dataset.state='leaving';label.textContent='정화 성공!';
    let saved=true;if(!options.preview){try{stored[index]=token;localStorage.setItem(options.key,JSON.stringify(stored));}catch{saved=false;}}
    later(()=>{b.dataset.state='cleared';b.classList.remove('mv-hit');label.textContent='퇴치 완료';meter.textContent='✓';b.setAttribute('aria-label',stage.name+' 악당 퇴치 완료');b.setAttribute('aria-disabled','true');status.textContent=stage.name+' 악당이 사라졌어요. '+(options.preview?'시연 기록은 저장하지 않아요.':saved?'퇴치 기록을 저장했어요.':'저장하지 못했어요. 이 창에서만 유지돼요.');},reduced?100:650);
   }else later(()=>{busy=false;b.classList.remove('mv-hit');},reduced?120:320);
  },{signal:abort.signal});world.append(b);nodes.push(b);
 });
 return ()=>{disposed=true;sprite.onload=null;abort.abort();timers.forEach(clearTimeout);nodes.forEach(n=>n.remove());style.remove();status.remove();};
}
const STYLES=`
.mv-target{position:absolute;z-index:15;transform:translate(-50%,-50%);width:94px;min-height:98px;padding:4px;background:transparent;border:0;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;touch-action:manipulation;pointer-events:auto;color:#fff;font:700 12px/1.2 var(--font-body, sans-serif);isolation:isolate}
.map-overview .mv-target{scale:max(1,calc(.52 / var(--map-scale,1)));transform-origin:0 0}
.mv-sprite .mv-creature{height:58px;border:0;border-radius:0;box-shadow:none;background:transparent url('/assets/quest/scrap-goblin-sheet.webp') 0 0/232px 116px no-repeat}
.mv-sprite .mv-creature:before,.mv-sprite .mv-creature:after,.mv-sprite .mv-creature>*{display:none}
.mv-sprite.mv-hit .mv-creature{animation:mv-bump .3s ease-out,mv-sprite-hit .3s steps(1,end)}
.mv-sprite[data-state=leaving] .mv-creature{background-position:100% 100%;animation:mv-leave .65s ease-in forwards}
@keyframes mv-sprite-hit{0%{background-position:33.333333% 100%}50%{background-position:66.666667% 100%}100%{background-position:0 0}}
.mv-target:focus-visible{outline:4px solid #fff59b;outline-offset:4px;border-radius:15px}.mv-label{background:#243454;border:2px solid #b8f2f2;border-radius:12px;padding:4px 6px;white-space:nowrap}.mv-creature{position:relative;display:flex;justify-content:center;gap:9px;align-items:center;width:58px;height:54px;border-radius:46% 46% 35% 35%;background:radial-gradient(circle at 30% 18%,#c3abff,#7448b4 65%);border:3px solid #43296b;box-shadow:0 5px 0 #30164e44;transform-origin:50% 80%}.mv-creature:before,.mv-creature:after{content:'';position:absolute;width:14px;height:17px;background:#7448b4;border-radius:70% 0;top:-8px;transform:rotate(-25deg);left:4px}.mv-creature:after{left:auto;right:4px;transform:rotate(105deg)}.mv-creature i{width:10px;height:13px;border-radius:50%;background:#fff;box-shadow:inset -4px -2px #302445}.mv-creature em{position:absolute;width:15px;height:5px;background:#43296b;border-radius:50%;bottom:9px}.mv-meter{font-size:13px;color:#ffeaa6;text-shadow:0 1px 3px #172840}.mv-wave{position:absolute;top:26px;width:30px;height:30px;border:5px solid #9effea;border-radius:50%;opacity:0;pointer-events:none}.mv-hit .mv-creature{animation:mv-bump .3s ease-out}.mv-hit .mv-wave{animation:mv-burst .45s ease-out}.mv-target[data-state=leaving] .mv-creature{animation:mv-leave .65s ease-in forwards}.mv-target[data-state=locked]{filter:saturate(.45)}.mv-target[data-state=cleared]{min-height:48px;cursor:default}.mv-target[data-state=cleared] .mv-creature,.mv-target[data-state=cleared] .mv-wave{display:none}.mv-target[data-state=cleared] .mv-label{background:#236754}.mv-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@keyframes mv-bump{25%{transform:translateX(9px) rotate(14deg) scale(.86);filter:brightness(1.8)}65%{transform:translateX(-5px) rotate(-8deg)}to{transform:none}}@keyframes mv-burst{from{opacity:1;transform:scale(.4)}to{opacity:0;transform:scale(3.4)}}@keyframes mv-leave{20%{transform:scale(1.2);filter:brightness(2)}to{opacity:0;transform:translateY(-40px) scale(.1)}}
.mv-reduced .mv-creature,.mv-reduced .mv-wave{animation:none!important}.mv-reduced.mv-hit .mv-creature{filter:brightness(1.8)}@media(prefers-reduced-motion:reduce){.mv-creature,.mv-wave{animation:none!important}}`;
