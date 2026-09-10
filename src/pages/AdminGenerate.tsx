import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  extractGoogleDriveFileId, 
  getGoogleDriveEmbedUrl, 
  getGoogleDriveViewUrl 
} from '../lib/pdfStorage';
import { CheckCircle2, Printer, AlertCircle, RefreshCw, LayoutTemplate, Globe, Check, ExternalLink, Link2, FolderOpen, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { cn } from '../lib/utils';

export default function AdminGenerate() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Single mode state
  const [noLabel, setNoLabel] = useState('');
  const [singleDriveUrl, setSingleDriveUrl] = useState('');
  const [singleDocName, setSingleDocName] = useState('');
  
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

  // Domain configuration state
  const [customDomain, setCustomDomain] = useState(getSuggestedPublicOrigin());
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);

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

  const handleSaveDomain = async () => {
    let clean = customDomain.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }

    if (clean.includes('.ai.studio') && !clean.includes('run.app')) {
      alert("Catatan: Domain '" + clean + "' bukan alamat web server Cloud Run yang aktif. Google AI Studio tidak menyediakan subdomain langsung seperti 'nama-app.ai.studio'. Silakan gunakan domain Preview/Share (berakhiran .run.app) atau URL saat ini (" + window.location.origin + ") agar QR Code dapat dibuka.");
    }

    setCustomDomain(clean);
    setSavingDomain(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), { publicBaseUrl: clean }, { merge: true });
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save domain", err);
    } finally {
      setSavingDomain(false);
    }
  };

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
          const hasDriveLink = mode === 'single' && singleDriveUrl.trim();

          if (hasDriveLink) {
            const trimmedUrl = singleDriveUrl.trim();
            const fileId = extractGoogleDriveFileId(trimmedUrl);
            const embedUrl = fileId ? getGoogleDriveEmbedUrl(fileId) : trimmedUrl;
            const viewUrl = fileId ? getGoogleDriveViewUrl(fileId) : trimmedUrl;

            batch.set(docRef, {
              noLabel: labelStr,
              status: 'Sertifikat Tertaut',
              pdfSource: 'drive',
              pdfUrl: embedUrl,
              pdfDriveUrl: viewUrl,
              pdfOriginalUrl: trimmedUrl,
              pdfName: singleDocName.trim() || `Sertifikat Kalibrasi ${labelStr}`,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } else {
            batch.set(docRef, {
              noLabel: labelStr,
              status: 'Menunggu Sertifikat',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        });
        
        await batch.commit();
      }

      setGeneratedLabels(labelsToGenerate);
      setSuccess(true);
      setNoLabel('');
      setSingleDriveUrl('');
      setSingleDocName('');
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

      {/* Domain / Base URL QR Setting */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Domain / URL Target QR Code</h3>
              <p className="text-xs text-slate-500">Tautan yang akan disematkan ke dalam QR Code saat label dicetak</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="text" 
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="https://contoh-domain.com"
              className="px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 w-64 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setCustomDomain(window.location.origin)}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              title="Gunakan URL Asal Browser Saat Ini"
            >
              Pakai Origin Saat Ini
            </button>
            <button
              type="button"
              onClick={handleSaveDomain}
              disabled={savingDomain}
              className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center shrink-0 disabled:opacity-50"
            >
              {savingDomain ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : domainSaved ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
              ) : null}
              {domainSaved ? 'Tersimpan' : 'Simpan'}
            </button>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Format URL Hasil:</span>{' '}
              <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800 border border-amber-200">
                {getPublicUrl(noLabel || startLabel || '100.0001')}
              </code>
              <p className="mt-1 text-[11px] text-amber-800">
                <strong>Tips Scan HP:</strong> Jika QR Code dicetak untuk discan kamera HP umum, pastikan domain di atas menggunakan domain publik / tautan Share AI Studio (bukan localhost).
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => window.open(getPublicUrl(noLabel || startLabel || '002.0020'), '_blank')}
            className="inline-flex items-center text-[11px] font-semibold text-amber-900 hover:text-amber-700 bg-white/70 hover:bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 transition-colors"
          >
            <ExternalLink className="w-3 h-3 mr-1" /> Cek Link Scan
          </button>
        </div>
      </div>

      {/* Calibration Workflow Explainer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 md:p-5 text-blue-950 shadow-xs">
        <h4 className="font-bold text-sm flex items-center gap-2 mb-2 text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Alur Kerja Standar Kalibrasi (Sertifikat Ditautkan 1-2 Minggu Setelahnya)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-blue-900">
          <div className="bg-white/80 p-3 rounded-xl border border-blue-100">
            <p className="font-bold text-slate-900 mb-0.5">Tahap 1: Cetak Stiker QR Code Sekarang</p>
            <p className="text-slate-600">
              Generate nomor label (satuan atau bulk) tanpa link sertifikat. Cetak dan tempelkan stiker fisik ke alat kalibrasi. Saat QR discan, sistem menampilkan status resmi <span className="font-semibold text-amber-700">"Menunggu Sertifikat"</span>.
            </p>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-blue-100">
            <p className="font-bold text-slate-900 mb-0.5">Tahap 2: Tautkan Google Drive (1-2 Minggu Kemudian)</p>
            <p className="text-slate-600">
              Setelah sertifikat selesai dibuat, buka menu <span className="font-semibold text-slate-800">Manajemen Label</span> dan tempelkan Link Google Drive. QR Code fisik yang sudah terpasang otomatis langsung menampilkan sertifikat digital.
            </p>
          </div>
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
                <div className="space-y-4">
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

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        Link Google Drive Sertifikat
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">Opsional</span>
                    </label>
                    <input
                      type="url"
                      value={singleDriveUrl}
                      onChange={(e) => setSingleDriveUrl(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 text-xs font-mono outline-none"
                      placeholder="https://drive.google.com/file/d/..."
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bisa diisi sekarang atau ditautkan nanti di menu <strong>Manajemen Label</strong>.
                    </p>
                  </div>

                  {singleDriveUrl.trim() && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Alat / Sertifikat <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={singleDocName}
                        onChange={(e) => setSingleDocName(e.target.value)}
                        className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 text-xs outline-none"
                        placeholder="Contoh: Sertifikat AED Mindray"
                      />
                    </div>
                  )}
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
