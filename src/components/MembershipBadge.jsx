/**
 * MembershipBadge — shown next to usernames wherever subscription status matters.
 * Renders nothing when active is falsy, so it is always safe to include.
 */
export function MembershipBadge({ active }) {
  if (!active) return null;

  return (
    <span
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           '0.2rem',
        background:    'linear-gradient(135deg, #f5a623, #ffd700)',
        color:         '#000',
        padding:       '2px 7px',
        borderRadius:  '6px',
        fontSize:      '0.72rem',
        fontWeight:    700,
        letterSpacing: '0.02em',
        lineHeight:    1,
        whiteSpace:    'nowrap',
        flexShrink:    0,
      }}
    >
      ⭐ Member
    </span>
  );
}

export default MembershipBadge;
