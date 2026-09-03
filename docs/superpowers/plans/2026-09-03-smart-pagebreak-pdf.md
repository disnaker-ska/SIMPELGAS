# Smart Page Break & Anti-Clipping Implementation Plan for DOM-to-PDF

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mencegah elemen laporan (foto dokumentasi, judul seksi, blok catatan, dan tanda tangan) terpotong di tengah lembar kertas pada dokumen PDF multi-halaman dengan mengimplementasikan Smart Slicing Algorithm berbasis deteksi bounding box DOM.

**Architecture:** Mengganti pemotongan canvas statis/buta (`renderedHeight += pageCanvasHeight`) dengan algoritma pemotongan cerdas (*Content-Aware Slicing*). Algoritma menghitung posisi vertikal setiap elemen beranotasi `data-pdf-avoid-break` (foto `.doc-item`, judul seksi `.section-heading`, blok disposisi, tabel, dan tanda tangan). Jika garis pemisah halaman A4 memotong salah satu elemen tersebut, batas potong digeser ke atas ke tepi atas elemen bersangkutan, sehingga elemen tersebut berpindah utuh ke awal halaman berikutnya.

**Tech Stack:** TypeScript, Next.js 14, jsPDF, html2canvas, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-03-dom-to-pdf-download-design.md`](file:///home/disnakerska/Documents/Project/SIMPELGAS/docs/superpowers/specs/2026-09-03-dom-to-pdf-download-design.md)

---

## Global Constraints

- 100% mematuhi 5 Aturan Keras Token UI (`tests/design-tokens.test.ts`): 0 emoji Unicode, warna semantik, 100% `lucide-react`, SweetAlert2 notifications.
- Dilarang hardcoded styling yang merusak format resmi A4 Pemerintah Kota Surakarta.
- Seluruh 14 test suites Vitest wajib pass (100%).
- `npm run ci:local` wajib Exit Code 0.

---

## Proposed Changes & Tasks

### Task 1: Add HTML Avoid-Break Annotations & CSS Sizing in Template
**Files:**
- Modify: `src/lib/pdf-generator.ts:37-190`
- Test: `tests/pdf-generator.test.ts`

**Interfaces:**
- Produces: `buildLaporanHTML` dengan atribut `data-pdf-avoid-break` pada elemen-elemen kritis:
  - Header Kop Surat
  - Baris Tabel Metadata (`tr`)
  - Blok Catatan Hasil Kegiatan (`p`, `li`)
  - Blok Arahan Disposisi Pimpinan
  - Seksi Dokumentasi Kegiatan (header seksi + grid foto)
  - Masing-masing kotak foto (`.doc-item`)
  - Blok Tanda Tangan Pegawai (`.signature-container`)

- [ ] **Step 1: Write failing test for avoid-break attributes**
  In `tests/pdf-generator.test.ts`, tambahkan pengujian bahwa `buildLaporanHTML` menyertakan atribut `data-pdf-avoid-break` pada foto, seksi dokumentasi, dan blok tanda tangan.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/pdf-generator.test.ts` (FAIL).
- [ ] **Step 3: Update `buildLaporanHTML` in `src/lib/pdf-generator.ts`**
  Tambahkan atribut `data-pdf-avoid-break` dan optimalkan margin vertikal agar tidak memakan ruang berlebih jika foto dapat muat di halaman pertama.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/pdf-generator.test.ts` (PASS).
- [ ] **Step 5: Commit**
  `git commit -m "feat(pdf): annotate avoid-break DOM elements in report template"`

---

### Task 2: Implement Smart Content-Aware Canvas Slicing Algorithm
**Files:**
- Modify: `src/lib/pdf-generator.ts:250-325`
- Test: `tests/pdf-generator.test.ts`

**Interfaces:**
- Function: `calculateSmartPageBreaks(container: HTMLElement, canvasWidth: number, canvasHeight: number, pageCanvasHeight: number): number[]`
- Function `generateLaporanPDF`: menggunakan slice points dari `calculateSmartPageBreaks` alih-alih `renderedHeight += pageCanvasHeight`.

- [ ] **Step 1: Write test for smart page break calculation**
  Tambahkan unit test di `tests/pdf-generator.test.ts` yang mensimulasikan elemen berada di koordinat persimpangan halaman (misal $y = 2100$ sampai $2400$, memotong batas $2246$). Pastikan batas potong digeser ke $y = 2100$ sehingga elemen tidak terpotong.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/pdf-generator.test.ts` (FAIL).
- [ ] **Step 3: Implement `calculateSmartPageBreaks` and integrate into `generateLaporanPDF`**
  Hitung offset relatif setiap elemen beranotasi `[data-pdf-avoid-break]` terhadap kontainer.
  Jika `targetSlice` memotong elemen yang tingginya lebih kecil dari `pageCanvasHeight`, geser batas potong ke `elementTop`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/pdf-generator.test.ts` (PASS).
- [ ] **Step 5: Commit**
  `git commit -m "feat(pdf): implement smart content-aware page slicing without split images"`

---

### Task 3: Full Regression & 5 Evidence Gates Verification
**Files:**
- Test: All suites (`npm test`, `npm run ci:local`)

- [ ] **Step 1: Run Gate 1 (Lint & Typecheck)**
  Run: `npm run lint && npm run typecheck`
- [ ] **Step 2: Run Gate 2 (Vitest Full Suite)**
  Run: `npm test`
- [ ] **Step 3: Run Gate 3 (Local CI)**
  Run: `npm run ci:local`
- [ ] **Step 4: Commit & Push**
  Push to `origin main` and `vercel-repo main`.
