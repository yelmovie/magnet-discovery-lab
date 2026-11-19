import { afterEach, describe, expect, it, vi } from 'vitest';
import { disposeAudio, effectRinging, ensureAudio, narrationActive, normalizedAudioSettings, playEffect, playFootstep, playNarration, playUnlock, setAudioPaused, setMusicDuck, setMusicTheme, syncAudioSettings } from '../src/game-audio';

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
  onplaying: (() => void) | null = null;
  onwaiting: (() => void) | null = null;
  onpause: (() => void) | null = null;
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

  it('starts music inside the gesture even if the effects context has not resumed', () => {
    const doc = environment();
    vi.stubGlobal('window', {AudioContext: class extends AudioDouble {
      state: AudioContextState = 'suspended';
      resume = vi.fn(() => new Promise<void>(() => {}));
    }});
    ensureAudio({music:true});
    doc.dispatchEvent(new Event('pointerdown'));
    expect(AudioDouble.instances[0].resume).toHaveBeenCalledOnce();
    expect(MusicDouble.instances[0].play).toHaveBeenCalledOnce();
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
    const files=['click','pick','drop','compare','success','reward','bump','step','snap','lid','pad','crate',
      'map-zap','map-clank-one','map-clank-two','map-hit-heavy','map-exit','map-bump','map-appear','map-victory',
      'card-whoosh','card-reveal','card-epic','card-slot','card-complete','run-jump','map-open','map-twinkle'];
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

describe('music under film voices and the map finale',()=>{
  it('sits at 60% under a film, lower under a voice, and returns only when every reason is gone',()=>{
    const doc=environment();ensureAudio({music:true,effects:true});doc.dispatchEvent(new Event('pointerdown'));
    const music=MusicDouble.instances[0];expect(music.volume).toBeCloseTo(.35);
    setMusicDuck('story',true);vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.21);expect(music.paused).toBe(false);
    const stop=playNarration('/audio/voices/resident-1-hello.mp3');vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.0875);
    // The voice ending must not undo the film's own label, and the film ending must not undo a voice.
    stop();vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.21);
    const again=playNarration('/audio/voices/resident-1-news.mp3');setMusicDuck('story',false);vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.0875);
    again();vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.35);
    // Repeated renders keep the level and leave no timer behind; pausing lands on the level at once.
    setMusicDuck('story',true);for(let i=0;i<5;i++)syncAudioSettings({music:true,effects:true});
    setAudioPaused(true);expect(vi.getTimerCount()).toBe(0);expect(music.volume).toBeCloseTo(.21);
    setAudioPaused(false);setMusicDuck('story',false);expect(music.play).toHaveBeenCalledTimes(2);
    disposeAudio();ensureAudio({music:true});doc.dispatchEvent(new Event('pointerdown'));
    expect(MusicDouble.instances.at(-1)!.volume).toBeCloseTo(.35);
  });

  it('plays the final theme from the top while the map finale dialog is open and the main theme after it closes',()=>{
    const doc=environment();ensureAudio({music:true});doc.dispatchEvent(new Event('pointerdown'));
    const music=MusicDouble.instances[0];music.currentTime=31;
    const announce=(open:boolean)=>doc.dispatchEvent(Object.assign(new Event('map-finale'),{detail:{open}}));
    announce(true);
    expect(music.src).toBe('/audio/music/finale-theme.mp3');expect(music.loop).toBe(false);expect(music.currentTime).toBe(0);expect(music.paused).toBe(false);
    // The page keeps asking for its own theme on every render; the dialog holds the final theme without restarting it.
    music.currentTime=9;setMusicTheme('main');announce(true);
    expect(music.src).toBe('/audio/music/finale-theme.mp3');expect(music.currentTime).toBe(9);
    announce(false);
    expect(music.src).toBe('/audio/music/main-theme.mp3');expect(music.loop).toBe(true);expect(music.paused).toBe(false);
    expect(MusicDouble.instances).toHaveLength(1);
    // Music switched off stays off through the dialog.
    syncAudioSettings({music:false});announce(true);expect(music.paused).toBe(true);announce(false);expect(music.paused).toBe(true);
  });
});

