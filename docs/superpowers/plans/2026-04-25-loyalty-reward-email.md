# Loyalty Reward Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a Resend reward email to a customer whenever their check-in triggers a new loyalty milestone.

**Architecture:** `lib/resend.ts` exposes a single `sendRewardEmail` function. The existing `/api/checkin` route already detects milestone hits — we add two lines: fetch `email` + `first_name` from the customer, then call `sendRewardEmail` (non-blocking `.catch`) for each new reward.

**Tech Stack:** Next.js 14 App Router, TypeScript, Resend REST API, Jest + ts-jest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/resend.ts` | Create | `sendRewardEmail(to, firstName, rewardName)` via Resend REST API |
| `__tests__/lib/resend.test.ts` | Create | Unit tests for sendRewardEmail |
| `app/api/checkin/route.ts` | Modify | Fetch email + first_name, call sendRewardEmail per new reward |

---

## Existing Code to Understand

Read `app/api/checkin/route.ts` before starting. The relevant section:

```typescript
// line 13 — currently selects only id and total_check_ins
const { data: customer, error: custErr } = await supabase
  .from('customers')
  .select('id, total_check_ins')   // ← change to also fetch email, first_name
  .eq('id', customer_id)
  .single();

// line 64 — currently only inserts reward, no email
if (!rewardErr) {
  newRewards.push({ milestone_id: m.id, reward_name: m.reward_name });
  // ← add sendRewardEmail call here
}
```

---

## Task 1: lib/resend.ts + tests

**Files:**
- Create: `lib/resend.ts`
- Create: `__tests__/lib/resend.test.ts`

---

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/resend.test.ts`:

```typescript
import { sendRewardEmail } from '@/lib/resend';

global.fetch = jest.fn();

describe('sendRewardEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
  });

  it('posts to Resend with correct headers and body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    await sendRewardEmail('sarah@example.com', 'Sarah', 'Free Class');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      })
    );

    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body
    );
    expect(body.to).toEqual(['sarah@example.com']);
    expect(body.subject).toBe('You earned a reward! 🎉');
    expect(body.html).toContain('Sarah');
    expect(body.html).toContain('Free Class');
  });

  it('throws if Resend returns non-2xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 422 });

    await expect(
      sendRewardEmail('bad@example.com', 'Bob', 'Free Class')
    ).rejects.toThrow('Resend API error: 422');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/lib/resend.test.ts --no-coverage
```

Expected: FAIL with `Cannot find module '@/lib/resend'`

- [ ] **Step 3: Implement lib/resend.ts**

Create `lib/resend.ts`:

```typescript
export async function sendRewardEmail(
  to: string,
  firstName: string,
  rewardName: string
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'LocalBoost <onboarding@resend.dev>',
      to: [to],
      subject: 'You earned a reward! 🎉',
      html: `<p>Hi ${firstName},</p>
<p>Congratulations! You've just earned: <strong>${rewardName}</strong></p>
<p>Keep coming back — your loyalty means everything to us.</p>
<p>— The Team</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status}`);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx jest __tests__/lib/resend.test.ts --no-coverage
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add lib/resend.ts __tests__/lib/resend.test.ts
git commit -m "feat: add sendRewardEmail via Resend"
```

---

## Task 2: Wire email into /api/checkin

**Files:**
- Modify: `app/api/checkin/route.ts`

No new test file — the email call is non-blocking (`.catch`), and the existing check-in tests cover the route behavior. Run all tests at the end to confirm nothing broke.

---

- [ ] **Step 1: Replace the full file**

Replace `app/api/checkin/route.ts` with this (two changes from original: `select` adds `email, first_name`; email call added after reward insert):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendRewardEmail } from '@/lib/resend';

export async function POST(req: NextRequest) {
  try {
    const { customer_id, class_type } = await req.json();

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
    }

    // Verify customer exists — fetch email + first_name for reward email
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, total_check_ins, email, first_name')
      .eq('id', customer_id)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Record the check-in
    const { error: checkInErr } = await supabase
      .from('check_ins')
      .insert({ customer_id, class_type: class_type || null });

    if (checkInErr) throw checkInErr;

    // Increment total_check_ins
    const newTotal = customer.total_check_ins + 1;

    const { error: updateErr } = await supabase
      .from('customers')
      .update({ total_check_ins: newTotal, updated_at: new Date().toISOString() })
      .eq('id', customer_id);

    if (updateErr) throw updateErr;

    // Check for newly earned milestones
    const { data: milestones } = await supabase
      .from('rewards_milestones')
      .select('*')
      .eq('is_active', true)
      .lte('check_in_threshold', newTotal)
      .order('check_in_threshold', { ascending: true });

    // Get already-earned milestone IDs
    const { data: alreadyEarned } = await supabase
      .from('rewards_earned')
      .select('milestone_id')
      .eq('customer_id', customer_id);

    const earnedIds = new Set((alreadyEarned ?? []).map((r) => r.milestone_id));
    const newRewards: { milestone_id: string; reward_name: string }[] = [];

    if (milestones) {
      for (const m of milestones) {
        if (!earnedIds.has(m.id)) {
          const { error: rewardErr } = await supabase
            .from('rewards_earned')
            .insert({ customer_id, milestone_id: m.id });

          if (!rewardErr) {
            newRewards.push({ milestone_id: m.id, reward_name: m.reward_name });
            // Fire reward email — non-blocking, never fails the check-in
            sendRewardEmail(customer.email, customer.first_name, m.reward_name).catch(console.error);
          }
        }
      }
    }

    // Update segment based on total check-ins
    let segment = 'new';
    if (newTotal >= 50) segment = 'vip';
    else if (newTotal >= 20) segment = 'loyal';
    else if (newTotal >= 5) segment = 'regular';

    await supabase
      .from('customer_segments')
      .upsert(
        { customer_id, segment },
        { onConflict: 'customer_id,segment' }
      );

    return NextResponse.json({
      total_check_ins: newTotal,
      new_rewards: newRewards,
      segment,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass (17 existing + 2 new = 19 total)

- [ ] **Step 3: Commit**

```bash
git add app/api/checkin/route.ts
git commit -m "feat: send reward email on milestone check-in"
```

---

## Done

Reward emails fire automatically on every milestone check-in. The Resend `RESEND_API_KEY` env var must be set for emails to send in production.
