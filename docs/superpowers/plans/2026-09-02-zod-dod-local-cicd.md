# Zod Validation, Evidence-Based DoD, dan Local CI/CD Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengintegrasikan schema validation Zod pada Server Actions dan data layer, mendokumentasikan Definition of Done (DoD) berbasis evidence, serta membangun Local CI/CD Pipeline terpadu (Husky, lint-staged, npm scripts, dan GitHub Actions) pada SIMPELGAS.

**Architecture:** Menerapkan pendekatan validasi berlapis (defense-in-depth) di mana mutasi Server Actions divalidasi oleh Zod sebelum menyentuh Google Apps Script. Di tingkat alur kerja pengembangan, Git pre-commit hooks (Husky + lint-staged) dan skrip `npm run ci:local` memastikan kode memenuhi seluruh kriteria DoD berbasis evidence sebelum di-commit atau dipush.

**Tech Stack:** Next.js 14, TypeScript, Zod, Husky v9, lint-staged, Vitest, ESLint, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-09-02-zod-dod-local-cicd-design.md](docs/superpowers/specs/2026-09-02-zod-dod-local-cicd-design.md)

## Global Constraints
- Kontrak data dengan backend `code.gs` (Google Apps Script) tidak boleh diubah atau rusak.
- Seluruh 29 unit test yang sudah ada di Vitest harus tetap lulus (100% pass rate).
- Dependency version: Zod v3.x, Husky v9.x, lint-staged.
- Seluruh file dokumen teknis tetap berada di dalam `docs/DOKUMEN_REFERENSI_TEKNIS/`.

---

### Task 1: Install Zod & Buat Schema Validasi (`src/lib/validations.ts`)

**Files:**
- Create: `src/lib/validations.ts`
- Create: `tests/validations.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `LaporanInputSchema` (zod schema & `LaporanInput` type)
  - `EvaluasiPimpinanSchema` (zod schema & `EvaluasiPimpinanInput` type)
  - `LoginPimpinanSchema` (zod schema & `LoginPimpinanInput` type)
  - `AppsScriptResponseSchema` (zod schema)

- [x] **Step 1: Install paket `zod`**
Run: `npm install zod`

- [x] **Step 2: Tulis failing test di `tests/validations.test.ts`**
```typescript
import { describe, it, expect } from 'vitest'
import {
  LaporanInputSchema,
  EvaluasiPimpinanSchema,
  LoginPimpinanSchema,
  AppsScriptResponseSchema
} from '../src/lib/validations'

