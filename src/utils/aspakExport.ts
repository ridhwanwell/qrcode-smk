import XLSX from 'xlsx-js-style';
import { guessMetodeFromName, toMetodeCode, VALID_METODE_CODES } from '../data/kmkMetodeList';

/**
 * Generator file "Isian Data Hasil Kalibrasi" untuk import ke aplikasi ASPAK.
 * Struktur mengikuti template resmi (formatdata.xls):
 *  - Sheet "Data"     : baris 1 judul, baris 2 ID faskes, baris 4 header, data mulai baris 5,
 *                       penanda ::end:: tepat setelah data terakhir, ::DataMaximal:: di baris 96.
 *  - Sheet "Petunjuk" : petunjuk pengisian (disalin dari template).
 *  - Sheet "Petugas"  : daftar petugas (Nama + NIK) yang ada di file.
 * Maksimal 90 alat per file. Lebih dari 90 otomatis dipecah menjadi beberapa file.
 */

export const ASPAK_MAX_ROWS = 90;
export const ASPAK_DATA_START_ROW = 5;   // baris Excel (1-based) data pertama
export const ASPAK_DATAMAX_ROW = 96;     // baris Excel penanda ::DataMaximal::

export const ASPAK_HEADERS = [
  'No',
  'Kode Alat Kesehatan',
  'No seri',
  'Merk',
  'Tipe',
  'Lokasi',
  'Kode Ruang pelayanan',
  'Tanggal Kalibrasi (YYYY-mm-dd)',
  'Laik/Tidak',
  'NIK Petugas',
  'Nama Petugas',
  'Tangal Sertifikat (YYYY-mm-dd)', // ejaan "Tangal" sengaja mengikuti template ASPAK
  'Metode',
  'Sertifikat internal',
  'Catatan',
] as const;

/** Kolom wajib (header merah di template): Kode Alat, No seri, Tgl Kalibrasi, Laik, Tgl Sertifikat */
const REQUIRED_COL_IDX = new Set([1, 2, 7, 8, 11]);

export interface AspakRow {
  namaAlat: string;        // tidak masuk ke file ASPAK, hanya untuk tampilan & tebak metode
  kodeAlat: string;
  noSeri: string;
  merk: string;
  tipe: string;
  lokasi: string;
  kodeRuang: string;
  tglKalibrasi: string;    // YYYY-MM-DD
  laik: '1' | '0' | '';
  nikPetugas: string;
  namaPetugas: string;
  tglSertifikat: string;   // YYYY-MM-DD
  metode: string;
  sertifikatInternal: string;
  catatan: string;
  metodeOtomatis?: boolean; // true bila metode diisi otomatis dari nama alat
  sourceRow?: number;       // nomor baris di file rekap (untuk pesan error)
}

export interface AspakIssue {
  rowIndex: number;   // index di array rows
  level: 'error' | 'warning';
  field: keyof AspakRow | 'umum';
  message: string;
}

/* ------------------------------------------------------------------ */
/* Helper                                                             */
/* ------------------------------------------------------------------ */

const FORBIDDEN_CHARS = /[="'\\]/g; // dilarang template ASPAK: = " ' \

export function sanitizeAspakText(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(FORBIDDEN_CHARS, '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Ubah berbagai format tanggal (Date, serial Excel, '2026-09-08', '08/09/2026', '8-9-2026') menjadi YYYY-MM-DD */
export function normalizeDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    // Pakai komponen UTC+lokal yang aman: tambahkan 12 jam agar tidak bergeser hari karena zona waktu
    const d = new Date(v.getTime() + 12 * 3600 * 1000);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 80000) {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/); // format Indonesia DD/MM/YYYY
  if (m) return `${m[3]}-${pad2(+m[2])}-${pad2(+m[1])}`;
  return s; // biarkan apa adanya, nanti divalidasi
}

export const isValidDate = (s: string) => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

function normalizeLaik(v: unknown): AspakRow['laik'] {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s === '1' || s.startsWith('laik') || s === 'ya' || s === 'lulus' || s === 'pass') return '1';
  if (s === '0' || s.startsWith('tidak') || s === 'tl' || s === 'fail' || s === 'gagal') return '0';
  return '';
}

