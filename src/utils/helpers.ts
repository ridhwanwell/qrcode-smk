import { CalibrationSchedule, AutomaticReminder, UrgencyLevel, Hospital, MedicalDeviceToCalibrate, DeviceSeliaItem, SphQuotation } from '../types';

// ==========================================
// 3-DIGIT SPH PREFIX & LABEL / DOCUMENT NUMBER SYSTEM
// Format: 3 Initial Digits of SPH Number
// Example SPH: "045/SMK-SPH/VII-2026" -> Prefix: "045"
// - Label Number: 045.0001 s/d 045.0020
// - SPK Number:   045/SMK-SPK/VII/2026
// - BAP Number:   045/SMK/BAP/VII/2026
// ==========================================

export function extractSphPrefix(sphNumber?: string): string {
  if (!sphNumber) return '001';
  // Match initial 3 digits or leading digits at the beginning of SPH number
  const leadingMatch = sphNumber.match(/^(\d{1,3})/);
  if (leadingMatch) {
    return leadingMatch[1].padStart(3, '0');
  }
  const anyDigits = sphNumber.match(/(\d+)/);
  if (anyDigits) {
    return anyDigits[1].padStart(3, '0').slice(-3);
  }
  return '001';
}

export function generateSpkNumberFromSph(sphOrNumber?: string | any, dateStr?: string): string {
  const sphNumber = typeof sphOrNumber === 'string' ? sphOrNumber : sphOrNumber?.sphNumber;
  let prefix = typeof sphOrNumber === 'object' && sphOrNumber?.dealData?.sequenceNumber
    ? sphOrNumber.dealData.sequenceNumber
    : extractSphPrefix(sphNumber);

  prefix = String(prefix || '001').padStart(3, '0').slice(-3);

  const refStr = (typeof sphOrNumber === 'object' && sphOrNumber?.dealData?.boNumber) || sphNumber || '';
  const suffixMatch = refStr.match(/\/([I|V|X|L|C|D|M]+)[-\/](\d{4})/i);
  if (suffixMatch) {
    const month = suffixMatch[1].toUpperCase();
    const year = suffixMatch[2];
    return `${prefix}/SMK-SPK/${month}/${year}`;
  }

  const nowYear = dateStr ? dateStr.slice(0, 4) : '2026';
  const nowMonth = dateStr ? dateStr.slice(5, 7) : '09';
  return `${prefix}/SMK-SPK/${nowMonth}/${nowYear}`;
}

export function generateBapNumberFromSph(sphOrNumber?: string | any, dateStr?: string): string {
  const sphNumber = typeof sphOrNumber === 'string' ? sphOrNumber : sphOrNumber?.sphNumber;
  let prefix = typeof sphOrNumber === 'object' && sphOrNumber?.dealData?.sequenceNumber
    ? sphOrNumber.dealData.sequenceNumber
    : extractSphPrefix(sphNumber);

  prefix = String(prefix || '001').padStart(3, '0').slice(-3);

  const refStr = (typeof sphOrNumber === 'object' && sphOrNumber?.dealData?.boNumber) || sphNumber || '';
  const suffixMatch = refStr.match(/\/([I|V|X|L|C|D|M]+)[-\/](\d{4})/i);
  if (suffixMatch) {
    const month = suffixMatch[1].toUpperCase();
    const year = suffixMatch[2];
    return `${prefix}/SMK/BAP/${month}/${year}`;
  }

  const nowYear = dateStr ? dateStr.slice(0, 4) : '2026';
  const nowMonth = dateStr ? dateStr.slice(5, 7) : '09';
  return `${prefix}/SMK/BAP/${nowMonth}/${nowYear}`;
}

