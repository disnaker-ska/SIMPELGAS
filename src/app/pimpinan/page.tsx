import { getAllLaporan, getPegawai } from '@/lib/actions'
import { PimpinanClient } from '@/components/pimpinan-client'

export const dynamic = 'force-dynamic'

export default async function PimpinanPage() {
  const [laporanData, pegawaiData] = await Promise.all([
    getAllLaporan(),
    getPegawai(),
  ])

  return (
    <div className="pt-16 lg:pt-0">
      <PimpinanClient initialLaporan={laporanData} pegawaiList={pegawaiData} />
    </div>
  )
}
