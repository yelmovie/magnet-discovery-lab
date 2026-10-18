import { flag, value, record, materials, opposite, relation, ringGaps, designResult, defaultDesign, type Activity, type Point, type Pole, type Save } from './domain';
import { magnet, objectArt, mascot, icon } from './art';
import { btn, on, update, type Context, type View } from './activity-types';
import { bindDrag, draggable, spot, near, clamp, placementControls } from './manipulation';
import { investigateView, repairView, sortingView, ringsView, inventionView, inventionTestView, compassView } from './tablet-activities';
import { deliveryView } from './delivery';
import { distanceView } from './distance';
import { addTrial } from './trial-records';

export const rewards = [
  { name: '자석 수리 키트', use: '다음 연구소에서 자석으로 재료를 검사해.', change: '배송 보관함의 덮개를 고쳤어!', icon: 'magnet' },
  { name: '힘 관찰 렌즈', use: '다음 센터에서 밀림·끌림을 관찰해.', change: '철 부품을 골라 내는 분류소가 다시 열렸어!', icon: 'eye' },
  { name: '극 표시 스티커', use: '카트의 마주 보는 극을 보며 운반해.', change: '고리자석 완충 장치가 다시 작동해!', icon: 'spark' },
  { name: '원격 조작 손잡이', use: '발명 공방에서 판 너머 장치를 설계할 수 있어.', change: '수조가 깨끗해지고 부품 배송이 도착했어!', icon: 'map' },
  { name: '나의 발명 설계도', use: '마지막 관제소에서 내 설계를 다시 사용해.', change: '시민이 사용할 자석 장치를 완성했어!', icon: 'book' },
];
export function rewardBelt(s: Save) { return `<div class="tool-belt" aria-label="모은 수리 도구">${rewards.map((r, i) => `<div class="tool-slot ${s.evidence.length > i ? 'earned' : ''}" title="${r.use}">${icon(s.evidence.length > i ? r.icon : 'lock', 21)}<span>${r.name}</span>${s.evidence.length > i ? '<b>획득</b>' : ''}</div>`).join('')}</div>`; }
const pt = (a: Activity, k: string, x: number, y: number): Point => a.points[k] || { x, y };
const done = (a: Activity, k: string, label: string, result: string) => {
  a.values[k] = true; record(a, { key: k, label, result });
  const objects = Object.entries(a.points).filter(([id]) => !id.startsWith('initial:')).map(([id, p]) => ({ id, ...p }));
  const initialObjects = Object.entries(a.points).filter(([id]) => id.startsWith('initial:')).map(([id, p]) => ({ id: id.slice(8), ...p }));
  addTrial(a, { key: k, activity: value(a, 'activityNumber', 1), conditions: { label, result }, initialObjects, objects, input: [], outcome: result, pinned: true });
};
function say(c: Context, text: string, success = false) { c.a.values.say = text; c.a.values.mood = success ? 3 : 2; update(c); }
function live(c: Context, text: string) { const el = c.root.querySelector('[data-live]'); if (el) el.textContent = text; }
const cleanupAll = (items: (() => void)[]) => () => items.forEach(fn => fn());
function shell(a: Activity, title: string, tip: string, board: string, controls = '', count = '') {
  const mood = value(a, 'mood', 0);
  a.values.question = title;
  return `<div class="play-board">${board}</div><div class="action-dock">${controls}</div><div class="buddy-dialogue" role="status">${mascot('dangi', 52, mood)}<p data-live>${String(a.values.say || tip)}</p></div>${placementControls}`;
}
function nextRound(c: Context, n: number) { c.a.values.round = n; delete c.a.values.say; c.a.values.mood = 0; update(c); }

export function adventureView(screen: number, a: Activity, s: Save): View {
  if (screen === 6 && a.values.playVersion !== 3) a.values.round = 0;
  a.values.playVersion = 3; a.values.activityNumber = screen;
  if (screen === 1) return investigateView(a);
  if (screen === 2) return repairView(a);
  if (screen === 3) return sortingView(a);
  if (screen === 4) { a.values.question = a.values.distanceStep === 'paper' ? '종이가 있어도 클립이 움직일까?' : '가까이하면 클립이 움직일까?'; return distanceView(a); }
  if (screen === 5) return flag(a, 'compassOpen') ? compassView(a) : poles(a);
  if (screen === 6) return ringsView(a);
  if (screen === 8) return deliveryView(a);
  if (screen === 9) return inventionView(a, s);
  return inventionTestView(a, s);
}

