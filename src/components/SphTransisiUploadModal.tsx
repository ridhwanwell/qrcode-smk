import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, FileUp, AlertTriangle, CheckCircle2, Loader2, Trash2, Plus, RotateCcw, WifiOff, Info, Tag, Upload
} from 'lucide-react';
import { CalibrationSchedule, Hospital, MedicalDeviceToCalibrate, SphQuotation, TandaKeteranganSph } from '../types';
import {
  ParsedSphFile, parseSphFile, cekTotal, saranKatalog, pilihOtomatis, rowsToSphItems,
  KamusEntry, SaranKatalog, TANDA_KETERANGAN
} from '../utils/sphTransisiParser';
import { SPH_TARIFF_CATALOG } from '../data/sphTariffCatalog';
import {
  ambilKamusAlat, cekSphGanda, uploadFileSph, simpanSphTransisi, hitungSha256,
  simpanDraft, bacaDraft, hapusDraft, idempotencyBaru, SphTransisiError
} from '../lib/sphTransisiApi';
import {
  formatRupiah, extractSphPrefix, generateSpkNumberFromSph, generateBapNumberFromSph,
  assignDeviceLabelsFromStart, ensureDeviceSeliaItems, parseLabelNumber, formatLabelNumber, TODAY_STR
} from '../utils/helpers';

interface Props {
  hospitals: Hospital[];
  onClose: () => void;
  onCreated: (result: { sph: SphQuotation; schedule: CalibrationSchedule }) => void;
}

interface RowEdit {
  key: string;
  no: number;
  namaAsli: string;
  tanda: TandaKeteranganSph | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  catalogId: number | null;
}

interface FormState {
  sphNumber: string;
  tanggal: string;
  kotaSurat: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalCity: string;
  recipientRole: string;
  marketingName: string;
  labelStart: string;
  statusAwal: 'Dijadwalkan' | 'Sedang Berjalan' | 'Selesai Kalibrasi';
  scheduledDate: string;
  endDate: string;
  rows: RowEdit[];
  ringkasan: { jumlahUnit: number | null; total1: number | null; akomodasi: number | null; total2: number | null; ppnPersen: number | null; ppn: number | null; grandTotal: number | null };
  konfirmasiTotalBeda: boolean;
  jenisFile: 'pdf' | 'xlsx';
  namaFile: string;
  warnings: string[];
  // status pengiriman (disimpan di draft agar kirim ulang tidak membuat data ganda)
  idemKey: string;
  pathFile: string;
  hashFile?: string;
}

const LABEL_RE = /^\d{3}\.\d{4}$/;
const STATUS_OPSI: FormState['statusAwal'][] = ['Dijadwalkan', 'Sedang Berjalan', 'Selesai Kalibrasi'];
const CATALOG_SORTED = [...SPH_TARIFF_CATALOG].sort((a, b) => a.name.localeCompare(b.name));

function tebakKota(alamat: string): string {
  const m = alamat.match(/\b(Kabupaten|Kab\.|Kota)\s+([A-Za-z ]+?)(?:,|\s+Jawa|\s+Provinsi|\s+\d{5}|$)/i);
  return m ? `${/kota/i.test(m[1]) ? 'Kota' : 'Kab.'} ${m[2].trim()}` : '';
}

function angka(v: string): number | null {
  const s = v.replace(/[^\d]/g, '');
  return s ? Number(s) : null;
}

