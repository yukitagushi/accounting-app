import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js 16 Proxy (旧middleware)
 * Supabase認証セッションを検証し、未認証ユーザーは /login にリダイレクト
 * MFAが設定済みで未検証の場合は /mfa-verify にリダイレクト
 */
export async function proxy(request: NextRequest) {
  const response = await updateSession(request)

  // If updateSession already redirected (to login), just return it
  if (response.status === 307 || response.status === 308) {
    return response
  }

  const pathname = request.nextUrl.pathname

  // Skip MFA check for auth pages
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/mfa-verify')
  ) {
    return response
  }

  // Check MFA assurance level for authenticated users
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        },
      },
    }
  )

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
    const url = request.nextUrl.clone()
    url.pathname = '/mfa-verify'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
