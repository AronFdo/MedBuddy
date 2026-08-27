import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

const BIOMETRIC_ENABLED_KEY = 'medbuddy_biometric_enabled';
const ACCESS_TOKEN_KEY = 'medbuddy_access_token';
const REFRESH_TOKEN_KEY = 'medbuddy_refresh_token';

export async function canUseBiometrics(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricLabel(): Promise<string> {
  if (Platform.OS !== 'ios') {
    return 'Biometrics';
  }
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }
  return 'Biometrics';
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
}

export async function saveSessionForBiometrics(session: Session): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.access_token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refresh_token);
}

export async function getStoredSessionTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export async function clearBiometricSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function authenticateWithBiometrics(promptMessage?: string) {
  const label = await getBiometricLabel();
  return LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage || `Unlock MedBuddy with ${label}`,
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });
}

export async function enableBiometricsWithSession(session: Session): Promise<boolean> {
  const available = await canUseBiometrics();
  if (!available) {
    return false;
  }

  const result = await authenticateWithBiometrics('Confirm to enable biometric unlock');
  if (!result.success) {
    return false;
  }

  await saveSessionForBiometrics(session);
  await setBiometricEnabled(true);
  return true;
}
