import { POST } from '@/app/api/post-to-groups/route';
import { NextRequest } from 'next/server';

global.fetch = jest.fn();

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

describe('POST /api/post-to-groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEqUpdate.mockResolvedValue({ error: null });
    process.env.MANUS_API_KEY = 'test-key';
  });

  it('fires one Manus task per approved group and returns posted', async () => {
    mockSingle.mockResolvedValue({
      data: {
        photo_url: 'https://example.com/photo.jpg',
        variants: [{ label: 'A', copy: 'Level up! 💪 Join us.', platform: 'instagram' }],
        selected_variant: 0,
      },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, task_id: 'task-1' }),
    });

    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({
        campaign_id: 'uuid-123',
        approved_groups: [
          { group: 'Redwood City Moms', platform: 'facebook', reason: 'local' },
          { group: 'r/fitness', platform: 'reddit', reason: 'fitness' },
        ],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(body.results['Redwood City Moms']).toBe('posted');
    expect(body.results['r/fitness']).toBe('posted');
  });

  it('records failed for groups where Manus throws', async () => {
    mockSingle.mockResolvedValue({
      data: {
        photo_url: 'https://example.com/photo.jpg',
        variants: [{ label: 'A', copy: 'Level up! 💪 Join us.', platform: 'instagram' }],
        selected_variant: 0,
      },
      error: null,
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));

    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({
        campaign_id: 'uuid-123',
        approved_groups: [{ group: 'Redwood City Moms', platform: 'facebook', reason: 'local' }],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(body.results['Redwood City Moms']).toBe('failed');
  });

  it('returns empty results when no groups approved', async () => {
    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: 'uuid-123', approved_groups: [] }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toEqual({});
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 if campaign not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const req = new NextRequest('http://localhost/api/post-to-groups', {
      method: 'POST',
      body: JSON.stringify({
        campaign_id: 'bad-uuid',
        approved_groups: [{ group: 'Redwood City Moms', platform: 'facebook', reason: 'local' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
