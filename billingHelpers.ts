import { SphQuotation, SphDealData, BapDocument, BapItem } from '../types';
import { BANK_MANDIRI_SMK, BANK_JATENG_SMK, getEffectivePaymentOption, angkaTerbilang, formatNumber } from './sphHelpers';

export interface EffectiveBillingItem {
  id?: string;
  no: number;
  description: string;
  quantity: number;        // Realized quantity from BAP (or PO qty if not yet filled)
  poQuantity: number;      // Original PO quantity
  unitPrice: number;
  totalPrice: number;      // quantity * unitPrice
  unit: string;
  notes?: string;
  eCatalogueUrl?: string;
  keterangan?: string;
}

export interface EffectiveBillingData {
  isAdjustedFromBap: boolean;
  totalPoUnits: number;
  totalRealizedUnits: number;
  items: EffectiveBillingItem[];
  subtotal1: number;
  discountPercent: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  isPpnIncluded: boolean;
  ppnPercent: number;
  ppnAmount: number;
  subtotal2: number;
  accommodationFee: number;
  grandTotal: number;
  terbilang: string;
  originalGrandTotal: number;
  priceDifference: number; // grandTotal - originalGrandTotal
}

/**
 * Resolve bank details dynamically based on SPH paymentOption, bankName, or dealData
 * Ensures if SPH is Bank Jateng, BO and FP match Bank Jateng 100%.
 */
export function resolveBankDetails(sph: SphQuotation, dealData?: SphDealData): {
  bankName: string;
  accountNumber: string;
  accountName: string;
  fullString: string;
} {
  // Check if dealData explicitly specifies a single bank
  const pMethod = (dealData?.paymentMethod || '').toLowerCase();
  const effOpt = getEffectivePaymentOption(sph);

  // If dealData explicitly says Jateng and not Mandiri
  if (pMethod.includes('jateng') && !pMethod.includes('mandiri')) {
    return {
      bankName: 'Bank Jateng',
      accountNumber: BANK_JATENG_SMK.accountNumber,
      accountName: BANK_JATENG_SMK.accountName,
      fullString: `Bank Jateng : ${BANK_JATENG_SMK.accountNumber} (${BANK_JATENG_SMK.accountName})`
    };
  }

  // If dealData explicitly says Mandiri and not Jateng
  if (pMethod.includes('mandiri') && !pMethod.includes('jateng')) {
    return {
      bankName: 'Bank Mandiri',
      accountNumber: BANK_MANDIRI_SMK.accountNumber,
      accountName: BANK_MANDIRI_SMK.accountName,
      fullString: `Bank Mandiri : ${BANK_MANDIRI_SMK.accountNumber} (${BANK_MANDIRI_SMK.accountName})`
    };
  }

  // Follow SPH effective payment option
  if (effOpt === 'jateng') {
    return {
      bankName: 'Bank Jateng',
      accountNumber: BANK_JATENG_SMK.accountNumber,
      accountName: BANK_JATENG_SMK.accountName,
      fullString: `Bank Jateng : ${BANK_JATENG_SMK.accountNumber} (${BANK_JATENG_SMK.accountName})`
    };
  }

  if (effOpt === 'mandiri') {
    return {
      bankName: 'Bank Mandiri',
      accountNumber: BANK_MANDIRI_SMK.accountNumber,
      accountName: BANK_MANDIRI_SMK.accountName,
      fullString: `Bank Mandiri : ${BANK_MANDIRI_SMK.accountNumber} (${BANK_MANDIRI_SMK.accountName})`
    };
  }

  if (effOpt === 'custom' && (sph.customBankDetails || sph.bankAccountNumber)) {
    return {
      bankName: sph.bankName || 'Bank',
      accountNumber: sph.bankAccountNumber || '',
      accountName: sph.bankAccountName || 'SARANA MULTI KALIBRASI PT',
      fullString: sph.customBankDetails || `${sph.bankName || 'Bank'}: ${sph.bankAccountNumber || ''} (${sph.bankAccountName || 'SARANA MULTI KALIBRASI PT'})`
    };
  }

  // Default: Both banks
  return {
    bankName: 'Bank Jateng / Bank Mandiri',
    accountNumber: `${BANK_JATENG_SMK.accountNumber} / ${BANK_MANDIRI_SMK.accountNumber}`,
    accountName: 'SARANA MULTI KALIBRASI PT',
    fullString: `Bank Jateng : ${BANK_JATENG_SMK.accountNumber} & Bank Mandiri : ${BANK_MANDIRI_SMK.accountNumber} (SARANA MULTI KALIBRASI PT)`
  };
}