/** Ambil angka dari teks kode (hapus spasi / '.0' hasil Excel) */
function normalizeCode(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(Math.round(v));
  return sanitizeAspakText(v).replace(/\.0+$/, '');
}

/* ------------------------------------------------------------------ */
/* Baca file rekap (contoh: sheet "DATA ALAT" ASPAK PREMBUN)          */
/* ------------------------------------------------------------------ */

type ColKey = keyof Omit<AspakRow, 'metodeOtomatis' | 'sourceRow'>;

const HEADER_MATCHERS: { key: ColKey; test: (h: string) => boolean }[] = [
  { key: 'kodeRuang', test: h => h.includes('kode ruang') },
  { key: 'kodeAlat', test: h => h.includes('kode alat') },
  { key: 'namaAlat', test: h => h.includes('nama alat') || h === 'alat' || h.includes('nama barang') },
  { key: 'noSeri', test: h => h.includes('seri') || h === 'sn' || h.includes('serial') },
  { key: 'merk', test: h => h.includes('merk') || h.includes('merek') || h === 'brand' },
  { key: 'tipe', test: h => h === 'tipe' || h === 'type' || h.includes('model') || h.startsWith('tipe') },
  { key: 'lokasi', test: h => h.includes('lokasi') || h === 'ruang' || h === 'ruangan' },
  { key: 'tglKalibrasi', test: h => (h.includes('tanggal') || h.includes('tgl')) && h.includes('kalibrasi') },
  { key: 'laik', test: h => h.includes('laik') },
  { key: 'nikPetugas', test: h => h.includes('nik') },
  { key: 'namaPetugas', test: h => h.includes('nama petugas') || h.includes('teknisi') || h === 'petugas' },
  { key: 'tglSertifikat', test: h => (h.includes('tanggal') || h.includes('tangal') || h.includes('tgl')) && h.includes('sertifikat') },
  { key: 'sertifikatInternal', test: h => h.includes('sertifikat internal') || h.includes('no sertifikat') || h.includes('nomor sertifikat') },
  { key: 'metode', test: h => h.includes('metode') },
  { key: 'catatan', test: h => h.includes('catatan') || h.includes('keterangan') },
];

const normHeader = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export interface ParsedRekap {
  sheetName: string;
  rows: AspakRow[];
  mappedColumns: Partial<Record<ColKey, string>>;
  missingColumns: ColKey[];
}

