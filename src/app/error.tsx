'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  LayoutDashboard,
} from 'lucide-react'
import { formatUserFriendlyError, logSystemError } from '@/lib/error-handler'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalErrorPage({ error, reset }: ErrorBoundaryProps) {
  const [copied, setCopied] = useState(false)
  const friendly = useMemo(() => formatUserFriendlyError(error), [error])

  useEffect(() => {
    logSystemError(friendly.errorCode, error, 'AppErrorBoundary')
  }, [error, friendly.errorCode])

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(friendly.errorCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // safe fallback if clipboard is unavailable
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6 text-center">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
          <AlertTriangle size={28} />
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-bold text-white mb-2">
          Terjadi Kendala Teknis
        </h1>

        {/* Friendly Message (Technical Details Masked) */}
        <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
          {friendly.userMessage}
        </p>

        {/* Error Reference Ticket Box */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 mb-6 flex items-center justify-between gap-2">
          <div className="text-left">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Kode Referensi
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-primary">
              {friendly.errorCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-600"
            title="Salin kode referensi"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Tersalin</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
          >
            <RotateCcw size={15} />
            <span>Coba Lagi</span>
          </button>

          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs sm:text-sm font-semibold transition cursor-pointer border border-slate-600"
          >
            <LayoutDashboard size={15} />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>

        {/* Footer Guidance */}
        <p className="text-[10px] text-slate-400 mt-5">
          SIMPELGAS - Dinas Tenaga Kerja Kota Surakarta
        </p>
      </div>
    </div>
  )
}
