# Spesifikasi Desain: Migrasi Backend SIMPELGAS ke Google Apps Script & Google Drive

## 1. Konteks & Tujuan
SIMPELGAS versi modern dibangun dengan Next.js 14 (App Router), Tailwind CSS, dan TypeScript. Sebelumnya proyek ini disiapkan untuk menggunakan Supabase (PostgreSQL & Supabase Storage). Pengguna menginginkan sistem kembali menggunakan backend Google Apps Script (`code.gs`) yang terhubung dengan Google Spreadsheet sebagai basis data dan Google Drive sebagai penyimpanan berkas (foto/dokumen kegiatan).

Pengguna sudah memiliki:
1. File Google Apps Script Web App yang sudah aktif (`code.gs`).
2. Google Spreadsheet dengan sheet:
   - `DATA_PEGAWAI` (Kolom: `NIP`, `Nama Pegawai`, `Bidang / Unit Kerja`, `Jabatan`)
   - `REKAP_LAPORAN` (Kolom sesuai `code.gs`: `Nama Pegawai`, `Bidang`, `Jenis Penugasan`, `Tanggal Kegiatan`, `Nama Kegiatan`, `Tempat Kegiatan`, `Penyelenggara Kegiatan`, `Tamu Undangan yang Hadir`, `Catatan Hasil Kegiatan`, `Dokumentasi Kegiatan`, `Materi (Jika Ada)`, `Status Tindak Lanjut`, `Catatan Pimpinan`)
3. Google Drive folder (`PARENT_FOLDER_ID`) untuk menyimpan lampiran.

Aplikasi Next.js harus 100% kompatibel dengan kontrak `code.gs` tanpa mengubah kode Apps Script yang sudah berjalan.

---

## 2. Keputusan Desain (Hasil /grill-me)
1. **Arsitektur**: Next.js 14 tetap dipertahankan sebagai frontend modern, SSR/RSC, dan API proxy. Server Actions memanggil URL Web App Apps Script (`APPSCRIPT_URL`).
2. **Cakupan Fitur**: Fokus pada **Laporan Penugasan Pegawai (`REKAP_LAPORAN`)** dan **Master Pegawai (`DATA_PEGAWAI`)**. Fitur Monitoring Internal ditiadakan/dinonaktifkan.
3. **Pembersihan Supabase**: Menghapus total ketergantungan dan modul Supabase (`src/lib/supabase.ts`, `@supabase/supabase-js`, dan konfigurasi env Supabase) untuk menghindari error runtime `supabaseUrl is required`.
4. **Pengaturan Environment**: Menggunakan variabel `APPSCRIPT_URL` di `.env` (server-side only, aman).
5. **Penanganan Berkas**: Berkas gambar/dokumen dikonversi ke Base64 di client dan dikirim bersama data formulir langsung ke `doPost` Apps Script, yang kemudian otomatis menyimpannya ke Google Drive melalui `saveFilesToDrive()`.

---

## 3. Arsitektur Komunikasi & Alur Data

```
+-----------------------------------------------------------+
|                      Browser Client                       |
|  - Input Form (kompresi gambar -> Base64)                 |
|  - Dashboard (tampilan statistik, filter, tabel)          |
|  - Cetak (PDF / Excel export)                             |
|  - Pimpinan (evaluasi status & catatan)                   |
+-----------------------------+-----------------------------+
                              |
                     Server Actions / RSC
                              |
                              v
+-----------------------------------------------------------+
|                     Next.js 14 Server                     |
|  - src/lib/appscript.ts (Adapter, Mapper, Fetch Client)   |
|  - src/lib/actions.ts (Server Actions)                    |
|  - Mengikuti redirect 302 dari Google Apps Script         |
+-----------------------------+-----------------------------+
                              |
                HTTP GET / POST (JSON Payload)
                              |
                              v
+-----------------------------------------------------------+
|               Google Apps Script Web App                  |
|                    (URL: APPSCRIPT_URL)                   |
|  - doGet(e): action=getPegawai, getLaporan, updatePimpinan|
|  - doPost(e): simpan file ke Drive + append ke Sheet      |
+-----------------------------+-----------------------------+
                              |
               +--------------+--------------+
               |                             |
               v                             v
+-----------------------------+ +---------------------------+
|     Google Spreadsheet      | |       Google Drive        |
|  - DATA_PEGAWAI             | |  - Folder Dokumentasi     |
|  - REKAP_LAPORAN            | |  - Folder Materi          |
+-----------------------------+ +---------------------------+
```

---

## 4. Rincian Antarmuka & Pemetaan Data

