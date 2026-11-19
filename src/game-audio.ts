/** User-supplied music and local CC0 effects with procedural fallback. */
export interface AudioSettings {
  sound?: boolean;
  music?: boolean;
  /** Interface, fight, reward and footstep sounds (and the films' own soundtracks). Voices have their own switch. */
  effects?: boolean;
  /** Character lines, narration, villain bubbles and concept caption voices. Older saves follow the effects switch. */
  voice?: boolean;
  /** Background music volume, 0…1. */
  musicVolume?: number;
  /** Multiplies every effect bus (interface, fight, reward, footsteps), 0…1. 1 keeps the levels as they were before it existed. */
  effectsVolume?: number;
}
export type EffectKind = 'click' | 'pick' | 'drop' | 'compare' | 'success' | 'reward' | 'bump' | 'error' | 'step' | 'snap' | 'lid' | 'pad' | 'crate' | 'jump' | 'fall' | EncounterKind | CardKind | UnlockKind;
/** A place on the map opens: the latch, then a short sparkle 0.12 s later (playUnlock). */
export type UnlockKind = 'unlock-open' | 'unlock-shine';
/** Map villain cues. They layer on one another so a swing, its clank and the retreat are all heard. */
/** Achievement card cues: fly in, reveal (the rarest cards use the longer jingle), land in the slot, full set. */
export type CardKind = 'card-whoosh' | 'card-reveal' | 'card-epic' | 'card-slot' | 'card-complete';
export type EncounterKind = 'encounter-swing' | 'encounter-one' | 'encounter-two' | 'encounter-finish' | 'encounter-exit' | 'encounter-contact' | 'encounter-appear' | 'encounter-victory';

const EFFECT_GAIN = 0.16;
const DEFAULT_VOLUME = 0.35;
export type MusicTheme = 'main' | 'final';
const musicFiles: Record<MusicTheme, string> = { main: '/audio/music/main-theme.mp3', final: '/audio/music/finale-theme.mp3' };
let theme: MusicTheme = 'main';
// The page asks for a theme; the map finale dialog borrows the player for the final theme while it is open.
let pageTheme: MusicTheme = 'main', mapFinale = false;
// Why the music sits under something else, by label. The quietest label wins and the level
// returns only when every label is gone, so one owner can never undo another's.
const VOICE_DUCK = 0.25, STORY_DUCK = 0.6, FADE_MS = 200;
const ducks = new Map<string, number>();
// The final theme plays once. If the learner is still on a final screen when it ends, the main theme
// carries on at 45% instead of silence; leaving the screen brings back the plain level.
const AFTER_FINAL = 0.45;
let finalSpent = false;
let fadeTimer: ReturnType<typeof setInterval> | undefined, fadeTarget = 0;
let music: HTMLAudioElement | undefined;
let musicPlayPending = false, musicRevision = 0;
export type NarrationState = 'loading' | 'playing' | 'ended' | 'stopped' | 'blocked' | 'unavailable' | 'muted';
let narration: { audio: HTMLAudioElement; stop: (state: NarrationState) => void } | undefined;
/** True from the moment a voice is asked for until it ends or is stopped. */
export const narrationActive = () => narration !== undefined;
/** A film under the voices (the concept clips) listens for this to lower its own soundtrack while a line is read. */
export const NARRATION_EVENT = 'game-narration';
const narrationChanged = () => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent(NARRATION_EVENT, { detail: { active: narration !== undefined } })); };
type Voice = { oscillator: OscillatorNode; gain: GainNode };
let current: AudioSettings = {};
let context: AudioContext | undefined;
let effectBus: GainNode | undefined;
// Map fight cues have their own bus: a voice lowers them to 80% at most, never mutes them (VILLAIN-VOICE-SFX-FIX-20261118).
let encounterBus: GainNode | undefined;
const ENCOUNTER_UNDER_VOICE = 0.8;
let effectVoices: Voice[] = [];
const layeredNotes: Voice[] = [];
let explicitlyPaused = false;
let installed = false;
let activated = false;
const sampleFiles: Partial<Record<EffectKind,string>> = { click:'click',pick:'pick',drop:'drop',compare:'compare',success:'success',reward:'reward',bump:'bump',error:'bump',step:'step',snap:'snap',lid:'lid',pad:'pad',crate:'crate',jump:'run-jump',fall:'map-bump',
  'unlock-open':'map-open','unlock-shine':'map-twinkle',
  'encounter-swing':'map-zap','encounter-one':'map-clank-one','encounter-two':'map-clank-two','encounter-finish':'map-hit-heavy',
  'encounter-exit':'map-exit','encounter-contact':'map-bump','encounter-appear':'map-appear','encounter-victory':'map-victory',
  'card-whoosh':'card-whoosh','card-reveal':'card-reveal','card-epic':'card-epic','card-slot':'card-slot','card-complete':'card-complete' };
