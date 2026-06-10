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

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const stripeCustomerId = session.customer;

    if (!email) {
      console.error('No email found in session:', session.id);
      return { statusCode: 400, body: 'No email in session' };
    }

    return await provisionFoundingMember({ email, stripeCustomerId });
  }

  if (stripeEvent.type === 'customer.subscription.created') {
    const subscription = stripeEvent.data.object;

    if (subscription.status !== 'trialing') {
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    let email;
    let stripeCustomerId;
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      email = customer.email;
      stripeCustomerId = customer.id;
    } catch (err) {
      console.error('Error retrieving Stripe customer:', err.message);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }

    if (!email) {
      console.error('No email on Stripe customer:', subscription.customer);
      return { statusCode: 400, body: 'No email on customer' };
    }

    return await provisionFoundingMember({ email, stripeCustomerId });
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function provisionFoundingMember({ email, stripeCustomerId }) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error: authError } = await supabase.auth.admin.createUser({
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
      { email, role: 'founding', badge: 'founding_member', stripe_customer_id: stripeCustomerId, joined_at: new Date().toISOString() },
      { onConflict: 'email' }
    );

  if (memberError) {
    console.error('Error inserting member row:', memberError.message);
    return { statusCode: 500, body: JSON.stringify({ error: memberError.message }) };
  }

  const { data: userList } = await supabase.auth.admin.listUsers();
  const authUser = userList?.users?.find((u) => u.email === email);

  if (authUser) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          email,
          stripe_customer_id: stripeCustomerId,
          is_founding_member: true,
          membership_tier: 'founding',
          membership_active: true,
          membership_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    if (profileError) console.error('Profile update error:', profileError.message);
  }

  console.log('Founding member provisioned:', email);
  return { statusCode: 200, body: JSON.stringify({ success: true, email }) };
}
