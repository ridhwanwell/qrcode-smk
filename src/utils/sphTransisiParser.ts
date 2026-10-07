/**
 * PEMBACA FILE SPH LAMA (masa transisi Excel -> website)
 * -------------------------------------------------------
 * Membaca SPH lama (PDF hasil ekspor Excel, atau file Excel .xlsx aslinya) LANGSUNG di browser.
 * Tidak memakai AI, tidak ada file yang dikirim ke server saat membaca.
 *
 * Yang diambil:
 *  - Nomor SPH, tanggal, nama & alamat RS
 *  - Daftar alat: No | Deskripsi | Qty | Satuan | Harga Satuan | Total Harga
 *  - Tanda bintang di nama alat (*, **, ***, ****) -> keterangan khusus
 *  - Angka ringkasan yang TERTULIS di file (Jumlah unit, Total 1, Akomodasi, Total 2, PPN, Grand Total).
 *    Dibaca berdasarkan TULISAN LABEL-nya, bukan urutan baris (urutan di tiap SPH bisa beda).
 *
 * Bagian utama berupa fungsi murni (tanpa React) supaya mudah dites.
 */
import { SphItem, TandaKeteranganSph } from '../types';
import { SPH_TARIFF_CATALOG, TariffItem } from '../data/sphTariffCatalog';
import { extractPdfTextItems, PdfTextItem } from './bapPdfImport';

// ============================================================================
// 1. TIPE HASIL BACA
// ============================================================================
export interface ParsedSphRow {
  no: number;
  namaAsli: string;              // persis seperti di file (tanpa tanda bintang)
  tanda: TandaKeteranganSph | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SphRingkasan {
  jumlahUnit: number | null;
  total1: number | null;
  diskon: number | null;
  akomodasi: number | null;
  total2: number | null;
  ppnPersen: number | null;
  ppn: number | null;
  grandTotal: number | null;
}

export interface ParsedSphFile {
  jenisFile: 'pdf' | 'xlsx';
  sphNumber: string;
  tanggal: string;               // YYYY-MM-DD ('' jika tidak terbaca)
  kota: string;
  hospitalName: string;
  hospitalAddress: string;
  recipientRole: string;
  rows: ParsedSphRow[];
  ringkasan: SphRingkasan;
  warnings: string[];
}

export const TANDA_KETERANGAN: Record<TandaKeteranganSph, string> = {
  '*': 'Hanya Uji Keselamatan Listrik dan/atau Uji Fungsi & Kondisi Alat',
  '**': 'Alat ditarik ke PT Sarana Multi Kalibrasi',
  '***': 'Alat ditarik untuk subkontraktor pekerjaan',
  '****': 'Tidak termasuk jenis alat wajib kalibrasi'
};

// ============================================================================
// 2. FUNGSI BANTU
// ============================================================================
const BULAN: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7,
  agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, agt: 8, ags: 8, sep: 9, okt: 10, nov: 11, des: 12
};

/** "1.549.280" / "1.549.280,50" / 1549280 -> 1549280 (dibulatkan ke rupiah) */
export function parseRupiah(raw: unknown): number | null {
  if (typeof raw === 'number') return isFinite(raw) ? Math.round(raw) : null;
  if (raw === null || raw === undefined) return null;
  let s = String(raw).replace(/rp\.?/gi, '').replace(/\s/g, '').trim();
  if (!s || s === '-') return null;
  if (!/^[\d.,]+$/.test(s)) return null;
  // Format Indonesia: titik = ribuan, koma = desimal
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[.,]/g, '');
  const n = Number(s);
  return isFinite(n) ? Math.round(n) : null;
}

function parseIntStrict(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : null;
  const s = String(raw ?? '').trim();
  return /^\d+$/.test(s) ? parseInt(s, 10) : null;
}

