import { flag, value, record, materials, opposite, relation, ringGaps, designResult, defaultDesign, type Activity, type Point, type Pole, type Save } from './domain';
import { magnet, objectArt, mascot } from './art';
import { btn, on, update, type Context, type View } from './activity-types';
import { bindDrag, draggable, spot, near, placementControls, clamp } from './manipulation';
import { addTrial, currentInventionTrial, type TrialObject } from './trial-records';

const pt = (a: Activity, id: string, x: number, y: number) => a.points[id] || { x, y };
const cleanup = (all: (() => void)[]) => () => all.forEach(fn => fn());
const message = (c: Context, text: string) => { c.a.values.say = text; update(c); };
const live = (c: Context, text: string) => { const el = c.root.querySelector('[data-live]'); if (el) el.textContent = text; };
function surface(a: Activity, question: string, instruction: string, board: string, controls = '') {
  a.values.question = question;
  return `<div class="play-board">${board}</div><div class="action-dock">${controls}</div><div class="buddy-dialogue" role="status">${mascot('dangi', 52)}<p data-live>${String(a.values.say || instruction)}</p></div>${placementControls}`;
}
function observe(a: Activity, key: string, label: string, result: string, objects: TrialObject[] = [], conditions = {}) {
  a.values[key] = true; record(a, { key, label, result });
  addTrial(a, { key, activity: value(a, 'activityNumber', 1), conditions: { label, ...conditions }, initialObjects: objects, objects, input: [], outcome: result, pinned: true });
}
export function investigateView(a: Activity): View {
  const r = value(a, 'round', 0), name = r ? '책갈피' : '보관함', predicted = typeof a.values[`prediction${r}`] === 'string', open = flag(a, `open${r}`), found = flag(a, `found${r}`);
  const lid = { x: 48, y: open ? 24 : 49 }, m = { x: 48, y: 31 };
  return { html: surface(a, '어디에 자석이 숨어 있을까?', found ? r ? '두 물건의 자석을 찾았어. 다음 활동에서 써 보자.' : '보관함에서 찾았어. 책갈피도 살펴볼까?' : !predicted ? '자석이 있을 것 같은 곳을 눌러 봐.' : !open ? '손잡이를 위로 올려 봐.' : '안쪽 자석을 오른쪽 관찰 매트로 꺼내 봐.', `<div class="device-prop ${r ? 'book-prop' : ''}"><span>${name}</span>${open ? '<div class="fixed-iron">철판</div>' : ''}</div>${predicted ? draggable('lid', `${name} 손잡이`, lid, `<b>손잡이</b>`, 'lid-piece') : ''}${open ? spot({ x: 81, y: 65 }, '관찰 매트', 'evidence-mat') : ''}${open && !found ? draggable('hidden', '안쪽 자석', m, magnet(), 'small-magnet') : ''}${found ? `<div class="found-magnet">${magnet()}<span>내가 찾은 자석</span></div>` : ''}`, !predicted ? `${btn('predict-lid', '덮개 안쪽')}${btn('predict-body', '몸체 안쪽')}` : found && !r ? btn('next', '책갈피도 살펴보기', 'primary') : ''), bind(c) {
    ['lid', 'body'].forEach(p => on(c, `predict-${p}`, () => { a.values[`prediction${r}`] ||= p; record(a, { key: `prediction${r}`, label: `${name}의 첫 예상`, result: p === 'lid' ? '덮개 안쪽에 있을 것 같아.' : '몸체 안쪽에 있을 것 같아.' }); update(c); }));
    const all = [bindDrag(c, 'lid', lid, p => { if (p.y < 38) { observe(a, `open${r}`, `${name} 열기`, '덮개 안쪽 자석과 몸체의 철판을 관찰했어.', [{ id: 'magnet', x: 48, y: 31 }, { id: 'iron', x: 48, y: 54 }]); delete a.values.say; update(c); } else message(c, '손잡이를 위로 올려 봐.'); }), bindDrag(c, 'hidden', m, p => { if (!near(p, { x: 81, y: 65 }, 18)) return message(c, '오른쪽 관찰 매트에 놓아 줘.'); observe(a, `found${r}`, `${name}에서 자석 찾기`, '자석이 맞닿던 자리와 철판을 확인했어.', [{ id: 'magnet', ...p }, { id: 'iron', x: 48, y: 54 }]); delete a.values.say; update(c); })];
    on(c, 'next', () => { a.values.round = 1; delete a.values.say; update(c); }); return cleanup(all);
  } };
}
export function repairView(a: Activity): View {
  const r = value(a, 'round', 0), without = flag(a, `without${r}`), installed = flag(a, `installed${r}`), success = flag(a, `with${r}`), lid = { x: 48, y: success ? 49 : 23 };
  return { html: surface(a, '어떻게 하면 덮개가 붙어 있을까?', success ? r ? '두 물건을 수리했어. 어떤 부품이 붙잡았는지 이야기해 보자.' : '같은 흔들기에도 붙어 있어. 책갈피도 고쳐 볼까?' : !without ? '자석 없이 덮개를 닫아 봐.' : !installed ? '자석을 덮개 안쪽에 넣어 봐.' : '자석을 넣은 덮개를 닫아 봐.', `<div class="device-prop ${r ? 'book-prop' : ''} ${success ? 'repaired' : ''}"><span>${r ? '책갈피' : '보관함'}</span><div class="fixed-iron">철판 · 고정</div></div>${draggable('lid', '덮개 손잡이', lid, `<b>덮개</b>${installed ? `<span class="attached-part">${magnet()}</span>` : ''}`, `lid-piece ${without || success ? 'auto-shake' : ''}`)}${without && !installed ? `${spot({ x: 48, y: 23 }, '덮개 안쪽')}${draggable('repair-magnet', '수리 자석', { x: 18, y: 75 }, magnet())}` : ''}<div class="observation-tags"><span class="${without ? 'checked' : ''}">자석 없음 ${without ? '· 열렸어' : ''}</span><span class="${success ? 'checked' : ''}">자석 있음 ${success ? '· 붙었어' : ''}</span></div>`, success && !r ? btn('next', '책갈피도 고치기', 'primary') : ''), bind(c) {
    const all = [bindDrag(c, 'repair-magnet', { x: 18, y: 75 }, p => { if (!near(p, { x: 48, y: 23 }, 18)) return message(c, '덮개 안쪽에 놓아 줘.'); a.values[`installed${r}`] = true; delete a.values.say; update(c); }), bindDrag(c, 'lid', lid, p => {
      if (p.y < 43) return message(c, '덮개를 몸체까지 내려 봐.');
      const key = installed ? `with${r}` : `without${r}`;
      observe(a, key, `${r ? '책갈피' : '보관함'} · ${installed ? '자석 있음' : '자석 없음'}`, installed ? '같은 흔들기에도 자석이 철판을 당겨 덮개를 붙잡았어.' : '닫고 일정하게 흔들자 덮개가 열렸어.', [{ id: 'lid', x: 48, y: installed ? 49 : 23 }, { id: 'iron', x: 48, y: 54 }, ...(installed ? [{ id: 'magnet', x: 48, y: 49 }] : [])], { magnet: installed });
      delete a.values.say; update(c);
    })]; on(c, 'next', () => { a.values.round = 1; delete a.values.say; update(c); }); return cleanup(all);
  } };
}
export function sortingView(a: Activity): View {
  const batch = value(a, 'round', 0), group = materials.slice(batch * 3, batch * 3 + 3), mp = pt(a, 'probe', 50, 17), complete = group.every(m => flag(a, m.id) && flag(a, `sorted-${m.id}`));
  const position = (id: string) => pt(a, id, 25 + group.findIndex(m => m.id === id) * 25, 37);
  return { html: surface(a, '어떤 물체가 자석을 따라올까?', complete ? batch ? '여섯 물체를 확인했어. 철과 알루미늄의 반응을 떠올려 봐.' : '세 물체를 확인했어. 다음 세 개도 조사해 보자.' : '물체를 예상 바구니에 놓고, 자석을 가까이 대어 봐.', `<div class="sort-bin yes-bin"><b>${group.every(m => flag(a, m.id)) ? '확인한 결과' : '내 예상'} · 붙음</b></div><div class="sort-bin no-bin"><b>${group.every(m => flag(a, m.id)) ? '확인한 결과' : '내 예상'} · 안 붙음</b></div>${group.map(m => draggable(m.id, m.name, position(m.id), `${objectArt(m.id)}<b>${m.name}</b>`, `material-piece ${flag(a, `sorted-${m.id}`) ? 'verified' : ''}`)).join('')}${draggable('probe', '검사 자석', mp, magnet())}`, complete && !batch ? btn('next', '다음 세 물체', 'primary') : ''), bind(c) {
    const all = group.map(m => bindDrag(c, m.id, position(m.id), p => {
      if (p.y < 52 || p.x > 45 && p.x < 55) return message(c, `${m.name}를 아래쪽 바구니에 놓아 줘.`);
      const bin = p.x < 50 ? 'yes' : 'no'; a.values[`prediction-${m.id}`] ||= bin; a.values[`bin-${m.id}`] = bin;
      a.points[m.id] = { x: (bin === 'yes' ? 17 : 65) + group.indexOf(m) * 9, y: 72 };
      a.values[`sorted-${m.id}`] = flag(a, m.id) && (bin === 'yes') === m.magnetic;
      message(c, flag(a, m.id) ? flag(a, `sorted-${m.id}`) ? `${m.name}를 관찰한 대로 놓았어.` : `${m.name}가 움직였는지 떠올려 보고 바구니를 바꿔 봐.` : `${m.name}의 예상이야. 자석을 가까이 대어 봐.`);
    }));
    all.push(bindDrag(c, 'probe', mp, p => {
      a.points.probe = p; const m = [...group].sort((x, y) => Math.hypot(p.x - position(x.id).x, p.y - position(x.id).y) - Math.hypot(p.x - position(y.id).x, p.y - position(y.id).y)).find(m => near(p, position(m.id), 15));
      if (!m) return message(c, '검사할 물체 가까이에 자석을 놓아 줘.');
      if (!a.values[`prediction-${m.id}`]) return message(c, `${m.name}를 예상 바구니에 먼저 놓아 봐.`);
      a.values[`sorted-${m.id}`] = (a.values[`bin-${m.id}`] === 'yes') === m.magnetic;
      observe(a, m.id, m.name, m.magnetic ? '자석을 따라 움직였어.' : '자석을 가까이해도 그대로였어.', [{ id: 'magnet', ...p }, { id: m.id, ...position(m.id) }], { prediction: a.values[`prediction-${m.id}`], magnetic: m.magnetic });
      message(c, `${m.name}: ${m.magnetic ? '자석을 따라왔어.' : '그대로 있었어.'} ${flag(a, `sorted-${m.id}`) ? '관찰한 결과를 자동으로 확인했어.' : '관찰한 대로 바구니를 고쳐 줘.'}`);
    }, p => group.forEach(m => c.root.querySelector(`[data-drag="${m.id}"]`)?.classList.toggle('magnetic-lift', m.magnetic && near(p, position(m.id), 15)))));
    on(c, 'next', () => { a.values.round = 1; a.points.probe = { x: 50, y: 17 }; delete a.values.say; update(c); }); return cleanup(all);
  } };
}
export function ringsView(a: Activity): View {
  const r = value(a, 'round', 0), two = r === 0, tops: Pole[] = ['N', (a.values.ring1 || 'N') as Pole, (a.values.ring2 || 'N') as Pole], gaps = ringGaps(tops), tested = flag(a, 'tested');
  const compareDone = flag(a, 'two-attract') && flag(a, 'two-repel'), goal = r === 2 ? [false, true] : [true, false], success = flag(a, `order${r}`);
  const ys = [74, tested && gaps[0] ? 48 : 63, 26]; ys[2] = ys[1] - (tested && gaps[1] ? 23 : 12);
  const face = (i: number) => `<span>위 ${tops[i]}</span><span class="ring-edge">아래 ${opposite(tops[i])}</span>`;
  const position = (i: number) => flag(a, `placed${i}`) ? { x: 51, y: tested ? ys[i] : i === 1 ? 51 : 28 } : { x: i === 1 ? 20 : 80, y: 50 };
  return { html: surface(a, two ? '고리 사이를 띄워 볼까?' : r === 1 ? '아래는 띄우고, 위는 붙여 볼까?' : '더 해 보기 · 아래는 붙이고, 위는 띄워 볼까?', two ? compareDone ? '붙음과 밀림을 모두 관찰했어. 고리 하나를 더 넣어 볼까?' : '고리를 막대에 놓아 보고, 뒤집어서 한 번 더 놓아 봐.' : '마주 보는 면을 보며 고리 하나씩 뒤집어 봐.', `<div class="ring-rod"></div><div class="ring-fixed">${face(0)}</div>${[1, ...(two ? [] : [2])].map(i => draggable(`ring${i}`, `고리 ${i}`, position(i), face(i), 'ring-piece')).join('')}<div class="board-counter">${two ? '고리 2개로 비교하기' : '고리 3개로 고쳐 보기'}</div>`, `${btn('flip1', '고리 1 뒤집기')}${two ? '' : btn('flip2', '고리 2 뒤집기')}${btn('test', '손을 놓아 보기', 'primary')}${two && compareDone ? btn('next', '고리 하나 더 넣어 보기') : success && r === 1 ? btn('extra', '더 해 보기 · 다른 주문') : ''}`), bind(c) {
    const all = [1, ...(two ? [] : [2])].map(i => bindDrag(c, `ring${i}`, position(i), p => { a.values[`placed${i}`] = Math.abs(p.x - 51) < 18 && p.y < 84; a.values.tested = false; delete a.values.say; update(c); }));
    [1, 2].forEach(i => on(c, `flip${i}`, () => { a.values[`ring${i}`] = opposite(tops[i]); a.values.tested = false; delete a.values.say; update(c); }));
    on(c, 'test', () => {
      if (!flag(a, 'placed1') || !two && !flag(a, 'placed2')) return message(c, '먼저 가운데 막대에 고리를 놓아 줘.');
      a.values.tested = true;
      if (two) a.values[gaps[0] ? 'two-repel' : 'two-attract'] = true;
      else if (gaps.every((g, i) => g === goal[i])) a.values[`order${r}`] = true;
      observe(a, `rings-${r}-${tops.join('')}`, two ? '두 고리의 반응' : '세 고리의 주문', `${gaps[0] ? '마주 보는 같은 극이 밀려 간격이 생겼어.' : '마주 보는 다른 극이 서로 붙었어.'}${two ? '' : gaps[1] ? ' 위쪽도 밀렸어.' : ' 위쪽은 붙었어.'}`, tops.slice(0, two ? 2 : 3).map((p, i) => ({ id: `ring${i}`, x: 51, y: ys[i], pole: p })));
      delete a.values.say; update(c);
    });
    on(c, 'next', () => { a.values.round = 1; a.values.tested = false; delete a.values.say; update(c); });
    on(c, 'extra', () => { a.values.round = 2; a.values.tested = false; delete a.values.say; update(c); }); return cleanup(all);
  } };
}
export function inventionView(a: Activity, s: Save): View {
  const d = s.design, box = d.template === 'box', m = pt(a, 'invent-magnet', 19, 78), target = box ? { x: 64, y: 47 } : pt(a, 'invent-target', 77, 78);
  a.values.base = true; if (box) a.values.target = true;
  return { html: surface(a, box ? '자꾸 열리는 우편함을 고쳐 줄까?' : '통 속 부품을 꺼낼 도구를 만들까?', !flag(a, 'magnet') ? '준비된 몸체에 자석을 놓아 봐.' : '내 배치로 시험해 보자. 처음부터 잘 작동하지 않아도 괜찮아.', `<div class="invention-anchor"><span>${box ? '덮개 안쪽 · 자석을 놓아 줘' : '얇은 투명 칸'}</span></div>${draggable('invent-magnet', '발명품 자석', m, magnet(opposite(d.pole)))}${box ? `<div class="fixed-design-target" style="left:${target.x}%;top:${target.y}%">${d.pair === 'magnet' ? magnet('N') : '<span class="iron-piece">철판 🔒</span>'}<small>몸체에 고정</small></div>` : draggable('invent-target', '통 안쪽 철 부품', target, '<span class="iron-piece">철 부품</span>')}`, `${btn('template', box ? '다른 의뢰 · 통 속 부품' : '다른 의뢰 · 우편함')}${flag(a, 'magnet') ? `${box ? btn('pair', `상대 부품 · ${d.pair === 'iron' ? '철판' : '자석'}`) : ''}${btn('flip', '자석 뒤집기')}` : ''}`), bind(c) {
    const revise = () => {
      const mp = pt(a, 'invent-magnet', 19, 78), tp = box ? target : pt(a, 'invent-target', 77, 78);
      d.aligned = flag(a, 'magnet') && flag(a, 'target') && mp.x < tp.x && Math.abs(mp.y - tp.y) < 12;
      d.gap = Math.max(10, Math.min(90, (tp.x - mp.x - 10) * 2)); d.revision++; s.designs[d.template] = structuredClone(d);
      record(a, { key: 'layout', label: '내 부품 배치', result: `${box ? '우편함' : '원격 도구'} · ${d.aligned ? '마주 봄' : '서로 어긋남'} · ${d.gap <= 36 ? '가까운 배치' : '먼 배치'}` });
      addTrial(a, { key: `layout-${d.revision}`, activity: 9, conditions: { label: '내 설계', pair: d.pair, gap: d.gap, aligned: d.aligned }, initialObjects: [{ id: 'magnet', ...m }, { id: 'iron', ...target }], objects: [{ id: 'magnet', ...mp, pole: d.pole }, { id: d.pair, ...tp }], input: [], outcome: '부품을 놓았어', template: d.template, designRevision: d.revision });
      delete a.values.say; update(c);
    };
    const all = [bindDrag(c, 'invent-magnet', m, p => { a.points['invent-magnet'] = p; a.values.magnet = p.y > 20 && p.y < 68; revise(); })];
    if (!box) all.push(bindDrag(c, 'invent-target', target, p => { a.points['invent-target'] = p; a.values.target = p.y > 20 && p.y < 68; revise(); }));
    on(c, 'flip', () => { d.pole = opposite(d.pole); revise(); }); on(c, 'pair', () => { d.pair = d.pair === 'iron' ? 'magnet' : 'iron'; revise(); });
    on(c, 'template', () => { const current = box ? 'remote' : 'box'; a.values[`${d.template}-layout`] = JSON.stringify({ points: a.points, magnet: flag(a, 'magnet'), target: flag(a, 'target') }); s.designs[d.template] = structuredClone(d); s.design = structuredClone(s.designs[current] || defaultDesign(current)); const raw = a.values[`${current}-layout`]; const layout = typeof raw === 'string' ? JSON.parse(raw) : null; a.points = layout?.points || {}; a.values.magnet = layout?.magnet || false; a.values.target = layout?.target || false; delete a.values.say; update(c); }); return cleanup(all);
  } };
}
export function inventionTestView(a: Activity, s: Save): View {
  const d = s.design, box = d.template === 'box', valid = designResult(d), passed = currentInventionTrial(a, d.template, d.revision);
  if (a.values.revision !== d.revision || a.values.template !== d.template) { a.values.reason = false; a.values.tested = false; a.values.revision = d.revision; a.values.template = d.template; delete a.values.say; delete a.values.cargo; }
  const design = s.activities[9], m = design?.points['invent-magnet'] || { x: 43, y: 47 }, tp = box ? { x: 64, y: 47 } : design?.points['invent-target'] || { x: 64, y: 47 };
  const extra = flag(a, 'extraRequested');
  const handle = box ? { x: 48, y: passed && !extra ? 48 : 22 } : pt(a, 'test-handle', 25, 76), cargoStart = value(a, 'cargo', 25);
  const reason = box ? '자석이 상대 부품을 당겨 덮개를 붙잡았어' : '판 너머의 철 부품을 자석으로 움직였어';
  return { html: surface(a, '내 장치가 잘 작동할까?', extra ? '더 해 보기야. 같은 장치를 한 번 더 사용해 봐.' : passed ? flag(a, 'reason') ? '내 장치가 해결한 불편을 이야기해 보자.' : '무엇이 내 장치를 움직이게 했는지 골라 봐.' : box ? '덮개를 닫아 봐. 같은 흔들기는 내가 해 줄게.' : '바깥 자석을 천천히 움직여 부품을 오른쪽 출구로 보내 봐.', box ? `<div class="device-prop ${passed ? 'repaired' : ''}"></div><div class="fixed-design-target" style="left:64%;top:47%">${d.pair === 'iron' ? '철판' : 'N극'} 🔒</div>${draggable('test-handle', '우편함 덮개', handle, `<b>덮개 손잡이</b><span class="attached-test-magnet" style="left:${(m.x - 28) / .4}%">${magnet(opposite(d.pole))}</span>`, `lid-piece ${flag(a, 'tested') ? 'auto-shake' : ''}`)}` : `<div class="remote-test-box"><span>통 안쪽 · 철 부품</span><div id="invention-cargo" style="left:${(cargoStart - 16) / .74}%">${objectArt('clip')}</div><b>출구</b></div><div class="remote-control-lane">통 바깥 자석 이동 길 →</div>${draggable('test-handle', '바깥 자석 손잡이', handle, magnet(opposite(d.pole)))}`, `${passed && !flag(a, 'reason') ? btn('reason', reason, 'primary') : ''}${btn('revise', '배치 고치기')}${passed ? btn('extra', '더 해 보기 · 추가 흔들기 / 운반') : ''}`), bind(c) {
    let cargo = cargoStart, controller = { ...handle }, raf = 0, last = performance.now();
    let path: Point[] = [{ ...handle }], lastSample = 0;
    const succeed = () => {
      const initial = [{ id: 'magnet', x: box ? m.x : handle.x, y: box ? m.y - 26 : 76, pole: d.pole }, { id: 'iron', x: box ? tp.x : cargoStart, y: 47 }];
      addTrial(a, { key: extra ? 'extra-use' : 'use', activity: 10, conditions: { label: box ? '덮개를 닫고 일정하게 흔들기' : '판 너머 부품 운반', gap: d.gap, aligned: d.aligned, pair: d.pair }, initialObjects: initial, objects: box ? [{ id: 'magnet', ...m, pole: d.pole }, { id: 'iron', ...tp }] : [{ id: 'magnet', ...controller }, { id: 'iron', x: cargo, y: 47 }], input: path, outcome: 'success', designRevision: d.revision, template: d.template, pinned: true });
      a.values.extraRequested = false; a.values.trial0 = true; a.values.passed = true; record(a, { key: 'use', label: '내 장치 사용', result: box ? '같은 흔들기에도 자석이 철판/상대 자석을 당겨 덮개를 붙잡았어.' : '판 바깥에서 자석을 움직여 안쪽 철 부품을 꺼냈어.' }); delete a.values.say; update(c);
    };
    const dragCleanup = bindDrag(c, 'test-handle', handle, p => {
      a.points['test-handle'] = p; a.values.cargo = cargo; a.values.tested = true;
      if (!valid.ready) {
        addTrial(a, { key: `failure-${d.revision}`, activity: 10, conditions: { label: '내 장치 시험', gap: d.gap }, initialObjects: [{ id: 'magnet', ...m }, { id: 'iron', ...tp }], objects: [{ id: 'magnet', ...m }, { id: 'iron', ...tp }], input: [], outcome: 'failure', template: d.template, designRevision: d.revision });
        return message(c, '아직 잘 작동하지 않아. 배치를 살펴보거나 도움을 눌러 봐.');
      }
      if (box ? p.y >= 43 : (extra ? cargo <= 30 : cargo >= 73) && Math.abs(p.y - 76) <= 10) succeed();
      else { c.touch(); live(c, box ? '덮개를 몸체까지 내려 봐.' : '노란 길에서 자석과 부품을 가까이 유지해 줘.'); }
    }, p => { controller = p; if (!box) a.points['test-handle'] = p; });
    const tick = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      if (now - lastSample > 80 && !document.hidden && !document.querySelector('.modal-backdrop')) { path.push({ ...controller }); lastSample = now; if (path.length > 480) path = path.filter((_, i) => i % 2 === 0); }
      if (!box && valid.ready && (!passed || extra) && !document.hidden && !document.querySelector('.modal-backdrop') && Math.abs(controller.y - 76) < 10 && Math.abs(controller.x - cargo) < 19) {
        cargo += (controller.x - cargo) * (1 - Math.exp(-dt / 65)); a.values.cargo = cargo;
        const el = c.root.querySelector<HTMLElement>('#invention-cargo'); if (el) el.style.left = `${(cargo - 16) / .74}%`;
        if (extra ? cargo <= 30 : cargo >= 73) { succeed(); return; }
      }
      raf = requestAnimationFrame(tick);
    }; if (!box) raf = requestAnimationFrame(tick);
    on(c, 'reason', () => { observe(a, 'reason', '내 설계의 원리', reason, [{ id: 'magnet', ...m }, { id: 'iron', ...tp }]); delete a.values.say; update(c); });
    on(c, 'revise', () => c.root.dispatchEvent(new CustomEvent('revise', { bubbles: true })));
    on(c, 'extra', () => { a.values.extraRequested = true; a.values.cargo = 78; a.points['test-handle'] = { x: 78, y: 76 }; delete a.values.say; update(c); });
    return () => { dragCleanup(); cancelAnimationFrame(raf); };
  } };
}
export function compassView(a: Activity): View {
  const mp = pt(a, 'compass-magnet', 28, 48), p = (a.values.compassPole || 'N') as Pole;
  const angle = (q: Point) => Math.atan2(q.y - 47, q.x - 67) * 180 / Math.PI + (p === 'N' ? 0 : 180);
  return { html: surface(a, '더 해 보기 · 나침반 바늘은 어디로 향할까?', '자석을 움직이거나 뒤집어 바늘의 방향을 관찰해 봐. 가까운 자석의 영향을 보는 단순 모형이야.', `${draggable('compass-magnet', '나침반 관찰 자석', mp, magnet(p))}<div class="compass"><b>N</b><div class="compass-needle" style="transform:rotate(${angle(mp)}deg)"></div></div>`, `${btn('flip', '자석 뒤집기')}${btn('back-poles', '극 탐구로 돌아가기')}`), bind(c) {
    const all = bindDrag(c, 'compass-magnet', mp, q => { a.points['compass-magnet'] = q; c.touch(); }, q => { a.points['compass-magnet'] = q; c.root.querySelector<HTMLElement>('.compass-needle')!.style.transform = `rotate(${angle(q)}deg)`; });
    on(c, 'flip', () => { a.values.compassPole = opposite(p); update(c); }); on(c, 'back-poles', () => { a.values.compassOpen = false; delete a.values.say; update(c); }); return all;
  } };
}
