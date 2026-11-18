import { playNarration } from './game-audio';
import { voiceLines } from './voice-lines-data';

// Reads popup text aloud with the recorded ElevenLabs line whose words match exactly what is on screen.
// Lines go through playNarration, so one voice plays at a time, the music ducks and the effects setting mutes it.
const norm = (text: string | null | undefined) => String(text ?? '').replace(/\s+/g, '');
const lines = new Map(voiceLines.map(([text, src]) => [norm(text), src]));
export function voiceFor(text: string | null | undefined): string { return lines.get(norm(text)) ?? ''; }

const WATCH = '.story-card-line,.concept-caption,#discovery-question,.inquiry-feedback,#final-question-title,.final-answer-feedback span,#idea-example-how,.idea-example-note,.science-note p:not(.science-check),.idea-buddy p,.idea-feedback-list span,.coach-clue,.map-encounter-say';
// Video captions change every few seconds: the next one waits for the current line instead of cutting it off.
const QUEUED = '.concept-caption,.idea-feedback-list span,.idea-example-note';
let current: object | undefined, stop: (() => void) | undefined, owner: Element | undefined, playing = false, pending: [string, Element][] = [], lastSrc = '', lastAt = 0;
const seen = new WeakMap<Element, string>();
const visible = (el: Element) => el.isConnected && !el.closest('[hidden]') && el.getClientRects().length > 0;

// A villain line said on a hit (data-voice-delay) starts after the fight cue instead of over it.
let delayed: ReturnType<typeof setTimeout> | undefined;
function startAfterCue(src: string, el: Element, ms: number) {
  stopVoiceLine();
  const text = seen.get(el);
  delayed = setTimeout(() => { delayed = undefined; if (visible(el) && seen.get(el) === text) start(src, el); }, ms);
}
export function stopVoiceLine() { if (delayed) { clearTimeout(delayed); delayed = undefined; } pending = []; const s = stop; current = undefined; stop = undefined; owner = undefined; playing = false; s?.(); }
function start(src: string, el: Element) {
  stopVoiceLine();
  const token = {};
  current = token; owner = el; playing = true; lastSrc = src; lastAt = Date.now();
  stop = playNarration(src, undefined, state => {
    if (state === 'loading' || state === 'playing' || current !== token) return;
    current = undefined; playing = false; stop = undefined; owner = undefined;
    const next = pending.shift();
    if (state === 'ended' && next && next[1].isConnected) start(...next);
  });
}
function scan() {
  if (owner && !visible(owner)) stopVoiceLine();
  for (const el of document.querySelectorAll(WATCH)) {
    const text = visible(el) ? norm(el.textContent) : '';
    if (seen.get(el) === text) continue;
    seen.set(el, text);
    const src = voiceFor(text);
    // A re-render of the same popup must not start the same line again.
    if (!src || (src === lastSrc && (playing || Date.now() - lastAt < 8000))) continue;
    if (playing && el.matches(QUEUED)) { if (!pending.some(p => p[0] === src)) pending.push([src, el]); }
    else {
      const wait = Number((el as HTMLElement).dataset?.voiceDelay) || 0;
      if (wait > 0) startAfterCue(src, el, wait); else start(src, el);
    }
  }
}
let frame = 0;
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; scan(); }); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'open'] });
}
