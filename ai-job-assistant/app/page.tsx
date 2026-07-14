import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl">✦</div>
      <h1 className="text-4xl font-bold tracking-tight">AI Job Assistant</h1>
      <p className="max-w-md text-zinc-500">
        Optimise your CV, generate cover letters, and track every application — powered by AI.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Open dashboard
        </Link>
        <Link href="/pricing" className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
          Pricing
        </Link>
      </div>
    </main>
  )
}
