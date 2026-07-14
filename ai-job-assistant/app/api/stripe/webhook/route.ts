import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// This webhook closes the freemium loop: when a subscription becomes active,
// the user's plan flips to 'pro' everywhere (which the usage function reads).
export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature failed: ${(err as Error).message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.object as Stripe.Checkout.Session
      // We pass the Supabase user id as client_reference_id when creating the checkout.
      const userId = session.client_reference_id
      if (userId && session.subscription) {
        await syncSubscription(userId, session.subscription as string, session.customer as string)
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      if (userId) await applySubscription(userId, sub)
      break
    }
  }

  return NextResponse.json({ received: true })
}

async function syncSubscription(userId: string, subscriptionId: string, customerId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  // Keep our copy able to map future events back to the user.
  await stripe.subscriptions.update(subscriptionId, { metadata: { user_id: userId } })
  await applySubscription(userId, sub, customerId)
}

async function applySubscription(
  userId: string,
  sub: Stripe.Subscription,
  customerId?: string,
) {
  const isActive = sub.status === 'active' || sub.status === 'trialing'
  const plan = isActive ? 'pro' : 'free'

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId ?? (sub.customer as string),
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status as never,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' },
  )

  // Cached plan that the usage function and UI read.
  await supabaseAdmin.from('profiles').update({ plan }).eq('id', userId)
}
