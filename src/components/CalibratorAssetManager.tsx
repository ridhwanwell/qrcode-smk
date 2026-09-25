import React, { useState, useMemo } from 'react';
import { CalibratorAsset, CalibratorLoan, Technician, CalibratorCondition } from '../types';
import { 
  Wrench, 
  Search, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileText, 
  SlidersHorizontal, 
  History, 
  TrendingDown, 
  Edit3, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  LayoutGrid, 
  Table as TableIcon,
  PlusCircle,
  Printer,
  RotateCcw,
  User,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { formatRupiah, formatIndonesianDate, calculateDaysRemaining, TODAY_STR } from '../utils/helpers';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { CalibratorLoanModal } from './CalibratorLoanModal';
import { CalibratorLoanPrintModal } from './CalibratorLoanPrintModal';

interface CalibratorAssetManagerProps {
  calibrators: CalibratorAsset[];
  loans?: CalibratorLoan[];
  technicians: Technician[];
  onAddCalibrator: (newCalibrator: CalibratorAsset) => void;
  onUpdateCalibrator: (updated: CalibratorAsset) => void;
  onDeleteCalibrator?: (calibratorId: string) => void;
  onSyncOfficialCalibrators?: () => void;
  onAddLoan?: (loan: CalibratorLoan) => void;
  onUpdateLoan?: (loan: CalibratorLoan) => void;
  onDeleteLoan?: (loanId: string) => void;
  onReturnCalibrator?: (loanIdOrCalibratorId: string, returnDate: string, conditionNotes: string) => void;
  onToggleCalibratorAvailability?: (calibratorId: string, isAvailable?: boolean) => void;
}

export const CalibratorAssetManager: React.FC<CalibratorAssetManagerProps> = ({
  calibrators,
  loans = [],
  technicians,
  onAddCalibrator,
  onUpdateCalibrator,
  onDeleteCalibrator,
  onSyncOfficialCalibrators,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onReturnCalibrator,
  onToggleCalibratorAvailability
}) => {
  // Navigation subtabs: 'assets' or 'loans'
  const [activeSubTab, setActiveSubTab] = useState<'assets' | 'loans'>('assets');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedCalibrator, setSelectedCalibrator] = useState<CalibratorAsset | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCalibrator, setEditingCalibrator] = useState<CalibratorAsset | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [deleteTargetCalibrator, setDeleteTargetCalibrator] = useState<CalibratorAsset | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Loan Modal States
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<CalibratorLoan | null>(null);
  const [preselectedCalibratorId, setPreselectedCalibratorId] = useState<string | undefined>(undefined);

  // Loan Print Modal States
  const [isLoanPrintModalOpen, setIsLoanPrintModalOpen] = useState(false);
  const [printingLoan, setPrintingLoan] = useState<CalibratorLoan | null>(null);

  // Return Calibrator Modal States
  const [returningLoan, setReturningLoan] = useState<CalibratorLoan | null>(null);
  const [returningCalibrator, setReturningCalibrator] = useState<CalibratorAsset | null>(null);
  const [returnDate, setReturnDate] = useState<string>(TODAY_STR);
  const [returnCondition, setReturnCondition] = useState<string>('Sangat Baik & Lengkap di Rak');

  // Loan Filters
  const [loanFilterStatus, setLoanFilterStatus] = useState<'ALL' | 'Dipinjam' | 'Dikembalikan'>('ALL');
  const [loanSearchTerm, setLoanSearchTerm] = useState('');

  // Maintenance form state
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintBy, setMaintBy] = useState('BPFK Jakarta (Laboratorium Kalibrasi)');
  const [newCertDate, setNewCertDate] = useState('');

  // New / Edit Calibrator Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newLab, setNewLab] = useState('BPFK Jakarta (Terakreditasi KAN)');
  const [newCertNo, setNewCertNo] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [newCondition, setNewCondition] = useState<CalibratorCondition>('Sangat Baik');
  const [newLocation, setNewLocation] = useState('Ruang Master Metrologi PT SMK');

  // Calibration dates: Auto 1-year logic
  const [newCalDate, setNewCalDate] = useState(TODAY_STR);
  const [newDueDate, setNewDueDate] = useState('2027-08-30');

  const handleCalDateChange = (dateVal: string) => {
    setNewCalDate(dateVal);
    if (dateVal) {
      try {
        const d = new Date(dateVal);
        d.setFullYear(d.getFullYear() + 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setNewDueDate(`${yyyy}-${mm}-${dd}`);
      } catch (err) {
        // fallback
      }
    }
  };

  const openAddModal = () => {
    setEditingCalibrator(null);
    setNewCode(`CAL-${Date.now().toString().slice(-4)}`);
    setNewName('');
    setNewBrand('Fluke Biomedical');
    setNewModel('');
    setNewSerial('');
    setNewPurchasePrice('125000000');
    setNewLab('BPFK Jakarta (Terakreditasi KAN)');
    setNewCertNo('');
    setNewHolder('');
    setNewCondition('Sangat Baik');
    setNewLocation('Ruang Master Metrologi PT SMK');
    handleCalDateChange(TODAY_STR);
    setShowAddModal(true);
  };

  const openEditModal = (cal: CalibratorAsset) => {
    setEditingCalibrator(cal);
    setNewCode(cal.code);
    setNewName(cal.name);
    setNewBrand(cal.brand);
    setNewModel(cal.model);
    setNewSerial(cal.serialNumber);
    setNewPurchasePrice(String(cal.purchasePrice));
    setNewLab(cal.calibrationLab);
    setNewCertNo(cal.certificateNumber);
    setNewHolder(cal.currentHolderTechnician || '');
    setNewCondition(cal.condition);
    setNewLocation(cal.location);
    setNewCalDate(cal.lastCalibratedDate);
    setNewDueDate(cal.nextCalibrationDueDate);
    setShowAddModal(true);
  };

  // Loan handlers
  const handleOpenNewLoan = (calibratorId?: string) => {
    setEditingLoan(null);
    setPreselectedCalibratorId(calibratorId);
    setIsLoanModalOpen(true);
  };

  const handleOpenEditLoan = (loan: CalibratorLoan) => {
    setEditingLoan(loan);
    setPreselectedCalibratorId(loan.calibratorId);
    setIsLoanModalOpen(true);
  };

  const handleOpenPrintLoan = (loan: CalibratorLoan) => {
    setPrintingLoan(loan);
    setIsLoanPrintModalOpen(true);
  };

  const handleOpenReturnModal = (cal: CalibratorAsset) => {
    setReturningCalibrator(cal);
    const activeLoan = loans.find(l => (l.calibratorId === cal.id || l.calibratorCode === cal.code) && l.status === 'Dipinjam');
    setReturningLoan(activeLoan || null);
    setReturnDate(TODAY_STR);
    setReturnCondition('Sangat Baik, Lengkap & Terkalibrasi');
  };

  const handleConfirmReturn = () => {
    if (returningCalibrator) {
      if (onReturnCalibrator) {
        onReturnCalibrator(returningCalibrator.id, returnDate, returnCondition);
      } else {
        // Fallback local update
        onUpdateCalibrator({
          ...returningCalibrator,
          isAvailable: true,
          currentBorrower: '',
          currentLoanId: '',
          location: 'Ruang Master Metrologi PT SMK',
          currentHolderTechnician: 'Tersedia di Lab PT SMK'
        });
      }
    }
    setReturningCalibrator(null);
    setReturningLoan(null);
  };

  const handleSaveLoan = (loanToSave: CalibratorLoan) => {
    if (onAddLoan && onUpdateLoan) {
      if (editingLoan) {
        onUpdateLoan(loanToSave);
      } else {
        onAddLoan(loanToSave);
      }
    }

    // Update the corresponding Calibrator availability
    const targetCal = calibrators.find(c => c.id === loanToSave.calibratorId);
    if (targetCal) {
      const isBorrow = loanToSave.status === 'Dipinjam';
      onUpdateCalibrator({
        ...targetCal,
        isAvailable: !isBorrow,
        currentBorrower: isBorrow ? loanToSave.borrowerName : '',
        currentLoanId: isBorrow ? loanToSave.id : '',
        currentHolderTechnician: isBorrow ? loanToSave.borrowerName : 'Tersedia di Lab PT SMK'
      });
    }
  };

  // Filtered Assets List
  const filteredCalibrators = calibrators.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCondition = conditionFilter === 'ALL' || c.condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  // Filtered Loans List
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      if (loanFilterStatus !== 'ALL' && loan.status !== loanFilterStatus) return false;
      if (loanSearchTerm.trim()) {
        const q = loanSearchTerm.toLowerCase();
        const matchName = loan.borrowerName.toLowerCase().includes(q);
        const matchPurpose = loan.purpose.toLowerCase().includes(q);
        const matchCal = loan.calibratorName.toLowerCase().includes(q);
        const matchNumber = loan.loanNumber.toLowerCase().includes(q);
        if (!matchName && !matchPurpose && !matchCal && !matchNumber) {
          return false;
        }
      }
      return true;
    });
  }, [loans, loanFilterStatus, loanSearchTerm]);

  const totalValue = calibrators.reduce((acc, c) => acc + c.currentValue, 0);
  const totalPurchase = calibrators.reduce((acc, c) => acc + c.purchasePrice, 0);
  const expiringCount = calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang').length;
  const availableCount = calibrators.filter(c => c.isAvailable !== false).length;
  const borrowedCount = calibrators.filter(c => c.isAvailable === false).length;

  const handleSaveCalibrator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) return;

    const price = Number(newPurchasePrice) || 100000000;

    if (editingCalibrator) {
      const updated: CalibratorAsset = {
        ...editingCalibrator,
        code: newCode,
        name: newName,
        brand: newBrand || 'Standard Fluke/Rigel',
        model: newModel || 'Master Series',
        serialNumber: newSerial || `SN-${Date.now().toString().slice(-6)}`,
        purchasePrice: price,
        currentValue: price,
        lastCalibratedDate: newCalDate,
        nextCalibrationDueDate: newDueDate,
        calibrationLab: newLab,
        certificateNumber: newCertNo || `CERT-KAN-${Date.now().toString().slice(-4)}`,
        condition: newCondition,
        location: newLocation,
        currentHolderTechnician: newHolder || 'Tersedia di Lab PT SMK'
      };
      onUpdateCalibrator(updated);
    } else {
      const newItem: CalibratorAsset = {
        id: `CAL-${Date.now().toString().slice(-4)}`,
        code: newCode,
        name: newName,
        brand: newBrand || 'Standard Fluke/Rigel',
        model: newModel || 'Master Series',
        serialNumber: newSerial || `SN-${Date.now().toString().slice(-6)}`,
        purchaseDate: TODAY_STR,
        purchasePrice: price,
        currentValue: price,
        lastCalibratedDate: newCalDate,
        nextCalibrationDueDate: newDueDate,
        calibrationLab: newLab,
        certificateNumber: newCertNo || `CERT-KAN-${Date.now().toString().slice(-4)}`,
        condition: newCondition,
        location: newLocation,
        currentHolderTechnician: newHolder || 'Tersedia di Lab PT SMK',
        isAvailable: true,
        maintenanceLog: [
          {
            date: TODAY_STR,
            description: 'Pencatatan inventaris baru & sertifikasi awal PT. Sarana Multi Kalibrasi',
            cost: 0,
            performedBy: 'Internal Metrologi PT SMK'
          }
        ]
      };
      onAddCalibrator(newItem);
    }

    setShowAddModal(false);
    setEditingCalibrator(null);
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalibrator || !maintDesc) return;

    const costNum = Number(maintCost) || 0;
    const updated: CalibratorAsset = {
      ...selectedCalibrator,
      condition: 'Sangat Baik',
      lastCalibratedDate: TODAY_STR,
      nextCalibrationDueDate: newCertDate || '2027-08-30',
      maintenanceLog: [
        {
          date: TODAY_STR,
          description: maintDesc,
          cost: costNum,
          performedBy: maintBy
        },
        ...selectedCalibrator.maintenanceLog
      ]
    };

    onUpdateCalibrator(updated);
    setSelectedCalibrator(updated);
    setShowMaintenanceModal(false);
    setMaintDesc('');
    setMaintCost('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white text-slate-800 p-5 rounded-2xl border border-[#D8D2CB] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1C658C]">
                  Aset & Peminjaman Alat Kalibrator Medis Master
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/20 font-mono">
                  {calibrators.length} Unit Master Terdata
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Pencatatan 57 alat standar kalibrasi PT SMK, fitur peminjaman unit operasional teknisi on-site, sertifikat KAN/BPFK 1 tahun, dan cetak form serah terima.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Action: Pinjam Unit Calibrator */}
          <button
            onClick={() => handleOpenNewLoan()}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            id="btn-loan-calibrator-top"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pinjam Unit Kalibrator</span>
          </button>

          {onSyncOfficialCalibrators && (
            <button
              onClick={() => {
                setIsSyncing(true);
                onSyncOfficialCalibrators();
                setTimeout(() => setIsSyncing(false), 800);
              }}
              disabled={isSyncing}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Sinkronkan 57 Master Kalibrator ke Database Cloud Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron 57 Master'}</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            id="btn-add-calibrator"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Master</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Switcher: Master Katalog vs Riwayat Peminjaman */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 w-fit">
        <button
          onClick={() => setActiveSubTab('assets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'assets'
              ? 'bg-[#1C658C] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Katalog 57 Alat Master ({calibrators.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('loans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeSubTab === 'loans'
              ? 'bg-[#1C658C] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Peminjaman Unit</span>
          {borrowedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
              {borrowedCount} Dipinjam
            </span>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-[#D8D2CB] shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Nilai Buku Alat</p>
          <h3 className="text-xl sm:text-2xl font-black text-[#1C658C] mt-1 font-mono">{formatRupiah(totalValue)}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Nilai perolehan: {formatRupiah(totalPurchase)}</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-[#D8D2CB] shadow-xs">
          <p className="text-xs font-medium text-slate-500">Unit Siap di Rak Lab</p>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 font-mono">{availableCount} Unit Tersedia</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Siap digunakan operasional on-site</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-[#D8D2CB] shadow-xs">
          <p className="text-xs font-medium text-slate-500">Sedang Dipinjam Lapangan</p>
          <h3 className={`text-xl sm:text-2xl font-black mt-1 font-mono ${borrowedCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {borrowedCount} Unit Dipinjam
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Operasional kalibrasi di Rumah Sakit</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-[#D8D2CB] shadow-xs">
          <p className="text-xs font-medium text-slate-500">Status Sertifikat KAN/BPFK</p>
          <h3 className={`text-xl sm:text-2xl font-black mt-1 font-mono ${expiringCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {expiringCount > 0 ? `${expiringCount} Butuh Kalibrasi` : '100% Aktif'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Standar Akreditasi KAN LK-532-IDN</p>
        </div>
      </div>

      {/* VIEW 1: MASTER ASSETS TAB */}
      {activeSubTab === 'assets' && (
        <div className="space-y-4">
          {/* Search & Filter & View Toggle */}
          <div className="bg-white p-4 rounded-2xl border border-[#D8D2CB] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode, nama alat, merek, tipe, no seri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1C658C]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="bg-white border border-[#D8D2CB] text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#1C658C]"
              >
                <option value="ALL">Semua Kondisi ({calibrators.length})</option>
                <option value="Sangat Baik">Sangat Baik ({calibrators.filter(c => c.condition === 'Sangat Baik').length})</option>
                <option value="Siap Pakai">Siap Pakai ({calibrators.filter(c => c.condition === 'Siap Pakai').length})</option>
                <option value="Perlu Kalibrasi Ulang">Perlu Kalibrasi Ulang ({calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang').length})</option>
                <option value="Dalam Perbaikan">Dalam Perbaikan ({calibrators.filter(c => c.condition === 'Dalam Perbaikan').length})</option>
              </select>

              {/* View Mode Toggle: Table vs Cards */}
              <div className="flex items-center bg-[#EEEEEE] p-1 rounded-xl border border-[#D8D2CB]">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    viewMode === 'table' ? 'bg-white text-[#1C658C] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilan Tabel Lengkap"
                >
                  <TableIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Tabel</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    viewMode === 'cards' ? 'bg-white text-[#1C658C] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilan Kartu Visual"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Kartu</span>
                </button>
              </div>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-[#D8D2CB] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1C658C] text-white uppercase text-[11px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-3.5 py-3 w-12 text-center">No</th>
                      <th className="px-3.5 py-3 w-28">Kode Aset</th>
                      <th className="px-4 py-3 min-w-[200px]">Nama Alat Standar Kalibrator</th>
                      <th className="px-3.5 py-3 min-w-[130px]">Merek / Tipe</th>
                      <th className="px-3.5 py-3 min-w-[130px]">No. Seri (SN)</th>
                      <th className="px-3.5 py-3 text-center w-28">Ketersediaan</th>
                      <th className="px-3.5 py-3 min-w-[120px]">Habis Kalibrasi</th>
                      <th className="px-3 py-3 text-center w-24">Kondisi</th>
                      <th className="px-3.5 py-3 text-right w-28">Nilai Buku</th>
                      <th className="px-3.5 py-3 text-center w-36">Aksi & Pinjam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D2CB]">
                    {filteredCalibrators.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-400 bg-slate-50/50">
                          <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700">Tidak ada alat kalibrator yang cocok.</p>
                          <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter kondisi.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCalibrators.map((cal, idx) => {
                        const daysToExpire = calculateDaysRemaining(cal.nextCalibrationDueDate, TODAY_STR);
                        const isExpiringSoon = daysToExpire <= 30;
                        const isAvailable = cal.isAvailable !== false;

                        return (
                          <tr key={cal.id} className="hover:bg-[#EEEEEE]/50 transition-colors">
                            <td className="px-3.5 py-3 text-center font-bold text-slate-500 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-3.5 py-3 font-mono font-bold text-[#1C658C]">
                              <span className="bg-[#1C658C]/10 px-2 py-0.5 rounded border border-[#1C658C]/20">
                                {cal.code}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              <div>{cal.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>Lab: {cal.calibrationLab}</span>
                                {cal.currentHolderTechnician && (
                                  <span className="text-[#1C658C] font-medium">• Lokasi: {cal.currentHolderTechnician}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-slate-700">
                              <div className="font-medium">{cal.brand}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{cal.model}</div>
                            </td>
                            <td className="px-3.5 py-3 font-mono font-bold text-slate-800 text-[11px]">
                              {cal.serialNumber}
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              {isAvailable ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>Tersedia</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300" title={`Dipinjam: ${cal.currentBorrower || 'Teknisi'}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  <span>Dipinjam</span>
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3">
                              <div className={`text-[10px] font-mono font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-700'}`}>
                                {formatIndonesianDate(cal.nextCalibrationDueDate)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {daysToExpire > 0 ? `${daysToExpire} hari` : 'Kedaluwarsa'}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                                cal.condition === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                cal.condition === 'Siap Pakai' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                                'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {cal.condition}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono font-bold text-[#1C658C] whitespace-nowrap">
                              {formatRupiah(cal.currentValue)}
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAvailable ? (
                                  <button
                                    onClick={() => handleOpenNewLoan(cal.id)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Pinjam Unit Ini"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    <span>Pinjam</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenReturnModal(cal)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Kembalikan Unit Ini"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Kembalikan</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => openEditModal(cal)}
                                  className="p-1.5 text-slate-600 hover:text-[#1C658C] hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit Alat"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCalibrator(cal);
                                    setShowMaintenanceModal(true);
                                  }}
                                  className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors"
                                  title="Log & Re-Kalibrasi"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteCalibrator && (
                                  <button
                                    onClick={() => setDeleteTargetCalibrator(cal)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Hapus Alat"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
          )}

          {/* CARDS GRID VIEW */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCalibrators.map((cal) => {
                const daysToExpire = calculateDaysRemaining(cal.nextCalibrationDueDate, TODAY_STR);
                const isExpiringSoon = daysToExpire <= 30;
                const isAvailable = cal.isAvailable !== false;

                return (
                  <div
                    key={cal.id}
                    className="bg-white rounded-2xl border border-[#D8D2CB] hover:border-[#398AB9] shadow-xs transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-4 border-b border-[#D8D2CB] bg-[#EEEEEE]/40">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[11px] font-bold bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/20 px-2 py-0.5 rounded">
                          {cal.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isAvailable ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Tersedia
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              Dipinjam
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            cal.condition === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            cal.condition === 'Siap Pakai' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                            'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {cal.condition}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-slate-800 group-hover:text-[#1C658C] transition-colors line-clamp-1">
                        {cal.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cal.brand} • {cal.model}
                      </p>
                    </div>

                    <div className="p-4 space-y-2.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Nomor Seri:</span>
                        <span className="font-mono font-bold text-slate-800">{cal.serialNumber}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-500">
                        <span>Lab Penguji KAN:</span>
                        <span className="text-slate-700 truncate max-w-[170px]">{cal.calibrationLab}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-500">
                        <span>Tanggal Kalibrasi:</span>
                        <span className="text-slate-800 font-mono">{formatIndonesianDate(cal.lastCalibratedDate)}</span>
                      </div>

                      <div className="p-2.5 bg-[#EEEEEE]/60 rounded-xl border border-[#D8D2CB]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">Habis Masa Kalibrasi:</span>
                          <span className={`text-xs font-mono font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {formatIndonesianDate(cal.nextCalibrationDueDate)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {daysToExpire > 0 ? `Sisa ${daysToExpire} hari lagi` : 'Kedaluwarsa / Perlu Re-Kalibrasi'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-slate-500 pt-1">
                        <span>Pemegang / Lokasi:</span>
                        <span className="text-[#1C658C] font-medium truncate max-w-[160px]">{cal.currentHolderTechnician || cal.location}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#D8D2CB]">
                        <span className="text-slate-500">Nilai Buku:</span>
                        <span className="text-sm font-black text-[#1C658C] font-mono">{formatRupiah(cal.currentValue)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#EEEEEE]/50 border-t border-[#D8D2CB] flex items-center justify-between gap-1.5">
                      {isAvailable ? (
                        <button
                          onClick={() => handleOpenNewLoan(cal.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Pinjam Unit</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenReturnModal(cal)}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kembalikan</span>
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(cal)}
                        className="bg-white hover:bg-[#EEEEEE] text-[#1C658C] border border-[#D8D2CB] text-xs font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-xs"
                        title="Edit Alat"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCalibrator(cal);
                          setShowMaintenanceModal(true);
                        }}
                        className="bg-[#1C658C]/10 hover:bg-[#1C658C]/20 text-[#1C658C] border border-[#1C658C]/30 text-xs font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-colors"
                        title="Log Kalibrasi"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteCalibrator && (
                        <button
                          onClick={() => setDeleteTargetCalibrator(cal)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Hapus Alat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: LOANS & BORROWING HISTORY TAB */}
      {activeSubTab === 'loans' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="Cari peminjam, alat, nomor form..."
                  value={loanSearchTerm}
                  onChange={(e) => setLoanSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1C658C]/20 outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={loanFilterStatus}
                onChange={(e) => setLoanFilterStatus(e.target.value as any)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Semua Status ({loans.length})</option>
                <option value="Dipinjam">🔵 Sedang Dipinjam ({loans.filter(l => l.status === 'Dipinjam').length})</option>
                <option value="Dikembalikan">🟢 Sudah Dikembalikan ({loans.filter(l => l.status === 'Dikembalikan').length})</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenNewLoan()}
              className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Form Peminjaman Baru</span>
            </button>
          </div>

          {/* Loans Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200 text-[11px]">
                    <th className="px-3.5 py-3 text-center w-12">No</th>
                    <th className="px-3.5 py-3 w-44">Alat Kalibrator</th>
                    <th className="px-4 py-3 min-w-[150px]">Nama Peminjam</th>
                    <th className="px-3.5 py-3 min-w-[120px]">Tanggal Pinjam</th>
                    <th className="px-4 py-3 min-w-[200px]">Keperluan (RS / Lapangan)</th>
                    <th className="px-3.5 py-3 text-center min-w-[100px]">Durasi</th>
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
                            <Wrench className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="font-bold text-slate-700 text-sm">Riwayat Peminjaman Alat Kalibrator Kosong</p>
                          <p className="text-xs text-slate-500">
                            Belum ada catatan peminjaman alat kalibrator master. Seluruh 57 alat tersimpan aman di rak lab.
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleOpenNewLoan()}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Pinjam Unit Kalibrator</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan, index) => {
                      const calInfo = calibrators.find(c => c.id === loan.calibratorId || c.code === loan.calibratorCode);

                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-3.5 text-center font-bold text-slate-700 font-mono">
                            {index + 1}
                          </td>
                          <td className="px-3.5 py-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-[#1C658C] shrink-0" />
                              <span className="line-clamp-1">{loan.calibratorName}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {calInfo?.code || loan.calibratorCode} • SN: {calInfo?.serialNumber || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{loan.borrowerName}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">{loan.borrowerRole || 'Teknisi Elektromedis'}</div>
                          </td>
                          <td className="px-3.5 py-3.5">
                            <div className="font-mono text-slate-800 font-medium text-[11px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatIndonesianDate(loan.borrowDate)}</span>
                            </div>
                            {loan.expectedReturnDate && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Rencana: {formatIndonesianDate(loan.expectedReturnDate)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-800 font-medium max-w-[240px]">
                            <p className="line-clamp-2 leading-relaxed">{loan.purpose}</p>
                          </td>
                          <td className="px-3.5 py-3.5 text-center font-medium text-slate-700 font-mono">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                              {loan.duration}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 text-[11px] max-w-[200px]">
                            <p className="line-clamp-2">{loan.notes || '-'}</p>
                            {loan.actualReturnDate && (
                              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                Kembali: {formatIndonesianDate(loan.actualReturnDate)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            {loan.status === 'Dipinjam' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>Dipinjam</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Dikembalikan</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenPrintLoan(loan)}
                                className="p-1.5 text-slate-600 hover:text-[#1C658C] hover:bg-slate-100 rounded-lg transition-colors"
                                title="Cetak Form Serah Terima"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditLoan(loan)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Peminjaman"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteLoan && (
                                <button
                                  onClick={() => onDeleteLoan(loan.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Hapus Catatan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      )}

      {/* MODAL: ADD / EDIT CALIBRATOR ASSET */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveCalibrator} className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#D8D2CB] max-h-[90vh] overflow-y-auto text-slate-800">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#1C658C] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#1C658C]" />
                <span>{editingCalibrator ? 'Edit Master Alat Kalibrator' : 'Tambah Master Kalibrator Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Standar metrologi PT. Sarana Multi Kalibrasi (LK-532-IDN)
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Alat *</label>
                  <input
                    type="text"
                    required
                    placeholder="CAL-001"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Seri (SN) *</label>
                  <input
                    type="text"
                    required
                    placeholder="SN-9823412"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Alat Kalibrator *</label>
                <input
                  type="text"
                  required
                  placeholder="Fluke ESA620 Electrical Safety Analyzer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Merek</label>
                  <input
                    type="text"
                    placeholder="Fluke Biomedical"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipe / Model</label>
                  <input
                    type="text"
                    placeholder="ESA 620 Pro"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nilai Perolehan / Buku (Rp)</label>
                  <input
                    type="number"
                    placeholder="125000000"
                    value={newPurchasePrice === '0' ? '' : newPurchasePrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setNewPurchasePrice(raw);
                    }}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kondisi Alat</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as CalibratorCondition)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Siap Pakai">Siap Pakai</option>
                    <option value="Perlu Kalibrasi Ulang">Perlu Kalibrasi Ulang</option>
                    <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                  </select>
                </div>
              </div>

              {/* Calibration Dates */}
              <div className="p-3 bg-[#EEEEEE]/70 rounded-xl border border-[#D8D2CB] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#1C658C] text-xs">Masa Berlaku Kalibrasi KAN (Otomatis 1 Tahun)</label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Tanggal Kalibrasi</label>
                    <input
                      type="date"
                      value={newCalDate}
                      onChange={(e) => handleCalDateChange(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D8D2CB] rounded-lg text-slate-800 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Jatuh Tempo (Otomatis +1 Thn)</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full p-2 bg-white border border-[#1C658C] rounded-lg text-[#1C658C] font-bold font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lab Penguji Terakreditasi KAN</label>
                  <input
                    type="text"
                    placeholder="BPFK Jakarta"
                    value={newLab}
                    onChange={(e) => setNewLab(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Sertifikat Kalibrasi</label>
                  <input
                    type="text"
                    placeholder="CERT-KAN-2026-99"
                    value={newCertNo}
                    onChange={(e) => setNewCertNo(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {editingCalibrator ? 'Simpan Perubahan Alat' : 'Simpan Aset Kalibrator'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MAINTENANCE / LOG RE-KALIBRASI */}
      {showMaintenanceModal && selectedCalibrator && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddMaintenance} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D8D2CB] text-slate-800">
            <h3 className="text-base font-bold text-[#1C658C]">
              Log Kalibrasi Ulang & Pemeliharaan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              {selectedCalibrator.code} - {selectedCalibrator.name}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rincian Tindakan / Pengujian *</label>
                <input
                  type="text"
                  required
                  placeholder="Re-kalibrasi berkala BPFK & penggantian fuse pengaman"
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Biaya Lab / Perbaikan (Rp)</label>
                  <input
                    type="number"
                    placeholder="4500000"
                    value={maintCost === '0' ? '' : maintCost}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setMaintCost(raw);
                    }}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pelaksana / Lab</label>
                  <input
                    type="text"
                    value={maintBy}
                    onChange={(e) => setMaintBy(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Habis Kalibrasi Baru (1 Tahun Kedepan)</label>
                <input
                  type="date"
                  value={newCertDate || '2027-08-30'}
                  onChange={(e) => setNewCertDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#1C658C] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan Log Perawatan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: RETURN CALIBRATOR */}
      {returningCalibrator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>Pengembalian Alat Kalibrator Master</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Konfirmasi unit <span className="font-bold text-[#1C658C]">{returningCalibrator.code} - {returningCalibrator.name}</span> telah dikembalikan ke rak laboratorium.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Pengembalian</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kondisi & Kelengkapan Alat Saat Kembali</label>
                <textarea
                  rows={2}
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReturningCalibrator(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Pengembalian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALIBRATOR LOAN MODAL */}
      <CalibratorLoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        onSave={handleSaveLoan}
        calibrators={calibrators}
        technicians={technicians}
        initialLoan={editingLoan}
        defaultCalibratorId={preselectedCalibratorId}
      />

      {/* CALIBRATOR LOAN PRINT MODAL */}
      {printingLoan && (
        <CalibratorLoanPrintModal
          isOpen={isLoanPrintModalOpen}
          onClose={() => {
            setIsLoanPrintModalOpen(false);
            setPrintingLoan(null);
          }}
          loan={printingLoan}
          calibrator={calibrators.find(c => c.id === printingLoan.calibratorId || c.code === printingLoan.calibratorCode)}
        />
      )}

      {/* Confirmation Modal for Calibrator Deletion */}
      <ConfirmDeleteModal
        isOpen={deleteTargetCalibrator !== null}
        title="Hapus Master Kalibrator?"
        message="Apakah Anda yakin ingin menghapus aset alat kalibrator ini dari daftar master? Seluruh catatan riwayat ketertelusuran kalibrasi alat ini akan terhapus."
        itemName={deleteTargetCalibrator ? `${deleteTargetCalibrator.code} - ${deleteTargetCalibrator.name} (${deleteTargetCalibrator.brand})` : ''}
        confirmText="Ya, Hapus Alat"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTargetCalibrator && onDeleteCalibrator) {
            onDeleteCalibrator(deleteTargetCalibrator.id);
          }
          setDeleteTargetCalibrator(null);
        }}
        onClose={() => setDeleteTargetCalibrator(null)}
      />
    </div>
  );
};
