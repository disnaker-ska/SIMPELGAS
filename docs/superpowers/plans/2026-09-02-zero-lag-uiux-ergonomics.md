# Zero-Lag UI/UX Ergonomics & Perceived Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan arsitektur Perceived Performance dan standar ergonomi interaksi modern (anti-lag, hover, cursor-pointer, lazy loading Recharts, route streaming skeletons, optimistic updates, dan trias loading/empty/error state) di seluruh komponen SIMPELGAS serta membakukannya ke dalam dokumen referensi teknis.

**Architecture:** Menggabungkan Next.js 14 Route Streaming (`loading.tsx`), Client-side Code Splitting (`next/dynamic` dengan `ssr: false`), React 18 non-blocking transitions (`useTransition` / immediate optimistic state), serta design tokens Tailwind untuk interaksi mikro taktil (<50ms).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-02-zero-lag-uiux-ergonomics-design.md](docs/superpowers/specs/2026-09-02-zero-lag-uiux-ergonomics-design.md)

## Global Constraints
- Kontrak data dan integrasi Google Apps Script (`code.gs`) tidak boleh berubah.
- Seluruh 36 unit test Vitest yang ada wajib tetap 100% lulus.
- Kerapian palet warna Civic Spectrum (Sky 400, Pink 400, Violet, Slate) tetap dipertahankan.
- Komponen wajib mobile-responsive dan accessible (WCAG AA).

---

### Task 1: Komponen Reusable UI State (`Skeleton`, `EmptyState`, `ErrorState`)

**Files:**
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/error-state.tsx`
- Create: `tests/ui-states.test.tsx`

**Interfaces:**
- Produces:
  - `Skeleton`: `({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => JSX.Element`
  - `EmptyState`: `({ icon, title, description, action }: EmptyStateProps) => JSX.Element`
  - `ErrorState`: `({ title, message, onRetry }: ErrorStateProps) => JSX.Element`

- [x] **Step 1: Tulis unit test di `tests/ui-states.test.tsx`**
```typescript
import { describe, it, expect } from 'vitest'
import React from 'react'
import { Skeleton } from '../src/components/ui/skeleton'
import { EmptyState } from '../src/components/ui/empty-state'
import { ErrorState } from '../src/components/ui/error-state'

describe('UI State Components', () => {
  it('renders Skeleton with pulse animation class', () => {
    const el = Skeleton({ className: 'h-4 w-20' })
    expect(el.props.className).toContain('animate-pulse')
    expect(el.props.className).toContain('bg-slate-200')
  })

  it('renders EmptyState with title and description', () => {
    const el = EmptyState({
      title: 'Tidak Ada Data',
      description: 'Coba ubah kata kunci pencarian.'
    })
    expect(el).toBeDefined()
  })

  it('renders ErrorState with message and retry trigger', () => {
    const el = ErrorState({
      message: 'Gagal memuat data.',
      onRetry: () => {}
    })
    expect(el).toBeDefined()
  })
})
```

- [x] **Step 2: Jalankan test untuk memverifikasi kegagalan (RED)**
Run: `npx vitest run tests/ui-states.test.tsx`

- [x] **Step 3: Buat implementasi `Skeleton`, `EmptyState`, dan `ErrorState`**
`src/components/ui/skeleton.tsx`:
```tsx
import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200/80', className)}
      {...props}
    />
  )
}
```

`src/components/ui/empty-state.tsx`:
```tsx
import React from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50', className)}>
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
```

`src/components/ui/error-state.tsx`:
```tsx
import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Terjadi Kendala',
  message,
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-6 text-center rounded-xl border border-rose-200 bg-rose-50/40 text-rose-800', className)}>
      <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
      <h4 className="text-sm font-bold mb-1">{title}</h4>
      <p className="text-xs text-rose-600 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      )}
    </div>
  )
}
```

- [x] **Step 4: Jalankan test untuk memverifikasi kelulusan (GREEN)**
Run: `npx vitest run tests/ui-states.test.tsx`

---

### Task 2: Route Streaming & Skeletons (`loading.tsx` per segment)

**Files:**
- Create: `src/app/dashboard/loading.tsx`
- Create: `src/app/input/loading.tsx`
- Create: `src/app/pimpinan/loading.tsx`
- Create: `src/app/cetak/loading.tsx`

- [x] **Step 1: Buat `src/app/dashboard/loading.tsx`**
Menampilkan skeleton kartu statistik 3 kolom, skeleton filter bar, dan skeleton tabel bergaris.

- [x] **Step 2: Buat `src/app/input/loading.tsx`**
Menampilkan skeleton header formulir, 6 baris input, dan wadah berkas bertitik putus-putus.

- [x] **Step 3: Buat `src/app/pimpinan/loading.tsx`**
Menampilkan skeleton filter bar pejabat, header evaluasi, dan 2 kartu evaluasi.

- [x] **Step 4: Buat `src/app/cetak/loading.tsx`**
Menampilkan skeleton kop surat naskah dinas dan lembar A4.

---

### Task 3: Lazy Loading Komponen Recharts (`next/dynamic` + `ssr: false`)

**Files:**
- Create: `src/components/analytics-charts.tsx`
- Modify: `src/components/dashboard-client.tsx`

- [x] **Step 1: Ekstraksi grafik Recharts ke `src/components/analytics-charts.tsx`**
Pindahkan `ResponsiveContainer`, `PieChart`, `BarChart`, `Pie`, `Bar`, `Cell`, `Tooltip` dari `dashboard-client.tsx` ke modul dedicated `analytics-charts.tsx`.

- [x] **Step 2: Impor dinamis di `dashboard-client.tsx`**
Gunakan `dynamic(() => import('./analytics-charts'), { ssr: false, loading: () => <ChartSkeleton /> })`.

---

### Task 4: Standarisasi Interaksi Mikro & Optimistic UI pada Client Components

**Files:**
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/dashboard-client.tsx`
- Modify: `src/components/input-form-client.tsx`
- Modify: `src/components/pimpinan-client.tsx`

