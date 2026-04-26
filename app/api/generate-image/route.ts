import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { businessName, adGoal, tone } = await req.json();

  if (!businessName || !adGoal) {
    return NextResponse.json(
      { error: 'businessName and adGoal are required' },
      { status: 400 }
    );
  }

  const prompt = `Professional marketing photo for ${businessName}. Goal: ${adGoal}. Tone: ${tone ?? 'professional'}. High quality commercial photography, vibrant, inviting.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('Imagen API error:', err);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
  }

  const data = await response.json();
  const base64 = data.predictions?.[0]?.bytesBase64Encoded;

  if (!base64) {
    return NextResponse.json({ error: 'No image returned from Imagen' }, { status: 500 });
  }

  const buffer = Buffer.from(base64, 'base64');
  const path = `generated/${Date.now()}.png`;

  const { error: uploadErr } = await supabase.storage
    .from('campaign-photos')
    .upload(path, buffer, { contentType: 'image/png', upsert: false });

  if (uploadErr) {
    console.error('Storage upload error:', uploadErr);
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from('campaign-photos')
    .getPublicUrl(path);

  return NextResponse.json({ imageUrl: urlData.publicUrl });
}
