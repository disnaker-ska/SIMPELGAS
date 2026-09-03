# Data Loading Optimization & Next.js Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mempercepat waktu muat data di Next.js secara signifikan melalui Server Data Caching (`unstable_cache` + `revalidateTag`), de-duplikasi request ke Google Apps Script, per-route streaming skeletons (`loading.tsx`), serta tombol sinkronisasi data instan di Dashboard dan Panel Pimpinan.

**Architecture:** Mengadopsi Next.js 14 `unstable_cache` dengan tag invalidation on-demand (`['pegawai']`, `['laporan']`), Server Action `refreshData()`, de-duplikasi pemanggilan `getPegawai()` pada `getAllLaporan()`, dan React Suspense route streaming via `loading.tsx` menggunakan komponen `Skeleton` berbasis palet Civic Spectrum.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React, Vitest, SweetAlert2.

**Spec:** [docs/superpowers/specs/2026-09-03-data-loading-optimization-design.md](docs/superpowers/specs/2026-09-03-data-loading-optimization-design.md)

## Global Constraints
- Kontrak data dan integrasi Google Apps Script (`code.gs`) tidak boleh diubah.
- Seluruh 13 test suites Vitest yang ada wajib 100% lulus.
- Patuhi 5 Aturan Keras UI: dilarang emoji, dilarang hardcoded hex color, dilarang token usang, 100% ikon dari `lucide-react`, dan dilarang `alert()`/`confirm()` bawaan browser.
- Lulus seluruh 5 Evidence Gates (`npm run ci:local` harus exit code 0).

---

### Task 1: Server Data Caching & Deduplikasi Fetch di `src/lib/actions.ts`

**Files:**
- Modify: `src/lib/actions.ts:28-120`
- Modify: `src/lib/actions.ts:180-235`
- Test: `tests/actions.test.ts`

**Interfaces:**
- Consumes:
  - `fetchPegawaiFromAppsScript()`: `() => Promise<Pegawai[]>`
  - `fetchLaporanFromAppsScript(namaPegawai?: string)`: `(nama?: string) => Promise<Laporan[]>`
  - `unstable_cache`: dari `'next/cache'`
  - `revalidateTag`: dari `'next/cache'`
  - `revalidatePath`: dari `'next/cache'`
- Produces:
  - `getPegawai`: `() => Promise<Pegawai[]>` (cached, tag `pegawai`, TTL 1800s)
  - `getLaporan`: `(namaPegawai?: string) => Promise<Laporan[]>` (cached, tag `laporan`, TTL 60s)
  - `getAllLaporan`: `() => Promise<Laporan[]>` (cached, deduplicated dengan `getPegawai`)
  - `refreshData`: `(tag?: 'laporan' | 'pegawai' | 'all') => Promise<{ status: string; message: string }>`

- [ ] **Step 1: Tulis unit test untuk `refreshData` dan cache revalidation di `tests/actions.test.ts`**

```typescript
// Tambahkan test case di tests/actions.test.ts
import { refreshData } from '@/lib/actions'

describe('refreshData action', () => {
  it('returns success status and message when revalidating cache', async () => {
    const res = await refreshData('all')
    expect(res).toBeDefined()
    expect(res.status).toBe('success')
    expect(res.message).toContain('Data berhasil disinkronkan')
  })
})
```

- [ ] **Step 2: Jalankan test untuk memastikan test baru gagal (RED)**

Run: `npx vitest run tests/actions.test.ts`  
Expected: FAIL dengan `refreshData is not a function` atau compile error.

- [ ] **Step 3: Implementasikan `unstable_cache`, de-duplikasi, dan `refreshData` di `src/lib/actions.ts`**

