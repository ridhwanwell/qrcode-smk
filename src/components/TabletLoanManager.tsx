import React, { useState, useMemo } from 'react';
import { TabletDevice, TabletLoan, Technician } from '../types';
import { 
  Tablet, 
  PlusCircle, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Printer, 
  CheckCircle2, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  ArrowUpRight,
  ShieldCheck,
  Check,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { formatIndonesianDate, TODAY_STR } from '../utils/helpers';
import { TabletLoanModal } from './TabletLoanModal';
import { TabletPrintModal } from './TabletPrintModal';

interface TabletLoanManagerProps {
  tablets: TabletDevice[];
  loans: TabletLoan[];
  technicians: Technician[];
  onAddLoan: (loan: TabletLoan) => void;
  onUpdateLoan: (loan: TabletLoan) => void;
  onDeleteLoan: (loanId: string) => void;
  onReturnTablet: (loanIdOrTabletId: string, returnDate: string, conditionNotes: string) => void;
  onUpdateTablet?: (tablet: TabletDevice) => void;
  onToggleTabletStatus?: (tabletId: string, isAvailable?: boolean) => void;
  onSyncOfficialTablets?: () => void;
  onClearAllLoans?: () => void;
}

export const TabletLoanManager: React.FC<TabletLoanManagerProps> = ({
  tablets,
  loans,
  technicians,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onReturnTablet,
  onUpdateTablet,
  onToggleTabletStatus,
  onSyncOfficialTablets,
  onClearAllLoans
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Dipinjam' | 'Dikembalikan'>('ALL');
  const [selectedTabletFilter, setSelectedTabletFilter] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingLoan, setEditingLoan] = useState<TabletLoan | null>(null);
  const [preselectedTabletId, setPreselectedTabletId] = useState<string | undefined>(undefined);

  // Print modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printingLoan, setPrintingLoan] = useState<TabletLoan | null>(null);

  // Return dialog state
  const [returningLoan, setReturningLoan] = useState<TabletLoan | null>(null);
  const [returningTablet, setReturningTablet] = useState<TabletDevice | null>(null);
  const [returnDate, setReturnDate] = useState<string>(TODAY_STR);
  const [returnCondition, setReturnCondition] = useState<string>('Sangat Baik, Bersih & Lengkap di Rak');

  // Delete loan confirm modal state
  const [deletingLoanTarget, setDeletingLoanTarget] = useState<TabletLoan | null>(null);

  // Counts
  const availableCount = tablets.filter(t => t.isAvailable).length;
  const borrowedCount = tablets.filter(t => !t.isAvailable).length;

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      if (filterStatus !== 'ALL' && loan.status !== filterStatus) return false;
      if (selectedTabletFilter !== 'ALL' && loan.tabletId !== selectedTabletFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = loan.borrowerName.toLowerCase().includes(q);
        const matchPurpose = loan.purpose.toLowerCase().includes(q);
        const matchTablet = loan.tabletName.toLowerCase().includes(q);
        const matchNotes = loan.notes.toLowerCase().includes(q);
        const matchNumber = loan.loanNumber.toLowerCase().includes(q);
        if (!matchName && !matchPurpose && !matchTablet && !matchNotes && !matchNumber) {
          return false;
        }
      }
      return true;
    });
  }, [loans, filterStatus, selectedTabletFilter, searchTerm]);

  // Handlers
  const handleOpenNewLoan = (tabletId?: string) => {
    setEditingLoan(null);
    setPreselectedTabletId(tabletId);
    setIsFormModalOpen(true);
  };

  const handleOpenEditLoan = (loan: TabletLoan) => {
    setEditingLoan(loan);
    setPreselectedTabletId(loan.tabletId);
    setIsFormModalOpen(true);
  };

  const handleOpenPrint = (loan: TabletLoan) => {
    setPrintingLoan(loan);
    setIsPrintModalOpen(true);
  };

  const handleOpenReturnModal = (tab: TabletDevice) => {
    const activeLoan = loans.find(l => l.tabletId === tab.id && l.status === 'Dipinjam');
    setReturningTablet(tab);

    if (activeLoan) {
      setReturningLoan(activeLoan);
    } else {
      // Create fallback contextual loan object so modal & return handler work 100% smoothly
      const fallbackLoan: TabletLoan = {
        id: tab.currentLoanId || `TL-RET-${tab.id}`,
        loanNumber: `PINJAM-${tab.code}`,
        no: 1,
        tabletId: tab.id,
        tabletName: tab.name,
        borrowerName: tab.currentBorrower || 'Teknisi Lapangan',
        borrowDate: TODAY_STR,
        purpose: 'Pengembalian Unit ke Rak Lab',
        duration: '1 Hari',
        status: 'Dipinjam',
        notes: tab.notes || '',
        createdAt: TODAY_STR
      };
      setReturningLoan(fallbackLoan);
    }
  };

  const handleConfirmReturn = () => {
    if (returningLoan) {
      onReturnTablet(returningLoan.id, returnDate, returnCondition);
    } else if (returningTablet) {
      onReturnTablet(returningTablet.id, returnDate, returnCondition);
    }

    if (returningTablet && onToggleTabletStatus) {
      onToggleTabletStatus(returningTablet.id, true);
    }

    setReturningLoan(null);
    setReturningTablet(null);
  };

  const handleQuickToggleAvailability = (tab: TabletDevice) => {
    if (tab.isAvailable) {
      // Toggle to borrowed
      if (onToggleTabletStatus) {
        onToggleTabletStatus(tab.id, false);
      }
    } else {
      // Open return dialog or return directly
      handleOpenReturnModal(tab);
    }
  };

  return (
    <div className="space-y-6" id="tablet-loan-manager">
      {/* 1. Page Header */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative tablet graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Tablet className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/30 text-sky-200 border border-sky-300/30 text-xs font-semibold">
              <Tablet className="w-3.5 h-3.5" />
              Inventaris Resmi 6 Unit Tablet PT. Sarana Multi Kalibrasi
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Peminjaman Tablet untuk Kalibrasi
            </h1>
            <p className="text-sm text-sky-200/90 max-w-2xl leading-relaxed">
              Pengelolaan 6 unit tablet operasional (4 unit Redmi Pad 2 untuk teknisi, 2 unit Redmi Pad SE - 1 khusus admin, 1 untuk teknisi) untuk pengisian Lembar Kerja Standar (LKS) digital, pengujian on-site, dan aplikasi SIM-KAL KAN LK-532-IDN.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onSyncOfficialTablets && (
              <button
                onClick={() => {
                  setIsSyncing(true);
                  onSyncOfficialTablets();
                  setTimeout(() => setIsSyncing(false), 800);
                }}
                disabled={isSyncing}
                className="px-4 py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                title="Sinkronkan 6 Tablet Resmi ke Database Cloud Firestore"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan 6 Tablet'}</span>
              </button>
            )}

            <button
              onClick={() => handleOpenNewLoan()}
              className="px-5 py-3 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              Form Peminjaman Baru
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-sky-700/50">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-xs text-sky-200">Total Tablet</div>
            <div className="text-xl sm:text-2xl font-black">{tablets.length} Unit</div>
            <div className="text-[10px] text-sky-300">4x Redmi Pad 2 • 2x Redmi Pad SE</div>
          </div>
          <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl p-3 border border-emerald-400/20">
            <div className="text-xs text-emerald-200">Tablet Tersedia</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300">{availableCount} Unit</div>
            <div className="text-[10px] text-emerald-200">Siap di Rak Lab PT SMK</div>
          </div>
          <div className="bg-amber-500/20 backdrop-blur-sm rounded-xl p-3 border border-amber-400/20">
            <div className="text-xs text-amber-200">Sedang Dipinjam</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300">{borrowedCount} Unit</div>
            <div className="text-[10px] text-amber-200">Tugas Lapangan On-Site</div>
          </div>
          <div className="bg-sky-500/20 backdrop-blur-sm rounded-xl p-3 border border-sky-400/20">
            <div className="text-xs text-sky-200">Peruntukan Khusus</div>
            <div className="text-xl sm:text-2xl font-black">1 Khusus Admin</div>
            <div className="text-[10px] text-sky-300">5 Unit untuk Teknisi</div>
          </div>
        </div>
      </div>

      {/* 2. THE REQUESTED INTERACTIVE TABLE: TABEL 6 UNIT TABLET OPERASIONAL & STATUS PEMINJAMAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-800 border border-sky-200">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>Tabel 6 Unit Tablet Kalibrasi & Status Peminjaman</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 font-mono">
                  6 Unit
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pilih langsung tablet yang ingin dipinjam (4 unit Redmi Pad 2, 2 unit Redmi Pad SE - 1 khusus admin, 5 untuk teknisi).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {availableCount} Tersedia
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {borrowedCount} Dipinjam
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 min-w-[130px]">Kode & Seri</th>
                <th className="px-4 py-3 min-w-[180px]">Model Tablet</th>
                <th className="px-3.5 py-3 min-w-[170px]">Peruntukan Unit</th>
                <th className="px-3.5 py-3 text-center min-w-[120px]">Status Ketersediaan</th>
                <th className="px-4 py-3 min-w-[160px]">Peminjam Saat Ini</th>
                <th className="px-4 py-3 min-w-[180px]">Keperluan / Estimasi Kembali</th>
                <th className="px-3.5 py-3 text-center w-36">Aksi Peminjaman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tablets.map((tab, idx) => {
                const activeLoan = loans.find(l => l.tabletId === tab.id && l.status === 'Dipinjam');
                const isAdminOnly = tab.id === 'TAB-05' || tab.code === 'SMK-TAB-05' || tab.notes?.toLowerCase().includes('khusus admin');

                return (
                  <tr key={tab.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. No */}
                    <td className="px-3.5 py-3.5 text-center font-bold text-slate-700 font-mono">
                      {idx + 1}
                    </td>

                    {/* 2. Kode & Seri */}
                    <td className="px-3.5 py-3.5">
                      <div className="font-mono font-bold text-xs text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded inline-block">
                        {tab.code}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        SN: {tab.serialNumber}
                      </div>
                    </td>

                    {/* 3. Model Tablet */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Tablet className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>{tab.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {tab.model}
                      </div>
                    </td>

                    {/* 4. Peruntukan Unit */}
                    <td className="px-3.5 py-3.5">
                      {isAdminOnly ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                            <ShieldCheck className="w-3 h-3" />
                            KHUSUS ADMIN
                          </span>
                          <div className="text-[10px] text-slate-500">
                            Ardhiany Mayliana Wiyono
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <User className="w-3 h-3" />
                            Teknisi Lapangan
                          </span>
                          <div className="text-[10px] text-slate-500">
                            {tab.id === 'TAB-06' ? 'Teknisi 5 (Redmi Pad SE)' : `Teknisi ${idx + 1} (Redmi Pad 2)`}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 5. Status Ketersediaan & Quick Toggle */}
                    <td className="px-3.5 py-3.5 text-center">
                      {tab.isAvailable ? (
                        <button
                          type="button"
                          onClick={() => handleQuickToggleAvailability(tab)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Klik untuk ubah status ketersediaan tablet"
                        >
                          <Check className="w-3 h-3" />
                          <span>Tersedia di Rak</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(tab)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                          title="Klik untuk kembalikan tablet ke rak"
                        >
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Sedang Dipinjam</span>
                        </button>
                      )}
                    </td>

                    {/* 6. Peminjam Saat Ini */}
                    <td className="px-4 py-3.5">
                      {tab.isAvailable ? (
                        <span className="text-slate-400 italic">Siap dipinjam</span>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-600" />
                            <span>{activeLoan?.borrowerName || tab.currentBorrower || 'Teknisi Lapangan'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {activeLoan?.borrowerRole || 'Teknisi Elektromedis'}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 7. Keperluan / Estimasi */}
                    <td className="px-4 py-3.5">
                      {tab.isAvailable ? (
                        <div className="text-slate-500 text-[11px] line-clamp-1">
                          {tab.notes || 'Tersedia di Rak Laboratorium Kalibrasi'}
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-slate-900 text-[11px] line-clamp-1">
                            {activeLoan?.purpose || 'Tugas Kalibrasi Lapangan'}
                          </div>
                          <div className="text-[10px] text-amber-800 font-medium flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>Kembali: {activeLoan?.expectedReturnDate ? formatIndonesianDate(activeLoan.expectedReturnDate) : activeLoan?.duration || 'Segera'}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 8. Aksi Peminjaman & Pengembalian */}
                    <td className="px-3.5 py-3.5 text-center">
                      {tab.isAvailable ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenNewLoan(tab.id)}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Pinjam Unit</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {activeLoan && (
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(activeLoan)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                              title="Cetak Bukti Pinjam"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenReturnModal(tab)}
                            className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Kembalikan Tablet ke Rak Lab & Ubah Status"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Kembalikan</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Filter & Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Control Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Rekapitulasi Riwayat Peminjaman Tablet Kalibrasi
              </h3>
              <p className="text-xs text-slate-500">
                Menampilkan {filteredLoans.length} data riwayat peminjaman
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Cari peminjam / keperluan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status ({loans.length})</option>
              <option value="Dipinjam">🔵 Sedang Dipinjam ({loans.filter(l => l.status === 'Dipinjam').length})</option>
              <option value="Dikembalikan">🟢 Sudah Dikembalikan ({loans.filter(l => l.status === 'Dikembalikan').length})</option>
            </select>

            {/* Tablet Filter */}
            <select
              value={selectedTabletFilter}
              onChange={(e) => setSelectedTabletFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Tablet</option>
              {tablets.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-40">Tablet</th>
                <th className="px-4 py-3 min-w-[150px]">Nama Peminjam</th>
                <th className="px-3.5 py-3 min-w-[120px]">Tanggal Peminjaman</th>
                <th className="px-4 py-3 min-w-[200px]">Keperluan</th>
                <th className="px-3.5 py-3 text-center min-w-[100px]">Lama Peminjaman</th>
                <th className="px-4 py-3 min-w-[180px]">Keterangan</th>
                <th className="px-3 py-3 text-center w-28">Status</th>
                <th className="px-3.5 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="p-3 bg-white rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-slate-200 shadow-xs">
                        <Tablet className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">Riwayat Peminjaman Tablet Kosong</p>
                      <p className="text-xs text-slate-500">
                        Belum ada riwayat peminjaman tablet yang tercatat. Seluruh 6 unit tablet siap digunakan.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenNewLoan()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Buat Peminjaman Baru</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, index) => {
                  const tabletInfo = tablets.find(t => t.id === loan.tabletId);

                  return (
                    <tr 
                      key={loan.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* 1. NO */}
                      <td className="px-3.5 py-3.5 text-center font-bold text-slate-700 font-mono">
                        {index + 1}
                      </td>

                      {/* Tablet */}
                      <td className="px-3.5 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Tablet className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>{loan.tabletName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {tabletInfo?.code || loan.tabletId}
                        </div>
                      </td>

                      {/* 2. NAMA PEMINJAM */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{loan.borrowerName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {loan.borrowerRole || 'Teknisi Elektromedis'}
                        </div>
                      </td>

                      {/* 3. TANGGAL PEMINJAMAN */}
                      <td className="px-3.5 py-3.5 text-slate-700 whitespace-nowrap">
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatIndonesianDate(loan.borrowDate)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          No: {loan.loanNumber.split('/')[0]}
                        </div>
                      </td>

                      {/* 4. KEPERLUAN */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 leading-snug">
                          {loan.purpose}
                        </div>
                        {loan.approverName && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Penyerah: {loan.approverName.split('(')[0]}
                          </div>
                        )}
                      </td>

                      {/* 5. LAMA PEMINJAMAN */}
                      <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          <Clock className="w-3 h-3" />
                          {loan.duration}
                        </span>
                      </td>

                      {/* 6. KETERANGAN */}
                      <td className="px-4 py-3.5 text-slate-600 leading-snug">
                        <div>{loan.notes || '-'}</div>
                        {loan.returnedCondition && (
                          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                            Kondisi kembali: {loan.returnedCondition}
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        {loan.status === 'Dipinjam' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            Dipinjam
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3" />
                            Kembali
                          </span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Kembalikan Tablet jika status Dipinjam */}
                          {loan.status === 'Dipinjam' && (
                            <button
                              onClick={() => setReturningLoan(loan)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                              title="Konfirmasi Pengembalian Tablet"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditLoan(loan)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            title="Edit Data Peminjaman"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Hapus Riwayat Item */}
                          <button
                            onClick={() => setDeletingLoanTarget(loan)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Hapus Catatan Riwayat Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Form Modal */}
      {isFormModalOpen && (
        <TabletLoanModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={(loan) => {
            if (editingLoan) {
              onUpdateLoan(loan);
            } else {
              onAddLoan(loan);
            }
          }}
          tablets={tablets}
          technicians={technicians}
          initialLoan={editingLoan}
          defaultTabletId={preselectedTabletId}
        />
      )}

      {/* 5. Print Modal */}
      {isPrintModalOpen && printingLoan && (
        <TabletPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          loan={printingLoan}
          tablet={tablets.find(t => t.id === printingLoan.tabletId)}
        />
      )}

      {/* 6. Return Confirmation Dialog */}
      {returningLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2 rounded-xl bg-emerald-100">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Pengembalian Tablet</h3>
                <p className="text-xs text-slate-500">{returningLoan.tabletName} • {returningLoan.borrowerName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 pt-2">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Tanggal Dikembalikan:</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Kondisi & Kelengkapan Saat Kembali:</label>
                <input
                  type="text"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  placeholder="e.g. Sangat Baik, Bersih, S-Pen dan Charger Lengkap"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                Setelah disimpan, status tablet <b>{returningLoan.tabletName}</b> akan otomatis berubah menjadi <b>Tersedia</b> kembali di rak laboratorium kalibrasi.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReturningLoan(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Konfirmasi Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Hapus Riwayat Peminjaman */}
      {deletingLoanTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Riwayat Peminjaman</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan riwayat peminjaman oleh <strong className="text-slate-900 font-semibold">"{deletingLoanTarget.borrowerName}"</strong> untuk unit <strong className="text-slate-900 font-semibold">{deletingLoanTarget.tabletName}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingLoanTarget(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLoan(deletingLoanTarget.id);
                  setDeletingLoanTarget(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
