# QR Shift — Setup Guide

## Quick Start (Local Demo)

Just open `index.html` in your browser. The app works fully with localStorage — no server needed for testing.

## Going Live: Supabase + Google Auth

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up with your school Google account
2. Create a new project (free tier is fine to start)
3. Note your **Project URL** and **anon key** from Settings → API

### Step 2: Set Up the Database

1. Go to the **SQL Editor** in your Supabase dashboard
2. Paste the contents of `supabase-setup.sql` and run it
3. This creates all tables, security policies, and indexes

### Step 3: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your school Google Workspace admin account
3. Create a new project (e.g., "QR Shift")
4. Navigate to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client Secret**

#### Restrict to School Domain Only

In Google Cloud Console → **OAuth consent screen**:
- Set to **Internal** (if using Google Workspace) — this automatically restricts to `@las.ch` accounts
- If set to External, you'll need to validate domain ownership

#### Add to Supabase

1. In Supabase dashboard → **Authentication → Providers**
2. Enable **Google**
3. Paste your Client ID and Client Secret
4. Save

### Step 4: Deploy

**Option A: Vercel (Recommended)**
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com), import the repo
3. Deploy — it's a static site, so no build step needed
4. Set up a custom domain (e.g., `qr.las.ch`) in Vercel settings

**Option B: Netlify**
1. Same as Vercel — drag and drop or connect GitHub repo
2. Configure custom domain

**Option C: GitHub Pages**
1. Go to repo Settings → Pages
2. Set source to the main branch
3. Your site is live at `https://<username>.github.io/QR-Shift`

### Step 5: Custom Domain (Optional)

Ask your school IT to create a DNS record:
- **CNAME**: `qr.las.ch` → `cname.vercel-dns.com` (or your Netlify/GitHub Pages URL)

## Architecture Overview

```
[Student scans QR]
       ↓
[QR Shift redirect page]
       ↓
[Evaluate routing rules]  →  Day of week? Time of day? Week number?
       ↓
[Redirect to matching URL]
```

### Context-Aware Routing

Each QR code can have routing rules that automatically serve different URLs based on:
- **Day of week**: Monday → warm-up song, Friday → freestyle playlist
- **Time of day**: Morning, Afternoon, Evening
- **Week number**: Odd/even week rotation

Rules are checked top-to-bottom. First match wins. If no rule matches, the default URL is used.

## Tech Stack

| Layer | Current (Demo) | Production |
|-------|----------------|------------|
| Auth | localStorage | Supabase Auth + Google OAuth |
| Database | localStorage | Supabase (PostgreSQL) |
| Hosting | Local file | Vercel / Netlify |
| QR Generation | qrcodejs (client) | qrcodejs (client) |
| Routing | Hash-based (#/q/slug) | Server-side or Edge Function |
