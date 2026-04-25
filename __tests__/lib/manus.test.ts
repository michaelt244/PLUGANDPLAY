import { dispatchToManus } from '@/lib/manus';

global.fetch = jest.fn();

describe('dispatchToManus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.MANUS_API_KEY = 'test-key';
  });

  it('posts to facebook and returns posted status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, task_id: 'task-123' }),
    });

    const result = await dispatchToManus({
      platform: 'facebook',
      copy: 'Hey Redwood City! Summer special.',
      photoUrl: 'https://example.com/photo.jpg',
    });

    expect(result).toBe('posted');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.manus.ai/v2/task.create',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-manus-api-key': 'test-key',
        }),
      })
    );
  });

  it('returns failed if Manus API returns non-ok HTTP status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'unauthorized' }),
    });

    const result = await dispatchToManus({
      platform: 'instagram',
      copy: 'Level up! 💪',
      photoUrl: 'https://example.com/photo.jpg',
    });

    expect(result).toBe('failed');
  });

  it('returns failed if fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    const result = await dispatchToManus({
      platform: 'google_business',
      copy: '20% off first month.',
      photoUrl: 'https://example.com/photo.jpg',
    });

    expect(result).toBe('failed');
  });
});
