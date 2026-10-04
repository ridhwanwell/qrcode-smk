import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Download, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Building, 
  Edit3, 
  Archive, 
  CreditCard, 
  Hash, 
  UserCheck, 
  ExternalLink,
  DollarSign,
  FileUp,
  Loader2
} from 'lucide-react';
import { SphQuotation, SphDealData, BapDocument } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/helpers';
import { calculateBillingFromBap } from '../utils/billingHelpers';
import { 
  downloadBoPdf, 
  downloadFpPdf, 
  downloadKwpPdf, 
  downloadAllDealDocumentsZip 
} from '../utils/dealPdfExport';
import { SphDealModal } from './SphDealModal';
import { BapPdfImportModal } from './BapPdfImportModal';
import { readBapPdf, ParsedBapPdf, BapPdfKind } from '../utils/bapPdfImport';

interface HospitalBillingManagerProps {
  sphList: SphQuotation[];
  bapDocuments?: BapDocument[];
  onSaveDealData: (sphId: string, dealData: SphDealData) => void;
  onNavigateToSchedules?: () => void;
  /** Simpan hasil upload PDF BAP PO / Non PO ke data BAP. isNew = BAP belum pernah dibuat. */
  onApplyBapPdf?: (updatedBap: BapDocument, isNew: boolean) => void;
}

