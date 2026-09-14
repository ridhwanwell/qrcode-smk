import { db } from './index.ts';
import { labels, labelFolders, templates, settings, users } from './schema.ts';
import { eq, desc, like, or, inArray } from 'drizzle-orm';

// --- LABELS ---
export async function getAllFolderHospitalNames(): Promise<Record<string, string>> {
  try {
    const all = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const item of all) {
      if (item.key.startsWith('folder_rs:')) {
        const prefix = item.key.replace('folder_rs:', '');
        try {
          const val = typeof item.value === 'string' ? item.value : JSON.parse(item.value);
          if (val && typeof val === 'string') {
            map[prefix] = val;
          }
        } catch {
          map[prefix] = item.value;
        }
      }
    }
    return map;
  } catch (err) {
    console.error('Failed to get all folder hospital names:', err);
    return {};
  }
}

export async function getFolderHospitalName(prefix: string): Promise<string | null> {
  try {
    const val = await getSetting(`folder_rs:${prefix}`);
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export async function setFolderHospitalName(prefix: string, namaRs: string | null) {
  try {
    const trimmed = namaRs?.trim() || '';
    await setSetting(`folder_rs:${prefix}`, trimmed);
    return true;
  } catch (err) {
    console.error(`Failed to set folder hospital name for ${prefix}:`, err);
    return false;
  }
}

export async function getAllLabels() {
  try {
    const items = await db.select().from(labels).orderBy(desc(labels.createdAt));
    const folderRsMap = await getAllFolderHospitalNames();
    
    // Automatically inherit folder hospital name if label has none
    return items.map(item => {
      if (!item.namaRs || !item.namaRs.trim()) {
        const prefix = item.noLabel.includes('.') ? item.noLabel.split('.')[0] : item.noLabel;
        if (folderRsMap[prefix]) {
          return { ...item, namaRs: folderRsMap[prefix] };
        }
      }
      return item;
    });
  } catch (error) {
    console.error("Database query failed in getAllLabels:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getLabelByNo(noLabel: string) {
  try {
    const result = await db.select().from(labels).where(eq(labels.noLabel, noLabel));
    if (result.length > 0) {
      const item = result[0];
      if (!item.namaRs || !item.namaRs.trim()) {
        const prefix = item.noLabel.includes('.') ? item.noLabel.split('.')[0] : item.noLabel;
        const folderRs = await getFolderHospitalName(prefix);
        if (folderRs) {
          return { ...item, namaRs: folderRs };
        }
      }
      return item;
    }
    return null;
  } catch (error) {
    console.error("Database query failed in getLabelByNo:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertLabel(data: {
  noLabel: string;
  namaRs?: string | null;
  status?: string;
  pdfSource?: string | null;
  pdfUrl?: string | null;
  pdfDriveUrl?: string | null;
  pdfOriginalUrl?: string | null;
  pdfName?: string | null;
  calibratedAt?: string | null;
  validUntil?: string | null;
}) {
  try {
    const prefix = data.noLabel.includes('.') ? data.noLabel.split('.')[0] : data.noLabel;
    const folderRs = await getFolderHospitalName(prefix);

    // If namaRs is provided, also set as folder RS if not yet set
    if (data.namaRs && data.namaRs.trim() && !folderRs) {
      await setFolderHospitalName(prefix, data.namaRs.trim());
    }

    const effectiveNamaRs = data.namaRs !== undefined 
      ? (data.namaRs || (folderRs || null))
      : (folderRs || null);

    const existing = await getLabelByNo(data.noLabel);
    if (existing) {
      const updated = await db.update(labels)
        .set({
          namaRs: data.namaRs !== undefined ? effectiveNamaRs : (existing.namaRs || effectiveNamaRs),
          status: data.status !== undefined ? data.status : existing.status,
          pdfSource: data.pdfSource !== undefined ? data.pdfSource : existing.pdfSource,
          pdfUrl: data.pdfUrl !== undefined ? data.pdfUrl : existing.pdfUrl,
          pdfDriveUrl: data.pdfDriveUrl !== undefined ? data.pdfDriveUrl : existing.pdfDriveUrl,
          pdfOriginalUrl: data.pdfOriginalUrl !== undefined ? data.pdfOriginalUrl : existing.pdfOriginalUrl,
          pdfName: data.pdfName !== undefined ? data.pdfName : existing.pdfName,
          calibratedAt: data.calibratedAt !== undefined ? data.calibratedAt : existing.calibratedAt,
          validUntil: data.validUntil !== undefined ? data.validUntil : existing.validUntil,
          updatedAt: new Date(),
        })
        .where(eq(labels.noLabel, data.noLabel))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(labels)
        .values({
          noLabel: data.noLabel,
          namaRs: effectiveNamaRs,
          status: data.status || 'Menunggu Sertifikat',
          pdfSource: data.pdfSource || null,
          pdfUrl: data.pdfUrl || null,
          pdfDriveUrl: data.pdfDriveUrl || null,
          pdfOriginalUrl: data.pdfOriginalUrl || null,
          pdfName: data.pdfName || null,
          calibratedAt: data.calibratedAt || null,
          validUntil: data.validUntil || null,
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error("Database query failed in upsertLabel:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function deleteLabelByNo(noLabel: string) {
  try {
    await db.delete(labels).where(eq(labels.noLabel, noLabel));
    return true;
  } catch (error) {
    console.error("Database query failed in deleteLabelByNo:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function deleteLabelsByPrefix(prefix: string) {
  try {
    const deleted = await db
      .delete(labels)
      .where(or(like(labels.noLabel, `${prefix}.%`), eq(labels.noLabel, prefix)))
      .returning();
    return deleted.length;
  } catch (error) {
    console.error("Database query failed in deleteLabelsByPrefix:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function deleteBatchLabelsByNos(nos: string[]) {
  try {
    if (!nos || nos.length === 0) return true;
    await db.delete(labels).where(inArray(labels.noLabel, nos));
    return true;
  } catch (error) {
    console.error("Database query failed in deleteBatchLabelsByNos:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function updateLabelsNamaRsByPrefix(prefix: string, namaRs: string | null) {
  try {
    const trimmed = namaRs?.trim() || null;
    // 1. Permanently store hospital name for this folder prefix in settings
    await setFolderHospitalName(prefix, trimmed);

    // 2. Update all matching labels in Cloud SQL
    const all = await db.select().from(labels);
    const matching = all.filter(l => l.noLabel.startsWith(prefix + '.') || l.noLabel === prefix);
    for (const item of matching) {
      await db.update(labels)
        .set({ namaRs: trimmed, updatedAt: new Date() })
        .where(eq(labels.noLabel, item.noLabel));
    }
    return matching.length;
  } catch (error) {
    console.error("Database query failed in updateLabelsNamaRsByPrefix:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// --- FOLDERS ---
export async function getAllFolders() {
  try {
    return await db.select().from(labelFolders).orderBy(desc(labelFolders.createdAt));
  } catch (error) {
    console.error("Database query failed in getAllFolders:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertFolder(id: string, name: string, color: string, labelIds: string[]) {
  try {
    const existing = await db.select().from(labelFolders).where(eq(labelFolders.id, id));
    const labelIdsStr = JSON.stringify(labelIds || []);
    if (existing.length > 0) {
      const updated = await db.update(labelFolders)
        .set({ name, color, labelIds: labelIdsStr, updatedAt: new Date() })
        .where(eq(labelFolders.id, id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(labelFolders)
        .values({ id, name, color, labelIds: labelIdsStr })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error("Database query failed in upsertFolder:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function deleteFolderById(id: string) {
  try {
    await db.delete(labelFolders).where(eq(labelFolders.id, id));
    return true;
  } catch (error) {
    console.error("Database query failed in deleteFolderById:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// --- SETTINGS ---
const settingsMemoryCache = new Map<string, any>();

export async function getSetting(key: string) {
  try {
    const res = await db.select().from(settings).where(eq(settings.key, key));
    if (res.length > 0) {
      try {
        const parsed = JSON.parse(res[0].value);
        settingsMemoryCache.set(key, parsed);
        return parsed;
      } catch {
        settingsMemoryCache.set(key, res[0].value);
        return res[0].value;
      }
    }
    return settingsMemoryCache.get(key) || null;
  } catch (error) {
    console.warn("Database query warning in getSetting (fallback to cache):", error);
    return settingsMemoryCache.get(key) || null;
  }
}

export async function setSetting(key: string, value: any) {
  settingsMemoryCache.set(key, value);
  try {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      await db.update(settings).set({ value: valueStr, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value: valueStr });
    }
    return true;
  } catch (error) {
    console.warn("Database query warning in setSetting (saved in memory cache):", error);
    return true;
  }
}