describe('Zod Validation Schemas', () => {
  it('validates correct LaporanInput', () => {
    const validData = {
      nama_pegawai: 'Ahmad Dahlan',
      nip: '198501012010011001',
      bidang: 'Sekretariat',
      jenis_penugasan: 'Rapat Koordinasi',
      tanggal_kegiatan: '2026-09-02',
      nama_kegiatan: 'Rapat Koordinasi Evaluasi',
      tempat_kegiatan: 'Ruang Rapat Disnaker',
      penyelenggara: 'Disnaker Surakarta',
      tamu_undangan: 'Sekretaris Dinas',
      catatan_kegiatan: 'Telah dilaksanakan koordinasi penyusunan anggaran.',
      dokumentasi_base64: 'data:image/jpeg;base64,sample',
      materi_base64: ''
    }
    const result = LaporanInputSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects LaporanInput with invalid date format', () => {
    const invalidData = {
      nama_pegawai: 'Ahmad Dahlan',
      nip: '198501012010011001',
      bidang: 'Sekretariat',
      jenis_penugasan: 'Rapat Koordinasi',
      tanggal_kegiatan: '02-09-2026', // wrong format
      nama_kegiatan: 'Rapat',
      tempat_kegiatan: 'Disnaker',
      penyelenggara: 'Disnaker',
      catatan_kegiatan: 'Catatan'
    }
    const result = LaporanInputSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('validates EvaluasiPimpinan with official status enum', () => {
    const valid = {
      rowIndex: 2,
      status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
      catatan_pimpinan: 'Lanjutkan koordinasi.'
    }
    expect(EvaluasiPimpinanSchema.safeParse(valid).success).toBe(true)

    const invalid = {
      rowIndex: 2,
      status_tindak_lanjut: 'Status Sembarangan',
      catatan_pimpinan: 'Catatan'
    }
    expect(EvaluasiPimpinanSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates LoginPimpinan PIN numeric length', () => {
    expect(LoginPimpinanSchema.safeParse({ pin: '123456' }).success).toBe(true)
    expect(LoginPimpinanSchema.safeParse({ pin: '12' }).success).toBe(false)
    expect(LoginPimpinanSchema.safeParse({ pin: 'abcde' }).success).toBe(false)
  })

  it('validates AppsScriptResponseSchema', () => {
    expect(AppsScriptResponseSchema.safeParse({ success: true, data: [] }).success).toBe(true)
    expect(AppsScriptResponseSchema.safeParse({ success: 'bukan_boolean' }).success).toBe(false)
  })
})
```

- [x] **Step 3: Jalankan test untuk memverifikasi kegagalan**
Run: `npx vitest run tests/validations.test.ts`
Expected: FAIL (module `../src/lib/validations` not found)

- [x] **Step 4: Buat implementasi `src/lib/validations.ts`**
```typescript
import { z } from 'zod'

export const LaporanInputSchema = z.object({
  nama_pegawai: z.string().trim().min(1, 'Nama pegawai wajib diisi'),
  nip: z.string().trim().min(1, 'NIP wajib diisi'),
  bidang: z.string().trim().min(1, 'Bidang wajib dipilih'),
  jenis_penugasan: z.string().trim().min(1, 'Jenis penugasan wajib dipilih'),
  tanggal_kegiatan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  nama_kegiatan: z.string().trim().min(1, 'Nama kegiatan wajib diisi'),
  tempat_kegiatan: z.string().trim().min(1, 'Tempat kegiatan wajib diisi'),
  penyelenggara: z.string().trim().min(1, 'Penyelenggara wajib diisi'),
  tamu_undangan: z.string().optional().default('-'),
  catatan_kegiatan: z.string().trim().min(1, 'Catatan hasil kegiatan wajib diisi'),
  dokumentasi_base64: z.string().optional().default(''),
  materi_base64: z.string().optional().default('')
})

export type LaporanInput = z.infer<typeof LaporanInputSchema>

export const EvaluasiPimpinanSchema = z.object({
  rowIndex: z.number().int().positive('Index baris harus berupa bilangan bulat positif'),
  status_tindak_lanjut: z.enum([
    'Selesai (Untuk Diketahui)',
    'Perlu Tindak Lanjut Bidang Teknis'
  ], {
    errorMap: () => ({ message: 'Status tindak lanjut harus sesuai kategori resmi' })
  }),
  catatan_pimpinan: z.string().trim().min(1, 'Catatan arahan pimpinan wajib diisi')
})

export type EvaluasiPimpinanInput = z.infer<typeof EvaluasiPimpinanSchema>

export const LoginPimpinanSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN harus terdiri dari 4 sampai 6 digit angka')
})

export type LoginPimpinanInput = z.infer<typeof LoginPimpinanSchema>

export const AppsScriptResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional()
})

