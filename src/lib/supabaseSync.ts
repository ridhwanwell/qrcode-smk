import { supabase } from './supabase.ts';

export interface SupabaseSyncResult {
  connected: boolean;
  tableReady: boolean;
  message: string;
}

/**
 * Check connection to Supabase and verify if the 'labels' table is accessible
 */
export async function testSupabaseConnection(): Promise<SupabaseSyncResult> {
  try {
    const { data, error } = await supabase.from('labels').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return {
          connected: true,
          tableReady: false,
          message: "Terhubung ke Supabase, namun tabel 'labels' belum dibuat di Supabase SQL Editor."
        };
      }
      return {
        connected: false,
        tableReady: false,
        message: `Supabase Error: ${error.message}`
      };
    }
    return {
      connected: true,
      tableReady: true,
      message: "Supabase terhubung aktif dan tabel 'labels' siap digunakan!"
    };
  } catch (err: any) {
    return {
      connected: false,
      tableReady: false,
      message: err?.message || "Gagal menghubungkan ke Supabase"
    };
  }
}

/**
 * Synchronize a single label to Supabase
 */
export async function syncLabelToSupabase(label: {
  noLabel: string;
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
    const payload: any = {
      no_label: label.noLabel,
      status: label.status || 'Menunggu Sertifikat',
      pdf_source: label.pdfSource || null,
      pdf_url: label.pdfUrl || null,
      pdf_drive_url: label.pdfDriveUrl || null,
      pdforiginal_url: label.pdfOriginalUrl || null,
      pdf_name: label.pdfName || null,
      calibrated_at: label.calibratedAt || null,
      valid_until: label.validUntil || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('labels').upsert(payload, { onConflict: 'no_label' });
    if (error) {
      // If table doesn't exist yet, silently ignore or log
      console.warn('Supabase sync label error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase sync label exception:', err);
  }
}

/**
 * Delete a label from Supabase
 */
export async function deleteLabelFromSupabase(noLabel: string) {
  try {
    const { error } = await supabase.from('labels').delete().eq('no_label', noLabel);
    if (error) {
      console.warn('Supabase delete label error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete label exception:', err);
  }
}

/**
 * Bulk sync labels to Supabase
 */
export async function bulkSyncLabelsToSupabase(items: any[]) {
  try {
    const payloads = items.map((it) => ({
      no_label: it.noLabel || it.no_label || it.id,
      status: it.status || 'Menunggu Sertifikat',
      pdf_source: it.pdfSource || it.pdf_source || null,
      pdf_url: it.pdfUrl || it.pdf_url || null,
      pdf_drive_url: it.pdfDriveUrl || it.pdf_drive_url || null,
      pdforiginal_url: it.pdfOriginalUrl || it.pdforiginal_url || it.pdf_original_url || null,
      pdf_name: it.pdfName || it.pdf_name || null,
      calibrated_at: it.calibratedAt || it.calibrated_at || null,
      valid_until: it.validUntil || it.valid_until || null,
      updated_at: new Date().toISOString(),
    }));

    if (payloads.length === 0) return { success: true, count: 0 };

    const { error } = await supabase.from('labels').upsert(payloads, { onConflict: 'no_label' });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, count: payloads.length };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
