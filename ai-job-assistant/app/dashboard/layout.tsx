import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase.from('profiles').select('full_name, plan').eq('id', user.id).single(),
    supabase.from('usage_daily').select('count').eq('user_id', user.id).eq('day', today).maybeSingle(),
  ])

  return (
    <DashboardShell
      name={profile?.full_name ?? user.email ?? 'there'}
      plan={(profile?.plan as 'free' | 'pro') ?? 'free'}
      usedToday={usage?.count ?? 0}
    >
      {children}
    </DashboardShell>
  )
}
