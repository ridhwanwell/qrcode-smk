import { apiFetch } from './apiClient';

/**
 * Validates and extracts a Google Drive File ID from various link formats
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/{fileId}/view or /file/d/{fileId}/preview
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Pattern 2: id={fileId} parameter (open?id= or uc?id=)
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Pattern 3: Raw File ID (e.g. 25+ alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Generates an embeddable Google Drive preview URL for iframe
 */
export function getGoogleDriveEmbedUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return urlOrId.trim();
}

/**
 * Generates direct Google Drive view URL
 */
export function getGoogleDriveViewUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }
  return urlOrId.trim();
}

/**
 * Reconstruct a PDF Blob URL if needed
 */
export async function getPdfBlobUrl(_labelId: string): Promise<{ url: string; blob: Blob } | null> {
  return null;
}

/**
 * Link a Google Drive certificate to a label via server API
 */
export async function linkGoogleDriveToLabel(
  labelId: string, 
  driveUrl: string, 
  customDocName?: string,
  dates?: { calibratedAt?: string; validUntil?: string; namaRs?: string; namaAlat?: string; ruangan?: string }
): Promise<void> {
  const fileId = extractGoogleDriveFileId(driveUrl);
  const embedUrl = fileId ? getGoogleDriveEmbedUrl(fileId) : driveUrl.trim();
  const viewUrl = fileId ? getGoogleDriveViewUrl(fileId) : driveUrl.trim();

  const finalNamaAlat = dates?.namaAlat?.trim() || customDocName?.trim() || undefined;
  const finalRuangan = dates?.ruangan?.trim() || undefined;

  const updatePayload: any = {
    noLabel: labelId,
    status: 'Sertifikat Tertaut',
    pdfSource: 'drive',
    pdfUrl: embedUrl,
    pdfDriveUrl: viewUrl,
    pdfOriginalUrl: driveUrl.trim(),
    pdfName: finalNamaAlat || `Sertifikat Kalibrasi ${labelId}`,
    namaAlat: finalNamaAlat,
    ruangan: finalRuangan,
    calibratedAt: dates?.calibratedAt || null,
    validUntil: dates?.validUntil || null,
  };

  if (dates?.namaRs !== undefined) {
    updatePayload.namaRs = dates.namaRs;
  }

  await apiFetch('/api/labels', {
    method: 'POST',
    body: JSON.stringify(updatePayload),
  });
}

/**
 * Update calibration and expiration dates for a label via server API
 */
