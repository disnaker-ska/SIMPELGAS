'use server'

import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'
import type {
  Pegawai,
  Laporan,
  DashboardStats,
  LaporanFormData,
  KegiatanInternal,
  KegiatanInternalFormData,
} from './types'
import {
  fetchPegawaiFromAppsScript,
  fetchLaporanFromAppsScript,
  submitLaporanToAppsScript,
  updateEvaluasiInAppsScript,
  type AppsScriptFilePayload,
} from './appscript'

// ============================================================
// DATA FETCHING (GOOGLE APPS SCRIPT / SPREADSHEET)
// ============================================================

export async function getPegawai(): Promise<Pegawai[]> {
  noStore()
  return fetchPegawaiFromAppsScript()
}

export async function getLaporan(namaPegawai?: string): Promise<Laporan[]> {
  noStore()
  return fetchLaporanFromAppsScript(namaPegawai)
}

export async function getAllLaporan(): Promise<Laporan[]> {
  noStore()
  return fetchLaporanFromAppsScript()
}

export async function getDashboardStats(laporanData: Laporan[]): Promise<DashboardStats> {
  const totalLaporan = laporanData.length
  const uniqueNames = new Set(
    laporanData
      .map((l) => l.pegawai?.nama || l.pegawai_id)
      .filter(Boolean)
  )
  const totalDievaluasi = laporanData.filter(
    (l) => l.catatan_pimpinan && l.catatan_pimpinan.trim() !== ''
  ).length

  return {
    totalLaporan,
    uniquePegawai: uniqueNames.size,
    totalDievaluasi,
  }
}

export async function getLaporanByPegawaiId(pegawaiId: string): Promise<Laporan[]> {
  noStore()
  const all = await fetchLaporanFromAppsScript()
  return all.filter((l) => l.pegawai_id === pegawaiId || l.pegawai?.nama === pegawaiId)
}

// ============================================================
// DATA MUTATION (SUBMIT LAPORAN & GOOGLE DRIVE UPLOAD)
// ============================================================

export async function submitLaporan(
  formData: LaporanFormData,
  dokFiles: AppsScriptFilePayload[] | any[] = [],
  materiFiles: AppsScriptFilePayload[] | any[] = []
) {
  // Pastikan payload file berformat AppsScriptFilePayload
  const dokumentasi: AppsScriptFilePayload[] = dokFiles
    .filter((f) => f && typeof f === 'object' && f.base64)
    .map((f) => ({
      base64: f.base64,
      name: f.name || 'dokumentasi.jpg',
      mime: f.mime || 'image/jpeg',
    }))

  const materi: AppsScriptFilePayload[] = materiFiles
    .filter((f) => f && typeof f === 'object' && f.base64)
    .map((f) => ({
      base64: f.base64,
      name: f.name || 'materi.pdf',
      mime: f.mime || 'application/pdf',
    }))

  // Temukan nama pegawai dari id / nama
  const namaPegawai = formData.pegawai_id

  const res = await submitLaporanToAppsScript({
    namaPegawai,
    bidang: formData.bidang,
    jabatan: formData.jabatan,
    jenisPenugasan: formData.jenis_penugasan,
    tanggalKegiatan: formData.tanggal_kegiatan,
    namaKegiatan: formData.nama_kegiatan,
    tempatKegiatan: formData.tempat_kegiatan,
    penyelenggara: formData.penyelenggara,
    tamuUndangan: formData.tamu_undangan,
    catatanHasil: formData.catatan_hasil,
    dokumentasi,
    materi,
  })

  if (res.status === 'success') {
    revalidatePath('/dashboard')
    revalidatePath('/cetak')
    revalidatePath('/pimpinan')
  }

  return res
}

export async function updateEvaluasiPimpinan(
  laporanId: string,
  status: string,
  catatanBaru: string,
  roleName: string
) {
  const row = parseInt(laporanId, 10)
  if (isNaN(row)) {
    return { status: 'error', message: 'Row ID Laporan tidak valid.' }
  }

  // Ambil laporan saat ini untuk menyambung catatan pimpinan yang sudah ada
  const all = await fetchLaporanFromAppsScript()
  const current = all.find((l) => l.id === laporanId)
  const existingNotes = current?.catatan_pimpinan
    ? current.catatan_pimpinan.trim() + '\n\n'
    : ''
  const appendedNote = existingNotes + `[${roleName}]: ${catatanBaru.trim()}`

  const res = await updateEvaluasiInAppsScript(row, status, appendedNote)

  if (res.status === 'success') {
    revalidatePath('/dashboard')
    revalidatePath('/pimpinan')
    revalidatePath('/cetak')
  }

  return res
}

// ============================================================
// STUBS FILE UPLOAD (LEGACY SUPABASE REPLACEMENT)
// ============================================================

// ============================================================
// STUBS KEGIATAN INTERNAL (NON-ACTIVE)
// ============================================================

export async function submitKegiatanInternal(..._args: any[]): Promise<{ status: string; message?: string }> { return { status: 'success' } }
export async function getAllKegiatanInternal(): Promise<KegiatanInternal[]> { return [] }
export async function getKegiatanInternalById(_id: string): Promise<KegiatanInternal | null> { return null }
export async function updateEvaluasiKegiatanInternal(..._args: any[]) { return { status: 'success' } }

// ============================================================
// PIMPINAN AUTHENTICATION (SERVER SIDE + COOKIES)
// ============================================================

const PIMPINAN_ROLES_CONFIG = [
  { name: 'Kepala Dinas', pin: process.env.PIN_KEPALA_DINAS, scopes: ['ALL'] },
  { name: 'Sekretaris', pin: process.env.PIN_SEKRETARIS, scopes: ['ALL'] },
  { name: 'Kasubag Perkeu', pin: process.env.PIN_KASUBAG_PERKEU, scopes: ['SEKRETARIAT'] },
  { name: 'Kasubag Ako', pin: process.env.PIN_KASUBAG_AKO, scopes: ['SEKRETARIAT'] },
  { name: 'Kabid PPTK', pin: process.env.PIN_KABID_PPTK, scopes: ['BIDANG PPTK'] },
  { name: 'Kabid Hubungan Industrial', pin: process.env.PIN_KABID_HI, scopes: ['BIDANG HUBUNGAN INDUSTRIAL'] },
]

export async function loginPimpinan(roleName: string, pin: string) {
  const role = PIMPINAN_ROLES_CONFIG.find((r) => r.name === roleName)

  if (!role || !role.pin) {
    console.error(`[AUTH] PIN untuk role "${roleName}" tidak ditemukan di environment variables.`)
    return { success: false, message: 'Konfigurasi server belum lengkap. Hubungi administrator.' }
  }

  if (pin !== role.pin) {
    return { success: false, message: 'PIN Salah atau Jabatan tidak ditemukan.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(
    'pimpinan_session',
    JSON.stringify({
      role: role.name,
      scopes: role.scopes,
      loggedInAt: Date.now(),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 jam
    }
  )

  return { success: true }
}

export async function logoutPimpinan() {
  const cookieStore = await cookies()
  cookieStore.delete('pimpinan_session')
  return { success: true }
}

export async function getPimpinanSession(): Promise<{
  role: string
  scopes: string[]
} | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('pimpinan_session')

  if (!sessionCookie) return null

  try {
    const session = JSON.parse(sessionCookie.value)
    return {
      role: session.role,
      scopes: session.scopes,
    }
  } catch {
    return null
  }
}