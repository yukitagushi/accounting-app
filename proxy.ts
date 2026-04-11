import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

/**
 * Next.js 16 Proxy (旧middleware)
 * Supabase認証セッションを検証し、未認証ユーザーは /login にリダイレクト
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