// The clank lands on the villain's flinch (its squash peaks about 90 ms after the press);
// the retreat follows the shrinking exit pose. Levels keep a hit above the swing and the arrival quiet.
const encounterDelay: Partial<Record<EffectKind, number>> = { 'encounter-one': .07, 'encounter-two': .07, 'encounter-finish': .07, 'encounter-exit': .3, 'unlock-shine': .12 };
const sampleGain: Partial<Record<EffectKind, number>> = { step: .25, jump: .4, fall: .6, 'unlock-open': .7, 'unlock-shine': .5, 'encounter-swing': .5, 'encounter-one': .62, 'encounter-two': .55, 'encounter-finish': .85, 'encounter-exit': .4, 'encounter-contact': .6, 'encounter-appear': .3, 'encounter-victory': .6 };
// Fight, card and unlock cues ring out together (four at most); interface feedback and footsteps never cut them.
const isLayered = (kind: EffectKind) => /^(encounter|card|unlock)-/.test(kind);
const LAYERED_VOICES = 4;
const sampleBuffers = new Map<string, AudioBuffer>();
const sampleLoads = new Map<string, Promise<void>>();
const sampleVoices = new Set<AudioBufferSourceNode>();
const encounterVoices = new Set<AudioBufferSourceNode>();
let samplesRequested = false, lastEffect = 0;
// When each cue stops sounding (Date.now() time), so the map finale can wait for the full-set jingle.
const ringing = new Map<EffectKind, number>();
/** True while the last cue of this kind is still sounding. */
export const effectRinging = (kind: EffectKind) => (ringing.get(kind) ?? 0) > Date.now();
// The full-set card jingle is the fanfare for driving off every villain. The separate victory jingle
// only plays when no card jingle came before it, so the two never ring over each other.
let cardFanfare = false;
// Footsteps: their own voice and bus. A step replaces only the previous step.
const STEP_GAIN = 0.12, STEP_UNDER_VOICE = 0.5;
let stepBus: GainNode | undefined, stepVoice: AudioBufferSourceNode | undefined, stepCount = 0;
// A voice that would start over an unlock cue waits for it.
const UNLOCK_MS = 450;
let unlockTimer: ReturnType<typeof setTimeout> | undefined, voiceHoldUntil = 0;

function stopSamples(all = true) {
  for(const voices of all?[sampleVoices,encounterVoices]:[sampleVoices]){
    for(const voice of voices){try{voice.stop();}catch{}voice.disconnect();}
    voices.clear();
  }
  if(!all)return;
  if(stepVoice){try{stepVoice.stop();}catch{}stepVoice.disconnect();stepVoice=undefined;}
  if(unlockTimer!==undefined){clearTimeout(unlockTimer);unlockTimer=undefined;}
  voiceHoldUntil=0;ringing.clear();
}
function loadSamples() {
  if(samplesRequested || !context?.decodeAudioData || typeof fetch==='undefined')return;
  samplesRequested=true;
  const owner=context;
  for(const name of new Set(Object.values(sampleFiles))) {
    const load=fetch(`/audio/${name}.mp3`).then(r=>{if(!r.ok)throw new Error('audio unavailable');return r.arrayBuffer();}).then(data=>owner.decodeAudioData(data)).then(buffer=>{if(context===owner)sampleBuffers.set(name,buffer);}).catch(()=>{}).finally(()=>sampleLoads.delete(name));
    sampleLoads.set(name,load);
  }
}

