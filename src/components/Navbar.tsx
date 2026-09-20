import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Calendar, 
  Wrench, 
  Wallet, 
  FileText,
  Clock,
  Tablet,
  LogOut,
  Award,
  FileCheck,
  Tags,
  RotateCcw,
  CloudUpload,
  CloudDownload
} from 'lucide-react';
import { CalibrationSchedule, CalibratorAsset } from '../types';
import { getUrgencyInfo } from '../utils/helpers';
import { CompanyLogo } from './CompanyLogo';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useAuth } from '../lib/AuthContext';

export type AppTab = 'dashboard' | 'sph' | 'labels' | 'schedules' | 'selia' | 'calibrators' | 'tablets' | 'financial' | 'masters' | 'templates';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  schedules: CalibrationSchedule[];
  calibrators: CalibratorAsset[];
  sphCount?: number;
  borrowedTabletsCount?: number;
  isRealtimeConnected?: boolean;
  onForceSyncAll?: () => void;
  onForcePullAll?: () => void;
  onOpenNewSchedule: () => void;
  onOpenNewSph?: () => void;
  onPurgeAllData?: () => void;
  onResetDefaultData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  schedules,
  calibrators,
  sphCount = 0,
  borrowedTabletsCount = 0,
  isRealtimeConnected = true,
  onForceSyncAll,
  onForcePullAll,
  onOpenNewSchedule,
  onOpenNewSph,
  onPurgeAllData,
  onResetDefaultData
}) => {
  const { user, role, logout } = useAuth();
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Calculate critical alert count
  const criticalRemindersCount = schedules.filter(sch => {
    if (sch.status === 'Selesai Kalibrasi' || sch.status === 'Sertifikat Terbit' || sch.status === 'Dibatalkan') return false;
    const urgency = getUrgencyInfo(sch);
    return urgency.level === 'CRITICAL' || urgency.level === 'OVERDUE' || urgency.level === 'WARNING';
  }).length;

  const expiringCalibratorsCount = calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang').length;
  const completedSchedulesCount = schedules.filter(s => 
    s.status === 'Selesai Kalibrasi' || 
    s.status === 'Sertifikat Terbit' || 
    s.progressPercent === 100 ||
    Boolean(s.completedDate)
  ).length;

  interface TabItem {
    id: AppTab;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badgeVal?: string | number;
    badgeColor?: string;
  }

  const allNavTabs: TabItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Utama',
      sublabel: 'Monitoring & Kalender',
      icon: Activity
    },
    {
      id: 'sph',
      label: 'Penawaran SPH',
      sublabel: 'Katalog 121 Alat & Cetak',
      icon: FileText,
      badgeVal: sphCount > 0 ? sphCount : undefined,
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
    },
    {
      id: 'labels',
      label: 'Label & Cetak Stiker',
      sublabel: 'Generator, A3+ & Supabase',
      icon: Tags
    },
    {
      id: 'schedules',
      label: 'Penjadwalan RS',
      sublabel: 'SPK, BAP, BASTP & Teknisi',
      icon: Calendar,
      badgeVal: schedules.length > 0 ? schedules.length : undefined,
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
    },
    {
      id: 'selia',
      label: 'Selia Dashboard',
      sublabel: 'Proses & Cetak Sertifikat',
      icon: FileCheck,
      badgeVal: completedSchedulesCount > 0 ? `${completedSchedulesCount} Selesai` : undefined,
      badgeColor: 'bg-teal-950 text-teal-300 border-teal-500/40'
    },
    {
      id: 'calibrators',
      label: 'Aset Alat Kalibrator',
      sublabel: 'Standar Uji & Ketertelusuran',
      icon: Wrench,
      badgeVal: expiringCalibratorsCount > 0 ? `${expiringCalibratorsCount} Perlu Uji` : `${calibrators.length} Unit`,
      badgeColor: expiringCalibratorsCount > 0 ? 'bg-amber-950 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      id: 'tablets',
      label: 'Peminjaman Tablet',
      sublabel: '6 Unit Tablet Kalibrasi',
      icon: Tablet,
      badgeVal: borrowedTabletsCount > 0 ? `${borrowedTabletsCount} Dipinjam` : '6 Siap',
      badgeColor: borrowedTabletsCount > 0 ? 'bg-amber-950 text-amber-300 border-amber-500/40' : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
    },
    {
      id: 'financial',
      label: 'Aset Keuangan',
      sublabel: 'Buku Kas & Piutang SPH',
      icon: Wallet
    },
    {
      id: 'masters',
      label: 'Master Data RS & Tim',
      sublabel: 'Tim Teknisi, Marketing & RS',
      icon: Award
    }
  ];

  const allowedTabs: AppTab[] = role === 'admin_keuangan'
    ? ['dashboard', 'sph', 'labels', 'financial', 'masters']
    : role === 'admin_teknik'
    ? ['dashboard', 'labels', 'schedules', 'selia', 'calibrators', 'tablets', 'masters']
    : ['dashboard', 'sph', 'labels', 'schedules', 'selia', 'calibrators', 'tablets', 'financial', 'masters', 'templates'];

  const visibleNavTabs = allNavTabs.filter(tab => allowedTabs.includes(tab.id));

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const navScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeBtn = document.getElementById(`nav-${activeTab}-tab`);
    if (activeBtn && navScrollRef.current) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (navScrollRef.current && e.deltaY !== 0) {
      navScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Real-time clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-[#1C658C] text-white sticky top-0 z-40 border-b border-[#144966] shadow-xl select-none">
      {/* Top Micro Information Bar */}
      <div className="bg-[#144966] px-4 py-1.5 text-xs text-[#D8D2CB] border-b border-[#1C658C]/60">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="inline-flex items-center text-[#EEEEEE] font-medium text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-[#398AB9] animate-pulse mr-1.5 shadow-[0_0_8px_#398AB9]"></span>
              Sistem Aktif & Terhubung Metrologi Medis
            </span>
            <span className={`inline-flex items-center gap-1.5 bg-[#0A2636] px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              isRealtimeConnected ? 'text-emerald-300 border-emerald-500/40 shadow-sm' : 'text-amber-300 border-amber-500/40'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isRealtimeConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
              }`}></span>
              {isRealtimeConnected ? 'Supabase Realtime Terhubung' : 'Menghubungkan Realtime...'}
            </span>
            {onForceSyncAll && (
              <button
                id="btn-sync-laptop-supabase"
                onClick={onForceSyncAll}
                title="Unggah dan samakan seluruh data laptop ini ke Supabase agar langsung muncul di HP/perangkat lain"
                className="inline-flex items-center gap-1.5 bg-[#1C658C]/70 hover:bg-[#398AB9] text-[#EEEEEE] hover:text-white px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-cyan-400/40 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <CloudUpload className="w-3 h-3 text-cyan-300" />
                <span>Kirim Data ke Supabase</span>
              </button>
            )}
            {onForcePullAll && (
              <button
                id="btn-pull-device-supabase"
                onClick={onForcePullAll}
                title="Tarik data terbaru langsung dari Supabase ke HP/perangkat ini"
                className="inline-flex items-center gap-1.5 bg-[#0F364C] hover:bg-[#1C658C] text-cyan-300 hover:text-white px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-cyan-500/40 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <CloudDownload className="w-3 h-3 text-cyan-300" />
                <span>Tarik Data Terbaru (HP)</span>
              </button>
            )}
            <span className="text-[#398AB9]/50 hidden md:inline">|</span>
            <span className="hidden md:inline text-[#D8D2CB] text-[11px]">
              Permenkes No. 54/2015 • Sertifikat Kemenkes No: 26062301565850001
            </span>
          </div>
          
          <div className="flex items-center space-x-3 text-[#EEEEEE]">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#EEEEEE] bg-[#0F364C] px-2.5 py-0.5 rounded-lg border border-[#1C658C] shadow-inner">
              <Clock className="w-3.5 h-3.5 text-[#398AB9]" />
              <span>
                {currentTime.toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
              <span className="text-[#398AB9]/60">|</span>
              <span className="font-bold text-white tracking-widest">
                {currentTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
              <span className="text-[10px] text-[#398AB9] font-semibold">WIB</span>
            </span>
            <span className="bg-[#0F364C] text-[#398AB9] border border-[#398AB9]/40 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase font-mono">
              KAN LK-532-IDN
            </span>
          </div>
        </div>
      </div>

      {/* Main Brand & Quick Action Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between min-h-[4rem] sm:min-h-[4.5rem] py-2 gap-3">
          
          {/* Logo SMK */}
          <div 
            className="flex items-center shrink-0 py-1"
            id="brand-logo-btn"
          >
            <CompanyLogo size="md" showSubtitle={true} variant="dark" allowUpload={true} />
          </div>

          {/* User Profile Badge & Logout Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-[#0F364C] px-3 py-1.5 rounded-xl border border-[#1C658C] shadow-sm text-xs">
                <div className={`w-2 h-2 rounded-full ${role === 'admin_utama' ? 'bg-indigo-400' : role === 'admin_keuangan' ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`}></div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white text-[11px] leading-tight">
                    {user.displayName || (role === 'admin_utama' ? 'Admin Utama' : role === 'admin_keuangan' ? 'Admin Keuangan' : 'Admin Teknik')}
                  </span>
                  <span className="text-[9px] text-[#D8D2CB]/80 font-mono leading-tight">
                    {user.email || (role === 'admin_utama' ? 'adminutama@ptsmk.com' : role === 'admin_keuangan' ? 'adminkeuangan@ptsmk.com' : 'adminteknik@ptsmk.com')}
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => logout()}
              className="px-3 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold hover:scale-[1.02] active:scale-95 border border-rose-500/50"
              title="Keluar dari Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIRECT NAVIGATION BAR: Clean, flat navigation bar for all permitted tabs */}
      {/* ========================================================================= */}
      <div className="bg-[#144966] border-t border-[#1C658C] px-2 sm:px-4 py-1.5 shadow-inner">
        <div className="max-w-7xl mx-auto flex items-center">
          {/* Container Tab dengan Slide Bar & Mouse Wheel Scroll */}
          <div
            ref={navScrollRef}
            onWheel={handleWheelScroll}
            className="w-full flex items-center gap-2 overflow-x-auto nav-scroll-bar pb-2 pt-1 px-1 scroll-smooth"
          >
            {visibleNavTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}-tab`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap border shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1C658C] to-[#398AB9] text-white border-[#398AB9] shadow-md ring-1 ring-[#398AB9]/50 scale-[1.01]'
                      : 'bg-[#0F364C]/90 text-[#D8D2CB] hover:text-white hover:bg-[#1C658C] border-[#1C658C]/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#EEEEEE]' : 'text-[#398AB9]'}`} />
                  <span className="text-[12px] font-bold leading-none">{tab.label}</span>

                  {tab.badgeVal !== undefined && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${tab.badgeColor || 'bg-[#0F364C] text-[#EEEEEE] border-[#1C658C]'}`}>
                      {tab.badgeVal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showPurgeConfirm}
        title="Mulai Semua dari Kosongan?"
        message="Apakah Anda yakin ingin MENGOSONGKAN SELURUH DATA SISTEM sekarang? Seluruh dokumen jadwal, SPH, master alat/teknisi/RS, dan transaksi akan dihapus secara permanen. Data tidak akan pernah kembali lagi dan sistem akan mulai murni dari 0 (kosongan)."
        itemName="Semua Koleksi Database (Jadwal, SPH, Master, Transaksi, Aset)"
        confirmText="Ya, Kosongkan Semua Sekarang"
        cancelText="Batal"
        onConfirm={() => {
          if (onPurgeAllData) {
            onPurgeAllData();
          }
          setShowPurgeConfirm(false);
        }}
        onClose={() => setShowPurgeConfirm(false)}
      />
    </header>
  );
};
