import React, { useState } from 'react';
import { useAuth, UserRole } from '../lib/AuthContext';
import { CompanyLogo } from '../components/CompanyLogo';
import { 
  LogIn, 
  KeyRound, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Wrench, 
  Wallet, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loading, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin_utama');

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    if (role === 'admin_utama') {
      setUsername('admin.utama@smk.co.id');
    } else if (role === 'admin_teknik') {
      setUsername('admin.teknik@smk.co.id');
    } else {
      setUsername('admin.keuangan@smk.co.id');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Harap masukkan username/email dan password.');
      return;
    }
    await login(username, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 flex flex-col justify-center items-center p-4 selection:bg-[#1C658C] selection:text-white">
      {/* Background subtle decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-7 sm:p-8 flex flex-col items-center backdrop-blur-sm">
        {/* Company Logo Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <CompanyLogo size="lg" className="mb-2 justify-center" variant="light" showSubtitle={false} />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            PT. SARANA MULTI KALIBRASI
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-[#1C658C] text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Laboratorium Kalibrasi Alat Kesehatan • LK-532-IDN</span>
          </div>
        </div>

        {/* Role Preset Switcher */}
        <div className="w-full mb-6">
          <p className="text-xs font-semibold text-slate-500 mb-2 text-center uppercase tracking-wider">
            Pilih Peran Masuk:
          </p>
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleSelectRole('admin_utama')}
              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                selectedRole === 'admin_utama'
                  ? 'bg-[#1C658C] text-white shadow-md shadow-[#1C658C]/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Utama</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole('admin_teknik')}
              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                selectedRole === 'admin_teknik'
                  ? 'bg-[#1C658C] text-white shadow-md shadow-[#1C658C]/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Admin Teknik</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole('admin_keuangan')}
              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                selectedRole === 'admin_keuangan'
                  ? 'bg-[#1C658C] text-white shadow-md shadow-[#1C658C]/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Admin Keuangan</span>
            </button>
          </div>

          {/* Scope details for chosen role */}
          <div className="mt-2.5 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-xl text-left">
            <p className="text-[10px] font-bold text-[#1C658C] uppercase tracking-wide">
              {selectedRole === 'admin_utama' && 'Hak Akses: Seluruh Modul & Konfigurasi (Super Admin)'}
              {selectedRole === 'admin_teknik' && 'Hak Akses: Dashboard, Label Stiker, Penjadwalan RS, Selia, Aset Kalibrator, Tablet, Master Data'}
              {selectedRole === 'admin_keuangan' && 'Hak Akses: Dashboard, Penawaran SPH, Label Stiker, Penjadwalan RS, Aset Keuangan, Master Data'}
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="w-full mb-5 p-3.5 bg-rose-50 text-rose-800 text-xs font-medium rounded-2xl border border-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
              Email / Username
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="admin.utama@smk.co.id"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 text-sm font-medium text-slate-900 bg-white transition-all outline-none"
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password akun Supabase"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 text-sm font-medium text-slate-900 bg-white transition-all outline-none font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#1C658C] hover:bg-[#144b68] active:scale-[0.99] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#1C658C]/25 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Info Box */}
        <div className="mt-6 flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-left w-full">
          <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Autentikasi Aman:</span> Login terhubung langsung dengan sistem Supabase Auth & Row Level Security (RLS).
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <p className="text-xs text-slate-400 mt-6 text-center">
        © 2026 PT. Sarana Multi Kalibrasi • Sistem Manajemen Kalibrasi Terintegrasi
      </p>
    </div>
  );
};
