import {
  sessions as seedSessions,
  feedEvents as seedFeed,
  chatMessages as seedChat,
  creators,
  DEV_USER,
  type Session,
  type FeedEvent,
  type ChatMessage,
} from './seed';

// ── In-memory store (mutated at runtime) ────────────────────────────────────
let _sessions: Session[] = [...seedSessions];
let _feed: FeedEvent[] = [...seedFeed];
let _chat: ChatMessage[] = [...seedChat];

// ── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));

function findCreator(id: string) {
  return creators.find((c) => c.id === id);
}

// ── Mock Supabase service ────────────────────────────────────────────────────
export const mockSupabase = {
  /** Return all sessions */
  getSessions: async (): Promise<Session[]> => {
    await delay();
    return [..._sessions];
  },

  /** Return a single session by id */
  getSession: async (id: string): Promise<Session | null> => {
    await delay();
    return _sessions.find((s) => s.id === id) ?? null;
  },

  /** Create a new session (owned by DEV_USER) */
  createSession: async (
    input: Omit<Session, 'id' | 'creator_id' | 'created_at'>
  ): Promise<Session> => {
    await delay(300);
    const newSession: Session = {
      ...input,
      id: `session-${Date.now()}`,
      creator_id: DEV_USER.id,
      created_at: new Date().toISOString(),
    };
    _sessions = [newSession, ..._sessions];

    // Add feed event
    _feed = [
      {
        id: `feed-${Date.now()}`,
        type: 'session_created',
        creator_id: DEV_USER.id,
        session_id: newSession.id,
        created_at: new Date().toISOString(),
        message: `You created "${newSession.title}"`,
      },
      ..._feed,
    ];

    return newSession;
  },

  /** Update a session by id */
  updateSession: async (id: string, updates: Partial<Session>): Promise<Session> => {
    await delay(200);
    _sessions = _sessions.map((s) => (s.id === id ? { ...s, ...updates } : s));
    const updated = _sessions.find((s) => s.id === id);
    if (!updated) throw new Error('Session not found');
    return updated;
  },

  /** Get activity feed */
  getFeed: async (): Promise<FeedEvent[]> => {
    await delay();
    return [..._feed].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  /** Get chat messages for a session */
  getChat: async (sessionId: string): Promise<ChatMessage[]> => {
    await delay();
    return _chat.filter((m) => m.session_id === sessionId);
  },

  /** Send a chat message */
  sendMessage: async (input: {
    session_id: string;
    content: string;
    user_id?: string;
  }): Promise<ChatMessage> => {
    await delay(80);
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      session_id: input.session_id,
      user_id: input.user_id ?? DEV_USER.id,
      content: input.content,
      created_at: new Date().toISOString(),
    };
    _chat = [..._chat, msg];
    return msg;
  },

  /** Helpers */
  getCreator: (id: string) => findCreator(id),
  getCurrentUser: () => DEV_USER,
};
