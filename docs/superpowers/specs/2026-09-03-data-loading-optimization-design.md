# Data Loading Optimization & Next.js Caching Architecture Spec

> Tanggal: 2026-09-03  
> Status: Validated & Approved  
> Target: SIMPELGAS v2.1 (Next.js 14 App Router)

---

## 1. Background & Problem Statement

Pada SIMPELGAS versi Next.js, pengguna merasakan performa muat data (data loading) yang jauh lebih lambat daripada antarmuka HTML biasa. Berdasarkan analisis kode:
1. **Blocking SSR (High TTFB 2–4s)**: Halaman (`/dashboard`, `/input`, `/cetak`, `/pimpinan`) diset `export const dynamic = 'force-dynamic'` dan Server Actions menggunakan `noStore()` serta `cache: 'no-store'`. Next.js memblokir transmisi HTML sampai panggilan HTTPS ke Google Apps Script (termasuk cold start dan HTTP 302 redirect) selesai.
2. **Double-Fetching**: Pada `DashboardPage`, `CetakPage`, dan `PimpinanPage`, terjadi `Promise.all([getAllLaporan(), getPegawai()])`, padahal di dalam `getAllLaporan()` sudah ada pemanggilan `fetchPegawaiFromAppsScript()`.
3. **Nol Caching**: Master data pegawai (`DATA_PEGAWAI`) yang jarang berubah selalu di-fetch ulang dari spreadsheet pada setiap navigasi.
4. **Ketiadaan Streaming Skeletons (`loading.tsx`)**: Tidak ada umpan balik visual instan saat berpindah rute, membuat browser terlihat macet/freeze.

---

## 2. Solution Architecture

### 2.1 Server Data Caching (`unstable_cache` & `revalidateTag`)
* **Data Pegawai (`DATA_PEGAWAI`)**:
  * Dibungkus dengan `unstable_cache` dengan tag `['pegawai']` dan TTL 1.800 detik (30 menit).
  * Data master ini di-cache di level server Next.js sehingga navigasi ke halaman input laporan atau halaman lainnya instan (< 50ms).
* **Data Laporan (`REKAP_LAPORAN`)**:
  * Dibungkus dengan `unstable_cache` dengan tag `['laporan']` dan TTL 60 detik (1 menit).
  * Menjelajah Dashboard, Cetak, dan Pimpinan menjadi instan dari cache.
* **On-Demand Tag Invalidation**:
  * Ketika `submitLaporan()` atau `updateEvaluasiPimpinan()` berhasil dieksekusi, Next.js langsung memanggil `revalidateTag('laporan')` bersama `revalidatePath(...)`.
* **Manual Refresh Action**:
  * Disediakan Server Action `refreshData(tag?: 'laporan' | 'pegawai' | 'all')` untuk memicu `revalidateTag` on-demand saat tombol sinkronisasi diklik oleh pengguna.

### 2.2 Deduplikasi Fetch
* `getAllLaporan()` menggunakan hasil dari `getPegawai()` yang sudah ter-cache, menghilangkan redundant fetch ke Apps Script.

### 2.3 Route Streaming Skeletons (`loading.tsx`)
Setiap rute utama memiliki file `loading.tsx` yang merender kerangka visual (skeleton) menggunakan token warna Civic Spectrum (`bg-slate-200/80 animate-pulse`):
* `src/app/dashboard/loading.tsx`: Header, 4 KPI stats cards, filter bar, donat chart skeleton, dan recent activity list.
* `src/app/input/loading.tsx`: Form header, pegawai selector placeholder, radio group, field inputs, dan dropzone.
* `src/app/cetak/loading.tsx`: Filter pencarian laporan dan kerangka lembar pratinjau A4.
* `src/app/pimpinan/loading.tsx`: Toolbar evaluasi, tombol aksi, dan daftar kartu laporan pending evaluasi.

### 2.4 Ergonomi Tombol Refresh di UI
* **Dashboard ([dashboard-client.tsx](file:///home/disnakerska/Documents/Project/SIMPELGAS/src/components/dashboard-client.tsx))**:
  Tombol `RefreshCw` memanggil Server Action `refreshData()`, menampilkan animasi spinning, memicu `router.refresh()`, dan memberikan notifikasi visual.
* **Panel Pimpinan ([pimpinan-client.tsx](file:///home/disnakerska/Documents/Project/SIMPELGAS/src/components/pimpinan-client.tsx))**:
  Tombol "Sinkronkan Data" baru ditambahkan pada toolbar pimpinan dengan ikon `RefreshCw` dari `lucide-react`, memanggil `refreshData()` dengan feedback toast SweetAlert2.

---

## 3. Global Constraints & Standards
1. **Zero Hardcoded Colors & No Emoji**: Wajib 100% mematuhi palet Civic Spectrum dan ikon `lucide-react` (sesuai `tests/design-tokens.test.ts`).
2. **Contract Safety**: Tidak mengubah skema data `Pegawai` dan `Laporan` serta endpoint Apps Script (`code.gs`).
3. **100% Test Passing**: Seluruh test Vitest wajib lulus (13 suites, 67+ tests).
4. **Clean Builds**: `npm run ci:local` harus exit code 0.
