// ============================================================
// TypeScript Interfaces — SIMPELGAS
// ============================================================

export interface Pegawai {
  id: string
  nama: string
  nip: string | null
  bidang: string
  jabatan: string
  is_active: boolean
  created_at: string
}

export interface Laporan {
  id: string
  pegawai_id: string
  bidang: string
  jabatan: string | null
  jenis_penugasan: string
  tanggal_kegiatan: string // DATE stored as string from Supabase
  nama_kegiatan: string
  tempat_kegiatan: string
  penyelenggara: string
  tamu_undangan: string | null
  catatan_hasil: string | null
  dokumentasi_urls: string[] | null
  materi_urls: string[] | null
  status_tindak_lanjut: string
  catatan_pimpinan: string | null
  created_at: string
  updated_at: string
  // Joined fields
  pegawai?: Pegawai
}

export interface PimpinanRole {
  id: string
  user_id: string
  nama: string
  role: string
  scopes: string[]
  created_at: string
}

export interface DashboardStats {
  totalLaporan: number
  uniquePegawai: number
  totalDievaluasi: number
}

export interface LaporanFormData {
  pegawai_id: string
  bidang: string
  jabatan: string
  jenis_penugasan: string
  tanggal_kegiatan: string
  nama_kegiatan: string
  tempat_kegiatan: string
  penyelenggara: string
  tamu_undangan: string
  catatan_hasil: string
}
