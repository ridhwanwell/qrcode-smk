-- ==============================================================================
-- SKEMA TABEL IDEMPOTENSI API (API IDEMPOTENCY STORE)
-- PT. SARANA MULTI KALIBRASI (PT. SMK)
-- ==============================================================================
-- Skrip ini menyiapkan tabel public.api_idempotency untuk menyimpan rekaman
-- kunci idempotensi pada lingkungan serverless (Vercel) dan container.
-- Akses tabel ini 100% eksklusif hanya untuk Supabase Service Role (backend).
-- ==============================================================================

-- 1. Buat Tabel api_idempotency
CREATE TABLE IF NOT EXISTS public.api_idempotency (
    key TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    response JSONB NOT NULL,
    status_code INT NOT NULL DEFAULT 200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 2. Buat Indeks pada expires_at untuk efisiensi pembersihan data kedaluwarsa
CREATE INDEX IF NOT EXISTS idx_api_idempotency_expires_at ON public.api_idempotency(expires_at);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.api_idempotency ENABLE ROW LEVEL SECURITY;

-- 4. Cabut (REVOKE) seluruh hak akses dari peran anon, authenticated, dan PUBLIC
REVOKE ALL ON TABLE public.api_idempotency FROM anon, authenticated, PUBLIC;

-- Catatan:
-- Tidak dibuat policy baru untuk anon maupun authenticated.
-- Akses baca/tulis hanya dapat dilakukan oleh Supabase Service Role (backend server / Vercel Serverless Function).
