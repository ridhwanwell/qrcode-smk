import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, Printer, AlertCircle, RefreshCw, LayoutTemplate, ExternalLink, FolderOpen } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { cn } from '../lib/utils';

export default function AdminGenerate() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Single mode state
  const [noLabel, setNoLabel] = useState('');
  
  // Bulk mode state
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Generated result state
  const [generatedLabels, setGeneratedLabels] = useState<string[]>([]);
  const [labelType, setLabelType] = useState<'kecil' | 'besar'>('kecil');
  const [templateConfigs, setTemplateConfigs] = useState<any>(null);

  const getSuggestedPublicOrigin = () => {
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  // Domain configuration state (loaded automatically from settings or origin)
  const [customDomain, setCustomDomain] = useState(getSuggestedPublicOrigin());

  useEffect(() => {
    const fetchTemplatesAndSettings = async () => {
      try {
        const [templateSnap, settingsSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'templates')),
          getDoc(doc(db, 'settings', 'general'))
        ]);

        if (templateSnap.exists()) {
          setTemplateConfigs(templateSnap.data());
        }

        if (settingsSnap.exists() && settingsSnap.data().publicBaseUrl) {
          setCustomDomain(settingsSnap.data().publicBaseUrl);
        } else {
          // Auto-save public origin if not set
          const suggested = getSuggestedPublicOrigin();
          setDoc(doc(db, 'settings', 'general'), { publicBaseUrl: suggested }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load templates or settings", err);
      }
    };
    fetchTemplatesAndSettings();
  }, []);

  // Validate format XXX.XXXX
  const validateFormat = (value: string) => {
    return /^[0-9]{3}\.[0-9]{4}$/.test(value);
  };

  const parseLabel = (label: string) => {
    const parts = label.split('.');
    return { prefix: parts[0] + '.', number: parseInt(parts[1], 10) };
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    let labelsToGenerate: string[] = [];

    if (mode === 'single') {
      if (!validateFormat(noLabel)) {
        setError('Format No Label tidak valid.');
        return;
      }
      labelsToGenerate = [noLabel];
    } else {
      if (!validateFormat(startLabel) || !validateFormat(endLabel)) {
        setError('Format No Label tidak valid.');
        return;
      }
      const start = parseLabel(startLabel);
      const end = parseLabel(endLabel);
      
      if (start.prefix !== end.prefix) {
        setError('Awalan (3 digit pertama) harus sama untuk bulk generate.');
        return;
      }
      if (start.number > end.number) {
        setError('Label akhir harus lebih besar atau sama dengan label awal.');
        return;
      }
      
      const count = end.number - start.number + 1;
      if (count > 2000) {
        setError('Maksimal 2000 label dalam satu kali proses.');
        return;
      }

      for (let i = start.number; i <= end.number; i++) {
        labelsToGenerate.push(`${start.prefix}${i.toString().padStart(4, '0')}`);
      }
    }

    setLoading(true);
    setProgressMsg('Menyimpan ke database...');
    
    try {
      // Create documents in Firestore using batched writes (max 500 per batch)
      const chunkSize = 500;
      for (let i = 0; i < labelsToGenerate.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = labelsToGenerate.slice(i, i + chunkSize);
        
        setProgressMsg(`Menyimpan ke database... (${Math.min(i + chunkSize, labelsToGenerate.length)}/${labelsToGenerate.length})`);
        
        chunk.forEach(labelStr => {
          const docRef = doc(db, 'labels', labelStr);
          batch.set(docRef, {
            noLabel: labelStr,
            status: 'Menunggu Sertifikat',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        
        await batch.commit();
      }

      setGeneratedLabels(labelsToGenerate);
      setSuccess(true);
      setNoLabel('');
      setStartLabel('');
      setEndLabel('');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan label.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const getPublicUrl = (label: string) => {
    let base = (customDomain || window.location.origin).trim().replace(/\/+$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }
    return `${base}/sertifikat/${label}`;
  };

  const downloadPDF = async () => {
    if (!templateConfigs || !templateConfigs[labelType] || !templateConfigs[labelType].imageUrl) {
      alert("Template belum diatur di menu 'Desain Template'. Silakan atur terlebih dahulu.");
      return;
    }

    setLoading(true);
    setProgressMsg('Menyiapkan file PDF...');
    
    try {
      const config = templateConfigs[labelType];
      
      // Real physical dimensions
      const isKecil = labelType === 'kecil';
      const pdfWidth = isKecil ? 30 : 70; // 7x3 cm for large now
      const pdfHeight = isKecil ? 20 : 30;
      
      // Preview box dimensions in pixels
      const previewWidth = isKecil ? 450 : 700;
      const previewHeight = 300;
      
      // Scale ratios from preview pixels to mm
      const scaleX = pdfWidth / previewWidth;
      const scaleY = pdfHeight / previewHeight;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      for (let i = 0; i < generatedLabels.length; i++) {
        if (i > 0) pdf.addPage();
        
        if (i % 50 === 0) {
           setProgressMsg(`Membuat halaman PDF... (${i + 1}/${generatedLabels.length})`);
           // small delay to allow UI to update
           await new Promise(r => setTimeout(r, 10));
        }

        const labelStr = generatedLabels[i];
        
        // 1. Draw Background
        pdf.addImage(config.imageUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // 2. Draw QR Code
        const qrUrl = getPublicUrl(labelStr);
        // Explicitly set QR Code dark color to purely black for CMYK printing
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 300, color: { dark: '#000000', light: '#FFFFFF' } });
        pdf.addImage(
          qrDataUrl, 
          'PNG', 
          config.qr.x * scaleX, 
          config.qr.y * scaleY, 
          config.qr.width * scaleX, 
          config.qr.height * scaleY
        );
        
        // 3. Draw Text
        // Convert pixel font size to jsPDF points (approximate)
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor('#000000'); // Ensure it is pure black, relying on RIP for CMYK 100% K
        // FontSize in jsPDF is in points. 1 px = 0.75 pt. 
        // We also need to scale it by the layout scale. 
        // We'll calculate a proportional point size.
        const ptSize = (config.text.fontSize * scaleY * 2.83465); 
        pdf.setFontSize(ptSize);
        
        // Text positioning in jsPDF is from the bottom-left of the text (baseline)
        // We estimate baseline by adding the font size to the Y coordinate
        pdf.text(
          labelStr, 
          config.text.x * scaleX, 
          (config.text.y * scaleY) + (ptSize * 0.3527) // convert pt to mm for baseline offset
        );
      }
      
      setProgressMsg('Menyimpan PDF...');
      const fileName = generatedLabels.length === 1 
        ? `Label_${generatedLabels[0]}.pdf` 
        : `Labels_${generatedLabels[0]}_to_${generatedLabels[generatedLabels.length - 1]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat membuat PDF.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setGeneratedLabels([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Buat Label Baru</h2>
          <p className="text-slate-500 text-sm mt-0.5">Generate nomor label dan unduh PDF stiker kalibrasi siap cetak.</p>
        </div>
      </div>

      {!success ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8">
          <div className="flex-1 max-w-md">
            
            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-lg mb-8">
              <button
                type="button"
                onClick={() => { setMode('single'); setError(''); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  mode === 'single' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Satuan
              </button>
              <button
                type="button"
                onClick={() => { setMode('bulk'); setError(''); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  mode === 'bulk' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Sekaligus (Bulk)
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6">
              {mode === 'single' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">No Label</label>
                  <input
                    type="text"
                    required
                    value={noLabel}
                    onChange={(e) => {
                      setNoLabel(e.target.value);
                      setError('');
                    }}
                    className="block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none font-mono"
                    placeholder="002.0021"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Label Awal</label>
                    <input
                      type="text"
                      required
                      value={startLabel}
                      onChange={(e) => {
                        setStartLabel(e.target.value);
                        setError('');
                      }}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none"
                      placeholder="100.0001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Label Akhir</label>
                    <input
                      type="text"
                      required
                      value={endLabel}
                      onChange={(e) => {
                        setEndLabel(e.target.value);
                        setError('');
                      }}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none"
                      placeholder="100.0571"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-rose-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 inline shrink-0" />
                  {error}
                </p>
              )}
              <p className="text-xs text-slate-500">Format: 3 digit angka, titik, 4 digit angka.</p>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    {progressMsg || 'Memproses...'}
                  </>
                ) : (
                  'Generate Label'
                )}
              </button>
            </form>
          </div>
          
          <div className="hidden md:flex flex-1 items-center justify-center border-l border-slate-100 pl-8">
             <div className="text-center text-slate-400">
               <LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-50" />
               <p className="text-sm">Gunakan mode <strong>Sekaligus</strong> untuk membuat ratusan label dalam satu klik, lalu unduh sebagai satu file PDF siap cetak.</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <div className="flex items-center text-emerald-600 mb-6">
              <CheckCircle2 className="w-8 h-8 mr-3 shrink-0" />
              <div>
                <h3 className="text-xl font-bold">Berhasil Dibuat!</h3>
                <p className="text-sm text-emerald-700/80">
                  {generatedLabels.length} label telah tersimpan di database.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700">Pilih Ukuran Cetak:</h4>
              <div className="flex gap-4">
                <button
                  onClick={() => setLabelType('kecil')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg border transition-all",
                    labelType === 'kecil' ? "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Kecil (3x2 cm)
                </button>
                <button
                  onClick={() => setLabelType('besar')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg border transition-all",
                    labelType === 'besar' ? "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Besar (7x3 cm)
                </button>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800 text-sm">
               <strong>Catatan Warna (CMYK):</strong> File PDF yang dihasilkan aplikasi ini secara bawaan berformat RGB (standar web). Namun jangan khawatir, ketika file ini dikirim ke mesin cetak digital offset/laser, <strong>RIP software pada mesin cetak akan otomatis mengkonversinya ke warna CMYK</strong> dengan sangat baik. 
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={downloadPDF}
                disabled={loading}
                className="flex items-center px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />} 
                {loading ? progressMsg : `Download Label PDF (${generatedLabels.length} Halaman)`}
              </button>

              {generatedLabels.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const firstLabel = generatedLabels[0];
                      const prefix = firstLabel.split('.')[0] || '';
                      navigate(`/admin/labels?folder=${prefix}`);
                    }}
                    className="flex items-center px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Buka Folder Label ({generatedLabels[0].split('.')[0] || 'Daftar'})
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(getPublicUrl(generatedLabels[0]), '_blank')}
                    className="flex items-center px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    title="Buka halaman scan hasil label pertama"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Tes Scan Label Pertama ({generatedLabels[0]})
                  </button>
                </>
              )}

              <button
                onClick={resetForm}
                disabled={loading}
                className="flex items-center px-4 py-2.5 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 ml-auto"
              >
                Buat Label Lain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
