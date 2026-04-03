import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Demo mode - no authentication required
  // All pages are freely accessible
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