/** Membaca file rekap Excel/CSV dan mengembalikan baris alat siap ekspor ASPAK */
export function parseRekapWorkbook(buffer: ArrayBuffer): ParsedRekap {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Pilih sheet yang memiliki header "Kode Alat"; prioritaskan sheet bernama mirip "DATA ALAT"
  const candidates = [...wb.SheetNames].sort((a, b) => {
    const score = (n: string) => (/data\s*alat/i.test(n) ? 0 : /^data$/i.test(n) ? 1 : 2);
    return score(a) - score(b);
  });

  for (const sheetName of candidates) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;
    const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    // Cari baris header (dalam 30 baris pertama)
    let headerIdx = -1;
    for (let r = 0; r < Math.min(grid.length, 30); r++) {
      const cells = grid[r].map(normHeader);
      if (cells.some(c => c.includes('kode alat')) && cells.some(c => c.includes('seri'))) {
        headerIdx = r;
        break;
      }
    }
    if (headerIdx < 0) continue;

    const headerCells = grid[headerIdx].map(normHeader);
    const colMap: Partial<Record<ColKey, number>> = {};
    const mappedColumns: Partial<Record<ColKey, string>> = {};
    headerCells.forEach((h, c) => {
      if (!h) return;
      for (const m of HEADER_MATCHERS) {
        if (colMap[m.key] === undefined && m.test(h)) {
          // "Sertifikat internal" jangan sampai tertangkap sebagai tglSertifikat & sebaliknya
          if (m.key === 'tglSertifikat' && h.includes('internal')) continue;
          colMap[m.key] = c;
          mappedColumns[m.key] = String(grid[headerIdx][c]);
          break;
        }
      }
    });

    const get = (row: unknown[], key: ColKey) => (colMap[key] === undefined ? '' : row[colMap[key]!]);
    const rows: AspakRow[] = [];

    for (let r = headerIdx + 1; r < grid.length; r++) {
      const row = grid[r];
      const first = String(row[0] ?? '').trim();
      if (first.startsWith('::')) break; // ::end:: / ::DataMaximal::
      const kode = normalizeCode(get(row, 'kodeAlat'));
      const nama = sanitizeAspakText(get(row, 'namaAlat'));
      const seri = sanitizeAspakText(get(row, 'noSeri'));
      if (!kode && !nama && !seri) continue; // baris kosong

      const metodeRaw = sanitizeAspakText(get(row, 'metode'));
      const item: AspakRow = {
        namaAlat: nama,
        kodeAlat: kode,
        noSeri: seri,
        merk: sanitizeAspakText(get(row, 'merk')),
        tipe: sanitizeAspakText(get(row, 'tipe')),
        lokasi: sanitizeAspakText(get(row, 'lokasi')),
        kodeRuang: normalizeCode(get(row, 'kodeRuang')),
        tglKalibrasi: normalizeDate(get(row, 'tglKalibrasi')),
        laik: normalizeLaik(get(row, 'laik')),
        nikPetugas: normalizeCode(get(row, 'nikPetugas')).replace(/\D/g, ''),
        namaPetugas: sanitizeAspakText(get(row, 'namaPetugas')),
        tglSertifikat: normalizeDate(get(row, 'tglSertifikat')),
        metode: metodeRaw.toUpperCase(),
        sertifikatInternal: sanitizeAspakText(get(row, 'sertifikatInternal')),
        catatan: sanitizeAspakText(get(row, 'catatan')),
        sourceRow: r + 1,
      };

      if (!item.metode && item.namaAlat) {
        const guess = guessMetodeFromName(item.namaAlat);
        if (guess) {
          item.metode = toMetodeCode(guess.no);
          item.metodeOtomatis = true;
        }
      }
      rows.push(item);
    }

    const important: ColKey[] = ['kodeAlat', 'noSeri', 'tglKalibrasi', 'laik', 'tglSertifikat', 'namaPetugas', 'nikPetugas', 'metode'];
    const missingColumns = important.filter(k => colMap[k] === undefined);
    return { sheetName, rows, mappedColumns, missingColumns };
  }

  throw new Error('Header tabel tidak ditemukan. Pastikan file rekap memiliki kolom "Kode Alat Kesehatan" dan "No seri".');
}

/* ------------------------------------------------------------------ */
/* Validasi                                                           */
/* ------------------------------------------------------------------ */

export function validateAspakRows(rows: AspakRow[]): AspakIssue[] {
  const issues: AspakIssue[] = [];
  const add = (rowIndex: number, level: AspakIssue['level'], field: AspakIssue['field'], message: string) =>
    issues.push({ rowIndex, level, field, message });

  rows.forEach((r, i) => {
    if (!r.kodeAlat || r.kodeAlat === '0') add(i, 'error', 'kodeAlat', 'Kode Alat Kesehatan wajib diisi');
    else if (!/^\d{6,8}$/.test(r.kodeAlat)) add(i, 'warning', 'kodeAlat', `Kode alat "${r.kodeAlat}" bukan angka 6–8 digit, cek di master ASPAK`);

    if (!r.noSeri) add(i, 'error', 'noSeri', 'No seri wajib diisi (isi "-" bila memang tidak ada)');

    if (!r.tglKalibrasi) add(i, 'error', 'tglKalibrasi', 'Tanggal kalibrasi wajib diisi');
    else if (!isValidDate(r.tglKalibrasi)) add(i, 'error', 'tglKalibrasi', `Tanggal kalibrasi "${r.tglKalibrasi}" bukan format YYYY-mm-dd`);

    if (r.laik === '') add(i, 'error', 'laik', 'Laik/Tidak wajib diisi (1 = Laik, 0 = Tidak Laik)');

    if (!r.tglSertifikat) add(i, 'error', 'tglSertifikat', 'Tanggal sertifikat wajib diisi');
    else if (!isValidDate(r.tglSertifikat)) add(i, 'error', 'tglSertifikat', `Tanggal sertifikat "${r.tglSertifikat}" bukan format YYYY-mm-dd`);

    if (r.kodeRuang && !/^\d+$/.test(r.kodeRuang)) add(i, 'warning', 'kodeRuang', 'Kode ruang harus angka sesuai nomenklatur ASPAK');
    if (!r.kodeRuang || r.kodeRuang === '0') add(i, 'warning', 'kodeRuang', 'Kode ruang pelayanan masih kosong/0');

    if (r.nikPetugas && r.nikPetugas.length !== 16) add(i, 'warning', 'nikPetugas', `NIK petugas ${r.nikPetugas.length} digit (seharusnya 16)`);
    if (!r.nikPetugas) add(i, 'warning', 'nikPetugas', 'NIK petugas kosong');

    if (!r.metode) add(i, 'warning', 'metode', 'Metode kosong, pilih metode KMK');
    else if (!VALID_METODE_CODES.has(r.metode)) add(i, 'warning', 'metode', `Metode "${r.metode}" tidak ada di daftar KMK MK 002–133`);
    else if (r.metodeOtomatis) add(i, 'warning', 'metode', `Metode diisi otomatis dari nama alat (${r.metode}), mohon dicek`);
  });

  return issues;
}