describe('map villain cues',()=>{
  it('layers the swing, the delayed clank and the retreat, and a later interface sound stops only itself',async()=>{
    environment();
    const sources:{buffer:unknown;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;onended:null}[]=[];
    class SampleAudio extends AudioDouble {
      decodeAudioData = vi.fn(async (data:ArrayBuffer) => data as unknown as AudioBuffer);
      createBufferSource() {const source={buffer:null,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};sources.push(source);return source;}
    }
    vi.stubGlobal('window',{AudioContext:SampleAudio});
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>({url})})));
    const on={music:false,effects:true};
    playEffect('click',on);for(let i=0;i<10;i++)await Promise.resolve();
    playEffect('encounter-swing',on);playEffect('encounter-finish',on);playEffect('encounter-exit',on);
    const fight=sources.slice(-3);
    expect(fight.map(s=>(s.buffer as {url:string}).url)).toEqual(['/audio/map-zap.mp3','/audio/map-hit-heavy.mp3','/audio/map-exit.mp3']);
    expect(fight.map(s=>s.start.mock.calls[0][0])).toEqual([0,.07,.3]);
    fight.forEach(s=>expect(s.stop).not.toHaveBeenCalled());
    playEffect('pick',on);fight.forEach(s=>expect(s.stop).not.toHaveBeenCalled());
    syncAudioSettings({music:false,effects:false});fight.forEach(s=>expect(s.stop).toHaveBeenCalledOnce());
    const count=sources.length;playEffect('encounter-one');expect(sources).toHaveLength(count);
  });
});

describe('map villain cue before decoding',()=>{
  it('waits for a still-loading fight sample instead of beeping, and plays it once',async()=>{
    environment();
    const sources:{start:ReturnType<typeof vi.fn>}[]=[];
    class SampleAudio extends AudioDouble {
      decodeAudioData = vi.fn(async () => ({} as AudioBuffer));
      createBufferSource() {const source={buffer:null,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};sources.push(source);return source;}
    }
    vi.stubGlobal('window',{AudioContext:SampleAudio});
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})));
    playEffect('encounter-appear',{music:false,effects:true});
    const context=AudioDouble.instances[0];expect(context.oscillators).toHaveLength(0);expect(sources).toHaveLength(0);
    for(let i=0;i<12;i++)await Promise.resolve();
    expect(sources).toHaveLength(1);expect(context.oscillators).toHaveLength(0);
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
    // The music glides under the voice instead of jumping.
    vi.advanceTimersByTime(100);expect(music.volume).toBeLessThan(.4);expect(music.volume).toBeGreaterThan(.1);
    vi.advanceTimersByTime(150);expect(music.volume).toBeCloseTo(.1);
    playNarration('/audio/voices/resident-1-news.mp3');
    const second=MusicDouble.instances[2];
    expect(first.paused).toBe(true);expect(first.remove).toHaveBeenCalledOnce();
    stopFirst();expect(second.paused).toBe(false);
    syncAudioSettings({music:true,effects:true,musicVolume:.8});vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.2);
    second.onended!();expect(second.remove).toHaveBeenCalledOnce();vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.8);
    expect(vi.getTimerCount()).toBe(0);
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

  it('reports speaking only while the voice is audibly playing, not while it buffers or pauses',async()=>{
    const doc=environment();ensureAudio({music:false,effects:true});doc.dispatchEvent(new Event('pointerdown'));
    const state=vi.fn(),stop=playNarration('/audio/voices/resident-5-hello.mp3',undefined,state);
    const voice=MusicDouble.instances.at(-1)!;await Promise.resolve();
    expect(state).toHaveBeenLastCalledWith('playing');
    voice.onwaiting!();expect(state).toHaveBeenLastCalledWith('loading');
    voice.onplaying!();expect(state).toHaveBeenLastCalledWith('playing');
    voice.onpause!();expect(state).toHaveBeenLastCalledWith('loading');
    stop();expect(state).toHaveBeenLastCalledWith('stopped');
    expect(voice.onplaying).toBeNull();expect(voice.onwaiting).toBeNull();expect(voice.onpause).toBeNull();
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

describe('map fight cues under a villain voice',()=>{
  it('still starts the swing, the clank and the retreat at 80% or more while a voice plays',async()=>{
    const doc=environment();
    const sources:{connect:ReturnType<typeof vi.fn>;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[]=[];
    class SampleAudio extends AudioDouble {
      decodeAudioData = vi.fn(async (data:ArrayBuffer) => data as unknown as AudioBuffer);
      createBufferSource() {const source={buffer:null,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};sources.push(source);return source;}
    }
    vi.stubGlobal('window',{AudioContext:SampleAudio});
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>({url})})));
    ensureAudio({music:false,effects:true});doc.dispatchEvent(new Event('pointerdown'));
    for(let i=0;i<10;i++)await Promise.resolve();
    const context=AudioDouble.instances[0],[effects,fight]=context.gains;
    const stop=playNarration('/audio/voices/el-villain-01.mp3');
    playEffect('encounter-swing');playEffect('encounter-finish');playEffect('encounter-exit');
    const cues=sources.slice(-3);
    cues.forEach(source=>{expect(source.start).toHaveBeenCalledOnce();expect(source.stop).not.toHaveBeenCalled();});
    // Each cue's level node feeds the fight bus, which a voice lowers to 80% at most; interface sounds still duck to 30%.
    const levels=context.gains.slice(2);expect(levels).toHaveLength(3);
    levels.forEach(level=>{expect(level.connect).toHaveBeenCalledWith(fight);expect(level.gain.value).toBeGreaterThan(0);});
    expect(fight.gain.value).toBeGreaterThanOrEqual(.16*.7);expect(effects.gain.value).toBeCloseTo(.048);
    stop();expect(fight.gain.value).toBe(.16);
  });
});

