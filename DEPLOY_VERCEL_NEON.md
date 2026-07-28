# Panduan Deployment RBT Simulation ke Vercel & Neon Database

Dokumen ini berisi panduan teknis langkah demi langkah untuk melakukan deployment aplikasi **RBT Simulation (SPN Polri)** secara **100% Gratis** menggunakan:
- **Neon Database** ([neon.tech](https://neon.tech/)) — Serverless Cloud Database.
- **Vercel** ([vercel.com](https://vercel.com/)) — Deployment Platform untuk Frontend Angular & Serverless Backend API.

---

## Arsitektur Deployment

```mermaid
flowchart LR
    User[Pengguna / Browser] -->|HTTPS| VercelFrontend[Vercel Frontend - Angular 19]
    VercelFrontend -->|API Request| VercelBackend[Vercel Serverless / Node.js Backend]
    VercelBackend -->|TLS / Connection Pool| NeonDB[(Neon PostgreSQL/MySQL Database)]
    VercelBackend -->|OAuth 2.0| Google[Google Auth / Cloud]
    VercelBackend -->|AI Gen| Gemini[Google Gemini API]
```

---

## 1. Persiapan Basis Data (Neon Database)

**Neon** adalah penyedia database *Serverless* yang mendukung scaling otomatis dan koneksi cepat berbasis cloud.

### Langkah-Langkah:
1. Buka situs [Neon.tech](https://neon.tech/) dan buat akun (dapat menggunakan akun GitHub/Google).
2. Di dashboard Neon, klik **Create Project**.
3. Beri nama proyek, contohnya: `sipakar-rbt-db`.
4. Pilih Cloud Region yang paling dekat dengan lokasi pengguna (misalnya: `Asia Pacific (Singapore) / ap-southeast-1`).
5. Setelah proyek berhasil dibuat, Anda akan melihat halaman **Dashboard Dashboard / Quickstart**.
6. Salin **Connection String / Database URL**. Formatnya seperti berikut:
   ```env
   postgres://username:password@ep-sample-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
7. **Koneksi Pooling (Direkomendasikan untuk Serverless Vercel):**
   - Di Neon Dashboard, aktifkan opsi **Pooled Connection** (Koneksi Terkompresi/Pooled).
   - Gunakan connection string versi Pooled ini untuk ditaruh pada `DATABASE_URL` di Vercel.

### Import Schema Database:
1. Buka tab **SQL Editor** pada Dashboard Neon (atau gunakan tools GUI seperti DBeaver/TablePlus/pgAdmin).
2. Jalankan skrip DDL/Migration SQL dari proyek untuk membuat tabel yang dibutuhkan (`users`, `simulations`, `simulation_results`, `legal_references`).

---

## 2. Deployment Backend ke Vercel

Backend aplikasi ini dapat dijalankan sebagai **Serverless Functions** di Vercel.

### Langkah-Langkah:
1. Pastikan repositori lokal sudah di-push ke **GitHub**:
   `https://github.com/syamsularifinbatubara504-cloud/sipakar-rbt.git`
2. Buka [Vercel Console](https://vercel.com/dashboard) dan masuk ke akun Anda.
3. Klik tombol **Add New...** > **Project**.
4. Hubungkan akun GitHub Anda dan pilih repositori `sipakar-rbt`.
5. Atur konfigurasi proyek Backend:
   - **Project Name**: `sipakar-rbt-backend` (atau nama lain pilihan Anda).
   - **Framework Preset**: `Other` / `Node.js`.
   - **Root Directory**: (Biarkan default `/` jika `api/index.js` berada di root, atau pilih `api`).
6. Buka bagian **Environment Variables** dan tambahkan variabel berikut:

   | Key | Value / Keterangan |
   |---|---|
   | `DATABASE_URL` | Connection String Neon Database (Pooled) |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | Secret key acak yang kuat (misal: `rbt_spn_secret_2026_x89a`) |
   | `JWT_EXPIRES_IN` | `24h` |
   | `GEMINI_API_KEY` | API Key Google Gemini AI Anda |
   | `PASAL_API_BASE_URL` | `https://pasal.id/api/v1` |
   | `PASAL_API_TOKEN` | Token API Pasal.id Anda |
   | `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
   | `GOOGLE_CLIENT_SECRET` | Client Secret Google OAuth |
   | `FRONTEND_URL` | URL Vercel Frontend Anda (misal: `https://sipakar-rbt.vercel.app`) |

7. Klik **Deploy**.
8. Setelah deployment selesai, catat URL API Backend yang dihasilkan oleh Vercel (misalnya: `https://sipakar-rbt-backend.vercel.app`).

---

## 3. Deployment Frontend Angular ke Vercel

### 1. Update Konfigurasi Production Frontend
Buka file `rbt-frontend/src/environments/environment.prod.ts` dan pastikan `apiUrl` menunjuk ke URL Backend Vercel Anda:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://sipakar-rbt-backend.vercel.app/api',
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
};
```

### 2. Deployment di Vercel Dashboard
1. Di Vercel Dashboard, klik **Add New...** > **Project**.
2. Pilih repositori `sipakar-rbt`.
3. Atur konfigurasi proyek Frontend:
   - **Project Name**: `sipakar-rbt`
   - **Framework Preset**: `Angular` (Vercel akan otomatis mendeteksi Angular)
   - **Root Directory**: Ubah ke `rbt-frontend`
   - **Build & Output Settings**:
     - Build Command: `ng build`
     - Output Directory: `dist/rbt-frontend/browser` (atau `dist/rbt-frontend`)
4. Klik **Deploy**.
5. Tunggu hingga proses kompilasi selesai. Vercel akan memberikan URL Frontend (contoh: `https://sipakar-rbt.vercel.app`).

---

## 4. Konfigurasi Google OAuth & CORS

1. **Update Authorized Origins di Google Cloud Console:**
   - Buka [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Edit OAuth 2.0 Web Client Anda.
   - Pada **Authorized JavaScript origins**, tambahkan URL Vercel Frontend: `https://sipakar-rbt.vercel.app`.
   - Pada **Authorized redirect URIs**, tambahkan URL Vercel Backend & Frontend.
   - Simpan perubahan.

2. **Update Environment `FRONTEND_URL` di Vercel Backend:**
   - Pastikan variabel `FRONTEND_URL` di Vercel Backend sudah persis sama dengan URL Frontend Vercel (tanpa `/` trailing slash).

---

## Ringkasan Checklist Deployment

- [x] Project & Database Neon aktif
- [x] Migrasi tabel database selesai
- [x] Environment Variables backend di Vercel terkonfigurasi
- [x] Angular production environment updated dengan URL backend Vercel
- [x] Deployment frontend & backend di Vercel sukses
- [x] Authorized origins Google OAuth telah ditambahkan

---

*Panduan dibuat untuk Proyek Simulasi Reality-Based Training (RBT) SPN Polri.*
