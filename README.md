# 🛡️ RBT Simulation — Sekolah Polisi Negara

> Web Aplikasi Simulasi Reality-Based Training (RBT) untuk Program Pendidikan Pengembangan Spesialisasi (Prolat) Polri

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Angular 19                          |
| Backend     | Node.js + Express.js                |
| Database    | MySQL (mysql2 driver)               |
| Auth        | Google OAuth 2.0                    |
| Legal API   | Pasal.id REST API                   |
| AI Engine   | Google Gemini (generative-ai SDK)   |

## Quick Start

### 1. Database Setup
```sql
-- Jalankan file SQL berikut di MySQL:
-- rbt-backend/database/migrations/001_init.sql
```

### 2. Backend
```bash
cd rbt-backend
cp .env.example .env
# Edit .env sesuai konfigurasi Anda
npm install
npm run dev
```

### 3. Frontend
```bash
cd rbt-frontend
npm install
npx ng serve
```

### 4. Buka Browser
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000/api/health

## Workflow Aplikasi

```
Login (Google) → Input Narasi → Pasal.id (Hukum) → Gemini AI (Skenario) → Hasil RBT
```

## Spesialisasi

- **Reskrim** — Reserse Kriminal
- **Brimob** — Brigade Mobil
- **Lantas** — Lalu Lintas
- **Intelkam** — Intelijen Keamanan
- **Administrasi** — Tata Kelola

## Panduan Deployment

- [Panduan Deploy ke Vercel & Neon DB](file:///c:/Users/kresnamukti/Documents/contoh%20saja/DEPLOY_VERCEL_NEON.md)
- [Panduan Deploy ke Render & Aiven (Alternative)](file:///c:/Users/kresnamukti/Documents/contoh%20saja/DEPLOY_README.md)

# E-PIKPOR

# sipakar-rbt
