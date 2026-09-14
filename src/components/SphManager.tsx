import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Edit3, 
  Trash2, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Calculator, 
  ArrowRight,
  TrendingUp,
  DollarSign,
  Download,
  Share2,
  BookOpen,
  Filter,
  Check,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Send,
  ThumbsUp,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { SphQuotation, Hospital, BapDocument } from '../types';
import { SPH_TARIFF_CATALOG } from '../data/sphTariffCatalog';
import { formatRupiah, formatNumber } from '../utils/sphHelpers';
import { exportSphToWord } from '../utils/sphWordExport';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { exportBapToExcel } from '../utils/bapExcelExport';
import { createBapFromSph } from '../utils/bapHelpers';
import { downloadSphPdf } from '../utils/sphPdfExport';

interface SphManagerProps {
  sphList: SphQuotation[];
  onOpenNewSph: () => void;
  onEditSph: (sph: SphQuotation) => void;
  onPrintSph: (sph: SphQuotation) => void;
  onDeleteSph: (id: string) => void;
  onConvertToSpk: (sph: SphQuotation) => void;
  onUpdateStatus?: (sphId: string, newStatus: SphQuotation['status']) => void;
  onNavigateToSchedules?: () => void;
  hospitals: Hospital[];
  bapDocuments?: BapDocument[];
  onOpenBap?: (sph: SphQuotation) => void;
}

