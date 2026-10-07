import express from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuth, requireRole, OFFICIAL_ROLES } from "../middleware/auth.js";
import type { AuthRequest, UserRole } from "../middleware/auth.js";

export interface IdempotencyRecord {
  statusCode: number;
  body: any;
  expiresAt: number;
}

// In-memory idempotency store (fallback & short-term cache)
export const idempotencyStore = new Map<string, IdempotencyRecord>();

// Helper: ambil catatan idempotensi (Memory + Database public.api_idempotency)
async function getIdempotencyRecord(key: string): Promise<IdempotencyRecord | null> {
  // 1. Cek memory store terlebih dahulu
  const memoryCached = idempotencyStore.get(key);
  if (memoryCached && memoryCached.expiresAt > Date.now()) {
    return memoryCached;
  }

  // 2. Cek database tabel public.api_idempotency
  try {
    const { data, error } = await supabaseAdmin
      .from('api_idempotency')
      .select('status_code, response, expires_at')
      .eq('key', key)
      .maybeSingle();

    if (!error && data) {
      const exp = new Date(data.expires_at).getTime();
      if (exp > Date.now()) {
        const record: IdempotencyRecord = {
          statusCode: data.status_code || 200,
          body: data.response,
          expiresAt: exp
        };
        idempotencyStore.set(key, record);
        return record;
      }
    }
  } catch (_) {}

  return null;
}

// Helper: simpan catatan idempotensi (Memory + Database public.api_idempotency)
async function saveIdempotencyRecord(key: string, statusCode: number, body: any, userId?: string) {
  const expiresAtMs = Date.now() + 10 * 60 * 1000;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  // Simpan ke memory
  idempotencyStore.set(key, {
    statusCode,
    body,
    expiresAt: expiresAtMs
  });

  // Simpan ke database
  try {
    await supabaseAdmin
      .from('api_idempotency')
      .upsert({
        key,
        user_id: userId || null,
        status_code: statusCode,
        response: body,
        expires_at: expiresAtIso
      }, { onConflict: 'key' });
  } catch (err) {
    console.warn('[Idempotency DB Save Notice]:', err);
  }
}

/**
 * Helper function to fetch all rows with pagination (1000 rows/page)
 * to bypass Supabase's default 1000-row limit per request.
 */
async function fetchAllRows<T = any>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }> | any,
  pageSize: number = 1000
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }
    allRows.push(...data);
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return allRows;
}

async function logActivity(req: AuthRequest | any, action: string, description: string, details?: any) {
  try {
    await supabaseAdmin.from('activity_log').insert({
      user_id: req.user?.id || null,
      user_email: req.user?.email || null,
      user_role: req.userRole || null,
      action,
      table_name: 'labels',
      record_id: details?.noLabel || null,
      payload: {
        description,
        ...(details || {})
      },
      ip_address: req.ip || null,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[ActivityLog Warning] Gagal mencatat log:', err);
  }
}

/**
 * Simpan salinan lengkap label yang dihapus permanen ke activity_log,
 * supaya bisa dipulihkan bila terhapus tidak sengaja. Dipecah per 500 baris.
 */
async function logDeletedLabelRows(req: AuthRequest | any, action: string, description: string, rows: any[], extra?: any) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    await logActivity(req, action, description, { ...(extra || {}), count: 0, deletedRows: [] });
    return;
  }
  for (let i = 0; i < list.length; i += 500) {
    const part = list.slice(i, i + 500);
    await logActivity(req, action, description, {
      ...(extra || {}),
      noLabel: part.length === 1 ? part[0]?.no_label : undefined,
      count: list.length,
      bagian: `${Math.floor(i / 500) + 1}/${Math.ceil(list.length / 500)}`,
      deletedRows: part
    });
  }
}

// --- Validasi link sertifikat ---
// Hanya link https:// ke Google Drive / Google Docs / penyimpanan Supabase resmi yang boleh disimpan.
// Mencegah link berbahaya (misal "javascript:...") tersimpan lalu dijalankan di halaman scan QR.
const CERT_URL_ALLOWED_HOSTS = [
  'drive.google.com',
  'docs.google.com',
  'auzpctxhltcdzdhcaetb.supabase.co'
];

class InvalidCertUrlError extends Error {}

/**
 * Mengembalikan link yang sudah dibersihkan, null bila kosong,
 * atau melempar InvalidCertUrlError bila link tidak diizinkan.
 */
function sanitizeCertUrl(raw: any): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') throw new InvalidCertUrlError('Link sertifikat tidak valid');
  let url = raw.trim();
  if (!url) return null;
  // Link tempelan tanpa awalan (misal "drive.google.com/file/d/...") dilengkapi https://
  if (/^(drive|docs)\.google\.com\//i.test(url)) url = `https://${url}`;
  // http:// ke Google dinaikkan ke https://
  if (/^http:\/\/(drive|docs)\.google\.com\//i.test(url)) url = url.replace(/^http:/i, 'https:');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidCertUrlError('Link sertifikat tidak valid');
  }
  const host = parsed.hostname.toLowerCase();
  const hostOk = CERT_URL_ALLOWED_HOSTS.includes(host) || host.endsWith('.googleusercontent.com');
  if (parsed.protocol !== 'https:' || !hostOk || url.length > 2000) {
    throw new InvalidCertUrlError('Link sertifikat harus link Google Drive atau penyimpanan resmi');
  }
  return url;
}

/** Versi aman untuk ditampilkan: link yang tidak lolos dianggap tidak ada (tidak melempar error). */
function safeCertUrlOrNull(raw: any): string | null {
  try {
    return sanitizeCertUrl(raw);
  } catch {
    return null;
  }
}

/**
 * Creates and configures the Express application with all /api/* routes,
 * authentication middlewares, role validations, and security controls.
 * Suitable for both local dev server and Vercel serverless function runtime.
 */
