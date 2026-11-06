import { addTrial } from './trial-records';
import { cartDirection, cleanPercent, defaultDesign, designResult, dirtyCell, flag, grid, opposite, record, response, sweep, value, type Activity, type Point, type Pole, type Save } from './domain';
import { icon, magnet, objectArt } from './art';
import { btn, choice, hint, on, range, readout, update, type View, type Context } from './activity-types';

const directions = `<div class="direction-controls" aria-label="방향 조작"><button data-direction="0,-1" aria-label="위로">↑</button><button data-direction="-1,0" aria-label="왼쪽으로">←</button><button data-direction="0,1" aria-label="아래로">↓</button><button data-direction="1,0" aria-label="오른쪽으로">→</button></div>`;

export function workshopView(screen: number, a: Activity, s: Save): View {
  if (screen === 7) return { html: `<div class="aqua-status"><span class="tag">수조 안쪽 패드 ↔ 바깥 자석</span><strong id="clean-count">${cleanPercent(a.mask) >= 85 ? '깨끗해졌어!' : '남은 얼룩을 닦아 보자'}</strong></div><div class="aqua-canvas-wrap"><canvas id="aqua-canvas" width="840" height="360" tabindex="0" aria-label="수조 청소 실험. 바깥 자석을 드래그하거나 방향 버튼으로 움직여 청소해."></canvas><span class="water-label">수조 안쪽</span></div><div class="aqua-section"><b>밖 · 자석</b><i aria-label="유리"></i><b>안 · 청소 패드</b></div><div class="controls">${directions}${btn('reconnect', `${icon('reset')} 패드 가까이 가져가기`)}</div><div id="coupling" class="readout" role="status">${icon('light')} 바깥 자석을 천천히 움직여봐. 너무 멀어지면 패드를 놓칠 수 있어.</div>`, bind: bindAqua };
  if (screen === 8) {
    const seg = value(a, 'segment', 0), side = String(a.values.side || (seg === 1 ? 'back' : 'front')) as 'front' | 'back', pole = (a.values.pole || 'N') as Pole, gap = value(a, 'gap', 30);
    return { html: `<div class="experiment-tabs">${[0, 1, 2].map(i => `<span class="step-pill ${i === seg ? 'current' : ''} ${flag(a, `segment${i}`) ? 'done' : ''}">${flag(a, `segment${i}`) ? icon('check', 15) : `0${i + 1}`} ${['앞에서 끌기', '뒤에서 밀기', '내 방법으로 운반'][i]}</span>`).join('')}</div><div class="cart-track"><div class="track-buildings"><i></i><i></i><i></i><span>MAGNET LOGISTICS</span></div><div class="rail"></div><span class="start-sign">출발</span><span class="goal-sign">도착<br>⚑</span><div class="cart-unit" id="cart-unit" style="left:${10 + value(a, 'cart', 0) * .7}%"><div class="cargo-box">철 부품</div><div class="cart-body">${magnet('S')}</div><i></i><i></i></div><div class="control-magnet" id="control-magnet" tabindex="0" aria-label="조작 자석. 거리 슬라이더와 극 뒤집기 버튼으로 조절할 수 있어.">${magnet(pole === 'N' ? (side === 'front' ? 'N' : 'S') : (side === 'front' ? 'S' : 'N'))}<small>조작 자석</small></div></div><div class="controls">${seg === 2 ? `${choice('front', '카트 앞에서', side === 'front')}${choice('back', '카트 뒤에서', side === 'back')}` : `<span class="control-label">${side === 'front' ? '카트 앞쪽에서 조작' : '카트 뒤쪽에서 조작'}</span>`}${btn('flip', `마주 보는 극 ${pole} · 뒤집기`)}${btn('move', `${icon('play')} 자석으로 움직이기`, 'primary')}${btn('stop', '멈추기')}</div><div class="slider-row"><span>가까이</span><input id="cart-gap" aria-label="조작 자석과 카트 사이 거리" type="range" min="20" max="90" value="${gap}"/><span>멀리</span></div><div id="cart-feedback" class="readout" role="status">${icon('light')} ${side === 'front' ? '카트의 앞쪽은 N극이야. 서로 당기려면?' : '카트의 뒤쪽은 S극이야. 같은 극을 마주 대면?'}</div><div class="controls">${btn('reset-cart', '출발 위치로')}${seg < 2 ? btn('next-segment', '다음 구간으로 →', flag(a, `segment${seg}`) ? 'primary' : 'disabled') : ''}</div>`, bind: bindCart };
  }
  if (screen === 9) {
    const d = s.design, box = d.template === 'box';
    return { html: `<div class="experiment-tabs">${choice('box', '01 · 덮개가 잘 닫히는 보관함', box)}${choice('remote', '02 · 손대지 않는 부품 운반 도구', !box)}</div><div class="invention-board ${box ? 'box-design' : 'remote-design'}"><span class="blueprint-caption">MY INVENTION / DESIGN ${String(d.revision + 1).padStart(2, '0')}</span><div class="invention-base ${flag(a, 'base') ? 'placed' : ''}">${box ? '<span>보관함 몸체 + 덮개</span><div class="lid-outline"></div>' : '<span>얇은 투명 칸</span><div class="glass-outline"></div>'}</div><div class="design-target ${flag(a, 'target') ? 'placed' : ''}" style="left:${d.aligned ? '58' : '70'}%;top:${d.aligned ? '48' : '30'}%">${box && d.pair === 'magnet' ? magnet('N') : '<div class="iron-piece">철제 부품</div>'}</div><button class="design-magnet ${flag(a, 'magnet') ? 'placed' : ''}" id="design-magnet" style="left:${45 - d.gap * .2}%;top:${d.aligned ? '48' : '68'}%" aria-label="자석 부품. 드래그하거나 배치 버튼으로 위치를 조절해.">${magnet(d.pole === 'N' ? 'S' : 'N')}</button><div class="snap-target" aria-hidden="true">자석 배치 구역</div></div><div class="parts-tray">${choice('add-base', box ? '몸체 놓기' : '투명 칸 놓기', flag(a, 'base'))}${choice('add-magnet', '자석 놓기', flag(a, 'magnet'))}${choice('add-target', box ? '잠금 부품 놓기' : '철제 부품 놓기', flag(a, 'target'))}</div><div class="controls">${btn('align', d.aligned ? '배치 바꾸기' : '마주 보는 위치에 배치')}${box ? choice('pair', d.pair === 'iron' ? '상대 부품: 철판' : '상대 부품: 자석', d.pair === 'magnet') : ''}${btn('flip-design', `자석 극 ${d.pole} · 뒤집기`)}${btn('undo', `${icon('reset')} 되돌리기`, typeof a.values.undo === 'string' ? '' : 'disabled')}</div><div class="slider-row"><span>가까이</span><input id="design-gap" aria-label="발명 장치의 자석 거리" type="range" min="20" max="80" value="${d.gap}"/><span>멀리</span></div>${hint('부품을 놓았으면 시험실에서 작동을 확인해봐. 실패해도 이 배치로 돌아와 고칠 수 있어.')}`, bind(c) {
      const change = (fn: () => void) => { a.values.undo = JSON.stringify({ design: s.design, values: { base: flag(a, 'base'), magnet: flag(a, 'magnet'), target: flag(a, 'target') } }); fn(); s.design.revision++; s.designs[s.design.template] = structuredClone(s.design); update(c); };
      (['box', 'remote'] as const).forEach(t => on(c, t, () => { if (s.design.template === t) return; const previous = s.design.template; s.designs[previous] = structuredClone(s.design); for (const part of ['base', 'magnet', 'target']) a.values[`${previous}-${part}`] = flag(a, part); s.design = structuredClone(s.designs[t] || defaultDesign(t)); for (const part of ['base', 'magnet', 'target']) a.values[part] = flag(a, `${t}-${part}`); delete a.values.undo; update(c); }));
      ['base', 'magnet', 'target'].forEach(k => on(c, `add-${k}`, () => change(() => { a.values[k] = true; })));
      on(c, 'align', () => change(() => { s.design.aligned = !s.design.aligned; })); on(c, 'pair', () => change(() => { s.design.pair = s.design.pair === 'iron' ? 'magnet' : 'iron'; }));
      on(c, 'flip-design', () => change(() => { s.design.pole = opposite(s.design.pole); })); range(c, 'design-gap', n => change(() => { s.design.gap = n; }));
      on(c, 'undo', () => { if (typeof a.values.undo !== 'string') return; const previous = JSON.parse(a.values.undo); const revision = s.design.revision + 1; s.design = { ...previous.design, revision }; Object.assign(a.values, previous.values); delete a.values.undo; update(c); });
      const el = c.root.querySelector<HTMLElement>('#design-magnet')!;
      let dragging = false;
      el.addEventListener('pointerdown', e => { if (!flag(a, 'magnet')) return; dragging = true; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', e => { if (!dragging) return; const rect = el.parentElement!.getBoundingClientRect(); el.style.left = `${Math.max(8, Math.min(50, (e.clientX - rect.left) / rect.width * 100))}%`; el.style.top = `${Math.max(24, Math.min(72, (e.clientY - rect.top) / rect.height * 100))}%`; });
      el.addEventListener('pointerup', e => { if (!dragging) return; dragging = false; const rect = el.parentElement!.getBoundingClientRect(), px = (e.clientX - rect.left) / rect.width * 100, py = (e.clientY - rect.top) / rect.height * 100; change(() => { s.design.aligned = py > 30 && py < 63; s.design.gap = Math.max(20, Math.min(80, (45 - px) * 5)); }); });
      el.addEventListener('pointercancel', () => { dragging = false; c.refresh(); });
    } };
  }
  const d = s.design, valid = designResult(d), tested = flag(a, 'tested') && a.values.template === d.template && value(a, 'revision', -1) === d.revision, passed = flag(a, 'passed') && tested;
  return { html: `<div class="experiment-tabs"><span class="tag">${d.template === 'box' ? '덮개가 잘 닫히는 보관함' : '손대지 않는 부품 운반 도구'}</span><span class="draft-number">설계 #${d.revision + 1}</span></div><div class="test-stage ${passed ? 'success' : ''}"><div class="test-device ${d.template === 'remote' ? 'remote-test' : ''}">${d.template === 'box' ? `<div class="test-lid ${tested && !passed ? 'ajar' : ''}">나의 자석 보관함</div><div class="test-box"><span>MY INVENTION</span><div class="test-connection">${magnet(d.pole === 'N' ? 'S' : 'N')}${d.pair === 'iron' ? '<div class="iron-piece">철판</div>' : magnet('N')}</div></div>` : `<div class="remote-chamber"><span>칸 안쪽 · 철제 부품</span><div id="remote-target" style="left:${value(a, 'remote-position', 10)}%">${objectArt('clip')}</div><span class="remote-goal">목표</span></div><div class="remote-controller">${magnet()}</div>`}</div>${passed ? `<div class="tested-badge">${icon('check', 24)} 작동 확인!</div>` : ''}</div><div class="controls">${btn('test-design', `${icon('play')} ${d.template === 'box' ? '닫고 살짝 흔들어 보기' : '장치 시험 시작'}`, 'primary')}${btn('revise', `${icon('back')} 설계 수정하기`)}</div>${d.template === 'remote' && tested && valid.ready ? `<div class="slider-row"><span>출발</span><input id="remote-control" aria-label="칸 바깥 자석 위치" type="range" min="10" max="85" value="${value(a, 'remote-position', 10)}"/><span>목표</span></div>` : ''}${readout(tested ? passed ? '내 장치가 문제를 해결했어! 어떤 힘을 이용했을까?' : valid.reason : '내 부품 배치와 극 방향으로 시험해보자.', passed)}${passed ? `<div class="question-strip"><strong>장치가 작동한 이유를 골라봐.</strong><div class="controls">${choice('reason', d.template === 'box' ? '자석이 상대 부품을 끌어당겼어' : '판 너머의 철에도 힘이 작용했어', flag(a, 'reason'))}${choice('wrong', '물체가 저절로 움직였어', false)}</div></div>` : ''}`, bind(c) {
    on(c, 'test-design', () => { a.values.tested = true; a.values.template = d.template; a.values.revision = d.revision; a.values.passed = valid.ready && d.template === 'box'; a.values.reason = false; a.values['remote-position'] = 10; record(a, { key: `${d.template}-test${d.revision}`, label: `${d.template === 'box' ? '보관함' : '원격 도구'} 설계 #${d.revision + 1}`, result: valid.reason }); update(c); });
    on(c, 'revise', () => { s.resume = 9; c.root.dispatchEvent(new CustomEvent('revise', { bubbles: true })); });
    range(c, 'remote-control', n => { a.values['remote-position'] = n; if (n >= 80 && valid.ready) { a.values.passed = true; record(a, { key: `${d.template}-test${d.revision}`, label: '원격 도구 가동 시험', result: '외부 자석을 움직여 철제 부품을 목표까지 운반했어.' }); } update(c); });
    on(c, 'reason', () => { a.values.reason = true; record(a, { key: 'reason', label: '성공 이유', result: d.template === 'box' ? '자석이 마주 보는 부품을 끌어당겨 고정했다.' : '얇은 판을 사이에 두어도 철에 힘이 작용했다.' }); update(c); });
    on(c, 'wrong', () => c.notify('자석을 움직이거나 배치를 바꿨을 때 무엇이 달라졌지?'));
  } };
}

function bindAqua(c: Context): () => void {
  const a = c.a, canvas = c.root.querySelector<HTMLCanvasElement>('#aqua-canvas')!, ctx = canvas.getContext('2d')!;
  let magnetPoint = a.points.magnet || { x: 14, y: 50 }, pad = a.points.pad || { ...magnetPoint };
  let paused = false, activePointer = -1;
  let attached = a.values.attached !== false, active = false, dirty = true, raf = 0, last = 0, lastSave = 0, held = { x: 0, y: 0 };
  const count = c.root.querySelector('#clean-count')!, status = c.root.querySelector('#coupling')!;
  function move(p: Point) {
    magnetPoint = { x: Math.max(5, Math.min(95, p.x)), y: Math.max(8, Math.min(92, p.y)) };
    a.points.magnet = { ...magnetPoint }; a.points.pad = { ...pad }; a.values.attached = attached;
    const percent = cleanPercent(a.mask); count.textContent = percent >= 85 ? '세 얼룩을 깨끗이 닦았어!' : '남은 얼룩을 찾아 닦아 봐';
    status.innerHTML = `${icon(attached ? 'check' : 'light')} ${attached ? '패드가 자석을 따라오고 있어.' : '패드와 멀어졌어! 자석을 패드 근처로 가져가봐.'}`;
    record(a, { key: 'aqua', label: '수조 청소', result: `${percent}% 청소 · 연결 분리 ${value(a, 'drops', 0)}회`, value: percent });
    dirty = true; c.meta();
  }
  function draw() {
    const w = 840, h = 360; ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#e2f6f1'); grad.addColorStop(1, '#9ed4d2'); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d4d8b9'; ctx.fillRect(0, h - 21, w, 21);
    for (let i = 0; i < 8; i++) { const x = 25 + i * 116; ctx.strokeStyle = '#73a998'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, h - 10); ctx.quadraticCurveTo(x - 20, h - 70, x + 3, h - 110 - (i % 3) * 10); ctx.stroke(); }
    const set = new Set(a.mask); const cw = w / grid.w, ch = (h - 25) / grid.h;
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) if (dirtyCell(x, y) && !set.has(y * grid.w + x)) { ctx.fillStyle = (x + y) % 3 ? 'rgba(91,132,93,.48)' : 'rgba(141,157,85,.5)'; ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1); }
    for (let i = 0; i < 8; i++) { ctx.strokeStyle = '#d8f4ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(50 + i * 102, 35 + i * 41 % 270, 3 + i % 3, 0, Math.PI * 2); ctx.stroke(); }
    const px = pad.x / 100 * w, py = pad.y / 100 * (h - 25), mx = magnetPoint.x / 100 * w, my = magnetPoint.y / 100 * (h - 25);
    ctx.fillStyle = '#eff8e9'; ctx.strokeStyle = '#4f9195'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#77acac'; ctx.fillRect(px - 12, py - 8, 24, 16); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('패드', px - 12, py + 5);
    ctx.globalAlpha = .88; ctx.fillStyle = '#e27460'; ctx.fillRect(mx - 31, my + 23, 31, 21); ctx.fillStyle = '#548ebb'; ctx.fillRect(mx, my + 23, 31, 21); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('N', mx - 20, my + 39); ctx.fillText('S', mx + 12, my + 39);
  }
  const location = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }; };
  canvas.addEventListener('pointerdown', e => { if (!e.isPrimary || e.button !== 0 || active || paused) return; activePointer = e.pointerId; active = true; canvas.setPointerCapture(e.pointerId); move(location(e)); });
  canvas.addEventListener('pointermove', e => { if (active && e.pointerId === activePointer) move(location(e)); });
  const release = () => { active = false; held = { x: 0, y: 0 }; c.touch(); };
  canvas.addEventListener('pointerup', e => { if (e.pointerId === activePointer) release(); }); canvas.addEventListener('pointercancel', e => { if (e.pointerId === activePointer) release(); });
  c.root.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(b => { const [x, y] = b.dataset.direction!.split(',').map(Number); b.addEventListener('pointerdown', e => { held = { x, y }; b.setPointerCapture(e.pointerId); move({ x: magnetPoint.x + x * 2, y: magnetPoint.y + y * 2 }); }); b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('click', e => { if (e.detail === 0) { move({ x: magnetPoint.x + x * 5, y: magnetPoint.y + y * 5 }); c.touch(); } }); });
  canvas.addEventListener('keydown', e => { const map: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } }; if (map[e.key]) { e.preventDefault(); move({ x: magnetPoint.x + map[e.key].x * 4, y: magnetPoint.y + map[e.key].y * 4 }); c.touch(); } });
  on(c, 'reconnect', () => { magnetPoint = { ...pad }; attached = true; move(magnetPoint); c.touch(); });
  const tick = (now: number) => {
    const dt = Math.min(50, now - last || 16); last = now;
    if (!paused && !document.hidden && !document.querySelector('.modal-backdrop')) {
      if (held.x || held.y) move({ x: magnetPoint.x + held.x * dt * .028, y: magnetPoint.y + held.y * dt * .028 });
      const distance = Math.hypot(magnetPoint.x - pad.x, magnetPoint.y - pad.y);
      if (attached && distance > 28) { attached = false; a.values.drops = value(a, 'drops', 0) + 1; }
      if (!attached && distance < 15) attached = true;
      if (attached && distance > .01) {
        const previous = { ...pad }, fraction = 1 - Math.exp(-dt / 70);
        pad = { x: pad.x + (magnetPoint.x - pad.x) * fraction, y: pad.y + (magnetPoint.y - pad.y) * fraction };
        a.mask = sweep(a.mask, previous, pad); move(magnetPoint);
      }
      if (cleanPercent(a.mask) >= 85 && !a.trials?.some(t => t.key === 'aqua')) addTrial(a, { key: 'aqua', activity: 7, conditions: { label: '유리 너머 청소' }, initialObjects: [{ id: 'magnet', x: 14, y: 50 }], objects: [{ id: 'magnet', ...magnetPoint }, { id: 'pad', ...pad }], input: [], outcome: '수조 얼룩을 닦았어', pinned: true });
      if (dirty) { draw(); dirty = false; }
      if ((active || held.x || held.y) && now - lastSave > 1000) { c.touch(); lastSave = now; }
    }
    raf = requestAnimationFrame(tick);
  };
  const pause = (event: Event) => { paused = (event as CustomEvent<boolean>).detail; release(); };
  window.addEventListener('experiment-pause', pause);
  raf = requestAnimationFrame(tick); window.addEventListener('blur', release); window.addEventListener('resize', release); document.addEventListener('visibilitychange', release);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('experiment-pause', pause); window.removeEventListener('blur', release); window.removeEventListener('resize', release); document.removeEventListener('visibilitychange', release); };
}