/** Pisahkan tanda bintang di akhir nama alat: "Blood Gas Analyzer*" / "K-Lite 5 (...)+*" */
export function splitTanda(name: string): { nama: string; tanda: TandaKeteranganSph | null } {
  const m = name.match(/^(.*?)\s*\+?\s*(\*{1,4})\s*$/);
  if (!m || !m[1].trim()) return { nama: name.trim(), tanda: null };
  return { nama: m[1].trim(), tanda: m[2] as TandaKeteranganSph };
}

/** "Surakarta, 05 Oktober 2026" -> { kota, tanggal: '2026-10-05' } */
export function parseTanggalSurat(text: string): { kota: string; tanggal: string } | null {
  const m = text.match(/([A-Za-z][A-Za-z .'-]{2,40}),\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (!m) return null;
  const bulan = BULAN[m[3].toLowerCase()];
  if (!bulan) return null;
  const tanggal = `${m[4]}-${String(bulan).padStart(2, '0')}-${String(parseInt(m[2], 10)).padStart(2, '0')}`;
  return { kota: m[1].trim(), tanggal };
}

const SPH_NUMBER_RE = /\b(\d{1,4}\s*\/\s*SMK[- ]?SPH\s*\/\s*[IVXLC]+\s*[-/]\s*\d{4})\b/i;

function cleanSphNumber(s: string): string {
  return s.replace(/\s+/g, '').toUpperCase();
}

function emptyRingkasan(): SphRingkasan {
  return { jumlahUnit: null, total1: null, diskon: null, akomodasi: null, total2: null, ppnPersen: null, ppn: null, grandTotal: null };
}

/** Cari angka ringkasan di satu baris teks berdasarkan tulisan labelnya. */
function readRingkasanFromText(line: string, r: SphRingkasan) {
  const num = '(\\d[\\d.,]*)';
  const take = (re: RegExp) => {
    const m = line.match(re);
    return m ? parseRupiah(m[m.length - 1]) : null;
  };
  const jumlah = line.match(/\bJumlah\b\s*:?\s*(\d[\d.]*)\s*(?:Unit|Alat|Set|Pcs)?/i);
  if (jumlah && r.jumlahUnit === null) r.jumlahUnit = parseRupiah(jumlah[1]);
  const t1 = take(new RegExp(`Total\\s*1\\b\\s*:?\\s*(?:Rp\\.?)?\\s*${num}`, 'i'));
  if (t1 !== null && r.total1 === null) r.total1 = t1;
  const t2 = take(new RegExp(`Total\\s*2\\b\\s*:?\\s*(?:Rp\\.?)?\\s*${num}`, 'i'));
  if (t2 !== null && r.total2 === null) r.total2 = t2;
  const ak = take(new RegExp(`Akomodasi\\b[^\\dR]*(?:Rp\\.?)?\\s*${num}`, 'i'));
  if (ak !== null && r.akomodasi === null) r.akomodasi = ak;
  const disk = take(new RegExp(`(?:Diskon|Discount|Potongan)\\b[^R]*?(?:Rp\\.?)\\s*${num}`, 'i'));
  if (disk !== null && r.diskon === null) r.diskon = disk;
  const ppn = line.match(/PPN\s*(\d{1,2}(?:[.,]\d+)?)?\s*%?\s*:?\s*(?:Rp\.?)\s*(\d[\d.,]*)/i);
  if (ppn && r.ppn === null) {
    r.ppn = parseRupiah(ppn[2]);
    if (ppn[1]) r.ppnPersen = Number(ppn[1].replace(',', '.'));
  }
  const gt = take(new RegExp(`Grand\\s*Total\\b\\s*:?\\s*(?:Rp\\.?)?\\s*${num}`, 'i'));
  if (gt !== null && r.grandTotal === null) r.grandTotal = gt;
}

/** Ambil nama RS & alamat dari blok "Kepada Yth" (daftar baris teks berurutan). */
function readPenerima(lines: string[]): { recipientRole: string; hospitalName: string; hospitalAddress: string } {
  const out = { recipientRole: '', hospitalName: '', hospitalAddress: '' };
  const idx = lines.findIndex(l => /Kepada\s*Yth/i.test(l));
  if (idx === -1) return out;
  const block: string[] = [];
  for (let i = idx + 1; i < lines.length && block.length < 5; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (/^Dengan\s+Hormat/i.test(l) || /^Perihal|^Nomor|^Lampiran/i.test(l)) break;
    block.push(l);
  }
  let k = 0;
  if (block[k] && /^(Direktur|Kepala|Ka\.|Yth|Bapak|Ibu|Kabag|Kasubag|Manajer|Pimpinan|PPK|Pejabat)/i.test(block[k]) && !/(Rumah\s*Sakit|RS[UIA]?\b|Klinik|Puskesmas)/i.test(block[k])) {
    out.recipientRole = block[k];
    k++;
  }
  out.hospitalName = block[k] || '';
  out.hospitalAddress = block.slice(k + 1).join(', ');
  return out;
}

// ============================================================================
// 3. PARSER PDF (dari potongan teks + posisi hasil pdfjs)
// ============================================================================
const LINE_TOL = 3; // pt

/** Kelompokkan teks per halaman lalu per baris (y), urut kiri -> kanan. */
export function groupPdfLines(items: PdfTextItem[]): { page: number; y: number; items: PdfTextItem[]; text: string }[] {
  const pages = new Map<number, PdfTextItem[]>();
  items.forEach(it => {
    if (!pages.has(it.page)) pages.set(it.page, []);
    pages.get(it.page)!.push(it);
  });
  const out: { page: number; y: number; items: PdfTextItem[]; text: string }[] = [];
  Array.from(pages.keys()).sort((a, b) => a - b).forEach(p => {
    const sorted = [...pages.get(p)!].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: PdfTextItem[][] = [];
    for (const it of sorted) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= LINE_TOL) last.push(it);
      else lines.push([it]);
    }
    lines.forEach(l => {
      const row = l.sort((a, b) => a.x - b.x);
      out.push({ page: p, y: row[0].y, items: row, text: row.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim() });
    });
  });
  return out;
}

const ROW_RE = /^(\d{1,3})\.?\s+(.+?)\s+(\d{1,5})\s+([A-Za-z]{2,12})\s+(?:Rp\.?\s*)?([\d.,]+)\s+(?:Rp\.?\s*)?([\d.,]+)\s*$/i;

export function parseSphFromPdfItems(items: PdfTextItem[]): ParsedSphFile {
  const lines = groupPdfLines(items);
  const texts = lines.map(l => l.text);
  const warnings: string[] = [];
  const result: ParsedSphFile = {
    jenisFile: 'pdf', sphNumber: '', tanggal: '', kota: '', hospitalName: '', hospitalAddress: '',
    recipientRole: '', rows: [], ringkasan: emptyRingkasan(), warnings
  };

  // Header
  for (const t of texts) {
    if (!result.sphNumber) {
      const m = t.match(SPH_NUMBER_RE);
      if (m) result.sphNumber = cleanSphNumber(m[1]);
    }
    if (!result.tanggal) {
      const d = parseTanggalSurat(t.replace(/^.*Kepada\s*Yth\s*:?/i, ''));
      if (d) { result.tanggal = d.tanggal; result.kota = d.kota; }
    }
  }
  const firstPage = lines.filter(l => l.page === lines[0]?.page).map(l => {
    // buang tanggal yang sebaris dengan "Kepada Yth"
    return l.text.replace(/\s+[A-Za-z .]+,\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*$/, '');
  });
  Object.assign(result, readPenerima(firstPage));

  // Baris alat + ringkasan
  const seenNo = new Set<number>();
  let lastRowIndex = -1;
  let descRange: { min: number; max: number } | null = null;
  let footerStarted = false;

  lines.forEach((line, i) => {
    const t = line.text;
    const m = t.match(ROW_RE);
    if (m && !footerStarted) {
      const no = parseInt(m[1], 10);
      const qty = parseInt(m[3], 10);
      const unitPrice = parseRupiah(m[5]);
      const totalPrice = parseRupiah(m[6]);
      if (unitPrice !== null && totalPrice !== null) {
        if (seenNo.has(no)) {
          warnings.push(`Nomor alat ${no} muncul dua kali di file, baris kedua diabaikan.`);
          return;
        }
        seenNo.add(no);
        const { nama, tanda } = splitTanda(m[2]);
        result.rows.push({ no, namaAsli: nama, tanda, quantity: qty, unit: m[4], unitPrice, totalPrice });
        lastRowIndex = i;
        // posisi kolom deskripsi (untuk nama alat yang terpotong ke baris berikutnya)
        const descItems = line.items.slice(1).filter(it => !/^\d+$/.test(it.str) && !/^Rp/i.test(it.str));
        if (descItems.length) {
          const min = descItems[0].x - 2;
          descRange = { min, max: min + 200 };
        }
        return;
      }
    }

    if (/\bJumlah\b/i.test(t) || /Total\s*1\b/i.test(t) || /Grand\s*Total/i.test(t)) footerStarted = true;
    if (footerStarted || (result.rows.length > 0 && /Akomodasi|PPN|Total\s*2/i.test(t))) {
      readRingkasanFromText(t, result.ringkasan);
      return;
    }

    // Lanjutan nama alat yang terpotong (baris tepat setelah baris alat, hanya di kolom deskripsi)
    if (
      lastRowIndex === i - 1 && descRange && result.rows.length > 0 &&
      line.page === lines[lastRowIndex].page &&
      Math.abs(lines[lastRowIndex].y - line.y) < 14 &&
      line.items.every(it => it.x >= descRange!.min && it.x <= descRange!.max) &&
      !/\d{3,}/.test(t)
    ) {
      const last = result.rows[result.rows.length - 1];
      const { nama, tanda } = splitTanda(`${last.namaAsli} ${t}`);
      last.namaAsli = nama;
      if (tanda) last.tanda = tanda;
      lastRowIndex = i;
    }
  });

  finishParse(result);
  return result;
}

export async function parseSphPdfFile(file: File | ArrayBuffer | Uint8Array): Promise<ParsedSphFile> {
  const items = await extractPdfTextItems(file);
  if (items.length === 0) {
    return {
      jenisFile: 'pdf', sphNumber: '', tanggal: '', kota: '', hospitalName: '', hospitalAddress: '', recipientRole: '',
      rows: [], ringkasan: emptyRingkasan(),
      warnings: ['PDF tidak berisi teks (kemungkinan hasil scan/foto). Gunakan PDF hasil "Save as PDF" dari Excel, atau upload file Excel-nya.']
    };
  }
  return parseSphFromPdfItems(items);
}

// ============================================================================
// 4. PARSER EXCEL (.xlsx) — dari tabel sel (array 2 dimensi)
// ============================================================================
export function parseSphFromSheets(sheets: { name: string; rows: unknown[][] }[]): ParsedSphFile {
  const warnings: string[] = [];
  const result: ParsedSphFile = {
    jenisFile: 'xlsx', sphNumber: '', tanggal: '', kota: '', hospitalName: '', hospitalAddress: '',
    recipientRole: '', rows: [], ringkasan: emptyRingkasan(), warnings
  };

  const cellStr = (v: unknown) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());

  // Pilih sheet dengan baris alat terbanyak
  let best: { rows: ParsedSphRow[]; ringkasan: SphRingkasan; sheet: unknown[][] } | null = null;

  for (const sh of sheets) {
    const rows: ParsedSphRow[] = [];
    const ringkasan = emptyRingkasan();
    const seen = new Set<number>();
    for (const raw of sh.rows) {
      if (!Array.isArray(raw)) continue;
      const cells = raw.map(v => (typeof v === 'string' ? v.trim() : v)).filter(v => v !== null && v !== undefined && v !== '' && !(typeof v === 'string' && /^Rp\.?$/i.test(v)));
      if (cells.length === 0) continue;
      const lineText = cells.map(cellStr).join(' ');

      // Baris alat: No | Deskripsi | Qty | Satuan | Harga | Total
      if (cells.length >= 6) {
        const no = parseIntStrict(cells[0]);
        const desc = typeof cells[1] === 'string' ? cells[1] : '';
        const qty = parseIntStrict(cells[2]);
        const unit = typeof cells[3] === 'string' ? cells[3] : '';
        const price = parseRupiah(cells[4]);
        const total = parseRupiah(cells[5]);
        if (no !== null && no > 0 && no < 1000 && desc && /[A-Za-z]/.test(desc) && qty !== null && unit && /^[A-Za-z]{2,12}$/.test(unit) && price !== null && total !== null) {
          if (!seen.has(no)) {
            seen.add(no);
            const { nama, tanda } = splitTanda(desc);
            rows.push({ no, namaAsli: nama, tanda, quantity: qty, unit, unitPrice: price, totalPrice: total });
          }
          continue;
        }
      }

      // Ringkasan: label lalu angka berikutnya di baris yang sama
      for (let c = 0; c < cells.length; c++) {
        const label = cellStr(cells[c]);
        const nextNum = () => {
          for (let d = c + 1; d < cells.length; d++) {
            const n = parseRupiah(cells[d]);
            if (n !== null) return n;
          }
          return null;
        };
        if (/^Jumlah$/i.test(label) && ringkasan.jumlahUnit === null) ringkasan.jumlahUnit = nextNum();
        else if (/^Total\s*1$/i.test(label) && ringkasan.total1 === null) ringkasan.total1 = nextNum();
        else if (/^Total\s*2$/i.test(label) && ringkasan.total2 === null) ringkasan.total2 = nextNum();
        else if (/^Akomodasi/i.test(label) && ringkasan.akomodasi === null) ringkasan.akomodasi = nextNum();
        else if (/^(Diskon|Discount|Potongan)/i.test(label) && ringkasan.diskon === null) ringkasan.diskon = nextNum();
        else if (/^Grand\s*Total/i.test(label) && ringkasan.grandTotal === null) ringkasan.grandTotal = nextNum();
        else if (/^PPN/i.test(label) && ringkasan.ppn === null) {
          ringkasan.ppn = nextNum();
          const p = label.match(/(\d{1,2}(?:[.,]\d+)?)\s*%/);
          if (p) ringkasan.ppnPersen = Number(p[1].replace(',', '.'));
        }
      }
      // Ringkasan yang ditulis dalam satu sel teks ("Total 1 Rp 20.090.090")
      if (/Total|PPN|Akomodasi|Jumlah/i.test(lineText)) readRingkasanFromText(lineText, ringkasan);
    }
    if (!best || rows.length > best.rows.length) best = { rows, ringkasan, sheet: sh.rows };
  }

  // Header: cari di semua sheet
  const allLines: string[][] = sheets.map(sh => sh.rows.map(r => (Array.isArray(r) ? r.map(cellStr).filter(Boolean).join(' ') : '')));
  for (const lines of allLines) {
    for (const t of lines) {
      if (!result.sphNumber) {
        const m = t.match(SPH_NUMBER_RE);
        if (m) result.sphNumber = cleanSphNumber(m[1]);
      }
      if (!result.tanggal) {
        const d = parseTanggalSurat(t.replace(/^.*Kepada\s*Yth\s*:?/i, ''));
        if (d) { result.tanggal = d.tanggal; result.kota = d.kota; }
      }
    }
    if (!result.hospitalName) {
      const cleaned = lines.map(l => l.replace(/\s+[A-Za-z .]+,\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*$/, ''));
      const pen = readPenerima(cleaned);
      if (pen.hospitalName) Object.assign(result, pen);
    }
  }

  if (best) {
    result.rows = best.rows;
    result.ringkasan = best.ringkasan;
  }
  finishParse(result);
  return result;
}

