# Panduan Desain Antarmuka & Pengalaman Pengguna (UI/UX Design System)
# SIMPELGAS — Modern Civic Workbench
### Dinas Tenaga Kerja Kota Surakarta

---

Dokumen ini adalah pedoman komprehensif sistem desain (*Design System*), tata letak antarmuka (*Interface Layout*), palet warna, tipografi, dan pengalaman pengguna (*User Experience*) aplikasi **SIMPELGAS**.

---

## 1. Filosofi & Visi Desain Antarmuka

Antarmuka SIMPELGAS dirancang dengan pendekatan **Modern Civic Workbench**: memadukan kewibawaan tata kelola birokrasi Pemerintah Kota Surakarta dengan kemudahan dan kenyamanan aplikasi web modern (bebas dari kesan kaku sistem lama pemerintah dan menghindari *AI-slop visual*).

### Pilar Desain Utama
1. **Kejelasan Informasi (Clarity First)**: Data penugasan, status tindak lanjut, dan nama pegawai disajikan dengan hirarki tipografi yang tegas agar pimpinan dan staf dapat membaca intisari kegiatan dalam hitungan detik.
2. **Efisiensi Alur Kerja (High Ergonomics)**: Input form dilengkapi dengan filter cerdas dinamis (dropdown pegawai tergantung bidang), kompresi foto otomatis di klien, dan penyempurnaan teks instan berbantuan AI.
3. **Kepatuhan Naskah Dinas Resmi (Official Standards)**: Tampilan cetak lembar laporan mematuhi format baku tata naskah dinas Pemerintah Kota Surakarta (Kop Surat resmi, ukuran A4, font Times New Roman, batas margin arsip, dan blok tanda tangan sah).
4. **Inklusivitas & Aksesibilitas (WCAG AA Compliant)**: Kontras warna terukur tinggi, target sentuh (*touch target*) yang ramah perangkat seluler (>= 44px), serta cincin fokus (*focus ring*) yang jelas untuk navigasi keyboard.

---

## 2. Palet Warna & Token Desain

Palet warna SIMPELGAS menggunakan sistem **Civic Spectrum**: memadukan **Sky Blue** sebagai warna primer, **Pink** sebagai warna sekunder, **Violet** sebagai aksen, dan **Deep Navy** sebagai jangkar visual untuk teks serta permukaan gelap. Kombinasi ini mempertahankan kesan modern dan ramah tanpa kehilangan ketegasan antarmuka layanan publik. Warna status semantik tetap dipisahkan dari warna brand agar makna sukses, peringatan, informasi, dan kesalahan konsisten di seluruh aplikasi:

