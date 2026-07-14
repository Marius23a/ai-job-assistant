'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  name: string
  plan: 'free' | 'pro'
  usedToday: number
  children: React.ReactNode
}

const NAV = {
  Workspace: [
    { key: 'overview', label: 'Overview', href: '/dashboard', soon: false },
    { key: 'cv', label: 'CV Optimizer', href: '/dashboard/optimizer', soon: false },
    { key: 'analyzer', label: 'Resume Analyzer', href: '#', soon: true },
  ],
  'Pro tools': [
    { key: 'cover', label: 'Cover Letters', href: '#', soon: true },
    { key: 'interview', label: 'Interview Prep', href: '#', soon: true },
    { key: 'tracker', label: 'Job Tracker', href: '#', soon: true },
  ],
  Advisor: [{ key: 'advisor', label: 'Career Advisor', href: '#', soon: true }],
}

const ICONS: Record<string, string> = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  cv: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13l2 2 4-4',
  analyzer: 'M3 3v18h18M7 14l3-4 3 3 4-6',
  cover: 'M3 5h18v14H3zM3 7l9 6 9-6',
  interview: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  tracker: 'M3 4h18v16H3zM8 4v16M16 4v16',
  advisor: 'M12 2a7 7 0 00-7 7c0 2.4 1.2 4 2.5 5.2.7.7 1 1.2 1 2.3V18h7v-1.5c0-1.1.3-1.6 1-2.3C17.8 13 19 11.4 19 9a7 7 0 00-7-7zM9 22h6',
}

function NavIcon({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 opacity-90">
      <path d={ICONS[k]} />
    </svg>
  )
}

export function DashboardShell({ name, plan, usedToday, children }: Props) {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(true)
  const pathname = usePathname()

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDark(isDark)
  }

  const isPro = plan === 'pro'
  const left = Math.max(0, 3 - usedToday)
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U'

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white p-3.5 transition-transform dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-400 text-white">✦</div>
          <span className="font-semibold tracking-tight">Job<span className="text-indigo-500">AI</span></span>
        </div>

        {Object.entries(NAV).map(([section, items]) => (
          <div key={section}>
            <div className="px-2.5 pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{section}</div>
            {items.map((item) => {
              const active = !item.soon && pathname === item.href
              if (item.soon) {
                return (
                  <div key={item.key} className="flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-zinc-400">
                    <NavIcon k={item.key} />
                    {item.label}
                    <span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 dark:bg-zinc-800">SOON</span>
                  </div>
                )
              }
              return (
                <Link key={item.key} href={item.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                  }`}>
                  <NavIcon k={item.key} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}

        <div className="flex-1" />

        {!isPro && (
          <div className="mb-2 rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-transparent p-3.5 dark:border-indigo-500/30 dark:from-indigo-500/10">
            <p className="text-[13px] font-semibold">{left} of 3 generations left today</p>
            <p className="mb-2.5 mt-0.5 text-[11.5px] text-zinc-500">Go unlimited with Pro.</p>
            <Link href="/pricing" className="block rounded-lg bg-indigo-600 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-700">
              Upgrade to Pro
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-xs font-semibold text-white">{initials}</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">{name}</div>
            <div className="text-[11px] text-zinc-400">{isPro ? 'Pro plan' : 'Free plan'}</div>
          </div>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-zinc-50/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 md:px-6">
          <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 lg:hidden">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>

          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-400 dark:bg-zinc-900 sm:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            Search…
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {!isPro && <span className="hidden text-xs text-zinc-400 sm:block">{left}/3 today</span>}
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${isPro ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900'}`}>
              {isPro ? 'Pro' : 'Free'}
            </span>
            <button onClick={toggleTheme} aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:hover:text-zinc-100">
              {dark ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 md:px-10">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