### 4.1 Master Pegawai (`getPegawai`)
* **Request**: `GET ${APPSCRIPT_URL}?action=getPegawai`
* **Response Apps Script**: `{ status: "success", data: Array<{ [header: string]: any }> }`
* **Mapping ke `Pegawai`**:
  * `id`: `item['NIP'] || String(item['Nama Pegawai'])`
  * `nama`: `item['Nama Pegawai'] || item['Nama']`
  * `nip`: `item['NIP'] || null`
  * `bidang`: `item['Bidang / Unit Kerja'] || item['Bidang']`
  * `jabatan`: `item['Jabatan'] || ''`
  * `is_active`: `true`

### 4.2 Rekap Laporan (`getLaporan` & `getAllLaporan`)
* **Request**: `GET ${APPSCRIPT_URL}?action=getLaporan[&nama=...]`
* **Response Apps Script**: `{ status: "success", data: Array<{ Row_Index: number, ... }> }`
* **Mapping ke `Laporan`**:
  * `id`: `String(item['Row_Index'])`
  * `pegawai_id`: `String(item['Nama Pegawai'])`
  * `bidang`: `item['Bidang'] || ''`
  * `jabatan`: `item['Jabatan'] || null`
  * `jenis_penugasan`: `item['Jenis Penugasan'] || ''`
  * `tanggal_kegiatan`: Konversi `DD/MM/YYYY` (dari Apps Script) ke `YYYY-MM-DD` agar kompatibel dengan JavaScript `new Date()` dan filter antarmuka.
  * `nama_kegiatan`: `item['Nama Kegiatan'] || ''`
  * `tempat_kegiatan`: `item['Tempat Kegiatan'] || ''`
  * `penyelenggara`: `item['Penyelenggara Kegiatan'] || ''`
  * `tamu_undangan`: `item['Tamu Undangan yang Hadir'] || null`
  * `catatan_hasil`: `item['Catatan Hasil Kegiatan'] || null`
  * `dokumentasi_urls`: `item['Dokumentasi Kegiatan'] ? item['Dokumentasi Kegiatan'].split('\n').filter(Boolean) : []`
  * `materi_urls`: `item['Materi (Jika Ada)'] ? item['Materi (Jika Ada)'].split('\n').filter(Boolean) : []`
  * `status_tindak_lanjut`: `item['Status Tindak Lanjut'] || 'Untuk Diketahui'`
  * `catatan_pimpinan`: `item['Catatan Pimpinan'] || null`
  * `pegawai`: `{ id: ..., nama: item['Nama Pegawai'], bidang: item['Bidang'], jabatan: item['Jabatan'] || '' }`

### 4.3 Submit Laporan Baru (`submitLaporan`)
* **Request**: `POST ${APPSCRIPT_URL}` (Payload JSON):
  ```json
  {
    "namaPegawai": "Budi Santoso",
    "bidang": "BIDANG PPTK",
    "jenisPenugasan": "Luar Daerah",
    "tanggalKegiatan": "2026-09-02",
    "namaKegiatan": "Koordinasi Pelatihan Vokasi",
    "tempatKegiatan": "Semarang",
    "penyelenggara": "Disnakertrans Prov Jateng",
    "tamuUndangan": "Para Kabid PPTK se-Jateng",
    "catatanHasil": "Hasil koordinasi...",
    "dokumentasi": [{ "base64": "...", "name": "foto1.jpg", "mime": "image/jpeg" }],
    "materi": [{ "base64": "...", "name": "paparan.pdf", "mime": "application/pdf" }]
  }
  ```
* **Response**: `{ status: "success" }`

### 4.4 Evaluasi Pimpinan (`updateEvaluasiPimpinan`)
* **Request**: `GET ${APPSCRIPT_URL}?action=updatePimpinan&row={rowIndex}&status={encodeURIComponent(status)}&catatan={encodeURIComponent(catatan)}`
* **Response**: `{ status: "success" }`
* Catatan pimpinan akan diformat di server Next.js dengan menambahkan catatan baru ke catatan sebelumnya:
  `[${roleName}]: ${catatanBaru}`

---

## 5. Konfigurasi Sistem
1. `next.config.js`:
   * Tambahkan `serverActions: { bodySizeLimit: '10mb' }` agar Next.js dapat memproses payload gambar Base64 tanpa batas 1MB default.
2. `.env` & `.env.example`:
   * Tambahkan `APPSCRIPT_URL=https://script.google.com/macros/s/.../exec`.
   * Hapus variabel `NEXT_PUBLIC_SUPABASE_*` dan `SUPABASE_SERVICE_ROLE_KEY`.
3. `package.json`:
   * Uninstall `@supabase/supabase-js`.
