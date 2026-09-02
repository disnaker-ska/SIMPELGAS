# Panduan Onboarding Developer & AI Agent
# SIMPELGAS — Sistem Monitoring Penugasan & Laporan Kegiatan ASN
### Dinas Tenaga Kerja Kota Surakarta

---

Dokumen ini adalah panduan "Hari Pertama" untuk **developer teknis (IT Staff / Vendor) dan AI Coding Agent** yang akan berkontribusi pada proyek SIMPELGAS.

> **Untuk AI Agent**: Dokumen ini adalah **entry point utama** — baca seksi 1 dan 3 dulu, lalu gunakan tabel di seksi 1 untuk navigasi ke dokumen spesifik sesuai task yang sedang dikerjakan. Tidak perlu baca semua dokumen sekaligus; cukup baca yang relevan.

---

## 1. Peta Dokumen Teknis (Kapan Membaca Apa)

| Dokumen | Gunakan Ketika... |
| :--- | :--- |
| **Dokumen ini** (`ONBOARDING.md`) | Orientasi awal, peta kode, alur kerja dev, FAQ arsitektur |
| [`PRD-SIMPELGAS.md`](PRD-SIMPELGAS.md) | Perlu memahami fitur bisnis, alur pengguna, atau kontrak API Apps Script (`doGet`/`doPost` payload) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Mengerjakan integrasi Apps Script, alur cetak iframe, session middleware, atau diagram data flow |
| [`CODING_STANDARD.md`](CODING_STANDARD.md) | Sebelum menulis kode baru — konvensi TypeScript, naming `-client.tsx`, Server Actions, token warna |
| [`UIUX_DESIGN.md`](UIUX_DESIGN.md) | Menyentuh komponen UI — palet Civic Spectrum (Sky/Pink/Violet), tipografi, spesifikasi komponen |
| [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md) | Sebelum mengklaim task selesai — 5 Evidence Gates wajib dipenuhi |
| [`TECH_STACK.md`](TECH_STACK.md) | Butuh versi library spesifik, ADR (kenapa pilih teknologi X), atau referensi env vars |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Setup produksi, deploy ke Vercel, atau deploy ulang Apps Script |
| [`CHANGELOG.md`](CHANGELOG.md) | Memahami riwayat perubahan arsitektur atau menambah entri rilis baru |

---

## 2. Setup Lingkungan Lokal

### 2.1 Prasyarat Sistem

Pastikan sudah terinstall:

```bash
node --version   # Harus >= 20.x LTS
npm --version    # Harus >= 10.x
git --version    # Versi apa saja
```

### 2.2 Clone & Install

```bash
# Clone repository
git clone <url-repository-simpelgas>
cd SIMPELGAS

# Install seluruh dependensi
npm install
```

### 2.3 Konfigurasi Environment Variables

```bash
# Salin template env
cp .env.example .env
```

Buka file `.env` dan isi nilai-nilai berikut (minta dari tim teknis / pemilik proyek):

```bash
APPSCRIPT_URL=https://script.google.com/macros/s/[ID]/exec  # URL Apps Script Web App
GEMINI_API_KEY=AIzaSy...                                    # Google AI Studio API Key
PIN_KEPALA_DINAS=xxxxxx                                     # PIN 6 digit
PIN_SEKRETARIS=xxxxxx
PIN_KASUBAG_PERKEU=xxxxxx
PIN_KASUBAG_AKO=xxxxxx
PIN_KABID_PPTK=xxxxxx
PIN_KABID_HI=xxxxxx
```

> **⚠️ Jangan pernah commit file `.env` ke repository.** File ini sudah tercantum di `.gitignore`.

### 2.4 Jalankan Dev Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — aplikasi siap.

---

## 3. Peta Kode (Code Map)

```
src/
├── middleware.ts          ← Guard rute /pimpinan/* (periksa cookie sesi)
├── app/
│   ├── layout.tsx         ← Root layout: sidebar + font Plus Jakarta Sans
│   ├── page.tsx           ← Redirect root ke /dashboard
│   ├── dashboard/         ← Halaman analytics (Server Component)
│   ├── input/             ← Form pelaporan penugasan ASN
│   ├── cetak/             ← Halaman cetak lembar kedinasan (iframe)
│   ├── pimpinan/          ← Portal evaluasi pimpinan (protected route)
│   └── api/enhance/       ← Proxy Gemini AI (Route Handler)
├── components/
│   ├── dashboard-client.tsx   ← Interaktivitas dashboard (charts, filter, tabel)
│   ├── input-form-client.tsx  ← Form dengan kompres foto + AI enhancement
│   ├── cetak-client.tsx       ← Engine render lembar cetak
│   ├── pimpinan-client.tsx    ← UI evaluasi pimpinan
│   └── sidebar.tsx            ← Navigasi sidebar (collapsible desktop + mobile drawer)
└── lib/
    ├── actions.ts         ← SEMUA Server Actions ('use server')
    ├── appscript.ts       ← HTTP adapter ke Google Apps Script
    ├── types.ts           ← Interface TypeScript domain (Pegawai, Laporan, dll.)
    ├── validations.ts     ← Skema validasi Zod
    ├── print-utils.ts     ← Formatter teks cetak + media bypass
    └── utils.ts           ← Helper cn() untuk class Tailwind
```

