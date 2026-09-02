# Standar Penulisan Kode (Coding Standard)
# SIMPELGAS — Next.js 14, TypeScript & Tailwind CSS
### Dinas Tenaga Kerja Kota Surakarta

---

Dokumen ini mendefinisikan standar arsitektur, konvensi penulisan kode, manajemen tipe data, dan pola pengembangan perangkat lunak pada proyek **SIMPELGAS**. Standar ini disusun mengacu pada praktik terbaik resmi **Next.js 14 (App Router)**, **TypeScript**, dan **Tailwind CSS** yang divalidasi melalui dokumentasi teknis terkini (Context7).

---

## 1. Arsitektur Proyek & Struktur Folder

Aplikasi menggunakan struktur direktori berbasis `src/` dengan pembagian tanggung jawab yang tegas (*separation of concerns*):

```
SIMPELGAS/
├── .env / .env.example          # Konfigurasi environment (Private server secrets)
├── code.gs                      # Script Google Apps Script Web App (Backend engine)
├── next.config.js               # Konfigurasi Next.js (Body size limit, server actions)
├── package.json                 # Dependensi dan script build/test
├── tailwind.config.ts           # Konfigurasi tema Tailwind CSS & tokens
├── tsconfig.json                # Konfigurasi kompilator TypeScript
├── vitest.config.mjs            # Konfigurasi test runner Vitest
├── docs/                        # Dokumentasi teknis, spesifikasi, dan plan
│   ├── DOKUMEN_REFERENSI_TEKNIS/# Dokumen arsitektur, PRD, coding standard, UI/UX
│   └── superpowers/             # Spesifikasi teknis dan rencana implementasi task
├── tests/                       # Unit test (Vitest)
│   ├── actions.test.ts
│   ├── appscript.test.ts
│   ├── excel-validation.test.ts
│   └── print-utils.test.ts
└── src/
    ├── middleware.ts            # Edge routing protection (Guard rute /pimpinan)
    ├── app/                     # Next.js 14 App Router (Rute & Halaman)
    │   ├── api/                 # Route Handlers (REST endpoints)
    │   │   └── enhance/route.ts # AI Text Refinement proxy (Google Gemini)
    │   ├── cetak/page.tsx       # Halaman cetak lembar kedinasan
    │   ├── dashboard/page.tsx   # Halaman dashboard analitik eksekutif
    │   ├── input/page.tsx       # Halaman formulir pelaporan penugasan
    │   ├── pimpinan/            # Rute portal pimpinan terproteksi
    │   │   ├── page.tsx
    │   │   └── login/page.tsx
    │   ├── globals.css          # Desain token CSS variables & print styles
    │   ├── layout.tsx           # Root Layout (Sidebar + viewport container)
    │   └── page.tsx             # Root redirect (/dashboard)
    ├── components/              # Komponen antarmuka (Client & UI components)
    │   ├── cetak-client.tsx
    │   ├── dashboard-client.tsx
    │   ├── input-form-client.tsx
    │   ├── pimpinan-client.tsx
    │   └── sidebar.tsx
    └── lib/                     # Utilitas, logika bisnis, dan model data
        ├── actions.ts           # Next.js Server Actions ('use server')
        ├── appscript.ts         # Google Apps Script Adapter & HTTP Client
        ├── print-utils.ts       # Utilitas format teks cetak & Google Drive media
        ├── types.ts             # Definisi interface domain TypeScript
        ├── validations.ts       # Skema validasi Zod untuk input form (planned: aktif)
        └── utils.ts             # Helper clsx & tailwind-merge (cn)
```

---

## 2. Prinsip Next.js 14 App Router & Server Actions

### 2.1 Pola Server Component vs. Client Component
1. **Server Components Secara Default**:
   * Seluruh file `page.tsx` dan `layout.tsx` adalah Server Component secara default.
   * Lakukan pengambilan data awal (*initial data fetching*) di level halaman (`page.tsx`) secara paralel menggunakan `Promise.all`:
     ```tsx
     // CONTOH STANDAR: src/app/dashboard/page.tsx
     export const dynamic = 'force-dynamic'

     export default async function DashboardPage() {
       const [laporanData, pegawaiData] = await Promise.all([
         getAllLaporan(),
         getPegawai(),
       ])
       const stats = await getDashboardStats(laporanData)

       return (
         <DashboardClient
           initialLaporan={laporanData}
           initialStats={stats}
           pegawaiList={pegawaiData}
         />
       )
     }
     ```
