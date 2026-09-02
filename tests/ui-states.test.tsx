import { describe, it, expect } from 'vitest'
import React from 'react'
import { Skeleton } from '../src/components/ui/skeleton'
import { EmptyState } from '../src/components/ui/empty-state'
import { ErrorState } from '../src/components/ui/error-state'

describe('UI State Components', () => {
  it('renders Skeleton with pulse animation class', () => {
    const el = Skeleton({ className: 'h-4 w-20' })
    expect(el.props.className).toContain('animate-pulse')
    expect(el.props.className).toContain('bg-slate-200')
  })

  it('renders EmptyState with title and description', () => {
    const el = EmptyState({
      title: 'Tidak Ada Data',
      description: 'Coba ubah kata kunci pencarian.'
    })
    expect(el.props.children).toBeDefined()
  })

  it('renders ErrorState with message and retry trigger', () => {
    let retried = false
    const el = ErrorState({
      message: 'Gagal memuat data.',
      onRetry: () => { retried = true }
    })
    expect(el.props.children).toBeDefined()
  })
})
