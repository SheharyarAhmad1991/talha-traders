# Talha Traders

Admin dashboard for tracking raw material quantities and labor payments.

## Stack

- Next.js (App Router) + Tailwind CSS + Shadcn UI
- Prisma + Supabase PostgreSQL
- React Hook Form + Zod
- Deploy: Vercel Free Tier

## Local setup

1. Copy `.env.example` to `.env` and fill in Supabase + auth values.
2. Install and setup:

```bash
npm install
npm run db:setup
npm run dev
```

3. Login:
   - Email: `admin@talhatraders.com`
   - Password: `admin123`

## Vercel environment variables

Set these in the Vercel project settings:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

After first deploy, run seed once (local against production DB or Vercel CLI):

```bash
npm run db:seed
```

## Sidebar order

1. Dashboard Home
2. Purchase Material
3. Issue to Moulder
4. Receive Product
5. Download Statement
6. Settings