```
+-----------------------------------------------------------------------------------+
| BRAND PRIMARY: SKY BLUE                                                           |
| [#38BDF8] Sky 400     | CTA utama, indikator aktif, chart utama, highlight         |
| [#0EA5E9] Sky 500     | Hover/pressed ringan, link utama, focus emphasis           |
| [#0369A1] Sky 700     | Teks/link biru pada permukaan terang                      |
| [#F0F9FF] Sky 50      | Surface biru lembut, info card, selected background        |
+-----------------------------------------------------------------------------------+
| BRAND SECONDARY: PINK                                                             |
| [#EC69B5] Pink 400    | CTA sekunder, badge promosi, highlight pendamping          |
| [#DB4FA3] Pink 500    | Hover/pressed sekunder                                     |
| [#BE185D] Pink 700    | Teks aksen pink pada permukaan terang                     |
| [#FDF2F8] Pink 50     | Surface pink lembut, secondary info card                   |
+-----------------------------------------------------------------------------------+
| BRAND ACCENT: VIOLET                                                              |
| [#9B7FEA] Violet 400  | Aksen tersier, ikon, chart pembanding, fitur AI             |
| [#7C3AED] Violet 600  | Hover/active accent, fokus fitur khusus                     |
| [#F5F3FF] Violet 50   | Surface violet lembut                                      |
+-----------------------------------------------------------------------------------+
| DARK ANCHOR & TEXT                                                                |
| [#0F172A] Navy 900    | Teks utama, heading, angka KPI, sidebar/portal gelap        |
| [#334155] Slate 700   | Body text utama                                            |
| [#475569] Slate 600   | Teks sekunder, deskripsi                                   |
| [#64748B] Slate 500   | Caption, metadata, helper                                  |
| [#94A3B8] Slate 400   | Placeholder dan disabled text                              |
+-----------------------------------------------------------------------------------+
| LATAR & PERMUKAAN NETRAL                                                          |
| [#F8FAFC] Slate 50    | Latar belakang aplikasi utama                              |
| [#FFFFFF] White       | Card, modal, input, table surface                          |
| [#F1F5F9] Slate 100   | Hover netral, grouped surface                              |
| [#E2E8F0] Slate 200   | Border dan divider                                         |
+-----------------------------------------------------------------------------------+
| INDIKATOR STATUS SEMANTIK                                                         |
| [#059669] Emerald 600 | Success / "Untuk Diketahui" / tervalidasi                  |
| [#D97706] Amber 600   | Warning / perlu tindak lanjut                              |
| [#0284C7] Sky 600     | Informasi / filter aktif / kategori                        |
| [#DC2626] Red 600     | Error / destructive / tanda wajib                         |
+-----------------------------------------------------------------------------------+
```

### Definisi CSS Variables (`src/app/globals.css`)
```css
:root {
  /* Base */
  --background: 210 40% 98%;          /* #F8FAFC */
  --foreground: 222 47% 11%;          /* #0F172A */
  --card: 0 0% 100%;                  /* #FFFFFF */
  --card-foreground: 222 47% 11%;

  /* Brand */
  --primary: 199 89% 60%;             /* #38BDF8 Sky 400 */
  --primary-hover: 199 89% 48%;       /* #0EA5E9 Sky 500 */
  --primary-foreground: 201 96% 20%;  /* #082F49 deep blue text */

  --secondary: 328 76% 67%;           /* #EC69B5 Pink */
  --secondary-hover: 326 66% 58%;     /* #DB4FA3 */
  --secondary-foreground: 333 71% 21%;/* #500724 deep pink text */

  --accent: 255 72% 71%;              /* #9B7FEA Violet */
  --accent-hover: 262 83% 58%;        /* #7C3AED */
  --accent-foreground: 244 47% 20%;   /* #1E1B4B deep violet text */

  /* Text */
  --text-primary: 222 47% 11%;        /* #0F172A */
  --text-secondary: 215 25% 27%;      /* #334155 */
  --text-tertiary: 215 16% 47%;       /* #64748B */
  --text-disabled: 215 20% 65%;       /* #94A3B8 */
  --text-inverse: 0 0% 100%;          /* #FFFFFF */
  --text-link: 199 94% 35%;           /* #0369A1 */
  --text-accent-pink: 333 74% 42%;    /* #BE185D */

  /* Neutral surfaces */
  --muted: 210 40% 96%;               /* #F1F5F9 */
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;              /* #E2E8F0 */
  --input: 214 32% 91%;
  --ring: 199 89% 60%;                /* primary focus ring */

  /* Semantic */
  --success: 160 84% 39%;             /* #059669 */
  --warning: 32 95% 44%;              /* #D97706 */
  --info: 199 89% 48%;                /* #0284C7-ish family */
  --destructive: 0 72% 51%;           /* #DC2626 */

  --radius: 0.75rem;                  /* 12px border radius */
}
```

### Token Warna Semantik & Kontekstual

Gunakan token berdasarkan **peran**, bukan berdasarkan nama warna mentah, agar komponen dapat berubah tema tanpa mengubah makna:

