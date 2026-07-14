import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractText } from '@/lib/parse-document'

export const runtime = 'nodejs'

// GET /api/cvs — list the user's saved CVs (newest first)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: cvs } = await supabase
    .from('cvs')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ cvs: cvs ?? [] })
}

// POST /api/cvs — multipart form with a "file" field.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File is too large (max 5 MB).' }, { status: 400 })
  }

  // Free plan stores 1 CV; Pro is unlimited.
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase.from('cvs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  if (profile?.plan !== 'pro' && (count ?? 0) >= 1) {
    return NextResponse.json(
      { error: 'limit_reached', message: 'The Free plan stores one CV. Pick your saved CV, or upgrade to Pro for unlimited storage.' },
      { status: 402 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let text: string
  try {
    text = await extractText(buffer, file.type, file.name)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
  const { error: upErr } = await supabase.storage
    .from('cvs')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (upErr) {
    return NextResponse.json({ error: 'Upload failed, please try again.' }, { status: 500 })
  }

  const { data: cv, error } = await supabase
    .from('cvs')
    .insert({
      user_id: user.id,
      title: file.name,
      file_path: path,
      extracted_text: text,
      is_default: (count ?? 0) === 0,
    })
    .select('id, title, created_at')
    .single()

  if (error) return NextResponse.json({ error: 'Could not save your CV.' }, { status: 500 })
  return NextResponse.json({ cv })
}
