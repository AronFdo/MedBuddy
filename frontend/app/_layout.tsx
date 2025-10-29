import { Stack } from 'expo-router';
import { ProfileProvider } from '../lib/ProfileContext';
import { useEffect } from 'react';
import { notificationService } from '../lib/notificationService';

export default function RootLayout() {
  useEffect(() => {
    // Initialize notification service when app starts
    notificationService.initialize().catch(error => {
      console.error('Failed to initialize notification service:', error);
    });
  }, []);

  return (
    <ProfileProvider>
      <Stack>
        <Stack.Screen name="Auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ProfileProvider>
  );
}