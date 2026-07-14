# AI Job Assistant — backend slice

This is the data layer plus the **CV Optimizer feature wired end to end**: file
upload → text extraction → OpenAI structured analysis → server-side plan
enforcement → saved history. It pairs with the front-end prototype
(`ai-job-assistant.html`).

The goal here is to make the two load-bearing parts real: the **database (with
security)** and **one complete vertical feature** you can copy the pattern from
for the rest.

## What's in here

```
supabase/migrations/
  0001_init.sql        Tables, enums, RLS, triggers, the usage-meter function
  0002_storage.sql     Private 'cvs' bucket + owner-scoped policies
lib/
  supabase/{client,server,admin,middleware}.ts   Three clients for three trust levels
  openai.ts            OpenAI call returning a Zod-validated AtsAnalysis
  parse-document.ts    PDF/DOCX → text
app/api/
  cvs/route.ts         Upload + parse + store (enforces Free = 1 CV)
  optimize-cv/route.ts The flagship: gate → analyze → save (enforces Free = 3/day)
  stripe/webhook/route.ts  Flips a user to 'pro' when their subscription is active
components/cv-optimizer.tsx   Client UI talking to the routes above
middleware.ts          Keeps the auth session fresh
```

## How the freemium model is enforced

The limits are **server-side and race-safe**, not UI hints:

1. Every AI route calls the `check_and_increment_usage(user_id)` Postgres
   function *before* doing any work.
2. That function locks the user's daily row (`for update`), so two simultaneous
   requests can't both slip past the cap. Free = 3/day, Pro = unlimited.
3. Plan comes from `profiles.plan`, which the **Stripe webhook** keeps in sync.
   Active subscription → `pro`; canceled/lapsed → `free`.

The same `check_and_increment_usage` call is the one line every future AI feature
(cover letters, interview feedback, advisor) reuses.

## Why three Supabase clients

| Client | Runs as | Use for |
|---|---|---|
| `client.ts` | the user | browser components |
| `server.ts` | the user | route handlers / server components — **RLS applies** |
| `admin.ts` | service role | the Stripe webhook only — **bypasses RLS** |

Row-Level Security means even if a query is wrong, a user can never read another
user's CVs, applications, or history.

## Setup

```bash
npm install
cp .env.example .env.local        # fill in Supabase, OpenAI, Stripe

# apply the schema
supabase link --project-ref YOUR_REF
supabase db push

npm run dev
```

Enable **Email** and **Google** providers in Supabase Auth. For Stripe locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

When creating the Pro checkout session, pass the Supabase user id as
`client_reference_id` so the webhook can map the subscription back to the user.

## Notes / things to wire next

- **Auth pages & dashboard shell** — the middleware already guards `/dashboard`;
  add the login page and the layout that hosts `<CVOptimizer />`.
- **Reuse the pattern** for Cover Letters, Interview Prep, Resume Analyzer:
  same gate, a new Zod schema in `lib/openai.ts`, a new route.
- **Daily reset** uses UTC. Switch to the user's timezone if you want a local
  midnight reset.
- **Type generation** — replace `types/database.ts` with
  `supabase gen types typescript --linked`.
- **Costs** — `extract-document` caps input at 30k chars; the default model is
  `gpt-4o-mini`. Route Pro users to a stronger model for "priority responses".