export async function parseSphXlsxFile(file: File | ArrayBuffer): Promise<ParsedSphFile> {
  const XLSX: any = await import('xlsx');
  const buf = file instanceof ArrayBuffer ? file : await (file as File).arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheets = (wb.SheetNames as string[]).map(name => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: false }) as unknown[][]
  }));
  return parseSphFromSheets(sheets);
}

/** Pilih pembaca sesuai jenis file. */
export async function parseSphFile(file: File): Promise<ParsedSphFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return parseSphPdfFile(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseSphXlsxFile(file);
  throw new Error('Format file tidak didukung. Gunakan PDF (hasil ekspor Excel) atau file Excel .xlsx');
}

// ============================================================================
// 5. CEK TOTAL & PERINGATAN
// ============================================================================
function finishParse(r: ParsedSphFile) {
  r.rows.sort((a, b) => a.no - b.no);
  if (r.rows.length === 0) {
    r.warnings.push('Daftar alat tidak terbaca. Pastikan file adalah SPH PT. SMK dengan kolom No | Deskripsi | Qty | Satuan | Harga | Total.');
    return;
  }
  // Nomor urut yang lompat (mis. baris terpotong ganti halaman)
  const nos = r.rows.map(x => x.no);
  const missing: number[] = [];
  for (let n = 1; n <= Math.max(...nos); n++) if (!nos.includes(n)) missing.push(n);
  if (missing.length) r.warnings.push(`Nomor alat ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ', ...' : ''} tidak terbaca. Tambahkan manual di tabel.`);
  if (!r.sphNumber) r.warnings.push('Nomor SPH tidak terbaca, isi manual.');
  if (!r.hospitalName) r.warnings.push('Nama rumah sakit tidak terbaca, isi manual.');
  if (r.ringkasan.total1 === null && r.ringkasan.jumlahUnit === null) r.warnings.push('Baris "Jumlah" / "Total 1" tidak terbaca, total tidak bisa dicocokkan otomatis.');
}

