import { afterEach, expect, it, vi } from 'vitest';
import { emptyActivity, freshSave } from '../src/domain';
import { experimentScenes, rememberExperiment } from '../src/experiment-scenes';
import { addTrial } from '../src/trial-records';

afterEach(()=>vi.unstubAllGlobals());

it('그림 로딩 중에는 기존 사진이나 장치 예시를 보존하고 준비된 캔버스만 저장한다',()=>{
  const a=emptyActivity();
  addTrial(a,{activity:7,key:'clean',conditions:{},initialObjects:[],objects:[],input:[],outcome:'success'});
  const old='data:image/webp;base64,YQ==',next='data:image/webp;base64,Yg==';
  const canvas={dataset:{pendingArt:'true'},width:1280,height:720};
  const copy=vi.fn(),frame={getContext:()=>({drawImage:copy}),toDataURL:()=>next};
  vi.stubGlobal('document',{createElement:()=>frame});
  const capture=()=>rememberExperiment(a,canvas as unknown as HTMLCanvasElement);
  capture();expect(a.experimentPhoto).toBeUndefined();
  a.experimentPhoto=old;capture();expect(a.experimentPhoto).toBe(old);expect(copy).not.toHaveBeenCalled();
  canvas.dataset.pendingArt='';capture();expect(a.experimentPhoto).toBe(next);expect(copy).toHaveBeenCalledOnce();
});

it('택배 배달에서 저장된 빈 그림은 장치 예시를 보여 주고 다른 실험 사진은 보존한다',()=>{
  const s=freshSave(),photo='data:image/webp;base64,YQ==';
  s.activities[7]={...emptyActivity(),experimentPhoto:photo};
  s.activities[8]={...emptyActivity(),experimentPhoto:photo};
  const scenes=experimentScenes(8,s);
  expect(scenes).toContain('수조 청소 · 내 실험');
  expect(scenes).toContain('/assets/learning/delivery.webp');
  expect(scenes).toContain('택배 배달 · 장치 예시');
});
