import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./src/server/supabaseAdmin";
import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust reverse proxy (Cloud Run / Nginx) for rate limiter and client IP resolution
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
        namaAlat: data.nama_alat || data.namaAlat || data.pdf_name || null,
        ruangan: data.ruangan || null,
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
        .not('no_label', 'like', '__meta_%')
        .not('no_label', 'like', '__aset_%')
        .not('no_label', 'like', '__item_%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase labels fetch error:", error);
        return res.status(500).json({ error: error.message });
      }

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
      res.status(500).json({ error: "Failed to retrieve labels" });
    }
  });

  /**
   * Helper to safely upsert labels to Supabase using supabaseAdmin.
   * Handles column name variations (pdf_original_url vs pdforiginal_url) and batching.
   */
  async function upsertLabelsAdmin(items: any[]): Promise<{ success: boolean; count: number; error?: any }> {
    if (!items || items.length === 0) return { success: true, count: 0 };

    const tryUpsert = async (payload: any[]) => {
      return await supabaseAdmin.from('labels').upsert(payload, { onConflict: 'no_label' });
    };

    const BATCH_SIZE = 200;
    let totalSaved = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);

      // Variant 1: Both pdf_original_url and pdforiginal_url
      const variantBoth = chunk.map(it => {
        const copy = { ...it };
        const origVal = copy.pdf_original_url || copy.pdforiginal_url || copy.pdfOriginalUrl || null;
        if (origVal) {
          copy.pdf_original_url = origVal;
          copy.pdforiginal_url = origVal;
        }
        delete copy.pdfOriginalUrl;
        return copy;
      });

      let res = await tryUpsert(variantBoth);
      if (!res.error) {
        totalSaved += chunk.length;
        continue;
      }

      // Variant 2: pdf_original_url only
      const variantOriginalOnly = chunk.map(it => {
        const copy = { ...it };
        const origVal = copy.pdf_original_url || copy.pdforiginal_url || copy.pdfOriginalUrl || null;
        if (origVal) {
          copy.pdf_original_url = origVal;
        }
        delete copy.pdforiginal_url;
        delete copy.pdfOriginalUrl;
        return copy;
      });

      res = await tryUpsert(variantOriginalOnly);
      if (!res.error) {
        totalSaved += chunk.length;
        continue;
      }

      // Variant 3: pdforiginal_url only
      const variantNoUnderscoreOnly = chunk.map(it => {
        const copy = { ...it };
        const origVal = copy.pdf_original_url || copy.pdforiginal_url || copy.pdfOriginalUrl || null;
        if (origVal) {
          copy.pdforiginal_url = origVal;
        }
        delete copy.pdf_original_url;
        delete copy.pdfOriginalUrl;
        return copy;
      });

      res = await tryUpsert(variantNoUnderscoreOnly);
      if (!res.error) {
        totalSaved += chunk.length;
        continue;
      }

      // Variant 4: Strip both pdf_original_url and pdforiginal_url
      const variantNoOriginalUrl = chunk.map(it => {
        const copy = { ...it };
        delete copy.pdf_original_url;
        delete copy.pdforiginal_url;
        delete copy.pdfOriginalUrl;
        return copy;
      });

      res = await tryUpsert(variantNoOriginalUrl);
      if (!res.error) {
        totalSaved += chunk.length;
        continue;
      }

      // Variant 5: Core fields only
      const variantCore = chunk.map(it => ({
        no_label: it.no_label || it.noLabel || it.id,
        nama_rs: it.nama_rs || it.namaRs || null,
        nama_alat: it.nama_alat || it.namaAlat || null,
        ruangan: it.ruangan || null,
        status: it.status || 'Menunggu Sertifikat',
        updated_at: new Date().toISOString()
      }));

      res = await tryUpsert(variantCore);
      if (!res.error) {
        totalSaved += chunk.length;
        continue;
      }

      console.error("Supabase bulk label upsert error:", res.error);
      return { success: false, count: totalSaved, error: res.error };
    }

    return { success: true, count: totalSaved };
  }

  app.post("/api/labels", requireAuth, async (req: AuthRequest, res) => {
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
        validUntil 
      } = req.body;

      if (!noLabel) {
        return res.status(400).json({ error: "noLabel is required" });
      }

      const finalNamaAlat = namaAlat || pdfName || null;

      const payload: any = {
        no_label: noLabel,
        nama_rs: namaRs || null,
        nama_alat: finalNamaAlat,
        ruangan: ruangan || null,
        status: status || 'Menunggu Sertifikat',
        pdf_source: pdfSource || null,
        pdf_url: pdfUrl || null,
        pdf_drive_url: pdfDriveUrl || null,
        pdforiginal_url: pdfOriginalUrl || null,
        pdf_original_url: pdfOriginalUrl || null,
        pdf_name: pdfName || finalNamaAlat || null,
        calibrated_at: calibratedAt || null,
        valid_until: validUntil || null,
        updated_at: new Date().toISOString()
      };

      // If namaRs is provided, save folder mapping in metadata so it is preserved
      if (namaRs && typeof namaRs === 'string' && namaRs.trim()) {
        const dotIdx = noLabel.indexOf('.');
        const prefix = dotIdx > 0 ? noLabel.substring(0, dotIdx) : (noLabel.length >= 3 ? noLabel.substring(0, 3) : noLabel);
        try {
          await upsertLabelsAdmin([{
            no_label: `__meta_folder_rs_${prefix}`,
            status: 'metadata',
            pdf_source: 'folder_rs_name',
            pdforiginal_url: namaRs.trim(),
            pdf_original_url: namaRs.trim(),
            updated_at: new Date().toISOString()
          }]);
        } catch (_) {}
      }

      const upsertRes = await upsertLabelsAdmin([payload]);

      if (!upsertRes.success) {
        console.error("Supabase label upsert error:", upsertRes.error);
        return res.status(500).json({ error: upsertRes.error?.message || "Failed to upsert label" });
      }

      res.json({ success: true, label: payload });
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
          nama_alat: it.namaAlat || it.nama_alat || it.pdfName || it.pdf_name || null,
          ruangan: it.ruangan || null,
          status: it.status || 'Menunggu Sertifikat',
          pdf_source: it.pdf_source || null,
          pdf_url: it.pdfUrl || it.pdf_url || null,
          pdf_drive_url: it.pdfDriveUrl || it.pdf_drive_url || null,
          pdforiginal_url: it.pdfOriginalUrl || it.pdforiginal_url || null,
          pdf_original_url: it.pdfOriginalUrl || it.pdforiginal_url || null,
          pdf_name: it.pdfName || it.pdf_name || null,
          calibrated_at: it.calibratedAt || it.calibrated_at || null,
          valid_until: it.validUntil || it.valid_until || null,
          updated_at: new Date().toISOString()
        }));

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
            pdforiginal_url: rsName,
            pdf_original_url: rsName,
            updated_at: new Date().toISOString()
          }]);
        } catch (_) {}
      }

      const result = await upsertLabelsAdmin(records);

      if (!result.success) {
        console.error("Supabase bulk label upsert error:", result.error);
        return res.status(500).json({ error: result.error?.message || "Failed to bulk save labels" });
      }

      res.json({ success: true, count: result.count });
    } catch (err: any) {
      console.error("API error in POST /api/labels/bulk:", err);
      res.status(500).json({ error: "Failed to bulk save labels" });
    }
  });

  app.delete("/api/labels/:noLabel", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { noLabel } = req.params;
      console.log(`[API] Deleting label: ${noLabel}`);
      const { error } = await supabaseAdmin
        .from('labels')
        .delete()
        .eq('no_label', noLabel);

      if (error) {
        console.error("Supabase delete label error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/labels/:noLabel:", err);
      res.status(500).json({ error: "Failed to delete label" });
    }
  });

  // Batch delete labels endpoint
  app.post("/api/labels/batch-delete", requireAuth, async (req: AuthRequest, res) => {
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
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, count: noLabels.length });
    } catch (err: any) {
      console.error("API error in POST /api/labels/batch-delete:", err);
      res.status(500).json({ error: "Failed to batch delete labels" });
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

      const escapedPrefix = prefix.replace(/[%_\\]/g, '\\$&');

      await supabaseAdmin.from('labels').delete().like('no_label', `${escapedPrefix}.%`);
      await supabaseAdmin.from('labels').delete().eq('no_label', prefix);
      await supabaseAdmin.from('labels').delete().eq('no_label', `__meta_folder_${prefix}`);
      await supabaseAdmin.from('labels').delete().eq('no_label', `__meta_folder_rs_${prefix}`);

      res.json({ success: true });
    } catch (err: any) {
      console.error("API error in DELETE /api/folders/prefix/:prefix:", err);
      res.status(500).json({ error: "Failed to delete folder prefix labels" });
    }
  });

  // --- API: DURABLE ASSET COLLECTIONS (SPH, Schedules, Calibrators, etc.) ---
  // Helper functions for collection item matching and keying
  function isSameCollectionItem(a: any, b: any): boolean {
    if (!a || !b) return false;
    if (a.id && b.id && String(a.id).trim() === String(b.id).trim()) return true;
    if (a.sphNumber && b.sphNumber && String(a.sphNumber).trim() === String(b.sphNumber).trim()) return true;
    if (a.workOrderNumber && b.workOrderNumber && String(a.workOrderNumber).trim() === String(b.workOrderNumber).trim()) return true;
    if (a.noLabel && b.noLabel && String(a.noLabel).trim() === String(b.noLabel).trim()) return true;
    if (a.no_label && b.no_label && String(a.no_label).trim() === String(b.no_label).trim()) return true;
    return false;
  }

  function getCollectionItemKey(it: any): string {
    if (!it || typeof it !== 'object') return `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const k = it.id || it.sphNumber || it.workOrderNumber || it.noLabel || it.no_label;
    return k ? String(k).trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_') : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  app.get("/api/collections/:name", async (req, res) => {
    try {
      const { name } = req.params;

      // 1. Try reading from dedicated app_collections table first
      try {
        const { data: collRow, error: collErr } = await supabaseAdmin
          .from('app_collections')
          .select('data')
          .eq('collection_name', name)
          .maybeSingle();

        if (!collErr && collRow && Array.isArray(collRow.data) && collRow.data.length > 0) {
          return res.json({ found: true, items: collRow.data });
        }
      } catch (_) {}

      const metaKey = `__aset_coll_${name}`;
      const itemPrefix = `__item_${name}_`;

      const { data: mainData, error } = await supabaseAdmin
        .from('labels')
        .select('pdf_url')
        .eq('no_label', metaKey)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const { data: itemRows } = await supabaseAdmin
        .from('labels')
        .select('no_label, pdf_url')
        .like('no_label', `${itemPrefix}%`);

      let mainItems: any[] = [];
      if (mainData?.pdf_url) {
        try {
          const parsed = JSON.parse(mainData.pdf_url);
          if (Array.isArray(parsed)) mainItems = parsed;
        } catch (_) {}
      }

      let individualItems: any[] = [];
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

      return res.json({ found: true, items: combined });
    } catch (err: any) {
      console.error(`API error in GET /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/collections/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const { items, replaceAll } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "items array is required" });
      }

      const metaKey = `__aset_coll_${name}`;
      const itemPrefix = `__item_${name}_`;

      let finalItems: any[] = [];

      if (replaceAll) {
        await supabaseAdmin.from('labels').delete().like('no_label', `${itemPrefix}%`);
        finalItems = items;
      } else {
        const { data: mainData } = await supabaseAdmin
          .from('labels')
          .select('pdf_url')
          .eq('no_label', metaKey)
          .maybeSingle();

        const { data: itemRows } = await supabaseAdmin
          .from('labels')
          .select('no_label, pdf_url')
          .like('no_label', `${itemPrefix}%`);

        let existing: any[] = [];
        if (itemRows && itemRows.length > 0) {
          itemRows.forEach(row => {
            if (row.pdf_url) {
              try {
                const parsed = JSON.parse(row.pdf_url);
                if (parsed) existing.push(parsed);
              } catch (_) {}
            }
          });
        }
        if (mainData?.pdf_url) {
          try {
            const parsed = JSON.parse(mainData.pdf_url);
            if (Array.isArray(parsed)) {
              parsed.forEach(mIt => {
                if (!existing.some(eIt => isSameCollectionItem(eIt, mIt))) {
                  existing.push(mIt);
                }
              });
            }
          } catch (_) {}
        }

        finalItems = [...existing];
        items.forEach(incomingIt => {
          const idx = finalItems.findIndex(eIt => isSameCollectionItem(eIt, incomingIt));
          if (idx >= 0) {
            finalItems[idx] = { ...finalItems[idx], ...incomingIt };
          } else {
            finalItems.unshift(incomingIt);
          }
        });
      }

      for (const it of finalItems) {
        const itemKey = getCollectionItemKey(it);
        const rowKey = `${itemPrefix}${itemKey}`;
        await supabaseAdmin.from('labels').upsert({
          no_label: rowKey,
          status: 'asset_item',
          pdf_source: name,
          pdf_name: itemKey,
          pdf_url: JSON.stringify(it),
          updated_at: new Date().toISOString()
        }, { onConflict: 'no_label' });
      }

      const { error } = await supabaseAdmin
        .from('labels')
        .upsert({
          no_label: metaKey,
          status: 'asset_data',
          pdf_source: name,
          pdf_name: `Collection: ${name} (${finalItems.length} items)`,
          pdf_url: JSON.stringify(finalItems),
          updated_at: new Date().toISOString()
        }, { onConflict: 'no_label' });

      // Also persist to dedicated app_collections table if present
      try {
        await supabaseAdmin.from('app_collections').upsert({
          collection_name: name,
          data: finalItems,
          updated_at: new Date().toISOString()
        }, { onConflict: 'collection_name' });
      } catch (_) {}

      if (error) {
        console.error(`Supabase error saving collection ${name}:`, error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, count: finalItems.length, items: finalItems });
    } catch (err: any) {
      console.error(`API error in POST /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/collections/:name/:id", async (req, res) => {
    try {
      const { name, id } = req.params;
      const metaKey = `__aset_coll_${name}`;
      const itemPrefix = `__item_${name}_`;
      console.log(`[API] Deleting item ${id} from collection ${name}`);

      const sanitizeId = id.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      await supabaseAdmin.from('labels').delete().eq('no_label', `${itemPrefix}${sanitizeId}`);
      await supabaseAdmin.from('labels').delete().eq('no_label', `${itemPrefix}${id}`);

      const { data: itemRows } = await supabaseAdmin
        .from('labels')
        .select('pdf_url')
        .like('no_label', `${itemPrefix}%`);

      let remainingItems: any[] = [];
      if (itemRows && itemRows.length > 0) {
        itemRows.forEach(row => {
          if (row.pdf_url) {
            try {
              const parsed = JSON.parse(row.pdf_url);
              if (parsed && !isSameCollectionItem(parsed, { id, sphNumber: id, noLabel: id })) {
                remainingItems.push(parsed);
              }
            } catch (_) {}
          }
        });
      }

      await supabaseAdmin.from('labels').upsert({
        no_label: metaKey,
        status: 'asset_data',
        pdf_source: name,
        pdf_name: `Collection: ${name} (${remainingItems.length} items)`,
        pdf_url: JSON.stringify(remainingItems),
        updated_at: new Date().toISOString()
      }, { onConflict: 'no_label' });

      res.json({ success: true, remaining: remainingItems.length, items: remainingItems });
    } catch (err: any) {
      console.error(`API error in DELETE /api/collections/${req.params.name}/${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/collections/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const metaKey = `__aset_coll_${name}`;
      const itemPrefix = `__item_${name}_`;
      console.log(`[API] Clearing entire collection ${name}`);

      await supabaseAdmin.from('labels').delete().like('no_label', `${itemPrefix}%`);
      await supabaseAdmin.from('labels').upsert({
        no_label: metaKey,
        status: 'asset_data',
        pdf_source: name,
        pdf_name: `Collection: ${name} (0 items)`,
        pdf_url: JSON.stringify([]),
        updated_at: new Date().toISOString()
      }, { onConflict: 'no_label' });

      res.json({ success: true, remaining: 0 });
    } catch (err: any) {
      console.error(`API error in DELETE /api/collections/${req.params.name}:`, err);
      res.status(500).json({ error: err.message });
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

      // 1. Anti-IDOR validation: If documentId & documentType provided, query database to resolve stored path
      if (documentId && documentType) {
        let dbTable = '';
        if (documentType === 'sph') {
          dbTable = 'sph_documents';
        } else if (documentType === 'spk') {
          dbTable = 'schedules';
        } else if (documentType === 'bap') {
          dbTable = 'bap_documents';
        } else {
          return res.status(400).json({ error: "documentType tidak valid (harus: 'sph', 'spk', atau 'bap')" });
        }

        const { data: docRecord, error: docError } = await supabaseAdmin
          .from(dbTable)
          .select('*')
          .eq('id', documentId)
          .maybeSingle();

        if (docError || !docRecord) {
          return res.status(404).json({ error: "Dokumen tidak ditemukan di database" });
        }

        // Check top-level column, JSONB data column, and alternate naming conventions
        const recordPdfPath = docRecord.pdf_url || docRecord.pdfUrl 
          || docRecord?.data?.pdfUrl || docRecord?.data?.pdf_url 
          || docRecord.file_path;

        if (!recordPdfPath || typeof recordPdfPath !== 'string') {
          return res.status(404).json({ error: "Lampiran dokumen PDF belum diunggah untuk dokumen ini" });
        }

        targetPath = recordPdfPath.trim().replace(/^\/+/, '');
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

  // --- API: SUPABASE STATUS & SYNC CHECK (Protected by requireAuth) ---
  app.get("/api/supabase/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { error } = await supabaseAdmin.from('labels').select('count', { count: 'exact', head: true });
      if (error) {
        return res.json({ connected: false, tableReady: false, message: error.message });
      }
      res.json({
        connected: true,
        tableReady: true
      });
    } catch (err: any) {
      res.json({ connected: false, tableReady: false, message: err.message });
    }
  });

  app.post("/api/supabase/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { error } = await supabaseAdmin.from('labels').select('count', { count: 'exact', head: true });
      if (error) {
        return res.status(400).json({ success: false, error: error.message || 'Tabel labels belum siap di Supabase' });
      }

      const { data, error: selectErr } = await supabaseAdmin.from('labels').select('no_label');
      if (selectErr) {
        return res.status(500).json({ success: false, error: selectErr.message });
      }

      res.json({ success: true, count: data ? data.length : 0 });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development & SPA catch-all fallback
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
    console.log(`Server running on http://0.0.0.0:${PORT} with Supabase backend`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting server:", err);
  process.exit(1);
});

