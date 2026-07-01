import { Clapperboard } from 'lucide-react';

export default function Generator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', textAlign: 'center', padding: '0 1.5rem' }}>
      <Clapperboard size={64} color="#FACC15" />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>Video Generator</h1>
      <p style={{ color: '#9CA3AF', maxWidth: 440, margin: 0, lineHeight: 1.6 }}>
        Record your face and voice — our AI will animate it into a
        video you can submit to contests and post to your feed. Coming soon.
      </p>
      <span style={{ background: '#FACC15', color: '#000', fontSize: '0.875rem', fontWeight: 700, padding: '4px 16px', borderRadius: 9999 }}>
        Coming Soon
      </span>
    </div>
  );
}
