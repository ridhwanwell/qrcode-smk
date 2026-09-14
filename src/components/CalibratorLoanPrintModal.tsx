import React, { useRef } from 'react';
import { CalibratorLoan, CalibratorAsset } from '../types';
import { X, Printer, Download, CheckCircle2, ShieldCheck, FileText, Wrench } from 'lucide-react';
import { formatIndonesianDate, TODAY_STR } from '../utils/helpers';
import { CompanyLogo } from './CompanyLogo';
import { KanLogo } from './KanLogo';

interface CalibratorLoanPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CalibratorLoan;
  calibrator?: CalibratorAsset;
}

export const CalibratorLoanPrintModal: React.FC<CalibratorLoanPrintModalProps> = ({
  isOpen,
  onClose,
  loan,
  calibrator
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden text-slate-800">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Cetak Formulir Serah Terima Peminjaman Alat Kalibrator
              </h3>
              <p className="text-xs text-slate-400">
                No. Form: <span className="font-mono text-white">{loan.loanNumber}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#1C658C] hover:bg-[#144966] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4 Format) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/80 flex justify-center">
          <div 
            ref={printContentRef}
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-md rounded-xl text-slate-900 flex flex-col justify-between print:p-0 print:shadow-none print:m-0 print:w-full print:rounded-none"
            style={{ fontSize: '12px', lineHeight: '1.5' }}
          >
            {/* Kop Surat Header */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  <CompanyLogo size="lg" showSubtitle={false} />
                  <div>
                    <h1 className="text-base font-black text-slate-900 tracking-tight leading-none uppercase">
                      PT. SARANA MULTI KALIBRASI
                    </h1>
                    <p className="text-[11px] font-bold text-[#1C658C] mt-1">
                      Laboratorium Kalibrasi Alat Kesehatan • LK-532-IDN
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Jl. Kapten Mulyadi No. 128, Pasar Kliwon, Kota Surakarta, Jawa Tengah 57118
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Telp: (0271) 632-888 • Email: info@ptsmk.com • Web: www.ptsmk.com
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <KanLogo className="h-10" />
                  <span className="text-[9px] font-mono font-bold text-slate-700 mt-1">LK-532-IDN</span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-400 inline-block pb-1">
                  FORMULIR SERAH TERIMA & PEMINJAMAN ALAT KALIBRATOR MASTER
                </h2>
                <p className="text-[11px] font-mono text-slate-600 mt-1">
                  Nomor: {loan.loanNumber}
                </p>
              </div>

              {/* Document Details Table */}
              <div className="mb-6 space-y-4">
                <p className="text-xs text-slate-800 leading-relaxed text-justify">
                  Pada hari ini, tanggal <span className="font-bold">{formatIndonesianDate(loan.borrowDate)}</span>, telah diserahterimakan unit alat kalibrator medis master laboratorium PT. Sarana Multi Kalibrasi untuk operasional teknisi lapangan dengan rincian data sebagai berikut:
                </p>

                {/* Data Peminjam & Unit */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1 text-[11px] uppercase tracking-wider">
                      A. IDENTITAS PEMINJAM (TEKNISI)
                    </h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="text-slate-500 py-1 w-28">Nama Lengkap</td>
                          <td className="font-bold text-slate-900 py-1">: {loan.borrowerName}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Jabatan / Unit</td>
                          <td className="font-medium text-slate-800 py-1">: {loan.borrowerRole || 'Teknisi Elektromedis'}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Tanggal Pinjam</td>
                          <td className="font-mono text-slate-800 py-1">: {formatIndonesianDate(loan.borrowDate)}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Lama Peminjaman</td>
                          <td className="font-bold text-slate-900 py-1">: {loan.duration}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Rencana Kembali</td>
                          <td className="font-mono text-slate-800 py-1">: {formatIndonesianDate(loan.expectedReturnDate || loan.borrowDate)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1 text-[11px] uppercase tracking-wider">
                      B. SPESIFIKASI ALAT KALIBRATOR
                    </h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="text-slate-500 py-1 w-28">Kode Aset</td>
                          <td className="font-mono font-bold text-[#1C658C] py-1">: {loan.calibratorCode}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Nama Alat Master</td>
                          <td className="font-bold text-slate-900 py-1">: {calibrator?.name || loan.calibratorName}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Merk / Tipe</td>
                          <td className="font-medium text-slate-800 py-1">: {calibrator ? `${calibrator.brand} - ${calibrator.model}` : '-'}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Nomor Seri (SN)</td>
                          <td className="font-mono font-bold text-slate-900 py-1">: {calibrator?.serialNumber || '-'}</td>
                        </tr>
                        <tr>
                          <td className="text-slate-500 py-1">Lab Penguji KAN</td>
                          <td className="text-slate-800 py-1">: {calibrator?.calibrationLab || 'BPFK / LIPI (Terakreditasi KAN)'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Purpose & Condition */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-1">
                      C. KEPERLUAN & LOKASI PENGGUNAAN:
                    </span>
                    <p className="text-xs text-slate-900 font-medium pl-2 border-l-2 border-[#1C658C]">
                      {loan.purpose}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-1">
                      D. KELENGKAPAN & KONDISI AKSESORIS:
                    </span>
                    <p className="text-xs text-slate-700 pl-2 border-l-2 border-slate-300">
                      {loan.notes || 'Unit dalam kondisi sangat baik, lengkap probe test lead, kabel daya, sensor modul, dan rugged protective case.'}
                    </p>
                  </div>
                </div>

                {/* Terms & Regulation */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[10px] text-amber-900 space-y-1">
                  <p className="font-bold">Ketentuan Tanggung Jawab Peminjam:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
                    <li>Peminjam wajib menjaga kebersihan, ketepatan penyimpanan, dan keamanan alat kalibrator master berstandar KAN.</li>
                    <li>Dilarang membongkar, merusak segel kalibrasi, atau memindahtangankan alat tanpa izin Manajer Teknik.</li>
                    <li>Wajib mengembalikan alat tepat waktu sesuai tanggal perkiraan dan melaporkan kondisi fisik saat pengembalian.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-6 border-t border-slate-300">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-500 mb-1">Yang Menyerahkan (PIC Lab / Manajer):</p>
                  <p className="text-[11px] font-semibold text-slate-700">PT. SARANA MULTI KALIBRASI</p>
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-slate-300 italic text-[11px]">[Tanda Tangan & Stempel Lab]</span>
                  </div>
                  <p className="font-bold text-slate-900 underline">{loan.approverName || 'Hafizh Pasifianto, S.Tr.T.'}</p>
                  <p className="text-[10px] text-slate-500">Manajer Teknik & Mutu</p>
                </div>

                <div>
                  <p className="text-slate-500 mb-1">Yang Menerima / Meminjam:</p>
                  <p className="text-[11px] font-semibold text-slate-700">Teknisi Elektromedis Lapangan</p>
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-slate-300 italic text-[11px]">[Tanda Tangan Peminjam]</span>
                  </div>
                  <p className="font-bold text-slate-900 underline">{loan.borrowerName}</p>
                  <p className="text-[10px] text-slate-500">{loan.borrowerRole || 'Teknisi Elektromedis'}</p>
                </div>
              </div>

              <div className="mt-8 text-center text-[9px] text-slate-400 font-mono">
                Dicetak pada: {new Date().toLocaleString('id-ID')} • SMK Calibration Cloud Operations Platform
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
