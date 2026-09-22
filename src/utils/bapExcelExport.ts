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

  const cleanStr = sphNumber.replace(/^NO\.\s*:\s*/i, '').trim();

  const match = cleanStr.match(/^(\d+).*\/([I|V|X|L|C|D|M]+)[-\/](\d{4})$/i);
  if (match) {
    const num = match[1].padStart(3, '0');
    const month = match[2].toUpperCase();
    const year = match[3];
    return `NO. : ${num}/SMK/BAP/${month}/${year}`;
  }

  const numMatch = cleanStr.match(/(\d+)/);
  const num = numMatch ? numMatch[1].padStart(3, '0') : '001';
  return `NO. : ${num}/SMK/BAP/IX/2026`;
}

/**
 * Formats the opening paragraph with TAB indentation and bold day, date, month, year:
 */
function formatBapOpeningParagraph(dateInput?: string): { text: string; richText: any[]; dayName: string; dateNum: string; monthName: string; yearNum: string } {
  let dayName = 'Jumat';
  let dateNum = '18';
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

  const plainText = `    Pada Hari Ini ${dayName} Tanggal ${dateNum} Bulan ${monthName} Tahun ${yearNum}, Telah Dilaksanakan Pekerjaan Kalibrasi dan/atau Pengujian Alat-alat Kesehatan pada :`;

  const normalFont = { name: 'Calibri', sz: 12, bold: false, b: false };
  const boldFont = { name: 'Calibri', sz: 12, bold: true, b: true };

  const richText = [
    { t: '    Pada Hari Ini ', font: normalFont, s: { font: normalFont } },
    { t: dayName, font: boldFont, s: { font: boldFont } },
    { t: ' Tanggal ', font: normalFont, s: { font: normalFont } },
    { t: dateNum, font: boldFont, s: { font: boldFont } },
    { t: ' Bulan ', font: normalFont, s: { font: normalFont } },
    { t: monthName, font: boldFont, s: { font: boldFont } },
    { t: ' Tahun ', font: normalFont, s: { font: normalFont } },
    { t: yearNum, font: boldFont, s: { font: boldFont } },
    { t: ', Telah Dilaksanakan Pekerjaan Kalibrasi dan/atau Pengujian Alat-alat Kesehatan pada :', font: normalFont, s: { font: normalFont } }
  ];

  return { text: plainText, richText, dayName, dateNum, monthName, yearNum };
}

/**
 * Splits address into street/district (up to Kecamatan) and city/province/postal code
 */
function parseAddressAndCity(rawAddress?: string, rawCityDistrict?: string): { address: string; cityDistrict: string } {
  const full = (rawAddress || '').trim();
  let cityPart = (rawCityDistrict || '').trim();

  if (full) {
    const cityMatch = full.match(/(,\s*)(Kota\s+.*|Kab\.\s+.*|Kabupaten\s+.*|\d{5}.*)/i);
    if (cityMatch && cityMatch.index !== undefined) {
      const addrPart = full.substring(0, cityMatch.index).trim();
      const extractedCity = full.substring(cityMatch.index + cityMatch[1].length).trim();
      return {
        address: addrPart,
        cityDistrict: extractedCity || cityPart || 'Kota Surakarta, Jawa Tengah 57126'
      };
    }

    const kecMatch = full.match(/(.*Kec\.\s*[^\s,]+(?:\s+[^\s,]+)?)(?:,\s*)(.*)/i);
    if (kecMatch) {
      const addrPart = kecMatch[1].trim();
      const restPart = kecMatch[2].trim();
      if (restPart) {
        return {
          address: addrPart,
          cityDistrict: restPart
        };
      }
    }
  }

  return {
    address: full || 'Jl. Kolonel Sutarto No.132, Jebres, Kec. Jebres',
    cityDistrict: cityPart || 'Kota Surakarta, Jawa Tengah 57126'
  };
}

