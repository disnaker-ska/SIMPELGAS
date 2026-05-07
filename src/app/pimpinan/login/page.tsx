'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, UserCheck, Loader2 } from 'lucide-react'
import { loginPimpinan } from '@/lib/actions'
import Swal from 'sweetalert2'

const PIMPINAN_ROLES_NAMES = [
  'Kepala Dinas',
  'Sekretaris',
  'Kasubag Perkeu',
  'Kasubag Ako',
  'Kabid PPTK',
  'Kabid Hubungan Industrial',
]

export default function PimpinanLoginPage() {
  const router = useRouter()
  const [role, setRole] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) {
      Swal.fire({ icon: 'warning', title: 'Pilih Jabatan', text: 'Silakan pilih jabatan Anda.' })
      return
    }

    setIsLoading(true)
    const res = await loginPimpinan(role, pin)
    
    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Login',
        text: `Selamat datang, ${role}`,
        timer: 1500,
        showConfirmButton: false
      })
      router.push('/pimpinan')
      router.refresh()
    } else {
      setIsLoading(false)
      setPin('')
      Swal.fire({
        icon: 'error',
        title: 'Gagal Login',
        text: res.message || 'PIN yang Anda masukkan salah.'
      })
    }
  }

  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-navy-light/20">
        <div className="bg-navy-main p-8 text-center text-white">
          <div className="bg-amber-main w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-navy-light/30">
            <Lock className="text-navy-dark" size={36} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Portal Pimpinan</h1>
          <p className="text-blue-100/70 text-sm mt-1">Sistem Informasi Pelaporan Gas</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                <UserCheck size={14} className="mr-1.5" /> Pilih Jabatan
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-amber-main focus:bg-white outline-none font-semibold text-navy-main transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Ketuk Untuk Memilih --</option>
                {PIMPINAN_ROLES_NAMES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                <Lock size={14} className="mr-1.5" /> PIN Keamanan
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Masukkan PIN 6 Digit"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-amber-main focus:bg-white outline-none font-bold tracking-widest text-center text-lg text-navy-main transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-navy-main hover:bg-navy-dark text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span>Masuk Sekarang</span>
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 font-medium pt-2 italic">
            Hanya dapat diakses oleh Pimpinan yang berwenang.
          </p>
        </form>
      </div>
    </div>
  )
}
