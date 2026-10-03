/**
 * IMPORT REALISASI DARI PDF BAP (Berita Acara Pekerjaan)
 * -------------------------------------------------------
 * Membaca PDF BAP yang sudah ditandatangani (format resmi PT. SMK, hasil export
 * Excel) lalu mengambil kolom: No | Nama Alat | Volume PO | Volume Realisasi |
 * Volume Sisa | Keterangan. Hasilnya dipakai untuk memperbarui Form BAP sehingga
 * harga BO / FP / Kwitansi otomatis mengikuti jumlah alat yang benar-benar dikerjakan.
 *
 * Contoh: PO 10 Bedside Monitor @ Rp 300.000, realisasi 7
 *         -> tagihan 7 x Rp 300.000 = Rp 2.100.000 (bukan Rp 3.000.000).
 *
 * Pembacaan PDF dilakukan di browser (tidak ada file yang dikirim ke server).
 */
import { BapDocument, BapItem, SphQuotation } from '../types';

/** Nama kolom realisasi yang dipakai di Form BAP untuk hasil upload PDF. */
export const PDF_REALIZATION_COLUMN = 'Realisasi PDF';

// ============================================================================
// 1. EKSTRAK TEKS + POSISI DARI PDF (pakai pdfjs-dist, dimuat saat dibutuhkan)
// ============================================================================
export interface PdfTextItem {
  str: string;
  x: number; // posisi kiri (pt)
  y: number; // posisi bawah (pt), makin besar makin ke atas
  w: number; // lebar teks (pt)
  page: number;
}

export async function extractPdfTextItems(file: File): Promise<PdfTextItem[]> {
  // Build "legacy" dipakai agar tetap jalan di browser PC rumah sakit yang lebih lama.
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // @ts-ignore - akhiran ?url adalah fitur Vite untuk mendapatkan URL file worker
  const workerModule: any = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const items: PdfTextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items as any[]) {
      const str = String(it.str || '').trim();
      if (!str) continue;
      items.push({ str, x: it.transform[4], y: it.transform[5], w: it.width || 0, page: p });
    }
  }
  return items;
}

// ============================================================================
// 2. PARSER TABEL BAP (fungsi murni, mudah dites)
// ============================================================================
export interface ParsedBapRow {
  no: number;
  namaAlat: string;
  poQty: number | null;
  realisasi: number | null;
  sisa: number | null;
  keterangan: string;
  isNonPo: boolean;
}

export interface ParsedBapPdf {
  sphNumber: string;
  bapNumber: string;
  customerName: string;
  rows: ParsedBapRow[];
  totalUnitRow: { po: number | null; realisasi: number | null; sisa: number | null } | null;
  warnings: string[];
}

const LINE_TOLERANCE = 4; // pt; teks dengan selisih tinggi <= ini dianggap 1 baris

function center(it: PdfTextItem): number {
  return it.x + it.w / 2;
}

function groupLines(items: PdfTextItem[]): PdfTextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfTextItem[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= LINE_TOLERANCE) last.push(it);
    else lines.push([it]);
  }
  return lines.map(l => l.sort((a, b) => a.x - b.x));
}

function parseIntSafe(s: string): number | null {
  const clean = s.replace(/[.\s]/g, '');
  return /^\d+$/.test(clean) ? parseInt(clean, 10) : null;
}

/** Nilai di kanan label "Label :" pada baris yang sama. */
function findLabelValue(lines: PdfTextItem[][], label: RegExp): string {
  for (const line of lines) {
    const idx = line.findIndex(it => label.test(it.str));
    if (idx === -1) continue;
    const labelItem = line[idx];
    // Kasus "NO. : 081/SMK/BAP/IX/2026" dalam satu potongan teks
    const inline = labelItem.str.split(':').slice(1).join(':').trim();
    if (inline) return inline;
    const rest = line
      .filter(it => it.x > labelItem.x && it.str !== ':')
      .map(it => it.str.replace(/^:\s*/, ''))
      .join(' ')
      .trim();
    if (rest) return rest;
  }
  return '';
}

