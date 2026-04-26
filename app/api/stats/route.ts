import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const business_id = request.nextUrl.searchParams.get('business_id');

  const campaignsQuery = supabase
    .from('campaigns')
    .select('id, dispatch_status', { count: 'exact' });

  const customersQuery = supabase
    .from('customers')
    .select('id', { count: 'exact', head: true });

  const recentQuery = supabase
    .from('campaigns')
    .select('business_name, ad_goal, tone, location, dispatch_status, created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  if (business_id) {
    campaignsQuery.eq('business_id', business_id);
    customersQuery.eq('business_id', business_id);
    recentQuery.eq('business_id', business_id);
  }

  const [campaignsRes, customersRes, recentRes, businessesRes] = await Promise.all([
    campaignsQuery,
    customersQuery,
    recentQuery,
    supabase.from('businesses').select('id, name, slug').order('name'),
  ]);

  const allCampaigns = campaignsRes.data ?? [];
  const dispatched = allCampaigns.filter((c) => c.dispatch_status !== null).length;
  const posted = allCampaigns.filter((c) => {
    const s = c.dispatch_status as Record<string, string> | null;
    return s && Object.values(s).some((v) => v === 'posted');
  }).length;

  return NextResponse.json({
    totalCampaigns: campaignsRes.count ?? 0,
    totalCustomers: customersRes.count ?? 0,
    dispatched,
    posted,
    recent: recentRes.data ?? [],
    businesses: businessesRes.data ?? [],
  });
}