function bindCart(c: Context): () => void {
  const a = c.a, seg = value(a, 'segment', 0), side = String(a.values.side || (seg === 1 ? 'back' : 'front')) as 'front' | 'back', pole = (a.values.pole || 'N') as Pole;
  let running = false, position = value(a, 'cart', 0), raf = 0, last = 0, lastSave = 0;
  const cart = c.root.querySelector<HTMLElement>('#cart-unit')!, mag = c.root.querySelector<HTMLElement>('#control-magnet')!, feedback = c.root.querySelector<HTMLElement>('#cart-feedback')!;
  const draw = () => { cart.style.left = `${10 + position * .7}%`; const gap = value(a, 'gap', 30); mag.style.left = `${Math.max(2, Math.min(88, 10 + position * .7 + (side === 'front' ? 1 : -1) * (10 + gap * .08)))}%`; };
  draw();
  on(c, 'flip', () => { a.values.pole = opposite(pole); update(c); });
  ['front', 'back'].forEach(p => on(c, p, () => { a.values.side = p; update(c); }));
  range(c, 'cart-gap', n => { a.values.gap = n; c.touch(); draw(); });
  on(c, 'move', () => { running = !flag(a, `segment${seg}`); });
  on(c, 'stop', () => { running = false; c.touch(); });
  on(c, 'reset-cart', () => { a.values.cart = 0; update(c); });
  on(c, 'next-segment', () => { if (!flag(a, `segment${seg}`)) return; a.values.segment = seg + 1; a.values.cart = 0; a.values.side = seg === 0 ? 'back' : 'front'; a.values.pole = 'N'; update(c); });
  let dragging = false;
  mag.addEventListener('pointerdown', e => { dragging = true; mag.setPointerCapture(e.pointerId); running = !flag(a, `segment${seg}`); });
  mag.addEventListener('pointermove', e => { if (!dragging) return; const rect = mag.parentElement!.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * 100, carx = 10 + position * .7; a.values.gap = Math.max(20, Math.min(90, Math.abs(x - carx) * 2.5)); draw(); });
  const release = () => { dragging = false; running = false; c.touch(); }; mag.addEventListener('pointerup', release); mag.addEventListener('pointercancel', release);
  const blur = () => { running = false; dragging = false; }; window.addEventListener('blur', blur); window.addEventListener('resize', blur); document.addEventListener('visibilitychange', blur);
  const tick = (now: number) => {
    const dt = Math.min(50, now - last || 16); last = now;
    if (running && !document.hidden) {
      const band = response(value(a, 'gap', 30)), dir = cartDirection(side, pole), speed = band === 'none' ? 0 : band === 'weak' ? .012 : .026;
      position = Math.max(0, Math.min(100, position + dir * speed * dt)); a.values.cart = position; draw();
      const pulling = side === 'front' ? pole === 'S' : pole === 'N';
      feedback.innerHTML = `${icon('eye')} ${band === 'none' ? '너무 멀어서 카트가 움직이지 않아.' : dir > 0 ? `${pulling ? '끌어당기는' : '밀어내는'} 힘으로 앞으로 움직여!` : '카트가 출발 쪽으로 움직이려 해. 극을 바꿔봐.'}`;
      if (position >= 100) { running = false; a.values[`segment${seg}`] = true; record(a, { key: `segment${seg}`, label: `운반 구간 ${seg + 1}`, result: `${side === 'front' ? '앞' : '뒤'}에서 ${pulling ? '끌기' : '밀기'}로 도착` }); update(c); return; }
      if (now - lastSave > 1000) { c.touch(); lastSave = now; }
    }
    raf = requestAnimationFrame(tick);
  }; raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('blur', blur); window.removeEventListener('resize', blur); document.removeEventListener('visibilitychange', blur); };
}
