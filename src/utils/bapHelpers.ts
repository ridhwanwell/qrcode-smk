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
  // Derive 3-digit prefix from SPH number (e.g. "045/SMK-SPH/VII-2026" -> "045")
  const labelNumber = existingLabelNo || extractSphPrefix(sph.sphNumber);
  const bapNumber = generateBapNumberFromSph(sph.sphNumber);
  const now = new Date();
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const romanMonth = romanMonths[now.getMonth()] || 'IX';
  const year = now.getFullYear();
  const bastpNumber = `${labelNumber}/SMK/BASTP/${romanMonth}/${year}`;

  // Default to 7 flexible date columns matching the reference template
  const defaultDateColumns = ['Tgl 03', 'Tgl …', 'Tgl …', 'Tgl …', 'Tgl …', 'Tgl …', 'Tgl …'];

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
    bastpNumber: bastpNumber,
    dateColumns: defaultDateColumns,
    items,
    // Sheet Rekap Non PO starts completely blank by default
    nonPoHeader: {
      customerName: '',
      sphNumber: '',
      poDate: '',
      address: '',
      cityDistrict: '',
      labelNumber: '',
      bastpNumber: ''
    },
    nonPoDateColumns: [...defaultDateColumns],
    nonPoItems: [],
    status: 'Dalam Pekerjaan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
