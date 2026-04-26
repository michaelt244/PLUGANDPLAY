# Imagen 3 + Multi-Tenant Schema + QR Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-tenant business accounts with QR-based customer check-ins and AI image generation to the Kinetiq ad wizard.

**Architecture:** A `businesses` table becomes the root tenant; all existing tables gain a `business_id` FK. A new `/checkin/[slug]` page handles QR scan → survey → check-in. A new `/api/generate-image` route calls Imagen 3 via the Google AI REST API and stores results in Supabase Storage. The ad wizard gains an Upload/Generate toggle on step 1.

**Tech Stack:** Next.js 14, Supabase (Postgres + Storage), @google/generative-ai (Gemini API key), Resend SDK, TypeScript, Jest/ts-jest

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/001_add_businesses.sql` | Create |
| `supabase/migrations/002_add_business_id_fks.sql` | Create |
| `supabase/seed.sql` | Create |
| `lib/supabase.ts` | Modify — add `Business`, `QrCode` types |
| `app/api/qr-checkin/route.ts` | Create |
| `app/checkin/[slug]/page.tsx` | Create |
| `components/CheckInForm.tsx` | Create |
| `app/api/generate-image/route.ts` | Create |
| `app/api/generate-ad/route.ts` | Modify — make `photo` optional |
| `components/CreateAdWizard.tsx` | Modify — add Upload/Generate toggle |
| `app/api/stats/route.ts` | Modify — accept `business_id` query param |
| `components/AnalyticsDashboard.tsx` | Modify — add business selector |
| `__tests__/api/qr-checkin.test.ts` | Create |
| `__tests__/api/generate-image.test.ts` | Create |

---

## Task 1: Database migrations — businesses and qr_codes tables

**Files:**
- Create: `supabase/migrations/001_add_businesses.sql`
- Create: `supabase/migrations/002_add_business_id_fks.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create the migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write migration 001 — businesses and qr_codes**

Create `supabase/migrations/001_add_businesses.sql`:

```sql
create table if not exists businesses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  owner_email  text not null,
  created_at   timestamptz default now()
);

create table if not exists qr_codes (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  label        text not null,
  created_at   timestamptz default now()
);
```

- [ ] **Step 3: Write migration 002 — add business_id FKs to existing tables**

Create `supabase/migrations/002_add_business_id_fks.sql`:

```sql
alter table customers
  add column if not exists business_id uuid references businesses(id);

alter table check_ins
  add column if not exists business_id uuid references businesses(id);

alter table campaigns
  add column if not exists business_id uuid references businesses(id);

alter table rewards_milestones
  add column if not exists business_id uuid references businesses(id);

alter table customer_segments
  add column if not exists business_id uuid references businesses(id);

-- Update unique constraint to include business_id
alter table customer_segments
  drop constraint if exists customer_segments_customer_id_segment_key;

alter table customer_segments
  add constraint customer_segments_customer_business_segment_key
  unique (customer_id, business_id, segment);
```

- [ ] **Step 4: Write seed.sql with 3 demo businesses**

Create `supabase/seed.sql`:

```sql
insert into businesses (name, slug, owner_email) values
  ('Wild & The Barre', 'wild-barre', 'contact@wildthebarre.com'),
  ('Blue Bottle Coffee', 'blue-bottle', 'hello@bluebottle.com'),
  ('Casa Azteca', 'casa-azteca', 'info@casaazteca.com')
on conflict (slug) do nothing;

-- Seed one QR code per business
insert into qr_codes (business_id, label)
select id, 'Front Door' from businesses where slug = 'wild-barre'
on conflict do nothing;

insert into qr_codes (business_id, label)
select id, 'Front Door' from businesses where slug = 'blue-bottle'
on conflict do nothing;

insert into qr_codes (business_id, label)
select id, 'Front Door' from businesses where slug = 'casa-azteca'
on conflict do nothing;
```

- [ ] **Step 5: Apply migrations via Supabase MCP**

Run migration 001 using the `mcp__supabase__apply_migration` tool with the SQL from `001_add_businesses.sql`, then run migration 002 with the SQL from `002_add_business_id_fks.sql`, then run the seed SQL.

- [ ] **Step 6: Verify tables exist**

