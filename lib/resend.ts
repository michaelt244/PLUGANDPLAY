import { Resend } from 'resend';

const FROM = 'onboarding@resend.dev';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY');
  }

  return new Resend(apiKey);
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  businessName?: string
): Promise<void> {
  const businessLine = businessName
    ? `<p>We've personalized Kinetiq for <strong>${businessName}</strong>. You're ready to create your first AI-powered ad.</p>`
    : '<p>You\'re ready to create your first AI-powered ad.</p>';

  await send(
    to,
    'Welcome to Kinetiq 🎉',
    `<p>Hi ${firstName},</p>
<p>Welcome aboard! Your Kinetiq account is ready.</p>
${businessLine}
<p>Head back to the app and click <strong>Create Ad</strong> to get started.</p>
<p>— The Kinetiq Team</p>`
  );
}

export async function sendRewardEmail(
  to: string,
  firstName: string,
  rewardName: string
): Promise<void> {
  await send(
    to,
    'You earned a reward! 🎉',
    `<p>Hi ${firstName},</p>
<p>Congratulations! You've just earned: <strong>${rewardName}</strong></p>
<p>Keep coming back — your loyalty means everything to us.</p>
<p>— The Kinetiq Team</p>`
  );
}

export async function sendStreakRewardEmail(
  to: string,
  firstName: string,
  streakDays: number
): Promise<void> {
  await send(
    to,
    `${streakDays}-day streak — here's your reward! 🔥`,
    `<p>Hi ${firstName},</p>
<p>You've checked in <strong>${streakDays} days in a row</strong> — that's incredible!</p>
<p>As a thank-you, here's <strong>10% off your next visit</strong>. Show this email at the front desk.</p>
<p>Keep the streak alive — we'll have another surprise waiting for you.</p>
<p>— The Kinetiq Team</p>`
  );
}

export async function sendNoShowEmail(
  to: string,
  firstName: string,
  daysMissed: number
): Promise<void> {
  await send(
    to,
    `We miss you, ${firstName} 👋`,
    `<p>Hi ${firstName},</p>
<p>It's been ${daysMissed} day${daysMissed !== 1 ? 's' : ''} since your last visit — we miss you!</p>
<p>Come back in and enjoy <strong>10% off</strong> your next class or purchase. No code needed — just mention this email.</p>
<p>We'd love to see you again.</p>
<p>— The Kinetiq Team</p>`
  );
}
