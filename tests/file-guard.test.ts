import { describe, it, expect } from 'vitest'
import {
  MAX_FOTO_SIZE_BYTES,
  MAX_MATERI_FILE_SIZE_BYTES,
  PDF_COMPRESS_THRESHOLD_BYTES,
  MAX_TOTAL_PAYLOAD_BYTES,
  formatFileSize,
  estimateBase64Size,
  validateMateriFileSize,
  validateTotalPayloadSize,
  isPdfFile,
  compressPdfFile,
} from '@/lib/file-guard'

describe('file-guard utility and payload limits (TDD)', () => {
  it('defines correct byte constants complying with Vercel 4.5 MB limit', () => {
    expect(MAX_FOTO_SIZE_BYTES).toBe(500 * 1024)
    expect(MAX_MATERI_FILE_SIZE_BYTES).toBe(3.5 * 1024 * 1024)
    expect(PDF_COMPRESS_THRESHOLD_BYTES).toBe(3.0 * 1024 * 1024)
    expect(MAX_TOTAL_PAYLOAD_BYTES).toBe(4.0 * 1024 * 1024)
  })

  it('formats file sizes accurately for user display', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(500 * 1024)).toBe('500 KB')
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe('3.5 MB')
    expect(formatFileSize(6 * 1024 * 1024)).toBe('6 MB')
  })

  it('calculates estimated base64 size with ~33.3% inflation', () => {
    // 3 bytes binary = 4 bytes base64
    expect(estimateBase64Size(3000)).toBe(4000)
    expect(estimateBase64Size(3 * 1024 * 1024)).toBe(4 * 1024 * 1024)
  })

  describe('validateMateriFileSize', () => {
    it('approves files under 3.5 MB', () => {
      const file = { name: 'laporan.pdf', size: 2 * 1024 * 1024 }
      const res = validateMateriFileSize(file)
      expect(res.valid).toBe(true)
      expect(res.message).toBeUndefined()
    })

    it('rejects files exceeding 3.5 MB with an informative message', () => {
      const file = { name: 'Paparan Komisi IV.pdf', size: 6 * 1024 * 1024 }
      const res = validateMateriFileSize(file)
      expect(res.valid).toBe(false)
      expect(res.message).toBeDefined()
      expect(res.message).toContain('Paparan Komisi IV.pdf')
      expect(res.message).toContain('6 MB')
      expect(res.message).toContain('3.5 MB')
    })
  })

  describe('validateTotalPayloadSize', () => {
    it('passes when total size of docs and materials is under 4.0 MB', () => {
      const docs = [{ size: 250 * 1024 }, { size: 300 * 1024 }] // 550 KB
      const mats = [{ size: 1.5 * 1024 * 1024 }] // 1.5 MB
      const res = validateTotalPayloadSize(docs, mats)
      expect(res.valid).toBe(true)
      expect(res.totalBytes).toBe(550 * 1024 + 1.5 * 1024 * 1024)
    })

    it('rejects when cumulative files exceed 4.0 MB limit', () => {
      const docs = [{ size: 500 * 1024 }, { size: 500 * 1024 }] // 1 MB
      const mats = [{ size: 3.5 * 1024 * 1024 }] // 3.5 MB => total 4.5 MB
      const res = validateTotalPayloadSize(docs, mats)
      expect(res.valid).toBe(false)
      expect(res.message).toContain('Total ukuran')
      expect(res.message).toContain('4 MB')
    })
  })

  describe('isPdfFile and compressPdfFile', () => {
    it('detects PDF files by MIME type or file extension', () => {
      expect(isPdfFile('dokumen.pdf', 'application/pdf')).toBe(true)
      expect(isPdfFile('paparan.PDF', '')).toBe(true)
      expect(isPdfFile('catatan.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false)
      expect(isPdfFile('gambar.jpg', 'image/jpeg')).toBe(false)
    })

    it('skips compression if file size is below threshold (3.0 MB)', async () => {
      const smallPdf = new File(['%PDF-1.4 minimal content'], 'small.pdf', {
        type: 'application/pdf',
      })
      const res = await compressPdfFile(smallPdf)
      expect(res.compressed).toBe(false)
      expect(res.file.name).toBe('small.pdf')
      expect(res.originalSize).toBe(smallPdf.size)
      expect(res.newSize).toBe(smallPdf.size)
    })

    it('skips compression gracefully if file is not a PDF', async () => {
      const docxFile = new File(['content'], 'not-a-pdf.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const res = await compressPdfFile(docxFile)
      expect(res.compressed).toBe(false)
      expect(res.file).toBe(docxFile)
    })
  })
})
