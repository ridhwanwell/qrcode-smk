import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  MapPin, 
  UserCheck, 
  Wrench,
  Building2,
  Download,
  Eye,
  Edit3,
  FileCode,
  Wand2,
  PenTool
} from 'lucide-react';
import { SignaturePadModal } from './SignaturePadModal';
import { CalibrationSchedule } from '../types';
import { formatIndonesianDate, formatRupiah, TODAY_STR } from '../utils/helpers';
import { CompanyLogo } from './CompanyLogo';
import { OfficialLetterhead } from './OfficialLetterhead';
import { OfficialLetterFooter } from './OfficialLetterFooter';
import { exportSpkToWord, exportBapToWord, exportBastpToWord } from '../utils/spkWordExport';
import { generateDocument } from '../lib/templateGenerator';
import { getFullTemplatesConfig, DocumentTemplatesConfig } from '../lib/templateService';

interface WorkOrderPrintModalProps {
  schedule: CalibrationSchedule | null;
  onClose: () => void;
  onOpenEditForm?: (schedule: CalibrationSchedule) => void;
}

export type DocumentTab = 'SPK' | 'BAP' | 'ALL';

export const WorkOrderPrintModal: React.FC<WorkOrderPrintModalProps> = ({
  schedule,
  onClose,
  onOpenEditForm
}) => {
  const [activeDoc, setActiveDoc] = useState<DocumentTab>('SPK');
  const [templatesConfig, setTemplatesConfig] = useState<DocumentTemplatesConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  useEffect(() => {
    getFullTemplatesConfig().then(setTemplatesConfig).catch(console.error);
  }, []);

  if (!schedule) return null;

  const handlePrint = () => {
    window.print();
  };

  // Calculations for BAP and BASTP
  const totalVolumePO = schedule.targetDevices.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalRealisasi = schedule.targetDevices.reduce((sum, d) => {
    if (d.status === 'Pass' || d.status === 'Fail') {
      return sum + (d.quantity || 1);
    }
    return sum;
  }, 0);
  const totalSisa = Math.max(0, totalVolumePO - totalRealisasi);

  const laikPakaiCount = schedule.targetDevices.reduce((sum, d) => {
    return d.status === 'Pass' ? sum + (d.quantity || 1) : sum;
  }, 0);
  const tidakLaikCount = schedule.targetDevices.reduce((sum, d) => {
    return d.status === 'Fail' ? sum + (d.quantity || 1) : sum;
  }, 0);

  const hospitalAddress = schedule.hospitalAddress || `${schedule.hospitalName}, ${schedule.hospitalCity}`;
  const bapNumber = schedule.bapNumber || `021/SMK/BAP/VIII/2026`;
  const spkNumber = schedule.workOrderNumber || `SPK/SMK/2026/08/021`;
  const poContractNumber = schedule.poContractNumber || `PO-${schedule.hospitalName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-2026`;
  const poDateFormatted = formatIndonesianDate(schedule.poDate || schedule.scheduledDate);

  const handleGenerateTemplate = async () => {
    if (!templatesConfig) return;
    
    let templateUrl = null;
    let docName = '';
    let docMappings: Record<string, string> = {};
    
    if (activeDoc === 'SPK') {
      templateUrl = templatesConfig.spk.activeUrl;
      docMappings = templatesConfig.spk.mappings;
      docName = `SPK_${schedule.hospitalName}`;
    } else if (activeDoc === 'BAP') {
      templateUrl = templatesConfig.bap.activeUrl;
      docMappings = templatesConfig.bap.mappings;
      docName = `BAP_${schedule.hospitalName}`;
    } else if (activeDoc === 'BASTP') {
      templateUrl = templatesConfig.bastp.activeUrl;
      docMappings = templatesConfig.bastp.mappings;
      docName = `BASTP_${schedule.hospitalName}`;
    }

    if (!templateUrl) {
      alert(`Anda belum mengunggah template untuk dokumen ${activeDoc}. Silakan unggah di menu Pengaturan Template.`);
      return;
    }

    setIsGenerating(true);
    try {
      // Prepared data for mapping
      const data = {
        hospitalName: schedule.hospitalName,
        hospitalAddress: schedule.hospitalAddress || '',
        hospitalCity: schedule.hospitalCity,
        hospitalPic: schedule.hospitalPic,
        hospitalPhone: schedule.hospitalPhone || '',
        spkNumber: spkNumber,
        bapNumber: bapNumber,
        poContractNumber: poContractNumber,
        poDateFormatted: poDateFormatted,
        leadTechnicianName: schedule.leadTechnicianName,
        scheduledDate: formatIndonesianDate(schedule.scheduledDate),
        endDate: formatIndonesianDate(schedule.endDate),
        contractValue: formatRupiah(schedule.contractValue),
        totalVolumePO: totalVolumePO,
        totalRealisasi: totalRealisasi,
        totalSisa: totalSisa,
        laikPakaiCount: laikPakaiCount,
        tidakLaikCount: tidakLaikCount,
        devices: schedule.targetDevices.map((d, i) => ({
          no: i + 1,
          name: d.name,
          labelNumber: d.labelNumber || '-',
          quantity: d.quantity || 1,
          room: d.room || '-',
          brandModel: d.brandModel || '-',
          serialNumber: d.serialNumber || '-',
          status: d.status === 'Pass' ? 'Laik Pakai' : d.status === 'Fail' ? 'Tidak Laik' : 'Belum Selesai',
          notes: d.notes || ''
        }))
      };

      await generateDocument(
        templateUrl, 
        data, 
        docName, 
        docMappings,
        digitalSignatureUrl || undefined,
        templatesConfig?.kop_surat?.activeUrl || null
      );
    } catch (error) {
      console.error(error);
      alert('Gagal menghasilkan dokumen dari template.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-8 shadow-2xl border border-[#D8D2CB] my-4 max-h-[96vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0 print:overflow-visible">
        
        {/* Navigation & Controls Bar (HIDDEN ON PRINT) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-6 border-b border-[#D8D2CB] print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#1C658C]/10 text-[#1C658C] text-xs font-bold font-mono border border-[#1C658C]/20">
                PT. SARANA MULTI KALIBRASI
              </span>
              <span className="text-[#D8D2CB]">•</span>
              <span className="text-xs text-slate-500 font-medium">Modul Dokumen Resmi Kalibrasi</span>
            </div>
            <h3 className="font-bold text-lg text-[#1C658C] mt-1">
              Pratinjau & Cetak Dokumen Kalibrasi RS
            </h3>
            <p className="text-xs text-slate-600">
              Pilih format dokumen yang ingin dilihat atau dicetak untuk <strong className="text-slate-900">{schedule.hospitalName}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs ${
                digitalSignatureUrl 
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-[#D8D2CB]'
              }`}
              title="Bubuhkan atau ganti tanda tangan digital resmi pada dokumen"
            >
              <PenTool className="w-4 h-4 text-[#1C658C]" />
              <span>{digitalSignatureUrl ? 'Ubah TTD Digital' : 'Tanda Tangan'}</span>
              {digitalSignatureUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            {onOpenEditForm && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditForm(schedule);
                }}
                className="bg-white hover:bg-[#EEEEEE] text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#D8D2CB] shadow-xs"
              >
                <Edit3 className="w-4 h-4 text-[#1C658C]" />
                <span>Edit Data SPK</span>
              </button>
            )}

            <button
              onClick={() => {
                if (activeDoc === 'SPK') exportSpkToWord(schedule);
                else if (activeDoc === 'BAP') exportBapToWord(schedule);
                else {
                  exportSpkToWord(schedule);
                  setTimeout(() => exportBapToWord(schedule), 300);
                }
              }}
              className="bg-[#398AB9] hover:bg-[#1C658C] active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Download format Microsoft Word (.doc) yang dapat diedit langsung"
            >
              <Download className="w-4 h-4" />
              <span>Export Word (.doc)</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-[#1C658C] hover:bg-[#398AB9] active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              id="btn-print-doc"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-[#EEEEEE] transition-colors"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher for Separated Documents (HIDDEN ON PRINT) */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#EEEEEE] rounded-xl mb-6 border border-[#D8D2CB] print:hidden">
          <button
            onClick={() => setActiveDoc('SPK')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeDoc === 'SPK'
                ? 'bg-white text-[#1C658C] shadow-xs border border-[#D8D2CB]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4 text-[#1C658C]" />
            <span>1. Surat Perintah Kerja (SPK)</span>
          </button>

          <button
            onClick={() => setActiveDoc('BAP')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeDoc === 'BAP'
                ? 'bg-white text-[#1C658C] shadow-xs border border-[#D8D2CB]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#398AB9]" />
            <span>2. Berita Acara Pekerjaan (BAP)</span>
          </button>

          <button
            onClick={() => setActiveDoc('ALL')}
            className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeDoc === 'ALL'
                ? 'bg-[#1C658C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Tampilkan & Cetak Seluruh Paket Dokumen (SPK + BAP)"
          >
            <Layers className="w-4 h-4" />
            <span>Paket Lengkap</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENT 1: SURAT PERINTAH KERJA (SPK) FORM & OFFICIAL DOCUMENT           */}
        {/* ========================================================================= */}
        {(activeDoc === 'SPK' || activeDoc === 'ALL') && (
          <div className={`doc-section spk-document text-slate-900 font-sans space-y-5 bg-white print:p-0 print:space-y-4 print-page-clean ${activeDoc === 'ALL' ? 'print-break-after' : 'print-no-break-after'} mb-10 pb-8 border-b-2 border-dashed border-slate-300 print:border-none print:mb-0 print:pb-0`}>
            {/* Kop Resmi PT. Sarana Multi Kalibrasi (Sesuai PDF Kop Surat) */}
            <OfficialLetterhead className="mb-2" />

            {/* Judul Dokumen SPK */}
            <div className="text-center py-1">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-950 underline decoration-2 decoration-slate-900">
                SURAT PERINTAH KERJA (SPK)
              </h2>
              <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                Nomor: <span className="text-teal-900">{spkNumber}</span>
              </p>
            </div>

            {/* Bagian 1: Data Rumah Sakit & Alamat Lengkap */}
            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/70 text-xs space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-700" />
                <span>I. Data Rumah Sakit / Fasilitas Pelayanan Kesehatan</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-36">Nama Rumah Sakit:</span>
                  <strong className="text-slate-950 text-sm">{schedule.hospitalName}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-36">Kota / Kabupaten:</span>
                  <span className="text-slate-900 font-medium">{schedule.hospitalCity}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-semibold text-slate-600 inline-block w-36">ALAMAT RS:</span>
                  <strong className="text-slate-900">{hospitalAddress}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-36">PIC Rumah Sakit:</span>
                  <span className="text-slate-900 font-bold">{schedule.hospitalPic}</span> ({schedule.hospitalPicRole || 'Kepala IPSRS / ATEM'})
                </div>
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-36">No. Telepon / HP PIC:</span>
                  <span className="text-slate-900 font-mono font-bold">{schedule.hospitalPhone}</span>
                </div>
              </div>
            </div>

            {/* Bagian 2: Tanggal Pelaksanaan & Nama Teknisi yang Berangkat */}
            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/70 text-xs space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                <span>II. Tanggal Pelaksanaan & Tim Teknisi yang Berangkat</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-40">TANGGAL PELAKSANAAN:</span>
                  <strong className="text-teal-950 text-xs bg-teal-100/80 px-2 py-0.5 rounded border border-teal-300 font-mono">
                    {formatIndonesianDate(schedule.scheduledDate)} s/d {formatIndonesianDate(schedule.endDate)}
                  </strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-40">Marketing In-Charge:</span>
                  <span className="text-slate-900 font-semibold">{schedule.marketingName || 'Anggita Larasati, S.I.Kom'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-40">Lead Teknisi (PJ Lapangan):</span>
                  <strong className="text-slate-950 font-bold">{schedule.leadTechnicianName}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 inline-block w-40">Nilai Kontrak Pekerjaan:</span>
                  <strong className="text-slate-900 font-mono">{formatRupiah(schedule.contractValue)}</strong>
                </div>
                <div className="sm:col-span-2 pt-1">
                  <span className="font-semibold text-slate-600 inline-block w-40 align-top">Teknisi yang Berangkat:</span>
                  <div className="inline-block">
                    <span className="font-bold text-teal-900">[1] {schedule.leadTechnicianName} (Lead)</span>
                    {schedule.supportTechnicianNames && schedule.supportTechnicianNames.length > 0 && (
                      <span className="text-slate-800">
                        {schedule.supportTechnicianNames.map((name, i) => (
                          <span key={i} className="ml-2 font-medium">
                            • [{i + 2}] {name}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 3: Alat Kalibrator Standar Master PT SMK yang Dibawa */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-teal-700" />
                <span>III. Standar Kalibrator Master PT. Sarana Multi Kalibrasi yang Dibawa:</span>
              </h4>
              <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-xs flex flex-wrap gap-2">
                {schedule.assignedCalibratorNames.map((calName, i) => (
                  <span key={i} className="bg-white border border-slate-300 px-2.5 py-1 rounded text-[11px] font-semibold text-slate-800 shadow-2xs">
                    [{i+1}] {calName} (Tertelusur KAN)
                  </span>
                ))}
              </div>
            </div>

            {/* Bagian 4: Rincian Target Alat Kesehatan & Volume Sesuai Surat Pesanan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  IV. Daftar Alat Kesehatan Sesuai Surat Pesanan & Jumlah Item:
                </h4>
                <span className="text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  Total: {totalVolumePO} Item / Unit Sesuai Pesanan
                </span>
              </div>
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                    <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                    <th className="p-2 border-r border-slate-300">Nama Alat Medis Rumah Sakit</th>
                    <th className="p-2 border-r border-slate-300 text-center w-36">No. Label (7-Digit)</th>
                    <th className="p-2 border-r border-slate-300 text-center w-28">Jumlah (PO)</th>
                    <th className="p-2 border-r border-slate-300 w-36">Lokasi / Ruangan</th>
                    <th className="p-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {schedule.targetDevices.map((d, idx) => (
                    <tr key={d.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-600">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{d.name}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-teal-900 bg-teal-50/40">
                        {d.labelNumber || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-900">{d.quantity || 1} Unit</td>
                      <td className="p-2 border-r border-slate-300 text-slate-700">{d.room || '-'}</td>
                      <td className="p-2 text-[11px] text-slate-600">{d.notes || 'Kalibrasi & uji laik pakai'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bagian 5: Instruksi & Catatan Khusus */}
            <div className="text-xs bg-amber-50/60 border border-amber-200 p-2.5 rounded-lg text-slate-800">
              <p className="font-bold text-amber-900">Instruksi Khusus Lapangan:</p>
              <p className="mt-0.5 text-slate-700">
                1. Tim teknisi wajib mematuhi SOP K3 Rumah Sakit dan menggunakan APD yang sesuai.<br />
                2. Berkoordinasi aktif dengan Kepala IPSRS / ATEM ({schedule.hospitalPic}) selama proses pengujian alat.<br />
                3. Pastikan Berita Acara Pekerjaan (BAP) dan Berita Acara Kalibrasi (BASTP) ditandatangani lengkap setelah pekerjaan selesai.
              </p>
            </div>

            {/* Bagian 6: Tanda Tangan Pengesahan (TTD dari MT & Lead Teknisi) */}
            <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs text-slate-900">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <p className="text-slate-600 font-semibold">Diterima & Dilaksanakan Oleh:</p>
                <p className="text-[11px] text-slate-500 font-medium">Lead Teknisi Elektromedis Pelaksana</p>
                <div className="h-16 flex items-end justify-center">
                  <p className="border-b-2 border-slate-900 w-52 pb-1 font-bold text-slate-950">
                    {schedule.leadTechnicianName}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Penanggung Jawab Uji Lapangan</p>
              </div>

              <div className="border border-teal-200 rounded-lg p-3 bg-teal-50/40 relative">
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-teal-600 text-white rounded text-[9px] font-bold">
                  TERVERIFIKASI
                </div>
                <p className="text-teal-900 font-bold">Disetujui & Ditetapkan Oleh:</p>
                <p className="text-[11px] text-slate-600 font-semibold">Manajer Teknik (MT)</p>
                <div className="h-16 flex flex-col items-center justify-end">
                  {/* Cap & TTD Visual */}
                  <div className="w-full flex items-end justify-center relative">
                    {digitalSignatureUrl ? (
                      <img 
                        src={digitalSignatureUrl} 
                        alt="Tanda Tangan Digital Manajer Teknik" 
                        className="absolute h-14 max-w-[160px] object-contain bottom-2 z-10" 
                      />
                    ) : (
                      <span className="text-xs font-serif italic text-teal-800 absolute bottom-3 select-none pointer-events-none opacity-80">
                        Hafizh Pasifianto, S.Tr.T.
                      </span>
                    )}
                    <p className="border-b-2 border-teal-900 w-56 pb-1 font-bold text-teal-950 z-10">
                      {schedule.approvedByName || 'Hafizh Pasifianto, S.Tr.T.'}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-teal-900 font-bold mt-1">
                  {schedule.approvedByRole || 'Manajer Teknik PT. Sarana Multi Kalibrasi'}
                </p>
              </div>
            </div>

            {/* Official Letter Footer */}
            <OfficialLetterFooter className="mt-4" />
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENT 2: BERITA ACARA PEKERJAAN (BAP) - SESUAI FORMAT PDF SCAN 1       */}
        {/* ========================================================================= */}
        {(activeDoc === 'BAP' || activeDoc === 'ALL') && (
          <div className={`doc-section bap-document text-slate-900 font-sans space-y-4 bg-white print:p-0 print:space-y-3 print-page-clean ${activeDoc === 'ALL' ? 'print-break-after' : 'print-no-break-after'} mb-10 pb-8 border-b-2 border-dashed border-slate-300 print:border-none print:mb-0 print:pb-0`}>
            {/* Header Nomor Halaman */}
            <div className="text-right text-xs text-slate-500 font-mono">
              Hal. 1 dari 1
            </div>

            {/* Judul & Nomor BAP */}
            <div className="text-center py-1">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950 underline decoration-slate-900">
                BERITA ACARA PEKERJAAN
              </h2>
              <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                NO. : {bapNumber}
              </p>
            </div>

            {/* Pembuka BAP */}
            <p className="text-xs leading-relaxed text-slate-800 text-justify">
              Pada Hari Ini ............. Tanggal ...... Bulan ......... Tahun 20 ....., Telah Dilaksanakan Pekerjaan Kalibrasi dan/atau Pengujian Alat-alat Kesehatan pada :
            </p>

            {/* Identitas Rumah Sakit */}
            <div className="text-xs space-y-1 pl-2">
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Nama RS.</span>
                <span className="w-4">:</span>
                <strong className="text-slate-950 font-bold">{schedule.hospitalName}</strong>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">No. PO/Kontrak</span>
                <span className="w-4">:</span>
                <span className="font-mono text-slate-900">{poContractNumber}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Tanggal PO</span>
                <span className="w-4">:</span>
                <span className="text-slate-900">{poDateFormatted}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Alamat</span>
                <span className="w-4">:</span>
                <span className="text-slate-900 font-medium">{hospitalAddress}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-700">Kota/Kab.</span>
                <span className="w-4">:</span>
                <span className="text-slate-900 font-medium">{schedule.hospitalCity}</span>
              </div>
            </div>

            {/* Header Data Alat */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Data Alat
              </h4>
              <table className="w-full text-left text-xs border border-slate-900 border-collapse">
                <thead>
                  <tr className="bg-white text-slate-900 border-b border-slate-900 font-bold">
                    <th className="p-1.5 border-r border-slate-900 text-center w-10">No.</th>
                    <th className="p-1.5 border-r border-slate-900">Nama Alat</th>
                    <th className="p-1.5 border-r border-slate-900 text-center w-20">Volume PO</th>
                    <th className="p-1.5 border-r border-slate-900 text-center w-20">Volume Realisasi</th>
                    <th className="p-1.5 border-r border-slate-900 text-center w-20">Volume Sisa</th>
                    <th className="p-1.5 text-center w-28">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {schedule.targetDevices.map((d, idx) => {
                    const isDone = d.status === 'Pass' || d.status === 'Fail';
                    const volPO = d.quantity || 1;
                    const volReal = isDone ? volPO : 0;
                    const volSisa = volPO - volReal;
                    const ket = isDone ? (d.status === 'Pass' ? 'Selesai (Laik)' : 'Selesai (Tidak Laik)') : 'Belum Selesai';

                    return (
                      <tr key={d.id} className="border-b border-slate-400">
                        <td className="p-1.5 border-r border-slate-900 text-center font-medium">{idx + 1}</td>
                        <td className="p-1.5 border-r border-slate-900 font-medium text-slate-950">{d.name}</td>
                        <td className="p-1.5 border-r border-slate-900 text-center">{volPO}</td>
                        <td className="p-1.5 border-r border-slate-900 text-center font-bold text-teal-800">{volReal}</td>
                        <td className="p-1.5 border-r border-slate-900 text-center">{volSisa}</td>
                        <td className="p-1.5 text-center text-[11px]">{ket}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL ROW */}
                  <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                    <td colSpan={2} className="p-1.5 border-r border-slate-900 text-right uppercase tracking-wider">
                      TOTAL UNIT
                    </td>
                    <td className="p-1.5 border-r border-slate-900 text-center font-black">{totalVolumePO}</td>
                    <td className="p-1.5 border-r border-slate-900 text-center font-black text-teal-800">{totalRealisasi}</td>
                    <td className="p-1.5 border-r border-slate-900 text-center font-black">{totalSisa}</td>
                    <td className="p-1.5 text-center text-[10px] text-slate-500">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Penandatanganan BAP */}
            <div className="pt-4 space-y-2">
              <div className="flex justify-between items-end text-xs text-slate-800">
                <div className="font-bold text-center w-64">
                  <p>{schedule.hospitalName}</p>
                </div>
                <div className="text-center w-64">
                  <p>Kota/Kab. {schedule.hospitalCity.split(',')[0]}, ..... / ..... / 2026</p>
                  <p className="font-bold mt-0.5">PT. Sarana Multi Kalibrasi</p>
                </div>
              </div>

              <div className="flex justify-between items-end text-center text-xs mt-16">
                <div className="w-64">
                  <div className="h-16 flex items-end justify-center border-b border-slate-900 pb-1">
                    {/* Empty space for hospital signature */}
                  </div>
                  <p className="mt-1 font-bold">
                    ( .................................................. )
                  </p>
                </div>

                <div className="w-64 relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none -mt-4">
                    <CompanyLogo size="sm" variant="dark" />
                  </div>
                  <div className="h-16 flex items-end justify-center border-b border-slate-900 pb-1 relative z-10">
                    {digitalSignatureUrl && (
                      <img 
                        src={digitalSignatureUrl} 
                        alt="Tanda Tangan PT SMK" 
                        className="h-14 max-w-[150px] object-contain mb-1" 
                      />
                    )}
                  </div>
                  <p className="mt-1 font-bold relative z-10">
                    ( {schedule.leadTechnicianName || '........................................'} )
                  </p>
                </div>
              </div>
            </div>

            {/* NB Catatan Sesuai Format PDF Scan */}
            <div className="pt-3 border-t border-slate-300 text-[11px] text-slate-600 space-y-0.5 italic">
              <p className="font-bold not-italic text-slate-800">NB:</p>
              <p>*Hanya dilakukan Uji Keselamatan Listrik dan/atau Uji Fungsi dan Kondisi Alat</p>
              <p>**Alat dilakukan Uji dan/atau Kalibrasi di Lab. PT. Sarana Multi Kalibrasi</p>
              <p>***Alat dilakukan subkontraktor pekerjaan</p>
            </div>
          </div>
        )}

        {showSignatureModal && (
          <SignaturePadModal
            onClose={() => setShowSignatureModal(false)}
            onSave={(signatureUrl) => {
              setDigitalSignatureUrl(signatureUrl);
              localStorage.setItem('smk_last_signature', signatureUrl);
            }}
            initialSignature={digitalSignatureUrl}
            title="Tanda Tangan Digital Resmi PT. Sarana Multi Kalibrasi"
          />
        )}
      </div>
    </div>
  );
};
