import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { discoverGroups } from '@/lib/scanner';

export async function POST(request: NextRequest) {
  const { campaign_id } = await request.json() as { campaign_id: string };

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('business_name, ad_goal, tone, location')
    .eq('id', campaign_id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const groups = await discoverGroups({
    businessName: campaign.business_name,
    adGoal: campaign.ad_goal ?? '',
    tone: campaign.tone ?? '',
    location: campaign.location ?? undefined,
  });

  await supabase
    .from('campaigns')
    .update({ group_targets: groups })
    .eq('id', campaign_id);

  return NextResponse.json({ campaign_id, groups });
}
