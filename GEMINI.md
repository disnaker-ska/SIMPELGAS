# GEMINI.md — Instruksi Khusus Antigravity Agent untuk SIMPELGAS
> Dibaca oleh: Antigravity (Google Deepmind AI Coding Agent)
> Terakhir diperbarui: 2026-09-02

---

> **Catatan:** File ini adalah suplemen dari [`AGENTS.md`](AGENTS.md). Baca `AGENTS.md` terlebih dahulu untuk konteks proyek umum. File ini berisi instruksi khusus untuk fitur dan workflow Antigravity.

---

## 1. Sesi Baru: Langkah Pertama Wajib

Setiap kali memulai sesi baru di repo ini, lakukan **dalam urutan ini**:

```
1. list_projects (codebase-memory-mcp)
   → Konfirmasi project SIMPELGAS terdaftar dan generasi indexnya.

2. index_status (codebase-memory-mcp)
   → Cek apakah index masih segar atau perlu di-refresh.

3. Jika index stale/missing → jalankan index_repository terlebih dahulu.

4. Baca AGENTS.md untuk konteks proyek.

5. Baru mulai task.
```

---

## 2. Cara Gunakan MCP codebase-memory-mcp (Prioritaskan Ini)

Selalu gunakan MCP graph tools **sebelum** grep/glob/file-search untuk eksplorasi kode.

### Urutan Prioritas Tool

| Prioritas | Tool | Kapan Digunakan |
|:---:|---|---|
| 1 | `search_graph` | Cari fungsi, class, route, variabel berdasarkan nama/pattern |
| 2 | `trace_path` | Lacak siapa yang memanggil fungsi, atau apa yang dipanggil fungsi |
| 3 | `get_code_snippet` | Baca source code fungsi/class spesifik |
| 4 | `check_index_coverage` | Validasi apakah path sudah terindeks sebelum klaim negatif |
| 5 | `query_graph` | Cypher query untuk pola kompleks |
| 6 | `get_architecture` | Ringkasan high-level proyek |

### Contoh Query untuk Proyek Ini

```python
# Cari Server Action
search_graph(name_pattern=".*submitLaporan.*")
search_graph(name_pattern=".*updateEvaluasi.*")

# Cari siapa yang memanggil adapter Apps Script
trace_path(function_name="fetchLaporanFromAppsScript", direction="inbound")

# Baca source action spesifik
get_code_snippet(qualified_name="src/lib/actions.submitLaporan")

# Cari semua Server Actions
query_graph(cypher="MATCH (f:Function) WHERE f.file CONTAINS 'actions.ts' RETURN f.name")

# Cari semua Client Components
search_graph(name_pattern=".*-client.*")
```

### Fallback ke grep (Kapan Boleh)
Gunakan grep/ripgrep hanya untuk:
- Mencari string literal atau pesan error spesifik
- Mencari nilai config atau env var
- Ketika MCP tools tidak menemukan hasil yang cukup

---

## 3. Skills yang Tersedia di Proyek Ini

Skill tersimpan di `.agents/skills/`. Gunakan skill yang sesuai sebelum memulai task terkait:

| Skill | Lokasi | Kapan Digunakan |
|---|---|---|
| `hallmark` | `.agents/skills/hallmark/SKILL.md` | Membuat/redesign halaman UI — wajib baca sebelum touch komponen visual |
| `speckit-specify` | `.agents/skills/speckit-specify/SKILL.md` | Membuat spesifikasi fitur baru dari deskripsi natural language |
| `speckit-plan` | `.agents/skills/speckit-plan/SKILL.md` | Membuat implementation plan dari spec |
| `speckit-tasks` | `.agents/skills/speckit-tasks/SKILL.md` | Memecah plan menjadi tasks.md yang actionable |
| `speckit-implement` | `.agents/skills/speckit-implement/SKILL.md` | Mengeksekusi tasks.md |
| `speckit-analyze` | `.agents/skills/speckit-analyze/SKILL.md` | Analisis konsistensi antar artifact spec/plan/tasks |
| `speckit-converge` | `.agents/skills/speckit-converge/SKILL.md` | Identifikasi gap antara codebase dan spec |
| `speckit-clarify` | `.agents/skills/speckit-clarify/SKILL.md` | Klarifikasi ambiguitas dalam spec |
| `speckit-checklist` | `.agents/skills/speckit-checklist/SKILL.md` | Generate checklist custom untuk fitur |

**Cara membaca skill:**
```
view_file(path=".agents/skills/<nama-skill>/SKILL.md")
```

---

## 4. Workflow Spesifik Antigravity untuk Proyek Ini

### 4.1 Workflow: Tambah Fitur Baru
```
1. speckit-specify → buat spec.md di docs/superpowers/specs/
2. speckit-plan    → buat plan.md
3. speckit-tasks   → buat tasks.md
4. speckit-analyze → verifikasi konsistensi
5. speckit-implement → eksekusi tasks satu per satu
6. npm run ci:local  → verifikasi 5 Evidence Gates
```

### 4.2 Workflow: Modifikasi Komponen UI
```
1. Baca hallmark skill terlebih dahulu
2. Gunakan palet Civic Spectrum (SSoT: src/lib/design-tokens.ts & globals.css)
3. Patuhi 5 Aturan Keras UI:
   - DILARANG menggunakan emoticon/emoji di UI (gunakan lucide-react)
   - DILARANG hardcoded hex color (gunakan semantic CSS variable / DESIGN_TOKENS)
   - DILARANG token usang (navy-*, amber-*)
   - WAJIB gunakan ikon dari 'lucide-react'
   - DILARANG alert()/confirm() bawaan browser (gunakan SweetAlert2 / Toast)
4. Pastikan responsif: mobile-first (sm → md → lg breakpoints)
5. Verifikasi: jalankan `npx vitest run tests/design-tokens.test.ts`
```

