import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Settings, 
  Eye, 
  History, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  Download, 
  RefreshCw,
  FileCode,
  Layers,
  ArrowRight,
  HelpCircle,
  PenTool,
  Check,
  FileSpreadsheet,
  Stamp
} from 'lucide-react';
import { SignaturePadModal } from './SignaturePadModal';
import { 
  TemplateDocType, 
  DocumentTemplatesConfig, 
  TemplateVersion, 
  getFullTemplatesConfig, 
  saveNewTemplateVersion, 
  setActiveTemplateVersion, 
  deleteTemplateVersion, 
  saveTemplateMappings 
} from '../lib/templateService';
import { uploadFile } from '../lib/storageHelper';
import { 
  extractPlaceholdersFromPdf, 
  extractPlaceholdersFromTemplate,
  generateDocumentBytes,
  extractGoogleDriveFileId
} from '../lib/templateGenerator';
import { 
  getSystemFieldsForType, 
  getMockDataForType, 
  SystemFieldDefinition 
} from '../lib/mockTemplateData';

export function TemplateSettings() {
  const [config, setConfig] = useState<DocumentTemplatesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<TemplateDocType>('sph');
  
  // Mapping state for active type
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isSavingMappings, setIsSavingMappings] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // New Version Upload modal/state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploadDriveUrl, setUploadDriveUrl] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadVersionName, setUploadVersionName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewExcelUrl, setPreviewExcelUrl] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocType, setPreviewDocType] = useState<'pdf' | 'docx' | 'xlsx'>('pdf');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewIsGdrive, setPreviewIsGdrive] = useState(false);
  const [previewGdriveFileId, setPreviewGdriveFileId] = useState<string | null>(null);
  const [previewTabMode, setPreviewTabMode] = useState<'injected' | 'native_gdrive'>('injected');

  // Digital Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [storedSignature, setStoredSignature] = useState<string | null>(() => {
    try {
      return localStorage.getItem('smk_last_signature');
    } catch {
      return null;
    }
  });
  const [storedSignerName, setStoredSignerName] = useState<string>(() => {
    try {
      return localStorage.getItem('smk_last_signer_name') || 'Hafizh Pasifianto Utomo, S.Tr.T.';
    } catch {
      return 'Hafizh Pasifianto Utomo, S.Tr.T.';
    }
  });
  const [storedSignerRole, setStoredSignerRole] = useState<string>(() => {
    try {
      return localStorage.getItem('smk_last_signer_role') || 'Manajer Teknik & Penanggung Jawab KAN';
    } catch {
      return 'Manajer Teknik & Penanggung Jawab KAN';
    }
  });

  const handleSaveSignature = (sigUrl: string, name?: string, role?: string) => {
    setStoredSignature(sigUrl);
    if (name) setStoredSignerName(name);
    if (role) setStoredSignerRole(role);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      setMappings(config[activeType].mappings || {});
    }
  }, [activeType, config]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getFullTemplatesConfig();
      setConfig(data);
      setMappings(data[activeType].mappings || {});
    } catch (error) {
      console.error('Error loading template config:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTypeConfig = config ? config[activeType] : null;
  const availableSystemFields = getSystemFieldsForType(activeType);
  const mockData = getMockDataForType(activeType);

  // Handle adding a new mapping row
  const handleAddMappingRow = () => {
    const defaultPlaceholder = `{{FIELD_${Object.keys(mappings).length + 1}}}`;
    const defaultTarget = availableSystemFields[0]?.key || 'hospitalName';
    setMappings(prev => ({
      ...prev,
      [defaultPlaceholder]: defaultTarget
    }));
  };

  // Handle removing a mapping row
  const handleRemoveMapping = (keyToRemove: string) => {
    setMappings(prev => {
      const next = { ...prev };
      delete next[keyToRemove];
      return next;
    });
  };

  // Handle editing placeholder token name
  const handlePlaceholderChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    setMappings(prev => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([k, v]: [string, string]) => {
        if (k === oldKey) {
          next[newKey] = v;
        } else {
          next[k] = v;
        }
      });
      return next;
    });
  };

  // Handle changing target system field
  const handleTargetChange = (token: string, newTarget: string) => {
    setMappings(prev => ({
      ...prev,
      [token]: newTarget
    }));
  };

  // Save current mappings to Firebase
  const handleSaveMappings = async () => {
    setIsSavingMappings(true);
    setSaveSuccessMessage(null);
    try {
      await saveTemplateMappings(activeType, mappings);
      setSaveSuccessMessage('Konfigurasi pemetaan token berhasil disimpan!');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      await loadConfig();
    } catch (error) {
      console.error('Failed to save mappings:', error);
      alert('Gagal menyimpan pemetaan. Silakan coba lagi.');
    } finally {
      setIsSavingMappings(false);
    }
  };

  // Auto-populate default mappings from system field list
  const handleAutoPopulateDefaults = () => {
    const newMappings: Record<string, string> = { ...mappings };
    availableSystemFields.forEach(field => {
      const token = `{{${field.key}}}`;
      if (!newMappings[token]) {
        newMappings[token] = field.key;
      }
    });
    setMappings(newMappings);
  };

  // Scan current uploaded template for placeholders
  const handleScanTokensFromTemplate = async () => {
    if (!currentTypeConfig?.activeUrl) {
      alert('Belum ada template aktif untuk dipindai. Silakan unggah template terlebih dahulu.');
      return;
    }

    setIsScanning(true);
    try {
      const res = await fetch(currentTypeConfig.activeUrl);
      const buffer = await res.arrayBuffer();
      const detected = await extractPlaceholdersFromTemplate(buffer, currentTypeConfig.activeFileName || '');

      if (detected.length === 0) {
        alert('Tidak ditemukan placeholder dalam template ini. Anda dapat menambahkan pemetaan token secara manual.');
      } else {
        const updated = { ...mappings };
        let addedCount = 0;

        detected.forEach(token => {
          const clean = token.replace(/[{}]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
          // Find matching system field
          const match = availableSystemFields.find(f => 
            f.key.toLowerCase() === clean || 
            clean.includes(f.key.toLowerCase()) || 
            f.key.toLowerCase().includes(clean)
          );

          if (!updated[token]) {
            updated[token] = match ? match.key : availableSystemFields[0]?.key || 'hospitalName';
            addedCount++;
          }
        });

        setMappings(updated);
        alert(`Berhasil mendeteksi ${detected.length} token placeholder dari template! (${addedCount} token baru ditambahkan ke tabel pemetaan).`);
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Gagal memindai file template.');
    } finally {
      setIsScanning(false);
    }
  };

  // Upload new version handler
  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileObj && !uploadDriveUrl.trim()) {
      alert('Pilih file template atau masukkan link Google Drive terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    try {
      let downloadUrl = '';
      let fileName = '';
      let fileType: 'pdf' | 'docx' | 'xlsx' = 'pdf';
      let detected: string[] = [];

      if (uploadDriveUrl.trim()) {
        downloadUrl = uploadDriveUrl.trim();
        if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
          downloadUrl = 'https://' + downloadUrl;
        }
        fileName = uploadVersionName || `Template ${activeType.toUpperCase()} (Link Google Drive)`;
        fileType = 'pdf';
      } else if (uploadFileObj) {
        const lowerName = uploadFileObj.name.toLowerCase();
        const isPdf = lowerName.endsWith('.pdf');
        const isDocx = lowerName.endsWith('.docx');
        const isXlsx = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
        const isImage = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp');

        if (!isPdf && !isDocx && !isXlsx && !isImage) {
          alert('Format file tidak didukung. Harap unggah file .pdf, .docx, .xlsx, atau gambar (.png, .jpg)');
          setIsUploading(false);
          return;
        }

        const folder = `templates/${activeType}`;
        downloadUrl = await uploadFile(uploadFileObj, folder);
        fileName = uploadFileObj.name;
        fileType = isXlsx ? 'xlsx' : isDocx ? 'docx' : 'pdf';

        // Extract placeholders initially with strict 2s timeout so upload never gets delayed
        try {
          const buffer = await uploadFileObj.arrayBuffer();
          const scanTask = extractPlaceholdersFromTemplate(buffer, uploadFileObj.name);
          const timeoutTask = new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 2000));
          detected = await Promise.race([scanTask, timeoutTask]);
        } catch {
          // ignore scan error
        }
      }

      await saveNewTemplateVersion(
        activeType,
        downloadUrl,
        fileName,
        fileType,
        uploadNotes,
        detected,
        uploadVersionName || undefined
      );

      setShowUploadModal(false);
      setUploadFileObj(null);
      setUploadDriveUrl('');
      setUploadNotes('');
      setUploadVersionName('');
      await loadConfig();
    } catch (error) {
      console.error('Failed to upload version:', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Gagal mengunggah versi template baru: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Switch active version
  const handleActivateVersion = async (versionId: string) => {
    try {
      await setActiveTemplateVersion(activeType, versionId);
      await loadConfig();
    } catch (error) {
      console.error('Failed to activate version:', error);
      alert('Gagal mengaktifkan versi template.');
    }
  };

  // Delete version
  const handleDeleteVersion = async (version: TemplateVersion) => {
    if (!confirm(`Hapus versi "${version.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteTemplateVersion(activeType, version.id);
      await loadConfig();
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Gagal menghapus versi.');
    }
  };

  // Trigger preview with mock data
  const handleOpenPreview = async () => {
    if (!currentTypeConfig?.activeUrl) {
      alert('Belum ada template aktif untuk dokumen ini. Silakan unggah template terlebih dahulu.');
      return;
    }

    setPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewExcelUrl(null);
    setPreviewPdfUrl(null);
    setPreviewTabMode('injected');

    const gdriveId = extractGoogleDriveFileId(currentTypeConfig.activeUrl);
    setPreviewGdriveFileId(gdriveId);

    try {
      const letterheadUrl = config?.kop_surat?.activeUrl || null;

      const { url, extension, excelUrl, pdfUrl, isGoogleDriveLink, googleDriveFileId } = await generateDocumentBytes(
        currentTypeConfig.activeUrl,
        mockData,
        mappings,
        storedSignature || undefined,
        letterheadUrl,
        currentTypeConfig.activeFileType
      );

      setPreviewUrl(url);
      setPreviewDocType(extension);
      setPreviewExcelUrl(excelUrl || null);
      setPreviewPdfUrl(pdfUrl || (extension === 'pdf' ? url : null));
      setPreviewIsGdrive(!!isGoogleDriveLink || !!gdriveId);
      if (googleDriveFileId) setPreviewGdriveFileId(googleDriveFileId);
    } catch (error: any) {
      console.error('Preview error:', error);
      setPreviewError(error?.message || 'Gagal menghasilkan pratinjau dokumen.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Preview a specific version
  const handlePreviewSpecificVersion = async (version: TemplateVersion) => {
    if (!version.fileUrl) return;
    setPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewExcelUrl(null);
    setPreviewPdfUrl(null);
    setPreviewTabMode('injected');

    const gdriveId = extractGoogleDriveFileId(version.fileUrl);
    setPreviewGdriveFileId(gdriveId);

    try {
      const letterheadUrl = config?.kop_surat?.activeUrl || null;

      const { url, extension, excelUrl, pdfUrl, isGoogleDriveLink, googleDriveFileId } = await generateDocumentBytes(
        version.fileUrl,
        mockData,
        mappings,
        storedSignature || undefined,
        letterheadUrl,
        version.fileType
      );

      setPreviewUrl(url);
      setPreviewDocType(extension);
      setPreviewExcelUrl(excelUrl || null);
      setPreviewPdfUrl(pdfUrl || (extension === 'pdf' ? url : null));
      setPreviewIsGdrive(!!isGoogleDriveLink || !!gdriveId);
      if (googleDriveFileId) setPreviewGdriveFileId(googleDriveFileId);
    } catch (error: any) {
      console.error('Preview error:', error);
      setPreviewError(error?.message || 'Gagal menghasilkan pratinjau dokumen.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const documentTypeTabs: { id: TemplateDocType; label: string; short: string; desc: string; icon: any }[] = [
    { id: 'kop_surat', label: 'Kop Surat Resmi (A4 Kosongan)', short: 'KOP SURAT', desc: 'Template Kop Surat A4 untuk latar resmi SPH, SPK, BAP, & BASTP', icon: Stamp },
    { id: 'sph', label: 'Surat Penawaran Harga (SPH)', short: 'SPH', desc: 'Template Surat Penawaran Harga resmi untuk RS / Faskes (menggunakan Kop Surat)', icon: FileText },
    { id: 'spk', label: 'Surat Perintah Kerja (SPK)', short: 'SPK', desc: 'Template Surat Perintah Kerja teknisi kalibrasi (menggunakan Kop Surat)', icon: FileText },
    { id: 'bap', label: 'Berita Acara Pekerjaan (BAP)', short: 'BAP', desc: 'Template Berita Acara Pekerjaan (Excel/Word/PDF -> PDF Otomatis)', icon: FileSpreadsheet },
    { id: 'bastp', label: 'Sertifikat & BASTP', short: 'BASTP', desc: 'Template Berita Acara Serah Terima & Sertifikat Kalibrasi (Excel/Word/PDF -> PDF)', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#D8D2CB]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#1C658C]/10 text-[#1C658C] text-xs font-bold font-mono border border-[#1C658C]/20">
                PT. SARANA MULTI KALIBRASI
              </span>
              <span className="text-[#D8D2CB]">•</span>
              <span className="text-xs text-slate-500 font-medium">Sistem Pemetaan & Versi Dokumen</span>
            </div>
            <h2 className="text-2xl font-black text-[#1C658C] mt-1.5 tracking-tight flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-[#398AB9]" />
              Pengaturan & Pemetaan Template Dokumen
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Kelola template resmi SPH, SPK, BAP, dan BASTP dengan sistem versi multi-layout, 
              pemetaan token placeholder dinamis (misal <code className="bg-slate-100 px-1 py-0.5 rounded text-xs text-[#1C658C]">{'{{hospitalName}}'}</code> ke data sistem), 
              dan pratinjau instan dengan data simulasi sebelum dicetak.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadConfig}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition-all"
              title="Muat Ulang Konfigurasi"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1C658C]' : ''}`} />
              <span>Muat Ulang</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 bg-[#1C658C] hover:bg-[#144966] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Unggah Versi Baru</span>
            </button>
          </div>
        </div>

        {/* Tip Box */}
        <div className="mt-5 p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 to-teal-50/80 border border-[#398AB9]/20 text-xs text-slate-700 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#1C658C] shrink-0 mt-0.5" />
          <div>
            <strong>Panduan Format Template:</strong> Anda dapat mengunggah file <strong>PDF</strong> (dengan AcroForm atau tanda <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-blue-200">{'{{FIELD_NAME}}'}</code>) atau file <strong>Word (.docx)</strong>. Untuk dokumen berisikan daftar tabel dinamis dengan puluhan baris alat, template Word (.docx) sangat direkomendasikan karena dapat memperbanyak baris secara otomatis.
          </div>
        </div>

        {/* Branding & Media Settings */}
        <div className="mt-6 flex flex-col md:flex-row items-center gap-4 border-t border-slate-100 pt-5">
          <div className="flex-1 flex items-center gap-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Tanda Tangan & Stempel Resmi</h4>
              <p className="text-xs text-slate-500 mt-0.5">Atur tanda tangan digital & stempel (PDF/Gambar) yang akan digunakan di sistem.</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowSignatureModal(true)}
                className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-xs"
              >
                Atur TTD & Stempel
              </button>
            </div>
          </div>
        </div>

        {/* Document Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-100">
          {documentTypeTabs.map(tab => {
            const TabIcon = tab.icon;
            const hasActive = Boolean(config && config[tab.id]?.activeUrl);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeType === tab.id
                    ? 'bg-[#1C658C] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
                {hasActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Template Aktif Siap"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 flex flex-col items-center justify-center border border-[#D8D2CB]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1C658C]"></div>
          <p className="text-xs text-slate-500 mt-4 font-medium">Memuat konfigurasi template...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ========================================================================= */}
          {/* 1. VISUAL VERSION HISTORY SELECTOR                                        */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#D8D2CB]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      Riwayat Versi Visual Template Dokumen {activeType.toUpperCase()}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
                      {currentTypeConfig?.versions.length || 0} Versi Tersimpan
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih dan alihkan versi aktif di bawah untuk digunakan saat pencetakan atau generate dokumen {activeType.toUpperCase()}.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-[#1C658C] hover:bg-[#1C658C]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Unggah Versi Baru</span>
              </button>
            </div>

            {/* Visual Version Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {currentTypeConfig?.versions.map((ver, idx) => {
                const isActive = ver.id === currentTypeConfig.activeVersionId;
                const dateFormatted = new Date(ver.uploadedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={ver.id || idx}
                    className={`relative rounded-xl p-4.5 transition-all border flex flex-col justify-between ${
                      isActive
                        ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border-emerald-400 shadow-md ring-2 ring-emerald-400/20'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Versi Aktif Saat Ini</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md ${
                            isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            v{ver.versionNumber || (idx + 1)}.0
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                            {ver.fileType}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {dateFormatted}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1 mt-1">
                        {ver.name || `Versi ${ver.versionNumber}`}
                      </h4>

                      {ver.uploadedBy && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          Oleh: {ver.uploadedBy}
                        </p>
                      )}

                      {ver.notes && (
                        <p className="text-[11px] text-slate-600 mt-2.5 bg-white/80 p-2 rounded-lg border border-slate-200/60 line-clamp-2 italic">
                          "{ver.notes}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePreviewSpecificVersion(ver)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                          title="Pratinjau dokumen dengan versi template ini"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Preview</span>
                        </button>

                        <a
                          href={ver.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-all shadow-2xs"
                          title="Unduh file template asli"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isActive ? (
                          <button
                            onClick={() => handleActivateVersion(ver.id)}
                            className="px-2.5 py-1.5 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 hover:border-emerald-600 text-emerald-800 text-[11px] font-bold rounded-lg transition-all shadow-2xs flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Jadikan Aktif</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 py-1 px-2.5 bg-emerald-100/80 rounded-md border border-emerald-300">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Sedang Digunakan
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteVersion(ver)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus versi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quick Upload Action Card */}
              <div
                onClick={() => setShowUploadModal(true)}
                className="rounded-xl border-2 border-dashed border-slate-200 hover:border-[#1C658C] bg-slate-50/50 hover:bg-blue-50/30 p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-[#1C658C]/10 flex items-center justify-center text-slate-400 group-hover:text-[#1C658C] transition-all">
                  <Plus className="w-5 h-5" />
                </div>
                <p className="font-bold text-xs text-slate-700 group-hover:text-[#1C658C] mt-2">
                  + Unggah Versi Baru
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  File PDF atau DOCX dengan pemetaan token
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. DIGITAL SIGNATURE MANAGER (SIGNATURE PAD INTEGRATION)                  */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#D8D2CB]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      Tanda Tangan Digital Resmi (Authorized Signature Pad)
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      storedSignature ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {storedSignature ? 'Tanda Tangan Terpasang' : 'Belum Ditentukan'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tanda tangan digital ini akan otomatis diinjeksi ke kolom penandatanganan PDF / DOCX resmi (SPH, SPK, BAP, BASTP).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {storedSignature && (
                  <button
                    onClick={handleOpenPreview}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                    title="Uji coba preview cetak dengan tanda tangan ini terpasang"
                  >
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Uji Injeksi ke Preview</span>
                  </button>
                )}

                <button
                  onClick={() => setShowSignatureModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                >
                  <PenTool className="w-4 h-4" />
                  <span>{storedSignature ? 'Ubah Tanda Tangan' : 'Goreskan Tanda Tangan Baru'}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Signature Image Preview Box */}
              <div className="md:col-span-1 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col items-center justify-center min-h-[120px] relative">
                {storedSignature ? (
                  <div className="text-center w-full">
                    <img
                      src={storedSignature}
                      alt="Tanda Tangan Digital"
                      className="max-h-20 max-w-full object-contain mx-auto"
                    />
                    <span className="text-[10px] text-slate-400 block mt-2 font-mono">Format PNG Transparan Resolusi Tinggi</span>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-3">
                    <PenTool className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-medium mt-1.5">Belum ada tanda tangan digital</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Klik tombol di atas untuk menggambar dengan stylus atau touch</p>
                  </div>
                )}
              </div>

              {/* Signer Identity Information */}
              <div className="md:col-span-2 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Nama Penandatangan Resmi</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{storedSignerName}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Jabatan / Wewenang Pengesahan</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{storedSignerRole}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="text-[11px] flex items-center gap-1.5 text-slate-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Injeksi otomatis ke form AcroForm (bidang TTD/paraf) atau stempel digital halaman akhir PDF
                  </span>

                  {storedSignature && (
                    <button
                      onClick={() => {
                        if (confirm('Hapus tanda tangan digital tersimpan?')) {
                          setStoredSignature(null);
                          try {
                            localStorage.removeItem('smk_last_signature');
                          } catch {}
                        }
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline flex items-center gap-1 shrink-0 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus TTD
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. ACTIVE TEMPLATE DETAILS & TOKEN MAPPING (3-COLUMN LAYOUT)              */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 Cols): Active Template & Token Mapping UI */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Template Status Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#D8D2CB]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Template Aktif</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    {currentTypeConfig?.activeUrl ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span>{currentTypeConfig.activeFileName || `${activeType.toUpperCase()} Template`}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <span className="text-slate-500 italic">Belum Ada Template Aktif</span>
                      </>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {currentTypeConfig?.activeUrl && (
                    <>
                      <a
                        href={currentTypeConfig.activeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>File Asli</span>
                      </a>
                      <button
                        onClick={handleOpenPreview}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Pratinjau / Preview Dokumen</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Tipe Dokumen</span>
                  <span className="font-bold text-slate-800 uppercase">{activeType}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Format Berkas</span>
                  <span className="font-bold text-slate-800 uppercase font-mono">
                    {currentTypeConfig?.activeFileType || '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Versi Aktif</span>
                  <span className="font-bold text-slate-800">
                    {currentTypeConfig?.activeVersionId 
                      ? currentTypeConfig.versions.find(v => v.id === currentTypeConfig.activeVersionId)?.versionNumber ? `Versi ${currentTypeConfig.versions.find(v => v.id === currentTypeConfig.activeVersionId)?.versionNumber}` : 'Aktif'
                      : 'Belum Diatur'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Total Pemetaan Token</span>
                  <span className="font-bold text-[#1C658C] font-mono">
                    {Object.keys(mappings).length} Token
                  </span>
                </div>
              </div>
            </div>

            {/* Field Mapping UI Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#D8D2CB]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-[#1C658C]" />
                    Pemetaan Token Dokumen ke Data Sistem
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tentukan token placeholder yang ada di file template Anda (misal <code className="bg-slate-100 px-1 py-0.5 rounded text-[#1C658C]">{'{{NOMOR_SPH}}'}</code>) dan hubungkan ke data sistem aplikasi.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleScanTokensFromTemplate}
                    disabled={isScanning || !currentTypeConfig?.activeUrl}
                    className="px-3 py-1.5 rounded-xl bg-[#398AB9]/10 text-[#1C658C] hover:bg-[#398AB9]/20 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                    title="Pindai file PDF untuk menemukan placeholder otomatis"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Memindai...' : 'Pindai Token PDF'}</span>
                  </button>

                  <button
                    onClick={handleAutoPopulateDefaults}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-all"
                    title="Tambahkan seluruh field standar sistem"
                  >
                    <span>Isi Standar</span>
                  </button>

                  <button
                    onClick={handleAddMappingRow}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>
              </div>

              {saveSuccessMessage && (
                <div className="my-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Mappings Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="py-2.5 px-3 rounded-l-lg">Placeholder di Dokumen (PDF/Word)</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                      <th className="py-2.5 px-3">Field Data Sistem Aplikasi</th>
                      <th className="py-2.5 px-3">Contoh Nilai Nyata</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(mappings).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Belum ada pemetaan token. Klik tombol <strong>"Pindai Token PDF"</strong> atau <strong>"Isi Standar"</strong> untuk memulai.
                        </td>
                      </tr>
                    ) : (
                      (Object.entries(mappings) as [string, string][]).map(([token, systemKey], index) => {
                        const matchedField = availableSystemFields.find(f => f.key === systemKey);
                        const sampleVal = (mockData as Record<string, any>)[systemKey];
                        const displaySample = Array.isArray(sampleVal) ? `${sampleVal.length} Item Alat` : String(sampleVal ?? '-');

                        return (
                          <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              <input
                                type="text"
                                value={token}
                                onChange={(e) => handlePlaceholderChange(token, e.target.value)}
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#1C658C] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#1C658C] focus:outline-hidden"
                                placeholder="{{TOKEN_NAME}}"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-400">
                              <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={systemKey}
                                onChange={(e) => handleTargetChange(token, e.target.value)}
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#1C658C] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-hidden"
                              >
                                {availableSystemFields.map(f => (
                                  <option key={f.key} value={f.key}>
                                    {f.label} ({f.key})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]" title={displaySample}>
                              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-mono">
                                {displaySample}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleRemoveMapping(token)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Pemetaan Ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Save Mappings Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Pastikan menyimpan perubahan pemetaan setelah mengedit.
                </div>
                <button
                  onClick={handleSaveMappings}
                  disabled={isSavingMappings}
                  className="px-5 py-2.5 bg-[#1C658C] hover:bg-[#144966] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingMappings ? 'Menyimpan...' : 'Simpan Pemetaan Token'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column (1 Col): Version History & Upload */}
          <div className="space-y-6">
            
            {/* Version History Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#D8D2CB]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-[#398AB9]" />
                  Riwayat Versi Template
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {currentTypeConfig?.versions.length || 0} Versi
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Pilih versi mana yang ingin diaktifkan untuk pencetakan dokumen {activeType.toUpperCase()}. Anda dapat berganti layout kapan saja tanpa kehilangan format lama.
              </p>

              <div className="mt-4 space-y-3">
                {(!currentTypeConfig?.versions || currentTypeConfig.versions.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Belum ada versi tersimpan untuk dokumen ini.
                  </div>
                ) : (
                  currentTypeConfig.versions.map((ver, idx) => {
                    const isActive = ver.id === currentTypeConfig.activeVersionId;
                    const dateFormatted = new Date(ver.uploadedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={ver.id || idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900">
                                {ver.name || `Versi ${ver.versionNumber}`}
                              </span>
                              {isActive && (
                                <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  Aktif
                                </span>
                              )}
                              <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1 py-0.5 rounded">
                                {ver.fileType}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {dateFormatted}
                            </span>
                            {ver.notes && (
                              <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-2">
                                "{ver.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <a
                            href={ver.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 text-[11px]"
                          >
                            <Download className="w-3 h-3" />
                            <span>Unduh</span>
                          </a>

                          <div className="flex items-center gap-1.5">
                            {!isActive && (
                              <button
                                onClick={() => handleActivateVersion(ver.id)}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 hover:border-emerald-600 text-slate-700 text-[11px] font-bold rounded-lg transition-all"
                              >
                                Jadikan Aktif
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteVersion(ver)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              title="Hapus versi ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-5">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Versi Template Baru</span>
                </button>
              </div>
            </div>

            {/* Quick Reference Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-xs space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#1C658C]" />
                Daftar Field Data Tersedia ({activeType.toUpperCase()})
              </h4>
              <p className="text-slate-600 text-[11px]">
                Berikut variabel sistem yang otomatis disediakan saat mencetak dokumen:
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {availableSystemFields.map(f => (
                  <div key={f.key} className="p-1.5 bg-white rounded-lg border border-slate-100 text-[11px]">
                    <div className="font-mono font-bold text-[#1C658C]">{`{{${f.key}}}`}</div>
                    <div className="text-slate-500 text-[10px]">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPLOAD NEW TEMPLATE VERSION                                      */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D8D2CB] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#1C658C]" />
                Unggah Versi Template Baru ({activeType.toUpperCase()})
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadNewVersion} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Opsi 1: Pilih File Template (.pdf, .docx, .xlsx, .png, .jpg)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp,application/pdf,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setUploadFileObj(f);
                    if (f && !uploadVersionName) {
                      setUploadVersionName(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1C658C] file:text-white hover:file:bg-[#144966] cursor-pointer"
                />
              </div>

              <div className="relative flex items-center my-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ATAU LEBIH MUDAH</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Opsi 2: Tempel Tautan Link Google Drive / Cloud File
                </label>
                <input
                  type="url"
                  value={uploadDriveUrl}
                  onChange={(e) => setUploadDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-amber-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {activeType === 'kop_surat' 
                    ? 'Direkomendasikan file PDF A4 kosong dengan header & footer resmi SMK atau link Google Drive.' 
                    : (activeType === 'bap' || activeType === 'bastp')
                    ? 'Bisa menggunakan file Excel (.xlsx) atau link Google Drive file BAP/BASTP.'
                    : 'Mendukung file PDF/Word atau link Google Drive.'}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nama Versi / Judul Layout
                </label>
                <input
                  type="text"
                  value={uploadVersionName}
                  onChange={(e) => setUploadVersionName(e.target.value)}
                  placeholder="Misal: Template SPH Standar 2026 Kemenkes"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-[#1C658C] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan Perubahan / Deskripsi (Opsional)
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  rows={3}
                  placeholder="Catatan perbedaan tata letak atau revisi kop..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-[#1C658C] focus:outline-hidden resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                Versi baru yang diunggah akan otomatis dijadikan <strong>Versi Aktif</strong>. Versi sebelumnya tetap tersimpan di riwayat dan dapat diaktifkan kembali kapan saja.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (!uploadFileObj && !uploadDriveUrl.trim())}
                  className="px-5 py-2.5 bg-[#1C658C] hover:bg-[#144966] text-white rounded-xl font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Unggah & Aktifkan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INTERACTIVE DOCUMENT PREVIEW WITH MOCK DATA                      */}
      {/* ========================================================================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-[#D8D2CB] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#EEEEEE] border-b border-[#D8D2CB] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1C658C]/10 border border-[#1C658C]/20 rounded-xl text-[#1C658C]">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Pratinjau Hasil Dokumen Simulasi ({activeType.toUpperCase()})
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      Data Simulasi Terinjeksi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Memverifikasi penempatan token placeholder pada template <strong>{currentTypeConfig?.activeFileName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download={`PREVIEW_${activeType.toUpperCase()}_SIMULASI.${previewDocType}`}
                    className="px-3.5 py-2 bg-[#1C658C] hover:bg-[#144966] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Hasil Simulasi</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Google Drive Preview Switcher Bar */}
            {previewGdriveFileId && (
              <div className="bg-slate-100 px-6 py-2 border-b border-[#D8D2CB] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTabMode('injected')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      previewTabMode === 'injected'
                        ? 'bg-[#1C658C] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Hasil Injeksi Data</span>
                  </button>

                  <button
                    onClick={() => setPreviewTabMode('native_gdrive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      previewTabMode === 'native_gdrive'
                        ? 'bg-[#1C658C] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-300'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tampilan Asli Google Drive (Viewer)</span>
                  </button>
                </div>

                <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>
                    Template dari Link Google Drive. Untuk pengeditan token langsung tanpa CORS, disarankan juga mengunggah file .pdf / .docx langsung.
                  </span>
                </div>
              </div>
            )}

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-slate-900/10 p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center">
              {previewTabMode === 'native_gdrive' && previewGdriveFileId ? (
                <iframe
                  src={`https://drive.google.com/file/d/${previewGdriveFileId}/preview`}
                  title="Google Drive Native Preview"
                  className="w-full h-full rounded-xl bg-white shadow-md border border-slate-300"
                />
              ) : previewLoading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1C658C]"></div>
                  <p className="text-xs text-slate-600 font-bold mt-4">Menginjeksi data simulasi ke template...</p>
                  <p className="text-[11px] text-slate-400 mt-1">Mengganti token dengan data simulasi rumah sakit</p>
                </div>
              ) : previewError ? (
                <div className="p-8 bg-white rounded-2xl max-w-md text-center shadow-md">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-900 text-sm">Gagal Membuat Pratinjau</h4>
                  <p className="text-xs text-slate-500 mt-1">{previewError}</p>
                  <button
                    onClick={handleOpenPreview}
                    className="mt-4 px-4 py-2 bg-[#1C658C] text-white rounded-xl text-xs font-bold"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : previewDocType === 'pdf' && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-full rounded-xl bg-white shadow-md border border-slate-300"
                />
              ) : previewDocType === 'xlsx' ? (
                <div className="w-full h-full flex flex-col items-center justify-between gap-3 overflow-hidden">
                  {/* Excel Banner */}
                  <div className="w-full bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 block">File Spreadsheet Excel (.xlsx) Berhasil Diinjeksi Data</span>
                        <span className="text-[11px] text-emerald-800">
                          {previewPdfUrl ? 'Tampilan cetak PDF siap di bawah • File mentah .xlsx dapat diunduh langsung' : 'Data simulasi telah diinjeksi ke dalam sel spreadsheet'}
                        </span>
                      </div>
                    </div>
                    {previewExcelUrl && (
                      <a
                        href={previewExcelUrl}
                        download={`PREVIEW_${activeType.toUpperCase()}_SIMULASI.xlsx`}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh File Excel (.xlsx) Hasil Simulasi</span>
                      </a>
                    )}
                  </div>

                  {/* PDF Print View iframe or Info Box */}
                  {previewPdfUrl ? (
                    <iframe
                      src={previewPdfUrl}
                      title="Excel PDF Print Preview"
                      className="w-full h-full flex-1 rounded-xl bg-white shadow-md border border-slate-300"
                    />
                  ) : (
                    <div className="p-8 bg-white rounded-2xl max-w-lg text-center shadow-lg space-y-4 my-auto">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">File Excel (.xlsx) Berhasil Diproses</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Seluruh placeholder & token data simulasi telah berhasil diinjeksi ke dalam sel-sel spreadsheet Excel.
                        </p>
                      </div>
                      {previewExcelUrl && (
                        <a
                          href={previewExcelUrl}
                          download={`PREVIEW_${activeType.toUpperCase()}_SIMULASI.xlsx`}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                        >
                          <Download className="w-4 h-4" />
                          <span>Unduh File Excel (.xlsx) Hasil Simulasi</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : previewDocType === 'docx' ? (
                <div className="p-8 bg-white rounded-2xl max-w-lg text-center shadow-lg space-y-4">
                  <div className="w-14 h-14 bg-blue-50 text-[#1C658C] rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Dokumen Word (.docx) Berhasil Dibuat</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Template Microsoft Word tidak dapat dirender secara native di dalam browser web, namun seluruh data simulasi telah berhasil diinjeksi ke dalam placeholder.
                    </p>
                  </div>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      download={`PREVIEW_${activeType.toUpperCase()}_SIMULASI.docx`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh File Word Hasil Simulasi</span>
                    </a>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer Info */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span>
                Simulasi menggunakan data contoh: <strong>RSUD Subang Sehat Mandiri</strong> ({mockData.hospitalName})
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {currentTypeConfig?.activeFileName} • Format {previewDocType.toUpperCase()}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Authorized Digital Signature Pad Modal */}
      <SignaturePadModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSaveSignature={handleSaveSignature}
        initialSignerName={storedSignerName}
        initialSignerRole={storedSignerRole}
        title="Bubuhkan Tanda Tangan Digital Resmi PT SMK"
      />

    </div>
  );
}
