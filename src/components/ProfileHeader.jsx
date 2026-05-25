export default function ProfileHeader({ name, bio, avatar, membershipLabel }) {
  return (
    <div className="profile-header cinematic-hero">
      <img
        src={avatar}
        alt={name}
        className="profile-avatar"
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid #fff'
        }}
      />

      <h1 style={{ marginTop: '1rem' }}>{name}</h1>

      {/* ⭐ Membership Badge */}
      <div
        style={{
          marginTop: '0.5rem',
          padding: '0.4rem 0.8rem',
          background: '#222',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '0.95rem',
          display: 'inline-block',
          opacity: 0.9
        }}
      >
        {membershipLabel}
      </div>

      {bio && (
        <p style={{ marginTop: '1rem', maxWidth: '600px', opacity: 0.85 }}>
          {bio}
        </p>
      )}
    </div>
  );
}
