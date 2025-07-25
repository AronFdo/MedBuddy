import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, FlatList, TextInput, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

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
  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatar}>
        <Ionicons name="person-outline" size={48} color={COLORS.primary} />
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
      {data.map((item) => (
        <View key={item.id} style={styles.cardItem}>
          <Text style={styles.cardItemText}>{item.name}</Text>
          <Text style={styles.cardItemDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
      ))}
    </View>
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
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfilePic(result.assets[0].uri);
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
        const response = await fetch(profilePic);
        const blob = await response.blob();
        const fileExt = profilePic.split('.').pop();
        const fileName = `profile_${profile.id}_${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage.from('profile-pics').upload(fileName, blob, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('profile-pics').getPublicUrl(fileName);
        uploadedUrl = publicUrlData?.publicUrl || '';
      } catch (e) {
        setError('Failed to upload image.');
        setUploading(false);
        return;
      }
    }
    // Update profile in DB
    const { error: updateError, data: updated } = await supabase.from('profiles').update({
      name,
      age: Number(age),
      gender,
      profile_type: profileType,
      profile_pic_url: uploadedUrl,
    }).eq('id', profile.id).select().single();
    if (updateError) {
      setError(updateError.message);
    } else {
      onSave(updated);
      onClose();
    }
    setUploading(false);
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
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [pastAppointments, setPastAppointments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch profiles and set default profile on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: allProfiles } = await supabase.from('profiles').select('*').eq('user_id', user.id);
        setProfiles(allProfiles || []);
        setProfile(allProfiles && allProfiles.length > 0 ? allProfiles[0] : null);
      }
      setLoading(false);
    };
    fetchProfiles();
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
      const { data: medData } = await supabase
        .from('medications')
        .select('medication_id, name, days_remaining')
        .eq('profile_id', profile.id);
      setMedications(
        (medData as any[])?.map(m => ({ id: m.medication_id, name: m.name, days_remaining: m.days_remaining })) || []
      );
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  if (loading) {
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
          <TouchableOpacity onPress={() => setShowEditModal(true)} style={{ backgroundColor: COLORS.primary, borderRadius: 8, padding: 8, marginBottom: 8 }}>
            <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Edit Profile</Text>
          </TouchableOpacity>
          {profile?.profile_pic_url ? (
            <Image source={{ uri: profile.profile_pic_url }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLORS.primary, marginBottom: 8 }} />
          ) : null}
        </View>
        <EditProfileModal visible={showEditModal} onClose={() => setShowEditModal(false)} profile={profile} onSave={async (updated) => {
          // Refresh profiles and update selected profile
          const { data: allProfiles } = await supabase.from('profiles').select('*').eq('user_id', userId);
          setProfiles(allProfiles || []);
          setProfile(updated);
        }} />
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
        const { data: allProfiles } = await supabase.from('profiles').select('*').eq('user_id', userId);
        setProfiles(allProfiles || []);
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