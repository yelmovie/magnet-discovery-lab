import { freshSave, migrateSave, repairSave, validSave, type Save } from './domain';
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
    if (!validSave(raw)) {
      const repaired = repairSave(raw);
      if (repaired) try {
        // The damaged original is kept under its own key in the same commit as the repaired save.
        await new Promise<void>((resolve, reject) => {
          const tx = db!.transaction('saves', 'readwrite'), store = tx.objectStore('saves'), backup = store.get('corrupt-backup');
          backup.onsuccess = () => { if (backup.result === undefined) store.put(raw, 'corrupt-backup'); store.put(repaired, 'main'); };
          tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(new Error('저장 복구 실패'));
        });
        expectedRevision = repaired.revision;
        migrationNotice = '저장 일부가 손상돼서 읽을 수 있는 기록만 되살렸어. 원본은 따로 보관했어.';
        return repaired;
      } catch { /* The untouched original stays in main; the message below explains what to do. */ }
      persistenceError = '기존 저장을 읽을 수 없어. 원본은 보존했어. 새로 시작을 선택하면 초기화할 수 있어.'; db.close(); db = null; return freshSave();
    }
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
        const tx = connection.transaction(resetting ? ['saves', 'recordings'] : 'saves', 'readwrite');
        const store = tx.objectStore('saves'), read = store.get('main');
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
          if (resetting) {
            // Clear migrated backups and old audio with the same commit as the fresh save.
            store.clear();
            tx.objectStore('recordings').clear();
          }
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
