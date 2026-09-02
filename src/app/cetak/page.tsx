import { getAllLaporan, getPegawai } from '@/lib/actions'
import { CetakClient } from '@/components/cetak-client'

export const dynamic = 'force-dynamic'

export default async function CetakPage() {
  const [laporanList, pegawaiList] = await Promise.all([
    getAllLaporan(),
    getPegawai(),
  ])

  return (
    <div className="pt-16 lg:pt-0 w-full space-y-6">
      <CetakClient initialLaporan={laporanList} pegawaiList={pegawaiList} />
    </div>
  )
}
