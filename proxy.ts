import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Always allow access in demo mode (no Supabase backend)
  // To enable Supabase auth, set ENABLE_AUTH=true and configure Supabase env vars
  const enableAuth = process.env.ENABLE_AUTH === 'true'

  if (!enableAuth) {
    // Redirect root to dashboard
    if (request.nextUrl.pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Production: use Supabase auth
  const { updateSession } = await import('@/lib/supabase/middleware')
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
