# Community Group Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given a campaign's business context, discover 8–10 relevant Facebook/Reddit/Nextdoor communities via Gemini, let the user approve a subset, then post the ad to each approved group via Manus.

**Architecture:** Gemini generates the group list as structured JSON (fast, reliable). The user approves a subset. Manus receives one natural-language browser task per approved group (fire-and-forget, same pattern as existing dispatch). Results stored in `campaigns.group_targets` and `campaigns.group_post_status`.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@google/generative-ai` (gemini-2.5-flash), Manus API v2, Supabase (service role), Jest + ts-jest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/scanner.ts` | Create | Gemini prompt + group discovery logic |
| `app/api/discover-groups/route.ts` | Create | POST handler — loads campaign, calls scanner, stores results |
| `app/api/post-to-groups/route.ts` | Create | POST handler — fires one Manus task per approved group |
| `__tests__/lib/scanner.test.ts` | Create | Unit tests for discoverGroups |
| `__tests__/api/discover-groups.test.ts` | Create | Route integration tests |
| `__tests__/api/post-to-groups.test.ts` | Create | Route integration tests |

**Supabase:** Already migrated — `group_targets` (jsonb) and `group_post_status` (jsonb) columns exist on `campaigns`.

---

## Existing Patterns to Follow

Before starting, read these two files — the new code mirrors them exactly:
- `lib/claude.ts` — Gemini call pattern (system prompt + user prompt, retry on malformed JSON)
- `lib/manus.ts` — Manus task.create pattern (fire-and-forget, x-manus-api-key header)
- `app/api/dispatch/route.ts` — route pattern (load campaign from Supabase, Promise.all per target, update status)

The Supabase client is at `lib/supabase.ts`. Import it as `import { supabase } from '@/lib/supabase'`.

---

## Task 1: discoverGroups — lib/scanner.ts + tests

**Files:**
- Create: `lib/scanner.ts`
- Create: `__tests__/lib/scanner.test.ts`

---

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/scanner.test.ts`:

```typescript
import { discoverGroups } from '@/lib/scanner';

const mockGroups = [
  { group: 'Redwood City Moms', platform: 'facebook', reason: 'local parent community' },
  { group: 'r/bayareafitness', platform: 'reddit', reason: 'regional fitness audience' },
  { group: 'Redwood City', platform: 'nextdoor', reason: 'hyperlocal neighborhood' },
  { group: 'Bay Area Fitness', platform: 'facebook', reason: 'fitness enthusiasts' },
  { group: 'r/loseit', platform: 'reddit', reason: 'weight loss community' },
  { group: 'San Mateo County', platform: 'nextdoor', reason: 'county-wide reach' },
  { group: 'Redwood City Parents', platform: 'facebook', reason: 'local parents' },
  { group: 'r/xxfitness', platform: 'reddit', reason: 'women fitness community' },
];

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: { text: () => JSON.stringify(mockGroups) },
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('discoverGroups', () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

  it('returns groups with group, platform, reason', async () => {
    const groups = await discoverGroups({
      businessName: 'Wild & The Barre',
      adGoal: 'summer class promo',
      tone: 'energetic',
    });

    expect(groups).toHaveLength(8);
    expect(groups[0]).toEqual({
      group: expect.any(String),
      platform: expect.stringMatching(/^(facebook|reddit|nextdoor)$/),
      reason: expect.any(String),
    });
  });

  it('retries once with stricter prompt if Gemini returns malformed JSON', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => 'not json' } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(mockGroups) } });

    const groups = await discoverGroups({
      businessName: 'Test Biz',
      adGoal: 'promo',
      tone: 'professional',
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(groups).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/scanner.test.ts --no-coverage
```

Expected: FAIL with `Cannot find module '@/lib/scanner'`

- [ ] **Step 3: Implement lib/scanner.ts**

Create `lib/scanner.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export type GroupTarget = {
  group: string;
  platform: 'facebook' | 'reddit' | 'nextdoor';
  reason: string;
};

const SYSTEM_PROMPT = `You are a local marketing expert. Given a business description, return exactly 8-10 relevant online communities where this business should advertise.
Return ONLY valid JSON — no markdown, no explanation.

Format:
[
  {"group": "<group name>", "platform": "<facebook|reddit|nextdoor>", "reason": "<why this community>"},
  ...
]

Include a mix of Facebook groups, subreddits (prefix with r/), and Nextdoor communities.`;

function buildPrompt(params: {
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
Find the top 8-10 online communities (Facebook groups, subreddits, Nextdoor) where this business should advertise.${strictNote}`;
}

async function callGemini(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  params: { businessName: string; adGoal: string; tone: string },
  strict = false
): Promise<GroupTarget[]> {
  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: buildPrompt({ ...params, strict }) },
  ]);

  const text = result.response.text().trim();
  const json = text.startsWith('[') ? text : text.slice(text.indexOf('['));
  return JSON.parse(json) as GroupTarget[];
}

export async function discoverGroups(params: {
  businessName: string;
  adGoal: string;
  tone: string;
}): Promise<GroupTarget[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  try {
    return await callGemini(model, params);
  } catch {
    return await callGemini(model, params, true);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/scanner.test.ts --no-coverage
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/scanner.ts __tests__/lib/scanner.test.ts
git commit -m "feat: add Gemini group discovery (discoverGroups)"
```

---

## Task 2: POST /api/discover-groups

**Files:**
- Create: `app/api/discover-groups/route.ts`
- Create: `__tests__/api/discover-groups.test.ts`

---

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/discover-groups.test.ts`:

```typescript
import { POST } from '@/app/api/discover-groups/route';
import { NextRequest } from 'next/server';

const mockDiscoverGroups = jest.fn();
jest.mock('@/lib/scanner', () => ({ discoverGroups: mockDiscoverGroups }));

const mockSingle = jest.fn();
const mockEqUpdate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: mockSingle })),
      })),
      update: jest.fn(() => ({
        eq: mockEqUpdate,
      })),
    })),
  },
}));

