import * as XLSXModule from 'xlsx';
const XLSX = (XLSXModule as any).default || XLSXModule;
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getLocalBlob } from './localBlobStorage';

export interface ExcelCellData {
  value: any;
  formula?: string;
  type?: string;
}

export interface ExcelSheetData {
  name: string;
  data: any[][];
}

/**
 * Extracts placeholders (e.g. {{NAMA_RS}}, {{NOMOR_BAP}}, {{hospitalName}}) from an Excel (.xlsx / .xls) workbook array buffer
 */
export function extractPlaceholdersFromExcel(arrayBuffer: ArrayBuffer): string[] {
  const placeholders = new Set<string>();
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;
      
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = sheet[cellAddress];
          if (cell && cell.v !== undefined && cell.v !== null) {
            const strVal = String(cell.v);
            const matches = strVal.matchAll(/\{\{([A-Za-z0-9_.\-]+)\}\}/g);
            for (const match of matches) {
              placeholders.add(match[0]);
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error extracting placeholders from Excel:', error);
  }
  return Array.from(placeholders);
}

/**
 * Replaces placeholders in an Excel template and returns the modified workbook as an ArrayBuffer
 */
export function fillExcelTemplate(
  arrayBuffer: ArrayBuffer,
  data: Record<string, any>,
  mappings?: Record<string, string>
): ArrayBuffer {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Build lookup mapping dictionary
  const dictionary: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      dictionary[key] = val.map((v, i) => {
        if (typeof v === 'object' && v !== null) {
          return `${i + 1}. ` + Object.entries(v)
            .filter(([k]) => k !== 'id')
            .map(([k, subv]) => `${subv}`)
            .join(' | ');
        }
        return `${i + 1}. ${v}`;
      }).join('\n');
    } else {
      dictionary[key] = val !== undefined && val !== null ? String(val) : '';
    }
  }

  if (mappings) {
    for (const [token, systemKey] of Object.entries(mappings)) {
      const targetVal = dictionary[systemKey] ?? (data[systemKey] !== undefined ? String(data[systemKey]) : '');
      dictionary[token] = targetVal;
      const bareToken = token.replace(/[{}]/g, '').trim();
      dictionary[bareToken] = targetVal;
      dictionary[`{{${bareToken}}}`] = targetVal;
    }
  }

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];
        if (cell && cell.v !== undefined && cell.v !== null) {
          let strVal = String(cell.v);
          let modified = false;

          for (const [token, replacement] of Object.entries(dictionary)) {
            if (!token) continue;
            if (strVal.includes(token)) {
              strVal = strVal.split(token).join(String(replacement));
              modified = true;
            }
          }

          if (modified) {
            cell.v = strVal;
            if (cell.w) delete cell.w; // force recalculation of formatted text
            if (cell.t === 's' || typeof strVal === 'string') {
              cell.t = 's';
            }
          }
        }
      }
    }
  });

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return out;
}

/**
 * Converts populated Excel workbook data directly into a clean, formatted PDF document with standard A4 layout.
 * Supports letterhead (KOP) overlay if provided!
 */
