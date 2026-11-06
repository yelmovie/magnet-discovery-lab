// What each activity teaches, kept as data so a teacher review can be tracked per activity.
// Goals are this project's reading of the standards. needsReview stays true until a teacher signs off.
export interface ActivityMeta {
  activity: number;
  standards: readonly string[];
  objective: string;
  source: string;
  needsReview: boolean;
  reviewer: string;
}

const source = 'docs/magnet-science-review.md';
const entry = (activity: number, standard: string, objective: string): ActivityMeta =>
  ({ activity, standards: [standard], objective, source, needsReview: true, reviewer: '' });

export const activityMeta: readonly ActivityMeta[] = [
  entry(1, '4과09-01', '자석이 철판에 붙는 힘으로 덮개가 닫히는 모습을 관찰해 말할 수 있다.'),
  entry(2, '4과09-01', '자석이 있을 때와 없을 때를 같은 방법으로 비교해 자석의 역할을 말할 수 있다.'),
  entry(3, '4과09-01', '여러 물체에 자석을 대 보고 붙는 물체와 붙지 않는 물체로 분류할 수 있다.'),
  entry(4, '4과09-01', '거리와 종이 조건을 바꾸어 자석의 힘이 떨어져서도 작용함을 말할 수 있다.'),
  entry(5, '4과09-02', '자석을 뒤집어 밀고 당기는 움직임을 비교해 극을 찾을 수 있다.'),
  entry(6, '4과09-02', '고리자석이 뜨거나 붙는 까닭을 마주 보는 극과 관련지어 설명할 수 있다.'),
  entry(7, '4과09-01', '유리 너머에서도 자석의 힘이 작용해 물체를 움직일 수 있음을 말할 수 있다.'),
  entry(8, '4과09-02', '극을 바꾸어 밀기와 당기기로 물체를 원하는 곳까지 옮길 수 있다.'),
  entry(9, '4과09-03', '주민의 불편을 고르고 자석의 성질을 이용한 장치를 설계할 수 있다.'),
  entry(10, '4과09-03', '내 장치를 발표하고 의견을 들어 설계를 고칠 수 있다.'),
];
