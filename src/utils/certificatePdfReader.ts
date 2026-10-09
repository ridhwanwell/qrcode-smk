/**
 * PEMBACA OTOMATIS SERTIFIKAT KALIBRASI (PDF format PT. SMK)
 * ------------------------------------------------------------
 * Dipakai saat admin menempelkan link Google Drive sertifikat di menu Label.
 * Data yang diambil:
 *   Halaman 1 : Nomor Sertifikat, Nama Alat, Nama Pelanggan, Merek, Type,
 *               Nomor Seri, Diterbitkan Tanggal, Kalibrasi Ulang
 *   Halaman 2 : Ruangan, Tanggal pelaksanaan kalibrasi
 *
 * PDF diambil lewat server (/api/drive-certificate/:fileId) karena browser
 * tidak boleh mengunduh langsung dari Google Drive, lalu dibaca di browser.
 */
import { PdfTextItem, extractPdfTextItems } from './bapPdfImport';
import { apiFetch } from '../lib/apiClient';

export interface CertificateInfo {
  nomorSertifikat: string;
  namaAlat: string;
  ruangan: string;
  namaPelanggan: string;
  merek: string;
  tipe: string;
  nomorSeri: string;
  tanggalKalibrasi: string; // YYYY-MM-DD (tanggal pelaksanaan, cadangan: tanggal terbit)
  kalibrasiUlang: string;   // YYYY-MM-DD
  /** Nomor halaman yang tidak ada di PDF (mis. "2"), menurut tulisan "Halaman x dari N" */
  halamanHilang?: string;
}

const ROW_TOLERANCE = 4;   // pt: label & isian dianggap 1 baris
const VALUE_BELOW = 14;    // pt: batas bawah isian bila label berikutnya tidak ditemukan
const SUBLABEL_GAP = 12;   // pt: terjemahan Inggris di bawah label (mis. "Unit Name") bukan label baru

const center = (it: PdfTextItem) => it.x + it.w / 2;