Use `mcp__supabase__list_tables` to confirm `businesses` and `qr_codes` appear in the table list, and that `customers`, `check_ins`, `campaigns`, `rewards_milestones`, `customer_segments` all have a `business_id` column.

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: add businesses, qr_codes tables and business_id FKs"
```

---

## Task 2: Update TypeScript types in lib/supabase.ts

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Add Business and QrCode types**

In `lib/supabase.ts`, add after the existing `RewardEarned` type:

```typescript
export type Business = {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  created_at: string;
};

export type QrCode = {
  id: string;
  business_id: string;
  label: string;
  created_at: string;
};
```

- [ ] **Step 2: Update Customer type to include business_id**

In `lib/supabase.ts`, update the `Customer` type:

```typescript
export type Customer = {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  total_check_ins: number;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 3: Update CheckIn type to include business_id**

```typescript
export type CheckIn = {
  id: string;
  customer_id: string;
  business_id: string;
  checked_in_at: string;
  class_type: string | null;
};
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Business, QrCode types and business_id to Customer, CheckIn"
```

---

## Task 3: QR check-in API route

**Files:**
- Create: `app/api/qr-checkin/route.ts`
- Create: `__tests__/api/qr-checkin.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/qr-checkin.test.ts`:

```typescript
import { POST } from '@/app/api/qr-checkin/route';
import { NextRequest } from 'next/server';

const BUSINESS_ID = 'biz-uuid-123';
const CUSTOMER_ID = 'cust-uuid-456';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'businesses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: BUSINESS_ID },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'customers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: CUSTOMER_ID },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { total_check_ins: 0 },
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));

jest.mock('@/lib/resend', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/qr-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/qr-checkin', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ slug: 'wild-barre' }));
    expect(res.status).toBe(400);
  });

  it('creates a new customer and logs check-in', async () => {
    const res = await POST(makeRequest({
      slug: 'wild-barre',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customer_id).toBe(CUSTOMER_ID);
    expect(body.is_new).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/qr-checkin.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/qr-checkin/route'`

- [ ] **Step 3: Implement the route**

Create `app/api/qr-checkin/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/resend';

export async function POST(req: NextRequest) {
  const { slug, first_name, last_name, email, phone, birthday } = await req.json();

  if (!slug || !first_name || !last_name || !email) {
    return NextResponse.json(
      { error: 'slug, first_name, last_name, and email are required' },
      { status: 400 }
    );
  }

  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const business_id = business.id;

  const { data: existing } = await supabase
    .from('customers')
    .select('id, total_check_ins')
    .eq('email', email)
    .eq('business_id', business_id)
    .single();

  let customer_id: string;
  let is_new = false;

  if (existing) {
    customer_id = existing.id;
  } else {
    const { data: created, error: createErr } = await supabase
      .from('customers')
      .insert({ first_name, last_name, email, phone: phone || null, birthday: birthday || null, business_id })
      .select('id')
      .single();

    if (createErr || !created) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    customer_id = created.id;
    is_new = true;

    await supabase
      .from('customer_segments')
      .insert({ customer_id, business_id, segment: 'new' });

    sendWelcomeEmail(email, first_name).catch(console.error);
  }

  await supabase
    .from('check_ins')
    .insert({ customer_id, business_id, class_type: null });

  const { data: current } = await supabase
    .from('customers')
    .select('total_check_ins')
    .eq('id', customer_id)
    .single();

  const newTotal = (current?.total_check_ins ?? 0) + 1;

  await supabase
    .from('customers')
    .update({ total_check_ins: newTotal, updated_at: new Date().toISOString() })
    .eq('id', customer_id);

  return NextResponse.json({ customer_id, is_new, total_check_ins: newTotal });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/api/qr-checkin.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/qr-checkin/ __tests__/api/qr-checkin.test.ts
git commit -m "feat: add POST /api/qr-checkin unified survey check-in endpoint"
```

---

## Task 4: QR check-in page and form component

**Files:**
- Create: `app/checkin/[slug]/page.tsx`
- Create: `components/CheckInForm.tsx`

- [ ] **Step 1: Create the server page**

Create `app/checkin/[slug]/page.tsx`:

```typescript
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CheckInForm from '@/components/CheckInForm';

export default async function CheckInPage({ params }: { params: { slug: string } }) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single();

  if (!business) notFound();

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Kinetiq</p>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-400 text-sm mt-1">Check in to earn rewards</p>
        </div>
        <CheckInForm slug={business.slug} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create the CheckInForm client component**

Create `components/CheckInForm.tsx`:

```typescript
'use client';

import { useState } from 'react';

type Step = 'form' | 'success';

export default function CheckInForm({ slug }: { slug: string }) {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthday: '',
  });

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Check-in failed');
      }
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">You&apos;re checked in!</h2>
        <p className="text-gray-400 text-sm mt-2">Thanks for visiting. See you next time!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} required />
        <input className={inputClass} name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} required />
      </div>
      <input className={inputClass} name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input className={inputClass} name="phone" type="tel" placeholder="Phone (optional)" value={form.phone} onChange={handleChange} />
      <input className={inputClass} name="birthday" type="date" placeholder="Birthday (optional)" value={form.birthday} onChange={handleChange} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Checking in…' : 'Check In'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Test manually — start dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000/checkin/wild-barre`. Confirm:
