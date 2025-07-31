import { Stack } from 'expo-router';
import { ProfileProvider } from '../lib/ProfileContext';

export default function RootLayout() {
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