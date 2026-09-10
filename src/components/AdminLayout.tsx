import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutDashboard, Tags, FilePlus2, LogOut, Verified, UserCheck, Image as ImageIcon, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import LogoManagerModal from './LogoManagerModal';
import { useAppConfig } from '../lib/appConfig';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { logoUrl } = useAppConfig();
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 shrink-0 border-r border-slate-800">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <Verified className="w-8 h-8 text-amber-500 mr-3 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none mb-1 truncate">SMK Kalibrasi</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => cn(
              "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-amber-500/10 text-amber-400" 
                : "hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <LayoutDashboard className={cn("w-5 h-5 mr-3 transition-colors", "group-hover:text-amber-400")} />
            Dashboard
          </NavLink>
          <NavLink
            to="/admin/labels"
            className={({ isActive }) => cn(
              "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-amber-500/10 text-amber-400" 
                : "hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <Tags className={cn("w-5 h-5 mr-3 transition-colors", "group-hover:text-amber-400")} />
            Daftar Label
          </NavLink>
          <NavLink
            to="/admin/generate"
            className={({ isActive }) => cn(
              "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-amber-500/10 text-amber-400" 
                : "hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <FilePlus2 className={cn("w-5 h-5 mr-3 transition-colors", "group-hover:text-amber-400")} />
            Buat Label Baru
          </NavLink>
          <NavLink
            to="/admin/templates"
            className={({ isActive }) => cn(
              "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-amber-500/10 text-amber-400" 
                : "hover:bg-slate-800 hover:text-slate-100"
            )}
          >
            <Verified className={cn("w-5 h-5 mr-3 transition-colors", "group-hover:text-amber-400")} />
            Desain Template
          </NavLink>

          <button
            onClick={() => setIsLogoModalOpen(true)}
            className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-amber-400/90 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all duration-200 mt-4 cursor-pointer"
          >
            <ImageIcon className="w-5 h-5 mr-3 text-amber-400 shrink-0" />
            <span>Pengaturan Logo Website</span>
          </button>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center px-2 py-1.5 bg-slate-800/60 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs mr-2.5 shrink-0">
              {user?.avatarLetter || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.displayName || user?.username || 'Admin'}</p>
              <p className="text-[10px] text-amber-400 font-medium truncate">@{user?.username || 'admin'}</p>
            </div>
          </div>

          <button 
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 hidden md:flex shadow-sm z-0">
          <div className="flex items-center gap-3">
            <div className="h-10 px-2.5 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700 shadow-sm">
              <img src={logoUrl} alt="Logo SMK" className="h-7 max-w-[100px] object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">PT Sarana Multi Kalibrasi</h2>
              <p className="text-xs text-slate-500">Sistem Verifikasi Sertifikat & Label Kalibrasi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLogoModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              <ImageIcon className="w-4 h-4 text-amber-600" />
              <span>Ganti Logo Website</span>
            </button>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{user?.displayName || 'Administrator'}</p>
              <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                {user?.role || 'Admin Aktif'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-700 text-sm">
              {user?.avatarLetter || 'A'}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <LogoManagerModal 
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
      />
    </div>
  );
}

