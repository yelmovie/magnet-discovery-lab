export const questRewards = [
  { name: '자석 수리 키트', icon: 'flask', change: '우편함 덮개가 다시 꼭 닫혀!', use: '다음 연구소에서 직접 자석으로 철 부품을 건져 올려.' },
  { name: '힘 관찰 렌즈', icon: 'eye', change: '자석으로 재료를 나눌 수 있게 됐어!', use: '다음 탑에서 두 물체의 움직임을 확대해서 살펴봐.' },
  { name: '극 표시 스티커', icon: 'spark', change: '극의 반응을 알아내 탑의 문과 고리를 고쳤어!', use: '수조와 택배 장치에서 자석의 극을 보고 조종해.' },
  { name: '원격 조작 손잡이', icon: 'map', change: '수조가 깨끗해지고 시민의 택배가 도착했어!', use: '공방에서 자석을 이용해 시민의 불편을 해결할 방법을 떠올려 봐.' },
  { name: '나의 발명 설계도', icon: 'book', change: '시민의 불편을 해결할 아이디어를 전시했어!', use: '중앙 광장에서 내 발명 카드와 네 구역의 실험 기록을 함께 살펴봐.' },
];

export function shakePrompt(compared:boolean):string {
  return compared ? '이번에는 덮개가 열릴까? 아까와 같은 세기로 흔들어 보자.' : '덮개가 열리는지 상자를 살짝 흔들어 보자.';
}

export const missionQuestions = [
  '부품을 조립해 밀이의 우편함을 고쳐 줘!',
  '자석을 넣으면 흔들어도 덮개가 닫혀 있을까?',
  '자석에 붙는 재료는 어떤 것일까?',
  '닿지 않고 움직일까? 한 가지만 바꿔 봐!',
  '사라진 극 표시, 움직임으로 찾아볼까?',
  '고리를 띄우고, 이번엔 서로 붙여 볼까?',
  '수조 밖에서 세 곳을 깨끗하게 닦아 줘!',
  '자석으로 택배를 깃발까지 배달해 줘!',
  '시민의 불편을 고칠 장치를 만들어 줘!',
  '내가 만든 발명품, 정말 작동할까?',
];
/** New puzzle activities ask for the obstacle; activities already in progress keep their original request. */
export function missionQuestion(n:number,a?:{values:Record<string,unknown>}):string {
  if(n===2&&a?.values.mailboxQuickRepair===true)return '부품을 조립해 우편함을 고쳐 줘!';
  if(a?.values.puzzleRevision===2){
    const prompts:Record<number,string>={4:'틈 너머 철 열쇠를 자석으로 꺼내 줘!',5:'밀고 당기는 두 문을 모두 열어 줘!',6:'발판을 올리고 내려 두 친구를 건네 줘!',8:'중간 깃발에 멈춘 뒤 유리벽 너머로 배달해 줘!'};
    if(prompts[n])return prompts[n];
  }
  return n===8&&a?.values.puzzleVersion===1?'유리벽 너머 깃발까지 택배를 보내 줘!':missionQuestions[n-1];
}
export const latchHints = ['자석이 붙잡을 철판이 어디에 있는지 살펴봐.','자석과 철판이 멀면 붙잡지 못해. 철판을 자석 맞은편 점선 자리로 옮겨 봐.'];
export const sortHints = ['방금 자석을 가까이 댔을 때 따라왔는지 떠올려 봐.','자석을 따라온 물건만 위 수리함이야. 따라오지 않은 물건은 손으로 아래 분류함에 넣어 줘.'];
export const reachHints = ['자석과 물체 사이가 몇 칸인지 눈금을 살펴봐.','가까울수록 자석의 힘이 세. 더 가까운 칸을 골라 봐.'];
export const poleHints = ['기준 자석을 댔을 때 밀렸는지 당겨졌는지 다시 살펴봐.','밀렸다면 마주 본 끝이 기준 자석과 같은 극이고, 당겨졌다면 다른 극이야.'];
export const doorHints = ['빗장 왼쪽 끝에 붙인 극 스티커와, 기준 자석에서 빗장을 향한 끝의 극을 살펴봐.','같은 극끼리 마주 보면 밀어내. 기준 자석을 뒤집어 같은 극을 대 봐.'];
export const ringHints = ['아래 고리의 윗면과 위 고리의 아랫면이 마주 봐.','두 면의 글자가 같으면 밀어내 뜨고, 다르면 끌어당겨 붙어.'];
export const padHints = ['손잡이와 물속 패드 사이가 얼마나 벌어졌는지 살펴봐.','멀어지면 자석의 힘이 약해져 떨어져. 패드가 따라올 만큼 천천히 움직여 봐.'];
export const deliveryHints = {
  wall:['카트의 뒤쪽을 살펴봐.','같은 극끼리 마주 보면 서로 밀어내. 자석을 뒤집어 카트 뒤에 대 봐.'],
  over:['카트와 깃발 사이의 거리를 살펴봐.','멀어질수록 힘이 약해져. 깃발에 닿기 전에 자석을 미리 떼어 봐.'],
};
export const missionGuides = [
  '몸체와 뚜껑부터 연결하고 손잡이·자석 고정함·철판·자석을 끼워 줘. 손잡이를 내려 닫으면 어떤 부품이 붙는지 살펴봐.',
  '덮개가 열리는지 살펴보자. 자석이 없을 때와 있을 때, 상자를 같은 세기로 흔들어 봐.',
  '여섯 물건에 같은 자석을 가까이 대 봐. 붙는 물건은 위 수리함으로, 붙지 않는 물건은 손으로 아래 분류함에 옮겨.',
  '먼저 5칸에서 클립을 놓아 봐. 다음에는 붙을 것 같은 자리를 골라 관찰해. 클립이 움직인 자리에서 종이만 넣어 비교해 봐.',
  '기준 자석의 두 극을 번갈아 가까이 대 봐. 밀리고 당겨지는 움직임을 보고 알맞은 극 스티커를 붙여.',
  '고리를 기둥에 놓고 위 고리를 뒤집어 봐. 아래 고리의 윗면과 위 고리의 아랫면이 마주 본다는 걸 기억해.',
  '바깥 손잡이를 움직이면 유리 안쪽 패드가 따라와. 얼룩 위를 지나며 닦아 줘. 연결이 끊기면 패드 가까이 돌아와 다시 잡아.',
  '밀어도 당겨도 좋아. 자석으로 카트를 깃발까지 보내 줘. 도착하면 자석을 떼어 카트가 멈추는지 봐.',
  '고치고 싶은 물건을 골라. 몸체와 부품을 점선 자리에 놓고 시제품 반응을 시험해 봐. 잘 안 돼도 결과를 보고 고칠 수 있어.',
  '내 배치 그대로 손잡이를 움직인 뒤 사용 시험을 눌러 봐. 잘 안 되면 거리·높이·극을 하나씩 고치고 지금 설계로 다시 확인해.',
];

