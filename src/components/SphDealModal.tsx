import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  X, 
  FileText, 
  Download, 
  Building2, 
  Calendar, 
  User, 
  CreditCard, 
  Hash, 
  Layers, 
  Sparkles, 
  Printer, 
  FileSpreadsheet, 
  Archive,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { SphQuotation, SphDealData, DealRecipient } from '../types';
import { 
  generateDealNumbers, 
  formatNumber, 
  formatRupiah, 
  formatIndonesianLongDate,
  DEAL_RECIPIENT_OPTIONS,
  BANK_MANDIRI_SMK,
  BANK_JATENG_SMK
} from '../utils/sphHelpers';
import { 
  downloadBoPdf, 
  downloadFpPdf, 
  downloadKwpPdf, 
  downloadBapPdf, 
  downloadAllDealDocumentsZip 
} from '../utils/dealPdfExport';
import { downloadSphPdf } from '../utils/sphPdfExport';
import { useAuth } from '../lib/AuthContext';

interface SphDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  sph: SphQuotation | null;
  onSaveDeal: (sphId: string, dealData: SphDealData) => void;
}

export const SphDealModal: React.FC<SphDealModalProps> = ({
  isOpen,
  onClose,
  sph,
  onSaveDeal
}) => {
  const { role } = useAuth();
  const canMarkDeal = role === 'admin_utama' || role === 'admin_keuangan';

  if (!isOpen || !sph) return null;

  // Initial Sequence & Date determination
  const initialDate = sph.dealData?.dealDate || sph.date || new Date().toISOString().split('T')[0];
  const initialSeq = sph.dealData?.sequenceNumber || '074';

  const [dealDate, setDealDate] = useState<string>(initialDate);
  const [seqNumber, setSeqNumber] = useState<string>(initialSeq);

  // Form Numbers
  const [boNumber, setBoNumber] = useState<string>(sph.dealData?.boNumber || '');
  const [fpNumber, setFpNumber] = useState<string>(sph.dealData?.fpNumber || '');
  const [kwpNumber, setKwpNumber] = useState<string>(sph.dealData?.kwpNumber || '');

  // Form Details
  const [recipient, setRecipient] = useState<DealRecipient>(
    (sph.dealData?.recipientName as DealRecipient) || 'Fitri Nur Aini'
  );
  
  const [paymentMethod, setPaymentMethod] = useState<string>(
    sph.dealData?.paymentMethod || 'Bank Mandiri : 138-00-2610846-9 & Bank Jateng : 1-002-01495-1 (SARANA MULTI KALIBRASI PT)'
  );

  const [kwpPurpose, setKwpPurpose] = useState<string>(
    sph.dealData?.kwpPurpose || 
    `Pembayaran Pekerjaan Kalibrasi ${sph.items?.[0]?.description || 'Alat Kesehatan'}${sph.items && sph.items.length > 1 ? ` & ${sph.items.length - 1} Alat Lainnya` : ''} berdasarkan SPH No. ${sph.sphNumber}`
  );

  const [customerPic, setCustomerPic] = useState<string>(
    sph.dealData?.customerPic || sph.hospitalPic || sph.recipientRole || '-'
  );

  const [certificateOwner, setCertificateOwner] = useState<string>(
    sph.dealData?.certificateOwner || sph.hospitalName
  );

  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Auto-sync numbers when 3-digit sequence number or deal date changes
  useEffect(() => {
    if (seqNumber && dealDate) {
      const generated = generateDealNumbers(seqNumber, dealDate);
      setBoNumber(generated.boNumber);
      setFpNumber(generated.fpNumber);
      setKwpNumber(generated.kwpNumber);
    }
  }, [seqNumber, dealDate]);

  // Current compiled deal data object
  const currentDealData: SphDealData = {
    dealDate,
    sequenceNumber: seqNumber.padStart(3, '0'),
    boNumber: boNumber || `074/SMK-BO/IX-2026`,
    fpNumber: fpNumber || `074/SMK-FP/IX-2026`,
    kwpNumber: kwpNumber || `074/SMK-KWP/IX-2026`,
    recipientName: recipient,
    paymentMethod,
    kwpPurpose,
    customerPic,
    certificateOwner,
    updatedAt: new Date().toISOString()
  };

  const handleSave = () => {
    onSaveDeal(sph.id, currentDealData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  // Safe wrapper for downloads
  const handleDownload = async (type: string, downloadFn: () => Promise<void>) => {
    try {
      setIsDownloading(type);
      // Auto save deal data first
      onSaveDeal(sph.id, currentDealData);
      await downloadFn();
    } finally {
      setIsDownloading(null);
    }
  };

  const totalUnits = (sph.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
  const dealDateFormatted = formatIndonesianLongDate(dealDate, sph.city || 'Surakarta');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-4xl my-auto flex flex-col max-h-[92vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1C658C] to-[#144966] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Tandai Deal & Terbitkan Dokumen Resmi</span>
                <span className="text-[11px] font-semibold bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 px-2.5 py-0.5 rounded-full">
                  BO • FP • KWP • BAP
                </span>
              </h3>
              <p className="text-xs text-[#D8D2CB]">
                {sph.hospitalName} • No. SPH: {sph.sphNumber} ({formatRupiah(sph.grandTotal)})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs sm:text-sm bg-slate-50/50">

          {/* Quick Notice Banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-blue-950">
                Sinkronisasi Otomatis 3 Dokumen Deal (BO, FP, KWP):
              </p>
              <p className="text-blue-800 mt-0.5">
                Cukup masukkan 3 angka nomor urut (contoh <strong>{seqNumber}</strong>) dan tanggal deal, nomor <strong>BO</strong>, <strong>FP</strong>, dan <strong>KWP</strong> akan terformat otomatis dengan bulan Romawi & tahun deal yang sama. Isian tabel alat dan nominal total langsung mengikuti data deal SPH.
              </p>
            </div>
          </div>

          {/* SECTION 1: PENANGGALAN & SINKRONISASI NOMOR URUT */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#D8D2CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8D2CB] pb-2.5">
              <h4 className="font-bold text-[#1C658C] flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#398AB9]" />
                <span>1. Parameter Nomor & Tanggal Deal</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Format: [No]/SMK-[TIPE]/[BulanRomawi]-[Tahun]
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Deal (Penanggalan BO, FP, KWP, BAP)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    value={dealDate}
                    onChange={(e) => setDealDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#1C658C] focus:bg-white outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  Format cetak: {dealDateFormatted}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Urut Dokumen (3 Angka Depan Sama)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={5}
                    value={seqNumber}
                    onChange={(e) => setSeqNumber(e.target.value)}
                    placeholder="074"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 font-mono focus:ring-1 focus:ring-[#1C658C] focus:bg-white outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Otomatis diterapkan ke awalan nomor BO, FP, dan KWP
                </p>
              </div>
            </div>

            {/* Generated Document Numbers Preview & Edit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              
              {/* BO Number */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-[11px] font-bold text-blue-900 block mb-1">
                  Nomor Bukti Order (BO)
                </span>
                <input
                  type="text"
                  value={boNumber}
                  onChange={(e) => setBoNumber(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-[#1C658C] focus:ring-1 focus:ring-[#1C658C] outline-none"
                />
              </div>

              {/* FP Number */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-900 block mb-1">
                  Nomor Faktur Penjualan (FP)
                </span>
                <input
                  type="text"
                  value={fpNumber}
                  onChange={(e) => setFpNumber(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-emerald-800 focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              {/* KWP Number */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                <span className="text-[11px] font-bold text-amber-900 block mb-1">
                  Nomor Kwitansi Penjualan (KWP)
                </span>
                <input
                  type="text"
                  value={kwpNumber}
                  onChange={(e) => setKwpNumber(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-amber-800 focus:ring-1 focus:ring-amber-600 outline-none"
                />
              </div>

            </div>
          </div>

          {/* SECTION 2: PENERIMA / PEMBUAT & REKENING PEMBAYARAN */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#D8D2CB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8D2CB] pb-2.5">
              <h4 className="font-bold text-[#1C658C] flex items-center gap-2">
                <User className="w-4 h-4 text-[#398AB9]" />
                <span>2. Penerima Dokumen & Rekening Pembayaran</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Penerima (3 Pilihan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Penerima Order & Pembuat Faktur (3 Pilihan Resmi)
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value as DealRecipient)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                >
                  {DEAL_RECIPIENT_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tercetak pada kolom tanda tangan BO, FP, dan KWP
                </p>
              </div>

              {/* an. Sertifikat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  a.n. Sertifikat Kalibrasi
                </label>
                <input
                  type="text"
                  value={certificateOwner}
                  onChange={(e) => setCertificateOwner(e.target.value)}
                  placeholder={sph.hospitalName}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-[#1C658C] focus:bg-white outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default: Nama Rumah Sakit / Customer pemesan
                </p>
              </div>

            </div>

            {/* Rekening Pembayaran & Keterangan Kwitansi */}
            <div className="space-y-3 pt-2">
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Keterangan Rekening Pembayaran (Faktur Penjualan & SPH)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(`Bank Jateng: ${BANK_JATENG_SMK.accountNumber} & Bank Mandiri: ${BANK_MANDIRI_SMK.accountNumber} (SARANA MULTI KALIBRASI PT)`)}
                      className="text-[10px] text-blue-700 hover:underline font-semibold"
                    >
                      Preset Kedua Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(`Bank Mandiri : ${BANK_MANDIRI_SMK.accountNumber} a.n. PT. SARANA MULTI KALIBRASI`)}
                      className="text-[10px] text-blue-700 hover:underline font-semibold"
                    >
                      Mandiri Saja
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(`Bank Jateng : ${BANK_JATENG_SMK.accountNumber} a.n. PT. SARANA MULTI KALIBRASI`)}
                      className="text-[10px] text-blue-700 hover:underline font-semibold"
                    >
                      Bank Jateng Saja
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan "Untuk Pembayaran" pada Kwitansi (KWP)
                </label>
                <textarea
                  rows={2}
                  value={kwpPurpose}
                  onChange={(e) => setKwpPurpose(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none leading-relaxed"
                />
              </div>

            </div>
          </div>

          {/* SECTION 3: RINGKASAN TABEL ALAT & NOMINAL DEAL */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#D8D2CB] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#D8D2CB] pb-2.5">
              <h4 className="font-bold text-[#1C658C] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#398AB9]" />
                <span>3. Rincian Item Alat & Nominal SPH (Otomatis Masuk ke BO & FP)</span>
              </h4>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {totalUnits} Unit • {formatRupiah(sph.grandTotal)}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00A2E8] text-white font-bold text-[11px]">
                    <th className="px-3 py-2 text-center w-10 border-r border-white/20">No.</th>
                    <th className="px-3 py-2 border-r border-white/20">Diskripsi</th>
                    <th className="px-3 py-1.5 text-center w-20 border-r border-white/20 leading-tight">
                      <div>Qty</div>
                      <div className="text-[10px] font-normal text-white/90">(unit)</div>
                    </th>
                    <th className="px-3 py-2 text-right w-32 border-r border-white/20">Satuan Harga</th>
                    <th className="px-3 py-2 text-right w-32">Total Harga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(sph.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 text-center font-medium border-r border-slate-200">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-900 border-r border-slate-200">{item.description}</td>
                      <td className="px-3 py-1.5 text-center font-bold text-slate-800 border-r border-slate-200">{item.quantity}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-800 border-r border-slate-200">
                        <div className="flex justify-between">
                          <span>Rp</span>
                          <span>{formatNumber(item.unitPrice)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-950">
                        <div className="flex justify-between">
                          <span>Rp</span>
                          <span>{formatNumber(item.totalPrice)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-black font-bold text-xs bg-white">
                  <tr className="border-b border-slate-200">
                    <td colSpan={2} className="px-3 py-1.5 bg-[#00A2E8] text-white italic">Terbilang:</td>
                    <td className="px-3 py-1.5 text-center border-x border-slate-300">{totalUnits}</td>
                    <td className="px-3 py-1.5 text-right border-r border-slate-300">Total 1</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      <div className="flex justify-between">
                        <span>Rp</span>
                        <span>{formatNumber(sph.subtotal1)}</span>
                      </div>
                    </td>
                  </tr>
                  {sph.ppnAmount && sph.ppnAmount > 0 ? (
                    <tr className="border-b border-slate-200">
                      <td colSpan={3} rowSpan={sph.accommodationFee ? 4 : 3} className="px-4 py-2 border-r border-slate-300 text-center italic font-bold text-[11px] text-slate-700 align-middle bg-slate-50">
                        "{sph.terbilang || 'Nol Rupiah'}"
                      </td>
                      <td className="px-3 py-1 text-right border-r border-slate-300 text-[11px] font-normal">PPN 11%</td>
                      <td className="px-3 py-1 text-right font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span>Rp</span>
                          <span>{formatNumber(sph.ppnAmount)}</span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  <tr className="border-b border-slate-200">
                    {!sph.ppnAmount && (
                      <td colSpan={3} rowSpan={sph.accommodationFee ? 3 : 2} className="px-4 py-2 border-r border-slate-300 text-center italic font-bold text-[11px] text-slate-700 align-middle bg-slate-50">
                        "{sph.terbilang || 'Nol Rupiah'}"
                      </td>
                    )}
                    <td className="px-3 py-1 text-right border-r border-slate-300 text-[11px]">Total 2</td>
                    <td className="px-3 py-1 text-right font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span>Rp</span>
                        <span>{formatNumber(sph.subtotal2 || (sph.subtotal1 + (sph.ppnAmount || 0)))}</span>
                      </div>
                    </td>
                  </tr>
                  {sph.accommodationFee ? (
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-1 text-right border-r border-slate-300 text-[11px]">Akomodasi</td>
                      <td className="px-3 py-1 text-right font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span>Rp</span>
                          <span>{formatNumber(sph.accommodationFee)}</span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  <tr className="bg-[#00A2E8] text-white">
                    <td className="px-3 py-1.5 text-right font-bold border-r border-white/20">GRAND TOTAL</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold">
                      <div className="flex justify-between">
                        <span>Rp</span>
                        <span>{formatNumber(sph.grandTotal)}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic pt-1">
              Terbilang: "{sph.terbilang}"
            </p>
          </div>

          {/* SECTION 4: AREA DOWNLOAD PDF LANGSUNG */}
          <div className="bg-gradient-to-br from-slate-900 via-[#0F364C] to-[#144966] text-white p-5 rounded-2xl border border-slate-700 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Unduh Paket Dokumen PDF Resmi (Standar PT. SMK)</span>
                </h4>
                <p className="text-xs text-slate-300">
                  Format PDF presisi tinggi, layout bersih siap cetak di kertas berkop
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDownload('ZIP', () => downloadAllDealDocumentsZip(sph, currentDealData))}
                disabled={isDownloading !== null}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                <span>{isDownloading === 'ZIP' ? 'Membuat ZIP...' : 'Unduh Semua (1 Paket ZIP)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              
              {/* 1. PDF SPH */}
              <button
                type="button"
                onClick={() => handleDownload('SPH', () => downloadSphPdf(sph))}
                disabled={isDownloading !== null}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer group"
              >
                <FileText className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">PDF SPH</span>
                <span className="text-[10px] text-slate-300">Penawaran Harga</span>
              </button>

              {/* 2. PDF BO */}
              <button
                type="button"
                onClick={() => handleDownload('BO', () => downloadBoPdf(sph, currentDealData))}
                disabled={isDownloading !== null}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer group"
              >
                <FileText className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">PDF BO</span>
                <span className="text-[10px] text-slate-300">Bukti Order</span>
              </button>

              {/* 3. PDF FP */}
              <button
                type="button"
                onClick={() => handleDownload('FP', () => downloadFpPdf(sph, currentDealData))}
                disabled={isDownloading !== null}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer group"
              >
                <FileText className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">PDF FP</span>
                <span className="text-[10px] text-slate-300">Faktur Penjualan</span>
              </button>

              {/* 4. PDF KWP */}
              <button
                type="button"
                onClick={() => handleDownload('KWP', () => downloadKwpPdf(sph, currentDealData))}
                disabled={isDownloading !== null}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer group"
              >
                <CreditCard className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">PDF KWP</span>
                <span className="text-[10px] text-slate-300">Kwitansi Penjualan</span>
              </button>

              {/* 5. PDF BAP */}
              <button
                type="button"
                onClick={() => handleDownload('BAP', () => downloadBapPdf(sph, currentDealData))}
                disabled={isDownloading !== null}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer group col-span-2 sm:col-span-1"
              >
                <FileSpreadsheet className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">PDF BAP</span>
                <span className="text-[10px] text-slate-300">Berita Acara</span>
              </button>

            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-[#D8D2CB] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {savedSuccess ? (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <Check className="w-4 h-4" />
                <span>Data Deal & Dokumen Berhasil Disimpan!</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">
                Dokumen BO, FP, KWP, dan BAP tersimpan permanen di data SPH ini.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {canMarkDeal ? (
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Simpan & Tandai Deal</span>
              </button>
            ) : (
              <span className="text-[11px] text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                Hanya Admin Utama & Keuangan yang dapat Menandai Deal
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