| Token | Nilai Rekomendasi | Penggunaan |
| :--- | :--- | :--- |
| `text.primary` | `#0F172A` | Heading, judul halaman, angka KPI |
| `text.body` | `#334155` | Body copy, isi tabel, form value |
| `text.secondary` | `#475569` | Supporting copy, label sekunder |
| `text.muted` | `#64748B` | Caption, metadata, timestamp |
| `text.disabled` | `#94A3B8` | Placeholder dan disabled state |
| `text.inverse` | `#FFFFFF` | Teks di permukaan Navy 900 |
| `text.on-primary` | `#082F49` | Teks di Sky Blue terang |
| `text.on-secondary` | `#500724` | Teks di Pink terang |
| `text.on-accent` | `#1E1B4B` | Teks di Violet terang |
| `text.link` | `#0369A1` | Link pada background terang |
| `surface.primary-soft` | `#F0F9FF` | Info card / selected item biru |
| `surface.secondary-soft` | `#FDF2F8` | Secondary/promotional card |
| `surface.accent-soft` | `#F5F3FF` | AI/experimental feature card |
| `surface.dark` | `#0F172A` | Sidebar, login portal, dark card |

**Aturan utama:** jangan gunakan Sky 400 (`#38BDF8`), Pink 400 (`#EC69B5`), atau Violet 400 (`#9B7FEA`) sebagai body text di atas putih. Untuk teks berwarna, gunakan shade lebih gelap (`Sky 700`, `Pink 700`, atau `Violet 600+`) agar keterbacaan tetap tinggi.

### Matriks Penggunaan Brand Color

| Konteks | Warna Utama | Warna Teks | Catatan |
| :--- | :--- | :--- | :--- |
| Primary CTA | `#38BDF8` | `#082F49` | Default action utama |
| Secondary CTA | `#EC69B5` | `#500724` | Aksi alternatif/pendamping |
| Accent / AI | `#9B7FEA` | `#1E1B4B` | Fitur khusus, AI, insight |
| Dark CTA / Sidebar | `#0F172A` | `#FFFFFF` | Navigasi dan konteks kontras tinggi |
| Selected item | `#F0F9FF` | `#0369A1` | Gunakan border `#38BDF8` bila perlu |
| Secondary highlight | `#FDF2F8` | `#BE185D` | Badge/section sekunder |
| Accent highlight | `#F5F3FF` | `#7C3AED` | Insight/AI support |

---

## 3. Tipografi & Skala Hirarki

Aplikasi menerapkan sistem tipografi ganda yang disesuaikan dengan media keluaran:
1. **Layar Digital (Web & Mobile)**: Menggunakan font sans-serif **Plus Jakarta Sans** (via `next/font/google`) sebagai font utama antarmuka. Karakternya modern, geometris, dan tetap memiliki keterbacaan yang baik untuk dashboard, formulir, tabel data, serta antarmuka administratif yang padat informasi.
2. **Media Cetak Fisik (Lembar Laporan)**: Menggunakan font serif standar naskah dinas **Times New Roman** untuk menjaga keaslian format surat resmi pemerintah.

### Implementasi Font Digital (`src/app/layout.tsx`)
```tsx
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

// Terapkan pada elemen <body>:
// className={`${plusJakartaSans.variable} font-sans`}
```

