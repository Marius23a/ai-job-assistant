import { createClient } from '@supabase/supabase-js'

// Service-role client. BYPASSES Row-Level Security — use ONLY in trusted
// server contexts (e.g. the Stripe webhook). Never import this in client code.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
