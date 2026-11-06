import { describe, expect, it } from 'vitest';
import { replayInitialObjects, replayObjects, trialObjectArt, trialPoleLabel, trialResultSentence, type Trial } from '../src/trial-records';

const paperTrial=():Trial=>({
  id:'4:paper',key:'paper',activity:4,modelVersion:1,conditions:{paper:true,clearanceCells:1},
  initialObjects:[{id:'magnet',x:49,y:55},{id:'clip',x:61,y:55}],objects:[{id:'magnet',x:49,y:55},{id:'clip',x:58.3,y:55}],
  input:[],outcome:'success',
});

describe('기록에 남은 정보로 실험대 되살리기',()=>{
  it('눈금 실험의 종이는 두 물체의 마주 보는 끝 사이, 옛 모형의 종이는 중심 사이에 놓인다',()=>{
    const t=paperTrial(),saved=JSON.stringify(t);
    expect(replayObjects(t)).toContainEqual({id:'paper',x:56,y:55});
    expect(replayInitialObjects(t)).toContainEqual({id:'paper',x:56,y:55});
    expect(trialResultSentence(t)).toContain('종이 한 장을 사이에 두었는데도 철 클립');
    expect(JSON.stringify(t)).toBe(saved);
    delete t.conditions.clearanceCells;
    expect(replayObjects(t)).toContainEqual({id:'paper',x:55,y:55});
  });
  it('저장한 종이 위치를 우선하고 근거가 없는 자리나 극 표시는 추가하지 않는다',()=>{
    const t=paperTrial(),paper={id:'paper',x:59,y:42};
    t.objects.push(paper);expect(replayObjects(t).filter(o=>o.id==='paper')).toEqual([paper]);
    t.objects.pop();t.initialObjects=[];expect(replayObjects(t).some(o=>o.id==='paper')).toBe(false);
    const magnet=t.objects[0],art=trialObjectArt(magnet,t,10,20);
    expect(art).toContain('magnet-bar.webp');expect(art).not.toContain('<text');expect(trialPoleLabel(magnet)).toBe('');
    t.conditions.paper=false;t.initialObjects=paperTrial().initialObjects;
    expect(replayObjects(t).some(o=>o.id==='paper')).toBe(false);
  });
  it('종이와 물체에 맞는 이미지를 쓰며 실제 저장한 극만 표시한다',()=>{
    const t=paperTrial(),render=(id:string)=>trialObjectArt({id,x:0,y:0},t,0,0);
    expect(render('clip')).toContain('material-kit.webp');expect(render('key')).toContain('science-equipment.webp');
    expect(render('paper')).toContain('prop-paper-sheet.webp');expect(render('inner-pad')).toContain('aquarium-cleaner-parts.webp');
    expect(render('cart-magnet')).toContain('prop-cart.webp');
    expect(trialObjectArt({id:'probe',x:0,y:0,pole:'S'},t,0,0)).toContain('scale(-1 1)');
    expect(render('ring0')).not.toContain('극 정보 없음');
  });
  it('기록된 거리가 줄었을 때만 종이 실험에서 끌려왔다고 설명한다',()=>{
    const t=paperTrial();t.objects[1].x=61;expect(trialResultSentence(t)).toContain('그대로');
    t.objects=[];expect(trialResultSentence(t)).not.toContain('자석 쪽으로');
  });
});
