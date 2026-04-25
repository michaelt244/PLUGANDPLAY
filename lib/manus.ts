export type Platform = 'facebook' | 'instagram' | 'google_business';
export type DispatchStatus = 'posted' | 'failed' | 'pending';

const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google_business: 'Google Business Profile',
};

export async function dispatchToManus(params: {
  platform: Platform;
  copy: string;
  photoUrl: string;
}): Promise<DispatchStatus> {
  const apiKey = process.env.MANUS_API_KEY;
  const label = PLATFORM_LABEL[params.platform];

  const prompt = `Post the following ad to the business's ${label} account.

Photo: ${params.photoUrl}

Ad copy:
${params.copy}

Please post this as a new post/update on ${label} using the photo and copy above.`;

  try {
    const response = await fetch('https://api.manus.ai/v2/task.create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-manus-api-key': apiKey!,
      },
      body: JSON.stringify({
        message: {
          content: [{ type: 'text', text: prompt }],
        },
        agent_profile: 'manus-1.6',
        title: `Post to ${label}`,
      }),
    });

    if (!response.ok) return 'failed';
    const data = await response.json();
    if (!data.ok) return 'failed';

    // Manus task created — agent is autonomously executing the post
    return 'posted';
  } catch {
    return 'failed';
  }
}
