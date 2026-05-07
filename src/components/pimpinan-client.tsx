'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, Lock, Save, Calendar, Check, Loader2, Inbox, FileSpreadsheet, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Swal from 'sweetalert2'
import { updateEvaluasiPimpinan, verifyPimpinanPin } from '@/lib/actions'
import type { Laporan, Pegawai } from '@/lib/types'

const PIMPINAN_ROLES_NAMES = [
  'Kepala Dinas',
  'Sekretaris',
  'Kasubag Perkeu',
  'Kasubag Ako',
  'Kabid PPTK',
  'Kabid Hubungan Industrial',
]

interface PimpinanClientProps {
  initialLaporan: Laporan[]
  pegawaiList: Pegawai[]
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
    /[?&]id=([-\w]+)/,         // open?id= atau uc?export=view&id=
    /\/file\/d\/([-\w]+)/,      // /file/d/FILE_ID/view
    /\/d\/([-\w]+)/,            // /d/FILE_ID/ (Docs, Sheets, Slides)
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Cek apakah URL adalah Google Docs/Slides/Sheets (bukan file gambar)
function isDriveDocument(url: string): boolean {
  return url.includes('docs.google.com')
}

// Dapatkan URL thumbnail yang reliable untuk ditampilkan di <img>
function getDriveThumbnailUrl(url: string): string | null {
  if (isDriveDocument(url)) return null // Docs/Slides tidak bisa jadi img
  const id = getDriveFileId(url)
  if (!id) return null
  return `https://drive.google.com/thumbnail?id=${id}&sz=w400`
}

export function PimpinanClient({ initialLaporan, pegawaiList }: PimpinanClientProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeRole, setActiveRole] = useState('')
  const [pin, setPin] = useState('')
  const [laporanList, setLaporanList] = useState<LaporanWithEdit[]>([])
  const [savingRow, setSavingRow] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const pinInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated && pinInputRef.current) {
      pinInputRef.current.focus()
    }
  }, [isAuthenticated, activeRole])

  useEffect(() => {
    if (isAuthenticated && activeRole && initialLaporan) {
      const roleSetup = PIMPINAN_ROLES.find((r) => r.name === activeRole)
      if (!roleSetup) return

      const filtered = initialLaporan.filter((lap) => {
        const lapBidangUpper = (lap.bidang || '').toUpperCase()
        if (!roleSetup.scopes.includes('ALL')) {
          if (!roleSetup.scopes.includes(lapBidangUpper)) return false
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
  }, [initialLaporan, isAuthenticated, activeRole, activeScopes])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRole) {
      Swal.fire({ icon: 'warning', title: 'Pilih Jabatan', text: 'Silakan pilih jabatan Anda terlebih dahulu.' })
      return
    }

    setIsLoading(true)
    const res = await verifyPimpinanPin(activeRole, pin)
    setPin('')
    setIsLoading(false)

    if (res.success) {
      setIsAuthenticated(true)
      setActiveScopes(res.scopes || [])
      Swal.fire({
        icon: 'success',
        title: 'Akses Diberikan',
        text: `Selamat datang, ${activeRole}!`,
        timer: 1500,
        showConfirmButton: false
      })
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: res.message || 'PIN yang Anda masukkan salah.'
      })
    }
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
      // Remove from list
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

  // ==================== LOGIN SCREEN ====================
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 w-[90%] max-w-sm text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-main text-3xl">
            <Lock />
          </div>
          <h3 className="text-2xl font-bold text-navy-main mb-2">Akses Pimpinan</h3>
          <p className="text-gray-500 text-sm mb-6">Pilih jabatan dan masukkan PIN Anda</p>
          <form onSubmit={handlePinSubmit}>
            <select
              value={activeRole}
              onChange={(e) => { setActiveRole(e.target.value); setPin('') }}
              className="w-full px-4 py-3 mb-4 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-amber-main outline-none font-semibold text-navy-main"
            >
              <option value="">-- Pilih Jabatan --</option>
              {PIMPINAN_ROLES_NAMES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <input
              ref={pinInputRef}
              type="password"
              value={pin}
              disabled={!activeRole}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-4 mb-6 border-2 border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] bg-gray-50 text-navy-dark focus:border-amber-main outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••"
            />
            <button type="submit" disabled={!activeRole} className="w-full py-3 bg-amber-main hover:bg-amber-hover text-navy-dark font-bold rounded-xl transition shadow-md outline-none focus:ring-4 focus:ring-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
              Masuk
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ==================== EVALUATION PANEL ====================
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 border-t-4 border-t-amber-main max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex items-center">
          <UserCheck className="text-2xl text-amber-main mr-3" size={32} />
          <div>
            <h2 className="text-xl font-bold text-navy-main">Panel Evaluasi Pimpinan</h2>
            <p className="text-sm text-gray-500">Login sebagai: <strong className="text-amber-main">{activeRole}</strong></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportRecap('xlsx')} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition disabled:opacity-50">
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} XLSX
          </button>
          <button onClick={() => exportRecap('pdf')} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition disabled:opacity-50">
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button onClick={() => { setIsAuthenticated(false); setActiveRole(''); setPin('') }} className="text-sm text-gray-400 hover:text-red-600 font-semibold underline transition">
            Keluar
          </button>
        </div>
      </div>

      {laporanList.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center text-green-700">
          <Check size={48} className="mx-auto mb-3 text-green-500" />
          <h3 className="text-xl font-bold mb-1">Semua Selesai!</h3>
          <p>Tidak ada laporan yang perlu dievaluasi saat ini.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
            <Inbox className="text-blue-500" size={24} />
            <span className="font-semibold text-navy-main">Terdapat {laporanList.length} laporan menanti evaluasi Anda.</span>
          </div>

          {laporanList.map((lap) => {
            const tanggal = lap.tanggal_kegiatan ? new Date(lap.tanggal_kegiatan).toLocaleDateString('id-ID') : '-'
            return (
              <div key={lap.id} className="bg-gray-50 border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-amber-300 transition-colors shadow-sm">
                <div className="bg-white px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-2">
                  <div>
                    <h3 className="font-bold text-navy-dark text-lg">{lap.nama_kegiatan || '-'}</h3>
                    <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                      <span className="flex items-center"><UserCheck size={14} className="mr-1" /> {lap.pegawai?.nama || '-'}</span> |
                      <span className="font-semibold text-navy-main">{lap.bidang || '-'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <Calendar size={12} /> {tanggal}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-bold text-navy-main text-sm mb-2">Hasil Kegiatan:</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{lap.catatan_hasil || '-'}</p>
                  </div>

                  {lap.catatan_pimpinan && (
                    <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                      <h4 className="font-bold text-amber-800 text-sm mb-2">Riwayat Evaluasi:</h4>
                      <div className="text-gray-700 text-sm whitespace-pre-wrap font-mono bg-white p-3 border border-amber-200 rounded">
                        {lap.catatan_pimpinan}
                      </div>
                    </div>
                  )}

                  {/* Dokumentasi & Materi Display */}
                  <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-700 text-xs mb-2 uppercase tracking-wide">Dokumentasi</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lap.dokumentasi_urls && lap.dokumentasi_urls.length > 0 ? (
                          lap.dokumentasi_urls.map((url, i) => {
                            const thumbnailUrl = getDriveThumbnailUrl(url)
                            // Jika bisa ditampilkan sebagai gambar
                            if (thumbnailUrl) {
                              return (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-200 hover:shadow-lg transition group relative bg-gray-50">
                                  <img
                                    src={thumbnailUrl}
                                    className="w-full h-40 object-cover group-hover:scale-105 transition duration-300"
                                    alt={`Dokumentasi ${i + 1}`}
                                    onError={(e) => {
                                      // Fallback: tampilkan tombol link jika gambar gagal dimuat
                                      const parent = (e.target as HTMLImageElement).closest('a')
                                      if (parent) {
                                        parent.className = 'flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition shadow-sm'
                                        parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Lihat Dokumentasi ${i + 1}`
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Buka Foto</span>
                                  </div>
                                </a>
                              )
                            }
                            // Fallback untuk URL yang tidak bisa jadi gambar (mis. Docs/Slides)
                            return (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition shadow-sm">
                                <FileDown size={14} /> Lihat Dokumentasi {lap.dokumentasi_urls!.length > 1 ? i + 1 : ''}
                              </a>
                            )
                          })
                        ) : (
                          <span className="text-gray-400 text-xs italic">Tidak ada foto</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-700 text-xs mb-2 uppercase tracking-wide">Materi</h4>
                      <div className="flex flex-wrap gap-2">
                        {lap.materi_urls && lap.materi_urls.length > 0 ? (
                          lap.materi_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition shadow-sm">
                              <FileDown size={14} /> Download Materi {lap.materi_urls!.length > 1 ? i + 1 : ''}
                            </a>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs italic">Tidak ada materi</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-navy-dark mb-1">Status:</label>
                      <select
                        value={lap._status}
                        onChange={(e) => handleSelectChange(lap.id, e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-main outline-none text-sm"
                      >
                        <option value="Untuk Diketahui">Untuk Diketahui</option>
                        <option value="Perlu Tindak Lanjut Bidang Teknis">Perlu Tindak Lanjut</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-navy-dark mb-1">Catatan [{activeRole}]:</label>
                      <textarea
                        rows={2}
                        value={lap._catatan_baru}
                        onChange={(e) => handleTextChange(lap.id, e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-main outline-none text-sm"
                        placeholder="Ketik evaluasi Anda di sini..."
                      />
                    </div>
                  </div>

                  <div className="text-right mt-2 border-t pt-4">
                    <button
                      className={`font-bold py-2.5 px-6 rounded-lg transition shadow text-sm flex items-center justify-center ml-auto ${savingRow === lap.id
                          ? 'bg-amber-300 text-navy-dark cursor-not-allowed'
                          : 'bg-amber-main hover:bg-amber-hover text-navy-dark'
                        }`}
                      onClick={() => simpanCatatan(lap.id)}
                      disabled={savingRow !== null}
                    >
                      {savingRow === lap.id ? <><Loader2 className="animate-spin mr-2" size={16} /> Menyimpan...</> : <><Save className="mr-2" size={16} /> Simpan Evaluasi</>}
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