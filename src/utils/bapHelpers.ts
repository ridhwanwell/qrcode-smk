import { SphQuotation, BapDocument, BapItem, CalibrationSchedule } from '../types';
import { extractSphPrefix, generateBapNumberFromSph } from './helpers';

/**
 * Format date to Indonesian full date (e.g. "Jumat, 04 September 2026")
 */
export function formatIndonesianPoDate(dateStr?: string): string {
  if (!dateStr) return 'Selasa, 22 September 2026';
  if (dateStr.includes(',')) return dateStr;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export interface BapPoNumberOptions {
  sphNumber: string;    // e.g. "074/SMK-SPH/IX-2026"
  boNumber: string;     // e.g. "074/SMK-BO/IX-2026"
  fpNumber: string;     // e.g. "074/SMK-FP/IX-2026"
  kwpNumber: string;    // e.g. "074/SMK-KWP/IX-2026"
  sequenceNumber: string; // "074"
}

/**
 * Get the 3 official document numbers from SPH (SPH, BO, FP / KWP)
 */
export function getBapPoOptionsFromSph(sph?: SphQuotation | null, fallbackRef?: string): BapPoNumberOptions {
  let seq = sph?.dealData?.sequenceNumber;
  if (!seq && sph?.dealData?.boNumber) {
    const match = sph.dealData.boNumber.match(/^(\d{1,3})/);
    if (match) seq = match[1].padStart(3, '0');
  }
  if (!seq && sph?.sphNumber) {
    seq = extractSphPrefix(sph.sphNumber);
  }
  if (!seq && fallbackRef) {
    seq = extractSphPrefix(fallbackRef);
  }
  const cleanSeq = String(seq || '001').padStart(3, '0').slice(-3);

  const refNumber = sph?.dealData?.boNumber || sph?.sphNumber || fallbackRef || '';
  const suffixMatch = refNumber.match(/\/([I|V|X|L|C|D|M]+)[-\/](\d{4})/i);
  let romanMonth = 'IX';
  let year = new Date().getFullYear();
  if (suffixMatch) {
    romanMonth = suffixMatch[1].toUpperCase();
    year = parseInt(suffixMatch[2], 10);
  } else {
    const d = sph?.date ? new Date(sph.date) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    romanMonth = romanMonths[validDate.getMonth()] || 'IX';
    year = validDate.getFullYear();
  }

  return {
    sequenceNumber: cleanSeq,
    sphNumber: sph?.sphNumber || `${cleanSeq}/SMK-SPH/${romanMonth}-${year}`,
    boNumber: sph?.dealData?.boNumber || `${cleanSeq}/SMK-BO/${romanMonth}-${year}`,
    fpNumber: sph?.dealData?.fpNumber || `${cleanSeq}/SMK-FP/${romanMonth}-${year}`,
    kwpNumber: sph?.dealData?.kwpNumber || `${cleanSeq}/SMK-KWP/${romanMonth}-${year}`
  };
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
    keterangan: it.notes?.toLowerCase().includes('batal') ? 'Batal' : '',
    unitPrice: it.unitPrice || 0
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

/**
 * Create a new BapDocument from a CalibrationSchedule (Penjadwalan RS)
 */
export function createBapFromSchedule(schedule: CalibrationSchedule, matchingSph?: SphQuotation | null): BapDocument {
  if (matchingSph) {
    const fromSph = createBapFromSph(matchingSph);
    // If schedule has custom poContractNumber, prefer it
    if (schedule.poContractNumber) {
      fromSph.sphNumber = schedule.poContractNumber;
    }
    return fromSph;
  }

  const seq = schedule.hospitalCode || extractSphPrefix(schedule.workOrderNumber);
  const cleanSeq = String(seq || '001').padStart(3, '0').slice(-3);

  const refStr = schedule.workOrderNumber || '';
  const suffixMatch = refStr.match(/\/([I|V|X|L|C|D|M]+)[-\/](\d{4})/i);
  let romanMonth = 'IX';
  let year = new Date().getFullYear();
  if (suffixMatch) {
    romanMonth = suffixMatch[1].toUpperCase();
    year = parseInt(suffixMatch[2], 10);
  } else {
    const d = schedule.scheduledDate ? new Date(schedule.scheduledDate) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    romanMonth = romanMonths[validDate.getMonth()] || 'IX';
    year = validDate.getFullYear();
  }

  const bapNumber = schedule.bapNumber || `${cleanSeq}/SMK/BAP/${romanMonth}/${year}`;
  const bastpNumber = schedule.bastpNumber || `${cleanSeq}/SMK/BASTP/${romanMonth}/${year}`;
  const defaultDateColumns = ['Tgl 03', 'Tgl 04', 'Tgl 05', 'Tgl 06', 'Tgl 07', 'Tgl 08', 'Tgl 09'];

  const items: BapItem[] = (schedule.targetDevices || []).map((dev, idx) => ({
    id: dev.id || `bap-sch-${idx + 1}-${Date.now()}`,
    no: idx + 1,
    namaAlat: dev.name,
    poQty: Number(dev.quantity) || 1,
    realisasi: {},
    total: 0,
    sisa: Number(dev.quantity) || 1,
    keterangan: dev.notes || ''
  }));

  const cityDistrict = schedule.hospitalCity 
    ? (schedule.hospitalCity.includes(',') ? schedule.hospitalCity : `${schedule.hospitalCity}, Jawa Tengah`)
    : 'Surakarta, Jawa Tengah';

  const poNumber = schedule.poContractNumber || schedule.workOrderNumber;

  return {
    id: `BAP-SCH-${schedule.id}`,
    sphId: '',
    sphNumber: poNumber,
    customerName: schedule.hospitalName,
    poDate: formatIndonesianPoDate(schedule.scheduledDate),
    address: schedule.hospitalAddress || 'Jl. Kenari 3 No. A3',
    cityDistrict,
    labelNumber: schedule.hospitalCode || cleanSeq,
    bapNumber,
    bastpNumber,
    dateColumns: defaultDateColumns,
    items,
    nonPoHeader: {
      customerName: schedule.hospitalName,
      sphNumber: poNumber,
      poDate: formatIndonesianPoDate(schedule.scheduledDate),
      address: schedule.hospitalAddress || 'Jl. Kenari 3 No. A3',
      cityDistrict,
      labelNumber: schedule.hospitalCode || cleanSeq,
      bastpNumber
    },
    nonPoDateColumns: [...defaultDateColumns],
    nonPoItems: [],
    status: 'Dalam Pekerjaan',
    createdAt: schedule.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
