export type Platform = 'facebook' | 'instagram' | 'google_business';
export type DispatchStatus = 'posted' | 'failed' | 'pending';

// Manus endpoint — verify field names with Manus docs before demo
export async function dispatchToManus(params: {
  platform: Platform;
  copy: string;
  photoUrl: string;
}): Promise<DispatchStatus> {
  const apiUrl = process.env.MANUS_API_URL;
  const apiKey = process.env.MANUS_API_KEY;

  try {
    const response = await fetch(`${apiUrl}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        platform: params.platform,
        copy: params.copy,
        photo_url: params.photoUrl,
      }),
    });

    if (!response.ok) return 'failed';
    return 'posted';
  } catch {
    return 'failed';
  }
}
