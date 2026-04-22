export default function ViewerCount({ count }) {
  return (
    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <span style={{ opacity: 0.75 }}>👁</span>
      {count} watching
    </span>
  );
}
