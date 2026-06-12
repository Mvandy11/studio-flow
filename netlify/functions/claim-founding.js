import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { session_id } = JSON.parse(event.body);
    if (!session_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return { statusCode: 402, body: JSON.stringify({ error: 'Payment not complete' }) };
    }

    const email = session.customer_details?.email;
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'No email found' }) };

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
      is_founding: true,
      stripe_customer_id: session.customer,
      joined_at: new Date().toISOString(),
    });

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true, email }) };
  } catch (err) {
    console.error('claim-founding error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
