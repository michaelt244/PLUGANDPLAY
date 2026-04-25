export async function sendRewardEmail(
  to: string,
  firstName: string,
  rewardName: string
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'LocalBoost <onboarding@resend.dev>',
      to: [to],
      subject: 'You earned a reward! 🎉',
      html: `<p>Hi ${firstName},</p>
<p>Congratulations! You've just earned: <strong>${rewardName}</strong></p>
<p>Keep coming back — your loyalty means everything to us.</p>
<p>— The Team</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status}`);
  }
}
