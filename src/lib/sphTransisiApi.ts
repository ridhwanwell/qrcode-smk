/**
 * Komunikasi browser <-> server untuk fitur SPH Transisi,
 * plus penyimpanan DRAFT di perangkat (IndexedDB) agar isian tidak hilang
 * saat internet rumah sakit putus atau halaman tertutup.
 */
import { apiFetch } from './apiClient';
import { supabase } from './supabaseClient';
import type { KamusEntry } from '../utils/sphTransisiParser';
import type { CalibrationSchedule, SphQuotation } from '../types';

const BUCKET = 'internal-documents';

async function readJson(res: Response): Promise<any> {
  try { return await res.json(); } catch { return {}; }
}

export class SphTransisiError extends Error {
  status: number;
  detail: any;
  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export async function ambilKamusAlat(): Promise<KamusEntry[]> {
  try {
    const res = await apiFetch('/api/sph-transisi/kamus', { retries: 1 });
    if (!res.ok) return [];
    const json = await readJson(res);
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}

export async function cekSphGanda(nomorSph: string): Promise<{ ganda: boolean; daftar: any[] } | null> {
  try {
    const res = await apiFetch('/api/sph-transisi/cek-ganda', {
      method: 'POST',
      body: JSON.stringify({ nomorSph }),
      retries: 1
    });
    if (!res.ok) return null;
    const json = await readJson(res);
    return { ganda: !!json.ganda, daftar: Array.isArray(json.daftar) ? json.daftar : [] };
  } catch {
    return null; // tidak bisa dicek sekarang (offline) -> server tetap mengecek saat simpan
  }
}

export async function hitungSha256(file: Blob): Promise<string | undefined> {
  try {
    if (!crypto?.subtle) return undefined;
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

/** Upload file SPH ke bucket privat lewat izin sekali pakai dari server. Mengembalikan path file. */
export async function uploadFileSph(file: File, jenisFile: 'pdf' | 'xlsx'): Promise<string> {
  const res = await apiFetch('/api/sph-transisi/upload-url', {
    method: 'POST',
    body: JSON.stringify({ jenisFile, ukuran: file.size })
  });
  const json = await readJson(res);
  if (!res.ok || !json.pathFile || !json.token) {
    throw new SphTransisiError(json.error || 'Gagal menyiapkan upload file', res.status, json);
  }
  const contentType = jenisFile === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  let lastErr: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(json.pathFile, json.token, file, { contentType });
      if (!error) return json.pathFile as string;
      lastErr = error;
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, [1000, 3000, 6000][attempt]));
  }
  throw new SphTransisiError(`Upload file gagal (${lastErr?.message || 'jaringan'}). Coba lagi saat internet stabil.`, 503);
}

export interface SimpanSphTransisiPayload {
  sph: Partial<SphQuotation>;
  schedule: Partial<CalibrationSchedule>;
  file: { pathFile: string; namaFile: string; jenisFile: 'pdf' | 'xlsx'; hashFile?: string };
  ringkasanFile: {
    jumlahUnit: number | null; total1: number | null; akomodasi: number | null;
    total2: number | null; ppn: number | null; grandTotal: number | null;
  };
  konfirmasiTotalBeda: boolean;
  kamus: { namaAsli: string; nomorKatalog: number; namaKatalog: string }[];
}

export async function simpanSphTransisi(
  payload: SimpanSphTransisiPayload,
  idempotencyKey: string
): Promise<{ sph: SphQuotation; schedule: CalibrationSchedule }> {
  const res = await apiFetch('/api/sph-transisi', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
    timeoutMs: 45000
  });
  const json = await readJson(res);
  if (!res.ok || !json.success) {
    throw new SphTransisiError(json.error || 'Gagal menyimpan SPH transisi', res.status, json);
  }
  return { sph: json.sph, schedule: json.schedule };
}

export interface RiwayatRealisasi {
  jenis: 'tambah_alat' | 'ubah_qty' | 'hapus_alat';
  nama_alat: string | null;
  qty_sph: number | null;
  qty_lama: number | null;
  qty_baru: number | null;
  diubah_oleh: string | null;
  waktu: string;
}

export async function ambilRiwayatRealisasi(idJadwal: string): Promise<RiwayatRealisasi[] | null> {
  try {
    const res = await apiFetch(`/api/sph-transisi/riwayat/${encodeURIComponent(idJadwal)}`, { retries: 1 });
    if (!res.ok) return null;
    const json = await readJson(res);
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return null;
  }
}

// ============================================================================
// DRAFT DI PERANGKAT (IndexedDB) — isian + file tetap ada walau internet putus
// ============================================================================
const DB_NAME = 'SMK_SphTransisi_Draft';
const STORE = 'draft';
const DRAFT_KEY = 'aktif';

export interface DraftSphTransisi<TState = any> {
  state: TState;
  file?: Blob;
  fileName?: string;
  fileType?: string;
  savedAt: string;
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB tidak tersedia'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function simpanDraft<T>(draft: DraftSphTransisi<T>): Promise<boolean> {
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(draft, DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    try {
      // Cadangan: simpan isian saja (tanpa file) di localStorage
      localStorage.setItem(`${DB_NAME}_${DRAFT_KEY}`, JSON.stringify({ ...draft, file: undefined }));
      return true;
    } catch {
      return false;
    }
  }
}

export async function bacaDraft<T>(): Promise<DraftSphTransisi<T> | null> {
  try {
    const db = await openDraftDb();
    const val = await new Promise<any>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(DRAFT_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (val) return val;
  } catch { /* lanjut ke cadangan */ }
  try {
    const raw = localStorage.getItem(`${DB_NAME}_${DRAFT_KEY}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function hapusDraft(): Promise<void> {
  try {
    const db = await openDraftDb();
    await new Promise<void>(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch { /* abaikan */ }
  try { localStorage.removeItem(`${DB_NAME}_${DRAFT_KEY}`); } catch { /* abaikan */ }
}

export function idempotencyBaru(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `sphtr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
