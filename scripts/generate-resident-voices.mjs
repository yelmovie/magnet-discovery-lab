/**
 * Offline Korean NPC voice build. Runtime/model setup: docs/resident-voices.md.
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
const chatSource = fs.readFileSync(path.join(root, 'src/resident-chat.ts'), 'utf8');
const residentSource = fs.readFileSync(path.join(root, 'src/expedition.ts'), 'utf8');
const readStrings = (source, key) => [...source.matchAll(new RegExp(`\\b${key}\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g'))]
  .map((match) => match[1].replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\'));
const text = Object.fromEntries(['hello', 'again', 'news'].map((kind) => [kind, readStrings(chatSource, kind)]));
text.science = readStrings(residentSource.split('export const residents = [')[1]?.split('] as const')[0] || '', 'speech');
for (const [kind, lines] of Object.entries(text)) if (lines.length !== 5) throw new Error(`Expected 5 ${kind} lines; got ${lines.length}`);

const cast = [
  { name: '우체부', voice: 'M3', speed: 1.00, direction: '밝고 경쾌한 인사' },
  { name: '재료 연구원', voice: 'F2', speed: 0.98, direction: '호기심이 느껴지는 또렷한 설명' },
  { name: '시계탑 지기', voice: 'M5', speed: 0.98, direction: '차분하고 여유 있는 설명' },
  { name: '수조 관리인', voice: 'M1', speed: 0.98, direction: '다정한 안내' },
  { name: '발명가', voice: 'F4', speed: 1.00, direction: '활기찬 초대' },
];
const modelRevision = '75e6727618a02f323c720cba9478152d4bc16ca4';
const { loadTextToSpeech, loadVoiceStyle, writeWavFile } = await import(pathToFileURL(path.join(runtime, 'helper.mjs')).href);
const tts = await loadTextToSpeech(path.join(runtime, 'onnx'));
const clips = [];
for (const [index, actor] of cast.entries()) {
  const style = loadVoiceStyle([path.join(runtime, 'voice_styles', `${actor.voice}.json`)]);
  for (const kind of ['hello', 'again', 'news', 'science']) {
    const line = text[kind][index];
    const basename = `resident-${index + 1}-${kind}`;
    // Render short sentences individually. This keeps the clause at the end of
    // longer science explanations from being swallowed by the speech model.
    const sentences = line.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [line];
    const wav = [];
    for (const [sentenceIndex, sentence] of sentences.entries()) {
      const rendered = await tts.call(sentence, 'ko', style, 12, actor.speed, 0.24);
      if (sentenceIndex) wav.push(...new Array(Math.round(tts.sampleRate * 0.19)).fill(0));
      for (const sample of rendered.wav) wav.push(sample);
    }
    const duration = [wav.length / tts.sampleRate];
    if (wav.some((sample) => !Number.isFinite(sample))) throw new Error(`Invalid waveform: ${basename}`);
    const rms = Math.sqrt(wav.reduce((sum, sample) => sum + sample * sample, 0) / wav.length);
    if (rms < 0.005 || duration[0] < 2 || duration[0] > 40) throw new Error(`Suspicious audio: ${basename}`);
    const waveFile = path.join(waveDir, `${basename}.wav`);
    writeWavFile(waveFile, wav, tts.sampleRate);
    const mp3File = path.join(out, `${basename}.mp3`);
    const result = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', waveFile,
      '-af', 'highpass=f=65,loudnorm=I=-18:TP=-1.5:LRA=9,afade=t=in:d=0.025',
      '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', mp3File], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw new Error(result.stderr || `FFmpeg failed: ${basename}`);
    const bytes = fs.readFileSync(mp3File);
    clips.push({ resident: index + 1, kind, text: line, voice: actor.voice, speed: actor.speed,
      src: `/audio/voices/${basename}.mp3`, durationSeconds: Math.round(duration[0] * 1000) / 1000,
      bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    console.log(`${basename}: ${duration[0].toFixed(2)} sec, ${bytes.length} bytes`);
  }
}
const manifest = {
  generatedAt: new Date().toISOString(), language: 'ko', model: 'Supertone/supertonic-2', modelRevision,
  modelLicense: 'OpenRAIL-M', sourceCodeLicense: 'MIT', runtime: 'onnxruntime-node@1.23.2',
  inferenceSteps: 12, sentencePauseSeconds: 0.19, sampleRate: 44100, encoding: 'MP3 mono 96 kbps',
  modelUrl: `https://huggingface.co/Supertone/supertonic-2/tree/${modelRevision}`,
  licenseUrl: `https://huggingface.co/Supertone/supertonic-2/blob/${modelRevision}/LICENSE`,
  note: '공개 기본 목소리로 이 프로젝트의 대사를 합성했습니다. 인물의 목소리를 복제하지 않았습니다. 모델은 배포에 포함하지 않습니다.',
  cast: cast.map((actor, index) => ({ resident: index + 1, ...actor })), clips,
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${clips.length} voices, ${(clips.reduce((sum, clip) => sum + clip.bytes, 0) / 1048576).toFixed(2)} MiB.`);