### Token Tipografi
```css
:root {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Jika menggunakan Tailwind CSS, `font-sans` harus memetakan ke **Plus Jakarta Sans** sebagai keluarga font utama. Gunakan bobot `400`, `500`, `600`, `700`, dan `800`; bobot `800` diprioritaskan untuk judul utama dan KPI, sedangkan `400–500` digunakan untuk body text agar kepadatan visual tetap nyaman.

### Skala Tipografi Antarmuka Digital
| Tingkat Hirarki | Ukuran / Bobot | Kelas Tailwind | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Page Title** | 24px - 30px / Black (900) | `text-2xl sm:text-3xl font-black text-slate-900 tracking-tight` | Judul halaman Dashboard, Cetak, Input |
| **Section Title** | 18px - 20px / Bold (700) | `text-lg sm:text-xl font-bold text-slate-900` | Header formulir, judul kartu analitik |
| **KPI Metric Value** | 30px - 36px / Black (900) | `text-3xl sm:text-4xl font-black text-slate-900 tabular-nums` | Nilai angka besar pada KPI Cards |
| **Card / Label Header**| 11px - 12px / Bold (700) | `text-[11px] font-bold text-slate-500 uppercase tracking-wider` | Label input, kategori metrik, header tabel |
| **Body Standard** | 14px / Regular-Medium (400-500) | `text-sm text-slate-700 leading-normal` | Teks paragraf, opsi dropdown, isi tabel |
| **Microcopy / Helper** | 11px - 12px / Medium (500) | `text-xs text-slate-400 italic` | Keterangan ukuran berkas, catatan hak cipta |

---

## 4. Struktur Tata Letak (Macrostructure)

Aplikasi dibangun di atas makrostruktur **Responsive Workbench Layout** dengan dua komponen utama:

```
+------------------------------------------------------------------------------------+
| [Mobile Topbar] lg:hidden - H: 64px, Logo, Title, Hamburger Toggle                |
+-------------------+----------------------------------------------------------------+
|                   |                                                                |
|   SIDEBAR         |                      MAIN CONTENT VIEWPORT                     |
|   NAVIGATION      |                 (max-w-7xl mx-auto, p-4 to p-8)                |
|                   |                                                                |
|  - Brand Header   |  1. Page Header & Action Controls (Refresh, Reset)             |
|  - Nav Links:     |  2. Executive Filter Bar (Bidang, Status, Periode, Tanggal)    |
|    * Dashboard    |  3. Metric Summary Cards (3 Elevated Metric Containers)        |
|    * Input Form   |  4. Analytics Grid (Donut Chart Bidang & Bar Chart Jenis)      |
|    * Cetak        |  5. Data Records Table (Paginated, Detailed Rows, Actions)     |
|  - Divider        |                                                                |
|  - Portal Pimpinan|                                                                |
|    (Pink Button) |                                                                |
|                   |                                                                |
|   [Collapsible]   |                                                                |
|   256px / 80px    |                                                                |
+-------------------+----------------------------------------------------------------+
```

### 4.1 Navigasi Sidebar Desktop (`src/components/sidebar.tsx`)
* **State Normal**: Lebar `w-64` (256px), menampilkan ikon bersanding dengan label teks.
* **State Kompak**: Tombol burger di bagian atas dapat melipat sidebar menjadi `w-20` (80px), hanya menampilkan ikon untuk memaksimalkan ruang kerja tabel.
* **Indikator Rute Aktif**: Menggunakan background semi-transparan `bg-white/20 text-white font-bold shadow-sm` dengan aksen warna ikon `text-sky-400` atau `text-pink-400` sesuai konteks.
* **Sorotan Portal Pimpinan**: Ditempatkan di bagian bawah navigasi dengan pemisah garis lembut, berlatar Pink `bg-pink-400 text-slate-900 font-bold shadow-md` untuk penegasan hak akses khusus.

### 4.2 Navigasi Seluler (Mobile Drawer)
* Header bar tetap (*fixed topbar*) setinggi 64px berwarna `bg-slate-900` dengan tombol menu hamburger.
* Menekan tombol memunculkan laci navigasi dari sisi kiri (*slide-over drawer*) dengan efek transisi mulus dan lapisan latar hitam transparan (*backdrop overlay* 50%) yang menutup laci saat disentuh.

---

## 5. Spesifikasi Komponen & Panduan UX Rinci

### 5.1 Kartu Ringkasan Eksekutif (KPI Cards)
* **Desain Anti-AI-Slop**: Kartu didesain bersih dan elegan tanpa garis samping berwarna norak (*no garish side-stripes*).
* **Struktur Kartu**:
  * Baris atas: Label kategori berhuruf kapital rapat (`tracking-wider`) dipadukan dengan wadah ikon membulat `rounded-xl` berlatar transparan lembut.
  * Baris tengah: Angka metrik berukuran jumbo dengan atribut angka sejajar `tabular-nums` agar tidak bergeser saat nilai berubah.
  * Baris bawah: Pemisah garis tipis `border-t border-slate-100` berisi metrik turunan (misal: rasio rata-rata penugasan atau progress bar persentase evaluasi pimpinan).

### 5.2 Filter Bar Parameter Terpadu
* Ditempatkan di atas tabel analitik dalam satu kontainer putih terpadu berbingkai `border-slate-200/90`.
* Mengorganisir 5 kontrol dalam grid responsif:
  1. Dropdown Bidang
  2. Dropdown Status Tindak Lanjut
  3. Dropdown Bulan Berjalan
  4. Input Tanggal Mulai
  5. Input Tanggal Selesai
* Dilengkapi tombol **"Reset Filter"** yang muncul secara otomatis hanya ketika ada filter aktif yang sedang digunakan, mengembalikan status ke kondisi default dengan satu sentuhan.

### 5.3 Formulir Pelaporan Cerdas (`/input`)
* **Pengelompokan Logis (Form Chunking)**:
  * Blok 1: Identitas Pegawai (Unit Kerja -> Nama Pegawai).
  * Blok 2: Pelaksanaan Tugas (Jenis Penugasan & Tanggal Kegiatan).
  * Blok 3: Rincian Kegiatan (Nama Kegiatan, Tempat, Penyelenggara, Tamu).
  * Blok 4: Substansi & Notulensi (Catatan Hasil Kegiatan didukung asisten AI).
  * Blok 5: Lampiran Berkas (Wadah bertitik putus-putus untuk Foto & Materi).
* **Integrasi Asisten AI (Gemini 2.5 Flash)**:
  * Tombol diletakkan di atas kolom catatan: `Perbaiki Teks dengan AI ✨`.
  * Memiliki efek visual gradasi Violet (`from-violet-400 to-violet-600`) yang membedakannya dari aksi form konvensional.
  * Menampilkan spinner `Loader2` saat proses inferensi berjalan, dan memberikan notifikasi Toast SweetAlert2 begitu teks selesai disempurnakan.
* **Perlindungan Proses Unggah (Submission Shield)**:
  * Ketika tombol "Kirim Laporan Penugasan" ditekan, formulir otomatis mengalami blur (`blur-sm pointer-events-none`).
  * Modal overlay muncul di tengah layar mengunci form dengan pesan *"Memproses: Mohon tunggu, sedang mengirim laporan..."*, mencegah pengguna keluar atau mengirim ulang secara tidak sengaja.

### 5.4 Tabel Rekapitulasi Data & Modal Detail
* **Tabel Interaktif**:
  * Header tabel berlatar abu-abu netral cerah dengan tipografi kapital `text-slate-500 text-xs font-bold`.
  * Baris data memiliki transisi hover lembut `hover:bg-slate-50/80`.
  * Badge status berbentuk pil (*pill-shaped badge*) dengan dot indikator bulat:
    * Hijau untuk `Untuk Diketahui`.
    * Oranye/Kuning untuk `Perlu Tindak Lanjut Bidang Teknis`.
* **Modal Detail Laporan**:
  * Membuka ringkasan menyeluruh saat tombol "Lihat Detail" diklik.
  * Menampilkan galeri foto dengan thumbnail yang dapat diklik untuk membuka berkas resolusi penuh.
  * Menampilkan riwayat catatan pimpinan lengkap dengan nama jabatan evaluator.
  * Menyediakan tombol pintas langsung menuju lembar cetak kedinasan laporan tersebut.

### 5.5 Modul Cetak Lembar Kedinasan (`/cetak`)
* **Desain Kop Surat Pemerintah Kota Surakarta**:
  * Logo resmi Pemkot Surakarta di sisi kiri (lebar 75px, tinggi 75px).
  * Teks instansi simetris tengah:
    * `PEMERINTAH KOTA SURAKARTA` (14pt Bold).
    * `DINAS TENAGA KERJA` (16pt Bold).
    * Alamat kantor, nomor telepon resmi, email, dan kode pos (9pt Regular).
  * Garis dobel pemisah kop surat (garis tebal 2px di atas garis tipis 1px).
* **Tata Letak Isi Laporan**:
  * Format naskah dinas resmi menggunakan tabel 2 kolom tanpa garis luar vertikal (*clean government layout*).
  * Poin catatan hasil kegiatan otomatis dirapikan menjadi urutan angka (*numbered list*) dengan spasi baris kompak `line-height: 1.35`.
  * Galeri dokumentasi foto disusun dalam grid 2 kolom dengan aturan CSS cetak `@media print { .anti-potong { page-break-inside: avoid; } }` agar gambar tidak terbelah di antara pergantian halaman A4.
  * Blok tanda tangan kedinasan pejabat pelaksana tugas dan kolom persetujuan pimpinan di bagian kanan bawah.

### 5.6 Portal Pimpinan (`/pimpinan`)
* **Layar Masuk (Login Guard)**:
  * Menggunakan latar belakang gelap `bg-slate-900` terpusat.
  * Kartu login modern dengan ikon gembok berlingkar violet `bg-violet-400`.
  * Input PIN numerik dengan jarak antar huruf lebar (*tracking-widest*) dan masking titik hitam untuk privasi maksimal.
* **Tampilan Evaluasi Kartu**:
  * Hanya menampilkan laporan yang berada di bawah lingkup kewenangan jabatan aktif dan belum pernah dievaluasi.
  * Dilengkapi pemilihan status cepat dan kolom input arahan tertulis.
  * Menyediakan tombol aksi ekspor cepat ke berkas spreadsheet Excel dan PDF dokumen resmi.

---

## 6. Pola Interaksi & Pesan Umpan Balik (Feedback States)

| Situasi Interaksi | Komponen UX | Desain & Pesan |
| :--- | :--- | :--- |
| **Simpan Laporan Berhasil** | SweetAlert2 Modal Sukses | Ikon centang hijau, judul *"Berhasil!"*, teks *"Laporan tersimpan."*, tombol Sky Blue `#38BDF8` dengan teks `#082F49`. Form direset otomatis. |
| **Gagal Menyimpan / Jaringan Terputus** | SweetAlert2 Modal Error | Ikon tanda silang merah, pesan edukatif: *"Pastikan koneksi internet stabil atau kurangi ukuran file lampiran."* |
| **AI Berhasil Memperbaiki Teks** | SweetAlert2 Toast Kanan Atas | Durasi 3 detik, ikon sparkles, teks: *"Teks disempurnakan dengan AI ✨"*. |
| **Konfirmasi Evaluasi Pimpinan** | SweetAlert2 Dialog Konfirmasi | Ikon tanda tanya violet, tombol konfirmasi Pink `#EC69B5` dengan teks `#500724`: *"Ya, Simpan!"* untuk mencegah ketidaksengajaan klik. |
| **Status Belum Ada Laporan** | Empty State Container | Ikon folder kosong/inbox, teks abu-abu lembut *"Belum ada riwayat laporan yang memerlukan evaluasi."* |

