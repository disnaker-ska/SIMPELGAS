'use client'

import { X, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react'

interface FilePreviewModalProps {
  isOpen: boolean
  fileUrl: string | null
  fileName: string
  fileType: 'image' | 'pdf'
  onClose: () => void
}

export function FilePreviewModal({
  isOpen,
  fileUrl,
  fileName,
  fileType,
  onClose,
}: FilePreviewModalProps) {
  if (!isOpen || !fileUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {fileType === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={fileName}>
                {fileName}
              </h4>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Preview {fileType === 'image' ? 'Foto Dokumentasi' : 'Dokumen PDF'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-200/60 transition cursor-pointer"
              title="Buka di tab baru"
            >
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              title="Tutup Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-900/5 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          {fileType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-full rounded-lg border border-slate-200 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  )
}