/** Gabungkan potongan teks; tanpa spasi bila potongannya menempel (mis. "1" "8" -> "18"). */
function joinItems(items: PdfTextItem[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = '';
  let prevEnd = -Infinity;
  for (const it of sorted) {
    const gap = it.x - prevEnd;
    out += out && gap > 1.5 ? ` ${it.str}` : it.str;
    prevEnd = it.x + it.w;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Ambil isian di kanan sebuah label pada halaman tertentu.
 * - label    : pola teks label (mis. /^Nama Alat$/)
 * - stopAt   : pola label lain di baris yang sama yang menjadi batas kanan isian
 */
function readField(items: PdfTextItem[], page: number, label: RegExp, stopAt?: RegExp): string {
  const pageItems = items.filter(i => i.page === page);
  const labelItem = pageItems
    .filter(i => label.test(i.str))
    .sort((a, b) => b.y - a.y || a.x - b.x)[0];
  if (!labelItem) return '';

  const row = pageItems
    .filter(i => Math.abs(i.y - labelItem.y) <= ROW_TOLERANCE && i.x >= labelItem.x)
    .sort((a, b) => a.x - b.x);

  // Ujung titik dua ":" setelah label (bisa menyatu dengan label, mis. "Nomor Sertifikat :")
  let colonEnd = labelItem.x + labelItem.w;
  if (!labelItem.str.trim().endsWith(':')) {
    const colon = row.find(i => i !== labelItem && /:\s*$/.test(i.str) && i.x >= labelItem.x);
    if (colon) colonEnd = colon.x + colon.w;
  }

  // Batas kanan = label berikutnya di baris yang sama
  let rightLimit = Infinity;
  if (stopAt) {
    const stop = row.find(i => i.x > colonEnd && stopAt.test(i.str));
    if (stop) rightLimit = stop.x;
  }

  // Batas bawah = label berikutnya di kolom label yang sama (isian bisa 2 baris,
  // mis. "Automated External" + "Defibrillator (AED)")
  const nextLabelBelow = pageItems
    .filter(i => Math.abs(i.x - labelItem.x) <= 2 && i.y < labelItem.y - SUBLABEL_GAP)
    .sort((a, b) => b.y - a.y)[0];
  const bottomY = nextLabelBelow ? nextLabelBelow.y + ROW_TOLERANCE : labelItem.y - VALUE_BELOW;

  const valueItems = pageItems.filter(i =>
    i.x >= colonEnd - 0.5 &&
    i.x < rightLimit &&
    i.y <= labelItem.y + ROW_TOLERANCE &&
    i.y > bottomY &&
    i.str.trim() !== ':'
  );

  // Susun per baris dari atas ke bawah, lalu gabungkan
  const lines: PdfTextItem[][] = [];
  [...valueItems].sort((a, b) => b.y - a.y).forEach(it => {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= 3) last.push(it);
    else lines.push([it]);
  });
  return lines.map(joinItems).join(' ').replace(/^:\s*/, '').replace(/\s+/g, ' ').trim();
}

const MONTHS: Record<string, number> = {
  januari: 1, jan: 1, january: 1,
  februari: 2, feb: 2, pebruari: 2, february: 2,
  maret: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  agustus: 8, agu: 8, agt: 8, aug: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11, nopember: 11,
  desember: 12, des: 12, dec: 12, december: 12
};

/** "18 Agustus 2026" / "18-08-2026" -> "2026-08-18". Kosong bila tidak dikenali. */
export function parseIndonesianDate(text: string): string {
  const t = (text || '').trim().toLowerCase();
  let m = t.match(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/);
  if (m && MONTHS[m[2]]) {
    return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = t.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

/** Parser murni (mudah dites) dari potongan teks PDF sertifikat. */
export function parseCertificateItems(items: PdfTextItem[]): CertificateInfo {
  const p1 = 1;
  const p2 = items.some(i => i.page === 2) ? 2 : 1;

  const nomorSertifikat = readField(items, p1, /^Nomor Sertifikat/i).split(' ')[0] || '';
  const namaAlat = readField(items, p1, /^Nama Alat$/i, /^Nomor Seri/i);
  const nomorSeri = readField(items, p1, /^Nomor Seri$/i);
  const namaPelanggan = readField(items, p1, /^Nama Pelanggan$/i);
  const merek = readField(items, p1, /^Merek Pabrik$/i, /^Rentang/i);
  const tipe = readField(items, p1, /^Type$/i, /^Resolusi/i);
  const diterbitkan = parseIndonesianDate(readField(items, p1, /^Diterbitkan Tanggal/i, /^Kalibrasi Ulang/i));
  const penerimaan = parseIndonesianDate(readField(items, p1, /^Tanggal Penerimaan/i));
  const kalibrasiUlang = parseIndonesianDate(readField(items, p1, /^Kalibrasi Ulang/i));

  const ruangan = readField(items, p2, /^Ruangan\b/i, /^Teknisi\b/i);
  const tanggalPelaksanaan = parseIndonesianDate(readField(items, p2, /^Tanggal\s*\/?$/i));

  return {
    nomorSertifikat,
    namaAlat,
    ruangan,
    namaPelanggan,
    merek: merek === '-' ? '' : merek,
    tipe: tipe === '-' ? '' : tipe,
    nomorSeri: nomorSeri === '-' ? '' : nomorSeri,
    tanggalKalibrasi: tanggalPelaksanaan || penerimaan || diterbitkan,
    kalibrasiUlang
  };
}

/** Ambil file PDF dari Google Drive lewat server (+ nama file aslinya bila diketahui). */
async function fetchDrivePdf(fileId: string): Promise<{ bytes: Uint8Array; fileName: string }> {
  const res = await apiFetch(`/api/drive-certificate/${encodeURIComponent(fileId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal mengambil PDF sertifikat dari Google Drive.');
  }
  let fileName = '';
  try { fileName = decodeURIComponent(res.headers.get('X-File-Name') || ''); } catch { /* abaikan */ }
  return { bytes: new Uint8Array(await res.arrayBuffer()), fileName };
}

/**
 * Baca nomor label & nama alat dari NAMA FILE, untuk PDF hasil scan.
 * Contoh: "087.0001 ECG Recorder.pdf" -> { noLabel: "087.0001", namaAlat: "ECG Recorder" }
 *         "087.0012_Suction Pump (2).pdf" -> { noLabel: "087.0012", namaAlat: "Suction Pump" }
 */
export function parseCertificateFileName(fileName: string): { noLabel: string; namaAlat: string } | null {
  const base = (fileName || '').replace(/\.pdf$/i, '').trim();
  const m = base.match(/(?:^|[^0-9.])(\d{2,4}\.\d{3,5})(?![0-9])/) || base.match(/^(\d{2,4}\.\d{3,5})(?![0-9])/);
  if (!m) return null;
  const noLabel = m[1];
  const namaAlat = base
    .slice(base.indexOf(noLabel) + noLabel.length)
    .replace(/\(\d+\)\s*$/, '')        // "(2)" salinan Drive
    .replace(/^[\s_\-–.:]+/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { noLabel, namaAlat };
}

export interface CertificateReadResult {
  info: CertificateInfo;
  fileName: string;
  /**
   * 'pdf'      = dibaca dari teks PDF
   * 'ocr'      = PDF scan, dibaca Gemini (perlu dicek ulang)
   * 'filename' = PDF scan, Gemini gagal → nomor & nama alat dari nama file
   */
  source: 'pdf' | 'ocr' | 'filename';
  /** Nomor di isi PDF berbeda dengan nomor di nama file */
  nameMismatch?: string;
  /** Alasan Gemini gagal (untuk ditampilkan bila jatuh ke nama file) */
  ocrError?: string;
}

const EMPTY_INFO: CertificateInfo = {
  nomorSertifikat: '', namaAlat: '', ruangan: '', namaPelanggan: '',
  merek: '', tipe: '', nomorSeri: '', tanggalKalibrasi: '', kalibrasiUlang: ''
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Error dari Gemini yang tidak ada gunanya diulang (kuota harian habis / key salah). */
export class GeminiUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'GeminiUnavailableError'; }
}

// --- Antrean Gemini: maksimal 2 pembacaan bersamaan agar kuota per menit tidak cepat penuh ---
const OCR_MAX_PARALLEL = 2;
let ocrRunning = 0;
const ocrWaiting: (() => void)[] = [];
async function withOcrSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (ocrRunning >= OCR_MAX_PARALLEL) await new Promise<void>(r => ocrWaiting.push(r));
  ocrRunning++;
  try {
    return await fn();
  } finally {
    ocrRunning--;
    ocrWaiting.shift()?.();
  }
}

// Bila Gemini dipastikan tidak bisa (kuota harian habis / key salah), file berikutnya tidak
// perlu mencoba lagi selama 10 menit -> langsung pakai nama file, tidak membuang waktu.
let geminiDownUntil = 0;
let geminiDownReason = '';

export interface OcrOptions {
  /** Dipanggil saat menunggu Gemini (detik) agar layar bisa menampilkan "menunggu…" */
  onWait?: (seconds: number) => void;
  /** Dicek tiap detik saat menunggu; true = batalkan */
  isCancelled?: () => boolean;
}

/**
 * Baca PDF hasil scan dengan Gemini (lewat server). Server mengunduh PDF sendiri dari
 * Google Drive, jadi browser tidak perlu mengunggah ulang file.
 * Bila Gemini sibuk / kuota per menit penuh, tunggu lalu coba lagi (maks 5x).
 */
export async function ocrCertificateFromDrive(fileId: string, opts: OcrOptions = {}): Promise<CertificateInfo> {
  if (geminiDownUntil > Date.now()) throw new GeminiUnavailableError(geminiDownReason);

  return withOcrSlot(async () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      if (geminiDownUntil > Date.now()) throw new GeminiUnavailableError(geminiDownReason);
      let res: Response;
      try {
        res = await apiFetch(`/api/drive-certificate/${encodeURIComponent(fileId)}/ocr`, {
          timeoutMs: 65000,
          retries: 0 // jeda ulang diatur di sini, bukan oleh apiFetch
        });
      } catch {
        // Internet RS putus sebentar: tunggu lalu coba lagi
        if (attempt >= 5) throw new Error('Koneksi terputus saat membaca dengan Gemini.');
        await waitSeconds(10, opts);
        continue;
      }
      const body = await res.json().catch(() => ({} as any));
      if (res.ok) return { ...EMPTY_INFO, ...body };

      if (body.code === 'GEMINI_QUOTA_DAY' || body.code === 'GEMINI_KEY' || body.code === 'NO_GEMINI_KEY') {
        geminiDownUntil = Date.now() + 10 * 60 * 1000;
        geminiDownReason = body.error || 'Gemini tidak tersedia.';
        throw new GeminiUnavailableError(geminiDownReason);
      }
      const retryable = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
      if (!retryable || attempt >= 5) {
        throw new Error(body.error || `Gemini gagal membaca sertifikat (HTTP ${res.status}).`);
      }
      const wait = Math.min(Number(res.headers.get('Retry-After')) || 15, 60) + Math.random() * 3;
      await waitSeconds(wait, opts);
    }
    throw new Error('Gemini terus sibuk. Coba baca ulang beberapa menit lagi.');
  });
}

async function waitSeconds(seconds: number, opts: OcrOptions) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (opts.isCancelled?.()) throw new Error('Dibatalkan.');
    opts.onWait?.(Math.ceil((end - Date.now()) / 1000));
    await sleep(1000);
  }
  opts.onWait?.(0);
}

/**
 * Versi untuk tautkan massal: PDF scan TIDAK dianggap gagal.
 * Urutan: teks PDF → Gemini (PDF scan) → nama file (cadangan bila Gemini gagal).
 */
export async function readCertificateFromDriveDetailed(fileId: string, knownFileName = '', opts: OcrOptions = {}): Promise<CertificateReadResult> {
  const { bytes, fileName: serverName } = await fetchDrivePdf(fileId);
  const fileName = knownFileName || serverName;
  const fromName = parseCertificateFileName(fileName);
  const items = await extractPdfTextItems(bytes);
  const textInfo = items.length > 0 ? parseCertificateItems(items) : null;

  const withMismatch = (r: CertificateReadResult): CertificateReadResult => {
    const a = r.info.nomorSertifikat.replace(/[^0-9A-Za-z]/g, '');
    const b = fromName?.noLabel.replace(/[^0-9A-Za-z]/g, '');
    return a && b && a !== b ? { ...r, nameMismatch: fromName!.noLabel } : r;
  };

  if (textInfo && textInfo.nomorSertifikat) return withMismatch({ info: textInfo, fileName, source: 'pdf' });

  // PDF scan (atau teks tanpa nomor) → baca dengan Gemini
  let ocrError = '';
  try {
    const ocr = await ocrCertificateFromDrive(fileId, opts);
    if (ocr.nomorSertifikat) return withMismatch({ info: ocr, fileName, source: 'ocr' });
    if (fromName) {
      // Gemini membaca isinya tapi nomor tidak terbaca → nomor dari nama file, sisanya dari Gemini
      return {
        info: { ...ocr, nomorSertifikat: fromName.noLabel, namaAlat: ocr.namaAlat || fromName.namaAlat },
        fileName,
        source: 'ocr'
      };
    }
    ocrError = 'Gemini tidak menemukan Nomor Sertifikat di PDF.';
  } catch (err: any) {
    ocrError = err?.message || 'Gemini gagal membaca PDF.';
  }

  if (fromName) {
    return {
      info: { ...EMPTY_INFO, ...(textInfo || {}), nomorSertifikat: fromName.noLabel, namaAlat: textInfo?.namaAlat || fromName.namaAlat },
      fileName,
      source: 'filename',
      ocrError
    };
  }
  throw new Error(`${ocrError} ${fileName
    ? `Nama file "${fileName}" juga tidak mengandung nomor label — ganti menjadi "087.0001 Nama Alat.pdf" lalu baca ulang.`
    : 'Tempel link FOLDER agar nomor label bisa diambil dari nama file.'}`.trim());
}

/** Ambil PDF sertifikat dari Google Drive (lewat server) lalu baca isinya. PDF scan dibaca Gemini. */
export async function readCertificateFromDrive(fileId: string): Promise<CertificateInfo> {
  const { bytes } = await fetchDrivePdf(fileId);
  const items = await extractPdfTextItems(bytes);
  if (items.length > 0) return parseCertificateItems(items);
  try {
    return await ocrCertificateFromDrive(fileId);
  } catch (err: any) {
    throw new Error(`PDF hasil scan, dan pembacaan Gemini gagal: ${err?.message || 'tidak diketahui'} Isi data secara manual.`);
  }
}
