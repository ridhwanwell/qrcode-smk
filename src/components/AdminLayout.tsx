import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/theme';
import { LayoutDashboard, Tags, FilePlus2, LogOut, Verified, Image as ImageIcon, Layers, Menu, X, Sun, Moon, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import LogoManagerModal from './LogoManagerModal';
import { useAppConfig } from '../lib/appConfig';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/labels', label: 'Daftar Label', icon: Tags },
  { to: '/admin/generate', label: 'Buat Label Baru', icon: FilePlus2 },
  { to: '/admin/templates', label: 'Desain Template', icon: Verified }
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { logoUrl } = useAppConfig();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Portal Manajemen Aset punya tampilan (sidebar) sendiri → tampil layar penuh
  if (location.pathname.startsWith('/admin/aset')) {
    return <Outlet />;
  }

  const current = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Admin';

  const navLinks = (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <p className="smk-group-label text-[10.5px] font-semibold tracking-[.08em] uppercase px-3 pb-1.5">Label & Sertifikat</p>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => cn('smk-nav-item relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px]', isActive && 'is-active')}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span layoutId="smk-admin-pill" className="smk-nav-pill absolute inset-0 rounded-[10px]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <Icon className="w-[17px] h-[17px] relative z-10" />
              <span className="relative z-10">{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--smk-line)' }}>
        <NavLink
          to="/admin/aset"
          onClick={() => setMobileOpen(false)}
          className="smk-nav-item relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold"
          style={{ color: 'var(--smk-head)' }}
        >
          <Layers className="w-[17px] h-[17px]" />
          <span>Manajemen Aset PT SMK</span>
        </NavLink>
      </div>
    </nav>
  );

  const sideContent = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-3 px-5 border-b shrink-0" style={{ borderColor: 'var(--smk-line)' }}>
        <div className="h-10 px-2 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <img src={logoUrl} alt="Logo SMK" className="h-7 max-w-[85px] object-contain" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold smk-head leading-none mb-1 truncate">PT SMK</h1>
          <p className="text-[10px] uppercase tracking-wider smk-muted font-semibold">Admin Panel</p>
        </div>
      </div>
      {navLinks}
      <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--smk-line)' }}>
        <button
          onClick={() => setIsLogoModalOpen(true)}
          className="smk-nav-item w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer hover:-translate-y-0.5"
          style={{ borderColor: 'var(--smk-line)' }}
        >
          <span className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Pengaturan Logo</span>
          </span>
          <span className="text-[10px] font-mono opacity-70">Ubah</span>
        </button>

        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-xs text-white bg-gradient-to-br from-[#398AB9] to-[#1C658C] shrink-0">
            {user?.avatarLetter || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--smk-text)' }}>{user?.displayName || user?.username || 'Admin'}</p>
            <p className="text-[11px] smk-muted truncate">@{user?.username || 'admin'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="smk-nav-item smk-nav-danger flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-surface font-sans">
      <div className="smk-aurora" aria-hidden="true"><i /><i /><i /></div>

      {/* Sidebar desktop */}
      <aside className="smk-side smk-no-print hidden lg:block fixed inset-y-0 left-0 z-40">{sideContent}</aside>

      {/* Laci HP */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="scrim" className="lg:hidden fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              key="drawer"
              className="smk-side lg:hidden fixed inset-y-0 left-0 z-50 max-w-[86vw]"
              style={{ background: theme === 'dark' ? 'rgba(18,27,33,.97)' : '#fff' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-3.5 right-3 w-9 h-9 rounded-lg grid place-items-center smk-icon-btn z-10" title="Tutup menu">
                <X className="w-4 h-4" />
              </button>
              {sideContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Konten */}
      <div className="app-main min-h-screen flex flex-col">
        <header className="smk-top smk-no-print sticky top-0 z-30 h-16 flex items-center gap-2 px-3 sm:px-6 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden w-9 h-9 rounded-lg grid place-items-center smk-icon-btn" title="Buka menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="hidden sm:inline smk-muted font-medium whitespace-nowrap">Sistem Verifikasi Sertifikat & Label</span>
            <ChevronRight className="hidden sm:block w-4 h-4 smk-muted" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={current} className="font-semibold smk-head truncate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
                {current}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-3 mr-1">
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: 'var(--smk-text)' }}>{user?.displayName || 'Administrator'}</p>
              <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                {user?.role || 'Admin Aktif'}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
            className="w-9 h-9 rounded-lg grid place-items-center smk-icon-btn"
            title={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema Hitam Kaca'}
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
        </header>
        <motion.div
          key={location.pathname}
          className="flex-1 p-3 md:p-5 lg:p-6 page-stagger"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Outlet />
        </motion.div>
      </div>

      <LogoManagerModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
      />
    </div>
  );
}
