import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  getPdfBlobUrl, 
  deleteCertificateFromLabel, 
  deleteLabelCompletely,
  deleteBatchLabels,
  deleteFolderCompletely,
  linkGoogleDriveToLabel,
  updateLabelDates,
  extractGoogleDriveFileId
} from '../lib/pdfStorage';
import { 
  Search, 
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
  Camera,
  Building2
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
  namaRs?: string | null;
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
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deletingFolder, setDeletingFolder] = useState(false);

  // Custom In-App Delete Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'folder' | 'label' | 'cert';
    target: any;
    title: string;
    description: string;
    confirmText: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // Modal State for Linking Certificate (Google Drive)
  const [activeModalLabel, setActiveModalLabel] = useState<any | null>(null);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [docNameInput, setDocNameInput] = useState('');
  const [namaRsInput, setNamaRsInput] = useState('');
  const [calibratedAtInput, setCalibratedAtInput] = useState('');
  const [validUntilInput, setValidUntilInput] = useState('');
  const [savingDrive, setSavingDrive] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Folder Hospital Name Editing State
  const [editingFolderRs, setEditingFolderRs] = useState<{ prefix: string; currentNamaRs: string } | null>(null);
  const [folderRsInput, setFolderRsInput] = useState('');
  const [savingFolderRs, setSavingFolderRs] = useState(false);
  const [folderRsError, setFolderRsError] = useState('');

  const openFolderRsModal = (prefix: string, currentNamaRs?: string | null) => {
    setEditingFolderRs({ prefix, currentNamaRs: currentNamaRs || '' });
    setFolderRsInput(currentNamaRs || '');
    setFolderRsError('');
  };

  const closeFolderRsModal = () => {
    setEditingFolderRs(null);
    setFolderRsInput('');
    setFolderRsError('');
  };

  const handleSaveFolderRs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolderRs) return;
    setSavingFolderRs(true);
    setFolderRsError('');
    try {
      const trimmed = folderRsInput.trim() || null;
      // 1. Update backend Cloud SQL
      const res = await fetch(`/api/folders/${editingFolderRs.prefix}/nama-rs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaRs: trimmed }),
      });
      if (!res.ok) {
        throw new Error('Gagal menyimpan ke server.');
      }

      // 2. Update local state immediately
      setLabels(prev => prev.map(l => {
        if (extractLabelPrefix(l.noLabel) === editingFolderRs.prefix) {
          return { ...l, namaRs: trimmed };
        }
        return l;
      }));

      // 3. Attempt to update Supabase asynchronously
      try {
        await supabase
          .from('labels')
          .update({ nama_rs: trimmed, updated_at: new Date().toISOString() })
          .like('no_label', `${editingFolderRs.prefix}.%`);
      } catch (sbErr) {
        console.warn('Supabase update non-fatal:', sbErr);
      }

      setSavingFolderRs(false);
      closeFolderRsModal();
    } catch (err: any) {
      console.error('Error saving folder RS:', err);
      setFolderRsError(err.message || 'Gagal menyimpan nama RS');
      setSavingFolderRs(false);
    }
  };

  const fetchLabels = useCallback(async () => {
    try {
      // 1. Fetch Cloud SQL / local API labels
      let apiMap: Record<string, any> = {};
      try {
        const res = await fetch('/api/labels');
        if (res.ok) {
          const apiData = await res.json();
          (apiData || []).forEach((d: any) => {
            const key = d.noLabel || d.no_label;
            if (key) apiMap[key] = d;
          });
        }
      } catch (apiErr) {
        console.warn('API labels fetch error:', apiErr);
      }

      // 2. Fetch Supabase labels
      const { data } = await supabase
        .from('labels')
        .select('*')
        .order('no_label', { ascending: true });

      if (data && data.length > 0) {
        const formatted = data.map((d: any) => {
          const local = apiMap[d.no_label] || {};
          return {
            id: d.no_label,
            noLabel: d.no_label,
            namaRs: d.nama_rs || d.namaRs || local.namaRs || local.nama_rs || null,
            status: d.status || local.status || 'Menunggu Sertifikat',
            pdfSource: d.pdf_source || local.pdfSource || null,
            pdfUrl: d.pdf_url || local.pdfUrl || null,
            pdfDriveUrl: d.pdf_drive_url || local.pdfDriveUrl || null,
            pdfOriginalUrl: d.pdforiginal_url || local.pdfOriginalUrl || null,
            pdfName: d.pdf_name || local.pdfName || null,
            calibratedAt: d.calibrated_at || local.calibratedAt || null,
            validUntil: d.valid_until || local.validUntil || null,
            createdAt: d.created_at || local.createdAt || null,
            updatedAt: d.updated_at || local.updatedAt || null,
          };
        });

        // Add any labels in apiMap that weren't in Supabase
        const existingNos = new Set(formatted.map(f => f.noLabel));
        Object.values(apiMap).forEach((item: any) => {
          const no = item.noLabel || item.no_label;
          if (no && !existingNos.has(no)) {
            formatted.push({
              id: no,
              noLabel: no,
              namaRs: item.namaRs || item.nama_rs || null,
              status: item.status || 'Menunggu Sertifikat',
              pdfSource: item.pdfSource || null,
              pdfUrl: item.pdfUrl || null,
              pdfDriveUrl: item.pdfDriveUrl || null,
              pdfOriginalUrl: item.pdfOriginalUrl || null,
              pdfName: item.pdfName || null,
              calibratedAt: item.calibratedAt || null,
              validUntil: item.validUntil || null,
              createdAt: item.createdAt || null,
              updatedAt: item.updatedAt || null,
            });
          }
        });

        setLabels(formatted);
      } else {
        const formatted = Object.values(apiMap).map((d: any) => ({
          id: d.noLabel,
          noLabel: d.noLabel,
          namaRs: d.namaRs || d.nama_rs || null,
          status: d.status,
          pdfSource: d.pdfSource,
          pdfUrl: d.pdfUrl,
          pdfDriveUrl: d.pdfDriveUrl,
          pdfOriginalUrl: d.pdfOriginalUrl,
          pdfName: d.pdfName,
          calibratedAt: d.calibratedAt,
          validUntil: d.validUntil,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }));
        setLabels(formatted);
      }
    } catch (err: any) {
      console.error('Error fetching labels:', err);
      setError('Gagal memuat daftar label.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();

    // Realtime Supabase updates
    const channel = supabase
      .channel('admin-labels-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels' }, () => {
        fetchLabels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLabels]);

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

      // Find hospital name associated with any label in this folder
      const namaRs = sortedItems.find(l => l.namaRs && l.namaRs.trim())?.namaRs || null;

      return {
        prefix,
        items: sortedItems,
        totalCount: sortedItems.length,
        certifiedCount,
        pendingCount: sortedItems.length - certifiedCount,
        minLabel: sortedItems[0]?.noLabel || prefix,
        maxLabel: sortedItems[sortedItems.length - 1]?.noLabel || prefix,
        namaRs,
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
      (folder.namaRs && folder.namaRs.toLowerCase().includes(q)) ||
      folder.items.some(item => 
        item.noLabel.toLowerCase().includes(q) || 
        (item.namaRs && item.namaRs.toLowerCase().includes(q))
      )
    );
  }, [folders, searchQuery]);

  // Filter items in active folder view
  const filteredFolderItems = useMemo(() => {
    if (!activeFolder) return [];
    if (!folderSearch.trim()) return activeFolder.items;
    const q = folderSearch.toLowerCase().trim();
    return activeFolder.items.filter(item => 
      item.noLabel.toLowerCase().includes(q) ||
      (item.namaRs && item.namaRs.toLowerCase().includes(q)) ||
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
    
    // Set dates and hospital name
    setNamaRsInput(label.namaRs || '');
    setCalibratedAtInput(label.calibratedAt || '');
    setValidUntilInput(label.validUntil || '');

    setDriveUrlInput(label.pdfOriginalUrl || label.pdfDriveUrl || (typeof label.pdfUrl === 'string' && label.pdfUrl.includes('drive.google.com') ? label.pdfUrl : ''));
    setDocNameInput(label.pdfName || '');
  };

  const closeLinkModal = () => {
    if (savingDrive) return;
    setActiveModalLabel(null);
    setModalError('');
    setDriveUrlInput('');
    setDocNameInput('');
    setNamaRsInput('');
    setCalibratedAtInput('');
    setValidUntilInput('');
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
        { calibratedAt: calibratedAtInput, validUntil: validUntilInput, namaRs: namaRsInput.trim() || undefined }
      );
      setLabels(prev => prev.map(l => l.id === activeModalLabel.id ? { 
        ...l, 
        namaRs: namaRsInput.trim() || l.namaRs,
        status: 'Sertifikat Tertaut',
        calibratedAt: calibratedAtInput,
        validUntil: validUntilInput,
        pdfName: docNameInput.trim() || l.pdfName,
        pdfSource: 'drive',
        pdfDriveUrl: trimmedUrl
      } : l));
      setSavingDrive(false);
      closeLinkModal();
    } catch (err: any) {
      console.error("Error saving Google Drive link:", err);
      setModalError(err.message || 'Gagal menyimpan link Google Drive.');
      setSavingDrive(false);
    }
  };

  const handleSaveDatesOnly = async () => {
    if (!activeModalLabel) return;
    setSavingDrive(true);
    setModalError('');
    try {
      await updateLabelDates(activeModalLabel.id, calibratedAtInput, validUntilInput, namaRsInput.trim() || undefined);
      setLabels(prev => prev.map(l => l.id === activeModalLabel.id ? { 
        ...l, 
        namaRs: namaRsInput.trim() || l.namaRs,
        calibratedAt: calibratedAtInput,
        validUntil: validUntilInput
      } : l));
      setSavingDrive(false);
      closeLinkModal();
    } catch (err: any) {
      console.error("Error updating dates:", err);
      setModalError('Gagal memperbarui data: ' + (err.message || ''));
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

  const promptDeleteCert = (label: any) => {
    setDeleteError('');
    setConfirmDelete({
      type: 'cert',
      target: label,
      title: `Lepas Sertifikat Label ${label.noLabel}?`,
      description: `Apakah Anda yakin ingin melepas tautan Google Drive / sertifikat dari label ${label.noLabel}? Status label akan kembali menjadi 'Menunggu Sertifikat'.`,
      confirmText: 'Lepas Sertifikat'
    });
  };

  const promptDeleteLabel = (label: any) => {
    setDeleteError('');
    setConfirmDelete({
      type: 'label',
      target: label,
      title: `Hapus Label ${label.noLabel}?`,
      description: `Apakah Anda yakin ingin menghapus label ${label.noLabel} sepenuhnya dari sistem? Tindakan ini permanen dan tidak dapat dibatalkan.`,
      confirmText: `Hapus Label ${label.noLabel}`
    });
  };

  const promptDeleteEntireFolder = (folder: FolderGroup) => {
    setDeleteError('');
    setConfirmDelete({
      type: 'folder',
      target: folder,
      title: `Hapus Seluruh Folder ${folder.prefix}?`,
      description: `Apakah Anda yakin ingin menghapus Folder ${folder.prefix} dan seluruh ${folder.totalCount} label (${folder.minLabel} s/d ${folder.maxLabel}) di dalamnya? Tindakan ini permanen dan data tidak dapat dipulihkan.`,
      confirmText: `Hapus Folder (${folder.totalCount} File)`
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      if (confirmDelete.type === 'folder') {
        const folder: FolderGroup = confirmDelete.target;
        const idsToDelete = folder.items.map(i => i.noLabel || i.id);
        const previousLabels = [...labels];

        // Optimistic remove from UI state
        setLabels(prev => prev.filter(l => !idsToDelete.includes(l.noLabel) && !idsToDelete.includes(l.id)));

        try {
          await deleteFolderCompletely(folder.prefix, idsToDelete);
          if (activePrefix === folder.prefix) {
            closeFolder();
          }
          setConfirmDelete(null);
        } catch (err: any) {
          console.error("Delete folder error:", err);
          setLabels(previousLabels);
          throw err;
        }
      } else if (confirmDelete.type === 'label') {
        const label = confirmDelete.target;
        const targetId = label.noLabel || label.id;
        const previousLabels = [...labels];

        setLabels(prev => prev.filter(l => l.id !== label.id && l.noLabel !== label.noLabel));

        try {
          await deleteLabelCompletely(targetId);
          setConfirmDelete(null);
        } catch (err: any) {
          console.error("Delete label error:", err);
          setLabels(previousLabels);
          throw err;
        }
      } else if (confirmDelete.type === 'cert') {
        const label = confirmDelete.target;
        const targetId = label.noLabel || label.id;

        setLabels(prev => prev.map(l => (l.id === label.id || l.noLabel === label.noLabel) ? { 
          ...l, 
          status: 'Menunggu Sertifikat', 
          hasPdf: false, 
          pdfUrl: null, 
          pdfDriveUrl: null, 
          pdfSource: null,
          pdfName: null,
          pdfOriginalUrl: null,
          calibratedAt: null,
          validUntil: null
        } : l));

        await deleteCertificateFromLabel(targetId);
        setConfirmDelete(null);
      }
    } catch (err: any) {
      console.error("Execution delete failed:", err);
      setDeleteError(err.message || 'Gagal menghapus. Silakan coba kembali.');
    } finally {
      setIsDeleting(false);
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

                      {/* Nama RS under Folder */}
                      <div className="mt-1.5 flex items-center justify-between gap-1.5 bg-slate-50 group-hover:bg-amber-50/60 p-2 rounded-xl border border-slate-100 group-hover:border-amber-200 transition-colors">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 truncate">
                          <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate" title={folder.namaRs || 'Nama RS belum diisi'}>
                            {folder.namaRs ? (
                              <span className="text-slate-900 font-bold">{folder.namaRs}</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Belum Ada Nama RS</span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFolderRsModal(folder.prefix, folder.namaRs);
                          }}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors shrink-0"
                          title="Atur / Ubah Nama RS untuk folder ini"
                        >
                          {folder.namaRs ? 'Ubah' : '+ Set RS'}
                        </button>
                      </div>

                      {/* Label Range */}
                      <p className="text-xs text-slate-500 font-mono mt-2 flex items-center">
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
                            promptDeleteEntireFolder(folder);
                          }}
                          disabled={isDeleting}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                          title={`Hapus Seluruh Folder ${folder.prefix}`}
                        >
                          <Trash2 className="w-4 h-4" />
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
                {/* Nama RS in Active Folder View */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Rumah Sakit:</span>
                    {activeFolder.namaRs ? (
                      <span className="font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                        {activeFolder.namaRs}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Belum Diisi</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openFolderRsModal(activeFolder.prefix, activeFolder.namaRs)}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors"
                  >
                    {activeFolder.namaRs ? 'Ubah RS' : '+ Set Nama RS'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Rentang Nomor: <span className="font-bold text-slate-700">{activeFolder.minLabel}</span> sampai <span className="font-bold text-slate-700">{activeFolder.maxLabel}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => promptDeleteEntireFolder(activeFolder)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
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
                    <th className="px-6 py-4">Rumah Sakit</th>
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
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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
                            {label.namaRs ? (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                                <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>{label.namaRs}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">-</span>
                            )}
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
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                type="button"
                                onClick={() => openLinkModal(label)}
                                className={cn(
                                  "inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm",
                                  hasCertificate
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                )}
                                title={hasCertificate ? "Ubah Link Google Drive Sertifikat" : "Tautkan Link Google Drive Sertifikat"}
                              >
                                <Link2 className="w-3.5 h-3.5 mr-1" />
                                {hasCertificate ? 'Ubah Link' : 'Tautkan Link'}
                              </button>
                              {hasCertificate && (
                                <button 
                                  type="button"
                                  onClick={() => promptDeleteCert(label)}
                                  className="inline-flex items-center px-2 py-1.5 text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                  title="Lepas / Hapus Sertifikat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button 
                                type="button"
                                onClick={() => promptDeleteLabel(label)}
                                className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Label Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* Modal: Tautkan Sertifikat (Link Google Drive) */}
      {activeModalLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-blue-600" />
                  Tautkan Sertifikat (Google Drive)
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Nomor Label: <span className="font-bold text-slate-900">{activeModalLabel.noLabel}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={closeLinkModal}
                disabled={savingDrive}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    Nama RS / Rumah Sakit <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={namaRsInput}
                    onChange={(e) => setNamaRsInput(e.target.value)}
                    placeholder="Contoh: RSUD Dr. Soetomo Surabaya"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
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
            </div>

          </div>
        </div>
      )}

      {/* Modal for Editing Folder Hospital Name (Nama RS) */}
      {editingFolderRs && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Atur Nama RS Folder {editingFolderRs.prefix}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nama RS akan diterapkan ke semua label dalam folder {editingFolderRs.prefix}.*
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={closeFolderRsModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFolderRs} className="mt-5 space-y-4">
              {folderRsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{folderRsError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama RS / Rumah Sakit
                </label>
                <input 
                  type="text" 
                  value={folderRsInput}
                  onChange={(e) => setFolderRsInput(e.target.value)}
                  placeholder="Contoh: RSUD Dr. Soetomo Surabaya"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Kosongkan jika ingin menghapus nama RS dari folder ini.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeFolderRsModal}
                  disabled={savingFolderRs}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingFolderRs}
                  className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingFolderRs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan Nama RS
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus (In-App Confirm Modal) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {confirmDelete.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {confirmDelete.description}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setConfirmDelete(null);
                  setDeleteError('');
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {confirmDelete.confirmText}
                  </>
                )}
              </button>
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