2. **Client Components Eksplisit (`'use client'`)**:
   * Komponen yang menggunakan interaktivitas browser (`useState`, `useEffect`, event listener `onClick`/`onSubmit`, SweetAlert2, HTML5 Canvas) **wajib** mencantumkan `'use client'` pada baris paling atas.
   * Berikan sufiks `-client.tsx` pada nama file komponen halaman interaktif (contoh: `dashboard-client.tsx`, `input-form-client.tsx`).

### 2.2 Aturan Server Actions (`src/lib/actions.ts`)
1. **Direktif `'use server'`**:
   * Wajib diletakkan pada baris pertama file `src/lib/actions.ts`.
2. **Pencegahan Cache Kadaluarsa (*Stale Cache*)**:
   * Gunakan `unstable_noStore as noStore` dari `next/cache` pada seluruh fungsi pembacaan data spreadsheet untuk memastikan data selalu segar dari Google Sheets:
     ```typescript
     import { unstable_noStore as noStore } from 'next/cache'

     export async function getLaporan(namaPegawai?: string): Promise<Laporan[]> {
       noStore()
       return fetchLaporanFromAppsScript(namaPegawai)
     }
     ```
3. **Invalidasi Cache Setelah Mutasi Data**:
   * Sesuai dokumentasi Next.js, panggil `revalidatePath()` pada rute-rute terkait setelah proses mutasi berhasil agar antarmuka otomatis memuat data terbaru:
     ```typescript
     if (res.status === 'success') {
       revalidatePath('/dashboard')
       revalidatePath('/cetak')
       revalidatePath('/pimpinan')
     }
     ```
4. **Batas Ukuran Payload (*Body Size Limit*)**:
   * Mengingat formulir mengirimkan lampiran foto dan dokumen dalam bentuk Base64, batas payload Server Action dikonfigurasi sebesar `10mb` pada `next.config.js`:
     ```javascript
     // next.config.js
     module.exports = {
       experimental: {
         serverActions: {
           bodySizeLimit: '10mb',
         },
       },
     }
     ```

### 2.3 Route Handlers (`src/app/api/*/route.ts`)
* Gunakan Route Handler untuk integrasi API pihak ketiga yang membutuhkan perlindungan API key, seperti endpoint Google Gemini AI (`/api/enhance`).
* Tangani parsing request secara aman dengan validasi input kosong dan format response `NextResponse.json({ ... }, { status: ... })`.
* Jangan pernah mengekspos API Key server ke browser klien.

---

## 3. Standar Penulisan TypeScript

Proyek menggunakan mode ketat (*strict mode*). Konvensi penulisan:

### 3.1 Deklarasi Tipe & Interface Terpusat
* Seluruh tipe data entitas domain wajib didefinisikan dalam `src/lib/types.ts`.
* Gunakan `interface` untuk struktur objek yang dapat diekstensi, dan `type` untuk union, payload, atau fungsi.
* Penamaan menggunakan format **PascalCase** (contoh: `Pegawai`, `Laporan`, `DashboardStats`, `LaporanFormData`).

```typescript
// src/lib/types.ts
export interface Pegawai {
  id: string
  nama: string
  nip: string | null
  bidang: string
  jabatan: string
  is_active: boolean
  created_at: string
}

export interface Laporan {
  id: string
  pegawai_id: string
  bidang: string
  jabatan: string | null
  jenis_penugasan: string
  tanggal_kegiatan: string // Format ISO YYYY-MM-DD
  nama_kegiatan: string
  tempat_kegiatan: string
  penyelenggara: string
  tamu_undangan: string | null
  catatan_hasil: string | null
  dokumentasi_urls: string[] | null
  materi_urls: string[] | null
  status_tindak_lanjut: string
  catatan_pimpinan: string | null
  created_at: string
  updated_at: string
  pegawai?: Pegawai
}
```

### 3.2 Larangan Penggunaan `any` Sembarangan
* Hindari penggunaan `any` tanpa alasan jelas. Jika data mentah berasal dari Google Apps Script yang strukturnya dinamis, gunakan `Record<string, any>` pada lapisan mapper (`mapPegawaiData`, `mapLaporanData`) dan segera transformasikan ke tipe aman (*strongly-typed*) sebelum diteruskan ke UI.
* Selalu definisikan tipe nilai kembalian (*return type*) pada fungsi publik dan Server Actions (contoh: `Promise<Pegawai[]>`, `Promise<{ status: string; message?: string }>`).