---

## 7. Pedoman Aksesibilitas & Responsivitas (A11y & Responsiveness)

1. **Titik Henti Responsif (Breakpoints)**:
   * `sm` (640px): Transisi dari formulir 1 kolom menjadi 2 kolom.
   * `md` (768px): Penataan kartu metrik KPI dari mode tumpuk vertikal menjadi 3 kolom sejajar.
   * `lg` (1024px): Pergantian dari header bar hamburger seluler menjadi navigasi sidebar desktop tetap.
2. **Navigasi Keyboard**:
   * Seluruh tombol, link navigasi, dan elemen form memiliki penanda visual fokus: `outline-none focus-visible:ring-2 focus-visible:ring-sky-400`.
3. **Keterbacaan Kontras**:
   * Teks label gelap `text-slate-900` atau `text-slate-700` pada latar belakang kartu putih memiliki rasio kontras > 7:1 (melebihi standar WCAG AAA).
   * Untuk tombol Sky Blue (`#38BDF8`) gunakan teks gelap `#082F49`; untuk Pink (`#EC69B5`) gunakan `#500724`; untuk Violet (`#9B7FEA`) gunakan `#1E1B4B`. Teks putih diprioritaskan hanya pada permukaan gelap seperti `#0F172A`.
4. **Semantik HTML5**:
   * Menggunakan tag semantik `<main>`, `<nav>`, `<aside>`, `<header>`, dan form control dengan `<label htmlFor="...">` yang terhubung secara eksplisit.

