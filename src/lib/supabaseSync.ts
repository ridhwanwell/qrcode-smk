import { supabase } from './supabaseClient';

/**
 * Fetches folder hospital names metadata from Supabase
 */
export async function fetchFolderRsFromSupabase(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('labels')
      .select('no_label, nama_rs')
      .like('no_label', '__meta_folder_%');

    if (error || !data) return {};

    const map: Record<string, string> = {};
    data.forEach((row: any) => {
      if (row.no_label && row.nama_rs) {
        const prefix = row.no_label.replace('__meta_folder_', '');
        map[prefix] = row.nama_rs;
      }
    });

    return map;
  } catch (err) {
    console.warn('Error fetching folder RS from Supabase:', err);
    return {};
  }
}

/**
 * Saves folder hospital name metadata into Supabase
 */
export async function saveFolderRsToSupabase(prefix: string, namaRs: string): Promise<void> {
  try {
    await supabase.from('labels').upsert({
      no_label: `__meta_folder_${prefix}`,
      nama_rs: namaRs,
      status: '__meta_folder_info',
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Error saving folder RS to Supabase:', err);
  }
}

/**
 * Deletes a label from Supabase
 */
export async function deleteLabelFromSupabase(noLabel: string): Promise<void> {
  try {
    await supabase.from('labels').delete().eq('no_label', noLabel);
  } catch (err) {
    console.warn('Error deleting label from Supabase:', err);
  }
}

/**
 * Bulk sync labels to Supabase
 */
export async function bulkSyncLabelsToSupabase(items: any[]): Promise<{ success: boolean; count: number }> {
  try {
    const records = items
      .filter(it => it && (it.noLabel || it.no_label || it.id))
      .map(it => ({
        no_label: it.noLabel || it.no_label || it.id,
        nama_rs: it.namaRs || it.nama_rs || null,
        nama_alat: it.namaAlat || it.nama_alat || it.pdfName || it.pdf_name || null,
        ruangan: it.ruangan || null,
        status: it.status || 'Menunggu Sertifikat',
        pdf_source: it.pdfSource || it.pdf_source || null,
        pdf_url: it.pdfUrl || it.pdf_url || null,
        pdf_drive_url: it.pdfDriveUrl || it.pdf_drive_url || null,
        pdforiginal_url: it.pdfOriginalUrl || it.pdforiginal_url || null,
        pdf_name: it.pdfName || it.pdf_name || null,
        calibrated_at: it.calibratedAt || it.calibrated_at || null,
        valid_until: it.validUntil || it.valid_until || null,
        updated_at: new Date().toISOString()
      }));

    if (records.length === 0) return { success: true, count: 0 };

    // Batch in chunks of 200 items to avoid payload size limit issues
    const BATCH_SIZE = 200;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('labels').upsert(chunk, { onConflict: 'no_label' });
      if (error) {
        console.warn(`Supabase chunk batch ${i} save error:`, error.message);
        throw error;
      }
    }

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Error bulk syncing to Supabase:', err);
    return { success: false, count: 0 };
  }
}
