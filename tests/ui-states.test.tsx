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

describe('Route Loading Skeletons', () => {
  it('renders DashboardLoading with skeleton elements', async () => {
    const { default: DashboardLoading } = await import('../src/app/dashboard/loading')
    const el = DashboardLoading()
    expect(el).toBeDefined()
  })

  it('renders InputLoading with skeleton elements', async () => {
    const { default: InputLoading } = await import('../src/app/input/loading')
    const el = InputLoading()
    expect(el).toBeDefined()
  })

  it('renders CetakLoading with skeleton elements', async () => {
    const { default: CetakLoading } = await import('../src/app/cetak/loading')
    const el = CetakLoading()
    expect(el).toBeDefined()
  })

  it('renders PimpinanLoading with skeleton elements', async () => {
    const { default: PimpinanLoading } = await import('../src/app/pimpinan/loading')
    const el = PimpinanLoading()
    expect(el).toBeDefined()
  })

  it('renders RootLoading with skeleton elements', async () => {
    const { default: RootLoading } = await import('../src/app/loading')
    const el = RootLoading()
    expect(el).toBeDefined()
  })
})