---

## 8. Standar Perceived Performance & Ergonomi Interaksi (Zero-Lag UI/UX)

Untuk menjamin aplikasi terasa instan (*snappy*), responsif, dan bebas dari persepsi jeda/lag:

### 8.1 Aturan Wajib Komponen Interaktif (Micro-Interactions)
Setiap elemen yang dapat diklik (tombol, link navigasi, dropdown, pagination, kartu klik) **wajib** menyertakan kombinasi kelas utilitas:
```tsx
className="cursor-pointer transition-all duration-150 ease-out hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
```
* **`cursor-pointer`**: Menegaskan secara eksplisit elemen yang dapat diklik oleh pengguna.
* **`active:scale-[0.98]` atau `active:scale-95`**: Memberikan sensasi taktil fisik seketika (<50ms) bahwa interaksi telah tercatat di peramban.
* **`transition-all duration-150`**: Transisi mikro halus tanpa membebani performa frame rate (60fps).

### 8.2 Route Streaming & Suspense Skeletons (`loading.tsx`)
Setiap segmen rute App Router (`/dashboard`, `/input`, `/pimpinan`, `/cetak`) **wajib** memiliki file `loading.tsx` yang merender kerangka visual semu (*shimmer skeleton*):
* Menggunakan komponen baku `@/components/ui/skeleton` dengan kelas `animate-pulse bg-slate-200/80`.
* Mengeliminasi tampilan layar putih/kosong saat Server Components mengunduh data dari Google Apps Script.

