/**
 * Membership routes — mounted at /api/membership
 *
 * POST /api/membership/activate  — called after Stripe Payment Link success
 * POST /api/membership/cancel    — member-initiated cancellation request
 */

import { Router }     from 'express';
import nodemailer     from 'nodemailer';
import { supabase } from '../supabase/client.js';
import { supabase as supabaseAdmin } from '../supabase/client.js';
import { logError }   from '../utils/logError.js';

const router = Router();

const VALID_TIERS = new Set(['member_30', 'creator_50']);
const POOL_CONTRIBUTIONS = {
  member_30:  { rewardPool: 10, eventCreatorPool: 0  },
  creator_50: { rewardPool: 10, eventCreatorPool: 15 },
};

const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';

// ── Nodemailer transporter (Outlook SMTP) ──────────────────────────────────
function makeTransporter() {
  return nodemailer.createTransport({
    host:   'smtp.office365.com',
    port:   587,
    secure: false,
    auth: {
      user: process.env.OUTLOOK_EMAIL,        // add to Render env vars
      pass: process.env.OUTLOOK_APP_PASSWORD, // Microsoft app password
    },
    tls: { ciphers: 'SSLv3' },
  });
}

// ── POST /api/membership/activate ─────────────────────────────────────────
router.post('/activate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return res.status(401).json({ error: 'Authentication required.' });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

    const { tier } = req.body || {};
    let payload;

    if (tier && VALID_TIERS.has(tier)) {
      payload = {
        membership_active:     true,
        membership_tier:       tier,
        membership_started_at: new Date().toISOString(),
        subscription_active:   true,
      };
    } else {
      payload = {
        membership_active: false,
        membership_tier:   'free',
      };
    }

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', user.id);
    if (updateErr) throw updateErr;

    if (tier && VALID_TIERS.has(tier)) {
      const { rewardPool, eventCreatorPool } = POOL_CONTRIBUTIONS[tier];
      await supabaseAdmin.from('reward_pool_contributions').insert({
        user_id: user.id, amount: rewardPool, tier,
      }).maybeSingle();
      if (eventCreatorPool > 0) {
        await supabaseAdmin.from('event_creator_pool_contributions').insert({
          user_id: user.id, amount: eventCreatorPool, tier,
        }).maybeSingle();
      }
    }

    res.json({ success: true, tier: payload.membership_tier });
  } catch (err) {
    await logError(err, '/api/membership/activate');
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/membership/cancel ────────────────────────────────────────────
router.post('/cancel', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return res.status(401).json({ error: 'Authentication required.' });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

    // Fetch profile for email + tier details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, membership_tier, membership_started_at')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // ── Immediately deactivate in Supabase ────────────────────────────────
    await supabaseAdmin
      .from('profiles')
      .update({
        membership_active:      false,
        membership_tier:        'free',
        subscription_active:    false,
        membership_cancelled_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    console.log(`[membership/cancel] Deactivated membership for user ${user.id} (${profile.email})`);

    // ── Send notification email to admin ──────────────────────────────────
    if (process.env.OUTLOOK_EMAIL && process.env.OUTLOOK_APP_PASSWORD) {
      try {
        const transporter = makeTransporter();
        const tierLabel = profile.membership_tier === 'creator_50'
          ? '$50 Creator Member'
          : profile.membership_tier === 'member_30'
          ? '$30 Member'
          : profile.membership_tier;

        await transporter.sendMail({
          from:    `"Studio Flow" <${process.env.OUTLOOK_EMAIL}>`,
          to:      ADMIN_EMAIL,
          subject: `⚠️ Membership Cancellation Request — ${profile.username || profile.email}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0f0f12;color:#e5e5e5;border-radius:12px">
              <h2 style="color:#f5a623;margin-top:0">Membership Cancellation</h2>
              <p>A member has cancelled their Studio Flow membership.</p>
              <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-top:16px">
                <tr><td style="padding:8px 0;color:#999;width:140px">Member ID</td><td style="padding:8px 0;font-family:monospace">${profile.id}</td></tr>
                <tr><td style="padding:8px 0;color:#999">Email</td><td style="padding:8px 0">${profile.email}</td></tr>
                <tr><td style="padding:8px 0;color:#999">Username</td><td style="padding:8px 0">${profile.username || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#999">Plan</td><td style="padding:8px 0">${tierLabel}</td></tr>
                <tr><td style="padding:8px 0;color:#999">Member Since</td><td style="padding:8px 0">${profile.membership_started_at ? new Date(profile.membership_started_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#999">Cancelled At</td><td style="padding:8px 0">${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</td></tr>
              </table>
              <hr style="border:1px solid #222;margin:20px 0"/>
              <p style="font-size:0.8rem;color:#555">
                Their account has been automatically set to Free tier.<br/>
                Log in to the admin dashboard to review.
              </p>
            </div>
          `,
        });
        console.log(`[membership/cancel] Notification email sent to ${ADMIN_EMAIL}`);
      } catch (emailErr) {
        // Don't fail the whole request if email fails — log and continue
        console.error('[membership/cancel] Email send failed:', emailErr.message);
        await logError(emailErr, '/api/membership/cancel [email]');
      }
    } else {
      console.warn('[membership/cancel] OUTLOOK_EMAIL / OUTLOOK_APP_PASSWORD not set — skipping email.');
    }

    res.json({ success: true, message: 'Membership cancelled.' });
  } catch (err) {
    await logError(err, '/api/membership/cancel');
    res.status(500).json({ error: err.message });
  }
});

export default router;
