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

  const prosesCetak = (lap: Laporan) => {
    const logoUrl = window.location.origin + '/Pemkot.png'
    const pegawaiNama = lap.pegawai?.nama || '-'
    const tanggal = lap.tanggal_kegiatan ? new Date(lap.tanggal_kegiatan).toLocaleDateString('id-ID') : '-'

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
          <title>Cetak Laporan</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 20mm; }
              body { margin: 0; padding: 0; }
              .anti-potong { page-break-inside: avoid; break-inside: avoid; }
            }
            body { font-family: 'Times New Roman', Times, serif; font-size: 14px; padding: 20mm; background: white; color: black; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
            td { padding: 4px 0; vertical-align: top; }
          </style>
        </head>
        <body onload="setTimeout(function() { window.focus(); window.print(); }, 500);">
          <div style="display: flex; align-items: center; border-bottom: 3px solid black; margin-bottom: 2px; padding-bottom: 10px;">
            <img src="${logoUrl}" style="width: 80px; height: auto; flex-shrink: 0;" />
            <div style="flex-grow: 1; text-align: center;">
              <h3 style="margin: 0; font-size: 16pt; font-weight: normal;">PEMERINTAH KOTA SURAKARTA</h3>
              <h2 style="margin: 2px 0; font-size: 20pt; font-weight: bold; letter-spacing: 1px;">DINAS TENAGA KERJA</h2>
              <p style="margin: 0; font-size: 10pt;">Jalan Slamet Riyadi No. 306, Kota Surakarta, Kodepos 57141</p>
              <p style="margin: 0; font-size: 10pt;">Telepon: (0271) 714902 | Email: disnaker@surakarta.go.id</p>
            </div>
            <div style="width: 80px; flex-shrink: 0;"></div>
          </div>
          <div style="border-top: 1px solid black; margin-bottom: 20px; padding-top: 2px;"></div>
          <h3 style="text-align:center; text-decoration:underline; font-weight:bold;">LAPORAN HASIL PENUGASAN</h3>
          <table>
            <tr><td style="width:28%">Nama Pegawai</td><td style="width:2%">:</td><td><strong>${pegawaiNama}</strong></td></tr>
            <tr><td>Bidang / Unit Kerja</td><td>:</td><td>${lap.bidang || '-'}</td></tr>
            <tr><td>Nama Kegiatan</td><td>:</td><td>${lap.nama_kegiatan || '-'}</td></tr>
            <tr><td>Tanggal Kegiatan</td><td>:</td><td>${tanggal}</td></tr>
            <tr><td>Tempat Kegiatan</td><td>:</td><td>${lap.tempat_kegiatan || '-'}</td></tr>
            <tr><td>Penyelenggara</td><td>:</td><td>${lap.penyelenggara || '-'}</td></tr>
            <tr><td>Tamu Undangan</td><td>:</td><td>${lap.tamu_undangan || '-'}</td></tr>
          </table>
          <h4 style="margin-bottom: 5px;">A. Hasil Kegiatan:</h4>
          <p style="text-align:justify; white-space: pre-wrap;">${lap.catatan_hasil || '-'}</p>
          <div class="anti-potong">
            <h4 style="margin-bottom: 5px;">B. Tindak Lanjut:</h4>
            <p style="text-align:justify;">${lap.status_tindak_lanjut || '-'}</p>
            <h4 style="margin-bottom: 5px;">C. Catatan Pimpinan:</h4>
            <p style="text-align:justify; white-space: pre-wrap;">${lap.catatan_pimpinan || '-'}</p>
            <div style="float: right; width: 250px; text-align: center; margin-top: 40px;">
              <p>Surakarta, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Pegawai yang ditugaskan,</p><br/><br/><br/><br/>
              <p><strong><u>${pegawaiNama}</u></strong></p>
            </div><div style="clear:both;"></div>
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
