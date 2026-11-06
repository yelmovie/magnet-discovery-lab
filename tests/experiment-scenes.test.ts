import { afterEach, expect, it, vi } from 'vitest';
import { emptyActivity } from '../src/domain';
import { rememberExperiment } from '../src/experiment-scenes';
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
