import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseSheetDate,
  mapPegawaiData,
  mapLaporanData,
  fetchPegawaiFromAppsScript,
  fetchLaporanFromAppsScript,
  submitLaporanToAppsScript,
  updateEvaluasiInAppsScript,
} from '@/lib/appscript'

describe('parseSheetDate', () => {
  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(parseSheetDate('25/08/2026')).toBe('2026-08-25')
    expect(parseSheetDate('05/01/2026')).toBe('2026-01-05')
  })

  it('keeps YYYY-MM-DD if already formatted', () => {
    expect(parseSheetDate('2026-08-25')).toBe('2026-08-25')
  })

  it('handles empty or missing date string', () => {
    expect(parseSheetDate('')).toBe('')
    expect(parseSheetDate(undefined as any)).toBe('')
  })
})

describe('mapPegawaiData', () => {
  it('correctly maps spreadsheet columns to Pegawai object', () => {
    const raw = {
      'NIP': '198501012010011001',
      'Nama Pegawai': 'Budi Santoso',
      'Bidang / Unit Kerja': 'BIDANG PPTK',
      'Jabatan': 'Pengantar Kerja',
    }

    const result = mapPegawaiData(raw, 0)
    expect(result).toEqual({
      id: '198501012010011001',
      nama: 'Budi Santoso',
      nip: '198501012010011001',
      bidang: 'BIDANG PPTK',
      jabatan: 'Pengantar Kerja',
      is_active: true,
      created_at: '',
    })
  })

  it('falls back when header names vary (e.g., Nama, Bidang)', () => {
    const raw = {
      'Nama': 'Siti Rahma',
      'Bidang': 'SEKRETARIAT',
    }

    const result = mapPegawaiData(raw, 3)
    expect(result.id).toBe('Siti Rahma')
    expect(result.nama).toBe('Siti Rahma')
    expect(result.bidang).toBe('SEKRETARIAT')
    expect(result.jabatan).toBe('Staff')
  })
})

describe('mapLaporanData', () => {
  it('correctly maps REKAP_LAPORAN row to Laporan object', () => {
    const raw = {
      Row_Index: 2,
      'Nama Pegawai': 'Budi Santoso',
      'Bidang': 'BIDANG PPTK',
      'Jenis Penugasan': 'Luar Daerah',
      'Tanggal Kegiatan': '25/08/2026',
      'Nama Kegiatan': 'Rakor Ketenagakerjaan',
      'Tempat Kegiatan': 'Semarang',
      'Penyelenggara Kegiatan': 'Disnakertrans Prov Jateng',
      'Tamu Undangan yang Hadir': 'Kadisnaker Solo',
      'Catatan Hasil Kegiatan': 'Kegiatan berjalan lancar.',
      'Dokumentasi Kegiatan': 'https://drive.google.com/open?id=123\nhttps://drive.google.com/open?id=456',
      'Materi (Jika Ada)': 'https://drive.google.com/open?id=789',
      'Status Tindak Lanjut': 'Untuk Diketahui',
      'Catatan Pimpinan': '[Kepala Dinas]: Lanjutkan koordinasi.',
    }

    const result = mapLaporanData(raw)
    expect(result.id).toBe('2')
    expect(result.pegawai_id).toBe('Budi Santoso')
    expect(result.bidang).toBe('BIDANG PPTK')
    expect(result.jenis_penugasan).toBe('Luar Daerah')
    expect(result.tanggal_kegiatan).toBe('2026-08-25')
    expect(result.nama_kegiatan).toBe('Rakor Ketenagakerjaan')
    expect(result.dokumentasi_urls).toEqual([
      'https://drive.google.com/open?id=123',
      'https://drive.google.com/open?id=456',
    ])
    expect(result.materi_urls).toEqual(['https://drive.google.com/open?id=789'])
    expect(result.pegawai?.nama).toBe('Budi Santoso')
  })
})

describe('API functions with mocked fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.APPSCRIPT_URL = 'https://script.google.com/macros/s/TEST/exec'
  })

  it('fetchPegawaiFromAppsScript returns parsed pegawai list', async () => {
    const mockData = [
      {
        'NIP': '198501012010011001',
        'Nama Pegawai': 'Budi Santoso',
        'Bidang / Unit Kerja': 'BIDANG PPTK',
        'Jabatan': 'Pengantar Kerja',
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: mockData }),
    } as any)

    const list = await fetchPegawaiFromAppsScript()
    expect(list).toHaveLength(1)
    expect(list[0].nama).toBe('Budi Santoso')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/TEST/exec?action=getPegawai',
      expect.objectContaining({ redirect: 'follow' })
    )
  })

  it('fetchPegawaiFromAppsScript returns empty array gracefully if APPSCRIPT_URL is unset', async () => {
    delete process.env.APPSCRIPT_URL
    const list = await fetchPegawaiFromAppsScript()
    expect(list).toEqual([])
  })

  it('submitLaporanToAppsScript posts payload and returns result', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    } as any)

    const payload = {
      namaPegawai: 'Budi Santoso',
      bidang: 'BIDANG PPTK',
      jenisPenugasan: 'Luar Daerah',
      tanggalKegiatan: '2026-08-25',
      namaKegiatan: 'Rakor',
      tempatKegiatan: 'Semarang',
      penyelenggara: 'Disnaker',
      tamuUndangan: 'Kadis',
      catatanHasil: 'Lancar',
      dokumentasi: [{ base64: 'abc', name: 'foto.jpg', mime: 'image/jpeg' }],
      materi: [],
    }

    const res = await submitLaporanToAppsScript(payload)
    expect(res).toEqual({ status: 'success' })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/TEST/exec',
      expect.objectContaining({
        method: 'POST',
        redirect: 'follow',
      })
    )
  })

  it('updateEvaluasiInAppsScript calls action=updatePimpinan with encoded params', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    } as any)

    const res = await updateEvaluasiInAppsScript(2, 'Disetujui', 'Bagus')
    expect(res).toEqual({ status: 'success' })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/TEST/exec?action=updatePimpinan&row=2&status=Disetujui&catatan=Bagus',
      expect.objectContaining({ redirect: 'follow' })
    )
  })
})
