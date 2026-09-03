/* Hallmark · macrostructure: Workbench · genre: modern-minimal · theme: custom-executive
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 */
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard as DashboardIcon,
  RefreshCw,
  Calendar,
  MapPin,
  Filter,
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  PieChart as PieChartIcon,
  BarChart3,
  FileSpreadsheet,
  ArrowRight,
  Printer,
  Sparkles,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { Laporan, DashboardStats, Pegawai } from '@/lib/types'
import { refreshData } from '@/lib/actions'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { DESIGN_TOKENS } from '@/lib/design-tokens'

const DynamicBidangDonutChart = dynamic(
  () => import('./analytics-charts').then((mod) => mod.BidangDonutChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-48 h-48 shrink-0 flex items-center justify-center">
        <Skeleton className="w-40 h-40 rounded-full" />
      </div>
    ),
  }
)

interface DashboardClientProps {
  initialLaporan: Laporan[]
  initialStats: DashboardStats
  pegawaiList: Pegawai[]
}

const BIDANG_COLORS = [...DESIGN_TOKENS.charts.bidang]

function cleanText(str: string): string {
  return str ? str.toString().toLowerCase().replace(/\s+/g, ' ').trim() : ''
}

function isPerluTindakLanjut(str: string): boolean {
  return cleanText(str).includes('perlu tindak lanjut')
}

