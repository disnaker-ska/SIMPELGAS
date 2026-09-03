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
      <!-- Kop Surat Kedinasan -->
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
        <tr data-pdf-avoid-break="true">
          <td style="width: 26%; padding: 2.5px 0; vertical-align: top;">Nama Pegawai</td>
          <td style="width: 2%; padding: 2.5px 0; text-align: center; vertical-align: top;">:</td>
          <td style="width: 72%; padding: 2.5px 0; vertical-align: top;"><strong>${pegawaiNama}</strong></td>
        </tr>
        ${nipText ? `<tr data-pdf-avoid-break="true"><td style="padding: 2.5px 0; vertical-align: top;">NIP</td><td style="text-align: center; vertical-align: top;">:</td><td style="padding: 2.5px 0; vertical-align: top;">${nipText}</td></tr>` : ''}
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Jabatan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${jabatanText}</td>
        </tr>
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Bidang / Unit Kerja</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${bidangText}</td>
        </tr>
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Jenis Penugasan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.jenis_penugasan || '-'}</td>
        </tr>
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Hari / Tanggal</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${tanggal}</td>
        </tr>
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Nama Kegiatan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.nama_kegiatan || '-'}</td>
        </tr>
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Tempat Kegiatan</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.tempat_kegiatan || '-'}</td>
        </tr>
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Penyelenggara</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.penyelenggara || '-'}</td>
        </tr>
        <tr data-pdf-avoid-break="true">
          <td style="padding: 2.5px 0; vertical-align: top;">Tamu Undangan / Peserta</td>
          <td style="text-align: center; vertical-align: top;">:</td>
          <td style="padding: 2.5px 0; vertical-align: top;">${lap.tamu_undangan || '-'}</td>
        </tr>
      </table>

      <!-- Catatan Hasil Kegiatan -->
      <div data-pdf-avoid-break="true" class="catatan-hasil-section" style="margin-top: 14px; page-break-inside: avoid;">
        <span style="font-weight: bold; margin-bottom: 4px; display: block;">Catatan Hasil Kegiatan:</span>
        <div style="text-align: justify; text-justify: inter-word; font-size: 10.5pt; line-height: 1.4; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fafafa;">
          ${formatRichTextForPrint(lap.catatan_hasil)}
        </div>
      </div>

      <!-- Catatan Pimpinan -->
      ${
        lap.catatan_pimpinan
          ? `
        <div data-pdf-avoid-break="true" class="catatan-pimpinan-section" style="margin-top: 14px; border: 1.5px solid #333; padding: 8px 12px; border-radius: 4px; background: #fdfdfd; page-break-inside: avoid;">
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
        <div data-pdf-avoid-break="true" class="doc-section" style="margin-top: 16px; page-break-inside: avoid;">
          <span style="font-weight: bold; margin-bottom: 4px; display: block;">Dokumentasi Kegiatan:</span>
          <div style="display: grid; grid-template-columns: ${base64Images.length === 1 ? '1fr' : 'repeat(2, 1fr)'}; gap: 14px; margin-top: 6px;">
            ${base64Images
              .map(
                (img, idx) => `
              <div data-pdf-avoid-break="true" class="doc-item" style="border: 1px solid #888; border-radius: 4px; padding: 5px; background: #fff; text-align: center; page-break-inside: avoid;">
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
        <div data-pdf-avoid-break="true" class="materi-section" style="margin-top: 14px; page-break-inside: avoid;">
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
      <div data-pdf-avoid-break="true" class="signature-container" style="margin-top: 25px; page-break-inside: avoid; display: flex; justify-content: flex-end;">
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

export async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64
  if (typeof window === 'undefined' || typeof FileReader === 'undefined') return '/Pemkot.png'

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

export interface PageSlice {
  startY: number
  height: number
}

/**
 * Menghitung batas pemotongan lembar halaman A4 secara cerdas (Content-Aware).
 * Mencegah elemen beranotasi data-pdf-avoid-break (foto, tanda tangan, baris tabel)
 * terpotong di tengah lembar kertas dengan menggeser batas potong ke tepi atas elemen.
 */
export function calculateSmartPageBreaks(
  container: HTMLElement,
  canvasScale: number,
  canvasHeight: number,
  pageCanvasHeight: number
): PageSlice[] {
  const slices: PageSlice[] = []
  const containerRect =
    typeof container.getBoundingClientRect === 'function'
      ? container.getBoundingClientRect()
      : { top: 0, bottom: 0, height: 0, left: 0, right: 0, width: 0 }

  // Ambil seluruh elemen yang tidak boleh terpotong di tengah halaman
  const avoidElements = typeof container.querySelectorAll === 'function'
    ? Array.from(container.querySelectorAll('[data-pdf-avoid-break]'))
    : []

  // Hitung batas vertikal masing-masing elemen dalam koordinat piksel canvas
  const boundaries = avoidElements.map((el) => {
    const rect =
      typeof el.getBoundingClientRect === 'function'
        ? el.getBoundingClientRect()
        : { top: 0, bottom: 0, height: 0, left: 0, right: 0, width: 0 }
    const top = (rect.top - containerRect.top) * canvasScale
    const bottom = (rect.bottom - containerRect.top) * canvasScale
    return {
      top: Math.max(0, top),
      bottom,
      height: bottom - top,
    }
  })

  let currentY = 0

  while (currentY < canvasHeight) {
    const remainingHeight = canvasHeight - currentY
    if (remainingHeight <= pageCanvasHeight) {
      slices.push({ startY: currentY, height: remainingHeight })
      break
    }

    // Titik potong kandidat standar (1 halaman penuh dari currentY)
    const candidateBreak = currentY + pageCanvasHeight

    // Cari elemen-elemen yang terpotong di tengah oleh candidateBreak
    const slicedElements = boundaries.filter(
      (b) =>
        b.top < candidateBreak &&
        b.bottom > candidateBreak &&
        b.top > currentY &&
        b.height <= pageCanvasHeight
    )

    let bestBreak = candidateBreak
    if (slicedElements.length > 0) {
      // Ambil titik paling atas di antara elemen yang terpotong
      const earliestTop = Math.min(...slicedElements.map((b) => b.top))
      // Pastikan halaman tetap terisi minimal 20% sebelum digeser ke halaman berikutnya
      if (earliestTop - currentY >= pageCanvasHeight * 0.2) {
        bestBreak = earliestTop
      }
    }

    const sliceHeight = bestBreak - currentY
    slices.push({ startY: currentY, height: sliceHeight })
    currentY = bestBreak
  }

  return slices
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
      (lap.dokumentasi_urls || []).map(async (url) => {
        const directBase64 = await getDirectImageBase64(url)
        return {
          src: directBase64 || url,
          isDoc: !directBase64 && !url.match(/\.(jpg|jpeg|png|webp)($|\?)/i),
        }
      })
    ),
  ])

  // 2. Buat kontainer DOM di origin (0, 0) di balik layar (z-index: -9999)
  const container = document.createElement('div')
  container.id = 'simpelgas-pdf-print-container'
  container.style.position = 'fixed'
  container.style.left = '0px'
  container.style.top = '0px'
  container.style.width = '794px'
  container.style.background = '#ffffff'
  container.style.zIndex = '-9999'
  container.style.opacity = '1'
  container.style.pointerEvents = 'none'

  const htmlString = buildLaporanHTML(lap, targetPegawai, logoBase64, base64Images)
  container.innerHTML = htmlString
  document.body.appendChild(container)

  try {
    // 3. Render container DOM ke Canvas berkualitas tinggi (scale: 2 = 300 DPI)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    })

    // 4. Konversi Canvas ke Lembar PDF Resmi A4
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pdfWidth = 210 // Lebar A4 dalam mm
    const pdfHeight = 297 // Tinggi A4 dalam mm
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // Hitung tinggi canvas proporsional untuk 1 halaman A4
    const pageCanvasHeight = (canvasWidth * pdfHeight) / pdfWidth
    const canvasScale = container.offsetWidth > 0 ? canvasWidth / container.offsetWidth : 2

    // Hitung pemotongan cerdas per halaman agar elemen tidak terpotong di tengah
    const slices = calculateSmartPageBreaks(
      container,
      canvasScale,
      canvasHeight,
      pageCanvasHeight
    )

    for (let i = 0; i < slices.length; i++) {
      if (i > 0) {
        doc.addPage()
      }

      const slice = slices[i]
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvasWidth
      pageCanvas.height = pageCanvasHeight

      const ctx = pageCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        ctx.drawImage(
          canvas,
          0,
          slice.startY,
          canvasWidth,
          slice.height,
          0,
          0,
          canvasWidth,
          slice.height
        )
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95)
      doc.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    }

    const pegawaiNama = targetPegawai?.nama || lap.pegawai?.nama || lap.pegawai_id || 'Pegawai'
    const cleanNama = sanitizeFilename(pegawaiNama)
    const tglKegiatan = lap.tanggal_kegiatan ? lap.tanggal_kegiatan.split('T')[0] : 'Kegiatan'
    const fileName = `Laporan_Penugasan_${cleanNama}_${tglKegiatan}.pdf`

    doc.save(fileName)
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}
