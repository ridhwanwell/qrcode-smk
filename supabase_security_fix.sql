-- ==============================================================================
-- SKRIP PERBAIKAN KEAMANAN SUPABASE (SUPABASE SECURITY HARDENING FIX)
-- PT. SARANA MULTI KALIBRASI (PT. SMK)
-- ==============================================================================
-- PANDUAN PENGGUNAAN:
-- Skrip SQL ini BUKAN untuk dijalankan otomatis oleh aplikasi, melainkan disiapkan
-- untuk dijalankan langsung oleh Pemilik Proyek / Administrator di Supabase SQL Editor:
-- Dashboard Supabase -> SQL Editor -> New query -> Paste & Run.
-- ==============================================================================

-- ==============================================================================
-- BAGIAN 1: ISOLASI TOTAL TABEL app_collections DAN labels DARI AKSES BROWSER
-- ==============================================================================
-- Tujuan:
-- Menghilangkan seluruh celah akses langsung tabel dari browser client (anon/authenticated).
-- Akses ke app_collections dan labels hanya diizinkan melalui Server Backend (Node.js/Express)
-- yang menggunakan Service Role Key dengan proteksi requireAuth & requireRole.

-- 1.1 Pastikan Row Level Security (RLS) aktif pada kedua tabel
ALTER TABLE IF EXISTS public.app_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.labels ENABLE ROW LEVEL SECURITY;

-- 1.2 DROP seluruh kebijakan (policies) lama yang memberikan akses terbuka ke browser
DROP POLICY IF EXISTS "Allow full access on app_collections" ON public.app_collections;
DROP POLICY IF EXISTS "Public Read Access" ON public.app_collections;
DROP POLICY IF EXISTS "Service Role Full Access" ON public.app_collections;
DROP POLICY IF EXISTS "Anon read access on app_collections" ON public.app_collections;
DROP POLICY IF EXISTS "Authenticated read access on app_collections" ON public.app_collections;
DROP POLICY IF EXISTS "Allow full access on labels" ON public.labels;
DROP POLICY IF EXISTS "Public can view labels" ON public.labels;
DROP POLICY IF EXISTS "Authenticated users can manage labels" ON public.labels;
DROP POLICY IF EXISTS "Public Read Access" ON public.labels;
DROP POLICY IF EXISTS "Service Role Full Access" ON public.labels;

-- 1.3 Cabut (REVOKE) seluruh hak akses tabel dari peran publik (anon) dan pengguna terautentikasi (authenticated)
REVOKE ALL ON TABLE public.app_collections FROM anon, authenticated;
REVOKE ALL ON TABLE public.labels FROM anon, authenticated;

-- Catatan:
-- Tidak dibuat policy baru untuk anon maupun authenticated pada kedua tabel ini.
-- Akses baca/tulis hanya dapat dilakukan oleh Supabase Service Role (backend server API).


-- ==============================================================================
-- BAGIAN 2: PENGUATAN KEAMANAN TABEL profiles & PENCEGAHAN PRIVILEGE ESCALATION
-- ==============================================================================
-- Tujuan:
-- 1. Memastikan kolom 'role' hanya menerima 4 peran resmi: admin_utama, admin_teknik, admin_keuangan, hanya_sph.
-- 2. Mengamankan fungsi helper role dan fungsi trigger dengan SECURITY DEFINER & fixed search_path = public.
-- 3. Mencegah eskalasi hak akses mandiri (pengguna biasa dilarang mengubah role menjadi admin_utama).
-- 4. Pengguna baru/non-admin_utama dipaksa memiliki role terendah 'hanya_sph' saat pendaftaran.
-- 5. Menutup hak UPDATE kolom role dari authenticated di level hak akses basis data (GRANT/REVOKE).

-- 2.1 Tambahkan CHECK constraint pada kolom role tabel public.profiles
DO $$ 
BEGIN
    -- Hapus constraint lama jika sudah ada
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_official_role;
    
    -- Tambahkan validasi 4 role resmi
    ALTER TABLE public.profiles 
    ADD CONSTRAINT chk_profiles_official_role 
    CHECK (role::text IN ('admin_utama', 'admin_teknik', 'admin_keuangan', 'hanya_sph'));
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Constraint chk_profiles_official_role sudah terpasang atau disesuaikan.';
END $$;

