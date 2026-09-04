# Top 5 Pegawai Bertugas & Kartu Info Status Penugasan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan widget Top 5 Pegawai yang paling sering ditugaskan tugas luar beserta 3 kartu ringkasan status tindak lanjut (Untuk Diketahui, Perlu Tindak Lanjut, Sudah Dievaluasi) pada Dashboard SIMPELGAS.

**Architecture:** Memanfaatkan data `filteredData` yang sudah ada di `src/components/dashboard-client.tsx` agar semua metrik dan ranking bereaksi dinamis terhadap filter (Bidang, Bulan, Rentang Tanggal). Normalisasi nama pegawai menggunakan `normalizePersonName` dari `@/lib/appscript` yang dicocokkan dengan master `pegawaiList`. Mengubah seksi analitik menjadi grid 3 kolom responsif dan menyematkan baris kartu status berpalet Civic Spectrum.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React (`Award`, `FileText`, `AlertCircle`, `CheckCircle2`), Vitest.

---

## Global Constraints

- **5 Aturan Keras UI & Desain Token (AGENTS.md):**
  1. 0 emoji Unicode di antarmuka (100% menggunakan `lucide-react`).
  2. 0 hardcoded hex color di JSX/className (menggunakan token semantik CSS variable / Tailwind Civic Spectrum).
  3. Dilarang token usang (`navy-*`, `amber-*`).
  4. 100% ikonografi menggunakan `lucide-react`.
  5. Dilarang dialog popup bawaan browser (`alert()`, `confirm()`).
- **Data Integrity:** Pencocokan pegawai wajib toleran terhadap variasi gelar (`normalizePersonName`).
- **Quality Gates:** Seluruh 18+ test suites wajib 100% pass dan `npm run ci:local` exit code 0.

---

### Task 1: Unit & Component Tests for Top 5 Pegawai & Status Metrics (TDD Red)

**Files:**
- Create: `tests/dashboard-analytics.test.tsx`
- Reference: `src/components/dashboard-client.tsx`
- Reference: `src/lib/appscript.ts`

**Interfaces:**
- Produces: Test suite validating:
  1. Perhitungan status tindak lanjut: `untukDiketahui`, `perluTindakLanjut`, `sudahDievaluasi`.
  2. Pengelompokan dan pengurutan Top 5 Pegawai dengan frekuensi penugasan terbanyak.
  3. Normalisasi nama dengan gelar sehingga terhitung ke akun pegawai resmi yang sama.
  4. Penyesuaian reaktif saat data difilter.

- [ ] **Step 1: Tulis unit test di `tests/dashboard-analytics.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DashboardClient } from '../src/components/dashboard-client'
import type { Laporan, Pegawai, DashboardStats } from '../src/lib/types'

const mockPegawaiList: Pegawai[] = [
  {
    id: 'peg-1',
    nama: 'Budi Santoso, S.Kom',
    nip: '198501012010011001',
    bidang: 'SEKRETARIAT',
    jabatan: 'Pranata Komputer Ahli Muda',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'peg-2',
    nama: 'Siti Rahayu, S.E.',
    nip: '198902022012022002',
    bidang: 'BIDANG HUBUNGAN INDUSTRIAL',
    jabatan: 'Pengawas Ketenagakerjaan',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'peg-3',
    nama: 'Agus Pratama, S.T.',
    nip: '199003032015031003',
    bidang: 'BIDANG PPTK',
    jabatan: 'Pengantar Kerja Ahli Pertama',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

const mockLaporanList: Laporan[] = [
  {
    id: '1',
    pegawai_id: 'Budi Santoso', // Name without gelar
    bidang: 'SEKRETARIAT',
    jabatan: 'Staff',
    jenis_penugasan: 'Rapat Koordinasi',
    tanggal_kegiatan: '2026-08-10',
    nama_kegiatan: 'Rakor A',
    tempat_kegiatan: 'Semarang',
    penyelenggara: 'Disnaker Provinsi',
    tamu_undangan: null,
    catatan_hasil: 'Selesai',
    dokumentasi_urls: null,
    materi_urls: null,
    status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
    catatan_pimpinan: '[Kadis]: Diterima',
    created_at: '2026-08-10',
    updated_at: '2026-08-10',
  },
  {
    id: '2',
    pegawai_id: 'Budi Santoso, S.Kom', // Name with gelar
    bidang: 'SEKRETARIAT',
    jabatan: 'Pranata Komputer Ahli Muda',
    jenis_penugasan: 'Sosialisasi / Bimtek',
    tanggal_kegiatan: '2026-08-12',
    nama_kegiatan: 'Bimtek B',
    tempat_kegiatan: 'Solo',
    penyelenggara: 'Disnaker Solo',
    tamu_undangan: null,
    catatan_hasil: 'Selesai',
    dokumentasi_urls: null,
    materi_urls: null,
    status_tindak_lanjut: 'Perlu Tindak Lanjut',
    catatan_pimpinan: null,
    created_at: '2026-08-12',
    updated_at: '2026-08-12',
  },
  {
    id: '3',
    pegawai_id: 'Siti Rahayu, S.E.',
    bidang: 'BIDANG HUBUNGAN INDUSTRIAL',
    jabatan: 'Pengawas Ketenagakerjaan',
    jenis_penugasan: 'Kunjungan Kerja',
    tanggal_kegiatan: '2026-08-15',
    nama_kegiatan: 'Kunker C',
    tempat_kegiatan: 'Yogyakarta',
    penyelenggara: 'Kemenaker',
    tamu_undangan: null,
    catatan_hasil: 'Hasil koordinasi',
    dokumentasi_urls: null,
    materi_urls: null,
    status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
    catatan_pimpinan: '',
    created_at: '2026-08-15',
    updated_at: '2026-08-15',
  },
]

const mockStats: DashboardStats = {
  totalLaporan: 3,
  uniquePegawai: 2,
  totalDievaluasi: 1,
}

describe('Dashboard Status Cards & Top 5 Pegawai (TDD)', () => {
  it('renders status summary cards: Untuk Diketahui, Perlu Tindak Lanjut, Sudah Dievaluasi', () => {
    const html = renderToString(
      <DashboardClient
        initialLaporan={mockLaporanList}
        initialStats={mockStats}
        pegawaiList={mockPegawaiList}
      />
    )

    expect(html).toContain('Untuk Diketahui')
    expect(html).toContain('Perlu Tindak Lanjut')
    expect(html).toContain('Sudah Dievaluasi')
  })

  it('renders Top 5 Pegawai Bertugas leaderboard card', () => {
    const html = renderToString(
      <DashboardClient
        initialLaporan={mockLaporanList}
        initialStats={mockStats}
        pegawaiList={mockPegawaiList}
      />
    )

    expect(html).toContain('Top 5 Pegawai Bertugas')
    // Budi Santoso has 2 reports (normalized across gelar)
    expect(html).toContain('Budi Santoso, S.Kom')
    // Siti Rahayu has 1 report
    expect(html).toContain('Siti Rahayu, S.E.')
  })
})
```

