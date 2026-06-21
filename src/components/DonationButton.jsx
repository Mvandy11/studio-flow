const REWARD_POOL_STRIPE_LINK = 'https://buy.stripe.com/28E14pgpncgofnmbh3b7y0t';

export default function DonationButton({ compact = false }) {
  return (
    <a
      href={REWARD_POOL_STRIPE_LINK}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: compact ? '0.35rem 0.85rem' : '0.5rem 1.25rem',
        borderRadius: '8px',
        background: 'rgba(245, 166, 35, 0.12)',
        border: '1px solid rgba(245, 166, 35, 0.3)',
        color: 'var(--accent-gold, #f5a623)',
        fontWeight: 600,
        fontSize: compact ? '0.8rem' : '0.875rem',
        cursor: 'pointer',
        display: 'inline-block',
        textDecoration: 'none',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      💜 {compact ? 'Donate' : 'Donate to Reward Pool'}
    </a>
  );
}
