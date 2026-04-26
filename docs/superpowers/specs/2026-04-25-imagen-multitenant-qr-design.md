# Kinetiq — Imagen 3 + Multi-Tenant Schema + QR Check-In Design

**Date:** 2026-04-25
**Status:** Approved

---

## Overview

Three interconnected additions:

1. **Imagen 3 image generation** — businesses can generate an ad image via AI instead of uploading a photo
2. **Multi-tenant schema** — add a `businesses` table and wire `business_id` FKs through all existing tables
3. **QR check-in flow** — each business gets a unique QR code URL; customers scan it, complete a mini survey, and are logged as a check-in tied to that business

---

## 1. Multi-Tenant Schema

### New tables

**`businesses`**
```
id           uuid primary key default gen_random_uuid()
name         text not null
slug         text not null unique          -- used in QR URL, e.g. "wild-barre"
owner_email  text not null
created_at   timestamptz default now()
```

**`qr_codes`**
```
id           uuid primary key default gen_random_uuid()
business_id  uuid not null references businesses(id)
label        text not null                 -- e.g. "Front Door", "Counter"
created_at   timestamptz default now()
```

### Modified tables — add `business_id` FK

| Table | Change |
|---|---|
| `customers` | add `business_id uuid not null references businesses(id)` |
| `check_ins` | add `business_id uuid not null references businesses(id)` |
| `campaigns` | add `business_id uuid not null references businesses(id)` |
| `rewards_milestones` | add `business_id uuid not null references businesses(id)` |
| `customer_segments` | add `business_id uuid not null references businesses(id)`, update unique constraint to `(customer_id, business_id, segment)` |

### Demo seed data

Three businesses seeded for the hackathon demo:
- **Wild & The Barre** — slug: `wild-barre`
- **Blue Bottle Coffee** — slug: `blue-bottle`
- **Casa Azteca** — slug: `casa-azteca`

Seed lives in `lib/seed.ts` and is run once via a script.

---

## 2. QR Check-In Flow

### URL structure

Each business's QR code points to:
```
/checkin/[slug]
```
e.g. `/checkin/wild-barre`

### Page behavior

1. Load business by `slug` from `businesses` table
2. Show mini survey form:
   - First name (required)
   - Last name (required)
   - Email (required)
   - Phone (optional)
   - Birthday (optional)
3. On submit:
   - Look up customer by `email + business_id`
   - If new: insert into `customers` with `business_id`, insert into `customer_segments` as `new`
   - Always: insert into `check_ins` with `customer_id + business_id`
   - Send welcome email if new customer
4. Show a simple confirmation screen ("Thanks! You're checked in.")

### API route

`POST /api/qr-checkin` — new unified endpoint that handles the full survey submission:
1. Accepts `{ slug, first_name, last_name, email, phone, birthday }`
2. Resolves `business_id` from `slug`
3. Upserts customer by `email + business_id` (creates if new, returns existing if returning)
4. Inserts a `check_ins` row with `customer_id + business_id`
5. Sends welcome email if customer was newly created
6. Returns `{ customer_id, is_new, total_check_ins }`

The existing `POST /api/checkin` (used internally for milestone/streak logic) stays unchanged.

### Page route

`app/checkin/[slug]/page.tsx` — server component that fetches the business by slug (404 if not found), renders the `CheckInForm` client component

---

## 3. Imagen 3 Image Generation

### New API route

`POST /api/generate-image`

Request body:
```json
{
  "businessName": "Wild & The Barre",
  "adGoal": "Promote our summer yoga series",
  "tone": "energetic"
}
```

Response:
```json
{
  "imageUrl": "https://..."
}
```

Implementation:
- Uses `@google/generative-ai` SDK (already installed) with model `imagen-3.0-generate-002`
- Builds a prompt from `businessName + adGoal + tone`
- Uploads the generated image to Supabase Storage (`campaign-photos` bucket) and returns the public URL
- Uses existing `GEMINI_API_KEY` env var

### Ad Wizard UI change

In `CreateAdWizard.tsx`, the photo upload step gets a toggle:

```
[ Upload Photo ]  [ Generate with AI ]
```

- **Upload Photo** — existing file input (unchanged)
- **Generate with AI** — calls `POST /api/generate-image` with current wizard values, shows a loading state, then previews the result

The rest of the wizard (copy generation, platform selection, dispatch) is unchanged — both paths produce a `photoUrl` that flows into the existing `generate-ad` route.

### `generate-ad` route change

`photo` becomes optional. If not provided in the form data, a `generated_image_url` field is accepted instead and used directly as `photoUrl`.

---

## 4. Dashboard — Business Selector

The analytics dashboard (`AnalyticsDashboard.tsx`) gets a simple business selector dropdown at the top. Selecting a business filters all queries (customers, check-ins, campaigns) by `business_id`.

For the demo, the selector is populated from the seeded `businesses` table via `GET /api/stats` (already exists — updated to accept a `business_id` query param).

---

## Data Flow Summary

```
QR scan → /checkin/[slug] → survey form
       → POST /api/checkin (with business_id)
       → customers + check_ins rows (scoped to business)
       → welcome email via Resend

Ad wizard → upload photo OR click "Generate with AI"
          → POST /api/generate-image (Imagen 3)
          → photoUrl returned
          → POST /api/generate-ad (unchanged from here)
          → campaign row (scoped to business_id)
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `supabase/migrations/001_add_businesses.sql` | Create |
| `supabase/migrations/002_add_business_id_fks.sql` | Create |
| `supabase/seed.sql` | Create |
| `lib/supabase.ts` | Add `Business`, `QrCode` types |
| `app/checkin/[slug]/page.tsx` | Create |
| `components/CheckInForm.tsx` | Create |
| `app/api/qr-checkin/route.ts` | Create — unified survey + check-in endpoint |
| `app/api/generate-image/route.ts` | Create |
| `app/api/stats/route.ts` | Update — filter by `business_id` |
| `components/CreateAdWizard.tsx` | Update — add Upload/Generate toggle |
| `components/AnalyticsDashboard.tsx` | Update — add business selector |
