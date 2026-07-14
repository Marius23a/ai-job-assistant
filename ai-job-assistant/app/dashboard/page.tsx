import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function Ring({ value }: { value: number }) {
  const size = 104, sw = 9, r = (size - sw) / 2, c = 2 * Math.PI * r
  const color = value >= 75 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw}
          className="stroke-zinc-200 dark:stroke-zinc-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

const TYPE_LABEL: Record<string, string> = {
  cv_optimization: 'Optimised a CV',
  cover_letter: 'Wrote a cover letter',
  interview_feedback: 'Practised an interview',
  resume_analysis: 'Analysed a resume',
  advisor_chat: 'Asked the advisor',
}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const QUICK = [
  { label: 'Optimise CV', sub: 'Tailor to a job', href: '/dashboard/optimizer', soon: false, icon: 'M9 13l2 2 4-4M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6' },
  { label: 'Cover letter', sub: 'In your voice', href: '#', soon: true, icon: 'M3 5h18v14H3zM3 7l9 6 9-6' },
  { label: 'Mock interview', sub: 'Get scored', href: '#', soon: true, icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { label: 'Ask advisor', sub: 'Career questions', href: '#', soon: true, icon: 'M12 2a7 7 0 00-7 7c0 2.4 1.2 4 2.5 5.2.7.7 1 1.2 1 2.3V18h7v-1.5c0-1.1.3-1.6 1-2.3C17.8 13 19 11.4 19 9a7 7 0 00-7-7z' },
]

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const [{ data: profile }, { data: usage }, { count: cvCount }, { data: recent }] = await Promise.all([
    supabase.from('profiles').select('full_name, plan').eq('id', user.id).single(),
    supabase.from('usage_daily').select('count').eq('user_id', user.id).eq('day', today).maybeSingle(),
    supabase.from('cvs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('ai_generations').select('type, output, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])

  const isPro = profile?.plan === 'pro'
  const used = usage?.count ?? 0
  const left = Math.max(0, 3 - used)
  const firstName = (profile?.full_name ?? '').split(' ')[0] || 'there'
  const latest = recent?.find((r) => r.type === 'cv_optimization') as { output?: { optimized_score?: number } } | undefined
  const latestScore = latest?.output?.optimized_score ?? null

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{greet}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Here’s where things stand and what to do next.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {latestScore !== null ? (
            <>
              <Ring value={latestScore} />
              <div>
                <div className="text-xs text-zinc-500">Latest ATS score</div>
                <div className="mt-0.5 text-sm font-medium">Nice — keep it above 85.</div>
                <Link href="/dashboard/optimizer" className="mt-1.5 inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400">Run another →</Link>
              </div>
            </>
          ) : (
            <div>
              <div className="text-xs text-zinc-500">Latest ATS score</div>
              <div className="mt-1 text-sm font-medium">No analysis yet.</div>
              <Link href="/dashboard/optimizer" className="mt-1.5 inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400">Run your first →</Link>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">AI generations today</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{used}<span className="text-base font-normal text-zinc-400"> / {isPro ? '∞' : 3}</span></div>
          {!isPro && (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(used / 3) * 100}%` }} />
              </div>
              <div className="mt-2 text-xs text-zinc-400">{left} left · resets at midnight · <Link href="/pricing" className="font-semibold text-indigo-600 dark:text-indigo-400">go unlimited</Link></div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">Saved CVs</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{cvCount ?? 0}</div>
          <div className="mt-2 text-xs text-zinc-400">{isPro ? 'Unlimited storage' : 'Free plan · 1 CV'}</div>
        </div>
      </div>

      {/* Activity + quick actions */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
          {recent && recent.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recent.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M9 11l3 3 8-8M21 12a9 9 0 11-6.2-8.5" /></svg>
                  </div>
                  <div className="text-sm">{TYPE_LABEL[r.type] ?? r.type}</div>
                  <div className="ml-auto text-xs text-zinc-400">{ago(r.created_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-zinc-400">Nothing yet — run your first CV analysis.</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Jump back in</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK.map((q) => {
              const inner = (
                <>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]"><path d={q.icon} /></svg>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                    {q.label}
                    {q.soon && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 dark:bg-zinc-800">SOON</span>}
                  </div>
                  <div className="text-xs text-zinc-400">{q.sub}</div>
                </>
              )
              return q.soon ? (
                <div key={q.label} className="cursor-default rounded-xl border border-zinc-200 p-3.5 opacity-70 dark:border-zinc-800">{inner}</div>
              ) : (
                <Link key={q.label} href={q.href} className="rounded-xl border border-zinc-200 p-3.5 transition hover:border-indigo-300 hover:shadow-sm dark:border-zinc-800 dark:hover:border-indigo-500/40">{inner}</Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