export function getHospitalCode(hospitalIdOrName?: string, hospitals: Hospital[] = []): string {
  if (!hospitalIdOrName) return '100';

  // If hospitalIdOrName looks like an SPH number, extract prefix "045"
  if (hospitalIdOrName.includes('SPH') || hospitalIdOrName.includes('/')) {
    return extractSphPrefix(hospitalIdOrName);
  }

  const found = hospitals.find(h => h.id === hospitalIdOrName || h.name === hospitalIdOrName);
  if (found && found.hospitalCode) {
    return extractSphPrefix(found.hospitalCode);
  }
  const idx = hospitals.findIndex(h => h.id === hospitalIdOrName || h.name === hospitalIdOrName);
  if (idx !== -1) {
    return String(100 + idx);
  }
  const numMatch = hospitalIdOrName.match(/\d+/);
  if (numMatch) {
    const parsed = parseInt(numMatch[0], 10);
    if (!isNaN(parsed)) {
      return String(parsed).padStart(3, '0').slice(-3);
    }
  }
  return '100';
}

export function formatLabelNumber(codePrefix: string = '001', sequence: number = 1): string {
  const cleanCode = extractSphPrefix(codePrefix);
  const cleanSeq = String(Math.max(1, sequence)).padStart(4, '0');
  return `${cleanCode}.${cleanSeq}`;
}

export function parseLabelNumber(label: string): { hospitalCode: string; sequence: number } {
  if (!label) {
    return { hospitalCode: '100', sequence: 1 };
  }
  const clean = label.replace(/\s+/g, '');
  if (clean.includes('.')) {
    const parts = clean.split('.');
    const code = (parts[0] || '100').padStart(3, '0').slice(-3);
    const seq = parseInt(parts[1], 10) || 1;
    return { hospitalCode: code, sequence: seq };
  }
  if (clean.length >= 7) {
    const code = clean.slice(0, 3);
    const seq = parseInt(clean.slice(3), 10) || 1;
    return { hospitalCode: code, sequence: seq };
  }
  return { hospitalCode: '100', sequence: 1 };
}

export function calculateLabelRange(hospitalCode: string = '100', startSeq: number = 1, totalUnits: number = 1): {
  startLabel: string;
  endLabel: string;
  displayRange: string;
} {
  const start = Math.max(1, startSeq);
  const end = start + Math.max(1, totalUnits) - 1;
  const startLabel = formatLabelNumber(hospitalCode, start);
  const endLabel = formatLabelNumber(hospitalCode, end);
  const displayRange = startLabel === endLabel ? startLabel : `${startLabel} s/d ${endLabel}`;
  return { startLabel, endLabel, displayRange };
}

export function assignDeviceLabels(
  devices: MedicalDeviceToCalibrate[],
  hospitalCode: string = '100',
  startSequence: number = 1
): MedicalDeviceToCalibrate[] {
  let currentSeq = Math.max(1, startSequence);
  return devices.map(dev => {
    const qty = Math.max(1, dev.quantity || 1);
    const seqStart = currentSeq;
    const seqEnd = currentSeq + qty - 1;
    currentSeq += qty;

    const labelStart = formatLabelNumber(hospitalCode, seqStart);
    const labelEnd = formatLabelNumber(hospitalCode, seqEnd);
    const labelText = qty === 1 ? labelStart : `${labelStart} s/d ${labelEnd}`;

    return {
      ...dev,
      labelNumber: labelText,
      labelSequenceStart: seqStart,
      labelSequenceEnd: seqEnd
    };
  });
}

// Helper to get formatted current local date string 'YYYY-MM-DD'
export function getCurrentDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Reference anchor date - defaults dynamically to current local date
export const TODAY_STR = getCurrentDateStr();

