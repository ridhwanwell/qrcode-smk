import React, { useState, useEffect, useMemo } from 'react';
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
  CloudUpload,
  CloudDownload,
  Receipt,
  FileSpreadsheet,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Sun,
  Moon,
  X,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalibrationSchedule, CalibratorAsset } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useAuth } from '../lib/AuthContext';
import { subscribePendingCount } from '../lib/offlineQueue';
import { useTheme } from '../lib/theme';

export type AppTab = 'dashboard' | 'sph' | 'labels' | 'schedules' | 'billing' | 'selia' | 'calibrators' | 'tablets' | 'financial' | 'masters' | 'templates' | 'aspak';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  schedules: CalibrationSchedule[];
  calibrators: CalibratorAsset[];
  sphCount?: number;
  dealSphCount?: number;
  borrowedTabletsCount?: number;
  isRealtimeConnected?: boolean;
  onForceSyncAll?: () => void;
  onForcePullAll?: () => void;
  onOpenNewSchedule: () => void;
  onOpenNewSph?: () => void;
  onPurgeAllData?: () => void;
  onResetDefaultData?: () => void;
}

interface TabItem {
  id: AppTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badgeVal?: string | number;
  badgeTone?: 'info' | 'ok' | 'warn' | 'muted';
}

const NAV_GROUPS: { title: string; ids: AppTab[] }[] = [
  { title: 'Ringkasan', ids: ['dashboard', 'labels', 'selia', 'aspak'] },
  { title: 'Operasional', ids: ['sph', 'schedules', 'billing'] },
  { title: 'Aset & Keuangan', ids: ['calibrators', 'tablets', 'financial'] },
  { title: 'Tim', ids: ['masters'] }
];

const BADGE_TONE: Record<NonNullable<TabItem['badgeTone']>, string> = {
  info: 'bg-sky-100 text-sky-800',
  ok: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  muted: 'bg-slate-100 text-slate-600'
};

