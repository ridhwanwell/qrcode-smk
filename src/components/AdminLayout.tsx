import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutDashboard, Tags, FilePlus2, LogOut, Verified } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 shrink-0 border-r border-slate-800">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <Verified className="w-8 h-8 text-amber-500 mr-3" />
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none mb-1">SMK Kalibrasi</h1>
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
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 hidden md:flex shadow-sm z-0">
          <h2 className="text-xl font-bold text-slate-800">PT Sarana Multi Kalibrasi</h2>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-600">A</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
