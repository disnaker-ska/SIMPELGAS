# Rencana Implementasi: Sistem Error Handling Terpadu & Pelacakan Kode Tiket (Error Reference Code)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mencegah kebocoran pesan teknis bahasa pemrograman (`TypeError`, `c is undefined`, stack traces, atau SQL/Sheets internal error) ke layar pengguna, sekaligus menyediakan pelacakan error yang mudah bagi staf IT/developer melalui Kode Tiket Referensi (`ERR-SPG-XXXX`) dan structured logging `[SIMPELGAS-ERR]`.

**Architecture:** Arsitektur Sanitasi & Pelacakan Error 3 Lapis:
1. *Lapis 1 (Shared Sanitizer & Code Generator):* Modul murni `src/lib/error-handler.ts` yang mengklasifikasikan error (jaringan, payload, autentikasi, server Apps Script, unhandled runtime), menyamarkannya menjadi pesan edukatif ramah ASN, menghasilkan kode tiket acak terstandar (`ERR-SPG-XXXX`), dan mencatat log terstruktur `[SIMPELGAS-ERR][<KODE>]`.
2. *Lapis 2 (Global Error Boundary):* Komponen `src/app/error.tsx` bergaya Civic Spectrum (WCAG AAA, zero emoji) yang menangkap crash render halaman tak terduga dengan tombol *"Coba Lagi"* dan tombol *"Salin Kode Referensi"*.
3. *Lapis 3 (Consumer Handlers):* Form pelaporan ASN (`input-form-client.tsx`), portal pimpinan, dan Server Actions (`actions.ts`) menyajikan SweetAlert2 berformat rapi dengan badge kode tiket referensi tanpa detail bahasa pemrograman.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5, SweetAlert2, Lucide React, Vitest.

---

## Global Constraints

- Wajib mematuhi 5 Aturan Keras Desain Token SIMPELGAS:
  1. DILARANG menggunakan emoticon / emoji Unicode di UI, SweetAlert2, atau Toast.
  2. DILARANG hardcoded hex color (gunakan `DESIGN_TOKENS` atau semantic CSS variables/classes).
  3. DILARANG menggunakan token lama (`navy-*`, `amber-*`).
  4. Wajib 100% ikonografi menggunakan `lucide-react`.
  5. DILARANG dialog bawaan browser (`alert()`, `confirm()`, `prompt()`) — wajib SweetAlert2 (`Swal.fire`).
- Format kode referensi wajib konsisten: `ERR-SPG-[A-Z0-9]{4,5}` (contoh: `ERR-SPG-7K9A`).
- 100% test suite Vitest harus lolos (`npm test` & `npm run ci:local`).

---

## Detailed Implementation Tasks (Bite-Sized)

### Task 1: Buat Modul Sanitasi Error & Generator Kode Tiket (TDD)
**Files:**
- Create: `src/lib/error-handler.ts`
- Create: `tests/error-handler.test.ts`

- [ ] **Step 1: Tulis failing test di `tests/error-handler.test.ts`**
  - Uji format kode acak `generateErrorCode`.
  - Uji sanitasi berbagai tipe error (`TypeError`, network error, string error, generic Error).
  - Pastikan output pesan pengguna bebas dari teks sensitif/bahasa pemrograman.
- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan awal**
  - `npx vitest run tests/error-handler.test.ts`
- [ ] **Step 3: Implementasikan `src/lib/error-handler.ts`**
  - Tulis fungsi generator kode, mapping pesan ramah, dan logger terstruktur `[SIMPELGAS-ERR]`.
- [ ] **Step 4: Jalankan test kembali untuk memverifikasi kelulusan**
  - `npx vitest run tests/error-handler.test.ts`

---

### Task 2: Buat Global Error Boundary Next.js (TDD)
**Files:**
- Create: `src/app/error.tsx`
- Create: `tests/error-boundary.test.tsx`

- [ ] **Step 1: Tulis unit test render di `tests/error-boundary.test.tsx`**
  - Verifikasi bahwa komponen merender tampilan error ramah dengan tombol retry dan kode referensi.
- [ ] **Step 2: Implementasikan `src/app/error.tsx`**
  - Desain elegan sesuai palet Civic Spectrum, WCAG AAA, zero emoji, ikon `lucide-react`.
- [ ] **Step 3: Jalankan test error boundary dan design tokens**
  - `npx vitest run tests/error-boundary.test.tsx tests/design-tokens.test.ts`
  - Pastikan 0 pelanggaran aturan token.

---

### Task 3: Integrasi Error Handling pada Form Input Pelaporan
**Files:**
- Modify: `src/components/input-form-client.tsx`
- Test: `tests/input-form.test.tsx` & `tests/design-tokens.test.ts`

- [ ] **Step 1: Terapkan sanitasi pesan error pada `handleSubmit` di `input-form-client.tsx`**
  - Ganti raw error message dengan format ramah + badge Kode Tiket Referensi di SweetAlert2.
- [ ] **Step 2: Terapkan sanitasi pada fitur AI text enhancement di `enhanceTextWithAI`**
- [ ] **Step 3: Jalankan verifikasi test**
  - `npx vitest run tests/input-form.test.tsx tests/design-tokens.test.ts`

---

### Task 4: Integrasi Logging & Sanitasi pada Server Actions
**Files:**
- Modify: `src/lib/actions.ts`
- Test: `tests/actions.test.ts`

- [ ] **Step 1: Tambahkan test di `tests/actions.test.ts` untuk memverifikasi sanitasi dan error code**
- [ ] **Step 2: Bungkus Server Actions dengan `logSystemError` dan sanitasi error sebelum response**
- [ ] **Step 3: Jalankan test actions**
  - `npx vitest run tests/actions.test.ts`

---

### Task 5: Verifikasi Menyeluruh & Build Check (5 Evidence Gates)
**Files:**
- All touched files

- [ ] **Step 1: Jalankan Gate 1 (Lint & Typecheck)**
  - `npm run lint && npm run typecheck`
- [ ] **Step 2: Jalankan Gate 2 (Unit Tests)**
  - `npm test` (seluruh test suites lolos 100%)
- [ ] **Step 3: Jalankan Gate 3 (Local CI)**
  - `npm run ci:local`
- [ ] **Step 4: Jalankan Gate 4 (Production Build)**
  - `npm run build`
- [ ] **Step 5: Verifikasi Gate 5 (DoD & Design Tokens)**
  - Konfirmasi 0 pelanggaran token UI dan seluruh pesan error ramah ASN.