/** The renewed distance experiment uses a key, with the matching Korean particles. */
export function keyRescueText(text: string): string {
  return text.replaceAll('철 클립', '클립')
    .replaceAll('클립을', '철 열쇠를')
    .replaceAll('클립이', '철 열쇠가')
    .replaceAll('클립은', '철 열쇠는')
    .replaceAll('클립', '철 열쇠');
}

export function missionGuide(n: number, a?: { values: Record<string, unknown> }): string {
  if (n === 4 && a?.values.liveKeyRescue === true) return '막대자석을 오른쪽으로 끌어 철 열쇠에 가까이 대 봐. 열쇠가 붙으면 왼쪽으로 끌어 좁은 틈 밖으로 꺼내 줘.';
  if (n === 2 && a?.values.mailboxQuickRepair === true) return '몸체부터 부품을 하나씩 조립해 줘. 덮개를 닫은 뒤, 흔들어도 열리지 않는지 확인해 봐.';
  if (n === 2 && a?.values.puzzleVersion === 1) return '덮개를 닫고 흔들어 봐. 자석을 넣어도 열리면 철판 자리를 살펴봐. 자석은 그대로 두고 철판을 가까이 옮겨 다시 흔들어 봐.';
  if (a?.values.ideaVersion === 1) return n === 9
    ? '주민의 불편과 쓸 자석의 성질을 골라. 자석을 놓을 곳과 움직일 물체를 그림이나 글로 설명해 봐.'
    : '발명품 이름과 소개를 적고 전시해 봐. 친구의 질문을 듣고 더 알아볼 점을 찾아봐.';
  const guide = missionGuides[n - 1];
  return n === 4 && a?.values.puzzleRevision === 2 ? keyRescueText(guide) : guide;
}

/** The learner closes the journey by choosing what they can now do, printed on the certificate. */
export const abilityStatements = [
  '자석에 붙는 물체와 붙지 않는 물체를 실험으로 가려낼 수 있어요.',
  '거리와 종이처럼 한 가지 조건만 바꾸어 자석의 힘을 비교할 수 있어요.',
  '밀어내고 끌어당기는 움직임으로 자석의 극을 찾아낼 수 있어요.',
  '자석의 힘으로 유리 너머의 물체를 움직이고 멈출 수 있어요.',
  '자석으로 생활의 불편을 해결하는 장치를 설계하고 고칠 수 있어요.',
];

export const stageMastery = [
  ['물건 안의 자석과 철 걸쇠 찾기', '같은 물건을 자석 없이 / 넣고 비교', '생활 장치 수리'],
  ['철·알루미늄·나무의 반응 비교', '거리와 종이를 한 가지씩 바꿔 비교', '닿지 않아도 작용하는 힘 관찰'],
  ['N극과 S극으로 반응 확인', '관찰로 극 표시 복원', '고리의 다른 배치 해결'],
  ['유리 밖에서 안쪽 패드 조종', '자석으로 밀거나 당겨 운반', '자석을 떼어 목적지에 정차'],
  ['불편에 맞는 부품 설계', '시제품 반응을 보고 개선', '현재 설계로 실제 사용 시험'],
];
