import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, FlatList, TextInput, Platform, Image, Alert, Linking, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { useProfile } from '../../lib/ProfileContext';
import NotificationSettings from '../../components/NotificationSettings';
import { Fonts } from '../../constants/Fonts';
import {
  canUseBiometrics,
  clearBiometricSession,
  enableBiometricsWithSession,
  getBiometricLabel,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../../lib/biometricAuth';

const COLORS = {
  primary: '#25D366',
  secondary: '#7BE0AD',
  text: '#011A05',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

function CustomHeader({ title, onSettingsPress }: { title: string; onSettingsPress?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {onSettingsPress ? (
        <TouchableOpacity style={styles.headerSettingsButton} onPress={onSettingsPress}>
          <Ionicons name="settings-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 32 }} />
      )}
    </View>
  );
}

function FloatingSettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.floatingSettingsButton} onPress={onPress}>
      <Ionicons name="settings-outline" size={24} color={COLORS.text} />
    </TouchableOpacity>
  );
}

function ProfileSidebar({
  visible,
  onClose,
  onEditProfile,
  onCustomize,
  onSwitchProfile,
  onLogout,
  onChangePassword,
  onDeleteProfile,
  profile,
  biometricAvailable,
  biometricEnabled,
  biometricLabel,
  onToggleBiometric,
}: {
  visible: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onCustomize: () => void;
  onSwitchProfile: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
  onDeleteProfile: () => void;
  profile: any;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricLabel: string;
  onToggleBiometric: (enabled: boolean) => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sidebarOverlay}>
        <TouchableOpacity style={styles.sidebarBackdrop} onPress={onClose} />
        <View style={styles.sidebarContent}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Settings</Text>
            <TouchableOpacity style={styles.sidebarCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sidebarMenu}>
            <TouchableOpacity 
              style={styles.sidebarMenuItem} 
              onPress={() => {
                onEditProfile();
                onClose();
              }}
            >
              <Ionicons name="create-outline" size={24} color={COLORS.text} />
              <Text style={styles.sidebarMenuItemText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sidebarMenuItem} 
              onPress={() => {
                onCustomize();
                onClose();
              }}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.text} />
              <Text style={styles.sidebarMenuItemText}>Customize</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sidebarMenuItem} 
              onPress={() => {
                onSwitchProfile();
                onClose();
              }}
            >
              <Ionicons name="people-outline" size={24} color={COLORS.text} />
              <Text style={styles.sidebarMenuItemText}>Switch Profile</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
            
            {profile?.profile_type === 'myself' ? (
              <TouchableOpacity 
                style={styles.sidebarMenuItem} 
                onPress={() => {
                  onChangePassword();
                  onClose();
                }}
              >
              <Ionicons name="lock-closed-outline" size={24} color={COLORS.text} />
                <Text style={styles.sidebarMenuItemText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.sidebarMenuItem, styles.sidebarMenuItemDanger]} 
                onPress={() => {
                  onDeleteProfile();
                  onClose();
                }}
              >
                <Ionicons name="trash-outline" size={24} color={COLORS.error} />
                <Text style={[styles.sidebarMenuItemText, styles.sidebarMenuItemTextDanger]}>Delete Profile</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.error} />
              </TouchableOpacity>
            )}

            {biometricAvailable && (
              <View style={styles.sidebarMenuItem}>
                <Ionicons
                  name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                  size={24}
                  color={COLORS.text}
                />
                <Text style={[styles.sidebarMenuItemText, { flex: 1 }]}>
                  Unlock with {biometricLabel}
                </Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={onToggleBiometric}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.secondary }}
                  thumbColor={biometricEnabled ? COLORS.primary : '#f4f3f4'}
                />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.sidebarMenuItem}
              onPress={async () => {
                const url = 'https://medbuddy-app.com/privacy';
                try {
                  await Linking.openURL(url);
                } catch (error) {
                  Alert.alert('Unable to open', 'Could not open the Privacy Policy. Please visit medbuddy-app.com/privacy');
                }
                onClose();
              }}
            >
              <Ionicons name="document-text-outline" size={24} color={COLORS.text} />
              <Text style={styles.sidebarMenuItemText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.sidebarDivider} />
            
            <TouchableOpacity 
              style={[styles.sidebarMenuItem, styles.sidebarMenuItemDanger]} 
              onPress={() => {
                onLogout();
                onClose();
              }}
            >
              <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
              <Text style={[styles.sidebarMenuItemText, styles.sidebarMenuItemTextDanger]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileHeader({ profile }: { profile: any }) {
  if (!profile) return null;
  console.log('ProfileHeader rendering with profile:', { 
    name: profile.name, 
    profile_pic_url: profile.profile_pic_url 
  });
  return (
    <View style={styles.profileHeader}>
      <View style={styles.profileHeaderContent}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {profile.profile_pic_url ? (
              <Image 
                source={{ uri: profile.profile_pic_url }} 
                style={styles.avatarImage}
                resizeMode="cover"
                onLoad={() => console.log('Profile image loaded successfully')}
                onError={(error) => console.error('Profile image load error:', error.nativeEvent)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.text} />
              </View>
            )}
          </View>
          <View style={styles.profileTextInfo}>
            <Text style={styles.profileName}>{profile.name || 'User Name'}</Text>
            <View style={styles.profileDetailsRow}>
              <View style={styles.profileDetailItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.text} />
                <Text style={styles.profileDetail}>{profile.age ? `${profile.age} years` : 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <Ionicons name="person-outline" size={16} color={COLORS.text} />
                <Text style={styles.profileDetail}>{profile.gender || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function TimelineEvent({ item, isLast }: { item: any, isLast: boolean }) {
  return (
    <View style={styles.timelineEvent}>
      <View style={styles.timelineIcon}>
        <Ionicons name="ellipse" size={12} color={COLORS.text} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineDate}>{new Date(item.event_date).toDateString()}</Text>
        <Text style={styles.timelineTitle}>{item.title}</Text>
        <Text style={styles.timelineDetails}>{item.details}</Text>
      </View>
    </View>
  );
}

function InfoCard({ title, data, icon }: { title: string; data: any[]; icon: any }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={22} color={COLORS.text} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {data && data.length > 0 ? (
        data.map((item) => (
          <View key={item.id} style={styles.cardItem}>
            <Text style={styles.cardItemText}>{item.name}</Text>
            <Text style={styles.cardItemDate}>
              {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.cardItem}>
          <Text style={styles.cardItemText}>No data available</Text>
        </View>
      )}
    </View>
  );
}

function CustomizeModal({ visible, onClose, profile, onSave }: { visible: boolean, onClose: () => void, profile: any, onSave: (updated: any) => void }) {
  const [mealTimes, setMealTimes] = useState({
    breakfast: profile?.meal_times?.breakfast || '08:00',
    lunch: profile?.meal_times?.lunch || '13:00',
    dinner: profile?.meal_times?.dinner || '19:00'
  });
  const [alarmTimes, setAlarmTimes] = useState({
    morning: profile?.alarm_times?.morning || '07:00',
    evening: profile?.alarm_times?.evening || '21:00'
  });
  const [timeErrors, setTimeErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate time format: HH:MM (24-hour format)
  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  // Format and validate time input as user types
  const formatTimeInput = (input: string): string => {
    // Remove any non-numeric characters except colon
    let cleaned = input.replace(/[^\d:]/g, '');
    
    // If input is empty, return empty
    if (cleaned.length === 0) return '';
    
    // If first character is > 2, insert 0 prefix
    if (cleaned.length === 1 && parseInt(cleaned) > 2) {
      cleaned = '0' + cleaned;
    }
    
    // If hours > 23, cap at 23
    if (cleaned.length >= 2 && !cleaned.includes(':')) {
      const hours = parseInt(cleaned.substring(0, 2));
      if (hours > 23) {
        cleaned = '23' + cleaned.substring(2);
      }
    }
    
    // Add colon after 2 digits if not present
    if (cleaned.length >= 2 && !cleaned.includes(':')) {
      cleaned = cleaned.substring(0, 2) + ':' + cleaned.substring(2);
    }
    
    // Limit to 5 characters (HH:MM)
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5);
    }
    
    // Ensure minutes are valid (00-59)
    if (cleaned.includes(':') && cleaned.length >= 4) {
      const parts = cleaned.split(':');
      if (parts.length === 2 && parts[1].length > 0) {
        const minutes = parseInt(parts[1].substring(0, 2));
        if (minutes > 59) {
          cleaned = parts[0] + ':59';
        }
      }
    }
    
    return cleaned;
  };

  // Validate a time value and return error message if invalid
  const validateTime = (time: string, fieldName: string): string => {
    if (!time || time.trim() === '') {
      return `${fieldName} is required`;
    }
    
    if (time.length !== 5) {
      return 'Time must be in HH:MM format (e.g., 08:00)';
    }
    
    if (!validateTimeFormat(time)) {
      return 'Invalid time format. Use 24-hour format (00:00 - 23:59)';
    }
    
    return '';
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setTimeErrors({});
    
    // Validate all times before saving
    const errors: {[key: string]: string} = {};
    let hasErrors = false;

    // Validate meal times
    const breakfastError = validateTime(mealTimes.breakfast, 'Breakfast time');
    if (breakfastError) {
      errors.breakfast = breakfastError;
      hasErrors = true;
    }

    const lunchError = validateTime(mealTimes.lunch, 'Lunch time');
    if (lunchError) {
      errors.lunch = lunchError;
      hasErrors = true;
    }

    const dinnerError = validateTime(mealTimes.dinner, 'Dinner time');
    if (dinnerError) {
      errors.dinner = dinnerError;
      hasErrors = true;
    }

    // Validate alarm times
    const morningError = validateTime(alarmTimes.morning, 'Morning alarm');
    if (morningError) {
      errors.morning = morningError;
      hasErrors = true;
    }

    const eveningError = validateTime(alarmTimes.evening, 'Evening alarm');
    if (eveningError) {
      errors.evening = eveningError;
      hasErrors = true;
    }

    if (hasErrors) {
      setTimeErrors(errors);
      setError('Please fix all time validation errors before saving.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) {
        setError('User or profile not found.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          meal_times: mealTimes,
          alarm_times: alarmTimes
        })
        .eq('id', profile.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        onSave({ ...profile, meal_times: mealTimes, alarm_times: alarmTimes });
        onClose();
      }
    } catch (e) {
      setError('Failed to save customization settings.');
    } finally {
      setLoading(false);
    }
  };

  const TimeInput = ({ label, value, onChange, placeholder, error, fieldName }: { 
    label: string, 
    value: string, 
    onChange: (value: string) => void, 
    placeholder: string,
    error?: string,
    fieldName: string
  }) => {
    const handleTimeChange = (text: string) => {
      const formatted = formatTimeInput(text);
      onChange(formatted);
      
      // Clear error for this field when user starts typing
      if (timeErrors[fieldName]) {
        const newErrors = { ...timeErrors };
        delete newErrors[fieldName];
        setTimeErrors(newErrors);
      }
    };

    const handleBlur = () => {
      // Validate when user leaves the field
      const validationError = validateTime(value, label);
      if (validationError) {
        setTimeErrors({ ...timeErrors, [fieldName]: validationError });
      }
    };

    return (
      <View style={customizeStyles.timeInputContainer}>
        <Text style={customizeStyles.timeLabel}>{label}</Text>
        <TextInput
          style={[customizeStyles.timeInput, error && customizeStyles.timeInputError]}
          value={value}
          onChangeText={handleTimeChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray}
          keyboardType="numeric"
          maxLength={5}
        />
        {error && <Text style={customizeStyles.timeErrorText}>{error}</Text>}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={customizeStyles.modalOverlay}>
        <View style={customizeStyles.modalContent}>
          <View style={customizeStyles.modalHeader}>
            <Text style={customizeStyles.modalTitle}>Customize Settings</Text>
            <TouchableOpacity onPress={onClose} style={customizeStyles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={customizeStyles.scrollContent}>
            {/* Meal Times Section */}
            <View style={customizeStyles.section}>
              <View style={customizeStyles.sectionHeader}>
                <Ionicons name="restaurant-outline" size={24} color={COLORS.text} />
                <Text style={customizeStyles.sectionTitle}>Meal Times</Text>
              </View>
              <Text style={customizeStyles.sectionDescription}>
                Set your preferred meal times to help schedule medication reminders
              </Text>
              
              <TimeInput
                label="Breakfast"
                value={mealTimes.breakfast}
                onChange={(value) => setMealTimes({...mealTimes, breakfast: value})}
                placeholder="08:00"
                error={timeErrors.breakfast}
                fieldName="breakfast"
              />
              <TimeInput
                label="Lunch"
                value={mealTimes.lunch}
                onChange={(value) => setMealTimes({...mealTimes, lunch: value})}
                placeholder="13:00"
                error={timeErrors.lunch}
                fieldName="lunch"
              />
              <TimeInput
                label="Dinner"
                value={mealTimes.dinner}
                onChange={(value) => setMealTimes({...mealTimes, dinner: value})}
                placeholder="19:00"
                error={timeErrors.dinner}
                fieldName="dinner"
              />
            </View>

            {/* Alarm Times Section */}
            <View style={customizeStyles.section}>
              <View style={customizeStyles.sectionHeader}>
                <Ionicons name="alarm-outline" size={24} color={COLORS.text} />
                <Text style={customizeStyles.sectionTitle}>Alarm Times</Text>
              </View>
              <Text style={customizeStyles.sectionDescription}>
                Set general alarm times for medication reminders
              </Text>
              
              <TimeInput
                label="Morning Alarm"
                value={alarmTimes.morning}
                onChange={(value) => setAlarmTimes({...alarmTimes, morning: value})}
                placeholder="07:00"
                error={timeErrors.morning}
                fieldName="morning"
              />
              <TimeInput
                label="Evening Alarm"
                value={alarmTimes.evening}
                onChange={(value) => setAlarmTimes({...alarmTimes, evening: value})}
                placeholder="21:00"
                error={timeErrors.evening}
                fieldName="evening"
              />
            </View>

            {error ? <Text style={customizeStyles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={customizeStyles.buttonContainer}>
            <TouchableOpacity style={customizeStyles.cancelButton} onPress={onClose}>
              <Text style={customizeStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[customizeStyles.saveButton, loading && customizeStyles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={customizeStyles.saveButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const PROFILE_TYPE_OPTIONS = [
  { label: 'Myself', value: 'myself' },
  { label: 'Parent', value: 'parent' },
  { label: 'Grandparent', value: 'grandparent' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Child', value: 'child' },
];

function CreateProfileModal({ visible, onClose, onCreated, userId }: { visible: boolean, onClose: () => void, onCreated: (profile: any) => void, userId: string }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [profileType, setProfileType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName(''); setAge(''); setGender(''); setProfileType(''); setError('');
  };

  useEffect(() => { if (!visible) reset(); }, [visible]);

  const handleCreate = async () => {
    if (!name || !age || !gender || !profileType) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: supaError } = await supabase.from('profiles').insert({
        user_id: userId,
        name,
        age: Number(age),
        gender,
        profile_type: profileType,
      }).select().single();
      if (supaError) {
        setError(supaError.message);
      } else if (data) {
        onCreated(data);
        onClose();
      }
    } catch (e: any) {
      setError('Failed to create profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'rgba(240, 249, 244, 1)', borderRadius: 20, padding: 24, width: '85%', maxWidth: 400, position: 'relative' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: COLORS.lightGray, borderRadius: 16, padding: 4 }} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: Fonts.bold, marginBottom: 18, color: COLORS.text, textAlign: 'center' }}>Create Profile</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, fontFamily: Fonts.regular, color: COLORS.text, backgroundColor: COLORS.white }}
            placeholder="Name"
            placeholderTextColor={COLORS.gray}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, fontFamily: Fonts.regular, color: COLORS.text, backgroundColor: COLORS.white }}
            placeholder="Age"
            placeholderTextColor={COLORS.gray}
            value={age}
            onChangeText={setAge}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          />
          <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', marginRight: 12 }}>Gender:</Text>
            {GENDER_OPTIONS.map(opt => {
              const isSelected = gender === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.lightGray,
                  }}
                  onPress={() => setGender(opt)}
                >
                  <Text style={{ color: isSelected ? COLORS.primary : COLORS.text }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', marginRight: 12 }}>Profile Type:</Text>
            {PROFILE_TYPE_OPTIONS.map(opt => {
              const isSelected = profileType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    marginRight: 8,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.lightGray,
                  }}
                  onPress={() => setProfileType(opt.value)}
                >
                  <Text style={{ color: isSelected ? COLORS.primary : COLORS.text }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error ? <Text style={{ color: COLORS.error, marginBottom: 10, textAlign: 'center' }}>{error}</Text> : null}
          <TouchableOpacity
            style={{ backgroundColor: (!name || !age || !gender || !profileType || loading) ? COLORS.gray : COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            onPress={handleCreate}
            disabled={!name || !age || !gender || !profileType || loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontFamily: Fonts.bold, fontSize: 16 }}>Create</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Helper to open Create Profile modal after closing Switch Profile modal
function openCreateProfile(setShowSwitchModal: (v: boolean) => void, setShowCreateModal: (v: boolean) => void) {
  setShowSwitchModal(false);
  setTimeout(() => setShowCreateModal(true), 300); // 300ms delay for modal transition
}

function EditProfileModal({ visible, onClose, profile, onSave }: { visible: boolean, onClose: () => void, profile: any, onSave: (updated: any) => void }) {
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [profileType, setProfileType] = useState(profile?.profile_type || '');
  const [profilePic, setProfilePic] = useState(profile?.profile_pic_url || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Function to check and create storage bucket if needed
  const ensureStorageBucket = async () => {
    try {
      // Try to list files in the bucket to check if it exists
      const { data, error } = await supabase.storage.from('profile-pics').list();
      if (error && error.message.includes('not found')) {
        console.log('Storage bucket does not exist, creating...');
        // Note: Bucket creation should be done via Supabase dashboard or migrations
        // This is just for checking if the bucket exists
        throw new Error('Storage bucket "profile-pics" does not exist. Please create it in your Supabase dashboard.');
      }
      return true;
    } catch (e: any) {
      console.error('Storage bucket check failed:', e);
      throw e;
    }
  };

  // Function to validate image before upload
  const validateImage = (blob: Blob) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (blob.size === 0) {
      throw new Error('Image file is empty');
    }
    
    if (blob.size > maxSize) {
      throw new Error(`Image file is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
    }
    
    if (!allowedTypes.includes(blob.type)) {
      throw new Error(`Unsupported image format. Allowed formats: JPEG, PNG`);
    }
    
    return true;
  };

  useEffect(() => {
    if (visible) {
      setName(profile?.name || '');
      setAge(profile?.age ? String(profile.age) : '');
      setGender(profile?.gender || '');
      setProfileType(profile?.profile_type || '');
      setProfilePic(profile?.profile_pic_url || '');
      setError('');
    }
  }, [visible, profile]);

  const pickImage = async () => {
    setError('');
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9, // Higher quality for better results
        base64: false, // Disable base64 to avoid conversion issues
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Image selected:', {
          uri: asset.uri,
          type: asset.type,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });
        setProfilePic(asset.uri);
      }
    } catch (e) {
      console.error('Image picker error:', e);
      setError('Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!name || !age || !gender || !profileType) {
      setError('Please fill in all fields.');
      return;
    }
    setUploading(true);
    setError('');
    let uploadedUrl = profilePic;
    
    // If the profilePic is a local URI, upload to Supabase Storage
    if (profilePic && profilePic.startsWith('file://')) {
      try {
        console.log('Starting image upload...');
        
        // Check if storage bucket exists
        await ensureStorageBucket();
        
        const fileName = `profile_${profile.id}_${Date.now()}.jpg`;
        console.log('Uploading file:', { fileName, uri: profilePic });
        
        // Read file as base64 using FileSystem
        console.log('Reading file with FileSystem...');
        const base64Data = await FileSystem.readAsStringAsync(profilePic, {
          encoding: 'base64',  // ✅ use string literal
        });
        
        console.log('File read successfully, base64 length:', base64Data.length);
        
        // Validate the data
        if (!base64Data || base64Data.length < 100) {
          throw new Error('Image file is too small or empty');
        }
        
        // Convert base64 to Uint8Array for upload (React Native compatible)
        const binaryData = new Uint8Array(atob(base64Data).split('').map(char => char.charCodeAt(0)));
        console.log('Binary data prepared:', { size: binaryData.length });
        
        // Upload binary data to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('profile-pics')
          .upload(fileName, binaryData, { 
            upsert: true,
            contentType: 'image/jpeg'
          });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        console.log('Upload successful:', data);
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('profile-pics')
          .getPublicUrl(fileName);
        
        uploadedUrl = publicUrlData?.publicUrl || '';
        console.log('Public URL:', uploadedUrl);
        
      } catch (e: any) {
        console.error('Image upload error:', e);
        setError(`Failed to upload image: ${e.message || 'Unknown error'}`);
        setUploading(false);
        return;
      }
    }
    
    // Update profile in DB
    try {
      const { error: updateError, data: updated } = await supabase
        .from('profiles')
        .update({
          name,
          age: Number(age),
          gender,
          profile_type: profileType,
          profile_pic_url: uploadedUrl,
        })
        .eq('id', profile.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('Profile update error:', updateError);
        setError(`Failed to update profile: ${updateError.message}`);
      } else {
        console.log('Profile updated successfully:', updated);
        onSave(updated);
        onClose();
      }
    } catch (e: any) {
      console.error('Profile update error:', e);
      setError(`Failed to update profile: ${e.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'rgba(240, 249, 244, 1)', borderRadius: 20, padding: 24, width: '85%', maxWidth: 400, position: 'relative' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: COLORS.lightGray, borderRadius: 16, padding: 4 }} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: Fonts.bold, marginBottom: 18, color: COLORS.text, textAlign: 'center' }}>Edit Profile</Text>
          <TouchableOpacity onPress={pickImage} style={{ alignSelf: 'center', marginBottom: 16 }}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLORS.primary }} />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.lightGray }}>
                <Ionicons name="camera" size={32} color={COLORS.text} />
              </View>
            )}
            <Text style={{ color: COLORS.text, marginTop: 6, fontFamily: Fonts.bold }}>Change Photo</Text>
          </TouchableOpacity>
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, fontFamily: Fonts.regular, color: COLORS.text, backgroundColor: COLORS.white }}
            placeholder="Name"
            placeholderTextColor={COLORS.gray}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, fontFamily: Fonts.regular, color: COLORS.text, backgroundColor: COLORS.white }}
            placeholder="Age"
            placeholderTextColor={COLORS.gray}
            value={age}
            onChangeText={setAge}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          />
          <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', marginRight: 12 }}>Gender:</Text>
            {GENDER_OPTIONS.map(opt => {
              const isSelected = gender === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.lightGray,
                  }}
                  onPress={() => setGender(opt)}
                >
                  <Text style={{ color: isSelected ? COLORS.primary : COLORS.text }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', marginRight: 12 }}>Profile Type:</Text>
            {PROFILE_TYPE_OPTIONS.map(opt => {
              const isSelected = profileType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    marginRight: 8,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.lightGray,
                  }}
                  onPress={() => setProfileType(opt.value)}
                >
                  <Text style={{ color: isSelected ? COLORS.primary : COLORS.text }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error ? <Text style={{ color: COLORS.error, marginBottom: 10, textAlign: 'center' }}>{error}</Text> : null}
          <TouchableOpacity
            style={{ backgroundColor: (!name || !age || !gender || !profileType || uploading) ? COLORS.gray : COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            onPress={handleSave}
            disabled={!name || !age || !gender || !profileType || uploading}
          >
            {uploading ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontFamily: Fonts.bold, fontSize: 16 }}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


export default function Profile() {
  const router = useRouter();
  const { profile, profiles, setProfile, refreshProfiles, loading: profileLoading } = useProfile();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [pastAppointments, setPastAppointments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    const loadBiometricSettings = async () => {
      const [available, enabled, label] = await Promise.all([
        canUseBiometrics(),
        isBiometricEnabled(),
        getBiometricLabel(),
      ]);
      setBiometricAvailable(available);
      setBiometricEnabledState(enabled);
      setBiometricLabel(label);
    };
    loadBiometricSettings();
  }, []);

  const handleToggleBiometric = async (enabled: boolean) => {
    try {
      if (enabled) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          Alert.alert('Sign in required', 'Please sign in again before enabling biometric unlock.');
          return;
        }
        const success = await enableBiometricsWithSession(session);
        if (!success) {
          Alert.alert('Not enabled', `${biometricLabel} was not enabled. Please try again.`);
          setBiometricEnabledState(false);
          return;
        }
        setBiometricEnabledState(true);
        Alert.alert('Enabled', `${biometricLabel} unlock is now turned on.`);
      } else {
        await setBiometricEnabled(false);
        setBiometricEnabledState(false);
      }
    } catch (error) {
      console.error('Biometric toggle error:', error);
      Alert.alert('Error', `Could not update ${biometricLabel} settings.`);
    }
  };
  // Fetch data for selected profile
  useEffect(() => {
    if (!profile || !profile.id) return;
    setLoading(true);
    const fetchData = async () => {
      // Fetch Health Records for profile
      const { data: recordsData } = await supabase
        .from('health_records')
        .select('id, profile_id, event_date, record_type, title, attachment_url, details')
        .eq('profile_id', profile.id)
        .order('event_date', { ascending: false })
        .limit(30); // Limit to recent records
      setHealthRecords(recordsData || []);

      // Fetch Past Appointments for profile
      const today = new Date().toISOString();
      const { data: apptData } = await supabase
        .from('appointments')
        .select('appointment_id, date, doctor_name')
        .eq('profile_id', profile.id)
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(50); // Limit to recent past appointments
      setPastAppointments(
        apptData?.map(a => ({ ...a, name: a.doctor_name, id: a.appointment_id })) || []
      );

      // Fetch Medications for profile
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .select('*')
        .eq('profile_id', profile.id)
        .limit(100); // Limit to prevent over-fetching
      
      console.log('Profile - Fetched medications:', medData, 'Error:', medError);
      
      if (medError) {
        console.error('Profile - Medication fetch error:', medError);
        setMedications([]);
      } else {
        const mappedMedications = (medData as any[])?.map(m => ({ 
          id: m.medication_id || m.id, 
          name: m.name, 
          days_remaining: m.days_remaining, 
          date: m.created_at || m.prescribed_date || new Date().toISOString()
        })) || [];
        console.log('Profile - Mapped medications:', mappedMedications);
        setMedications(mappedMedications);
      }
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  if (profileLoading || loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View>
          <CustomHeader title="Profile" onSettingsPress={() => setShowSidebar(true)} />
          <ProfileHeader profile={profile} />
          
          {/* Notification Settings */}
          <NotificationSettings profileId={profile?.id} />
          
          <EditProfileModal visible={showEditModal} onClose={() => setShowEditModal(false)} profile={profile} onSave={async (updated) => {
            console.log('Profile updated, refreshing data...', updated);
            // Refresh profiles and update selected profile
            await refreshProfiles();
            setProfile(updated);
            console.log('Profile refresh completed');
          }} />
          <CustomizeModal 
            visible={showCustomizeModal} 
            onClose={() => setShowCustomizeModal(false)} 
            profile={profile} 
            onSave={async (updated) => {
              // Refresh profiles and update selected profile
              await refreshProfiles();
              setProfile(updated);
            }} 
          />
          {/* ... rest of the sections ... */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Record Timeline</Text>
            <View style={styles.timelineContainer}>
              {healthRecords.map((item, index) => (
                <TimelineEvent key={item.id} item={item} isLast={index === healthRecords.length - 1} />
              ))}
            </View>
          </View>
          <InfoCard title="Past Appointments" data={pastAppointments} icon="calendar-outline" />
          <InfoCard title="Medication History" data={medications} icon="medkit-outline" />
        </View>
      </ScrollView>
      
      {/* Profile Sidebar */}
      <ProfileSidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        onEditProfile={() => setShowEditModal(true)}
        onCustomize={() => setShowCustomizeModal(true)}
        onSwitchProfile={() => setShowSwitchModal(true)}
        biometricAvailable={biometricAvailable}
        biometricEnabled={biometricEnabled}
        biometricLabel={biometricLabel}
        onToggleBiometric={handleToggleBiometric}
        onLogout={async () => {
          await clearBiometricSession();
          setBiometricEnabledState(false);
          await supabase.auth.signOut();
          router.replace('/Auth');
        }}
        onChangePassword={() => {
          // TODO: Implement change password functionality
          alert('Change password functionality coming soon!');
        }}
        onDeleteProfile={async () => {
          if (!profile) return;
          
          // Show confirmation dialog
          const confirmed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Delete Profile',
              `Are you sure you want to delete the profile "${profile.name}"? This action cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
              ]
            );
          });
          
          if (confirmed) {
            try {
              // Delete the profile from the database
              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', profile.id);
              
              if (error) {
                Alert.alert('Error', `Failed to delete profile: ${error.message}`);
              } else {
                // Refresh profiles and select the first available profile
                await refreshProfiles();
                // After refresh, check if there are any profiles left
                if (profiles.length > 1) {
                  // There are other profiles, select the first one
                  const remainingProfiles = profiles.filter(p => p.id !== profile.id);
                  if (remainingProfiles.length > 0) {
                    setProfile(remainingProfiles[0]);
                  }
                } else {
                  // No profiles left, user will need to create a new one
                  setProfile(null);
                }
                Alert.alert('Success', 'Profile deleted successfully');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete profile');
            }
          }
        }}
        profile={profile}
      />
      
      {/* Switch Profile Modal */}
      <Modal visible={showSwitchModal} animationType="fade" transparent onRequestClose={() => setShowSwitchModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(240, 249, 244, 1)', borderRadius: 20, padding: 24, width: '85%', maxHeight: '75%', position: 'relative' }}>
            {/* Close (X) Button */}
            <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: COLORS.lightGray, borderRadius: 16, padding: 4 }} onPress={() => setShowSwitchModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontFamily: Fonts.bold, marginBottom: 20, color: COLORS.text, textAlign: 'center' }}>Switch Profile</Text>
            {profiles.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 32 }}>
                <Text style={{ marginBottom: 18, fontSize: 16, fontFamily: Fonts.regular, color: COLORS.gray }}>No profiles found.</Text>
                <TouchableOpacity style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 }} onPress={() => openCreateProfile(setShowSwitchModal, setShowCreateModal)}>
                  <Text style={{ color: COLORS.white, fontFamily: Fonts.bold, fontSize: 16 }}>Create Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={profiles}
                keyExtractor={item => item.id}
                style={{ marginBottom: 12 }}
                renderItem={({ item }) => {
                  const isSelected = profile && profile.id === item.id;
                  return (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        marginBottom: 10,
                        borderRadius: 12,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? COLORS.primary : COLORS.lightGray,
                        backgroundColor: COLORS.white,
                      }}
                      onPress={() => {
                        setProfile(item);
                        setShowSwitchModal(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Switch to profile ${item.name || 'Unnamed Profile'}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.text, fontFamily: Fonts.bold, fontSize: 17 }}>{item.name || 'Unnamed Profile'}</Text>
                        <Text style={{ color: COLORS.gray, fontSize: 15, fontFamily: Fonts.regular }}>{item.age ? `${item.age} years` : ''} {item.gender || ''}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.text} style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={<TouchableOpacity style={{ marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center' }} onPress={() => openCreateProfile(setShowSwitchModal, setShowCreateModal)}><Text style={{ color: COLORS.white, fontFamily: Fonts.bold, fontSize: 16 }}>Create Profile</Text></TouchableOpacity>}
              />
            )}
          </View>
        </View>
      </Modal>
      {/* Create Profile Modal */}
      {userId && <CreateProfileModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} userId={userId} onCreated={async (newProfile) => {
        // Refresh profiles and select new profile
        await refreshProfiles();
        setProfile(newProfile);
      }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 0,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerSettingsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  profileHeader: {
    backgroundColor: 'rgba(240, 249, 244, 0.95)',
    borderRadius: 24,
    marginTop: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.1)',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    textAlign: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  profileDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  profileDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileDetail: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: COLORS.gray,
    marginHorizontal: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    marginBottom: 12,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  timelineContainer: {
    paddingLeft: 10,
  },
  timelineEvent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIcon: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineDate: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: COLORS.gray,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  timelineDetails: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: COLORS.text,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: 'rgba(240, 249, 244, 0.95)',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    marginLeft: 8,
    flexWrap: 'wrap',
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexWrap: 'wrap',
  },
  cardItemText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: COLORS.text,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  cardItemDate: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: COLORS.gray,
  },
  actionButtonsContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: COLORS.white,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  secondaryActionButton: {
    backgroundColor: COLORS.secondary,
  },
  secondaryActionButtonText: {
    color: COLORS.white,
  },
  switchProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    margin: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  switchProfileButtonText: {
    color: COLORS.white,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  // Sidebar styles
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sidebarBackdrop: {
    flex: 1,
  },
  sidebarContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sidebarTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: COLORS.text,
  },
  sidebarCloseButton: {
    padding: 4,
  },
  sidebarMenu: {
    padding: 16,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(240, 249, 244, 1)',
  },
  sidebarMenuItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: COLORS.text,
    marginLeft: 12,
  },
  sidebarMenuItemDanger: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  sidebarMenuItemTextDanger: {
    color: COLORS.error,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 16,
  },
  // Updated ProfileHeader styles
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileTextInfo: {
    marginLeft: 16,
    flex: 1,
    flexShrink: 1,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingSettingsButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }
});

const customizeStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(240, 249, 244, 1)',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: COLORS.text,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: COLORS.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  timeInputContainer: {
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: COLORS.text,
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: Fonts.regular,
    backgroundColor: COLORS.white,
  },
  timeInputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  timeErrorText: {
    color: COLORS.error,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#011A05',
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
}); 