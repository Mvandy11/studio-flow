import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  fetchInitialMessages,
  subscribeToMessages,
  sendMessage,
  createPresenceChannel,
  createPinnedChannel,
  pinMessage,
  createReactionChannel,
  sendReaction,
} from '../../lib/stageRealtime';
import StageHeader from '../../components/stage/StageHeader';
import MessageList from '../../components/stage/MessageList';
import MessageInput from '../../components/stage/MessageInput';
import ReactionBar from '../../components/stage/ReactionBar';

export default function StagePage() {
  const { stageRoomId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [messages, setMessages] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState([]);

  const pinnedChannelRef = useRef(null);
  const reactionChannelRef = useRef(null);

  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, thumbnail_url, creator_id, ticket_price, is_paid_event')
        .eq('stage_room_id', stageRoomId)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message ?? 'Event not found.');
      } else {
        setEvent(data);
      }
      setPageLoading(false);
    }

    loadEvent();
  }, [stageRoomId]);

  useEffect(() => {
    if (!stageRoomId) return;

    fetchInitialMessages(stageRoomId).then(setMessages).catch(console.error);

    const ch = subscribeToMessages(stageRoomId, (msg) =>
      setMessages((prev) => [...prev, msg])
    );

    return () => { supabase.removeChannel(ch); };
  }, [stageRoomId]);

  useEffect(() => {
    if (!stageRoomId || authLoading) return;

    const ch = createPresenceChannel(stageRoomId, user?.id ?? 'anon', setViewerCount);

    return () => { supabase.removeChannel(ch); };
  }, [stageRoomId, user, authLoading]);

  useEffect(() => {
    if (!stageRoomId) return;

    const ch = createPinnedChannel(stageRoomId, setPinnedMessage);
    pinnedChannelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      pinnedChannelRef.current = null;
    };
  }, [stageRoomId]);

  useEffect(() => {
    if (!stageRoomId) return;

    const ch = createReactionChannel(stageRoomId, (emoji) => {
      const id = `${Date.now()}-${Math.random()}`;
      const left = 8 + Math.random() * 84;
      setFloatingReactions((prev) => [...prev, { id, emoji, left }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2400);
    });
    reactionChannelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      reactionChannelRef.current = null;
    };
  }, [stageRoomId]);

  async function handleSend(text) {
    if (!user) return;
    await sendMessage(stageRoomId, user, text);
  }

  async function handleReact(emoji) {
    if (reactionChannelRef.current) {
      await sendReaction(reactionChannelRef.current, emoji);
    }
  }

  async function handlePin(message) {
    if (pinnedChannelRef.current) {
      await pinMessage(pinnedChannelRef.current, message);
    }
  }

  const isCreator = Boolean(user && event && user.id === event.creator_id);

  if (pageLoading || authLoading) {
    return (
      <div className="cinematic-hero" style={{ textAlign: 'center' }}>
        <div className="cinematic-spinner" />
        <p className="cinematic-subtitle" style={{ marginTop: '1.25rem', color: 'var(--color-muted)' }}>
          Loading stage…
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="cinematic-hero" style={{ textAlign: 'center' }}>
        <h2 className="cinematic-title">Stage unavailable</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>{errorMsg}</p>
        <button className="cinematic-button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="stage-layout">
      <StageHeader
        event={event}
        viewerCount={viewerCount}
        onLeave={() => navigate(-1)}
      />

      <div className="stage-body">
        <div className="stage-chat-panel">
          <MessageList
            messages={messages}
            pinnedMessage={pinnedMessage}
            currentUserId={user?.id}
            creatorId={event?.creator_id}
            isCreator={isCreator}
            onPin={handlePin}
          />

          <ReactionBar onReact={handleReact} />

          <MessageInput onSend={handleSend} disabled={!user} />
        </div>
      </div>

      <div className="stage-reactions-overlay" aria-hidden="true">
        {floatingReactions.map((r) => (
          <span
            key={r.id}
            className="stage-floating-reaction"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
