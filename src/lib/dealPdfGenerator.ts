import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SphQuotation, SphDealData, SphItem } from '../types';
import { formatNumber, formatIndonesianLongDate, angkaTerbilang } from '../utils/sphHelpers';

// Exact Colors Matching the Photos
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.35, 0.35, 0.35);
const COLOR_CYAN = rgb(0 / 255, 162 / 255, 232 / 255); // Official Cyan Blue #00A2E8
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_LIGHT_BG = rgb(0.98, 0.98, 0.98);

// A4 Dimensions (Points: 595.28 x 841.89)
const CM_TO_PT = 28.3465;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 1.3 * CM_TO_PT; // ~37 pt
const MARGIN_RIGHT = 1.3 * CM_TO_PT;
const PRINTABLE_WIDTH = PAGE_WIDTH - MARGIN_X - MARGIN_RIGHT; // ~521 pt
const RIGHT_X = PAGE_WIDTH - MARGIN_RIGHT;

const yFromTop = (cm: number) => PAGE_HEIGHT - (cm * CM_TO_PT);

function safeText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\x7F]/g, '');
}

/**
 * Text wrapper helper
 */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

/**
 * Format simple date for signatures: "Tgl. 14/09/2026"
 */
function formatShortDate(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `Tgl. ${d}/${m}/${now.getFullYear()}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return `Tgl. ${dateStr}`;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `Tgl. ${day}/${month}/${year}`;
  } catch {
    return `Tgl. ${dateStr}`;
  }
}

// ============================================================================
// 1. BUKTI ORDER (BO) PDF GENERATOR (MATCHING FOTO 1)
// ============================================================================
export async function createAuthenticBoPdf(
  pdfDoc: PDFDocument,
  sph: SphQuotation,
  dealData: SphDealData
): Promise<Uint8Array> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  // Top margin 4.25 cm matching SPH for pre-printed letterhead (Kop Surat)
  let contentY = yFromTop(4.25);

  // Top Right: City & Date
  const dealDateFormatted = formatIndonesianLongDate(dealData.dealDate || sph.date, sph.city || 'Surakarta');
  const dateW = fontRegular.widthOfTextAtSize(dealDateFormatted, 9.5);
  page.drawText(dealDateFormatted, {
    x: RIGHT_X - dateW,
    y: contentY,
    size: 9.5,
    font: fontRegular,
    color: COLOR_BLACK
  });

  // Top Left Header
  const headerColX = MARGIN_X;
  const headerColonX = MARGIN_X + 68;
  const headerValX = MARGIN_X + 76;
  const headerRowH = 13.5;

  // Nomor (BO)
  page.drawText('Nomor (BO)', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(dealData.boNumber), { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= headerRowH;

  // Nomor (PO)
  page.drawText('Nomor (PO)', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.sphNumber), { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= headerRowH;

  // Perihal
  page.drawText('Perihal', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('Bukti Order', { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 8;

  // Horizontal divider line
  page.drawLine({
    start: { x: MARGIN_X, y: contentY },
    end: { x: RIGHT_X, y: contentY },
    thickness: 1.2,
    color: COLOR_BLACK
  });
  contentY -= 18;

  // Centered Document Title
  const title1 = 'BUKTI ORDER / PESANAN';
  const title1W = fontBold.widthOfTextAtSize(title1, 14);
  const title1X = (PAGE_WIDTH - title1W) / 2;
  page.drawText(title1, {
    x: title1X,
    y: contentY,
    size: 14,
    font: fontBold,
    color: COLOR_BLACK
  });
  // Underline for title
  page.drawLine({
    start: { x: title1X, y: contentY - 2 },
    end: { x: title1X + title1W, y: contentY - 2 },
    thickness: 1,
    color: COLOR_BLACK
  });

  contentY -= 14;
  const subTitle = 'Evidence Order';
  const subTitleW = fontItalic.widthOfTextAtSize(subTitle, 10.5);
  page.drawText(subTitle, {
    x: (PAGE_WIDTH - subTitleW) / 2,
    y: contentY,
    size: 10.5,
    font: fontItalic,
    color: COLOR_BLACK
  });
  contentY -= 20;

  // Kepada Yth:
  page.drawText('Kepada Yth:', { x: MARGIN_X, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  contentY -= 14;
  page.drawText(safeText(sph.hospitalName), { x: MARGIN_X, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 13;

  // Hospital Address lines
  const addrLines = wrapText(safeText(sph.hospitalAddress || '-'), fontRegular, 8.5, 340);
  addrLines.forEach((line) => {
    page.drawText(line, { x: MARGIN_X, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
    contentY -= 11.5;
  });

  // Up:
  page.drawText(`Up: ${safeText(dealData.customerPic || sph.hospitalPic || sph.recipientRole || 'Direktur')}`, {
    x: MARGIN_X,
    y: contentY,
    size: 9,
    font: fontRegular,
    color: COLOR_BLACK
  });
  contentY -= 16;

  // Intro text
  const introTxt = 'Persetujuan pelanggan barang/jasa dengan harga dan rincian sebagai berikut:';
  page.drawText(introTxt, { x: MARGIN_X, y: contentY, size: 9, font: fontRegular, color: COLOR_BLACK });
  contentY -= 8;

  // ==================== TABEL ITEM BUKTI ORDER (5 KOLOM) ====================
  // Columns: No (28), Diskripsi (235), Qty (unit) (40), Satuan Harga (105), Total Harga (113) -> Total = 521 pt
  const colW = [28, 235, 40, 105, 113];
  const colX = [
    MARGIN_X,
    MARGIN_X + colW[0],
    MARGIN_X + colW[0] + colW[1],
    MARGIN_X + colW[0] + colW[1] + colW[2],
    MARGIN_X + colW[0] + colW[1] + colW[2] + colW[3]
  ];

  const headerH = 22;
  // Header background rectangle
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - headerH,
    width: PRINTABLE_WIDTH,
    height: headerH,
    color: COLOR_CYAN,
    borderColor: COLOR_BLACK,
    borderWidth: 0.8
  });

  // Vertical column borders for header
  for (let i = 1; i < colX.length; i++) {
    page.drawLine({
      start: { x: colX[i], y: contentY },
      end: { x: colX[i], y: contentY - headerH },
      thickness: 0.8,
      color: COLOR_BLACK
    });
  }

  // Header Texts
  // 1. No.
  const hNoW = fontBold.widthOfTextAtSize('No.', 9);
  page.drawText('No.', { x: colX[0] + (colW[0] - hNoW) / 2, y: contentY - 14, size: 9, font: fontBold, color: COLOR_WHITE });

  // 2. Diskripsi
  const hDisW = fontBold.widthOfTextAtSize('Diskripsi', 9.5);
  page.drawText('Diskripsi', { x: colX[1] + (colW[1] - hDisW) / 2, y: contentY - 14, size: 9.5, font: fontBold, color: COLOR_WHITE });

  // 3. Qty (unit) (2 lines)
  const hQty1W = fontBold.widthOfTextAtSize('Qty', 8.5);
  const hQty2W = fontBold.widthOfTextAtSize('(unit)', 7.5);
  page.drawText('Qty', { x: colX[2] + (colW[2] - hQty1W) / 2, y: contentY - 9.5, size: 8.5, font: fontBold, color: COLOR_WHITE });
  page.drawText('(unit)', { x: colX[2] + (colW[2] - hQty2W) / 2, y: contentY - 18, size: 7.5, font: fontBold, color: COLOR_WHITE });

  // 4. Satuan Harga
  const hSatW = fontBold.widthOfTextAtSize('Satuan Harga', 9);
  page.drawText('Satuan Harga', { x: colX[3] + (colW[3] - hSatW) / 2, y: contentY - 14, size: 9, font: fontBold, color: COLOR_WHITE });

  // 5. Total Harga
  const hTotW = fontBold.widthOfTextAtSize('Total Harga', 9);
  page.drawText('Total Harga', { x: colX[4] + (colW[4] - hTotW) / 2, y: contentY - 14, size: 9, font: fontBold, color: COLOR_WHITE });

  contentY -= headerH;

  // Table Items
  let totalUnits = 0;
  const items = sph.items || [];
  items.forEach((item, index) => {
    totalUnits += (item.quantity || 1);
    const descLines = wrapText(safeText(item.description), fontRegular, 9, colW[1] - 10);
    const rowH = Math.max(16, descLines.length * 11.5 + 5);

    // Row Background & outer rectangle
    page.drawRectangle({
      x: MARGIN_X,
      y: contentY - rowH,
      width: PRINTABLE_WIDTH,
      height: rowH,
      color: COLOR_WHITE,
      borderColor: COLOR_BLACK,
      borderWidth: 0.6
    });

    // Vertical line dividers
    for (let i = 1; i < colX.length; i++) {
      page.drawLine({
        start: { x: colX[i], y: contentY },
        end: { x: colX[i], y: contentY - rowH },
        thickness: 0.6,
        color: COLOR_BLACK
      });
    }

    const baselineY = contentY - 11.5;

    // Col 0: No.
    const noStr = String(index + 1);
    const noW = fontRegular.widthOfTextAtSize(noStr, 9);
    page.drawText(noStr, { x: colX[0] + (colW[0] - noW) / 2, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    // Col 1: Diskripsi
    descLines.forEach((dL, dIdx) => {
      page.drawText(dL, { x: colX[1] + 5, y: baselineY - (dIdx * 11), size: 9, font: fontRegular, color: COLOR_BLACK });
    });

    // Col 2: Qty (unit)
    const qtyStr = String(item.quantity || 1);
    const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 9);
    page.drawText(qtyStr, { x: colX[2] + (colW[2] - qtyW) / 2, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    // Col 3: Satuan Harga (Rp + right aligned amount)
    page.drawText('Rp', { x: colX[3] + 4, y: baselineY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
    const uPriceStr = formatNumber(item.unitPrice);
    const uPriceW = fontRegular.widthOfTextAtSize(uPriceStr, 9);
    page.drawText(uPriceStr, { x: colX[3] + colW[3] - uPriceW - 6, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    // Col 4: Total Harga (Rp + right aligned amount)
    page.drawText('Rp', { x: colX[4] + 4, y: baselineY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
    const tPriceStr = formatNumber(item.totalPrice);
    const tPriceW = fontRegular.widthOfTextAtSize(tPriceStr, 9);
    page.drawText(tPriceStr, { x: colX[4] + colW[4] - tPriceW - 6, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    contentY -= rowH;
  });

  // ==================== SUMMARY SECTION (EXACT AS IN FOTO 1) ====================
  // Summary Row 1: Terbilang header (Cyan) | Qty total | Total 1 label | Total 1 Rp amount
  const sumRowH = 15;
  
  // Terbilang label cell (spanning col 0 and 1)
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - sumRowH,
    width: colW[0] + colW[1],
    height: sumRowH,
    color: COLOR_CYAN,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  page.drawText('Terbilang:', { x: MARGIN_X + 5, y: contentY - 11, size: 9, font: fontItalic, color: COLOR_WHITE });

  // Total Qty cell (col 2)
  page.drawRectangle({
    x: colX[2],
    y: contentY - sumRowH,
    width: colW[2],
    height: sumRowH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  const totQtyStr = String(totalUnits);
  const totQtyW = fontRegular.widthOfTextAtSize(totQtyStr, 9);
  page.drawText(totQtyStr, { x: colX[2] + (colW[2] - totQtyW) / 2, y: contentY - 11, size: 9, font: fontRegular, color: COLOR_BLACK });

  // Total 1 / Sub Total label cell (col 3) - BOLD
  page.drawRectangle({
    x: colX[3],
    y: contentY - sumRowH,
    width: colW[3],
    height: sumRowH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  const t1Label = 'Sub Total';
  const t1LabelW = fontBold.widthOfTextAtSize(t1Label, 9);
  page.drawText(t1Label, { x: colX[3] + colW[3] - t1LabelW - 6, y: contentY - 11, size: 9, font: fontBold, color: COLOR_BLACK });

  // Sub Total value cell (col 4) - BOLD
  page.drawRectangle({
    x: colX[4],
    y: contentY - sumRowH,
    width: colW[4],
    height: sumRowH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  page.drawText('Rp', { x: colX[4] + 4, y: contentY - 11, size: 8.5, font: fontBold, color: COLOR_BLACK });
  const sub1Str = formatNumber(sph.subtotal1);
  const sub1W = fontBold.widthOfTextAtSize(sub1Str, 9);
  page.drawText(sub1Str, { x: colX[4] + colW[4] - sub1W - 6, y: contentY - 11, size: 9, font: fontBold, color: COLOR_BLACK });

  contentY -= sumRowH;

  // Summary Rows: Akomodasi, Total (Bold), PPN, GRAND TOTAL (Cyan, Bold)
  const ppnRateText = sph.ppnPercent ? `PPN ${sph.ppnPercent}%` : 'PPN 11%';
  const ppnVal = sph.ppnAmount || 0;
  const total2Val = sph.subtotal2 || (sph.subtotal1 + ppnVal);
  const acomVal = sph.accommodationFee || 0;
  const grandTotalVal = sph.grandTotal;

  const rightRows: Array<{ label: string; amount: string; isBold?: boolean; isGrand?: boolean }> = [];
  rightRows.push({ label: 'Akomodasi', amount: formatNumber(acomVal), isBold: false, isGrand: false });
  rightRows.push({ label: 'Total', amount: formatNumber(total2Val), isBold: true, isGrand: false });
  rightRows.push({ label: ppnRateText, amount: formatNumber(ppnVal), isBold: false, isGrand: false });
  rightRows.push({ label: 'GRAND TOTAL', amount: formatNumber(grandTotalVal), isBold: true, isGrand: true });

  const terbBoxHeight = rightRows.length * sumRowH;
  const terbBoxWidth = colW[0] + colW[1] + colW[2]; // Spanning col 0, 1, and 2

  // Terbilang Text Box (Left side)
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - terbBoxHeight,
    width: terbBoxWidth,
    height: terbBoxHeight,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });

  const fullTerbilang = `"${sph.terbilang || angkaTerbilang(grandTotalVal)}"`;
  const terbLines = wrapText(fullTerbilang, fontBoldItalic, 8.5, terbBoxWidth - 16);
  const terbStartY = contentY - (terbBoxHeight / 2) + ((terbLines.length - 1) * 6);
  terbLines.forEach((tLine, tIdx) => {
    const tW = fontBoldItalic.widthOfTextAtSize(tLine, 8.5);
    const tX = MARGIN_X + (terbBoxWidth - tW) / 2;
    page.drawText(tLine, { x: tX, y: terbStartY - (tIdx * 12), size: 8.5, font: fontBoldItalic, color: COLOR_BLACK });
  });

  // Draw Right-side rows
  let curRightY = contentY;
  rightRows.forEach((r) => {
    const cellFont = (r.isGrand || r.isBold) ? fontBold : fontRegular;
    // Label cell (col 3)
    page.drawRectangle({
      x: colX[3],
      y: curRightY - sumRowH,
      width: colW[3],
      height: sumRowH,
      color: r.isGrand ? COLOR_CYAN : COLOR_WHITE,
      borderColor: COLOR_BLACK,
      borderWidth: 0.6
    });
    const lW = cellFont.widthOfTextAtSize(r.label, 9);
    page.drawText(r.label, {
      x: colX[3] + colW[3] - lW - 6,
      y: curRightY - 11,
      size: 9,
      font: cellFont,
      color: r.isGrand ? COLOR_WHITE : COLOR_BLACK
    });

    // Value cell (col 4)
    page.drawRectangle({
      x: colX[4],
      y: curRightY - sumRowH,
      width: colW[4],
      height: sumRowH,
      color: r.isGrand ? COLOR_CYAN : COLOR_WHITE,
      borderColor: COLOR_BLACK,
      borderWidth: 0.6
    });
    page.drawText('Rp', { x: colX[4] + 4, y: curRightY - 11, size: 8.5, font: cellFont, color: r.isGrand ? COLOR_WHITE : COLOR_BLACK });
    const aW = cellFont.widthOfTextAtSize(r.amount, 9);
    page.drawText(r.amount, {
      x: colX[4] + colW[4] - aW - 6,
      y: curRightY - 11,
      size: 9,
      font: cellFont,
      color: r.isGrand ? COLOR_WHITE : COLOR_BLACK
    });

    curRightY -= sumRowH;
  });

  contentY -= terbBoxHeight;
  contentY -= 8;

  // Post-table closing sentence
  const outroTxt = 'Demikian surat bukti order ini terimakasih kami dipilih menjadi rekanan.';
  page.drawText(outroTxt, { x: MARGIN_X, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 14;

  // ==================== BOTTOM SECTION (TRANSFER INFO & SIGNATURES) ====================
  const bottomSectionStartY = contentY;
  const infoColX = MARGIN_X;
  const infoColonX = MARGIN_X + 80;
  const infoValX = MARGIN_X + 88;
  const infoRowH = 12.5;

  // Transfer Pembayaran: (Bold, Underlined)
  const tpTitle = 'Transfer Pembayaran:';
  page.drawText(tpTitle, { x: infoColX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  const tpW = fontBold.widthOfTextAtSize(tpTitle, 9);
  page.drawLine({ start: { x: infoColX, y: contentY - 1.5 }, end: { x: infoColX + tpW, y: contentY - 1.5 }, thickness: 0.8, color: COLOR_BLACK });
  contentY -= infoRowH;

  // Nama Bank
  page.drawText('Nama Bank', { x: infoColX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: infoColonX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('Mandiri', { x: infoValX, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= infoRowH;

  // Nomor Rekening
  page.drawText('Nomor Rekening', { x: infoColX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: infoColonX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('138-00-2610846-9 (SARANA MULTI KALIBRASI PT)', { x: infoValX, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= infoRowH;

  // Nama Perusahaan
  page.drawText('Nama Perusahaan', { x: infoColX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: infoColonX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('PT. SARANA MULTI KALIBRASI', { x: infoValX, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= infoRowH;

  // Nomor NPWP
  page.drawText('Nomor NPWP', { x: infoColX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: infoColonX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('039.20 1.850.3-526.000', { x: infoValX, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= (infoRowH + 2);

  // SERTIFIKAT: (Bold, Underlined)
  const sertTitle = 'SERTIFIKAT:';
  page.drawText(sertTitle, { x: infoColX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  const sertW = fontBold.widthOfTextAtSize(sertTitle, 9);
  page.drawLine({ start: { x: infoColX, y: contentY - 1.5 }, end: { x: infoColX + sertW, y: contentY - 1.5 }, thickness: 0.8, color: COLOR_BLACK });
  contentY -= infoRowH;

  // Nama & Alamat Sertifikat
  const certName = dealData.certificateOwner || sph.hospitalName;
  page.drawText('Nama:', { x: infoColX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(certName), { x: infoValX, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= infoRowH;

  page.drawText('Alamat:', { x: infoColX, y: contentY, size: 8.5, font: fontBold, color: COLOR_BLACK });
  const certAddrLines = wrapText(safeText(sph.hospitalAddress || '-'), fontRegular, 8, 230);
  certAddrLines.forEach((cLine, idx) => {
    page.drawText(cLine, { x: infoValX, y: contentY - (idx * 10.5), size: 8, font: fontRegular, color: COLOR_BLACK });
  });

  // ==================== SIGNATURES (RIGHT SIDE OF BO) ====================
  // 2 Columns: Pemesan vs Penerima
  const sigStartY = bottomSectionStartY;
  const sig1X = MARGIN_X + 320;
  const sig2X = MARGIN_X + 415;
  const sigLineW = 85;

  page.drawText('Pemesan:', { x: sig1X, y: sigStartY, size: 9, font: fontBold, color: COLOR_BLACK });
  page.drawText('Pelanggan', { x: sig1X, y: sigStartY - 10, size: 7.5, font: fontItalic, color: COLOR_MUTED });

  page.drawText('Penerima:', { x: sig2X, y: sigStartY, size: 9, font: fontBold, color: COLOR_BLACK });

  // Signature Name & Line
  const sigBottomY = sigStartY - 55;
  const recipientName = dealData.recipientName || 'Fitri Nur Aini';
  const recW = fontRegular.widthOfTextAtSize(recipientName, 8);
  page.drawText(recipientName, { x: sig2X + (sigLineW - recW) / 2, y: sigBottomY + 3, size: 8, font: fontRegular, color: COLOR_BLACK });

  // Horizontal signature lines
  page.drawLine({ start: { x: sig1X, y: sigBottomY }, end: { x: sig1X + sigLineW, y: sigBottomY }, thickness: 0.8, color: COLOR_BLACK });
  page.drawLine({ start: { x: sig2X, y: sigBottomY }, end: { x: sig2X + sigLineW, y: sigBottomY }, thickness: 0.8, color: COLOR_BLACK });

  // Dates below signature lines
  const shortDateStr = formatShortDate(dealData.dealDate || sph.date);
  page.drawText(shortDateStr, { x: sig1X, y: sigBottomY - 11, size: 8, font: fontItalic, color: COLOR_BLACK });
  page.drawText(shortDateStr, { x: sig2X, y: sigBottomY - 11, size: 8, font: fontItalic, color: COLOR_BLACK });

  return await pdfDoc.save();
}

// ============================================================================
// 2. FAKTUR PENJUALAN (FP / INVOICE) PDF GENERATOR (MATCHING FOTO 2)
// ============================================================================
export async function createAuthenticFpPdf(
  pdfDoc: PDFDocument,
  sph: SphQuotation,
  dealData: SphDealData
): Promise<Uint8Array> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  // Top margin 4.25 cm matching SPH for pre-printed letterhead (Kop Surat)
  let contentY = yFromTop(4.25);

  // Top Right: City & Date
  const dealDateFormatted = formatIndonesianLongDate(dealData.dealDate || sph.date, sph.city || 'Surakarta');
  const dateW = fontRegular.widthOfTextAtSize(dealDateFormatted, 9.5);
  page.drawText(dealDateFormatted, {
    x: RIGHT_X - dateW,
    y: contentY,
    size: 9.5,
    font: fontRegular,
    color: COLOR_BLACK
  });

  // Top Left Header
  const headerColX = MARGIN_X;
  const headerColonX = MARGIN_X + 68;
  const headerValX = MARGIN_X + 76;
  const headerRowH = 13.5;

  // Nomor (FP)
  page.drawText('Nomor (FP)', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(dealData.fpNumber), { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= headerRowH;

  // Nomor (PO)
  page.drawText('Nomor (PO)', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.sphNumber), { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= headerRowH;

  // Perihal
  page.drawText('Perihal', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('Faktur Penjualan', { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 8;

  // Horizontal divider line
  page.drawLine({
    start: { x: MARGIN_X, y: contentY },
    end: { x: RIGHT_X, y: contentY },
    thickness: 1.2,
    color: COLOR_BLACK
  });
  contentY -= 18;

  // Centered Document Title
  const title1 = 'FAKTUR PENJUALAN';
  const title1W = fontBold.widthOfTextAtSize(title1, 14);
  const title1X = (PAGE_WIDTH - title1W) / 2;
  page.drawText(title1, {
    x: title1X,
    y: contentY,
    size: 14,
    font: fontBold,
    color: COLOR_BLACK
  });
  // Underline for title
  page.drawLine({
    start: { x: title1X, y: contentY - 2 },
    end: { x: title1X + title1W, y: contentY - 2 },
    thickness: 1,
    color: COLOR_BLACK
  });

  contentY -= 14;
  const subTitle = 'INVOICE';
  const subTitleW = fontItalic.widthOfTextAtSize(subTitle, 10.5);
  page.drawText(subTitle, {
    x: (PAGE_WIDTH - subTitleW) / 2,
    y: contentY,
    size: 10.5,
    font: fontItalic,
    color: COLOR_BLACK
  });
  contentY -= 20;

  // Kepada Yth:
  page.drawText('Kepada Yth:', { x: MARGIN_X, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  contentY -= 14;
  page.drawText(safeText(sph.hospitalName), { x: MARGIN_X, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 13;

  // Hospital Address lines
  const addrLines = wrapText(safeText(sph.hospitalAddress || '-'), fontRegular, 8.5, 340);
  addrLines.forEach((line) => {
    page.drawText(line, { x: MARGIN_X, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
    contentY -= 11.5;
  });

  // Up:
  page.drawText(`Up: ${safeText(dealData.customerPic || sph.hospitalPic || sph.recipientRole || 'Direktur')}`, {
    x: MARGIN_X,
    y: contentY,
    size: 9,
    font: fontRegular,
    color: COLOR_BLACK
  });
  contentY -= 16;

  // Intro text
  const introTxt = 'Persetujuan pelanggan barang/jasa dengan harga dan rincian sebagai berikut:';
  page.drawText(introTxt, { x: MARGIN_X, y: contentY, size: 9, font: fontRegular, color: COLOR_BLACK });
  contentY -= 8;

  // ==================== TABEL ITEM FAKTUR PENJUALAN ====================
  const colW = [28, 235, 40, 105, 113];
  const colX = [
    MARGIN_X,
    MARGIN_X + colW[0],
    MARGIN_X + colW[0] + colW[1],
    MARGIN_X + colW[0] + colW[1] + colW[2],
    MARGIN_X + colW[0] + colW[1] + colW[2] + colW[3]
  ];

  const headerH = 22;
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - headerH,
    width: PRINTABLE_WIDTH,
    height: headerH,
    color: COLOR_CYAN,
    borderColor: COLOR_BLACK,
    borderWidth: 0.8
  });

  for (let i = 1; i < colX.length; i++) {
    page.drawLine({
      start: { x: colX[i], y: contentY },
      end: { x: colX[i], y: contentY - headerH },
      thickness: 0.8,
      color: COLOR_BLACK
    });
  }

  // Header Texts
  const hNoW = fontBold.widthOfTextAtSize('No.', 9);
  page.drawText('No.', { x: colX[0] + (colW[0] - hNoW) / 2, y: contentY - 14, size: 9, font: fontBold, color: COLOR_WHITE });

  const hDisW = fontBold.widthOfTextAtSize('Diskripsi', 9.5);
  page.drawText('Diskripsi', { x: colX[1] + (colW[1] - hDisW) / 2, y: contentY - 14, size: 9.5, font: fontBold, color: COLOR_WHITE });

  const hQty1W = fontBold.widthOfTextAtSize('Qty', 8.5);
  const hQty2W = fontBold.widthOfTextAtSize('(unit)', 7.5);
  page.drawText('Qty', { x: colX[2] + (colW[2] - hQty1W) / 2, y: contentY - 9.5, size: 8.5, font: fontBold, color: COLOR_WHITE });
  page.drawText('(unit)', { x: colX[2] + (colW[2] - hQty2W) / 2, y: contentY - 18, size: 7.5, font: fontBold, color: COLOR_WHITE });

  const hSatW = fontBold.widthOfTextAtSize('Satuan Harga', 9);
  page.drawText('Satuan Harga', { x: colX[3] + (colW[3] - hSatW) / 2, y: contentY - 14, size: 9, font: fontBold, color: COLOR_WHITE });

  const hTotW = fontBold.widthOfTextAtSize('Total Harga', 9);
  page.drawText('Total Harga', { x: colX[4] + (colW[4] - hTotW) / 2, y: contentY - 14, size: 9, font: fontBold, color: COLOR_WHITE });

  contentY -= headerH;

  // Items
  let totalUnits = 0;
  const items = sph.items || [];
  items.forEach((item, index) => {
    totalUnits += (item.quantity || 1);
    const descLines = wrapText(safeText(item.description), fontRegular, 9, colW[1] - 10);
    const rowH = Math.max(16, descLines.length * 11.5 + 5);

    page.drawRectangle({
      x: MARGIN_X,
      y: contentY - rowH,
      width: PRINTABLE_WIDTH,
      height: rowH,
      color: COLOR_WHITE,
      borderColor: COLOR_BLACK,
      borderWidth: 0.6
    });

    for (let i = 1; i < colX.length; i++) {
      page.drawLine({
        start: { x: colX[i], y: contentY },
        end: { x: colX[i], y: contentY - rowH },
        thickness: 0.6,
        color: COLOR_BLACK
      });
    }

    const baselineY = contentY - 11.5;

    // No.
    const noStr = String(index + 1);
    const noW = fontRegular.widthOfTextAtSize(noStr, 9);
    page.drawText(noStr, { x: colX[0] + (colW[0] - noW) / 2, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    // Diskripsi
    descLines.forEach((dL, dIdx) => {
      page.drawText(dL, { x: colX[1] + 5, y: baselineY - (dIdx * 11), size: 9, font: fontRegular, color: COLOR_BLACK });
    });

    // Qty
    const qtyStr = String(item.quantity || 1);
    const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 9);
    page.drawText(qtyStr, { x: colX[2] + (colW[2] - qtyW) / 2, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    // Satuan Harga
    page.drawText('Rp', { x: colX[3] + 4, y: baselineY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
    const uPriceStr = formatNumber(item.unitPrice);
    const uPriceW = fontRegular.widthOfTextAtSize(uPriceStr, 9);
    page.drawText(uPriceStr, { x: colX[3] + colW[3] - uPriceW - 6, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    // Total Harga
    page.drawText('Rp', { x: colX[4] + 4, y: baselineY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
    const tPriceStr = formatNumber(item.totalPrice);
    const tPriceW = fontRegular.widthOfTextAtSize(tPriceStr, 9);
    page.drawText(tPriceStr, { x: colX[4] + colW[4] - tPriceW - 6, y: baselineY, size: 9, font: fontRegular, color: COLOR_BLACK });

    contentY -= rowH;
  });

  // Summary Row 1: Terbilang header (Cyan) | Qty | Total 1
  const sumRowH = 15;
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - sumRowH,
    width: colW[0] + colW[1],
    height: sumRowH,
    color: COLOR_CYAN,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  page.drawText('Terbilang:', { x: MARGIN_X + 5, y: contentY - 11, size: 9, font: fontItalic, color: COLOR_WHITE });

  page.drawRectangle({
    x: colX[2],
    y: contentY - sumRowH,
    width: colW[2],
    height: sumRowH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  const totQtyStr = String(totalUnits);
  const totQtyW = fontRegular.widthOfTextAtSize(totQtyStr, 9);
  page.drawText(totQtyStr, { x: colX[2] + (colW[2] - totQtyW) / 2, y: contentY - 11, size: 9, font: fontRegular, color: COLOR_BLACK });

  // Sub Total label cell (col 3) - BOLD
  page.drawRectangle({
    x: colX[3],
    y: contentY - sumRowH,
    width: colW[3],
    height: sumRowH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  const t1Label = 'Sub Total';
  const t1LabelW = fontBold.widthOfTextAtSize(t1Label, 9);
  page.drawText(t1Label, { x: colX[3] + colW[3] - t1LabelW - 6, y: contentY - 11, size: 9, font: fontBold, color: COLOR_BLACK });

  // Sub Total value cell (col 4) - BOLD
  page.drawRectangle({
    x: colX[4],
    y: contentY - sumRowH,
    width: colW[4],
    height: sumRowH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  page.drawText('Rp', { x: colX[4] + 4, y: contentY - 11, size: 8.5, font: fontBold, color: COLOR_BLACK });
  const sub1Str = formatNumber(sph.subtotal1);
  const sub1W = fontBold.widthOfTextAtSize(sub1Str, 9);
  page.drawText(sub1Str, { x: colX[4] + colW[4] - sub1W - 6, y: contentY - 11, size: 9, font: fontBold, color: COLOR_BLACK });

  contentY -= sumRowH;

  // Summary Rows: Discount (if any), Akomodasi, Total (Bold), PPN, GRAND TOTAL (Cyan, Bold)
  const ppnRateText = sph.ppnPercent ? `PPN ${sph.ppnPercent}%` : 'PPN 11%';
  const ppnVal = sph.ppnAmount || 0;
  const total2Val = sph.subtotal2 || (sph.subtotal1 + ppnVal);
  const acomVal = sph.accommodationFee || 0;
  const grandTotalVal = sph.grandTotal;

  const rightRows: Array<{ label: string; amount: string; isBold?: boolean; isGrand?: boolean }> = [];
  rightRows.push({ label: 'Akomodasi', amount: formatNumber(acomVal), isBold: false, isGrand: false });
  rightRows.push({ label: 'Total', amount: formatNumber(total2Val), isBold: true, isGrand: false });
  rightRows.push({ label: ppnRateText, amount: formatNumber(ppnVal), isBold: false, isGrand: false });
  rightRows.push({ label: 'GRAND TOTAL', amount: formatNumber(grandTotalVal), isBold: true, isGrand: true });

  const terbBoxHeight = rightRows.length * sumRowH;
  const terbBoxWidth = colW[0] + colW[1] + colW[2];

  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - terbBoxHeight,
    width: terbBoxWidth,
    height: terbBoxHeight,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });

  const fullTerbilang = `"${sph.terbilang || angkaTerbilang(grandTotalVal)}"`;
  const terbLines = wrapText(fullTerbilang, fontBoldItalic, 8.5, terbBoxWidth - 16);
  const terbStartY = contentY - (terbBoxHeight / 2) + ((terbLines.length - 1) * 6);
  terbLines.forEach((tLine, tIdx) => {
    const tW = fontBoldItalic.widthOfTextAtSize(tLine, 8.5);
    const tX = MARGIN_X + (terbBoxWidth - tW) / 2;
    page.drawText(tLine, { x: tX, y: terbStartY - (tIdx * 12), size: 8.5, font: fontBoldItalic, color: COLOR_BLACK });
  });

  let curRightY = contentY;
  rightRows.forEach((r) => {
    const cellFont = (r.isGrand || r.isBold) ? fontBold : fontRegular;
    page.drawRectangle({
      x: colX[3],
      y: curRightY - sumRowH,
      width: colW[3],
      height: sumRowH,
      color: r.isGrand ? COLOR_CYAN : COLOR_WHITE,
      borderColor: COLOR_BLACK,
      borderWidth: 0.6
    });
    const lW = cellFont.widthOfTextAtSize(r.label, 9);
    page.drawText(r.label, {
      x: colX[3] + colW[3] - lW - 6,
      y: curRightY - 11,
      size: 9,
      font: cellFont,
      color: r.isGrand ? COLOR_WHITE : COLOR_BLACK
    });

    page.drawRectangle({
      x: colX[4],
      y: curRightY - sumRowH,
      width: colW[4],
      height: sumRowH,
      color: r.isGrand ? COLOR_CYAN : COLOR_WHITE,
      borderColor: COLOR_BLACK,
      borderWidth: 0.6
    });
    page.drawText('Rp', { x: colX[4] + 4, y: curRightY - 11, size: 8.5, font: cellFont, color: r.isGrand ? COLOR_WHITE : COLOR_BLACK });
    const aW = cellFont.widthOfTextAtSize(r.amount, 9);
    page.drawText(r.amount, {
      x: colX[4] + colW[4] - aW - 6,
      y: curRightY - 11,
      size: 9,
      font: cellFont,
      color: r.isGrand ? COLOR_WHITE : COLOR_BLACK
    });

    curRightY -= sumRowH;
  });

  contentY -= terbBoxHeight;
  contentY -= 8;

  // Post-table sentence
  const outroTxt = 'Demikian faktur penjualan ini di sampaikan atas perhatian dan kerjasamanya kami ucapkan terimakasih.';
  page.drawText(outroTxt, { x: MARGIN_X, y: contentY, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 14;

  // ==================== TRANSFER PEMBAYARAN BOX (MATCHING FOTO 2) ====================
  const tpBoxH = 46;
  const tpBoxW = PRINTABLE_WIDTH;
  
  // Title above / top of box
  page.drawText('Transfer Pembayaran:', { x: MARGIN_X, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  contentY -= 4;

  // Outer border box with dashed / solid border
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - tpBoxH,
    width: tpBoxW,
    height: tpBoxH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.8
  });

  // Middle divider line
  page.drawLine({
    start: { x: MARGIN_X + (tpBoxW / 2) - 30, y: contentY },
    end: { x: MARGIN_X + (tpBoxW / 2) - 30, y: contentY - tpBoxH },
    thickness: 0.6,
    color: COLOR_BLACK
  });

  const b1X = MARGIN_X + 6;
  const b1ColonX = MARGIN_X + 85;
  const b1ValX = MARGIN_X + 92;

  const b2X = MARGIN_X + (tpBoxW / 2) - 22;
  const b2ColonX = MARGIN_X + (tpBoxW / 2) + 72;
  const b2ValX = MARGIN_X + (tpBoxW / 2) + 80;

  // Row 1 inside box
  const tpRow1Y = contentY - 14;
  page.drawText('Nama Bank', { x: b1X, y: tpRow1Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: b1ColonX, y: tpRow1Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('Mandiri', { x: b1ValX, y: tpRow1Y, size: 8.5, font: fontRegular, color: COLOR_BLACK });

  page.drawText('Nama Perusahaan', { x: b2X, y: tpRow1Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: b2ColonX, y: tpRow1Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('PT. SARANA MULTI KALIBRASI', { x: b2ValX, y: tpRow1Y, size: 8.5, font: fontRegular, color: COLOR_BLACK });

  // Row 2 inside box
  const tpRow2Y = contentY - 28;
  page.drawText('Nomor Rekening', { x: b1X, y: tpRow2Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: b1ColonX, y: tpRow2Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('138-00-2610846-9', { x: b1ValX, y: tpRow2Y, size: 8.5, font: fontRegular, color: COLOR_BLACK });
  page.drawText('(SARANA MULTI KALIBRASI PT)', { x: b1ValX, y: tpRow2Y - 10, size: 7.5, font: fontRegular, color: COLOR_BLACK });

  page.drawText('Nomor NPWP', { x: b2X, y: tpRow2Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: b2ColonX, y: tpRow2Y, size: 8.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('039.20 1.850.3-526.000', { x: b2ValX, y: tpRow2Y, size: 8.5, font: fontRegular, color: COLOR_BLACK });

  contentY -= (tpBoxH + 16);

  // ==================== SIGNATURES (3 COLUMNS: MATCHING FOTO 2) ====================
  // Pembuat (Administrasi) | Disetujui (Direktur) | Penerima (RS)
  const colSigW = 105;
  const sig1ColX = MARGIN_X + 15;
  const sig2ColX = MARGIN_X + 175;
  const sig3ColX = MARGIN_X + 335;

  page.drawText('Pembuat:', { x: sig1ColX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  page.drawText('Administrasi', { x: sig1ColX, y: contentY - 10, size: 7.5, font: fontItalic, color: COLOR_MUTED });

  page.drawText('Disetujui:', { x: sig2ColX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  page.drawText('Direktur', { x: sig2ColX, y: contentY - 10, size: 7.5, font: fontItalic, color: COLOR_MUTED });

  page.drawText('Penerima:', { x: sig3ColX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.hospitalName), { x: sig3ColX, y: contentY - 10, size: 7.5, font: fontItalic, color: COLOR_MUTED });

  const sigBottomY = contentY - 55;

  // Names above lines
  const creatorName = dealData.recipientName || 'Fitri Nur Aini';
  const directorName = sph.directorName || 'Ahmad Fajar Ariyanto';
  page.drawText(creatorName, { x: sig1ColX, y: sigBottomY + 3, size: 8, font: fontRegular, color: COLOR_BLACK });
  page.drawText(directorName, { x: sig2ColX, y: sigBottomY + 3, size: 8, font: fontRegular, color: COLOR_BLACK });
  page.drawText('.', { x: sig3ColX, y: sigBottomY + 3, size: 8, font: fontRegular, color: COLOR_BLACK });

  // Lines
  page.drawLine({ start: { x: sig1ColX, y: sigBottomY }, end: { x: sig1ColX + colSigW, y: sigBottomY }, thickness: 0.8, color: COLOR_BLACK });
  page.drawLine({ start: { x: sig2ColX, y: sigBottomY }, end: { x: sig2ColX + colSigW, y: sigBottomY }, thickness: 0.8, color: COLOR_BLACK });
  page.drawLine({ start: { x: sig3ColX, y: sigBottomY }, end: { x: sig3ColX + colSigW, y: sigBottomY }, thickness: 0.8, color: COLOR_BLACK });

  // Dates
  const shortDateStr = formatShortDate(dealData.dealDate || sph.date);
  page.drawText(shortDateStr, { x: sig1ColX, y: sigBottomY - 11, size: 8, font: fontItalic, color: COLOR_BLACK });
  page.drawText(shortDateStr, { x: sig2ColX, y: sigBottomY - 11, size: 8, font: fontItalic, color: COLOR_BLACK });
  page.drawText(shortDateStr, { x: sig3ColX, y: sigBottomY - 11, size: 8, font: fontItalic, color: COLOR_BLACK });

  return await pdfDoc.save();
}

// ============================================================================
// 3. KWITANSI PEMBAYARAN (KW) PDF GENERATOR (MATCHING FOTO 3)
// ============================================================================
export async function createAuthenticKwpPdf(
  pdfDoc: PDFDocument,
  sph: SphQuotation,
  dealData: SphDealData
): Promise<Uint8Array> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  // Top margin 4.25 cm matching SPH for pre-printed letterhead (Kop Surat)
  let contentY = yFromTop(4.25);

  // Top Right: City & Date
  const dealDateFormatted = formatIndonesianLongDate(dealData.dealDate || sph.date, sph.city || 'Surakarta');
  const dateW = fontRegular.widthOfTextAtSize(dealDateFormatted, 9.5);
  page.drawText(dealDateFormatted, {
    x: RIGHT_X - dateW,
    y: contentY,
    size: 9.5,
    font: fontRegular,
    color: COLOR_BLACK
  });

  // Top Left Header
  const headerColX = MARGIN_X;
  const headerColonX = MARGIN_X + 68;
  const headerValX = MARGIN_X + 76;
  const headerRowH = 13.5;

  // Nomor (KW)
  page.drawText('Nomor (KW)', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(dealData.kwpNumber), { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= headerRowH;

  // Perihal
  page.drawText('Perihal', { x: headerColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: headerColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText('Kwitansi Pembayaran', { x: headerValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 8;

  // Horizontal divider line
  page.drawLine({
    start: { x: MARGIN_X, y: contentY },
    end: { x: RIGHT_X, y: contentY },
    thickness: 1.2,
    color: COLOR_BLACK
  });
  contentY -= 18;

  // Centered Document Title
  const title1 = 'KWITANSI PEMBAYARAN';
  const title1W = fontBold.widthOfTextAtSize(title1, 14);
  const title1X = (PAGE_WIDTH - title1W) / 2;
  page.drawText(title1, {
    x: title1X,
    y: contentY,
    size: 14,
    font: fontBold,
    color: COLOR_BLACK
  });
  page.drawLine({
    start: { x: title1X, y: contentY - 2 },
    end: { x: title1X + title1W, y: contentY - 2 },
    thickness: 1,
    color: COLOR_BLACK
  });

  contentY -= 14;
  const subTitle = 'Payment Receipt';
  const subTitleW = fontItalic.widthOfTextAtSize(subTitle, 10.5);
  page.drawText(subTitle, {
    x: (PAGE_WIDTH - subTitleW) / 2,
    y: contentY,
    size: 10.5,
    font: fontItalic,
    color: COLOR_BLACK
  });
  contentY -= 26;

  // ==================== KWITANSI DETAILS LIST ====================
  const kLabelX = MARGIN_X;
  const kColonX = MARGIN_X + 130;
  const kValX = MARGIN_X + 140;
  const kValMaxW = PRINTABLE_WIDTH - 145;
  const kRowH = 15.5;

  // 1. Sudah Terima Dari
  page.drawText('Sudah Terima Dari', { x: kLabelX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: kColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.hospitalName), { x: kValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= kRowH;

  // 2. No. Referensi Faktur
  page.drawText('No. Referensi Faktur', { x: kLabelX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: kColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(dealData.fpNumber), { x: kValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= kRowH;

  // 3. Nomor PO (Purchase Order)
  page.drawText('Nomor PO (Purchase Order)', { x: kLabelX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: kColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.sphNumber), { x: kValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= kRowH;

  // 4. Untuk Pembayaran
  page.drawText('Untuk Pembayaran', { x: kLabelX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: kColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });

  const firstDesc = sph.items?.[0]?.description || 'Alat Kesehatan';
  const defaultPurpose = `Pembayaran Pekerjaan Kalibrasi ${firstDesc}`;
  const purposeText = dealData.kwpPurpose || defaultPurpose;
  const purpLines = wrapText(safeText(purposeText), fontRegular, 9.5, kValMaxW);
  purpLines.forEach((pL, idx) => {
    page.drawText(pL, { x: kValX, y: contentY - (idx * 12), size: 9.5, font: fontRegular, color: COLOR_BLACK });
  });
  contentY -= (Math.max(1, purpLines.length) * 12 + 4);

  // 5. SEJUMLAH with Cyan highlight badge
  page.drawText('SEJUMLAH', { x: kLabelX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: kColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });

  // Draw Cyan amount box dynamically sized to amount length
  const amountStr = formatNumber(sph.grandTotal);
  const rpW = fontBold.widthOfTextAtSize('Rp', 9);
  const amountW = fontBold.widthOfTextAtSize(amountStr, 9.5);
  const badgeW = Math.max(90, rpW + amountW + 20);
  const badgeH = 14.5;
  page.drawRectangle({
    x: kValX,
    y: contentY - 3.5,
    width: badgeW,
    height: badgeH,
    color: COLOR_CYAN
  });
  page.drawText('Rp', { x: kValX + 4, y: contentY, size: 9, font: fontBold, color: COLOR_WHITE });
  page.drawText(amountStr, { x: kValX + badgeW - amountW - 5, y: contentY, size: 9.5, font: fontBold, color: COLOR_WHITE });

  contentY -= 28;

  // 6. TERBILANG with Border Box dynamically sized to text length
  page.drawText('TERBILANG', { x: kLabelX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: kColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });

  const rawTerbilang = sph.terbilang || angkaTerbilang(sph.grandTotal);
  const fullTerbilang = rawTerbilang.startsWith('"') ? rawTerbilang : `"${rawTerbilang}"`;
  
  const maxAvailableW = RIGHT_X - kValX - 10;
  const fontSize = 8.5;
  const paddingX = 10;
  const paddingY = 6;
  const lineSpacing = 12;

  const singleLineTextW = fontBoldItalic.widthOfTextAtSize(fullTerbilang, fontSize);

  let terbLines: string[] = [];
  let terbBoxW = 0;

  if (singleLineTextW + (paddingX * 2) <= maxAvailableW) {
    terbLines = [fullTerbilang];
    terbBoxW = Math.max(120, singleLineTextW + (paddingX * 2));
  } else {
    terbLines = wrapText(fullTerbilang, fontBoldItalic, fontSize, maxAvailableW - (paddingX * 2));
    let maxLineW = 0;
    terbLines.forEach(l => {
      const w = fontBoldItalic.widthOfTextAtSize(l, fontSize);
      if (w > maxLineW) maxLineW = w;
    });
    terbBoxW = Math.min(maxAvailableW, maxLineW + (paddingX * 2));
  }

  const terbBoxH = Math.max(22, (terbLines.length * lineSpacing) + (paddingY * 2));

  page.drawRectangle({
    x: kValX,
    y: contentY - terbBoxH + 11,
    width: terbBoxW,
    height: terbBoxH,
    color: COLOR_WHITE,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });

  terbLines.forEach((tLine, tIdx) => {
    const tW = fontBoldItalic.widthOfTextAtSize(tLine, fontSize);
    const tX = kValX + (terbBoxW - tW) / 2;
    const tY = contentY - (tIdx * lineSpacing) - (terbLines.length > 1 ? 1 : 2);
    page.drawText(tLine, {
      x: Math.max(kValX + paddingX, tX),
      y: tY,
      size: fontSize,
      font: fontBoldItalic,
      color: COLOR_BLACK
    });
  });

  contentY -= (terbBoxH + 35);

  // ==================== SIGNATURE (LEFT ALIGNED: MATCHING FOTO 3) ====================
  page.drawText('Hormat kami,', { x: MARGIN_X, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= 12;
  page.drawText('PT. SARANA MULTI KALIBRASI', { x: MARGIN_X, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });

  contentY -= 90; // Increased spacing for Materai 10.000 stamp

  const directorName = sph.directorName || 'Ahmad Fajar Ariyanto';
  const dirW = fontBold.widthOfTextAtSize(directorName, 9.5);
  page.drawText(directorName, { x: MARGIN_X, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  // Underline
  page.drawLine({
    start: { x: MARGIN_X, y: contentY - 1.5 },
    end: { x: MARGIN_X + dirW, y: contentY - 1.5 },
    thickness: 0.9,
    color: COLOR_BLACK
  });

  contentY -= 11;
  const directorTitle = sph.directorTitle || 'Direktur';
  page.drawText(directorTitle, { x: MARGIN_X, y: contentY, size: 9, font: fontItalic, color: COLOR_BLACK });

  return await pdfDoc.save();
}

// ============================================================================
// 4. BERITA ACARA PEKERJAAN (BAP) PDF GENERATOR
// ============================================================================
export async function createAuthenticBapPdf(
  pdfDoc: PDFDocument,
  sph: SphQuotation,
  dealData: SphDealData
): Promise<Uint8Array> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  // Top margin 4.25 cm matching SPH for pre-printed letterhead (Kop Surat)
  let contentY = yFromTop(4.25);

  const title = 'BERITA ACARA PEKERJAAN KALIBRASI (BAP)';
  const titleW = fontBold.widthOfTextAtSize(title, 13);
  page.drawText(title, {
    x: (PAGE_WIDTH - titleW) / 2,
    y: contentY,
    size: 13,
    font: fontBold,
    color: COLOR_BLACK
  });
  contentY -= 16;

  const dealDateFormatted = formatIndonesianLongDate(dealData.dealDate || sph.date, sph.city || 'Surakarta');
  const leftColX = MARGIN_X;
  const leftColColonX = MARGIN_X + 75;
  const leftColValX = MARGIN_X + 85;

  const rightColX = MARGIN_X + 265;
  const rightColColonX = MARGIN_X + 340;
  const rightColValX = MARGIN_X + 350;
  const rowH = 14;

  page.drawText('No. SPH / PO', { x: leftColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: leftColColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.sphNumber), { x: leftColValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });

  page.drawText('Instansi / RS', { x: rightColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: rightColColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.hospitalName), { x: rightColValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });
  contentY -= rowH;

  page.drawText('Tanggal', { x: leftColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: leftColColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(dealDateFormatted), { x: leftColValX, y: contentY, size: 9.5, font: fontRegular, color: COLOR_BLACK });

  page.drawText('Alamat', { x: rightColX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(':', { x: rightColColonX, y: contentY, size: 9.5, font: fontBold, color: COLOR_BLACK });
  page.drawText(safeText(sph.hospitalAddress || '-'), { x: rightColValX, y: contentY, size: 9, font: fontRegular, color: COLOR_BLACK });
  contentY -= (rowH + 4);

  page.drawLine({
    start: { x: MARGIN_X, y: contentY },
    end: { x: RIGHT_X, y: contentY },
    thickness: 0.8,
    color: COLOR_BLACK
  });
  contentY -= 14;

  const statement = 'Pada hari ini telah dilakukan pekerjaan kalibrasi alat kesehatan dengan rincian instrumen sebagai berikut:';
  page.drawText(statement, { x: MARGIN_X, y: contentY, size: 9, font: fontRegular, color: COLOR_BLACK });
  contentY -= 14;

  // BAP Table
  const colW = [30, 250, 55, 65, 121];
  const colX = [
    MARGIN_X,
    MARGIN_X + colW[0],
    MARGIN_X + colW[0] + colW[1],
    MARGIN_X + colW[0] + colW[1] + colW[2],
    MARGIN_X + colW[0] + colW[1] + colW[2] + colW[3]
  ];

  const headerH = 20;
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - headerH,
    width: PRINTABLE_WIDTH,
    height: headerH,
    color: COLOR_CYAN,
    borderColor: COLOR_BLACK,
    borderWidth: 0.8
  });

  const headers = ['No.', 'Nama Alat Medis', 'Qty PO', 'Qty Realisasi', 'Status / Keterangan'];
  headers.forEach((h, idx) => {
    const isCenter = idx !== 1;
    const hW = fontBold.widthOfTextAtSize(h, 9);
    let hX = colX[idx] + 4;
    if (isCenter) hX = colX[idx] + (colW[idx] - hW) / 2;
    page.drawText(h, { x: hX, y: contentY - 14, size: 9, font: fontBold, color: COLOR_WHITE });
  });

  contentY -= headerH;

  let totalQty = 0;
  (sph.items || []).forEach((item, index) => {
    totalQty += (item.quantity || 1);
    const descLines = wrapText(safeText(item.description), fontRegular, 9, colW[1] - 8);
    const rowHeight = Math.max(16, descLines.length * 11 + 5);

    page.drawRectangle({
      x: MARGIN_X,
      y: contentY - rowHeight,
      width: PRINTABLE_WIDTH,
      height: rowHeight,
      color: COLOR_WHITE,
      borderColor: COLOR_BLACK,
      borderWidth: 0.6
    });

    for (let i = 1; i < colX.length; i++) {
      page.drawLine({
        start: { x: colX[i], y: contentY },
        end: { x: colX[i], y: contentY - rowHeight },
        thickness: 0.5,
        color: COLOR_BLACK
      });
    }

    const textBaseline = contentY - 11.5;
    const noStr = String(index + 1);
    page.drawText(noStr, { x: colX[0] + (colW[0] - fontRegular.widthOfTextAtSize(noStr, 9)) / 2, y: textBaseline, size: 9, font: fontRegular, color: COLOR_BLACK });

    descLines.forEach((dL, dIdx) => {
      page.drawText(dL, { x: colX[1] + 4, y: textBaseline - (dIdx * 11), size: 9, font: fontRegular, color: COLOR_BLACK });
    });

    const qtyStr = `${item.quantity || 1} Unit`;
    page.drawText(qtyStr, { x: colX[2] + (colW[2] - fontRegular.widthOfTextAtSize(qtyStr, 8.5)) / 2, y: textBaseline, size: 8.5, font: fontRegular, color: COLOR_BLACK });

    page.drawText(qtyStr, { x: colX[3] + (colW[3] - fontRegular.widthOfTextAtSize(qtyStr, 8.5)) / 2, y: textBaseline, size: 8.5, font: fontBold, color: COLOR_BLACK });

    page.drawText('Selesai Kalibrasi', { x: colX[4] + (colW[4] - fontRegular.widthOfTextAtSize('Selesai Kalibrasi', 8.5)) / 2, y: textBaseline, size: 8.5, font: fontRegular, color: COLOR_BLACK });

    contentY -= rowHeight;
  });

  // Total Row
  const totalRowH = 16;
  page.drawRectangle({
    x: MARGIN_X,
    y: contentY - totalRowH,
    width: colW[0] + colW[1],
    height: totalRowH,
    color: COLOR_CYAN,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  page.drawText('Total Unit Alat', { x: MARGIN_X + (colW[0] + colW[1] - fontBold.widthOfTextAtSize('Total Unit Alat', 9)) / 2, y: contentY - 11.5, size: 9, font: fontBold, color: COLOR_WHITE });

  page.drawRectangle({
    x: colX[2],
    y: contentY - totalRowH,
    width: colW[2],
    height: totalRowH,
    color: COLOR_CYAN,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  page.drawText(String(totalQty), { x: colX[2] + (colW[2] - fontBold.widthOfTextAtSize(String(totalQty), 9)) / 2, y: contentY - 11.5, size: 9, font: fontBold, color: COLOR_WHITE });

  page.drawRectangle({
    x: colX[3],
    y: contentY - totalRowH,
    width: colW[3] + colW[4],
    height: totalRowH,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BLACK,
    borderWidth: 0.6
  });
  page.drawText(`${totalQty} Unit Telah Dikalibrasi Sesuai SOP Kemenkes`, { x: colX[3] + 6, y: contentY - 11.5, size: 8.5, font: fontBold, color: COLOR_BLACK });

  contentY -= totalRowH;

  // Closing Signatures
  contentY -= 25;
  const sigColW = 180;
  const leftSigX = MARGIN_X + 20;
  const rightSigX = RIGHT_X - sigColW - 10;

  page.drawText('Pihak Rumah Sakit / Pelanggan,', { x: leftSigX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  page.drawText('PT. SARANA MULTI KALIBRASI', { x: rightSigX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  page.drawText('Petugas / Teknisi Kalibrasi,', { x: rightSigX, y: contentY - 11, size: 8.5, font: fontRegular, color: COLOR_BLACK });

  contentY -= 50;

  page.drawText('( …………………………………………… )', { x: leftSigX, y: contentY, size: 9, font: fontRegular, color: COLOR_BLACK });
  page.drawText(safeText(sph.hospitalName), { x: leftSigX, y: contentY - 11, size: 8, font: fontRegular, color: COLOR_MUTED });

  page.drawText(`( ${safeText(dealData.recipientName || 'Fitri Nur Aini')} )`, { x: rightSigX, y: contentY, size: 9, font: fontBold, color: COLOR_BLACK });
  page.drawText('Pelaksana Kalibrasi', { x: rightSigX, y: contentY - 11, size: 8, font: fontRegular, color: COLOR_MUTED });

  return await pdfDoc.save();
}
