import './idea-lab.css';
import { icon, mascot } from './art';
import { record, stageNames, type Activity, type Point, type Save } from './domain';
import { playEffect, playNarration, setAudioPaused } from './game-audio';
import { update, type Context, type View } from './activity-types';
import { boardLayers, feedbackStickers, ideaCard, ideaProblems, ideaProperties, ideaStickers, paletteIcon, pitchPrompts, problemText, propertyTitles } from './idea-content';
import { boardSize, buddyFeedback, emptyIdea, ideaChecks, ideaReady, pitchReady, problemChosen, type Idea, type IdeaFeedback } from './idea-model';
import { loadRecording, saveRecording } from './storage';
import { canRecord, recordingLimit, startRecording, type Recording } from './voice-recorder';

const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const steps: Record<number, { name: string; title: string; buddy: string }[]> = {
  9: [
    { name: '불편 찾기', title: '누구의 불편을 해결해 볼까?', buddy: '정답은 없어! 네가 도와주고 싶은 사람을 골라 봐.' },
    { name: '자석 성질', title: '어떤 자석의 성질을 쓸까?', buddy: '앞에서 찾은 발견이야. 한두 개만 골라 봐.' },
    { name: '설계 스케치', title: '내 발명을 그려 봐!', buddy: '그림을 못 그려도 괜찮아. 스티커만 붙여도 설계가 돼.' },
    { name: '원리 점검', title: '정말 자석으로 될까?', buddy: '자석의 힘이 닿는지만 같이 볼게.' },
  ],
  10: [
    { name: '이름과 소개', title: '내 발명을 내 목소리로 소개해 봐!', buddy: '틀린 말은 없어. 아래 세 질문에 답하듯 말해 봐.' },
    { name: '전시하기', title: '공방 전시관에 걸어 볼까?', buddy: '전자칠판에 띄우면 모두가 함께 볼 수 있어.' },
    { name: '친구 의견', title: '친구의 의견을 들어 보자', buddy: '태블릿을 친구에게 건네 봐. 점수가 아니라 생각을 나누는 거야.' },
    { name: '고치기', title: '의견을 듣고 고쳐 보자', buddy: '좋은 발명가는 다른 사람의 말을 듣고 고쳐.' },
  ],
};
const stepOf = (screen: number, i: Idea) => screen === 9 ? i.step9 : i.step10;
const setStep = (screen: number, i: Idea, n: number) => { if (screen === 9) i.step9 = n; else i.step10 = n; };

/** The reason the next button is off; an empty string means the learner can move on. */
export function ideaGate(screen: number, step: number, i: Idea): string {
  if (screen === 9) {
    if (step === 0) return problemChosen(i) ? '' : i.problem === 'custom' ? '불편을 네 글자 이상 적어 줘.' : '해결할 불편을 하나 골라 줘.';
    if (step === 1) return i.properties.length ? '' : '쓸 성질을 하나 이상 골라 줘.';
    if (step === 2) return i.stickers.length ? '' : '판에 스티커를 하나 이상 붙여 줘.';
    return ideaChecks(i).length ? '앞으로 돌아가서 고칠 곳을 고쳐 줘.' : '';
  }
  if (step === 0) return !i.name.trim() ? '발명품 이름을 지어 줘.' : pitchReady(i) ? '' : '소개를 녹음하거나 열 글자 이상 적어 줘.';
  if (step === 1) return i.shown ? '' : '전시관에 걸어 줘.';
  if (step === 2) return i.feedback.length ? '' : '의견을 하나 이상 받아 줘.';
  if (i.chosen < 0) return '반영할 의견을 하나 골라 줘.';
  if (i.change.trim().length < 4) return '무엇을 바꿨는지 네 글자 이상 적어 줘.';
  return ideaChecks(i)[0] ?? '';
}

