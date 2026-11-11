import './idea-lab.css';
import { emphasizeScience, scienceNoteMarkup } from './science-guidance';
import { icon, mascot } from './art';
import { record, stageNames, type Activity, type Point, type Save } from './domain';
import { playEffect, playNarration } from './game-audio';
import { update, type Context, type View } from './activity-types';
import { boardLayers, feedbackStickers, ideaCard, ideaProblems, ideaProperties, ideaStickers, paletteIcon, pitchPrompts, problemText, propertyTitles } from './idea-content';
import { boardSize, buddyFeedback, emptyIdea, hasIdeaSketch, ideaReady, pitchReady, problemChosen, type Idea, type IdeaFeedback } from './idea-model';

const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const steps: Record<number, { name: string; title: string; buddy: string }[]> = {
  9: [
    { name: '불편 찾기', title: '누구의 불편을 해결해 볼까?', buddy: '주민을 눌러 어떤 불편이 있는지 살펴봐.' },
    { name: '자석 성질', title: '어떤 자석의 성질을 쓸까?', buddy: '해결할 불편을 떠올리며, 쓸 자석의 성질을 골라 봐.' },
    { name: '설계 스케치', title: '내 발명을 설명해 봐!', buddy: '어디에 자석을 쓰고, 어떤 힘으로 움직이는지 친구들에게 알려 줘.' },
  ],
  10: [
    { name: '이름과 소개', title: '내 발명을 소개해 봐!', buddy: '아래 질문을 보면서 친구들에게 소개할 글을 적어 봐.' },
    { name: '전시하기', title: '공방 전시관에 걸어 볼까?', buddy: '전자칠판에 띄우면 모두가 함께 볼 수 있어.' },
    { name: '친구 의견', title: '친구 의견을 남길까?', buddy: '같은 기기에서 의견을 남길 수 있어. 바로 공방을 완성해도 돼.' },
  ],
};
const stepOf = (screen: number, i: Idea) => screen === 9 ? i.step9 : i.step10;
const setStep = (screen: number, i: Idea, n: number) => { if (screen === 9) i.step9 = n; else i.step10 = n; };

/** The reason the next button is off; an empty string means the learner can move on. */
export function ideaGate(screen: number, step: number, i: Idea): string {
  if (screen === 9) {
    if (step === 0) return problemChosen(i) ? '' : i.problem === 'custom' ? '불편을 네 글자 이상 적어 줘.' : '해결할 불편을 하나 골라 줘.';
    if (step === 1) return i.properties.length ? '' : '쓸 성질을 하나 이상 골라 줘.';
    if (!problemChosen(i)) return '첫 단계에서 해결할 불편을 골라 줘.';
    if (!i.properties.length) return '쓸 자석의 성질을 골라 줘.';
    return '';
  }
  if (!i.name.trim()) return '발명품 이름을 지어 줘.';
  if (!pitchReady(i)) return '소개를 열 글자 이상 적어 줘.';
  return step > 0 && !i.shown ? '전시관에 걸어 줘.' : '';
}

type WorkshopResident = typeof ideaProblems[number];
const residentPortrait = (id: string, size: number) =>
  `<img src="/assets/quest/workshop-resident-${id}.webp" alt="" width="${size}" height="${size}" draggable="false">`;
