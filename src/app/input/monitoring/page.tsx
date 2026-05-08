import { getPegawai } from '@/lib/actions'
import { MonitoringInternalClient } from '@/components/monitoring-internal-client'

export const dynamic = 'force-dynamic'

export default async function MonitoringInternalPage() {
  const pegawaiList = await getPegawai()

  return (
    <div className="pt-16 lg:pt-0">
      <MonitoringInternalClient pegawaiList={pegawaiList} />
    </div>
  )
}
