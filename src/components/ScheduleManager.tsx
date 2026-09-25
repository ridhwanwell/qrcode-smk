import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  UserCheck, 
  Wrench, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Send, 
  Printer, 
  MoreVertical, 
  CheckSquare, 
  SlidersHorizontal, 
  ChevronRight, 
  MapPin, 
  Sparkles, 
  Phone, 
  Briefcase, 
  Layers, 
  Trash2, 
  BellRing,
  Download,
  FileCode,
  Award,
  FileSpreadsheet,
  Check,
  X
} from 'lucide-react';
import { 
  CalibrationSchedule, 
  Hospital, 
  Technician, 
  CalibratorAsset, 
  UrgencyLevel,
  BapDocument,
  SphQuotation
} from '../types';
import { 
  formatRupiah, 
  formatIndonesianDate, 
  getUrgencyInfo,
  generateWhatsAppMessage,
  TODAY_STR,
  extractSphPrefix
} from '../utils/helpers';
import { exportSpkToWord, exportBapToWord } from '../utils/spkWordExport';
import { exportBapToExcel } from '../utils/bapExcelExport';
import { createBapFromSchedule, createBapFromSph, getBapPoOptionsFromSph, formatIndonesianPoDate } from '../utils/bapHelpers';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ScheduleManagerProps {
  schedules: CalibrationSchedule[];
  hospitals: Hospital[];
  technicians: Technician[];
  calibrators: CalibratorAsset[];
  sphList?: SphQuotation[];
  bapDocuments?: BapDocument[];
  onSelectSchedule: (schedule: CalibrationSchedule) => void;
  onOpenNewScheduleModal: () => void;
  onOpenSpkModal?: (schedule?: CalibrationSchedule) => void;
  onOpenEditScheduleModal: (schedule: CalibrationSchedule) => void;
  onOpenPrintModal: (schedule: CalibrationSchedule) => void;
  onSendReminder: (schedule: CalibrationSchedule) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onNavigateToSelia?: () => void;
  onOpenBapModal?: (schedule: CalibrationSchedule) => void;
  onUpdateSchedule?: (schedule: CalibrationSchedule) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  schedules,
  hospitals,
  technicians,
  calibrators,
  onSelectSchedule,
  onOpenNewScheduleModal,
  onOpenSpkModal,
  onOpenEditScheduleModal,
  onOpenPrintModal,
  onSendReminder,
  onDeleteSchedule,
  onNavigateToSelia,
  sphList = [],
  bapDocuments = [],
  onOpenBapModal,
  onUpdateSchedule
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [technicianFilter, setTechnicianFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteTargetSchedule, setDeleteTargetSchedule] = useState<CalibrationSchedule | null>(null);

  // BAP Excel Download Modal State in Penjadwalan RS
  const [bapTargetSchedule, setBapTargetSchedule] = useState<CalibrationSchedule | null>(null);
  const [selectedPoSource, setSelectedPoSource] = useState<'sph' | 'rs_custom'>('sph');
  const [customRsPoInput, setCustomRsPoInput] = useState<string>('');
  const [bapPoDateInput, setBapPoDateInput] = useState<string>('');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Helper to open the BAP download dialog with initial PO matching
  const handleOpenBapDownloadDialog = (sch: CalibrationSchedule) => {
    setBapTargetSchedule(sch);

    const matchingSph = sphList.find(s => 
      s.hospitalName.toLowerCase() === sch.hospitalName.toLowerCase() ||
      (s.dealData?.boNumber && s.dealData.boNumber === sch.workOrderNumber) ||
      s.sphNumber === sch.workOrderNumber
    );
    const options = getBapPoOptionsFromSph(matchingSph, sch.workOrderNumber);

    const existingPo = sch.poContractNumber || '';
    if (existingPo && (existingPo === options.sphNumber || existingPo === options.boNumber)) {
      setSelectedPoSource('sph');
      setCustomRsPoInput('');
    } else if (existingPo) {
      setSelectedPoSource('rs_custom');
      setCustomRsPoInput(existingPo);
    } else {
      setSelectedPoSource('sph');
      setCustomRsPoInput('027.2/22041/2026');
    }

    // Set tanggal PO from schedule
    setBapPoDateInput(formatIndonesianPoDate(sch.poDate || sch.scheduledDate));
  };

  // Helper to trigger Excel download
  const handleExecuteBapExcelDownload = () => {
    if (!bapTargetSchedule) return;

    const matchingSph = sphList.find(s => 
      s.hospitalName.toLowerCase() === bapTargetSchedule.hospitalName.toLowerCase() ||
      (s.dealData?.boNumber && s.dealData.boNumber === bapTargetSchedule.workOrderNumber) ||
      s.sphNumber === bapTargetSchedule.workOrderNumber
    );
    const options = getBapPoOptionsFromSph(matchingSph, bapTargetSchedule.workOrderNumber);

    // 1. Nomor PO / Kontrak (Pilihan SPH atau dari Customer RS)
    const effectivePo = selectedPoSource === 'sph'
      ? options.sphNumber
      : (customRsPoInput.trim() || '027.2/22041/2026');

    // 2. Tanggal PO dari penjadwalan RS
    const effectivePoDate = bapPoDateInput.trim() || formatIndonesianPoDate(bapTargetSchedule.scheduledDate);

    // Retrieve or create BAP Document
    const existing = bapDocuments.find(b => 
      (bapTargetSchedule.bapNumber && b.bapNumber === bapTargetSchedule.bapNumber) ||
      b.customerName.toLowerCase() === bapTargetSchedule.hospitalName.toLowerCase() ||
      b.id === `BAP-SCH-${bapTargetSchedule.id}`
    );

    let bapToExport: BapDocument;
    if (existing) {
      bapToExport = {
        ...existing,
        sphNumber: effectivePo,
        poDate: effectivePoDate,
        customerName: bapTargetSchedule.hospitalName || existing.customerName,
        nonPoHeader: existing.nonPoHeader ? {
          ...existing.nonPoHeader,
          sphNumber: effectivePo,
          poDate: effectivePoDate,
          customerName: bapTargetSchedule.hospitalName || existing.nonPoHeader.customerName
        } : undefined
      };
    } else if (matchingSph) {
      const fresh = createBapFromSph(matchingSph);
      bapToExport = {
        ...fresh,
        sphNumber: effectivePo,
        poDate: effectivePoDate,
        nonPoHeader: fresh.nonPoHeader ? {
          ...fresh.nonPoHeader,
          sphNumber: effectivePo,
          poDate: effectivePoDate
        } : undefined
      };
    } else {
      const freshSch = createBapFromSchedule(bapTargetSchedule);
      bapToExport = {
        ...freshSch,
        sphNumber: effectivePo,
        poDate: effectivePoDate,
        nonPoHeader: freshSch.nonPoHeader ? {
          ...freshSch.nonPoHeader,
          sphNumber: effectivePo,
          poDate: effectivePoDate
        } : undefined
      };
    }

    // Persist chosen PO number & PO Date back to schedule
    if (onUpdateSchedule) {
      onUpdateSchedule({
        ...bapTargetSchedule,
        poContractNumber: effectivePo,
        poDate: effectivePoDate
      });
    }

    // Export with Lead Technician Name mapped to PT SMK signature block
    // RS user name is left blank so RS can handwrite
    exportBapToExcel(bapToExport, { leadTechnicianName: bapTargetSchedule.leadTechnicianName });

    setDownloadSuccessToast(`BAP Excel (.xlsx) untuk ${bapTargetSchedule.hospitalName} berhasil diunduh!`);
    setTimeout(() => setDownloadSuccessToast(null), 4000);
    setBapTargetSchedule(null);
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      if (!sch) return false;
      const urgency = getUrgencyInfo(sch, TODAY_STR);
      
      const hospitalName = sch.hospitalName || '';
      const workOrderNumber = sch.workOrderNumber || '';
      const leadTechnicianName = sch.leadTechnicianName || '';
      const marketingName = sch.marketingName || '';
      const hospitalCity = sch.hospitalCity || '';

      const matchesSearch = 
        hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leadTechnicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        marketingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hospitalCity.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || sch.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'ALL' || urgency.level === urgencyFilter;
      const matchesTech = technicianFilter === 'ALL' || sch.leadTechnicianId === technicianFilter;

      return matchesSearch && matchesStatus && matchesUrgency && matchesTech;
    });
  }, [schedules, searchTerm, statusFilter, urgencyFilter, technicianFilter]);

  // Urgency Counts
  const counts = useMemo(() => {
    let overdue = 0;
    let critical = 0;
    let warning = 0;
    let upcoming = 0;
    let completed = 0;

    schedules.forEach(s => {
      if (!s) return;
      if (s.status === 'Selesai Kalibrasi' || s.status === 'Sertifikat Terbit') {
        completed++;
        return;
      }
      const u = getUrgencyInfo(s, TODAY_STR);
      if (u.level === 'OVERDUE') overdue++;
      else if (u.level === 'CRITICAL') critical++;
      else if (u.level === 'WARNING') warning++;
      else if (u.level === 'UPCOMING') upcoming++;
    });

    return { overdue, critical, warning, upcoming, completed };
  }, [schedules]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white text-slate-800 p-5 sm:p-6 rounded-2xl border border-[#D8D2CB] shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1C658C]">
                  Penjadwalan Kalibrasi Rumah Sakit
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C658C]/10 text-[#1C658C] font-mono border border-[#1C658C]/20">
                  PT. SARANA MULTI KALIBRASI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Alokasi teknisi ber-STR, marketing in-charge, kuantiti alkes, dan notifikasi pengingat otomatis.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToSelia && (
            <button
              onClick={onNavigateToSelia}
              className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all border border-teal-400/40"
              title="Buka menu Update Perkembangan Setelah Kalibrasi Selesai (Belum Selia / Proses Selia / Cetak Sertifikat)"
            >
              <Award className="w-4 h-4 text-teal-200" />
              <span>⚡ Update Perkembangan Selia & Sertifikat</span>
            </button>
          )}

          {onOpenSpkModal && (
            <button
              onClick={() => onOpenSpkModal()}
              className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
              id="btn-add-spk-main"
            >
              <FileText className="w-4 h-4" />
              <span>Buat SPK Baru (Form Khusus)</span>
            </button>
          )}

          <button
            onClick={onOpenNewScheduleModal}
            className="bg-white hover:bg-[#EEEEEE] text-slate-700 border border-[#D8D2CB] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
            id="btn-add-schedule-main"
          >
            <Plus className="w-4 h-4 text-[#1C658C]" />
            <span>Tambah Jadwal RS</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Pill Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => { setUrgencyFilter('OVERDUE'); setStatusFilter('ALL'); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            urgencyFilter === 'OVERDUE'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-[#D8D2CB] hover:border-rose-200'
          }`}
        >
          <span className="text-[11px] font-bold text-rose-600 block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Terlewat Tenggat ({counts.overdue})
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">Jadwal overdue perlu reschedule</span>
        </button>

        <button
          onClick={() => { setUrgencyFilter('CRITICAL'); setStatusFilter('ALL'); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            urgencyFilter === 'CRITICAL'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-[#D8D2CB] hover:border-amber-200'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Kritis &lt; 3 Hari ({counts.critical})
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">Segera kirim WA notifikasi</span>
        </button>

        <button
          onClick={() => { setUrgencyFilter('WARNING'); setStatusFilter('ALL'); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            urgencyFilter === 'WARNING'
              ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-500/20 shadow-xs'
              : 'bg-white border-[#D8D2CB] hover:border-yellow-200'
          }`}
        >
          <span className="text-[11px] font-bold text-yellow-700 block flex items-center gap-1">
            <BellRing className="w-3.5 h-3.5" /> Mendekati 4-7 Hari ({counts.warning})
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">Persiapan alat master</span>
        </button>

        <button
          onClick={() => { setUrgencyFilter('UPCOMING'); setStatusFilter('ALL'); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            urgencyFilter === 'UPCOMING'
              ? 'bg-[#398AB9]/15 border-[#398AB9] ring-2 ring-[#398AB9]/20 shadow-xs'
              : 'bg-white border-[#D8D2CB] hover:border-[#398AB9]/40'
          }`}
        >
          <span className="text-[11px] font-bold text-[#1C658C] block flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Mendatang ({counts.upcoming})
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">Jadwal reguler terencana</span>
        </button>

        <button
          onClick={() => { setUrgencyFilter('ALL'); setStatusFilter('ALL'); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            urgencyFilter === 'ALL' && statusFilter === 'ALL'
              ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-xs'
              : 'bg-white border-[#D8D2CB] hover:border-slate-300 text-slate-800'
          }`}
        >
          <span className={`text-[11px] font-bold block ${urgencyFilter === 'ALL' && statusFilter === 'ALL' ? 'text-white' : 'text-slate-800'}`}>
            Semua Jadwal ({schedules.length})
          </span>
          <span className={`text-xs mt-0.5 block ${urgencyFilter === 'ALL' && statusFilter === 'ALL' ? 'text-[#D8D2CB]' : 'text-emerald-700 font-medium'}`}>
            {counts.completed} SPK Selesai
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#D8D2CB] shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari RS, SPK, teknisi, marketing, kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1C658C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#D8D2CB] text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#1C658C]"
          >
            <option value="ALL">Semua Status SPK</option>
            <option value="Terkonfirmasi">Terkonfirmasi</option>
            <option value="Persiapan Alat">Persiapan Alat</option>
            <option value="Sedang Berjalan">Sedang Berjalan</option>
            <option value="Sertifikat Terbit">Sertifikat Terbit</option>
            <option value="Selesai Kalibrasi">Selesai Kalibrasi</option>
          </select>

          {/* Technician Dropdown */}
          <select
            value={technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
            className="bg-white border border-[#D8D2CB] text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#1C658C]"
          >
            <option value="ALL">Semua 11 Lead Teknisi</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-[#EEEEEE] p-1 rounded-xl border border-[#D8D2CB]">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'cards' ? 'bg-white text-[#1C658C] shadow-xs border border-[#D8D2CB]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kartu
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-[#1C658C] shadow-xs border border-[#D8D2CB]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tabel
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Content: Cards or Table */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#D8D2CB] shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Tidak ada jadwal kalibrasi yang sesuai</h3>
          <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setUrgencyFilter('ALL'); setTechnicianFilter('ALL'); }}
            className="mt-4 bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1C658C]/20 transition-colors"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((schedule) => {
            const urgency = getUrgencyInfo(schedule, TODAY_STR);
            const targetDevices = Array.isArray(schedule.targetDevices) ? schedule.targetDevices : [];
            const totalQty = targetDevices.reduce((sum, d) => sum + (d?.quantity || 1), 0);
            const supportTechNames = Array.isArray(schedule.supportTechnicianNames) ? schedule.supportTechnicianNames : [];
            const calibratorNames = Array.isArray(schedule.assignedCalibratorNames) ? schedule.assignedCalibratorNames : [];

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-2xl border border-[#D8D2CB] hover:border-[#398AB9] shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-[#D8D2CB] bg-[#EEEEEE]/30">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${urgency.badgeClass}`}>
                      {urgency.label}
                    </span>
                    <span className="font-mono text-[11px] text-[#1C658C] font-bold bg-white px-2 py-0.5 rounded border border-[#D8D2CB]">
                      {schedule.workOrderNumber}
                    </span>
                  </div>

                  <h3 
                    onClick={() => onSelectSchedule(schedule)}
                    className="font-bold text-base text-slate-800 group-hover:text-[#1C658C] transition-colors cursor-pointer line-clamp-1"
                  >
                    {schedule.hospitalName}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {schedule.hospitalCity}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 text-xs">
                  {/* Lead Tech & Support */}
                  <div className="bg-[#EEEEEE]/50 p-2.5 rounded-xl border border-[#D8D2CB] space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-[#1C658C] shrink-0" />
                        <span className="text-slate-500">Lead Teknisi:</span>
                        <strong className="text-slate-800 truncate">{schedule.leadTechnicianName || 'Belum ditugaskan'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#D8D2CB]/60 text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-[#398AB9]" />
                        Marketing:
                      </span>
                      <span className="font-bold text-[#1C658C]">{schedule.marketingName || 'Shifa Zalza Billa'}</span>
                    </div>

                    {supportTechNames.length > 0 && (
                      <p className="text-[10px] text-slate-500">
                        Pendamping: {supportTechNames.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Target Medical Equipment Count & Total Quantity & 7-Digit Label */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">
                        Alkes: <strong className="text-slate-800">{targetDevices.length} Jenis ({totalQty} Unit)</strong>
                      </span>
                      <span className="font-bold text-[#1C658C]">{schedule.progressPercent || 0}% Selesai</span>
                    </div>
                    <div className="w-full bg-[#EEEEEE] rounded-full h-2 overflow-hidden border border-[#D8D2CB]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          schedule.progressPercent === 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-[#398AB9] to-[#1C658C]'
                        }`}
                        style={{ width: `${schedule.progressPercent || 0}%` }}
                      />
                    </div>
                    {/* 7-digit Label Range Badge */}
                    <div className="mt-1.5 flex items-center justify-between bg-[#EEEEEE]/60 px-2 py-1 rounded-lg border border-[#D8D2CB] text-[10px]">
                      <span className="text-slate-500">No. Label RS (7-Digit):</span>
                      <span className="font-mono font-bold text-[#1C658C]">
                        {schedule.labelRange || (schedule.labelStart ? `${schedule.labelStart} - ${schedule.labelEnd}` : `${schedule.hospitalCode || '100'}0001 s/d ${schedule.hospitalCode || '100'}${String(totalQty).padStart(4, '0')}`)}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Calibrator Tools */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-[#1C658C]" />
                      Alat Kalibrator PT SMK Ditugaskan:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {calibratorNames.length > 0 ? (
                        calibratorNames.map((calName, i) => (
                          <span key={i} className="bg-[#EEEEEE] text-[#1C658C] border border-[#D8D2CB] text-[10px] font-medium px-2 py-0.5 rounded-md">
                            {calName}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sesuai kebutuhan lapangan</span>
                      )}
                    </div>
                  </div>

                  {/* Schedule Date & Contract Value */}
                  <div className="pt-2 border-t border-[#D8D2CB] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Jadwal Pelaksanaan</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-[#1C658C]" />
                        {formatIndonesianDate(schedule.scheduledDate)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Nilai Kontrak</span>
                      <span className="font-bold text-slate-900 font-mono">{formatRupiah(schedule.contractValue)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-[#EEEEEE]/30 border-t border-[#D8D2CB] flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => onSelectSchedule(schedule)}
                    className="flex-1 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Detail & Hasil</span>
                  </button>

                  <button
                    onClick={() => handleOpenBapDownloadDialog(schedule)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    title="Download Excel Berita Acara Pekerjaan (BAP) 4-Sheet & Pilihan No. PO"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>BAP Excel</span>
                  </button>

                  <button
                    onClick={() => onOpenEditScheduleModal(schedule)}
                    className="bg-white hover:bg-[#EEEEEE] text-slate-700 border border-[#D8D2CB] p-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                    title="Edit Jadwal"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                  </button>

                  {onDeleteSchedule && (
                    <button
                      onClick={() => setDeleteTargetSchedule(schedule)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                      title="Hapus Jadwal Kalibrasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-[#D8D2CB] shadow-xs overflow-hidden text-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#EEEEEE] text-slate-600 border-b border-[#D8D2CB] font-semibold">
                  <th className="py-3 px-4">No. BO / Urgensi</th>
                  <th className="py-3 px-4">Rumah Sakit</th>
                  <th className="py-3 px-4">Tanggal Pelaksanaan</th>
                  <th className="py-3 px-4">Lead Teknisi & Marketing</th>
                  <th className="py-3 px-4">Alat Medis & Quantity</th>
                  <th className="py-3 px-4">No. Label RS (7-Digit)</th>
                  <th className="py-3 px-4 text-right">Nilai Kontrak</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D2CB]">
                {filteredSchedules.map((sch) => {
                  const urgency = getUrgencyInfo(sch, TODAY_STR);
                  const targetDevices = Array.isArray(sch.targetDevices) ? sch.targetDevices : [];
                  const totalQty = targetDevices.reduce((sum, d) => sum + (d?.quantity || 1), 0);

                  return (
                    <tr key={sch.id} className="hover:bg-[#EEEEEE]/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-mono font-bold text-[#1C658C]">{sch.workOrderNumber}</p>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.2 rounded border ${urgency.badgeClass}`}>
                          {urgency.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{sch.hospitalName}</p>
                        <p className="text-slate-500 text-[11px]">{sch.hospitalCity}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{formatIndonesianDate(sch.scheduledDate)}</p>
                        <p className="text-slate-400 text-[10px]">s.d {formatIndonesianDate(sch.endDate)}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{sch.leadTechnicianName || 'Belum ditugaskan'}</p>
                        <p className="text-[#398AB9] text-[11px]">Marketing: {sch.marketingName || 'Shifa Zalza Billa'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{totalQty} Unit ({targetDevices.length} Jenis)</span>
                          <span className="text-[10px] bg-[#1C658C]/10 text-[#1C658C] px-1.5 py-0.2 rounded font-semibold font-mono border border-[#1C658C]/20">
                            {sch.progressPercent || 0}%
                          </span>
                        </div>
                        <div className="w-24 bg-[#EEEEEE] rounded-full h-1.5 mt-1 overflow-hidden border border-[#D8D2CB]">
                          <div className="bg-[#1C658C] h-full rounded-full" style={{ width: `${sch.progressPercent || 0}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/30 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                          {sch.labelRange || sch.labelStart ? `${sch.labelStart} - ${sch.labelEnd}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        {formatRupiah(sch.contractValue)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectSchedule(sch)}
                            className="bg-[#1C658C]/10 hover:bg-[#1C658C]/20 text-[#1C658C] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Buka Detail & Hasil"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => handleOpenBapDownloadDialog(sch)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Download BAP Excel (4 Sheet) & Pilihan No. PO"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>BAP Excel</span>
                          </button>
                          <button
                            onClick={() => onOpenEditScheduleModal(sch)}
                            className="bg-white hover:bg-[#EEEEEE] text-slate-700 border border-[#D8D2CB] p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteSchedule && (
                            <button
                              onClick={() => setDeleteTargetSchedule(sch)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Schedule */}
      <ConfirmDeleteModal
        isOpen={deleteTargetSchedule !== null}
        title="Hapus Jadwal Kalibrasi?"
        message="Apakah Anda yakin ingin menghapus jadwal kalibrasi ini? Seluruh data penugasan teknisi dan lembar kerja terkait SPK ini akan dihapus dari sistem."
        itemName={deleteTargetSchedule ? `${deleteTargetSchedule.hospitalName} • SPK: ${deleteTargetSchedule.workOrderNumber}` : ''}
        confirmText="Ya, Hapus Jadwal"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTargetSchedule && onDeleteSchedule) {
            onDeleteSchedule(deleteTargetSchedule.id);
          }
          setDeleteTargetSchedule(null);
        }}
        onClose={() => setDeleteTargetSchedule(null)}
      />

      {/* Modal Download Excel BAP dengan Pilihan Nomor PO / Kontrak */}
      {bapTargetSchedule && (() => {
        const matchingSph = sphList.find(s => 
          s.hospitalName.toLowerCase() === bapTargetSchedule.hospitalName.toLowerCase() ||
          (s.dealData?.boNumber && s.dealData.boNumber === bapTargetSchedule.workOrderNumber) ||
          s.sphNumber === bapTargetSchedule.workOrderNumber
        );
        const options = getBapPoOptionsFromSph(matchingSph, bapTargetSchedule.workOrderNumber);
        const targetDevices = Array.isArray(bapTargetSchedule.targetDevices) ? bapTargetSchedule.targetDevices : [];
        const totalUnits = targetDevices.reduce((sum, d) => sum + (d?.quantity || 1), 0);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Download Excel BAP</h3>
                    <p className="text-xs text-emerald-100">Berita Acara Pekerjaan 4-Sheet Resmi</p>
                  </div>
                </div>
                <button
                  onClick={() => setBapTargetSchedule(null)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
                {/* Schedule Info Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Rumah Sakit / Faskes:</span>
                    <span className="font-bold text-slate-900 text-right">{bapTargetSchedule.hospitalName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Jadwal Kalibrasi:</span>
                    <span className="font-semibold text-slate-800 text-right">{formatIndonesianDate(bapTargetSchedule.scheduledDate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Total Unit:</span>
                    <span className="font-bold text-slate-900 text-right">{targetDevices.length} Jenis ({totalUnits} Unit)</span>
                  </div>
                </div>

                {/* 1. Nomor PO / Kontrak Selection */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-900 block text-xs">
                    Nomor PO / Kontrak di Dokumen BAP:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Pilih apakah nomor PO sama dengan nomor SPH atau mengisi nomor PO resmi dari Customer / RS:
                  </p>

                  <div className="grid grid-cols-1 gap-2 pt-0.5">
                    {/* Option 1: Sesuai SPH */}
                    <label 
                      onClick={() => setSelectedPoSource('sph')}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        selectedPoSource === 'sph'
                          ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="poSource" 
                        checked={selectedPoSource === 'sph'} 
                        onChange={() => setSelectedPoSource('sph')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">1. Sesuai Nomor SPH</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-semibold">SPH</span>
                        </div>
                        <div className="font-mono text-emerald-800 font-bold text-[11px] truncate mt-0.5">
                          {options.sphNumber}
                        </div>
                      </div>
                    </label>

                    {/* Option 2: Custom PO from RS / Customer */}
                    <div 
                      onClick={() => setSelectedPoSource('rs_custom')}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                        selectedPoSource === 'rs_custom'
                          ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input 
                          type="radio" 
                          name="poSource" 
                          checked={selectedPoSource === 'rs_custom'} 
                          onChange={() => setSelectedPoSource('rs_custom')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">2. Ada No. PO dari Customer / RS</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-semibold">No. PO RS</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Ketik nomor PO / Kontrak yang diterbitkan oleh Rumah Sakit / Customer
                          </p>
                        </div>
                      </div>

                      {selectedPoSource === 'rs_custom' && (
                        <div className="pl-6 pt-1">
                          <input
                            type="text"
                            value={customRsPoInput}
                            onChange={(e) => setCustomRsPoInput(e.target.value)}
                            placeholder="Contoh: 027.2/22041/2026 atau PO/RS/IX/2026"
                            className="w-full bg-white border border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-900 font-semibold outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Tanggal PO (diisi dari Penjadwalan RS) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-900 block text-xs">
                    Tanggal PO (Diisi dari Penjadwalan RS):
                  </label>
                  <input
                    type="text"
                    value={bapPoDateInput}
                    onChange={(e) => setBapPoDateInput(e.target.value)}
                    placeholder="Contoh: Selasa, 22 September 2026"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg px-3 py-1.5 font-medium text-xs text-slate-900 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">
                    Otomatis mengambil hari dan tanggal dari jadwal pelaksanaan RS: <span className="font-semibold text-slate-700">{formatIndonesianDate(bapTargetSchedule.scheduledDate)}</span>
                  </p>
                </div>

                {/* 3. Tanda Tangan & Personil BAP */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 block text-[11px] mb-1">
                    Ketentuan Penandatangan Dokumen BAP:
                  </span>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 font-medium">Teknisi PT SMK:</span>
                    <span className="font-bold text-emerald-800 text-right">{bapTargetSchedule.leadTechnicianName} (Lead Teknisi)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 font-medium">Nama User / RS:</span>
                    <span className="text-amber-700 font-semibold italic text-right">(Dikosongi - untuk ditulis tangan pihak RS)</span>
                  </div>
                </div>

                {/* Sheet information */}
                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                  <span className="font-bold block mb-0.5">Format Sheet BAP Resmi (4 Sheet Standar):</span>
                  <span>1. Rekap Alkes PO • 2. BAP PO • 3. Rekap Non PO • 4. BAP Non PO (format presisi sesuai PDF acuan).</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                {onOpenBapModal ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = bapTargetSchedule;
                      setBapTargetSchedule(null);
                      onOpenBapModal(target);
                    }}
                    className="text-xs font-semibold text-slate-700 hover:text-[#1C658C] hover:underline"
                  >
                    Buka Editor BAP Lengkap &rarr;
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBapTargetSchedule(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBapExcelDownload}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Success Toast */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-600 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/60 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-200" />
          </div>
          <span className="text-xs font-medium">{downloadSuccessToast}</span>
          <button 
            onClick={() => setDownloadSuccessToast(null)} 
            className="text-white/70 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
