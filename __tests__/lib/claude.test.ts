import { generateAdVariants } from '@/lib/claude';

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify([
                { label: 'A', copy: 'Level up! 💪 Join Wild & The Barre — first class free.', platform: 'instagram' },
                { label: 'B', copy: 'Hey Redwood City! Summer special at Wild & The Barre.', platform: 'facebook' },
                { label: 'C', copy: 'Summer Barre Special: 20% off first month. Book now.', platform: 'google_business' },
              ]),
            },
          ],
        }),
      },
    })),
  };
});

describe('generateAdVariants', () => {
  it('returns 3 variants with label, copy, platform', async () => {
    const variants = await generateAdVariants({
      photoUrl: 'https://example.com/photo.jpg',
      businessName: 'Wild & The Barre',
      adGoal: 'summer class promo',
      tone: 'energetic',
    });

    expect(variants).toHaveLength(3);
    expect(variants[0]).toEqual({
      label: 'A',
      copy: expect.any(String),
      platform: 'instagram',
    });
    expect(variants[1].platform).toBe('facebook');
    expect(variants[2].platform).toBe('google_business');
  });

  it('retries once with stricter prompt if Claude returns malformed JSON', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const mockCreate = jest.fn()
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] })
      .mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify([
            { label: 'A', copy: 'Fixed copy', platform: 'instagram' },
            { label: 'B', copy: 'Fixed copy B', platform: 'facebook' },
            { label: 'C', copy: 'Fixed copy C', platform: 'google_business' },
          ]),
        }],
      });
    (Anthropic as jest.Mock).mockImplementationOnce(() => ({
      messages: { create: mockCreate },
    }));

    const variants = await generateAdVariants({
      photoUrl: 'https://example.com/photo.jpg',
      businessName: 'Test Biz',
      adGoal: 'promo',
      tone: 'professional',
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(variants).toHaveLength(3);
  });
});
