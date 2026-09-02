import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SpeechToTextController } from '@/lib/use-speech-to-text'

describe('SpeechToTextController & Logic', () => {
  let mockRecognitionInstance: any

  beforeEach(() => {
    mockRecognitionInstance = {
      lang: '',
      continuous: false,
      interimResults: false,
      start: vi.fn(function (this: any) {
        if (typeof this.onstart === 'function') this.onstart()
      }),
      stop: vi.fn(function (this: any) {
        if (typeof this.onend === 'function') this.onend()
      }),
      abort: vi.fn(function (this: any) {
        if (typeof this.onend === 'function') this.onend()
      }),
      onstart: null,
      onend: null,
      onerror: null,
      onresult: null,
    }

    function MockSpeechRecognition(this: any) {
      return mockRecognitionInstance
    }

    ;(globalThis as any).window = globalThis
    ;(globalThis as any).webkitSpeechRecognition = MockSpeechRecognition
  })

  afterEach(() => {
    delete (globalThis as any).webkitSpeechRecognition
    delete (globalThis as any).SpeechRecognition
    vi.restoreAllMocks()
  })

  it('1. Detects isSupported as false when Web Speech API is absent', () => {
    delete (globalThis as any).webkitSpeechRecognition
    delete (globalThis as any).SpeechRecognition

    const controller = new SpeechToTextController()
    expect(controller.isSupported()).toBe(false)
  })

  it('2. Detects isSupported as true when webkitSpeechRecognition is available', () => {
    const controller = new SpeechToTextController()
    expect(controller.isSupported()).toBe(true)
  })

  it('3. Starts recognition with lang id-ID, continuous true, and interimResults true', () => {
    const controller = new SpeechToTextController({ lang: 'id-ID' })
    controller.start()

    expect(mockRecognitionInstance.lang).toBe('id-ID')
    expect(mockRecognitionInstance.continuous).toBe(true)
    expect(mockRecognitionInstance.interimResults).toBe(true)
    expect(mockRecognitionInstance.start).toHaveBeenCalled()
    expect(controller.isListening()).toBe(true)
  })

  it('4. Handles transcript extraction and triggers onTranscript callback', () => {
    const onTranscript = vi.fn()
    const controller = new SpeechToTextController({ onTranscript })
    controller.start()

    const mockEvent = {
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'menghadiri rapat evaluasi' }], { isFinal: true }),
      ],
    }

    mockRecognitionInstance.onresult(mockEvent)
    expect(onTranscript).toHaveBeenCalledWith('menghadiri rapat evaluasi', true)
  })

  it('5. Stops recognition properly', () => {
    const controller = new SpeechToTextController()
    controller.start()
    expect(controller.isListening()).toBe(true)

    controller.stop()
    expect(mockRecognitionInstance.stop).toHaveBeenCalled()
    expect(controller.isListening()).toBe(false)
  })

  it('6. Handles errors and triggers onError callback', () => {
    const onError = vi.fn()
    const controller = new SpeechToTextController({ onError })
    controller.start()

    mockRecognitionInstance.onerror({ error: 'not-allowed' })
    expect(onError).toHaveBeenCalledWith('not-allowed')
    expect(controller.isListening()).toBe(false)
  })
})
