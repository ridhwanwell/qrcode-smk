/**
 * Pembersihan memori browser lama (sekali jalan per perangkat).
 *
 * Versi lama website menyimpan "daftar data yang dihapus" di browser masing-masing
 * perangkat (smk_deleted_*). Akibatnya folder/data yang dibuat ulang di perangkat lain
 * tetap tersembunyi di perangkat ini (contoh: folder label 095).
 * Sekarang penghapusan dicatat di server, jadi daftar lama ini dibuang.
 */
const CLEANUP_VERSION_KEY = 'smk_storage_version';
const CLEANUP_VERSION = '2026-10-06-db-v2';

export function runStorageCleanup(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (localStorage.getItem(CLEANUP_VERSION_KEY) === CLEANUP_VERSION) return;

    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('smk_deleted_') ||   // daftar hapus lokal (penyebab data beda antar perangkat)
        key.startsWith('smk_inited_') ||    // penanda data contoh lama
        key.startsWith('smk_aset_')         // cache lama yang tidak dipakai lagi
      ) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(CLEANUP_VERSION_KEY, CLEANUP_VERSION);
    if (toRemove.length > 0) {
      console.info(`[StorageCleanup] ${toRemove.length} catatan lama di browser dibersihkan.`);
    }
  } catch (_) {
    // Browser mode privat / penyimpanan diblokir: abaikan
  }
}
