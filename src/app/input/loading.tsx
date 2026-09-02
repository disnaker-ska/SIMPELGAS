import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function InputLoading() {
  return (
    <div className="pt-16 lg:pt-0 p-4 lg:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Form Header Skeleton */}
      <div className="space-y-2 pb-4 border-b border-slate-200/80">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Form Fields Card Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-44 rounded-lg" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        {/* Upload Zone Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

        {/* Submit Button Skeleton */}
        <div className="pt-2">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