export function formatRupiah(amount: number): string {
  // Use replace to ensure it strictly matches Rp35.000.000 format without spaces
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(amount);
  return `Rp${formatted}`;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatIndonesianDateTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function calculateDaysRemaining(targetDateStr: string, baseDateStr: string = getCurrentDateStr()): number {
  if (!targetDateStr) return 0;
  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
  const [bYear, bMonth, bDay] = baseDateStr.split('-').map(Number);

  const targetDate = new Date(tYear, tMonth - 1, tDay);
  const baseDate = new Date(bYear, bMonth - 1, bDay);

  const diffTime = targetDate.getTime() - baseDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getUrgencyInfo(schedule: CalibrationSchedule, baseDateStr: string = getCurrentDateStr()): {
  level: UrgencyLevel;
  daysRemaining: number;
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
} {
  if (schedule.status === 'Selesai Kalibrasi' || schedule.status === 'Sertifikat Terbit') {
    return {
      level: 'NORMAL',
      daysRemaining: 0,
      label: 'Selesai',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
      description: 'Pekerjaan kalibrasi telah rampung.'
    };
  }

  if (schedule.status === 'Dibatalkan') {
    return {
      level: 'NORMAL',
      daysRemaining: 0,
      label: 'Dibatalkan',
      badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      dotClass: 'bg-zinc-400',
      description: 'Jadwal dibatalkan.'
    };
  }

  const days = calculateDaysRemaining(schedule.scheduledDate, baseDateStr);

  if (days < 0) {
    return {
      level: 'OVERDUE',
      daysRemaining: days,
      label: `Terlewat ${Math.abs(days)} Hari`,
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-semibold animate-pulse',
      dotClass: 'bg-red-600',
      description: `PERHATIAN: Jadwal kalibrasi terlewat ${Math.abs(days)} hari dari tenggat waktu!`
    };
  }

  if (days === 0) {
    return {
      level: 'CRITICAL',
      daysRemaining: 0,
      label: 'HARI INI (Deadline)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
      dotClass: 'bg-rose-600',
      description: 'Jadwal pelaksanaan kalibrasi berlangsung HARI INI!'
    };
  }

  if (days === 1) {
    return {
      level: 'CRITICAL',
      daysRemaining: 1,
      label: 'H-1 (Besok)',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      dotClass: 'bg-amber-600',
      description: 'Jadwal kalibrasi besok! Pastikan alat kalibrator siap & surat tugas tercetak.'
    };
  }

  if (days <= 3) {
    return {
      level: 'WARNING',
      daysRemaining: days,
      label: `H-${days} (Mendekati)`,
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dotClass: 'bg-yellow-500',
      description: `Jadwal kalibrasi dalam ${days} hari ke depan. Konfirmasi ulang PIC RS.`
    };
  }

  if (days <= 7) {
    return {
      level: 'UPCOMING',
      daysRemaining: days,
      label: `H-${days} (Minggu Ini)`,
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      dotClass: 'bg-blue-500',
      description: `Jadwal kalibrasi dalam ${days} hari. Siapkan logistik dan alokasi teknisi.`
    };
  }

  return {
    level: 'NORMAL',
    daysRemaining: days,
    label: `${days} Hari Lagi`,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
    description: `Jadwal kalibrasi terencana dalam ${days} hari.`
  };
}

export function generateAutomatedReminders(
  schedules: CalibrationSchedule[],
  baseDateStr: string = getCurrentDateStr()
): AutomaticReminder[] {
  const reminders: AutomaticReminder[] = [];

  schedules.forEach((sch) => {
    if (sch.status === 'Selesai Kalibrasi' || sch.status === 'Sertifikat Terbit' || sch.status === 'Dibatalkan') {
      return;
    }

    const urgency = getUrgencyInfo(sch, baseDateStr);
    
    // We generate automated reminders for schedules that are OVERDUE, CRITICAL (H-0, H-1), WARNING (H-2, H-3), or UPCOMING (H-7)
    if (urgency.level !== 'NORMAL') {
      let msg = '';
      const targetDevs = Array.isArray(sch.targetDevices) ? sch.targetDevices : [];
      const assignedCals = Array.isArray(sch.assignedCalibratorNames) ? sch.assignedCalibratorNames : [];
      const leadTech = sch.leadTechnicianName || 'Teknisi PT SMK';

      if (urgency.level === 'OVERDUE') {
        msg = `🚨 [PERINGATAN TERLAMBAT] Surat Perintah Kerja ${sch.workOrderNumber} di ${sch.hospitalName} telah melewati tenggat waktu (${Math.abs(urgency.daysRemaining)} hari yang lalu). Harap segera hubungi Teknisi Utama (${leadTech}) dan PIC RS.`;
      } else if (urgency.daysRemaining === 0) {
        msg = `⚡ [PENGINGAT HARI-H] Pelaksanaan kalibrasi di ${sch.hospitalName} (${sch.workOrderNumber}) dijadwalkan HARI INI. Teknisi: ${leadTech}. Total ${targetDevs.length} alat medis disiapkan.`;
      } else if (urgency.daysRemaining === 1) {
        msg = `⚠️ [PENGINGAT H-1] Besok jadwal kalibrasi di ${sch.hospitalName}. Teknisi: ${leadTech}. Pastikan modul kalibrator (${assignedCals.join(', ') || 'Kalibrator Utama'}) terkalibrasi & siap pakai.`;
      } else if (urgency.daysRemaining <= 3) {
        msg = `📅 [PENGINGAT H-${urgency.daysRemaining}] Kalibrasi RS ${sch.hospitalName} dalam ${urgency.daysRemaining} hari. Konfirmasi ruang medis dengan PIC (${sch.hospitalPic}).`;
      } else {
        msg = `📋 [PENGINGAT H-${urgency.daysRemaining}] Jadwal terencana di ${sch.hospitalName}. Tim teknisi: ${leadTech}.`;
      }

      reminders.push({
        id: `REM-${sch.id}-${urgency.level}-${urgency.daysRemaining}`,
        scheduleId: sch.id,
        workOrderNumber: sch.workOrderNumber,
        hospitalName: sch.hospitalName,
        scheduledDate: sch.scheduledDate,
        daysRemaining: urgency.daysRemaining,
        urgency: urgency.level,
        technicianName: leadTech,
        technicianPhone: sch.hospitalPhone,
        message: msg,
        isAcknowledged: sch.remindersSentCount > 2,
        createdAt: `${baseDateStr} 07:30`,
        status: sch.remindersSentCount > 0 ? 'Terkirim Otomatis' : 'Pending'
      });
    }
  });

  // Sort by urgency: OVERDUE first, then CRITICAL, WARNING, UPCOMING
  const urgencyWeight: Record<UrgencyLevel, number> = {
    OVERDUE: 1,
    CRITICAL: 2,
    WARNING: 3,
    UPCOMING: 4,
    NORMAL: 5
  };

  return reminders.sort((a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency]);
}

export function generateWhatsAppMessage(schedule: CalibrationSchedule, urgency: ReturnType<typeof getUrgencyInfo>): string {
  const calibratorNames = Array.isArray(schedule.assignedCalibratorNames) ? schedule.assignedCalibratorNames : [];
  const calibratorsStr = calibratorNames.length > 0 
    ? calibratorNames.map(c => `• ${c}`).join('\n')
    : '• Menyesuaikan kebutuhan lapangan';

  const targetDevices = Array.isArray(schedule.targetDevices) ? schedule.targetDevices : [];
  const devicesStr = targetDevices.map((d, i) => `${i+1}. ${d.name} (${d.room || '-'})`).join('\n');
  const supportTechNames = Array.isArray(schedule.supportTechnicianNames) ? schedule.supportTechnicianNames : [];

  return `*NOTIFIKASI PENGINGAT JADWAL KALIBRASI MEDIS*
----------------------------------------
*Rumah Sakit:* ${schedule.hospitalName}
*No. SPK / WO:* ${schedule.workOrderNumber}
*Tanggal Pelaksanaan:* ${formatIndonesianDate(schedule.scheduledDate)}
*Status Tenggat:* ${urgency.label} (${urgency.description})

*Teknisi Bertugas:*
• Lead: ${schedule.leadTechnicianName || 'Shifa Zalza Billa'}
${supportTechNames.map(s => `• Pendamping: ${s}`).join('\n')}

*Alat Kalibrator Ditugaskan:*
${calibratorsStr}

*Daftar Alat Medis Sasaran (${targetDevices.length} Unit):*
${devicesStr || '• Belum ada alat spesifik terdaftar'}

*PIC Rumah Sakit:* ${schedule.hospitalPic}
----------------------------------------
_Pesan otomatis Sistem Manajemen Aset & Kalibrasi Medis PT Sarana Medika Kalibrasi._`;
}

/**
 * Resolves the official 3-digit prefix matching BO, FP, KWP documents for a schedule.
 * Selia Dashboard label numbers (e.g. 074.0001) must strictly match the 3 digits of BO, FP, KWP.
 */
export function getScheduleDealPrefix(schedule: CalibrationSchedule, sphList: SphQuotation[] = []): string {
  // 1. Direct BO / FP / KWP numbers on schedule
  if (schedule.boNumber) {
    const m = schedule.boNumber.match(/^(\d{1,3})/);
    if (m) return m[1].padStart(3, '0');
  }
  if (schedule.fpNumber) {
    const m = schedule.fpNumber.match(/^(\d{1,3})/);
    if (m) return m[1].padStart(3, '0');
  }
  if (schedule.kwpNumber) {
    const m = schedule.kwpNumber.match(/^(\d{1,3})/);
    if (m) return m[1].padStart(3, '0');
  }

  // 2. Linked SPH deal data or SPH number
  if (sphList && sphList.length > 0) {
    const linkedSph = sphList.find(s => 
      (schedule.sphId && s.id === schedule.sphId) ||
      (schedule.sphNumber && s.sphNumber === schedule.sphNumber) ||
      (schedule.notes && s.sphNumber && schedule.notes.includes(s.sphNumber)) ||
      (schedule.hospitalName && s.hospitalName && s.hospitalName.trim().toLowerCase() === schedule.hospitalName.trim().toLowerCase()) ||
      (schedule.hospitalId && s.hospitalId && s.hospitalId === schedule.hospitalId)
    );

    if (linkedSph) {
      if (linkedSph.dealData?.sequenceNumber) {
        return String(linkedSph.dealData.sequenceNumber).padStart(3, '0');
      }
      if (linkedSph.dealData?.boNumber) {
        const m = linkedSph.dealData.boNumber.match(/^(\d{1,3})/);
        if (m) return m[1].padStart(3, '0');
      }
      if (linkedSph.sphNumber) {
        return extractSphPrefix(linkedSph.sphNumber);
      }
    }
  }

  // 3. schedule.sphNumber if set
  if (schedule.sphNumber) {
    return extractSphPrefix(schedule.sphNumber);
  }

  // 4. BAP number (e.g. "045/SMK/BAP/VII/2026" or "021/SMK/BAP/VIII/2026")
  if (schedule.bapNumber) {
    const m = schedule.bapNumber.match(/^(\d{1,3})/);
    if (m) return m[1].padStart(3, '0');
  }

  // 5. Hospital code if not the placeholder '100'
  if (schedule.hospitalCode && schedule.hospitalCode !== '100') {
    return extractSphPrefix(schedule.hospitalCode);
  }

  // 6. Work order / SPK number (e.g. "045/SMK-SPK/..." or "SPK/SMK/2026/08/021" -> "021")
  if (schedule.workOrderNumber) {
    const leading = schedule.workOrderNumber.match(/^(\d{1,3})/);
    if (leading) return leading[1].padStart(3, '0');
    const trailing = schedule.workOrderNumber.match(/\/(\d{1,3})$/);
    if (trailing) return trailing[1].padStart(3, '0');
  }

  // 7. Check notes for any SPH reference
  if (schedule.notes) {
    const noteSph = schedule.notes.match(/(\d{3})\/SMK-SPH/i);
    if (noteSph) return noteSph[1].padStart(3, '0');
  }

  return schedule.hospitalCode ? extractSphPrefix(schedule.hospitalCode) : '001';
}

/**
 * Derives full BO, FP, KWP documents info for a schedule so they are always in sync.
 */
export function getScheduleDealNumbers(schedule: CalibrationSchedule, sphList: SphQuotation[] = []) {
  const prefix = getScheduleDealPrefix(schedule, sphList);
  
  let romanMonth = 'IX';
  let year = new Date().getFullYear();

  const refStr = schedule.boNumber || schedule.bapNumber || schedule.workOrderNumber || '';
  const suffixMatch = refStr.match(/\/([I|V|X|L|C|D|M]+)[-\/](\d{4})/i);
  if (suffixMatch) {
    romanMonth = suffixMatch[1].toUpperCase();
    year = parseInt(suffixMatch[2], 10);
  } else if (schedule.scheduledDate) {
    const d = new Date(schedule.scheduledDate);
    if (!isNaN(d.getTime())) {
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      romanMonth = romanMonths[d.getMonth()] || 'IX';
      year = d.getFullYear();
    }
  }

  const boNumber = schedule.boNumber || `${prefix}/SMK-BO/${romanMonth}-${year}`;
  const fpNumber = schedule.fpNumber || `${prefix}/SMK-FP/${romanMonth}-${year}`;
  const kwpNumber = schedule.kwpNumber || `${prefix}/SMK-KWP/${romanMonth}-${year}`;

  return {
    sequenceNumber: prefix,
    romanMonth,
    year,
    boNumber,
    fpNumber,
    kwpNumber
  };
}

/** Jumlah unit alat. Kosong/tidak diisi = 1 (perilaku lama); 0 = alat tidak ada di lapangan. */
export function deviceUnitCount(d: { quantity?: any }): number {
  const raw = d?.quantity;
  if (raw === undefined || raw === null || raw === '') return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Label untuk jadwal SPH TRANSISI: admin mengetik nomor label pertama (mis. "257.0001"),
 * label berikutnya berurutan. Alat dengan qty 0 tidak mendapat label.
 */
export function assignDeviceLabelsFromStart(
  devices: MedicalDeviceToCalibrate[],
  labelStart: string
): MedicalDeviceToCalibrate[] {
  const { hospitalCode, sequence } = parseLabelNumber(labelStart);
  let currentSeq = Math.max(1, sequence);
  return devices.map(dev => {
    const qty = deviceUnitCount(dev);
    if (qty === 0) {
      return { ...dev, labelNumber: '-', labelSequenceStart: undefined, labelSequenceEnd: undefined };
    }
    const seqStart = currentSeq;
    const seqEnd = currentSeq + qty - 1;
    currentSeq += qty;
    const a = formatLabelNumber(hospitalCode, seqStart);
    const b = formatLabelNumber(hospitalCode, seqEnd);
    return { ...dev, labelNumber: qty === 1 ? a : `${a} s/d ${b}`, labelSequenceStart: seqStart, labelSequenceEnd: seqEnd };
  });
}

function normDeviceName(s: string): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * GABUNGKAN daftar unit Selia dengan daftar alat terbaru TANPA menghapus progres selia yang sudah ada:
 *  - Unit lama dicocokkan ke alat lewat id alat, atau nama alat bila id berubah.
 *  - Alat yang qty-nya bertambah / alat baru -> unit baru dengan nomor label melanjutkan urutan terakhir.
 *  - Qty berkurang -> unit "Belum Diselia" paling akhir dilepas; unit yang sudah diproses tidak pernah dihapus.
 * Hasil berurutan sesuai urutan alat, lalu unit lama yang alatnya sudah tidak ada.
 */
function mergeSeliaItems(
  schedule: CalibrationSchedule,
  existing: DeviceSeliaItem[],
  prefixForNew: string,
  dropUnusedOrphans: boolean = false
): DeviceSeliaItem[] {
  const targetDevices = Array.isArray(schedule.targetDevices) ? schedule.targetDevices : [];
  const deviceIds = new Set(targetDevices.map(d => d.id));
  const pool = existing.map(it => ({ it, used: false }));

  // nomor urut label terbesar per prefix (agar unit baru melanjutkan)
  let maxSeq = 0;
  existing.forEach(it => {
    const p = parseLabelNumber(it.labelNumber || '');
    if ((it.labelNumber || '').startsWith(`${prefixForNew}.`) && p.sequence > maxSeq) maxSeq = p.sequence;
  });

  const result: DeviceSeliaItem[] = [];
  const today = getCurrentDateStr();

  targetDevices.forEach(d => {
    const want = deviceUnitCount(d);
    // unit milik alat ini: id sama; bila kurang, ambil unit "yatim" (id alat lama sudah tidak ada) bernama sama
    const mine = pool.filter(p => !p.used && p.it.parentDeviceId === d.id);
    if (mine.length < want) {
      const byName = pool.filter(p => !p.used && !mine.includes(p) &&
        !deviceIds.has(p.it.parentDeviceId) && normDeviceName(p.it.deviceName) === normDeviceName(d.name));
      mine.push(...byName.slice(0, want - mine.length));
    }
    mine.forEach(p => { p.used = true; });

    let kept = mine.map(p => p.it);
    if (kept.length > want) {
      // lepas unit belum diproses dari belakang
      const keep: DeviceSeliaItem[] = [];
      let toDrop = kept.length - want;
      for (let i = kept.length - 1; i >= 0; i--) {
        if (toDrop > 0 && kept[i].seliaStatus === 'Belum Diselia' && !(kept[i].keterangan || '').trim()) {
          toDrop--;
          continue;
        }
        keep.unshift(kept[i]);
      }
      kept = keep;
    }

    const units = kept.map(u => ({ ...u, parentDeviceId: d.id, deviceName: d.name }));
    for (let i = units.length; i < want; i++) {
      maxSeq += 1;
      units.push({
        id: `selia-${schedule.id || 'sch'}-${d.id}-${i + 1}-${maxSeq}`,
        unitNo: 0,
        parentDeviceId: d.id,
        deviceName: d.name,
        unitTitle: d.name,
        brandModel: d.brandModel || '-',
        serialNumber: d.serialNumber || '-',
        labelNumber: formatLabelNumber(prefixForNew, maxSeq),
        room: d.room || '-',
        testStatus: 'Laik Pakai / Sudah Lulus Kalibrasi',
        seliaStatus: 'Belum Diselia',
        keterangan: '',
        updatedAt: today
      });
    }
    const total = units.length;
    units.forEach((u, idx) => {
      u.unitTitle = total > 1 ? `${d.name} (Unit #${idx + 1})` : d.name;
    });
    result.push(...units);
  });

  // unit lama yang alatnya sudah tidak ada: tetap disimpan bila sudah diproses (progres tidak hilang).
  // Untuk jadwal transisi, unit yang belum diproses ikut dilepas.
  pool.filter(p => !p.used).forEach(p => {
    const belumDiproses = p.it.seliaStatus === 'Belum Diselia' && !(p.it.keterangan || '').trim();
    if (dropUnusedOrphans && belumDiproses) return;
    result.push(p.it);
  });

  return result.map((u, idx) => ({ ...u, unitNo: idx + 1 }));
}

function seliaItemsSama(a: DeviceSeliaItem[], b: DeviceSeliaItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.id !== y.id || x.parentDeviceId !== y.parentDeviceId || x.labelNumber !== y.labelNumber ||
        x.unitNo !== y.unitNo || x.unitTitle !== y.unitTitle || x.deviceName !== y.deviceName) return false;
  }
  return true;
}

export function ensureDeviceSeliaItems(schedule: CalibrationSchedule, sphList: SphQuotation[] = []): DeviceSeliaItem[] {
  // --- Jadwal SPH TRANSISI: label diketik admin, tidak pernah disinkronkan ke prefix BO ---
  if (schedule.sumber === 'transisi') {
    const startLabel = schedule.labelStart || '';
    const prefix = parseLabelNumber(startLabel).hospitalCode;
    if (!schedule.seliaItems || schedule.seliaItems.length === 0) {
      const labeled = assignDeviceLabelsFromStart(schedule.targetDevices || [], startLabel || `${prefix}.0001`);
      const items: DeviceSeliaItem[] = [];
      let unitNo = 1;
      labeled.forEach(d => {
        const qty = deviceUnitCount(d);
        for (let i = 0; i < qty; i++) {
          items.push({
            id: `selia-${schedule.id || 'sch'}-${d.id}-${i + 1}`,
            unitNo: unitNo++,
            parentDeviceId: d.id,
            deviceName: d.name,
            unitTitle: qty > 1 ? `${d.name} (Unit #${i + 1})` : d.name,
            brandModel: d.brandModel || '-',
            serialNumber: d.serialNumber || '-',
            labelNumber: formatLabelNumber(prefix, (d.labelSequenceStart || 1) + i),
            room: d.room || '-',
            testStatus: 'Laik Pakai / Sudah Lulus Kalibrasi',
            seliaStatus: 'Belum Diselia',
            keterangan: '',
            updatedAt: getCurrentDateStr()
          });
        }
      });
      return items;
    }
    const merged = mergeSeliaItems(schedule, schedule.seliaItems, prefix, true);
    return seliaItemsSama(merged, schedule.seliaItems) ? schedule.seliaItems : merged;
  }

  const expectedPrefix = getScheduleDealPrefix(schedule, sphList);

  if (schedule.seliaItems && schedule.seliaItems.length > 0) {
    // Gabungkan dengan daftar alat terbaru (alat tambahan masuk, progres lama tetap)
    const merged = mergeSeliaItems(schedule, schedule.seliaItems, expectedPrefix);
    if (!seliaItemsSama(merged, schedule.seliaItems)) {
      schedule = { ...schedule, seliaItems: merged };
    }
  }

  if (schedule.seliaItems && schedule.seliaItems.length > 0) {
    // Check if any existing item has a mismatched prefix (e.g. old "100.xxxx" when BO/FP is "045" or "074")
    const needsPrefixSync = schedule.seliaItems.some(i => {
      if (!i.labelNumber) return true;
      const curPrefix = i.labelNumber.split('.')[0];
      return curPrefix !== expectedPrefix;
    });

    if (needsPrefixSync) {
      return schedule.seliaItems.map((item, idx) => {
        const parts = (item.labelNumber || '').split('.');
        const seq = parts.length > 1 ? parts[1] : String(item.unitNo || (idx + 1)).padStart(4, '0');
        return {
          ...item,
          labelNumber: `${expectedPrefix}.${seq}`
        };
      });
    }

    return schedule.seliaItems;
  }

  const items: DeviceSeliaItem[] = [];
  let globalUnitCounter = 1;
  const targetDevices = Array.isArray(schedule.targetDevices) ? schedule.targetDevices : [];

  targetDevices.forEach(d => {
    const qty = Math.max(1, d.quantity || 1);
    const startSeq = d.labelSequenceStart || schedule.labelSequenceStart || 1;
    const hospitalCode = expectedPrefix;

    for (let i = 1; i <= qty; i++) {
      const unitSeq = startSeq + i - 1;
      const unitLabel = formatLabelNumber(hospitalCode, unitSeq);
      const unitTitle = qty > 1 ? `${d.name} (Unit #${i})` : d.name;
      const serialNumber = qty > 1 && d.serialNumber ? `${d.serialNumber}-${i}` : (d.serialNumber || '-');

      items.push({
        id: `selia-${schedule.id || 'sch'}-${d.id}-${i}`,
        unitNo: globalUnitCounter++,
        parentDeviceId: d.id,
        deviceName: d.name,
        unitTitle: unitTitle,
        brandModel: d.brandModel || '-',
        serialNumber: serialNumber,
        labelNumber: unitLabel,
        room: d.room || '-',
        testStatus: 'Laik Pakai / Sudah Lulus Kalibrasi',
        seliaStatus: 'Belum Diselia',
        keterangan: '',
        updatedAt: getCurrentDateStr()
      });
    }
  });

  return items;
}

export function getScheduleLabelRange(schedule: CalibrationSchedule, sphList: SphQuotation[] = []): string {
  const items = ensureDeviceSeliaItems(schedule, sphList);
  if (items.length === 0) return schedule.labelRange || '-';
  const first = items[0]?.labelNumber || '-';
  const last = items[items.length - 1]?.labelNumber || '-';
  return first === last ? first : `${first} s/d ${last}`;
}

