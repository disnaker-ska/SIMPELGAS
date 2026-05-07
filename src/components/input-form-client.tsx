'use client'

import { useState, useRef } from 'react'
import { FileSignature, Camera, FileText, Send, Loader2, Sparkles } from 'lucide-react'
import Swal from 'sweetalert2'
import { submitLaporan, uploadFiles } from '@/lib/actions'
import type { Pegawai } from '@/lib/types'

interface InputFormClientProps {
  pegawaiList: Pegawai[]
}

export function InputFormClient({ pegawaiList }: InputFormClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBidang, setSelectedBidang] = useState('')
  const [catatanText, setCatatanText] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const bidangOptions = [...new Set(pegawaiList.map((p) => p.bidang).filter(Boolean))]
  const filteredPegawai = pegawaiList.filter(
    (p) => !selectedBidang || p.bidang === selectedBidang
  )

  // Helper: Read file as Base64
  const getBase64 = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      if (!file) resolve(null)
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || ''
        if (encoded.length % 4 > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4))
        }
        resolve(encoded)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  // Helper: Compress image
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
              const newFile = new File([blob!], file.name, { type: 'image/jpeg', lastModified: Date.now() })
              resolve(newFile)
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

  const enhanceTextWithAI = async () => {
    if (!catatanText.trim()) return
    setIsEnhancing(true)

    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: catatanText }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCatatanText(data.enhanced)

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Teks disempurnakan dengan AI ✨',
        showConfirmButton: false,
        timer: 3000,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'AI Gagal Memproses',
        text: error.message || 'Terjadi kesalahan saat menghubungi server AI.',
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget

    const docsInput = form.querySelector<HTMLInputElement>('input[name="file_dok"]')
    const materiInput = form.querySelector<HTMLInputElement>('input[name="file_materi"]')
    const docsFileList = Array.from(docsInput?.files || [])
    const materiFileList = Array.from(materiInput?.files || [])

    setIsSubmitting(true)

    try {
      // Process documentation files
      const docsPayload = await Promise.all(
        docsFileList.map(async (file) => {
          let processed = file
          if (file.type.startsWith('image/')) {
            processed = await compressImage(file, 1)
          }
          const b64 = await getBase64(processed)
          return { base64: b64!, name: processed.name, mime: processed.type }
        })
      )

      // Process materi files
      const materiPayload = await Promise.all(
        materiFileList.map(async (file) => {
          const b64 = await getBase64(file)
          return { base64: b64!, name: file.name, mime: file.type }
        })
      )

      // Upload files to Supabase Storage
      const dokUrls = docsPayload.length > 0
        ? await uploadFiles('dokumentasi', docsPayload)
        : []
      const materiUrls = materiPayload.length > 0
        ? await uploadFiles('materi', materiPayload)
        : []

      // Find selected pegawai
      const pegawaiId = formData.get('pegawai_id') as string
      const targetPegawai = pegawaiList.find((p) => p.id === pegawaiId)

      const result = await submitLaporan(
        {
          pegawai_id: pegawaiId,
          bidang: formData.get('bidang') as string,
          jabatan: targetPegawai?.jabatan || '',
          jenis_penugasan: formData.get('jenis') as string,
          tanggal_kegiatan: formData.get('tanggal') as string,
          nama_kegiatan: formData.get('kegiatan') as string,
          tempat_kegiatan: formData.get('tempat') as string,
          penyelenggara: formData.get('penyelenggara') as string,
          tamu_undangan: formData.get('tamu') as string,
          catatan_hasil: formData.get('catatan') as string,
        },
        dokUrls,
        materiUrls
      )

      if (result.status === 'success') {
        Swal.fire({ title: 'Berhasil!', text: 'Laporan tersimpan.', icon: 'success', confirmButtonColor: '#1B3C73' })
        formRef.current?.reset()
        setCatatanText('')
        setSelectedBidang('')
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('Submission Error:', error)
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: error.message || 'Pastikan koneksi internet stabil atau kurangi ukuran file.',
        icon: 'error',
        confirmButtonColor: '#1B3C73',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm w-11/12">
            <Loader2 className="animate-spin text-amber-main mb-4" size={48} />
            <h3 className="text-xl font-bold text-navy-main mb-2">Memproses</h3>
            <p className="text-gray-500 text-sm">Mohon tunggu, sedang mengirim laporan...</p>
          </div>
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl mx-auto transition-all duration-300 ${isSubmitting ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="bg-navy-main px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-white flex items-center">
            <FileSignature className="mr-3 text-amber-main" size={24} /> Formulir Laporan Penugasan
          </h2>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="in_bidang" className="block text-sm font-semibold text-gray-700">
                Bidang / Unit Kerja <span className="text-red-500">*</span>
              </label>
              <select
                name="bidang"
                id="in_bidang"
                required
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none"
              >
                <option value="">-- Pilih Bidang --</option>
                {bidangOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="in_nama" className="block text-sm font-semibold text-gray-700">
                Nama Pegawai <span className="text-red-500">*</span>
              </label>
              <select
                name="pegawai_id"
                id="in_nama"
                required
                disabled={!selectedBidang}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                <option value="">-- Pilih Nama Pegawai --</option>
                {filteredPegawai.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="in_jenis" className="block text-sm font-semibold text-gray-700">
                Jenis Penugasan <span className="text-red-500">*</span>
              </label>
              <select name="jenis" id="in_jenis" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none">
                <option value="">-- Pilih Jenis --</option>
                <option value="Rapat Koordinasi">Rapat Koordinasi</option>
                <option value="Sosialisasi / Bimtek">Sosialisasi / Bimtek</option>
                <option value="Monitoring & Evaluasi">Monitoring & Evaluasi</option>
                <option value="Kunjungan Kerja">Kunjungan Kerja</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="in_tanggal" className="block text-sm font-semibold text-gray-700">
                Tanggal Kegiatan <span className="text-red-500">*</span>
              </label>
              <input type="date" name="tanggal" id="in_tanggal" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="in_kegiatan" className="block text-sm font-semibold text-gray-700">
              Nama Kegiatan <span className="text-red-500">*</span>
            </label>
            <input type="text" name="kegiatan" id="in_kegiatan" placeholder="Contoh: Rapat Evaluasi Kinerja Triwulan III" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="in_tempat" className="block text-sm font-semibold text-gray-700">
                Tempat Kegiatan <span className="text-red-500">*</span>
              </label>
              <input type="text" name="tempat" id="in_tempat" placeholder="Contoh: Hotel Solo Paragon" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none" />
            </div>
            <div className="space-y-2">
              <label htmlFor="in_penyelenggara" className="block text-sm font-semibold text-gray-700">
                Penyelenggara Kegiatan <span className="text-red-500">*</span>
              </label>
              <input type="text" name="penyelenggara" id="in_penyelenggara" placeholder="Contoh: Disnaker Prov. Jateng" required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="in_tamu" className="block text-sm font-semibold text-gray-700">Tamu Undangan / Peserta yang Hadir</label>
            <input type="text" name="tamu" id="in_tamu" placeholder="Contoh: Perwakilan OPD, Camat se-Surakarta" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none" />
          </div>

          {/* Catatan + AI */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2">
              <label htmlFor="in_catatan" className="block text-sm font-semibold text-gray-700">
                Catatan Hasil Kegiatan <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={enhanceTextWithAI}
                disabled={isEnhancing || !catatanText.trim() || isSubmitting}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-xs font-bold hover:from-purple-600 hover:to-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                title="Perbaiki dan kembangkan poin kegiatan dengan AI"
              >
                {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Perbaiki Teks dengan AI
              </button>
            </div>
            <textarea
              name="catatan"
              id="in_catatan"
              rows={4}
              value={catatanText}
              onChange={(e) => setCatatanText(e.target.value)}
              placeholder="Tuliskan poin-poin penting hasil kegiatan di sini..."
              required
              className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-navy-light bg-gray-50 focus:bg-white transition outline-none resize-y ${isEnhancing ? 'opacity-50' : ''}`}
              disabled={isEnhancing || isSubmitting}
            />
          </div>

          {/* File Uploads */}
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="in_file_dok" className="block text-sm font-bold text-navy-main flex items-center gap-1">
                <Camera size={16} /> Dokumentasi (Foto)
              </label>
              <input multiple type="file" name="file_dok" id="in_file_dok" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-navy-main file:text-white hover:file:bg-navy-dark cursor-pointer border border-dashed border-gray-300 rounded-xl p-2 bg-white outline-none focus:ring-2 focus:ring-navy-main" />
              <p className="text-xs text-gray-500 mt-1">Bisa pilih lebih dari 1 foto. Otomatis dikompres.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="in_file_materi" className="block text-sm font-bold text-navy-main flex items-center gap-1">
                <FileText size={16} /> Materi (PDF/Docx) <span className="text-xs font-normal text-gray-500">- Opsional</span>
              </label>
              <input multiple type="file" name="file_materi" id="in_file_materi" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer border border-dashed border-gray-300 rounded-xl p-2 bg-white outline-none focus:ring-2 focus:ring-navy-main" />
              <p className="text-xs text-gray-500 mt-1">Bisa pilih lebih dari 1 file. Maks 5MB/file.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-navy-main text-white py-4 rounded-xl font-bold text-lg hover:bg-navy-dark disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex justify-center items-center gap-2 outline-none focus:ring-4 focus:ring-blue-300"
          >
            {isSubmitting ? <><Loader2 className="animate-spin" /> Sedang Memproses...</> : <><Send /> Kirim Laporan Penugasan</>}
          </button>
        </form>
      </div>
    </div>
  )
}
