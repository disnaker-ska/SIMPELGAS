/**
 * Utilitas format cetak laporan dan ekstraksi file media Google Drive
 */

/**
 * Ekstraksi ID file Google Drive dari berbagai format URL
 */
export function getDriveFileId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  const match = url.match(/[?&]id=([-\w]+)/) || url.match(/\/d\/([-\w]+)/)
  return match && match[1].length >= 10 ? match[1] : null
}

/**
 * Mengubah URL Google Drive menjadi Direct Image link via lh3.googleusercontent.com
 * Menghindari 302 redirect dan masalah CSP/cookie di iframe cetak.
 */
export function getDriveDirectImageUrl(url: string, width = 800): string | null {
  if (!url) return null
  if (url.includes('.supabase.co/storage/')) return url
  if (/\/(presentation|document|spreadsheets)\//.test(url)) return null
  const id = getDriveFileId(url)
  if (id) return `https://lh3.googleusercontent.com/d/${id}=w${width}`
  return url.startsWith('http') ? url : null
}

/**
 * Mengonversi URL gambar menjadi Base64 Data URL di browser
 * agar dokumen iframe bersifat self-contained tanpa delay saat window.print()
 */
export async function convertImageUrlToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(url)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Gagal memuat gambar ke Base64, fallback ke URL langsung:', e)
    return url
  }
}

/**
 * Merapikan teks inputan manual (numbered list, bullet list, paragraf)
 * menjadi HTML terstruktur yang padat dan rapi untuk cetak kedinasan
 */
export function formatRichTextForPrint(text?: string | null): string {
  if (!text || text.trim() === '' || text.trim() === '-') return '-'

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return '-'

  let html = ''
  let currentListType: 'ol' | 'ul' | null = null

  lines.forEach((line) => {
    // Cek bullet biasa: -, *, •
    const isBullet =
      line.startsWith('-') || line.startsWith('*') || line.startsWith('•')
    // Cek numbered list: 1., 2), 15., dsb
    const numMatch = line.match(/^(\d+)[\.\)]\s*(.*)$/)

    if (numMatch) {
      if (currentListType !== 'ol') {
        if (currentListType === 'ul') html += '</ul>'
        html +=
          '<ol style="margin: 2px 0 5px 0; padding-left: 20px; text-align: justify; line-height: 1.35;">'
        currentListType = 'ol'
      }
      html += `<li style="margin-bottom: 2px;">${numMatch[2]}</li>`
    } else if (isBullet) {
      if (currentListType !== 'ul') {
        if (currentListType === 'ol') html += '</ol>'
        html +=
          '<ul style="margin: 2px 0 5px 0; padding-left: 20px; text-align: justify; line-height: 1.35;">'
        currentListType = 'ul'
      }
      const content = line.substring(1).trim()
      html += `<li style="margin-bottom: 2px;">${content}</li>`
    } else {
      if (currentListType === 'ol') {
        html += '</ol>'
        currentListType = null
      } else if (currentListType === 'ul') {
        html += '</ul>'
        currentListType = null
      }
      html += `<p style="margin: 0 0 4px 0; text-align: justify; line-height: 1.35;">${line}</p>`
    }
  })

  if (currentListType === 'ol') html += '</ol>'
  if (currentListType === 'ul') html += '</ul>'

  return html || '-'
}
