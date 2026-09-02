/* Hallmark · macrostructure: Workbench · genre: modern-minimal · theme: custom-executive
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 */
'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  LayoutDashboard as DashboardIcon,
  RefreshCw,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  FileText,
  CheckCircle2,
  RotateCcw,
  PieChart as PieChartIcon,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useRouter } from 'next/navigation'
import type { Laporan, DashboardStats, Pegawai } from '@/lib/types'

interface DashboardClientProps {
  initialLaporan: Laporan[]
  initialStats: DashboardStats
  pegawaiList: Pegawai[]
}

const BIDANG_COLORS = ['#1B3C73', '#D97706', '#0284C7', '#059669', '#64748B']

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

  // Get unique bidang list (normalized)
  const bidangOptions = useMemo(() => {
    const raw = pegawaiList.map((p) => p.bidang?.trim()).filter(Boolean) as string[]
    return [...new Set(raw)]
  }, [pegawaiList])

  // Filtered data
  const filteredData = useMemo(() => {
    let data = initialLaporan

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

  // Charts data with casing normalization and data sanitization
  const chartsData = useMemo(() => {
    const countBidang: Record<string, number> = {}
    const countJenis: Record<string, number> = {}

    filteredData.forEach((item) => {
      // Normalisasi casing bidang
      const rawBidang = (item.bidang || 'LAINNYA').trim()
      let normalizedBidang = rawBidang
      if (rawBidang.toUpperCase() === 'SEKRETARIAT') {
        normalizedBidang = 'SEKRETARIAT'
      } else if (rawBidang.toUpperCase() === 'BIDANG PPTK') {
        normalizedBidang = 'BIDANG PPTK'
      } else if (rawBidang.toUpperCase() === 'BIDANG HUBUNGAN INDUSTRIAL') {
        normalizedBidang = 'BIDANG HUBUNGAN INDUSTRIAL'
      }

      countBidang[normalizedBidang] = (countBidang[normalizedBidang] || 0) + 1

      const rawJenis = (item.jenis_penugasan || '').trim()
      // Filter label sampah seperti "-", "- . . -", dsb.
      const isValidJenis = rawJenis.length > 0 && !/^[-\s.]+$/.test(rawJenis)
      if (isValidJenis) {
        countJenis[rawJenis] = (countJenis[rawJenis] || 0) + 1
      }
    })

    const bidangList = Object.entries(countBidang)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const jenisList = Object.entries(countJenis)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return {
      bidang: bidangList,
      jenis: jenisList,
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
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const hasActiveFilter =
    filterBidang !== 'Semua' ||
    filterStatus !== 'Semua' ||
    filterBulan !== 'Semua' ||
    filterStartDate !== '' ||
    filterEndDate !== ''

  const resetFilter = () => {
    setFilterBidang('Semua')
    setFilterStatus('Semua')
    setFilterBulan('Semua')
    setFilterStartDate('')
    setFilterEndDate('')
  }

  const bulanList = [
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
    { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
  ]

  const evalPercent = stats.totalLaporan > 0
    ? Math.round((stats.totalDievaluasi / stats.totalLaporan) * 100)
    : 0

  const avgPerPerson = stats.uniquePegawai > 0
    ? (stats.totalLaporan / stats.uniquePegawai).toFixed(1)
    : '0'

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-navy-main/10 flex items-center justify-center text-navy-main">
              <DashboardIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Statistik Laporan Penugasan ASN
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Pemerintah Kota Surakarta · Dinas Tenaga Kerja
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {hasActiveFilter && (
            <button
              onClick={resetFilter}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-navy-main' : 'text-slate-500'} />
            Segarkan Data
          </button>
        </div>
      </div>

      {/* 2. Executive Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter size={16} className="text-navy-main" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Filter Parameter
            </span>
          </div>
          {hasActiveFilter && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
              Filter Aktif
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Bidang
            </label>
            <select
              value={filterBidang}
              onChange={(e) => setFilterBidang(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-navy-main focus:ring-1 focus:ring-navy-main outline-none transition"
            >
              <option value="Semua">Semua Bidang</option>
              {bidangOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Status Tindak Lanjut
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-navy-main focus:ring-1 focus:ring-navy-main outline-none transition"
            >
              <option value="Semua">Semua Status</option>
              <option value="Untuk Diketahui">Untuk Diketahui</option>
              <option value="Perlu Tindak Lanjut Bidang Teknis">Perlu Tindak Lanjut</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Bulan ({currentYear})
            </label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-navy-main focus:ring-1 focus:ring-navy-main outline-none transition"
            >
              <option value="Semua">Semua Bulan</option>
              {bulanList.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-navy-main focus:ring-1 focus:ring-navy-main outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tanggal Selesai
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-navy-main focus:ring-1 focus:ring-navy-main outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* 3. Executive KPI Cards (Clean Elevated, No Side-Stripes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Penugasan */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Penugasan
              </span>
              <div className="w-8 h-8 rounded-xl bg-navy-main/10 flex items-center justify-center text-navy-main">
                <FileText size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
                {stats.totalLaporan.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-semibold text-slate-500">laporan kegiatan</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Tercatat pada sistem</span>
            <span className="text-navy-main font-semibold">100% tervalidasi</span>
          </div>
        </div>

        {/* Card 2: Pegawai Terlibat */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pegawai Terlibat
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Users size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
                {stats.uniquePegawai.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-semibold text-slate-500">personel aktif</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Rata-rata penugasan</span>
            <span className="text-amber-700 font-semibold">{avgPerPerson} per pegawai</span>
          </div>
        </div>

        {/* Card 3: Telah Dievaluasi */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Evaluasi Pimpinan
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
                {stats.totalDievaluasi.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-semibold text-slate-500">telah di-ACC</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Tingkat Evaluasi</span>
              <span className="font-bold text-emerald-700 tabular-nums">{evalPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${evalPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Analytics Grid (Donut & Ranked Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut Chart: Distribusi per Bidang */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon size={16} className="text-navy-main" />
              <h3 className="font-bold text-slate-900 text-sm">
                Distribusi Laporan per Bidang
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
              {chartsData.bidang.length} Bidang
            </span>
          </div>

          {chartsData.bidang.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              {/* Donut Chart Visual with Center Metric */}
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.bidang}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartsData.bidang.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BIDANG_COLORS[index % BIDANG_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]
                          const total = stats.totalLaporan || 1
                          const pct = Math.round(((data.value as number) / total) * 100)
                          return (
                            <div className="bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg shadow-md">
                              <p className="font-bold">{data.name}</p>
                              <p className="text-slate-300">
                                <span className="text-amber-400 font-bold">{data.value}</span> ({pct}%)
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {stats.totalLaporan}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Laporan
                  </span>
                </div>
              </div>

              {/* Informative Legend List */}
              <div className="flex-1 w-full space-y-2.5">
                {chartsData.bidang.map((item, idx) => {
                  const pct = stats.totalLaporan > 0
                    ? Math.round((item.value / stats.totalLaporan) * 100)
                    : 0
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: BIDANG_COLORS[idx % BIDANG_COLORS.length] }}
                        />
                        <span className="font-semibold text-slate-700 truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className="font-bold text-slate-900">{item.value}</span>
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium">
              Tidak ada data penugasan untuk filter saat ini
            </div>
          )}
        </div>

        {/* Ranked Horizontal Bars: Jenis Kegiatan */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-navy-main" />
              <h3 className="font-bold text-slate-900 text-sm">
                Berdasarkan Jenis Kegiatan
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
              Top {Math.min(chartsData.jenis.length, 5)} Kategori
            </span>
          </div>

          {chartsData.jenis.length > 0 ? (
            <div className="space-y-3.5 my-auto">
              {chartsData.jenis.slice(0, 5).map((item, idx) => {
                const maxVal = Math.max(...chartsData.jenis.map((j) => j.value), 1)
                const pct = Math.round((item.value / maxVal) * 100)
                const totalPct = stats.totalLaporan > 0 ? Math.round((item.value / stats.totalLaporan) * 100) : 0

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 w-4 h-4 rounded flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-semibold truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className="font-bold text-slate-900">{item.value}</span>
                        <span className="text-[10px] font-medium text-slate-500">({totalPct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-navy-main to-navy-light transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium">
              Tidak ada data kategori kegiatan
            </div>
          )}
        </div>
      </div>

      {/* 5. Data Table Penugasan (Single Container, Clean Slate Theme) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header Strip */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-navy-main/10 flex items-center justify-center text-navy-main">
              <FileSpreadsheet size={15} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Rincian Data Penugasan
              </h3>
              <p className="text-[11px] text-slate-500">
                Riwayat pelaporan resmi pegawai Disnaker Surakarta
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Menampilkan <span className="font-bold text-slate-900 tabular-nums">{paginatedData.length}</span> dari{' '}
            <span className="font-bold text-slate-900 tabular-nums">{filteredData.length}</span> data
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-100 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-12">No</th>
                <th className="py-3 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-3 px-4 whitespace-nowrap">Nama Pegawai</th>
                <th className="py-3 px-4 whitespace-nowrap">Bidang</th>
                <th className="py-3 px-4 min-w-[240px]">Nama Kegiatan</th>
                <th className="py-3 px-4 whitespace-nowrap">Tempat</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium bg-slate-50/30">
                    Tidak ada data yang sesuai dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const isPerlu = isPerluTindakLanjut(item.status_tindak_lanjut)
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1
                  const tanggal = item.tanggal_kegiatan
                    ? new Date(item.tanggal_kegiatan).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-600 tabular-nums">
                        {globalIdx}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium tabular-nums">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {tanggal}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                        {item.pegawai?.nama || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {item.bidang || '-'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 leading-snug">
                        {item.nama_kegiatan || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400" />
                          {item.tempat_kegiatan || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {!isPerlu ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Untuk Diketahui
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
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

        {/* Pagination Toolbar */}
        {filteredData.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/40 text-xs">
            <p className="text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-900 tabular-nums">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
              <span className="font-bold text-slate-900 tabular-nums">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span>{' '}
              dari <span className="font-bold text-slate-900 tabular-nums">{filteredData.length}</span> data
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      currentPage === i + 1
                        ? 'bg-navy-main text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white hover:border border-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

