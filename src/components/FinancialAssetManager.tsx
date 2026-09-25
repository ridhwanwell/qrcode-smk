import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Wallet, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Filter, 
  UserCheck, 
  LayoutDashboard,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  MessageSquare,
  Check,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { FinancialAsset, FinancialTransaction, Hospital, AuditStatus, MarketingStaff } from '../types';
import { formatRupiah, TODAY_STR } from '../utils/helpers';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { exportFinancialSpreadsheet, exportAuditReportSpreadsheet } from '../utils/financialExcelExport';

interface FinancialAssetManagerProps {
  financialAssets: FinancialAsset[];
  transactions: FinancialTransaction[];
  hospitals: Hospital[];
  marketingList?: MarketingStaff[];
  onAddTransaction: (trx: FinancialTransaction) => void;
  onUpdateTransaction?: (trx: FinancialTransaction) => void;
  onDeleteTransaction?: (trxId: string) => void;
  onAddFinancialAsset?: (asset: FinancialAsset) => void;
  onUpdateFinancialAsset?: (asset: FinancialAsset) => void;
  onDeleteFinancialAsset?: (assetId: string) => void;
}

export const FinancialAssetManager: React.FC<FinancialAssetManagerProps> = ({
  financialAssets = [],
  transactions = [],
  hospitals = [],
  marketingList = [],
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction
}) => {
  // Tabs: 'dashboard' | 'income' | 'expense' | 'transactions' | 'audit'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense' | 'transactions' | 'audit'>('dashboard');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [trxTypeFilter, setTrxTypeFilter] = useState<string>('ALL');

  // Role Access (Only 'admin_utama' can alter audit status / notes)
  const [userRole, setUserRole] = useState<'admin_utama' | 'staf'>('admin_utama');

  // Modal State
  const [showAddTrxModal, setShowAddTrxModal] = useState(false);
  const [editingTrx, setEditingTrx] = useState<FinancialTransaction | null>(null);
  const [auditTargetTrx, setAuditTargetTrx] = useState<FinancialTransaction | null>(null);
  const [deleteTargetTrx, setDeleteTargetTrx] = useState<FinancialTransaction | null>(null);

  // Form State for New/Edit Transaction
  const [formType, setFormType] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPic, setFormPic] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'Transfer' | 'Cash'>('Transfer');
  const [formDate, setFormDate] = useState(TODAY_STR);

  // Form State for Audit Action (Admin Utama)
  const [auditStatusInput, setAuditStatusInput] = useState<AuditStatus>('Lolos Audit');
  const [auditNotesInput, setAuditNotesInput] = useState('');

  // Helper: check if a transaction is Income (Uang Masuk)
  const isIncomeTrx = (t: FinancialTransaction): boolean => {
    const typeLower = (t.type || '').toLowerCase();
    return typeLower.includes('pemasukan') || typeLower.includes('uang masuk') || t.type === 'Pemasukan';
  };

  // Calculations
  const monthFilteredTrx = transactions.filter(t => {
    if (selectedMonth === 'ALL') return true;
    return t.date.startsWith(selectedMonth);
  });

  const totalIncome = monthFilteredTrx
    .filter(isIncomeTrx)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = monthFilteredTrx
    .filter(t => !isIncomeTrx(t))
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // Chart Data Preparation (Monthly Breakdown)
  const getMonthlyChartData = () => {
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
    const monthLabels: Record<string, string> = {
      '2026-05': 'Mei 2026',
      '2026-06': 'Juni 2026',
      '2026-07': 'Juli 2026',
      '2026-08': 'Agustus 2026',
      '2026-09': 'September 2026'
    };

    let cumulativeBalance = 0;

    return months.map(m => {
      const monthItems = transactions.filter(t => t.date.startsWith(m));
      const inc = monthItems.filter(isIncomeTrx).reduce((acc, c) => acc + c.amount, 0);
      const exp = monthItems.filter(t => !isIncomeTrx(t)).reduce((acc, c) => acc + c.amount, 0);
      
      const net = inc - exp;
      cumulativeBalance += net;

      return {
        month: monthLabels[m] || m,
        Pemasukan: inc,
        Pengeluaran: exp,
        'Saldo Saat Ini': cumulativeBalance
      };
    });
  };

  const chartData = getMonthlyChartData();

  // Filtered lists for each tab
  const incomeTransactions = transactions.filter(t => isIncomeTrx(t) && matchesSearch(t));
  const expenseTransactions = transactions.filter(t => !isIncomeTrx(t) && matchesSearch(t));

  function matchesSearch(t: FinancialTransaction): boolean {
    const term = searchTerm.toLowerCase();
    const matchText = 
      (t.category || '').toLowerCase().includes(term) ||
      (t.description || '').toLowerCase().includes(term) ||
      (t.pic || '').toLowerCase().includes(term) ||
      (t.referenceNo || '').toLowerCase().includes(term) ||
      (t.paymentMethod || '').toLowerCase().includes(term);

    const matchMonth = selectedMonth === 'ALL' || t.date.startsWith(selectedMonth);
    const matchAudit = auditFilter === 'ALL' || t.auditStatus === auditFilter;
    const matchType = trxTypeFilter === 'ALL' || 
      (trxTypeFilter === 'INCOME' && isIncomeTrx(t)) ||
      (trxTypeFilter === 'EXPENSE' && !isIncomeTrx(t));

    return matchText && matchMonth && matchAudit && matchType;
  }

  const allFilteredTransactions = transactions.filter(matchesSearch);

  // Open Add Modal for specific type
  const openAddModal = (type: 'Pemasukan' | 'Pengeluaran') => {
    setEditingTrx(null);
    setFormType(type);
    setFormCategory('');
    setFormAmount('');
    setFormDesc('');
    setFormPic('');
    setFormPaymentMethod('Transfer');
    setFormDate(TODAY_STR);
    setShowAddTrxModal(true);
  };

  // Open Edit Modal
  const openEditModal = (trx: FinancialTransaction) => {
    setEditingTrx(trx);
    setFormType(isIncomeTrx(trx) ? 'Pemasukan' : 'Pengeluaran');
    setFormCategory(trx.category || '');
    setFormAmount(trx.amount ? trx.amount.toString() : '');
    setFormDesc(trx.description || '');
    setFormPic(trx.pic || '');
    setFormPaymentMethod(trx.paymentMethod || 'Transfer');
    setFormDate(trx.date || TODAY_STR);
    setShowAddTrxModal(true);
  };

  // Handle Save New/Edit Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formAmount) return;

    const amountNum = Number(formAmount) || 0;

    if (editingTrx && onUpdateTransaction) {
      const updated: FinancialTransaction = {
        ...editingTrx,
        date: formDate,
        type: formType,
        category: formCategory,
        amount: amountNum,
        description: formDesc,
        pic: formPic,
        paymentMethod: formPaymentMethod
      };
      onUpdateTransaction(updated);
    } else {
      const newTrx: FinancialTransaction = {
        id: `TRX-2026-${Date.now().toString().slice(-5)}`,
        date: formDate || TODAY_STR,
        type: formType,
        category: formCategory,
        amount: amountNum,
        referenceNo: `${formType === 'Pemasukan' ? 'INV' : 'EXP'}/SMK/2026/${Date.now().toString().slice(-4)}`,
        description: formDesc,
        pic: formPic || 'Finance Dept',
        paymentMethod: formPaymentMethod,
        recordedBy: 'Finance Dept PT SMK',
        auditStatus: 'Belum Diaudit'
      };
      onAddTransaction(newTrx);
    }

    setShowAddTrxModal(false);
  };

  // Open Audit Modal (Only for Admin Utama)
  const openAuditModal = (trx: FinancialTransaction) => {
    if (userRole !== 'admin_utama') return;
    setAuditTargetTrx(trx);
    setAuditStatusInput(trx.auditStatus || 'Lolos Audit');
    setAuditNotesInput(trx.auditNotes || '');
  };

  // Save Audit Status & Notes
  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditTargetTrx || !onUpdateTransaction) return;

    const updatedTrx: FinancialTransaction = {
      ...auditTargetTrx,
      auditStatus: auditStatusInput,
      auditNotes: auditNotesInput,
      auditorName: 'Admin Utama PT SMK',
      auditedAt: TODAY_STR
    };

    onUpdateTransaction(updatedTrx);
    setAuditTargetTrx(null);
  };

  // Quick Pass Audit (Admin Utama 1-Click)
  const handleQuickAuditPass = (trx: FinancialTransaction) => {
    if (userRole !== 'admin_utama' || !onUpdateTransaction) return;
    const updated: FinancialTransaction = {
      ...trx,
      auditStatus: 'Lolos Audit',
      auditNotes: trx.auditNotes || 'Lolos verifikasi audit keuangan Admin Utama.',
      auditorName: 'Admin Utama PT SMK',
      auditedAt: TODAY_STR
    };
    onUpdateTransaction(updated);
  };

  return (
    <div className="space-[#1C658C] flex flex-col gap-6 pb-12">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-[#D8D2CB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1C658C]/10 text-[#1C658C] rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Manajemen Aset Keuangan</h1>
              <p className="text-xs text-slate-500">
                Monitoring arus kas (Pemasukan & Pengeluaran), grafik saldo, serta audit akuntabilitas transaksi.
              </p>
            </div>
          </div>
        </div>

        {/* TOP ACTION & ROLE TOGGLE */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Admin Utama vs Staf Role Toggle */}
          <div className="flex items-center bg-[#EEEEEE] p-1 rounded-xl border border-[#D8D2CB]">
            <button
              onClick={() => setUserRole('admin_utama')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                userRole === 'admin_utama'
                  ? 'bg-[#1C658C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Admin Utama</span>
            </button>
            <button
              onClick={() => setUserRole('staf')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                userRole === 'staf'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Staf / Viewer</span>
            </button>
          </div>

          <button
            onClick={() => exportFinancialSpreadsheet(transactions)}
            className="px-4 py-2 bg-[#398E3D] hover:bg-[#2e7332] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Spreadsheet</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS (Dashboard | Pemasukan | Pengeluaran | Transaksi | Audit) */}
      <div className="flex items-center gap-2 border-b border-[#D8D2CB] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#1C658C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#EEEEEE] border border-[#D8D2CB]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'income'
              ? 'bg-[#398E3D] text-white shadow-xs'
              : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Pemasukan</span>
        </button>

        <button
          onClick={() => setActiveTab('expense')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'expense'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Pengeluaran</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Transaksi</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Keuangan</span>
        </button>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* TAB 1: DASHBOARD (Saldo saat ini, Total Pemasukan, Total Pengeluaran, Grafik) */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* SALDO SAAT INI (BLUE) */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Saldo Saat Ini</span>
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-blue-950 tracking-tight">
                {formatRupiah(currentBalance)}
              </h2>
              <p className="text-xs text-blue-700/80 mt-1 font-medium flex items-center gap-1">
                <span>Net Kas Operasional & Penerimaan Kalibrasi</span>
              </p>
              <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs text-blue-800 font-semibold">
                <span>Grafik Biru</span>
                <span>Saldo Akumulatif</span>
              </div>
            </div>

            {/* TOTAL PEMASUKAN / UANG MASUK (GREEN) */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Pemasukan (Uang Masuk)</span>
                <div className="p-2.5 bg-[#398E3D] text-white rounded-xl shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-emerald-950 tracking-tight">
                {formatRupiah(totalIncome)}
              </h2>
              <p className="text-xs text-emerald-700/80 mt-1 font-medium">
                Penerimaan invoice RS, DP, & pembayaran kontrak
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span>Grafik Hijau</span>
                <span>Uang Masuk</span>
              </div>
            </div>

            {/* TOTAL PENGELUARAN / UANG KELUAR (RED) */}
            <div className="bg-gradient-to-br from-rose-50 to-orange-50/50 border border-rose-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Pengeluaran (Uang Keluar)</span>
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-rose-950 tracking-tight">
                {formatRupiah(totalExpense)}
              </h2>
              <p className="text-xs text-rose-700/80 mt-1 font-medium">
                Operasional lapangan, re-kalibrasi BPFK, & alat
              </p>
              <div className="mt-3 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs text-rose-800 font-semibold">
                <span>Grafik Merah</span>
                <span>Uang Keluar</span>
              </div>
            </div>
          </div>

          {/* FINANCIAL CHART SECTION */}
          <div className="bg-white rounded-2xl p-6 border border-[#D8D2CB] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#1C658C]" />
                  Grafik Perbandingan Keuangan (Hijau: Pemasukan • Merah: Pengeluaran • Biru: Saldo)
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi bulanan arus kas masuk, arus kas keluar, dan perkembangan saldo saat ini.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportFinancialSpreadsheet(transactions)}
                  className="px-3.5 py-1.5 bg-[#398E3D] hover:bg-[#2e7332] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Spreadsheet (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* RECHARTS CHART CONTAINER */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={11} 
                    tickLine={false}
                    tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}M`} 
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatRupiah(Number(value) || 0), '']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px', 
                      border: '1px solid #D8D2CB',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' 
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '15px' }} />
                  <Bar dataKey="Pemasukan" fill="#10B981" radius={[6, 6, 0, 0]} name="Pemasukan (Hijau)" />
                  <Bar dataKey="Pengeluaran" fill="#EF4444" radius={[6, 6, 0, 0]} name="Pengeluaran (Merah)" />
                  <Bar dataKey="Saldo Saat Ini" fill="#2563EB" radius={[6, 6, 0, 0]} name="Saldo Saat Ini (Biru)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* TAB 2: PEMASUKAN (Form + Riwayat Pemasukan yang Pernah Diisikan) */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'income' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                Catatan Pemasukan (Uang Masuk)
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan resmi penerimaan jasa kalibrasi RS, DP termin kontrak, dan pendapatan usaha PT. SMK.
              </p>
            </div>

            <button
              onClick={() => openAddModal('Pemasukan')}
              className="px-4 py-2.5 bg-[#398E3D] hover:bg-[#2e7332] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Pemasukan Baru</span>
            </button>
          </div>

          {/* TABLE PEMASUKAN */}
          <div className="bg-white rounded-2xl border border-[#D8D2CB] overflow-hidden shadow-sm">
            <div className="p-4 bg-[#EEEEEE] border-b border-[#D8D2CB] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Riwayat Catatan Pemasukan ({incomeTransactions.length} Data)
              </span>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari pemasukan / PIC / RS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D8D2CB] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-[#D8D2CB]">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">PIC</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3 text-right">Nominal (Rp)</th>
                    <th className="p-3 text-center">Status Audit</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incomeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Belum ada catatan pemasukan uang masuk yang diisikan.
                      </td>
                    </tr>
                  ) : (
                    incomeTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-emerald-50/40 transition-all">
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{t.date}</td>
                        <td className="p-3 font-semibold text-slate-900">{t.category}</td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{t.description || '-'}</td>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{t.pic || t.recordedBy || '-'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.paymentMethod === 'Cash' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {t.paymentMethod || 'Transfer'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700 text-sm whitespace-nowrap">
                          + {formatRupiah(t.amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <AuditBadge status={t.auditStatus} />
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-all cursor-pointer"
                              title="Edit Catatan Pemasukan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetTrx(t)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                              title="Hapus Catatan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* TAB 3: PENGELUARAN (Form + Riwayat Pengeluaran yang Pernah Diisikan) */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'expense' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-rose-950 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
                Catatan Pengeluaran (Uang Keluar)
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan biaya operasional lapangan, re-kalibrasi alat BPFK, APD, BBM, dan pembelian aset baru.
              </p>
            </div>

            <button
              onClick={() => openAddModal('Pengeluaran')}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Pengeluaran Baru</span>
            </button>
          </div>

          {/* TABLE PENGELUARAN */}
          <div className="bg-white rounded-2xl border border-[#D8D2CB] overflow-hidden shadow-sm">
            <div className="p-4 bg-[#EEEEEE] border-b border-[#D8D2CB] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Riwayat Catatan Pengeluaran ({expenseTransactions.length} Data)
              </span>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari pengeluaran / PIC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D8D2CB] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-[#D8D2CB]">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">PIC</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3 text-right">Nominal (Rp)</th>
                    <th className="p-3 text-center">Status Audit</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Belum ada catatan pengeluaran uang keluar yang diisikan.
                      </td>
                    </tr>
                  ) : (
                    expenseTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-rose-50/40 transition-all">
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{t.date}</td>
                        <td className="p-3 font-semibold text-slate-900">{t.category}</td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{t.description || '-'}</td>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{t.pic || t.recordedBy || '-'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.paymentMethod === 'Cash' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {t.paymentMethod || 'Transfer'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600 text-sm whitespace-nowrap">
                          - {formatRupiah(t.amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <AuditBadge status={t.auditStatus} />
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                              title="Edit Catatan Pengeluaran"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetTrx(t)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                              title="Hapus Catatan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* TAB 4: TRANSAKSI (Gabungan Semua Biaya Masuk & Biaya Keluar) */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'transactions' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-indigo-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-indigo-950 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Daftar Semua Transaksi Keuangan
              </h2>
              <p className="text-xs text-slate-500">
                Mencatat semua biaya masuk (pemasukan) dan biaya keluar (pengeluaran) secara terpadu.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportFinancialSpreadsheet(transactions)}
                className="px-4 py-2 bg-[#398E3D] hover:bg-[#2e7332] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Spreadsheet (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* TABLE GABUNGAN TRANSAKSI */}
          <div className="bg-white rounded-2xl border border-[#D8D2CB] overflow-hidden shadow-sm">
            <div className="p-4 bg-[#EEEEEE] border-b border-[#D8D2CB] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Semua Transaksi ({allFilteredTransactions.length})
                </span>

                <select
                  value={trxTypeFilter}
                  onChange={(e) => setTrxTypeFilter(e.target.value)}
                  className="px-3 py-1 text-xs bg-white border border-[#D8D2CB] rounded-lg text-slate-700 font-medium"
                >
                  <option value="ALL">Semua Tipe (Masuk & Keluar)</option>
                  <option value="INCOME">Khusus Uang Masuk (Pemasukan)</option>
                  <option value="EXPENSE">Khusus Uang Keluar (Pengeluaran)</option>
                </select>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D8D2CB] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-[#D8D2CB]">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Tipe</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">PIC</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3 text-right">Nominal (Rp)</th>
                    <th className="p-3 text-center">Status Audit</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allFilteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                        Tidak ada transaksi yang cocok dengan pencarian / filter.
                      </td>
                    </tr>
                  ) : (
                    allFilteredTransactions.map(t => {
                      const isInc = isIncomeTrx(t);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-all">
                          <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{t.date}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isInc ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isInc ? 'Uang Masuk' : 'Uang Keluar'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{t.category}</td>
                          <td className="p-3 text-slate-600 max-w-xs truncate">{t.description || '-'}</td>
                          <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{t.pic || t.recordedBy || '-'}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.paymentMethod === 'Cash' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {t.paymentMethod || 'Transfer'}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-bold text-sm whitespace-nowrap ${
                            isInc ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {isInc ? `+ ${formatRupiah(t.amount)}` : `- ${formatRupiah(t.amount)}`}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <AuditBadge status={t.auditStatus} />
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(t)}
                                className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-all cursor-pointer"
                                title="Edit Transaksi"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTargetTrx(t)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* TAB 5: AUDIT KEUANGAN (Hanya Admin Utama yang Berhak Menentukan Status Audit & Catatan) */}
      {/* -------------------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-purple-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-purple-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Audit Keuangan & Laporan Audit
              </h2>
              <p className="text-xs text-slate-500">
                Verifikasi kepatuhan bukti fisik, penentuan status audit (Lolos / Tidak Lolos), serta penulisan catatan audit.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportAuditReportSpreadsheet(transactions)}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Report Audit (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* ROLE NOTICE BOX */}
          <div className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
            userRole === 'admin_utama'
              ? 'bg-purple-50/80 border-purple-200 text-purple-950'
              : 'bg-amber-50/90 border-amber-200 text-amber-950'
          }`}>
            {userRole === 'admin_utama' ? (
              <UserCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            ) : (
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <p className="font-bold text-sm mb-0.5">
                {userRole === 'admin_utama' ? 'Mode Wewenang: Admin Utama' : 'Mode Akses: Staf Finance / Viewer'}
              </p>
              <p className="text-slate-600">
                {userRole === 'admin_utama' ? (
                  <span>
                    Sebagai <strong>Admin Utama</strong>, Anda dapat mengubah status <strong>Lolos Audit / Tidak Lolos Audit</strong> dan menambahkan / mengedit <strong>Catatan Audit</strong> langsung dari web.
                  </span>
                ) : (
                  <span>
                    Hak akses verifikasi audit <strong>terkunci</strong>. Hanya <strong>Admin Utama</strong> yang dapat menyetujui, menolak, atau menambahkan catatan audit transaksi.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* TABLE AUDIT */}
          <div className="bg-white rounded-2xl border border-[#D8D2CB] overflow-hidden shadow-sm">
            <div className="p-4 bg-[#EEEEEE] border-b border-[#D8D2CB] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Transaksi Audit ({allFilteredTransactions.length})
                </span>

                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="px-3 py-1 text-xs bg-white border border-[#D8D2CB] rounded-lg text-slate-700 font-medium"
                >
                  <option value="ALL">Semua Status Audit</option>
                  <option value="Lolos Audit">Lolos Audit</option>
                  <option value="Tidak Lolos Audit">Tidak Lolos Audit</option>
                  <option value="Belum Diaudit">Belum Diaudit</option>
                  <option value="Diverifikasi Auditor">Diverifikasi Auditor</option>
                </select>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari transaksi audit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D8D2CB] rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-[#D8D2CB]">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Tipe</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">PIC</th>
                    <th className="p-3">Transfer / Cash</th>
                    <th className="p-3 text-right">Nominal (Rp)</th>
                    <th className="p-3 text-center">Status Audit</th>
                    <th className="p-3">Catatan Audit</th>
                    <th className="p-3 text-center">Aksi Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allFilteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                        Tidak ada transaksi audit yang cocok.
                      </td>
                    </tr>
                  ) : (
                    allFilteredTransactions.map(t => {
                      const isInc = isIncomeTrx(t);
                      return (
                        <tr key={t.id} className="hover:bg-purple-50/30 transition-all">
                          <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{t.date}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isInc ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isInc ? 'Uang Masuk' : 'Uang Keluar'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{t.category}</td>
                          <td className="p-3 text-slate-600 max-w-xs truncate">{t.description || '-'}</td>
                          <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{t.pic || t.recordedBy || '-'}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.paymentMethod === 'Cash' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {t.paymentMethod || 'Transfer'}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-bold text-sm whitespace-nowrap ${
                            isInc ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {formatRupiah(t.amount)}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <AuditBadge status={t.auditStatus} />
                          </td>
                          <td className="p-3 text-slate-700 max-w-xs">
                            {t.auditNotes ? (
                              <div className="p-2 bg-slate-50 border border-[#D8D2CB] rounded-lg text-[11px] text-slate-700 italic">
                                "{t.auditNotes}"
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-normal text-[11px]">- Belum ada catatan -</span>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {userRole === 'admin_utama' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleQuickAuditPass(t)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer"
                                  title="Set Langsung Lolos Audit"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Lolos</span>
                                </button>
                                <button
                                  onClick={() => openAuditModal(t)}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer"
                                  title="Kelola Audit & Catatan"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Edit Audit</span>
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-400 text-[10px] font-medium rounded-md flex items-center justify-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Terkunci</span>
                              </span>
                            )}
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

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT TRANSAKSI (PEMASUKAN / PENGELUARAN) */}
      {/* ========================================================================= */}
      {showAddTrxModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              formType === 'Pemasukan' ? 'bg-[#398E3D]' : 'bg-rose-600'
            }`}>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {formType === 'Pemasukan' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                {editingTrx ? `Edit Catatan ${formType}` : `Tambah Catatan ${formType} Baru`}
              </h3>
              <button
                onClick={() => setShowAddTrxModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              {/* TIPE TRANSAKSI TOGGLE */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('Pemasukan')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formType === 'Pemasukan' 
                        ? 'bg-[#398E3D] text-white border-[#398E3D]' 
                        : 'bg-white text-slate-700 border-[#D8D2CB]'
                    }`}
                  >
                    + Uang Masuk (Pemasukan)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('Pengeluaran')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formType === 'Pengeluaran' 
                        ? 'bg-rose-600 text-white border-rose-600' 
                        : 'bg-white text-slate-700 border-[#D8D2CB]'
                    }`}
                  >
                    - Uang Keluar (Pengeluaran)
                  </button>
                </div>
              </div>

              {/* TANGGAL & PIC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2CB] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1C658C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIC (Penanggung Jawab)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sari / Dimas / Ahmad"
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2CB] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1C658C]"
                  />
                </div>
              </div>

              {/* KATEGORI */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder={formType === 'Pemasukan' ? 'e.g. Pelunasan Invoice RS Siloam / DP Kontrak' : 'e.g. Biaya Operasional Lapangan / Re-Kalibrasi BPFK'}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2CB] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1C658C]"
                />
              </div>

              {/* METODE PEMBAYARAN & NOMINAL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as 'Transfer' | 'Cash')}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2CB] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1C658C]"
                  >
                    <option value="Transfer">Transfer Bank</option>
                    <option value="Cash">Tunai (Cash)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 15000000"
                    value={formAmount === '0' ? '' : formAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setFormAmount(raw);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2CB] rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#1C658C]"
                  />
                </div>
              </div>

              {/* KETERANGAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Catatan Transaksi</label>
                <textarea
                  rows={3}
                  placeholder="Detail rincian catatan transaksi..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2CB] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1C658C]"
                />
              </div>

              <div className="pt-3 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTrxModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-[#EEEEEE] hover:bg-[#D8D2CB] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                    formType === 'Pemasukan' ? 'bg-[#398E3D] hover:bg-[#2e7332]' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {editingTrx ? 'Simpan Perubahan' : 'Tambah Catatan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT AUDIT & CATATAN AUDIT (KHUSUS ADMIN UTAMA) */}
      {/* ========================================================================= */}
      {auditTargetTrx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-purple-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Audit Transaksi: {auditTargetTrx.category}
              </h3>
              <button
                onClick={() => setAuditTargetTrx(null)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAudit} className="p-6 space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-950">
                <p className="font-semibold">{auditTargetTrx.category} ({formatRupiah(auditTargetTrx.amount)})</p>
                <p className="text-purple-700 text-[11px] mt-0.5">PIC: {auditTargetTrx.pic || auditTargetTrx.recordedBy} • {auditTargetTrx.date}</p>
              </div>

              {/* PILIHAN STATUS AUDIT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Penentuan Status Audit (Admin Utama)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuditStatusInput('Lolos Audit')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      auditStatusInput === 'Lolos Audit'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-[#D8D2CB] hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lolos Audit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditStatusInput('Tidak Lolos Audit')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      auditStatusInput === 'Tidak Lolos Audit'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-[#D8D2CB] hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tidak Lolos Audit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditStatusInput('Diverifikasi Auditor')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      auditStatusInput === 'Diverifikasi Auditor'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-[#D8D2CB] hover:bg-blue-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Diverifikasi Auditor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditStatusInput('Belum Diaudit')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      auditStatusInput === 'Belum Diaudit'
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-700 border-[#D8D2CB] hover:bg-slate-100'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Belum Diaudit</span>
                  </button>
                </div>
              </div>

              {/* CATATAN AUDIT (ISIAN LANGSUANG PADA WEB) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isian Catatan Audit (Website) {auditStatusInput === 'Tidak Lolos Audit' && <span className="text-rose-600 font-bold">*Wajib Diisi</span>}
                </label>
                <textarea
                  rows={4}
                  required={auditStatusInput === 'Tidak Lolos Audit'}
                  placeholder="Ketikkan catatan audit terperinci di sini (alasan tidak lolos audit, kelengkapan kwitansi, bukti transfer, dll)..."
                  value={auditNotesInput}
                  onChange={(e) => setAuditNotesInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8D2CB] rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAuditTargetTrx(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-[#EEEEEE] hover:bg-[#D8D2CB] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Verifikasi Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={deleteTargetTrx !== null}
        title="Hapus Catatan Transaksi Keuangan?"
        message="Apakah Anda yakin ingin menghapus catatan transaksi ini? Tindakan ini akan menghapus data keuangan secara permanen."
        itemName={deleteTargetTrx ? `${deleteTargetTrx.category} (${formatRupiah(deleteTargetTrx.amount)})` : ''}
        confirmText="Ya, Hapus Catatan"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTargetTrx && onDeleteTransaction) {
            onDeleteTransaction(deleteTargetTrx.id);
          }
          setDeleteTargetTrx(null);
        }}
        onClose={() => setDeleteTargetTrx(null)}
      />
    </div>
  );
};

// Helper component for Audit Status Badges
function AuditBadge({ status }: { status?: AuditStatus }) {
  switch (status) {
    case 'Lolos Audit':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Lolos Audit</span>
        </span>
      );
    case 'Tidak Lolos Audit':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          <span>Tidak Lolos Audit</span>
        </span>
      );
    case 'Diverifikasi Auditor':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
          <UserCheck className="w-3 h-3" />
          <span>Diverifikasi Auditor</span>
        </span>
      );
    case 'Perlu Klarifikasi':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Perlu Klarifikasi</span>
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 inline-flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          <span>Belum Diaudit</span>
        </span>
      );
  }
}