-- 2.2 Fungsi pembantu: Dapatkan peran pengguna saat ini (SECURITY DEFINER + search_path tetap)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- 2.3 Fungsi Trigger: Cegah eskalasi peran mandiri (Role Escalation Protection)
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
BEGIN
    -- Penanganan operasi INSERT (Pembuatan Profil Baru)
    IF TG_OP = 'INSERT' THEN
        caller_role := public.get_current_user_role();
        
        -- Hanya admin_utama yang boleh menentukan role saat INSERT; selain itu paksa 'hanya_sph'
        IF caller_role IS NULL OR caller_role <> 'admin_utama' THEN
            NEW.role := 'hanya_sph';
        END IF;
        
        NEW.created_at := COALESCE(NEW.created_at, NOW());
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- Penanganan operasi UPDATE (Pembaruan Profil)
    IF TG_OP = 'UPDATE' THEN
        -- Jika kolom role TIDAK berubah, izinkan pembaruan data umum (full_name, avatar_url)
        IF NEW.role::text = OLD.role::text THEN
            NEW.updated_at := NOW();
            RETURN NEW;
        END IF;

        -- Jika kolom role BERUBAH, pastikan pemanggil adalah admin_utama
        caller_role := public.get_current_user_role();
        IF caller_role = 'admin_utama' THEN
            NEW.updated_at := NOW();
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'Akses Ditolak: Hanya admin_utama yang memiliki kewenangan mengubah peran (role) pengguna.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 2.4 Pasang trigger BEFORE INSERT OR UPDATE pada tabel public.profiles
DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 2.5 Perbarui Kebijakan RLS pada tabel public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
CREATE POLICY "Users can read all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin utama can manage profiles" ON public.profiles;
CREATE POLICY "Admin utama can manage profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (public.get_current_user_role() = 'admin_utama')
WITH CHECK (public.get_current_user_role() = 'admin_utama');

-- 2.6 Pembatasan Hak Kolom (Column-Level Permissions)
-- Cabut izin UPDATE kolom role dari authenticated; izinkan hanya kolom non-kritis (full_name, avatar_url)
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;


-- ==============================================================================
-- BAGIAN 3: PENGUATAN KEAMANAN STORAGE BUCKET 'internal-documents' (ANTI-IDOR)
-- ==============================================================================
-- Tujuan:
-- 1. Memastikan bucket internal-documents berstatus PRIVATE (public = false).
-- 2. Menghapus seluruh policy SELECT langsung pada internal-documents:
--    Akses membaca berkas dokumen privat HANYA melalui Signed URL sementara dari backend server.
-- 3. Membuat policy INSERT terverifikasi untuk unggah berkas dengan whitelist subfolder sah
--    ('sph', 'spk', 'bap', 'financial', 'invoices', 'contracts').

-- 3.1 Pastikan tabel storage.objects dilindungi RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3.2 Pastikan bucket 'internal-documents' disetel PRIVATE
UPDATE storage.buckets 
SET public = false 
WHERE id = 'internal-documents';

-- 3.3 Hapus kebijakan akses baca & tulis langsung yang tidak aman
DROP POLICY IF EXISTS "Internal confidential storage read" ON storage.objects;
DROP POLICY IF EXISTS "Internal confidential storage insert" ON storage.objects;
DROP POLICY IF EXISTS "Public read on internal-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read internal-documents" ON storage.objects;

-- 3.4 Buat kebijakan INSERT baru yang ketat untuk pengunggahan berkas internal
CREATE POLICY "Authenticated restricted upload on internal-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'internal-documents'
    AND public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan', 'hanya_sph')
    AND (storage.foldername(name))[1] IN ('sph', 'spk', 'bap', 'financial', 'invoices', 'contracts')
);

-- Catatan:
-- Akses SELECT (baca/unduh) untuk bucket 'internal-documents' sengaja TIDAK diberikan ke authenticated/anon.
-- Seluruh akses unduh diarahkan melalui endpoint backend POST /api/storage/signed-url dengan token kedaluwarsa pendek.


-- ==============================================================================
-- BAGIAN 4: QUERY VERIFIKASI KEBERHASILAN PENERAPAN KEAMANAN
-- ==============================================================================
-- Jalankan query verifikasi di bawah ini setelah eksekusi untuk memastikan konfigurasi aktif:

-- 4.1 Verifikasi Kebijakan RLS (Row Level Security Policies)
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual AS using_expression, 
    with_check AS check_expression
FROM pg_policies 
WHERE schemaname IN ('public', 'storage')
  AND tablename IN ('app_collections', 'labels', 'profiles', 'objects')
ORDER BY tablename, policyname;

-- 4.2 Verifikasi Hak Akses Tabel (Table Grants)
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('app_collections', 'labels', 'profiles')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- 4.3 Verifikasi Hak Akses Kolom pada Tabel profiles (Column Grants)
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    column_name, 
    privilege_type 
FROM information_schema.column_privileges 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND grantee IN ('anon', 'authenticated')
ORDER BY column_name, grantee, privilege_type;

-- 4.4 Verifikasi Trigger Aktif pada Tabel profiles
SELECT 
    event_object_schema AS table_schema,
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles'
ORDER BY trigger_name;

-- 4.5 Verifikasi Status Privasi Storage Bucket
SELECT 
    id, 
    name, 
    public, 
    created_at 
FROM storage.buckets 
WHERE id IN ('documents', 'internal-documents');

-- ==============================================================================
-- AKHIR SKRIP PERBAIKAN KEAMANAN
-- ==============================================================================