export interface CekTotalHasil {
  jumlahUnitBaca: number;
  total1Baca: number;
  jumlahUnitFile: number | null;
  total1File: number | null;
  unitCocok: boolean | null;   // null = angka di file tidak ada
  total1Cocok: boolean | null;
  cocok: boolean;               // keduanya cocok (atau tidak ada pembanding sama sekali = false)
}

/** Bandingkan hasil baca dengan angka tertulis di file. Toleransi pembulatan 1 rupiah per baris. */
export function cekTotal(items: { quantity: number; totalPrice: number }[], ringkasan: Pick<SphRingkasan, 'jumlahUnit' | 'total1'>): CekTotalHasil {
  const jumlahUnitBaca = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const total1Baca = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const tol = Math.max(1, items.length);
  const unitCocok = ringkasan.jumlahUnit === null ? null : ringkasan.jumlahUnit === jumlahUnitBaca;
  const total1Cocok = ringkasan.total1 === null ? null : Math.abs(ringkasan.total1 - total1Baca) <= tol;
  const cocok = unitCocok !== false && total1Cocok !== false && (unitCocok !== null || total1Cocok !== null);
  return { jumlahUnitBaca, total1Baca, jumlahUnitFile: ringkasan.jumlahUnit, total1File: ringkasan.total1, unitCocok, total1Cocok, cocok };
}

