import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { dispatchToManus, type Platform, type DispatchStatus } from '@/lib/manus';

export async function POST(request: NextRequest) {
  const { campaign_id, selected_variant, platforms } = await request.json() as {
    campaign_id: string;
    selected_variant: number;
    platforms: Platform[];
  };

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('photo_url, variants')
    .eq('id', campaign_id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const variant = campaign.variants[selected_variant];

  const results = await Promise.all(
    platforms.map(async (platform) => {
      const status = await dispatchToManus({
        platform,
        copy: variant.copy,
        photoUrl: campaign.photo_url,
      });
      return [platform, status] as [Platform, DispatchStatus];
    })
  );

  const dispatchStatus = Object.fromEntries(results);

  await supabase
    .from('campaigns')
    .update({ selected_variant, platforms, dispatch_status: dispatchStatus })
    .eq('id', campaign_id);

  return NextResponse.json({ results: dispatchStatus });
}
