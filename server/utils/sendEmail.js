import nodemailer from 'nodemailer';

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Send an email. Fails silently if SMTP is not configured.
 *
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
export default async function sendEmail({ to, subject, text, html }) {
  const mailer = createTransport();
  if (!mailer) return; // SMTP not configured — skip silently
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
  } catch (err) {
    console.error('[sendEmail] Failed to send email:', err.message);
  }
}
