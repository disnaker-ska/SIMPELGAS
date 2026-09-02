# Panduan Penggelaran (Deployment Guide)
# SIMPELGAS — Sistem Monitoring Penugasan & Laporan Kegiatan ASN
### Dinas Tenaga Kerja Kota Surakarta

---

Dokumen ini menjelaskan prosedur lengkap penggelaran (*deployment*) aplikasi **SIMPELGAS** ke lingkungan produksi menggunakan platform **Vercel** sebagai hosting Next.js dan **Google Apps Script** sebagai backend engine.

---

## 1. Prasyarat Sebelum Deploy

Pastikan seluruh item berikut sudah terpenuhi sebelum memulai proses deployment:

- [ ] Akun Vercel aktif (gunakan `vercel.com`, bisa login via GitHub/GitLab).
- [ ] Repository kode SIMPELGAS sudah di-push ke GitHub atau GitLab.
- [ ] File `code.gs` sudah ter-deploy sebagai Google Apps Script Web App (lihat seksi 2).
- [ ] Semua nilai environment variable sudah siap (lihat `TECH_STACK.md` §3).
- [ ] `npm run ci:local` lolos tanpa error di mesin lokal.

---

## 2. Deploy Google Apps Script Web App (`code.gs`)

Backend serverless SIMPELGAS berjalan di Google Apps Script. Lakukan langkah ini **sekali** di awal, atau setiap kali ada perubahan pada `code.gs`:

1. Buka [script.google.com](https://script.google.com) dan login dengan akun Google Workspace resmi dinas.
2. Buat project baru atau buka project yang sudah ada.
3. Salin seluruh isi file `code.gs` dari repository ke editor Apps Script.
4. Klik **Deploy → New Deployment**.
5. Atur konfigurasi:
   - **Type**: Web App.
   - **Execute as**: `Me (pemilik akun dinas)`.
   - **Who has access**: `Anyone`.
6. Klik **Deploy** dan salin URL Web App yang dihasilkan (format: `https://script.google.com/macros/s/AKfycbx.../exec`).
7. Simpan URL ini — akan digunakan sebagai nilai `APPSCRIPT_URL` di Vercel.

> **⚠️ Penting**: Setiap kali `code.gs` diubah, buat **deployment baru** (bukan update deployment lama) dan perbarui URL di environment variable Vercel jika berubah.

---

## 3. Setup Google Spreadsheet & Google Drive

1. Buat Google Spreadsheet baru di akun dinas.
2. Buat dua sheet dengan nama persis:
   - `DATA_PEGAWAI` — kolom: `NIP`, `Nama Pegawai`, `Bidang / Unit Kerja`, `Jabatan`.
   - `REKAP_LAPORAN` — kolom sesuai spesifikasi di `PRD-SIMPELGAS.md §5.1`.
3. Buat folder di Google Drive untuk penyimpanan file laporan.
4. Salin **Folder ID** dari URL folder Drive (`https://drive.google.com/drive/folders/{FOLDER_ID}`).
5. Masukkan Folder ID ke konstanta `PARENT_FOLDER_ID` di `code.gs` sebelum deploy Apps Script.

---

## 4. Deploy ke Vercel

### 4.1 Import Repository

1. Login ke [vercel.com](https://vercel.com).
2. Klik **Add New → Project**.
3. Pilih repository GitHub/GitLab SIMPELGAS.
4. Vercel otomatis mendeteksi framework **Next.js** — konfirmasi setting default.

### 4.2 Konfigurasi Environment Variables

Di halaman konfigurasi project Vercel, tambahkan seluruh environment variable berikut (**tanpa** prefiks `NEXT_PUBLIC_`):

| Nama Variable | Nilai | Keterangan |
| :--- | :--- | :--- |
| `APPSCRIPT_URL` | `https://script.google.com/macros/s/.../exec` | URL Web App Apps Script dari langkah 2 |
| `GEMINI_API_KEY` | `AIzaSy...` | Kunci API dari [Google AI Studio](https://aistudio.google.com/) |
| `PIN_KEPALA_DINAS` | `******` | PIN 6 digit numerik |
| `PIN_SEKRETARIS` | `******` | PIN 6 digit numerik |
| `PIN_KASUBAG_PERKEU` | `******` | PIN 6 digit numerik |
| `PIN_KASUBAG_AKO` | `******` | PIN 6 digit numerik |
| `PIN_KABID_PPTK` | `******` | PIN 6 digit numerik |
| `PIN_KABID_HI` | `******` | PIN 6 digit numerik |

### 4.3 Deploy

1. Klik **Deploy**.
2. Vercel menjalankan `npm run build` secara otomatis.
3. Setelah selesai, aplikasi tersedia di URL `https://<nama-project>.vercel.app`.

---

## 5. Verifikasi Pasca-Deploy

Jalankan checklist berikut setelah deployment berhasil:

- [ ] Buka URL Vercel, pastikan halaman `/dashboard` dapat dimuat tanpa error.
- [ ] Buka `/input`, isi form lengkap dengan foto dan kirim — verifikasi data masuk ke Google Spreadsheet sheet `REKAP_LAPORAN`.
- [ ] Buka `/pimpinan/login`, login dengan salah satu PIN — verifikasi filter scope jabatan bekerja.
- [ ] Buka `/cetak`, cari laporan yang memiliki foto — verifikasi foto muncul di preview cetak (tidak broken image).
- [ ] Cek Vercel Dashboard → Logs → tidak ada runtime error 500.

---

## 6. Update Deployment (Continuous Deployment)

Vercel secara otomatis men-trigger build baru setiap kali ada **push ke branch `main`**. Alur kerja standard:

```
Pengembang → git push origin main → Vercel Build → Deploy Otomatis
```

Untuk branch lain (fitur / bugfix), Vercel membuat **Preview Deployment** terpisah dengan URL unik, sehingga perubahan dapat diuji sebelum di-merge ke `main`.

---

## 7. Rollback Deployment

Jika deployment baru menyebabkan masalah:

1. Buka Vercel Dashboard → Project → Deployments.
2. Temukan deployment sebelumnya yang stabil.
3. Klik **... → Promote to Production**.

Rollback selesai dalam hitungan detik tanpa downtime.

---

## 8. Domain Kustom (Opsional)

Untuk menggunakan domain resmi dinas (misal: `simpelgas.surakarta.go.id`):

1. Vercel Dashboard → Project → Settings → Domains.
2. Tambahkan domain kustom.
3. Ikuti instruksi Vercel untuk menambahkan record DNS (`CNAME` atau `A`) di panel pengelola domain instansi.
4. Vercel secara otomatis menerbitkan sertifikat SSL (Let's Encrypt) untuk domain tersebut.
