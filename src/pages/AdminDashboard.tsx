import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Clock, CheckCircle2, Tags, Database, RefreshCw, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';

const formatDateSafe = (dateVal: any) => {
  if (!dateVal) return '-';
  try {
    const d = typeof dateVal?.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return format(d, 'dd MMM yyyy, HH:mm', { locale: id });
  } catch {
    return '-';
  }
};

export default function AdminDashboard() {
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected?: boolean;
    tableReady?: boolean;
    message?: string;
    projectId?: string;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const supabaseSqlScript = `-- Jalankan query ini di Dashboard Supabase > SQL Editor:
CREATE TABLE IF NOT EXISTS public.labels (
  id BIGSERIAL PRIMARY KEY,
  no_label TEXT NOT NULL UNIQUE,
  nama_rs TEXT,
  status TEXT NOT NULL DEFAULT 'Menunggu Sertifikat',
  pdf_source TEXT,
  pdf_url TEXT,
  pdf_drive_url TEXT,
  pdf_original_url TEXT,
  pdf_name TEXT,
  calibrated_at TEXT,
  valid_until TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS nama_rs TEXT;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access" ON public.labels
  FOR SELECT USING (true);

CREATE POLICY "Service Role Full Access" ON public.labels
  FOR ALL USING (true);`;

  const fetchLabels = useCallback(async () => {
    try {
      // 1. Fetch Cloud SQL API labels
      let apiMap: Record<string, any> = {};
      try {
        const res = await fetch('/api/labels');
        if (res.ok) {
          const apiData = await res.json();
          (apiData || []).forEach((d: any) => {
            const key = d.noLabel || d.no_label;
            if (key) apiMap[key] = d;
          });
        }
      } catch (_) {}

      // 2. Fetch Supabase labels
      const { data } = await supabase
        .from('labels')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const folderMetaMap: Record<string, string> = {};
        data.forEach((d: any) => {
          if (d.no_label?.startsWith('__meta_folder_')) {
            folderMetaMap[d.no_label.replace('__meta_folder_', '')] = d.pdf_name;
          }
        });

        const actualLabels = data.filter((d: any) => !d.no_label?.startsWith('__meta_'));

        setLabels(actualLabels.map((d: any) => {
          const local = apiMap[d.no_label] || {};
          const prefix = d.no_label ? d.no_label.split('.')[0] : '';
          return {
            id: d.no_label,
            noLabel: d.no_label,
            namaRs: local.namaRs || local.nama_rs || d.nama_rs || d.namaRs || folderMetaMap[prefix] || null,
            status: d.status || local.status,
            pdfSource: d.pdf_source || local.pdfSource,
            pdfUrl: d.pdf_url || local.pdfUrl,
            pdfDriveUrl: d.pdf_drive_url || local.pdfDriveUrl,
            pdfName: d.pdf_name || local.pdfName,
            calibratedAt: d.calibrated_at || local.calibratedAt,
            validUntil: d.valid_until || local.validUntil,
            createdAt: d.created_at || local.createdAt,
            updatedAt: d.updated_at || local.updatedAt
          };
        }));
      } else {
        setLabels(Object.values(apiMap).map((d: any) => ({
          ...d,
          namaRs: d.namaRs || d.nama_rs || null,
        })));
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSupabaseStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
        return data;
      } else {
        setSupabaseStatus({ connected: false, tableReady: false, message: 'Server merespon dengan status error' });
      }
    } catch (_) {
      setSupabaseStatus({ connected: false, tableReady: false, message: 'Gagal menghubungi server API' });
    }
    return null;
  }, []);

  useEffect(() => {
    checkSupabaseStatus();
    fetchLabels();

    // Realtime Supabase updates
    const channel = supabase
      .channel('dashboard-labels-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels' }, () => {
        fetchLabels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLabels, checkSupabaseStatus]);

  const handleSyncSupabase = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        throw new Error(text || `Server mengembalikan respon kosong (${res.status})`);
      }

      if (res.ok && data.success) {
        setSyncResult({
          type: 'success',
          text: `Berhasil menyinkronkan ${data.count} label ke database Supabase!`
        });
        await checkSupabaseStatus();
        fetchLabels();
      } else {
        setSyncResult({
          type: 'error',
          text: `Gagal sinkron: ${data.error || data.message || 'Tabel labels belum siap di Supabase SQL Editor'}`
        });
        await checkSupabaseStatus();
      }
    } catch (err: any) {
      setSyncResult({
        type: 'error',
        text: `Terjadi kesalahan: ${err.message}`
      });
      await checkSupabaseStatus();
    } finally {
      setSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const total = labels.length;
  const menunggu = labels.filter(l => l.status === 'Menunggu Sertifikat').length;
  const tertaut = labels.filter(l => l.status === 'Sertifikat Tertaut').length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Ringkasan Sistem</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Label Dibuat</p>
            <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : total}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Tags className="w-6 h-6 text-slate-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Menunggu Sertifikat</p>
            <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : menunggu}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Sertifikat Tertaut</p>
            <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : tertaut}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Supabase & Cloud SQL Database Integration Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Integrasi Database Supabase</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Terhubung: auzpctxhltcdzdhcaetb
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Koneksi REST API & Service Role Supabase telah terpasang. Data label otomatis tersimpan ke PostgreSQL & Supabase.
              </p>
              {supabaseStatus && !supabaseStatus.tableReady && (
                <div className="mt-2.5 flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200 px-3 py-1.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Tabel <code>public.labels</code> belum diaktifkan di Supabase SQL Editor. Klik tombol <strong>Skema SQL Supabase</strong> untuk menyalin dan menjalankannya.</span>
                </div>
              )}
              {supabaseStatus?.tableReady && (
                <div className="mt-2.5 flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tabel <code>public.labels</code> aktif dan siap di database Supabase.</span>
                </div>
              )}
              {syncResult && (
                <div className={cn(
                  "mt-2.5 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg",
                  syncResult.type === 'success' 
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                    : "bg-rose-500/15 border border-rose-500/40 text-rose-200"
                )}>
                  {syncResult.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{syncResult.text}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <button
              onClick={() => setShowSqlModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Lihat Query SQL untuk Supabase"
            >
              <Copy className="w-3.5 h-3.5" />
              Skema SQL Supabase
            </button>

            <button
              onClick={handleSyncSupabase}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
            </button>
          </div>
        </div>
      </div>

      {/* SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Skema SQL Supabase</h3>
                <p className="text-xs text-slate-500">Salin dan jalankan script ini di Dashboard Supabase &gt; SQL Editor sekali saja.</p>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-64 select-all">
                {supabaseSqlScript}
              </pre>
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Tersalin!' : 'Salin SQL'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href="https://supabase.com/dashboard/project/auzpctxhltcdzdhcaetb/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Buka Supabase SQL Editor
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Labels Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Label Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">No Label</th>
                <th className="px-3 py-3 whitespace-nowrap">Rumah Sakit</th>
                <th className="px-3 py-3 whitespace-nowrap">Status</th>
                <th className="px-3 py-3 whitespace-nowrap">Tanggal Dibuat</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat data...</td>
                </tr>
              ) : labels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada label.</td>
                </tr>
              ) : (
                labels.slice(0, 10).map((label) => (
                  <tr key={label.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-800 font-mono text-xs">{label.noLabel}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {label.namaRs ? (
                        <span className="font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 text-xs">
                          {label.namaRs}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                        label.status === 'Sertifikat Tertaut' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      )}>
                        {label.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {formatDateSafe(label.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                       <a href={`/sertifikat/${label.noLabel}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 font-medium text-xs hover:underline">
                         Lihat Publik
                       </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