export const HospitalBillingManager: React.FC<HospitalBillingManagerProps> = ({
  sphList,
  bapDocuments = [],
  onSaveDealData,
  onNavigateToSchedules,
  onApplyBapPdf
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dealModalSph, setDealModalSph] = useState<SphQuotation | null>(null);
  const [statusFilter, setStatusFilter] = useState<'deal' | 'all'>('deal');

  // Upload PDF BAP -> sesuaikan harga BO dengan realisasi pengerjaan
  const [readingPdf, setReadingPdf] = useState<{ sphId: string; kind: BapPdfKind } | null>(null);
  const [pdfImport, setPdfImport] = useState<{ sph: SphQuotation; kind: BapPdfKind; parsed: ParsedBapPdf; fileName: string } | null>(null);

  const handleBapPdfSelected = async (sph: SphQuotation, kind: BapPdfKind, file?: File | null) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      alert('File harus berformat PDF.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran PDF terlalu besar (maksimal 15 MB).');
      return;
    }
    setReadingPdf({ sphId: sph.id, kind });
    try {
      const parsed = await readBapPdf(file);
      if (parsed.rows.length === 0) {
        alert(`PDF tidak bisa dibaca sebagai BAP.\n\n${parsed.warnings.join('\n')}`);
        return;
      }
      setPdfImport({ sph, kind, parsed, fileName: file.name });
    } catch (err) {
      console.error('Gagal membaca PDF BAP:', err);
      alert('Gagal membaca PDF BAP. Pastikan file adalah PDF BAP hasil export (bukan hasil scan).');
    } finally {
      setReadingPdf(null);
    }
  };

  // Filter SPH list
  const filteredSph = sphList.filter(sph => {
    const isDeal = sph.status === 'Disetujui (Deal)';
    if (statusFilter === 'deal' && !isDeal) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = sph.hospitalName.toLowerCase().includes(term);
    const sphNoMatch = sph.sphNumber.toLowerCase().includes(term);
    const boMatch = sph.dealData?.boNumber?.toLowerCase().includes(term);
    const fpMatch = sph.dealData?.fpNumber?.toLowerCase().includes(term);
    const kwpMatch = sph.dealData?.kwpNumber?.toLowerCase().includes(term);

    return nameMatch || sphNoMatch || boMatch || fpMatch || kwpMatch;
  });

  // Calculate statistics
  const dealSphList = sphList.filter(s => s.status === 'Disetujui (Deal)');
  const totalDealCount = dealSphList.length;
  const totalDealValue = dealSphList.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Receipt className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 rounded-xl text-blue-300">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Penagihan RS (Billing & Dokumen Deal)
                </h1>
                <p className="text-xs sm:text-sm text-blue-200/80">
                  Pusat Pengelolaan Parameter Deal dan Unduh Dokumen Bukti Order (BO), Faktur Penjualan (FP), & Kwitansi (KWP)
                </p>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-lg text-blue-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-blue-200 font-medium">Total SPH Deal</p>
                <p className="text-lg font-black text-white">{totalDealCount} Dokumen</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-lg text-emerald-300">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200 font-medium">Total Nilai Penagihan</p>
                <p className="text-lg font-black text-white">{formatRupiah(totalDealValue)}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 rounded-lg text-amber-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-amber-200 font-medium">Total Dokumen Siap Cetak</p>
                <p className="text-lg font-black text-white">{totalDealCount * 3} File PDF</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="bg-white border border-[#DCDFE3] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Rumah Sakit, No. SPH, No. BO, FP, KWP..."
              className="w-full bg-[#EEEEEE]/40 border border-[#DCDFE3] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setStatusFilter('deal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'deal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#EEEEEE] text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hanya SPH Deal ({totalDealCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#EEEEEE] text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua SPH ({sphList.length})
            </button>
          </div>
        </div>
      </div>

      {/* Billing SPH Cards Grid */}
      <div className="space-y-4">
        {filteredSph.length === 0 ? (
          <div className="bg-white border border-[#DCDFE3] rounded-2xl p-12 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-base">Tidak ada dokumen penagihan ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Coba sesuaikan kata kunci pencarian atau pastikan dokumen SPH telah disetujui (*Deal*) di menu Penawaran SPH.
            </p>
          </div>
        ) : (
          filteredSph.map((sph) => {
            const isDeal = sph.status === 'Disetujui (Deal)';
            const dealData = sph.dealData;
            const seqNo = dealData?.sequenceNumber || '081';
            const boNo = dealData?.boNumber || `${seqNo}/SMK-BO/IX-2026`;
            const fpNo = dealData?.fpNumber || `${seqNo}/SMK-FP/IX-2026`;
            const kwpNo = dealData?.kwpNumber || `${seqNo}/SMK-KWP/IX-2026`;
            const dealDateStr = dealData?.dealDate 
              ? formatIndonesianDate(dealData.dealDate) 
              : formatIndonesianDate(sph.date);

            const matchingBap = bapDocuments.find(b => b.sphId === sph.id || b.sphNumber === sph.sphNumber) || null;
            const billing = calculateBillingFromBap(sph, matchingBap);

            return (
              <div
                key={sph.id}
                className="bg-white border border-[#DCDFE3] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600 shrink-0" />
                      <h3 className="font-black text-slate-900 text-base">
                        {sph.hospitalName}
                      </h3>
                      {isDeal ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          DEAL
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold rounded-full">
                          {sph.status}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                      <span>No. SPH: <strong className="text-slate-800">{sph.sphNumber}</strong></span>
                      <span>Tanggal SPH: {sph.date}</span>
                      <span>Tanggal Deal: <strong className="text-blue-700 font-sans">{dealDateStr}</strong></span>
                    </div>
                  </div>

                  <div className="text-right md:self-center bg-blue-50/60 border border-blue-200/60 px-4 py-2 rounded-xl">
                    <div className="flex items-center justify-end gap-1.5">
                      <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wide">
                        {billing.isAdjustedFromBap ? 'Total Tagihan (Realisasi BAP)' : 'Total Nilai Penagihan'}
                      </p>
                      {billing.isAdjustedFromBap && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold">
                          BAP
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-black text-blue-900 font-mono">
                      {formatRupiah(billing.grandTotal)}
                    </p>
                    {billing.isAdjustedFromBap ? (
                      <p className="text-[10px] text-slate-500">
                        Realisasi: <strong className="text-emerald-700">{billing.totalRealizedUnits} unit</strong> / PO: {billing.totalPoUnits} unit
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500">
                        Total Item: {billing.totalPoUnits} Unit
                      </p>
                    )}
                  </div>
                </div>

                {/* Parameter Deal Summary Table */}
                <div className="bg-[#EEEEEE]/30 border border-[#DCDFE3]/80 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-[#DCDFE3]/60 pb-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Hash className="w-4 h-4 text-blue-600" />
                      <span>Parameter Nomor Dokumen Deal</span>
                      {billing.isAdjustedFromBap && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] rounded font-semibold">
                          Tagihan dihitung dari Realisasi BAP ({billing.totalRealizedUnits} unit)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDealModalSph(sph)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Parameter Deal</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">1. Bukti Order (BO)</p>
                      <p className="font-mono font-bold text-slate-900 text-xs truncate">{boNo}</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">2. Faktur Penjualan (FP)</p>
                      <p className="font-mono font-bold text-slate-900 text-xs truncate">{fpNo}</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">3. Kwitansi Penjualan (KWP)</p>
                      <p className="font-mono font-bold text-slate-900 text-xs truncate">{kwpNo}</p>
                    </div>
                  </div>

                  {dealData?.paymentMethod && (
                    <div className="text-[11px] text-slate-600 pt-1 flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Rekening: <strong>{dealData.paymentMethod}</strong></span>
                    </div>
                  )}
                </div>

                {/* Status upload BAP */}
                {onApplyBapPdf && (() => {
                  const nonPoBilled = (matchingBap?.nonPoItems || []).filter(it => (Number(it.total) || 0) > 0);
                  const poUnits = (matchingBap?.items || []).reduce((sum, it) => sum + (Number(it.total) || 0), 0);
                  const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className={`px-3 py-2 rounded-lg border ${matchingBap?.realizationSource === 'pdf_upload' ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <strong>BAP PO:</strong>{' '}
                        {matchingBap?.realizationSource === 'pdf_upload'
                          ? <>sudah diupload ({poUnits}/{billing.totalPoUnits} unit) • {fmtTime(matchingBap.realizationUploadedAt)}</>
                          : 'belum diupload — tagihan masih sesuai SPH'}
                      </div>
                      <div className={`px-3 py-2 rounded-lg border ${matchingBap?.nonPoRealizationSource === 'pdf_upload' || nonPoBilled.length > 0 ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <strong>BAP Non PO:</strong>{' '}
                        {nonPoBilled.length > 0
                          ? <>{nonPoBilled.length} alat ({nonPoBilled.reduce((s2, it) => s2 + (Number(it.total) || 0), 0)} unit) ikut ditagihkan{matchingBap?.nonPoRealizationUploadedAt ? ` • ${fmtTime(matchingBap.nonPoRealizationUploadedAt)}` : ''}</>
                          : 'tidak ada'}
                      </div>
                    </div>
                  );
                })()}

                {/* Download Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* BO Download */}
                    <button
                      type="button"
                      onClick={() => downloadBoPdf(sph, dealData, matchingBap)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Unduh PDF Bukti Order (BO) - Menyesuaikan Realisasi BAP"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh BO</span>
                    </button>

                    {/* FP Download */}
                    <button
                      type="button"
                      onClick={() => downloadFpPdf(sph, dealData, matchingBap)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Unduh PDF Faktur Penjualan (FP) - Menyesuaikan Realisasi BAP"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh FP</span>
                    </button>

                    {/* KWP Download */}
                    <button
                      type="button"
                      onClick={() => downloadKwpPdf(sph, dealData, matchingBap)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Unduh PDF Kwitansi Penjualan (KWP) - Menyesuaikan Realisasi BAP"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh KWP</span>
                    </button>

                    {/* All ZIP */}
                    <button
                      type="button"
                      onClick={() => downloadAllDealDocumentsZip(sph, dealData, matchingBap)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Unduh Paket Lengkap (BO, FP, KWP, BAP, SPH) dalam 1 File ZIP"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Paket Lengkap (ZIP)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {onApplyBapPdf && (['po', 'non_po'] as BapPdfKind[]).map(kind => {
                      const isReading = readingPdf?.sphId === sph.id && readingPdf.kind === kind;
                      const isPo = kind === 'po';
                      return (
                        <label
                          key={kind}
                          className={`px-3 py-1.5 bg-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs border ${isPo ? 'hover:bg-purple-50 text-purple-900 border-purple-300' : 'hover:bg-orange-50 text-orange-900 border-orange-300'} ${readingPdf ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                          title={isPo
                            ? 'Upload PDF BAP PO yang sudah ditandatangani. Harga BO/FP/KWP mengikuti Volume Realisasi.'
                            : 'Upload PDF BAP Non PO (alat tambahan di luar SPH). Harga diambil dari katalog dan bisa diedit.'}
                        >
                          {isReading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileUp className="w-3.5 h-3.5" />}
                          <span>{isReading ? 'Membaca PDF...' : isPo ? 'Upload BAP PO' : 'Upload BAP Non PO'}</span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={readingPdf !== null}
                            onChange={e => {
                              const f = e.target.files?.[0];
                              e.target.value = '';
                              handleBapPdfSelected(sph, kind, f);
                            }}
                          />
                        </label>
                      );
                    })}

                    {onNavigateToSchedules && (
                      <button
                        type="button"
                        onClick={onNavigateToSchedules}
                        className="px-3 py-1.5 bg-[#1C658C] hover:bg-[#144966] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Jadwal RS</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Pratinjau Upload PDF BAP */}
      {pdfImport && onApplyBapPdf && (
        <BapPdfImportModal
          kind={pdfImport.kind}
          sph={pdfImport.sph}
          bap={bapDocuments.find(b => b.sphId === pdfImport.sph.id || b.sphNumber === pdfImport.sph.sphNumber) || null}
          parsed={pdfImport.parsed}
          fileName={pdfImport.fileName}
          onClose={() => setPdfImport(null)}
          onApply={(updatedBap, isNew) => {
            onApplyBapPdf(updatedBap, isNew);
            setPdfImport(null);
          }}
        />
      )}

      {/* Modal Parameter Deal */}
      {dealModalSph && (
        <SphDealModal
          sph={dealModalSph}
          bapDocument={bapDocuments.find(b => b.sphId === dealModalSph.id || b.sphNumber === dealModalSph.sphNumber) || null}
          isOpen={true}
          onClose={() => setDealModalSph(null)}
          onSaveDeal={(sphId, dealData) => {
            onSaveDealData(sphId, dealData);
            setDealModalSph(null);
          }}
        />
      )}
    </div>
  );
};
