# Create Ad Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Create Ad" tab to the existing Kinetiq landing page with a 5-step wizard that calls the real `/api/generate-ad`, `/api/dispatch`, `/api/discover-groups`, and `/api/post-to-groups` routes.

**Architecture:** A new `components/CreateAdWizard.tsx` client component manages all wizard state. `app/page.tsx` gets a 6th tab wired to render the wizard. No new API routes. No unit tests — verified visually with `npm run dev`.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS

---

## File Map

| File | Action |
|------|--------|
| `components/CreateAdWizard.tsx` | Create — full 5-step wizard |
| `app/page.tsx` | Modify — add `'create-ad'` tab + import + render block |

## Design Tokens (match existing page exactly)

- Card: `bg-white rounded-2xl border border-gray-100 shadow-sm p-6`
- Primary button: `bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800`
- Blue button: `bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700`
- Ghost button: `border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50`
- Input: `w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- Error: `bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm`
- Spinner: `animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-8 h-8`

---

## Task 1: CreateAdWizard component

**Files:**
- Create: `components/CreateAdWizard.tsx`

- [ ] **Step 1: Create `components/CreateAdWizard.tsx`**

```tsx
'use client';

import { useState, useRef } from 'react';

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

type Platform = 'facebook' | 'instagram' | 'google_business';

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google_business: 'Google Business',
};

const GROUP_PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  reddit: 'Reddit',
  nextdoor: 'Nextdoor',
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-8 h-8" />
    </div>
  );
}