const startingResident = (i: Idea) => ideaProblems.find(p => p.id === i.problem) ?? ideaProblems[0];
function residentDialogue(p: WorkshopResident, chosen: boolean) {
  return `<div class="idea-resident-portrait">${residentPortrait(p.id, 200)}</div>
    <div class="idea-resident-dialogue"><div class="idea-resident-bubble"><span>${p.who}</span><h2>${p.text}</h2><p>${chosen ? '도와준다니 고마워요! 어떤 자석의 성질을 쓸지 생각해 봐요.' : p.detail}</p></div>
      <div class="idea-resident-actions">
        ${chosen ? `<button type="button" class="btn idea-resident-chosen" data-resident-example aria-haspopup="dialog">${icon('check', 18)} 도와주기로 했어 <small>예시 다시 보기</small></button>` : `<button type="button" class="btn idea-resident-accept" data-problem="${p.id}" aria-haspopup="dialog">이 불편을 해결할래 ${icon('arrow', 18)}</button>`}
      </div>
    </div>`;
}
function problemStep(i: Idea) {
  const active = startingResident(i);
  return `<div class="idea-conversations">
    <section class="idea-resident-scene" aria-label="주민 이야기" aria-live="polite">${residentDialogue(active, i.problem === active.id)}</section>
    <div class="idea-resident-list" role="group" aria-label="이야기를 볼 주민">${ideaProblems.map(p => `<button type="button" class="idea-resident-tab" data-resident="${p.id}" data-chosen="${i.problem === p.id}" aria-pressed="${active.id === p.id}">${residentPortrait(p.id, 64)}<span>${p.who}</span></button>`).join('')}</div>
    <div class="idea-custom idea-custom-conversation" data-selected="${i.problem === 'custom'}"><label for="idea-custom">내가 찾은 불편</label><input id="idea-custom" maxlength="40" placeholder="우리 주변의 불편을 적어 봐" value="${esc(i.custom)}"></div>
    <dialog class="idea-example" aria-labelledby="idea-example-title" aria-describedby="idea-example-how"><div data-example-card></div><form method="dialog"><button class="btn primary" autofocus>공방으로 돌아가기</button></form></dialog>
  </div>`;
}
function propertyStep(i: Idea) {
  return `<div class="idea-choices" role="group" aria-label="쓸 자석의 성질">${ideaProperties.map(p => `<button type="button" class="idea-choice" data-property="${p.id}" aria-pressed="${i.properties.includes(p.id)}"><small>${p.from}</small><strong>${p.title}</strong></button>`).join('')}</div><p class="idea-problem-line">해결할 불편 · ${esc(problemText(i))}</p>${scienceNoteMarkup(9)}`;
}
function editor(i: Idea) {
  return `<div class="idea-editor"><div class="idea-palette" role="group" aria-label="부품 스티커">${ideaStickers.map((s, index) => `<button type="button" class="idea-stick" data-sticker="${index}" aria-pressed="false">${paletteIcon(s)}<span>${s.label}</span></button>`).join('')}</div>
    <div class="idea-board"><svg id="idea-canvas" viewBox="0 0 ${boardSize.w} ${boardSize.h}" tabindex="0" role="application" aria-label="설계 판. 방향키로 위치를 옮기고 Enter로 스티커를 붙이거나 붙인 스티커를 선택할 수 있어.">${boardLayers(i)}</svg></div>
    <div class="idea-tools" role="group" aria-label="그리기 도구"><button type="button" data-tool="pen" aria-pressed="true">펜</button><button type="button" data-tool="arrow" aria-pressed="false">힘 화살표</button><button type="button" data-tool="move" aria-pressed="false">옮기기</button><button type="button" data-edit="flip" disabled>극 뒤집기</button><button type="button" data-edit="remove" disabled>빼기</button><button type="button" data-edit="undo">되돌리기</button></div></div>`;
}
function sketchStep(i: Idea) {
  return `<div class="idea-sketch"><div class="idea-sketch-notes">
    <div><label for="idea-name">발명품 이름</label><input id="idea-name" maxlength="16" placeholder="예: 착착 지우개 집" value="${esc(i.name)}"></div>
    <div><label for="idea-pitch">내 발명 설명</label><textarea id="idea-pitch" maxlength="120" rows="2" placeholder="어디에 자석을 놓고, 어떻게 움직이는지 적어 봐.">${esc(i.pitch)}</textarea></div>
    <button type="button" class="btn" data-act="export">그림으로 다운로드</button>
  </div>
  <p class="idea-sketch-hint">부품을 고르고 그림판을 눌러 붙여 봐. 힘 화살표로 움직일 방향도 표시해 줘.</p>
  ${editor(i)}</div>`;
}
function pitchStep(i: Idea) {
  return `<div class="idea-pitch"><div><label for="idea-name">발명품 이름</label><input id="idea-name" maxlength="16" placeholder="예: 착착 지우개 집" value="${esc(i.name)}"><ol class="idea-prompts">${pitchPrompts.map(text => `<li>${emphasizeScience(text)}</li>`).join('')}</ol></div><div><label for="idea-pitch">발명 소개</label><textarea id="idea-pitch" maxlength="120" rows="3" placeholder="친구들에게 소개할 글을 적어 봐">${esc(i.pitch)}</textarea></div></div>`;
}
function showStep(i: Idea) {
  return `<div class="idea-show"><div class="idea-frame${i.shown ? ' is-hung' : ''}">${ideaCard(i)}</div><div class="idea-show-actions"><button type="button" class="btn primary" data-act="hang" ${i.shown ? 'disabled' : ''}>${i.shown ? `${icon('check', 20)} 전시 중` : '전시관에 걸기'}</button><button type="button" class="btn" data-act="present">크게 띄워 발표하기</button><button type="button" class="btn" data-act="export">그림으로 다운로드</button></div></div>`;
}
const feedbackLine = (f: IdeaFeedback) => `<b>${esc(f.from)} · ${feedbackStickers.find(k => k.id === f.sticker)?.label ?? ''}</b><span>${esc(f.question) || '좋았어!'}</span>`;
function feedbackStep(i: Idea) {
  return `<div class="idea-feedback"><form data-feedback-form><fieldset><legend>어떤 느낌이야?</legend>${feedbackStickers.map((k, n) => `<label><input type="radio" name="idea-sticker" value="${k.id}" ${n ? '' : 'checked'}><span>${k.label}</span></label>`).join('')}</fieldset><label for="idea-question">궁금한 점이나 고칠 생각</label><input id="idea-question" maxlength="40" placeholder="예: 자석이 떨어지면 어떡해?"><button type="submit" class="btn primary">의견 남기기</button></form>
    <div><ul class="idea-feedback-list">${i.feedback.map(f => `<li>${feedbackLine(f)}</li>`).join('') || '<li class="idea-empty">이 기기에 남긴 의견이 여기에 보여.</li>'}</ul><button type="button" class="btn" data-act="buddy">밀이·당이 의견 보기</button></div></div>`;
}
const bodies: Record<number, ((i: Idea) => string)[]> = { 9: [problemStep, propertyStep, sketchStep], 10: [pitchStep, showStep, feedbackStep] };

