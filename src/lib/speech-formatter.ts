/**
 * Speech Formatter & Anti-Duplication Engine
 * Digunakan untuk normalisasi ucapan Web Speech API bahasa Indonesia
 */

const SPOKEN_NUMBERS: Record<string, number> = {
  satu: 1,
  kesatu: 1,
  pertama: 1,
  dua: 2,
  kedua: 2,
  tiga: 3,
  ketiga: 3,
  empat: 4,
  keempat: 4,
  lima: 5,
  kelima: 5,
  enam: 6,
  keenam: 6,
  tujuh: 7,
  ketujuh: 7,
  delapan: 8,
  kedelapan: 8,
  sembilan: 9,
  kesembilan: 9,
  sepuluh: 10,
  kesepuluh: 10,
}

/**
 * Mengonversi kata verbal tanda baca dan nomor poin bahasa Indonesia
 */
export function formatSpeechText(raw: string): string {
  if (!raw || !raw.trim()) return ''

  let text = raw.trim()

  // 1. Konversi format numbering seperti: "poin 1", "poin satu", "poin nomor 1", "nomor poin 2", "poin ke-1"
  const numberWordPattern = Object.keys(SPOKEN_NUMBERS).join('|')
  const poinRegex = new RegExp(
    `\\b(?:poin|nomor)(?:\\s+(?:nomor|poin|ke[-\\s]?|ke))*\\s*(${numberWordPattern}|\\d+)\\b`,
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
 * Menggabungkan teks dasar dengan chunk transkripsi baru secara cerdas tanpa duplikasi kumulatif,
 * baik saat dikte mengalir maupun setelah jeda bicara yang panjang.
 */
export function mergeTranscript(baseText: string, newChunk: string): string {
  const base = (baseText || '').trim()
  const chunk = (newChunk || '').trim()

  if (!base) return chunk
  if (!chunk) return base

  const isListOrNewline = (str: string) => /^\d+\.\s/.test(str) || str.startsWith('\n')
  const isNumberedItem = (str: string) => /^\d+\.\s/.test(str) || /^\n\d+\.\s/.test(str)

  // 1. Bersihkan sisa kata marker sementara (misal: "Poin", "Poin nomor") di akhir teks dasar saat item bernomor tiba
  if (isNumberedItem(chunk)) {
    const trailingMarkerRegex = /(?:[ \t]*\n[ \t]*|\s+|^)(?:poin|nomor)(?:\s+(?:nomor|poin|ke[-\s]?|ke))*\s*$/i
    if (trailingMarkerRegex.test(base)) {
      const cleanedBase = base.replace(trailingMarkerRegex, '').trimEnd()
      if (!cleanedBase) {
        return chunk.trimStart()
      }
      return `${cleanedBase}\n${chunk.trimStart()}`
    }
  }

  const baseLower = base.toLowerCase()
  const chunkLower = chunk.toLowerCase()

  // 2. Kasus superset penuh: seluruh chunk baru mencakup seluruh baseText
  if (chunkLower.startsWith(baseLower)) {
    return chunk
  }

  const endsWithTerminator = (str: string) => /[.?!]$/.test(str.trim())
  const lowerFirstIfMidSentence = (target: string, prevText: string) => {
    if (!endsWithTerminator(prevText) && !prevText.endsWith('\n') && !isListOrNewline(target)) {
      if (/^[A-Z][a-z]/.test(target)) {
        return target.charAt(0).toLowerCase() + target.slice(1)
      }
    }
    return target
  }

  // 2. Tokenisasi kata untuk deteksi overlap suffix-prefix (sliding window)
  const baseMatches = [...base.matchAll(/\S+/g)]
  const chunkMatches = [...chunk.matchAll(/\S+/g)]

  if (baseMatches.length > 0 && chunkMatches.length > 0) {
    const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/gi, '')
    const maxK = Math.min(baseMatches.length, chunkMatches.length)

    for (let k = maxK; k >= 1; k--) {
      let isMatch = true
      for (let j = 0; j < k; j++) {
        const baseWord = norm(baseMatches[baseMatches.length - k + j][0])
        const chunkWord = norm(chunkMatches[j][0])
        if (baseWord !== chunkWord) {
          isMatch = false
          break
        }
      }

      if (isMatch) {
        // Jika overlap hanya 1 kata, pastikan kata terakhir di base tidak diakhiri tanda baca terminal
        // agar tidak menghapus kalimat yang sah selesai (misal: "Rapat selesai." vs "Selesai jam 9.")
        const matchedBaseRaw = baseMatches[baseMatches.length - k][0]
        if (k === 1 && /[.?!]$/.test(matchedBaseRaw)) {
          continue
        }

        const overlapIndex = baseMatches[baseMatches.length - k].index ?? 0
        const beforeOverlap = base.slice(0, overlapIndex).trimEnd()

        if (!beforeOverlap) {
          return chunk
        }

        if (beforeOverlap.endsWith('\n') || isListOrNewline(chunk)) {
          return `${beforeOverlap}\n${chunk.trimStart()}`
        }

        const adjustedChunk = lowerFirstIfMidSentence(chunk.trimStart(), beforeOverlap)
        return `${beforeOverlap} ${adjustedChunk}`
      }
    }
  }

  // 3. Kasus penomoran baru (misal: "1. ...", "2. ...") atau diawali newline
  if (isListOrNewline(chunk) || newChunk.startsWith('\n') || baseText.endsWith('\n')) {
    return `${base}\n${chunk}`
  }

  // 4. Kalimat baru biasa -> sambungkan dengan spasi
  const adjustedChunk = lowerFirstIfMidSentence(chunk, base)
  return `${base} ${adjustedChunk}`
}
