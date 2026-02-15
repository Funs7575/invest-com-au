# Invest.com.au

Australia's independent broker comparison platform.

## Tech Stack

- Next.js 15 (App Router)
- Supabase (PostgreSQL + Auth)
- Tailwind CSS
- TypeScript

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your Supabase credentials (see `.env.local.example`)

3. Run the development server:
```bash
npm run dev
```

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Database Setup

Run the SQL migration in Supabase SQL Editor (see `supabase/migrations/001_initial.sql`)
