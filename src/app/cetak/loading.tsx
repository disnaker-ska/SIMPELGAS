import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function CetakLoading() {
  return (
    <div className="pt-16 lg:pt-0 p-4 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* A4 Paper Sheet Preview Skeleton */}
      <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200/80 shadow-md max-w-3xl mx-auto space-y-6 min-h-[600px]">
        {/* Letterhead Kop Surat Skeleton */}
        <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-2 text-center">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-5 w-4/5 mx-auto" />
            <Skeleton className="h-3 w-1/2 mx-auto" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center pt-2">
          <Skeleton className="h-5 w-60 mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>

        {/* Content Rows Skeleton */}
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
