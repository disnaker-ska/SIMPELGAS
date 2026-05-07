import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Proteksi semua route di bawah /pimpinan
  if (pathname.startsWith('/pimpinan')) {
    // Kecuali halaman login-nya sendiri agar tidak terjadi loop
    if (pathname === '/pimpinan/login') {
      return NextResponse.next()
    }

    const session = request.cookies.get('pimpinan_session')

    if (!session) {
      // Jika tidak ada session, redirect ke halaman login
      const url = new URL('/pimpinan/login', request.url)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/pimpinan/:path*'],
}