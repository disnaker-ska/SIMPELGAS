import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function PimpinanLoading() {
  return (
    <div className="pt-16 lg:pt-0 p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Pimpinan Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-2">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Stats Counter Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Report Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-8 w-44 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
