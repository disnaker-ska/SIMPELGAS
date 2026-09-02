import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Terjadi Kendala',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-xl border border-rose-200 bg-rose-50/40 text-rose-800',
        className
      )}
    >
      <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
      <h4 className="text-sm font-bold mb-1">{title}</h4>
      <p className="text-xs text-rose-600 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      )}
    </div>
  )
}