/* ------------------------------------------------------------------ */
/* Pembuatan workbook format ASPAK                                    */
/* ------------------------------------------------------------------ */

const border = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};
const STYLE_REQUIRED = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'FF0000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
const STYLE_OPTIONAL = { font: { bold: true, color: { rgb: '000000' } }, fill: { fgColor: { rgb: '00CCFF' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
const STYLE_ID = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'FF6600' } }, border };
const STYLE_END = { font: { color: { rgb: '000000' } }, fill: { fgColor: { rgb: '00CCFF' } } };
const STYLE_MAX = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'FF0000' } } };
const STYLE_DATA = { border };

type Cell = { v: any; t: 's' | 'n' | 'd'; z?: string; s?: any };
const sCell = (v: string, s?: any): Cell => ({ v, t: 's', s });
const nCell = (v: number, s?: any, z?: string): Cell => ({ v, t: 'n', s, z });

/** Kode numerik ditulis sebagai angka (sama seperti template). Kode berawalan 0 (mis. 0101xxx)
 *  dan kode varian berhuruf ditulis teks supaya angka 0 di depan tidak hilang. */
const codeCell = (v: string) => (/^(0|[1-9]\d{0,14})$/.test(v) ? nCell(Number(v), { ...STYLE_DATA, numFmt: '0' }, '0') : sCell(v, STYLE_DATA));

