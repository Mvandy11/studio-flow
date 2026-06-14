import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Auto-detect test vs live session and use correct key
    const rawBody = event.body;
    const isTestSession = rawBody?.includes('"cs_test_') || rawBody?.includes("'cs_test_");
    const stripe = new Stripe(
      isTestSession
        ? process.env.STRIPE_TEST_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY
    );

    const { session_id } = JSON.parse(event.body);
    if (!session_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return { statusCode: 402, body: JSON.stringify({ error: 'Payment not complete' }) };
    }

    const email = session.customer_details?.email;
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'No email found' }) };

    const displayName = session.customer_details?.name ?? email.split('@')[0];

    // Check if already claimed
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return { statusCode: 200, body: JSON.stringify({ message: 'Already a founding member' }) };
    }

    // Check spots remaining
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_founding', true);

    if (count >= 100) {
      return { statusCode: 410, body: JSON.stringify({ error: 'All spots claimed' }) };
    }

    // Write to members table
    const { error } = await supabase.from('members').insert({
      email,
      display_name: displayName,
      is_founding: true,
      badge: 'founding_member',
      stripe_customer_id: session.customer,
      joined_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Notify Studio Flow of new founding member
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Studio Flow <noreply@studioflow.club>',
        to: ['obviouslyinspiredstudio@outlook.com'],
        subject: `🔥 Founding Spot #${count + 1} Claimed — ${displayName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#fff;padding:32px;border-radius:16px;">
            <h2 style="color:#ffb800;margin:0 0 4px 0;">🏅 New Founding Member!</h2>
            <p style="color:#94a3b8;margin:0 0 24px 0;">Someone just locked in a founding spot on Studio Flow.</p>
            <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;">
              <p style="margin:0 0 10px 0;"><strong style="color:#ffb800;">Name:</strong> <span style="color:#e2e8f0;">${displayName}</span></p>
              <p style="margin:0 0 10px 0;"><strong style="color:#ffb800;">Email:</strong> <span style="color:#e2e8f0;">${email}</span></p>
              <p style="margin:0 0 10px 0;"><strong style="color:#ffb800;">Spot:</strong> <span style="color:#e2e8f0;">#${count + 1} of 100</span></p>
              <p style="margin:0;"><strong style="color:#ffb800;">Spots Remaining:</strong> <span style="color:#e2e8f0;">${99 - count}</span></p>
            </div>
            <p style="color:#64748b;font-size:0.8rem;margin:0;">Claimed at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })} ET</p>
          </div>
        `,
      }),
    }).catch(err => console.error('Resend notification error:', err.message));

    return { statusCode: 200, body: JSON.stringify({ success: true, email }) };
  } catch (err) {
    console.error('claim-founding error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
