import { afterEach, describe, expect, it, vi } from 'vitest';
import { disposeAudio, ensureAudio, normalizedAudioSettings, playEffect, playNarration, setAudioPaused, setMusicTheme, syncAudioSettings } from '../src/game-audio';

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

class MusicDouble {
  static instances: MusicDouble[] = [];
  hidden = false; preload = ''; dataset: Record<string, string> = {};
  src = ''; loop = false; volume = 1; paused = true; ended = false; currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { MusicDouble.instances.push(this); }
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn(() => { this.currentTime = 0; this.ended = false; });
  remove = vi.fn();
  removeAttribute = vi.fn((name:string) => { if(name==='src')this.src=''; });
}

function environment() {
  vi.useFakeTimers(); AudioDouble.instances = [];
  MusicDouble.instances = [];
  const documentDouble = Object.assign(new EventTarget(), { hidden: false, createElement: () => new MusicDouble(), body: { append: vi.fn() } });
  vi.stubGlobal('document', documentDouble);
  vi.stubGlobal('window', { AudioContext: AudioDouble });
  vi.stubGlobal('navigator', { userActivation: { isActive: false } });
  return documentDouble;
}

afterEach(() => { disposeAudio(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('music and game effects', () => {
  it('keeps independent preferences and clamps music volume', () => {
    expect(normalizedAudioSettings({ sound: false })).toEqual({ effects: false, music: false, musicVolume: 0.35 });
    expect(normalizedAudioSettings({ sound: false, effects: true, music: true, musicVolume: 3 })).toEqual({ effects: true, music: true, musicVolume: 1 });
    expect(normalizedAudioSettings({ musicVolume: Number.NaN }).musicVolume).toBe(0.35);
    expect(normalizedAudioSettings({ musicVolume: -1 }).musicVolume).toBe(0);
  });

  it('starts one looping main player after a gesture and keeps its position across updates', () => {
    const doc = environment();
    ensureAudio({ music: true });
    expect(AudioDouble.instances).toHaveLength(0);
    doc.dispatchEvent(new Event('pointerdown'));
    const context = AudioDouble.instances[0], initial = context.oscillators.length;
    expect(initial).toBe(0);
    const music = MusicDouble.instances[0]; music.currentTime = 23;
    expect(music.src).toBe('/audio/music/main-theme.mp3'); expect(music.loop).toBe(true);
    for (let i = 0; i < 6; i++) syncAudioSettings({ music: true, musicVolume: 0.5 });
    expect(AudioDouble.instances).toHaveLength(1);
    expect(context.oscillators).toHaveLength(initial);
    expect(MusicDouble.instances).toHaveLength(1); expect(music.currentTime).toBe(23); expect(music.play).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(30000);
    expect(vi.getTimerCount()).toBe(0);
    expect(context.oscillators).toHaveLength(0);
    playEffect('pick');
    expect(context.oscillators.length).toBeGreaterThan(0);
  });

  it('switches to a single final track, continues on the certificate, and restarts only for replay', () => {
    const doc = environment(); ensureAudio({}); doc.dispatchEvent(new Event('pointerdown'));
    const music = MusicDouble.instances[0]; setMusicTheme('final');
    expect(music.src).toBe('/audio/music/finale-theme.mp3'); expect(music.loop).toBe(false);
    music.currentTime = 24; setMusicTheme('final'); expect(music.currentTime).toBe(24);
    music.ended = true; music.paused = true; const count = music.play.mock.calls.length;
    syncAudioSettings({}); expect(music.play).toHaveBeenCalledTimes(count);
    setMusicTheme('final', true); expect(music.ended).toBe(false); expect(music.currentTime).toBe(0);
    setMusicTheme('main'); expect(music.loop).toBe(true); expect(MusicDouble.instances).toHaveLength(1);
  });

  it('pauses music for videos and background tabs and resumes from the same position', async () => {
    const doc = environment(); ensureAudio({}); doc.dispatchEvent(new Event('pointerdown')); await Promise.resolve(); await Promise.resolve();
    const music = MusicDouble.instances[0]; music.currentTime = 19;
    setAudioPaused(true); expect(music.paused).toBe(true);
    setAudioPaused(false); expect(music.paused).toBe(false); expect(music.currentTime).toBe(19);
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); expect(music.paused).toBe(true);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); await Promise.resolve();
    expect(music.paused).toBe(false); expect(music.currentTime).toBe(19);
    syncAudioSettings({music:false,effects:true}); expect(music.paused).toBe(true);
    playEffect('pick'); expect(AudioDouble.instances[0].oscillators.length).toBeGreaterThan(0);
  });

  it('retries blocked autoplay on a later gesture and disposes the player', async () => {
    const doc = environment(); ensureAudio({});
    doc.dispatchEvent(new Event('pointerdown')); const music = MusicDouble.instances[0];
    await Promise.resolve(); await Promise.resolve();
    music.pause(); music.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    doc.dispatchEvent(new Event('pointerdown')); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    doc.dispatchEvent(new Event('keydown')); expect(music.paused).toBe(false);
    disposeAudio(); expect(music.remove).toHaveBeenCalledOnce(); expect(music.paused).toBe(true);
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
    const request=vi.fn(async(_url:string)=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}));
    vi.stubGlobal('window',{AudioContext:SampleAudio});vi.stubGlobal('fetch',request);
    playEffect('pick',{music:false,effects:true});
    for(let i=0;i<10;i++)await Promise.resolve();
    const files=['click','pick','drop','compare','success','reward','bump','step','snap','lid','pad','crate'];
    expect(request.mock.calls.map(([url])=>url).sort()).toEqual(files.map(name=>`/audio/${name}.mp3`).sort());
    const experimentSounds=['snap','lid','pad','crate'] as const;
    for(const kind of experimentSounds)playEffect(kind);
    expect(sources).toHaveLength(4);
    sources.forEach(source=>expect(source.start).toHaveBeenCalledOnce());
    syncAudioSettings({music:true,effects:false});expect(sources[3].stop).toHaveBeenCalledOnce();
    for(const kind of experimentSounds)playEffect(kind);
    expect(sources).toHaveLength(4);
    playEffect('crate',{music:false,effects:true});expect(sources).toHaveLength(5);
    setAudioPaused(true);expect(sources[4].stop).toHaveBeenCalledOnce();
    playEffect('success');expect(sources).toHaveLength(5);expect(request).toHaveBeenCalledTimes(files.length);
  });
});

