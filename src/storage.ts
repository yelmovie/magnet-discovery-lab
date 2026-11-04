import { freshSave, migrateSave, validSave, type Save } from './domain';
let db: IDBDatabase | null = null;
let expectedRevision = 0;
let queue = Promise.resolve();
export let persistenceError = '';
export let migrationNotice = '';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('push-pull-city', 2);
    request.onupgradeneeded = () => {
      const names = request.result.objectStoreNames;
      if (!names?.contains('saves')) request.result.createObjectStore('saves');
      if (!names?.contains('recordings')) request.result.createObjectStore('recordings');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('다른 탭을 닫고 다시 열어줘.'));
  });
}
export async function load(): Promise<Save> {
  try {
    db = await openDatabase();
    const raw: unknown = await new Promise((resolve, reject) => { const r = db!.transaction('saves').objectStore('saves').get('main'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    if (raw === undefined) return freshSave();
    if (!validSave(raw)) { persistenceError = '기존 저장을 읽을 수 없어. 원본은 보존했어. 새로 시작을 선택하면 초기화할 수 있어.'; db.close(); db = null; return freshSave(); }
    expectedRevision = raw.revision;
    if (raw.version === 1) {
      const migrated = migrateSave(raw)!;
      // Backup and replacement commit together; a failed migration leaves main intact.
      try { await new Promise<void>((resolve, reject) => {
        const tx = db!.transaction('saves', 'readwrite'), store = tx.objectStore('saves');
        const request = store.get('main');
        request.onsuccess = () => {
          if ((request.result as Save)?.revision !== expectedRevision) { tx.abort(); return; }
          const backup = store.get('v1-backup');
          backup.onsuccess = () => { if (backup.result === undefined) store.put(raw, 'v1-backup'); store.put(migrated, 'main'); };
        };
        tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(new Error('저장 이전 실패'));
      }); } catch {
        persistenceError = '이전 기록을 옮기지 못했어. 원본은 보존했어. 이 창에서 계속하고 저장을 다시 확인해 줘.';
        db.close(); db = null; return migrated;
      }
      migrationNotice = '이전 탐험 기록을 보존했어. 진행 중 실험은 남은 관찰부터 이어가면 돼.';
      return migrated;
    }
    // Normalize optional v2 preferences in memory too; a v2 save may predate
    // independent music/effect controls. Persistence still uses its revision.
    return migrateSave(raw)!;
  } catch { persistenceError = '이 환경에서는 진행이 저장되지 않아. 현재 창에서 계속 플레이할 수 있어.'; return freshSave(); }
}
// The learner's voice stays on this device, in its own store so autosaves never copy it.
let previewRecording: Blob | undefined;
function recordings<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return (db ? Promise.resolve(db) : openDatabase()).then(connection => new Promise<T>((resolve, reject) => {
    const request = run(connection.transaction('recordings', mode).objectStore('recordings'));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
export async function saveRecording(blob: Blob, preview = false): Promise<void> {
  if (preview) { previewRecording = blob; return; }
  await recordings('readwrite', store => store.put(blob, 'idea'));
}
export function loadRecording(preview = false): Promise<Blob | undefined> {
  return preview ? Promise.resolve(previewRecording) : recordings<Blob | undefined>('readonly', store => store.get('idea'));
}
export async function clearRecordings(): Promise<void> {
  previewRecording = undefined;
  await recordings('readwrite', store => store.clear());
}
export function persist(s: Save): Promise<void> {
  if (!db) return Promise.reject(new Error(persistenceError || '저장소에 연결할 수 없어.'));
  return writeSave(s, false);
}
export function resetSave(s: Save): Promise<void> {
  return writeSave(s, true);
}
function writeSave(s: Save, resetting: boolean): Promise<void> {
  const snapshot = structuredClone(s);
  const operation = queue.catch(() => undefined).then(async () => {
    const connection = db ?? await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = connection.transaction('saves', 'readwrite'), store = tx.objectStore('saves'), read = store.get('main');
        let failure = '저장 공간을 확인하고 다시 시도해줘.';
        read.onsuccess = () => {
          const revision = read.result?.revision ?? 0;
          if (!resetting && revision !== expectedRevision) {
            failure = persistenceError = '다른 탭의 진행이 바뀌었어. 이 화면을 새로고침해줘.';
            tx.abort();
            return;
          }
          // A reset also advances the stored revision so older tabs cannot restore their copies.
          snapshot.revision = Math.max(expectedRevision, Number.isSafeInteger(revision) ? revision : 0) + 1;
          snapshot.updated = new Date().toISOString();
          store.put(snapshot, 'main');
        };
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(new Error(failure));
      });
    } catch (error) {
      if (!db) connection.close();
      throw error;
    }
    db = connection;
    expectedRevision = s.revision = snapshot.revision;
    persistenceError = '';
    if (resetting) migrationNotice = '';
  });
  queue = operation; return operation;
}