// ============================================================================
// 6. PENCOCOKAN NAMA ALAT KE KATALOG 121 ALAT
// ============================================================================
/** Sama dengan internal.normal_nama_alat() di database: huruf kecil, simbol -> spasi. */
export function normalNamaAlat(s: string): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Sinonim & singkatan umum di SPH lama -> bentuk baku
const SINONIM: [RegExp, string][] = [
  [/\b(x\s*-?\s*ray|xray|rontgen)\b/g, 'xray'],
  [/\bct\s*-?\s*scan\b/g, 'ctscan'],
  [/\b(ecg|ekg|elektrokardiograf|electrocardiograph|eletrocardiograph|electrocardiogram|elektrocardiograph)\b/g, 'ecg'],
  [/\b(esu|electro\s*surgical\s*unit|electro\s*surgery\s*unit|electrosurgical|cauter|couter)\b/g, 'esu'],
  [/\b(cpap|continuous\s*positive\s*airway\s*pressure)\b/g, 'cpap'],
  [/\b(hfnc|high\s*flow\s*nasal\s*canu(?:l|ll)a)\b/g, 'hfnc'],
  [/\b(ctg|cardiotocograph|cardiotocography)\b/g, 'ctg'],
  [/\b(usg|ultrasonograph|ultrasonography|ultrasound|ultra\s*sonograph)\b/g, 'usg'],
  [/\b(bsm|bed\s*side\s*monitor|bedside\s*monitor|monitor\s*pasien|patient\s*monitor)\b/g, 'bsm'],
  [/\b(spo2|pulse\s*ox[iy]m[ae]tr[iy]|pulse\s*ox[iy]meter|saturasi\s*oksigen|oxymetri|oximetri)\b/g, 'spo2'],
  [/\b(incubator|inkubator)\b/g, 'inkubator'],
  [/\b(an[ae]st(h)?esi[a]?|anasthesia|anesthesia|anaesthesia|anestesi)\b/g, 'anestesi'],
  [/\b(infus[e]?|infusion)\b/g, 'infusion'],
  [/\b(photo\s*therap[iy]|phototerapi|fototerapi|phototherapy|photo\s*terapi)\b/g, 'phototherapy'],
  [/\b(blue\s*light|bluelight)\b/g, 'bluelight'],
  [/\b(mikropipet+e?|micropipet+e?|mikropipette|pipet)\b/g, 'mikropipet'],
  [/\b(mikroskop|microscope)\b/g, 'mikroskop'],
  [/\b(defibril+ator|dc\s*shock|aed)\b/g, 'defibrillator'],
  [/\b(fetal\s*doppler|fetal\s*detector|doppler)\b/g, 'doppler'],
  [/\b(tensimeter|tensi|sphygmomanometer|spygmomanometer)\b/g, 'tensimeter'],
  [/\b(thermometer|termometer)\b/g, 'termometer'],
  [/\b(ir|infra\s*red|infrared)\b/g, 'infrared'],
  [/\b(timbangan\s*(anak|bayi)|baby\s*scale)\b/g, 'timbanganbayi'],
  [/\b(sterilisator|sterilizer)\b/g, 'sterilisator'],
  [/\b(oxygen|oksigen)\b/g, 'oksigen'],
  [/\b(suction|suc+tion)\b/g, 'suction'],
  [/\b(hematolog[iy]|hematology)\b/g, 'hematologi'],
  [/\b(lampu\s*operasi|operating\s*lamp|operation\s*lamp)\b/g, 'lampuoperasi'],
  [/\b(uv|ultra\s*violet)\b/g, 'uv'],
  [/\b(lamp|lampu)\b/g, 'lampu'],
  [/\b(ventilator)\b/g, 'ventilator'],
  [/\b(vaporizer|vaporiser)\b/g, 'vaporizer'],
  [/\b(nebuli[sz]er)\b/g, 'nebulizer'],
  [/\b(radiograf[iy]|radiography|general\s*purpose)\b/g, 'radiografi']
];