function bindEditor(c: Context, i: Idea, changed: () => void) {
  const svg = c.root.querySelector<SVGSVGElement>('#idea-canvas');
  if (!svg) return;
  let tool: 'pen' | 'arrow' | 'move' = 'pen', placing = '', selected = -1;
  let drawing: 'stroke' | 'arrow' | 'drag' | 'place' | '' = '', activePointer: number | null = null;
  let origin: Point | undefined, dragged: Idea['stickers'][number] | undefined, cursor: Point = { x: boardSize.w / 2, y: boardSize.h / 2 };
  const history: (() => void)[] = [];
  const buttons = <T extends HTMLElement>(selector: string) => c.root.querySelectorAll<T>(selector);
  const edit = (name: string) => c.root.querySelector<HTMLButtonElement>(`[data-edit="${name}"]`)!;
  const target = () => i.stickers.find(s => s.uid === selected);
  const inside = (p: Point, pad = 4, bottom = pad): Point => ({
    x: Math.max(pad, Math.min(boardSize.w - pad, p.x)),
    y: Math.max(pad, Math.min(boardSize.h - bottom, p.y)),
  });
  const paint = () => {
    svg.innerHTML = boardLayers(i, selected) + (placing
      ? `<circle cx="${cursor.x}" cy="${cursor.y}" r="9" fill="none" stroke="#c9531c" stroke-width="1.2" stroke-dasharray="3 2" pointer-events="none"/>`
      : '');
    buttons<HTMLButtonElement>('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(!placing && b.dataset.tool === tool)));
    buttons<HTMLButtonElement>('[data-sticker]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sticker === placing)));
    edit('flip').disabled = target()?.id !== 'magnet'; edit('remove').disabled = !target(); edit('undo').disabled = !history.length;
  };
  const commit = () => { paint(); changed(); };
  const at = (e: PointerEvent): Point => {
    const matrix = svg.getScreenCTM();
    return matrix ? inside(new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse())) : cursor;
  };
  const place = (point: Point) => {
    const uid = i.stickers.reduce((max, s) => Math.max(max, s.uid), 0) + 1;
    const { id, pole } = ideaStickers[Number(placing)];
    i.stickers.push({ uid, id, ...inside(point, 15, 20), ...(pole ? { pole } : {}) });
    history.push(() => { i.stickers = i.stickers.filter(s => s.uid !== uid); });
    selected = uid; placing = ''; tool = 'move';
    c.root.querySelector('.idea-buddy p')!.textContent = steps[c.screen][stepOf(c.screen, i)].buddy;
    playEffect('snap', c.s.settings); commit();
  };
  svg.addEventListener('pointerdown', e => {
    if (activePointer !== null || !e.isPrimary || e.button !== 0) return;
    const p = at(e), hit = (e.target as Element).closest<SVGGElement>('[data-uid]');
    if (placing) { drawing = 'place'; cursor = inside(p, 15, 20); }
    else if (tool === 'move') {
      selected = hit ? Number(hit.dataset.uid) : -1;
      const sticker = target();
      if (!sticker) { paint(); return; }
      drawing = 'drag'; dragged = sticker; origin = { x: sticker.x, y: sticker.y };
    } else if (tool === 'pen') { i.strokes.push([p]); drawing = 'stroke'; }
    else { i.arrows.push([p, p]); drawing = 'arrow'; }
    activePointer = e.pointerId;
    svg.setPointerCapture(e.pointerId);
    paint();
  });
  svg.addEventListener('pointermove', e => {
    if (e.pointerId !== activePointer) return;
    const p = at(e);
    if (drawing === 'place') cursor = inside(p, 15, 20);
    else if (drawing === 'drag' && dragged) Object.assign(dragged, inside(p, 15, 20));
    else if (drawing === 'arrow') i.arrows.at(-1)![1] = p;
    else if (drawing === 'stroke') {
      const line = i.strokes.at(-1)!, last = line.at(-1)!;
      if (Math.hypot(p.x - last.x, p.y - last.y) >= 1.2 && i.strokes.flat().length < 1500) line.push(p);
    }
    paint();
  });
  const finish = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    const gesture = drawing, cancelled = e.type !== 'pointerup';
    drawing = ''; activePointer = null;
    if (gesture === 'place' && !cancelled) { place(at(e)); return; }
    if (gesture === 'arrow') {
      const [a, b] = i.arrows.at(-1)!;
      if (cancelled || Math.hypot(a.x - b.x, a.y - b.y) < 8) i.arrows.pop();
      else history.push(() => { i.arrows.pop(); });
    } else if (gesture === 'stroke') {
      if (cancelled || i.strokes.at(-1)!.length < 2) i.strokes.pop();
      else history.push(() => { i.strokes.pop(); });
    } else if (gesture === 'drag' && origin && dragged) {
      const sticker = dragged, start = origin;
      if (cancelled) Object.assign(sticker, start);
      else if (sticker.x !== start.x || sticker.y !== start.y) history.push(() => { Object.assign(sticker, start); });
    }
    origin = undefined; dragged = undefined; commit();
  };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) svg.addEventListener(event, finish);
  svg.addEventListener('keydown', e => {
    if (activePointer !== null) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (placing) place(cursor);
      else if (i.stickers.length) { selected = i.stickers[(i.stickers.findIndex(s => s.uid === selected) + 1) % i.stickers.length].uid; tool = 'move'; paint(); }
      return;
    }
    const move: Record<string, Point> = { ArrowLeft: { x: -3, y: 0 }, ArrowRight: { x: 3, y: 0 }, ArrowUp: { x: 0, y: -3 }, ArrowDown: { x: 0, y: 3 } }, step = move[e.key], sticker = target();
    if (!step || (!placing && !sticker)) return;
    e.preventDefault();
    if (placing) { cursor = inside({ x: cursor.x + step.x, y: cursor.y + step.y }, 15, 20); paint(); }
    else if (sticker) {
      const previous = { x: sticker.x, y: sticker.y };
      Object.assign(sticker, inside({ x: sticker.x + step.x, y: sticker.y + step.y }, 15, 20));
      history.push(() => { Object.assign(sticker, previous); }); commit();
    }
  });
  buttons<HTMLButtonElement>('[data-sticker]').forEach(b => b.addEventListener('click', e => {
    placing = placing === b.dataset.sticker ? '' : b.dataset.sticker!;
    c.root.querySelector('.idea-buddy p')!.textContent = placing ? '판을 누르거나 방향키로 옮긴 뒤 Enter를 눌러 붙여 봐.' : steps[c.screen][stepOf(c.screen, i)].buddy;
    if (placing && e.detail === 0) svg.focus({ preventScroll: true });
    paint();
  }));
  buttons<HTMLButtonElement>('[data-tool]').forEach(b => b.addEventListener('click', () => { tool = b.dataset.tool as typeof tool; placing = ''; if (tool !== 'move') selected = -1; paint(); }));
  edit('flip').addEventListener('click', () => { const sticker = target(); if (sticker) { const pole = sticker.pole; sticker.pole = pole === 'S' ? 'N' : 'S'; history.push(() => { sticker.pole = pole; }); commit(); } });
  edit('remove').addEventListener('click', () => { const index = i.stickers.findIndex(s => s.uid === selected); if (index < 0) return; const [sticker] = i.stickers.splice(index, 1); history.push(() => { i.stickers.splice(index, 0, sticker); }); selected = -1; commit(); });
  edit('undo').addEventListener('click', () => { history.pop()?.(); selected = -1; commit(); });
  paint();
}

