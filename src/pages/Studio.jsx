import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import StudioSidebar from '../components/StudioSidebar';
import StudioTopbar from '../components/StudioTopbar';
import StudioSessions from './StudioSessions';

const fmt = n => `$${Number(n ?? 0).toFixed(2)}`;

export default function Studio() {
  const { user, loading: authLoading } = useAuth();
  const [section, setSection] = useState('overview');

  // ── Overview data ─────────────────────────────────────────
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    if (!user || section !== 'overview') return;
    let cancelled = false;

    async function loadOverview() {
      setOverviewLoading(true);
      const MONTH = new Date().toISOString().slice(0, 7);
      const startOfMonth = `${MONTH}-01`;

      const [earningsRes, settingsRes, donationsRes] = await Promise.allSettled([
        supabase
          .from('earnings')
          .select('amount, status, created_at')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('creator_settings')
          .select('payout_method, stripe_connect_onboarded')
          .eq('creator_id', user.id)
          .maybeSingle(),
        supabase
          .from('donations')
          .select('amount')
          .eq('creator_id', user.id)
          .gte('created_at', startOfMonth),
      ]);

      if (cancelled) return;

      const earnings  = earningsRes.status  === 'fulfilled' ? earningsRes.value.data  || [] : [];
      const settings  = settingsRes.status  === 'fulfilled' ? settingsRes.value.data  || null : null;
      const donations = donationsRes.status === 'fulfilled' ? donationsRes.value.data || [] : [];

      const pending    = earnings.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount), 0);
      const paid       = earnings.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount), 0);
      const donTotal   = donations.reduce((s, d) => s + Number(d.amount), 0);
      const hasPayoutMethod = settings?.payout_method &&
        (settings.payout_method !== 'stripe' || settings.stripe_connect_onboarded);

      setOverviewData({ pending, paid, donTotal, recent: earnings.slice(0, 5), hasPayoutMethod, settings });
      setOverviewLoading(false);
    }

    loadOverview();
    return () => { cancelled = true; };
  }, [user, section]);

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <p style={{ color: '#9CA3AF', fontSize: 18, fontWeight: 600 }}>Log in to access your Creator Dashboard</p>
        <a href="/login" style={{ background: 'linear-gradient(135deg, #F5C842, #D4A830)', color: '#0A0A0F', fontWeight: 700, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' }}>Log In</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <StudioSidebar current={section} onSelect={setSection} />
      <div style={{ marginLeft: '240px', width: '100%' }}>
        <StudioTopbar />
        <div style={{ padding: '2rem' }} className="cinematic-stagger">

          {/* ── Overview ─────────────────────────────────────── */}
          {section === 'overview' && (
            <>
              <h1 style={{ marginBottom: '0.25rem' }}>Overview</h1>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                Here's what's happening in your creator world today.
              </p>

              {overviewLoading ? (
                <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ height: '80px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* Earnings summary */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {[
                      { label: 'Pending Payout', value: fmt(overviewData?.pending), color: '#f5a623' },
                      { label: 'Total Paid Out',  value: fmt(overviewData?.paid),    color: '#4ade80' },
                      { label: 'Donations (this month)', value: fmt(overviewData?.donTotal), color: '#c084fc' },
                    ].map(card => (
                      <div key={card.label} style={{
                        flex: '1 1 160px', padding: '1rem 1.25rem', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      }}>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,200,215,0.4)', marginBottom: '0.35rem' }}>
                          {card.label}
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color }}>
                          {card.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payout method CTA */}
                  {!overviewData?.hasPayoutMethod && (
                    <div style={{
                      padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '1.5rem',
                      background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>⚠️ No payout method set up</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)' }}>
                          Set up PayPal, Venmo, CashApp, or Stripe Connect to receive your earnings.
                        </div>
                      </div>
                      <Link
                        to="/premier/settings"
                        style={{
                          padding: '0.5rem 1.1rem', borderRadius: '8px', background: 'rgba(245,166,35,0.15)',
                          border: '1px solid rgba(245,166,35,0.4)', color: '#f5a623',
                          fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', whiteSpace: 'nowrap',
                        }}
                      >
                        Set Up Payouts →
                      </Link>
                    </div>
                  )}

                  {/* Pending payout CTA */}
                  {overviewData?.hasPayoutMethod && overviewData?.pending > 0 && (
                    <div style={{
                      padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '1.5rem',
                      background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                          💰 {fmt(overviewData.pending)} ready to request
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(200,200,215,0.5)' }}>
                          Go to your Earnings page to request your payout.
                        </div>
                      </div>
                      <Link
                        to="/earnings"
                        style={{
                          padding: '0.5rem 1.1rem', borderRadius: '8px', background: 'rgba(74,222,128,0.12)',
                          border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80',
                          fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', whiteSpace: 'nowrap',
                        }}
                      >
                        Request Payout →
                      </Link>
                    </div>
                  )}

                  {/* Recent earnings */}
                  {overviewData?.recent?.length > 0 && (
                    <div style={{ padding: '1.25rem', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Recent Earnings</h2>
                        <Link to="/earnings" style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', textDecoration: 'none' }}>
                          View All →
                        </Link>
                      </div>
                      {overviewData.recent.map((e, i) => {
                        const statusColor = { pending: '#f5a623', requested: '#60a5fa', paid: '#4ade80', failed: '#f87171' }[e.status] || '#fff';
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < overviewData.recent.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <span style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.6)' }}>
                              {e.status === 'paid' ? '✓' : '○'} {e.source || 'Earning'}
                            </span>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: statusColor }}>{e.status}</span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{fmt(e.amount)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* No earnings yet */}
                  {overviewData?.recent?.length === 0 && overviewData?.hasPayoutMethod && (
                    <div style={{ padding: '2rem', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎬</div>
                      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No earnings yet</p>
                      <p style={{ fontSize: '0.82rem', color: 'rgba(200,200,215,0.45)', margin: 0 }}>Create events and sell tickets to start earning.</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Sessions ──────────────────────────────────────── */}
          {section === 'sessions' && <StudioSessions />}

          {/* ── Posts ─────────────────────────────────────────── */}
          {section === 'posts' && (
            <>
              <h1>Your Posts</h1>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem' }}>Post management coming soon.</p>
            </>
          )}

          {/* ── Analytics ─────────────────────────────────────── */}
          {section === 'analytics' && (
            <>
              <h1>Analytics</h1>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem' }}>Creator analytics coming soon.</p>
            </>
          )}

          {/* ── Settings ──────────────────────────────────────── */}
          {section === 'settings' && (
            <>
              <h1>Settings</h1>
              <p style={{ color: 'rgba(200,200,215,0.45)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Manage your creator preferences.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '480px' }}>
                <Link to="/premier/settings" style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', color: '#f5a623', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                  ✦ Payout Settings →
                </Link>
                <Link to="/profile" style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,200,215,0.7)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                  👤 Edit Profile →
                </Link>
                <Link to="/earnings" style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,200,215,0.7)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                  ◎ Earnings & Payouts →
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
