import { describe, it, expect, vi } from 'vitest'
import {
  generateErrorCode,
  formatUserFriendlyError,
  logSystemError,
} from '@/lib/error-handler'

describe('error-handler module (TDD)', () => {
  describe('generateErrorCode', () => {
    it('generates a valid standardized ticket reference code', () => {
      const code = generateErrorCode()
      // Format: ERR-SPG-XXXX (4-5 uppercase alphanumeric chars, excluding ambiguous I, O, 1, 0)
      expect(code).toMatch(/^ERR-SPG-[A-HJ-NP-Z2-9]{4,5}$/)
    })

    it('generates unique codes on subsequent calls', () => {
      const code1 = generateErrorCode()
      const code2 = generateErrorCode()
      expect(code1).not.toBe(code2)
    })
  })

  describe('formatUserFriendlyError', () => {
    it('sanitizes technical TypeError and hides programming jargon', () => {
      const error = new TypeError("Cannot read properties of undefined (reading 'status')")
      const result = formatUserFriendlyError(error)

      expect(result.errorCode).toMatch(/^ERR-SPG-[A-HJ-NP-Z2-9]{4,5}$/)
      expect(result.userMessage).not.toContain('TypeError')
      expect(result.userMessage).not.toContain('undefined')
      expect(result.userMessage).not.toContain('properties')
      expect(result.userMessage).toContain('kendala teknis')
    })

    it('sanitizes Firefox minified runtime error', () => {
      const error = new Error("can't access property \"status\", c is undefined")
      const result = formatUserFriendlyError(error)

      expect(result.userMessage).not.toContain('c is undefined')
      expect(result.userMessage).not.toContain('property')
      expect(result.userMessage).toContain('kendala teknis')
    })

    it('detects network/connection errors and flags isNetworkIssue', () => {
      const networkError = new Error('Failed to fetch')
      const result = formatUserFriendlyError(networkError)

      expect(result.isNetworkIssue).toBe(true)
      expect(result.userMessage.toLowerCase()).toContain('koneksi internet')
    })

    it('detects payload/size errors and provides file-related guidance', () => {
      const payloadError = new Error('HTTP 413: FUNCTION_PAYLOAD_TOO_LARGE')
      const result = formatUserFriendlyError(payloadError)

      expect(result.userMessage.toLowerCase()).toContain('ukuran')
    })

    it('sanitizes backend and Google Apps Script / Spreadsheet internal errors', () => {
      const backendError = new Error('Google Apps Script mengembalikan HTTP 500: Internal Server Error')
      const result = formatUserFriendlyError(backendError)

      expect(result.userMessage).not.toContain('HTTP 500')
      expect(result.userMessage).not.toContain('Apps Script')
      expect(result.userMessage).not.toContain('Internal Server Error')
      expect(result.userMessage.toLowerCase()).toMatch(/layanan server|kendala teknis/)
    })

    it('sanitizes AI rate limit and provider errors', () => {
      const aiError = new Error('Resource has been exhausted (rate limit)')
      const result = formatUserFriendlyError(aiError)

      expect(result.userMessage).not.toContain('Resource has been exhausted')
      expect(result.userMessage.toLowerCase()).toContain('antrean')
    })

    it('handles non-Error objects and string errors gracefully', () => {
      const result = formatUserFriendlyError('String raw error', 'Pesan alternatif')
      expect(result.errorCode).toBeDefined()
      expect(result.userMessage).toBeDefined()
    })
  })

  describe('logSystemError', () => {
    it('logs structured message to console with tag and error code', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorCode = 'ERR-SPG-TEST1'
      const error = new Error('Database timeout simulation')

      logSystemError(errorCode, error, 'FormSubmit')

      expect(consoleSpy).toHaveBeenCalled()
      const logCall = consoleSpy.mock.calls[0][0]
      expect(logCall).toContain('[SIMPELGAS-ERR]')
      expect(logCall).toContain('ERR-SPG-TEST1')
      expect(logCall).toContain('FormSubmit')

      consoleSpy.mockRestore()
    })
  })
})
