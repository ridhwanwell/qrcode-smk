import React, { useMemo, useRef, useState } from 'react';
import { X, FolderOpen, Loader2, CheckCircle2, AlertCircle, Sparkles, Link2, Ban } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { extractGoogleDriveFileId, getGoogleDriveEmbedUrl, getGoogleDriveViewUrl } from '../lib/pdfStorage';
import { readCertificateFromDrive, CertificateInfo } from '../utils/certificatePdfReader';

/**
 * TAUTKAN SERTIFIKAT MASSAL
 * Tempel 1 link folder Google Drive (atau banyak link file sekaligus) -> semua PDF
 * sertifikat dibaca -> dicocokkan otomatis ke label berdasarkan "Nomor Sertifikat"
 * (= nomor label) -> pratinjau -> tautkan sekaligus.
 */

interface LabelLite {
  id: string;
  noLabel: string;
  status?: string;
  namaRs?: string | null;
  pdfUrl?: string | null;
  pdfDriveUrl?: string | null;
  pdfOriginalUrl?: string | null;
}

interface Props {
  labels: LabelLite[];
  defaultPrefix?: string; // folder label yang sedang dibuka (mis. "001")
  onClose: () => void;
  onDone: () => void;      // muat ulang daftar label
}

type RowStatus = 'ready' | 'replace' | 'same' | 'notfound' | 'void' | 'duplicate' | 'error' | 'nonumber';

interface Row {
  fileId: string;
  fileName: string;
  modifiedTime: string;
  info?: CertificateInfo;
  error?: string;
  label?: LabelLite;
  status: RowStatus;
  otherFolder?: boolean;
  rsMismatch?: boolean;
}

