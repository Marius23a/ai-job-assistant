import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { optimizeCv } from '@/lib/openai'

export const runtime = 'nodejs'
export const maxDuration = 60

type UsageRow = { allowed: boolean; used: number; daily_limit: number; plan: string }

// POST /api/optimize-cv  { cv_id?, cv_text?, job_description }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const jobDescription = String(body.job_description ?? '').trim()
  const cvId: string | undefined = body.cv_id
  let cvText = String(body.cv_text ?? '').trim()

  if (cvId && !cvText) {
    const { data: cv } = await supabase
      .from('cvs').select('extracted_text').eq('id', cvId).single()
    cvText = cv?.extracted_text?.trim() ?? ''
  }
  if (!cvText) return NextResponse.json({ error: 'Add a CV first.' }, { status: 400 })
  if (!jobDescription) return NextResponse.json({ error: 'Paste a job description.' }, { status: 400 })

  // 1) Check the limit WITHOUT consuming it.
  const { data: statusData, error: statusErr } = await supabase.rpc('get_usage_status', {
    p_user_id: user.id,
  })
  if (statusErr) return NextResponse.json({ error: 'Could not verify your usage.' }, { status: 500 })

  const meter = (Array.isArray(statusData) ? statusData[0] : statusData) as UsageRow
  if (!meter?.allowed) {
    return NextResponse.json(
      {
        error: 'limit_reached',
        message: `You've used all ${meter?.daily_limit} free generations today. Upgrade to Pro for unlimited.`,
        usage: meter,
      },
      { status: 402 },
    )
  }

  // 2) Run the model. If this throws, no generation was counted.
  let result
  try {
    result = await optimizeCv(cvText, jobDescription)
  } catch (e) {
    console.error('optimize-cv failed:', e)
    return NextResponse.json({ error: 'The AI request failed. Please try again.' }, { status: 502 })
  }

  // 3) Only a SUCCESSFUL generation consumes one.
  const { data: used } = await supabase.rpc('increment_usage', { p_user_id: user.id })

  await supabase.from('ai_generations').insert({
    user_id: user.id,
    type: 'cv_optimization',
    cv_id: cvId ?? null,
    input: { job_description: jobDescription },
    output: result.analysis,
    model: result.model,
    tokens_used: result.tokens,
  })

  return NextResponse.json({
    analysis: result.analysis,
    usage: { ...meter, used: typeof used === 'number' ? used : meter.used },
  })
}
