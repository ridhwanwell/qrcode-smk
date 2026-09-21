import { SphItem, SphQuotation } from '../types';

/**
 * Konversi angka ke kata terbilang dalam Bahasa Indonesia
 * Contoh: 20300000 -> "Dua Puluh Juta Tiga Ratus Ribu Rupiah"
 */
export function angkaTerbilang(angka: number): string {
  if (isNaN(angka) || angka === 0) return 'Nol Rupiah';

  const bilangan = Math.abs(Math.round(angka));

  const satuan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function terbilangHelper(n: number): string {
    if (n < 12) {
      return satuan[n];
    } else if (n < 20) {
      return terbilangHelper(n - 10) + ' Belas';
    } else if (n < 100) {
      return terbilangHelper(Math.floor(n / 10)) + ' Puluh' + (n % 10 !== 0 ? ' ' + terbilangHelper(n % 10) : '');
    } else if (n < 200) {
      return 'Seratus' + (n - 100 !== 0 ? ' ' + terbilangHelper(n - 100) : '');
    } else if (n < 1000) {
      return terbilangHelper(Math.floor(n / 100)) + ' Ratus' + (n % 100 !== 0 ? ' ' + terbilangHelper(n % 100) : '');
    } else if (n < 2000) {
      return 'Seribu' + (n - 1000 !== 0 ? ' ' + terbilangHelper(n - 1000) : '');
    } else if (n < 1000000) {
      return terbilangHelper(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 !== 0 ? ' ' + terbilangHelper(n % 1000) : '');
    } else if (n < 1000000000) {
      return terbilangHelper(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 !== 0 ? ' ' + terbilangHelper(n % 1000000) : '');
    } else if (n < 1000000000000) {
      return terbilangHelper(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 !== 0 ? ' ' + terbilangHelper(n % 1000000000) : '');
    } else {
      return terbilangHelper(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 !== 0 ? ' ' + terbilangHelper(n % 1000000000000) : '');
    }
  }

  const hasil = terbilangHelper(bilangan).trim();
  // Capitalize properly and append Rupiah
  return hasil.charAt(0).toUpperCase() + hasil.slice(1) + ' Rupiah';
}

/**
 * Format angka ke format mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format angka desimal / nominal tanpa simbol mata uang
 */
export function formatNumber(amount: number, maxDecimals: number = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: maxDecimals > 0 ? 0 : 0,
    maximumFractionDigits: maxDecimals
  }).format(amount);
}

/**
 * KALKULATOR NEGOSIASI CERDAS (Smart Deal Target Negotiation Engine)
 * Sesuai Permintaan User:
 * 1. Menghitung otomatis harga satuan setiap alat medis dari target deal yang diinginkan pihak Rumah Sakit.
 * 2. Contoh: 500 pcs Thermohygro (awal 125 juta = 500 x 250k). Pihak RS nego jadi 100 juta include PPN 11%.
 *    Maka harga satuan thermohygro disesuaikan sehingga 500 pcs + PPN 11% = 100 juta tepat!
 * 3. Contoh: 10 Syringe Pump, 13 Infuse Pump, 35 Bedside Monitor. Ditambahkan PPN 11%, dan jika dinego
 *    menjadi nominal tertentu (misal 15 juta include PPN atau exclude PPN), semua harga satuan dikurangi
 *    secara proporsional agar GRAND TOTAL sesuai persis dengan permintaan RS.
 */
export interface NegotiationResult {
  items: SphItem[];
  subtotalOriginal: number;
  subtotal1: number;
  accommodationFee: number;
  subtotal2: number;
  ppnPercent: number;
  ppnAmount: number;
  grandTotal: number;
  terbilang: string;
  discountAmount: number;
  discountPercent: number;
}

