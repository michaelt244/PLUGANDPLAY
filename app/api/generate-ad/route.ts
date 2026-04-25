import { NextRequest, NextResponse } from 'next/server';
import { supabase, uploadPhoto } from '@/lib/supabase';
import { generateAdVariants } from '@/lib/claude';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const photo = formData.get('photo') as File | null;
  const businessName = formData.get('business_name') as string;
  const adGoal = formData.get('ad_goal') as string;
  const tone = formData.get('tone') as 'energetic' | 'professional' | 'warm';

  if (!photo) {
    return NextResponse.json({ error: 'photo is required' }, { status: 400 });
  }

  const { data: campaign, error: insertError } = await supabase
    .from('campaigns')
    .insert({ business_name: businessName, ad_goal: adGoal, tone })
    .select('id')
    .single();

  if (insertError || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }

  let photoUrl: string;
  try {
    photoUrl = await uploadPhoto(campaign.id, photo);
  } catch {
    return NextResponse.json({ error: 'Photo upload failed' }, { status: 400 });
  }

  const variants = await generateAdVariants({ photoUrl, businessName, adGoal, tone });

  await supabase
    .from('campaigns')
    .update({ photo_url: photoUrl, variants })
    .eq('id', campaign.id);

  return NextResponse.json({ campaign_id: campaign.id, variants });
}