### 8.3 Trias State Tampilan Data (Loading → Empty → Error)
Setiap antarmuka yang menampilkan kumpulan data atau tabel wajib menangani 3 kondisi:
1. **Loading State**: Komponen `Skeleton` proporsional dengan tata letak data asli.
2. **Empty State**: Menggunakan `@/components/ui/empty-state` dengan ikon ramah, judul, deskripsi pemecahan masalah, dan tombol aksi (*call-to-action* seperti *Reset Filter*).
3. **Error State**: Menggunakan `@/components/ui/error-state` dengan pesan edukatif dan tombol coba lagi (*retry*).

### 8.4 Lazy Loading Pustaka Berat (`next/dynamic`)
Pustaka komputasi grafis dan ekspor data berat (`recharts`, `jspdf`, `xlsx`) dilarang diimpor secara langsung (*eager*) pada bundel awal:
* Komponen grafik wajib diisolasi dan diimpor menggunakan `next/dynamic` dengan konfigurasi `{ ssr: false, loading: () => <Skeleton /> }`.
* Menjamin *First Load JS* tetap ringan dan interaktivitas awal tercapai secara instan.

### 8.5 Optimistic UI Updates
Untuk mutasi data evaluasi pimpinan:
* Kartu yang dievaluasi langsung disembunyikan dari daftar seketika (*optimistic removal*) dan umpan balik toast instan ditampilkan tanpa menunggu balasan jaringan Google Apps Script.
* Jika mutasi jaringan gagal, sistem secara otomatis mengembalikan (*rollback*) kartu ke posisi semula disertai dialog penjelasan error.