function problemStep(i: Idea) {
  return `<div class="idea-choices" role="group" aria-label="해결할 불편">${ideaProblems.map(p => `<button type="button" class="idea-choice" data-problem="${p.id}" aria-pressed="${i.problem === p.id}"><small>${p.who}</small><strong>${p.text}</strong></button>`).join('')}
    <div class="idea-choice idea-custom" data-selected="${i.problem === 'custom'}"><label for="idea-custom"><small>내가 찾은 불편</small></label><input id="idea-custom" maxlength="40" placeholder="우리 주변의 불편을 적어 봐" value="${esc(i.custom)}"></div></div>`;
}
function propertyStep(i: Idea) {
  return `<div class="idea-choices" role="group" aria-label="쓸 자석의 성질">${ideaProperties.map(p => `<button type="button" class="idea-choice" data-property="${p.id}" aria-pressed="${i.properties.includes(p.id)}"><small>${p.from}</small><strong>${p.title}</strong></button>`).join('')}</div><p class="idea-problem-line">해결할 불편 · ${esc(problemText(i))}</p>`;
}
function editor(i: Idea) {
  return `<div class="idea-editor"><div class="idea-palette" role="group" aria-label="부품 스티커">${ideaStickers.map(s => `<button type="button" class="idea-stick" data-sticker="${s.id}" aria-pressed="false">${paletteIcon(s.id)}<span>${s.label}</span></button>`).join('')}</div>
    <div class="idea-board"><svg id="idea-canvas" viewBox="0 0 ${boardSize.w} ${boardSize.h}" tabindex="0" role="application" aria-label="설계 판. 스티커를 고른 뒤 판을 눌러 붙여 줘.">${boardLayers(i)}</svg></div>
    <div class="idea-tools" role="group" aria-label="그리기 도구"><button type="button" data-tool="pen" aria-pressed="true">펜</button><button type="button" data-tool="arrow" aria-pressed="false">힘 화살표</button><button type="button" data-tool="move" aria-pressed="false">옮기기</button><button type="button" data-edit="flip" disabled>극 뒤집기</button><button type="button" data-edit="remove" disabled>빼기</button><button type="button" data-edit="undo">되돌리기</button></div></div>`;
}
function checkStep(i: Idea) {
  const issues = ideaChecks(i);
  return `<div class="idea-check"><div class="idea-check-board">${ideaCard(i)}</div><div class="idea-check-result" role="status">${issues.length
    ? `<h2>조금만 고쳐 보자</h2><ul>${issues.map(text => `<li>${icon('light', 20)}<span>${text}</span></li>`).join('')}</ul><button type="button" class="btn primary" data-act="back">설계 고치러 가기</button>`
    : `<h2>${icon('check', 24)} 자석의 힘이 닿아!</h2><p>내가 쓴 성질 · ${propertyTitles(i).map(esc).join(', ')}</p><p>이제 발표회에서 친구들에게 소개해 보자.</p>`}</div></div>`;
}
function pitchStep(i: Idea) {
  const voice = canRecord()
    ? `<div class="idea-voice"><button type="button" class="btn primary" data-act="record">${icon('sound', 22)} ${i.voice ? '다시 녹음하기' : '내 목소리 녹음'}</button>${i.voice ? `<button type="button" class="btn" data-act="listen">${icon('play', 20)} 들어 보기</button><button type="button" class="btn" data-act="forget">녹음 지우기</button>` : ''}<small data-voice-status role="status">${i.voice ? '내 목소리를 저장했어.' : `최대 ${recordingLimit}초. 녹음은 이 기기에만 남아.`}</small></div><p class="idea-safe-note">이름이나 학교는 말하지 않아도 돼.</p>`
    : '<p class="idea-safe-note">이 기기에서는 녹음을 쓸 수 없어. 글로 소개해 줘.</p>';
  return `<div class="idea-pitch"><div><label for="idea-name">발명품 이름</label><input id="idea-name" maxlength="16" placeholder="예: 착착 지우개 집" value="${esc(i.name)}"><ol class="idea-prompts">${pitchPrompts.map(text => `<li>${text}</li>`).join('')}</ol></div><div>${voice}<label for="idea-pitch">글로 소개하기</label><textarea id="idea-pitch" maxlength="120" rows="3" placeholder="말하기 어려우면 글로 적어도 돼">${esc(i.pitch)}</textarea></div></div>`;
}
function showStep(i: Idea) {
  return `<div class="idea-show"><div class="idea-frame${i.shown ? ' is-hung' : ''}">${ideaCard(i)}</div><div class="idea-show-actions"><button type="button" class="btn primary" data-act="hang" ${i.shown ? 'disabled' : ''}>${i.shown ? `${icon('check', 20)} 전시 중` : '전시관에 걸기'}</button><button type="button" class="btn" data-act="present">크게 띄워 발표하기</button>${i.voice ? `<button type="button" class="btn" data-act="listen">${icon('play', 20)} 내 목소리 듣기</button>` : ''}<button type="button" class="btn" data-act="export">카드 이미지 저장</button><small data-voice-status role="status"></small></div></div>`;
}
const feedbackLine = (f: IdeaFeedback) => `<b>${esc(f.from)} · ${feedbackStickers.find(k => k.id === f.sticker)?.label ?? ''}</b><span>${esc(f.question) || '좋았어!'}</span>`;
function feedbackStep(i: Idea) {
  return `<div class="idea-feedback"><form data-feedback-form><fieldset><legend>어떤 느낌이야?</legend>${feedbackStickers.map((k, n) => `<label><input type="radio" name="idea-sticker" value="${k.id}" ${n ? '' : 'checked'}><span>${k.label}</span></label>`).join('')}</fieldset><label for="idea-question">궁금한 점이나 고칠 생각</label><input id="idea-question" maxlength="40" placeholder="예: 자석이 떨어지면 어떡해?"><button type="submit" class="btn primary">의견 남기기</button></form>
    <div><ul class="idea-feedback-list">${i.feedback.map(f => `<li>${feedbackLine(f)}</li>`).join('') || '<li class="idea-empty">아직 받은 의견이 없어.</li>'}</ul><button type="button" class="btn" data-act="buddy">혼자 하고 있어 · 밀이·당이 의견 받기</button></div></div>`;
}
function reviseStep(i: Idea) {
  return `<div class="idea-revise"><div class="idea-revise-side"><div role="group" aria-label="반영할 의견">${i.feedback.map((f, n) => `<button type="button" class="idea-choice" data-feedback="${n}" aria-pressed="${i.chosen === n}">${feedbackLine(f)}</button>`).join('')}</div><label for="idea-change">무엇을 바꿨어?</label><textarea id="idea-change" maxlength="60" rows="2" placeholder="예: 자석을 더 가까이 옮겼어">${esc(i.change)}</textarea></div>${editor(i)}</div>`;
}
const bodies: Record<number, ((i: Idea) => string)[]> = { 9: [problemStep, propertyStep, editor, checkStep], 10: [pitchStep, showStep, feedbackStep, reviseStep] };

