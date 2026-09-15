import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Printer, AlertCircle, RefreshCw, LayoutTemplate, ExternalLink, FolderOpen, Building2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { cn } from '../lib/utils';
import { fetchTemplateConfigs } from '../lib/templateStorage';
import { saveFolderRsToSupabase } from '../lib/supabaseSync';
import { INITIAL_HOSPITALS } from '../data/mockData';

export default function AdminGenerate() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Single mode state
  const [noLabel, setNoLabel] = useState('');
  
  // Bulk mode state
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');

  // Hospital Name state (Optional)
  const [namaRs, setNamaRs] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Generated result state
  const [generatedLabels, setGeneratedLabels] = useState<string[]>([]);
  const [labelType, setLabelType] = useState<'kecil' | 'besar'>('kecil');
  const [bulkFormat, setBulkFormat] = useState<'a3_plus' | 'individual'>('a3_plus');
  const [templateConfigs, setTemplateConfigs] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('smk_template_configs');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

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
        // Fetch unified template configs directly from Supabase / cache
        const tplConfigs = await fetchTemplateConfigs();
        if (tplConfigs && (tplConfigs.kecil || tplConfigs.besar)) {
          setTemplateConfigs(tplConfigs);
        }

        const genRes = await fetch('/api/settings/general').catch(() => null);
        if (genRes && genRes.ok) {
          const genData = await genRes.json();
          if (genData?.value) {
            const val = typeof genData.value === 'string' ? JSON.parse(genData.value) : genData.value;
            if (val?.publicBaseUrl) {
              setCustomDomain(val.publicBaseUrl);
            }
          }
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
      const cleanNamaRs = namaRs.trim() || null;

      const itemsToSave = labelsToGenerate.map(lbl => ({
        noLabel: lbl,
        status: 'Menunggu Sertifikat',
        namaRs: cleanNamaRs
      }));

      // 1. Direct save to Supabase (primary)
      const supabaseRows = labelsToGenerate.map(lbl => ({
        no_label: lbl,
        status: 'Menunggu Sertifikat',
        nama_rs: cleanNamaRs,
        updated_at: new Date().toISOString()
      }));

      const supaRes = await supabase.from('labels').upsert(supabaseRows, { onConflict: 'no_label' });
      if (supaRes.error) {
        console.warn('Supabase bulk save warning:', supaRes.error.message);
      }

      // If hospital name is provided, update folder metadata map as well
      if (cleanNamaRs && labelsToGenerate.length > 0) {
        const prefix = labelsToGenerate[0].split('.')[0];
        if (prefix) {
          await saveFolderRsToSupabase(prefix, cleanNamaRs);
          try {
            const currentFolderMap = JSON.parse(localStorage.getItem('smk_folder_nama_rs_map') || '{}');
            currentFolderMap[prefix] = cleanNamaRs;
            localStorage.setItem('smk_folder_nama_rs_map', JSON.stringify(currentFolderMap));
          } catch (_) {}
          fetch('/api/folders/nama-rs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix, namaRs: cleanNamaRs })
          }).catch(() => {});
        }
      }

      // 2. Sync to API backend (Cloud SQL) in parallel / background
      fetch('/api/labels/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave })
      }).catch(err => console.warn('API bulk sync deferred:', err));

      // 3. Update localStorage labels
      try {
        const localList = JSON.parse(localStorage.getItem('smk_labels') || '[]');
        const existingMap = new Map(localList.map((l: any) => [l.noLabel, l]));
        itemsToSave.forEach(it => {
          existingMap.set(it.noLabel, {
            id: it.noLabel,
            noLabel: it.noLabel,
            namaRs: cleanNamaRs,
            status: it.status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
        localStorage.setItem('smk_labels', JSON.stringify(Array.from(existingMap.values())));
      } catch (_) {}

      setGeneratedLabels(labelsToGenerate);
      setSuccess(true);
      setNoLabel('');
      setStartLabel('');
      setEndLabel('');
      setNamaRs('');
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
      
      // Real physical dimensions of individual sticker
      const isKecil = labelType === 'kecil';
      const labelWidth = isKecil ? 30 : 50; // 3x2 cm atau 5x2 cm
      const labelHeight = 20; // 2 cm (20 mm) untuk kedua ukuran
      
      // Preview box dimensions in pixels from template editor
      const previewWidth = isKecil ? 450 : 750;
      const previewHeight = 300;
      
      // Scale ratios from preview pixels to sticker mm
      const scaleX = labelWidth / previewWidth;
      const scaleY = labelHeight / previewHeight;

      const isBulkA3 = (mode === 'bulk' || generatedLabels.length > 1) && bulkFormat === 'a3_plus';

      if (isBulkA3) {
        // Standar format cetak lembaran A3+ (320 mm x 480 mm, portrait)
        const sheetWidth = 320;
        const sheetHeight = 480;
        const cols = isKecil ? 9 : 6;
        const rows = 21;
        const labelsPerSheet = cols * rows; // 189 stiker (kecil: 9x21) / 126 stiker (besar: 6x21)

        const gapX = 2; // 2mm kiss-cut gap antar stiker
        const gapY = 2; // 2mm kiss-cut gap antar stiker

        const totalGridWidth = cols * labelWidth + (cols - 1) * gapX; // kecil: 286 mm, besar: 310 mm
        const marginLeft = (sheetWidth - totalGridWidth) / 2; // kecil: 17 mm, besar: 5 mm

        const totalGridHeight = rows * labelHeight + (rows - 1) * gapY; // 460 mm (21 baris x 20mm + 40mm gap)
        const marginTop = (sheetHeight - totalGridHeight) / 2; // 10 mm margin atas & bawah

        const totalSheets = Math.ceil(generatedLabels.length / labelsPerSheet);

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [sheetWidth, sheetHeight],
        });

        for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
          if (sheetIdx > 0) pdf.addPage();

          const startIdx = sheetIdx * labelsPerSheet;
          const endIdx = Math.min(startIdx + labelsPerSheet, generatedLabels.length);
          const sheetCount = endIdx - startIdx;

          setProgressMsg(`Membuat lembar A3+ (${sheetIdx + 1}/${totalSheets})...`);
          await new Promise(r => setTimeout(r, 10));

          // 1. Header Metadata Text (di luar area stiker/margin atas)
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.setTextColor(110, 110, 110);
          const headerText = `PT SARANA MULTI KALIBRASI  •  LEMBAR A3+ KISSCUT/DIECUT  •  Lembar ${sheetIdx + 1}/${totalSheets} (${sheetCount} Stiker)  •  ${labelType === 'besar' ? 'Ukuran Besar 50x20 mm / 5x2 cm (Maks 126/lbr)' : 'Ukuran Kecil 30x20 mm / 3x2 cm (Maks 189/lbr)'}  •  Label ${generatedLabels[startIdx]} s/d ${generatedLabels[endIdx - 1]}`;
          pdf.text(headerText, marginLeft, Math.max(5, marginTop - 3.5));

          // 2. Optical Registration Crop Marks pada 4 sudut grid untuk kamera plotter / mesin potong
          pdf.setDrawColor(160, 160, 160);
          pdf.setLineWidth(0.2);
          const rightEdge = marginLeft + totalGridWidth;
          const bottomEdge = marginTop + totalGridHeight;
          // Top-Left
          pdf.line(marginLeft - 6, marginTop, marginLeft - 1, marginTop);
          pdf.line(marginLeft, marginTop - 6, marginLeft, marginTop - 1);
          // Top-Right
          pdf.line(rightEdge + 1, marginTop, rightEdge + 6, marginTop);
          pdf.line(rightEdge, marginTop - 6, rightEdge, marginTop - 1);
          // Bottom-Left
          pdf.line(marginLeft - 6, bottomEdge, marginLeft - 1, bottomEdge);
          pdf.line(marginLeft, bottomEdge + 1, marginLeft, bottomEdge + 6);
          // Bottom-Right
          pdf.line(rightEdge + 1, bottomEdge, rightEdge + 6, bottomEdge);
          pdf.line(rightEdge, bottomEdge + 1, rightEdge, bottomEdge + 6);

          // 3. Render Setiap Stiker di dalam Grid Lembar A3+
          for (let k = 0; k < sheetCount; k++) {
            const globalIdx = startIdx + k;
            const labelStr = generatedLabels[globalIdx];

            const col = k % cols;
            const row = Math.floor(k / cols);

            const x = marginLeft + col * (labelWidth + gapX);
            const y = marginTop + row * (labelHeight + gapY);

            // A. Background Template Image
            pdf.addImage(config.imageUrl, 'JPEG', x, y, labelWidth, labelHeight);

            // B. QR Code
            const qrUrl = getPublicUrl(labelStr);
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
              margin: 0, 
              width: 260, 
              color: { dark: '#000000', light: '#FFFFFF' } 
            });
            pdf.addImage(
              qrDataUrl,
              'PNG',
              x + (config.qr.x * scaleX),
              y + (config.qr.y * scaleY),
              config.qr.width * scaleX,
              config.qr.height * scaleY
            );

            // C. Text Nomor Label
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor('#000000');
            const ptSize = config.text.fontSize * scaleY * 2.83465;
            pdf.setFontSize(ptSize);
            pdf.text(
              labelStr,
              x + (config.text.x * scaleX),
              y + (config.text.y * scaleY) + (ptSize * 0.3527)
            );

            // D. Hairline Kiss-Cut / Die-Cut Boundary (0.08 mm)
            pdf.setDrawColor(210, 210, 210);
            pdf.setLineWidth(0.08);
            pdf.rect(x, y, labelWidth, labelHeight);
          }
        }

        setProgressMsg('Menyimpan PDF A3+...');
        const fileName = `Labels_A3Plus_KissCut_${labelType}_${generatedLabels[0]}_to_${generatedLabels[generatedLabels.length - 1]}.pdf`;
        pdf.save(fileName);
      } else {
        // Mode satuan (1 label per halaman individual landscape)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [labelWidth, labelHeight],
        });

        for (let i = 0; i < generatedLabels.length; i++) {
          if (i > 0) pdf.addPage();
          
          if (i % 25 === 0) {
             setProgressMsg(`Membuat halaman PDF... (${i + 1}/${generatedLabels.length})`);
             await new Promise(r => setTimeout(r, 10));
          }

          const labelStr = generatedLabels[i];
          
          // 1. Draw Background
          pdf.addImage(config.imageUrl, 'JPEG', 0, 0, labelWidth, labelHeight);
          
          // 2. Draw QR Code
          const qrUrl = getPublicUrl(labelStr);
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
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor('#000000');
          const ptSize = (config.text.fontSize * scaleY * 2.83465); 
          pdf.setFontSize(ptSize);
          pdf.text(
            labelStr, 
            config.text.x * scaleX, 
            (config.text.y * scaleY) + (ptSize * 0.3527)
          );
        }
        
        setProgressMsg('Menyimpan PDF...');
        const fileName = generatedLabels.length === 1 
          ? `Label_${generatedLabels[0]}.pdf` 
          : `Labels_${generatedLabels[0]}_to_${generatedLabels[generatedLabels.length - 1]}.pdf`;
        pdf.save(fileName);
      }
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

              {/* Hospital Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Nama Rumah Sakit / Instansi</span>
                  <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  list="hospitals-generate-list"
                  value={namaRs}
                  onChange={(e) => setNamaRs(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-900 outline-none text-sm"
                  placeholder="Pilih atau tulis nama RS (Contoh: RSUD Dr. Moewardi)"
                />
                <datalist id="hospitals-generate-list">
                  {INITIAL_HOSPITALS.map(h => (
                    <option key={h.id} value={h.name} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika diisi, nama RS akan tersimpan di label & folder metadata. Jika dikosongi, label tidak akan memiliki asosiasi nama RS bawaan.
                </p>
              </div>

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

            {/* Opsi Ukuran Cetak */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700">Pilih Ukuran Cetak:</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setLabelType('kecil')}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium rounded-xl border transition-all text-left",
                    labelType === 'kecil' ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="font-bold">Kecil (3x2 cm)</div>
                  {(mode === 'bulk' || generatedLabels.length > 1) && (
                    <div className="text-[11px] text-amber-700 font-medium mt-0.5">189 stiker / lembar A3+ (9x21)</div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setLabelType('besar')}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium rounded-xl border transition-all text-left",
                    labelType === 'besar' ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="font-bold">Besar (5x2 cm)</div>
                  {(mode === 'bulk' || generatedLabels.length > 1) && (
                    <div className="text-[11px] text-amber-700 font-medium mt-0.5">126 stiker / lembar A3+ (6x21)</div>
                  )}
                </button>
              </div>
            </div>

            {/* Opsi Format Cetak untuk Bulk */}
            {(mode === 'bulk' || generatedLabels.length > 1) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-700">Format Output PDF:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBulkFormat('a3_plus')}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all",
                      bulkFormat === 'a3_plus'
                        ? "border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Lembar Kertas A3+ Kiss-Cut / Die-Cut</span>
                      {bulkFormat === 'a3_plus' && (
                        <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">Rekomendasi</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ukuran 320 x 480 mm siap cetak offset/laser digital. Lengkap dengan garis potong kiss-cut & crop marks.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkFormat('individual')}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all",
                      bulkFormat === 'individual'
                        ? "border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="font-bold text-xs">Satuan / Thermal Roll</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      1 stiker per halaman ({labelType === 'besar' ? '5x2 cm' : '3x2 cm'}), cocok untuk printer thermal gulungan.
                    </p>
                  </button>
                </div>

                {bulkFormat === 'a3_plus' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Rincian Lembar Cetak A3+ (320 × 480 mm):</span>
                      <span className="text-blue-700 font-mono">
                        {Math.ceil(generatedLabels.length / (labelType === 'besar' ? 126 : 189))} Lembar A3+
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Total <strong>{generatedLabels.length} stiker</strong> akan di-layout otomatis:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                      <li>
                        Kapasitas per lembar: <strong>{labelType === 'besar' ? '126 stiker (6 kolom × 21 baris)' : '189 stiker (9 kolom × 21 baris)'}</strong>
                      </li>
                      <li>
                        Lembar 1: <strong>{Math.min(generatedLabels.length, labelType === 'besar' ? 126 : 189)} stiker</strong>
                      </li>
                      {generatedLabels.length > (labelType === 'besar' ? 126 : 189) && (
                        <li>
                          Lembar 2: <strong>
                            {Math.min(
                              generatedLabels.length - (labelType === 'besar' ? 126 : 189),
                              labelType === 'besar' ? 126 : 189
                            )} stiker
                          </strong>
                          {generatedLabels.length > (labelType === 'besar' ? 252 : 378) && ' (dan lembar selanjutnya)'}
                        </li>
                      )}
                    </ul>
                    <p className="text-[11px] text-slate-500 pt-1">
                      Tersedia margin keliling aman ({labelType === 'besar' ? '5 mm' : '17 mm'}) & jarak potong pisau / kiss-cut 2 mm antarlavel.
                    </p>
                  </div>
                )}
              </div>
            )}

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
                {loading 
                  ? progressMsg 
                  : (mode === 'bulk' || generatedLabels.length > 1) && bulkFormat === 'a3_plus'
                    ? `Download PDF Lembar A3+ (${Math.ceil(generatedLabels.length / (labelType === 'besar' ? 126 : 189))} Lembar • ${generatedLabels.length} Stiker)`
                    : `Download Label PDF (${generatedLabels.length} Halaman)`
                }
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