**Backend non-Next.js:**
```
code.gs    ← Google Apps Script (doGet/doPost handler, Spreadsheet & Drive ops)
```

---

## 4. Alur Kerja Pengembangan

### 4.1 Mulai Task Baru

```bash
git checkout main
git pull origin main
git checkout -b feat/nama-fitur   # atau fix/nama-bug
```

### 4.2 Siklus Development

1. Tulis atau update unit test di `tests/*.test.ts` **sebelum** implementasi (TDD).
2. Implementasi perubahan.
3. Jalankan gerbang verifikasi:

```bash
npm run lint          # ESLint: harus 0 error
npm run typecheck     # TypeScript: harus 0 error
npm test              # Vitest: harus 100% pass
npm run build         # Next.js build: harus sukses
# atau sekaligus:
npm run ci:local      # Semua di atas dalam satu perintah
```

4. Commit dengan format Conventional Commits:

```bash
git commit -m "feat(dashboard): tambahkan filter rentang tanggal presisi"
git commit -m "fix(appscript): perbaiki parsing tanggal bulan < 10"
```

5. Push dan buat Pull Request ke `main`.

### 4.3 Definition of Done

Sebelum PR di-merge, **semua** 5 Evidence Gates wajib hijau:

| Gate | Perintah | Kriteria |
| :--- | :--- | :--- |
| 1 – Static Quality | `npm run lint && npm run typecheck` | 0 error/warning |
| 2 – Testing | `npm test` | 100% test suites pass |
| 3 – Local CI | `npm run ci:local` | Exit code 0 |
| 4 – Build | `npm run build` | Bundle sukses, no hydration error |
| 5 – Domain | Manual check | Apps Script contract & format cetak OK |

---

## 5. Pola Arsitektur Kunci (Quick Reference)

### Data Fetching
```typescript
// Di page.tsx (Server Component) — ambil data paralel
export const dynamic = 'force-dynamic'
const [laporan, pegawai] = await Promise.all([getAllLaporan(), getPegawai()])
```

### Mutasi Data
```typescript
// Di actions.ts — setelah mutasi sukses, invalidate cache
revalidatePath('/dashboard')
revalidatePath('/cetak')
revalidatePath('/pimpinan')
```

### Komponen Interaktif
```typescript
// Wajib 'use client' + nama file berakhiran -client.tsx
'use client'
export function DashboardClient({ initialLaporan, ... }) { ... }
```

### Warna & Styling
Gunakan palet Civic Spectrum (bukan token lama `navy-*`/`amber-*`):
```tsx
// Primary CTA
<button className="bg-sky-400 text-[#082F49] hover:bg-sky-500">
// AI Feature
<div className="bg-violet-50 text-violet-700">
// Status sukses
<span className="bg-emerald-50 text-emerald-600">
```

---

## 6. Hal yang Sering Ditanyakan (FAQ)

**Q: Kenapa tidak pakai database biasa (PostgreSQL/MySQL)?**
A: Keputusan arsitektur sadar — menggunakan Google Spreadsheet via Apps Script agar bebas biaya server bulanan dan data dapat diakses langsung oleh staf dinas via Google Sheets. Lihat `TECH_STACK.md §2.2`.

**Q: Kenapa POST ke Apps Script pakai `Content-Type: text/plain`?**
A: Google Apps Script tidak mendukung CORS preflight untuk `Content-Type: application/json`. Dengan `text/plain`, request dianggap *simple request* dan tidak memicu preflight. Lihat `ARCHITECTURE.md §6`.

**Q: Gambar dari Google Drive tidak muncul di mode cetak?**
A: Ini by design. Gunakan `getDirectImageBase64()` di `src/lib/actions.ts` yang men-proxy gambar ke Base64 di sisi server. Jangan embed URL Google Drive langsung di iframe cetak.

**Q: Kenapa ada token warna lama (`navy-main`) di `tailwind.config.ts`?**
A: Sedang dalam proses migrasi ke palet Civic Spectrum baru. Untuk komponen **baru**, gunakan kelas Tailwind bawaan (`sky-*`, `pink-*`, `violet-*`, `slate-*`). Lihat `CODING_STANDARD.md §5.2`.

**Q: Di mana saya harus mendefinisikan tipe TypeScript baru?**
A: Semua interface domain di `src/lib/types.ts`. Payload atau union type di file yang membutuhkannya atau juga di `types.ts`. Jangan gunakan `any` tanpa komentar justifikasi.

---

## 7. Kontak & Referensi

- **Dokumen Teknis Lengkap**: `docs/DOKUMEN_REFERENSI_TEKNIS/`
- **Rencana Implementasi Task**: `docs/superpowers/`
- **Deployment ke Produksi**: Lihat [`DEPLOYMENT.md`](DEPLOYMENT.md)
- **Riwayat Perubahan**: Lihat [`CHANGELOG.md`](CHANGELOG.md)
