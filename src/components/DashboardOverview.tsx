import React from 'react';
import { 
  DollarSign, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Send, 
  ArrowUpRight, 
  UserCheck, 
  Building2, 
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Tablet
} from 'lucide-react';
import { 
  CalibrationSchedule, 
  CalibratorAsset, 
  FinancialAsset, 
  FinancialTransaction, 
  Technician,
  TabletDevice,
  TabletLoan
} from '../types';
import { 
  formatRupiah, 
  formatIndonesianDate, 
  getUrgencyInfo,
  generateWhatsAppMessage
} from '../utils/helpers';

interface DashboardOverviewProps {
  schedules: CalibrationSchedule[];
  calibrators: CalibratorAsset[];
  financialAssets: FinancialAsset[];
  transactions: FinancialTransaction[];
  technicians: Technician[];
  tablets?: TabletDevice[];
  tabletLoans?: TabletLoan[];
  onSelectSchedule: (schedule: CalibrationSchedule) => void;
  onNavigateToTab: (tab: 'dashboard' | 'sph' | 'schedules' | 'reminders' | 'calibrators' | 'tablets' | 'financial' | 'masters') => void;
  onOpenNewSchedule: () => void;
  onSendAutomatedReminder: (schedule: CalibrationSchedule) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  schedules,
  calibrators,
  financialAssets,
  transactions,
  technicians,
  tablets = [],
  tabletLoans = [],
  onSelectSchedule,
  onNavigateToTab,
  onOpenNewSchedule,
  onSendAutomatedReminder
}) => {
  // Aggregate Tablets
  const availableTabletsCount = tablets.filter(t => t.isAvailable).length;
  const borrowedTabletsCount = tablets.filter(t => !t.isAvailable).length;

  // Aggregate Financial Assets
  const totalFinancialValue = financialAssets.reduce((acc, curr) => acc + curr.amount, 0);
  const liquidCash = financialAssets
    .filter(f => f.category === 'Kas & Rekening Operasional')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const receivables = financialAssets
    .filter(f => f.category === 'Piutang Kontrak RS')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const calibratorAssetsValue = calibrators.reduce((acc, curr) => acc + curr.currentValue, 0);

  // Schedules Breakdown
  const activeSchedules = schedules.filter(s => s.status !== 'Selesai Kalibrasi' && s.status !== 'Sertifikat Terbit' && s.status !== 'Dibatalkan');
  const completedSchedules = schedules.filter(s => s.status === 'Selesai Kalibrasi' || s.status === 'Sertifikat Terbit');
  
  // Urgent items
  const urgentSchedules = activeSchedules.filter(s => {
    const u = getUrgencyInfo(s);
    return u.level === 'CRITICAL' || u.level === 'OVERDUE' || u.level === 'WARNING';
  });

  // Calibrator readiness
  const readyCalibrators = calibrators.filter(c => c.condition === 'Sangat Baik' || c.condition === 'Siap Pakai');
  const expiringCalibrators = calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang');

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Live Status Header - Flux Style */}
      <div className="bg-gradient-to-r from-[#1C658C] via-[#144966] to-[#0F364C] rounded-2xl p-6 text-white shadow-xl border border-[#144966] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#398AB9]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#398AB9]/25 text-[#EEEEEE] text-xs px-3 py-0.5 rounded-full font-bold border border-[#398AB9]/40 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-[#398AB9]" />
                PT. SARANA MULTI KALIBRASI
              </span>
              <span className="text-xs text-[#D8D2CB]">
                Update Realtime {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sistem Aset & Penjadwalan Kalibrasi RS
            </h1>
            <p className="text-[#D8D2CB] text-xs sm:text-sm mt-1 max-w-2xl">
              Pusat kendali terpadu PT. Sarana Multi Kalibrasi untuk monitoring aset finansial, alat metrologi kalibrator medis, dan penugasan teknisi kalibrasi rumah sakit berstandar ISO/IEC 17025.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigateToTab('reminders')}
              className="bg-[#0F364C] hover:bg-[#144966] text-[#EEEEEE] border border-[#398AB9]/40 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
              id="dash-btn-reminders"
            >
              <Zap className="w-4 h-4 text-[#398AB9]" />
              <span>Pengingat Otomatis</span>
              {urgentSchedules.length > 0 && (
                <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.2 rounded-full animate-bounce">
                  {urgentSchedules.length}
                </span>
              )}
            </button>

            <button
              onClick={onOpenNewSchedule}
              className="bg-[#398AB9] hover:bg-[#2b769f] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#1C658C]/30 border border-[#398AB9]/60 transition-all active:scale-95"
              id="dash-btn-new-schedule"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>+ Buat Jadwal Kalibrasi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 4 KPI Metric Cards - Flux Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Aset Keuangan */}
        <div 
          onClick={() => onNavigateToTab('financial')}
          className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm hover:shadow-md hover:border-[#398AB9] transition-all cursor-pointer group"
          id="kpi-financial-card"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#1C658C]/10 text-[#1C658C] flex items-center justify-center border border-[#1C658C]/20 group-hover:scale-105 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-[#1C658C] bg-[#1C658C]/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-[#1C658C]/20">
              <TrendingUp className="w-3 h-3" />
              Likuid & Sehat
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Total Nilai Aset Keuangan</p>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1C658C] tracking-tight mt-0.5">
              {formatRupiah(totalFinancialValue)}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-[#D8D2CB]/60 flex items-center justify-between text-xs text-slate-500">
            <span>Kas: <strong className="text-slate-800">{formatRupiah(liquidCash)}</strong></span>
            <span>Piutang: <strong className="text-amber-700">{formatRupiah(receivables)}</strong></span>
          </div>
        </div>

        {/* KPI 2: Aset Alat Kalibrator */}
        <div 
          onClick={() => onNavigateToTab('calibrators')}
          className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm hover:shadow-md hover:border-[#398AB9] transition-all cursor-pointer group"
          id="kpi-calibrators-card"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#398AB9]/10 text-[#398AB9] flex items-center justify-center border border-[#398AB9]/20 group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-[#1C658C] bg-[#398AB9]/15 px-2 py-0.5 rounded-full border border-[#398AB9]/30">
              {readyCalibrators.length} Siap Pakai
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Inventaris Alat Kalibrator</p>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1C658C] tracking-tight mt-0.5">
              {calibrators.length} Unit Master
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-[#D8D2CB]/60 flex items-center justify-between text-xs text-slate-500">
            <span>Nilai Alat: <strong className="text-slate-800">{formatRupiah(calibratorAssetsValue)}</strong></span>
            {expiringCalibrators.length > 0 ? (
              <span className="text-amber-600 font-semibold">{expiringCalibrators.length} butuh re-kalibrasi</span>
            ) : (
              <span className="text-emerald-600 font-semibold">Semua valid KAN</span>
            )}
          </div>
        </div>

        {/* KPI 3: Jadwal Kalibrasi RS */}
        <div 
          onClick={() => onNavigateToTab('schedules')}
          className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm hover:shadow-md hover:border-[#398AB9] transition-all cursor-pointer group"
          id="kpi-schedules-card"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#1C658C]/10 text-[#1C658C] flex items-center justify-center border border-[#1C658C]/20 group-hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-[#1C658C] bg-[#1C658C]/10 px-2 py-0.5 rounded-full border border-[#1C658C]/20">
              {activeSchedules.length} Aktif
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Jadwal Kalibrasi RS</p>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1C658C] tracking-tight mt-0.5">
              {schedules.length} Work Orders
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-[#D8D2CB]/60 flex items-center justify-between text-xs text-slate-500">
            <span>Selesai/Sertifikat: <strong className="text-emerald-700">{completedSchedules.length}</strong></span>
            <span>Berjalan: <strong className="text-[#398AB9]">{activeSchedules.length}</strong></span>
          </div>
        </div>

        {/* KPI 4: Peminjaman Tablet Kalibrasi */}
        <div 
          onClick={() => onNavigateToTab('tablets')}
          className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm hover:shadow-md hover:border-[#398AB9] transition-all cursor-pointer group"
          id="kpi-tablets-card"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#398AB9]/10 text-[#398AB9] flex items-center justify-center border border-[#398AB9]/20 group-hover:scale-105 transition-transform">
              <Tablet className="w-6 h-6" />
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              borrowedTabletsCount > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {borrowedTabletsCount > 0 ? `${borrowedTabletsCount} Dipinjam` : 'Semua Siap'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Peminjaman Tablet</p>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1C658C] tracking-tight mt-0.5">
              6 Unit Tablet
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-[#D8D2CB]/60 flex items-center justify-between text-xs text-slate-500">
            <span>Tersedia: <strong className="text-emerald-700">{availableTabletsCount} Unit</strong></span>
            <span className="text-[#398AB9] font-semibold group-hover:underline">Form Pinjam →</span>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Active Calibration Schedule & Financial Cashflow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Active Calibration Schedules Matrix */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#D8D2CB]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1C658C]/10 text-[#1C658C] flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1C658C]">
                  Jadwal Kalibrasi Rumah Sakit Terbaru
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar rumah sakit, teknisi penanggung jawab, & status tenggat kalibrasi
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('schedules')}
              className="text-xs font-semibold text-[#1C658C] hover:text-[#398AB9] flex items-center gap-1 hover:underline"
            >
              <span>Lihat Semua ({schedules.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#D8D2CB]/50 mt-2">
            {schedules.slice(0, 5).map((schedule) => {
              const urgency = getUrgencyInfo(schedule);
              return (
                <div
                  key={schedule.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#EEEEEE]/60 rounded-xl px-2.5 transition-colors cursor-pointer"
                  onClick={() => onSelectSchedule(schedule)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${urgency.dotClass}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 hover:text-[#1C658C]">
                          {schedule.hospitalName}
                        </h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${urgency.badgeClass}`}>
                          {urgency.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-mono text-[#1C658C] bg-[#EEEEEE] px-1.5 py-0.2 rounded text-[11px] border border-[#D8D2CB]">
                          {schedule.workOrderNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-[#398AB9]" />
                          Teknisi: <strong className="text-slate-700">{schedule.leadTechnicianName}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatIndonesianDate(schedule.scheduledDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#1C658C]">
                        {formatRupiah(schedule.contractValue || 0)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {schedule.targetDevices?.length || 0} Unit Alkes ({schedule.progressPercent || 0}% Selesai)
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSchedule(schedule);
                      }}
                      className="bg-[#EEEEEE] hover:bg-[#398AB9]/15 hover:text-[#1C658C] text-slate-700 p-2 rounded-lg text-xs font-semibold transition-colors border border-[#D8D2CB]"
                      title="Lihat Detail & Checklist"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Calibrator Fleet & Technician Workload */}
        <div className="space-y-6">
          {/* Calibrator Fleet Status */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8D2CB]/60">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#398AB9]" />
                <h3 className="font-bold text-sm text-[#1C658C]">
                  Status Alat Kalibrator Master
                </h3>
              </div>
              <button
                onClick={() => onNavigateToTab('calibrators')}
                className="text-[11px] font-semibold text-[#1C658C] hover:text-[#398AB9] hover:underline"
              >
                Inventaris →
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {calibrators.slice(0, 4).map((cal) => (
                <div key={cal.id} className="p-2.5 rounded-xl border border-[#D8D2CB]/70 hover:border-[#398AB9] bg-[#EEEEEE]/40 flex items-center justify-between gap-2 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#1C658C] bg-[#1C658C]/10 px-1.5 py-0.2 rounded border border-[#1C658C]/20">
                        {cal.code}
                      </span>
                      <h5 className="font-semibold text-xs text-slate-900 truncate">
                        {cal.name}
                      </h5>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      Pegang: {cal.currentHolderTechnician || 'Di Lab Master'}
                    </p>
                  </div>

                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    cal.condition === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800' :
                    cal.condition === 'Siap Pakai' ? 'bg-[#398AB9]/20 text-[#1C658C]' :
                    'bg-amber-100 text-amber-800 font-semibold'
                  }`}>
                    {cal.condition}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Master Elektromedis / Technicians Quick Status */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8D2CB]/60">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#1C658C]" />
                <h3 className="font-bold text-sm text-[#1C658C]">
                  Tim Teknisi Elektromedis
                </h3>
              </div>
              <button
                onClick={() => onNavigateToTab('masters')}
                className="text-[11px] font-semibold text-[#1C658C] hover:text-[#398AB9] hover:underline"
              >
                Kelola Tim →
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {technicians.map((tech) => (
                <div key={tech.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#EEEEEE]/60 text-xs transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full text-white font-bold flex items-center justify-center text-[10px] ${tech.avatarColor}`}>
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{tech.name}</p>
                      <p className="text-[10px] text-slate-500">{tech.specialization}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    tech.status === 'Tersedia' ? 'bg-emerald-100 text-emerald-800' :
                    tech.status === 'Sedang Bertugas' ? 'bg-[#398AB9]/20 text-[#1C658C]' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {tech.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Quick Breakdown Journal */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D8D2CB]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1C658C]/10 text-[#1C658C] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1C658C]">
                Arus Kas & Transaksi Keuangan Terakhir
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan pendapatan jasa kalibrasi RS, biaya operasional teknisi, dan pemeliharaan alat
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('financial')}
            className="text-xs font-semibold text-[#1C658C] hover:text-[#398AB9] flex items-center gap-1 hover:underline"
          >
            <span>Buka Laporan Keuangan Lengkap</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
          <div className="bg-[#EEEEEE]/50 p-4 rounded-xl border border-[#D8D2CB]">
            <p className="text-xs text-slate-500">Kas & Rekening Operasional</p>
            <p className="text-lg font-bold text-[#1C658C] mt-0.5">{formatRupiah(liquidCash)}</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Siap digunakan untuk operasional</span>
          </div>

          <div className="bg-[#EEEEEE]/50 p-4 rounded-xl border border-[#D8D2CB]">
            <p className="text-xs text-slate-500">Piutang Kontrak Kalibrasi RS</p>
            <p className="text-lg font-bold text-amber-700 mt-0.5">{formatRupiah(receivables)}</p>
            <span className="text-[11px] text-slate-500 mt-1 inline-block">Menunggu termin pencairan RS rekanan</span>
          </div>

          <div className="bg-[#EEEEEE]/50 p-4 rounded-xl border border-[#D8D2CB]">
            <p className="text-xs text-slate-500">Total Nilai Investasi Kalibrator</p>
            <p className="text-lg font-bold text-[#398AB9] mt-0.5">{formatRupiah(calibratorAssetsValue)}</p>
            <span className="text-[11px] text-slate-500 mt-1 inline-block">Nilai buku 6 unit alat metrologi</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#D8D2CB]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#EEEEEE] text-[#1C658C] border-b border-[#D8D2CB]">
                <th className="py-2.5 px-3 font-bold">Tanggal</th>
                <th className="py-2.5 px-3 font-bold">Tipe Transaksi</th>
                <th className="py-2.5 px-3 font-bold">Kategori / Keterangan</th>
                <th className="py-2.5 px-3 font-bold">Terkait RS / WO</th>
                <th className="py-2.5 px-3 font-bold text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D2CB]/50">
              {transactions.slice(0, 4).map((trx) => (
                <tr key={trx.id} className="hover:bg-[#EEEEEE]/40 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatIndonesianDate(trx.date)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded font-medium text-[10px] ${
                      (trx.type || '').startsWith('Pemasukan') 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {trx.type || 'Transaksi'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-800">{trx.category || '-'}</p>
                    <p className="text-slate-500 text-[11px]">{trx.description || ''}</p>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {trx.relatedHospitalName || trx.relatedWorkOrder || '-'}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                    (trx.type || '').startsWith('Pemasukan') ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {(trx.type || '').startsWith('Pemasukan') ? '+' : '-'} {formatRupiah(trx.amount || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
