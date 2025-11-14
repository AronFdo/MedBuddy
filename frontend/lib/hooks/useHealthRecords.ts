import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useHealthRecords(profileId: string | null) {
  return useQuery({
    queryKey: ['healthRecords', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('health_records')
        .select('id, profile_id, event_date, record_type, title, attachment_url, notes')
        .eq('profile_id', profileId)
        .order('event_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes - health records are relatively static
  });
}

export function useHealthRecordsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId }: { profileId: string }) => {
      const { data, error } = await supabase
        .from('health_records')
        .select('id, profile_id, event_date, record_type, title, attachment_url, notes')
        .eq('profile_id', profileId)
        .order('event_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords', variables.profileId] });
    },
  });
}

