/** User-supplied music and local CC0 effects with procedural fallback. */
export interface AudioSettings {
  sound?: boolean;
  music?: boolean;
  effects?: boolean;
  /** Background music volume, 0…1. Effects keep a separate fixed level. */
  musicVolume?: number;
}
export type EffectKind = 'click' | 'pick' | 'drop' | 'compare' | 'success' | 'reward' | 'bump' | 'error' | 'step';

const EFFECT_GAIN = 0.16;
const DEFAULT_VOLUME = 0.35;
export type MusicTheme = 'main' | 'final';
const musicFiles: Record<MusicTheme, string> = { main: '/audio/music/main-theme.mp3', final: '/audio/music/finale-theme.mp3' };
let theme: MusicTheme = 'main';
let music: HTMLAudioElement | undefined;
let musicPlayPending = false, musicRevision = 0;
type Voice = { oscillator: OscillatorNode; gain: GainNode };
let current: AudioSettings = {};
let context: AudioContext | undefined;
let effectBus: GainNode | undefined;
let effectVoices: Voice[] = [];
let explicitlyPaused = false;
let installed = false;
let activated = false;
const sampleFiles: Partial<Record<EffectKind,string>> = { click:'click',pick:'pick',drop:'drop',compare:'compare',success:'success',reward:'reward',bump:'bump',error:'bump',step:'step' };
const sampleBuffers = new Map<string, AudioBuffer>();
const sampleVoices = new Set<AudioBufferSourceNode>();
let samplesRequested = false, lastEffect = 0;

function stopSamples() {
  for(const voice of sampleVoices){try{voice.stop();}catch{}voice.disconnect();}
  sampleVoices.clear();
}
function loadSamples() {
  if(samplesRequested || !context?.decodeAudioData || typeof fetch==='undefined')return;
  samplesRequested=true;
  const owner=context;
  for(const name of new Set(Object.values(sampleFiles))) {
    void fetch(`/audio/${name}.mp3`).then(r=>{if(!r.ok)throw new Error('audio unavailable');return r.arrayBuffer();}).then(data=>owner.decodeAudioData(data)).then(buffer=>{if(context===owner)sampleBuffers.set(name,buffer);}).catch(()=>{});
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
  music.volume = settings.musicVolume;
  if (!music.paused || music.ended || musicPlayPending) return;
  musicPlayPending = true;
  const revision = musicRevision;
  // Autoplay denial is retried on the next pointer/key gesture.
  void music.play().catch(() => {}).finally(() => { if (revision === musicRevision) musicPlayPending = false; });
}

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
  applyMusic();
  if (!context || !effectBus) return;
  const settings = normalizedAudioSettings(current);
  if (!settings.effects || paused()) { silence(effectVoices); stopSamples(); }
}

function activate() {
  if (paused()) return;
  activated = true; makeContext(); loadSamples();
  if (context?.state === 'suspended') void context.resume().then(apply).catch(() => { /* Retry on the next gesture. */ });
  else apply();
}

function visibilityChanged() {
  if (isHidden()) {
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

/** A new effect always replaces the previous effect, including its scheduled notes. */
export function playEffect(kind: EffectKind, settings: AudioSettings = current) {
  ensureAudio(settings);
  if (!normalizedAudioSettings(current).effects || paused()) return;
  activate(); silence(effectVoices); stopSamples();
  if (!context || !effectBus) return;
  // Repeated feedback from animation frames must never create a wall of sound.
  const nowMs=Date.now();if((kind==='step'||kind==='bump')&&nowMs-lastEffect<160)return;lastEffect=nowMs;
  const buffer=sampleBuffers.get(sampleFiles[kind]||'');
  if(buffer&&context.createBufferSource){
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=kind==='step'?.25:.72;source.connect(gain);gain.connect(effectBus);sampleVoices.add(source);
    source.onended=()=>{sampleVoices.delete(source);source.disconnect();gain.disconnect();};source.start();return;
  }
  const notes: Record<EffectKind, number[]> = {
    click: [520, 660], pick: [440, 587], drop: [587, 784], compare: [523, 659, 784],
    success: [523, 659, 784], reward: [523, 659, 784, 1047],
    bump: [294, 294], error: [294, 294], step: [392],
  };
  const frequencies = notes[kind] ?? notes.click, now = context.currentTime + 0.005;
  frequencies.forEach((frequency, i) => note(frequency, now + i * 0.075, kind === 'reward' ? 0.25 : 0.12, effectBus!, effectVoices, kind === 'step' ? 0.12 : 0.48, 'triangle'));
}

/** Quiet audio during story/video playback and explicit game suspension. */
export function setAudioPaused(value: boolean) {
  explicitlyPaused = value;
  if (value) { pauseMusic(); silence(effectVoices); stopSamples(); }
  else if (activated) activate();
}

export function disposeAudio() {
  music?.pause(); music?.remove(); music = undefined; theme = 'main'; musicRevision++; musicPlayPending = false;
  silence(effectVoices); stopSamples(); sampleBuffers.clear(); samplesRequested=false;lastEffect=0;
  if (installed && typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', activate);
    document.removeEventListener('keydown', activate);
    document.removeEventListener('visibilitychange', visibilityChanged);
  }
  installed = false; activated = false; explicitlyPaused = false;
  const oldContext = context; context = undefined; effectBus = undefined;
  if (oldContext && oldContext.state !== 'closed') void oldContext.close().catch(() => {});
}
