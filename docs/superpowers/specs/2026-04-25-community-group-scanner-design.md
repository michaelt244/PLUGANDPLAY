# Community Group Scanner Design

## Goal

Given an existing campaign's business context, discover the top 8–10 relevant Facebook groups, subreddits, and Nextdoor communities, let the user approve a subset, then post the campaign's selected ad variant to each approved group via Manus.

## Architecture

**Gemini is the brain — Manus is the hands.**

- Gemini receives the campaign's `business_name`, `ad_goal`, and `tone` and returns a ranked JSON list of target communities.
- The user reviews the list and approves a subset.
- Manus receives one natural-language task per approved group instructing it to find the group and post the ad (photo + copy).

This split keeps discovery fast and structured (Gemini returns JSON instantly) while letting Manus handle browser automation for posting (where it excels).

## Data Flow

```
campaign { business_name, ad_goal, tone, photo_url, variants[selected_variant] }
    ↓
POST /api/discover-groups
    ↓
Gemini prompt → returns JSON array of 8–10 groups:
[
  { group: "Redwood City Moms", platform: "facebook", reason: "local parent community" },
  { group: "r/bayareafitness",  platform: "reddit",   reason: "regional fitness audience" },
  { group: "Redwood City",      platform: "nextdoor", reason: "hyperlocal neighborhood" },
  ...
]
    ↓
Stored in campaigns.group_targets (jsonb)
    ↓
User reviews list, approves subset
    ↓
POST /api/post-to-groups  { campaign_id, approved_groups: [...] }
    ↓
For each approved group → Manus task.create (fire-and-forget):
  "Find the [platform] group '[group name]' and post this ad.
   Photo: [photo_url]
   Copy: [selected variant copy]"
    ↓
Results stored in campaigns.group_post_status (jsonb)
```

## New Files

| File | Responsibility |
|------|---------------|
| `lib/scanner.ts` | Gemini prompt + parsing logic for group discovery |
| `app/api/discover-groups/route.ts` | POST handler — loads campaign, calls scanner, stores results |
| `app/api/post-to-groups/route.ts` | POST handler — fires one Manus task per approved group |
| `__tests__/lib/scanner.test.ts` | Unit tests for scanner (mocked Gemini) |
| `__tests__/api/discover-groups.test.ts` | Route integration tests |
| `__tests__/api/post-to-groups.test.ts` | Route integration tests |

## Database Changes

Two nullable columns added to the existing `campaigns` table:

| Column | Type | Description |
|--------|------|-------------|
| `group_targets` | jsonb | Gemini-discovered groups `[{ group, platform, reason }]` |
| `group_post_status` | jsonb | Per-group Manus dispatch result `{ "Redwood City Moms": "posted" }` |

Migration: `ALTER TABLE campaigns ADD COLUMN group_targets jsonb, ADD COLUMN group_post_status jsonb;`

## API Contracts

### POST /api/discover-groups

**Request:**
```json
{ "campaign_id": "uuid" }
```

**Response 200:**
```json
{
  "campaign_id": "uuid",
  "groups": [
    { "group": "Redwood City Moms", "platform": "facebook", "reason": "local parent community" },
    { "group": "r/bayareafitness",  "platform": "reddit",   "reason": "regional fitness audience" }
  ]
}
```

**Errors:** 404 if campaign not found, 500 if Gemini fails.

---

### POST /api/post-to-groups

**Request:**
```json
{
  "campaign_id": "uuid",
  "approved_groups": [
    { "group": "Redwood City Moms", "platform": "facebook" }
  ]
}
```

**Response 200:**
```json
{
  "results": {
    "Redwood City Moms": "posted",
    "r/bayareafitness": "failed"
  }
}
```

**Errors:** 404 if campaign not found.

## lib/scanner.ts Interface

```typescript
export type GroupTarget = {
  group: string;
  platform: 'facebook' | 'reddit' | 'nextdoor';
  reason: string;
};

export async function discoverGroups(params: {
  businessName: string;
  adGoal: string;
  tone: string;
}): Promise<GroupTarget[]>
```

- Uses `gemini-2.5-flash` (same model as `lib/claude.ts`)
- Prompt asks for exactly 8–10 groups, ONLY valid JSON returned
- Retries once with stricter prompt on malformed JSON (same pattern as `lib/claude.ts`)

## Manus Task Format (per group)

```
Find the [Facebook group / subreddit / Nextdoor community] called "[group name]"
and post the following ad.

Photo: [photo_url]

Ad copy:
[variant copy]

Please post this as a new post in the group using the photo and copy above.
```

Same `manus-1.6` agent profile and `x-manus-api-key` header as existing dispatch.

## Error Handling

- **Gemini returns malformed JSON:** retry once with stricter prompt, throw on second failure → 500
- **Campaign not found:** 404
- **Individual Manus task fails:** isolated per group (one failure doesn't block others), status recorded as `"failed"` in `group_post_status`
- **No approved groups sent:** return empty results `{}`

## Testing Strategy

- `lib/scanner.test.ts`: mock `@google/generative-ai`, verify 8–10 groups returned with correct shape; verify retry behavior on malformed JSON
- `api/discover-groups.test.ts`: mock scanner + Supabase, verify 404 on missing campaign, verify groups stored and returned
- `api/post-to-groups.test.ts`: mock Manus fetch, verify one call per approved group, verify per-group failure isolation
