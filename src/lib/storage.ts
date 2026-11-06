import { advance, newSave, parseSave, type Save } from './model.ts';

const BACKUP = 'pou-save-v1';
let database: Promise<IDBDatabase> | undefined;
let writes = Promise.resolve();

function db(): Promise<IDBDatabase> {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('pou-ipad', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => reject(new Error('Tutup tab Pou lain lalu coba lagi.'));
  });
}

export function emergencySave(save: Save): boolean {
  try { localStorage.setItem(BACKUP, JSON.stringify(save)); return true; }
  catch { return false; }
}

export async function loadSave(): Promise<{ save: Save; warning: string }> {
  const candidates: Save[] = [];
  let warning = '';
  let corrupt = false;
  try {
    const data = localStorage.getItem(BACKUP);
    if (data) { try { candidates.push(parseSave(JSON.parse(data))); } catch { corrupt = true; } }
  } catch { warning = 'Penyimpanan cadangan tidak tersedia. Gunakan Ekspor Save secara berkala.'; }
  try {
    const connection = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = connection.transaction('saves', 'readonly');
      const request = tx.objectStore('saves').getAll();
      request.onsuccess = () => {
        for (const value of request.result) {
          try { candidates.push(parseSave(value)); } catch { corrupt = true; }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { warning = 'IndexedDB tidak tersedia. Memakai cadangan lokal; ekspor save agar aman.'; }
  if (corrupt) warning = candidates.length ? 'Save utama bermasalah. Progress dipulihkan dari cadangan.' : 'Save tidak dapat dibaca. Impor file cadangan untuk memulihkan progress.';
  const save = candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? newSave();
  return { save: advance(save), warning };
}

export function saveProgress(save: Save): Promise<void> {
  const snapshot = parseSave(save);
  const localSaved = emergencySave(snapshot);
  const operation = writes.catch(() => {}).then(async () => {
    try {
      const connection = await db();
      await new Promise<void>((resolve, reject) => {
        const tx = connection.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const previous = store.get('current');
        previous.onsuccess = () => { if (previous.result) store.put(previous.result, 'previous'); };
        store.put(snapshot, 'current');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('Save dibatalkan.'));
      });
    } catch (error) { if (!localSaved) throw error; }
  });
  writes = operation;
  return operation;
}

export function exportSave(save: Save): void {
  const blob = new Blob([JSON.stringify(parseSave(save), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pou-save-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function importSave(file: File): Promise<Save> {
  if (file.size > 1_000_000) throw new Error('File save terlalu besar.');
  let input: unknown;
  try { input = JSON.parse(await file.text()); }
  catch { throw new Error('Pilih file JSON hasil Ekspor Save.'); }
  const save = advance(parseSave(input));
  await saveProgress(save);
  return save;
}