const STATUS_INFO: Record<RowStatus, { text: string; cls: string }> = {
  ready: { text: 'Siap ditautkan', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  replace: { text: 'Sudah punya sertifikat lain', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  same: { text: 'Sudah tertaut (sama)', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  notfound: { text: 'Nomor label tidak ada', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  void: { text: 'Label Void', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  duplicate: { text: 'Duplikat (versi lama)', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  error: { text: 'Gagal dibaca', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  nonumber: { text: 'Nomor sertifikat tidak terbaca', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const normalize = (v?: string | null) => (v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Pisahkan isian: link folder, atau daftar link file (dipisah koma / spasi / baris baru). */
function parseInput(text: string): { folderId?: string; fileIds: string[] } {
  const folder = text.match(/drive\/folders\/([A-Za-z0-9_-]{10,})/);
  if (folder) return { folderId: folder[1], fileIds: [] };
  const ids = new Set<string>();
  text.split(/[\s,;]+/).forEach(part => {
    const id = part ? extractGoogleDriveFileId(part) : null;
    if (id) ids.add(id);
  });
  return { fileIds: Array.from(ids) };
}

export const BulkCertificateLinkModal: React.FC<Props> = ({ labels, defaultPrefix, onClose, onDone }) => {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'input' | 'reading' | 'review' | 'saving' | 'done'>('input');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [saveResult, setSaveResult] = useState<{ ok: number; failed: number } | null>(null);
  const cancelRef = useRef(false);

  const labelByNo = useMemo(() => {
    const m = new Map<string, LabelLite>();
    labels.forEach(l => m.set(normalize(l.noLabel), l));
    return m;
  }, [labels]);

  const buildRows = (raw: Row[]): Row[] => {
    // 1) Cocokkan ke label
    const withLabel = raw.map(r => {
      if (r.error) return { ...r, status: 'error' as RowStatus };
      const no = r.info?.nomorSertifikat;
      if (!no) return { ...r, status: 'nonumber' as RowStatus };
      const label = labelByNo.get(normalize(no));
      if (!label) return { ...r, status: 'notfound' as RowStatus };
      if (label.status === 'Void / Rusak') return { ...r, label, status: 'void' as RowStatus };
      const existingId = extractGoogleDriveFileId(label.pdfOriginalUrl || label.pdfDriveUrl || label.pdfUrl || '');
      const status: RowStatus = existingId === r.fileId ? 'same' : existingId ? 'replace' : 'ready';
      const otherFolder = !!defaultPrefix && !label.noLabel.startsWith(`${defaultPrefix}.`);
      const rsMismatch = !!r.info?.namaPelanggan && !!label.namaRs &&
        !normalize(r.info.namaPelanggan).includes(normalize(label.namaRs)) &&
        !normalize(label.namaRs).includes(normalize(r.info.namaPelanggan));
      return { ...r, label, status, otherFolder, rsMismatch };
    });

    // 2) Beberapa file dengan nomor sertifikat sama: pakai yang paling baru diubah
    const byNo = new Map<string, Row[]>();
    withLabel.forEach(r => {
      if (!r.label) return;
      const k = normalize(r.label.noLabel);
      byNo.set(k, [...(byNo.get(k) || []), r]);
    });
    byNo.forEach(group => {
      if (group.length < 2) return;
      const sorted = [...group].sort((a, b) => (b.modifiedTime || '').localeCompare(a.modifiedTime || ''));
      sorted.slice(1).forEach(r => { r.status = 'duplicate'; });
    });

    const order: RowStatus[] = ['ready', 'replace', 'same', 'duplicate', 'notfound', 'void', 'nonumber', 'error'];
    return withLabel.sort((a, b) =>
      order.indexOf(a.status) - order.indexOf(b.status) ||
      (a.label?.noLabel || a.fileName).localeCompare(b.label?.noLabel || b.fileName)
    );
  };

  const handleRead = async () => {
    setError('');
    const parsed = parseInput(input);
    let files: { id: string; name: string; modifiedTime: string }[] = [];

    if (parsed.folderId) {
      try {
        const res = await apiFetch(`/api/drive-folder/${encodeURIComponent(parsed.folderId)}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error || (res.status === 404
            ? 'Server belum punya fitur baca folder (HTTP 404). Pastikan deploy terbaru sudah Ready, lalu muat ulang halaman (Ctrl + Shift + R).'
            : `Gagal membaca isi folder Google Drive (HTTP ${res.status}).`));
          return;
        }
        files = (body.files || []).map((f: any) => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime }));
        if (files.length === 0) {
          setError('Folder tidak berisi file PDF.');
          return;
        }
      } catch {
        setError('Gagal menghubungi server. Periksa koneksi internet lalu coba lagi.');
        return;
      }
    } else if (parsed.fileIds.length > 0) {
      files = parsed.fileIds.map(id => ({ id, name: '', modifiedTime: '' }));
    } else {
      setError('Tempel link folder Google Drive, atau link file sertifikat (boleh banyak, dipisah koma/baris).');
      return;
    }

    cancelRef.current = false;
    setPhase('reading');
    setProgress({ done: 0, total: files.length });

    // Baca 3 file sekaligus agar cepat tapi tidak membebani koneksi RS
    const results: Row[] = new Array(files.length);
    let next = 0;
    let doneCount = 0;
    const worker = async () => {
      while (!cancelRef.current) {
        const i = next++;
        if (i >= files.length) return;
        const f = files[i];
        let row: Row = { fileId: f.id, fileName: f.name, modifiedTime: f.modifiedTime, status: 'error' };
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            row = { ...row, info: await readCertificateFromDrive(f.id), error: undefined };
            break;
          } catch (err: any) {
            row = { ...row, error: err?.message || 'Gagal membaca' };
          }
        }
        results[i] = row;
        doneCount++;
        setProgress({ done: doneCount, total: files.length });
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    const built = buildRows(results.filter(Boolean));
    setRows(built);
    setSelected(new Set(built.filter(r => r.status === 'ready').map(r => r.fileId)));
    setPhase('review');
  };

  const toggle = (fileId: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(fileId)) n.delete(fileId); else n.add(fileId);
      return n;
    });
  };

  const selectable = (r: Row) => r.status === 'ready' || r.status === 'replace';
  const chosen = rows.filter(r => selected.has(r.fileId) && selectable(r));

  const handleSave = async () => {
    if (chosen.length === 0) return;
    setPhase('saving');
    const items = chosen.map(r => {
      const viewUrl = getGoogleDriveViewUrl(r.fileId);
      return {
        noLabel: r.label!.noLabel,
        status: 'Sertifikat Tertaut',
        pdf_source: 'drive',
        pdf_url: getGoogleDriveEmbedUrl(r.fileId),
        pdf_drive_url: viewUrl,
        pdforiginal_url: viewUrl,
        pdf_name: r.info?.namaAlat || `Sertifikat Kalibrasi ${r.label!.noLabel}`,
        nama_alat: r.info?.namaAlat || null,
        ruangan: r.info?.ruangan || null,
        calibrated_at: r.info?.tanggalKalibrasi || null,
        valid_until: r.info?.kalibrasiUlang || null
      };
    });

    let ok = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100);
      try {
        const res = await apiFetch('/api/labels/bulk', {
          method: 'POST',
          body: JSON.stringify({ mode: 'update', items: chunk })
        });
        if (res.ok) ok += chunk.length; else failed += chunk.length;
      } catch {
        failed += chunk.length;
      }
    }
    setSaveResult({ ok, failed });
    setPhase('done');
    onDone();
  };

  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-600" /> Tautkan Sertifikat Massal (Google Drive)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sertifikat dicocokkan otomatis ke label berdasarkan <strong>Nomor Sertifikat</strong> di dalam PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { cancelRef.current = true; onClose(); }}
            disabled={phase === 'saving'}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-sm">
          {phase === 'input' && (
            <>
              <label className="block text-xs font-bold text-slate-700">Link folder Google Drive (disarankan) atau link file sertifikat</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={5}
                placeholder={'https://drive.google.com/drive/folders/1YTlR1kx...\n\natau beberapa link file:\nhttps://drive.google.com/file/d/1zIh.../view, https://drive.google.com/file/d/1vEo.../view'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {(() => {
                const p = parseInput(input);
                if (p.folderId) return <p className="text-[11px] text-emerald-700 font-semibold">✓ Link folder terdeteksi</p>;
                if (p.fileIds.length) return <p className="text-[11px] text-emerald-700 font-semibold">✓ {p.fileIds.length} link file terdeteksi</p>;
                return null;
              })()}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
                </div>
              )}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-blue-800">Syarat:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Folder / file dibagikan <strong>"Siapa saja yang memiliki link"</strong>.</li>
                  <li>Nama file bebas — yang dicocokkan adalah <strong>Nomor Sertifikat</strong> di halaman 1 PDF.</li>
                  <li>Bila ada 2 file dengan nomor yang sama (mis. versi "timpa"), yang <strong>terakhir diubah</strong> yang dipakai.</li>
                </ul>
              </div>
            </>
          )}

          {phase === 'reading' && (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="font-bold text-slate-800">Membaca sertifikat {progress.done} / {progress.total}...</p>
              <div className="w-full max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-slate-500">Jangan tutup halaman ini. Sekitar 2–3 detik per sertifikat.</p>
            </div>
          )}

          {(phase === 'review' || phase === 'saving') && (
            <>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {(Object.keys(STATUS_INFO) as RowStatus[]).filter(k => counts[k]).map(k => (
                  <span key={k} className={`px-2 py-1 rounded-lg border font-semibold ${STATUS_INFO[k].cls}`}>
                    {STATUS_INFO[k].text}: {counts[k]}
                  </span>
                ))}
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="px-2 py-2 w-8"></th>
                      <th className="px-2 py-2 text-left">No. Label</th>
                      <th className="px-2 py-2 text-left">Nama Alat</th>
                      <th className="px-2 py-2 text-left">Ruangan</th>
                      <th className="px-2 py-2 text-left whitespace-nowrap">Kalibrasi</th>
                      <th className="px-2 py-2 text-left whitespace-nowrap">Berlaku s/d</th>
                      <th className="px-2 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.fileId} className={`border-t border-slate-100 ${selectable(r) ? '' : 'text-slate-400'}`}>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            disabled={!selectable(r) || phase === 'saving'}
                            checked={selected.has(r.fileId) && selectable(r)}
                            onChange={() => toggle(r.fileId)}
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono font-bold">{r.label?.noLabel || r.info?.nomorSertifikat || '-'}</td>
                        <td className="px-2 py-1.5">
                          {r.info?.namaAlat || '-'}
                          {r.fileName && <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={r.fileName}>{r.fileName}</div>}
                        </td>
                        <td className="px-2 py-1.5">{r.info?.ruangan || '-'}</td>
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">{r.info?.tanggalKalibrasi || '-'}</td>
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">{r.info?.kalibrasiUlang || '-'}</td>
                        <td className="px-2 py-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded border font-semibold ${STATUS_INFO[r.status].cls}`}>
                            {STATUS_INFO[r.status].text}
                          </span>
                          {r.status === 'replace' && <div className="text-[10px] text-amber-700 mt-0.5">Centang untuk menimpa</div>}
                          {r.otherFolder && <div className="text-[10px] text-amber-700 mt-0.5">Beda folder dari yang dibuka</div>}
                          {r.rsMismatch && <div className="text-[10px] text-amber-700 mt-0.5">RS di PDF: {r.info?.namaPelanggan}</div>}
                          {r.error && <div className="text-[10px] text-rose-600 mt-0.5">{r.error}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {phase === 'done' && saveResult && (
            <div className="py-10 text-center space-y-2">
              {saveResult.failed === 0
                ? <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                : <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />}
              <p className="font-bold text-slate-800 text-base">{saveResult.ok} sertifikat berhasil ditautkan</p>
              {saveResult.failed > 0 && (
                <p className="text-xs text-rose-700">{saveResult.failed} gagal disimpan. Coba ulangi untuk sertifikat tersebut.</p>
              )}
              <p className="text-xs text-slate-500">Nama Alat, Ruangan, tanggal kalibrasi & masa berlaku ikut terisi.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            {phase === 'review' ? `${chosen.length} sertifikat dipilih` : 'Data dibaca dari isi PDF, bukan dari nama file'}
          </p>
          <div className="flex items-center gap-2">
            {phase === 'input' && (
              <button
                type="button"
                onClick={handleRead}
                disabled={!input.trim()}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Baca Sertifikat
              </button>
            )}
            {phase === 'reading' && (
              <button
                type="button"
                onClick={() => { cancelRef.current = true; }}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Hentikan
              </button>
            )}
            {(phase === 'review' || phase === 'saving') && (
              <button
                type="button"
                onClick={handleSave}
                disabled={chosen.length === 0 || phase === 'saving'}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {phase === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                {phase === 'saving' ? 'Menyimpan...' : `Tautkan ${chosen.length} Sertifikat`}
              </button>
            )}
            {phase === 'done' && (
              <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl">
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
