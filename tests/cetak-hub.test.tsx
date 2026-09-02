import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { CetakClient } from '../src/components/cetak-client'
import type { Pegawai, Laporan } from '../src/lib/types'

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
  {
    id: 'peg-2',
    nama: 'Siti Rahayu, S.E.',
    nip: '198902022012022002',
    bidang: 'Bidang Hubungan Industrial',
    jabatan: 'Pengawas Ketenagakerjaan',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

const mockLaporanList: Laporan[] = [
  {
    id: '1',
    pegawai_id: 'peg-1',
    bidang: 'Sekretariat',
    jabatan: 'Pranata Komputer Ahli Muda',
    jenis_penugasan: 'Rapat Koordinasi',
    tanggal_kegiatan: '2026-09-01',
    nama_kegiatan: 'Rapat Koordinasi Integrasi SIMPELGAS',
    tempat_kegiatan: 'Ruang Rapat Disnaker',
    penyelenggara: 'Disnaker Kota Surakarta',
    tamu_undangan: 'Perwakilan Bidang',
    catatan_hasil: 'Penyelarasan alur kerja pelaporan penugasan ASN.',
    dokumentasi_urls: ['https://drive.google.com/open?id=foto1'],
    materi_urls: ['https://drive.google.com/open?id=materi1'],
    status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
    catatan_pimpinan: 'Lanjutkan koordinasi teknis.',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
    pegawai: mockPegawaiList[0],
  },
  {
    id: '2',
    pegawai_id: 'peg-2',
    bidang: 'Bidang Hubungan Industrial',
    jabatan: 'Pengawas Ketenagakerjaan',
    jenis_penugasan: 'Monitoring & Evaluasi',
    tanggal_kegiatan: '2026-09-02',
    nama_kegiatan: 'Monev Ketenagakerjaan Perusahaan A',
    tempat_kegiatan: 'Kawasan Industri Solo',
    penyelenggara: 'Disnaker Kota Surakarta',
    tamu_undangan: 'HRD Perusahaan',
    catatan_hasil: 'Pemeriksaan kepatuhan norma kerja.',
    dokumentasi_urls: [],
    materi_urls: [],
    status_tindak_lanjut: 'Perlu Tindak Lanjut',
    catatan_pimpinan: null,
    created_at: '2026-09-02T08:00:00Z',
    updated_at: '2026-09-02T09:00:00Z',
    pegawai: mockPegawaiList[1],
  },
]

describe('CetakClient - Pusat Arsip & Print Hub (TDD)', () => {
  it('renders CetakClient with initialLaporan and pegawaiList without throwing', () => {
    const html = renderToString(
      <CetakClient initialLaporan={mockLaporanList} pegawaiList={mockPegawaiList} />
    )
    expect(html).toBeDefined()
    expect(html).toContain('Arsip &amp; Cetak Laporan')
  })

  it('renders search bar and filter controls', () => {
    const html = renderToString(
      <CetakClient initialLaporan={mockLaporanList} pegawaiList={mockPegawaiList} />
    )
    expect(html).toContain('placeholder="Cari nama pegawai, kegiatan, tempat..."')
    expect(html).toContain('Semua Bidang')
  })

  it('renders the master table with report rows and action buttons', () => {
    const html = renderToString(
      <CetakClient initialLaporan={mockLaporanList} pegawaiList={mockPegawaiList} />
    )
    expect(html).toContain('Rapat Koordinasi Integrasi SIMPELGAS')
    expect(html).toContain('Monev Ketenagakerjaan Perusahaan A')
    expect(html).toContain('Cetak')
    expect(html).toContain('Detail')
  })
})
