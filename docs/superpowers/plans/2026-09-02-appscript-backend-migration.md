# Migrasi Backend SIMPELGAS ke Google Apps Script & Google Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menggantikan backend Supabase di aplikasi Next.js 14 SIMPELGAS dengan Google Apps Script Web App (`code.gs`) menggunakan Google Spreadsheet sebagai basis data dan Google Drive sebagai penyimpanan berkas.

**Architecture:** Next.js Server Actions dan RSC akan berkomunikasi langsung dengan Google Apps Script Web App via HTTP GET/POST (`APPSCRIPT_URL`). Client Next.js mengompresi dan mengubah file lampiran menjadi Base64, yang diteruskan oleh Next.js Server Action ke `doPost` Apps Script untuk otomatis disimpan di Google Drive (`saveFilesToDrive`) dan di-append ke sheet `REKAP_LAPORAN`.

**Tech Stack:** Next.js 14 (App Router, Server Actions), TypeScript, Tailwind CSS, Google Apps Script Web App (`code.gs`), Google Sheets, Google Drive.

**Spec:** `docs/superpowers/specs/2026-09-02-appscript-backend-migration-design.md`

## Global Constraints
- Kontrak API Next.js harus 100% kompatibel dengan `code.gs` existing tanpa mengubah skrip Apps Script yang sudah berjalan.
- Format tanggal di sheet `DD/MM/YYYY` harus dikonversi ke `YYYY-MM-DD` di Next.js agar kompatibel dengan JavaScript `new Date()` dan filter UI.
- Semua pemanggilan Google Apps Script di server Next.js harus menggunakan `{ redirect: 'follow' }` untuk menangani redirect 302 standar Apps Script.
- Jangan ada sisa ketergantungan atau runtime check ke Supabase yang memicu error `supabaseUrl is required`.

---

### Task 1: Konfigurasi Environment & Next Config

**Files:**
- Modify: `next.config.js`
- Modify: `.env.example`
- Modify: `.env`

**Interfaces:**
- Produces: `process.env.APPSCRIPT_URL`, `bodySizeLimit: '10mb'` di `next.config.js`

- [ ] **Step 1: Update `next.config.js`**
Tambah pengaturan `serverActions` dengan `bodySizeLimit: '10mb'` dan tambah pattern remote domain Google Drive.

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

module.exports = nextConfig
```

- [ ] **Step 2: Update `.env.example`**
Bersihkan variabel Supabase, tambahkan `APPSCRIPT_URL`.

```env
# Google Gemini API Key (server-side only, GRATIS)
# Dapatkan API Key Gratis di: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Google Apps Script Web App Deployment URL
# Dapatkan dari: Google Apps Script -> Deploy -> Manage deployments -> Web App URL
APPSCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec

