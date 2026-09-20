import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Save, Upload, AlertCircle, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import {
  TemplateConfig,
  TemplateConfigs,
  DEFAULT_QR_POS,
  DEFAULT_TEXT_POS,
  getCachedTemplateConfigs,
  fetchTemplateConfigs,
  saveTemplateConfigs,
} from '../lib/templateStorage';

export default function AdminTemplates() {
  const [activeTab, setActiveTab] = useState<'besar' | 'besarTidakLaik'>('besar');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [configs, setConfigs] = useState<TemplateConfigs>(getCachedTemplateConfigs);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await fetchTemplateConfigs();
      if (data && (data.besar || data.besarTidakLaik || data.kecil)) {
        setConfigs(data);
        setError('');
      }
    } catch (err: any) {
      console.warn('Error fetching unified templates:', err);
      // Only set error if no local config exists
      setConfigs(curr => {
        if (!curr.besar && !curr.besarTidakLaik) {
          setError('Gagal memuat pengaturan template dari database. Silakan klik Coba Lagi.');
        }
        return curr;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar yang diperbolehkan.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      
      setConfigs(prev => {
        const next: TemplateConfigs = {
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            imageUrl: base64String,
            qr: prev[activeTab]?.qr || DEFAULT_QR_POS,
            text: prev[activeTab]?.text || DEFAULT_TEXT_POS
          }
        };
        try {
          localStorage.setItem('smk_template_configs', JSON.stringify(next));
        } catch (_) {}
        return next;
      });
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await saveTemplateConfigs(configs);
      if (result.success) {
        setSuccessMsg('Pengaturan template berhasil disimpan ke database (tersinkronisasi untuk semua perangkat & akun)!');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        throw new Error(result.error || 'Gagal menyimpan template');
      }
    } catch (err: any) {
      console.warn('Save templates warning:', err);
      setSuccessMsg('Template disimpan di memori & browser.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const activeConfig = configs[activeTab];

  if (loading) {
    return <div className="p-8 text-center">Memuat...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Desain Template Label</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Simpan Desain
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 inline-flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('besar')}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer", activeTab === 'besar' ? "bg-amber-500 text-slate-900 shadow-xs" : "text-slate-600 hover:bg-slate-100")}
        >
          Template Besar (Laik Pakai) • 6x3 cm
        </button>
        <button
          onClick={() => setActiveTab('besarTidakLaik')}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer", activeTab === 'besarTidakLaik' ? "bg-rose-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100")}
        >
          Template Besar (Tidak Laik Pakai) • 6x3 cm
        </button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        {successMsg && (
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm flex items-center justify-between rounded-r-xl">
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2.5 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg('')}
              className="text-emerald-600 hover:text-emerald-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm flex items-center justify-between rounded-r-xl">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2.5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  loadTemplates();
                }}
                className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-rose-500 hover:text-rose-800 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" /> Unggah Gambar Background
          </button>
          
          {uploadProgress > 0 && (
            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </div>

        <div className="text-sm text-slate-500 border-l-4 border-amber-500 pl-3 py-1">
          <p><strong>Cara Penggunaan:</strong></p>
          <ul className="list-disc ml-5 space-y-1 mt-1">
            <li>Unggah gambar template kosong (tanpa tulisan No Label dan tanpa QR Code).</li>
            <li>Geser (drag) dan ubah ukuran (resize) kotak <strong>QR Code</strong> dan <strong>No Label</strong> ke posisi yang pas.</li>
            <li>Klik tombol <strong>Simpan Desain</strong> di kanan atas setelah selesai.</li>
          </ul>
        </div>

        <div className="mt-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center overflow-auto p-4 min-h-[400px]">
          {!activeConfig?.imageUrl ? (
            <div className="text-slate-400 text-center">
              <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada gambar background untuk {activeTab === 'besar' ? 'Template Besar (Laik Pakai)' : 'Template Besar (Tidak Laik Pakai)'}.</p>
            </div>
          ) : (
            <div 
              className="relative shadow-2xl overflow-hidden" 
              style={{ 
                width: 750, 
                height: 375
              }}
            >
              <img 
                src={activeConfig.imageUrl}
                alt="Template"
                className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none"
              />
              
              {/* QR Code Draggable */}
              <Rnd
                bounds="parent"
                size={{ width: activeConfig.qr.width, height: activeConfig.qr.height }}
                position={{ x: activeConfig.qr.x, y: activeConfig.qr.y }}
                onDragStop={(e, d) => {
                  setConfigs(prev => ({
                    ...prev,
                    [activeTab]: {
                      ...prev[activeTab]!,
                      qr: { ...prev[activeTab]!.qr, x: d.x, y: d.y }
                    }
                  }));
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setConfigs(prev => ({
                    ...prev,
                    [activeTab]: {
                      ...prev[activeTab]!,
                      qr: {
                        width: parseInt(ref.style.width, 10),
                        height: parseInt(ref.style.height, 10),
                        x: position.x,
                        y: position.y
                      }
                    }
                  }));
                }}
                className="border-2 border-rose-500 bg-white/50 cursor-move flex items-center justify-center relative group"
                lockAspectRatio
              >
                <div className="absolute -top-6 left-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">Area QR</div>
                <QRCodeSVG value={`${window.location.origin}/sertifikat/100.0001`} width="100%" height="100%" />
              </Rnd>

              {/* Text Draggable */}
              <Rnd
                bounds="parent"
                size={{ width: activeConfig.text.width, height: activeConfig.text.height }}
                position={{ x: activeConfig.text.x, y: activeConfig.text.y }}
                onDragStop={(e, d) => {
                  setConfigs(prev => ({
                    ...prev,
                    [activeTab]: {
                      ...prev[activeTab]!,
                      text: { ...prev[activeTab]!.text, x: d.x, y: d.y }
                    }
                  }));
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setConfigs(prev => ({
                    ...prev,
                    [activeTab]: {
                      ...prev[activeTab]!,
                      text: {
                        ...prev[activeTab]!.text,
                        width: parseInt(ref.style.width, 10),
                        height: parseInt(ref.style.height, 10),
                        x: position.x,
                        y: position.y
                      }
                    }
                  }));
                }}
                className="border-2 border-blue-500 bg-blue-500/10 cursor-move flex items-center group relative"
              >
                <div className="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-2 z-10">
                  Area Text (100.0001)
                  <button 
                    onClick={() => {
                      const newSize = Math.max(8, activeConfig.text.fontSize - 2);
                      setConfigs(prev => ({
                        ...prev,
                        [activeTab]: { ...prev[activeTab]!, text: { ...prev[activeTab]!.text, fontSize: newSize } }
                      }));
                    }}
                    className="bg-white/20 px-1 rounded hover:bg-white/40 leading-none"
                    title="Perkecil Font"
                  >-</button>
                  <span>{activeConfig.text.fontSize}px</span>
                  <button 
                    onClick={() => {
                      const newSize = activeConfig.text.fontSize + 2;
                      setConfigs(prev => ({
                        ...prev,
                        [activeTab]: { ...prev[activeTab]!, text: { ...prev[activeTab]!.text, fontSize: newSize } }
                      }));
                    }}
                    className="bg-white/20 px-1 rounded hover:bg-white/40 leading-none"
                    title="Perbesar Font"
                  >+</button>
                </div>
                <div 
                  className="font-bold text-slate-800 font-sans w-full truncate px-1"
                  style={{ fontSize: `${activeConfig.text.fontSize}px` }}
                >
                  100.0001
                </div>
              </Rnd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
