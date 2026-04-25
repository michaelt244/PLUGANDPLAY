import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { GroupTarget } from '@/lib/scanner';
import type { AdVariant } from '@/lib/supabase';

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook group',
  reddit: 'subreddit',
  nextdoor: 'Nextdoor community',
};

export async function POST(request: NextRequest) {
  const { campaign_id, approved_groups } = await request.json() as {
    campaign_id: string;
    approved_groups: GroupTarget[];
  };

  if (!approved_groups.length) {
    return NextResponse.json({ results: {} });
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('photo_url, variants, selected_variant')
    .eq('id', campaign_id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const variant = (campaign.variants as AdVariant[])[campaign.selected_variant as number];
  const apiKey = process.env.MANUS_API_KEY!;

  const results = await Promise.all(
    approved_groups.map(async ({ group, platform }) => {
      const label = PLATFORM_LABEL[platform] ?? platform;
      const prompt = `Find the ${label} called "${group}" and post the following ad.

Photo: ${campaign.photo_url}

Ad copy:
${variant.copy}

Please post this as a new post in the group using the photo and copy above.`;

      try {
        const response = await fetch('https://api.manus.ai/v2/task.create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-manus-api-key': apiKey,
          },
          body: JSON.stringify({
            message: { content: [{ type: 'text', text: prompt }] },
            agent_profile: 'manus-1.6',
            title: `Post to ${group}`,
          }),
        });
        if (!response.ok) return [group, 'failed'];
        const data = await response.json();
        return [group, data.ok ? 'posted' : 'failed'];
      } catch {
        return [group, 'failed'];
      }
    })
  );

  const groupPostStatus = Object.fromEntries(results);

  await supabase
    .from('campaigns')
    .update({ group_post_status: groupPostStatus })
    .eq('id', campaign_id);

  return NextResponse.json({ results: groupPostStatus });
}
