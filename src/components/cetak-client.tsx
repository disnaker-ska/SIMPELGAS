'use client'

import { useState } from 'react'
import { Printer, Search, Calendar, PinIcon, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'
import { getLaporanByPegawaiId } from '@/lib/actions'
import type { Pegawai, Laporan } from '@/lib/types'
import {
  getDriveDirectImageUrl,
  convertImageUrlToBase64,
  formatRichTextForPrint,
} from '@/lib/print-utils'

interface CetakClientProps {
  pegawaiList: Pegawai[]
}

export function CetakClient({ pegawaiList }: CetakClientProps) {
  const [selectedBidang, setSelectedBidang] = useState('')
  const [selectedPegawaiId, setSelectedPegawaiId] = useState('')
  const [laporanList, setLaporanList] = useState<Laporan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [searchMsg, setSearchMsg] = useState('')

  const bidangOptions = [...new Set(pegawaiList.map((p) => p.bidang).filter(Boolean))]
  const filteredPegawai = pegawaiList.filter((p) => !selectedBidang || p.bidang === selectedBidang)

  const cleanText = (str: string) => (str ? str.toString().toLowerCase().replace(/\s+/g, ' ').trim() : '')
  const isPerluTindakLanjut = (str: string) => cleanText(str).includes('perlu tindak lanjut')

  const cariLaporan = async () => {
    if (!selectedPegawaiId) {
      Swal.fire({ icon: 'warning', title: 'Oops', text: 'Pilih nama pegawai dulu ya!' })
      return
    }
    setIsLoading(true)
    setSearchMsg('')
    setLaporanList([])

    const data = await getLaporanByPegawaiId(selectedPegawaiId)
    if (data.length > 0) {
      setLaporanList(data)
    } else {
      setSearchMsg('Belum ada riwayat laporan.')
    }
    setIsLoading(false)
  }

  const prosesCetak = async (lap: Laporan) => {
    setPrintingId(lap.id)
    try {
      const logoUrl = window.location.origin + '/Pemkot.png'
      const targetPegawai =
        pegawaiList.find((p) => p.id === selectedPegawaiId || p.nip === selectedPegawaiId) || lap.pegawai
      const pegawaiNama = targetPegawai?.nama || lap.pegawai?.nama || '-'
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

      // Preload dokumentasi gambar ke Base64 agar 100% muncul di preview/cetak
      const base64Images: { src: string; isDoc: boolean }[] = []
      if (lap.dokumentasi_urls && lap.dokumentasi_urls.length > 0) {
        for (const url of lap.dokumentasi_urls) {
          const directUrl = getDriveDirectImageUrl(url, 800)
          if (directUrl) {
            const b64 = await convertImageUrlToBase64(directUrl)
            base64Images.push({ src: b64, isDoc: false })
          } else {
            base64Images.push({ src: url, isDoc: true })
          }
        }
      }

      const oldIframe = document.getElementById('print-iframe')
      if (oldIframe) document.body.removeChild(oldIframe)

      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
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
                gap: 12px;
                margin-top: 6px;
              }
              .doc-item {
                border: 1px solid #999;
                border-radius: 4px;
                padding: 4px;
                background: #fff;
                page-break-inside: avoid;
                text-align: center;
              }
              .doc-item img {
                width: 100%;
                height: 170px;
                object-fit: cover;
                display: block;
                border-radius: 2px;
              }
              .doc-caption {
                font-size: 8.5pt;
                color: #444;
                margin-top: 4px;
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
              <h3>LAPORAN PELAKSANAAN TUGAS</h3>
            </div>

            <table class="content-table">
              <tr><td class="label">Nama Pegawai</td><td class="colon">:</td><td class="value"><strong>${pegawaiNama}</strong></td></tr>
              ${nipText ? `<tr><td class="label">NIP</td><td class="colon">:</td><td class="value">${targetPegawai?.nip || lap.pegawai?.nip}</td></tr>` : ''}
              <tr><td class="label">Jabatan</td><td class="colon">:</td><td class="value">${jabatanText}</td></tr>
              <tr><td class="label">Bidang / Unit Kerja</td><td class="colon">:</td><td class="value">${bidangText}</td></tr>
              <tr><td class="label">Nama Kegiatan</td><td class="colon">:</td><td class="value">${lap.nama_kegiatan || '-'}</td></tr>
              <tr><td class="label">Hari, Tanggal</td><td class="colon">:</td><td class="value">${tanggal}</td></tr>
              <tr><td class="label">Tempat Kegiatan</td><td class="colon">:</td><td class="value">${lap.tempat_kegiatan || '-'}</td></tr>
              <tr><td class="label">Penyelenggara</td><td class="colon">:</td><td class="value">${lap.penyelenggara || '-'}</td></tr>
              ${lap.tamu_undangan ? `<tr><td class="label">Tamu / Undangan</td><td class="colon">:</td><td class="value">${lap.tamu_undangan}</td></tr>` : ''}
            </table>

            <div style="margin-top: 8px;">
              <span class="section-heading">A. Hasil Pelaksanaan Kegiatan:</span>
              <div>${formatRichTextForPrint(lap.catatan_hasil || '-')}</div>
            </div>

            <div style="margin-top: 8px;">
              <span class="section-heading">B. Rencana Tindak Lanjut:</span>
              <p style="text-align: justify; margin: 2px 0 0 0; line-height: 1.35;">${lap.status_tindak_lanjut || '-'}</p>
            </div>

            <div style="margin-top: 8px;">
              <span class="section-heading">C. Catatan / Petunjuk Pimpinan:</span>
              <div>${formatRichTextForPrint(lap.catatan_pimpinan || '-')}</div>
            </div>

            ${base64Images.length > 0 ? `
              <div style="margin-top: 12px;">
                <span class="section-heading">D. Lampiran Dokumentasi Kegiatan:</span>
                <div class="doc-grid">
                  ${base64Images.map((img, idx) => {
                    if (!img.isDoc) {
                      return `
                        <div class="doc-item">
                          <img src="${img.src}" alt="Dokumentasi ${idx + 1}" />
                          <div class="doc-caption">Dokumentasi ${idx + 1}</div>
                        </div>
                      `
                    }
                    return `
                      <div class="doc-item" style="padding: 15px; font-size: 8.5pt; background: #fdfdfd;">
                        <strong>Tautan Berkas:</strong><br/>
                        <a href="${img.src}" target="_blank" style="color: #0366d6; word-break: break-all;">${img.src}</a>
                      </div>
                    `
                  }).join('')}
                </div>
              </div>
            ` : ''}

            ${lap.materi_urls && lap.materi_urls.length > 0 ? `
              <div style="margin-top: 12px;">
                <span class="section-heading">E. Materi Pendukung:</span>
                <ul class="materi-list">
                  ${lap.materi_urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="signature-container">
              <div class="signature-box">
                <p style="margin: 0;">Surakarta, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="margin: 2px 0 0 0;">Pegawai yang Melaksanakan Tugas,</p>
                <div style="height: 55px;"></div>
                <p style="margin: 0;"><strong><u>${pegawaiNama}</u></strong></p>
                ${nipText ? `<p style="margin: 2px 0 0 0;">${nipText}</p>` : ''}
              </div>
            </div>
          </body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setPrintingId(null)
      }, 300)
    } catch (err) {
      console.error('Error saat menyiapkan cetak:', err)
      setPrintingId(null)
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan saat memproses dokumen cetak.' })
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center mb-6 border-b pb-4">
        <Printer className="text-2xl text-navy-main mr-3" size={32} />
        <div>
          <h2 className="text-xl font-bold text-navy-main">Cetak Laporan</h2>
          <p className="text-sm text-gray-500">Pilih nama pegawai untuk melihat dan mencetak riwayat penugasan.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="w-full md:w-2/5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Bidang / Unit Kerja</label>
          <select
            value={selectedBidang}
            onChange={(e) => { setSelectedBidang(e.target.value); setSelectedPegawaiId('') }}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light outline-none bg-gray-50"
          >
            <option value="">-- Semua Bidang --</option>
            {bidangOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="w-full md:w-2/5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Pegawai</label>
          <select
            value={selectedPegawaiId}
            onChange={(e) => setSelectedPegawaiId(e.target.value)}
            disabled={!selectedBidang}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light outline-none bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            <option value="">-- Pilih Pegawai --</option>
            {filteredPegawai.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </div>
        <div className="flex items-end w-full md:w-1/5">
          <button
            onClick={cariLaporan}
            disabled={isLoading || !selectedPegawaiId}
            className="w-full bg-navy-main hover:bg-navy-dark text-white font-semibold py-3 px-8 rounded-xl transition shadow-md flex items-center justify-center disabled:opacity-75"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" size={18} />} Cari
          </button>
        </div>
      </div>

      {searchMsg && <div className="text-center font-medium text-red-500 my-4">{searchMsg}</div>}

      <div className="space-y-4">
        {laporanList.map((lap) => {
          const isPerlu = isPerluTindakLanjut(lap.status_tindak_lanjut)
          const tanggal = lap.tanggal_kegiatan ? new Date(lap.tanggal_kegiatan).toLocaleDateString('id-ID') : '-'
          const isPrintingThis = printingId === lap.id

          return (
            <div key={lap.id} className="bg-white border border-gray-200 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
              <div>
                <h3 className="font-bold text-navy-dark text-lg">{lap.nama_kegiatan || '-'}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                  <span className="flex items-center"><Calendar size={14} className="mr-1" /> {tanggal}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-md border text-xs font-medium flex items-center"><PinIcon size={12} className="mr-1" /> {lap.jenis_penugasan || '-'}</span>
                  <span className={`px-2 py-1 rounded-md border text-xs font-bold ${isPerlu ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                    {isPerlu ? 'Perlu Tindak Lanjut' : 'Untuk Diketahui'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => prosesCetak(lap)}
                disabled={isPrintingThis}
                className="flex-1 md:flex-none px-4 py-2 bg-navy-main text-white rounded-lg text-sm font-semibold hover:bg-navy-dark transition flex items-center justify-center shadow-md disabled:opacity-75"
              >
                {isPrintingThis ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" /> Menyiapkan Dokumen...
                  </>
                ) : (
                  <>
                    <Printer size={16} className="mr-2" /> Cetak Laporan
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
