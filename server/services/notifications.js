import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

function configured(value) {
  return Boolean(value && String(value).trim());
}

export async function notifyWatchHit({ hit, watch, profile }) {
  const message = `${watch.name}: ${hit.airline} ${hit.route} ${hit.cabin} ${hit.currency || 'USD'} ${hit.premiumFare}. Coach reimbursed ${hit.coachReimbursed ?? 'unknown'}, your out-of-pocket ${hit.outOfPocket ?? 'unknown'}.`;

  console.log(`[NOTIFY_STUB] ${message}`);

  const channels = profile?.notifyChannels || {};
  const sends = [];
  const usedChannels = ['console'];

  if (channels.email && configured(process.env.GMAIL_USER) && configured(process.env.GMAIL_APP_PASSWORD)) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    sends.push(transporter.sendMail({
      from: `"${process.env.GMAIL_FROM_NAME || 'Business Travel OS'}" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL_TO || process.env.GMAIL_USER,
      subject: `Business Travel OS fare hit: ${watch.name}`,
      text: message,
    }));
    usedChannels.push('gmail');
  } else if (channels.email && configured(process.env.RESEND_API_KEY) && configured(process.env.NOTIFY_EMAIL_TO)) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    sends.push(resend.emails.send({
      from: process.env.RESEND_FROM || 'Travel Buddy <alerts@example.com>',
      to: process.env.NOTIFY_EMAIL_TO,
      subject: `Business Travel OS fare hit: ${watch.name}`,
      text: message,
    }));
    usedChannels.push('resend');
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
    usedChannels.push('twilio');
  }

  if (channels.slack && configured(process.env.SLACK_WEBHOOK_URL)) {
    sends.push(fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    }));
    usedChannels.push('slack');
  }

  await Promise.allSettled(sends);
  return { sent: sends.length > 0, channels: usedChannels };
}
