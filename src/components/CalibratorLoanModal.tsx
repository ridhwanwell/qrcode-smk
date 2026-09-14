import React, { useState, useEffect } from 'react';
import { CalibratorAsset, CalibratorLoan, Technician } from '../types';
import { X, Wrench, Calendar, Clock, User, FileText, Info, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { TODAY_STR } from '../utils/helpers';

interface CalibratorLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: CalibratorLoan) => void;
  calibrators: CalibratorAsset[];
  technicians: Technician[];
  initialLoan?: CalibratorLoan | null;
  defaultCalibratorId?: string;
}

export const CalibratorLoanModal: React.FC<CalibratorLoanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  calibrators,
  technicians,
  initialLoan,
  defaultCalibratorId
}) => {
  const [selectedCalibratorId, setSelectedCalibratorId] = useState<string>('');
  const [borrowerName, setBorrowerName] = useState<string>('');
  const [borrowerRole, setBorrowerRole] = useState<string>('Teknisi Elektromedis Lapangan');
  const [borrowDate, setBorrowDate] = useState<string>(TODAY_STR);
  const [purpose, setPurpose] = useState<string>('');
  const [duration, setDuration] = useState<string>('1 Hari');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(TODAY_STR);
  const [notes, setNotes] = useState<string>('Lengkap unit alat master, kabel power, test lead/probe, modul sensor, dan rugged case.');
  const [status, setStatus] = useState<'Dipinjam' | 'Dikembalikan'>('Dipinjam');
  const [approverName, setApproverName] = useState<string>('Hafizh Pasifianto, S.Tr.T. (Manajer Teknik)');

  // Quick purpose suggestions for calibrators
  const purposePresets = [
    'Kalibrasi On-Site Rumah Sakit (Pekerjaan Kalibrasi Lapangan Sesuai SPK)',
    'Uji Keselamatan Listrik (Electrical Safety Testing IEC 62353/60601)',
    'Kalibrasi Ruang Operasi (OK), ICU & NICU',
    'Verifikasi Interkomparasi & Audit Akreditasi KAN LK-532-IDN',
    'Kalibrasi Parameter Vital Signs, NIBP, SpO2 & ECG Simulator',
    'Uji Tekanan, Aliran Gas & Volume Ventilator Tester'
  ];

  // Quick duration presets
  const durationPresets = ['1 Hari', '2 Hari', '3 Hari', '4 Hari', '1 Minggu', '2 Minggu'];

  useEffect(() => {
    if (initialLoan) {
      setSelectedCalibratorId(initialLoan.calibratorId);
      setBorrowerName(initialLoan.borrowerName);
      setBorrowerRole(initialLoan.borrowerRole || 'Teknisi Elektromedis');
      setBorrowDate(initialLoan.borrowDate);
      setPurpose(initialLoan.purpose);
      setDuration(initialLoan.duration);
      setExpectedReturnDate(initialLoan.expectedReturnDate || initialLoan.borrowDate);
      setNotes(initialLoan.notes || '');
      setStatus(initialLoan.status);
      setApproverName(initialLoan.approverName || 'Hafizh Pasifianto, S.Tr.T. (Manajer Teknik)');
    } else {
      // New loan defaults
      const targetCal = defaultCalibratorId || calibrators.find(c => c.isAvailable !== false)?.id || calibrators[0]?.id || '';
      setSelectedCalibratorId(targetCal);
      setBorrowerName(technicians[0]?.name || '');
      setBorrowerRole(technicians[0]?.title || 'Teknisi Elektromedis');
      setBorrowDate(TODAY_STR);
      setPurpose('');
      setDuration('1 Hari');
      setExpectedReturnDate(TODAY_STR);
      setNotes('Lengkap unit alat master, kabel power, test lead/probe, modul sensor, dan rugged case.');
      setStatus('Dipinjam');
      setApproverName('Hafizh Pasifianto, S.Tr.T. (Manajer Teknik)');
    }
  }, [initialLoan, defaultCalibratorId, isOpen, technicians, calibrators]);

  // When technician is selected from dropdown
  const handleSelectTechnician = (name: string) => {
    setBorrowerName(name);
    const tech = technicians.find(t => t.name === name);
    if (tech) {
      setBorrowerRole(tech.title);
    }
  };

  // When duration preset is clicked
  const handleSelectDuration = (dur: string) => {
    setDuration(dur);
    const daysMatch = dur.match(/\d+/);
    if (daysMatch && borrowDate) {
      const days = parseInt(daysMatch[0], 10);
      const curr = new Date(borrowDate);
      curr.setDate(curr.getDate() + (dur.includes('Minggu') ? days * 7 : days));
      setExpectedReturnDate(curr.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalibratorId || !borrowerName || !purpose) {
      alert('Mohon lengkapi data alat kalibrator, nama peminjam, dan keperluan!');
      return;
    }

    const selectedCal = calibrators.find(c => c.id === selectedCalibratorId);
    const calCode = selectedCal?.code || 'CAL-000';
    const calName = selectedCal ? `${selectedCal.code} - ${selectedCal.name}` : 'Alat Kalibrator';

    const newLoan: CalibratorLoan = {
      id: initialLoan?.id || `CL-${Date.now().toString().slice(-6)}`,
      loanNumber: initialLoan?.loanNumber || `${Math.floor(100 + Math.random() * 900)}/CAL-LOAN/${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      no: initialLoan?.no || 1,
      calibratorId: selectedCalibratorId,
      calibratorCode: calCode,
      calibratorName: calName,
      borrowerName,
      borrowerRole,
      borrowDate,
      purpose,
      duration,
      expectedReturnDate,
      notes,
      status,
      approverName,
      createdAt: initialLoan?.createdAt || TODAY_STR
    };

    onSave(newLoan);
    onClose();
  };

  if (!isOpen) return null;

  const currentCal = calibrators.find(c => c.id === selectedCalibratorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1C658C] to-[#144966] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {initialLoan ? 'Edit Form Peminjaman Alat Kalibrator' : 'Form Peminjaman Alat Kalibrator Master'}
              </h3>
              <p className="text-xs text-blue-100/80">
                Pencatatan serah terima & penggunaan alat kalibrator laboratorium PT SMK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Calibrator Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Pilih Alat Kalibrator Master <span className="text-rose-500">*</span></span>
              {currentCal && (
                <span className="font-mono text-[11px] font-bold text-[#1C658C] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {currentCal.brand} • {currentCal.model}
                </span>
              )}
            </label>
            <select
              value={selectedCalibratorId}
              onChange={(e) => setSelectedCalibratorId(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 font-medium focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
            >
              {calibrators.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name} - ({c.brand} {c.model}) {c.isAvailable === false ? '• [Sedang Dipinjam]' : '• [Tersedia di Rak]'}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Info Banner */}
          {currentCal && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-slate-600">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1C658C] flex items-center justify-center font-mono font-bold text-xs">
                  CAL
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs">{currentCal.name}</p>
                  <p className="text-[11px] text-slate-500">SN: <span className="font-mono font-semibold">{currentCal.serialNumber}</span> • Lab KAN: {currentCal.calibrationLab}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  currentCal.isAvailable === false 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {currentCal.isAvailable === false ? 'Sedang Dipinjam' : 'Tersedia di Lab'}
                </span>
              </div>
            </div>
          )}

          {/* Borrower Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nama Peminjam (Teknisi) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="Ketik atau pilih dari daftar teknisi..."
                  required
                  list="technician-names-cal"
                  className="w-full border border-slate-300 rounded-xl pl-8 pr-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <datalist id="technician-names-cal">
                  {technicians.map((t) => (
                    <option key={t.id} value={t.name}>{t.title}</option>
                  ))}
                </datalist>
              </div>

              {/* Quick Select Technician Pills */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {technicians.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTechnician(t.name)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                  >
                    + {t.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jabatan / Peran Peminjam
              </label>
              <input
                type="text"
                value={borrowerRole}
                onChange={(e) => setBorrowerRole(e.target.value)}
                placeholder="Misal: Teknisi Elektromedis Lapangan"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
              />
            </div>
          </div>

          {/* Borrow Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tanggal Pinjam <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl pl-8 pr-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Lama Peminjaman
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Misal: 2 Hari"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Perkiraan Kembali
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none font-mono"
              />
            </div>
          </div>

          {/* Duration Preset Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Pilihan Durasi Cepat:</span>
            {durationPresets.map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => handleSelectDuration(dur)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  duration === dur
                    ? 'bg-[#1C658C] text-white border-[#1C658C]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dur}
              </button>
            ))}
          </div>

          {/* Purpose / Keperluan */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Keperluan Peminjaman (Rumah Sakit / Lokasi / Proyek) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Misal: Kalibrasi On-Site RSUD Dr. Moewardi Surakarta (Ruang ICU & OK)"
              required
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
            />
            {/* Purpose Presets */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {purposePresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50/70 hover:bg-blue-100 text-[#1C658C] border border-blue-200/50 transition-colors text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Keterangan Kelengkapan */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Kondisi & Kelengkapan Aksesoris Saat Dipinjam
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan kelengkapan probe, kabel sensor, adaptor, casing..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
            />
          </div>

          {/* Approver & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Petugas Penyerah / Penanggung Jawab Lab
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Status Peminjaman
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold focus:border-[#1C658C] focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
              >
                <option value="Dipinjam">Sedang Dipinjam (Keluar Lab)</option>
                <option value="Dikembalikan">Telah Dikembalikan (Di Rak)</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-[#1C658C] hover:bg-[#144966] text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{initialLoan ? 'Simpan Perubahan' : 'Konfirmasi Pinjam Unit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