---

## 4. Komunikasi Data & Penanganan Google Apps Script

### 4.1 Resilient Adapter Pattern (`src/lib/appscript.ts`)
Google Apps Script memiliki karakteristik khusus berupa HTTP 302 Redirect saat merespons request. Adapter wajib mengikuti aturan:
1. **Opsi Redirect**: Selalu sertakan `redirect: 'follow'` pada setiap panggilan `fetch()`.
2. **Format Header POST**: Kirim data POST dengan header `'Content-Type': 'text/plain;charset=utf-8'`. Google Apps Script tidak mendukung preflight `OPTIONS` request (CORS) pada Content-Type `application/json`.
3. **Format Tanggal Normalisasi**:
   * Google Apps Script menyimpan tanggal dalam format Indonesia `DD/MM/YYYY`.
   * Frontend dan komponen visualisasi membutuhkan standar ISO `YYYY-MM-DD`.
   * Selalu gunakan fungsi konversi `parseSheetDate()`:
     ```typescript
     export function parseSheetDate(dateStr?: string): string {
       if (!dateStr || typeof dateStr !== 'string') return ''
       const trimmed = dateStr.trim()
       const parts = trimmed.split('/')
       if (parts.length === 3) {
         return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
       }
       return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.substring(0, 10) : trimmed
     }
     ```
4. **Pencocokan Pegawai Berbasis Nama Dinormalisasi**:
   * Gunakan `normalizePersonName()` untuk membandingkan nama pegawai yang memiliki variasi gelar, huruf kapital, atau tanda koma:
     ```typescript
     export function normalizePersonName(name?: string | null): string {
       if (!name || typeof name !== 'string') return ''
       return name.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '').trim()
     }
     ```

---

## 5. Standar Komponen Antarmuka & Styling (Tailwind CSS)

### 5.1 Penggunaan Utilitas Kelas Tailwind
* Gunakan utilitas Tailwind CSS tanpa menuliskan CSS custom inline, kecuali untuk kebutuhan cetak naskah dinas atau scrollbar.
* Manfaatkan fungsi pembantu `cn()` dari `src/lib/utils.ts` saat menggabungkan kelas kondisional:
  ```typescript
  import { cn } from '@/lib/utils'

  <div className={cn(
    "px-4 py-3 rounded-xl border transition",
    isActive ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white"
  )} />
  ```

### 5.2 Konsistensi Desain Token (SSoT: `src/lib/design-tokens.ts` & `globals.css`)

Desain system resmi (`UIUX_DESIGN.md`) telah aktif menggunakan palet **Civic Spectrum** (Sky Blue + Pink + Violet + Slate). Seluruh token semantik CSS variables tersedia di `src/app/globals.css` dan konstanta TypeScript di `src/lib/design-tokens.ts`.

* **Brand Primary (Sky Blue)**: `bg-primary`, `text-primary-foreground`, `hover:bg-primary-hover` (atau `bg-sky-400`, `text-sky-700`).
* **Brand Secondary (Pink)**: `bg-secondary`, `text-secondary-foreground`, `hover:bg-secondary-hover` (atau `bg-pink-400`, `text-pink-700`).
* **Brand Accent / AI (Violet)**: `bg-accent`, `text-accent-foreground`, `hover:bg-accent-hover` (atau `bg-violet-400`, `bg-violet-50`).
* **Dark Anchor (Sidebar/Portal)**: `bg-slate-900` (`#0F172A`), `text-white`.
* **Status Positif**: `text-emerald-700 bg-emerald-50 border-emerald-200` — digunakan untuk status "Untuk Diketahui".
* **Status Peringatan**: `text-amber-700 bg-amber-50 border-amber-200` — digunakan untuk status "Perlu Tindak Lanjut".
* **Status Destructive / Wajib**: `text-destructive` (`#DC2626`), `bg-destructive/soft`.
* **Teks Utama**: Gunakan `text-slate-900` untuk heading, `text-slate-700` untuk body, `text-slate-500` untuk caption.
* Radius sudut standar: Gunakan `rounded-xl` atau `rounded-2xl` untuk kartu, input, dan tombol.

### 5.3 5 Aturan Wajib Desain Token & UI (Diverifikasi Mesin via `tests/design-tokens.test.ts`)

