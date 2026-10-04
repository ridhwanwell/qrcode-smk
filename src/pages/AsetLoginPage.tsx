import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/theme';
import {
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Lock,
  Sun,
  Moon
} from 'lucide-react';

const ease = [0.2, 0.8, 0.2, 1] as const;
const item = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay: 0.25 + i * 0.07, ease }
});

export const LoginPage: React.FC = () => {
  const { login, loading, error, setError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Harap masukkan username/email dan password.');
      setShakeKey(k => k + 1);
      return;
    }
    await login(username, password);
  };

  const inputWrap =
    'group flex items-center gap-2.5 rounded-xl border px-3.5 transition-all focus-within:ring-4 focus-within:ring-[#398AB9]/20 focus-within:border-[#398AB9]';

  return (
    <div className="app-surface min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden selection:bg-[#1C658C] selection:text-white">
      <div className="smk-aurora light-visible" aria-hidden="true"><i /><i /><i /></div>

      <button
        type="button"
        onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-xl grid place-items-center glass smk-icon-btn"
        title={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema Hitam Kaca'}
      >
        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>

      <motion.div
        key={shakeKey}
        initial={shakeKey === 0 ? { opacity: 0, y: 30, scale: 0.94 } : { x: 0 }}
        animate={shakeKey === 0 ? { opacity: 1, y: 0, scale: 1 } : { x: [0, -8, 8, -6, 6, 0] }}
        transition={shakeKey === 0 ? { duration: 0.8, ease: [0.2, 0.9, 0.25, 1.15] } : { duration: 0.45 }}
        className="relative z-[1] w-full max-w-[420px] glass rounded-3xl p-7 sm:p-9"
      >
        {/* Logo SMK */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.2, 0.9, 0.25, 1.2] }}
          className="smk-logo smk-logo-shine w-[150px] mx-auto"
          role="img"
          aria-label="Logo PT. Sarana Multi Kalibrasi"
        />

        <motion.div {...item(0)} className="text-center mt-4">
          <h1 className="text-2xl font-extrabold tracking-tight smk-head">Portal Aset</h1>
          <p className="text-[13px] smk-muted mt-1">PT. Sarana Multi Kalibrasi · LK-532-IDN</p>
        </motion.div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3.5 bg-rose-50 text-rose-800 text-xs font-medium rounded-2xl border border-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="font-semibold flex-1">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="w-full space-y-4 mt-6" noValidate>
          <motion.div {...item(1)}>
            <label htmlFor="login-username" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--smk-text)' }}>
              Email / Username
            </label>
            <div className={inputWrap} style={{ borderColor: 'var(--smk-line)', background: 'var(--smk-surface-2)' }}>
              <UserIcon className="w-4 h-4 smk-muted group-focus-within:text-[#398AB9] transition-colors" />
              <input
                id="login-username"
                type="text"
                placeholder="Masukkan email atau username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="username"
                className="flex-1 min-w-0 py-3 bg-transparent outline-none text-sm font-medium"
                style={{ color: 'var(--smk-text)' }}
              />
            </div>
          </motion.div>

          <motion.div {...item(2)}>
            <label htmlFor="login-password" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--smk-text)' }}>
              Password
            </label>
            <div className={inputWrap} style={{ borderColor: 'var(--smk-line)', background: 'var(--smk-surface-2)' }}>
              <KeyRound className="w-4 h-4 smk-muted group-focus-within:text-[#398AB9] transition-colors" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password akun Anda"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="current-password"
                className="flex-1 min-w-0 py-3 bg-transparent outline-none text-sm font-medium font-mono"
                style={{ color: 'var(--smk-text)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 smk-muted hover:opacity-80 transition-opacity"
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div {...item(3)}>
            <button
              type="submit"
              disabled={loading}
              className="smk-btn-primary w-full mt-2 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memeriksa…</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        </form>

        {/* Security Info Box */}
        <motion.div {...item(4)} className="mt-6 flex items-start gap-2.5 p-3.5 rounded-2xl border text-left" style={{ borderColor: 'var(--smk-line)', background: 'var(--smk-surface-2)' }}>
          <Lock className="w-4 h-4 smk-muted shrink-0 mt-0.5" />
          <div className="text-[11px] smk-muted leading-relaxed">
            <span className="font-semibold" style={{ color: 'var(--smk-text)' }}>Autentikasi Aman:</span> Login terhubung langsung dengan sistem Supabase Auth & Row Level Security (RLS).
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="relative z-[1] text-xs smk-muted mt-6 text-center"
      >
        © 2026 PT. Sarana Multi Kalibrasi • Sistem Manajemen Kalibrasi Terintegrasi
      </motion.p>
    </div>
  );
};
