# LocalBoost Ad Generation + Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two Next.js API routes — `POST /api/generate-ad` (Claude Vision → 3 ad copy variants) and `POST /api/dispatch` (Manus → real posts to Facebook, Instagram, Google Business) — backed by Supabase.

**Architecture:** Multipart photo upload → Supabase Storage → Claude Vision multimodal call → save campaign to Supabase. Dispatch reads the saved campaign, calls Manus per platform in parallel, persists results. All business logic lives in `lib/` files; API routes are thin handlers.

**Tech Stack:** Next.js 14 App Router, TypeScript, Anthropic SDK (`claude-sonnet-4-6`), Supabase JS v2, Jest

---

## File Map

| File | Purpose |
|---|---|
| `lib/supabase.ts` | Typed Supabase client (server + browser) |
| `lib/claude.ts` | Claude Vision call + ad prompt, returns `AdVariant[]` |
| `lib/manus.ts` | Thin Manus API client, one function per platform |
| `app/api/generate-ad/route.ts` | Multipart handler → calls lib/claude → saves campaign |
| `app/api/dispatch/route.ts` | JSON handler → calls lib/manus → updates campaign |
| `__tests__/lib/claude.test.ts` | Unit tests for ad generation logic |
| `__tests__/lib/manus.test.ts` | Unit tests for Manus client |
| `__tests__/api/generate-ad.test.ts` | Integration test for generate-ad route |
| `__tests__/api/dispatch.test.ts` | Integration test for dispatch route |

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Initialize Next.js in the existing directory**

```bash
cd /Users/michaeltiburcio/PLUGANDPLAY
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*" --yes
```

Expected: Next.js files created, `node_modules/` installed.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js
npm install --save-dev jest @types/jest ts-jest jest-environment-node
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathPattern: '__tests__',
};

export default config;
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json` and add to `"scripts"`:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Next.js starts**

```bash
npm run dev
```

Expected: `▲ Next.js 14.x.x` running on `http://localhost:3000`. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with deps"
```

---

## Task 2: Supabase schema + storage bucket

**Files:**
- No code files — Supabase MCP calls only

- [ ] **Step 1: Create the campaigns table**

Run via Supabase MCP (`mcp__supabase__apply_migration`):

```sql
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  ad_goal text,
  tone text,
  photo_url text,
  variants jsonb,
  selected_variant int,
  platforms text[],
  dispatch_status jsonb,
  created_at timestamptz default now()
);
```

- [ ] **Step 2: Create campaign-photos storage bucket**

Run via Supabase MCP (`mcp__supabase__execute_sql`):

```sql
insert into storage.buckets (id, name, public)
values ('campaign-photos', 'campaign-photos', true)
on conflict (id) do nothing;
```

- [ ] **Step 3: Add storage policy so anyone can read (public bucket)**

```sql
create policy "Public read campaign photos"
on storage.objects for select
using ( bucket_id = 'campaign-photos' );

create policy "Service role can upload campaign photos"
on storage.objects for insert
with check ( bucket_id = 'campaign-photos' );
```

- [ ] **Step 4: Verify table exists**

Run via Supabase MCP (`mcp__supabase__execute_sql`):

```sql
select column_name, data_type from information_schema.columns
where table_name = 'campaigns'
order by ordinal_position;
```

Expected: 10 rows with `id`, `business_name`, `ad_goal`, `tone`, `photo_url`, `variants`, `selected_variant`, `platforms`, `dispatch_status`, `created_at`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add campaigns table and storage bucket via Supabase MCP"
```

---

## Task 3: Build lib/supabase.ts

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Write the Supabase client**

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export type AdVariant = {
  label: 'A' | 'B' | 'C';
  copy: string;
  platform: 'instagram' | 'facebook' | 'google_business';
};

