import { getAllLaporan, getPegawai, getPimpinanSession } from '@/lib/actions'
import { PimpinanClient } from '@/components/pimpinan-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PimpinanPage() {
  const session = await getPimpinanSession()
  
  if (!session) {
    redirect('/pimpinan/login')
  }

  const [laporanData, pegawaiData] = await Promise.all([
    getAllLaporan(),
    getPegawai(),
  ])

  return (
    <div className="pt-16 lg:pt-0">
      <PimpinanClient 
        initialLaporan={laporanData} 
        pegawaiList={pegawaiData} 
        session={session}
      />
    </div>
  )
}
