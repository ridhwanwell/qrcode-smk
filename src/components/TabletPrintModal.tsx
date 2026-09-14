import React, { useRef } from 'react';
import { TabletLoan, TabletDevice } from '../types';
import { OfficialLetterhead } from './OfficialLetterhead';
import { OfficialLetterFooter } from './OfficialLetterFooter';
import { Printer, Download, X, Tablet, CheckCircle, ShieldCheck } from 'lucide-react';
import { formatIndonesianDate } from '../utils/helpers';
import { exportHtmlToWord } from '../utils/wordExport';

interface TabletPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: TabletLoan | null;
  tablet?: TabletDevice | null;
}

export const TabletPrintModal: React.FC<TabletPrintModalProps> = ({
  isOpen,
  onClose,
  loan,
  tablet
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !loan) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    if (!printRef.current) return;
    const contentHtml = printRef.current.innerHTML;
    exportHtmlToWord({
      filename: `Bukti_Peminjaman_Tablet_${loan.tabletName.replace(/\s+/g, '_')}_${loan.borrowerName.replace(/\s+/g, '_')}`,
      title: 'Formulir Peminjaman Tablet Kalibrasi',
      bodyHtml: contentHtml
    });
  };

  const borrowDateStr = formatIndonesianDate(loan.borrowDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:my-0"
        id="tablet-print-modal"
      >
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                Formulir Peminjaman Tablet Kalibrasi (Cetak / PDF)
              </h2>
              <p className="text-xs text-slate-400">
                {loan.loanNumber} • {loan.tabletName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWord}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
              title="Download sebagai file Microsoft Word (.doc)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Word</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
              title="Cetak formulir atau simpan PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-10 bg-white print:p-0 print:overflow-visible">
          <div ref={printRef} className="max-w-3xl mx-auto text-slate-900 text-[13px] leading-relaxed font-sans">
            {/* Kop Surat Resmi PT. Sarana Multi Kalibrasi */}
            <OfficialLetterhead subtitle="Laboratorium Kalibrasi" className="mb-4" />

            {/* Title */}
            <div className="text-center my-4">
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase underline text-slate-950">
                BUKTI PEMINJAMAN TABLET UNTUK KALIBRASI
              </h2>
              <p className="text-xs font-mono font-semibold text-slate-700 mt-1">
                Nomor Formulir : {loan.loanNumber}
              </p>
            </div>

            {/* Statement */}
            <p className="text-xs text-justify mb-4 leading-relaxed">
              Pada hari ini, tanggal <b>{borrowDateStr}</b>, telah dilakukan serah terima peminjaman perangkat Tablet Operasional Laboratorium Kalibrasi <b>PT. SARANA MULTI KALIBRASI</b> untuk kegiatan pengujian dan kalibrasi alat kesehatan, dengan rincian data sebagai berikut:
            </p>

            {/* Table of Details */}
            <div className="border border-slate-900 rounded-lg overflow-hidden mb-5">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-slate-300 bg-slate-50/70">
                    <td className="w-40 px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      1. Nomor Urut / ID
                    </td>
                    <td className="px-3.5 py-2 font-mono font-semibold">
                      #{loan.no} ({loan.id})
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      2. Perangkat Tablet
                    </td>
                    <td className="px-3.5 py-2 font-bold text-sky-900">
                      {loan.tabletName} {tablet ? `(${tablet.code} • ${tablet.model})` : ''}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300 bg-slate-50/70">
                    <td className="px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      3. Nama Peminjam
                    </td>
                    <td className="px-3.5 py-2 font-semibold">
                      {loan.borrowerName} <span className="text-slate-500 font-normal">({loan.borrowerRole || 'Teknisi Elektromedis'})</span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      4. Tanggal Peminjaman
                    </td>
                    <td className="px-3.5 py-2 font-medium">
                      {borrowDateStr}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300 bg-slate-50/70">
                    <td className="px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      5. Keperluan Peminjaman
                    </td>
                    <td className="px-3.5 py-2 font-medium text-slate-900 leading-normal">
                      {loan.purpose}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      6. Lama Peminjaman
                    </td>
                    <td className="px-3.5 py-2 font-semibold text-slate-900">
                      {loan.duration} {loan.expectedReturnDate ? `(Target Kembali: ${formatIndonesianDate(loan.expectedReturnDate)})` : ''}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300 bg-slate-50/70">
                    <td className="px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      7. Keterangan & Kelengkapan
                    </td>
                    <td className="px-3.5 py-2 text-slate-800 leading-normal">
                      {loan.notes || 'Unit tablet lengkap, stylus pen, adaptor charger, rugged armor casing.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-bold text-slate-950 border-r border-slate-300">
                      8. Status Peminjaman
                    </td>
                    <td className="px-3.5 py-2 font-bold">
                      {loan.status === 'Dipinjam' ? (
                        <span className="text-sky-800">SEDANG DIPINJAM (AKTIF OPERASIONAL LAPANGAN)</span>
                      ) : (
                        <span className="text-emerald-800">SUDAH DIKEMBALIKAN KE LABORATORIUM</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Rules & Responsibilities */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-6 text-[11px] text-slate-700 leading-relaxed">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Ketentuan Penggunaan & Pemeliharaan Tablet Kalibrasi:
              </div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Tablet digunakan khusus untuk operasional kalibrasi, input LKS digital, dan komunikasi SIM-KAL KAN.</li>
                <li>Peminjam wajib menjaga kondisi fisik tablet, stylus pen S-Pen, casing pelindung, serta charger.</li>
                <li>Dilarang menginstal aplikasi pihak ketiga yang tidak berizin atau merubah konfigurasi sistem kalibrator.</li>
                <li>Tablet harus segera dikembalikan ke rak laboratorium setelah masa peminjaman selesai.</li>
              </ol>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs mt-6 mb-8">
              <div>
                <p className="text-slate-600">Surakarta, {borrowDateStr}</p>
                <p className="font-bold text-slate-900 mt-0.5">Peminjam / Teknisi,</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-slate-300 italic text-[10px]">[Tanda Tangan]</span>
                </div>
                <p className="font-bold text-slate-950 underline">{loan.borrowerName}</p>
                <p className="text-[11px] text-slate-600">{loan.borrowerRole || 'Teknisi Elektromedis'}</p>
              </div>

              <div>
                <p className="text-slate-600">Diserahkan & Diverifikasi Oleh,</p>
                <p className="font-bold text-slate-900 mt-0.5">Penanggung Jawab Inventaris Lab,</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-slate-300 italic text-[10px]">[Tanda Tangan & Cap]</span>
                </div>
                <p className="font-bold text-slate-950 underline">{loan.approverName || 'Hafizh Pasifianto, S.Tr.T.'}</p>
                <p className="text-[11px] text-slate-600">Manajer Teknik PT. Sarana Multi Kalibrasi</p>
              </div>
            </div>

            {/* Footer Resmi PT. Sarana Multi Kalibrasi */}
            <OfficialLetterFooter className="mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
