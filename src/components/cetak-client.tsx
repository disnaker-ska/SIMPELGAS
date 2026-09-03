/* Hallmark · macrostructure: Workbench · genre: modern-minimal · theme: custom-executive
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 */
'use client'

import { useState, useMemo } from 'react'
import {
  FileDown,
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
import { generateLaporanPDF } from '@/lib/pdf-generator'
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
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

  // PDF Download Logic: Generate official A4 document directly via DOM
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
      console.error('Error saat memproses PDF:', err)
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses PDF',
        text: 'Terjadi kendala saat merender dokumen PDF. Silakan coba kembali.',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-slate-800 rounded-xl text-primary border border-slate-700/80">
            <FileDown size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Arsip &amp; Download PDF Laporan Penugasan
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Pusat pencarian riwayat laporan kegiatan dinas ASN, pratinjau lampiran berkas, dan unduh dokumen resmi format PDF kedinasan.
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
                  const isCurrentlyDownloading = downloadingId === item.id

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

                          {/* Tombol Download PDF */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(item)}
                            disabled={isCurrentlyDownloading}
                            className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                            title="Download Berkas Laporan PDF"
                          >
                            {isCurrentlyDownloading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <FileDown size={13} />
                            )}
                            <span>Download PDF</span>
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
                        className="py-2.5 px-3 bg-white hover:bg-sky-50 rounded-xl border-2 border-slate-300 hover:border-sky-500 flex items-center justify-center gap-2 text-xs font-bold text-slate-800 hover:text-sky-900 transition shadow-2xs group"
                        title={`Buka Foto ${i + 1}`}
                      >
                        <ExternalLink size={13} className="text-sky-600 group-hover:scale-110 transition shrink-0" />
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
                    <FileText size={13} className="text-emerald-600" />
                    Berkas Materi / Paparan ({selectedDetail.materi_urls.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedDetail.materi_urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-3 bg-white hover:bg-emerald-50 rounded-xl border-2 border-slate-300 hover:border-emerald-500 flex items-center justify-center gap-2 text-xs font-bold text-slate-800 hover:text-emerald-900 transition shadow-2xs group"
                        title={`Buka Berkas Materi ${i + 1}`}
                      >
                        <ExternalLink size={13} className="text-emerald-600 group-hover:scale-110 transition shrink-0" />
                        <span>Materi {i + 1}</span>
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
                className="px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer"
              >
                Tutup
              </button>

              <button
                onClick={() => {
                  const item = selectedDetail
                  setSelectedDetail(null)
                  handleDownloadPDF(item)
                }}
                disabled={downloadingId === selectedDetail.id}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {downloadingId === selectedDetail.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileDown size={15} />
                )}
                <span>Unduh Lembar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
