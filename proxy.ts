import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Demo mode: skip Supabase auth, allow all access
  // In production, replace with updateSession from @/lib/supabase/middleware
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:54321'

  if (isDemoMode) {
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
