# Loyalty Reward Email Design

## Goal

When a customer's check-in triggers a reward milestone, automatically send them a reward notification email via Resend.

## Context

The check-in route (`app/api/checkin/route.ts`) already:
- Records the check-in in `check_ins`
- Increments `customers.total_check_ins`
- Queries `rewards_milestones` for newly earned milestones
- Inserts into `rewards_earned`
- Returns `new_rewards: [{ milestone_id, reward_name }]`

It does NOT send any email. This feature wires Resend into that existing flow.

## What Gets Built

Two changes only:

1. **`lib/resend.ts`** — `sendRewardEmail(to, firstName, rewardName)` sends a reward notification email via Resend's REST API.
2. **`app/api/checkin/route.ts`** (modify) — fetch `email` and `first_name` alongside `total_check_ins`, then call `sendRewardEmail` for each newly earned reward.

No new routes. No schema changes. No new Supabase tables.

## Data Flow

```
POST /api/checkin  { customer_id, class_type }
    ↓
Fetch customer: id, total_check_ins, email, first_name
    ↓
Record check-in, increment total_check_ins
    ↓
Detect newly earned milestones (existing logic)
    ↓
For each new reward:
  → INSERT into rewards_earned (existing)
  → sendRewardEmail(customer.email, customer.first_name, milestone.reward_name)
    ↓
Return { total_check_ins, new_rewards, segment }
```

## lib/resend.ts Interface

```typescript
export async function sendRewardEmail(
  to: string,
  firstName: string,
  rewardName: string
): Promise<void>
```

- Uses `fetch` to call `https://api.resend.com/emails`
- Auth: `Authorization: Bearer ${process.env.RESEND_API_KEY}`
- From: `LocalBoost <onboarding@resend.dev>` (no domain setup needed)
- Subject: `You earned a reward! 🎉`
- Body (plain HTML): congratulates customer by first name, names the reward
- Throws on non-2xx response so the check-in route can log the failure without blocking the response

## Email Format

```
Subject: You earned a reward! 🎉

Hi [firstName],

Congratulations! You've just earned: [rewardName]

Keep coming back — your loyalty means everything to us.

— The Team
```

## Error Handling

- Email failure is **non-blocking** — if `sendRewardEmail` throws, the check-in route catches it, logs the error, and still returns a successful check-in response. A failed email never causes a failed check-in.
- If `RESEND_API_KEY` is missing, `sendRewardEmail` throws immediately (caught by the non-blocking wrapper).

## Modified check-in route

The only change to `app/api/checkin/route.ts`:

1. Add `email, first_name` to the Supabase select: `.select('id, total_check_ins, email, first_name')`
2. After inserting each new reward, call:
```typescript
sendRewardEmail(customer.email, customer.first_name, m.reward_name).catch(console.error);
```

## New Files

| File | Action |
|------|--------|
| `lib/resend.ts` | Create |
| `__tests__/lib/resend.test.ts` | Create |
| `app/api/checkin/route.ts` | Modify (2 lines) |

## Testing

- `__tests__/lib/resend.test.ts` — mock `global.fetch`, verify correct headers/body sent, verify throws on non-2xx
- `app/api/checkin/route.ts` — existing tests still pass; no new route tests needed (email is fire-and-forget, non-blocking)