export function normalizedAudioSettings(settings: AudioSettings) {
  const effects = settings.effects ?? settings.sound ?? true;
  return {
    music: settings.music ?? settings.sound ?? true,
    effects,
    // Voices used to follow the effects switch, so a save without its own value keeps hearing what it heard.
    voice: settings.voice ?? effects,
    musicVolume: Number.isFinite(settings.musicVolume) ? Math.max(0, Math.min(1, settings.musicVolume!)) : DEFAULT_VOLUME,
    effectsVolume: Number.isFinite(settings.effectsVolume) ? Math.max(0, Math.min(1, settings.effectsVolume!)) : 1,
  };
}
/** True when any of music, effects or voices can be heard (the header sound button). */
export const anySoundOn = (settings: AudioSettings) => { const a = normalizedAudioSettings(settings); return a.music || a.effects || a.voice; };

const isHidden = () => typeof document !== 'undefined' && document.hidden;
const paused = () => explicitlyPaused || isHidden();

function silence(voices: Voice[]) {
  for (const { oscillator, gain } of voices.splice(0)) {
    try { oscillator.stop(); } catch { /* An already finished note needs no further cleanup. */ }
    oscillator.disconnect(); gain.disconnect();
  }
}

function makeContext() {
  if (context || typeof window === 'undefined') return;
  const Constructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return;
  try {
    context = new Constructor();
    effectBus = context.createGain(); effectBus.gain.value = EFFECT_GAIN; effectBus.connect(context.destination);
    encounterBus = context.createGain(); encounterBus.gain.value = EFFECT_GAIN; encounterBus.connect(context.destination);
  } catch { context = undefined; /* Audio availability must never block the activity. */ }
}

function settleFade() {
  if (fadeTimer === undefined) return;
  clearInterval(fadeTimer); fadeTimer = undefined;
  if (music) music.volume = fadeTarget;
}
/** Glide to a level over a fifth of a second so a voice never makes the music jump. */
function fadeMusic(target: number) {
  if (!music || (fadeTimer !== undefined && target === fadeTarget)) return;
  if (fadeTimer !== undefined) { clearInterval(fadeTimer); fadeTimer = undefined; }
  fadeTarget = target;
  const player = music, from = player.volume, began = Date.now();
  // A stopped player has nothing to glide from.
  if (player.paused || Math.abs(from - target) < 0.005) { player.volume = target; return; }
  fadeTimer = setInterval(() => {
    const part = Math.min(1, (Date.now() - began) / FADE_MS);
    if (part >= 1) settleFade(); else player.volume = from + (target - from) * part;
  }, 25);
}

function pauseMusic() { musicRevision++; musicPlayPending = false; settleFade(); music?.pause(); }

function applyMusic() {
  const settings = normalizedAudioSettings(current);
  if (!activated || paused() || !settings.music || settings.musicVolume === 0) { pauseMusic(); return; }
  if (!music && typeof document !== 'undefined') {
    music = document.createElement('audio');
    music.hidden = true; music.preload = 'metadata'; music.dataset.gameMusic = theme;
    music.src = musicFiles[theme]; music.loop = theme === 'main'; document.body.append(music);
    music.onended = () => { if (theme === 'final' && !finalSpent) { finalSpent = true; useTheme('final'); } };
  }
  if (!music) return;
  fadeMusic(settings.musicVolume * Math.min(1, narration ? VOICE_DUCK : 1, ...ducks.values()));
  if (!music.paused || music.ended || musicPlayPending) return;
  musicPlayPending = true;
  const revision = musicRevision;
  // Autoplay denial is retried on the next pointer/key gesture.
  void music.play().catch(() => {}).finally(() => { if (revision === musicRevision) musicPlayPending = false; });
}

/** Keep the music under a film's voices (60% unless told otherwise) without touching the saved volume. */
export function setMusicDuck(label: string, active: boolean, level = STORY_DUCK) {
  if (active) ducks.set(label, Math.max(0, Math.min(1, level))); else ducks.delete(label);
  applyMusic();
}

