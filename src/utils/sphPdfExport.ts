import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { createAuthenticSphPdf, paginateSphTableItems } from '../lib/templateGenerator';
import { getEffectivePaymentOption } from './sphHelpers';
import { SphQuotation } from '../types';
import { extractCleanToolName, getECatalogueTariff } from '../data/sphECatalogueData';

/**
 * Downloads the official SPH document directly as a high-quality PDF.
 */
export async function downloadSphPdf(sph: SphQuotation): Promise<void> {
  try {
    const formattedDate = new Date(sph.date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const itemChunks = paginateSphTableItems(sph.items || []);
    const dynamicAttachmentText = `${itemChunks.length} Lembar`;

    const isECat = sph.sphType === 'ecatalogue' || (sph.sphType !== 'non_ecatalogue' && sph.items?.some(it => !!it.eCatalogueUrl));

    const sphData = {
      sphType: isECat ? 'ecatalogue' : 'non_ecatalogue',
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
      subtotal1: sph.subtotal1,
      subtotalOriginal: sph.subtotalOriginal || sph.subtotal1,
      discountAmount: sph.discountAmount || 0,
      discountPercent: sph.discountPercent || 0,
      ppnAmount: sph.ppnAmount,
      ppnPercent: sph.ppnPercent || 11,
      isPpnIncluded: sph.isPpnIncluded !== false,
      subtotal2: sph.subtotal2 || (sph.subtotal1 + sph.ppnAmount),
      accommodationFee: sph.accommodationFee || 0,
      grandTotal: sph.grandTotal,
      terbilang: sph.terbilang || 'Nol Rupiah',
      paymentOption: getEffectivePaymentOption(sph),
      customBankDetails: sph.customBankDetails || '',
      attachmentPages: dynamicAttachmentText,
      bankName: sph.bankName || 'Bank Mandiri Cab. Surakarta',
      bankAccountNumber: sph.bankAccountNumber || '138-00-2610846-9',
      bankAccountName: sph.bankAccountName || 'SARANA MULTI KALIBRASI PT',
      items: (sph.items || []).map((it, i) => {
        const cleanName = extractCleanToolName(it.description || '');
        const autoUrl = it.eCatalogueUrl || getECatalogueTariff(it.description)?.link || getECatalogueTariff(cleanName)?.link || 'https://katalog.inaproc.id/sarana-multi-kalibrasi';
        return {
          no: i + 1,
          description: it.description,
          notes: it.notes || '',
          quantity: it.quantity,
          unit: it.unit || 'Unit',
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          eCatalogueUrl: autoUrl
        };
      })
    };

    const pdfDoc = await PDFDocument.create();
    const bytes = await createAuthenticSphPdf(pdfDoc, sphData);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const cleanName = (sph.hospitalName || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');
    saveAs(blob, `SPH_${isECat ? 'ECATALOGUE_' : ''}${cleanName}.pdf`);
  } catch (err) {
    console.error('Gagal mengunduh SPH PDF:', err);
    alert('Gagal mengunduh PDF SPH. Silakan coba lagi.');
  }
}
