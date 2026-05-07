'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileEdit,
  Printer,
  KeyRound,
  Building2,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/input', label: 'Input Data', icon: FileEdit },
  { href: '/cetak', label: 'Cetak', icon: Printer },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)
  const [showMobile, setShowMobile] = useState(false)

  const NavLinks = () => (
    <nav className="flex-1 space-y-2 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setShowMobile(false)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-main ${
              isActive
                ? 'bg-white/20 text-white font-bold shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} className={isActive ? 'text-amber-main' : ''} />
            <span className={`${!isOpen && 'lg:hidden'} transition-all`}>
              {item.label}
            </span>
          </Link>
        )
      })}

      {/* Pimpinan Button */}
      <div className="pt-6 mt-6 border-t border-white/20">
        <Link
          href="/pimpinan"
          onClick={() => setShowMobile(false)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-main shadow-md ${
            pathname === '/pimpinan'
              ? 'bg-amber-hover text-navy-dark font-bold'
              : 'bg-amber-main hover:bg-amber-hover text-navy-dark font-bold'
          }`}
          aria-current={pathname === '/pimpinan' ? 'page' : undefined}
        >
          <KeyRound size={20} />
          <span className={`${!isOpen && 'lg:hidden'} transition-all`}>
            Menu Pimpinan
          </span>
        </Link>
      </div>
    </nav>
  )

  return (
    <>
      {/* Mobile Topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-navy-main flex border-b border-navy-light text-white items-center px-4 justify-between z-40 no-print">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Building2 className="text-amber-main" /> SIMPELGAS
        </div>
        <button
          onClick={() => setShowMobile(!showMobile)}
          aria-label="Toggle Menu"
          className="p-2 hover:bg-white/10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-main"
        >
          {showMobile ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {showMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden no-print"
          onClick={() => setShowMobile(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full bg-navy-main text-white flex flex-col transition-all duration-300 z-50 no-print
          ${showMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isOpen ? 'w-64' : 'w-20'}
        `}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-white/10">
          <div
            className={`flex items-center gap-3 font-bold text-xl tracking-wide ${
              !isOpen && 'lg:hidden'
            }`}
          >
            <Building2 className="text-amber-main flex-shrink-0" />
            <span className="whitespace-nowrap">SIMPELGAS</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden lg:flex p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex-1 px-3 overflow-y-auto overflow-x-hidden">
          <NavLinks />
        </div>
      </aside>
    </>
  )
}