function poles(a: Activity): View {
  const r = value(a, 'round', 0), p = (a.values.reference || 'N') as Pole;
  if (!a.values.poles) a.values.poles = 'NS' + (Math.random() < .5 ? 'SN' : 'NS');
  const hidden = String(a.values.poles)[r] as Pole, solved = flag(a, `solved${r}`), known = r < 2, tested = flag(a, `test${r}${p}`);
  const mp = pt(a, 'reference', 24, 48), last = tested ? relation(p, hidden) : undefined;
  return { html: shell(a, known ? '자석을 가까이하고, 뒤집어서 한 번 더!' : '색이 없는 자석. 반응을 보고 극을 복원해 줘.', '기준 자석을 오른쪽 자석 가까이 끌어 봐. 반대 극으로 뒤집어 같은 방법으로 비교하자.', `${draggable('reference', `기준 자석. 오른쪽 끝 ${p}극`, mp, magnet(opposite(p)))}<div class="mystery-magnet ${tested ? last : ''}"><span>${known || solved ? hidden : '?'}</span><span>${known || solved ? opposite(hidden) : '?'}</span><b>${known ? '연습 자석' : `정체를 모르는 자석 ${r - 1}`}</b></div><div class="force-indicator">${tested ? last === 'repel' ? '←  밀어냄  →' : '→  끌어당김  ←' : '가까이 대어 봐'}</div>${!known && !solved ? `${draggable('labelN', 'N극 표시 스티커', { x: 31, y: 81 }, '<b>N</b>', 'pole-sticker n')}${draggable('labelS', 'S극 표시 스티커', { x: 47, y: 81 }, '<b>S</b>', 'pole-sticker s')}${spot({ x: 65, y: 49 }, '왼쪽 극 표시', 'label-target')}` : ''}<div class="pole-records">${(['N', 'S'] as Pole[]).map(q => `<span class="${flag(a, `test${r}${q}`) ? 'checked' : ''}">기준 ${q}극 → ${flag(a, `test${r}${q}`) ? relation(q, hidden) === 'repel' ? '밀어냄' : '끌어당김' : '관찰 전'}</span>`).join('')}</div>`, `${btn('flip', `기준 자석 뒤집기 · ${p}극`)}${r === 3 && solved ? btn('compass', '더 해 보기 · 나침반') : ''}${solved && r < 3 ? btn('next', r === 1 ? '회색 자석의 극 추리하기 →' : '다음 자석으로 →', 'primary') : ''}`, `힘 관찰 렌즈 사용 · ${r + 1} / 4`), bind(c) {
    const clean = [bindDrag(c, 'reference', mp, q => {
      a.points.reference = q;
      if (!near(q, { x: 48, y: 48 }, 12)) return say(c, '기준 자석의 오른쪽 끝을 다른 자석의 왼쪽 끝 가까이 가져가 봐.');
      a.values.last = relation(p, hidden); done(a, `test${r}${p}`, `자석 ${r + 1} · 기준 ${p}극`, p === hidden ? '서로 밀어냄' : '서로 끌어당김');
      if (known && flag(a, `test${r}N`) && flag(a, `test${r}S`)) a.values[`solved${r}`] = true;
      say(c, p === hidden ? `${p}극과 ${known ? hidden + '극' : '알 수 없는 극'}이 서로 밀어냈어. 다른 극으로도 확인하자.` : '서로 끌어당겼어! 자석을 뒤집으면 반응이 어떻게 달라질까?', solved);
    })];
    (['N', 'S'] as Pole[]).forEach(label => clean.push(bindDrag(c, `label${label}`, { x: label === 'N' ? 31 : 47, y: 81 }, q => {
      if (!near(q, { x: 65, y: 49 }, 13)) return say(c, '스티커를 회색 자석의 왼쪽 끝에 붙여 줘.');
      if (!flag(a, `test${r}N`) || !flag(a, `test${r}S`)) return say(c, '두 극의 반응을 모두 관찰한 뒤 근거를 보고 붙여 보자.');
      if (label !== hidden) { record(a, { key: `revise${r}`, label: '극 표시 수정', result: `${label}극으로 예상한 뒤 실험 기록을 다시 비교했어.` }); return say(c, '기록에서 서로 밀어낸 경우를 찾아 봐. 마주 보는 두 극이 같았겠지?'); }
      done(a, `solved${r}`, `자석 ${r + 1} 극 복원`, `기준 ${hidden}극과 밀어낸 근거로 왼쪽 ${hidden}극, 오른쪽 ${opposite(hidden)}극을 표시했어.`); say(c, '표시 복원 성공! 색을 보지 않고 힘의 반응으로 알아냈어.', true);
    })));
    on(c, 'compass', () => { a.values.compassOpen = true; delete a.values.say; update(c); });
    on(c, 'flip', () => { a.values.reference = opposite(p); a.points.reference = { x: 24, y: 48 }; delete a.values.last; update(c); });
    on(c, 'next', () => { a.points.reference = { x: 24, y: 48 }; delete a.values.last; nextRound(c, r + 1); }); return cleanupAll(clean);
  } };
}