export function parseBapPdfItems(items: PdfTextItem[]): ParsedBapPdf {
  const warnings: string[] = [];
  const rows: ParsedBapRow[] = [];
  let totalUnitRow: ParsedBapPdf['totalUnitRow'] = null;

  const allLines = groupLines(items.filter(i => i.page === 1));
  const sphNumber = findLabelValue(allLines, /^No\.?\s*PO\s*\/?\s*Kontrak/i);
  const customerName = findLabelValue(allLines, /^Nama\s+Pelanggan/i);
  const bapNumber = findLabelValue(allLines, /^NO\.\s*:/i).replace(/^NO\.\s*:\s*/i, '');

  const pages = Array.from(new Set(items.map(i => i.page))).sort((a, b) => a - b);
  let nonPoMode = false;

  for (const page of pages) {
    const pageItems = items.filter(i => i.page === page);
    const lines = groupLines(pageItems);

    // Tabel kedua di dokumen yang sama bisa berupa "Non PO"
    if (pageItems.some(i => /non\s*-?\s*po/i.test(i.str))) nonPoMode = true;

    // Cari judul kolom
    const namaHeader = pageItems.find(i => /^nama\s+alat$/i.test(i.str));
    const noHeader = pageItems.find(i => /^no\.?$/i.test(i.str) && (!namaHeader || Math.abs(i.y - namaHeader.y) <= 12));
    const near = (i: PdfTextItem) => !namaHeader || Math.abs(i.y - namaHeader.y) <= 14;
    const poHeader = pageItems.find(i => /^po$/i.test(i.str) && near(i));
    const realHeader = pageItems.find(i => /^realisasi$/i.test(i.str) && near(i));
    const sisaHeader = pageItems.find(i => /^sisa$/i.test(i.str) && near(i));
    const ketHeader = pageItems.find(i => /^keterangan$/i.test(i.str) && near(i));

    if (!namaHeader || !poHeader || !realHeader) {
      if (page === 1) warnings.push('Judul kolom tabel (Nama Alat / Volume PO / Volume Realisasi) tidak ditemukan di PDF.');
      continue;
    }

    const headerBottom = Math.min(...[namaHeader, poHeader, realHeader, sisaHeader, ketHeader].filter(Boolean).map(h => h!.y));
    const cols = [
      { key: 'po' as const, c: center(poHeader) },
      { key: 'realisasi' as const, c: center(realHeader) },
      ...(sisaHeader ? [{ key: 'sisa' as const, c: center(sisaHeader) }] : [])
    ];
    const numberZoneLeft = Math.min(...cols.map(c => c.c)) - 25;
    const ketLeft = ketHeader ? ketHeader.x - 15 : Infinity;
    const noRight = noHeader ? noHeader.x + noHeader.w + 12 : namaHeader.x - 5;

    let current: ParsedBapRow | null = null;
    for (const line of lines) {
      if (line[0].y >= headerBottom - 2) continue; // baris judul & di atasnya
      const text = line.map(i => i.str).join(' ');

      if (/total\s+unit/i.test(text)) {
        const nums: Record<string, number | null> = { po: null, realisasi: null, sisa: null };
        line.forEach(it => {
          const n = parseIntSafe(it.str);
          if (n === null || center(it) < numberZoneLeft) return;
          const nearest = cols.reduce((a, b) => (Math.abs(b.c - center(it)) < Math.abs(a.c - center(it)) ? b : a));
          nums[nearest.key] = n;
        });
        totalUnitRow = { po: nums.po, realisasi: nums.realisasi, sisa: nums.sisa };
        current = null;
        continue;
      }

      const first = line[0];
      const firstNo = parseIntSafe(first.str);
      const startsRow = firstNo !== null && first.x + first.w <= noRight;

      const nameParts: string[] = [];
      const ketParts: string[] = [];
      const nums: Record<string, number | null> = { po: null, realisasi: null, sisa: null };

      line.forEach((it, idx) => {
        if (startsRow && idx === 0) return;
        const c = center(it);
        if (it.x >= ketLeft) {
          ketParts.push(it.str);
          return;
        }
        const n = parseIntSafe(it.str);
        if (n !== null && c >= numberZoneLeft) {
          const nearest = cols.reduce((a, b) => (Math.abs(b.c - c) < Math.abs(a.c - c) ? b : a));
          nums[nearest.key] = n;
          return;
        }
        if (c < numberZoneLeft) nameParts.push(it.str);
      });

      if (startsRow) {
        current = {
          no: firstNo!,
          namaAlat: nameParts.join(' ').trim(),
          poQty: nums.po,
          realisasi: nums.realisasi,
          sisa: nums.sisa,
          keterangan: ketParts.join(' ').trim(),
          isNonPo: nonPoMode
        };
        rows.push(current);
      } else if (current && nameParts.length > 0 && nums.po === null && nums.realisasi === null) {
        // Nama alat yang terpotong ke baris berikutnya
        current.namaAlat = `${current.namaAlat} ${nameParts.join(' ')}`.trim();
        if (ketParts.length) current.keterangan = `${current.keterangan} ${ketParts.join(' ')}`.trim();
      }
    }
  }

  if (rows.length === 0) {
    warnings.push('Tidak ada baris alat yang terbaca dari PDF. Pastikan PDF adalah BAP format PT. SMK (bukan hasil scan/foto).');
  }
  rows.forEach(r => {
    if (r.realisasi === null) warnings.push(`Baris ${r.no} (${r.namaAlat}): kolom Volume Realisasi kosong, dianggap 0.`);
    if (r.poQty !== null && r.realisasi !== null && r.realisasi > r.poQty) {
      warnings.push(`Baris ${r.no} (${r.namaAlat}): realisasi (${r.realisasi}) melebihi Volume PO (${r.poQty}).`);
    }
  });
  if (totalUnitRow && totalUnitRow.realisasi !== null) {
    const sum = rows.filter(r => !r.isNonPo).reduce((s, r) => s + (r.realisasi || 0), 0);
    if (sum !== totalUnitRow.realisasi) {
      warnings.push(`Jumlah realisasi per baris (${sum}) berbeda dengan TOTAL UNIT di PDF (${totalUnitRow.realisasi}). Periksa kembali PDF.`);
    }
  }

  return { sphNumber, bapNumber, customerName, rows, totalUnitRow, warnings };
}

