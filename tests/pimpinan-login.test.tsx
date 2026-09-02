import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import PimpinanLoginPage from '../src/app/pimpinan/login/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe('PimpinanLoginPage Redesign (TDD)', () => {
  it('renders PimpinanLoginPage without crashing via SSR', () => {
    const html = renderToString(<PimpinanLoginPage />)
    expect(html).toBeDefined()
    expect(html).toContain('Portal Evaluasi Pimpinan')
    expect(html).toContain('Jabatan Pimpinan')
    expect(html).toContain('PIN')
    expect(html).toContain('Kepala Dinas')
    expect(html).toContain('Sekretaris')
    expect(html).toContain('Kabid PPTK')
    expect(html).toContain('Kabid Hubungan Industrial')
  })

  it('contains proper security notice and submit button', () => {
    const html = renderToString(<PimpinanLoginPage />)
    expect(html).toContain('Buka Portal Pimpinan')
    expect(html).toContain('Akses terbatas khusus Pejabat Struktural')
  })
})
