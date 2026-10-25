import { materials, ready, type Activity, type Save } from './domain';
import { inquiryPhase } from './inquiry-model';
import { missionReady } from './mission-model';

/** The generated repair companion uses the same existing hint control. */
export function coachArt() {
  return '<img class="coach-robot coach-body" src="/assets/quest/coach-companion.webp" alt="" width="112" height="108" draggable="false">';
}

export type Coaching = { action: string; clues: string[]; focus: string; done: number; total: number };
export function coaching(n: number, a: Activity, s: Save): Coaching {
  if(a.values.inquiryVersion===1){
    const phase=inquiryPhase(a), index={predict:0,experiment:1,explain:2,apply:3,complete:n%2?3:4}[phase];
    if(phase!=='experiment')return {action:{predict:'고치기 전에 결과를 예상해 보자',explain:'내가 발견한 규칙과 실제 실험 근거를 연결해 줘',apply:'배운 규칙으로 새로운 현장 의뢰 두 가지를 해결해 줘',complete:'탐구 기록 완성! 아래 버튼으로 이어가자',experiment:''}[phase],clues:[],focus:'',done:index,total:n%2?3:4};
  }
  const f = (key: string) => a.values[key] === true, r = Number(a.values.round || 0);
  let action = '', focus = '', clues: string[] = [], done = 0, total = 1;
  switch (n) {
    case 1:
      total = a.values.mechanicsVersion===1?4:2; done = [0, 1].filter(i => f(`found${i}`)).length+(a.values.mechanicsVersion===1?[0,1].filter(i=>f(`latch${i}`)).length:0);
      action = f(`found${r}`)&&!f(`latch${r}`)&&a.values.mechanicsVersion===1 ? '자석을 철 걸쇠 가까이 가져가 힘을 확인해' : f(`open${r}`) ? '안쪽 자석을 오른쪽 돋보기로 옮겨 봐' : '덮개 손잡이를 위로 끌어 열어 봐';
      focus = f(`open${r}`) ? 'hidden-magnet' : 'lid';
      clues = ['겉에서는 보이지 않는 부품이 안쪽에 있어.', '덮개를 연 뒤 빨강·파랑 부품을 찾아봐.']; break;
    case 2:
      total = 5; done = [0, 1].reduce((v, i) => v + Number(f(`with${i}`)) + Number(f(`without${i}`)), 0) + Number(f('with2'));
      action = r === 2 ? a.values.mechanicsVersion===1&&!f('faultObserved2') ? '자석을 넣고 덮개를 닫아 흔들어, 고장 증상을 확인해' : a.values.mechanicsVersion===1&&!f('diagnosis2') ? '실험 결과를 보고 어디를 고칠지 골라 봐' : '철판 자리를 맞추고 덮개를 닫아 시험해 봐' : `자석 ${f(`without${r}`) ? '넣고' : '없이'} 덮개를 닫아 흔들어 봐`;
      focus = r === 2 && (a.values.mechanicsVersion!==1||f('diagnosis2')) ? 'repair-plate' : 'repair-magnet';
      clues = ['같은 물건을 같은 힘으로 흔들어야 비교할 수 있어.', '자석과 철판이 가까이 마주 보는지 살펴봐.']; break;
    case 3:
      total = 8; done = materials.filter(m => f(`tested-${m.id}`)).length + ['clip', 'nail'].filter(id => f(`delivered-${id}`)).length;
      if(a.values.mechanicsVersion===1){total=6;done=materials.filter(m=>f(`sorted-${m.id}`)).length;}
      action = '각 재료를 자석으로 검사하고, 결과에 맞게 분류해'; focus = 'sweep-magnet';
      clues = ['붙지 않는 재료도 가까이 대서 검사해야 해.', '겉모습이 반짝인다고 모두 자석에 붙을까? 직접 비교해 봐.']; break;
    case 4:
      total = 4; done = [0, 1, 2, 3].filter(i => f(`done${i}`)).length;
      action = ['먼 자리에서 손을 떼고 관찰해', '자석을 가까운 점선으로 옮겨 관찰해', '자석은 그대로! 종이만 점선에 넣고 관찰해', '철 열쇠 가까이 자석을 옮겨 구조해'][r];
      focus = r === 2 ? 'paper' : 'distance-magnet';
      clues = ['한 번에 한 가지 조건만 바꾸면 원인을 찾을 수 있어.', r === 2 ? '앞 실험의 자석 위치를 유지해야 종이의 영향만 알 수 있어.' : '닿기 전에도 물체가 움직이는지 눈여겨봐.']; break;
    case 5:
      total = 6; done = [0, 1].reduce((v, i) => v + Number(f(`test${i}N`)) + Number(f(`test${i}S`)) + Number(f(`solved${i}`)), 0);
      action = f(`test${r}N`) && f(`test${r}S`) ? '두 반응을 근거로 사라진 극 스티커를 붙여 봐' : '기준 자석의 두 극을 번갈아 점선에 대 봐';
      focus = f(`test${r}N`) && f(`test${r}S`) ? '' : 'probe'; clues = ['어느 극을 댔을 때 밀리고 당겨졌는지 비교해.', '같은 극끼리는 밀어내고, 다른 극끼리는 끌어당겨.']; break;
    case 6:
      total = 3; done = [0, 1, 2].filter(i => f(`done${i}`)).length;
      action = r < 2 ? '고리를 뒤집어 기둥에 놓고, 손을 떼어 띄워 봐' : '이번에는 세 고리가 서로 붙도록 배치해'; focus = 'ring0';
      clues = ['고리의 윗면과 바로 위 고리의 아랫면이 마주 봐.', '번호별 뒤집기 버튼으로 마주 보는 두 극을 바꿔 봐.']; break;
    case 7:
      total = 3; done = [0, 1, 2].filter(i => f(`clean${i}`)).length;
      action = '바깥 자석을 천천히 움직여, 세 얼룩 위를 좌우로 닦아 줘'; focus = 'cleaner';
      clues = ['안쪽 패드가 따라오는 속도를 살펴봐.', '연결이 끊기면 패드 가까이 돌아와 천천히 출발해.']; break;
    case 8:
      total = 3; done = [0, 1, 2].filter(i => f(`segment${i}`)).length;
      action = f(`checkpoint${r}`) ? ['카트 앞에서 자석으로 당겨 배달해', '카트 뒤에서 자석으로 밀어 배달해', '극과 위치를 조절해 반대 방향으로 배달해'][r] : '먼저 중간 점검소에 멈추고 자석을 떼어 점검해'; focus = 'controller';
      clues = ['카트의 왼쪽은 N극, 오른쪽은 S극이야.', '조종 자석을 위로 떼면 멈춰. 마주 보는 극을 바꿔 움직임을 비교해.']; break;
    case 9:
      total = 3; done = ['base', 'magnet', 'target'].filter(f).length;
      action = !f('chosen') ? '고치고 싶은 시민의 물건을 골라 줘' : !f('base') ? '장치 몸체를 큰 점선에 끌어 놓아 줘' : '자석과 마주 볼 부품을 점선에 배치해';
      focus = !f('base') ? 'base' : 'design-magnet'; clues = ['몸체·자석·마주 볼 부품, 세 가지가 필요해.', '철판을 쓸지 자석을 쓸지 선택해. 다음 활동에서 직접 시험하고 고칠 수 있어.'];
      if(a.values.mechanicsVersion===1){total=4;if(done===3){done+=Number(missionReady(n,a,s));action='부품을 모두 놓았어! 시제품 반응 시험을 눌러 줘';focus='';}} break;
    case 10:
      total = 3; done = ['use0', 'use1', 'force-arrow'].filter(f).length;
      action = f('use1') ? '화살표를 힘이 작용한 두 부품 사이에 놓아 줘' : '손잡이를 움직인 뒤 사용 시험을 눌러 결과를 확인해';
      focus = f('use1') ? 'force-arrow' : 'use-handle'; clues = ['작동하지 않으면 거리·높이·마주 보는 극을 하나씩 바꿔 봐.', '배치를 고쳤다면 두 사용 상황을 모두 다시 시험해야 해.']; break;
  }
  if(n===10&&a.values.adjusting===true){action='두 부품의 거리와 높이를 맞추고, 조작 손잡이로 돌아가자';focus='design-magnet';}
  if (a.values.inquiryVersion===1 && missionReady(n,a,s)) { action='실험 완료! 아래에서 내 실험 증거로 설명해 보자'; clues=['실험 결과가 처음 예상과 같았는지 떠올려 봐.']; focus=''; done=total; }
  else if (ready(n, a, s)) { action = n % 2 ? '발견 완료! 오른쪽 아래에서 다음 의뢰로 가자' : '발견 완료! 내 실험을 이야기하고 개념 영상을 보자'; focus = ''; done = total; }
  else if (a.values[`done${r}`] || a.values[`solved${r}`] || a.values[`segment${r}`] || n === 1 && f(`found${r}`) && (a.values.mechanicsVersion!==1||f(`latch${r}`)) || n === 2 && f(`with${r}`) && f(`without${r}`) || n === 10 && r === 0 && f('use0')) { action = '관찰했어! 실험대 아래의 다음 의뢰 버튼을 눌러 줘'; focus = ''; }
  return { action, clues, focus, done, total };
}

