'use server'

import { createServerSupabaseClient } from './supabase'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import type { Pegawai, Laporan, DashboardStats, LaporanFormData } from './types'

// ============================================================
// DATA FETCHING
// ============================================================

export async function getPegawai(): Promise<Pegawai[]> {
  noStore()
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .eq('is_active', true)
    .order('bidang')
    .order('nama')

  if (error) {
    console.error('Error fetching pegawai:', error)
    return []
  }
  return data || []
}

export async function getLaporan(namaPegawai?: string): Promise<Laporan[]> {
  noStore()
  const supabase = createServerSupabaseClient()
  let query = supabase
    .from('laporan')
    .select('*, pegawai(nama, bidang, jabatan)')
    .order('created_at', { ascending: false })

  if (namaPegawai) {
    // Filter by pegawai nama via joined table
    query = query.eq('pegawai.nama', namaPegawai)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching laporan:', error)
    return []
  }
  return data || []
}

export async function getAllLaporan(): Promise<Laporan[]> {
  noStore()
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('laporan')
    .select('*, pegawai(nama, bidang, jabatan)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all laporan:', error)
    return []
  }
  return data || []
}

export async function getDashboardStats(laporanData: Laporan[]): Promise<DashboardStats> {
  const totalLaporan = laporanData.length
  const uniqueNames = new Set(
    laporanData
      .map(l => l.pegawai?.nama)
      .filter(Boolean)
  )
  const totalDievaluasi = laporanData.filter(
    l => l.catatan_pimpinan && l.catatan_pimpinan.trim() !== ''
  ).length

  return {
    totalLaporan,
    uniquePegawai: uniqueNames.size,
    totalDievaluasi,
  }
}

// ============================================================
// DATA MUTATION
// ============================================================

export async function submitLaporan(formData: LaporanFormData, dokUrls: string[], materiUrls: string[]) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('laporan')
    .insert({
      pegawai_id: formData.pegawai_id,
      bidang: formData.bidang,
      jabatan: formData.jabatan,
      jenis_penugasan: formData.jenis_penugasan,
      tanggal_kegiatan: formData.tanggal_kegiatan,
      nama_kegiatan: formData.nama_kegiatan,
      tempat_kegiatan: formData.tempat_kegiatan,
      penyelenggara: formData.penyelenggara,
      tamu_undangan: formData.tamu_undangan || null,
      catatan_hasil: formData.catatan_hasil || null,
      dokumentasi_urls: dokUrls.length > 0 ? dokUrls : null,
      materi_urls: materiUrls.length > 0 ? materiUrls : null,
      status_tindak_lanjut: 'Untuk Diketahui',
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting laporan:', error)
    return { status: 'error', message: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/cetak')
  revalidatePath('/pimpinan')

  return { status: 'success', data }
}

export async function updateEvaluasiPimpinan(
  laporanId: string,
  status: string,
  catatanBaru: string,
  roleName: string
) {
  const supabase = createServerSupabaseClient()

  // Fetch current catatan to append
  const { data: current } = await supabase
    .from('laporan')
    .select('catatan_pimpinan')
    .eq('id', laporanId)
    .single()

  const existingNotes = current?.catatan_pimpinan
    ? current.catatan_pimpinan.trim() + '\n\n'
    : ''
  const appendedNote = existingNotes + `[${roleName}]: ${catatanBaru.trim()}`

  const { error } = await supabase
    .from('laporan')
    .update({
      status_tindak_lanjut: status,
      catatan_pimpinan: appendedNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', laporanId)

  if (error) {
    console.error('Error updating evaluasi:', error)
    return { status: 'error', message: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/pimpinan')

  return { status: 'success' }
}

// ============================================================
// FILE UPLOAD — Supabase Storage
// ============================================================

export async function uploadFile(
  bucket: string,
  fileName: string,
  fileBase64: string,
  mimeType: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient()

  // Decode base64 to buffer
  const buffer = Buffer.from(fileBase64, 'base64')
  const uniqueName = `${Date.now()}_${fileName}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(uniqueName, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    console.error(`Error uploading to ${bucket}:`, error)
    return null
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uniqueName)

  return urlData.publicUrl
}

export async function uploadFiles(
  bucket: string,
  files: Array<{ base64: string; name: string; mime: string }>
): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const url = await uploadFile(bucket, file.name, file.base64, file.mime)
    if (url) urls.push(url)
  }
  return urls
}

// ============================================================
// SEARCH LAPORAN BY PEGAWAI
// ============================================================

export async function getLaporanByPegawaiId(pegawaiId: string): Promise<Laporan[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('laporan')
    .select('*, pegawai(nama, bidang, jabatan)')
    .eq('pegawai_id', pegawaiId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching laporan by pegawai:', error)
    return []
  }
  return data || []
}
