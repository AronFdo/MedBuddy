import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useDashboardData(profileId: string | null) {
  return useQuery({
    queryKey: ['dashboard', profileId],
    queryFn: async () => {
      if (!profileId) {
        return {
          medications: [],
          appointments: [],
          healthRecords: [],
          logs: [],
        };
      }

      // Calculate date filter once
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);

      // Execute all queries in parallel
      const [
        medsResult,
        apptsResult,
        recordsResult,
        logResult
      ] = await Promise.all([
        supabase
          .from('medications')
          .select(`
            medication_id,
            profile_id,
            name,
            dosage,
            frequency,
            days_remaining,
            prescription_id,
            prescriptions:prescription_id (id, doctor_name, issued_date, notes)
          `)
          .eq('profile_id', profileId)
          .limit(100),
        
        supabase
          .from('appointments')
          .select('appointment_id, profile_id, date, doctor_name, visit_reason, notes, time, location, attended, attended_date')
          .eq('profile_id', profileId)
          .order('date', { ascending: false })
          .limit(50),
        
        supabase
          .from('health_records')
          .select('id, profile_id, event_date, record_type, title, attachment_url, notes')
          .eq('profile_id', profileId)
          .order('event_date', { ascending: false })
          .limit(20),
        
        supabase
          .from('medication_logs')
          .select('*')
          .eq('profile_id', profileId)
          .gte('log_date', twoDaysAgoStr)
          .order('log_date', { ascending: false })
      ]);

      if (medsResult.error) throw medsResult.error;
      if (apptsResult.error) throw apptsResult.error;
      if (recordsResult.error) throw recordsResult.error;
      if (logResult.error) throw logResult.error;

      return {
        medications: medsResult.data || [],
        appointments: apptsResult.data || [],
        healthRecords: recordsResult.data || [],
        logs: logResult.data || [],
      };
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 minutes - dashboard data changes moderately
  });
}

