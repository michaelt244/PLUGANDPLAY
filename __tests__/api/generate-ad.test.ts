import { POST } from '@/app/api/generate-ad/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-campaign-id' },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
  uploadPhoto: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));

jest.mock('@/lib/claude', () => ({
  generateAdVariants: jest.fn().mockResolvedValue([
    { label: 'A', copy: 'Level up! 💪', platform: 'instagram' },
    { label: 'B', copy: 'Hey community!', platform: 'facebook' },
    { label: 'C', copy: '20% off now.', platform: 'google_business' },
  ]),
}));

describe('POST /api/generate-ad', () => {
  it('returns campaign_id and 3 variants', async () => {
    const formData = new FormData();
    formData.append('photo', new File(['image data'], 'photo.jpg', { type: 'image/jpeg' }));
    formData.append('business_name', 'Wild & The Barre');
    formData.append('ad_goal', 'summer promo');
    formData.append('tone', 'energetic');

    const request = new NextRequest('http://localhost/api/generate-ad', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaign_id).toBe('test-campaign-id');
    expect(body.variants).toHaveLength(3);
  });

  it('returns 400 if photo is missing', async () => {
    const formData = new FormData();
    formData.append('business_name', 'Wild & The Barre');
    formData.append('ad_goal', 'promo');
    formData.append('tone', 'energetic');

    const request = new NextRequest('http://localhost/api/generate-ad', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
