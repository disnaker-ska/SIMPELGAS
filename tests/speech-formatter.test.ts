import { describe, it, expect } from 'vitest'
import {
  formatSpeechText,
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

    it('12. Prevents duplication after a long pause when a new utterance arrives with cumulative chunks', () => {
      let text = 'Aku menghadiri rapat internal.'
      // User pauses, then starts speaking new phrase
      text = mergeTranscript(text, formatSpeechText('pembahasan'))
      expect(text).toBe('Aku menghadiri rapat internal. Pembahasan')

      // Cumulative update of the new phrase
      text = mergeTranscript(text, formatSpeechText('pembahasan anggaran'))
      expect(text).toBe('Aku menghadiri rapat internal. Pembahasan anggaran')

      // Further cumulative update of the new phrase with punctuation
      text = mergeTranscript(text, formatSpeechText('pembahasan anggaran kegiatan titik'))
      expect(text).toBe('Aku menghadiri rapat internal. Pembahasan anggaran kegiatan.')
    })

    it('13. Prevents duplication on multi-line numbering list across pauses', () => {
      let text = 'Hasil kegiatan:\n1. Pembahasan anggaran'
      // User pauses for 10s, then starts item 2
      text = mergeTranscript(text, formatSpeechText('poin 2 evaluasi'))
      expect(text).toBe('Hasil kegiatan:\n1. Pembahasan anggaran\n2. Evaluasi')

      text = mergeTranscript(text, formatSpeechText('poin 2 evaluasi kinerja'))
      expect(text).toBe('Hasil kegiatan:\n1. Pembahasan anggaran\n2. Evaluasi kinerja')

      text = mergeTranscript(text, formatSpeechText('poin 2 evaluasi kinerja triwulan'))
      expect(text).toBe('Hasil kegiatan:\n1. Pembahasan anggaran\n2. Evaluasi kinerja triwulan')
    })

    it('14. Does not duplicate when unpunctuated speech is followed by pause and continuing cumulative speech', () => {
      let text = 'Rapat dinas'
      // Pause, then speaks
      text = mergeTranscript(text, formatSpeechText('membahas'))
      expect(text).toBe('Rapat dinas membahas')

      text = mergeTranscript(text, formatSpeechText('membahas anggaran'))
      expect(text).toBe('Rapat dinas membahas anggaran')
    })
  })
})
