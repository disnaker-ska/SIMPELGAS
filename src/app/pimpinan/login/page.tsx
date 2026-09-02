'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, UserCheck, Lock, Loader2, ShieldCheck, Building2, ArrowRight } from 'lucide-react'
import { loginPimpinan } from '@/lib/actions'
import { DESIGN_TOKENS } from '@/lib/design-tokens'
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
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Jabatan',
        text: 'Silakan pilih jabatan struktural Anda terlebih dahulu.',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
      return
    }

    if (!pin || pin.length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'PIN Tidak Lengkap',
        text: 'Masukkan minimal 4 digit angka PIN keamanan Anda.',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await loginPimpinan(role, pin)

      if (res.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Autentikasi Berhasil',
          text: `Selamat datang, ${role}`,
          timer: 1200,
          showConfirmButton: false,
        })
        router.push('/pimpinan')
        router.refresh()
      } else {
        setPin('')
        Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: res.message || 'PIN yang Anda masukkan tidak sesuai.',
          confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
        })
      }
    } catch (err: any) {
      console.error('[AUTH_ERROR]', err)
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Terputus',
        text: 'Gagal terhubung ke server. Pastikan server dev telah di-restart.',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full flex items-center justify-center p-2 sm:p-4 my-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-300">
        {/* Header Bar */}
        <div className="bg-slate-900 p-6 sm:p-7 text-center text-white border-b border-slate-800 relative">
          <div className="w-14 h-14 rounded-2xl bg-secondary/20 text-secondary border border-secondary/30 flex items-center justify-center mx-auto mb-3 shadow-md">
            <KeyRound size={28} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Portal Evaluasi Pimpinan
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
            Sistem Informasi Monitoring Penugasan ASN (SIMPELGAS) Dinas Tenaga Kerja Surakarta
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300">
            <Building2 size={12} className="text-primary" />
            <span>Disnaker Kota Surakarta</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          <div className="space-y-3.5">
            {/* Role Select */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center">
                <UserCheck size={14} className="mr-1.5 text-secondary" /> Jabatan Pimpinan <span className="text-destructive ml-0.5">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-secondary focus:bg-white focus:ring-2 focus:ring-secondary/30 outline-none font-semibold text-xs sm:text-sm text-slate-900 transition-all cursor-pointer"
              >
                <option value="">-- Pilih Jabatan Anda --</option>
                {PIMPINAN_ROLES_NAMES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* PIN Input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center">
                <Lock size={14} className="mr-1.5 text-secondary" /> PIN Keamanan Akses <span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-secondary focus:bg-white focus:ring-2 focus:ring-secondary/30 outline-none font-bold tracking-widest text-center text-lg text-slate-900 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500 text-center">
                Masukkan 4–6 digit angka PIN sesuai hak akses jabatan
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !role || !pin}
            className="w-full bg-secondary hover:bg-secondary-hover text-secondary-foreground font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Memverifikasi Akses...</span>
              </>
            ) : (
              <>
                <span>Buka Portal Pimpinan</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Security Notice */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck size={13} className="text-secondary" />
            <span>Akses terbatas khusus Pejabat Struktural &amp; Pengawas.</span>
          </div>
        </form>
      </div>
    </div>
  )
}
