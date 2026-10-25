import { afterEach, describe, expect, it, vi } from 'vitest';
import { disposeAudio, ensureAudio, normalizedAudioSettings, playEffect, setAudioPaused, syncAudioSettings } from '../src/game-audio';

const gainDouble = () => ({ gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() });
const oscillatorDouble = () => ({ frequency: { value: 0 }, type: 'sine', connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: undefined as (() => void) | undefined });

class AudioDouble {
  static instances: AudioDouble[] = [];
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = {};
  oscillators: ReturnType<typeof oscillatorDouble>[] = [];
  gains: ReturnType<typeof gainDouble>[] = [];
  constructor() { AudioDouble.instances.push(this); }
  createGain() {
    const gain = gainDouble();
    this.gains.push(gain); return gain;
  }
  createOscillator() {
    const oscillator = oscillatorDouble();
    this.oscillators.push(oscillator); return oscillator;
  }
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
}

function environment() {
  vi.useFakeTimers(); AudioDouble.instances = [];
  const documentDouble = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', documentDouble);
  vi.stubGlobal('window', { AudioContext: AudioDouble });
  vi.stubGlobal('navigator', { userActivation: { isActive: false } });
  return documentDouble;
}

afterEach(() => { disposeAudio(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('effects-only game audio', () => {
  it('preserves legacy effect preferences but ignores saved music enablement', () => {
    expect(normalizedAudioSettings({ sound: false })).toEqual({ effects: false, music: false, musicVolume: 0.35 });
    expect(normalizedAudioSettings({ sound: false, effects: true, music: true, musicVolume: 3 })).toEqual({ effects: true, music: false, musicVolume: 1 });
    expect(normalizedAudioSettings({ musicVolume: Number.NaN }).musicVolume).toBe(0.35);
    expect(normalizedAudioSettings({ musicVolume: -1 }).musicVolume).toBe(0);
  });

  it('never starts background notes or a music scheduler after gestures and screen updates', () => {
    const doc = environment();
    ensureAudio({ music: true });
    expect(AudioDouble.instances).toHaveLength(0);
    doc.dispatchEvent(new Event('pointerdown'));
    const context = AudioDouble.instances[0], initial = context.oscillators.length;
    expect(initial).toBe(0);
    for (let i = 0; i < 6; i++) syncAudioSettings({ music: true, musicVolume: 0.5 });
    expect(AudioDouble.instances).toHaveLength(1);
    expect(context.oscillators).toHaveLength(initial);
    vi.advanceTimersByTime(30000);
    expect(vi.getTimerCount()).toBe(0);
    expect(context.oscillators).toHaveLength(0);
    playEffect('pick');
    expect(context.oscillators.length).toBeGreaterThan(0);
  });

  it('replaces the previous effect and respects the independent effect switch', () => {
    environment();
    playEffect('reward', { music: false, effects: true });
    const context = AudioDouble.instances[0], first = context.oscillators.slice();
    playEffect('drop', { music: false, effects: true });
    first.forEach(voice => expect(voice.disconnect).toHaveBeenCalledOnce());
    expect(context.oscillators.slice(first.length).map(voice => voice.frequency.value)).toEqual([587, 784]);
    const before = context.oscillators.length;
    playEffect('success', { music: false, effects: false });
    expect(context.oscillators).toHaveLength(before);
  });

  it('stops effects while hidden or paused and resumes silently until the next effect', async () => {
    const doc = environment(); ensureAudio({ music: true, effects: true }); doc.dispatchEvent(new Event('pointerdown'));
    const context = AudioDouble.instances[0];
    playEffect('pick');
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
    expect(context.suspend).toHaveBeenCalledOnce();
    context.oscillators.forEach(voice => expect(voice.disconnect).toHaveBeenCalled());
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); await Promise.resolve();
    expect(context.resume).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    setAudioPaused(true); expect(vi.getTimerCount()).toBe(0);
    const count = context.oscillators.length; playEffect('reward'); expect(context.oscillators).toHaveLength(count);
    setAudioPaused(false); expect(vi.getTimerCount()).toBe(0); expect(context.oscillators).toHaveLength(count);
    syncAudioSettings({ music: false, effects: true }); expect(vi.getTimerCount()).toBe(0);
    playEffect('click'); expect(context.oscillators.length).toBeGreaterThan(count);
  });

  it('remains usable when browser audio is unavailable and removes listeners on disposal', () => {
    const doc = environment(); vi.stubGlobal('window', {});
    expect(() => { ensureAudio({}); doc.dispatchEvent(new Event('pointerdown')); playEffect('success'); }).not.toThrow();
    disposeAudio(); vi.stubGlobal('window', { AudioContext: AudioDouble }); doc.dispatchEvent(new Event('pointerdown'));
    expect(AudioDouble.instances).toHaveLength(0);
  });

  it('caches local CC0 samples and stops decoded playback when muted or a concept video opens', async () => {
    environment();
    const sources: { stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }[]=[];
    class SampleAudio extends AudioDouble {
      decodeAudioData = vi.fn(async () => ({} as AudioBuffer));
      createBufferSource() {
        const source={buffer:null,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};sources.push(source);return source;
      }
    }
    const request=vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}));
    vi.stubGlobal('window',{AudioContext:SampleAudio});vi.stubGlobal('fetch',request);
    playEffect('pick',{music:false,effects:true});
    for(let i=0;i<10;i++)await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(8);
    playEffect('drop');expect(sources).toHaveLength(1);expect(sources[0].start).toHaveBeenCalledOnce();
    syncAudioSettings({music:false,effects:false});expect(sources[0].stop).toHaveBeenCalledOnce();
    playEffect('reward');expect(sources).toHaveLength(1);
    playEffect('reward',{music:false,effects:true});expect(sources).toHaveLength(2);
    setAudioPaused(true);expect(sources[1].stop).toHaveBeenCalledOnce();
    playEffect('success');expect(sources).toHaveLength(2);expect(request).toHaveBeenCalledTimes(8);
  });
});
