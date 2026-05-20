import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockSupabase } from '../mock/supabase';

export function useChat(sessionId: string) {
  return useQuery({
    queryKey: ['dev:chat', sessionId],
    queryFn: () => mockSupabase.getChat(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: 2000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { session_id: string; content: string; user_id?: string }) =>
      mockSupabase.sendMessage(input),
    onSuccess: (_data, { session_id }) => {
      queryClient.invalidateQueries({ queryKey: ['dev:chat', session_id] });
    },
  });
}
