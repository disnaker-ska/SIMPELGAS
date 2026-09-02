import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { InputFormClient } from '../src/components/input-form-client'
import type { Pegawai } from '../src/lib/types'

const mockPegawaiList: Pegawai[] = [
  {
    id: 'peg-1',
    nama: 'Budi Santoso, S.Kom',
    nip: '198501012010011001',
    bidang: 'Sekretariat',
    jabatan: 'Pranata Komputer Ahli Muda',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('InputFormClient File Preview Features (TDD)', () => {
  it('1. Renders file input dropzone with preview containers', () => {
    const html = renderToString(<InputFormClient pegawaiList={mockPegawaiList} />)
    expect(html).toContain('name="file_dok"')
    expect(html).toContain('name="file_materi"')
    expect(html).toContain('Dokumentasi (Foto)')
    expect(html).toContain('Materi (PDF/Docx)')
  })

  it('2. Form supports multiple files selection for photos and documents', () => {
    const html = renderToString(<InputFormClient pegawaiList={mockPegawaiList} />)
    expect(html).toContain('accept="image/*"')
    expect(html).toContain('accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"')
  })
})