function useTheme(next: MusicTheme, restart = false) {
  if (next !== 'final' || restart) finalSpent = false;
  if (finalSpent) { next = 'main'; ducks.set('after-final', AFTER_FINAL); } else ducks.delete('after-final');
  if (next !== theme || restart) {
    theme = next; pauseMusic();
    if (music) { music.src = musicFiles[theme]; music.loop = theme === 'main'; music.dataset.gameMusic = theme; music.load(); }
  }
  applyMusic();
}

/** One persistent player keeps the main theme continuous across pages. */
export function setMusicTheme(next: MusicTheme, restart = false) {
  pageTheme = next;
  if (mapFinale) applyMusic(); else useTheme(next, restart);
}

// map-finale.js announces its dialog: the final theme plays from the top while it is open (its film stays muted),
// and the page's own theme returns when it closes.
function mapFinaleChanged(event: Event) {
  const open = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open);
  if (open === mapFinale) return;
  mapFinale = open; useTheme(open ? 'final' : pageTheme, open);
}

function note(frequency: number, when: number, duration: number, bus: GainNode, voices: Voice[], strength: number, type: OscillatorType = 'sine') {
  if (!context) return;
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(strength, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  oscillator.connect(gain); gain.connect(bus);
  const voice = { oscillator, gain }; voices.push(voice);
  oscillator.onended = () => {
    const index = voices.indexOf(voice); if (index >= 0) voices.splice(index, 1);
    oscillator.disconnect(); gain.disconnect();
  };
  oscillator.start(when); oscillator.stop(when + duration + 0.025);
}

function apply() {
  if (narration && (!normalizedAudioSettings(current).voice || paused())) {
    narration.stop(paused() ? 'stopped' : 'muted');
  }
  applyMusic();
  if (!context || !effectBus) return;
  const settings = normalizedAudioSettings(current), level = settings.effectsVolume;
  effectBus.gain.value = EFFECT_GAIN * level * (narration ? 0.3 : 1);
  if (encounterBus) encounterBus.gain.value = EFFECT_GAIN * level * (narration ? ENCOUNTER_UNDER_VOICE : 1);
  if (stepBus) stepBus.gain.value = STEP_GAIN * level * (narration ? STEP_UNDER_VOICE : 1);
  if (!settings.effects || paused()) { silence(effectVoices); silence(layeredNotes); stopSamples(); }
}

function activate() {
  if (paused()) return;
  activated = true; makeContext(); loadSamples();
  // Start HTML audio in the gesture itself. A suspended effects context must not delay music.
  apply();
  if (context?.state === 'suspended') void context.resume().catch(() => { /* Retry on the next gesture. */ });
}

function visibilityChanged() {
  if (isHidden()) {
    narration?.stop('stopped');
    pauseMusic();
    silence(effectVoices); silence(layeredNotes); stopSamples();
    if (context?.state === 'running') void context.suspend().catch(() => {});
  } else if (activated && !explicitlyPaused) activate();
}

/** Installs one gesture retry and one visibility listener. Safe to call during every render. */
export function ensureAudio(settings: AudioSettings) {
  current = { ...settings };
  if (!installed && typeof document !== 'undefined') {
    installed = true;
    document.addEventListener('pointerdown', activate, { passive: true });
    document.addEventListener('keydown', activate);
    document.addEventListener('visibilitychange', visibilityChanged);
    document.addEventListener('map-finale', mapFinaleChanged);
  }
  if (typeof navigator !== 'undefined' && navigator.userActivation?.isActive) activate();
  else apply();
}

export function syncAudioSettings(settings: AudioSettings) { ensureAudio(settings); }

/** A dialogue owns its voice. Replacing it or closing the dialogue cancels pending playback too. */
export function playNarration(src: string, settings: AudioSettings = current, onState?: (state: NarrationState) => void): () => void {
  narration?.stop('stopped');
  ensureAudio(settings);
  if (!normalizedAudioSettings(current).voice) { onState?.('muted'); return () => {}; }
  if (paused()) { onState?.('stopped'); return () => {}; }
  if (typeof document === 'undefined') { onState?.('unavailable'); return () => {}; }
  activate();
  const audio = document.createElement('audio');
  audio.hidden = true; audio.preload = 'none'; audio.src = src; audio.volume = 0.95;
  audio.dataset.residentVoice = 'true';
  document.body.append(audio);
  let finished = false, held: ReturnType<typeof setTimeout> | undefined;
  const finish = (state: NarrationState) => {
    if (finished) return;
    finished = true;
    if (held !== undefined) clearTimeout(held);
    audio.onended = null; audio.onerror = null;
    audio.onplaying = null; audio.onwaiting = null; audio.onpause = null;
    audio.pause(); audio.removeAttribute('src'); audio.load(); audio.remove();
    if (narration?.audio === audio) { narration = undefined; narrationChanged(); }
    apply(); onState?.(state);
  };
  narration = { audio, stop: finish }; narrationChanged();
  audio.onended = () => finish('ended');
  audio.onerror = () => finish('unavailable');
  // The portrait speaks only while sound is audible; buffering and pauses rest it.
  audio.onplaying = () => { if (!finished) onState?.('playing'); };
  audio.onwaiting = audio.onpause = () => { if (!finished) onState?.('loading'); };
  apply(); onState?.('loading');
  const begin = () => {
    held = undefined;
    try {
      void audio.play().then(() => {
        if (finished) { audio.pause(); return; }
        onState?.('playing');
      }).catch(error => {
        finish(error?.name === 'NotAllowedError' ? 'blocked' : 'unavailable');
      });
    } catch { finish('unavailable'); }
  };
  const wait = voiceHoldUntil - Date.now();
  if (wait > 0) held = setTimeout(begin, wait); else begin();
  return () => finish('stopped');
}

/** A new interface effect replaces the previous interface effect, including its scheduled notes. */
export function playEffect(kind: EffectKind, settings: AudioSettings = current) {
  ensureAudio(settings);
  if (!normalizedAudioSettings(current).effects || paused()) return;
  activate();
  if (!context || !effectBus) return;
  // Repeated feedback from animation frames must never create a wall of sound.
  const nowMs=Date.now();if((kind==='step'||kind==='bump')&&nowMs-lastEffect<160)return;lastEffect=nowMs;
  if(kind==='card-complete')cardFanfare=true;
  else if(kind==='encounter-victory'&&cardFanfare){cardFanfare=false;return;}
  // A new interface sound replaces the previous interface sound only; fight, card and unlock cues ring out together until muted or paused.
  const layered=isLayered(kind);
  if(!layered){silence(effectVoices); stopSamples(false);}
  const name=sampleFiles[kind]||'',buffer=sampleBuffers.get(name),loading=sampleLoads.get(name);
  // A villain seen the moment the map opens can beat its sample's decode; wait briefly instead of beeping.
  if(!buffer&&layered&&loading){const asked=Date.now();void loading.then(()=>{if(Date.now()-asked<700)playEffect(kind);});return;}
  if(buffer&&context.createBufferSource){
    const voices=layered?encounterVoices:sampleVoices;
    if(layered&&voices.size>=LAYERED_VOICES){const [oldest]=voices;voices.delete(oldest);try{oldest.stop();}catch{}}
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=sampleGain[kind]??.72;source.connect(gain);gain.connect(layered&&encounterBus?encounterBus:effectBus);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};source.start(context.currentTime+(encounterDelay[kind]??0));
    ringing.set(kind,nowMs+((encounterDelay[kind]??0)+(buffer.duration||0))*1000);return;
  }
  const notes: Record<EffectKind, number[]> = {
    'encounter-swing':[1180,760], 'encounter-one':[980,510], 'encounter-two':[790,510,312], 'encounter-finish':[630,520,390,250],
    'encounter-exit':[520,390,260], 'encounter-contact':[880,422], 'encounter-appear':[392,523], 'encounter-victory':[523,659,784,1047],
    'card-whoosh':[660,880], 'card-reveal':[659,784,1047], 'card-epic':[523,659,784,1047,1319], 'card-slot':[880,1175], 'card-complete':[523,659,784,1047],
    click: [520, 660], pick: [440, 587], drop: [587, 784], compare: [523, 659, 784],
    success: [523, 659, 784], reward: [523, 659, 784, 1047],
    bump: [294, 294], error: [294, 294], step: [392], snap: [920, 460], lid: [260], pad: [310], crate: [190, 285], jump: [440, 660], fall: [330, 196],
    'unlock-open': [392, 587], 'unlock-shine': [1175, 1568],
  };
  const frequencies = notes[kind] ?? notes.click, now = context.currentTime + 0.005 + (encounterDelay[kind] ?? 0);
  // Layered notes are kept apart from interface notes, so the next click does not cut them.
  frequencies.forEach((frequency, i) => note(frequency, now + i * 0.075, kind === 'reward' ? 0.25 : 0.12, (layered && encounterBus) || effectBus!, layered ? layeredNotes : effectVoices, kind === 'step' ? 0.12 : 0.48, 'triangle'));
  ringing.set(kind, nowMs + ((encounterDelay[kind] ?? 0) + frequencies.length * 0.075 + 0.12) * 1000);
}

