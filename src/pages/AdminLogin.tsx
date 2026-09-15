import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  AlertCircle, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppConfig } from '../lib/appConfig';

export default function AdminLogin() {
  const { logoUrl } = useAppConfig();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loginWithCredentials } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin_teknik' || user.role === 'admin_keuangan') {
        navigate('/admin/aset', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginWithCredentials(username, password);
      if (result.success) {
        // Redirect based on role
        const targetEmail = username.toLowerCase();
        if (targetEmail.includes('teknik') || targetEmail.includes('keuangan')) {
          navigate('/admin/aset');
        } else {
          navigate('/admin/dashboard');
        }
      } else {
        setError(result.error || 'Username atau password tidak sesuai.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (u: string) => {
    setUsername(u);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900/5 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80"
      >
        {/* Header */}
        <div className="bg-slate-900 px-8 py-7 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="h-12 px-3 bg-white/95 rounded-xl inline-flex items-center justify-center mb-3 border border-slate-700 shadow relative z-10 mx-auto">
            <img src={logoUrl} alt="Logo SMK" className="h-8 max-w-[120px] object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white relative z-10">PT Sarana Multi Kalibrasi</h1>
          <p className="text-amber-400 mt-1 text-xs uppercase tracking-wider font-semibold relative z-10">
            Masuk ke Dasbor Admin
          </p>
        </div>

        {/* Body Form */}
        <div className="p-7">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs flex items-start rounded-r-lg"
            >
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin.utama@smk.co.id"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick account helper pills */}
            <div className="pt-1">
              <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Pilih Akun Cepat:</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('admin.utama@smk.co.id')}
                  className="py-1.5 px-2 text-xs bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-700 text-center transition-colors font-medium cursor-pointer"
                >
                  <span className="font-semibold block truncate">Utama</span>
                  <span className="text-[9px] text-slate-400 block truncate">admin.utama</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('admin.teknik@smk.co.id')}
                  className="py-1.5 px-2 text-xs bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-700 text-center transition-colors font-medium cursor-pointer"
                >
                  <span className="font-semibold block truncate">Teknik</span>
                  <span className="text-[9px] text-slate-400 block truncate">admin.teknik</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('admin.keuangan@smk.co.id')}
                  className="py-1.5 px-2 text-xs bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-700 text-center transition-colors font-medium cursor-pointer"
                >
                  <span className="font-semibold block truncate">Keuangan</span>
                  <span className="text-[9px] text-slate-400 block truncate">admin.keuangan</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? (
                'Memverifikasi...'
              ) : (
                <>
                  <span>Masuk ke Dasbor</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
