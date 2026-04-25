import { GoogleGenerativeAI } from '@google/generative-ai';

export type GroupTarget = {
  group: string;
  platform: 'facebook' | 'reddit' | 'nextdoor';
  reason: string;
};

const SYSTEM_PROMPT = `You are a local marketing expert. Given a business description,
return exactly 8-10 relevant online communities where this business should advertise.
Return ONLY valid JSON — no markdown, no explanation.

Format:
[
  {"group": "<group name>", "platform": "<facebook|reddit|nextdoor>", "reason": "<why this community>"},
  ...
]

Include a mix of Facebook groups, subreddits (prefix with r/), and Nextdoor communities.`;

function buildPrompt(params: {
  businessName: string;
  adGoal: string;
  tone: string;
  location?: string;
  strict?: boolean;
}): string {
  const strictNote = params.strict
    ? ' IMPORTANT: Return ONLY a JSON array, nothing else.'
    : '';
  const locationLine = params.location ? `\nLocation: ${params.location}` : '';
  return `Business: ${params.businessName}${locationLine}
Goal: ${params.adGoal}
Tone: ${params.tone}
Find the top 8-10 online communities (Facebook groups, subreddits, Nextdoor) where this business should advertise. Prioritize location-specific groups if a location is provided.${strictNote}`;
}

async function callGemini(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  params: { businessName: string; adGoal: string; tone: string; location?: string },
  strict = false
): Promise<GroupTarget[]> {
  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: buildPrompt({ ...params, strict }) },
  ]);

  const text = result.response.text().trim();
  const json = text.startsWith('[') ? text : text.slice(text.indexOf('['));
  return JSON.parse(json) as GroupTarget[];
}

export async function discoverGroups(params: {
  businessName: string;
  adGoal: string;
  tone: string;
  location?: string;
}): Promise<GroupTarget[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  try {
    return await callGemini(model, params);
  } catch {
    return await callGemini(model, params, true);
  }
}
