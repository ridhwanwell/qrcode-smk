import { supabase } from './supabaseClient';

/**
 * Robust helper to upsert labels to Supabase table `labels`.
 * Handles both `pdf_original_url` and `pdforiginal_url` column name variations,
 * and falls back gracefully to core label fields if optional columns do not exist.
 */
export async function upsertLabelsToSupabase(items: any[]): Promise<{ success: boolean; count: number; error?: any }> {
  if (!items || items.length === 0) return { success: true, count: 0 };

  const tryUpsert = async (payload: any[]) => {
    return await supabase.from('labels').upsert(payload, { onConflict: 'no_label' });
  };

  // Batch in chunks of 200 items to avoid payload size limit issues
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

    // Variant 2: Try with pdf_original_url only
    const variantOriginalUrlOnly = chunk.map(it => {
      const copy = { ...it };
      const origVal = copy.pdf_original_url || copy.pdforiginal_url || copy.pdfOriginalUrl || null;
      if (origVal) {
        copy.pdf_original_url = origVal;
      }
      delete copy.pdforiginal_url;
      delete copy.pdfOriginalUrl;
      return copy;
    });

    res = await tryUpsert(variantOriginalUrlOnly);
    if (!res.error) {
      totalSaved += chunk.length;
      continue;
    }

    // Variant 3: Try with pdforiginal_url only
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

    // Variant 4: Strip pdf_original_url and pdforiginal_url entirely
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

    // Variant 5: Fallback to core fields only
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

    console.warn(`Supabase upsertLabelsToSupabase batch ${i} error:`, res.error.message);
    return { success: false, count: totalSaved, error: res.error };
  }

  return { success: true, count: totalSaved };
}

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
    await upsertLabelsToSupabase([{
      no_label: `__meta_folder_${prefix}`,
      nama_rs: namaRs,
      status: '__meta_folder_info',
      updated_at: new Date().toISOString()
    }]);
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
        pdf_original_url: it.pdfOriginalUrl || it.pdf_original_url || it.pdforiginal_url || null,
        pdforiginal_url: it.pdfOriginalUrl || it.pdf_original_url || it.pdforiginal_url || null,
        pdf_name: it.pdfName || it.pdf_name || null,
        calibrated_at: it.calibratedAt || it.calibrated_at || null,
        valid_until: it.validUntil || it.valid_until || null,
        updated_at: new Date().toISOString()
      }));

    if (records.length === 0) return { success: true, count: 0 };

    const res = await upsertLabelsToSupabase(records);
    return { success: res.success, count: res.count };
  } catch (err: any) {
    console.warn('Error bulk syncing to Supabase:', err);
    return { success: false, count: 0 };
  }
}

