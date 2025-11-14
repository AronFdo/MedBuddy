import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useConversations(profileId: string | null) {
  return useQuery({
    queryKey: ['conversations', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 1 * 60 * 1000, // 1 minute - conversations update frequently
  });
}

export function useConversationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId }: { profileId: string }) => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.profileId] });
    },
  });
}

