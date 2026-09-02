# Perbaikan Format Cetak Laporan Kedinasan & Gambar Lampiran Google Drive

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki tata letak cetak (*print layout*) laporan kedinasan SIMPELGAS agar ringkas, rapi sesuai standar resmi kedinasan Pemkot Surakarta (tidak membengkak hingga 4 halaman), serta memastikan foto dokumentasi dari Google Drive 100% muncul di preview cetak/PDF tanpa kotak kosong.

**Architecture:** 
1. Ekstraksi utilitas URL Google Drive & pemformatan teks ke `src/lib/print-utils.ts` dengan dukungan direct link `lh3.googleusercontent.com` (CORS-friendly, tanpa 302 redirect Google yang terblokir di iframe).
2. Mekanisme Base64 image pre-caching di client sebelum memanggil `window.print()`: gambar di-fetch dan diubah menjadi Data URL Base64 (`data:image/jpeg;base64,...`) sehingga saat HTML di-render ke iframe cetak, gambar sudah 100% berada di memori lokal dan tidak bergantung pada latensi jaringan atau blocking browser saat dialog cetak muncul.
3. Restrukturisasi CSS `@media print` dan HTML laporan:
   - Koreksi margin `@page { size: A4 portrait; margin: 15mm 20mm; }` dan hapus duplikasi `body { padding: 25mm; }`.
   - Hapus pembatasan `page-break-inside: avoid` pada kontainer uraian teks panjang yang sebelumnya memaksa teks melompat ke halaman baru.
   - Kop surat kedinasan standar Disnaker Pemkot Surakarta dengan garis ganda tebal-tipis, tabel data penugasan yang padat rapi, format uraian bernomor (`1.`, `2.`, dsb.) yang rapat, dan grid foto dokumentasi ber-border rapi.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Vitest.

## Global Constraints
- Format cetak harus pas untuk kertas A4 Portrait.
- Laporan penugasan standar harus muat dalam 1–2 halaman (tidak membengkak 4 halaman karena margin berlebih atau pemotongan halaman paksa).
- Gambar dari Google Drive (berbagai variasi URL: `/open?id=`, `/file/d/.../view`, `/uc?id=`) harus diekstrak ID-nya dan berhasil ditampilkan.
- Tidak boleh ada broken layout atau print dialog yang muncul sebelum gambar selesai di-load.
- Seluruh tes unit di Vitest harus tetap passing 100%.

---

### Task 1: Modul Utilitas Cetak & Ekstraksi Gambar (`src/lib/print-utils.ts`) dan Unit Test

**Files:**
- Create: `src/lib/print-utils.ts`
- Create: `tests/print-utils.test.ts`

**Interfaces:**
- Produces:
  - `getDriveFileId(url: string): string | null`
  - `getDriveDirectImageUrl(url: string, width?: number): string | null`
  - `formatRichTextForPrint(text: string): string`
  - `convertImageUrlToBase64(url: string): Promise<string>`

