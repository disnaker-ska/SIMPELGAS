import { getPegawai } from '@/lib/actions'
import { InputFormClient } from '@/components/input-form-client'

export const dynamic = 'force-dynamic'

export default async function InputPage() {
  const pegawaiList = await getPegawai()

  return (
    <div className="pt-16 lg:pt-0">
      <InputFormClient pegawaiList={pegawaiList} />
    </div>
  )
}
