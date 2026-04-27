import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockSupabase } from '../mock/supabase';
import type { Session } from '../mock/seed';

export function useSessions() {
  return useQuery({
    queryKey: ['dev:sessions'],
    queryFn: () => mockSupabase.getSessions(),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['dev:session', id],
    queryFn: () => mockSupabase.getSession(id),
    enabled: Boolean(id),
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Session, 'id' | 'creator_id' | 'created_at'>) =>
      mockSupabase.createSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev:sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dev:feed'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Session> }) =>
      mockSupabase.updateSession(id, updates),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['dev:sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dev:session', id] });
    },
  });
}
