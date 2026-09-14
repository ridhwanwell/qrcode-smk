import React, { useState, useEffect } from 'react';
import { TabletDevice, TabletLoan, Technician } from '../types';
import { X, Tablet, Calendar, Clock, User, FileText, Info, CheckCircle2, ShieldCheck } from 'lucide-react';
import { TODAY_STR } from '../utils/helpers';

interface TabletLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: TabletLoan) => void;
  tablets: TabletDevice[];
  technicians: Technician[];
  initialLoan?: TabletLoan | null;
  defaultTabletId?: string;
}

export const TabletLoanModal: React.FC<TabletLoanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tablets,
  technicians,
  initialLoan,
  defaultTabletId
}) => {
  const [selectedTabletId, setSelectedTabletId] = useState<string>('TAB-01');
  const [borrowerName, setBorrowerName] = useState<string>('');
  const [borrowerRole, setBorrowerRole] = useState<string>('Teknisi Elektromedis Lapangan');
  const [borrowDate, setBorrowDate] = useState<string>(TODAY_STR);
  const [purpose, setPurpose] = useState<string>('');
  const [duration, setDuration] = useState<string>('1 Hari');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(TODAY_STR);
  const [notes, setNotes] = useState<string>('Lengkap unit tablet, stylus pen S-Pen, charger 25W, dan rugged casing.');
  const [status, setStatus] = useState<'Dipinjam' | 'Dikembalikan'>('Dipinjam');
  const [approverName, setApproverName] = useState<string>('Hafizh Pasifianto, S.Tr.T. (Manajer Teknik)');

  // Quick purpose suggestions
  const purposePresets = [
    'Kalibrasi On-Site Rumah Sakit (Input LKS Digital & Uji Alkes)',
    'Pengujian Keselamatan Listrik (Electrical Safety Analyzer - ESA)',
    'Kalibrasi Ruang ICU, NICU & Kamar Operasi (OK)',
    'Verifikasi Audit Mutu Internal & Akreditasi KAN LK-532-IDN',
    'Input Berita Acara (BAP) & Dokumentasi Fisik Alat',
    'Uji Fungsi & Kalibrasi Ventilator / Defibrillator'
  ];

  // Quick duration presets
  const durationPresets = ['1 Hari', '2 Hari', '3 Hari', '4 Hari', '1 Minggu', '2 Minggu'];

  useEffect(() => {
    if (initialLoan) {
      setSelectedTabletId(initialLoan.tabletId);
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
      const targetTab = defaultTabletId || tablets.find(t => t.isAvailable)?.id || 'TAB-01';
      setSelectedTabletId(targetTab);
      setBorrowerName(technicians[0]?.name || '');
      setBorrowerRole(technicians[0]?.title || 'Teknisi Elektromedis');
      setBorrowDate(TODAY_STR);
      setPurpose('');
      setDuration('1 Hari');
      setExpectedReturnDate(TODAY_STR);
      setNotes('Lengkap unit tablet, stylus S-Pen, charger adaptor, dan casing rugged.');
      setStatus('Dipinjam');
      setApproverName('Hafizh Pasifianto, S.Tr.T. (Manajer Teknik)');
    }
  }, [initialLoan, defaultTabletId, isOpen, technicians, tablets]);

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
    // Auto calculate expected return date based on days
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
    if (!borrowerName.trim()) {
      alert('Mohon isi nama peminjam.');
      return;
    }
    if (!purpose.trim()) {
      alert('Mohon isi keperluan peminjaman.');
      return;
    }

    const selectedTab = tablets.find(t => t.id === selectedTabletId);
    const tabName = selectedTab ? selectedTab.name : `Tablet Kalibrasi ${selectedTabletId}`;

    const newLoan: TabletLoan = {
      id: initialLoan ? initialLoan.id : `TL-${Date.now().toString().slice(-6)}`,
      loanNumber: initialLoan ? initialLoan.loanNumber : `${Math.floor(100 + Math.random() * 900)}/PINJAM-TAB/SMK/${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      no: initialLoan ? initialLoan.no : 1,
      tabletId: selectedTabletId,
      tabletName: tabName,
      borrowerName: borrowerName.trim(),
      borrowerRole: borrowerRole.trim(),
      borrowDate,
      purpose: purpose.trim(),
      duration: duration.trim(),
      expectedReturnDate,
      notes: notes.trim(),
      status,
      approverName,
      createdAt: initialLoan ? initialLoan.createdAt : new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    };

    onSave(newLoan);
    onClose();
  };

  if (!isOpen) return null;

  const currentSelectedTablet = tablets.find(t => t.id === selectedTabletId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all"
        id="tablet-loan-modal"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/30 border border-sky-300/40 flex items-center justify-center">
              <Tablet className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialLoan ? 'Edit Peminjaman Tablet Kalibrasi' : 'Form Peminjaman Tablet untuk Kalibrasi'}
              </h2>
              <p className="text-xs text-sky-200">
                PT. Sarana Multi Kalibrasi • Inventaris 6 Unit Tablet Operasional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. Pilih Dari 6 Tablet Kalibrasi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Pilih Unit Tablet Kalibrasi (Total 6 Tablet):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {tablets.map((tab) => {
                const isSelected = tab.id === selectedTabletId;
                const isBusy = !tab.isAvailable && (!initialLoan || initialLoan.tabletId !== tab.id);
                const isAdminOnly = tab.id === 'TAB-05' || tab.code === 'SMK-TAB-05' || tab.notes?.toLowerCase().includes('khusus admin');

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedTabletId(tab.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-500/20 shadow-sm'
                        : isBusy
                        ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                        : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Tablet className="w-3.5 h-3.5 text-sky-600" />
                        {tab.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-sky-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {tab.code} • {tab.model}
                    </div>

                    {isAdminOnly && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Khusus Admin
                        </span>
                      </div>
                    )}

                    <div className="mt-1.5">
                      {isBusy ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                          Dipinjam: {tab.currentBorrower?.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                          ✓ Tersedia di Rak
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {currentSelectedTablet && !currentSelectedTablet.isAvailable && (!initialLoan || initialLoan.tabletId !== currentSelectedTablet.id) && (
              <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Perhatian: {currentSelectedTablet.name} saat ini tercatat sedang dipinjam oleh {currentSelectedTablet.currentBorrower}. Anda tetap bisa mencatat jika ada serah terima antar teknisi.
              </p>
            )}
          </div>

          {/* 2. Nama Peminjam & Jabatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nama Peminjam <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="Ketik atau pilih teknisi..."
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              {/* Quick Dropdown Suggestion */}
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-slate-500">Pilihan Cepat:</span>
                {technicians.slice(0, 4).map((tech) => (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => handleSelectTechnician(tech.name)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-800 transition-colors"
                  >
                    {tech.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Jabatan / Peran Peminjam
              </label>
              <input
                type="text"
                value={borrowerRole}
                onChange={(e) => setBorrowerRole(e.target.value)}
                placeholder="e.g. Teknisi Elektromedis / Lead Teknisi"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          {/* 3. Tanggal Peminjaman & Lama Peminjaman */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tanggal Peminjaman <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Lama Peminjaman <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 1 Hari / 3 Hari"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              {/* Presets */}
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                {durationPresets.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => handleSelectDuration(dur)}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      duration === dur ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-sky-100'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Keperluan Peminjaman */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Keperluan Peminjaman <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Tuliskan keperluan, contoh: Kalibrasi Alkes di RSUD Dr. Moewardi"
                required
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            {/* Quick Suggestions */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-500 block w-full">Template Keperluan:</span>
              {purposePresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-800 transition-colors text-left"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Keterangan & Catatan Kelengkapan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Keterangan & Kondisi Kelengkapan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan kondisi tablet, stylus pen, kabel charger, pelindung layar, atau catatan lain..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          {/* 6. Status Peminjaman & Petugas Penyerah */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Saat Ini
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Dipinjam' | 'Dikembalikan')}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="Dipinjam">🔵 Sedang Dipinjam (On Duty)</option>
                <option value="Dikembalikan">🟢 Sudah Dikembalikan (In Lab)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Petugas Penyerah / Penanggung Jawab Lab
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {initialLoan ? 'Simpan Perubahan' : 'Catat Peminjaman Tablet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
