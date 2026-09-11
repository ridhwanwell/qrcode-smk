import { supabase } from './supabase';

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
 * Link a Google Drive certificate to a label
 */
export async function linkGoogleDriveToLabel(
  labelId: string, 
  driveUrl: string, 
  customDocName?: string,
  dates?: { calibratedAt?: string; validUntil?: string }
): Promise<void> {
  const fileId = extractGoogleDriveFileId(driveUrl);
  const embedUrl = fileId ? getGoogleDriveEmbedUrl(fileId) : driveUrl.trim();
  const viewUrl = fileId ? getGoogleDriveViewUrl(fileId) : driveUrl.trim();

  const updatePayload: any = {
    noLabel: labelId,
    status: 'Sertifikat Tertaut',
    pdfSource: 'drive',
    pdfUrl: embedUrl,
    pdfDriveUrl: viewUrl,
    pdfOriginalUrl: driveUrl.trim(),
    pdfName: customDocName?.trim() || `Sertifikat Kalibrasi ${labelId}`,
    calibratedAt: dates?.calibratedAt || null,
    validUntil: dates?.validUntil || null,
  };

  // 1. Update API backend
  await fetch('/api/labels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });

  // 2. Update Supabase
  try {
    await supabase.from('labels').upsert({
      no_label: labelId,
      status: 'Sertifikat Tertaut',
      pdf_source: 'drive',
      pdf_url: embedUrl,
      pdf_drive_url: viewUrl,
      pdforiginal_url: driveUrl.trim(),
      pdf_name: customDocName?.trim() || `Sertifikat Kalibrasi ${labelId}`,
      calibrated_at: dates?.calibratedAt || null,
      valid_until: dates?.validUntil || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'no_label' });
  } catch (err) {
    console.warn('Supabase linkGoogleDriveToLabel error:', err);
  }
}

/**
 * Update calibration and expiration dates for a label
 */
export async function updateLabelDates(
  labelId: string,
  calibratedAt: string,
  validUntil: string
): Promise<void> {
  await fetch('/api/labels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noLabel: labelId, calibratedAt, validUntil }),
  });

  try {
    await supabase.from('labels').update({
      calibrated_at: calibratedAt,
      valid_until: validUntil,
      updated_at: new Date().toISOString()
    }).eq('no_label', labelId);
  } catch (err) {
    console.warn('Supabase updateLabelDates error:', err);
  }
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

  await fetch('/api/labels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  try {
    await supabase.from('labels').update({
      status: 'Menunggu Sertifikat',
      pdf_source: null,
      pdf_name: null,
      pdf_url: null,
      pdf_drive_url: null,
      pdforiginal_url: null,
      updated_at: new Date().toISOString()
    }).eq('no_label', labelId);
  } catch (err) {
    console.warn('Supabase deleteCertificateFromLabel error:', err);
  }
}

/**
 * Delete label document completely
 */
export async function deleteLabelCompletely(labelId: string): Promise<void> {
  await fetch(`/api/labels/${encodeURIComponent(labelId)}`, {
    method: 'DELETE',
  });

  try {
    await supabase.from('labels').delete().eq('no_label', labelId);
  } catch (err) {
    console.warn('Supabase deleteLabelCompletely error:', err);
  }
}

/**
 * Delete a batch of labels completely
 */
export async function deleteBatchLabels(labelIds: string[]): Promise<void> {
  for (const id of labelIds) {
    await fetch(`/api/labels/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }

  try {
    await supabase.from('labels').delete().in('no_label', labelIds);
  } catch (err) {
    console.warn('Supabase deleteBatchLabels error:', err);
  }
}
