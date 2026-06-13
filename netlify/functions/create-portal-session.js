import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { customer_id } = JSON.parse(event.body);
    if (!customer_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing customer_id' }) };
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: 'https://www.studioflow.club/',
    });
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Portal session error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
