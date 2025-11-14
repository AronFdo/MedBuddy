import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useMedicationLogs(profileId: string | null, days: number = 2) {
  return useQuery({
    queryKey: ['medicationLogs', profileId, days],
    queryFn: async () => {
      if (!profileId) return [];
      
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - days);
      const dateFilterStr = dateFilter.toISOString().slice(0, 10);
      
      const { data, error } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('profile_id', profileId)
        .gte('log_date', dateFilterStr)
        .order('log_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 1 * 60 * 1000, // 1 minute - logs change frequently
  });
}

export function useTodayMedicationLogs(profileId: string | null) {
  return useQuery({
    queryKey: ['medicationLogs', profileId, 'today'],
    queryFn: async () => {
      if (!profileId) return [];
      
      const today = new Date().toISOString().slice(0, 10);
      
      const { data, error } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('profile_id', profileId)
        .eq('log_date', today);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 30 * 1000, // 30 seconds - today's logs change frequently
  });
}

export function useMedicationLogsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, logDate }: { profileId: string; logDate?: string }) => {
      const today = logDate || new Date().toISOString().slice(0, 10);
      
      const { data, error } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('profile_id', profileId)
        .eq('log_date', today);
      
      if (error) throw error;
      return data || [];
    },
    onSuccess: (_, variables) => {
      // Invalidate all log queries for this profile
      queryClient.invalidateQueries({ queryKey: ['medicationLogs', variables.profileId] });
    },
  });
}