function formFromParsed(parsed: ParsedSphFile, file: File, kamus: KamusEntry[]): FormState {
  const prefix = parsed.sphNumber ? extractSphPrefix(parsed.sphNumber) : '';
  return {
    sphNumber: parsed.sphNumber,
    tanggal: parsed.tanggal,
    kotaSurat: parsed.kota || 'Surakarta',
    hospitalName: parsed.hospitalName,
    hospitalAddress: parsed.hospitalAddress,
    hospitalCity: tebakKota(parsed.hospitalAddress),
    recipientRole: parsed.recipientRole || 'Direktur',
    marketingName: '',
    labelStart: prefix ? `${prefix}.0001` : '',
    statusAwal: 'Dijadwalkan',
    scheduledDate: TODAY_STR,
    endDate: TODAY_STR,
    rows: parsed.rows.map((r, i) => {
      const pick = pilihOtomatis(saranKatalog(r.namaAsli, kamus));
      return {
        key: `r${i}-${r.no}`,
        no: r.no,
        namaAsli: r.namaAsli,
        tanda: r.tanda,
        quantity: r.quantity,
        unit: r.unit || 'Unit',
        unitPrice: r.unitPrice,
        totalPrice: r.totalPrice,
        catalogId: pick ? pick.katalog.id : null
      };
    }),
    ringkasan: { ...parsed.ringkasan, total2: parsed.ringkasan.total2 },
    konfirmasiTotalBeda: false,
    jenisFile: parsed.jenisFile,
    namaFile: file.name,
    warnings: parsed.warnings,
    idemKey: idempotencyBaru(),
    pathFile: ''
  };
}

