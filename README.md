# Kinetiq

Kinetiq is a Next.js marketing and retention app for local businesses. It combines QR-based customer check-ins, multi-tenant business analytics, AI-assisted ad creation, and transactional email workflows in one product demo.

## Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS
- Supabase Postgres + Storage
- Anthropic Claude for ad copy generation
- Google Imagen for AI image generation
- Resend for transactional email
- Jest for API and library tests

## Core Features

- Multi-tenant business data model with `business_id` scoping
- QR check-in flow at `/checkin/[slug]`
- Customer creation and business-specific check-in logging
- AI image generation for ads
- Ad variant generation and dispatch flows
- Analytics dashboard with per-business filtering

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`.

Required values include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`

3. Start the app:

```bash
npm run dev
```

4. Run tests:

```bash
npm test
```

5. Run a production build check:

```bash
npm run build
```

## Project Structure

- `app/` application routes and API handlers
- `components/` client UI components
- `lib/` shared integrations and service helpers
- `supabase/migrations/` database schema changes
- `__tests__/` Jest coverage for core logic and API routes
