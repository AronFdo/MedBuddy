import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { useEffect } from 'react';

export default function AuthLayout() {
  useEffect(() => {
    // No custom font loading or SplashScreen hiding needed
  }, []);
  console.log('AuthLayout is rendering');

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile-type" options={{ headerShown: false }} />
    </Stack>
  );
} 