export const SphTransisiUploadModal: React.FC<Props> = ({ hospitals, onClose, onCreated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [kamus, setKamus] = useState<KamusEntry[]>([]);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [draftInfo, setDraftInfo] = useState<{ savedAt: string; nama: string } | null>(null);
  const [ganda, setGanda] = useState<{ ganda: boolean; daftar: any[] } | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendError, setSendError] = useState<{ msg: string; offline: boolean } | null>(null);
  const [online, setOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftTimer = useRef<any>(null);

  // Kamus alat + draft lama
  useEffect(() => {
    ambilKamusAlat().then(setKamus);
    bacaDraft<FormState>().then(d => {
      if (d?.state?.rows?.length) setDraftInfo({ savedAt: d.savedAt, nama: d.state.namaFile || 'SPH' });
    });
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Simpan draft otomatis (isian + file) setiap ada perubahan
  useEffect(() => {
    if (!form) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      simpanDraft<FormState>({
        state: form,
        file: file || undefined,
        fileName: file?.name,
        fileType: file?.type,
        savedAt: new Date().toISOString()
      });
    }, 700);
    return () => clearTimeout(draftTimer.current);
  }, [form, file]);

  // Cek nomor SPH ganda (setelah berhenti mengetik)
  useEffect(() => {
    if (!form?.sphNumber || form.sphNumber.length < 5) { setGanda(null); return; }
    const t = setTimeout(() => { cekSphGanda(form.sphNumber).then(setGanda); }, 600);
    return () => clearTimeout(t);
  }, [form?.sphNumber]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => (f ? { ...f, [k]: v } : f));

  const handlePickFile = async (f: File | null) => {
    if (!f) return;
    setReadError(null);
    const lower = f.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.xlsx')) {
      setReadError('Format file harus PDF atau Excel (.xlsx).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setReadError('Ukuran file maksimal 10 MB.');
      return;
    }
    setReading(true);
    try {
      const parsed = await parseSphFile(f);
      setFile(f);
      setForm(formFromParsed(parsed, f, kamus));
      setDraftInfo(null);
    } catch (e: any) {
      setReadError(e?.message || 'File tidak bisa dibaca.');
    } finally {
      setReading(false);
    }
  };

  const handleLanjutDraft = async () => {
    const d = await bacaDraft<FormState>();
    if (!d) { setDraftInfo(null); return; }
    setForm(d.state);
    if (d.file) {
      setFile(new File([d.file], d.fileName || d.state.namaFile || 'sph', { type: d.fileType || d.file.type }));
    }
    setDraftInfo(null);
  };

  const handleBuangDraft = async () => {
    await hapusDraft();
    setDraftInfo(null);
  };

  // ---------- Perhitungan ----------
  const cek = useMemo(() => (form ? cekTotal(form.rows, form.ringkasan) : null), [form]);
  const totalUnit = cek?.jumlahUnitBaca || 0;
  const labelValid = !!form && LABEL_RE.test(form.labelStart);
  const labelAkhir = useMemo(() => {
    if (!form || !labelValid || totalUnit < 1) return '';
    const p = parseLabelNumber(form.labelStart);
    return formatLabelNumber(p.hospitalCode, p.sequence + totalUnit - 1);
  }, [form, labelValid, totalUnit]);

  const saranPerRow = useMemo<Record<string, SaranKatalog[]>>(() => {
    const out: Record<string, SaranKatalog[]> = {};
    form?.rows.forEach(r => { out[r.key] = saranKatalog(r.namaAsli, kamus, 3); });
    return out;
  }, [form?.rows, kamus]);

  const masalah: string[] = [];
  if (form) {
    if (!file && !form.pathFile) masalah.push('File SPH belum dipilih.');
    if (!form.sphNumber.trim()) masalah.push('Nomor SPH wajib diisi.');
    if (!form.hospitalName.trim()) masalah.push('Nama rumah sakit wajib diisi.');
    if (form.rows.length === 0) masalah.push('Daftar alat masih kosong.');
    if (form.rows.some(r => !r.namaAsli.trim())) masalah.push('Ada baris alat tanpa nama.');
    if (!labelValid) masalah.push('Nomor label awal harus berformat 3 angka titik 4 angka, contoh 257.0001.');
    if (ganda?.ganda) masalah.push(`Nomor SPH ${form.sphNumber} sudah ada di sistem.`);
    if (cek && !cek.cocok && !form.konfirmasiTotalBeda) masalah.push('Total belum cocok dengan angka di file: periksa tabel, atau centang konfirmasi.');
  }
  const bisaKirim = !!form && masalah.length === 0 && !sending;

  // ---------- Ubah baris ----------
  const updateRow = (key: string, patch: Partial<RowEdit>) => {
    setForm(f => {
      if (!f) return f;
      return {
        ...f,
        rows: f.rows.map(r => {
          if (r.key !== key) return r;
          const next = { ...r, ...patch };
          if (('quantity' in patch || 'unitPrice' in patch) && !('totalPrice' in patch)) {
            next.totalPrice = Math.round((Number(next.quantity) || 0) * (Number(next.unitPrice) || 0));
          }
          return next;
        })
      };
    });
  };
  const hapusRow = (key: string) => setForm(f => (f ? { ...f, rows: f.rows.filter(r => r.key !== key) } : f));
  const tambahRow = () => setForm(f => {
    if (!f) return f;
    const no = (f.rows.reduce((m, r) => Math.max(m, r.no), 0) || 0) + 1;
    return { ...f, rows: [...f.rows, { key: `m${Date.now()}`, no, namaAsli: '', tanda: null, quantity: 1, unit: 'Unit', unitPrice: 0, totalPrice: 0, catalogId: null }] };
  });

  // ---------- Kirim ----------
  const handleKirim = async () => {
    if (!form || !bisaKirim) return;
    setSendError(null);
    let state = form;
    try {
      // 1. Upload file (sekali saja; path disimpan di draft)
      if (!state.pathFile) {
        if (!file) throw new SphTransisiError('File SPH belum dipilih', 400);
        setSending('Mengupload file SPH…');
        const hashFile = await hitungSha256(file);
        const pathFile = await uploadFileSph(file, state.jenisFile);
        state = { ...state, pathFile, hashFile };
        setForm(state);
        await simpanDraft<FormState>({ state, file, fileName: file.name, fileType: file.type, savedAt: new Date().toISOString() });
      }

      // 2. Susun data SPH & jadwal
      setSending('Menyimpan SPH & jadwal…');
      const items = rowsToSphItems(state.rows.map(r => {
        const kat = r.catalogId ? SPH_TARIFF_CATALOG.find(c => c.id === r.catalogId) : undefined;
        return { ...r, namaDipakai: kat?.name || r.namaAsli, catalogNumber: kat?.id ?? null };
      }));
      const sphNumber = state.sphNumber.replace(/\s+/g, '').toUpperCase();
      const hosp = hospitals.find(h => h.name.trim().toLowerCase() === state.hospitalName.trim().toLowerCase());
      const tanggal = state.tanggal || TODAY_STR;
      const valid = new Date(tanggal);
      valid.setMonth(valid.getMonth() + 1);

      const sph: Partial<SphQuotation> = {
        sphType: 'non_ecatalogue',
        sphNumber,
        subject: 'Surat Penawaran Harga Kalibrasi',
        attachmentPages: '2 Lembar',
        date: tanggal,
        city: state.kotaSurat || 'Surakarta',
        hospitalId: hosp?.id,
        hospitalName: state.hospitalName.trim(),
        hospitalAddress: state.hospitalAddress.trim(),
        hospitalPic: hosp?.picName,
        hospitalPhone: hosp?.picPhone,
        recipientRole: state.recipientRole,
        notes: `SPH lama (masa transisi) diupload dari file ${state.namaFile}.`,
        items,
        ppnPercent: state.ringkasan.ppnPersen ?? 11,
        terbilang: '',
        marketingStaffName: state.marketingName,
        marketingStaffPhone: '',
        directorName: '',
        directorTitle: 'Direktur',
        bankName: '',
        bankAccountNumber: '',
        bankAccountName: '',
        termsAndConditions: [],
        validUntilDate: isNaN(valid.getTime()) ? tanggal : valid.toISOString().slice(0, 10)
      };

      const devicesRaw: MedicalDeviceToCalibrate[] = items.map((it, i) => ({
        id: `dev-${i + 1}`,
        name: it.description,
        quantity: it.quantity,
        room: '-',
        brandModel: '-',
        serialNumber: '-',
        status: state.statusAwal === 'Selesai Kalibrasi' ? 'Pass' : 'Pending',
        notes: it.tanda ? `${it.tanda} ${TANDA_KETERANGAN[it.tanda]}` : '',
        sphItemId: it.id,
        sphQuantity: it.quantity,
        tanda: it.tanda ?? null
      }));
      const targetDevices = assignDeviceLabelsFromStart(devicesRaw, state.labelStart);
      const p = parseLabelNumber(state.labelStart);
      const grandTotal = state.ringkasan.grandTotal ?? ((state.ringkasan.total1 ?? 0) + (state.ringkasan.akomodasi ?? 0) + (state.ringkasan.ppn ?? 0));

      const schedule: CalibrationSchedule = {
        id: 'baru',
        sumber: 'transisi',
        workOrderNumber: generateSpkNumberFromSph(sphNumber),
        bapNumber: generateBapNumberFromSph(sphNumber),
        sphNumber,
        hospitalId: hosp?.id || '',
        hospitalCode: p.hospitalCode,
        hospitalName: state.hospitalName.trim(),
        hospitalAddress: state.hospitalAddress.trim(),
        hospitalCity: state.hospitalCity || hosp?.city || '-',
        hospitalPic: hosp?.picName || '-',
        hospitalPicRole: hosp?.picRole,
        hospitalPhone: hosp?.picPhone || '-',
        scheduledDate: state.scheduledDate || TODAY_STR,
        endDate: state.endDate || state.scheduledDate || TODAY_STR,
        leadTechnicianId: '',
        leadTechnicianName: '',
        supportTechnicianIds: [],
        supportTechnicianNames: [],
        marketingName: state.marketingName,
        labelStart: state.labelStart,
        labelEnd: labelAkhir,
        labelRange: labelAkhir && labelAkhir !== state.labelStart ? `${state.labelStart} s/d ${labelAkhir}` : state.labelStart,
        labelSequenceStart: p.sequence,
        targetDevices,
        assignedCalibratorIds: [],
        assignedCalibratorNames: [],
        priority: 'Sedang',
        status: state.statusAwal,
        estimatedHours: Math.max(1, totalUnit) * 2,
        contractValue: grandTotal,
        progressPercent: state.statusAwal === 'Selesai Kalibrasi' ? 100 : 0,
        completedDate: state.statusAwal === 'Selesai Kalibrasi' ? (state.endDate || TODAY_STR) : undefined,
        createdAt: TODAY_STR,
        remindersSentCount: 0,
        approvedByName: 'Hafizh Pasifianto Utomo S.Tr,T',
        approvedByRole: 'Manajer Teknik',
        notes: `Ditambahkan manual dari SPH lama No. ${sphNumber} (masa transisi). Label: ${state.labelStart}${labelAkhir ? ` s/d ${labelAkhir}` : ''}.`
      };
      schedule.seliaItems = ensureDeviceSeliaItems(schedule);

      const kamusKirim = state.rows
        .filter(r => r.catalogId)
        .map(r => {
          const kat = SPH_TARIFF_CATALOG.find(c => c.id === r.catalogId)!;
          return { namaAsli: r.namaAsli, nomorKatalog: kat.id, namaKatalog: kat.name };
        });

      const result = await simpanSphTransisi({
        sph,
        schedule,
        file: { pathFile: state.pathFile, namaFile: state.namaFile, jenisFile: state.jenisFile, hashFile: state.hashFile },
        ringkasanFile: {
          jumlahUnit: state.ringkasan.jumlahUnit, total1: state.ringkasan.total1, akomodasi: state.ringkasan.akomodasi,
          total2: state.ringkasan.total2, ppn: state.ringkasan.ppn, grandTotal: state.ringkasan.grandTotal
        },
        konfirmasiTotalBeda: state.konfirmasiTotalBeda,
        kamus: kamusKirim
      }, state.idemKey);

      await hapusDraft();
      setSending(null);
      onCreated(result);
      onClose();
    } catch (e: any) {
      setSending(null);
      const status = e instanceof SphTransisiError ? e.status : 0;
      const offline = !navigator.onLine || status === 0 || status >= 500;
      if (status === 409) {
        setGanda({ ganda: true, daftar: e.detail?.daftar || [] });
        // kunci idempotensi baru agar setelah nomor diperbaiki tidak memakai jawaban lama
        setForm(f => (f ? { ...f, idemKey: idempotencyBaru() } : f));
      }
      if (status === 400 && /file/i.test(e?.message || '')) {
        // file bermasalah -> upload ulang di percobaan berikutnya
        setForm(f => (f ? { ...f, pathFile: '', idemKey: idempotencyBaru() } : f));
      }
      if (status === 422) setForm(f => (f ? { ...f, idemKey: idempotencyBaru() } : f));
      setSendError({
        msg: offline
          ? `${e?.message || 'Koneksi terputus.'} Isian sudah tersimpan di perangkat ini — klik "Kirim Ulang" saat internet stabil.`
          : (e?.message || 'Gagal menyimpan.'),
        offline
      });
    }
  };

  // Kirim ulang otomatis sekali saat internet kembali
  useEffect(() => {
    if (online && sendError?.offline && bisaKirim) {
      const t = setTimeout(() => handleKirim(), 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ======================================================================
  // TAMPILAN
  // ======================================================================
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#DCDFE3] rounded-2xl w-full max-w-6xl my-auto flex flex-col max-h-[94vh] shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 bg-gradient-to-r from-[#1C658C] to-teal-700">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <FileUp className="w-5 h-5 text-white/90" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg">Tambah Manual + Upload SPH Lama</h3>
              <p className="text-xs text-white/75 truncate">
                Masa transisi SPH Excel → website. Daftar alat dibaca otomatis, lalu dicek sebelum disimpan.
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={!!sending} className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!online && (
          <div className="px-5 py-2 bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-2 border-b border-amber-300">
            <WifiOff className="w-4 h-4" /> Internet terputus. Isian tetap tersimpan di perangkat ini dan bisa dikirim saat internet kembali.
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm bg-slate-50/50">
          {draftInfo && !form && (
            <div className="p-3 bg-sky-50 border border-sky-300 rounded-xl text-sky-900 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Ada isian yang belum terkirim ({draftInfo.nama}, {new Date(draftInfo.savedAt).toLocaleString('id-ID')}).
              </span>
              <span className="flex gap-2">
                <button onClick={handleLanjutDraft} className="px-3 py-1.5 rounded-lg bg-sky-700 text-white font-bold cursor-pointer">Lanjutkan</button>
                <button onClick={handleBuangDraft} className="px-3 py-1.5 rounded-lg border border-sky-400 font-bold cursor-pointer">Buang</button>
              </span>
            </div>
          )}

          {/* Pilih file */}
          <div className="bg-white border border-dashed border-[#398AB9] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 text-xs">
              <p className="font-bold text-slate-800 text-sm">1. Pilih file SPH</p>
              <p className="text-slate-500">PDF hasil "Save as PDF" dari Excel, atau file Excel (.xlsx) aslinya. Maks 10 MB.</p>
              {file && <p className="mt-1 font-mono text-[#1C658C] truncate">📄 {file.name} ({Math.round(file.size / 1024)} KB)</p>}
              {form?.pathFile && <p className="text-emerald-700 font-semibold">✓ File sudah terupload ke penyimpanan privat</p>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={e => { handlePickFile(e.target.files?.[0] || null); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={reading || !!sending}
              className="px-4 py-2 rounded-xl bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {reading ? 'Membaca file…' : form ? 'Ganti File' : 'Pilih File SPH'}
            </button>
          </div>
          {readError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {readError}
            </div>
          )}

          {form && (
            <>
              {/* Peringatan hasil baca */}
              {form.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Perlu dicek:</p>
                  <ul className="list-disc pl-5">{form.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}

              {/* Data SPH & RS */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-sm">2. Data SPH & Rumah Sakit</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Nomor SPH *</span>
                    <input value={form.sphNumber} onChange={e => set('sphNumber', e.target.value.toUpperCase())}
                      className={`w-full px-2.5 py-2 border rounded-lg font-mono ${ganda?.ganda ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} placeholder="257/SMK-SPH/X-2026" />
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Tanggal SPH</span>
                    <input type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="font-semibold text-slate-600">Nama Rumah Sakit *</span>
                    <input list="smk-rs-list" value={form.hospitalName} onChange={e => set('hospitalName', e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                    <datalist id="smk-rs-list">{hospitals.map(h => <option key={h.id} value={h.name} />)}</datalist>
                  </label>
                  <label className="space-y-1 sm:col-span-2 lg:col-span-3">
                    <span className="font-semibold text-slate-600">Alamat RS</span>
                    <input value={form.hospitalAddress} onChange={e => set('hospitalAddress', e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Kota / Kab. RS</span>
                    <input value={form.hospitalCity} onChange={e => set('hospitalCity', e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Marketing (opsional)</span>
                    <input value={form.marketingName} onChange={e => set('marketingName', e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                  </label>
                </div>
                {ganda?.ganda && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs">
                    <p className="font-bold">Nomor SPH ini sudah ada di sistem — tidak bisa disimpan dua kali:</p>
                    <ul className="list-disc pl-5">
                      {ganda.daftar.slice(0, 5).map((d: any, i: number) => (
                        <li key={i}>{d.asal === 'dokumen_sph' ? 'SPH' : 'Jadwal'} {d.nomor_sph} — {d.nama_rs || '-'} ({d.sumber === 'transisi' ? 'upload transisi' : 'dibuat di web'})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tabel alat */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                  <p className="font-bold text-sm">3. Daftar Alat ({form.rows.length} jenis, {totalUnit} unit)</p>
                  <button onClick={tambahRow} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#1C658C] text-[#1C658C] hover:bg-[#1C658C]/10 flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[900px]">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-2 py-2 text-center w-10">No</th>
                        <th className="px-2 py-2 text-left">Nama di File SPH</th>
                        <th className="px-2 py-2 text-left">Nama Katalog (dipakai di website)</th>
                        <th className="px-2 py-2 text-center w-16">Qty</th>
                        <th className="px-2 py-2 text-right w-28">Harga Satuan</th>
                        <th className="px-2 py-2 text-right w-28">Total</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.rows.map(r => {
                        const saran = saranPerRow[r.key] || [];
                        const dariKamus = saran[0]?.sumber === 'kamus' && saran[0].katalog.id === r.catalogId;
                        return (
                          <tr key={r.key} className="border-t border-slate-100 align-top">
                            <td className="px-2 py-1.5 text-center font-mono text-slate-500">{r.no}</td>
                            <td className="px-2 py-1.5">
                              <input value={r.namaAsli} onChange={e => updateRow(r.key, { namaAsli: e.target.value })}
                                className={`w-full px-2 py-1 border rounded-md ${r.namaAsli.trim() ? 'border-slate-200' : 'border-rose-400 bg-rose-50'}`} />
                              <div className="mt-1 flex items-center gap-1">
                                <select value={r.tanda || ''} onChange={e => updateRow(r.key, { tanda: (e.target.value || null) as any })}
                                  className="px-1 py-0.5 border border-slate-200 rounded text-[10px]">
                                  <option value="">tanpa tanda</option>
                                  {(Object.keys(TANDA_KETERANGAN) as TandaKeteranganSph[]).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {r.tanda && <span className="text-[10px] text-amber-700 font-semibold">{TANDA_KETERANGAN[r.tanda]}</span>}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={r.catalogId ?? ''}
                                onChange={e => updateRow(r.key, { catalogId: e.target.value ? Number(e.target.value) : null })}
                                className={`w-full px-2 py-1 border rounded-md ${r.catalogId ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50'}`}
                              >
                                <option value="">— pakai nama asli (tidak ada di katalog) —</option>
                                {saran.length > 0 && (
                                  <optgroup label="Saran">
                                    {saran.map(s => (
                                      <option key={`s${s.katalog.id}`} value={s.katalog.id}>
                                        {s.katalog.name} {s.sumber === 'kamus' ? '(pernah dipakai)' : `(${Math.round(Math.min(1, s.skor) * 100)}%)`}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                <optgroup label="Semua katalog 121 alat">
                                  {CATALOG_SORTED.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </optgroup>
                              </select>
                              <p className="text-[10px] mt-0.5 text-slate-500">
                                {r.catalogId ? (dariKamus ? '✓ dari kamus (pernah dikonfirmasi)' : '✓ cocok katalog — pastikan benar') : 'Nama asli dipakai'}
                              </p>
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min={0} value={r.quantity}
                                onChange={e => updateRow(r.key, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-center font-mono" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input inputMode="numeric" value={r.unitPrice ? r.unitPrice.toLocaleString('id-ID') : ''}
                                onChange={e => updateRow(r.key, { unitPrice: angka(e.target.value) ?? 0 })}
                                className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-right font-mono" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input inputMode="numeric" value={r.totalPrice ? r.totalPrice.toLocaleString('id-ID') : ''}
                                onChange={e => updateRow(r.key, { totalPrice: angka(e.target.value) ?? 0 })}
                                className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-right font-mono font-bold" />
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              <button onClick={() => hapusRow(r.key)} title="Hapus baris" className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cek total */}
              {cek && (
                <div className={`border rounded-xl p-4 space-y-3 ${cek.cocok ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                  <p className={`font-bold text-sm flex items-center gap-1.5 ${cek.cocok ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {cek.cocok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    4. Cek Total {cek.cocok ? '— cocok dengan file SPH' : '— BELUM cocok dengan file SPH'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Jumlah unit</p>
                      <p>Hasil baca: <strong className="font-mono">{cek.jumlahUnitBaca}</strong> • Di file:{' '}
                        <input value={form.ringkasan.jumlahUnit ?? ''} onChange={e => set('ringkasan', { ...form.ringkasan, jumlahUnit: angka(e.target.value) })}
                          className="w-16 px-1 py-0.5 border border-slate-300 rounded font-mono text-center" />
                        {cek.unitCocok === false && <span className="text-rose-700 font-bold"> ✗ beda {cek.jumlahUnitBaca - (cek.jumlahUnitFile ?? 0)}</span>}
                        {cek.unitCocok && <span className="text-emerald-700 font-bold"> ✓</span>}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total 1 (harga alat)</p>
                      <p>Hasil baca: <strong className="font-mono">{formatRupiah(cek.total1Baca)}</strong> • Di file:{' '}
                        <input value={form.ringkasan.total1 ? form.ringkasan.total1.toLocaleString('id-ID') : ''} onChange={e => set('ringkasan', { ...form.ringkasan, total1: angka(e.target.value) })}
                          className="w-28 px-1 py-0.5 border border-slate-300 rounded font-mono text-right" />
                        {cek.total1Cocok === false && <span className="text-rose-700 font-bold"> ✗</span>}
                        {cek.total1Cocok && <span className="text-emerald-700 font-bold"> ✓</span>}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {([
                      ['akomodasi', 'Akomodasi'],
                      ['ppn', `PPN ${form.ringkasan.ppnPersen ?? 11}%`],
                      ['total2', 'Total 2'],
                      ['grandTotal', 'Grand Total']
                    ] as const).map(([k, label]) => (
                      <label key={k} className="bg-white rounded-lg border border-slate-200 p-2 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">{label}</span>
                        <input value={form.ringkasan[k] ? (form.ringkasan[k] as number).toLocaleString('id-ID') : ''}
                          onChange={e => set('ringkasan', { ...form.ringkasan, [k]: angka(e.target.value) })}
                          className={`w-full px-1.5 py-0.5 border border-slate-300 rounded font-mono text-right ${k === 'grandTotal' ? 'font-bold' : ''}`} />
                      </label>
                    ))}
                  </div>
                  {!cek.cocok && (
                    <label className="flex items-start gap-2 text-xs text-rose-900 cursor-pointer">
                      <input type="checkbox" className="mt-0.5" checked={form.konfirmasiTotalBeda} onChange={e => set('konfirmasiTotalBeda', e.target.checked)} />
                      <span>Saya sudah memeriksa tabel dan yakin data sudah benar walaupun total berbeda dengan angka di file. (Dicatat di sistem.)</span>
                    </label>
                  )}
                </div>
              )}

              {/* Label & status */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-bold text-sm flex items-center gap-1.5"><Tag className="w-4 h-4 text-[#1C658C]" /> 5. Nomor Label & Status Awal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Nomor label pertama *</span>
                    <input value={form.labelStart} onChange={e => set('labelStart', e.target.value.trim())} placeholder="257.0001"
                      className={`w-full px-2.5 py-2 border rounded-lg font-mono ${labelValid ? 'border-slate-300' : 'border-rose-400 bg-rose-50'}`} />
                    <span className="text-[10px] text-slate-500 block">
                      {labelValid && labelAkhir ? `Otomatis: ${form.labelStart} s/d ${labelAkhir} (${totalUnit} unit)` : 'Format: 3 angka titik 4 angka'}
                    </span>
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Status awal</span>
                    <select value={form.statusAwal} onChange={e => set('statusAwal', e.target.value as FormState['statusAwal'])} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg">
                      {STATUS_OPSI.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {form.statusAwal === 'Selesai Kalibrasi' && <span className="text-[10px] text-emerald-700 block">Langsung muncul di Selia Dashboard.</span>}
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Tanggal mulai</span>
                    <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-600">Tanggal selesai</span>
                    <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Qty di atas menjadi <strong>Qty SPH</strong> (terkunci). Jika di lapangan jumlah alat berbeda, ubah lewat tombol <strong>Realisasi</strong> di kartu jadwal — selisihnya otomatis tercatat.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-white border-t border-[#DCDFE3] space-y-2 shrink-0">
          {sendError && (
            <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${sendError.offline ? 'bg-amber-50 border border-amber-300 text-amber-900' : 'bg-rose-50 border border-rose-300 text-rose-900'}`}>
              {sendError.offline ? <WifiOff className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{sendError.msg}</span>
            </div>
          )}
          {form && masalah.length > 0 && !sending && (
            <p className="text-[11px] text-rose-700 font-semibold">{masalah[0]}{masalah.length > 1 ? ` (+${masalah.length - 1} lainnya)` : ''}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500 max-w-lg">
              Isian otomatis tersimpan di perangkat ini sampai berhasil dikirim. File SPH disimpan di penyimpanan privat.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={onClose} disabled={!!sending} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 cursor-pointer disabled:opacity-40">
                Tutup
              </button>
              <button
                onClick={handleKirim}
                disabled={!bisaKirim}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sendError ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {sending || (sendError ? 'Kirim Ulang' : 'Simpan SPH & Buat Jadwal RS')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