- [x] **Step 1: Standarisasi `src/components/sidebar.tsx`**
Tambahkan `cursor-pointer`, `hover:`, `active:scale-[0.98]`, dan `transition-all duration-150` pada link navigasi, tombol toggle collapse, dan tombol portal pimpinan.

- [x] **Step 2: Standarisasi `src/components/dashboard-client.tsx`**
Tambahkan efek klik taktil pada tombol pagination, tombol cetak baris, dan integrasikan `EmptyState` ketika pencarian tidak menemukan hasil.

- [x] **Step 3: Standarisasi `src/components/input-form-client.tsx`**
Tambahkan `cursor-pointer`, `active:scale-[0.98]` pada tombol AI enhance dan submit. Pastikan tombol submit langsung menonaktifkan diri dengan state `isSubmitting` / spinner instan.

- [x] **Step 4: Standarisasi `src/components/pimpinan-client.tsx` (Optimistic UI)**
Ketika pimpinan konfirmasi simpan evaluasi:
1. Secara optimistik sembunyikan kartu laporan dari state lokal `currentReports`.
2. Kurangi indikator counter "Menunggu Evaluasi" secara seketika.
3. Jalankan Server Action di latar belakang; jika gagal, kembalikan kartu ke daftar dan tampilkan alert error.
4. Integrasikan `EmptyState` resmi ketika semua laporan telah dievaluasi.

---

### Task 5: Dokumentasikan Standar Zero-Lag & Ergonomi Interaksi

**Files:**
- Modify: `docs/DOKUMEN_REFERENSI_TEKNIS/UIUX_DESIGN.md`
- Modify: `docs/DOKUMEN_REFERENSI_TEKNIS/CODING_STANDARD.md`
- Modify: `docs/DOKUMEN_REFERENSI_TEKNIS/DEFINITION_OF_DONE.md`

- [x] **Step 1: Perbarui `UIUX_DESIGN.md`**
Tambahkan Bab 8: Standar Perceived Performance & Ergonomi Interaksi (Zero-Lag UI/UX).

- [x] **Step 2: Perbarui `CODING_STANDARD.md`**
Tambahkan konvensi `next/dynamic` untuk pustaka visual besar dan aturan token interaktif Tailwind.

- [x] **Step 3: Perbarui `DEFINITION_OF_DONE.md`**
Perbarui Gate 5 dengan kriteria Zero-Lag Ergonomics.

- [x] **Step 4: Jalankan verifikasi pipeline `npm run ci:local`**
Run: `npm run ci:local`
Expected: Seluruh lint, typecheck, unit tests, dan build berhasil tanpa error.