- [ ] **Step 1: Tulis unit test untuk utilitas cetak di `tests/print-utils.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import {
  getDriveFileId,
  getDriveDirectImageUrl,
  formatRichTextForPrint,
} from '@/lib/print-utils'

describe('print-utils', () => {
  describe('getDriveFileId', () => {
    it('extracts ID from ?id= format', () => {
      expect(
        getDriveFileId('https://drive.google.com/open?id=1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT')
      ).toBe('1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT')
    })

    it('extracts ID from /file/d/ format', () => {
      expect(
        getDriveFileId('https://drive.google.com/file/d/1DlNqyLZ3WFTcKNhbNO8oOeBK7CVTYIIF/view?usp=drivesdk')
      ).toBe('1DlNqyLZ3WFTcKNhbNO8oOeBK7CVTYIIF')
    })

    it('returns null for non-drive or invalid urls', () => {
      expect(getDriveFileId('https://example.com/image.png')).toBeNull()
      expect(getDriveFileId('')).toBeNull()
    })
  })

  describe('getDriveDirectImageUrl', () => {
    it('converts drive URL to lh3 direct image URL', () => {
      const driveUrl = 'https://drive.google.com/open?id=1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT'
      expect(getDriveDirectImageUrl(driveUrl, 800)).toBe(
        'https://lh3.googleusercontent.com/d/1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT=w800'
      )
    })

    it('returns original url if already a direct image or supabase', () => {
      const supabaseUrl = 'https://abc.supabase.co/storage/v1/object/public/images/1.jpg'
      expect(getDriveDirectImageUrl(supabaseUrl)).toBe(supabaseUrl)
    })
  })

  describe('formatRichTextForPrint', () => {
    it('formats numbered lists with clean indentation', () => {
      const input = '1. Poin satu\n2. Poin dua'
      const html = formatRichTextForPrint(input)
      expect(html).toContain('<ol')
      expect(html).toContain('<li>Poin satu</li>')
      expect(html).toContain('<li>Poin dua</li>')
    })

    it('formats bullet lists properly', () => {
      const input = '- Item A\n- Item B'
      const html = formatRichTextForPrint(input)
      expect(html).toContain('<ul')
      expect(html).toContain('<li>Item A</li>')
    })

    it('handles empty or dash text gracefully', () => {
      expect(formatRichTextForPrint('')).toBe('-')
      expect(formatRichTextForPrint('-')).toBe('-')
    })
  })
})
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (failing test)**

Jalankan: `npx vitest run tests/print-utils.test.ts`
Ekspektasi: FAIL (module `@/lib/print-utils` not found).

- [ ] **Step 3: Implementasikan fungsi di `src/lib/print-utils.ts`**

```typescript
/**
 * Ekstraksi ID file Google Drive dari berbagai format URL
 */
export function getDriveFileId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  const patterns = [
    /[?&]id=([-\w]+)/,
    /\/file\/d\/([-\w]+)/,
    /\/d\/([-\w]+)/,
    /\/uc\?.*?id=([-\w]+)/,
  ]
  for (const p of patterns) {
    const match = url.match(p)
    if (match && match[1].length >= 10) return match[1]
  }
  return null
}

/**
 * Mengubah URL Google Drive menjadi Direct Image link via lh3.googleusercontent.com
 * Menghindari 302 redirect dan masalah CSP/cookie di iframe cetak.
 */
export function getDriveDirectImageUrl(url: string, width = 800): string | null {
  if (!url) return null
  if (url.includes('.supabase.co/storage/')) return url
  if (url.includes('/presentation/') || url.includes('/document/') || url.includes('/spreadsheets/')) {
    return null
  }
  const id = getDriveFileId(url)
  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}=w${width}`
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return null
}

/**
 * Mengonversi URL gambar menjadi Base64 Data URL di browser
 * agar dokumen iframe bersifat self-contained tanpa delay saat window.print()
 */
export async function convertImageUrlToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(url)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Gagal memuat gambar ke Base64, fallback ke URL langsung:', e)
    return url
  }
}

/**
 * Merapikan teks inputan manual (numbered list, bullet list, paragraf)
 * menjadi HTML terstruktur yang padat dan rapi untuk cetak kedinasan
 */
export function formatRichTextForPrint(text?: string | null): string {
  if (!text || text.trim() === '' || text.trim() === '-') return '-'

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) return '-'

  let html = ''
  let currentListType: 'ol' | 'ul' | null = null

  lines.forEach((line) => {
    // Cek bullet biasa: -, *, •
    const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•')
    // Cek numbered list: 1., 2), 15., dsb
    const numMatch = line.match(/^(\d+)[\.\)]\s*(.*)$/)

    if (numMatch) {
      if (currentListType !== 'ol') {
        if (currentListType === 'ul') html += '</ul>'
        html += '<ol style="margin: 3px 0 6px 0; padding-left: 20px; text-align: justify; line-height: 1.35;">'
        currentListType = 'ol'
      }
      html += `<li style="margin-bottom: 2px;">${numMatch[2]}</li>`
    } else if (isBullet) {
      if (currentListType !== 'ul') {
        if (currentListType === 'ol') html += '</ol>'
        html += '<ul style="margin: 3px 0 6px 0; padding-left: 20px; text-align: justify; line-height: 1.35;">'
        currentListType = 'ul'
      }
      const content = line.substring(1).trim()
      html += `<li style="margin-bottom: 2px;">${content}</li>`
    } else {
      if (currentListType === 'ol') {
        html += '</ol>'
        currentListType = null
      } else if (currentListType === 'ul') {
        html += '</ul>'
        currentListType = null
      }
      html += `<p style="margin: 0 0 4px 0; text-align: justify; line-height: 1.35;">${line}</p>`
    }
  })

  if (currentListType === 'ol') html += '</ol>'
  if (currentListType === 'ul') html += '</ul>'

  return html || '-'
}
```

