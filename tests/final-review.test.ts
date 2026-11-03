import { afterEach, describe, expect, it, vi } from 'vitest';
import { coreReady, emptyActivity, freshSave, migrateSave, validSave, type Save } from '../src/domain';
import { finalQuestions, initializeReview, reviewPassed, validReview } from '../src/final-review';
import { restorationView } from '../src/restoration';
import type { Context } from '../src/activity-types';

vi.mock('../src/game-audio',()=>({playEffect:vi.fn()}));
class Button extends EventTarget {
  dataset:Record<string,string>={}; disabled=false;
  constructor(public tag:string){super();this.disabled=/\sdisabled(?:\s|>)/.test(tag);for(const attr of tag.matchAll(/data-([\w-]+)="([^"]*)"/g))this.dataset[attr[1].replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]=attr[2];}
  // Dispatch even on a disabled control to verify the handler's own gate as well.
  press(){this.dispatchEvent(new Event('click'));}
}
class Root extends EventTarget {
  buttons:Button[];
  constructor(html:string){super();this.buttons=Array.from(html.matchAll(/<button\b[^>]*>/g),match=>new Button(match[0]));}
  querySelectorAll(selector:string){const attr=selector.slice(1,-1);return this.buttons.filter(button=>attr.includes('=')?button.tag.includes(attr):button.tag.includes(`${attr}=`)||button.tag.includes(`${attr} `)||button.tag.includes(`${attr}>`));}
  querySelector(selector:string){return this.querySelectorAll(selector)[0]||null;}
}
function collected():Save {
  const s=freshSave();s.final.report=true;
  for(let stage=0;stage<5;stage++){s.completed.push(stage*2+1,stage*2+2);s.evidence.push({stage,date:s.updated,activities:[emptyActivity(),emptyActivity()],summary:[]});}
  return s;
}
function mount(s:Save,preview=false){
  const view=restorationView(s,preview),root=new Root(view.html),refresh=vi.fn(),touch=vi.fn(),activate=vi.fn();
  root.addEventListener('activate-final',activate);
  const dispose=view.bind({screen:10,s,a:emptyActivity(),root:root as unknown as HTMLElement,refresh,touch,meta:vi.fn(),notify:vi.fn()} satisfies Context);
  return {html:view.html,root,refresh,touch,activate,dispose,press:(selector:string)=>{const button=root.querySelector(selector);expect(button,selector).not.toBeNull();button!.press();}};
}
afterEach(()=>vi.unstubAllGlobals());

describe('광장의 다섯 실험 정리 문제',()=>{
  it('다섯 답을 직접 고르기 전에는 다음 기록과 수료를 허용하지 않는다',()=>{
    vi.stubGlobal('CustomEvent',class extends Event{constructor(type:string,init?:EventInit){super(type,init);}});
    const s=collected(),evidence=structuredClone(s.evidence),design=structuredClone(s.design);
    let page=mount(s);
    expect(page.html).not.toContain('data-drag=');expect(page.html).not.toContain('data-restoration="finish"');
    page.press('[data-review-next]');page.press('[data-review-page="4"]');
    expect(s.final.review?.page).toBe(0);expect(coreReady(s)).toBe(false);
    page.press('[data-review-answer="0"]');expect(s.final.review?.answers[0]).toBe(0);
    page.dispose?.();page=mount(s);expect(page.html).toContain('data-result="retry"');
    page.press('[data-review-next]');expect(s.final.review?.page).toBe(0);page.dispose?.();
    for(let index=0;index<5;index++){
      page=mount(s);expect(s.final.review?.page).toBe(index);
      page.press(`[data-review-answer="${finalQuestions[index].answer}"]`);page.dispose?.();
      page=mount(s);expect(page.html).toContain(finalQuestions[index].reason);expect(page.html).toContain('data-result="correct"');
      page.press(`[data-review-answer="${(finalQuestions[index].answer+1)%3}"]`);
      expect(s.final.review?.answers[index]).toBe(finalQuestions[index].answer);
      page.press('[data-review-next]');page.dispose?.();
    }
    page=mount(s);page.press('[data-restoration="finish"]');
    expect(page.activate).toHaveBeenCalledOnce();expect(coreReady(s)).toBe(true);
    expect(s.evidence).toEqual(evidence);expect(s.design).toEqual(design);
    s.final.complete=true;s.final.date=s.updated;expect(validSave(s)).toBe(true);
    page.dispose?.();
  });
  it('저장한 문제 위치와 직접 선택한 답을 이어서 읽으며 초기화하면 모두 없어진다',()=>{
    const s=collected(),review=initializeReview(s);review.answers[0]=finalQuestions[0].answer;review.page=1;
    const loaded=migrateSave(JSON.parse(JSON.stringify(s)))!;
    expect(loaded.final.review).toEqual(review);expect(restorationView(loaded).html).toContain(finalQuestions[1].question);
    expect(freshSave().final.review).toBeUndefined();expect(coreReady(freshSave())).toBe(false);
    loaded.final.review!.page=4;restorationView(loaded);expect(loaded.final.review!.page).toBe(1);
  });
  it('현재 다시 하는 실험 대신 완료 당시 보관한 실험 사진을 수첩에 보여 준다',()=>{
    const s=collected(),saved='data:image/webp;base64,U0FWRUQ=',current='data:image/webp;base64,Q1VSUkVOVA==';
    s.evidence[0].activities[0].experimentPhoto=saved;s.activities[1]=emptyActivity();s.activities[1].experimentPhoto=current;
    const before=structuredClone(s.evidence),html=restorationView(s).html;
    expect(html).toContain(saved);expect(html).not.toContain(current);expect(html).toContain('내 실험');expect(html).toContain('장치 예시');
    expect(s.evidence).toEqual(before);
  });
  it('교사용은 답을 대신 기록하지 않고 모든 문제와 마지막 화면을 살펴볼 수 있다',()=>{
    const s=freshSave();let page=mount(s,true);page.press('[data-review-page="4"]');page.dispose?.();
    page=mount(s,true);expect(page.html).toContain(finalQuestions[4].question);page.press('[data-review-next]');page.dispose?.();
    page=mount(s,true);expect(page.html).toContain('축제 미리보기');expect(s.final.review?.answers).toEqual([-1,-1,-1,-1,-1]);
    expect(coreReady(s)).toBe(false);expect(coreReady(s,true)).toBe(true);expect(s.evidence).toEqual([]);page.dispose?.();
  });
  it('예전 버전에서 받은 수료증은 새로운 미응답 문제 때문에 사라지지 않는다',()=>{
    const old=collected();Object.assign(old.final,{complete:true,latch:'S',ring:'S',plate:24,date:old.updated});
    const before=structuredClone(old),html=restorationView(old).html;
    expect(html).toContain('이전 탐험 수료 기록');expect(html).toContain('data-action="certificate"');
    expect(old).toEqual(before);expect(validSave(old)).toBe(true);expect(migrateSave(old)?.final.complete).toBe(true);
  });
  it('오답이나 부족한 건물 기록으로 수료를 만들지 않으며 손상된 정리 기록을 거른다',()=>{
    const s=collected(),review=initializeReview(s);review.answers=finalQuestions.map(q=>q.answer);
    expect(reviewPassed(review)).toBe(true);expect(coreReady(s)).toBe(true);
    s.evidence.pop();expect(coreReady(s)).toBe(false);
    for(const value of [{...review,version:2},{...review,page:6},{...review,answers:[1]},{...review,answers:[1,0,2,0,3]}])expect(validReview(value)).toBe(false);
    const wrong=collected();initializeReview(wrong);wrong.final.complete=true;expect(validSave(wrong)).toBe(false);
  });
});
