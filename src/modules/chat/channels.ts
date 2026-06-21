import { useState } from 'react';

export type ChannelId = string;

export interface Channel {
  id:    ChannelId;
  label: string;
  icon:  string;
}

/** Derive the deterministic channel ID for a given context. */
export function getChannelId(
  type: 'general' | 'announcements' | 'contest',
  contestId?: string,
): ChannelId {
  if (type === 'contest' && contestId) return `contest_${contestId}`;
  if (type === 'announcements') return 'announcements';
  return 'general';
}

/** Return the ordered channel list for a given context. */
export function getDefaultChannels(contestId?: string): Channel[] {
  const channels: Channel[] = [
    { id: 'general',       label: 'General',       icon: '🗣' },
    { id: 'announcements', label: 'Announcements',  icon: '🔔' },
  ];
  if (contestId) {
    channels.push({
      id:    `contest_${contestId}`,
      label: 'Contest Chat',
      icon:  '🏆',
    });
  }
  return channels;
}

/** Hook to manage the active channel inside a ChatWindow. */
export function useChatChannel(contestId?: string) {
  const channels = getDefaultChannels(contestId);
  const [currentChannelId, setCurrentChannelId] = useState<ChannelId>(
    contestId ? `contest_${contestId}` : 'general',
  );

  return { currentChannelId, setCurrentChannelId, channels };
}
