import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import GlobalErrorPage from '@/app/error'

describe('Global Error Boundary (src/app/error.tsx) (TDD)', () => {
  it('renders user-friendly error UI with SSR without throwing', () => {
    const mockError = new Error('Database connection failed') as Error & { digest?: string }
    mockError.digest = 'ERR_12345'
    const mockReset = () => {}

    const html = renderToString(<GlobalErrorPage error={mockError} reset={mockReset} />)

    expect(html).toBeDefined()
    expect(html).toContain('Terjadi Kendala Teknis')
    expect(html).toContain('Kode Referensi')
  })

  it('provides retry and back to dashboard actions', () => {
    const mockError = new Error('Unexpected render crash')
    const html = renderToString(<GlobalErrorPage error={mockError} reset={() => {}} />)

    expect(html).toContain('Coba Lagi')
    expect(html).toContain('Kembali ke Dashboard')
  })

  it('does not leak raw technical error stack or sensitive words in HTML', () => {
    const mockError = new Error('FATAL: Connection refused at /var/app/secrets.env line 42')
    const html = renderToString(<GlobalErrorPage error={mockError} reset={() => {}} />)

    expect(html).not.toContain('/var/app/secrets.env')
    expect(html).not.toContain('FATAL')
  })
})
