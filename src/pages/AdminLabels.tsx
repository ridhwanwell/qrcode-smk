import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
import { fetchFolderRsFromSupabase, saveFolderRsToSupabase, upsertLabelsToSupabase } from '../lib/supabaseSync';
import { apiFetch } from '../lib/apiClient';
import { INITIAL_HOSPITALS } from '../data/mockData';
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
  Building2,
  Pencil,
  RefreshCw,
  FilePlus2,
  Ban,
  Undo2,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';
import CameraQrScanner from '../components/CameraQrScanner';
import { readCertificateFromDrive, CertificateInfo } from '../utils/certificatePdfReader';
import { BulkCertificateLinkModal } from '../components/BulkCertificateLinkModal';

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
  const [labels, setLabels] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('smk_labels');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [labelsLoadError, setLabelsLoadError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Navigation & Search State
  const [selectedFolderPrefix, setSelectedFolderPrefix] = useState<string | null>(searchParams.get('folder') || null);
  const activePrefix = selectedFolderPrefix ?? searchParams.get('folder');
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
  const [ruanganInput, setRuanganInput] = useState('');
  const [calibratedAtInput, setCalibratedAtInput] = useState('');
  const [validUntilInput, setValidUntilInput] = useState('');
  const [savingDrive, setSavingDrive] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showBulkLink, setShowBulkLink] = useState(false);

  // Baca otomatis isi sertifikat dari link Google Drive (Nama Alat, Ruangan, Tanggal)
  const [certRead, setCertRead] = useState<{
    status: 'idle' | 'reading' | 'done' | 'error';
    fileId: string;
    info?: CertificateInfo;
    error?: string;
  }>({ status: 'idle', fileId: '' });

  // State for Editing Folder Hospital Name
  const [editingFolderRs, setEditingFolderRs] = useState<{ prefix: string; currentNamaRs: string } | null>(null);
  const [folderRsInput, setFolderRsInput] = useState('');
  const [savingFolderRs, setSavingFolderRs] = useState(false);

  // Folder Hospital Name Map
  const [folderRsMap, setFolderRsMap] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('smk_folder_nama_rs_map') || '{}');
    } catch {
      return {};
    }
  });

  const handleSaveFolderRs = async () => {
    if (!editingFolderRs) return;
    setSavingFolderRs(true);
    const prefix = editingFolderRs.prefix;
    const val = folderRsInput.trim();

    try {
      const res = await apiFetch(`/api/folders/${encodeURIComponent(prefix)}/rename-rs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaRs: val || null })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memperbarui nama Rumah Sakit');
      }

      const map = { ...folderRsMap };
      if (val) {
        map[prefix] = val;
      } else {
        delete map[prefix];
      }
      setFolderRsMap(map);
      try {
        localStorage.setItem('smk_folder_nama_rs_map', JSON.stringify(map));
      } catch (_) {}

      setLabels(prev => prev.map(lbl => {
        if (extractLabelPrefix(lbl.noLabel) === prefix) {
          return { ...lbl, namaRs: val || null };
        }
        return lbl;
      }));

      // Update local storage labels cache as well
      try {
        const rawLocal = localStorage.getItem('smk_labels');
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          if (Array.isArray(list)) {
            const updated = list.map((l: any) => {
              if (extractLabelPrefix(l.noLabel || l.no_label) === prefix) {
                return { ...l, namaRs: val || null, nama_rs: val || null };
              }
              return l;
            });
            localStorage.setItem('smk_labels', JSON.stringify(updated));
          }
        }
      } catch (_) {}

      setEditingFolderRs(null);
    } catch (err: any) {
      console.error("Ganti nama RS folder error:", err);
      setError(err?.message || 'Gagal memperbarui nama Rumah Sakit.');
    } finally {
      setSavingFolderRs(false);
    }
  };

  const fetchLabels = useCallback(async () => {
    try {
      // 1. Fetch labels from backend (/api/labels) and folder metadata from /api/folders/nama-rs
      let rawApiLabels: any[] | null = null;
      let apiFolderRes: Record<string, string> = {};

      const [apiRes, apiFolderResult] = await Promise.all([
        apiFetch('/api/labels')
          .then(async (r) => {
            if (r.ok) {
              const data = await r.json();
              return Array.isArray(data) ? data : null;
            }
            return null;
          })
          .catch(() => null),
        apiFetch('/api/folders/nama-rs')
          .then(r => r.ok ? r.json() : {})
          .catch(() => ({}))
      ]);

      rawApiLabels = apiRes;
      apiFolderRes = apiFolderResult || {};

      let cachedLabels: any[] = [];
      try {
        const rawCache = localStorage.getItem('smk_labels');
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (Array.isArray(parsed)) cachedLabels = parsed;
        }
      } catch (_) {}

      // Kondisi b: GAGAL (res.ok false, error jaringan, timeout, atau respons bukan array)
      if (!rawApiLabels) {
        setLabelsLoadError('Gagal memuat semua label dari server. Data yang tampil mungkin belum terbaru.');
        console.warn('[AdminLabels] Gagal mengambil data label dari server API');
        if (labels.length === 0 && cachedLabels.length > 0) {
          setLabels(cachedLabels);
        }
        return;
      }

      // Kondisi c: SERVER MENGEMBALIKAN ARRAY KOSONG padahal cache 'smk_labels' berisi lebih dari 0 label
      if (rawApiLabels.length === 0 && cachedLabels.length > 0) {
        setLabelsLoadError('Gagal memuat semua label dari server. Data yang tampil mungkin belum terbaru.');
        console.warn('[AdminLabels] Server mengembalikan 0 label padahal cache berisi', cachedLabels.length, 'label');
        if (labels.length === 0) {
          setLabels(cachedLabels);
        }
        return;
      }

      // Pengaman jumlah: jika jumlah label dari server LEBIH SEDIKIT dari 50% jumlah di cache 'smk_labels'
      const isCountSuspicious = cachedLabels.length > 0 && rawApiLabels.length < (cachedLabels.length * 0.5);
      if (isCountSuspicious) {
        setLabelsLoadError('Jumlah label dari server jauh lebih sedikit dari biasanya, periksa koneksi lalu muat ulang.');
        console.warn('[AdminLabels] Jumlah label dari server jauh lebih sedikit dari biasanya:', rawApiLabels.length, 'vs cache:', cachedLabels.length);
      } else {
        // Kondisi a: BERHASIL normal
        setLabelsLoadError(null);
      }

      const mergedFolderMap = {
        ...folderRsMap,
        ...apiFolderRes
      };
      setFolderRsMap(mergedFolderMap);
      try {
        localStorage.setItem('smk_folder_nama_rs_map', JSON.stringify(mergedFolderMap));
      } catch (_) {}

      // Tombstone sets to guarantee deleted folders and labels never resurrect
      const deletedFolders = new Set<string>(JSON.parse(localStorage.getItem('smk_deleted_folders') || '[]'));
      const deletedLabels = new Set<string>(JSON.parse(localStorage.getItem('smk_deleted_labels') || '[]'));

      const formatted: any[] = [];

      // Format API data (which is paginated and holds all 1395+ labels)
      rawApiLabels.forEach((d: any) => {
        const no = d.noLabel || d.no_label || d.id;
        if (!no || no.startsWith('__meta_') || no.startsWith('__aset_') || no.startsWith('__item_') || no.startsWith('__tombstone_')) return;
        const prefix = extractLabelPrefix(no);
        if (deletedFolders.has(prefix) || deletedLabels.has(no)) return;

        formatted.push({
          id: no,
          noLabel: no,
          namaRs: d.namaRs || d.nama_rs || mergedFolderMap[prefix] || null,
          namaAlat: d.namaAlat || d.nama_alat || d.pdfName || d.pdf_name || null,
          ruangan: d.ruangan || null,
          status: d.status || 'Menunggu Sertifikat',
          pdfSource: d.pdfSource || d.pdf_source || null,
          pdfUrl: d.pdfUrl || d.pdf_url || null,
          pdfDriveUrl: d.pdfDriveUrl || d.pdf_drive_url || null,
          pdfOriginalUrl: d.pdfOriginalUrl || d.pdforiginal_url || null,
          pdfName: d.pdfName || d.pdf_name || null,
          calibratedAt: d.calibratedAt || d.calibrated_at || null,
          validUntil: d.validUntil || d.valid_until || null,
          verifyCode: d.verifyCode || d.verify_code || null,
          qrSecured: d.qrSecured === true || d.qr_secured === true,
          voidReason: d.voidReason || d.void_reason || null,
          voidedAt: d.voidedAt || d.voided_at || null,
          createdAt: d.createdAt || d.created_at || null,
          updatedAt: d.updatedAt || d.updated_at || null,
        });
      });

      setLabels(formatted);

      // Only write to localStorage cache if NOT suspicious and NOT failed
      if (!isCountSuspicious) {
        try {
          localStorage.setItem('smk_labels', JSON.stringify(formatted));
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Error fetching labels:', err);
      setLabelsLoadError('Gagal memuat semua label dari server. Data yang tampil mungkin belum terbaru.');
    } finally {
      setLoading(false);
    }
  }, [folderRsMap, labels.length]);

  useEffect(() => {
    fetchLabels();

    // Polling every 5 seconds to ensure instant data synchronization across all office PCs/laptops
    const syncInterval = setInterval(() => {
      fetchLabels();
    }, 5000);

    // Listen to broadcast events on labels channel
    const channelId = `admin_labels_bc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let channel: any = null;
    try {
      channel = supabase
        .channel(channelId)
        .on('broadcast', { event: 'labels_changed' }, () => {
          fetchLabels();
        })
        .subscribe();
    } catch (err) {
      console.warn('[AdminLabels] Realtime broadcast error:', err);
    }

    return () => {
      clearInterval(syncInterval);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
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

      // Find hospital name associated with folder (from folderRsMap or any label in this folder)
      const namaRs = (folderRsMap[prefix] && folderRsMap[prefix].trim())
        || sortedItems.find(l => l.namaRs && l.namaRs.trim())?.namaRs 
        || null;

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
  }, [labels, folderRsMap]);

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
    setSelectedFolderPrefix(prefix);
    try {
      setSearchParams({ folder: prefix }, { replace: true });
    } catch (_) {}
    setFolderSearch('');
  };

  const closeFolder = () => {
    setSelectedFolderPrefix(null);
    try {
      setSearchParams({}, { replace: true });
    } catch (_) {}
    setFolderSearch('');
  };

  const openLinkModal = (label: any) => {
    setActiveModalLabel(label);
    setModalError('');
    
    // Set dates
    setCalibratedAtInput(label.calibratedAt || '');
    setValidUntilInput(label.validUntil || '');

    const existingUrl = label.pdfOriginalUrl || label.pdfDriveUrl || (typeof label.pdfUrl === 'string' && label.pdfUrl.includes('drive.google.com') ? label.pdfUrl : '');
    setDriveUrlInput(existingUrl);
    setDocNameInput(label.namaAlat || label.pdfName || '');
    setRuanganInput(label.ruangan || '');
    // Link lama tidak dibaca ulang otomatis agar isian yang sudah ada tidak tertimpa
    setCertRead({ status: 'idle', fileId: extractGoogleDriveFileId(existingUrl) || '' });
  };

  const closeLinkModal = () => {
    if (savingDrive) return;
    setActiveModalLabel(null);
    setModalError('');
    setDriveUrlInput('');
    setDocNameInput('');
    setRuanganInput('');
    setCalibratedAtInput('');
    setValidUntilInput('');
    setCertRead({ status: 'idle', fileId: '' });
  };

  /** Ambil PDF sertifikat dari Drive lalu isi otomatis Nama Alat, Ruangan, dan tanggal. */
  const readCertificate = useCallback(async (fileId: string) => {
    setCertRead({ status: 'reading', fileId });
    try {
      const info = await readCertificateFromDrive(fileId);
      setCertRead(prev => (prev.fileId === fileId ? { status: 'done', fileId, info } : prev));
      if (info.namaAlat) setDocNameInput(info.namaAlat);
      if (info.ruangan) setRuanganInput(info.ruangan);
      if (info.tanggalKalibrasi) setCalibratedAtInput(info.tanggalKalibrasi);
      if (info.kalibrasiUlang) setValidUntilInput(info.kalibrasiUlang);
    } catch (err: any) {
      setCertRead(prev => (prev.fileId === fileId
        ? { status: 'error', fileId, error: err?.message || 'Gagal membaca sertifikat' }
        : prev));
    }
  }, []);

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
        { 
          calibratedAt: calibratedAtInput, 
          validUntil: validUntilInput,
          namaAlat: docNameInput.trim(),
          ruangan: ruanganInput.trim()
        }
      );
      setLabels(prev => prev.map(l => l.id === activeModalLabel.id ? { 
        ...l, 
        status: 'Sertifikat Tertaut',
        calibratedAt: calibratedAtInput,
        validUntil: validUntilInput,
        pdfName: docNameInput.trim() || l.pdfName,
        namaAlat: docNameInput.trim() || l.namaAlat,
        ruangan: ruanganInput.trim() || l.ruangan,
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
      await updateLabelDates(activeModalLabel.id, calibratedAtInput, validUntilInput, {
        namaAlat: docNameInput.trim(),
        ruangan: ruanganInput.trim()
      });
      setLabels(prev => prev.map(l => l.id === activeModalLabel.id ? { 
        ...l, 
        calibratedAt: calibratedAtInput,
        validUntil: validUntilInput,
        pdfName: docNameInput.trim() || l.pdfName,
        namaAlat: docNameInput.trim() || l.namaAlat,
        ruangan: ruanganInput.trim() || l.ruangan
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
        setLabels(prev => prev.filter(l => extractLabelPrefix(l.noLabel) !== folder.prefix && !idsToDelete.includes(l.noLabel) && !idsToDelete.includes(l.id)));
        setFolderRsMap(prev => {
          const next = { ...prev };
          delete next[folder.prefix];
          return next;
        });

        // Synchronously purge localStorage so no background interval can resurrect it
        try {
          const rawLocal = localStorage.getItem('smk_labels');
          if (rawLocal) {
            const list = JSON.parse(rawLocal);
            const remaining = list.filter((it: any) => {
              const no = it.noLabel || it.no_label || it.id || '';
              return extractLabelPrefix(no) !== folder.prefix && !idsToDelete.includes(no) && !idsToDelete.includes(it.id);
            });
            localStorage.setItem('smk_labels', JSON.stringify(remaining));
          }

          const map = JSON.parse(localStorage.getItem('smk_folder_nama_rs_map') || '{}');
          delete map[folder.prefix];
          localStorage.setItem('smk_folder_nama_rs_map', JSON.stringify(map));

          const delF = JSON.parse(localStorage.getItem('smk_deleted_folders') || '[]');
          if (!delF.includes(folder.prefix)) {
            delF.push(folder.prefix);
            localStorage.setItem('smk_deleted_folders', JSON.stringify(delF));
          }
        } catch (_) {}

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

        // Synchronously purge localStorage
        try {
          const rawLocal = localStorage.getItem('smk_labels');
          if (rawLocal) {
            const list = JSON.parse(rawLocal);
            const remaining = list.filter((it: any) => {
              const no = it.noLabel || it.no_label || it.id || '';
              return no !== targetId && it.id !== targetId;
            });
            localStorage.setItem('smk_labels', JSON.stringify(remaining));
          }

          const delL = JSON.parse(localStorage.getItem('smk_deleted_labels') || '[]');
          if (!delL.includes(targetId)) {
            delL.push(targetId);
            localStorage.setItem('smk_deleted_labels', JSON.stringify(delL));
          }
        } catch (_) {}

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

  // Tautan scan publik + kode verifikasi (wajib untuk label baru)
  const scanPath = (label: { noLabel: string; verifyCode?: string | null }) =>
    `/sertifikat/${label.noLabel}${label.verifyCode ? `?k=${label.verifyCode}` : ''}`;

  // Tandai / batalkan status Void (stiker rusak, hilang, salah tempel)
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const handleToggleVoid = async (label: any) => {
    const isVoid = label.status === 'Void / Rusak';
    let reason = '';
    if (!isVoid) {
      reason = (window.prompt(
        `Tandai label ${label.noLabel} sebagai VOID / RUSAK?\n\nNomor tetap tercatat untuk audit, dan halaman scan akan menampilkan "Label Tidak Berlaku".\n\nTulis alasannya (contoh: rusak saat cetak, hilang, salah tempel):`
      ) || '').trim();
      if (!reason) return;
    } else if (!window.confirm(`Batalkan status Void untuk label ${label.noLabel}?`)) {
      return;
    }
    setVoidingId(label.noLabel);
    try {
      const res = await apiFetch(`/api/labels/${encodeURIComponent(label.noLabel)}/${isVoid ? 'unvoid' : 'void'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal mengubah status void');
      }
      await fetchLabels();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status void');
    } finally {
      setVoidingId(null);
    }
  };

  const handleCopyScanLink = (label: { noLabel: string; verifyCode?: string | null }) => {
    const noLabel = label.noLabel;
    let base = window.location.origin;
    if (base.includes('ais-dev-')) {
      base = base.replace('ais-dev-', 'ais-pre-');
    }
    const url = `${base}${scanPath(label)}`;
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

  // Link baru ditempel -> baca sertifikat otomatis (jeda singkat supaya tidak membaca saat masih mengetik)
  useEffect(() => {
    if (!activeModalLabel || !driveIdDetected || driveIdDetected === certRead.fileId) return;
    const t = setTimeout(() => readCertificate(driveIdDetected), 600);
    return () => clearTimeout(t);
  }, [activeModalLabel, driveIdDetected, certRead.fileId, readCertificate]);

  const normalizeText = (v?: string | null) => (v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
          <Link
            to="/admin/generate"
            className={cn(
              "px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0",
              labelsLoadError && "opacity-50 pointer-events-none cursor-not-allowed"
            )}
            title={labelsLoadError ? "Muat ulang data dulu sebelum menghapus atau membuat label" : "Generate Label Baru"}
            onClick={(e) => {
              if (labelsLoadError) e.preventDefault();
            }}
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Generate Label Baru</span>
          </Link>

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

      {/* Banner Peringatan Gagal Muat / Data Tidak Lengkap */}
      {labelsLoadError && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{labelsLoadError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchLabels()}
            disabled={loading}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Muat Ulang</span>
          </button>
        </div>
      )}

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

                      {/* Hospital Name (if set) */}
                      <div className="mt-1 flex items-center justify-between text-xs">
                        {folder.namaRs ? (
                          <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md truncate max-w-[170px]" title={folder.namaRs}>
                            <Building2 className="w-3 h-3 inline mr-1 text-amber-600" />
                            {folder.namaRs}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-300" />
                            Tanpa RS
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderRs({ prefix: folder.prefix, currentNamaRs: folder.namaRs || '' });
                            setFolderRsInput(folder.namaRs || '');
                          }}
                          className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors ml-1"
                          title="Ubah / Set Nama Rumah Sakit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Label Range */}
                      <p className="text-xs text-slate-500 font-mono mt-1.5 flex items-center">
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
                            if (labelsLoadError) return;
                            promptDeleteEntireFolder(folder);
                          }}
                          disabled={isDeleting || !!labelsLoadError}
                          className={cn(
                            "text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors flex items-center justify-center",
                            labelsLoadError && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-400"
                          )}
                          title={labelsLoadError ? "Muat ulang data dulu sebelum menghapus atau membuat label" : `Hapus Seluruh Folder ${folder.prefix}`}
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
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    RS / Instansi: <strong className="text-slate-900">{activeFolder.namaRs || 'Belum diatur (Tanpa RS)'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolderRs({ prefix: activeFolder.prefix, currentNamaRs: activeFolder.namaRs || '' });
                      setFolderRsInput(activeFolder.namaRs || '');
                    }}
                    className="text-xs text-amber-600 hover:text-amber-800 font-semibold underline flex items-center gap-1 ml-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Ubah RS
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Rentang Nomor: <span className="font-bold text-slate-700">{activeFolder.minLabel}</span> sampai <span className="font-bold text-slate-700">{activeFolder.maxLabel}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowBulkLink(true)}
                disabled={!!labelsLoadError}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                title="Tempel 1 link folder Google Drive berisi sertifikat; semua otomatis dicocokkan ke nomor label"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Tautkan Sertifikat Massal</span>
              </button>
              <Link
                to={`/admin/generate?folder=${activeFolder.prefix}`}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm",
                  labelsLoadError && "opacity-50 pointer-events-none cursor-not-allowed"
                )}
                title={labelsLoadError ? "Muat ulang data dulu sebelum menghapus atau membuat label" : "Generate Label di Folder Ini"}
                onClick={(e) => {
                  if (labelsLoadError) e.preventDefault();
                }}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Generate Label Baru</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (labelsLoadError) return;
                  promptDeleteEntireFolder(activeFolder);
                }}
                disabled={isDeleting || !!labelsLoadError}
                className={cn(
                  "px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm",
                  labelsLoadError && "opacity-50 cursor-not-allowed hover:bg-rose-50 hover:text-rose-700"
                )}
                title={labelsLoadError ? "Muat ulang data dulu sebelum menghapus atau membuat label" : "Hapus seluruh file di folder ini"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Folder ({activeFolder.totalCount} File)
              </button>
            </div>
          </div>

          {/* Ringkasan status stiker di folder ini (untuk audit) */}
          {(() => {
            const items = activeFolder.items || [];
            const isVoidItem = (l: any) => l.status === 'Void / Rusak';
            const isCertItem = (l: any) => !isVoidItem(l) && (l.status === 'Sertifikat Tertaut' || l.hasPdf || !!l.pdfUrl || l.pdfSource === 'drive' || !!l.pdfDriveUrl);
            const voidCount = items.filter(isVoidItem).length;
            const certCount = items.filter(isCertItem).length;
            const waitCount = items.length - voidCount - certCount;
            const securedCount = items.filter((l: any) => l.qrSecured).length;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Sertifikat Tertaut</p>
                  <p className="font-black text-emerald-900 text-base">{certCount}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-amber-700 uppercase">Belum Tertaut</p>
                  <p className="font-black text-amber-900 text-base">{waitCount}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-rose-700 uppercase">Void / Rusak</p>
                  <p className="font-black text-rose-900 text-base">{voidCount}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" title="Jumlah stiker yang QR-nya wajib memakai kode verifikasi">
                  <p className="text-[10px] font-bold text-slate-600 uppercase">QR Berkode</p>
                  <p className="font-black text-slate-900 text-base">{securedCount} / {items.length}</p>
                </div>
              </div>
            );
          })()}

          {/* Table of Files inside Active Folder */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap">Nomor Label</th>
                    <th className="px-3 py-3 whitespace-nowrap">Rumah Sakit</th>
                    <th className="px-3 py-3 whitespace-nowrap">Status</th>
                    <th className="px-3 py-3">Dokumen Sertifikat</th>
                    <th className="px-2.5 py-3 whitespace-nowrap">Kalibrasi</th>
                    <th className="px-2.5 py-3 whitespace-nowrap">Expired</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFolderItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        {folderSearch ? `Tidak ada label yang cocok dengan "${folderSearch}" di folder ini.` : 'Folder ini kosong.'}
                      </td>
                    </tr>
                  ) : (
                    filteredFolderItems.map((label) => {
                      const isDrive = label.pdfSource === 'drive' || !!label.pdfDriveUrl;
                      const hasCertificate = label.status === 'Sertifikat Tertaut' || label.hasPdf || !!label.pdfUrl || isDrive;

                      return (
                        <tr key={label.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 font-mono text-xs flex items-center gap-1.5">
                              {label.noLabel}
                              {label.verifyCode && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] font-semibold border",
                                    label.qrSecured ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
                                  )}
                                  title={label.qrSecured
                                    ? "Kode verifikasi QR (wajib untuk membuka sertifikat)"
                                    : "Kode verifikasi QR. Stiker lama: sertifikat tetap bisa dibuka tanpa kode."}
                                >
                                  {label.qrSecured && <ShieldCheck className="w-2.5 h-2.5" />}
                                  {label.verifyCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <button
                                type="button"
                                onClick={() => window.open(scanPath(label), '_blank')}
                                className="inline-flex items-center text-[10px] text-amber-600 hover:text-amber-800 font-medium hover:underline"
                                title="Buka halaman verifikasi scan publik"
                              >
                                <ExternalLink className="w-2.5 h-2.5 mr-0.5" /> Tes Scan
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => handleCopyScanLink(label)}
                                className="inline-flex items-center text-[10px] text-slate-500 hover:text-slate-800"
                                title="Salin tautan scan"
                              >
                                {copiedId === label.noLabel ? (
                                  <span className="text-emerald-600 font-semibold flex items-center">
                                    <Check className="w-2.5 h-2.5 mr-0.5" /> Tersalin
                                  </span>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 mr-0.5" /> Salin Link
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            {label.namaRs ? (
                              <div className="flex items-center gap-1 text-xs font-medium text-slate-800 max-w-[130px] truncate" title={label.namaRs}>
                                <Building2 className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="truncate">{label.namaRs}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {label.status === 'Void / Rusak' ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70"
                                title={label.voidReason ? `Alasan: ${label.voidReason}` : 'Label dibatalkan'}
                              >
                                <Ban className="w-3 h-3 mr-1" /> Void / Rusak
                              </span>
                            ) : (
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
                              hasCertificate 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" 
                                : "bg-amber-50 text-amber-700 border border-amber-200/60"
                            )}>
                              {hasCertificate ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              {hasCertificate ? 'Sertifikat Tertaut' : 'Menunggu Sertifikat'}
                            </span>
                            )}
                            {label.status === 'Void / Rusak' && label.voidReason && (
                              <div className="text-[10px] text-rose-600 mt-0.5 max-w-[150px] truncate" title={label.voidReason}>{label.voidReason}</div>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            {hasCertificate ? (
                              <div className="flex flex-col gap-0.5 max-w-[180px]">
                                <button 
                                  onClick={() => handleViewPdf(label)}
                                  disabled={viewingId === label.id}
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium hover:underline disabled:opacity-50 text-left text-xs truncate"
                                >
                                  {viewingId === label.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin shrink-0" />
                                      <span className="truncate">Membuka...</span>
                                    </>
                                  ) : isDrive ? (
                                    <>
                                      <Globe className="w-3 h-3 mr-1 text-blue-500 shrink-0" />
                                      <span className="truncate" title={label.pdfName || 'Google Drive'}>
                                        {label.pdfName || 'Link Google Drive'}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-3 h-3 mr-1 text-emerald-500 shrink-0" /> 
                                      <span className="truncate" title={label.pdfName || 'File PDF'}>
                                        {label.pdfName || 'Lihat PDF'}
                                      </span>
                                    </>
                                  )}
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono truncate">
                                  {isDrive ? 'Sumber: Google Drive Link' : (label.pdfSize ? `${(label.pdfSize / 1024).toFixed(0)} KB` : 'File')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Belum ada sertifikat</span>
                            )}
                          </td>

                          <td className="px-2.5 py-2.5 text-slate-600 text-[11px] font-mono whitespace-nowrap">
                            {label.calibratedAt || '-'}
                          </td>

                          <td className="px-2.5 py-2.5 text-slate-600 text-[11px] font-mono whitespace-nowrap">
                            {label.validUntil || '-'}
                          </td>

                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                type="button"
                                onClick={() => openLinkModal(label)}
                                className={cn(
                                  "inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap",
                                  hasCertificate
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                )}
                                title={hasCertificate ? "Ubah Link Google Drive Sertifikat" : "Tautkan Link Google Drive Sertifikat"}
                              >
                                <Link2 className="w-3 h-3 mr-1 shrink-0" />
                                {hasCertificate ? 'Ubah Link' : 'Tautkan Link'}
                              </button>
                              {hasCertificate && (
                                <button 
                                  type="button"
                                  onClick={() => promptDeleteCert(label)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Lepas / Hapus Sertifikat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleVoid(label)}
                                disabled={voidingId === label.noLabel}
                                className={cn(
                                  "p-1 rounded-md transition-colors disabled:opacity-50",
                                  label.status === 'Void / Rusak'
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                                )}
                                title={label.status === 'Void / Rusak' ? 'Batalkan status Void' : 'Tandai Void / Rusak (stiker rusak, hilang, salah tempel)'}
                              >
                                {voidingId === label.noLabel
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : label.status === 'Void / Rusak' ? <Undo2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  if (labelsLoadError) return;
                                  promptDeleteLabel(label);
                                }}
                                disabled={!!labelsLoadError}
                                className={cn(
                                  "p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors",
                                  labelsLoadError && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-400"
                                )}
                                title={labelsLoadError ? "Muat ulang data dulu sebelum menghapus atau membuat label" : "Hapus Label Ini"}
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

      {/* Modal: Tautkan Sertifikat Massal (folder Google Drive) */}
      {showBulkLink && (
        <BulkCertificateLinkModal
          labels={labels}
          defaultPrefix={activeFolder?.prefix}
          onClose={() => setShowBulkLink(false)}
          onDone={() => { fetchLabels(); }}
        />
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

                  {/* Hasil baca otomatis sertifikat */}
                  {driveIdDetected && certRead.status === 'reading' && (
                    <p className="text-[11px] text-blue-700 flex items-center mt-2">
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Membaca isi sertifikat (Nama Alat, Ruangan, Tanggal)...
                    </p>
                  )}
                  {driveIdDetected && certRead.status === 'error' && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                      <p className="font-semibold">Isi sertifikat tidak bisa dibaca otomatis. Silakan isi manual.</p>
                      <p>{certRead.error}</p>
                      <button type="button" onClick={() => readCertificate(driveIdDetected)} className="font-bold text-amber-800 underline">
                        Coba baca lagi
                      </button>
                    </div>
                  )}
                  {driveIdDetected && certRead.status === 'done' && certRead.info && (() => {
                    const info = certRead.info;
                    const noMismatch = !!info.nomorSertifikat && normalizeText(info.nomorSertifikat) !== normalizeText(activeModalLabel.noLabel);
                    const rsMismatch = !!info.namaPelanggan && !!activeModalLabel.namaRs &&
                      !normalizeText(info.namaPelanggan).includes(normalizeText(activeModalLabel.namaRs)) &&
                      !normalizeText(activeModalLabel.namaRs).includes(normalizeText(info.namaPelanggan));
                    return (
                      <div className="mt-2 space-y-1.5">
                        {noMismatch && (
                          <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-[11px] text-rose-800 font-semibold flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Nomor sertifikat di PDF (<span className="font-mono">{info.nomorSertifikat}</span>) BERBEDA dengan nomor label ini
                              (<span className="font-mono">{activeModalLabel.noLabel}</span>). Pastikan link sertifikat tidak tertukar.
                            </span>
                          </div>
                        )}
                        {rsMismatch && (
                          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Nama pelanggan di PDF "{info.namaPelanggan}" berbeda dengan RS folder ini "{activeModalLabel.namaRs}".</span>
                          </div>
                        )}
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                          <p className="font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Terisi otomatis dari sertifikat — periksa sebelum menyimpan
                          </p>
                          <p className="mt-0.5 text-emerald-800">
                            No. Sertifikat <span className="font-mono font-semibold">{info.nomorSertifikat || '-'}</span>
                            {info.namaPelanggan ? ` • ${info.namaPelanggan}` : ''}
                            {info.merek ? ` • ${info.merek}` : ''}{info.tipe ? ` ${info.tipe}` : ''}
                            {info.nomorSeri ? ` • SN ${info.nomorSeri}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  {driveIdDetected && certRead.status === 'idle' && certRead.fileId === driveIdDetected && (
                    <button
                      type="button"
                      onClick={() => readCertificate(driveIdDetected)}
                      className="mt-2 text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Baca ulang Nama Alat, Ruangan & Tanggal dari sertifikat
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Alat <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={docNameInput}
                      onChange={(e) => setDocNameInput(e.target.value)}
                      placeholder="Contoh: Patient Monitor / Defibrillator"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ruangan <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={ruanganInput}
                      onChange={(e) => setRuanganInput(e.target.value)}
                      placeholder="Contoh: Ruang ICU / Poli Dalam / VK"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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

      {/* Modal Edit Nama Rumah Sakit / Instansi Folder */}
      {editingFolderRs && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">
                  Edit Nama RS - Folder {editingFolderRs.prefix}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFolderRs(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Rumah Sakit / Instansi
                </label>
                <input
                  type="text"
                  list="hospitals-modal-list"
                  value={folderRsInput}
                  onChange={(e) => setFolderRsInput(e.target.value)}
                  placeholder="Ketik atau pilih nama RS (contoh: RSUD Dr. Moewardi)"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50 text-slate-900"
                />
                <datalist id="hospitals-modal-list">
                  {INITIAL_HOSPITALS.map(h => (
                    <option key={h.id} value={h.name} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nama RS ini akan diasosiasikan dengan seluruh label di Folder {editingFolderRs.prefix}. Kosongkan jika ingin menghapus asosiasi RS.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              {editingFolderRs.currentNamaRs ? (
                <button
                  type="button"
                  onClick={() => {
                    setFolderRsInput('');
                  }}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Kosongkan RS
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFolderRs(null)}
                  disabled={savingFolderRs}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveFolderRs}
                  disabled={savingFolderRs}
                  className="px-4 py-2 text-xs font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingFolderRs ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
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