export type Campaign = {
  id: string;
  business_name: string;
  ad_goal: string | null;
  tone: string | null;
  photo_url: string | null;
  variants: AdVariant[] | null;
  selected_variant: number | null;
  platforms: string[] | null;
  dispatch_status: Record<string, string> | null;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client using service role key — never expose to browser
export const supabase = createClient<{ public: { Tables: { campaigns: { Row: Campaign } } } }>(
  supabaseUrl,
  supabaseServiceKey
);

export async function uploadPhoto(
  campaignId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${campaignId}/photo.${ext}`;

  const { error } = await supabase.storage
    .from('campaign-photos')
    .upload(path, file, { upsert: true });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from('campaign-photos')
    .getPublicUrl(path);

  return data.publicUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add typed Supabase client and uploadPhoto helper"
```

---

## Task 4: Build lib/claude.ts

**Files:**
- Create: `lib/claude.ts`
- Create: `__tests__/lib/claude.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/claude.test.ts`:

```typescript
import { generateAdVariants } from '@/lib/claude';

jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify([
                { label: 'A', copy: 'Level up! 💪 Join Wild & The Barre — first class free.', platform: 'instagram' },
                { label: 'B', copy: 'Hey Redwood City! Summer special at Wild & The Barre.', platform: 'facebook' },
                { label: 'C', copy: 'Summer Barre Special: 20% off first month. Book now.', platform: 'google_business' },
              ]),
            },
          ],
        }),
      },
    })),
  };
});

describe('generateAdVariants', () => {
  it('returns 3 variants with label, copy, platform', async () => {
    const variants = await generateAdVariants({
      photoUrl: 'https://example.com/photo.jpg',
      businessName: 'Wild & The Barre',
      adGoal: 'summer class promo',
      tone: 'energetic',
    });

    expect(variants).toHaveLength(3);
    expect(variants[0]).toEqual({
      label: 'A',
      copy: expect.any(String),
      platform: 'instagram',
    });
    expect(variants[1].platform).toBe('facebook');
    expect(variants[2].platform).toBe('google_business');
  });

  it('throws if Claude returns malformed JSON, retries once', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const mockCreate = jest.fn()
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] })
      .mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { label: 'A', copy: 'Fixed copy', platform: 'instagram' },
              { label: 'B', copy: 'Fixed copy B', platform: 'facebook' },
              { label: 'C', copy: 'Fixed copy C', platform: 'google_business' },
            ]),
          },
        ],
      });
    (Anthropic as jest.Mock).mockImplementationOnce(() => ({
      messages: { create: mockCreate },
    }));

    const variants = await generateAdVariants({
      photoUrl: 'https://example.com/photo.jpg',
      businessName: 'Test Biz',
      adGoal: 'promo',
      tone: 'professional',
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(variants).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/claude.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/claude'`

- [ ] **Step 3: Implement lib/claude.ts**

Create `lib/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AdVariant } from './supabase';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert social media copywriter for small local businesses.
Given a photo and business context, write exactly 3 ad copy variants as a JSON array.
Return ONLY valid JSON — no markdown, no explanation.

Format:
[
  {"label": "A", "copy": "<instagram copy, casual, emoji ok, ≤140 chars>", "platform": "instagram"},
  {"label": "B", "copy": "<facebook copy, community tone, ≤200 chars>", "platform": "facebook"},
  {"label": "C", "copy": "<google business copy, offer-led, ≤120 chars>", "platform": "google_business"}
]`;

function buildUserPrompt(params: {
  businessName: string;
  adGoal: string;
  tone: string;
  strict?: boolean;
}): string {
  const strictNote = params.strict
    ? ' IMPORTANT: Return ONLY a JSON array, nothing else.'
    : '';
  return `Business: ${params.businessName}
Goal: ${params.adGoal}
Tone: ${params.tone}
Write 3 ad variants for this photo.${strictNote}`;
}

async function callClaude(
  photoUrl: string,
  params: { businessName: string; adGoal: string; tone: string },
  strict = false
): Promise<AdVariant[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: photoUrl },
          },
          {
            type: 'text',
            text: buildUserPrompt({ ...params, strict }),
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text block');
  }

  return JSON.parse(textBlock.text) as AdVariant[];
}

