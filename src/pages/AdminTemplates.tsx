import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Rnd } from 'react-rnd';
import { Save, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';

interface ElementPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextPos extends ElementPos {
  fontSize: number;
}

interface TemplateConfig {
  imageUrl: string;
  qr: ElementPos;
  text: TextPos;
}

const DEFAULT_POS = { x: 50, y: 50, width: 64, height: 64 };
const DEFAULT_TEXT_POS = { x: 50, y: 150, width: 150, height: 30, fontSize: 16 };

export default function AdminTemplates() {
  const [activeTab, setActiveTab] = useState<'kecil' | 'besar'>('kecil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [configs, setConfigs] = useState<{ kecil: TemplateConfig | null, besar: TemplateConfig | null }>({
    kecil: null,
    besar: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'templates');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfigs(docSnap.data() as any);
        }
      } catch (err) {
        console.error(err);
        setError('Gagal memuat pengaturan.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar yang diperbolehkan.');
      return;
    }

    setError('');
    const storageRef = ref(storage, `templates/${activeTab}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Read the file as Data URL to store directly (avoids html2canvas CORS issues)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      
      setConfigs(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          imageUrl: base64String, // Store base64 string directly
          qr: prev[activeTab]?.qr || DEFAULT_POS,
          text: prev[activeTab]?.text || DEFAULT_TEXT_POS
        }
      }));
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await setDoc(doc(db, 'settings', 'templates'), {
        ...configs,
        updatedAt: serverTimestamp()
      });
      alert('Pengaturan template berhasil disimpan!');
    } catch (err: any) {
      console.error(err);
      setError('Gagal menyimpan pengaturan.');
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
          className="flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Simpan Desain
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 inline-flex">
        <button
          onClick={() => setActiveTab('kecil')}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors", activeTab === 'kecil' ? "bg-amber-500 text-slate-900" : "text-slate-600 hover:bg-slate-100")}
        >
          Template Kecil (3x2 cm)
        </button>
        <button
          onClick={() => setActiveTab('besar')}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors", activeTab === 'besar' ? "bg-amber-500 text-slate-900" : "text-slate-600 hover:bg-slate-100")}
        >
          Template Besar (9x3 cm)
        </button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{error}</span>
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
              <p>Belum ada gambar background untuk template {activeTab}.</p>
            </div>
          ) : (
            <div 
              className="relative shadow-2xl overflow-hidden" 
              style={{ 
                width: activeTab === 'kecil' ? 450 : 700, 
                height: activeTab === 'kecil' ? 300 : 300
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