const STOPWORDS = new Set(['unit', 'alat', 'dan', 'with', 'dengan', 'the', 'of', 'set', 'tipe', 'type', '2', '3', '4', '2d', '3d', '4d', 'lengan']);

export function tokenAlat(s: string): Set<string> {
  let t = normalNamaAlat(s);
  for (const [re, rep] of SINONIM) t = t.replace(re, ` ${rep} `);
  return new Set(t.split(/\s+/).filter(w => w && !STOPWORDS.has(w)));
}

export interface SaranKatalog {
  katalog: TariffItem;
  skor: number;      // 0..1
  sumber: 'kamus' | 'otomatis';
}

export interface KamusEntry {
  nama_di_sph: string;
  nomor_katalog: string;
  nama_katalog: string;
}

const catalogTokens = SPH_TARIFF_CATALOG.map(c => ({ c, tokens: tokenAlat(c.name) }));

/** Saran katalog untuk satu nama alat. Kamus (yang sudah dikonfirmasi admin) diprioritaskan. */
export function saranKatalog(namaAsli: string, kamus: KamusEntry[] = [], limit = 3): SaranKatalog[] {
  const key = normalNamaAlat(namaAsli);
  const hasil: SaranKatalog[] = [];
  const hit = kamus.find(k => k.nama_di_sph === key);
  if (hit) {
    const kat = SPH_TARIFF_CATALOG.find(c => String(c.id) === String(hit.nomor_katalog));
    if (kat) hasil.push({ katalog: kat, skor: 1, sumber: 'kamus' });
  }
  const tokens = tokenAlat(namaAsli);
  if (tokens.size === 0) return hasil;
  const scored = catalogTokens
    .map(({ c, tokens: ct }) => {
      let inter = 0;
      tokens.forEach(t => { if (ct.has(t)) inter++; });
      // Dice coefficient
      let skor = (2 * inter) / (tokens.size + ct.size);
      if (normalNamaAlat(c.name) === key) skor = 1.01; // nama persis sama
      return { katalog: c, skor, sumber: 'otomatis' as const };
    })
    .filter(s => s.skor >= 0.34 && !hasil.some(h => h.katalog.id === s.katalog.id))
    .sort((a, b) => b.skor - a.skor || a.katalog.name.length - b.katalog.name.length);
  return [...hasil, ...scored].slice(0, limit);
}

