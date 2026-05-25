import { Resend } from 'resend';
import twilio from 'twilio';

function configured(value) {
  return Boolean(value && String(value).trim());
}

export async function notifyWatchHit({ hit, watch, profile }) {
  const message = `${watch.name}: ${hit.airline} ${hit.route} ${hit.cabin} ${hit.currency || 'USD'} ${hit.premiumFare}. Coach reimbursed ${hit.coachReimbursed ?? 'unknown'}, your out-of-pocket ${hit.outOfPocket ?? 'unknown'}.`;

  console.log(`[NOTIFY_STUB] ${message}`);

  if (process.env.ENABLE_REAL_NOTIFICATIONS !== 'true') {
    return { sent: false, channel: 'console', reason: 'v1 stub' };
  }

  const channels = profile?.notifyChannels || {};
  const sends = [];

  if (channels.email && configured(process.env.RESEND_API_KEY) && configured(process.env.NOTIFY_EMAIL_TO)) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    sends.push(resend.emails.send({
      from: process.env.RESEND_FROM || 'Travel Buddy <alerts@example.com>',
      to: process.env.NOTIFY_EMAIL_TO,
      subject: `Business Travel OS fare hit: ${watch.name}`,
      text: message,
    }));
  }

  if (
    channels.sms &&
    configured(process.env.TWILIO_ACCOUNT_SID) &&
    configured(process.env.TWILIO_AUTH_TOKEN) &&
    configured(process.env.TWILIO_FROM_NUMBER) &&
    configured(process.env.NOTIFY_SMS_TO)
  ) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    sends.push(client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.NOTIFY_SMS_TO,
      body: message,
    }));
  }

  await Promise.allSettled(sends);
  return { sent: sends.length > 0, channel: sends.length ? 'configured' : 'console' };
}