describe('resident dialogue voices',()=>{
  it('respects muted effects and restores music after replacing or finishing a voice',async()=>{
    const doc=environment(),muted=vi.fn();
    playNarration('/audio/voices/resident-1-hello.mp3',{music:false,effects:false},muted);
    expect(muted).toHaveBeenLastCalledWith('muted');
    expect(MusicDouble.instances).toHaveLength(0);
    ensureAudio({music:true,effects:true,musicVolume:.4});doc.dispatchEvent(new Event('pointerdown'));
    const music=MusicDouble.instances[0],firstState=vi.fn();
    const stopFirst=playNarration('/audio/voices/resident-1-hello.mp3',undefined,firstState);
    const first=MusicDouble.instances[1];
    expect(first.src).toBe('/audio/voices/resident-1-hello.mp3');
    expect(music.volume).toBeCloseTo(.1);
    playNarration('/audio/voices/resident-1-news.mp3');
    const second=MusicDouble.instances[2];
    expect(first.paused).toBe(true);expect(first.remove).toHaveBeenCalledOnce();
    stopFirst();expect(second.paused).toBe(false);
    syncAudioSettings({music:true,effects:true,musicVolume:.8});expect(music.volume).toBeCloseTo(.2);
    second.onended!();expect(second.remove).toHaveBeenCalledOnce();expect(music.volume).toBeCloseTo(.8);
    await Promise.resolve();expect(firstState).not.toHaveBeenCalledWith('playing');
  });

  it('does not restart a cancelled pending voice when its play promise resolves later',async()=>{
    const doc=environment();ensureAudio({music:false,effects:true});
    const pending=new MusicDouble();let resolvePlay!:()=>void;
    pending.play.mockImplementationOnce(()=>new Promise<void>(resolve=>{resolvePlay=resolve;}));
    vi.spyOn(doc,'createElement').mockReturnValueOnce(pending);
    const firstState=vi.fn(),secondState=vi.fn();
    playNarration('/audio/voices/resident-2-hello.mp3',undefined,firstState);
    const stop=playNarration('/audio/voices/resident-2-science.mp3',undefined,secondState);
    resolvePlay();await Promise.resolve();
    expect(pending.paused).toBe(true);expect(firstState).not.toHaveBeenCalledWith('playing');
    expect(secondState).toHaveBeenLastCalledWith('playing');
    stop();expect(secondState).toHaveBeenLastCalledWith('stopped');
  });

  it('stops voices on mute, a hidden tab, and video playback without silently resuming them',async()=>{
    const doc=environment();ensureAudio({music:true,effects:true});doc.dispatchEvent(new Event('pointerdown'));
    const state=vi.fn();playNarration('/audio/voices/resident-3-hello.mp3',undefined,state);
    const first=MusicDouble.instances.at(-1)!;
    syncAudioSettings({music:true,effects:false});expect(first.paused).toBe(true);expect(state).toHaveBeenLastCalledWith('muted');
    playNarration('/audio/voices/resident-3-again.mp3',{music:true,effects:true},state);
    const second=MusicDouble.instances.at(-1)!;
    doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));expect(second.paused).toBe(true);
    doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();
    expect(second.play).toHaveBeenCalledOnce();
    playNarration('/audio/voices/resident-3-news.mp3');const third=MusicDouble.instances.at(-1)!;
    setAudioPaused(true);expect(third.paused).toBe(true);setAudioPaused(false);
    expect(third.play).toHaveBeenCalledOnce();
  });

  it('recovers from missing files and autoplay denial while preserving the written dialogue',async()=>{
    const doc=environment();ensureAudio({music:true,effects:true});doc.dispatchEvent(new Event('pointerdown'));
    const music=MusicDouble.instances[0],blocked=new MusicDouble(),state=vi.fn();
    blocked.play.mockRejectedValueOnce(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));
    vi.spyOn(doc,'createElement').mockReturnValueOnce(blocked);
    playNarration('/audio/voices/resident-4-hello.mp3',undefined,state);
    await Promise.resolve();await Promise.resolve();
    expect(state).toHaveBeenLastCalledWith('blocked');expect(blocked.remove).toHaveBeenCalledOnce();
    expect(music.volume).toBeCloseTo(.35);
    playNarration('/audio/voices/resident-4-science.mp3',undefined,state);
    const missing=MusicDouble.instances.at(-1)!;missing.onerror!();
    expect(state).toHaveBeenLastCalledWith('unavailable');expect(missing.remove).toHaveBeenCalledOnce();
    expect(music.volume).toBeCloseTo(.35);
  });
});

 it('ducks magnetic effects during speech and restores them on stop', () => {
   const doc = environment(); ensureAudio({music:false,effects:true}); doc.dispatchEvent(new Event('pointerdown'));
   playEffect('snap'); const bus=AudioDouble.instances[0].gains[0]; expect(bus.gain.value).toBe(.16);
   const stop=playNarration('/audio/voices/test.mp3'); expect(bus.gain.value).toBeCloseTo(.048);
   playEffect('pick'); expect(bus.gain.value).toBeCloseTo(.048);
   stop(); expect(bus.gain.value).toBe(.16);
 });
