import { describe, it, expect } from 'vitest'
import { getDashboardStats } from '@/lib/actions'
import type { Laporan } from '@/lib/types'

describe('getDashboardStats', () => {
  it('calculates stats correctly from laporan array', async () => {
    const mockLaporan: Laporan[] = [
      {
        id: '2',
        pegawai_id: 'Budi Santoso',
        bidang: 'BIDANG PPTK',
        jabatan: 'Staff',
        jenis_penugasan: 'Luar Daerah',
        tanggal_kegiatan: '2026-08-25',
        nama_kegiatan: 'Rakor',
        tempat_kegiatan: 'Semarang',
        penyelenggara: 'Disnaker',
        tamu_undangan: null,
        catatan_hasil: null,
        dokumentasi_urls: null,
        materi_urls: null,
        status_tindak_lanjut: 'Selesai',
        catatan_pimpinan: '[Kadis]: OK',
        created_at: '',
        updated_at: '',
        pegawai: {
          id: '1',
          nama: 'Budi Santoso',
          nip: null,
          bidang: 'BIDANG PPTK',
          jabatan: 'Staff',
          is_active: true,
          created_at: '',
        },
      },
      {
        id: '3',
        pegawai_id: 'Budi Santoso',
        bidang: 'BIDANG PPTK',
        jabatan: 'Staff',
        jenis_penugasan: 'Dalam Daerah',
        tanggal_kegiatan: '2026-08-26',
        nama_kegiatan: 'Sosialisasi',
        tempat_kegiatan: 'Solo',
        penyelenggara: 'Disnaker',
        tamu_undangan: null,
        catatan_hasil: null,
        dokumentasi_urls: null,
        materi_urls: null,
        status_tindak_lanjut: 'Untuk Diketahui',
        catatan_pimpinan: null,
        created_at: '',
        updated_at: '',
        pegawai: {
          id: '1',
          nama: 'Budi Santoso',
          nip: null,
          bidang: 'BIDANG PPTK',
          jabatan: 'Staff',
          is_active: true,
          created_at: '',
        },
      },
      {
        id: '4',
        pegawai_id: 'Siti Rahma',
        bidang: 'SEKRETARIAT',
        jabatan: 'Staff',
        jenis_penugasan: 'Dalam Daerah',
        tanggal_kegiatan: '2026-08-27',
        nama_kegiatan: 'Workshop',
        tempat_kegiatan: 'Solo',
        penyelenggara: 'Disnaker',
        tamu_undangan: null,
        catatan_hasil: null,
        dokumentasi_urls: null,
        materi_urls: null,
        status_tindak_lanjut: 'Untuk Diketahui',
        catatan_pimpinan: '   ', // whitespace should not count as evaluated
        created_at: '',
        updated_at: '',
        pegawai: {
          id: '2',
          nama: 'Siti Rahma',
          nip: null,
          bidang: 'SEKRETARIAT',
          jabatan: 'Staff',
          is_active: true,
          created_at: '',
        },
      },
    ]

    const stats = await getDashboardStats(mockLaporan)
    expect(stats.totalLaporan).toBe(3)
    expect(stats.uniquePegawai).toBe(2)
    expect(stats.totalDievaluasi).toBe(1)
  })

  it('handles empty laporan array gracefully', async () => {
    const stats = await getDashboardStats([])
    expect(stats.totalLaporan).toBe(0)
    expect(stats.uniquePegawai).toBe(0)
    expect(stats.totalDievaluasi).toBe(0)
  })
})