export function calculateNegotiation({
  items,
  targetAmount,
  targetType = 'INCLUDE_PPN', // 'INCLUDE_PPN' | 'EXCLUDE_PPN' | 'DISCOUNT_PERCENT' | 'NONE' | 'MANUAL'
  includePpn = true,
  ppnRate = 0.11,
  accommodationFee = 0
}: {
  items: SphItem[];
  targetAmount?: number;
  targetType?: 'INCLUDE_PPN' | 'EXCLUDE_PPN' | 'DISCOUNT_PERCENT' | 'NONE' | 'MANUAL';
  includePpn?: boolean;
  ppnRate?: number;
  accommodationFee?: number;
}): NegotiationResult {
  // 1. Hitung total original berdasarkan standardPrice brosur (atau unitPrice jika standardPrice 0)
  const totalOriginalSubtotal = items.reduce(
    (acc, it) => acc + (it.quantity * (it.standardPrice !== undefined && it.standardPrice > 0 ? it.standardPrice : (it.unitPrice || 0))),
    0
  );

  if (items.length === 0) {
    return {
      items: [],
      subtotalOriginal: 0,
      subtotal1: 0,
      accommodationFee: 0,
      subtotal2: 0,
      ppnPercent: includePpn ? 11 : 0,
      ppnAmount: 0,
      grandTotal: 0,
      terbilang: 'Nol Rupiah',
      discountAmount: 0,
      discountPercent: 0
    };
  }

  // Jika tidak ada target nego atau mode NONE / MANUAL, pertahankan harga yang diketik manual persis apa adanya!
  if (!targetAmount || targetAmount <= 0 || targetType === 'NONE' || targetType === 'MANUAL') {
    const subtotal1 = items.reduce((acc, it) => acc + (it.quantity * (Number(it.unitPrice) || 0)), 0);
    const subtotal2 = subtotal1 + accommodationFee;
    const ppnAmount = includePpn ? Math.round(subtotal2 * ppnRate) : 0;
    const grandTotal = subtotal2 + ppnAmount;
    const discountAmount = Math.max(0, totalOriginalSubtotal - subtotal1);
    const discountPercent = totalOriginalSubtotal > 0 ? (discountAmount / totalOriginalSubtotal) * 100 : 0;

    return {
      items: items.map(it => ({
        ...it,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        totalPrice: (Math.max(1, Number(it.quantity) || 1)) * (Math.max(0, Number(it.unitPrice) || 0)),
        standardPrice: it.standardPrice !== undefined ? it.standardPrice : (Number(it.unitPrice) || 0)
      })),
      subtotalOriginal: totalOriginalSubtotal > 0 ? totalOriginalSubtotal : subtotal1,
      subtotal1,
      accommodationFee,
      subtotal2,
      ppnPercent: includePpn ? 11 : 0,
      ppnAmount,
      grandTotal,
      terbilang: angkaTerbilang(grandTotal),
      discountAmount,
      discountPercent
    };
  }

  let targetNetSubtotal = totalOriginalSubtotal;

  if (targetType === 'INCLUDE_PPN' && targetAmount && targetAmount > 0) {
    // Grand Total Target = (Subtotal1 + Akomodasi) * (1 + (includePpn ? ppnRate : 0))
    // Maka Subtotal1 Target = (Target Grand Total / (1 + ppnRate)) - Akomodasi
    const effectivePpnMultiplier = includePpn ? (1 + ppnRate) : 1;
    targetNetSubtotal = Math.max(0, (targetAmount / effectivePpnMultiplier) - accommodationFee);
  } else if (targetType === 'EXCLUDE_PPN' && targetAmount && targetAmount > 0) {
    // Target adalah subtotal murni sebelum PPN
    targetNetSubtotal = Math.max(0, targetAmount);
  } else if (targetType === 'DISCOUNT_PERCENT' && targetAmount !== undefined && targetAmount >= 0) {
    // Target adalah % diskon dari original
    const discountRatio = Math.max(0, Math.min(100, targetAmount)) / 100;
    targetNetSubtotal = totalOriginalSubtotal * (1 - discountRatio);
  }

  // Base harga yang akan diskalakan: gunakan standardPrice jika ada, atau unitPrice saat ini
  const baseForScale = totalOriginalSubtotal > 0
    ? totalOriginalSubtotal
    : items.reduce((acc, it) => acc + (it.quantity * (it.unitPrice || 0)), 0);

  // Ratio penyesuaian harga
  const adjustmentRatio = baseForScale > 0 ? (targetNetSubtotal / baseForScale) : 1;

  // Hitung harga satuan baru per item
  let runningSubtotal = 0;
  const updatedItems: SphItem[] = items.map((it) => {
    const basePrice = (it.standardPrice !== undefined && it.standardPrice > 0) ? it.standardPrice : (it.unitPrice || 0);
    const newUnitPrice = Math.round(basePrice * adjustmentRatio);
    const newTotal = newUnitPrice * it.quantity;
    runningSubtotal += newTotal;

    return {
      ...it,
      unitPrice: newUnitPrice,
      totalPrice: newTotal,
      standardPrice: it.standardPrice !== undefined ? it.standardPrice : basePrice
    };
  });

  // Jika ada selisih pembulatan rupiah dengan targetNetSubtotal (pada single/multi item),
  // lakukan penyesuaian presisi pada item terbesar agar total pas
  const roundingDifference = Math.round(targetNetSubtotal) - runningSubtotal;
  if (Math.abs(roundingDifference) > 0 && updatedItems.length > 0) {
    // Cari item yang memiliki quantity 1 atau bagikan ke item terbesar
    const singleUnitItem = updatedItems.find(it => it.quantity === 1) || updatedItems[0];
    if (singleUnitItem) {
      singleUnitItem.unitPrice += Math.round(roundingDifference / singleUnitItem.quantity);
      singleUnitItem.totalPrice = singleUnitItem.unitPrice * singleUnitItem.quantity;
      // Re-sum running subtotal
      runningSubtotal = updatedItems.reduce((acc, it) => acc + it.totalPrice, 0);
    }
  }

  const subtotal1 = runningSubtotal;
  const subtotal2 = subtotal1 + accommodationFee;
  const ppnAmount = includePpn ? Math.round(subtotal2 * ppnRate) : 0;
  let grandTotal = subtotal2 + ppnAmount;

  // Jika mode INCLUDE_PPN dan ada targetAmount, pastikan Grand Total bulat sama persis dengan targetAmount
  if (targetType === 'INCLUDE_PPN' && targetAmount && targetAmount > 0) {
    grandTotal = targetAmount;
  }

  const discountAmount = Math.max(0, totalOriginalSubtotal - subtotal1);
  const discountPercent = totalOriginalSubtotal > 0 ? (discountAmount / totalOriginalSubtotal) * 100 : 0;

  return {
    items: updatedItems,
    subtotalOriginal: totalOriginalSubtotal,
    subtotal1,
    accommodationFee,
    subtotal2,
    ppnPercent: includePpn ? 11 : 0,
    ppnAmount,
    grandTotal,
    terbilang: angkaTerbilang(grandTotal),
    discountAmount,
    discountPercent
  };
}

