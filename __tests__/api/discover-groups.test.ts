import { POST } from '@/app/api/discover-groups/route';
import { NextRequest } from 'next/server';
import { discoverGroups } from '@/lib/scanner';

jest.mock('@/lib/scanner', () => ({ discoverGroups: jest.fn() }));

const mockDiscoverGroups = discoverGroups as jest.MockedFunction<typeof discoverGroups>;

const mockSingle = jest.fn();
const mockEqUpdate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: mockSingle })),
      })),
      update: jest.fn(() => ({
        eq: mockEqUpdate,
      })),
    })),
  },
}));

const mockGroups = [
  { group: 'Redwood City Moms', platform: 'facebook' as const, reason: 'local parents' },
];

const { supabase: mockSupabase } = jest.requireMock('@/lib/supabase');

describe('POST /api/discover-groups', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: mockSingle })),
      })),
      update: jest.fn(() => ({
        eq: mockEqUpdate,
      })),
    });
    mockDiscoverGroups.mockResolvedValue(mockGroups);
    mockEqUpdate.mockResolvedValue({ error: null });
  });

  it('returns groups for a valid campaign', async () => {
    mockSingle.mockResolvedValue({
      data: { business_name: 'Wild & The Barre', ad_goal: 'summer promo', tone: 'energetic' },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/discover-groups', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: 'uuid-123' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.campaign_id).toBe('uuid-123');
    expect(body.groups).toEqual(mockGroups);
  });

  it('returns 404 if campaign not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const req = new NextRequest('http://localhost/api/discover-groups', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: 'bad-uuid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
