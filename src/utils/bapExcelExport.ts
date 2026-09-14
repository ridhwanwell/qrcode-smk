import XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { BapDocument, BapItem } from '../types';

/**
 * Convert 0-indexed column number to Excel letter (e.g. 0 -> A, 1 -> B, 26 -> AA)
 */
function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Converts SPH/PO Number into official BAP Number format:
 * "NO. : [nomor]/SMK/BAP/[bulan romawi]/[tahun]"
 * Example: "114/SMK-SPH/IX-2026" -> "NO. : 114/SMK/BAP/IX/2026"
 */
function formatBapNumber(sphNumber: string): string {
  if (!sphNumber) return 'NO. : 001/SMK/BAP/IX/2026';

  const match = sphNumber.match(/^(\d+).*\/([I|V|X|L|C|D|M]+)[-\/](\d{4})$/i);
  if (match) {
    const num = match[1];
    const month = match[2].toUpperCase();
    const year = match[3];
    return `NO. : ${num}/SMK/BAP/${month}/${year}`;
  }

  const numMatch = sphNumber.match(/(\d+)/);
  const num = numMatch ? numMatch[1] : '001';
  return `NO. : ${num}/SMK/BAP/IX/2026`;
}

/**
 * Formats the opening paragraph with day, date, month, year:
 * "Pada Hari Ini [nama hari] Tanggal [tanggal] Bulan [nama bulan] Tahun [tahun], Telah Dilaksanakan Pekerjaan Kalibrasi dan/atau Pengujian Alat-alat Kesehatan pada :"
 */
function formatBapOpeningParagraph(dateInput?: string): string {
  let dayName = 'Jumat';
  let dateNum = '04';
  let monthName = 'September';
  let yearNum = '2026';

  if (dateInput) {
    const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      dayName = daysIndo[d.getDay()];
      dateNum = String(d.getDate()).padStart(2, '0');
      monthName = monthsIndo[d.getMonth()];
      yearNum = String(d.getFullYear());
    } else {
      const clean = dateInput.replace(/,/g, '');
      const parts = clean.split(' ').filter(Boolean);
      if (parts.length >= 4) {
        dayName = parts[0];
        dateNum = parts[1];
        monthName = parts[2];
        yearNum = parts[3];
      }
    }
  }

  return `Pada Hari Ini ${dayName} Tanggal ${dateNum} Bulan ${monthName} Tahun ${yearNum}, Telah Dilaksanakan Pekerjaan Kalibrasi dan/atau Pengujian Alat-alat Kesehatan pada :`;
}

// Common Style Definitions
const thinBorder = {
  top: { style: 'medium', color: { rgb: '000000' } },
  bottom: { style: 'medium', color: { rgb: '000000' } },
  left: { style: 'medium', color: { rgb: '000000' } },
  right: { style: 'medium', color: { rgb: '000000' } },
};

