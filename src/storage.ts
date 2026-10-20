import { freshSave, migrateSave, validSave, type Save } from './domain';
let db: IDBDatabase | null = null;
let expectedRevision = 0;
let queue = Promise.resolve();
export let persistenceError = '';
export let migrationNotice = '';
export async function load(): Promise<Save> {
  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('push-pull-city', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('다른 탭을 닫고 다시 열어줘.')); });
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
export function persist(s: Save): Promise<void> {
  if (!db) return Promise.reject(new Error(persistenceError || '저장소에 연결할 수 없어.'));
  const snapshot = structuredClone(s);
  const operation = queue.catch(() => undefined).then(() => new Promise<void>((resolve, reject) => {
    const tx = db!.transaction('saves', 'readwrite'); const store = tx.objectStore('saves'); const read = store.get('main');
    read.onsuccess = () => {
      const revision = (read.result as Save | undefined)?.revision ?? 0;
      if (revision !== expectedRevision) { persistenceError = '다른 탭의 진행이 바뀌었어. 다른 탭을 닫고 이 화면을 새로고침해줘.'; tx.abort(); return; }
      snapshot.revision = expectedRevision + 1; snapshot.updated = new Date().toISOString(); store.put(snapshot, 'main');
    };
    tx.oncomplete = () => { expectedRevision = snapshot.revision; s.revision = expectedRevision; persistenceError = ''; resolve(); };
    tx.onerror = () => reject(new Error('저장 공간을 확인하고 다시 시도해줘.'));
    tx.onabort = () => reject(new Error(persistenceError || '저장하지 못했어. 다시 시도해줘.'));
  }));
  queue = operation; return operation;
}
export async function clearSave(): Promise<void> {
  await queue.catch(() => undefined);
  if (!db) { db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('push-pull-city', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
  await new Promise<void>((resolve, reject) => { const tx = db!.transaction('saves', 'readwrite'); tx.objectStore('saves').delete('main'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  expectedRevision = 0; persistenceError = '';
}