// Common Style Definitions (All 12px Font & Thin Table Borders)
const thinTableBorder = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const blueHeaderStyle = {
  font: { bold: true, name: 'Calibri', sz: 12, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1C658C' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinTableBorder,
};

const blueTotalStyle = {
  font: { bold: true, name: 'Calibri', sz: 12, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1C658C' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: thinTableBorder,
};

const dataStyleCenter = {
  font: { name: 'Calibri', sz: 12 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: thinTableBorder,
};

const dataStyleLeft = {
  font: { name: 'Calibri', sz: 12 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: thinTableBorder,
};

const rekapHeaderStyle = {
  font: { bold: true, name: 'Calibri', sz: 12 },
  fill: { fgColor: { rgb: 'D9D9D9' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinTableBorder,
};

const rekapJumlahStyle = {
  font: { bold: true, name: 'Calibri', sz: 12 },
  fill: { fgColor: { rgb: 'EAEAEA' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: thinTableBorder,
};

const infoLabelStyle = {
  font: { bold: true, name: 'Calibri', sz: 12 },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const infoColonStyle = {
  font: { bold: true, name: 'Calibri', sz: 12 },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const infoValueStyle = {
  font: { name: 'Calibri', sz: 12 },
  alignment: { horizontal: 'left', vertical: 'center' },
};

/**
 * Builds Sheet "Rekap" or "Rekap Non PO"
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
      dateCols.push(`Tgl ${String(i + 3).padStart(2, '0')}`);
    }
  }

  const rawAddress = isNonPo
    ? (bap.nonPoHeader?.address || bap.address || '')
    : (bap.address || '');

  const rawCity = isNonPo
    ? (bap.nonPoHeader?.cityDistrict || bap.cityDistrict || '')
    : (bap.cityDistrict || '');

  const parsed = parseAddressAndCity(rawAddress, rawCity);

  const headerInfo = isNonPo
    ? {
        customerName: bap.nonPoHeader?.customerName || bap.customerName || (bap as any).hospitalName || '',
        sphNumber: bap.nonPoHeader?.sphNumber || bap.sphNumber || '',
        poDate: bap.nonPoHeader?.poDate || bap.poDate || '',
        address: parsed.address,
        cityDistrict: parsed.cityDistrict,
        labelNumber: bap.nonPoHeader?.labelNumber || bap.labelNumber || '',
        bastpNumber: bap.nonPoHeader?.bastpNumber || bap.bastpNumber || '',
      }
    : {
        customerName: bap.customerName || (bap as any).hospitalName || '',
        sphNumber: bap.sphNumber || '',
        poDate: bap.poDate || '',
        address: parsed.address,
        cityDistrict: parsed.cityDistrict,
        labelNumber: bap.labelNumber || '',
        bastpNumber: bap.bastpNumber || '',
      };

  const aoa: any[][] = [];

  // 1. Header Info Block (Rows 1..7)
  const headerLabels = [
    'Nama Pelanggan',
    'No. PO/Kontrak',
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
    rowArr[2] = { v: '', t: 's' };
    rowArr[3] = { v: ':', t: 's', s: infoColonStyle };
    rowArr[4] = { v: headerInfo[headerKeys[r]] || '', t: 's', s: infoValueStyle };
    aoa.push(rowArr);
  }

  aoa.push(new Array(14).fill({ v: '', t: 's' }));

  // 2. Table Header Rows
  const row9 = new Array(14).fill(null);
  row9[0] = { v: '', t: 's' };
  row9[1] = { v: 'No.', t: 's', s: rekapHeaderStyle };
  row9[2] = { v: 'NAMA ALAT', t: 's', s: rekapHeaderStyle };
  row9[3] = { v: 'PO', t: 's', s: rekapHeaderStyle };
  row9[4] = { v: 'REALISASI', t: 's', s: rekapHeaderStyle };
  for (let c = 5; c <= 10; c++) row9[c] = { v: '', t: 's', s: rekapHeaderStyle };
  row9[11] = { v: 'TOTAL', t: 's', s: rekapHeaderStyle };
  row9[12] = { v: 'SISA', t: 's', s: rekapHeaderStyle };
  row9[13] = { v: 'KETERANGAN', t: 's', s: rekapHeaderStyle };
  aoa.push(row9);

  const row10 = new Array(14).fill(null);
  row10[0] = { v: '', t: 's' };
  row10[1] = { v: '', t: 's', s: rekapHeaderStyle };
  row10[2] = { v: '', t: 's', s: rekapHeaderStyle };
  row10[3] = { v: '', t: 's', s: rekapHeaderStyle };
  for (let c = 4; c <= 10; c++) {
    row10[c] = { v: dateCols[c - 4], t: 's', s: rekapHeaderStyle };
  }
  row10[11] = { v: '', t: 's', s: rekapHeaderStyle };
  row10[12] = { v: '', t: 's', s: rekapHeaderStyle };
  row10[13] = { v: '', t: 's', s: rekapHeaderStyle };
  aoa.push(row10);

  // 3. Table Data Rows
  const dataStartRowIdx = 10;
  const effectiveItems = items || [];
  const itemCount = effectiveItems.length;
  const numRowsToRender = itemCount > 0 ? itemCount : (isNonPo ? 10 : 0);

  let grandPoQty = 0;
  const grandDateSums = new Array(7).fill(0);
  let grandTotal = 0;
  let grandSisa = 0;

  for (let i = 0; i < numRowsToRender; i++) {
    const rIdx = dataStartRowIdx + i;
    const rowNum = rIdx + 1;
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

  jumlahRowArr[1] = { v: 'JUMLAH', t: 's', s: rekapJumlahStyle };
  jumlahRowArr[2] = { v: '', t: 's', s: rekapJumlahStyle };

  if (numRowsToRender > 0) {
    jumlahRowArr[3] = { f: `SUM(D${firstDataRowNum}:D${lastDataRowNum})`, v: grandPoQty || 0, t: 'n', s: rekapJumlahStyle };
    for (let c = 4; c <= 10; c++) {
      const colLetter = getColumnLetter(c);
      const dSum = grandDateSums[c - 4];
      jumlahRowArr[c] = { f: `SUM(${colLetter}${firstDataRowNum}:${colLetter}${lastDataRowNum})`, v: dSum || 0, t: 'n', s: rekapJumlahStyle };
    }
    jumlahRowArr[11] = { f: `SUM(L${firstDataRowNum}:L${lastDataRowNum})`, v: grandTotal || 0, t: 'n', s: rekapJumlahStyle };
    jumlahRowArr[12] = { f: `SUM(M${firstDataRowNum}:M${lastDataRowNum})`, v: grandSisa || 0, t: 'n', s: rekapJumlahStyle };
    jumlahRowArr[13] = { v: '', t: 's', s: rekapJumlahStyle };
  } else {
    jumlahRowArr[3] = { v: 0, t: 'n', s: rekapJumlahStyle };
    for (let c = 4; c <= 10; c++) jumlahRowArr[c] = { v: 0, t: 'n', s: rekapJumlahStyle };
    jumlahRowArr[11] = { v: 0, t: 'n', s: rekapJumlahStyle };
    jumlahRowArr[12] = { v: 0, t: 'n', s: rekapJumlahStyle };
    jumlahRowArr[13] = { v: '', t: 's', s: rekapJumlahStyle };
  }

  aoa.push(jumlahRowArr);

  // 5. Blank row & Signatures
  aoa.push(new Array(14).fill({ v: '', t: 's' }));
  
  const techRow = new Array(14).fill({ v: '', t: 's' });
  techRow[2] = { v: 'Di Isi Oleh Teknisi Lapangan', t: 's', s: { font: { name: 'Calibri', sz: 12, italic: true } } };
  aoa.push(techRow);

  const adminRow = new Array(14).fill({ v: '', t: 's' });
  adminRow[2] = { v: 'Di Isi Oleh Admin', t: 's', s: { font: { name: 'Calibri', sz: 12, italic: true } } };
  aoa.push(adminRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

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

    { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } },
    { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } },
    { s: { r: 8, c: 3 }, e: { r: 9, c: 3 } },
    { s: { r: 8, c: 4 }, e: { r: 8, c: 10 } },
    { s: { r: 8, c: 11 }, e: { r: 9, c: 11 } },
    { s: { r: 8, c: 12 }, e: { r: 9, c: 12 } },
    { s: { r: 8, c: 13 }, e: { r: 9, c: 13 } },

    { s: { r: jumlahRowIdx, c: 1 }, e: { r: jumlahRowIdx, c: 2 } }
  ];

  ws['!merges'] = merges;

  ws['!cols'] = [
    { wch: 3 },
    { wch: 6 },
    { wch: 38 },
    { wch: 3.5 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 8 },
    { wch: 16 }
  ];

  ws['!margins'] = {
    left: 0.35,
    right: 0.35,
    top: 1.2,
    bottom: 0.6,
    header: 0.3,
    footer: 0.3
  };

  ws['!printOptions'] = {
    horizontalCentered: true,
    hcenter: true
  };

  ws['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    hcenter: 1
  };

  return ws;
}

/**
 * Builds Official "Berita Acara Pekerjaan" Document Worksheet for Sheet "BAP" and "BAP Non PO"
 */
function buildBapDocWorksheet(bap: BapDocument, items: BapItem[], isNonPo: boolean, leadTechName?: string): XLSX.WorkSheet {
  const targetSheetName = isNonPo ? 'Rekap Non PO' : 'Rekap';

  const docTitleStyle = {
    font: { bold: true, underline: true, name: 'Calibri', sz: 12 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const docSubTitleStyle = {
    font: { bold: true, italic: true, name: 'Calibri', sz: 12 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const paragraphStyle = {
    font: { name: 'Calibri', sz: 12 },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  };

  const poNumber = isNonPo ? (bap.nonPoHeader?.sphNumber || bap.sphNumber) : (bap.sphNumber || '');
  const poDateStr = isNonPo ? (bap.nonPoHeader?.poDate || bap.poDate) : (bap.poDate || '');
  const bapNum = isNonPo ? (bap.nonPoHeader?.bastpNumber || bap.bapNumber || poNumber) : (bap.bapNumber || poNumber);
  const bapNumberText = formatBapNumber(bapNum || poNumber);
  const openingPara = formatBapOpeningParagraph(poDateStr);

  const aoa: any[][] = [];

  // Row 1: Document Title (BERITA ACARA PEKERJAAN)
  const r1 = new Array(10).fill(null);
  r1[0] = { v: '', t: 's' };
  r1[1] = { v: 'BERITA ACARA PEKERJAAN', t: 's', s: docTitleStyle };
  for (let c = 2; c <= 8; c++) r1[c] = { v: '', t: 's', s: docTitleStyle };
  aoa.push(r1);

  // Row 2: Document Number (Italic as requested)
  const r2 = new Array(10).fill(null);
  r2[0] = { v: '', t: 's' };
  r2[1] = { v: bapNumberText, t: 's', s: docSubTitleStyle };
  for (let c = 2; c <= 8; c++) r2[c] = { v: '', t: 's', s: docSubTitleStyle };
  aoa.push(r2);

  // Row 3: Blank
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Row 4 & Row 5: Opening Paragraph with TAB indentation and bolded day, date, month, year
  const r4 = new Array(10).fill(null);
  r4[0] = { v: '', t: 's' };
  r4[1] = { 
    v: openingPara.text, 
    t: 's', 
    s: paragraphStyle,
    r: openingPara.richText 
  };
  for (let c = 2; c <= 8; c++) r4[c] = { v: '', t: 's', s: paragraphStyle };
  aoa.push(r4);

  const r5 = new Array(10).fill(null);
  for (let c = 0; c <= 8; c++) r5[c] = { v: '', t: 's', s: paragraphStyle };
  aoa.push(r5);

  // Row 6: Blank
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Rows 7..11: Header Info (5 lines)
  // Replaced "Nama RS." with "Nama Pelanggan", "No. PO/Kontrol" with "No. PO/Kontrak"
  const infoLabels = [
    'Nama Pelanggan',
    'No. PO/Kontrak',
    'Tanggal PO',
    'Alamat',
    'Kota/Kab.'
  ];

  const rawAddress = isNonPo
    ? (bap.nonPoHeader?.address || bap.address || '')
    : (bap.address || '');

  const rawCity = isNonPo
    ? (bap.nonPoHeader?.cityDistrict || bap.cityDistrict || '')
    : (bap.cityDistrict || '');

  const parsed = parseAddressAndCity(rawAddress, rawCity);

  for (let r = 0; r < 5; r++) {
    const rekapRowIdx = r + 1; // 1-indexed row in Rekap sheet
    const rowArr = new Array(10).fill(null);
    rowArr[0] = { v: '', t: 's' };
    rowArr[1] = { v: infoLabels[r], t: 's', s: infoLabelStyle };
    rowArr[2] = { v: '', t: 's', s: infoLabelStyle }; // Merged B..C
    rowArr[3] = { v: ':', t: 's', s: infoColonStyle }; // Col D

    let cachedVal = '';
    if (!isNonPo) {
      if (r === 0) cachedVal = bap.customerName || (bap as any).hospitalName || '';
      else if (r === 1) cachedVal = bap.sphNumber || '';
      else if (r === 2) cachedVal = bap.poDate || '';
      else if (r === 3) cachedVal = parsed.address;
      else if (r === 4) cachedVal = parsed.cityDistrict;
    } else {
      if (r === 0) cachedVal = bap.nonPoHeader?.customerName || bap.customerName || (bap as any).hospitalName || '';
      else if (r === 1) cachedVal = bap.nonPoHeader?.sphNumber || bap.sphNumber || '';
      else if (r === 2) cachedVal = bap.nonPoHeader?.poDate || bap.poDate || '';
      else if (r === 3) cachedVal = parsed.address;
      else if (r === 4) cachedVal = parsed.cityDistrict;
    }

    rowArr[4] = { f: `'${targetSheetName}'!E${rekapRowIdx}`, v: cachedVal, t: 's', s: infoValueStyle };
    for (let c = 5; c <= 8; c++) rowArr[c] = { v: '', t: 's', s: infoValueStyle };

    aoa.push(rowArr);
  }

  // Row 12: Blank
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Row 13: Table Header (Data Alat) - Blue Header, White Text, Thin Borders
  const r13 = new Array(10).fill(null);
  r13[0] = { v: '', t: 's' };
  r13[1] = { v: 'No', t: 's', s: blueHeaderStyle };
  r13[2] = { v: 'Nama Alat', t: 's', s: blueHeaderStyle };
  r13[3] = { v: '', t: 's', s: blueHeaderStyle }; // Part of C..E merge
  r13[4] = { v: '', t: 's', s: blueHeaderStyle }; // Part of C..E merge
  r13[5] = { v: 'Volume PO', t: 's', s: blueHeaderStyle };
  r13[6] = { v: 'Volume Realisasi', t: 's', s: blueHeaderStyle };
  r13[7] = { v: 'Volume Sisa', t: 's', s: blueHeaderStyle };
  r13[8] = { v: 'Keterangan', t: 's', s: blueHeaderStyle };
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
    const docRowNum = 14 + i;
    const docRowIdx = 13 + i;
    const rekapRowNum = 11 + i;
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

    rowArr[1] = { f: `'${targetSheetName}'!B${rekapRowNum}`, v: noVal, t: typeof noVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    rowArr[2] = { f: `'${targetSheetName}'!C${rekapRowNum}`, v: namaVal, t: 's', s: dataStyleLeft };
    rowArr[3] = { v: '', t: 's', s: dataStyleLeft };
    rowArr[4] = { v: '', t: 's', s: dataStyleLeft };

    rowArr[5] = { f: `'${targetSheetName}'!D${rekapRowNum}`, v: poVal, t: typeof poVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    rowArr[6] = { f: `'${targetSheetName}'!L${rekapRowNum}`, v: realisasiVal, t: typeof realisasiVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    rowArr[7] = { f: `IF(C${docRowNum}="","",F${docRowNum}-G${docRowNum})`, v: sisaVal, t: typeof sisaVal === 'number' ? 'n' : 's', s: dataStyleCenter };
    rowArr[8] = { f: `IF(C${docRowNum}="","",IF(H${docRowNum}=0,"Selesai","Batal"))`, v: ketVal, t: 's', s: dataStyleCenter };

    aoa.push(rowArr);
    dataRowMerges.push({ s: { r: docRowIdx, c: 2 }, e: { r: docRowIdx, c: 4 } });
  }

  // 1 Empty Blank Row before Total Unit Row (as requested)
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Row "TOTAL UNIT" - Blue Row, White Text
  const totalRowIdx = 13 + numRowsToRender + 1; // +1 for the blank row
  const firstDataRow = 14;
  const lastDataRow = 13 + numRowsToRender;

  const totalRowArr = new Array(10).fill(null);
  totalRowArr[0] = { v: '', t: 's' };
  totalRowArr[1] = { v: 'TOTAL UNIT', t: 's', s: blueTotalStyle };
  totalRowArr[2] = { v: '', t: 's', s: blueTotalStyle };
  totalRowArr[3] = { v: '', t: 's', s: blueTotalStyle };
  totalRowArr[4] = { v: '', t: 's', s: blueTotalStyle };

  if (numRowsToRender > 0) {
    totalRowArr[5] = { f: `SUM(F${firstDataRow}:F${lastDataRow})`, v: grandPoQty || 0, t: 'n', s: blueTotalStyle };
    totalRowArr[6] = { f: `SUM(G${firstDataRow}:G${lastDataRow})`, v: grandRealisasi || 0, t: 'n', s: blueTotalStyle };
    totalRowArr[7] = { f: `SUM(H${firstDataRow}:H${lastDataRow})`, v: grandSisa || 0, t: 'n', s: blueTotalStyle };
    totalRowArr[8] = { v: '', t: 's', s: blueTotalStyle };
  } else {
    totalRowArr[5] = { v: 0, t: 'n', s: blueTotalStyle };
    totalRowArr[6] = { v: 0, t: 'n', s: blueTotalStyle };
    totalRowArr[7] = { v: 0, t: 'n', s: blueTotalStyle };
    totalRowArr[8] = { v: '', t: 's', s: blueTotalStyle };
  }

  aoa.push(totalRowArr);

  // 3 Blank rows for clear vertical separation below table
  aoa.push(new Array(10).fill({ v: '', t: 's' }));
  aoa.push(new Array(10).fill({ v: '', t: 's' }));
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // City and Date Line below Total Unit (e.g. "Surakarta, 18 September 2026")
  let cityName = 'Surakarta';
  if (parsed.cityDistrict) {
    const cityMatch = parsed.cityDistrict.match(/(Surakarta|Semarang|Yogyakarta|Jakarta|Bandung|Surabaya|Kab\.\s*[^\s,]+|Kota\s*[^\s,]+)/i);
    if (cityMatch) cityName = cityMatch[1].replace(/^(Kota|Kab\.)\s*/i, '');
  }

  const dateLineText = `${cityName}, ${openingPara.dateNum} ${openingPara.monthName} ${openingPara.yearNum}`;
  const dateRow = new Array(10).fill(null);
  dateRow[0] = { v: '', t: 's' };
  dateRow[1] = { v: '', t: 's' };
  dateRow[2] = { v: '', t: 's' };
  dateRow[3] = { v: '', t: 's' };
  dateRow[4] = { v: '', t: 's' };
  dateRow[5] = { v: dateLineText, t: 's', s: { font: { name: 'Calibri', sz: 12 }, alignment: { horizontal: 'center' } } };
  dateRow[6] = { v: '', t: 's' };
  dateRow[7] = { v: '', t: 's' };
  dateRow[8] = { v: '', t: 's' };

  const dateRowIdx = aoa.length;
  aoa.push(dateRow);

  // Blank row before signature section header
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Signature Section
  const customerNameText = isNonPo
    ? (bap.nonPoHeader?.customerName || 'Pihak Rumah Sakit / Customer')
    : (bap.customerName || 'Pihak Rumah Sakit / Customer');

  const sigHeader = new Array(10).fill(null);
  sigHeader[0] = { v: '', t: 's' };
  sigHeader[1] = { v: customerNameText, t: 's', s: { font: { bold: true, name: 'Calibri', sz: 12 }, alignment: { horizontal: 'center' } } };
  sigHeader[2] = { v: '', t: 's' };
  sigHeader[3] = { v: '', t: 's' };
  sigHeader[4] = { v: '', t: 's' };
  sigHeader[5] = { v: 'PT. SARANA MULTI KALIBRASI', t: 's', s: { font: { bold: true, name: 'Calibri', sz: 12 }, alignment: { horizontal: 'center' } } };
  sigHeader[6] = { v: '', t: 's' };
  sigHeader[7] = { v: '', t: 's' };
  sigHeader[8] = { v: '', t: 's' };

  const sigHeaderIdx = aoa.length;
  aoa.push(sigHeader);

  // 5 Blank rows for widened signature gap
  aoa.push(new Array(10).fill({ v: '', t: 's' }));
  aoa.push(new Array(10).fill({ v: '', t: 's' }));
  aoa.push(new Array(10).fill({ v: '', t: 's' }));
  aoa.push(new Array(10).fill({ v: '', t: 's' }));
  aoa.push(new Array(10).fill({ v: '', t: 's' }));

  // Signature Line (Lead Technician name if provided, or underline)
  const effectiveLeadTech = leadTechName || bap.technicianName || '';

  const sigLine = new Array(10).fill(null);
  sigLine[0] = { v: '', t: 's' };
  sigLine[1] = { v: '( _________________________ )', t: 's', s: { font: { name: 'Calibri', sz: 12 }, alignment: { horizontal: 'center' } } };
  sigLine[2] = { v: '', t: 's' };
  sigLine[3] = { v: '', t: 's' };
  sigLine[4] = { v: '', t: 's' };
  sigLine[5] = { 
    v: effectiveLeadTech ? `( ${effectiveLeadTech} )` : '( _________________________ )', 
    t: 's', 
    s: { font: { bold: true, name: 'Calibri', sz: 12 }, alignment: { horizontal: 'center' } } 
  };
  sigLine[6] = { v: '', t: 's' };
  sigLine[7] = { v: '', t: 's' };
  sigLine[8] = { v: '', t: 's' };

  const sigLineIdx = aoa.length;
  aoa.push(sigLine);

  // Signature Role Label
  const sigRole = new Array(10).fill(null);
  sigRole[0] = { v: '', t: 's' };
  sigRole[1] = { v: 'Teknisi / User RS', t: 's', s: { font: { name: 'Calibri', sz: 12, italic: true }, alignment: { horizontal: 'center' } } };
  sigRole[2] = { v: '', t: 's' };
  sigRole[3] = { v: '', t: 's' };
  sigRole[4] = { v: '', t: 's' };
  sigRole[5] = { v: effectiveLeadTech ? 'Lead Teknisi SMK' : 'Teknisi SMK', t: 's', s: { font: { name: 'Calibri', sz: 12, italic: true }, alignment: { horizontal: 'center' } } };
  sigRole[6] = { v: '', t: 's' };
  sigRole[7] = { v: '', t: 's' };
  sigRole[8] = { v: '', t: 's' };

  const sigRoleIdx = aoa.length;
  aoa.push(sigRole);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

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

    // Date Line Merge F..I
    { s: { r: dateRowIdx, c: 5 }, e: { r: dateRowIdx, c: 8 } },

    // Signature Block Merges
    { s: { r: sigHeaderIdx, c: 1 }, e: { r: sigHeaderIdx, c: 4 } },
    { s: { r: sigHeaderIdx, c: 5 }, e: { r: sigHeaderIdx, c: 8 } },

    { s: { r: sigLineIdx, c: 1 }, e: { r: sigLineIdx, c: 4 } },
    { s: { r: sigLineIdx, c: 5 }, e: { r: sigLineIdx, c: 8 } },

    { s: { r: sigRoleIdx, c: 1 }, e: { r: sigRoleIdx, c: 4 } },
    { s: { r: sigRoleIdx, c: 5 }, e: { r: sigRoleIdx, c: 8 } }
  ];

  ws['!merges'] = merges;

  // Optimized Column Widths for 1-Page Horizontal Print Preview (A4 Portrait)
  ws['!cols'] = [
    { wch: 0.5 }, // Col A
    { wch: 5 },   // Col B: No
    { wch: 26 },  // Col C: Part 1 of Nama Alat C..E
    { wch: 3 },   // Col D: Colon ":" / Part 2 of Nama Alat C..E
    { wch: 15 },  // Col E: Part 2 of Value E..I / Part 3 of Nama Alat C..E
    { wch: 8.5 }, // Col F: Volume PO
    { wch: 8.5 }, // Col G: Volume Realisasi
    { wch: 8.5 }, // Col H: Volume Sisa
    { wch: 12.5 } // Col I: Keterangan
  ];

  ws['!margins'] = {
    left: 0.35,
    right: 0.35,
    top: 1.2,
    bottom: 0.6,
    header: 0.3,
    footer: 0.3
  };

  ws['!printOptions'] = {
    horizontalCentered: true,
    hcenter: true
  };

  ws['!pageSetup'] = {
    orientation: 'portrait',
    paperSize: 9,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    hcenter: 1
  };

  return ws;
}

/**
 * Export 4-Sheet BAP document to Excel (.xlsx)
 */
export function exportBapToExcel(bap: BapDocument, options?: { leadTechnicianName?: string }) {
  const wb = XLSX.utils.book_new();

  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.WBProps) wb.Workbook.WBProps = {};
  (wb.Workbook.WBProps as any).fullCalcOnLoad = true;

  const leadTechName = options?.leadTechnicianName || bap.technicianName;

  // 1. Sheet "Rekap"
  const wsRekap = buildRekapWorksheet(bap, bap.items, false);
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap');

  // 2. Sheet "BAP" (Official Berita Acara Pekerjaan document)
  const wsBap = buildBapDocWorksheet(bap, bap.items, false, leadTechName);
  XLSX.utils.book_append_sheet(wb, wsBap, 'BAP');

  // 3. Sheet "Rekap Non PO"
  const wsRekapNonPo = buildRekapWorksheet(bap, bap.nonPoItems, true);
  XLSX.utils.book_append_sheet(wb, wsRekapNonPo, 'Rekap Non PO');

  // 4. Sheet "BAP Non PO" (Official Berita Acara Pekerjaan document for Non PO items)
  const wsBapNonPo = buildBapDocWorksheet(bap, bap.nonPoItems, true, leadTechName);
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

