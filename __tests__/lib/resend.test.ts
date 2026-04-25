import { sendRewardEmail } from '@/lib/resend';

global.fetch = jest.fn();

describe('sendRewardEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
  });

  it('posts to Resend with correct headers and body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    await sendRewardEmail('sarah@example.com', 'Sarah', 'Free Class');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      })
    );

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.to).toEqual(['sarah@example.com']);
    expect(body.subject).toBe('You earned a reward! 🎉');
    expect(body.html).toContain('Sarah');
    expect(body.html).toContain('Free Class');
  });

  it('throws if Resend returns non-2xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 422 });

    await expect(
      sendRewardEmail('bad@example.com', 'Bob', 'Free Class')
    ).rejects.toThrow('Resend API error: 422');
  });
});
