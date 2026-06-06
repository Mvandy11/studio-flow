import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SLACK_INVITE_URL =
  'https://join.slack.com/t/studio-flow-group/shared_invite/zt-3zr9bawir-2r7RV_q~pmzGfe5SlKeGNg';

function buildWelcomeEmail(name: string | null): string {
  const greeting = name ? `Hey ${name}` : 'Hey there';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Studio Flow</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0F;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#F5C842;letter-spacing:-0.5px;">Studio Flow</span>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background:#12121A;border-radius:16px;border:1px solid rgba(255,255,255,0.07);padding:48px 40px;">

              <!-- Badge -->
              <p style="margin:0 0 24px 0;text-align:center;">
                <span style="display:inline-block;background:#F5C842;color:#0A0A0F;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 16px;border-radius:100px;">
                  👑 Founding Member
                </span>
              </p>

              <!-- Heading -->
              <h1 style="margin:0 0 16px 0;font-size:28px;font-weight:800;color:#FFFFFF;text-align:center;line-height:1.25;">
                ${greeting} — You're officially in. 🎉
              </h1>

              <!-- Subheading -->
              <p style="margin:0 0 32px 0;font-size:16px;color:#9CA3AF;text-align:center;line-height:1.6;">
                You've locked in your <strong style="color:#F5C842;">Founding Member</strong> status and your
                <strong style="color:#F5C842;">$25/mo lifetime rate</strong>. That price never changes — ever.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 32px 0;" />

              <!-- Account setup notice -->
              <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#FFFFFF;">
                Your account is being set up
              </h2>
              <p style="margin:0 0 32px 0;font-size:15px;color:#9CA3AF;line-height:1.6;">
                We're creating your Studio Flow account right now. You'll receive a
                <strong style="color:#E5E7EB;">second email shortly</strong> with a link to set your password
                and access the platform.
              </p>

              <!-- Slack CTA -->
              <p style="margin:0 0 12px 0;font-size:15px;color:#9CA3AF;line-height:1.6;">
                While you wait — join your fellow founding members in our private Slack community:
              </p>
              <p style="margin:0 0 32px 0;text-align:center;">
                <a href="${SLACK_INVITE_URL}"
                   style="display:inline-block;background:#F5C842;color:#0A0A0F;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;">
                  🔗 Join the Founding Member Slack
                </a>
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 32px 0;" />

              <!-- Perks -->
              <h2 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#FFFFFF;">
                Your founding perks — locked in forever
              </h2>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#D1D5DB;">
                    <span style="color:#F5C842;margin-right:10px;">✦</span>
                    <strong style="color:#FFFFFF;">Founding Member badge</strong> — displayed on your public profile
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#D1D5DB;">
                    <span style="color:#F5C842;margin-right:10px;">✦</span>
                    <strong style="color:#FFFFFF;">Lifetime rate lock</strong> — $25/mo no matter what we charge later
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#D1D5DB;">
                    <span style="color:#F5C842;margin-right:10px;">✦</span>
                    <strong style="color:#FFFFFF;">Early access</strong> — every new feature before anyone else
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#D1D5DB;">
                    <span style="color:#F5C842;margin-right:10px;">✦</span>
                    <strong style="color:#FFFFFF;">Contest & event pool</strong> — $20/mo of your membership funds prize and payout pools
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#D1D5DB;">
                    <span style="color:#F5C842;margin-right:10px;">✦</span>
                    <strong style="color:#FFFFFF;">Earnings boost</strong> — priority consideration for creator earning opportunities
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:32px 0;" />

              <!-- Sign off -->
              <p style="margin:0;font-size:15px;color:#9CA3AF;line-height:1.6;">
                Welcome to the founding crew. This is just the beginning.<br /><br />
                <strong style="color:#FFFFFF;">— The Studio Flow Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4B5563;">
                Studio Flow · hello@studioflow.club
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;color:#374151;">
                © 2026 Studio Flow. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendWelcomeEmail(
  to: string,
  name: string | null,
  resendApiKey: string
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Studio Flow <hello@studioflow.club>',
      to,
      subject: "Welcome to Studio Flow — You're In, Founding Member 🎉",
      html: buildWelcomeEmail(name),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Webhook signature verification failed:', msg);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  const email =
    session.customer_details?.email ?? session.customer_email ?? null;
  const name = session.customer_details?.name ?? null;
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : null;

  if (!email) {
    console.error('No email found in session:', session.id);
    return new Response('No email in session', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Create auth user (ignore "already registered" errors)
  const { error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authError && !authError.message.includes('already registered')) {
    console.error('Error creating auth user:', authError.message);
    return new Response(JSON.stringify({ error: authError.message }), {
      status: 500,
    });
  }

  // Insert into members table
  const { error: memberError } = await supabase.from('members').upsert(
    {
      email,
      role: 'founding',
      badge: 'founding_member',
      stripe_customer_id: stripeCustomerId,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );

  if (memberError) {
    console.error('Error inserting member row:', memberError.message);
    return new Response(JSON.stringify({ error: memberError.message }), {
      status: 500,
    });
  }

  console.log('Founding member created:', email);

  // Send welcome email — non-blocking: log failure but still return 200
  if (resendApiKey) {
    try {
      await sendWelcomeEmail(email, name, resendApiKey);
      console.log('Welcome email sent to:', email);
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error('Failed to send welcome email:', msg);
    }
  } else {
    console.warn('RESEND_API_KEY not set — welcome email skipped');
  }

  return new Response(JSON.stringify({ success: true, email }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
