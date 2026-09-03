# DOM-Based PDF Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti fitur Cetak dengan Download PDF langsung berbasis DOM yang mempertahankan format kedinasan resmi A4 dan mengunduh berkas PDF secara otomatis.

**Architecture:** Pembangkitan PDF dilakukan langsung di browser menggunakan `jsPDF` dan `html2canvas` dari representasi DOM A4 yang terisolasi. Seluruh gambar (logo Pemkot dan foto kegiatan Google Drive) dikonversi ke Base64 terlebih dahulu untuk mencegah isu CORS dan menjamin hasil cetak tajam (skala 2x / 300 DPI) tanpa mengandalkan dialog print browser bawaan (`window.print()`).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, jsPDF, html2canvas, Lucide React, SweetAlert2, Vitest.

**Spec:** docs/superpowers/specs/2026-09-03-dom-to-pdf-download-design.md

## Global Constraints

- Wajib 100% mematuhi 5 Aturan Keras Desain Token (0 emoji, no hardcoded hex di JSX, 100% lucide-react, no deprecated tokens, SweetAlert2 untuk notifikasi).
- Seluruh 13 test suites Vitest yang ada wajib tetap 100% lulus.
- Endpoint dan skema backend Google Apps Script (`code.gs`) tidak boleh diubah.
- `npm run ci:local` harus exit code 0 (Lint, Typecheck, Test, Build).

---

### Task 1: DOM Template & PDF Generator Utility

**Files:**
- Create: `src/lib/pdf-generator.ts`
- Test: `tests/pdf-generator.test.ts`

**Interfaces:**
- Consumes:
  - `Laporan`, `Pegawai` from `src/lib/types.ts`
  - `formatRichTextForPrint` from `src/lib/print-utils.ts`
  - `getDirectImageBase64` from `src/lib/actions.ts`
- Produces:
  - `generateLaporanPDF(laporan: Laporan, targetPegawai?: Pegawai | null): Promise<void>`
  - `buildLaporanHTML(laporan: Laporan, targetPegawai?: Pegawai | null, base64Logo?: string, base64Images?: { src: string; isDoc: boolean }[]): string`
  - `sanitizeFilename(name: string): string`

- [ ] **Step 1: Write the failing test for PDF generator helpers**

Buat file `tests/pdf-generator.test.ts` untuk menguji pembentukan nama file dan struktur HTML dokumen kedinasan:

```typescript
import { describe, it, expect } from 'vitest'
import { sanitizeFilename, buildLaporanHTML } from '@/lib/pdf-generator'
import type { Laporan, Pegawai } from '@/lib/types'

const mockPegawai: Pegawai = {
  id: 'peg-1',
  nama: 'Budi Santoso, S.Kom',
  nip: '198501012010011001',
  bidang: 'Sekretariat',
  jabatan: 'Pranata Komputer Ahli Muda',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const mockLaporan: Laporan = {
  id: 'lap-1',
  pegawai_id: 'peg-1',
  bidang: 'Sekretariat',
  jabatan: 'Pranata Komputer Ahli Muda',
  jenis_penugasan: 'Rapat Koordinasi',
  tanggal_kegiatan: '2026-09-01',
  nama_kegiatan: 'Rapat Koordinasi Integrasi SIMPELGAS',
  tempat_kegiatan: 'Ruang Rapat Disnaker',
  penyelenggara: 'Disnaker Kota Surakarta',
  tamu_undangan: 'Perwakilan Bidang',
  catatan_hasil: '1. Penyelarasan alur kerja pelaporan.\n2. Verifikasi dokumen.',
  dokumentasi_urls: ['https://drive.google.com/open?id=foto1'],
  materi_urls: ['https://drive.google.com/open?id=materi1'],
  status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
  catatan_pimpinan: 'Lanjutkan koordinasi teknis.',
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-09-01T09:00:00Z',
  pegawai: mockPegawai,
}

describe('PDF Generator Helpers', () => {
  it('sanitizes filename correctly without illegal filesystem characters', () => {
    expect(sanitizeFilename('Budi Santoso, S.Kom/M.Cs')).toBe('Budi_Santoso_S_Kom_M_Cs')
    expect(sanitizeFilename('Test: File * Name?')).toBe('Test_File_Name')
  })

  it('builds official A4 kedinasan HTML structure containing Kop Surat and metadata', () => {
    const html = buildLaporanHTML(mockLaporan, mockPegawai, 'data:image/png;base64,mockLogo', [
      { src: 'data:image/jpeg;base64,mockImg', isDoc: false },
    ])

    expect(html).toContain('PEMERINTAH KOTA SURAKARTA')
    expect(html).toContain('DINAS TENAGA KERJA')
    expect(html).toContain('LAPORAN HASIL PENUGASAN')
    expect(html).toContain('Budi Santoso, S.Kom')
    expect(html).toContain('198501012010011001')
    expect(html).toContain('Rapat Koordinasi Integrasi SIMPELGAS')
    expect(html).toContain('Arahan / Disposisi Pimpinan:')
    expect(html).toContain('Lanjutkan koordinasi teknis.')
    expect(html).toContain('Dokumentasi Kegiatan:')
    expect(html).toContain('Pegawai yang Melaporkan,')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pdf-generator.test.ts`  
