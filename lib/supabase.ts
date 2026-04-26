import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client using service role key — never expose to browser
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Browser-safe client using anon key
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ----- Shared types -----

export type Customer = {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  total_check_ins: number;
  created_at: string;
  updated_at: string;
};

export type CheckIn = {
  id: string;
  customer_id: string;
  business_id: string;
  checked_in_at: string;
  class_type: string | null;
};

export type RewardsMilestone = {
  id: string;
  check_in_threshold: number;
  reward_name: string;
  reward_description: string | null;
  is_active: boolean;
};

export type RewardEarned = {
  id: string;
  customer_id: string;
  milestone_id: string;
  earned_at: string;
  redeemed_at: string | null;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  created_at: string;
};

export type QrCode = {
  id: string;
  business_id: string;
  label: string;
  created_at: string;
};

// ----- Legacy re-exports (campaigns) -----

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
