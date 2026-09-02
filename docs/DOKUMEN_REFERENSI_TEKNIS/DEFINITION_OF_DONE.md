# Definisi Selesai (Definition of Done — DoD) Berbasis Evidence
# SIMPELGAS — Modern Civic Workbench
### Dinas Tenaga Kerja Kota Surakarta

---

## 1. Pendahuluan & Filosofi

Dalam pengembangan perangkat lunak **SIMPELGAS**, sebuah tugas, fitur, atau perbaikan *bug* tidak boleh dinyatakan "selesai" (*Done*) hanya berdasarkan klaim verbal atau perkiraan developer (*"sepertinya sudah jalan"*). Setiap penyelesaian wajib dibuktikan melalui **bukti konkret (*evidence*) yang dapat diverifikasi oleh mesin maupun manusia**.

Prinsip utama:
> **"Evidence before assertions. Tanpa bukti yang terverifikasi, kode belum selesai."**

---

## 2. Lima Gerbang Bukti (The 5 Evidence Gates)

Sebelum branch fitur atau pull request diizinkan untuk digabungkan (*merge*) ke branch `main`, seluruh kode wajib melampaui **5 Gerbang Bukti**:

```text
+---------------------------------------------------------------------------------------+
| GERBANG BUKTI DEFINITION OF DONE (SIMPELGAS)                                          |
+---------------------------------------------------------------------------------------+
|  [GATE 1]  Static Quality & Type Safety    ->  0 error ESLint & tsc --noEmit           |
|  [GATE 2]  Automated Testing & Coverage    ->  Vitest 100% Test Suites Passed         |
|  [GATE 3]  Local CI Pipeline Integrity     ->  npm run ci:local berakhir Exit Code 0  |
|  [GATE 4]  Production Build Optimization   ->  next build menghasilkan bundle optimal |
|  [GATE 5]  Functional & Official Standards ->  Kontrak Apps Script & Cetak Sah        |
+---------------------------------------------------------------------------------------+
```

---

### Gate 1: Static Quality & Type Safety Evidence
* **Tujuan**: Menjamin tidak ada celah sintaks, *code smell*, atau kesalahan tipe data runtime.
* **Perintah Pengujian**:
  ```bash
  npm run lint
  npm run typecheck
  ```
* **Bukti Wajib**:
  * Output `next lint` menghasilkan: `✔ No ESLint warnings or errors`.
  * Output `npm run typecheck` (`tsc --noEmit`) berakhir tanpa satu pun error kompilasi TypeScript.
  * Tidak menggunakan *dirty type casting* seperti `any` tanpa justifikasi tertulis.

---

### Gate 2: Automated Testing & Coverage Evidence
* **Tujuan**: Memastikan logika bisnis, skema validasi, kepatuhan token desain UI, dan penanganan error bekerja sesuai ekspektasi dan kebal regresi.
* **Perintah Pengujian**:
  ```bash
  npm test
  ```
* **Bukti Wajib**:
  * 100% *test suites* lulus (seluruh test di `tests/*.test.ts`).
  * **Design Tokens & UI Standards Test (`tests/design-tokens.test.ts`)**: 100% PASS tanpa exception (0 emoji di UI, 0 hardcoded hex, 0 legacy token, 100% Lucide icons, 0 popup bawaan browser).
  * Setiap penambahan fungsi mutasi baru wajib disertai unit test (mengikuti disiplin *Test-Driven Development*).
  * Validasi input wajib terbukti menolak data cacat via skema Zod (`src/lib/validations.ts`).

---

### Gate 3: Local CI Pipeline Integrity Evidence
* **Tujuan**: Memastikan lingkungan lokal pengembang menjalankan rangkaian verifikasi terpadu yang identik dengan pipeline server CI.
* **Perintah Pengujian**:
  ```bash
  npm run ci:local
  ```
