/** User-supplied music and local CC0 effects with procedural fallback. */
export interface AudioSettings {
  sound?: boolean;
  music?: boolean;
  effects?: boolean;
  /** Background music volume, 0…1. Effects keep a separate fixed level. */
  musicVolume?: number;
}
export type EffectKind = 'click' | 'pick' | 'drop' | 'compare' | 'success' | 'reward' | 'bump' | 'error' | 'step' | 'snap' | 'lid' | 'pad' | 'crate' | EncounterKind | CardKind;
/** Map villain cues. They layer on one another so a swing, its clank and the retreat are all heard. */
/** Achievement card cues: fly in, reveal (the rarest cards use the longer jingle), land in the slot, full set. */
export type CardKind = 'card-whoosh' | 'card-reveal' | 'card-epic' | 'card-slot' | 'card-complete';
export type EncounterKind = 'encounter-swing' | 'encounter-one' | 'encounter-two' | 'encounter-finish' | 'encounter-exit' | 'encounter-contact' | 'encounter-appear' | 'encounter-victory';

const EFFECT_GAIN = 0.16;
const DEFAULT_VOLUME = 0.35;
export type MusicTheme = 'main' | 'final';
const musicFiles: Record<MusicTheme, string> = { main: '/audio/music/main-theme.mp3', final: '/audio/music/finale-theme.mp3' };
let theme: MusicTheme = 'main';
let introMix = false;
let music: HTMLAudioElement | undefined;
let musicPlayPending = false, musicRevision = 0;
export type NarrationState = 'loading' | 'playing' | 'ended' | 'stopped' | 'blocked' | 'unavailable' | 'muted';
let narration: { audio: HTMLAudioElement; stop: (state: NarrationState) => void } | undefined;
type Voice = { oscillator: OscillatorNode; gain: GainNode };
let current: AudioSettings = {};
let context: AudioContext | undefined;
let effectBus: GainNode | undefined;
let effectVoices: Voice[] = [];
let explicitlyPaused = false;
let installed = false;
let activated = false;
const sampleFiles: Partial<Record<EffectKind,string>> = { click:'click',pick:'pick',drop:'drop',compare:'compare',success:'success',reward:'reward',bump:'bump',error:'bump',step:'step',snap:'snap',lid:'lid',pad:'pad',crate:'crate',
  'encounter-swing':'map-zap','encounter-one':'map-clank-one','encounter-two':'map-clank-two','encounter-finish':'map-hit-heavy',
  'encounter-exit':'map-exit','encounter-contact':'map-bump','encounter-appear':'map-appear','encounter-victory':'map-victory',
  'card-whoosh':'card-whoosh','card-reveal':'card-reveal','card-epic':'card-epic','card-slot':'card-slot','card-complete':'card-complete' };
// The clank lands on the villain's flinch (its squash peaks about 90 ms after the press);
// the retreat follows the shrinking exit pose. Levels keep a hit above the swing and the arrival quiet.
const encounterDelay: Partial<Record<EffectKind, number>> = { 'encounter-one': .07, 'encounter-two': .07, 'encounter-finish': .07, 'encounter-exit': .3 };
const sampleGain: Partial<Record<EffectKind, number>> = { step: .25, 'encounter-swing': .5, 'encounter-one': .62, 'encounter-two': .55, 'encounter-finish': .85, 'encounter-exit': .4, 'encounter-contact': .6, 'encounter-appear': .3, 'encounter-victory': .6 };
const isEncounter = (kind: EffectKind) => kind.startsWith('encounter-');
const sampleBuffers = new Map<string, AudioBuffer>();
const sampleLoads = new Map<string, Promise<void>>();
const sampleVoices = new Set<AudioBufferSourceNode>();
const encounterVoices = new Set<AudioBufferSourceNode>();
let samplesRequested = false, lastEffect = 0;

