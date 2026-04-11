import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BRANCHES = [
  { id: '00000000-0000-0000-0000-000000000001', name: '本社', code: 'HQ' },
  { id: '00000000-0000-0000-0000-000000000002', name: '滝沢', code: 'TKZ' },
  { id: '00000000-0000-0000-0000-000000000003', name: '三ツ割', code: 'MTW' },
]

export async function POST() {
  const supabase = await createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('branches')
    .upsert(BRANCHES, { onConflict: 'id' })

  if (error) {
    console.error('branches/init upsert failed:', error)
    return NextResponse.json({ error: 'Failed to initialize branches' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, branches: BRANCHES })
}