/**
 * One footfall of the walking hero. Call it while she really moves, about every 0.3 s.
 * It never cuts another sound and no other sound cuts it; a voice halves it. Without the sample it stays silent.
 */
export function playFootstep() {
  if (!activated || !context || !normalizedAudioSettings(current).effects || paused()) return;
  const buffer = sampleBuffers.get('step');
  if (!buffer || !context.createBufferSource) return;
  if (!stepBus) { stepBus = context.createGain(); stepBus.connect(context.destination); }
  stepBus.gain.value = STEP_GAIN * normalizedAudioSettings(current).effectsVolume * (narration ? STEP_UNDER_VOICE : 1);
  if (stepVoice) { try { stepVoice.stop(); } catch { /* Already over. */ } }
  const source = context.createBufferSource(); source.buffer = buffer;
  // Left and right feet differ a little and no two steps are alike, all within 6% of the recorded speed.
  source.playbackRate.value = (stepCount++ % 2 ? .97 : 1.03) + (Math.random() - .5) * .06;
  source.connect(stepBus); stepVoice = source;
  source.onended = () => { if (stepVoice === source) stepVoice = undefined; source.disconnect(); };
  source.start();
}

/**
 * A place on the map opens. `after` (ms) lets the completion sound finish first;
 * a voice that starts meanwhile waits until the cue is out.
 */
