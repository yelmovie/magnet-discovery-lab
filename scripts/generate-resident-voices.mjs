/**
 * Offline Korean character voice build. Runtime/model setup: docs/resident-voices.md.
 * No cloud speech service is called. Only the rendered MP3s are shipped.
 * Usage: node scripts/generate-resident-voices.mjs --runtime <folder> --ffmpeg <binary>
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const runtimeArg = process.argv.includes('--runtime') ? arg('--runtime') : process.env.SUPERTONIC_RUNTIME;
const ffmpeg = process.argv.includes('--ffmpeg') ? arg('--ffmpeg') : process.env.FFMPEG;
if (!runtimeArg || !ffmpeg) throw new Error('Set --runtime and --ffmpeg. See docs/resident-voices.md.');
const runtime = path.resolve(runtimeArg);
const out = path.join(root, 'public/audio/voices');
const waveDir = path.join(runtime, 'resident-wav');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(waveDir, { recursive: true });

// Read the actual displayed dialogue so changing the game text cannot silently
// leave an unrelated script in this asset builder. UI questions are not voiced.
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const unescape = (value) => value.replace(/\\'/g, "'").replace(/\\n/g, ' ').replace(/\\\\/g, '\\');
const chatSource = read('src/resident-chat.ts');
const residentSource = read('src/expedition.ts');
const readStrings = (source, key) => [...source.matchAll(new RegExp(`\\b${key}\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g'))].map((match) => unescape(match[1]));
const text = Object.fromEntries(['hello', 'again', 'news'].map((kind) => [kind, readStrings(chatSource, kind)]));
text.science = readStrings(residentSource.split('export const residents = [')[1]?.split('] as const')[0] || '', 'speech');
for (const [kind, lines] of Object.entries(text)) if (lines.length !== 5) throw new Error(`Expected 5 ${kind} lines; got ${lines.length}`);

// speed is the model's speaking rate. pitch is in semitones; `shifted` also moves
// the formants, which makes the two small mascots sound small instead of just high.
const residents = [
  { name: '우체부', voice: 'M3', speed: 1.28, pitch: 1, formant: 'preserved', direction: '밝고 경쾌한 인사' },
  { name: '재료 연구원', voice: 'F2', speed: 1.25, pitch: 1, formant: 'preserved', direction: '호기심이 느껴지는 또렷한 설명' },
  { name: '시계탑 지기', voice: 'M5', speed: 1.14, pitch: -2, formant: 'preserved', direction: '낮고 여유 있는 어르신' },
  { name: '수조 관리인', voice: 'M1', speed: 1.2, pitch: 0, formant: 'preserved', direction: '다정한 안내' },
  { name: '발명가', voice: 'F4', speed: 1.16, pitch: 2, formant: 'preserved', direction: '활기찬 초대' },
];
const mascots = {
  밀이: { name: '밀이', voice: 'F3', speed: 1.3, pitch: 3, formant: 'shifted', direction: '씩씩하고 장난기 있는 자석 친구' },
  당이: { name: '당이', voice: 'F1', speed: 1.3, pitch: 5, formant: 'shifted', direction: '또랑또랑하고 똑똑한 자석 친구' },
};

const clipPlan = [];
residents.forEach((actor, index) => {
  for (const kind of ['hello', 'again', 'news', 'science']) clipPlan.push({ actor, resident: index + 1, kind, basename: `resident-${index + 1}-${kind}`, line: text[kind][index] });
});
const titleLines = [...read('src/quest-ui.ts').matchAll(/questCompanion\(\{ type: '(mili|dangi)', message: '((?:[^'\\]|\\.)*)'/g)];
if (titleLines.length !== 2) throw new Error(`Expected 2 title lines; got ${titleLines.length}`);
for (const [, type, line] of titleLines) clipPlan.push({ actor: mascots[type === 'mili' ? '밀이' : '당이'], kind: 'title', basename: `mascot-${type}-title`, line: unescape(line) });
const [introSource, finalSource] = read('src/story-video.ts').split(/\n\s*final: \{/);
for (const [film, source] of [['intro', introSource], ['final', finalSource]]) {
  const cues = [...source.matchAll(/\[\s*([\d.]+),\s*([\d.]+),\s*'(밀이|당이)',\s*'((?:[^'\\]|\\.)*)'/g)];
  if (!cues.length) throw new Error(`No ${film} film cues found`);
  cues.forEach((cue, index) => {
    const next = cues[index + 1];
    clipPlan.push({ actor: mascots[cue[3]], kind: 'story', basename: `story-${film}-${index + 1}`, line: unescape(cue[4]), limit: (next ? Number(next[1]) : Number(cue[2]) + .6) - Number(cue[1]) });
  });
}

const steps = 24;
const gapAfter = { '!': .1, '?': .12, '.': .14, '…': .22 };
const modelRevision = '75e6727618a02f323c720cba9478152d4bc16ca4';
const { loadTextToSpeech, loadVoiceStyle, writeWavFile } = await import(pathToFileURL(path.join(runtime, 'helper.mjs')).href);
const tts = await loadTextToSpeech(path.join(runtime, 'onnx'));

/** The model pads every render with silence; joined sentences must not inherit it. */
function trimmed(samples) {
  const list = Array.from(samples), peak = list.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  const limit = peak * .02, pad = Math.round(tts.sampleRate * .04);
  let start = 0, end = list.length - 1;
  while (start < end && Math.abs(list[start]) < limit) start++;
  while (end > start && Math.abs(list[end]) < limit) end--;
  return list.slice(Math.max(0, start - pad), Math.min(list.length, end + pad));
}

