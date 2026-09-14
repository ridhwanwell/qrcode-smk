import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./src/server/supabaseAdmin";
import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // --- API: HEALTH CHECK ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), database: "supabase" });
  });

  // --- API: PUBLIC SCAN LOOKUP (For hospital staff scanning QR code on equipment stickers) ---
  app.get("/api/labels/:noLabel", async (req, res) => {
    try {
      const { noLabel } = req.params;
      const { data, error } = await supabaseAdmin
        .from('labels')
        .select('*')
        .eq('no_label', noLabel)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: "Gagal mengambil data label" });
      }

      if (!data) {
        return res.status(404).json({ error: "Label tidak ditemukan" });
      }

      // Format for frontend response
      res.json({
        noLabel: data.no_label,
        namaRs: data.nama_rs,
        status: data.status,
        pdfSource: data.pdf_source,
        pdfUrl: data.pdf_url,
        pdfDriveUrl: data.pdf_drive_url,
        pdfOriginalUrl: data.pdforiginal_url,
        pdfName: data.pdf_name,
        calibratedAt: data.calibrated_at,
        validUntil: data.valid_until,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });
    } catch (err: any) {
      console.error("API error in GET /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Gagal memproses permintaan label" });
    }
  });

  // --- API: ADMIN LABELS (Protected by requireAuth) ---
  app.get("/api/labels", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('labels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase labels fetch error:", error);
        return res.status(500).json({ error: error.message });
      }

      const formatted = (data || []).map((it: any) => ({
        noLabel: it.no_label,
        namaRs: it.nama_rs,
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
      res.status(500).json({ error: "Failed to retrieve labels" });
    }
  });

  app.post("/api/labels", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { 
        noLabel, 
        namaRs, 
        status, 
        pdfSource, 
        pdfUrl, 
        pdfDriveUrl, 
        pdfOriginalUrl, 
        pdfName, 
        calibratedAt, 
        validUntil 
      } = req.body;

      if (!noLabel) {
        return res.status(400).json({ error: "noLabel is required" });
      }

      const payload = {
        no_label: noLabel,
        nama_rs: namaRs || null,
        status: status || 'Menunggu Sertifikat',
        pdf_source: pdfSource || null,
        pdf_url: pdfUrl || null,
        pdf_drive_url: pdfDriveUrl || null,
        pdforiginal_url: pdfOriginalUrl || null,
        pdf_name: pdfName || null,
        calibrated_at: calibratedAt || null,
        valid_until: validUntil || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('labels')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase label upsert error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, label: data });
    } catch (err: any) {
      console.error("API error in POST /api/labels:", err);
      res.status(500).json({ error: "Failed to save label" });
    }
  });

  app.post("/api/labels/bulk", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      const records = items
        .filter((it: any) => it && (it.noLabel || it.no_label || it.id))
        .map((it: any) => ({
          no_label: it.noLabel || it.no_label || it.id,
          nama_rs: it.namaRs || it.nama_rs || null,
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

      const { error } = await supabaseAdmin
        .from('labels')
        .upsert(records);

      if (error) {
        console.error("Supabase bulk label upsert error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, count: records.length });
    } catch (err: any) {
      console.error("API error in POST /api/labels/bulk:", err);
      res.status(500).json({ error: "Failed to bulk save labels" });
    }
  });

  app.delete("/api/labels/:noLabel", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { noLabel } = req.params;
      const { error } = await supabaseAdmin
        .from('labels')
        .delete()
        .eq('no_label', noLabel);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Failed to delete label" });
    }
  });

  // --- API: FOLDERS (Protected by requireAuth) ---
  app.get("/api/folders", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('label_folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json(data || []);
    } catch (err: any) {
      console.error("API error in GET /api/folders:", err);
      res.status(500).json({ error: "Failed to retrieve folders" });
    }
  });

  app.post("/api/folders", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id, name, color, labelIds } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: "id and name are required" });
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
        return res.status(500).json({ error: error.message });
      }

      res.json(data);
    } catch (err: any) {
      console.error("API error in POST /api/folders:", err);
      res.status(500).json({ error: "Failed to save folder" });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('label_folders')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/:id:", err);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  // Strict sanitization & escaping for folder prefix deletion to prevent wildcards like % or _
  app.delete("/api/folders/prefix/:prefix", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { prefix } = req.params;
      
      // Validate prefix strictly: only allow alphanumeric, dash, underscore, and dots
      if (!prefix || !/^[a-zA-Z0-9._-]+$/.test(prefix)) {
        return res.status(400).json({ error: "Invalid prefix format. Only alphanumeric and .-_ allowed." });
      }

      // Escape any potential SQL LIKE wildcards defensively
      const escapedPrefix = prefix.replace(/[%_\\]/g, '\\$&');

      await supabaseAdmin.from('labels').delete().like('no_label', `${escapedPrefix}.%`);
      await supabaseAdmin.from('labels').delete().eq('no_label', prefix);
      await supabaseAdmin.from('labels').delete().eq('no_label', `__meta_folder_${prefix}`);

      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/prefix/:prefix:", err);
      res.status(500).json({ error: "Failed to delete folder prefix labels" });
    }
  });

  // --- API: SIGNED URL GENERATION FOR PRIVATE DOCUMENTS (SPH, SPK, BAP, ETC.) ---
  // Protected with Authentication, Role Check, Path Traversal Check, Prefix Whitelisting, and No-Cache Headers
  app.post("/api/storage/signed-url", requireAuth, requireRole(['admin_utama', 'admin_keuangan', 'admin_teknik']), async (req: AuthRequest, res) => {
    try {
      // Set strict no-cache headers so temporary signed URLs are never cached by intermediaries
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const { filePath, documentId, documentType, expiresIn = 900 } = req.body;
      
      let targetPath = typeof filePath === 'string' ? filePath.trim().replace(/^\/+/, '') : '';

      // 1. If documentId & documentType provided, verify ownership and fetch stored file path from database (Anti-IDOR)
      if (documentId && documentType) {
        let dbTable = '';
        let urlColumn = 'pdf_url';

        if (documentType === 'sph') {
          dbTable = 'sph_documents';
        } else if (documentType === 'spk') {
          dbTable = 'spk_documents';
        } else if (documentType === 'bap') {
          dbTable = 'bap_documents';
        }

        if (dbTable) {
          const { data: docRecord, error: docError } = await supabaseAdmin
            .from(dbTable)
            .select('*')
            .eq('id', documentId)
            .maybeSingle();

          if (docError || !docRecord) {
            return res.status(404).json({ error: "Dokumen tidak ditemukan atau akses ditolak" });
          }

          const recordPdfPath = docRecord.pdf_url || docRecord.pdfUrl || docRecord.file_path;
          if (recordPdfPath && typeof recordPdfPath === 'string') {
            targetPath = recordPdfPath.replace(/^\/+/, '');
          }
        }
      }

      if (!targetPath) {
        return res.status(400).json({ error: "Parameter filePath atau documentId & documentType diperlukan" });
      }

      // 2. Anti-Path-Traversal check
      if (targetPath.includes('..') || targetPath.includes('\\') || targetPath.includes('\0')) {
        return res.status(400).json({ error: "Path file tidak valid (deteksi path traversal)" });
      }

      // 3. Strict Folder Prefix Whitelist for internal-documents
      const ALLOWED_PRIVATE_PREFIXES = /^(sph|spk|bap|financial|invoices|contracts)\//i;
      if (!ALLOWED_PRIVATE_PREFIXES.test(targetPath)) {
        return res.status(403).json({ error: "Akses ditolak: Folder bukan bagian dari dokumen privat yang diizinkan" });
      }

      // 4. Safe TTL (Default 15 minutes, maximum cap 900 seconds)
      const safeTtl = Math.min(Math.max(Number(expiresIn) || 900, 60), 900);

      const { data, error } = await supabaseAdmin.storage
        .from('internal-documents')
        .createSignedUrl(targetPath, safeTtl);

      if (error) {
        console.error("Failed to generate signed URL for path:", targetPath, error);
        return res.status(500).json({ error: "Gagal membuat URL akses dokumen privat" });
      }

      res.json({ 
        signedUrl: data.signedUrl, 
        expiresIn: safeTtl,
        filePath: targetPath
      });
    } catch (err: any) {
      console.error("API error in /api/storage/signed-url:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- API: SETTINGS (Protected by requireAuth; POST restricted to admin_utama) ---
  app.get("/api/settings/:key", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { key } = req.params;
      const { data } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      res.json({ key, value: data ? data.value : null });
    } catch (err: any) {
      console.warn("API warning in GET /api/settings/:key:", err);
      res.json({ key: req.params.key, value: null });
    }
  });

  // Only admin_utama can modify official templates and system settings
  app.post("/api/settings/:key", requireAuth, requireRole(['admin_utama']), async (req: AuthRequest, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      await supabaseAdmin
        .from('settings')
        .upsert({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updated_at: new Date().toISOString()
        });

      res.json({ success: true });
    } catch (err: any) {
      console.warn("API error in POST /api/settings/:key:", err);
      res.status(500).json({ error: "Gagal menyimpan pengaturan" });
    }
  });

  // --- API: SUPABASE STATUS CHECK (Protected by requireAuth, sanitized response) ---
  app.get("/api/supabase/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { error } = await supabaseAdmin.from('labels').select('count', { count: 'exact', head: true });
      res.json({
        connected: !error
      });
    } catch (err: any) {
      res.json({ connected: false });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} with Supabase backend`);
  });
}

startServer();
