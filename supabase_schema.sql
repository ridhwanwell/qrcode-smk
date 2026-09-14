-- ==============================================================================
-- SKEMA BASIS DATA UTAMA SUPABASE - PT. SARANA MULTI KALIBRASI (PT. SMK)
-- Arsitektur: 100% Supabase PostgreSQL + Supabase Auth + Supabase Storage
-- SINGLE SOURCE OF TRUTH (Idempotent: aman dijalankan dari nol maupun berulang)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TIPE PERAN PENGGUNA (User Roles)
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin_utama', 'admin_teknik', 'admin_keuangan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL PROFIL PENGGUNA (Terkoneksi langsung dengan auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'admin_utama',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL AUDIT LOG (Pencatatan Riwayat Aktivitas)
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', etc.
    table_name TEXT NOT NULL,
    record_id TEXT,
    payload JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABEL LABEL QR & SERTIFIKAT KALIBRASI
CREATE TABLE IF NOT EXISTS public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_label TEXT UNIQUE NOT NULL,
    nama_rs TEXT,
    status TEXT NOT NULL DEFAULT 'Menunggu Sertifikat',
    pdf_source TEXT,
    pdf_url TEXT,
    pdf_drive_url TEXT,
    pdforiginal_url TEXT,
    pdf_name TEXT,
    calibrated_at DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labels_no_label ON public.labels(no_label);
CREATE INDEX IF NOT EXISTS idx_labels_nama_rs ON public.labels(nama_rs);

-- 6. TABEL FOLDER LABEL
CREATE TABLE IF NOT EXISTS public.label_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    label_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABEL JADWAL KALIBRASI RUMAH SAKIT
CREATE TABLE IF NOT EXISTS public.schedules (
    id TEXT PRIMARY KEY,
    hospital_name TEXT NOT NULL,
    hospital_id TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    technicians TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    notes TEXT,
    pic_name TEXT,
    pic_phone TEXT,
    sph_number TEXT,
    spk_number TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TABEL PENAWARAN SPH (Surat Penawaran Harga)
CREATE TABLE IF NOT EXISTS public.sph_documents (
    id TEXT PRIMARY KEY,
    sph_number TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    hospital_address TEXT,
    date DATE NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'approved', 'rejected'
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    pic_name TEXT,
    pic_phone TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABEL BERITA ACARA PEKERJAAN (BAP & BASTP)
CREATE TABLE IF NOT EXISTS public.bap_documents (
    id TEXT PRIMARY KEY,
    bap_number TEXT NOT NULL,
    sph_number TEXT,
    spk_number TEXT,
    hospital_name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TABEL MASTER ASET ALAT KALIBRATOR
CREATE TABLE IF NOT EXISTS public.calibrators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    certificate_number TEXT,
    calibrated_date DATE,
    expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'Tersedia', -- 'Tersedia', 'Sedang Dipakai', 'Perlu Kalibrasi Ulang'
    location TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. TABEL MASTER TABLET OPERASIONAL
CREATE TABLE IF NOT EXISTS public.tablet_devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'Tersedia',
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. TABEL PEMINJAMAN TABLET
CREATE TABLE IF NOT EXISTS public.tablet_loans (
    id TEXT PRIMARY KEY,
    tablet_id TEXT NOT NULL,
    borrower_name TEXT NOT NULL,
    loan_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'Dipinjam',
    notes TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. TABEL MASTER RUMAH SAKIT & KLINIK
CREATE TABLE IF NOT EXISTS public.hospitals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    pic_name TEXT,
    pic_phone TEXT,
    email TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TABEL MASTER TEKNISI ELEKTROMEDIS
CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    specialization TEXT,
    str_number TEXT,
    status TEXT NOT NULL DEFAULT 'Aktif',
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. TABEL MASTER STAF MARKETING
CREATE TABLE IF NOT EXISTS public.marketing_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. TABEL TRANSAKSI KEUANGAN
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id TEXT PRIMARY KEY,
    transaction_date DATE NOT NULL,
    type TEXT NOT NULL, -- 'income', 'expense'
    category TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    description TEXT,
    reference_number TEXT,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. TABEL ASET PERUSAHAAN (Financial Assets)
CREATE TABLE IF NOT EXISTS public.financial_assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    purchase_date DATE,
    value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Baik',
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. TABEL PENGATURAN SISTEM & TEMPLATE
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- KEAMANAN: ROW LEVEL SECURITY (RLS) & TRIGGER PENCEGAHAN ESKALASI ROLE
-- ==============================================================================

-- Aktifkan RLS di seluruh tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sph_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bap_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablet_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablet_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper Function: Dapatkan peran pengguna saat ini (Security Definer untuk bypass RLS pada profiles)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Trigger Function: Mencegah eskalasi hak akses mandiri (Role Escalation Protection)
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
BEGIN
    -- Jika kolom 'role' tidak mengalami perubahan, izinkan update (misal ubah nama, avatar)
    IF NEW.role = OLD.role THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;

    -- Jika kolom 'role' diubah, periksa peran dari pemanggil saat ini
    caller_role := public.get_current_user_role();

    IF caller_role = 'admin_utama' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Akses Ditolak: Hanya admin_utama yang berwenang mengubah peranan (role) pengguna.';
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ------------------------------------------------------------------------------
-- 1. KEBIJAKAN UNTUK PROFILES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
CREATE POLICY "Users can read all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR public.get_current_user_role() = 'admin_utama')
WITH CHECK (auth.uid() = id OR public.get_current_user_role() = 'admin_utama');

DROP POLICY IF EXISTS "Admin utama can insert profiles" ON public.profiles;
CREATE POLICY "Admin utama can insert profiles" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id OR public.get_current_user_role() = 'admin_utama');

DROP POLICY IF EXISTS "Admin utama can delete profiles" ON public.profiles;
CREATE POLICY "Admin utama can delete profiles" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (public.get_current_user_role() = 'admin_utama');

-- ------------------------------------------------------------------------------
-- 2. KEBIJAKAN UNTUK LABELS & LABEL FOLDERS (Semua staf berhak kelola stiker)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view labels" ON public.labels;
CREATE POLICY "Public can view labels" 
ON public.labels FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage labels" ON public.labels;
CREATE POLICY "Authenticated users can manage labels" 
ON public.labels FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'));

DROP POLICY IF EXISTS "Auth full access on label_folders" ON public.label_folders;
DROP POLICY IF EXISTS "Authenticated manage label_folders" ON public.label_folders;
CREATE POLICY "Authenticated manage label_folders" 
ON public.label_folders FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'));

-- ------------------------------------------------------------------------------
-- 3. KEBIJAKAN UNTUK ACTIVITY LOG
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read activity log" ON public.activity_log;
CREATE POLICY "Authenticated users can read activity log" 
ON public.activity_log FOR SELECT 
TO authenticated 
USING (public.get_current_user_role() = 'admin_utama');

DROP POLICY IF EXISTS "Authenticated users can insert activity log" ON public.activity_log;
CREATE POLICY "Authenticated users can insert activity log" 
ON public.activity_log FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 4. KEBIJAKAN PENJADWALAN RS (SCHEDULES)
--    - admin_utama & admin_teknik: Akses Penuh (SELECT, INSERT, UPDATE, DELETE)
--    - admin_keuangan: SELECT & INSERT saja (untuk auto-schedule saat SPH Deal)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth full access on schedules" ON public.schedules;
DROP POLICY IF EXISTS "Teknik and Utama full access on schedules" ON public.schedules;
CREATE POLICY "Teknik and Utama full access on schedules" 
ON public.schedules FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'));

DROP POLICY IF EXISTS "Keuangan view schedules" ON public.schedules;
CREATE POLICY "Keuangan view schedules" 
ON public.schedules FOR SELECT 
TO authenticated 
USING (public.get_current_user_role() = 'admin_keuangan');

DROP POLICY IF EXISTS "Keuangan auto-insert schedules on SPH Deal" ON public.schedules;
CREATE POLICY "Keuangan auto-insert schedules on SPH Deal" 
ON public.schedules FOR INSERT 
TO authenticated 
WITH CHECK (public.get_current_user_role() = 'admin_keuangan');

-- ------------------------------------------------------------------------------
-- 5. KEBIJAKAN SPH & BAP (admin_utama & admin_keuangan)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth full access on sph_documents" ON public.sph_documents;
DROP POLICY IF EXISTS "Utama and Keuangan manage sph_documents" ON public.sph_documents;
CREATE POLICY "Utama and Keuangan manage sph_documents" 
ON public.sph_documents FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'));

DROP POLICY IF EXISTS "Auth full access on bap_documents" ON public.bap_documents;
DROP POLICY IF EXISTS "Utama and Keuangan manage bap_documents" ON public.bap_documents;
CREATE POLICY "Utama and Keuangan manage bap_documents" 
ON public.bap_documents FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'));

-- ------------------------------------------------------------------------------
-- 6. KEBIJAKAN ASET TEKNIS: KALIBRATOR, TABLET, PEMINJAMAN (admin_utama & admin_teknik)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth full access on calibrators" ON public.calibrators;
DROP POLICY IF EXISTS "Utama and Teknik manage calibrators" ON public.calibrators;
CREATE POLICY "Utama and Teknik manage calibrators" 
ON public.calibrators FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'));

DROP POLICY IF EXISTS "Auth full access on tablet_devices" ON public.tablet_devices;
DROP POLICY IF EXISTS "Utama and Teknik manage tablet_devices" ON public.tablet_devices;
CREATE POLICY "Utama and Teknik manage tablet_devices" 
ON public.tablet_devices FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'));

DROP POLICY IF EXISTS "Auth full access on tablet_loans" ON public.tablet_loans;
DROP POLICY IF EXISTS "Utama and Teknik manage tablet_loans" ON public.tablet_loans;
CREATE POLICY "Utama and Teknik manage tablet_loans" 
ON public.tablet_loans FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik'));

-- ------------------------------------------------------------------------------
-- 7. KEBIJAKAN KEUANGAN: TRANSAKSI & ASET KEUANGAN (admin_utama & admin_keuangan)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth full access on financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Utama and Keuangan manage financial_transactions" ON public.financial_transactions;
CREATE POLICY "Utama and Keuangan manage financial_transactions" 
ON public.financial_transactions FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'));

DROP POLICY IF EXISTS "Auth full access on financial_assets" ON public.financial_assets;
DROP POLICY IF EXISTS "Utama and Keuangan manage financial_assets" ON public.financial_assets;
CREATE POLICY "Utama and Keuangan manage financial_assets" 
ON public.financial_assets FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_keuangan'));

-- ------------------------------------------------------------------------------
-- 8. KEBIJAKAN MASTER DATA: HOSPITALS, TECHNICIANS, MARKETING (Semua Role Internal)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth full access on hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Authenticated manage hospitals" ON public.hospitals;
CREATE POLICY "Authenticated manage hospitals" 
ON public.hospitals FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'));

DROP POLICY IF EXISTS "Auth full access on technicians" ON public.technicians;
DROP POLICY IF EXISTS "Authenticated manage technicians" ON public.technicians;
CREATE POLICY "Authenticated manage technicians" 
ON public.technicians FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'));

DROP POLICY IF EXISTS "Auth full access on marketing_staff" ON public.marketing_staff;
DROP POLICY IF EXISTS "Authenticated manage marketing_staff" ON public.marketing_staff;
CREATE POLICY "Authenticated manage marketing_staff" 
ON public.marketing_staff FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'))
WITH CHECK (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'));

-- ------------------------------------------------------------------------------
-- 9. KEBIJAKAN SETTINGS / TEMPLATES (Baca untuk semua internal, Tulis HANYA admin_utama)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth full access on settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated read settings" ON public.settings;
CREATE POLICY "Authenticated read settings" 
ON public.settings FOR SELECT 
TO authenticated 
USING (public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'));

DROP POLICY IF EXISTS "Admin utama write settings" ON public.settings;
CREATE POLICY "Admin utama write settings" 
ON public.settings FOR ALL 
TO authenticated 
USING (public.get_current_user_role() = 'admin_utama')
WITH CHECK (public.get_current_user_role() = 'admin_utama');

-- ------------------------------------------------------------------------------
-- 10. KEBIJAKAN STORAGE OBJECTS (Supabase Storage RLS)
-- ------------------------------------------------------------------------------
-- Bucket 'documents' (Publik untuk aset logo, kop template)
-- Bucket 'internal-documents' (Privat untuk SPH, BAP, data sensitif)

-- Pastikan tabel storage.objects dilindungi RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read on documents bucket" ON storage.objects;
CREATE POLICY "Public read on documents bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated upload on documents bucket" ON storage.objects;
CREATE POLICY "Authenticated upload on documents bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan'));

DROP POLICY IF EXISTS "Internal confidential storage read" ON storage.objects;
CREATE POLICY "Internal confidential storage read"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'internal-documents' 
    AND public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan')
);

DROP POLICY IF EXISTS "Internal confidential storage insert" ON storage.objects;
CREATE POLICY "Internal confidential storage insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'internal-documents' 
    AND public.get_current_user_role() IN ('admin_utama', 'admin_teknik', 'admin_keuangan')
);

DROP POLICY IF EXISTS "Admin utama manage all storage" ON storage.objects;
CREATE POLICY "Admin utama manage all storage"
ON storage.objects FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'admin_utama')
WITH CHECK (public.get_current_user_role() = 'admin_utama');

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- ==============================================================================
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
        public.labels, 
        public.label_folders, 
        public.schedules, 
        public.sph_documents, 
        public.bap_documents, 
        public.calibrators, 
        public.tablet_devices, 
        public.tablet_loans, 
        public.hospitals, 
        public.technicians, 
        public.marketing_staff, 
        public.financial_transactions, 
        public.financial_assets, 
        public.settings;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
