import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { first_name, last_name, email, phone, birthday, preferences } = body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'first_name, last_name, and email are required' },
        { status: 400 }
      );
    }

    // Insert customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({ first_name, last_name, email, phone: phone || null, birthday: birthday || null })
      .select()
      .single();

    if (customerError) {
      if (customerError.code === '23505') {
        return NextResponse.json(
          { error: 'A customer with this email already exists' },
          { status: 409 }
        );
      }
      throw customerError;
    }

    // Assign "new" segment
    await supabase
      .from('customer_segments')
      .insert({ customer_id: customer.id, segment: 'new' });

    // Save preferences (from screen 2)
    if (preferences && typeof preferences === 'object') {
      const prefRows = Object.entries(preferences)
        .filter(([, v]) => v != null && v !== '')
        .map(([key, value]) => ({
          customer_id: customer.id,
          preference_key: key,
          preference_value: String(value),
        }));

      if (prefRows.length > 0) {
        const { error: prefError } = await supabase
          .from('customer_preferences')
          .insert(prefRows);

        if (prefError) throw prefError;
      }
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
