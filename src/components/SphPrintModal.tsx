import React, { useState, useEffect, useCallback } from 'react';
import { 
  Printer, 
  X, 
  Download, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Sparkles, 
  Phone, 
  Mail, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calculator,
  ArrowRight,
  Wand2,
  PenTool,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Eye,
  AlertCircle,
  FileCheck,
  Upload
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { SignaturePadModal } from './SignaturePadModal';
import { SphQuotation } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { OfficialLetterhead } from './OfficialLetterhead';
import { OfficialLetterFooter } from './OfficialLetterFooter';
import { formatRupiah, formatNumber } from '../utils/sphHelpers';
import { exportSphToWord } from '../utils/sphWordExport';
import { generateDocumentBytes, createAuthenticSphPdf, paginateSphTableItems } from '../lib/templateGenerator';
import { PDFDocument } from 'pdf-lib';
import { getFullTemplatesConfig, DocumentTemplatesConfig } from '../lib/templateService';
import { getLocalBlob } from '../lib/localBlobStorage';
import { saveUserKopSuratPdf } from '../lib/kopSuratService';
import { extractCleanToolName, getECatalogueTariff } from '../data/sphECatalogueData';

interface SphPrintModalProps {
  sph: SphQuotation;
  isOpen: boolean;
  onClose: () => void;
  onConvertToSpk?: (sph: SphQuotation) => void;
  onOpenBap?: (sph: SphQuotation) => void;
}

export const SphPrintModal: React.FC<SphPrintModalProps> = ({
  sph,
  isOpen,
  onClose,
  onConvertToSpk,
  onOpenBap
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'page1' | 'page2' | 'page3'>('all');
  const [docViewMode, setDocViewMode] = useState<'template' | 'web'>('template');
  const [templatesConfig, setTemplatesConfig] = useState<DocumentTemplatesConfig | null>(null);

  // Template generation state
  const [templateDocUrl, setTemplateDocUrl] = useState<string | null>(null);
  const [templateDocBlob, setTemplateDocBlob] = useState<Blob | null>(null);
  const [templateExcelUrl, setTemplateExcelUrl] = useState<string | null>(null);
  const [templatePdfUrl, setTemplatePdfUrl] = useState<string | null>(null);
  const [templateExt, setTemplateExt] = useState<'pdf' | 'docx' | 'xlsx'>('pdf');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [docGenerationError, setDocGenerationError] = useState<string | null>(null);
  const [resolvedKopSuratSrc, setResolvedKopSuratSrc] = useState<string | null>(null);

  // Digital Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('smk_last_signature');
    } catch {
      return null;
    }
  });

  const handleSaveSignature = (sigUrl: string) => {
    setDigitalSignatureUrl(sigUrl);
  };

  // Upload Kop Surat PDF/Image handler
  const kopFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploadingKop, setIsUploadingKop] = useState(false);

  const handleUploadKopSurat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingKop(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        saveUserKopSuratPdf(dataUrl, file.name);
        setResolvedKopSuratSrc(dataUrl);
        if (templatesConfig) {
          const updatedConfig: DocumentTemplatesConfig = {
            ...templatesConfig,
            kop_surat: {
              ...templatesConfig.kop_surat,
              activeUrl: dataUrl,
              activeFileName: file.name
            }
          };
          setTemplatesConfig(updatedConfig);
          generateTemplatePreview(updatedConfig);
        }
      };
      reader.readAsDataURL(file);
    } catch (uploadErr) {
      console.error('Error uploading Kop Surat:', uploadErr);
    } finally {
      setIsUploadingKop(false);
    }
  };

  // Format date Indonesian
  const formattedDate = new Date(sph.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Dynamic table pagination calculation (matches PDF layout precisely)
  const itemChunks = paginateSphTableItems(sph.items || []);
  const dynamicAttachmentText = `${itemChunks.length} Lembar`;

  // Helper to build SPH data dictionary
  const buildSphData = useCallback(() => {
    return {
      sphNumber: sph.sphNumber,
      subject: sph.subject || 'Surat Penawaran Harga Kalibrasi',
      date: formattedDate,
      city: sph.city || 'Surakarta',
      recipientRole: sph.recipientRole || 'Direktur',
      hospitalName: sph.hospitalName,
      hospitalAddress: sph.hospitalAddress || '',
      hospitalPic: sph.hospitalPic || '',
      marketingStaffName: sph.marketingStaffName || 'Sulis',
      marketingStaffPhone: sph.marketingStaffPhone || '0821-3670-7421',
      directorName: sph.directorName || 'Ahmad Fajar Ariyanto',
      directorTitle: sph.directorTitle || 'Direktur',
      subtotal1: formatNumber(sph.subtotal1),
      subtotalOriginal: formatNumber(sph.subtotalOriginal || sph.subtotal1),
      discountAmount: formatNumber(sph.discountAmount || 0),
      discountPercent: sph.discountPercent || 0,
      ppnAmount: formatNumber(sph.ppnAmount),
      isPpnIncluded: sph.isPpnIncluded !== false,
      subtotal2: formatNumber(sph.subtotal2 || (sph.subtotal1 + sph.ppnAmount)),
      accommodationFee: formatNumber(sph.accommodationFee || 0),
      grandTotal: formatNumber(sph.grandTotal),
      terbilang: sph.terbilang || 'Nol Rupiah',
      attachmentPages: dynamicAttachmentText,
      paymentOption: sph.paymentOption || 'both',
      customBankDetails: sph.customBankDetails || '',
      bankName: sph.bankName || 'Bank Mandiri Cab. Surakarta',
      bankAccountNumber: sph.bankAccountNumber || '138-00-2610846-9',
      bankAccountName: sph.bankAccountName || 'SARANA MULTI KALIBRASI PT',
      items: sph.items.map((it, i) => ({
        no: i + 1,
        description: it.description,
        notes: it.notes || '',
        quantity: it.quantity,
        unit: it.unit || 'Unit',
        unitPrice: formatNumber(it.unitPrice),
        totalPrice: formatNumber(it.totalPrice)
      }))
    };
  }, [sph, formattedDate, dynamicAttachmentText]);

  const generateTemplatePreview = useCallback(async (
    configToUse?: DocumentTemplatesConfig | null,
    sigUrl?: string | null
  ) => {
    const activeConfig = configToUse || templatesConfig;
    const sphConfig = activeConfig?.sph;
    const kopSuratUrl = activeConfig?.kop_surat?.activeUrl || null;

    setIsGeneratingDoc(true);
    setDocGenerationError(null);

    try {
      const data = buildSphData();
      const res = await generateDocumentBytes(
        sphConfig?.activeUrl || '',
        data,
        sphConfig?.mappings,
        sigUrl || digitalSignatureUrl || undefined,
        kopSuratUrl,
        sphConfig?.activeFileType
      );

      setTemplateDocBlob(res.blob);
      setTemplateDocUrl(res.url);
      setTemplateExcelUrl(res.excelUrl || null);
      setTemplatePdfUrl(res.pdfUrl || null);
      setTemplateExt(res.extension);
    } catch (err: any) {
      console.error('Error generating document from template:', err);
      setDocGenerationError(err?.message || 'Gagal menghasilkan dokumen dari template.');
    } finally {
      setIsGeneratingDoc(false);
    }
  }, [buildSphData, templatesConfig, digitalSignatureUrl]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    getFullTemplatesConfig().then(async (config) => {
      if (!isMounted) return;
      setTemplatesConfig(config);

      // Resolve kop surat URL
      if (config.kop_surat?.activeUrl) {
        try {
          const res = config.kop_surat.activeUrl.startsWith('idb://') 
            ? await getLocalBlob(config.kop_surat.activeUrl) 
            : config.kop_surat.activeUrl;
          if (isMounted) setResolvedKopSuratSrc(res);
        } catch {
          if (isMounted) setResolvedKopSuratSrc(config.kop_surat.activeUrl);
        }
      }

      // Default to PDF Presisi view mode (for pre-printed paper)
      setDocViewMode('template');
      generateTemplatePreview(config);
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handlePrintTemplatePdf = () => {
    const iframe = document.getElementById('sph-template-pdf-frame') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else if (templateDocUrl) {
      window.open(templateDocUrl, '_blank');
    }
  };

  const handleDownloadTemplateDoc = () => {
    if (templateDocBlob) {
      const cleanName = sph.hospitalName.replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(templateDocBlob, `SPH_${cleanName}.${templateExt}`);
    }
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportDirectPdf = async () => {
    try {
      setIsExportingPdf(true);
      const sphData = buildSphData();
      const pdfDoc = await PDFDocument.create();
      const bytes = await createAuthenticSphPdf(
        pdfDoc,
        sphData,
        resolvedKopSuratSrc,
        digitalSignatureUrl || undefined
      );
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const cleanName = sph.hospitalName.replace(/[^a-zA-Z0-9]/g, '_') || 'Pelanggan';
      saveAs(blob, `SPH_${cleanName}.pdf`);
    } catch (err) {
      console.error('Error generating direct authentic PDF:', err);
      // Fallback to native print
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Calculate total units
  const totalUnits = sph.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  const hasSphTemplate = Boolean(templatesConfig?.sph?.activeUrl);
  const sphTemplateName = templatesConfig?.sph?.activeFileName || 'Template Resmi SPH';
  const kopSuratName = templatesConfig?.kop_surat?.activeFileName || 'Kop Surat Resmi';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-5xl my-4 overflow-hidden shadow-2xl flex flex-col print:bg-white print:border-none print:shadow-none print:my-0 print:max-w-none">
        
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-4 bg-[#EEEEEE] border-b border-[#D8D2CB] flex flex-wrap items-center justify-between gap-3 print:hidden sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1C658C]/10 border border-[#1C658C]/20 rounded-xl text-[#1C658C]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#1C658C] text-base">Surat Penawaran Harga (SPH) Resmi</h3>
                <span className="bg-white text-[#1C658C] border border-[#D8D2CB] text-xs px-2 py-0.5 rounded font-mono font-bold">
                  {sph.sphNumber}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  sph.status === 'Disetujui (Deal)' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  sph.status === 'Negosiasi' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-slate-200 text-slate-700 border border-slate-300'
                }`}>
                  {sph.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                PT. Sarana Multi Kalibrasi • {sph.hospitalName}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <input 
              type="file" 
              ref={kopFileInputRef} 
              accept=".pdf,image/png,image/jpeg,image/jpg" 
              className="hidden" 
              onChange={handleUploadKopSurat} 
            />

            <button
              type="button"
              onClick={() => kopFileInputRef.current?.click()}
              disabled={isUploadingKop}
              className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs bg-white hover:bg-slate-50 text-slate-700 border-[#D8D2CB]"
              title="Upload file PDF kop surat asli untuk dijadikan background layer dokumen SPH"
            >
              <Upload className={`w-4 h-4 text-[#1C658C] ${isUploadingKop ? 'animate-bounce' : ''}`} />
              <span>{isUploadingKop ? 'Mengunggah...' : 'Upload Kop Surat PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs ${
                digitalSignatureUrl 
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-[#D8D2CB]'
              }`}
              title="Bubuhkan atau ganti tanda tangan digital resmi"
            >
              <PenTool className="w-4 h-4 text-[#1C658C]" />
              <span>{digitalSignatureUrl ? 'Ubah TTD Digital' : 'Tanda Tangan'}</span>
              {digitalSignatureUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            {onConvertToSpk && (
              <button
                onClick={() => onConvertToSpk(sph)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                title="Konversi penawaran deal ini menjadi Surat Perintah Kerja (SPK)"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Buat SPK dari SPH</span>
              </button>
            )}

            {onOpenBap && sph.status === 'Disetujui (Deal)' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBap(sph);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                title="Buka 4 Sheet Dokumen Berita Acara Pekerjaan (BAP) untuk SPH Deal ini"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>BAP (4 Sheet)</span>
              </button>
            )}

            <button
              onClick={() => exportSphToWord(sph, 'ALL', resolvedKopSuratSrc)}
              className="px-3.5 py-2 bg-[#398AB9] hover:bg-[#1C658C] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
              title="Download format Word (.doc) dengan Kop Surat Resmi"
            >
              <Download className="w-4 h-4" />
              <span>Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={handleExportDirectPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
              title="Unduh langsung dokumen resmi PDF 2 halaman lengkap dengan Kop Surat & rincian biaya"
            >
              <FileText className={`w-4 h-4 ${isExportingPdf ? 'animate-spin' : ''}`} />
              <span>{isExportingPdf ? 'Menyiapkan PDF...' : 'Download PDF'}</span>
            </button>

            {docViewMode === 'template' && templateExt === 'pdf' ? (
              <button
                onClick={handlePrintTemplatePdf}
                className="px-4 py-2 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen Template</span>
              </button>
            ) : (
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF (A4)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Switcher Header Sub-Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Dual Mode Switcher */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => {
                setDocViewMode('template');
                if (!templateDocUrl && !isGeneratingDoc) {
                  generateTemplatePreview();
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                docViewMode === 'template' 
                  ? 'bg-[#1C658C] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>PDF Presisi (Kertas Berkop Fisik)</span>
            </button>
            <button
              type="button"
              onClick={() => setDocViewMode('web')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                docViewMode === 'web' 
                  ? 'bg-[#1C658C] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Format Web (HTML)</span>
            </button>
          </div>

          {/* Sub-controls based on mode */}
          {docViewMode === 'web' ? (
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 text-xs">
              <button
                onClick={() => setActiveViewTab('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeViewTab === 'all' ? 'bg-[#1C658C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sph.sphType === 'ecatalogue' ? 'Semua Lembar (1, 2, 3)' : 'Semua Halaman (1 & 2)'}
              </button>
              <button
                onClick={() => setActiveViewTab('page1')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeViewTab === 'page1' ? 'bg-[#1C658C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hal 1: Pengantar
              </button>
              <button
                onClick={() => setActiveViewTab('page2')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeViewTab === 'page2' ? 'bg-[#1C658C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hal 2: Rincian Alat
              </button>
              {sph.sphType === 'ecatalogue' && (
                <button
                  onClick={() => setActiveViewTab('page3')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    activeViewTab === 'page3' ? 'bg-[#1C658C] text-white shadow-xs' : 'text-blue-700 hover:text-blue-900 bg-blue-50'
                  }`}
                >
                  <span>Hal 3: Lampiran E-Catalogue</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {templatesConfig?.sph?.activeUrl && (
                <button
                  type="button"
                  onClick={() => generateTemplatePreview()}
                  disabled={isGeneratingDoc}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  title="Generate ulang dokumen dari template resmi"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDoc ? 'animate-spin text-[#1C658C]' : ''}`} />
                  <span>{isGeneratingDoc ? 'Memproses...' : 'Segarkan Pratinjau'}</span>
                </button>
              )}

              {templateDocBlob && (
                <button
                  type="button"
                  onClick={handleDownloadTemplateDoc}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh SPH ({templateExt.toUpperCase()})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Indicator Bar */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Cetak Kertas Berkop Fisik: <strong>Nomor (4.0 cm)</strong> • <strong>Perihal (4.5 cm)</strong> • <strong>Lampiran (5.0 cm)</strong> • <strong>Garis (5.5 cm)</strong> • <strong>Margin Bawah (3.0 cm)</strong></span>
            </span>
          </div>

          {docViewMode === 'template' && (
            <span className="text-slate-600 font-medium flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Format Bersih Siap Cetak (Tanpa Kop/Logo Grafis)</span>
            </span>
          )}
        </div>

        {/* Document Content */}
        {docViewMode === 'template' ? (
          <div className="p-4 sm:p-6 bg-slate-200/60 overflow-y-auto flex-1 min-h-[700px]">
            {isGeneratingDoc ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 border-4 border-[#1C658C] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-slate-900 text-base">Menyiapkan Dokumen SPH Sesuai Template...</p>
                <p className="text-xs text-slate-500 mt-1">Menyisipkan data penawaran harga & overlay Kop Surat resmi</p>
              </div>
            ) : docGenerationError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-2xl mx-auto my-12 text-center">
                <p className="font-bold text-red-800 text-base mb-1">Gagal Menghasilkan Pratinjau Template</p>
                <p className="text-xs text-red-600 mb-4">{docGenerationError}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => generateTemplatePreview()}
                    className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl shadow-xs"
                  >
                    Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocViewMode('web')}
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs"
                  >
                    Beralih ke Format Web
                  </button>
                </div>
              </div>
            ) : templateExt === 'pdf' && templateDocUrl ? (
              <div className="max-w-5xl mx-auto space-y-3">
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-300 shadow-xs">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Pratinjau Dokumen SPH Resmi (PDF)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrintTemplatePdf}
                      className="px-3 py-1.5 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTemplateDoc}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </button>
                  </div>
                </div>

                <div className="w-full bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden">
                  <iframe 
                    id="sph-template-pdf-frame"
                    src={templateDocUrl} 
                    className="w-full h-[780px] border-none" 
                    title="Pratinjau SPH Sesuai Template"
                  />
                </div>
              </div>
            ) : templateExt === 'xlsx' ? (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">File Excel SPH Siap Diunduh</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Template: <strong>{sphTemplateName}</strong> • {sph.items.length} alat medis terisi
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleDownloadTemplateDoc}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh File Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {templatePdfUrl && (
                  <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden">
                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Pratinjau Cetak Lembar Kerja Excel</span>
                      <button
                        type="button"
                        onClick={() => {
                          const iframe = document.getElementById('sph-template-pdf-frame') as HTMLIFrameElement | null;
                          iframe?.contentWindow?.print();
                        }}
                        className="px-3 py-1 bg-[#1C658C] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Cetak Versi PDF</span>
                      </button>
                    </div>
                    <iframe 
                      id="sph-template-pdf-frame"
                      src={templatePdfUrl} 
                      className="w-full h-[700px] border-none" 
                      title="Pratinjau PDF dari Excel SPH"
                    />
                  </div>
                )}
              </div>
            ) : templateExt === 'docx' ? (
              <div className="bg-white border border-blue-200 rounded-2xl p-8 max-w-2xl mx-auto my-12 text-center shadow-sm">
                <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Dokumen Word (.docx) SPH Terisi</h4>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Data penawaran Rumah Sakit <strong>{sph.hospitalName}</strong> telah berhasil dimasukkan ke dalam template Word <strong>{sphTemplateName}</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplateDoc}
                  className="px-5 py-2.5 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen Word SPH (.docx)</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          /* Printable Document Container (Standard Web HTML Mode) */
          <div 
            style={{ fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' }} 
            className="p-4 sm:p-8 bg-[#EEEEEE]/60 overflow-y-auto space-y-8 print:p-0 print:space-y-0 print:bg-white text-slate-900"
          >
            
            {/* ========================================================================= */}
            {/* HALAMAN 1: SURAT PENGANTAR RESMI SPH                                      */}
            {/* ========================================================================= */}
            {(activeViewTab === 'all' || activeViewTab === 'page1') && (
              <div 
                style={{ fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' }}
                className={`bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl max-w-[210mm] mx-auto min-h-[297mm] relative overflow-hidden flex flex-col justify-between print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-0 print-page-clean ${activeViewTab === 'all' ? 'print-break-after' : 'print-no-break-after'}`}
              >
                
                {/* KOP SURAT RESMI PT SARANA MULTI KALIBRASI (Menggunakan customLetterheadUrl jika ada) */}
                <div>
                  <OfficialLetterhead customLetterheadUrl={templatesConfig?.kop_surat?.activeUrl} className="mb-4" />

                  {/* Surat Meta (Nomor, Perihal, Tanggal, Kepada) */}
                  {/* Header Resmi SPH (Nomor, Perihal, Lampiran) */}
                  <div className="flex justify-between items-start mb-2 text-xs sm:text-[13.5px] leading-relaxed">
                    {/* Sisi Kiri: Nomor, Perihal, Lampiran */}
                    <div className="space-y-0.5">
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Nomor</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{sph.sphNumber}</span>
                      </div>
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Perihal</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{sph.subject || 'Surat Penawaran Harga Kalibrasi'}</span>
                      </div>
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Lampiran</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{dynamicAttachmentText}</span>
                      </div>
                    </div>

                    {/* Sisi Kanan: Tempat & Tanggal */}
                    <div className="text-right text-xs sm:text-[14px] font-normal text-slate-900">
                      {sph.city || 'Surakarta'}, {formattedDate}
                    </div>
                  </div>

                  {/* Garis Pembatas Horizontal Dekat dengan Lampiran */}
                  <div className="border-b border-slate-900 mb-5 pb-0.5" />

                  {/* Tujuan Surat (Kepada Yth) - Jarak 1 baris kosong dari garis */}
                  <div className="mb-5 text-xs sm:text-[14px] space-y-0.5">
                    <p className="text-slate-900 font-bold">Kepada Yth:</p>
                    <p className="font-normal text-slate-900">{sph.recipientRole || 'Direktur'}</p>
                    <p className="font-bold text-slate-950">{sph.hospitalName}</p>
                    <p className="text-slate-950 max-w-xl leading-relaxed text-xs sm:text-[13px]">
                      {sph.hospitalAddress}
                    </p>
                  </div>

                  {/* Isi Surat Pengantar */}
                  <div className="space-y-3.5 text-xs sm:text-[13.5px] leading-relaxed text-slate-900 text-justify mb-4">
                    {/* Jarak 1 baris kosong sebelum Dengan Hormat */}
                    <p className="font-bold pt-1">Dengan Hormat,</p>
                    <p>
                      Menindaklanjuti mengenai permintaan Kalibrasi alat Kesehatan, <strong>PT. Sarana Multi Kalibrasi</strong> telah memiliki izin dari Kementrian Kesehatan dengan No. 26062301565850001, Sertifikat Akreditasi KAN LK-532-IDN serta menerapkan Standar SNI ISO/ IEC 17025: 2017, melampirkan harga penawaran, adapun ketentuan yang berlaku sebagai berikut:
                    </p>

                    {/* 9 Poin Ketentuan Resmi - Jarak 1 baris kosong dari kalimat di atasnya */}
                    <ol className="list-decimal list-outside ml-5 space-y-1 text-slate-900 text-xs sm:text-[13.5px] text-justify pt-1">
                      <li>{sph.isPpnIncluded ? 'Harga sudah termasuk PPN 11%.' : 'Harga belum termasuk PPN 11%.'}</li>
                      <li>Harga sudah termasuk biaya transportasi dan akomodasi.</li>
                      <li>Harga tidak termasuk service dan maintenance.</li>
                      <li>Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.</li>
                      <li>Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.</li>
                      <li>Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.</li>
                      <li>Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.</li>
                      <li>Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.</li>
                      <li>
                        <div>Pembayaran :</div>
                        <div className="pt-1.5 pl-0 sm:pl-[24px] font-bold space-y-0.5">
                          {sph.paymentOption === 'jateng' ? (
                            <div>Bank Jateng : 1-002-01495-1 (SARANA MULTI KALIBRASI PT)</div>
                          ) : sph.paymentOption === 'mandiri' ? (
                            <div>Bank Mandiri : 138-00-2610846-9 (SARANA MULTI KALIBRASI PT)</div>
                          ) : sph.paymentOption === 'custom' && sph.customBankDetails ? (
                            <div>{sph.customBankDetails}</div>
                          ) : (
                            <>
                              <div>1. Bank Jateng : 1-002-01495-1 (SARANA MULTI KALIBRASI PT)</div>
                              <div>2. Bank Mandiri : 138-00-2610846-9 (SARANA MULTI KALIBRASI PT)</div>
                            </>
                          )}
                        </div>
                      </li>
                    </ol>

                    {/* Jarak 1 baris kosong sebelum dan sesudah paragraf permohonan */}
                    <p className="pt-2 pb-2 text-justify">
                      Bersama ini kami bermaksud mengajukan permohonan persetujuan Surat Penawaran Harga.
                    </p>
                    {/* Jarak 1 baris kosong sebelum dan sesudah paragraf marketing */}
                    <p className="pb-0 text-justify">
                      Untuk informasi lebih lanjut dapat menghubungi marketing kami di : <strong>{sph.marketingStaffPhone || '0821-3670-7421'} ({sph.marketingStaffName || 'Sulis'})</strong>. Demikian, atas perhatian dan kerjasamanya kami ucapkan terimakasih.
                    </p>
                  </div>

                  {/* Area Tanda Tangan: Spasi lebih rapat dan proporsional di bawah kalimat marketing */}
                  <div className="grid grid-cols-2 gap-8 pt-3 pb-4 text-xs sm:text-[14px]">
                    {/* Pihak SMK (Rata Tengah) */}
                    <div className="text-center flex flex-col justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-950 text-center text-xs sm:text-[14px]">PT. SARANA MULTI KALIBRASI</p>
                      </div>
                      
                      {/* TTD & Stempel Box: Ruang tanda tangan proporsional terpusat */}
                      <div className="h-28 flex items-center justify-center relative my-1 w-full">
                        {/* Authentic SMK Logo Stamp */}
                        <div className="opacity-80 scale-90">
                          <CompanyLogo size="lg" variant="light" showSubtitle={false} />
                        </div>
                        {/* Authentic Signature overlay */}
                        {digitalSignatureUrl ? (
                          <img 
                            src={digitalSignatureUrl} 
                            alt="Tanda Tangan Digital Direktur" 
                            className="absolute h-24 max-w-[170px] object-contain z-10" 
                          />
                        ) : (
                          <svg className="absolute w-44 h-24 pointer-events-none" viewBox="0 0 200 100" fill="none">
                            <path d="M 20 60 Q 40 10, 60 70 T 90 30 Q 110 80, 130 40 L 160 55 M 30 50 L 170 45" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                          </svg>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="font-bold text-slate-950 text-center text-[11pt] leading-tight">
                          {sph.directorName || 'Ahmad Fajar Ariyanto'}
                        </p>
                        <p className="text-[11pt] text-slate-950 font-normal text-center leading-tight">{sph.directorTitle || 'Direktur'}</p>
                      </div>
                    </div>

                    {/* Pihak Pelanggan (Rumah Sakit) (Rata Tengah) */}
                    <div className="text-center flex flex-col justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-950 text-center text-xs sm:text-[14px]">Disetujui oleh Pelanggan,</p>
                      </div>

                      {/* Ruang kosong proporsional untuk tanda tangan basah dan cap basah pelanggan */}
                      <div className="h-28 flex items-center justify-center w-full">
                      </div>

                      <div className="text-center">
                        <p className="font-normal text-slate-900 text-center text-[11pt] leading-tight">
                          ( ………………………………… )
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Resmi PT SMK (Sesuai Layout SPH) */}
                <OfficialLetterFooter className="mt-4" />

              </div>
            )}

            {/* ========================================================================= */}
            {/* HALAMAN 2+: LAMPIRAN RINCIAN SURAT PENAWARAN HARGA (TABEL ALAT & HARGA)   */}
            {/* ========================================================================= */}
            {(activeViewTab === 'all' || activeViewTab === 'page2') && itemChunks.map((chunk, chunkIndex) => (
              <div 
                key={`chunk-${chunkIndex}`}
                style={{ fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' }}
                className={`bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl max-w-[210mm] mx-auto min-h-[297mm] relative overflow-hidden flex flex-col justify-between print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-0 print-page-clean ${chunkIndex > 0 ? 'print-break-after' : ''} ${chunkIndex < itemChunks.length - 1 ? 'print-break-after' : 'print-no-break-after'}`}
              >
                <div>
                  {/* KOP SURAT LAMPIRAN SPH (Menggunakan customLetterheadUrl jika ada) */}
                  <OfficialLetterhead customLetterheadUrl={templatesConfig?.kop_surat?.activeUrl} className="mb-4" />

                  {/* Header Meta SPH Lampiran */}
                  <div className="flex justify-between items-start mb-2 text-xs sm:text-[13.5px] leading-relaxed">
                    <div className="space-y-0.5">
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Nomor</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{sph.sphNumber}</span>
                      </div>
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Perihal</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{sph.subject || 'Surat Penawaran Harga Kalibrasi'}</span>
                      </div>
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Lampiran</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{dynamicAttachmentText}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs sm:text-[13.5px] font-normal text-slate-900">
                      {sph.city || 'Surakarta'}, {formattedDate}
                    </div>
                  </div>

                  {/* Judul Dokumen Lampiran - Hanya di Halaman 1 Tabel (Polos tanpa bingkai) */}
                  {chunkIndex === 0 && (
                    <div className="text-center my-3 pb-1">
                      <span className="text-sm sm:text-base font-bold text-slate-950 tracking-wide">
                        Surat Penawaran Harga
                      </span>
                    </div>
                  )}

                  {/* Tabel Rincian Alat Medis */}
                  <div className={`overflow-x-auto ${chunkIndex > 0 ? 'mt-4' : ''}`}>
                    <table className="w-full text-left border-collapse border border-black text-xs sm:text-[13.5px]">
                      {chunkIndex === 0 && (
                        <thead>
                          <tr className="bg-[#00A2E8] text-white font-bold border-b border-black text-center">
                            <th className="border border-black px-2 py-2 w-10 text-center text-white">No.</th>
                            <th className="border border-black px-3 py-2 text-center text-white">Diskripsi</th>
                            <th className="border border-black px-2 py-2 w-12 text-center text-white">Qty</th>
                            <th className="border border-black px-2 py-2 w-14 text-center text-white">Satuan</th>
                            <th className="border border-black px-3 py-2 w-28 text-center text-white">Harga Satuan</th>
                            <th className="border border-black px-3 py-2 w-32 text-center text-white">Total Harga</th>
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {chunk.items.map((item, index) => {
                          const globalIndex = item.no || (chunk.startIndex + index + 1);
                          return (
                            <tr key={item.id || index} className="border-b border-black/40 hover:bg-slate-50/50 bg-white">
                              <td className="border border-black px-2 py-1.5 text-center font-medium">{globalIndex}</td>
                              <td className="border border-black px-3 py-1.5 text-left whitespace-normal break-words max-w-xs">
                                <div className="font-semibold text-slate-950 text-left whitespace-normal break-words leading-tight">{item.description}</div>
                                {item.notes && (
                                   <div className="text-[11px] text-slate-700 italic text-left whitespace-normal break-words leading-tight mt-0.5">{item.notes}</div>
                                )}
                              </td>
                              <td className="border border-black px-2 py-1.5 text-center font-medium">{item.quantity}</td>
                              <td className="border border-black px-2 py-1.5 text-center text-slate-800">{item.unit || 'Unit'}</td>
                              <td className="border border-black px-3 py-1.5 font-mono text-slate-900">
                                <div className="flex justify-between items-center">
                                  <span>Rp</span>
                                  <span>{formatNumber(item.unitPrice)}</span>
                                </div>
                              </td>
                              <td className="border border-black px-3 py-1.5 font-mono font-semibold text-slate-950">
                                <div className="flex justify-between items-center">
                                  <span>Rp</span>
                                  <span>{formatNumber(item.totalPrice)}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* Baris Total Biaya & Terbilang (Hanya tampil di halaman penutup summary) */}
                      {chunk.hasSummary && (
                        <tfoot className="font-bold border-t-2 border-black text-xs sm:text-[13.5px]">
                          {/* Row 1: Jumlah (Biru Muda) & Total 1 (Putih Polos) */}
                          <tr className="border-b border-black">
                            <td colSpan={2} className="border border-black px-3 py-2 text-center font-bold text-white bg-[#00A2E8]">
                              Jumlah
                            </td>
                            <td className="border border-black px-2 py-2 text-center font-bold text-white bg-[#00A2E8]">
                              {totalUnits}
                            </td>
                            <td className="border border-black px-2 py-2 text-center text-white font-bold bg-[#00A2E8]">
                              Unit
                            </td>
                            <td className="border border-black px-3 py-2 text-right font-bold text-slate-950 bg-white pr-3">
                              Total 1
                            </td>
                            <td className="border border-black px-3 py-2 font-mono font-bold bg-white">
                              <div className="flex justify-between items-center">
                                <span>Rp</span>
                                <span>{formatNumber(sph.subtotal1)}</span>
                              </div>
                            </td>
                          </tr>

                          {/* Row 2+: Terbilang Box on Left (colspan 4) & Summary Breakdown on Right (colspan 2) */}
                          <tr className="border-b border-black">
                            {/* Terbilang Box: Label Rata Kiri & Italic, Angka Center di baris bawah & Italic */}
                            <td colSpan={4} rowSpan={4} className="border border-black p-3 align-top bg-white">
                              <div className="text-xs sm:text-[13.5px] font-bold italic text-slate-950 mb-1 text-left">Terbilang:</div>
                              <div className="text-xs sm:text-[13.5px] font-bold italic text-slate-900 leading-relaxed max-w-sm mx-auto text-center pt-1">
                                "{sph.terbilang || '-'}"
                              </div>
                            </td>
                            {/* Akomodasi */}
                            <td className="border border-black px-3 py-2 text-right font-bold text-slate-950 bg-white pr-3">
                              Akomodasi
                            </td>
                            <td className="border border-black px-3 py-2 font-mono bg-white">
                              <div className="flex justify-between items-center">
                                <span>Rp</span>
                                <span>{sph.accommodationFee > 0 ? formatNumber(sph.accommodationFee) : '-'}</span>
                              </div>
                            </td>
                          </tr>

                          {/* Total 2 */}
                          <tr className="border-b border-black">
                            <td className="border border-black px-3 py-2 text-right font-bold text-slate-950 bg-white pr-3">
                              Total 2
                            </td>
                            <td className="border border-black px-3 py-2 font-mono bg-white">
                              <div className="flex justify-between items-center">
                                <span>Rp</span>
                                <span>{formatNumber(sph.subtotal2 || (sph.subtotal1 + (sph.accommodationFee || 0)))}</span>
                              </div>
                            </td>
                          </tr>

                          {/* PPN 11% */}
                          <tr className="border-b border-black">
                            <td className="border border-black px-3 py-2 text-right font-bold text-slate-950 bg-white pr-3">
                              {sph.isPpnIncluded ? 'PPN 11%' : 'PPN 11% (Non)'}
                            </td>
                            <td className="border border-black px-3 py-2 font-mono bg-white">
                              <div className="flex justify-between items-center">
                                <span>Rp</span>
                                <span>{formatNumber(sph.ppnAmount)}</span>
                              </div>
                            </td>
                          </tr>

                          {/* GRAND TOTAL */}
                          <tr className="bg-[#00A2E8] text-white border-b border-black font-extrabold text-sm sm:text-base">
                            <td className="border border-black px-3 py-2.5 text-right tracking-wide font-bold text-white pr-3">
                              GRAND TOTAL
                            </td>
                            <td className="border border-black px-3 py-2.5 font-mono font-bold text-white">
                              <div className="flex justify-between items-center">
                                <span>Rp</span>
                                <span>{formatNumber(sph.grandTotal)}</span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Catatan Kaki (Hanya di chunk terakhir) */}
                  {chunkIndex === itemChunks.length - 1 && (
                    <div className="mt-4 text-[10.5px] sm:text-[11px] text-slate-950 italic space-y-0.5 pt-1">
                      <p>*Hanya dilakukan Uji Keselamatan Listrik dan/atau Uji Fungsi dan Kondisi Alat</p>
                      <p>**Alat dilakukan penarikan ke PT Sarana Multi Kalibrasi</p>
                      <p>***Alat dilakukan penarikan untuk subkontraktor pekerjaan</p>
                      <p>****Tidak termasuk jenis alat wajib kalibrasi</p>
                    </div>
                  )}
                </div>

                {/* Footer Resmi PT SMK (Sesuai Layout SPH) */}
                <OfficialLetterFooter className="mt-6" />

              </div>
            ))}

            {/* ========================================================================= */}
            {/* HALAMAN 3: LAMPIRAN LINK E-CATALOGUE INAPROC (1 FILE TAPI BERBEDA LEMBAR) */}
            {/* Urutan tabel dari kiri ke kanan: No, Nama Alat, Qty, Satuan Harga, Total Harga, Link E-Catalogue */}
            {/* ========================================================================= */}
            {sph.sphType === 'ecatalogue' && (activeViewTab === 'all' || activeViewTab === 'page3') && (
              <div 
                style={{ fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' }}
                className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl max-w-[210mm] mx-auto min-h-[297mm] relative overflow-hidden flex flex-col justify-between print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-0 print-page-clean print-break-before"
              >
                <div>
                  {/* KOP SURAT LAMPIRAN E-CATALOGUE */}
                  <OfficialLetterhead customLetterheadUrl={templatesConfig?.kop_surat?.activeUrl} className="mb-4" />

                  {/* Header Meta SPH Lampiran E-Catalogue */}
                  <div className="flex justify-between items-start mb-2 text-xs sm:text-[13.5px] leading-relaxed">
                    <div className="space-y-0.5">
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Nomor</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{sph.sphNumber}</span>
                      </div>
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Perihal</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{sph.subject || 'Surat Penawaran Harga Kalibrasi'}</span>
                      </div>
                      <div className="grid grid-cols-[75px_12px_1fr]">
                        <span className="font-bold text-slate-950">Lampiran</span>
                        <span className="font-bold">:</span>
                        <span className="font-normal text-slate-900">{dynamicAttachmentText}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs sm:text-[13.5px] font-normal text-slate-900">
                      {sph.city || 'Surakarta'}, {formattedDate}
                    </div>
                  </div>

                  {/* Judul Dokumen Lampiran E-Catalogue */}
                  <div className="text-center my-3 pb-1">
                    <span className="text-sm sm:text-base font-bold text-slate-950 tracking-wide">
                      Surat Penawaran Harga
                    </span>
                  </div>

                  {/* Tabel E-Catalogue (Urutan: No, Nama Alat, Qty, Satuan Harga, Total Harga, Link E-Catalogue) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-black text-xs sm:text-[13px]">
                      <thead>
                        <tr className="bg-[#00A2E8] text-white font-bold border-b border-black text-center">
                          <th className="border border-black px-2 py-2 w-10 text-center text-white">No</th>
                          <th className="border border-black px-3 py-2 w-36 text-center text-white">Nama Alat</th>
                          <th className="border border-black px-2 py-2 w-12 text-center text-white">Qty</th>
                          <th className="border border-black px-3 py-2 w-28 text-center text-white">Satuan Harga</th>
                          <th className="border border-black px-3 py-2 w-28 text-center text-white">Total Harga</th>
                          <th className="border border-black px-3 py-2 text-center text-white">Link E-Catalogue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sph.items.map((item, index) => {
                          const cleanToolName = extractCleanToolName(item.description || (item as any).namaAlat || '');
                          const resolvedLink = item.eCatalogueUrl || getECatalogueTariff(item.description)?.link || getECatalogueTariff(cleanToolName)?.link || 'https://katalog.inaproc.id/sarana-multi-kalibrasi';

                          return (
                            <tr key={item.id || index} className="border-b border-black hover:bg-slate-50/50">
                              <td className="border border-black px-2 py-1.5 text-center align-middle font-normal">
                                {item.no || index + 1}
                              </td>
                              <td className="border border-black px-3 py-1.5 align-middle font-normal text-slate-950">
                                {cleanToolName}
                              </td>
                              <td className="border border-black px-2 py-1.5 text-center align-middle font-normal">
                                {item.quantity}
                              </td>
                              <td className="border border-black px-3 py-1.5 align-middle font-mono">
                                <div className="flex justify-between items-center">
                                  <span>Rp</span>
                                  <span>{formatNumber(item.unitPrice)}</span>
                                </div>
                              </td>
                              <td className="border border-black px-3 py-1.5 align-middle font-mono">
                                <div className="flex justify-between items-center">
                                  <span>Rp</span>
                                  <span>{formatNumber(item.totalPrice)}</span>
                                </div>
                              </td>
                              <td className="border border-black px-3 py-1.5 align-middle text-xs sm:text-[13px] text-blue-700 break-all">
                                <a 
                                  href={resolvedLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="underline hover:text-blue-900 flex items-center gap-1"
                                >
                                  <span>{resolvedLink}</span>
                                  <ExternalLink className="w-3 h-3 inline-block shrink-0" />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        {/* Baris Jumlah Unit & Sub Total */}
                        <tr className="border-b border-black font-bold">
                          <td colSpan={2} className="border border-black px-3 py-2 text-center bg-[#00A2E8] text-white">
                            Jumlah Unit
                          </td>
                          <td className="border border-black px-2 py-2 text-center bg-[#00A2E8] text-white font-mono">
                            {totalUnits}
                          </td>
                          <td className="border border-black px-3 py-2 text-right bg-white text-slate-950 pr-3">
                            Sub Total
                          </td>
                          <td className="border border-black px-3 py-2 font-mono bg-white">
                            <div className="flex justify-between items-center">
                              <span>Rp</span>
                              <span>{formatNumber(sph.subtotal1)}</span>
                            </div>
                          </td>
                          <td className="border border-black px-3 py-2 bg-white"></td>
                        </tr>

                        {/* Baris Terbilang Box */}
                        {sph.terbilang && (
                          <tr className="border-b border-black">
                            <td colSpan={6} className="border border-black px-4 py-2.5 bg-white text-center font-bold italic text-slate-950">
                              Terbilang: "{sph.terbilang.replace(/^["']|["']$/g, '')}"
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Footer Resmi PT SMK */}
                <OfficialLetterFooter className="mt-6" />
              </div>
            )}

          </div>
        )}

      </div>

      {/* Authorized Digital Signature Pad Modal */}
      <SignaturePadModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSaveSignature={handleSaveSignature}
        initialSignerName={sph.directorName || 'Ahmad Fajar Ariyanto'}
        initialSignerRole={sph.directorTitle || 'Direktur PT. Sarana Multi Kalibrasi'}
        title="Bubuhkan Tanda Tangan Digital Direktur (SPH)"
      />
    </div>
  );
};