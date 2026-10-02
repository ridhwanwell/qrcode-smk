-- ==============================================================================
-- SKRIP MIGRASI KEAMANAN BASIS DATA - PT. SARANA MULTI KALIBRASI (PT. SMK)
-- Jalankan skrip ini secara manual di Supabase SQL Editor oleh Administrator Utama.
-- ==============================================================================

-- 1. Penambahan Role Resmi 'hanya_sph' ke user_role_enum jika belum ada
DO $$ 
BEGIN
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'hanya_sph';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Pastikan tabel app_collections tersedia untuk sinkronisasi data antar perangkat
CREATE TABLE IF NOT EXISTS public.app_collections (
    collection_name TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS) pada app_collections
ALTER TABLE public.app_collections ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan RLS untuk app_collections
DROP POLICY IF EXISTS "Authenticated users can read collections" ON public.app_collections;
CREATE POLICY "Authenticated users can read collections"
ON public.app_collections FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan')
    OR (public.get_current_user_role() = 'hanya_sph' AND collection_name IN ('sph_documents', 'sph', 'hospitals'))
);

DROP POLICY IF EXISTS "Authorized users can modify collections" ON public.app_collections;
CREATE POLICY "Authorized users can modify collections"
ON public.app_collections FOR ALL
TO authenticated
USING (
    public.get_current_user_role() = 'admin_utama'
    OR (public.get_current_user_role() = 'admin_teknik' AND collection_name IN ('schedules', 'calibrators', 'tablet_devices', 'tablet_loans', 'technicians', 'hospitals'))
    OR (public.get_current_user_role() = 'admin_keuangan' AND collection_name IN ('sph_documents', 'sph', 'bap_documents', 'schedules', 'financial_transactions', 'financial_assets', 'hospitals'))
    OR (public.get_current_user_role() = 'hanya_sph' AND collection_name IN ('sph_documents', 'sph'))
)
WITH CHECK (
    public.get_current_user_role() = 'admin_utama'
    OR (public.get_current_user_role() = 'admin_teknik' AND collection_name IN ('schedules', 'calibrators', 'tablet_devices', 'tablet_loans', 'technicians', 'hospitals'))
    OR (public.get_current_user_role() = 'admin_keuangan' AND collection_name IN ('sph_documents', 'sph', 'bap_documents', 'schedules', 'financial_transactions', 'financial_assets', 'hospitals'))
    OR (public.get_current_user_role() = 'hanya_sph' AND collection_name IN ('sph_documents', 'sph'))
);

-- 4. Pembaruan Kebijakan RLS sph_documents agar pengguna dengan role 'hanya_sph' dapat mengelola SPH
DROP POLICY IF EXISTS "Utama and Keuangan manage sph_documents" ON public.sph_documents;
DROP POLICY IF EXISTS "SPH role can manage sph_documents" ON public.sph_documents;
CREATE POLICY "SPH role can manage sph_documents"
ON public.sph_documents FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan', 'hanya_sph'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan', 'hanya_sph'));

-- 5. Kebijakan Storage bucket 'internal-documents' untuk role 'hanya_sph' pada folder sph/
DROP POLICY IF EXISTS "SPH role access internal documents" ON storage.objects;
CREATE POLICY "SPH role access internal documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'internal-documents'
    AND (
        public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan')
        OR (public.get_current_user_role() = 'hanya_sph' AND name LIKE 'sph/%')
    )
);

-- 6. Tambahkan indeks pada kolom penting untuk kecepatan respon kueri
CREATE INDEX IF NOT EXISTS idx_labels_updated_at ON public.labels(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- SELESAI: Skrip migrasi keamanan siap dijalankan pada dashboard Supabase
-- ==============================================================================
