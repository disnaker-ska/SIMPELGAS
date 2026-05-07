import { getAllLaporan, getDashboardStats, getPegawai } from '@/lib/actions'
import { DashboardClient } from '@/components/dashboard-client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [laporanData, pegawaiData] = await Promise.all([
    getAllLaporan(),
    getPegawai(),
  ])
  const stats = await getDashboardStats(laporanData)

  return (
    <div className="pt-16 lg:pt-0">
      <DashboardClient
        initialLaporan={laporanData}
        initialStats={stats}
        pegawaiList={pegawaiData}
      />
    </div>
  )
}