function wrapped(context: CanvasRenderingContext2D, text: string, width: number) {
  const fits = (value: string) => context.measureText(value).width <= width;
  const lines: string[] = []; let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const joined = line ? `${line} ${word}` : word;
    if (fits(joined)) { line = joined; continue; }
    if (line) lines.push(line);
    line = '';
    for (const letter of word) {
      if (line && !fits(line + letter)) { lines.push(line); line = ''; }
      line += letter;
    }
  }
  return [...lines, line];
}
/** Export a single image sized for a classroom display. */
async function exportCard(i: Idea, notify: (text: string) => void) {
  const { name, pitch } = i;
  const sketch = hasIdeaSketch(i);
  if (!pitch.trim() && !sketch) return notify('발명 설명을 적거나 설계 그림을 만들어 줘.');
  try {
    await document.fonts.ready;
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 900;
    const g = canvas.getContext('2d')!;
    const font = '"NanumSquareNeo", "Noto Sans KR", sans-serif';
    g.fillStyle = '#eaf3f5'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#1e4755'; g.font = `700 26px ${font}`; g.fillText('시민 발명 공방 · 내 발명 발표', 60, 57);
    g.font = `700 62px ${font}`; g.fillText(name.trim() || '내 발명', 60, 132, 1480);
    if (sketch) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boardSize.w} ${boardSize.h}" width="896" height="504"><rect width="100%" height="100%" fill="#fff"/>${boardLayers(i)}</svg>`;
      const image = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      try { image.src = url; await image.decode(); g.drawImage(image, 60, 205, 896, 504); }
      finally { URL.revokeObjectURL(url); }
      g.strokeStyle = '#9abac3'; g.lineWidth = 2; g.strokeRect(60, 205, 896, 504);
    }
    const x = sketch ? 992 : 84, width = sketch ? 548 : 1432;
    const sections = [['해결할 불편', problemText(i)], ['쓴 자석의 성질', propertyTitles(i).join(' · ')], ['내 발명 설명', pitch.trim()]];
    const lineSize = sketch ? 31 : 40;
    g.font = `500 ${lineSize}px ${font}`;
    const groups = sections.filter(([, value]) => value).map(([heading, value]) => [heading, wrapped(g, value, width - 48)] as const);
    const lineCount = groups.reduce((n, [, lines]) => n + lines.length, 0);
    const step = Math.min(lineSize + 11, Math.floor((650 - groups.length * 62) / Math.max(lineCount, 1)));
    g.fillStyle = '#fff'; g.fillRect(x, 180, width, 654);
    let y = 231;
    for (const [heading, lines] of groups) {
      g.fillStyle = '#286779'; g.font = `700 25px ${font}`; g.fillText(heading, x + 24, y);
      g.fillStyle = '#1e4755'; g.font = `500 ${Math.min(lineSize, step - 5)}px ${font}`;
      for (const line of lines) { y += step; g.fillText(line, x + 24, y); }
      y += 62;
    }
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('card');
    const link = document.createElement('a'), href = URL.createObjectURL(blob);
    link.href = href; link.download = 'my-magnet-idea.png';
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    notify('발표용 PNG를 다운로드했어.');
  } catch {
    notify('카드를 만들지 못했어. 다시 눌러 봐.');
  }
}

