import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getSessionById } from '../lib/session';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import ChatBubble from '../components/ChatBubble';
import LivePlayer from '../components/LivePlayer';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function apiFetch(path, opts = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export default function SessionPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [session,          setSession]          = useState(null);
  const [loading,          setLoading]          = useState(true);

  // realtime chat
  const [text, setText] = useState('');
  const { messages, send } = useRealtimeChat(id, user?.id);

  // persistent comments
  const [comments,         setComments]         = useState([]);
  const [commentsLoading,  setCommentsLoading]  = useState(true);
  const [commentText,      setCommentText]       = useState('');
  const [submitting,       setSubmitting]        = useState(false);
  const [commentError,     setCommentError]      = useState('');
  const [deletingId,       setDeletingId]        = useState(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    async function load() {
      const data = await getSessionById(id);
      setSession(data);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    loadComments();
  }, [id]);

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const json = await apiFetch(`/api/comments/${id}`);
      setComments(json.comments || []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handlePostComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !user) return;

    setSubmitting(true);
    setCommentError('');
    try {
      const json = await apiFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ video_id: id, content: text }),
      });
      setComments((prev) => [...prev, json.comment]);
      setCommentText('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setCommentError(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    setDeletingId(commentId);
    try {
      await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div className="cinematic-hero">Loading session...</div>;
  if (!session) return <div className="cinematic-hero">Session not found.</div>;

  return (
    <div>
      <div className="cinematic-hero">
        <h1>{session.title}</h1>
        <p>{session.description}</p>
      </div>

      <div style={{ padding: '2rem' }}>
        {session.livestream_url && (
          <LivePlayer url={session.livestream_url} label={session.title} />
        )}

        {/* ── Realtime Chat ── */}
        <h2>Free Chat</h2>
        <div
          className="cinematic-card cinematic-stagger"
          style={{ height: '220px', overflowY: 'auto', padding: '1rem' }}
        >
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m.content}
              isSelf={m.user_id === user?.id}
            />
          ))}
        </div>

        {user && (
          <div style={{ marginTop: '1rem' }}>
            <input
              type="text"
              className="cinematic-input"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="cinematic-button-accent"
              onClick={() => { send(text); setText(''); }}
            >
              Send
            </button>
          </div>
        )}

        {/* ── Persistent Comments ── */}
        <h2 style={{ marginTop: '2.5rem' }}>
          Comments {comments.length > 0 && <span style={{ fontWeight: 400, fontSize: '0.9em', color: 'var(--color-muted)' }}>({comments.length})</span>}
        </h2>

        <div
          className="cinematic-card"
          style={{ padding: '1rem', marginBottom: '1rem', maxHeight: '360px', overflowY: 'auto' }}
        >
          {commentsLoading ? (
            <p style={{ color: 'var(--color-muted)' }}>Loading comments…</p>
          ) : comments.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '0.6rem 0',
                  borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>
                    {c.user_name || 'Creator'}
                  </span>
                  <span style={{ fontSize: '0.78em', color: 'var(--color-muted)' }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                  <p style={{ margin: '0.25rem 0 0', lineHeight: 1.45 }}>{c.content}</p>
                </div>
                {user && (user.id === c.user_id) && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    disabled={deletingId === c.id}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-muted)',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                      marginLeft: '0.75rem',
                      opacity: deletingId === c.id ? 0.4 : 1,
                    }}
                    title="Delete comment"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {user ? (
          <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="cinematic-input"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={submitting}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="cinematic-button-accent"
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </form>
        ) : (
          <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>
            Sign in to leave a comment.
          </p>
        )}
        {commentError && (
          <p style={{ color: 'var(--color-error, #f87171)', marginTop: '0.5rem' }}>
            {commentError}
          </p>
        )}
      </div>
    </div>
  );
}
