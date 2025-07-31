import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

const COLORS = {
  primary: '#307351',
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

// --- Add/Edit Modal Form ---
function HealthRecordForm({
  visible,
  onClose,
  onSave,
  record,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (newRecord: any) => void;
  record: any | null;
}) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [recordType, setRecordType] = useState('General Check-up');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setTitle(record.title || '');
      setDetails(record.details || '');
      setRecordType(record.record_type || 'General Check-up');
      setEventDate(record.event_date ? new Date(record.event_date) : new Date());
    } else {
      // Reset form for new record
      setTitle('');
      setDetails('');
      setRecordType('General Check-up');
      setEventDate(new Date());
    }
  }, [record]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const recordData = {
      user_id: user.id,
      title,
      details,
      record_type: recordType,
      event_date: eventDate.toISOString().slice(0, 10), // YYYY-MM-DD format
    };

    onSave({ ...recordData, id: record?.id });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{record ? 'Edit Health Record' : 'Add Health Record'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Title (e.g., Annual Check-up)"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Details"
            value={details}
            onChangeText={setDetails}
            multiline
          />
          {/* A simple text input for type, could be a picker */}
          <TextInput
            style={styles.input}
            placeholder="Record Type (e.g., General Check-up)"
            value={recordType}
            onChangeText={setRecordType}
          />

          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.datePickerText}>Event Date: {eventDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setEventDate(selectedDate);
                }
              }}
            />
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
             <Ionicons name="close" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


export default function HealthRecordScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Fetch profiles and set default profile on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: allProfiles } = await supabase.from('profiles').select('*').eq('user_id', user.id);
        setProfiles(allProfiles || []);
        setProfile(allProfiles && allProfiles.length > 0 ? allProfiles[0] : null);
      }
      setProfileLoading(false);
    };
    fetchProfiles();
  }, []);

  // Refetch health records when profile changes
  useEffect(() => {
    if (!profile || !profile.id) return;
    setLoading(true);
    setError(null);
    const fetchHealthRecords = async () => {
      const { data: records, error: recordsError } = await supabase
        .from('health_records')
        .select('*')
        .eq('profile_id', profile.id)
        .order('event_date', { ascending: false });
      if (recordsError) {
        setError('Failed to fetch health records');
        setHealthRecords([]);
      } else {
        setHealthRecords(records || []);
      }
      setLoading(false);
    };
    fetchHealthRecords();
  }, [profile]);

  if (profileLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No profile selected. Please create or select a profile in the Profile tab.</Text>
      </View>
    );
  }

  const handleSaveRecord = async (newRecord: any) => {
    let error;
    if (newRecord.id) {
      // Update existing record
      ({ error } = await supabase.from('health_records').update(newRecord).eq('id', newRecord.id));
    } else {
      // Create new record
      ({ error } = await supabase.from('health_records').insert(newRecord));
    }

    if (error) {
      console.error('Error saving record:', error.message);
    } else {
      setModalVisible(false);
      setSelectedRecord(null);
      // Refetch health records when profile changes
    }
  };

  const openAddModal = () => {
    setSelectedRecord(null);
    setModalVisible(true);
  };
  
  const openEditModal = (record: any) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Health Records" />
      <FlatList
        data={healthRecords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.recordCard} onPress={() => openEditModal(item)}>
            <View style={styles.cardIcon}>
                <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.record_type}</Text>
              <Text style={styles.cardDate}>{new Date(item.event_date).toDateString()}</Text>
            </View>
             <Ionicons name="chevron-forward" size={22} color={COLORS.gray} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ fontSize: 16, color: COLORS.gray }}>No health records found.</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
      />
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>
      <HealthRecordForm
        visible={isModalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedRecord(null);
        }}
        onSave={handleSaveRecord}
        record={selectedRecord}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  recordCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIcon: {
      marginRight: 16,
      backgroundColor: COLORS.lightGray,
      padding: 12,
      borderRadius: 24,
  },
  cardContent: {
      flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardSubtitle: {
      fontSize: 15,
      color: COLORS.primary,
      marginVertical: 2,
  },
  cardDate: {
    fontSize: 14,
    color: COLORS.gray,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  datePickerText: {
    fontSize: 16,
    color: '#111827',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
}); 