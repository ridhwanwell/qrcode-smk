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
    tanggalKalibrasi: tanggalPelaksanaan || diterbitkan,
    kalibrasiUlang
  };
}

/** Ambil PDF sertifikat dari Google Drive (lewat server) lalu baca isinya. */
export async function readCertificateFromDrive(fileId: string): Promise<CertificateInfo> {
  const res = await apiFetch(`/api/drive-certificate/${encodeURIComponent(fileId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal mengambil PDF sertifikat dari Google Drive.');
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const items = await extractPdfTextItems(bytes);
  if (items.length === 0) {
    throw new Error('PDF sertifikat tidak berisi teks (kemungkinan hasil scan). Isi data secara manual.');
  }
  return parseCertificateItems(items);
}
