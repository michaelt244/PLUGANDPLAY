import { discoverGroups } from '@/lib/scanner';

const mockGroups = [
  { group: 'Redwood City Moms', platform: 'facebook', reason: 'local parent community' },
  { group: 'r/bayareafitness', platform: 'reddit', reason: 'regional fitness audience' },
  { group: 'Redwood City', platform: 'nextdoor', reason: 'hyperlocal neighborhood' },
  { group: 'Bay Area Fitness', platform: 'facebook', reason: 'fitness enthusiasts' },
  { group: 'r/loseit', platform: 'reddit', reason: 'weight loss community' },
  { group: 'San Mateo County', platform: 'nextdoor', reason: 'county-wide reach' },
  { group: 'Redwood City Parents', platform: 'facebook', reason: 'local parents' },
  { group: 'r/xxfitness', platform: 'reddit', reason: 'women fitness community' },
];

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: { text: () => JSON.stringify(mockGroups) },
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('discoverGroups', () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

  it('returns groups with group, platform, reason', async () => {
    const groups = await discoverGroups({
      businessName: 'Wild & The Barre',
      adGoal: 'summer class promo',
      tone: 'energetic',
    });

    expect(groups).toHaveLength(8);
    expect(groups[0]).toEqual({
      group: expect.any(String),
      platform: expect.stringMatching(/^(facebook|reddit|nextdoor)$/),
      reason: expect.any(String),
    });
  });

  it('retries once with stricter prompt if Gemini returns malformed JSON', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => 'not json' } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(mockGroups) } });

    const groups = await discoverGroups({
      businessName: 'Test Biz',
      adGoal: 'promo',
      tone: 'professional',
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(groups).toHaveLength(8);
  });
});
