import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Fonts } from '../constants/Fonts';
import { clearBiometricSession } from '../lib/biometricAuth';
import type { EmailOtpType } from '@supabase/supabase-js';

const COLORS = {
  primary: '#25D366',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  text: '#011A05',
};

function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const collect = (raw: string) => {
    raw.split('&').forEach((pair) => {
      const [rawKey, rawValue] = pair.split('=');
      if (!rawKey || rawValue === undefined) return;
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    });
  };

  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');

  if (hashIndex >= 0) {
    collect(url.slice(hashIndex + 1));
  }

  if (queryIndex >= 0) {
    const end = hashIndex >= 0 ? hashIndex : url.length;
    collect(url.slice(queryIndex + 1, end));
  }

  return params;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function routeParamsToRecord(
  params: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    const first = firstParam(value);
    if (first) out[key] = first;
  });
  return out;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    token_hash?: string | string[];
    type?: string | string[];
    code?: string | string[];
    access_token?: string | string[];
    refresh_token?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const establishRecoverySession = useCallback(async (url?: string | null) => {
    try {
      const params = {
        ...routeParamsToRecord(routeParams),
        ...(url ? parseAuthParams(url) : {}),
      };

      if (params.error || params.error_description) {
        throw new Error(
          decodeURIComponent(
            (params.error_description || params.error || 'Invalid reset link').replace(/\+/g, ' ')
          )
        );
      }

      // Preferred mobile path: token_hash from deep link (not ConfirmationURL).
      // ConfirmationURL is often prefetched by email scanners and expires immediately.
      if (params.token_hash) {
        const otpType = (params.type || 'recovery') as EmailOtpType;
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: otpType,
        });
        if (error) throw error;
        setLinkReady(true);
        return;
      }

      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) throw error;
        setLinkReady(true);
        return;
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
        setLinkReady(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLinkReady(true);
        return;
      }

      setErrorMessage('This reset link is invalid or has expired. Please request a new one.');
    } catch (error: any) {
      console.error('Password recovery session error:', error);
      setErrorMessage(error?.message || 'This reset link is invalid or has expired. Please request a new one.');
      setLinkReady(false);
    } finally {
      setVerifyingLink(false);
    }
  }, [routeParams]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (!mounted) return;
      await establishRecoverySession(initialUrl);
    };

    bootstrap();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      setVerifyingLink(true);
      setErrorMessage(null);
      establishRecoverySession(url);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLinkReady(true);
        setVerifyingLink(false);
        setErrorMessage(null);
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
      authListener.subscription.unsubscribe();
    };
  }, [establishRecoverySession]);

  const goToLogin = async () => {
    try {
      await clearBiometricSession();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error clearing session after password reset:', error);
    } finally {
      router.replace('/Auth');
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Password updated',
        'Your password has been changed. Please sign in with your new password.',
        [{ text: 'OK', onPress: goToLogin }]
      );
    } catch (error: any) {
      console.error('Reset password error:', error);
      Alert.alert('Error', error?.message || 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifyingLink) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.verifyingText}>Verifying reset link…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/app-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Your Health Companion</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.subtitle}>
              Enter a new password for your MedBuddy account.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={goToLogin}>
                  <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor={COLORS.gray}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={linkReady && !loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor={COLORS.gray}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={linkReady && !loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, (!linkReady || loading) && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={!linkReady || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>Update Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={goToLogin}>
                  <Text style={styles.linkButtonText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(240, 249, 244, 1)',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 12,
    borderRadius: 28,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: Fonts.regular,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    fontFamily: Fonts.regular,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: Fonts.medium,
    textDecorationLine: 'underline',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    marginBottom: 16,
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
});