- Business name "Wild & The Barre" appears
- Form renders with all fields
- Submitting with valid data returns a success screen
- Navigate to `http://localhost:3000/checkin/nonexistent` — should show Next.js 404

- [ ] **Step 4: Commit**

```bash
git add app/checkin/ components/CheckInForm.tsx
git commit -m "feat: add /checkin/[slug] QR check-in page and survey form"
```

---

## Task 5: Imagen 3 image generation API route

**Files:**
- Create: `app/api/generate-image/route.ts`
- Create: `__tests__/api/generate-image.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/generate-image.test.ts`:

```typescript
import { POST } from '@/app/api/generate-image/route';
import { NextRequest } from 'next/server';

const PUBLIC_URL = 'https://supabase.example.com/storage/v1/object/public/campaign-photos/generated/test.png';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: PUBLIC_URL } }),
      }),
    },
  },
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({
    predictions: [{ bytesBase64Encoded: Buffer.from('fake-image').toString('base64') }],
  }),
} as unknown as Response);

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate-image', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ businessName: 'Test' }));
    expect(res.status).toBe(400);
  });

  it('returns imageUrl on success', async () => {
    const res = await POST(makeRequest({
      businessName: 'Wild & The Barre',
      adGoal: 'Promote yoga classes',
      tone: 'energetic',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toBe(PUBLIC_URL);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/generate-image.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/generate-image/route'`

- [ ] **Step 3: Implement the route**

