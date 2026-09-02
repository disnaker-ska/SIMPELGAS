import { describe, it, expect } from 'vitest'
import {
  LaporanFormDataSchema,
  EvaluasiPimpinanSchema,
  LoginPimpinanSchema,
} from '../src/lib/validations'

describe('Zod Validation Schemas', () => {
  it('validates correct LaporanFormData', () => {
    const validData = {
      pegawai_id: 'Ahmad Dahlan',
      bidang: 'Sekretariat',
      jabatan: 'Staff',
      jenis_penugasan: 'Rapat Koordinasi',
      tanggal_kegiatan: '2026-09-02',
      nama_kegiatan: 'Rapat Koordinasi Evaluasi',
      tempat_kegiatan: 'Ruang Rapat Disnaker',
      penyelenggara: 'Disnaker Surakarta',
      tamu_undangan: 'Sekretaris Dinas',
      catatan_hasil: 'Telah dilaksanakan koordinasi penyusunan anggaran.',
    }
    const result = LaporanFormDataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects LaporanFormData with invalid date or empty required fields', () => {
    const invalidDate = {
      pegawai_id: 'Ahmad Dahlan',
      bidang: 'Sekretariat',
      jabatan: 'Staff',
      jenis_penugasan: 'Rapat Koordinasi',
      tanggal_kegiatan: '02-09-2026', // wrong format
      nama_kegiatan: 'Rapat',
      tempat_kegiatan: 'Disnaker',
      penyelenggara: 'Disnaker',
      tamu_undangan: '-',
      catatan_hasil: 'Catatan',
    }
    expect(LaporanFormDataSchema.safeParse(invalidDate).success).toBe(false)

    const emptyPegawai = {
      ...invalidDate,
      tanggal_kegiatan: '2026-09-02',
      pegawai_id: '   ', // whitespace only
    }
    expect(LaporanFormDataSchema.safeParse(emptyPegawai).success).toBe(false)
  })

  it('validates EvaluasiPimpinan with official status enum', () => {
    const valid = {
      rowIndex: 2,
      status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
      catatan_pimpinan: 'Lanjutkan koordinasi.',
    }
    expect(EvaluasiPimpinanSchema.safeParse(valid).success).toBe(true)

    const invalidStatus = {
      rowIndex: 2,
      status_tindak_lanjut: 'Status Sembarangan',
      catatan_pimpinan: 'Catatan',
    }
    expect(EvaluasiPimpinanSchema.safeParse(invalidStatus).success).toBe(false)

    const invalidRowIndex = {
      rowIndex: -1,
      status_tindak_lanjut: 'Selesai (Untuk Diketahui)',
      catatan_pimpinan: 'Catatan',
    }
    expect(EvaluasiPimpinanSchema.safeParse(invalidRowIndex).success).toBe(false)
  })

  it('validates LoginPimpinan PIN numeric length (4-6 digits)', () => {
    expect(LoginPimpinanSchema.safeParse({ pin: '1234' }).success).toBe(true)
    expect(LoginPimpinanSchema.safeParse({ pin: '123456' }).success).toBe(true)
    expect(LoginPimpinanSchema.safeParse({ pin: '12' }).success).toBe(false)
    expect(LoginPimpinanSchema.safeParse({ pin: '12345678' }).success).toBe(false)
    expect(LoginPimpinanSchema.safeParse({ pin: 'abcd' }).success).toBe(false)
  })
})
