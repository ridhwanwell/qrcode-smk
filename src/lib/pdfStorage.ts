import { 
  collection, 
  doc, 
  setDoc,
  getDocs, 
  writeBatch, 
  serverTimestamp, 
  deleteDoc, 
  query, 
  orderBy,
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebase';

const CHUNK_SIZE = 400 * 1024; // 400 KB characters per chunk (safe within 1MB Firestore limit)

/**
 * Convert a File or Blob into a Base64 data string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract pure base64 without the "data:application/pdf;base64," prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a Base64 string into a Blob
 */
function base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];

  const sliceSize = 1024;
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Upload a PDF by splitting into Firestore chunks
 */
export async function uploadPdfToFirestore(
  labelId: string, 
  file: File, 
  onProgress?: (percent: number) => void,
  dates?: { calibratedAt?: string; validUntil?: string }
): Promise<void> {
  if (onProgress) onProgress(10);
  
  // 1. Read file to Base64
  const base64Data = await fileToBase64(file);
  if (onProgress) onProgress(30);

  // 2. Split into chunks
  const totalLength = base64Data.length;
  const chunks: string[] = [];
  for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
    chunks.push(base64Data.substring(i, i + CHUNK_SIZE));
  }
  const totalChunks = chunks.length;

  // 3. Clear any existing chunks first
  await deleteExistingChunks(labelId);
  if (onProgress) onProgress(45);

  // 4. Save chunks using batched writes (up to 500 per batch)
  const batchSize = 100;
  for (let b = 0; b < chunks.length; b += batchSize) {
    const batch = writeBatch(db);
    const slice = chunks.slice(b, b + batchSize);
    
    slice.forEach((chunkStr, idx) => {
      const chunkIndex = b + idx;
      const chunkDocRef = doc(db, 'labels', labelId, 'chunks', String(chunkIndex).padStart(4, '0'));
      batch.set(chunkDocRef, {
        index: chunkIndex,
        data: chunkStr,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
    if (onProgress) {
      const pct = Math.min(95, Math.round(45 + ((b + slice.length) / chunks.length) * 45));
      onProgress(pct);
    }
  }

  // 5. Update parent label document
  const labelDocRef = doc(db, 'labels', labelId);
  const updatePayload: any = {
    noLabel: labelId,
    status: 'Sertifikat Tertaut',
    hasPdf: true,
    pdfName: file.name,
    pdfSize: file.size,
    pdfChunksCount: totalChunks,
    pdfUrl: null, // No external url needed
    updatedAt: serverTimestamp()
  };

  if (dates?.calibratedAt) updatePayload.calibratedAt = dates.calibratedAt;
  if (dates?.validUntil) updatePayload.validUntil = dates.validUntil;

  await setDoc(labelDocRef, updatePayload, { merge: true });

  if (onProgress) onProgress(100);
}

/**
 * Delete existing chunks for a label
 */
async function deleteExistingChunks(labelId: string): Promise<void> {
  const chunksCol = collection(db, 'labels', labelId, 'chunks');
  const snap = await getDocs(chunksCol);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
}

/**
 * Reconstruct a PDF Blob URL from Firestore chunks
 */
export async function getPdfBlobUrl(labelId: string): Promise<{ url: string; blob: Blob } | null> {
  const chunksCol = collection(db, 'labels', labelId, 'chunks');
  const q = query(chunksCol, orderBy('index', 'asc'));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  let fullBase64 = '';
  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.data) {
      fullBase64 += data.data;
    }
  });

  if (!fullBase64) return null;

  const blob = base64ToBlob(fullBase64, 'application/pdf');
  const url = URL.createObjectURL(blob);
  return { url, blob };
}

/**
 * Helper to extract Google Drive file ID from various sharing URL formats
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/FILE_ID/
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Pattern 2: id=FILE_ID
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Pattern 3: /d/FILE_ID
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  // Pattern 4: /open?id=FILE_ID
  const matchOpenId = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (matchOpenId && matchOpenId[1]) return matchOpenId[1];

  return null;
}

/**
 * Generates an embeddable Google Drive preview URL for iframe
 */
export function getGoogleDriveEmbedUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const fileId = extractGoogleDriveFileId(urlOrId) || urlOrId.trim();
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Generates direct Google Drive view URL
 */
export function getGoogleDriveViewUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const fileId = extractGoogleDriveFileId(urlOrId) || urlOrId.trim();
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

/**
 * Link a Google Drive certificate to a label document in Firestore
 */
export async function linkGoogleDriveToLabel(
  labelId: string, 
  driveUrl: string, 
  customDocName?: string,
  dates?: { calibratedAt?: string; validUntil?: string }
): Promise<void> {
  // Delete any existing chunks if previously stored as file chunks
  await deleteExistingChunks(labelId);

  const fileId = extractGoogleDriveFileId(driveUrl);
  const embedUrl = fileId ? getGoogleDriveEmbedUrl(fileId) : driveUrl.trim();
  const viewUrl = fileId ? getGoogleDriveViewUrl(fileId) : driveUrl.trim();

  const labelDocRef = doc(db, 'labels', labelId);
  const updatePayload: any = {
    noLabel: labelId,
    status: 'Sertifikat Tertaut',
    hasPdf: false,
    pdfSource: 'drive',
    pdfUrl: embedUrl,
    pdfDriveUrl: viewUrl,
    pdfOriginalUrl: driveUrl.trim(),
    pdfName: customDocName?.trim() || `Sertifikat Kalibrasi ${labelId}`,
    pdfSize: null,
    pdfChunksCount: 0,
    updatedAt: serverTimestamp()
  };

  if (dates?.calibratedAt) updatePayload.calibratedAt = dates.calibratedAt;
  if (dates?.validUntil) updatePayload.validUntil = dates.validUntil;

  await setDoc(labelDocRef, updatePayload, { merge: true });
}

/**
 * Update calibration and expiration dates for a label
 */
export async function updateLabelDates(
  labelId: string,
  calibratedAt: string,
  validUntil: string
): Promise<void> {
  const labelDocRef = doc(db, 'labels', labelId);
  await setDoc(labelDocRef, {
    calibratedAt,
    validUntil,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Delete PDF certificate from a label
 */
export async function deleteCertificateFromLabel(labelId: string): Promise<void> {
  await deleteExistingChunks(labelId);
  
  const labelDocRef = doc(db, 'labels', labelId);
  await updateDoc(labelDocRef, {
    status: 'Menunggu Sertifikat',
    hasPdf: false,
    pdfSource: null,
    pdfName: null,
    pdfSize: null,
    pdfChunksCount: 0,
    pdfUrl: null,
    pdfDriveUrl: null,
    pdfOriginalUrl: null,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete label document completely along with its subcollection chunks
 */
export async function deleteLabelCompletely(labelId: string): Promise<void> {
  // 1. Delete all chunks
  await deleteExistingChunks(labelId);

  // 2. Delete label document
  const labelDocRef = doc(db, 'labels', labelId);
  await deleteDoc(labelDocRef);
}

/**
 * Delete a batch of labels completely (e.g. when deleting an entire folder)
 */
export async function deleteBatchLabels(labelIds: string[]): Promise<void> {
  for (let i = 0; i < labelIds.length; i += 400) {
    const chunk = labelIds.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(db, 'labels', id));
    }
    await batch.commit();
  }
}

