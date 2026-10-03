/**
 * EXPORT EXCEL PAKET SPH E-CATALOGUE (1 file .xlsx, 5 sheet)
 * ------------------------------------------------------------
 * Mengikuti format spreadsheet resmi PT. SMK ("137 SPH-PT Tawada Healthcare"):
 *   1. SPH        -> Surat Penawaran Harga (hal. 1 surat + hal. 2 tabel Quotation)
 *   2. Link Ecat  -> Daftar link produk E-Katalog (Inaproc) per alat
 *   3. BO         -> Bukti Order / Pesanan
 *   4. FP         -> Faktur Penjualan / Invoice
 *   5. KW         -> Kwitansi Pembayaran
 *
 * Catatan:
 * - Hanya untuk SPH bertipe E-Catalogue (lihat isECatalogueSph).
 * - Baris kosong di atas (baris 1-8) sengaja dikosongkan untuk kertas berkop,
 *   sama seperti template aslinya.
 * - Angka total memakai perhitungan yang sama dengan PDF di website
 *   (BO/FP/KW otomatis mengikuti realisasi Form BAP bila sudah diisi).
 */
import XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { SphQuotation, SphDealData, BapDocument } from '../types';
import { formatIndonesianLongDate, angkaTerbilang } from './sphHelpers';
import { calculateBillingFromBap, resolveBankDetails } from './billingHelpers';
import { resolveDealData } from './dealPdfExport';
import { extractCleanToolName, getECatalogueTariff } from '../data/sphECatalogueData';

// ============================================================================
// KONSTANTA PERUSAHAAN (sama dengan yang dipakai di PDF BO/FP)
// ============================================================================
const COMPANY_NAME = 'PT. SARANA MULTI KALIBRASI';
const COMPANY_NPWP = '039.20 1.850.3-526.000';

const FOOTNOTES = [
  '*Hanya dilakukan Uji Keselamatan Listrik dan/atau Uji Fungsi dan Kondisi Alat',
  '**Alat dilakukan penarikan ke PT Sarana Multi Kalibrasi',
  '***Alat dilakukan penarikan untuk subkontraktor pekerjaan',
  '****Tidak termasuk jenis alat wajib kalibrasi'
];

const DEFAULT_TERMS = [
  'Harga sudah termasuk PPN 11%.',
  'Harga sudah termasuk biaya transportasi dan akomodasi.',
  'Harga tidak termasuk service dan maintenance.',
  'Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.',
  'Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.',
  'Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.',
  'Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.',
  'Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.',
  'Pembayaran : Bank Mandiri Cab. Surakarta\nNo. Rek : 138-00-2610846-9 (SARANA MULTI KALIBRASI PT)'
];

const OPENING_PARAGRAPH =
  'Menindaklanjuti mengenai permintaan Kalibrasi alat Kesehatan, PT. Sarana Multi Kalibrasi telah memiliki izin dari ' +
  'Kementrian Kesehatan dengan No. 26062301565850001, Sertifikat Akreditasi KAN LK-532-IDN serta menerapkan Standar ' +
  'SNI ISO/ IEC 17025: 2017, melampirkan harga penawaran, adapun ketentuan yang berlaku sebagai berikut:';

// ============================================================================
// STYLE (warna & format angka disalin dari template Google Sheets)
// ============================================================================
const CYAN = '00B0F0';
const BLUE = '0070C0';
const YELLOW = 'FFFF00';
const WHITE = 'FFFFFF';
const BLACK = '000000';

const RP_FORMAT = '_-"Rp"* #,##0_-;\\-"Rp"* #,##0_-;_-"Rp"* "-"_-;_-@_-';
const COLON_FORMAT = '@* ":"'; // label otomatis diberi titik dua rata kanan, sama seperti template