/** Baca file PDF BAP sekaligus parsing. */
export async function readBapPdf(file: File): Promise<ParsedBapPdf> {
  const items = await extractPdfTextItems(file);
  if (items.length === 0) {
    return {
      sphNumber: '',
      bapNumber: '',
      customerName: '',
      rows: [],
      totalUnitRow: null,
      warnings: ['PDF tidak berisi teks yang bisa dibaca (kemungkinan hasil scan/foto). Gunakan PDF hasil export Excel BAP.']
    };
  }
  return parseBapPdfItems(items);
}

// ============================================================================
// 3. COCOKKAN DENGAN FORM BAP & TERAPKAN
// ============================================================================
function normalizeName(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface BapRowMatch {
  row: ParsedBapRow;
  item: BapItem | null; // item Form BAP yang dicocokkan
  issue?: string;
}

/** Cocokkan baris PDF (bagian PO) dengan item Form BAP: utamakan nama alat, lalu nomor urut. */
export function matchBapRows(bap: BapDocument, parsed: ParsedBapPdf): BapRowMatch[] {
  const used = new Set<string>();
  const items = bap.items || [];
  return parsed.rows
    .filter(r => !r.isNonPo)
    .map(row => {
      const key = normalizeName(row.namaAlat);
      let item =
        items.find(it => !used.has(it.id) && normalizeName(it.namaAlat) === key) ||
        items.find(it => !used.has(it.id) && it.no === row.no && key.length > 0 &&
          (normalizeName(it.namaAlat).includes(key) || key.includes(normalizeName(it.namaAlat)))) ||
        null;
      let issue: string | undefined;
      if (!item) {
        const byNo = items.find(it => !used.has(it.id) && it.no === row.no);
        if (byNo) {
          item = byNo;
          issue = `Nama berbeda: di PDF "${row.namaAlat}", di Form BAP "${byNo.namaAlat}". Dicocokkan berdasarkan nomor urut.`;
        } else {
          issue = 'Alat ini tidak ada di Form BAP / SPH sehingga tidak diproses.';
        }
      }
      if (item) {
        used.add(item.id);
        if (row.poQty !== null && Number(item.poQty) !== row.poQty) {
          issue = (issue ? issue + ' ' : '') + `Volume PO di PDF (${row.poQty}) berbeda dengan SPH (${item.poQty}).`;
        }
      }
      return { row, item, issue };
    });
}

/**
 * Terapkan realisasi PDF ke Form BAP. Data PDF dianggap paling sah (sudah ditandatangani),
 * sehingga isi realisasi per tanggal untuk alat yang cocok diganti dengan 1 kolom "Realisasi PDF".
 */
export function applyBapPdfRealization(
  bap: BapDocument,
  parsed: ParsedBapPdf,
  fileName: string
): BapDocument {
  const matches = matchBapRows(bap, parsed);
  const byItemId = new Map<string, ParsedBapRow>();
  matches.forEach(m => {
    if (m.item) byItemId.set(m.item.id, m.row);
  });

  const items = (bap.items || []).map(it => {
    const row = byItemId.get(it.id);
    if (!row) return it;
    const realized = Math.max(0, row.realisasi ?? 0);
    const poQty = Number(it.poQty) || 0;
    return {
      ...it,
      realisasi: { [PDF_REALIZATION_COLUMN]: realized },
      total: realized,
      sisa: poQty - realized,
      keterangan: row.keterangan || it.keterangan || ''
    };
  });

  const dateColumns = (bap.dateColumns || []).includes(PDF_REALIZATION_COLUMN)
    ? bap.dateColumns
    : [...(bap.dateColumns || []), PDF_REALIZATION_COLUMN];

  return {
    ...bap,
    items,
    dateColumns,
    realizationSource: 'pdf_upload',
    realizationFileName: fileName,
    realizationUploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/** Cek apakah PDF memang milik SPH ini (berdasarkan No. PO/Kontrak). */
export function isSameSphNumber(sph: SphQuotation, parsed: ParsedBapPdf): boolean {
  if (!parsed.sphNumber) return true; // tidak tertulis di PDF, tidak bisa dicek
  return normalizeName(parsed.sphNumber) === normalizeName(sph.sphNumber);
}