/**
 * Calculates effective billing items, subtotal, PPN, and grandTotal
 * based on realization data recorded in Form BAP (Berita Acara Pekerjaan).
 * 
 * If BAP has realization filled (e.g. PO 25 items -> Realisasi 20 items):
 * - Item quantity changes to 20
 * - Total price becomes 20 * unitPrice
 * - BO, FP, and KWP totals and list of items automatically reflect the BAP realization.
 */
export function calculateBillingFromBap(
  sph: SphQuotation, 
  bap?: BapDocument | null
): EffectiveBillingData {
  const originalGrandTotal = sph.grandTotal || 0;
  const originalPoUnits = (sph.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

  const realizedQtyOf = (it: BapItem): number => {
    let q = typeof it.total === 'number' ? it.total : 0;
    if (q === 0 && it.realisasi) {
      q = Object.values(it.realisasi).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }
    return q;
  };

  // --- Apakah realisasi BAP PO sudah ada? ---
  // Realisasi dari upload PDF BAP selalu dianggap sah, termasuk bila semuanya 0 (batal)
  const isPdfRealization = Boolean(bap && bap.realizationSource === 'pdf_upload');
  const poRealized = isPdfRealization || Boolean(
    bap &&
    bap.items &&
    bap.items.length > 0 &&
    bap.items.some(it => {
      if (typeof it.total === 'number' && it.total > 0) return true;
      if (it.realisasi && Object.values(it.realisasi).some(v => Number(v) > 0)) return true;
      // Or if explicitly marked with realisasi object having keys
      if (it.realisasi && Object.keys(it.realisasi).length > 0) return true;
      return false;
    })
  );

  // --- Apakah ada alat Non PO yang dikerjakan? ---
  const nonPoWorked = Boolean(bap && (bap.nonPoItems || []).some(it => realizedQtyOf(it) > 0));

  // Belum ada realisasi sama sekali: pakai nilai SPH apa adanya
  if (!bap || (!poRealized && !nonPoWorked)) {
    const defaultItems: EffectiveBillingItem[] = (sph.items || []).map((it, idx) => {
      const q = Number(it.quantity) || 1;
      const uPrice = Number(it.unitPrice) || 0;
      const tPrice = it.totalPrice !== undefined && it.totalPrice !== null ? Number(it.totalPrice) : q * uPrice;
      return {
        id: it.id || `sph-it-${idx + 1}`,
        no: idx + 1,
        description: it.description,
        quantity: q,
        poQuantity: q,
        unitPrice: uPrice,
        totalPrice: tPrice,
        unit: it.unit || 'Unit',
        notes: it.notes,
        eCatalogueUrl: it.eCatalogueUrl
      };
    });

    const calculatedSubtotal1 = defaultItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const accommodationFee = sph.accommodationFee || 0;
    const subtotal2 = calculatedSubtotal1 + accommodationFee;
    const isPpnIncluded = sph.isPpnIncluded !== false;
    const ppnPercent = sph.ppnPercent || 11;
    const ppnAmount = (isPpnIncluded || (sph.ppnAmount && sph.ppnAmount > 0))
      ? Math.round(subtotal2 * (ppnPercent / 100))
      : 0;
    const grandTotal = subtotal2 + ppnAmount;

    return {
      isAdjustedFromBap: false,
      totalPoUnits: originalPoUnits,
      totalRealizedUnits: originalPoUnits,
      items: defaultItems,
      subtotal1: calculatedSubtotal1,
      discountPercent: (sph as any).discountPercent || 0,
      discountAmount: (sph as any).discountAmount || 0,
      subtotalAfterDiscount: calculatedSubtotal1,
      isPpnIncluded,
      ppnPercent,
      ppnAmount,
      subtotal2,
      accommodationFee,
      grandTotal,
      terbilang: angkaTerbilang(grandTotal),
      originalGrandTotal: grandTotal,
      priceDifference: 0
    };
  }

  const billedItems: EffectiveBillingItem[] = [];
  let totalRealizedUnits = 0;

  // --- 1. Alat PO ---
  if (poRealized) {
    // Hanya alat yang benar-benar dikerjakan (realisasi > 0) yang ditagihkan
    bap.items.forEach((bapIt) => {
      const sphMatch = sph.items?.[bapIt.no - 1] || sph.items?.find(s =>
        s.description.trim().toLowerCase() === bapIt.namaAlat.trim().toLowerCase()
      );
      const poQty = Number(bapIt.poQty) || Number(sphMatch?.quantity) || 1;
      const realizedQty = realizedQtyOf(bapIt);
      const unitPrice = bapIt.unitPrice || sphMatch?.unitPrice || 0;
      if (realizedQty > 0) {
        totalRealizedUnits += realizedQty;
        billedItems.push({
          no: billedItems.length + 1,
          description: bapIt.namaAlat || sphMatch?.description || 'Alat Kesehatan',
          quantity: realizedQty,
          poQuantity: poQty,
          unitPrice,
          totalPrice: realizedQty * unitPrice,
          unit: sphMatch?.unit || 'Unit',
          notes: bapIt.keterangan || sphMatch?.notes,
          eCatalogueUrl: sphMatch?.eCatalogueUrl,
          keterangan: bapIt.keterangan
        });
      }
    });
  } else {
    // Realisasi PO belum diisi (baru ada Non PO): alat PO ditagihkan sesuai SPH
    (sph.items || []).forEach((it) => {
      const q = Number(it.quantity) || 1;
      const uPrice = Number(it.unitPrice) || 0;
      totalRealizedUnits += q;
      billedItems.push({
        id: it.id,
        no: billedItems.length + 1,
        description: it.description,
        quantity: q,
        poQuantity: q,
        unitPrice: uPrice,
        totalPrice: q * uPrice,
        unit: it.unit || 'Unit',
        notes: it.notes,
        eCatalogueUrl: it.eCatalogueUrl
      });
    });
  }

  // --- 2. Alat Non PO yang dikerjakan ---
  (bap.nonPoItems || []).forEach((nonPoIt) => {
    const nonPoRealized = realizedQtyOf(nonPoIt);
    if (nonPoRealized > 0) {
      const uPrice = nonPoIt.unitPrice || 0;
      totalRealizedUnits += nonPoRealized;
      billedItems.push({
        no: billedItems.length + 1,
        description: nonPoIt.namaAlat || 'Alat Non PO',
        quantity: nonPoRealized,
        poQuantity: nonPoIt.poQty || nonPoRealized,
        unitPrice: uPrice,
        totalPrice: nonPoRealized * uPrice,
        unit: 'Unit',
        notes: nonPoIt.keterangan || 'Non PO',
        keterangan: nonPoIt.keterangan
      });
    }
  });

  const isPpnIncluded = sph.isPpnIncluded !== false;
  const ppnPercent = sph.ppnPercent || 11;

  // Tidak ada satu pun alat yang dikerjakan
  if (billedItems.length === 0) {
    // Menurut PDF BAP resmi semua batal -> tidak ada yang ditagihkan (Rp 0)
    if (isPdfRealization) {
      return {
        isAdjustedFromBap: true,
        totalPoUnits: originalPoUnits,
        totalRealizedUnits: 0,
        items: [],
        subtotal1: 0,
        discountPercent: 0,
        discountAmount: 0,
        subtotalAfterDiscount: 0,
        isPpnIncluded,
        ppnPercent,
        ppnAmount: 0,
        subtotal2: 0,
        accommodationFee: 0,
        grandTotal: 0,
        terbilang: angkaTerbilang(0),
        originalGrandTotal,
        priceDifference: -originalGrandTotal
      };
    }
    // Data Form BAP belum lengkap: pertahankan nilai SPH
    return calculateBillingFromBap(sph, null);
  }

  const subtotal1 = billedItems.reduce((sum, it) => sum + it.totalPrice, 0);

  // PENTING: Diskon/nego SPH TIDAK dipotong lagi di sini.
  // Harga satuan (unitPrice) di SPH & BAP sudah merupakan harga SETELAH nego
  // (lihat calculateNegotiation di sphHelpers: diskon dilebur ke harga satuan).
  // discountAmount/discountPercent di SPH hanya informasi selisih dari harga brosur,
  // sehingga memotongnya lagi akan membuat diskon dobel (contoh kasus: deal
  // Rp 26.850.900 menjadi Rp 18.814.219 padahal semua alat selesai dikerjakan).
  const discountPercent = 0;
  const discountAmount = 0;

  const subtotalAfterDiscount = subtotal1;
  const accommodationFee = sph.accommodationFee || 0;
  const subtotal2 = subtotalAfterDiscount + accommodationFee;

  // PPN calculation (taken from Total 2 / subtotal2)
  const ppnAmount = (isPpnIncluded || (sph.ppnAmount && sph.ppnAmount > 0))
    ? Math.round(subtotal2 * (ppnPercent / 100))
    : 0;

  const grandTotal = subtotal2 + ppnAmount;

  return {
    isAdjustedFromBap: true,
    totalPoUnits: originalPoUnits,
    totalRealizedUnits,
    items: billedItems,
    subtotal1,
    discountPercent,
    discountAmount,
    subtotalAfterDiscount,
    isPpnIncluded,
    ppnPercent,
    ppnAmount,
    subtotal2,
    accommodationFee,
    grandTotal,
    terbilang: angkaTerbilang(grandTotal),
    originalGrandTotal,
    priceDifference: grandTotal - originalGrandTotal
  };
}
