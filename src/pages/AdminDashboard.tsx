import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Clock, CheckCircle2, Tags, Database, RefreshCw, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setLabels(data.map((d: any) => ({
          id: d.no_label,
          noLabel: d.no_label,
          namaRs: d.nama_rs || d.namaRs || null,
          status: d.status,
          pdfSource: d.pdf_source,
          pdfUrl: d.pdf_url,
          pdfDriveUrl: d.pdf_drive_url,
          pdfName: d.pdf_name,
          calibratedAt: d.calibrated_at,
          validUntil: d.valid_until,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        })));
      } else {
        const res = await fetch('/api/labels');
        if (res.ok) {
          const apiLabels = await res.json();
          setLabels((apiLabels || []).map((d: any) => ({
            ...d,
            namaRs: d.namaRs || d.nama_rs || null,
          })));
        }
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check Supabase connection status
    fetch('/api/supabase/status')
      .then((res) => res.json())
      .then((data) => setSupabaseStatus(data))
      .catch(() => setSupabaseStatus({ connected: false, message: 'Gagal menghubungi server API' }));

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
  }, [fetchLabels]);

  const handleSyncSupabase = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`Berhasil sinkron ${data.count} label ke Supabase!`);
        // Refresh status & labels
        const statusRes = await fetch('/api/supabase/status');
        setSupabaseStatus(await statusRes.json());
        fetchLabels();
      } else {
        setSyncMessage(`Gagal: ${data.error || 'Pastikan tabel labels sudah dibuat di Supabase SQL Editor'}`);
      }
    } catch (err: any) {
      setSyncMessage(`Terjadi kesalahan: ${err.message}`);
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
                  <span>Tabel <code>public.labels</code> belum diaktifkan di Supabase SQL Editor. Klik tombol <strong>Salin Skema SQL</strong> di samping untuk menjalankannya.</span>
                </div>
              )}
              {syncMessage && (
                <p className="text-xs font-medium text-emerald-300 mt-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg inline-block">
                  {syncMessage}
                </p>
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
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">No Label</th>
                <th className="px-6 py-4">Rumah Sakit</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal Dibuat</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Memuat data...</td>
                </tr>
              ) : labels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Belum ada label.</td>
                </tr>
              ) : (
                labels.slice(0, 10).map((label) => (
                  <tr key={label.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 font-mono">{label.noLabel}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {label.namaRs ? (
                        <span className="font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 text-xs">
                          {label.namaRs}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        label.status === 'Sertifikat Tertaut' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {label.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDateSafe(label.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <a href={`/sertifikat/${label.noLabel}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 font-medium text-xs">
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
