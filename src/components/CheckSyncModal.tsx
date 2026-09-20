import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Database, 
  HardDrive, 
  ShieldCheck, 
  X, 
  Sparkles,
  Layers,
  FileCheck2,
  CalendarCheck2,
  Wrench,
  Building2,
  Tablet,
  Check,
  RotateCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface CollectionSyncItem {
  id: string;
  name: string;
  label: string;
  iconName: string;
  localCount: number;
  serverCount: number;
  status: 'synced' | 'local_ahead' | 'server_ahead' | 'empty';
  diff: number;
}

interface CheckSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onForceSyncAll: () => Promise<void>;
}

const COLLECTIONS_CONFIG = [
  { id: 'schedules', name: 'schedules', label: 'Penjadwalan RS & SPK', icon: CalendarCheck2 },
  { id: 'sphDocuments', name: 'sphDocuments', label: 'Surat Penawaran Harga (SPH)', icon: FileCheck2 },
  { id: 'calibratorAssets', name: 'calibratorAssets', label: 'Master Kalibrator Medis', icon: Wrench },
  { id: 'hospitals', name: 'hospitals', label: 'Master Rumah Sakit', icon: Building2 },
  { id: 'technicians', name: 'technicians', label: 'Personel Teknisi', icon: ShieldCheck },
  { id: 'tabletAssets', name: 'tabletAssets', label: 'Aset Tablet Operasional', icon: Tablet },
  { id: 'tabletLoans', name: 'tabletLoans', label: 'Log Peminjaman Tablet', icon: Layers },
  { id: 'financialAssets', name: 'financialAssets', label: 'Aset Finansial', icon: Database },
  { id: 'financialTransactions', name: 'financialTransactions', label: 'Transaksi Kas', icon: Database },
  { id: 'bapDocuments', name: 'bapDocuments', label: 'Berita Acara Pekerjaan (BAP)', icon: FileCheck2 },
];

