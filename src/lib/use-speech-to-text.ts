'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Swal from 'sweetalert2'
import { DESIGN_TOKENS } from '@/lib/design-tokens'

export interface SpeechToTextOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onTranscript?: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

export interface UseSpeechToTextReturn {
  isListening: boolean
  isSupported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
}

export class SpeechToTextController {
  private recognition: any = null
  private listening = false
  private options: SpeechToTextOptions

  constructor(options: SpeechToTextOptions = {}) {
    this.options = {
      lang: 'id-ID',
      continuous: true,
      interimResults: true,
      ...options,
    }
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  }

  isListening(): boolean {
    return this.listening
  }

  start(): void {
    if (!this.isSupported()) {
      this.options.onError?.('Web Speech API tidak didukung oleh browser ini.')
      return
    }
    if (this.listening) return

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.recognition = new SpeechRecognitionClass()
      this.recognition.lang = this.options.lang || 'id-ID'
      this.recognition.continuous = this.options.continuous ?? true
      this.recognition.interimResults = this.options.interimResults ?? true

      this.recognition.onstart = () => {
        this.listening = true
        this.options.onStart?.()
      }
      this.recognition.onend = () => {
        this.listening = false
        this.options.onEnd?.()
      }
      this.recognition.onerror = (event: any) => {
        this.listening = false
        this.options.onError?.(event?.error || 'Terjadi kesalahan pada Speech Recognition')
      }
      this.recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          if (item.isFinal) {
            finalTranscript += item[0].transcript
          } else {
            interimTranscript += item[0].transcript
          }
        }
        const text = finalTranscript || interimTranscript
        if (text) {
          this.options.onTranscript?.(text.trim(), Boolean(finalTranscript))
        }
      }

      this.recognition.start()
    } catch (err: any) {
      this.listening = false
      this.options.onError?.(err?.message || 'Gagal memulai Speech Recognition')
    }
  }

  stop(): void {
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop()
      } catch {
        // ignore
      }
    }
    this.listening = false
  }

  toggle(): void {
    if (this.listening) this.stop()
    else this.start()
  }
}

export function useSpeechToText(options: SpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optionsRef = useRef(options)
  optionsRef.current = options

  const controllerRef = useRef<SpeechToTextController | null>(null)

  useEffect(() => {
    const controller = new SpeechToTextController({
      lang: optionsRef.current.lang || 'id-ID',
      continuous: optionsRef.current.continuous ?? true,
      interimResults: optionsRef.current.interimResults ?? true,
      onStart: () => {
        setIsListening(true)
        setError(null)
        optionsRef.current.onStart?.()
      },
      onEnd: () => {
        setIsListening(false)
        optionsRef.current.onEnd?.()
      },
      onError: (err) => {
        setIsListening(false)
        setError(err)
        optionsRef.current.onError?.(err)
      },
      onTranscript: (text, isFinal) => {
        optionsRef.current.onTranscript?.(text, isFinal)
      },
    })

    controllerRef.current = controller
    setIsSupported(controller.isSupported())

    return () => controller.stop()
  }, [])

  const startListening = useCallback(() => controllerRef.current?.start(), [])
  const stopListening = useCallback(() => controllerRef.current?.stop(), [])

  const toggleListening = useCallback(() => {
    if (!controllerRef.current?.isSupported()) {
      Swal.fire({
        icon: 'warning',
        title: 'Fitur Tidak Didukung',
        text: 'Browser Anda tidak mendukung Web Speech API untuk dikte suara. Gunakan Google Chrome atau Microsoft Edge.',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
      return
    }
    controllerRef.current.toggle()
  }, [])

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
  }
}
