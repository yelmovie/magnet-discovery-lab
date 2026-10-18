import { flag, record, type Activity, type Point } from './domain';
import { magnet, objectArt } from './art';
import { btn, on, update, type View } from './activity-types';
import { bindDrag, draggable, near, placementControls } from './manipulation';
import { addTrial, paperComparison, trialPicture } from './trial-records';

export function distanceView(a: Activity): View {
  const paperStep = a.values.distanceStep === 'paper', compared = paperComparison(a);
  const mp = paperStep ? a.points.nearStart || { x: 49, y: 48 } : a.points['distance-magnet'] || { x: 15, y: 48 };
  const paper = flag(a, 'paper-in'), initialClip = { id: 'clip', x: 73, y: 48 };
  const pulled = paperStep ? paper : flag(a, 'near-clear') && mp.x > 35;
  return { html: `<div class="play-board distance-board"><div class="measurement-line"></div>${paperStep ? `<div class="fixed-magnet" style="left:${mp.x}%;top:${mp.y}%">${magnet()}<span>자석은 여기 그대로 🔒</span></div>` : draggable('distance-magnet', '실험 자석', mp, magnet())}<div class="test-clip" style="left:${pulled ? mp.x + 12 : 73}%;top:38%">${objectArt('clip')}<b>철 클립</b></div>${paperStep && !paper ? draggable('paper', '얇은 종이 한 장', { x: 20, y: 78 }, '<span>종이</span>', 'paper-piece') : ''}${paper ? `<div class="paper-piece fixed-paper" style="left:${mp.x + 10}%;top:48%">종이</div>` : ''}${compared ? `<div class="distance-comparison">${a.trials!.filter(t => ['near-clear', 'near-paper'].includes(t.key)).map(trialPicture).join('')}</div>` : ''}</div><div class="action-dock">${!paperStep && flag(a, 'near-clear') && flag(a, 'far-clear') ? btn('paper-step', '종이도 넣어 볼까?', 'primary') : ''}${paperStep && !paper ? btn('insert-paper', '종이 넣기', 'primary') : ''}${paperStep ? btn('explore', '다시 해 보기') : ''}</div><div class="buddy-dialogue" role="status"><p data-live>${compared ? '같은 거리에서 종이만 넣었어. 두 그림을 보며 움직임을 비교해 봐.' : paperStep ? '종이를 자석과 클립 사이에 넣어 봐.' : flag(a, 'near-clear') ? '자석을 멀리도 움직여 비교해 봐.' : '자석을 클립 쪽으로 움직여 봐.'}</p></div>${placementControls}`, bind(c) {
    let path: Point[] = [];
    const observe = (p: Point) => {
      a.points['distance-magnet'] = { ...p }; path.push({ ...p }); if (path.length > 240) path = path.filter((_, i) => i % 2 === 0);
      const gap = 73 - p.x, aligned = Math.abs(p.y - 48) < 13;
      const key = gap > 42 ? 'far-clear' : gap > 10 && gap < 30 && aligned ? 'near-clear' : '';
      const clip = c.root.querySelector<HTMLElement>('.test-clip')!, attracted = aligned && gap > 0 && gap < 33;
      clip.style.left = `${attracted ? Math.min(73, p.x + 12) : 73}%`;
      if (!key || a.trials?.some(t => t.key === key)) return;
      a.values[key] = true;
      const initial = [{ id: 'magnet', ...p }, initialClip];
      if (key === 'near-clear') a.points.nearStart = { ...p };
      addTrial(a, { key, activity: 4, conditions: { paper: false, material: 'iron', label: key === 'far-clear' ? '멀리 · 종이 없음' : '가까이 · 종이 없음' }, initialObjects: initial, objects: [{ id: 'magnet', ...p }, { ...initialClip, x: attracted ? p.x + 12 : 73 }], input: path, outcome: attracted ? 'attract' : 'none', pinned: true });
      record(a, { key, label: key === 'far-clear' ? '멀리에서' : '가까이에서', result: attracted ? '닿기 전에 클립이 자석 쪽으로 움직였어.' : '클립이 움직이지 않았어.' });
      c.meta(); c.touch();
      const live = c.root.querySelector('[data-live]'); if (live) live.textContent = attracted ? '닿지 않았는데 클립이 움직였어! 자석을 놓고 다음 비교를 해 보자.' : '멀리에서는 움직이지 않았어. 가까이 가져가 볼까?';
    };
    const insert = () => {
      const baseline = a.trials?.find(t => t.key === 'near-clear'); if (!baseline) return;
      a.values['paper-in'] = true; a.values['near-paper'] = true; a.values.compare = true;
      addTrial(a, { key: 'near-paper', activity: 4, conditions: { paper: true, material: 'iron', label: '같은 거리 · 종이 한 장' }, initialObjects: baseline.initialObjects, objects: [...baseline.objects, { id: 'paper', x: mp.x + 10, y: 48 }], input: [], outcome: 'attract', pinned: true });
      record(a, { key: 'near-paper', label: '같은 거리 · 종이 있음', result: '얇은 종이 한 장을 사이에 넣어도 클립이 움직였어.' }); update(c);
    };
    const clean = !paperStep ? bindDrag(c, 'distance-magnet', mp, p => { observe(p); update(c); }, observe) : bindDrag(c, 'paper', { x: 20, y: 78 }, p => { if (near(p, { x: mp.x + 10, y: 48 }, 18)) insert(); else c.notify('두 물체 사이에 종이를 놓아 줘.'); });
    on(c, 'paper-step', () => { a.values.distanceStep = 'paper'; delete a.values['paper-in']; update(c); });
    on(c, 'insert-paper', insert);
    on(c, 'explore', () => { a.values.distanceStep = 'free'; a.points['distance-magnet'] = { x: 15, y: 48 }; update(c); });
    if (!paperStep) observe(mp);
    return clean;
  } };
}