export type AppsScriptResponse = z.infer<typeof AppsScriptResponseSchema>
```

- [x] **Step 5: Jalankan test untuk memverifikasi kelulusan**
Run: `npx vitest run tests/validations.test.ts`
Expected: PASS (5/5 tests passed)

---

### Task 2: Integrasikan Zod ke Server Actions & Data Layer

**Files:**
- Modify: `src/lib/actions.ts`
- Modify: `src/lib/types.ts`
- Test: `tests/actions.test.ts`

**Interfaces:**
- Consumes: `LaporanInputSchema`, `EvaluasiPimpinanSchema`, `LoginPimpinanSchema` from `src/lib/validations.ts`
- Produces: Type-safe mutation handlers di `src/lib/actions.ts`

- [x] **Step 1: Tambahkan pengujian validasi Server Actions pada `tests/actions.test.ts`**
Tambahkan test case di `tests/actions.test.ts` yang memverifikasi bahwa pengiriman data cacat/kosong ditolak sebelum request HTTP:
```typescript
it('rejects submitLaporan with invalid data via Zod schema', async () => {
  const invalidFormData = new FormData()
  invalidFormData.append('nama_pegawai', '') // invalid empty
  const res = await submitLaporan(invalidFormData)
  expect(res.success).toBe(false)
  expect(res.error).toBeDefined()
})
```

- [x] **Step 2: Jalankan test untuk melihat kegagalan/perilaku awal**
Run: `npx vitest run tests/actions.test.ts`

- [x] **Step 3: Modifikasi `src/lib/actions.ts` untuk memvalidasi dengan Zod**
Di fungsi `submitLaporan`:
Parse form payload dengan `LaporanInputSchema.safeParse()`. Jika gagal, kembalikan `{ success: false, error: result.error.issues[0].message }`.
Di fungsi `updateEvaluasiPimpinan`:
Parse payload dengan `EvaluasiPimpinanSchema.safeParse({ rowIndex, status_tindak_lanjut: status, catatan_pimpinan: catatan })`. Jika gagal, kembalikan `{ success: false, error: result.error.issues[0].message }`.
Di fungsi `loginPimpinan`:
Parse input dengan `LoginPimpinanSchema.safeParse({ pin })`. Jika gagal, kembalikan `{ success: false, error: result.error.issues[0].message }`.

- [x] **Step 4: Jalankan seluruh test suite Vitest**
Run: `npm test`
Expected: All test suites PASS (tests/validations.test.ts, tests/actions.test.ts, tests/appscript.test.ts, tests/excel-validation.test.ts, tests/print-utils.test.ts)

---

### Task 3: Buat Dokumen Definition of Done (DoD) Berbasis Evidence

**Files:**
- Create: `docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md`
- Modify: `docs/DOKUMEN_REFERENSI_TEKNIS/CODING_STANDARD.md`
- Modify: `README.md`

- [x] **Step 1: Buat file `docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md`**
Memuat 5 Evidence Gates:
1. Gate 1: Static Quality Evidence (`npm run lint` & `npm run typecheck` zero errors/warnings).
2. Gate 2: Automated Testing Evidence (`npm test` 100% pass + skenario uji Zod).
3. Gate 3: Local CI Pipeline Integrity (`npm run ci:local` exit 0).
4. Gate 4: Production Build Cleanliness (`npm run build` sukses tanpa error).
5. Gate 5: Functional & Regression Evidence (kompatibilitas Apps Script, kompresi Canvas, dan tata naskah cetak).
Disertai tabel checklist wajib sebelum PR/merge.

- [x] **Step 2: Update referensi di `CODING_STANDARD.md` dan `README.md`**
Tambahkan link dokumen `DEFINITION_OF_DONE.md` ke daftar dokumen referensi teknis.

---

### Task 4: Setup Local CI/CD Pipeline (Husky, lint-staged, scripts, GitHub Actions)

**Files:**
- Create: `.husky/pre-commit`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`

- [x] **Step 1: Install `husky` dan `lint-staged`**
Run: `npm install --save-dev husky lint-staged`

- [x] **Step 2: Inisialisasi Husky v9**
Run: `npx husky init`

- [x] **Step 3: Konfigurasikan `.husky/pre-commit`**
Isi file `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
npx lint-staged
npm run typecheck
```
Pastikan file executable (`chmod +x .husky/pre-commit`).

- [x] **Step 4: Konfigurasikan script dan `lint-staged` di `package.json`**
Tambahkan scripts:
- `"typecheck": "tsc --noEmit"`
- `"ci:local": "npm run lint && npm run typecheck && npm test && npm run build"`
Tambahkan blok konfigurasi `lint-staged`:
```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "vitest related --run"
  ]
}
```

- [x] **Step 5: Buat file workflow GitHub Actions `.github/workflows/ci.yml`**
```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  verify:
    name: Lint, Typecheck, Test, and Build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Typecheck
        run: npm run typecheck

      - name: Run Vitest unit tests
        run: npm test

      - name: Run Next.js production build
        run: npm run build
        env:
          APPSCRIPT_URL: ${{ secrets.APPSCRIPT_URL }}
```

- [x] **Step 6: Jalankan verifikasi end-to-end local CI pipeline**
Run: `npm run ci:local`
Expected: Seluruh tahapan (lint -> typecheck -> test -> build) berakhir sukses dengan exit code 0.
