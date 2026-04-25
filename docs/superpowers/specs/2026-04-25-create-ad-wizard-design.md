# Create Ad Wizard Design

## Goal

Add a "Create Ad" tab to the existing Kinetiq landing page that walks a business owner through a 5-step interactive wizard — uploading a photo, generating 3 AI ad variants via Gemini, dispatching to social platforms via Manus, and optionally boosting to community groups.

## Context

The existing `app/page.tsx` is a polished single-page app with a 5-tab nav (Get Started, Marketing, Platform, Messages, Analytics). It uses Tailwind CSS, dark gray/blue design language, `rounded-2xl` cards with `border-gray-100 shadow-sm`, and a `tab` state variable to switch between views.

All backend API routes are complete and tested:
- `POST /api/generate-ad` — multipart, returns `{ campaign_id, variants: AdVariant[] }`
- `POST /api/dispatch` — JSON, returns `{ results: { platform: "posted"|"failed" } }`
- `POST /api/discover-groups` — JSON, returns `{ campaign_id, groups: GroupTarget[] }`
- `POST /api/post-to-groups` — JSON, returns `{ results: { groupName: "posted"|"failed" } }`

## New Files

| File | Action | Responsibility |
|------|--------|---------------|
| `components/CreateAdWizard.tsx` | Create | Full 5-step wizard as a `'use client'` component |
| `app/page.tsx` | Modify | Add `'create-ad'` tab to nav + render `<CreateAdWizard />` |

## Wizard Steps

### Step 1 — Upload + Context
- File input for photo (drag or click)
- Text fields: Business Name, Ad Goal, Tone (dropdown: energetic / professional / warm)
- "Generate Ads" button → calls `POST /api/generate-ad` as multipart FormData
- Loading state: spinner + "Generating your ads with AI..."

### Step 2 — Pick a Variant
- Show 3 cards (A, B, C) with platform label + copy text
- Selected card gets blue border highlight
- "Continue" button enabled once one is selected

### Step 3 — Select Platforms
- Three toggle buttons: Facebook, Instagram, Google Business
- At least one must be selected to continue
- "Dispatch Ads" button → calls `POST /api/dispatch`
- Loading state: "Manus is posting your ads..."

### Step 4 — Dispatch Results
- Per-platform badge: green "Posted" or red "Failed"
- Campaign ID shown (for reference)
- "Boost with Community Groups" CTA button → advances to Step 5
- "Done" button → resets wizard to Step 1

### Step 5 — Community Groups
- Auto-calls `POST /api/discover-groups` on mount with the campaign_id
- Loading state: "Finding your audience..."
- Shows list of 8–10 groups with platform badge + reason text
- Checkbox per group (all checked by default)
- "Post to Selected Groups" button → calls `POST /api/post-to-groups`
- Results: per-group "Posted" / "Failed" badge
- "Start Over" button → resets to Step 1

## State Shape

```typescript
type Step = 1 | 2 | 3 | 4 | 5;

type AdVariant = {
  label: 'A' | 'B' | 'C';
  copy: string;
  platform: 'instagram' | 'facebook' | 'google_business';
};

type GroupTarget = {
  group: string;
  platform: 'facebook' | 'reddit' | 'nextdoor';
  reason: string;
};

// wizard state
step: Step
loading: boolean
error: string

// step 1 inputs
photo: File | null
businessName: string
adGoal: string
tone: 'energetic' | 'professional' | 'warm'

// step 2+
campaignId: string
variants: AdVariant[]
selectedVariant: number | null

// step 3+
platforms: ('facebook' | 'instagram' | 'google_business')[]
dispatchResults: Record<string, string>

// step 5
groups: GroupTarget[]
approvedGroups: GroupTarget[]
groupResults: Record<string, string>
```

## API Call Details

**Step 1 → 2:**
```typescript
const formData = new FormData();
formData.append('photo', photo);
formData.append('business_name', businessName);
formData.append('ad_goal', adGoal);
formData.append('tone', tone);
const res = await fetch('/api/generate-ad', { method: 'POST', body: formData });
const { campaign_id, variants } = await res.json();
```

**Step 3 → 4:**
```typescript
const res = await fetch('/api/dispatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaign_id: campaignId, selected_variant: selectedVariant, platforms }),
});
const { results } = await res.json();
```

**Step 5 mount:**
```typescript
const res = await fetch('/api/discover-groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaign_id: campaignId }),
});
const { groups } = await res.json();
```

**Step 5 post:**
```typescript
const res = await fetch('/api/post-to-groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaign_id: campaignId, approved_groups: approvedGroups }),
});
const { results } = await res.json();
```

## Design Language

Match the existing page exactly:
- Cards: `bg-white rounded-2xl border border-gray-100 shadow-sm p-6`
- Primary button: `bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800`
- Blue accent button: `bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700`
- Input: `w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500`
- Step indicator: progress bar like `SignupForm.tsx` (blue filled segments)
- Error: `bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm`
- Loading: centered spinner (animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-8 h-8)

## page.tsx Changes

1. Add `'create-ad'` to the `tabs` array:
```typescript
{ key: 'create-ad' as const, label: 'Create Ad' }
```

2. Add to the tab union type:
```typescript
type Tab = 'signup' | 'marketing' | 'platform' | 'messages' | 'analytics' | 'create-ad';
```

3. Add render block after the analytics block:
```typescript
{tab === 'create-ad' && (
  <div className="max-w-lg mx-auto">
    <CreateAdWizard />
  </div>
)}
```

4. Import at top:
```typescript
import CreateAdWizard from '@/components/CreateAdWizard';
```

## Error Handling

- API errors display in the red error banner, wizard stays on current step
- Network failures caught in try/catch, shown in same error banner
- Errors clear when user modifies inputs or advances step
