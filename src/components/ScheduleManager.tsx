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
  Award
} from 'lucide-react';
import { 
  CalibrationSchedule, 
  Hospital, 
  Technician, 
  CalibratorAsset, 
  UrgencyLevel 
} from '../types';
import { 
  formatRupiah, 
  formatIndonesianDate, 
  getUrgencyInfo,
  generateWhatsAppMessage,
  TODAY_STR
} from '../utils/helpers';
import { exportSpkToWord, exportBapToWord } from '../utils/spkWordExport';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ScheduleManagerProps {
  schedules: CalibrationSchedule[];
  hospitals: Hospital[];
  technicians: Technician[];
  calibrators: CalibratorAsset[];
  onSelectSchedule: (schedule: CalibrationSchedule) => void;
  onOpenNewScheduleModal: () => void;
  onOpenSpkModal?: (schedule?: CalibrationSchedule) => void;
  onOpenEditScheduleModal: (schedule: CalibrationSchedule) => void;
  onOpenPrintModal: (schedule: CalibrationSchedule) => void;
  onSendReminder: (schedule: CalibrationSchedule) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onNavigateToSelia?: () => void;
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
  onNavigateToSelia
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [technicianFilter, setTechnicianFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteTargetSchedule, setDeleteTargetSchedule] = useState<CalibrationSchedule | null>(null);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      const urgency = getUrgencyInfo(sch, TODAY_STR);
      
      const matchesSearch = 
        sch.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sch.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sch.leadTechnicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sch.marketingName && sch.marketingName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sch.hospitalCity.toLowerCase().includes(searchTerm.toLowerCase());

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
            const totalQty = schedule.targetDevices.reduce((sum, d) => sum + (d.quantity || 1), 0);

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
                        <strong className="text-slate-800 truncate">{schedule.leadTechnicianName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#D8D2CB]/60 text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-[#398AB9]" />
                        Marketing:
                      </span>
                      <span className="font-bold text-[#1C658C]">{schedule.marketingName || 'Shifa Zalza Billa'}</span>
                    </div>

                    {schedule.supportTechnicianNames.length > 0 && (
                      <p className="text-[10px] text-slate-500">
                        Pendamping: {schedule.supportTechnicianNames.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Target Medical Equipment Count & Total Quantity & 7-Digit Label */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">
                        Alkes: <strong className="text-slate-800">{schedule.targetDevices.length} Jenis ({totalQty} Unit)</strong>
                      </span>
                      <span className="font-bold text-[#1C658C]">{schedule.progressPercent}% Selesai</span>
                    </div>
                    <div className="w-full bg-[#EEEEEE] rounded-full h-2 overflow-hidden border border-[#D8D2CB]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          schedule.progressPercent === 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-[#398AB9] to-[#1C658C]'
                        }`}
                        style={{ width: `${schedule.progressPercent}%` }}
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
                      {schedule.assignedCalibratorNames.map((calName, i) => (
                        <span key={i} className="bg-[#EEEEEE] text-[#1C658C] border border-[#D8D2CB] text-[10px] font-medium px-2 py-0.5 rounded-md">
                          {calName}
                        </span>
                      ))}
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
                  const totalQty = sch.targetDevices.reduce((sum, d) => sum + (d.quantity || 1), 0);

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
                        <p className="font-semibold text-slate-800">{sch.leadTechnicianName}</p>
                        <p className="text-[#398AB9] text-[11px]">Marketing: {sch.marketingName || 'Shifa Zalza Billa'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{totalQty} Unit ({sch.targetDevices.length} Jenis)</span>
                          <span className="text-[10px] bg-[#1C658C]/10 text-[#1C658C] px-1.5 py-0.2 rounded font-semibold font-mono border border-[#1C658C]/20">
                            {sch.progressPercent}%
                          </span>
                        </div>
                        <div className="w-24 bg-[#EEEEEE] rounded-full h-1.5 mt-1 overflow-hidden border border-[#D8D2CB]">
                          <div className="bg-[#1C658C] h-full rounded-full" style={{ width: `${sch.progressPercent}%` }} />
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
                            <span>Detail & Hasil</span>
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
    </div>
  );
};
