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

  // Check if BAP has any realization data recorded
  const hasRealization = Boolean(
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

  // Fallback if no BAP realization exists yet: use standard SPH values
  if (!bap || !hasRealization) {
    const defaultItems: EffectiveBillingItem[] = (sph.items || []).map((it, idx) => ({
      id: it.id || `sph-it-${idx + 1}`,
      no: idx + 1,
      description: it.description,
      quantity: Number(it.quantity) || 1,
      poQuantity: Number(it.quantity) || 1,
      unitPrice: it.unitPrice || 0,
      totalPrice: it.totalPrice || (Number(it.quantity) || 1) * (it.unitPrice || 0),
      unit: it.unit || 'Unit',
      notes: it.notes,
      eCatalogueUrl: it.eCatalogueUrl
    }));

    return {
      isAdjustedFromBap: false,
      totalPoUnits: originalPoUnits,
      totalRealizedUnits: originalPoUnits,
      items: defaultItems,
      subtotal1: sph.subtotal1,
      discountPercent: (sph as any).discountPercent || 0,
      discountAmount: (sph as any).discountAmount || 0,
      subtotalAfterDiscount: (sph as any).subtotalAfterDiscount || sph.subtotal1,
      isPpnIncluded: sph.isPpnIncluded !== false,
      ppnPercent: sph.ppnPercent || 11,
      ppnAmount: sph.ppnAmount || 0,
      subtotal2: sph.subtotal2 || (sph.subtotal1 + (sph.ppnAmount || 0)),
      accommodationFee: sph.accommodationFee || 0,
      grandTotal: originalGrandTotal,
      terbilang: sph.terbilang || angkaTerbilang(originalGrandTotal),
      originalGrandTotal,
      priceDifference: 0
    };
  }

  // BAP HAS REALIZATION DATA:
  // Build items list based on Form BAP realization!
  const billedItems: EffectiveBillingItem[] = [];
  let totalRealizedUnits = 0;

  bap.items.forEach((bapIt, idx) => {
    // Correlate with SPH item by no or description
    const sphMatch = sph.items?.[bapIt.no - 1] || sph.items?.find(s => 
      s.description.trim().toLowerCase() === bapIt.namaAlat.trim().toLowerCase()
    );

    const poQty = Number(bapIt.poQty) || Number(sphMatch?.quantity) || 1;
    
    // Realized quantity from BAP (total sum of dates or it.total)
    let realizedQty = typeof bapIt.total === 'number' ? bapIt.total : 0;
    if (realizedQty === 0 && bapIt.realisasi) {
      realizedQty = Object.values(bapIt.realisasi).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }

    const unitPrice = bapIt.unitPrice || sphMatch?.unitPrice || 0;

    // Only include items that were actually worked on (realizedQty > 0)
    // If an item was cancelled/batal or 0 realized, it will not be billed to the customer
    if (realizedQty > 0) {
      totalRealizedUnits += realizedQty;
      billedItems.push({
        no: billedItems.length + 1,
        description: bapIt.namaAlat || sphMatch?.description || 'Alat Kesehatan',
        quantity: realizedQty,
        poQuantity: poQty,
        unitPrice: unitPrice,
        totalPrice: realizedQty * unitPrice,
        unit: sphMatch?.unit || 'Unit',
        notes: bapIt.keterangan || sphMatch?.notes,
        eCatalogueUrl: sphMatch?.eCatalogueUrl,
        keterangan: bapIt.keterangan
      });
    }
  });

  // Also include any Non-PO items that were worked on in BAP
  if (bap.nonPoItems && bap.nonPoItems.length > 0) {
    bap.nonPoItems.forEach((nonPoIt) => {
      let nonPoRealized = typeof nonPoIt.total === 'number' ? nonPoIt.total : 0;
      if (nonPoRealized === 0 && nonPoIt.realisasi) {
        nonPoRealized = Object.values(nonPoIt.realisasi).reduce((sum, v) => sum + (Number(v) || 0), 0);
      }
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
  }

  // If for some reason all realized items are 0, retain original items
  if (billedItems.length === 0) {
    return calculateBillingFromBap(sph, null);
  }

  // Calculate new Subtotal 1 based on realized quantities
  const subtotal1 = billedItems.reduce((sum, it) => sum + it.totalPrice, 0);

  // Discount calculation
  const discountPercent = (sph as any).discountPercent || 0;
  let discountAmount = 0;
  if (discountPercent > 0) {
    discountAmount = Math.round((subtotal1 * discountPercent) / 100);
  } else if ((sph as any).discountAmount && sph.subtotal1 > 0) {
    // Proportional discount if absolute discount was used
    discountAmount = Math.round(((sph as any).discountAmount / sph.subtotal1) * subtotal1);
  }

  const subtotalAfterDiscount = Math.max(0, subtotal1 - discountAmount);

  // PPN calculation
  const isPpnIncluded = sph.isPpnIncluded !== false;
  const ppnPercent = sph.ppnPercent || 11;
  const ppnAmount = (isPpnIncluded || (sph.ppnAmount && sph.ppnAmount > 0))
    ? Math.round(subtotalAfterDiscount * (ppnPercent / 100))
    : 0;

  const subtotal2 = subtotalAfterDiscount + ppnAmount;
  const accommodationFee = sph.accommodationFee || 0;
  const grandTotal = subtotal2 + accommodationFee;
  const terbilang = angkaTerbilang(grandTotal);

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
    terbilang,
    originalGrandTotal,
    priceDifference: grandTotal - originalGrandTotal
  };
}
