# Spesifikasi Desain: Zod Validation, Evidence-Based DoD, dan Local CI/CD Pipeline
# SIMPELGAS — Modern Civic Workbench
### Dinas Tenaga Kerja Kota Surakarta

---

## 1. Ringkasan & Tujuan
Spesifikasi ini mengatur tiga pilar penguatan rekayasa perangkat lunak (*software engineering rigor*) pada aplikasi monolitik **SIMPELGAS** (Next.js 14 App Router):
1. **Schema Validation Layer (Zod)**: Memvalidasi setiap payload mutasi pada Server Actions, integritas payload respons Google Apps Script, dan derivasi tipe data domain TypeScript yang aman (*type-safe*).
2. **Definition of Done (DoD) Berbasis Evidence**: Dokumen kriteria penyelesaian fitur berbasis bukti konkret yang dapat diverifikasi mesin dan manusia sebelum perubahan digabungkan ke branch utama.
3. **Local CI/CD Pipeline (Hybrid Runner)**: Otomatisasi pengujian dan verifikasi kode lokal menggunakan Git pre-commit hook (Husky + lint-staged), skrip runner terpadu (`npm run ci:local`), serta workflow GitHub Actions yang selaras.

---

## 2. Arsitektur Komponen & Skema Validasi Zod

### 2.1 Modul Validasi (`src/lib/validations.ts`)
Modul ini mengekspor skema Zod dan tipe hasil inferensinya:

1. `LaporanInputSchema`:
   - `nama_pegawai`: `z.string().min(1, 'Nama pegawai wajib diisi')`
   - `nip`: `z.string().min(1, 'NIP wajib diisi')`
   - `bidang`: `z.string().min(1, 'Bidang wajib dipilih')`
   - `jenis_penugasan`: `z.string().min(1, 'Jenis penugasan wajib dipilih')`
   - `tanggal_kegiatan`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')`
   - `nama_kegiatan`: `z.string().min(1, 'Nama kegiatan wajib diisi')`
   - `tempat_kegiatan`: `z.string().min(1, 'Tempat kegiatan wajib diisi')`
   - `penyelenggara`: `z.string().min(1, 'Penyelenggara wajib diisi')`
   - `tamu_undangan`: `z.string().default('-')`
   - `catatan_kegiatan`: `z.string().min(1, 'Catatan hasil kegiatan wajib diisi')`
   - `dokumentasi_base64`: `z.string().optional().default('')`
   - `materi_base64`: `z.string().optional().default('')`

2. `EvaluasiPimpinanSchema`:
   - `rowIndex`: `z.number().int().positive('Index baris harus berupa bilangan bulat positif')`
   - `status_tindak_lanjut`: `z.enum(['Selesai (Untuk Diketahui)', 'Perlu Tindak Lanjut Bidang Teknis'], { errorMap: () => ({ message: 'Status tindak lanjut tidak valid' }) })`
   - `catatan_pimpinan`: `z.string().min(1, 'Catatan pimpinan wajib diisi')`

3. `LoginPimpinanSchema`:
   - `pin`: `z.string().regex(/^\d{4,6}$/, 'PIN harus berupa 4-6 digit angka')`

4. `AppsScriptResponseSchema`:
   - `success`: `z.boolean()`
   - `data`: `z.unknown().optional()`
   - `message`: `z.string().optional()`

### 2.2 Integrasi Server Actions (`src/lib/actions.ts`)
- Fungsi `submitLaporan`, `updateEvaluasiPimpinan`, dan `loginPimpinan` memvalidasi input menggunakan `schema.safeParse()`.
- Jika `!result.success`, fungsi mengembalikan `{ success: false, error: result.error.issues[0]?.message || 'Validasi gagal' }` tanpa membuang waktu jaringan mengirim payload cacat ke Apps Script.

---

## 3. Local CI/CD Pipeline (Hybrid Architecture)

### 3.1 Skrip NPM (`package.json`)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "ci:local": "npm run lint && npm run typecheck && npm test && npm run build",
    "prepare": "husky"
  }
}
```

### 3.2 Git Hook Pre-Commit (`.husky/pre-commit` & `lint-staged`)
- Menggunakan Husky v9 dan `lint-staged`.
- Konfigurasi `lint-staged` di `package.json`:
  ```json
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
  ```
- File `.husky/pre-commit` mengeksekusi `npx lint-staged` dan `npm run typecheck`.

### 3.3 GitHub Actions Workflow (`.github/workflows/ci.yml`)
- Dijalankan pada setiap *push* dan *pull request* ke branch `main`.
- Menjalankan matriks Node.js 18.x dan 20.x:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` dengan caching npm
  3. `npm ci`
  4. `npm run lint`
  5. `npm run typecheck`
  6. `npm test`
  7. `npm run build`

---

## 4. Dokumen Definition of Done (DoD) Berbasis Evidence

### 4.1 Penempatan Dokumen
Lokasi: `docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md`

### 4.2 Matriks 5 Evidence Gates
1. **Gate 1 - Static Quality Evidence**:
   - `npm run lint` = 0 errors, 0 warnings.
   - `npm run typecheck` = zero error (TypeScript compilation sukses).
2. **Gate 2 - Automated Testing Evidence**:
   - `npm test` = 100% test suites lulus (Vitest).
   - Pengujian skema validasi Zod baru (`tests/validations.test.ts`) lulus.
3. **Gate 3 - Local CI Pipeline Evidence**:
   - `npm run ci:local` lulus secara beruntun dari awal hingga akhir dengan exit code 0.
4. **Gate 4 - Clean Production Build Evidence**:
   - `npm run build` menghasilkan rute statis dan dinamis secara efisien tanpa kebocoran tipe runtime.
5. **Gate 5 - Functional Domain & Regression Evidence**:
   - Verifikasi bahwa payload Google Apps Script (`code.gs`) tetap kompatibel.
   - Verifikasi bahwa kompresi foto kamera smartphone tetap bekerja.
   - Verifikasi bahwa render cetak A4 tidak terganggu.

---

## 5. Rencana Pengujian Otomatis
File baru `tests/validations.test.ts` memverifikasi skenario:
1. `LaporanInputSchema` memvalidasi input lengkap yang benar.
2. `LaporanInputSchema` menolak jika field wajib kosong (nama, NIP, tanggal salah format).
3. `EvaluasiPimpinanSchema` memvalidasi status sah dan menolak status arbitrer di luar enum dinas.
4. `LoginPimpinanSchema` memvalidasi PIN angka dan menolak karakter non-angka atau panjang tidak valid.
5. `AppsScriptResponseSchema` mengenali respon Apps Script yang valid vs korup.
