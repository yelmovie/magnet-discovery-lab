export const recordingLimit = 30;
export const canRecord = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export interface Recording { stop: () => void; cancel: () => void }
export interface RecordingEvents { onTick: (secondsLeft: number) => void; onDone: (blob: Blob) => void; onError: (message: string) => void }

/** The stream always ends here, so the microphone light never outlives the recording. */
export async function startRecording({ onTick, onDone, onError }: RecordingEvents): Promise<Recording | null> {
  let stream: MediaStream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (error) {
    onError((error as Error)?.name === 'NotAllowedError' ? '마이크를 쓸 수 없어. 글로 소개해도 괜찮아.' : '마이크를 찾지 못했어. 글로 소개해도 괜찮아.');
    return null;
  }
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined), parts: Blob[] = [];
  let left = recordingLimit, discard = false;
  const timer = window.setInterval(() => { left--; onTick(left); if (left <= 0) finish(); }, 1000);
  const release = () => { clearInterval(timer); stream.getTracks().forEach(track => track.stop()); };
  const finish = () => { if (recorder.state !== 'inactive') recorder.stop(); };
  recorder.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
  recorder.onerror = () => { discard = true; release(); onError('녹음이 멈췄어. 다시 눌러 보거나 글로 소개해 줘.'); };
  recorder.onstop = () => { release(); if (!discard && parts.length) onDone(new Blob(parts, { type: recorder.mimeType || 'audio/webm' })); };
  recorder.start();
  onTick(left);
  return { stop: finish, cancel: () => { discard = true; finish(); release(); } };
}
