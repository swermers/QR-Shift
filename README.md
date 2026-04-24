# QR Shift

Dynamic QR codes with context-aware routing. Print once, update anytime.

This is the **no-account, Vercel-deployable** version: no login, no database
schema to manage. Create a QR code, keep the edit link that comes back, and
you're the "owner" as long as you have that link.

## Features

- Rotate the destination URL of a printed QR code at any time
- Routing rules: time of day, day of week, device type, geo IP, date range,
  custom query parameters
- Per-QR analytics (scans, clicks, devices, locations, referrers)
- QR code customization (colors, logo, pattern, corners) with PNG download
- Social preview meta tags (OG, Twitter) for crawlers
- Single Next.js app — works on Vercel's free tier with Upstash Redis

## How ownership works

There are no accounts. When you create a QR code you get back an **edit URL**
containing a secret token:

```
https://qr-shift.example.com/edit/abc123?token=XXXXXX
```

Bookmark it. Whoever has that URL can change the destination, add rules,
disable, or delete the code. The token is hashed (SHA-256) before it's stored
server-side, so a leaked Redis snapshot does not leak edit power. Short links
(`/q/{slug}`) are public by design — that's the QR target.

## Running locally

```bash
cd app
npm install
npm run dev
```

With no environment variables set, the app runs in **in-memory dev mode** —
QR codes persist for the lifetime of the Node process only. That's fine for
poking at the UI; it's NOT fine for anything you actually print.

To persist locally, create `app/.env.local`:

```
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deploying to Vercel

1. Import the repo into Vercel. Set the project root to `app/`.
2. In the Vercel dashboard, add the **Upstash Redis** integration (free tier
   works). Vercel will auto-populate `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`.
3. Set `NEXT_PUBLIC_APP_URL` to your deployed URL (e.g.
   `https://qr-shift.example.com`). This is used in the QR code itself and in
   the edit-link display.
4. Optionally set `NEXT_PUBLIC_SHORT_DOMAIN` if you want short links to point
   at a different host (e.g. a shorter vanity domain that proxies back to the
   main deployment).
5. Deploy. Visit the root URL, create a QR, save the edit link.

### Embedding it in a portfolio site

The whole thing is one self-contained Next.js app. Either deploy it on its
own (`qr-shift.yourdomain.com`) and link to it from your portfolio, or embed
the project page inside an iframe if you want it to feel inline.

## Data model

Stored in Redis (Upstash) with three key patterns:

| Key              | Contents                                                   |
| ---------------- | ---------------------------------------------------------- |
| `qr:{slug}`      | JSON — the QR code (destination, label, style, token hash, counters) |
| `rules:{slug}`   | JSON array of routing rules                                |
| `scans:{slug}`   | Capped list (1000) of recent scan events as JSON strings   |

## Routes

- `/` — landing page + create form
- `/edit/[slug]?token=...` — owner-only editor (link, rules, QR customization, analytics)
- `/q/[slug]` — the redirect engine. This is the URL the QR code actually encodes

## Limitations of this version

- No account recovery — lose the edit link, lose the code
- No multi-device sync of edit links
- No API (removed; re-add if you need programmatic control)
- Scan history capped at 1000 events per QR
- Geo signals come from Vercel's edge headers; in other hosts you'll need to
  wire up your own IP lookup
