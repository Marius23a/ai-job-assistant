'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function signInWithEmail() {
    if (!email.trim()) return
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setSent(true)
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold">Sign in</h1>

      {sent ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Check your inbox — we sent a magic link to <b>{email}</b>.
        </p>
      ) : (
        <>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="rounded-xl border border-zinc-300 p-3 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button onClick={signInWithEmail} className="rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
            Email me a magic link
          </button>
          <div className="text-center text-xs text-zinc-400">or</div>
          <button onClick={signInWithGoogle} className="rounded-xl border border-zinc-300 py-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Continue with Google
          </button>
        </>
      )}
    </main>
  )
}
