import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FreeChatPage() {
  const { user } = useAuth();
  const [posts,    setPosts]    = useState([]);
  const [message,  setMessage]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [posting,  setPosting]  = useState(false);
  const [error,    setError]    = useState(null);
  const [postErr,  setPostErr]  = useState(null);
  const textareaRef = useRef(null);

  const loadPosts = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE}/api/free-chat/list`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load posts.');
      setPosts(data.posts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handlePost(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setPosting(true);
    setPostErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${BASE}/api/free-chat/post`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post.');
      setMessage('');
      // Prepend the new post to the top of the feed
      setPosts((prev) => [data.post, ...prev]);
      textareaRef.current?.focus();
    } catch (err) {
      setPostErr(err.message);
    } finally {
      setPosting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost(e);
  }

  const remaining = 1000 - message.length;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          💬 Free Chat
        </h1>
        <p style={{ color: 'var(--text-muted, #888)', marginTop: '0.35rem', fontSize: '0.9rem' }}>
          Open community chat — no subscription required. Be kind.
        </p>
      </div>

      {/* Post input */}
      {user ? (
        <form onSubmit={handlePost} style={{ marginBottom: '1.75rem' }}>
          <div style={{
            background: 'var(--surface, #1a1a2e)',
            border: '1px solid var(--border, #2a2a40)',
            borderRadius: '12px',
            padding: '1rem',
          }}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share something with the community…"
              maxLength={1000}
              rows={3}
              disabled={posting}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: 'inherit',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: remaining < 100 ? '#fca5a5' : 'var(--text-muted, #888)' }}>
                {remaining} characters remaining
              </span>
              <button
                type="submit"
                disabled={posting || !message.trim()}
                className="btn btn--primary"
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.875rem' }}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
          {postErr && (
            <p style={{ color: '#fca5a5', fontSize: '0.875rem', marginTop: '0.5rem' }}>{postErr}</p>
          )}
          <p style={{ color: 'var(--text-muted, #888)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
            Tip: Ctrl + Enter to post
          </p>
        </form>
      ) : (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(110,168,255,0.08)',
          border: '1px solid rgba(110,168,255,0.2)',
          color: 'var(--accent-blue, #6ea8ff)',
          marginBottom: '1.75rem',
          textAlign: 'center',
          fontSize: '0.9rem',
        }}>
          <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>Log in</Link> to post in the chat. Viewing is free and open to everyone.
        </div>
      )}

      {/* Feed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)' }}>
          {loading ? 'Loading…' : `${posts.length} message${posts.length !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={loadPosts}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted, #888)', cursor: 'pointer', fontSize: '0.82rem', padding: '0.25rem 0.5rem' }}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={{ color: '#fca5a5', padding: '0.75rem', background: 'rgba(252,165,165,0.08)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted, #888)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
          <p style={{ margin: 0 }}>No messages yet. Be the first to say something!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {posts.map((post) => (
          <div
            key={post.id}
            style={{
              background: 'var(--surface, #1a1a2e)',
              border: '1px solid var(--border, #2a2a40)',
              borderRadius: '10px',
              padding: '0.875rem 1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {post.display_name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>
                {timeAgo(post.created_at)}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, wordBreak: 'break-word' }}>
              {post.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