/** Stage five, used by every learner who is not partway through the earlier device tests. */
export function ideaView(screen: number, a: Activity, s: Save, preview = false): View {
  const i = s.idea ||= emptyIdea();
  const lastStep = steps[screen].length - 1;
  const step = Math.min(lastStep, Math.max(0, stepOf(screen, i))), info = steps[screen][step], last = step === lastStep;
  if (step !== stepOf(screen, i)) setStep(screen, i, step);
  const gate = preview ? '' : ideaGate(screen, step, i);
  const label = last ? screen === 9 ? '발표회로 가기' : '공방 완성하기' : screen === 9 ? ['자석의 성질 고르기', '설계 시작하기'][step] : ['발명 카드 보기', '친구 의견 보기'][step];
  const remember = () => {
    if (screen === 9 && last && ideaReady(9, i)) record(a, { key: 'idea', label: '내 발명 아이디어', result: i.pitch.trim() || `${problemText(i)} · ${propertyTitles(i).join(', ')}` });
    if (screen === 10 && ideaReady(10, i)) record(a, { key: 'share', label: '내 발명 발표', result: i.name.trim() });
  };
  remember();
  const html = `<div id="experiment-root" class="idea-lab screen-${screen}" data-idea-step="${step}">
    <header class="idea-head"><span class="stage-label">구역 5 · ${stageNames[4]} · ${screen === 9 ? '아이디어 공방' : '발표회'}</span><h1 tabindex="-1">${info.title}</h1><ol class="idea-steps">${steps[screen].map((item, n) => `<li aria-current="${n === step ? 'step' : 'false'}" data-done="${n < step}">${n < step ? icon('check', 16) : n + 1}<span>${item.name}</span></li>`).join('')}</ol></header>
    <div class="idea-body">${bodies[screen][step](i)}</div>
    <footer class="idea-foot"><div class="idea-buddy">${mascot(step % 2 ? 'dangi' : 'mili', 72, 1)}<p>${emphasizeScience(info.buddy)}</p></div><p class="idea-gate" role="status">${gate}</p><div class="idea-nav"><button type="button" class="btn" data-act="back" ${step ? '' : 'disabled'}>이전</button><button type="button" class="quest-cta idea-next" ${last ? 'data-action="complete"' : 'data-act="next"'} ${gate ? 'disabled' : ''}>${label} ${icon('arrow', 22)}</button></div></footer>
    <dialog class="idea-present" aria-label="내 발명 발표">${ideaCard(i)}<div><button type="button" class="btn" data-act="present-close" autofocus>닫기</button></div></dialog></div>`;
  return { html, bind(c) {
    const events = new AbortController(), signal = events.signal, root = c.root;
    const refreshGate = () => {
      remember();
      const text = preview ? '' : ideaGate(screen, step, i);
      root.querySelector('.idea-gate')!.textContent = text;
      root.querySelector<HTMLButtonElement>('.idea-next')!.disabled = !!text;
    };
    const act = (name: string, fn: () => void) => root.querySelectorAll<HTMLElement>(`[data-act="${name}"]`).forEach(b => b.addEventListener('click', fn, { signal }));
    const typed = (selector: string, fn: (value: string) => void) => root.querySelector<HTMLInputElement>(selector)?.addEventListener('input', e => { fn((e.target as HTMLInputElement).value); c.touch(); refreshGate(); }, { signal });
    const move = (n: number) => { setStep(screen, i, n); update(c); document.querySelector<HTMLElement>('.idea-head h1')?.focus({ preventScroll: true }); };

    act('next', () => { if (preview || !ideaGate(screen, step, i)) { playEffect('click'); move(step + 1); } });
    act('back', () => { if (step) move(step - 1); });
    const scene = root.querySelector<HTMLElement>('.idea-resident-scene');
    const tabs = root.querySelectorAll<HTMLButtonElement>('[data-resident]');
    const custom = root.querySelector<HTMLElement>('.idea-custom');
    const example = root.querySelector<HTMLDialogElement>('.idea-example');
    let speaker = startingResident(i);
    let stopVoice = () => {};
    const speak = () => {
      stopVoice();
      stopVoice = playNarration(`/audio/voices/workshop-${speaker.id}.mp3`, s.settings);
    };
    const showResident = () => {
      if (!scene) return;
      scene.innerHTML = residentDialogue(speaker, i.problem === speaker.id);
      tabs.forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.resident === speaker.id));
        b.dataset.chosen = String(b.dataset.resident === i.problem);
      });
      if (custom) custom.dataset.selected = String(i.problem === 'custom');
    };
    const openExample = () => {
      if (!example || example.open) return;
      stopVoice();
      const { title, how } = speaker.example;
      const card = example.querySelector<HTMLElement>('[data-example-card]')!;
      card.innerHTML = `<p class="idea-example-tag">자석을 쓴 물건 · 예시</p><h2 id="idea-example-title">${title}</h2>
        <figure><img src="/assets/quest/workshop-example-${speaker.id}.webp" alt="${title}" width="448" height="448"><p class="idea-example-missing" hidden>그림을 불러오지 못했어.</p></figure>
        <p id="idea-example-how">${how}</p><p class="idea-example-note">자석이 어디에 달렸는지 찾아봐. 너만의 방법을 생각해도 좋아.</p>`;
      const picture = card.querySelector('img')!;
      picture.addEventListener('error', () => { picture.hidden = true; card.querySelector<HTMLElement>('.idea-example-missing')!.hidden = false; }, { once: true, signal });
      example.showModal();
    };
    example?.addEventListener('click', e => { if (e.target === example) example.close(); }, { signal });
    example?.addEventListener('close', () => scene?.querySelector<HTMLButtonElement>('[data-resident-example]')?.focus({ preventScroll: true }), { signal });
    tabs.forEach(b => b.addEventListener('click', () => {
      const resident = ideaProblems.find(p => p.id === b.dataset.resident);
      if (!resident) return;
      if (resident !== speaker) { stopVoice(); speaker = resident; playEffect('click', s.settings); showResident(); }
      speak();
    }, { signal }));
    scene?.addEventListener('click', e => {
      const target = e.target as Element;
      if (target.closest('[data-resident-example]')) { openExample(); return; }
      if (!target.closest('[data-problem]')) return;
      i.problem = speaker.id;
      playEffect('click', s.settings); c.touch(); showResident(); refreshGate();
      openExample();
    }, { signal });
    typed('#idea-custom', value => {
      i.custom = value;
      if (i.problem !== 'custom') { stopVoice(); i.problem = 'custom'; showResident(); }
    });
    root.querySelectorAll<HTMLButtonElement>('[data-property]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.property!;
      if (i.properties.includes(id)) i.properties = i.properties.filter(p => p !== id);
      else if (i.properties.length >= 2) return c.notify('성질은 두 개까지 고를 수 있어.');
      else i.properties.push(id);
      b.setAttribute('aria-pressed', String(i.properties.includes(id)));
      playEffect('click', s.settings); c.touch(); refreshGate();
    }, { signal }));
    typed('#idea-name', value => { i.name = value; });
    typed('#idea-pitch', value => { i.pitch = value; });
    bindEditor(c, i, () => { c.touch(); refreshGate(); });

    act('hang', () => { i.shown = true; playEffect('reward'); update(c); });
    const present = root.querySelector<HTMLDialogElement>('.idea-present')!;
    act('present', () => { if (!present.open) present.showModal(); });
    act('present-close', () => present.close());
    present.addEventListener('close', () => root.querySelector<HTMLButtonElement>('[data-act="present"]')?.focus({ preventScroll: true }), { signal });
    act('export', () => { void exportCard(i, c.notify); });

    root.querySelector<HTMLFormElement>('[data-feedback-form]')?.addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target as HTMLFormElement, sticker = new FormData(form).get('idea-sticker') as IdeaFeedback['sticker'];
      i.feedback.push({ from: '친구', sticker, question: root.querySelector<HTMLInputElement>('#idea-question')!.value.trim() });
      playEffect('success'); update(c);
    }, { signal });
    act('buddy', () => { for (const f of buddyFeedback(i)) if (!i.feedback.some(item => item.question === f.question)) i.feedback.push(f); update(c); });
    return () => { stopVoice(); events.abort(); };
  } };
}