function bindEditor(c: Context, i: Idea, changed: () => void) {
  const svg = c.root.querySelector<SVGSVGElement>('#idea-canvas');
  if (!svg) return;
  let tool: 'pen' | 'arrow' | 'move' = 'pen', placing = '', selected = -1, drawing: 'stroke' | 'arrow' | 'drag' | '' = '';
  const history: ('stroke' | 'arrow' | 'sticker')[] = [];
  const buttons = <T extends HTMLElement>(selector: string) => c.root.querySelectorAll<T>(selector);
  const edit = (name: string) => c.root.querySelector<HTMLButtonElement>(`[data-edit="${name}"]`)!;
  const target = () => i.stickers.find(s => s.uid === selected);
  const paint = () => {
    svg.innerHTML = boardLayers(i, selected);
    buttons<HTMLButtonElement>('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(!placing && b.dataset.tool === tool)));
    buttons<HTMLButtonElement>('[data-sticker]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sticker === placing)));
    edit('flip').disabled = target()?.id !== 'magnet'; edit('remove').disabled = !target(); edit('undo').disabled = !history.length;
  };
  const commit = () => { i.checked = false; paint(); changed(); };
  const at = (e: PointerEvent): Point => {
    const box = svg.getBoundingClientRect(), round = (n: number) => Math.round(n * 10) / 10;
    return { x: round(Math.max(4, Math.min(boardSize.w - 4, (e.clientX - box.left) / box.width * boardSize.w))), y: round(Math.max(4, Math.min(boardSize.h - 4, (e.clientY - box.top) / box.height * boardSize.h))) };
  };
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') svg.setPointerCapture(e.pointerId);
    const p = at(e), hit = (e.target as Element).closest?.<SVGGElement>('[data-uid]');
    if (placing) {
      const uid = i.stickers.reduce((max, s) => Math.max(max, s.uid), 0) + 1;
      i.stickers.push({ uid, id: placing, ...p, ...(placing === 'magnet' ? { pole: 'N' as const } : {}) });
      history.push('sticker'); selected = uid; placing = ''; tool = 'move'; c.root.querySelector('.idea-buddy p')!.textContent = steps[c.screen][stepOf(c.screen, i)].buddy; playEffect('snap'); commit(); return;
    }
    if (tool === 'move') { selected = hit ? Number(hit.dataset.uid) : -1; if (hit) drawing = 'drag'; paint(); return; }
    if (tool === 'pen') { i.strokes.push([p]); drawing = 'stroke'; }
    else { i.arrows.push([p, p]); drawing = 'arrow'; }
    paint();
  });
  svg.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = at(e);
    if (drawing === 'drag') Object.assign(target()!, p);
    else if (drawing === 'arrow') i.arrows.at(-1)![1] = p;
    else { const line = i.strokes.at(-1)!, last = line.at(-1)!; if (Math.hypot(p.x - last.x, p.y - last.y) >= 1.2 && i.strokes.flat().length < 1500) line.push(p); }
    paint();
  });
  const finish = () => {
    if (!drawing) return;
    if (drawing === 'arrow') { const [a, b] = i.arrows.at(-1)!; if (Math.hypot(a.x - b.x, a.y - b.y) < 8) i.arrows.pop(); else history.push('arrow'); }
    if (drawing === 'stroke') history.push('stroke');
    drawing = ''; commit();
  };
  svg.addEventListener('pointerup', finish); svg.addEventListener('pointercancel', finish);
  svg.addEventListener('keydown', e => {
    const move: Record<string, Point> = { ArrowLeft: { x: -3, y: 0 }, ArrowRight: { x: 3, y: 0 }, ArrowUp: { x: 0, y: -3 }, ArrowDown: { x: 0, y: 3 } }, step = move[e.key], s = target();
    if (!step || !s) return;
    e.preventDefault(); s.x = Math.max(4, Math.min(boardSize.w - 4, s.x + step.x)); s.y = Math.max(4, Math.min(boardSize.h - 4, s.y + step.y)); commit();
  });
  buttons<HTMLButtonElement>('[data-sticker]').forEach(b => b.addEventListener('click', () => { placing = placing === b.dataset.sticker ? '' : b.dataset.sticker!; c.root.querySelector('.idea-buddy p')!.textContent = placing ? '판에서 붙일 곳을 눌러 줘.' : steps[c.screen][stepOf(c.screen, i)].buddy; paint(); }));
  buttons<HTMLButtonElement>('[data-tool]').forEach(b => b.addEventListener('click', () => { tool = b.dataset.tool as typeof tool; placing = ''; if (tool !== 'move') selected = -1; paint(); }));
  edit('flip').addEventListener('click', () => { const s = target(); if (s) { s.pole = s.pole === 'S' ? 'N' : 'S'; commit(); } });
  edit('remove').addEventListener('click', () => { i.stickers = i.stickers.filter(s => s.uid !== selected); selected = -1; commit(); });
  edit('undo').addEventListener('click', () => { const last = history.pop(); if (last === 'stroke') i.strokes.pop(); else if (last === 'arrow') i.arrows.pop(); else if (last === 'sticker') i.stickers.pop(); selected = -1; commit(); });
  paint();
}

