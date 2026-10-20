/** Self-contained procedural audio. No external music, samples, requests, or downloads. */
export interface AudioSettings {
  sound?: boolean;
  music?: boolean;
  effects?: boolean;
  /** Background music volume, 0…1. Effects keep a separate fixed level. */
  musicVolume?: number;
}
export type EffectKind = 'click' | 'pick' | 'drop' | 'compare' | 'success' | 'reward' | 'bump' | 'error' | 'step';

const EFFECT_GAIN = 0.16;
const MUSIC_GAIN = EFFECT_GAIN * 0.7;
const DEFAULT_VOLUME = 0.35;
type Voice = { oscillator: OscillatorNode; gain: GainNode };
let current: AudioSettings = {};
let context: AudioContext | undefined;
let musicBus: GainNode | undefined;
let effectBus: GainNode | undefined;
let musicVoices: Voice[] = [];
let effectVoices: Voice[] = [];
let musicTimer: ReturnType<typeof setInterval> | undefined;
let bar = 0;
let explicitlyPaused = false;
let installed = false;
let activated = false;

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

function stopMusic() {
  if (musicTimer !== undefined) clearInterval(musicTimer);
  musicTimer = undefined;
  silence(musicVoices);
}

function makeContext() {
  if (context || typeof window === 'undefined') return;
  const Constructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return;
  try {
    context = new Constructor();
    musicBus = context.createGain(); musicBus.connect(context.destination);
    effectBus = context.createGain(); effectBus.gain.value = EFFECT_GAIN; effectBus.connect(context.destination);
  } catch { context = undefined; /* Audio availability must never block the activity. */ }
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

function scheduleBar() {
  if (!context || !musicBus || paused() || !normalizedAudioSettings(current).music) return;
  // A gentle, sparse original four-bar pentatonic phrase; one scheduler for the whole app.
  const phrases = [[261.63, 392, 329.63, 440], [293.66, 440, 392, 329.63], [329.63, 523.25, 440, 392], [293.66, 392, 329.63, 261.63]];
  const phrase = phrases[bar % phrases.length], start = context.currentTime + 0.04;
  phrase.forEach((frequency, i) => note(frequency, start + i * 0.6, 0.52, musicBus!, musicVoices, 0.21));
  note(phrase[0] / 2, start, 1.95, musicBus, musicVoices, 0.12, 'triangle');
  bar++;
}

function apply() {
  if (!context || !musicBus || !effectBus) return;
  const settings = normalizedAudioSettings(current);
  musicBus.gain.value = MUSIC_GAIN * settings.musicVolume;
  if (!settings.effects || paused()) silence(effectVoices);
  if (!settings.music || paused()) stopMusic();
  else if (activated && musicTimer === undefined) {
    scheduleBar(); musicTimer = setInterval(scheduleBar, 2400);
  }
}

function activate() {
  if (paused()) return;
  activated = true; makeContext();
  if (context?.state === 'suspended') void context.resume().then(apply).catch(() => { /* Retry on the next gesture. */ });
  else apply();
}

function visibilityChanged() {
  if (isHidden()) {
    stopMusic(); silence(effectVoices);
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
  activate(); silence(effectVoices);
  if (!context || !effectBus) return;
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
  if (value) { stopMusic(); silence(effectVoices); }
  else if (activated) activate();
}

export function disposeAudio() {
  stopMusic(); silence(effectVoices);
  if (installed && typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', activate);
    document.removeEventListener('keydown', activate);
    document.removeEventListener('visibilitychange', visibilityChanged);
  }
  installed = false; activated = false; explicitlyPaused = false; bar = 0;
  const oldContext = context; context = undefined; musicBus = undefined; effectBus = undefined;
  if (oldContext && oldContext.state !== 'closed') void oldContext.close().catch(() => {});
}
