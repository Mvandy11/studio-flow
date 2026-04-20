import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMessagesForSession, sendMessage, subscribeToChat } from '../lib/chat';

export function useRealtimeChat(session_id, user_id) {
  const [messages, setMessages] = useState([]);

  // Load initial messages
  useEffect(() => {
    if (!session_id) return;

    async function load() {
      const initial = await getMessagesForSession(session_id);
      setMessages(initial);
    }

    load();
  }, [session_id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!session_id) return;

    const channel = subscribeToChat(session_id, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session_id]);

  // Send a message
  async function send(text) {
    if (!text.trim()) return;

    await sendMessage({
      session_id,
      sender_id: user_id,
      message: text,
    });
  }

  return {
    messages,
    send,
  };
}
