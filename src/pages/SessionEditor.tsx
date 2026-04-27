import '../../src/styles/dev.css';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession, useUpdateSession } from '../hooks/useSessions';
import SessionForm from '../components/SessionForm';
import CinematicPreview from '../components/CinematicPreview';
import { useStudioFlowStore } from '../context/useStudioFlowStore';
import type { Session } from '../mock/seed';

export default function DevSessionEditor() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(id);
  const { mutate: updateSession, isPending } = useUpdateSession();
  const { editingSession, patchEditingSession, setEditingSession } = useStudioFlowStore();

  // Initialise edit buffer from fetched data
  const draft = editingSession ?? session ?? {};

  function handleSave(data: Omit<Session, 'id' | 'creator_id' | 'created_at'>) {
    updateSession(
      { id, updates: data },
      {
        onSuccess: () => {
          setEditingSession(null);
          navigate('/dev');
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="cinematic-hero" style={{ textAlign: 'center' }}>
        <div className="cinematic-spinner" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="cinematic-hero" style={{ textAlign: 'center' }}>
        <p style={{ color: '#888' }}>Session not found.</p>
        <button className="cinematic-button" style={{ marginTop: '1rem' }} onClick={() => navigate('/dev')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="cinematic-layout cinematic-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="cinematic-button" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/dev')}>
          ← Dashboard
        </button>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fabc50', background: 'rgba(250,188,80,0.12)', border: '1px solid rgba(250,188,80,0.3)', borderRadius: '4px', padding: '0.2rem 0.55rem' }}>
          🛠 Dev Mode
        </span>
        <h2 className="cinematic-title" style={{ fontSize: '1.3rem', margin: 0 }}>
          Edit Session
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* ── Form ── */}
        <div className="cinematic-card-xl" style={{ padding: '1.5rem' }}>
          <SessionForm
            initial={draft}
            saving={isPending}
            onSave={handleSave}
            onCancel={() => navigate('/dev')}
          />
        </div>

        {/* ── Live preview ── */}
        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <CinematicPreview session={{ ...session, ...draft }} />

          <div
            className="cinematic-card"
            style={{ marginTop: '1rem', padding: '1rem', fontSize: '0.8rem', color: '#666', lineHeight: 1.6 }}
          >
            <p><strong style={{ color: '#a78bfa' }}>Dev Mode</strong> — Changes are saved to in-memory state only. No Supabase calls are made.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
