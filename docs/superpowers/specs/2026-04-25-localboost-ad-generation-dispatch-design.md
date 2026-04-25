# LocalBoost — Ad Generation + Dispatch

**Date:** 2026-04-25
**Owner:** michaelt244
**Scope:** Backend API for ad creation and platform dispatch. Frontend + retention handled by teammate.

---

## Overview

Two API routes power the marketing section of LocalBoost:

1. `POST /api/generate-ad` — accepts a photo upload + business context, calls Claude Vision, returns 3 ad copy variants
2. `POST /api/dispatch` — accepts a selected variant + target platforms, triggers Manus to post to Facebook, Instagram, and Google Business, returns per-platform status

All campaign data is persisted in Supabase.

---

## API Design

### POST /api/generate-ad

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `photo` | File | The business photo to analyze |
| `business_name` | string | e.g. "Wild & The Barre" |
| `ad_goal` | string | e.g. "summer class promo" |
| `tone` | string | `energetic` \| `professional` \| `warm` |

**Response:** `200 OK`

```json
{
  "campaign_id": "uuid",
  "variants": [
    { "label": "A", "copy": "...", "platform": "instagram" },
    { "label": "B", "copy": "...", "platform": "facebook" },
    { "label": "C", "copy": "...", "platform": "google_business" }
  ]
}
```

**Behavior:**
- Upload photo to Supabase Storage, get a public URL
- Send photo URL + context to Claude Vision (`claude-sonnet-4-6`) as a multimodal message
- Prompt instructs Claude to return exactly 3 variants as JSON: one optimized for Instagram (casual, emoji-friendly, ≤140 chars), one for Facebook (community-tone, ≤200 chars), one for Google Business (offer-led, ≤120 chars)
- Save campaign row to Supabase `campaigns` table with `variants` populated
- Return `campaign_id` + variants

### POST /api/dispatch

**Request:** `application/json`

| Field | Type | Description |
|---|---|---|
| `campaign_id` | string | UUID from generate-ad |
| `selected_variant` | number | 0, 1, or 2 |
| `platforms` | string[] | subset of `["facebook", "instagram", "google_business"]` |

**Response:** `200 OK`

```json
{
  "results": {
    "facebook": "posted",
    "instagram": "posted",
    "google_business": "pending"
  }
}
```

**Behavior:**
- Load campaign from Supabase to get the selected variant copy + photo URL
- For each platform, trigger Manus automation (see Manus Integration below)
- Poll or await result per platform
- Update `dispatch_status` on the campaign row
- Return results map

---

## Manus Integration

Manus is used as the posting automation layer. The exact trigger mechanism depends on the Manus API/webhook exposed by the account. The dispatch route should call Manus with:

- The ad copy text
- The photo URL
- The target platform identifier

This is the one dependency to confirm before implementing dispatch. If Manus exposes a REST API, wrap it in a thin `lib/manus.ts` client. If it's webhook-based, call it with `fetch`.

---

## Supabase Schema

### campaigns table

```sql
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  ad_goal text,
  tone text,
  photo_url text,
  variants jsonb,           -- [{label, copy, platform}]
  selected_variant int,
  platforms text[],         -- ['facebook','instagram','google_business']
  dispatch_status jsonb,    -- {facebook: 'posted', instagram: 'posted', ...}
  created_at timestamptz default now()
);
```

### Storage

A `campaign-photos` bucket in Supabase Storage holds uploaded images. Files are stored as `{campaign_id}/photo.{ext}` and made publicly accessible for Claude Vision.

---

## File Structure

```
app/
  api/
    generate-ad/
      route.ts       -- multipart handler, Claude Vision call, Supabase write
    dispatch/
      route.ts       -- Manus trigger, status update
lib/
  supabase.ts        -- typed Supabase client
  claude.ts          -- Anthropic SDK wrapper, ad generation prompt
  manus.ts           -- Manus API client (thin wrapper)
```

---

## Error Handling

- If Claude returns malformed JSON, retry once with a stricter prompt
- If Manus fails for a platform, mark that platform as `"failed"` in `dispatch_status` — don't block the others
- Photo upload failure → return 400 before calling Claude

---

## Out of Scope

- Frontend wizard UI (teammate)
- Retention / SMS (teammate)
- Community scanner / Reddit (separate feature)
- Google Imagen image generation (future enhancement)
- Scheduling / queuing posts for a future time