const headerStyle = {
  font: { bold: true, name: 'Calibri', sz: 10 },
  fill: { fgColor: { rgb: 'D9D9D9' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinBorder,
};

const dataStyleCenter = {
  font: { name: 'Calibri', sz: 10 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: thinBorder,
};

const dataStyleLeft = {
  font: { name: 'Calibri', sz: 10 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: thinBorder,
};

const jumlahStyle = {
  font: { bold: true, name: 'Calibri', sz: 10 },
  fill: { fgColor: { rgb: 'EAEAEA' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: thinBorder,
};

const infoLabelStyle = {
  font: { bold: true, name: 'Calibri', sz: 10 },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const infoColonStyle = {
  font: { bold: true, name: 'Calibri', sz: 10 },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const infoValueStyle = {
  font: { name: 'Calibri', sz: 10 },
  alignment: { horizontal: 'left', vertical: 'center' },
};

/**
 * Builds Sheet "Rekap" or "Rekap Non PO"
 * Structure: Header Info (7 lines) | 7 Date Realisasi Table
 */
function buildRekapWorksheet(bap: BapDocument, items: BapItem[], isNonPo: boolean): XLSX.WorkSheet {
  const sourceDateCols = isNonPo
    ? (bap.nonPoDateColumns && bap.nonPoDateColumns.length > 0 ? bap.nonPoDateColumns : bap.dateColumns)
    : bap.dateColumns;

  const dateCols: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (sourceDateCols && sourceDateCols[i]) {
      dateCols.push(sourceDateCols[i]);
    } else {
      dateCols.push(i === 0 ? 'Tgl 03' : 'Tgl …');
    }
  }

  const headerInfo = isNonPo
    ? {
        customerName: bap.nonPoHeader?.customerName || '',
        sphNumber: bap.nonPoHeader?.sphNumber || '',
        poDate: bap.nonPoHeader?.poDate || '',
        address: bap.nonPoHeader?.address || '',
        cityDistrict: bap.nonPoHeader?.cityDistrict || '',
        labelNumber: bap.nonPoHeader?.labelNumber || '',
        bastpNumber: bap.nonPoHeader?.bastpNumber || '',
      }
    : {
        customerName: bap.customerName || '',
        sphNumber: bap.sphNumber || '',
        poDate: bap.poDate || '',
        address: bap.address || '',
        cityDistrict: bap.cityDistrict || '',
        labelNumber: bap.labelNumber || '',
        bastpNumber: bap.bastpNumber || '',
      };

  const aoa: any[][] = [];

  // 1. Header Info Block (Rows 1..7)
  const headerLabels = [
    'Nama RS.',
    'No. PO',
    'Tanggal PO',
    'Alamat',
    'Kota/Kab.',
    'No. Label',
    'No. BASTP'
  ];

  const headerKeys: (keyof typeof headerInfo)[] = [
    'customerName',
    'sphNumber',
    'poDate',
    'address',
    'cityDistrict',
    'labelNumber',
    'bastpNumber'
  ];

  for (let r = 0; r < 7; r++) {
    const rowArr = new Array(14).fill(null);
    rowArr[0] = { v: '', t: 's' };
    rowArr[1] = { v: headerLabels[r], t: 's', s: infoLabelStyle };
    rowArr[2] = { v: '', t: 's' }; // merged into B
    rowArr[3] = { v: ':', t: 's', s: infoColonStyle };
    rowArr[4] = { v: headerInfo[headerKeys[r]] || '', t: 's', s: infoValueStyle };
    aoa.push(rowArr);
  }

  // Row 8: Blank row
  aoa.push(new Array(14).fill({ v: '', t: 's' }));

  // 2. Table Header Rows (Rows 9 & 10)
  const row9 = new Array(14).fill(null);
  row9[0] = { v: '', t: 's' };
  row9[1] = { v: 'No.', t: 's', s: headerStyle };
  row9[2] = { v: 'NAMA ALAT', t: 's', s: headerStyle };
  row9[3] = { v: 'PO', t: 's', s: headerStyle };
  row9[4] = { v: 'REALISASI', t: 's', s: headerStyle };
  for (let c = 5; c <= 10; c++) row9[c] = { v: '', t: 's', s: headerStyle };
  row9[11] = { v: 'TOTAL', t: 's', s: headerStyle };
  row9[12] = { v: 'SISA', t: 's', s: headerStyle };
  row9[13] = { v: 'KETERANGAN', t: 's', s: headerStyle };
  aoa.push(row9);

  // Row 10: Date subheaders
  const row10 = new Array(14).fill(null);
  row10[0] = { v: '', t: 's' };
  row10[1] = { v: '', t: 's', s: headerStyle };
  row10[2] = { v: '', t: 's', s: headerStyle };
  row10[3] = { v: '', t: 's', s: headerStyle };
  for (let c = 4; c <= 10; c++) {
    row10[c] = { v: dateCols[c - 4], t: 's', s: headerStyle };
  }
  row10[11] = { v: '', t: 's', s: headerStyle };
  row10[12] = { v: '', t: 's', s: headerStyle };
  row10[13] = { v: '', t: 's', s: headerStyle };
  aoa.push(row10);

  // 3. Table Data Rows (Row 11 onwards)
  const dataStartRowIdx = 10; // 0-indexed index 10 = Excel row 11
  const effectiveItems = items || [];
  const itemCount = effectiveItems.length;
  const numRowsToRender = itemCount > 0 ? itemCount : (isNonPo ? 10 : 0);

  let grandPoQty = 0;
  const grandDateSums = new Array(7).fill(0);
  let grandTotal = 0;
  let grandSisa = 0;

  for (let i = 0; i < numRowsToRender; i++) {
    const rIdx = dataStartRowIdx + i;
    const rowNum = rIdx + 1; // 1-indexed
    const item = effectiveItems[i];
    const rowArr = new Array(14).fill(null);
    rowArr[0] = { v: '', t: 's' };

    const noVal = item ? (item.no || i + 1) : '';
    const namaVal = item ? (item.namaAlat || '') : '';
    const poVal = (item && item.poQty !== undefined && item.poQty !== null) ? Number(item.poQty) : '';

    if (typeof poVal === 'number') grandPoQty += poVal;

    let sumRowRealisasi = 0;
    const realVals: (number | '')[] = [];
    for (let c = 4; c <= 10; c++) {
      const dColName = dateCols[c - 4];
      const val = item?.realisasi?.[dColName];
      if (val !== undefined && val !== null && Number(val) > 0) {
        const numV = Number(val);
        realVals.push(numV);
        sumRowRealisasi += numV;
        grandDateSums[c - 4] += numV;
      } else {
        realVals.push('');
      }
    }

    const totalVal = namaVal ? sumRowRealisasi : '';
    const sisaVal = (namaVal && typeof poVal === 'number') ? (poVal - sumRowRealisasi) : '';
    const ketVal = namaVal ? (sisaVal === 0 ? 'Selesai' : 'Batal') : '';

    if (typeof totalVal === 'number') grandTotal += totalVal;
    if (typeof sisaVal === 'number') grandSisa += sisaVal;

    rowArr[1] = { v: noVal, t: typeof noVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    rowArr[2] = { v: namaVal, t: 's', s: dataStyleLeft };
    rowArr[3] = { v: poVal, t: typeof poVal === 'number' ? 'n' : 's', s: dataStyleCenter };

    for (let c = 4; c <= 10; c++) {
      const rV = realVals[c - 4];
      rowArr[c] = { v: rV, t: typeof rV === 'number' ? 'n' : 's', s: dataStyleCenter };
    }

    rowArr[11] = { f: `IF(C${rowNum}="","",SUM(E${rowNum}:K${rowNum}))`, v: totalVal, t: typeof totalVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    rowArr[12] = { f: `IF(C${rowNum}="","",D${rowNum}-L${rowNum})`, v: sisaVal, t: typeof sisaVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    rowArr[13] = { f: `IF(C${rowNum}="","",IF(M${rowNum}=0,"Selesai","Batal"))`, v: ketVal, t: 's', s: dataStyleCenter };

    aoa.push(rowArr);
  }

  // 4. JUMLAH Row
  const jumlahRowIdx = dataStartRowIdx + numRowsToRender;
  const firstDataRowNum = 11;
  const lastDataRowNum = dataStartRowIdx + numRowsToRender;
  const jumlahRowArr = new Array(14).fill(null);
  jumlahRowArr[0] = { v: '', t: 's' };

  jumlahRowArr[1] = { v: 'JUMLAH', t: 's', s: jumlahStyle };
  jumlahRowArr[2] = { v: '', t: 's', s: jumlahStyle };

  if (numRowsToRender > 0) {
    jumlahRowArr[3] = { f: `SUM(D${firstDataRowNum}:D${lastDataRowNum})`, v: grandPoQty || 0, t: 'n', s: jumlahStyle };
    for (let c = 4; c <= 10; c++) {
      const colLetter = getColumnLetter(c);
      const dSum = grandDateSums[c - 4];
      jumlahRowArr[c] = { f: `SUM(${colLetter}${firstDataRowNum}:${colLetter}${lastDataRowNum})`, v: dSum || 0, t: 'n', s: jumlahStyle };
    }
    jumlahRowArr[11] = { f: `SUM(L${firstDataRowNum}:L${lastDataRowNum})`, v: grandTotal || 0, t: 'n', s: jumlahStyle };
    jumlahRowArr[12] = { f: `SUM(M${firstDataRowNum}:M${lastDataRowNum})`, v: grandSisa || 0, t: 'n', s: jumlahStyle };
    jumlahRowArr[13] = { v: '', t: 's', s: jumlahStyle };
  } else {
    jumlahRowArr[3] = { v: 0, t: 'n', s: jumlahStyle };
    for (let c = 4; c <= 10; c++) jumlahRowArr[c] = { v: 0, t: 'n', s: jumlahStyle };
    jumlahRowArr[11] = { v: 0, t: 'n', s: jumlahStyle };
    jumlahRowArr[12] = { v: 0, t: 'n', s: jumlahStyle };
    jumlahRowArr[13] = { v: '', t: 's', s: jumlahStyle };
  }

  aoa.push(jumlahRowArr);

  // 5. Blank row & Signatures
  aoa.push(new Array(14).fill({ v: '', t: 's' }));
  
  const techRow = new Array(14).fill({ v: '', t: 's' });
  techRow[2] = { v: 'Di Isi Oleh Teknisi Lapangan', t: 's', s: { font: { name: 'Calibri', sz: 10, italic: true } } };
  aoa.push(techRow);

  const adminRow = new Array(14).fill({ v: '', t: 's' });
  adminRow[2] = { v: 'Di Isi Oleh Admin', t: 's', s: { font: { name: 'Calibri', sz: 10, italic: true } } };
  aoa.push(adminRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges setup for Rekap
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: 13 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
    { s: { r: 2, c: 4 }, e: { r: 2, c: 13 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 13 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 13 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 13 } },
    { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } },
    { s: { r: 6, c: 4 }, e: { r: 6, c: 13 } },

    { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } },  // No.
    { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } },  // NAMA ALAT
    { s: { r: 8, c: 3 }, e: { r: 9, c: 3 } },  // PO
    { s: { r: 8, c: 4 }, e: { r: 8, c: 10 } }, // REALISASI
    { s: { r: 8, c: 11 }, e: { r: 9, c: 11 } },// TOTAL
    { s: { r: 8, c: 12 }, e: { r: 9, c: 12 } },// SISA
    { s: { r: 8, c: 13 }, e: { r: 9, c: 13 } },// KETERANGAN

    { s: { r: jumlahRowIdx, c: 1 }, e: { r: jumlahRowIdx, c: 2 } }
  ];

  ws['!merges'] = merges;

  ws['!cols'] = [
    { wch: 3 },   // Col A
    { wch: 6 },   // Col B: No.
    { wch: 38 },  // Col C: NAMA ALAT
    { wch: 3.5 }, // Col D: PO / ":"
    { wch: 9 },   // Col E..K: Realisasi Dates 1..7
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },   // Col L: TOTAL
    { wch: 8 },   // Col M: SISA
    { wch: 16 }   // Col N: KETERANGAN
  ];

  return ws;
}

/**
 * Builds Official "Berita Acara Pekerjaan" Document Worksheet for Sheet "BAP" and "BAP Non PO"
 * Exact user revisions applied:
 * 1. Opening Paragraph: Merged Rows 4 & 5 across Columns B to I (B4:I5)
 * 2. Column Width Optimization (Compact Volume & Nama Alat columns for 1-Page Horizontal Print Preview):
 *    - Col B: No (5 wch)
 *    - Col C..E: Nama Alat (Total ~35 wch, C:20, D:3.5, E:11.5)
 *    - Col F: Volume PO (8 wch - compact numeric)
 *    - Col G: Volume Realisasi (10 wch - compact numeric)
 *    - Col H: Volume Sisa (8 wch - compact numeric)
 *    - Col I: Keterangan (12 wch)
 * 3. Page Setup Configuration: Fit to 1 page wide on A4 Portrait Print Preview
 */
function buildBapDocWorksheet(bap: BapDocument, items: BapItem[], isNonPo: boolean): XLSX.WorkSheet {
  const targetSheetName = isNonPo ? 'Rekap Non PO' : 'Rekap';

  const docTitleStyle = {
    font: { bold: true, underline: true, name: 'Calibri', sz: 12 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const docSubTitleStyle = {
    font: { bold: true, name: 'Calibri', sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const paragraphStyle = {
    font: { name: 'Calibri', sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  };

  const poNumber = isNonPo ? (bap.nonPoHeader?.sphNumber || bap.sphNumber) : (bap.sphNumber || '');
  const poDateStr = isNonPo ? (bap.nonPoHeader?.poDate || bap.poDate) : (bap.poDate || '');
  const bapNumberText = formatBapNumber(poNumber);
  const openingParagraphText = formatBapOpeningParagraph(poDateStr);

  const aoa: any[][] = [];

  // Row 1: Document Title (BERITA ACARA PEKERJAAN)
  const r1 = new Array(10).fill(null);
  r1[0] = { v: '', t: 's' };
  r1[1] = { v: 'BERITA ACARA PEKERJAAN', t: 's', s: docTitleStyle };
  for (let c = 2; c <= 8; c++) r1[c] = { v: '', t: 's', s: docTitleStyle };
  aoa.push(r1);

  // Row 2: Document Number
  const r2 = new Array(10).fill(null);
  r2[0] = { v: '', t: 's' };
  r2[1] = { v: bapNumberText, t: 's', s: docSubTitleStyle };
  for (let c = 2; c <= 8; c++) r2[c] = { v: '', t: 's', s: docSubTitleStyle };
  aoa.push(r2);

  // Row 3: Blank
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Row 4 & Row 5: Opening Paragraph merged across Rows 4 & 5 (B4:I5)
  const r4 = new Array(10).fill(null);
  r4[0] = { v: '', t: 's' };
  r4[1] = { v: openingParagraphText, t: 's', s: paragraphStyle };
  for (let c = 2; c <= 8; c++) r4[c] = { v: '', t: 's', s: paragraphStyle };
  aoa.push(r4);

  const r5 = new Array(10).fill(null);
  for (let c = 0; c <= 8; c++) r5[c] = { v: '', t: 's', s: paragraphStyle };
  aoa.push(r5);

  // Row 6: Blank
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Rows 7..11: Header Info (5 lines)
  // Col B..C merged for Label, Col D for colon ":", Col E..I merged for Value
  const infoLabels = [
    'Nama RS.',
    'No. PO/Kontrol',
    'Tanggal PO',
    'Alamat',
    'Kota/Kab.'
  ];

  for (let r = 0; r < 5; r++) {
    const rekapRowIdx = r + 1; // 1-indexed row in Rekap sheet (E1..E5)
    const rowArr = new Array(10).fill(null);
    rowArr[0] = { v: '', t: 's' };
    rowArr[1] = { v: infoLabels[r], t: 's', s: infoLabelStyle };
    rowArr[2] = { v: '', t: 's', s: infoLabelStyle }; // Merged B..C
    rowArr[3] = { v: ':', t: 's', s: infoColonStyle }; // Col D

    let cachedVal = '';
    if (!isNonPo) {
      if (r === 0) cachedVal = bap.customerName || '';
      else if (r === 1) cachedVal = bap.sphNumber || '';
      else if (r === 2) cachedVal = bap.poDate || '';
      else if (r === 3) cachedVal = bap.address || '';
      else if (r === 4) cachedVal = bap.cityDistrict || '';
    } else {
      if (r === 0) cachedVal = bap.nonPoHeader?.customerName || '';
      else if (r === 1) cachedVal = bap.nonPoHeader?.sphNumber || '';
      else if (r === 2) cachedVal = bap.nonPoHeader?.poDate || '';
      else if (r === 3) cachedVal = bap.nonPoHeader?.address || '';
      else if (r === 4) cachedVal = bap.nonPoHeader?.cityDistrict || '';
    }

    rowArr[4] = { f: `'${targetSheetName}'!E${rekapRowIdx}`, v: cachedVal, t: 's', s: infoValueStyle };
    for (let c = 5; c <= 8; c++) rowArr[c] = { v: '', t: 's', s: infoValueStyle };

    aoa.push(rowArr);
  }

  // Row 12: Blank
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Row 13: Table Header (Data Alat)
  const r13 = new Array(10).fill(null);
  r13[0] = { v: '', t: 's' };
  r13[1] = { v: 'No', t: 's', s: headerStyle };
  r13[2] = { v: 'Nama Alat', t: 's', s: headerStyle };
  r13[3] = { v: '', t: 's', s: headerStyle }; // Part of C..E merge
  r13[4] = { v: '', t: 's', s: headerStyle }; // Part of C..E merge
  r13[5] = { v: 'Volume PO', t: 's', s: headerStyle };
  r13[6] = { v: 'Volume Realisasi', t: 's', s: headerStyle };
  r13[7] = { v: 'Volume Sisa', t: 's', s: headerStyle };
  r13[8] = { v: 'Keterangan', t: 's', s: headerStyle };
  aoa.push(r13);

  // Rows 14 onwards: Data Rows
  const effectiveItems = items || [];
  const itemCount = effectiveItems.length;
  const numRowsToRender = itemCount > 0 ? itemCount : (isNonPo ? 10 : 0);

  let grandPoQty = 0;
  let grandRealisasi = 0;
  let grandSisa = 0;

  const dataRowMerges: XLSX.Range[] = [];

  for (let i = 0; i < numRowsToRender; i++) {
    const docRowNum = 14 + i;     // Excel row number in BAP document sheet (starts at Row 14)
    const docRowIdx = 13 + i;     // 0-indexed row index
    const rekapRowNum = 11 + i;  // Excel row number in Rekap sheet
    const item = effectiveItems[i];
    const rowArr = new Array(10).fill(null);
    rowArr[0] = { v: '', t: 's' };

    const noVal = item ? (item.no || i + 1) : '';
    const namaVal = item ? (item.namaAlat || '') : '';
    const poVal = (item && item.poQty !== undefined && item.poQty !== null) ? Number(item.poQty) : '';

    if (typeof poVal === 'number') grandPoQty += poVal;

    let sumRowRealisasi = 0;
    if (item && item.realisasi) {
      Object.values(item.realisasi).forEach(v => {
        if (v !== undefined && v !== null && Number(v) > 0) {
          sumRowRealisasi += Number(v);
        }
      });
    }

    const realisasiVal = namaVal ? sumRowRealisasi : '';
    const sisaVal = (namaVal && typeof poVal === 'number') ? (poVal - sumRowRealisasi) : '';
    const ketVal = namaVal ? (sisaVal === 0 ? 'Selesai' : 'Batal') : '';

    if (typeof realisasiVal === 'number') grandRealisasi += realisasiVal;
    if (typeof sisaVal === 'number') grandSisa += sisaVal;

    // Col B (No): ='Rekap'!B11
    rowArr[1] = { f: `'${targetSheetName}'!B${rekapRowNum}`, v: noVal, t: typeof noVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    
    // Col C..E merged (Nama Alat): ='Rekap'!C11
    rowArr[2] = { f: `'${targetSheetName}'!C${rekapRowNum}`, v: namaVal, t: 's', s: dataStyleLeft };
    rowArr[3] = { v: '', t: 's', s: dataStyleLeft };
    rowArr[4] = { v: '', t: 's', s: dataStyleLeft };

    // Col F (Volume PO): ='Rekap'!D11
    rowArr[5] = { f: `'${targetSheetName}'!D${rekapRowNum}`, v: poVal, t: typeof poVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    
    // Col G (Volume Realisasi): ='Rekap'!L11 (Column L in Rekap is TOTAL realisasi!)
    rowArr[6] = { f: `'${targetSheetName}'!L${rekapRowNum}`, v: realisasiVal, t: typeof realisasiVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    
    // Col H (Volume Sisa): =IF(C14="","",F14-G14)
    rowArr[7] = { f: `IF(C${docRowNum}="","",F${docRowNum}-G${docRowNum})`, v: sisaVal, t: typeof sisaVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    
    // Col I (Keterangan): =IF(C14="","",IF(H14=0,"Selesai","Batal"))
    rowArr[8] = { f: `IF(C${docRowNum}="","",IF(H${docRowNum}=0,"Selesai","Batal"))`, v: ketVal, t: 's', s: dataStyleCenter };

    aoa.push(rowArr);

    // Merge C..E for this data row
    dataRowMerges.push({ s: { r: docRowIdx, c: 2 }, e: { r: docRowIdx, c: 4 } });
  }

  // Row "TOTAL UNIT"
  const totalRowIdx = 13 + numRowsToRender; // 0-indexed index
  const firstDataRow = 14;
  const lastDataRow = 13 + numRowsToRender;

  const totalRowArr = new Array(10).fill(null);
  totalRowArr[0] = { v: '', t: 's' };
  totalRowArr[1] = { v: 'TOTAL UNIT', t: 's', s: jumlahStyle };
  totalRowArr[2] = { v: '', t: 's', s: jumlahStyle };
  totalRowArr[3] = { v: '', t: 's', s: jumlahStyle };
  totalRowArr[4] = { v: '', t: 's', s: jumlahStyle };

  if (numRowsToRender > 0) {
    totalRowArr[5] = { f: `SUM(F${firstDataRow}:F${lastDataRow})`, v: grandPoQty || 0, t: 'n', s: jumlahStyle };
    totalRowArr[6] = { f: `SUM(G${firstDataRow}:G${lastDataRow})`, v: grandRealisasi || 0, t: 'n', s: jumlahStyle };
    totalRowArr[7] = { f: `SUM(H${firstDataRow}:H${lastDataRow})`, v: grandSisa || 0, t: 'n', s: jumlahStyle };
    totalRowArr[8] = { v: '', t: 's', s: jumlahStyle };
  } else {
    totalRowArr[5] = { v: 0, t: 'n', s: jumlahStyle };
    totalRowArr[6] = { v: 0, t: 'n', s: jumlahStyle };
    totalRowArr[7] = { v: 0, t: 'n', s: jumlahStyle };
    totalRowArr[8] = { v: '', t: 's', s: jumlahStyle };
  }

  aoa.push(totalRowArr);

  // Blank row
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Signature Section
  const customerNameText = isNonPo
    ? (bap.nonPoHeader?.customerName || 'Pihak Rumah Sakit / Customer')
    : (bap.customerName || 'Pihak Rumah Sakit / Customer');

  const sigHeader = new Array(10).fill(null);
  sigHeader[0] = { v: '', t: 's' };
  sigHeader[1] = { v: customerNameText, t: 's', s: { font: { bold: true, name: 'Calibri', sz: 10 }, alignment: { horizontal: 'center' } } };
  sigHeader[2] = { v: '', t: 's' };
  sigHeader[3] = { v: '', t: 's' };
  sigHeader[4] = { v: '', t: 's' };
  sigHeader[5] = { v: 'PT. SARANA MULTI KALIBRASI', t: 's', s: { font: { bold: true, name: 'Calibri', sz: 10 }, alignment: { horizontal: 'center' } } };
  sigHeader[6] = { v: '', t: 's' };
  sigHeader[7] = { v: '', t: 's' };
  sigHeader[8] = { v: '', t: 's' };
  aoa.push(sigHeader);

  // Blank rows for signature spacing
  aoa.push(new Array(10).fill({ v: '', t: 's' }));
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Signature Line
  const sigLine = new Array(10).fill(null);
  sigLine[0] = { v: '', t: 's' };
  sigLine[1] = { v: '( _________________________ )', t: 's', s: { font: { name: 'Calibri', sz: 10 }, alignment: { horizontal: 'center' } } };
  sigLine[2] = { v: '', t: 's' };
  sigLine[3] = { v: '', t: 's' };
  sigLine[4] = { v: '', t: 's' };
  sigLine[5] = { v: '( _________________________ )', t: 's', s: { font: { name: 'Calibri', sz: 10 }, alignment: { horizontal: 'center' } } };
  sigLine[6] = { v: '', t: 's' };
  sigLine[7] = { v: '', t: 's' };
  sigLine[8] = { v: '', t: 's' };
  aoa.push(sigLine);

  // Signature Role Label
  const sigRole = new Array(10).fill(null);
  sigRole[0] = { v: '', t: 's' };
  sigRole[1] = { v: 'Teknisi / User RS', t: 's', s: { font: { name: 'Calibri', sz: 10, italic: true }, alignment: { horizontal: 'center' } } };
  sigRole[2] = { v: '', t: 's' };
  sigRole[3] = { v: '', t: 's' };
  sigRole[4] = { v: '', t: 's' };
  sigRole[5] = { v: 'Teknisi SMK', t: 's', s: { font: { name: 'Calibri', sz: 10, italic: true }, alignment: { horizontal: 'center' } } };
  sigRole[6] = { v: '', t: 's' };
  sigRole[7] = { v: '', t: 's' };
  sigRole[8] = { v: '', t: 's' };
  aoa.push(sigRole);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges setup for BAP Document
  const merges: XLSX.Range[] = [
    // Row 1 Title (B1:I1)
    { s: { r: 0, c: 1 }, e: { r: 0, c: 8 } },
    // Row 2 BAP Number (B2:I2)
    { s: { r: 1, c: 1 }, e: { r: 1, c: 8 } },
    // Rows 4 & 5 Opening Paragraph merged vertically & horizontally (B4:I5)
    { s: { r: 3, c: 1 }, e: { r: 4, c: 8 } },

    // Header Info Block (Rows 7..11, r = 6..10)
    // Label B..C
    { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 2 } },
    { s: { r: 8, c: 1 }, e: { r: 8, c: 2 } },
    { s: { r: 9, c: 1 }, e: { r: 9, c: 2 } },
    { s: { r: 10, c: 1 }, e: { r: 10, c: 2 } },
    // Value E..I
    { s: { r: 6, c: 4 }, e: { r: 6, c: 8 } },
    { s: { r: 7, c: 4 }, e: { r: 7, c: 8 } },
    { s: { r: 8, c: 4 }, e: { r: 8, c: 8 } },
    { s: { r: 9, c: 4 }, e: { r: 9, c: 8 } },
    { s: { r: 10, c: 4 }, e: { r: 10, c: 8 } },

    // Table Header Nama Alat C..E (Row 13, r = 12)
    { s: { r: 12, c: 2 }, e: { r: 12, c: 4 } },

    // Data Rows Nama Alat C..E
    ...dataRowMerges,

    // TOTAL UNIT Row Merge B..E
    { s: { r: totalRowIdx, c: 1 }, e: { r: totalRowIdx, c: 4 } },

    // Signature Block Merges
    { s: { r: totalRowIdx + 2, c: 1 }, e: { r: totalRowIdx + 2, c: 4 } },
    { s: { r: totalRowIdx + 2, c: 5 }, e: { r: totalRowIdx + 2, c: 8 } },

    { s: { r: totalRowIdx + 5, c: 1 }, e: { r: totalRowIdx + 5, c: 4 } },
    { s: { r: totalRowIdx + 5, c: 5 }, e: { r: totalRowIdx + 5, c: 8 } },

    { s: { r: totalRowIdx + 6, c: 1 }, e: { r: totalRowIdx + 6, c: 4 } },
    { s: { r: totalRowIdx + 6, c: 5 }, e: { r: totalRowIdx + 6, c: 8 } }
  ];

  ws['!merges'] = merges;

  // Optimized Column Widths for 1-Page Horizontal Print Preview (A4 Portrait)
  ws['!cols'] = [
    { wch: 1.5 }, // Col A (padding)
    { wch: 4 },   // Col B: No
    { wch: 18 },  // Col C: Part 1 of Nama Alat C..E
    { wch: 2.5 }, // Col D: Colon ":" / Part 2 of Nama Alat C..E (narrow)
    { wch: 7.5 }, // Col E: Part 2 of Value E..I / Part 3 of Nama Alat C..E
    { wch: 6.5 }, // Col F: Volume PO (extra compact)
    { wch: 7.5 }, // Col G: Volume Realisasi (extra compact)
    { wch: 6.5 }, // Col H: Volume Sisa (extra compact)
    { wch: 10 }   // Col I: Keterangan
  ];

  // Configure Tight Page Margins (0.3 in) so content fits 1 page wide
  ws['!margins'] = {
    left: 0.3,
    right: 0.3,
    top: 0.5,
    bottom: 0.5,
    header: 0.3,
    footer: 0.3
  };

  // Configure Excel Page Setup for 1-Page Wide Print Preview (Portrait A4)
  ws['!pageSetup'] = {
    orientation: 'portrait',
    paperSize: 9,    // A4 Paper Size
    fitToWidth: 1,   // Fit to 1 page wide
    fitToHeight: 0   // Automatic page count vertically
  };

  return ws;
}

/**
 * Export 4-Sheet BAP document to Excel (.xlsx)
 * Sheets:
 * 1. Rekap (Detail matrix with 7 date realisasi columns)
 * 2. BAP (Official Berita Acara Pekerjaan document synced from Rekap)
 * 3. Rekap Non PO (Detail matrix for non-PO items)
 * 4. BAP Non PO (Official Berita Acara Pekerjaan document synced from Rekap Non PO)
 */
export function exportBapToExcel(bap: BapDocument) {
  const wb = XLSX.utils.book_new();

  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.WBProps) wb.Workbook.WBProps = {};
  (wb.Workbook.WBProps as any).fullCalcOnLoad = true;

  // 1. Sheet "Rekap"
  const wsRekap = buildRekapWorksheet(bap, bap.items, false);
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap');

  // 2. Sheet "BAP" (Official Berita Acara Pekerjaan document)
  const wsBap = buildBapDocWorksheet(bap, bap.items, false);
  XLSX.utils.book_append_sheet(wb, wsBap, 'BAP');

  // 3. Sheet "Rekap Non PO"
  const wsRekapNonPo = buildRekapWorksheet(bap, bap.nonPoItems, true);
  XLSX.utils.book_append_sheet(wb, wsRekapNonPo, 'Rekap Non PO');

  // 4. Sheet "BAP Non PO" (Official Berita Acara Pekerjaan document for Non PO items)
  const wsBapNonPo = buildBapDocWorksheet(bap, bap.nonPoItems, true);
  XLSX.utils.book_append_sheet(wb, wsBapNonPo, 'BAP Non PO');

  // Generate binary output using xlsx-js-style
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  // Safe filename
  const cleanCustomer = (bap.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPo = (bap.sphNumber || 'BAP').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `BAP_${cleanCustomer}_${cleanPo}.xlsx`;

  saveAs(
    new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}
