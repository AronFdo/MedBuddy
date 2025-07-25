import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

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
      Alert.alert('Profile Set', 'Your profile type has been saved.', [
        { text: 'Continue', onPress: () => router.replace('/Auth') },
      ]);
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
    fontWeight: 'bold',
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
    fontWeight: '600',
  },
});
export default ProfileTypeScreen;
