import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useMedications(profileId: string | null) {
  return useQuery({
    queryKey: ['medications', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('medications')
        .select(`
          *,
          prescriptions:prescription_id (id, doctor_name, issued_date, notes)
        `)
        .eq('profile_id', profileId)
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 minutes - medications don't change often
  });
}

export function useMedicationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId }: { profileId: string }) => {
      const { data, error } = await supabase
        .from('medications')
        .select(`
          *,
          prescriptions:prescription_id (id, doctor_name, issued_date, notes)
        `)
        .eq('profile_id', profileId)
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch medications for this profile
      queryClient.invalidateQueries({ queryKey: ['medications', variables.profileId] });
    },
  });
}

