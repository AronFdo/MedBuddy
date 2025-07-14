import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

export default function HomeDashboard() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', user.id)
          .single();
        if (!error && data && data.name) {
          setName(data.name);
        } else {
          setName(null);
        }
      }
      setLoading(false);
    };
    fetchName();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.centeredContent}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://img.icons8.com/ios-filled/100/robot-2.png' }}
            style={styles.avatar}
          />
          <Text style={styles.greeting}>Hi{ name ? `, ${name}` : '' }!</Text>
        </View>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.card}>
            <Ionicons name="calendar-clear" size={36} color={COLORS.primary} />
            <Text style={styles.cardTitle}>My Appointments</Text>
            <Text style={styles.cardSubtitle}>Manage your schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/Medications')}>
            <MaterialIcons name="medication" size={36} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Medications</Text>
            <Text style={styles.cardSubtitle}>View your medications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card}>
            <FontAwesome5 name="microphone" size={32} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Conversations</Text>
            <Text style={styles.cardSubtitle}>Access your chats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card}>
            <Feather name="activity" size={36} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Health Timeline</Text>
            <Text style={styles.cardSubtitle}>Track your health data</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16, backgroundColor: COLORS.secondary },
  greeting: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    width: 160,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    padding: 18,
    margin: 10,
    alignItems: 'flex-start',
    shadowColor: COLORS.primary, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 8 },
  cardSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
}); 