describe('sound families: footsteps, cards and the unlock cue (2026-11-19)',()=>{
  type Source={buffer:{url:string;duration:number}|null;playbackRate:{value:number};connect:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;onended:(()=>void)|null};
  const durations:Record<string,number>={'card-complete':2.43,'map-open':.18,'map-twinkle':.31};
  async function samples(){
    const doc=environment(),sources:Source[]=[];
    class SampleAudio extends AudioDouble {
      decodeAudioData = vi.fn(async (data:ArrayBuffer) => data as unknown as AudioBuffer);
      createBufferSource() {const source:Source={buffer:null,playbackRate:{value:1},connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};sources.push(source);return source;}
    }
    vi.stubGlobal('window',{AudioContext:SampleAudio});
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>({url,duration:durations[url.slice(7,-4)]??.2})})));
    ensureAudio({music:true,effects:true});doc.dispatchEvent(new Event('pointerdown'));
    for(let i=0;i<10;i++)await Promise.resolve();
    const name=(source:Source)=>source.buffer!.url.slice(7,-4);
    return {doc,sources,name,context:AudioDouble.instances[0]};
  }

  it('gives footsteps their own voice and bus: they cut nothing, nothing cuts them, a voice halves them',async()=>{
    const {doc,sources,name,context}=await samples();
    playEffect('encounter-finish');playEffect('card-reveal');playEffect('pick');
    const [hit,card,pick]=sources;
    playFootstep();
    const first=sources[3];expect(name(first)).toBe('step');expect(first.start).toHaveBeenCalledOnce();
    const bus=context.gains.at(-1)!;expect(first.connect).toHaveBeenCalledWith(bus);expect(bus.gain.value).toBeCloseTo(.12);
    for(const other of [hit,card,pick])expect(other.stop).not.toHaveBeenCalled();
    // Interface, fight and card sounds leave the step alone; the next step replaces only the step.
    playEffect('click');playEffect('encounter-swing');playEffect('card-slot');expect(first.stop).not.toHaveBeenCalled();
    playFootstep();expect(first.stop).toHaveBeenCalledOnce();
    for(const other of [hit,card,sources[5],sources[6]])expect(other.stop).not.toHaveBeenCalled();
    // Left and right alternate and every step stays within 6% of the recorded speed.
    for(let i=0;i<20;i++)playFootstep();
    const rates=sources.filter(source=>name(source)==='step').map(source=>source.playbackRate.value);
    rates.forEach(rate=>{expect(rate).toBeGreaterThanOrEqual(.94);expect(rate).toBeLessThanOrEqual(1.06);});
    rates.forEach((rate,i)=>i%2?expect(rate).toBeLessThanOrEqual(1):expect(rate).toBeGreaterThanOrEqual(1));
    const stop=playNarration('/audio/voices/resident-1-hello.mp3');expect(bus.gain.value).toBeCloseTo(.06);
    playFootstep();expect(bus.gain.value).toBeCloseTo(.06);stop();expect(bus.gain.value).toBeCloseTo(.12);
    // The effects switch, a hidden tab and a pause silence the step and keep it silent.
    const last=sources.at(-1)!;syncAudioSettings({music:true,effects:false});expect(last.stop).toHaveBeenCalledOnce();
    const count=sources.length;playFootstep();expect(sources).toHaveLength(count);
    syncAudioSettings({music:true,effects:true});playFootstep();expect(sources).toHaveLength(count+1);
    doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));expect(sources.at(-1)!.stop).toHaveBeenCalledOnce();
    playFootstep();expect(sources).toHaveLength(count+1);
    doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));setAudioPaused(true);playFootstep();expect(sources).toHaveLength(count+1);
  });

  it('stays silent, with no beep, before the step sample has loaded or before any gesture',()=>{
    environment();playFootstep();expect(AudioDouble.instances).toHaveLength(0);
    playEffect('click',{music:false,effects:true});const context=AudioDouble.instances[0],notes=context.oscillators.length;
    playFootstep();expect(context.oscillators).toHaveLength(notes);
  });

  it('lets card cues ring through interface sounds and through each other, four layered cues at most',async()=>{
    const {sources,name}=await samples();
    playEffect('card-whoosh');playEffect('card-epic');playEffect('click');playEffect('drop');
    const [whoosh,epic,click]=sources;
    expect(click.stop).toHaveBeenCalledOnce();expect(whoosh.stop).not.toHaveBeenCalled();expect(epic.stop).not.toHaveBeenCalled();
    playEffect('card-slot');playEffect('encounter-swing');expect(whoosh.stop).not.toHaveBeenCalled();
    playEffect('encounter-one');expect(whoosh.stop).toHaveBeenCalledOnce();expect(epic.stop).not.toHaveBeenCalled();
    expect(name(sources.at(-1)!)).toBe('map-clank-one');
  });

  it('skips the victory jingle after the full-set card jingle and reports while that jingle rings',async()=>{
    const {sources,name}=await samples();
    expect(effectRinging('card-complete')).toBe(false);
    playEffect('card-complete');expect(name(sources[0])).toBe('card-complete');expect(effectRinging('card-complete')).toBe(true);
    vi.advanceTimersByTime(2400);expect(effectRinging('card-complete')).toBe(true);
    vi.advanceTimersByTime(40);expect(effectRinging('card-complete')).toBe(false);
    playEffect('encounter-victory');expect(sources).toHaveLength(1);
    // Without a card jingle before it, the victory jingle is the fanfare.
    playEffect('encounter-victory');expect(sources).toHaveLength(2);expect(name(sources[1])).toBe('map-victory');
    // A muted or paused game drops the wait at once.
    playEffect('card-complete');setAudioPaused(true);expect(effectRinging('card-complete')).toBe(false);
  });

  it('plays the unlock latch and its sparkle after the completion sound, and holds a following voice until they are out',async()=>{
    const {sources,name,context}=await samples();
    playEffect('success');playUnlock(undefined,550);
    const voice=playNarration('/audio/voices/el-crisis-4.mp3'),player=MusicDouble.instances.at(-1)!;
    expect(player.play).not.toHaveBeenCalled();expect(sources).toHaveLength(1);
    // A waiting voice already counts as a voice (a card or the music must not act as if nobody spoke).
    expect(narrationActive()).toBe(true);
    vi.advanceTimersByTime(550);
    expect(sources.slice(1).map(name)).toEqual(['map-open','map-twinkle']);
    expect(sources.slice(1).map(source=>source.start.mock.calls[0][0])).toEqual([0,.12]);
    expect(sources[0].stop).not.toHaveBeenCalled();
    sources.slice(1).forEach(source=>expect(context.gains.some(level=>source.connect.mock.calls[0][0]===level)).toBe(true));
    vi.advanceTimersByTime(440);expect(player.play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);expect(player.play).toHaveBeenCalledOnce();
    playEffect('click');sources.slice(1,3).forEach(source=>expect(source.stop).not.toHaveBeenCalled());
    voice();expect(narrationActive()).toBe(false);
    // A voice with no cue before it starts at once; a cancelled voice never starts late.
    playNarration('/audio/voices/a.mp3');expect(MusicDouble.instances.at(-1)!.play).toHaveBeenCalledOnce();
    playUnlock(undefined,550);const cancelled=playNarration('/audio/voices/b.mp3'),late=MusicDouble.instances.at(-1)!;
    cancelled();vi.advanceTimersByTime(2000);expect(late.play).not.toHaveBeenCalled();
    // Muted: no cue and no wait.
    syncAudioSettings({music:true,effects:false});const count=sources.length;playUnlock({music:true,effects:false},550);
    vi.advanceTimersByTime(2000);expect(sources).toHaveLength(count);expect(vi.getTimerCount()).toBe(0);
  });
});