# PIN Autentikasi Pimpinan (server-side only)
PIN_KEPALA_DINAS=123456
PIN_SEKRETARIS=123456
PIN_KASUBAG_PERKEU=123456
PIN_KASUBAG_AKO=123456
PIN_KABID_PPTK=123456
PIN_KABID_HI=123456
```

- [ ] **Step 3: Update `.env`**
Tambahkan template `APPSCRIPT_URL=` ke file `.env` lokal tanpa menghapus `GEMINI_API_KEY` pengguna.

- [ ] **Step 4: Commit konfigurasi**

```bash
git add next.config.js .env.example
git commit -m "chore: configure next.config.js for apps script uploads and update env example"
```

---

### Task 2: Modul Adapter Google Apps Script (`src/lib/appscript.ts`)

**Files:**
- Create: `src/lib/appscript.ts`

**Interfaces:**
- Consumes: `process.env.APPSCRIPT_URL`
- Produces:
  - `fetchPegawaiFromAppsScript(): Promise<Pegawai[]>`
  - `fetchLaporanFromAppsScript(namaPegawai?: string): Promise<Laporan[]>`
  - `submitLaporanToAppsScript(payload: AppsScriptSubmitPayload): Promise<{ status: string; message?: string }>`
  - `updateEvaluasiInAppsScript(row: number, status: string, catatan: string): Promise<{ status: string; message?: string }>`

- [ ] **Step 1: Tulis implementasi `src/lib/appscript.ts`**
Membuat adapter lengkap untuk GET/POST dengan parsing tanggal `DD/MM/YYYY` $\leftrightarrow$ `YYYY-MM-DD`, pemetaan kolom `DATA_PEGAWAI` (`NIP`, `Nama Pegawai`, `Bidang / Unit Kerja`, `Jabatan`), serta pemetaan baris `REKAP_LAPORAN` ke model `Laporan`.

- [ ] **Step 2: Verifikasi types & syntax build**
Pastikan modul `src/lib/appscript.ts` bebas dari lint/type error.

- [ ] **Step 3: Commit modul adapter**

```bash
git add src/lib/appscript.ts
git commit -m "feat: add Google Apps Script client adapter and data mappers"
```

---

### Task 3: Refactor Server Actions (`src/lib/actions.ts`) & Hapus `src/lib/supabase.ts`

**Files:**
- Modify: `src/lib/actions.ts`
- Delete: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: `src/lib/appscript.ts`
- Produces: `getPegawai()`, `getLaporan()`, `getAllLaporan()`, `getDashboardStats()`, `submitLaporan()`, `updateEvaluasiPimpinan()`, `loginPimpinan()`, `logoutPimpinan()`, `getPimpinanSession()`

- [ ] **Step 1: Hapus `src/lib/supabase.ts`**
Hapus file client Supabase karena tidak lagi dipakai.

- [ ] **Step 2: Refactor `src/lib/actions.ts`**
  - Ganti pemanggilan `createServerSupabaseClient` dengan fungsi dari `src/lib/appscript.ts`.
  - `submitLaporan`: Menerima payload laporan dan lampiran file (base64, nama, mime), lalu mengirimkannya langsung via `submitLaporanToAppsScript`.
  - `updateEvaluasiPimpinan`: Mengambil catatan saat ini (atau dari form), menyusun string `[Role]: Catatan`, lalu memanggil `updateEvaluasiInAppsScript`.
  - Tetap pertahankan sistem autentikasi pimpinan (cookies httpOnly, PIN, session).

- [ ] **Step 3: Commit perubahan actions**

```bash
git rm src/lib/supabase.ts
git add src/lib/actions.ts
git commit -m "refactor: replace supabase queries in actions.ts with apps script adapter"
```

---

### Task 4: Penyesuaian Form Input Client (`src/components/input-form-client.tsx`)

**Files:**
- Modify: `src/components/input-form-client.tsx`

**Interfaces:**
- Consumes: `submitLaporan` from `src/lib/actions.ts`

- [ ] **Step 1: Perbarui alur `handleSubmit` di `src/components/input-form-client.tsx`**
  - Hapus pemanggilan `uploadFiles` (Supabase storage).
  - Susun array file `{ base64, name, mime }` untuk dokumentasi dan materi.
  - Panggil `submitLaporan(formDataPayload, docsPayload, materiPayload)` dalam 1 langkah atomik langsung ke Server Action.

- [ ] **Step 2: Verifikasi alur form input**
Periksa bahwa kompresi gambar, pembuatan Base64, dan pengiriman payload ke Server Action tidak ada type error atau lint error.

- [ ] **Step 3: Commit perubahan form input**

```bash
git add src/components/input-form-client.tsx
git commit -m "refactor: send base64 files directly to submitLaporan for Apps Script Drive upload"
```

---

### Task 5: Pembersihan Dependensi package.json & Verifikasi Build

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Uninstall `@supabase/supabase-js`**
Jalankan: `npm uninstall @supabase/supabase-js`

- [ ] **Step 2: Verifikasi build Next.js**
Jalankan: `npm run build`
Harus lolos kompilasi tanpa error Supabase atau missing type.

- [ ] **Step 3: Commit pembersihan dependensi**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused @supabase/supabase-js dependency"
```
