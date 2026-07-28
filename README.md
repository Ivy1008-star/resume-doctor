# Resume Doctor

AI resume diagnosis tool. Paste a resume + job description, get an ATS score,
keyword match, ATS compatibility checks, content quality, and market insight.
Free diagnosis; paid ATS rewrite ($5) and premium interview prep ($10) via PayPal.

## Stack
- Next.js 14 (App Router), plain CSS
- DeepSeek API for diagnosis / rewrite / interview prediction
- Email + password sign-in (scrypt-hashed) and Google Identity Services
- PayPal Smart Buttons for payments
- SQLite database via `sql.js` (single file at `.data/resume-doctor.db`)

## Database
All app data lives in a real SQLite database (`.data/resume-doctor.db`), managed
by `lib/db.js` (pure-JS `sql.js`, no native build step). Tables: `users`,
`reports`, `payments`, `subscriptions`, `usage`. The storage API in
`lib/store.js` is the single seam to swap for Supabase/Postgres/D1 later.

Monthly Pro subscriptions are persisted in the `subscriptions` table (status,
plan id, PayPal subscription id) with a matching row in `payments`.

If you have legacy `.data/*.json` files from an earlier build, import them once:
```bash
npm run migrate
```

Run the end-to-end smoke test (boots the server, exercises the full flow):
```bash
npm run smoke
```

## Run locally
```bash
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev                         # http://localhost:3000
```

## Demo mode
If a key is missing (value still starts with `your_`), that piece runs in demo mode:
- No DeepSeek key -> deterministic demo analysis derived from your pasted text
- No Google client id -> email/password sign-in still works; a "Demo Account"
  button is also shown for one-click preview
- No PayPal creds -> a simulated "pay" button that unlocks results without charge

Fill the real values in `.env.local` and restart to switch everything to production behavior.

## Environment variables
See `.env.local.example`. Key ones:
- `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` (default `deepseek-v4-flash`; use `deepseek-chat` if that id is rejected)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`
- `SESSION_SECRET`

## Privacy
Raw resume/JD text is auto-deleted 30 days after analysis. Users can delete all
data from the dashboard. Payments go through PayPal; no card data touches the server.