interface FontOpt {
  sz?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

interface CellStyle {
  font?: FontOpt;
  fill?: string;
  h?: 'left' | 'center' | 'right';
  v?: 'top' | 'center' | 'bottom';
  wrap?: boolean;
  border?: boolean | { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };
  numFmt?: string;
}

const thin = { style: 'thin', color: { rgb: BLACK } };

function toXlsxStyle(st: CellStyle = {}): any {
  const f = st.font || {};
  const s: any = {
    font: {
      name: 'Calibri',
      sz: f.sz ?? 12,
      bold: !!f.bold,
      italic: !!f.italic,
      underline: !!f.underline,
      color: { rgb: f.color || BLACK }
    },
    alignment: {
      horizontal: st.h,
      vertical: st.v || 'center',
      wrapText: !!st.wrap
    }
  };
  if (st.fill) s.fill = { patternType: 'solid', fgColor: { rgb: st.fill } };
  if (st.border) {
    const b = st.border === true ? { top: true, bottom: true, left: true, right: true } : st.border;
    s.border = {};
    if (b.top) s.border.top = thin;
    if (b.bottom) s.border.bottom = thin;
    if (b.left) s.border.left = thin;
    if (b.right) s.border.right = thin;
  }
  if (st.numFmt) s.numFmt = st.numFmt;
  return s;
}

// ============================================================================
// HELPER ALAMAT SEL (tanpa bergantung pada XLSX.utils agar mudah dites)
// ============================================================================
function colToIndex(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function indexToCol(idx: number): string {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseAddr(addr: string): { c: number; r: number } {
  const m = addr.match(/^([A-Z]+)(\d+)$/i);
  if (!m) throw new Error(`Alamat sel tidak valid: ${addr}`);
  return { c: colToIndex(m[1]), r: parseInt(m[2], 10) - 1 };
}

/** Perkiraan jumlah baris teks agar tinggi baris pas saat teks dibungkus (wrap). */
function estimateLines(text: string, charsPerLine: number): number {
  return String(text || '')
    .split('\n')
    .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

/**
 * Pembangun 1 sheet sederhana. Hasilnya objek worksheet standar SheetJS
 * (bisa langsung dimasukkan ke XLSX.utils.book_append_sheet).
 */
class SheetBuilder {
  ws: Record<string, any> = {};
  private merges: { s: { c: number; r: number }; e: { c: number; r: number } }[] = [];
  private rowHeights: Record<number, number> = {};
  private maxR = 0;
  private maxC = 0;

  constructor(private colWidths: Record<string, number>) {
    Object.keys(colWidths).forEach(col => {
      this.maxC = Math.max(this.maxC, colToIndex(col));
    });
  }

  /** Isi satu sel (row 1-based seperti di Excel). */
  set(addr: string, value: string | number | null, style: CellStyle = {}, link?: string): this {
    const { c, r } = parseAddr(addr);
    this.maxR = Math.max(this.maxR, r);
    this.maxC = Math.max(this.maxC, c);
    const cell: any = { s: toXlsxStyle(style) };
    if (value === null || value === undefined || value === '') {
      cell.t = 's';
      cell.v = '';
    } else if (typeof value === 'number') {
      cell.t = 'n';
      cell.v = value;
      if (style.numFmt) cell.z = style.numFmt;
    } else {
      cell.t = 's';
      cell.v = value;
      if (style.numFmt) cell.z = style.numFmt;
    }
    if (link) cell.l = { Target: link, Tooltip: link };
    this.ws[`${indexToCol(c)}${r + 1}`] = cell;
    return this;
  }

  /** Gabungkan sel (mis. "B20:H20"), isi nilainya, dan beri style ke seluruh sel agar border tampil utuh. */
  merge(range: string, value: string | number | null, style: CellStyle = {}, link?: string): this {
    const [a, b] = range.split(':');
    const s = parseAddr(a);
    const e = parseAddr(b);
    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        const addr = `${indexToCol(c)}${r + 1}`;
        if (r === s.r && c === s.c) this.set(addr, value, style, link);
        else this.set(addr, null, style);
      }
    }
    if (s.r !== e.r || s.c !== e.c) this.merges.push({ s, e });
    return this;
  }

  height(row: number, h: number): this {
    this.rowHeights[row] = h;
    return this;
  }

  build(): any {
    const lastRow = Math.max(this.maxR + 1, ...Object.keys(this.rowHeights).map(Number));
    this.ws['!ref'] = `A1:${indexToCol(this.maxC)}${lastRow}`;
    this.ws['!merges'] = this.merges;
    const cols: any[] = [];
    for (let c = 0; c <= this.maxC; c++) {
      const w = this.colWidths[indexToCol(c)];
      cols.push(w ? { wch: w } : { wch: 8.43 });
    }
    this.ws['!cols'] = cols;
    const rows: any[] = [];
    for (let r = 0; r < lastRow; r++) {
      const h = this.rowHeights[r + 1];
      rows.push(h ? { hpt: h } : {});
    }
    this.ws['!rows'] = rows;
    return this.ws;
  }
}

// ============================================================================
// HELPER DATA
// ============================================================================
/** SPH dianggap E-Catalogue bila tipe-nya 'ecatalogue' (atau SPH lama yang berisi link e-katalog). */
export function isECatalogueSph(sph?: SphQuotation | null): boolean {
  if (!sph) return false;
  if (sph.sphType === 'ecatalogue') return true;
  if (sph.sphType === 'non_ecatalogue') return false;
  return (sph.items || []).some(it => !!it.eCatalogueUrl);
}

function resolveECatalogueLink(description: string, explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  const clean = extractCleanToolName(description || '');
  return (
    getECatalogueTariff(description)?.link ||
    getECatalogueTariff(clean)?.link ||
    'https://katalog.inaproc.id/sarana-multi-kalibrasi'
  );
}

function shortDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return `Tgl. ${dateStr || ''}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `Tgl. ${dd}/${mm}/${d.getFullYear()}`;
}

function quoteTerbilang(text: string): string {
  const t = (text || '').trim().replace(/^"+|"+$/g, '');
  return `"${t}"`;
}

function itemDescription(description: string, notes?: string): string {
  const desc = (description || '').trim();
  const n = (notes || '').trim();
  // Tanda bintang (*, **, ***, ****) ditempel ke nama alat seperti di template
  if (/^\*{1,4}$/.test(n) && !desc.endsWith(n)) return `${desc} ${n}`;
  return desc;
}

function safeFilePart(text: string): string {
  return (text || 'Dokumen').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Dokumen';
}

// ============================================================================
// SHEET 1: SPH
// ============================================================================
function buildSphSheet(sph: SphQuotation): any {
  // Lebar kolom A-J sama dengan template (K sangat sempit)
  const sb = new SheetBuilder({ A: 6.1, B: 6.9, C: 8.43, D: 24.9, E: 6.9, F: 8.4, G: 8.3, H: 10.1, I: 7.7, J: 14.9, K: 0.7 });

  // Baris 1-8: ruang kosong untuk kop surat (kertas berkop)
  for (let r = 1; r <= 9; r++) sb.height(r, r >= 4 && r <= 6 ? 15 : 12.75);

  const labelStyle: CellStyle = { font: { bold: true }, h: 'left', numFmt: COLON_FORMAT };
  const valueStyle: CellStyle = { h: 'left' };
  sb.merge('A10:C10', 'Nomor', labelStyle).set('D10', sph.sphNumber || '-', valueStyle).height(10, 15);
  sb.merge('A11:C11', 'Perihal', labelStyle).set('D11', sph.subject || 'Surat Penawaran Harga Kalibrasi', valueStyle).height(11, 15);
  sb.merge('A12:C12', 'Lampiran', labelStyle).set('D12', sph.attachmentPages || '2 Lembar', valueStyle).height(12, 15);

  sb.set('A14', 'Kepada Yth:', { font: { bold: true }, h: 'left' });
  sb.merge('H14:J14', sph.formattedDate || formatIndonesianLongDate(sph.date, sph.city || 'Surakarta'), { h: 'right' });
  sb.set('A15', sph.recipientRole || sph.tembusan || 'Direktur', { h: 'left' });
  sb.set('A16', sph.hospitalName || '-', { h: 'left' });
  sb.merge('A17:J18', sph.hospitalAddress || '-', { h: 'left', v: 'top', wrap: true });
  sb.height(17, 15).height(18, 15.75);

  sb.set('A19', 'Dengan Hormat,', {});
  sb.merge('A20:J20', OPENING_PARAGRAPH, { h: 'left', v: 'top', wrap: true }).height(20, 66.75);

  // Ketentuan / syarat (poin 1-9). Teks multi-baris (mis. info rekening) dipecah per baris seperti template.
  const terms = sph.termsAndConditions && sph.termsAndConditions.length > 0 ? sph.termsAndConditions : DEFAULT_TERMS;
  let row = 21;
  terms.forEach((term, idx) => {
    const lines = String(term || '').split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach((line, li) => {
      if (li === 0) sb.set(`A${row}`, `${idx + 1}.`, { h: 'center' });
      sb.merge(`B${row}:J${row}`, line, { h: 'left', wrap: true });
      sb.height(row, Math.max(14.25, estimateLines(line, 82) * 15));
      row++;
    });
  });

  const closing1 = 'Bersama ini kami bermaksud mengajukan permohonan persetujuan Surat Penawaran Harga.';
  sb.merge(`A${row}:J${row}`, closing1, { h: 'left', wrap: true }).height(row, 30);
  row++;

  const marketing = sph.marketingStaffName
    ? `${sph.marketingStaffPhone || '-'} (${sph.marketingStaffName})`
    : '0852-0006-0589 (Erwin)';
  const closing2 =
    `Untuk informasi lebih lanjut dapat menghubungi marketing kami di : ${marketing}. ` +
    'Demikian, atas perhatian dan kerjasamanya kami ucapkan terimakasih.';
  sb.merge(`A${row}:J${row}`, closing2, { h: 'left', wrap: true }).height(row, 46.5);
  row++;

  // Blok tanda tangan
  sb.merge(`A${row}:D${row}`, COMPANY_NAME, { font: { bold: true }, h: 'center' });
  sb.merge(`G${row}:J${row}`, 'Disetujui oleh Pelanggan,', { h: 'center' });
  sb.height(row, 30.75);
  row++;
  sb.merge(`A${row}:D${row + 2}`, null, {}); // ruang tanda tangan & stempel
  sb.height(row, 30.75);
  row += 3;
  sb.merge(`A${row}:D${row}`, sph.directorName || 'Ahmad Fajar Ariyanto', { font: { bold: true, underline: true }, h: 'center' });
  sb.merge(`G${row}:J${row}`, '( ………………………………)', { h: 'center' });
  row++;
  sb.merge(`A${row}:D${row}`, sph.directorTitle || 'Direktur', { h: 'center' });
  row++;

  // ---------------- HALAMAN 2: TABEL QUOTATION ----------------
  row += 7; // ruang kosong untuk kop surat halaman 2 (sama seperti template)
  sb.merge(`A${row}:J${row}`, 'Surat Penawaran Harga\nQuotation', {
    font: { bold: true, underline: true },
    h: 'center',
    wrap: true
  });
  sb.height(row, 32);
  row += 2;

  const head: CellStyle = { font: { bold: true, color: WHITE }, fill: CYAN, h: 'center', border: true, wrap: true };
  sb.set(`A${row}`, 'No.', head);
  sb.merge(`B${row}:D${row}`, 'Diskripsi', head);
  sb.set(`E${row}`, 'Qty', head);
  sb.set(`F${row}`, 'Satuan', head);
  sb.merge(`G${row}:H${row}`, 'Satuan Harga', head);
  sb.merge(`I${row}:J${row}`, 'Total Harga', head);
  sb.height(row, 17.25);
  row++;

  const cellC: CellStyle = { h: 'center', border: true };
  const money: CellStyle = { border: true, numFmt: RP_FORMAT };
  const items = sph.items || [];
  let totalQty = 0;
  items.forEach((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const total = it.totalPrice !== undefined && it.totalPrice !== null ? Number(it.totalPrice) : qty * price;
    totalQty += qty;
    const desc = itemDescription(it.description, it.notes);
    sb.set(`A${row}`, idx + 1, cellC);
    sb.merge(`B${row}:D${row}`, desc, { h: 'left', border: true, wrap: true });
    sb.set(`E${row}`, qty, cellC);
    sb.set(`F${row}`, it.unit || 'Unit', cellC);
    sb.merge(`G${row}:H${row}`, price, money);
    sb.merge(`I${row}:J${row}`, total, money);
    sb.height(row, Math.max(17.25, estimateLines(desc, 36) * 15.5));
    row++;
  });

  // Ringkasan (urutan sama dengan perhitungan PDF website: Total 1 → Akomodasi → Total 2 → PPN → Grand Total)
  const ppnLabel = `PPN ${sph.ppnPercent || 11}%`;
  const subtotal1 = Number(sph.subtotal1) || 0;
  const accommodation = Number(sph.accommodationFee) || 0;
  const subtotal2 = Number(sph.subtotal2) || subtotal1 + accommodation;
  const ppn = Number(sph.ppnAmount) || 0;
  const grand = Number(sph.grandTotal) || subtotal2 + ppn;
  const lbl: CellStyle = { h: 'right', border: true };
  const lblBold: CellStyle = { font: { bold: true }, h: 'right', border: true };
  const s = row;

  sb.merge(`A${s}:D${s}`, 'Jumlah', { font: { bold: true }, h: 'center', border: true });
  sb.set(`E${s}`, totalQty, { font: { bold: true }, h: 'center', border: true });
  sb.set(`F${s}`, items[0]?.unit || 'Unit', { font: { bold: true }, h: 'center', border: true });
  sb.merge(`G${s}:H${s}`, 'Total 1', lblBold);
  sb.merge(`I${s}:J${s}`, subtotal1, { ...money, font: { bold: true } });

  sb.merge(`A${s + 1}:F${s + 1}`, 'Terbilang:', { font: { bold: true, italic: true, color: WHITE }, fill: CYAN, h: 'left', border: true });
  sb.merge(`G${s + 1}:H${s + 1}`, 'Akomodasi', lbl);
  sb.merge(`I${s + 1}:J${s + 1}`, accommodation, money);

  sb.merge(`A${s + 2}:F${s + 4}`, quoteTerbilang(sph.terbilang || angkaTerbilang(grand)), {
    font: { bold: true, italic: true },
    h: 'center',
    wrap: true,
    border: true
  });
  sb.merge(`G${s + 2}:H${s + 2}`, 'Total 2', lblBold);
  sb.merge(`I${s + 2}:J${s + 2}`, subtotal2, { ...money, font: { bold: true } });
  sb.merge(`G${s + 3}:H${s + 3}`, ppnLabel, lbl);
  sb.merge(`I${s + 3}:J${s + 3}`, ppn, money);
  sb.merge(`G${s + 4}:H${s + 4}`, 'GRAND TOTAL', { font: { bold: true, color: WHITE }, fill: CYAN, h: 'right', border: true });
  sb.merge(`I${s + 4}:J${s + 4}`, grand, { font: { bold: true, color: WHITE }, fill: CYAN, border: true, numFmt: RP_FORMAT });
  for (let r = s; r <= s + 4; r++) sb.height(r, 15.75);
  row = s + 6;

  if (sph.notes && sph.notes.trim() && sph.notes.trim() !== '-') {
    sb.merge(`A${row}:J${row}`, `Catatan: ${sph.notes.trim()}`, { font: { sz: 10, italic: true }, h: 'left', wrap: true });
    row += 2;
  }

  FOOTNOTES.forEach(fn => {
    sb.merge(`A${row}:J${row}`, fn, { font: { sz: 9, italic: true }, h: 'left' });
    row++;
  });

  const ws = sb.build();
  ws['!margins'] = { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0, footer: 0 };
  return ws;
}

// ============================================================================
// SHEET 2: LINK ECAT
// ============================================================================
function buildLinkEcatSheet(sph: SphQuotation): any {
  const sb = new SheetBuilder({ A: 4.6, B: 67.1, C: 8.7, D: 65.3 });

  sb.merge('A1:D1', 'LINK E-KATALOG', { font: { sz: 22, bold: true }, fill: YELLOW, h: 'center' }).height(1, 32);
  sb.merge('A2:B2', 'Nomor SPH:', { font: { sz: 14, bold: true }, h: 'left' });
  sb.set('A3', sph.sphNumber || '-', { font: { sz: 11 }, h: 'left' });

  const head: CellStyle = { font: { sz: 11, bold: true, color: WHITE }, fill: BLUE, h: 'center', border: true, wrap: true };
  sb.set('A5', 'No', head);
  sb.set('B5', 'Diskripsi', head);
  sb.set('C5', 'Qty', head);
  sb.set('D5', 'Link E-Katalog', head);
  sb.height(5, 26.25);

  let row = 6;
  let totalQty = 0;
  (sph.items || []).forEach((it, idx) => {
    const qty = Number(it.quantity) || 0;
    totalQty += qty;
    const desc = itemDescription(it.description, it.notes);
    const link = resolveECatalogueLink(it.description, it.eCatalogueUrl);
    sb.set(`A${row}`, idx + 1, { font: { sz: 11 }, h: 'center', border: true });
    sb.set(`B${row}`, desc, { font: { sz: 11 }, h: 'left', border: true, wrap: true });
    sb.set(`C${row}`, qty, { font: { sz: 11 }, h: 'center', border: true });
    sb.set(`D${row}`, link, { font: { sz: 11, underline: true, color: '1155CC' }, h: 'left', border: true, wrap: true }, link);
    sb.height(row, Math.max(15, Math.max(estimateLines(desc, 70), estimateLines(link, 70)) * 15));
    row++;
  });

  sb.set(`B${row}`, 'Jumlah', { font: { sz: 11, bold: true }, h: 'right' });
  sb.set(`C${row}`, totalQty, { font: { sz: 11, bold: true }, h: 'center' });
  row += 2;

  FOOTNOTES.forEach(fn => {
    sb.merge(`A${row}:D${row}`, fn, { font: { sz: 9, italic: true }, h: 'left' });
    row++;
  });

  const ws = sb.build();
  ws['!margins'] = { left: 0.2, right: 0.12, top: 0.39, bottom: 0.75, header: 0, footer: 0 };
  return ws;
}

// ============================================================================
// SHEET 3 & 4: BO dan FP (struktur tabel sama)
// ============================================================================
const DEAL_COLS = { A: 3.9, B: 6.9, C: 8.43, D: 7.1, E: 6.9, F: 8.43, G: 8.43, H: 8.43, I: 7.1, J: 16.4, K: 17 };

interface DealContext {
  sph: SphQuotation;
  deal: SphDealData;
  billing: ReturnType<typeof calculateBillingFromBap>;
  bank: ReturnType<typeof resolveBankDetails>;
  dealDateLong: string;
  dealDateShort: string;
}

/** Header nomor dokumen + judul + penerima + tabel item + ringkasan. Mengembalikan baris berikutnya. */
function buildDealHeaderAndTable(
  sb: SheetBuilder,
  ctx: DealContext,
  opts: { numberLabel: string; numberValue: string; perihal: string; title: string; closingText: string }
): number {
  const { sph, deal, billing } = ctx;
  const sz10: FontOpt = { sz: 10 };

  // Baris 1-8: ruang kop surat
  for (let r = 1; r <= 8; r++) sb.height(r, 12.75);

  const label: CellStyle = { font: { sz: 10, bold: true }, h: 'left' };
  sb.merge('A9:B9', opts.numberLabel, label).set('C9', ':', { font: sz10 }).set('D9', opts.numberValue, { font: sz10, h: 'left' });
  sb.set('K9', ctx.dealDateLong, { font: sz10, h: 'right' });
  sb.merge('A10:B10', 'Nomor (PO)', label).set('C10', ':', { font: sz10 }).set('D10', sph.sphNumber || '-', { font: sz10, h: 'left' });
  sb.merge('A11:B11', 'Perihal', label).set('C11', ':', { font: sz10 }).set('D11', opts.perihal, { font: sz10, h: 'left' });
  sb.height(9, 15).height(10, 15);

  sb.merge('A12:K12', opts.title, { font: { sz: 20, bold: true, underline: true }, h: 'center', wrap: true }).height(12, 52);

  sb.set('A13', 'Kepada Yth:', { font: { sz: 12, bold: true }, h: 'left' }).height(13, 21);
  sb.merge('A14:H14', sph.hospitalName || '-', { font: sz10, h: 'left', wrap: true }).height(14, 26.25);
  sb.merge('A15:H16', sph.hospitalAddress || '-', { font: { sz: 9 }, h: 'left', v: 'top', wrap: true });
  sb.set('A17', 'Up:', { font: { sz: 9 } });
  sb.set('B17', deal.customerPic || sph.hospitalPic || sph.recipientRole || 'Direktur', { font: { sz: 9 }, h: 'left' });
  sb.set('A18', 'Persetujuan pelanggan barang/jasa dengan harga dan rincian sebagai berikut:', { font: sz10 }).height(18, 18);

  const head: CellStyle = { font: { sz: 11, bold: true, color: WHITE }, fill: CYAN, h: 'center', border: true, wrap: true };
  sb.set('A19', 'No.', head);
  sb.merge('B19:H19', 'Diskripsi', head);
  sb.set('I19', 'Qty\n(unit)', head);
  sb.set('J19', 'Satuan Harga', head);
  sb.set('K19', 'Total Harga', head);
  sb.height(19, 30.75);

  const f11: FontOpt = { sz: 11 };
  const money: CellStyle = { font: f11, border: true, numFmt: RP_FORMAT };
  let row = 20;
  let totalQty = 0;
  billing.items.forEach((it, idx) => {
    totalQty += Number(it.quantity) || 0;
    const desc = itemDescription(it.description, it.notes);
    sb.set(`A${row}`, idx + 1, { font: f11, h: 'center', border: true });
    sb.merge(`B${row}:H${row}`, desc, { font: f11, h: 'left', border: true, wrap: true });
    sb.set(`I${row}`, Number(it.quantity) || 0, { font: f11, h: 'center', border: true });
    sb.set(`J${row}`, Number(it.unitPrice) || 0, money);
    sb.set(`K${row}`, Number(it.totalPrice) || 0, money);
    sb.height(row, Math.max(15, estimateLines(desc, 55) * 14.5));
    row++;
  });

  // Ringkasan + terbilang
  const s = row;
  const ppnLabel = `PPN ${billing.ppnPercent || 11}%`;
  const lbl: CellStyle = { font: f11, h: 'right', border: true };
  sb.merge(`A${s}:H${s}`, 'Terbilang:', { font: { sz: 10, bold: true, italic: true, color: WHITE }, fill: CYAN, h: 'left', border: true });
  sb.set(`I${s}`, totalQty, { font: f11, h: 'center', border: true });
  sb.set(`J${s}`, 'Total 1', lbl);
  sb.set(`K${s}`, billing.subtotal1, money);

  sb.merge(`A${s + 1}:I${s + 3}`, quoteTerbilang(billing.terbilang), {
    font: { sz: 11, bold: true, italic: true },
    h: 'center',
    wrap: true,
    border: true
  });
  sb.set(`J${s + 1}`, 'Akomodasi', lbl);
  sb.set(`K${s + 1}`, billing.accommodationFee, money);
  sb.set(`J${s + 2}`, 'Total 2', lbl);
  sb.set(`K${s + 2}`, billing.subtotal2, money);
  sb.set(`J${s + 3}`, ppnLabel, lbl);
  sb.set(`K${s + 3}`, billing.ppnAmount, money);

  sb.merge(`A${s + 4}:I${s + 4}`, opts.closingText, { font: sz10, h: 'left', v: 'top', wrap: true, border: true });
  sb.set(`J${s + 4}`, 'GRAND TOTAL', { font: { sz: 11, bold: true, color: WHITE }, fill: CYAN, h: 'right', border: true });
  sb.set(`K${s + 4}`, billing.grandTotal, { font: { sz: 11, bold: true, color: WHITE }, fill: CYAN, border: true, numFmt: RP_FORMAT });
  for (let r = s; r <= s + 3; r++) sb.height(r, 16.5);
  sb.height(s + 4, 27);

  return s + 5;
}

function buildBoSheet(ctx: DealContext): any {
  const sb = new SheetBuilder(DEAL_COLS);
  const { sph, deal, bank } = ctx;
  let row = buildDealHeaderAndTable(sb, ctx, {
    numberLabel: 'Nomor (BO)',
    numberValue: deal.boNumber,
    perihal: 'Bukti Order',
    title: 'BUKTI ORDER / PESANAN\nEvidence Order',
    closingText: 'Demikian surat bukti order ini terimakasih kami dipilih menjadi rekanan.'
  });

  const sz10b: CellStyle = { font: { sz: 10, bold: true }, h: 'left', v: 'top', numFmt: COLON_FORMAT };
  const val9: CellStyle = { font: { sz: 9 }, h: 'left', v: 'top' };

  sb.set(`A${row}`, 'Transfer Pembayaran:', { font: { sz: 11, bold: true }, h: 'left' });
  sb.set(`J${row}`, 'Pemesan:', { font: { sz: 10, bold: true, underline: true }, h: 'left' });
  sb.set(`K${row}`, 'Penerima:', { font: { sz: 10, bold: true, underline: true }, h: 'left' });
  row++;
  const startInfo = row;
  sb.merge(`A${row}:C${row}`, 'Nama Bank', sz10b).merge(`D${row}:H${row}`, bank.bankName, val9);
  sb.set(`J${row}`, 'Pelanggan', { font: { sz: 7, italic: true }, h: 'left', v: 'top' });
  row++;
  sb.merge(`A${row}:C${row}`, 'Nomor Rekening', sz10b).merge(`D${row}:H${row}`, `${bank.accountNumber} (${bank.accountName})`, val9);
  row++;
  sb.merge(`A${row}:C${row}`, 'Nama Perusahaan', sz10b).merge(`D${row}:H${row}`, COMPANY_NAME, val9);
  row++;
  sb.merge(`A${row}:C${row}`, 'Nomor NPWP', sz10b).merge(`D${row}:H${row}`, COMPANY_NPWP, val9);
  // Garis tanda tangan pemesan & penerima
  sb.set(`J${row}`, null, { border: { bottom: true } });
  sb.set(`K${row}`, deal.recipientName || 'Fitri Nur Aini', { font: { sz: 8, underline: true }, h: 'left', border: { bottom: true } });
  row++;
  sb.set(`A${row}`, 'SERTIFIKAT:', { font: { sz: 10, bold: true, underline: true }, h: 'left', v: 'top' });
  sb.set(`J${row}`, ctx.dealDateShort, { font: { sz: 8, bold: true, italic: true } });
  sb.set(`K${row}`, ctx.dealDateShort, { font: { sz: 8, bold: true, italic: true } });
  row++;
  sb.merge(`A${row}:C${row}`, 'Nama:', { font: { sz: 10, bold: true }, h: 'left', v: 'top' });
  sb.merge(`D${row}:K${row}`, deal.certificateOwner || sph.hospitalName || '-', { font: { sz: 9, bold: true }, h: 'left', v: 'top' });
  row++;
  sb.merge(`A${row}:C${row}`, 'Alamat:', { font: { sz: 10, bold: true }, h: 'left', v: 'top' });
  sb.merge(`D${row}:K${row}`, sph.hospitalAddress || '-', { font: { sz: 9 }, h: 'left', v: 'top', wrap: true });
  sb.height(row, Math.max(15, estimateLines(sph.hospitalAddress || '-', 75) * 13));
  for (let r = startInfo; r < row; r++) sb.height(r, 15);

  const ws = sb.build();
  ws['!margins'] = { left: 0.08, right: 0.1, top: 0.2, bottom: 0.2, header: 0, footer: 0 };
  return ws;
}

function buildFpSheet(ctx: DealContext): any {
  const sb = new SheetBuilder(DEAL_COLS);
  const { sph, deal, bank } = ctx;
  let row = buildDealHeaderAndTable(sb, ctx, {
    numberLabel: 'Nomor (FP)',
    numberValue: deal.fpNumber,
    perihal: 'Faktur Penjualan',
    title: 'FAKTUR PENJUALAN\nINVOICE',
    closingText: 'Demikian faktur penjualan ini di sampaikan atas perhatian dan kerjasamanya kami ucapkan terimakasih.'
  });

  sb.set(`A${row}`, 'Transfer Pembayaran:', { font: { sz: 11, bold: true }, h: 'left' }).height(row, 15);
  row++;

  // Kotak info pembayaran (2 baris x 2 kolom)
  const lblTop: CellStyle = { font: { sz: 10, bold: true }, h: 'left', numFmt: COLON_FORMAT, border: { top: true, left: true } };
  const lblBot: CellStyle = { font: { sz: 10, bold: true }, h: 'left', numFmt: COLON_FORMAT, border: { bottom: true, left: true } };
  const valTop: CellStyle = { font: { sz: 10 }, h: 'left', wrap: true, border: { top: true } };
  const valBot: CellStyle = { font: { sz: 10 }, h: 'left', wrap: true, border: { bottom: true } };
  sb.merge(`A${row}:C${row}`, 'Nama Bank', lblTop);
  sb.merge(`D${row}:F${row}`, bank.bankName, valTop);
  sb.merge(`G${row}:I${row}`, 'Nama Perusahaan', lblTop);
  sb.merge(`J${row}:K${row}`, COMPANY_NAME, { ...valTop, border: { top: true, right: true } });
  sb.height(row, 15);
  row++;
  sb.merge(`A${row}:C${row}`, 'Nomor Rekening', lblBot);
  sb.merge(`D${row}:F${row}`, `${bank.accountNumber}\n(${bank.accountName})`, { ...valBot, font: { sz: 9 } });
  sb.merge(`G${row}:I${row}`, 'Nomor NPWP', lblBot);
  sb.merge(`J${row}:K${row}`, COMPANY_NPWP, { ...valBot, border: { bottom: true, right: true } });
  sb.height(row, 27);
  row += 2;

  // Tanda tangan 3 kolom
  const head: CellStyle = { font: { sz: 10, bold: true, underline: true }, h: 'left' };
  const sub: CellStyle = { font: { sz: 7, italic: true }, h: 'left' };
  sb.set(`B${row}`, 'Pembuat:', head).set(`E${row}`, 'Disetujui:', head).set(`H${row}`, 'Penerima:', head);
  row++;
  sb.set(`B${row}`, 'Administrasi', sub).set(`E${row}`, 'Direktur', sub).set(`H${row}`, sph.hospitalName || '-', sub);
  row += 4;
  const nameStyle: CellStyle = { font: { sz: 8 }, h: 'left', border: { bottom: true } };
  sb.merge(`B${row}:C${row}`, deal.recipientName || 'Fitri Nur Aini', nameStyle);
  sb.merge(`E${row}:F${row}`, sph.directorName || 'Ahmad Fajar Ariyanto', nameStyle);
  sb.merge(`H${row}:I${row}`, deal.customerPic && deal.customerPic !== '-' ? deal.customerPic : '', nameStyle);
  row++;
  const dateStyle: CellStyle = { font: { sz: 8, bold: true, italic: true }, h: 'left' };
  sb.set(`B${row}`, ctx.dealDateShort, dateStyle).set(`E${row}`, ctx.dealDateShort, dateStyle).set(`H${row}`, ctx.dealDateShort, dateStyle);

  const ws = sb.build();
  ws['!margins'] = { left: 0.1, right: 0.1, top: 0.2, bottom: 0.2, header: 0, footer: 0 };
  return ws;
}

// ============================================================================
// SHEET 5: KW (Kwitansi Pembayaran)
// ============================================================================
function buildKwSheet(ctx: DealContext): any {
  const sb = new SheetBuilder({ ...DEAL_COLS });
  const { sph, deal, billing } = ctx;
  const sz10: FontOpt = { sz: 10 };
  const label: CellStyle = { font: { sz: 10, bold: true }, h: 'left' };

  sb.merge('A1:B1', 'Nomor (KW)', label).set('C1', ':', { font: sz10 }).set('D1', deal.kwpNumber, { font: sz10, h: 'left' });
  sb.set('K1', ctx.dealDateLong, { font: sz10, h: 'right' }).height(1, 15);
  sb.merge('A2:B2', 'Perihal', label).set('C2', ':', { font: sz10 }).set('D2', 'Kwitansi Pembayaran', { font: sz10, h: 'left' });
  sb.merge('A3:K3', 'KWITANSI PEMBAYARAN\nPayment Receipt', { font: { sz: 20, bold: true }, h: 'center', wrap: true }).height(3, 52);
  sb.height(4, 21);

  const lbl: CellStyle = { font: { sz: 11, bold: true }, h: 'left', v: 'top' };
  const colon: CellStyle = { font: { sz: 11, bold: true }, h: 'right', v: 'top' };
  const val: CellStyle = { font: { sz: 10, bold: true }, h: 'left', v: 'top', wrap: true };

  sb.set('A5', 'Sudah Terima Dari', lbl).set('E5', ':', colon).merge('F5:K5', sph.hospitalName || '-', val);
  sb.merge('A6:D6', 'No. Referensi Faktur', lbl).set('E6', ':', colon).merge('F6:K6', deal.fpNumber, val);
  sb.set('A7', 'Nomor PO (Purchase Order)', lbl).set('E7', ':', colon).merge('F7:K7', sph.sphNumber || '-', val);
  const purpose = deal.kwpPurpose || `Pembayaran Pekerjaan Kalibrasi sesuai SPH No. ${sph.sphNumber}`;
  sb.set('A8', 'Untuk Pembayaran', lbl).set('E8', ':', colon).merge('F8:K8', purpose, { ...val, font: { sz: 10 } });
  sb.height(5, Math.max(15, estimateLines(sph.hospitalName || '', 50) * 14));
  sb.height(8, Math.max(15, estimateLines(purpose, 50) * 14));

  sb.set('A9', 'SEJUMLAH', { ...lbl, v: 'center' }).set('E9', ':', { ...colon, v: 'center' });
  sb.merge('F9:H9', billing.grandTotal, { font: { sz: 10, bold: true, color: WHITE }, fill: CYAN, h: 'center', numFmt: RP_FORMAT });
  sb.height(9, 18);

  sb.set('A12', 'TERBILANG', { ...lbl, v: 'center' }).set('E12', ':', { ...colon, v: 'center' });
  sb.merge('F12:K13', quoteTerbilang(billing.terbilang), { font: { sz: 10, bold: true, italic: true }, h: 'center', wrap: true });
  sb.height(12, 18).height(13, 18);

  sb.set('A23', 'Hormat kami,', { font: { sz: 10, bold: true } });
  sb.set('A24', COMPANY_NAME, { font: { sz: 10, bold: true }, v: 'top' });
  sb.set('A31', sph.directorName || 'Ahmad Fajar Ariyanto', { font: { sz: 10, underline: true } });
  sb.set('A32', sph.directorTitle || 'Direktur', { font: { sz: 8, bold: true, italic: true }, v: 'top' });

  const ws = sb.build();
  ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0, footer: 0 };
  return ws;
}

// ============================================================================
// API UTAMA
// ============================================================================
export interface SphECatSheet {
  name: string;
  ws: any;
}

/** Menyusun isi 5 sheet (tanpa menulis file). Dipisah agar mudah dites. */
export function buildSphECatSheets(
  sph: SphQuotation,
  customDealData?: SphDealData,
  bap?: BapDocument | null
): SphECatSheet[] {
  const deal = resolveDealData(sph, customDealData);
  const ctx: DealContext = {
    sph,
    deal,
    billing: calculateBillingFromBap(sph, bap),
    bank: resolveBankDetails(sph, deal),
    dealDateLong: formatIndonesianLongDate(deal.dealDate || sph.date, sph.city || 'Surakarta'),
    dealDateShort: shortDate(deal.dealDate || sph.date)
  };

  return [
    { name: 'SPH', ws: buildSphSheet(sph) },
    { name: 'Link Ecat', ws: buildLinkEcatSheet(sph) },
    { name: 'BO', ws: buildBoSheet(ctx) },
    { name: 'FP', ws: buildFpSheet(ctx) },
    { name: 'KW', ws: buildKwSheet(ctx) }
  ];
}

/**
 * Unduh 1 file Excel berisi sheet SPH, Link Ecat, BO, FP, dan KW.
 * Hanya berjalan untuk SPH E-Catalogue.
 */
export async function downloadSphECatExcel(
  sph: SphQuotation,
  customDealData?: SphDealData,
  bap?: BapDocument | null
): Promise<void> {
  if (!isECatalogueSph(sph)) {
    alert('Download Excel ini hanya tersedia untuk SPH E-Catalogue.');
    return;
  }
  try {
    const wb = XLSX.utils.book_new();
    buildSphECatSheets(sph, customDealData, bap).forEach(sheet => {
      XLSX.utils.book_append_sheet(wb, sheet.ws, sheet.name);
    });
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const seq = (sph.sphNumber || '').split('/')[0] || '000';
    saveAs(blob, `${seq} SPH E-Catalogue - ${safeFilePart(sph.hospitalName)}.xlsx`);
  } catch (err) {
    console.error('Gagal membuat file Excel SPH E-Catalogue:', err);
    alert('Gagal membuat file Excel. Silakan coba lagi.');
  }
}
