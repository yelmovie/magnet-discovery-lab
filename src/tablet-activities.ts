import { flag, value, record, opposite, ringGaps, designResult, defaultDesign, type Activity, type Point, type Pole, type Save } from './domain';
import { icon, magnet, mascot } from './art';
import { btn, on, update, type Context, type View } from './activity-types';
import { bindDrag, draggable, placementControls } from './manipulation';
import { addTrial, currentInventionTrial, uprightMagnet, type TrialObject } from './trial-records';

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
function throughPanelMagnet(top:Pole) { return uprightMagnet(top,opposite(top)); }

function inventionPartner(pair:Save['design']['pair']) {
  return pair==='iron'
    ? {label:'철판',art:'<span class="iron-piece">철판</span>',object:{id:'iron'}}
    : {label:'자석',art:magnet('N'),object:{id:'target-magnet',pole:'N' as const}};
}

export function inventionView(a: Activity, s: Save): View {
  const d = s.design, box = d.template === 'box', m = pt(a, 'invent-magnet', 19, 78), target = box ? { x: 64, y: 47 } : pt(a, 'invent-target', 77, 78);
  const partner=inventionPartner(d.pair);
  a.values.base = true; if (box) a.values.target = true;
  return { html: surface(a, box ? '자꾸 열리는 우편함을 고쳐 줄까?' : '통 속 부품을 꺼낼 도구를 만들까?', !flag(a, 'magnet') ? '준비된 몸체에 자석을 놓아 봐.' : '내 배치로 시험해 보자. 처음부터 잘 작동하지 않아도 괜찮아.', `<div class="invention-anchor"><span>${box ? '덮개 안쪽 · 자석을 놓아 줘' : '얇은 투명 칸'}</span></div>${draggable('invent-magnet', '발명품 자석', m, magnet(opposite(d.pole)))}${box ? `<div class="fixed-design-target" style="left:${target.x}%;top:${target.y}%">${partner.art}<small>몸체에 고정</small></div>` : draggable('invent-target', `통 안쪽 ${partner.label}`, target, partner.art)}`, `${btn('template', box ? '다른 의뢰 · 통 속 부품' : '다른 의뢰 · 우편함')}${flag(a, 'magnet') ? `${btn('pair', `상대 부품 · ${partner.label}`)}${btn('flip', '자석 뒤집기')}` : ''}`), bind(c) {
    const revise = () => {
      const mp = pt(a, 'invent-magnet', 19, 78), tp = box ? target : pt(a, 'invent-target', 77, 78);
      d.aligned = flag(a, 'magnet') && flag(a, 'target') && mp.x < tp.x && Math.abs(mp.y - tp.y) < 12;
      d.gap = Math.max(10, Math.min(90, (tp.x - mp.x - 10) * 2)); d.revision++; s.designs[d.template] = structuredClone(d);
      record(a, { key: 'layout', label: '내 부품 배치', result: `${box ? '우편함' : '원격 도구'} · ${d.aligned ? '마주 봄' : '서로 어긋남'} · ${d.gap <= 36 ? '가까운 배치' : '먼 배치'}` });
      addTrial(a, { key: `layout-${d.revision}`, activity: 9, conditions: { label: '내 설계', pair: d.pair, gap: d.gap, aligned: d.aligned }, initialObjects: [{ id: 'magnet', ...m }, { ...partner.object, ...target }], objects: [{ id: 'magnet', ...mp, pole: opposite(d.pole) }, { ...partner.object, ...tp }], input: [], outcome: '부품을 놓았어', template: d.template, designRevision: d.revision });
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
  const partner=inventionPartner(d.pair);
  const controllerPart=box?{id:'magnet',pole:opposite(d.pole)}:{id:'magnet',topPole:d.pole,bottomPole:opposite(d.pole)};
  const cargoPart=box||d.pair==='iron'?partner.object:{id:'target-magnet',topPole:'S' as const,bottomPole:'N' as const};
  const reason = box ? `자석이 몸체의 ${partner.label}을 당겨 덮개를 붙잡았어` : `바깥 자석으로 판 너머의 ${partner.label}을 움직였어`;
  return { html: surface(a, '내 장치가 잘 작동할까?', extra ? '더 해 보기야. 같은 장치를 한 번 더 사용해 봐.' : passed ? flag(a, 'reason') ? '내 장치가 해결한 불편을 이야기해 보자.' : '무엇이 내 장치를 움직이게 했는지 골라 봐.' : box ? '덮개를 닫아 봐. 같은 흔들기는 내가 해 줄게.' : '바깥 자석을 천천히 움직여 부품을 오른쪽 출구로 보내 봐.', box ? `<div class="device-prop ${passed ? 'repaired' : ''}"></div><div class="fixed-design-target" style="left:64%;top:47%">${d.pair === 'iron' ? '철판' : 'N극'} ${icon('lock', 18)}</div>${draggable('test-handle', '우편함 덮개', handle, `<b>덮개 손잡이</b><span class="attached-test-magnet" style="left:${(m.x - 28) / .4}%">${magnet(opposite(d.pole))}</span>`, `lid-piece ${flag(a, 'tested') ? 'auto-shake' : ''}`)}` : `<div class="remote-test-box"><span>통 안쪽 · ${partner.label}</span><div id="invention-cargo" style="left:${(cargoStart - 16) / .74}%">${d.pair==='iron'?partner.art:throughPanelMagnet('S')}</div><b>출구</b></div><div class="remote-control-lane">통 바깥 자석 이동 길 →</div>${draggable('test-handle', '바깥 자석 손잡이', handle, throughPanelMagnet(d.pole))}`, `${passed && !flag(a, 'reason') ? btn('reason', reason, 'primary') : ''}${btn('revise', '배치 고치기')}${passed ? btn('extra', '더 해 보기 · 추가 흔들기 / 운반') : ''}`), bind(c) {
    let cargo = cargoStart, controller = { ...handle }, raf = 0, last = performance.now();
    let path: Point[] = [{ ...handle }], lastSample = 0;
    const succeed = () => {
      const initial = [{ ...controllerPart, x: box ? m.x : handle.x, y: box ? m.y - 26 : 76 }, { ...cargoPart, x: box ? tp.x : cargoStart, y: 47 }];
      addTrial(a, { key: extra ? 'extra-use' : 'use', activity: 10, conditions: { label: box ? '덮개를 닫고 일정하게 흔들기' : '판 너머 부품 운반', gap: d.gap, aligned: d.aligned, pair: d.pair }, initialObjects: initial, objects: box ? [{ ...controllerPart, ...m }, { ...cargoPart, ...tp }] : [{ ...controllerPart, ...controller }, { ...cargoPart, x: cargo, y: 47 }], input: path, outcome: 'success', designRevision: d.revision, template: d.template, pinned: true });
      a.values.extraRequested = false; a.values.trial0 = true; a.values.passed = true; record(a, { key: 'use', label: '내 장치 사용', result: box ? `같은 흔들기에도 자석이 몸체의 ${partner.label}을 당겨 덮개를 붙잡았어.` : `바깥 자석을 움직여 판 안쪽의 ${partner.label}을 옮겼어.` }); delete a.values.say; update(c);
    };
    const dragCleanup = bindDrag(c, 'test-handle', handle, p => {
      a.points['test-handle'] = p; a.values.cargo = cargo; a.values.tested = true;
      if (!valid.ready) {
        addTrial(a, { key: `failure-${d.revision}`, activity: 10, conditions: { label: '내 장치 시험', gap: d.gap }, initialObjects: [{ ...controllerPart, ...m }, { ...cargoPart, ...tp }], objects: [{ ...controllerPart, ...m }, { ...cargoPart, ...tp }], input: [], outcome: 'failure', template: d.template, designRevision: d.revision });
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
    on(c, 'reason', () => { observe(a, 'reason', '내 설계의 원리', reason, [{ ...controllerPart, ...m }, { ...cargoPart, ...tp }]); delete a.values.say; update(c); });
    on(c, 'revise', () => c.root.dispatchEvent(new CustomEvent('revise', { bubbles: true })));
    on(c, 'extra', () => { a.values.extraRequested = true; a.values.cargo = 78; a.points['test-handle'] = { x: 78, y: 76 }; delete a.values.say; update(c); });
    return () => { dragCleanup(); cancelAnimationFrame(raf); };
  } };
}
