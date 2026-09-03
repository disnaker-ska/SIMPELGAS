/**
 * Speech Formatter & Anti-Duplication Engine
 * Digunakan untuk normalisasi ucapan Web Speech API bahasa Indonesia
 */

const SPOKEN_NUMBERS: Record<string, number> = {
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
}

/**
 * Mengonversi kata verbal tanda baca dan nomor poin bahasa Indonesia
 */
export function formatSpeechText(raw: string): string {
  if (!raw || !raw.trim()) return ''

  let text = raw.trim()

  // 1. Konversi format numbering seperti: "poin 1", "poin satu", "nomor 2", "nomor dua"
  const numberWordPattern = Object.keys(SPOKEN_NUMBERS).join('|')
  const poinRegex = new RegExp(
    `\\b(?:poin|nomor)\\s+(${numberWordPattern}|\\d+)\\b`,
    'gi'
  )
  text = text.replace(poinRegex, (_, match) => {
    const lower = match.toLowerCase()
    const num = SPOKEN_NUMBERS[lower] !== undefined ? SPOKEN_NUMBERS[lower] : match
    return `\n${num}. `
  })

  // 2. Konversi format: "1 titik", "2 titik" -> "\n1. ", "\n2. "
  text = text.replace(/\b(\d+)\s+titik\b/gi, '\n$1. ')

  // 3. Konversi perintah baris baru
  text = text.replace(/\b(?:baris\s+baru|ganti\s+baris|enter)\b/gi, '\n')

  // 4. Konversi tanda baca umum
  text = text.replace(/\btanda\s+tanya\b/gi, '? ')
  text = text.replace(/\btanda\s+seru\b/gi, '! ')
  text = text.replace(/\btitik\b/gi, '. ')
  text = text.replace(/\bkoma\b/gi, ', ')

  // 5. Bersihkan spasi berlebih sebelum tanda baca
  text = text.replace(/\s+([.,?!])/g, '$1')

  // 6. Normalisasi spasi dan baris baru
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/[ \t]*\n[ \t]*/g, '\n')
  text = text.replace(/\n+/g, '\n')

  // 7. Kapitalisasi huruf pertama setelah tanda titik, tanya, seru, atau baris baru
  text = text.replace(/(^|[.?!]\s+|\n)([a-z])/g, (_, prefix, letter) => {
    return prefix + letter.toUpperCase()
  })

  return text.trim()
}

/**
 * Mengekstrak bagian selisih (delta) jika engine mengirimkan kalimat kumulatif
 */
export function cleanCumulativeDelta(previousText: string, currentTranscript: string): string {
  const prev = (previousText || '').trim()
  const curr = (currentTranscript || '').trim()

  if (!prev) return curr
  if (!curr) return ''

  if (curr.toLowerCase().startsWith(prev.toLowerCase())) {
    return curr.slice(prev.length).trim()
  }

  return curr
}

/**
 * Menggabungkan teks dasar dengan chunk transkripsi baru secara cerdas tanpa duplikasi kumulatif
 */
export function mergeTranscript(baseText: string, newChunk: string): string {
  const base = (baseText || '').trim()
  const chunk = (newChunk || '').trim()

  if (!base) return chunk
  if (!chunk) return base

  const baseLower = base.toLowerCase()
  const chunkLower = chunk.toLowerCase()

  // Kasus 1: Seluruh chunk baru adalah perpanjangan kumulatif dari seluruh baseText
  if (chunkLower.startsWith(baseLower)) {
    return chunk
  }

  // Kasus 2: Chunk baru adalah perpanjangan kumulatif dari baris terakhir baseText
  const lines = base.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  if (lastLine && chunkLower.startsWith(lastLine.toLowerCase())) {
    lines[lines.length - 1] = chunk
    return lines.join('\n')
  }

  // Kasus 3: Chunk baru dimulai dengan penomoran daftar (misal: "1. ...", "2. ...")
  if (/^\d+\.\s/.test(chunk)) {
    return `${base}\n${chunk}`
  }

  // Kasus 4: Chunk baru diawali newline
  if (newChunk.startsWith('\n')) {
    return `${base}\n${chunk}`
  }

  // Kasus 5: Base berakhir dengan newline
  if (baseText.endsWith('\n')) {
    return `${base}\n${chunk}`
  }

  // Kasus 6: Kalimat bersambung biasa -> gabungkan dengan spasi
  return `${base} ${chunk}`
}
