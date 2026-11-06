import { afterEach, describe, expect, it, vi } from 'vitest';
import { freshSave } from '../src/domain';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('storage failures', () => {
  it('allows play in memory but never claims persistence when IndexedDB fails', async () => {
    vi.stubGlobal('indexedDB', { open() { throw new Error('storage blocked'); } });
    const storage = await import('../src/storage');
    const s = await storage.load();
    expect(s.started).toBe(false); expect(storage.persistenceError).toContain('저장되지 않아');
    await expect(storage.persist(s)).rejects.toThrow();
  });
  it('preserves unsupported saved data instead of silently overwriting it', async () => {
    const put = vi.fn(), close = vi.fn();
    const request = () => { const r: {result?: unknown; onsuccess?:()=>void} = {}; queueMicrotask(() => { r.result = { version: 99 }; r.onsuccess?.(); }); return r; };
    vi.stubGlobal('indexedDB', { open() { const r: {result?:unknown;onsuccess?:()=>void} = {}; queueMicrotask(() => { r.result = { transaction: () => ({ objectStore: () => ({get:request, put}) }), close }; r.onsuccess?.(); }); return r; } });
    const storage = await import('../src/storage'); await storage.load();
    expect(storage.persistenceError).toContain('원본은 보존'); expect(close).toHaveBeenCalledOnce();
    await expect(storage.persist(freshSave())).rejects.toThrow(); expect(put).not.toHaveBeenCalled();
  });
});

// Minimal transactional IndexedDB double: writes become visible only on commit.
function databaseWith(legacy: ReturnType<typeof freshSave>, failMigration = false) {
  const data = new Map<string, unknown>([['main', structuredClone(legacy)]]);
  const recordings = new Map<string, unknown>();
  const database = { close: vi.fn(), transaction() {
    let pending = 0, aborted = false;
    const clears = new Set<Map<string, unknown>>();
    const writes = new Map<string, unknown>();
    const tx = { oncomplete: undefined as (() => void) | undefined, onabort: undefined as (() => void) | undefined, onerror: undefined as (() => void) | undefined,
      abort() { aborted = true; queueMicrotask(() => tx.onabort?.()); },
      objectStore(name: string) { return {
        get(key: string) {
          pending++; const request = { result: undefined as unknown, onsuccess: undefined as (() => void) | undefined };
          queueMicrotask(() => {
            if (aborted) return;
            request.result = data.get(key);
            try { request.onsuccess?.(); } catch { tx.abort(); }
            pending--;
            if (!pending) queueMicrotask(() => { if (!aborted) { for (const store of clears) store.clear(); for (const [k, v] of writes) data.set(k, v); tx.oncomplete?.(); } });
          }); return request;
        },
        put(value: unknown, key: string) { if (failMigration && key === 'main') throw new Error('quota'); writes.set(key, structuredClone(value)); },
        clear() { clears.add(name === 'recordings' ? recordings : data); },
      }; }
    }; return tx;
  } };
  vi.stubGlobal('indexedDB', { open() { const request = { result: database, onsuccess: undefined as (() => void) | undefined }; queueMicrotask(() => request.onsuccess?.()); return request; } });
  return Object.assign(data, { recordings });
}
describe('atomic v1 migration', () => {
  it('backs up the exact original before replacing main with v2', async () => {
    const legacy = freshSave(); legacy.version = 1; legacy.started = true; legacy.revision = 7;
    const data = databaseWith(legacy), storage = await import('../src/storage'), next = await storage.load();
    expect(next.version).toBe(2); expect(data.get('v1-backup')).toEqual(legacy); expect(data.get('main')).toEqual(next);
    expect(storage.persistenceError).toBe('');
  });
  it('leaves main intact and keeps migrated progress in memory if the transaction fails', async () => {
    const legacy = freshSave(); legacy.version = 1; legacy.started = true;
    const data = databaseWith(legacy, true), storage = await import('../src/storage'), next = await storage.load();
    expect(next.version).toBe(2); expect(next.started).toBe(true); expect(data.get('main')).toEqual(legacy); expect(data.has('v1-backup')).toBe(false);
    expect(storage.persistenceError).toContain('원본은 보존'); await expect(storage.persist(next)).rejects.toThrow();
  });
});

describe('v2 preference compatibility', () => {
  it('materializes independent sound defaults without rewriting the stored original on load', async () => {
    const old=freshSave();delete old.settings.music;delete old.settings.effects;delete old.settings.musicVolume;
    const data=databaseWith(old),storage=await import('../src/storage'),next=await storage.load();
    expect(next.settings.music).toBe(true);expect(next.settings.effects).toBe(true);
    next.settings.sound=next.settings.effects=false;
    expect(next.settings.music).toBe(true);expect(data.get('main')).toEqual(old);
  });
});

describe('progress reset', () => {
  it('commits the fresh record after pending saves and rejects a previous tab’s autosave', async () => {
    const original = freshSave();
    original.started = true;
    original.revision = 1;
    const data = databaseWith(original);
    data.set('v1-backup', { ...original, version: 1 });
    data.recordings.set('legacy-voice', new Blob(['sample']));
    const staleTab = await import('../src/storage');
    const staleCopy = await staleTab.load();
    vi.resetModules();
    const currentTab = await import('../src/storage');
    const current = await currentTab.load();
    const pending = currentTab.persist(current);
    const next = freshSave();
    next.settings.effects = false;
    await Promise.all([pending, currentTab.resetSave(next)]);
    expect(next.revision).toBe(3);
    await expect(staleTab.persist(staleCopy)).rejects.toThrow('다른 탭');
    expect(data.get('main')).toMatchObject({ revision: 3, started: false, settings: { effects: false } });
    expect(data.has('v1-backup')).toBe(false);
    expect(data.recordings.size).toBe(0);
    next.started = true;
    await currentTab.persist(next);
    expect(next.revision).toBe(4);
  });
  it('keeps the original record if the confirmed reset fails', async () => {
    const original = freshSave();
    original.started = true;
    const data = databaseWith(original, true);
    data.set('v1-backup', original);
    data.recordings.set('legacy-voice', new Blob(['sample']));
    const storage = await import('../src/storage');
    await storage.load();
    await expect(storage.resetSave(freshSave())).rejects.toThrow();
    expect(data.get('main')).toEqual(original);
    expect(data.get('v1-backup')).toEqual(original);
    expect(data.recordings.size).toBe(1);
  });
  it('allows an explicit reset to replace an unreadable record', async () => {
    const data = databaseWith(freshSave());
    data.set('main', { version: 99, revision: 7 });
    const storage = await import('../src/storage');
    await storage.load();
    expect(storage.persistenceError).not.toBe('');
    await storage.resetSave(freshSave());
    expect(data.get('main')).toMatchObject({ version: 2, revision: 8, started: false });
    expect(storage.persistenceError).toBe('');
  });
});