export const SphManager: React.FC<SphManagerProps> = ({
  sphList,
  onOpenNewSph,
  onEditSph,
  onPrintSph,
  onDeleteSph,
  onConvertToSpk,
  onUpdateStatus,
  onNavigateToSchedules,
  hospitals,
  bapDocuments = [],
  onOpenBap
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [deleteTargetSph, setDeleteTargetSph] = useState<SphQuotation | null>(null);
  const [showStatusGuide, setShowStatusGuide] = useState(true);

  // Quick BAP Excel exporter
  const handleDownloadBap = (sph: SphQuotation) => {
    const existingBap = bapDocuments?.find(b => b.sphId === sph.id || b.sphNumber === sph.sphNumber);
    const bapToExport = existingBap || createBapFromSph(sph);
    exportBapToExcel(bapToExport);
  };

  // Stats calculation
  const totalSphCount = sphList.length;
  const dealSphList = sphList.filter(s => s.status === 'Disetujui (Deal)');
  const negotiationSphList = sphList.filter(s => s.status === 'Negosiasi');
  
  const totalPipelineValue = sphList.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const totalDealValue = dealSphList.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const totalUnitsOffered = sphList.reduce((acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0), 0);

  // Filter list
  const filteredSphList = sphList.filter(sph => {
    const matchesSearch = 
      sph.sphNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sph.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sph.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sph.items.some(it => it.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || sph.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Header - Flux Theme */}
      <div className="bg-gradient-to-r from-[#1C658C] via-[#144966] to-[#0F364C] border border-[#144966] rounded-2xl p-6 shadow-xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#398AB9]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#398AB9]/25 text-[#EEEEEE] text-xs px-3 py-0.5 rounded-full font-mono border border-[#398AB9]/40 font-semibold">
                Permenkes No. 54/2015 & LK-532-IDN
              </span>
              <span className="text-[#D8D2CB] text-xs">• PT. Sarana Multi Kalibrasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Surat Penawaran Harga (SPH) Kalibrasi
            </h1>
            <p className="text-sm text-[#D8D2CB] max-w-2xl mt-1 leading-relaxed">
              Kelola dokumen penawaran harga resmi, katalog tarif 121 alat brosur, dan simulasi negosiasi target deal rumah sakit dengan perhitungan PPN 11% proporsional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCatalogModal(true)}
              className="px-4 py-2.5 bg-[#0F364C] hover:bg-[#144966] text-[#EEEEEE] text-xs font-semibold rounded-xl border border-[#398AB9]/40 transition-all flex items-center gap-2 shadow-sm"
            >
              <BookOpen className="w-4 h-4 text-[#398AB9]" />
              <span>Katalog Tarif Brosur (121 Alat)</span>
            </button>

            <button
              onClick={onOpenNewSph}
              className="px-5 py-2.5 bg-[#398AB9] hover:bg-[#2b769f] active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#1C658C]/30 border border-[#398AB9]/60 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Buat SPH Baru</span>
            </button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1C658C]">
          
          <div className="bg-[#0F364C]/70 border border-[#1C658C] p-4 rounded-xl">
            <div className="flex items-center justify-between text-[#D8D2CB] mb-1">
              <span className="text-xs font-medium">Total SPH Diterbitkan</span>
              <FileText className="w-4 h-4 text-[#398AB9]" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {totalSphCount}
            </div>
            <span className="text-[11px] text-[#D8D2CB]/80 mt-1 block">
              {totalUnitsOffered} Total unit alat
            </span>
          </div>

          <div className="bg-[#0F364C]/70 border border-[#1C658C] p-4 rounded-xl">
            <div className="flex items-center justify-between text-[#D8D2CB] mb-1">
              <span className="text-xs font-medium">Nilai Pipeline Penawaran</span>
              <TrendingUp className="w-4 h-4 text-[#398AB9]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#EEEEEE]">
              {formatRupiah(totalPipelineValue)}
            </div>
            <span className="text-[11px] text-[#D8D2CB]/80 mt-1 block">
              Semua status penawaran
            </span>
          </div>

          <div className="bg-[#0F364C]/70 border border-[#1C658C] p-4 rounded-xl">
            <div className="flex items-center justify-between text-[#D8D2CB] mb-1">
              <span className="text-xs font-medium">Nilai Deal Disetujui RS</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-300">
              {formatRupiah(totalDealValue)}
            </div>
            <span className="text-[11px] text-emerald-300 mt-1 block font-medium">
              {dealSphList.length} SPH disetujui (Deal)
            </span>
          </div>

          <div className="bg-[#0F364C]/70 border border-[#1C658C] p-4 rounded-xl">
            <div className="flex items-center justify-between text-[#D8D2CB] mb-1">
              <span className="text-xs font-medium">Dalam Tahap Negosiasi</span>
              <Calculator className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">
              {negotiationSphList.length} SPH
            </div>
            <span className="text-[11px] text-[#D8D2CB]/80 mt-1 block">
              Menunggu target kesepakatan
            </span>
          </div>

        </div>
      </div>

      {/* Panduan Alur & Arti Status SPH */}
      <div className="bg-white border border-[#D8D2CB] rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowStatusGuide(!showStatusGuide)}
          className="w-full px-5 py-3.5 bg-[#EEEEEE]/50 hover:bg-[#EEEEEE] flex items-center justify-between transition-colors border-b border-[#D8D2CB]"
        >
          <div className="flex items-center gap-2.5 text-left">
            <div className="p-1.5 bg-[#1C658C]/10 text-[#1C658C] rounded-lg">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1C658C] flex items-center gap-2">
                <span>Panduan Alur & Arti Perbedaan Status SPH</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-[#398AB9]/15 text-[#1C658C] font-mono font-semibold">
                  SOP Penawaran ke Penjadwalan RS
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Pahami tahapan status dari draf internal hingga deal dan masuk otomatis ke jadwal kalibrasi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#1C658C] font-semibold">
            <span>{showStatusGuide ? 'Tutup Panduan' : 'Lihat Panduan'}</span>
            {showStatusGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showStatusGuide && (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white">
            {/* 1. Semua Status */}
            <div className="p-3 rounded-xl bg-[#EEEEEE]/40 border border-[#D8D2CB] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEEEEE] text-slate-700 border border-[#D8D2CB]">
                  Semua Status
                </span>
                <span className="text-xs font-semibold text-[#1C658C]">Rekapitulasi Lengkap</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Menampilkan seluruh dokumen penawaran harga (SPH) tanpa penyaringan status, baik yang masih draf maupun yang telah selesai.
              </p>
            </div>

            {/* 2. Draft */}
            <div className="p-3 rounded-xl bg-[#EEEEEE]/40 border border-[#D8D2CB] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  Draft
                </span>
                <span className="text-xs font-semibold text-slate-800">Konsep Awal Internal</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                SPH baru disusun oleh admin atau tim marketing. Masih berupa draf internal dan <strong className="text-slate-700">belum dikirimkan</strong> ke pihak manajemen rumah sakit.
              </p>
            </div>

            {/* 3. Terkirim ke RS */}
            <div className="p-3 rounded-xl bg-[#398AB9]/10 border border-[#398AB9]/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#398AB9]/20 text-[#1C658C] border border-[#398AB9]/30 flex items-center gap-1">
                  <Send className="w-2.5 h-2.5" />
                  Terkirim ke RS
                </span>
                <span className="text-xs font-semibold text-[#1C658C]">Menunggu Review RS</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Surat penawaran resmi telah diserahkan/dikirimkan ke Direktur atau Ka. IPSRS. Sedang dalam peninjauan oleh manajemen rumah sakit.
              </p>
            </div>

            {/* 4. Negosiasi */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Calculator className="w-2.5 h-2.5" />
                  Negosiasi
                </span>
                <span className="text-xs font-semibold text-amber-900">Penyesuaian Anggaran</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Pihak RS meminta potongan tarif, diskon paket, atau plafon anggaran khusus. Gunakan fitur kalkulator pintar untuk meratakan diskon per item alkes.
              </p>
            </div>

            {/* 5. Disetujui (Deal) */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1.5 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Disetujui (Deal) ⚡
                </span>
                <span className="text-xs font-semibold text-emerald-900">Sepakat & Terjadwal</span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Penawaran telah disepakati oleh RS. <strong className="text-emerald-950 font-bold">Otomatis masuk ke Penjadwalan Kalibrasi RS</strong>, penetapan teknisi, nomor label, dan siap cetak SPK!
              </p>
            </div>

            {/* 6. Ditolak */}
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <XCircle className="w-2.5 h-2.5" />
                  Ditolak
                </span>
                <span className="text-xs font-semibold text-rose-900">Tidak Disepakati</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Penawaran harga tidak disepakati atau dibatalkan oleh pihak rumah sakit (misal kendala anggaran atau memilih vendor lain).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#D8D2CB] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor SPH, rumah sakit, atau nama alat..."
            className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-[#1C658C] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#1C658C]" />
            <span>Status:</span>
          </span>
          {['all', 'Draft', 'Terkirim ke RS', 'Negosiasi', 'Disetujui (Deal)', 'Ditolak'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-[#1C658C] text-white shadow-sm font-semibold'
                  : 'bg-[#EEEEEE] text-slate-600 hover:text-[#1C658C] hover:bg-[#D8D2CB]/50 border border-[#D8D2CB]'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st}
            </button>
          ))}
        </div>

      </div>

      {/* SPH List Cards */}
      <div className="space-y-4">
        {filteredSphList.length === 0 ? (
          <div className="bg-white border border-[#D8D2CB] rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-sm">
            <FileText className="w-12 h-12 text-[#D8D2CB] mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Belum Ada Dokumen SPH yang Sesuai</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tidak ditemukan penawaran harga dengan kata kunci atau filter status yang dipilih.
            </p>
            <button
              onClick={onOpenNewSph}
              className="px-4 py-2 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buat SPH Baru Sekarang</span>
            </button>
          </div>
        ) : (
          filteredSphList.map(sph => {
            const totalUnits = sph.items.reduce((sum, it) => sum + it.quantity, 0);

            return (
              <div 
                key={sph.id}
                className="bg-white border border-[#D8D2CB] hover:border-[#398AB9] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 group"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8D2CB]/60 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-[#1C658C]/10 border border-[#1C658C]/20 rounded-xl text-[#1C658C] mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-[#1C658C] text-sm">
                          {sph.sphNumber}
                        </span>

                        {/* Status Changer for Admin */}
                        <div className="flex items-center gap-1.5 bg-[#EEEEEE] border border-[#D8D2CB] rounded-lg px-2.5 py-1">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Status:</span>
                          <select
                            value={sph.status}
                            onChange={(e) => onUpdateStatus?.(sph.id, e.target.value as SphQuotation['status'])}
                            className={`text-xs font-semibold rounded px-2 py-0.5 outline-none cursor-pointer transition-colors ${
                              sph.status === 'Disetujui (Deal)' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold' :
                              sph.status === 'Negosiasi' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              sph.status === 'Terkirim ke RS' ? 'bg-[#398AB9]/20 text-[#1C658C] border border-[#398AB9]/40' :
                              sph.status === 'Ditolak' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-white text-slate-700 border border-[#D8D2CB]'
                            }`}
                            title="Admin dapat mengubah status penawaran SPH di sini"
                          >
                            <option value="Draft" className="bg-white text-slate-700">Draft (Konsep Awal)</option>
                            <option value="Terkirim ke RS" className="bg-white text-[#1C658C]">Terkirim ke RS (Review)</option>
                            <option value="Negosiasi" className="bg-white text-amber-800">Negosiasi (Nego Tarif)</option>
                            <option value="Disetujui (Deal)" className="bg-white text-emerald-800 font-bold">Disetujui (Deal) ⚡ (Masuk Jadwal)</option>
                            <option value="Ditolak" className="bg-white text-rose-800">Ditolak (Batal)</option>
                          </select>
                        </div>

                        {sph.status === 'Disetujui (Deal)' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Terjadwal di RS</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onOpenBap?.(sph)}
                              className="text-[10px] bg-[#1C658C]/10 hover:bg-[#1C658C] text-[#1C658C] hover:text-white border border-[#1C658C]/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                              title="Buka Dokumen BAP (Rekap, BAP, Rekap Non PO, BAP Non PO)"
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              <span>BAP 4 Sheet Siap</span>
                            </button>
                          </div>
                        )}

                        {sph.discountAmount && sph.discountAmount > 0 && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono font-medium">
                            Diskon {sph.discountPercent?.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {sph.hospitalName}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {sph.hospitalAddress}
                      </p>
                    </div>
                  </div>

                  {/* SPH Date and Meta */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between text-xs text-slate-500 gap-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(sph.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Marketing: <strong className="text-slate-700">{sph.marketingStaffName || 'Erwin'}</strong>
                    </span>
                  </div>
                </div>

                {/* Card Items Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Item List Preview */}
                  <div className="md:col-span-7 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        Rincian {sph.items.length} Macam Alat ({totalUnits} Total Unit):
                      </span>
                    </div>

                    <div className="bg-[#EEEEEE]/40 border border-[#D8D2CB] rounded-xl p-3 max-h-28 overflow-y-auto space-y-1.5 text-xs">
                      {sph.items.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between items-center text-slate-700">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-4 text-slate-400 font-mono text-[11px]">{idx + 1}.</span>
                            <span className="font-semibold text-slate-850 truncate">{item.description}</span>
                            <span className="text-[11px] text-[#1C658C] font-mono font-medium">({item.quantity} {item.unit})</span>
                          </div>
                          <span className="font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            Rp {formatNumber(item.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial & Negotiation Summary */}
                  <div className="md:col-span-5 bg-[#EEEEEE]/60 border border-[#D8D2CB] p-3.5 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Nilai Katalog Brosur:</span>
                      <span className="font-mono text-slate-400 line-through">
                        {formatRupiah(sph.subtotalOriginal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-700">
                      <span>Subtotal 1 (Nego Alat):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        Rp {formatNumber(sph.subtotal1)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>PPN 11%:</span>
                      <span className="font-mono text-slate-700">
                        Rp {formatNumber(sph.ppnAmount)}
                      </span>
                    </div>

                    <div className="border-t border-[#D8D2CB] pt-1.5 flex justify-between items-center">
                      <span className="font-bold text-[#1C658C]">GRAND TOTAL DEAL:</span>
                      <span className="font-mono font-black text-[#1C658C] text-sm">
                        Rp {formatNumber(sph.grandTotal)}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 italic truncate pt-0.5">
                      "{sph.terbilang}"
                    </p>
                  </div>

                </div>

                {/* Card Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D8D2CB]/60">
                  <div className="flex flex-wrap items-center gap-2">
                    {sph.status === 'Disetujui (Deal)' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDownloadBap(sph)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Unduh 1 file Excel (.xlsx) dengan 4 sheet: Rekap, BAP, Rekap Non PO, BAP Non PO"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Excel BAP</span>
                        </button>

                        <button
                          onClick={() => {
                            if (onNavigateToSchedules) {
                              onNavigateToSchedules();
                            } else {
                              onConvertToSpk(sph);
                            }
                          }}
                          className="px-3 py-1.5 bg-[#1C658C] hover:bg-[#144966] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          title="Buka agenda kalibrasi RS untuk SPH ini"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Jadwal RS</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onUpdateStatus?.(sph.id, 'Disetujui (Deal)')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Tandai SPH ini Deal dan otomatis buat dokumen BAP 4 sheet serta jadwalkan kalibrasi"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Tandai Deal (Buat BAP)</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadSphPdf(sph)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Unduh PDF SPH Resmi"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF SPH</span>
                    </button>

                    <button
                      onClick={() => onEditSph(sph)}
                      className="px-3 py-1.5 bg-[#EEEEEE] hover:bg-[#D8D2CB]/50 text-slate-700 hover:text-[#1C658C] text-xs font-medium rounded-lg border border-[#D8D2CB] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nego / Edit SPH</span>
                    </button>

                    <button
                      onClick={() => setDeleteTargetSph(sph)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="Hapus SPH"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for SPH Deletion */}
      <ConfirmDeleteModal
        isOpen={deleteTargetSph !== null}
        title="Hapus Surat Penawaran Harga (SPH)?"
        message="Apakah Anda yakin ingin menghapus dokumen penawaran harga ini? Dokumen penawaran resmi dan rincian pola tarif terkait akan dihapus secara permanen."
        itemName={deleteTargetSph ? `${deleteTargetSph.hospitalName} • No. SPH: ${deleteTargetSph.sphNumber} (${formatRupiah(deleteTargetSph.grandTotal)})` : ''}
        confirmText="Ya, Hapus SPH"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTargetSph) {
            onDeleteSph(deleteTargetSph.id);
          }
          setDeleteTargetSph(null);
        }}
        onClose={() => setDeleteTargetSph(null)}
      />

      {/* POPUP BROWSER KATALOG 121 ALAT RESMI */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#1C658C] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#EEEEEE]" />
                  <span>Katalog Pola Tarif Resmi PT. Sarana Multi Kalibrasi</span>
                </h3>
                <p className="text-xs text-[#D8D2CB]">
                  Standar Akreditasi Kemenkes RI No: 26062301565850001 • Kode Lab: LK-532-IDN
                </p>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#EEEEEE]/50 border-b border-[#D8D2CB]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari alat di brosur (misal: Thermohygrometer, Infusion, Syringe, ECG, USG, Autoclave)..."
                  className="w-full bg-white border border-[#D8D2CB] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#EEEEEE]/20">
              {SPH_TARIFF_CATALOG
                .filter(t => t.name.toLowerCase().includes(catalogSearch.toLowerCase()) || t.id.toString().includes(catalogSearch))
                .map(tariff => (
                  <div
                    key={tariff.id}
                    className="p-3 bg-white border border-[#D8D2CB] rounded-xl flex items-center justify-between shadow-xs hover:border-[#398AB9] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-[#EEEEEE] text-[#1C658C] border border-[#D8D2CB] px-1.5 py-0.2 rounded font-mono font-bold">
                          #{tariff.id}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {tariff.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="text-[#1C658C] font-mono font-bold">
                          {formatRupiah(tariff.price)}
                        </span>
                        <span>•</span>
                        <span>{tariff.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="px-6 py-3 bg-[#EEEEEE] border-t border-[#D8D2CB] flex justify-between items-center text-xs text-slate-600">
              <span className="font-medium">Total 121 Item Tarif Kalibrasi Resmi</span>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-1.5 bg-[#1C658C] hover:bg-[#398AB9] text-white font-semibold rounded-lg transition-colors shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
