import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { SphQuotation, SphDealData } from '../types';
import { 
  createAuthenticBoPdf, 
  createAuthenticFpPdf, 
  createAuthenticKwpPdf, 
  createAuthenticBapPdf 
} from '../lib/dealPdfGenerator';
import { createAuthenticSphPdf, paginateSphTableItems } from '../lib/templateGenerator';
import { generateDealNumbers, formatNumber } from './sphHelpers';

/**
 * Ensures fallback deal data is populated if not yet set
 */
function resolveDealData(sph: SphQuotation, customDealData?: SphDealData): SphDealData {
  if (customDealData) return customDealData;
  if (sph.dealData) return sph.dealData;

  const defaultNumbers = generateDealNumbers('074', sph.date || new Date().toISOString());
  return {
    dealDate: sph.date || new Date().toISOString().split('T')[0],
    sequenceNumber: defaultNumbers.sequenceNumber,
    boNumber: defaultNumbers.boNumber,
    fpNumber: defaultNumbers.fpNumber,
    kwpNumber: defaultNumbers.kwpNumber,
    recipientName: 'Fitri Nur Aini',
    paymentMethod: 'Bank Mandiri : 138-00-2610846-9 & Bank Jateng : 1-002-01495-1',
    kwpPurpose: `Pembayaran Pekerjaan Kalibrasi ${sph.items?.[0]?.description || 'Alat Kesehatan'} sesuai SPH No. ${sph.sphNumber}`,
    customerPic: sph.hospitalPic || sph.recipientRole || '-',
    certificateOwner: sph.hospitalName
  };
}

/**
 * 1. Download Bukti Order (BO) PDF
 */
