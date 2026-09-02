import { describe, it, expect } from 'vitest'
import {
  getDriveFileId,
  getDriveDirectImageUrl,
  formatRichTextForPrint,
} from '@/lib/print-utils'

describe('print-utils', () => {
  describe('getDriveFileId', () => {
    it('extracts ID from ?id= format', () => {
      expect(
        getDriveFileId('https://drive.google.com/open?id=1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT')
      ).toBe('1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT')
    })

    it('extracts ID from /file/d/ format', () => {
      expect(
        getDriveFileId('https://drive.google.com/file/d/1DlNqyLZ3WFTcKNhbNO8oOeBK7CVTYIIF/view?usp=drivesdk')
      ).toBe('1DlNqyLZ3WFTcKNhbNO8oOeBK7CVTYIIF')
    })

    it('returns null for non-drive or invalid urls', () => {
      expect(getDriveFileId('https://example.com/image.png')).toBeNull()
      expect(getDriveFileId('')).toBeNull()
      expect(getDriveFileId(null as any)).toBeNull()
    })
  })

  describe('getDriveDirectImageUrl', () => {
    it('converts drive URL to lh3 direct image URL', () => {
      const driveUrl = 'https://drive.google.com/open?id=1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT'
      expect(getDriveDirectImageUrl(driveUrl, 800)).toBe(
        'https://lh3.googleusercontent.com/d/1JR4Gf_yt4jKlsL8SaN_jTWNv_JOp29TT=w800'
      )
    })

    it('returns original url if already a direct image or supabase', () => {
      const supabaseUrl = 'https://abc.supabase.co/storage/v1/object/public/images/1.jpg'
      expect(getDriveDirectImageUrl(supabaseUrl)).toBe(supabaseUrl)
    })

    it('returns null for drive documents/spreadsheets/presentations', () => {
      expect(
        getDriveDirectImageUrl('https://docs.google.com/document/d/12345/edit')
      ).toBeNull()
    })
  })

  describe('formatRichTextForPrint', () => {
    it('formats numbered lists with clean indentation and compact margin', () => {
      const input = '1. Poin satu\n2. Poin dua'
      const html = formatRichTextForPrint(input)
      expect(html).toContain('<ol')
      expect(html).toContain('Poin satu</li>')
      expect(html).toContain('Poin dua</li>')
    })

    it('formats bullet lists properly', () => {
      const input = '- Item A\n- Item B'
      const html = formatRichTextForPrint(input)
      expect(html).toContain('<ul')
      expect(html).toContain('Item A</li>')
      expect(html).toContain('Item B</li>')
    })

    it('formats regular paragraph text', () => {
      const input = 'Kegiatan berlangsung secara tertib.'
      const html = formatRichTextForPrint(input)
      expect(html).toContain('<p')
      expect(html).toContain('Kegiatan berlangsung secara tertib.')
    })

    it('handles empty or dash text gracefully', () => {
      expect(formatRichTextForPrint('')).toBe('-')
      expect(formatRichTextForPrint('-')).toBe('-')
      expect(formatRichTextForPrint(null)).toBe('-')
    })
  })
})
