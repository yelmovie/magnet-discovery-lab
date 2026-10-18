import { flag, value, materials, record, response, opposite, relation, ringGaps, type Activity, type Pole } from './domain';
import { magnet, objectArt, icon } from './art';
import { btn, choice, on, update, range, hint, readout, type View, type Context } from './activity-types';

const deviceName = (n: number) => n === 0 ? '자석 보관함' : '자석 책갈피';
function device(a: Activity, index: number, isCompare = false): string {
  const opened = isCompare ? a.values.last === 'without' : flag(a, `open${index}`);
  const inside = !isCompare && flag(a, `inside${index}`);
  const has = !isCompare || a.values.has !== false;
  return `<div class="device-visual ${opened ? 'opened' : ''} ${inside ? 'xray' : ''}">
    ${index === 0 ? `<div class="storage-box"><div class="box-lid"><span>MAGNET LAB</span>${has ? '<i class="magnet-slot top-slot">N</i>' : ''}</div><div class="box-body"><div class="box-face"><span>01</span><i class="iron-slot">철판</i></div></div></div>` : `<div class="book-model"><div class="book-lines"></div><span>나의 과학 노트</span><div class="bookmark"><div class="bookmark-top">${has ? '<i class="magnet-slot">N</i>' : ''}</div><div class="bookmark-bottom"><i class="iron-slot">철판</i></div></div></div>`}
    ${inside ? '<span class="diagram-note">내부 보기 · 자석과 철판이 마주 보고 있어</span>' : '<span class="diagram-note">장치를 직접 살펴보자</span>'}</div>`;
}

