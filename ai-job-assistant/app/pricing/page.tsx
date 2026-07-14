'use client'

import { useState } from 'react'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  async function upgrade() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) location.href = data.url
    else { setLoading(false); alert(data.error ?? 'Could not start checkout.') }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-center text-3xl font-bold">Simple pricing</h1>
      <p className="mb-10 text-center text-zinc-500">Start free. Upgrade when you need more.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="my-3 text-3xl font-bold">£0</p>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li>✓ 3 AI generations / day</li>
            <li>✓ 1 saved CV</li>
            <li>✓ Basic ATS analysis</li>
          </ul>
        </div>

        <div className="rounded-2xl border-2 border-indigo-500 p-6">
          <h2 className="text-lg font-semibold">Pro</h2>
          <p className="my-3 text-3xl font-bold">£9.99<span className="text-base font-normal text-zinc-500">/mo</span></p>
          <ul className="mb-6 space-y-2 text-sm text-zinc-500">
            <li>✓ Unlimited AI generations</li>
            <li>✓ Unlimited CV storage</li>
            <li>✓ Cover letters, interviews & job tracker</li>
            <li>✓ Priority AI responses</li>
          </ul>
          <button onClick={upgrade} disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
    </main>
  )
}
