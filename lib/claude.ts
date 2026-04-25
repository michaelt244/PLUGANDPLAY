import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AdVariant } from './supabase';

const SYSTEM_PROMPT = `You are an expert social media copywriter for small local businesses.
Given a photo and business context, write exactly 3 ad copy variants as a JSON array.
Return ONLY valid JSON — no markdown, no explanation.

Format:
[
  {"label": "A", "copy": "<instagram copy, casual, emoji ok, ≤140 chars>", "platform": "instagram"},
  {"label": "B", "copy": "<facebook copy, community tone, ≤200 chars>", "platform": "facebook"},
  {"label": "C", "copy": "<google business copy, offer-led, ≤120 chars>", "platform": "google_business"}
]`;

function buildUserPrompt(params: {
  businessName: string;
  adGoal: string;
  tone: string;
  strict?: boolean;
}): string {
  const strictNote = params.strict
    ? ' IMPORTANT: Return ONLY a JSON array, nothing else.'
    : '';
  return `Business: ${params.businessName}
Goal: ${params.adGoal}
Tone: ${params.tone}
Write 3 ad variants for this photo.${strictNote}`;
}

async function callGemini(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  photoUrl: string,
  params: { businessName: string; adGoal: string; tone: string },
  strict = false
): Promise<AdVariant[]> {
  const imageResp = await fetch(photoUrl);
  const imageBuffer = await imageResp.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString('base64');
  const mimeType = (imageResp.headers.get('content-type') ?? 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp';

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { inlineData: { mimeType, data: base64 } },
    { text: buildUserPrompt({ ...params, strict }) },
  ]);

  const text = result.response.text().trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array in Gemini response');
  return JSON.parse(text.slice(start, end + 1)) as AdVariant[];
}

export async function generateAdVariants(params: {
  photoUrl: string;
  businessName: string;
  adGoal: string;
  tone: 'energetic' | 'professional' | 'warm';
}): Promise<AdVariant[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const { photoUrl, ...context } = params;
  try {
    return await callGemini(model, photoUrl, context);
  } catch {
    return await callGemini(model, photoUrl, context, true);
  }
}
