import type { Save } from './domain';

export interface FinalReview { version: 1; page: number; answers: number[] }
export const finalQuestions = [
  {
    tab:'우편함', note:'자석을 넣고 빼며 덮개가 열리는지 비교했어.',
    question:'우편함 덮개를 붙잡아 준 힘은?',
    choices:['손잡이의 무게가 누르는 힘','자석이 철판을 끌어당기는 힘','철판이 자석을 밀어내는 힘'], answer:1,
    discovery:'자석은 철로 된 물체를 끌어당겨.',
    reason:'덮개의 자석과 몸체의 철판이 가까이 만나 붙었어.',
    retry:'덮개 안쪽 자석과 몸체의 철판을 봐. 닫을 때 두 부품이 붙었지?',
  },
  {
    tab:'철 클립', note:'간격을 비교한 뒤 같은 자리에 얇은 종이만 넣었어.',
    question:'얇은 종이 너머의 철 클립을 움직이려면?',
    choices:['클립이 움직일 만큼 자석을 가까이 놓아','클립을 반짝이는 색으로 칠해','종이가 있으면 어떤 거리에서도 못 움직여'], answer:0,
    discovery:'닿지 않아도 자석의 힘이 작용할 수 있어.',
    reason:'가까이 놓으니 얇은 종이가 있어도 철 클립이 자석 쪽으로 움직였어.',
    retry:'먼 자리와 가까운 자리의 움직임을 비교해 봐. 종이를 넣은 가까운 자리에서는 어땠지?',
  },
  {
    tab:'두 극', note:'기준 자석과 고리를 뒤집어 마주 보는 극을 바꿨어.',
    question:'같은 극끼리 마주 보게 하면?',
    choices:['서로 끌어당겨','색깔과 상관없이 늘 붙어','서로 밀어내'], answer:2,
    discovery:'같은 극은 밀어내고, 다른 극은 끌어당겨.',
    reason:'N과 N, S와 S는 서로 밀어내. 한쪽을 뒤집어 다른 극을 마주 보게 하면 끌어당겨.',
    retry:'같은 글자가 마주 봤을 때 자석이 가까워졌는지 멀어졌는지 살펴봐.',
  },
  {
    tab:'수조', note:'유리 밖 손잡이를 움직여 물속 패드로 얼룩을 닦았어.',
    question:'물속 청소 패드가 손잡이를 따라온 까닭은?',
    choices:['유리 양쪽 자석이 서로 끌어당겨서','유리 자체가 패드를 밀어서','물이 손잡이 쪽으로 흘러서'], answer:0,
    discovery:'유리를 사이에 두고도 자석끼리 당길 수 있어.',
    reason:'손으로 움직인 것은 밖의 손잡이야. 자석이 든 안쪽 패드가 따라와 얼룩을 닦았어.',
    retry:'손잡이와 패드 안에 들어 있는 부품을 생각해 봐. 유리 양쪽에 자석이 하나씩 있었어.',
  },
  {
    tab:'내 발명', note:'내 설계를 친구에게 소개하고, 의견을 듣고 고쳐 다시 확인했어.',
    question:'장치의 부품 배치를 고친 뒤 꼭 할 일은?',
    choices:['고치기 전 성공 기록을 그대로 사용해','고친 배치로 다시 움직여 시험해','장치 이름만 멋지게 바꿔'], answer:1,
    discovery:'장치를 고쳤다면 새 배치로 다시 시험해.',
    reason:'위치·거리·마주 보는 극이 달라지면 움직임도 달라질 수 있어. 지금 만든 장치로 확인해야 해.',
    retry:'전에 성공했어도 부품의 자리가 달라졌지? 지금 배치가 작동하는지 확인할 방법을 골라 봐.',
  },
] as const;

export function initializeReview(s:Save):FinalReview {
  return s.final.review ||= {version:1,page:0,answers:finalQuestions.map(()=>-1)};
}
export function reviewPassed(review:FinalReview):boolean {
  return review.version===1 && finalQuestions.every((q,index)=>review.answers[index]===q.answer);
}
export function validReview(value:unknown):value is FinalReview {
  if(!value||typeof value!=='object')return false;
  const review=value as FinalReview;
  return review.version===1&&Number.isInteger(review.page)&&review.page>=0&&review.page<=finalQuestions.length&&
    Array.isArray(review.answers)&&review.answers.length===finalQuestions.length&&
    review.answers.every(answer=>Number.isInteger(answer)&&answer>=-1&&answer<=2);
}