1. Bungkus pembacaan data pegawai dan laporan dengan `unstable_cache`:
```typescript
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'

// Cached fetchers
export const getPegawai = unstable_cache(
  async (): Promise<Pegawai[]> => {
    return fetchPegawaiFromAppsScript()
  },
  ['pegawai-list'],
  { tags: ['pegawai'], revalidate: 1800 }
)

export const getCachedLaporan = unstable_cache(
  async (namaPegawai?: string): Promise<Laporan[]> => {
    return fetchLaporanFromAppsScript(namaPegawai)
  },
  ['laporan-list'],
  { tags: ['laporan'], revalidate: 60 }
)

export async function getLaporan(namaPegawai?: string): Promise<Laporan[]> {
  return getCachedLaporan(namaPegawai)
}

export async function getAllLaporan(): Promise<Laporan[]> {
  const [laporanList, pegawaiList] = await Promise.all([
    getCachedLaporan(),
    getPegawai(),
  ])

  return laporanList.map((lap) => {
    const rawName = lap.pegawai_id || lap.pegawai?.nama || ''
    const norm = normalizePersonName(rawName)
    const matched = pegawaiList.find((p) => {
      if (p.id === rawName || p.nip === rawName) return true
      return normalizePersonName(p.nama) === norm
    })

    if (matched) {
      return {
        ...lap,
        bidang: lap.bidang || matched.bidang,
        jabatan: lap.jabatan || matched.jabatan,
        pegawai: matched,
      }
    }
    return lap
  })
}
```

2. Tambahkan `revalidateTag('laporan')` di `submitLaporan()` dan `updateEvaluasiPimpinan()`:
```typescript
if (res.status === 'success') {
  revalidateTag('laporan')
  revalidatePath('/dashboard')
  revalidatePath('/cetak')
  revalidatePath('/pimpinan')
}
```

3. Buat Server Action `refreshData()`:
```typescript
export async function refreshData(target: 'laporan' | 'pegawai' | 'all' = 'all') {
  if (target === 'laporan' || target === 'all') {
    revalidateTag('laporan')
  }
  if (target === 'pegawai' || target === 'all') {
    revalidateTag('pegawai')
  }
  revalidatePath('/dashboard')
  revalidatePath('/cetak')
  revalidatePath('/pimpinan')
  return { status: 'success', message: 'Data berhasil disinkronkan dari server.' }
}
```

- [ ] **Step 4: Jalankan test untuk memverifikasi pass (GREEN)**

Run: `npx vitest run tests/actions.test.ts`  
Expected: PASS 100%.

- [ ] **Step 5: Commit perubahan Task 1**

```bash
git add src/lib/actions.ts tests/actions.test.ts
git commit -m "perf(actions): add unstable_cache, deduplicate getPegawai, and add refreshData"
```

---

### Task 2: Route Streaming Skeletons (`loading.tsx`) untuk Seluruh Halaman

**Files:**
- Create: `src/app/dashboard/loading.tsx`
- Create: `src/app/input/loading.tsx`
- Create: `src/app/cetak/loading.tsx`
- Create: `src/app/pimpinan/loading.tsx`
- Test: `tests/ui-states.test.tsx`
- Test: `tests/design-tokens.test.ts`

**Interfaces:**
- Consumes:
  - `Skeleton`: dari `@/components/ui/skeleton`
- Produces:
  - Next.js route loading components (default export)

- [ ] **Step 1: Tulis unit test di `tests/ui-states.test.tsx` untuk memverifikasi loading components**

```typescript
import DashboardLoading from '@/app/dashboard/loading'
import InputLoading from '@/app/input/loading'
import CetakLoading from '@/app/cetak/loading'
import PimpinanLoading from '@/app/pimpinan/loading'

describe('Route Loading Skeletons', () => {
  it('renders DashboardLoading with skeleton elements', () => {
    const el = DashboardLoading()
    expect(el).toBeDefined()
  })

  it('renders InputLoading with skeleton elements', () => {
    const el = InputLoading()
    expect(el).toBeDefined()
  })

  it('renders CetakLoading with skeleton elements', () => {
    const el = CetakLoading()
    expect(el).toBeDefined()
  })

  it('renders PimpinanLoading with skeleton elements', () => {
    const el = PimpinanLoading()
    expect(el).toBeDefined()
  })
})
```

- [ ] **Step 2: Jalankan test untuk memastikan test gagal (RED)**

Run: `npx vitest run tests/ui-states.test.tsx`  
Expected: FAIL karena modul `loading.tsx` belum ada.

- [ ] **Step 3: Buat implementasi `loading.tsx` untuk masing-masing rute**

1. `src/app/dashboard/loading.tsx`: Kerangka header, 4 kartu KPI, filter bar, dan panel statistik/list.
2. `src/app/input/loading.tsx`: Kerangka judul form, dropdown pegawai, radio jenis tugas, inputs, dan dropzone lampiran.
3. `src/app/cetak/loading.tsx`: Kerangka filter pencarian laporan dan lembar kertas cetak A4.
4. `src/app/pimpinan/loading.tsx`: Kerangka panel pimpinan, toolbar ekspor/sinkronisasi, dan list kartu penugasan.

