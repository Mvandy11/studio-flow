import { useQuery } from '@tanstack/react-query';
import { mockSupabase } from '../mock/supabase';

export function useFeed() {
  return useQuery({
    queryKey: ['dev:feed'],
    queryFn: () => mockSupabase.getFeed(),
    refetchInterval: 5000,
  });
}
