const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const session = stripeEvent.data.object;
  const email = session.customer_details?.email || session.customer_email;
  const stripeCustomerId = session.customer;

  if (!email) {
    console.error('No email found in session:', session.id);
    return { statusCode: 400, body: 'No email in session' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authError && authError.message !== 'User already registered') {
    console.error('Error creating auth user:', authError.message);
    return { statusCode: 500, body: JSON.stringify({ error: authError.message }) };
  }

  const { error: memberError } = await supabase
    .from('members')
    .upsert(
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
    return { statusCode: 500, body: JSON.stringify({ error: memberError.message }) };
  }

  console.log('Founding member created:', email);
  return { statusCode: 200, body: JSON.stringify({ success: true, email }) };
};