function wrapped(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []; let line = '';
  for (const letter of text) { if (context.measureText(line + letter).width > width) { lines.push(line); line = ''; } line += letter; }
  return line ? [...lines, line] : lines;
}
/** The card leaves the app only as a picture the learner chooses to save; the voice never does. */
async function exportCard(i: Idea, notify: (text: string) => void) {
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 800;
  const g = canvas.getContext('2d')!, svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boardSize.w} ${boardSize.h}" width="800" height="450"><rect width="100%" height="100%" fill="#fffdf4"/>${boardLayers(i)}</svg>`;
  const image = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('card')); image.src = url; }).catch(() => undefined);
  URL.revokeObjectURL(url);
  g.fillStyle = '#fff4d6'; g.fillRect(0, 0, 1280, 800); g.fillStyle = '#24424a'; g.font = '700 54px "Noto Sans KR", sans-serif'; g.fillText(i.name.trim() || '내 발명', 48, 84);
  if (image.complete && image.naturalWidth) g.drawImage(image, 48, 120, 800, 450);
  g.font = '500 28px "Noto Sans KR", sans-serif'; let y = 160;
  for (const line of [['해결할 불편', problemText(i)], ['쓴 자석의 성질', propertyTitles(i).join(' · ')]].flatMap(([head, body]) => [head, ...wrapped(g, body, 340), ''])) { g.fillText(line, 888, y); y += 40; }
  y = 620; for (const line of wrapped(g, i.pitch.trim(), 1180).slice(0, 4)) { g.fillText(line, 48, y); y += 40; }
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return notify('카드를 만들지 못했어. 다시 눌러 봐.');
  const file = new File([blob], 'my-magnet-idea.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }).catch(() => undefined); return; }
  const link = document.createElement('a'), href = URL.createObjectURL(blob); link.href = href; link.download = file.name; link.click(); URL.revokeObjectURL(href);
  notify('카드 이미지를 저장했어.');
}

