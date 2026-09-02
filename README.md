# SIMPELGAS
### Sistem Informasi Monitoring Penugasan & Laporan Kegiatan ASN
**Dinas Tenaga Kerja Kota Surakarta**

---

## 📌 Tentang Proyek

**SIMPELGAS** (v2.0.0) adalah aplikasi web monolitik modern yang dirancang untuk memfasilitasi pelaporan kegiatan penugasan, monitoring real-time, evaluasi bertingkat oleh pejabat struktural, serta pencetakan lembar dinas formal bagi Aparatur Sipil Negara (ASN) di lingkungan Dinas Tenaga Kerja Kota Surakarta.

Sistem dibangun menggunakan pendekatan **Hybrid Serverless BFF (Backend-for-Frontend) + Cloud Workspace Native Datastore** yang menggabungkan kecepatan performa **Next.js 14 App Router** dengan efisiensi ekosistem **Google Apps Script**, **Google Sheets**, dan **Google Drive** tanpa biaya infrastruktur server/database berbayar.

---

## 🏗️ Struktur Proyek Monolith

Aplikasi menggunakan struktur direktori berbasis `src/` dengan pembagian modul yang bersih (*separation of concerns*):

```text
SIMPELGAS/
├── docs/
│   ├── DOKUMEN_REFERENSI_TEKNIS/      # Cetak biru teknis, PRD, standar koding, dan UI/UX
│   │   ├── ARCHITECTURE.md            # Arsitektur sistem lengkap & diagram alur
│   │   ├── CODING_STANDARD.md         # Standar koding TypeScript & Next.js 14
│   │   ├── DEFINITION_OF_DONE.md      # Standar kriteria selesai berbasis 5 Evidence Gates
│   │   ├── PRD-SIMPELGAS.md           # Product Requirements Document
│   │   ├── TECH_STACK.md              # Rincian teknologi, pustaka, & ADR
│   │   └── UIUX_DESIGN.md             # Desain antarmuka, warna, & tipografi
│   └── superpowers/                  # Spesifikasi fitur & task implementation plans
├── public/                           # Aset statis klien (Logo Pemkot, ikon, favicon)
├── src/
│   ├── app/                          # Next.js 14 App Router (Rute & Halaman)
│   │   ├── api/                      # Route Handlers (AI text refinement proxy)
│   │   ├── cetak/                    # Halaman cetak laporan dinas formal
│   │   ├── dashboard/                # Halaman dashboard analitik kegiatan
│   │   ├── input/                    # Halaman form pelaporan penugasan ASN
│   │   ├── pimpinan/                 # Portal evaluasi pimpinan terproteksi (PIN/Role)
│   │   ├── globals.css               # Desain token tema, print media styles
│   │   ├── layout.tsx                # Root layout & navigasi sidebar
│   │   └── page.tsx                  # Root redirect ke /dashboard
│   ├── components/                   # Client components & UI reusable elements
│   ├── lib/                          # Server Actions, Apps Script adapter, types, utils
│   │   ├── actions.ts                # Server Actions ('use server')
│   │   ├── appscript.ts              # HTTP client adapter ke Google Apps Script
│   │   ├── print-utils.ts            # Formatter teks cetak & Google Drive image proxy
│   │   ├── types.ts                  # Domain TypeScript interfaces
│   │   └── utils.ts                  # Tailwind merge & helper utils
│   └── middleware.ts                 # Edge route protection (/pimpinan guard)
├── tests/                            # Pengujian otomatis unit & integrasi (Vitest)
├── code.gs                           # Script backend Google Apps Script Web App (V8)
├── next.config.js                    # Konfigurasi Next.js
├── tailwind.config.ts                # Konfigurasi tema Tailwind CSS
├── tsconfig.json                     # Konfigurasi TypeScript compiler
├── vitest.config.mjs                 # Konfigurasi Vitest runner
└── package.json                      # Dependensi & NPM scripts
```

---

## 📚 Dokumen Referensi Teknis

Seluruh dokumentasi teknis mendalam disimpan di folder [`docs/DOKUMEN_REFERENSI_TEKNIS/`](docs/DOKUMEN_REFERENSI_TEKNIS/):

1. 📘 [PRD-SIMPELGAS.md](docs/DOKUMEN_REFERENSI_TEKNIS/PRD-SIMPELGAS.md) — *Product Requirements Document, fitur inti, dan alur bisnis.*
2. 🏛️ [ARCHITECTURE.md](docs/DOKUMEN_REFERENSI_TEKNIS/ARCHITECTURE.md) — *Arsitektur sistem, topologi, security model, dan diagram aliran data.*
3. ⚙️ [TECH_STACK.md](docs/DOKUMEN_REFERENSI_TEKNIS/TECH_STACK.md) — *Inventaris dependensi, ADR (Architectural Decision Records), dan panduan environment.*
4. 🎨 [UIUX_DESIGN.md](docs/DOKUMEN_REFERENSI_TEKNIS/UIUX_DESIGN.md) — *Desain visual, palet warna resmi Pemkot Surakarta, tipografi, dan print layout.*
5. 📐 [CODING_STANDARD.md](docs/DOKUMEN_REFERENSI_TEKNIS/CODING_STANDARD.md) — *Konvensi kode TypeScript, panduan Server Actions, dan aturan testing.*
6. 🎯 [DEFINITION_OF_DONE.md](docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md) — *Standar Definition of Done berbasis 5 Gerbang Bukti (Evidence Gates).*

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Prasyarat
* Node.js versi 18.17 atau lebih baru
* Akun Google Workspace Disnaker Surakarta (untuk Apps Script & Spreadsheet)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment
Salin `.env.example` menjadi `.env` dan lengkapi variabel yang dibutuhkan:
```bash
cp .env.example .env
```
Variabel penting:
* `APPSCRIPT_URL`: URL deployment Web App Google Apps Script (`code.gs`).
* `GEMINI_API_KEY`: API Key Google Gemini (opsional, untuk fitur penyempurnaan teks AI).
* `PIN_KEPALA_DINAS`, `PIN_SEKRETARIS`, `PIN_KABID_*`: PIN otentikasi pejabat struktural.

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi di peramban: `http://localhost:3000`

### 5. Menjalankan Pengujian Otomatis
```bash
npm test
```

### 6. Membangun untuk Produksi
```bash
npm run build
npm run start
```