Expected: FAIL with "Cannot find module '@/lib/pdf-generator'"

- [ ] **Step 3: Implement `src/lib/pdf-generator.ts`**

Buat file `src/lib/pdf-generator.ts`:

```typescript
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { formatRichTextForPrint } from '@/lib/print-utils'
import { getDirectImageBase64 } from '@/lib/actions'
import type { Laporan, Pegawai } from '@/lib/types'

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function buildLaporanHTML(
  lap: Laporan,
  targetPegawai?: Pegawai | null,
  logoUrl: string = '/Pemkot.png',
  base64Images: { src: string; isDoc: boolean }[] = []
): string {
  const pegawaiNama = targetPegawai?.nama || lap.pegawai?.nama || lap.pegawai_id || '-'
  const nipText =
    targetPegawai?.nip || lap.pegawai?.nip
      ? `NIP. ${targetPegawai?.nip || lap.pegawai?.nip}`
      : ''
  const jabatanText = targetPegawai?.jabatan || lap.jabatan || 'Staff'
  const bidangText = targetPegawai?.bidang || lap.bidang || '-'
  const tanggal = lap.tanggal_kegiatan
    ? new Date(lap.tanggal_kegiatan).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'

  return `
    <div style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.35; color: #000; background: #fff; width: 794px; padding: 25px 35px; box-sizing: border-box;">
      <!-- Kop Surat -->
      <div style="display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 16px;">
        <img src="${logoUrl}" style="width: 75px; height: auto;" alt="Logo Pemkot" />
        <div style="flex-grow: 1; text-align: center; padding: 0 10px;">
          <h3 style="margin: 0; font-size: 13pt; font-weight: bold; letter-spacing: 0.5px;">PEMERINTAH KOTA SURAKARTA</h3>
          <h2 style="margin: 2px 0; font-size: 15pt; font-weight: bold; letter-spacing: 1px;">DINAS TENAGA KERJA</h2>
          <p style="margin: 1px 0; font-size: 9pt;">Jalan Slamet Riyadi No. 306, Kota Surakarta, Kodepos 57141</p>
          <p style="margin: 1px 0; font-size: 9pt;">Telepon: (0271) 714902 | Pos-el: disnaker@surakarta.go.id</p>
        </div>
        <div style="width: 75px;"></div>
      </div>

      <!-- Judul Dokumen -->
      <div style="text-align: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 12pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">LAPORAN HASIL PENUGASAN</h3>
      </div>

      <!-- Tabel Metadata -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11pt;">
        <tr>
          <td style="width: 26%; padding: 2.5px 0; vertical-align: top;">Nama Pegawai</td>
          <td style="width: 2%; padding: 2.5px 0; text-align: center; vertical-align: top;">:</td>
          <td style="width: 72%; padding: 2.5px 0; vertical-align: top;"><strong>${pegawaiNama}</strong></td>
        </tr>
        ${nipText ? `<tr><td style="padding: 2.5px 0; vertical-align: top;">NIP</td><td style="text-align: center; vertical-align: top;">:</td><td style="padding: 2.5px 0; vertical-align: top;">${nipText}</td></tr>` : ''}
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Jabatan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${jabatanText}</td>
        </tr>
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Bidang / Unit Kerja</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${bidangText}</td>
        </tr>
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Jenis Penugasan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.jenis_penugasan || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Hari / Tanggal</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${tanggal}</td>
        </tr>
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Nama Kegiatan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.nama_kegiatan || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Tempat Kegiatan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.tempat_kegiatan || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Penyelenggara</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.penyelenggara || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 2.5px 0; vertical-align: top;">Tamu Undangan / Peserta</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.tamu_undangan || '-'}</td>
        </tr>
      </table>

      <!-- Catatan Hasil Kegiatan -->
      <div style="margin-top: 14px; page-break-inside: avoid;">
        <span style="font-weight: bold; margin-bottom: 4px; display: block;">Catatan Hasil Kegiatan:</span>
        <div style="text-align: justify; text-justify: inter-word; font-size: 10.5pt; line-height: 1.4; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fafafa;">
          ${formatRichTextForPrint(lap.catatan_hasil)}
        </div>
      </div>

      <!-- Catatan Pimpinan -->
      ${
        lap.catatan_pimpinan
          ? `
        <div style="margin-top: 14px; border: 1.5px solid #333; padding: 8px 12px; border-radius: 4px; background: #fdfdfd; page-break-inside: avoid;">
          <span style="font-weight: bold; margin-bottom: 4px; display: block; color: #111;">Arahan / Disposisi Pimpinan:</span>
          <div style="font-size: 10pt; line-height: 1.35; font-style: italic;">
            ${formatRichTextForPrint(lap.catatan_pimpinan)}
          </div>
        </div>
      `
          : ''
      }

      <!-- Dokumentasi Foto -->
      ${
        base64Images.length > 0
          ? `
        <div style="margin-top: 16px; page-break-inside: avoid;">
          <span style="font-weight: bold; margin-bottom: 4px; display: block;">Dokumentasi Kegiatan:</span>
          <div style="display: grid; grid-template-columns: ${base64Images.length === 1 ? '1fr' : 'repeat(2, 1fr)'}; gap: 14px; margin-top: 6px;">
            ${base64Images
              .map(
                (img, idx) => `
              <div style="border: 1px solid #888; border-radius: 4px; padding: 5px; background: #fff; text-align: center; page-break-inside: avoid;">
                ${
                  img.isDoc
                    ? `<div style="height: 220px; display:flex; align-items:center; justify-content:center; background:#eee; font-size:10pt; color:#666;">Berkas Foto ${idx + 1}</div>`
                    : `<img src="${img.src}" style="width: 100%; height: ${base64Images.length === 1 ? '280px' : '220px'}; object-fit: cover; display: block; border-radius: 2px;" alt="Dokumentasi ${idx + 1}" />`
                }
                <div style="font-size: 9pt; color: #333; margin-top: 5px; font-style: italic;">Foto ${idx + 1} - Dokumentasi Kegiatan</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <!-- Materi Paparan -->
      ${
        lap.materi_urls && lap.materi_urls.length > 0
          ? `
        <div style="margin-top: 14px; page-break-inside: avoid;">
          <span style="font-weight: bold; margin-bottom: 4px; display: block;">Materi Paparan / Lampiran Berkas:</span>
          <ul style="margin-top: 4px; padding-left: 20px; font-size: 9.5pt;">
            ${lap.materi_urls
              .map(
                (url, idx) => `
              <li style="margin-bottom: 3px; word-break: break-all;">Berkas ${idx + 1}: <span style="color:#000; text-decoration: underline;">${url}</span></li>
            `
              )
              .join('')}
          </ul>
        </div>
      `
          : ''
      }

      <!-- Tanda Tangan -->
      <div style="margin-top: 25px; page-break-inside: avoid; display: flex; justify-content: flex-end;">
        <div style="width: 260px; text-align: center;">
          <p style="margin-bottom: 55px;">
            Surakarta, ${new Date().toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}<br />
            Pegawai yang Melaporkan,
          </p>
          <p style="font-weight: bold; text-decoration: underline; margin: 0;">${pegawaiNama}</p>
          ${nipText ? `<p style="margin: 2px 0 0 0; font-size: 9.5pt;">${nipText}</p>` : ''}
        </div>
      </div>
    </div>
  `
}

let cachedLogoBase64: string | null = null

async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64
  if (typeof window === 'undefined') return '/Pemkot.png'

  try {
    const res = await fetch('/Pemkot.png')
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string
        resolve(cachedLogoBase64)
      }
      reader.onerror = () => resolve('/Pemkot.png')
      reader.readAsDataURL(blob)
    })
  } catch {
    return '/Pemkot.png'
  }
}

export async function generateLaporanPDF(
  lap: Laporan,
  targetPegawai?: Pegawai | null
): Promise<void> {
  if (typeof window === 'undefined') return

  // 1. Preload Logo Pemkot & Drive Images to Base64 in parallel
  const [logoBase64, base64Images] = await Promise.all([
    getLogoBase64(),
    Promise.all(
      (lap.dokumentasi_urls || []).map(async (url: string) => {
        const b64 = await getDirectImageBase64(url)
        if (b64) return { src: b64, isDoc: false }
        return { src: url, isDoc: true }
      })
    ),
  ])

  // 2. Buat container DOM offscreen
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '794px'
  container.style.background = '#ffffff'
  container.style.zIndex = '-9999'
  container.innerHTML = buildLaporanHTML(lap, targetPegawai, logoBase64, base64Images)
  document.body.appendChild(container)

  try {
    // Pastikan seluruh elemen gambar telah selesai dimuat
    const images = Array.from(container.querySelectorAll('img'))
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) return resolve(true)
            img.onload = () => resolve(true)
            img.onerror = () => resolve(true)
          })
      )
    )

    // 3. Konfigurasi jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    // Pasang html2canvas ke window untuk compatibility fallback
    ;(window as any).html2canvas = html2canvas

    const pegawaiNama = targetPegawai?.nama || lap.pegawai?.nama || lap.pegawai_id || 'Pegawai'
    const cleanNama = sanitizeFilename(pegawaiNama)
    const tglKegiatan = lap.tanggal_kegiatan ? lap.tanggal_kegiatan.split('T')[0] : 'Kegiatan'
    const fileName = `Laporan_Penugasan_${cleanNama}_${tglKegiatan}.pdf`

    await doc.html(container, {
      callback: (pdf) => {
        pdf.save(fileName)
      },
      x: 0,
      y: 0,
      width: 210,
      windowWidth: 794,
      autoPaging: 'text',
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
    })
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pdf-generator.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf-generator.ts tests/pdf-generator.test.ts
git commit -m "feat(pdf): implement DOM-to-PDF report generator utility"
```

---

### Task 2: Update Cetak Client Component to Download PDF

**Files:**
- Modify: `src/components/cetak-client.tsx:1-1056`
- Modify: `tests/cetak-hub.test.tsx:1-98`

**Interfaces:**
- Consumes:
  - `generateLaporanPDF` from `src/lib/pdf-generator.ts`
  - `FileDown`, `Loader2` from `lucide-react`
  - `Swal` from `sweetalert2`
- Produces:
  - Download PDF table action button & detail modal action button with interactive loading states and SweetAlert2 notifications.

- [ ] **Step 1: Write failing test asserting "Download PDF" UI in Cetak Client**

Perbarui `tests/cetak-hub.test.tsx` untuk memverifikasi teks header dan tombol Download PDF:

```typescript
import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { CetakClient } from '../src/components/cetak-client'
import type { Pegawai, Laporan } from '../src/lib/types'

const mockPegawaiList: Pegawai[] = [
  {
    id: 'peg-1',
    nama: 'Budi Santoso, S.Kom',
    nip: '198501012010011001',
    bidang: 'Sekretariat',
    jabatan: 'Pranata Komputer Ahli Muda',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

const mockLaporanList: Laporan[] = [
  {
    id: '1',
    pegawai_id: 'peg-1',
    bidang: 'Sekretariat',
    jabatan: 'Pranata Komputer Ahli Muda',
    jenis_penugasan: 'Rapat Koordinasi',
    tanggal_kegiatan: '2026-09-01',
    nama_kegiatan: 'Rapat Koordinasi Integrasi SIMPELGAS',
    tempat_kegiatan: 'Ruang Rapat Disnaker',
    penyelenggara: 'Disnaker Kota Surakarta',
    tamu_undangan: 'Perwakilan Bidang',
    catatan_hasil: 'Penyelarasan alur kerja pelaporan penugasan ASN.',
    dokumentasi_urls: ['https://drive.google.com/open?id=foto1'],
    materi_urls: ['https://drive.google.com/open?id=materi1'],
    status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
    catatan_pimpinan: 'Lanjutkan koordinasi teknis.',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
    pegawai: mockPegawaiList[0],
  },
]

describe('CetakClient - Pusat Arsip & Download PDF Hub (TDD)', () => {
  it('renders CetakClient with initialLaporan and pegawaiList without throwing', () => {
    const html = renderToString(
      <CetakClient initialLaporan={mockLaporanList} pegawaiList={mockPegawaiList} />
    )
    expect(html).toBeDefined()
    expect(html).toContain('Arsip &amp; Download PDF Laporan')
  })

  it('renders search bar and filter controls', () => {
    const html = renderToString(
      <CetakClient initialLaporan={mockLaporanList} pegawaiList={mockPegawaiList} />
    )
    expect(html).toContain('placeholder="Cari nama pegawai, kegiatan, tempat..."')
    expect(html).toContain('Semua Bidang')
  })

  it('renders the master table with report rows and action buttons', () => {
    const html = renderToString(
      <CetakClient initialLaporan={mockLaporanList} pegawaiList={mockPegawaiList} />
    )
    expect(html).toContain('Rapat Koordinasi Integrasi SIMPELGAS')
    expect(html).toContain('Download PDF')
    expect(html).toContain('Detail')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cetak-hub.test.tsx`  
Expected: FAIL with assertion error ('Arsip & Cetak Laporan' vs 'Arsip & Download PDF Laporan')

- [ ] **Step 3: Modify `src/components/cetak-client.tsx`**

Perbarui `src/components/cetak-client.tsx`:
1. Ganti import `Printer` dengan `FileDown` dari `lucide-react`.
2. Import `generateLaporanPDF` dari `@/lib/pdf-generator`.
3. Ganti fungsi `prosesCetak` dengan `handleDownloadPDF`:
   ```typescript
   const [downloadingId, setDownloadingId] = useState<string | null>(null)

   const handleDownloadPDF = async (lap: Laporan) => {
     setDownloadingId(lap.id)
     Swal.fire({
       title: 'Menyiapkan Dokumen PDF...',
       text: 'Sedang merender format resmi kedinasan dan memuat lampiran.',
       allowOutsideClick: false,
       didOpen: () => {
         Swal.showLoading()
       },
     })

     try {
       const targetPegawai =
         pegawaiList.find((p) => p.id === lap.pegawai_id || p.nip === lap.pegawai_id) || lap.pegawai
       await generateLaporanPDF(lap, targetPegawai)
       Swal.close()
       Swal.fire({
         icon: 'success',
         title: 'Berhasil Diunduh!',
         text: 'Dokumen PDF laporan penugasan telah tersimpan di perangkat Anda.',
         timer: 2000,
         showConfirmButton: false,
       })
     } catch (err) {
       console.error('Error saat membuat PDF:', err)
       Swal.fire({
         icon: 'error',
         title: 'Gagal Membuat PDF',
         text: 'Terjadi kendala saat merender dokumen PDF. Silakan coba kembali.',
         confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
       })
     } finally {
       setDownloadingId(null)
     }
   }
   ```
4. Perbarui banner header:
   - Ikon: `<FileDown size={24} />`
   - Judul: `Arsip & Download PDF Laporan Penugasan`
   - Deskripsi: `Pusat pencarian riwayat laporan kegiatan dinas ASN, pratinjau lampiran berkas, dan unduh lembar resmi format PDF kedinasan.`
5. Perbarui tombol aksi di tabel:
   - Ganti `Cetak` menjadi `Download PDF` dengan ikon `FileDown`.
   - Disabled saat `downloadingId === item.id` dan tampilkan `Loader2` spinning.
6. Perbarui tombol aksi di modal detail:
   - Ganti `Cetak Lembar Laporan Ini` menjadi `Unduh Lembar PDF` dengan ikon `FileDown`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cetak-hub.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/cetak-client.tsx tests/cetak-hub.test.tsx
git commit -m "feat(cetak): replace print dialog with DOM-to-PDF download in CetakClient"
```

---

### Task 3: Update Navigation & Dashboard Shortcuts

**Files:**
- Modify: `src/components/sidebar.tsx:1-126`
- Modify: `src/components/dashboard-client.tsx:615-720`

**Interfaces:**
- Consumes:
  - `FileDown` from `lucide-react`
- Produces:
  - Updated sidebar navigation item (`Download PDF`)
  - Updated dashboard shortcut links & action labels

- [ ] **Step 1: Update Sidebar Navigation**

Di `src/components/sidebar.tsx`:
1. Ganti import `Printer` dengan `FileDown` dari `lucide-react`.
2. Perbarui `navItems`:
   ```typescript
   const navItems = [
     { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
     { href: '/input', label: 'Input Penugasan', icon: FileEdit },
     { href: '/cetak', label: 'Download PDF', icon: FileDown },
   ]
   ```

- [ ] **Step 2: Update Dashboard Shortcuts**

Di `src/components/dashboard-client.tsx`:
1. Ganti import `Printer` dengan `FileDown` dari `lucide-react`.
2. Perbarui baris 623:
   `<span>Buka Semua di Menu Download PDF</span>`
3. Perbarui baris 695-696:
   `<FileDown size={12} className="text-primary" />`
   `<span>Unduh PDF</span>`
4. Perbarui baris 711-712:
   `<FileDown size={15} />`
   `<span>Kelola &amp; Unduh Seluruh Laporan ({filteredData.length} Data)</span>`

- [ ] **Step 3: Run design-tokens test & dashboard test**

Run: `npx vitest run tests/design-tokens.test.ts && npx vitest run tests/ui-states.test.tsx`  
Expected: PASS (0 violations, no hardcoded colors, 100% lucide-react, no emoji)

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar.tsx src/components/dashboard-client.tsx
git commit -m "feat(ui): update sidebar and dashboard shortcuts to Download PDF"
```

---

### Task 4: Full Verification & 5 Evidence Gates

**Files:**
- Verify: All files in `src/` and `tests/`

- [ ] **Step 1: Gate 1 - Static Quality (Lint & Typecheck)**

Run: `npm run lint && npm run typecheck`  
Expected: 0 error, 0 warning

- [ ] **Step 2: Gate 2 - Automated Testing (Vitest)**

Run: `npm test`  
Expected: 100% test suites pass (14 test files, 76+ tests)

- [ ] **Step 3: Gate 3 - Local CI**

Run: `npm run ci:local`  
Expected: Exit code 0 (Lint, Typecheck, Test, Build)

- [ ] **Step 4: Gate 4 - Build Output Verification**

Run: `npm run build`  
Expected: Bundle Next.js berhasil dikompilasi tanpa error.

- [ ] **Step 5: Gate 5 - Manual Verification on Running App**

Lakukan pengujian manual pada `http://localhost:3000/cetak`:
1. Pastikan sidebar menampilkan menu **"Download PDF"** dengan ikon `FileDown`.
2. Klik tombol **"Download PDF"** pada baris laporan:
   - SweetAlert2 menampilkan indikator loading.
   - File PDF otomatis terunduh dengan format nama `Laporan_Penugasan_[Nama]_[Tanggal].pdf`.
   - Buka file PDF: Kop surat, garis ganda, tabel metadata, catatan, foto, dan tanda tangan tampil rapi dan presisi.
3. Klik tombol **"Unduh Lembar PDF"** di dalam modal Detail:
   - File PDF terunduh dengan benar.
