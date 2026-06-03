const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { name, email, plan } = JSON.parse(event.body || '{}');

  if (!name || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  try {
    await resend.emails.send({
      from: 'Michael @ Studio Flow <michael@studioflow.club>',
      to: email,
      subject: "You're in — Welcome to Studio Flow, Founding Member 🎉",
      html: `
        <h2>Welcome aboard, ${name}!</h2>
        <p>You've secured your spot as a Studio Flow Founding Member on the <strong>${plan}</strong> plan.</p>
        <p>We'll be in touch soon with everything you need to get started.</p>
        <p>— Michael</p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
