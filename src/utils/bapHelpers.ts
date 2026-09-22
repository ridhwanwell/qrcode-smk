import { SphQuotation, BapDocument, BapItem } from '../types';
import { extractSphPrefix, generateBapNumberFromSph } from './helpers';

/**
 * Format date to Indonesian full date (e.g. "Jumat, 04 September 2026")
 */
export function formatIndonesianPoDate(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return dateStr || 'Jumat, 04 September 2026';
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr || 'Jumat, 04 September 2026';
  }
}

/**
 * Recalculate totals and remaining quantities for a single BapItem
 */
export function recalculateBapItem(item: BapItem, dateCols: string[]): BapItem {
  let sumReal = 0;
  for (const col of dateCols) {
    const val = Number(item.realisasi?.[col]) || 0;
    sumReal += val;
  }
  const poQty = Number(item.poQty) || 0;
  const sisa = poQty - sumReal;

  return {
    ...item,
    poQty,
    total: sumReal,
    sisa
  };
}

/**
 * Create a new BapDocument from an SPH Quotation
 */
export function createBapFromSph(sph: SphQuotation, existingLabelNo?: string): BapDocument {
  // Derive 3-digit prefix sequence matching BO/FP/KWP (e.g. "200" from "200/SMK-SPH/IX-2026" or dealData)
  let seq = sph.dealData?.sequenceNumber;
  if (!seq && sph.dealData?.boNumber) {
    const match = sph.dealData.boNumber.match(/^(\d{1,3})/);
    if (match) seq = match[1].padStart(3, '0');
  }
  if (!seq) {
    seq = extractSphPrefix(sph.sphNumber);
  }

  // Extract Roman Month & Year from boNumber, dealDate, sphNumber, or date
  let romanMonth = 'IX';
  let year = new Date().getFullYear();

  const refNumber = sph.dealData?.boNumber || sph.sphNumber || '';
  const suffixMatch = refNumber.match(/\/([I|V|X|L|C|D|M]+)[-\/](\d{4})/i);
  if (suffixMatch) {
    romanMonth = suffixMatch[1].toUpperCase();
    year = parseInt(suffixMatch[2], 10);
  } else {
    const dateStr = sph.dealData?.dealDate || sph.date;
    const d = dateStr ? new Date(dateStr) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    romanMonth = romanMonths[validDate.getMonth()] || 'IX';
    year = validDate.getFullYear();
  }

  const labelNumber = existingLabelNo || seq;
  const bapNumber = `${seq}/SMK/BAP/${romanMonth}/${year}`;
  const bastpNumber = `${seq}/SMK/BASTP/${romanMonth}/${year}`;

  // Default to 7 flexible date columns matching the reference template
  const defaultDateColumns = ['Tgl 03', 'Tgl 04', 'Tgl 05', 'Tgl 06', 'Tgl 07', 'Tgl 08', 'Tgl 09'];

  // Map SPH items to BAP items
  const items: BapItem[] = (sph.items || []).map((it, idx) => ({
    id: `bap-item-${idx + 1}-${Date.now()}`,
    no: idx + 1,
    namaAlat: it.description,
    poQty: Number(it.quantity) || 1,
    realisasi: {},
    total: 0,
    sisa: Number(it.quantity) || 1,
    keterangan: it.notes?.toLowerCase().includes('batal') ? 'Batal' : ''
  }));

  // Initial city district from SPH
  let cityDistrict = sph.city || 'Surakarta';
  if (sph.hospitalAddress && !cityDistrict.includes(',')) {
    cityDistrict = `${cityDistrict}, Jawa Tengah`;
  }

  return {
    id: `BAP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    sphId: sph.id,
    sphNumber: sph.sphNumber,
    customerName: sph.hospitalName,
    poDate: formatIndonesianPoDate(sph.date),
    address: sph.hospitalAddress || 'Jl. Kenari 3 No. A3',
    cityDistrict: cityDistrict,
    labelNumber: labelNumber,
    bapNumber: bapNumber,
    bastpNumber: bastpNumber,
    dateColumns: defaultDateColumns,
    items,
    nonPoHeader: {
      customerName: sph.hospitalName || '',
      sphNumber: sph.sphNumber || '',
      poDate: formatIndonesianPoDate(sph.date),
      address: sph.hospitalAddress || '',
      cityDistrict: cityDistrict,
      labelNumber: labelNumber,
      bastpNumber: bastpNumber
    },
    nonPoDateColumns: [...defaultDateColumns],
    nonPoItems: [],
    status: 'Dalam Pekerjaan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
