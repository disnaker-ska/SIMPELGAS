import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DashboardClient } from '../src/components/dashboard-client'
import type { Laporan, Pegawai, DashboardStats } from '../src/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}))

const mockPegawaiList: Pegawai[] = [
  {
    id: 'peg-1',
    nama: 'Budi Santoso, S.Kom',
    nip: '198501012010011001',
    bidang: 'SEKRETARIAT',
    jabatan: 'Pranata Komputer Ahli Muda',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'peg-2',
    nama: 'Siti Rahayu, S.E.',
    nip: '198902022012022002',
    bidang: 'BIDANG HUBUNGAN INDUSTRIAL',
    jabatan: 'Pengawas Ketenagakerjaan',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'peg-3',
    nama: 'Agus Pratama, S.T.',
    nip: '199003032015031003',
    bidang: 'BIDANG PPTK',
    jabatan: 'Pengantar Kerja Ahli Pertama',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

const mockLaporanList: Laporan[] = [
  {
    id: '1',
    pegawai_id: 'Budi Santoso', // Name without gelar
    bidang: 'SEKRETARIAT',
    jabatan: 'Staff',
    jenis_penugasan: 'Rapat Koordinasi',
    tanggal_kegiatan: '2026-08-10',
    nama_kegiatan: 'Rakor A',
    tempat_kegiatan: 'Semarang',
    penyelenggara: 'Disnaker Provinsi',
    tamu_undangan: null,
    catatan_hasil: 'Selesai',
    dokumentasi_urls: null,
    materi_urls: null,
    status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
    catatan_pimpinan: '[Kadis]: Diterima',
    created_at: '2026-08-10',
    updated_at: '2026-08-10',
  },
  {
    id: '2',
    pegawai_id: 'Budi Santoso, S.Kom', // Name with gelar
    bidang: 'SEKRETARIAT',
    jabatan: 'Pranata Komputer Ahli Muda',
    jenis_penugasan: 'Sosialisasi / Bimtek',
    tanggal_kegiatan: '2026-08-12',
    nama_kegiatan: 'Bimtek B',
    tempat_kegiatan: 'Solo',
    penyelenggara: 'Disnaker Solo',
    tamu_undangan: null,
    catatan_hasil: 'Selesai',
    dokumentasi_urls: null,
    materi_urls: null,
    status_tindak_lanjut: 'Perlu Tindak Lanjut',
    catatan_pimpinan: null,
    created_at: '2026-08-12',
    updated_at: '2026-08-12',
  },
  {
    id: '3',
    pegawai_id: 'Siti Rahayu, S.E.',
    bidang: 'BIDANG HUBUNGAN INDUSTRIAL',
    jabatan: 'Pengawas Ketenagakerjaan',
    jenis_penugasan: 'Kunjungan Kerja',
    tanggal_kegiatan: '2026-08-15',
    nama_kegiatan: 'Kunker C',
    tempat_kegiatan: 'Yogyakarta',
    penyelenggara: 'Kemenaker',
    tamu_undangan: null,
    catatan_hasil: 'Hasil koordinasi',
    dokumentasi_urls: null,
    materi_urls: null,
    status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
    catatan_pimpinan: '',
    created_at: '2026-08-15',
    updated_at: '2026-08-15',
  },
]

const mockStats: DashboardStats = {
  totalLaporan: 3,
  uniquePegawai: 2,
  totalDievaluasi: 1,
}

describe('Dashboard Status Cards & Top 5 Pegawai (TDD)', () => {
  it('renders status summary cards: Untuk Diketahui, Perlu Tindak Lanjut, Sudah Dievaluasi', () => {
    const html = renderToString(
      <DashboardClient
        initialLaporan={mockLaporanList}
        initialStats={mockStats}
        pegawaiList={mockPegawaiList}
      />
    )

    expect(html).toContain('Untuk Diketahui')
    expect(html).toContain('Perlu Tindak Lanjut')
    expect(html).toContain('Sudah Dievaluasi')
  })

  it('renders Top 5 Pegawai Bertugas leaderboard card', () => {
    const html = renderToString(
      <DashboardClient
        initialLaporan={mockLaporanList}
        initialStats={mockStats}
        pegawaiList={mockPegawaiList}
      />
    )

    expect(html).toContain('Top 5 Pegawai Bertugas')
    // Budi Santoso has 2 reports (normalized across gelar)
    expect(html).toContain('Budi Santoso, S.Kom')
    // Siti Rahayu has 1 report
    expect(html).toContain('Siti Rahayu, S.E.')
  })
})
