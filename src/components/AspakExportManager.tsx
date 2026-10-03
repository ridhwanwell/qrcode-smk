/**
 * Halaman "Format ASPAK" — ubah Excel rekap kalibrasi menjadi file isian ASPAK
 * (sheet: Data, Petunjuk, Petugas) dengan batas maksimal 90 alat per file.
 */
import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet, Upload, Download, AlertTriangle, CheckCircle2, XCircle,
  Building2, Save, ExternalLink, Info, Trash2, Wand2, MapPin,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Hospital } from '../types';
import {
  ASPAK_MAX_ROWS, AspakRow, AspakIssue, AspakFileFormat,
  parseRekapWorkbook, validateAspakRows, writeAspakFile, chunkAspakRows,
  safeFileName, sanitizeAspakText, applyRuangMap,
} from '../utils/aspakExport';
import { ASPAK_RUANG_LIST, ASPAK_RUANG_BY_KODE, guessKodeRuang, lokasiKey } from '../data/aspakRuangList';
import { KMK_DEVICE_METODES, KMK_DRIVE_FOLDER_URL, toMetodeCode } from '../data/kmkMetodeList';

interface Props {
  hospitals: Hospital[];
  onUpdateHospital: (h: Hospital) => void | Promise<void>;
  showToast?: (msg: string) => void;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function AspakExportManager({ hospitals, onUpdateHospital, showToast }: Props) {
  const [hospitalId, setHospitalId] = useState('');
  const [aspakId, setAspakId] = useState('');
  const [namaRs, setNamaRs] = useState('');
  const [rows, setRows] = useState<AspakRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [sheetInfo, setSheetInfo] = useState<{ sheet: string; missing: string[] } | null>(null);
  const [format, setFormat] = useState<AspakFileFormat>('xls');
  const [busy, setBusy] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [page, setPage] = useState(0); // 1 halaman = 90 baris = 1 file ASPAK
  // Pemetaan Lokasi -> Kode Ruang yang dipilih/diubah pengguna (kunci = lokasiKey)
  const [ruangMap, setRuangMap] = useState<Record<string, string>>({});
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const toast = (m: string) => (showToast ? showToast(m) : alert(m));

  const hospital = hospitals.find(h => h.id === hospitalId);
  const sortedHospitals = useMemo(
    () => [...hospitals].sort((a, b) => a.name.localeCompare(b.name)),
    [hospitals],
  );

  /* ---------------- Pemetaan Lokasi -> Kode Ruang ---------------- */
  const lokasiList = useMemo(() => {
    const m = new Map<string, { key: string; label: string; count: number; needsMap: number }>();
    rows.forEach(r => {
      const key = lokasiKey(r.lokasi);
      if (!key) return;
      const e = m.get(key) || { key, label: r.lokasi, count: 0, needsMap: 0 };
      e.count++;
      if (!r.kodeRuang || r.kodeRuang === '0') e.needsMap++;
      m.set(key, e);
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  // Urutan prioritas: pilihan pengguna / tersimpan di data RS  >  saran otomatis
  const effectiveMap = useMemo(() => {
    const out: Record<string, string> = {};
    lokasiList.forEach(l => {
      out[l.key] = l.key in ruangMap ? ruangMap[l.key] : guessKodeRuang(l.label);
    });
    return out;
  }, [lokasiList, ruangMap]);

  const effectiveRows = useMemo(() => applyRuangMap(rows, effectiveMap), [rows, effectiveMap]);
  const mappedLokasiCount = lokasiList.filter(l => effectiveMap[l.key]).length;
  const savedMap = hospital?.aspakRuangMap || {};
  const mapDirty = lokasiList.some(l => effectiveMap[l.key] && savedMap[l.key] !== effectiveMap[l.key]);

  const saveRuangMap = async () => {
    if (!hospital) { toast('Pilih rumah sakit dulu agar pemetaan bisa disimpan.'); return; }
    const merged: Record<string, string> = { ...savedMap };
    lokasiList.forEach(l => {
      const kode = effectiveMap[l.key];
      if (kode) merged[l.key] = kode; else delete merged[l.key];
    });
    await onUpdateHospital({ ...hospital, aspakRuangMap: merged });
    setRuangMap(merged);
    toast(`Pemetaan ${Object.keys(merged).length} lokasi untuk ${hospital.name} tersimpan.`);
  };

  const ruangOptions = useMemo(
    () => ASPAK_RUANG_LIST.filter(r => !r.nonaktif),
    [],
  );

  const issues = useMemo(() => validateAspakRows(effectiveRows), [effectiveRows]);
  const issuesByRow = useMemo(() => {
    const m = new Map<number, AspakIssue[]>();
    issues.forEach(i => m.set(i.rowIndex, [...(m.get(i.rowIndex) || []), i]));
    return m;
  }, [issues]);
  const errorCount = issues.filter(i => i.level === 'error').length;
  const warnCount = issues.filter(i => i.level === 'warning').length;
  const fileCount = Math.ceil(rows.length / ASPAK_MAX_ROWS);
  const idValid = /^\d{1,12}$/.test(aspakId.trim());

  /* ---------------- RS & ID ---------------- */
  const pickHospital = (id: string) => {
    setHospitalId(id);
    const h = hospitals.find(x => x.id === id);
    setAspakId(h?.aspakId || '');
    setNamaRs(h?.name || '');
    setRuangMap(h?.aspakRuangMap || {});
  };

  const saveAspakId = async () => {
    if (!hospital) return;
    if (!idValid) { toast('ID ASPAK harus berupa angka.'); return; }
    await onUpdateHospital({ ...hospital, aspakId: aspakId.trim() });
    toast(`ID ASPAK ${hospital.name} tersimpan.`);
  };

  /* ---------------- Upload ---------------- */
  const handleFile = async (file: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { toast('File harus .xlsx, .xls, atau .csv'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast('Ukuran file maksimal 10 MB.'); return; }
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      // beri jeda agar tulisan "Memproses…" sempat tampil sebelum file dibaca
      await new Promise(r => setTimeout(r, 30));
      const parsed = parseRekapWorkbook(buffer);
      if (!parsed.rows.length) {
        toast('Tidak ada data alat yang terbaca. Pastikan ada kolom "Kode Alat" dan "No Seri".');
      }
      setRows(parsed.rows);
      setPage(0);
      setOnlyProblems(false);
      setFileName(file.name);
      setSheetInfo({ sheet: parsed.sheetName, missing: parsed.missingColumns });
    } catch (e: any) {
      toast(e?.message || 'Gagal membaca file.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const updateRow = (idx: number, patch: Partial<AspakRow>) =>
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const reset = () => { setRows([]); setFileName(''); setSheetInfo(null); setPage(0); };

  /* ---------------- Download ---------------- */
  const download = async () => {
    if (!rows.length) return;
    if (!idValid) { toast('Isi ID ASPAK (angka) terlebih dahulu.'); return; }
    if (!namaRs.trim()) { toast('Isi nama RS untuk judul file.'); return; }
    if (errorCount > 0 &&
      !confirm(`Masih ada ${errorCount} error (kolom wajib kosong / tanggal salah). ASPAK kemungkinan menolak baris tersebut. Tetap download?`)) return;

    setBusy(true);
    try {
      const rs = sanitizeAspakText(namaRs);
      const base = `ASPAK_${safeFileName(rs)}`;
      const chunks = chunkAspakRows(effectiveRows);
      if (chunks.length === 1) {
        saveAs(writeAspakFile(chunks[0], aspakId.trim(), rs, format), `${base}.${format}`);
      } else {
        const zip = new JSZip();
        chunks.forEach((c, i) =>
          zip.file(`${base}_bagian-${i + 1}-dari-${chunks.length}.${format}`,
            writeAspakFile(c, aspakId.trim(), rs, format)));
        saveAs(await zip.generateAsync({ type: 'blob' }), `${base}_${chunks.length}-file.zip`);
      }
      toast(`Berhasil: ${rows.length} alat → ${chunks.length} file ASPAK.`);
    } catch (e: any) {
      toast(e?.message || 'Gagal membuat file ASPAK.');
    } finally {
      setBusy(false);
    }
  };

  // Hanya 90 baris yang digambar sekaligus supaya browser tidak hang untuk file ratusan alat
  const filteredRows = useMemo(
    () => effectiveRows.map((r, i) => ({ r, i })).filter(({ i }) => !onlyProblems || issuesByRow.has(i)),
    [effectiveRows, onlyProblems, issuesByRow],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / ASPAK_MAX_ROWS));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = filteredRows.slice(safePage * ASPAK_MAX_ROWS, (safePage + 1) * ASPAK_MAX_ROWS);
  const metodeTitle = useMemo(
    () => new Map(KMK_DEVICE_METODES.map(m => [toMetodeCode(m.no), m.title])),
    [],
  );

  const cellCls = (i: number, field: keyof AspakRow) => {
    const list = issuesByRow.get(i)?.filter(x => x.field === field) || [];
    if (list.some(x => x.level === 'error')) return 'bg-red-50 text-red-700';
    if (list.length) return 'bg-amber-50 text-amber-800';
    return '';
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1C658C] to-[#398AB9] p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-3"><FileSpreadsheet className="h-7 w-7" /></div>
          <div>
            <h2 className="text-xl font-bold">Format ASPAK</h2>
            <p className="text-sm text-white/80">
              Ubah rekap kalibrasi menjadi file isian ASPAK (sheet Data, Petunjuk, Petugas). Maksimal {ASPAK_MAX_ROWS} alat per file.
            </p>
          </div>
        </div>
      </div>

      {/* Langkah 1: RS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Building2 className="h-5 w-5 text-[#1C658C]" /> 1. Pilih Rumah Sakit
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Rumah Sakit</span>
            <select value={hospitalId} onChange={e => pickHospital(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-[#398AB9] focus:outline-none">
              <option value="">— pilih RS —</option>
              {sortedHospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">ID ASPAK RS (sel B2)</span>
            <div className="flex gap-2">
              <input value={aspakId} inputMode="numeric" placeholder="contoh: 145235"
                onChange={e => setAspakId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                className={`w-full rounded-xl border px-3 py-2 focus:outline-none ${aspakId && !idValid ? 'border-red-400' : 'border-slate-300 focus:border-[#398AB9]'}`} />
              <button onClick={saveAspakId} disabled={!hospital || !idValid || hospital.aspakId === aspakId.trim()}
                title="Simpan ID ke data RS"
                className="flex items-center gap-1 rounded-xl bg-[#1C658C] px-3 text-white disabled:opacity-40">
                <Save className="h-4 w-4" />
              </button>
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Nama RS di judul file (sel D1)</span>
            <input value={namaRs} onChange={e => setNamaRs(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-[#398AB9] focus:outline-none" />
          </label>
        </div>
      </section>

      {/* Langkah 2: Upload */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Upload className="h-5 w-5 text-[#1C658C]" /> 2. Upload Excel Rekap (sheet DATA ALAT)
        </h3>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-[#398AB9]/50 bg-[#EEEEEE]/50 p-8 text-center transition hover:bg-[#398AB9]/5">
          <FileSpreadsheet className="mx-auto mb-2 h-10 w-10 text-[#398AB9]" />
          <p className="font-medium text-slate-700">{busy ? 'Memproses…' : fileName || 'Klik atau seret file .xlsx / .xls / .csv ke sini'}</p>
          <p className="mt-1 text-xs text-slate-500">Kolom yang dibaca: Nama Alat, Kode Alat, No Seri, Merk, Tipe, Lokasi, Kode Ruang, Tgl Kalibrasi, Laik, NIK, Nama Petugas, Tgl Sertifikat, Metode, Sertifikat Internal, Catatan</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
        {sheetInfo && (
          <p className="mt-3 text-xs text-slate-600">
            Sheet terbaca: <b>{sheetInfo.sheet}</b> · {rows.length} alat
            {sheetInfo.missing.length > 0 && <span className="text-amber-700"> · Kolom tidak ditemukan: {sheetInfo.missing.join(', ')}</span>}
          </p>
        )}
      </section>

      {/* Langkah 3: Pemetaan Lokasi -> Kode Ruang ASPAK */}
      {rows.length > 0 && lokasiList.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-semibold text-slate-800">
              <MapPin className="h-5 w-5 text-[#1C658C]" /> 3. Pemetaan Lokasi → Kode Ruang ASPAK
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-3 py-1 ${mappedLokasiCount === lokasiList.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {mappedLokasiCount} dari {lokasiList.length} lokasi sudah punya kode
              </span>
              <button onClick={saveRuangMap} disabled={!hospital || !mapDirty}
                className="flex items-center gap-1 rounded-xl bg-[#1C658C] px-3 py-1.5 text-white disabled:opacity-40"
                title={hospital ? 'Simpan supaya upload berikutnya untuk RS ini terisi otomatis' : 'Pilih RS dulu'}>
                <Save className="h-3.5 w-3.5" /> Simpan pemetaan ke data RS
              </button>
            </div>
          </div>
          <p className="mb-3 text-xs text-slate-600">
            Kode ruang diisi berdasarkan kolom <b>Lokasi</b> untuk alat yang kode ruangnya masih kosong/0.
            Ketik kode atau nama ruang (mis. "Bangsal", "Operasi") lalu pilih dari daftar.
            Tanda <Wand2 className="inline h-3 w-3 text-amber-600" /> = saran otomatis, mohon dicek.
          </p>

          <datalist id="aspak-ruang-options">
            {ruangOptions.map(r => <option key={r.kode} value={r.kode}>{r.nama} — {r.kategori}</option>)}
          </datalist>

          <label className="mb-2 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={onlyUnmapped} onChange={e => setOnlyUnmapped(e.target.checked)} />
            Tampilkan hanya lokasi yang belum punya kode
          </label>

          <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10 bg-[#398AB9] text-white">
                <tr>
                  {['Lokasi di file', 'Jumlah alat', 'Kode Ruang ASPAK', 'Nama ruang ASPAK', 'Status'].map(h =>
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lokasiList
                  .filter(l => !onlyUnmapped || !effectiveMap[l.key])
                  .map(l => {
                    const kode = effectiveMap[l.key] || '';
                    const ruang = kode ? ASPAK_RUANG_BY_KODE.get(kode) : undefined;
                    const isSaved = !!kode && savedMap[l.key] === kode;
                    const isGuess = !!kode && !(l.key in ruangMap);
                    return (
                      <tr key={l.key} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 font-medium text-slate-800">{l.label}</td>
                        <td className="px-2 py-1.5 text-slate-600">
                          {l.count}{l.needsMap < l.count && <span className="text-slate-400"> ({l.count - l.needsMap} sudah ada kode di file)</span>}
                        </td>
                        <td className="px-1 py-1">
                          <div className="flex items-center gap-1">
                            {isGuess && <Wand2 className="h-3 w-3 shrink-0 text-amber-600" aria-label="saran otomatis" />}
                            <input list="aspak-ruang-options" value={kode} placeholder="cari kode/nama…"
                              onChange={e => setRuangMap(prev => ({ ...prev, [l.key]: e.target.value.replace(/\D/g, '') }))}
                              className={`w-28 rounded border px-1 py-0.5 font-mono ${!kode ? 'border-amber-400 bg-amber-50' : kode && !ruang ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} />
                          </div>
                        </td>
                        <td className="max-w-[320px] px-2 py-1.5">
                          {ruang ? <>{ruang.nama} <span className="text-slate-400">· {ruang.kategori}</span></>
                            : kode ? <span className="text-red-600">Kode tidak ada di daftar ruang ASPAK</span>
                            : <span className="text-amber-700">Belum diisi</span>}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {isSaved ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Tersimpan</span>
                            : isGuess ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Saran</span>
                            : kode ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">Diubah</span>
                            : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Langkah 4: Cek & Download */}
      <AnimatePresence>
        {rows.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="h-5 w-5 text-[#1C658C]" /> 4. Cek Data & Download
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-3 py-1">{rows.length} alat → {fileCount} file</span>
                <span className={`flex items-center gap-1 rounded-full px-3 py-1 ${errorCount ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <XCircle className="h-3.5 w-3.5" /> {errorCount} error
                </span>
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> {warnCount} peringatan
                </span>
              </div>
            </div>

            {fileCount > 1 && (
              <div className="mb-4 flex gap-2 rounded-xl bg-[#398AB9]/10 p-3 text-sm text-[#1C658C]">
                <Info className="h-4 w-4 shrink-0" />
                Data lebih dari {ASPAK_MAX_ROWS} alat, otomatis dipecah menjadi {fileCount} file (dikemas dalam 1 ZIP).
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={onlyProblems} onChange={e => { setOnlyProblems(e.target.checked); setPage(0); }} />
                Tampilkan hanya baris bermasalah
              </label>
              <a href={KMK_DRIVE_FOLDER_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#1C658C] hover:underline">
                Lihat dokumen KMK (Google Drive) <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Satu daftar metode dipakai bersama oleh semua baris (ringan untuk browser) */}
            <datalist id="kmk-metode-options">
              {KMK_DEVICE_METODES.map(m => {
                const code = toMetodeCode(m.no);
                return <option key={code} value={code}>{m.title}</option>;
              })}
            </datalist>

            {pageCount > 1 && (
              <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
                <span className="mr-1 text-slate-600">{onlyProblems ? 'Halaman:' : 'File:'}</span>
                {Array.from({ length: pageCount }, (_, p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`rounded-lg border px-2.5 py-1 ${p === safePage ? 'border-[#1C658C] bg-[#1C658C] text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                    {p + 1}
                  </button>
                ))}
                <span className="ml-2 text-slate-500">
                  baris {safePage * ASPAK_MAX_ROWS + 1}–{Math.min((safePage + 1) * ASPAK_MAX_ROWS, filteredRows.length)} dari {filteredRows.length}
                </span>
              </div>
            )}

            <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 z-10 bg-[#1C658C] text-white">
                  <tr>
                    {['No', 'Nama Alat', 'Kode Alat', 'No Seri', 'Merk/Tipe', 'Kode Ruang', 'Tgl Kal', 'Laik', 'Petugas', 'Tgl Sert', 'Metode', 'Catatan cek', ''].map(h =>
                      <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ r, i }) => {
                    const rowIssues = issuesByRow.get(i) || [];
                    return (
                      <tr key={i} className={`border-t border-slate-100 ${i % ASPAK_MAX_ROWS === 0 && i > 0 ? 'border-t-4 border-t-[#398AB9]' : ''}`}>
                        <td className="px-2 py-1.5 text-slate-500">{i + 1}</td>
                        <td className="max-w-[160px] truncate px-2 py-1.5" title={r.namaAlat}>{r.namaAlat}</td>
                        <td className={`px-2 py-1.5 ${cellCls(i, 'kodeAlat')}`}>{r.kodeAlat}</td>
                        <td className={`px-2 py-1.5 ${cellCls(i, 'noSeri')}`}>{r.noSeri}</td>
                        <td className="max-w-[120px] truncate px-2 py-1.5">{[r.merk, r.tipe].filter(Boolean).join(' / ')}</td>
                        <td className={`px-1 py-1 ${cellCls(i, 'kodeRuang')}`}>
                          <input value={r.kodeRuang} title={ASPAK_RUANG_BY_KODE.get(r.kodeRuang)?.nama || ''} onChange={e => updateRow(i, { kodeRuang: e.target.value.replace(/[^\d]/g, '') })}
                            className="w-20 rounded border border-slate-200 bg-transparent px-1 py-0.5" />
                        </td>
                        <td className={`whitespace-nowrap px-2 py-1.5 ${cellCls(i, 'tglKalibrasi')}`}>{r.tglKalibrasi}</td>
                        <td className={`px-1 py-1 ${cellCls(i, 'laik')}`}>
                          <select value={r.laik} onChange={e => updateRow(i, { laik: e.target.value as AspakRow['laik'] })}
                            className="rounded border border-slate-200 bg-transparent px-1 py-0.5">
                            <option value="">—</option><option value="1">1 (Laik)</option><option value="0">0 (Tidak)</option>
                          </select>
                        </td>
                        <td className={`max-w-[120px] truncate px-2 py-1.5 ${cellCls(i, 'nikPetugas')}`} title={r.nikPetugas}>{r.namaPetugas}</td>
                        <td className={`whitespace-nowrap px-2 py-1.5 ${cellCls(i, 'tglSertifikat')}`}>{r.tglSertifikat}</td>
                        <td className={`px-1 py-1 ${cellCls(i, 'metode')}`}>
                          <div className="flex items-center gap-1">
                            {r.metodeOtomatis && <Wand2 className="h-3 w-3 shrink-0 text-amber-600" aria-label="diisi otomatis" />}
                            <input list="kmk-metode-options" value={r.metode} placeholder="KMK-MK-000-0"
                              title={metodeTitle.get(r.metode) || 'Ketik nomor MK atau pilih dari daftar'}
                              onChange={e => updateRow(i, { metode: e.target.value.toUpperCase().replace(/[^A-Z0-9\/-]/g, ''), metodeOtomatis: false })}
                              className="w-32 rounded border border-slate-200 bg-transparent px-1 py-0.5 font-mono" />
                          </div>
                        </td>
                        <td className="max-w-[220px] px-2 py-1.5">
                          {rowIssues.map((x, k) => (
                            <div key={k} className={x.level === 'error' ? 'text-red-600' : 'text-amber-700'}>• {x.message}</div>
                          ))}
                        </td>
                        <td className="px-1">
                          <button onClick={() => removeRow(i)} title="Hapus baris" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div className="text-sm">
                <span className="mb-1 block text-slate-600">Format file</span>
                <div className="flex gap-2">
                  {(['xls', 'xlsx'] as AspakFileFormat[]).map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={`rounded-xl border px-4 py-2 ${format === f ? 'border-[#1C658C] bg-[#1C658C] text-white' : 'border-slate-300 text-slate-700'}`}>
                      .{f} {f === 'xls' ? '(sama seperti template)' : '(berwarna)'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Reset</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={download}
                  disabled={busy || !idValid || !namaRs.trim()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1C658C] to-[#398AB9] px-5 py-2 font-semibold text-white shadow disabled:opacity-40">
                  <Download className="h-4 w-4" />
                  {fileCount > 1 ? `Download ${fileCount} file (ZIP)` : 'Download File ASPAK'}
                </motion.button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AspakExportManager;