- [ ] **Step 2: Jalankan test untuk memverifikasi test gagal (TDD Red)**

Run: `npx vitest run tests/dashboard-analytics.test.tsx`
Expected: FAIL ("Top 5 Pegawai Bertugas" atau kartu status belum ditemukan di HTML output).

---

### Task 2: Implementasi Top 5 Pegawai & Kartu Status di `src/components/dashboard-client.tsx`

**Files:**
- Modify: `src/components/dashboard-client.tsx:1-30` (tambah import `Award`, `normalizePersonName`)
- Modify: `src/components/dashboard-client.tsx:130-185` (tambah useMemo untuk statusStats & topPegawaiList)
- Modify: `src/components/dashboard-client.tsx:475-600` (render kartu status dan kolom Top 5 di seksi analitik)
- Test: `tests/dashboard-analytics.test.tsx`

**Interfaces:**
- Consumes: `normalizePersonName` dari `@/lib/appscript`, `filteredData` dari memo filter aktif.
- Produces:
  - `statusStats`: `{ untukDiketahui: number, perluTindakLanjut: number, sudahDievaluasi: number }`
  - `topPegawaiList`: Array Top 5 `{ id, nama, bidang, jabatan, count, percentage }`

- [ ] **Step 1: Tambahkan import `Award` dan `normalizePersonName`**
- [ ] **Step 2: Tambahkan logika komputasi `statusStats` dan `topPegawaiList` di dalam `DashboardClient`**
- [ ] **Step 3: Render sub-grid 3 kartu status (Untuk Diketahui, Perlu Tindak Lanjut, Sudah Dievaluasi) di bawah KPI Cards**
- [ ] **Step 4: Perluas seksi analitik menjadi 3 kolom responsif (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) dan sisipkan kartu Top 5 Pegawai Bertugas**
- [ ] **Step 5: Jalankan test `tests/dashboard-analytics.test.tsx` untuk memastikan lolos (TDD Green)**

Run: `npx vitest run tests/dashboard-analytics.test.tsx`
Expected: PASS (2 tests pass).

---

### Task 3: Verifikasi 5 Evidence Gates, Build & Push

**Files:**
- All modified and new files

- [ ] **Step 1: Jalankan Gate 1 (Linting & TypeScript Check)**

Run: `npm run lint && npm run typecheck`
Expected: 0 error, 0 warning.

- [ ] **Step 2: Jalankan Gate 2 (Vitest Suite & Design Tokens)**

Run: `npm test`
Expected: 19 test files pass 100%.

- [ ] **Step 3: Jalankan Gate 3 & 4 (Local CI: lint, typecheck, test, build)**

Run: `npm run ci:local`
Expected: Exit code 0, build berhasil.

- [ ] **Step 4: Commit & Push ke GitHub**

Run:
```bash
git add tests/dashboard-analytics.test.tsx src/components/dashboard-client.tsx docs/superpowers/plans/2026-09-04-top-5-pegawai-status-cards.md
git commit -m "feat(dashboard): tambah kartu status penugasan dan widget top 5 pegawai bertugas"
git push origin main
```