const mockGroups = [
  { group: 'Redwood City Moms', platform: 'facebook', reason: 'local parents' },
];

describe('POST /api/discover-groups', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockDiscoverGroups.mockResolvedValue(mockGroups);
    mockEqUpdate.mockResolvedValue({ error: null });
  });

  it('returns groups for a valid campaign', async () => {
    mockSingle.mockResolvedValue({
      data: { business_name: 'Wild & The Barre', ad_goal: 'summer promo', tone: 'energetic' },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/discover-groups', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: 'uuid-123' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.campaign_id).toBe('uuid-123');
    expect(body.groups).toEqual(mockGroups);
  });

  it('returns 404 if campaign not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const req = new NextRequest('http://localhost/api/discover-groups', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: 'bad-uuid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/discover-groups.test.ts --no-coverage
```

Expected: FAIL with `Cannot find module '@/app/api/discover-groups/route'`

- [ ] **Step 3: Implement the route**

Create `app/api/discover-groups/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { discoverGroups } from '@/lib/scanner';

export async function POST(request: NextRequest) {
  const { campaign_id } = await request.json() as { campaign_id: string };

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('business_name, ad_goal, tone')
    .eq('id', campaign_id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const groups = await discoverGroups({
    businessName: campaign.business_name,
    adGoal: campaign.ad_goal ?? '',
    tone: campaign.tone ?? '',
  });

  await supabase
    .from('campaigns')
    .update({ group_targets: groups })
    .eq('id', campaign_id);

  return NextResponse.json({ campaign_id, groups });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/api/discover-groups.test.ts --no-coverage
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/api/discover-groups/route.ts __tests__/api/discover-groups.test.ts
git commit -m "feat: add POST /api/discover-groups"
```

---

## Task 3: POST /api/post-to-groups

**Files:**
- Create: `app/api/post-to-groups/route.ts`
- Create: `__tests__/api/post-to-groups.test.ts`

---

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/post-to-groups.test.ts`:

```typescript
import { POST } from '@/app/api/post-to-groups/route';
import { NextRequest } from 'next/server';

global.fetch = jest.fn();

const mockSingle = jest.fn();
const mockEqUpdate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: mockSingle })),
      })),
      update: jest.fn(() => ({
        eq: mockEqUpdate,
      })),
    })),
  },
}));

const mockCampaign = {
  photo_url: 'https://example.com/photo.jpg',
  variants: [{ label: 'A', copy: 'Level up! 💪 Join us.', platform: 'instagram' }],
  selected_variant: 0,
};

describe('POST /api/post-to-groups', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockEqUpdate.mockResolvedValue({ error: null });
    process.env.MANUS_API_KEY = 'test-key';
  });

  it('fires one Manus task per approved group and returns posted', async () => {
    mockSingle.mockResolvedValue({ data: mockCampaign, error: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, task_id: 'task-1' }),
    });

    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({
        campaign_id: 'uuid-123',
        approved_groups: [
          { group: 'Redwood City Moms', platform: 'facebook', reason: 'local' },
          { group: 'r/fitness', platform: 'reddit', reason: 'fitness' },
        ],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(body.results['Redwood City Moms']).toBe('posted');
    expect(body.results['r/fitness']).toBe('posted');
  });

  it('records failed for groups where Manus throws', async () => {
    mockSingle.mockResolvedValue({ data: mockCampaign, error: null });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));

    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({
        campaign_id: 'uuid-123',
        approved_groups: [{ group: 'Redwood City Moms', platform: 'facebook', reason: 'local' }],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(body.results['Redwood City Moms']).toBe('failed');
  });

  it('returns empty results when no groups approved', async () => {
    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: 'uuid-123', approved_groups: [] }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toEqual({});
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 if campaign not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({
        campaign_id: 'bad-uuid',
        approved_groups: [{ group: 'Redwood City Moms', platform: 'facebook', reason: 'local' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/post-to-groups.test.ts --no-coverage
```

Expected: FAIL with `Cannot find module '@/app/api/post-to-groups/route'`

- [ ] **Step 3: Implement the route**

Create `app/api/post-to-groups/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { GroupTarget } from '@/lib/scanner';
import type { AdVariant } from '@/lib/supabase';

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook group',
  reddit: 'subreddit',
  nextdoor: 'Nextdoor community',
};

export async function POST(request: NextRequest) {
  const { campaign_id, approved_groups } = await request.json() as {
    campaign_id: string;
    approved_groups: GroupTarget[];
  };

  if (!approved_groups.length) {
    return NextResponse.json({ results: {} });
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('photo_url, variants, selected_variant')
    .eq('id', campaign_id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const variant = (campaign.variants as AdVariant[])[campaign.selected_variant as number];
  const apiKey = process.env.MANUS_API_KEY!;

  const results = await Promise.all(
    approved_groups.map(async ({ group, platform }) => {
      const label = PLATFORM_LABEL[platform] ?? platform;
      const prompt = `Find the ${label} called "${group}" and post the following ad.

Photo: ${campaign.photo_url}

Ad copy:
${variant.copy}

Please post this as a new post in the group using the photo and copy above.`;

      try {
        const response = await fetch('https://api.manus.ai/v2/task.create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-manus-api-key': apiKey,
          },
          body: JSON.stringify({
            message: { content: [{ type: 'text', text: prompt }] },
            agent_profile: 'manus-1.6',
            title: `Post to ${group}`,
          }),
        });
        if (!response.ok) return [group, 'failed'];
        const data = await response.json();
        return [group, data.ok ? 'posted' : 'failed'];
      } catch {
        return [group, 'failed'];
      }
    })
  );

  const groupPostStatus = Object.fromEntries(results);

  await supabase
    .from('campaigns')
    .update({ group_post_status: groupPostStatus })
    .eq('id', campaign_id);

  return NextResponse.json({ results: groupPostStatus });
}
```

- [ ] **Step 4: Run all tests to verify everything passes**

```bash
npx jest --no-coverage
```

Expected: All tests pass (previous 9 + 6 new = 15 total)

- [ ] **Step 5: Commit**

```bash
git add app/api/post-to-groups/route.ts __tests__/api/post-to-groups.test.ts
git commit -m "feat: add POST /api/post-to-groups — Manus dispatch to community groups"
```

---

## Done

All 6 new files implemented and tested. The scanner is ready for the frontend to wire up:

1. `POST /api/discover-groups` — send `{ campaign_id }`, get back `{ groups: GroupTarget[] }`
2. User reviews groups, selects subset
3. `POST /api/post-to-groups` — send `{ campaign_id, approved_groups }`, get back `{ results: { [groupName]: "posted"|"failed" } }`
