import { describe, it, expect } from 'vitest'
import { sanitizeFilename, buildLaporanHTML } from '@/lib/pdf-generator'
import type { Laporan, Pegawai } from '@/lib/types'

const mockPegawai: Pegawai = {
  id: 'peg-1',
  nama: 'Budi Santoso, S.Kom',
  nip: '198501012010011001',
  bidang: 'Sekretariat',
  jabatan: 'Pranata Komputer Ahli Muda',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const mockLaporan: Laporan = {
  id: 'lap-1',
  pegawai_id: 'peg-1',
  bidang: 'Sekretariat',
  jabatan: 'Pranata Komputer Ahli Muda',
  jenis_penugasan: 'Rapat Koordinasi',
  tanggal_kegiatan: '2026-09-01',
  nama_kegiatan: 'Rapat Koordinasi Integrasi SIMPELGAS',
  tempat_kegiatan: 'Ruang Rapat Disnaker',
  penyelenggara: 'Disnaker Kota Surakarta',
  tamu_undangan: 'Perwakilan Bidang',
  catatan_hasil: '1. Penyelarasan alur kerja pelaporan.\n2. Verifikasi dokumen.',
  dokumentasi_urls: ['https://drive.google.com/open?id=foto1'],
  materi_urls: ['https://drive.google.com/open?id=materi1'],
  status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
  catatan_pimpinan: 'Lanjutkan koordinasi teknis.',
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-09-01T09:00:00Z',
  pegawai: mockPegawai,
}

describe('PDF Generator Helpers (TDD)', () => {
  it('sanitizes filename correctly without illegal filesystem characters', () => {
    expect(sanitizeFilename('Budi Santoso, S.Kom/M.Cs')).toBe('Budi_Santoso_S_Kom_M_Cs')
    expect(sanitizeFilename('Test: File * Name?')).toBe('Test_File_Name')
  })

  it('builds official A4 kedinasan HTML structure containing Kop Surat and metadata', () => {
    const html = buildLaporanHTML(mockLaporan, mockPegawai, 'data:image/png;base64,mockLogo', [
      { src: 'data:image/jpeg;base64,mockImg', isDoc: false },
    ])

    expect(html).toContain('PEMERINTAH KOTA SURAKARTA')
    expect(html).toContain('DINAS TENAGA KERJA')
    expect(html).toContain('LAPORAN HASIL PENUGASAN')
    expect(html).toContain('Budi Santoso, S.Kom')
    expect(html).toContain('198501012010011001')
    expect(html).toContain('Rapat Koordinasi Integrasi SIMPELGAS')
    expect(html).toContain('Arahan / Disposisi Pimpinan:')
    expect(html).toContain('Lanjutkan koordinasi teknis.')
    expect(html).toContain('Dokumentasi Kegiatan:')
    expect(html).toContain('Pegawai yang Melaporkan,')
  })
})
