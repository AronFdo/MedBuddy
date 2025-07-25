import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

function CustomHeader({ title }: { title: string }) {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

const TABS = ['Appointments', 'Conversations'];

function AddAppointmentModalForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [doctorName, setDoctorName] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated.');
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('appointments').insert({
        user_id: user.id,
        doctor_name: doctorName,
        visit_reason: visitReason,
        date: date ? date.toISOString().slice(0, 10) : null,
        notes,
      });
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError('Failed to add appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Add Appointment</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Doctor's Name"
        value={doctorName}
        onChangeText={setDoctorName}
        placeholderTextColor={COLORS.gray}
      />
      <TextInput
        style={modalStyles.input}
        placeholder="Reason for Visit"
        value={visitReason}
        onChangeText={setVisitReason}
      />
      <TouchableOpacity style={modalStyles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: date ? COLORS.primary : COLORS.gray }}>
          {date ? date.toDateString() : 'Select Date'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
      <TextInput
        style={[modalStyles.input, { height: 60 }]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholderTextColor={COLORS.gray}
      />
      {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={modalStyles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.gray, marginTop: 8 }]} onPress={onCancel}>
        <Text style={modalStyles.saveButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

function EditAppointmentModalForm({ appointment, onSuccess, onCancel }: { appointment: any, onSuccess: () => void, onCancel: () => void }) {
  const [doctorName, setDoctorName] = useState(appointment.doctor_name || '');
  const [visitReason, setVisitReason] = useState(appointment.visit_reason || '');
  const [date, setDate] = useState<Date | null>(appointment.date ? new Date(appointment.date) : new Date());
  const [notes, setNotes] = useState(appointment.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('appointments').update({
        doctor_name: doctorName,
        visit_reason: visitReason,
        date: date ? date.toISOString().slice(0, 10) : null,
        notes,
      }).eq('appointment_id', appointment.appointment_id);
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError('Failed to update appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Edit Appointment</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Doctor's Name"
        value={doctorName}
        onChangeText={setDoctorName}
        placeholderTextColor={COLORS.gray}
      />
      <TextInput
        style={modalStyles.input}
        placeholder="Reason for Visit"
        value={visitReason}
        onChangeText={setVisitReason}
      />
      <TouchableOpacity style={modalStyles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: date ? COLORS.primary : COLORS.gray }}>
          {date ? date.toDateString() : 'Select Date'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
      <TextInput
        style={[modalStyles.input, { height: 60 }]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholderTextColor={COLORS.gray}
      />
      {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={modalStyles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.gray, marginTop: 8 }]} onPress={onCancel}>
        <Text style={modalStyles.saveButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

function RecordModal({ onClose }: { onClose: () => void }) {
  const [recording, setRecording] = useState(false);
  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Voice Recording</Text>
      <View style={{ alignItems: 'center', marginVertical: 24 }}>
        <Ionicons name={recording ? 'mic' : 'mic-outline'} size={64} color={COLORS.primary} />
        <Text style={{ marginTop: 16, fontSize: 18, color: COLORS.primary, fontWeight: 'bold' }}>
          {recording ? 'Recording...' : 'Tap to Start Recording'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: COLORS.primary, borderRadius: 32, padding: 18 }}
          onPress={() => setRecording(r => !r)}
        >
          <Ionicons name={recording ? 'stop' : 'mic'} size={32} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.gray, marginTop: 8 }]} onPress={onClose}>
        <Text style={modalStyles.saveButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 320,
    maxHeight: 540,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: COLORS.lightGray,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default function Appointments() {
  const [activeTab, setActiveTab] = useState('Appointments');
  const [showAddModal, setShowAddModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean, appointment: any | null }>({ open: false, appointment: null });
  const [recordModal, setRecordModal] = useState<{ open: boolean, appointment: any | null }>({ open: false, appointment: null });

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

  // Refetch appointments when profile changes
  useEffect(() => {
    if (!profile || !profile.id) return;
    setLoading(true);
    setError(null);
    const fetchAppointments = async () => {
      const { data: appts, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('profile_id', profile.id);
      if (apptError) {
        setError('Failed to fetch appointments');
        setAppointments([]);
      } else {
        setAppointments(appts || []);
      }
      setLoading(false);
    };
    fetchAppointments();
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

  const handleAddSuccess = () => {
    setShowAddModal(false);
    // No need to refetch appointments here, useEffect will handle it
  };
  const handleEditSuccess = () => {
    setEditModal({ open: false, appointment: null });
    // No need to refetch appointments here, useEffect will handle it
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <CustomHeader title="Appointments" />
      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'Appointments' ? (
        <FlatList
          data={appointments}
          keyExtractor={item => item.appointment_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <View style={styles.appointmentCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.appointmentDate}>{item.date}</Text>
              </View>
              <Text style={styles.appointmentDoctor}>{item.doctor_name}</Text>
              {item.visit_reason && <Text style={styles.appointmentSpecialty}>{item.visit_reason}</Text>}
              {item.notes && <Text style={styles.appointmentLocation}>{item.notes}</Text>}
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setEditModal({ open: true, appointment: item })}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.white} />
                  <Text style={{ color: COLORS.white, fontWeight: 'bold', marginLeft: 8 }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.secondary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setRecordModal({ open: true, appointment: item })}
                >
                  <Ionicons name="mic-outline" size={20} color={COLORS.white} />
                  <Text style={{ color: COLORS.white, fontWeight: 'bold', marginLeft: 8 }}>Record</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.error, borderRadius: 8, padding: 8, justifyContent: 'center', alignItems: 'center' }}
                  onPress={async () => {
                    await supabase.from('appointments').delete().eq('appointment_id', item.appointment_id);
                    // No need to refetch appointments here, useEffect will handle it
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.centered}><Text style={styles.grayText}>No conversations yet.</Text></View>
      )}
      {/* Add Appointment Button */}
      {activeTab === 'Appointments' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.actionButtonVertical, { backgroundColor: COLORS.primary }]} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.white} />
            <Text style={[styles.actionText, { color: COLORS.white }]}>Add Appointment</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Add Appointment Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AddAppointmentModalForm onSuccess={handleAddSuccess} onCancel={() => setShowAddModal(false)} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit Appointment Modal */}
      <Modal
        visible={editModal.open}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModal({ open: false, appointment: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {editModal.appointment && (
              <EditAppointmentModalForm
                appointment={editModal.appointment}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditModal({ open: false, appointment: null })}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setEditModal({ open: false, appointment: null })}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Record Modal */}
      <Modal
        visible={recordModal.open}
        animationType="slide"
        transparent
        onRequestClose={() => setRecordModal({ open: false, appointment: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <RecordModal onClose={() => setRecordModal({ open: false, appointment: null })} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setRecordModal({ open: false, appointment: null })}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    margin: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    color: COLORS.gray,
    fontWeight: 'bold',
    fontSize: 16,
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  appointmentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentDate: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  appointmentDoctor: {
    fontSize: 17,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  appointmentSpecialty: {
    fontSize: 15,
    color: COLORS.gray,
    marginBottom: 2,
  },
  appointmentLocation: {
    fontSize: 14,
    color: COLORS.gray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grayText: {
    color: COLORS.gray,
    fontSize: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bottomBar: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  actionButtonVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 6,
    width: 220,
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 0,
    minHeight: 320,
    maxHeight: 540,
    width: '100%',
    alignSelf: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 4,
  },
}); 