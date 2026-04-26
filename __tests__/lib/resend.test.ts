const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: sendMock,
    },
  })),
}));

import { Resend } from 'resend';
import { sendRewardEmail } from '@/lib/resend';

describe('sendRewardEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    sendMock.mockReset();
  });

  it('sends the expected email payload through the Resend SDK', async () => {
    sendMock.mockResolvedValueOnce({ id: 'email_123' });

    await sendRewardEmail('sarah@example.com', 'Sarah', 'Free Class');

    expect(Resend).toHaveBeenCalledWith('test-key');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'onboarding@resend.dev',
        to: 'sarah@example.com',
        subject: 'You earned a reward! 🎉',
        html: expect.stringContaining('Sarah'),
      })
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Free Class'),
      })
    );
  });

  it('throws if the API key is missing', async () => {
    delete process.env.RESEND_API_KEY;

    await expect(
      sendRewardEmail('bad@example.com', 'Bob', 'Free Class')
    ).rejects.toThrow('Missing RESEND_API_KEY');
  });

  it('bubbles up SDK send failures', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend API error: 422'));

    await expect(
      sendRewardEmail('bad@example.com', 'Bob', 'Free Class')
    ).rejects.toThrow('Resend API error: 422');
  });
});
