export interface Creator {
  id: string;
  name: string;
  avatar_url: string;
  bio: string;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  status: 'draft' | 'published' | 'scheduled' | 'live';
  creator_id: string;
  created_at: string;
  scheduled_at?: string;
}

export interface FeedEvent {
  id: string;
  type: 'session_created' | 'session_published' | 'session_went_live' | 'reaction';
  creator_id: string;
  session_id: string;
  created_at: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  reaction?: string;
}

export const DEV_USER = {
  id: 'dev-user',
  name: 'Dev User',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevUser',
};

export const creators: Creator[] = [
  {
    id: 'creator-1',
    name: 'Aria Nova',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AriaNova',
    bio: 'Electronic music producer & visual artist. Creating new sonic landscapes.',
  },
  {
    id: 'creator-2',
    name: 'Marcus Steel',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusSteel',
    bio: 'NBA analytics content creator. Bringing the game closer to fans.',
  },
  {
    id: 'creator-3',
    name: 'Luna Park',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LunaPark',
    bio: 'Actress & filmmaker. Behind the scenes of a cinematic life.',
  },
  {
    id: 'dev-user',
    name: 'Dev User',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevUser',
    bio: 'You are the dev user. This is a safe sandbox environment.',
  },
];

const now = Date.now();
const m = (mins: number) => new Date(now - 1000 * 60 * mins).toISOString();
const h = (hrs: number) => new Date(now - 1000 * 60 * 60 * hrs).toISOString();
const ahead = (hrs: number) => new Date(now + 1000 * 60 * 60 * hrs).toISOString();

export const sessions: Session[] = [
  {
    id: 'session-1',
    title: 'Album Preview: Neon Dreams',
    description: 'First listen of my upcoming album — uncut, unmastered, just you and me.',
    thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
    status: 'live',
    creator_id: 'creator-1',
    created_at: m(30),
  },
  {
    id: 'session-2',
    title: 'Draft Night Breakdown',
    description: 'Post-game analysis of the top 10 picks. Raw, unfiltered takes.',
    thumbnail_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80',
    status: 'scheduled',
    creator_id: 'creator-2',
    created_at: h(2),
    scheduled_at: ahead(4),
  },
  {
    id: 'session-3',
    title: 'On-Set Q&A — Behind The Lens',
    description: 'Live from the set of my new short film. Ask me anything.',
    thumbnail_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80',
    status: 'published',
    creator_id: 'creator-3',
    created_at: h(5),
  },
  {
    id: 'session-4',
    title: 'Studio Diaries: Beat Making',
    description: 'Making a beat from scratch — live in the studio.',
    thumbnail_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80',
    status: 'published',
    creator_id: 'dev-user',
    created_at: h(24),
  },
  {
    id: 'session-5',
    title: 'My First Fan Q&A',
    description: 'Answering your questions. Nothing is off limits.',
    thumbnail_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    status: 'draft',
    creator_id: 'dev-user',
    created_at: h(48),
  },
  {
    id: 'session-6',
    title: 'Late Night Vibes',
    description: 'A chill late-night session. TBD.',
    thumbnail_url: 'https://images.unsplash.com/photo-1519214605650-76a613ee3245?w=600&q=80',
    status: 'draft',
    creator_id: 'dev-user',
    created_at: h(72),
  },
];

export const feedEvents: FeedEvent[] = [
  {
    id: 'feed-1',
    type: 'session_went_live',
    creator_id: 'creator-1',
    session_id: 'session-1',
    created_at: m(28),
    message: 'Aria Nova just went live with "Album Preview: Neon Dreams"',
  },
  {
    id: 'feed-2',
    type: 'session_created',
    creator_id: 'creator-2',
    session_id: 'session-2',
    created_at: h(2),
    message: 'Marcus Steel scheduled "Draft Night Breakdown"',
  },
  {
    id: 'feed-3',
    type: 'session_published',
    creator_id: 'creator-3',
    session_id: 'session-3',
    created_at: h(5),
    message: 'Luna Park published "On-Set Q&A — Behind The Lens"',
  },
  {
    id: 'feed-4',
    type: 'reaction',
    creator_id: 'creator-1',
    session_id: 'session-1',
    created_at: m(25),
    message: '🔥 247 reactions on "Album Preview: Neon Dreams"',
  },
  {
    id: 'feed-5',
    type: 'session_published',
    creator_id: 'dev-user',
    session_id: 'session-4',
    created_at: h(24),
    message: 'You published "Studio Diaries: Beat Making"',
  },
  {
    id: 'feed-6',
    type: 'reaction',
    creator_id: 'creator-3',
    session_id: 'session-3',
    created_at: h(4),
    message: '❤️ 89 people loved "On-Set Q&A — Behind The Lens"',
  },
  {
    id: 'feed-7',
    type: 'session_created',
    creator_id: 'dev-user',
    session_id: 'session-5',
    created_at: h(48),
    message: 'You drafted "My First Fan Q&A"',
  },
  {
    id: 'feed-8',
    type: 'reaction',
    creator_id: 'creator-2',
    session_id: 'session-2',
    created_at: h(1),
    message: "👏 Marcus Steel's upcoming session already has 120 RSVPs",
  },
];

export const chatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    session_id: 'session-1',
    sender_id: 'creator-2',
    message: 'This album sounds INCREDIBLE 🔥',
    created_at: m(20),
    reaction: '🔥',
  },
  {
    id: 'msg-2',
    session_id: 'session-1',
    sender_id: 'creator-3',
    message: 'The second track gives me chills every time',
    created_at: m(18),
  },
  {
    id: 'msg-3',
    session_id: 'session-1',
    sender_id: 'dev-user',
    message: 'Aria, how long did this album take to make?',
    created_at: m(15),
  },
  {
    id: 'msg-4',
    session_id: 'session-1',
    sender_id: 'creator-1',
    message: 'Two years in the making 🎵 worth every second',
    created_at: m(14),
    reaction: '❤️',
  },
  {
    id: 'msg-5',
    session_id: 'session-1',
    sender_id: 'creator-2',
    message: 'The production quality is insane for an independent release',
    created_at: m(12),
  },
  {
    id: 'msg-6',
    session_id: 'session-1',
    sender_id: 'dev-user',
    message: 'Will there be a vinyl pressing?',
    created_at: m(10),
  },
  {
    id: 'msg-7',
    session_id: 'session-1',
    sender_id: 'creator-1',
    message: 'YES — limited run of 500. Backstage Pass holders get first access 🎟️',
    created_at: m(8),
    reaction: '🎉',
  },
  {
    id: 'msg-8',
    session_id: 'session-1',
    sender_id: 'creator-3',
    message: 'Already saving up for that vinyl 💿',
    created_at: m(5),
  },
];