export async function generateAdVariants(params: {
  photoUrl: string;
  businessName: string;
  adGoal: string;
  tone: 'energetic' | 'professional' | 'warm';
}): Promise<AdVariant[]> {
  const { photoUrl, ...context } = params;

  try {
    return await callClaude(photoUrl, context);
  } catch {
    // Retry once with stricter prompt on parse failure
    return await callClaude(photoUrl, context, true);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/claude.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add lib/claude.ts __tests__/lib/claude.test.ts
git commit -m "feat: add Claude Vision ad generation with retry on malformed JSON"
```

---

## Task 5: Build lib/manus.ts

**Files:**
- Create: `lib/manus.ts`
- Create: `__tests__/lib/manus.test.ts`

> **Note:** Manus API details need to be confirmed. This task builds the interface and a stub. Fill in the `postToManus` implementation once you have the Manus API endpoint/token.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/manus.test.ts`:

```typescript
import { dispatchToManus } from '@/lib/manus';

global.fetch = jest.fn();

describe('dispatchToManus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.MANUS_API_KEY = 'test-key';
    process.env.MANUS_API_URL = 'https://api.manus.im';
  });

  it('posts to facebook and returns posted status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'posted' }),
    });

    const result = await dispatchToManus({
      platform: 'facebook',
      copy: 'Hey Redwood City! Summer special.',
      photoUrl: 'https://example.com/photo.jpg',
    });

    expect(result).toBe('posted');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.manus.im/post',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    );
  });

  it('returns failed if Manus API returns non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'unauthorized' }),
    });

    const result = await dispatchToManus({
      platform: 'instagram',
      copy: 'Level up! 💪',
      photoUrl: 'https://example.com/photo.jpg',
    });

    expect(result).toBe('failed');
  });

  it('returns failed if fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    const result = await dispatchToManus({
      platform: 'google_business',
      copy: '20% off first month.',
      photoUrl: 'https://example.com/photo.jpg',
    });

    expect(result).toBe('failed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/manus.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/manus'`

- [ ] **Step 3: Implement lib/manus.ts**

Create `lib/manus.ts`:

```typescript
export type Platform = 'facebook' | 'instagram' | 'google_business';
export type DispatchStatus = 'posted' | 'failed' | 'pending';

export async function dispatchToManus(params: {
  platform: Platform;
  copy: string;
  photoUrl: string;
}): Promise<DispatchStatus> {
  const apiUrl = process.env.MANUS_API_URL;
  const apiKey = process.env.MANUS_API_KEY;

  // TODO: Replace with actual Manus endpoint once confirmed
  // Manus expects: { platform, copy, photo_url } — verify field names with Manus docs
  try {
    const response = await fetch(`${apiUrl}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        platform: params.platform,
        copy: params.copy,
        photo_url: params.photoUrl,
      }),
    });

    if (!response.ok) return 'failed';
    return 'posted';
  } catch {
    return 'failed';
  }
}
```

- [ ] **Step 4: Add MANUS_API_KEY and MANUS_API_URL to .env.example**

Open `.env.example` and add:

```
# Manus (ad dispatch automation)
MANUS_API_KEY=
MANUS_API_URL=https://api.manus.im
```

Also add them to your `.env` file with real values once you confirm the Manus API.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/manus.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add lib/manus.ts __tests__/lib/manus.test.ts .env.example
git commit -m "feat: add Manus dispatch client with per-platform error isolation"
```

---

## Task 6: Build POST /api/generate-ad

**Files:**
- Create: `app/api/generate-ad/route.ts`
- Create: `__tests__/api/generate-ad.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/generate-ad.test.ts`:

```typescript
import { POST } from '@/app/api/generate-ad/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-campaign-id' },
            error: null,
          }),
        }),
      }),
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/photo.jpg' },
        }),
      }),
    },
  },
  uploadPhoto: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));

jest.mock('@/lib/claude', () => ({
  generateAdVariants: jest.fn().mockResolvedValue([
    { label: 'A', copy: 'Level up! 💪', platform: 'instagram' },
    { label: 'B', copy: 'Hey community!', platform: 'facebook' },
    { label: 'C', copy: '20% off now.', platform: 'google_business' },
  ]),
}));

describe('POST /api/generate-ad', () => {
  it('returns campaign_id and 3 variants', async () => {
    const formData = new FormData();
    formData.append('photo', new File(['image data'], 'photo.jpg', { type: 'image/jpeg' }));
    formData.append('business_name', 'Wild & The Barre');
    formData.append('ad_goal', 'summer promo');
    formData.append('tone', 'energetic');

    const request = new NextRequest('http://localhost/api/generate-ad', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaign_id).toBe('test-campaign-id');
    expect(body.variants).toHaveLength(3);
  });

  it('returns 400 if photo is missing', async () => {
    const formData = new FormData();
    formData.append('business_name', 'Wild & The Barre');
    formData.append('ad_goal', 'promo');
    formData.append('tone', 'energetic');

    const request = new NextRequest('http://localhost/api/generate-ad', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/generate-ad.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/generate-ad/route'`

- [ ] **Step 3: Implement the route**

Create `app/api/generate-ad/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase, uploadPhoto } from '@/lib/supabase';
import { generateAdVariants } from '@/lib/claude';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const photo = formData.get('photo') as File | null;
  const businessName = formData.get('business_name') as string;
  const adGoal = formData.get('ad_goal') as string;
  const tone = formData.get('tone') as 'energetic' | 'professional' | 'warm';

  if (!photo) {
    return NextResponse.json({ error: 'photo is required' }, { status: 400 });
  }

  // Create a placeholder campaign row to get the ID for storage path
  const { data: campaign, error: insertError } = await supabase
    .from('campaigns')
    .insert({ business_name: businessName, ad_goal: adGoal, tone })
    .select('id')
    .single();

  if (insertError || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }

  // Upload photo, using the campaign ID as the path prefix
  let photoUrl: string;
  try {
    photoUrl = await uploadPhoto(campaign.id, photo);
  } catch (err) {
    return NextResponse.json({ error: 'Photo upload failed' }, { status: 400 });
  }

  // Call Claude Vision
  const variants = await generateAdVariants({ photoUrl, businessName, adGoal, tone });

  // Persist photo URL + variants
  await supabase
    .from('campaigns')
    .update({ photo_url: photoUrl, variants })
    .eq('id', campaign.id);

  return NextResponse.json({ campaign_id: campaign.id, variants });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/api/generate-ad.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/generate-ad/route.ts __tests__/api/generate-ad.test.ts
git commit -m "feat: add POST /api/generate-ad — Claude Vision → 3 ad variants"
```

