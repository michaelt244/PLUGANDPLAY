import { POST } from '@/app/api/generate-image/route';
import { NextRequest } from 'next/server';

const PUBLIC_URL = 'https://supabase.example.com/storage/v1/object/public/campaign-photos/generated/test.png';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: {
            publicUrl:
              'https://supabase.example.com/storage/v1/object/public/campaign-photos/generated/test.png',
          },
        }),
      }),
    },
  },
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({
    predictions: [{ bytesBase64Encoded: Buffer.from('fake-image').toString('base64') }],
  }),
} as unknown as Response);

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate-image', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ businessName: 'Test' }));
    expect(res.status).toBe(400);
  });

  it('returns imageUrl on success', async () => {
    const res = await POST(makeRequest({
      businessName: 'Wild & The Barre',
      adGoal: 'Promote yoga classes',
      tone: 'energetic',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toBe(PUBLIC_URL);
  });
});
