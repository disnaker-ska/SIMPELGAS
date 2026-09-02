# Spesifikasi Desain: Standar Perceived Performance & Ergonomi Interaksi (Zero-Lag UI/UX)
# SIMPELGAS — Modern Civic Workbench
### Dinas Tenaga Kerja Kota Surakarta

---

## 1. Latar Belakang & Masalah (Problem Statement)
Aplikasi SIMPELGAS terhubung ke backend serverless Google Apps Script yang memiliki karakteristik latensi I/O jaringan dan spreadsheet (1–3 detik). Tanpa arsitektur *Perceived Performance* yang tepat di lapisan antarmuka pengguna:
1. **Tombol Terasa Lag**: Ketika tombol diklik (navigasi sidebar, submit formulir, evaluasi pimpinan), antarmuka tidak memberikan respon taktil instan (<50ms), menyebabkan pengguna merasa aplikasi "macet" (*frozen*).
2. **Ketiadaan Route Streaming**: Perpindahan halaman (`/dashboard`, `/pimpinan`, `/cetak`) tidak memiliki file `loading.tsx`, sehingga peramban menampilkan layar kosong atau terhenti sebelum Server Components selesai diunduh.
3. **Pemuatan Eager Komponen Berat**: Modul visual berat seperti Recharts (grafik SVG) dimuat sekaligus pada bundel awal, memperlambat *First Load JS* dan waktu interaktif pertama (*TTI*).
4. **Ketiadaan Standarisasi Interaksi Mikro**: Sebagian elemen klik belum memiliki `cursor-pointer`, efek penekanan fisik (`active:scale-[0.98]`), atau transisi halus.
5. **State Triad Parsial**: Tampilan ketika data kosong (*Empty State*) dan error pemuatan (*Error State*) belum terstandarisasi seragam di seluruh halaman.

---

## 2. Pilar Solusi Desain Zero-Lag UI/UX

### Pilar 1: Interaksi Mikro & Umpan Balik Taktil Seketika (<50ms)
Setiap elemen interaktif (tombol, link, dropdown, pagination, kartu klik) **wajib** menyertakan token kelas interaksi:
```tsx
className="cursor-pointer transition-all duration-150 ease-out hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
```
- **Cursor Pointer**: Mengeliminasi kebingungan pengguna atas elemen mana yang dapat diklik.
- **Active Scale**: Memberikan sensasi fisik bahwa tombol telah menerima klik secara nyata.
- **Immediate Spinner**: Tombol aksi langsung menonaktifkan diri (`disabled`) dan menampilkan spinner `Loader2` saat proses asinkron dimulai.

### Pilar 2: Route Streaming & Suspense Skeletons (`loading.tsx`)
Setiap segmen rute App Router menyediakan komponen `loading.tsx` berbasis Skeleton berkedip halus (`animate-pulse`):
- `src/app/dashboard/loading.tsx`: Menampilkan skeleton kartu metrik KPI dan kerangka tabel data.
- `src/app/input/loading.tsx`: Menampilkan skeleton bidang formulir kedinasan.
- `src/app/pimpinan/loading.tsx`: Menampilkan skeleton kartu evaluasi pimpinan.
- `src/app/cetak/loading.tsx`: Menampilkan skeleton lembar pratinjau naskah dinas.

### Pilar 3: Lazy Loading Pustaka Berat (`next/dynamic` + `ssr: false`)
Komponen analitik visual grafis (`Recharts`) diisolasi ke dalam modul terpisah dan diimpor secara dinamis:
```tsx
const AnalyticsCharts = dynamic(
  () => import('@/components/analytics-charts'),
  {
    ssr: false,
    loading: () => <ChartSkeleton />
  }
)
```

### Pilar 4: Optimistic UI Updates (`useOptimistic` / Immediate State)
Pada portal pimpinan (`/pimpinan`), ketika pimpinan menekan tombol konfirmasi evaluasi *"Ya, Simpan!"*:
1. Kartu laporan yang dievaluasi langsung dihilangkan seketika dari antarmuka (*optimistic removal*), dan counter "Menunggu Evaluasi" langsung berkurang -1.
2. Mutasi `updateEvaluasiPimpinan` berjalan di latar belakang.
3. Jika mutasi gagal, antarmuka mengembalikan kartu ke daftar dan memunculkan notifikasi error dengan opsi *Coba Lagi*.

### Pilar 5: Komprehensif State Triad (Loading $\rightarrow$ Empty $\rightarrow$ Error)
Menyediakan pustaka komponen UI reusable:
- `src/components/ui/skeleton.tsx`: Komponen shimmer skeleton fleksibel.
- `src/components/ui/empty-state.tsx`: Tampilan data kosong resmi dengan ikon ramah, pesan kontekstual, dan tombol aksi (reset filter / buat baru).
- `src/components/ui/error-state.tsx`: Tampilan peringatan kegagalan pemuatan dengan tombol coba lagi (*retry*).

---

## 3. Rencana Dokumentasi Teknis
1. **[UIUX_DESIGN.md](file:///home/disnakerska/Documents/Project/SIMPELGAS/docs/DOKUMEN_REFERENSI_TEKNIS/UIUX_DESIGN.md)**:
   - Tambahkan **Bab 8: Standar Perceived Performance & Ergonomi Interaksi (Zero-Lag UX)**.
2. **[CODING_STANDARD.md](file:///home/disnakerska/Documents/Project/SIMPELGAS/docs/DOKUMEN_REFERENSI_TEKNIS/CODING_STANDARD.md)**:
   - Tambahkan pedoman teknis penggunaan `useTransition`, `next/dynamic`, dan token interaktif Tailwind.
3. **[DEFINITION_OF_DONE.md](file:///home/disnakerska/Documents/Project/SIMPELGAS/docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md)**:
   - Perbarui kriteria Gate 5 untuk memvalidasi zero-lag ergonomics (`cursor-pointer`, skeleton loading, dan active states).
