import { Stack } from 'expo-router';
import { ProfileProvider } from '../lib/ProfileContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
          'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
          'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
          'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
          'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
          'Poppins-ExtraLight': require('../assets/fonts/Poppins-ExtraLight.ttf'),
          'Poppins-Thin': require('../assets/fonts/Poppins-Thin.ttf'),
          'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
          'Poppins-Black': require('../assets/fonts/Poppins-Black.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue even if fonts fail to load
      }
    }

    loadFonts();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <Stack>
          <Stack.Screen name="Auth" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ProfileProvider>
    </QueryClientProvider>
  );
}