/** Skor minimal agar saran otomatis langsung dipilih (admin tetap bisa mengganti). */
export const SKOR_PILIH_OTOMATIS = 0.66;

/** Saran yang boleh langsung dipilih: dari kamus, atau skor tinggi DAN jelas lebih baik dari saran kedua. */
export function pilihOtomatis(saran: SaranKatalog[]): SaranKatalog | null {
  const [a, b] = saran;
  if (!a) return null;
  if (a.sumber === 'kamus' || a.skor > 1) return a;
  if (a.skor < SKOR_PILIH_OTOMATIS) return null;
  if (b && a.skor - b.skor < 0.1) return null;
  return a;
}

// ============================================================================
// 7. KONVERSI KE ITEM SPH WEBSITE
// ============================================================================
export function rowsToSphItems(rows: (ParsedSphRow & { namaDipakai?: string; catalogNumber?: number | null })[]): SphItem[] {
  return rows.map((r, idx) => {
    const kat = r.catalogNumber ? SPH_TARIFF_CATALOG.find(c => c.id === r.catalogNumber) : undefined;
    return {
      id: `item-${idx + 1}`,
      no: idx + 1,
      catalogNumber: kat?.id,
      description: (r.namaDipakai || r.namaAsli).trim(),
      namaAsliFile: r.namaAsli,
      quantity: r.quantity,
      unit: r.unit || 'Unit',
      standardPrice: kat?.price ?? r.unitPrice,
      unitPrice: r.unitPrice,
      totalPrice: r.totalPrice,
      tanda: r.tanda,
      notes: r.tanda ? `${r.tanda}${TANDA_KETERANGAN[r.tanda]}` : undefined,
      category: kat?.category
    };
  });
}
