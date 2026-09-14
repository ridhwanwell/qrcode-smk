-- ==============================================================================
-- SKEMA BASIS DATA UTAMA SUPABASE - PT. SARANA MULTI KALIBRASI (PT. SMK)
-- Arsitektur: 100% Supabase PostgreSQL + Supabase Auth + Supabase Storage
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
-- KEAMANAN: ROW LEVEL SECURITY (RLS) & KEBIJAKAN AKSES
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

-- Helper Function: Dapatkan peran pengguna saat ini
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Kebijakan untuk Labels:
-- Publik/Rumah sakit dapat membaca label (untuk scan QR kelaikan alat di stiker)
CREATE POLICY "Public can view labels" 
ON public.labels FOR SELECT 
USING (true);

-- Hanya staf internal yang login yang dapat mengubah/menambah label
CREATE POLICY "Authenticated users can manage labels" 
ON public.labels FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Kebijakan untuk Profiles:
CREATE POLICY "Users can read all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 3. Kebijakan untuk Activity Log:
CREATE POLICY "Authenticated users can read activity log" 
ON public.activity_log FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert activity log" 
ON public.activity_log FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Kebijakan untuk Seluruh Modul Operasional Internal:
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'label_folders', 'schedules', 'sph_documents', 'bap_documents', 
        'calibrators', 'tablet_devices', 'tablet_loans', 'hospitals', 
        'technicians', 'marketing_staff', 'financial_transactions', 
        'financial_assets', 'settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Auth full access on %I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Auth full access on %I" ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);', tbl, tbl);
    END LOOP;
END $$;

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
