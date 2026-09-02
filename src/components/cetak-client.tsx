/* Hallmark · macrostructure: Workbench · genre: modern-minimal · theme: custom-executive
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 */
'use client'

import { useState, useMemo } from 'react'
import {
  Printer,
  Search,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Eye,
  X,
  ExternalLink,
  Camera,
  FileSpreadsheet,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { getDirectImageBase64 } from '@/lib/actions'
import { formatRichTextForPrint } from '@/lib/print-utils'
import { DESIGN_TOKENS } from '@/lib/design-tokens'
import type { Pegawai, Laporan } from '@/lib/types'
import { EmptyState } from '@/components/ui/empty-state'

interface CetakClientProps {
  initialLaporan: Laporan[]
  pegawaiList: Pegawai[]
}

function cleanText(str: string): string {
  return str ? str.toString().toLowerCase().replace(/\s+/g, ' ').trim() : ''
}

function isPerluTindakLanjut(str: string): boolean {
  return cleanText(str).includes('perlu tindak lanjut')
}

export function CetakClient({ initialLaporan = [], pegawaiList = [] }: CetakClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBidang, setFilterBidang] = useState('Semua')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [filterBulan, setFilterBulan] = useState('Semua')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<Laporan | null>(null)

  const itemsPerPage = 10
  const currentYear = new Date().getFullYear()

  // Get unique bidang list (normalized)
  const bidangOptions = useMemo(() => {
    const raw = pegawaiList.map((p) => p.bidang?.trim()).filter(Boolean) as string[]
    return [...new Set(raw)]
  }, [pegawaiList])

  // Filtered reports
  const filteredData = useMemo(() => {
    let data = initialLaporan

    // Filter by search query (Pegawai, NIP, Kegiatan, Tempat, Penyelenggara)
    if (searchTerm.trim()) {
      const q = cleanText(searchTerm)
      data = data.filter((item) => {
        const peg = pegawaiList.find((p) => p.id === item.pegawai_id) || item.pegawai
        const pegNama = cleanText(peg?.nama || item.pegawai_id || '')
        const pegNip = cleanText(peg?.nip || '')
        const kegiatan = cleanText(item.nama_kegiatan || '')
        const tempat = cleanText(item.tempat_kegiatan || '')
        const penyelenggara = cleanText(item.penyelenggara || '')
        const bidang = cleanText(item.bidang || '')
        return (
          pegNama.includes(q) ||
          pegNip.includes(q) ||
          kegiatan.includes(q) ||
          tempat.includes(q) ||
          penyelenggara.includes(q) ||
          bidang.includes(q)
        )
      })
    }

    if (filterBidang !== 'Semua') {
      data = data.filter(
        (item) => (item.bidang || '').trim().toUpperCase() === filterBidang.trim().toUpperCase()
      )
    }

    if (filterStatus !== 'Semua') {
      const isFilterPerlu = cleanText(filterStatus).includes('perlu tindak lanjut')
      data = data.filter((item) =>
        isFilterPerlu
          ? isPerluTindakLanjut(item.status_tindak_lanjut)
          : !isPerluTindakLanjut(item.status_tindak_lanjut)
      )
    }

    if (filterBulan !== 'Semua' || filterStartDate || filterEndDate) {
      data = data.filter((item) => {
        if (!item.tanggal_kegiatan) return false
        const d = new Date(item.tanggal_kegiatan)
        if (isNaN(d.getTime())) return false

        if (filterBulan !== 'Semua') {
          const itemMonth = d.getMonth() + 1
          if (itemMonth !== parseInt(filterBulan, 10)) return false
        }

        if (filterStartDate) {
          const start = new Date(filterStartDate)
          if (d < start) return false
        }

        if (filterEndDate) {
          const end = new Date(filterEndDate)
          end.setHours(23, 59, 59, 999)
          if (d > end) return false
        }

        return true
      })
    }

    return data
  }, [
    initialLaporan,
    pegawaiList,
    searchTerm,
    filterBidang,
    filterStatus,
    filterBulan,
    filterStartDate,
    filterEndDate,
  ])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const handleResetFilter = () => {
    setSearchTerm('')
    setFilterBidang('Semua')
    setFilterStatus('Semua')
    setFilterBulan('Semua')
    setFilterStartDate('')
    setFilterEndDate('')
    setCurrentPage(1)
  }

  // Print Logic: Generate official A4 document in hidden iframe
  const prosesCetak = async (lap: Laporan) => {
    setPrintingId(lap.id)
    try {
      const logoUrl = window.location.origin + '/Pemkot.png'
      const targetPegawai =
        pegawaiList.find((p) => p.id === lap.pegawai_id || p.nip === lap.pegawai_id) || lap.pegawai
      const pegawaiNama = targetPegawai?.nama || lap.pegawai?.nama || lap.pegawai_id || '-'
      const nipText = targetPegawai?.nip || lap.pegawai?.nip ? `NIP. ${targetPegawai?.nip || lap.pegawai?.nip}` : ''
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

      // Preload image files to Base64 via Server Action
      const base64Images = await Promise.all(
        (lap.dokumentasi_urls || []).map(async (url: string) => {
          const b64 = await getDirectImageBase64(url)
          if (b64) return { src: b64, isDoc: false }
          return { src: url, isDoc: true }
        })
      )

      const oldIframe = document.getElementById('print-iframe')
      if (oldIframe) document.body.removeChild(oldIframe)

      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '210mm'
      iframe.style.height = '297mm'
      iframe.style.opacity = '0'
      iframe.style.pointerEvents = 'none'
      iframe.style.border = '0'
      iframe.id = 'print-iframe'
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow!.document
      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Laporan Penugasan - ${pegawaiNama}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 15mm 20mm 15mm 20mm;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .page-break { page-break-before: always; }
                .anti-potong { page-break-inside: avoid; }
              }
              body {
                font-family: 'Times New Roman', Times, serif;
                font-size: 11pt;
                line-height: 1.35;
                color: #000;
                margin: 0;
                padding: 0;
              }
              .header {
                display: flex;
                align-items: center;
                border-bottom: 3px double #000;
                padding-bottom: 8px;
                margin-bottom: 16px;
              }
              .header-logo {
                width: 75px;
                height: auto;
              }
              .header-text {
                flex-grow: 1;
                text-align: center;
                padding: 0 10px;
              }
              .header-text h3 {
                margin: 0;
                font-size: 13pt;
                font-weight: bold;
                letter-spacing: 0.5px;
              }
              .header-text h2 {
                margin: 2px 0;
                font-size: 15pt;
                font-weight: bold;
                letter-spacing: 1px;
              }
              .header-text p {
                margin: 1px 0;
                font-size: 9pt;
              }
              
              .doc-title {
                text-align: center;
                margin-bottom: 16px;
              }
              .doc-title h3 {
                margin: 0;
                font-size: 12pt;
                font-weight: bold;
                text-decoration: underline;
                letter-spacing: 0.5px;
              }
              
              .content-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
                font-size: 11pt;
              }
              .content-table td {
                padding: 2.5px 0;
                vertical-align: top;
              }
              .content-table td.label {
                width: 26%;
              }
              .content-table td.colon {
                width: 2%;
                text-align: center;
              }
              .content-table td.value {
                width: 72%;
              }

              .section-heading {
                font-weight: bold;
                margin-top: 12px;
                margin-bottom: 4px;
                display: block;
              }
              
              .doc-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 14px;
                margin-top: 6px;
              }
              .doc-grid.single-doc {
                grid-template-columns: 1fr;
                max-width: 92%;
                margin: 6px auto 0 auto;
              }
              .doc-item {
                border: 1px solid #888;
                border-radius: 4px;
                padding: 5px;
                background: #fff;
                page-break-inside: avoid;
                text-align: center;
              }
              .doc-item img {
                width: 100%;
                height: 220px;
                object-fit: cover;
                display: block;
                border-radius: 2px;
              }
              .doc-grid.single-doc .doc-item img {
                height: 280px;
                object-fit: cover;
              }
              .doc-caption {
                font-size: 9pt;
                color: #333;
                margin-top: 5px;
                font-style: italic;
              }
              
              .materi-list {
                margin-top: 4px;
                padding-left: 20px;
                font-size: 9.5pt;
              }
              .materi-list li {
                margin-bottom: 3px;
                word-break: break-all;
              }
              
              .signature-container {
                margin-top: 25px;
                page-break-inside: avoid;
                display: flex;
                justify-content: flex-end;
              }
              .signature-box {
                width: 260px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${logoUrl}" class="header-logo" alt="Logo Pemkot" />
              <div class="header-text">
                <h3>PEMERINTAH KOTA SURAKARTA</h3>
                <h2>DINAS TENAGA KERJA</h2>
                <p>Jalan Slamet Riyadi No. 306, Kota Surakarta, Kodepos 57141</p>
                <p>Telepon: (0271) 714902 | Pos-el: disnaker@surakarta.go.id</p>
              </div>
              <div style="width: 75px;"></div>
            </div>

            <div class="doc-title">
              <h3>LAPORAN HASIL PENUGASAN</h3>
            </div>

            <table class="content-table">
              <tr>
                <td class="label">Nama Pegawai</td>
                <td class="colon">:</td>
                <td class="value"><strong>${pegawaiNama}</strong></td>
              </tr>
              ${nipText ? `<tr><td class="label">NIP</td><td class="colon">:</td><td class="value">${nipText}</td></tr>` : ''}
              <tr>
                <td class="label">Jabatan</td>
                <td class="colon">:</td>
                <td class="value">${jabatanText}</td>
              </tr>
              <tr>
                <td class="label">Bidang / Unit Kerja</td>
                <td class="colon">:</td>
                <td class="value">${bidangText}</td>
              </tr>
              <tr>
                <td class="label">Jenis Penugasan</td>
                <td class="colon">:</td>
                <td class="value">${lap.jenis_penugasan || '-'}</td>
              </tr>
              <tr>
                <td class="label">Hari / Tanggal</td>
                <td class="colon">:</td>
                <td class="value">${tanggal}</td>
              </tr>
              <tr>
                <td class="label">Nama Kegiatan</td>
                <td class="colon">:</td>
                <td class="value">${lap.nama_kegiatan || '-'}</td>
              </tr>
              <tr>
                <td class="label">Tempat Kegiatan</td>
                <td class="colon">:</td>
                <td class="value">${lap.tempat_kegiatan || '-'}</td>
              </tr>
              <tr>
                <td class="label">Penyelenggara</td>
                <td class="colon">:</td>
                <td class="value">${lap.penyelenggara || '-'}</td>
              </tr>
              <tr>
                <td class="label">Tamu Undangan / Peserta</td>
                <td class="colon">:</td>
                <td class="value">${lap.tamu_undangan || '-'}</td>
              </tr>
            </table>

            <div class="anti-potong" style="margin-top: 14px;">
              <span class="section-heading">Catatan Hasil Kegiatan:</span>
              <div style="text-align: justify; text-justify: inter-word; font-size: 10.5pt; line-height: 1.4; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fafafa;">
                ${formatRichTextForPrint(lap.catatan_hasil)}
              </div>
            </div>

            ${
              lap.catatan_pimpinan
                ? `
              <div class="anti-potong" style="margin-top: 14px; border: 1.5px solid #333; padding: 8px 12px; border-radius: 4px; background: #fdfdfd;">
                <span class="section-heading" style="margin-top: 0; color: #111;">Arahan / Disposisi Pimpinan:</span>
                <div style="font-size: 10pt; line-height: 1.35; font-style: italic;">
                  ${formatRichTextForPrint(lap.catatan_pimpinan)}
                </div>
              </div>
            `
                : ''
            }

            ${
              base64Images.length > 0
                ? `
              <div class="anti-potong" style="margin-top: 16px;">
                <span class="section-heading">Dokumentasi Kegiatan:</span>
                <div class="doc-grid ${base64Images.length === 1 ? 'single-doc' : ''}">
                  ${base64Images
                    .map(
                      (img, idx) => `
                    <div class="doc-item">
                      ${
                        img.isDoc
                          ? `<div style="height:${base64Images.length === 1 ? '280px' : '220px'}; display:flex; align-items:center; justify-content:center; background:#eee; font-size:10pt; color:#666;">Berkas Foto ${idx + 1}</div>`
                          : `<img src="${img.src}" alt="Dokumentasi ${idx + 1}" />`
                      }
                      <div class="doc-caption">Foto ${idx + 1} - Dokumentasi Kegiatan</div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            ${
              lap.materi_urls && lap.materi_urls.length > 0
                ? `
              <div class="anti-potong" style="margin-top: 14px;">
                <span class="section-heading">Materi Paparan / Lampiran Berkas:</span>
                <ul class="materi-list">
                  ${lap.materi_urls
                    .map(
                      (url, idx) => `
                    <li>Berkas ${idx + 1}: <a href="${url}" target="_blank" style="color:#000; text-decoration: underline;">${url}</a></li>
                  `
                    )
                    .join('')}
                </ul>
              </div>
            `
                : ''
            }

            <div class="signature-container">
              <div class="signature-box">
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
          </body>
        </html>
      `)
      doc.close()

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setPrintingId(null)
        }, 800)
      }
    } catch (err) {
      console.error('Error saat proses cetak:', err)
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses Cetak',
        text: 'Terjadi kendala saat merender dokumen cetak. Silakan coba kembali.',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
      setPrintingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-slate-800 rounded-xl text-primary border border-slate-700/80">
            <Printer size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Arsip &amp; Cetak Laporan Penugasan
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Pusat pencarian riwayat laporan kegiatan dinas ASN, pratinjau lampiran berkas, dan cetak lembar resmi A4 kedinasan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileSpreadsheet size={15} className="text-primary" />
            <span>{filteredData.length} Laporan Terdata</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input (5 cols) */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari nama pegawai, kegiatan, tempat..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                aria-label="Hapus kata kunci pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Bidang (3 cols) */}
          <div className="md:col-span-3">
            <select
              value={filterBidang}
              onChange={(e) => {
                setFilterBidang(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none cursor-pointer"
            >
              <option value="Semua">Semua Bidang</option>
              {bidangOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Selesai (Untuk Diketahui)">Selesai</option>
              <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
            </select>
          </div>

          {/* Filter Bulan (2 cols) */}
          <div className="md:col-span-2 flex items-center gap-2">
            <select
              value={filterBulan}
              onChange={(e) => {
                setFilterBulan(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none cursor-pointer"
            >
              <option value="Semua">Semua Bulan</option>
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>

            {(searchTerm ||
              filterBidang !== 'Semua' ||
              filterStatus !== 'Semua' ||
              filterBulan !== 'Semua') && (
              <button
                onClick={handleResetFilter}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer active:scale-95 shrink-0"
                title="Reset Semua Filter"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Master Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak Ada Data Laporan"
              description="Tidak ditemukan laporan yang sesuai dengan kriteria pencarian dan filter saat ini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-3.5 text-center w-12">No</th>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">Pegawai</th>
                  <th className="py-3 px-3.5">Bidang</th>
                  <th className="py-3 px-3.5">Nama Kegiatan &amp; Lokasi</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {paginatedData.map((item, idx) => {
                  const targetPeg =
                    pegawaiList.find((p) => p.id === item.pegawai_id) || item.pegawai
                  const namaPegawai = targetPeg?.nama || item.pegawai_id || '-'
                  const nipPegawai = targetPeg?.nip || ''
                  const isPerlu = isPerluTindakLanjut(item.status_tindak_lanjut)
                  const isCurrentlyPrinting = printingId === item.id

                  const tanggalStr = item.tanggal_kegiatan
                    ? new Date(item.tanggal_kegiatan).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'

                  return (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/80 transition-colors duration-150 group"
                    >
                      <td className="py-3 px-3.5 text-center font-semibold text-slate-500">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{tanggalStr}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 leading-tight">
                          {namaPegawai}
                        </div>
                        {nipPegawai && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            NIP. {nipPegawai}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.bidang || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800 leading-snug line-clamp-2">
                          {item.nama_kegiatan || '-'}
                        </div>
                        {item.tempat_kegiatan && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{item.tempat_kegiatan}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isPerlu
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isPerlu ? (
                            <AlertCircle size={11} />
                          ) : (
                            <CheckCircle2 size={11} />
                          )}
                          <span>
                            {isPerlu ? 'Perlu Tindak Lanjut' : 'Untuk Diketahui'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedDetail(item)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                            title="Lihat Detail Laporan"
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </button>

                          {/* Tombol Cetak */}
                          <button
                            type="button"
                            onClick={() => prosesCetak(item)}
                            disabled={isCurrentlyPrinting}
                            className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                            title="Cetak Lembar Laporan A4"
                          >
                            {isCurrentlyPrinting ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Printer size={13} />
                            )}
                            <span>Cetak</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredData.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan{' '}
              <span className="font-semibold text-slate-900">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              -{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(currentPage * itemsPerPage, filteredData.length)}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-slate-900">
                {filteredData.length}
              </span>{' '}
              laporan
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, i, arr) => {
                    const prev = arr[i - 1]
                    const showEllipsis = prev && page - prev > 1
                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            currentPage === page
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    )
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Halaman Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal Component */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h3 className="text-sm sm:text-base font-bold">Rincian Laporan Penugasan</h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                aria-label="Tutup Dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
              {/* Pegawai Info Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Nama Pegawai</span>
                  <span className="font-bold text-slate-900">{selectedDetail.pegawai?.nama || selectedDetail.pegawai_id || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">NIP</span>
                  <span>{selectedDetail.pegawai?.nip || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Bidang / Unit Kerja</span>
                  <span className="font-medium text-slate-800">{selectedDetail.bidang || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Jenis Penugasan</span>
                  <span>{selectedDetail.jenis_penugasan || '-'}</span>
                </div>
              </div>

              {/* Kegiatan Details */}
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Nama Kegiatan</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedDetail.nama_kegiatan || '-'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Hari &amp; Tanggal</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar size={13} className="text-slate-400" />
                      {selectedDetail.tanggal_kegiatan
                        ? new Date(selectedDetail.tanggal_kegiatan).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Tempat / Lokasi</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" />
                      {selectedDetail.tempat_kegiatan || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Penyelenggara</span>
                    <span>{selectedDetail.penyelenggara || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Tamu Undangan</span>
                    <span>{selectedDetail.tamu_undangan || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Catatan Hasil Kegiatan */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  Catatan Hasil Kegiatan
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                  {selectedDetail.catatan_hasil || 'Tidak ada catatan hasil.'}
                </div>
              </div>

              {/* Catatan Pimpinan */}
              {selectedDetail.catatan_pimpinan && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                    Arahan / Evaluasi Pimpinan
                  </span>
                  <div className="p-3 bg-violet-50 rounded-xl border border-violet-200 text-violet-900 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm italic">
                    {selectedDetail.catatan_pimpinan}
                  </div>
                </div>
              )}

              {/* Lampiran Dokumentasi */}
              {selectedDetail.dokumentasi_urls && selectedDetail.dokumentasi_urls.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Camera size={13} className="text-primary" />
                    Dokumentasi Foto ({selectedDetail.dokumentasi_urls.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedDetail.dokumentasi_urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs text-primary font-medium transition"
                      >
                        <ExternalLink size={12} />
                        <span>Foto {i + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Lampiran Materi */}
              {selectedDetail.materi_urls && selectedDetail.materi_urls.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={13} className="text-slate-600" />
                    Berkas Materi / Paparan ({selectedDetail.materi_urls.length})
                  </span>
                  <div className="space-y-1">
                    {selectedDetail.materi_urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs text-primary font-medium transition"
                      >
                        <ExternalLink size={12} />
                        <span className="truncate">Dokumen Materi {i + 1} ({url})</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition cursor-pointer"
              >
                Tutup
              </button>

              <button
                onClick={() => {
                  const item = selectedDetail
                  setSelectedDetail(null)
                  prosesCetak(item)
                }}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer size={15} />
                <span>Cetak Lembar Laporan Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
