-- =====================================================================
-- KEAMANAN QR LABEL & STATUS VOID
-- =====================================================================
-- 1. verify_code : kode acak 6 huruf/angka per label. QR stiker baru berisi
--                  /sertifikat/<no_label>?k=<verify_code>. Tanpa kode yang benar,
--                  sertifikat tidak bisa dibuka (mencegah orang menebak nomor
--                  label berurutan untuk melihat sertifikat RS lain).
-- 2. qr_secured  : TRUE  = label wajib pakai kode (label baru, diisi server aplikasi).
--                  FALSE = label lama yang stikernya sudah tercetak tanpa kode
--                          (tetap bisa dibuka tanpa kode supaya tidak rusak).
-- 3. void_reason / voided_at : catatan stiker rusak / batal / hilang.
-- Aman dijalankan berulang kali.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Kode acak dari huruf/angka yang tidak mirip satu sama lain (tanpa 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public.generate_label_verify_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  result text := '';
  i int;
BEGIN
  FOR i IN 0..5 LOOP
    result := result || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_label_verify_code() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS verify_code text;
-- Label yang SUDAH ADA = false (stiker lama tanpa kode tetap berfungsi)
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS qr_secured boolean NOT NULL DEFAULT false;
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS voided_at timestamptz;

-- Beri kode ke semua label lama (dipakai bila stiker dicetak ulang)
UPDATE public.labels SET verify_code = public.generate_label_verify_code() WHERE verify_code IS NULL;

-- Label BARU otomatis dapat kode. Penanda qr_secured = true untuk label baru
-- diisi oleh server aplikasi (bukan default database), supaya stiker yang dicetak
-- oleh versi aplikasi lama (QR tanpa kode) tidak ikut terkunci.
ALTER TABLE public.labels ALTER COLUMN verify_code SET DEFAULT public.generate_label_verify_code();
