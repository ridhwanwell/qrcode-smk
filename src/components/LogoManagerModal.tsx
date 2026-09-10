import React, { useState } from 'react';
import { useAppConfig, saveAppLogo, DEFAULT_LOGO_URL } from '../lib/appConfig';
import { Image, Upload, Check, RefreshCw, X, Sparkles, Building2 } from 'lucide-react';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoManagerModal({ isOpen, onClose }: LogoManagerModalProps) {
  const { logoUrl } = useAppConfig();
  const [selectedLogo, setSelectedLogo] = useState<string>(logoUrl || DEFAULT_LOGO_URL);
  const [previewUrl, setPreviewUrl] = useState<string>(logoUrl || DEFAULT_LOGO_URL);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Resize logo image to optimal header dimensions (max 320x120) for crisp look and small payload
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxWidth = 360;
        const maxHeight = 140;

        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const bestRatio = Math.min(widthRatio, heightRatio);
          width = Math.round(width * bestRatio);
          height = Math.round(height * bestRatio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // Export as compressed PNG data URL (~15-30KB)
          const dataUrl = canvas.toDataURL('image/png');
          setSelectedLogo(dataUrl);
          setPreviewUrl(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveAppLogo(selectedLogo);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Gagal menyimpan logo:", err);
      alert("Gagal menyimpan logo. Silakan pastikan koneksi internet stabil.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefault = () => {
    setSelectedLogo(DEFAULT_LOGO_URL);
    setPreviewUrl(DEFAULT_LOGO_URL);
  };

  const handleCustomUrlApply = () => {
    if (!customUrlInput.trim()) return;
    setSelectedLogo(customUrlInput.trim());
    setPreviewUrl(customUrlInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base text-white">Pengaturan Logo Website</h3>
              <p className="text-xs text-slate-400">Ganti logo website & simpan untuk seluruh pengunjung</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Live Preview Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pratinjau Logo Website</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Dark Header Preview */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[100px] shadow-inner text-center">
                <p className="text-[10px] text-slate-400 mb-2 font-mono">Tampilan Header Gelap</p>
                <img 
                  src={previewUrl} 
                  alt="Preview Dark" 
                  className="max-h-12 max-w-full object-contain filter drop-shadow"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_LOGO_URL;
                  }}
                />
              </div>

              {/* Light Header Preview */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center min-h-[100px] shadow-inner text-center">
                <p className="text-[10px] text-slate-500 mb-2 font-mono">Tampilan Header Terang</p>
                <img 
                  src={previewUrl} 
                  alt="Preview Light" 
                  className="max-h-12 max-w-full object-contain filter drop-shadow"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_LOGO_URL;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Option 1: Upload Image File */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-amber-600" />
              1. Upload Logo dari Perangkat (PNG / JPG)
            </h4>
            <p className="text-xs text-slate-500">Pilih gambar logo transparan (.png) dari laptop atau HP Anda.</p>
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-amber-500 hover:bg-amber-50/50 text-slate-700 hover:text-amber-700 rounded-xl font-bold text-xs cursor-pointer transition-all shadow-sm">
              <Upload className="w-4 h-4" />
              <span>Pilih File Gambar PNG / JPG...</span>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>

          {/* Option 2: Reset to Default SMK Logo */}
          <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div>
              <p className="text-xs font-bold text-amber-900">Logo Resmi SMK (Vector SVG)</p>
              <p className="text-[11px] text-amber-700">Gunakan logo standar perak-biru PT Sarana Multi Kalibrasi</p>
            </div>
            <button
              onClick={handleResetDefault}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Gunakan Default
            </button>
          </div>

          {/* Option 3: Custom Image URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Atau Gunakan Direct URL Gambar (Opsional)</label>
            <div className="flex gap-2">
              <input 
                type="url" 
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://.../logo.png"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleCustomUrlApply}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4 text-emerald-900" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Simpan Logo untuk Semua Pengunjung</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
