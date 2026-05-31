const RESEND_API_KEY       = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL           = "michael@studioflow.com";

const SCHEDULE: Record<number, number> = {
  2: 4,   // email 2 sent, next in 4 days
  3: 3,   // email 3 sent, next in 3 days
  4: 4,   // email 4 sent, next in 4 days
  5: 2,   // email 5 sent, next in 2 days
  6: 999, // done
};

const SUBJECTS: Record<number, string> = {
  2: "Your $25 becomes a $1,000 prize.",
  3: "Stream. Create. Win.",
  4: "Spots are filling. Here's who's joining.",
  5: "48 hours left. Then it's $50/month.",
  6: "The founding rate is closed.",
};

Deno.serve(async () => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/founding_member_drip?next_send_at=lte.${new Date().toISOString()}&last_email_sent=lt.6&select=*`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const members = await res.json();

  for (const member of members) {
    const nextEmailNum = member.last_email_sent + 1;
    if (nextEmailNum > 6) continue;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Michael @ Studio Flow <${FROM_EMAIL}>`,
        to: [member.email],
        subject: SUBJECTS[nextEmailNum],
        html: buildEmail(nextEmailNum, member.name ?? "there"),
      }),
    });

    const nextSend = new Date();
    nextSend.setDate(nextSend.getDate() + (SCHEDULE[nextEmailNum] ?? 999));

    await fetch(`${SUPABASE_URL}/rest/v1/founding_member_drip?id=eq.${member.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        last_email_sent: nextEmailNum,
        next_send_at: nextSend.toISOString(),
      }),
    });
  }

  return new Response(`Processed ${members.length} members`, { status: 200 });
});

function buildEmail(num: number, name: string): string {
  const emails: Record<number, string> = {
    2: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7">
  <h2 style="color:#7c3aed">Here's where your money actually goes.</h2>
  <p>Hey ${name} — let me break down the math.</p>
  <p>Your $25/month → <strong>$20 goes directly to the Prize Pool</strong>. 50 founding members × $20 = <strong>$1,000/month in prizes</strong>. Every single month. No sponsor needed.</p>
  <p>Each month we run contests — photo challenges, video submissions, creative prompts. You enter your work, the community votes, winners get paid out directly.</p>
  <p>You're not just a subscriber. You're an investor in a prize pool you can win back.</p>
  <a href="https://studioflow.com" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#7c3aed;color:white;border-radius:6px;text-decoration:none;font-weight:600">Enter your first contest →</a>
  <p style="margin-top:40px">— Michael<br><span style="color:#888;font-size:14px">Founder, Studio Flow</span></p>
</div>`,

    3: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7">
  <h2 style="color:#7c3aed">The tools you've been paying for separately — bundled.</h2>
  <p>Hey ${name} — what most creators pay monthly:</p>
  <ul>
    <li>AI upscale/denoise tools: ~$20/mo</li>
    <li>Live streaming platform: ~$25/mo</li>
    <li>Community platform: ~$10/mo</li>
    <li>Online courses: ~$30/mo</li>
  </ul>
  <p>That's <strong>~$85/month</strong> for tools that don't talk to each other and don't pay you anything back.</p>
  <p>Studio Flow bundles all of it at $25/month — with $20 going into a prize pool you can actually win.</p>
  <a href="https://studioflow.com/streaming" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#7c3aed;color:white;border-radius:6px;text-decoration:none;font-weight:600">Set up your stream key →</a>
  <p style="margin-top:40px">— Michael<br><span style="color:#888;font-size:14px">Founder, Studio Flow</span></p>
</div>`,

    4: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7">
  <h2 style="color:#7c3aed">The first founding members are in.</h2>
  <p>Hey ${name} — spots are filling. Every founding member gets a permanent <strong>Founding Member badge</strong> on their profile — proof you believed in Studio Flow before it was obvious.</p>
  <p>The Prize Pool grows with every member. Who do you know that should be in here?</p>
  <a href="https://buy.stripe.com/cNi4gB8WV3JS4II3OBb7y0v" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#7c3aed;color:white;border-radius:6px;text-decoration:none;font-weight:600">Share the founding member link →</a>
  <p style="margin-top:40px">— Michael<br><span style="color:#888;font-size:14px">Founder, Studio Flow</span></p>
</div>`,

    5: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7">
  <h2 style="color:#7c3aed">48 hours. Then it's $50/month.</h2>
  <p>Hey ${name} — the founding member window closes in 48 hours. After that, new members pay $50/month. No exceptions, no extensions.</p>
  <p>If you know a creator who's been on the fence — now is the moment.</p>
  <a href="https://buy.stripe.com/cNi4gB8WV3JS4II3OBb7y0v" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f5a623;color:white;border-radius:6px;text-decoration:none;font-weight:600">Claim a founding spot — $25/mo →</a>
  <p style="margin-top:40px">— Michael<br><span style="color:#888;font-size:14px">Founder, Studio Flow</span></p>
</div>`,

    6: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7">
  <h2 style="color:#7c3aed">The founding rate is closed. You made it.</h2>
  <p>Hey ${name} — the founding member window is officially closed. You're locked in at $25/month forever.</p>
  <p>Here's what's coming in the next 30 days:</p>
  <ul>
    <li>🏆 First monthly contest drops June 15</li>
    <li>🎓 First Creator Academy course goes live June 20</li>
    <li>🎬 Community live stream event — date TBA</li>
  </ul>
  <p>Thank you for being here from the start. Let's build something worth winning.</p>
  <a href="https://studioflow.com" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#7c3aed;color:white;border-radius:6px;text-decoration:none;font-weight:600">Go to Studio Flow →</a>
  <p style="margin-top:40px">— Michael<br><span style="color:#888;font-size:14px">Founder, Studio Flow</span></p>
</div>`,
  };
  return emails[num] ?? "";
}