export async function downloadBoPdf(sph: SphQuotation, customDealData?: SphDealData): Promise<void> {
  try {
    const dealData = resolveDealData(sph, customDealData);
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await createAuthenticBoPdf(pdfDoc, sph, dealData);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const cleanName = (sph.hospitalName || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');
    saveAs(blob, `BO_${dealData.sequenceNumber}_${cleanName}.pdf`);
  } catch (err) {
    console.error('Gagal mengunduh Bukti Order (BO) PDF:', err);
    alert('Gagal mengunduh Bukti Order PDF. Silakan coba lagi.');
  }
}

/**
 * 2. Download Faktur Penjualan (FP) PDF
 */
export async function downloadFpPdf(sph: SphQuotation, customDealData?: SphDealData): Promise<void> {
  try {
    const dealData = resolveDealData(sph, customDealData);
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await createAuthenticFpPdf(pdfDoc, sph, dealData);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const cleanName = (sph.hospitalName || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');
    saveAs(blob, `FP_${dealData.sequenceNumber}_${cleanName}.pdf`);
  } catch (err) {
    console.error('Gagal mengunduh Faktur Penjualan (FP) PDF:', err);
    alert('Gagal mengunduh Faktur Penjualan PDF. Silakan coba lagi.');
  }
}

/**
 * 3. Download Kwitansi Penjualan (KWP) PDF
 */
export async function downloadKwpPdf(sph: SphQuotation, customDealData?: SphDealData): Promise<void> {
  try {
    const dealData = resolveDealData(sph, customDealData);
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await createAuthenticKwpPdf(pdfDoc, sph, dealData);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const cleanName = (sph.hospitalName || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');
    saveAs(blob, `Kwitansi_${dealData.sequenceNumber}_${cleanName}.pdf`);
  } catch (err) {
    console.error('Gagal mengunduh Kwitansi Penjualan (KWP) PDF:', err);
    alert('Gagal mengunduh Kwitansi Penjualan PDF. Silakan coba lagi.');
  }
}

/**
 * 4. Download Berita Acara Pekerjaan (BAP) PDF
 */
export async function downloadBapPdf(sph: SphQuotation, customDealData?: SphDealData): Promise<void> {
  try {
    const dealData = resolveDealData(sph, customDealData);
    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await createAuthenticBapPdf(pdfDoc, sph, dealData);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const cleanName = (sph.hospitalName || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');
    saveAs(blob, `BAP_${dealData.sequenceNumber}_${cleanName}.pdf`);
  } catch (err) {
    console.error('Gagal mengunduh BAP PDF:', err);
    alert('Gagal mengunduh BAP PDF. Silakan coba lagi.');
  }
}

/**
 * 5. Download All Deal Documents (SPH, BAP, BO, FP, KWP) in 1 ZIP File
 */
export async function downloadAllDealDocumentsZip(sph: SphQuotation, customDealData?: SphDealData): Promise<void> {
  try {
    const dealData = resolveDealData(sph, customDealData);
    const zip = new JSZip();
    const cleanName = (sph.hospitalName || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');

    // 1. Generate SPH PDF
    const itemChunks = paginateSphTableItems(sph.items || []);
    const dynamicAttachmentText = `${itemChunks.length} Lembar`;
    const formattedDate = new Date(sph.date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const sphData = {
      sphNumber: sph.sphNumber,
      subject: sph.subject || 'Surat Penawaran Harga Kalibrasi',
      date: formattedDate,
      city: sph.city || 'Surakarta',
      recipientRole: sph.recipientRole || 'Direktur',
      hospitalName: sph.hospitalName,
      hospitalAddress: sph.hospitalAddress || '',
      hospitalPic: sph.hospitalPic || '',
      marketingStaffName: sph.marketingStaffName || 'Sulis',
      marketingStaffPhone: sph.marketingStaffPhone || '0821-3670-7421',
      directorName: sph.directorName || 'Ahmad Fajar Ariyanto',
      directorTitle: sph.directorTitle || 'Direktur',
      subtotal1: formatNumber(sph.subtotal1),
      subtotalOriginal: formatNumber(sph.subtotalOriginal || sph.subtotal1),
      discountAmount: formatNumber(sph.discountAmount || 0),
      discountPercent: sph.discountPercent || 0,
      ppnAmount: formatNumber(sph.ppnAmount),
      isPpnIncluded: sph.isPpnIncluded !== false,
      subtotal2: formatNumber(sph.subtotal2 || (sph.subtotal1 + sph.ppnAmount)),
      accommodationFee: formatNumber(sph.accommodationFee || 0),
      grandTotal: formatNumber(sph.grandTotal),
      terbilang: sph.terbilang || 'Nol Rupiah',
      attachmentPages: dynamicAttachmentText,
      bankName: sph.bankName || 'Bank Mandiri Cab. Surakarta',
      bankAccountNumber: sph.bankAccountNumber || '138-00-2610846-9',
      bankAccountName: sph.bankAccountName || 'SARANA MULTI KALIBRASI PT',
      items: (sph.items || []).map((it, i) => ({
        no: i + 1,
        description: it.description,
        notes: it.notes || '',
        quantity: it.quantity,
        unit: it.unit || 'Unit',
        unitPrice: formatNumber(it.unitPrice),
        totalPrice: formatNumber(it.totalPrice)
      }))
    };

    const sphDoc = await PDFDocument.create();
    const sphBytes = await createAuthenticSphPdf(sphDoc, sphData);
    zip.file(`1_SPH_${cleanName}.pdf`, sphBytes);

    // 2. Generate BO PDF
    const boDoc = await PDFDocument.create();
    const boBytes = await createAuthenticBoPdf(boDoc, sph, dealData);
    zip.file(`2_BO_${dealData.sequenceNumber}_${cleanName}.pdf`, boBytes);

    // 3. Generate FP PDF
    const fpDoc = await PDFDocument.create();
    const fpBytes = await createAuthenticFpPdf(fpDoc, sph, dealData);
    zip.file(`3_FP_${dealData.sequenceNumber}_${cleanName}.pdf`, fpBytes);

    // 4. Generate KWP PDF
    const kwpDoc = await PDFDocument.create();
    const kwpBytes = await createAuthenticKwpPdf(kwpDoc, sph, dealData);
    zip.file(`4_Kwitansi_${dealData.sequenceNumber}_${cleanName}.pdf`, kwpBytes);

    // 5. Generate BAP PDF
    const bapDoc = await PDFDocument.create();
    const bapBytes = await createAuthenticBapPdf(bapDoc, sph, dealData);
    zip.file(`5_BAP_${dealData.sequenceNumber}_${cleanName}.pdf`, bapBytes);

    // Generate ZIP & Save
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `Paket_Deal_Lengkap_${dealData.sequenceNumber}_${cleanName}.zip`);
  } catch (err) {
    console.error('Gagal mengunduh seluruh berkas PDF deal:', err);
    alert('Gagal membuat paket ZIP PDF. Silakan unduh satu-per-satu.');
  }
}