function stopSamples(all = true) {
  for(const voices of all?[sampleVoices,encounterVoices]:[sampleVoices]){
    for(const voice of voices){try{voice.stop();}catch{}voice.disconnect();}
    voices.clear();
  }
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
  return {
    music: settings.music ?? settings.sound ?? true,
    effects: settings.effects ?? settings.sound ?? true,
    musicVolume: Number.isFinite(settings.musicVolume) ? Math.max(0, Math.min(1, settings.musicVolume!)) : DEFAULT_VOLUME,
  };
}

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
  } catch { context = undefined; /* Audio availability must never block the activity. */ }
}

function pauseMusic() { musicRevision++; musicPlayPending = false; music?.pause(); }

function applyMusic() {
  const settings = normalizedAudioSettings(current);
  if (!activated || paused() || !settings.music || settings.musicVolume === 0) { pauseMusic(); return; }
  if (!music && typeof document !== 'undefined') {
    music = document.createElement('audio');
    music.hidden = true; music.preload = 'metadata'; music.dataset.gameMusic = theme;
    music.src = musicFiles[theme]; music.loop = theme === 'main'; document.body.append(music);
  }
  if (!music) return;
  music.volume = Math.min(1, settings.musicVolume * (introMix ? 1.5 : 1) * (narration ? 0.25 : 1));
  if (!music.paused || music.ended || musicPlayPending) return;
  musicPlayPending = true;
  const revision = musicRevision;
  // Autoplay denial is retried on the next pointer/key gesture.
  void music.play().catch(() => {}).finally(() => { if (revision === musicRevision) musicPlayPending = false; });
}

/** Balance the main theme against the intro voices while keeping the saved volume intact. */
export function setIntroMusicMix(active: boolean) { introMix = active; applyMusic(); }

/** One persistent player keeps the main theme continuous across pages. */
export function setMusicTheme(next: MusicTheme, restart = false) {
  if (next !== theme || restart) {
    theme = next; pauseMusic();
    if (music) { music.src = musicFiles[theme]; music.loop = theme === 'main'; music.dataset.gameMusic = theme; music.load(); }
  }
  applyMusic();
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
  if (narration && (!normalizedAudioSettings(current).effects || paused())) {
    narration.stop(paused() ? 'stopped' : 'muted');
  }
  applyMusic();
  if (!context || !effectBus) return;
  effectBus.gain.value = EFFECT_GAIN * (narration ? 0.3 : 1);
  const settings = normalizedAudioSettings(current);
  if (!settings.effects || paused()) { silence(effectVoices); stopSamples(); }
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
    silence(effectVoices); stopSamples();
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
  }
  if (typeof navigator !== 'undefined' && navigator.userActivation?.isActive) activate();
  else apply();
}

export function syncAudioSettings(settings: AudioSettings) { ensureAudio(settings); }

/** A dialogue owns its voice. Replacing it or closing the dialogue cancels pending playback too. */
export function playNarration(src: string, settings: AudioSettings = current, onState?: (state: NarrationState) => void): () => void {
  narration?.stop('stopped');
  ensureAudio(settings);
  if (!normalizedAudioSettings(current).effects) { onState?.('muted'); return () => {}; }
  if (paused()) { onState?.('stopped'); return () => {}; }
  if (typeof document === 'undefined') { onState?.('unavailable'); return () => {}; }
  activate();
  const audio = document.createElement('audio');
  audio.hidden = true; audio.preload = 'none'; audio.src = src; audio.volume = 0.95;
  audio.dataset.residentVoice = 'true';
  document.body.append(audio);
  let finished = false;
  const finish = (state: NarrationState) => {
    if (finished) return;
    finished = true;
    audio.onended = null; audio.onerror = null;
    audio.onplaying = null; audio.onwaiting = null; audio.onpause = null;
    audio.pause(); audio.removeAttribute('src'); audio.load(); audio.remove();
    if (narration?.audio === audio) narration = undefined;
    apply(); onState?.(state);
  };
  narration = { audio, stop: finish };
  audio.onended = () => finish('ended');
  audio.onerror = () => finish('unavailable');
  // The portrait speaks only while sound is audible; buffering and pauses rest it.
  audio.onplaying = () => { if (!finished) onState?.('playing'); };
  audio.onwaiting = audio.onpause = () => { if (!finished) onState?.('loading'); };
  apply(); onState?.('loading');
  try {
    void audio.play().then(() => {
      if (finished) { audio.pause(); return; }
      onState?.('playing');
    }).catch(error => {
      finish(error?.name === 'NotAllowedError' ? 'blocked' : 'unavailable');
    });
  } catch { finish('unavailable'); }
  return () => finish('stopped');
}

