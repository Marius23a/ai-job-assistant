# Ghid de instalare (RO)

Proiect Next.js complet. Ai nevoie de câteva conturi gratuite și de ~20 de minute.

## 0. De ce ai nevoie
- **Node.js 20+** — descarcă de pe https://nodejs.org (versiunea LTS)
- Un editor de cod — recomand **VS Code**
- Cont gratuit **Supabase** (bază de date + login)
- Cont **OpenAI** cu o cheie API (necesită credit, minim)
- Cont **Stripe** — opțional la început; îl poți lăsa pe mai târziu

## 1. Deschide proiectul
Dezarhivează `ai-job-assistant.zip`. În VS Code: File → Open Folder → alege folderul `ai-job-assistant`. Deschide un terminal (Terminal → New Terminal) și rulează:

```bash
npm install
```

## 2. Creează proiectul Supabase
1. Intră pe https://supabase.com → New project. Alege un nume și o parolă.
2. După ce se creează, mergi la **SQL Editor** → New query.
3. Copiază tot din `supabase/migrations/0001_init.sql`, lipește, apasă **Run**.
4. Repetă cu `supabase/migrations/0002_storage.sql`.
5. Mergi la **Authentication → Providers** și activează **Email** și **Google**.

## 3. Ia cheile și pune-le în `.env.local`
Copiază fișierul `.env.example` și redenumește-l `.env.local`. Completează:

- **Supabase** (Project Settings → API):
  - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = cheia `anon public`
  - `SUPABASE_SERVICE_ROLE_KEY` = cheia `service_role` (secretă!)
- **OpenAI** (https://platform.openai.com/api-keys):
  - `OPENAI_API_KEY` = cheia `sk-...`
- **App**:
  - `NEXT_PUBLIC_SITE_URL` = `http://localhost:3000`

Pe Stripe le poți lăsa goale deocamdată (upgrade-ul nu va merge, dar restul da).

## 4. Pornește aplicația
```bash
npm run dev
```
Deschide http://localhost:3000 → **Open dashboard** → te loghezi cu emailul
(primești un link magic pe email) → încarci un CV (PDF/DOCX), lipești un anunț
de job și apeși **Analyze CV**.

## 5. (Opțional) Stripe pentru planul Pro
1. https://dashboard.stripe.com → creează un **Product** cu preț recurent £9.99/lună.
2. Copiază `Price ID` (`price_...`) în `NEXT_PUBLIC_STRIPE_PRICE_PRO`.
3. Pune `STRIPE_SECRET_KEY` (Developers → API keys).
4. Local, pornește ascultătorul de webhook-uri:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copiază `whsec_...` afișat în `STRIPE_WEBHOOK_SECRET`.

## 6. Publicare online (Vercel)
1. Urcă folderul pe GitHub.
2. https://vercel.com → Import Project → alege repo-ul.
3. La **Environment Variables**, adaugă aceleași valori din `.env.local`
   (schimbă `NEXT_PUBLIC_SITE_URL` cu adresa reală de pe Vercel).
4. Deploy. Apoi adaugă un webhook Stripe către
   `https://adresa-ta.vercel.app/api/stripe/webhook`.

## Probleme frecvente
- **„Please sign in”** — nu ești logat; du-te la `/login`.
- **Eroare la analiză** — verifică `OPENAI_API_KEY` și că ai credit pe OpenAI.
- **Upload eșuat** — ai rulat `0002_storage.sql`? Bucket-ul `cvs` trebuie să existe.
- **Limita de 3/zi** — e normal pe planul Free; e resetată zilnic.
