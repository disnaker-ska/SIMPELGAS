'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, Lock, Save, Calendar, Check, Loader2, Inbox, FileSpreadsheet, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Swal from 'sweetalert2'
import { logoutPimpinan, updateEvaluasiPimpinan } from '@/lib/actions'
import type { Laporan, Pegawai } from '@/lib/types'

interface PimpinanClientProps {
  initialLaporan: Laporan[]
  pegawaiList: Pegawai[]
  session: { role: string; scopes: string[] }
}

interface LaporanWithEdit extends Laporan {
  _status: string
  _catatan_baru: string
}

function cleanTextHelper(str: string) {
  if (!str) return ''
  return str.toString().toLowerCase().replace(/\s+/g, ' ').trim()
}

// Ekstrak file ID dari berbagai format URL Google Drive/Docs
function getDriveFileId(url: string): string | null {
  const patterns = [
    /[?&]id=([-\w]{25,})/,         // open?id= atau uc?id= (min 25 char)
    /\/file\/d\/([-\w]{25,})/,      // /file/d/FILE_ID/view
    /\/d\/([-\w]{25,})/,            // /d/FILE_ID/ (Docs, Sheets, Slides)
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Cek apakah URL adalah Google Docs/Slides/Sheets (bukan file gambar)
function isDriveDocument(url: string): boolean {
  const docPaths = ['/presentation/', '/document/', '/spreadsheets/']
  return docPaths.some(path => url.includes(path))
}

// Tentukan src yang tepat untuk <img> berdasarkan jenis URL:
// - Supabase Storage → URL langsung (sudah publik, tidak perlu konversi)
// - Google Drive file → thumbnail API
// - Google Docs/Slides/Sheets → null (tampilkan sebagai link, bukan gambar)
// - URL lain yang dikenali sebagai gambar → URL langsung
function getImageSrc(url: string): string | null {
  // Supabase Storage public URL — bisa langsung dipakai sebagai img src
  if (url.includes('.supabase.co/storage/')) return url

  // Google Docs/Slides/Sheets — bukan gambar, tampilkan sebagai link
  if (isDriveDocument(url)) return null

  // Google Drive file — gunakan Thumbnail API
  const id = getDriveFileId(url)
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w400`

  return null
}

export function PimpinanClient({ initialLaporan, pegawaiList, session }: PimpinanClientProps) {
  const router = useRouter()
  const [activeRole] = useState(session.role)
  const [activeScopes] = useState(session.scopes)
  const [laporanList, setLaporanList] = useState<LaporanWithEdit[]>([])
  const [savingRow, setSavingRow] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (initialLaporan) {
      const filtered = initialLaporan.filter((lap) => {
        const lapBidangUpper = (lap.bidang || '').toUpperCase()
        if (!activeScopes.includes('ALL')) {
          if (!activeScopes.includes(lapBidangUpper)) return false
        }
        if (lapBidangUpper === 'KEPALA DINAS') return false

        const pegawaiJabatanUpper = (lap.jabatan || '').toUpperCase()
        if (activeRole.includes('Kasubag')) {
          if (pegawaiJabatanUpper !== 'STAFF') return false
        }

        const catatan = cleanTextHelper(lap.catatan_pimpinan || '')
        const hasEvaluated = catatan.includes(`[${activeRole.toLowerCase()}]`)
        return !hasEvaluated
      })

      setLaporanList(
        filtered.map((lap) => ({
          ...lap,
          _status: lap.status_tindak_lanjut || 'Untuk Diketahui',
          _catatan_baru: '',
        }))
      )
    }
  }, [initialLaporan, activeRole, activeScopes])

  const handleLogout = async () => {
    await logoutPimpinan()
    router.push('/pimpinan/login')
  }

  const handleSelectChange = (laporanId: string, value: string) => {
    setLaporanList((prev) =>
      prev.map((lap) => (lap.id === laporanId ? { ...lap, _status: value } : lap))
    )
  }

  const handleTextChange = (laporanId: string, value: string) => {
    setLaporanList((prev) =>
      prev.map((lap) => (lap.id === laporanId ? { ...lap, _catatan_baru: value } : lap))
    )
  }

  const simpanCatatan = async (laporanId: string) => {
    const lap = laporanList.find((l) => l.id === laporanId)
    if (!lap) return

    if (!lap._catatan_baru.trim()) {
      Swal.fire({ icon: 'warning', title: 'Catatan Kosong', text: 'Mohon isi catatan evaluasi Anda!' })
      return
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Simpan Evaluasi?',
      text: 'Laporan ini akan dianggap telah Anda evaluasi.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#F59E0B',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal',
    })

    if (!isConfirmed) return
    setSavingRow(laporanId)

    const res = await updateEvaluasiPimpinan(laporanId, lap._status, lap._catatan_baru, activeRole)

    if (res.status === 'success') {
      Swal.fire({ title: 'Tersimpan!', icon: 'success', timer: 1500, showConfirmButton: false })
      setLaporanList((prev) => prev.filter((l) => l.id !== laporanId))
      router.refresh()
    } else {
      Swal.fire('Error', 'Terjadi kesalahan koneksi.', 'error')
    }
    setSavingRow(null)
  }

  const exportRecap = async (format: 'xlsx' | 'pdf') => {
    if (!initialLaporan || initialLaporan.length === 0) return

    setIsExporting(true)
    Swal.fire({ title: 'Menyiapkan Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })

    try {
      const dataForRecap = initialLaporan.filter((lap) => {
        const lapBidangUpper = (lap.bidang || '').toUpperCase()
        if (!activeScopes.includes('ALL') && !activeScopes.includes(lapBidangUpper)) return false
        if (lapBidangUpper === 'KEPALA DINAS') return false
        if (activeRole.includes('Kasubag') && (lap.jabatan || '').toUpperCase() !== 'STAFF') return false
        return true
      })

      if (dataForRecap.length === 0) {
        Swal.fire('Info', 'Tidak ada data untuk diekspor.', 'info')
        setIsExporting(false)
        return
      }

      const mappedData = dataForRecap.map((lap, index) => ({
        No: index + 1,
        Tanggal: lap.tanggal_kegiatan ? new Date(lap.tanggal_kegiatan).toLocaleDateString('id-ID') : '-',
        'Nama Pegawai': lap.pegawai?.nama || '-',
        Bidang: lap.bidang || '-',
        'Nama Kegiatan': lap.nama_kegiatan || '-',
        'Hasil Kegiatan': lap.catatan_hasil || '-',
        Status: lap.status_tindak_lanjut || '-',
        'Catatan Pimpinan': lap.catatan_pimpinan || '-',
      }))

      await new Promise((resolve) => setTimeout(resolve, 500))

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(mappedData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Laporan')
        XLSX.writeFile(wb, `Rekap_${activeRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`)
      } else {
        const doc = new jsPDF('l', 'mm', 'a4')
        doc.setFontSize(16)
        doc.text(`Rekap Laporan — ${activeRole}`, 14, 15)
        doc.setFontSize(10)
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 22)

        autoTable(doc, {
          head: [Object.keys(mappedData[0])],
          body: mappedData.map((item) => Object.values(item)),
          startY: 28,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [27, 60, 115], textColor: 255 },
        })
        doc.save(`Rekap_${activeRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      }

      Swal.close()
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: `File ${format.toUpperCase()} telah diunduh.`, timer: 2000, showConfirmButton: false })
    } catch (error: any) {
      Swal.fire('Error', 'Gagal memproses ekspor: ' + error.message, 'error')
    } finally {
      setIsExporting(false)
    }
  }

  // ==================== EVALUATION PANEL ====================
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 border-t-4 border-t-amber-main max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b pb-4 gap-4">
        <div className="flex items-center">
          <div className="bg-navy-main p-2 rounded-xl mr-3 shadow-md">
            <UserCheck className="text-amber-main" size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy-main">Panel Evaluasi Pimpinan</h2>
            <p className="text-sm text-gray-500">Jabatan: <span className="text-navy-main font-bold">{activeRole}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => exportRecap('xlsx')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} XLSX
          </button>
          <button
            onClick={() => exportRecap('pdf')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
          </button>
          <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-600 font-bold flex items-center gap-1 transition px-2 py-2"
          >
            <Lock size={12} /> Keluar
          </button>
        </div>
      </div>

      {laporanList.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-green-100">
            <Check size={40} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">Semua Laporan Selesai!</h3>
          <p className="text-green-600 font-medium">Tidak ada laporan yang perlu dievaluasi untuk saat ini.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-navy-main/5 p-4 rounded-xl border border-navy-main/10 flex items-center gap-3">
            <div className="bg-navy-main text-white p-1.5 rounded-lg">
              <Inbox size={18} />
            </div>
            <span className="font-bold text-navy-main">Terdapat {laporanList.length} laporan menanti evaluasi Anda.</span>
          </div>

          {laporanList.map((lap) => {
            const tanggal = lap.tanggal_kegiatan ? new Date(lap.tanggal_kegiatan).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }) : '-'
            return (
              <div key={lap.id} className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-amber-200 transition-all shadow-sm">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-2">
                  <div>
                    <h3 className="font-bold text-navy-dark text-lg leading-tight">{lap.nama_kegiatan || '-'}</h3>
                    <div className="text-sm text-gray-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center font-bold text-gray-700">
                        <UserCheck size={14} className="mr-1 text-amber-main" /> {lap.pegawai?.nama || '-'}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="font-semibold text-navy-main px-2 py-0.5 bg-navy-main/5 rounded text-xs">
                        {lap.bidang || '-'}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center text-xs font-medium">
                        <Calendar size={13} className="mr-1 opacity-60" /> {tanggal}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100/50">
                    <h4 className="font-bold text-navy-main text-sm mb-2 flex items-center">
                      <div className="w-1.5 h-4 bg-amber-main rounded-full mr-2" />
                      Hasil Kegiatan:
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{lap.catatan_hasil || '-'}</p>
                  </div>

                  {lap.catatan_pimpinan && (
                    <div className="bg-amber-50/30 p-5 rounded-2xl border border-amber-100/50">
                      <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center">
                        <div className="w-1.5 h-4 bg-navy-main rounded-full mr-2" />
                        Riwayat Evaluasi:
                      </h4>
                      <div className="text-gray-700 text-sm whitespace-pre-wrap font-mono bg-white/80 p-4 border border-amber-100 rounded-xl">
                        {lap.catatan_pimpinan}
                      </div>
                    </div>
                  )}

                  {/* Dokumentasi & Materi Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-500 text-[10px] uppercase tracking-widest mb-3">DOKUMENTASI KEGIATAN</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lap.dokumentasi_urls && lap.dokumentasi_urls.length > 0 ? (
                          lap.dokumentasi_urls.map((url, i) => {
                            const imageSrc = getImageSrc(url)
                            if (imageSrc) {
                              return (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-200 hover:shadow-lg transition group relative bg-white aspect-video">
                                  <img
                                    src={imageSrc}
                                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                    alt={`Dokumentasi ${i + 1}`}
                                    onError={(e) => {
                                      const parent = (e.target as HTMLImageElement).closest('a')
                                      if (parent) {
                                        parent.className = 'flex items-center justify-center p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-sm aspect-video'
                                        parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Lihat Foto`
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-navy-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-[10px] font-bold bg-navy-main px-3 py-1.5 rounded-full shadow-lg">BUKA FOTO</span>
                                  </div>
                                </a>
                              )
                            }
                            return (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-sm aspect-video">
                                <FileDown size={16} className="mr-1.5" /> Lihat Dokumen
                              </a>
                            )
                          })
                        ) : (
                          <div className="col-span-2 py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
                            <span className="text-gray-400 text-xs font-medium italic">Tidak ada foto dokumentasi</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-500 text-[10px] uppercase tracking-widest mb-3">MATERI PENDUKUNG</h4>
                      <div className="flex flex-col gap-2">
                        {lap.materi_urls && lap.materi_urls.length > 0 ? (
                          lap.materi_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition shadow-sm">
                              <FileDown size={16} /> Buka Materi {lap.materi_urls!.length > 1 ? i + 1 : ''}
                            </a>
                          ))
                        ) : (
                          <div className="py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
                            <span className="text-gray-400 text-xs font-medium italic">Tidak ada materi terlampir</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-navy-dark uppercase tracking-widest mb-2">Tindak Lanjut:</label>
                      <select
                        value={lap._status}
                        onChange={(e) => handleSelectChange(lap.id, e.target.value)}
                        className="w-full p-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-amber-main outline-none text-sm font-bold text-navy-main appearance-none cursor-pointer"
                      >
                        <option value="Untuk Diketahui">Untuk Diketahui</option>
                        <option value="Perlu Tindak Lanjut Bidang Teknis">Perlu Tindak Lanjut</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-navy-dark uppercase tracking-widest mb-2">Evaluasi Anda:</label>
                      <textarea
                        rows={2}
                        value={lap._catatan_baru}
                        onChange={(e) => handleTextChange(lap.id, e.target.value)}
                        className="w-full p-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-amber-main outline-none text-sm font-medium text-navy-main transition-all"
                        placeholder="Ketik catatan pimpinan di sini..."
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      className={`font-bold py-3.5 px-8 rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2 ${savingRow === lap.id
                        ? 'bg-amber-200 text-navy-dark cursor-not-allowed'
                        : 'bg-amber-main hover:bg-amber-hover text-navy-dark active:scale-[0.98]'
                        }`}
                      onClick={() => simpanCatatan(lap.id)}
                      disabled={savingRow !== null}
                    >
                      {savingRow === lap.id ? <><Loader2 className="animate-spin" size={18} /> Menyimpan...</> : <><Save size={18} /> Simpan Evaluasi</>}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}