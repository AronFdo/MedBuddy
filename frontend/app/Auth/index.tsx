import React, { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Fonts } from '../../constants/Fonts';
import {
  authenticateWithBiometrics,
  canUseBiometrics,
  clearBiometricSession,
  enableBiometricsWithSession,
  getBiometricLabel,
  getStoredSessionTokens,
  isBiometricEnabled,
  saveSessionForBiometrics,
} from '../../lib/biometricAuth';
import type { Session } from '@supabase/supabase-js';

const COLORS = {
  primary: '#25D366',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  text: '#011A05',
};

function SignInScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricUnlockAvailable, setBiometricUnlockAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const offerEnableBiometrics = useCallback(async (session: Session) => {
    const available = await canUseBiometrics();
    if (!available) {
      return;
    }

    const label = await getBiometricLabel();
    Alert.alert(
      `Enable ${label}?`,
      `Use ${label} to unlock MedBuddy next time without typing your password.`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            const enabled = await enableBiometricsWithSession(session);
            if (enabled) {
              Alert.alert('Enabled', `${label} unlock is now turned on.`);
            }
          },
        },
      ]
    );
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    setBiometricLoading(true);
    try {
      const result = await authenticateWithBiometrics();
      if (!result.success) {
        return;
      }

      const tokens = await getStoredSessionTokens();
      if (!tokens) {
        Alert.alert('Sign in required', 'Please sign in with your email and password once to enable biometric unlock.');
        await clearBiometricSession();
        setBiometricUnlockAvailable(false);
        return;
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      if (error || !data.session) {
        Alert.alert('Session expired', 'Please sign in again with your email and password.');
        await clearBiometricSession();
        setBiometricUnlockAvailable(false);
        return;
      }

      await saveSessionForBiometrics(data.session);
      router.replace('/(tabs)/HomeDashboard');
    } catch (error) {
      console.error('Biometric unlock error:', error);
      Alert.alert('Error', 'Biometric unlock failed. Please sign in with your password.');
    } finally {
      setBiometricLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [available, enabled, label, tokens, sessionResult] = await Promise.all([
          canUseBiometrics(),
          isBiometricEnabled(),
          getBiometricLabel(),
          getStoredSessionTokens(),
          supabase.auth.getSession(),
        ]);

        setBiometricAvailable(available);
        setBiometricLabel(label);
        const canUnlock = available && enabled && !!tokens;
        setBiometricUnlockAvailable(canUnlock);

        if (canUnlock) {
          // Require biometrics before entering the app
          setCheckingAuth(false);
          await unlockWithBiometrics();
          return;
        }

        if (sessionResult.data.session) {
          router.replace('/(tabs)/HomeDashboard');
          return;
        }
      } catch (error) {
        console.error('Auth bootstrap error:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    bootstrap();
  }, [router, unlockWithBiometrics]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (isSignUp && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (isSignUp && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (isSignUp && !age) {
      Alert.alert('Error', 'Please enter your age');
      return;
    }
    if (isSignUp && !gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          console.error('Sign up error:', error);
          Alert.alert('Error', error.message);
        } else if (!data.session) {
          Alert.alert('Error', 'No session found. Please try signing in.');
        } else {
          await saveSessionForBiometrics(data.session);
          router.push({ pathname: '/Auth/profile-type', params: { name, age, gender } });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error('Sign in error:', error);
          Alert.alert('Error', error.message);
        } else if (!data.session) {
          Alert.alert('Error', 'No session found. Please try again.');
        } else {
          await saveSessionForBiometrics(data.session);
          const enabled = await isBiometricEnabled();
          if (biometricAvailable && !enabled) {
            await offerEnableBiometrics(data.session);
          }
          router.replace('/(tabs)/HomeDashboard');
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        Alert.alert('Network Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('reset-password'),
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Success',
          'Password reset email sent! Please check your inbox.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/app-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Your Health Companion
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up to start your health journey'
                : 'Sign in to continue your health journey'}
            </Text>

            {!isSignUp && biometricUnlockAvailable && (
              <TouchableOpacity
                style={[styles.biometricButton, biometricLoading && styles.buttonDisabled]}
                onPress={unlockWithBiometrics}
                disabled={biometricLoading || loading}
              >
                {biometricLoading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                      size={22}
                      color={COLORS.primary}
                    />
                    <Text style={styles.biometricButtonText}>
                      Unlock with {biometricLabel}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.gray}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your age"
                  placeholderTextColor={COLORS.gray}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['Male', 'Female', 'Other'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={{
                        backgroundColor: gender === option ? COLORS.primary : COLORS.white,
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        marginRight: 8,
                        borderWidth: gender === option ? 0 : 1,
                        borderColor: COLORS.lightGray,
                      }}
                      onPress={() => setGender(option)}
                    >
                      <Text style={{ color: gender === option ? COLORS.white : COLORS.text, fontFamily: Fonts.regular }}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.gray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={COLORS.gray}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading || biometricLoading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle Section */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setName('');
                setAge('');
                setGender('');
              }}
            >
              <Text style={styles.toggleButtonText}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  biometricButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
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
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: Fonts.medium,
    textDecorationLine: 'underline',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.gray,
    fontFamily: Fonts.regular,
  },
  toggleButton: {
    marginLeft: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: Fonts.semiBold,
    textDecorationLine: 'underline',
  },
});

export default SignInScreen;
