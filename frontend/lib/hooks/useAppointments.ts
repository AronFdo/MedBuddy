import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useAppointments(profileId: string | null) {
  return useQuery({
    queryKey: ['appointments', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_id, profile_id, date, doctor_name, visit_reason, notes, time, location, attended, attended_date')
        .eq('profile_id', profileId)
        .order('date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 3 * 60 * 1000, // 3 minutes - appointments change occasionally
  });
}

export function useAppointmentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId }: { profileId: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_id, profile_id, date, doctor_name, visit_reason, notes, time, location, attended, attended_date')
        .eq('profile_id', profileId)
        .order('date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', variables.profileId] });
    },
  });
}

