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

// Per-collection queue/mutex to prevent simultaneous write race conditions
const collectionQueues = new Map<string, Promise<any>>();

export function runInCollectionQueue<T>(collectionName: string, task: () => Promise<T>): Promise<T> {
  const currentPromise = collectionQueues.get(collectionName) || Promise.resolve();
  const nextPromise = currentPromise
    .catch(() => {})
    .then(task);

  collectionQueues.set(collectionName, nextPromise);

  nextPromise.finally(() => {
    if (collectionQueues.get(collectionName) === nextPromise) {
      collectionQueues.delete(collectionName);
    }
  });

  return nextPromise;
}

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
    message: { error: "Terlalu banyak permintaan dari IP ini, coba lagi dalam beberapa menit." }
  });

  app.use("/api/", apiLimiter);

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

      const [collectionsCheck, settingsCheck, activityLogCheck, idempotencyCheck] = await Promise.all([
        checkTable('app_collections'),
        checkTable('settings'),
        checkTable('activity_log'),
        checkTable('api_idempotency')
      ]);

      const allOk = hasSupabaseUrl && hasServiceRoleKey && 
        collectionsCheck.ok && settingsCheck.ok && activityLogCheck.ok && idempotencyCheck.ok;

      res.status(allOk ? 200 : 503).json({
        ok: allOk,
        timestamp: new Date().toISOString(),
        environment: {
          hasSupabaseUrl,
          hasServiceRoleKey
        },
        tables: {
          app_collections: collectionsCheck,
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
  app.get("/api/labels/:noLabel", publicScanLimiter, async (req, res) => {
    try {
      const { noLabel } = req.params;

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

      const safePdfUrl = !isInternalDoc(data.pdf_url) ? data.pdf_url : null;
      const safePdfDriveUrl = !isInternalDoc(data.pdf_drive_url) ? data.pdf_drive_url : null;

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
        pdfDriveUrl: safePdfDriveUrl
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
      const data = await fetchAllRows((from, to) =>
        supabaseAdmin
          .from('labels')
          .select('*')
          .not('no_label', 'like', '__meta_%')
          .not('no_label', 'like', '__aset_%')
          .not('no_label', 'like', '__item_%')
          .not('no_label', 'like', '__tombstone_%')
          .order('no_label', { ascending: true })
          .range(from, to)
      );

      const formatted = (data || []).map((it: any) => ({
        noLabel: it.no_label,
        namaRs: it.nama_rs || null,
        namaAlat: it.nama_alat || it.namaAlat || it.pdf_name || null,
        ruangan: it.ruangan || null,
        status: it.status,
        pdfSource: it.pdf_source,
        pdfUrl: it.pdf_url,
        pdfDriveUrl: it.pdf_drive_url,
        pdfOriginalUrl: it.pdforiginal_url,
        pdfName: it.pdf_name,
        calibratedAt: it.calibrated_at,
        validUntil: it.valid_until,
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
      const [allLabels, folderNameRes] = await Promise.all([
        fetchAllRows((from, to) =>
          supabaseAdmin
            .from('labels')
            .select('no_label, nama_rs, pdforiginal_url')
            .order('no_label', { ascending: true })
            .range(from, to)
        ),
        supabaseAdmin
          .from('labels')
          .select('no_label, pdforiginal_url')
          .like('no_label', '__meta_folder_rs_%')
      ]);

      const folderRsMap: Record<string, string> = {};
      (folderNameRes.data || []).forEach((r: any) => {
        const prefix = r.no_label.replace('__meta_folder_rs_', '');
        const val = r.pdforiginal_url || r.pdf_original_url;
        if (prefix && val) folderRsMap[prefix] = val;
      });

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
        pdfUrl,
        pdfDriveUrl,
        pdfOriginalUrl,
        pdfName,
        calibratedAt,
        validUntil,
        clearCertificate
      } = req.body;

      if (!noLabel) {
        return res.status(400).json({ error: "Nomor label wajib diisi" });
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
      }

      // Save folder RS name to metadata if applicable
      if (namaRs && typeof namaRs === 'string' && namaRs.trim()) {
        const dotIdx = noLabel.indexOf('.');
        const prefix = dotIdx > 0 ? noLabel.substring(0, dotIdx) : (noLabel.length >= 3 ? noLabel.substring(0, 3) : noLabel);
        try {
          await upsertLabelsAdmin([{
            no_label: `__meta_folder_rs_${prefix}`,
            status: 'metadata',
            pdf_source: 'folder_rs_name',
            nama_rs: namaRs.trim(),
            pdforiginal_url: namaRs.trim(),
            updated_at: new Date().toISOString()
          }]);
        } catch (_) {}
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

      const incomingRecords = items
        .filter((it: any) => it && (it.noLabel || it.no_label || it.id))
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
              status: (oldItem.status === 'Sertifikat Tertaut' && (!rec.status || rec.status === 'Menunggu Sertifikat')) ? oldItem.status : (rec.status || oldItem.status),
              pdf_source: rec.pdf_source || oldItem.pdf_source || null,
              pdf_url: rec.pdf_url || oldItem.pdf_url || null,
              pdf_drive_url: rec.pdf_drive_url || oldItem.pdf_drive_url || null,
              pdforiginal_url: rec.pdforiginal_url || oldItem.pdforiginal_url || oldItem.pdf_original_url || null,
              pdf_name: rec.pdf_name || oldItem.pdf_name || null,
              calibrated_at: rec.calibrated_at || oldItem.calibrated_at || null,
              valid_until: rec.valid_until || oldItem.valid_until || null
            };
          }
          return rec;
        });
        created = recordsToSave.map(r => r.no_label);
      } else {
        // Mode default: HANYA TAMBAH BARU (nomor yang sudah ada dilewati)
        recordsToSave = incomingRecords.filter(r => !existingMap.has(r.no_label));
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

      for (const [prefix, rsName] of Object.entries(folderRsMap)) {
        try {
          await upsertLabelsAdmin([{
            no_label: `__meta_folder_rs_${prefix}`,
            status: 'metadata',
            pdf_source: 'folder_rs_name',
            nama_rs: rsName,
            pdforiginal_url: rsName,
            updated_at: new Date().toISOString()
          }]);
        } catch (_) {}
      }

      if (recordsToSave.length > 0) {
        const result = await upsertLabelsAdmin(recordsToSave);

        if (!result.success) {
          console.error("Supabase bulk label upsert error:", result.error);
          return res.status(500).json({ error: "Gagal menyimpan label baru ke database" });
        }
      }

      await broadcastLabelsChanged();
      res.json({
        success: true,
        count: recordsToSave.length,
        created,
        skippedExisting
      });
    } catch (err: any) {
      console.error("API error in POST /api/labels/bulk:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan label secara massal" });
    }
  });

  app.delete("/api/labels/:noLabel", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { noLabel } = req.params;
      console.log(`[API] Deleting label: ${noLabel}`);
      const { error } = await supabaseAdmin
        .from('labels')
        .delete()
        .eq('no_label', noLabel);

      if (error) {
        console.error("Supabase delete label error:", error);
        return res.status(500).json({ error: "Gagal menghapus label dari database" });
      }

      await broadcastLabelsChanged();
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus label" });
    }
  });

  // Batch delete labels endpoint
  app.post("/api/labels/batch-delete", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { noLabels } = req.body;
      if (!Array.isArray(noLabels) || noLabels.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      console.log(`[API] Batch deleting ${noLabels.length} labels:`, noLabels);
      const { error } = await supabaseAdmin
        .from('labels')
        .delete()
        .in('no_label', noLabels);

      if (error) {
        console.error("Supabase batch delete error:", error);
        return res.status(500).json({ error: "Gagal menghapus data label secara kelompok" });
      }

      await broadcastLabelsChanged();
      res.json({ success: true, count: noLabels.length });
    } catch (err: any) {
      console.error("API error in POST /api/labels/batch-delete:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus kumpulan label" });
    }
  });

  // --- API: FOLDERS (Protected by requireAuth) ---
  app.get("/api/folders", requireAuth, requireRole(['admin_utama', 'admin_teknik', 'admin_keuangan']), async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('label_folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase get folders error:", error);
        return res.status(500).json({ error: "Gagal mengambil daftar folder label" });
      }

      res.json(data || []);
    } catch (err: any) {
      console.error("API error in GET /api/folders:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat mengambil data folder" });
    }
  });

  // Folder RS Name Mapping endpoints (Paginated to fetch all metadata rows)
  app.get("/api/folders/nama-rs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await fetchAllRows((from, to) =>
        supabaseAdmin
          .from('labels')
          .select('no_label, nama_rs, pdforiginal_url')
          .or('no_label.like.__meta_folder_rs_%,no_label.like.__meta_folder_%')
          .order('no_label', { ascending: true })
          .range(from, to)
      );

      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        const no = row.no_label || '';
        let prefix = '';
        if (no.startsWith('__meta_folder_rs_')) {
          prefix = no.replace('__meta_folder_rs_', '');
        } else if (no.startsWith('__meta_folder_')) {
          prefix = no.replace('__meta_folder_', '');
        }
        const val = row.nama_rs || row.pdforiginal_url || row.pdf_original_url;
        if (prefix && val) {
          map[prefix] = val;
        }
      });
      res.json(map);
    } catch (err: any) {
      console.error("API error in GET /api/folders/nama-rs:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat memproses permintaan" });
    }
  });

  app.post("/api/folders/nama-rs", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { prefix, namaRs } = req.body;
      if (!prefix || typeof prefix !== 'string') {
        return res.status(400).json({ error: "Prefix folder wajib diisi" });
      }
      const cleanPrefix = prefix.replace(/[^a-zA-Z0-9._-]/g, '');
      if (!cleanPrefix) {
        return res.status(400).json({ error: "Format prefix tidak valid" });
      }

      const payload: any = {
        no_label: `__meta_folder_rs_${cleanPrefix}`,
        status: 'metadata',
        pdf_source: 'folder_rs_name',
        nama_rs: namaRs ? String(namaRs).trim() : null,
        pdforiginal_url: namaRs ? String(namaRs).trim() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('labels')
        .upsert(payload, { onConflict: 'no_label' });

      if (error) {
        console.error("Supabase upsert folder RS error:", error);
        return res.status(500).json({ error: "Gagal menyimpan nama rumah sakit folder" });
      }

      await broadcastLabelsChanged();
      res.json({ success: true, prefix: cleanPrefix, namaRs });
    } catch (err: any) {
      console.error("API error in POST /api/folders/nama-rs:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan nama rumah sakit" });
    }
  });

  // --- API: RENAME FOLDER RS (Protected: admin_utama & admin_teknik) ---
  app.post("/api/folders/:prefix/rename-rs", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { prefix } = req.params;
      const { namaRs } = req.body;

      // 1. Validasi format prefix ^[A-Za-z0-9_-]{1,10}$
      if (!prefix || !/^[A-Za-z0-9_-]{1,10}$/.test(prefix)) {
        return res.status(400).json({ error: "Format prefix folder tidak valid" });
      }

      const cleanNamaRs = typeof namaRs === 'string' && namaRs.trim() ? namaRs.trim() : null;

      // 2. Update kolom nama_rs untuk semua label "<prefix>.%" dalam satu query
      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('labels')
        .update({
          nama_rs: cleanNamaRs,
          updated_at: new Date().toISOString()
        })
        .like('no_label', `${prefix}.%`)
        .select('no_label');

      if (updateError) {
        console.error("Gagal update nama_rs folder labels:", updateError);
        return res.status(500).json({ error: "Gagal memperbarui nama Rumah Sakit di database" });
      }

      // 3. Simpan juga metadata __meta_folder_rs_<prefix> dan cek error secara eksplisit
      const { error: metaErr } = await supabaseAdmin
        .from('labels')
        .upsert({
          no_label: `__meta_folder_rs_${prefix}`,
          status: 'metadata',
          pdf_source: 'folder_rs_name',
          nama_rs: cleanNamaRs,
          pdforiginal_url: cleanNamaRs,
          updated_at: new Date().toISOString()
        }, { onConflict: 'no_label' });

      if (metaErr) {
        console.error("Gagal memperbarui metadata folder rs:", metaErr);
        return res.status(500).json({ error: "Gagal menyimpan metadata nama Rumah Sakit folder" });
      }

      await broadcastLabelsChanged();

      res.json({
        success: true,
        updatedCount: updatedData ? updatedData.length : 0,
        prefix,
        namaRs: cleanNamaRs
      });
    } catch (err: any) {
      console.error("API error in POST /api/folders/:prefix/rename-rs:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat mengganti nama Rumah Sakit folder" });
    }
  });

  app.post("/api/folders", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { id, name, color, labelIds } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: "Parameter id dan name folder wajib diisi" });
      }

      const { data, error } = await supabaseAdmin
        .from('label_folders')
        .upsert({
          id,
          name,
          color: color || '#3b82f6',
          label_ids: labelIds || [],
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase upsert folder error:", error);
        return res.status(500).json({ error: "Gagal menyimpan data folder label" });
      }

      await broadcastLabelsChanged();
      res.json(data);
    } catch (err: any) {
      console.error("API error in POST /api/folders:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menyimpan folder" });
    }
  });

  app.delete("/api/folders/:id", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      console.log(`[API] Deleting folder or prefix: ${id}`);

      // 1. If this id is a 3-digit prefix or contains alphanumeric prefix, delete all related labels
      const escapedPrefix = id.replace(/[%_\\]/g, '\\$&');
      await supabaseAdmin.from('labels').delete().like('no_label', `${escapedPrefix}.%`);
      await supabaseAdmin.from('labels').delete().eq('no_label', id);
      await supabaseAdmin.from('labels').delete().eq('no_label', `__meta_folder_${id}`);
      await supabaseAdmin.from('labels').delete().eq('no_label', `__meta_folder_rs_${id}`);

      // 2. Also attempt deletion from label_folders if table exists
      try {
        await supabaseAdmin.from('label_folders').delete().eq('id', id);
      } catch (_) {}

      await broadcastLabelsChanged();
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/:id:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus folder" });
    }
  });

  // Strict sanitization & escaping for folder prefix deletion to prevent wildcards like % or _
  app.delete("/api/folders/prefix/:prefix", requireAuth, requireRole(['admin_utama', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      const { prefix } = req.params;
      
      // Validate prefix strictly: only allow alphanumeric, dash, underscore, and dots
      if (!prefix || !/^[a-zA-Z0-9._-]+$/.test(prefix)) {
        return res.status(400).json({ error: "Format prefix tidak valid. Hanya karakter alfanumerik dan .-_ yang diizinkan." });
      }

      const escapedPrefix = prefix.replace(/[%_\\]/g, '\\$&');

      await supabaseAdmin.from('labels').delete().like('no_label', `${escapedPrefix}.%`);
      await supabaseAdmin.from('labels').delete().eq('no_label', prefix);
      await supabaseAdmin.from('labels').delete().eq('no_label', `__meta_folder_${prefix}`);
      await supabaseAdmin.from('labels').delete().eq('no_label', `__meta_folder_rs_${prefix}`);

      await broadcastLabelsChanged();
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/prefix/:prefix:", err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat menghapus label prefix folder" });
    }
  });

  // --- API: DURABLE ASSET COLLECTIONS (SPH, Schedules, Calibrators, etc.) ---
  
  // Whitelist nama koleksi yang valid sesuai aturan keamanan
  const VALID_COLLECTIONS = new Set([
    'schedules',
    'sphDocuments',
    'bapDocuments',
    'calibratorAssets',
    'hospitals',
    'technicians',
    'marketingStaff',
    'tabletAssets',
    'tabletLoans',
    'financialAssets',
    'financialTransactions'
  ]);

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

  function isSameCollectionItem(a: any, b: any): boolean {
    if (!a || !b) return false;
    if (a.id && b.id && String(a.id).trim() === String(b.id).trim()) return true;
    if (a.sphNumber && b.sphNumber && String(a.sphNumber).trim() === String(b.sphNumber).trim()) return true;
    if (a.workOrderNumber && b.workOrderNumber && String(a.workOrderNumber).trim() === String(b.workOrderNumber).trim()) return true;
    if (a.bapNumber && b.bapNumber && String(a.bapNumber).trim() === String(b.bapNumber).trim()) return true;
    if (a.noLabel && b.noLabel && String(a.noLabel).trim() === String(b.noLabel).trim()) return true;
    if (a.no_label && b.no_label && String(a.no_label).trim() === String(b.no_label).trim()) return true;
    return false;
  }

  function getCollectionItemKey(it: any): string {
    if (!it || typeof it !== 'object') return `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const k = it.id || it.sphNumber || it.workOrderNumber || it.bapNumber || it.noLabel || it.no_label;
    return k ? String(k).trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_') : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  // GET /api/collections/:name (Protected by requireAuth and collection read permission)
  app.get("/api/collections/:name", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name } = req.params;

      // Whitelist validation
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }

      // Role check for reading
      if (!canReadCollection(req.userRole, name)) {
        return res.status(403).json({ error: "Akun belum memiliki hak akses untuk melihat koleksi ini" });
      }

      // 1. Fetch tombstones for permanently deleted items (dengan pagination)
      const itemPrefix = `__item_${name}_`;
      const tombstonePrefix = `__tombstone_${name}_`;
      const deletedIdSet = new Set<string>();

      try {
        const tombstoneRows = await fetchAllRows((from, to) =>
          supabaseAdmin
            .from('labels')
            .select('pdf_name')
            .like('no_label', `${tombstonePrefix}%`)
            .order('no_label', { ascending: true })
            .range(from, to)
        );
        if (tombstoneRows && tombstoneRows.length > 0) {
          tombstoneRows.forEach(tr => {
            if (tr.pdf_name) deletedIdSet.add(String(tr.pdf_name).trim());
          });
        }
      } catch (_) {}

      // 2. Try reading from dedicated app_collections table first
      try {
        const { data: collRow, error: collErr } = await supabaseAdmin
          .from('app_collections')
          .select('data')
          .eq('collection_name', name)
          .maybeSingle();

        if (!collErr && collRow && Array.isArray(collRow.data)) {
          // Filter out any tombstone deleted items
          const cleanItems = collRow.data.filter((it: any) => {
            const key = it?.id || it?.sphNumber || it?.workOrderNumber || it?.bapNumber || it?.noLabel;
            return !key || !deletedIdSet.has(String(key).trim());
          });
          return res.json({ found: true, items: cleanItems });
        }
      } catch (_) {}

      const metaKey = `__aset_coll_${name}`;

      const { data: mainData, error } = await supabaseAdmin
        .from('labels')
        .select('pdf_url')
        .eq('no_label', metaKey)
        .maybeSingle();

      if (error) {
        console.error(`Supabase error reading collection ${name}:`, error);
        return res.status(500).json({ error: "Gagal mengambil data koleksi aset" });
      }

      let individualItems: any[] = [];
      try {
        const itemRows = await fetchAllRows((from, to) =>
          supabaseAdmin
            .from('labels')
            .select('no_label, pdf_url')
            .like('no_label', `${itemPrefix}%`)
            .order('no_label', { ascending: true })
            .range(from, to)
        );

        if (itemRows && itemRows.length > 0) {
          itemRows.forEach(row => {
            if (row.pdf_url) {
              try {
                const parsed = JSON.parse(row.pdf_url);
                if (parsed && typeof parsed === 'object') individualItems.push(parsed);
              } catch (_) {}
            }
          });
        }
      } catch (_) {}

      let mainItems: any[] = [];
      if (mainData?.pdf_url) {
        try {
          const parsed = JSON.parse(mainData.pdf_url);
          if (Array.isArray(parsed)) mainItems = parsed;
        } catch (_) {}
      }

      if (!mainData && individualItems.length === 0) {
        return res.json({ found: false, items: null });
      }

      const combined: any[] = [...individualItems];
      mainItems.forEach(mainIt => {
        const exists = combined.some(indIt => isSameCollectionItem(mainIt, indIt));
        if (!exists) {
          combined.push(mainIt);
        }
      });

      // Filter out tombstones from fallback
      const finalItems = combined.filter((it: any) => {
        const key = it?.id || it?.sphNumber || it?.workOrderNumber || it?.bapNumber || it?.noLabel;
        return !key || !deletedIdSet.has(String(key).trim());
      });

      return res.json({ found: true, items: finalItems });
    } catch (err: any) {
      console.error(`API error in GET /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: "Terjadi kesalahan sistem saat memproses koleksi aset" });
    }
  });

  // POST /api/collections/:name (Protected with Role check, collection queue, idempotency, version conflict, financial audit lock, and batch upsert)
  app.post("/api/collections/:name", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name } = req.params;

      // 1. Whitelist validation
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }

      // 2. Role check for writing
      if (!canWriteCollection(req.userRole, name)) {
        return res.status(403).json({ error: "Akun belum memiliki hak akses untuk mengubah koleksi ini" });
      }

      // 3. Idempotency Check: simpan dengan kunci `${req.user.id}:${name}:${idempotencyKey}` SETELAH validasi whitelist dan role
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

      const { items, replaceAll } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Format data tidak valid: parameter items harus berupa array" });
      }

      // Execute inside serialized collection queue to prevent race conditions
      const result = await runInCollectionQueue(name, async () => {
        // 4. ATURAN: Mode replaceAll HANYA diizinkan untuk admin_utama.
        // Untuk role lain, replaceAll diabaikan dan wajib diganti dengan "upsert per item".
        const effectiveReplaceAll = (replaceAll === true) && (req.userRole === 'admin_utama');

        // 5. Fetch tombstones to ensure deleted items are never saved back to database
        const tombstonePrefix = `__tombstone_${name}_`;
        const deletedIdSet = new Set<string>();

        try {
          const { data: tombstoneRows } = await supabaseAdmin
            .from('labels')
            .select('pdf_name')
            .like('no_label', `${tombstonePrefix}%`);
          if (tombstoneRows && tombstoneRows.length > 0) {
            tombstoneRows.forEach(tr => {
              if (tr.pdf_name) deletedIdSet.add(String(tr.pdf_name).trim());
            });
          }
        } catch (_) {}

        // Filter incoming items against tombstones
        const cleanIncomingItems = items.filter(it => {
          const k = it?.id || it?.sphNumber || it?.workOrderNumber || it?.bapNumber || it?.noLabel;
          return !k || !deletedIdSet.has(String(k).trim());
        });

        const metaKey = `__aset_coll_${name}`;
        const itemPrefix = `__item_${name}_`;

        // 6. Fetch existing server items to handle version conflicts, financial audit locks, and upsert merging
        let existingItems: any[] = [];
        try {
          const { data: collRow } = await supabaseAdmin
            .from('app_collections')
            .select('data')
            .eq('collection_name', name)
            .maybeSingle();

          if (collRow && Array.isArray(collRow.data)) {
            existingItems = collRow.data;
          } else {
            // Fallback to labels meta row
            const { data: mainData } = await supabaseAdmin
              .from('labels')
              .select('pdf_url')
              .eq('no_label', metaKey)
              .maybeSingle();
            if (mainData?.pdf_url) {
              try {
                const parsed = JSON.parse(mainData.pdf_url);
                if (Array.isArray(parsed)) existingItems = parsed;
              } catch (_) {}
            }
          }
        } catch (_) {}

        // Build map of existing items
        const existingMap = new Map<string, any>();
        existingItems.forEach(it => {
          const k = getCollectionItemKey(it);
          if (k) existingMap.set(k, it);
        });

        const conflicts: any[] = [];
        const rejected: any[] = [];
        const itemsToPersist: any[] = [];
        const serverTimestamp = new Date().toISOString();

        for (const incoming of cleanIncomingItems) {
          if (!incoming || typeof incoming !== 'object') continue;
          const itemKey = getCollectionItemKey(incoming);
          const oldItem = existingMap.get(itemKey);

          // 7. Deteksi Konflik Versi Berbasis baseUpdatedAt DARI SERVER:
          // Jika oldItem ada dan incoming.baseUpdatedAt !== oldItem.updatedAt -> masukkan ke "conflicts", jangan timpa.
          // Item baru (tanpa oldItem) diterima. Item tanpa baseUpdatedAt untuk item yang sudah ada diperlakukan sebagai conflict kecuali pengirim admin_utama.
          if (oldItem) {
            const isMainAdmin = req.userRole === 'admin_utama';
            const incomingBase = incoming.baseUpdatedAt !== undefined && incoming.baseUpdatedAt !== null ? String(incoming.baseUpdatedAt).trim() : '';
            const serverUpdated = oldItem.updatedAt ? String(oldItem.updatedAt).trim() : '';

            if (!isMainAdmin && (!incomingBase || incomingBase !== serverUpdated)) {
              conflicts.push({
                id: incoming.id || itemKey,
                incomingBaseUpdatedAt: incoming.baseUpdatedAt || null,
                serverUpdatedAt: oldItem.updatedAt || null,
                serverItem: oldItem
              });
              // Skip overwriting this item with the conflicting incoming version
              continue;
            }
          }

          const processedItem = { ...incoming };
          delete (processedItem as any).baseUpdatedAt;

          // 8. KUNCI AUDIT KEUANGAN (Hanya untuk koleksi financialTransactions):
          // - Jika oldItem.auditStatus = 'Lolos Audit' atau 'Tidak Lolos Audit' dan pengirim bukan admin_utama:
          //   tolak perubahan field apa pun -> masukkan item ke array "rejected" dengan alasan "Transaksi sudah diaudit, hubungi Admin Utama".
          // - Catat setiap penolakan ke activity_log (action: 'BLOCKED_EDIT_AUDITED_TRX').
          if (name === 'financialTransactions') {
            const isMainAdmin = req.userRole === 'admin_utama';
            const isOldAudited = oldItem && (oldItem.auditStatus === 'Lolos Audit' || oldItem.auditStatus === 'Tidak Lolos Audit');

            if (isOldAudited && !isMainAdmin) {
              rejected.push({
                id: incoming.id || itemKey,
                reason: "Transaksi sudah diaudit, hubungi Admin Utama",
                item: oldItem
              });

              // Log blocked edit of audited transaction to activity_log
              try {
                await supabaseAdmin.from('activity_log').insert({
                  user_id: req.user?.id || null,
                  user_email: req.user?.email || null,
                  user_role: req.userRole || null,
                  action: 'BLOCKED_EDIT_AUDITED_TRX',
                  table_name: 'financialTransactions',
                  record_id: String(incoming.id || itemKey),
                  payload: {
                    reason: "Transaksi sudah diaudit, hubungi Admin Utama",
                    oldAuditStatus: oldItem.auditStatus,
                    attemptedChanges: incoming
                  },
                  ip_address: req.ip || null,
                  created_at: serverTimestamp
                });
              } catch (logErr) {
                console.error('[ActivityLog Error] Gagal mencatat blocked audit edit:', logErr);
              }

              // Do not apply changes; retain old audited item in the collection
              itemsToPersist.push(oldItem);
              continue;
            }

            if (!oldItem) {
              // Item transaksi baru
              if (!isMainAdmin) {
                processedItem.auditStatus = 'Belum Diaudit';
                processedItem.auditNotes = null;
                processedItem.auditorName = null;
                processedItem.auditedAt = null;
              } else {
                // Jika admin_utama langsung menentukan status audit pada transaksi baru
                if (processedItem.auditStatus && processedItem.auditStatus !== 'Belum Diaudit') {
                  processedItem.auditorName = req.user?.email || 'admin_utama';
                  processedItem.auditedAt = serverTimestamp;

                  try {
                    await supabaseAdmin.from('activity_log').insert({
                      user_id: req.user?.id || null,
                      user_email: req.user?.email || null,
                      user_role: req.userRole || null,
                      action: 'SET_INITIAL_AUDIT_STATUS',
                      table_name: 'financialTransactions',
                      record_id: String(processedItem.id || itemKey),
                      payload: {
                        oldStatus: 'Belum Diaudit',
                        newStatus: processedItem.auditStatus,
                        auditNotes: processedItem.auditNotes || null,
                        auditedAt: serverTimestamp
                      },
                      ip_address: req.ip || null,
                      created_at: serverTimestamp
                    });
                  } catch (logErr) {
                    console.error('[ActivityLog Error] Gagal mencatat initial audit status:', logErr);
                  }
                }
              }
            } else {
              // Item transaksi yang belum diaudit sebelumnya
              const oldStatus = oldItem.auditStatus || 'Belum Diaudit';
              const oldNotes = oldItem.auditNotes || null;
              const oldAuditor = oldItem.auditorName || null;
              const oldAudited = oldItem.auditedAt || null;

              if (!isMainAdmin) {
                // Non-admin_utama dilarang keras mengubah field audit: kembalikan ke nilai server lama
                processedItem.auditStatus = oldStatus;
                processedItem.auditNotes = oldNotes;
                processedItem.auditorName = oldAuditor;
                processedItem.auditedAt = oldAudited;
              } else {
                // admin_utama diperbolehkan mengaudit transaksi
                const isStatusChanged = processedItem.auditStatus && processedItem.auditStatus !== oldStatus;
                if (isStatusChanged) {
                  processedItem.auditorName = req.user?.email || 'admin_utama';
                  processedItem.auditedAt = serverTimestamp;

                  // Catat perubahan ke activity_log
                  try {
                    await supabaseAdmin.from('activity_log').insert({
                      user_id: req.user?.id || null,
                      user_email: req.user?.email || null,
                      user_role: req.userRole || null,
                      action: 'UPDATE_AUDIT_STATUS',
                      table_name: 'financialTransactions',
                      record_id: String(processedItem.id || itemKey),
                      payload: {
                        oldStatus,
                        newStatus: processedItem.auditStatus,
                        auditNotes: processedItem.auditNotes || null,
                        auditedAt: serverTimestamp
                      },
                      ip_address: req.ip || null,
                      created_at: serverTimestamp
                    });
                  } catch (logErr) {
                    console.error('[ActivityLog Error] Gagal mencatat perubahan audit status:', logErr);
                  }
                }
              }
            }
          }

          // Server adalah satu-satunya sumber pengisian updatedAt
          processedItem.updatedAt = serverTimestamp;
          itemsToPersist.push(processedItem);
        }

        let finalItems: any[] = [];

        if (effectiveReplaceAll) {
          // Mode replaceAll eksklusif admin_utama
          const { error: delErr } = await supabaseAdmin.from('labels').delete().like('no_label', `${itemPrefix}%`);
          if (delErr) {
            console.error(`Supabase error clearing collection items ${name}:`, delErr);
            throw new Error("Gagal memperbarui koleksi aset");
          }
          finalItems = itemsToPersist;
        } else {
          // Mode upsert per item
          finalItems = [...existingItems];
          for (const item of itemsToPersist) {
            const idx = finalItems.findIndex(eIt => isSameCollectionItem(eIt, item));
            if (idx >= 0) {
              finalItems[idx] = { ...finalItems[idx], ...item };
            } else {
              finalItems.unshift(item);
            }
          }
        }

        // 9. Simpan ke tabel labels (baris __item_*) SECARA BATCH (maks 200/batch)
        const labelBatchRows = itemsToPersist.map(it => {
          const itemKey = getCollectionItemKey(it);
          return {
            no_label: `${itemPrefix}${itemKey}`,
            status: 'asset_item',
            pdf_source: name,
            pdf_name: itemKey,
            pdf_url: JSON.stringify(it),
            updated_at: serverTimestamp
          };
        });

        const BATCH_SIZE = 200;
        for (let i = 0; i < labelBatchRows.length; i += BATCH_SIZE) {
          const chunk = labelBatchRows.slice(i, i + BATCH_SIZE);
          const { error: batchErr } = await supabaseAdmin
            .from('labels')
            .upsert(chunk, { onConflict: 'no_label' });

          if (batchErr) {
            console.error(`Supabase batch upsert error on collection ${name}:`, batchErr);
            throw new Error("Gagal menyimpan data koleksi ke database");
          }
        }

        // 10. Simpan metadata koleksi ke labels
        const { error: metaErr } = await supabaseAdmin
          .from('labels')
          .upsert({
            no_label: metaKey,
            status: 'asset_data',
            pdf_source: name,
            pdf_name: `Collection: ${name} (${finalItems.length} items)`,
            pdf_url: JSON.stringify(finalItems),
            updated_at: serverTimestamp
          }, { onConflict: 'no_label' });

        if (metaErr) {
          console.error(`Supabase meta upsert error on collection ${name}:`, metaErr);
          throw new Error("Gagal memperbarui metadata koleksi ke database");
        }

        // 11. Simpan ke tabel dedicated app_collections
        const { error: collErr } = await supabaseAdmin
          .from('app_collections')
          .upsert({
            collection_name: name,
            data: finalItems,
            updated_at: serverTimestamp
          }, { onConflict: 'collection_name' });

        if (collErr) {
          console.error(`Supabase app_collections error on collection ${name}:`, collErr);
          throw new Error("Gagal menyimpan koleksi ke database");
        }

        return {
          success: true,
          count: finalItems.length,
          items: finalItems,
          conflicts: conflicts.length > 0 ? conflicts : undefined,
          rejected: rejected.length > 0 ? rejected : undefined
        };
      });

      // Simpan ke memori & database idempotency store (10 menit)
      if (scopedIdempotencyKey) {
        await saveIdempotencyRecord(scopedIdempotencyKey, 200, result, req.user?.id);
      }

      return res.json(result);
    } catch (err: any) {
      console.error(`API error in POST /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: err?.message || "Terjadi kesalahan sistem saat menyimpan data koleksi" });
    }
  });

  // DELETE /api/collections/:name/:id (Delete individual item with Audit Lock & Mutex Queue)
  app.delete("/api/collections/:name/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, id } = req.params;

      // Whitelist validation
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }

      // Role check for delete follows write permission
      if (!canWriteCollection(req.userRole, name)) {
        return res.status(403).json({ error: "Akun belum memiliki hak akses untuk menghapus item dari koleksi ini" });
      }

      const result = await runInCollectionQueue(name, async () => {
        const metaKey = `__aset_coll_${name}`;
        const itemPrefix = `__item_${name}_`;
        const tombstonePrefix = `__tombstone_${name}_`;
        const sanitizeId = id.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const nowIso = new Date().toISOString();

        // 1. Fetch current item to check financial audit lock
        let currentItems: any[] = [];
        try {
          const { data: collRow } = await supabaseAdmin
            .from('app_collections')
            .select('data')
            .eq('collection_name', name)
            .maybeSingle();
          if (collRow && Array.isArray(collRow.data)) {
            currentItems = collRow.data;
          }
        } catch (_) {}

        const targetItem = currentItems.find((it: any) => 
          isSameCollectionItem(it, { id, sphNumber: id, noLabel: id, workOrderNumber: id, bapNumber: id })
        );

        // Kunci audit: DELETE item transaksi yang sudah diaudit HANYA boleh admin_utama
        if (name === 'financialTransactions' && targetItem) {
          const isAudited = targetItem.auditStatus === 'Lolos Audit' || targetItem.auditStatus === 'Tidak Lolos Audit';
          if (isAudited && req.userRole !== 'admin_utama') {
            try {
              await supabaseAdmin.from('activity_log').insert({
                user_id: req.user?.id || null,
                user_email: req.user?.email || null,
                user_role: req.userRole || null,
                action: 'BLOCKED_EDIT_AUDITED_TRX',
                table_name: 'financialTransactions',
                record_id: String(id),
                payload: {
                  reason: "Transaksi sudah diaudit, hubungi Admin Utama (Upaya Hapus Ditolak)",
                  auditStatus: targetItem.auditStatus,
                  item: targetItem
                },
                ip_address: req.ip || null,
                created_at: nowIso
              });
            } catch (_) {}

            const err: any = new Error("Akses ditolak: Transaksi yang sudah diaudit hanya dapat dihapus oleh Admin Utama");
            err.statusCode = 403;
            throw err;
          }
        }

        // 2. Delete item rows from labels
        const { error: delItemErr } = await supabaseAdmin
          .from('labels')
          .delete()
          .or(`no_label.eq.${itemPrefix}${sanitizeId},no_label.eq.${itemPrefix}${id}`);

        if (delItemErr) {
          console.error(`Supabase error deleting item row ${id}:`, delItemErr);
        }

        // 3. Record permanent tombstone in labels
        const { error: tombErr } = await supabaseAdmin
          .from('labels')
          .upsert({
            no_label: `${tombstonePrefix}${sanitizeId}`,
            status: 'deleted_tombstone',
            pdf_source: name,
            pdf_name: id,
            pdf_url: JSON.stringify({ id, deletedAt: nowIso }),
            updated_at: nowIso
          }, { onConflict: 'no_label' });

        if (tombErr) {
          console.error(`Supabase error recording tombstone for ${id}:`, tombErr);
        }

        // 4. Update dedicated app_collections table
        const remainingItems = currentItems.filter((it: any) => 
          !isSameCollectionItem(it, { id, sphNumber: id, noLabel: id, workOrderNumber: id, bapNumber: id })
        );

        await supabaseAdmin.from('app_collections').upsert({
          collection_name: name,
          data: remainingItems,
          updated_at: nowIso
        }, { onConflict: 'collection_name' });

        // 5. Update legacy labels table metaKey
        await supabaseAdmin.from('labels').upsert({
          no_label: metaKey,
          status: 'asset_data',
          pdf_source: name,
          pdf_name: `Collection: ${name} (${remainingItems.length} items)`,
          pdf_url: JSON.stringify(remainingItems),
          updated_at: nowIso
        }, { onConflict: 'no_label' });

        return { success: true, remaining: remainingItems.length, items: remainingItems };
      });

      res.json(result);
    } catch (err: any) {
      console.error(`API error in DELETE /api/collections/${req.params.name}/${req.params.id}:`, err);
      res.status(err.statusCode || 500).json({ error: err.message || "Terjadi kesalahan sistem saat menghapus data koleksi" });
    }
  });

  // DELETE /api/collections/:name (Clear entire collection - HANYA admin_utama)
  app.delete("/api/collections/:name", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const { name } = req.params;

      // Whitelist validation
      if (!VALID_COLLECTIONS.has(name)) {
        return res.status(400).json({ error: "Nama koleksi tidak valid" });
      }

      const result = await runInCollectionQueue(name, async () => {
        const metaKey = `__aset_coll_${name}`;
        const itemPrefix = `__item_${name}_`;
        const nowIso = new Date().toISOString();

        const { error: delErr } = await supabaseAdmin.from('labels').delete().like('no_label', `${itemPrefix}%`);
        if (delErr) {
          console.error(`Supabase error clearing items for ${name}:`, delErr);
          throw new Error("Gagal mengosongkan data koleksi");
        }

        await supabaseAdmin.from('labels').upsert({
          no_label: metaKey,
          status: 'asset_data',
          pdf_source: name,
          pdf_name: `Collection: ${name} (0 items)`,
          pdf_url: JSON.stringify([]),
          updated_at: nowIso
        }, { onConflict: 'no_label' });

        // Clear dedicated app_collections table
        await supabaseAdmin.from('app_collections').upsert({
          collection_name: name,
          data: [],
          updated_at: nowIso
        }, { onConflict: 'collection_name' });

        return { success: true, remaining: 0 };
      });

      res.json(result);
    } catch (err: any) {
      console.error(`API error in DELETE /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: err?.message || "Terjadi kesalahan sistem saat mengosongkan koleksi" });
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

      // 3. Path dokumen dicari dari koleksi di server (app_collections):
      // documentType 'sph' -> sphDocuments, 'spk' -> schedules, 'bap' -> bapDocuments, 'financial' -> financialTransactions
      if (documentId && documentType) {
        let collName = '';
        if (documentType === 'sph') collName = 'sphDocuments';
        else if (documentType === 'spk') collName = 'schedules';
        else if (documentType === 'bap') collName = 'bapDocuments';
        else if (documentType === 'financial') collName = 'financialTransactions';

        // Query app_collections first
        let foundItem: any = null;
        try {
          const { data: collRow } = await supabaseAdmin
            .from('app_collections')
            .select('data')
            .eq('collection_name', collName)
            .maybeSingle();

          if (collRow && Array.isArray(collRow.data)) {
            foundItem = collRow.data.find((it: any) => 
              isSameCollectionItem(it, { 
                id: documentId, 
                sphNumber: documentId, 
                workOrderNumber: documentId, 
                bapNumber: documentId, 
                noLabel: documentId 
              })
            );
          }
        } catch (_) {}

        // Fallback to labels individual item or meta
        if (!foundItem) {
          const sanitizeDocId = String(documentId).trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const { data: itemRow } = await supabaseAdmin
            .from('labels')
            .select('pdf_url')
            .eq('no_label', `__item_${collName}_${sanitizeDocId}`)
            .maybeSingle();

          if (itemRow?.pdf_url) {
            try {
              foundItem = JSON.parse(itemRow.pdf_url);
            } catch (_) {}
          }
        }

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
  const ALLOWED_SETTINGS_KEY_REGEX = /^(appConfig|templates|general|official_templates|company_profile|theme|branding|company_logo|aset_[a-zA-Z0-9_\-]+)$/;

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

      const { data, error: selectErr } = await supabaseAdmin.from('labels').select('no_label');
      if (selectErr) {
        console.error("Supabase sync select error:", selectErr);
        return res.status(500).json({ success: false, error: "Gagal membaca data label dari database" });
      }

      res.json({ success: true, count: data ? data.length : 0 });
    } catch (err: any) {
      console.error("API error in POST /api/supabase/sync:", err);
      res.status(500).json({ success: false, error: "Terjadi kesalahan sistem saat sinkronisasi" });
    }
  });

  return app;
}