describe('after the final theme ends (2026-11-19)',()=>{
  it('carries on with the main theme at 45% on the final screens and returns to the plain level on leaving',()=>{
    const doc=environment();ensureAudio({music:true});doc.dispatchEvent(new Event('pointerdown'));
    const music=MusicDouble.instances[0];setMusicTheme('final',true);
    expect(music.src).toBe('/audio/music/finale-theme.mp3');expect(music.volume).toBeCloseTo(.35);
    music.currentTime=74;music.ended=true;music.paused=true;music.onended!();
    expect(music.src).toBe('/audio/music/main-theme.mp3');expect(music.loop).toBe(true);expect(music.paused).toBe(false);expect(music.volume).toBeCloseTo(.1575);
    // Ending to certificate keeps the quiet main theme without a restart; a voice still ducks lower.
    music.currentTime=12;setMusicTheme('final');syncAudioSettings({music:true});
    expect(music.src).toBe('/audio/music/main-theme.mp3');expect(music.currentTime).toBe(12);expect(music.volume).toBeCloseTo(.1575);
    const stop=playNarration('/audio/voices/a.mp3');vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.0875);
    stop();vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.1575);
    setMusicTheme('main');vi.advanceTimersByTime(250);
    expect(music.src).toBe('/audio/music/main-theme.mp3');expect(music.currentTime).toBe(12);expect(music.volume).toBeCloseTo(.35);
    // Replaying the ending starts the final theme again at the plain level.
    setMusicTheme('final',true);expect(music.src).toBe('/audio/music/finale-theme.mp3');expect(music.currentTime).toBe(0);
    vi.advanceTimersByTime(250);expect(music.volume).toBeCloseTo(.35);
  });

  it('does the same in the map finale dialog and gives the main theme back at the plain level when it closes',()=>{
    const doc=environment();ensureAudio({music:true});doc.dispatchEvent(new Event('pointerdown'));
    const music=MusicDouble.instances[0];
    const announce=(open:boolean)=>doc.dispatchEvent(Object.assign(new Event('map-finale'),{detail:{open}}));
    announce(true);expect(music.src).toBe('/audio/music/finale-theme.mp3');
    music.ended=true;music.paused=true;music.onended!();
    expect(music.src).toBe('/audio/music/main-theme.mp3');expect(music.paused).toBe(false);expect(music.volume).toBeCloseTo(.1575);
    setMusicTheme('main');expect(music.volume).toBeCloseTo(.1575);
    music.currentTime=5;announce(false);vi.advanceTimersByTime(250);
    expect(music.src).toBe('/audio/music/main-theme.mp3');expect(music.currentTime).toBe(5);expect(music.volume).toBeCloseTo(.35);
    // The next finale starts the final theme from the top again.
    announce(true);expect(music.src).toBe('/audio/music/finale-theme.mp3');expect(music.currentTime).toBe(0);
  });
});
