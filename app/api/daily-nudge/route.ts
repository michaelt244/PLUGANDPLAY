import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendNoShowEmail } from '@/lib/resend';

const NO_SHOW_AFTER_DAYS = 2;
const NUDGE_COOLDOWN_DAYS = 7;

export async function POST(req: NextRequest) {
  // Protect the route — only Vercel cron or internal calls with secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const noShowCutoff = new Date();
  noShowCutoff.setDate(noShowCutoff.getDate() - NO_SHOW_AFTER_DAYS);

  const cooldownCutoff = new Date();
  cooldownCutoff.setDate(cooldownCutoff.getDate() - NUDGE_COOLDOWN_DAYS);

  // Find customers who have checked in before, but not in the last NO_SHOW_AFTER_DAYS days,
  // and haven't been nudged in the last NUDGE_COOLDOWN_DAYS days
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, email, first_name, last_checkin_at, last_no_show_notified_at')
    .not('last_checkin_at', 'is', null)
    .lt('last_checkin_at', noShowCutoff.toISOString())
    .or(`last_no_show_notified_at.is.null,last_no_show_notified_at.lt.${cooldownCutoff.toISOString()}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!customers || customers.length === 0) {
    return NextResponse.json({ nudged: 0 });
  }

  const now = new Date().toISOString();
  let nudged = 0;

  for (const customer of customers) {
    const lastCheckin = new Date(customer.last_checkin_at as string);
    const daysMissed = Math.floor((Date.now() - lastCheckin.getTime()) / 86400000);

    try {
      await sendNoShowEmail(customer.email, customer.first_name, daysMissed);
      await supabase
        .from('customers')
        .update({ last_no_show_notified_at: now })
        .eq('id', customer.id);
      nudged++;
    } catch {
      // continue to next customer on email failure
    }
  }

  return NextResponse.json({ nudged, total_eligible: customers.length });
}