/** Tanggal ditulis sebagai tanggal Excel dengan format yyyy-mm-dd (sama seperti template) */
function dateCell(iso: string): Cell {
  if (!isValidDate(iso)) return sCell(iso, STYLE_DATA);
  const [y, m, d] = iso.split('-').map(Number);
  const serial = (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
  return nCell(serial, { ...STYLE_DATA, numFmt: 'yyyy-mm-dd' }, 'yyyy-mm-dd');
}

const PETUNJUK_ROWS: [string | number, string][] = [
  [1, 'Tanda ::end::  tidak boleh dihapus, untuk penambahan data, gunakan metode insert baris/row baru kebawah untuk mempertahankan formasi table dan penanda lainnya'],
  [2, 'Pertahankan isian ID berwarna biru paling atas untuk memperoleh tujuan import data yang benar'],
  [3, 'Jumlah data hanya 90 ditandai dengan tandan ::DataMaximal::'],
  [4, 'Data yang terisi pada kolom adalah contoh, untukmemberi gambaran pola pengisian data'],
  [5, 'Kolom dengan warna merah, wajib terisi, TIDAK BOLEH Kosong'],
  [6, 'Jangan gunakan tanda baca selain huruf, angka, dan symbol. Hindari sysmbol dengan seperti  sama dengan (=), Kutip Dua ( " ) ,Kutip Satu ( \' ), Garis miring terbalik ( \\ ) '],
];
const PETUNJUK_KOLOM: [string, string][] = [
  ['No', 'Membantu dalam mengetahui jumlah data, dengan nomor urut'],
  ['Kode Alat Kesehatan', 'Kode Alat wajib terisi, kode mewakili nama sesuai nomenklatur alat kesehatan, lihat di aplikasi monitoring'],
  ['No seri', 'No seri alat wajib terisi, hindari karakter symbol '],
  ['Merk', 'Merk alat'],
  ['Tipe', 'Tipe Alat'],
  ['Lokasi', 'Lokasi tempat alat berada, nama ruang, nama lantai, dsb'],
  ['Kode Ruang pelayanan', 'Kode yang mewakili nama ruang pelayanan sesuai nomenklatur, liha pada aplikasi monitoring'],
  ['Tanggal Kalibrasi (YYYY-mm-dd)', 'Wajib terisi, Tanggal kegiatan kalibrasi dilaksanakan, perhatikan pola input dengan urutan, Tahun-bulan-tanggal. Contoh 2020-03-14'],
  ['Laik/Tidak', 'Wajib terisi, Laik diisi dengan angka Satu ( 1 ), dan tidak Laik diisi dengan angka Nol ( 0 )'],
  ['NIK Petugas', 'Nomor Induk Kependukukan petugas kalibrasi, mengacu pada data asli Nik yang berlaku'],
  ['Tangal Sertifikat (YYYY-mm-dd)', 'Wajib terisi, Tanggal berlakuknay sertifikat, perhatikan pola input dengan urutan, Tahun-bulan-tanggal. Contoh 2020-03-14'],
  ['Metode', 'Metode kalibrasi'],
  ['Sertifikat internal', 'No setifikat internal Institusi. Nomor yang muncul pada sertifikat, nomor ini untuk mengakomodir penomoran masing-masing institusi'],
  ['Catatan', 'Catatan tambahan jika ada'],
];

function setCell(ws: any, addr: string, cell: Cell) {
  ws[addr] = cell;
}

function buildDataSheet(rows: AspakRow[], aspakId: string, namaRs: string) {
  const ws: any = {};
  const enc = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

  // Baris 1: judul (sama seperti template: D1 & E1)
  setCell(ws, 'D1', sCell(`Isian Data Hasil Kalibrasi ${namaRs} Oleh PT. Sarana Multi Kalibrasi`, { font: { bold: true } }));
  setCell(ws, 'E1', sCell('Isian Data Hasil Kalibrasi '));

  // Baris 2: ID faskes ASPAK (teks, warna oranye)
  setCell(ws, 'A2', sCell('ID', STYLE_ID));
  setCell(ws, 'B2', /^\d+$/.test(aspakId) ? nCell(Number(aspakId), STYLE_ID) : sCell(aspakId, STYLE_ID));

  // Baris 4: header
  ASPAK_HEADERS.forEach((h, c) => setCell(ws, enc(3, c), sCell(h, REQUIRED_COL_IDX.has(c) ? STYLE_REQUIRED : STYLE_OPTIONAL)));

  // Baris 5..: data
  rows.forEach((r, i) => {
    const R = ASPAK_DATA_START_ROW - 1 + i;
    const cells: Cell[] = [
      nCell(i + 1, STYLE_DATA),
      codeCell(r.kodeAlat),
      sCell(r.noSeri || '-', STYLE_DATA),
      sCell(r.merk || '-', STYLE_DATA),
      sCell(r.tipe || '-', STYLE_DATA),
      sCell(r.lokasi || '-', STYLE_DATA),
      codeCell(r.kodeRuang || '0'),
      dateCell(r.tglKalibrasi),
      r.laik ? nCell(Number(r.laik), STYLE_DATA) : sCell('', STYLE_DATA), // kosong tetap kosong (jangan dianggap laik)
      sCell(r.nikPetugas, STYLE_DATA),       // NIK 16 digit ditulis teks agar tidak terpotong
      sCell(r.namaPetugas, STYLE_DATA),
      dateCell(r.tglSertifikat),
      sCell(r.metode, STYLE_DATA),
      sCell(r.sertifikatInternal, STYLE_DATA),
      sCell(r.catatan || '', STYLE_DATA),
    ];
    cells.forEach((cell, c) => setCell(ws, enc(R, c), cell));
  });

  // Penanda ::end:: tepat setelah data, ::DataMaximal:: di baris 96
  const endRow = ASPAK_DATA_START_ROW - 1 + rows.length;
  setCell(ws, enc(endRow, 0), sCell('::end::', STYLE_END));
  setCell(ws, `A${ASPAK_DATAMAX_ROW}`, sCell('::DataMaximal::', STYLE_MAX));

  ws['!ref'] = `A1:O${ASPAK_DATAMAX_ROW}`;
  ws['!cols'] = [9, 14.4, 14.1, 9.1, 9, 12, 12.4, 17.1, 10.7, 19.3, 15.5, 13.4, 17.4, 25.8, 9.1].map(w => ({ wch: w + 2 }));
  ws['!rows'] = [];
  ws['!rows'][3] = { hpt: 45 };
  return ws;
}

function buildPetunjukSheet() {
  const ws: any = {};
  setCell(ws, 'A1', sCell('Petunjuk Umum', { font: { bold: true } }));
  PETUNJUK_ROWS.forEach(([no, text], i) => {
    setCell(ws, `A${2 + i}`, nCell(no as number));
    setCell(ws, `C${2 + i}`, sCell(text));
  });
  setCell(ws, 'A10', sCell('Petunjuk Kolom', { font: { bold: true } }));
  PETUNJUK_KOLOM.forEach(([col, text], i) => {
    setCell(ws, `A${11 + i}`, sCell(col));
    setCell(ws, `C${11 + i}`, sCell(text));
  });
  ws['!ref'] = 'A1:C24';
  ws['!cols'] = [{ wch: 30 }, { wch: 2 }, { wch: 120 }];
  return ws;
}

function buildPetugasSheet(rows: AspakRow[]) {
  const ws: any = {};
  setCell(ws, 'A1', sCell('Daftar Petugas Kalibrasi', { font: { bold: true } }));
  setCell(ws, 'A3', sCell('No', STYLE_OPTIONAL));
  setCell(ws, 'B3', sCell('Nama Petugas', STYLE_OPTIONAL));
  setCell(ws, 'C3', sCell('NIK', STYLE_OPTIONAL));
  const seen = new Map<string, string>();
  rows.forEach(r => {
    if (r.namaPetugas && !seen.has(r.nikPetugas || r.namaPetugas)) seen.set(r.nikPetugas || r.namaPetugas, r.namaPetugas);
  });
  let i = 0;
  seen.forEach((nama, key) => {
    i++;
    setCell(ws, `A${3 + i}`, nCell(i, STYLE_DATA));
    setCell(ws, `B${3 + i}`, sCell(` ${nama}`, STYLE_DATA)); // template diawali spasi
    setCell(ws, `C${3 + i}`, sCell(/^\d+$/.test(key) ? ` ${key}` : '', STYLE_DATA));
  });
  ws['!ref'] = `A1:C${Math.max(3 + i, 4)}`;
  ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 22 }];
  return ws;
}