export function createApp() {
  const app = express();

  // Trust reverse proxy (Vercel / Cloud Run / Nginx) for rate limiter and client IP resolution
  app.set("trust proxy", 1);

  // Global Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global Rate Limiting: 200 requests per 15 minutes per IP
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan dari IP ini, coba lagi dalam beberapa menit." },
    // Pembacaan sertifikat massal punya batas sendiri (lihat certificateReadLimiter)
    skip: (req) => req.path.startsWith('/drive-certificate/') || req.path.startsWith('/drive-folder/')
  });

  app.use("/api/", apiLimiter);

  // Batas khusus baca sertifikat dari Google Drive (tautkan massal 100+ sertifikat sekaligus)
  const certificateReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak sertifikat dibaca dalam waktu singkat. Tunggu beberapa menit lalu lanjutkan." }
  });

  // Dedicated Rate Limiting for Public QR Code Scan: 60 requests per minute per IP
  const publicScanLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan scan QR, silakan coba lagi dalam satu menit." }
  });

  // --- API: HEALTH CHECK ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), database: "supabase" });
  });

  // --- API: DEEP HEALTH CHECK (Protected: admin_utama only) ---
  app.get("/api/health/deep", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
      const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

      const checkTable = async (tableName: string) => {
        try {
          const { error } = await supabaseAdmin.from(tableName).select('count', { count: 'exact', head: true });
          if (error) {
            return { ok: false, error: error.message || error.code || "Query error" };
          }
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e?.message || "Connection error" };
        }
      };

      const [collectionsCheck, settingsCheck, activityLogCheck, idempotencyCheck, foldersCheck] = await Promise.all([
        checkTable('jadwal_kalibrasi'),
        checkTable('settings'),
        checkTable('activity_log'),
        checkTable('api_idempotency'),
        checkTable('folder_label')
      ]);

      const allOk = hasSupabaseUrl && hasServiceRoleKey && 
        collectionsCheck.ok && settingsCheck.ok && activityLogCheck.ok && idempotencyCheck.ok && foldersCheck.ok;

      res.status(allOk ? 200 : 503).json({
        ok: allOk,
        timestamp: new Date().toISOString(),
        environment: {
          hasSupabaseUrl,
          hasServiceRoleKey
        },
        tables: {
          jadwal_kalibrasi: collectionsCheck,
          folder_label: foldersCheck,
          settings: settingsCheck,
          activity_log: activityLogCheck,
          api_idempotency: idempotencyCheck
        }
      });
    } catch (err: any) {
      console.error("Deep health check error:", err);
      res.status(500).json({ ok: false, error: "Gagal menjalankan deep health check" });
    }
  });

  // --- API: PUBLIC SCAN LOOKUP (For hospital staff scanning QR code on equipment stickers) ---
  app.get("/api/labels/:noLabel", publicScanLimiter, async (req, res, next) => {
    try {
      const { noLabel } = req.params;
      // "/api/labels/summary" adalah endpoint admin (didaftarkan di bawah), bukan nomor label
      if (noLabel === 'summary') return next();
      // Kode verifikasi dari QR stiker (?k=XXXXXX). Wajib untuk label baru (qr_secured).
      const providedCode = String(req.query.k || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

      // Tolak noLabel yang diawali "__" (baris metadata/koleksi) -> 404
      if (!noLabel || noLabel.startsWith('__')) {
        return res.status(404).json({ error: "Label tidak ditemukan" });
      }

      // Validasi format noLabel dengan regex ^[A-Za-z0-9.\-_/]{1,64}$
      const labelFormatRegex = /^[A-Za-z0-9.\-_/]{1,64}$/;
      if (!labelFormatRegex.test(noLabel)) {
        return res.status(404).json({ error: "Format nomor label tidak valid" });
      }

      const { data, error } = await supabaseAdmin
        .from('labels')
        .select('*')
        .eq('no_label', noLabel)
        .maybeSingle();

      if (error) {
        console.error("Database error in GET /api/labels/:noLabel:", error);
        return res.status(500).json({ error: "Gagal mengambil data label" });
      }

      if (!data) {
        return res.status(404).json({ error: "Label tidak ditemukan" });
      }

      // Anti tebak nomor (IDOR): label baru hanya bisa dibuka dengan kode yang benar.
      // Jawaban sengaja sama persis dengan "tidak ditemukan" agar tidak membocorkan
      // bahwa nomor tersebut ada.
      const storedCode = String(data.verify_code || '').toUpperCase();
      const codeMatches = Boolean(storedCode) && providedCode === storedCode;
      if (data.qr_secured === true && !codeMatches) {
        return res.status(404).json({ error: "Label tidak ditemukan" });
      }

      // Helper: URL sertifikat publik (pdfUrl/pdfDriveUrl) HANYA jika bukan path internal-documents
      const isInternalDoc = (url: string | null | undefined): boolean => {
        if (!url || typeof url !== 'string') return false;
        const lower = url.toLowerCase();
        return (
          lower.includes('internal-documents') ||
          lower.startsWith('sph/') ||
          lower.startsWith('spk/') ||
          lower.startsWith('bap/') ||
          lower.startsWith('financial/') ||
          lower.startsWith('invoices/') ||
          lower.startsWith('contracts/')
        );
      };

      const isVoid = data.status === 'Void / Rusak';
      // Label void: sertifikat tidak ditampilkan
      const safePdfUrl = !isVoid && !isInternalDoc(data.pdf_url) ? safeCertUrlOrNull(data.pdf_url) : null;
      const safePdfDriveUrl = !isVoid && !isInternalDoc(data.pdf_drive_url) ? safeCertUrlOrNull(data.pdf_drive_url) : null;

      // Kembalikan HANYA field aman (jangan kirim pdfOriginalUrl atau metadata sensitif)
      res.json({
        noLabel: data.no_label,
        namaRs: data.nama_rs || null,
        namaAlat: data.nama_alat || data.namaAlat || data.pdf_name || null,
        ruangan: data.ruangan || null,
        status: data.status || 'Menunggu Sertifikat',
        calibratedAt: data.calibrated_at || null,
        validUntil: data.valid_until || null,
        pdfUrl: safePdfUrl,
        pdfDriveUrl: safePdfDriveUrl,
        isVoid,
        voidReason: isVoid ? (data.void_reason || null) : null,
        // Kode hanya dikembalikan bila pemindai sudah membawa kode yang benar (untuk tautan "salin")
        verifyCode: codeMatches ? storedCode : null
      });
    } catch (err: any) {
      console.error("API error in GET /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Gagal memproses permintaan label" });
    }
  });

  // --- API: CURRENT AUTH USER PROFILE ---
  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const role = req.userRole;
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      res.json({
        id: user.id,
        email: user.email,
        role,
        fullName: profile?.full_name || user.email?.split('@')[0] || 'Pengguna PT SMK',
        avatarUrl: profile?.avatar_url || null
      });
    } catch (err: any) {
      console.error("API error in GET /api/auth/me:", err);
      res.status(500).json({ error: "Gagal memuat profil pengguna" });
    }
  });

  // --- API: ADMIN LABELS (Protected by requireAuth with Pagination for ALL labels) ---
  app.get("/api/labels", requireAuth, async (req: AuthRequest, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const data = await fetchAllRows((from, to) =>
        supabaseAdmin
          .from('labels')
          .select('no_label, nama_rs, nama_alat, ruangan, status, pdf_source, pdf_url, pdf_drive_url, pdforiginal_url, pdf_name, calibrated_at, valid_until, verify_code, qr_secured, void_reason, voided_at, created_at, updated_at')
          .order('no_label', { ascending: true })
          .range(from, to)
      );

      const formatted = (data || []).map((it: any) => ({
        noLabel: it.no_label,
        namaRs: it.nama_rs || null,
        namaAlat: it.nama_alat || it.pdf_name || null,
        ruangan: it.ruangan || null,
        status: it.status,
        pdfSource: it.pdf_source,
        pdfUrl: it.pdf_url,
        pdfDriveUrl: it.pdf_drive_url,
        pdfOriginalUrl: it.pdforiginal_url,
        pdfName: it.pdf_name,
        calibratedAt: it.calibrated_at,
        validUntil: it.valid_until,
        verifyCode: it.verify_code || null,
        qrSecured: it.qr_secured === true,
        voidReason: it.void_reason || null,
        voidedAt: it.voided_at || null,
        createdAt: it.created_at,
        updatedAt: it.updated_at
      }));

      res.json(formatted);
    } catch (err: any) {
      console.error("API error in GET /api/labels:", err);
      res.status(500).json({ error: "Gagal mengambil seluruh data label dari database" });
    }
  });

  // Helper function to broadcast label updates across all connected clients
  async function broadcastLabelsChanged() {
    try {
      const channel = supabaseAdmin.channel('labels_broadcast_server');
      await channel.send({
        type: 'broadcast',
        event: 'labels_changed',
        payload: { timestamp: Date.now() }
      });
    } catch (e) {
      console.warn('[Server Broadcast] Gagal mengirim broadcast labels_changed:', e);
    }
  }

  // Folder label (prefix 3 digit) + nama Rumah Sakit disimpan di tabel folder_label
  function getLabelPrefix(noLabel: string): string {
    const clean = String(noLabel || '').trim();
    const dotIdx = clean.indexOf('.');
    return dotIdx > 0 ? clean.substring(0, dotIdx) : (clean.length >= 3 ? clean.substring(0, 3) : clean);
  }

  async function saveFolderName(prefix: string, namaRs: string | null): Promise<{ error?: any }> {
    if (!prefix || !/^[A-Za-z0-9_-]{1,10}$/.test(prefix)) return { error: new Error('Format prefix folder tidak valid') };
    const { error } = await supabaseAdmin
      .from('folder_label')
      .upsert({ prefix, nama_rs: namaRs, updated_at: new Date().toISOString() }, { onConflict: 'prefix' });
    return { error };
  }

  async function ensureFolders(prefixes: string[]): Promise<void> {
    const valid = Array.from(new Set(prefixes)).filter(p => /^[A-Za-z0-9_-]{1,10}$/.test(p));
    if (valid.length === 0) return;
    await supabaseAdmin
      .from('folder_label')
      .upsert(valid.map(prefix => ({ prefix })), { onConflict: 'prefix', ignoreDuplicates: true });
  }

  async function fetchFolderNameMap(): Promise<Record<string, string>> {
    const { data, error } = await supabaseAdmin.from('folder_label').select('prefix, nama_rs');
    if (error) throw error;
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.prefix && r.nama_rs) map[r.prefix] = r.nama_rs; });
    return map;
  }

  /**
   * Helper to safely upsert labels to Supabase using supabaseAdmin.
   * Writes exclusively to valid database columns (pdforiginal_url, etc).
   */
  async function upsertLabelsAdmin(items: any[]): Promise<{ success: boolean; count: number; error?: any }> {
    if (!items || items.length === 0) return { success: true, count: 0 };

    const BATCH_SIZE = 200;
    let totalSaved = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE).map(it => {
        const copy = { ...it };
        const origVal = copy.pdforiginal_url || copy.pdf_original_url || copy.pdfOriginalUrl || null;
        if (origVal) {
          copy.pdforiginal_url = origVal;
        }
        delete copy.pdf_original_url;
        delete copy.pdfOriginalUrl;
        return copy;
      });

      const { error } = await supabaseAdmin
        .from('labels')
        .upsert(chunk, { onConflict: 'no_label' });

      if (error) {
        console.error("upsertLabelsAdmin error:", error);
        return { success: false, count: totalSaved, error };
      }

      totalSaved += chunk.length;
    }

    return { success: true, count: totalSaved };
  }

  // --- API: ADMIN LABELS SUMMARY (Protected by requireAuth, calculated across ALL labels) ---
  app.get("/api/labels/summary", requireAuth, async (req: AuthRequest, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const [allLabels, folderRsMap] = await Promise.all([
        fetchAllRows((from, to) =>
          supabaseAdmin
            .from('labels')
            .select('no_label, nama_rs')
            .order('no_label', { ascending: true })
            .range(from, to)
        ),
        fetchFolderNameMap()
      ]);

      const prefixMap: Record<string, {
        prefix: string;
        count: number;
        maxNum: number;
        maxLabel: string;
        nextNum: number;
        nextLabel: string;
        namaRs: string | null;
      }> = {};

      let totalLabels = 0;

      (allLabels || []).forEach((row: any) => {
        const no = row.no_label;
        if (!no || no.startsWith('__meta_') || no.startsWith('__aset_') || no.startsWith('__item_') || no.startsWith('__tombstone_')) {
          return;
        }

        totalLabels++;

        const dotIdx = no.indexOf('.');
        const prefix = dotIdx > 0 ? no.substring(0, dotIdx) : (no.length >= 3 ? no.substring(0, 3) : no);
        const suffix = dotIdx > 0 ? no.substring(dotIdx + 1) : no;
        const num = parseInt(suffix, 10);
        const validNum = isNaN(num) ? 0 : num;

        if (!prefixMap[prefix]) {
          prefixMap[prefix] = {
            prefix,
            count: 0,
            maxNum: 0,
            maxLabel: no,
            nextNum: 1,
            nextLabel: `${prefix}.0001`,
            namaRs: folderRsMap[prefix] || row.nama_rs || null
          };
        }

        const entry = prefixMap[prefix];
        entry.count++;
        if (row.nama_rs && !entry.namaRs) {
          entry.namaRs = row.nama_rs;
        }
        if (validNum >= entry.maxNum) {
          entry.maxNum = validNum;
          entry.maxLabel = no;
          entry.nextNum = validNum + 1;
          entry.nextLabel = `${prefix}.${String(validNum + 1).padStart(4, '0')}`;
        }
      });

      const folders = Object.values(prefixMap).sort((a, b) => a.prefix.localeCompare(b.prefix, undefined, { numeric: true }));

      res.json({
        total: totalLabels,
        folders,
        prefixMap
      });
    } catch (err: any) {
      console.error("API error in GET /api/labels/summary:", err);
      res.status(500).json({ error: "Gagal memuat ringkasan label dari database" });
    }
  });

  // --- API: ADMIN LABELS (Protected by requireAuth and Role) ---
  app.post("/api/labels", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const {
        noLabel,
        namaRs,
        namaAlat,
        ruangan,
        status,
        pdfSource,
        pdfName,
        calibratedAt,
        validUntil,
        clearCertificate
      } = req.body;

      if (!noLabel || typeof noLabel !== 'string' || !/^[A-Za-z0-9.\-_/]{1,64}$/.test(noLabel) || noLabel.startsWith('__')) {
        return res.status(400).json({ error: "Nomor label wajib diisi dengan format yang benar" });
      }

      // Validasi link sertifikat (hanya https Google Drive / penyimpanan resmi)
      let pdfUrl: string | null;
      let pdfDriveUrl: string | null;
      let pdfOriginalUrl: string | null;
      try {
        pdfUrl = sanitizeCertUrl(req.body.pdfUrl);
        pdfDriveUrl = sanitizeCertUrl(req.body.pdfDriveUrl);
        pdfOriginalUrl = sanitizeCertUrl(req.body.pdfOriginalUrl);
      } catch (e: any) {
        if (e instanceof InvalidCertUrlError) {
          return res.status(400).json({ error: e.message });
        }
        throw e;
      }

      // 1. Cek record lama untuk proteksi sertifikat
      const { data: oldData } = await supabaseAdmin
        .from('labels')
        .select('*')
        .eq('no_label', noLabel)
        .maybeSingle();

      const isClearCertRequested = clearCertificate === true;

      if (isClearCertRequested) {
        if (req.userRole !== 'admin_utama' && req.userRole !== 'admin_teknik') {
          return res.status(403).json({ error: "Hanya Admin Utama dan Admin Teknik yang berhak mengosongkan sertifikat label" });
        }
        await logActivity(req, 'CLEAR_CERTIFICATE', `Sertifikat label ${noLabel} dikosongkan oleh ${req.user?.email || req.userRole}`, {
          noLabel,
          oldPdfUrl: oldData?.pdf_url || null,
          oldPdfDriveUrl: oldData?.pdf_drive_url || null,
          oldPdfOriginalUrl: oldData?.pdforiginal_url || oldData?.pdf_original_url || null,
          oldPdfName: oldData?.pdf_name || null,
          oldStatus: oldData?.status || null,
          clearedBy: req.user?.email || req.user?.id || 'admin',
          clearedByRole: req.userRole
        });
      }

      const payload: any = {
        no_label: noLabel,
        nama_rs: namaRs !== undefined ? (namaRs || null) : (oldData?.nama_rs ?? null),
        nama_alat: namaAlat !== undefined ? (namaAlat || null) : (pdfName || oldData?.nama_alat || oldData?.pdf_name || null),
        ruangan: ruangan !== undefined ? (ruangan || null) : (oldData?.ruangan ?? null),
        status: status || (oldData?.status ?? 'Menunggu Sertifikat'),
        pdf_source: pdfSource || (oldData?.pdf_source ?? null),
        pdf_url: pdfUrl || (oldData?.pdf_url ?? null),
        pdf_drive_url: pdfDriveUrl || (oldData?.pdf_drive_url ?? null),
        pdforiginal_url: pdfOriginalUrl || (oldData?.pdforiginal_url ?? oldData?.pdf_original_url ?? null),
        pdf_name: pdfName || (oldData?.pdf_name ?? null),
        calibrated_at: calibratedAt !== undefined ? (calibratedAt || null) : (oldData?.calibrated_at ?? null),
        valid_until: validUntil !== undefined ? (validUntil || null) : (oldData?.valid_until ?? null),
        // Label baru wajib kode QR; label lama mempertahankan pengaturannya
        qr_secured: oldData ? (oldData.qr_secured === true) : true,
        updated_at: new Date().toISOString()
      };

      // 1) Saat clearCertificate === true:
      // Paksa nilai berikut di payload SETELAH payload dibuat:
      // pdf_url = null, pdf_drive_url = null, pdforiginal_url = null, pdf_name = null, pdf_source = null, status = 'Menunggu Sertifikat'
      if (isClearCertRequested) {
        payload.pdf_url = null;
        payload.pdf_drive_url = null;
        payload.pdforiginal_url = null;
        payload.pdf_name = null;
        payload.pdf_source = null;
        payload.status = 'Menunggu Sertifikat';
      } else if (oldData) {
        // Jika sertifikat TIDAK diminta dikosongkan, proteksi field sertifikat lama agar tidak terhapus jika incoming kosong
        if (oldData.pdf_url && !pdfUrl) payload.pdf_url = oldData.pdf_url;
        if (oldData.pdf_drive_url && !pdfDriveUrl) payload.pdf_drive_url = oldData.pdf_drive_url;
        if ((oldData.pdforiginal_url || oldData.pdf_original_url) && !pdfOriginalUrl) {
          payload.pdforiginal_url = oldData.pdforiginal_url || oldData.pdf_original_url;
        }
        if (oldData.pdf_name && !pdfName) payload.pdf_name = oldData.pdf_name;
        if (oldData.pdf_source && !pdfSource) payload.pdf_source = oldData.pdf_source;
        if (oldData.calibrated_at && !calibratedAt) payload.calibrated_at = oldData.calibrated_at;
        if (oldData.valid_until && !validUntil) payload.valid_until = oldData.valid_until;
        if (oldData.status === 'Sertifikat Tertaut' && (!status || status === 'Menunggu Sertifikat')) {
          payload.status = 'Sertifikat Tertaut';
        }
        // Label void tetap void kecuali admin membatalkannya lewat tombol "Batalkan Void"
        if (oldData.status === 'Void / Rusak' && (!status || status === 'Menunggu Sertifikat')) {
          payload.status = 'Void / Rusak';
        }
      }

      // Simpan nama RS folder (tabel folder_label) bila diisi
      if (namaRs && typeof namaRs === 'string' && namaRs.trim()) {
        try { await saveFolderName(getLabelPrefix(noLabel), namaRs.trim()); } catch (_) {}
      } else {
        try { await ensureFolders([getLabelPrefix(noLabel)]); } catch (_) {}
      }

      const result = await upsertLabelsAdmin([payload]);

      if (!result.success) {
        console.error("Supabase label upsert error:", result.error);
        return res.status(500).json({ error: "Gagal menyimpan label ke sistem database" });
      }

      await broadcastLabelsChanged();
      res.json({ success: true, label: payload });
    } catch (err: any) {
      console.error("API error in POST /api/labels:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan label" });
    }
  });

  app.post("/api/labels/bulk", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { items, mode } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.json({ success: true, count: 0, created: [], skippedExisting: [] });
      }

      const isUpdateMode = mode === 'update' && (req.userRole === 'admin_utama' || req.userRole === 'admin_teknik');

      const validItems = items.filter((it: any) => {
        const no = it && (it.noLabel || it.no_label || it.id);
        return typeof no === 'string' && /^[A-Za-z0-9.\-_/]{1,64}$/.test(no) && !no.startsWith('__');
      });

      // Validasi link sertifikat di setiap item sebelum menyimpan apa pun
      try {
        for (const it of validItems) {
          it.pdfUrl = sanitizeCertUrl(it.pdfUrl || it.pdf_url || null);
          it.pdfDriveUrl = sanitizeCertUrl(it.pdfDriveUrl || it.pdf_drive_url || null);
          it.pdfOriginalUrl = sanitizeCertUrl(it.pdfOriginalUrl || it.pdforiginal_url || null);
          delete it.pdf_url;
          delete it.pdf_drive_url;
          delete it.pdforiginal_url;
        }
      } catch (e: any) {
        if (e instanceof InvalidCertUrlError) {
          return res.status(400).json({ error: e.message });
        }
        throw e;
      }

      const incomingRecords = validItems
        .map((it: any) => ({
          no_label: it.noLabel || it.no_label || it.id,
          nama_rs: it.namaRs || it.nama_rs || null,
          nama_alat: it.namaAlat || it.nama_alat || it.pdfName || it.pdf_name || null,
          ruangan: it.ruangan || null,
          status: it.status || 'Menunggu Sertifikat',
          pdf_source: it.pdf_source || null,
          pdf_url: it.pdfUrl || it.pdf_url || null,
          pdf_drive_url: it.pdfDriveUrl || it.pdf_drive_url || null,
          pdforiginal_url: it.pdfOriginalUrl || it.pdforiginal_url || null,
          pdf_name: it.pdfName || it.pdf_name || null,
          calibrated_at: it.calibratedAt || it.calibrated_at || null,
          valid_until: it.validUntil || it.valid_until || null,
          updated_at: new Date().toISOString()
        }));

      // 1. Cek nomor yang sudah ada di database per batch 500 (Gagal-Aman)
      const allNos = incomingRecords.map(r => r.no_label);
      const existingMap = new Map<string, any>();
      const CHUNK_SIZE = 500;

      for (let i = 0; i < allNos.length; i += CHUNK_SIZE) {
        const chunk = allNos.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabaseAdmin
          .from('labels')
          .select('*')
          .in('no_label', chunk);
        if (error) {
          console.error("[Bulk Check Error] Gagal memeriksa nomor label yang sudah ada:", error);
          return res.status(503).json({ error: "Gagal memeriksa nomor label yang sudah ada, coba lagi" });
        }
        if (data) {
          data.forEach(d => existingMap.set(d.no_label, d));
        }
      }

      let recordsToSave: any[] = [];
      let created: string[] = [];
      let skippedExisting: string[] = [];

      if (isUpdateMode) {
        // Mode update: boleh upsert tapi field sertifikat lama TIDAK boleh tertimpa jadi null
        recordsToSave = incomingRecords.map(rec => {
          const oldItem = existingMap.get(rec.no_label);
          if (oldItem) {
            return {
              ...rec,
              nama_rs: rec.nama_rs || oldItem.nama_rs || null,
              nama_alat: rec.nama_alat || oldItem.nama_alat || oldItem.pdf_name || null,
              ruangan: rec.ruangan || oldItem.ruangan || null,
              // Status lama "Sertifikat Tertaut" / "Void / Rusak" tidak tertimpa status bawaan "Menunggu Sertifikat"
              status: ((oldItem.status === 'Sertifikat Tertaut' || oldItem.status === 'Void / Rusak') && (!rec.status || rec.status === 'Menunggu Sertifikat')) ? oldItem.status : (rec.status || oldItem.status),
              pdf_source: rec.pdf_source || oldItem.pdf_source || null,
              pdf_url: rec.pdf_url || oldItem.pdf_url || null,
              pdf_drive_url: rec.pdf_drive_url || oldItem.pdf_drive_url || null,
              pdforiginal_url: rec.pdforiginal_url || oldItem.pdforiginal_url || oldItem.pdf_original_url || null,
              pdf_name: rec.pdf_name || oldItem.pdf_name || null,
              calibrated_at: rec.calibrated_at || oldItem.calibrated_at || null,
              valid_until: rec.valid_until || oldItem.valid_until || null,
              qr_secured: oldItem.qr_secured === true
            };
          }
          return { ...rec, qr_secured: true };
        });
        created = recordsToSave.map(r => r.no_label);
      } else {
        // Mode default: HANYA TAMBAH BARU (nomor yang sudah ada dilewati)
        recordsToSave = incomingRecords
          .filter(r => !existingMap.has(r.no_label))
          .map(r => ({ ...r, qr_secured: true }));
        created = recordsToSave.map(r => r.no_label);
        skippedExisting = incomingRecords.filter(r => existingMap.has(r.no_label)).map(r => r.no_label);
      }

      // Extract unique folder RS names if any and save to metadata
      const folderRsMap: Record<string, string> = {};
      items.forEach((it: any) => {
        const no = it.noLabel || it.no_label || it.id;
        const rs = it.namaRs || it.nama_rs;
        if (no && rs && typeof rs === 'string' && rs.trim()) {
          const dotIdx = no.indexOf('.');
          const prefix = dotIdx > 0 ? no.substring(0, dotIdx) : (no.length >= 3 ? no.substring(0, 3) : no);
          folderRsMap[prefix] = rs.trim();
        }
      });

      try {
        await ensureFolders(incomingRecords.map(r => getLabelPrefix(r.no_label)));
      } catch (_) {}
      for (const [prefix, rsName] of Object.entries(folderRsMap)) {
        try { await saveFolderName(prefix, rsName); } catch (_) {}
      }

      if (recordsToSave.length > 0) {
        const result = await upsertLabelsAdmin(recordsToSave);

        if (!result.success) {
          console.error("Supabase bulk label upsert error:", result.error);
          return res.status(500).json({ error: "Gagal menyimpan label baru ke database" });
        }
      }

      // Ambil kode verifikasi QR untuk semua nomor (baru maupun yang sudah ada)
      // agar PDF stiker berisi QR dengan kode yang sama persis dengan database.
      const codes: Record<string, string> = {};
      for (let i = 0; i < allNos.length; i += CHUNK_SIZE) {
        const chunk = allNos.slice(i, i + CHUNK_SIZE);
        const { data: codeRows, error: codeErr } = await supabaseAdmin
          .from('labels')
          .select('no_label, verify_code')
          .in('no_label', chunk);
        if (codeErr) {
          console.error("[Bulk] Gagal mengambil kode verifikasi label:", codeErr);
          return res.status(500).json({ error: "Label tersimpan, tetapi kode QR gagal diambil. Muat ulang lalu coba lagi." });
        }
        (codeRows || []).forEach((r: any) => { if (r.verify_code) codes[r.no_label] = r.verify_code; });
      }

      if (recordsToSave.length > 0) {
        const sortedNos = recordsToSave.map(r => r.no_label).sort();
        const prefixes = Array.from(new Set(sortedNos.map(n => getLabelPrefix(n))));
        await logActivity(
          req,
          isUpdateMode ? 'UPDATE_LABELS' : 'CREATE_LABELS',
          `${recordsToSave.length} label ${isUpdateMode ? 'diperbarui' : 'dibuat'} (${sortedNos[0]} s/d ${sortedNos[sortedNos.length - 1]})`,
          {
            count: recordsToSave.length,
            nomorPertama: sortedNos[0],
            nomorTerakhir: sortedNos[sortedNos.length - 1],
            prefix: prefixes,
            dilewatiKarenaSudahAda: skippedExisting.length
          }
        );
      }

      await broadcastLabelsChanged();
      res.json({
        success: true,
        count: recordsToSave.length,
        created,
        skippedExisting,
        codes
      });
    } catch (err: any) {
      console.error("API error in POST /api/labels/bulk:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan label secara massal" });
    }
  });

  // --- API: AMBIL PDF SERTIFIKAT DARI GOOGLE DRIVE (untuk isi otomatis Nama Alat, Ruangan, Tanggal) ---
  // Browser tidak bisa mengunduh langsung dari Google Drive (diblokir CORS), jadi server
  // mengambilkan file-nya. Hanya ke drive.google.com dengan ID file yang tervalidasi.
  app.get("/api/drive-certificate/:fileId", certificateReadLimiter, requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    const MAX_BYTES = 4 * 1024 * 1024; // batas respons serverless ±4,5 MB
    try {
      const fileId = String(req.params.fileId || '');
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(fileId)) {
        return res.status(400).json({ error: "ID file Google Drive tidak valid" });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      let driveRes: Response;
      try {
        driveRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
          redirect: 'follow',
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }

      // Pastikan redirect hanya berakhir di domain Google
      const finalHost = (() => { try { return new URL(driveRes.url).hostname; } catch { return ''; } })();
      if (!/(^|\.)google(usercontent)?\.com$/.test(finalHost)) {
        return res.status(502).json({ error: "Respons Google Drive tidak dikenali" });
      }
      if (!driveRes.ok) {
        return res.status(422).json({ error: "File tidak bisa diambil. Pastikan akses file diatur 'Siapa saja yang memiliki link'." });
      }

      const declared = Number(driveRes.headers.get('content-length') || 0);
      if (declared > MAX_BYTES) {
        return res.status(413).json({ error: "PDF sertifikat terlalu besar untuk dibaca otomatis (maks 4 MB). Isi data secara manual." });
      }

      const buf = Buffer.from(await driveRes.arrayBuffer());
      if (buf.length > MAX_BYTES) {
        return res.status(413).json({ error: "PDF sertifikat terlalu besar untuk dibaca otomatis (maks 4 MB). Isi data secara manual." });
      }
      if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
        // Biasanya halaman login Google = file belum dibagikan publik
        return res.status(422).json({ error: "File bukan PDF atau belum dibagikan. Atur akses Google Drive ke 'Siapa saja yang memiliki link' lalu coba lagi." });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(buf);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return res.status(504).json({ error: "Google Drive terlalu lama merespons. Coba lagi, atau isi data secara manual." });
      }
      console.error("API error in GET /api/drive-certificate/:fileId:", err);
      res.status(500).json({ error: "Gagal mengambil PDF sertifikat dari Google Drive" });
    }
  });

  // --- API: DAFTAR FILE PDF DI FOLDER GOOGLE DRIVE (untuk tautkan sertifikat massal) ---
  // Butuh env GOOGLE_DRIVE_API_KEY (Google Cloud > Drive API > API key). Folder harus
  // dibagikan "Siapa saja yang memiliki link".
  app.get("/api/drive-folder/:folderId", certificateReadLimiter, requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const folderId = String(req.params.folderId || '');
      if (!/^[A-Za-z0-9_-]{10,100}$/.test(folderId)) {
        return res.status(400).json({ error: "ID folder Google Drive tidak valid" });
      }
      const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
      if (!apiKey) {
        return res.status(501).json({
          code: 'NO_API_KEY',
          error: "API key Google Drive belum diatur di server (GOOGLE_DRIVE_API_KEY). Sementara ini, tempel daftar link file sertifikat."
        });
      }

      const files: { id: string; name: string; size: number; modifiedTime: string }[] = [];
      let pageToken = '';
      for (let page = 0; page < 10; page++) { // maks 10 x 1000 file
        const params = new URLSearchParams({
          q: `'${folderId}' in parents and trashed = false and mimeType = 'application/pdf'`,
          fields: 'nextPageToken, files(id, name, size, modifiedTime)',
          pageSize: '1000',
          orderBy: 'name',
          supportsAllDrives: 'true',
          includeItemsFromAllDrives: 'true',
          key: apiKey
        });
        if (pageToken) params.set('pageToken', pageToken);
        const r = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
        const body: any = await r.json().catch(() => ({}));
        if (!r.ok) {
          const reason = String(body?.error?.errors?.[0]?.reason || body?.error?.status || '');
          const googleMsg = String(body?.error?.message || '').slice(0, 300);
          console.error("[Drive Folder] Google API error:", r.status, reason, googleMsg);
          let hint = '';
          if (r.status === 404) {
            hint = "Folder tidak ditemukan atau belum dibagikan 'Siapa saja yang memiliki link'.";
          } else if (/keyInvalid|API_KEY_INVALID|API key not valid/i.test(reason + googleMsg)) {
            hint = "API key tidak valid. Periksa nilai GOOGLE_DRIVE_API_KEY di Vercel (tanpa spasi), lalu Redeploy.";
          } else if (/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(reason + googleMsg)) {
            hint = "Google Drive API belum aktif di project Google Cloud pemilik API key ini. Aktifkan (Enable), tunggu 2-5 menit, lalu coba lagi.";
          } else if (/API_KEY_SERVICE_BLOCKED|referer|blocked/i.test(reason + googleMsg)) {
            hint = "API key dibatasi. Pastikan 'Application restrictions' = None dan 'API restrictions' mencantumkan Google Drive API.";
          } else if (r.status === 403) {
            hint = "Akses folder ditolak Google. Pastikan folder dibagikan publik dan Drive API sudah aktif untuk API key ini.";
          } else {
            hint = "Gagal membaca isi folder Google Drive.";
          }
          return res.status(r.status === 404 ? 404 : 502).json({
            error: `${hint} [Google ${r.status}${reason ? ` ${reason}` : ''}${googleMsg ? `: ${googleMsg}` : ''}]`
          });
        }
        (body.files || []).forEach((f: any) => files.push({
          id: f.id,
          name: f.name,
          size: Number(f.size) || 0,
          modifiedTime: f.modifiedTime || ''
        }));
        pageToken = body.nextPageToken || '';
        if (!pageToken) break;
      }

      res.json({ files });
    } catch (err: any) {
      console.error("API error in GET /api/drive-folder/:folderId:", err);
      res.status(500).json({ error: "Gagal membaca isi folder Google Drive" });
    }
  });

  // --- API: TANDAI STIKER VOID / RUSAK (nomor tetap tercatat untuk audit) ---
  app.post("/api/labels/:noLabel/void", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { noLabel } = req.params;
      const reason = String(req.body?.reason || '').trim().slice(0, 200);
      if (!noLabel || noLabel.startsWith('__')) {
        return res.status(404).json({ error: "Label tidak ditemukan" });
      }
      if (!reason) {
        return res.status(400).json({ error: "Alasan void wajib diisi (misal: stiker rusak saat cetak, hilang, salah tempel)" });
      }

      const { data: oldData, error: findErr } = await supabaseAdmin
        .from('labels').select('no_label, status').eq('no_label', noLabel).maybeSingle();
      if (findErr) return res.status(500).json({ error: "Gagal memeriksa label" });
      if (!oldData) return res.status(404).json({ error: "Label tidak ditemukan" });

      const { error } = await supabaseAdmin
        .from('labels')
        .update({ status: 'Void / Rusak', void_reason: reason, voided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('no_label', noLabel);
      if (error) return res.status(500).json({ error: "Gagal menandai label void" });

      await logActivity(req, 'VOID_LABEL', `Label ${noLabel} ditandai Void / Rusak: ${reason}`, { noLabel, reason, oldStatus: oldData.status });
      await broadcastLabelsChanged();
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in POST /api/labels/:noLabel/void:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menandai label void" });
    }
  });

  app.post("/api/labels/:noLabel/unvoid", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { noLabel } = req.params;
      const { data: oldData, error: findErr } = await supabaseAdmin
        .from('labels').select('*').eq('no_label', noLabel).maybeSingle();
      if (findErr) return res.status(500).json({ error: "Gagal memeriksa label" });
      if (!oldData || noLabel.startsWith('__')) return res.status(404).json({ error: "Label tidak ditemukan" });

      const hasCert = Boolean(oldData.pdf_url || oldData.pdf_drive_url);
      const { error } = await supabaseAdmin
        .from('labels')
        .update({
          status: hasCert ? 'Sertifikat Tertaut' : 'Menunggu Sertifikat',
          void_reason: null,
          voided_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('no_label', noLabel);
      if (error) return res.status(500).json({ error: "Gagal membatalkan status void" });

      await logActivity(req, 'UNVOID_LABEL', `Status void label ${noLabel} dibatalkan`, { noLabel, oldReason: oldData.void_reason });
      await broadcastLabelsChanged();
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in POST /api/labels/:noLabel/unvoid:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat membatalkan status void" });
    }
  });

  // Hapus PERMANEN hanya Admin Utama. Admin Teknik memakai fitur "Void" untuk stiker rusak/salah.
  app.delete("/api/labels/:noLabel", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const { noLabel } = req.params;
      if (!noLabel || noLabel.startsWith('__')) {
        return res.status(404).json({ error: "Label tidak ditemukan" });
      }
      const { data: deletedRows, error } = await supabaseAdmin
        .from('labels')
        .delete()
        .eq('no_label', noLabel)
        .select('*');

      if (error) {
        console.error("Supabase delete label error:", error);
        return res.status(500).json({ error: "Gagal menghapus label dari database" });
      }
      await logDeletedLabelRows(req, 'DELETE_LABEL', `Label ${noLabel} dihapus permanen`, deletedRows || [], { noLabel });

      await broadcastLabelsChanged();
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus label" });
    }
  });

  // Batch delete labels endpoint
  app.post("/api/labels/batch-delete", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const rawNoLabels = req.body?.noLabels;
      const noLabels: string[] = Array.isArray(rawNoLabels)
        ? rawNoLabels.filter((n: any) => typeof n === 'string' && n && !n.startsWith('__'))
        : [];
      if (noLabels.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      const allDeleted: any[] = [];
      for (let i = 0; i < noLabels.length; i += 500) {
        const { data: deletedRows, error } = await supabaseAdmin
          .from('labels')
          .delete()
          .in('no_label', noLabels.slice(i, i + 500))
          .select('*');
        if (error) {
          console.error("Supabase batch delete error:", error);
          if (allDeleted.length > 0) {
            await logDeletedLabelRows(req, 'DELETE_LABELS', `${allDeleted.length} label dihapus permanen (sebagian, terhenti karena error)`, allDeleted);
          }
          return res.status(500).json({ error: "Gagal menghapus data label secara kelompok" });
        }
        allDeleted.push(...(deletedRows || []));
      }
      await logDeletedLabelRows(req, 'DELETE_LABELS', `${allDeleted.length} label dihapus permanen`, allDeleted);

      await broadcastLabelsChanged();
      res.json({ success: true, count: noLabels.length });
    } catch (err: any) {
      console.error("API error in POST /api/labels/batch-delete:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus kumpulan label" });
    }
  });

  // --- API: FOLDER LABEL (tabel folder_label: prefix + nama Rumah Sakit) ---
  app.get("/api/folders", requireAuth, requireRole(['admin_utama', 'admin_teknik', 'admin_keuangan']), async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('folder_label')
        .select('prefix, nama_rs, created_at, updated_at')
        .order('prefix', { ascending: true });
      if (error) {
        console.error("Supabase get folders error:", error);
        return res.status(500).json({ error: "Gagal mengambil daftar folder label" });
      }
      res.json((data || []).map((f: any) => ({ id: f.prefix, prefix: f.prefix, name: f.nama_rs, namaRs: f.nama_rs, createdAt: f.created_at, updatedAt: f.updated_at })));
    } catch (err: any) {
      console.error("API error in GET /api/folders:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat mengambil data folder" });
    }
  });

  // Peta nama RS per folder: { "095": "RSU Hidayah Boyolali", ... }
  app.get("/api/folders/nama-rs", requireAuth, async (req: AuthRequest, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.json(await fetchFolderNameMap());
    } catch (err: any) {
      console.error("API error in GET /api/folders/nama-rs:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat memproses permintaan" });
    }
  });

  app.post("/api/folders/nama-rs", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { prefix, namaRs } = req.body || {};
      const cleanPrefix = typeof prefix === 'string' ? prefix.trim() : '';
      if (!/^[A-Za-z0-9_-]{1,10}$/.test(cleanPrefix)) {
        return res.status(400).json({ error: "Format prefix folder tidak valid" });
      }
      const cleanNamaRs = typeof namaRs === 'string' && namaRs.trim() ? namaRs.trim().slice(0, 200) : null;
      const { error } = await saveFolderName(cleanPrefix, cleanNamaRs);
      if (error) {
        console.error("Supabase upsert folder RS error:", error);
        return res.status(500).json({ error: "Gagal menyimpan nama rumah sakit folder" });
      }
      await broadcastLabelsChanged();
      res.json({ success: true, prefix: cleanPrefix, namaRs: cleanNamaRs });
    } catch (err: any) {
      console.error("API error in POST /api/folders/nama-rs:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan nama rumah sakit" });
    }
  });

  // Ganti nama RS satu folder: ubah folder_label + kolom nama_rs semua label "<prefix>.%"
  app.post("/api/folders/:prefix/rename-rs", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { prefix } = req.params;
      const { namaRs } = req.body || {};
      if (!prefix || !/^[A-Za-z0-9_-]{1,10}$/.test(prefix)) {
        return res.status(400).json({ error: "Format prefix folder tidak valid" });
      }
      const cleanNamaRs = typeof namaRs === 'string' && namaRs.trim() ? namaRs.trim().slice(0, 200) : null;

      const { error: folderErr } = await saveFolderName(prefix, cleanNamaRs);
      if (folderErr) {
        console.error("Gagal menyimpan folder_label:", folderErr);
        return res.status(500).json({ error: "Gagal menyimpan nama Rumah Sakit folder" });
      }

      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('labels')
        .update({ nama_rs: cleanNamaRs, updated_at: new Date().toISOString() })
        .like('no_label', `${prefix.replace(/[%_\\]/g, '\\$&')}.%`)
        .select('no_label');
      if (updateError) {
        console.error("Gagal update nama_rs folder labels:", updateError);
        return res.status(500).json({ error: "Gagal memperbarui nama Rumah Sakit di database" });
      }

      await logActivity(req, 'RENAME_FOLDER_RS', `Nama RS folder ${prefix} diubah menjadi ${cleanNamaRs || '(kosong)'}`, { prefix, namaRs: cleanNamaRs });
      await broadcastLabelsChanged();
      res.json({ success: true, updatedCount: updatedData ? updatedData.length : 0, prefix, namaRs: cleanNamaRs });
    } catch (err: any) {
      console.error("API error in POST /api/folders/:prefix/rename-rs:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat mengganti nama Rumah Sakit folder" });
    }
  });

  app.post("/api/folders", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { id, prefix, name, namaRs } = req.body || {};
      const cleanPrefix = String(prefix || id || '').trim();
      if (!/^[A-Za-z0-9_-]{1,10}$/.test(cleanPrefix)) {
        return res.status(400).json({ error: "Prefix folder wajib diisi (contoh: 095)" });
      }
      const rs = String(namaRs || name || '').trim() || null;
      const { error } = await saveFolderName(cleanPrefix, rs);
      if (error) {
        console.error("Supabase upsert folder error:", error);
        return res.status(500).json({ error: "Gagal menyimpan data folder label" });
      }
      await broadcastLabelsChanged();
      res.json({ id: cleanPrefix, prefix: cleanPrefix, name: rs, namaRs: rs });
    } catch (err: any) {
      console.error("API error in POST /api/folders:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan folder" });
    }
  });

  // Hapus satu folder beserta seluruh labelnya (permanen di server -> hilang di semua perangkat)
  async function deleteFolderByPrefix(req: AuthRequest, res: any, rawPrefix: string) {
    const prefix = String(rawPrefix || '').trim();
    if (!/^[A-Za-z0-9_-]{1,10}$/.test(prefix)) {
      return res.status(400).json({ error: "Format prefix folder tidak valid" });
    }
    const { data: deleted, error } = await supabaseAdmin
      .from('labels')
      .delete()
      .like('no_label', `${prefix.replace(/[%_\\]/g, '\\$&')}.%`)
      .select('*');
    if (error) {
      console.error("Supabase delete folder labels error:", error);
      return res.status(500).json({ error: "Gagal menghapus label di folder ini" });
    }
    const { error: folderErr } = await supabaseAdmin.from('folder_label').delete().eq('prefix', prefix);
    if (folderErr) {
      console.error("Supabase delete folder_label error:", folderErr);
      return res.status(500).json({ error: "Label terhapus, tetapi data folder gagal dihapus. Coba lagi." });
    }
    await logDeletedLabelRows(req, 'DELETE_FOLDER', `Folder ${prefix} dihapus permanen (${deleted?.length || 0} label)`, deleted || [], { prefix });
    await broadcastLabelsChanged();
    return res.json({ success: true, deletedCount: deleted?.length || 0 });
  }

  app.delete("/api/folders/:id", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      await deleteFolderByPrefix(req, res, req.params.id);
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/:id:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus folder" });
    }
  });

  app.delete("/api/folders/prefix/:prefix", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      await deleteFolderByPrefix(req, res, req.params.prefix);
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/prefix/:prefix:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus folder" });
    }
  });

  // --- API: DATA PORTAL ASET (Jadwal, SPH, BAP, Kalibrator, RS, Teknisi, dll) ---
  // Struktur baru (Oktober 2026): SATU TABEL PER JENIS DATA, SATU BARIS PER ITEM.
  //  - Tidak ada lagi penyimpanan dobel (app_collections / __aset_coll_ / __item_).
  //  - Hapus = "soft delete" (kolom deleted_at) di server, otomatis berlaku di semua perangkat.
  //  - Tidak ada lagi daftar hapus yang disimpan di browser masing-masing perangkat.

  // Nama koleksi (dipakai website) -> nama tabel di Supabase
  const COLLECTION_TABLES: Record<string, string> = {
    schedules: 'jadwal_kalibrasi',
    sphDocuments: 'dokumen_sph',
    bapDocuments: 'dokumen_bap',
    calibratorAssets: 'aset_kalibrator',
    hospitals: 'rumah_sakit',
    technicians: 'teknisi',
    marketingStaff: 'staf_marketing',
    tabletAssets: 'aset_tablet',
    tabletLoans: 'peminjaman_tablet',
    financialAssets: 'aset_keuangan',
    financialTransactions: 'transaksi_keuangan'
  };
  const VALID_COLLECTIONS = new Set(Object.keys(COLLECTION_TABLES));

  // Peta Izin Akses Baca per Koleksi
  function canReadCollection(role: UserRole | undefined, collName: string): boolean {
    if (!role || !OFFICIAL_ROLES.includes(role)) return false;
    if (role === 'admin_utama') return true;

    if (collName === 'financialAssets' || collName === 'financialTransactions') {
      return role === 'admin_keuangan';
    }
    if (collName === 'sphDocuments') {
      return role === 'admin_keuangan' || role === 'hanya_sph';
    }
    if (collName === 'bapDocuments') {
      return role === 'admin_keuangan';
    }
    // schedules, calibratorAssets, tabletAssets, tabletLoans, hospitals, technicians, marketingStaff -> semua role resmi
    return true;
  }

  // Peta Izin Akses Tulis per Koleksi
  function canWriteCollection(role: UserRole | undefined, collName: string): boolean {
    if (!role || !OFFICIAL_ROLES.includes(role)) return false;
    if (role === 'admin_utama') return true;

    if (collName === 'financialAssets' || collName === 'financialTransactions') {
      return role === 'admin_keuangan';
    }
    if (collName === 'sphDocuments') {
      return role === 'admin_keuangan' || role === 'hanya_sph';
    }
    if (collName === 'bapDocuments') {
      return role === 'admin_keuangan';
    }
    if (collName === 'schedules') {
      return role === 'admin_teknik' || role === 'admin_keuangan';
    }
    if (collName === 'calibratorAssets' || collName === 'tabletAssets' || collName === 'tabletLoans') {
      return role === 'admin_teknik';
    }
    if (collName === 'hospitals' || collName === 'technicians' || collName === 'marketingStaff') {
      return role === 'admin_teknik' || role === 'admin_keuangan';
    }
    return false;
  }

  // Kunci unik item: id (utama), atau nomor dokumen bila id kosong
  function getCollectionItemKey(it: any): string | null {
    if (!it || typeof it !== 'object') return null;
    const k = it.id || it.sphNumber || it.workOrderNumber || it.bapNumber || it.noLabel || it.no_label;
    const clean = k !== undefined && k !== null ? String(k).trim() : '';
    if (!clean || clean.length > 120) return null;
    return clean;
  }

  // Ubah baris database -> item yang dipakai website (updatedAt selalu dari server)
  function rowToItem(row: any): any {
    const item = (row?.data && typeof row.data === 'object') ? { ...row.data } : {};
    if (!item.id) item.id = row.id;
    item.updatedAt = row.updated_at;
    return item;
  }

  // Bandingkan dua waktu (toleran format ISO berbeda)
  function sameTimestamp(a: any, b: any): boolean {
    if (!a || !b) return false;
    const ta = Date.parse(String(a));
    const tb = Date.parse(String(b));
    if (!isNaN(ta) && !isNaN(tb)) return ta === tb;
    return String(a).trim() === String(b).trim();
  }

  async function fetchActiveCollection(table: string): Promise<any[]> {
    const rows = await fetchAllRows((from, to) =>
      supabaseAdmin
        .from(table)
        .select('id, data, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
    );
    return (rows || []).map(rowToItem);
  }

  async function logCollectionActivity(req: AuthRequest, action: string, collName: string, recordId: string, payload: any) {
    try {
      await supabaseAdmin.from('activity_log').insert({
        user_id: req.user?.id || null,
        user_email: req.user?.email || null,
        user_role: req.userRole || null,
        action,
        table_name: COLLECTION_TABLES[collName] || collName,
        record_id: String(recordId),
        payload,
        ip_address: req.ip || null,
        created_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.error(`[ActivityLog Error] Gagal mencatat ${action}:`, logErr);
    }
  }

  // GET /api/collections/:name -> semua item aktif (yang belum dihapus)
  app.get("/api/collections/:name", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name } = req.params;
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }
      if (!canReadCollection(req.userRole, name)) {
        return res.status(403).json({ error: "Akun belum memiliki hak akses untuk melihat koleksi ini" });
      }

      const items = await fetchActiveCollection(COLLECTION_TABLES[name]);
      res.setHeader('Cache-Control', 'no-store');
      // found selalu true: tabel selalu ada, jadi website tidak pernah mengisi data contoh
      return res.json({ found: true, items });
    } catch (err: any) {
      console.error(`API error in GET /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: "Gagal mengambil data dari database" });
    }
  });

  // POST /api/collections/:name -> simpan (tambah / ubah) item SATU PER SATU
  // Tidak pernah menghapus item lain. "replaceAll" lama diperlakukan sebagai simpan biasa.
  app.post("/api/collections/:name", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name } = req.params;
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }
      if (!canWriteCollection(req.userRole, name)) {
        return res.status(403).json({ error: "Akun belum memiliki hak akses untuk mengubah koleksi ini" });
      }

      const rawIdempotencyKey = req.headers['idempotency-key'];
      const scopedIdempotencyKey = (typeof rawIdempotencyKey === 'string' && rawIdempotencyKey.trim())
        ? `${req.user?.id || 'user'}:${name}:${rawIdempotencyKey.trim()}`
        : null;
      if (scopedIdempotencyKey) {
        const cached = await getIdempotencyRecord(scopedIdempotencyKey);
        if (cached && cached.expiresAt > Date.now()) {
          return res.status(cached.statusCode).json(cached.body);
        }
      }

      const { items } = req.body || {};
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Format data tidak valid: parameter items harus berupa array" });
      }
      if (items.length > 500) {
        return res.status(400).json({ error: "Terlalu banyak data dalam satu kiriman (maks 500)" });
      }

      const table = COLLECTION_TABLES[name];
      const isMainAdmin = req.userRole === 'admin_utama';
      const actor = req.user?.email || req.user?.id || req.userRole || 'pengguna';

      // Kumpulkan item yang valid (kunci unik wajib ada)
      const incomingByKey = new Map<string, any>();
      for (const it of items) {
        const key = getCollectionItemKey(it);
        if (key) incomingByKey.set(key, it);
      }
      const keys = Array.from(incomingByKey.keys());

      // Ambil versi server untuk item-item tersebut (termasuk yang sudah dihapus)
      const existingMap = new Map<string, any>();
      for (let i = 0; i < keys.length; i += 200) {
        const chunk = keys.slice(i, i + 200);
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id, data, created_at, updated_at, deleted_at')
          .in('id', chunk);
        if (error) {
          console.error(`Supabase read error on ${table}:`, error);
          return res.status(503).json({ error: "Database sedang tidak bisa dihubungi, data disimpan sementara di perangkat dan akan dikirim ulang" });
        }
        (data || []).forEach((r: any) => existingMap.set(r.id, r));
      }

      const conflicts: any[] = [];
      const rejected: any[] = [];
      const skippedDeleted: string[] = [];
      const saved: any[] = [];
      const serverTimestamp = new Date().toISOString();

      for (const key of keys) {
        const incoming = incomingByKey.get(key);
        const oldRow = existingMap.get(key);

        // Item yang sudah dihapus tidak boleh "hidup lagi" karena kiriman perangkat lama
        if (oldRow && oldRow.deleted_at) {
          skippedDeleted.push(key);
          continue;
        }

        const oldItem = oldRow ? rowToItem(oldRow) : null;

        // Deteksi konflik versi: perangkat wajib mengirim baseUpdatedAt = updatedAt terakhir dari server.
        // Berlaku untuk SEMUA role (termasuk admin_utama) agar data perangkat yang ketinggalan
        // tidak menimpa perubahan terbaru dari perangkat lain.
        if (oldRow) {
          const incomingBase = incoming.baseUpdatedAt ?? null;
          if (!incomingBase || !sameTimestamp(incomingBase, oldRow.updated_at)) {
            conflicts.push({
              id: key,
              incomingBaseUpdatedAt: incomingBase,
              serverUpdatedAt: oldRow.updated_at,
              serverItem: oldItem
            });
            continue;
          }
        }

        const processedItem: any = { ...incoming };
        delete processedItem.baseUpdatedAt;
        delete processedItem.updatedAt;
        if (!processedItem.id) processedItem.id = key;

        // KUNCI AUDIT KEUANGAN: status audit hanya boleh diubah admin_utama
        if (name === 'financialTransactions') {
          const isOldAudited = oldItem && (oldItem.auditStatus === 'Lolos Audit' || oldItem.auditStatus === 'Tidak Lolos Audit');

          if (isOldAudited && !isMainAdmin) {
            rejected.push({ id: key, reason: "Transaksi sudah diaudit, hubungi Admin Utama", item: oldItem });
            await logCollectionActivity(req, 'BLOCKED_EDIT_AUDITED_TRX', name, key, {
              reason: "Transaksi sudah diaudit, hubungi Admin Utama",
              oldAuditStatus: oldItem.auditStatus,
              attemptedChanges: incoming
            });
            continue;
          }

          const oldStatus = oldItem?.auditStatus || 'Belum Diaudit';
          if (!isMainAdmin) {
            processedItem.auditStatus = oldItem ? oldStatus : 'Belum Diaudit';
            processedItem.auditNotes = oldItem ? (oldItem.auditNotes || null) : null;
            processedItem.auditorName = oldItem ? (oldItem.auditorName || null) : null;
            processedItem.auditedAt = oldItem ? (oldItem.auditedAt || null) : null;
          } else if (processedItem.auditStatus && processedItem.auditStatus !== oldStatus) {
            processedItem.auditorName = req.user?.email || 'admin_utama';
            processedItem.auditedAt = serverTimestamp;
            await logCollectionActivity(req, oldItem ? 'UPDATE_AUDIT_STATUS' : 'SET_INITIAL_AUDIT_STATUS', name, key, {
              oldStatus,
              newStatus: processedItem.auditStatus,
              auditNotes: processedItem.auditNotes || null,
              auditedAt: serverTimestamp
            });
          }
        }

        saved.push({
          id: key,
          data: processedItem,
          updated_at: serverTimestamp,
          updated_by: actor,
          created_at: oldRow?.created_at || serverTimestamp,
          deleted_at: null,
          deleted_by: null,
          // versi server yang dilihat perangkat (untuk update bersyarat), tidak ikut disimpan
          _baseUpdatedAt: oldRow ? oldRow.updated_at : null,
          _oldItem: oldItem
        });
      }

      // Simpan secara ATOMIK agar dua perangkat yang menyimpan bersamaan tidak saling timpa:
      //  - Item lama: UPDATE hanya jika updated_at di database masih sama dengan versi yang dilihat perangkat.
      //    Jika 0 baris berubah -> ada perangkat lain yang lebih dulu menyimpan -> masuk "conflicts".
      //  - Item baru: INSERT. Jika id sudah dipakai perangkat lain (bentrok kunci) -> masuk "conflicts".
      const savedOk: any[] = [];
      for (const rec of saved) {
        const { _baseUpdatedAt, _oldItem, ...row } = rec;
        if (_baseUpdatedAt) {
          const { data: upd, error: updErr } = await supabaseAdmin
            .from(table)
            .update({ data: row.data, updated_at: row.updated_at, updated_by: row.updated_by })
            .eq('id', row.id)
            .eq('updated_at', _baseUpdatedAt)
            .is('deleted_at', null)
            .select('id');
          if (updErr) {
            console.error(`Supabase update error on ${table}:`, updErr);
            return res.status(503).json({ error: "Gagal menyimpan ke database, data disimpan sementara di perangkat dan akan dikirim ulang", saved: savedOk.map(s => s.id) });
          }
          if (!upd || upd.length === 0) {
            const { data: latest } = await supabaseAdmin
              .from(table)
              .select('id, data, updated_at, deleted_at')
              .eq('id', row.id)
              .maybeSingle();
            conflicts.push({
              id: row.id,
              incomingBaseUpdatedAt: _baseUpdatedAt,
              serverUpdatedAt: latest?.updated_at || null,
              serverItem: latest && !latest.deleted_at ? rowToItem(latest) : _oldItem
            });
            continue;
          }
        } else {
          const { error: insErr } = await supabaseAdmin.from(table).insert(row);
          if (insErr) {
            if ((insErr as any).code === '23505') {
              const { data: latest } = await supabaseAdmin
                .from(table)
                .select('id, data, updated_at, deleted_at')
                .eq('id', row.id)
                .maybeSingle();
              conflicts.push({
                id: row.id,
                incomingBaseUpdatedAt: null,
                serverUpdatedAt: latest?.updated_at || null,
                serverItem: latest && !latest.deleted_at ? rowToItem(latest) : null
              });
              continue;
            }
            console.error(`Supabase insert error on ${table}:`, insErr);
            return res.status(503).json({ error: "Gagal menyimpan ke database, data disimpan sementara di perangkat dan akan dikirim ulang", saved: savedOk.map(s => s.id) });
          }
        }
        savedOk.push(row);
      }

      const allItems = await fetchActiveCollection(table);
      const result = {
        success: true,
        count: allItems.length,
        saved: savedOk.map(s => s.id),
        items: allItems,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        rejected: rejected.length > 0 ? rejected : undefined,
        skippedDeleted: skippedDeleted.length > 0 ? skippedDeleted : undefined
      };

      if (scopedIdempotencyKey) {
        await saveIdempotencyRecord(scopedIdempotencyKey, 200, { ...result, items: undefined }, req.user?.id);
      }
      return res.json(result);
    } catch (err: any) {
      console.error(`API error in POST /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan data" });
    }
  });

  // DELETE /api/collections/:name/:id -> hapus satu item (soft delete, berlaku di semua perangkat)
  app.delete("/api/collections/:name/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name } = req.params;
      const id = String(req.params.id || '').trim();
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }
      if (!canWriteCollection(req.userRole, name)) {
        return res.status(403).json({ error: "Akun belum memiliki hak akses untuk menghapus item dari koleksi ini" });
      }
      if (!id || id.length > 120) {
        return res.status(400).json({ error: "ID data tidak valid" });
      }

      const table = COLLECTION_TABLES[name];
      const { data: row, error: findErr } = await supabaseAdmin
        .from(table)
        .select('id, data, updated_at, deleted_at')
        .eq('id', id)
        .maybeSingle();

      if (findErr) {
        console.error(`Supabase read error on ${table}:`, findErr);
        return res.status(503).json({ error: "Database sedang tidak bisa dihubungi, coba lagi" });
      }
      if (!row || row.deleted_at) {
        // Sudah tidak ada / sudah dihapus: anggap berhasil (aman diulang)
        return res.json({ success: true, alreadyDeleted: true });
      }

      if (name === 'financialTransactions') {
        const item = rowToItem(row);
        const isAudited = item.auditStatus === 'Lolos Audit' || item.auditStatus === 'Tidak Lolos Audit';
        if (isAudited && req.userRole !== 'admin_utama') {
          await logCollectionActivity(req, 'BLOCKED_EDIT_AUDITED_TRX', name, id, {
            reason: "Transaksi sudah diaudit, hubungi Admin Utama (Upaya Hapus Ditolak)",
            auditStatus: item.auditStatus
          });
          return res.status(403).json({ error: "Akses ditolak: Transaksi yang sudah diaudit hanya dapat dihapus oleh Admin Utama" });
        }
      }

      const nowIso = new Date().toISOString();
      const { error: delErr } = await supabaseAdmin
        .from(table)
        .update({ deleted_at: nowIso, deleted_by: req.user?.email || req.user?.id || req.userRole || null, updated_at: nowIso })
        .eq('id', id);
      if (delErr) {
        console.error(`Supabase soft delete error on ${table}:`, delErr);
        return res.status(503).json({ error: "Gagal menghapus data, coba lagi" });
      }

      await logCollectionActivity(req, 'DELETE_ITEM', name, id, { ringkasan: row.data?.name || row.data?.sphNumber || row.data?.workOrderNumber || null });
      res.json({ success: true });
    } catch (err: any) {
      console.error(`API error in DELETE /api/collections/${req.params.name}/${req.params.id}:`, err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus data" });
    }
  });

  // DELETE /api/collections/:name -> kosongkan satu koleksi (HANYA admin_utama, soft delete)
  app.delete("/api/collections/:name", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const { name } = req.params;
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from(COLLECTION_TABLES[name])
        .update({ deleted_at: nowIso, deleted_by: req.user?.email || 'admin_utama', updated_at: nowIso })
        .is('deleted_at', null);
      if (error) {
        console.error(`Supabase clear error on ${name}:`, error);
        return res.status(500).json({ error: "Gagal mengosongkan data koleksi" });
      }
      await logCollectionActivity(req, 'CLEAR_COLLECTION', name, name, {});
      res.json({ success: true, remaining: 0 });
    } catch (err: any) {
      console.error(`API error in DELETE /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat mengosongkan koleksi" });
    }
  });

  // --- API: SIGNED URL GENERATION FOR PRIVATE DOCUMENTS (SPH, SPK, BAP, ETC.) ---
  // Anti-IDOR, Role check, Anti-Path-Traversal, Prefix whitelist, Safe TTL, and Activity Logging
  app.post("/api/storage/signed-url", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Set strict no-cache headers so temporary signed URLs are never cached by intermediaries
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const { filePath, documentId, documentType, expiresIn = 900 } = req.body;
      const userRole = req.userRole;

      // 1. Anti-IDOR: Untuk role selain admin_utama, WAJIB pakai documentId + documentType;
      // filePath mentah dari browser hanya diterima untuk admin_utama.
      if (userRole !== 'admin_utama') {
        if (!documentId || !documentType) {
          return res.status(400).json({ 
            error: "Parameter documentId dan documentType diperlukan untuk verifikasi dokumen privat" 
          });
        }
      }

      // 2. Batasi documentType per role:
      // - admin_teknik: hanya 'spk' dan 'bap'
      // - hanya_sph: hanya 'sph'
      // - admin_keuangan: semua ('sph', 'spk', 'bap', 'financial')
      // - admin_utama: semua
      if (documentType) {
        if (userRole === 'admin_teknik' && !['spk', 'bap'].includes(documentType)) {
          return res.status(403).json({ error: "Akses ditolak: Admin teknik hanya memiliki akses ke dokumen SPK dan BAP." });
        }
        if (userRole === 'hanya_sph' && documentType !== 'sph') {
          return res.status(403).json({ error: "Akses ditolak: Peran hanya_sph hanya dapat mengakses dokumen SPH." });
        }
        if (!['sph', 'spk', 'bap', 'financial'].includes(documentType)) {
          return res.status(400).json({ error: "documentType tidak valid (harus: 'sph', 'spk', 'bap', atau 'financial')" });
        }
      }

      // Peta Prefix Folder per Jenis Dokumen
      const DOCUMENT_TYPE_PREFIXES: Record<string, string[]> = {
        sph: ['sph/'],
        spk: ['spk/'],
        bap: ['bap/'],
        financial: ['financial/', 'invoices/', 'contracts/']
      };

      let targetPath = '';

      // 3. Path dokumen dicari dari tabel koleksi di server:
      // documentType 'sph' -> sphDocuments, 'spk' -> schedules, 'bap' -> bapDocuments, 'financial' -> financialTransactions
      if (documentId && documentType) {
        let collName = '';
        if (documentType === 'sph') collName = 'sphDocuments';
        else if (documentType === 'spk') collName = 'schedules';
        else if (documentType === 'bap') collName = 'bapDocuments';
        else if (documentType === 'financial') collName = 'financialTransactions';

        // Cari dokumen di tabel koleksinya (hanya yang belum dihapus)
        let foundItem: any = null;
        try {
          const table = COLLECTION_TABLES[collName];
          const docId = String(documentId).trim();
          const { data: byId } = await supabaseAdmin
            .from(table)
            .select('id, data, updated_at')
            .eq('id', docId)
            .is('deleted_at', null)
            .maybeSingle();
          if (byId) {
            foundItem = rowToItem(byId);
          } else {
            // Cadangan: cari berdasarkan nomor dokumen (SPH / SPK / BAP)
            for (const field of ['sphNumber', 'workOrderNumber', 'bapNumber', 'bastpNumber']) {
              const { data: byNo } = await supabaseAdmin
                .from(table)
                .select('id, data, updated_at')
                .eq(`data->>${field}`, docId)
                .is('deleted_at', null)
                .limit(1);
              if (byNo && byNo.length > 0) {
                foundItem = rowToItem(byNo[0]);
                break;
              }
            }
          }
        } catch (_) {}

        if (!foundItem) {
          return res.status(404).json({ error: "Dokumen tidak ditemukan dalam koleksi sistem" });
        }

        const resolvedPath = foundItem.pdfUrl || foundItem.pdf_url 
          || foundItem.filePath || foundItem.file_path 
          || foundItem.receiptUrl || foundItem.attachmentUrl || foundItem.attachment_url;

        if (!resolvedPath || typeof resolvedPath !== 'string') {
          return res.status(404).json({ error: "Lampiran dokumen PDF belum diunggah untuk dokumen ini" });
        }

        const cleanResolved = resolvedPath.trim();

        // Jika resolvedPath diawali 'data:' atau 'http' -> kembalikan apa adanya tanpa signed URL bila role diizinkan
        if (cleanResolved.startsWith('data:') || cleanResolved.startsWith('http://') || cleanResolved.startsWith('https://')) {
          return res.json({
            signedUrl: cleanResolved,
            isDirect: true,
            filePath: cleanResolved
          });
        }

        targetPath = cleanResolved.replace(/^\/+/, '');

        // Validasi targetPath hasil resolve wajib diawali prefix milik documentType
        const allowedPrefixes = DOCUMENT_TYPE_PREFIXES[documentType] || [];
        const hasValidPrefix = allowedPrefixes.some(p => targetPath.toLowerCase().startsWith(p.toLowerCase()));
        if (!hasValidPrefix) {
          return res.status(403).json({ 
            error: `Akses ditolak: Path dokumen '${targetPath}' tidak sesuai dengan tipe dokumen '${documentType}' yang diminta` 
          });
        }
      } else if (userRole === 'admin_utama' && typeof filePath === 'string') {
        const cleanResolved = filePath.trim();
        if (cleanResolved.startsWith('data:') || cleanResolved.startsWith('http://') || cleanResolved.startsWith('https://')) {
          return res.json({
            signedUrl: cleanResolved,
            isDirect: true,
            filePath: cleanResolved
          });
        }
        targetPath = cleanResolved.replace(/^\/+/, '');
      }

      if (!targetPath) {
        return res.status(400).json({ error: "Parameter filePath atau documentId & documentType diperlukan" });
      }

      // 4. Anti-Path-Traversal check
      if (targetPath.includes('..') || targetPath.includes('\\') || targetPath.includes('\0')) {
        return res.status(400).json({ error: "Path file tidak valid (deteksi path traversal)" });
      }

      // 5. Strict Folder Prefix Whitelist for internal-documents
      const ALLOWED_PRIVATE_PREFIXES = /^(sph|spk|bap|financial|invoices|contracts)\//i;
      if (!ALLOWED_PRIVATE_PREFIXES.test(targetPath)) {
        return res.status(403).json({ error: "Akses ditolak: Folder bukan bagian dari dokumen privat yang diizinkan" });
      }

      // 6. Safe TTL (Default 15 minutes, maximum cap 900 seconds)
      const safeTtl = Math.min(Math.max(Number(expiresIn) || 900, 60), 900);

      const { data, error } = await supabaseAdmin.storage
        .from('internal-documents')
        .createSignedUrl(targetPath, safeTtl);

      if (error) {
        console.error("Failed to generate signed URL for path:", targetPath, error);
        return res.status(500).json({ error: "Gagal membuat URL akses dokumen privat" });
      }

      // 7. Catat setiap pembuatan signed URL ke activity_log (siapa, dokumen apa, kapan)
      try {
        await supabaseAdmin.from('activity_log').insert({
          user_id: req.user?.id || null,
          user_email: req.user?.email || null,
          user_role: req.userRole || null,
          action: 'CREATE_SIGNED_URL',
          table_name: 'internal-documents',
          record_id: targetPath,
          payload: {
            documentId: documentId || null,
            documentType: documentType || null,
            filePath: targetPath,
            expiresIn: safeTtl
          },
          ip_address: req.ip || null,
          created_at: new Date().toISOString()
        });
      } catch (logErr) {
        console.error('[ActivityLog Error] Gagal mencatat signed URL creation:', logErr);
      }

      res.json({ 
        signedUrl: data.signedUrl, 
        expiresIn: safeTtl,
        filePath: targetPath
      });
    } catch (err: any) {
      console.error("API error in /api/storage/signed-url:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat memproses dokumen privat" });
    }
  });

  // --- API: SETTINGS (Protected by requireAuth + Whitelist; POST restricted to admin_utama) ---
  const ALLOWED_SETTINGS_KEY_REGEX = /^(appConfig|templates|document_templates_config|general|official_templates|company_profile|theme|branding|company_logo|aset_[a-zA-Z0-9_\-]+)$/;

  app.get("/api/settings/:key", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { key } = req.params;

      // Whitelist key check
      if (!ALLOWED_SETTINGS_KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Kunci pengaturan tidak valid atau tidak diizinkan" });
      }

      const { data, error } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        console.error(`Supabase settings read error for ${key}:`, error);
        return res.status(500).json({ error: "Gagal membaca pengaturan dari database" });
      }

      res.json({ key, value: data ? data.value : null });
    } catch (err: any) {
      console.error("API error in GET /api/settings/:key:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat mengambil data pengaturan" });
    }
  });

  // Only admin_utama can modify official templates and system settings
  app.post("/api/settings/:key", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const { key } = req.params;

      if (!ALLOWED_SETTINGS_KEY_REGEX.test(key)) {
        return res.status(400).json({ error: "Kunci pengaturan tidak valid atau tidak diizinkan" });
      }

      const { value } = req.body;

      const { error } = await supabaseAdmin
        .from('settings')
        .upsert({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Supabase settings upsert error:", error);
        return res.status(500).json({ error: "Gagal menyimpan pengaturan ke database" });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in POST /api/settings/:key:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan pengaturan" });
    }
  });

  // --- API: SUPABASE STATUS & SYNC CHECK (Protected by requireAuth & requireRole admin_utama) ---
  app.get("/api/supabase/status", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const { error } = await supabaseAdmin.from('labels').select('count', { count: 'exact', head: true });
      if (error) {
        console.error("Supabase status check error:", error);
        return res.json({ connected: false, tableReady: false, message: "Koneksi ke database gagal" });
      }
      res.json({
        connected: true,
        tableReady: true
      });
    } catch (err: any) {
      console.error("API error in /api/supabase/status:", err);
      res.json({ connected: false, tableReady: false, message: "Terjadi kesalahan koneksi" });
    }
  });

  app.post("/api/supabase/sync", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const { error } = await supabaseAdmin.from('labels').select('count', { count: 'exact', head: true });
      if (error) {
        console.error("Supabase sync count error:", error);
        return res.status(400).json({ success: false, error: 'Tabel labels belum siap di Supabase' });
      }

      const { count, error: selectErr } = await supabaseAdmin.from('labels').select('no_label', { count: 'exact', head: true });
      if (selectErr) {
        console.error("Supabase sync select error:", selectErr);
        return res.status(500).json({ success: false, error: "Gagal membaca data label dari database" });
      }

      res.json({ success: true, count: count || 0 });
    } catch (err: any) {
      console.error("API error in POST /api/supabase/sync:", err);
      res.status(500).json({ success: false, error: "Terjadi kesalahan sistem saat sinkronisasi" });
    }
  });

  return app;
}