- [ ] **Step 4: Jalankan test verifikasi dan token audit (GREEN)**

Run: `npx vitest run tests/ui-states.test.tsx && npx vitest run tests/design-tokens.test.ts`  
Expected: PASS 100% tanpa pelanggaran token warna atau ikon.

- [ ] **Step 5: Commit perubahan Task 2**

```bash
git add src/app/*/loading.tsx tests/ui-states.test.tsx
git commit -m "feat(ui): add modular streaming loading skeletons for all major routes"
```

---

### Task 3: Integrasi Tombol Sinkronkan Data di Dashboard & Panel Pimpinan

**Files:**
- Modify: `src/components/dashboard-client.tsx:180-200`
- Modify: `src/components/pimpinan-client.tsx:250-295`
- Test: `tests/design-tokens.test.ts`

**Interfaces:**
- Consumes:
  - `refreshData`: dari `@/lib/actions`
  - `RefreshCw`: dari `'lucide-react'`
  - `Swal`: dari `'sweetalert2'`
  - `useRouter`: dari `'next/navigation'`
- Produces:
  - Tombol sinkronisasi instan di UI dengan visual feedback spinner dan toast notification.

- [ ] **Step 1: Update `handleRefresh` di `src/components/dashboard-client.tsx`**

Panggil Server Action `refreshData()` agar cache di server di-bust sebelum `router.refresh()`:
```typescript
const handleRefresh = async () => {
  setIsRefreshing(true)
  try {
    await refreshData('all')
    router.refresh()
  } catch (err) {
    console.error('Refresh error:', err)
  } finally {
    setTimeout(() => setIsRefreshing(false), 600)
  }
}
```

- [ ] **Step 2: Tambahkan tombol "Sinkronkan Data" di toolbar `src/components/pimpinan-client.tsx`**

1. Tambahkan state `isRefreshing` dan handler `handleSync`:
```typescript
const [isRefreshing, setIsRefreshing] = useState(false)

const handleSync = async () => {
  setIsRefreshing(true)
  try {
    await refreshData('all')
    router.refresh()
    Swal.fire({
      icon: 'success',
      title: 'Tersinkronisasi',
      text: 'Data laporan terbaru berhasil disinkronkan dari server.',
      timer: 1500,
      showConfirmButton: false,
    })
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal Sinkronisasi',
      text: error.message || 'Terjadi kesalahan saat menyinkronkan data.',
    })
  } finally {
    setIsRefreshing(false)
  }
}
```
2. Tambahkan tombol di toolbar pimpinan (sejajar dengan tombol XLSX dan PDF):
```tsx
<button
  onClick={handleSync}
  disabled={isRefreshing || isExporting}
  title="Sinkronkan data terbaru dari spreadsheet"
  className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold hover:bg-sky-100 transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
  <span>{isRefreshing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
</button>
```

- [ ] **Step 3: Jalankan verifikasi lint dan token**

Run: `npm run lint && npx vitest run tests/design-tokens.test.ts`  
Expected: 0 lint errors, design token tests PASS 100%.

- [ ] **Step 4: Commit perubahan Task 3**

```bash
git add src/components/dashboard-client.tsx src/components/pimpinan-client.tsx
git commit -m "feat(ui): connect refresh buttons to refreshData action in dashboard and pimpinan"
```

---

### Task 4: Full Verification (5 Evidence Gates) & Performa Review

**Files:**
- Test seluruh project via scripts

- [ ] **Step 1: Jalankan Gate 1 (Static Quality)**
Run: `npm run lint && npm run typecheck`  
Expected: 0 error, 0 warning.

- [ ] **Step 2: Jalankan Gate 2 (Unit Testing)**
Run: `npm test`  
Expected: 100% test suites pass.

- [ ] **Step 3: Jalankan Gate 3 & 4 (Local CI & Build)**
Run: `npm run ci:local`  
Expected: Exit code 0, build Next.js sukses.

- [ ] **Step 4: Verifikasi Gate 5 (Manual & Walkthrough)**
Buat dokumentasi `walkthrough.md` yang merangkum hasil pengujian performa sebelum vs sesudah optimasi.