export function labView(screen: number, a: Activity): View {
  const d = value(a, 'device', 0);
  if (screen === 1) {
    const predicted = flag(a, `predicted${d}`), inside = flag(a, `inside${d}`), found = flag(a, `found${d}`);
    return { html: `<div class="experiment-tabs">${[0, 1].map(i => choice(`device${i}`, deviceName(i), d === i, flag(a, `found${i}`))).join('')}</div>${device(a, d)}<div class="controls">${btn('open', `${icon('eye')} 열어 보기`)}${btn('inside', '내부 보기', !predicted ? 'disabled' : '')}</div><div class="question-strip"><strong>${inside ? '실제로 자석이 있는 곳을 표시해봐.' : '자석은 어디에 숨어 있을까?'}</strong><div class="controls">${choice('lock', '덮개가 맞닿는 부분', found)}${choice('side', '바깥 옆면', false)}</div></div>${readout(found ? '자석의 위치를 찾았어! 다른 장치도 살펴보자.' : predicted ? '예상했으면 내부를 열어 확인해봐.' : '먼저 위치를 예상하고, 내부를 살펴보자.', found)}`, bind(c) {
      [0, 1].forEach(i => on(c, `device${i}`, () => { a.values.device = i; update(c); }));
      on(c, 'open', () => { a.values[`open${d}`] = true; update(c); });
      on(c, 'inside', () => { a.values[`inside${d}`] = true; update(c); });
      const mark = (correct: boolean) => { if (!inside) { a.values[`predicted${d}`] = true; a.values[`prediction${d}`] = correct ? '덮개가 맞닿는 부분' : '바깥 옆면'; c.notify('예상을 기록했어. 내부 보기로 확인해보자.'); }
        else if (correct) { a.values[`found${d}`] = true; record(a, { key: `device${d}`, label: deviceName(d), result: '맞닿는 부분의 자석과 철판을 확인했어.' }); }
        else c.notify('덮개를 닫을 때 가까워지는 두 부분을 살펴봐.'); update(c); };
      on(c, 'lock', () => mark(true)); on(c, 'side', () => mark(false));
    } };
  }
  if (screen === 2) {
    const has = a.values.has !== false;
    return { html: `<div class="experiment-tabs">${[0, 1].map(i => choice(`device${i}`, deviceName(i), d === i, flag(a, `role${i}`))).join('')}</div>${device(a, d, true)}<div class="controls">${choice('with', '자석 넣기', has)}${choice('without', '자석 빼기', !has)}${btn('test', `${icon('play')} 닫아 보고 살짝 흔들기`, 'primary')}</div><div class="comparison-row"><div class="mini-result ${flag(a, `with${d}`) ? 'observed' : ''}">${icon(flag(a, `with${d}`) ? 'check' : 'eye')} 자석 있음<br><small>${flag(a, `with${d}`) ? '붙어서 고정됐어' : '아직 관찰 전'}</small></div><div class="mini-result ${flag(a, `without${d}`) ? 'observed' : ''}">${icon(flag(a, `without${d}`) ? 'check' : 'eye')} 자석 없음<br><small>${flag(a, `without${d}`) ? '쉽게 떨어졌어' : '아직 관찰 전'}</small></div></div><div class="question-strip"><strong>이 장치에서 자석은 어떤 일을 할까?</strong><div class="controls">${choice('role', '서로 붙잡아 고정해', flag(a, `role${d}`))}${choice('wrong', '소리를 크게 만들어', false)}</div></div>`, bind(c) {
      [0, 1].forEach(i => on(c, `device${i}`, () => { a.values.device = i; a.values.last = ''; update(c); }));
      on(c, 'with', () => { a.values.has = true; a.values.last = ''; update(c); }); on(c, 'without', () => { a.values.has = false; a.values.last = ''; update(c); });
      on(c, 'test', () => { a.values[`${has ? 'with' : 'without'}${d}`] = true; a.values.last = has ? 'with' : 'without'; record(a, { key: `${d}${has}`, label: `${deviceName(d)} · 자석 ${has ? '있음' : '없음'}`, result: has ? '고정됨' : '쉽게 떨어짐' }); update(c); });
      on(c, 'role', () => { if (!flag(a, `with${d}`) || !flag(a, `without${d}`)) return c.notify('자석이 있을 때와 없을 때를 모두 시험해봐.'); a.values[`role${d}`] = true; update(c); });
      on(c, 'wrong', () => c.notify('자석을 빼니 장치의 어떤 부분이 달라졌는지 다시 봐.'));
    } };
  }
  if (screen === 3) {
    const m = materials[value(a, 'material', 0)], dist = value(a, 'distance', 85), predicted = typeof a.values.prediction === 'string', observed = flag(a, m.id);
    return { html: `<div class="material-tray">${materials.map((mat, i) => `<button class="material ${m.id === mat.id ? 'selected' : ''}" data-act="material${i}">${objectArt(mat.id)}<span>${mat.name}</span>${flag(a, mat.id) ? icon('check', 15) : ''}</button>`).join('')}</div><div class="lab-bench"><div class="bench-caption">${m.name} · 자석과 가까이 만나면?</div><div class="bench-magnet" style="left:${8 + (100 - dist) * .3}%">${magnet()}</div><div class="bench-object ${observed && m.magnetic ? 'attracted' : ''}">${objectArt(m.id)}</div><div class="distance-track"></div></div><div class="controls"><span class="control-label">내 예상</span>${choice('yes', '따라올 것 같아', a.values.prediction === 'yes')}${choice('no', '그대로 있을 것 같아', a.values.prediction === 'no')}</div><div class="slider-row"><span>가까이</span><input id="material-distance" aria-label="자석과 재료의 거리" type="range" min="15" max="85" value="${dist}" ${!predicted ? 'disabled' : ''}/><span>멀리</span>${btn('approach', '자석 가까이', predicted ? '' : 'disabled')}</div>${readout(observed ? `${m.name}: ${m.magnetic ? '자석을 따라 움직였어!' : '가까이 대어도 움직이지 않았어.'}` : '예상한 다음 자석을 가까이 움직여봐.', observed)}${materials.every(mat => flag(a, mat.id)) ? `<div class="question-strip"><strong>철과 알루미늄을 비교하면?</strong><div class="controls">${choice('compare', '철은 붙고, 알루미늄은 안 붙었어', flag(a, 'compare'))}${choice('wrong', '금속은 모두 붙었어', false)}</div></div>` : hint(`실험한 재료 ${materials.filter(mat => flag(a, mat.id)).length} / 6`)}`, bind(c) {
      materials.forEach((_, i) => on(c, `material${i}`, () => { a.values.material = i; delete a.values.prediction; a.values.distance = 85; update(c); }));
      on(c, 'yes', () => { a.values.prediction = 'yes'; update(c); }); on(c, 'no', () => { a.values.prediction = 'no'; update(c); });
      const move = (n: number) => { a.values.distance = n; if (predicted && n < 32) { a.values[m.id] = true; record(a, { key: m.id, label: m.name, result: `${a.values.prediction === 'yes' ? '움직임 예상' : '정지 예상'} → ${m.magnetic ? '붙음' : '반응 없음'}` }); } update(c); };
      range(c, 'material-distance', move); on(c, 'approach', () => move(18));
      on(c, 'compare', () => { a.values.compare = true; update(c); }); on(c, 'wrong', () => c.notify('알루미늄도 금속이야. 방금 관찰한 반응을 다시 비교해봐.'));
    } };
  }
  if (screen === 4) {
    const dist = value(a, 'distance', 24), paper = flag(a, 'paper'), tested = flag(a, 'tested'), band = response(dist);
    return { html: `<div class="experiment-tabs">${choice('near', '가까운 거리', dist === 24)}${choice('far', '먼 거리', dist === 84)}${choice('paper', '얇은 종이판', paper)}</div><div class="lab-bench distance-bench"><div class="bench-caption">같은 자석 · 같은 철 클립</div><div class="bench-magnet" style="left:12%">${magnet()}</div>${paper ? '<div class="paper-barrier"><span>종이</span></div>' : ''}<div class="bench-object" style="left:${tested && band !== 'none' ? 38 : 43 + dist * .43}%">${objectArt('clip')}</div><div class="distance-track"></div><div class="ruler-label">${dist <= 36 ? '가까움' : dist > 70 ? '멀어짐' : '중간 거리'}</div></div><div class="slider-row"><span>가까이</span><input id="distance" aria-label="자석과 철 클립의 거리" type="range" min="24" max="84" step="10" value="${dist}"/><span>멀리</span></div><div class="controls">${btn('test', `${icon('flask')} 실험하고 기록하기`, 'primary')}</div>${readout(tested ? `${paper ? '종이판이 있어도 ' : ''}${band === 'none' ? '이 거리에서는 클립이 움직이지 않아.' : band === 'strong' ? '클립이 자석 쪽으로 움직였어!' : '클립이 조금 움직였어.'}` : '한 번에 한 가지 조건만 바꿔보자.', tested && band !== 'none')}<div class="comparison-row">${[['near-clear', '가까이 · 판 없음'], ['far-clear', '멀리 · 판 없음'], ['near-paper', '같은 가까운 거리 · 종이판']].map(([k, label]) => `<div class="mini-result ${flag(a, k) ? 'observed' : ''}">${icon(flag(a, k) ? 'check' : 'eye', 18)} ${label}</div>`).join('')}</div>${['near-clear', 'far-clear', 'near-paper'].every(k => flag(a, k)) ? `<div class="controls">${choice('compare', '종이판이 있어도 힘이 작용했어', flag(a, 'compare'))}${choice('wrong', '판이 있으면 언제나 힘이 사라져', false)}</div>` : ''}`, bind(c) {
      on(c, 'near', () => { a.values.distance = 24; a.values.tested = false; update(c); }); on(c, 'far', () => { a.values.distance = 84; a.values.tested = false; update(c); });
      on(c, 'paper', () => { a.values.paper = !paper; a.values.tested = false; update(c); });
      range(c, 'distance', n => { a.values.distance = n; a.values.tested = false; update(c); });
      on(c, 'test', () => { a.values.tested = true; const key = `${dist === 24 ? 'near' : dist >= 74 ? 'far' : 'middle'}-${paper ? 'paper' : 'clear'}`; a.values[key] = true; record(a, { key, label: `${dist === 24 ? '가까운' : dist >= 74 ? '먼' : '중간'} 거리 · ${paper ? '종이판' : '판 없음'}`, result: band === 'none' ? '움직임 없음' : band === 'strong' ? '뚜렷하게 움직임' : '조금 움직임', value: dist }); update(c); });
      on(c, 'compare', () => { a.values.compare = true; update(c); }); on(c, 'wrong', () => c.notify('가까운 거리에서 판만 바꾼 두 기록을 살펴봐.'));
    } };
  }
  if (screen === 5) {
    const index = value(a, 'unknown', 0), reference = (a.values.reference || 'N') as Pole;
    if (!a.values.poles) a.values.poles = Array.from({ length: 4 }, () => Math.random() < .5 ? 'N' : 'S').join('');
    const unknown = String(a.values.poles)[index] as Pole, last = a.values.last as string | undefined;
    return { html: `<div class="experiment-tabs">${[0, 1, 2, 3].map(i => choice(`unknown${i}`, `자석 ${String.fromCharCode(65 + i)}`, i === index, flag(a, `solved${i}`))).join('')}</div><div class="pole-experiment"><div><span class="bench-caption">기준 자석 · 마주 보는 극 ${reference}</span>${magnet(reference === 'N' ? 'S' : 'N')}</div><span class="force-arrow">${last === 'repel' ? '← →' : last === 'attract' ? '→ ←' : '· · ·'}</span><div class="unknown-magnet ${last || ''}"><span>${flag(a, `solved${index}`) ? unknown : '?'}</span><span>${flag(a, `solved${index}`) ? opposite(unknown) : '?'}</span></div></div><div class="controls">${btn('flip', `${icon('reset')} 기준 자석 뒤집기`)}${btn('test', `${icon('flask')} 가까이 대어 보기`, 'primary')}</div><div class="comparison-row">${(['N', 'S'] as Pole[]).map(p => `<div class="mini-result ${flag(a, `test${index}${p}`) ? 'observed' : ''}">${p}극을 가까이<br><small>${flag(a, `test${index}${p}`) ? relation(p, unknown) === 'repel' ? '서로 밀려났어' : '서로 당겨졌어' : '아직 관찰 전'}</small></div>`).join('')}</div><div class="question-strip"><strong>미지 자석의 왼쪽 끝은 무슨 극일까?</strong><div class="controls">${choice('answerN', '왼쪽 N · 오른쪽 S', flag(a, `solved${index}`) && unknown === 'N')}${choice('answerS', '왼쪽 S · 오른쪽 N', flag(a, `solved${index}`) && unknown === 'S')}</div></div>${hint('색은 단서가 아니야. 기준 자석의 두 극으로 비교해봐.')}`, bind(c) {
      [0, 1, 2, 3].forEach(i => on(c, `unknown${i}`, () => { a.values.unknown = i; delete a.values.last; update(c); }));
      on(c, 'flip', () => { a.values.reference = opposite(reference); delete a.values.last; update(c); });
      on(c, 'test', () => { a.values[`test${index}${reference}`] = true; a.values.last = relation(reference, unknown); record(a, { key: `${index}${reference}`, label: `자석 ${String.fromCharCode(65 + index)} · 기준 ${reference}`, result: reference === unknown ? '밀림' : '끌림' }); update(c); });
      (['N', 'S'] as Pole[]).forEach(p => on(c, `answer${p}`, () => { if (!flag(a, `test${index}N`) || !flag(a, `test${index}S`)) return c.notify('기준 자석의 N극과 S극을 모두 가까이 대어봐.'); if (p !== unknown) return c.notify('같은 극은 서로 밀어내. 기록에서 밀려난 경우를 찾아봐.'); a.values[`solved${index}`] = true; record(a, { key: `solved${index}`, label: `자석 ${String.fromCharCode(65 + index)} 판별`, result: `왼쪽 ${p} · 오른쪽 ${opposite(p)}` }); update(c); }));
    } };
  }
  const tops: Pole[] = ['N', (a.values.ring1 || 'N') as Pole, (a.values.ring2 || 'N') as Pole], gaps = ringGaps(tops), tested = flag(a, 'tested');
  const ys = [238, tested && gaps[0] ? 163 : 208, tested ? (gaps[0] ? 163 : 208) - (gaps[1] ? 75 : 30) : 178];
  return { html: `<div class="ring-lab"><svg viewBox="0 0 560 330" role="img" aria-label="지지 막대 위 고리자석 배열"><ellipse cx="280" cy="293" rx="120" ry="15" fill="#d5e5df"/><rect x="274" y="34" width="12" height="251" rx="6" fill="#a7bab8"/><path d="M277 37v245" stroke="#edf4ed" stroke-width="3"/><rect x="210" y="279" width="140" height="15" rx="7" fill="#8eb2a7"/>${ys.map((y, i) => `<g style="transition:transform .5s" transform="translate(0 ${y})"><rect x="211" y="0" width="138" height="24" rx="9" fill="${tops[i] === 'N' ? '#e57b66' : '#5d98bc'}"/><ellipse cx="280" cy="0" rx="69" ry="15" fill="${tops[i] === 'N' ? '#f3a392' : '#92bfd7'}"/><ellipse cx="280" cy="0" rx="13" ry="5" fill="#a9bfba"/><text x="237" y="5" fill="#253e50" font-size="15" font-weight="bold">${tops[i]}</text><text x="309" y="20" fill="white" font-size="13">${opposite(tops[i])}</text><text x="374" y="14" fill="#355d61" font-size="15">${i === 0 ? '고정된 바닥 고리' : `고리 ${i}`}</text></g>`).join('')}<text x="53" y="46" fill="#6d8584" font-size="15">비자성 지지 막대</text><path d="m186 42 83 0" stroke="#9dafaa" stroke-dasharray="3 4"/></svg></div><div class="controls">${btn('ring1', '고리 1 뒤집기')}${btn('ring2', '고리 2 뒤집기')}${btn('test', `${icon('play')} 배열 시험`, 'primary')}</div>${readout(tested ? gaps.every(Boolean) ? '두 곳에 간격이 생겼어! 마주 보는 극을 비교해봐.' : '붙어 있는 고리가 있어. 하나씩 뒤집어봐.' : '위쪽 두 고리를 뒤집고 배열을 시험해봐.', tested && gaps.every(Boolean))}${tested && gaps.every(Boolean) ? `<div class="controls">${choice('reason', '같은 극이 마주 보며 밀어내', flag(a, 'reason'))}${choice('wrong', '서로 다른 극이 밀어내', false)}</div>` : ''}`, bind(c) {
      [1, 2].forEach(i => on(c, `ring${i}`, () => { a.values[`ring${i}`] = opposite(tops[i]); a.values.tested = false; a.values.gaps = false; a.values.reason = false; update(c); }));
      on(c, 'test', () => { a.values.tested = true; a.values.gaps = gaps.every(Boolean); record(a, { key: 'rings', label: '고리 배열 (위쪽 극, 아래부터)', result: `${tops.join(' / ')} → ${gaps.filter(Boolean).length}곳에 간격` }); update(c); });
      on(c, 'reason', () => { a.values.reason = true; update(c); }); on(c, 'wrong', () => c.notify('고리 윗면과 그 위 고리의 아랫면을 비교해봐.'));
    } };
}
