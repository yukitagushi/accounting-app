import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Demo mode: skip auth, allow all access
  const enableAuth = process.env.ENABLE_AUTH === 'true'

  if (!enableAuth) {
    if (request.nextUrl.pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  const { updateSession } = await import('@/lib/supabase/middleware')
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
