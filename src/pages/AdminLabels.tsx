import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  uploadPdfToFirestore, 
  getPdfBlobUrl, 
  deleteCertificateFromLabel, 
  deleteLabelCompletely,
  deleteBatchLabels,
  linkGoogleDriveToLabel,
  updateLabelDates,
  extractGoogleDriveFileId
} from '../lib/pdfStorage';
import { 
  Search, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  X, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check,
  Link2,
  Globe,
  Sparkles,
  Folder,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  Layers,
  FileCheck,
  Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';
import CameraQrScanner from '../components/CameraQrScanner';

export interface FolderGroup {
  prefix: string;
  items: any[];
  totalCount: number;
  certifiedCount: number;
  pendingCount: number;
  minLabel: string;
  maxLabel: string;
}

/**
 * Extracts 3-digit prefix from a label (e.g. "011.0001" -> "011")
 */
export function extractLabelPrefix(noLabel: string): string {
  if (!noLabel) return 'Lainnya';
  const clean = noLabel.trim();
  const dotIndex = clean.indexOf('.');
  if (dotIndex > 0) {
    return clean.substring(0, dotIndex);
  }
  if (clean.length >= 3) {
    return clean.substring(0, 3);
  }
  return clean || 'Lainnya';
}

export default function AdminLabels() {
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Navigation & Search State
  const activePrefix = searchParams.get('folder');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  
  // Operation states
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deletingFolder, setDeletingFolder] = useState(false);
  
  // Modal State for Linking Certificate (Google Drive or Upload)
  const [activeModalLabel, setActiveModalLabel] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'drive' | 'upload'>('drive');
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [docNameInput, setDocNameInput] = useState('');
  const [calibratedAtInput, setCalibratedAtInput] = useState('');
  const [validUntilInput, setValidUntilInput] = useState('');
  const [savingDrive, setSavingDrive] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'labels'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLabels(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'labels');
    });

    return () => unsubscribe();
  }, []);

  // Group labels into 3-digit prefix folders
  const folders = useMemo(() => {
    const groups: Record<string, any[]> = {};

    labels.forEach(label => {
      const prefix = extractLabelPrefix(label.noLabel);
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(label);
    });

    const list: FolderGroup[] = Object.keys(groups).map(prefix => {
      // Sort labels inside folder naturally (e.g. 011.0001, 011.0002, ..., 011.0100)
      const sortedItems = groups[prefix].sort((a, b) => 
        a.noLabel.localeCompare(b.noLabel, undefined, { numeric: true, sensitivity: 'base' })
      );

      const certifiedCount = sortedItems.filter(l => 
        l.status === 'Sertifikat Tertaut' || l.hasPdf || !!l.pdfUrl || l.pdfSource === 'drive'
      ).length;

      return {
        prefix,
        items: sortedItems,
        totalCount: sortedItems.length,
        certifiedCount,
        pendingCount: sortedItems.length - certifiedCount,
        minLabel: sortedItems[0]?.noLabel || prefix,
        maxLabel: sortedItems[sortedItems.length - 1]?.noLabel || prefix,
      };
    });

    // Sort folders by 3-digit prefix (e.g. 001, 002, 011, 100)
    return list.sort((a, b) => 
      a.prefix.localeCompare(b.prefix, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [labels]);

  // Determine active folder object
  const activeFolder = useMemo(() => {
    if (!activePrefix) return null;
    return folders.find(f => f.prefix === activePrefix) || null;
  }, [folders, activePrefix]);

  // Filter folders in root view
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const q = searchQuery.toLowerCase().trim();
    return folders.filter(folder => 
      folder.prefix.toLowerCase().includes(q) ||
      folder.items.some(item => item.noLabel.toLowerCase().includes(q))
    );
  }, [folders, searchQuery]);

  // Filter items in active folder view
  const filteredFolderItems = useMemo(() => {
    if (!activeFolder) return [];
    if (!folderSearch.trim()) return activeFolder.items;
    const q = folderSearch.toLowerCase().trim();
    return activeFolder.items.filter(item => 
      item.noLabel.toLowerCase().includes(q) ||
      (item.pdfName && item.pdfName.toLowerCase().includes(q))
    );
  }, [activeFolder, folderSearch]);

  const openFolder = (prefix: string) => {
    setSearchParams({ folder: prefix });
    setFolderSearch('');
  };

  const closeFolder = () => {
    setSearchParams({});
    setFolderSearch('');
  };

  const openLinkModal = (label: any) => {
    setActiveModalLabel(label);
    setModalError('');
    setSelectedFile(null);
    
    // Set dates (preserves existing or leaves blank for manual entry by technician)
    setCalibratedAtInput(label.calibratedAt || '');
    setValidUntilInput(label.validUntil || '');

    if (label.pdfSource === 'drive' || label.pdfDriveUrl) {
      setModalTab('drive');
      setDriveUrlInput(label.pdfOriginalUrl || label.pdfDriveUrl || '');
      setDocNameInput(label.pdfName || '');
    } else {
      setModalTab('drive');
      setDriveUrlInput('');
      setDocNameInput(label.pdfName || '');
    }
  };

  const closeLinkModal = () => {
    if (savingDrive || uploadingId) return;
    setActiveModalLabel(null);
    setModalError('');
    setDriveUrlInput('');
    setDocNameInput('');
    setCalibratedAtInput('');
    setValidUntilInput('');
    setSelectedFile(null);
  };

  const handleSaveGoogleDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalLabel) return;

    const trimmedUrl = driveUrlInput.trim();
    if (!trimmedUrl) {
      setModalError('Silakan masukkan link Google Drive sertifikat.');
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setModalError('URL harus diawali dengan https:// atau http://');
      return;
    }

    setSavingDrive(true);
    setModalError('');

    try {
      await linkGoogleDriveToLabel(
        activeModalLabel.id, 
        trimmedUrl, 
        docNameInput.trim() || undefined,
        { calibratedAt: calibratedAtInput, validUntil: validUntilInput }
      );
      setSavingDrive(false);
      closeLinkModal();
    } catch (err: any) {
      console.error("Error saving Google Drive link:", err);
      setModalError(err.message || 'Gagal menyimpan link Google Drive.');
      setSavingDrive(false);
    }
  };

  const handleModalFileUpload = async () => {
    if (!selectedFile || !activeModalLabel) return;
    
    if (selectedFile.type !== 'application/pdf') {
      setModalError('Hanya file PDF yang diperbolehkan.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setModalError('Ukuran file maksimal 20MB.');
      return;
    }

    const labelId = activeModalLabel.id;
    setUploadingId(labelId);
    setUploadProgress(5);
    setModalError('');

    try {
      await uploadPdfToFirestore(
        labelId, 
        selectedFile, 
        (percent) => {
          setUploadProgress(percent);
        },
        { calibratedAt: calibratedAtInput, validUntil: validUntilInput }
      );
      
      setUploadingId(null);
      setUploadProgress(0);
      closeLinkModal();
    } catch (err: any) {
      console.error("Upload error:", err);
      setModalError(`Gagal mengunggah PDF: ${err?.message || 'Terjadi kesalahan sistem'}`);
      setUploadingId(null);
    }
  };

  const handleSaveDatesOnly = async () => {
    if (!activeModalLabel) return;
    setSavingDrive(true);
    setModalError('');
    try {
      await updateLabelDates(activeModalLabel.id, calibratedAtInput, validUntilInput);
      setSavingDrive(false);
      closeLinkModal();
    } catch (err: any) {
      console.error("Error updating dates:", err);
      setModalError('Gagal memperbarui tanggal: ' + (err.message || ''));
      setSavingDrive(false);
    }
  };

  const handleViewPdf = async (label: any) => {
    if (label.pdfDriveUrl) {
      window.open(label.pdfDriveUrl, '_blank');
      return;
    }

    if (label.pdfUrl) {
      window.open(label.pdfUrl, '_blank');
      return;
    }

    setViewingId(label.id);
    try {
      const res = await getPdfBlobUrl(label.id);
      if (res && res.url) {
        window.open(res.url, '_blank');
      } else {
        alert('File sertifikat tidak ditemukan atau data belum lengkap.');
      }
    } catch (err: any) {
      console.error("Error opening PDF:", err);
      alert('Gagal membuka file sertifikat: ' + (err.message || 'Error'));
    } finally {
      setViewingId(null);
    }
  };

  const handleDeleteCert = async (id: string) => {
    const labelToUpdate = labels.find(l => l.id === id);
    if (!labelToUpdate) return;
    
    if (!window.confirm(`Yakin ingin melepas/menghapus sertifikat untuk label ${labelToUpdate.noLabel}?`)) return;
    
    try {
      setLabels(prev => prev.map(l => l.id === id ? { ...l, status: 'Menunggu Sertifikat', hasPdf: false, pdfUrl: null, pdfDriveUrl: null, pdfSource: null } : l));
      await deleteCertificateFromLabel(id);
    } catch(err: any) {
      console.error("Delete cert error:", err);
      alert('Gagal menghapus sertifikat: ' + (err.message || ''));
    }
  };

  const handleDeleteLabel = async (id: string) => {
    const labelToDelete = labels.find(l => l.id === id);
    if (!labelToDelete) return;
    
    if (!window.confirm(`PERINGATAN: Yakin ingin MENGHAPUS Label ${labelToDelete.noLabel} sepenuhnya dari sistem? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    const previousLabels = [...labels];
    setLabels(prev => prev.filter(l => l.id !== id));

    try {
      await deleteLabelCompletely(id);
    } catch(err: any) {
      console.error("Delete label error:", err);
      setLabels(previousLabels);
      alert('Gagal menghapus label: ' + (err.message || 'Terjadi kesalahan sistem'));
    }
  };

  const handleDeleteEntireFolder = async (folder: FolderGroup) => {
    if (!window.confirm(`PERINGATAN: Yakin ingin MENGHAPUS SELURUH ${folder.totalCount} label di dalam Folder ${folder.prefix} (${folder.minLabel} s/d ${folder.maxLabel})? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setDeletingFolder(true);
    const idsToDelete = folder.items.map(i => i.id);
    const previousLabels = [...labels];

    // Optimistic remove
    setLabels(prev => prev.filter(l => !idsToDelete.includes(l.id)));

    try {
      await deleteBatchLabels(idsToDelete);
      if (activePrefix === folder.prefix) {
        closeFolder();
      }
    } catch (err: any) {
      console.error("Delete folder error:", err);
      setLabels(previousLabels);
      alert('Gagal menghapus folder: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setDeletingFolder(false);
    }
  };

  const handleCopyScanLink = (noLabel: string) => {
    let base = window.location.origin;
    if (base.includes('ais-dev-')) {
      base = base.replace('ais-dev-', 'ais-pre-');
    }
    const url = `${base}/sertifikat/${noLabel}`;
    navigator.clipboard.writeText(url);
    setCopiedId(noLabel);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScanFromCamera = (scannedLabel: string) => {
    setIsCameraOpen(false);
    const prefix = extractLabelPrefix(scannedLabel);
    setSearchParams({ folder: prefix });
    setFolderSearch(scannedLabel);

    // If item exists in labels, open link modal right away
    const found = labels.find(l => l.noLabel === scannedLabel || l.id === scannedLabel);
    if (found) {
      openLinkModal(found);
    }
  };

  const driveIdDetected = extractGoogleDriveFileId(driveUrlInput);

  // Total summary statistics
  const totalCertificatesAttached = useMemo(() => {
    return labels.filter(l => l.status === 'Sertifikat Tertaut' || l.hasPdf || !!l.pdfUrl || l.pdfSource === 'drive').length;
  }, [labels]);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {activeFolder ? (
            <div className="space-y-1">
              <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <button 
                  type="button" 
                  onClick={closeFolder}
                  className="hover:text-amber-600 transition-colors flex items-center gap-1"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500" />
                  Semua Folder
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-900 font-mono font-bold">Folder {activeFolder.prefix}</span>
              </nav>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-amber-500 shrink-0" />
                Folder {activeFolder.prefix}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Rentang: <span className="font-bold text-slate-700">{activeFolder.minLabel}</span> s/d <span className="font-bold text-slate-700">{activeFolder.maxLabel}</span> ({activeFolder.totalCount} file label)
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-amber-500" />
                Folder Label Kalibrasi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Daftar nomor label dikelompokkan berdasarkan 3 angka awal. Klik folder untuk membuka seluruh file label di dalamnya.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            title="Pindai stiker fisik dengan kamera untuk langsung menautkan sertifikat Google Drive"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Stiker</span>
          </button>

          {activeFolder ? (
            <>
              <button
                type="button"
                onClick={closeFolder}
                className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Semua Folder
              </button>
              <div className="relative w-full sm:w-60">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs bg-white shadow-sm text-slate-900 outline-none"
                  placeholder={`Cari di folder ${activeFolder.prefix}...`}
                />
              </div>
            </>
          ) : (
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-xs bg-white shadow-sm text-slate-900 outline-none"
                placeholder="Cari folder atau nomor label..."
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm flex items-start rounded-r-lg">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: ROOT FOLDERS VIEW */}
      {!activeFolder ? (
        <div className="space-y-4">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Folder</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{folders.length} Folder</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Folder className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total File Label</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{labels.length} Label</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sertifikat Tertaut</span>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">
                  {totalCertificatesAttached} <span className="text-xs font-normal text-slate-400">/ {labels.length}</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Folder Grid */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-500 text-xs font-medium">Memuat daftar folder...</p>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base">Tidak ada folder ditemukan</h3>
              <p className="text-slate-400 text-xs mt-1">
                {searchQuery ? `Tidak ada folder yang cocok dengan "${searchQuery}"` : 'Belum ada label kalibrasi yang di-generate.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFolders.map((folder) => {
                const percentDone = folder.totalCount > 0 
                  ? Math.round((folder.certifiedCount / folder.totalCount) * 100) 
                  : 0;

                return (
                  <div
                    key={folder.prefix}
                    onClick={() => openFolder(folder.prefix)}
                    className="bg-white hover:bg-slate-50/80 rounded-2xl p-5 border border-slate-200/90 hover:border-amber-400 shadow-sm hover:shadow transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-amber-50 group-hover:bg-amber-100/80 rounded-2xl flex items-center justify-center text-amber-500 transition-colors shadow-inner">
                          <Folder className="w-6 h-6 fill-amber-500/20" />
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors font-mono">
                          {folder.totalCount} Label
                        </span>
                      </div>

                      {/* Folder Title (3 digits) */}
                      <h3 className="text-xl font-black text-slate-900 font-mono tracking-tight group-hover:text-amber-600 transition-colors">
                        Folder {folder.prefix}
                      </h3>

                      {/* Label Range */}
                      <p className="text-xs text-slate-500 font-mono mt-1 flex items-center">
                        <span className="truncate">{folder.minLabel}</span>
                        <span className="mx-1 text-slate-300">&rarr;</span>
                        <span className="truncate">{folder.maxLabel}</span>
                      </p>
                    </div>

                    {/* Progress & Bottom Bar */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
                        <span className="text-slate-500">Sertifikat:</span>
                        <span className={cn(
                          "font-bold",
                          percentDone === 100 ? "text-emerald-600" : percentDone > 0 ? "text-blue-600" : "text-amber-600"
                        )}>
                          {folder.certifiedCount} / {folder.totalCount} ({percentDone}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            percentDone === 100 ? "bg-emerald-500" : "bg-amber-500"
                          )}
                          style={{ width: `${percentDone}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                          Buka Folder &rarr;
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEntireFolder(folder);
                          }}
                          disabled={deletingFolder}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                          title="Hapus Seluruh Folder Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: INSIDE ACTIVE FOLDER VIEW (e.g. Folder 011: 011.0001 - 011.0100) */
        <div className="space-y-4">
          {/* Active Folder Subheader Banner */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 border border-amber-100">
                <FolderOpen className="w-7 h-7 fill-amber-500/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                    Folder {activeFolder.prefix}
                  </h3>
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full font-mono">
                    {activeFolder.totalCount} File
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Rentang Nomor: <span className="font-bold text-slate-700">{activeFolder.minLabel}</span> sampai <span className="font-bold text-slate-700">{activeFolder.maxLabel}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleDeleteEntireFolder(activeFolder)}
                disabled={deletingFolder}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
                title="Hapus seluruh file di folder ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Folder ({activeFolder.totalCount} File)
              </button>
            </div>
          </div>

          {/* Table of Files inside Active Folder */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-4">Nomor Label</th>
                    <th className="px-6 py-4">Status Sertifikat</th>
                    <th className="px-6 py-4">Tipe & Dokumen</th>
                    <th className="px-6 py-4">Pada Tanggal</th>
                    <th className="px-6 py-4">Berlaku Hingga</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFolderItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        {folderSearch ? `Tidak ada label yang cocok dengan "${folderSearch}" di folder ini.` : 'Folder ini kosong.'}
                      </td>
                    </tr>
                  ) : (
                    filteredFolderItems.map((label) => {
                      const isDrive = label.pdfSource === 'drive' || !!label.pdfDriveUrl;
                      const hasCertificate = label.status === 'Sertifikat Tertaut' || label.hasPdf || !!label.pdfUrl || isDrive;

                      return (
                        <tr key={label.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 font-mono text-sm">{label.noLabel}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => window.open(`/sertifikat/${label.noLabel}`, '_blank')}
                                className="inline-flex items-center text-[11px] text-amber-600 hover:text-amber-800 font-medium hover:underline"
                                title="Buka halaman verifikasi scan publik"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" /> Tes Scan
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => handleCopyScanLink(label.noLabel)}
                                className="inline-flex items-center text-[11px] text-slate-500 hover:text-slate-800"
                                title="Salin tautan scan"
                              >
                                {copiedId === label.noLabel ? (
                                  <span className="text-emerald-600 font-semibold flex items-center">
                                    <Check className="w-3 h-3 mr-0.5" /> Tersalin
                                  </span>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" /> Salin Link
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                              hasCertificate 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-amber-100 text-amber-800"
                            )}>
                              {hasCertificate ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                              {hasCertificate ? 'Sertifikat Tertaut' : 'Menunggu Sertifikat'}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {hasCertificate ? (
                              <div className="flex flex-col gap-1">
                                <button 
                                  onClick={() => handleViewPdf(label)}
                                  disabled={viewingId === label.id}
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium hover:underline disabled:opacity-50 text-left"
                                >
                                  {viewingId === label.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                      Membuka...
                                    </>
                                  ) : isDrive ? (
                                    <>
                                      <Globe className="w-4 h-4 mr-1.5 text-blue-500 shrink-0" />
                                      <span className="truncate max-w-[200px]" title={label.pdfName || 'Google Drive'}>
                                        {label.pdfName || 'Link Google Drive'}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-4 h-4 mr-1.5 text-emerald-500 shrink-0" /> 
                                      <span className="truncate max-w-[200px]" title={label.pdfName || 'File PDF'}>
                                        {label.pdfName || 'Lihat PDF'}
                                      </span>
                                    </>
                                  )}
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {isDrive ? 'Sumber: Google Drive Link' : (label.pdfSize ? `${(label.pdfSize / 1024).toFixed(0)} KB (File)` : 'Database File')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Belum ada sertifikat</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-slate-700 text-xs font-mono font-medium">
                            {label.calibratedAt || '-'}
                          </td>

                          <td className="px-6 py-4 text-slate-700 text-xs font-mono font-medium">
                            {label.validUntil || '-'}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {uploadingId === label.id ? (
                              <div className="w-full max-w-[150px] ml-auto h-8 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200 shadow-inner">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-300" 
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-900 drop-shadow-sm">
                                  Mengunggah {uploadProgress}%
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  type="button"
                                  onClick={() => openLinkModal(label)}
                                  className={cn(
                                    "inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm",
                                    hasCertificate
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                      : "bg-amber-500 hover:bg-amber-400 text-slate-900"
                                  )}
                                  title={hasCertificate ? "Ubah Link atau Ganti File Sertifikat" : "Tautkan Sertifikat (Google Drive / Upload)"}
                                >
                                  <Link2 className="w-3.5 h-3.5 mr-1" />
                                  {hasCertificate ? 'Ganti' : 'Tautkan'}
                                </button>
                                {hasCertificate && (
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteCert(label.id)}
                                    className="inline-flex items-center px-2 py-1.5 text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                    title="Lepas / Hapus Sertifikat"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteLabel(label.id)}
                                  className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Hapus Seluruh Label"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tautkan Sertifikat (Google Drive or Upload File) */}
      {activeModalLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center">
                  <Link2 className="w-4 h-4 mr-2 text-amber-500" />
                  Tautkan Sertifikat Kalibrasi
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Nomor Label: <span className="font-bold text-slate-900">{activeModalLabel.noLabel}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={closeLinkModal}
                disabled={savingDrive || !!uploadingId}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/50 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setModalTab('drive')}
                className={cn(
                  "flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                  modalTab === 'drive'
                    ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Link Google Drive (Direkomendasikan)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('upload')}
                className={cn(
                  "flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                  modalTab === 'upload'
                    ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                Unggah File PDF
              </button>
            </div>

            {modalError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              {modalTab === 'drive' ? (
                /* TAB 1: GOOGLE DRIVE LINK */
                <form onSubmit={handleSaveGoogleDrive} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Link Berbagi Google Drive <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="url" 
                      value={driveUrlInput}
                      onChange={(e) => setDriveUrlInput(e.target.value)}
                      placeholder="https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      autoFocus
                    />
                    {driveIdDetected && (
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                        ID File Terdeteksi: <span className="font-mono font-bold ml-1">{driveIdDetected}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Sertifikat / Alat <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={docNameInput}
                      onChange={(e) => setDocNameInput(e.target.value)}
                      placeholder="Contoh: Sertifikat Kalibrasi AED Mindray"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Calibration & Expiration Dates */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Pada Tanggal (Kalibrasi)</label>
                      <input 
                        type="date"
                        value={calibratedAtInput}
                        onChange={(e) => setCalibratedAtInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Berlaku Hingga</label>
                      <input 
                        type="date"
                        value={validUntilInput}
                        onChange={(e) => setValidUntilInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Tutorial Tip */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1.5">
                    <div className="font-bold flex items-center text-blue-800">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      Petunjuk Akses Google Drive:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] pl-1">
                      <li>Buka file PDF sertifikat di Google Drive Anda.</li>
                      <li>Klik <strong>Bagikan (Share)</strong> &gt; ubah Akses Umum menjadi <strong>"Siapa saja yang memiliki tautan"</strong> (Viewer).</li>
                      <li>Klik <strong>Salin Tautan</strong> lalu tempelkan di kotak di atas.</li>
                    </ol>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDatesOnly}
                      disabled={savingDrive}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                      title="Update tanggal kalibrasi tanpa mengubah link sertifikat"
                    >
                      Simpan Tanggal Saja
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={closeLinkModal}
                        disabled={savingDrive}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={savingDrive || !driveUrlInput.trim()}
                        className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        {savingDrive ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Menyimpan Link...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Simpan Link Google Drive
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* TAB 2: DIRECT PDF UPLOAD */
                <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/40"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                      }}
                      accept="application/pdf" 
                      className="hidden" 
                    />
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-6 h-6" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="font-bold text-slate-900 text-xs truncate max-w-xs mx-auto">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-1">Klik untuk mengganti file</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-800 text-xs">Pilih File PDF Sertifikat</p>
                        <p className="text-[11px] text-slate-400 mt-1">Maksimal 20MB (.pdf)</p>
                      </div>
                    )}
                  </div>

                  {/* Calibration & Expiration Dates */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Pada Tanggal (Kalibrasi)</label>
                      <input 
                        type="date"
                        value={calibratedAtInput}
                        onChange={(e) => setCalibratedAtInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Berlaku Hingga</label>
                      <input 
                        type="date"
                        value={validUntilInput}
                        onChange={(e) => setValidUntilInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {uploadingId && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Mengunggah...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={closeLinkModal}
                      disabled={!!uploadingId}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleModalFileUpload}
                      disabled={!selectedFile || !!uploadingId}
                      className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                    >
                      {uploadingId ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Mengunggah PDF ({uploadProgress}%)...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Unggah File PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Camera Scanner for quick physical sticker scanning */}
      <CameraQrScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={handleScanFromCamera}
      />
    </div>
  );
}
