'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  PieChart,
  Table,
  RefreshCw,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Laporan, DashboardStats, Pegawai } from '@/lib/types'

interface DashboardClientProps {
  initialLaporan: Laporan[]
  initialStats: DashboardStats
  pegawaiList: Pegawai[]
}

export function DashboardClient({
  initialLaporan,
  initialStats,
  pegawaiList,
}: DashboardClientProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterBidang, setFilterBidang] = useState('Semua')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [filterBulan, setFilterBulan] = useState('Semua')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const currentYear = new Date().getFullYear()

  const cleanText = (str: string) =>
    str ? str.toString().toLowerCase().replace(/\s+/g, ' ').trim() : ''
  const isPerluTindakLanjut = (str: string) =>
    cleanText(str).includes('perlu tindak lanjut')

  // Get unique bidang list
  const bidangOptions = useMemo(() => {
    return [...new Set(pegawaiList.map((p) => p.bidang).filter(Boolean))]
  }, [pegawaiList])

  // Filtered data
  const filteredData = useMemo(() => {
    let data = initialLaporan

    if (filterBidang !== 'Semua') {
      data = data.filter((item) => item.bidang === filterBidang)
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
        const itemDate = new Date(item.tanggal_kegiatan)
        if (isNaN(itemDate.getTime())) return false
        let keep = true

        if (filterBulan !== 'Semua') {
          if (
            itemDate.getMonth() + 1 !== parseInt(filterBulan) ||
            itemDate.getFullYear() !== currentYear
          ) {
            keep = false
          }
        }
        if (filterStartDate) {
          const start = new Date(filterStartDate)
          start.setHours(0, 0, 0, 0)
          if (itemDate < start) keep = false
        }
        if (filterEndDate) {
          const end = new Date(filterEndDate)
          end.setHours(23, 59, 59, 999)
          if (itemDate > end) keep = false
        }
        return keep
      })
    }
    return data
  }, [initialLaporan, filterBidang, filterStatus, filterBulan, filterStartDate, filterEndDate, currentYear])

  // Stats from filtered data
  const stats = useMemo(() => {
    const totalLaporan = filteredData.length
    const uniqueNames = new Set(
      filteredData.map((l) => l.pegawai?.nama).filter(Boolean)
    )
    const totalDievaluasi = filteredData.filter(
      (l) => l.catatan_pimpinan && l.catatan_pimpinan.trim() !== ''
    ).length
    return { totalLaporan, uniquePegawai: uniqueNames.size, totalDievaluasi }
  }, [filteredData])

  // Charts data
  const chartsData = useMemo(() => {
    const countBidang: Record<string, number> = {}
    const countJenis: Record<string, number> = {}
    filteredData.forEach((item) => {
      const bidang = item.bidang || 'Lainnya'
      const jenis = item.jenis_penugasan || 'Lainnya'
      countBidang[bidang] = (countBidang[bidang] || 0) + 1
      countJenis[jenis] = (countJenis[jenis] || 0) + 1
    })
    return {
      bidang: Object.entries(countBidang).map(([name, value]) => ({ name, value })),
      jenis: Object.entries(countJenis).map(([name, value]) => ({ name, value })),
    }
  }, [filteredData])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterBidang, filterStatus, filterBulan, filterStartDate, filterEndDate])

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const COLORS = ['#1B3C73', '#F59E0B', '#2A5499', '#10B981', '#6B7280']

  const bulanList = [
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
    { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold text-navy-main flex items-center">
          <PieChart className="mr-3 text-amber-main" size={28} /> Statistik Laporan ASN
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm text-gray-700 flex items-center outline-none focus:ring-2 focus:ring-amber-main disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="mr-2 text-navy-main" size={20} />
          <h3 className="font-bold text-navy-main text-lg">Filter Data</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bidang</label>
            <select value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-navy-light outline-none bg-gray-50 font-medium">
              <option value="Semua">Semua Bidang</option>
              {bidangOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-navy-light outline-none bg-gray-50 font-medium">
              <option value="Semua">Semua Status</option>
              <option value="Untuk Diketahui">Untuk Diketahui</option>
              <option value="Perlu Tindak Lanjut Bidang Teknis">Perlu Tindak Lanjut</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bulan ({currentYear})</label>
            <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-navy-light outline-none bg-gray-50 font-medium">
              <option value="Semua">Semua Bulan</option>
              {bulanList.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tanggal Mulai</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-navy-light outline-none bg-gray-50 font-medium" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tanggal Selesai</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-navy-light outline-none bg-gray-50 font-medium" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-navy-main flex flex-col justify-center">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Penugasan</p>
          <h3 className="text-4xl font-extrabold text-navy-dark">{stats.totalLaporan}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-amber-main flex flex-col justify-center">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Pegawai Terlibat</p>
          <h3 className="text-4xl font-extrabold text-navy-dark">{stats.uniquePegawai}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-green-500 flex flex-col justify-center">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Telah Dievaluasi</p>
          <h3 className="text-4xl font-extrabold text-navy-dark">{stats.totalDievaluasi}</h3>
        </div>
      </div>

      {/* Charts Placeholder — will use Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-navy-main mb-6 text-center">Distribusi per Bidang</h3>
          <div className="h-64 flex items-center justify-center">
            {chartsData.bidang.length > 0 ? (
              <div className="w-full space-y-2">
                {chartsData.bidang.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm flex-1 truncate">{item.name}</span>
                    <span className="text-sm font-bold text-navy-main">{item.value}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${(item.value / Math.max(...chartsData.bidang.map(b => b.value))) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Belum ada data</p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-navy-main mb-6 text-center">Berdasarkan Jenis Kegiatan</h3>
          <div className="h-64 flex items-center justify-center">
            {chartsData.jenis.length > 0 ? (
              <div className="w-full space-y-3">
                {chartsData.jenis.map((item, i) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate">{item.name}</span>
                      <span className="font-bold text-navy-main">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="h-4 rounded-full bg-navy-main transition-all" style={{ width: `${(item.value / Math.max(...chartsData.jenis.map(j => j.value))) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-6 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h3 className="font-bold text-navy-main text-lg flex items-center">
            <Table className="mr-2" size={20} /> Rincian Data Penugasan
          </h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy-main text-white text-sm">
                <th className="p-4 font-semibold whitespace-nowrap text-center">No</th>
                <th className="p-4 font-semibold whitespace-nowrap">Tanggal</th>
                <th className="p-4 font-semibold whitespace-nowrap">Nama Pegawai</th>
                <th className="p-4 font-semibold whitespace-nowrap">Bidang</th>
                <th className="p-4 font-semibold min-w-[250px]">Nama Kegiatan</th>
                <th className="p-4 font-semibold whitespace-nowrap">Tempat</th>
                <th className="p-4 font-semibold whitespace-nowrap text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 font-medium bg-gray-50">
                    Tidak ada data yang sesuai dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const isPerlu = isPerluTindakLanjut(item.status_tindak_lanjut)
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1
                  const tanggal = item.tanggal_kegiatan
                    ? new Date(item.tanggal_kegiatan).toLocaleDateString('id-ID')
                    : '-'
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-amber-500/30 hover:bg-amber-100 transition duration-200 ${
                        idx % 2 === 0 ? 'bg-amber-50' : 'bg-white'
                      }`}
                    >
                      <td className="p-3 font-bold text-center text-gray-700">{globalIdx}</td>
                      <td className="p-3 whitespace-nowrap font-medium text-gray-700">
                        <Calendar className="inline mr-1 opacity-70" size={14} /> {tanggal}
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold tracking-wide text-gray-800">
                        {item.pegawai?.nama || '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap text-gray-700">{item.bidang || '-'}</td>
                      <td className="p-3 font-medium text-gray-800">{item.nama_kegiatan || '-'}</td>
                      <td className="p-3 text-gray-700">
                        <MapPin className="inline mr-1 text-gray-400" size={14} /> {item.tempat_kegiatan || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {!isPerlu ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-bold border border-green-300 shadow-sm whitespace-nowrap">
                            Untuk Diketahui
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-bold border border-red-300 shadow-sm whitespace-nowrap">
                            Perlu Tindak Lanjut
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredData.length > itemsPerPage && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <p className="text-sm text-gray-500 font-medium">
              Menampilkan <span className="text-navy-main font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
              <span className="text-navy-main font-bold">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span>{' '}
              dari <span className="text-navy-main font-bold">{filteredData.length}</span> data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition ${
                      currentPage === i + 1
                        ? 'bg-navy-main text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
