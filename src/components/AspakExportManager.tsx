/**
 * Halaman "Format ASPAK" — ubah Excel rekap kalibrasi menjadi file isian ASPAK
 * (sheet: Data, Petunjuk, Petugas) dengan batas maksimal 90 alat per file.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet, Upload, Download, AlertTriangle, CheckCircle2, XCircle,
  Building2, Save, ExternalLink, Info, Trash2, Wand2, ListChecks,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Hospital } from '../types';
import {
  ASPAK_MAX_ROWS, AspakRow, AspakIssue, AspakFileFormat,
  parseRekapWorkbook, validateAspakRows, writeAspakFile, chunkAspakRows,
  safeFileName, sanitizeAspakText, applyRuangMap, applyLookups, namaAlatKey, petugasKey,
  TglSertifikatMode,
} from '../utils/aspakExport';
import { AspakLookupTable, LookupItem } from './AspakLookupTable';
import { buildAlatIndex, matchAlat, AlatIndex } from '../utils/aspakAlatMatcher';
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
  // Pemetaan yang dipilih/diubah pengguna (atau tersimpan di data RS terpilih)
  const [ruangMap, setRuangMap] = useState<Record<string, string>>({});   // lokasiKey -> kode ruang
  const [alatMap, setAlatMap] = useState<Record<string, string>>({});     // namaAlatKey -> kode alat
  const [nikMap, setNikMap] = useState<Record<string, string>>({});       // petugasKey -> NIK
  const [tglMode, setTglMode] = useState<TglSertifikatMode>('sama');
  const [tglManual, setTglManual] = useState('');
  const [lookupTab, setLookupTab] = useState<'ruang' | 'alat' | 'nik' | 'tgl'>('ruang');
  // Master kode alat (3.540 kode) dimuat terpisah hanya saat dibutuhkan
  const [alatMaster, setAlatMaster] = useState<{ index: AlatIndex; kamus: Record<string, string>; byKode: Map<string, string>; options: [string, string][] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toast = (m: string) => (showToast ? showToast(m) : alert(m));

  const hospital = hospitals.find(h => h.id === hospitalId);
  const sortedHospitals = useMemo(
    () => [...hospitals].sort((a, b) => a.name.localeCompare(b.name)),
    [hospitals],
  );

  /* ---------------- Pemetaan: data unik dari file ---------------- */
  const groupBy = (keyOf: (r: AspakRow) => string, labelOf: (r: AspakRow) => string, needs: (r: AspakRow) => boolean) => {
    const m = new Map<string, LookupItem & { needs: number }>();
    rows.forEach(r => {
      const key = keyOf(r);
      if (!key) return;
      const e = m.get(key) || { key, label: labelOf(r), count: 0, needs: 0 };
      e.count++;
      if (needs(r)) e.needs++;
      m.set(key, e);
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  };

  const lokasiList = useMemo(() => groupBy(r => lokasiKey(r.lokasi), r => r.lokasi, r => !r.kodeRuang || r.kodeRuang === '0')
    .map(l => ({ ...l, note: l.needs < l.count ? `${l.count - l.needs} sudah ada kode di file` : undefined })), [rows]);
  // Hanya nama alat / petugas yang datanya memang kosong di file
  const alatList = useMemo(() => groupBy(r => namaAlatKey(r.namaAlat), r => r.namaAlat, r => !r.kodeAlat || r.kodeAlat === '0')
    .filter(a => a.needs > 0), [rows]);
  const petugasList = useMemo(() => groupBy(r => petugasKey(r.namaPetugas), r => r.namaPetugas, r => !r.nikPetugas)
    .filter(a => a.needs > 0), [rows]);
  const tglKosong = rows.filter(r => !r.tglSertifikat).length;

  // Muat master kode alat bila ada alat tanpa kode
  useEffect(() => {
    if (!alatList.length || alatMaster) return;
    let cancelled = false;
    import('../data/aspakAlatMaster').then(mod => {
      if (cancelled) return;
      setAlatMaster({
        index: buildAlatIndex(mod.ASPAK_ALAT_MASTER),
        kamus: mod.ASPAK_ALAT_KAMUS_SMK,
        byKode: new Map(mod.ASPAK_ALAT_MASTER.map(([k, n]) => [k, n])),
        options: mod.ASPAK_ALAT_MASTER.map(([k, n]) => [k, n] as [string, string]),
      });
    }).catch(() => toast('Gagal memuat master kode alat. Cek koneksi internet lalu upload ulang.'));
    return () => { cancelled = true; };
  }, [alatList.length, alatMaster]);

  // Pemetaan yang pernah disimpan di RS mana pun -> dipakai sebagai saran untuk RS lain
  const globalAlat = useMemo(() => Object.assign({}, ...hospitals.map(h => h.aspakAlatMap || {}), hospital?.aspakAlatMap || {}), [hospitals, hospital]);
  const globalNik = useMemo(() => Object.assign({}, ...hospitals.map(h => h.aspakPetugasMap || {}), hospital?.aspakPetugasMap || {}), [hospitals, hospital]);
  const nikFromFile = useMemo(() => {
    const m: Record<string, string> = {};
    rows.forEach(r => { if (r.nikPetugas && r.namaPetugas) m[petugasKey(r.namaPetugas)] = r.nikPetugas; });
    return m;
  }, [rows]);

  const alatCandidates = useMemo(() => {
    const m = new Map<string, { value: string; label: string }[]>();
    if (alatMaster) alatList.forEach(a => m.set(a.key, matchAlat(alatMaster.index, a.label, 3).map(c => ({ value: c.kode, label: c.nama }))));
    return m;
  }, [alatList, alatMaster]);

  // Urutan prioritas: pilihan pengguna / tersimpan  >  saran otomatis
  const ruangEff = useMemo(() => {
    const out: Record<string, string> = {};
    lokasiList.forEach(l => { out[l.key] = l.key in ruangMap ? ruangMap[l.key] : guessKodeRuang(l.label); });
    return out;
  }, [lokasiList, ruangMap]);
  const alatGuess = (key: string) => globalAlat[key] || alatMaster?.kamus[key] || alatCandidates.get(key)?.[0]?.value || '';
  const alatEff = useMemo(() => {
    const out: Record<string, string> = {};
    alatList.forEach(a => { out[a.key] = a.key in alatMap ? alatMap[a.key] : alatGuess(a.key); });
    return out;
  }, [alatList, alatMap, globalAlat, alatMaster, alatCandidates]);
  const nikEff = useMemo(() => {
    const out: Record<string, string> = {};
    petugasList.forEach(p => { out[p.key] = p.key in nikMap ? nikMap[p.key] : (nikFromFile[p.key] || globalNik[p.key] || ''); });
    return out;
  }, [petugasList, nikMap, nikFromFile, globalNik]);

  const effectiveRows = useMemo(
    () => applyLookups(applyRuangMap(rows, ruangEff), { alat: alatEff, nik: nikEff, tglMode, tglManual }),
    [rows, ruangEff, alatEff, nikEff, tglMode, tglManual],
  );

  const savedRuang = hospital?.aspakRuangMap || {};
  const savedAlat = hospital?.aspakAlatMap || {};
  const savedNik = hospital?.aspakPetugasMap || {};
  const statusOf = (key: string, eff: Record<string, string>, user: Record<string, string>, saved: Record<string, string>) =>
    !eff[key] ? 'empty' as const : saved[key] === eff[key] ? 'saved' as const : key in user ? 'edited' as const : 'guess' as const;
  const differs = (eff: Record<string, string>, saved: Record<string, string>) => Object.entries(eff).some(([k, v]) => v && saved[k] !== v);
  const mapDirty = !!hospital && (differs(ruangEff, savedRuang) || differs(alatEff, savedAlat) || differs(nikEff, savedNik));

  const mergeMap = (saved: Record<string, string>, eff: Record<string, string>, valid: (v: string) => boolean) => {
    const out = { ...saved };
    Object.entries(eff).forEach(([k, v]) => { if (v && valid(v)) out[k] = v; });
    return out;
  };

  const saveAllMaps = async () => {
    if (!hospital) { toast('Pilih rumah sakit dulu agar pemetaan bisa disimpan.'); return; }
    const aspakRuangMap = mergeMap(savedRuang, ruangEff, v => /^\d+$/.test(v));
    const aspakAlatMap = mergeMap(savedAlat, alatEff, v => /^[0-9A-Za-z-]{3,15}$/.test(v));
    const aspakPetugasMap = mergeMap(savedNik, nikEff, v => /^\d{16}$/.test(v)); // hanya NIK 16 digit
    await onUpdateHospital({ ...hospital, aspakRuangMap, aspakAlatMap, aspakPetugasMap });
    setRuangMap(aspakRuangMap); setAlatMap(aspakAlatMap); setNikMap(aspakPetugasMap);
    toast(`Pemetaan untuk ${hospital.name} tersimpan. Upload berikutnya akan terisi otomatis.`);
  };

  const ruangOptions = useMemo(() => ASPAK_RUANG_LIST.filter(r => !r.nonaktif), []);

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
    setAlatMap(h?.aspakAlatMap || {});
    setNikMap(h?.aspakPetugasMap || {});
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
      // buka tab pemetaan yang paling perlu diisi
      const p0 = parsed.rows;
      setLookupTab(p0.some(r => !r.kodeAlat || r.kodeAlat === '0') ? 'alat' : p0.some(r => !r.kodeRuang || r.kodeRuang === '0') ? 'ruang' : p0.some(r => !r.nikPetugas) ? 'nik' : 'tgl');
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
          <Upload className="h-5 w-5 text-[#1C658C]" /> 2. Upload Excel Rekap / Form Rekap Pekerjaan
        </h3>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-[#398AB9]/50 bg-[#EEEEEE]/50 p-8 text-center transition hover:bg-[#398AB9]/5">
          <FileSpreadsheet className="mx-auto mb-2 h-10 w-10 text-[#398AB9]" />
          <p className="font-medium text-slate-700">{busy ? 'Memproses…' : fileName || 'Klik atau seret file .xlsx / .xls / .csv ke sini'}</p>
          <p className="mt-1 text-xs text-slate-500">Bisa rekap ASPAK lengkap (sheet DATA ALAT) atau Form Rekap Pekerjaan (Nama Alat, Merk, Tipe, No. Seri, Petugas, Tanggal Kalibrasi, Ruangan, Keterangan, No. Sertifikat). Kolom yang kosong dilengkapi di langkah 3.</p>
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

      {/* Langkah 3: Lengkapi data (Kode Ruang, Kode Alat, NIK, Tgl Sertifikat) */}
      {rows.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-semibold text-slate-800">
              <ListChecks className="h-5 w-5 text-[#1C658C]" /> 3. Lengkapi Data untuk ASPAK
            </h3>
            <button onClick={saveAllMaps} disabled={!mapDirty}
              className="flex items-center gap-1 rounded-xl bg-[#1C658C] px-3 py-1.5 text-xs text-white disabled:opacity-40"
              title={hospital ? 'Simpan supaya upload berikutnya terisi otomatis' : 'Pilih RS dulu'}>
              <Save className="h-3.5 w-3.5" /> Simpan pemetaan ke data RS
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1 text-xs">
            {([
              ['ruang', 'Kode Ruang', lokasiList.length, lokasiList.filter(l => !ruangEff[l.key]).length],
              ['alat', 'Kode Alat', alatList.length, alatList.filter(a => !alatEff[a.key]).length],
              ['nik', 'NIK Petugas', petugasList.length, petugasList.filter(p => !nikEff[p.key]).length],
              ['tgl', 'Tgl Sertifikat', tglKosong, 0],
            ] as const).filter(([, , total]) => total > 0).map(([id, label, , empty]) => (
              <button key={id} onClick={() => setLookupTab(id)}
                className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 ${lookupTab === id ? 'border-[#1C658C] bg-[#1C658C] text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {label}
                {empty > 0
                  ? <span className={`rounded-full px-1.5 ${lookupTab === id ? 'bg-white/25' : 'bg-amber-100 text-amber-800'}`}>{empty} kosong</span>
                  : <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <p className="mb-3 text-xs text-slate-600">
            Hanya data yang <b>kosong</b> di file yang diisi dari sini; data yang sudah ada di file tidak ditimpa.
            Tanda <Wand2 className="inline h-3 w-3 text-amber-600" /> = saran otomatis, mohon dicek.
          </p>

          {lookupTab === 'ruang' && lokasiList.length > 0 && (
            <>
              <datalist id="aspak-ruang-options">
                {ruangOptions.map(r => <option key={r.kode} value={r.kode}>{r.nama} — {r.kategori}</option>)}
              </datalist>
              <AspakLookupTable
                items={lokasiList} firstColTitle="Lokasi di file" valueColTitle="Kode Ruang ASPAK"
                value={k => ruangEff[k] || ''} status={k => statusOf(k, ruangEff, ruangMap, savedRuang)}
                onChange={(k, v) => setRuangMap(prev => ({ ...prev, [k]: v }))}
                sanitize={v => v.replace(/\D/g, '')} datalistId="aspak-ruang-options" placeholder="cari kode/nama…"
                describe={v => {
                  const r = ASPAK_RUANG_BY_KODE.get(v);
                  return r ? { text: `${r.nama} · ${r.kategori}`, ok: true } : { text: 'Kode tidak ada di daftar ruang ASPAK', ok: false };
                }}
              />
            </>
          )}

          {lookupTab === 'alat' && alatList.length > 0 && (
            !alatMaster ? <p className="text-xs text-slate-500">Memuat master kode alat ASPAK…</p> : (
              <>
                <datalist id="aspak-alat-options">
                  {alatMaster.options.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </datalist>
                <AspakLookupTable
                  items={alatList} firstColTitle="Nama alat di file" valueColTitle="Kode Alat ASPAK" inputWidth="w-32"
                  value={k => alatEff[k] || ''} status={k => statusOf(k, alatEff, alatMap, savedAlat)}
                  onChange={(k, v) => setAlatMap(prev => ({ ...prev, [k]: v }))}
                  sanitize={v => v.replace(/[^0-9A-Za-z-]/g, '')} datalistId="aspak-alat-options" placeholder="cari kode/nama…"
                  candidates={k => alatCandidates.get(k) || []}
                  describe={v => {
                    const n = alatMaster.byKode.get(v);
                    return n ? { text: n, ok: true } : { text: 'Kode tidak ada di master ASPAK yang tersimpan, cek manual', ok: false };
                  }}
                />
              </>
            )
          )}

          {lookupTab === 'nik' && petugasList.length > 0 && (
            <AspakLookupTable
              items={petugasList} firstColTitle="Petugas di file" valueColTitle="NIK (16 digit)" inputWidth="w-40"
              value={k => nikEff[k] || ''} status={k => statusOf(k, nikEff, nikMap, savedNik)}
              onChange={(k, v) => setNikMap(prev => ({ ...prev, [k]: v }))}
              sanitize={v => v.replace(/\D/g, '').slice(0, 16)} placeholder="16 digit NIK"
              describe={v => (v.length === 16 ? { text: 'OK', ok: true } : { text: `NIK harus 16 digit (sekarang ${v.length})`, ok: false })}
            />
          )}

          {lookupTab === 'tgl' && tglKosong > 0 && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-4 text-sm">
              <label>
                <span className="mb-1 block text-xs text-slate-600">{tglKosong} alat belum punya Tanggal Sertifikat. Isi dengan:</span>
                <select value={tglMode} onChange={e => setTglMode(e.target.value as TglSertifikatMode)}
                  className="rounded-xl border border-slate-300 px-3 py-2">
                  <option value="sama">Sama dengan tanggal kalibrasi</option>
                  <option value="plus1">Tanggal kalibrasi + 1 hari</option>
                  <option value="tanggal">Tanggal tertentu…</option>
                </select>
              </label>
              {tglMode === 'tanggal' && (
                <input type="date" value={tglManual} onChange={e => setTglManual(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2" />
              )}
            </div>
          )}
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
