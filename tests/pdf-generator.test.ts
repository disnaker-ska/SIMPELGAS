import { describe, it, expect, vi } from 'vitest'
import { sanitizeFilename, buildLaporanHTML, calculateSmartPageBreaks } from '@/lib/pdf-generator'
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

  it('annotates critical sections with data-pdf-avoid-break in buildLaporanHTML', () => {
    const html = buildLaporanHTML(mockLaporan, mockPegawai, 'data:image/png;base64,mockLogo', [
      { src: 'data:image/jpeg;base64,mockImg', isDoc: false },
    ])

    expect(html).toContain('data-pdf-avoid-break')
    expect(html).toMatch(/<div[^>]*data-pdf-avoid-break[^>]*class="doc-item"/)
    expect(html).toMatch(/<div[^>]*data-pdf-avoid-break[^>]*class="signature-container"/)
  })

  it('calculates smart page breaks without cutting through avoid-break elements', () => {
    const mockContainer = {
      offsetWidth: 794,
      getBoundingClientRect: () => ({ top: 100, bottom: 3100, height: 3000 }),
      querySelectorAll: vi.fn((selector: string) => {
        if (selector.includes('data-pdf-avoid-break')) {
          return [
            {
              getBoundingClientRect: () => ({
                top: 100 + 1000, // relative top = 1000, scaled = 2000
                bottom: 100 + 1250, // relative bottom = 1250, scaled = 2500
                height: 250,
              }),
            },
          ]
        }
        return []
      }),
    } as any

    const canvasScale = 2
    const canvasHeight = 5000
    const pageCanvasHeight = 2246

    const slices = calculateSmartPageBreaks(mockContainer, canvasScale, canvasHeight, pageCanvasHeight)

    expect(slices.length).toBeGreaterThanOrEqual(2)
    // Page 1 should stop before 2000 so the element is not sliced at 2246
    expect(slices[0]).toEqual({ startY: 0, height: 2000 })
    expect(slices[1].startY).toBe(2000)
  })

  it('renders container at origin (0, 0) and exports PDF cleanly without negative offset', async () => {
    let capturedLeft = ''
    let capturedTop = ''
    let capturedZIndex = ''
    let capturedFileName = ''
    let addImageCalls = 0

    // Setup browser DOM environment mock
    const originalWindow = global.window
    const originalDocument = global.document
    const originalFetch = global.fetch

    const createdElements: any[] = []
    global.window = {} as any
    global.document = {
      createElement: vi.fn((tag: string) => {
        const el: any = {
          tagName: tag.toUpperCase(),
          style: {},
          querySelectorAll: vi.fn(() => []),
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          getContext: vi.fn(() => ({
            fillStyle: '',
            fillRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockCanvasData'),
        }
        createdElements.push(el)
        return el
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        contains: vi.fn(() => true),
      },
    } as any

    // Mock html2canvas
    const html2canvasMock = vi.fn(async (element: HTMLElement) => {
      capturedLeft = element.style.left
      capturedTop = element.style.top
      capturedZIndex = element.style.zIndex

      return {
        width: 1588,
        height: 2246, // exactly 1 A4 page at 2x scale
        getContext: () => ({
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage: vi.fn(),
        }),
        toDataURL: () => 'data:image/jpeg;base64,mockImageData',
      }
    })

    // Mock jsPDF
    const saveMock = vi.fn((name: string) => {
      capturedFileName = name
    })
    const addImageMock = vi.fn(() => {
      addImageCalls++
    })
    const addPageMock = vi.fn()

    class MockJsPDF {
      save = saveMock
      addImage = addImageMock
      addPage = addPageMock
    }

    vi.doMock('html2canvas', () => ({ default: html2canvasMock }))
    vi.doMock('jspdf', () => ({ jsPDF: MockJsPDF }))
    vi.resetModules()

    const { generateLaporanPDF } = await import('@/lib/pdf-generator')

    // Mock window fetch for logo
    global.fetch = vi.fn().mockResolvedValue({
      blob: async () => new Blob(['logo'], { type: 'image/png' }),
    } as any)

    try {
      await generateLaporanPDF(mockLaporan, mockPegawai)

      expect(capturedLeft).toBe('0px')
      expect(capturedTop).toBe('0px')
      expect(capturedZIndex).toBe('-9999')
      expect(capturedFileName).toBe('Laporan_Penugasan_Budi_Santoso_S_Kom_2026-09-01.pdf')
      expect(addImageCalls).toBeGreaterThanOrEqual(1)
    } finally {
      global.window = originalWindow
      global.document = originalDocument
      global.fetch = originalFetch
    }
  })
})