export async function convertExcelToPdfBytes(
  excelArrayBuffer: ArrayBuffer,
  letterheadPdfUrl?: string | null,
  docTitle: string = 'DOKUMEN BERITA ACARA'
): Promise<Uint8Array> {
  const workbook = XLSX.read(excelArrayBuffer, { type: 'array' });
  const pdfDoc = await PDFDocument.create();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // If letterhead PDF or image is provided, load to use as background
  let letterheadPdfDoc: PDFDocument | null = null;
  let letterheadImg: any = null;
  if (letterheadPdfUrl) {
    try {
      const resolvedLhUrl = letterheadPdfUrl.startsWith('idb://') 
        ? await getLocalBlob(letterheadPdfUrl) 
        : letterheadPdfUrl;

      let lhBuffer: ArrayBuffer;
      if (resolvedLhUrl.startsWith('data:')) {
        const base64 = resolvedLhUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        lhBuffer = bytes.buffer;
      } else {
        const res = await fetch(resolvedLhUrl);
        lhBuffer = await res.arrayBuffer();
      }

      const isPng = resolvedLhUrl.startsWith('data:image/png') || resolvedLhUrl.endsWith('.png');
      const isJpg = resolvedLhUrl.startsWith('data:image/jpeg') || resolvedLhUrl.startsWith('data:image/jpg') || resolvedLhUrl.endsWith('.jpg') || resolvedLhUrl.endsWith('.jpeg');
      const isImg = isPng || isJpg || resolvedLhUrl.startsWith('data:image/');

      if (isImg) {
        try {
          letterheadImg = isPng ? await pdfDoc.embedPng(lhBuffer) : await pdfDoc.embedJpg(lhBuffer);
        } catch {
          try {
            letterheadImg = await pdfDoc.embedPng(lhBuffer);
          } catch {
            letterheadImg = await pdfDoc.embedJpg(lhBuffer);
          }
        }
      } else {
        letterheadPdfDoc = await PDFDocument.load(lhBuffer, { ignoreEncryption: true });
      }
    } catch (e) {
      console.warn('Could not load letterhead for Excel converter:', e);
    }
  }

  // Iterate over each sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to JSON rows
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    // Calculate column widths
    const maxCols = Math.min(10, Math.max(...rows.map(r => r.length)));
    const pageW = 595.28; // A4 portrait width
    const pageH = 841.89; // A4 portrait height
    const marginX = 40;
    const contentW = pageW - (marginX * 2);

    // Compute relative column widths
    const colWidths: number[] = new Array(maxCols).fill(contentW / maxCols);
    // Give 1st column smaller width if it's "No"
    if (maxCols > 2) {
      colWidths[0] = 32;
      const remainingW = contentW - 32;
      for (let c = 1; c < maxCols; c++) {
        colWidths[c] = remainingW / (maxCols - 1);
      }
    }

    let page = pdfDoc.addPage([pageW, pageH]);
    let currentY = pageH - 45;

    // Overlay letterhead background if available
    if (letterheadImg) {
      const aspect = letterheadImg.width / letterheadImg.height;
      if (aspect < 0.8) {
        // Full page A4 letterhead
        page.drawImage(letterheadImg, { x: 0, y: 0, width: pageW, height: pageH });
        currentY = pageH - 125;
      } else {
        // Top banner letterhead
        const bannerH = pageW / aspect;
        page.drawImage(letterheadImg, { x: 0, y: pageH - bannerH, width: pageW, height: bannerH });
        currentY = pageH - bannerH - 15;
      }
    } else if (letterheadPdfDoc && letterheadPdfDoc.getPageCount() > 0) {
      try {
        const [embeddedLh] = await pdfDoc.embedPdf(letterheadPdfDoc, [0]);
        page.drawPage(embeddedLh, {
          x: 0,
          y: 0,
          width: pageW,
          height: pageH
        });
        currentY = pageH - 125; // Leave space below letterhead header
      } catch (e) {
        console.warn('Could not embed letterhead page:', e);
      }
    } else {
      // Default PT. SMK Header if no letterhead
      page.drawText('PT. SARANA MULTI KALIBRASI', { x: marginX, y: currentY, size: 14, font: fontBold, color: rgb(0.11, 0.40, 0.55) });
      currentY -= 16;
      page.drawText('Laboratorium Pengujian & Kalibrasi Alat Kesehatan • No. LK-532-IDN', { x: marginX, y: currentY, size: 8.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
      currentY -= 14;
      page.drawLine({ start: { x: marginX, y: currentY }, end: { x: pageW - marginX, y: currentY }, thickness: 1.5, color: rgb(0.11, 0.40, 0.55) });
      currentY -= 15;
    }

    // Title of Sheet / Document
    page.drawText(sheetName.toUpperCase() || docTitle, {
      x: marginX,
      y: currentY,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1)
    });
    currentY -= 18;

    // Render Table Rows
    const rowHeight = 18;
    const bottomMargin = 55;

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      // Check if we need a new page
      if (currentY - rowHeight < bottomMargin) {
        page = pdfDoc.addPage([pageW, pageH]);
        currentY = pageH - 60;
        if (letterheadPdfDoc && letterheadPdfDoc.getPageCount() > 0) {
          try {
            const [embeddedLh] = await pdfDoc.embedPdf(letterheadPdfDoc, [0]);
            page.drawPage(embeddedLh, { x: 0, y: 0, width: pageW, height: pageH });
            currentY = pageH - 125;
          } catch {}
        }
      }

      const isHeaderRow = rIdx === 0 || (rIdx === 1 && String(rows[0][0] || '').length < 3);

      // Draw row background for header
      if (isHeaderRow) {
        page.drawRectangle({
          x: marginX,
          y: currentY - 4,
          width: contentW,
          height: rowHeight,
          color: rgb(0.92, 0.96, 0.98),
          borderColor: rgb(0.75, 0.82, 0.88),
          borderWidth: 0.5
        });
      } else {
        page.drawLine({
          start: { x: marginX, y: currentY - 4 },
          end: { x: marginX + contentW, y: currentY - 4 },
          thickness: 0.5,
          color: rgb(0.88, 0.88, 0.88)
        });
      }

      let curX = marginX;
      for (let cIdx = 0; cIdx < maxCols; cIdx++) {
        const colW = colWidths[cIdx];
        const val = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : '';
        if (val) {
          // Truncate text if too long for column
          const maxChars = Math.max(5, Math.floor(colW / 5.2));
          const displayVal = val.length > maxChars ? val.substring(0, maxChars - 3) + '...' : val;

          page.drawText(displayVal, {
            x: curX + 4,
            y: currentY,
            size: isHeaderRow ? 8.5 : 8,
            font: isHeaderRow ? fontBold : fontRegular,
            color: isHeaderRow ? rgb(0.11, 0.40, 0.55) : rgb(0.15, 0.15, 0.15)
          });
        }
        curX += colW;
      }

      currentY -= rowHeight;
    }
  }

  return await pdfDoc.save();
}
