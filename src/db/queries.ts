import { db } from './index.ts';
import { labels, labelFolders, templates, settings, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

// --- LABELS ---
export async function getAllLabels() {
  try {
    return await db.select().from(labels).orderBy(desc(labels.createdAt));
  } catch (error) {
    console.error("Database query failed in getAllLabels:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getLabelByNo(noLabel: string) {
  try {
    const result = await db.select().from(labels).where(eq(labels.noLabel, noLabel));
    return result[0] || null;
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
    const existing = await getLabelByNo(data.noLabel);
    if (existing) {
      const updated = await db.update(labels)
        .set({
          namaRs: data.namaRs !== undefined ? data.namaRs : existing.namaRs,
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
          namaRs: data.namaRs || null,
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
    const all = await getAllLabels();
    const matching = all.filter(l => l.noLabel.startsWith(prefix + '.') || l.noLabel === prefix);
    for (const item of matching) {
      await db.delete(labels).where(eq(labels.noLabel, item.noLabel));
    }
    return matching.length;
  } catch (error) {
    console.error("Database query failed in deleteLabelsByPrefix:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function deleteBatchLabelsByNos(nos: string[]) {
  try {
    for (const no of nos) {
      await db.delete(labels).where(eq(labels.noLabel, no));
    }
    return true;
  } catch (error) {
    console.error("Database query failed in deleteBatchLabelsByNos:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function updateLabelsNamaRsByPrefix(prefix: string, namaRs: string | null) {
  try {
    // Prefix e.g. "001" matches "001.%"
    const all = await getAllLabels();
    const matching = all.filter(l => l.noLabel.startsWith(prefix + '.') || l.noLabel === prefix);
    for (const item of matching) {
      await db.update(labels)
        .set({ namaRs: namaRs || null, updatedAt: new Date() })
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
export async function getSetting(key: string) {
  try {
    const res = await db.select().from(settings).where(eq(settings.key, key));
    if (res.length > 0) {
      try {
        return JSON.parse(res[0].value);
      } catch {
        return res[0].value;
      }
    }
    return null;
  } catch (error) {
    console.error("Database query failed in getSetting:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function setSetting(key: string, value: any) {
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
    console.error("Database query failed in setSetting:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
