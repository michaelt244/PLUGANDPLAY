import Anthropic from '@anthropic-ai/sdk';
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

async function callClaude(
  photoUrl: string,
  params: { businessName: string; adGoal: string; tone: string },
  strict = false
): Promise<AdVariant[]> {
  const client = new Anthropic();

  // Anthropic API requires base64-encoded images, not URLs
  const imageResp = await fetch(photoUrl);
  const imageBuffer = await imageResp.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString('base64');
  const mimeType = (imageResp.headers.get('content-type') ?? 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: buildUserPrompt({ ...params, strict }),
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text block');
  }

  const text = textBlock.text.trim();
  const json = text.startsWith('[') ? text : text.slice(text.indexOf('['));
  return JSON.parse(json) as AdVariant[];
}

export async function generateAdVariants(params: {
  photoUrl: string;
  businessName: string;
  adGoal: string;
  tone: 'energetic' | 'professional' | 'warm';
}): Promise<AdVariant[]> {
  const { photoUrl, ...context } = params;
  try {
    return await callClaude(photoUrl, context);
  } catch {
    return await callClaude(photoUrl, context, true);
  }
}
