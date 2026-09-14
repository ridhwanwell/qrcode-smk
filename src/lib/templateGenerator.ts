import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { PDFDocument, PDFRawStream, StandardFonts, rgb } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import * as pako from 'pako';
import { fillExcelTemplate, convertExcelToPdfBytes, extractPlaceholdersFromExcel } from './excelTemplateService';

// Cached font buffers for consistent Calibri / Carlito rendering across all PDF generations
let cachedCarlitoRegular: Uint8Array | null = null;
let cachedCarlitoBold: Uint8Array | null = null;
let cachedCarlitoItalic: Uint8Array | null = null;
let cachedCarlitoBoldItalic: Uint8Array | null = null;

async function fetchFontBytes(urls: string[]): Promise<Uint8Array | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf && buf.byteLength > 1000) {
          return new Uint8Array(buf);
        }
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

/**
 * Extracts Google Drive File ID from various Google Drive / Docs / Sheets / Slides link formats.
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  return null;
}

/**
 * Transforms a Google Drive view URL into a direct download / PDF export stream URL.
 */
export function transformGoogleDriveUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('docs.google.com/document/d/')) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) return `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
  }

  if (url.includes('docs.google.com/spreadsheets/d/')) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
  }

  if (url.includes('drive.google.com')) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  return url;
}

import { getLocalBlob } from './localBlobStorage';
import { resolveActiveKopSuratPdfBytes } from './kopSuratService';

/**
 * Downloads a file as an array buffer with Google Drive support and HTML response detection.
 */
export async function fetchFile(rawUrl: string): Promise<ArrayBuffer> {
  const url = rawUrl.startsWith('idb://') ? await getLocalBlob(rawUrl) : rawUrl;

  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const fileId = extractGoogleDriveFileId(url);
  const candidates: string[] = [];

  if (fileId) {
    // 1. Direct Google CDN endpoint (works for many publicly shared Google Drive files)
    candidates.push(`https://lh3.googleusercontent.com/d/${fileId}`);
    // 2. Google Docs PDF export
    if (url.includes('docs.google.com/document')) {
      candidates.push(`https://docs.google.com/document/d/${fileId}/export?format=pdf`);
    }
    // 3. Google Sheets XLSX export
    if (url.includes('docs.google.com/spreadsheets')) {
      candidates.push(`https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`);
    }
    // 4. Standard uc export
    candidates.push(`https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`);
    candidates.push(`https://docs.google.com/uc?export=download&id=${fileId}&confirm=t`);
    // 5. CORS proxies as high-reliability fallbacks
    candidates.push(`https://corsproxy.io/?${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`)}`);
    candidates.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`)}`);
  } else {
    candidates.push(transformGoogleDriveUrl(url));
    if (transformGoogleDriveUrl(url) !== url) {
      candidates.push(url);
    }
  }

  let lastError: any = null;

  for (const targetUrl of candidates) {
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      if (!buffer || buffer.byteLength < 50) continue;

      // Inspect first 300 bytes for HTML response
      const headerText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer.slice(0, 300))).trim();
      const isHtml = 
        headerText.toLowerCase().includes('<!doctype html') || 
        headerText.toLowerCase().includes('<html') || 
        headerText.toLowerCase().includes('google drive -');

      if (!isHtml) {
        return buffer; // Successfully fetched actual binary PDF/DOCX/XLSX!
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (fileId) {
    throw new Error(`LINK_GOOGLE_DRIVE_HTML:${fileId}`);
  }

  throw lastError || new Error(`Gagal mengunduh file template dari URL.`);
}

/**
 * Helper: Convert string to uppercase hex
 */
function textToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex.toUpperCase();
}

/**
 * Helper: Convert hex string to text
 */
function hexToText(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

/**
 * Extracts placeholders from an uploaded PDF or Excel template.
 */
export async function extractPlaceholdersFromTemplate(arrayBuffer: ArrayBuffer, fileName: string = ''): Promise<string[]> {
  const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
  if (isExcel) {
    return extractPlaceholdersFromExcel(arrayBuffer);
  }
  return extractPlaceholdersFromPdf(arrayBuffer);
}

/**
 * Extracts placeholders from an uploaded PDF template.
 * Scans both AcroForm text fields and content stream text patterns like {{FIELD_NAME}}.
 */
export async function extractPlaceholdersFromPdf(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const placeholders = new Set<string>();

  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    // 1. Scan AcroForm form fields
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      fields.forEach(field => {
        const name = field.getName().trim();
        if (name) {
          placeholders.add(name);
        }
      });
    } catch {
      // Form may not exist in non-interactive PDFs
    }

    // 2. Scan Page Content Streams for {{...}} patterns
    const pageCount = pdfDoc.getPageCount();
    for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
      const page = pdfDoc.getPage(pageIdx);
      const contents = page.node.Contents();
      if (!contents) continue;

      const streamRefs = (contents as any).asArray
        ? Array.from({ length: (contents as any).size() }, (_, i) => (contents as any).get(i))
        : [contents];

      for (const ref of streamRefs) {
        try {
          const streamObj = pdfDoc.context.lookup(ref) as any;
          if (!streamObj || typeof streamObj.getContents !== 'function') continue;

          const rawBytes: Uint8Array = streamObj.getContents();
          let decodedText = '';

          try {
            decodedText = new TextDecoder('utf-8', { fatal: false }).decode(pako.inflate(rawBytes));
          } catch {
            decodedText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);
          }

          // A. Scan literal strings ( ... )
          const literalMatches = decodedText.matchAll(/\{\{([A-Za-z0-9_.\-]+)\}\}/g);
          for (const match of literalMatches) {
            placeholders.add(match[0]);
          }

          // B. Scan hex strings < ... >
          const hexMatches = decodedText.matchAll(/<([0-9a-fA-F\s]+)>/g);
          for (const hexMatch of hexMatches) {
            const cleanHex = hexMatch[1].replace(/\s+/g, '');
            if (cleanHex.length % 2 === 0) {
              const textFromHex = hexToText(cleanHex);
              const hexTokenMatches = textFromHex.matchAll(/\{\{([A-Za-z0-9_.\-]+)\}\}/g);
              for (const hMatch of hexTokenMatches) {
                placeholders.add(hMatch[0]);
              }
            }
          }
        } catch (streamErr) {
          console.warn('Could not inspect stream:', streamErr);
        }
      }
    }
  } catch (error) {
    console.error('Error scanning PDF placeholders:', error);
  }

  return Array.from(placeholders);
}

/**
 * Builds a replacement map from user mappings and data
 */
function buildReplacementDictionary(data: Record<string, any>, mappings?: Record<string, string>): Record<string, string> {
  const dictionary: Record<string, string> = {};

  // Direct data stringification
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

  // Apply custom mappings: token -> systemKey
  if (mappings) {
    for (const [token, systemKey] of Object.entries(mappings)) {
      const targetVal = dictionary[systemKey] ?? (data[systemKey] !== undefined ? String(data[systemKey]) : '');
      dictionary[token] = targetVal;

      // Also support versions with and without curly braces
      const bareToken = token.replace(/[{}]/g, '').trim();
      dictionary[bareToken] = targetVal;
      dictionary[`{{${bareToken}}}`] = targetVal;
    }
  }

  return dictionary;
}

/**
 * Helper to safely encode text for PDF StandardFonts (Helvetica WinAnsi).
 * Replaces non-encodable characters like unicode bullets, smart quotes, em-dashes.
 */
export function safePdfText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[•●▪]/g, '-')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

/**
 * Helper to wrap text into multiple lines given max character count
 */
function wrapPdfText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const clean = safePdfText(text);
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface SphTablePageChunk {
  pageIndex: number;
  items: any[];
  startIndex: number;
  hasSummary: boolean;
}

/**
 * Calculates optimal table item distribution across pages for SPH:
 * - Intermediate page (no summary): fits up to 25 rows down to ~3cm bottom margin
 * - Page with summary + terbilang + footnotes: fits up to 19 rows
 * - Maximizes the current page space before breaking to the next page
 */
export function paginateSphTableItems(items: any[]): SphTablePageChunk[] {
  const PAGE1_MAX_SUMMARY_ROWS = 19;
  const PAGE1_MAX_INTERMEDIATE_ROWS = 24;
  const CONT_MAX_SUMMARY_ROWS = 21;
  const CONT_MAX_INTERMEDIATE_ROWS = 27;

  if (!items || items.length === 0) {
    return [{ pageIndex: 0, items: [], startIndex: 0, hasSummary: true }];
  }

  // Jika seluruh item muat di 1 halaman bersama summary
  if (items.length <= PAGE1_MAX_SUMMARY_ROWS) {
    return [{ pageIndex: 0, items, startIndex: 0, hasSummary: true }];
  }

  const chunks: SphTablePageChunk[] = [];
  let currentIndex = 0;

  while (currentIndex < items.length) {
    const isFirstTablePage = chunks.length === 0;
    const maxSummaryRows = isFirstTablePage ? PAGE1_MAX_SUMMARY_ROWS : CONT_MAX_SUMMARY_ROWS;
    const maxIntermediateRows = isFirstTablePage ? PAGE1_MAX_INTERMEDIATE_ROWS : CONT_MAX_INTERMEDIATE_ROWS;

    const remainingCount = items.length - currentIndex;

    // Jika sisa item muat bersama kotak summary pada halaman ini
    if (remainingCount <= maxSummaryRows) {
      chunks.push({
        pageIndex: chunks.length,
        items: items.slice(currentIndex),
        startIndex: currentIndex,
        hasSummary: true
      });
      currentIndex = items.length;
      break;
    }

    // Jika tidak muat bersama summary, maksimalkan baris di halaman ini
    const takeCount = Math.min(maxIntermediateRows, remainingCount);
    const chunkItems = items.slice(currentIndex, currentIndex + takeCount);
    currentIndex += takeCount;

    chunks.push({
      pageIndex: chunks.length,
      items: chunkItems,
      startIndex: currentIndex - takeCount,
      hasSummary: false
    });

    // Jika seluruh item sudah diambil namun summary belum digambar, buat halaman penutup untuk summary
    if (currentIndex >= items.length) {
      chunks.push({
        pageIndex: chunks.length,
        items: [],
        startIndex: items.length,
        hasSummary: true
      });
      break;
    }
  }

  return chunks;
}

/**
 * Creates the authentic official PT. SMK Surat Penawaran Harga (SPH) PDF
 * Clean layout specifically designed for pre-printed letterhead paper (kertas berkop fisik):
 * - No kop surat, logo, or background graphics embedded
 * - Precise top positions (measured from top edge of A4 paper):
 *   - "Nomor :" at 4.0 cm
 *   - "Perihal :" at 4.5 cm
 *   - "Lampiran :" at 5.0 cm
 *   - Dividing horizontal line at 5.5 cm
 *   - Letter content (Kepada Yth, date, intro, 9 terms, items/table, totals, signature)
 * - Bottom margin: exactly 3.0 cm empty space from bottom edge
 */
export async function createAuthenticSphPdf(
  pdfDocOrData: PDFDocument | Record<string, any>,
  dataOrSignature?: any,
  letterheadUrl?: string | null,
  signatureDataUrl?: string
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  let data: Record<string, any>;
  let activeSignature = signatureDataUrl;

  if (pdfDocOrData instanceof PDFDocument) {
    pdfDoc = pdfDocOrData;
    data = dataOrSignature || {};
  } else {
    pdfDoc = await PDFDocument.create();
    data = pdfDocOrData || {};
    if (typeof dataOrSignature === 'string' && !activeSignature && dataOrSignature.startsWith('data:image/')) {
      activeSignature = dataOrSignature;
    }
  }

  try {
    pdfDoc.registerFontkit(fontkit);
    
    if (!cachedCarlitoRegular) {
      cachedCarlitoRegular = await fetchFontBytes([
        'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Regular.ttf',
        'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-Regular.ttf'
      ]);
    }
    if (!cachedCarlitoBold) {
      cachedCarlitoBold = await fetchFontBytes([
        'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Bold.ttf',
        'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-Bold.ttf'
      ]);
    }
    if (!cachedCarlitoItalic) {
      cachedCarlitoItalic = await fetchFontBytes([
        'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Italic.ttf',
        'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-Italic.ttf'
      ]);
    }
    if (!cachedCarlitoBoldItalic) {
      cachedCarlitoBoldItalic = await fetchFontBytes([
        'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-BoldItalic.ttf',
        'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-BoldItalic.ttf'
      ]);
    }
  } catch (err) {
    console.warn('Fontkit registration or font fetch notice:', err);
  }

  let fontBold: any = null;
  let fontRegular: any = null;
  let fontOblique: any = null;
  let fontBoldOblique: any = null;

  try {
    if (cachedCarlitoRegular && cachedCarlitoBold) {
      fontRegular = await pdfDoc.embedFont(cachedCarlitoRegular);
      fontBold = await pdfDoc.embedFont(cachedCarlitoBold);
      fontOblique = cachedCarlitoItalic ? await pdfDoc.embedFont(cachedCarlitoItalic) : fontRegular;
      fontBoldOblique = cachedCarlitoBoldItalic ? await pdfDoc.embedFont(cachedCarlitoBoldItalic) : (cachedCarlitoItalic ? await pdfDoc.embedFont(cachedCarlitoItalic) : fontBold);
    }
  } catch (e) {
    console.warn('Could not embed custom Carlito font, fallback to standard fonts:', e);
  }

  if (!fontBold || !fontRegular) {
    fontBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
    fontRegular = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    fontOblique = await pdfDoc.embedStandardFont(StandardFonts.HelveticaOblique);
    fontBoldOblique = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBoldOblique);
  }

  // Measurements & Constants (A4 Paper: 21.0 cm x 29.7 cm)
  const PAGE_WIDTH = 595.28;  // 21.0 cm in points
  const PAGE_HEIGHT = 841.89; // 29.7 cm in points
  const CM_TO_PT = 28.3464567;

  // Helper to convert cm from top edge to PDF Y-coordinate (origin at bottom-left)
  const yFromTop = (cm: number): number => PAGE_HEIGHT - (cm * CM_TO_PT);

  // Exact 1.0 cm margin on both Left and Right (Identical on Page 1 & Page 2)
  const MARGIN_CM = 1.0;
  const marginX = MARGIN_CM * CM_TO_PT; // 28.35 pt (~1.0 cm)
  const rightX = PAGE_WIDTH - marginX;  // 566.93 pt
  const printableWidth = rightX - marginX; // 538.59 pt

  // Colors as specified in reference:
  // Header tabel: Biru Navy, teks putih bold
  const COLOR_NAVY = rgb(11 / 255, 47 / 255, 100 / 255); // #0B2F64 (Navy Blue)
  // Baris Jumlah & GRAND TOTAL: Biru Muda, teks bold
  const COLOR_LIGHT_BLUE = rgb(0 / 255, 162 / 255, 232 / 255); // #00A2E8 (Biru Muda / Cyan)
  const COLOR_BLACK = rgb(0, 0, 0);
  const COLOR_DARK = rgb(0.1, 0.1, 0.1);
  const COLOR_MUTED = rgb(0.3, 0.35, 0.4);
  const COLOR_WHITE = rgb(1, 1, 1);
  const COLOR_BORDER = rgb(0, 0, 0);

  // Digital Signature (if provided by user in signature pad)
  let embeddedSigImg: any = null;
  const targetSig = activeSignature || data?.signatureImage || data?.signatureUrl || data?.signature;
  if (targetSig && targetSig.startsWith('data:image/')) {
    try {
      const isPng = targetSig.includes('image/png');
      const base64Data = targetSig.split(',')[1];
      const sigBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      embeddedSigImg = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
    } catch (sigErr) {
      console.warn('Could not embed signature image:', sigErr);
    }
  }

  const formatNumberOnly = (val: any): string => {
    if (val === undefined || val === null || val === '' || val === '-') return '-';
    if (typeof val === 'string' && val.startsWith('Rp')) {
      return val.replace('Rp', '').trim();
    }
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
    if (num === 0) return '-';
    return num.toLocaleString('id-ID');
  };

  /**
   * Helper function for drawing true justified text in PDF.
   * Stretches every line except the last line of a paragraph to touch rightX perfectly.
   */
  const drawJustifiedPdfParagraph = (
    page: any,
    text: string,
    startX: number,
    startY: number,
    targetWidth: number,
    fontSize: number,
    font: any,
    color: any,
    lineHeight: number = 11.5
  ): number => {
    if (!text) return startY;
    const clean = safePdfText(text);
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 0) return startY;

    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentWidth = 0;
    const spaceWidth = font.widthOfTextAtSize(' ', fontSize);

    for (const word of words) {
      const wordW = font.widthOfTextAtSize(word, fontSize);
      const addedW = currentLine.length > 0 ? spaceWidth + wordW : wordW;

      if (currentWidth + addedW > targetWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [word];
        currentWidth = wordW;
      } else {
        currentLine.push(word);
        currentWidth += addedW;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    let curY = startY;
    for (let i = 0; i < lines.length; i++) {
      const lineWords = lines[i];
      const isLastLine = i === lines.length - 1;

      if (isLastLine || lineWords.length === 1) {
        let x = startX;
        for (let w = 0; w < lineWords.length; w++) {
          page.drawText(lineWords[w], { x, y: curY, size: fontSize, font, color });
          x += font.widthOfTextAtSize(lineWords[w], fontSize) + spaceWidth;
        }
      } else {
        const totalWordsW = lineWords.reduce((sum, w) => sum + font.widthOfTextAtSize(w, fontSize), 0);
        const extraSpace = targetWidth - totalWordsW;
        const wordGap = extraSpace / (lineWords.length - 1);

        let x = startX;
        for (let w = 0; w < lineWords.length; w++) {
          page.drawText(lineWords[w], { x, y: curY, size: fontSize, font, color });
          x += font.widthOfTextAtSize(lineWords[w], fontSize) + wordGap;
        }
      }
      curY -= lineHeight;
    }

    return curY;
  };

  // Prepare items & calculate dynamic pagination chunks FIRST before drawing Page 1 and Page 2+
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.length > 0 ? rawItems : [
    { no: 1, description: 'Jasa Kalibrasi Alat Kesehatan', quantity: 1, unit: 'Unit', unitPrice: data.grandTotal || '0', totalPrice: data.grandTotal || '0' }
  ];

  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

  // Dynamic pagination: maximizes table rows per page down to ~3cm bottom margin
  const tableChunks = paginateSphTableItems(items);
  const totalTablePages = tableChunks.length;
  // Field Lampiran dinamis mengikuti jumlah halaman aktual yang dihasilkan tabel item
  const dynamicAttachmentText = `${totalTablePages} Lembar`;

  // Helper for drawing aligned header info (Nomor, Perihal, Lampiran) on any page (12pt font size)
  const drawHeaderInfo = (page: any) => {
    const colonX = marginX + 64;
    const valueX = marginX + 74;

    // 1. Label "Nomor :", "Perihal :", "Lampiran :" dibuat bold, isian di sebelahnya normal (tidak bold)
    const nomorY = yFromTop(4.25);
    page.drawText('Nomor', { x: marginX, y: nomorY, size: 12, font: fontBold, color: COLOR_BLACK });
    page.drawText(':', { x: colonX, y: nomorY, size: 12, font: fontBold, color: COLOR_BLACK });
    page.drawText(safePdfText(data.sphNumber || '-'), { x: valueX, y: nomorY, size: 12, font: fontRegular, color: COLOR_BLACK });

    const perihalY = yFromTop(4.7);
    page.drawText('Perihal', { x: marginX, y: perihalY, size: 12, font: fontBold, color: COLOR_BLACK });
    page.drawText(':', { x: colonX, y: perihalY, size: 12, font: fontBold, color: COLOR_BLACK });
    page.drawText(safePdfText(data.subject || 'Surat Penawaran Harga Kalibrasi'), { x: valueX, y: perihalY, size: 12, font: fontRegular, color: COLOR_BLACK });

    const lampiranY = yFromTop(5.15);
    page.drawText('Lampiran', { x: marginX, y: lampiranY, size: 12, font: fontBold, color: COLOR_BLACK });
    page.drawText(':', { x: colonX, y: lampiranY, size: 12, font: fontBold, color: COLOR_BLACK });
    page.drawText(safePdfText(dynamicAttachmentText), { x: valueX, y: lampiranY, size: 12, font: fontRegular, color: COLOR_BLACK });

    // Garis horizontal pembatas didekatkan ke teks "Lampiran :" (jarak ~7 pt)
    const lineY = yFromTop(5.4);
    page.drawLine({
      start: { x: marginX, y: lineY },
      end: { x: rightX, y: lineY },
      thickness: 0.8,
      color: COLOR_BLACK
    });
  };

  // =========================================================================
  // HALAMAN 1: SURAT PENGANTAR RESMI PENAWARAN HARGA (SPH)
  // Clean canvas for pre-printed letterhead paper (tanpa kop surat & logo)
  // =========================================================================
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderInfo(page1);

  // 2. Jarak 1 baris kosong antara garis horizontal pembatas dengan baris "Kepada Yth:"
  const headerLineY = yFromTop(5.4);
  let contentY = headerLineY - 24; // 1 baris kosong di bawah garis
  
  // Date on right (e.g. "Surakarta, 01 September 2026")
  const rightDateStr = safePdfText(data.formattedDate || `${data.city || 'Surakarta'}, ${data.date || new Date().toLocaleDateString('id-ID')}`);
  const dateWidth = fontRegular.widthOfTextAtSize(rightDateStr, 12);
  page1.drawText(rightDateStr, { x: rightX - dateWidth, y: contentY, size: 12, font: fontRegular, color: COLOR_BLACK });

  // Recipient info on left (Kepada Yth:)
  page1.drawText('Kepada Yth:', { x: marginX, y: contentY, size: 12, font: fontBold, color: COLOR_BLACK });
  contentY -= 15;
  page1.drawText(safePdfText(data.recipientRole || 'Direktur'), { x: marginX, y: contentY, size: 12, font: fontRegular, color: COLOR_BLACK });
  contentY -= 15;
  page1.drawText(safePdfText(data.hospitalName || '-'), { x: marginX, y: contentY, size: 12, font: fontBold, color: COLOR_BLACK });
  if (data.hospitalAddress) {
    const addrLines = wrapPdfText(String(data.hospitalAddress), 65);
    for (const al of addrLines.slice(0, 2)) {
      contentY -= 14;
      page1.drawText(safePdfText(al), { x: marginX, y: contentY, size: 11, font: fontRegular, color: COLOR_BLACK });
    }
  }

  // 3. Jarak 1 baris kosong antara baris terakhir alamat customer dengan "Dengan Hormat,"
  contentY -= 28;
  page1.drawText('Dengan Hormat,', { x: marginX, y: contentY, size: 12, font: fontBold, color: COLOR_BLACK });
  contentY -= 15;

  // Paragraf Pembuka dengan Perataan Justify (12pt font)
  const introText = 'Menindaklanjuti mengenai permintaan Kalibrasi alat Kesehatan, PT. Sarana Multi Kalibrasi telah memiliki izin dari Kementrian Kesehatan dengan No. 26062301565850001, Sertifikat Akreditasi KAN LK-532-IDN serta menerapkan Standar SNI ISO/ IEC 17025: 2017, melampirkan harga penawaran, adapun ketentuan yang berlaku sebagai berikut:';
  contentY = drawJustifiedPdfParagraph(page1, introText, marginX, contentY, printableWidth, 12, fontRegular, COLOR_DARK, 15);
  
  // 4. Jarak 1 baris kosong antara kalimat "...sebagai berikut:" dengan poin 1 di bawahnya
  contentY -= 15;

  // 9 Poin Ketentuan Resmi dengan Penomoran Rapi & Line Spacing Lega (Justified, 12pt font)
  const isPpnInc = data.isPpnIncluded !== false && data.isPpnIncluded !== 'false';
  const terms = [
    isPpnInc ? 'Harga sudah termasuk PPN 11%.' : 'Harga belum termasuk PPN 11%.',
    'Harga sudah termasuk biaya transportasi dan akomodasi.',
    'Harga tidak termasuk service dan maintenance.',
    'Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.',
    'Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.',
    'Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.',
    'Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.',
    'Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.',
    `Pembayaran : ${data.bankName || 'Bank Mandiri Cab. Surakarta'}\nNo. Rek : ${data.bankAccountNumber || '138-00-2610846-9'} (${data.bankAccountName || 'SARANA MULTI KALIBRASI PT'})`
  ];

  const numX = marginX + 6;
  const termTextX = marginX + 24;
  const termTextWidth = printableWidth - 24;

  for (let i = 0; i < terms.length; i++) {
    const numStr = `${i + 1}.`;
    const termItem = terms[i];
    
    if (i === 8) {
      // Item 9: Pembayaran Bank dengan TEPAT 1 BARIS KOSONG sebelum "No. Rek :"
      page1.drawText(numStr, { x: numX, y: contentY, size: 12, font: fontRegular, color: COLOR_BLACK });
      page1.drawText(`Pembayaran : ${data.bankName || 'Bank Mandiri Cab. Surakarta'}`, { x: termTextX, y: contentY, size: 12, font: fontRegular, color: COLOR_BLACK });
      // Jarak 1 baris kosong (~22 pt):
      contentY -= 22;
      page1.drawText(`No. Rek : ${data.bankAccountNumber || '138-00-2610846-9'} (${data.bankAccountName || 'SARANA MULTI KALIBRASI PT'})`, { x: termTextX + 82, y: contentY, size: 12, font: fontBold, color: COLOR_BLACK });
      contentY -= 15;
    } else {
      page1.drawText(numStr, { x: numX, y: contentY, size: 12, font: fontRegular, color: COLOR_BLACK });
      contentY = drawJustifiedPdfParagraph(page1, termItem, termTextX, contentY, termTextWidth, 12, fontRegular, COLOR_BLACK, 15);
      contentY -= 3; // Jarak antar poin
    }
  }

  // 1 baris kosong SEBELUM paragraf permohonan persetujuan:
  contentY -= 10;
  const closing1 = 'Bersama ini kami bermaksud mengajukan permohonan persetujuan Surat Penawaran Harga.';
  contentY = drawJustifiedPdfParagraph(page1, closing1, marginX, contentY, printableWidth, 12, fontRegular, COLOR_DARK, 15);

  // 1 baris kosong SESUDAH paragraf permohonan persetujuan & SEBELUM paragraf marketing:
  contentY -= 10;
  const marketingInfo = `Untuk informasi lebih lanjut dapat menghubungi marketing kami di : ${data.marketingStaffPhone || '0812-4484-2383'} (${data.marketingStaffName || 'Ari'}). Demikian, atas perhatian dan kerjasamanya kami ucapkan terimakasih.`;
  contentY = drawJustifiedPdfParagraph(page1, marketingInfo, marginX, contentY, printableWidth, 12, fontRegular, COLOR_DARK, 15);

  // Signatures on Page 1:
  // Spasi antara paragraf penutup marketing dan blok tanda tangan dibuat lebih rapat/dekat (tetap ada sedikit jarak, tidak menempel)
  const sigHeaderY = contentY - 12; // Jarak rapat & pas di bawah kalimat penutup
  const sigGapPt = 2.6 * CM_TO_PT; // ~73.7 pt ruang tanda tangan
  const minBottomMarginPt = 2.8 * CM_TO_PT; // 79.37 pt from bottom edge
  const sigLineY = sigHeaderY - sigGapPt;

  // Definisikan titik tengah (center X) untuk kolom kiri (PT SMK) dan kolom kanan (Pelanggan)
  const leftColWidth = 210;
  const leftColCenterX = marginX + leftColWidth / 2;

  const rightColWidth = 210;
  const rightColCenterX = rightX - rightColWidth / 2;

  // ================= Kolom Kiri: PT. SARANA MULTI KALIBRASI (Rata Tengah) =================
  // Header perusahaan: tetap ukuran normal (12pt font bold)
  const ptSmkStr = 'PT. SARANA MULTI KALIBRASI';
  const ptSmkW = fontBold.widthOfTextAtSize(ptSmkStr, 12);
  page1.drawText(ptSmkStr, { x: leftColCenterX - ptSmkW / 2, y: sigHeaderY, size: 12, font: fontBold, color: COLOR_BLACK });

  // Gambar tanda tangan digital (center)
  if (embeddedSigImg) {
    const imgW = 95;
    const imgH = 38;
    page1.drawImage(embeddedSigImg, { x: leftColCenterX - imgW / 2, y: sigLineY + 6, width: imgW, height: imgH });
  }

  // Nama Direktur: Rata tengah dengan font 11pt (bold)
  const dirNameStr = safePdfText(data.directorName || 'Ahmad Fajar Ariyanto');
  const dirNameW = fontBold.widthOfTextAtSize(dirNameStr, 11);
  page1.drawText(dirNameStr, { x: leftColCenterX - dirNameW / 2, y: sigLineY, size: 11, font: fontBold, color: COLOR_BLACK });

  // Jabatan Direktur: Rata tengah dengan font 11pt (normal)
  const dirTitleStr = safePdfText(data.directorTitle || 'Direktur');
  const dirTitleW = fontRegular.widthOfTextAtSize(dirTitleStr, 11);
  page1.drawText(dirTitleStr, { x: leftColCenterX - dirTitleW / 2, y: sigLineY - 14, size: 11, font: fontRegular, color: COLOR_BLACK });

  // ================= Kolom Kanan: Disetujui oleh Pelanggan (Rata Tengah) =================
  // Header persetujuan: tetap ukuran normal (12pt font bold)
  const custLabelStr = 'Disetujui oleh Pelanggan,';
  const custLabelW = fontBold.widthOfTextAtSize(custLabelStr, 12);
  page1.drawText(custLabelStr, { x: rightColCenterX - custLabelW / 2, y: sigHeaderY, size: 12, font: fontBold, color: COLOR_BLACK });

  // Titik-titik nama pelanggan: font 11pt
  const custNameStr = '( ……………………………… )';
  const custNameW = fontRegular.widthOfTextAtSize(custNameStr, 11);
  page1.drawText(custNameStr, { x: rightColCenterX - custNameW / 2, y: sigLineY, size: 11, font: fontRegular, color: COLOR_BLACK });

  // Tembusan & Catatan if provided
  let noteY = sigLineY - 26;
  if (noteY > minBottomMarginPt) {
    if (data.tembusan && data.tembusan !== '-') {
      page1.drawText(safePdfText(`Tembusan: ${data.tembusan}`), { x: marginX, y: noteY, size: 11, font: fontRegular, color: COLOR_MUTED });
      noteY -= 13;
    }
    if (data.notes && data.notes !== '-' && noteY > minBottomMarginPt) {
      page1.drawText(safePdfText(`Catatan: ${data.notes}`), { x: marginX, y: noteY, size: 11, font: fontRegular, color: COLOR_MUTED });
    }
  }

  // =========================================================================
  // HALAMAN 2+: LAMPIRAN RINCIAN PENAWARAN HARGA (TABEL PERANGKAT)
  // Clean canvas for pre-printed letterhead paper (tanpa kop surat & logo)
  // =========================================================================
  for (let cIdx = 0; cIdx < tableChunks.length; cIdx++) {
    const chunk = tableChunks[cIdx];
    const pageN = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeaderInfo(pageN);

    // Table Setup: Full width matching Page 1 margins (from marginX to rightX = printableWidth = 538.59 pt)
    // Columns: No (30), Diskripsi (205), Qty (38), Satuan (48), Satuan Harga (107), Total Harga (110.59)
    const colX = {
      no: marginX,
      desc: marginX + 30,
      qty: marginX + 30 + 205,         // marginX + 235
      unit: marginX + 30 + 205 + 38,    // marginX + 273
      price: marginX + 30 + 205 + 38 + 48, // marginX + 321
      total: marginX + 30 + 205 + 38 + 48 + 107, // marginX + 428
      end: rightX // marginX + 538.59
    };
    const tableWidth = colX.end - colX.no;

    let tableY: number;

    if (cIdx === 0) {
      // Halaman 1 Tabel: Judul Dokumen "Surat Penawaran Harga" & Header Kolom (Biru Muda)
      const titleStr = 'Surat Penawaran Harga';
      const titleWidth = fontBold.widthOfTextAtSize(titleStr, 12);
      const titleX = marginX + (printableWidth - titleWidth) / 2;
      const titleY = yFromTop(6.1);

      pageN.drawText(titleStr, {
        x: titleX,
        y: titleY,
        size: 12,
        font: fontBold,
        color: COLOR_BLACK
      });

      tableY = titleY - 18;
      const thH = 22; // Table header height for 12pt font

      // Header Background: BIRU MUDA IDENTIK (#00A2E8) sama dengan baris Jumlah & GRAND TOTAL, Teks HITAM BOLD
      pageN.drawRectangle({
        x: colX.no,
        y: tableY - thH,
        width: tableWidth,
        height: thH,
        color: COLOR_LIGHT_BLUE,
        borderColor: COLOR_BLACK,
        borderWidth: 0.8
      });

      // Vertical borders for header (black border)
      [colX.desc, colX.qty, colX.unit, colX.price, colX.total].forEach((vx) => {
        pageN.drawLine({
          start: { x: vx, y: tableY },
          end: { x: vx, y: tableY - thH },
          thickness: 0.8,
          color: COLOR_BLACK
        });
      });

      // Header Text: Hitam Bold 12pt, terpusat rapi (konsisten dengan baris Jumlah & GRAND TOTAL)
      const noHeaderW = fontBold.widthOfTextAtSize('No.', 12);
      pageN.drawText('No.', { x: colX.no + (30 - noHeaderW) / 2, y: tableY - 15.5, size: 12, font: fontBold, color: COLOR_BLACK });
      const descHeaderW = fontBold.widthOfTextAtSize('Diskripsi', 12);
      pageN.drawText('Diskripsi', { x: colX.desc + (205 - descHeaderW) / 2, y: tableY - 15.5, size: 12, font: fontBold, color: COLOR_BLACK });
      const qtyHeaderW = fontBold.widthOfTextAtSize('Qty', 12);
      pageN.drawText('Qty', { x: colX.qty + (38 - qtyHeaderW) / 2, y: tableY - 15.5, size: 12, font: fontBold, color: COLOR_BLACK });
      const unitHeaderW = fontBold.widthOfTextAtSize('Satuan', 12);
      pageN.drawText('Satuan', { x: colX.unit + (48 - unitHeaderW) / 2, y: tableY - 15.5, size: 12, font: fontBold, color: COLOR_BLACK });
      const priceHeaderW = fontBold.widthOfTextAtSize('Satuan Harga', 12);
      pageN.drawText('Satuan Harga', { x: colX.price + (107 - priceHeaderW) / 2, y: tableY - 15.5, size: 12, font: fontBold, color: COLOR_BLACK });
      const totalHeaderW = fontBold.widthOfTextAtSize('Total Harga', 12);
      pageN.drawText('Total Harga', { x: colX.total + (110.59 - totalHeaderW) / 2, y: tableY - 15.5, size: 12, font: fontBold, color: COLOR_BLACK });

      tableY -= thH;
    } else {
      // Halaman Lanjutan (Halaman 2, 3, dst dari tabel):
      // Tanpa Judul Dokumen & Tanpa Header Kolom - Langsung menyambung baris data dengan garis batas atas
      tableY = yFromTop(5.6);
    }

    // Table Data Rows
    const pageItems = chunk.items;
    const rowH = 21; // Cell height for 12pt font

    for (let r = 0; r < pageItems.length; r++) {
      const it = pageItems[r];
      const rowY = tableY;

      // Outer row border
      pageN.drawRectangle({
        x: colX.no,
        y: rowY - rowH,
        width: tableWidth,
        height: rowH,
        borderColor: COLOR_BORDER,
        borderWidth: 0.5,
        color: COLOR_WHITE
      });

      // Vertical cell dividers
      [colX.desc, colX.qty, colX.unit, colX.price, colX.total].forEach((vx) => {
        pageN.drawLine({
          start: { x: vx, y: rowY },
          end: { x: vx, y: rowY - rowH },
          thickness: 0.5,
          color: COLOR_BORDER
        });
      });

      const itemNo = safePdfText(it.no || chunk.startIndex + r + 1);
      const itemDesc = safePdfText(it.description || it.namaAlat || '-').substring(0, 42);
      const itemQty = safePdfText(it.quantity || '1');
      const itemUnit = safePdfText(it.unit || 'Unit');
      const priceNumStr = formatNumberOnly(it.unitPrice || '0');
      const totalNumStr = formatNumberOnly(it.totalPrice || '0');

      // Center No. (12pt font)
      const noW = fontRegular.widthOfTextAtSize(itemNo, 12);
      pageN.drawText(itemNo, { x: colX.no + (30 - noW) / 2, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });

      // Left Diskripsi (RATA KIRI KONSISTEN dengan 6pt padding, 12pt font)
      pageN.drawText(itemDesc, { x: colX.desc + 6, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });

      // Center Qty (12pt font)
      const qtyW = fontRegular.widthOfTextAtSize(itemQty, 12);
      pageN.drawText(itemQty, { x: colX.qty + (38 - qtyW) / 2, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });

      // Center Unit (12pt font)
      const unitW = fontRegular.widthOfTextAtSize(itemUnit, 12);
      pageN.drawText(itemUnit, { x: colX.unit + (48 - unitW) / 2, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });

      // Satuan Harga: "Rp" on left, number right-aligned (12pt font)
      pageN.drawText('Rp', { x: colX.price + 5, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });
      const priceW = fontRegular.widthOfTextAtSize(priceNumStr, 12);
      pageN.drawText(priceNumStr, { x: colX.total - priceW - 5, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });

      // Total Harga: "Rp" on left, number right-aligned (12pt font)
      pageN.drawText('Rp', { x: colX.total + 5, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });
      const totalW = fontRegular.widthOfTextAtSize(totalNumStr, 12);
      pageN.drawText(totalNumStr, { x: colX.end - totalW - 5, y: rowY - 15, size: 12, font: fontRegular, color: COLOR_BLACK });

      tableY -= rowH;
    }

    // IF CHUNK HAS SUMMARY: Draw Summary Block (Jumlah + Breakdown) & Terbilang Box & Footnotes
    if (chunk.hasSummary) {
      const summaryRowH = 21; // 21pt height for 12pt font

      // Row 1: Baris "Jumlah" (Background BIRU MUDA di sisi Jumlah Qty, Putih di Total 1)
      pageN.drawRectangle({
        x: colX.no,
        y: tableY - summaryRowH,
        width: colX.price - colX.no,
        height: summaryRowH,
        borderColor: COLOR_BORDER,
        borderWidth: 0.5,
        color: COLOR_LIGHT_BLUE
      });

      // Right part (Total 1: colX.price to colX.end): Background PUTIH polos, teks bold
      pageN.drawRectangle({
        x: colX.price,
        y: tableY - summaryRowH,
        width: colX.end - colX.price,
        height: summaryRowH,
        borderColor: COLOR_BORDER,
        borderWidth: 0.5,
        color: COLOR_WHITE
      });

      [colX.desc, colX.qty, colX.unit, colX.price, colX.total].forEach(vx => {
        pageN.drawLine({ start: { x: vx, y: tableY }, end: { x: vx, y: tableY - summaryRowH }, thickness: 0.5, color: COLOR_BORDER });
      });

      const jmlLblW = fontBold.widthOfTextAtSize('Jumlah', 12);
      pageN.drawText('Jumlah', { x: colX.desc + (205 - jmlLblW) / 2, y: tableY - 15, size: 12, font: fontBold, color: COLOR_BLACK });
      const totalQtyStr = String(totalQty);
      const tqW = fontBold.widthOfTextAtSize(totalQtyStr, 12);
      pageN.drawText(totalQtyStr, { x: colX.qty + (38 - tqW) / 2, y: tableY - 15, size: 12, font: fontBold, color: COLOR_BLACK });
      const unitLblW = fontBold.widthOfTextAtSize('Unit', 12);
      pageN.drawText('Unit', { x: colX.unit + (48 - unitLblW) / 2, y: tableY - 15, size: 12, font: fontBold, color: COLOR_BLACK });
      
      // Total 1 label (RATA KANAN) & value (12pt font)
      const t1Label = 'Total 1';
      const t1LblW = fontBold.widthOfTextAtSize(t1Label, 12);
      pageN.drawText(t1Label, { x: colX.total - t1LblW - 6, y: tableY - 15, size: 12, font: fontBold, color: COLOR_BLACK });
      
      pageN.drawText('Rp', { x: colX.total + 5, y: tableY - 15, size: 12, font: fontBold, color: COLOR_BLACK });
      const subtotal1NumStr = formatNumberOnly(data.subtotal1);
      const st1W = fontBold.widthOfTextAtSize(subtotal1NumStr, 12);
      pageN.drawText(subtotal1NumStr, { x: colX.end - st1W - 5, y: tableY - 15, size: 12, font: fontBold, color: COLOR_BLACK });
      
      tableY -= summaryRowH;

      // Kotak Total Terpisah di Sisi Kanan Bawah:
      // Baris Akomodasi (Putih), Total 2 (Putih), PPN 11% (Putih), GRAND TOTAL (Biru Muda)
      // SEMUA LABEL DIRATAKAN RATA KANAN (12pt font)
      const summaryRows = [
        { label: 'Akomodasi', valStr: formatNumberOnly(data.accommodationFee), isGrand: false },
        { label: 'Total 2', valStr: formatNumberOnly(data.subtotal2 || data.subtotal1), isGrand: false },
        { label: isPpnInc ? 'PPN 11%' : 'PPN 11% (Non)', valStr: formatNumberOnly(data.ppnAmount), isGrand: false },
        { label: 'GRAND TOTAL', valStr: formatNumberOnly(data.grandTotal), isGrand: true }
      ];

      for (let s = 0; s < summaryRows.length; s++) {
        const sr = summaryRows[s];
        const isGrand = sr.isGrand;

        // Cell background & border for summary row
        pageN.drawRectangle({
          x: colX.price,
          y: tableY - summaryRowH,
          width: colX.end - colX.price,
          height: summaryRowH,
          borderColor: COLOR_BORDER,
          borderWidth: 0.5,
          color: isGrand ? COLOR_LIGHT_BLUE : COLOR_WHITE
        });

        // Vertical divider between label and value
        pageN.drawLine({
          start: { x: colX.total, y: tableY },
          end: { x: colX.total, y: tableY - summaryRowH },
          thickness: 0.5,
          color: COLOR_BORDER
        });

        // Label diratakan RATA KANAN sebelum garis divider (12pt font)
        const lblW = fontBold.widthOfTextAtSize(sr.label, 12);
        pageN.drawText(sr.label, {
          x: colX.total - lblW - 6,
          y: tableY - 15,
          size: 12,
          font: fontBold,
          color: COLOR_BLACK
        });

        // "Rp" and right-aligned amount (12pt font)
        pageN.drawText('Rp', {
          x: colX.total + 5,
          y: tableY - 15,
          size: 12,
          font: fontBold,
          color: COLOR_BLACK
        });

        const valW = fontBold.widthOfTextAtSize(sr.valStr, 12);
        pageN.drawText(sr.valStr, {
          x: colX.end - valW - 5,
          y: tableY - 15,
          size: 12,
          font: fontBold,
          color: COLOR_BLACK
        });

        tableY -= summaryRowH;
      }

      // Kotak Terbilang Terpisah di Sisi Kiri Bawah (spanning colX.no to colX.price, height = 4 * summaryRowH = 84 pt)
      const terbilangBoxW = colX.price - colX.no;
      const terbilangBoxH = 4 * summaryRowH;
      const terbilangTopY = tableY + terbilangBoxH;

      pageN.drawRectangle({
        x: colX.no,
        y: tableY,
        width: terbilangBoxW,
        height: terbilangBoxH,
        borderColor: COLOR_BORDER,
        borderWidth: 0.5,
        color: COLOR_WHITE
      });

      // 1. Label "Terbilang:" -> RATA KIRI dan ITALIC (12pt font)
      const terbilangHeaderStr = 'Terbilang:';
      pageN.drawText(terbilangHeaderStr, { 
        x: colX.no + 8, 
        y: terbilangTopY - 16, 
        size: 12, 
        font: fontBoldOblique, 
        color: COLOR_BLACK 
      });
      
      // 2. Kalimat Angka Terbilang -> DIRATAKAN CENTER & DIMIRINGKAN (ITALIC) di baris bawah label (12pt font)
      if (data.terbilang) {
        const rawTerbilang = data.terbilang.startsWith('"') ? data.terbilang : `"${data.terbilang}"`;
        const terbilangLines = wrapPdfText(rawTerbilang, 34);
        let tY = terbilangTopY - 34;
        for (const tl of terbilangLines.slice(0, 3)) {
          const lineText = safePdfText(tl);
          const lineW = fontBoldOblique.widthOfTextAtSize(lineText, 12);
          const lineX = colX.no + (terbilangBoxW - lineW) / 2;
          pageN.drawText(lineText, { x: lineX, y: tY, size: 12, font: fontBoldOblique, color: COLOR_BLACK });
          tY -= 15;
        }
      }

      // Footnotes under Table (Asterisks) with italic styling (10.5pt font)
      tableY -= 14;
      const footnotes = [
        '*Hanya dilakukan Uji Keselamatan Listrik dan/atau Uji Fungsi dan Kondisi Alat',
        '**Alat dilakukan penarikan ke PT Sarana Multi Kalibrasi',
        '***Alat dilakukan penarikan untuk subkontraktor pekerjaan',
        '****Tidak termasuk jenis alat wajib kalibrasi'
      ];

      for (const fn of footnotes) {
        if (tableY > minBottomMarginPt) {
          pageN.drawText(safePdfText(fn), {
            x: colX.no,
            y: tableY,
            size: 10.5,
            font: fontOblique,
            color: COLOR_BLACK
          });
          tableY -= 12;
        }
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Creates a clean default A4 PDF document containing header & system data fields.
 * Used as a fallback when a PDF template cannot be loaded directly (e.g. Google Drive link or corrupted file).
 */
export async function createCleanDefaultPdf(
  data: Record<string, any>,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // If this is an SPH document (has sphNumber or items or penawaran), generate the authentic official 2-page PT. SMK SPH!
  const isSph = !!data.sphNumber || (Array.isArray(data.items) && data.items.length > 0) || (data.subject && String(data.subject).toLowerCase().includes('penawaran'));
  if (isSph) {
    try {
      return await createAuthenticSphPdf(pdfDoc, data, letterheadUrl, signatureDataUrl);
    } catch (sphErr) {
      console.error('Error generating authentic SPH PDF:', sphErr);
    }
  }

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

  let startContentY = height - 120;

  // If letterhead is provided, draw it at top
  let hasLetterhead = false;
  if (letterheadUrl) {
    try {
      const lhBuffer = await fetchFile(letterheadUrl);
      const isPng = letterheadUrl.startsWith('data:image/png') || letterheadUrl.endsWith('.png');
      const isJpg = letterheadUrl.startsWith('data:image/jpeg') || letterheadUrl.startsWith('data:image/jpg') || letterheadUrl.endsWith('.jpg') || letterheadUrl.endsWith('.jpeg');
      const isImg = isPng || isJpg || letterheadUrl.startsWith('data:image/');

      if (isImg) {
        let img: any;
        try {
          img = isPng ? await pdfDoc.embedPng(lhBuffer) : await pdfDoc.embedJpg(lhBuffer);
        } catch {
          try {
            img = await pdfDoc.embedPng(lhBuffer);
          } catch {
            img = await pdfDoc.embedJpg(lhBuffer);
          }
        }
        if (img) {
          const aspect = img.width / img.height;
          if (aspect < 0.8) {
            page.drawImage(img, { x: 0, y: 0, width, height });
            startContentY = height - 130;
          } else {
            const bannerH = width / aspect;
            page.drawImage(img, { x: 0, y: height - bannerH, width, height: bannerH });
            startContentY = height - bannerH - 20;
          }
          hasLetterhead = true;
        }
      } else {
        const lhDoc = await PDFDocument.load(lhBuffer, { ignoreEncryption: true });
        if (lhDoc.getPageCount() > 0) {
          const [embeddedLh] = await pdfDoc.embedPdf(lhDoc, [0]);
          page.drawPage(embeddedLh, { x: 0, y: 0, width, height, opacity: 1 });
          hasLetterhead = true;
          startContentY = height - 130;
        }
      }
    } catch (e) {
      console.warn('Could not overlay letterhead in createCleanDefaultPdf:', e);
    }
  }

  if (!hasLetterhead) {
    // Header Banner
    page.drawRectangle({
      x: 0,
      y: height - 70,
      width,
      height: 70,
      color: rgb(0.11, 0.4, 0.55),
    });

    page.drawText('PT. SARANA MULTI KALIBRASI', {
      x: 40,
      y: height - 35,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(safePdfText('Laboratorium Uji & Kalibrasi Alat Kesehatan | LK-532-IDN'), {
      x: 40,
      y: height - 52,
      size: 9,
      font: fontRegular,
      color: rgb(0.85, 0.95, 1),
    });
    startContentY = height - 100;
  }

  // Title
  const docTitle = safePdfText(data.subject || data.documentTitle || 'DOKUMEN RESMI PT. SARANA MULTI KALIBRASI').toUpperCase();
  page.drawText(docTitle, {
    x: 40,
    y: startContentY,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawLine({
    start: { x: 40, y: startContentY - 8 },
    end: { x: width - 40, y: startContentY - 8 },
    thickness: 1.5,
    color: rgb(0.11, 0.4, 0.55),
  });

  // Render structured document metadata table (clean and professional)
  let currentY = startContentY - 30;
  const metaRows: [string, string][] = [
    ['Nomor Dokumen', safePdfText(data.sphNumber || data.spkNumber || data.bapNumber || data.documentNumber || '-')],
    ['Rumah Sakit / Faskes', safePdfText(data.hospitalName || '-')],
    ['Alamat Lokasi', safePdfText(data.hospitalAddress || data.city || '-')],
    ['Tanggal Dokumen', safePdfText(data.date || new Date().toLocaleDateString('id-ID'))],
    ['Perihal / Pekerjaan', safePdfText(data.subject || data.workScope || 'Layanan Kalibrasi & Uji Alat Kesehatan')],
    ['Total Nilai', safePdfText(data.grandTotal ? `Rp ${data.grandTotal}` : '-')],
  ];

  page.drawRectangle({
    x: 40,
    y: currentY - (metaRows.length * 20),
    width: width - 80,
    height: metaRows.length * 20 + 8,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.82, 0.86, 0.90),
    borderWidth: 1,
  });

  for (const [lbl, val] of metaRows) {
    page.drawText(lbl, {
      x: 55,
      y: currentY - 12,
      size: 9,
      font: fontBold,
      color: rgb(0.15, 0.3, 0.45),
    });

    page.drawText(':', {
      x: 180,
      y: currentY - 12,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(val, {
      x: 195,
      y: currentY - 12,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 20;
  }

  currentY -= 20;

  // Footer Signature Section
  const targetSigOther = signatureDataUrl || data?.signatureImage || data?.signatureUrl || data?.mtSignatureUrl || data?.signature;
  if (targetSigOther && targetSigOther.startsWith('data:image/')) {
    try {
      const isPng = targetSigOther.includes('image/png');
      const base64Data = targetSigOther.split(',')[1];
      const sigBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const sigImg = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
      
      page.drawText('Manajemen Teknik / Petugas:', {
        x: width - 210,
        y: 110,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      page.drawImage(sigImg, {
        x: width - 210,
        y: 45,
        width: 120,
        height: 50,
      });
    } catch {
      // Signature embed fallback
    }
  }

  return await pdfDoc.save();
}

/**
 * Injects data into a PDF template using AcroForm filling and stream search-and-replace.
 * Also supports overlaying onto uploaded Kop Surat (blank A4 letterhead).
 */
export async function searchAndReplaceInPdf(
  arrayBuffer: ArrayBuffer,
  data: Record<string, any>,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (pdfErr) {
    console.warn('Could not load PDF template bytes directly, generating clean default PDF:', pdfErr);
    return await createCleanDefaultPdf(data, mappings, signatureDataUrl, letterheadUrl);
  }

  // If a custom Kop Surat letterhead is configured, blend it into page 1
  if (letterheadUrl) {
    try {
      const lhBuffer = await fetchFile(letterheadUrl);
      const firstPage = pdfDoc.getPages()[0];
      if (firstPage) {
        const { width, height } = firstPage.getSize();
        const isPng = letterheadUrl.startsWith('data:image/png') || letterheadUrl.endsWith('.png');
        const isJpg = letterheadUrl.startsWith('data:image/jpeg') || letterheadUrl.startsWith('data:image/jpg') || letterheadUrl.endsWith('.jpg') || letterheadUrl.endsWith('.jpeg');
        const isImg = isPng || isJpg || letterheadUrl.startsWith('data:image/');

        if (isImg) {
          try {
            let img: any;
            try {
              img = isPng ? await pdfDoc.embedPng(lhBuffer) : await pdfDoc.embedJpg(lhBuffer);
            } catch {
              try {
                img = await pdfDoc.embedPng(lhBuffer);
              } catch {
                img = await pdfDoc.embedJpg(lhBuffer);
              }
            }

            if (img) {
              const aspect = img.width / img.height;
              if (aspect < 0.8) {
                firstPage.drawImage(img, { x: 0, y: 0, width, height });
              } else {
                const bannerH = width / aspect;
                firstPage.drawImage(img, { x: 0, y: height - bannerH, width, height: bannerH });
              }
            }
          } catch (imgErr) {
            console.warn('Could not overlay letterhead image:', imgErr);
          }
        } else {
          try {
            const lhDoc = await PDFDocument.load(lhBuffer, { ignoreEncryption: true });
            if (lhDoc.getPageCount() > 0) {
              const [embeddedLh] = await pdfDoc.embedPdf(lhDoc, [0]);
              firstPage.drawPage(embeddedLh, {
                x: 0,
                y: 0,
                width,
                height,
                opacity: 1
              });
            }
          } catch (pdfLhErr) {
            console.warn('Could not overlay letterhead PDF:', pdfLhErr);
          }
        }
      }
    } catch (lhErr) {
      console.warn('Could not overlay letterhead:', lhErr);
    }
  }

  const replacementDict = buildReplacementDictionary(data, mappings);
  const targetSignature = signatureDataUrl || data?.signatureImage || data?.signatureUrl || data?.mtSignatureUrl || data?.signature;

  // 1. Fill AcroForm fields
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    fields.forEach(field => {
      const fieldName = field.getName();
      const bareName = fieldName.replace(/[{}]/g, '').trim();

      // Check direct match, bare match, or mapped system key
      let valueToSet = replacementDict[fieldName] ?? replacementDict[bareName] ?? replacementDict[`{{${bareName}}}`];

      if (valueToSet === undefined && mappings && mappings[fieldName]) {
        valueToSet = replacementDict[mappings[fieldName]];
      }

      if (valueToSet !== undefined) {
        try {
          const textField = form.getTextField(fieldName);
          if (textField) {
            textField.setText(String(valueToSet));
          }
        } catch {
          // Field might not be textfield
        }
      }
    });

    // Flatten form so it renders consistently across all PDF readers
    try {
      form.flatten();
    } catch {
      // Ignore if flattening unsupported
    }
  } catch {
    // PDF might not have AcroForm
  }

  // 2. Perform search-and-replace on page content streams
  const pageCount = pdfDoc.getPageCount();
  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const page = pdfDoc.getPage(pageIdx);
    const contents = page.node.Contents();
    if (!contents) continue;

    const streamRefs = (contents as any).asArray
      ? Array.from({ length: (contents as any).size() }, (_, i) => (contents as any).get(i))
      : [contents];

    for (const ref of streamRefs) {
      try {
        const streamObj = pdfDoc.context.lookup(ref) as any;
        if (!streamObj || typeof streamObj.getContents !== 'function') continue;

        const rawBytes: Uint8Array = streamObj.getContents();
        let isCompressed = false;
        let decodedText = '';

        try {
          decodedText = new TextDecoder('utf-8', { fatal: false }).decode(pako.inflate(rawBytes));
          isCompressed = true;
        } catch {
          decodedText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);
          isCompressed = false;
        }

        let modified = false;

        // Perform token replacement in decoded stream
        for (const [token, value] of Object.entries(replacementDict)) {
          if (!token) continue;
          const cleanToken = token.trim();
          const cleanValue = String(value);

          // 1. Literal replacement in ( ... )
          if (decodedText.includes(cleanToken)) {
            const safePdfVal = cleanValue.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            decodedText = decodedText.split(cleanToken).join(safePdfVal);
            modified = true;
          }

          // 2. Hex replacement in < ... >
          const tokenHex = textToHex(cleanToken);
          if (decodedText.toUpperCase().includes(tokenHex)) {
            const valHex = textToHex(cleanValue);
            const hexRegex = new RegExp(tokenHex, 'gi');
            decodedText = decodedText.replace(hexRegex, valHex);
            modified = true;
          }
        }

        if (modified) {
          const newBytes = new TextEncoder().encode(decodedText);
          const finalBytes = isCompressed ? pako.deflate(newBytes) : newBytes;
          const newStream = PDFRawStream.of(streamObj.dict, finalBytes);
          pdfDoc.context.assign(ref, newStream);
        }
      } catch (streamErr) {
        console.warn('Error replacing in PDF stream:', streamErr);
      }
    }
  }

  // 3. Inject signature image/pdf into AcroForm signature field or draw on signature area
  if (targetSignature && typeof targetSignature === 'string' && (targetSignature.startsWith('data:image') || targetSignature.startsWith('data:application/pdf'))) {
    try {
      const base64Data = targetSignature.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      let embeddedVisual: any = null;
      let isPdfEmbed = false;
      
      if (targetSignature.startsWith('data:application/pdf')) {
        const [embeddedPdf] = await pdfDoc.embedPdf(bytes);
        embeddedVisual = embeddedPdf;
        isPdfEmbed = true;
      } else {
        embeddedVisual = targetSignature.includes('image/jpeg') || targetSignature.includes('image/jpg')
          ? await pdfDoc.embedJpg(bytes)
          : await pdfDoc.embedPng(bytes);
      }

      let placedInForm = false;
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        for (const field of fields) {
          const name = field.getName().toLowerCase();
          if (name.includes('sign') || name.includes('ttd') || name.includes('paraf')) {
            try {
              const btn = form.getButton(field.getName());
              if (!isPdfEmbed) {
                btn.setImage(embeddedVisual);
                placedInForm = true;
              }
            } catch {
              // Not a button field
            }
          }
        }
      } catch {
        // No acroform
      }

      // Draw onto the signature area of the last page if not set in an AcroForm field
      if (!placedInForm) {
        const pages = pdfDoc.getPages();
        if (pages.length > 0) {
          const lastPage = pages[pages.length - 1];
          const { width } = lastPage.getSize();
          
          if (isPdfEmbed) {
             const { width: pdW, height: pdH } = embeddedVisual.scale(1);
             const scale = Math.min(125 / pdW, 55 / pdH);
             lastPage.drawPage(embeddedVisual, {
               x: width - 210,
               y: 90,
               xScale: scale,
               yScale: scale,
               opacity: 0.95
             });
          } else {
            const sigW = 125;
            const sigH = (embeddedVisual.height / embeddedVisual.width) * sigW;
            lastPage.drawImage(embeddedVisual, {
              x: width - 210,
              y: 90,
              width: sigW,
              height: Math.min(sigH, 55),
              opacity: 0.95
            });
          }
        }
      }
    } catch (sigErr) {
      console.warn('Could not embed digital signature into PDF:', sigErr);
    }
  }

  return await pdfDoc.save();
}

/**
 * Generates filled DOCX from template and mappings
 */
export async function generateFromDocxTemplateBytes(
  arrayBuffer: ArrayBuffer,
  data: any,
  mappings?: Record<string, string>
): Promise<Blob> {
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Enrich data with mapped keys
  const enrichedData = { ...data };
  if (mappings) {
    for (const [token, systemKey] of Object.entries(mappings)) {
      const bareToken = token.replace(/[{}]/g, '').trim();
      if (data[systemKey] !== undefined) {
        enrichedData[bareToken] = data[systemKey];
        enrichedData[token] = data[systemKey];
      }
    }
  }

  doc.render(enrichedData);

  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Returns document bytes for live previewing or downloading
 * Supports: PDF, Word (.docx), and Excel (.xlsx -> PDF or filled XLSX)
 */
export async function generateDocumentBytes(
  templateUrl: string,
  data: any,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null,
  fileTypeHint?: 'pdf' | 'docx' | 'xlsx'
): Promise<{ 
  blob: Blob; 
  url: string; 
  extension: 'pdf' | 'docx' | 'xlsx';
  excelUrl?: string;
  pdfUrl?: string;
  isGoogleDriveLink?: boolean;
  googleDriveFileId?: string;
}> {
  if (!templateUrl) {
    const pdfBytes = await createCleanDefaultPdf(data, mappings, signatureDataUrl, letterheadUrl);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { 
      blob, 
      url, 
      extension: 'pdf' 
    };
  }

  const gdriveId = extractGoogleDriveFileId(templateUrl);
  const isGdrive = !!gdriveId || templateUrl.includes('drive.google.com') || templateUrl.includes('docs.google.com');

  try {
    const arrayBuffer = await fetchFile(templateUrl);
    const lowerUrl = templateUrl.toLowerCase();
    const isDocx = fileTypeHint === 'docx' || lowerUrl.includes('.docx');
    const isExcel = fileTypeHint === 'xlsx' || lowerUrl.includes('.xlsx') || lowerUrl.includes('.xls') || lowerUrl.includes('spreadsheet');

    if (isDocx) {
      const blob = await generateFromDocxTemplateBytes(arrayBuffer, data, mappings);
      const url = URL.createObjectURL(blob);
      return { blob, url, extension: 'docx', isGoogleDriveLink: isGdrive, googleDriveFileId: gdriveId || undefined };
    } else if (isExcel) {
      // Fill Excel template data
      const filledExcelBuffer = fillExcelTemplate(arrayBuffer, data, mappings);
      const excelBlob = new Blob([filledExcelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const excelDownloadUrl = URL.createObjectURL(excelBlob);

      let pdfDownloadUrl: string | undefined = undefined;
      try {
        const pdfBytes = await convertExcelToPdfBytes(
          filledExcelBuffer, 
          letterheadUrl, 
          data.subject || data.hospitalName || 'DOKUMEN BERITA ACARA'
        );
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        pdfDownloadUrl = URL.createObjectURL(pdfBlob);
      } catch (pdfErr) {
        console.warn('Could not generate PDF from Excel for preview:', pdfErr);
      }

      return { 
        blob: excelBlob, 
        url: pdfDownloadUrl || excelDownloadUrl, 
        excelUrl: excelDownloadUrl,
        pdfUrl: pdfDownloadUrl,
        extension: 'xlsx', 
        isGoogleDriveLink: isGdrive, 
        googleDriveFileId: gdriveId || undefined 
      };
    } else {
      // PDF Template (with optional Kop Surat letterhead background)
      const pdfBytes = await searchAndReplaceInPdf(arrayBuffer, data, mappings, signatureDataUrl, letterheadUrl);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      return { blob, url, extension: 'pdf', isGoogleDriveLink: isGdrive, googleDriveFileId: gdriveId || undefined };
    }
  } catch (err: any) {
    console.warn('Could not process template directly from URL, fallback to clean PDF generator:', err);
    // Automatic fallback for Google Drive URLs, CORS errors, or HTML pages
    const pdfBytes = await createCleanDefaultPdf(data, mappings, signatureDataUrl, letterheadUrl);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { 
      blob, 
      url, 
      extension: 'pdf', 
      isGoogleDriveLink: true, 
      googleDriveFileId: gdriveId || undefined 
    };
  }
}

/**
 * Main unified document generation and download function
 */
export async function generateDocument(
  templateUrl: string,
  data: any,
  outputFilename: string,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null,
  fileTypeHint?: 'pdf' | 'docx' | 'xlsx'
) {
  const { blob, extension } = await generateDocumentBytes(templateUrl, data, mappings, signatureDataUrl, letterheadUrl, fileTypeHint);
  saveAs(blob, `${outputFilename}.${extension}`);
}
