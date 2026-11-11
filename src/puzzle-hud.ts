import type { Activity } from './domain';
import type { Context } from './activity-types';
import { puzzleSolved, puzzleStars } from './mission-model';
import './puzzle-hud.css';

const star = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2.6 2.9 6 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z"/></svg>';
/** One emergency per puzzle activity: who caused it, and what the magnet has to do about it. */
const crises: Record<number, { place: string; title: string; task: string }> = {
  2: { place: '생활 자석 조사국 · 긴급 의뢰', title: '고철 도깨비가 걸쇠 자석을 빼 가고 우편함을 흔들어 놨어!', task: '흔들려도 덮개가 열리지 않게 고쳐 줘. 편지가 날아가기 전에!' },
  3: { place: '힘 실험 연구소 · 긴급 의뢰', title: '고철 도깨비가 부품 통을 엎어서 기계가 멈췄어!', task: '자석에 붙는 철 부품만 골라 수리함에 넣어 줘. 붙지 않는 물건은 손으로 치워야 해.' },
  4: { place: '힘 실험 연구소 · 긴급 의뢰', title: '도깨비가 철 클립을 손이 닿지 않는 곳에 흩어 놨어!', task: '닿지 않고 자석의 힘만으로 클립을 끌어와 줘. 얼마나 가까이 대야 할까?' },
  5: { place: '극성 복원 센터 · 긴급 의뢰', title: '고철 도깨비가 자석 문의 극 표시를 지워 버렸어!', task: '기준 자석을 대 보고 극 표시를 되찾은 다음, 빗장 자석을 밀어내 문을 열어 줘.' },
  6: { place: '극성 복원 센터 · 긴급 의뢰', title: '도깨비가 고리자석을 뒤섞어 완충 장치가 내려앉았어!', task: '고리를 뒤집어 띄우고, 다시 붙여서 장치를 고쳐 줘.' },
  7: { place: '원격 제어 구역 · 긴급 의뢰', title: '수조 유리가 이끼로 뒤덮여 물고기가 보이지 않아!', task: '유리 밖 손잡이의 자석으로 물속 패드를 움직여 닦아 줘.' },
  8: { place: '원격 제어 구역 · 긴급 의뢰', title: '고철 도깨비가 택배 보관실을 유리벽으로 막아 버렸어!', task: '손은 유리벽을 넘지 못해. 자석의 힘으로 카트를 깃발까지 보내 줘.' },
};

/** Stars stay empty while the learner works, so a miss never reads as a penalty. */
export function puzzleStarsMarkup(a: Activity): string {
  const solved = puzzleSolved(a), count = puzzleStars(a);
  const label = !solved ? '퍼즐을 풀면 별을 받아' : count ? `별 ${count}개 획득` : '자동재생으로 살펴봤어. 직접 풀면 별을 받아';
  return `<div class="puzzle-stars${solved ? ' is-solved' : ''}" role="img" aria-label="${label}">${[0, 1, 2].map(i => `<span class="${i < count ? 'on' : ''}">${star}</span>`).join('')}</div>`;
}
export function puzzleHud(n: number, a: Activity): string {
  const extended:Record<number,{title:string;task:string}>={
    4:{title:'도깨비가 철 열쇠를 깊은 틈에 떨어뜨렸어!',task:'멀리서 살펴보고 가까이 가져가 봐. 종이 막이 있어도 자석으로 꺼낼 수 있을까?'},
    5:{title:'극 표시가 지워진 두 문이 길을 막았어!',task:'극 표시를 되찾고 빗장을 밀어 첫 문을, 당겨 두 번째 문을 열어 줘.'},
    6:{title:'승강 발판이 내려앉아서 두 친구가 건너지 못해!',task:'고리자석으로 발판을 올려 친구들을 태우고, 다시 내려 건너편 길과 이어 줘.'},
    8:{title:'택배 레일에 세 구간이 남았어!',task:'먼저 중간 깃발에 멈춰 줘. 유리벽 너머에 배달한 뒤 돌아오는 택배도 운반해 줘.'},
  };
  const crisis = a.values.puzzleRevision===2&&extended[n]?{...crises[n],...extended[n]}:crises[n];
  if (a.values.puzzleVersion !== 1 || !crisis) return '';
  const card = a.values.crisisSeen === true || puzzleSolved(a) ? '' : `<div class="puzzle-crisis" role="group" aria-label="긴급 의뢰">
    <div class="puzzle-crisis-card"><img src="/assets/quest/villain-scrap-goblin.png" alt="" width="180" height="180">
    <div><small>${crisis.place}</small><strong>${crisis.title}</strong><p>${crisis.task}</p>
    <button type="button" class="mission-action" data-mission="crisis-go">출동하기</button></div></div></div>`;
  const restored=puzzleSolved(a);
  const guardian=a.values.puzzleRevision===2&&n!==8?`<div class="puzzle-guardian${restored?' is-restored':''}" aria-hidden="true"><img src="/assets/quest/villain-scrap-goblin.png" alt=""><span>시설 복구!</span></div>`:'';
  return puzzleStarsMarkup(a) + guardian + card;
}
export function bindPuzzleHud(c: Context): void {
  const guardian=c.root.querySelector<HTMLElement>('.puzzle-guardian');
  c.root.addEventListener('puzzle-update',()=>guardian?.classList.toggle('is-restored',puzzleSolved(c.a)));
  const card = c.root.querySelector<HTMLElement>('.puzzle-crisis');
  if (!card) return;
  card.querySelector('[data-mission="crisis-go"]')?.addEventListener('click', () => {
    c.a.values.crisisSeen = true; card.remove(); c.touch();
    c.root.querySelector<HTMLElement>('[data-drag]')?.focus({ preventScroll: true });
  });
}