export function coachMarkup() {
  return `<aside class="lab-coach" aria-label="보조 캐릭터 자꾸의 도움"><button class="coach-toggle" type="button" aria-expanded="false" aria-controls="coach-bubble">${coachArt()}<span>자꾸 · 힌트</span></button><div class="coach-bubble" id="coach-bubble" hidden><div class="coach-heading"><strong>수리 도우미 자꾸</strong><button type="button" class="coach-close" aria-label="힌트 닫기">×</button></div><p class="coach-clue" aria-live="polite"></p><button class="coach-more" type="button">다른 단서 보기</button></div></aside>`;
}

export function bindCoach(root: HTMLElement, n: number, a: Activity, s: Save) {
  const signal = new AbortController(), helper = root.querySelector<HTMLElement>('.lab-coach')!;
  const toggle = helper.querySelector<HTMLButtonElement>('.coach-toggle')!, bubble = helper.querySelector<HTMLElement>('.coach-bubble')!;
  let level = 0, stateKey = '';
  const update = () => {
    const state = coaching(n, a, s), key = `${a.values.round}:${state.action}`;
    if (key !== stateKey) { level = 0; stateKey = key; }
    const action = root.querySelector<HTMLElement>('.mission-next-action'); if (action) action.textContent = state.action;
    const progress = root.querySelector<HTMLElement>('.discovery-count'); if (progress) progress.textContent = `발견 ${state.done} / ${state.total}`;
    helper.querySelector('.coach-clue')!.textContent = level === 0 ? state.action : state.clues[Math.min(level - 1, state.clues.length - 1)];
    root.querySelectorAll('.coach-focus').forEach(el => el.classList.remove('coach-focus'));
    if (!bubble.hidden && state.focus) root.querySelector(`[data-drag="${state.focus}"]`)?.classList.add('coach-focus');
  };
  const setOpen = (open: boolean) => { bubble.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); update(); };
  toggle.addEventListener('click', () => setOpen(bubble.hidden), { signal: signal.signal });
  helper.querySelector('.coach-close')!.addEventListener('click', () => { setOpen(false); toggle.focus(); }, { signal: signal.signal });
  helper.querySelector('.coach-more')!.addEventListener('click', () => { level = (level + 1) % 3; update(); }, { signal: signal.signal });
  helper.addEventListener('keydown', e => { if (e.key === 'Escape') { setOpen(false); toggle.focus(); } }, { signal: signal.signal });
  root.addEventListener('coach-update', update, { signal: signal.signal }); update();
  return () => signal.abort();
}
