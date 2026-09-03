import { describe, it, expect } from 'vitest'
import {
  formatSpeechText,
  cleanCumulativeDelta,
  mergeTranscript,
} from '@/lib/speech-formatter'

describe('Speech Formatter & Anti-Duplication Engine', () => {
  describe('formatSpeechText', () => {
    it('1. Converts verbal punctuation correctly and capitalizes after sentence terminators', () => {
      const input = 'rapat selesai titik besok lanjut koma jam sembilan'
      const output = formatSpeechText(input)
      expect(output).toBe('Rapat selesai. Besok lanjut, jam sembilan')
    })

    it('2. Handles question mark, exclamation mark, and newlines', () => {
      const input = 'apakah sudah siap tanda tanya siap sekali tanda seru baris baru mulai sekarang'
      const output = formatSpeechText(input)
      expect(output).toBe('Apakah sudah siap? Siap sekali!\nMulai sekarang')
    })

    it('3. Converts spoken word numbers to list numbering (poin satu, poin dua)', () => {
      const input = 'poin satu pembahasan anggaran poin dua evaluasi kinerja poin tiga tindak lanjut'
      const output = formatSpeechText(input)
      expect(output).toBe('1. Pembahasan anggaran\n2. Evaluasi kinerja\n3. Tindak lanjut')
    })

    it('4. Converts numeric digits in numbering (poin 1, nomor 2, 3 titik)', () => {
      const input = 'poin 1 perkenalan peserta nomor 2 materi inti 3 titik sesi tanya jawab'
      const output = formatSpeechText(input)
      expect(output).toBe('1. Perkenalan peserta\n2. Materi inti\n3. Sesi tanya jawab')
    })

    it('5. Does not convert "poin" or "nomor" if not followed by a number or digit', () => {
      const input = 'ini adalah poin penting mengenai nomor telepon dinas'
      const output = formatSpeechText(input)
      expect(output).toBe('Ini adalah poin penting mengenai nomor telepon dinas')
    })
  })

  describe('cleanCumulativeDelta', () => {
    it('6. Extracts only the delta when recognizer sends cumulative transcript', () => {
      expect(cleanCumulativeDelta('aku', 'aku menghadiri')).toBe('menghadiri')
      expect(cleanCumulativeDelta('aku menghadiri', 'aku menghadiri rapat')).toBe('rapat')
      expect(cleanCumulativeDelta('aku menghadiri rapat', 'aku menghadiri rapat internal')).toBe('internal')
    })

    it('7. Returns full transcript if not a cumulative prefix', () => {
      expect(cleanCumulativeDelta('pembahasan selesai.', 'agenda berikutnya')).toBe('agenda berikutnya')
    })
  })

  describe('mergeTranscript', () => {
    it('8. Merges cumulative chunks without repeating previously dictated words', () => {
      let text = ''
      text = mergeTranscript(text, 'aku')
      expect(text).toBe('aku')

      text = mergeTranscript(text, 'aku menghadiri')
      expect(text).toBe('aku menghadiri')

      text = mergeTranscript(text, 'aku menghadiri rapat')
      expect(text).toBe('aku menghadiri rapat')

      text = mergeTranscript(text, 'aku menghadiri rapat internal')
      expect(text).toBe('aku menghadiri rapat internal')
    })

    it('9. Merges distinct continuing sentences with a space', () => {
      const base = 'Rapat dinas dimulai'
      const addition = 'pada pukul 09.00 WIB'
      expect(mergeTranscript(base, addition)).toBe('Rapat dinas dimulai pada pukul 09.00 WIB')
    })

    it('10. Merges numbered lists with newline separator', () => {
      const base = 'Hasil pertemuan:'
      const addition = '1. Pembahasan anggaran'
      expect(mergeTranscript(base, addition)).toBe('Hasil pertemuan:\n1. Pembahasan anggaran')
    })

    it('11. Appends additional numbered item with newline', () => {
      const base = '1. Pembahasan anggaran'
      const addition = '2. Evaluasi kinerja'
      expect(mergeTranscript(base, addition)).toBe('1. Pembahasan anggaran\n2. Evaluasi kinerja')
    })
  })
})
