import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

interface Profile {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  profile_type?: string;
  meal_times?: any;
  alarm_times?: any;
  profile_pic_url?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  profiles: Profile[];
  setProfile: (profile: Profile | null) => void;
  refreshProfiles: () => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfiles = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        
        setProfiles(allProfiles || []);
        
        if (allProfiles && allProfiles.length > 0) {
          // First, try to find the "myself" profile
          const myselfProfile = allProfiles.find(p => p.profile_type === 'myself');
          
          if (!profile) {
            // If no profile is currently selected, prioritize "myself" profile
            if (myselfProfile) {
              setProfile(myselfProfile);
            } else {
              // Fallback to first profile if no "myself" profile exists
              setProfile(allProfiles[0]);
            }
          } else {
            // If current profile doesn't exist in the list anymore, select "myself" or first one
            const currentProfileExists = allProfiles.find(p => p.id === profile.id);
            if (!currentProfileExists) {
              if (myselfProfile) {
                setProfile(myselfProfile);
              } else {
                setProfile(allProfiles[0]);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // User just signed in, refresh profiles and set to "myself" profile
        await refreshProfiles();
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear profiles
        setProfiles([]);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    profile,
    profiles,
    setProfile,
    refreshProfiles,
    loading,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
} 