- [ ] **Step 4: Jalankan test untuk memverifikasi keberhasilan**

Jalankan: `npx vitest run tests/print-utils.test.ts`
Ekspektasi: PASS (semua unit test berhasil).

---

### Task 2: Refactor Layout Cetak & Image Pre-loading di `src/components/cetak-client.tsx`

**Files:**
- Modify: `src/components/cetak-client.tsx`

**Interfaces:**
- Consumes: `getDriveDirectImageUrl`, `convertImageUrlToBase64`, `formatRichTextForPrint` dari `@/lib/print-utils`
- Produces: UI tombol cetak dengan loading state ("Menyiapkan Dokumen & Lampiran..."), iframe cetak dengan styling A4 kedinasan profesional & base64 images embedded.

- [ ] **Step 1: Update implementasi `prosesCetak` di `src/components/cetak-client.tsx`**
1. Tambahkan state `isPrintingId` untuk menandai baris laporan mana yang sedang diproses cetaknya (tampilkan spinner loader pada tombol).
2. Gunakan `getDriveDirectImageUrl` dan `convertImageUrlToBase64` untuk men-download gambar lampiran menjadi Base64 sebelum dokumen iframe dibuat.
3. Ubah template HTML & CSS cetak:
   - `@page { size: A4 portrait; margin: 15mm 20mm; }`
   - Hapus `body { padding: 25mm; }` (mengurangi pemborosan ruang margin hingga 70%).
   - Gunakan font standar kedinasan: `'Times New Roman', Times, serif` dengan ukuran 11pt, `line-height: 1.35`.
   - Kop Surat Resmi: Logo Pemkot Surakarta di kiri, header teks Pemkot & Disnaker di tengah, garis ganda pembatas kedinasan (`border-bottom: 3px double #000;`).
   - Judul Dokumen: `LAPORAN PELAKSANAAN TUGAS` (Center, Underline, Bold, 12pt).
   - Tabel Penugasan: Format tabel rapat 2 kolom tanpa garis luar, label jelas (Nama Pegawai, NIP, Jabatan, Bidang, Nama Kegiatan, Hari/Tanggal, Tempat, Penyelenggara).
   - Uraian Hasil Kegiatan: Tidak menggunakan `page-break-inside: avoid` pada kontainer besar sehingga dapat mengalir secara alami jika melebihi 1 halaman.
   - Grid Dokumentasi: 2 kolom foto dengan max-height 170px, `object-fit: cover`, border halus, dan nomor caption ("Dokumentasi 1", "Dokumentasi 2"). Hanya card foto yang diberi `page-break-inside: avoid;`.
   - Tanda Tangan: Bagian tanda tangan kanan bawah diberi `page-break-inside: avoid;`.
4. Trigger cetak setelah iframe siap:
   ```typescript
   iframe.onload = () => {
     setTimeout(() => {
       iframe.contentWindow?.focus()
       iframe.contentWindow?.print()
       setIsPrintingId(null)
     }, 200)
   }
   ```

- [ ] **Step 2: Jalankan typecheck & build test**

Jalankan: `npm run lint` dan `npx vitest run`
Ekspektasi: Tidak ada TypeScript error atau lint error.

---

### Task 3: Verifikasi Fungsional & Uji Kasus Riil

**Files:**
- Test: `tests/excel-validation.test.ts`
- Test: `tests/print-utils.test.ts`

- [ ] **Step 1: Tambahkan test integrasi data riil di `tests/excel-validation.test.ts`**
Memvalidasi bahwa seluruh URL dokumentasi di Excel (termasuk laporan milik Nilna Qurrotaa'Yun yang bermasalah di screenshot) berhasil diekstrak ID-nya dan menghasilkan Direct URL `lh3.googleusercontent.com`.

- [ ] **Step 2: Jalankan seluruh test suite Vitest**

Jalankan: `npx vitest run`
Ekspektasi: Seluruh tes (16+ tests) lolos tanpa error.
