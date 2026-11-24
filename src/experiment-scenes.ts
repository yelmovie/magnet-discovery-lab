import type { Activity, Save } from './domain';
import { apparatusThumbnail } from './learning-visuals';

const photoLimit=48000;
const isPhoto=(v:unknown):v is string=>typeof v==='string'&&v.length<photoLimit&&/^data:image\/webp;base64,[a-z0-9+/]+=*$/i.test(v);
// A transparent 360 × 150 frame from the hidden delivery bench compresses below this size.
const minDeliveryPhotoLength=512;
export const savedExperimentPhoto=(a?:Activity)=>isPhoto(a?.experimentPhoto)?a.experimentPhoto:undefined;
const names=['우편함 조립','덮개가 열리는지 확인','재료 분류','철 클립과 거리','극 표시 찾기','고리자석','수조 청소','택배 배달','발명품 설계','사용 시험'];

export function rememberExperiment(activity:Activity,canvas:HTMLCanvasElement|null,run=false){
  if(!canvas||canvas.dataset.pendingArt==='true'||!activity.trials?.length)return;
  const frame=document.createElement('canvas');frame.width=run?480:360;frame.height=run?270:150;
  const ctx=frame.getContext('2d');if(!ctx)return;
  // Keep the apparatus large by cropping the blank HUD and tool margins.
  if(run){
    const width=Math.min(canvas.width,canvas.height*16/9),height=width*9/16;
    ctx.drawImage(canvas,(canvas.width-width)/2,(canvas.height-height)/2,width,height,0,0,frame.width,frame.height);
  }else ctx.drawImage(canvas,canvas.width*.07,canvas.height*.26,canvas.width*.86,canvas.height*.58,0,0,frame.width,frame.height);
  let photo=frame.toDataURL('image/webp',.74);
  if(run&&photo.length>=photoLimit)photo=frame.toDataURL('image/webp',.55);
  if(isPhoto(photo)&&(!run||photo.length>=minDeliveryPhotoLength))activity.experimentPhoto=photo;
}

export function experimentScenes(n:number,s:Save){
  const first=Math.floor((n-1)/2)*2+1;
  return [first,first+1].map(index=>{
    const photo=savedExperimentPhoto(s.activities[index]);
    const captured=index===8&&photo&&photo.length<minDeliveryPhotoLength?undefined:photo;
    const sample=apparatusThumbnail(index,s.design.template,s.activities[index]);
    const label=index===4&&s.activities[index]?.values.puzzleRevision===2?'철 열쇠와 거리':names[index-1];
    return `<figure><img src="${captured||sample.src}" alt="${captured?label+' 실험을 마친 장면':sample.alt}"><figcaption>${label} · ${captured?'내 실험':'장치 예시'}</figcaption></figure>`;
  }).join('');
}
