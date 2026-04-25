import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { customer_id, items, total_cents } = await req.json();

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'customer_id and a non-empty items array are required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id,
        items,
        total_cents: total_cents ?? 0,
        status: 'pending',
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json(
        { error: 'customer_id query param is required' },
        { status: 400 }
      );
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