export function buildAspakWorkbook(rows: AspakRow[], aspakId: string, namaRs: string) {
  if (rows.length > ASPAK_MAX_ROWS) throw new Error(`Maksimal ${ASPAK_MAX_ROWS} alat per file`);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildDataSheet(rows, aspakId, namaRs), 'Data');
  XLSX.utils.book_append_sheet(wb, buildPetunjukSheet(), 'Petunjuk');
  XLSX.utils.book_append_sheet(wb, buildPetugasSheet(rows), 'Petugas');
  return wb;
}

export type AspakFileFormat = 'xls' | 'xlsx';

/** Hasilkan file biner. 'xls' = Excel 97-2003 (format sama dengan template, tanpa warna); 'xlsx' = dengan warna header */
export function writeAspakFile(rows: AspakRow[], aspakId: string, namaRs: string, format: AspakFileFormat): Blob {
  const wb = buildAspakWorkbook(rows, aspakId, namaRs);
  const bookType = format === 'xls' ? 'biff8' : 'xlsx';
  const out = XLSX.write(wb, { bookType, type: 'array', cellStyles: true });
  const mime = format === 'xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return new Blob([out], { type: mime });
}

/** Pecah baris per 90 alat */
export function chunkAspakRows(rows: AspakRow[], size = ASPAK_MAX_ROWS): AspakRow[][] {
  const chunks: AspakRow[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

export const safeFileName = (s: string) => s.replace(/[^a-zA-Z0-9 _.-]+/g, '').replace(/\s+/g, '_').slice(0, 60) || 'RS';
