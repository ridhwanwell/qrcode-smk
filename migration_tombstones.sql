-- ==============================================================================
-- MIGRASI TOMBSTONE JADWAL DIHAPUS (PT. SMK)
-- ==============================================================================
-- File ini dibuat untuk dijalankan manual oleh administrator database Supabase.
-- Menggantikan filter ID hardcoded 'SCH-007241' dan 'SCH-594702' di backend
-- dengan mekanisme tombstone standar tabel public.labels.
-- ==============================================================================

-- 1. Masukkan data tombstone standar untuk jadwal SCH-007241
INSERT INTO public.labels (
    no_label,
    status,
    pdf_source,
    pdf_name,
    pdf_url,
    created_at,
    updated_at
) VALUES (
    '__tombstone_schedules_SCH-007241',
    'deleted_tombstone',
    'schedules',
    'SCH-007241',
    '{"id":"SCH-007241","deletedAt":"2026-03-01T00:00:00.000Z","reason":"Penghapusan manual jadwal SCH-007241"}',
    NOW(),
    NOW()
) ON CONFLICT (no_label) DO NOTHING;

-- 2. Masukkan data tombstone standar untuk jadwal SCH-594702
INSERT INTO public.labels (
    no_label,
    status,
    pdf_source,
    pdf_name,
    pdf_url,
    created_at,
    updated_at
) VALUES (
    '__tombstone_schedules_SCH-594702',
    'deleted_tombstone',
    'schedules',
    'SCH-594702',
    '{"id":"SCH-594702","deletedAt":"2026-03-01T00:00:00.000Z","reason":"Penghapusan manual duplikat jadwal RSUD Dr. Moewardi SCH-594702"}',
    NOW(),
    NOW()
) ON CONFLICT (no_label) DO NOTHING;

-- Verifikasi hasil migrasi
SELECT no_label, status, pdf_name, updated_at 
FROM public.labels 
WHERE no_label LIKE '__tombstone_schedules_%';
