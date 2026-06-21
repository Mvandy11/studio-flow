import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const TOTAL_SPOTS = 100;
const STRIPE_CHECKOUT_URL = import.meta.env.VITE_FOUNDING_CHECKOUT_URL;

export default function FoundingMemberSection() {
  const [claimed, setClaimed] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('is_founding', true);
      setClaimed(count ?? 0);
    }
    fetchCount();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const founding = params.get('founding');

    if (founding === 'success' && sessionId) {
      fetch('/.netlify/functions/claim-founding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then(() => {
          window.history.replaceState({}, '', window.location.pathname);
          setClaimed(prev => (prev !== null ? prev + 1 : 1));
        })
        .catch(console.error);
    }
  }, []);

  const handleClaimClick = (e) => {
    if (!user) {
      e.preventDefault();
      setShowAuthPrompt(true);
    }
  };

  const remaining = TOTAL_SPOTS - (claimed ?? 0);

  return (
    <section className="founding-section">
      <div className="founding-badge">🔥 Founding Member</div>
      <h2>Only {TOTAL_SPOTS} Spots — <span className="highlight">{claimed === null ? '...' : remaining} Remaining</span></h2>
      <p>
        Founding members lock in <strong>$25/mo forever</strong> — when the 100 spots fill,
        regular membership becomes <strong>$40/mo</strong>. Of each $40 membership,
        <strong> $10 goes to the Contest Prize Pool</strong> and <strong>$15 goes to Event Rewards</strong>.
        Founding members keep their $25 rate and their badge permanently.
      </p>
      <div className="founding-perks">
        <span>✅ $25/mo locked forever (reg. $40/mo)</span>
        <span>✅ Founding Member badge — permanent</span>
        <span>✅ $10/mo fuels contest prizes</span>
        <span>✅ $10/mo fuels event rewards</span>
        <span>✅ Early access to every new feature</span>
        <span>✅ Priority support</span>
      </div>

      <a href={STRIPE_CHECKOUT_URL} className="founding-btn" onClick={handleClaimClick}>
        Claim Your Founding Spot →
      </a>

      {showAuthPrompt && (
        <div className="auth-prompt">
          <p>⚡ You need a free account before checkout.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
            <a href="/signup" className="auth-prompt-btn">Create Account</a>
            <a href="/login" className="auth-prompt-btn secondary">Sign In</a>
          </div>
        </div>
      )}

      <p className="founding-sub">🔴 LIVE · {claimed === null ? '...' : claimed} of {TOTAL_SPOTS} spots claimed</p>
      <p className="founding-sub" style={{ marginTop: '0.35rem', opacity: 0.65 }}>
        After 100 spots fill, membership opens at $40/mo — founding members keep $25 forever.
      </p>
    </section>
  );
}
