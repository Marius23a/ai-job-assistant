import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!, quantity: 1 }],
    // The webhook reads this to know which user upgraded.
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: `${site}/dashboard?upgraded=1`,
    cancel_url: `${site}/pricing`,
  })

  return NextResponse.json({ url: session.url })
}
