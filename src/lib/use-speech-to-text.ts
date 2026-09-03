'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Swal from 'sweetalert2'
import { DESIGN_TOKENS } from '@/lib/design-tokens'

export interface SpeechToTextOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onTranscript?: (text: string, isFinal: boolean) => void
  onInterim?: (text: string) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

export interface UseSpeechToTextReturn {
  isListening: boolean
  isSupported: boolean
  interimText: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
}

export class SpeechToTextController {
  private recognition: any = null
  private listening = false
  private desiredListening = false
  private restartTimeout: any = null
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
    return this.listening || this.desiredListening
  }

  start(): void {
    if (!this.isSupported()) {
      this.options.onError?.('Web Speech API tidak didukung oleh browser ini.')
      return
    }

    this.desiredListening = true
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
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
        // Keep-alive: auto-restart jika browser memutus sesi karena timeout keheningan
        if (this.desiredListening) {
          this.restartTimeout = setTimeout(() => {
            if (this.desiredListening && !this.listening) {
              try {
                this.start()
              } catch {
                // Ignore silent restart errors
              }
            }
          }, 100)
        } else {
          this.options.onEnd?.()
        }
      }

      this.recognition.onerror = (event: any) => {
        // Jangan hentikan desiredListening jika hanya 'no-speech' (keheningan)
        if (event?.error === 'no-speech' && this.desiredListening) {
          return
        }
        this.listening = false
        this.desiredListening = false
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

        if (interimTranscript) {
          this.options.onInterim?.(interimTranscript.trim())
          this.options.onTranscript?.(interimTranscript.trim(), false)
        }

        if (finalTranscript) {
          this.options.onInterim?.('')
          this.options.onTranscript?.(finalTranscript.trim(), true)
        }
      }

      this.recognition.start()
    } catch (err: any) {
      this.listening = false
      this.desiredListening = false
      this.options.onError?.(err?.message || 'Gagal memulai Speech Recognition')
    }
  }

  stop(): void {
    this.desiredListening = false
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }

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
    if (this.isListening()) this.stop()
    else this.start()
  }
}

export function useSpeechToText(options: SpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [interimText, setInterimText] = useState('')
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
        setInterimText('')
        optionsRef.current.onEnd?.()
      },
      onError: (err) => {
        setIsListening(false)
        setInterimText('')
        setError(err)
        optionsRef.current.onError?.(err)
      },
      onInterim: (text) => {
        setInterimText(text)
        optionsRef.current.onInterim?.(text)
      },
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setInterimText('')
        }
        optionsRef.current.onTranscript?.(text, isFinal)
      },
    })

    controllerRef.current = controller
    setIsSupported(controller.isSupported())

    return () => controller.stop()
  }, [])

  const startListening = useCallback(() => controllerRef.current?.start(), [])
  const stopListening = useCallback(() => {
    setInterimText('')
    controllerRef.current?.stop()
  }, [])

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
    interimText,
    error,
    startListening,
    stopListening,
    toggleListening,
  }
}