/**
 * Generate nomor SPH baru otomatis berdasarkan tahun/bulan
 * e.g. 045/SMK-SPH/VII-2026 atau 046/SMK-SPH/VIII-2026
 */
export function generateSphNumber(existingCount: number = 45): string {
  const now = new Date();
  const year = now.getFullYear();
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const monthRoman = romanMonths[now.getMonth()];
  const numberPadded = String(existingCount + 1).padStart(3, '0');
  return `${numberPadded}/SMK-SPH/${monthRoman}-${year}`;
}

/**
 * Format tanggal dalam format resmi Indonesia: "Surakarta, 09 September 2026"
 */
export function formatIndonesianLongDate(dateStr: string, city: string = 'Surakarta'): string {
  if (!dateStr) return `${city}, ${new Date().toLocaleDateString('id-ID')}`;
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return `${city}, ${dateStr}`;
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${city}, ${day} ${month} ${year}`;
  } catch {
    return `${city}, ${dateStr}`;
  }
}

/**
 * Daftar Tim Marketing Resmi PT. Sarana Multi Kalibrasi (sesuai database)
 */
export const OFFICIAL_MARKETING_STAFF = [
  { name: 'Sheva', phone: '0858-7867-5737' },
  { name: 'Ari', phone: '0812-4484-2383' },
  { name: 'Agus', phone: '0812-1503-1231' },
  { name: 'Junior', phone: '0812-2686-2605' },
  { name: 'Erwin', phone: '0852-0006-0589' },
  { name: 'Fitri Nur Aini', phone: '0851-1234570' },
  { name: 'Shifa Zalza Billa', phone: '0851-1234570' },
  { name: 'Sulis', phone: '0821-3670-7421' },
];

/**
 * 3 Pilihan Penerima / Pembuat Dokumen Deal Resmi (BO, FP, KWP)
 */
export const DEAL_RECIPIENT_OPTIONS = [
  'Fitri Nur Aini',
  'Sheva Maresca',
  'Junior Yudha Pamungkas'
] as const;

/**
 * Rekening Resmi PT. SARANA MULTI KALIBRASI
 */
export const BANK_MANDIRI_SMK = {
  bankName: 'Bank Mandiri',
  accountNumber: '138-00-2610846-9',
  accountName: 'SARANA MULTI KALIBRASI PT',
  segment: 'RS Swasta / Umum'
};

export const BANK_JATENG_SMK = {
  bankName: 'Bank Jateng',
  accountNumber: '1-002-01495-1',
  accountName: 'SARANA MULTI KALIBRASI PT',
  segment: 'RS Negeri / Pemerintah'
};

/**
 * Konversi angka bulan (1-12) ke angka romawi (I - XII)
 */
export function getRomanMonth(monthIndex1to12: number): string {
  const romanMonths = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanMonths[monthIndex1to12] || 'I';
}

/**
 * Deteksi / infer opsi pembayaran bank (both, jateng, mandiri, custom)
 */
export function getEffectivePaymentOption(sph?: {
  paymentOption?: string;
  bankName?: string;
  bankAccountNumber?: string;
  termsAndConditions?: string[];
} | null): 'both' | 'jateng' | 'mandiri' | 'custom' {
  if (!sph) return 'both';
  if (sph.paymentOption === 'jateng' || sph.paymentOption === 'mandiri' || sph.paymentOption === 'both' || sph.paymentOption === 'custom') {
    return sph.paymentOption;
  }
  const bName = (sph.bankName || '').toLowerCase();
  const bAcc = (sph.bankAccountNumber || '').trim();
  const term9 = (sph.termsAndConditions && sph.termsAndConditions.length >= 9) ? sph.termsAndConditions[8] : '';

  if (bName.includes('jateng') || bAcc === '1-002-01495-1' || (term9.includes('Bank Jateng') && !term9.includes('Bank Mandiri'))) {
    return 'jateng';
  }
  if (bName.includes('mandiri') || bAcc === '138-00-2610846-9' || (term9.includes('Bank Mandiri') && !term9.includes('Bank Jateng'))) {
    return 'mandiri';
  }
  return 'both';
}

/**
 * Helper untuk men-generate nomor BO, FP, dan KWP dengan 3 digit depan yang sama,
 * serta bulan romawi dan tahun yang mengikuti tanggal Deal.
 * Contoh: 074 -> 074/SMK-BO/IX-2026, 074/SMK-FP/IX-2026, 074/SMK-KWP/IX-2026
 */
export function generateDealNumbers(sequence: string | number, dealDateStr?: string) {
  const d = dealDateStr ? new Date(dealDateStr) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const month = validDate.getMonth() + 1; // 1-12
  const year = validDate.getFullYear();
  const romanMonth = getRomanMonth(month);
  
  // Format 3 digit prefix
  const cleanSeq = String(sequence || '074').trim().padStart(3, '0').slice(-3);

  return {
    sequenceNumber: cleanSeq,
    romanMonth,
    year,
    boNumber: `${cleanSeq}/SMK-BO/${romanMonth}-${year}`,
    fpNumber: `${cleanSeq}/SMK-FP/${romanMonth}-${year}`,
    kwpNumber: `${cleanSeq}/SMK-KWP/${romanMonth}-${year}`
  };
}