export function DashboardClient({
  initialLaporan,
  initialStats: _initialStats,
  pegawaiList,
}: DashboardClientProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterBidang, setFilterBidang] = useState('Semua')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [filterBulan, setFilterBulan] = useState('Semua')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const currentYear = new Date().getFullYear()

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

  // Top 5 recent activities
  const recentActivities = useMemo(() => {
    return filteredData.slice(0, 5)
  }, [filteredData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData('all')
      router.refresh()
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setTimeout(() => setIsRefreshing(false), 600)
    }
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

  const exportToExcel = async () => {
    const XLSX = await import('xlsx')
    const exportData = filteredData.map((item, index) => {
      const isPerlu = isPerluTindakLanjut(item.status_tindak_lanjut)
      return {
        No: index + 1,
        'Tanggal Kegiatan': item.tanggal_kegiatan
          ? new Date(item.tanggal_kegiatan).toLocaleDateString('id-ID')
          : '-',
        'Nama Pegawai': item.pegawai?.nama || '-',
        NIP: item.pegawai?.nip || '-',
        Jabatan: item.jabatan || item.pegawai?.jabatan || '-',
        Bidang: item.bidang || item.pegawai?.bidang || '-',
        'Jenis Penugasan': item.jenis_penugasan || '-',
        'Nama Kegiatan': item.nama_kegiatan || '-',
        'Tempat Kegiatan': item.tempat_kegiatan || '-',
        Penyelenggara: item.penyelenggara || '-',
        'Tamu Undangan': item.tamu_undangan || '-',
        'Catatan Hasil': item.catatan_hasil || '-',
        'Status Tindak Lanjut': isPerlu ? 'Perlu Tindak Lanjut' : 'Untuk Diketahui',
        'Catatan Pimpinan': item.catatan_pimpinan || '-',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Penugasan')
    const now = new Date()
    const filename = `SIMPELGAS_Rekap_Penugasan_${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  const evalPercent =
    stats.totalLaporan > 0
      ? Math.round((stats.totalDievaluasi / stats.totalLaporan) * 100)
      : 0
  const avgPerPerson =
    stats.uniquePegawai > 0
      ? (stats.totalLaporan / stats.uniquePegawai).toFixed(1)
      : '0'

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-slate-800 rounded-xl text-primary border border-slate-700/80">
            <DashboardIcon size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Dashboard Monitoring Penugasan
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Ringkasan analitik eksekutif dan pemantauan beban kerja penugasan ASN Dinas Tenaga Kerja Surakarta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="Muat ulang data terbaru"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary' : ''} />
            <span>Sinkronisasi</span>
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer active:scale-95 shadow-sm"
            title="Ekspor rekap data ke format Microsoft Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter size={14} className="text-primary" />
            <span>Filter Data Penugasan</span>
          </div>
          {hasActiveFilter && (
            <button
              onClick={resetFilter}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw size={12} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Bidang */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Bidang / Unit Kerja</label>
            <select
              value={filterBidang}
              onChange={(e) => setFilterBidang(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none cursor-pointer"
            >
              <option value="Semua">Semua Bidang</option>
              {bidangOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Status Tindak Lanjut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Selesai (Untuk Diketahui)">Selesai (Untuk Diketahui)</option>
              <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
            </select>
          </div>

          {/* Bulan */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Bulan ({currentYear})</label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none cursor-pointer"
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
          </div>

          {/* Rentang Tanggal */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Rentang Tanggal</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Laporan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Penugasan
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {stats.totalLaporan.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-semibold text-slate-500">laporan kegiatan</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Status</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Tersinkronisasi
            </span>
          </div>
        </div>

        {/* Card 2: Pegawai Aktif */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pegawai Bertugas
              </span>
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center text-secondary">
                <Users size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {stats.uniquePegawai.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-semibold text-slate-500">personel aktif</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Rata-rata penugasan</span>
            <span className="text-slate-800 font-semibold">{avgPerPerson} per pegawai</span>
          </div>
        </div>

        {/* Card 3: Telah Dievaluasi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Evaluasi Pimpinan
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {stats.totalDievaluasi.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-semibold text-slate-500">telah di-ACC</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart: Distribusi per Bidang */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon size={16} className="text-primary" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Distribusi Laporan per Bidang
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
              {chartsData.bidang.length} Bidang
            </span>
          </div>

          {chartsData.bidang.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
              <DynamicBidangDonutChart
                data={chartsData.bidang}
                totalLaporan={stats.totalLaporan}
                colors={BIDANG_COLORS}
              />

              <div className="flex-1 w-full space-y-2">
                {chartsData.bidang.map((item, idx) => {
                  const pct =
                    stats.totalLaporan > 0
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
                          style={{
                            backgroundColor: BIDANG_COLORS[idx % BIDANG_COLORS.length],
                          }}
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
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs font-medium">
              Tidak ada data penugasan untuk filter saat ini
            </div>
          )}
        </div>

        {/* Ranked Horizontal Bars: Jenis Kegiatan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Berdasarkan Jenis Kegiatan
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
              Top {Math.min(chartsData.jenis.length, 5)} Kategori
            </span>
          </div>

          {chartsData.jenis.length > 0 ? (
            <div className="space-y-3 my-auto">
              {chartsData.jenis.slice(0, 5).map((item, idx) => {
                const maxVal = Math.max(...chartsData.jenis.map((j) => j.value), 1)
                const pct = Math.round((item.value / maxVal) * 100)
                const totalPct =
                  stats.totalLaporan > 0
                    ? Math.round((item.value / stats.totalLaporan) * 100)
                    : 0

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
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs font-medium">
              Tidak ada data kategori kegiatan
            </div>
          )}
        </div>
      </div>

      {/* 5. Recent Activity Feed & Shortcut to Cetak Hub */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Aktivitas Penugasan Terkini
              </h3>
              <p className="text-[11px] text-slate-500">
                5 pelaporan penugasan dinas terbaru yang tercatat
              </p>
            </div>
          </div>

          <Link
            href="/cetak"
            className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 transition"
          >
            <span>Buka Semua di Menu Cetak</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Belum Ada Penugasan"
              description="Belum ada aktivitas laporan kegiatan yang tercatat untuk filter ini."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivities.map((item, idx) => {
              const isPerlu = isPerluTindakLanjut(item.status_tindak_lanjut)
              const targetPeg =
                pegawaiList.find((p) => p.id === item.pegawai_id) || item.pegawai
              const namaPegawai = targetPeg?.nama || item.pegawai_id || '-'
              const tanggalStr = item.tanggal_kegiatan
                ? new Date(item.tanggal_kegiatan).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '-'

              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{namaPegawai}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {item.bidang || '-'}
                      </span>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Calendar size={12} />
                        {tanggalStr}
                      </span>
                    </div>

                    <div className="font-medium text-slate-800 line-clamp-1">
                      {item.nama_kegiatan || '-'}
                    </div>

                    {item.tempat_kegiatan && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{item.tempat_kegiatan}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isPerlu
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {isPerlu ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
                      <span>{isPerlu ? 'Perlu Tindak Lanjut' : 'Untuk Diketahui'}</span>
                    </span>

                    <Link
                      href="/cetak"
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition flex items-center gap-1"
                    >
                      <Printer size={12} className="text-primary" />
                      <span>Cetak</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom Shortcut Banner */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center">
          <Link
            href="/cetak"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-sky-800 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-300 hover:border-sky-500 shadow-xs hover:shadow-sm transition active:scale-98 cursor-pointer"
          >
            <Printer size={15} />
            <span>Kelola &amp; Cetak Seluruh Laporan ({filteredData.length} Data)</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
