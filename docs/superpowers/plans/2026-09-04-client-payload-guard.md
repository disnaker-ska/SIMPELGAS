# Rencana Implementasi: Kompresi Otomatis Foto & PDF Serta Proteksi Payload Vercel (4.5 MB Limit)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengeliminasi error `can't access property "status", c is undefined` secara tuntas dengan menghadirkan kompresi otomatis foto dokumentasi (maksimal 500 KB), kompresi otomatis materi PDF (>3.0 MB), validasi berkas dokumen non-PDF (>3.5 MB), serta pertahanan defensif pada Server Action Next.js dan adapter Apps Script.

**Architecture:** Strategi *Defense-in-Depth* 4 Lapis:
1. *Lapis 1 (Kompresi Foto Otomatis):* Setiap foto dokumentasi yang dipilih/di-drop dikompresi langsung menggunakan HTML5 Canvas menjadi maksimal 500 KB (rata-rata 180–300 KB, resolusi optimal 1280px, kualitas JPEG ~72%).
2. *Lapis 2 (Kompresi PDF Otomatis):* Berkas materi PDF berukuran >3.0 MB dioptimalkan secara client-side menggunakan rendering canvas & jsPDF, menurunkan ukuran dari 6–10 MB menjadi 1–2 MB.
3. *Lapis 3 (Penjaga Payload & Format Non-PDF):* Berkas Word/PPT/Excel >3.5 MB ditolak ramah via SweetAlert2. Sebelum submit, total seluruh string Base64 diverifikasi tidak melebihi 4.0 MB.
4. *Lapis 4 (Server Action & Adapter Defensif):* Penanganan aman respons `undefined` pada `actions.ts` dan perbaikan `await res.json()` serta pengecekan `!res.ok` pada `appscript.ts`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5, jsPDF, HTML5 Canvas API, SweetAlert2, Vitest.

---

## Global Constraints

- Wajib mematuhi 5 Aturan Keras Desain Token SIMPELGAS:
  1. DILARANG menggunakan emoticon / emoji Unicode di UI, SweetAlert2, atau Toast.
  2. DILARANG hardcoded hex color (gunakan `DESIGN_TOKENS` atau semantic CSS classes).
  3. DILARANG menggunakan token lama (`navy-*`, `amber-*`).
  4. Wajib 100% ikonografi menggunakan `lucide-react`.
  5. DILARANG dialog bawaan browser (`alert()`, `confirm()`, `prompt()`) — wajib SweetAlert2 (`Swal.fire`).
- Batas keras Serverless Function Vercel adalah 4.5 MB.
- 100% test suite Vitest harus lolos (`npm test` & `npm run ci:local`).

---

## Detailed Implementation Tasks (Bite-Sized)

### Task 1: Buat Helper Validasi Ukuran Berkas & Kompresi Foto (TDD)
**Files:**
- Create: `src/lib/file-guard.ts`
- Create: `tests/file-guard.test.ts`

- [ ] **Step 1: Tulis failing test di `tests/file-guard.test.ts`**
  - Menguji penolakan berkas > 3.5 MB dan lolosnya berkas <= 3.5 MB.
  - Menguji fungsi `formatFileSize` dan `estimateBase64Size`.
  - Menguji validasi batas total ukuran lampiran (< 4.0 MB).
- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan awal**
  - `npx vitest run tests/file-guard.test.ts`
- [ ] **Step 3: Implementasikan `src/lib/file-guard.ts`**
  - Definisikan konstanta, fungsi validasi, dan helper kompresi foto canvas (target <= 500 KB).
- [ ] **Step 4: Jalankan test kembali untuk memverifikasi kelulusan**
  - `npx vitest run tests/file-guard.test.ts`

---

### Task 2: Implementasi Modul Kompresi PDF Client-Side (TDD)
**Files:**
- Create: `src/lib/pdf-compressor.ts`
- Create: `tests/pdf-compressor.test.ts`

- [ ] **Step 1: Tulis unit test untuk `pdf-compressor.ts` di `tests/pdf-compressor.test.ts`**
  - Menguji penanganan berkas PDF, deteksi batas ukuran, dan respons saat kompresi dilakukan.
- [ ] **Step 2: Implementasikan `compressPdfFile` di `src/lib/pdf-compressor.ts`**
  - Gunakan jsPDF dan HTML5 Canvas untuk menghasilkan PDF teroptimasi jika ukuran melebihi ambang batas.
- [ ] **Step 3: Jalankan test dan pastikan lulus 100%**
  - `npx vitest run tests/pdf-compressor.test.ts`

---

### Task 3: Perbaiki Adapter Google Apps Script & Server Actions
**Files:**
- Modify: `src/lib/appscript.ts:210-230`
- Modify: `src/lib/actions.ts:138-195`
- Test: `tests/actions.test.ts` & `tests/appscript.test.ts`

- [ ] **Step 1: Tulis unit test payload limit di `tests/actions.test.ts`**
  - Memverifikasi penolakan kiriman dengan total lampiran raksasa (> 4.2 MB).
- [ ] **Step 2: Perbaiki `appscript.ts`**
  - Tambahkan `if (!res.ok)` dan `const data = await res.json(); return data;`.
- [ ] **Step 3: Perbaiki `actions.ts`**
  - Tambahkan payload size validation dan `if (res?.status === 'success')`.
- [ ] **Step 4: Jalankan test suites actions & appscript**
  - `npx vitest run tests/actions.test.ts tests/appscript.test.ts`

---

### Task 4: Integrasi Kompresi Otomatis & Proteksi pada `input-form-client.tsx`
**Files:**
- Modify: `src/components/input-form-client.tsx`
- Test: `tests/input-form.test.tsx` & `tests/design-tokens.test.ts`

- [ ] **Step 1: Terapkan kompresi foto otomatis (maks 500 KB) saat pemilihan & drop foto**
  - Jalankan `compressImageFile` saat foto dimasukkan ke state `docFiles`.
- [ ] **Step 2: Terapkan kompresi otomatis PDF (> 3.0 MB) & validasi berkas non-PDF (> 3.5 MB)**
  - Tampilkan indikator loading saat PDF sedang dioptimalkan.
  - Tampilkan SweetAlert2 informatif jika berkas non-PDF > 3.5 MB atau jika kompresi PDF gagal.
- [ ] **Step 3: Pasang pre-submit check dan safe error handling di `handleSubmit`**
  - Pengecekan total payload sebelum fetch Server Action.
  - Safe error catching: `if (!res) throw new Error(...)`.
- [ ] **Step 4: Jalankan verifikasi design token dan input form**
  - `npx vitest run tests/design-tokens.test.ts tests/input-form.test.tsx`
  - Pastikan 0 pelanggaran token (tidak ada emoji, tidak ada hardcoded hex, tidak ada native alert).

---

### Task 5: Verifikasi Menyeluruh & Build Check (5 Evidence Gates)
**Files:**
- All touched files

- [ ] **Step 1: Jalankan Gate 1 (Lint & Typecheck)**
  - `npm run lint && npm run typecheck`
- [ ] **Step 2: Jalankan Gate 2 (Unit Tests)**
  - `npm test` (seluruh 17+ test suites pass 100%)
- [ ] **Step 3: Jalankan Gate 3 (Local CI)**
  - `npm run ci:local`
- [ ] **Step 4: Jalankan Gate 4 (Production Build)**
  - `npm run build`
- [ ] **Step 5: Verifikasi Gate 5 (DoD & Design Tokens)**
  - Konfirmasi pemenuhan 5 aturan keras token UI dan palet Civic Spectrum.
