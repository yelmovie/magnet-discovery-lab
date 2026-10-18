import { flag, opposite, record, relation, value, type Activity, type Point, type Pole } from './domain';
import { magnet } from './art';
import { btn, on, update, type View } from './activity-types';
import { bindDrag, clamp, draggable, placementControls } from './manipulation';
import { addTrial } from './trial-records';

export function deliveryView(a: Activity): View {
  const r = value(a, 'round', 0), pole = (a.values.pole || 'N') as Pole, start = r === 2 ? 76 : 24, target = r === 0 ? 53 : r === 1 ? 77 : 27;
  const car = value(a, 'car', start), mp = a.points.driver || { x: r === 1 ? 12 : r === 2 ? 60 : 41, y: 55 }, completed = flag(a, `segment${r}`);
  a.values.question = '수레를 노란 곳까지 보내 볼까?';
  const instruction = completed ? '배송했어! 다음 의뢰로 가 볼까?' : r === 0 ? '수레 오른쪽에서 당겨 봐. 노란 곳에서 자석을 위로 떼어 줘.' : r === 1 ? '수레 왼쪽에서 밀어 봐. 노란 곳에서 자석을 위로 떼어 줘.' : '이번에는 왼쪽으로 배송해 줘. 네 방법으로 해 봐.';
  return { html: `<div class="play-board"><div class="delivery-rail"></div><div class="station station-a">출발역</div><div class="station station-b">중간역</div><div class="station station-c">공방</div><div class="parking-zone" style="left:${target}%;width:18%">정차</div><div class="delivery-cart" id="delivery-cart" style="left:${car}%;top:55%"><span class="parcel">철 부품 화물</span>${magnet('S')}<i></i><i></i></div>${draggable('driver', '조작 자석', mp, magnet(pole))}<div class="board-counter">배송 ${r + 1} / 3</div></div><div class="action-dock">${btn('flip', '조작 자석 뒤집기')}${completed && r < 2 ? btn('next', '다음 배송', 'primary') : ''}</div><div class="buddy-dialogue" role="status"><p data-live>${instruction}</p></div>${placementControls}`, bind(c) {
    let x = car, controller = { ...mp }, raf = 0, last = performance.now(), moved = value(a, 'moved', 0), correct = flag(a, 'used-method'), lastSave = 0;
    let path: Point[] = [{ ...mp }], lastSample = 0;
    const tick = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      if (!completed && !document.hidden && !document.querySelector('.modal-backdrop')) {
        if (now - lastSample > 80) { path.push({ ...controller }); lastSample = now; if (path.length > 480) path = path.filter((_, i) => i % 2 === 0); }
        const right = controller.x > x, facing = right ? pole : opposite(pole), cartFacing = right ? 'N' : 'S', force = relation(facing, cartFacing), gap = Math.abs(controller.x - x);
        if (Math.abs(controller.y - 55) < 13 && gap > 9 && gap < 30) {
          const direction = (right ? 1 : -1) * (force === 'attract' ? 1 : -1), amount = dt * .026 * (1 - Math.max(0, gap - 15) / 25);
          const next = clamp(x + direction * amount, 14, 86); moved += Math.abs(next - x); x = next;
          correct ||= r === 0 ? right && force === 'attract' : r === 1 ? !right && force === 'repel' : direction < 0;
          a.values.car = x; a.values.moved = moved; a.values['used-method'] = correct;
          c.root.querySelector<HTMLElement>('#delivery-cart')!.style.left = `${x}%`;
          c.root.querySelector('[data-live]')!.textContent = `${force === 'attract' ? '끌어당겨' : '밀어내어'} ${direction > 0 ? '오른쪽' : '왼쪽'}으로 움직여. 노란 곳에서 자석을 위로 떼어 줘.`;
        }
        if (now - lastSave > 1500 && moved > 0) { c.touch(); lastSave = now; }
      }
      raf = requestAnimationFrame(tick);
    };
    const dragCleanup = bindDrag(c, 'driver', mp, p => {
      a.points.driver = p;
      if (!completed && Math.abs(x - target) < 10 && Math.abs(p.y - 55) > 15 && correct && moved > 6) {
        a.values[`segment${r}`] = true;
        record(a, { key: `segment${r}`, label: `배송 ${r + 1}`, result: `${r === 0 ? '다른 극으로 당기기' : r === 1 ? '같은 극으로 밀기' : '내 방법으로 반대 방향 운반'} · 자석을 떼어 정차했어.` });
        addTrial(a, { key: `segment${r}`, activity: 8, conditions: { label: `배송 ${r + 1}`, pole, method: r === 0 ? 'pull' : r === 1 ? 'push' : 'return' }, initialObjects: [{ id: 'cart-magnet', x: car, y: 55, pole: 'S' }, { id: 'magnet', ...mp, pole }], objects: [{ id: 'cart-magnet', x, y: 55, pole: 'S' }, { id: 'magnet', ...p, pole }], input: path, outcome: '정차했어', pinned: true });
        update(c);
      } else c.touch();
    }, p => { controller = p; a.points.driver = { ...p }; });
    on(c, 'flip', () => { a.values.pole = opposite(pole); update(c); });
    on(c, 'next', () => { a.values.round = r + 1; a.values.car = r === 0 ? 24 : 76; a.values.moved = 0; a.values['used-method'] = false; a.values.pole = 'N'; a.points.driver = { x: r === 0 ? 12 : 60, y: 55 }; update(c); });
    raf = requestAnimationFrame(tick); return () => { cancelAnimationFrame(raf); dragCleanup(); };
  } };
}
