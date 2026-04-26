# Kinetiq

Kinetiq is a hackathon-built SMB marketing app that helps local businesses create and distribute ads faster. The current product combines AI-generated campaign visuals, AI-written ad copy, optional QR-based check-in flows, business-scoped analytics, and automated posting workflows.

## What It Does

- Generates ad images from a business goal and tone
- Produces channel-specific ad copy variants
- Stores campaigns and assets in a shared backend
- Automates outbound posting workflows with Manus
- Supports multi-business data scoping for demos and analytics
- Includes a QR check-in flow for customer capture and retention experiments

## Tech Stack

### App Framework

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

### Backend and Data

- Next.js API routes for server-side workflows
- Supabase Postgres for application data
- Supabase Storage for uploaded and generated campaign assets

### AI and Automation

- Google Imagen 3 for ad image generation
- Google Gemini 2.5 Flash for ad copy generation and community targeting suggestions
- Manus for distribution and posting automation
- Resend for transactional email flows

### Testing

- Jest
- ts-jest

## Product Flow

### 1. Create a Campaign

The business owner enters:

- business name
- ad goal
- tone
- optional location

They can either upload a photo or generate one with AI.

### 2. Generate the Visual

If the user chooses AI generation, the app sends the business context to the `/api/generate-image` route, which:

- calls Google Imagen
- receives the generated image bytes
- uploads the image to Supabase Storage
- returns a public asset URL

### 3. Generate Ad Copy

The `/api/generate-ad` route creates a campaign record, resolves the photo URL, and generates three ad copy variants using Gemini:

- Instagram-style copy
- Facebook-style copy
- Google Business Profile copy

### 4. Review and Select

The ad wizard displays the generated image and copy variants so the user can review the campaign before dispatching it.

### 5. Dispatch and Automate

From there, the app can:

- dispatch selected ads to supported channels
- ask Gemini for suggested communities relevant to the business
- trigger Manus automation workflows for outbound posting tasks

Important note: community discovery is currently AI-suggested targeting, not live Facebook scraping.

## Main Features

- AI ad generation wizard
- Optional AI image creation
- Multi-tenant business model via `business_id`
- QR check-in flow at `/checkin/[slug]`
- Business-filtered analytics dashboard
- Community discovery and posting workflows
- Welcome and reward email helpers

## Project Structure

- `app/` Next.js pages and API routes
- `components/` React UI components
- `lib/` service integrations and shared logic
- `supabase/migrations/` database migrations
- `supabase/seed.sql` demo seed data
- `__tests__/` API and library tests

## Key API Routes

- `POST /api/generate-image` generate an ad image with Imagen
- `POST /api/generate-ad` create a campaign and generate ad copy
- `POST /api/dispatch` trigger distribution steps
- `POST /api/discover-groups` get AI-suggested communities
- `POST /api/post-to-groups` post approved group content
- `POST /api/qr-checkin` capture QR-based customer check-ins
- `GET /api/stats` fetch dashboard metrics, optionally filtered by `business_id`

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Create an Environment File

Copy `.env.example` to `.env` and fill in the values.

```bash
cp .env.example .env
```

### 3. Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `MANUS_API_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

## Run the App

```bash
npm run dev
```

Open `http://localhost:3000`.

## Test and Build

Run tests:

```bash
npm test
```

Run a production build:

```bash
npm run build
```

## Notes

- This repo is optimized around the hackathon demo flow, especially AI ad generation and outbound automation.
- Some broader retention features are present in the codebase even if they are not the primary live demo.