Seluruh kode UI di `src/components/` dan `src/app/` **WAJIB** memenuhi 5 aturan berikut tanpa kompromi:

1. 🚫 **Dilarang Menggunakan Emoji/Emoticon Unicode di UI**: Seluruh simbol grafis/indikator visual wajib 100% menggunakan komponen dari pustaka `lucide-react`. Dilarang menaruh emoji (seperti `✨`, `🔥`, `👍`, dsb.) pada tombol, toast, modal, maupun label antarmuka.
2. 🚫 **Dilarang Warna Hardcoded Hex di JSX/Tailwind**: Dilarang menggunakan arbitrary hex values (`#[0-9a-fA-F]`, `bg-[#1B3C73]`, `text-[#082F49]`). Wajib menggunakan token semantik CSS variables (`bg-primary`, `text-slate-900`) atau mengimpor `DESIGN_TOKENS` dari `@/lib/design-tokens`.
3. 🚫 **Dilarang Token Lama (Deprecated)**: Dilarang menggunakan kelas token lama (`navy-main`, `navy-dark`, `navy-light`, `amber-main`, `amber-hover`).
4. 🚫 **Wajib Menggunakan Ikon `lucide-react`**: Seluruh ikon antarmuka wajib bersumber dari `lucide-react`. Dilarang mengimpor ikon dari library pihak ketiga lain (`@heroicons`, `react-icons`, dll.) atau inline raw SVG.
5. 🚫 **Dilarang Dialog Popup Bawaan Browser**: Dilarang menggunakan `alert()`, `confirm()`, atau `prompt()` bawaan peramban. Setiap feedback transaksi sukses/gagal wajib menggunakan notifikasi interaktif modern via **SweetAlert2** (`Swal.fire`) atau Toast/Modal komponen.

### 5.4 Optimalisasi Gambar di Sisi Klien
Sebelum berkas diunggah, klien wajib mengompres gambar menggunakan fungsi Canvas 2D untuk meminimalkan beban memori:
```typescript
// Kompres gambar ke JPEG 70% dengan dimensi maksimal 1200px
const compressImage = (file: File, maxSizeMB = 1): Promise<File> => {
  // Hanya proses jika bertipe gambar dan melebihi batas ukuran
  // Buat HTML Image, gambar ke Canvas, dan export via canvas.toBlob()
}
```

---

## 6. Penanganan State, Error & Feedback Pengguna

### 6.1 State Management
* Gunakan state lokal React (`useState`, `useMemo`, `useCallback`) untuk state yang terbatas pada satu halaman.
* Hindari library state global berat (seperti Redux) karena alur data aplikasi telah ditopang langsung oleh React Server Components dan Server Actions.
* Gunakan `useMemo` untuk operasi komputasi filter dan pengurutan data tabel/grafik agar tidak terjadi *re-rendering* berlebih.

### 6.2 SweetAlert2 Standardized Alerts
Gunakan modal SweetAlert2 dengan palet warna resmi SIMPELGAS:
* **Konfirmasi Aksi**:
  ```typescript
  const { isConfirmed } = await Swal.fire({
    title: 'Konfirmasi Aksi',
    text: 'Apakah Anda yakin ingin menyimpan perubahan ini?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1B3C73',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Ya, Lanjutkan',
    cancelButtonText: 'Batal',
  })
  ```
* **Toast Sukses Cepat**:
  ```typescript
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: 'Berhasil diperbarui',
    showConfirmButton: false,
    timer: 2500,
  })
  ```

---

## 7. Keamanan & Proteksi Sesi

1. **Aturan Environment Variables**:
   * Variabel rahasia seperti `APPSCRIPT_URL`, `GEMINI_API_KEY`, dan `PIN_*` **dilarang** menggunakan prefiks `NEXT_PUBLIC_`.
   * Simpan template variabel pada `.env.example` tanpa menyertakan nilai rahasia produksi.
2. **Proteksi Rute Pimpinan**:
   * Rute `/pimpinan/*` diproteksi pada tingkat `middleware.ts` dengan memeriksa keberadaan cookie `pimpinan_session`.
   * Cookie disetel dengan atribut `httpOnly: true`, `sameSite: 'lax'`, dan masa berlaku 8 jam.
