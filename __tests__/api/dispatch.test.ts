import { POST } from '@/app/api/dispatch/route';
import { NextRequest } from 'next/server';

const mockCampaign = {
  id: 'test-campaign-id',
  photo_url: 'https://example.com/photo.jpg',
  variants: [
    { label: 'A', copy: 'Level up! 💪', platform: 'instagram' },
    { label: 'B', copy: 'Hey community!', platform: 'facebook' },
    { label: 'C', copy: '20% off now.', platform: 'google_business' },
  ],
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'test-campaign-id',
              photo_url: 'https://example.com/photo.jpg',
              variants: [
                { label: 'A', copy: 'Level up! 💪', platform: 'instagram' },
                { label: 'B', copy: 'Hey community!', platform: 'facebook' },
                { label: 'C', copy: '20% off now.', platform: 'google_business' },
              ],
            },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

jest.mock('@/lib/manus', () => ({
  dispatchToManus: jest.fn().mockResolvedValue('posted'),
}));

describe('POST /api/dispatch', () => {
  it('dispatches to selected platforms and returns results', async () => {
    const request = new NextRequest('http://localhost/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: 'test-campaign-id',
        selected_variant: 1,
        platforms: ['facebook', 'instagram'],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results.facebook).toBe('posted');
    expect(body.results.instagram).toBe('posted');
    expect(body.results.google_business).toBeUndefined();
  });

  it('continues dispatching other platforms if one fails', async () => {
    const { dispatchToManus } = await import('@/lib/manus');
    (dispatchToManus as jest.Mock)
      .mockResolvedValueOnce('failed')
      .mockResolvedValueOnce('posted');

    const request = new NextRequest('http://localhost/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: 'test-campaign-id',
        selected_variant: 0,
        platforms: ['facebook', 'instagram'],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.results.facebook).toBe('failed');
    expect(body.results.instagram).toBe('posted');
  });
});
