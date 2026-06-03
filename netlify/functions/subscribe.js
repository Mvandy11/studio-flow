exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { name, email, plan } = JSON.parse(event.body || '{}');

  if (!name || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Michael @ Studio Flow <michael@studioflow.club>',
      to: email,
      subject: "You're in — Welcome to Studio Flow, Founding Member 🎉",
      html: `
        <h2>Welcome aboard, ${name}!</h2>
        <p>You've secured your spot as a Studio Flow Founding Member on the <strong>${plan}</strong> plan.</p>
        <p>We'll be in touch soon with everything you need to get started.</p>
        <p>— Michael</p>
      `,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    return { statusCode: 500, body: JSON.stringify({ error }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
