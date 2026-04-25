import { generateAdVariants } from '@/lib/claude';

const mockVariants = [
  { label: 'A', copy: 'Level up! 💪 Join Wild & The Barre — first class free.', platform: 'instagram' },
  { label: 'B', copy: 'Hey Redwood City! Summer special at Wild & The Barre.', platform: 'facebook' },
  { label: 'C', copy: 'Summer Barre Special: 20% off first month. Book now.', platform: 'google_business' },
];

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: { text: () => JSON.stringify(mockVariants) },
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// Mock fetch for photo download
global.fetch = jest.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(Buffer.from('fake-image')),
  headers: { get: () => 'image/jpeg' },
} as unknown as Response);

describe('generateAdVariants', () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

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

  it('retries once with stricter prompt if Gemini returns malformed JSON', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => 'not json' } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(mockVariants) } });

    const variants = await generateAdVariants({
      photoUrl: 'https://example.com/photo.jpg',
      businessName: 'Test Biz',
      adGoal: 'promo',
      tone: 'professional',
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(variants).toHaveLength(3);
  });
});