const clips = [];
for (const { actor, resident, kind, basename, line, limit } of clipPlan) {
  const style = loadVoiceStyle([path.join(runtime, 'voice_styles', `${actor.voice}.json`)]);
  // Render short sentences individually. This keeps the clause at the end of
  // longer science explanations from being swallowed by the speech model.
  const sentences = line.match(/[^.!?…]+[.!?…]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [line];
  let wav = [];
  for (const [index, sentence] of sentences.entries()) {
    const rendered = await tts.call(sentence, 'ko', style, steps, actor.speed, .1);
    wav = wav.concat(trimmed(rendered.wav));
    if (index < sentences.length - 1) wav = wav.concat(new Array(Math.round(tts.sampleRate * (gapAfter[sentence.at(-1)] ?? .12))).fill(0));
  }
  const seconds = wav.length / tts.sampleRate;
  if (wav.some((sample) => !Number.isFinite(sample))) throw new Error(`Invalid waveform: ${basename}`);
  const rms = Math.sqrt(wav.reduce((sum, sample) => sum + sample * sample, 0) / wav.length);
  if (rms < .005 || seconds < .6 || seconds > 30) throw new Error(`Suspicious audio: ${basename}`);
  const waveFile = path.join(waveDir, `${basename}.wav`);
  writeWavFile(waveFile, wav, tts.sampleRate);
  const mp3File = path.join(out, `${basename}.mp3`);
  const pitch = actor.pitch ? `rubberband=pitch=${(2 ** (actor.pitch / 12)).toFixed(4)}:pitchq=quality:formant=${actor.formant},` : '';
  const result = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', waveFile,
    '-af', `${pitch}highpass=f=80,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=5:release=60:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=in:d=0.015`,
    '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', mp3File], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || `FFmpeg failed: ${basename}`);
  const bytes = fs.readFileSync(mp3File);
  const syllables = (line.match(/[가-힣]/g) || []).length;
  clips.push({ ...(resident ? { resident } : {}), speaker: actor.name, kind, text: line, voice: actor.voice, speed: actor.speed, pitch: actor.pitch,
    src: `/audio/voices/${basename}.mp3`, durationSeconds: Math.round(seconds * 1000) / 1000, syllablesPerSecond: Math.round(syllables / seconds * 100) / 100,
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  console.log(`${basename}: ${seconds.toFixed(2)} sec, ${(syllables / seconds).toFixed(1)} syl/s, ${bytes.length} bytes${limit && seconds > limit ? `  ! longer than the ${limit.toFixed(1)} sec cue` : ''}`);
}
const manifest = {
  generatedAt: new Date().toISOString(), language: 'ko', model: 'Supertone/supertonic-2', modelRevision,
  modelLicense: 'OpenRAIL-M', sourceCodeLicense: 'MIT', runtime: 'onnxruntime-node@1.23.2',
  inferenceSteps: steps, sentencePauseSeconds: gapAfter, sampleRate: 44100, encoding: 'MP3 mono 96 kbps',
  modelUrl: `https://huggingface.co/Supertone/supertonic-2/tree/${modelRevision}`,
  licenseUrl: `https://huggingface.co/Supertone/supertonic-2/blob/${modelRevision}/LICENSE`,
  note: '공개 기본 목소리로 이 프로젝트의 대사를 합성했습니다. 인물의 목소리를 복제하지 않았습니다. 모델은 배포에 포함하지 않습니다.',
  cast: [...residents.map((actor, index) => ({ resident: index + 1, ...actor })), ...Object.values(mascots)], clips,
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${clips.length} voices, ${(clips.reduce((sum, clip) => sum + clip.bytes, 0) / 1048576).toFixed(2)} MiB.`);
