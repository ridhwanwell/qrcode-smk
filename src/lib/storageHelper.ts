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
 * Uploads a private confidential document (SPH, BAP, financial attachments) to private bucket 'internal-documents'.
 * Automatically falls back to base64 data URL if storage is unavailable.
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
      console.warn('Supabase private storage upload failed, falling back to public bucket/base64:', error.message);
      return await uploadPublicAsset(file, folderPath);
    }

    // For private documents, retrieve signed URL via backend endpoint or direct client signed URL
    const { data: signedData, error: signError } = await supabase.storage
      .from('internal-documents')
      .createSignedUrl(filePath, 60 * 60); // 1 hour token

    if (signedData?.signedUrl && !signError) {
      return signedData.signedUrl;
    }

    return await fileToBase64(file);
  } catch (err) {
    console.warn('Private document upload error, using Base64 data URL fallback:', err);
    return await fileToBase64(file);
  }
};

/**
 * Universal upload helper maintaining backwards compatibility.
 * Routes sensitive documents (sph, bap, invoices) to private bucket, and templates/logos to public bucket.
 */
export const uploadFile = async (file: File, folderPath: string): Promise<string> => {
  const isSensitive = /^(sph|bap|financial|invoices|contracts)/i.test(folderPath);
  if (isSensitive) {
    return uploadPrivateDocument(file, folderPath);
  }
  return uploadPublicAsset(file, folderPath);
};
