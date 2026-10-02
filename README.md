# Sistem Manajemen Kalibrasi & Sertifikasi - PT. Sarana Multi Kalibrasi (PT. SMK)

Aplikasi web manajemen kalibrasi alat kesehatan, penerbitan stiker QR label terverifikasi, pembuatan dokumen resmi (SPH, BAP, Surat Tugas), pencatatan aset kalibrator & tablet, serta pembukuan arus kas keuangan dengan backend Node.js/Express dan Supabase PostgreSQL.

---

## 🚀 Deploy ke Vercel

Aplikasi ini mendukung arsitektur full-stack di Vercel:
* **Frontend SPA**: Dibangun menggunakan Vite (`dist`)
* **Backend API**: Dijalankan sebagai Vercel Serverless Functions (`api/index.ts` -> Express `createApp()`)

### 1. Environment Variables Wajib di Vercel
Saat melakukan deploy proyek di Vercel Dashboard (*Project Settings* ➔ *Environment Variables*), pastikan variabel-variabel berikut telah ditambahkan:

| Nama Variabel | Lingkungan | Deskripsi |
|---|---|---|
| `SUPABASE_URL` | Server (Production / Preview) | URL proyek Supabase (contoh: `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (Production / Preview) | Kunci Service Role Supabase (rahasia, hanya diakses backend) |
| `VITE_SUPABASE_URL` | Frontend & Client | URL proyek Supabase untuk klien browser |
| `VITE_SUPABASE_ANON_KEY` | Frontend & Client | Kunci Anon Supabase untuk autentikasi browser |

> ⚠️ **Catatan Keamanan**: Kunci `SUPABASE_SERVICE_ROLE_KEY` **hanya** boleh diakses oleh backend server/serverless function dan **tidak boleh** diawali dengan awalan `VITE_`.

### 2. Cara Uji Deployment
Setelah deployment Vercel berhasil, pastikan endpoint backend berjalan normal dengan mengakses:

```bash
GET https://domain-anda.vercel.app/api/health
```

**Respon yang diharapkan:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-02T...",
  "database": "supabase"
}
```

---

## 🛠️ Pengembangan Lokal & Container

Untuk menjalankan aplikasi secara lokal:

```bash
# 1. Pasang dependensi
npm install

# 2. Salin environment variables
cp .env.example .env

# 3. Jalankan development server
npm run dev
```

Server lokal akan berjalan di `http://localhost:3000`.

---

## 🔒 Skema Keamanan & Idempotensi Database

1. **`supabase_security_fix.sql`**: Skrip RLS penguatan keamanan tabel `profiles`, `labels`, `app_collections`, dan Supabase Storage bucket `internal-documents`.
2. **`supabase_idempotency.sql`**: Skrip pembuatan tabel `public.api_idempotency` untuk penyimpanan status kunci idempotensi pada lingkungan serverless Vercel.