3. **Pembersihan Modul Tak Terpakai**:
   * Modul atau library legacy (seperti Supabase yang telah dimigrasikan ke Apps Script) tidak boleh diimpor kembali ke dalam kode aktif untuk menghindari kesalahan runtime.

---

## 8. Standar Pengujian Perangkat Lunak (Unit Testing)

1. **Framework Pengujian**: Menggunakan **Vitest** (`npm run test`).
2. **Lokasi File Tes**: Seluruh tes diletakkan di direktori `tests/` dengan penamaan `*.test.ts`.
3. **Cakupan Pengujian Wajib**:
   * Utilitas logika murni (`parseSheetDate`, `normalizePersonName`, `formatRichTextForPrint`).
   * Mapper data spreadsheet (`mapPegawaiData`, `mapLaporanData`).
   * Server actions dan integrasi Google Apps Script (menggunakan mock fetch).
   * Validasi struktur ekspor spreadsheet Excel.
4. **Contoh Mocking Fetch**:
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'vitest'

   beforeEach(() => {
     vi.restoreAllMocks()
   })

   it('handles network error gracefully', async () => {
     vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection timeout')))
     const result = await fetchPegawaiFromAppsScript()
     expect(result).toEqual([])
   })
   ```

---

## 9. Aturan Git & Alur Kerja Kolaborasi

* **Format Pesan Commit**: Menggunakan standar *Conventional Commits*:
  * `feat:` Penambahan fitur baru (contoh: `feat(cetak): tambahkan bypass cors google drive`).
  * `fix:` Perbaikan bug (contoh: `fix(appscript): perbaiki format parsing tanggal DD/MM/YYYY`).
  * `refactor:` Restrukturisasi kode tanpa mengubah fungsionalitas.
  * `docs:` Penambahan atau pembaruan dokumentasi (contoh: `docs: buat PRD dan coding standard`).
  * `test:` Penambahan atau perbaikan unit test.
* **Verifikasi Sebelum Push**:
  * Jalankan `npm run lint` untuk memastikan tidak ada kesalahan aturan ESLint.
  * Jalankan `npm run typecheck` untuk memastikan tidak ada kesalahan kompilasi TypeScript.
  * Jalankan `npm run test` untuk memastikan seluruh rangkaian unit test lulus (100% pass).
  * Atau jalankan `npm run ci:local` untuk memverifikasi seluruh gerbang sekaligus.

---

## 10. Kepatuhan Definition of Done (DoD) Berbasis Evidence

Setiap perubahan kode wajib mematuhi panduan [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md). Seluruh 5 Gerbang Bukti (*Evidence Gates*):
1. **Gate 1**: Static Quality & Type Safety (ESLint 0 errors/warnings & `tsc --noEmit`).
2. **Gate 2**: Automated Testing & Coverage (Vitest 100% lulus, termasuk skema validasi Zod).
3. **Gate 3**: Local CI Pipeline Integrity (`npm run ci:local` exit code 0).
4. **Gate 4**: Production Build Optimization (`npm run build` sukses).
5. **Gate 5**: Functional Domain & Official Standards (Integritas Apps Script & format cetak dinas).
wajib terpenuhi dan dilampirkan sebelum branch digabungkan ke `main`.

---

## 11. Konvensi Perceived Performance & Code Splitting (Zero-Lag UI)

1. **Aturan `next/dynamic` untuk Pustaka Berat**:
   * Komponen grafik Recharts, parser berkas Excel (`xlsx`), dan pembuat PDF (`jspdf`) wajib diisolasi dan diimpor menggunakan `dynamic(() => import(...), { ssr: false, loading: () => <Skeleton /> })`.
   * Dilarang mengimpor modul visual analitik langsung di level Server Component atau eager Client Component root.
2. **Standar Token Interaksi Mikro**:
   * Semua tombol dan tautan yang dapat diklik wajib memiliki token: `cursor-pointer transition-all duration-150 active:scale-[0.98]`.
   * Tombol dalam proses asinkron wajib menonaktifkan diri (`disabled`) dan menampilkan ikon spinner (`Loader2`).
3. **Optimistic UI Pattern**:
   * Setiap mutasi yang memerlukan feedback pengguna instan (seperti penghapusan baris evaluasi pimpinan) wajib menggunakan pendekatan *Optimistic UI*: ubah state lokal terlebih dahulu $\rightarrow$ kirim mutasi di latar belakang $\rightarrow$ lakukan *rollback* jika mutasi gagal.