export const CheckSyncModal: React.FC<CheckSyncModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onForceSyncAll
}) => {
  const [loading, setLoading] = useState(false);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [items, setItems] = useState<CollectionSyncItem[]>([]);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkStatus = async () => {
    setLoading(true);
    const results: CollectionSyncItem[] = [];

    for (const col of COLLECTIONS_CONFIG) {
      // Local count from localStorage
      let localCount = 0;
      try {
        const raw = localStorage.getItem(`smk_supa_${col.name}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localCount = parsed.length;
        }
      } catch (_) {}

      // Server count from API
      let serverCount = 0;
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(col.name)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.found && Array.isArray(json.items)) {
            serverCount = json.items.length;
          }
        }
      } catch (_) {}

      const diff = localCount - serverCount;
      let status: CollectionSyncItem['status'] = 'synced';
      if (localCount === 0 && serverCount === 0) {
        status = 'empty';
      } else if (diff > 0) {
        status = 'local_ahead';
      } else if (diff < 0) {
        status = 'server_ahead';
      } else {
        status = 'synced';
      }

      results.push({
        id: col.id,
        name: col.name,
        label: col.label,
        iconName: col.id,
        localCount,
        serverCount,
        status,
        diff
      });
    }

    setItems(results);
    setLastChecked(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalLocal = items.reduce((acc, c) => acc + c.localCount, 0);
  const totalServer = items.reduce((acc, c) => acc + c.serverCount, 0);
  const hasDiscrepancy = items.some(c => c.status === 'local_ahead' || c.status === 'server_ahead');

  // Push local items to server or pull server items to local for a single collection
  const handleFixSingle = async (item: CollectionSyncItem, action: 'push_to_server' | 'pull_from_server') => {
    setSyncingKey(item.name);
    try {
      if (action === 'push_to_server') {
        const raw = localStorage.getItem(`smk_supa_${item.name}`);
        let localData = [];
        if (raw) localData = JSON.parse(raw);
        await fetch(`/api/collections/${encodeURIComponent(item.name)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: localData, replaceAll: true })
        });
        onShowToast(`Koleksi ${item.label} berhasil diunggah ke Supabase server!`);
      } else {
        // pull from server to local
        const res = await fetch(`/api/collections/${encodeURIComponent(item.name)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.found && Array.isArray(json.items)) {
            localStorage.setItem(`smk_supa_${item.name}`, JSON.stringify(json.items));
            window.dispatchEvent(new CustomEvent('supabase_collection_sync', { detail: { collection: item.name } }));
            onShowToast(`Koleksi ${item.label} diperbarui dari Supabase server!`);
          }
        }
      }
      await checkStatus();
      confetti({ particleCount: 40, spread: 50 });
    } catch (e) {
      console.error(e);
      onShowToast('Gagal memperbaiki sinkronisasi.');
    } finally {
      setSyncingKey(null);
    }
  };

  const handleFixAll = async () => {
    setSyncingAll(true);
    try {
      await onForceSyncAll();
      await checkStatus();
      confetti({ particleCount: 70, spread: 70 });
      onShowToast('Perbaikan sinkronisasi selesai! Semua data kini identik di laptop & server Supabase.');
    } catch (e) {
      console.error(e);
      onShowToast('Gagal menyinkronkan seluruh data.');
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F364C] text-[#EEEEEE] border border-[#1C658C] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#144966] to-[#0F364C] px-6 py-5 border-b border-[#1C658C]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#398AB9]/20 border border-[#398AB9]/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Audit & Check Sync Antar Perangkat</h3>
                <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  Supabase Live
                </span>
              </div>
              <p className="text-xs text-[#D8D2CB]">
                Membandingkan data lokal di browser/laptop dengan database server Supabase.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#D8D2CB] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats */}
        <div className="bg-[#0B2A3D] px-6 py-4 border-b border-[#1C658C]/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#144966]/40 p-3 rounded-xl border border-[#1C658C]/40 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[11px] text-[#D8D2CB]">Total di Browser/Laptop</div>
              <div className="text-lg font-bold text-white font-mono">{totalLocal} record</div>
            </div>
          </div>
          <div className="bg-[#144966]/40 p-3 rounded-xl border border-[#1C658C]/40 flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[11px] text-[#D8D2CB]">Total di Server Supabase</div>
              <div className="text-lg font-bold text-white font-mono">{totalServer} record</div>
            </div>
          </div>
          <div className="bg-[#144966]/40 p-3 rounded-xl border border-[#1C658C]/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#D8D2CB]">Status Sinkronisasi</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {!hasDiscrepancy ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> 100% Selaras
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Perlu Disamakan
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={checkStatus}
              disabled={loading}
              title="Periksa ulang"
              className="p-2 rounded-lg bg-[#1C658C] hover:bg-[#398AB9] text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 custom-scrollbar">
          <div className="flex items-center justify-between text-xs text-[#D8D2CB] mb-2 px-1">
            <span>Daftar Tabel Koleksi Data ({items.length} tabel)</span>
            <span>Terakhir dicek: {lastChecked || '-'}</span>
          </div>

          {loading && items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-300">
              <RotateCw className="w-8 h-8 animate-spin text-[#398AB9]" />
              <span className="text-sm font-medium">Melakukan audit data dengan Supabase...</span>
            </div>
          ) : (
            items.map(item => {
              const Icon = COLLECTIONS_CONFIG.find(c => c.name === item.name)?.icon || Database;
              const isSyncing = syncingKey === item.name;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.status === 'synced' || item.status === 'empty'
                      ? 'bg-[#144966]/20 border-[#1C658C]/40'
                      : 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1C658C]/50 border border-[#398AB9]/40 flex items-center justify-center text-cyan-300 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{item.label}</span>
                        <code className="text-[10px] text-cyan-300/70 font-mono bg-cyan-950/50 px-1.5 py-0.2 rounded">
                          {item.name}
                        </code>
                      </div>
                      <div className="text-xs text-[#D8D2CB] flex items-center gap-3 mt-0.5 font-mono">
                        <span>Laptop: <strong className="text-white">{item.localCount}</strong></span>
                        <span className="text-cyan-400/40">•</span>
                        <span>Supabase: <strong className="text-white">{item.serverCount}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Status Badge */}
                    {item.status === 'synced' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                        <Check className="w-3 h-3" /> Sinkron ({item.serverCount})
                      </span>
                    )}
                    {item.status === 'empty' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900/50 border border-slate-700 px-2.5 py-1 rounded-full">
                        Kosong (0)
                      </span>
                    )}
                    {item.status === 'local_ahead' && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded-full">
                          <ArrowUpRight className="w-3 h-3" /> +{item.diff} di Laptop
                        </span>
                        <button
                          onClick={() => handleFixSingle(item, 'push_to_server')}
                          disabled={isSyncing}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Kirim ke Server'}
                        </button>
                      </div>
                    )}
                    {item.status === 'server_ahead' && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/50 px-2 py-0.5 rounded-full">
                          <ArrowDownRight className="w-3 h-3" /> +{Math.abs(item.diff)} di Server
                        </span>
                        <button
                          onClick={() => handleFixSingle(item, 'pull_from_server')}
                          disabled={isSyncing}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Tarik ke Laptop'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Auto-Fix Option */}
        <div className="bg-gradient-to-r from-[#0B2A3D] to-[#0F364C] px-6 py-4 border-t border-[#1C658C]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#D8D2CB] text-center sm:text-left">
            {hasDiscrepancy ? (
              <span className="text-amber-300 font-medium">
                Ditemukan perbedaan jumlah record. Klik tombol di kanan untuk menyamakan semua otomatis.
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Semua data di laptop dan server Supabase sudah konsisten 100%.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold bg-[#144966] hover:bg-[#1C658C] text-[#EEEEEE] transition-colors"
            >
              Tutup
            </button>
            <button
              id="btn-modal-fix-all-sync"
              onClick={handleFixAll}
              disabled={syncingAll || loading}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-600 to-[#1C658C] hover:from-cyan-500 hover:to-[#398AB9] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {syncingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyamakan Semua...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Perbaiki & Samakan Otomatis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
