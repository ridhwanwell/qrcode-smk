/**
 * API SPH TRANSISI (Tambah Manual + Upload SPH lama dari Excel/PDF)
 * ------------------------------------------------------------------
 * Hanya admin_utama & admin_keuangan (tombol ada di halaman Penawaran SPH).
 *
 *  POST /api/sph-transisi/cek-ganda      -> cek nomor SPH sudah ada (web maupun transisi)
 *  POST /api/sph-transisi/upload-url     -> izin upload 1 file ke bucket privat (path acak dibuat server)
 *  POST /api/sph-transisi                -> simpan SPH transisi + jadwal RS sekaligus
 *  GET  /api/sph-transisi/kamus          -> kamus nama alat (SPH lama -> katalog 121 alat)
 *  GET  /api/sph-transisi/riwayat/:id    -> riwayat perubahan realisasi satu jadwal
 *
 * Keamanan:
 *  - Path file dibuat server (acak), pola wajib sph/transisi/<acak>.pdf|xlsx (juga dikunci CHECK di database).
 *  - Isi file dicek (PDF harus diawali %PDF, XLSX diawali PK) dan ukuran maks 10 MB.
 *  - Qty SPH (sphQuantity) diisi server dari item SPH, bukan dari browser.
 *  - Total dihitung ulang di server; bila tidak cocok dengan angka di file, wajib konfirmasi admin.
 *  - Nomor SPH ganda ditolak (fungsi database cek_sph_ganda + unique index).
 */
import type { Express, Response } from "express";
import crypto from "crypto";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";

const BUCKET = 'internal-documents';
const PATH_RE = /^sph\/transisi\/[A-Za-z0-9_-]{8,80}\.(pdf|xlsx)$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ROLES_TULIS = ['admin_utama', 'admin_keuangan'] as const;
const STATUS_AWAL = ['Dijadwalkan', 'Sedang Berjalan', 'Selesai Kalibrasi'] as const;
const TANDA_VALID = new Set(['*', '**', '***', '****']);

export interface SphTransisiDeps {
  getIdempotencyRecord: (key: string) => Promise<{ statusCode: number; body: any; expiresAt: number } | null>;
  saveIdempotencyRecord: (key: string, statusCode: number, body: any, userId?: string) => Promise<void>;
  rowToItem: (row: any) => any;
  logCollectionActivity: (req: AuthRequest, action: string, collName: string, recordId: string, payload: any) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Fungsi bantu validasi
// ---------------------------------------------------------------------------
function str(v: unknown, max: number): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function int(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function money(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e12) return null;
  return Math.round(n);
}

function normalNomorSph(s: string): string {
  return s.replace(/\s+/g, '').toUpperCase();
}

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function idempotencyKeyFor(req: AuthRequest, scope: string): string | null {
  const raw = req.headers['idempotency-key'];
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return `${req.user?.id || 'user'}:${scope}:${raw.trim().slice(0, 120)}`;
}

/** Cek file benar-benar ada di storage, ukuran wajar, dan isinya sesuai jenis. */
async function verifikasiFile(pathFile: string): Promise<{ ok: boolean; size?: number; error?: string }> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(pathFile);
  if (error || !data) return { ok: false, error: 'File SPH belum terupload atau tidak ditemukan. Upload ulang file-nya.' };
  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.length === 0) return { ok: false, error: 'File SPH kosong.' };
  if (buf.length > MAX_FILE_BYTES) return { ok: false, error: 'Ukuran file SPH lebih dari 10 MB.' };
  const head = buf.subarray(0, 4).toString('latin1');
  if (pathFile.endsWith('.pdf') && !head.startsWith('%PDF')) return { ok: false, error: 'File bukan PDF yang valid.' };
  if (pathFile.endsWith('.xlsx') && !head.startsWith('PK')) return { ok: false, error: 'File bukan Excel (.xlsx) yang valid.' };
  return { ok: true, size: buf.length };
}

