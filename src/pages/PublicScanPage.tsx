import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  cleanLabelString, 
  extractLabelFromLocation, 
  generateLabelSearchCandidates,
  normalizeLabelFormat
} from '../lib/labelParser';
import { 
  getPdfBlobUrl, 
  getGoogleDriveEmbedUrl 
} from '../lib/pdfStorage';
import { 
  Verified, 
  FileText, 
  Download, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Loader2, 
  ExternalLink,
  Copy,
  Check,
  Globe,
  QrCode,
  Search,
  FolderOpen,
  Camera,
  CheckCircle2,
  Calendar,
  Building2,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import CameraQrScanner from '../components/CameraQrScanner';
import { useAppConfig } from '../lib/appConfig';

export default function PublicScanPage() {
  const { logoUrl } = useAppConfig();
  const params = useParams();
  const rawParam = params.noLabel || params['*'];
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract candidate label from URL param, query param, hash, or pathname
  const cleanNoLabel = useMemo(() => {
    // 1. Check path parameter :noLabel or * first
    if (rawParam) {
      const parsed = cleanLabelString(rawParam);
      if (parsed) return parsed;
    }

    // 2. Check complete location (query params, hash, pathname)
    const fromLoc = extractLabelFromLocation(location);
    if (fromLoc) return fromLoc;

    return '';
  }, [rawParam, searchParams, location]);

  const [loading, setLoading] = useState(!!cleanNoLabel);
  const [labelData, setLabelData] = useState<any>(null);
  const [resolvedLabelId, setResolvedLabelId] = useState<string>('');
  const [error, setError] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearch.trim()) return;
    const cleaned = cleanLabelString(manualSearch.trim());
    if (cleaned) {
      navigate(`/sertifikat/${cleaned}`);
    }
  };

  const fetchLabelData = useCallback(async () => {
    if (!cleanNoLabel) {
      setLoading(false);
      setLabelData(null);
      setResolvedLabelId('');
      setPdfBlobUrl(null);
      return;
    }

    setLoading(true);
    setError(false);

    const targetClean = cleanNoLabel.trim().toLowerCase();
    const candidateList = generateLabelSearchCandidates(cleanNoLabel).map(c => c.trim().toLowerCase());
    const candidateSet = new Set([targetClean, ...candidateList]);

    try {
      // 1. Query Supabase
      const { data: supaLabels, error: supaErr } = await supabase
        .from('labels')
        .select('*');

      let found: any = null;
      const folderMetaMap: Record<string, string> = {};

      if (supaLabels && supaLabels.length > 0) {
        for (const row of supaLabels) {
          const rawNo = (row.no_label || '').toString().trim().toLowerCase();
          
          // Collect metadata rows
          if (rawNo.startsWith('__meta_folder_')) {
            const p = row.no_label.replace('__meta_folder_', '');
            if (p && row.pdf_name) folderMetaMap[p] = row.pdf_name;
            continue;
          }

          const cleanNo = cleanLabelString(row.no_label || '')?.toLowerCase();
          if (candidateSet.has(rawNo) || (cleanNo && candidateSet.has(cleanNo))) {
            found = {
              id: row.no_label,
              noLabel: row.no_label,
              namaRs: row.nama_rs || row.namaRs || null,
              status: row.status,
              pdfSource: row.pdf_source,
              pdfUrl: row.pdf_url,
              pdfDriveUrl: row.pdf_drive_url,
              pdfOriginalUrl: row.pdforiginal_url,
              pdfName: row.pdf_name,
              calibratedAt: row.calibrated_at,
              validUntil: row.valid_until,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            // Do not break immediately so we also collect any metadata rows
          }
        }
      }

      // If found but namaRs is not set directly on label, inherit from folder metadata
      if (found && !found.namaRs) {
        const prefix = found.noLabel ? found.noLabel.split('.')[0] : '';
        if (prefix && folderMetaMap[prefix]) {
          found.namaRs = folderMetaMap[prefix];
        }
      }

      // 2. Fallback or enrich with API backend (Cloud SQL has namaRs & folder hospital name)
      if (!found) {
        const res = await fetch(`/api/labels/${encodeURIComponent(cleanNoLabel)}`);
        if (res.ok) {
          const apiLabel = await res.json();
          if (apiLabel) found = apiLabel;
        }
      } else if (!found.namaRs) {
        try {
          const res = await fetch(`/api/labels/${encodeURIComponent(found.noLabel)}`);
          if (res.ok) {
            const apiLabel = await res.json();
            if (apiLabel?.namaRs) {
              found.namaRs = apiLabel.namaRs;
            }
          }
        } catch (_) {}
      }

      if (found) {
        setLabelData(found);
        setResolvedLabelId(found.noLabel || cleanNoLabel);
        setError(false);
      } else {
        const norm = normalizeLabelFormat(cleanNoLabel) || cleanNoLabel;
        if (/\d{2,}/.test(norm)) {
          setLabelData({
            noLabel: norm,
            status: 'Menunggu Sertifikat',
            isPrePrinted: true
          });
          setResolvedLabelId(norm);
          setError(false);
        } else {
          setError(true);
        }
      }
    } catch (err) {
      console.warn("Error fetching label from Supabase:", err);
      const norm = normalizeLabelFormat(cleanNoLabel) || cleanNoLabel;
      if (/\d{2,}/.test(norm)) {
        setLabelData({
          noLabel: norm,
          status: 'Menunggu Sertifikat',
          isPrePrinted: true
        });
        setResolvedLabelId(norm);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [cleanNoLabel]);

  useEffect(() => {
    fetchLabelData();

    // Realtime Supabase updates
    const channel = supabase
      .channel('public-scan-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels' }, () => {
        fetchLabelData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLabelData]);

  const handleCopyLink = () => {
    const targetUrl = window.location.href;
    navigator.clipboard.writeText(targetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Determine if certificate source is Google Drive
  const isDrive = labelData?.pdfSource === 'drive' || !!labelData?.pdfDriveUrl || !!labelData?.pdfOriginalUrl || (typeof labelData?.pdfUrl === 'string' && labelData.pdfUrl.includes('drive.google.com'));
  const driveViewUrl = labelData?.pdfDriveUrl || labelData?.pdfOriginalUrl || (isDrive && labelData?.pdfUrl ? labelData.pdfUrl : null);
  const rawDriveTarget = labelData?.pdfOriginalUrl || labelData?.pdfDriveUrl || labelData?.pdfUrl || '';
  const driveEmbedUrl = isDrive && rawDriveTarget ? getGoogleDriveEmbedUrl(rawDriveTarget) : null;

  const activePdfUrl = driveEmbedUrl || pdfBlobUrl || labelData?.pdfUrl;
  const isReady = labelData && (
    labelData.status === 'Sertifikat Tertaut' || 
    labelData.hasPdf || 
    !!labelData.pdfUrl || 
    !!labelData.pdfDriveUrl || 
    !!labelData.pdfOriginalUrl || 
    isDrive ||
    !!pdfBlobUrl
  );
  const displayLabel = resolvedLabelId || cleanNoLabel;
  const folderPrefix = displayLabel.split('.')[0] || '002';

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col text-slate-800">
      {/* Camera QR Scanner Modal */}
      <CameraQrScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={(scannedLabel) => {
          setIsCameraOpen(false);
          navigate(`/sertifikat/${scannedLabel}`);
        }}
      />

      {/* Top Header */}
      <header className="bg-slate-900 text-white relative overflow-hidden shadow-md shrink-0 border-b border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3.5 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3.5 group shrink-0">
            <div className="h-11 px-3 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow border border-slate-700 group-hover:border-slate-600 transition-colors">
              <img 
                src={logoUrl} 
                alt="Logo PT. Sarana Multi Kalibrasi" 
                className="h-8 max-w-[130px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-smk.svg';
                }}
              />
            </div>
            <div>
              <span className="text-base md:text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors block leading-snug">
                PT. Sarana Multi Kalibrasi
              </span>
              <p className="text-amber-400 text-xs font-medium flex items-center mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 shrink-0" />
                Portal Verifikasi Resmi Sertifikat Kalibrasi
              </p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {displayLabel && (
              <div className="bg-slate-800/95 border border-slate-700 rounded-xl px-3.5 py-1.5 flex items-center shadow-inner">
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-2">Label</span>
                <span className="text-base font-mono font-bold text-white tracking-wider">{displayLabel}</span>
              </div>
            )}

            <button
              onClick={() => setIsCameraOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center transition-colors border border-amber-500/30 shadow-sm"
              title="Buka Scanner Kamera"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Scan QR
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col justify-center">
        {loading ? (
          /* Loading State */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center max-w-md mx-auto w-full my-auto">
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="font-bold text-slate-900 text-lg">Memverifikasi Sertifikat...</h3>
            <p className="text-slate-500 text-xs mt-1.5 font-mono">No. Label: {displayLabel}</p>
            <p className="text-slate-400 text-xs mt-2">Menghubungkan ke database resmi laboratorium PT SMK</p>
          </div>
        ) : !cleanNoLabel ? (
          /* No label provided in URL */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200 max-w-lg mx-auto w-full my-auto text-center"
          >
            <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <QrCode className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifikasi Sertifikat Kalibrasi</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Silakan pindai QR Code pada stiker fisik menggunakan kamera, atau masukkan nomor label di bawah ini:
            </p>

            <div className="flex flex-col gap-3 mb-6">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded-xl shadow transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Buka Kamera untuk Pindai QR
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase font-medium">atau ketik nomor</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleManualSearch}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Contoh: 002.0020"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center shrink-0"
                  >
                    <Search className="w-4 h-4 mr-1.5" />
                    Cari
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span>Contoh dokumen tersertifikasi:</span>
              <button
                type="button"
                onClick={() => navigate('/sertifikat/002.0020')}
                className="font-mono font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded"
              >
                002.0020
              </button>
              <button
                type="button"
                onClick={() => navigate('/sertifikat/002.0018')}
                className="font-mono font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded"
              >
                002.0018
              </button>
            </div>
          </motion.div>
        ) : error && !labelData ? (
          /* Not Found State (only for totally non-numeric strings) */
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200 max-w-lg mx-auto w-full my-auto text-center"
          >
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Format Label Tidak Dikenali</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Kode <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{cleanNoLabel}</span> bukan format nomor label kalibrasi standar.
            </p>

            <form onSubmit={handleManualSearch} className="mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Contoh format: 002.0020"
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shrink-0"
                >
                  Cari
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl transition-colors flex items-center shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Scan Ulang
              </button>
            </div>
          </motion.div>
        ) : isReady ? (
          /* =========================================================================
             PHASE 2: Ready & Verified Certificate State (After 1-2 weeks link attached)
             ========================================================================= */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* Header Action Bar */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
              <div className="flex items-start md:items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
                  <Verified className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-lg leading-tight">Sertifikat Terverifikasi</h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      Resmi Laboratorium
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs md:max-w-md font-medium">
                    {labelData.pdfName || `Sertifikat-${displayLabel}.pdf`}
                    {labelData.pdfSize ? ` • ${(labelData.pdfSize / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  title="Salin Tautan Sertifikat"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {copiedLink ? 'Tersalin!' : 'Salin Link'}
                </button>

                {isDrive && driveViewUrl ? (
                  <>
                    <a 
                      href={driveViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95"
                      title="Buka Dokumen Langsung di Google Drive"
                    >
                      <Globe className="w-3.5 h-3.5 mr-1.5" />
                      Buka di Google Drive
                    </a>
                    <a 
                      href={driveViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                      title="Buka di Tab Baru"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Tab Baru
                    </a>
                  </>
                ) : activePdfUrl ? (
                  <>
                    <a 
                      href={activePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                      title="Buka Dokumen di Tab Baru"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Buka
                    </a>
                    <a 
                      href={activePdfUrl}
                      download={labelData.pdfName || `Sertifikat-${displayLabel}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Unduh PDF
                    </a>
                  </>
                ) : null}
              </div>
            </div>

            {/* Certificate Details Info Bar */}
            <div className="px-4 md:px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">No. Label</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{displayLabel}</span>
              </div>
              {labelData.namaRs && (
                <div>
                  <span className="text-slate-400 block font-medium">Rumah Sakit</span>
                  <span className="font-bold text-amber-700 truncate block" title={labelData.namaRs}>
                    {labelData.namaRs}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tersertifikasi Sah
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Penerbit</span>
                <span className="font-semibold text-slate-800">PT Sarana Multi Kalibrasi</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Sumber Dokumen</span>
                <span className="font-medium text-slate-700">
                  {isDrive ? 'Google Drive Cloud' : 'Database Laboratorium'}
                </span>
              </div>
            </div>

            {/* Prominent Google Drive Banner if applicable */}
            {isDrive && driveViewUrl && (
              <div className="mx-3 md:mx-6 mt-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-950 text-xs">Dokumen Resmi Google Drive Terhubung</h4>
                    <p className="text-[11px] text-blue-800">
                      Jika pratinjau di bawah ini dibatasi browser smartphone Anda, ketuk tombol di samping untuk membuka dokumen:
                    </p>
                  </div>
                </div>
                <a
                  href={driveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm shrink-0 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Buka di Google Drive &rarr;
                </a>
              </div>
            )}
            
            {/* Viewer Section */}
            <div className="flex-1 bg-slate-200/50 p-3 md:p-6 flex flex-col min-h-[650px]">
              {loadingPdf ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm p-8 text-center min-h-[400px]">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                  <p className="text-slate-800 font-bold text-base">Menyiapkan Dokumen Sertifikat PDF...</p>
                  <p className="text-slate-400 text-xs mt-1">Mengambil rekaman digital terverifikasi dari server</p>
                </div>
              ) : activePdfUrl ? (
                /* PDF Embed Viewer (supports Google Drive Preview and Blob URL) */
                <div className="flex-1 flex flex-col w-full h-full min-h-[600px]">
                  <iframe 
                    src={isDrive ? activePdfUrl : `${activePdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                    className="w-full flex-1 rounded-xl shadow-sm border border-slate-300 bg-white min-h-[600px]"
                    title={`Sertifikat Kalibrasi ${displayLabel}`}
                    allow="autoplay"
                  ></iframe>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm p-8 text-center min-h-[400px]">
                  <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                  <p className="text-slate-800 font-bold text-base">Dokumen Belum Dapat Ditampilkan</p>
                  <p className="text-slate-400 text-xs mt-1">Silakan klik tombol Buka di atas</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* =========================================================================
             Status: Sertifikat Belum Tersedia / Belum Ditautkan
             ========================================================================= */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200 max-w-xl mx-auto my-auto w-full text-center"
          >
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Sertifikat Belum Tersedia</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Sertifikat digital untuk nomor label <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">{displayLabel}</span> belum ditautkan oleh tim laboratorium.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              {labelData?.namaRs && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rumah Sakit</span>
                  <span className="text-xs font-bold text-amber-800">
                    {labelData.namaRs}
                  </span>
                </div>
              )}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pada Tanggal</span>
                <span className="text-xs font-bold text-slate-800">
                  {labelData?.calibratedAt ? labelData.calibratedAt : <span className="text-slate-400 font-normal italic">Ditulis manual pada stiker</span>}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Berlaku Hingga</span>
                <span className="text-xs font-bold text-slate-800">
                  {labelData?.validUntil ? labelData.validUntil : <span className="text-slate-400 font-normal italic">Ditulis manual pada stiker</span>}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Silakan hubungi PT Sarana Multi Kalibrasi untuk informasi lebih lanjut.
            </p>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-slate-400 text-xs shrink-0 border-t border-slate-200/60 bg-white">
        &copy; {new Date().getFullYear()} PT. Sarana Multi Kalibrasi. Seluruh Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}
