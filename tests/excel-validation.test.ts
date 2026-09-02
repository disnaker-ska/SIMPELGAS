import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import path from 'path'
import { mapLaporanData, mapPegawaiData } from '@/lib/appscript'

describe('Validasi Data Riil dari Excel', () => {
  const filePath = path.resolve(import.meta.dirname, '../public/MONITORING DISPOSISI DISNAKER (Jawaban).xlsx')
  const wb = XLSX.readFile(filePath)

  it('memvalidasi pembacaan DATA_PEGAWAI', () => {
    const sheetPegawai = wb.Sheets['DATA_PEGAWAI']
    const rawPegawai = XLSX.utils.sheet_to_json(sheetPegawai)
    expect(rawPegawai.length).toBeGreaterThan(0)

    const mappedPegawai = rawPegawai.map((row: any, i) => mapPegawaiData(row, i))
    expect(mappedPegawai[0]).toHaveProperty('nama')
    expect(mappedPegawai[0]).toHaveProperty('bidang')
    expect(mappedPegawai[0]).toHaveProperty('jabatan')
    expect(mappedPegawai[0].nama).toBeTruthy()
  })

  it('memvalidasi pembacaan REKAP_LAPORAN dan ekstraksi URL Google Drive', () => {
    const sheetLaporan = wb.Sheets['REKAP_LAPORAN']
    const rawLaporan = XLSX.utils.sheet_to_json(sheetLaporan)
    expect(rawLaporan.length).toBe(93)

    const mapped = rawLaporan.map((row: any, i) => {
      // Tambahkan Row_Index seperti yang dikirim oleh code.gs (i + 2 karena baris 1 adalah header)
      return mapLaporanData({ ...row, Row_Index: i + 2 })
    })

    expect(mapped.length).toBe(93)

    // Cek sampel laporan yang memiliki lampiran dokumentasi
    const laporanDenganLampiran = mapped.filter((l) => l.dokumentasi_urls && l.dokumentasi_urls.length > 0)
    expect(laporanDenganLampiran.length).toBeGreaterThan(0)

    // Cek format URL Google Drive
    const sampleUrl = laporanDenganLampiran[0].dokumentasi_urls![0]
    expect(sampleUrl).toContain('drive.google.com')

    // Validasi regex ekstraksi Google Drive ID
    const driveIdMatch = sampleUrl.match(/[?&]id=([-\w]+)/) || sampleUrl.match(/\/file\/d\/([-\w]+)/)
    expect(driveIdMatch).toBeTruthy()
    expect(driveIdMatch![1].length).toBeGreaterThanOrEqual(10)
  })

  it('memvalidasi semua URL lampiran dokumentasi riil dapat diekstrak ke direct image URL lh3', async () => {
    const { getDriveDirectImageUrl } = await import('@/lib/print-utils')
    const sheetLaporan = wb.Sheets['REKAP_LAPORAN']
    const rawLaporan = XLSX.utils.sheet_to_json(sheetLaporan)
    const mapped = rawLaporan.map((row: any, i) => mapLaporanData({ ...row, Row_Index: i + 2 }))

    const laporanDenganLampiran = mapped.filter((l) => l.dokumentasi_urls && l.dokumentasi_urls.length > 0)
    expect(laporanDenganLampiran.length).toBeGreaterThan(0)

    let totalImages = 0
    let successfulDirectUrls = 0

    laporanDenganLampiran.forEach((lap) => {
      lap.dokumentasi_urls?.forEach((url) => {
        totalImages++
        const direct = getDriveDirectImageUrl(url, 800)
        if (direct && direct.includes('lh3.googleusercontent.com/d/')) {
          successfulDirectUrls++
        }
      })
    })

    expect(totalImages).toBeGreaterThan(0)
    // Seluruh gambar Google Drive di sheet harus sukses dikonversi ke lh3 direct URL
    expect(successfulDirectUrls).toBe(totalImages)
  })
})

