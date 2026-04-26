import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendRewardEmail, sendStreakRewardEmail } from '@/lib/resend';

const STREAK_DAYS = 5;

async function getConsecutiveStreak(customerId: string): Promise<number> {
  const { data } = await supabase
    .from('check_ins')
    .select('checked_in_at')
    .eq('customer_id', customerId)
    .order('checked_in_at', { ascending: false });

  if (!data || data.length === 0) return 1;

  const seen = new Set<string>();
  const uniqueDays: string[] = [];
  for (const r of data) {
    const day = new Date(r.checked_in_at).toISOString().slice(0, 10);
    if (!seen.has(day)) { seen.add(day); uniqueDays.push(day); }
  }

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function POST(req: NextRequest) {
  try {
    const { customer_id, class_type } = await req.json();

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
    }

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, total_check_ins, email, first_name')
      .eq('id', customer_id)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { error: checkInErr } = await supabase
      .from('check_ins')
      .insert({ customer_id, class_type: class_type || null });

    if (checkInErr) throw checkInErr;

    const newTotal = customer.total_check_ins + 1;
    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('customers')
      .update({ total_check_ins: newTotal, updated_at: now, last_checkin_at: now })
      .eq('id', customer_id);

    if (updateErr) throw updateErr;

    // Milestone rewards
    const { data: milestones } = await supabase
      .from('rewards_milestones')
      .select('*')
      .eq('is_active', true)
      .lte('check_in_threshold', newTotal)
      .order('check_in_threshold', { ascending: true });

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
            sendRewardEmail(customer.email, customer.first_name, m.reward_name).catch(console.error);
          }
        }
      }
    }

    // Streak detection
    const streak = await getConsecutiveStreak(customer_id);
    if (streak > 0 && streak % STREAK_DAYS === 0) {
      sendStreakRewardEmail(customer.email, customer.first_name, streak).catch(console.error);
    }

    // Segment update
    let segment = 'new';
    if (newTotal >= 50) segment = 'vip';
    else if (newTotal >= 20) segment = 'loyal';
    else if (newTotal >= 5) segment = 'regular';

    await supabase
      .from('customer_segments')
      .upsert({ customer_id, segment }, { onConflict: 'customer_id,segment' });

    return NextResponse.json({ total_check_ins: newTotal, new_rewards: newRewards, segment, streak });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
