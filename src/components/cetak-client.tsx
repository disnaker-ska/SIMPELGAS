'use client'

import { useState } from 'react'
import { Printer, Search, Calendar, PinIcon, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'
import { getLaporanByPegawaiId } from '@/lib/actions'
import type { Pegawai, Laporan } from '@/lib/types'

interface CetakClientProps {
  pegawaiList: Pegawai[]
}

export function CetakClient({ pegawaiList }: CetakClientProps) {
  const [selectedBidang, setSelectedBidang] = useState('')
  const [selectedPegawaiId, setSelectedPegawaiId] = useState('')
  const [laporanList, setLaporanList] = useState<Laporan[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  const getDriveFileId = (url: string): string | null => {
    const patterns = [
      /[?&]id=([-\w]+)/,           // ?id= atau &id= (open, uc?export=view, dsb)
      /\/file\/d\/([-\w]+)/,       // /file/d/FILE_ID/view
      /\/d\/([-\w]+)/,             // /d/FILE_ID/ (Docs, Slides, Sheets)
      /\/uc\?.*?id=([-\w]+)/,      // uc?export=view&id= (format lama GAS)
    ]
    for (const p of patterns) {
      const match = url.match(p)
      // Pastikan ID minimal 10 karakter agar tidak salah tangkap parameter pendek
      if (match && match[1].length >= 10) return match[1]
    }
    return null
  }

  const getImageSrc = (url: string): string | null => {
    if (url.includes('.supabase.co/storage/')) return url
    if (url.includes('/presentation/') || url.includes('/document/') || url.includes('/spreadsheets/')) return null
    const id = getDriveFileId(url)
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w600`
    return null
  }

  // Merapikan teks yang diinput manual (bullets, spasi berlebih) menjadi HTML yang rapi
  const formatRichText = (text: string) => {
    if (!text || text === '-') return '-'
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    let html = ''
    let inList = false

    lines.forEach(line => {
      // Cek apakah baris diawali dengan bullet manual: -, *, atau •
      const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•')
      
      if (isBullet) {
        if (!inList) {
          html += '<ul style="margin: 0 0 10px 0; padding-left: 20px; text-align: justify;">'
          inList = true
        }
        // Ambil teks setelah tanda bullet
        const content = line.substring(1).trim()
        html += `<li style="margin-bottom: 5px;">${content}</li>`
      } else {
        if (inList) {
          html += '</ul>'
          inList = false
        }
        html += `<p style="margin: 0 0 10px 0; text-align: justify;">${line}</p>`
      }
    })

    if (inList) html += '</ul>'
    return html || '-'
  }

  const prosesCetak = (lap: Laporan) => {
    const logoUrl = window.location.origin + '/Pemkot.png'
    const pegawaiNama = lap.pegawai?.nama || '-'
    const tanggal = lap.tanggal_kegiatan ? new Date(lap.tanggal_kegiatan).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : '-'

    const oldIframe = document.getElementById('print-iframe')
    if (oldIframe) document.body.removeChild(oldIframe)

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
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
            @media print {
              @page { size: A4 portrait; margin: 30mm 25mm; }
              body { margin: 0; padding: 0; }
              .page-break { page-break-before: always; }
              .anti-potong { page-break-inside: avoid; }
            }
            body { font-family: 'Arial', 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: black; padding: 25mm; }
            .header { display: flex; align-items: center; border-bottom: 3.5px double black; padding-bottom: 10px; margin-bottom: 20px; }
            .header-text { flex-grow: 1; text-align: center; }
            .header-text h3 { margin: 0; font-size: 14pt; font-weight: normal; }
            .header-text h2 { margin: 2px 0; font-size: 16pt; font-weight: bold; }
            .header-text p { margin: 0; font-size: 9pt; }
            
            .content-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .content-table td { padding: 4px 0; vertical-align: top; }
            .section-title { font-weight: bold; margin-top: 35px; margin-bottom: 8px; border-bottom: 1px solid #eee; display: block; }
            
            .doc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 10px; }
            .doc-item { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
            .doc-item img { width: 100%; height: 180px; object-fit: cover; display: block; }
            
            .materi-list { margin-top: 10px; padding-left: 20px; font-size: 9pt; }
            .materi-list li { margin-bottom: 5px; color: #444; word-break: break-all; }
            
            .signature { margin-top: 50px; float: right; width: 250px; text-align: center; }
          </style>
        </head>
        <body onload="setTimeout(function() { window.focus(); window.print(); }, 800);">
          <div class="header">
            <img src="${logoUrl}" style="width: 70px; height: auto;" />
            <div class="header-text">
              <h3>PEMERINTAH KOTA SURAKARTA</h3>
              <h2>DINAS TENAGA KERJA</h2>
              <p>Jalan Slamet Riyadi No. 306, Kota Surakarta, Kodepos 57141</p>
              <p>Telepon: (0271) 714902 | Email: disnaker@surakarta.go.id</p>
            </div>
            <div style="width: 70px;"></div>
          </div>

          <h3 style="text-align:center; text-decoration:underline; font-weight:bold; margin-bottom: 25px;">LAPORAN HASIL PENUGASAN</h3>
          
          <table class="content-table">
            <tr><td style="width:28%">Nama Pegawai</td><td style="width:2%">:</td><td><strong>${pegawaiNama}</strong></td></tr>
            <tr><td>Bidang / Unit Kerja</td><td>:</td><td>${lap.bidang || '-'}</td></tr>
            <tr><td>Nama Kegiatan</td><td>:</td><td>${lap.nama_kegiatan || '-'}</td></tr>
            <tr><td>Tanggal Kegiatan</td><td>:</td><td>${tanggal}</td></tr>
            <tr><td>Tempat Kegiatan</td><td>:</td><td>${lap.tempat_kegiatan || '-'}</td></tr>
            <tr><td>Penyelenggara</td><td>:</td><td>${lap.penyelenggara || '-'}</td></tr>
            <tr><td>Tamu Undangan</td><td>:</td><td>${lap.tamu_undangan || '-'}</td></tr>
          </table>

          <div class="anti-potong">
            <span class="section-title">A. Hasil Kegiatan:</span>
            <div style="margin-top: 5px;">${formatRichText(lap.catatan_hasil || '-')}</div>
          </div>

          <div class="anti-potong">
            <span class="section-title">B. Tindak Lanjut:</span>
            <p style="text-align:justify; margin-top: 5px;">${lap.status_tindak_lanjut || '-'}</p>
          </div>

          <div class="anti-potong">
            <span class="section-title">C. Catatan Pimpinan:</span>
            <div style="margin-top: 5px;">${formatRichText(lap.catatan_pimpinan || '-')}</div>
          </div>

          ${lap.dokumentasi_urls && lap.dokumentasi_urls.length > 0 ? `
            <div class="anti-potong">
              <span class="section-title">D. Lampiran Dokumentasi:</span>
              <div class="doc-grid">
                ${lap.dokumentasi_urls.map(url => {
                  const src = getImageSrc(url);
                  return src ? `
                    <div class="doc-item">
                      <img src="${src}" alt="Dokumentasi" />
                    </div>
                  ` : `<div class="doc-item" style="padding: 20px; font-size: 8pt; background: #f9f9f9;">Link Dokumen: <br/> ${url}</div>`
                }).join('')}
              </div>
            </div>
          ` : ''}

          ${lap.materi_urls && lap.materi_urls.length > 0 ? `
            <div class="anti-potong">
              <span class="section-title">E. Materi Pendukung:</span>
              <ul class="materi-list">
                ${lap.materi_urls.map(url => `<li>${url}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="anti-potong">
            <div class="signature">
              <p>Surakarta, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Pegawai yang ditugaskan,</p><br/><br/><br/><br/>
              <p><strong><u>${pegawaiNama}</u></strong></p>
            </div>
            <div style="clear:both;"></div>
          </div>
        </body>
      </html>
    `)
    doc.close()
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
              <button onClick={() => prosesCetak(lap)} className="flex-1 md:flex-none px-4 py-2 bg-navy-main text-white rounded-lg text-sm font-semibold hover:bg-navy-dark transition flex items-center justify-center shadow-md">
                <Printer size={16} className="mr-2" /> Cetak Laporan
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
