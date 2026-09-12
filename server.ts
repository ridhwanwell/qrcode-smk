import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  getAllLabels, 
  getLabelByNo, 
  upsertLabel, 
  deleteLabelByNo,
  deleteLabelsByPrefix,
  deleteBatchLabelsByNos,
  updateLabelsNamaRsByPrefix,
  getAllFolders,
  upsertFolder,
  deleteFolderById,
  getSetting,
  setSetting,
  getAllFolderHospitalNames,
  getFolderHospitalName,
  setFolderHospitalName
} from "./src/db/queries.ts";
import { 
  testSupabaseConnection, 
  syncLabelToSupabase, 
  deleteLabelFromSupabase, 
  bulkSyncLabelsToSupabase,
  fetchAllLabelsFromSupabase
} from "./src/lib/supabaseSync.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", engine: "PostgreSQL Cloud SQL" });
  });

  // --- API: LABELS ---
  app.get("/api/labels", async (req, res) => {
    try {
      const all = await getAllLabels();
      res.json(all);
    } catch (err: any) {
      console.error("API error in GET /api/labels:", err);
      res.status(500).json({ error: "Failed to retrieve labels from database" });
    }
  });

  app.get("/api/labels/:noLabel", async (req, res) => {
    try {
      const item = await getLabelByNo(req.params.noLabel);
      if (!item) {
        return res.status(404).json({ error: "Label not found" });
      }
      res.json(item);
    } catch (err: any) {
      console.error("API error in GET /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Failed to retrieve label" });
    }
  });

  app.post("/api/labels", async (req, res) => {
    try {
      const { noLabel, namaRs, status, pdfSource, pdfUrl, pdfDriveUrl, pdfOriginalUrl, pdfName, calibratedAt, validUntil } = req.body;
      if (!noLabel) {
        return res.status(400).json({ error: "noLabel is required" });
      }
      const saved = await upsertLabel({
        noLabel,
        namaRs,
        status,
        pdfSource,
        pdfUrl,
        pdfDriveUrl,
        pdfOriginalUrl,
        pdfName,
        calibratedAt,
        validUntil,
      });

      // Synchronize to Supabase asynchronously
      syncLabelToSupabase(saved).catch(() => {});

      res.json(saved);
    } catch (err: any) {
      console.error("API error in POST /api/labels:", err);
      res.status(500).json({ error: "Failed to save label to database" });
    }
  });

  app.post("/api/labels/bulk", async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "items array is required" });
      }
      for (const it of items) {
        if (it && (it.noLabel || it.id)) {
          await upsertLabel({
            noLabel: it.noLabel || it.id,
            namaRs: it.namaRs || it.nama_rs,
            status: it.status,
            pdfSource: it.pdfSource,
            pdfUrl: it.pdfUrl,
            pdfDriveUrl: it.pdfDriveUrl,
            pdfOriginalUrl: it.pdfOriginalUrl,
            pdfName: it.pdfName,
            calibratedAt: it.calibratedAt,
            validUntil: it.validUntil,
          });
        }
      }

      // Synchronize to Supabase asynchronously
      bulkSyncLabelsToSupabase(items).catch(() => {});

      res.json({ success: true, count: items.length });
    } catch (err: any) {
      console.error("API error in POST /api/labels/bulk:", err);
      res.status(500).json({ error: "Failed to bulk save labels" });
    }
  });

  app.delete("/api/labels/:noLabel", async (req, res) => {
    try {
      await deleteLabelByNo(req.params.noLabel);
      deleteLabelFromSupabase(req.params.noLabel).catch(() => {});
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Failed to delete label" });
    }
  });

  app.delete("/api/folders/:prefix", async (req, res) => {
    try {
      const { prefix } = req.params;
      const count = await deleteLabelsByPrefix(prefix);
      res.json({ success: true, count });
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/:prefix:", err);
      res.status(500).json({ error: "Failed to delete folder labels" });
    }
  });

  app.get("/api/folders/nama-rs", async (req, res) => {
    try {
      const map = await getAllFolderHospitalNames();
      res.json(map);
    } catch (err: any) {
      console.error("API error in GET /api/folders/nama-rs:", err);
      res.status(500).json({ error: "Failed to retrieve folder hospital names" });
    }
  });

  app.put("/api/folders/:prefix/nama-rs", async (req, res) => {
    try {
      const { prefix } = req.params;
      const { namaRs } = req.body;
      const trimmed = typeof namaRs === 'string' ? namaRs.trim() : null;
      const count = await updateLabelsNamaRsByPrefix(prefix, trimmed);
      res.json({ success: true, count, namaRs: trimmed, prefix });
    } catch (err: any) {
      console.error("API error in PUT /api/folders/:prefix/nama-rs:", err);
      res.status(500).json({ error: "Failed to update hospital name for folder" });
    }
  });

  // --- API: SUPABASE STATUS & SYNC ---
  app.get("/api/supabase/status", async (req, res) => {
    try {
      const result = await testSupabaseConnection();
      res.json({
        ...result,
        projectId: "auzpctxhltcdzdhcaetb",
        url: "https://auzpctxhltcdzdhcaetb.supabase.co"
      });
    } catch (err: any) {
      res.status(500).json({ connected: false, message: err?.message });
    }
  });

  app.post("/api/supabase/sync", async (req, res) => {
    try {
      const all = await getAllLabels();
      const result = await bulkSyncLabelsToSupabase(all);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // --- API: FOLDERS ---
  app.get("/api/folders", async (req, res) => {
    try {
      const all = await getAllFolders();
      res.json(all);
    } catch (err: any) {
      console.error("API error in GET /api/folders:", err);
      res.status(500).json({ error: "Failed to retrieve folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const { id, name, color, labelIds } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: "id and name are required" });
      }
      const saved = await upsertFolder(id, name, color || '#3b82f6', labelIds || []);
      res.json(saved);
    } catch (err: any) {
      console.error("API error in POST /api/folders:", err);
      res.status(500).json({ error: "Failed to save folder" });
    }
  });

  app.delete("/api/folders/:id", async (req, res) => {
    try {
      await deleteFolderById(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/:id:", err);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  // --- API: SETTINGS ---
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const val = await getSetting(req.params.key);
      res.json({ key: req.params.key, value: val });
    } catch (err: any) {
      console.error("API error in GET /api/settings/:key:", err);
      res.status(500).json({ error: "Failed to retrieve setting" });
    }
  });

  app.post("/api/settings/:key", async (req, res) => {
    try {
      await setSetting(req.params.key, req.body.value);
      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in POST /api/settings/:key:", err);
      res.status(500).json({ error: "Failed to save setting" });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    
    // Background backfill: sync any existing labels from Supabase to Cloud SQL
    fetchAllLabelsFromSupabase().then(async (supaLabels) => {
      if (supaLabels && supaLabels.length > 0) {
        for (const item of supaLabels) {
          if (item && item.no_label) {
            try {
              await upsertLabel({
                noLabel: item.no_label,
                status: item.status || 'Menunggu Sertifikat',
                pdfSource: item.pdf_source || null,
                pdfUrl: item.pdf_url || null,
                pdfDriveUrl: item.pdf_drive_url || null,
                pdfOriginalUrl: item.pdforiginal_url || null,
                pdfName: item.pdf_name || null,
                calibratedAt: item.calibrated_at || null,
                validUntil: item.valid_until || null,
              });
            } catch {
              // non-fatal
            }
          }
        }
      }
    }).catch(() => {});
  });
}

startServer();
