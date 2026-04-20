export default function ProfileHeader({ name, bio, avatar }) {
  return (
    <div className="cinematic-card cinematic-hover cinematic-fade" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <div
        className="avatar-fallback"
        style={{
          backgroundImage: avatar
            ? `url(${avatar})`
            : `url('/src/assets/art/avatar-fallback.png')`,
        }}
      />

      <div>
        <h2 style={{ margin: 0 }}>{name}</h2>
        <p style={{ opacity: 0.75, marginTop: '0.3rem' }}>{bio}</p>
      </div>
    </div>
  );
}
