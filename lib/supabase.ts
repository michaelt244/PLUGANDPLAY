import { createClient } from '@supabase/supabase-js';

export type AdVariant = {
  label: 'A' | 'B' | 'C';
  copy: string;
  platform: 'instagram' | 'facebook' | 'google_business';
};

export type Campaign = {
  id: string;
  business_name: string;
  ad_goal: string | null;
  tone: string | null;
  photo_url: string | null;
  variants: AdVariant[] | null;
  selected_variant: number | null;
  platforms: string[] | null;
  dispatch_status: Record<string, string> | null;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client using service role key — never expose to browser
export const supabase = createClient<{ public: { Tables: { campaigns: { Row: Campaign } } } }>(
  supabaseUrl,
  supabaseServiceKey
);

export async function uploadPhoto(
  campaignId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${campaignId}/photo.${ext}`;

  const { error } = await supabase.storage
    .from('campaign-photos')
    .upload(path, file, { upsert: true });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from('campaign-photos')
    .getPublicUrl(path);

  return data.publicUrl;
}
