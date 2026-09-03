# DOM-Based PDF Download Architecture Spec

> Tanggal: 2026-09-03  
> Status: Validated  
> Target: SIMPELGAS v2.1 (Next.js 14 App Router)

---

## 1. Background & Problem Statement

Pada SIMPELGAS saat ini:
1. **Dialog Print Browser Manual**: Menu "Cetak" saat ini memicu `iframe.contentWindow?.print()`, yang membuka dialog print bawaan browser (`window.print()`).
2. **Keterbatasan Format Print Bawaan**:
   - Pengguna harus secara manual memilih opsi "Save as PDF" dan memastikan "Background graphics" tercentang.
   - Margin default browser sering kali memotong header/footer atau mencetak URL halaman (`http://.../cetak`) dan timestamp pada tepi kertas A4.
   - Format dan tata letak tidak konsisten antar browser (Chrome, Firefox, Safari, Edge).
3. **Kebutuhan Pengguna**: Pengguna menghendaki tombol aksi langsung menghasilkan dan mengunduh berkas `.pdf` resmi kedinasan secara otomatis ("donwload pdf saja"), serta menggunakan rendering DOM agar tata letak lembar A4 kedinasan (Kop Surat Pemkot Surakarta, border ganda, tabel metadata, catatan berbutir, grid foto berbingkai, dan blok tanda tangan) tetap rapi, tajam, dan presisi.

---

## 2. Solution Architecture

### 2.1 DOM-to-PDF Engine (`src/lib/pdf-generator.ts`)
Pembangkitan dokumen PDF dilakukan langsung di sisi client (browser) dengan memanfaatkan representasi DOM berstandar A4 yang dikonversi ke PDF menggunakan `jsPDF`:

```
[User Action: Klik "Download PDF"]
       │
       ▼
[SweetAlert2 Loading: "Menyiapkan Dokumen PDF..."]
       │
       ▼
[Preload Assets to Base64 in Parallel]
 ├── Logo Pemkot: fetch('/Pemkot.png') ➔ Base64 Data URL
 └── Foto Dokumentasi: getDirectImageBase64(url) via Server Action ➔ Base64 Data URL
       │
       ▼
[Build Offscreen DOM Container (A4 Width: 794px)]
 ├── Kop Surat Kedinasan (Logo + Teks + Double Border 3px #000)
 ├── Judul Dokumen: LAPORAN HASIL PENUGASAN (Underline, Bold, Center)
 ├── Tabel Rincian Data Pegawai & Kegiatan (Label, Kolon, Nilai)
 ├── Box Catatan Hasil Kegiatan (Rich Text: Indented Numbers, Bullets, Justified Paragraphs)
 ├── Box Arahan/Disposisi Pimpinan (jika ada)
 ├── Grid Foto Dokumentasi (Fixed Aspect Ratio, Border, Caption)
 ├── Daftar Berkas Materi Paparan (Link terstruktur)
 └── Blok Tanda Tangan Pegawai (Sisi Kanan Bawah, page-break-inside: avoid)
       │
       ▼
[Render DOM to PDF using jsPDF (Scale: 2x / 300 DPI)]
 ├── Format: A4 Portrait (210mm x 297mm)
 ├── autoPaging: 'text' / margin preservations
 └── Output: Laporan_Penugasan_[Nama]_[Tanggal].pdf
       │
       ▼
[Cleanup Offscreen DOM & Trigger Download]
       │
       ▼
[SweetAlert2 Success: "Dokumen PDF Berhasil Diunduh!"]
```

### 2.2 Navigasi & Label Antarmuka (UI/UX)
- **Sidebar ([sidebar.tsx](file:///home/disnakerska/Documents/Project/SIMPELGAS/src/components/sidebar.tsx))**:
  - Label: dari `'Cetak'` menjadi `'Download PDF'`.
  - Ikon: dari `Printer` menjadi `FileDown` (dari `lucide-react`).
  - Href: tetap `'/cetak'` untuk mempertahankan stabilitas routing, session guard, dan revalidasi cache.
- **Halaman Cetak/Download ([cetak-client.tsx](file:///home/disnakerska/Documents/Project/SIMPELGAS/src/components/cetak-client.tsx))**:
  - Banner Header: Judul `"Arsip & Download PDF Laporan Penugasan"` dengan ikon `FileDown`.
  - Tombol Aksi Tabel: dari `"Cetak"` menjadi `"Download PDF"` dengan ikon `FileDown` dan status `Loader2` saat proses kompilasi berlangsung.
  - Modal Detail Laporan: tombol dari `"Cetak Lembar Laporan Ini"` menjadi `"Unduh Lembar PDF"` dengan ikon `FileDown`.
- **Dashboard ([dashboard-client.tsx](file:///home/disnakerska/Documents/Project/SIMPELGAS/src/components/dashboard-client.tsx))**:
  - Shortcut link & button: disesuaikan dari "Cetak" menjadi "Download PDF" / "Unduh PDF" dengan ikon `FileDown`.

---

## 3. Global Constraints & Standards

1. **Palet Civic Spectrum & No Emoji**:
   - 0 emoji Unicode di seluruh komponen UI (diverifikasi oleh `tests/design-tokens.test.ts`).
   - 100% ikonografi menggunakan `lucide-react` (`FileDown`, `Eye`, `Loader2`, dll).
   - Dilarang hardcoded hex color di JSX (kecuali stylesheet cetak kedinasan formal di PDF generator).
   - Menggunakan SweetAlert2 untuk dialog loading dan notifikasi keberhasilan/kegagalan.
2. **Kualitas PDF**:
   - Resolusi canvas `scale: 2` untuk memastikan hasil cetak atau pembacaan tajam pada layar retina dan printer fisik (setara 300 DPI).
   - Seluruh gambar (logo dan dokumentasi) wajib inline Base64 agar tidak terkena kendala CORS atau asynchronous image drop saat rendering canvas.
3. **100% Test Passing**:
   - Seluruh test Vitest yang ada wajib tetap lulus.
   - Penambahan unit test untuk generator PDF (`tests/pdf-generator.test.ts`).
   - `npm run ci:local` harus exit code 0.
