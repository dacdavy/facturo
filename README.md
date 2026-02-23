# Facturo - Invoice Aggregator

Automatically gather and organize invoices from your Gmail inbox. Facturo connects to your email, scans for invoice PDFs from services like Spotify, Cursor, Netflix, and more, then uses AI to extract key data (amount, date, provider).

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: Shadcn UI + Tailwind CSS v4
- **Auth & Database**: Supabase (Auth, PostgreSQL, Storage)
- **Email**: Gmail API (OAuth2, read-only)
- **AI Extraction**: Anthropic Claude API
- **Deployment**: Vercel

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/facturo.git
cd facturo
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration in `supabase/migration.sql`
3. Copy your project URL and keys from Settings > API

### 3. Set up Google Cloud (Gmail API)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable the **Gmail API**
3. Create OAuth 2.0 credentials (Web Application)
4. Add `http://localhost:3000/api/gmail/callback` as an authorized redirect URI
5. Copy Client ID and Client Secret

### 4. Set up Anthropic

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
# Fill in all values in .env.local
```

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local.example`
4. Update `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Add the Vercel domain to Google Cloud OAuth redirect URIs

## Project Structure

```
src/
  app/
    (auth)/login, signup     Auth pages
    (dashboard)/dashboard    Invoice table + stats
    (dashboard)/settings     Connect/manage Gmail accounts
    api/gmail/               OAuth + email scanning
    api/invoices/            Invoice CRUD
  components/                UI components
  lib/                       Supabase, Gmail, AI helpers
```
