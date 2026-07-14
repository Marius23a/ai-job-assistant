'use client'

import { useEffect, useRef, useState } from 'react'

type Analysis = {
  original_score: number
  optimized_score: number
  summary: string
  matched_keywords: string[]
  missing_keywords: string[]
  bullet_rewrites: { before: string; after: string; reason: string }[]
  suggestions: string[]
}

type SavedCv = { id: string; title: string; created_at: string }

const scoreColor = (v: number) => (v >= 75 ? '#16a34a' : v >= 50 ? '#d97706' : '#dc2626')

// e.g. "12 Jun 2026, 14:32"
function formatAdded(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function Ring({ value, size = 96 }: { value: number; size?: number }) {
  const sw = Math.max(6, size * 0.085)
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(value)} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-semibold tabular-nums" style={{ fontSize: size * 0.28 }}>
        {value}
      </div>
    </div>
  )
}

export function CVOptimizer() {
  const [savedCvs, setSavedCvs] = useState<SavedCv[]>([])
  const [cvId, setCvId] = useState<string>('')
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState<'upload' | 'analyze' | null>(null)
  const [result, setResult] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsUpgrade, setNeedsUpgrade] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Load the CVs the user already uploaded, and preselect the newest.
  useEffect(() => {
    fetch('/api/cvs')
      .then((r) => r.json())
      .then((d) => {
        const cvs: SavedCv[] = d.cvs ?? []
        setSavedCvs(cvs)
        if (cvs.length > 0) setCvId(cvs[0].id)
      })
      .catch(() => {})
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null); setNeedsUpgrade(false); setLoading('upload')

    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/cvs', { method: 'POST', body: form })
    const data = await res.json()
    setLoading(null)
    if (fileInput.current) fileInput.current.value = ''

    if (!res.ok) {
      if (data.error === 'limit_reached') setNeedsUpgrade(true)
      setError(data.message ?? data.error ?? 'Upload failed.')
      return
    }
    setSavedCvs((prev) => [data.cv, ...prev.filter((c) => c.id !== data.cv.id)])
    setCvId(data.cv.id)
  }

  async function analyze() {
    if (!cvId || !jd.trim()) return
    setError(null); setNeedsUpgrade(false); setLoading('analyze'); setResult(null)

    const res = await fetch('/api/optimize-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv_id: cvId, job_description: jd }),
    })
    const data = await res.json()
    setLoading(null)

    if (!res.ok) {
      if (data.error === 'limit_reached') setNeedsUpgrade(true)
      setError(data.message ?? data.error ?? 'Analysis failed.')
      return
    }
    setResult(data.analysis)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(340px,400px)_1fr] lg:items-start">
      {/* Input */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="mb-2 block text-xs font-semibold text-zinc-500">Your CV</label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={cvId}
              onChange={(e) => setCvId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-3 pr-9 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-800/50"
            >
              {savedCvs.length === 0 && <option value="">No saved CV — upload one →</option>}
              {savedCvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.title} · {formatAdded(cv.created_at)}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <button
            onClick={() => fileInput.current?.click()}
            title="Upload a new CV"
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-800 dark:hover:border-indigo-500/40"
          >
            {loading === 'upload' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 animate-spin"><path d="M21 12a9 9 0 11-6.2-8.5" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
            )}
          </button>
        </div>
        <input ref={fileInput} type="file" accept=".pdf,.docx" hidden onChange={handleUpload} />

        <label className="mb-2 mt-4 block text-xs font-semibold text-zinc-500">Job description</label>
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description here…"
          className="min-h-[140px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-800/50" />

        <button onClick={analyze} disabled={!cvId || !jd.trim() || loading === 'analyze'}
          className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40">
          {loading === 'analyze' ? 'Analyzing…' : 'Analyze CV'}
        </button>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
            {needsUpgrade && <a href="/pricing" className="ml-1 font-semibold underline">Upgrade to Pro →</a>}
          </div>
        )}
      </div>

      {/* Output */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        {!result ? (
          <div className="grid h-full place-items-center px-6 py-12 text-center text-zinc-400">
            <p className="text-sm">
              <span className="block font-semibold text-zinc-500">Your analysis will appear here</span>
              Add a job description and run the analysis to see your ATS score and tailored suggestions.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-5 flex items-center gap-4">
              <Ring value={result.optimized_score} />
              <div>
                <div className="text-xs text-zinc-500">Optimised ATS score</div>
                <div className="text-2xl font-semibold tabular-nums">{result.original_score} → {result.optimized_score}</div>
                <div className="mt-0.5 text-xs font-semibold text-emerald-600">▲ {result.optimized_score - result.original_score} points</div>
              </div>
            </div>

            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{result.summary}</p>

            <div className="mb-4 flex flex-wrap gap-2">
              {result.matched_keywords.map((k) => (
                <span key={k} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{k} ✓</span>
              ))}
              {result.missing_keywords.map((k) => (
                <span key={k} className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">{k} +</span>
              ))}
            </div>

            {result.bullet_rewrites.slice(0, 3).map((b, i) => (
              <div key={i} className="mb-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="bg-red-50 p-3 text-sm dark:bg-red-950/30">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-red-600">Before</span>{b.before}
                </div>
                <div className="bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-emerald-600">After</span>{b.after}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
