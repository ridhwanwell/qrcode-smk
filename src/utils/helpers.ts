import { CalibrationSchedule, AutomaticReminder, UrgencyLevel, Hospital, MedicalDeviceToCalibrate, DeviceSeliaItem } from '../types';

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

export function ensureDeviceSeliaItems(schedule: CalibrationSchedule): DeviceSeliaItem[] {
  if (schedule.seliaItems && schedule.seliaItems.length > 0) {
    return schedule.seliaItems;
  }

  const items: DeviceSeliaItem[] = [];
  let globalUnitCounter = 1;
  const targetDevices = Array.isArray(schedule.targetDevices) ? schedule.targetDevices : [];

  targetDevices.forEach(d => {
    const qty = Math.max(1, d.quantity || 1);
    const startSeq = d.labelSequenceStart || schedule.labelSequenceStart || 1;
    const hospitalCode = schedule.hospitalCode || '100';

    for (let i = 1; i <= qty; i++) {
      const unitSeq = startSeq + i - 1;
      const unitLabel = formatLabelNumber(hospitalCode, unitSeq);
      const unitTitle = qty > 1 ? `${d.name} (Unit #${i})` : d.name;
      const serialNumber = qty > 1 && d.serialNumber ? `${d.serialNumber}-${i}` : (d.serialNumber || '-');

      items.push({
        id: `selia-${d.id}-${i}`,
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

