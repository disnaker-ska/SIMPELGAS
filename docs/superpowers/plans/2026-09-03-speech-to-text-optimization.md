# Speech-to-Text Optimization & Anti-Duplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki fitur Dikte Suara (Speech-to-Text) agar tidak menghasilkan teks bertumpuk/duplikat kumulatif (*"aku\naku menghadiri\naku menghadiri rapat"*), mendukung *live interim preview* yang responsif, auto-reconnect saat browser hening sesaat di mobile, serta auto-formatting tanda baca lisan dan penomoran poin (*"poin 1" / "poin satu"* -> `\n1. `).

**Architecture:** Memisahkan logika pemrosesan teks suara ke modul `src/lib/speech-formatter.ts` (deduplikasi delta, konversi tanda baca lisan, dan numbering poin bahasa Indonesia). Memperbarui `SpeechToTextController` di `src/lib/use-speech-to-text.ts` dengan *keep-alive auto-restart* dan pemisahan *interim vs final result*. Mengintegrasikan live preview dan penggabungan teks natural (spasi/newline kontekstual) di `input-form-client.tsx` dan `monitoring-internal-client.tsx`.

**Tech Stack:** TypeScript, Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`), React 18, Vitest.

---

## Global Constraints

- **5 Aturan Keras Token UI**: 0 emoji Unicode di UI, 100% `lucide-react`, palet Civic Spectrum semantik (dilarang hardcoded hex `#...`), dilarang dialog browser (`alert`/`confirm`), wajib SweetAlert2.
- **Strict Mode TypeScript**: 0 error `typecheck`.
- **Vitest**: 100% test suites pass, termasuk `tests/speech-to-text.test.ts` dan `tests/design-tokens.test.ts`.
- **Local CI**: `npm run ci:local` wajib Exit Code 0.

---

## Proposed Changes & Tasks

### Task 1: Create Spoken Indonesian Speech Formatter & Deduplication Engine
**Files:**
- Create: `src/lib/speech-formatter.ts`
- Create: `tests/speech-formatter.test.ts`

**Interfaces:**
- `formatSpeechText(raw: string): string`: Mengonversi kata tanda baca lisan (*titik*, *koma*, *tanda tanya*, *tanda seru*, *baris baru/enter*) dan format numbering poin (*poin 1*, *poin satu*, *nomor 1*, *1 titik*) menjadi simbol terstruktur, serta kapitalisasi otomatis.
- `mergeTranscript(baseText: string, newChunk: string): string`: Menggabungkan teks yang sudah ada dengan chunk baru secara cerdas (tidak mengulang jika kumulatif, memberi spasi atau newline sesuai konteks).
- `cleanCumulativeDelta(previousText: string, currentTranscript: string): string`: Mengekstrak selisih teks jika recognizer mengirim akumulasi kalimat.

- [ ] **Step 1: Write failing tests in `tests/speech-formatter.test.ts`**
  Menguji kasus:
  1. Konversi tanda baca: `"rapat selesai titik besok lanjut koma jam sembilan"` -> `"rapat selesai. Besok lanjut, jam sembilan"`
  2. Auto numbering kata: `"poin satu pembahasan anggaran poin dua evaluasi kinerja"` -> `"\n1. Pembahasan anggaran\n2. Evaluasi kinerja"`
  3. Auto numbering angka: `"poin 1 perkenalan nomor 2 inti rapat"` -> `"\n1. Perkenalan\n2. Inti rapat"`
  4. Penggabungan cerdas tanpa duplikasi kumulatif: mencegah pengulangan *"aku"* lalu *"aku menghadiri"*.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/speech-formatter.test.ts` (FAIL).
- [ ] **Step 3: Implement `src/lib/speech-formatter.ts`**
  Implementasi regex cerdas untuk tanda baca bahasa Indonesia, kamus angka kata (*satu* s/d *sepuluh*), parser poin, dan normalizer spasi/kapital.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/speech-formatter.test.ts` (PASS).
- [ ] **Step 5: Commit**
  `git commit -m "feat(speech): add speech formatter with verbal punctuation and auto-numbering"`

---

### Task 2: Enhance `SpeechToTextController` & `useSpeechToText` Hook
**Files:**
- Modify: `src/lib/use-speech-to-text.ts`
- Modify: `tests/speech-to-text.test.ts`

**Interfaces:**
- `SpeechToTextOptions`:
  - `onTranscript?: (finalChunk: string, isFinal: boolean) => void`
  - `onInterim?: (interimText: string) => void`
- `SpeechToTextController`:
  - Flag `desiredListening`: membedakan antara stop manual oleh pengguna vs hening sesaat yang memicu `onend` dari browser.
  - Auto-restart listener saat `onend` terjadi jika `desiredListening === true`.
  - Parsing terpisah antara `item.isFinal` dan interim results.

- [ ] **Step 1: Update tests in `tests/speech-to-text.test.ts` to reflect enhanced behavior**
  Tambahkan test case:
  1. Memisahkan event interim dan final.
  2. Auto-restart saat `onend` terjadi tanpa pemanggilan `stop()`.
  3. `stop()` menghentikan auto-restart dengan benar.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/speech-to-text.test.ts` (FAIL).
- [ ] **Step 3: Update `src/lib/use-speech-to-text.ts`**
  Implementasikan logika `desiredListening`, auto-reconnect debounce, dan callback `onInterim`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/speech-to-text.test.ts` (PASS).
- [ ] **Step 5: Commit**
  `git commit -m "feat(speech): enhance speech controller with auto-restart and interim callback"`

---

### Task 3: Integrate Enhanced Dictation into Form Components
**Files:**
- Modify: `src/components/input-form-client.tsx:296-316`
- Modify: `src/components/monitoring-internal-client.tsx:110-130`

**Interfaces:**
- Menggunakan `mergeTranscript` dan `formatSpeechText` saat `onTranscript` menerima chunk final.
- Menampilkan live visual state di textarea (atau interim badge) saat berbicara tanpa merusak teks yang sudah diketik sebelumnya.
- Penyambungan teks yang natural (spasi untuk kalimat bersambung, newline untuk poin baru).

- [ ] **Step 1: Update `input-form-client.tsx`**
  Ganti penggabungan primitif `trimmed ? \`${trimmed}\\n\${chunk}\` : chunk` dengan `mergeTranscript(prev, formatSpeechText(chunk))`.
  Tambahkan state `interimNote` untuk live feedback visual saat pengguna berbicara.
- [ ] **Step 2: Update `monitoring-internal-client.tsx`**
  Terapkan integrasi serupa untuk field Hasil Kegiatan (`hasilText`).
- [ ] **Step 3: Verify with component tests**
  Run: `npx vitest run tests/input-form.test.tsx tests/speech-to-text.test.ts` (PASS).
- [ ] **Step 4: Commit**
  `git commit -m "feat(ui): integrate speech formatter and live interim preview into form components"`

---

### Task 4: Full CI/CD & 5 Evidence Gates Verification
**Files:**
- Test: All suites (`npm test`, `npm run ci:local`)

- [ ] **Step 1: Run Gate 1 (Lint & Typecheck)**
  Run: `npm run lint && npm run typecheck`
- [ ] **Step 2: Run Gate 2 (Vitest Full Suite including Design Tokens)**
  Run: `npm test`
- [ ] **Step 3: Run Gate 3 (Local CI)**
  Run: `npm run ci:local`
- [ ] **Step 4: Commit**
  `git commit -m "chore: verify speech-to-text optimization with 100% CI pass"`