export function playUnlock(settings: AudioSettings = current, after = 0) {
  ensureAudio(settings);
  if (!normalizedAudioSettings(current).effects || paused()) return;
  if (unlockTimer !== undefined) clearTimeout(unlockTimer);
  voiceHoldUntil = Date.now() + after + UNLOCK_MS;
  unlockTimer = setTimeout(() => { unlockTimer = undefined; playEffect('unlock-open'); playEffect('unlock-shine'); }, after);
}

/** Quiet audio during story/video playback and explicit game suspension. */
export function setAudioPaused(value: boolean) {
  explicitlyPaused = value;
  if (value) { narration?.stop('stopped'); pauseMusic(); silence(effectVoices); silence(layeredNotes); stopSamples(); }
  else if (activated) activate();
}

export function disposeAudio() {
  explicitlyPaused = true; narration?.stop('stopped');
  settleFade(); ducks.clear(); mapFinale = false; pageTheme = 'main'; finalSpent = false;
  music?.pause(); music?.remove(); music = undefined; theme = 'main'; musicRevision++; musicPlayPending = false;
  silence(effectVoices); silence(layeredNotes); stopSamples(); sampleBuffers.clear(); sampleLoads.clear(); samplesRequested=false;lastEffect=0;
  cardFanfare = false; stepCount = 0;
  if (installed && typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', activate);
    document.removeEventListener('keydown', activate);
    document.removeEventListener('visibilitychange', visibilityChanged);
    document.removeEventListener('map-finale', mapFinaleChanged);
  }
  installed = false; activated = false; explicitlyPaused = false;
  const oldContext = context; context = undefined; effectBus = undefined; encounterBus = undefined; stepBus = undefined;
  if (oldContext && oldContext.state !== 'closed') void oldContext.close().catch(() => {});
}
