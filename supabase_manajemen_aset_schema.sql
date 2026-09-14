-- ====================================================================
-- SKEMA LENGKAP DATABASE MANAJEMEN ASET & PENJADWALAN RS UNTUK SUPABASE
-- PT. SARANA MULTI KALIBRASI (PT. SMK)
-- ====================================================================
-- Anda dapat menyalin dan menjalankan kode SQL ini langsung di 
-- menu 'SQL Editor' pada Dashboard Supabase Anda jika ingin memiliki
-- tabel terpisah secara native.
-- ====================================================================

-- 1. Tabel Master Rumah Sakit
CREATE TABLE IF NOT EXISTS public.hospitals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    pic TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Master Teknisi
CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    specialization TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Master Marketing
CREATE TABLE IF NOT EXISTS public.marketing_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Alat Standar Kalibrator
CREATE TABLE IF NOT EXISTS public.calibrators (
    id TEXT PRIMARY KEY,
    no_kalibrator TEXT,
    nama_alat TEXT NOT NULL,
    merk_tipe TEXT,
    no_seri TEXT,
    instansi_penerbit TEXT,
    no_sertifikat TEXT,
    tgl_kalibrasi TEXT,
    tgl_berakhir TEXT,
    keterangan TEXT,
    status TEXT DEFAULT 'Tersedia',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Penjadwalan Kalibrasi RS (Work Order / SPK)
CREATE TABLE IF NOT EXISTS public.schedules (
    id TEXT PRIMARY KEY,
    hospital_name TEXT NOT NULL,
    pic_name TEXT,
    pic_phone TEXT,
    address TEXT,
    scheduled_date DATE,
    lead_technician_id TEXT,
    assistant_technicians JSONB DEFAULT '[]'::jsonb,
    calibrator_ids JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Scheduled',
    label_prefix TEXT,
    start_label_number INTEGER,
    end_label_number INTEGER,
    sph_number TEXT,
    spk_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabel Surat Penawaran Harga (SPH)
CREATE TABLE IF NOT EXISTS public.sph_documents (
    id TEXT PRIMARY KEY,
    sph_number TEXT NOT NULL UNIQUE,
    date DATE,
    hospital_name TEXT NOT NULL,
    hospital_address TEXT,
    hospital_pic TEXT,
    hospital_phone TEXT,
    marketing_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    ppn NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabel Berita Acara Pelaksanaan (BAP & BASTP)
CREATE TABLE IF NOT EXISTS public.bap_documents (
    id TEXT PRIMARY KEY,
    bap_number TEXT NOT NULL UNIQUE,
    bastp_number TEXT,
    date DATE,
    hospital_name TEXT NOT NULL,
    sph_number TEXT,
    spk_number TEXT,
    lead_technician TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Selesai',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabel Tablet & Peminjaman Perangkat
CREATE TABLE IF NOT EXISTS public.tablet_devices (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    serial_number TEXT,
    brand_model TEXT,
    status TEXT DEFAULT 'Tersedia',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tablet_loans (
    id TEXT PRIMARY KEY,
    tablet_id TEXT,
    technician_id TEXT,
    loan_date DATE,
    return_date DATE,
    status TEXT DEFAULT 'Dipinjam',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabel Transaksi Keuangan & Aset
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id TEXT PRIMARY KEY,
    date DATE,
    type TEXT NOT NULL,
    category TEXT,
    amount NUMERIC DEFAULT 0,
    description TEXT,
    schedule_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sph_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bap_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablet_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablet_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Allow anon read and write
CREATE POLICY "Allow public all access on hospitals" ON public.hospitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on technicians" ON public.technicians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on marketing_staff" ON public.marketing_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on calibrators" ON public.calibrators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on sph_documents" ON public.sph_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on bap_documents" ON public.bap_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on tablet_devices" ON public.tablet_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on tablet_loans" ON public.tablet_loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on financial_transactions" ON public.financial_transactions FOR ALL USING (true) WITH CHECK (true);