* **Bukti Wajib**:
  * Skrip menjalankan secara berurutan: `lint` $\rightarrow$ `typecheck` $\rightarrow$ `test` $\rightarrow$ `build`.
  * Seluruh proses berakhir dengan kode keluar `0` (sukses tanpa kegagalan di tengah jalan).
  * Git pre-commit hook (Husky) aktif dan memvalidasi file *staged* sebelum commit dibuat.

---

### Gate 4: Production Build Optimization Evidence
* **Tujuan**: Menjamin bahwa aplikasi siap dirilis ke server produksi tanpa adanya kegagalan bundling, kebocoran variabel environment, atau ukuran bundle yang membengkak.
* **Perintah Pengujian**:
  ```bash
  npm run build
  ```
* **Bukti Wajib**:
  * Output menunjukkan kompilasi sukses pada semua rute (*Static* ○ dan *Dynamic* ƒ).
  * Tidak ada error hidrasi React (*Hydration Error*) atau penggunaan API sisi peramban pada Server Components.
  * Ukuran *First Load JS* per rute tetap berada dalam batas performa yang wajar (< 350 kB).

---

### Gate 5: Functional & Official Standards Evidence
* **Tujuan**: Memastikan aplikasi mematuhi regulasi tata naskah dinas resmi dan kontrak integrasi cloud yang tidak boleh terputus.
* **Kriteria Verifikasi**:
  1. **Integritas Kontrak Apps Script (`code.gs`)**:
     * Format payload pengiriman laporan tetap cocok dengan kolom `REKAP_LAPORAN` dan folder Google Drive.
     * Tidak mengubah atau merusak struktur respons JSON Web App Apps Script.
  2. **Kompresi Citra Klien**:
     * Foto dari kamera seluler tetap melalui kompresi Canvas HTML5 (limit 1200px / JPEG 70%) sehingga ukuran base64 aman di bawah batas `bodySizeLimit` (10MB).
  3. **Standar Naskah Cetak Dinas**:
     * Halaman cetak laporan (`/cetak`) mematuhi layout A4 resmi, font Times New Roman naskah dinas, serta logo resmi Pemerintah Kota Surakarta.
  4. **Aksesibilitas & Kerapian Visual**:
     * Rasio kontras teks memenuhi standar WCAG AA (teks gelap pada background terang, tombol memiliki *focus-visible ring*).
  5. **Ergonomi Zero-Lag UI/UX & Perceived Performance**:
     * Seluruh elemen interaktif memiliki `cursor-pointer`, efek klik taktil (`active:scale-[0.98]`), dan umpan balik instan (<50ms).
     * Setiap rute App Router memiliki `loading.tsx` berbasis skeleton shimmer.
     * Pustaka visual berat (Recharts) dimuat secara dinamis via `next/dynamic` dengan `ssr: false`.
     * Tampilan data menerapkan penanganan trias state: Loading Skeleton, EmptyState, dan ErrorState.

---

## 3. Format Checklist Bukti (PR / Commit Checklist)

Setiap pengembang wajib menyertakan dan mencentang tabel bukti ini pada deskripsi Pull Request atau catatan commit rilis:

```markdown
### 📋 Definition of Done Evidence Checklist:
- [ ] **Gate 1 (Static Quality)**: `npm run lint` & `npm run typecheck` lolos tanpa error/warning.
- [ ] **Gate 2 (Testing)**: `npm test` 100% lulus (disertai unit test baru bila ada penambahan fitur).
- [ ] **Gate 3 (Local CI)**: `npm run ci:local` selesai dengan exit code 0.
- [ ] **Gate 4 (Production Build)**: `npm run build` sukses membuat bundle produksi.
- [ ] **Gate 5 (Domain & Ergonomics Compliance)**:
  - [ ] Kontrak data Google Apps Script (`code.gs`) tetap kompatibel.
  - [ ] Validasi Zod diterapkan pada mutasi baru.
  - [ ] Standar Zero-Lag UI (cursor-pointer, route loading skeleton, active:scale) terpenuhi.
  - [ ] Tampilan responsif mobile dan format cetak dinas terverifikasi.
```