export default function CreateAdWizard() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [adGoal, setAdGoal] = useState('');
  const [tone, setTone] = useState<'energetic' | 'professional' | 'warm'>('energetic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [campaignId, setCampaignId] = useState('');
  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  const [platforms, setPlatforms] = useState<Platform[]>(['instagram']);
  const [dispatchResults, setDispatchResults] = useState<Record<string, string>>({});

  const [groups, setGroups] = useState<GroupTarget[]>([]);
  const [approvedGroups, setApprovedGroups] = useState<GroupTarget[]>([]);
  const [groupResults, setGroupResults] = useState<Record<string, string>>({});

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function togglePlatform(p: Platform) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function toggleGroup(g: GroupTarget) {
    setApprovedGroups(prev =>
      prev.some(x => x.group === g.group)
        ? prev.filter(x => x.group !== g.group)
        : [...prev, g]
    );
  }

  function reset() {
    setStep(1);
    setLoading(false);
    setError('');
    setPhoto(null);
    setPhotoPreview(null);
    setBusinessName('');
    setAdGoal('');
    setTone('energetic');
    setCampaignId('');
    setVariants([]);
    setSelectedVariant(null);
    setPlatforms(['instagram']);
    setDispatchResults({});
    setGroups([]);
    setApprovedGroups([]);
    setGroupResults({});
  }

  async function handleGenerate() {
    if (!photo || !businessName || !adGoal) {
      setError('Please fill in all fields and upload a photo.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('business_name', businessName);
      formData.append('ad_goal', adGoal);
      formData.append('tone', tone);
      const res = await fetch('/api/generate-ad', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Generation failed');
      const { campaign_id, variants: v } = await res.json();
      setCampaignId(campaign_id);
      setVariants(v);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDispatch() {
    if (platforms.length === 0) {
      setError('Select at least one platform.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          selected_variant: selectedVariant,
          platforms,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Dispatch failed');
      const { results } = await res.json();
      setDispatchResults(results);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscoverGroups() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/discover-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Discovery failed');
      const { groups: g } = await res.json();
      setGroups(g);
      setApprovedGroups(g);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handlePostToGroups() {
    if (approvedGroups.length === 0) {
      setError('Select at least one group.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/post-to-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, approved_groups: approvedGroups }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Posting failed');
      const { results } = await res.json();
      setGroupResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ['Upload', 'Variants', 'Platforms', 'Results', 'Groups'];

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-6">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div className={`h-1.5 rounded-full mb-1 ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-100'}`} />
            <span className={`text-[10px] font-semibold ${i + 1 === step ? 'text-blue-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        {/* Step 1: Upload + Context */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Create Your Ad</h2>
            <p className="text-sm text-gray-400">Upload a photo and tell us about your business.</p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                photo ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
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

            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Business Name</label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Wild & The Barre" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Ad Goal</label>
              <input type="text" value={adGoal} onChange={e => setAdGoal(e.target.value)} placeholder="Summer class promo — first class free" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value as typeof tone)} className={inputClass}>
                <option value="energetic">Energetic</option>
                <option value="professional">Professional</option>
                <option value="warm">Warm</option>
              </select>
            </div>

            {loading ? <Spinner /> : (
              <button onClick={handleGenerate} className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors">
                Generate Ads with AI
              </button>
            )}
          </div>
        )}

        {/* Step 2: Pick Variant */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Pick Your Ad</h2>
            <p className="text-sm text-gray-400">Gemini wrote 3 variants — choose the one you want to post.</p>

            {variants.map((v, i) => (
              <div
                key={v.label}
                onClick={() => setSelectedVariant(i)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                  selectedVariant === i ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold bg-gray-900 text-white px-2 py-0.5 rounded-full">
                    Variant {v.label}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {v.platform.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{v.copy}</p>
              </div>
            ))}

            <button
              onClick={() => setStep(3)}
              disabled={selectedVariant === null}
              className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Select Platforms */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Choose Platforms</h2>
            <p className="text-sm text-gray-400">Manus will post your ad to the selected platforms.</p>

            <div className="grid grid-cols-3 gap-3">
              {(['facebook', 'instagram', 'google_business'] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`border-2 rounded-xl py-3 px-2 text-xs font-bold transition-colors ${
                    platforms.includes(p)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>

            {loading ? <Spinner /> : (
              <button
                onClick={handleDispatch}
                disabled={platforms.length === 0}
                className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                Post with Manus
              </button>
            )}

            <button onClick={() => setStep(2)} className="w-full border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Back
            </button>
          </div>
        )}

        {/* Step 4: Dispatch Results */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Ad Dispatched!</h2>
            <p className="text-sm text-gray-400">Manus is autonomously posting your ad.</p>

            <div className="space-y-2">
              {Object.entries(dispatchResults).map(([platform, status]) => (
                <div key={platform} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-gray-700">
                    {PLATFORM_LABELS[platform as Platform] ?? platform}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    status === 'posted'
                      ? 'bg-green-50 text-green-600 border border-green-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {status === 'posted' ? 'Posted' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-400">Campaign ID</p>
              <p className="text-xs font-mono text-gray-600 truncate">{campaignId}</p>
            </div>

            {loading ? <Spinner /> : (
              <button onClick={handleDiscoverGroups} className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors">
                Boost with Community Groups
              </button>
            )}

            <button onClick={reset} className="w-full border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Done — Start Over
            </button>
          </div>
        )}

        {/* Step 5: Community Groups */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Community Groups</h2>
            <p className="text-sm text-gray-400">
              {Object.keys(groupResults).length > 0
                ? 'Manus is posting to your selected groups.'
                : 'Select the communities where you want to post your ad.'}
            </p>

            {Object.keys(groupResults).length > 0 ? (
              <>
                <div className="space-y-2">
                  {Object.entries(groupResults).map(([group, status]) => (
                    <div key={group} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700 truncate mr-2">{group}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${
                        status === 'posted'
                          ? 'bg-green-50 text-green-600 border border-green-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {status === 'posted' ? 'Posted' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={reset} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors">
                  Start Over
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {groups.map(g => (
                    <div
                      key={g.group}
                      onClick={() => toggleGroup(g)}
                      className={`border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                        approvedGroups.some(x => x.group === g.group)
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{g.group}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-2 flex-shrink-0">
                          {GROUP_PLATFORM_LABELS[g.platform]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{g.reason}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 text-center">
                  {approvedGroups.length} of {groups.length} selected
                </p>

                {loading ? <Spinner /> : (
                  <button
                    onClick={handlePostToGroups}
                    disabled={approvedGroups.length === 0}
                    className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                  >
                    Post to {approvedGroups.length} Group{approvedGroups.length !== 1 ? 's' : ''}
                  </button>
                )}

                <button onClick={reset} className="w-full border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Skip — Start Over
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/CreateAdWizard.tsx
git commit -m "feat: add CreateAdWizard 5-step component"
```

---

## Task 2: Wire into page.tsx

**Files:**
- Modify: `app/page.tsx`

Read `app/page.tsx` fully before editing. The file has a `tabs` array, a `Tab` type (currently inferred), and renders tab content via conditional blocks.

- [ ] **Step 1: Add the import at the top of `app/page.tsx`**

After the existing imports, add:
```typescript
import CreateAdWizard from '@/components/CreateAdWizard';
```

- [ ] **Step 2: Update the `tab` state type**

Find this line:
```typescript
const [tab, setTab] = useState<'signup' | 'marketing' | 'platform' | 'messages' | 'analytics'>('signup');
```

Replace with:
```typescript
const [tab, setTab] = useState<'signup' | 'marketing' | 'platform' | 'messages' | 'analytics' | 'create-ad'>('signup');
```

- [ ] **Step 3: Add the tab to the `tabs` array**

Find:
```typescript
const tabs = [
  { key: 'signup' as const, label: 'Get Started' },
  { key: 'marketing' as const, label: 'Marketing' },
  { key: 'platform' as const, label: 'Platform' },
  { key: 'messages' as const, label: 'Messages' },
  { key: 'analytics' as const, label: 'Analytics' },
];
```

Replace with:
```typescript
const tabs = [
  { key: 'signup' as const, label: 'Get Started' },
  { key: 'marketing' as const, label: 'Marketing' },
  { key: 'platform' as const, label: 'Platform' },
  { key: 'messages' as const, label: 'Messages' },
  { key: 'analytics' as const, label: 'Analytics' },
  { key: 'create-ad' as const, label: 'Create Ad' },
];
```

- [ ] **Step 4: Add the render block**

Find the closing analytics block — it ends with `)}` just before the footer div. Add the Create Ad render block immediately after the analytics `)}`:

```tsx
{tab === 'create-ad' && (
  <div className="max-w-lg mx-auto">
    <CreateAdWizard />
  </div>
)}
```

- [ ] **Step 5: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000. You should see a "Create Ad" tab in the nav. Click it and verify:
- Step 1 shows photo upload + form fields
- Clicking "Generate Ads with AI" without filling fields shows the error banner
- All 5 step labels appear in the progress bar

- [ ] **Step 7: Run tests to confirm nothing broke**

```bash
npx jest --no-coverage
```

Expected: All 19 tests still pass

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add Create Ad tab wired to CreateAdWizard"
```

---

## Done

The full wizard is live. End-to-end demo flow:
1. Click "Create Ad" tab
2. Upload a business photo, fill in name + goal + tone
3. Gemini generates 3 variants — pick one
4. Select platforms — Manus dispatches
5. Optionally boost to community groups via group scanner
