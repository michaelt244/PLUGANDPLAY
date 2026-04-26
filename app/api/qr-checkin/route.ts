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

    const { error: segErr } = await supabase
      .from('customer_segments')
      .insert({ customer_id, business_id, segment: 'new' });

    if (segErr) console.error('customer_segments insert failed:', segErr);

    sendWelcomeEmail(email, first_name).catch(console.error);
  }

  await supabase
    .from('check_ins')
    .insert({ customer_id, business_id, class_type: null });

  const currentTotal = is_new ? 0 : (existing?.total_check_ins ?? 0);
  const newTotal = currentTotal + 1;

  await supabase
    .from('customers')
    .update({ total_check_ins: newTotal, updated_at: new Date().toISOString() })
    .eq('id', customer_id);

  return NextResponse.json({ customer_id, is_new, total_check_ins: newTotal });
}
