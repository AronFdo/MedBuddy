import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, FlatList, TextInput, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useProfile } from '../../lib/ProfileContext';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

function CustomHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 32 }} />
    </View>
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
      <View style={styles.avatar}>
        {profile.profile_pic_url ? (
          <Image 
            source={{ uri: profile.profile_pic_url }} 
            style={{ width: 90, height: 90, borderRadius: 45 }}
            resizeMode="cover"
            onLoad={() => console.log('Profile image loaded successfully')}
            onError={(error) => console.error('Profile image load error:', error.nativeEvent)}
          />
        ) : (
          <Ionicons name="person-outline" size={48} color={COLORS.primary} />
        )}
      </View>
      <Text style={styles.profileName}>{profile.name || 'User Name'}</Text>
      <View style={styles.profileDetailsRow}>
        <Text style={styles.profileDetail}>{profile.age ? `${profile.age} years` : 'N/A'}</Text>
        <Text style={styles.profileDetail}>•</Text>
        <Text style={styles.profileDetail}>{profile.gender || 'N/A'}</Text>
      </View>
    </View>
  );
}

function TimelineEvent({ item, isLast }: { item: any, isLast: boolean }) {
  return (
    <View style={styles.timelineEvent}>
      <View style={styles.timelineIcon}>
        <Ionicons name="ellipse" size={12} color={COLORS.primary} />
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
        <Ionicons name={icon} size={22} color={COLORS.primary} />
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
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

  const TimeInput = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (value: string) => void, placeholder: string }) => (
    <View style={customizeStyles.timeInputContainer}>
      <Text style={customizeStyles.timeLabel}>{label}</Text>
      <TextInput
        style={customizeStyles.timeInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={customizeStyles.modalOverlay}>
        <View style={customizeStyles.modalContent}>
          <View style={customizeStyles.modalHeader}>
            <Text style={customizeStyles.modalTitle}>Customize Settings</Text>
            <TouchableOpacity onPress={onClose} style={customizeStyles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView style={customizeStyles.scrollContent}>
            {/* Meal Times Section */}
            <View style={customizeStyles.section}>
              <View style={customizeStyles.sectionHeader}>
                <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
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
              />
              <TimeInput
                label="Lunch"
                value={mealTimes.lunch}
                onChange={(value) => setMealTimes({...mealTimes, lunch: value})}
                placeholder="13:00"
              />
              <TimeInput
                label="Dinner"
                value={mealTimes.dinner}
                onChange={(value) => setMealTimes({...mealTimes, dinner: value})}
                placeholder="19:00"
              />
            </View>

            {/* Alarm Times Section */}
            <View style={customizeStyles.section}>
              <View style={customizeStyles.sectionHeader}>
                <Ionicons name="alarm-outline" size={24} color={COLORS.primary} />
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
              />
              <TimeInput
                label="Evening Alarm"
                value={alarmTimes.evening}
                onChange={(value) => setAlarmTimes({...alarmTimes, evening: value})}
                placeholder="21:00"
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
        <View style={{ backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: '85%', maxWidth: 400, shadowColor: COLORS.primary, shadowOpacity: 0.18, shadowRadius: 16, elevation: 12, position: 'relative' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: COLORS.lightGray, borderRadius: 16, padding: 4 }} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 18, color: COLORS.primary, textAlign: 'center' }}>Create Profile</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, color: COLORS.primary }}
            placeholder="Name"
            placeholderTextColor={COLORS.gray}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, color: COLORS.primary }}
            placeholder="Age"
            placeholderTextColor={COLORS.gray}
            value={age}
            onChangeText={setAge}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          />
          <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginRight: 12 }}>Gender:</Text>
            {GENDER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={{ backgroundColor: gender === opt ? COLORS.primary : COLORS.lightGray, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 }}
                onPress={() => setGender(opt)}
              >
                <Text style={{ color: gender === opt ? COLORS.white : COLORS.primary }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginRight: 12 }}>Profile Type:</Text>
            {PROFILE_TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={{ backgroundColor: profileType === opt.value ? COLORS.primary : COLORS.lightGray, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 6 }}
                onPress={() => setProfileType(opt.value)}
              >
                <Text style={{ color: profileType === opt.value ? COLORS.white : COLORS.primary }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error ? <Text style={{ color: COLORS.error, marginBottom: 10, textAlign: 'center' }}>{error}</Text> : null}
          <TouchableOpacity
            style={{ backgroundColor: (!name || !age || !gender || !profileType || loading) ? COLORS.gray : COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            onPress={handleCreate}
            disabled={!name || !age || !gender || !profileType || loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>Create</Text>}
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
          encoding: FileSystem.EncodingType.Base64,
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
        <View style={{ backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: '85%', maxWidth: 400, shadowColor: COLORS.primary, shadowOpacity: 0.18, shadowRadius: 16, elevation: 12, position: 'relative' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: COLORS.lightGray, borderRadius: 16, padding: 4 }} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 18, color: COLORS.primary, textAlign: 'center' }}>Edit Profile</Text>
          <TouchableOpacity onPress={pickImage} style={{ alignSelf: 'center', marginBottom: 16 }}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLORS.primary }} />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="camera" size={32} color={COLORS.primary} />
              </View>
            )}
            <Text style={{ color: COLORS.primary, marginTop: 6, fontWeight: 'bold' }}>Change Photo</Text>
          </TouchableOpacity>
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, color: COLORS.primary }}
            placeholder="Name"
            placeholderTextColor={COLORS.gray}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={{ borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, color: COLORS.primary }}
            placeholder="Age"
            placeholderTextColor={COLORS.gray}
            value={age}
            onChangeText={setAge}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          />
          <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginRight: 12 }}>Gender:</Text>
            {GENDER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={{ backgroundColor: gender === opt ? COLORS.primary : COLORS.lightGray, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 }}
                onPress={() => setGender(opt)}
              >
                <Text style={{ color: gender === opt ? COLORS.white : COLORS.primary }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginRight: 12 }}>Profile Type:</Text>
            {PROFILE_TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={{ backgroundColor: profileType === opt.value ? COLORS.primary : COLORS.lightGray, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 6 }}
                onPress={() => setProfileType(opt.value)}
              >
                <Text style={{ color: profileType === opt.value ? COLORS.white : COLORS.primary }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error ? <Text style={{ color: COLORS.error, marginBottom: 10, textAlign: 'center' }}>{error}</Text> : null}
          <TouchableOpacity
            style={{ backgroundColor: (!name || !age || !gender || !profileType || uploading) ? COLORS.gray : COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            onPress={handleSave}
            disabled={!name || !age || !gender || !profileType || uploading}
          >
            {uploading ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


export default function Profile() {
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

  // Fetch data for selected profile
  useEffect(() => {
    if (!profile || !profile.id) return;
    setLoading(true);
    const fetchData = async () => {
      // Fetch Health Records for profile
      const { data: recordsData } = await supabase
        .from('health_records')
        .select('*')
        .eq('profile_id', profile.id)
        .order('event_date', { ascending: false });
      setHealthRecords(recordsData || []);

      // Fetch Past Appointments for profile
      const today = new Date().toISOString();
      const { data: apptData } = await supabase
        .from('appointments')
        .select('appointment_id, date, doctor_name')
        .eq('profile_id', profile.id)
        .lt('date', today)
        .order('date', { ascending: false });
      setPastAppointments(
        apptData?.map(a => ({ ...a, name: a.doctor_name, id: a.appointment_id })) || []
      );

      // Fetch Medications for profile
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .select('*')
        .eq('profile_id', profile.id);
      
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
    <ScrollView style={styles.container}>
      <View>
        <CustomHeader title="Profile" />
        {/* Switch Profile Button */}
        <TouchableOpacity style={{ margin: 16, alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderRadius: 8, padding: 8 }} onPress={() => setShowSwitchModal(true)}>
          <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Switch Profile</Text>
        </TouchableOpacity>
        <ProfileHeader profile={profile} />
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setShowEditModal(true)} style={{ backgroundColor: COLORS.primary, borderRadius: 8, padding: 8 }}>
              <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCustomizeModal(true)} style={{ backgroundColor: COLORS.secondary, borderRadius: 8, padding: 8 }}>
              <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Customize</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      {/* Switch Profile Modal */}
      <Modal visible={showSwitchModal} animationType="fade" transparent onRequestClose={() => setShowSwitchModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: '85%', maxHeight: '75%', shadowColor: COLORS.primary, shadowOpacity: 0.18, shadowRadius: 16, elevation: 12, position: 'relative' }}>
            {/* Close (X) Button */}
            <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: COLORS.lightGray, borderRadius: 16, padding: 4 }} onPress={() => setShowSwitchModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: COLORS.primary, textAlign: 'center' }}>Switch Profile</Text>
            {profiles.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 32 }}>
                <Text style={{ marginBottom: 18, fontSize: 16, color: COLORS.gray }}>No profiles found.</Text>
                <TouchableOpacity style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 }} onPress={() => openCreateProfile(setShowSwitchModal, setShowCreateModal)}>
                  <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>Create Profile</Text>
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
                        backgroundColor: isSelected ? '#e6f7ef' : COLORS.white,
                        shadowColor: isSelected ? COLORS.primary : undefined,
                        shadowOpacity: isSelected ? 0.08 : 0,
                        shadowRadius: isSelected ? 8 : 0,
                        elevation: isSelected ? 2 : 0,
                      }}
                      onPress={() => {
                        setProfile(item);
                        setShowSwitchModal(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Switch to profile ${item.name || 'Unnamed Profile'}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 17 }}>{item.name || 'Unnamed Profile'}</Text>
                        <Text style={{ color: COLORS.gray, fontSize: 15 }}>{item.age ? `${item.age} years` : ''} {item.gender || ''}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={<TouchableOpacity style={{ marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center' }} onPress={() => openCreateProfile(setShowSwitchModal, setShowCreateModal)}><Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>Create Profile</Text></TouchableOpacity>}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  profileDetail: {
    fontSize: 16,
    color: COLORS.gray,
    marginHorizontal: 6,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
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
    color: COLORS.gray,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
  timelineDetails: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardItemText: {
    fontSize: 16,
    color: '#374151',
  },
  cardItemDate: {
    fontSize: 14,
    color: COLORS.gray,
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
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    fontWeight: 'bold',
    color: COLORS.primary,
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
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  timeInputContainer: {
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.lightGray,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
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
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: '600',
  },
}); 