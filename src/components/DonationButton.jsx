export default function DonationButton({ compact = false }) {
  return (
    <a
      href="https://buy.stripe.com/dRmaEZehf3JSfnm84Rb7y0p"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: '0.45rem 1rem',
        borderRadius: '8px',
        background: 'rgba(245, 166, 35, 0.12)',
        border: '1px solid rgba(245, 166, 35, 0.3)',
        color: 'var(--accent-gold, #f5a623)',
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: 'pointer',
        display: 'inline-block',
        textDecoration: 'none',
      }}
    >
      💖 Donate
    </a>
  );
}
