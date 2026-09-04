/**
 * SIMPELGAS Error Handler & Sanitizer
 * Mencegah kebocoran pesan teknis bahasa pemrograman ke publik
 * dan menyediakan kode tiket pelacakan error (Error Reference Code)
 */

const SAFE_ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Menghasilkan kode tiket referensi error unik terstandar (contoh: ERR-SPG-7K9A)
 * Menggunakan karakter alfanumerik tanpa karakter ambigu (I, O, 1, 0)
 */
export function generateErrorCode(): string {
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * SAFE_ALPHANUMERIC.length)
    suffix += SAFE_ALPHANUMERIC[idx]
  }
  return `ERR-SPG-${suffix}`
}

export interface FriendlyErrorResult {
  userMessage: string
  errorCode: string
  isNetworkIssue: boolean
}

/**
 * Mengonversi exception/error teknis menjadi pesan bahasa Indonesia yang ramah ASN,
 * sekaligus menyematkan Kode Tiket Referensi untuk kemudahan debugging.
 */
export function formatUserFriendlyError(
  error: unknown,
  fallbackMessage = 'Terjadi kendala teknis saat memproses permintaan Anda.'
): FriendlyErrorResult {
  const errorCode = generateErrorCode()
  let rawMessage = ''

  if (error instanceof Error) {
    rawMessage = error.message || error.name || ''
  } else if (typeof error === 'string') {
    rawMessage = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    rawMessage = String((error as any).message || '')
  }

  const lower = rawMessage.toLowerCase()

  // 1. Deteksi Gangguan Jaringan / Koneksi
  const isNetworkIssue =
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('offline') ||
    lower.includes('koneksi internet')

  if (isNetworkIssue) {
    return {
      errorCode,
      isNetworkIssue: true,
      userMessage:
        'Koneksi internet bermasalah atau server tidak merespons. Pastikan perangkat Anda terhubung ke internet yang stabil dan coba simpan kembali.',
    }
  }

  // 2. Deteksi Batas Kapasitas Payload / Berkas
  if (
    lower.includes('413') ||
    lower.includes('payload_too_large') ||
    lower.includes('payload too large') ||
    lower.includes('request entity too large') ||
    lower.includes('ukuran')
  ) {
    return {
      errorCode,
      isNetworkIssue: false,
      userMessage:
        'Ukuran berkas lampiran melebihi kapasitas pengiriman server (maksimal 4.5 MB). Silakan kompres dokumen atau kurangi foto sebelum mengirim.',
    }
  }

  // 3. Deteksi Kesalahan AI (Rate Limit, Exhausted, dsb.)
  if (
    lower.includes('rate limit') ||
    lower.includes('resource has been exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('overloaded')
  ) {
    return {
      errorCode,
      isNetworkIssue: false,
      userMessage:
        'Layanan AI sedang padat antrean pemrosesan. Silakan coba poles kembali catatan Anda dalam beberapa saat.',
    }
  }

  // 4. Deteksi Gangguan Server Backend / Apps Script / Spreadsheet
  if (
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('internal server error') ||
    lower.includes('service unavailable') ||
    lower.includes('bad gateway') ||
    lower.includes('apps script') ||
    lower.includes('spreadsheet')
  ) {
    return {
      errorCode,
      isNetworkIssue: false,
      userMessage:
        'Layanan server atau Google Spreadsheet sedang mengalami kendala pemrosesan. Silakan coba beberapa saat lagi.',
    }
  }

  // 5. Deteksi Kesalahan Teknis JavaScript / Runtime (TypeError, undefined, minified vars)
  if (
    lower.includes('typeerror') ||
    lower.includes('cannot read propert') ||
    lower.includes("can't access property") ||
    lower.includes('c is undefined') ||
    lower.includes('undefined') ||
    lower.includes('syntaxerror') ||
    lower.includes('referenceerror') ||
    lower.includes('json.parse') ||
    lower.includes('unexpected token')
  ) {
    return {
      errorCode,
      isNetworkIssue: false,
      userMessage:
        'Terjadi kendala teknis saat memproses data. Silakan coba beberapa saat lagi atau hubungi admin jika kendala berulang.',
    }
  }

  // 4. Pesan Umum / Fallback
  return {
    errorCode,
    isNetworkIssue: false,
    userMessage: fallbackMessage || 'Terjadi kendala teknis saat memproses data Anda.',
  }
}

/**
 * Mencatat error terstruktur ke konsol server/browser untuk kemudahan pelacakan
 */
export function logSystemError(
  errorCode: string,
  error: unknown,
  context = 'App'
): void {
  const timestamp = new Date().toISOString()
  console.error(
    `[SIMPELGAS-ERR][${errorCode}] [${context}] at ${timestamp}:`,
    error
  )
}