const COLLAPSE_KEY = 'smk_sidebar_collapsed';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  schedules,
  calibrators,
  sphCount = 0,
  dealSphCount = 0,
  borrowedTabletsCount = 0,
  isRealtimeConnected = true,
  onForceSyncAll,
  onForcePullAll,
  onPurgeAllData
}) => {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Lebar sidebar dibaca CSS lewat kelas di <html>
  useEffect(() => {
    document.documentElement.classList.toggle('sb-collapsed', collapsed);
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // abaikan
    }
  }, [collapsed]);

  useEffect(() => () => document.documentElement.classList.remove('sb-collapsed'), []);

  // Calculate critical alert count (logika sama seperti sebelumnya)
  const expiringCalibratorsCount = calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang').length;
  const completedSchedulesCount = schedules.filter(s =>
    s.status === 'Selesai Kalibrasi' ||
    s.status === 'Sertifikat Terbit' ||
    s.progressPercent === 100 ||
    Boolean(s.completedDate)
  ).length;

  const allNavTabs: TabItem[] = [
    { id: 'dashboard', label: 'Dashboard Utama', sublabel: 'Monitoring & Kalender', icon: Activity },
    { id: 'labels', label: 'Label & Cetak Stiker', sublabel: 'Generator, A3+ & Supabase', icon: Tags },
    { id: 'sph', label: 'Penawaran SPH', sublabel: 'Katalog 121 Alat & Cetak', icon: FileText,
      badgeVal: sphCount > 0 ? sphCount : undefined, badgeTone: 'info' },
    { id: 'schedules', label: 'Penjadwalan RS', sublabel: 'SPK, BAP, BASTP & Teknisi', icon: Calendar,
      badgeVal: schedules.length > 0 ? schedules.length : undefined, badgeTone: 'ok' },
    { id: 'billing', label: 'Penagihan RS', sublabel: 'Download BO, FP, KWP & Billing', icon: Receipt,
      badgeVal: dealSphCount > 0 ? dealSphCount : undefined, badgeTone: 'info' },
    { id: 'selia', label: 'Selia Dashboard', sublabel: 'Proses & Cetak Sertifikat', icon: FileCheck,
      badgeVal: completedSchedulesCount > 0 ? `${completedSchedulesCount} Selesai` : undefined, badgeTone: 'ok' },
    { id: 'calibrators', label: 'Aset Alat Kalibrator', sublabel: 'Standar Uji & Ketertelusuran', icon: Wrench,
      badgeVal: expiringCalibratorsCount > 0 ? `${expiringCalibratorsCount} Perlu Uji` : `${calibrators.length} Unit`,
      badgeTone: expiringCalibratorsCount > 0 ? 'warn' : 'muted' },
    { id: 'tablets', label: 'Peminjaman Tablet', sublabel: '6 Unit Tablet Kalibrasi', icon: Tablet,
      badgeVal: borrowedTabletsCount > 0 ? `${borrowedTabletsCount} Dipinjam` : '6 Siap',
      badgeTone: borrowedTabletsCount > 0 ? 'warn' : 'ok' },
    { id: 'financial', label: 'Aset Keuangan', sublabel: 'Buku Kas & Piutang SPH', icon: Wallet },
    { id: 'masters', label: 'Master Data RS & Tim', sublabel: 'Tim Teknisi, Marketing & RS', icon: Award },
    { id: 'aspak', label: 'Format ASPAK', sublabel: 'Download Isian Kalibrasi ASPAK', icon: FileSpreadsheet }
  ];

  // Hak akses menu per peran (SAMA seperti sebelumnya — jangan diubah)
  const allowedTabs: AppTab[] = role === 'hanya_sph'
    ? ['sph']
    : role === 'admin_keuangan'
    ? ['dashboard', 'labels', 'sph', 'schedules', 'billing', 'financial', 'masters']
    : role === 'admin_teknik'
    ? ['dashboard', 'labels', 'schedules', 'billing', 'selia', 'calibrators', 'tablets', 'masters', 'aspak']
    : ['dashboard', 'labels', 'sph', 'schedules', 'billing', 'selia', 'calibrators', 'tablets', 'financial', 'masters', 'templates', 'aspak'];

  const visibleNavTabs = allNavTabs.filter(tab => allowedTabs.includes(tab.id));
  const tabById = useMemo(() => {
    const m = new Map<AppTab, TabItem>();
    visibleNavTabs.forEach(t => m.set(t.id, t));
    return m;
  }, [visibleNavTabs]);

  const activeLabel = allNavTabs.find(t => t.id === activeTab)?.label || (activeTab === 'templates' ? 'Template Dokumen' : 'Dashboard');

  // Jam realtime
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  useEffect(() => {
    const unsub = subscribePendingCount(setPendingSyncCount);
    return () => unsub();
  }, []);

  // Tutup laci menu (HP) saat pindah halaman
  const go = (id: AppTab) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  // Kunci scroll halaman saat laci HP terbuka
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const roleLabel = user?.roleLabel || (role === 'admin_utama' ? 'Admin Utama' : role === 'admin_keuangan' ? 'Admin Keuangan' : role === 'admin_teknik' ? 'Admin Teknik' : 'Hanya SPH');
  const displayName = user?.displayName || user?.fullName || user?.username || 'Pengguna';
  const initials = displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const syncState = pendingSyncCount > 0 ? 'pending' : isRealtimeConnected ? 'ok' : 'connecting';

  const sidebar = (isMobile: boolean) => {
    const isCollapsed = collapsed && !isMobile;
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`h-16 flex items-center shrink-0 border-b border-transparent ${isCollapsed ? 'justify-center px-2' : 'px-5 gap-3'}`} style={{ borderColor: 'var(--smk-line)' }}>
          <CompanyLogo size="sm" showSubtitle={false} allowUpload={true} themeAware={true} heightPx={isCollapsed ? 26 : 34} />
          {!isCollapsed && (
            <div className="min-w-0 border-l pl-3" style={{ borderColor: 'var(--smk-line)' }}>
              <p className="text-[13px] font-semibold smk-head leading-tight truncate">Portal Aset</p>
              <p className="text-[10.5px] smk-muted leading-tight truncate">PT. Sarana Multi Kalibrasi</p>
            </div>
          )}
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto w-9 h-9 rounded-lg grid place-items-center smk-icon-btn" title="Tutup menu">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" aria-label="Menu utama">
          {NAV_GROUPS.map(group => {
            const items = group.ids.map(id => tabById.get(id)).filter(Boolean) as TabItem[];
            if (items.length === 0) return null;
            return (
              <div key={group.title}>
                <div className={`smk-group-label text-[10.5px] font-semibold tracking-[.08em] uppercase px-3 pt-4 pb-1.5 whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-3 pt-2 pb-0' : ''}`}>
                  {isCollapsed ? '' : group.title}
                </div>
                {items.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`nav-${tab.id}-tab`}
                      onClick={() => go(tab.id)}
                      title={isCollapsed ? `${tab.label} — ${tab.sublabel}` : tab.sublabel}
                      className={`smk-nav-item relative w-full flex items-center gap-3 rounded-[10px] text-[13.5px] text-left whitespace-nowrap py-2.5 ${isCollapsed ? 'justify-center px-0' : 'px-3'} ${isActive ? 'is-active' : ''}`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={isMobile ? 'smk-nav-pill-m' : 'smk-nav-pill'}
                          className="smk-nav-pill absolute inset-0 rounded-[10px]"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <Icon className="w-[17px] h-[17px] relative z-10 shrink-0" />
                      {!isCollapsed && <span className="relative z-10 truncate">{tab.label}</span>}
                      {!isCollapsed && tab.badgeVal !== undefined && (
                        <span className={`relative z-10 ml-auto text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_TONE[tab.badgeTone || 'muted']}`}>
                          {tab.badgeVal}
                        </span>
                      )}
                      {isCollapsed && tab.badgeVal !== undefined && (
                        <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-amber-400 z-10" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Kaki sidebar: pengguna, akreditasi, keluar */}
        <div className="shrink-0 border-t p-3 space-y-1.5" style={{ borderColor: 'var(--smk-line)' }}>
          {user && (
            <div className={`flex items-center gap-2.5 px-2 py-1.5 ${isCollapsed ? 'justify-center' : ''}`} title={`${displayName} • ${user.email} • ${roleLabel}`}>
              <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-xs font-bold text-white bg-gradient-to-br from-[#398AB9] to-[#1C658C] ring-2 ring-white/10">
                {initials || 'U'}
              </span>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--smk-text)' }}>{displayName}</p>
                  <p className="text-[11px] smk-muted truncate">{roleLabel}</p>
                </div>
              )}
            </div>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 px-2 text-[10.5px] smk-muted" title="Permenkes No. 54/2015 • Sertifikat Kemenkes No: 26062301565850001">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-mono">KAN LK-532-IDN · Permenkes 54/2015</span>
            </div>
          )}
          <button
            onClick={() => logout()}
            className={`smk-nav-item w-full flex items-center gap-3 rounded-[10px] text-[13.5px] py-2.5 smk-nav-danger transition-colors ${isCollapsed ? 'justify-center' : 'px-3'}`}
            title="Keluar dari Portal"
          >
            <LogOut className="w-[17px] h-[17px]" />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="smk-side smk-no-print hidden lg:block fixed inset-y-0 left-0 z-40">
        {sidebar(false)}
      </aside>

      {/* Laci menu HP / tablet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="smk-scrim"
              className="lg:hidden fixed inset-0 z-50 bg-black/40 smk-no-print"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="smk-drawer"
              className="smk-side smk-no-print lg:hidden fixed inset-y-0 left-0 z-50 max-w-[86vw]"
              style={{ background: theme === 'dark' ? 'rgba(18,27,33,.97)' : '#fff' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              {sidebar(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Bar atas */}
      <header className="smk-top smk-no-print app-main sticky top-0 z-30 select-none">
        <div className="h-16 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden w-9 h-9 rounded-lg grid place-items-center smk-icon-btn" title="Buka menu">
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:grid w-9 h-9 rounded-lg place-items-center smk-icon-btn"
            title={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'}
          >
            {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
          </button>

          <div className="flex items-center gap-2 min-w-0 text-sm">
            <span className="hidden md:inline smk-muted font-medium whitespace-nowrap">Portal SMK</span>
            <ChevronRight className="hidden md:block w-4 h-4 smk-muted shrink-0" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activeTab}
                className="font-semibold smk-head truncate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
              >
                {activeLabel}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex-1" />

          {/* Status sinkron */}
          <span
            className="smk-chip inline-flex items-center gap-2 rounded-full px-2.5 sm:px-3 py-1.5 text-[12px] font-medium whitespace-nowrap"
            title={syncState === 'pending' ? `${pendingSyncCount} perubahan menunggu sinkron` : syncState === 'ok' ? 'Supabase Realtime terhubung' : 'Menghubungkan realtime...'}
          >
            <span className={`smk-live-dot ${syncState === 'ok' ? '' : 'is-off'}`} />
            <span className="hidden sm:inline">
              {syncState === 'pending' ? `${pendingSyncCount} menunggu sinkron` : syncState === 'ok' ? 'Tersinkron' : 'Menghubungkan…'}
            </span>
            {syncState === 'pending' && <span className="sm:hidden font-bold">{pendingSyncCount}</span>}
          </span>

          {/* Tombol sinkron manual: cadangan, hanya untuk Admin Utama (sinkron sudah otomatis) */}
          {onForceSyncAll && role === 'admin_utama' && (
            <button
              id="btn-sync-laptop-supabase"
              onClick={onForceSyncAll}
              title="Unggah dan samakan seluruh data laptop ini ke Supabase agar langsung muncul di HP/perangkat lain"
              className="h-9 px-2.5 rounded-lg inline-flex items-center gap-1.5 smk-icon-btn text-[12.5px] font-medium"
            >
              <CloudUpload className="w-[18px] h-[18px]" />
              <span className="hidden xl:inline">Kirim Data</span>
            </button>
          )}
          {onForcePullAll && role === 'admin_utama' && (
            <button
              id="btn-pull-device-supabase"
              onClick={onForcePullAll}
              title="Tarik data terbaru langsung dari Supabase ke HP/perangkat ini"
              className="h-9 px-2.5 rounded-lg inline-flex items-center gap-1.5 smk-icon-btn text-[12.5px] font-medium"
            >
              <CloudDownload className="w-[18px] h-[18px]" />
              <span className="hidden xl:inline">Tarik Data</span>
            </button>
          )}

          <span className="hidden md:inline-flex items-center gap-1.5 text-[12px] smk-muted font-mono px-2 whitespace-nowrap" title="Waktu Indonesia Barat">
            <Clock className="w-3.5 h-3.5" />
            {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
            <span className="font-semibold" style={{ color: 'var(--smk-text)' }}>
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            WIB
          </span>

          <button
            onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
            className="w-9 h-9 rounded-lg grid place-items-center smk-icon-btn"
            title={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema Hitam Kaca'}
          >
            <motion.span key={theme} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="grid place-items-center">
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </motion.span>
          </button>
        </div>
      </header>

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
    </>
  );
};
