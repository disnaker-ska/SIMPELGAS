import { getPegawai } from '@/lib/actions'
import { CetakClient } from '@/components/cetak-client'

export const dynamic = 'force-dynamic'

export default async function CetakPage() {
  const pegawaiList = await getPegawai()
  return (
    <div className="pt-16 lg:pt-0">
      <CetakClient pegawaiList={pegawaiList} />
    </div>
  )
}
