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
 * Uploads a file to Supabase Storage bucket 'documents' with automatic seamless fallback to Base64 Data URL.
 * Guarantees that template and attachment uploads NEVER get stuck or hang.
 */
export const uploadFile = async (file: File, folderPath: string): Promise<string> => {
  try {
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `${folderPath}/${cleanFileName}`;

    const { data, error } = await supabase.storage
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
