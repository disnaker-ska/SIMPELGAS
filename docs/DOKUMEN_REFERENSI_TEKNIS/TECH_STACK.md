# Inventaris & Spesifikasi Teknologi (Tech Stack)
# SIMPELGAS — Sistem Monitoring Penugasan & Laporan Kegiatan ASN
### Dinas Tenaga Kerja Kota Surakarta

---

Dokumen ini memuat daftar lengkap pustaka (*libraries*), kerangka kerja (*frameworks*), mesin komputasi (*runtime engines*), alat bantu pengujian (*testing tools*), dan variabel lingkungan yang digunakan dalam pembangunan dan operasional sistem **SIMPELGAS** (v2.0.0).

---

## 1. Matriks Kategori Teknologi

| Kategori | Teknologi / Pustaka | Versi | Peran & Tanggung Jawab Utama |
| :--- | :--- | :--- | :--- |
| **Framework Web** | [Next.js](https://nextjs.org/) | `14.2.29` | Framework Full-stack (App Router, Server Actions, SSR, RSC, Route Handlers) |
| **Pustaka UI Dasar** | [React](https://react.dev/) | `18.3.1` | Pustaka dasar komponen antarmuka pengguna berbasis deklaratif |
| **Bahasa Pemrograman**| [TypeScript](https://www.typescriptlang.org/) | `5.8.3` | Pengetikan statis ketat (*strict typing*) untuk menjamin keandalan kode |
| **Styling Engine** | [Tailwind CSS](https://tailwindcss.com/) | `3.4.17` | Utility-first CSS framework untuk perancangan antarmuka responsif |
| **Animasi CSS** | [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate) | `1.0.7` | Plugin Tailwind untuk transisi dan efek visual enter/exit |
| **Post-Processor CSS**| [PostCSS](https://postcss.org/) / [Autoprefixer](https://github.com/postcss/autoprefixer) | `8.5.9` / `10.4.21` | Kompilasi CSS modern dan penambahan vendor prefix otomatis |
| **Utilitas Kelas** | [clsx](https://github.com/lukeed/clsx) / [tailwind-merge](https://github.com/dcastil/tailwind-merge) | `2.1.1` / `3.3.0` | Penggabungan kelas Tailwind dinamis bebas konflik via helper `cn()` |
| **Desain Varian** | [class-variance-authority](https://cva.style/docs) | `0.7.1` | Manajemen varian komponen terstruktur (*component variants*) |
| **Ikonografi** | [Lucide React](https://lucide.dev/) | `1.8.0` | Koleksi ikon SVG modern, konsisten, dan berbobot ringan |
| **Visualisasi Data** | [Recharts](https://recharts.org/) | `2.15.4` | Grafik responsif berbasis SVG (Donut Chart & Horizontal Bar Chart) |
| **Dialog & Feedback** | [SweetAlert2](https://sweetalert2.github.io/) | `11.26.24` | Modal dialog, notifikasi toast, dan konfirmasi interaktif |
| **Animasi Komponen** | [Framer Motion](https://www.framer.com/motion/) | `12.38.0` | Pustaka animasi deklaratif untuk transisi halaman dan modal |
| **Ekspor Spreadsheet**| [xlsx (SheetJS)](https://sheetjs.com/) | `0.18.5` | Ekspor rekapitulasi data laporan penugasan ke format Excel `.xlsx` |
| **Ekspor Dokumen PDF**| [jsPDF](https://github.com/parallax/jsPDF) / [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | `4.2.1` / `5.0.7` | Pembuatan berkas PDF ringkasan eksekutif untuk laporan pimpinan |
| **Engine AI (NLP)** | [Google Gemini Flash](https://ai.google.dev/) | `gemini-2.5-flash` | Penyempurnaan bahasa catatan kegiatan menjadi gaya kedinasan formal |
| **Backend Serverless**| [Google Apps Script](https://developers.google.com/apps-script) | V8 Runtime | Eksekusi logika cloud, manipulasi spreadsheet, dan integrasi Google Drive |
| **Basis Data Utama** | [Google Spreadsheet](https://www.google.com/sheets/about/) | Cloud Engine | Penyimpanan data master (`DATA_PEGAWAI`) & transaksi (`REKAP_LAPORAN`) |
| **Penyimpanan Berkas**| [Google Drive](https://www.google.com/drive/) | DriveApp API | Penyimpanan arsip foto dokumentasi kegiatan dan materi paparan dinas |
| **Unit Testing** | [Vitest](https://vitest.dev/) | `4.1.11` | Framework pengujian cepat berbasis ESM untuk pengujian fungsi dan actions |
| **Linter & Format** | [ESLint](https://eslint.org/) | `8.57.1` | Pemeriksaan kepatuhan standar kode dan aturan Next.js Core Web Vitals |

---

## 2. Rationale & Keputusan Arsitektur (Architectural Decision Records)

### 2.1 Mengapa Next.js 14 App Router & Server Actions?
* **Alasan Pemilihan**:
  1. *Keamanan Kredensial*: Server Actions (`'use server'`) mengeksekusi logika langsung pada lingkungan server Node.js, memastikan kunci API pihak ketiga (Apps Script URL dan Gemini API Key) tidak pernah bocor ke browser.
  2. *Tanpa Beban State Global*: Pengambilan data dapat dilakukan langsung di Server Component (`page.tsx`), sehingga menghilangkan ketergantungan pada pustaka state management rumit seperti Redux.
  3. *Invalidasi Cache Presisi*: Fungsi bawaan `revalidatePath()` memungkinkan antarmuka secara instan memperbarui data setelah mutasi berhasil tanpa me-reload seluruh halaman browser.

### 2.2 Mengapa Google Apps Script & Google Spreadsheet (Migrasi dari Supabase)?
* **Alasan Pemilihan**:
  1. *Bebas Biaya Operasional Cloud*: Instansi tidak perlu membayar biaya berlangganan server basis data eksternal setiap bulan.
  2. *Kemudahan Akses Administratif*: Pejabat dan staf dinas dapat langsung memeriksa, mengoreksi, atau mencetak data cadangan langsung melalui antarmuka Google Spreadsheet yang telah mereka kuasai.
  3. *Terintegrasi Google Drive Dinas*: Berkas foto dan materi tersimpan otomatis di dalam ruang penyimpanan Google Drive resmi milik instansi, terbebas dari kuota penyimpanan pihak ketiga.

### 2.3 Mengapa Model Google Gemini 2.5 Flash?
* **Alasan Pemilihan**:
  1. *Latensi Rendah*: Waktu inferensi rata-rata di bawah 1 detik, sangat responsif untuk interaksi langsung pada formulir.
  2. *Kualitas Bahasa Indonesia Kedinasan*: Mampu memahami konteks birokrasi pemerintahan Indonesia dan menghasilkan bahasa tata naskah dinas formal yang padat tanpa mengubah substansi asli.
  3. *Efisiensi Biaya*: Model `gemini-2.5-flash` memiliki kuota gratis yang memadai untuk volume pelaporan operasional dinas.

### 2.4 Mengapa Kompresi Gambar Klien (HTML5 Canvas) Sebelum Base64?
* **Alasan Pemilihan**:
  * Kamera smartphone modern menghasilkan foto berukuran 5MB hingga 15MB per lembar. Mengirim file sebesar ini ke Google Apps Script akan memicu timeout eksekusi (batas 30 detik pada Web App) dan melampaui batas transmisi jaringan.
  * Dengan me-resize sisi terpanjang ke 1200px dan kualitas JPEG 70% di sisi browser, ukuran file terpangkas drastis menjadi hanya **200KB - 400KB** (reduksi >90%) tanpa menurunkan keterbacaan dokumen.

---

## 3. Matriks Variabel Lingkungan (Environment Variables)

Seluruh konfigurasi didefinisikan pada file `.env` di lingkungan server lokal atau server produksi:

```bash
# ============================================================
# KONFIGURASI BACKEND GOOGLE APPS SCRIPT
# ============================================================
APPSCRIPT_URL=https://script.google.com/macros/s/AKfycbx.../exec

# ============================================================
# KONFIGURASI GOOGLE GEMINI AI
# ============================================================
GEMINI_API_KEY=AIzaSy...

# ============================================================
# PIN KEAMANAN PORTAL PIMPINAN (6 DIGIT NUMERIK)
# ============================================================
PIN_KEPALA_DINAS=123456
PIN_SEKRETARIS=234567
PIN_KASUBAG_PERKEU=345678
PIN_KASUBAG_AKO=456789
PIN_KABID_PPTK=567890
PIN_KABID_HI=678901
```

### Rincian Parameter Lingkungan:
| Nama Variabel | Wajib | Cakupan | Keterangan |
| :--- | :---: | :--- | :--- |
| `APPSCRIPT_URL` | **Ya** | Server Only | URL endpoint Web App Google Apps Script hasil *deployment* `code.gs`. |
| `GEMINI_API_KEY` | **Ya** | Server Only | Kunci API Google AI Studio untuk modul penyempurnaan catatan kegiatan. |
| `PIN_KEPALA_DINAS` | **Ya** | Server Only | PIN otentikasi login Kepala Dinas (Scope: Seluruh Bidang). |
| `PIN_SEKRETARIS` | **Ya** | Server Only | PIN otentikasi login Sekretaris Dinas (Scope: Seluruh Bidang). |
| `PIN_KASUBAG_PERKEU`| **Ya** | Server Only | PIN otentikasi Kasubag Perencanaan & Keuangan (Scope: Sekretariat). |
| `PIN_KASUBAG_AKO` | **Ya** | Server Only | PIN otentikasi Kasubag Administrasi & Kepegawaian (Scope: Sekretariat). |
| `PIN_KABID_PPTK` | **Ya** | Server Only | PIN otentikasi Kepala Bidang PPTK (Scope: Bidang PPTK). |
| `PIN_KABID_HI` | **Ya** | Server Only | PIN otentikasi Kepala Bidang Hubungan Industrial (Scope: Bidang HI). |

---

## 4. Konfigurasi Sistem Kritis

### 4.1 Batas Ukuran Payload Server Actions (`next.config.js`)
Secara default, Next.js Server Actions membatasi payload request sebesar 1MB. Konfigurasi berikut diterapkan agar pengunggahan file lampiran Base64 berjalan lancar:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
```

### 4.2 Konfigurasi Kompilator TypeScript (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 5. Kebutuhan Perangkat & Lingkungan Sistem (System Requirements)

### 5.1 Lingkungan Pengguna Klien
* **Peramban Desktop**: Google Chrome v100+, Mozilla Firefox v100+, Microsoft Edge v100+, Apple Safari v15+.
* **Peramban Seluler**: Chrome Android v100+, Safari iOS v15+.
* **Koneksi Jaringan**: Minimal koneksi 3G/4G atau WiFi stabil (kecepatan unggah >= 1 Mbps disarankan saat melampirkan foto).

### 5.2 Lingkungan Server Hosting
* **Node.js**: Versi 20.x LTS atau lebih baru.
* **Manajer Paket**: `npm` v10.x atau `pnpm` / `yarn`.
* **Kapasitas Minimal Server**:
  * CPU: 1 Core (vCPU).
  * RAM: Minimal 1 GB (2 GB disarankan untuk build Next.js).
  * Ruang Disk: Minimal 2 GB untuk dependensi dan build cache.
  * Sistem Operasi: Linux Ubuntu 22.04 / 24.04 LTS, Debian 12, atau platform serverless container (Docker / Vercel).
