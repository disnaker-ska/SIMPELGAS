'use client'

import { useState, useRef } from 'react'
import { ClipboardList, Camera, FileText, Send, Loader2, Sparkles, Users, UtensilsCrossed, Mic, MicOff } from 'lucide-react'
import Swal from 'sweetalert2'
import { submitKegiatanInternal } from '@/lib/actions'
import { DESIGN_TOKENS } from '@/lib/design-tokens'
import { useSpeechToText } from '@/lib/use-speech-to-text'
import type { Pegawai } from '@/lib/types'

interface MonitoringInternalClientProps {
  pegawaiList: Pegawai[]
}

const jenisOptions = [
  'Rapat Koordinasi Internal',
  'Sosialisasi / Bimtek Internal',
  'Rapat Evaluasi Program',
  'Briefing Pimpinan',
  'Lainnya',
]

export function MonitoringInternalClient({ pegawaiList }: MonitoringInternalClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBidang, setSelectedBidang] = useState('')
  const [hasilText, setHasilText] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const bidangOptions = [...new Set(pegawaiList.map((p) => p.bidang).filter(Boolean))]
  const filteredPegawai = pegawaiList.filter((p) => !selectedBidang || p.bidang === selectedBidang)

  const getBase64 = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      if (!file) resolve(null)
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || ''
        if (encoded.length % 4 > 0) encoded += '='.repeat(4 - (encoded.length % 4))
        resolve(encoded)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const compressImage = (file: File, maxSizeMB = 1): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) { resolve(file); return }
      if (file.size / 1024 / 1024 < maxSizeMB) { resolve(file); return }

      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob!], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
            },
            'image/jpeg',
            0.7
          )
        }
        img.onerror = (error) => reject(error)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const processFiles = async (inputName: string, isImage = false) => {
    if (!formRef.current) return []
    const input = formRef.current.elements.namedItem(inputName) as HTMLInputElement
    if (!input || !input.files || input.files.length === 0) return []
    const files = Array.from(input.files)
    return Promise.all(files.map(async (file) => {
      const processed = isImage ? await compressImage(file) : file
      const b64 = await getBase64(processed)
      return { base64: b64!, name: processed.name, mime: processed.type }
    }))
  }

  const { isListening, toggleListening } = useSpeechToText({
    lang: 'id-ID',
    onTranscript: (chunk, isFinal) => {
      if (isFinal) {
        setHasilText((prev) => {
          const trimmed = prev.trim()
          return trimmed ? `${trimmed}\n${chunk}` : chunk
        })
      }
    },
    onError: (err) => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: `Mikrofon: ${err}`,
        showConfirmButton: false,
        timer: 3000,
      })
    },
  })

  const enhanceTextWithAI = async () => {
    if (!hasilText.trim()) return
    setIsEnhancing(true)
    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hasilText }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHasilText(data.enhanced)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title:
          data.provider === 'openrouter'
            ? 'Teks disempurnakan (OpenRouter AI)'
            : 'Teks disempurnakan dengan AI',
        showConfirmButton: false,
        timer: 3000,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'AI Gagal',
        text: error.message || 'Terjadi kesalahan.',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setIsSubmitting(true)

    try {
      const [daftarHadirPayload, undanganPayload, fotoPayload, notulenPayload, jamuanPayload] = await Promise.all([
        processFiles('file_daftar_hadir', true),
        processFiles('file_undangan', false),
        processFiles('file_foto_kegiatan', true),
        processFiles('file_notulen', false),
        processFiles('file_foto_jamuan', true),
      ])

      const uploadBatch = async (_bucket: string, _payload: typeof daftarHadirPayload): Promise<string[]> => []

      const [daftarHadirUrls, undanganUrls, fotoUrls, notulenUrls, jamuanUrls] = await Promise.all([
        uploadBatch('spj-internal', daftarHadirPayload),
        uploadBatch('spj-internal', undanganPayload),
        uploadBatch('spj-internal', fotoPayload),
        uploadBatch('spj-internal', notulenPayload),
        uploadBatch('spj-internal', jamuanPayload),
      ])

      const jumlahPeserta = fd.get('jumlah_peserta') as string
      const result = await submitKegiatanInternal(
        {
          jenis_kegiatan: fd.get('jenis_kegiatan') as string,
          nama_kegiatan: fd.get('nama_kegiatan') as string,
          tanggal_kegiatan: fd.get('tanggal_kegiatan') as string,
          waktu_mulai: fd.get('waktu_mulai') as string,
          waktu_selesai: fd.get('waktu_selesai') as string,
          tempat_kegiatan: fd.get('tempat_kegiatan') as string,
          bidang: fd.get('bidang') as string,
          pic_pegawai_id: fd.get('pic_pegawai_id') as string,
          agenda: fd.get('agenda') as string,
          hasil_kegiatan: fd.get('hasil_kegiatan') as string,
          peserta: fd.get('peserta') as string,
          jumlah_peserta: jumlahPeserta ? parseInt(jumlahPeserta) : null,
        },
        daftarHadirUrls,
        undanganUrls,
        fotoUrls,
        notulenUrls,
        jamuanUrls
      )

      if (result.status === 'success') {
        Swal.fire({
          title: 'Berhasil!',
          text: 'Kegiatan internal tersimpan.',
          icon: 'success',
          confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
        })
        formRef.current?.reset()
        setHasilText('')
        setSelectedBidang('')
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('Submission Error:', error)
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: error.message || 'Pastikan koneksi internet stabil.',
        icon: 'error',
        confirmButtonColor: DESIGN_TOKENS.sweetAlert.confirmButtonColor,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 focus:bg-white transition outline-none'
  const labelClass = 'block text-sm font-semibold text-slate-700'

  return (
    <div className="relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm w-11/12 border border-slate-200">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Memproses</h3>
            <p className="text-slate-500 text-sm">Mohon tunggu, sedang menyimpan kegiatan...</p>
          </div>
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto transition-all duration-300 ${isSubmitting ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center">
            <ClipboardList className="mr-3 text-primary" size={24} /> Formulir Kegiatan Internal
          </h2>
          <p className="text-slate-400 text-sm mt-1">Dokumentasi kegiatan internal untuk tracking kelengkapan SPJ</p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Row 1: Jenis & Tanggal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="mi_jenis" className={labelClass}>Jenis Kegiatan <span className="text-destructive">*</span></label>
              <select name="jenis_kegiatan" id="mi_jenis" required className={inputClass}>
                <option value="">-- Pilih Jenis --</option>
                {jenisOptions.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="mi_tanggal" className={labelClass}>Tanggal Kegiatan <span className="text-destructive">*</span></label>
              <input type="date" name="tanggal_kegiatan" id="mi_tanggal" required className={inputClass} />
            </div>
          </div>

          {/* Row 2: Nama Kegiatan */}
          <div className="space-y-2">
            <label htmlFor="mi_nama" className={labelClass}>Nama Kegiatan <span className="text-destructive">*</span></label>
            <input type="text" name="nama_kegiatan" id="mi_nama" placeholder="Contoh: Rapat Koordinasi Triwulan III" required className={inputClass} />
          </div>

          {/* Row 3: Waktu & Tempat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="mi_waktu_mulai" className={labelClass}>Waktu Mulai</label>
              <input type="time" name="waktu_mulai" id="mi_waktu_mulai" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label htmlFor="mi_waktu_selesai" className={labelClass}>Waktu Selesai</label>
              <input type="time" name="waktu_selesai" id="mi_waktu_selesai" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label htmlFor="mi_tempat" className={labelClass}>Tempat Kegiatan <span className="text-destructive">*</span></label>
              <input type="text" name="tempat_kegiatan" id="mi_tempat" placeholder="Contoh: Ruang Rapat Lt. 3" required className={inputClass} />
            </div>
          </div>

          {/* Row 4: Bidang & PIC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="mi_bidang" className={labelClass}>Bidang Penyelenggara <span className="text-destructive">*</span></label>
              <select name="bidang" id="mi_bidang" required value={selectedBidang} onChange={(e) => setSelectedBidang(e.target.value)} className={inputClass}>
                <option value="">-- Pilih Bidang --</option>
                {bidangOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="mi_pic" className={labelClass}>PPTK / Penanggung Jawab <span className="text-xs font-normal text-slate-500">- Opsional</span></label>
              <select name="pic_pegawai_id" id="mi_pic" disabled={!selectedBidang} className={`${inputClass} disabled:bg-slate-200 disabled:cursor-not-allowed`}>
                <option value="">-- Pilih PIC --</option>
                {filteredPegawai.map((p) => <option key={p.id} value={p.id}>{p.nama} - {p.jabatan}</option>)}
              </select>
            </div>
          </div>

          {/* Row 5: Agenda */}
          <div className="space-y-2">
            <label htmlFor="mi_agenda" className={labelClass}>Agenda / Tujuan Kegiatan</label>
            <textarea name="agenda" id="mi_agenda" rows={2} placeholder="Tuliskan agenda atau tujuan kegiatan..." className={`${inputClass} resize-y`} />
          </div>

          {/* Row 6: Peserta & Jumlah */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label htmlFor="mi_peserta" className={labelClass}><Users size={14} className="inline mr-1 text-primary" />Peserta / Tamu Undangan</label>
              <textarea name="peserta" id="mi_peserta" rows={2} placeholder="Contoh: Perwakilan OPD, Camat se-Surakarta, Ketua RT/RW..." className={`${inputClass} resize-y`} />
            </div>
            <div className="space-y-2">
              <label htmlFor="mi_jumlah" className={labelClass}>Jumlah Peserta</label>
              <input type="number" name="jumlah_peserta" id="mi_jumlah" min="1" placeholder="0" className={inputClass} />
            </div>
          </div>

          {/* Row 7: Hasil + Dikte Suara + AI */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2">
              <label htmlFor="mi_hasil" className={labelClass}>Hasil Kegiatan / Notulen Ringkas</label>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isEnhancing || isSubmitting}
                  className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                  title={isListening ? 'Hentikan dikte suara' : 'Mulai dikte suara (Speech-to-Text)'}
                >
                  {isListening ? (
                    <>
                      <MicOff size={14} className="text-white" />
                      <span>Mendengarkan...</span>
                    </>
                  ) : (
                    <>
                      <Mic size={14} className="text-primary" />
                      <span>Dikte Suara</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={enhanceTextWithAI}
                  disabled={isEnhancing || !hasilText.trim() || isSubmitting || isListening}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg text-xs font-bold hover:from-violet-600 hover:to-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center cursor-pointer"
                >
                  {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Perbaiki Teks dengan AI
                </button>
              </div>
            </div>
            <textarea
              name="hasil_kegiatan"
              id="mi_hasil"
              rows={4}
              value={hasilText}
              onChange={(e) => setHasilText(e.target.value)}
              placeholder="Tuliskan poin-poin penting hasil kegiatan (bisa gunakan Dikte Suara)..."
              className={`${inputClass} resize-y ${isEnhancing ? 'opacity-50' : ''} ${
                isListening ? 'border-rose-300 ring-2 ring-rose-200' : ''
              }`}
              disabled={isEnhancing || isSubmitting}
            />
          </div>

          {/* SPJ Uploads */}
          <div className="bg-sky-50/50 p-6 rounded-xl border border-sky-100">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ClipboardList size={18} className="text-primary" /> Kelengkapan Dokumen SPJ
            </h3>
            <p className="text-xs text-slate-500 mb-4">Upload dokumen untuk tracking kelengkapan SPJ kegiatan. Semua opsional.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Daftar Hadir */}
              <div className="space-y-1.5">
                <label htmlFor="mi_daftar_hadir" className="block text-sm font-bold text-slate-800 flex items-center gap-1">
                  <Users size={15} className="text-primary" /> 1. Daftar Hadir
                </label>
                <input multiple type="file" name="file_daftar_hadir" id="mi_daftar_hadir" accept="image/*,.pdf"
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover cursor-pointer border border-dashed border-slate-300 rounded-xl p-2 bg-white outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {/* 2. Undangan */}
              <div className="space-y-1.5">
                <label htmlFor="mi_undangan" className="block text-sm font-bold text-slate-800 flex items-center gap-1">
                  <FileText size={15} className="text-primary" /> 2. Undangan Rapat
                </label>
                <input multiple type="file" name="file_undangan" id="mi_undangan" accept="image/*,.pdf,.doc,.docx"
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover cursor-pointer border border-dashed border-slate-300 rounded-xl p-2 bg-white outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {/* 3. Foto Kegiatan */}
              <div className="space-y-1.5">
                <label htmlFor="mi_foto_kegiatan" className="block text-sm font-bold text-slate-800 flex items-center gap-1">
                  <Camera size={15} className="text-primary" /> 3. Foto Kegiatan
                </label>
                <input multiple type="file" name="file_foto_kegiatan" id="mi_foto_kegiatan" accept="image/*"
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover cursor-pointer border border-dashed border-slate-300 rounded-xl p-2 bg-white outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {/* 4. Notulen */}
              <div className="space-y-1.5">
                <label htmlFor="mi_notulen" className="block text-sm font-bold text-slate-800 flex items-center gap-1">
                  <FileText size={15} className="text-primary" /> 4. Notulen
                </label>
                <input multiple type="file" name="file_notulen" id="mi_notulen" accept="image/*,.pdf,.doc,.docx"
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover cursor-pointer border border-dashed border-slate-300 rounded-xl p-2 bg-white outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {/* 5. Foto Jamuan */}
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="mi_foto_jamuan" className="block text-sm font-bold text-slate-800 flex items-center gap-1">
                  <UtensilsCrossed size={15} className="text-primary" /> 5. Foto Jamuan / Konsumsi
                </label>
                <input multiple type="file" name="file_foto_jamuan" id="mi_foto_jamuan" accept="image/*"
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover cursor-pointer border border-dashed border-slate-300 rounded-xl p-2 bg-white outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 outline-none focus:ring-4 focus:ring-primary/30 cursor-pointer">
            {isSubmitting ? <><Loader2 className="animate-spin" /> Sedang Memproses...</> : <><Send size={20} /> Simpan Kegiatan Internal</>}
          </button>
        </form>
      </div>
    </div>
  )
}
