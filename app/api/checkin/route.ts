import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendRewardEmail } from '@/lib/resend';

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

    const { error: updateErr } = await supabase
      .from('customers')
      .update({ total_check_ins: newTotal, updated_at: new Date().toISOString() })
      .eq('id', customer_id);

    if (updateErr) throw updateErr;

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
