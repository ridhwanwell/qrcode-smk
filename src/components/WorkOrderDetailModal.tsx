import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Calendar, 
  UserCheck, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Send, 
  Printer, 
  Plus, 
  Check, 
  Phone, 
  Sparkles,
  MapPin,
  Percent,
  SlidersHorizontal,
  Briefcase,
  Award
} from 'lucide-react';
import { CalibrationSchedule, MedicalDeviceToCalibrate } from '../types';
import { formatRupiah, formatIndonesianDate, getUrgencyInfo, generateWhatsAppMessage, TODAY_STR, ensureDeviceSeliaItems } from '../utils/helpers';
import confetti from 'canvas-confetti';

interface WorkOrderDetailModalProps {
  schedule: CalibrationSchedule | null;
  onClose: () => void;
  onUpdateSchedule: (updated: CalibrationSchedule) => void;
  onOpenPrintModal: (schedule: CalibrationSchedule) => void;
  onOpenEditModal: (schedule: CalibrationSchedule) => void;
  onSendReminder: (schedule: CalibrationSchedule) => void;
  onOpenSeliaManager?: () => void;
}

export const WorkOrderDetailModal: React.FC<WorkOrderDetailModalProps> = ({
  schedule,
  onClose,
  onUpdateSchedule,
  onOpenPrintModal,
  onOpenEditModal,
  onSendReminder,
  onOpenSeliaManager
}) => {
  if (!schedule) return null;

  const [devices, setDevices] = useState<MedicalDeviceToCalibrate[]>(schedule.targetDevices);
  const [certNumber, setCertNumber] = useState(schedule.certificateNumber || '');
  const [copiedWA, setCopiedWA] = useState(false);
  
  const [bapPdfUrl, setBapPdfUrl] = useState<string | undefined>(schedule.bapPdfUrl);
  const [bastpPdfUrl, setBastpPdfUrl] = useState<string | undefined>(schedule.bastpPdfUrl);

  const urgency = getUrgencyInfo(schedule, TODAY_STR);
  const totalQty = devices.reduce((acc, d) => acc + (d.quantity || 1), 0);

  // Update a single device status
  const handleDeviceStatusChange = (
    deviceId: string, 
    newStatus: 'Pending' | 'In Progress' | 'Pass' | 'Fail' | 'Needs Adjustment',
    errorVal?: number,
    notesVal?: string
  ) => {
    const updatedDevices = devices.map(d => {
      if (d.id === deviceId) {
        return {
          ...d,
          status: newStatus,
          measuredErrorPercent: errorVal !== undefined ? errorVal : d.measuredErrorPercent,
          notes: notesVal !== undefined ? notesVal : d.notes
        };
      }
      return d;
    });

    setDevices(updatedDevices);

    // Calculate new progress percent
    const completedCount = updatedDevices.filter(d => d.status === 'Pass' || d.status === 'Fail').length;
    const progress = Math.round((completedCount / updatedDevices.length) * 100);

    const updatedSchedule: CalibrationSchedule = {
      ...schedule,
      targetDevices: updatedDevices,
      progressPercent: progress,
      bapPdfUrl,
      bastpPdfUrl,
      status: progress === 100 
        ? (schedule.certificateNumber ? 'Sertifikat Terbit' : 'Selesai Kalibrasi') 
        : (progress > 0 ? 'Sedang Berjalan' : schedule.status)
    };

    onUpdateSchedule(updatedSchedule);

    if (progress === 100) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleDeviceLabelChange = (deviceId: string, newLabel: string) => {
    const updatedDevices = devices.map(d => {
      if (d.id === deviceId) {
        return { ...d, labelNumber: newLabel };
      }
      return d;
    });
    setDevices(updatedDevices);
    
    // Auto save
    const updatedSchedule: CalibrationSchedule = {
      ...schedule,
      targetDevices: updatedDevices
    };
    onUpdateSchedule(updatedSchedule);
  };

  // Mark all devices as Pass & Complete calibration -> transfer to Selia & Sertifikat
  const handleCompleteAll = () => {
    const updatedDevices = devices.map(d => ({
      ...d,
      status: 'Pass' as const,
      measuredErrorPercent: d.measuredErrorPercent || 0.8
    }));

    setDevices(updatedDevices);
    const autoCert = certNumber || `CERT-SMK-2026-${Date.now().toString().slice(-4)}/${schedule.hospitalName.slice(0, 4).toUpperCase()}`;
    setCertNumber(autoCert);

    const baseUpdatedSchedule: CalibrationSchedule = {
      ...schedule,
      targetDevices: updatedDevices,
      progressPercent: 100,
      bapPdfUrl,
      bastpPdfUrl,
      status: 'Selesai Kalibrasi',
      completedDate: TODAY_STR,
      certificateNumber: autoCert
    };

    // Auto generate 1-by-1 unit items for Selia & Sertifikat tracking
    const seliaItems = ensureDeviceSeliaItems(baseUpdatedSchedule);
    const updatedSchedule: CalibrationSchedule = {
      ...baseUpdatedSchedule,
      seliaItems
    };

    onUpdateSchedule(updatedSchedule);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const handleCopyWA = () => {
    const text = generateWhatsAppMessage(schedule, urgency);
    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
    onSendReminder(schedule);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-[#D8D2CB] my-8 max-h-[90vh] flex flex-col justify-between text-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#D8D2CB] shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#1C658C] bg-[#EEEEEE] px-2.5 py-0.5 rounded-md border border-[#D8D2CB]">
                {schedule.workOrderNumber}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${urgency.badgeClass}`}>
                {urgency.label}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#1C658C] mt-1">
              {schedule.hospitalName}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {schedule.hospitalCity}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-[#EEEEEE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs pr-1 custom-scrollbar">
          {/* Key Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#EEEEEE]/50 p-3 rounded-xl border border-[#D8D2CB]">
              <span className="text-slate-500 block text-[10px]">Tanggal Pelaksanaan</span>
              <span className="font-bold text-slate-800 text-xs">
                {formatIndonesianDate(schedule.scheduledDate)}
              </span>
            </div>

            <div className="bg-[#EEEEEE]/50 p-3 rounded-xl border border-[#D8D2CB]">
              <span className="text-slate-500 block text-[10px]">Lead Teknisi & Marketing</span>
              <span className="font-bold text-[#1C658C] text-xs truncate block">
                {schedule.leadTechnicianName}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Mkt: {schedule.marketingName || 'Shifa Zalza Billa'}
              </span>
            </div>

            <div className="bg-[#EEEEEE]/50 p-3 rounded-xl border border-[#D8D2CB]">
              <span className="text-slate-500 block text-[10px]">Nilai Kontrak Kalibrasi</span>
              <span className="font-bold text-emerald-700 text-xs font-mono">
                {formatRupiah(schedule.contractValue)}
              </span>
            </div>

            <div className="bg-[#EEEEEE]/50 p-3 rounded-xl border border-[#D8D2CB]">
              <span className="text-slate-500 block text-[10px]">Otoritas Persetujuan</span>
              <span className="font-bold text-slate-800 text-xs truncate block">
                {schedule.approvedByName || 'Hafizh Pasifianto, S.Tr.T.'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {schedule.approvedByRole || 'Manajer Teknik'}
              </span>
            </div>
          </div>

          {/* Calibrator tools assigned */}
          <div className="bg-[#EEEEEE]/40 p-3.5 rounded-xl border border-[#D8D2CB]">
            <h4 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5 mb-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#1C658C]" />
              Alat Kalibrator Master PT. Sarana Multi Kalibrasi yang Ditugaskan:
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {schedule.assignedCalibratorNames.map((calName, i) => (
                <span key={i} className="bg-white text-[#1C658C] border border-[#398AB9]/30 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs">
                  ✓ {calName}
                </span>
              ))}
            </div>
          </div>

          {/* Progress Bar & Quick Actions */}
          <div className="bg-[#EEEEEE]/40 p-4 rounded-xl border border-[#D8D2CB]">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="font-bold text-slate-800">Progres Kalibrasi Alat Medis RS</span>
                <span className="text-slate-500 ml-2">
                  ({devices.filter(d => d.status === 'Pass' || d.status === 'Fail').length} dari {devices.length} Jenis, Total {totalQty} Unit)
                </span>
              </div>
              <span className="font-bold text-[#1C658C] text-sm">{schedule.progressPercent}%</span>
            </div>

            <div className="w-full bg-[#D8D2CB]/40 rounded-full h-2.5 overflow-hidden mb-3 border border-[#D8D2CB]">
              <div
                className={`h-full rounded-full transition-all ${
                  schedule.progressPercent === 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-[#398AB9] to-[#1C658C]'
                }`}
                style={{ width: `${schedule.progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D8D2CB]">
              <button
                onClick={handleCompleteAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sudah Selesai Kalibrasi</span>
              </button>
            </div>

            {/* Banner info for Selia & Certificate Status */}
            {(schedule.status === 'Sudah Selesai Kalibrasi' || schedule.progressPercent === 100) && (
              <div className="mt-3 p-3 bg-gradient-to-r from-teal-900/90 to-cyan-950/90 text-white rounded-xl border border-teal-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-teal-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Sudah Selesai Kalibrasi — Siap Proses Selia & Cetak Sertifikat</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Data RS <strong>{schedule.hospitalName}</strong> dapat dikelola di menu <strong>Sistem & Master → Update Perkembangan Setelah Kalibrasi Selesai</strong> untuk mengatur status <em>Belum Selia / Proses Selia / Cetak Sertifikat</em> per alat.
                  </p>
                </div>
                {onOpenSeliaManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSeliaManager();
                    }}
                    className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <span>Buka Menu Selia & Sertifikat ➔</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Itemized Device Calibration Table with Quantity */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
              <span>Daftar Pengujian Alat Medis & Input Hasil Uji Lapangan:</span>
              <span className="text-[#1C658C] font-mono font-bold">Total {totalQty} Unit Alkes</span>
            </h4>

            <div className="border border-[#D8D2CB] rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#EEEEEE] text-slate-600 border-b border-[#D8D2CB]">
                    <th className="py-2.5 px-3">Nama Alat Medis</th>
                    <th className="py-2.5 px-3 text-center">Jumlah / Qty</th>
                    <th className="py-2.5 px-3">Status Pengujian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2CB]">
                  {devices.map((device) => (
                    <tr key={device.id} className="hover:bg-[#EEEEEE]/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-800">{device.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{device.brandModel} ({device.serialNumber})</p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-[#1C658C]">
                        {device.quantity || 1} Unit
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={device.status}
                          onChange={(e) => handleDeviceStatusChange(device.id, e.target.value as any)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border bg-white focus:outline-none cursor-pointer ${
                            device.status === 'Pass' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                            device.status === 'Fail' ? 'text-rose-700 border-rose-300 bg-rose-50' :
                            device.status === 'In Progress' ? 'text-[#1C658C] border-[#398AB9] bg-[#398AB9]/10' :
                            'text-slate-600 border-[#D8D2CB]'
                          }`}
                        >
                          <option value="Pending">Pending (Belum Diuji)</option>
                          <option value="In Progress">Sedang Diuji</option>
                          <option value="Pass">Laik Pakai / Sudah Lulus Kalibrasi</option>
                          <option value="Fail">Fail (Tidak Lulus Uji)</option>
                          <option value="Needs Adjustment">Perlu Penyesuaian</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#D8D2CB] flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Penanggung Jawab Teknis: <strong className="text-slate-700">Hafizh Pasifianto, S.Tr.T.</strong> (PT. Sarana Multi Kalibrasi)
          </p>
          <button
            onClick={onClose}
            className="bg-[#EEEEEE] hover:bg-[#D8D2CB]/60 text-slate-700 border border-[#D8D2CB] font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