export async function updateLabelDates(
  labelId: string,
  calibratedAt: string,
  validUntil: string,
  extra?: { namaRs?: string; namaAlat?: string; ruangan?: string } | string
): Promise<void> {
  const extraObj = typeof extra === 'object' ? extra : { namaRs: extra };
  const payload: any = { noLabel: labelId, calibratedAt, validUntil };
  if (extraObj?.namaRs !== undefined) payload.namaRs = extraObj.namaRs;
  if (extraObj?.namaAlat !== undefined) {
    payload.namaAlat = extraObj.namaAlat;
    payload.pdfName = extraObj.namaAlat;
  }
  if (extraObj?.ruangan !== undefined) payload.ruangan = extraObj.ruangan;

  await apiFetch('/api/labels', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete PDF certificate from a label
 */
export async function deleteCertificateFromLabel(labelId: string): Promise<void> {
  const payload = {
    noLabel: labelId,
    status: 'Menunggu Sertifikat',
    pdfSource: null,
    pdfName: null,
    pdfUrl: null,
    pdfDriveUrl: null,
    pdfOriginalUrl: null,
  };

  await apiFetch('/api/labels', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function getPrefix(no: string): string {
  if (!no) return '';
  const dot = no.indexOf('.');
  if (dot > 0) return no.substring(0, dot);
  if (no.length >= 3) return no.substring(0, 3);
  return no;
}

/**
 * Delete label document completely
 */
export async function deleteLabelCompletely(labelId: string): Promise<void> {
  // Purge from local storage immediately
  try {
    const rawLabels = localStorage.getItem('smk_labels');
    if (rawLabels) {
      const list = JSON.parse(rawLabels);
      const remaining = list.filter((item: any) => {
        const no = item.noLabel || item.no_label || item.id || '';
        return no !== labelId;
      });
      localStorage.setItem('smk_labels', JSON.stringify(remaining));
    }

    const deletedLabels = JSON.parse(localStorage.getItem('smk_deleted_labels') || '[]');
    if (!deletedLabels.includes(labelId)) {
      deletedLabels.push(labelId);
      localStorage.setItem('smk_deleted_labels', JSON.stringify(deletedLabels));
    }
  } catch (err) {
    console.warn('LocalStorage deleteLabelCompletely cleanup warning:', err);
  }

  await apiFetch(`/api/labels/${encodeURIComponent(labelId)}`, {
    method: 'DELETE',
  });
}

/**
 * Delete a batch of labels completely
 */
export async function deleteBatchLabels(labelIds: string[]): Promise<void> {
  if (!labelIds || labelIds.length === 0) return;

  // Purge from local storage immediately
  try {
    const rawLabels = localStorage.getItem('smk_labels');
    if (rawLabels) {
      const list = JSON.parse(rawLabels);
      const set = new Set(labelIds);
      const remaining = list.filter((item: any) => {
        const no = item.noLabel || item.no_label || item.id || '';
        return !set.has(no) && !set.has(item.id);
      });
      localStorage.setItem('smk_labels', JSON.stringify(remaining));
    }

    const deletedLabels = JSON.parse(localStorage.getItem('smk_deleted_labels') || '[]');
    const labelSet = new Set(deletedLabels);
    labelIds.forEach(id => labelSet.add(id));
    localStorage.setItem('smk_deleted_labels', JSON.stringify(Array.from(labelSet)));
  } catch (err) {
    console.warn('LocalStorage deleteBatchLabels cleanup warning:', err);
  }

  await apiFetch('/api/labels/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ noLabels: labelIds })
  });
}

/**
 * Delete an entire folder and all its labels
 */
export async function deleteFolderCompletely(prefix: string, labelIds?: string[]): Promise<void> {
  // 1. Purge from local storage immediately
  try {
    const rawLabels = localStorage.getItem('smk_labels');
    if (rawLabels) {
      const list = JSON.parse(rawLabels);
      const labelIdSet = new Set(labelIds || []);
      const remaining = list.filter((item: any) => {
        const no = item.noLabel || item.no_label || item.id || '';
        const p = getPrefix(no);
        if (p === prefix) return false;
        if (labelIdSet.has(no) || labelIdSet.has(item.id)) return false;
        return true;
      });
      localStorage.setItem('smk_labels', JSON.stringify(remaining));
    }

    // Clean folder hospital name mapping
    const map = JSON.parse(localStorage.getItem('smk_folder_nama_rs_map') || '{}');
    delete map[prefix];
    localStorage.setItem('smk_folder_nama_rs_map', JSON.stringify(map));

    // Register folder in tombstone
    const deletedFolders = JSON.parse(localStorage.getItem('smk_deleted_folders') || '[]');
    if (!deletedFolders.includes(prefix)) {
      deletedFolders.push(prefix);
      localStorage.setItem('smk_deleted_folders', JSON.stringify(deletedFolders));
    }

    // Register labelIds in tombstone
    if (labelIds && labelIds.length > 0) {
      const deletedLabels = JSON.parse(localStorage.getItem('smk_deleted_labels') || '[]');
      const labelSet = new Set(deletedLabels);
      labelIds.forEach(id => labelSet.add(id));
      localStorage.setItem('smk_deleted_labels', JSON.stringify(Array.from(labelSet)));
    }
  } catch (err) {
    console.warn('LocalStorage deleteFolderCompletely cleanup warning:', err);
  }

  // 2. Delete on backend API
  await apiFetch(`/api/folders/${encodeURIComponent(prefix)}`, { method: 'DELETE' });
  await apiFetch(`/api/folders/prefix/${encodeURIComponent(prefix)}`, { method: 'DELETE' }).catch(() => {});
  if (labelIds && labelIds.length > 0) {
    await apiFetch('/api/labels/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ noLabels: labelIds })
    }).catch(() => {});
  }
}
