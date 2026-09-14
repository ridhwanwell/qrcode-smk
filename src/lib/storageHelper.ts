import { supabase } from './supabaseClient';

/**
 * Helper to convert file to Base64 Data URL (resilient fallback if Cloud Storage fails or is offline)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Uploads a public asset (e.g. company logo, KAN badge, blank templates) to Supabase Storage bucket 'documents'.
 */
export const uploadPublicAsset = async (file: File, folderPath: string): Promise<string> => {
  try {
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `${folderPath}/${cleanFileName}`;

    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn('Supabase Storage upload warning, falling back to base64:', error.message);
      return await fileToBase64(file);
    }

    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl || (await fileToBase64(file));
  } catch (err) {
    console.warn('Storage upload error, using instant Base64 data URL fallback:', err);
    return await fileToBase64(file);
  }
};

/**
 * Uploads a private confidential document (SPH, SPK, BAP, financial attachments) to private bucket 'internal-documents'.
 * Returns the stored filePath (e.g. "sph/sph-123/file.pdf") so it can be saved persistently.
 * If storage upload fails, falls back ONLY to base64 data URL (NEVER uploaded to public bucket).
 */
export const uploadPrivateDocument = async (file: File, folderPath: string): Promise<string> => {
  try {
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `${folderPath}/${cleanFileName}`;

    const { error } = await supabase.storage
      .from('internal-documents')
      .upload(filePath, file, {
        cacheControl: '300',
        upsert: true
      });

    if (error) {
      console.warn('Supabase private storage upload failed, falling back to base64 only (not public):', error.message);
      return await fileToBase64(file);
    }

    // Return the relative filePath in internal-documents bucket for persistent storage
    return filePath;
  } catch (err) {
    console.warn('Private document upload error, using Base64 data URL fallback:', err);
    return await fileToBase64(file);
  }
};

/**
 * Universal upload helper maintaining backwards compatibility.
 * Routes sensitive documents (sph, spk, bap, financial, invoices, contracts) to private bucket,
 * and templates/logos/assets to public bucket.
 */
export const uploadFile = async (file: File, folderPath: string): Promise<string> => {
  const isSensitive = /^(sph|spk|bap|financial|invoices|contracts)/i.test(folderPath);
  if (isSensitive) {
    return uploadPrivateDocument(file, folderPath);
  }
  return uploadPublicAsset(file, folderPath);
};

/**
 * Retrieves a fresh temporary signed URL for viewing/downloading private documents.
 * Handles:
 * 1. Data URLs (data:application/pdf;base64,... or data:image/...) -> returned directly
 * 2. External HTTP/HTTPS links (e.g. Google Drive) -> returned directly
 * 3. File paths in internal-documents -> ONLY queries secure backend endpoint POST /api/storage/signed-url.
 *    Client-side fallback is STRICTLY REMOVED to enforce server authorization and RLS.
 */
export const getDocumentAccessUrl = async (
  pathOrUrl: string, 
  expiresIn: number = 900,
  documentContext?: { documentId?: string; documentType?: 'sph' | 'spk' | 'bap' }
): Promise<string> => {
  if (!pathOrUrl) return '';

  const trimmed = pathOrUrl.trim();

  // If already a Data URL or external link (like Google Drive), return directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If already an HTTP link, return directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // File path in private 'internal-documents' bucket: MUST be requested via authenticated backend API
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Autentikasi diperlukan: Silakan login terlebih dahulu untuk mengakses dokumen ini');
  }

  const response = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      filePath: trimmed, 
      expiresIn,
      documentId: documentContext?.documentId,
      documentType: documentContext?.documentType
    })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({ error: 'Gagal mendapatkan izin akses dokumen' }));
    throw new Error(errJson.error || `Akses dokumen gagal (Status ${response.status})`);
  }

  const result = await response.json();
  if (!result.signedUrl) {
    throw new Error('Server tidak mengembalikan URL bertanda tangan yang valid');
  }

  return result.signedUrl;
};