### 4.3 Workflow: Bug Fix di appscript.ts / actions.ts
```
1. search_graph untuk menemukan fungsi terdampak
2. trace_path(direction="inbound") untuk tahu semua pemanggil
3. Tulis test case yang mereproduksi bug SEBELUM fix
4. Fix implementasi
5. npm run ci:local
```

### 4.4 Workflow: Perubahan code.gs (Google Apps Script)
```
⚠️  HATI-HATI — Perubahan code.gs mempengaruhi data produksi.

1. Baca PRD-SIMPELGAS.md §5.2 untuk memahami kontrak API saat ini
2. Perubahan pada doPost() HARUS sinkron dengan:
   - Kolom REKAP_LAPORAN di Spreadsheet
   - Payload di submitLaporan() (actions.ts)
   - Mapper di mapLaporanData() (appscript.ts)
3. Test manual di lingkungan dev sebelum deploy ke produksi
4. Update CHANGELOG.md setelah perubahan
```

---

## 5. Konteks Penting untuk AI Agent

### Hal yang Membuat Proyek Ini Unik
1. **Tidak ada DB konvensional** — semua data via HTTP ke Google Apps Script → Spreadsheet
2. **HTTP 302 Redirect wajib diikuti** — Apps Script selalu redirect sebelum return response
3. **POST body harus `text/plain`** — bukan JSON — untuk bypass CORS preflight
4. **Gambar dari Drive harus di-proxy via server** — `getDirectImageBase64()` di actions.ts — sebelum disematkan di iframe cetak
5. **Nama pegawai bisa bervariasi gelar** — selalu gunakan `normalizePersonName()` untuk matching
6. **Tanggal dari Sheets = DD/MM/YYYY** — selalu konversi dengan `parseSheetDate()`

### Batasan Arsitektur yang Tidak Boleh Diubah
- Cookie sesi pimpinan: `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 28800` (8 jam)
- Rute `/pimpinan/*` diproteksi di `src/middleware.ts` (edge level)
- Body size limit Server Action = 10MB (di `next.config.js`)
- Foto kompresi klien: max 1200px sisi terpanjang, JPEG 70%

---

## 6. Environment Variables (Referensi Cepat)

| Variable | Scope | Fungsi |
|---|---|---|
| `APPSCRIPT_URL` | Server only | URL Web App Google Apps Script |
| `GEMINI_API_KEY` | Server only | Google AI Studio API Key |
| `PIN_KEPALA_DINAS` | Server only | PIN login Kepala Dinas |
| `PIN_SEKRETARIS` | Server only | PIN login Sekretaris Dinas |
| `PIN_KASUBAG_PERKEU` | Server only | PIN login Kasubag Perkeu |
| `PIN_KASUBAG_AKO` | Server only | PIN login Kasubag AKO |
| `PIN_KABID_PPTK` | Server only | PIN login Kabid PPTK |
| `PIN_KABID_HI` | Server only | PIN login Kabid Hubungan Industrial |

> **Aturan keras**: Tidak ada variable di atas yang boleh memiliki prefix `NEXT_PUBLIC_`.

---

## 7. Indikator Kualitas Kode

Jalankan ini sebelum setiap sesi selesai:

```bash
npm run ci:local
# Harus exit code 0 — tidak ada kompromi
```

Jika ada gate yang gagal:
- **lint error** → fix ESLint error dulu, baru lanjut
- **typecheck error** → jangan gunakan `any` sebagai shortcut — definisikan tipe yang benar
- **test fail** → jangan skip test atau ubah assertion agar pass — fix logikanya
- **build fail** → periksa hydration error dan Server Component boundary

---

## 8. Referensi Silang

| Kebutuhan | Dokumen |
|---|---|
| Memahami sistem secara menyeluruh | [`docs/DOKUMEN_REFERENSI_TEKNIS/ARCHITECTURE.md`](docs/DOKUMEN_REFERENSI_TEKNIS/ARCHITECTURE.md) |
| Kontrak API Apps Script (payload JSON) | [`docs/DOKUMEN_REFERENSI_TEKNIS/PRD-SIMPELGAS.md`](docs/DOKUMEN_REFERENSI_TEKNIS/PRD-SIMPELGAS.md) §5.2 |
| Konvensi kode & struktur folder | [`docs/DOKUMEN_REFERENSI_TEKNIS/CODING_STANDARD.md`](docs/DOKUMEN_REFERENSI_TEKNIS/CODING_STANDARD.md) |
| Palet warna & token UI | [`docs/DOKUMEN_REFERENSI_TEKNIS/UIUX_DESIGN.md`](docs/DOKUMEN_REFERENSI_TEKNIS/UIUX_DESIGN.md) |
| Kriteria selesai (DoD) | [`docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md`](docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md) |
| Cara deploy ke Vercel | [`docs/DOKUMEN_REFERENSI_TEKNIS/DEPLOYMENT.md`](docs/DOKUMEN_REFERENSI_TEKNIS/DEPLOYMENT.md) |
| Setup lokal pertama kali | [`docs/DOKUMEN_REFERENSI_TEKNIS/ONBOARDING.md`](docs/DOKUMEN_REFERENSI_TEKNIS/ONBOARDING.md) |
| Riwayat perubahan versi | [`docs/DOKUMEN_REFERENSI_TEKNIS/CHANGELOG.md`](docs/DOKUMEN_REFERENSI_TEKNIS/CHANGELOG.md) |
