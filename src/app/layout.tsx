import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'SIMPELGAS — Sistem Monitoring Penugasan & Laporan Kegiatan ASN',
  description:
    'Aplikasi pencatatan dan monitoring penugasan kegiatan ASN Dinas Tenaga Kerja Kota Surakarta',
  icons: { icon: '/Pemkot.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-5 lg:p-4 xl:p-6 max-w-7xl mx-auto min-h-full flex flex-col justify-center">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