Create `app/api/generate-image/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { businessName, adGoal, tone } = await req.json();

  if (!businessName || !adGoal) {
    return NextResponse.json(
      { error: 'businessName and adGoal are required' },
      { status: 400 }
    );
  }

  const prompt = `Professional marketing photo for ${businessName}. Goal: ${adGoal}. Tone: ${tone ?? 'professional'}. High quality commercial photography, vibrant, inviting.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('Imagen API error:', err);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
  }

  const data = await response.json();
  const base64 = data.predictions?.[0]?.bytesBase64Encoded;

  if (!base64) {
    return NextResponse.json({ error: 'No image returned from Imagen' }, { status: 500 });
  }

  const buffer = Buffer.from(base64, 'base64');
  const path = `generated/${Date.now()}.png`;

  const { error: uploadErr } = await supabase.storage
    .from('campaign-photos')
    .upload(path, buffer, { contentType: 'image/png', upsert: false });

  if (uploadErr) {
    console.error('Storage upload error:', uploadErr);
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from('campaign-photos')
    .getPublicUrl(path);

  return NextResponse.json({ imageUrl: urlData.publicUrl });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/api/generate-image.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/generate-image/ __tests__/api/generate-image.test.ts
git commit -m "feat: add POST /api/generate-image Imagen 3 generation endpoint"
```

---

## Task 6: Update generate-ad route to accept generated image URL

**Files:**
- Modify: `app/api/generate-ad/route.ts`

- [ ] **Step 1: Update the route to make photo optional**

Replace the contents of `app/api/generate-ad/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase, uploadPhoto } from '@/lib/supabase';
import { generateAdVariants } from '@/lib/claude';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const photo = formData.get('photo') as File | null;
  const generatedImageUrl = formData.get('generated_image_url') as string | null;
  const businessName = formData.get('business_name') as string;
  const adGoal = formData.get('ad_goal') as string;
  const tone = formData.get('tone') as 'energetic' | 'professional' | 'warm';
  const location = (formData.get('location') as string) || undefined;

  if (!photo && !generatedImageUrl) {
    return NextResponse.json(
      { error: 'photo or generated_image_url is required' },
      { status: 400 }
    );
  }

  const { data: campaign, error: insertError } = await supabase
    .from('campaigns')
    .insert({ business_name: businessName, ad_goal: adGoal, tone, location })
    .select('id')
    .single();

  if (insertError || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }

  let photoUrl: string;
  if (photo) {
    try {
      photoUrl = await uploadPhoto(campaign.id, photo);
    } catch {
      return NextResponse.json({ error: 'Photo upload failed' }, { status: 400 });
    }
  } else {
    photoUrl = generatedImageUrl!;
  }

  const variants = await generateAdVariants({ photoUrl, businessName, adGoal, tone, location });

  await supabase
    .from('campaigns')
    .update({ photo_url: photoUrl, variants })
    .eq('id', campaign.id);

  return NextResponse.json({ campaign_id: campaign.id, variants });
}
```

- [ ] **Step 2: Run existing generate-ad tests to confirm no regression**

```bash
npx jest __tests__/api/generate-ad.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-ad/route.ts
git commit -m "feat: make photo optional in generate-ad, accept generated_image_url"
```

---

## Task 7: Update CreateAdWizard with Upload/Generate toggle

**Files:**
- Modify: `components/CreateAdWizard.tsx`

- [ ] **Step 1: Add imageSource state and generatedImageUrl state**

In `CreateAdWizard.tsx`, add these state variables after the `fileInputRef` declaration (around line 58):

```typescript
const [imageSource, setImageSource] = useState<'upload' | 'generate'>('upload');
const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
const [generatingImage, setGeneratingImage] = useState(false);
```

- [ ] **Step 2: Add handleGenerateImage function**

Add this function after `handlePhotoChange` (around line 79):

```typescript
async function handleGenerateImage() {
  if (!businessName || !adGoal) {
    setError('Fill in business name and ad goal before generating an image.');
    return;
  }
  setError('');
  setGeneratingImage(true);
  try {
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, adGoal, tone }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Generation failed');
    const { imageUrl } = await res.json();
    setGeneratedImageUrl(imageUrl);
    setPhotoPreview(imageUrl);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Image generation failed');
  } finally {
    setGeneratingImage(false);
  }
}
```

- [ ] **Step 3: Update handleGenerate validation**

Replace the existing `handleGenerate` function with:

```typescript
async function handleGenerate() {
  const hasImage = imageSource === 'upload' ? !!photo : !!generatedImageUrl;
  if (!hasImage || !businessName || !adGoal) {
    setError(
      imageSource === 'upload'
        ? 'Please fill in all fields and upload a photo.'
        : 'Please fill in all fields and generate an image.'
    );
    return;
  }
  setError(''); setLoading(true);
  try {
    const formData = new FormData();
    if (imageSource === 'upload' && photo) {
      formData.append('photo', photo);
    } else if (generatedImageUrl) {
      formData.append('generated_image_url', generatedImageUrl);
    }
    formData.append('business_name', businessName);
    formData.append('ad_goal', adGoal);
    formData.append('tone', tone);
    if (location) formData.append('location', location);
    const res = await fetch('/api/generate-ad', { method: 'POST', body: formData });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Generation failed');
    const { campaign_id, variants: v } = await res.json();
    setCampaignId(campaign_id); setVariants(v); setStep(2);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Something went wrong');
  } finally { setLoading(false); }
}
```

- [ ] **Step 4: Update reset function**

Add `setImageSource('upload'); setGeneratedImageUrl(null); setGeneratingImage(false);` to the `reset()` function body.

- [ ] **Step 5: Replace step 1 photo section with toggle UI**

In the JSX for `step === 1`, replace the photo upload `<div>` block (the `border-2 border-dashed` section) with:

```tsx
{/* Image source toggle */}
<div className="flex rounded-xl overflow-hidden border border-gray-200">
  <button
    type="button"
    onClick={() => { setImageSource('upload'); setGeneratedImageUrl(null); setPhotoPreview(null); setPhoto(null); }}
    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${imageSource === 'upload' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
  >
    Upload Photo
  </button>
  <button
    type="button"
    onClick={() => { setImageSource('generate'); setPhoto(null); setPhotoPreview(null); }}
    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${imageSource === 'generate' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
  >
    Generate with AI
  </button>
</div>

{imageSource === 'upload' ? (
  <div
    onClick={() => fileInputRef.current?.click()}
    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${photo ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
  >
    {photoPreview ? (
      <img src={photoPreview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-cover" />
    ) : (
      <>
        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-gray-400">Click to upload photo</p>
      </>
    )}
    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
  </div>
) : (
  <div className="space-y-3">
    {photoPreview ? (
      <div className="relative">
        <img src={photoPreview} alt="Generated" className="w-full max-h-48 object-cover rounded-xl" />
        <button
          type="button"
          onClick={() => { setGeneratedImageUrl(null); setPhotoPreview(null); }}
          className="absolute top-2 right-2 bg-white text-gray-600 rounded-full w-6 h-6 text-xs font-bold shadow hover:bg-gray-100"
        >
          ×
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={handleGenerateImage}
        disabled={generatingImage || !businessName || !adGoal}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {generatingImage ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-5 h-5" />
            <span className="text-sm text-gray-400">Generating with Imagen 3…</span>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-sm text-gray-400">Click to generate an image with AI</p>
            <p className="text-xs text-gray-300 mt-1">Fill in business name and goal first</p>
          </>
        )}
      </button>
    )}
  </div>
)}
```

- [ ] **Step 6: Verify in browser**

With dev server running, go to the Create Ad tab on the landing page. Confirm:
- Toggle between "Upload Photo" and "Generate with AI" tabs works
- Upload tab shows the existing file picker
- Generate tab shows the AI generate button
- Clicking generate (with business name + goal filled) calls the API and shows the result image

- [ ] **Step 7: Commit**

```bash
git add components/CreateAdWizard.tsx
git commit -m "feat: add Upload/Generate toggle to ad wizard step 1"
```

---

## Task 8: Update stats API and dashboard business selector

**Files:**
- Modify: `app/api/stats/route.ts`
- Modify: `components/AnalyticsDashboard.tsx`

- [ ] **Step 1: Update stats route to accept business_id and return businesses list**

Replace `app/api/stats/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const business_id = request.nextUrl.searchParams.get('business_id');

  const campaignsQuery = supabase
    .from('campaigns')
    .select('id, dispatch_status', { count: 'exact' });

  const customersQuery = supabase
    .from('customers')
    .select('id', { count: 'exact', head: true });

  const recentQuery = supabase
    .from('campaigns')
    .select('business_name, ad_goal, tone, location, dispatch_status, created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  if (business_id) {
    campaignsQuery.eq('business_id', business_id);
    customersQuery.eq('business_id', business_id);
    recentQuery.eq('business_id', business_id);
  }

  const [campaignsRes, customersRes, recentRes, businessesRes] = await Promise.all([
    campaignsQuery,
    customersQuery,
    recentQuery,
    supabase.from('businesses').select('id, name, slug').order('name'),
  ]);

  const allCampaigns = campaignsRes.data ?? [];
  const dispatched = allCampaigns.filter((c) => c.dispatch_status !== null).length;
  const posted = allCampaigns.filter((c) => {
    const s = c.dispatch_status as Record<string, string> | null;
    return s && Object.values(s).some((v) => v === 'posted');
  }).length;

  return NextResponse.json({
    totalCampaigns: campaignsRes.count ?? 0,
    totalCustomers: customersRes.count ?? 0,
    dispatched,
    posted,
    recent: recentRes.data ?? [],
    businesses: businessesRes.data ?? [],
  });
}
```

- [ ] **Step 2: Update AnalyticsDashboard to add business selector**

Replace the `Stats` type and the component in `components/AnalyticsDashboard.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

type CampaignRow = {
  business_name: string;
  ad_goal: string | null;
  tone: string | null;
  location: string | null;
  dispatch_status: Record<string, string> | null;
  created_at: string;
};

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
};

type Stats = {
  totalCampaigns: number;
  totalCustomers: number;
  dispatched: number;
  posted: number;
  recent: CampaignRow[];
  businesses: BusinessOption[];
};

function statusBadge(dispatch_status: Record<string, string> | null) {
  if (!dispatch_status) return <span className="text-[10px] font-bold text-gray-400">Draft</span>;
  const statuses = Object.values(dispatch_status);
  const anyPosted = statuses.some((s) => s === 'posted');
  const allFailed = statuses.every((s) => s === 'failed');
  if (anyPosted) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">Posted</span>;
  if (allFailed) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Failed</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100">Partial</span>;
}

function platformIcons(dispatch_status: Record<string, string> | null) {
  if (!dispatch_status) return null;
  const labels: Record<string, string> = { facebook: 'FB', instagram: 'IG', google_business: 'GBP' };
  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(dispatch_status).map(([p, s]) => (
        <span
          key={p}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s === 'posted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
        >
          {labels[p] ?? p}
        </span>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');

  function fetchStats(businessId: string) {
    setLoading(true);
    const url = businessId ? `/api/stats?business_id=${businessId}` : '/api/stats';
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchStats('');
  }, []);

  function handleBusinessChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedBusinessId(id);
    fetchStats(id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-8 h-8" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center text-gray-400 py-12">Could not load analytics.</p>;
  }

  const metricCards = [
    { label: 'Customers', value: stats.totalCustomers },
    { label: 'Campaigns Created', value: stats.totalCampaigns },
    { label: 'Campaigns Dispatched', value: stats.dispatched },
    { label: 'Successfully Posted', value: stats.posted },
  ];

  const selectedBusiness = stats.businesses.find((b) => b.id === selectedBusinessId);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">/ Live Dashboard</p>
        <h2 className="text-3xl font-bold text-gray-900">Real-Time Activity</h2>
        <p className="text-gray-400 text-sm mt-1">Live data from your Kinetiq account</p>
      </div>

      {/* Business selector */}
      {stats.businesses.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Viewing:</label>
          <select
            value={selectedBusinessId}
            onChange={handleBusinessChange}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Businesses</option>
            {stats.businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {selectedBusiness && (
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg whitespace-nowrap">
              /checkin/{selectedBusiness.slug}
            </span>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-medium">{m.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Recent campaigns */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Recent Campaigns</h3>
        </div>
        {stats.recent.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No campaigns yet — create your first ad.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recent.map((c, i) => (
              <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{c.business_name}</p>
                    {c.location && (
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        {c.location}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-1.5">{c.ad_goal ?? '—'}</p>
                  {platformIcons(c.dispatch_status)}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {statusBadge(c.dispatch_status)}
                  <span className="text-[10px] text-gray-300">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispatch breakdown */}
      {stats.totalCampaigns > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Campaign Funnel</h3>
          <div className="space-y-3">
            {[
              { label: 'Created', value: stats.totalCampaigns, max: stats.totalCampaigns },
              { label: 'Dispatched', value: stats.dispatched, max: stats.totalCampaigns },
              { label: 'Posted', value: stats.posted, max: stats.totalCampaigns },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">{row.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-gray-900 to-blue-600 rounded-full h-6 flex items-center transition-all"
                    style={{ width: row.max > 0 ? `${Math.round((row.value / row.max) * 100)}%` : '0%' }}
                  >
                    {row.value > 0 && (
                      <span className="text-[10px] text-white font-bold px-2">{row.value}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-500 w-6 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

With dev server running, go to the Analytics tab. Confirm:
- "Viewing: All Businesses" dropdown appears
- Selecting a seeded business filters the stats
- The check-in URL `/checkin/[slug]` shows next to the selected business name

- [ ] **Step 4: Commit**

```bash
git add app/api/stats/route.ts components/AnalyticsDashboard.tsx
git commit -m "feat: filter stats by business_id and add business selector to dashboard"
```

---

## Task 9: Full test suite regression check

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All existing tests pass plus the 2 new test files.

- [ ] **Step 2: Fix any failures**

If any test fails, investigate and fix before proceeding.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test regressions after multi-tenant + Imagen changes"
```
