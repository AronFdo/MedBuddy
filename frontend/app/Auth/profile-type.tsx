import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProfile } from '../../lib/ProfileContext';
import { supabase } from '../../lib/supabase';
import { Fonts } from '../../constants/Fonts';

const PROFILE_OPTIONS = [
  { label: 'Myself', value: 'myself' },
  { label: 'Parent', value: 'parent' },
  { label: 'Grandparent', value: 'grandparent' },
  { label: 'Sibling', value: 'sibling' },
];

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

function ProfileTypeScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const name = params.name as string | undefined;
  const age = params.age as string | undefined;
  const gender = params.gender as string | undefined;
  const { setProfile, refreshProfiles } = useProfile();

  const handleSelect = async (profileType: string) => {
    setLoading(true);
    // Get current user from Supabase session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      Alert.alert('Error', 'Could not get user info.');
      return;
    }
    // Upsert profile type to 'profiles' table (assumes such a table exists)
    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      ...(name ? { name } : {}),
      ...(age ? { age: Number(age) } : {}),
      ...(gender ? { gender } : {}),
      profile_type: profileType,
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      try {
        // Refresh and set selected profile so other screens immediately pick it up
        await refreshProfiles();
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (userProfiles && userProfiles.length > 0) {
          const myselfProfile = userProfiles.find(p => p.profile_type === 'myself');
          const selectedProfile = myselfProfile || userProfiles[0];
          setProfile(selectedProfile as any);
        }
      } catch (e) {
        // Non-blocking: proceed to app even if refresh fails
      }

      // Go straight to the app tabs
      router.replace('/(tabs)/HomeDashboard');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Who is this profile for?</Text>
        {PROFILE_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={styles.optionButton}
            onPress={() => handleSelect(option.value)}
            disabled={loading}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
        {loading && <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: COLORS.primary,
    marginBottom: 32,
    textAlign: 'center',
  },
  optionButton: {
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  optionText: {
    color: COLORS.primary,
    fontSize: 18,
    fontFamily: Fonts.semiBold,
  },
});
export default ProfileTypeScreen;