/** A new effect always replaces the previous effect, including its scheduled notes. */
export function playEffect(kind: EffectKind, settings: AudioSettings = current) {
  ensureAudio(settings);
  if (!normalizedAudioSettings(current).effects || paused()) return;
  activate();
  if (!context || !effectBus) return;
  // Repeated feedback from animation frames must never create a wall of sound.
  const nowMs=Date.now();if((kind==='step'||kind==='bump')&&nowMs-lastEffect<160)return;lastEffect=nowMs;
  // A new sound replaces interface feedback; map fight cues ring out together until muted or paused.
  const layered=isEncounter(kind);
  silence(effectVoices); stopSamples(false);
  const name=sampleFiles[kind]||'',buffer=sampleBuffers.get(name),loading=sampleLoads.get(name);
  // A villain seen the moment the map opens can beat its sample's decode; wait briefly instead of beeping.
  if(!buffer&&layered&&loading){const asked=Date.now();void loading.then(()=>{if(Date.now()-asked<700)playEffect(kind);});return;}
  if(buffer&&context.createBufferSource){
    const voices=layered?encounterVoices:sampleVoices;
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=sampleGain[kind]??.72;source.connect(gain);gain.connect(effectBus);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};source.start(context.currentTime+(encounterDelay[kind]??0));return;
  }
  const notes: Record<EffectKind, number[]> = {
    'encounter-swing':[1180,760], 'encounter-one':[980,510], 'encounter-two':[790,510,312], 'encounter-finish':[630,520,390,250],
    'encounter-exit':[520,390,260], 'encounter-contact':[880,422], 'encounter-appear':[392,523], 'encounter-victory':[523,659,784,1047],
    'card-whoosh':[660,880], 'card-reveal':[659,784,1047], 'card-epic':[523,659,784,1047,1319], 'card-slot':[880,1175], 'card-complete':[523,659,784,1047],
    click: [520, 660], pick: [440, 587], drop: [587, 784], compare: [523, 659, 784],
    success: [523, 659, 784], reward: [523, 659, 784, 1047],
    bump: [294, 294], error: [294, 294], step: [392], snap: [920, 460], lid: [260], pad: [310], crate: [190, 285],
  };
  const frequencies = notes[kind] ?? notes.click, now = context.currentTime + 0.005 + (encounterDelay[kind] ?? 0);
  frequencies.forEach((frequency, i) => note(frequency, now + i * 0.075, kind === 'reward' ? 0.25 : 0.12, effectBus!, effectVoices, kind === 'step' ? 0.12 : 0.48, 'triangle'));
}

/** Quiet audio during story/video playback and explicit game suspension. */
export function setAudioPaused(value: boolean) {
  explicitlyPaused = value;
  if (value) { narration?.stop('stopped'); pauseMusic(); silence(effectVoices); stopSamples(); }
  else if (activated) activate();
}

export function disposeAudio() {
  explicitlyPaused = true; narration?.stop('stopped');
  music?.pause(); music?.remove(); music = undefined; theme = 'main'; introMix = false; musicRevision++; musicPlayPending = false;
  silence(effectVoices); stopSamples(); sampleBuffers.clear(); sampleLoads.clear(); samplesRequested=false;lastEffect=0;
  if (installed && typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', activate);
    document.removeEventListener('keydown', activate);
    document.removeEventListener('visibilitychange', visibilityChanged);
  }
  installed = false; activated = false; explicitlyPaused = false;
  const oldContext = context; context = undefined; effectBus = undefined;
  if (oldContext && oldContext.state !== 'closed') void oldContext.close().catch(() => {});
}
