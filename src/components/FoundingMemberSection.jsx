import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const TOTAL_SPOTS = 100;
const STRIPE_CHECKOUT_URL = import.meta.env.VITE_FOUNDING_CHECKOUT_URL;

export default function FoundingMemberSection() {
  const [claimed, setClaimed] = useState(null);

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
          // Clean URL and refresh count
          window.history.replaceState({}, '', window.location.pathname);
          setClaimed(prev => (prev !== null ? prev + 1 : 1));
        })
        .catch(console.error);
    }
  }, []);

  const remaining = TOTAL_SPOTS - (claimed ?? 0);

  return (
    <section className="founding-section">
      <div className="founding-badge">🔥 Founding Member</div>
      <h2>Only {TOTAL_SPOTS} Spots — <span className="highlight">{claimed === null ? '...' : remaining} Remaining</span></h2>
      <p>Lock in <strong>$25/mo forever</strong>, get early access to every new feature, and earn a badge that proves you were here first.</p>
      <div className="founding-perks">
        <span>✅ $25/mo locked forever</span>
        <span>✅ Founding Member badge</span>
        <span>✅ Early feature access</span>
        <span>✅ Priority support</span>
      </div>
      <a href={STRIPE_CHECKOUT_URL} className="founding-btn">
        Claim Your Founding Spot →
      </a>
      <p className="founding-sub">🔴 LIVE · {claimed === null ? '...' : claimed} of {TOTAL_SPOTS} spots claimed</p>
    </section>
  );
}
