import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'email query param is required' }, { status: 400 });
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({ customer });
}