/** Stage five, used by every learner who is not partway through the earlier device tests. */
export function ideaView(screen: number, a: Activity, s: Save, preview = false): View {
  const i = s.idea ||= emptyIdea();
  const step = Math.min(3, Math.max(0, stepOf(screen, i))), info = steps[screen][step], last = step === 3;
  const gate = preview ? '' : ideaGate(screen, step, i), label = last ? screen === 9 ? '발표회로 가기' : '공방 완성하기' : '다음';
  if (screen === 9 && step === 3 && !ideaChecks(i).length) i.checked = true;
  const remember = () => {
    if (screen === 9 && i.checked) record(a, { key: 'idea', label: '내 발명 아이디어', result: `${problemText(i)} · ${propertyTitles(i).join(', ')}` });
    if (screen === 10 && ideaReady(10, i)) record(a, { key: 'share', label: '친구 의견으로 고친 점', result: `${i.name.trim()} · ${i.change.trim()}` });
  };
  remember();
  const html = `<div id="experiment-root" class="idea-lab screen-${screen}" data-idea-step="${step}">
    <header class="idea-head"><span class="stage-label">${stageNames[4]} · ${screen === 9 ? '아이디어 공방' : '발표회'}</span><h1>${info.title}</h1><ol class="idea-steps">${steps[screen].map((item, n) => `<li aria-current="${n === step ? 'step' : 'false'}" data-done="${n < step}">${n < step ? icon('check', 16) : n + 1}<span>${item.name}</span></li>`).join('')}</ol></header>
    <div class="idea-body">${bodies[screen][step](i)}</div>
    <footer class="idea-foot"><div class="idea-buddy">${mascot(step % 2 ? 'dangi' : 'mili', 72, 1)}<p>${info.buddy}</p></div><p class="idea-gate" role="status">${gate}</p><div class="idea-nav"><button type="button" class="btn" data-act="back" ${step ? '' : 'disabled'}>이전</button><button type="button" class="quest-cta idea-next" ${last ? 'data-action="complete"' : 'data-act="next"'} ${gate ? 'disabled' : ''}>${label} ${icon('arrow', 22)}</button></div></footer>
    <div class="idea-present" role="dialog" aria-modal="true" aria-label="내 발명 발표" hidden>${ideaCard(i)}<div>${i.voice ? `<button type="button" class="btn primary" data-act="listen">${icon('play', 22)} 내 목소리 듣기</button>` : ''}<button type="button" class="btn" data-act="present-close">닫기</button></div></div></div>`;
  return { html, bind(c) {
    const events = new AbortController(), signal = events.signal, root = c.root;
    let recording: Recording | null = null, stopVoice = () => {}, disposed = false;
    const refreshGate = () => {
      remember();
      const text = preview ? '' : ideaGate(screen, step, i);
      root.querySelector('.idea-gate')!.textContent = text;
      root.querySelector<HTMLButtonElement>('.idea-next')!.disabled = !!text;
    };
    const act = (name: string, fn: () => void) => root.querySelectorAll<HTMLElement>(`[data-act="${name}"]`).forEach(b => b.addEventListener('click', fn, { signal }));
    const typed = (selector: string, fn: (value: string) => void) => root.querySelector<HTMLInputElement>(selector)?.addEventListener('input', e => { fn((e.target as HTMLInputElement).value); c.touch(); refreshGate(); }, { signal });
    const status = (text: string) => root.querySelectorAll('[data-voice-status]').forEach(el => { el.textContent = text; });
    const move = (n: number) => { setStep(screen, i, n); update(c); };

    act('next', () => { if (preview || !ideaGate(screen, step, i)) { playEffect('click'); move(step + 1); } });
    act('back', () => { if (step) move(step - 1); });
    root.querySelectorAll<HTMLButtonElement>('[data-problem]').forEach(b => b.addEventListener('click', () => { i.problem = b.dataset.problem!; update(c); }, { signal }));
    root.querySelector('#idea-custom')?.addEventListener('focus', () => { if (i.problem !== 'custom') { i.problem = 'custom'; root.querySelectorAll('[data-problem]').forEach(b => b.setAttribute('aria-pressed', 'false')); root.querySelector<HTMLElement>('.idea-custom')!.dataset.selected = 'true'; refreshGate(); } }, { signal });
    typed('#idea-custom', value => { i.custom = value; });
    root.querySelectorAll<HTMLButtonElement>('[data-property]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.property!;
      if (i.properties.includes(id)) i.properties = i.properties.filter(p => p !== id);
      else if (i.properties.length >= 2) return c.notify('성질은 두 개까지 고를 수 있어.');
      else i.properties.push(id);
      i.checked = false; update(c);
    }, { signal }));
    typed('#idea-name', value => { i.name = value; });
    typed('#idea-pitch', value => { i.pitch = value; });
    typed('#idea-change', value => { i.change = value; });
    bindEditor(c, i, () => { c.touch(); refreshGate(); });

    const stopRecording = () => { recording?.stop(); };
    act('record', async () => {
      if (recording) return stopRecording();
      stopVoice(); setAudioPaused(true);
      const button = root.querySelector<HTMLButtonElement>('[data-act="record"]')!;
      const started = await startRecording({
        onTick: left => { button.textContent = `■ 그만 녹음하기 (${left}초)`; },
        onError: message => { recording = null; setAudioPaused(false); status(message); button.textContent = '내 목소리 녹음'; },
        onDone: async blob => {
          recording = null; setAudioPaused(false);
          if (disposed) return;
          try { await saveRecording(blob, preview); i.voice = true; c.touch(); playEffect('success'); update(c); }
          catch { status('녹음을 저장하지 못했어. 글로 소개해 줘.'); }
        },
      });
      if (disposed) started?.cancel(); else recording = started;
    });
    act('forget', () => { i.voice = false; update(c); });
    act('listen', async () => {
      stopVoice();
      const blob = await loadRecording(preview).catch(() => undefined);
      if (disposed) return;
      if (!blob) return status('녹음을 찾지 못했어. 다시 녹음해 줘.');
      const url = URL.createObjectURL(blob);
      const stop = playNarration(url, s.settings, state => {
        if (state === 'muted') status('소리 설정에서 효과음을 켜 줘.');
        if (state !== 'loading' && state !== 'playing') URL.revokeObjectURL(url);
      });
      stopVoice = stop;
    });
    act('hang', () => { i.shown = true; playEffect('reward'); update(c); });
    const present = root.querySelector<HTMLElement>('.idea-present')!;
    act('present', () => { present.hidden = false; present.querySelector<HTMLButtonElement>('button')?.focus(); });
    act('present-close', () => { stopVoice(); present.hidden = true; root.querySelector<HTMLButtonElement>('[data-act="present"]')?.focus(); });
    present.addEventListener('keydown', e => { if (e.key === 'Escape') { stopVoice(); present.hidden = true; } }, { signal });
    act('export', () => { void exportCard(i, c.notify); });

    root.querySelector<HTMLFormElement>('[data-feedback-form]')?.addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target as HTMLFormElement, sticker = new FormData(form).get('idea-sticker') as IdeaFeedback['sticker'];
      i.feedback.push({ from: '친구', sticker, question: root.querySelector<HTMLInputElement>('#idea-question')!.value.trim() });
      playEffect('success'); update(c);
    }, { signal });
    act('buddy', () => { for (const f of buddyFeedback(i)) if (!i.feedback.some(item => item.question === f.question)) i.feedback.push(f); update(c); });
    root.querySelectorAll<HTMLButtonElement>('[data-feedback]').forEach(b => b.addEventListener('click', () => {
      i.chosen = Number(b.dataset.feedback); c.touch();
      root.querySelectorAll('[data-feedback]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      refreshGate();
    }, { signal }));
    return () => { disposed = true; events.abort(); stopVoice(); if (recording) { recording.cancel(); recording = null; setAudioPaused(false); } };
  } };
}