// ---------------------------------------------------------------------------
// Pendaftaran endpoint
// ---------------------------------------------------------------------------
export function registerSphTransisiRoutes(app: Express, deps: SphTransisiDeps) {
  const { getIdempotencyRecord, saveIdempotencyRecord, rowToItem, logCollectionActivity } = deps;

  // 1) Cek nomor SPH ganda
  app.post("/api/sph-transisi/cek-ganda", requireAuth, requireRole([...ROLES_TULIS]), async (req: AuthRequest, res: Response) => {
    try {
      const nomor = str(req.body?.nomorSph, 60);
      if (!nomor) return res.status(400).json({ error: "Nomor SPH wajib diisi" });
      const { data, error } = await supabaseAdmin.rpc('cek_sph_ganda', { p_nomor_sph: nomor });
      if (error) {
        console.error('[sph-transisi] cek_sph_ganda error:', error);
        return res.status(503).json({ error: "Database sedang tidak bisa dihubungi, coba lagi" });
      }
      return res.json({ ganda: Array.isArray(data) && data.length > 0, daftar: data || [] });
    } catch (err) {
      console.error('[sph-transisi] cek-ganda:', err);
      return res.status(500).json({ error: "Terjadi kesalahan sistem saat cek nomor SPH" });
    }
  });

  // 2) Izin upload file (path acak dibuat server)
  app.post("/api/sph-transisi/upload-url", requireAuth, requireRole([...ROLES_TULIS]), async (req: AuthRequest, res: Response) => {
    try {
      const jenisFile = req.body?.jenisFile === 'xlsx' ? 'xlsx' : req.body?.jenisFile === 'pdf' ? 'pdf' : null;
      const ukuran = int(req.body?.ukuran, 1, MAX_FILE_BYTES);
      if (!jenisFile) return res.status(400).json({ error: "Jenis file harus PDF atau XLSX" });
      if (ukuran === null) return res.status(400).json({ error: "Ukuran file maksimal 10 MB" });

      const pathFile = `sph/transisi/${crypto.randomBytes(16).toString('hex')}.${jenisFile}`;
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(pathFile);
      if (error || !data) {
        console.error('[sph-transisi] createSignedUploadUrl error:', error);
        return res.status(503).json({ error: "Penyimpanan file sedang tidak bisa dihubungi, coba lagi" });
      }
      return res.json({ pathFile, token: data.token });
    } catch (err) {
      console.error('[sph-transisi] upload-url:', err);
      return res.status(500).json({ error: "Terjadi kesalahan sistem saat menyiapkan upload" });
    }
  });

  // 3) Simpan SPH transisi + jadwal RS
  app.post("/api/sph-transisi", requireAuth, requireRole([...ROLES_TULIS]), async (req: AuthRequest, res: Response) => {
    const idemKey = idempotencyKeyFor(req, 'sph-transisi');
    try {
      if (idemKey) {
        const cached = await getIdempotencyRecord(idemKey);
        if (cached && cached.expiresAt > Date.now()) return res.status(cached.statusCode).json(cached.body);
      }

      const body = req.body || {};
      const actor = req.user?.email || req.user?.id || req.userRole || 'pengguna';
      const nowIso = new Date().toISOString();

      if (JSON.stringify(body).length > 1_500_000) {
        return res.status(413).json({ error: "Data terlalu besar" });
      }

      // --- File ---
      const pathFile = str(body.file?.pathFile, 200);
      if (!PATH_RE.test(pathFile)) return res.status(400).json({ error: "Path file SPH tidak valid" });
      const jenisFile: 'pdf' | 'xlsx' = pathFile.endsWith('.xlsx') ? 'xlsx' : 'pdf';
      const cekFile = await verifikasiFile(pathFile);
      if (!cekFile.ok) return res.status(400).json({ error: cekFile.error });

      // --- Data SPH dari browser ---
      const sphIn = body.sph && typeof body.sph === 'object' ? body.sph : null;
      const schIn = body.schedule && typeof body.schedule === 'object' ? body.schedule : null;
      if (!sphIn || !schIn) return res.status(400).json({ error: "Data SPH dan jadwal wajib dikirim" });

      const sphNumber = normalNomorSph(str(sphIn.sphNumber, 60));
      const hospitalName = str(sphIn.hospitalName, 200);
      if (!sphNumber) return res.status(400).json({ error: "Nomor SPH wajib diisi" });
      if (!hospitalName) return res.status(400).json({ error: "Nama rumah sakit wajib diisi" });

      // --- Item alat ---
      const rawItems: any[] = Array.isArray(sphIn.items) ? sphIn.items : [];
      if (rawItems.length === 0 || rawItems.length > 500) {
        return res.status(400).json({ error: "Daftar alat harus berisi 1 sampai 500 baris" });
      }
      const items: any[] = [];
      for (let i = 0; i < rawItems.length; i++) {
        const it = rawItems[i] || {};
        const description = str(it.description, 200);
        const quantity = int(it.quantity, 0, 100000);
        const unitPrice = money(it.unitPrice);
        const totalPrice = money(it.totalPrice);
        if (!description || quantity === null || unitPrice === null || totalPrice === null) {
          return res.status(400).json({ error: `Baris alat ke-${i + 1} tidak lengkap (nama, qty, harga satuan, total wajib angka yang benar)` });
        }
        const tanda = TANDA_VALID.has(it.tanda) ? it.tanda : null;
        const catalogNumber = int(it.catalogNumber, 1, 9999);
        items.push({
          id: `item-${i + 1}`,
          no: i + 1,
          catalogNumber: catalogNumber ?? undefined,
          description,
          namaAsliFile: str(it.namaAsliFile, 200) || description,
          quantity,
          unit: str(it.unit, 20) || 'Unit',
          standardPrice: money(it.standardPrice) ?? unitPrice,
          unitPrice,
          totalPrice,
          tanda,
          notes: str(it.notes, 300) || undefined,
          category: str(it.category, 80) || undefined
        });
      }
      const itemById = new Map<string, any>();
      rawItems.forEach((it, i) => itemById.set(String(it?.id ?? `item-${i + 1}`), items[i]));

      // --- Cek total (dihitung ulang di server) ---
      const rf = body.ringkasanFile || {};
      const ringkasanFile = {
        jumlahUnit: int(rf.jumlahUnit, 0, 10_000_000),
        total1: money(rf.total1),
        akomodasi: money(rf.akomodasi),
        total2: money(rf.total2),
        ppn: money(rf.ppn),
        grandTotal: money(rf.grandTotal)
      };
      const ringkasanBaca = {
        jumlahUnit: items.reduce((s, it) => s + it.quantity, 0),
        total1: items.reduce((s, it) => s + it.totalPrice, 0)
      };
      const tol = Math.max(1, items.length);
      const unitCocok = ringkasanFile.jumlahUnit === null ? null : ringkasanFile.jumlahUnit === ringkasanBaca.jumlahUnit;
      const totalCocok1 = ringkasanFile.total1 === null ? null : Math.abs(ringkasanFile.total1 - ringkasanBaca.total1) <= tol;
      const totalCocok = unitCocok !== false && totalCocok1 !== false && (unitCocok !== null || totalCocok1 !== null);
      if (!totalCocok && body.konfirmasiTotalBeda !== true) {
        return res.status(422).json({
          error: "Total hasil baca tidak sama dengan angka di file SPH. Periksa tabel atau centang konfirmasi.",
          ringkasanFile, ringkasanBaca
        });
      }

      // --- Cek SPH ganda ---
      const { data: ganda, error: gandaErr } = await supabaseAdmin.rpc('cek_sph_ganda', { p_nomor_sph: sphNumber });
      if (gandaErr) {
        console.error('[sph-transisi] cek_sph_ganda error:', gandaErr);
        return res.status(503).json({ error: "Database sedang tidak bisa dihubungi, data masih tersimpan di perangkat. Coba kirim ulang." });
      }
      if (Array.isArray(ganda) && ganda.length > 0) {
        return res.status(409).json({ error: `Nomor SPH ${sphNumber} sudah ada di sistem.`, daftar: ganda });
      }

      // --- Susun data SPH ---
      const total1 = ringkasanFile.total1 ?? ringkasanBaca.total1;
      const akomodasi = ringkasanFile.akomodasi ?? 0;
      const ppn = ringkasanFile.ppn ?? 0;
      const grandTotal = ringkasanFile.grandTotal ?? (total1 + akomodasi + ppn);
      const sphId = randomId('SPH-TR');
      const scheduleId = randomId('SCH-TR');
      const transisi = {
        pathFile,
        namaFile: str(body.file?.namaFile, 200) || `SPH ${sphNumber}.${jenisFile}`,
        jenisFile,
        hashFile: /^[a-f0-9]{64}$/.test(String(body.file?.hashFile || '')) ? body.file.hashFile : undefined,
        ringkasanFile,
        ringkasanBaca,
        totalCocok,
        diuploadOleh: actor,
        diuploadPada: nowIso
      };

      const sphData: any = {
        // field umum dari browser (header surat, bank, dsb.)
        ...sphIn,
        id: sphId,
        sumber: 'transisi',
        sphNumber,
        hospitalName,
        hospitalAddress: str(sphIn.hospitalAddress, 400),
        city: str(sphIn.city, 80) || 'Surakarta',
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(sphIn.date || '')) ? sphIn.date : nowIso.slice(0, 10),
        items,
        subtotalOriginal: total1,
        subtotal1: total1,
        accommodationFee: akomodasi,
        subtotal2: total1 + akomodasi,
        ppnPercent: Number.isFinite(Number(sphIn.ppnPercent)) ? Number(sphIn.ppnPercent) : 11,
        ppnAmount: ppn,
        isPpnIncluded: false,
        grandTotal,
        status: 'Disetujui (Deal)',
        pdfUrl: pathFile,
        transisi,
        createdAt: nowIso.slice(0, 10)
      };
      delete sphData.updatedAt;
      delete sphData.baseUpdatedAt;

      // --- Susun data jadwal ---
      const status = STATUS_AWAL.includes(schIn.status) ? schIn.status : 'Dijadwalkan';
      const rawDevices: any[] = Array.isArray(schIn.targetDevices) ? schIn.targetDevices.slice(0, 600) : [];
      const targetDevices = rawDevices.map((d: any, i: number) => {
        const src = d?.sphItemId ? itemById.get(String(d.sphItemId)) : undefined;
        const dev: any = {
          ...d,
          id: str(d?.id, 60) || `dev-${i + 1}`,
          name: str(d?.name, 200) || src?.description || `Alat ${i + 1}`,
          quantity: int(d?.quantity, 0, 100000) ?? (src?.quantity ?? 0),
          room: str(d?.room, 120) || '-',
          brandModel: str(d?.brandModel, 120) || '-',
          serialNumber: str(d?.serialNumber, 120) || '-',
          status: d?.status || 'Pending',
          tanda: src?.tanda ?? (TANDA_VALID.has(d?.tanda) ? d.tanda : null)
        };
        if (src) {
          dev.sphItemId = src.id;
          dev.sphQuantity = src.quantity; // Qty SPH SELALU dari item SPH
        } else {
          delete dev.sphItemId;
          delete dev.sphQuantity;
        }
        return dev;
      });
      if (targetDevices.length === 0) return res.status(400).json({ error: "Jadwal belum berisi alat" });

      const scheduleData: any = {
        ...schIn,
        id: scheduleId,
        sumber: 'transisi',
        sphId,
        sphNumber,
        hospitalName,
        hospitalAddress: str(schIn.hospitalAddress, 400) || sphData.hospitalAddress,
        targetDevices,
        status,
        contractValue: grandTotal,
        progressPercent: status === 'Selesai Kalibrasi' ? 100 : (int(schIn.progressPercent, 0, 100) ?? 0),
        completedDate: status === 'Selesai Kalibrasi' ? (str(schIn.completedDate, 10) || nowIso.slice(0, 10)) : undefined,
        createdAt: nowIso.slice(0, 10),
        notes: str(schIn.notes, 1000) || `Ditambahkan manual dari SPH lama No. ${sphNumber} (masa transisi).`
      };
      delete scheduleData.updatedAt;
      delete scheduleData.baseUpdatedAt;

      // --- Nomor BO / FP / KWP mengikuti 3 angka depan NOMOR LABEL (bukan nomor SPH) ---
      const labelStart = str(schIn.labelStart, 20);
      const labelPrefix = /^\d{3}\.\d{4}$/.test(labelStart) ? labelStart.slice(0, 3) : null;
      if (labelPrefix) {
        const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        const tgl = new Date(`${sphData.date}T00:00:00`);
        const tglOk = isNaN(tgl.getTime()) ? new Date() : tgl;
        const akhiran = `${ROMAWI[tglOk.getMonth()]}-${tglOk.getFullYear()}`;
        const dealNumbers = {
          sequenceNumber: labelPrefix,
          boNumber: `${labelPrefix}/SMK-BO/${akhiran}`,
          fpNumber: `${labelPrefix}/SMK-FP/${akhiran}`,
          kwpNumber: `${labelPrefix}/SMK-KWP/${akhiran}`
        };
        const dealLama = sphIn.dealData && typeof sphIn.dealData === 'object' ? sphIn.dealData : {};
        sphData.dealData = {
          recipientName: '',
          paymentMethod: '',
          ...dealLama,
          ...dealNumbers,
          dealDate: /^\d{4}-\d{2}-\d{2}$/.test(String(dealLama.dealDate || '')) ? dealLama.dealDate : sphData.date,
          createdAt: nowIso
        };
        scheduleData.hospitalCode = labelPrefix;
        scheduleData.boNumber = dealNumbers.boNumber;
        scheduleData.fpNumber = dealNumbers.fpNumber;
        scheduleData.kwpNumber = dealNumbers.kwpNumber;
      }
      if (!Array.isArray(scheduleData.seliaItems)) delete scheduleData.seliaItems;

      // --- Simpan ---
      const { error: sphErr } = await supabaseAdmin.from('dokumen_sph').insert({
        id: sphId, data: sphData, created_at: nowIso, updated_at: nowIso, updated_by: actor
      });
      if (sphErr) {
        if ((sphErr as any).code === '23505') {
          return res.status(409).json({ error: `Nomor SPH ${sphNumber} sudah ada di sistem.` });
        }
        console.error('[sph-transisi] insert SPH error:', sphErr);
        return res.status(503).json({ error: "Gagal menyimpan SPH, data masih tersimpan di perangkat. Coba kirim ulang." });
      }

      const { error: schErr } = await supabaseAdmin.from('jadwal_kalibrasi').insert({
        id: scheduleId, data: scheduleData, created_at: nowIso, updated_at: nowIso, updated_by: actor
      });
      if (schErr) {
        console.error('[sph-transisi] insert jadwal error:', schErr);
        // Batalkan SPH agar bisa dikirim ulang tanpa dianggap ganda
        await supabaseAdmin.from('dokumen_sph')
          .update({ deleted_at: new Date().toISOString(), deleted_by: 'sistem: jadwal gagal disimpan' })
          .eq('id', sphId);
        return res.status(503).json({ error: "Gagal menyimpan jadwal, data masih tersimpan di perangkat. Coba kirim ulang." });
      }

      // --- Kamus nama alat (yang dikonfirmasi admin) ---
      const kamusIn: any[] = Array.isArray(body.kamus) ? body.kamus.slice(0, 500) : [];
      if (kamusIn.length > 0) {
        try {
          const rows = kamusIn
            .map(k => ({
              nama_di_sph: str(k?.namaAsli, 200),
              contoh_nama_asli: str(k?.namaAsli, 200),
              nomor_katalog: String(int(k?.nomorKatalog, 1, 9999) ?? ''),
              nama_katalog: str(k?.namaKatalog, 200),
              dikonfirmasi_oleh: actor
            }))
            .filter(k => k.nama_di_sph && k.nomor_katalog && k.nama_katalog);
          // nama_di_sph dinormalkan oleh trigger database; hindari duplikat dalam satu kiriman
          const unik = new Map<string, any>();
          rows.forEach(r => unik.set(r.nama_di_sph.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), r));
          for (const r of unik.values()) {
            const key = r.nama_di_sph.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            const { data: lama } = await supabaseAdmin.from('kamus_nama_alat').select('jumlah_dipakai').eq('nama_di_sph', key).maybeSingle();
            await supabaseAdmin.from('kamus_nama_alat').upsert(
              { ...r, nama_di_sph: key, jumlah_dipakai: (lama?.jumlah_dipakai || 0) + 1 },
              { onConflict: 'nama_di_sph' }
            );
          }
        } catch (kErr) {
          console.warn('[sph-transisi] kamus gagal disimpan (tidak fatal):', kErr);
        }
      }

      await logCollectionActivity(req, 'CREATE_SPH_TRANSISI', 'schedules', scheduleId, {
        sphId, sphNumber, hospitalName, file: pathFile, totalCocok, status, jumlahAlat: items.length, jumlahUnit: ringkasanBaca.jumlahUnit
      });

      const [{ data: sphRow }, { data: schRow }] = await Promise.all([
        supabaseAdmin.from('dokumen_sph').select('id, data, updated_at').eq('id', sphId).maybeSingle(),
        supabaseAdmin.from('jadwal_kalibrasi').select('id, data, updated_at').eq('id', scheduleId).maybeSingle()
      ]);

      const result = {
        success: true,
        sph: sphRow ? rowToItem(sphRow) : { ...sphData, updatedAt: nowIso },
        schedule: schRow ? rowToItem(schRow) : { ...scheduleData, updatedAt: nowIso }
      };
      if (idemKey) await saveIdempotencyRecord(idemKey, 200, result, req.user?.id);
      return res.json(result);
    } catch (err) {
      console.error('[sph-transisi] simpan:', err);
      return res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan SPH transisi" });
    }
  });

  // 4) Kamus nama alat
  app.get("/api/sph-transisi/kamus", requireAuth, requireRole([...ROLES_TULIS]), async (_req: AuthRequest, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('kamus_nama_alat')
        .select('nama_di_sph, nomor_katalog, nama_katalog, jumlah_dipakai')
        .order('jumlah_dipakai', { ascending: false })
        .limit(3000);
      if (error) return res.status(503).json({ error: "Kamus alat belum bisa dimuat" });
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ items: data || [] });
    } catch (err) {
      console.error('[sph-transisi] kamus:', err);
      return res.status(500).json({ error: "Terjadi kesalahan sistem saat memuat kamus alat" });
    }
  });

  // 5) Riwayat realisasi satu jadwal
  app.get("/api/sph-transisi/riwayat/:idJadwal", requireAuth, requireRole(['admin_utama', 'admin_teknik', 'admin_keuangan']), async (req: AuthRequest, res: Response) => {
    try {
      const idJadwal = str(req.params.idJadwal, 120);
      if (!idJadwal) return res.status(400).json({ error: "ID jadwal tidak valid" });
      const { data, error } = await supabaseAdmin
        .from('riwayat_realisasi')
        .select('jenis, nama_alat, qty_sph, qty_lama, qty_baru, diubah_oleh, waktu')
        .eq('id_jadwal', idJadwal)
        .order('waktu', { ascending: false })
        .limit(300);
      if (error) return res.status(503).json({ error: "Riwayat belum bisa dimuat" });
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ items: data || [] });
    } catch (err) {
      console.error('[sph-transisi] riwayat:', err);
      return res.status(500).json({ error: "Terjadi kesalahan sistem saat memuat riwayat" });
    }
  });
}
