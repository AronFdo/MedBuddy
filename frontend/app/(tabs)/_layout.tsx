import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Image } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useProfile } from '@/lib/ProfileContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { profile } = useProfile();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#25D366',
        tabBarInactiveTintColor: '#011A05',
        tabBarStyle: {
          paddingTop: 20,
          height: 100,
          backgroundColor: 'rgba(240, 249, 244, 0.95)',
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="HomeDashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="Medications"
        options={{
          title: 'Medications',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'medkit' : 'medkit-outline'} color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="Chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="Appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            profile?.profile_pic_url ? (
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: focused ? 2 : 0,
                borderColor: color,
              }}>
                <Image 
                  source={{ uri: profile.profile_pic_url }} 
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons
                  name={focused ? 'person' : 'person-outline'}
                  color={focused ? '#25D366' : '#011A05'}
                  size={22}
                />
              </View>
            )
          ),
        }}
      />
    </Tabs>
  );
} 