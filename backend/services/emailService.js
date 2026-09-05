/**
 * Email Service using Resend (https://resend.com)
 * Free tier: 3,000 emails/month, no domain verification needed for testing.
 *
 * Setup (one-time, 2 minutes):
 *   1. Go to https://resend.com → Sign up free
 *   2. Dashboard → API Keys → Create API Key → copy it
 *   3. Add to Render env: RESEND_API_KEY=re_xxxxxxxxxxxx
 *
 * Note: On free tier, sender must be onboarding@resend.dev
 * To use your own domain, verify it in Resend dashboard.
 */

import { Resend } from 'resend';

const NOTIFY_EMAIL = 'aibharath07@gmail.com';

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('⚠️ RESEND_API_KEY not set — email notifications disabled');
    return null;
  }
  return new Resend(key);
}

export async function sendFeedbackEmail({ userName, userEmail, userType, rating, category, message }) {
  const client = getClient();
  if (!client) return false;

  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

  try {
    await client.emails.send({
      from: 'One Community Ely Feedback <onboarding@resend.dev>',
      to: NOTIFY_EMAIL,
      subject: `[One Community Ely] ${stars} ${category} feedback from ${userName}`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#F5FAEF;padding:24px;border-radius:12px;">
  <div style="background:linear-gradient(135deg,#23735F,#289B8C);border-radius:10px;padding:20px 24px;color:white;margin-bottom:20px;">
    <h2 style="margin:0;font-size:20px;">📬 New Feedback — One Community Ely</h2>
    <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">${stars} ${rating}/5 · ${category}</p>
  </div>
  <div style="background:white;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:100px;">From</td><td style="font-weight:700;color:#1a1a2e;">${userName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="color:#1a1a2e;">${userEmail}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Role</td><td style="color:#1a1a2e;text-transform:capitalize;">${userType}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Category</td><td style="color:#1a1a2e;">${category}</td></tr>
    </table>
  </div>
  <div style="background:white;border-radius:10px;padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;">Message</p>
    <p style="margin:0;font-size:15px;color:#1a1a2e;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p>
  </div>
  <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px;">One Community Ely · Online Training Centre</p>
</div>`,
    });
    console.log(`✅ Feedback email sent to ${NOTIFY_EMAIL}`);
    return true;
  } catch (err) {
    console.error('⚠️ Email send failed (non-fatal):', err.message);
    return false;
  }
}