---

## Task 7: Build POST /api/dispatch

**Files:**
- Create: `app/api/dispatch/route.ts`
- Create: `__tests__/api/dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/dispatch.test.ts`:

```typescript
import { POST } from '@/app/api/dispatch/route';
import { NextRequest } from 'next/server';

const mockCampaign = {
  id: 'test-campaign-id',
  photo_url: 'https://example.com/photo.jpg',
  variants: [
    { label: 'A', copy: 'Level up! 💪', platform: 'instagram' },
    { label: 'B', copy: 'Hey community!', platform: 'facebook' },
    { label: 'C', copy: '20% off now.', platform: 'google_business' },
  ],
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockCampaign, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

jest.mock('@/lib/manus', () => ({
  dispatchToManus: jest.fn().mockResolvedValue('posted'),
}));

describe('POST /api/dispatch', () => {
  it('dispatches to selected platforms and returns results', async () => {
    const request = new NextRequest('http://localhost/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: 'test-campaign-id',
        selected_variant: 1,
        platforms: ['facebook', 'instagram'],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results.facebook).toBe('posted');
    expect(body.results.instagram).toBe('posted');
    expect(body.results.google_business).toBeUndefined();
  });

  it('continues dispatching other platforms if one fails', async () => {
    const { dispatchToManus } = await import('@/lib/manus');
    (dispatchToManus as jest.Mock)
      .mockResolvedValueOnce('failed')   // facebook fails
      .mockResolvedValueOnce('posted');  // instagram succeeds

    const request = new NextRequest('http://localhost/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: 'test-campaign-id',
        selected_variant: 0,
        platforms: ['facebook', 'instagram'],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.results.facebook).toBe('failed');
    expect(body.results.instagram).toBe('posted');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/dispatch.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/dispatch/route'`

- [ ] **Step 3: Implement the route**

Create `app/api/dispatch/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { dispatchToManus, type Platform, type DispatchStatus } from '@/lib/manus';

export async function POST(request: NextRequest) {
  const { campaign_id, selected_variant, platforms } = await request.json() as {
    campaign_id: string;
    selected_variant: number;
    platforms: Platform[];
  };

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('photo_url, variants')
    .eq('id', campaign_id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const variant = campaign.variants[selected_variant];

  // Dispatch to all platforms in parallel — failures are isolated per platform
  const results = await Promise.all(
    platforms.map(async (platform) => {
      const status = await dispatchToManus({
        platform,
        copy: variant.copy,
        photoUrl: campaign.photo_url,
      });
      return [platform, status] as [Platform, DispatchStatus];
    })
  );

  const dispatchStatus = Object.fromEntries(results);

  await supabase
    .from('campaigns')
    .update({
      selected_variant,
      platforms,
      dispatch_status: dispatchStatus,
    })
    .eq('id', campaign_id);

  return NextResponse.json({ results: dispatchStatus });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/api/dispatch.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All 9 tests passing across 4 test files.

- [ ] **Step 6: Commit**

```bash
git add app/api/dispatch/route.ts __tests__/api/dispatch.test.ts
git commit -m "feat: add POST /api/dispatch — parallel Manus posting with per-platform error isolation"
```

---

## Task 8: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test generate-ad with curl**

```bash
curl -X POST http://localhost:3000/api/generate-ad \
  -F "photo=@/path/to/any/test-image.jpg" \
  -F "business_name=Wild & The Barre" \
  -F "ad_goal=summer class promo" \
  -F "tone=energetic"
```

Expected: `{"campaign_id":"<uuid>","variants":[{"label":"A",...},{"label":"B",...},{"label":"C",...}]}`

- [ ] **Step 3: Test dispatch with the returned campaign_id**

```bash
curl -X POST http://localhost:3000/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "<uuid from step 2>",
    "selected_variant": 0,
    "platforms": ["facebook", "instagram", "google_business"]
  }'
```

Expected: `{"results":{"facebook":"posted","instagram":"posted","google_business":"posted"}}` (once Manus API key is set)

- [ ] **Step 4: Verify campaign row in Supabase**

Run via Supabase MCP:

```sql
select id, business_name, variants, dispatch_status from campaigns order by created_at desc limit 1;
```

Expected: Row with all fields populated including `dispatch_status`.

- [ ] **Step 5: Push to GitHub**

```bash
git push -u origin main
```
