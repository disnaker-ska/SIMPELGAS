'use client'

import { useState } from 'react'
import { Sparkles, FileText, Check, Copy, X, ArrowRight, Bot } from 'lucide-react'
import Swal from 'sweetalert2'

interface AiCompareModalProps {
  isOpen: boolean
  originalText: string
  enhancedText: string
  provider?: 'gemini' | 'openrouter'
  onClose: () => void
  onApply: (appliedText: string) => void
}

export function AiCompareModal({
  isOpen,
  originalText,
  enhancedText,
  provider = 'gemini',
  onClose,
  onApply,
}: AiCompareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enhancedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Teks AI berhasil disalin ke clipboard',
        showConfirmButton: false,
        timer: 2000,
      })
    } catch {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Gagal menyalin teks',
        showConfirmButton: false,
        timer: 2000,
      })
    }
  }

  const handleApply = () => {
    onApply(enhancedText)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Perbandingan Rekomendasi AI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 flex items-center gap-1">
                  <Bot size={11} />
                  <span>{provider === 'openrouter' ? 'OpenRouter AI' : 'Google Gemini'}</span>
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Bandingkan teks asli dengan hasil polesan formal sebelum diterapkan ke form.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Side-by-Side Comparison */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolom Kiri: Teks Asli Pengguna */}
          <div className="flex flex-col gap-2 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-500" />
                <span>Teks Asli Anda</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Asli (Belum Berubah)
              </span>
            </div>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto max-h-64 sm:max-h-80 p-2 bg-white rounded-lg border border-slate-200/80">
              {originalText || '(Teks kosong)'}
            </div>
          </div>

          {/* Kolom Kanan: Rekomendasi Hasil AI */}
          <div className="flex flex-col gap-2 bg-violet-50/60 p-3.5 sm:p-4 rounded-xl border border-violet-200">
            <div className="flex items-center justify-between pb-2 border-b border-violet-200">
              <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-violet-600" />
                <span>Rekomendasi AI (Poles Formal)</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[10px] font-semibold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100/60 px-2 py-0.5 rounded border border-violet-200 flex items-center gap-1 transition cursor-pointer"
                title="Salin hasil AI"
              >
                {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
              </button>
            </div>
            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto max-h-64 sm:max-h-80 p-2 bg-white rounded-lg border border-violet-200/80 shadow-2xs">
              {enhancedText || '(Tidak ada respons AI)'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            Teks asli di form tidak akan berubah jika Anda memilih untuk menutup / membatalkan.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Pertahankan Teks Asli
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
            >
              <span>Gunakan Rekomendasi AI</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
