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
      if (user.role === 'admin_teknik' || user.role === 'admin_keuangan' || user.role === 'hanya_sph') {
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
        if (targetEmail.includes('teknik') || targetEmail.includes('keuangan') || targetEmail.includes('sph') || targetEmail.includes('nissa') || targetEmail.includes('erwin') || targetEmail.includes('sulis')) {
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

  const quickAccounts = [
    { label: 'Utama', user: 'admin.utama@smk.co.id', hint: 'admin.utama' },
    { label: 'Teknik', user: 'admin.teknik@smk.co.id', hint: 'admin.teknik' },
    { label: 'Keuangan', user: 'admin.keuangan@smk.co.id', hint: 'admin.keuangan' }
  ];
  const fieldWrap = 'group flex items-center gap-2.5 rounded-xl border px-3.5 transition-all focus-within:ring-4 focus-within:ring-[#398AB9]/20 focus-within:border-[#398AB9]';
  const fieldStyle = { borderColor: 'var(--smk-line)', background: 'var(--smk-surface-2)' } as React.CSSProperties;
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.2 + i * 0.07, ease: [0.2, 0.8, 0.2, 1] as const }
  });

  return (
    <div className="app-surface min-h-screen flex items-center justify-center p-4 font-sans overflow-hidden">
      <div className="smk-aurora light-visible" aria-hidden="true"><i /><i /><i /></div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.9, 0.25, 1.15] }}
        className="relative z-[1] w-full max-w-md glass rounded-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.2, 0.9, 0.25, 1.2] }}
            className="h-14 px-4 bg-white rounded-2xl inline-flex items-center justify-center mb-4 shadow-md mx-auto"
          >
            <img src={logoUrl} alt="Logo SMK" className="h-9 max-w-[130px] object-contain" />
          </motion.div>
          <motion.h1 {...rise(0)} className="text-xl font-extrabold tracking-tight smk-head">PT Sarana Multi Kalibrasi</motion.h1>
          <motion.p {...rise(1)} className="mt-1 text-xs uppercase tracking-[.14em] font-semibold text-[#398AB9]">
            Masuk ke Dasbor Admin
          </motion.p>
        </div>

        {/* Body Form */}
        <div className="px-7 pb-8 pt-2">
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
            <motion.div {...rise(2)}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--smk-text)' }}>
                Email / Username
              </label>
              <div className={fieldWrap} style={fieldStyle}>
                <User className="w-4 h-4 smk-muted group-focus-within:text-[#398AB9] transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin.utama@smk.co.id"
                  className="flex-1 min-w-0 py-2.5 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--smk-text)' }}
                />
              </div>
            </motion.div>

            <motion.div {...rise(3)}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--smk-text)' }}>
                Password
              </label>
              <div className={fieldWrap} style={fieldStyle}>
                <Lock className="w-4 h-4 smk-muted group-focus-within:text-[#398AB9] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="flex-1 min-w-0 py-2.5 bg-transparent outline-none text-sm font-mono"
                  style={{ color: 'var(--smk-text)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 smk-muted hover:opacity-80 transition-opacity"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            {/* Quick account helper pills */}
            <motion.div {...rise(4)} className="pt-1">
              <p className="text-[11px] smk-muted mb-1.5 font-medium">Pilih Akun Cepat:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {quickAccounts.map(acc => (
                  <button
                    key={acc.user}
                    type="button"
                    onClick={() => handleQuickSelect(acc.user)}
                    className={`py-1.5 px-2 text-xs border rounded-lg text-center transition-all font-medium cursor-pointer hover:-translate-y-0.5 ${
                      username === acc.user ? 'border-[#398AB9] ring-2 ring-[#398AB9]/20' : ''
                    }`}
                    style={{ borderColor: username === acc.user ? undefined : 'var(--smk-line)', background: 'var(--smk-surface-2)', color: 'var(--smk-text)' }}
                  >
                    <span className="font-semibold block truncate">{acc.label}</span>
                    <span className="text-[9px] smk-muted block truncate">{acc.hint}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div {...rise(5)}>
              <button
                type="submit"
                disabled={loading}
                className="smk-btn-primary w-full mt-2 flex items-center justify-center py-3 px-4 font-bold rounded-xl cursor-pointer text-sm"
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
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
